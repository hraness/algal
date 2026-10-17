use algal::{
    canonical::digest, event_loop_contract::parse_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

type FieldMutation = (&'static str, Box<dyn Fn(&mut Value)>, &'static str);

fn fixture() -> (Value, Value) {
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
fn bind(behavior: &Value, mut trace: Value) -> Value {
    trace["behavior"] = behavior["digest"].clone();
    let behavior_digest = trace["behavior"].clone();
    let actor = trace["actor"].clone();
    for entry in trace["entries"].as_array_mut().unwrap() {
        entry["eventDigest"] = json!(
            digest(&json!({
                "behavior": behavior_digest, "actor": actor, "source": entry["source"],
                "sequence": entry["sequence"], "type": entry["type"],
                "payload": entry["payload"]
            }))
            .unwrap()
        );
        entry["messageDigest"] = json!(
            digest(&json!({
                "event": entry["eventDigest"], "target": actor,
                "delivery": entry["delivery"]
            }))
            .unwrap()
        );
    }
    seal(&mut trace);
    trace
}

#[test]
fn event_loop_unselected_field_shapes_are_closed_and_bounded() {
    let (mut behavior, base) = fixture();
    let mut sibling = behavior["actors"][0].clone();
    sibling["id"] = json!("observer");
    behavior["actors"].as_array_mut().unwrap().push(sibling);
    let mutations: Vec<FieldMutation> = vec![
        (
            "missing event schema kind",
            Box::new(|b| {
                b["events"][2]["payload"]
                    .as_object_mut()
                    .unwrap()
                    .remove("kind");
            }),
            "EVENT_LOOP_PARSE",
        ),
        (
            "extra event field key",
            Box::new(|b| b["events"][2]["payload"]["fields"][0]["optional"] = json!(true)),
            "EVENT_LOOP_UNKNOWN_KEY",
        ),
        (
            "malformed event field type",
            Box::new(|b| b["events"][2]["payload"]["fields"][0]["type"] = json!("bytes")),
            "EVENT_LOOP_SCHEMA",
        ),
        (
            "duplicate event before its malformed schema",
            Box::new(|b| {
                b["events"][2]["id"] = json!("increment");
                b["events"][2]["payload"]["fields"][0]["type"] = json!("bytes");
            }),
            "EVENT_LOOP_ID",
        ),
        (
            "missing sibling initial",
            Box::new(|b| {
                b["actors"][1]["state"]["fields"][0]
                    .as_object_mut()
                    .unwrap()
                    .remove("initial");
            }),
            "EVENT_LOOP_PARSE",
        ),
        (
            "extra sibling transition key",
            Box::new(|b| b["actors"][1]["transitions"][0]["debug"] = json!(true)),
            "EVENT_LOOP_UNKNOWN_KEY",
        ),
        (
            "nested sibling write path",
            Box::new(|b| {
                b["actors"][1]["transitions"][0]["writes"][0]["path"] = json!(["count", "nested"])
            }),
            "EVENT_LOOP_BOUNDS",
        ),
        (
            "missing sibling output payload",
            Box::new(|b| {
                b["actors"][1]["transitions"][0]["outputs"][0]
                    .as_object_mut()
                    .unwrap()
                    .remove("payload");
            }),
            "EVENT_LOOP_PARSE",
        ),
        (
            "extra sibling result key",
            Box::new(|b| b["actors"][1]["transitions"][0]["result"]["extra"] = json!(true)),
            "EVENT_LOOP_UNKNOWN_KEY",
        ),
    ];
    for (name, change, expected) in mutations {
        let mut invalid = behavior.clone();
        change(&mut invalid);
        seal(&mut invalid);
        let trace = bind(&invalid, base.clone());
        assert_eq!(
            parse_event_loop_trace(&trace).unwrap(),
            trace["digest"],
            "{name}"
        );
        assert_eq!(
            verify_event_loop_trace_structure(&trace, &invalid)
                .unwrap_err()
                .code,
            expected,
            "{name}"
        );
    }
    for count in [64, 65] {
        let mut checked = behavior.clone();
        for i in 1..count {
            checked["actors"][1]["state"]["fields"]
                .as_array_mut()
                .unwrap()
                .push(json!({"name": format!("field-{i}"), "type": "number", "initial": 0}));
        }
        seal(&mut checked);
        let trace = bind(&checked, base.clone());
        assert_eq!(parse_event_loop_trace(&trace).unwrap(), trace["digest"]);
        if count == 64 {
            assert_eq!(
                verify_event_loop_trace_structure(&trace, &checked)
                    .unwrap()
                    .0,
                trace["digest"]
            );
        } else {
            assert_eq!(
                verify_event_loop_trace_structure(&trace, &checked)
                    .unwrap_err()
                    .code,
                "EVENT_LOOP_BOUNDS"
            );
        }
    }
}
