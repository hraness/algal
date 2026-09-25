//! Habitat-wide work accounting, port of src/habitat-budget.ts: one account
//! for every run that belongs to one habitat activity (a foundry run, a
//! search, or the evaluations of an application experiment), separate from
//! the per-run root budget.
//!
//! Before a run starts, the account reserves the run's declared ceiling: its
//! root manifest's `maxWork` and `maxAgentCalls` (nested children share the
//! root allowance), plus one run. The run is admitted only when that ceiling
//! fits beside everything already charged. After the run, the account charges
//! the work units and executor attempts its receipt records, whatever the
//! outcome: losing candidates, failed runs, failure-edge recovery, and retried
//! provider attempts all cost what they recorded. The rest of the reservation
//! is released. The first refused reservation is terminal. It is recorded
//! with the limits it would have exceeded, and the account admits nothing
//! afterwards.
//!
//! The closed `algal.habitat-budget.v1` record lists every admitted run in
//! admission order with its receipt, ceiling, and charge, so the admission
//! arithmetic is recomputed from the record alone and every charge is checked
//! against a receipt that replays offline. It carries no wall-clock values.
//!
//! This is deliberately not the application namespace quota:
//! `algal.application-quota.v1` is a mutable host ledger of filesystem bytes
//! measured from the environment and never replayed. This account charges
//! deterministic receipt quantities and is retained as evidence.

use crate::{
    Error, Result,
    canonical::{check_digest, digest},
    contract::Manifest,
    effects::Host,
    graph::Transports,
    runtime,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{future::Future, pin::Pin};

pub const CONTRACT: &str = "algal.habitat-budget.v1";
/// The explicit refusal for counterfactual replay and ordering exploration:
/// the native runtime neither runs nor verifies them.
pub fn whatif_unsupported() -> Error {
    Error::invalid(
        "counterfactual replay and ordering exploration (algal.replay-comparison.v1, algal.ordering-scenario.v1, algal.ordering-report.v1) run in the TypeScript runtime; the native runtime does not run or verify them",
    )
}
/// Admitted runs per account, and the largest `limits.runs`.
pub const MAX_RUNS: u64 = 4_096;
/// A manifest's largest `maxWork` and `maxAgentCalls`: the ceiling bounds.
const MAX_CEILING_WORK: u64 = 100_000_000;
const MAX_CEILING_ATTEMPTS: u64 = 64;
/// Largest `limits.work`: `MAX_RUNS` runs at the largest per-run `maxWork`.
pub const MAX_WORK: u64 = MAX_RUNS * MAX_CEILING_WORK;
/// Largest `limits.attempts`: `MAX_RUNS` runs at the largest `maxAgentCalls`.
pub const MAX_ATTEMPTS: u64 = MAX_RUNS * MAX_CEILING_ATTEMPTS;
/// Largest work one run may be charged; the foundry case-record bound.
pub const MAX_RUN_WORK: u64 = 4_294_967_295;
const ACTIVITIES: [&str; 3] = ["experiment", "foundry", "search"];

/// Limits one account admits runs against.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Limits {
    pub work: u64,
    pub attempts: u64,
    pub runs: u64,
}

#[derive(Clone, Copy, Default)]
struct Totals {
    work: u64,
    attempts: u64,
    runs: u64,
}

fn fail(message: impl std::fmt::Display) -> Error {
    Error::invalid(format!("habitat budget: {message}"))
}

fn closed<'a>(value: &'a Value, fields: &[&str], at: &str) -> Result<&'a Map<String, Value>> {
    let record = value
        .as_object()
        .ok_or_else(|| fail(format!("{at} must be an object")))?;
    if let Some(key) = record.keys().find(|key| !fields.contains(&key.as_str())) {
        return Err(fail(format!("{at} has unknown field \"{key}\"")));
    }
    if let Some(key) = fields.iter().find(|key| !record.contains_key(**key)) {
        return Err(fail(format!("{at} is missing \"{key}\"")));
    }
    Ok(record)
}

fn count(value: &Value, min: u64, max: u64, at: &str) -> Result<u64> {
    value
        .as_u64()
        .filter(|n| (min..=max).contains(n))
        .ok_or_else(|| fail(format!("{at} must be an integer in {min}..{max}")))
}

fn reference(value: &Value, at: &str) -> Result<String> {
    value
        .as_str()
        .filter(|text| check_digest(text).is_ok())
        .map(str::to_owned)
        .ok_or_else(|| fail(format!("{at} must be a sha256 digest")))
}

fn activity(value: &str) -> Result<&'static str> {
    ACTIVITIES
        .iter()
        .copied()
        .find(|known| *known == value)
        .ok_or_else(|| fail("activity must be experiment, foundry, or search"))
}

fn ceiling(value: &Value, at: &str) -> Result<(u64, u64)> {
    closed(value, &["work", "attempts"], at)?;
    Ok((
        count(&value["work"], 1, MAX_CEILING_WORK, &format!("{at}.work"))?,
        count(
            &value["attempts"],
            0,
            MAX_CEILING_ATTEMPTS,
            &format!("{at}.attempts"),
        )?,
    ))
}

/// The limits a reservation of `(work, attempts)` would exceed after
/// `charged`, in sorted order.
fn exceeded(limits: &Limits, charged: &Totals, (work, attempts): (u64, u64)) -> Vec<&'static str> {
    let mut reasons = Vec::new();
    if charged.attempts + attempts > limits.attempts {
        reasons.push("attempts");
    }
    if charged.runs + 1 > limits.runs {
        reasons.push("runs");
    }
    if charged.work + work > limits.work {
        reasons.push("work");
    }
    reasons
}

/// `parseHabitatLimits`: a closed, bounded `{work, attempts, runs}`.
pub fn parse_limits(value: &Value) -> Result<Limits> {
    closed(value, &["work", "attempts", "runs"], "limits")?;
    Ok(Limits {
        work: count(&value["work"], 1, MAX_WORK, "limits.work")?,
        attempts: count(&value["attempts"], 0, MAX_ATTEMPTS, "limits.attempts")?,
        runs: count(&value["runs"], 1, MAX_RUNS, "limits.runs")?,
    })
}

fn limits_json(limits: &Limits) -> Value {
    json!({"work":limits.work,"attempts":limits.attempts,"runs":limits.runs})
}

/// `parseHabitatRun`: one closed `{manifest, receipt, ceiling, charged}` run
/// entry with the per-run bounds and no account arithmetic; `extra` names
/// additional fields the caller parses itself (a schedule's `activity`, for
/// one). Returns the normalized entry.
pub fn parse_run(value: &Value, at: &str, extra: &[&str]) -> Result<Value> {
    let fields: Vec<&str> = ["manifest", "receipt", "ceiling", "charged"]
        .into_iter()
        .chain(extra.iter().copied())
        .collect();
    closed(value, &fields, at)?;
    let bound = ceiling(&value["ceiling"], &format!("{at}.ceiling"))?;
    let charged = &value["charged"];
    closed(charged, &["work", "attempts"], &format!("{at}.charged"))?;
    Ok(json!({
        "manifest":reference(&value["manifest"], &format!("{at}.manifest"))?,
        "receipt":reference(&value["receipt"], &format!("{at}.receipt"))?,
        "ceiling":{"work":bound.0,"attempts":bound.1},
        "charged":{
            "work":count(&charged["work"], 0, MAX_RUN_WORK, &format!("{at}.charged.work"))?,
            "attempts":count(&charged["attempts"], 0, bound.1, &format!("{at}.charged.attempts"))?,
        },
    }))
}

/// `parseHabitatBudget`: parse a closed `algal.habitat-budget.v1` record and
/// recompute its arithmetic. Every run was admitted within the limits at its
/// turn, the totals are the sum of the charges, and a refusal names exactly
/// the limits its ceiling exceeds. Evidence checks against a store are
/// separate. Returns the normalized record.
pub fn parse(value: &Value) -> Result<Value> {
    closed(
        value,
        &[
            "contract", "activity", "limits", "runs", "charged", "outcome", "refused",
        ],
        "record",
    )?;
    if value["contract"] != CONTRACT {
        return Err(fail(format!("contract must be {CONTRACT}")));
    }
    let kind = activity(value["activity"].as_str().unwrap_or(""))?;
    let limits = parse_limits(&value["limits"])?;
    let raw_runs = value["runs"]
        .as_array()
        .filter(|runs| runs.len() as u64 <= limits.runs)
        .ok_or_else(|| fail("runs must be a list of at most limits.runs entries"))?;
    let mut totals = Totals::default();
    let mut runs = Vec::with_capacity(raw_runs.len());
    for (i, raw) in raw_runs.iter().enumerate() {
        let at = format!("runs[{i}]");
        closed(raw, &["manifest", "receipt", "ceiling", "charged"], &at)?;
        let bound = ceiling(&raw["ceiling"], &format!("{at}.ceiling"))?;
        let charged = &raw["charged"];
        closed(charged, &["work", "attempts"], &format!("{at}.charged"))?;
        let work = count(
            &charged["work"],
            0,
            MAX_RUN_WORK,
            &format!("{at}.charged.work"),
        )?;
        // The runtime refuses an attempt past maxAgentCalls, so a charge
        // never exceeds its ceiling. Work can: a run stops only after the
        // activation that crossed its own maxWork, and its receipt records
        // that amount.
        let attempts = count(
            &charged["attempts"],
            0,
            bound.1,
            &format!("{at}.charged.attempts"),
        )?;
        if !exceeded(&limits, &totals, bound).is_empty() {
            return Err(fail(format!("{at} was admitted beyond the limits")));
        }
        totals.work += work;
        totals.attempts += attempts;
        totals.runs += 1;
        runs.push(json!({
            "manifest":reference(&raw["manifest"], &format!("{at}.manifest"))?,
            "receipt":reference(&raw["receipt"], &format!("{at}.receipt"))?,
            "ceiling":{"work":bound.0,"attempts":bound.1},
            "charged":{"work":work,"attempts":attempts},
        }));
    }
    let charged = &value["charged"];
    closed(charged, &["work", "attempts", "runs"], "charged")?;
    if charged["work"].as_u64() != Some(totals.work)
        || charged["attempts"].as_u64() != Some(totals.attempts)
        || charged["runs"].as_u64() != Some(totals.runs)
    {
        return Err(fail("charged totals differ from the runs"));
    }
    let outcome = value["outcome"]
        .as_str()
        .filter(|outcome| *outcome == "complete" || *outcome == "exhausted")
        .ok_or_else(|| fail("outcome must be complete or exhausted"))?;
    let refused = if outcome == "complete" {
        if !value["refused"].is_null() {
            return Err(fail("a complete account has no refusal"));
        }
        Value::Null
    } else {
        let raw = &value["refused"];
        closed(raw, &["manifest", "ceiling", "reasons"], "refused")?;
        let bound = ceiling(&raw["ceiling"], "refused.ceiling")?;
        let reasons = exceeded(&limits, &totals, bound);
        if reasons.is_empty() {
            return Err(fail("refused ceiling fits within the limits"));
        }
        let named = raw["reasons"].as_array().is_some_and(|listed| {
            listed.len() == reasons.len()
                && listed
                    .iter()
                    .zip(&reasons)
                    .all(|(listed, reason)| listed.as_str() == Some(*reason))
        });
        if !named {
            return Err(fail(
                "refused.reasons must name exactly the exceeded limits",
            ));
        }
        json!({
            "manifest":reference(&raw["manifest"], "refused.manifest")?,
            "ceiling":{"work":bound.0,"attempts":bound.1},
            "reasons":reasons,
        })
    };
    Ok(json!({
        "contract":CONTRACT,
        "activity":kind,
        "limits":limits_json(&limits),
        "runs":runs,
        "charged":{"work":totals.work,"attempts":totals.attempts,"runs":totals.runs},
        "outcome":outcome,
        "refused":refused,
    }))
}

/// One habitat activity's account. A host calls `reserve` before each run
/// and `charge` with its receipt after; `record` closes the account as
/// evidence.
pub struct Account {
    activity: &'static str,
    limits: Limits,
    runs: Vec<Value>,
    charged: Totals,
    refused: Option<Value>,
    pending: Option<(String, (u64, u64))>,
}

impl Account {
    pub fn new(kind: &str, limits: Limits) -> Result<Self> {
        Ok(Self {
            activity: activity(kind)?,
            limits: parse_limits(&limits_json(&limits))?,
            runs: Vec::new(),
            charged: Totals::default(),
            refused: None,
            pending: None,
        })
    }

    /// `HabitatAccount.resume`: rebuild an account from a record it wrote
    /// earlier so its activity can continue, for example across separate
    /// `application evaluate` commands. The record must be complete, and
    /// every listed run must reconcile with the store: its manifest declares
    /// the recorded ceiling and its receipt records the charge. Anything else
    /// is refused.
    pub async fn resume(value: &Value, store: &Store) -> Result<Self> {
        let budget = parse(value)?;
        if budget["outcome"] != "complete" {
            return Err(Error::limit(
                "habitat budget: an exhausted account cannot continue",
            ));
        }
        let (mismatches, _) = check_evidence(&budget, store, None).await?;
        if let Some(first) = mismatches.first() {
            return Err(fail(format!(
                "the account does not reconcile with the store: {first}"
            )));
        }
        let mut account = Self::new(
            budget["activity"].as_str().unwrap_or(""),
            parse_limits(&budget["limits"])?,
        )?;
        let total = |field: &str| budget["charged"][field].as_u64().unwrap_or(0);
        account.charged = Totals {
            work: total("work"),
            attempts: total("attempts"),
            runs: total("runs"),
        };
        account.runs = budget["runs"].as_array().cloned().unwrap_or_default();
        Ok(account)
    }

    pub fn activity(&self) -> &'static str {
        self.activity
    }

    /// True once a reservation has been refused; the account then admits
    /// nothing.
    pub fn exhausted(&self) -> bool {
        self.refused.is_some()
    }

    /// Reserve a run's declared ceiling before it starts. A refusal is
    /// recorded as the terminal outcome and fails with `BUDGET_EXHAUSTED`;
    /// every later reservation fails too.
    pub fn reserve(&mut self, manifest: &Manifest) -> Result<()> {
        if self.pending.is_some() {
            return Err(Error::new(
                "INTERNAL",
                "habitat budget: the previous run was not charged",
            ));
        }
        if let Some(refused) = &self.refused {
            return Err(Error::limit(format!(
                "habitat budget exhausted: {}",
                reasons_text(&refused["reasons"])
            )));
        }
        let bound = ceiling(
            &json!({"work":manifest.budgets.max_work,"attempts":manifest.budgets.max_agent_calls}),
            "ceiling",
        )?;
        let digest = manifest.digest()?;
        let reasons = exceeded(&self.limits, &self.charged, bound);
        if !reasons.is_empty() {
            let message = format!("habitat budget exhausted: {}", reasons.join(", "));
            self.refused = Some(json!({
                "manifest":digest,
                "ceiling":{"work":bound.0,"attempts":bound.1},
                "reasons":reasons,
            }));
            return Err(Error::limit(message));
        }
        self.pending = Some((digest, bound));
        Ok(())
    }

    /// Charge the reserved run what its receipt records and release the rest
    /// of the reservation. The receipt must be stored under `receipt_digest`.
    pub fn charge(&mut self, receipt_digest: &str, receipt: &Value) -> Result<()> {
        let Some((manifest, bound)) = &self.pending else {
            return Err(Error::new(
                "INTERNAL",
                "habitat budget: no reservation to charge",
            ));
        };
        if receipt["manifestDigest"].as_str() != Some(manifest.as_str()) {
            return Err(Error::new(
                "INTERNAL",
                "habitat budget: the receipt ran another manifest",
            ));
        }
        let work = count(&receipt["work"]["units"], 0, MAX_RUN_WORK, "charged.work")?;
        let attempts = count(
            &receipt["work"]["agentCalls"],
            0,
            bound.1,
            "charged.attempts",
        )?;
        let run = json!({
            "manifest":manifest,
            "receipt":reference(&json!(receipt_digest), "receipt")?,
            "ceiling":{"work":bound.0,"attempts":bound.1},
            "charged":{"work":work,"attempts":attempts},
        });
        self.pending = None;
        self.runs.push(run);
        self.charged.work += work;
        self.charged.attempts += attempts;
        self.charged.runs += 1;
        Ok(())
    }

    /// Release an open reservation when the run ended without a receipt, for
    /// example when admission of its manifest failed. Nothing is charged and
    /// the account stays usable, so the record can still be written; the run
    /// is not listed because it recorded nothing.
    pub fn release(&mut self) -> Result<()> {
        if self.pending.take().is_none() {
            return Err(Error::new(
                "INTERNAL",
                "habitat budget: no reservation to release",
            ));
        }
        Ok(())
    }

    /// The closed record: `complete` unless a reservation was refused.
    pub fn record(&self) -> Result<Value> {
        if self.pending.is_some() {
            return Err(Error::new(
                "INTERNAL",
                "habitat budget: a reservation is still open",
            ));
        }
        parse(&json!({
            "contract":CONTRACT,
            "activity":self.activity,
            "limits":limits_json(&self.limits),
            "runs":self.runs,
            "charged":{"work":self.charged.work,"attempts":self.charged.attempts,"runs":self.charged.runs},
            "outcome":if self.refused.is_some() { "exhausted" } else { "complete" },
            "refused":self.refused.clone().unwrap_or(Value::Null),
        }))
    }
}

/// `HabitatLedger`: what an activity needs from an account. `Account` is the
/// standalone account; `habitat_schedule::ScheduledLedger` is one activity's
/// view of a schedule's shared account, where the scheduler serializes the
/// reserve, run, and charge across every activity.
pub trait Ledger: Send {
    /// The activity label a foundry or search checks against.
    fn activity(&self) -> &'static str;
    /// Reserves the run's declared ceiling, runs it, stores its receipt, and
    /// charges what the receipt records. A refused reservation fails with
    /// `BUDGET_EXHAUSTED`; a run that fails before its receipt is stored
    /// releases the reservation.
    fn admit<'a>(
        &'a mut self,
        manifest: &'a Manifest,
        args: &'a Value,
        store: &'a mut Store,
        host: &'a mut Host,
        transports: &'a Transports,
    ) -> AdmitFuture<'a>;
    /// The standalone account's closed record, for embedding in a report. A
    /// schedule's shared-account view returns `None`: a report produced
    /// inside a schedule never carries an account of its own.
    fn standalone_record(&self) -> Result<Option<Value>>;
}

/// One admitted run's future: the stored receipt and its digest.
pub type AdmitFuture<'a> = Pin<Box<dyn Future<Output = Result<(Value, String)>> + Send + 'a>>;

/// `&mut dyn Ledger` with the object bound pinned to `'static`. Without the
/// pin, `&'a mut dyn Ledger` infers an object bound of `'a`, and `&mut`'s
/// pointee invariance then forces an `as_deref_mut` reborrow to last `'a` —
/// blocking the interleaved borrows foundry and search need.
pub type DynLedger = dyn Ledger + 'static;

/// Reborrow an owned `Option<Account>` as a shared ledger view: `Option` is
/// not a coercion site for the `&mut Account -> &mut DynLedger` unsize, so
/// `account.as_mut()` alone does not typecheck at those parameters.
pub fn as_ledger(account: &mut Option<Account>) -> Option<&mut DynLedger> {
    account.as_mut().map(|a| a as &mut DynLedger)
}

impl Ledger for Account {
    fn activity(&self) -> &'static str {
        self.activity
    }

    fn admit<'a>(
        &'a mut self,
        manifest: &'a Manifest,
        args: &'a Value,
        store: &'a mut Store,
        host: &'a mut Host,
        transports: &'a Transports,
    ) -> AdmitFuture<'a> {
        Box::pin(async move {
            self.reserve(manifest)?;
            let stored = runtime::run(
                manifest.clone(),
                args.clone(),
                store,
                host,
                transports,
                None,
            )
            .await
            .and_then(|receipt| {
                store
                    .put("runs", &receipt)
                    .map(|reference| (receipt, reference))
            });
            let (receipt, reference) = match stored {
                Ok(stored) => stored,
                Err(error) => {
                    // No stored receipt exists to charge; the reservation is
                    // released and the account stays usable for the record.
                    self.release()?;
                    return Err(error);
                }
            };
            self.charge(&reference, &receipt)?;
            Ok((receipt, reference))
        })
    }

    fn standalone_record(&self) -> Result<Option<Value>> {
        Ok(Some(self.record()?))
    }
}

fn reasons_text(reasons: &Value) -> String {
    reasons
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(Value::as_str)
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default()
}

/// A finished activity's evidence must name exactly the runs it admitted, in
/// admission order, under a complete account of the same activity. `budget`
/// is a parsed record; `expected` holds `(manifest, receipt)` pairs.
pub fn binding_mismatches(
    budget: &Value,
    kind: &str,
    expected: &[(String, String)],
) -> Vec<String> {
    let mut mismatches = Vec::new();
    if budget["activity"] != kind {
        mismatches.push(format!("budget activity is not {kind}"));
    }
    if budget["outcome"] != "complete" {
        mismatches.push("budget outcome is not complete".to_owned());
    }
    let runs = budget["runs"].as_array().map(Vec::as_slice).unwrap_or(&[]);
    if runs.len() != expected.len() {
        mismatches.push(format!(
            "budget charges {} runs, the {kind} records {}",
            runs.len(),
            expected.len()
        ));
    }
    for (i, (run, (manifest, receipt))) in runs.iter().zip(expected).enumerate() {
        if run["manifest"].as_str() != Some(manifest.as_str())
            || run["receipt"].as_str() != Some(receipt.as_str())
        {
            mismatches.push(format!("budget run {i} is not the {kind}'s run {i}"));
        }
    }
    mismatches
}

fn declared(
    store: &Store,
    manifest: &str,
    bound: &Value,
    at: &str,
    mismatches: &mut Vec<String>,
) -> Result<Option<Manifest>> {
    let Some(value) = store.get("manifests", manifest)? else {
        mismatches.push(format!("{at}: manifest {manifest} missing"));
        return Ok(None);
    };
    let parsed = Manifest::parse(&value)?;
    if bound["work"].as_u64() != Some(parsed.budgets.max_work as u64)
        || bound["attempts"].as_u64() != Some(parsed.budgets.max_agent_calls as u64)
    {
        mismatches.push(format!("{at}: ceiling differs from its manifest"));
    }
    Ok(Some(parsed))
}

/// The shared evidence check for listed runs, labelled `<label> run <i>`:
/// each ceiling is its manifest's declared budget and each charge is the
/// work its receipt records. With `replay`, a run's receipt is also replayed
/// offline, for every run or for those `replay_run` selects. Returns the
/// mismatches and the number of replayed receipts.
pub async fn check_runs_evidence(
    runs: &[Value],
    refused: &Value,
    store: &Store,
    replay: Option<&Host>,
    label: &str,
    replay_run: Option<&dyn Fn(usize) -> bool>,
) -> Result<(Vec<String>, u64)> {
    let mut mismatches = Vec::new();
    let mut checked = 0u64;
    for (i, run) in runs.iter().enumerate() {
        let at = format!("{label} run {i}");
        let manifest_digest = run["manifest"].as_str().unwrap_or("");
        let Some(manifest) = declared(
            store,
            manifest_digest,
            &run["ceiling"],
            &at,
            &mut mismatches,
        )?
        else {
            continue;
        };
        let receipt_digest = run["receipt"].as_str().unwrap_or("");
        let Some(receipt) = store.get("runs", receipt_digest)? else {
            mismatches.push(format!("{at}: receipt {receipt_digest} missing"));
            continue;
        };
        crate::receipt::validate(&receipt)?;
        if receipt["manifestDigest"].as_str() != Some(manifest_digest) {
            mismatches.push(format!("{at}: receipt ran another manifest"));
            continue;
        }
        if receipt["work"]["units"].as_u64() != run["charged"]["work"].as_u64()
            || receipt["work"]["agentCalls"].as_u64() != run["charged"]["attempts"].as_u64()
        {
            mismatches.push(format!("{at}: charge differs from its receipt"));
        }
        if let Some(tools) = replay
            && replay_run.is_none_or(|select| select(i))
        {
            let verified = runtime::verify(&receipt, manifest, store, tools).await?;
            checked += 1;
            if verified["ok"] != true {
                let detail = verified["mismatches"]
                    .as_array()
                    .map(|list| {
                        list.iter()
                            .filter_map(Value::as_str)
                            .collect::<Vec<_>>()
                            .join("; ")
                    })
                    .unwrap_or_default();
                mismatches.push(format!("{at}: receipt {receipt_digest}: {detail}"));
            }
        }
    }
    if !refused.is_null() {
        declared(
            store,
            refused["manifest"].as_str().unwrap_or(""),
            &refused["ceiling"],
            &format!("{label} refusal"),
            &mut mismatches,
        )?;
    }
    Ok((mismatches, checked))
}

/// Check a parsed record against a store: each ceiling is its manifest's
/// declared budget, and each charge is the work its receipt records. With
/// `replay`, every receipt is also replayed offline. Returns the mismatches
/// and the number of replayed receipts.
pub async fn check_evidence(
    budget: &Value,
    store: &Store,
    replay: Option<&Host>,
) -> Result<(Vec<String>, u64)> {
    check_runs_evidence(
        budget["runs"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or_default(),
        &budget["refused"],
        store,
        replay,
        "budget",
        None,
    )
    .await
}

/// `verifyHabitatBudget`: verify a standalone record, such as the terminal
/// record an exhausted activity leaves. Its arithmetic, every ceiling and
/// charge, and an offline replay of every admitted run.
pub async fn verify(value: &Value, store: &Store, tools: &Host) -> Result<Value> {
    verify_for(value, store, tools, None).await
}

/// `verify` with an expected activity: a record of another activity is a
/// mismatch (`foundry search-verify` expects `search`).
pub async fn verify_for(
    value: &Value,
    store: &Store,
    tools: &Host,
    expected: Option<&str>,
) -> Result<Value> {
    let budget = parse(value)?;
    let (mut mismatches, checked) = check_evidence(&budget, store, Some(tools)).await?;
    if let Some(kind) = expected.filter(|kind| budget["activity"] != *kind) {
        mismatches.insert(0, format!("budget activity is not {kind}"));
    }
    Ok(json!({
        "ok":mismatches.is_empty(),
        "digest":digest(&budget)?,
        "outcome":budget["outcome"],
        "checkedReceipts":checked,
        "mismatches":mismatches,
    }))
}
