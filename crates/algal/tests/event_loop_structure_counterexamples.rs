use algal::{
    canonical::digest, event_loop_contract::parse_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

fn base() -> Value {
    serde_json::from_str::<Value>(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap()["base"]
        .clone()
}
fn failed() -> Value {
    serde_json::from_str::<Value>(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap()["failed"]
        .clone()
}
fn behavior() -> Value {
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
fn priority(name: &str) -> Value {
    let mut proposed = behavior();
    // Appended after increment; lexicographic id, not array position, decides priority.
    proposed["actors"][0]["transitions"]
        .as_array_mut()
        .unwrap()
        .push(json!({"id":name,"on":"increment","when":null,"writes":[],"outputs":[],"result":{"kind":"quiet"}}));
    seal(&mut proposed);
    proposed
}
fn bind_from(proposed: &Value, mut record: Value) -> Value {
    record["behavior"] = proposed["digest"].clone();
    let actor = record["actor"].clone();
    let behavior = record["behavior"].clone();
    for entry in record["entries"].as_array_mut().unwrap() {
        entry["eventDigest"] =
            json!(digest(&json!({
            "behavior": behavior, "actor": actor, "source": entry["source"],
            "sequence": entry["sequence"], "type": entry["type"], "payload": entry["payload"]
        })).unwrap());
        entry["messageDigest"] = json!(
            digest(&json!({
                "event": entry["eventDigest"], "target": actor, "delivery": entry["delivery"]
            }))
            .unwrap()
        );
    }
    seal(&mut record);
    record
}
fn bind(proposed: &Value) -> Value {
    bind_from(proposed, base())
}

#[test]
fn event_loop_structure_rejects_preempted_id_but_not_a_later_unconditional_id() {
    let earlier = priority("a-priority");
    let claimed_later = bind(&earlier);
    assert_eq!(
        parse_event_loop_trace(&claimed_later).unwrap(),
        claimed_later["digest"]
    );
    assert_eq!(
        verify_event_loop_trace_structure(&claimed_later, &earlier)
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
    let later = priority("z-priority");
    let allowed = bind(&later);
    assert_eq!(
        verify_event_loop_trace_structure(&allowed, &later)
            .unwrap()
            .0,
        allowed["digest"]
    );
}

#[test]
fn event_loop_structure_rejects_failed_selection_preempted_by_unconditional_id() {
    let mut single = failed();
    single["entries"] = json!([single["entries"][1].clone()]);
    single["entries"][0]["decision"]["transition"] = json!("increment");
    let earlier = priority("a-priority");
    let claimed_later = bind_from(&earlier, single.clone());
    assert_eq!(
        parse_event_loop_trace(&claimed_later).unwrap(),
        claimed_later["digest"]
    );
    assert_eq!(
        verify_event_loop_trace_structure(&claimed_later, &earlier)
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );

    // A null selection may fail before any rule is chosen; a later id does
    // not preempt increment. Neither case proves that the failure happened.
    let mut unselected = claimed_later.clone();
    unselected["entries"][0]["decision"]["transition"] = Value::Null;
    seal(&mut unselected);
    assert_eq!(
        verify_event_loop_trace_structure(&unselected, &earlier)
            .unwrap()
            .0,
        unselected["digest"]
    );
    let later = priority("z-priority");
    let allowed = bind_from(&later, single);
    assert_eq!(
        verify_event_loop_trace_structure(&allowed, &later)
            .unwrap()
            .0,
        allowed["digest"]
    );
}

#[test]
fn event_loop_structure_still_cannot_verify_output_identity() {
    let mut changed = base();
    changed["entries"][0]["decision"]["outputs"][0] = json!(format!("sha256:{}", "0".repeat(64)));
    seal(&mut changed);
    assert_ne!(changed["digest"], base()["digest"]);
    assert_eq!(parse_event_loop_trace(&changed).unwrap(), changed["digest"]);
    // Counterexample to replay, not evidence of a valid execution.
    assert_eq!(
        verify_event_loop_trace_structure(&changed, &behavior())
            .unwrap()
            .0,
        changed["digest"]
    );
}
