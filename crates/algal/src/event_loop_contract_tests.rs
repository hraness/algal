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
    trace["entries"][0]["decision"]["effects"] =
        json!({"requested":1,"settled":1,"receipts":[digest(&json!("effect")).unwrap()]});
    seal(&mut trace);
    assert_eq!(code(&trace), "ACCEPTED");
    trace["entries"][0]["decision"]["effects"]["settled"] = json!(2);
    assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS");
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
        trace["entries"][1]["decision"]["resources"]["stateBytes"] = json!(16_384);
        seal(&mut trace);
        assert_eq!(code(&trace), "ACCEPTED");
        trace["entries"][1]["decision"]["resources"]["stateBytes"] = json!(16_385);
        assert_eq!(code(&trace), "EVENT_LOOP_BOUNDS");
    }
    let mut trace = base;
    assert_eq!(code(&trace), "ACCEPTED");
    trace["entries"][1]["decision"]["resources"]["outputEvents"] = json!(1);
    assert_eq!(code(&trace), "EVENT_LOOP_SEMANTIC");
}
