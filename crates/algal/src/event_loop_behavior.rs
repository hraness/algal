//! Behavior-only pre-execution projection for the portable event-loop contract.
//! This is a conservative static read set, not a trace or an effect receipt.
use crate::{
    Error, Result,
    canonical::{canonical, digest},
};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};

fn error(code: &str) -> Error {
    Error::new(code, "invalid event-loop behavior")
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
fn number(value: &Value, min: usize, max: usize) -> Result<usize> {
    let n = value.as_f64().ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    if !n.is_finite() || n.fract() != 0.0 || n < min as f64 || n > max as f64 {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(n as usize)
}
fn list(value: &Value, min: usize, max: usize) -> Result<&Vec<Value>> {
    let items = value.as_array().ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    if items.len() < min || items.len() > max {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    Ok(items)
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
fn check_hash(value: &Map<String, Value>) -> Result<String> {
    let mut body = value.clone();
    body.remove("digest");
    let claimed = sha(&value["digest"])?;
    if claimed != digest(&Value::Object(body)).map_err(|_| error("EVENT_LOOP_BOUNDS"))? {
        return Err(error("EVENT_LOOP_DIGEST"));
    }
    Ok(claimed.to_owned())
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
        if initial
            && kind != "json"
            && !(match kind {
                "null" => field["initial"].is_null(),
                "boolean" => field["initial"].is_boolean(),
                "number" => field["initial"].is_number(),
                "string" => field["initial"].is_string(),
                _ => false,
            })
        {
            return Err(error("EVENT_LOOP_SCHEMA"));
        }
        fields.insert(name.to_owned(), kind.to_owned());
    }
    Ok(fields)
}
fn expression(value: &Value) -> Result<&Value> {
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
    let names = BTreeSet::from(["state".to_owned(), "event".to_owned()]);
    algal_expr::check_program(&value["program"], &names).map_err(|err| {
        error(match err.code {
            "EXPR_BOUNDS" => "EVENT_LOOP_BOUNDS",
            "EXPR_PATH" => "EVENT_LOOP_REFERENCE",
            _ => "EVENT_LOOP_SEMANTIC",
        })
    })?;
    Ok(&value["program"])
}

// A computed get head/path may access any declared field. Counting a shadowed
// binder as a possible state/event read overstates the set; it never omits one.
fn read_program(
    node: &Value,
    event: &str,
    fields: &BTreeMap<String, String>,
    events: &BTreeMap<String, BTreeMap<String, String>>,
    state_reads: &mut BTreeSet<String>,
    event_reads: &mut BTreeMap<String, BTreeSet<String>>,
) {
    match node {
        Value::Array(items) => {
            if items.first().and_then(Value::as_str) == Some("quote") {
                return;
            }
            if items.first().and_then(Value::as_str) == Some("get") {
                let head = items.get(1).and_then(Value::as_str);
                let path = items.get(2).and_then(Value::as_str);
                match head {
                    Some("state") => {
                        if let Some(field) = path {
                            if fields.contains_key(field) {
                                state_reads.insert(field.to_owned());
                            }
                        } else {
                            state_reads.extend(fields.keys().cloned());
                        }
                    }
                    Some("event") => {
                        let found = event_reads.entry(event.to_owned()).or_default();
                        if let Some(field) = path {
                            if events[event].contains_key(field) {
                                found.insert(field.to_owned());
                            }
                        } else {
                            found.extend(events[event].keys().cloned());
                        }
                    }
                    _ => {
                        state_reads.extend(fields.keys().cloned());
                        event_reads
                            .entry(event.to_owned())
                            .or_default()
                            .extend(events[event].keys().cloned());
                    }
                }
            }
            for child in items.iter().skip(1) {
                read_program(child, event, fields, events, state_reads, event_reads);
            }
        }
        Value::Object(items) => {
            for child in items.values() {
                read_program(child, event, fields, events, state_reads, event_reads);
            }
        }
        _ => {}
    }
}

/// Validate all actor declarations and expressions, then derive the selected
/// actor's possible reads, writes, notifications, pending outcomes and limits.
/// No trace, host effect or capability is needed or inferred.
pub fn summarize_event_loop_behavior(value: &Value, actor_value: &Value) -> Result<Value> {
    bounded(value)?;
    let root = closed(
        value,
        &[
            "contract", "behavior", "limits", "events", "actors", "digest",
        ],
    )?;
    if value["contract"] != "algal.event-loop.v1" {
        return Err(error("EVENT_LOOP_CONTRACT"));
    }
    let meta = closed(
        &value["behavior"],
        &["id", "revision", "sourceDigest", "digest"],
    )?;
    id(&value["behavior"]["id"])?;
    number(&value["behavior"]["revision"], 1, 2_147_483_647)?;
    sha(&value["behavior"]["sourceDigest"])?;
    check_hash(meta)?;
    let root_digest = check_hash(root)?;
    let actor = id(actor_value)?;
    let limits = closed(
        &value["limits"],
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
        number(&value["limits"][key], min, max)?;
    }
    let mut events = BTreeMap::new();
    for event in list(&value["events"], 1, 128)? {
        closed(event, &["id", "payload"])?;
        let name = id(&event["id"])?;
        if events.contains_key(name) {
            return Err(error("EVENT_LOOP_ID"));
        }
        events.insert(name.to_owned(), schema(&event["payload"], false)?);
    }
    let mut actors = BTreeMap::new();
    for declaration in list(&value["actors"], 1, 64)? {
        closed(declaration, &["id", "state", "transitions"])?;
        let name = id(&declaration["id"])?;
        if actors.insert(name.to_owned(), declaration).is_some() {
            return Err(error("EVENT_LOOP_ID"));
        }
    }
    if !actors.contains_key(actor) {
        return Err(error("EVENT_LOOP_REFERENCE"));
    }
    let mut inputs = BTreeSet::new();
    let mut state_reads = BTreeSet::new();
    let mut event_reads: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut writes = BTreeSet::new();
    let mut emits = BTreeSet::new();
    let mut pending = BTreeSet::new();
    // Stable refusal order does not depend on the actor list's input order.
    for (name, declaration) in &actors {
        let fields = schema(&declaration["state"], true)?;
        let mut initial = Map::new();
        for field in list(&declaration["state"]["fields"], 0, 64)? {
            initial.insert(id(&field["name"])?.to_owned(), field["initial"].clone());
        }
        if canonical(&Value::Object(initial))
            .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
            .len()
            > number(&value["limits"]["maxStateBytes"], 1, 262_144)?
        {
            return Err(error("EVENT_LOOP_BOUNDS"));
        }
        let selected = name == actor;
        let mut names = BTreeSet::new();
        for transition in list(&declaration["transitions"], 1, 256)? {
            closed(
                transition,
                &["id", "on", "when", "writes", "outputs", "result"],
            )?;
            if !names.insert(id(&transition["id"])?) {
                return Err(error("EVENT_LOOP_ID"));
            }
            let on = id(&transition["on"])?;
            if !events.contains_key(on) {
                return Err(error("EVENT_LOOP_REFERENCE"));
            }
            if selected {
                inputs.insert(on.to_owned());
            }
            if !transition["when"].is_null() {
                let program = expression(&transition["when"])?;
                if selected {
                    read_program(
                        program,
                        on,
                        &fields,
                        &events,
                        &mut state_reads,
                        &mut event_reads,
                    );
                }
            }
            let mut written = BTreeSet::new();
            for write in list(&transition["writes"], 0, 64)? {
                closed(write, &["path", "value"])?;
                let path = list(&write["path"], 1, 1)?;
                let field = id(&path[0])?;
                if !fields.contains_key(field) {
                    return Err(error("EVENT_LOOP_REFERENCE"));
                }
                if !written.insert(field) {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
                if selected {
                    writes.insert(field.to_owned());
                }
                let program = expression(&write["value"])?;
                if selected {
                    read_program(
                        program,
                        on,
                        &fields,
                        &events,
                        &mut state_reads,
                        &mut event_reads,
                    );
                }
            }
            let outputs = list(
                &transition["outputs"],
                0,
                number(&value["limits"]["maxOutputEvents"], 0, 64)?,
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
                let emitted = id(&output["event"])?;
                if !events.contains_key(emitted) {
                    return Err(error("EVENT_LOOP_REFERENCE"));
                }
                if selected {
                    emits.insert(emitted.to_owned());
                }
                let program = expression(&output["payload"])?;
                if selected {
                    read_program(
                        program,
                        on,
                        &fields,
                        &events,
                        &mut state_reads,
                        &mut event_reads,
                    );
                }
            }
            let outcome = transition["result"]["kind"].as_str().unwrap_or("");
            closed(
                &transition["result"],
                match outcome {
                    "defer" => &["kind", "key"],
                    "escalate" => &["kind", "request"],
                    _ => &["kind"],
                },
            )?;
            if !["continue", "quiet", "defer", "escalate"].contains(&outcome)
                || outcome != "continue" && !outputs.is_empty()
                || ["defer", "escalate"].contains(&outcome) && !written.is_empty()
            {
                return Err(error("EVENT_LOOP_SEMANTIC"));
            }
            if outcome == "defer" || outcome == "escalate" {
                let program = expression(
                    &transition["result"][if outcome == "defer" { "key" } else { "request" }],
                )?;
                if selected {
                    pending.insert(outcome.to_owned());
                    read_program(
                        program,
                        on,
                        &fields,
                        &events,
                        &mut state_reads,
                        &mut event_reads,
                    );
                }
            }
        }
    }
    // The source behavior bounds input types to 128, event fields to 64 per
    // type, state fields to 64, and pending kinds to two. No host capability
    // can be inferred from a pure behavior or a pending request.
    let event_fields: Vec<Value> = event_reads
        .into_iter()
        .map(|(event, fields)| json!({"event":event,"fields":fields}))
        .collect();
    let summary = json!({
        "actor":actor, "inputEventTypes":inputs,
        "reads":{"stateFields":state_reads,"eventFields":event_fields},
        "writes":writes,"emits":emits,"pendingOutcomes":pending,
        "capabilities":[],"limits":Value::Object(limits.clone()),
    });
    if canonical(&summary)
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len()
        > 1_048_576
    {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    let summary_digest = digest(&summary).map_err(|_| error("EVENT_LOOP_BOUNDS"))?;
    Ok(json!({"digest":root_digest,"summary":summary,"summaryDigest":summary_digest}))
}
