use algal::{canonical::digest, event_loop_behavior::summarize_event_loop_behavior};
use serde_json::{Value, json};

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../benchmarks/language/actors/echo.json"
    ))
    .unwrap()
}
fn seal(value: &mut Value) {
    let mut body = value.clone();
    body.as_object_mut().unwrap().remove("digest");
    value["digest"] = json!(digest(&body).unwrap());
}
fn report(value: &Value, actor: &str) -> Value {
    summarize_event_loop_behavior(value, &json!(actor)).unwrap()
}

#[test]
fn event_loop_behavior_summary_is_preexecution_and_digested() {
    let mut value = fixture();
    let result = report(&value, "counter");
    assert_eq!(result["digest"], value["digest"]);
    assert_eq!(result["summaryDigest"], digest(&result["summary"]).unwrap());
    assert_eq!(
        result["summary"],
        json!({
            "actor":"counter", "inputEventTypes":["increment","reset"],
            "reads":{"stateFields":["count"],"eventFields":[{"event":"increment","fields":["amount"]}]},
            "writes":["count"],"emits":["incremented"],"pendingOutcomes":[],
            "capabilities":[],"limits":value["limits"],
        })
    );
    value["actors"][0]["transitions"]
        .as_array_mut()
        .unwrap()
        .push(
            json!({"id":"wait","on":"reset","when":null,"writes":[],"outputs":[],
            "result":{"kind":"defer","key":{"contract":"algal.expr.v1","program":"pending"}}}),
        );
    value["actors"][0]["transitions"]
        .as_array_mut()
        .unwrap()
        .push(
            json!({"id":"request","on":"reset","when":null,"writes":[],"outputs":[],
            "result":{"kind":"escalate","request":{"contract":"algal.expr.v1","program":null}}}),
        );
    seal(&mut value);
    assert_eq!(
        report(&value, "counter")["summary"]["pendingOutcomes"],
        json!(["defer", "escalate"])
    );
    assert_eq!(
        report(&value, "counter")["summary"]["capabilities"],
        json!([])
    );
}

#[test]
fn event_loop_behavior_reads_are_conservative_but_quotes_are_not_evaluated() {
    let mut value = fixture();
    value["events"][0]["payload"]["fields"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"other","type":"number"}));
    value["actors"][0]["state"]["fields"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"other","type":"number","initial":0}));
    value["actors"][0]["transitions"][0]["when"]["program"] = json!(["get", "event"]);
    value["actors"][0]["transitions"][0]["writes"][0]["value"]["program"] =
        json!(["get", "state", ["quote", "count"]]);
    value["actors"][0]["transitions"][0]["outputs"][0]["payload"]["program"] =
        json!(["quote", ["get", "state", "not-a-field"]]);
    seal(&mut value);
    assert_eq!(
        report(&value, "counter")["summary"]["reads"],
        json!({
            "stateFields":["count","other"],
            "eventFields":[{"event":"increment","fields":["amount","other"]}],
        })
    );
    value["actors"][0]["transitions"][0]["when"]["program"] =
        json!(["get", ["if", true, "state", "event"]]);
    seal(&mut value);
    assert_eq!(
        report(&value, "counter")["summary"]["reads"],
        json!({
            "stateFields":["count","other"],
            "eventFields":[{"event":"increment","fields":["amount","other"]}],
        })
    );
}

#[test]
fn event_loop_behavior_checks_unused_siblings_and_refuses_unbound_expressions() {
    let mut value = fixture();
    let mut sibling = value["actors"][0].clone();
    sibling["id"] = json!("observer");
    sibling["transitions"][0]["outputs"] = json!([]);
    sibling["transitions"][0]["result"] = json!({"kind":"quiet"});
    value["actors"].as_array_mut().unwrap().push(sibling);
    seal(&mut value);
    assert_eq!(report(&value, "observer")["summary"]["emits"], json!([]));
    value["actors"][1]["transitions"][0]["when"]["program"] = json!(["bad-op", 1]);
    seal(&mut value);
    for actor in ["counter", "observer"] {
        assert_eq!(
            summarize_event_loop_behavior(&value, &json!(actor))
                .unwrap_err()
                .code,
            "EVENT_LOOP_SEMANTIC"
        );
    }
    value["actors"][1]["transitions"][0]["when"]["program"] = json!(["get", "missing"]);
    seal(&mut value);
    assert_eq!(
        summarize_event_loop_behavior(&value, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_REFERENCE"
    );
    value["actors"][1]["state"]["fields"][0]["type"] = json!("invalid");
    seal(&mut value);
    assert_eq!(
        summarize_event_loop_behavior(&value, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_SCHEMA"
    );
}

#[test]
fn event_loop_behavior_summary_limits_cover_maxima_and_first_excess() {
    let mut value = fixture();
    value["limits"]["maxOutputEvents"] = json!(64);
    value["limits"]["maxEventBytes"] = json!(65_536);
    value["limits"]["maxStateBytes"] = json!(262_144);
    value["limits"]["maxTransitionFuel"] = json!(100_000);
    value["limits"]["maxMailboxDepth"] = json!(1_024);
    value["events"] = Value::Array(
        (0..128)
            .map(|i| {
                json!({"id":format!("event-{i}"),
        "payload":{"kind":"record","fields":[]}})
            })
            .collect(),
    );
    value["actors"][0]["state"]["fields"] = Value::Array(
        (0..64)
            .map(|i| {
                json!({
        "name":format!("field-{i}"),"type":"number","initial":0})
            })
            .collect(),
    );
    value["actors"][0]["transitions"] = Value::Array((0..128).map(|i| json!({
        "id":format!("rule-{i}"),"on":format!("event-{i}"),
        "when":{"contract":"algal.expr.v1","program":["get","state"]},
        "writes":[{"path":[format!("field-{}",i%64)],"value":{"contract":"algal.expr.v1","program":1}}],
        "outputs":[{"kind":"notify","target":"self","event":format!("event-{i}"),
            "payload":{"contract":"algal.expr.v1","program":{}}}],
        "result":{"kind":"continue"}})).collect());
    seal(&mut value);
    let result = report(&value, "counter");
    for (key, count) in [("inputEventTypes", 128), ("writes", 64), ("emits", 128)] {
        assert_eq!(result["summary"][key].as_array().unwrap().len(), count);
    }
    assert_eq!(
        result["summary"]["reads"]["stateFields"]
            .as_array()
            .unwrap()
            .len(),
        64
    );
    assert!(
        algal::canonical::canonical(&result["summary"])
            .unwrap()
            .len()
            <= 1_048_576
    );
    let mut excess = value.clone();
    excess["events"]
        .as_array_mut()
        .unwrap()
        .push(json!({"id":"event-extra",
        "payload":{"kind":"record","fields":[]}}));
    seal(&mut excess);
    assert_eq!(
        summarize_event_loop_behavior(&excess, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_BOUNDS"
    );
    let mut excess = value.clone();
    excess["actors"][0]["state"]["fields"]
        .as_array_mut()
        .unwrap()
        .push(json!({
        "name":"field-extra","type":"number","initial":0}));
    seal(&mut excess);
    assert_eq!(
        summarize_event_loop_behavior(&excess, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_BOUNDS"
    );
    let mut excess = value.clone();
    excess["actors"][0]["transitions"][0]["outputs"] = Value::Array(vec![
            excess["actors"][0]["transitions"][0]["outputs"][0]
                .clone();
            65
        ]);
    seal(&mut excess);
    assert_eq!(
        summarize_event_loop_behavior(&excess, &json!("counter"))
            .unwrap_err()
            .code,
        "EVENT_LOOP_BOUNDS"
    );
}
