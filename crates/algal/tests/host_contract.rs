// Shared fixture parity: scripts/fixtures/host-contract.json is also exercised
// by src/host-contract.test.ts, so both runtimes accept the same canonical
// records and reject the same invalid ones.
use algal::host_contract;
use serde_json::Value;

const FIXTURE: &str = include_str!("../../../scripts/fixtures/host-contract.json");

fn apply_ops(record: &Value, ops: &Value) -> Value {
    let mut root = record.clone();
    for op in ops.as_array().unwrap() {
        let name = op[0].as_str().unwrap();
        let path = op[1].as_array().unwrap();
        let mut target = &mut root;
        for key in &path[..path.len() - 1] {
            target = match key {
                Value::String(key) => &mut target[key.as_str()],
                Value::Number(index) => &mut target[index.as_u64().unwrap() as usize],
                _ => panic!("invalid fixture path"),
            };
        }
        let last = &path[path.len() - 1];
        match (name, last) {
            ("set", Value::String(key)) => target[key.as_str()] = op[2].clone(),
            ("set", Value::Number(index)) => {
                target.as_array_mut().unwrap()[index.as_u64().unwrap() as usize] = op[2].clone()
            }
            ("del" | "delete", Value::String(key)) => {
                target.as_object_mut().unwrap().remove(key.as_str());
            }
            ("del" | "delete", Value::Number(index)) => {
                target
                    .as_array_mut()
                    .unwrap()
                    .remove(index.as_u64().unwrap() as usize);
            }
            _ => panic!("invalid fixture op"),
        }
    }
    root
}

#[test]
fn valid_records_parse_with_identical_digests() {
    let fixture: Value = serde_json::from_str(FIXTURE).unwrap();
    assert_eq!(fixture["contract"], "algal.host-contract-fixtures.v1");
    for name in [
        "evaluationEvidence",
        "hostProfile",
        "promotionDecision",
        "hostLifecycle",
    ] {
        let record = &fixture["valid"][name];
        host_contract::verify(record).unwrap_or_else(|e| panic!("{name}: {e}"));
    }
}

#[test]
fn invalid_fixtures_are_rejected_with_the_same_code() {
    let fixture: Value = serde_json::from_str(FIXTURE).unwrap();
    for entry in fixture["invalid"].as_array().unwrap() {
        let record = &fixture["valid"][entry["record"].as_str().unwrap()];
        let mutated = apply_ops(record, &entry["ops"]);
        let error = host_contract::verify(&mutated).expect_err("fixture must be rejected");
        assert_eq!(
            error.code,
            entry["error"].as_str().unwrap(),
            "fixture {}",
            entry["name"]
        );
    }
}
