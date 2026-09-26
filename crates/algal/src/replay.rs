//! Counterfactual replay — port of `src/replay.ts`. `algal replay <receipt>
//! --with <manifest>` runs a revised manifest against the recorded evidence of
//! an earlier run. Recorded effects answer while the revised trace still
//! issues the recorded requests; requests the record cannot answer — and no
//! admitted executor can — end the run where the evidence ends, and the
//! comparison reports `could-not-replay` rather than inventing data. The
//! result is a bounded, parseable `algal.replay-comparison.v1` record.
//!
//! Every digest, count, verdict, and evidence field is byte-identical to the
//! reference runtime's record. One diagnostic is runtime-local: the
//! `manifest-invalid` reason's `detail` carries the producing runtime's own
//! first parse error text, whose wording differs between the parsers; the
//! verdict and `reason.code` still agree.

use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    contract::{Manifest, object, text},
    effects::Host,
    graph::Transports,
    receipt, runtime,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::collections::BTreeSet;

pub const CONTRACT: &str = "algal.replay-comparison.v1";

pub const MAX_BYTES: usize = 1_048_576;
const MAX_PREFIX: usize = 256;
const MAX_ADDED: usize = 256;
const MAX_PATH_LEN: usize = 4096;
const MAX_DETAIL_LEN: usize = 2048;
const MAX_STATUS_LEN: usize = 64;

const CELL_EVENTS: [&str; 4] = ["cell.commit", "cell.skip", "cell.fail", "cell.suspend"];
const MISSING_CODES: [&str; 4] = [
    "EFFECT_UNBOUND",
    "TOOL_UNKNOWN",
    "FN_UNKNOWN",
    "INPUT_MISSING",
];

// ------------------------------------------------------------ recording ---

/// The run's activation order, from the event log. Events cap at the run's
/// event bound, so any recorded cell missing from the log follows in sorted
/// order — the order is a listing device, not a claim about scheduling.
fn activation_order(receipt: &Value) -> Result<Vec<String>> {
    let mut order = Vec::new();
    let mut seen = BTreeSet::new();
    for event in receipt["events"]
        .as_array()
        .ok_or_else(|| Error::invalid("run receipt events"))?
    {
        if let (Some(kind), Some(path)) = (event["kind"].as_str(), event["path"].as_str())
            && CELL_EVENTS.contains(&kind)
            && seen.insert(path.to_owned())
        {
            order.push(path.to_owned());
        }
    }
    for path in object(&receipt["cells"])?.keys() {
        if !seen.contains(path) {
            order.push(path.clone());
        }
    }
    Ok(order)
}

fn cell_digest(record: &Value) -> Result<Value> {
    if record.is_null() {
        Ok(Value::Null)
    } else {
        Ok(json!(digest(record)?))
    }
}

fn cell_side(record: &Value) -> Result<Value> {
    if record.is_null() {
        Ok(Value::Null)
    } else {
        Ok(json!({"status":record["status"],"digest":digest(record)?}))
    }
}

fn same(a: &Value, b: &Value) -> Result<bool> {
    Ok(canonical(a)? == canonical(b)?)
}

/// The last effect request the cell issued, from the event log — the
/// request that went unanswered for a missing-effect failure.
fn last_effect_request(receipt: &Value, path: &str) -> Result<Option<String>> {
    let mut request = None;
    for event in receipt["events"]
        .as_array()
        .ok_or_else(|| Error::invalid("run receipt events"))?
    {
        if event["kind"].as_str() == Some("effect")
            && event["path"].as_str() == Some(path)
            && let Some(digest) = event["digest"].as_str()
        {
            request = Some(digest.to_owned());
        }
    }
    Ok(request)
}

// ------------------------------------------------------------------ run ---

/// JavaScript property spread over a single value: an object contributes its
/// entries, a string or array contributes indexed members, anything else
/// contributes nothing — the semantics `{...value}` has in `mergeArgs`. */
fn spread(value: &Value) -> Map<String, Value> {
    let mut out = Map::new();
    match value {
        Value::Object(ports) => out = ports.clone(),
        Value::String(text) => {
            // Characters index like UTF-16 code units for the BMP; astral
            // characters differ from JavaScript's unit indexing — replay
            // args are cell/port objects in every supported scenario.
            for (index, character) in text.chars().enumerate() {
                out.insert(index.to_string(), Value::String(character.to_string()));
            }
        }
        Value::Array(items) => {
            for (index, item) in items.iter().enumerate() {
                out.insert(index.to_string(), item.clone());
            }
        }
        _ => {}
    }
    out
}

/// `Object.entries` on a single value: objects give member pairs, strings
/// and arrays give indexed pairs, everything else gives nothing.
fn entries(value: &Value) -> Vec<(String, Value)> {
    spread(value).into_iter().collect()
}

/// Args the revised run uses: the recorded args merged with any override,
/// per cell per port. An override replaces a port value, never a whole cell.
fn merge_args(base: &Value, override_args: Option<&Value>) -> Result<Value> {
    let mut merged = Map::new();
    for (cell, ports) in entries(base) {
        merged.insert(cell, Value::Object(spread(&ports)));
    }
    if let Some(override_args) = override_args {
        for (cell, ports) in entries(override_args) {
            let existing = merged.get(&cell).map(spread).unwrap_or_default();
            let mut combined = existing;
            for (port, value) in spread(&ports) {
                combined.insert(port, value);
            }
            merged.insert(cell, Value::Object(combined));
        }
    }
    Ok(Value::Object(merged))
}

/// A root input port that is wired but unsupplied cannot be answered from
/// the record — the consumer would silently see a dead edge. Surface it.
fn missing_input(manifest: &Manifest, args: &Value) -> Result<Option<String>> {
    let mut wired = BTreeSet::new();
    for edge in &manifest.edges {
        let cell = edge["from"]["cell"].as_str().unwrap_or("");
        let port = edge["from"]["port"].as_str().unwrap_or("");
        wired.insert(format!("{cell}.{port}"));
    }
    for cell in &manifest.cells {
        if cell["kind"].as_str() != Some("input") {
            continue;
        }
        let name = cell["id"].as_str().unwrap_or("");
        for port in object(&cell["outputs"])?.keys() {
            let key = format!("{name}.{port}");
            if wired.contains(&key) && args[name].get(port).is_none() {
                return Ok(Some(key));
            }
        }
    }
    Ok(None)
}

/// Compare a recorded run to a run of the revised manifest. The revised run
/// executes against a replay overlay of `store`, so it never mutates the live
/// store: recorded effects, slot reads, and transport provenance are served
/// from the record; anything the record cannot answer either reaches an
/// admitted live executor or fails as unbound evidence. Returns the
/// `algal.replay-comparison.v1` record and the revised receipt, if one ran.
pub async fn compare(
    receipt: &Value,
    revision: &Value,
    args: Option<&Value>,
    store: &Store,
    host: &Host,
    transports: &Transports,
) -> Result<(Value, Option<Value>)> {
    receipt::validate(receipt)?;
    if runtime::receipt_digest(receipt)? != receipt["digest"] {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "receipt digest does not match its contents",
        ));
    }
    let supplied = digest(revision)?;
    let merged = merge_args(&receipt["args"], args)?;
    let args_digest = digest(&merged)?;

    let base = |verdict: &str, reason: Value| {
        let mut comparison = json!({
            "contract":CONTRACT,
            "receipt":receipt["digest"],
            "manifest":receipt["manifestDigest"],
            "supplied":supplied,
            "revision":Value::Null,
            "args":args_digest,
            "verdict":verdict,
            "prefix":[],
            "prefixTruncated":false,
            "added":[],
            "addedTruncated":false,
            "divergence":Value::Null,
            "outcomes":{"original":receipt["outcome"],"revised":Value::Null},
            "effectsMatch":Value::Null,
            "revisedReceipt":Value::Null,
            "reason":reason,
        });
        comparison["outcomes"]["original"] = receipt["outcome"].clone();
        comparison
    };

    let mut comparison = base("identical", Value::Null);
    let finish = |mut comparison: Value, verdict: &str, reason: Value, revised: Option<Value>| {
        comparison["verdict"] = json!(verdict);
        comparison["reason"] = reason;
        parse(&comparison).map(|record| (record, revised))
    };

    let manifest = match Manifest::parse(revision) {
        Ok(manifest) => manifest,
        Err(error) => {
            return finish(
                comparison,
                "could-not-replay",
                json!({"code":"manifest-invalid","detail":format!("{error}")}),
                None,
            );
        }
    };
    comparison["revision"] = json!(manifest.digest()?);

    // Admission under this host is part of what the record can say: a
    // revision naming an unadmitted tool, an unknown function, or an
    // unresolvable reference cannot run — that is manifest-invalid evidence,
    // not a thrown usage error.
    {
        let mut probe = store.overlay();
        if let Err(error) = crate::graph::compile(
            manifest.clone(),
            &mut probe,
            &host.tool_signatures(),
            transports,
            0,
        ) {
            return finish(
                comparison,
                "could-not-replay",
                json!({"code":"manifest-invalid","detail":format!("{error}")}),
                None,
            );
        }
    }

    if let Some(missing) = missing_input(&manifest, &merged)? {
        return finish(
            comparison,
            "could-not-replay",
            json!({
                "code":"missing-input",
                "path":missing,
                "detail":format!("wired input {missing} has no recorded or supplied value"),
            }),
            None,
        );
    }

    // Recorded inputs the revision may still need — effect answers, slot
    // reads, and transport provenance — are all served by the run's
    // provenance record; the record is authoritative and a live slot or
    // transport is never consulted for a path the run recorded. Tool
    // requests stay strict even though generic effects may fall through to
    // live executors: replay never invokes a live tool.
    let mut run_host = host.clone();
    run_host.replay = Host::replay(&receipt["effects"])?.replay;
    run_host.replay_fallthrough = true;
    run_host.replay_tools_strict = true;
    let revised = runtime::run(
        manifest,
        merged,
        &mut store.overlay(),
        &mut run_host,
        transports,
        Some(receipt),
    )
    .await?;

    comparison["outcomes"]["revised"] = revised["outcome"].clone();
    comparison["revisedReceipt"] = revised["digest"].clone();

    // Activation order: the recorded trace's order governs the shared prefix.
    let order = activation_order(receipt)?;
    let mut divergence = Value::Null;
    let mut prefix: Vec<Value> = Vec::new();
    let mut prefix_truncated = false;
    for path in &order {
        let a = &receipt["cells"][path];
        let b = &revised["cells"][path];
        if !a.is_null() && !b.is_null() && cell_digest(a)? == cell_digest(b)? {
            if prefix.len() < MAX_PREFIX {
                prefix.push(json!({"path":path,"digest":cell_digest(a)?}));
            } else {
                prefix_truncated = true;
            }
            continue;
        }
        divergence = json!({
            "kind":"cell","path":path,
            "original":cell_side(a)?,"revised":cell_side(b)?,
        });
        break;
    }
    comparison["prefix"] = Value::Array(prefix);
    comparison["prefixTruncated"] = json!(prefix_truncated);

    // Revised-only cells: any cell the revised run recorded that the original
    // never activated. Sorted — the listing is deterministic.
    let revised_order = activation_order(&revised)?;
    let mut added: Vec<String> = revised_order
        .iter()
        .filter(|path| receipt["cells"][path.as_str()].is_null())
        .cloned()
        .collect();
    added.sort();
    let added_truncated = added.len() > MAX_ADDED;
    added.truncate(MAX_ADDED);
    comparison["added"] = json!(added);
    comparison["addedTruncated"] = json!(added_truncated);

    if divergence.is_null()
        && let Some(path) = added.first()
    {
        divergence = json!({
            "kind":"cell","path":path,
            "original":Value::Null,"revised":cell_side(&revised["cells"][path.as_str()])?,
        });
    }

    // An unanswered request anywhere in the revised run — not reproduced from
    // the record — means the comparison cannot claim what the revision would
    // do past that point.
    let mut missing_reason = Value::Null;
    for path in &revised_order {
        let rec = &revised["cells"][path];
        if rec["status"].as_str() != Some("failed") || rec.get("failure").is_none() {
            continue;
        }
        let code = rec["failure"]["code"].as_str().unwrap_or("");
        if !MISSING_CODES.contains(&code) {
            continue;
        }
        let a = &receipt["cells"][path];
        if !a.is_null() && same(a, rec)? {
            continue; // the identical failure is part of the record
        }
        if !a.is_null() && a.get("failure").is_some() && same(&a["failure"], &rec["failure"])? {
            continue; // same recorded failure under a diverging record
        }
        let mut reason = json!({
            "code":if code == "INPUT_MISSING" { "missing-input" } else { "missing-effect" },
            "path":path,
            "detail":rec["failure"]["message"],
        });
        if let Some(request) = last_effect_request(&revised, path)? {
            reason["request"] = json!(request);
        }
        missing_reason = reason;
        break;
    }

    let effects_match = same(&receipt["effects"], &revised["effects"])?;

    if divergence.is_null() {
        if !effects_match {
            divergence = json!({
                "kind":"effects","path":Value::Null,"original":Value::Null,"revised":Value::Null,
                "detail":"effect sequences differ",
            });
        } else if receipt["outcome"] != revised["outcome"] {
            divergence = json!({
                "kind":"outcome","path":Value::Null,"original":Value::Null,"revised":Value::Null,
                "detail":format!("{} vs {}", receipt["outcome"].as_str().unwrap_or(""), revised["outcome"].as_str().unwrap_or("")),
            });
        } else if !same(&receipt["failure"], &revised["failure"])? {
            divergence = json!({
                "kind":"failure","path":Value::Null,"original":Value::Null,"revised":Value::Null,
                "detail":format!("{} vs {}",
                    receipt["failure"]["code"].as_str().unwrap_or("none"),
                    revised["failure"]["code"].as_str().unwrap_or("none")),
            });
        } else if !same(&receipt["work"], &revised["work"])? {
            divergence = json!({
                "kind":"work","path":Value::Null,"original":Value::Null,"revised":Value::Null,
                "detail":format!("units {} vs {}",
                    receipt["work"]["units"].as_u64().unwrap_or(0),
                    revised["work"]["units"].as_u64().unwrap_or(0)),
            });
        }
    }

    comparison["divergence"] = divergence;
    comparison["effectsMatch"] = json!(effects_match);

    if !missing_reason.is_null() {
        return finish(
            comparison,
            "could-not-replay",
            missing_reason,
            Some(revised),
        );
    }
    if comparison["divergence"].is_null() {
        return finish(comparison, "identical", Value::Null, Some(revised));
    }
    finish(comparison, "diverged", Value::Null, Some(revised))
}

// ----------------------------------------------------------------- parse ---

fn parse_side(value: &Value, what: &str) -> Result<Value> {
    if value.is_null() {
        return Ok(Value::Null);
    }
    crate::contract::keys(value, &["status", "digest"])?;
    let side = object(value)?;
    let status = json!({
        "status":crate::contract::text(&side["status"], MAX_STATUS_LEN)?,
        "digest":check_digest(side["digest"].as_str().ok_or_else(|| Error::invalid(format!("{what}.digest")))?)?,
    });
    let _ = what;
    Ok(status)
}

fn parse_divergence(value: &Value) -> Result<Value> {
    let o = object(value)?;
    crate::contract::keys(value, &["kind", "path", "original", "revised", "detail"])?;
    let kind = text(&o["kind"], 32)?;
    if !["cell", "effects", "outcome", "work", "failure"].contains(&kind) {
        return Err(Error::invalid(format!(
            "unknown divergence kind \"{kind}\""
        )));
    }
    let path = o.get("path");
    if let Some(path) = path
        && !path.is_null()
    {
        text(path, MAX_PATH_LEN)?;
    }
    let detail = o.get("detail");
    if let Some(detail) = detail {
        text(detail, MAX_DETAIL_LEN)?;
    }
    let original = parse_side(&o["original"], "divergence.original")?;
    let revised = parse_side(&o["revised"], "divergence.revised")?;
    if kind == "cell" {
        if !matches!(path, Some(Value::String(_))) {
            return Err(Error::invalid("cell divergence requires a path"));
        }
        if original.is_null() && revised.is_null() {
            return Err(Error::invalid("cell divergence requires a side"));
        }
    }
    let mut result = json!({
        "kind":kind,
        "path":path.unwrap_or(&Value::Null),
        "original":original,
        "revised":revised,
    });
    if let Some(detail) = detail {
        result["detail"] = detail.clone();
    }
    Ok(result)
}

fn parse_reason(value: &Value) -> Result<Value> {
    let o = object(value)?;
    crate::contract::keys(value, &["code", "path", "request", "detail"])?;
    let code = text(&o["code"], 64)?;
    if !["manifest-invalid", "missing-input", "missing-effect"].contains(&code) {
        return Err(Error::invalid(format!(
            "unknown could-not-replay code \"{code}\""
        )));
    }
    let path = o.get("path");
    if let Some(path) = path {
        text(path, MAX_PATH_LEN)?;
    }
    let request = o.get("request");
    if let Some(request) = request {
        check_digest(
            request
                .as_str()
                .ok_or_else(|| Error::invalid("reason.request"))?,
        )?;
    }
    let detail = o.get("detail");
    if let Some(detail) = detail {
        text(detail, MAX_DETAIL_LEN)?;
    }
    if (code == "missing-input" || code == "missing-effect")
        && !matches!(path, Some(Value::String(_)))
    {
        return Err(Error::invalid(format!("{code} requires a path")));
    }
    let mut result = json!({"code":code});
    if let Some(path) = path {
        result["path"] = path.clone();
    }
    if let Some(request) = request {
        result["request"] = request.clone();
    }
    if let Some(detail) = detail {
        result["detail"] = detail.clone();
    }
    Ok(result)
}

/// Parse an `algal.replay-comparison.v1` record, rejecting unknown keys and
/// enforcing the bounds. The verdict's internal consistency is part of the
/// contract: an identical verdict carries no divergence, a could-not-replay
/// verdict carries its reason.
pub fn parse(value: &Value) -> Result<Value> {
    if canonical(value)?.len() > MAX_BYTES {
        return Err(Error::invalid("replay comparison exceeds its byte bound"));
    }
    let o = object(value)?;
    crate::contract::keys(
        value,
        &[
            "contract",
            "receipt",
            "manifest",
            "supplied",
            "revision",
            "args",
            "verdict",
            "prefix",
            "prefixTruncated",
            "added",
            "addedTruncated",
            "divergence",
            "outcomes",
            "effectsMatch",
            "revisedReceipt",
            "reason",
        ],
    )?;
    if o["contract"] != CONTRACT {
        return Err(Error::invalid(format!("expected contract \"{CONTRACT}\"")));
    }
    let verdict = text(&o["verdict"], 32)?;
    if !["identical", "diverged", "could-not-replay"].contains(&verdict) {
        return Err(Error::invalid(format!("unknown verdict \"{verdict}\"")));
    }

    let prefix_raw = o["prefix"]
        .as_array()
        .ok_or_else(|| Error::invalid("prefix must be an array"))?;
    if prefix_raw.len() > MAX_PREFIX {
        return Err(Error::invalid(format!(
            "prefix must be an array of at most {MAX_PREFIX} entries"
        )));
    }
    let mut prefix = Vec::new();
    for entry in prefix_raw {
        crate::contract::keys(entry, &["path", "digest"])?;
        let path = text(&entry["path"], MAX_PATH_LEN)?;
        if prefix.iter().any(|(p, _): &(String, String)| p == path) {
            return Err(Error::invalid(format!("prefix repeats path \"{path}\"")));
        }
        prefix.push((
            path.to_owned(),
            check_digest(
                entry["digest"]
                    .as_str()
                    .ok_or_else(|| Error::invalid("prefix[].digest"))?,
            )?
            .to_owned(),
        ));
    }

    let added_raw = o["added"]
        .as_array()
        .ok_or_else(|| Error::invalid("added must be an array"))?;
    if added_raw.len() > MAX_ADDED {
        return Err(Error::invalid(format!(
            "added must be an array of at most {MAX_ADDED} entries"
        )));
    }
    let mut added = Vec::new();
    for entry in added_raw {
        added.push(text(entry, MAX_PATH_LEN)?.to_owned());
    }
    let unique: BTreeSet<_> = added.iter().collect();
    if unique.len() != added.len() {
        return Err(Error::invalid("added must contain unique paths"));
    }
    if !added.windows(2).all(|pair| pair[0] <= pair[1]) {
        return Err(Error::invalid("added must be sorted"));
    }

    let outcomes = object(&o["outcomes"])?;
    crate::contract::keys(&o["outcomes"], &["original", "revised"])?;
    let original_outcome = text(&outcomes["original"], 32)?;
    let revised_outcome = &outcomes["revised"];
    if !revised_outcome.is_null() {
        text(revised_outcome, 32)?;
    }

    let prefix_truncated = o["prefixTruncated"] == true;
    let added_truncated = o["addedTruncated"] == true;
    let effects_match = &o["effectsMatch"];
    if !effects_match.is_null() && !effects_match.is_boolean() {
        return Err(Error::invalid("effectsMatch must be a boolean or null"));
    }
    let divergence = match o.get("divergence") {
        None | Some(Value::Null) => Value::Null,
        Some(divergence) => parse_divergence(divergence)?,
    };
    let reason = match o.get("reason") {
        None | Some(Value::Null) => Value::Null,
        Some(reason) => parse_reason(reason)?,
    };
    let revision = &o["revision"];
    if !revision.is_null() {
        check_digest(
            revision
                .as_str()
                .ok_or_else(|| Error::invalid("revision"))?,
        )?;
    }
    let revised_receipt = &o["revisedReceipt"];
    if !revised_receipt.is_null() {
        check_digest(
            revised_receipt
                .as_str()
                .ok_or_else(|| Error::invalid("revisedReceipt"))?,
        )?;
    }

    // Verdict coherence: the record may not claim a verdict its fields deny.
    if verdict == "could-not-replay" && reason.is_null() {
        return Err(Error::invalid("could-not-replay requires a reason"));
    }
    if verdict != "could-not-replay" && !reason.is_null() {
        return Err(Error::invalid("reason is present only on could-not-replay"));
    }
    if verdict == "identical"
        && (!divergence.is_null()
            || effects_match != &Value::Bool(true)
            || !added.is_empty()
            || revised_outcome.is_null()
            || revised_outcome != &json!(original_outcome)
            || revised_receipt.is_null())
    {
        return Err(Error::invalid("identical verdict contradicts its evidence"));
    }
    if verdict == "diverged" && revised_receipt.is_null() {
        return Err(Error::invalid("diverged requires a revised receipt"));
    }
    if verdict == "diverged"
        && divergence.is_null()
        && effects_match == &Value::Bool(true)
        && revised_outcome == &json!(original_outcome)
        && added.is_empty()
    {
        return Err(Error::invalid("diverged verdict shows no divergence"));
    }
    if !reason.is_null() && reason["code"] == "manifest-invalid" && !revised_receipt.is_null() {
        return Err(Error::invalid(
            "manifest-invalid carries no revised receipt",
        ));
    }

    Ok(json!({
        "contract":CONTRACT,
        "receipt":check_digest(o["receipt"].as_str().ok_or_else(|| Error::invalid("receipt"))?)?,
        "manifest":check_digest(o["manifest"].as_str().ok_or_else(|| Error::invalid("manifest"))?)?,
        "supplied":check_digest(o["supplied"].as_str().ok_or_else(|| Error::invalid("supplied"))?)?,
        "revision":revision,
        "args":check_digest(o["args"].as_str().ok_or_else(|| Error::invalid("args"))?)?,
        "verdict":verdict,
        "prefix":prefix.iter().map(|(path, digest)| json!({"path":path,"digest":digest})).collect::<Vec<_>>(),
        "prefixTruncated":prefix_truncated,
        "added":added,
        "addedTruncated":added_truncated,
        "divergence":divergence,
        "outcomes":{"original":original_outcome,"revised":revised_outcome},
        "effectsMatch":effects_match,
        "revisedReceipt":revised_receipt,
        "reason":reason,
    }))
}

// ------------------------------------------------------------------ tests ---

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest() -> Value {
        json!({
            "contract":"algal.organism.v1",
            "key":"organism:replay-test",
            "name":"Replay test",
            "cells":[
                {"id":"q","kind":"input","outputs":{"ask":"text"}},
                {"id":"answer","kind":"agent","inputs":{"ask":"text"},
                 "prompt":"Answer briefly.","output":{"kind":"text"}}
            ],
            "edges":[{"from":{"cell":"q","port":"ask"},"to":{"cell":"answer","port":"ask"}}],
            "budgets":{"maxSteps":16,"maxAgentCalls":4,"maxWork":100000,
                       "maxContextBytes":8192,"maxOutputBytes":8192,"maxDepth":2}
        })
    }

    fn parsed_manifest() -> Manifest {
        Manifest::parse(&manifest()).unwrap()
    }

    async fn recorded(store: &mut Store) -> Value {
        let mut host = Host::scripted(json!({"answer":"hello"}));
        runtime::run(
            parsed_manifest(),
            json!({"q":{"ask":"hi"}}),
            store,
            &mut host,
            &Transports::new(),
            None,
        )
        .await
        .unwrap()
    }

    fn prefixes(comparison: &Value) -> Vec<String> {
        comparison["prefix"]
            .as_array()
            .unwrap()
            .iter()
            .map(|entry| entry["path"].as_str().unwrap().to_owned())
            .collect()
    }

    #[tokio::test]
    async fn identical_revision_reproduces_the_whole_recorded_trace() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let host = Host::scripted(json!({"answer":"hello"}));
        let (comparison, revised) = compare(
            &receipt,
            &manifest(),
            None,
            &store,
            &host,
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(comparison["verdict"], "identical");
        assert_eq!(prefixes(&comparison), vec!["q", "answer"]);
        assert!(comparison["divergence"].is_null());
        assert_eq!(comparison["effectsMatch"], true);
        assert_eq!(comparison["revisedReceipt"], receipt["digest"]);
        assert_eq!(revised.unwrap()["digest"], receipt["digest"]);
        // the emitted record reparses through the same validator
        assert_eq!(parse(&comparison).unwrap(), comparison);
    }

    #[tokio::test]
    async fn changed_prompt_names_the_first_divergent_cell_and_both_sides() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let mut revision = manifest();
        revision["cells"][1]["prompt"] = json!("Answer verbosely.");
        let host = Host::scripted(json!({"answer":"a much longer answer"}));
        let (comparison, revised) =
            compare(&receipt, &revision, None, &store, &host, &Transports::new())
                .await
                .unwrap();
        assert_eq!(comparison["verdict"], "diverged");
        assert_eq!(prefixes(&comparison), vec!["q"]);
        assert_eq!(comparison["divergence"]["kind"], "cell");
        assert_eq!(comparison["divergence"]["path"], "answer");
        assert_eq!(comparison["divergence"]["original"]["status"], "committed");
        assert_eq!(comparison["divergence"]["revised"]["status"], "committed");
        assert_eq!(comparison["outcomes"]["revised"], "complete");
        assert_eq!(
            revised.as_ref().unwrap()["cells"]["answer"]["outputs"]["out"],
            "a much longer answer"
        );
    }

    #[tokio::test]
    async fn unanswerable_effect_request_stops_the_comparison_honestly() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let mut revision = manifest();
        revision["cells"][1]["prompt"] = json!("Answer verbosely.");
        // No live executor is admitted: the record cannot answer the new
        // request and replay invents nothing.
        let (comparison, revised) = compare(
            &receipt,
            &revision,
            None,
            &store,
            &Host::default(),
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(comparison["verdict"], "could-not-replay");
        assert_eq!(comparison["reason"]["code"], "missing-effect");
        assert_eq!(comparison["reason"]["path"], "answer");
        assert!(
            comparison["reason"]["request"]
                .as_str()
                .unwrap()
                .starts_with("sha256:")
        );
        assert_eq!(prefixes(&comparison), vec!["q"]);
        assert_eq!(revised.unwrap()["outcome"], "failed");
        assert!(!comparison["revisedReceipt"].is_null());
    }

    #[tokio::test]
    async fn wired_input_the_record_cannot_supply_reports_missing_input() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let mut revision = manifest();
        revision["cells"][0]["outputs"]["extra"] = json!("text");
        revision["cells"].as_array_mut().unwrap().push(json!({
            "id":"probe","kind":"expr",
            "expr":{"contract":"algal.expr.v1","program":["get","x"]},
            "output":{"kind":"json","schema":{"type":"string"}},
            "inputs":{"x":"text"}
        }));
        revision["edges"].as_array_mut().unwrap().push(json!({
            "from":{"cell":"q","port":"extra"},"to":{"cell":"probe","port":"x"}
        }));
        let (comparison, revised) = compare(
            &receipt,
            &revision,
            None,
            &store,
            &Host::default(),
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(comparison["verdict"], "could-not-replay");
        assert_eq!(comparison["reason"]["code"], "missing-input");
        assert_eq!(comparison["reason"]["path"], "q.extra");
        assert!(comparison["revisedReceipt"].is_null());
        assert!(revised.is_none());
    }

    #[tokio::test]
    async fn inadmissible_revision_reports_manifest_invalid() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let (comparison, revised) = compare(
            &receipt,
            &json!({"contract":"algal.organism.v1","key":"bogus"}),
            None,
            &store,
            &Host::default(),
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(comparison["verdict"], "could-not-replay");
        assert_eq!(comparison["reason"]["code"], "manifest-invalid");
        assert!(revised.is_none());
    }

    #[tokio::test]
    async fn supplied_args_merge_over_the_recorded_args() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let host = Host::scripted(json!({"answer":"new answer"}));
        let (comparison, _) = compare(
            &receipt,
            &manifest(),
            Some(&json!({"q":{"ask":"changed question"}})),
            &store,
            &host,
            &Transports::new(),
        )
        .await
        .unwrap();
        // the input cell's own record changes first — divergence starts at q
        assert_eq!(comparison["verdict"], "diverged");
        assert_eq!(comparison["divergence"]["path"], "q");
    }

    #[tokio::test]
    async fn tampered_receipt_digest_is_refused_before_comparison() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let mut forged = receipt.clone();
        forged["outcome"] = json!("failed");
        let error = compare(
            &forged,
            &manifest(),
            None,
            &store,
            &Host::default(),
            &Transports::new(),
        )
        .await
        .unwrap_err();
        assert_eq!(error.code, "DIGEST_MISMATCH");
    }

    #[tokio::test]
    async fn replay_never_invokes_a_live_tool() {
        // the revision adds a mailbox.send tool cell fed by a cap port; the
        // tool signature is admitted but the record holds no receipt for the
        // request — strict tool replay must fail closed
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let mut revision = manifest();
        revision["cells"][0]["outputs"]["box"] = json!({"type":"cap","capability":"mailbox-send"});
        revision["cells"].as_array_mut().unwrap().push(json!({
            "id":"notify","kind":"tool","tool":"mailbox.send.v1"
        }));
        revision["edges"].as_array_mut().unwrap().push(json!({
            "from":{"cell":"answer","port":"out"},"to":{"cell":"notify","port":"message"}
        }));
        revision["edges"].as_array_mut().unwrap().push(json!({
            "from":{"cell":"q","port":"box"},"to":{"cell":"notify","port":"mailbox"}
        }));
        let mut args = json!({"q":{"ask":"hi"}});
        args["q"]["box"] = json!("cap:mailbox-send:sha256:00");
        let (comparison, _) = compare(
            &receipt,
            &revision,
            Some(&args),
            &store,
            &Host::scripted(json!({"answer":"hello"})),
            &Transports::new(),
        )
        .await
        .unwrap();
        // the cap arg cannot parse, or the tool request has no recorded
        // receipt — either way the comparison never fabricates an answer
        assert_eq!(comparison["verdict"], "could-not-replay");
    }

    #[tokio::test]
    async fn comparison_is_deterministic() {
        let mut store = Store::default();
        let receipt = recorded(&mut store).await;
        let mut revision = manifest();
        revision["cells"][1]["prompt"] = json!("Answer verbosely.");
        let host = Host::scripted(json!({"answer":"x"}));
        let a = compare(&receipt, &revision, None, &store, &host, &Transports::new())
            .await
            .unwrap();
        let b = compare(&receipt, &revision, None, &store, &host, &Transports::new())
            .await
            .unwrap();
        assert_eq!(canonical(&a.0).unwrap(), canonical(&b.0).unwrap());
        assert_eq!(a.1.unwrap()["digest"], b.1.unwrap()["digest"]);
    }

    #[test]
    fn merge_args_overrides_per_port_never_per_cell() {
        let base = json!({"q":{"ask":"hi","other":1},"z":{"k":"v"}});
        let merged = merge_args(&base, Some(&json!({"q":{"ask":"changed"}}))).unwrap();
        assert_eq!(merged["q"]["ask"], "changed");
        assert_eq!(merged["q"]["other"], 1);
        assert_eq!(merged["z"]["k"], "v");
        // an unknown override cell lands alongside the recorded args
        let merged = merge_args(&base, Some(&json!({"new":{"p":true}}))).unwrap();
        assert_eq!(merged["new"]["p"], true);
    }

    #[test]
    fn record_parse_rejects_incoherent_verdicts_and_bad_digests() {
        let good = json!({
            "contract":"algal.replay-comparison.v1",
            "receipt":format!("sha256:{}", "1".repeat(64)),
            "manifest":format!("sha256:{}", "2".repeat(64)),
            "supplied":format!("sha256:{}", "3".repeat(64)),
            "revision":format!("sha256:{}", "4".repeat(64)),
            "args":format!("sha256:{}", "5".repeat(64)),
            "verdict":"identical",
            "prefix":[{"path":"q","digest":format!("sha256:{}", "6".repeat(64))}],
            "prefixTruncated":false,
            "added":[],"addedTruncated":false,
            "divergence":Value::Null,
            "outcomes":{"original":"complete","revised":"complete"},
            "effectsMatch":true,
            "revisedReceipt":format!("sha256:{}", "7".repeat(64)),
            "reason":Value::Null
        });
        assert_eq!(parse(&good).unwrap(), good);
        for mutate in [
            |v: &mut Value| v["contract"] = json!("algal.other.v1"),
            |v: &mut Value| {
                v.as_object_mut()
                    .unwrap()
                    .insert("extra".into(), json!(true));
            },
            |v: &mut Value| v["receipt"] = json!("not-a-digest"),
            |v: &mut Value| v["verdict"] = json!("could-not-replay"),
            |v: &mut Value| {
                v["verdict"] = json!("diverged");
                v["divergence"] = Value::Null;
            },
            |v: &mut Value| v["added"] = json!(["b", "a"]),
        ] {
            let mut bad = good.clone();
            mutate(&mut bad);
            assert!(parse(&bad).is_err(), "accepted {bad}");
        }
    }
}
