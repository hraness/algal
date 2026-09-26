//! Ordering exploration — port of `src/ordering.ts`. `algal ordering
//! <scenario>` replays a durable-process setup under every
//! dispatch-and-delivery ordering inside a bounded search space and checks an
//! invariant over each terminal state. The scenario is a versioned
//! `algal.ordering-scenario.v1` value: named mailboxes, named processes
//! (manifest + args), a bounded set of external sends, an `algal.expr.v1`
//! invariant over {"processes","mailboxes"}, and the limits that bound the
//! search. Every process dispatch is charged to a habitat account — the
//! closed `algal.habitat-budget.v1` record is part of the report, so
//! exhaustion is recorded, never silent. The result is a bounded
//! `algal.ordering-report.v1` listing each ordering tried, its terminal
//! state, and the first counterexample ordering, if any.
//!
//! Determinism: capability handles derive from the scenario by digest, not
//! from randomness, so one scenario file reproduces one report bit-for-bit.
//! The explorer simulates the supervisor's dispatch semantics (first dispatch
//! runs the manifest; later dispatches resume the checkpointed receipt) — it
//! does not exercise the on-disk supervisor.

use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    capabilities::{capability_handle, parse_capability_handle},
    contract::{Manifest, id, integer, keys, object, text},
    effects::Host,
    graph::Transports,
    habitat_budget::{self, Account},
    mailbox::{MAILBOX_RECEIVE, MAILBOX_SEND, MailboxConfig},
    runtime,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::{Arc, Mutex},
};

pub const SCENARIO_CONTRACT: &str = "algal.ordering-scenario.v1";
pub const REPORT_CONTRACT: &str = "algal.ordering-report.v1";
/// Descriptor contract for deterministically derived capability nonces.
const MAILBOX_DESCRIPTOR: &str = "algal.ordering-mailbox.v1";

pub const MAX_SCENARIO_BYTES: usize = 1_048_576;
pub const MAX_REPORT_BYTES: usize = 1_048_576;
const MAX_MAILBOXES: usize = 8;
const MAX_PROCESSES: usize = 8;
const MAX_SENDS: usize = 32;
const MAX_ORDERINGS: usize = 64;
const MAX_DEPTH: usize = 64;
const MAX_MAILBOX_MESSAGES: usize = 64;
const MAX_MESSAGE_BYTES: usize = 65_536;
const MAX_ACTION_LEN: usize = 128;
const MAX_ACTIONS: usize = 64;
const INVARIANT_FUEL: u64 = 100_000;

/// `ExprErr` on the wire is `{code, ...details}`; the reference runtime reads
/// `.message` off it, which renders the literal text `undefined` when no such
/// detail exists — reproduced here so error output stays identical.
fn expr_message(err: &algal_expr::ExprErr) -> String {
    err.details
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("undefined")
        .to_owned()
}

// ------------------------------------------------- deterministic mailbox ---

/// A mailbox service whose capability handles derive from the mailbox name,
/// not from a random nonce: one scenario produces the same args, the same
/// request digests, the same receipts, and the same report on every run.
/// Delivery order within a mailbox follows the file driver's rule — the
/// lowest sorted idempotency key — and send/receive/has_pending keep the file
/// driver's checks and effects.
#[derive(Clone, Debug, Default)]
pub struct OrderingMailboxes {
    configs: BTreeMap<String, MailboxConfig>,
    /// handle → (mailbox, revoked)
    records: BTreeMap<String, (String, bool)>,
    /// mailbox → idempotency key → (message id, value)
    pending: BTreeMap<String, BTreeMap<String, (String, Value)>>,
    /// mailbox → idempotency key → message id
    claimed: BTreeMap<String, BTreeMap<String, String>>,
    delivered: BTreeMap<String, usize>,
}

impl OrderingMailboxes {
    fn capability(capability: &str, mailbox: &str, nonce: &str) -> Result<String> {
        capability_handle(
            capability,
            &json!({
                "capability":capability,
                "contract":"algal.capability.v1",
                "mailbox":mailbox,
                "nonce":nonce,
            }),
        )
    }

    pub fn create(
        &mut self,
        name: &str,
        max_messages: usize,
        max_message_bytes: usize,
    ) -> Result<MailboxConfig> {
        id(&json!(name))?;
        if max_messages == 0
            || max_messages > MAX_MAILBOX_MESSAGES
            || max_message_bytes == 0
            || max_message_bytes > MAX_MESSAGE_BYTES
        {
            return Err(Error::invalid("mailbox bounds"));
        }
        if let Some(existing) = self.configs.get(name) {
            if existing.max_messages != max_messages
                || existing.max_message_bytes != max_message_bytes
            {
                return Err(Error::invalid(format!(
                    "mailbox \"{name}\" already has different bounds"
                )));
            }
            return Ok(existing.clone());
        }
        if self.configs.len() >= MAX_MAILBOXES {
            return Err(Error::limit("mailbox count exhausted"));
        }
        let base = digest(&json!({
            "contract":MAILBOX_DESCRIPTOR,
            "mailbox":name,
        }))?;
        let base = &base[7..];
        let send = Self::capability(MAILBOX_SEND, name, &format!("{base}-send"))?;
        let receive = Self::capability(MAILBOX_RECEIVE, name, &format!("{base}-receive"))?;
        let config = MailboxConfig {
            contract: crate::mailbox::MAILBOX_CONTRACT.to_owned(),
            name: name.to_owned(),
            max_messages,
            max_message_bytes,
            send: send.clone(),
            receive: receive.clone(),
        };
        self.records.insert(send, (name.to_owned(), false));
        self.records.insert(receive, (name.to_owned(), false));
        self.pending.insert(name.to_owned(), BTreeMap::new());
        self.claimed.insert(name.to_owned(), BTreeMap::new());
        self.delivered.insert(name.to_owned(), 0);
        self.configs.insert(name.to_owned(), config.clone());
        Ok(config)
    }

    pub fn list(&self) -> Vec<MailboxConfig> {
        self.configs.values().cloned().collect()
    }

    pub fn inspect(&self, name: &str) -> Option<MailboxConfig> {
        self.configs.get(name).cloned()
    }

    pub fn revoke(&mut self, handle: &str) -> Result<()> {
        let parsed = parse_capability_handle(handle, None)?;
        let record = self
            .records
            .get_mut(&parsed.handle)
            .ok_or_else(|| Error::new("CAPABILITY_DENIED", "capability is not admitted"))?;
        record.1 = true;
        Ok(())
    }

    fn resolve(&self, handle: &str, expected: &str) -> Result<MailboxConfig> {
        let parsed = parse_capability_handle(handle, Some(expected))?;
        let (mailbox, revoked) = self
            .records
            .get(&parsed.handle)
            .ok_or_else(|| Error::new("CAPABILITY_DENIED", "capability is not active"))?;
        if *revoked {
            return Err(Error::new("CAPABILITY_DENIED", "capability is not active"));
        }
        let config = self
            .configs
            .get(mailbox)
            .ok_or_else(|| Error::new("CAPABILITY_DENIED", "capability is not active"))?;
        let admitted = if expected == MAILBOX_SEND {
            &config.send
        } else {
            &config.receive
        };
        if admitted != handle {
            return Err(Error::new(
                "CAPABILITY_DENIED",
                "capability admission does not match its mailbox",
            ));
        }
        Ok(config.clone())
    }

    pub fn send(&mut self, handle: &str, value: Value, idempotency_key: &str) -> Result<Value> {
        check_digest(idempotency_key)?;
        let config = self.resolve(handle, MAILBOX_SEND)?;
        let bytes = canonical(&value)?.len();
        if bytes > config.max_message_bytes {
            return Err(Error::limit(format!(
                "mailbox message {bytes}B exceeds {}B",
                config.max_message_bytes
            )));
        }
        let id = digest(&json!({
            "contract":crate::mailbox::MAILBOX_MESSAGE_CONTRACT,
            "idempotencyKey":idempotency_key,
            "mailbox":config.name,
            "value":value,
        }))?;
        let claimed = self
            .claimed
            .get_mut(&config.name)
            .ok_or_else(|| Error::invalid("mailbox claimed set"))?;
        if let Some(existing) = claimed.get(idempotency_key) {
            if existing != &id {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "idempotency key already claims a different mailbox message",
                ));
            }
            return Ok(json!({"id":id}));
        }
        let queue = self
            .pending
            .get_mut(&config.name)
            .ok_or_else(|| Error::invalid("mailbox pending set"))?;
        if queue.len() >= config.max_messages {
            return Err(Error::new(
                "MAILBOX_FULL",
                format!("mailbox \"{}\" is full", config.name),
            ));
        }
        claimed.insert(idempotency_key.to_owned(), id.clone());
        queue.insert(idempotency_key.to_owned(), (id.clone(), value));
        Ok(json!({"id":id}))
    }

    pub fn receive(&mut self, handle: &str) -> Result<Value> {
        let config = self.resolve(handle, MAILBOX_RECEIVE)?;
        let queue = self
            .pending
            .get_mut(&config.name)
            .ok_or_else(|| Error::invalid("mailbox pending set"))?;
        let Some(delivery) = queue.keys().next().cloned() else {
            return Err(Error::suspended(
                format!("mailbox \"{}\" is empty", config.name),
                handle,
            ));
        };
        let (id, value) = queue
            .remove(&delivery)
            .ok_or_else(|| Error::invalid("mailbox delivery"))?;
        *self
            .delivered
            .get_mut(&config.name)
            .ok_or_else(|| Error::invalid("mailbox delivered count"))? += 1;
        Ok(json!({"id":id,"message":value}))
    }

    pub fn has_pending(&self, handle: &str) -> Result<bool> {
        let config = self.resolve(handle, MAILBOX_RECEIVE)?;
        Ok(!self
            .pending
            .get(&config.name)
            .ok_or_else(|| Error::invalid("mailbox pending set"))?
            .is_empty())
    }

    /// Counts for the report's terminal state.
    pub fn counts(&self, name: &str) -> (usize, usize) {
        (
            self.pending.get(name).map_or(0, BTreeMap::len),
            self.delivered.get(name).copied().unwrap_or(0),
        )
    }

    /// True while a send can still queue on the mailbox — a full mailbox means
    /// the delivery waits for the consumers, never throws mid-exploration.
    pub fn has_capacity(&self, name: &str) -> bool {
        self.configs.get(name).is_some_and(|config| {
            self.pending.get(name).map_or(0, BTreeMap::len) < config.max_messages
        })
    }
}

// ------------------------------------------------------------- scenario ---

/// Args carry `mailbox:<name>:<access>` markers in place of capability
/// handles; the marker resolves against the scenario's mailboxes at setup.
/// Only string values on declared `cap` input ports are markers — any other
/// string passes through unchanged.
fn resolve_args(
    args: &Value,
    manifest: &Manifest,
    handles: &BTreeMap<String, MailboxConfig>,
) -> Result<Value> {
    let mut cap_ports: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for cell in &manifest.cells {
        if cell["kind"].as_str() != Some("input") {
            continue;
        }
        let name = cell["id"].as_str().unwrap_or("").to_owned();
        let ports: BTreeSet<String> = object(&cell["outputs"])?
            .iter()
            .filter(|(_, decl)| decl["type"].as_str() == Some("cap"))
            .map(|(port, _)| port.clone())
            .collect();
        if !ports.is_empty() {
            cap_ports.insert(name, ports);
        }
    }
    let mut out = Map::new();
    for (cell, ports) in object(args)? {
        let mut resolved = Map::new();
        for (port, value) in object(ports)? {
            if cap_ports.get(cell).is_some_and(|set| set.contains(port))
                && let Some(marker) = value.as_str()
                && let Some(rest) = marker.strip_prefix("mailbox:")
                && let Some((name, access)) = rest.rsplit_once(':')
                && id(&json!(name)).is_ok()
                && (access == "send" || access == "receive")
            {
                let config = handles.get(name).ok_or_else(|| {
                    Error::invalid(format!(
                        "args {cell}.{port} reference unknown mailbox \"{name}\""
                    ))
                })?;
                resolved.insert(
                    port.clone(),
                    json!(if access == "send" {
                        &config.send
                    } else {
                        &config.receive
                    }),
                );
                continue;
            }
            resolved.insert(port.clone(), value.clone());
        }
        out.insert(cell.clone(), Value::Object(resolved));
    }
    Ok(Value::Object(out))
}

struct MailboxDecl {
    name: String,
    max_messages: usize,
    max_message_bytes: usize,
}

struct ProcessDecl {
    name: String,
    manifest: Manifest,
    args: Value,
}

struct SendDecl {
    mailbox: String,
    value: Value,
    key: String,
}

struct Limits {
    orderings: usize,
    depth: usize,
    work: u64,
    attempts: u64,
    runs: u64,
}

struct Scenario {
    mailboxes: Vec<MailboxDecl>,
    processes: Vec<ProcessDecl>,
    sends: Vec<SendDecl>,
    invariant: Value,
    limits: Limits,
    responses: Value,
}

fn parse_limits(value: &Value) -> Result<Limits> {
    let o = object(value)?;
    keys(value, &["orderings", "depth", "work", "attempts", "runs"])?;
    let habitat = habitat_budget::parse_limits(&json!({
        "work":o["work"],
        "attempts":o["attempts"],
        "runs":o["runs"],
    }))?;
    Ok(Limits {
        orderings: integer(&o["orderings"], 1, MAX_ORDERINGS)?,
        depth: integer(&o["depth"], 1, MAX_DEPTH)?,
        work: habitat.work,
        attempts: habitat.attempts,
        runs: habitat.runs,
    })
}

/// Parse and admit an `algal.ordering-scenario.v1`. Every manifest is
/// compiled once here — a scenario whose programs never run is a usage error,
/// not a report row.
fn parse_scenario(value: &Value) -> Result<Scenario> {
    if canonical(value)?.len() > MAX_SCENARIO_BYTES {
        return Err(Error::invalid("ordering scenario exceeds its byte bound"));
    }
    let o = object(value)?;
    keys(
        value,
        &[
            "contract",
            "mailboxes",
            "processes",
            "sends",
            "invariant",
            "limits",
            "responses",
        ],
    )?;
    if o["contract"] != SCENARIO_CONTRACT {
        return Err(Error::invalid(format!(
            "expected contract \"{SCENARIO_CONTRACT}\""
        )));
    }

    let mailboxes_raw = o["mailboxes"]
        .as_array()
        .ok_or_else(|| Error::invalid("mailboxes must be an array"))?;
    if mailboxes_raw.is_empty() || mailboxes_raw.len() > MAX_MAILBOXES {
        return Err(Error::invalid(format!(
            "mailboxes must contain 1..{MAX_MAILBOXES} entries"
        )));
    }
    let mut mailboxes = Vec::new();
    for (index, entry) in mailboxes_raw.iter().enumerate() {
        keys(entry, &["name", "maxMessages", "maxMessageBytes"])?;
        mailboxes.push(MailboxDecl {
            name: id(&entry["name"])
                .map_err(|_| Error::invalid(format!("mailboxes[{index}].name")))?
                .to_owned(),
            max_messages: integer(&entry["maxMessages"], 1, MAX_MAILBOX_MESSAGES)?,
            max_message_bytes: integer(&entry["maxMessageBytes"], 1, MAX_MESSAGE_BYTES)?,
        });
    }
    let names: BTreeSet<_> = mailboxes.iter().map(|m| m.name.as_str()).collect();
    if names.len() != mailboxes.len() {
        return Err(Error::invalid("mailbox names must be unique"));
    }
    let mailbox_by_name: BTreeMap<&str, &MailboxDecl> =
        mailboxes.iter().map(|m| (m.name.as_str(), m)).collect();

    let processes_raw = o["processes"]
        .as_array()
        .ok_or_else(|| Error::invalid("processes must be an array"))?;
    if processes_raw.is_empty() || processes_raw.len() > MAX_PROCESSES {
        return Err(Error::invalid(format!(
            "processes must contain 1..{MAX_PROCESSES} entries"
        )));
    }
    let mut processes = Vec::new();
    for entry in processes_raw {
        keys(entry, &["name", "manifest", "args"])?;
        let args = object(&entry["args"])?;
        for ports in args.values() {
            object(ports)?;
        }
        processes.push(ProcessDecl {
            name: id(&entry["name"])
                .map_err(|_| Error::invalid("process name"))?
                .to_owned(),
            manifest: Manifest::parse(&entry["manifest"])?,
            args: entry["args"].clone(),
        });
    }
    let names: BTreeSet<_> = processes.iter().map(|p| p.name.as_str()).collect();
    if names.len() != processes.len() {
        return Err(Error::invalid("process names must be unique"));
    }

    let sends_raw = o["sends"]
        .as_array()
        .ok_or_else(|| Error::invalid("sends must be an array"))?;
    if sends_raw.len() > MAX_SENDS {
        return Err(Error::invalid(format!(
            "sends must contain at most {MAX_SENDS} entries"
        )));
    }
    let mut send_keys = BTreeSet::new();
    let mut sends = Vec::new();
    for (index, entry) in sends_raw.iter().enumerate() {
        keys(entry, &["mailbox", "value", "key"])?;
        let mailbox = id(&entry["mailbox"])
            .map_err(|_| Error::invalid(format!("sends[{index}].mailbox")))?
            .to_owned();
        let config = mailbox_by_name.get(mailbox.as_str()).ok_or_else(|| {
            Error::invalid(format!(
                "sends[{index}] names unknown mailbox \"{mailbox}\""
            ))
        })?;
        let value = &entry["value"];
        if canonical(value)?.len() > config.max_message_bytes {
            return Err(Error::limit(format!(
                "sends[{index}] value exceeds {}B",
                config.max_message_bytes
            )));
        }
        let key = check_digest(
            entry["key"]
                .as_str()
                .ok_or_else(|| Error::invalid(format!("sends[{index}].key")))?,
        )?
        .to_owned();
        if !send_keys.insert(format!("{mailbox}:{key}")) {
            return Err(Error::invalid(format!(
                "duplicate send idempotency key for mailbox \"{mailbox}\""
            )));
        }
        sends.push(SendDecl {
            mailbox,
            value: value.clone(),
            key,
        });
    }

    let invariant = &o["invariant"];
    keys(invariant, &["contract", "program"])?;
    if invariant["contract"] != "algal.expr.v1" {
        return Err(Error::invalid("invariant.contract must be algal.expr.v1"));
    }
    let program = &invariant["program"];
    if program.is_null() {
        return Err(Error::invalid("invariant.program is required"));
    }
    let roots: BTreeSet<String> = ["processes", "mailboxes"]
        .iter()
        .map(|name| name.to_string())
        .collect();
    if let Err(err) = algal_expr::check_program(program, &roots) {
        return Err(Error::new(
            "EXPR_FAILED",
            format!("ordering invariant does not check: {}", expr_message(&err)),
        ));
    }

    let limits = parse_limits(&o["limits"])?;

    let mut responses = Map::new();
    if let Some(raw) = o.get("responses") {
        for (key, value) in object(raw)? {
            responses.insert(text(&json!(key), 256)?.to_owned(), value.clone());
        }
    }

    // Admit every manifest up front against an empty ordering environment:
    // capability handles resolve identically at run time because the service
    // derives them deterministically.
    let mut probe = OrderingMailboxes::default();
    let mut probe_configs = BTreeMap::new();
    for mailbox in &mailboxes {
        probe_configs.insert(
            mailbox.name.clone(),
            probe.create(
                &mailbox.name,
                mailbox.max_messages,
                mailbox.max_message_bytes,
            )?,
        );
    }
    let mut host = Host::default();
    host.install_ordering_mailboxes(Arc::new(Mutex::new(OrderingMailboxes::default())))?;
    let tool_signatures = host.tool_signatures();
    let mut probe_store = Store::default();
    for process in &processes {
        // Markers resolve at admission: a scenario naming an unknown mailbox
        // is a usage error, never a mid-exploration surprise.
        resolve_args(&process.args, &process.manifest, &probe_configs)?;
        crate::graph::compile(
            process.manifest.clone(),
            &mut probe_store,
            &tool_signatures,
            &Transports::new(),
            0,
        )?;
    }

    Ok(Scenario {
        mailboxes,
        processes,
        sends,
        invariant: program.clone(),
        limits,
        responses: Value::Object(responses),
    })
}

// ------------------------------------------------------------- explorer ---

struct Proc {
    name: String,
    manifest: Manifest,
    args: Value,
    status: &'static str,
    generation: u64,
    wake: Vec<String>,
    checkpoint: Option<Value>,
    /// Storage digest of the last receipt the process recorded — the identity
    /// the evidence store and the habitat account record under.
    receipt: Option<String>,
}

#[derive(Clone)]
enum Action {
    Send(usize),
    Tick(String),
}

fn action_label(action: &Action) -> String {
    match action {
        Action::Send(index) => format!("send:{index}"),
        Action::Tick(name) => format!("tick:{name}"),
    }
}

/// The enabled actions at a state, in the order the explorer enumerates
/// them: every unsent declared send by index, then every dispatchable process
/// by name — ready processes and suspended processes with a pending wake.
fn enabled_actions(
    scenario: &Scenario,
    sent: &BTreeSet<usize>,
    procs: &BTreeMap<String, Proc>,
    mailboxes: &OrderingMailboxes,
) -> Result<Vec<Action>> {
    let mut actions = Vec::new();
    for (index, send) in scenario.sends.iter().enumerate() {
        // A send waits while its mailbox is full — it stays an open branch in
        // the ordering space but cannot force a delivery that would throw.
        if !sent.contains(&index) && mailboxes.has_capacity(&send.mailbox) {
            actions.push(Action::Send(index));
        }
    }
    for proc in procs.values() {
        if proc.status == "ready" {
            actions.push(Action::Tick(proc.name.clone()));
            continue;
        }
        if proc.status != "suspended" {
            continue;
        }
        for handle in &proc.wake {
            let mailbox_wake = parse_capability_handle(handle, None)
                .map(|parsed| parsed.capability == MAILBOX_RECEIVE)
                .unwrap_or(false);
            if mailbox_wake && mailboxes.has_pending(handle)? {
                actions.push(Action::Tick(proc.name.clone()));
                break;
            }
        }
    }
    Ok(actions)
}

enum Sim {
    Invalid,
    Budget {
        labels: Vec<String>,
        procs: Vec<Proc>,
        mailboxes: Arc<Mutex<OrderingMailboxes>>,
    },
    Leaf {
        labels: Vec<String>,
        quiescent: bool,
        procs: Vec<Proc>,
        mailboxes: Arc<Mutex<OrderingMailboxes>>,
    },
    Internal {
        enabled: usize,
    },
}

fn snapshot(procs: &BTreeMap<String, Proc>) -> Vec<Proc> {
    procs
        .values()
        .map(|proc| Proc {
            name: proc.name.clone(),
            manifest: proc.manifest.clone(),
            args: proc.args.clone(),
            status: proc.status,
            generation: proc.generation,
            wake: proc.wake.clone(),
            checkpoint: proc.checkpoint.clone(),
            receipt: proc.receipt.clone(),
        })
        .collect()
}

fn leaf(
    labels: Vec<String>,
    quiescent: bool,
    procs: &BTreeMap<String, Proc>,
    mailboxes: Arc<Mutex<OrderingMailboxes>>,
) -> Sim {
    Sim::Leaf {
        labels,
        quiescent,
        procs: snapshot(procs),
        mailboxes,
    }
}

/// Run one action sequence from a fresh environment. A vector longer than
/// the reachable trace is invalid; a vector consumed while actions remain
/// enabled reports the enabled count for expansion; a vector ending on a
/// quiescent state or the depth bound is a leaf. A refused reservation ends
/// the simulation — and the exploration — at once.
async fn simulate(
    scenario: &Scenario,
    choices: &[usize],
    account: &mut Account,
    mut evidence: Option<&mut Store>,
    receipts: &mut Vec<Value>,
) -> Result<Sim> {
    let mut store = Store::default();
    let mailboxes = Arc::new(Mutex::new(OrderingMailboxes::default()));
    let mut mailbox_configs = BTreeMap::new();
    for mailbox in &scenario.mailboxes {
        mailbox_configs.insert(
            mailbox.name.clone(),
            mailboxes
                .lock()
                .map_err(|_| Error::invalid("ordering mailbox mutex poisoned"))?
                .create(
                    &mailbox.name,
                    mailbox.max_messages,
                    mailbox.max_message_bytes,
                )?,
        );
    }
    let mut host = Host::scripted(scenario.responses.clone());
    host.install_ordering_mailboxes(mailboxes.clone())?;
    let transports = Transports::new();

    let mut procs: BTreeMap<String, Proc> = BTreeMap::new();
    for declared in &scenario.processes {
        store.admit(&declared.manifest)?;
        if let Some(evidence) = evidence.as_deref_mut() {
            evidence.admit(&declared.manifest)?;
        }
        procs.insert(
            declared.name.clone(),
            Proc {
                name: declared.name.clone(),
                manifest: declared.manifest.clone(),
                args: resolve_args(&declared.args, &declared.manifest, &mailbox_configs)?,
                status: "ready",
                generation: 0,
                wake: Vec::new(),
                checkpoint: None,
                receipt: None,
            },
        );
    }

    let mut sent = BTreeSet::new();
    let mut labels = Vec::new();
    let mut enabled = {
        let locked = mailboxes
            .lock()
            .map_err(|_| Error::invalid("ordering mailbox mutex poisoned"))?;
        enabled_actions(scenario, &sent, &procs, &locked)?
    };

    for step in 0..scenario.limits.depth {
        if enabled.is_empty() {
            return Ok(leaf(labels, true, &procs, mailboxes));
        }
        if step >= choices.len() {
            return Ok(Sim::Internal {
                enabled: enabled.len(),
            });
        }
        let pick = choices[step];
        if pick >= enabled.len() {
            return Ok(Sim::Invalid);
        }
        let action = enabled[pick].clone();
        labels.push(action_label(&action));

        match action {
            Action::Send(index) => {
                let send = &scenario.sends[index];
                mailboxes
                    .lock()
                    .map_err(|_| Error::invalid("ordering mailbox mutex poisoned"))?
                    .send(
                        &mailbox_configs[&send.mailbox].send,
                        send.value.clone(),
                        &send.key,
                    )?;
                sent.insert(index);
            }
            Action::Tick(name) => {
                {
                    let proc = procs
                        .get(name.as_str())
                        .ok_or_else(|| Error::invalid("ordering process missing"))?;
                    match account.reserve(&proc.manifest) {
                        Err(error) if error.code == "BUDGET_EXHAUSTED" && account.exhausted() => {
                            return Ok(Sim::Budget {
                                labels,
                                procs: snapshot(&procs),
                                mailboxes,
                            });
                        }
                        Err(error) => return Err(error),
                        Ok(()) => {}
                    }
                }
                let (manifest, args, checkpoint) = {
                    let proc = &procs[name.as_str()];
                    (
                        proc.manifest.clone(),
                        proc.args.clone(),
                        proc.checkpoint.clone(),
                    )
                };
                host.process_scope = Some(name.clone());
                let dispatched = async {
                    let receipt = match &checkpoint {
                        None => {
                            runtime::run(manifest, args, &mut store, &mut host, &transports, None)
                                .await?
                        }
                        Some(checkpoint) => {
                            runtime::resume(
                                checkpoint,
                                manifest,
                                &mut store,
                                &mut host,
                                &transports,
                            )
                            .await?
                        }
                    };
                    let reference = store.put("runs", &receipt)?;
                    Ok::<_, Error>((receipt, reference))
                }
                .await;
                let (receipt, reference) = match dispatched {
                    Ok(stored) => stored,
                    Err(error) => {
                        // No stored receipt exists to charge; the reservation
                        // is released and the account stays usable, exactly as
                        // the reference runtime's admit does.
                        account.release()?;
                        if error.code == "BUDGET_EXHAUSTED" && account.exhausted() {
                            return Ok(Sim::Budget {
                                labels,
                                procs: snapshot(&procs),
                                mailboxes,
                            });
                        }
                        return Err(error);
                    }
                };
                if let Err(error) = account.charge(&reference, &receipt) {
                    account.release()?;
                    return Err(error);
                }
                receipts.push(receipt.clone());
                if let Some(evidence) = evidence.as_deref_mut() {
                    evidence.put("runs", &receipt)?;
                }
                let proc = procs
                    .get_mut(name.as_str())
                    .ok_or_else(|| Error::invalid("ordering process missing"))?;
                proc.generation += 1;
                proc.checkpoint = Some(receipt.clone());
                proc.receipt = Some(reference);
                proc.status = match receipt["outcome"].as_str().unwrap_or("") {
                    "complete" => "complete",
                    "failed" => "failed",
                    "stuck" => "stuck",
                    "suspended" => "suspended",
                    other => return Err(Error::invalid(format!("unknown outcome {other}"))),
                };
                let mut wake = BTreeSet::new();
                for effect in receipt["effects"].as_array().into_iter().flatten() {
                    if let Some(handles) = effect["wake"].as_array() {
                        for handle in handles {
                            if let Some(handle) = handle.as_str() {
                                wake.insert(handle.to_owned());
                            }
                        }
                    }
                }
                proc.wake = wake.into_iter().collect();
            }
        }
        enabled = {
            let locked = mailboxes
                .lock()
                .map_err(|_| Error::invalid("ordering mailbox mutex poisoned"))?;
            enabled_actions(scenario, &sent, &procs, &locked)?
        };
    }
    Ok(leaf(labels, false, &procs, mailboxes))
}

fn terminal_row(
    labels: Vec<String>,
    quiescent: bool,
    invariant: Value,
    procs: &[Proc],
    mailboxes: &OrderingMailboxes,
    names: &[String],
) -> Value {
    let mut processes: Vec<Value> = procs
        .iter()
        .map(|proc| {
            json!({
                "name":proc.name,
                "status":proc.status,
                "generation":proc.generation,
                "receipt":proc.receipt,
            })
        })
        .collect();
    processes.sort_by(|a, b| {
        a["name"]
            .as_str()
            .unwrap_or("")
            .cmp(b["name"].as_str().unwrap_or(""))
    });
    let mut rows: Vec<Value> = names
        .iter()
        .map(|name| {
            let (pending, delivered) = mailboxes.counts(name);
            json!({"name":name,"pending":pending,"delivered":delivered})
        })
        .collect();
    rows.sort_by(|a, b| {
        a["name"]
            .as_str()
            .unwrap_or("")
            .cmp(b["name"].as_str().unwrap_or(""))
    });
    json!({
        "actions":labels,
        "quiescent":quiescent,
        "invariant":invariant,
        "processes":processes,
        "mailboxes":rows,
    })
}

fn invariant_env(row: &Value) -> Map<String, Value> {
    let mut processes = Map::new();
    for proc in row["processes"].as_array().into_iter().flatten() {
        processes.insert(
            proc["name"].as_str().unwrap_or("").to_owned(),
            json!({
                "status":proc["status"],
                "generation":proc["generation"],
                "receipt":proc["receipt"],
            }),
        );
    }
    let mut mailboxes = Map::new();
    for mailbox in row["mailboxes"].as_array().into_iter().flatten() {
        mailboxes.insert(
            mailbox["name"].as_str().unwrap_or("").to_owned(),
            json!({
                "pending":mailbox["pending"],
                "delivered":mailbox["delivered"],
            }),
        );
    }
    let mut env = Map::new();
    env.insert("processes".to_owned(), Value::Object(processes));
    env.insert("mailboxes".to_owned(), Value::Object(mailboxes));
    env
}

/// Enumerate the scenario's orderings in deterministic depth-first order,
/// bounded by `limits.orderings` and `limits.depth`, charging every dispatch
/// to a single habitat account. Exploration stops on the first failing
/// ordering (`counterexample`), on an exhausted reservation or ordering bound
/// (`exhausted`), or when the bounded space is fully enumerated (`complete`).
/// Returns the `algal.ordering-report.v1` record and every dispatch receipt
/// produced, in dispatch order.
pub async fn explore(value: &Value, evidence: Option<&mut Store>) -> Result<(Value, Vec<Value>)> {
    let scenario_digest = digest(value)?;
    let scenario = parse_scenario(value)?;
    let mut account = Account::new(
        "experiment",
        habitat_budget::parse_limits(&json!({
            "work":scenario.limits.work,
            "attempts":scenario.limits.attempts,
            "runs":scenario.limits.runs,
        }))?,
    )?;
    let mut evidence = evidence;
    let mut receipts = Vec::new();
    let mut rows: Vec<Value> = Vec::new();

    let mut frontier: Vec<Vec<usize>> = vec![Vec::new()];
    let mut outcome = "complete";
    let mut exhaustion = Value::Null;
    let mut counterexample = Value::Null;
    let names: Vec<String> = scenario.mailboxes.iter().map(|m| m.name.clone()).collect();

    while !frontier.is_empty() && rows.len() < scenario.limits.orderings {
        let choices = frontier.pop().unwrap_or_default();
        let sim = simulate(
            &scenario,
            &choices,
            &mut account,
            evidence.as_deref_mut(),
            &mut receipts,
        )
        .await?;

        let (labels, quiescent, procs, mailboxes) = match sim {
            Sim::Invalid => continue,
            Sim::Budget {
                labels,
                procs,
                mailboxes,
            } => {
                // The refused dispatch is still recorded: a partial row
                // carries the actions taken and the state the search reached.
                let locked = mailboxes
                    .lock()
                    .map_err(|_| Error::invalid("ordering mailbox mutex poisoned"))?;
                rows.push(terminal_row(
                    labels,
                    false,
                    Value::Null,
                    &procs,
                    &locked,
                    &names,
                ));
                outcome = "exhausted";
                exhaustion = json!({
                    "reason":"budget",
                    "detail":"a dispatch reservation was refused mid-ordering",
                });
                break;
            }
            Sim::Internal { enabled } => {
                // The prefix consumed `choices` and still had enabled
                // actions: expand.
                for i in (0..enabled).rev() {
                    let mut next = choices.clone();
                    next.push(i);
                    frontier.push(next);
                }
                continue;
            }
            Sim::Leaf {
                labels,
                quiescent,
                procs,
                mailboxes,
            } => (labels, quiescent, procs, mailboxes),
        };

        let mut row = {
            let locked = mailboxes
                .lock()
                .map_err(|_| Error::invalid("ordering mailbox mutex poisoned"))?;
            terminal_row(labels, quiescent, Value::Null, &procs, &locked, &names)
        };

        // Leaf: evaluate the invariant over the terminal state.
        let result = algal_expr::run(&scenario.invariant, &invariant_env(&row), INVARIANT_FUEL);
        let invariant = match result {
            Ok((value, _)) => value,
            Err((err, _)) => {
                return Err(Error::new(
                    "EXPR_FAILED",
                    format!(
                        "ordering invariant must evaluate to a boolean over each terminal state: {}",
                        expr_message(&err)
                    ),
                ));
            }
        };
        if !invariant.is_boolean() {
            return Err(Error::new(
                "EXPR_FAILED",
                "ordering invariant must evaluate to a boolean over each terminal state: returned a non-boolean",
            ));
        }
        row["invariant"] = invariant.clone();
        rows.push(row);
        if invariant == false {
            counterexample = json!(rows.len() - 1);
            outcome = "counterexample";
            break;
        }
    }

    // The loop ends on a counterexample or budget stop (both recorded), on the
    // ordering bound with frontier remaining (exhausted), or on an emptied
    // frontier (complete — every sequence up to `limits.depth` was tried).
    if outcome == "complete" && !frontier.is_empty() {
        outcome = "exhausted";
        exhaustion = json!({
            "reason":"orderings",
            "detail":format!("ordering bound {} reached with unexplored orderings", scenario.limits.orderings),
        });
    }

    let report = json!({
        "contract":REPORT_CONTRACT,
        "scenario":scenario_digest,
        "limits":{
            "orderings":scenario.limits.orderings,
            "depth":scenario.limits.depth,
            "work":scenario.limits.work,
            "attempts":scenario.limits.attempts,
            "runs":scenario.limits.runs,
        },
        "orderings":rows,
        "counterexample":counterexample,
        "outcome":outcome,
        "exhaustion":exhaustion,
        "account":account.record()?,
    });
    Ok((parse_report(&report)?, receipts))
}

// ----------------------------------------------------------------- parse ---

fn action_label_ok(label: &str) -> bool {
    if let Some(rest) = label.strip_prefix("send:") {
        return !rest.is_empty() && rest.bytes().all(|b| b.is_ascii_digit());
    }
    if let Some(rest) = label.strip_prefix("tick:") {
        return id(&json!(rest)).is_ok();
    }
    false
}

fn parse_row(value: &Value, index: usize, depth_bound: usize) -> Result<Value> {
    let at = format!("orderings[{index}]");
    let o = object(value)?;
    keys(
        value,
        &[
            "actions",
            "quiescent",
            "invariant",
            "processes",
            "mailboxes",
        ],
    )?;
    let actions_raw = o["actions"]
        .as_array()
        .ok_or_else(|| Error::invalid(format!("{at}.actions")))?;
    if actions_raw.len() > depth_bound.min(MAX_ACTIONS) {
        return Err(Error::invalid(format!(
            "{at}.actions exceeds the depth bound"
        )));
    }
    let mut actions = Vec::new();
    for (i, action) in actions_raw.iter().enumerate() {
        let label = text(action, MAX_ACTION_LEN)?;
        if !action_label_ok(label) {
            return Err(Error::invalid(format!(
                "{at}.actions[{i}] is not an action label"
            )));
        }
        actions.push(label.to_owned());
    }
    if !o["quiescent"].is_boolean() {
        return Err(Error::invalid(format!("{at}.quiescent must be a boolean")));
    }
    let invariant = &o["invariant"];
    if !invariant.is_null() && !invariant.is_boolean() {
        return Err(Error::invalid(format!(
            "{at}.invariant must be a boolean or null"
        )));
    }
    let processes_raw = o["processes"]
        .as_array()
        .ok_or_else(|| Error::invalid(format!("{at}.processes")))?;
    if processes_raw.len() > MAX_PROCESSES {
        return Err(Error::invalid(format!("{at}.processes exceeds the bound")));
    }
    let mut processes = Vec::new();
    for (i, entry) in processes_raw.iter().enumerate() {
        keys(entry, &["name", "status", "generation", "receipt"])?;
        let receipt = &entry["receipt"];
        if !receipt.is_null() {
            check_digest(
                receipt
                    .as_str()
                    .ok_or_else(|| Error::invalid(format!("{at}.processes[{i}].receipt")))?,
            )?;
        }
        processes.push(json!({
            "name":id(&entry["name"]).map_err(|_| Error::invalid(format!("{at}.processes[{i}].name")))?,
            "status":text(&entry["status"], 32)?,
            "generation":integer(&entry["generation"], 0, 64)?,
            "receipt":receipt,
        }));
    }
    let mailboxes_raw = o["mailboxes"]
        .as_array()
        .ok_or_else(|| Error::invalid(format!("{at}.mailboxes")))?;
    if mailboxes_raw.len() > MAX_MAILBOXES {
        return Err(Error::invalid(format!("{at}.mailboxes exceeds the bound")));
    }
    let mut mailboxes = Vec::new();
    for (i, entry) in mailboxes_raw.iter().enumerate() {
        keys(entry, &["name", "pending", "delivered"])?;
        mailboxes.push(json!({
            "name":id(&entry["name"]).map_err(|_| Error::invalid(format!("{at}.mailboxes[{i}].name")))?,
            "pending":integer(&entry["pending"], 0, MAX_MAILBOX_MESSAGES)?,
            "delivered":integer(&entry["delivered"], 0, MAX_SENDS)?,
        }));
    }
    Ok(json!({
        "actions":actions,
        "quiescent":o["quiescent"],
        "invariant":invariant,
        "processes":processes,
        "mailboxes":mailboxes,
    }))
}

/// Parse an `algal.ordering-report.v1`: closed objects, bounds, and the
/// coherence rules a forged record cannot pass — a counterexample must name
/// a failing row that no earlier row precedes, and the outcome must match
/// its evidence fields.
pub fn parse_report(value: &Value) -> Result<Value> {
    if canonical(value)?.len() > MAX_REPORT_BYTES {
        return Err(Error::invalid("ordering report exceeds its byte bound"));
    }
    let o = object(value)?;
    keys(
        value,
        &[
            "contract",
            "scenario",
            "limits",
            "orderings",
            "counterexample",
            "outcome",
            "exhaustion",
            "account",
        ],
    )?;
    if o["contract"] != REPORT_CONTRACT {
        return Err(Error::invalid(format!(
            "expected contract \"{REPORT_CONTRACT}\""
        )));
    }
    let limits = parse_limits(&o["limits"])?;

    let rows_raw = o["orderings"]
        .as_array()
        .ok_or_else(|| Error::invalid("orderings must be an array"))?;
    if rows_raw.len() > limits.orderings {
        return Err(Error::invalid("orderings exceed the declared bound"));
    }
    let mut orderings = Vec::new();
    for (index, row) in rows_raw.iter().enumerate() {
        orderings.push(parse_row(row, index, limits.depth)?);
    }

    let counterexample = &o["counterexample"];
    let mut counterexample_index = None;
    if !counterexample.is_null() {
        let index = counterexample
            .as_u64()
            .and_then(|v| usize::try_from(v).ok())
            .filter(|v| *v < orderings.len())
            .ok_or_else(|| Error::invalid("counterexample out of bounds"))?;
        if orderings[index]["invariant"] != false {
            return Err(Error::invalid(
                "counterexample must name a failing ordering",
            ));
        }
        for (i, row) in orderings.iter().enumerate() {
            if i < index && row["invariant"] == false {
                return Err(Error::invalid(
                    "an earlier ordering already failed the invariant",
                ));
            }
        }
        counterexample_index = Some(index);
    }

    let outcome = text(&o["outcome"], 32)?;
    if !["complete", "counterexample", "exhausted"].contains(&outcome) {
        return Err(Error::invalid(format!(
            "unknown ordering outcome \"{outcome}\""
        )));
    }
    let exhaustion_raw = &o["exhaustion"];
    let mut exhaustion = Value::Null;
    if !exhaustion_raw.is_null() {
        keys(exhaustion_raw, &["reason", "detail"])?;
        let reason = text(&exhaustion_raw["reason"], 32)?;
        if reason != "orderings" && reason != "budget" {
            return Err(Error::invalid(format!(
                "unknown exhaustion reason \"{reason}\""
            )));
        }
        let mut record = json!({"reason":reason});
        if let Some(detail) = exhaustion_raw.get("detail") {
            record["detail"] = json!(text(detail, 2048)?);
        }
        exhaustion = record;
    }
    if outcome == "counterexample" && counterexample_index.is_none() {
        return Err(Error::invalid(
            "counterexample outcome requires a counterexample index",
        ));
    }
    if outcome == "complete" && (!counterexample.is_null() || !exhaustion.is_null()) {
        return Err(Error::invalid(
            "complete outcome carries no counterexample or exhaustion",
        ));
    }
    if outcome == "exhausted" && exhaustion.is_null() {
        return Err(Error::invalid(
            "exhausted outcome requires an exhaustion record",
        ));
    }

    Ok(json!({
        "contract":REPORT_CONTRACT,
        "scenario":check_digest(o["scenario"].as_str().ok_or_else(|| Error::invalid("scenario"))?)?,
        "limits":{
            "orderings":limits.orderings,
            "depth":limits.depth,
            "work":limits.work,
            "attempts":limits.attempts,
            "runs":limits.runs,
        },
        "orderings":orderings,
        "counterexample":counterexample,
        "outcome":outcome,
        "exhaustion":exhaustion,
        "account":habitat_budget::parse(&o["account"])?,
    }))
}

// ------------------------------------------------------------------ tests ---

#[cfg(test)]
mod tests {
    use super::*;

    fn key(label: &str) -> String {
        digest(&json!(label)).unwrap()
    }

    fn waiter_manifest() -> Value {
        json!({
            "contract":"algal.organism.v1",
            "key":"organism:waiter",
            "name":"Waiter",
            "cells":[
                {"id":"inbox","kind":"input",
                 "outputs":{"mailbox":{"type":"cap","capability":"mailbox-receive"}}},
                {"id":"take","kind":"tool","tool":"mailbox.receive.v1"}
            ],
            "edges":[{"from":{"cell":"inbox","port":"mailbox"},
                      "to":{"cell":"take","port":"mailbox"}}],
            "budgets":{"maxSteps":16,"maxAgentCalls":4,"maxWork":10000,
                       "maxContextBytes":8192,"maxOutputBytes":8192,"maxDepth":2}
        })
    }

    /// Two processes suspended on one mailbox: the send can drain to either
    /// waiter, so `both complete` is falsifiable in exactly one ordering.
    fn scenario() -> Value {
        json!({
            "contract":SCENARIO_CONTRACT,
            "mailboxes":[{"name":"inbox","maxMessages":4,"maxMessageBytes":1024}],
            "processes":[
                {"name":"alpha","manifest":waiter_manifest(),
                 "args":{"inbox":{"mailbox":"mailbox:inbox:receive"}}},
                {"name":"beta","manifest":waiter_manifest(),
                 "args":{"inbox":{"mailbox":"mailbox:inbox:receive"}}}
            ],
            "sends":[{"mailbox":"inbox","value":"go","key":key("send")}],
            "invariant":{"contract":"algal.expr.v1","program":[
                "and",
                ["eq",["get","processes","alpha","status"],"complete"],
                ["eq",["get","processes","beta","status"],"complete"]
            ]},
            "limits":{"orderings":16,"depth":12,"work":1000000,"attempts":64,"runs":64}
        })
    }

    #[test]
    fn capability_handles_derive_deterministically_from_the_mailbox_name() {
        let mut a = OrderingMailboxes::default();
        let mut b = OrderingMailboxes::default();
        let one = a.create("inbox", 4, 1024).unwrap();
        let two = b.create("inbox", 4, 1024).unwrap();
        assert_eq!(one.send, two.send);
        assert_eq!(one.receive, two.receive);
        assert!(one.send.starts_with("cap:mailbox-send:sha256:"));
        assert!(one.receive.starts_with("cap:mailbox-receive:sha256:"));
    }

    #[test]
    fn send_is_idempotent_and_receive_delivers_in_key_order() {
        let mut mailboxes = OrderingMailboxes::default();
        let config = mailboxes.create("inbox", 4, 1024).unwrap();
        let first = mailboxes
            .send(&config.send, json!("a"), &key("one"))
            .unwrap();
        // the same claim replays the same message id without a second copy
        let again = mailboxes
            .send(&config.send, json!("a"), &key("one"))
            .unwrap();
        assert_eq!(first, again);
        assert_eq!(mailboxes.counts("inbox"), (1, 0));
        // a key already claimed by another message is a digest conflict
        let conflict = mailboxes.send(&config.send, json!("b"), &key("one"));
        assert_eq!(conflict.unwrap_err().code, "DIGEST_MISMATCH");
        let second = mailboxes
            .send(&config.send, json!("b"), &key("two"))
            .unwrap();
        // delivery order follows the lowest sorted idempotency key, not FIFO
        let (lo, hi) = if key("one") < key("two") {
            (first["id"].clone(), second["id"].clone())
        } else {
            (second["id"].clone(), first["id"].clone())
        };
        let a = mailboxes.receive(&config.receive).unwrap();
        let b = mailboxes.receive(&config.receive).unwrap();
        assert_eq!(a["id"], lo);
        assert_eq!(b["id"], hi);
        assert_eq!(mailboxes.counts("inbox"), (0, 2));
        assert_eq!(a["message"], json!("a"));
        assert_eq!(b["message"], json!("b"));
    }

    #[test]
    fn receive_on_an_empty_mailbox_suspends_with_wake_capability() {
        let mut mailboxes = OrderingMailboxes::default();
        let config = mailboxes.create("inbox", 4, 1024).unwrap();
        let error = mailboxes.receive(&config.receive).unwrap_err();
        assert_eq!(error.code, "EFFECT_SUSPENDED");
    }

    #[test]
    fn capability_class_and_revocation_are_enforced() {
        let mut mailboxes = OrderingMailboxes::default();
        let config = mailboxes.create("inbox", 4, 1024).unwrap();
        // a receive handle cannot send; a send handle cannot receive — the
        // class check happens before admission, so the error is a type
        // mismatch on the handle, never a lookup
        assert_eq!(
            mailboxes
                .send(&config.receive, json!("a"), &key("one"))
                .unwrap_err()
                .code,
            "TYPE_MISMATCH"
        );
        assert_eq!(
            mailboxes.receive(&config.send).unwrap_err().code,
            "TYPE_MISMATCH"
        );
        mailboxes.revoke(&config.receive).unwrap();
        assert_eq!(
            mailboxes.receive(&config.receive).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
        // a handle this service never admitted is denied, not invented
        let foreign = format!("cap:mailbox-receive:sha256:{}", "0".repeat(64));
        assert_eq!(
            mailboxes.receive(&foreign).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
    }

    #[test]
    fn bounds_reject_oversized_messages_full_mailboxes_and_bad_names() {
        let mut mailboxes = OrderingMailboxes::default();
        let config = mailboxes.create("inbox", 1, 8).unwrap();
        assert_eq!(
            mailboxes
                .send(&config.send, json!("way too big"), &key("one"))
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
        mailboxes
            .send(&config.send, json!("ok"), &key("one"))
            .unwrap();
        assert!(!mailboxes.has_capacity("inbox"));
        assert_eq!(
            mailboxes
                .send(&config.send, json!("second"), &key("two"))
                .unwrap_err()
                .code,
            "MAILBOX_FULL"
        );
        assert!(mailboxes.create("Bad Name", 4, 64).is_err());
        assert!(mailboxes.create("other", 0, 64).is_err());
        // re-creating with different bounds is a conflict, not a widening
        assert!(mailboxes.create("inbox", 2, 8).is_err());
    }

    #[test]
    fn scenario_parse_rejects_malformed_and_out_of_bounds_values() {
        let good = scenario();
        for mutate in [
            |v: &mut Value| v["contract"] = json!("algal.other.v1"),
            |v: &mut Value| {
                v.as_object_mut()
                    .unwrap()
                    .insert("extra".into(), json!(true));
            },
            |v: &mut Value| v["mailboxes"] = json!([]),
            |v: &mut Value| {
                v["mailboxes"] = json!(
                    std::iter::repeat_n(
                        json!({"name":"a","maxMessages":1,"maxMessageBytes":1}),
                        MAX_MAILBOXES + 1
                    )
                    .collect::<Vec<_>>()
                );
            },
            |v: &mut Value| {
                v["mailboxes"]
                    .as_array_mut()
                    .unwrap()
                    .push(json!({"name":"inbox","maxMessages":1,"maxMessageBytes":1}));
            },
            |v: &mut Value| {
                v["sends"] = json!([{"mailbox":"nope","value":"x","key":key("k")}]);
            },
            |v: &mut Value| {
                v["processes"][0]["args"]["inbox"]["mailbox"] = json!("mailbox:nope:receive");
            },
            |v: &mut Value| {
                v["processes"]
                    .as_array_mut()
                    .unwrap()
                    .push(json!({"name":"alpha","manifest":waiter_manifest(),"args":{}}));
            },
            |v: &mut Value| {
                v["sends"] = json!([{"mailbox":"inbox","value":"x","key":"bad"}]);
            },
        ] {
            let mut bad = good.clone();
            mutate(&mut bad);
            assert!(parse_scenario(&bad).is_err(), "accepted {bad}");
        }
        assert!(parse_scenario(&good).is_ok());
    }

    #[tokio::test]
    async fn exploration_finds_the_invariant_counterexample() {
        let mut evidence = Store::default();
        let (report, receipts) = explore(&scenario(), Some(&mut evidence)).await.unwrap();
        assert_eq!(report["contract"], REPORT_CONTRACT);
        assert_eq!(report["outcome"], "counterexample");
        assert_eq!(report["counterexample"], 0);
        let row = &report["orderings"][0];
        assert_eq!(row["invariant"], false);
        assert_eq!(row["actions"], json!(["send:0", "tick:alpha", "tick:beta"]));
        // one waiter consumed the message; the other stayed suspended
        let statuses: Vec<&str> = row["processes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|p| p["status"].as_str().unwrap())
            .collect();
        assert_eq!(statuses, ["complete", "suspended"]);
        // every dispatch was charged to the shared habitat account
        assert!(report["account"]["charged"]["runs"].as_u64().unwrap() >= 2);
        // and every dispatch receipt was produced plus stored as evidence
        assert!(!receipts.is_empty());
        // the emitted report reparses through the same validator
        assert_eq!(parse_report(&report).unwrap(), report);
    }

    #[tokio::test]
    async fn exhaustion_by_orderings_and_budget_is_recorded() {
        // a two-mailbox scenario has no counterexample — every waiter gets a
        // message — so a spent ordering bound surfaces as exhaustion
        let mut orderings = scenario();
        orderings["mailboxes"] = json!([
            {"name":"inbox-a","maxMessages":4,"maxMessageBytes":1024},
            {"name":"inbox-b","maxMessages":4,"maxMessageBytes":1024}
        ]);
        orderings["processes"] = json!([
            {"name":"alpha","manifest":waiter_manifest(),
             "args":{"inbox":{"mailbox":"mailbox:inbox-a:receive"}}},
            {"name":"beta","manifest":waiter_manifest(),
             "args":{"inbox":{"mailbox":"mailbox:inbox-b:receive"}}}
        ]);
        orderings["sends"] = json!([
            {"mailbox":"inbox-a","value":"for-a","key":key("a")},
            {"mailbox":"inbox-b","value":"for-b","key":key("b")}
        ]);
        orderings["limits"]["orderings"] = json!(1);
        orderings["limits"]["work"] = json!(1_000_000_000u64);
        orderings["limits"]["attempts"] = json!(4096);
        orderings["limits"]["runs"] = json!(4096);
        let mut evidence = Store::default();
        let (report, _) = explore(&orderings, Some(&mut evidence)).await.unwrap();
        assert_eq!(report["outcome"], "exhausted");
        assert_eq!(report["exhaustion"]["reason"], "orderings");

        let mut budget = scenario();
        budget["limits"]["runs"] = json!(1);
        let mut evidence = Store::default();
        let (report, _) = explore(&budget, Some(&mut evidence)).await.unwrap();
        assert_eq!(report["outcome"], "exhausted");
        assert_eq!(report["exhaustion"]["reason"], "budget");
        // the refused dispatch still landed as a partial row
        assert!(!report["orderings"].as_array().unwrap().is_empty());
        assert!(!report["account"]["refused"].is_null());
    }

    #[tokio::test]
    async fn exploration_is_deterministic_across_runs() {
        let (a, receipts_a) = explore(&scenario(), None).await.unwrap();
        let (b, receipts_b) = explore(&scenario(), None).await.unwrap();
        assert_eq!(canonical(&a).unwrap(), canonical(&b).unwrap());
        assert_eq!(receipts_a, receipts_b);
    }

    #[test]
    fn report_parse_rejects_incoherent_records() {
        let row = json!({
            "actions":["send:0"],
            "quiescent":true,
            "invariant":true,
            "processes":[{"name":"alpha","status":"complete","generation":1,"receipt":null}],
            "mailboxes":[{"name":"inbox","pending":0,"delivered":1}]
        });
        let good = json!({
            "contract":REPORT_CONTRACT,
            "scenario":format!("sha256:{}", "1".repeat(64)),
            "limits":{"orderings":16,"depth":12,"work":1000,"attempts":64,"runs":64},
            "orderings":[row],
            "counterexample":Value::Null,
            "outcome":"complete",
            "exhaustion":Value::Null,
            "account":{"contract":"algal.habitat-budget.v1","activity":"experiment",
                       "limits":{"work":1000,"attempts":64,"runs":64},
                       "charged":{"work":0,"attempts":0,"runs":0},
                       "runs":[],"outcome":"complete","refused":Value::Null}
        });
        assert_eq!(parse_report(&good).unwrap(), good);
        for mutate in [
            |v: &mut Value| v["contract"] = json!("algal.other.v1"),
            |v: &mut Value| v["outcome"] = json!("banana"),
            |v: &mut Value| {
                v["outcome"] = json!("counterexample");
            },
            |v: &mut Value| {
                v["counterexample"] = json!(0);
                v["orderings"][0]["invariant"] = json!(true);
            },
            |v: &mut Value| {
                v["counterexample"] = json!(0);
                v["orderings"][0]["invariant"] = json!(false);
                v["outcome"] = json!("complete");
            },
            |v: &mut Value| {
                v["exhaustion"] = json!({"reason":"banana"});
            },
        ] {
            let mut bad = good.clone();
            mutate(&mut bad);
            assert!(parse_report(&bad).is_err(), "accepted {bad}");
        }
    }
}
