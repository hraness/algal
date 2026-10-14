use algal::{
    canonical::digest, event_loop_contract::parse_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

type SiblingMutation = (&'static str, Box<dyn Fn(&mut Value)>, &'static str);

fn fixtures() -> (Value, Value) {
    let behavior: Value = serde_json::from_str(include_str!(
        "../../../benchmarks/language/actors/echo.json"
    ))
    .unwrap();
    let trace: Value = serde_json::from_str::<Value>(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap()["base"]
        .clone();
    (behavior, trace)
}
fn seal(value: &mut Value) {
    let mut body = value.clone();
    body.as_object_mut().unwrap().remove("digest");
    value["digest"] = json!(digest(&body).unwrap());
}
fn with_sibling(mut behavior: Value, mut trace: Value) -> (Value, Value) {
    let mut sibling = behavior["actors"][0].clone();
    sibling["id"] = json!("observer");
    behavior["actors"].as_array_mut().unwrap().push(sibling);
    seal(&mut behavior);
    trace["behavior"] = behavior["digest"].clone();
    let behavior_digest = trace["behavior"].clone();
    let actor = trace["actor"].clone();
    for entry in trace["entries"].as_array_mut().unwrap() {
        entry["eventDigest"] =
            json!(digest(&json!({
            "behavior": behavior_digest, "actor": actor, "source": entry["source"],
            "sequence": entry["sequence"], "type": entry["type"], "payload": entry["payload"]
        })).unwrap());
        entry["messageDigest"] = json!(
            digest(&json!({
                "event": entry["eventDigest"], "target": actor, "delivery": entry["delivery"]
            }))
            .unwrap()
        );
    }
    seal(&mut trace);
    (behavior, trace)
}
#[test]
fn event_loop_sibling_declarations_are_checked_beyond_the_selected_actor() {
    let (pinned, base) = fixtures();
    let (valid, trace) = with_sibling(pinned.clone(), base);
    let (_, original_summary) = verify_event_loop_trace_structure(&fixtures().1, &pinned).unwrap();
    let (trace_digest, summary) = verify_event_loop_trace_structure(&trace, &valid).unwrap();
    assert_eq!(trace_digest, trace["digest"]);
    assert_eq!(
        serde_json::to_value(summary).unwrap(),
        serde_json::to_value(original_summary).unwrap()
    );
    let changes: Vec<SiblingMutation> = vec![
        (
            "state type",
            Box::new(|actor| actor["state"]["fields"][0]["type"] = json!("invalid")),
            "EVENT_LOOP_SCHEMA",
        ),
        (
            "state bytes",
            Box::new(|actor| {
                actor["state"]["fields"][0]["type"] = json!("string");
                actor["state"]["fields"][0]["initial"] = json!("x".repeat(16_384));
            }),
            "EVENT_LOOP_BOUNDS",
        ),
        (
            "empty transitions",
            Box::new(|actor| actor["transitions"] = json!([])),
            "EVENT_LOOP_BOUNDS",
        ),
        (
            "unknown event",
            Box::new(|actor| actor["transitions"][0]["on"] = json!("undeclared")),
            "EVENT_LOOP_REFERENCE",
        ),
        (
            "unknown field",
            Box::new(|actor| actor["transitions"][0]["writes"][0]["path"] = json!(["undeclared"])),
            "EVENT_LOOP_REFERENCE",
        ),
        (
            "duplicate write",
            Box::new(|actor| {
                let write = actor["transitions"][0]["writes"][0].clone();
                actor["transitions"][0]["writes"]
                    .as_array_mut()
                    .unwrap()
                    .push(write);
            }),
            "EVENT_LOOP_SEMANTIC",
        ),
        (
            "bad expression",
            Box::new(|actor| actor["transitions"][0]["when"]["contract"] = json!("invalid")),
            "EVENT_LOOP_CONTRACT",
        ),
        (
            "unknown target",
            Box::new(|actor| actor["transitions"][0]["outputs"][0]["target"] = json!("undeclared")),
            "EVENT_LOOP_REFERENCE",
        ),
        (
            "pending write",
            Box::new(|actor| {
                actor["transitions"][0]["outputs"] = json!([]);
                let key = actor["transitions"][0]["when"].clone();
                actor["transitions"][0]["result"] = json!({"kind":"defer","key":key});
            }),
            "EVENT_LOOP_SEMANTIC",
        ),
    ];
    for (name, change, expected) in changes {
        let mut invalid = valid.clone();
        change(&mut invalid["actors"][1]);
        seal(&mut invalid);
        let mut bound = trace.clone();
        bound["behavior"] = invalid["digest"].clone();
        let behavior_digest = bound["behavior"].clone();
        let actor = bound["actor"].clone();
        for entry in bound["entries"].as_array_mut().unwrap() {
            entry["eventDigest"] =
                json!(digest(&json!({
                "behavior":behavior_digest, "actor":actor, "source":entry["source"],
                "sequence":entry["sequence"], "type":entry["type"], "payload":entry["payload"]
            })).unwrap());
            entry["messageDigest"] = json!(
                digest(&json!({
                    "event":entry["eventDigest"], "target":actor, "delivery":entry["delivery"]
                }))
                .unwrap()
            );
        }
        seal(&mut bound);
        assert_eq!(
            parse_event_loop_trace(&bound).unwrap(),
            bound["digest"],
            "{name}"
        );
        assert_eq!(
            verify_event_loop_trace_structure(&bound, &invalid)
                .unwrap_err()
                .code,
            expected,
            "{name}"
        );
    }
}

#[test]
fn competing_sibling_errors_refuse_in_actor_id_order() {
    for reverse in [false, true] {
        let (mut behavior, trace) = fixtures();
        let mut high = behavior["actors"][0].clone();
        high["id"] = json!("z-fault");
        high["state"]["fields"][0]["type"] = json!("invalid");
        let mut low = behavior["actors"][0].clone();
        low["id"] = json!("a-fault");
        low["transitions"] = json!([]);
        let actors = behavior["actors"].as_array_mut().unwrap();
        if reverse {
            actors.extend([low, high]);
        } else {
            actors.extend([high, low]);
        }
        let (invalid, bound) = with_sibling(behavior, trace);
        assert_eq!(parse_event_loop_trace(&bound).unwrap(), bound["digest"]);
        assert_eq!(
            verify_event_loop_trace_structure(&bound, &invalid)
                .unwrap_err()
                .code,
            "EVENT_LOOP_BOUNDS"
        );
    }
}
