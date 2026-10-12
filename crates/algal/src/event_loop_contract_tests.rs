use crate::{canonical::digest, event_loop_contract::parse_event_loop_trace};
use serde_json::{Value, json};

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap()
}
fn seal(trace: &mut Value) {
    let behavior = trace["behavior"].clone();
    let actor = trace["actor"].clone();
    for entry in trace["entries"].as_array_mut().unwrap() {
        entry["eventDigest"] = json!(digest(&json!({"behavior":behavior,"actor":actor,"source":entry["source"],"sequence":entry["sequence"],"type":entry["type"],"payload":entry["payload"]})).unwrap());
        entry["messageDigest"] = json!(
            digest(
                &json!({"event":entry["eventDigest"],"target":actor,"delivery":entry["delivery"]})
            )
            .unwrap()
        );
    }
    let mut body = trace.clone();
    body.as_object_mut().unwrap().remove("digest");
    trace["digest"] = json!(digest(&body).unwrap());
}
fn code(value: &Value) -> String {
    parse_event_loop_trace(value)
        .map(|_| "ACCEPTED".to_owned())
        .unwrap_or_else(|error| error.code)
}

#[test]
fn event_loop_contract_shared_vectors_and_digests() {
    let f = fixture();
    for (base, invalid) in [("base", "invalid"), ("failed", "invalidFailed")] {
        let base = &f[base];
        assert_eq!(
            parse_event_loop_trace(base).unwrap(),
            base["digest"].as_str().unwrap()
        );
        for patch in f[invalid].as_array().unwrap() {
            let mut changed = base.clone();
            let path = patch["path"].as_str().unwrap();
            if let Some(target) = changed.pointer_mut(path) {
                *target = patch["value"].clone();
            } else {
                // One unknown-key vector intentionally inserts a new field.
                let (parent, name) = path.rsplit_once('/').unwrap();
                changed
                    .pointer_mut(parent)
                    .unwrap()
                    .as_object_mut()
                    .unwrap()
                    .insert(name.to_owned(), patch["value"].clone());
            }
            if patch["reidentify"] == true {
                let index = path.split('/').nth(2).unwrap().parse::<usize>().unwrap();
                let behavior = changed["behavior"].clone();
                let actor = changed["actor"].clone();
                let entry = &mut changed["entries"][index];
                entry["eventDigest"] = json!(digest(&json!({"behavior":behavior,"actor":actor,"source":entry["source"],"sequence":entry["sequence"],"type":entry["type"],"payload":entry["payload"]})).unwrap());
                entry["messageDigest"] = json!(digest(&json!({"event":entry["eventDigest"],"target":actor,"delivery":entry["delivery"]})).unwrap());
            }
            assert_eq!(
                code(&changed),
                patch["code"].as_str().unwrap(),
                "{}",
                patch["name"]
            );
        }
    }
}

#[test]
fn event_loop_contract_bounds_and_overflow_does_not_bind() {
    let base = fixture()["base"].clone();
    let mut trace = base.clone();
    trace["entries"] = json!([base["entries"][0]]);
    seal(&mut trace);
    assert_eq!(code(&trace), "ACCEPTED");
    trace["entries"] = json!([]);
    assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS");
    trace["entries"] = json!(vec![base["entries"][0].clone(); 257]);
    assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS");
    let mut trace = base.clone();
    trace["entries"][2]["depthBefore"] = json!(0);
    let decision = trace["entries"][3]["decision"].clone();
    trace["entries"][2]["decision"] = decision;
    trace["entries"][3]["decision"] = json!({"kind":"duplicate"});
    seal(&mut trace);
    assert_eq!(code(&trace), "ACCEPTED");
    trace["entries"][3]["payload"] = json!({"changed":true});
    seal(&mut trace);
    assert_eq!(code(&trace), "EVENT_LOOP_ID");
    let mut trace = base;
    trace["entries"][0]["decision"]["effects"] = json!({"requested":1,"settled":0,"receipts":[]});
    seal(&mut trace);
    assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC");
    trace["entries"][0]["decision"]["effects"]["settled"] = json!(2);
    assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS");
}

#[test]
fn event_loop_contract_pure_outcomes_reject_effect_claims() {
    let base = fixture()["base"].clone();
    for outcome in ["continue", "quiet", "defer", "escalate", "no-transition"] {
        let mut trace = base.clone();
        let first_state = trace["entries"][0]["decision"]["stateDigest"].clone();
        let decision = &mut trace["entries"][3]["decision"];
        decision["outcome"] = json!(outcome);
        if outcome == "no-transition" {
            decision["transition"] = Value::Null;
        }
        if matches!(outcome, "defer" | "escalate" | "no-transition") {
            decision["stateDigest"] = first_state;
        }
        seal(&mut trace);
        assert_eq!(code(&trace), "ACCEPTED", "{outcome}");
        trace["entries"][3]["decision"]["effects"]["requested"] = json!(1);
        seal(&mut trace);
        assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC", "{outcome}");
        trace["entries"][3]["decision"]["effects"]["requested"] = json!(0);
        trace["entries"][3]["decision"]["effects"]["settled"] = json!(1);
        seal(&mut trace);
        assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS", "{outcome}");
        trace["entries"][3]["decision"]["effects"]["settled"] = json!(0);
        trace["entries"][3]["decision"]["effects"]["receipts"] =
            json!([digest(&json!("unclaimed")).unwrap()]);
        seal(&mut trace);
        assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS", "{outcome}");
    }
}

#[test]
fn event_loop_contract_failed_decision_keeps_state_and_bounds_summaries() {
    let base = fixture()["failed"].clone();
    for reason in [
        "fuel-exhausted",
        "expression-error",
        "state-overflow",
        "output-invalid",
    ] {
        let mut trace = base.clone();
        trace["entries"][1]["decision"]["reason"] = json!(reason);
        trace["entries"][1]["decision"]["transition"] = json!("increment");
        trace["entries"][1]["decision"]["resources"]["fuel"] = json!(0);
        trace["entries"][1]["decision"]["resources"]["stateBytes"] = json!(0);
        seal(&mut trace);
        assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC");
        trace["entries"][1]["decision"]["resources"]["stateBytes"] = json!(11);
        seal(&mut trace);
        assert_eq!(code(&trace), "ACCEPTED");
        trace["entries"][1]["decision"]["resources"]["stateBytes"] = json!(16_384);
        assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC");
        trace["entries"][1]["decision"]["resources"]["stateBytes"] = json!(16_385);
        assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS");
    }
    let mut trace = base.clone();
    assert_eq!(code(&trace), "ACCEPTED");
    trace["entries"][1]["decision"]["resources"]["outputEvents"] = json!(1);
    assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC");
    // Before the first accepted state, the declared byte upper bound still applies.
    let mut first = base;
    first["entries"].as_array_mut().unwrap().remove(0);
    first["entries"][0]["decision"]["resources"]["stateBytes"] = json!(16_384);
    seal(&mut first);
    assert_eq!(code(&first), "ACCEPTED");
    first["entries"][0]["decision"]["resources"]["stateBytes"] = json!(16_385);
    assert_eq!(code(&first), "EVENT_LOOP_BOUNDS");
}

#[test]
fn event_loop_contract_same_state_fixes_accepted_and_pending_byte_length() {
    let base = fixture()["base"].clone();
    for outcome in ["continue", "quiet", "defer", "escalate", "no-transition"] {
        let mut trace = base.clone();
        trace["entries"][3]["decision"]["outcome"] = json!(outcome);
        if outcome == "no-transition" {
            trace["entries"][3]["decision"]["transition"] = Value::Null;
        }
        trace["entries"][3]["decision"]["stateDigest"] =
            trace["entries"][0]["decision"]["stateDigest"].clone();
        seal(&mut trace);
        assert_eq!(code(&trace), "ACCEPTED", "{outcome}");
        trace["entries"][3]["decision"]["resources"]["stateBytes"] = json!(10);
        assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC", "{outcome}");
    }
}

#[test]
fn event_loop_contract_nonadjacent_state_fixes_byte_length() {
    let base = fixture()["base"].clone();
    let first = base["entries"][0].clone();
    let second = base["entries"][3].clone();
    let mut third = second.clone();
    third["source"] = json!("source-c");
    third["delivery"] = json!("return");
    third["decision"]["stateDigest"] = first["decision"]["stateDigest"].clone();
    let mut trace = base;
    trace["entries"] = json!([first, second, third]);
    seal(&mut trace);
    assert_eq!(code(&trace), "ACCEPTED");
    trace["entries"][2]["decision"]["resources"]["stateBytes"] = json!(10);
    seal(&mut trace);
    assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC");
    trace["entries"][2]["decision"]["resources"]["stateBytes"] = json!(11);
    seal(&mut trace);
    assert_eq!(code(&trace), "ACCEPTED");
}
