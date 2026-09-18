#![cfg(target_os = "macos")]

use serde_json::{Value, json};
use std::{
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
};

fn bridge() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("ALGAL_APPLE_BRIDGE") {
        let path = PathBuf::from(path);
        return path.exists().then_some(path);
    }
    let binary = std::env::current_exe().ok()?;
    // The CLI resolves `algal-apple` next to itself (target/debug); test
    // binaries live one level deeper in target/debug/deps.
    for dir in [binary.parent(), binary.parent()?.parent()] {
        let path = dir?.join("algal-apple");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

fn schema_check(bridge: &PathBuf, schema: &str) -> Value {
    let mut child = Command::new(bridge)
        .arg("--schema-check")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(schema.as_bytes())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    let envelope = if output.status.success() {
        String::from_utf8_lossy(&output.stdout).into_owned()
    } else {
        String::from_utf8_lossy(&output.stderr).into_owned()
    };
    serde_json::from_str(envelope.trim()).unwrap()
}

fn check(bridge: &PathBuf, schema: &str, expected: &str) {
    let envelope = schema_check(bridge, schema);
    if expected == "ok" {
        assert_eq!(envelope["ok"], json!(true), "schema: {schema}");
    } else {
        assert_eq!(
            envelope["ok"],
            json!(false),
            "schema {schema} should reject"
        );
        assert_eq!(
            envelope["error"]["code"],
            json!(expected),
            "schema: {schema}"
        );
    }
}

#[test]
fn schema_translation_accepts_supported_forms() {
    let Some(bridge) = bridge() else {
        eprintln!("algal-apple bridge not built; skipping");
        return;
    };
    for (schema, expected) in [
        (r#"{"type":"array","items":{"type":"string"}}"#, "ok"),
        (r#"{"type":"string"}"#, "ok"),
        (r#"{"type":"number"}"#, "ok"),
        (r#"{"type":"integer"}"#, "ok"),
        (r#"{"type":"boolean"}"#, "ok"),
        (r#"{"enum":["a","b","c"]}"#, "ok"),
        (
            r#"{"type":"object","properties":{"name":{"type":"string"},"n":{"type":"integer"}},"required":["name"]}"#,
            "ok",
        ),
        (
            r#"{"type":"array","items":{"type":"object","properties":{"v":{"type":"boolean"}}}}"#,
            "ok",
        ),
        (r#"{"type":"string","pattern":"^(fn:|const:)"}"#, "ok"),
        (
            r#"{"type":"array","items":{"type":"array","items":{"type":"array","items":{"type":"array","items":{"type":"string"}}}}}"#,
            "ok",
        ),
        (
            r#"{"type":"array","items":{"type":"array","items":{"type":"array","items":{"type":"array","items":{"type":"array","items":{"type":"string"}}}}}}"#,
            "schemaDepthExceeded",
        ),
        (r#"{"type":"array"}"#, "arraySchemaRequiresItems"),
        (r#"{"type":"funky"}"#, "unsupportedSchemaType"),
        (r#"{"enum":[]}"#, "invalidEnum"),
        (
            r#"{"enum":["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","a2","b2","c2","d2","e2","f2","g2"]}"#,
            "invalidEnum",
        ),
        (r#"{"type":"string","pattern":"["}"#, "invalidPattern"),
        (
            r#"{"type":"object","properties":{"a":{"type":"string"}},"required":["zz"]}"#,
            "requiredPropertyMissing",
        ),
        (r#""just a string""#, "invalidSchema"),
        (r#"[{"type":"string"}]"#, "invalidSchema"),
        (r#"not json at all"#, "invalidSchema"),
    ] {
        check(&bridge, schema, expected);
    }
}

#[test]
fn schema_translation_rejects_too_many_properties() {
    let Some(bridge) = bridge() else {
        eprintln!("algal-apple bridge not built; skipping");
        return;
    };
    let mut properties = serde_json::Map::new();
    for i in 0..33 {
        properties.insert(format!("p{i}"), json!({"type":"string"}));
    }
    let schema = json!({"type":"object","properties":properties}).to_string();
    check(&bridge, &schema, "tooManyProperties");

    let mut properties = serde_json::Map::new();
    for i in 0..32 {
        properties.insert(format!("p{i}"), json!({"type":"string"}));
    }
    let schema = json!({"type":"object","properties":properties}).to_string();
    check(&bridge, &schema, "ok");
}
