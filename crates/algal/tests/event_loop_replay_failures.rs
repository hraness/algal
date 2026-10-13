use algal::{
    canonical::{canonical, digest},
    event_loop_contract::parse_event_loop_trace,
    event_loop_replay::replay_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

fn seal(value: &mut Value) {
    let mut body = value.clone();
    body.as_object_mut().unwrap().remove("digest");
    value["digest"] = json!(digest(&body).unwrap());
}
fn identify(entry: &mut Value, behavior: &Value) {
    entry["eventDigest"] = json!(
        digest(&json!({
            "behavior": behavior, "actor": "counter", "source": entry["source"],
            "sequence": entry["sequence"], "type": entry["type"], "payload": entry["payload"]
        }))
        .unwrap()
    );
    entry["messageDigest"] = json!(
        digest(&json!({
            "event": entry["eventDigest"], "target": "counter", "delivery": entry["delivery"]
        }))
        .unwrap()
    );
}
fn failure_case(reason: &str) -> (Value, Value) {
    let mut model: Value = serde_json::from_str(include_str!(
        "../../../benchmarks/language/actors/echo.json"
    ))
    .unwrap();
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap();
    let mut trace = fixture["base"].clone();
    trace["entries"] = json!([trace["entries"][0].clone()]);
    let (fuel, transition) = match reason {
        "fuel-exhausted" => {
            model["limits"]["maxTransitionFuel"] = json!(8);
            trace["limits"]["maxTransitionFuel"] = json!(8);
            (8, Value::Null)
        }
        "expression-error" => {
            model["actors"][0]["transitions"][0]["when"]["program"] = json!(0);
            (1, Value::Null)
        }
        "state-overflow" => {
            model["limits"]["maxStateBytes"] = json!(11);
            trace["limits"]["maxStateBytes"] = json!(11);
            trace["entries"][0]["payload"]["amount"] = json!(100);
            (23, json!("increment"))
        }
        "output-invalid" => {
            model["actors"][0]["transitions"][0]["outputs"][0]["payload"]["program"] = json!(0);
            (24, json!("increment"))
        }
        _ => panic!("unknown failure case"),
    };
    seal(&mut model);
    trace["behavior"] = model["digest"].clone();
    identify(&mut trace["entries"][0], &model["digest"]);
    trace["entries"][0]["decision"] = json!({
        "kind": "failed", "reason": reason, "transition": transition,
        "stateDigest": digest(&json!({"count":0})).unwrap(),
        "resources": {"fuel":fuel,"stateBytes":11,"outputEvents":0}
    });
    seal(&mut trace);
    (trace, model)
}

#[test]
fn event_loop_replay_failure_witnesses_and_noncommit() {
    for reason in [
        "fuel-exhausted",
        "expression-error",
        "state-overflow",
        "output-invalid",
    ] {
        let (trace, model) = failure_case(reason);
        assert_eq!(parse_event_loop_trace(&trace).unwrap(), trace["digest"]);
        assert_eq!(
            verify_event_loop_trace_structure(&trace, &model).unwrap().0,
            trace["digest"]
        );
        let (identity, summary) = replay_event_loop_trace(&trace, &model).unwrap();
        assert_eq!(identity, trace["digest"]);
        assert_eq!(summary.failed, 1);
        assert_eq!(
            summary.fuel_claimed,
            trace["entries"][0]["decision"]["resources"]["fuel"]
        );
        let mut forged = trace.clone();
        forged["entries"][0]["decision"]["reason"] = json!(if reason == "output-invalid" {
            "state-overflow"
        } else {
            "output-invalid"
        });
        seal(&mut forged);
        assert_eq!(
            replay_event_loop_trace(&forged, &model).unwrap_err().code,
            "EVENT_LOOP_SEMANTIC"
        );
    }
    let (mut trace, model) = failure_case("state-overflow");
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap();
    let mut reset = fixture["base"]["entries"][3].clone();
    reset["decision"]["resources"]["fuel"] = json!(1);
    identify(&mut reset, &model["digest"]);
    trace["entries"].as_array_mut().unwrap().push(reset);
    seal(&mut trace);
    let (_, summary) = replay_event_loop_trace(&trace, &model).unwrap();
    assert_eq!(
        (summary.failed, summary.quiet, summary.fuel_claimed),
        (1, 1, 24)
    );
    assert_eq!(canonical(&json!({"count":0})).unwrap().len(), 11);
}
