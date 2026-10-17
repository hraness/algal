//! Deterministic replay of successful and failed event-loop decisions. Host
//! evidence is not inferred from a checked digest. Pending outcomes require
//! checked evaluated values, but do not attest delivery of a host request.
use crate::{
    Error, Result,
    canonical::{canonical, digest},
    event_loop_contract::{EventLoopTraceSummary, summarize_event_loop_trace},
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};

fn error(code: &str) -> Error {
    Error::new(code, "invalid event-loop replay")
}
fn bytes(value: &Value) -> Result<usize> {
    Ok(canonical(value)
        .map_err(|_| error("EVENT_LOOP_BOUNDS"))?
        .len())
}
fn hash(value: &Value) -> Result<String> {
    digest(value).map_err(|_| error("EVENT_LOOP_BOUNDS"))
}
fn typed(value: &Value, kind: &str) -> bool {
    match kind {
        "json" => true,
        "null" => value.is_null(),
        "boolean" => value.is_boolean(),
        "number" => value.is_number(),
        "string" => value.is_string(),
        _ => false,
    }
}
fn record(value: &Value, fields: &BTreeMap<String, String>) -> bool {
    value.as_object().is_some_and(|obj| {
        obj.len() == fields.len()
            && fields
                .iter()
                .all(|(name, kind)| obj.get(name).is_some_and(|value| typed(value, kind)))
    })
}

/// Digest one notification bound to its parent delivery, rule and ordinal.
/// Only ordinals 0..64 are allowed; a digest is not an external delivery proof.
pub fn event_loop_notification_digest(
    parent: &str,
    transition: &str,
    ordinal: usize,
    target: &str,
    kind: &str,
    payload: &Value,
) -> Result<String> {
    if ordinal >= 64 {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    hash(
        &json!({"parent":parent, "transition":transition, "ordinal":ordinal,
        "target":target, "type":kind, "payload":payload}),
    )
}
fn notification_bytes(
    parent: &str,
    transition: &str,
    ordinal: usize,
    target: &str,
    kind: &str,
    payload: &Value,
) -> Result<usize> {
    if ordinal >= 64 {
        return Err(error("EVENT_LOOP_BOUNDS"));
    }
    bytes(
        &json!({"parent":parent, "transition":transition, "ordinal":ordinal,
        "target":target, "type":kind, "payload":payload}),
    )
}
fn check_expr(expr: &Value, names: &BTreeSet<String>) -> Result<()> {
    if expr.is_null() {
        return Ok(());
    }
    algal_expr::check_program(&expr["program"], names).map_err(|err| {
        error(match err.code {
            "EXPR_BOUNDS" => "EVENT_LOOP_BOUNDS",
            "EXPR_PATH" => "EVENT_LOOP_REFERENCE",
            _ => "EVENT_LOOP_SEMANTIC",
        })
    })
}
fn evaluate(expr: &Value, env: &Map<String, Value>, spent: &mut u64, limit: u64) -> Result<Value> {
    let left = limit
        .checked_sub(*spent)
        .ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    match algal_expr::run(&expr["program"], env, left) {
        Ok((value, fuel)) => {
            *spent += fuel;
            Ok(value)
        }
        Err((err, _)) => Err(error(if err.code == "EXPR_FUEL" {
            "EVENT_LOOP_BOUNDS"
        } else {
            "EVENT_LOOP_SEMANTIC"
        })),
    }
}

struct Failure {
    reason: &'static str,
    transition: Option<String>,
    fuel: u64,
}
fn failure(reason: &'static str, selected: Option<&Value>, fuel: u64) -> Failure {
    Failure {
        reason,
        transition: selected
            .and_then(|rule| rule["id"].as_str())
            .map(str::to_owned),
        fuel,
    }
}
fn evaluate_failure(
    expr: &Value,
    env: &Map<String, Value>,
    spent: &mut u64,
    limit: u64,
) -> std::result::Result<Value, &'static str> {
    let left = limit.checked_sub(*spent).ok_or("fuel-exhausted")?;
    match algal_expr::run(&expr["program"], env, left) {
        Ok((value, fuel)) => {
            *spent += fuel;
            Ok(value)
        }
        Err((err, fuel)) => {
            *spent += fuel;
            Err(if err.code == "EXPR_FUEL" {
                "fuel-exhausted"
            } else {
                "expression-error"
            })
        }
    }
}

// The first failure determines the reason, selected rule and evaluator fuel.
// All writes and notifications remain uncommitted, even if evaluated earlier.
fn derive_failure(
    entry: &Value,
    actor: &str,
    rules: &[&Value],
    state: &Map<String, Value>,
    types: &BTreeMap<String, String>,
    schemas: &BTreeMap<String, BTreeMap<String, String>>,
    limits: (u64, usize, usize),
) -> Result<Option<Failure>> {
    let (limit, max_state, max_event) = limits;
    let mut env = Map::new();
    env.insert("state".to_owned(), Value::Object(state.clone()));
    env.insert("event".to_owned(), entry["payload"].clone());
    let mut fuel = 0;
    let mut selected = None;
    for rule in rules {
        if rule["on"] != entry["type"] {
            continue;
        }
        if !rule["when"].is_null() {
            let guard = match evaluate_failure(&rule["when"], &env, &mut fuel, limit) {
                Ok(value) => value,
                Err(reason) => return Ok(Some(failure(reason, selected, fuel))),
            };
            match guard.as_bool() {
                Some(false) => continue,
                None => return Ok(Some(failure("expression-error", selected, fuel))),
                Some(true) => {}
            }
        }
        selected = Some(*rule);
        break;
    }
    let Some(rule) = selected else {
        return Ok(None);
    };
    let mut next = state.clone();
    for write in rule["writes"].as_array().unwrap() {
        let value = match evaluate_failure(&write["value"], &env, &mut fuel, limit) {
            Ok(value) => value,
            Err(reason) => return Ok(Some(failure(reason, selected, fuel))),
        };
        let name = write["path"][0].as_str().unwrap();
        if !typed(&value, &types[name]) {
            return Ok(Some(failure("expression-error", selected, fuel)));
        }
        next.insert(name.to_owned(), value);
    }
    if bytes(&Value::Object(next))? > max_state {
        return Ok(Some(failure("state-overflow", selected, fuel)));
    }
    for (ordinal, output) in rule["outputs"].as_array().unwrap().iter().enumerate() {
        let value = match evaluate_failure(&output["payload"], &env, &mut fuel, limit) {
            Ok(value) => value,
            Err(reason) => return Ok(Some(failure(reason, selected, fuel))),
        };
        let kind = output["event"].as_str().unwrap();
        if !record(&value, &schemas[kind]) {
            return Ok(Some(failure("output-invalid", selected, fuel)));
        }
        let target = output["target"].as_str().unwrap();
        let resolved = if target == "self" { actor } else { target };
        if notification_bytes(
            entry["messageDigest"].as_str().unwrap(),
            rule["id"].as_str().unwrap(),
            ordinal,
            resolved,
            kind,
            &value,
        )? > max_event
        {
            return Ok(Some(failure("output-overflow", selected, fuel)));
        }
    }
    if rule["result"]["kind"] == "defer" || rule["result"]["kind"] == "escalate" {
        let field = if rule["result"]["kind"] == "defer" {
            "key"
        } else {
            "request"
        };
        if let Err(reason) = evaluate_failure(&rule["result"][field], &env, &mut fuel, limit) {
            return Ok(Some(failure(reason, selected, fuel)));
        }
    }
    Ok(None)
}

/// Check shape and behavior first, then replay successful and failed decisions
/// from the declared initial state. Duplicate and full-mailbox entries do not
/// execute. Pending decisions need a matching wire value witness, not a host
/// effect or delivery claim.
pub fn replay_event_loop_trace(
    trace: &Value,
    behavior: &Value,
) -> Result<(String, EventLoopTraceSummary)> {
    let (trace_digest, _) = verify_event_loop_trace_structure(trace, behavior)?;
    let actor = behavior["actors"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
        .iter()
        .find(|actor| actor["id"] == trace["actor"])
        .ok_or_else(|| error("EVENT_LOOP_REFERENCE"))?;
    let mut schemas = BTreeMap::new();
    for event in behavior["events"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
    {
        let mut fields = BTreeMap::new();
        for field in event["payload"]["fields"]
            .as_array()
            .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
        {
            fields.insert(
                field["name"].as_str().unwrap().to_owned(),
                field["type"].as_str().unwrap().to_owned(),
            );
        }
        schemas.insert(event["id"].as_str().unwrap().to_owned(), fields);
    }
    let mut state = Map::new();
    let mut types = BTreeMap::new();
    for field in actor["state"]["fields"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
    {
        let name = field["name"].as_str().unwrap().to_owned();
        types.insert(name.clone(), field["type"].as_str().unwrap().to_owned());
        state.insert(name, field["initial"].clone());
    }
    let mut rules: Vec<&Value> = actor["transitions"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
        .iter()
        .collect();
    rules.sort_by(|a, b| a["id"].as_str().cmp(&b["id"].as_str()));
    let names: BTreeSet<String> = ["state", "event"].into_iter().map(str::to_owned).collect();
    // The digest includes all actors. Check their expressions even when the
    // trace selects only one; otherwise an unused sibling can hide bad code.
    // Preserve selected-actor-first errors, then sort siblings by id.
    let mut siblings: Vec<&Value> = behavior["actors"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
        .iter()
        .filter(|candidate| candidate["id"] != trace["actor"])
        .collect();
    siblings.sort_by(|a, b| a["id"].as_str().cmp(&b["id"].as_str()));
    for candidate in std::iter::once(actor).chain(siblings) {
        let mut checked_rules: Vec<&Value> = candidate["transitions"]
            .as_array()
            .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
            .iter()
            .collect();
        checked_rules.sort_by(|a, b| a["id"].as_str().cmp(&b["id"].as_str()));
        for rule in checked_rules {
            check_expr(&rule["when"], &names)?;
            for write in rule["writes"]
                .as_array()
                .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
            {
                check_expr(&write["value"], &names)?;
            }
            for output in rule["outputs"]
                .as_array()
                .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
            {
                check_expr(&output["payload"], &names)?;
            }
            for key in ["key", "request"] {
                if let Some(expr) = rule["result"].get(key) {
                    check_expr(expr, &names)?;
                }
            }
        }
    }
    let limit = trace["limits"]["maxTransitionFuel"]
        .as_u64()
        .ok_or_else(|| error("EVENT_LOOP_BOUNDS"))?;
    let max_state = trace["limits"]["maxStateBytes"]
        .as_u64()
        .ok_or_else(|| error("EVENT_LOOP_BOUNDS"))? as usize;
    let max_event = trace["limits"]["maxEventBytes"]
        .as_u64()
        .ok_or_else(|| error("EVENT_LOOP_BOUNDS"))? as usize;
    for entry in trace["entries"]
        .as_array()
        .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
    {
        let claim = &entry["decision"];
        if claim["kind"] == "duplicate" || claim["kind"] == "backpressure" {
            continue;
        }
        if claim["kind"] == "failed" {
            let actual = derive_failure(
                entry,
                trace["actor"].as_str().unwrap(),
                &rules,
                &state,
                &types,
                &schemas,
                (limit, max_state, max_event),
            )?
            .ok_or_else(|| error("EVENT_LOOP_SEMANTIC"))?;
            let state_value = Value::Object(state.clone());
            if claim["reason"] != actual.reason
                || claim["transition"].as_str() != actual.transition.as_deref()
                || claim["resources"]["fuel"] != actual.fuel
                || claim["stateDigest"] != hash(&state_value)?
                || claim["resources"]["stateBytes"] != bytes(&state_value)?
                || claim["resources"]["outputEvents"] != 0
            {
                return Err(error("EVENT_LOOP_SEMANTIC"));
            }
            continue;
        }
        if claim["kind"] != "accepted" {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
        let mut env = Map::new();
        env.insert("state".to_owned(), Value::Object(state.clone()));
        env.insert("event".to_owned(), entry["payload"].clone());
        let mut fuel = 0;
        let mut selected = None;
        for rule in &rules {
            if rule["on"] != entry["type"] {
                continue;
            }
            let guard = if rule["when"].is_null() {
                Value::Bool(true)
            } else {
                evaluate(&rule["when"], &env, &mut fuel, limit)?
            };
            if guard
                .as_bool()
                .ok_or_else(|| error("EVENT_LOOP_SEMANTIC"))?
            {
                selected = Some(*rule);
                break;
            }
        }
        let chosen = selected.and_then(|rule| rule["id"].as_str());
        let outcome = selected
            .and_then(|rule| rule["result"]["kind"].as_str())
            .unwrap_or("no-transition");
        if claim["transition"].as_str() != chosen || claim["outcome"] != outcome {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
        let mut outputs = Vec::new();
        if let Some(rule) = selected {
            let mut next = state.clone();
            for write in rule["writes"]
                .as_array()
                .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
            {
                let name = write["path"][0]
                    .as_str()
                    .ok_or_else(|| error("EVENT_LOOP_PARSE"))?;
                let value = evaluate(&write["value"], &env, &mut fuel, limit)?;
                if !typed(&value, &types[name]) {
                    return Err(error("EVENT_LOOP_SCHEMA"));
                }
                next.insert(name.to_owned(), value);
            }
            if bytes(&Value::Object(next.clone()))? > max_state {
                return Err(error("EVENT_LOOP_BOUNDS"));
            }
            for (ordinal, output) in rule["outputs"]
                .as_array()
                .ok_or_else(|| error("EVENT_LOOP_PARSE"))?
                .iter()
                .enumerate()
            {
                let payload = evaluate(&output["payload"], &env, &mut fuel, limit)?;
                let kind = output["event"]
                    .as_str()
                    .ok_or_else(|| error("EVENT_LOOP_PARSE"))?;
                if !record(&payload, &schemas[kind]) {
                    return Err(error("EVENT_LOOP_SCHEMA"));
                }
                let target = output["target"]
                    .as_str()
                    .ok_or_else(|| error("EVENT_LOOP_PARSE"))?;
                let resolved = if target == "self" {
                    trace["actor"].as_str().unwrap()
                } else {
                    target
                };
                let parent = entry["messageDigest"].as_str().unwrap();
                let transition = rule["id"].as_str().unwrap();
                if notification_bytes(parent, transition, ordinal, resolved, kind, &payload)?
                    > max_event
                {
                    return Err(error("EVENT_LOOP_BOUNDS"));
                }
                outputs.push(event_loop_notification_digest(
                    parent, transition, ordinal, resolved, kind, &payload,
                )?);
            }
            if matches!(outcome, "defer" | "escalate") {
                let field = if outcome == "defer" { "key" } else { "request" };
                let pending = evaluate(&rule["result"][field], &env, &mut fuel, limit)?;
                // Presence is distinct from value: null is a valid witness.
                // Compare canonical values, not serde_json number representations:
                // 1.0 and 1 have one digest and are equal in the Bun reference.
                if claim.get("pending").map(canonical).transpose()? != Some(canonical(&pending)?) {
                    return Err(error("EVENT_LOOP_SEMANTIC"));
                }
            }
            state = next;
        }
        let state_value = Value::Object(state.clone());
        if claim["stateDigest"] != hash(&state_value)?
            || claim["resources"]["stateBytes"] != bytes(&state_value)?
            || claim["resources"]["fuel"] != fuel
            || claim["resources"]["outputEvents"] != outputs.len()
            || claim["outputs"] != json!(outputs)
            || claim["effects"]["requested"] != 0
            || claim["effects"]["settled"] != 0
            || claim["effects"]["receipts"] != json!([])
        {
            return Err(error("EVENT_LOOP_SEMANTIC"));
        }
    }
    let (_, summary) = summarize_event_loop_trace(trace)?;
    Ok((trace_digest, summary))
}
