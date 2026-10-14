use algal::{
    canonical::digest, event_loop_contract::parse_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

type Mutation = (&'static str, Box<dyn Fn(&mut Value)>, Option<&'static str>);

fn fixture() -> (Value, Value) {
    let behavior = serde_json::from_str(include_str!(
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
fn event_loop_redigested_metadata_fields_are_checked_individually() {
    let (base, trace) = fixture();
    let mutations: Vec<Mutation> = vec![
        (
            "missing id",
            Box::new(|m| {
                m.as_object_mut().unwrap().remove("id");
            }),
            Some("EVENT_LOOP_PARSE"),
        ),
        (
            "missing revision",
            Box::new(|m| {
                m.as_object_mut().unwrap().remove("revision");
            }),
            Some("EVENT_LOOP_PARSE"),
        ),
        (
            "missing source digest",
            Box::new(|m| {
                m.as_object_mut().unwrap().remove("sourceDigest");
            }),
            Some("EVENT_LOOP_PARSE"),
        ),
        (
            "extra metadata key",
            Box::new(|m| m["unexpected"] = json!(true)),
            Some("EVENT_LOOP_UNKNOWN_KEY"),
        ),
        (
            "id at 64",
            Box::new(|m| m["id"] = json!("a".repeat(64))),
            None,
        ),
        (
            "id at 65",
            Box::new(|m| m["id"] = json!("a".repeat(65))),
            Some("EVENT_LOOP_ID"),
        ),
        (
            "invalid id syntax",
            Box::new(|m| m["id"] = json!("Mixed Case")),
            Some("EVENT_LOOP_ID"),
        ),
        (
            "revision at maximum",
            Box::new(|m| m["revision"] = json!(2_147_483_647)),
            None,
        ),
        (
            "revision above maximum",
            Box::new(|m| m["revision"] = json!(2_147_483_648_u64)),
            Some("EVENT_LOOP_BOUNDS"),
        ),
        (
            "revision zero",
            Box::new(|m| m["revision"] = json!(0)),
            Some("EVENT_LOOP_BOUNDS"),
        ),
        (
            "invalid source digest",
            Box::new(|m| m["sourceDigest"] = json!("sha256:INVALID")),
            Some("EVENT_LOOP_DIGEST"),
        ),
    ];
    for (name, change, code) in mutations {
        let mut behavior = base.clone();
        change(&mut behavior["behavior"]);
        seal(&mut behavior["behavior"]);
        seal(&mut behavior);
        let witness = bind(&behavior, trace.clone());
        assert_eq!(
            parse_event_loop_trace(&witness).unwrap(),
            witness["digest"],
            "{name}"
        );
        match code {
            Some(code) => assert_eq!(
                verify_event_loop_trace_structure(&witness, &behavior)
                    .unwrap_err()
                    .code,
                code,
                "{name}"
            ),
            None => assert_eq!(
                verify_event_loop_trace_structure(&witness, &behavior)
                    .unwrap()
                    .0,
                witness["digest"],
                "{name}"
            ),
        }
    }
    for (name, missing, code) in [
        ("missing metadata digest", true, "EVENT_LOOP_PARSE"),
        ("stale metadata digest", false, "EVENT_LOOP_DIGEST"),
    ] {
        let mut behavior = base.clone();
        if missing {
            behavior["behavior"]
                .as_object_mut()
                .unwrap()
                .remove("digest");
        } else {
            behavior["behavior"]["revision"] = json!(2);
        }
        seal(&mut behavior);
        let witness = bind(&behavior, trace.clone());
        assert_eq!(
            parse_event_loop_trace(&witness).unwrap(),
            witness["digest"],
            "{name}"
        );
        assert_eq!(
            verify_event_loop_trace_structure(&witness, &behavior)
                .unwrap_err()
                .code,
            code,
            "{name}"
        );
    }
}
