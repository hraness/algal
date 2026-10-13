//! P1 structural behavior/trace join. No expression execution or host effects.
use crate::{
    Error, Result,
    canonical::{canonical, digest},
    event_loop_contract::parse_event_loop_trace,
};
use serde_json::{Map, Value};
use std::collections::{BTreeMap, BTreeSet};

fn error(code: &str) -> Error {
    Error::new(code, "invalid event-loop structure")
}
fn closed<'a>(value: &'a Value, keys: &[&str]) -> Result<&'a Map<String, Value>> {
    let obj = value.as_object().ok_or_else(|| error("EVENT_LOOP_PARSE"))?;
    if obj.keys().any(|key| !keys.contains(&key.as_str())) {
        return Err(error("EVENT_LOOP_UNKNOWN_KEY"));
    }
    if keys.iter().any(|key| !obj.contains_key(*key)) {
        return Err(error("EVENT_LOOP_PARSE"));
    }
    Ok(obj)
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
    let s = value.as_str().ok_or_else(|| error("EVENT_LOOP_DIGEST"))?;
    if s.len() != 71
        || !s.starts_with("sha256:")
        || !s[7..]
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err(error("EVENT_LOOP_DIGEST"));
    }
    Ok(s)
}
fn number(value: &Value, min: u64, max: u64) -> Result<u64> {
    let n = value.as_f64().ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    if !n.is_finite() || n.fract() != 0.0 || n < min as f64 || n > max as f64 {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(n as u64)
}
fn list(value: &Value, min: usize, max: usize) -> Result<&Vec<Value>> {
    let items = value.as_array().ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    if items.len() < min || items.len() > max {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(items)
}
fn hash(value: &Value, claimed: &Value) -> Result<()> {
    if sha(claimed)? != digest(value).map_err(|_| error("EVENT_LOOP_BOUNDS"))? {
        return Err(error("EVENT_LOOP_DIGEST"));
    }
    Ok(())
}
fn bounded(value: &Value) -> Result<()> {
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
        > 1_048_576
    {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(())
}
fn typed(value: &Value, kind: &str) -> Result<()> {
    if match kind {
        "json" => true,
        "null" => value.is_null(),
        "boolean" => value.is_boolean(),
        "number" => value.is_number(),
        "string" => value.is_string(),
        _ => false,
    } {
        Ok(())
    } else {
        Err(error("EVENT_LOOP_SCHEMA"))
    }
}
fn schema(value: &Value, initial: bool) -> Result<BTreeMap<String, String>> {
    closed(value, &["kind", "fields"])?;
    if value["kind"] != "record" {
        return Err(error("EVENT_LOOP_SCHEMA"));
    }
    let mut fields = BTreeMap::new();
    for field in list(&value["fields"], 0, 64)? {
        closed(
            field,
            if initial {
                &["name", "type", "initial"]
            } else {
                &["name", "type"]
            },
        )?;
        let name = id(&field["name"])?;
        if fields.contains_key(name) {
            return Err(error("EVENT_LOOP_ID"));
        }
        let kind = field["type"]
            .as_str()
            .ok_or_else(|| error("EVENT_LOOP_SCHEMA"))?;
        if !["null", "boolean", "number", "string", "json"].contains(&kind) {
            return Err(error("EVENT_LOOP_SCHEMA"));
        }
        if initial {
            typed(&field["initial"], kind)?;
        }
        fields.insert(name.to_owned(), kind.to_owned());
    }
    Ok(fields)
}
fn expression(value: &Value) -> Result<()> {
    closed(value, &["contract", "program"])?;
    if value["contract"] != "algal.expr.v1" {
        return Err(error("EVENT_LOOP_CONTRACT"));
    }
    if canonical(value)
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len()
        > 16_384
    {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(()) // Grammar and fuel are checked by expression replay, not this join.
}
#[derive(Debug, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventLoopStaticSummary {
    pub events: usize,
    pub transitions: usize,
    pub writes: usize,
    pub notifications: usize,
    pub deferrals: usize,
    pub escalations: usize,
}
struct Transition {
    on: String,
    result: String,
    outputs: usize,
    writes: usize,
    unconditional: bool,
}

/// Bind claimed decisions to a checked behavior's event schemas, transition
/// declarations and output counts. Not an evaluator or execution receipt.
pub fn verify_event_loop_trace_structure(
    trace: &Value,
    behavior: &Value,
) -> Result<(String, EventLoopStaticSummary)> {
    let trace_digest = parse_event_loop_trace(trace)?;
    bounded(behavior)?;
    let root = closed(
        behavior,
        &[
            "contract", "behavior", "limits", "events", "actors", "digest",
        ],
    )?;
    if behavior["contract"] != "algal.event-loop.v1" {
        return Err(error("EVENT_LOOP_CONTRACT"));
    }
    let meta = closed(
        &behavior["behavior"],
        &["id", "revision", "sourceDigest", "digest"],
    )?;
    id(&behavior["behavior"]["id"])?;
    number(&behavior["behavior"]["revision"], 1, 2_147_483_647)?;
    sha(&behavior["behavior"]["sourceDigest"])?;
    let mut without_digest = meta.clone();
    without_digest.remove("digest");
    hash(
        &Value::Object(without_digest),
        &behavior["behavior"]["digest"],
    )?;
    let mut without_digest = root.clone();
    without_digest.remove("digest");
    hash(&Value::Object(without_digest), &behavior["digest"])?;
    if sha(&trace["behavior"])? != sha(&behavior["digest"])? {
        return Err(error("EVENT_LOOP_DIGEST"));
    }
    let limits = closed(
        &behavior["limits"],
        &[
            "maxEventBytes",
            "maxStateBytes",
            "maxOutputEvents",
            "maxTransitionFuel",
            "maxMailboxDepth",
        ],
    )?;
    for (key, min, max) in [
        ("maxEventBytes", 1, 65_536),
        ("maxStateBytes", 1, 262_144),
        ("maxOutputEvents", 0, 64),
        ("maxTransitionFuel", 1, 100_000),
        ("maxMailboxDepth", 1, 1_024),
    ] {
        number(&behavior["limits"][key], min, max)?;
    }
    if Value::Object(limits.clone()) != trace["limits"] {
        return Err(error("EVENT_LOOP_SEMANTIC"));
    }
    let mut events = BTreeMap::new();
    for event in list(&behavior["events"], 1, 128)? {
        closed(event, &["id", "payload"])?;
        let name = id(&event["id"])?;
        if events
            .insert(name.to_owned(), schema(&event["payload"], false)?)
            .is_some()
        {
            return Err(error("EVENT_LOOP_ID"));
        }
    }
    let mut actors = BTreeMap::new();
    for actor in list(&behavior["actors"], 1, 64)? {
        closed(actor, &["id", "state", "transitions"])?;
        let name = id(&actor["id"])?;
        if actors.insert(name.to_owned(), actor).is_some() {
            return Err(error("EVENT_LOOP_ID"));
        }
    }
    let current = actors
        .get(id(&trace["actor"])?)
        .ok_or_else(|| error("EVENT_LOOP_REFERENCE"))?;
    let state = schema(&current["state"], true)?;
    let mut initial = Map::new();
    for field in list(&current["state"]["fields"], 0, 64)? {
        initial.insert(id(&field["name"])?.to_owned(), field["initial"].clone());
    }
    let initial = Value::Object(initial);
    let initial_bytes = canonical(&initial)
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len() as u64;
    if initial_bytes > number(&behavior["limits"]["maxStateBytes"], 1, 262_144)? {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    let initial_digest = digest(&initial).map_err(|_| error("EVENT_LOOP_BOUNDS"))?;
    let mut transitions = BTreeMap::new();
    let mut summary = EventLoopStaticSummary {
        events: events.len(),
        ..Default::default()
    };
    for rule in list(&current["transitions"], 1, 256)? {
        closed(rule, &["id", "on", "when", "writes", "outputs", "result"])?;
        let name = id(&rule["id"])?;
        if transitions.contains_key(name) {
            return Err(error("EVENT_LOOP_ID"));
        }
        let on = id(&rule["on"])?;
        if !events.contains_key(on) {
            return Err(error("EVENT_LOOP_REFERENCE"));
        }
        if !rule["when"].is_null() {
            expression(&rule["when"])?;
        }
        let mut written = BTreeSet::new();
        for write in list(&rule["writes"], 0, 64)? {
            closed(write, &["path", "value"])?;
            let path = list(&write["path"], 1, 1)?;
            let field = id(&path[0])?;
            if !state.contains_key(field) {
                return Err(error("EVENT_LOOP_REFERENCE"));
            }
            if !written.insert(field) {
                return Err(error("EVENT_LOOP_SEMANTIC"));
            }
            expression(&write["value"])?;
            summary.writes += 1;
        }
        let outputs = list(
            &rule["outputs"],
            0,
            number(&behavior["limits"]["maxOutputEvents"], 0, 64)? as usize,
        )?;
        for output in outputs {
            closed(output, &["kind", "target", "event", "payload"])?;
            if output["kind"] != "notify" {
                return Err(error("EVENT_LOOP_SEMANTIC"));
            }
            let target = id(&output["target"])?;
            if target != "self" && !actors.contains_key(target) {
                return Err(error("EVENT_LOOP_REFERENCE"));
            }
            if !events.contains_key(id(&output["event"])?) {
                return Err(error("EVENT_LOOP_REFERENCE"));
            }
            expression(&output["payload"])?;
            summary.notifications += 1;
        }
        let outcome = rule["result"]["kind"].as_str().unwrap_or("");
        closed(
            &rule["result"],
            match outcome {
                "defer" => &["kind", "key"],
                "escalate" => &["kind", "request"],
                _ => &["kind"],
            },
        )?;
        if !["continue", "quiet", "defer", "escalate"].contains(&outcome)
            || outcome != "continue" && !outputs.is_empty()
            || ["defer", "escalate"].contains(&outcome) && !list(&rule["writes"], 0, 64)?.is_empty()
        {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
        if outcome == "defer" {
            expression(&rule["result"]["key"])?;
            summary.deferrals += 1;
        }
        if outcome == "escalate" {
            expression(&rule["result"]["request"])?;
            summary.escalations += 1;
        }
        transitions.insert(
            name.to_owned(),
            Transition {
                on: on.to_owned(),
                result: outcome.to_owned(),
                outputs: outputs.len(),
                writes: written.len(),
                unconditional: rule["when"].is_null(),
            },
        );
        summary.transitions += 1;
    }
    let mut committed = false;
    let mut last_digest = initial_digest.clone();
    let mut last_bytes = initial_bytes;
    for entry in list(&trace["entries"], 1, 256)? {
        let event = id(&entry["type"])?;
        let fields = events
            .get(event)
            .ok_or_else(|| error("EVENT_LOOP_REFERENCE"))?;
        let keys: Vec<&str> = fields.keys().map(String::as_str).collect();
        closed(&entry["payload"], &keys)?;
        for (name, kind) in fields {
            typed(&entry["payload"][name], kind)?;
        }
        let decision = &entry["decision"];
        if decision["kind"] == "duplicate" || decision["kind"] == "backpressure" {
            continue;
        }
        let selected = if decision["transition"].is_null() {
            None
        } else {
            let rule = transitions
                .get(id(&decision["transition"])?)
                .ok_or_else(|| error("EVENT_LOOP_REFERENCE"))?;
            if rule.on != event {
                return Err(error("EVENT_LOOP_REFERENCE"));
            }
            Some(rule)
        };
        // A named selection cannot skip a lexically earlier unconditional
        // rule, including when evaluation then fails. Null selection may fail
        // before choosing; guards and actual failures still require replay.
        if decision["transition"].as_str().is_some_and(|chosen| {
            transitions.iter().any(|(name, rule)| {
                rule.on == event && rule.unconditional && name.as_str() < chosen
            })
        }) {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
        // Until the first committed transition, failure and pending/unmatched
        // decisions must preserve the behavior's declared initial state.
        if !committed
            && (decision["kind"] == "failed"
                || ["defer", "escalate", "no-transition"]
                    .contains(&decision["outcome"].as_str().unwrap_or("")))
            && (decision["stateDigest"] != initial_digest
                || decision["resources"]["stateBytes"] != initial_bytes)
        {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
        if decision["kind"] == "failed" {
            continue;
        }
        if decision["outcome"] == "no-transition" {
            if transitions
                .values()
                .any(|rule| rule.on == event && rule.unconditional)
            {
                return Err(error("EVENT_LOOP_SEMANTIC"));
            }
        } else if selected.is_none_or(|rule| {
            decision["outcome"] != rule.result
                || decision["outputs"]
                    .as_array()
                    .is_none_or(|outputs| outputs.len() != rule.outputs)
        }) {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
        if decision["outcome"] == "continue" || decision["outcome"] == "quiet" {
            // A rule without state writes must preserve the prior state.
            if selected.is_some_and(|rule| rule.writes == 0)
                && (decision["stateDigest"] != last_digest
                    || decision["resources"]["stateBytes"] != last_bytes)
            {
                return Err(error("EVENT_LOOP_SEMANTIC"));
            }
            last_digest = sha(&decision["stateDigest"])?.to_owned();
            last_bytes = number(&decision["resources"]["stateBytes"], 0, 262_144)?;
            committed = true;
        }
    }
    Ok((trace_digest, summary))
}
