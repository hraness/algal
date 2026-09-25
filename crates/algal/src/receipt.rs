//! Closed structural admission for foreign run receipts, shared by inspection,
//! comparison, verification and resumption. Digest checking/replay remains a
//! separate step so callers can inspect structurally valid tampering evidence.
use crate::{
    Error, Result,
    canonical::{canonical, check_digest},
    contract::{integer, keys, list, object, text},
};
use serde_json::{Value, json};

const MAX_BYTES: usize = 67_108_864;
const SAFE_INTEGER: usize = 9_007_199_254_740_991;
const CODES: &[&str] = &[
    "PARSE_FAILED",
    "MANIFEST_INVALID",
    "GRAPH_CYCLE",
    "TYPE_MISMATCH",
    "GUARD_INVALID",
    "SCORER_INVALID",
    "AXIS_INVALID",
    "INTERFACE_MISMATCH",
    "DEPTH_EXCEEDED",
    "INPUT_MISSING",
    "FN_UNKNOWN",
    "FN_FAILED",
    "EXPR_FAILED",
    "TOOL_UNKNOWN",
    "TOOL_FAILED",
    "EFFECT_FAILED",
    "EFFECT_UNPARSEABLE",
    "EFFECT_UNBOUND",
    "EFFECT_SUSPENDED",
    "CAPABILITY_DENIED",
    "MAILBOX_FULL",
    "BUDGET_EXHAUSTED",
    "STUCK",
    "STORE_MISS",
    "DIGEST_MISMATCH",
    "RECEIPT_MISMATCH",
    "IO_FAILED",
    "INTERNAL",
];

fn reference(value: &Value) -> Result<()> {
    check_digest(
        value
            .as_str()
            .ok_or_else(|| Error::invalid("receipt digest"))?,
    )
    .map(|_| ())
}
fn member(value: &Value, allowed: &[&str]) -> Result<()> {
    if !value.as_str().is_some_and(|s| allowed.contains(&s)) {
        return Err(Error::invalid("unknown receipt variant"));
    }
    Ok(())
}
fn failure(value: &Value, path: bool, max_message: usize) -> Result<()> {
    keys(
        value,
        if path {
            &["code", "message", "path"]
        } else {
            &["code", "message"]
        },
    )?;
    member(&value["code"], CODES)?;
    text(&value["message"], max_message)?;
    if let Some(path) = value.get("path") {
        text(path, 4096)?;
    }
    Ok(())
}
pub fn validate_effect(value: &Value) -> Result<()> {
    keys(
        value,
        &[
            "requestDigest",
            "output",
            "error",
            "executor",
            "usage",
            "cached",
            "retryable",
            "wake",
            "configurationDigest",
        ],
    )?;
    reference(&value["requestDigest"])?;
    text(&value["executor"], 256)?;
    if value.get("output").is_some() == value.get("error").is_some() {
        return Err(Error::invalid("effect needs exactly one output or error"));
    }
    if let Some(error) = value.get("error") {
        failure(error, false, 2048)?;
    }
    if let Some(usage) = value.get("usage") {
        keys(usage, &["model", "tokensIn", "tokensOut"])?;
        if let Some(model) = usage.get("model") {
            text(model, 128)?;
        }
        for key in ["tokensIn", "tokensOut"] {
            if let Some(v) = usage.get(key) {
                integer(v, 0, SAFE_INTEGER)?;
            }
        }
    }
    if value.get("retryable").is_some_and(|v| v != false)
        || value.get("cached").is_some_and(|v| v != true)
    {
        return Err(Error::invalid("invalid effect flag"));
    }
    if let Some(wake) = value.get("wake") {
        if value["error"]["code"] != "EFFECT_SUSPENDED" {
            return Err(Error::invalid("wake requires suspended effect"));
        }
        crate::capabilities::parse_wake_capabilities(wake)?;
    }
    if let Some(reference_value) = value.get("configurationDigest") {
        reference(reference_value)?;
    }
    Ok(())
}

pub fn validate(value: &Value) -> Result<()> {
    resources(value, "PARSE_FAILED")?;
    fields(value)
}

/// Producer admission uses the same envelope and resource profile as readers,
/// with a capacity error for an execution that cannot be represented.
pub(crate) fn validate_produced(value: &Value) -> Result<()> {
    resources(value, "BUDGET_EXHAUSTED")?;
    fields(value)
}

fn resources(value: &Value, code: &str) -> Result<()> {
    let mut pending = vec![(value, 0usize)];
    let mut nodes = 0usize;
    let mut text_bytes = 0usize;
    while let Some((value, depth)) = pending.pop() {
        nodes += 1;
        if nodes > 1_000_000 || depth > 64 {
            return Err(Error::new(code, "receipt structural bounds exceeded"));
        }
        match value {
            Value::Array(values) => {
                if values.len() + pending.len() > 1_000_000 {
                    return Err(Error::new(code, "receipt node bound exceeded"));
                }
                pending.extend(values.iter().map(|v| (v, depth + 1)));
            }
            Value::Object(values) => {
                if values.len() + pending.len() > 1_000_000 {
                    return Err(Error::new(code, "receipt node bound exceeded"));
                }
                for key in values.keys() {
                    text_bytes = text_bytes.saturating_add(key.len());
                }
                pending.extend(values.values().map(|v| (v, depth + 1)));
            }
            Value::String(value) => {
                text_bytes = text_bytes.saturating_add(value.len());
            }
            _ => {}
        }
        if text_bytes > MAX_BYTES {
            return Err(Error::new(code, "receipt byte bound exceeded"));
        }
    }
    if canonical(value)?.len() > MAX_BYTES {
        return Err(Error::new(code, "receipt byte bound exceeded"));
    }
    Ok(())
}

fn fields(value: &Value) -> Result<()> {
    keys(
        value,
        &[
            "contract",
            "runtime",
            "manifestDigest",
            "manifestKey",
            "args",
            "outcome",
            "cells",
            "effects",
            "events",
            "work",
            "failure",
            "digest",
        ],
    )?;
    member(&value["contract"], &["algal.run.v1"])?;
    keys(&value["runtime"], &["name", "version"])?;
    member(&value["runtime"]["name"], &["algal"])?;
    text(&value["runtime"]["version"], 128)?;
    reference(&value["digest"])?;
    reference(&value["manifestDigest"])?;
    text(&value["manifestKey"], 256)?;
    for input in object(&value["args"])?.values() {
        object(input)?;
    }
    if canonical(&value["args"])?.len() > 1_048_576 {
        return Err(Error::invalid("receipt arguments too large"));
    }
    member(
        &value["outcome"],
        &["complete", "failed", "stuck", "suspended"],
    )?;
    keys(&value["work"], &["steps", "agentCalls", "units"])?;
    for key in ["steps", "agentCalls", "units"] {
        integer(&value["work"][key], 0, SAFE_INTEGER)?;
    }
    if let Some(record) = value.get("failure") {
        failure(record, true, MAX_BYTES)?;
    }
    let cells = object(&value["cells"])?;
    if cells.len() > 65_536 {
        return Err(Error::invalid("receipt cell bound exceeded"));
    }
    for (path, cell) in cells {
        if path.encode_utf16().count() > 4096 {
            return Err(Error::invalid("receipt cell path bound exceeded"));
        }
        keys(
            cell,
            &[
                "status",
                "outputs",
                "failure",
                "work",
                "effectDigest",
                "toolCalls",
                "shadowOut",
                "rounds",
                "items",
                "via",
                "slot",
            ],
        )?;
        member(
            &cell["status"],
            &["committed", "skipped", "failed", "suspended"],
        )?;
        integer(&cell["work"], 0, SAFE_INTEGER)?;
        if let Some(outputs) = cell.get("outputs") {
            object(outputs)?;
        }
        if let Some(record) = cell.get("failure") {
            failure(record, false, MAX_BYTES)?;
        }
        if let Some(digest) = cell.get("effectDigest") {
            reference(digest)?;
        }
        if let Some(calls) = cell.get("toolCalls") {
            list(calls, 1_000_000)?;
        }
        for key in ["rounds", "items"] {
            if let Some(v) = cell.get(key) {
                integer(v, 0, SAFE_INTEGER)?;
            }
        }
        if let Some(via) = cell.get("via") {
            text(via, 128)?;
        }
        if let Some(slot) = cell.get("slot") {
            keys(slot, &["name", "mode"])?;
            text(&slot["name"], 128)?;
            member(&slot["mode"], &["read", "write"])?;
        }
    }
    for effect in list(&value["effects"], 16_448)? {
        validate_effect(effect)?;
    }
    for event in list(&value["events"], 4096)? {
        keys(event, &["seq", "kind", "path", "digest", "outcome"])?;
        integer(&event["seq"], 0, SAFE_INTEGER)?;
        member(
            &event["kind"],
            &[
                "run.start",
                "cell.commit",
                "cell.skip",
                "cell.fail",
                "cell.suspend",
                "effect",
                "run.end",
            ],
        )?;
        if let Some(path) = event.get("path") {
            text(path, 4096)?;
        }
        if let Some(digest) = event.get("digest") {
            reference(digest)?;
        }
        if let Some(outcome) = event.get("outcome") {
            text(outcome, 32)?;
        }
    }
    Ok(())
}

fn canon_eq(a: Option<&Value>, b: Option<&Value>) -> bool {
    let empty = Value::Null;
    canonical(a.unwrap_or(&empty)).unwrap_or_default()
        == canonical(b.unwrap_or(&empty)).unwrap_or_default()
}

fn disp(value: &Value) -> String {
    value
        .as_str()
        .map(String::from)
        .unwrap_or_else(|| canonical(value).unwrap_or_else(|_| "null".into()))
}

/// Compare two run receipts field by field — the `algal diff` surface.
pub fn diff(a: &Value, b: &Value) -> Vec<String> {
    let mut out = Vec::new();
    if a["outcome"] != b["outcome"] {
        out.push(format!(
            "outcome: {} vs {}",
            disp(&a["outcome"]),
            disp(&b["outcome"])
        ));
    }
    let mut a_cells: Vec<String> = a["cells"]
        .as_object()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    let mut b_cells: Vec<String> = b["cells"]
        .as_object()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    a_cells.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    b_cells.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    if a_cells != b_cells {
        out.push(format!(
            "cells: {} vs {}",
            a_cells.join(","),
            b_cells.join(",")
        ));
    }
    for name in &a_cells {
        let (ac, bc) = (&a["cells"][name], &b["cells"][name]);
        if bc.is_null() {
            continue;
        }
        if ac["status"] != bc["status"] {
            out.push(format!(
                "cell {name}: status {} vs {}",
                disp(&ac["status"]),
                disp(&bc["status"])
            ));
        }
        let empty = json!({});
        if !canon_eq(
            Some(if ac["outputs"].is_null() {
                &empty
            } else {
                &ac["outputs"]
            }),
            Some(if bc["outputs"].is_null() {
                &empty
            } else {
                &bc["outputs"]
            }),
        ) {
            out.push(format!("cell {name}: outputs differ"));
        }
        if ac["work"] != bc["work"] {
            out.push(format!(
                "cell {name}: work {} vs {}",
                disp(&ac["work"]),
                disp(&bc["work"])
            ));
        }
        if ac["rounds"] != bc["rounds"] {
            out.push(format!(
                "cell {name}: rounds {} vs {}",
                ac.get("rounds")
                    .map(disp)
                    .unwrap_or_else(|| "undefined".into()),
                bc.get("rounds")
                    .map(disp)
                    .unwrap_or_else(|| "undefined".into())
            ));
        }
        if ac["items"] != bc["items"] {
            out.push(format!(
                "cell {name}: items {} vs {}",
                ac.get("items")
                    .map(disp)
                    .unwrap_or_else(|| "undefined".into()),
                bc.get("items")
                    .map(disp)
                    .unwrap_or_else(|| "undefined".into())
            ));
        }
        if !canon_eq(ac.get("failure"), bc.get("failure")) {
            out.push(format!("cell {name}: failure differs"));
        }
        if !canon_eq(ac.get("toolCalls"), bc.get("toolCalls")) {
            out.push(format!("cell {name}: toolCalls differ"));
        }
        if !canon_eq(ac.get("shadowOut"), bc.get("shadowOut")) {
            out.push(format!("cell {name}: shadowOut differs"));
        }
        if ac["via"] != bc["via"] {
            out.push(format!(
                "cell {name}: via {} vs {}",
                ac["via"].as_str().unwrap_or("local"),
                bc["via"].as_str().unwrap_or("local")
            ));
        }
        if !canon_eq(ac.get("slot"), bc.get("slot")) {
            out.push(format!("cell {name}: slot differs"));
        }
    }
    let a_effects = a["effects"].as_array().map(|e| e.len()).unwrap_or(0);
    let b_effects = b["effects"].as_array().map(|e| e.len()).unwrap_or(0);
    if a_effects != b_effects {
        out.push(format!("effects: {a_effects} vs {b_effects}"));
    } else if let (Some(ae), Some(be)) = (a["effects"].as_array(), b["effects"].as_array()) {
        for (i, (e, o)) in ae.iter().zip(be.iter()).enumerate() {
            if e["requestDigest"] != o["requestDigest"] {
                out.push(format!("effect {i}: requestDigest differs"));
            }
            if !canon_eq(e.get("output"), o.get("output")) {
                out.push(format!("effect {i}: output differs"));
            }
            if !canon_eq(e.get("error"), o.get("error")) {
                out.push(format!("effect {i}: error differs"));
            }
            if e["executor"] != o["executor"] {
                out.push(format!(
                    "effect {i}: executor {} vs {}",
                    disp(&e["executor"]),
                    disp(&o["executor"])
                ));
            }
            if !canon_eq(e.get("usage"), o.get("usage")) {
                out.push(format!("effect {i}: usage differs"));
            }
        }
    }
    if !canon_eq(a.get("events"), b.get("events")) {
        out.push("events: event logs differ".into());
    }
    for field in ["steps", "agentCalls", "units"] {
        if a["work"][field] != b["work"][field] {
            out.push(format!(
                "work.{field}: {} vs {}",
                disp(&a["work"][field]),
                disp(&b["work"][field])
            ));
        }
    }
    if a.get("failure").is_some() != b.get("failure").is_some() {
        out.push("failure presence differs".into());
    } else if let (Some(af), Some(bf)) = (a.get("failure"), b.get("failure"))
        && af["code"] != bf["code"]
    {
        out.push(format!(
            "failure.code: {} vs {}",
            disp(&af["code"]),
            disp(&bf["code"])
        ));
    }
    if out.is_empty() && !canon_eq(Some(a), Some(b)) {
        out.push("receipt records differ".into());
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn receipt() -> Value {
        let reference = format!("sha256:{}", "a".repeat(64));
        json!({"contract":"algal.run.v1","runtime":{"name":"algal","version":"0.1.0"},"manifestDigest":reference,"manifestKey":"organism:test","args":{},"outcome":"complete","cells":{},"effects":[],"events":[],"work":{"steps":0,"agentCalls":0,"units":0},"digest":reference})
    }
    #[test]
    fn foreign_receipts_are_closed_and_typed_before_replay() {
        let original = receipt();
        assert!(validate(&original).is_ok());
        for mutation in [
            json!({"extra":true}),
            json!({"runtime":{"name":"other","version":"0.1.0"}}),
            json!({"work":{"steps":0,"agentCalls":0}}),
            json!({"cells":{"a":{"status":"committed","work":0,"extra":true}}}),
            json!({"effects":[{"requestDigest":original["digest"],"executor":"test","output":1,"error":{"code":"INTERNAL","message":"bad"}}]}),
        ] {
            let mut changed = original.clone();
            for (key, value) in mutation.as_object().unwrap() {
                changed[key] = value.clone();
            }
            assert!(validate(&changed).is_err(), "accepted {mutation}");
        }
    }
}
