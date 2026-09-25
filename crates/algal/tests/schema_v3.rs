use algal::{
    canonical::canonical,
    contract::{Manifest, bind_output, check_value},
    effects::Host,
    graph::Transports,
    runtime,
    store::Store,
};
use serde_json::{Value, json};

// Schema version 3 shares its cases with the reference runtime:
// scripts/fixtures/schema-v3-admission.json and schema-v3-values.json.

fn cell_for(schema: &Value, version: &Value, index: usize) -> Value {
    match index {
        0 => json!({"id":"answer","kind":"agent","prompt":"No effect before admission.",
            "output":{"kind":"json","schema":schema,"schemaVersion":version}}),
        1 => {
            json!({"id":"answer","kind":"agent","inputs":{"data":{"type":"json","schema":schema,"schemaVersion":version}},
            "prompt":"No effect before admission.","output":{"kind":"text"}})
        }
        _ => {
            json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":schema,"schemaVersion":version}}})
        }
    }
}

fn cells(schema: &Value, version: &Value) -> [Value; 3] {
    [
        cell_for(schema, version, 0),
        cell_for(schema, version, 1),
        cell_for(schema, version, 2),
    ]
}

fn manifest(cell: Value) -> Value {
    json!({"contract":"algal.organism.v1","key":"organism:schema-v3","name":"Schema version 3","cells":[cell],"edges":[]})
}

#[test]
fn version_3_declarations_are_refused_with_the_reference_reasons() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/schema-v3-admission.json"
    ))
    .unwrap();
    for case in fixture.as_array().unwrap() {
        let name = case["name"].as_str().unwrap();
        let version = case.get("version").cloned().unwrap_or(json!(3));
        for cell in cells(&case["schema"], &version) {
            let error = Manifest::parse(&manifest(cell)).unwrap_err();
            assert_eq!(
                (error.code.as_str(), error.message.as_str()),
                ("PARSE_FAILED", case["reason"].as_str().unwrap()),
                "case {name}"
            );
        }
    }
}

#[test]
fn version_3_bounds_are_inclusive_and_the_version_is_exact() {
    fn nested(levels: usize) -> Value {
        if levels == 1 {
            json!({"type":"string"})
        } else {
            json!({"type":"array","items":nested(levels - 1)})
        }
    }
    for schema in [
        json!({"type":"integer","minimum":-9007199254740991_i64,"maximum":9007199254740991_i64}),
        json!({"type":"string","minLength":0,"maxLength":1_000_000}),
        json!({"type":"string","format":"digest"}),
        json!({"type":"array","uniqueItems":true}),
        json!({"type":["array","null"],"uniqueItems":true}),
        json!({"type":"object","properties":{},"additionalProperties":false}),
        json!({"type":["object","null"],"properties":{"a":{}},"additionalProperties":false}),
        json!({"type":"array","items":nested(7)}),
    ] {
        for cell in cells(&schema, &json!(3)) {
            let parsed = Manifest::parse(&manifest(cell)).unwrap();
            // The version survives canonical storage and is part of identity.
            let stored =
                Manifest::parse(&serde_json::from_str(&canonical(&parsed.value).unwrap()).unwrap())
                    .unwrap();
            assert_eq!(parsed.digest().unwrap(), stored.digest().unwrap());
        }
    }
    // A format name at the length bound still must be one of the fixed names.
    for cell in cells(&json!({"type":"string","format":"x".repeat(32)}), &json!(3)) {
        assert_eq!(
            Manifest::parse(&manifest(cell)).unwrap_err().message,
            "format must name digest, name, slug, or uri"
        );
    }
    // A float spelling of 3 is the same number and the same canonical bytes.
    let float = json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":{"type":"string"},"schemaVersion":3.0}}});
    let integer = json!({"id":"input","kind":"input","outputs":{"data":{"type":"json","schema":{"type":"string"},"schemaVersion":3}}});
    assert_eq!(
        Manifest::parse(&manifest(float)).unwrap().digest().unwrap(),
        Manifest::parse(&manifest(integer))
            .unwrap()
            .digest()
            .unwrap()
    );
}

#[test]
fn version_3_values_match_the_reference_messages() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../scripts/fixtures/schema-v3-values.json"
    ))
    .unwrap();
    for case in fixture.as_array().unwrap() {
        let schema = &case["schema"];
        let version = case.get("version").cloned().unwrap_or(json!(3));
        let port = json!({"type":"json","schema":schema,"schemaVersion":version});
        let contract = json!({"kind":"json","schema":schema,"schemaVersion":version});
        for cell in cells(schema, &version) {
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
    let hints = json!({"type":"json","schema":{"type":"object","properties":{"a":{"type":"object"}},"additionalProperties":false}});
    check_value(&hints, &json!({"a":{},"b":2})).unwrap();
    let hints = json!({"type":"json","schema":{"type":"array","uniqueItems":true}});
    check_value(&hints, &json!([1, 1])).unwrap();
    let checked = json!({"type":"json","schema":{"type":"object","properties":{"a":{}},"additionalProperties":false},"schemaVersion":3});
    assert_eq!(
        check_value(&checked, &json!({"a":{},"b":2}))
            .unwrap_err()
            .message,
        "undeclared field"
    );
    // Version 2 keeps its unbounded whole-number integer.
    let v2 = json!({"type":"json","schema":{"type":"integer"},"schemaVersion":2});
    check_value(&v2, &json!(9007199254740992_u64)).unwrap();
    let v3 = json!({"type":"json","schema":{"type":"integer"},"schemaVersion":3});
    assert_eq!(
        check_value(&v3, &json!(9007199254740992_u64))
            .unwrap_err()
            .message,
        "expected integer"
    );
}

#[tokio::test]
async fn version_3_failures_replay_after_canonical_storage() {
    // A closed record of unique lists, checked at the root input and at an
    // agent output.
    let record = json!({"type":"object","required":["id","tags"],"properties":{
        "id":{"type":"string","format":"slug"},
        "tags":{"type":"array","uniqueItems":true,"items":{"type":"string","minLength":1}},
        "urgency":{"type":"integer","minimum":0,"maximum":5}},"additionalProperties":false});
    let root = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:schema-v3-root","name":"Root",
        "cells":[{"id":"input","kind":"input","outputs":{"task":{"type":"json","schema":record,"schemaVersion":3}}}],
        "edges":[]
    }))
    .unwrap();
    let answer = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:schema-v3-answer","name":"Answer",
        "cells":[{"id":"answer","kind":"agent","prompt":"Return fixture output.",
            "output":{"kind":"json","schema":record,"schemaVersion":3}}],"edges":[]
    }))
    .unwrap();
    for (manifest, args, responses, expected) in [
        (
            root.clone(),
            json!({"input":{"task":{"id":"a-1","tags":["x","x"]}}}),
            json!({}),
            json!({"code":"TYPE_MISMATCH","message":"repeated item","path":"input"}),
        ),
        (
            root.clone(),
            json!({"input":{"task":{"id":"a-1","tags":["x"],"extra":true}}}),
            json!({}),
            json!({"code":"TYPE_MISMATCH","message":"undeclared field","path":"input"}),
        ),
        (
            root.clone(),
            json!({"input":{"task":{"id":"A","tags":["x"]}}}),
            json!({}),
            json!({"code":"TYPE_MISMATCH","message":"text is not a slug","path":"input"}),
        ),
        (
            answer.clone(),
            json!({}),
            json!({"answer":[{"id":"a-1","tags":["x"],"urgency":9.5}]}),
            json!({"code":"EFFECT_UNPARSEABLE","message":"expected integer","path":"answer"}),
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
