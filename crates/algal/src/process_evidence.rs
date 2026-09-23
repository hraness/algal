//! Bounded, inactive process evidence. This is execution history, not authority
//! to install a named process, activate tools or access provider credentials.
use crate::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, canonical, check_digest, digest_bytes},
    contract::{Manifest, Signature, integer, keys, object, ports, text},
    effects::{Host, Tool, ToolBackend},
    process::{
        ProcessState, read_process_history, record, stored_receipt, verify_process_snapshot,
    },
    runtime,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{
    collections::BTreeSet,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
};

pub const CONTRACT: &str = "algal.process-evidence.v1";

fn bounded_digest(value: &Value) -> Result<String> {
    let mut stack = vec![(value, 0)];
    let mut count = 0;
    while let Some((value, depth)) = stack.pop() {
        count += 1;
        if count > 1_000_000 || depth > 64 {
            return Err(Error::limit("process evidence JSON depth/count"));
        }
        let children = match value {
            Value::Array(v) => v.len(),
            Value::Object(v) => v.len(),
            _ => 0,
        };
        if count + stack.len() + children > 1_000_000 {
            return Err(Error::limit("process evidence JSON nodes"));
        }
        match value {
            Value::Array(v) => stack.extend(v.iter().map(|v| (v, depth + 1))),
            Value::Object(v) => stack.extend(v.values().map(|v| (v, depth + 1))),
            _ => (),
        }
    }
    let bytes = canonical(value)?;
    if bytes.len() > MAX_DOCUMENT_BYTES {
        return Err(Error::limit("process evidence bytes"));
    }
    // The same canonical bytes establish the size bound and the evidence digest.
    Ok(digest_bytes(bytes.as_bytes()))
}

/// Signature-only parsing. Executable/configuration/callback fields are refused;
/// an explicit denying backend also guards any unexpected replay activation.
pub fn evidence_host(raw: &Value) -> Result<Host> {
    let mut host = Host::default();
    if object(raw)?.len() > 64 {
        return Err(Error::limit("process evidence tool count"));
    }
    for (name, raw) in object(raw)? {
        if name.is_empty() || name.encode_utf16().count() > 128 || name.contains('\0') {
            return Err(Error::invalid("process evidence tool name"));
        }
        keys(
            raw,
            &["inputs", "outputs", "effect", "cost", "maxOutputBytes"],
        )?;
        let effect = text(&raw["effect"], 5)?.to_owned();
        if !["read", "write"].contains(&effect.as_str()) {
            return Err(Error::invalid("process evidence tool effect"));
        }
        host.tools.insert(
            name.clone(),
            Tool {
                signature: Signature {
                    inputs: ports(&raw["inputs"], false, false)?,
                    outputs: ports(&raw["outputs"], true, false)?,
                    cost: integer(&raw["cost"], 0, 1_000_000)?,
                },
                effect,
                max_bytes: integer(&raw["maxOutputBytes"], 1, 262_144)?,
                configuration_digest: None,
                backend: ToolBackend::EvidenceDenied(Arc::new(AtomicBool::new(false))),
            },
        );
    }
    Ok(host)
}

fn signatures(host: &Host) -> Value {
    Value::Object(host.tools.iter().map(|(name, tool)| (name.clone(), json!({
        "inputs":tool.signature.inputs,"outputs":tool.signature.outputs,
        "cost":tool.signature.cost,"effect":tool.effect,"maxOutputBytes":tool.max_bytes,
    }))).collect())
}
fn inactive(host: &Host) -> Result<()> {
    if host.tools.values().any(|tool| matches!(&tool.backend, ToolBackend::EvidenceDenied(flag) if flag.load(Ordering::Relaxed))) {
        return Err(Error::new("VERIFY_FAILED", "portable evidence attempted tool activation"));
    }
    Ok(())
}

fn positive(raw: &Value, max: usize, bytes: usize) -> Result<&Map<String, Value>> {
    let objects = object(raw)?;
    if objects.len() > max {
        return Err(Error::limit("process evidence object count"));
    }
    for (key, value) in objects {
        check_digest(key)?;
        let encoded = canonical(value)?;
        if encoded.len() > bytes {
            return Err(Error::limit("process evidence object bytes"));
        }
        if digest_bytes(encoded.as_bytes()) != *key {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "process evidence claimed digest",
            ));
        }
    }
    Ok(objects)
}

// Replay reconstructs deterministic cells/events/work but intentionally preserves
// historical runtime and effect metadata. Check that metadata before replay so
// an otherwise self-consistent receipt cannot smuggle executable/unknown fields.
fn receipt_metadata(receipt: &Value) -> Result<()> {
    keys(
        receipt,
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
    keys(&receipt["runtime"], &["name", "version"])?;
    if receipt["runtime"]["name"] != "algal" {
        return Err(Error::invalid("process evidence runtime name"));
    }
    text(&receipt["runtime"]["version"], 128)?;
    text(&receipt["manifestKey"], 256)?;
    check_digest(text(&receipt["manifestDigest"], 71)?)?;
    check_digest(text(&receipt["digest"], 71)?)?;
    for args in object(&receipt["args"])?.values() {
        object(args)?;
    }
    if canonical(&receipt["args"])?.len() > 250_000 {
        return Err(Error::limit("process evidence receipt args"));
    }
    for cell in object(&receipt["cells"])?.values() {
        if let Some(via) = cell.get("via") {
            text(via, 128)?;
        }
    }
    let effects = receipt["effects"]
        .as_array()
        .ok_or_else(|| Error::invalid("process evidence effects"))?;
    let events = receipt["events"]
        .as_array()
        .ok_or_else(|| Error::invalid("process evidence events"))?;
    if effects.len() > 16_448 || events.len() > 4096 || object(&receipt["cells"])?.len() > 65_536 {
        return Err(Error::limit("process evidence receipt counts"));
    }
    keys(&receipt["work"], &["steps", "agentCalls", "units"])?;
    for key in ["steps", "agentCalls", "units"] {
        integer(&receipt["work"][key], 0, 9_007_199_254_740_991)?;
    }
    for effect in effects {
        keys(
            effect,
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
        check_digest(text(&effect["requestDigest"], 71)?)?;
        text(&effect["executor"], 256)?;
        if effect.get("output").is_some() == effect.get("error").is_some() {
            return Err(Error::invalid("effect requires exactly output or error"));
        }
        if let Some(error) = effect.get("error") {
            keys(error, &["code", "message"])?;
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
            if !CODES.contains(&text(&error["code"], 64)?) {
                return Err(Error::invalid("unknown effect error code"));
            }
            text(&error["message"], 2048)?;
        }
        if let Some(usage) = effect.get("usage") {
            keys(usage, &["model", "tokensIn", "tokensOut"])?;
            if let Some(model) = usage.get("model") {
                text(model, 128)?;
            }
            for key in ["tokensIn", "tokensOut"] {
                if let Some(count) = usage.get(key) {
                    integer(count, 0, 9_007_199_254_740_991)?;
                }
            }
        }
        if effect.get("cached").is_some_and(|value| value != true)
            || effect.get("retryable").is_some_and(|value| value != false)
        {
            return Err(Error::invalid("invalid effect flags"));
        }
        if let Some(wake) = effect.get("wake") {
            if effect["error"]["code"] != "EFFECT_SUSPENDED" {
                return Err(Error::invalid("wake requires suspension"));
            }
            crate::capabilities::parse_wake_capabilities(wake)?;
        }
        if let Some(key) = effect.get("configurationDigest") {
            check_digest(text(key, 71)?)?;
        }
    }
    Ok(())
}

/// Verify entirely in memory. Every claimed digest is checked before admission;
/// negative dependencies are explicit and omissions poison replay out of band.
pub async fn verify_process_evidence(raw: &Value) -> Result<Value> {
    let evidence_digest = bounded_digest(raw)?;
    keys(
        raw,
        &[
            "contract", "head", "records", "receipts", "program", "tools", "missing",
        ],
    )?;
    if raw["contract"] != CONTRACT {
        return Err(Error::invalid("process evidence contract"));
    }
    let head = check_digest(text(&raw["head"], 71)?)?;
    let records = positive(&raw["records"], 129, 512_000)?;
    let receipts = positive(&raw["receipts"], 64, 16_000_000)?;
    let program = &raw["program"];
    keys(program, &["contract", "root", "manifests", "values"])?;
    if program["contract"] != "algal.bundle.v1" {
        return Err(Error::invalid("process evidence program contract"));
    }
    let root = check_digest(text(&program["root"], 71)?)?;
    let manifests = positive(&program["manifests"], 512, 1_048_576)?;
    let values = positive(&program["values"], 512, MAX_DOCUMENT_BYTES)?;
    for value in records.values() {
        record(value)?;
    }
    for value in manifests.values() {
        if Manifest::parse(value)?.value != *value {
            return Err(Error::invalid("process evidence manifest is not canonical"));
        }
    }
    for receipt in receipts.values() {
        receipt_metadata(receipt)?;
        if receipt["contract"] != "algal.run.v1"
            || receipt["digest"] != runtime::receipt_digest(receipt)?
        {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "process evidence receipt integrity",
            ));
        }
    }
    let process = record(
        records
            .get(head)
            .ok_or_else(|| Error::new("STORE_MISS", "process evidence head missing"))?,
    )?;
    if process.manifest_digest != root || !manifests.contains_key(root) {
        return Err(Error::invalid("process evidence root binding"));
    }
    keys(&raw["missing"], &["manifests", "values"])?;
    let mut missing = BTreeSet::new();
    for (kind, positives) in [("manifests", manifests), ("values", values)] {
        let names = raw["missing"][kind]
            .as_array()
            .ok_or_else(|| Error::invalid("process evidence missing list"))?;
        if names.len() > 512 {
            return Err(Error::limit("process evidence missing count"));
        }
        let mut previous: Option<&str> = None;
        for key in names {
            let key = check_digest(text(key, 71)?)?;
            if previous.is_some_and(|previous| previous >= key)
                || positives.contains_key(key)
                || (kind == "values" && records.contains_key(key))
            {
                return Err(Error::invalid(
                    "process evidence missing entries overlap or are not sorted unique",
                ));
            }
            missing.insert((kind.to_owned(), key.to_owned()));
            previous = Some(key);
        }
    }
    let host = evidence_host(&raw["tools"])?;
    let mut store = Store::evidence_memory(missing);
    for (kind, map) in [
        ("values", records),
        ("runs", receipts),
        ("manifests", manifests),
        ("values", values),
    ] {
        for value in map.values() {
            store.put(kind, value)?;
        }
    }
    let snapshot = ProcessState {
        digest: head.to_owned(),
        process,
    };
    let chain = read_process_history(&snapshot, &store)?;
    let required: BTreeSet<_> = chain
        .iter()
        .filter_map(|state| state.process.receipt.as_ref())
        .collect();
    if required.len() != receipts.len() || receipts.keys().any(|key| !required.contains(key)) {
        return Err(Error::invalid(
            "process evidence receipts must exactly match the process history",
        ));
    }
    let mut report = verify_process_snapshot(&snapshot, &store, &host).await?;
    store.check_evidence_reads()?;
    inactive(&host)?;
    report["evidenceDigest"] = json!(evidence_digest);
    Ok(report)
}

/// Export only actual source-store dependencies read during verification. Replay
/// overlays share provenance but never contribute generated intermediate values.
pub async fn export_process_evidence(
    snapshot: &ProcessState,
    store: &Store,
    host: &Host,
) -> Result<Value> {
    let tools = signatures(host);
    let safe_host = evidence_host(&tools)?;
    let source = store.trace_source_reads();
    let chain = read_process_history(snapshot, &source)?;
    let mut records = Map::new();
    let mut receipts = Map::new();
    for state in &chain {
        records.insert(state.digest.clone(), serde_json::to_value(&state.process)?);
        if let Some(key) = &state.process.receipt
            && !receipts.contains_key(key)
        {
            let receipt = stored_receipt(&source, &state.process)?;
            source.reserve_trace_bytes(canonical(&receipt)?.len())?;
            receipts.insert(key.clone(), receipt);
        }
    }
    verify_process_snapshot(snapshot, &source, &safe_host).await?;
    source.check_evidence_reads()?;
    inactive(&safe_host)?;
    let mut manifests = Map::new();
    let mut values = Map::new();
    let mut missing_manifests = Vec::new();
    let mut missing_values = Vec::new();
    for ((kind, key), value) in source.source_reads()? {
        match (kind.as_str(), value) {
            ("manifests", Some(value)) => {
                manifests.insert(key, value);
            }
            ("values", Some(value)) if !records.contains_key(&key) => {
                values.insert(key, value);
            }
            ("manifests", None) => missing_manifests.push(key),
            ("values", None) => missing_values.push(key),
            _ => (),
        }
    }
    let evidence = json!({"contract":CONTRACT,"head":snapshot.digest,"records":records,"receipts":receipts,
        "program":{"contract":"algal.bundle.v1","root":snapshot.process.manifest_digest,"manifests":manifests,"values":values},
        "tools":tools,"missing":{"manifests":missing_manifests,"values":missing_values}});
    verify_process_evidence(&evidence).await?;
    Ok(evidence)
}
