use algal::{
    canonical::canonical, contract::Manifest, effects::Host, graph::Transports, runtime,
    store::Store,
};
use serde_json::{Value, json};

#[tokio::test]
async fn schema_failure_replays_after_canonical_manifest_storage() {
    // Canonical storage changes insertion order. All three schemas have
    // multiple invalid fields with distinct diagnostics, so changing traversal
    // would alter the receipt even though the manifest digest stayed the same.
    for (schema, response, message) in [
        (
            r#"{"properties":{"z":{"type":"string"},"a":{"required":["new"]}}}"#,
            json!({"z":3,"a":{}}),
            "missing required field",
        ),
        (
            r#"{"properties":{"😀":{"type":"boolean"},"\ue000":{"type":"number"}}}"#,
            json!({"😀":3,"\u{e000}":false}),
            "expected number",
        ),
        (
            r#"{"properties":{"2":{"type":"boolean"},"10":{"type":"string"}}}"#,
            json!({"2":3,"10":false}),
            "expected string",
        ),
    ] {
        let schema: Value = serde_json::from_str(schema).unwrap();
        let manifest = Manifest::parse(&json!({
            "contract":"algal.organism.v1", "key":"organism:schema-order", "name":"Schema order",
            "cells":[{"id":"answer","kind":"agent","prompt":"Return fixture output.",
                "output":{"kind":"json","schema":schema}}], "edges":[]
        }))
        .unwrap();
        let stored =
            Manifest::parse(&serde_json::from_str(&canonical(&manifest.value).unwrap()).unwrap())
                .unwrap();
        assert_eq!(manifest.digest().unwrap(), stored.digest().unwrap());
        let mut store = Store::default();
        let mut host = Host::scripted(json!({"answer":response}));
        let receipt = runtime::run(
            manifest,
            json!({}),
            &mut store,
            &mut host,
            &Transports::new(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(receipt["failure"]["code"], "EFFECT_UNPARSEABLE");
        assert_eq!(receipt["failure"]["message"], message);
        let verified = runtime::verify(&receipt, stored, &store, &Host::default())
            .await
            .unwrap();
        assert_eq!(verified["ok"], true, "{verified}");
    }
}

#[test]
fn malformed_schema_is_rejected_at_every_manifest_boundary() {
    let cases: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/schema-admission.json"
    ))
    .unwrap();
    for case in cases.as_array().unwrap() {
        let schema = &case["schema"];
        for cell in [
            json!({"id":"answer","kind":"agent","prompt":"No effect before admission.","output":{"kind":"json","schema":schema}}),
            json!({"id":"answer","kind":"agent","inputs":{"data":{"type":"json","schema":schema}},"prompt":"No effect before admission.","output":{"kind":"text"}}),
            json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":schema}}}),
        ] {
            let value = json!({"contract":"algal.organism.v1","key":"organism:admission","name":"Admission","cells":[cell],"edges":[]});
            let error = Manifest::parse(&value).unwrap_err();
            assert_eq!(error.code, "PARSE_FAILED", "case {}: {error}", case["name"]);
        }
    }
}

#[test]
fn provider_hints_remain_opaque_and_manifest_bytes_are_bounded() {
    let value = json!({"contract":"algal.organism.v1","key":"organism:admission","name":"Admission",
        "cells":[{"id":"answer","kind":"agent","prompt":"Return fixture.","output":{"kind":"json","schema":{
            "type":"array","items":{"type":"provider-specific"},"description":""}}}],"edges":[]});
    let mut normalized = Manifest::parse(&value).unwrap().value;
    let base = canonical(&normalized).unwrap().len();
    normalized["cells"][0]["output"]["schema"]["description"] = json!("x".repeat(1_048_576 - base));
    assert_eq!(canonical(&normalized).unwrap().len(), 1_048_576);
    assert!(Manifest::parse(&normalized).is_ok());
    normalized["cells"][0]["output"]["schema"]["description"] = json!("x".repeat(1_048_577 - base));
    assert_eq!(
        Manifest::parse(&normalized).unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
}

#[test]
fn normalization_cannot_exceed_the_retained_manifest_bound() {
    let mut value = json!({"contract":"algal.organism.v1","key":"organism:admission","name":"Admission",
        "cells":[{"id":"answer","kind":"agent","prompt":"Return fixture.","output":{"kind":"json","schema":{"description":""}}}],"edges":[]});
    let base = canonical(&value).unwrap().len();
    value["cells"][0]["output"]["schema"]["description"] = json!("x".repeat(1_048_576 - base));
    assert_eq!(canonical(&value).unwrap().len(), 1_048_576);
    assert_eq!(
        Manifest::parse(&value).unwrap_err().code,
        "BUDGET_EXHAUSTED"
    );
}
