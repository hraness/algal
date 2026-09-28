//! Shared additive host contracts: `algal.evaluation-evidence.v1`,
//! `algal.host-profile.v1`, `algal.promotion-decision.v1` and
//! `algal.host-lifecycle.v1`. These records are data-only projections. They
//! never grant authority, attest provider truth, or retry an external effect.
//! Both runtimes parse the same canonical bytes and reject the same fixtures
//! (`scripts/fixtures/host-contract.json`).
use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest_bytes},
    contract::{integer, keys, list, object, text},
};
use serde_json::Value;

pub const EVALUATION_EVIDENCE_CONTRACT: &str = "algal.evaluation-evidence.v1";
pub const HOST_PROFILE_CONTRACT: &str = "algal.host-profile.v1";
pub const PROMOTION_DECISION_CONTRACT: &str = "algal.promotion-decision.v1";
pub const HOST_LIFECYCLE_CONTRACT: &str = "algal.host-lifecycle.v1";

const MAX_BYTES: usize = 4_194_304;
const MAX_DEPTH: usize = 48;
const MAX_NODES: usize = 131_072;
const MAX_ENTRIES: usize = 4_096;
const MAX_STRING: usize = 262_144;
const MAX_GROUPS: usize = 64;
const MAX_CASES: usize = 2_048;
const MAX_CAPABILITIES: usize = 128;
const MAX_PROBES: usize = 64;
const MAX_ACTIONS: usize = 32;
const MAX_METRICS: usize = 128;
const MAX_INT: usize = 4_294_967_295;

fn bounded(value: &Value) -> Result<()> {
    let mut stack = vec![(value, 0usize)];
    let mut nodes = 0usize;
    while let Some((value, depth)) = stack.pop() {
        nodes += 1;
        if nodes > MAX_NODES || depth > MAX_DEPTH {
            return Err(Error::limit("host contract depth/nodes"));
        }
        match value {
            Value::Array(values) => {
                if values.len() > MAX_ENTRIES {
                    return Err(Error::limit("host contract array entries"));
                }
                stack.extend(values.iter().map(|v| (v, depth + 1)));
            }
            Value::Object(values) => {
                if values.len() > MAX_ENTRIES {
                    return Err(Error::limit("host contract object entries"));
                }
                stack.extend(values.values().map(|v| (v, depth + 1)));
            }
            Value::String(s) if s.encode_utf16().count() > MAX_STRING => {
                return Err(Error::limit("host contract string"));
            }
            Value::Number(n) if n.as_f64().is_none_or(|n| !n.is_finite()) => {
                return Err(Error::invalid("host contract finite numbers"));
            }
            _ => (),
        }
    }
    if canonical(value)?.len() > MAX_BYTES {
        return Err(Error::limit("host contract bytes"));
    }
    Ok(())
}

/// Closed object: every listed key is required and no other key may appear.
fn closed<'a>(value: &'a Value, allowed: &[&str]) -> Result<&'a serde_json::Map<String, Value>> {
    keys(value, allowed)?;
    let members = object(value)?;
    for key in allowed {
        if !members.contains_key(*key) {
            return Err(Error::invalid(format!("requires {key}")));
        }
    }
    Ok(members)
}

fn digest_field<'a>(value: &'a Value, key: &str) -> Result<&'a str> {
    check_digest(text(&value[key], 71)?)
}

fn digest_opt<'a>(value: &'a Value, key: &str) -> Result<Option<&'a str>> {
    if value[key].is_null() {
        return Ok(None);
    }
    digest_field(value, key).map(Some)
}

fn sorted_strings<'a>(value: &'a Value, max: usize, at: &str) -> Result<Vec<&'a str>> {
    let items = list(value, max)?;
    let mut out = Vec::with_capacity(items.len());
    for item in items {
        out.push(text(item, 256)?);
    }
    if out.windows(2).any(|pair| pair[0] >= pair[1]) {
        return Err(Error::invalid(format!("{at} must be sorted and unique")));
    }
    Ok(out)
}

fn finite(value: &Value, at: &str) -> Result<f64> {
    value
        .as_f64()
        .filter(|n| n.is_finite())
        .ok_or_else(|| Error::invalid(format!("{at} must be a finite number")))
}

fn one_of<'a>(value: &Value, allowed: &[&'a str]) -> Result<&'a str> {
    let value = text(value, 256)?;
    match allowed.iter().find(|a| **a == value) {
        Some(found) => Ok(found),
        None => Err(Error::invalid("value is not allowed")),
    }
}

fn bool_field(value: &Value) -> Result<bool> {
    value
        .as_bool()
        .ok_or_else(|| Error::invalid("expected boolean"))
}

/// Verify the claimed digest against the canonical record without `digest`.
fn signed(raw: &Value, at: &str) -> Result<()> {
    let claimed = digest_field(raw, "digest")?;
    let mut base = object(raw)?.clone();
    base.remove("digest");
    if digest_bytes(canonical(&Value::Object(base))?.as_bytes()) != claimed {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            format!("{at}: digest differs"),
        ));
    }
    Ok(())
}

fn parse_outcome(value: &Value) -> Result<()> {
    closed(value, &["passed", "total", "score", "cases"])?;
    let cases = list(&value["cases"], MAX_CASES)?;
    let mut passed = 0usize;
    for case in cases {
        closed(
            case,
            &[
                "id", "group", "outcome", "passed", "score", "receipt", "feedback",
            ],
        )?;
        text(&case["id"], 128)?;
        text(&case["group"], 128)?;
        one_of(&case["outcome"], &["complete", "failed", "uncertain"])?;
        if bool_field(&case["passed"])? {
            passed += 1;
        }
        finite(&case["score"], "case score")?;
        digest_opt(case, "receipt")?;
        if !case["feedback"].is_null() {
            text(&case["feedback"], 4096)?;
        }
    }
    let declared = integer(&value["passed"], 0, MAX_CASES)?;
    let total = integer(&value["total"], 0, MAX_CASES)?;
    finite(&value["score"], "outcome score")?;
    if total != cases.len() || declared != passed {
        return Err(Error::invalid("outcome totals differ from cases"));
    }
    Ok(())
}

pub fn parse_evaluation_evidence(value: &Value) -> Result<()> {
    bounded(value)?;
    closed(
        value,
        &[
            "contract",
            "baseArtifact",
            "candidateArtifact",
            "dataset",
            "evaluator",
            "usage",
            "charges",
            "outcomes",
            "independentReview",
            "claimCategory",
            "limitations",
            "digest",
        ],
    )?;
    if value["contract"] != EVALUATION_EVIDENCE_CONTRACT {
        return Err(Error::invalid("evaluation evidence contract"));
    }
    closed(
        &value["dataset"],
        &[
            "digest",
            "groups",
            "splitPolicy",
            "labelProvenance",
            "redactionPolicy",
        ],
    )?;
    digest_field(&value["dataset"], "digest")?;
    sorted_strings(&value["dataset"]["groups"], MAX_GROUPS, "dataset.groups")?;
    text(&value["dataset"]["splitPolicy"], 1024)?;
    text(&value["dataset"]["labelProvenance"], 1024)?;
    text(&value["dataset"]["redactionPolicy"], 1024)?;
    closed(
        &value["evaluator"],
        &["scorerDigest", "runtimeDigest", "routeDigest"],
    )?;
    digest_field(&value["evaluator"], "scorerDigest")?;
    digest_field(&value["evaluator"], "runtimeDigest")?;
    digest_opt(&value["evaluator"], "routeDigest")?;
    closed(
        &value["usage"],
        &["modelCalls", "tokensIn", "tokensOut", "units"],
    )?;
    for field in ["modelCalls", "tokensIn", "tokensOut"] {
        integer(&value["usage"][field], 0, MAX_INT)?;
    }
    text(&value["usage"]["units"], 128)?;
    closed(&value["charges"], &["reserved", "settled", "unit"])?;
    let reserved = finite(&value["charges"]["reserved"], "charges.reserved")?;
    let settled = finite(&value["charges"]["settled"], "charges.settled")?;
    text(&value["charges"]["unit"], 128)?;
    if settled > reserved {
        return Err(Error::invalid(
            "evaluation evidence charges: settled exceeds reserved",
        ));
    }
    closed(&value["outcomes"], &["train", "validation", "holdout"])?;
    for split in ["train", "validation", "holdout"] {
        parse_outcome(&value["outcomes"][split])?;
    }
    closed(
        &value["independentReview"],
        &["status", "reviewer", "notes"],
    )?;
    one_of(
        &value["independentReview"]["status"],
        &["not-reviewed", "reviewed", "rejected"],
    )?;
    if !value["independentReview"]["reviewer"].is_null() {
        text(&value["independentReview"]["reviewer"], 256)?;
    }
    if !value["independentReview"]["notes"].is_null() {
        text(&value["independentReview"]["notes"], 4096)?;
    }
    one_of(
        &value["claimCategory"],
        &[
            "mechanism",
            "replay",
            "qualified-boundary",
            "effectiveness",
            "activation",
        ],
    )?;
    sorted_strings(&value["limitations"], 32, "limitations")?;
    digest_field(value, "baseArtifact")?;
    digest_field(value, "candidateArtifact")?;
    signed(value, "evaluation evidence")
}

pub fn parse_host_profile(value: &Value) -> Result<()> {
    bounded(value)?;
    closed(
        value,
        &[
            "contract",
            "host",
            "runtime",
            "route",
            "limits",
            "usageUnits",
            "resultRetention",
            "uncertainEffectPolicy",
            "probes",
            "absentCapabilities",
            "digest",
        ],
    )?;
    if value["contract"] != HOST_PROFILE_CONTRACT {
        return Err(Error::invalid("host profile contract"));
    }
    closed(&value["host"], &["id", "kind", "version"])?;
    for field in ["id", "kind", "version"] {
        text(&value["host"][field], 128)?;
    }
    closed(
        &value["runtime"],
        &["runtimeDigest", "evaluatorDigest", "supportedContracts"],
    )?;
    digest_field(&value["runtime"], "runtimeDigest")?;
    digest_field(&value["runtime"], "evaluatorDigest")?;
    sorted_strings(
        &value["runtime"]["supportedContracts"],
        64,
        "supportedContracts",
    )?;
    closed(
        &value["route"],
        &["profileDigest", "scopeDigest", "accountScopeDigest"],
    )?;
    digest_field(&value["route"], "profileDigest")?;
    digest_field(&value["route"], "scopeDigest")?;
    digest_opt(&value["route"], "accountScopeDigest")?;
    closed(
        &value["limits"],
        &[
            "maxConcurrent",
            "maxQueue",
            "maxInputBytes",
            "maxOutputBytes",
            "maxWork",
        ],
    )?;
    for field in [
        "maxConcurrent",
        "maxQueue",
        "maxInputBytes",
        "maxOutputBytes",
        "maxWork",
    ] {
        integer(&value["limits"][field], 0, MAX_INT)?;
    }
    closed(&value["usageUnits"], &["name", "semantics"])?;
    text(&value["usageUnits"]["name"], 128)?;
    text(&value["usageUnits"]["semantics"], 1024)?;
    closed(
        &value["resultRetention"],
        &["mode", "maxBytes", "originalRetrieval"],
    )?;
    one_of(
        &value["resultRetention"]["mode"],
        &["none", "digest-only", "original"],
    )?;
    integer(&value["resultRetention"]["maxBytes"], 0, MAX_INT)?;
    bool_field(&value["resultRetention"]["originalRetrieval"])?;
    one_of(
        &value["uncertainEffectPolicy"],
        &["reconcile-required", "read-only", "unsupported"],
    )?;
    let probes = list(&value["probes"], MAX_PROBES)?;
    let mut previous: Option<&str> = None;
    for probe in probes {
        closed(probe, &["id", "status", "evidence"])?;
        let id = text(&probe["id"], 128)?;
        if previous.is_some_and(|p| p >= id) {
            return Err(Error::invalid("probes must be sorted by unique id"));
        }
        previous = Some(id);
        one_of(&probe["status"], &["passed", "failed", "not-run"])?;
        digest_opt(probe, "evidence")?;
    }
    sorted_strings(
        &value["absentCapabilities"],
        MAX_CAPABILITIES,
        "absentCapabilities",
    )?;
    signed(value, "host profile")
}

pub fn parse_promotion_decision(value: &Value) -> Result<()> {
    bounded(value)?;
    closed(
        value,
        &[
            "contract",
            "incumbent",
            "candidate",
            "evidence",
            "policy",
            "scope",
            "rollout",
            "reviewer",
            "rollback",
            "observedMetrics",
            "digest",
        ],
    )?;
    if value["contract"] != PROMOTION_DECISION_CONTRACT {
        return Err(Error::invalid("promotion decision contract"));
    }
    let incumbent = digest_field(value, "incumbent")?;
    let candidate = digest_field(value, "candidate")?;
    digest_field(value, "evidence")?;
    digest_field(value, "policy")?;
    closed(&value["scope"], &["environment", "tenant", "contact"])?;
    text(&value["scope"]["environment"], 128)?;
    for field in ["tenant", "contact"] {
        if !value["scope"][field].is_null() {
            text(&value["scope"][field], 256)?;
        }
    }
    closed(
        &value["rollout"],
        &["mode", "sampleLimit", "trafficLimit", "expiresAfter"],
    )?;
    one_of(&value["rollout"]["mode"], &["shadow", "canary", "active"])?;
    integer(&value["rollout"]["sampleLimit"], 0, MAX_INT)?;
    integer(&value["rollout"]["trafficLimit"], 0, MAX_INT)?;
    if !value["rollout"]["expiresAfter"].is_null() {
        integer(&value["rollout"]["expiresAfter"], 0, MAX_INT)?;
    }
    closed(&value["reviewer"], &["id", "status"])?;
    text(&value["reviewer"]["id"], 256)?;
    one_of(
        &value["reviewer"]["status"],
        &["approved", "rejected", "expired"],
    )?;
    closed(&value["rollback"], &["target", "compatibility", "reason"])?;
    digest_field(&value["rollback"], "target")?;
    digest_field(&value["rollback"], "compatibility")?;
    if !value["rollback"]["reason"].is_null() {
        text(&value["rollback"]["reason"], 1024)?;
    }
    let metrics = object(&value["observedMetrics"])?;
    if metrics.len() > MAX_METRICS {
        return Err(Error::limit("promotion decision metric count"));
    }
    for (name, metric) in metrics {
        if name.encode_utf16().count() > 128 {
            return Err(Error::invalid("metric name exceeds bound"));
        }
        finite(metric, "observed metric")?;
    }
    if incumbent == candidate {
        return Err(Error::invalid("promotion decision candidate must differ"));
    }
    signed(value, "promotion decision")
}

pub fn parse_host_lifecycle(value: &Value) -> Result<()> {
    bounded(value)?;
    closed(
        value,
        &[
            "contract",
            "owner",
            "generation",
            "state",
            "pendingIntent",
            "backlog",
            "heldAuthority",
            "usage",
            "receipt",
            "permittedOperatorActions",
            "digest",
        ],
    )?;
    if value["contract"] != HOST_LIFECYCLE_CONTRACT {
        return Err(Error::invalid("host lifecycle contract"));
    }
    text(&value["owner"], 256)?;
    integer(&value["generation"], 0, MAX_INT)?;
    let state = one_of(
        &value["state"],
        &[
            "ready",
            "running",
            "suspended",
            "uncertain",
            "settled",
            "failed",
            "stopped",
        ],
    )?;
    let pending = digest_opt(value, "pendingIntent")?;
    match (state, pending.is_some()) {
        ("uncertain", false) => {
            return Err(Error::invalid("uncertain state requires pendingIntent"));
        }
        ("ready" | "settled" | "failed" | "stopped", true) => {
            return Err(Error::invalid(
                "pendingIntent is only valid for running, suspended or uncertain state",
            ));
        }
        _ => (),
    }
    closed(&value["backlog"], &["queued", "active"])?;
    integer(&value["backlog"]["queued"], 0, MAX_INT)?;
    integer(&value["backlog"]["active"], 0, MAX_INT)?;
    sorted_strings(&value["heldAuthority"], MAX_CAPABILITIES, "heldAuthority")?;
    closed(&value["usage"], &["units", "charges", "unit"])?;
    finite(&value["usage"]["units"], "usage units")?;
    finite(&value["usage"]["charges"], "usage charges")?;
    text(&value["usage"]["unit"], 128)?;
    digest_opt(value, "receipt")?;
    let actions = list(&value["permittedOperatorActions"], MAX_ACTIONS)?;
    let mut previous: Option<&str> = None;
    for action in actions {
        let action = one_of(
            action,
            &[
                "inspect",
                "resume",
                "suspend",
                "reconcile",
                "drain",
                "rollback",
                "stop",
            ],
        )?;
        if previous.is_some_and(|p| p >= action) {
            return Err(Error::invalid(
                "permittedOperatorActions must be sorted and unique",
            ));
        }
        previous = Some(action);
    }
    signed(value, "host lifecycle")
}

/// Dispatch on the record's `contract` field.
pub fn verify(value: &Value) -> Result<()> {
    match value["contract"].as_str() {
        Some(EVALUATION_EVIDENCE_CONTRACT) => parse_evaluation_evidence(value),
        Some(HOST_PROFILE_CONTRACT) => parse_host_profile(value),
        Some(PROMOTION_DECISION_CONTRACT) => parse_promotion_decision(value),
        Some(HOST_LIFECYCLE_CONTRACT) => parse_host_lifecycle(value),
        _ => Err(Error::invalid("unknown host contract")),
    }
}
