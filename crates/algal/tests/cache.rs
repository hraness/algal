use algal::effects::{Backend, Host};
use algal::store::Store;
use serde_json::{Value, json};

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
    let mut store = Store::default();
    let mut host = Host::default();
    host.cache = true;
    host.entries.push((
        "shell".into(),
        Backend::Command {
            // A successful command consumes the complete request before replying.
            argv: vec![
                "/bin/sh".into(),
                "-c".into(),
                "cat >/dev/null && printf '{\"v\":1}'".into(),
            ],
            cwd: None,
            timeout_ms: 5000,
        },
    ));
    let req = request(json!({"kind":"json","schema":{}}));
    let receipt = host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert_eq!(receipt["output"], json!({"v":1}), "receipt: {receipt}");
    assert!(
        store
            .get_effect(&algal::canonical::digest(&req).unwrap(), "shell")
            .unwrap()
            .is_none()
    );
    let again = host.effect(&req, 5000, Some(&mut store)).await.unwrap();
    assert_eq!(again["output"], json!({"v":1}), "receipt: {again}");
    assert!(again.get("cached").is_none());
}
