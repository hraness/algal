use algal::{
    canonical::digest, event_loop_contract::parse_event_loop_trace,
    event_loop_structure::verify_event_loop_trace_structure,
};
use serde_json::{Value, json};
fn trace() -> Value {
    serde_json::from_str::<Value>(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap()["base"]
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
fn code(value: &Value, model: &Value) -> String {
    verify_event_loop_trace_structure(value, model)
        .map(|_| "ACCEPTED".to_owned())
        .unwrap_or_else(|error| error.code)
}
#[test]
fn event_loop_structure_checks_pinned_declarations_not_claimed_execution() {
    let base = trace();
    let model = behavior();
    let (identity, summary) = verify_event_loop_trace_structure(&base, &model).unwrap();
    assert_eq!(identity, base["digest"]);
    assert_eq!(
        serde_json::to_value(summary).unwrap(),
        json!({"events":3,"transitions":2,"writes":2,"notifications":1,"deferrals":0,"escalations":0})
    );
    let mut forged = base.clone();
    forged["entries"][3]["decision"] = forged["entries"][0]["decision"].clone();
    seal(&mut forged);
    assert_eq!(parse_event_loop_trace(&forged).unwrap(), forged["digest"]);
    assert_eq!(code(&forged, &model), "EVENT_LOOP_REFERENCE");
    forged["entries"][3]["decision"]["transition"] = json!("reset");
    seal(&mut forged);
    assert_eq!(code(&forged, &model), "EVENT_LOOP_SEMANTIC");
    forged["entries"][3]["decision"]["outcome"] = json!("quiet");
    forged["entries"][3]["decision"]["outputs"] = json!([]);
    forged["entries"][3]["decision"]["resources"]["outputEvents"] = json!(0);
    seal(&mut forged);
    assert_eq!(code(&forged, &model), "ACCEPTED");
}
#[test]
fn event_loop_structure_refuses_unmatched_schema_limits_and_behavior_digest() {
    let base = trace();
    let model = behavior();
    let mut mismatch = base.clone();
    mismatch["limits"]["maxMailboxDepth"] = json!(65);
    mismatch["entries"][2]["depthBefore"] = json!(65);
    seal(&mut mismatch);
    assert_eq!(code(&mismatch, &model), "EVENT_LOOP_SEMANTIC");
    let mut changed = model.clone();
    changed["actors"][0]["transitions"][1]["outputs"] =
        changed["actors"][0]["transitions"][0]["outputs"].clone();
    assert_eq!(code(&base, &changed), "EVENT_LOOP_DIGEST");
    let mut extra = model.clone();
    extra["unexpected"] = json!(1);
    assert_eq!(code(&base, &extra), "EVENT_LOOP_UNKNOWN_KEY");
    let mut large = model.clone();
    large["unexpected"] = json!("x".repeat(65_537));
    assert_eq!(code(&base, &large), "EVENT_LOOP_BOUNDS");
    let mut wrong = base.clone();
    wrong["entries"][3]["payload"] = json!({"amount":1});
    let entry = &mut wrong["entries"][3];
    entry["eventDigest"] = json!(digest(&json!({"behavior":base["behavior"],"actor":base["actor"],"source":entry["source"],"sequence":0,"type":"reset","payload":entry["payload"]})).unwrap());
    entry["messageDigest"] = json!(
        digest(&json!({"event":entry["eventDigest"],"target":base["actor"],"delivery":"later"}))
            .unwrap()
    );
    seal(&mut wrong);
    assert_eq!(code(&wrong, &model), "EVENT_LOOP_UNKNOWN_KEY");
}
#[test]
fn event_loop_structure_refuses_repeated_write_path_in_redigested_behavior() {
    let mut model = behavior();
    let duplicated = model["actors"][0]["transitions"][0]["writes"][0].clone();
    model["actors"][0]["transitions"][0]["writes"]
        .as_array_mut()
        .unwrap()
        .push(duplicated);
    seal(&mut model);
    let mut bound = trace();
    bound["behavior"] = model["digest"].clone();
    let behavior_digest = bound["behavior"].clone();
    let actor = bound["actor"].clone();
    for entry in bound["entries"].as_array_mut().unwrap() {
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
    seal(&mut bound);
    assert_eq!(parse_event_loop_trace(&bound).unwrap(), bound["digest"]);
    assert_eq!(code(&bound, &model), "EVENT_LOOP_SEMANTIC");
}
