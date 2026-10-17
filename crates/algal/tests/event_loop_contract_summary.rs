use algal::{canonical::digest, event_loop_contract::summarize_event_loop_trace};
use serde_json::{Value, json};

fn base() -> Value {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/event-loop-contract.json"
    ))
    .unwrap();
    fixture["base"].clone()
}

fn seal(trace: &mut Value) {
    let behavior = trace["behavior"].clone();
    let actor = trace["actor"].clone();
    for entry in trace["entries"].as_array_mut().unwrap() {
        entry["eventDigest"] = json!(
            digest(&json!({
                "behavior":behavior,"actor":actor,"source":entry["source"],
                "sequence":entry["sequence"],"type":entry["type"],"payload":entry["payload"]
            }))
            .unwrap()
        );
        entry["messageDigest"] = json!(
            digest(&json!({
                "event":entry["eventDigest"],"target":actor,"delivery":entry["delivery"]
            }))
            .unwrap()
        );
    }
    let mut body = trace.clone();
    body.as_object_mut().unwrap().remove("digest");
    trace["digest"] = json!(digest(&body).unwrap());
}

#[test]
fn event_loop_contract_summary_accepts_integer_valued_json_float_and_rejects_unchecked_claims() {
    let mut trace = base();
    trace["entries"] = json!([trace["entries"][0]]);
    trace["entries"][0]["decision"]["resources"]["fuel"] = serde_json::from_str("1.0").unwrap();
    trace["entries"][0]["decision"]["effects"]["requested"] = serde_json::from_str("0.0").unwrap();
    seal(&mut trace);
    let (identity, counts) = summarize_event_loop_trace(&trace).unwrap();
    assert_eq!(identity, trace["digest"]);
    assert_eq!(counts.accepted, 1);
    assert_eq!(counts.fuel_claimed, 1);
    assert_eq!(counts.notifications_claimed, 1);
    assert_eq!(counts.effects_requested_claimed, 0);
    trace["entries"][0]["decision"]["effects"]["requested"] = json!(1);
    seal(&mut trace);
    assert_eq!(
        summarize_event_loop_trace(&trace).unwrap_err().code,
        "EVENT_LOOP_SEMANTIC"
    );
}

#[test]
fn event_loop_contract_summary_counts_at_the_256_entry_and_fuel_limits() {
    let mut trace = base();
    trace["limits"]["maxTransitionFuel"] = json!(100_000);
    let mut first = trace["entries"][0].clone();
    first["decision"]["outcome"] = json!("quiet");
    first["decision"]["outputs"] = json!([]);
    first["decision"]["resources"] = json!({"fuel":100_000,"stateBytes":16_384,"outputEvents":0});
    let mut entries = Vec::new();
    for sequence in 0..256 {
        let mut entry = first.clone();
        entry["sequence"] = json!(sequence);
        entry["delivery"] = json!(format!("attempt-{sequence}"));
        entries.push(entry);
    }
    trace["entries"] = json!(entries);
    seal(&mut trace);
    let (_, counts) = summarize_event_loop_trace(&trace).unwrap();
    assert_eq!(counts.accepted, 256);
    assert_eq!(counts.fuel_claimed, 25_600_000);
    assert_eq!(counts.peak_state_bytes_claimed, 16_384);
    trace["entries"].as_array_mut().unwrap().push(first);
    seal(&mut trace);
    assert_eq!(
        summarize_event_loop_trace(&trace).unwrap_err().code,
        "EVENT_LOOP_BOUNDS"
    );
}
