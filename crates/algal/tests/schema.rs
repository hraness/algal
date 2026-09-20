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
