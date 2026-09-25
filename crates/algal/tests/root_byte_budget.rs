use algal::{
    canonical::{canonical, digest},
    contract::Manifest,
    effects::Host,
    runtime,
    store::Store,
};
use serde_json::json;

#[tokio::test]
async fn root_bytes_bound_agent_and_recall_in_flat_and_nested_runs() {
    for nested in [false, true] {
        for kind in ["agent", "recall"] {
            for field in ["maxContextBytes", "maxOutputBytes"] {
                for mode in [
                    "default",
                    "narrow",
                    "equal",
                    "widen",
                    "positive",
                    "exact",
                    "one-below",
                ] {
                    let case = format!("{nested}/{kind}/{field}/{mode}");
                    let context_bytes = if kind == "agent" { 22 } else { 13 };
                    let output = if kind == "agent" {
                        json!("ok")
                    } else {
                        json!({"hits":[]})
                    };
                    let output_bytes = if kind == "agent" { 4 } else { 11 };
                    let actual_bytes = if field == "maxContextBytes" {
                        context_bytes
                    } else {
                        output_bytes
                    };
                    let root_limit = match mode {
                        "narrow" | "positive" => 65_536,
                        "exact" => actual_bytes,
                        "one-below" => actual_bytes - 1,
                        _ => 1,
                    };
                    let cell_limit = if mode == "narrow" || mode == "equal" {
                        1
                    } else {
                        65_536
                    };
                    let mut root_budget = json!({"maxContextBytes":65536,"maxOutputBytes":65536});
                    root_budget[field] = json!(root_limit);
                    let mut effective_budget = root_budget.clone();
                    let effective_limit = if mode == "default" {
                        root_limit
                    } else {
                        root_limit.min(cell_limit)
                    };
                    effective_budget[field] = json!(effective_limit);
                    let admitted = effective_limit >= actual_bytes;
                    let dispatched = admitted || field == "maxOutputBytes";
                    let mut cell = if kind == "agent" {
                        json!({"id":"cell","kind":"agent","prompt":"fixture","output":{"kind":"text"}})
                    } else {
                        json!({"id":"cell","kind":"recall","query":{"contract":"algal.expr.v1","program":"q"}})
                    };
                    if mode != "default" {
                        cell["budget"] = json!({"maxContextBytes":65536,"maxOutputBytes":65536});
                        cell["budget"][field] = json!(cell_limit);
                    }
                    let mut child = json!({
                        "contract":"algal.organism.v1","key":"organism:byte-bound-child","name":"Byte bound child",
                        "interface":{"inputs":{},"outputs":{"out":{"cell":"cell","port":"out"}}},
                        "cells":[cell],"edges":[]
                    });
                    if !nested {
                        child["budgets"] = root_budget.clone();
                    }
                    let child = Manifest::parse(&child).unwrap();
                    let mut store = Store::default();
                    let manifest = if nested {
                        let child_digest = store.admit(&child).unwrap();
                        Manifest::parse(&json!({
                            "contract":"algal.organism.v1","key":"organism:byte-bound-root","name":"Byte bound root",
                            "budgets":root_budget,"cells":[{"id":"sub","kind":"organism","manifest":child_digest}],"edges":[]
                        })).unwrap()
                    } else {
                        child
                    };
                    let context = if kind == "agent" {
                        json!({"inputs":{},"turn":0})
                    } else {
                        json!({"inputs":{}})
                    };
                    let output_contract = if kind == "agent" {
                        json!({"kind":"text"})
                    } else {
                        json!({"kind":"json","schema":{"type":"object","required":["hits"],"properties":{"hits":{"type":"array"}}}})
                    };
                    let mut request = json!({
                        "contract":"algal.effect.v1","cellId":"cell","kind":kind,
                        "prompt":if kind == "agent" { "fixture" } else { "" },
                        "context":context,"output":output_contract,"budget":effective_budget
                    });
                    if kind == "recall" {
                        request["recall"] = json!({"query":"q","k":8,"embedder":"local"});
                    }
                    assert_eq!(
                        canonical(&request["context"]).unwrap().len(),
                        context_bytes,
                        "{case}"
                    );
                    assert_eq!(canonical(&output).unwrap().len(), output_bytes, "{case}");
                    let request_digest = digest(&request).unwrap();
                    // No cell-name fallback: only the exact bounded request is
                    // served. A widened request cannot silently get this output.
                    let mut responses = json!({});
                    responses[&request_digest] = output.clone();
                    let receipt = runtime::run(
                        manifest.clone(),
                        json!({}),
                        &mut store,
                        &mut Host::scripted(responses),
                        &Default::default(),
                        None,
                    )
                    .await
                    .unwrap();
                    assert_eq!(
                        receipt["effects"].as_array().unwrap().len(),
                        usize::from(dispatched),
                        "{case}"
                    );
                    if dispatched {
                        assert_eq!(
                            receipt["effects"][0]["requestDigest"], request_digest,
                            "{case}"
                        );
                        assert_eq!(receipt["effects"][0]["output"], output, "{case}");
                    }
                    let leaf_work = 100
                        + usize::from(kind == "recall")
                        + if dispatched { 500 + context_bytes } else { 0 }
                        + if admitted { output_bytes } else { 0 };
                    assert_eq!(
                        receipt["work"],
                        json!({"steps":if nested {2} else {1},"agentCalls":usize::from(dispatched),"units":leaf_work+if nested {100} else {0}}),
                        "{case}"
                    );
                    let leaf_path = if nested { "sub/cell" } else { "cell" };
                    assert_eq!(receipt["cells"][leaf_path]["work"], leaf_work, "{case}");
                    assert_eq!(
                        receipt["cells"][leaf_path]["status"],
                        if admitted { "committed" } else { "failed" },
                        "{case}"
                    );
                    assert_eq!(
                        receipt["cells"][leaf_path].get("outputs"),
                        if admitted {
                            Some(json!({"out":output}))
                        } else {
                            None
                        }
                        .as_ref(),
                        "{case}"
                    );
                    assert_eq!(
                        receipt["outcome"],
                        if admitted { "complete" } else { "failed" },
                        "{case}"
                    );
                    if admitted {
                        assert!(receipt.get("failure").is_none(), "{case}");
                    } else {
                        assert_eq!(receipt["failure"]["code"], "BUDGET_EXHAUSTED", "{case}");
                        assert_eq!(receipt["failure"]["path"], leaf_path, "{case}");
                    }
                    if nested {
                        assert_eq!(receipt["cells"]["sub"]["work"], leaf_work + 100, "{case}");
                        assert_eq!(
                            receipt["cells"]["sub"]["status"],
                            if admitted { "committed" } else { "failed" },
                            "{case}"
                        );
                        assert_eq!(
                            receipt["cells"]["sub"].get("outputs"),
                            if admitted {
                                Some(json!({"out":output}))
                            } else {
                                None
                            }
                            .as_ref(),
                            "{case}"
                        );
                    }
                    assert_eq!(
                        runtime::verify(&receipt, manifest, &store, &Host::default())
                            .await
                            .unwrap()["ok"],
                        true,
                        "{case}"
                    );
                }
            }
        }
    }
}
