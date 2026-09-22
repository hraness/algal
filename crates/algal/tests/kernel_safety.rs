use algal::{contract::Manifest, effects::Host, graph::compile, runtime, store::Store};
use serde_json::{Value, json};

fn manifest(mut value: Value) -> Manifest {
    value["contract"] = json!("algal.organism.v1");
    value["key"] = json!("organism:safety");
    value["name"] = json!("Safety");
    Manifest::parse(&value).unwrap()
}

async fn run(manifest: Manifest, store: &mut Store) -> Value {
    runtime::run(
        manifest,
        json!({}),
        store,
        &mut Host::default(),
        &Default::default(),
        None,
    )
    .await
    .unwrap()
}

#[tokio::test]
async fn agent_tool_arguments_cannot_extend_the_host_signature() {
    let m = manifest(
        json!({"cells":[{"id":"agent","kind":"agent","prompt":"Call the admitted tool","tools":["pick.v1"],"output":{"kind":"text"}}]}),
    );
    let responses = json!({"agent":[{"tool":"pick.v1","inputs":{"record":{"name":"ok"},"field":"name","hidden":true}},"done"]});
    let receipt = runtime::run(
        m,
        json!({}),
        &mut Store::default(),
        &mut Host::scripted(responses),
        &Default::default(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(receipt["failure"]["code"], "TYPE_MISMATCH");
    assert_eq!(
        receipt["failure"]["message"],
        "tool pick.v1 received undeclared input hidden"
    );
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn compaction_decisions_obey_effect_output_bounds() {
    let m = manifest(
        json!({"cells":[{"id":"agent","kind":"agent","prompt":"Use the tool","tools":["pick.v1"],
        "compact":{"maxLogBytes":1},"budget":{"maxOutputBytes":128,"maxTurns":3},"output":{"kind":"text"}}]}),
    );
    let responses = json!({"agent":[{"tool":"pick.v1","inputs":{"record":{"name":"ok"},"field":"name"}},
        {"answers":{"keep_0":{"noul":0.1}},"extra":"x".repeat(1024)},"done"]});
    let mut store = Store::default();
    let receipt = runtime::run(
        m.clone(),
        json!({}),
        &mut store,
        &mut Host::scripted(responses),
        &Default::default(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(receipt["failure"]["code"], "BUDGET_EXHAUSTED");
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 2);
    assert_eq!(
        runtime::verify(&receipt, m, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

#[tokio::test]
async fn expr_schema_failure_is_replayable() {
    let m = manifest(
        json!({"cells":[{"id":"answer","kind":"expr","expr":{"contract":"algal.expr.v1","program":42},
        "output":{"kind":"json","schema":{"type":"object","required":["answer"]}}}]}),
    );
    let mut store = Store::default();
    let receipt = run(m.clone(), &mut store).await;
    assert_eq!(receipt["outcome"], "failed");
    assert_eq!(
        receipt["cells"]["answer"]["failure"]["code"],
        "TYPE_MISMATCH"
    );
    assert_eq!(
        runtime::verify(&receipt, m, &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}

#[tokio::test]
async fn capability_json_bridges_and_incompatible_carries_are_rejected() {
    let mut store = Store::default();
    let child = manifest(
        json!({"cells":[{"id":"input","kind":"input","outputs":{"value":{"type":"cap","capability":"mailbox-send"}}}],
        "interface":{"inputs":{"value":{"cell":"input","port":"value"}},"outputs":{"value":{"cell":"input","port":"value"}}}}),
    );
    let digest = store.admit(&child).unwrap();
    let each = manifest(
        json!({"cells":[{"id":"map","kind":"each","manifest":digest,"over":"value","maxItems":2}]}),
    );
    assert_eq!(
        compile(
            each,
            &mut store,
            &Default::default(),
            &Default::default(),
            0
        )
        .err()
        .unwrap()
        .code,
        "TYPE_MISMATCH"
    );
    let spawn = manifest(json!({"cells":[
        {"id":"definition","kind":"const","outputs":{"value":{"type":"json","value":child.value}}},
        {"id":"child","kind":"spawn"}],
        "edges":[{"from":{"cell":"definition","port":"value"},"to":{"cell":"child","port":"manifest"}}]}));
    let receipt = run(spawn, &mut store).await;
    assert_eq!(receipt["failure"]["code"], "TYPE_MISMATCH");
    assert!(receipt["cells"].get("child/input").is_none());
    let typed = manifest(json!({"cells":[{"id":"child","kind":"organism","manifest":digest}]}));
    assert!(
        compile(
            typed,
            &mut store,
            &Default::default(),
            &Default::default(),
            0
        )
        .is_ok()
    );

    let child = manifest(json!({"cells":[
        {"id":"input","kind":"input","outputs":{"value":"text"}},
        {"id":"answer","kind":"const","outputs":{"value":{"type":"json","value":42}}}],
        "interface":{"inputs":{"value":{"cell":"input","port":"value"}},"outputs":{"value":{"cell":"answer","port":"value"}}}}));
    let digest = store.admit(&child).unwrap();
    let parent = manifest(
        json!({"cells":[{"id":"loop","kind":"repeat","manifest":digest,"maxRounds":2,"carry":{"value":"value"}}]}),
    );
    assert_eq!(
        compile(
            parent,
            &mut store,
            &Default::default(),
            &Default::default(),
            0
        )
        .err()
        .unwrap()
        .code,
        "TYPE_MISMATCH"
    );
}

#[tokio::test]
async fn guard_failure_and_budget_exhaustion_retain_execution_evidence() {
    for program in [json!(1), json!(["div", 1, 0]), json!(false)] {
        let m = manifest(
            json!({"budgets":{"maxWork":if program == false {100} else {1000}}, "cells":[
            {"id":"source","kind":"const","outputs":{"value":{"type":"json","value":1}}},
            {"id":"sink","kind":"store"}],
            "edges":[{"from":{"cell":"source","port":"value"},"to":{"cell":"sink","port":"data"},
                "guard":{"expr":{"contract":"algal.expr.v1","program":program}}}]}),
        );
        let mut store = Store::default();
        let receipt = run(m.clone(), &mut store).await;
        assert_eq!(receipt["outcome"], "failed");
        assert_eq!(
            receipt["failure"]["code"],
            if program == false {
                "BUDGET_EXHAUSTED"
            } else {
                "GUARD_INVALID"
            }
        );
        assert_eq!(receipt["failure"]["path"], "sink");
        assert_eq!(receipt["cells"]["source"]["status"], "committed");
        assert!(receipt["cells"].get("sink").is_none());
        assert_eq!(
            runtime::verify(&receipt, m, &store, &Host::default())
                .await
                .unwrap()["ok"],
            true
        );
    }
}

#[tokio::test]
async fn guard_evaluation_uses_edge_order_not_port_name_order() {
    let m = manifest(json!({"cells":[
        {"id":"source","kind":"const","outputs":{"value":{"type":"json","value":1}}},
        {"id":"sink","kind":"expr","inputs":{"a":"json","z":"json"},"expr":{"contract":"algal.expr.v1","program":true},"output":{"kind":"json","schema":{"type":"boolean"}}}],
        "edges":[
            {"from":{"cell":"source","port":"value"},"to":{"cell":"sink","port":"z"},"guard":{"expr":{"contract":"algal.expr.v1","program":3}}},
            {"from":{"cell":"source","port":"value"},"to":{"cell":"sink","port":"a"},"guard":{"expr":{"contract":"algal.expr.v1","program":["div",1,0]}}}]}));
    let receipt = run(m, &mut Store::default()).await;
    assert_eq!(
        receipt["failure"]["message"],
        "guard expr must produce boolean, got number"
    );
    assert_eq!(receipt["work"]["units"], 101);
}
