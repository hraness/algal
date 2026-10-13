use algal::{
    canonical::{canonical, digest},
    event_loop_contract::parse_event_loop_trace,
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
fn initial() -> Value {
    let mut fields = serde_json::Map::new();
    for field in behavior()["actors"][0]["state"]["fields"]
        .as_array()
        .unwrap()
    {
        fields.insert(
            field["name"].as_str().unwrap().to_owned(),
            field["initial"].clone(),
        );
    }
    Value::Object(fields)
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
fn first_failed() -> Value {
    let mut record = failed();
    record["entries"] = json!([record["entries"][1].clone()]);
    let initial = initial();
    record["entries"][0]["decision"]["stateDigest"] = json!(digest(&initial).unwrap());
    record["entries"][0]["decision"]["resources"]["stateBytes"] =
        json!(canonical(&initial).unwrap().len());
    seal(&mut record);
    record
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
    let mut single = first_failed();
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
fn event_loop_structure_anchors_uncommitted_state_to_behavior_initial_state() {
    let initial = initial();
    let initial_digest = digest(&initial).unwrap();
    let initial_bytes = canonical(&initial).unwrap().len();
    let mut first = first_failed();
    assert_eq!(
        verify_event_loop_trace_structure(&first, &behavior())
            .unwrap()
            .0,
        first["digest"]
    );
    first["entries"][0]["decision"]["stateDigest"] = json!(format!("sha256:{}", "0".repeat(64)));
    seal(&mut first);
    assert_eq!(parse_event_loop_trace(&first).unwrap(), first["digest"]);
    assert_eq!(
        verify_event_loop_trace_structure(&first, &behavior())
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
    first["entries"][0]["decision"]["stateDigest"] = json!(initial_digest);
    first["entries"][0]["decision"]["resources"]["stateBytes"] = json!(initial_bytes - 1);
    seal(&mut first);
    assert_eq!(
        verify_event_loop_trace_structure(&first, &behavior())
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
    let mut unmatched = base();
    unmatched["entries"] = json!([unmatched["entries"][0].clone()]);
    unmatched["entries"][0]["decision"] = json!({
        "kind":"accepted", "transition":null, "outcome":"no-transition",
        "stateDigest":digest(&initial).unwrap(), "outputs":[],
        "effects":{"requested":0,"settled":0,"receipts":[]},
        "resources":{"fuel":0,"stateBytes":initial_bytes,"outputEvents":0}
    });
    seal(&mut unmatched);
    assert_eq!(
        verify_event_loop_trace_structure(&unmatched, &behavior())
            .unwrap()
            .0,
        unmatched["digest"]
    );
    unmatched["entries"][0]["decision"]["resources"]["stateBytes"] = json!(initial_bytes + 1);
    seal(&mut unmatched);
    assert_eq!(
        verify_event_loop_trace_structure(&unmatched, &behavior())
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
}

#[test]
fn event_loop_structure_no_write_rule_preserves_previous_state() {
    let mut no_writes = behavior();
    no_writes["actors"][0]["transitions"][1]["writes"] = json!([]);
    seal(&mut no_writes);
    let mut trace = base();
    trace["entries"][3]["decision"]["stateDigest"] =
        trace["entries"][0]["decision"]["stateDigest"].clone();
    let after_commit = bind_from(&no_writes, trace.clone());
    assert_eq!(
        verify_event_loop_trace_structure(&after_commit, &no_writes)
            .unwrap()
            .0,
        after_commit["digest"]
    );
    let mut changed = after_commit.clone();
    changed["entries"][3]["decision"]["stateDigest"] = json!(digest(&initial()).unwrap());
    seal(&mut changed);
    assert_eq!(parse_event_loop_trace(&changed).unwrap(), changed["digest"]);
    assert_eq!(
        verify_event_loop_trace_structure(&changed, &no_writes)
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
    let mut wrong_bytes = after_commit.clone();
    wrong_bytes["entries"][3]["decision"]["resources"]["stateBytes"] = json!(12);
    seal(&mut wrong_bytes);
    assert_eq!(
        verify_event_loop_trace_structure(&wrong_bytes, &no_writes)
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );

    let initial = initial();
    trace["entries"] = json!([trace["entries"][3].clone()]);
    trace["entries"][0]["decision"]["stateDigest"] = json!(digest(&initial).unwrap());
    trace["entries"][0]["decision"]["resources"]["stateBytes"] =
        json!(canonical(&initial).unwrap().len());
    let mut first = bind_from(&no_writes, trace.clone());
    assert_eq!(
        verify_event_loop_trace_structure(&first, &no_writes)
            .unwrap()
            .0,
        first["digest"]
    );
    first["entries"][0]["decision"]["stateDigest"] =
        base()["entries"][0]["decision"]["stateDigest"].clone();
    seal(&mut first);
    assert_eq!(parse_event_loop_trace(&first).unwrap(), first["digest"]);
    assert_eq!(
        verify_event_loop_trace_structure(&first, &no_writes)
            .err()
            .unwrap()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );

    no_writes["actors"][0]["transitions"][1]["result"]["kind"] = json!("continue");
    seal(&mut no_writes);
    trace["entries"][0]["decision"]["outcome"] = json!("continue");
    let continued = bind_from(&no_writes, trace);
    assert_eq!(
        verify_event_loop_trace_structure(&continued, &no_writes)
            .unwrap()
            .0,
        continued["digest"]
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
