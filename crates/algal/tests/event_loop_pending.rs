use algal::{
    canonical::{canonical, digest},
    event_loop_contract::parse_event_loop_trace,
    event_loop_replay::replay_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap()
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
fn pending(kind: &str, witness: Value) -> (Value, Value) {
    let mut model = behavior();
    let rule = &mut model["actors"][0]["transitions"][0];
    rule["writes"] = json!([]);
    rule["outputs"] = json!([]);
    rule["result"] = if kind == "defer" {
        json!({"kind":"defer","key":{"contract":"algal.expr.v1","program":witness}})
    } else {
        json!({"kind":"escalate","request":{"contract":"algal.expr.v1","program":witness}})
    };
    seal(&mut model);
    let mut trace = fixture()["base"].clone();
    trace["entries"] = json!([trace["entries"][0].clone()]);
    trace["behavior"] = model["digest"].clone();
    let entry = &mut trace["entries"][0];
    entry["eventDigest"] = json!(
        digest(&json!({"behavior":model["digest"],
        "actor":"counter","source":"source-a","sequence":0,"type":"increment",
        "payload":{"amount":1}}))
        .unwrap()
    );
    entry["messageDigest"] = json!(
        digest(&json!({"event":entry["eventDigest"],
        "target":"counter","delivery":"first"}))
        .unwrap()
    );
    entry["decision"] = json!({"kind":"accepted","transition":"increment","outcome":kind,
        "stateDigest":digest(&json!({"count":0})).unwrap(),"outputs":[],"pending":witness,
        "effects":{"requested":0,"settled":0,"receipts":[]},
        "resources":{"fuel":if kind == "defer" {10} else {11},"stateBytes":11,"outputEvents":0}});
    seal(&mut trace);
    (trace, model)
}

#[test]
fn event_loop_pending_checked_values_and_fuel() {
    for (kind, witness) in [
        ("defer", json!("ticket")),
        ("escalate", json!({"action":"review"})),
        ("defer", Value::Null),
    ] {
        let (trace, model) = pending(kind, witness);
        assert_eq!(parse_event_loop_trace(&trace).unwrap(), trace["digest"]);
        assert_eq!(
            verify_event_loop_trace_structure(&trace, &model).unwrap().0,
            trace["digest"]
        );
        let (identity, summary) = replay_event_loop_trace(&trace, &model).unwrap();
        assert_eq!(identity, trace["digest"]);
        assert_eq!(summary.fuel_claimed, if kind == "defer" { 10 } else { 11 });
        assert_eq!(summary.effects_requested_claimed, 0);
        for mutation in ["missing", "wrong-value", "wrong-fuel"] {
            let mut wrong = trace.clone();
            match mutation {
                "missing" => {
                    wrong["entries"][0]["decision"]
                        .as_object_mut()
                        .unwrap()
                        .remove("pending");
                }
                "wrong-value" => wrong["entries"][0]["decision"]["pending"] = json!(false),
                _ => {
                    wrong["entries"][0]["decision"]["resources"]["fuel"] =
                        json!(if kind == "defer" { 9 } else { 10 })
                }
            }
            seal(&mut wrong);
            assert_eq!(parse_event_loop_trace(&wrong).unwrap(), wrong["digest"]);
            assert_eq!(
                replay_event_loop_trace(&wrong, &model).unwrap_err().code,
                "EVENT_LOOP_SEMANTIC"
            );
        }
    }
}

#[test]
fn event_loop_pending_witness_limits_and_failed_expression() {
    let (mut trace, mut model) = pending("escalate", json!({"action":"review"}));
    let mut boundary = trace.clone();
    boundary["entries"][0]["decision"]["pending"] = json!("x".repeat(16_382));
    seal(&mut boundary);
    assert_eq!(
        canonical(&boundary["entries"][0]["decision"]["pending"])
            .unwrap()
            .len(),
        16_384
    );
    assert_eq!(
        parse_event_loop_trace(&boundary).unwrap(),
        boundary["digest"]
    );
    boundary["entries"][0]["decision"]["pending"] = json!("x".repeat(16_383));
    seal(&mut boundary);
    assert_eq!(
        parse_event_loop_trace(&boundary).unwrap_err().code,
        "EVENT_LOOP_BOUNDS"
    );
    let mut unexpected = fixture()["base"].clone();
    unexpected["entries"] = json!([unexpected["entries"][0].clone()]);
    unexpected["entries"][0]["decision"]["pending"] = Value::Null;
    seal(&mut unexpected);
    assert_eq!(
        parse_event_loop_trace(&unexpected).unwrap_err().code,
        "EVENT_LOOP_UNKNOWN_KEY"
    );

    model["limits"]["maxTransitionFuel"] = json!(9);
    trace["limits"]["maxTransitionFuel"] = json!(9);
    seal(&mut model);
    trace["behavior"] = model["digest"].clone();
    let entry = &mut trace["entries"][0];
    entry["eventDigest"] = json!(
        digest(&json!({"behavior":model["digest"],
        "actor":"counter","source":"source-a","sequence":0,"type":"increment",
        "payload":{"amount":1}}))
        .unwrap()
    );
    entry["messageDigest"] = json!(
        digest(&json!({"event":entry["eventDigest"],
        "target":"counter","delivery":"first"}))
        .unwrap()
    );
    entry["decision"] = json!({"kind":"failed","reason":"fuel-exhausted","transition":"increment",
        "stateDigest":digest(&json!({"count":0})).unwrap(),
        "resources":{"fuel":9,"stateBytes":11,"outputEvents":0}});
    seal(&mut trace);
    assert_eq!(replay_event_loop_trace(&trace, &model).unwrap().1.failed, 1);
}
