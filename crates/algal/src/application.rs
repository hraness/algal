//! Native application lifecycle — parity port of `src/application.ts`,
//! `src/application-contract.ts`, `src/application-investigation.ts`,
//! `src/application-observation.ts`, and the `algal.application-migration.v1`
//! record. Expected-head commits, idempotent operations, durable intents,
//! and the outbox share the host-state custody primitives and the
//! content-addressed store with the TypeScript runtime.
//!
//! Host trust boundaries (`admit_commit`, `admit_dispatch`, dispatch,
//! reconcile, memory scope/decode/frontier) are injected traits; the CLI
//! wires the declarative `PolicyHost`. Program execution (episodes through
//! the VM, foundry evaluation, migration programs) remains host-driven.

use crate::{
    Error, Result,
    application_memory::{
        self as mem, app_id, app_json, app_object, app_object_opt, app_ref, app_refs, app_tag,
        get_record, opt_ref, put_record,
    },
    canonical::digest,
    contract::{integer, list, text},
    lease,
    store::Store,
};
use serde_json::{Value, json};
use std::collections::BTreeSet;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::pin::Pin;

pub const APPLICATIONS: usize = 32;
pub const PENDING: usize = 128;
pub const DISPATCHES: usize = 4096;
pub const DISPATCH_BATCH: usize = 32;
const STATES: usize = 4096;
const INTENTS: usize = 32;
const ENTRYPOINTS: usize = 32;
const EVIDENCE: usize = 16;

fn fail(message: &str) -> Error {
    Error::new("RECEIPT_MISMATCH", message)
}
fn hash(value: &Value) -> Result<String> {
    digest(&app_json(value)?)
}
fn same(a: &Value, b: &Value) -> Result<bool> {
    Ok(hash(a)? == hash(b)?)
}
fn operation_name(name: &str) -> bool {
    name.len() == 69
        && name.ends_with(".json")
        && name[..64]
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

#[derive(Clone, Debug)]
pub struct Entrypoint {
    pub name: String,
    pub manifest: String,
    pub applicability: String,
    pub max_generations: usize,
    pub capabilities: Vec<String>,
    pub queries: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct Revision {
    pub application: String,
    pub parent: Option<String>,
    pub schema: String,
    pub queries: String,
    pub views: String,
    pub runtime_profile: String,
    pub evaluation_policy: String,
    pub capability_requirements: Vec<String>,
    pub goals: Option<Vec<String>>,
    pub entrypoints: Vec<Entrypoint>,
    pub value: Value,
}

pub fn parse_revision(input: &Value) -> Result<Revision> {
    let v = app_object_opt(
        input,
        &[
            "contract",
            "application",
            "parent",
            "schema",
            "queries",
            "views",
            "runtimeProfile",
            "evaluationPolicy",
            "capabilityRequirements",
            "entrypoints",
        ],
        &["goals"],
    )?;
    app_tag(&v["contract"], "algal.application-revision.v1")?;
    let mut capabilities = Vec::new();
    for row in list(&v["capabilityRequirements"], 32)? {
        capabilities.push(app_id(row)?.to_owned());
    }
    if capabilities.windows(2).any(|w| w[0] >= w[1])
        || capabilities.iter().collect::<BTreeSet<_>>().len() != capabilities.len()
    {
        return Err(Error::invalid("Capabilities must be sorted and unique"));
    }
    let mut entrypoints = Vec::new();
    for row in list(&v["entrypoints"], ENTRYPOINTS)? {
        let e = app_object(
            row,
            &[
                "name",
                "manifest",
                "applicability",
                "maxGenerations",
                "capabilities",
                "queries",
            ],
        )?;
        let mut caps = Vec::new();
        for cap in list(&e["capabilities"], 8)? {
            caps.push(app_id(cap)?.to_owned());
        }
        if caps.windows(2).any(|w| w[0] >= w[1])
            || caps.iter().collect::<BTreeSet<_>>().len() != caps.len()
        {
            return Err(Error::invalid(
                "Entrypoint capabilities must be sorted and unique",
            ));
        }
        entrypoints.push(Entrypoint {
            name: app_id(&e["name"])?.to_owned(),
            manifest: app_ref(&e["manifest"])?.to_owned(),
            applicability: app_ref(&e["applicability"])?.to_owned(),
            max_generations: integer(&e["maxGenerations"], 1, 64)?,
            capabilities: caps,
            queries: app_refs(&e["queries"], 32)?,
        });
    }
    if entrypoints.is_empty()
        || entrypoints.windows(2).any(|w| w[0].name >= w[1].name)
        || entrypoints
            .iter()
            .map(|e| &e.name)
            .collect::<BTreeSet<_>>()
            .len()
            != entrypoints.len()
    {
        return Err(Error::invalid(
            "Entrypoints must be nonempty, sorted, unique",
        ));
    }
    Ok(Revision {
        application: app_id(&v["application"])?.to_owned(),
        parent: opt_ref(&v["parent"])?,
        schema: app_ref(&v["schema"])?.to_owned(),
        queries: app_ref(&v["queries"])?.to_owned(),
        views: app_ref(&v["views"])?.to_owned(),
        runtime_profile: app_ref(&v["runtimeProfile"])?.to_owned(),
        evaluation_policy: app_ref(&v["evaluationPolicy"])?.to_owned(),
        capability_requirements: capabilities,
        goals: v.get("goals").map(|value| app_refs(value, 8)).transpose()?,
        entrypoints,
        value: input.clone(),
    })
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransitionKind {
    Create,
    Memory,
    Investigate,
    Activate,
    Migrate,
}

impl TransitionKind {
    fn parse(value: &Value) -> Result<Self> {
        match value.as_str() {
            Some("create") => Ok(Self::Create),
            Some("memory") => Ok(Self::Memory),
            Some("investigate") => Ok(Self::Investigate),
            Some("activate") => Ok(Self::Activate),
            Some("migrate") => Ok(Self::Migrate),
            _ => Err(Error::invalid("Invalid application transition kind")),
        }
    }
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Create => "create",
            Self::Memory => "memory",
            Self::Investigate => "investigate",
            Self::Activate => "activate",
            Self::Migrate => "migrate",
        }
    }
}

#[derive(Clone, Debug)]
pub struct Transition {
    pub application: String,
    pub operation: String,
    pub request: String,
    pub kind: TransitionKind,
    pub previous: Option<String>,
    pub revision: String,
    pub memory: String,
    pub intents: Vec<String>,
    pub evidence: Vec<String>,
    pub caused_by: Option<String>,
    pub value: Value,
}

pub fn parse_transition(input: &Value) -> Result<Transition> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "operation",
            "request",
            "kind",
            "previous",
            "revision",
            "memory",
            "intents",
            "evidence",
            "causedBy",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-transition.v1")?;
    Ok(Transition {
        application: app_id(&v["application"])?.to_owned(),
        operation: app_ref(&v["operation"])?.to_owned(),
        request: app_ref(&v["request"])?.to_owned(),
        kind: TransitionKind::parse(&v["kind"])?,
        previous: opt_ref(&v["previous"])?,
        revision: app_ref(&v["revision"])?.to_owned(),
        memory: app_ref(&v["memory"])?.to_owned(),
        intents: app_refs(&v["intents"], INTENTS)?,
        evidence: app_refs(&v["evidence"], EVIDENCE)?,
        caused_by: opt_ref(&v["causedBy"])?,
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct State {
    pub application: String,
    pub sequence: usize,
    pub epoch: usize,
    pub revision: String,
    pub memory: String,
    pub previous: Option<String>,
    pub transition: String,
    pub value: Value,
}

pub fn parse_state(input: &Value) -> Result<State> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "sequence",
            "epoch",
            "revision",
            "memory",
            "previous",
            "transition",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-state.v1")?;
    let sequence = integer(&v["sequence"], 0, 4095)?;
    let epoch = integer(&v["epoch"], 0, sequence)?;
    let previous = opt_ref(&v["previous"])?;
    if (sequence == 0) != previous.is_none() {
        return Err(Error::invalid("Invalid application predecessor"));
    }
    Ok(State {
        application: app_id(&v["application"])?.to_owned(),
        sequence,
        epoch,
        revision: app_ref(&v["revision"])?.to_owned(),
        memory: app_ref(&v["memory"])?.to_owned(),
        previous,
        transition: app_ref(&v["transition"])?.to_owned(),
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct Head {
    pub application: String,
    pub state: String,
}

pub fn parse_head(input: &Value) -> Result<Head> {
    let v = app_object(input, &["contract", "application", "state"])?;
    app_tag(&v["contract"], "algal.application-head.v1")?;
    Ok(Head {
        application: app_id(&v["application"])?.to_owned(),
        state: app_ref(&v["state"])?.to_owned(),
    })
}

#[derive(Clone, Debug)]
pub enum WorkIntent {
    StartEpisode { entrypoint: String, input: String },
    Deliver { route: String, message: String },
}

/// `algal.application-intent.v1` — the durable work item.
#[derive(Clone, Debug)]
pub struct Intent {
    pub application: String,
    pub operation: String,
    pub ordinal: usize,
    pub work: WorkIntent,
    pub value: Value,
}

pub fn parse_intent(input: &Value) -> Result<Intent> {
    let raw = app_json(input)?;
    if !raw.is_object() {
        return Err(Error::invalid("Expected application intent"));
    }
    let kind = raw["kind"].as_str();
    let mut fields = vec!["contract", "application", "operation", "ordinal", "kind"];
    match kind {
        Some("start-episode") => fields.extend(["entrypoint", "input"]),
        Some("deliver") => fields.extend(["route", "message"]),
        _ => return Err(Error::invalid("Invalid work intent")),
    }
    let v = app_object(&raw, &fields)?;
    app_tag(&v["contract"], "algal.application-intent.v1")?;
    let work = match kind {
        Some("start-episode") => WorkIntent::StartEpisode {
            entrypoint: app_id(&v["entrypoint"])?.to_owned(),
            input: app_ref(&v["input"])?.to_owned(),
        },
        _ => WorkIntent::Deliver {
            route: app_id(&v["route"])?.to_owned(),
            message: app_ref(&v["message"])?.to_owned(),
        },
    };
    Ok(Intent {
        application: app_id(&v["application"])?.to_owned(),
        operation: app_ref(&v["operation"])?.to_owned(),
        ordinal: integer(&v["ordinal"], 0, 31)?,
        work,
        value: raw,
    })
}

#[derive(Clone, Debug)]
pub struct EpisodeBinding {
    pub application: String,
    pub intent: String,
    pub source_state: String,
    pub revision: String,
    pub memory: String,
    pub epoch: usize,
    pub entrypoint: String,
    pub manifest: String,
    pub arguments: String,
    pub process: String,
    pub max_generations: usize,
    pub host_profile: String,
    pub access: String,
    pub value: Value,
}

pub fn parse_episode_binding(input: &Value) -> Result<EpisodeBinding> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "intent",
            "sourceState",
            "revision",
            "memory",
            "epoch",
            "entrypoint",
            "manifest",
            "arguments",
            "process",
            "maxGenerations",
            "hostProfile",
            "access",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-episode.v1")?;
    let access = text(&v["access"], 24)?;
    if access != "observe" && access != "external-write" {
        return Err(Error::invalid("Invalid episode access"));
    }
    Ok(EpisodeBinding {
        application: app_id(&v["application"])?.to_owned(),
        intent: app_ref(&v["intent"])?.to_owned(),
        source_state: app_ref(&v["sourceState"])?.to_owned(),
        revision: app_ref(&v["revision"])?.to_owned(),
        memory: app_ref(&v["memory"])?.to_owned(),
        epoch: integer(&v["epoch"], 0, 4095)?,
        entrypoint: app_id(&v["entrypoint"])?.to_owned(),
        manifest: app_ref(&v["manifest"])?.to_owned(),
        arguments: app_ref(&v["arguments"])?.to_owned(),
        process: app_id(&v["process"])?.to_owned(),
        max_generations: integer(&v["maxGenerations"], 1, 64)?,
        host_profile: app_ref(&v["hostProfile"])?.to_owned(),
        access: access.to_owned(),
        value: input.clone(),
    })
}

/// `algal.application-migration.v1` — the durable record a `migrate`
/// transition must cite and the migrated memory must consume.
#[derive(Clone, Debug)]
pub struct Migration {
    pub application: String,
    pub from: String,
    pub previous_revision: String,
    pub candidate_revision: String,
    pub program: String,
    pub receipt: String,
    pub claims: Vec<mem::Claim>,
}

pub fn parse_migration(input: &Value) -> Result<Migration> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "from",
            "previousRevision",
            "candidateRevision",
            "program",
            "receipt",
            "claims",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-migration.v1")?;
    let mut claims = Vec::new();
    for row in list(&v["claims"], 64)? {
        claims.push(mem::parse_claim(row)?);
    }
    Ok(Migration {
        application: app_id(&v["application"])?.to_owned(),
        from: app_ref(&v["from"])?.to_owned(),
        previous_revision: app_ref(&v["previousRevision"])?.to_owned(),
        candidate_revision: app_ref(&v["candidateRevision"])?.to_owned(),
        program: app_ref(&v["program"])?.to_owned(),
        receipt: app_ref(&v["receipt"])?.to_owned(),
        claims,
    })
}

/// `algal.application-investigation-request.v1` — the scheduling record.
#[derive(Clone, Debug)]
pub struct InvestigationRequest {
    pub application: String,
    pub state: String,
    pub memory: String,
    pub entrypoint: String,
    pub query: String,
    pub procedures: Vec<String>,
    pub derivation: String,
    pub value: Value,
}

pub fn parse_investigation_request(input: &Value) -> Result<InvestigationRequest> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "state",
            "memory",
            "entrypoint",
            "query",
            "procedures",
            "derivation",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-investigation-request.v1")?;
    Ok(InvestigationRequest {
        application: app_id(&v["application"])?.to_owned(),
        state: app_ref(&v["state"])?.to_owned(),
        memory: app_ref(&v["memory"])?.to_owned(),
        entrypoint: app_id(&v["entrypoint"])?.to_owned(),
        query: app_ref(&v["query"])?.to_owned(),
        procedures: app_refs(&v["procedures"], 16)?,
        derivation: app_ref(&v["derivation"])?.to_owned(),
        value: input.clone(),
    })
}

/// The normalized commit request — `request` digest binds operation→command.
#[derive(Clone, Debug)]
pub struct Command {
    pub application: String,
    pub operation: String,
    pub kind: TransitionKind,
    pub expected_head: Option<String>,
    pub revision: String,
    pub memory: String,
    pub intents: Vec<IntentSpec>,
    pub evidence: Vec<String>,
    pub caused_by: Option<String>,
}

#[derive(Clone, Debug)]
pub enum IntentSpec {
    StartEpisode { entrypoint: String, input: String },
    Deliver { route: String, message: String },
}

fn intent_spec(raw: &Value) -> Result<IntentSpec> {
    let value = app_json(raw)?;
    if !value.is_object() {
        return Err(Error::invalid("Invalid intent specification"));
    }
    if value["kind"] == json!("start-episode") {
        let v = app_object(&value, &["kind", "entrypoint", "input"])?;
        Ok(IntentSpec::StartEpisode {
            entrypoint: app_id(&v["entrypoint"])?.to_owned(),
            input: app_ref(&v["input"])?.to_owned(),
        })
    } else {
        let v = app_object(&value, &["kind", "route", "message"])?;
        app_tag(&v["kind"], "deliver")?;
        Ok(IntentSpec::Deliver {
            route: app_id(&v["route"])?.to_owned(),
            message: app_ref(&v["message"])?.to_owned(),
        })
    }
}

impl Command {
    /// The normalized request record — identical fields to the parsed
    /// TypeScript `ApplicationCommand`.
    pub fn value(&self) -> Value {
        json!({
            "application": self.application, "operation": self.operation,
            "kind": self.kind.as_str(), "expectedHead": self.expected_head,
            "revision": self.revision, "memory": self.memory,
            "intents": self.intents.iter().map(|spec| match spec {
                IntentSpec::StartEpisode { entrypoint, input } =>
                    json!({"kind":"start-episode","entrypoint":entrypoint,"input":input}),
                IntentSpec::Deliver { route, message } =>
                    json!({"kind":"deliver","route":route,"message":message}),
            }).collect::<Vec<_>>(),
            "evidence": self.evidence, "causedBy": self.caused_by,
        })
    }
    pub fn request(&self) -> Result<String> {
        hash(&self.value())
    }
}

pub fn parse_command(raw: &Value) -> Result<Command> {
    let v = app_object(
        raw,
        &[
            "application",
            "operation",
            "kind",
            "expectedHead",
            "revision",
            "memory",
            "intents",
            "evidence",
            "causedBy",
        ],
    )?;
    let kind = TransitionKind::parse(&v["kind"])?;
    let mut intents = Vec::new();
    for item in list(&v["intents"], INTENTS)? {
        intents.push(intent_spec(item)?);
    }
    Ok(Command {
        application: app_id(&v["application"])?.to_owned(),
        operation: app_ref(&v["operation"])?.to_owned(),
        kind,
        expected_head: opt_ref(&v["expectedHead"])?,
        revision: app_ref(&v["revision"])?.to_owned(),
        memory: app_ref(&v["memory"])?.to_owned(),
        intents,
        evidence: app_refs(&v["evidence"], EVIDENCE)?,
        caused_by: opt_ref(&v["causedBy"])?,
    })
}

#[derive(Clone, Debug)]
pub struct Operation {
    pub application: String,
    pub operation: String,
    pub request: String,
    pub transition: String,
    pub state: String,
    pub value: Value,
}

fn parse_operation(raw: &Value) -> Result<Operation> {
    let v = app_object(
        raw,
        &[
            "contract",
            "application",
            "operation",
            "request",
            "transition",
            "state",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-operation.v1")?;
    Ok(Operation {
        application: app_id(&v["application"])?.to_owned(),
        operation: app_ref(&v["operation"])?.to_owned(),
        request: app_ref(&v["request"])?.to_owned(),
        transition: app_ref(&v["transition"])?.to_owned(),
        state: app_ref(&v["state"])?.to_owned(),
        value: raw.clone(),
    })
}

#[derive(Clone, Debug)]
pub enum DispatchPlan {
    Episode {
        binding: Box<EpisodeBinding>,
    },
    Delivery {
        recipient: String,
        host_profile: String,
    },
}

impl DispatchPlan {
    pub fn value(&self) -> Value {
        match self {
            Self::Episode { binding } => json!({"kind":"episode","binding":binding.value}),
            Self::Delivery {
                recipient,
                host_profile,
            } => json!({"kind":"delivery","recipient":recipient,"hostProfile":host_profile}),
        }
    }
}

fn parse_plan(raw: &Value) -> Result<DispatchPlan> {
    let v = app_json(raw)?;
    if !v.is_object() {
        return Err(Error::invalid("Invalid application dispatch plan"));
    }
    if v["kind"] == json!("episode") {
        let p = app_object(&v, &["kind", "binding"])?;
        Ok(DispatchPlan::Episode {
            binding: Box::new(parse_episode_binding(&p["binding"])?),
        })
    } else {
        let p = app_object(&v, &["kind", "recipient", "hostProfile"])?;
        app_tag(&p["kind"], "delivery")?;
        let handle = crate::capabilities::parse_capability_handle(
            text(&p["recipient"], 256)?,
            Some("mailbox-send"),
        )?;
        Ok(DispatchPlan::Delivery {
            recipient: handle.handle,
            host_profile: app_ref(&p["hostProfile"])?.to_owned(),
        })
    }
}

fn dispatch_identity(application: &str, intent: &str, plan: &DispatchPlan) -> Result<String> {
    hash(&json!({
        "contract": "algal.application-dispatch-identity.v1",
        "application": application, "intent": intent, "plan": plan.value(),
    }))
}

/// Deterministic process custody name for an intent's episode.
pub fn process_name(application: &str, intent: &str) -> Result<String> {
    let d = hash(&json!({
        "contract": "algal.application-process-name.v1",
        "application": app_id(&json!(application))?, "intent": app_ref(&json!(intent))?,
    }))?;
    Ok(format!("a-{}", &d[7..69]))
}

#[derive(Clone, Debug)]
pub enum DispatchResult {
    Episode {
        binding: String,
        process: String,
        outcome: Option<String>,
    },
    Delivery {
        message: String,
        idempotency_key: String,
    },
}

impl DispatchResult {
    fn value(&self) -> Value {
        match self {
            Self::Episode {
                binding,
                process,
                outcome,
            } => {
                let mut value = json!({"kind":"episode","binding":binding,"process":process});
                if let Some(outcome) = outcome {
                    value["outcome"] = json!(outcome);
                }
                value
            }
            Self::Delivery {
                message,
                idempotency_key,
            } => json!({"kind":"delivery","message":message,"idempotencyKey":idempotency_key}),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Dispatch {
    pub application: String,
    pub intent: String,
    pub source_state: String,
    pub configuration_digest: String,
    pub identity: String,
    pub plan: DispatchPlan,
    pub status: String,
    pub result: Option<String>,
    pub reason: Option<String>,
    pub value: Value,
}

fn reason(value: &Value) -> Result<String> {
    let s = value
        .as_str()
        .ok_or_else(|| Error::invalid("Invalid application dispatch reason"))?;
    if s.len() > 1024 {
        return Err(Error::invalid("text exceeds bound"));
    }
    if s.is_empty() {
        return Err(Error::invalid("Invalid application dispatch reason"));
    }
    Ok(s.to_owned())
}

fn parse_dispatch_result(raw: &Value, record: &Dispatch, work: &Intent) -> Result<DispatchResult> {
    if let DispatchPlan::Episode { binding } = &record.plan {
        if !matches!(work.work, WorkIntent::StartEpisode { .. }) {
            return Err(fail("Episode settlement does not bind a start intent"));
        }
        let value = app_object_opt(raw, &["kind", "binding", "process"], &["outcome"])?;
        app_tag(&value["kind"], "episode")?;
        let binding_ref = app_ref(&value["binding"])?.to_owned();
        let process = app_id(&value["process"])?.to_owned();
        if binding_ref != hash(&binding.value)? || process != binding.process {
            return Err(fail("Episode settlement changed its binding"));
        }
        return Ok(DispatchResult::Episode {
            binding: binding_ref,
            process,
            outcome: value
                .get("outcome")
                .map(|reference| app_ref(reference).map(str::to_owned))
                .transpose()?,
        });
    }
    let value = app_object(raw, &["kind", "message", "idempotencyKey"])?;
    app_tag(&value["kind"], "delivery")?;
    let message = app_ref(&value["message"])?.to_owned();
    let idempotency_key = app_ref(&value["idempotencyKey"])?.to_owned();
    match &work.work {
        WorkIntent::Deliver { message: m, .. }
            if idempotency_key == record.identity && &message == m => {}
        _ => {
            return Err(fail("Delivery settlement changed its identity or message"));
        }
    }
    Ok(DispatchResult::Delivery {
        message,
        idempotency_key,
    })
}

fn parse_dispatch(raw: &Value) -> Result<Dispatch> {
    let v = app_object(
        raw,
        &[
            "contract",
            "application",
            "intent",
            "sourceState",
            "configurationDigest",
            "identity",
            "plan",
            "status",
            "result",
            "reason",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-dispatch.v1")?;
    let status = text(&v["status"], 16)?;
    if !["started", "settled", "blocked", "uncertain"].contains(&status) {
        return Err(Error::invalid("Invalid application dispatch status"));
    }
    let result = opt_ref(&v["result"])?;
    let why = if v["reason"].is_null() {
        None
    } else {
        Some(reason(&v["reason"])?)
    };
    if (status == "settled") != result.is_some()
        || ((status == "blocked" || status == "uncertain") != why.is_some())
    {
        return Err(Error::invalid("Invalid application dispatch result"));
    }
    let application = app_id(&v["application"])?.to_owned();
    let intent = app_ref(&v["intent"])?.to_owned();
    let plan = parse_plan(&v["plan"])?;
    let identity = app_ref(&v["identity"])?.to_owned();
    if identity != dispatch_identity(&application, &intent, &plan)? {
        return Err(fail("Dispatch identity changed"));
    }
    Ok(Dispatch {
        application,
        intent,
        source_state: app_ref(&v["sourceState"])?.to_owned(),
        configuration_digest: app_ref(&v["configurationDigest"])?.to_owned(),
        identity,
        plan,
        status: status.to_owned(),
        result,
        reason: why,
        value: raw.clone(),
    })
}

enum Outcome {
    Settled { result: DispatchResult },
    Blocked { reason: String },
    Uncertain { reason: String },
}

fn parse_outcome(raw: &Value, record: &Dispatch, work: &Intent) -> Result<Outcome> {
    let v = app_json(raw)?;
    if !v.is_object() {
        return Err(Error::invalid("Invalid dispatch outcome"));
    }
    if v["status"] == json!("settled") {
        let p = app_object(&v, &["status", "result"])?;
        return Ok(Outcome::Settled {
            result: parse_dispatch_result(&p["result"], record, work)?,
        });
    }
    let p = app_object(&v, &["status", "reason"])?;
    let status = text(&p["status"], 16)?;
    if status != "blocked" && status != "uncertain" {
        return Err(Error::invalid("Invalid dispatch outcome status"));
    }
    Ok(if status == "blocked" {
        Outcome::Blocked {
            reason: reason(&p["reason"])?,
        }
    } else {
        Outcome::Uncertain {
            reason: reason(&p["reason"])?,
        }
    })
}

/// One history row: the state record, its transition, and its revision.
#[derive(Clone, Debug)]
pub struct Snapshot {
    pub digest: String,
    pub state: State,
    pub transition: Transition,
    pub revision: Revision,
}

#[derive(Clone, Debug)]
pub struct Pending {
    pub intent: String,
    pub source_state: String,
    pub work: Intent,
    pub dispatch: Option<Dispatch>,
}

#[derive(Clone, Debug)]
pub enum DispatchAttempt {
    Admitted(Box<Dispatch>),
    Denied {
        application: String,
        intent: String,
        source_state: String,
        current_state: String,
        reason: String,
    },
}
impl DispatchAttempt {
    pub fn value(&self) -> Value {
        match self {
            Self::Admitted(dispatch) => dispatch.value.clone(),
            Self::Denied {
                application,
                intent,
                source_state,
                current_state,
                reason,
            } => json!({
                "contract":"algal.application-admission-denied.v1", "application": application,
                "intent": intent, "sourceState": source_state, "currentState": current_state,
                "status":"denied", "reason": reason,
            }),
        }
    }
}

/// Trusted admission boundary — identical authority to TypeScript's
/// `ApplicationAdmission`. `admit_commit` runs under application custody
/// before publication; `admit_dispatch` mints the dispatch plan (return
/// `Err(CAPABILITY_DENIED, "Trusted dispatch admission is required")` when
/// the host confers no dispatch authority).
pub trait Admission {
    fn admit_commit(&self, context: &CommitContext) -> Result<()>;
    /// Replay admission evidence while the application lease remains held.
    fn verify_commit<'a>(
        &'a self,
        context: &'a CommitContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<()>> + 'a>> {
        Box::pin(async move { self.admit_commit(context) })
    }
    fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value>;
}

pub struct CommitContext<'a> {
    pub command: &'a Command,
    pub current: Option<&'a Snapshot>,
    pub revision: &'a Revision,
    pub previous_revision: Option<&'a Revision>,
    pub pending: &'a [Pending],
    pub store: &'a Store,
}

pub struct DispatchAdmission<'a> {
    pub current: &'a Snapshot,
    pub snapshot: &'a Snapshot,
    pub intent: &'a Intent,
    pub previous_dispatch: Option<&'a Dispatch>,
    pub store: &'a Store,
}

/// Host dispatch authority: executes or settles one admitted work item. The
/// outcome JSON is validated against the dispatch record before it is
/// trusted — arbitrary success output never settles. Dispatch is async —
/// domain dispatchers run real episodes through the VM — mirroring the
/// Promise-returning TypeScript `ApplicationDispatcher`.
pub trait Dispatcher {
    fn configuration_digest(&self) -> &str;
    fn dispatch<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>>;
    /// Whether `reconcile` is implemented — mirrors TypeScript's optional
    /// method: `reconcile_dispatch` refuses early when it is absent.
    fn can_reconcile(&self) -> bool {
        false
    }
    /// `None` means settlement could not be established — the dispatch is
    /// recorded `uncertain`, matching a TypeScript `reconcile` that returns
    /// `undefined` or throws.
    fn reconcile<'a>(
        &'a self,
        _context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
        Box::pin(async { None })
    }
}

pub struct DispatchContext<'a> {
    pub current: &'a Snapshot,
    pub snapshot: &'a Snapshot,
    pub intent: &'a Intent,
    pub dispatch: &'a Dispatch,
}

pub struct Service<'a> {
    pub dir: PathBuf,
    pub store: Store,
    admission: &'a dyn Admission,
    fault_hook: Option<&'a (dyn Fn(&'static str) -> Result<()> + Send + Sync)>,
}

impl<'a> Service<'a> {
    pub fn new(dir: &Path, admission: &'a dyn Admission) -> Result<Self> {
        Ok(Self {
            dir: dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf()),
            store: Store::open(dir, true)?,
            admission,
            fault_hook: None,
        })
    }

    /// Diagnostic hook matching the TypeScript application's four durable
    /// publication boundaries. No hook is installed by the CLI or default host.
    pub fn with_fault_hook(
        mut self,
        hook: &'a (dyn Fn(&'static str) -> Result<()> + Send + Sync),
    ) -> Self {
        self.fault_hook = Some(hook);
        self
    }

    fn fault(&self, point: &'static str) -> Result<()> {
        self.fault_hook.map_or(Ok(()), |hook| hook(point))
    }

    fn path(&self, application: &str) -> PathBuf {
        self.dir.join("applications").join(application)
    }

    fn custody(&self, application: &str, creating: bool) -> Result<lease::OwnerLease> {
        let root = self.dir.join("applications");
        lease::directory(&root)?;
        // First publication owns supervisor custody without reserving a name
        // before admission. Existing applications keep their independent mutex.
        let creation = lease::OwnerLease::acquire(&root.join(".creation"), "application-creation")?;
        let mut count = 0usize;
        let mut exists = false;
        let mut scanned = 0usize;
        for entry in std::fs::read_dir(&root)? {
            scanned += 1;
            if scanned > APPLICATIONS + 2 {
                return Err(Error::limit("Application directory bound exceeded"));
            }
            let entry = entry?;
            let name = entry
                .file_name()
                .into_string()
                .map_err(|_| Error::invalid("Invalid application directory"))?;
            if name == ".creation" {
                continue;
            }
            let ty = entry.file_type()?;
            if !ty.is_dir() || ty.is_symlink() {
                return Err(Error::new("IO_FAILED", "Invalid application directory"));
            }
            app_id(&json!(name))?;
            count += 1;
            exists |= name == application;
        }
        if !exists && creating && count >= APPLICATIONS {
            return Err(Error::limit("Application count exhausted"));
        }
        if !exists {
            return Ok(creation);
        }
        drop(creation);
        lease::OwnerLease::acquire(
            &self.path(application),
            &format!("application-{application}"),
        )
    }

    fn snapshot(&self, reference: &str) -> Result<Snapshot> {
        let state = parse_state(&get_record(&self.store, reference)?)?;
        let transition = parse_transition(&get_record(&self.store, &state.transition)?)?;
        let revision = parse_revision(&get_record(&self.store, &state.revision)?)?;
        if state.application != transition.application
            || state.application != revision.application
            || state.revision != transition.revision
            || state.memory != transition.memory
            || state.previous != transition.previous
        {
            return Err(fail("Application state/transition binding mismatch"));
        }
        get_record(&self.store, &state.memory)?;
        Ok(Snapshot {
            digest: reference.to_owned(),
            state,
            transition,
            revision,
        })
    }

    fn check_step(prior: Option<&Snapshot>, next: &Snapshot) -> Result<()> {
        let (state, transition, revision) = (&next.state, &next.transition, &next.revision);
        match prior {
            None => {
                if transition.kind != TransitionKind::Create
                    || state.sequence != 0
                    || state.epoch != 0
                    || revision.parent.is_some()
                {
                    return Err(fail("Invalid application origin"));
                }
            }
            Some(prior) => {
                if state.application != prior.state.application
                    || state.previous.as_deref() != Some(prior.digest.as_str())
                    || state.sequence != prior.state.sequence + 1
                    || transition.kind == TransitionKind::Create
                {
                    return Err(fail("Invalid application state succession"));
                }
                let activating = matches!(
                    transition.kind,
                    TransitionKind::Activate | TransitionKind::Migrate
                );
                if state.epoch != prior.state.epoch + usize::from(activating) {
                    return Err(fail("Invalid activation epoch"));
                }
                if activating {
                    if state.revision == prior.state.revision
                        || revision.parent.as_deref() != Some(prior.state.revision.as_str())
                        || revision.runtime_profile != prior.revision.runtime_profile
                        || revision
                            .capability_requirements
                            .iter()
                            .any(|c| !prior.revision.capability_requirements.contains(c))
                        || prior
                            .revision
                            .entrypoints
                            .iter()
                            .any(|e| !revision.entrypoints.iter().any(|n| n.name == e.name))
                    {
                        return Err(fail("Incompatible application activation"));
                    }
                    // An activate keeps the memory schema; a schema change
                    // requires the migrate kind carrying migration evidence.
                    if transition.kind == TransitionKind::Activate
                        && revision.schema != prior.revision.schema
                    {
                        return Err(fail("Incompatible application activation"));
                    }
                } else if state.revision != prior.state.revision {
                    return Err(fail("Memory/investigation cannot change the revision"));
                }
                if transition.kind == TransitionKind::Investigate
                    && (state.memory != prior.state.memory || transition.intents.is_empty())
                {
                    return Err(fail("Invalid investigation transition"));
                }
            }
        }
        Ok(())
    }

    /// A migrate transition must carry migration evidence that binds the
    /// prior memory to the new one and is actually consumed by it.
    fn check_migration(&self, prior: &Snapshot, next: &Snapshot) -> Result<()> {
        let mut migrations = Vec::new();
        for reference in &next.transition.evidence {
            let record = get_record(&self.store, reference)?;
            if record["contract"] == json!("algal.application-migration.v1") {
                migrations.push((reference.clone(), parse_migration(&record)?));
            }
        }
        if migrations.is_empty() {
            return Err(fail("Migration transition lacks migration evidence"));
        }
        let memory = mem::parse_snapshot(&get_record(&self.store, &next.state.memory)?)?;
        if memory.schema != next.revision.schema {
            return Err(fail("Migrated memory schema does not match the revision"));
        }
        for (reference, migration) in &migrations {
            if migration.application != next.state.application
                || migration.from != prior.state.memory
                || migration.previous_revision != prior.state.revision
                || migration.candidate_revision != next.state.revision
            {
                return Err(fail("Migration evidence does not bind this transition"));
            }
            let mut consumed = false;
            for observation_ref in &memory.observations {
                let observation =
                    mem::parse_observation(&get_record(&self.store, observation_ref)?)?;
                if observation.input.raw == *reference {
                    consumed = true;
                }
            }
            if !consumed {
                return Err(fail(
                    "Migration evidence is not consumed by the migrated memory",
                ));
            }
        }
        Ok(())
    }

    /// Inspection never reserves a name or bypasses the creation count limit.
    pub fn history(&self, application: &str) -> Result<Vec<Snapshot>> {
        let name = app_id(&json!(application))?.to_owned();
        for path in [
            self.dir.clone(),
            self.dir.join("applications"),
            self.path(&name),
        ] {
            match std::fs::symlink_metadata(&path) {
                Ok(m) if m.is_dir() && !m.file_type().is_symlink() => (),
                Ok(_) => return Err(Error::new("IO_FAILED", "Invalid application directory")),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
                Err(e) => return Err(e.into()),
            }
        }
        let raw = match lease::read(&self.path(&name).join("head.json"), 512)? {
            Some(raw) => raw,
            None => return Ok(Vec::new()),
        };
        let head = parse_head(&raw)?;
        if head.application != name {
            return Err(fail("Application head identity mismatch"));
        }
        let mut history = Vec::new();
        let mut seen = BTreeSet::new();
        let mut reference = Some(head.state);
        while let Some(r) = reference {
            if history.len() >= STATES || !seen.insert(r.clone()) {
                return Err(fail("Application history bound/cycle"));
            }
            let item = self.snapshot(&r)?;
            if item.state.application != name {
                return Err(fail("Application history identity mismatch"));
            }
            reference = item.state.previous.clone();
            history.push(item);
        }
        history.reverse();
        let mut operations = BTreeSet::new();
        for i in 0..history.len() {
            let item = &history[i];
            Self::check_step(if i == 0 { None } else { Some(&history[i - 1]) }, item)?;
            if item.transition.kind == TransitionKind::Migrate {
                self.check_migration(&history[i - 1], item)?;
            }
            if !operations.insert(item.transition.operation.clone()) {
                return Err(fail("Repeated operation in application history"));
            }
            self.intents(item)?;
        }
        Ok(history)
    }

    pub fn inspect(&self, application: &str) -> Result<Option<Snapshot>> {
        Ok(self.history(application)?.into_iter().last())
    }

    fn intents(&self, snapshot: &Snapshot) -> Result<Vec<(String, Intent)>> {
        let mut rows = Vec::new();
        for reference in &snapshot.transition.intents {
            let work = parse_intent(&get_record(&self.store, reference)?)?;
            if work.application != snapshot.state.application
                || work.operation != snapshot.transition.operation
            {
                return Err(fail("Intent transition mismatch"));
            }
            rows.push((reference.clone(), work));
        }
        rows.sort_by_key(|(_, w)| w.ordinal);
        if rows.iter().enumerate().any(|(i, (_, w))| w.ordinal != i) {
            return Err(fail("Intent ordinal sequence mismatch"));
        }
        let command = Command {
            application: snapshot.state.application.clone(),
            operation: snapshot.transition.operation.clone(),
            kind: snapshot.transition.kind,
            expected_head: snapshot.state.previous.clone(),
            revision: snapshot.state.revision.clone(),
            memory: snapshot.state.memory.clone(),
            intents: rows
                .iter()
                .map(|(_, w)| match &w.work {
                    WorkIntent::StartEpisode { entrypoint, input } => IntentSpec::StartEpisode {
                        entrypoint: entrypoint.clone(),
                        input: input.clone(),
                    },
                    WorkIntent::Deliver { route, message } => IntentSpec::Deliver {
                        route: route.clone(),
                        message: message.clone(),
                    },
                })
                .collect(),
            evidence: snapshot.transition.evidence.clone(),
            caused_by: snapshot.transition.caused_by.clone(),
        };
        if command.request()? != snapshot.transition.request {
            return Err(fail("Transition normalized request mismatch"));
        }
        Ok(rows)
    }

    pub(crate) fn dispatch_record(
        &self,
        application: &str,
        intent: &str,
        work: &Intent,
    ) -> Result<Option<Dispatch>> {
        let raw = match lease::read(
            &self
                .path(application)
                .join("outbox")
                .join(format!("{}.json", &intent[7..])),
            mem::RECORD_BYTES,
        )? {
            Some(raw) => raw,
            None => return Ok(None),
        };
        let record = parse_dispatch(&raw)?;
        if record.application != application || record.intent != intent {
            return Err(fail("Outbox identity mismatch"));
        }
        if let Some(result) = &record.result {
            parse_dispatch_result(&get_record(&self.store, result)?, &record, work)?;
        }
        Ok(Some(record))
    }

    pub fn pending(&self, history: &[Snapshot]) -> Result<Vec<Pending>> {
        let mut pending = Vec::new();
        let mut total = 0usize;
        for snapshot in history {
            for (reference, work) in self.intents(snapshot)? {
                total += 1;
                if total > DISPATCHES {
                    return Err(Error::limit("Retained application intent bound exceeded"));
                }
                let dispatch =
                    self.dispatch_record(&snapshot.state.application, &reference, &work)?;
                if let Some(d) = &dispatch
                    && d.source_state != snapshot.digest
                {
                    return Err(fail("Dispatch state binding mismatch"));
                }
                if dispatch.as_ref().map(|d| d.status.as_str()) != Some("settled") {
                    pending.push(Pending {
                        intent: reference,
                        source_state: snapshot.digest.clone(),
                        work,
                        dispatch,
                    });
                }
            }
        }
        if pending.len() > PENDING {
            return Err(Error::limit("Pending application intent bound exceeded"));
        }
        Ok(pending)
    }

    pub async fn create(&mut self, command: &Value) -> Result<Snapshot> {
        let parsed = parse_command(command)?;
        if parsed.kind != TransitionKind::Create || parsed.expected_head.is_some() {
            return Err(Error::invalid("create requires a genesis command"));
        }
        self.commit_value(&parsed).await
    }

    pub async fn commit(&mut self, input: &Value) -> Result<Snapshot> {
        self.commit_value(&parse_command(input)?).await
    }

    async fn commit_value(&mut self, command: &Command) -> Result<Snapshot> {
        let _lease = self.custody(&command.application, true)?;
        let path = self.path(&command.application);
        let history = self.history(&command.application)?;
        let current = history.last();
        let request = command.request()?;
        let operation_path = path
            .join("operations")
            .join(format!("{}.json", &command.operation[7..]));
        let mut prepared: Option<Operation> = None;
        if let Some(raw) = lease::read(&operation_path, 2048)? {
            let op = parse_operation(&raw)?;
            if op.application != command.application
                || op.operation != command.operation
                || op.request != request
            {
                return Err(fail("Operation already claims another request"));
            }
            if let Some(committed) = history.iter().find(|s| s.digest == op.state) {
                if committed.state.transition != op.transition
                    || committed.transition.request != request
                {
                    return Err(fail("Operation commit binding mismatch"));
                }
                return Ok(committed.clone());
            }
            prepared = Some(op);
        }
        if current.map(|c| c.digest.as_str()) != command.expected_head.as_deref() {
            return Err(Error::new("RECEIPT_MISMATCH", "Stale application head"));
        }
        if history.len() >= STATES {
            return Err(Error::limit("Application state bound exhausted"));
        }
        let revision = parse_revision(&get_record(&self.store, &command.revision)?)?;
        if revision.application != command.application {
            return Err(fail("Revision belongs to another application"));
        }
        crate::application_goal::validate_goals(&self.store, &revision)?;
        let mut needed = vec![
            command.memory.clone(),
            revision.schema.clone(),
            revision.queries.clone(),
            revision.views.clone(),
            revision.runtime_profile.clone(),
            revision.evaluation_policy.clone(),
        ];
        needed.extend(command.evidence.iter().cloned());
        if let Some(c) = &command.caused_by {
            needed.push(c.clone());
        }
        needed.extend(revision.entrypoints.iter().map(|e| e.applicability.clone()));
        for reference in needed {
            get_record(&self.store, &reference)?;
        }
        // An inhabitant's declared capabilities must be a subset of what the
        // revision admits, and its applicability query must be inside its own
        // declared memory view. The view's membership in the queries bundle is
        // a memory-layer property, enforced by `validate_for_revision`.
        for entry in &revision.entrypoints {
            if entry
                .capabilities
                .iter()
                .any(|c| !revision.capability_requirements.contains(c))
            {
                return Err(fail(
                    "Entrypoint capability exceeds the revision's requirements",
                ));
            }
            if !entry.queries.contains(&entry.applicability) {
                return Err(fail(
                    "Entrypoint applicability is outside its declared memory view",
                ));
            }
        }
        for entry in &revision.entrypoints {
            self.store.manifest(&entry.manifest)?;
        }
        let pending = self.pending(&history)?;
        if pending.len() + command.intents.len() > PENDING {
            return Err(Error::limit("Pending intent capacity exceeded"));
        }
        let total: usize = history.iter().map(|s| s.transition.intents.len()).sum();
        if total + command.intents.len() > DISPATCHES {
            return Err(Error::limit("Retained intent capacity exceeded"));
        }
        if matches!(
            command.kind,
            TransitionKind::Activate | TransitionKind::Migrate
        ) && pending.iter().any(|p| p.dispatch.is_some())
        {
            return Err(Error::invalid("Unsettled dispatch blocks activation"));
        }
        let mut intents = Vec::new();
        for (ordinal, spec) in command.intents.iter().enumerate() {
            let record = match spec {
                IntentSpec::StartEpisode { entrypoint, input } => json!({
                    "contract": "algal.application-intent.v1", "application": command.application,
                    "operation": command.operation, "ordinal": ordinal, "kind": "start-episode",
                    "entrypoint": entrypoint, "input": input,
                }),
                IntentSpec::Deliver { route, message } => json!({
                    "contract": "algal.application-intent.v1", "application": command.application,
                    "operation": command.operation, "ordinal": ordinal, "kind": "deliver",
                    "route": route, "message": message,
                }),
            };
            intents.push(parse_intent(&record)?);
        }
        for work in &intents {
            get_record(
                &self.store,
                match &work.work {
                    WorkIntent::StartEpisode { input, .. } => input,
                    WorkIntent::Deliver { message, .. } => message,
                },
            )?;
            if let WorkIntent::StartEpisode { entrypoint, .. } = &work.work
                && !revision.entrypoints.iter().any(|e| &e.name == entrypoint)
            {
                return Err(fail("Unknown intent entrypoint"));
            }
        }
        let mut intent_refs: Vec<String> = intents
            .iter()
            .map(|i| hash(&i.value))
            .collect::<Result<_>>()?;
        intent_refs.sort();
        let transition = parse_transition(&json!({
            "contract": "algal.application-transition.v1", "application": command.application,
            "operation": command.operation, "request": request, "kind": command.kind.as_str(),
            "previous": command.expected_head, "revision": command.revision,
            "memory": command.memory, "intents": intent_refs,
            "evidence": command.evidence, "causedBy": command.caused_by,
        }))?;
        let state = parse_state(&json!({
            "contract": "algal.application-state.v1", "application": command.application,
            "sequence": history.len(),
            "epoch": current.map(|c| c.state.epoch).unwrap_or(0)
                + usize::from(matches!(
                    command.kind,
                    TransitionKind::Activate | TransitionKind::Migrate
                )),
            "revision": command.revision, "memory": command.memory,
            "previous": command.expected_head, "transition": hash(&transition.value)?,
        }))?;
        let next = Snapshot {
            digest: hash(&state.value)?,
            state,
            transition,
            revision,
        };
        Self::check_step(current, &next)?;
        if next.transition.kind == TransitionKind::Migrate {
            self.check_migration(
                current.ok_or_else(|| fail("Migration requires a prior state"))?,
                &next,
            )?;
        }
        let operation = parse_operation(&json!({
            "contract": "algal.application-operation.v1", "application": command.application,
            "operation": command.operation, "request": request,
            "transition": next.state.transition, "state": next.digest,
        }))?;
        if let Some(prepared) = &prepared
            && !same(&prepared.value, &operation.value)?
        {
            return Err(fail("Prepared operation changed"));
        }
        self.admission
            .verify_commit(&CommitContext {
                command,
                current,
                revision: &next.revision,
                previous_revision: current.map(|c| &c.revision),
                pending: &pending,
                store: &self.store,
            })
            .await?;
        let operations_path = path.join("operations");
        let operations = match std::fs::symlink_metadata(&operations_path) {
            Ok(_) => lease::names(&operations_path, STATES)?
                .into_iter()
                .filter(|n| operation_name(n))
                .count(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => 0,
            Err(error) => return Err(error.into()),
        };
        if prepared.is_none() && operations >= STATES {
            return Err(Error::limit("Application operation bound exhausted"));
        }
        let head = json!({"contract": "algal.application-head.v1", "application": command.application, "state": next.digest});
        let _quota = crate::application_quota::reserve(
            &self.dir,
            &command.application,
            &[&operation.value, &head],
        )?;
        for intent in &intents {
            put_record(&mut self.store, &intent.value)?;
        }
        put_record(&mut self.store, &next.transition.value)?;
        put_record(&mut self.store, &next.state.value)?;
        lease::write(&operation_path, &operation.value, false)?;
        self.fault("prepared")?;
        if lease::write(&path.join("head.json"), &head, true)
            .and_then(|()| self.fault("head-published"))
            .is_err()
        {
            return Err(Error::new(
                "IO_FAILED",
                format!(
                    "Application commit acknowledgment uncertain; inspect the exact operation ({})",
                    command.operation
                ),
            )
            .uncertain());
        }
        Ok(next)
    }

    pub(crate) fn validate_plan(
        &self,
        snapshot: &Snapshot,
        work: &Intent,
        intent_ref: &str,
        plan: &DispatchPlan,
    ) -> Result<()> {
        if let WorkIntent::Deliver { .. } = &work.work {
            if !matches!(plan, DispatchPlan::Delivery { .. }) {
                return Err(fail("Delivery requires a delivery plan"));
            }
            return Ok(());
        }
        let binding = match plan {
            DispatchPlan::Episode { binding } => binding,
            _ => return Err(Error::invalid("Episode requires an episode binding")),
        };
        let (entrypoint, input) = match &work.work {
            WorkIntent::StartEpisode { entrypoint, input } => (entrypoint, input),
            _ => unreachable!(),
        };
        let entry = snapshot
            .revision
            .entrypoints
            .iter()
            .find(|e| &e.name == entrypoint);
        let entry = match entry {
            Some(e) => e,
            None => return Err(fail("Episode binding does not preserve its captured state")),
        };
        if binding.application != snapshot.state.application
            || binding.intent != intent_ref
            || binding.source_state != snapshot.digest
            || binding.revision != snapshot.state.revision
            || binding.memory != snapshot.state.memory
            || binding.epoch != snapshot.state.epoch
            || binding.entrypoint != entry.name
            || binding.manifest != entry.manifest
            || &binding.arguments != input
            || binding.max_generations != entry.max_generations
            || binding.process != process_name(&binding.application, intent_ref)?
        {
            return Err(fail("Episode binding does not preserve its captured state"));
        }
        get_record(&self.store, &binding.arguments)?;
        Ok(())
    }

    fn admit_plan(
        &self,
        current: &Snapshot,
        snapshot: &Snapshot,
        work: &Intent,
        intent_ref: &str,
        previous_dispatch: Option<&Dispatch>,
    ) -> Result<DispatchPlan> {
        let plan = parse_plan(&self.admission.admit_dispatch(&DispatchAdmission {
            current,
            snapshot,
            intent: work,
            previous_dispatch,
            store: &self.store,
        })?)?;
        self.validate_plan(snapshot, work, intent_ref, &plan)?;
        if let Some(previous) = previous_dispatch
            && !same(&plan.value(), &previous.plan.value())?
        {
            return Err(fail(
                "Reconciliation cannot change the admitted dispatch plan",
            ));
        }
        if let DispatchPlan::Episode { binding } = &plan
            && previous_dispatch.is_none()
            && binding.access == "external-write"
            && snapshot.digest != current.digest
        {
            return Err(Error::invalid(
                "Stale episode cannot acquire an external writer",
            ));
        }
        Ok(plan)
    }

    async fn execute(
        &mut self,
        current: &Snapshot,
        snapshot: &Snapshot,
        work: &Intent,
        record: &Dispatch,
        dispatcher: &dyn Dispatcher,
        reconciliation: bool,
    ) -> Result<Dispatch> {
        if record.configuration_digest != dispatcher.configuration_digest() {
            return Err(fail("Dispatcher configuration changed"));
        }
        let path = self
            .path(&record.application)
            .join("outbox")
            .join(format!("{}.json", &record.intent[7..]));
        if !reconciliation {
            let _quota = crate::application_quota::reserve(
                &self.dir,
                &record.application,
                &[&record.value],
            )?;
            lease::write(&path, &record.value, false)?;
            self.fault("dispatch-started")?;
        }
        let context = DispatchContext {
            current,
            snapshot,
            intent: work,
            dispatch: record,
        };
        let raw = if reconciliation {
            match dispatcher.reconcile(&context).await {
                Some(raw) => raw,
                None => Err(Error::invalid(
                    "Dispatcher did not establish settlement; explicit reconciliation required",
                )),
            }
        } else {
            dispatcher.dispatch(&context).await
        };
        let outcome = match raw.and_then(|v| parse_outcome(&v, record, work)) {
            Ok(outcome) => outcome,
            Err(_) => Outcome::Uncertain {
                reason: "Dispatcher did not establish settlement; explicit reconciliation required"
                    .to_owned(),
            },
        };
        let (status, result_ref, why) = match &outcome {
            Outcome::Settled { result } => (
                "settled",
                Some(put_record(&mut self.store, &result.value())?),
                None,
            ),
            Outcome::Blocked { reason } => ("blocked", None, Some(reason.clone())),
            Outcome::Uncertain { reason } => ("uncertain", None, Some(reason.clone())),
        };
        let updated = parse_dispatch(&json!({
            "contract": "algal.application-dispatch.v1", "application": record.application,
            "intent": record.intent, "sourceState": record.source_state,
            "configurationDigest": record.configuration_digest, "identity": record.identity,
            "plan": record.plan.value(), "status": status,
            "result": result_ref, "reason": why,
        }))?;
        {
            let _quota = crate::application_quota::reserve(
                &self.dir,
                &record.application,
                &[&updated.value],
            )?;
            lease::write(&path, &updated.value, true)?;
        }
        self.fault("dispatch-settled")?;
        Ok(updated)
    }

    pub async fn dispatch_pending(
        &mut self,
        application: &str,
        dispatcher: &dyn Dispatcher,
        max: usize,
    ) -> Result<Vec<DispatchAttempt>> {
        let name = app_id(&json!(application))?.to_owned();
        if !(1..=DISPATCH_BATCH).contains(&max) {
            return Err(Error::invalid("Invalid application integer"));
        }
        let configuration_digest = app_ref(&json!(dispatcher.configuration_digest()))?.to_owned();
        let _lease = self.custody(&name, false)?;
        let history = self.history(&name)?;
        let pending = self.pending(&history)?;
        let mut results = Vec::new();
        let mut dispatched = 0;
        for row in &pending {
            if let Some(dispatch) = &row.dispatch {
                // Never automatically repeat an uncertain or blocked admission.
                results.push(DispatchAttempt::Admitted(Box::new(dispatch.clone())));
                continue;
            }
            if dispatched >= max {
                continue;
            }
            let snapshot = history
                .iter()
                .find(|s| s.digest == row.source_state)
                .ok_or_else(|| fail("Dispatch state binding mismatch"))?;
            let current = history
                .last()
                .expect("history is nonempty when pending exists");
            let plan = match self.admit_plan(current, snapshot, &row.work, &row.intent, None) {
                Ok(plan) => plan,
                Err(error) => {
                    results.push(DispatchAttempt::Denied {
                        application: name.clone(),
                        intent: row.intent.clone(),
                        source_state: snapshot.digest.clone(),
                        current_state: current.digest.clone(),
                        reason: error.message.chars().take(256).collect(),
                    });
                    continue;
                }
            };
            if let DispatchPlan::Episode { binding } = &plan {
                put_record(&mut self.store, &binding.value)?;
            }
            let record = parse_dispatch(&json!({
                "contract": "algal.application-dispatch.v1", "application": name,
                "intent": row.intent, "sourceState": snapshot.digest,
                "configurationDigest": configuration_digest,
                "identity": dispatch_identity(&name, &row.intent, &plan)?,
                "plan": plan.value(), "status": "started", "result": null, "reason": null,
            }))?;
            results.push(DispatchAttempt::Admitted(Box::new(
                self.execute(current, snapshot, &row.work, &record, dispatcher, false)
                    .await?,
            )));
            dispatched += 1;
        }
        Ok(results)
    }

    pub async fn reconcile_dispatch(
        &mut self,
        application: &str,
        intent: &str,
        dispatcher: &dyn Dispatcher,
    ) -> Result<Dispatch> {
        let name = app_id(&json!(application))?.to_owned();
        let intent_ref = app_ref(&json!(intent))?.to_owned();
        let config = app_ref(&json!(dispatcher.configuration_digest()))?.to_owned();
        if !dispatcher.can_reconcile() {
            return Err(Error::invalid(
                "Explicit dispatcher reconciliation is required",
            ));
        }
        let _lease = self.custody(&name, false)?;
        let history = self.history(&name)?;
        let pending = self.pending(&history)?;
        let row = match pending.iter().find(|p| p.intent == intent_ref) {
            Some(row) => row,
            None => {
                let source = history
                    .iter()
                    .find(|s| s.transition.intents.contains(&intent_ref));
                let work = match source {
                    Some(source) => self
                        .intents(source)?
                        .into_iter()
                        .find(|(r, _)| *r == intent_ref)
                        .map(|(_, w)| w),
                    None => None,
                };
                let work = match (source, work) {
                    (Some(_), Some(work)) => work,
                    _ => return Err(Error::invalid("No reachable application intent")),
                };
                if let Some(settled) = self.dispatch_record(&name, &intent_ref, &work)?
                    && settled.status == "settled"
                    && history.iter().any(|s| {
                        s.digest == settled.source_state
                            && s.transition.intents.contains(&intent_ref)
                    })
                {
                    return Ok(settled);
                }
                return Err(Error::invalid("No reachable unsettled dispatch"));
            }
        };
        let prior = match &row.dispatch {
            Some(dispatch) => dispatch.clone(),
            None => return Err(Error::invalid("Dispatch has not been admitted")),
        };
        let snapshot = history
            .iter()
            .find(|s| s.digest == row.source_state)
            .ok_or_else(|| fail("Dispatch state binding mismatch"))?;
        let current = history.last().expect("nonempty history");
        if prior.configuration_digest != config {
            return Err(fail("Dispatcher configuration changed"));
        }
        self.admit_plan(current, snapshot, &row.work, &intent_ref, Some(&prior))?;
        self.execute(current, snapshot, &row.work, &prior, dispatcher, true)
            .await
    }
}

// ---------------------------------------------------------------------------
// Checked scheduling operations (src/application-investigation.ts parity)

pub struct ScheduledInvestigations {
    pub snapshot: Option<Snapshot>,
    pub derivations: Vec<Value>,
    pub requests: Vec<String>,
}

/// Run each selected entrypoint's applicability derivation on the expected
/// state; unsupported derivations become durable investigation requests
/// delivered through a commit. No request means no commit — a memory
/// transition must never carry empty intents.
pub async fn schedule_investigations(
    lifecycle: &mut Service<'_>,
    memory: &mem::MemoryService<'_>,
    input: &Value,
) -> Result<ScheduledInvestigations> {
    let v = app_object_opt(
        input,
        &[
            "application",
            "operation",
            "expectedHead",
            "expectedMemory",
            "route",
        ],
        &["entrypoints", "causedBy"],
    )?;
    let application = app_id(&v["application"])?.to_owned();
    let operation = app_ref(&v["operation"])?.to_owned();
    let expected_head = app_ref(&v["expectedHead"])?.to_owned();
    let expected_memory = app_ref(&v["expectedMemory"])?.to_owned();
    let route = app_id(&v["route"])?.to_owned();
    let selected_names: Option<Vec<String>> = match v.get("entrypoints") {
        Some(e) if !e.is_null() => Some(
            list(e, 32)?
                .iter()
                .map(|e| app_id(e).map(str::to_owned))
                .collect::<Result<_>>()?,
        ),
        _ => None,
    };
    let caused_by = opt_ref(v.get("causedBy").unwrap_or(&Value::Null))?;

    let expected = parse_state(&get_record(&lifecycle.store, &expected_head)?)?;
    if expected.application != application || expected.memory != expected_memory {
        return Err(Error::invalid(
            "Investigation expectation does not match the named application state",
        ));
    }
    let revision = parse_revision(&get_record(&lifecycle.store, &expected.revision)?)?;
    let selected: Vec<&Entrypoint> = match &selected_names {
        None => revision.entrypoints.iter().collect(),
        Some(names) => revision
            .entrypoints
            .iter()
            .filter(|e| names.contains(&e.name))
            .collect(),
    };
    if let Some(names) = &selected_names
        && selected.len() != names.iter().collect::<BTreeSet<_>>().len()
    {
        return Err(Error::invalid("Investigation names an unknown entrypoint"));
    }

    let mut derivations = Vec::new();
    let mut requests = Vec::new();
    for entrypoint in selected {
        let (reference, derivation) = memory.query(
            &mut lifecycle.store,
            &expected_head,
            &entrypoint.applicability,
        )?;
        derivations.push(json!({
            "entrypoint": entrypoint.name, "query": entrypoint.applicability,
            "derivation": reference, "status": derivation.status,
        }));
        if derivation.status == "supported" {
            continue;
        }
        let query = mem::parse_query(&get_record(&lifecycle.store, &entrypoint.applicability)?)?;
        let request = put_record(
            &mut lifecycle.store,
            &json!({
                "contract": "algal.application-investigation-request.v1", "application": application,
                "state": expected_head, "memory": expected_memory, "entrypoint": entrypoint.name,
                "query": entrypoint.applicability, "procedures": query.procedures,
                "derivation": derivations.last().unwrap()["derivation"],
            }),
        )?;
        requests.push(request);
    }
    if requests.is_empty() {
        return Ok(ScheduledInvestigations {
            snapshot: None,
            derivations,
            requests,
        });
    }
    let evidence: Vec<String> = derivations
        .iter()
        .map(|d| d["derivation"].as_str().unwrap_or_default().to_owned())
        .take(16)
        .collect();
    let snapshot = lifecycle.commit(&json!({
        "application": application, "operation": operation, "kind": "investigate",
        "expectedHead": expected_head, "revision": expected.revision,
        "memory": expected_memory,
        "intents": requests.iter().map(|message| json!({"kind":"deliver","route":route,"message":message})).collect::<Vec<_>>(),
        "evidence": evidence, "causedBy": caused_by,
    })).await?;
    Ok(ScheduledInvestigations {
        snapshot: Some(snapshot),
        derivations,
        requests,
    })
}

/// An execution request commits a `start-episode` intent only when the named
/// entrypoint's applicability derivation is verified `supported` on the
/// expected state — stale support never launches an episode.
pub async fn request_execution(lifecycle: &mut Service<'_>, input: &Value) -> Result<Snapshot> {
    let v = app_object_opt(
        input,
        &[
            "application",
            "operation",
            "expectedHead",
            "expectedMemory",
            "entrypoint",
            "input",
            "derivation",
        ],
        &["evidence", "causedBy"],
    )?;
    let application = app_id(&v["application"])?.to_owned();
    let operation = app_ref(&v["operation"])?.to_owned();
    let expected_head = app_ref(&v["expectedHead"])?.to_owned();
    let expected_memory = app_ref(&v["expectedMemory"])?.to_owned();
    let entrypoint_name = app_id(&v["entrypoint"])?.to_owned();
    let episode_input = app_ref(&v["input"])?.to_owned();
    let derivation_ref = app_ref(&v["derivation"])?.to_owned();
    let evidence = match v.get("evidence") {
        Some(e) => app_refs(e, 15)?,
        None => Vec::new(),
    };
    let caused_by = opt_ref(v.get("causedBy").unwrap_or(&Value::Null))?;

    let expected = parse_state(&get_record(&lifecycle.store, &expected_head)?)?;
    if expected.application != application || expected.memory != expected_memory {
        return Err(Error::invalid(
            "Execution expectation does not match the named application state",
        ));
    }
    let revision = parse_revision(&get_record(&lifecycle.store, &expected.revision)?)?;
    if !revision
        .entrypoints
        .iter()
        .any(|e| e.name == entrypoint_name)
    {
        return Err(Error::invalid("Execution names an unknown entrypoint"));
    }
    let entrypoint = revision
        .entrypoints
        .iter()
        .find(|e| e.name == entrypoint_name)
        .expect("checked above");
    let derivation = mem::parse_derivation(&get_record(&lifecycle.store, &derivation_ref)?)?;
    if derivation.application != application
        || derivation.captured_state != expected_head
        || derivation.memory != expected_memory
        || derivation.query != entrypoint.applicability
        || derivation.status != "supported"
        || !derivation.verified
    {
        return Err(Error::invalid(
            "Execution is not bound to a verified supported applicability derivation on the expected state",
        ));
    }
    let mut evidence = evidence;
    evidence.insert(0, derivation_ref);
    lifecycle.commit(&json!({
        "application": application, "operation": operation, "kind": "investigate",
        "expectedHead": expected_head, "revision": expected.revision,
        "memory": expected_memory,
        "intents": [{"kind":"start-episode","entrypoint":entrypoint_name,"input":episode_input}],
        "evidence": evidence, "causedBy": caused_by,
    })).await
}

/// Observation-to-state bridge (src/application-observation.ts parity):
/// admit the observation through the memory service, chain the snapshot,
/// then commit the memory transition on the expected head.
pub async fn append_observation(
    lifecycle: &mut Service<'_>,
    memory: &mem::MemoryService<'_>,
    input: &Value,
) -> Result<Value> {
    let v = app_object_opt(
        input,
        &[
            "application",
            "operation",
            "expectedHead",
            "expectedMemory",
            "observation",
        ],
        &["evidence", "causedBy"],
    )?;
    let application = app_id(&v["application"])?.to_owned();
    let operation = app_ref(&v["operation"])?.to_owned();
    let expected_head = app_ref(&v["expectedHead"])?.to_owned();
    let expected_memory = app_ref(&v["expectedMemory"])?.to_owned();
    let evidence = match v.get("evidence") {
        Some(e) => app_refs(e, 16)?,
        None => Vec::new(),
    };
    let caused_by = opt_ref(v.get("causedBy").unwrap_or(&Value::Null))?;
    let observation_in = mem::observation_input(&v["observation"])?;
    if observation_in.application != application {
        return Err(Error::invalid("Observation belongs to another application"));
    }
    let expected = parse_state(&get_record(&lifecycle.store, &expected_head)?)?;
    if expected.application != application || expected.memory != expected_memory {
        return Err(Error::invalid(
            "Observation expectation does not match the named application state",
        ));
    }
    let prior = mem::parse_snapshot(&get_record(&lifecycle.store, &expected.memory)?)?;
    if prior.application != application {
        return Err(Error::invalid("Cross-application memory predecessor"));
    }
    let observation = memory.observe(&mut lifecycle.store, &v["observation"])?;
    let mut observations: Vec<String> = prior.observations.clone();
    observations.push(observation.clone());
    observations.sort();
    observations.dedup();
    let mut next_input = json!({
        "application": application, "schema": prior.schema, "previous": expected.memory,
        "scope": observation_in.scope, "observations": observations,
        "hypotheses": prior.hypotheses, "withdrawn": prior.withdrawn,
    });
    if let Some(archive) = prior.archive {
        next_input["archive"] = json!(archive);
    }
    let next_memory = memory.snapshot(&mut lifecycle.store, &next_input)?;
    let snapshot = lifecycle
        .commit(&json!({
            "application": application, "operation": operation, "kind": "memory",
            "expectedHead": expected_head, "revision": expected.revision,
            "memory": next_memory, "intents": [], "evidence": evidence,
            "causedBy": caused_by,
        }))
        .await?;
    Ok(json!({
        "snapshot": snapshot.digest, "observation": observation, "memory": next_memory,
    }))
}

/// Active memory selection rollover through the ordinary expected-head commit.
/// No application history, operation identity, or dispatch custody is reset.
pub async fn rollover_memory(
    lifecycle: &mut Service<'_>,
    memory: &mem::MemoryService<'_>,
    input: &Value,
) -> Result<Value> {
    let v = app_object_opt(
        input,
        &[
            "application",
            "operation",
            "expectedHead",
            "expectedMemory",
            "retainObservations",
            "retainHypotheses",
        ],
        &["evidence", "causedBy"],
    )?;
    let application = app_id(&v["application"])?.to_owned();
    let operation = app_ref(&v["operation"])?.to_owned();
    let expected_head = app_ref(&v["expectedHead"])?.to_owned();
    let expected_memory = app_ref(&v["expectedMemory"])?.to_owned();
    let observations = app_refs(&v["retainObservations"], 128)?;
    let hypotheses = app_refs(&v["retainHypotheses"], 64)?;
    let mut evidence = match v.get("evidence") {
        Some(value) => app_refs(value, 15)?,
        None => Vec::new(),
    };
    let caused_by = opt_ref(v.get("causedBy").unwrap_or(&Value::Null))?;
    let expected = parse_state(&get_record(&lifecycle.store, &expected_head)?)?;
    if expected.application != application || expected.memory != expected_memory {
        return Err(Error::invalid(
            "Rollover expectation does not match the named application state",
        ));
    }
    let rolled = memory.rollover(&mut lifecycle.store, &json!({"memory": expected_memory, "retainObservations": observations, "retainHypotheses": hypotheses}))?;
    evidence.push(app_ref(&rolled["archive"])?.to_owned());
    evidence.sort();
    evidence.dedup();
    let snapshot = lifecycle.commit(&json!({"application": application, "operation": operation, "kind": "memory",
        "expectedHead": expected_head, "revision": expected.revision, "memory": rolled["memory"], "intents": [],
        "evidence": evidence, "causedBy": caused_by})).await?;
    Ok(
        json!({"snapshot": snapshot.digest, "memory": rolled["memory"], "archive": rolled["archive"]}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canonical::digest;
    use crate::store::Store;
    use serde_json::json;
    use std::path::Path;
    use tempfile::{TempDir, tempdir};

    fn hashed(value: &Value) -> String {
        digest(&crate::application_memory::app_json(value).unwrap()).unwrap()
    }

    struct Allow;
    impl Admission for Allow {
        fn admit_commit(&self, _: &CommitContext) -> Result<()> {
            Ok(())
        }
        fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
            match &context.intent.work {
                WorkIntent::Deliver { .. } => Ok(json!({
                    "kind": "delivery",
                    "recipient": format!("cap:mailbox-send:{}", hashed(&json!({"fixture":"route"}))),
                    "hostProfile": hashed(&json!({"contract":"algal.test-host-profile.v1"})),
                })),
                WorkIntent::StartEpisode { .. } => Err(Error::new(
                    "CAPABILITY_DENIED",
                    "episodes need a domain dispatcher",
                )),
            }
        }
    }

    struct Sink {
        config: String,
        delivery: bool,
    }
    impl Dispatcher for Sink {
        fn configuration_digest(&self) -> &str {
            &self.config
        }
        fn dispatch<'a>(
            &'a self,
            context: &'a DispatchContext<'a>,
        ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
            Box::pin(async move {
                match &context.intent.work {
                    WorkIntent::Deliver { message, .. } if self.delivery => Ok(json!({
                        "status": "settled",
                        "result": {"kind": "delivery", "message": message,
                            "idempotencyKey": context.dispatch.identity},
                    })),
                    _ => Err(Error::invalid("sink unset")),
                }
            })
        }
        fn can_reconcile(&self) -> bool {
            true
        }
        fn reconcile<'a>(
            &'a self,
            context: &'a DispatchContext<'a>,
        ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
            Box::pin(async move {
                if self.delivery {
                    Some(self.dispatch(context).await)
                } else {
                    None
                }
            })
        }
    }

    fn seed(dir: &Path) -> (String, String, String, String) {
        let mut store = Store::open(dir, true).unwrap();
        let put = |store: &mut Store, v: Value| {
            store
                .put("values", &crate::application_memory::app_json(&v).unwrap())
                .unwrap()
        };
        // `manifests` reads re-normalize through `Manifest::parse`; the stored
        // digest binds the normalized value.
        let manifest = store
            .put(
                "manifests",
                &crate::contract::Manifest::parse(&json!({
                    "contract": "algal.organism.v1", "key": "organism:test", "name": "test",
                    "interface": {
                        "inputs": {"q": {"cell": "src", "port": "value"}},
                        "outputs": {"answer": {"cell": "out", "port": "value"}},
                    },
                    "cells": [
                        {"id": "src", "kind": "input", "outputs": {"value": "json"}},
                        {"id": "out", "kind": "const", "outputs": {"value": {"type": "json", "value": "ok"}}},
                    ],
                    "edges": [],
                }))
                .unwrap()
                .value,
            )
            .unwrap();
        let schema = put(
            &mut store,
            json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"available","arity":1}]}),
        );
        let program = put(
            &mut store,
            json!({"contract":"algal.query.v1","rules":[],"query":{"relation":"available","terms":[{"var":"x"},{"var":"polarity"}]},"limits":{"maxWork":50000,"maxRounds":32,"maxDerived":128,"maxBindings":128,"maxRows":16,"maxOutputBytes":262144}}),
        );
        let query = put(
            &mut store,
            json!({"contract":"algal.application-memory-query.v1","id":"available","schema":schema,"program":program,"procedures":[],"polarityColumn":1,"conflict":"single-value"}),
        );
        let queries = put(
            &mut store,
            json!({"contract":"algal.application-memory-queries.v1","queries":[query]}),
        );
        let views = put(&mut store, json!({"contract":"algal.test-views.v1"}));
        let runtime = put(&mut store, json!({"contract":"algal.test-runtime.v1"}));
        let policy = put(&mut store, json!({"contract":"algal.test-policy.v1"}));
        let frontier = put(
            &mut store,
            json!({"contract":"algal.application-memory-frontier.v1","application":"parity","previous":null,"sequence":0,"mutation":null,"status":"settled"}),
        );
        let attestation = put(&mut store, json!({"contract":"algal.test-attestation.v1"}));
        let scope = put(
            &mut store,
            json!({"contract":"algal.application-memory-scope.v1","application":"parity","environment":"fixture","task":"task-1","frontier":frontier,"bindings":[],"completeFor":[],"attestation":attestation}),
        );
        let memory = put(
            &mut store,
            json!({"contract":"algal.application-memory.v1","application":"parity","schema":schema,"previous":null,"scope":scope,"observations":[],"hypotheses":[],"withdrawn":[]}),
        );
        let revision = put(
            &mut store,
            json!({"contract":"algal.application-revision.v1","application":"parity","parent":null,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]}),
        );
        let message = put(&mut store, json!({"contract":"algal.test-message.v1"}));
        (revision, memory, message, manifest)
    }

    fn command(
        application: &str,
        operation: &str,
        kind: &str,
        expected_head: Option<&str>,
        revision: &str,
        memory: &str,
        intents: Vec<Value>,
    ) -> Value {
        json!({
            "application": application, "operation": operation, "kind": kind,
            "expectedHead": expected_head, "revision": revision, "memory": memory,
            "intents": intents, "evidence": [], "causedBy": null,
        })
    }

    fn ops(name: &str) -> String {
        hashed(&json!({"contract":"algal.test-op.v1","name":name}))
    }

    #[tokio::test]
    async fn quota_denied_genesis_does_not_reserve_an_application_name() {
        let tmp = tempdir().unwrap();
        let (revision, memory, _, _) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        lease::write(&tmp.path().join(".application-quota/ledger.json"), &json!({"contract":"algal.application-quota.v1","applications":[{"application":"parity","bytes":crate::application_quota::APPLICATION_BYTES}]}), false).unwrap();
        let create = command(
            "parity",
            &ops("quota-denied-create"),
            "create",
            None,
            &revision,
            &memory,
            vec![],
        );
        assert!(
            service
                .create(&create)
                .await
                .unwrap_err()
                .message
                .contains("per-application")
        );
        assert_eq!(
            std::fs::read_dir(tmp.path().join("applications"))
                .unwrap()
                .count(),
            1
        );
        assert!(service.inspect("parity").unwrap().is_none());
    }

    #[tokio::test]
    async fn namespace_quota_preserves_inspection_and_committed_idempotence() {
        let tmp = tempdir().unwrap();
        let (revision, memory, _, _) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let create = command(
            "parity",
            &ops("quota-create"),
            "create",
            None,
            &revision,
            &memory,
            vec![],
        );
        let initial = service.create(&create).await.unwrap();
        std::fs::File::create(service.path("parity").join("orphan"))
            .unwrap()
            .set_len(crate::application_quota::APPLICATION_BYTES)
            .unwrap();
        let next = command(
            "parity",
            &ops("quota-next"),
            "memory",
            Some(&initial.digest),
            &revision,
            &memory,
            vec![],
        );
        assert!(
            service
                .commit(&next)
                .await
                .unwrap_err()
                .message
                .contains("per-application")
        );
        assert_eq!(
            service.inspect("parity").unwrap().unwrap().digest,
            initial.digest
        );
        assert_eq!(
            service.create(&create).await.unwrap().digest,
            initial.digest
        );
        assert_eq!(service.history("parity").unwrap().len(), 1);
    }

    #[tokio::test]
    async fn failed_first_commits_and_unknown_dispatches_do_not_reserve_capacity() {
        let tmp = tempdir().unwrap();
        let (revision, memory, _, _) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let sink = Sink {
            config: ops("unused"),
            delivery: true,
        };
        for i in 0..40 {
            assert!(
                service
                    .create(&command(
                        &format!("rejected-{i}"),
                        &ops("rejected"),
                        "create",
                        None,
                        &ops("missing"),
                        &memory,
                        vec![]
                    ))
                    .await
                    .is_err()
            );
            assert!(
                service
                    .dispatch_pending(&format!("unknown-{i}"), &sink, 1)
                    .await
                    .unwrap()
                    .is_empty()
            );
        }
        struct Deny;
        impl Admission for Deny {
            fn admit_commit(&self, _: &CommitContext) -> Result<()> {
                Err(Error::invalid("host denied genesis"))
            }
            fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
                Err(Error::invalid("host denied dispatch"))
            }
        }
        let create = command(
            "parity",
            &ops("valid-create"),
            "create",
            None,
            &revision,
            &memory,
            vec![],
        );
        assert!(
            Service::new(tmp.path(), &Deny)
                .unwrap()
                .create(&create)
                .await
                .is_err()
        );
        assert_eq!(
            std::fs::read_dir(tmp.path().join("applications"))
                .unwrap()
                .count(),
            1
        );
        assert_eq!(service.create(&create).await.unwrap().state.sequence, 0);
    }

    #[tokio::test]
    async fn first_publication_holds_custody_and_preserves_application_bound() {
        let tmp = tempdir().unwrap();
        let (revision, memory, _, _) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let create = command(
            "parity",
            &ops("create-custody"),
            "create",
            None,
            &revision,
            &memory,
            vec![],
        );
        let custody = service.custody("parity", true).unwrap();
        assert!(!service.path("parity").exists());
        assert!(
            Service::new(tmp.path(), &allow)
                .unwrap()
                .create(&create)
                .await
                .is_err()
        );
        drop(custody);
        let initial = service.create(&create).await.unwrap();
        assert_eq!(
            service.create(&create).await.unwrap().digest,
            initial.digest
        );
        let body = get_record(&service.store, &revision).unwrap();
        for i in 1..32 {
            let application = format!("admitted-{i}");
            let mut candidate = body.clone();
            candidate["application"] = json!(application);
            let selected = put_record(&mut service.store, &candidate).unwrap();
            service
                .create(&command(
                    &application,
                    &ops(&application),
                    "create",
                    None,
                    &selected,
                    &memory,
                    vec![],
                ))
                .await
                .unwrap();
        }
        let overflow = service
            .create(&command(
                "overflow",
                &ops("overflow"),
                "create",
                None,
                &revision,
                &memory,
                vec![],
            ))
            .await
            .unwrap_err();
        assert_eq!(overflow.message, "Application count exhausted");
        assert_eq!(
            service.inspect("parity").unwrap().unwrap().digest,
            initial.digest
        );
    }

    #[tokio::test]
    async fn genesis_create_is_durable_and_idempotent() {
        let tmp: TempDir = tempdir().unwrap();
        let (revision, memory, _, _) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let create = command(
            "parity",
            &ops("create"),
            "create",
            None,
            &revision,
            &memory,
            vec![],
        );
        let first = service.create(&create).await.unwrap();
        assert_eq!(first.state.sequence, 0);
        let replay = service.create(&create).await.unwrap();
        assert_eq!(first.digest, replay.digest);
        let inspected = service.inspect("parity").unwrap().unwrap();
        assert_eq!(inspected.digest, first.digest);
        // A different request under the same operation digest must not replay.
        let mut mutated = create.clone();
        mutated["memory"] = json!(revision);
        assert_eq!(
            service.create(&mutated).await.unwrap_err().code,
            "RECEIPT_MISMATCH"
        );
        // A stale expected head is a receipt mismatch, never a silent fork.
        let stale = command(
            "parity",
            &ops("stale"),
            "memory",
            Some(&revision),
            &revision,
            &memory,
            vec![],
        );
        assert_eq!(
            service.commit(&stale).await.unwrap_err().code,
            "RECEIPT_MISMATCH"
        );
    }

    #[tokio::test]
    async fn deliver_intents_settle_through_the_durable_outbox() {
        let tmp = tempdir().unwrap();
        let (revision, memory, message, _manifest) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let create = command(
            "parity",
            &ops("create"),
            "create",
            None,
            &revision,
            &memory,
            vec![],
        );
        let head = service.create(&create).await.unwrap();
        let investigate = command(
            "parity",
            &ops("investigate"),
            "investigate",
            Some(&head.digest),
            &revision,
            &memory,
            vec![json!({"kind":"deliver","route":"investigate","message":message})],
        );
        let next = service.commit(&investigate).await.unwrap();
        let history = service.history("parity").unwrap();
        let pending = service.pending(&history).unwrap();
        assert_eq!(pending.len(), 1);
        assert!(pending[0].dispatch.is_none());
        let sink = Sink {
            config: hashed(&json!({"contract":"algal.test-sink.v1"})),
            delivery: true,
        };
        let dispatched = service.dispatch_pending("parity", &sink, 32).await.unwrap();
        assert_eq!(dispatched.len(), 1);
        assert_eq!(dispatched[0].value()["status"], "settled");
        let history = service.history("parity").unwrap();
        assert!(service.pending(&history).unwrap().is_empty());
        // Settlement is durable: reconcile returns the recorded dispatch.
        let reconciled = service
            .reconcile_dispatch("parity", &pending[0].intent, &sink)
            .await
            .unwrap();
        assert_eq!(reconciled.status, "settled");
        assert_eq!(next.state.previous.as_deref(), Some(head.digest.as_str()));
    }

    #[tokio::test]
    async fn uncertain_dispatches_are_never_replayed_and_reconcile_explicitly() {
        let tmp = tempdir().unwrap();
        let (revision, memory, message, _manifest) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        service
            .create(&command(
                "parity",
                &ops("create"),
                "create",
                None,
                &revision,
                &memory,
                vec![],
            ))
            .await
            .unwrap();
        let head = service.inspect("parity").unwrap().unwrap().digest;
        service
            .commit(&command(
                "parity",
                &ops("investigate"),
                "investigate",
                Some(&head),
                &revision,
                &memory,
                vec![json!({"kind":"deliver","route":"investigate","message":message})],
            ))
            .await
            .unwrap();
        let sink = Sink {
            config: hashed(&json!({"contract":"algal.test-sink.v1"})),
            delivery: false,
        };
        let dispatched = service.dispatch_pending("parity", &sink, 32).await.unwrap();
        assert_eq!(dispatched[0].value()["status"], "uncertain");
        // The uncertain admission is returned, never retried implicitly.
        let again = service.dispatch_pending("parity", &sink, 32).await.unwrap();
        assert_eq!(again[0].value()["status"], "uncertain");
        assert_eq!(again[0].value(), dispatched[0].value());
        // Explicit reconcile settles it.
        let settled_sink = Sink {
            config: sink.config.clone(),
            delivery: true,
        };
        let reconciled = service
            .reconcile_dispatch(
                "parity",
                dispatched[0].value()["intent"].as_str().unwrap(),
                &settled_sink,
            )
            .await
            .unwrap();
        assert_eq!(reconciled.status, "settled");
        let history = service.history("parity").unwrap();
        assert!(service.pending(&history).unwrap().is_empty());
    }

    #[tokio::test]
    async fn admitted_writer_keeps_its_old_binding_during_reconciliation() {
        use std::cell::Cell;
        struct WriterAdmission {
            change: Cell<bool>,
        }
        impl Admission for WriterAdmission {
            fn admit_commit(&self, _: &CommitContext) -> Result<()> {
                Ok(())
            }
            fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
                let mut value = context
                    .previous_dispatch
                    .ok_or_else(|| Error::invalid("missing prior admission"))?
                    .plan
                    .value();
                if self.change.get() {
                    value["binding"]["hostProfile"] = json!(ops("changed-host"));
                }
                Ok(value)
            }
        }
        let tmp = tempdir().unwrap();
        let (revision, memory, input, manifest) = seed(tmp.path());
        let admission = WriterAdmission {
            change: Cell::new(false),
        };
        let mut service = Service::new(tmp.path(), &admission).unwrap();
        let source = service
            .create(&command(
                "parity",
                &ops("writer"),
                "create",
                None,
                &revision,
                &memory,
                vec![json!({"kind":"start-episode","entrypoint":"run","input":input})],
            ))
            .await
            .unwrap();
        let intents = service.intents(&source).unwrap();
        let (intent_ref, intent) = &intents[0];
        let plan = parse_plan(&json!({"kind":"episode","binding":{
            "contract":"algal.application-episode.v1","application":"parity","intent":intent_ref,
            "sourceState":source.digest,"revision":revision,"memory":memory,"epoch":0,"entrypoint":"run",
            "manifest":manifest,"arguments":input,"process":process_name("parity", intent_ref).unwrap(),
            "maxGenerations":1,"hostProfile":ops("profile"),"access":"external-write"
        }})).unwrap();
        let previous = parse_dispatch(
            &json!({"contract":"algal.application-dispatch.v1","application":"parity",
            "intent":intent_ref,"sourceState":source.digest,"configurationDigest":ops("dispatcher"),
            "identity":dispatch_identity("parity", intent_ref, &plan).unwrap(),"plan":plan.value(),
            "status":"uncertain","result":null,"reason":"lost acknowledgement"}),
        )
        .unwrap();
        let next_memory = put_record(&mut service.store, &json!("next-memory")).unwrap();
        let current = service
            .commit(&command(
                "parity",
                &ops("advance-writer-memory"),
                "memory",
                Some(&source.digest),
                &revision,
                &next_memory,
                vec![],
            ))
            .await
            .unwrap();
        assert_eq!(
            service
                .admit_plan(&current, &source, intent, intent_ref, Some(&previous))
                .unwrap()
                .value(),
            plan.value()
        );
        admission.change.set(true);
        assert!(
            service
                .admit_plan(&current, &source, intent, intent_ref, Some(&previous))
                .is_err()
        );
    }

    #[tokio::test]
    async fn denied_and_blocked_intents_do_not_starve_later_work() {
        use std::cell::RefCell;
        struct Selective;
        impl Admission for Selective {
            fn admit_commit(&self, _: &CommitContext) -> Result<()> {
                Ok(())
            }
            fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
                if matches!(&context.intent.work, WorkIntent::Deliver { route, .. } if route == "denied")
                {
                    return Err(Error::invalid("policy denies this route"));
                }
                Allow.admit_dispatch(context)
            }
        }
        struct FairSink {
            config: String,
            calls: RefCell<Vec<String>>,
        }
        impl Dispatcher for FairSink {
            fn configuration_digest(&self) -> &str {
                &self.config
            }
            fn dispatch<'a>(
                &'a self,
                context: &'a DispatchContext<'a>,
            ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
                Box::pin(async move {
                    let WorkIntent::Deliver { route, message } = &context.intent.work else {
                        unreachable!()
                    };
                    self.calls.borrow_mut().push(route.clone());
                    if route == "blocked" {
                        return Ok(json!({"status":"blocked","reason":"unavailable"}));
                    }
                    Ok(
                        json!({"status":"settled","result":{"kind":"delivery","message":message,"idempotencyKey":context.dispatch.identity}}),
                    )
                })
            }
        }
        let tmp = tempdir().unwrap();
        let (revision, memory, message, _) = seed(tmp.path());
        let allow = Selective;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        service
            .create(&command(
                "parity",
                &ops("fairness"),
                "create",
                None,
                &revision,
                &memory,
                ["denied", "blocked", "eligible"]
                    .iter()
                    .map(|route| json!({"kind":"deliver","route":route,"message":message}))
                    .collect(),
            ))
            .await
            .unwrap();
        let sink = FairSink {
            config: ops("fair-sink"),
            calls: RefCell::new(Vec::new()),
        };
        for expected in [
            vec!["denied", "blocked"],
            vec!["denied", "blocked", "settled"],
            vec!["denied", "blocked"],
        ] {
            let rows = service.dispatch_pending("parity", &sink, 1).await.unwrap();
            let values = rows.iter().map(DispatchAttempt::value).collect::<Vec<_>>();
            assert_eq!(
                values
                    .iter()
                    .map(|v| v["status"].as_str().unwrap())
                    .collect::<Vec<_>>(),
                expected
            );
            assert_eq!(
                values[0]["contract"],
                "algal.application-admission-denied.v1"
            );
            assert!(values[0].get("plan").is_none());
        }
        assert_eq!(*sink.calls.borrow(), ["blocked", "eligible"]);
    }

    #[tokio::test]
    async fn entrypoint_manifests_must_exist_and_views_stay_declared() {
        let tmp = tempdir().unwrap();
        let (revision, memory, _, manifest) = seed(tmp.path());
        let mut record = get_record(&Store::open(tmp.path(), false).unwrap(), &revision).unwrap();
        record["entrypoints"][0]["manifest"] =
            json!(hashed(&json!({"contract":"algal.missing.v1"})));
        let mut store = Store::open(tmp.path(), true).unwrap();
        let bad_revision = put_record(&mut store, &record).unwrap();
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let create = command(
            "parity",
            &ops("create"),
            "create",
            None,
            &bad_revision,
            &memory,
            vec![],
        );
        assert!(service.create(&create).await.is_err());
        // An applicability outside the entrypoint's declared view is rejected.
        let widened = json!({"contract":"algal.application-memory-query.v1","id":"outside","schema":record["schema"],"program":record["entrypoints"][0]["applicability"],"procedures":[],"polarityColumn":1,"conflict":"single-value"});
        let outside = put_record(&mut store, &widened).unwrap();
        record["entrypoints"][0]["applicability"] = json!(outside);
        record["entrypoints"][0]["manifest"] = json!(manifest);
        let outside_revision = put_record(&mut store, &record).unwrap();
        let create = command(
            "parity",
            &ops("create2"),
            "create",
            None,
            &outside_revision,
            &memory,
            vec![],
        );
        assert!(service.create(&create).await.is_err());
    }

    #[tokio::test]
    async fn activation_and_migration_transitions() {
        let tmp = tempdir().unwrap();
        let (revision, memory, _, manifest) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let head = service
            .create(&command(
                "parity",
                &ops("create"),
                "create",
                None,
                &revision,
                &memory,
                vec![],
            ))
            .await
            .unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let record = get_record(&store, &revision).unwrap();

        // A compatible candidate — same schema, parented on the incumbent —
        // activates and bumps the epoch.
        let mut candidate = record.clone();
        candidate["parent"] = json!(revision);
        let candidate_ref = put_record(&mut store, &candidate).unwrap();
        let activated = service
            .commit(&command(
                "parity",
                &ops("activate"),
                "activate",
                Some(&head.digest),
                &candidate_ref,
                &memory,
                vec![],
            ))
            .await
            .unwrap();
        assert_eq!(activated.state.epoch, 1);
        assert_eq!(activated.state.revision, candidate_ref);

        // A schema change through activate is rejected; migrate is the path.
        let schema2 = put_record(
            &mut store,
            &json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"moved","arity":1}]}),
        )
        .unwrap();
        let mut next = candidate.clone();
        next["parent"] = json!(candidate_ref);
        next["schema"] = json!(schema2);
        let next_ref = put_record(&mut store, &next).unwrap();
        let bad = command(
            "parity",
            &ops("bad-activate"),
            "activate",
            Some(&activated.digest),
            &next_ref,
            &memory,
            vec![],
        );
        assert!(service.commit(&bad).await.is_err());

        // Migration evidence must bind the transition and be consumed by the
        // migrated memory — an observation whose raw record is the migration.
        let migration = json!({
            "contract":"algal.application-migration.v1","application":"parity",
            "from":memory,"previousRevision":candidate_ref,"candidateRevision":next_ref,
            "program":manifest,"receipt":manifest,
            "claims":[{"relation":"moved","tuple":["tool-a"],"polarity":"supported"}],
        });
        let migration_ref = put_record(&mut store, &migration).unwrap();
        let observation = put_record(
            &mut store,
            &json!({"contract":"algal.application-memory-observation.v1","application":"parity","scope":revision,"procedure":revision,"raw":migration_ref,"receipt":revision,"decoder":revision,"admission":revision,"claims":[]}),
        )
        .unwrap();
        let migrated = put_record(
            &mut store,
            &json!({"contract":"algal.application-memory.v1","application":"parity","schema":schema2,"previous":null,"scope":revision,"observations":[observation],"hypotheses":[],"withdrawn":[]}),
        )
        .unwrap();

        // No evidence: rejected.
        let none = command(
            "parity",
            &ops("migrate-none"),
            "migrate",
            Some(&activated.digest),
            &next_ref,
            &migrated,
            vec![],
        );
        assert!(service.commit(&none).await.is_err());
        // Evidence the migrated memory does not consume: rejected.
        let mut other = migration.clone();
        other["claims"] = json!([]);
        let other_ref = put_record(&mut store, &other).unwrap();
        let mut unconsumed = command(
            "parity",
            &ops("migrate-stale"),
            "migrate",
            Some(&activated.digest),
            &next_ref,
            &migrated,
            vec![],
        );
        unconsumed["evidence"] = json!([other_ref]);
        assert!(service.commit(&unconsumed).await.is_err());
        // Bound and consumed evidence migrates the epoch and the schema.
        let mut migrate = command(
            "parity",
            &ops("migrate"),
            "migrate",
            Some(&activated.digest),
            &next_ref,
            &migrated,
            vec![],
        );
        migrate["evidence"] = json!([migration_ref]);
        let migrated_state = service.commit(&migrate).await.unwrap();
        assert_eq!(migrated_state.state.epoch, 2);
        assert_eq!(migrated_state.state.memory, migrated);
        assert_eq!(migrated_state.state.revision, next_ref);
    }
}
