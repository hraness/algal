use algal::{
    canonical::digest, event_loop_contract::parse_event_loop_trace,
    event_loop_replay::replay_event_loop_trace,
};
use serde_json::{Value, json};

fn seal(value: &mut Value) {
    let mut body = value.clone();
    body.as_object_mut().unwrap().remove("digest");
    value["digest"] = json!(digest(&body).unwrap());
}

#[test]
fn pending_numeric_witness_compares_canonical_values_not_serde_number_variants() {
    let mut behavior: Value = serde_json::from_str(include_str!(
        "../../../benchmarks/language/actors/echo.json"
    ))
    .unwrap();
    let rule = &mut behavior["actors"][0]["transitions"][0];
    rule["writes"] = json!([]);
    rule["outputs"] = json!([]);
    rule["result"] = json!({"kind":"defer","key":{"contract":"algal.expr.v1","program":1}});
    seal(&mut behavior);

    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap();
    let mut trace = fixture["base"].clone();
    trace["entries"] = json!([trace["entries"][0].clone()]);
    trace["behavior"] = behavior["digest"].clone();
    let entry = &mut trace["entries"][0];
    entry["eventDigest"] = json!(
        digest(&json!({
            "behavior":behavior["digest"], "actor":"counter", "source":entry["source"],
            "sequence":entry["sequence"], "type":entry["type"], "payload":entry["payload"]
        }))
        .unwrap()
    );
    entry["messageDigest"] = json!(
        digest(&json!({
            "event":entry["eventDigest"], "target":"counter", "delivery":entry["delivery"]
        }))
        .unwrap()
    );
    entry["decision"] = json!({
        "kind":"accepted", "transition":"increment", "outcome":"defer",
        "pending": serde_json::from_str::<Value>("1.0").unwrap(),
        "stateDigest":digest(&json!({"count":0})).unwrap(), "outputs":[],
        "effects":{"requested":0,"settled":0,"receipts":[]},
        "resources":{"fuel":10,"stateBytes":11,"outputEvents":0}
    });
    assert_ne!(entry["decision"]["pending"], json!(1)); // serde preserves the spelling's number variant.
    seal(&mut trace);
    assert_eq!(parse_event_loop_trace(&trace).unwrap(), trace["digest"]);
    assert_eq!(
        replay_event_loop_trace(&trace, &behavior).unwrap().0,
        trace["digest"]
    );

    trace["entries"][0]["decision"]["pending"] = json!(2.0);
    seal(&mut trace);
    assert_eq!(
        replay_event_loop_trace(&trace, &behavior).unwrap_err().code,
        "EVENT_LOOP_SEMANTIC"
    );
}
