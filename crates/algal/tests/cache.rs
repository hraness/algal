use algal::canonical::{canonical, digest};
use algal::effects::{Backend, Host};
use algal::store::Store;
use serde_json::{Value, json};

#[test]
fn file_effect_cache_keeps_retained_winner_before_and_after_reopen() {
    let directory = tempfile::tempdir().unwrap();
    let request = digest(&json!("request")).unwrap();
    // A cache identity includes configuration; it need not equal the display executor.
    let identity = "scripted:configuration-a";
    let first = json!({"requestDigest":request,"executor":"scripted","output":"first"});
    let second = json!({"requestDigest":request,"executor":"scripted","output":"second"});
    Store::open(directory.path(), true)
        .unwrap()
        .put_effect(&first, identity)
        .unwrap();
    let mut contender = Store::open(directory.path(), true).unwrap();
    contender.put_effect(&second, identity).unwrap();
    let immediate = contender.get_effect(&request, identity).unwrap();
    let reopened = Store::open(directory.path(), false)
        .unwrap()
        .get_effect(&request, identity)
        .unwrap();
    assert_eq!((immediate, reopened), (Some(first.clone()), Some(first)));
    assert!(
        contender
            .get_effect(&request, "another-identity")
            .unwrap()
            .is_none()
    );
}

#[test]
fn retained_effect_receipts_are_fully_admitted_and_never_replaced() {
    let request = digest(&json!("request")).unwrap();
    let good = json!({"requestDigest":request,"executor":"scripted","output":"valid"});
    let mut malformed = Vec::new();
    for (name, field, field_value) in [
        ("unknown field", "extra", json!(true)),
        (
            "both output and error",
            "error",
            json!({"code":"EFFECT_FAILED","message":"failed"}),
        ),
        ("non-string executor", "executor", json!(7)),
        ("long executor", "executor", json!("x".repeat(257))),
        ("negative usage", "usage", json!({"tokensIn":-1})),
        ("fractional usage", "usage", json!({"tokensOut":0.5})),
        ("unknown usage field", "usage", json!({"bill":1})),
        ("invalid cached flag", "cached", json!(false)),
        ("invalid retryable flag", "retryable", json!(true)),
        ("wake without suspension", "wake", json!([])),
        (
            "invalid configuration digest",
            "configurationDigest",
            json!("invalid"),
        ),
        (
            "foreign request",
            "requestDigest",
            json!(digest(&json!("other")).unwrap()),
        ),
    ] {
        let mut receipt = good.clone();
        receipt[field] = field_value;
        malformed.push((name, receipt));
    }
    malformed.push(("unknown error code", json!({"requestDigest":request,"executor":"scripted","error":{"code":"UNKNOWN","message":"bad"}})));
    for (name, receipt) in malformed {
        let directory = tempfile::tempdir().unwrap();
        let effects = directory.path().join("effects");
        std::fs::create_dir(&effects).unwrap();
        let key = Store::effect_key(&request, "configuration").unwrap();
        let path = effects.join(format!("{}.json", &key[7..]));
        let bytes = canonical(&receipt).unwrap();
        std::fs::write(&path, &bytes).unwrap();
        let mut store = Store::open(directory.path(), true).unwrap();
        let read = store.get_effect(&request, "configuration");
        let publication = store.put_effect(&good, "configuration");
        assert_eq!(std::fs::read(&path).unwrap(), bytes.as_bytes(), "{name}");
        assert_eq!(std::fs::read_dir(&effects).unwrap().count(), 1, "{name}");
        assert!(read.is_err(), "read admitted {name}");
        assert!(publication.is_err(), "publication admitted {name}");
    }
}

#[test]
fn malformed_effect_proposals_are_rejected_before_publication_or_memoization() {
    let directory = tempfile::tempdir().unwrap();
    let request = digest(&json!("request")).unwrap();
    let malformed =
        json!({"requestDigest":request,"executor":"scripted","output":"valid","cached":false});
    for mut store in [
        Store::default(),
        Store::open(directory.path(), true).unwrap(),
    ] {
        assert!(store.put_effect(&malformed, "configuration").is_err());
        assert!(
            store
                .get_effect(&request, "configuration")
                .unwrap()
                .is_none()
        );
    }
    assert!(!directory.path().join("effects").exists());
}

#[test]
fn effect_receipt_bounds_apply_to_proposals_and_retained_files() {
    let request = digest(&json!("request")).unwrap();
    let good = json!({"requestDigest":request,"executor":"scripted","output":null});
    for (name, output) in [
        (
            "depth",
            (0..64).fold(Value::Null, |value, _| json!([value])),
        ),
        ("nodes", Value::Array(vec![Value::Null; 999_997])),
    ] {
        let mut receipt = good.clone();
        receipt["output"] = output;
        let directory = tempfile::tempdir().unwrap();
        let effects = directory.path().join("effects");
        std::fs::create_dir(&effects).unwrap();
        let key = Store::effect_key(&request, "configuration").unwrap();
        let path = effects.join(format!("{}.json", &key[7..]));
        let bytes = serde_json::to_vec(&receipt).unwrap();
        std::fs::write(&path, &bytes).unwrap();
        let mut store = Store::open(directory.path(), true).unwrap();
        assert!(
            Store::default()
                .put_effect(&receipt, "configuration")
                .is_err(),
            "proposal {name}"
        );
        assert!(
            store.get_effect(&request, "configuration").is_err(),
            "read {name}"
        );
        assert!(
            store.put_effect(&good, "configuration").is_err(),
            "publish {name}"
        );
        assert_eq!(std::fs::read(&path).unwrap(), bytes);
    }
    for output in [
        (0..63).fold(Value::Null, |value, _| json!([value])),
        Value::Array(vec![Value::Null; 999_996]),
    ] {
        let mut receipt = good.clone();
        receipt["output"] = output;
        let mut store = Store::default();
        store.put_effect(&receipt, "configuration").unwrap();
        assert_eq!(
            store.get_effect(&request, "configuration").unwrap(),
            Some(receipt)
        );
    }
}

#[test]
fn valid_effect_metadata_and_overlay_memoization_remain_compatible() {
    let directory = tempfile::tempdir().unwrap();
    let request = digest(&json!("request")).unwrap();
    let receipt = json!({
        "requestDigest":request,"executor":"scripted","output":null,
        "usage":{"model":"model","tokensIn":0,"tokensOut":9_007_199_254_740_991u64},
        "cached":true,"retryable":false,"configurationDigest":request
    });
    let mut store = Store::open(directory.path(), true).unwrap();
    store.put_effect(&receipt, "configuration").unwrap();
    let reopened = Store::open(directory.path(), false).unwrap();
    assert_eq!(
        reopened.get_effect(&request, "configuration").unwrap(),
        Some(receipt.clone())
    );
    let error = json!({"requestDigest":request,"executor":"scripted","error":{"code":"EFFECT_FAILED","message":"failed"}});
    for mut local in [reopened.clone(), reopened.overlay()] {
        local.put_effect(&error, "configuration").unwrap();
        local.put_effect(&receipt, "configuration").unwrap();
        assert_eq!(
            local.get_effect(&request, "configuration").unwrap(),
            Some(error.clone())
        );
    }
    assert_eq!(
        reopened.get_effect(&request, "configuration").unwrap(),
        Some(receipt)
    );
}

fn request(output: Value) -> Value {
    json!({
        "contract":"algal.effect.v1",
        "cellId":"c1",
        "prompt":"say hi",
        "output":output,
        "budget":{"maxOutputBytes":1024}
    })
}

fn scripted_host(responses: Value) -> Host {
    let mut host = Host::scripted(responses);
    host.cache = true;
    host
}

#[tokio::test]
async fn memo_hit_serves_recorded_output_and_marks_cached() {
    let mut store = Store::default();
    let mut host = scripted_host(json!({"c1":{"answer":"hi"}}));
    let req = request(json!({"kind":"json","schema":{}}));
    let first = host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert_eq!(first["output"], json!({"answer":"hi"}));
    assert!(first.get("cached").is_none());
    let second = host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert_eq!(second["output"], json!({"answer":"hi"}));
    assert_eq!(second["cached"], json!(true));
}

#[tokio::test]
async fn scripted_identity_isolates_response_tables() {
    let mut store = Store::default();
    let req = request(json!({"kind":"json","schema":{}}));
    let mut host_a = scripted_host(json!({"c1":{"from":"a"}}));
    let mut host_b = scripted_host(json!({"c1":{"from":"b"}}));
    host_a.effect(&req, 5000, Some(&mut store)).await.unwrap();
    let second = host_b.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert_eq!(second["output"], json!({"from":"b"}));
    assert!(second.get("cached").is_none());
}

#[tokio::test]
async fn tool_call_envelopes_are_not_memoized() {
    let mut store = Store::default();
    let mut host = scripted_host(json!({"c1":{"tool":"pick.v1","inputs":{"x":1}}}));
    let req = request(json!({"kind":"json","schema":{}}));
    host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    let identity = Backend::Scripted {
        responses: json!({"c1":{"tool":"pick.v1","inputs":{"x":1}}}),
    }
    .cache_identity("scripted")
    .unwrap();
    let key = algal::store::Store::effect_key(&algal::canonical::digest(&req).unwrap(), &identity)
        .unwrap();
    assert!(
        store
            .get_effect(&algal::canonical::digest(&req).unwrap(), &identity)
            .unwrap()
            .is_none(),
        "tool-call envelope must not be memoized (key {key})"
    );
}

#[tokio::test]
async fn oversized_outputs_are_not_memoized() {
    let mut store = Store::default();
    let mut host = scripted_host(json!({"c1":{"s":"this response is far too long to fit"}}));
    let mut req = request(json!({"kind":"json","schema":{}}));
    req["budget"]["maxOutputBytes"] = json!(8);
    host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    let identity = Backend::Scripted {
        responses: json!({"c1":{"s":"this response is far too long to fit"}}),
    }
    .cache_identity("scripted")
    .unwrap();
    assert!(
        store
            .get_effect(&algal::canonical::digest(&req).unwrap(), &identity)
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
async fn invalid_outputs_are_not_memoized() {
    let mut store = Store::default();
    let mut host = scripted_host(json!({"c1":{"n":42}}));
    let req = request(json!({"kind":"text"}));
    host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    let identity = Backend::Scripted {
        responses: json!({"c1":{"n":42}}),
    }
    .cache_identity("scripted")
    .unwrap();
    assert!(
        store
            .get_effect(&algal::canonical::digest(&req).unwrap(), &identity)
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
async fn side_effecting_backends_are_never_memoized() {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::default();
    let mut host = Host::default();
    host.cache = true;
    host.entries.push((
        "shell".into(),
        Backend::Command {
            argv: vec![
                "/bin/sh".into(),
                "-c".into(),
                // A command executor must consume its request before exiting.
                // Printing immediately races the host's stdin writer.
                r#"set -eu
/bin/cat >/dev/null
value=0
if [ -f count ]; then read -r value <count; fi
value=$((value + 1))
printf '%s\n' "$value" >count
printf '{"v":%s}' "$value""#
                    .into(),
            ],
            cwd: Some(directory.path().to_path_buf()),
            timeout_ms: 5000,
        },
    ));
    let mut req = request(json!({"kind":"json","schema":{}}));
    // Exceed an ordinary pipe buffer so the fixture must drain the input.
    req["context"] = json!({"padding":"x".repeat(262_144)});
    let receipt = host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert!(receipt.get("error").is_none(), "executor failed: {receipt}");
    assert_eq!(receipt["output"], json!({"v":1}));
    assert!(
        store
            .get_effect(&algal::canonical::digest(&req).unwrap(), "shell")
            .unwrap()
            .is_none()
    );
    let again = host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert!(again.get("error").is_none(), "executor failed: {again}");
    assert_eq!(again["output"], json!({"v":2}));
    assert!(again.get("cached").is_none());
    assert_eq!(
        std::fs::read_to_string(directory.path().join("count")).unwrap(),
        "2\n"
    );
    assert!(
        store
            .get_effect(&algal::canonical::digest(&req).unwrap(), "shell")
            .unwrap()
            .is_none()
    );
}
