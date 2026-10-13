//! P1 trace shape/identity admission. No behavior evaluation or host effects.
use crate::{
    Error, Result,
    canonical::{canonical, digest},
};
use serde_json::{Map, Value, json};
use std::collections::BTreeMap;

const MAX_TRACE_BYTES: usize = 1_048_576;
fn error(code: &str) -> Error {
    Error::new(code, "invalid event-loop trace")
}
fn closed<'a>(value: &'a Value, keys: &[&str]) -> Result<&'a Map<String, Value>> {
    let row = value.as_object().ok_or_else(|| error("EVENT_LOOP_PARSE"))?;
    if row.keys().any(|key| !keys.contains(&key.as_str())) {
        return Err(error("EVENT_LOOP_UNKNOWN_KEY"));
    }
    if keys.iter().any(|key| !row.contains_key(*key)) {
        return Err(error("EVENT_LOOP_PARSE"));
    }
    Ok(row)
}
fn id(value: &Value) -> Result<&str> {
    let s = value.as_str().ok_or_else(|| error("EVENT_LOOP_ID"))?;
    if s.is_empty()
        || s.len() > 64
        || s.split('-').any(|part| {
            part.is_empty()
                || !part
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
        })
    {
        return Err(error("EVENT_LOOP_ID"));
    }
    Ok(s)
}
fn sha(value: &Value) -> Result<&str> {
    let text = value.as_str().ok_or_else(|| error("EVENT_LOOP_DIGEST"))?;
    if text.len() != 71
        || !text.starts_with("sha256:")
        || !text[7..]
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err(error("EVENT_LOOP_DIGEST"));
    }
    Ok(text)
}
fn number(value: &Value, min: usize, max: usize) -> Result<usize> {
    let n = value.as_f64().ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    if !n.is_finite() || n.fract() != 0.0 || n < min as f64 || n > max as f64 {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(n as usize)
}
fn list(value: &Value, min: usize, max: usize) -> Result<&Vec<Value>> {
    let values = value.as_array().ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    if values.len() < min || values.len() > max {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(values)
}
fn tag<'a>(value: &'a Value, choices: &[&str]) -> Result<&'a str> {
    let s = value
        .as_str()
        .filter(|s| choices.contains(s))
        .ok_or_else(|| error("EVENT_LOOP_SEMANTIC"))?;
    Ok(s)
}
fn payload(value: &Value) -> Result<()> {
    fn visit(value: &Value, depth: usize) -> Result<()> {
        if depth > 32 {
            return Err(error("EVENT_LOOP_BOUNDS"));
        }
        match value {
            Value::String(s) if s.len() > 65_536 => Err(error("EVENT_LOOP_BOUNDS")),
            Value::Number(n) if n.as_f64().is_none_or(|n| !n.is_finite()) => {
                Err(error("EVENT_LOOP_PARSE"))
            }
            Value::Array(items) => {
                if depth == 32 || items.len() > 1_024 {
                    return Err(error("EVENT_LOOP_BOUNDS"));
                }
                for item in items {
                    visit(item, depth + 1)?;
                }
                Ok(())
            }
            Value::Object(items) => {
                if depth == 32 || items.len() > 256 || items.keys().any(|key| key.len() > 65_536) {
                    return Err(error("EVENT_LOOP_BOUNDS"));
                }
                for item in items.values() {
                    visit(item, depth + 1)?;
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }
    visit(value, 0)?;
    if canonical(value)
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len()
        > 262_144
    {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(())
}
fn equal_hash(value: &Value, expected: &Value) -> Result<()> {
    if sha(expected)? != digest(value).map_err(|_| error("EVENT_LOOP_BOUNDS"))? {
        return Err(error("EVENT_LOOP_DIGEST"));
    }
    Ok(())
}
fn resources(value: &Value, max_fuel: usize, max_state: usize, max_output: usize) -> Result<usize> {
    closed(value, &["fuel", "stateBytes", "outputEvents"])?;
    number(&value["fuel"], 0, max_fuel)?;
    number(&value["stateBytes"], 0, max_state)?;
    number(&value["outputEvents"], 0, max_output)
}
fn remember_state(sizes: &mut BTreeMap<String, usize>, state: &str, size: usize) -> Result<()> {
    if sizes.get(state).is_some_and(|previous| *previous != size) {
        return Err(error("EVENT_LOOP_SEMANTIC"));
    }
    sizes.insert(state.to_owned(), size);
    Ok(())
}

/// Checks a trace's closed shape, digests, bounded summaries and event-key
/// binding. Does not check the behavior schema, transition replay or effects.
pub fn parse_event_loop_trace(value: &Value) -> Result<String> {
    let root = closed(
        value,
        &[
            "contract", "behavior", "actor", "limits", "entries", "digest",
        ],
    )?;
    if value["contract"] != "algal.event-loop.trace.v1" {
        return Err(error("EVENT_LOOP_CONTRACT"));
    }
    let behavior = sha(&value["behavior"])?;
    let actor = id(&value["actor"])?;
    closed(
        &value["limits"],
        &[
            "maxEventBytes",
            "maxStateBytes",
            "maxOutputEvents",
            "maxTransitionFuel",
            "maxMailboxDepth",
        ],
    )?;
    let limits = &value["limits"];
    let max_event = number(&limits["maxEventBytes"], 1, 65_536)?;
    let max_state = number(&limits["maxStateBytes"], 1, 262_144)?;
    let max_output = number(&limits["maxOutputEvents"], 0, 64)?;
    let max_fuel = number(&limits["maxTransitionFuel"], 1, 100_000)?;
    let max_mailbox = number(&limits["maxMailboxDepth"], 1, 1_024)?;
    let entries = list(&value["entries"], 1, 256)?;
    let mut bound = BTreeMap::new();
    // One state per entry at most, so this map has at most 256 keys.
    let mut state_sizes = BTreeMap::new();
    let mut last_state: Option<(&str, usize)> = None;
    for entry in entries {
        closed(
            entry,
            &[
                "source",
                "sequence",
                "type",
                "payload",
                "delivery",
                "eventDigest",
                "messageDigest",
                "depthBefore",
                "decision",
            ],
        )?;
        let source = id(&entry["source"])?;
        let sequence = number(&entry["sequence"], 0, 2_147_483_647)?;
        let kind = id(&entry["type"])?;
        payload(&entry["payload"])?;
        let delivery = id(&entry["delivery"])?;
        if canonical(
            &json!({"source":source,"sequence":sequence,"type":kind,"payload":entry["payload"]}),
        )
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len()
            > max_event
        {
            return Err(error("EVENT_LOOP_BOUNDS"));
        }
        equal_hash(
            &json!({"behavior":behavior,"actor":actor,"source":source,"sequence":sequence,"type":kind,"payload":entry["payload"]}),
            &entry["eventDigest"],
        )?;
        equal_hash(
            &json!({"event":entry["eventDigest"],"target":actor,"delivery":delivery}),
            &entry["messageDigest"],
        )?;
        let depth = number(&entry["depthBefore"], 0, max_mailbox)?;
        let key = (source.to_owned(), sequence);
        let content = canonical(&json!({"type":kind,"payload":entry["payload"]}))
            .map_err(|_| error("EVENT_LOOP_BOUNDS"))?;
        let previous = bound.get(&key);
        if previous.is_some_and(|old| old != &content) {
            return Err(error("EVENT_LOOP_ID"));
        }
        let decision = &entry["decision"];
        let keys: &[&str] = match decision.get("kind").and_then(Value::as_str) {
            Some("accepted")
                if matches!(decision["outcome"].as_str(), Some("defer" | "escalate"))
                    && decision.get("pending").is_some() =>
            {
                &[
                    "kind",
                    "transition",
                    "outcome",
                    "stateDigest",
                    "outputs",
                    "effects",
                    "resources",
                    "pending",
                ]
            }
            Some("accepted") => &[
                "kind",
                "transition",
                "outcome",
                "stateDigest",
                "outputs",
                "effects",
                "resources",
            ],
            Some("failed") => &["kind", "reason", "transition", "stateDigest", "resources"],
            Some("backpressure") => &["kind", "policy", "reason"],
            _ => &["kind"],
        };
        closed(decision, keys)?;
        match tag(
            &decision["kind"],
            &["accepted", "duplicate", "backpressure", "failed"],
        )? {
            "duplicate" => {
                if previous.is_none() {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
            }
            "backpressure" => {
                if previous.is_some() || depth != max_mailbox {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                tag(&decision["policy"], &["reject", "defer", "quarantine"])?;
                id(&decision["reason"])?;
            }
            "failed" => {
                if previous.is_some() || depth == max_mailbox {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                tag(
                    &decision["reason"],
                    &[
                        "fuel-exhausted",
                        "expression-error",
                        "state-overflow",
                        "output-invalid",
                    ],
                )?;
                if !decision["transition"].is_null() {
                    id(&decision["transition"])?;
                }
                let state = sha(&decision["stateDigest"])?;
                let output_events =
                    resources(&decision["resources"], max_fuel, max_state, max_output)?;
                let state_bytes = number(&decision["resources"]["stateBytes"], 0, max_state)?;
                if output_events != 0
                    || last_state.is_some_and(|(old, size)| old != state || size != state_bytes)
                {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                remember_state(&mut state_sizes, state, state_bytes)?;
                bound.insert(key, content);
            }
            _ => {
                if previous.is_some() || depth == max_mailbox {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                let outcome = tag(
                    &decision["outcome"],
                    &["continue", "quiet", "defer", "escalate", "no-transition"],
                )?;
                if outcome == "no-transition" {
                    if !decision["transition"].is_null() {
                        return Err(error("EVENT_LOOP_SEMANTIC"));
                    }
                } else {
                    id(&decision["transition"])?;
                }
                if let Some(pending) = decision.get("pending") {
                    // Legacy shape-only pending records may omit the witness;
                    // replay refuses them. Limit a supplied value separately.
                    payload(pending)?;
                    if canonical(pending)
                        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
                        .len()
                        > 16_384
                    {
                        return Err(error("EVENT_LOOP_BOUNDS"));
                    }
                }
                let state = sha(&decision["stateDigest"])?;
                let outputs = list(&decision["outputs"], 0, max_output)?;
                for output in outputs {
                    sha(output)?;
                }
                let effects = &decision["effects"];
                closed(effects, &["requested", "settled", "receipts"])?;
                let requested = number(&effects["requested"], 0, 64)?;
                let settled = number(&effects["settled"], 0, requested)?;
                for receipt in list(&effects["receipts"], settled, settled)? {
                    sha(receipt)?;
                }
                // P0 transitions are pure. Notifications are data, and pending
                // requests do not establish external effect completion.
                if requested != 0 {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                let output_events =
                    resources(&decision["resources"], max_fuel, max_state, max_output)?;
                let state_bytes = number(&decision["resources"]["stateBytes"], 0, max_state)?;
                if output_events != outputs.len() {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                if matches!(outcome, "quiet" | "defer" | "escalate" | "no-transition")
                    && !outputs.is_empty()
                    || matches!(outcome, "defer" | "escalate" | "no-transition") && requested > 0
                    || matches!(outcome, "defer" | "escalate" | "no-transition")
                        && last_state.is_some_and(|(old, _)| old != state)
                {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                remember_state(&mut state_sizes, state, state_bytes)?;
                last_state = Some((state, state_bytes));
                bound.insert(key, content);
            }
        }
    }
    if canonical(value)
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len()
        > MAX_TRACE_BYTES
    {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    let mut body = root.clone();
    body.remove("digest");
    equal_hash(&Value::Object(body), &value["digest"])?;
    Ok(sha(&value["digest"])?.to_owned())
}

/// Derived counts from validated trace claims, never measured execution or host effects.
#[derive(Debug, Default, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventLoopTraceSummary {
    pub accepted: usize,
    pub duplicate: usize,
    pub backpressure: usize,
    pub failed: usize,
    pub continued: usize,
    pub quiet: usize,
    pub deferred: usize,
    pub escalated: usize,
    pub unmatched: usize,
    pub fuel_claimed: usize,
    pub peak_state_bytes_claimed: usize,
    pub notifications_claimed: usize,
    pub effects_requested_claimed: usize,
    pub effects_settled_claimed: usize,
}

/// Validate first, then sum only the checked values. Counts cannot overflow:
/// at most 256 entries, 100,000 fuel and 64 notifications per entry.
pub fn summarize_event_loop_trace(value: &Value) -> Result<(String, EventLoopTraceSummary)> {
    let identity = parse_event_loop_trace(value)?;
    let mut summary = EventLoopTraceSummary::default();
    for entry in value["entries"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
    {
        let decision = &entry["decision"];
        match decision["kind"].as_str() {
            Some("duplicate") => summary.duplicate += 1,
            Some("backpressure") => summary.backpressure += 1,
            Some("accepted") | Some("failed") => {
                if decision["kind"] == "accepted" {
                    summary.accepted += 1;
                    match decision["outcome"].as_str() {
                        Some("continue") => summary.continued += 1,
                        Some("quiet") => summary.quiet += 1,
                        Some("defer") => summary.deferred += 1,
                        Some("escalate") => summary.escalated += 1,
                        Some("no-transition") => summary.unmatched += 1,
                        _ => unreachable!("validated outcome"),
                    }
                    summary.effects_requested_claimed +=
                        number(&decision["effects"]["requested"], 0, 64)?;
                    summary.effects_settled_claimed +=
                        number(&decision["effects"]["settled"], 0, 64)?;
                } else {
                    summary.failed += 1;
                }
                let resources = &decision["resources"];
                summary.fuel_claimed += number(&resources["fuel"], 0, 100_000)?;
                summary.peak_state_bytes_claimed = summary.peak_state_bytes_claimed.max(number(
                    &resources["stateBytes"],
                    0,
                    262_144,
                )?);
                summary.notifications_claimed += number(&resources["outputEvents"], 0, 64)?;
            }
            _ => unreachable!("validated decision"),
        }
    }
    Ok((identity, summary))
}
