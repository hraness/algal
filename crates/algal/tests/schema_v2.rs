use algal::{
    canonical::canonical,
    contract::{Manifest, bind_output, check_value},
    effects::Host,
    graph::Transports,
    runtime,
    store::Store,
};
use serde_json::{Value, json};

// Schema version 2 shares its cases with the reference runtime:
// scripts/fixtures/schema-v2-admission.json and schema-v2-values.json.

fn cells(schema: &Value, version: Value) -> [Value; 3] {
    [
        json!({"id":"answer","kind":"agent","prompt":"No effect before admission.",
            "output":{"kind":"json","schema":schema,"schemaVersion":version}}),
        json!({"id":"answer","kind":"agent","inputs":{"data":{"type":"json","schema":schema,"schemaVersion":version}},
            "prompt":"No effect before admission.","output":{"kind":"text"}}),
        json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":schema,"schemaVersion":version}}}),
    ]
}

fn manifest(cell: Value) -> Value {
    json!({"contract":"algal.organism.v1","key":"organism:schema-v2","name":"Schema version 2","cells":[cell],"edges":[]})
}

fn names(count: usize) -> Value {
    Value::Array((0..count).map(|i| json!(format!("f{i}"))).collect())
}

#[test]
fn version_2_declarations_are_refused_with_the_reference_reasons() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/schema-v2-admission.json"
    ))
    .unwrap();
    let mut cases: Vec<(String, Value, String)> = fixture
        .as_array()
        .unwrap()
        .iter()
        .map(|case| {
            (
                case["name"].as_str().unwrap().to_owned(),
                case["schema"].clone(),
                case["reason"].as_str().unwrap().to_owned(),
            )
        })
        .collect();
    let properties: serde_json::Map<String, Value> =
        (0..65).map(|i| (format!("f{i}"), json!({}))).collect();
    for (name, schema, reason) in [
        (
            "required-over-bound",
            json!({"required":names(65)}),
            "required must list at most 64 distinct names of at most 64 UTF-16 code units",
        ),
        (
            "properties-over-bound",
            json!({"properties":properties}),
            "properties must map at most 64 names to schemas",
        ),
        (
            "enum-over-bound",
            json!({"type":"number","enum":(0..33).collect::<Vec<_>>()}),
            "enum must list 1 to 32 distinct values",
        ),
        (
            "enum-value-over-bound",
            json!({"type":"string","enum":["x".repeat(255)]}),
            "enum values must be strings, finite numbers, booleans, or null of at most 256 canonical JSON bytes",
        ),
    ] {
        cases.push((name.to_owned(), schema, reason.to_owned()));
    }
    for (name, schema, reason) in cases {
        for cell in cells(&schema, json!(2)) {
            let error = Manifest::parse(&manifest(cell)).unwrap_err();
            assert_eq!(
                (error.code.as_str(), error.message.as_str()),
                ("PARSE_FAILED", reason.as_str()),
                "case {name}"
            );
        }
    }
}

#[test]
fn version_2_bounds_are_inclusive_and_the_version_is_exact() {
    fn nested(levels: usize) -> Value {
        if levels == 1 {
            json!({"type":"string"})
        } else {
            json!({"type":"array","items":nested(levels - 1)})
        }
    }
    let properties: serde_json::Map<String, Value> =
        (0..64).map(|i| (format!("f{i}"), json!({}))).collect();
    for schema in [
        json!({"required":names(64)}),
        json!({"properties":properties}),
        json!({"type":"number","enum":(0..32).collect::<Vec<_>>()}),
        json!({"type":"string","enum":["x".repeat(254)]}),
        nested(8),
        json!({"type":["string","null"],"enum":["open",null]}),
        json!({"type":"integer","minimum":3,"maximum":3}),
        json!({"type":["number","string"],"minimum":-1.5}),
    ] {
        for cell in cells(&schema, json!(2)) {
            let parsed = Manifest::parse(&manifest(cell)).unwrap();
            // The version survives canonical storage and is part of identity.
            let stored =
                Manifest::parse(&serde_json::from_str(&canonical(&parsed.value).unwrap()).unwrap())
                    .unwrap();
            assert_eq!(parsed.digest().unwrap(), stored.digest().unwrap());
        }
    }
    for version in [json!(1), json!(4), json!("2"), Value::Null] {
        for cell in cells(&json!({"type":"string"}), version) {
            assert_eq!(
                Manifest::parse(&manifest(cell)).unwrap_err().message,
                "schemaVersion must be 2 or 3"
            );
        }
    }
    for cell in cells(&json!({"type":"string"}), json!(3)) {
        Manifest::parse(&manifest(cell)).unwrap();
    }
    for port in [
        json!({"type":"json","schemaVersion":2}),
        json!({"type":"text","schemaVersion":2}),
    ] {
        let cell = json!({"id":"input","kind":"input","outputs":{"data":port}});
        assert_eq!(
            Manifest::parse(&manifest(cell)).unwrap_err().message,
            "schemaVersion requires a schema"
        );
    }
    // A float spelling of 2 is the same number and the same canonical bytes.
    let float = json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":{"type":"string"},"schemaVersion":2.0}}});
    let integer = json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":{"type":"string"},"schemaVersion":2}}});
    assert_eq!(
        Manifest::parse(&manifest(float)).unwrap().digest().unwrap(),
        Manifest::parse(&manifest(integer))
            .unwrap()
            .digest()
            .unwrap()
    );
}

#[test]
fn version_2_values_match_the_reference_messages() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/schema-v2-values.json"
    ))
    .unwrap();
    for case in fixture.as_array().unwrap() {
        let schema = &case["schema"];
        let port = json!({"type":"json","schema":schema,"schemaVersion":2});
        let contract = json!({"kind":"json","schema":schema,"schemaVersion":2});
        for cell in cells(schema, json!(2)) {
            Manifest::parse(&manifest(cell)).unwrap();
        }
        for good in case["good"].as_array().unwrap() {
            check_value(&port, good).unwrap();
            bind_output(&contract, good.clone()).unwrap();
        }
        for bad in case["bad"].as_array().unwrap() {
            let (value, message) = (&bad[0], bad[1].as_str().unwrap());
            let error = check_value(&port, value).unwrap_err();
            assert_eq!(
                (error.code.as_str(), error.message.as_str()),
                ("TYPE_MISMATCH", message),
                "{} {value}",
                case["name"]
            );
            let error = bind_output(&contract, value.clone()).unwrap_err();
            assert_eq!(
                (error.code.as_str(), error.message.as_str()),
                ("EFFECT_UNPARSEABLE", message)
            );
        }
    }
    // Without schemaVersion the same keywords stay provider hints.
    let hints = json!({"type":"json","schema":{"type":"array","items":{"type":"string"}}});
    check_value(&hints, &json!([1, 2])).unwrap();
    let checked = json!({"type":"json","schema":{"type":"array","items":{"type":"string"}},"schemaVersion":2});
    assert_eq!(
        check_value(&checked, &json!([1, 2])).unwrap_err().message,
        "item 0: expected string"
    );
}

#[tokio::test]
async fn version_2_failures_replay_after_canonical_storage() {
    // A list of records with allowed values and bounds, checked at the root
    // input, at an expr result, and at an agent output.
    let task = json!({"type":"object","required":["id","status","urgency"],"properties":{
        "id":{"type":"string"},"status":{"type":"string","enum":["open","done"]},
        "urgency":{"type":"integer","minimum":0,"maximum":5}}});
    let tasks = json!({"type":"array","items":task});
    let root = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:schema-v2-root","name":"Root",
        "cells":[
            {"id":"input","kind":"input","outputs":{"tasks":{"type":"json","schema":tasks,"schemaVersion":2}}},
            {"id":"count","kind":"expr","inputs":{"tasks":"json"},
                "expr":{"contract":"algal.expr.v1","program":["len",["get","tasks"]]},
                "output":{"kind":"json","schema":{"type":"integer","maximum":2},"schemaVersion":2}}],
        "edges":[{"from":{"cell":"input","port":"tasks"},"to":{"cell":"count","port":"tasks"}}]
    }))
    .unwrap();
    let answer = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:schema-v2-answer","name":"Answer",
        "cells":[{"id":"answer","kind":"agent","prompt":"Return fixture output.",
            "output":{"kind":"json","schema":tasks,"schemaVersion":2}}],"edges":[]
    }))
    .unwrap();
    let open = |id: &str| json!({"id":id,"status":"open","urgency":1});
    for (manifest, args, responses, expected) in [
        (
            root.clone(),
            json!({"input":{"tasks":[open("a"),{"id":"b","status":"later","urgency":1}]}}),
            json!({}),
            json!({"code":"TYPE_MISMATCH","message":"item 1: expected an allowed value","path":"input"}),
        ),
        (
            root.clone(),
            json!({"input":{"tasks":[open("a"),open("b"),open("c")]}}),
            json!({}),
            json!({"code":"TYPE_MISMATCH","message":"number above maximum","path":"count"}),
        ),
        (
            answer.clone(),
            json!({}),
            json!({"answer":[[open("a"),{"id":"b","status":"open","urgency":9}]]}),
            json!({"code":"EFFECT_UNPARSEABLE","message":"item 1: number above maximum","path":"answer"}),
        ),
    ] {
        let stored =
            Manifest::parse(&serde_json::from_str(&canonical(&manifest.value).unwrap()).unwrap())
                .unwrap();
        let mut store = Store::default();
        let mut host = Host::scripted(responses);
        let receipt = runtime::run(
            manifest,
            args,
            &mut store,
            &mut host,
            &Transports::new(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(receipt["failure"], expected);
        let verified = runtime::verify(&receipt, stored, &store, &Host::default())
            .await
            .unwrap();
        assert_eq!(verified["ok"], true, "{verified}");
    }
}
