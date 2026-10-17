use algal::{canonical::digest, event_loop_behavior::summarize_event_loop_behavior};
use serde_json::{Value, json};

fn seal(value: &mut Value) {
    let mut body = value.clone();
    body.as_object_mut().unwrap().remove("digest");
    value["digest"] = json!(digest(&body).unwrap());
}
fn dense() -> Value {
    let mut b: Value = serde_json::from_str(include_str!(
        "../../../benchmarks/language/actors/echo.json"
    ))
    .unwrap();
    b["limits"] = json!({"maxEventBytes":1,"maxStateBytes":2,"maxOutputEvents":0,
        "maxTransitionFuel":1,"maxMailboxDepth":1});
    b["events"] = Value::Array((0..128).map(|i| json!({
        "id":format!("event-{i}"),"payload":{"kind":"record","fields":
            (0..64).map(|j| json!({"name":format!("field-{j}"),"type":"number"})).collect::<Vec<_>>()}
    })).collect());
    b["actors"][0]["state"]["fields"] = json!([]);
    b["actors"][0]["transitions"] = Value::Array(
        (0..128)
            .map(|i| {
                json!({
                    "id":format!("rule-{i}"),"on":format!("event-{i}"),
                    "when":{"contract":"algal.expr.v1","program":["get","event"]},
                    "writes":[],"outputs":[],"result":{"kind":"quiet"}
                })
            })
            .collect(),
    );
    seal(&mut b);
    b
}

#[test]
fn event_loop_behavior_dense_read_lists_and_minimal_limits() {
    let b = dense();
    let result = summarize_event_loop_behavior(&b, &json!("counter")).unwrap();
    let summary = &result["summary"];
    assert_eq!(summary["limits"], b["limits"]);
    assert_eq!(summary["inputEventTypes"].as_array().unwrap().len(), 128);
    let reads = summary["reads"]["eventFields"].as_array().unwrap();
    assert_eq!(reads.len(), 128);
    assert!(
        reads
            .iter()
            .all(|item| item["fields"].as_array().unwrap().len() == 64)
    );
    assert_eq!(summary["reads"]["stateFields"], json!([]));
    assert_eq!(summary["emits"], json!([]));
    assert!(algal::canonical::canonical(summary).unwrap().len() <= 1_048_576);
    let mut excess = b;
    excess["events"][0]["payload"]["fields"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"field-extra","type":"number"}));
    seal(&mut excess);
    assert_eq!(
        summarize_event_loop_behavior(&excess, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_BOUNDS"
    );
}

#[test]
fn event_loop_behavior_maximum_and_first_excess_transitions() {
    let mut b = dense();
    for i in 0..128 {
        b["actors"][0]["transitions"]
            .as_array_mut()
            .unwrap()
            .push(json!({
                "id":format!("extra-{i}"),"on":format!("event-{i}"),
                "when":null,"writes":[],"outputs":[],"result":{"kind":"quiet"}
            }));
    }
    seal(&mut b);
    assert_eq!(
        summarize_event_loop_behavior(&b, &json!("counter")).unwrap()["summary"]["inputEventTypes"]
            .as_array()
            .unwrap()
            .len(),
        128
    );
    b["actors"][0]["transitions"].as_array_mut().unwrap().push(json!({
        "id":"extra-last","on":"event-0","when":null,"writes":[],"outputs":[],"result":{"kind":"quiet"}
    }));
    seal(&mut b);
    assert_eq!(
        summarize_event_loop_behavior(&b, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_BOUNDS"
    );
}
