use crate::{
    Error, Result,
    canonical::{canonical, digest},
    contract::{id, integer, keys, list},
};
use serde_json::{Value, json};
use std::collections::BTreeSet;

pub fn compact(source: &Value, policy: &Value) -> Result<Value> {
    keys(source, &["contract", "items"])?;
    keys(policy, &["maxBytes", "keepRecent"])?;
    if source["contract"] != "algal.context.v1" {
        return Err(Error::invalid("context contract"));
    }
    if canonical(source)?.len() > 1_048_576 {
        return Err(Error::limit("context archive bytes"));
    }
    let target = integer(&policy["maxBytes"], 128, 262_144)?;
    let recent = integer(&policy["keepRecent"], 0, 64)?;
    let items = list(&source["items"], 64)?;
    let mut ids = BTreeSet::new();
    for item in items {
        keys(item, &["id", "role", "content", "pinned"])?;
        if !ids.insert(id(&item["id"])?) {
            return Err(Error::invalid("duplicate context item id"));
        }
        if !["system", "user", "assistant", "tool"]
            .iter()
            .any(|role| item["role"] == *role)
        {
            return Err(Error::invalid("context role"));
        }
        if item.get("content").is_none() {
            return Err(Error::invalid("context content required"));
        }
        if item.get("pinned").is_some_and(|v| !v.is_boolean()) {
            return Err(Error::invalid("pinned must be boolean"));
        }
    }
    let mut view = items.clone();
    let before = canonical(&json!(view))?.len();
    let protected_tail = items.len().saturating_sub(recent);
    let mut elided = Vec::new();
    for index in 0..protected_tail {
        if canonical(&json!(view))?.len() <= target {
            break;
        }
        let item = &items[index];
        if item["pinned"] == true || item["role"] == "system" || item["role"] == "user" {
            continue;
        }
        let reference = digest(item)?;
        let stub = json!({"id":item["id"],"role":item["role"],"ref":reference});
        if canonical(&stub)?.len() >= canonical(item)?.len() {
            continue;
        }
        view[index] = stub;
        elided.push(json!({"id":item["id"],"ref":reference}));
    }
    let after = canonical(&json!(view))?.len();
    if after > target {
        return Err(Error::limit(
            "protected context cannot fit; request a larger budget or explicit new task boundary",
        ));
    }
    Ok(json!({
        "contract":"algal.context-view.v1", "source":digest(source)?, "policy":policy,
        "items":view, "elided":elided, "beforeBytes":before, "afterBytes":after,
        "semanticSummary":false,
    }))
}

pub fn recall(source: &Value, reference: &str) -> Result<Value> {
    for item in list(&source["items"], 64)? {
        if digest(item)? == reference {
            return Ok(item.clone());
        }
    }
    Err(Error::new(
        "STORE_MISS",
        "context source does not contain requested item",
    ))
}

pub fn verify(source: &Value, view: &Value) -> Result<bool> {
    Ok(canonical(&compact(source, &view["policy"])?)? == canonical(view)?)
}

/// Deterministic model-facing projection; callers retain the original tool log
/// in receipts and enforce the full context byte bound after this pass.
/// maxLogBytes is a soft target: protected metadata and tail are never removed.
pub fn elide_tool_context(context: &Value, policy: &Value, max_context: usize) -> Result<Value> {
    let Some(log) = context["toolLog"].as_array() else {
        return Ok(context.clone());
    };
    let max_log = policy["maxLogBytes"].as_u64().unwrap() as usize;
    if canonical(&json!(log))?.len() <= max_log && canonical(context)?.len() <= max_context {
        return Ok(context.clone());
    }
    let pinned = policy["keepRecent"].as_u64().unwrap_or(0) as usize;
    let mut view = context.clone();
    for (index, entry) in log
        .iter()
        .take(log.len().saturating_sub(pinned))
        .enumerate()
    {
        if canonical(&view["toolLog"])?.len() <= max_log && canonical(&view)?.len() <= max_context {
            break;
        }
        let output = &entry["output"];
        if output["contract"] == "algal.tool-output-ref.v1" {
            continue;
        }
        let bytes = canonical(output)?.len();
        let stub =
            json!({"contract":"algal.tool-output-ref.v1","source":digest(output)?,"bytes":bytes});
        if canonical(&stub)?.len() >= bytes {
            continue;
        }
        view["toolLog"][index]["output"] = stub;
    }
    Ok(view)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compaction_keeps_user_intent_and_exact_recall() {
        let source = json!({"contract":"algal.context.v1","items":[
            {"id":"goal","role":"user","content":"Do not change the API"},
            {"id":"log","role":"tool","content":"verbose test output ".repeat(200)},
            {"id":"decision","role":"assistant","content":"Keep parser","pinned":true},
            {"id":"recent","role":"assistant","content":"Next step"}
        ]});
        let before = source.clone();
        let view = compact(&source, &json!({"maxBytes":512,"keepRecent":1})).unwrap();
        assert_eq!(source, before);
        assert_eq!(view["items"][0]["content"], source["items"][0]["content"]);
        assert_eq!(view["items"][2]["content"], source["items"][2]["content"]);
        assert_eq!(
            recall(&source, view["items"][1]["ref"].as_str().unwrap()).unwrap(),
            source["items"][1]
        );
        assert!(verify(&source, &view).unwrap());
        assert!(view["afterBytes"].as_u64().unwrap() < view["beforeBytes"].as_u64().unwrap());
    }

    #[test]
    fn tool_projection_preserves_source_tail_and_unicode_provenance() {
        let source = json!({"inputs":{}, "turn":2, "toolLog":[
            {"fn":"echo.v1", "inputs":{"value":"a"}, "output":{"value":"🍄".repeat(300)}},
            {"fn":"echo.v1", "inputs":{"value":"b"}, "output":{"value":"b".repeat(300)}}
        ]});
        let before = source.clone();
        let policy = json!({"mode":"elide", "maxLogBytes":400, "keepRecent":1});
        let view = elide_tool_context(&source, &policy, 800).unwrap();
        assert_eq!(source, before);
        assert_eq!(view["toolLog"][0]["inputs"], source["toolLog"][0]["inputs"]);
        assert_eq!(view["toolLog"][0]["fn"], source["toolLog"][0]["fn"]);
        assert_eq!(view["toolLog"][1], source["toolLog"][1]);
        assert_eq!(
            view["toolLog"][0]["output"],
            json!({
                "contract":"algal.tool-output-ref.v1", "source":digest(&source["toolLog"][0]["output"]).unwrap(),
                "bytes":canonical(&source["toolLog"][0]["output"]).unwrap().len()
            })
        );
        assert_eq!(elide_tool_context(&view, &policy, 800).unwrap(), view);
        assert!(canonical(&view).unwrap().len() < canonical(&source).unwrap().len());
        let protected = json!({"mode":"elide", "maxLogBytes":1, "keepRecent":2});
        assert_eq!(
            elide_tool_context(&source, &protected, 800).unwrap(),
            source
        );
    }

    #[test]
    fn tool_projection_preserves_small_bodies_and_fits_full_context() {
        let source = json!({"inputs":{}, "turn":1, "note":"n".repeat(400), "toolLog":[
            {"fn":"echo.v1", "inputs":{"value":"a"}, "output":{"value":"a".repeat(500)}}
        ]});
        let policy = json!({"mode":"elide", "maxLogBytes":2000, "keepRecent":0});
        assert_eq!(elide_tool_context(&source, &policy, 2000).unwrap(), source);
        let view = elide_tool_context(&source, &policy, 800).unwrap();
        assert!(canonical(&view).unwrap().len() <= 800);
        assert_eq!(view["note"], source["note"]);
        let small =
            json!({"toolLog":[{"fn":"inc.v1", "inputs":{"value":1}, "output":{"value":2}}]});
        assert_eq!(
            elide_tool_context(&small, &json!({"maxLogBytes":1}), 1).unwrap(),
            small
        );
    }

    #[test]
    fn never_silently_drops_an_oversized_standing_task() {
        let source = json!({"contract":"algal.context.v1","items":[{"id":"goal","role":"user","content":"x".repeat(1024)}]});
        assert!(compact(&source, &json!({"maxBytes":128,"keepRecent":0})).is_err());
    }
}
