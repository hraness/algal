use algal::{
    canonical::{canonical, digest},
    event_loop_contract::parse_event_loop_trace,
    event_loop_replay::{event_loop_notification_digest, replay_event_loop_trace},
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};

fn fixture() -> Value {
    serde_json::from_str::<Value>(include_str!(
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
fn replayable() -> Value {
    let mut trace = fixture()["base"].clone();
    trace["entries"][0]["decision"]["resources"]["fuel"] = json!(27);
    trace["entries"][0]["decision"]["outputs"][0] = json!(
        event_loop_notification_digest(
            trace["entries"][0]["messageDigest"].as_str().unwrap(),
            "increment",
            0,
            "counter",
            "incremented",
            &json!({"amount":1}),
        )
        .unwrap()
    );
    trace["entries"][3]["decision"]["resources"]["fuel"] = json!(1);
    seal(&mut trace);
    trace
}

#[test]
fn event_loop_replay_derives_outputs_state_and_fuel() {
    let trace = replayable();
    let (identity, summary) = replay_event_loop_trace(&trace, &behavior()).unwrap();
    assert_eq!(identity, trace["digest"]);
    assert_eq!(summary.accepted, 2);
    assert_eq!(summary.duplicate, 1);
    assert_eq!(summary.backpressure, 1);
    assert_eq!(summary.fuel_claimed, 28);
    assert_eq!(summary.notifications_claimed, 1);
    let mut changed = trace.clone();
    changed["entries"][0]["decision"]["outputs"][0] = json!(format!("sha256:{}", "0".repeat(64)));
    seal(&mut changed);
    assert_eq!(parse_event_loop_trace(&changed).unwrap(), changed["digest"]);
    assert_eq!(
        verify_event_loop_trace_structure(&changed, &behavior())
            .unwrap()
            .0,
        changed["digest"]
    );
    assert_eq!(
        replay_event_loop_trace(&changed, &behavior())
            .unwrap_err()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
    let mut changed = trace.clone();
    changed["entries"][0]["decision"]["stateDigest"] = json!(digest(&json!({"count":2})).unwrap());
    seal(&mut changed);
    assert_eq!(
        replay_event_loop_trace(&changed, &behavior())
            .unwrap_err()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
    let mut changed = trace;
    changed["entries"][0]["decision"]["resources"]["fuel"] = json!(26);
    seal(&mut changed);
    assert_eq!(
        replay_event_loop_trace(&changed, &behavior())
            .unwrap_err()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
}

#[test]
fn event_loop_replay_guard_and_boundaries() {
    let mut trace = replayable();
    trace["entries"] = json!([trace["entries"][0].clone()]);
    trace["entries"][0]["payload"]["amount"] = json!(0);
    trace["entries"][0]["eventDigest"] =
        json!(digest(&json!({
        "behavior": trace["behavior"], "actor": trace["actor"],
        "source": trace["entries"][0]["source"], "sequence": trace["entries"][0]["sequence"],
        "type": trace["entries"][0]["type"], "payload": trace["entries"][0]["payload"]
    })).unwrap());
    trace["entries"][0]["messageDigest"] = json!(
        digest(&json!({
            "event": trace["entries"][0]["eventDigest"], "target": trace["actor"],
            "delivery": trace["entries"][0]["delivery"]
        }))
        .unwrap()
    );
    trace["entries"][0]["decision"] = json!({
        "kind":"accepted", "transition":null, "outcome":"no-transition",
        "stateDigest":digest(&json!({"count":0})).unwrap(), "outputs":[],
        "effects":{"requested":0,"settled":0,"receipts":[]},
        "resources":{"fuel":9,"stateBytes":canonical(&json!({"count":0})).unwrap().len(),"outputEvents":0}
    });
    seal(&mut trace);
    assert_eq!(
        replay_event_loop_trace(&trace, &behavior())
            .unwrap()
            .1
            .unmatched,
        1
    );
    assert!(
        event_loop_notification_digest(
            "parent",
            "increment",
            63,
            "counter",
            "incremented",
            &json!({"amount":1})
        )
        .is_ok()
    );
    for ordinal in [64, usize::MAX] {
        assert_eq!(
            event_loop_notification_digest(
                "parent",
                "increment",
                ordinal,
                "counter",
                "incremented",
                &json!({"amount":1})
            )
            .unwrap_err()
            .code,
            "EVENT_LOOP_BOUNDS"
        );
    }
    assert_eq!(
        replay_event_loop_trace(&fixture()["failed"], &behavior())
            .unwrap_err()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );
}

#[test]
fn event_loop_replay_refuses_failed_and_pending_after_structural_acceptance() {
    let mut failed = fixture()["failed"].clone();
    failed["entries"][0] = replayable()["entries"][0].clone();
    seal(&mut failed);
    let mut prefix = failed.clone();
    prefix["entries"] = json!([prefix["entries"][0].clone()]);
    seal(&mut prefix);
    assert_eq!(
        replay_event_loop_trace(&prefix, &behavior()).unwrap().0,
        prefix["digest"]
    );
    assert_eq!(parse_event_loop_trace(&failed).unwrap(), failed["digest"]);
    assert_eq!(
        verify_event_loop_trace_structure(&failed, &behavior())
            .unwrap()
            .0,
        failed["digest"]
    );
    assert_eq!(
        replay_event_loop_trace(&failed, &behavior())
            .unwrap_err()
            .code,
        "EVENT_LOOP_SEMANTIC"
    );

    for outcome in ["defer", "escalate"] {
        let mut model = behavior();
        let rule = &mut model["actors"][0]["transitions"][0];
        rule["writes"] = json!([]);
        rule["outputs"] = json!([]);
        rule["result"] = if outcome == "defer" {
            json!({"kind":"defer","key":{"contract":"algal.expr.v1","program":"ticket"}})
        } else {
            json!({"kind":"escalate","request":{"contract":"algal.expr.v1","program":{"action":"review"}}})
        };
        seal(&mut model);
        let mut pending = prefix.clone();
        pending["behavior"] = model["digest"].clone();
        let entry = &mut pending["entries"][0];
        entry["eventDigest"] = json!(
            digest(
                &json!({"behavior":model["digest"],"actor":"counter","source":"source-a",
                "sequence":0,"type":"increment","payload":{"amount":1}})
            )
            .unwrap()
        );
        entry["messageDigest"] = json!(
            digest(&json!({"event":entry["eventDigest"],"target":"counter","delivery":"first"}))
                .unwrap()
        );
        entry["decision"] = json!({"kind":"accepted","transition":"increment","outcome":outcome,
            "stateDigest":digest(&json!({"count":0})).unwrap(),"outputs":[],
            "effects":{"requested":0,"settled":0,"receipts":[]},
            "resources":{"fuel":0,"stateBytes":canonical(&json!({"count":0})).unwrap().len(),"outputEvents":0}});
        seal(&mut pending);
        assert_eq!(parse_event_loop_trace(&pending).unwrap(), pending["digest"]);
        assert_eq!(
            verify_event_loop_trace_structure(&pending, &model)
                .unwrap()
                .0,
            pending["digest"]
        );
        assert_eq!(
            replay_event_loop_trace(&pending, &model).unwrap_err().code,
            "EVENT_LOOP_SEMANTIC"
        );
    }
}
