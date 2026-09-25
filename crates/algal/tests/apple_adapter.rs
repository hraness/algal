//! The Apple adapter is exercised only through owned NDJSON shell fixtures.
//! This target never discovers or runs the real Foundation Models bridge.
#![cfg(target_os = "macos")]

use algal::{
    contract::Manifest,
    effects::{Backend, Host},
    graph::Transports,
    process::ProcessService,
    runtime,
    store::Store,
};
use serde_json::{Value, json};
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    path::PathBuf,
    time::{Duration, Instant},
};

// These fixtures assert protocol and single-dispatch behavior, not cold shell
// startup latency. On a loaded macOS host the unchanged baseline can take over
// three seconds to receive its first request. Keep that setup allowance local
// to this test target; the queue-rejection latency assertion remains one second.
const FIXTURE_TIMEOUT_MS: u64 = 10_000;

struct Fixture {
    directory: tempfile::TempDir,
    bridge: PathBuf,
}

impl Fixture {
    fn new(response: &str) -> Self {
        let directory = tempfile::tempdir().unwrap();
        let bridge = directory.path().join("owned-bridge");
        fs::write(
            &bridge,
            format!(
                "#!/bin/sh\nprintf 'spawn\\n' >> \"$0.spawns\"\nid=0\n\
                 while IFS= read -r request; do\n\
                 id=$((id + 1))\n\
                 printf '%s\\n' \"$request\" >> \"$0.requests\"\n\
                 {response}\ndone\n"
            ),
        )
        .unwrap();
        fs::set_permissions(&bridge, fs::Permissions::from_mode(0o700)).unwrap();
        Self { directory, bridge }
    }

    fn host(&self) -> Host {
        let mut host = Host::default();
        host.entries.push((
            "owned-apple".into(),
            Backend::Apple {
                bridge: self.bridge.clone(),
            },
        ));
        host
    }

    fn requests(&self) -> Vec<Value> {
        fs::read_to_string(self.bridge.with_extension("requests"))
            .unwrap_or_default()
            .split_inclusive('\n')
            .filter(|line| line.ends_with('\n'))
            .map(|line| serde_json::from_str(line).unwrap())
            .collect()
    }

    fn assert_one_spawn(&self) {
        assert_eq!(
            fs::read_to_string(self.bridge.with_extension("spawns")).unwrap(),
            "spawn\n"
        );
    }
}

fn manifest() -> Manifest {
    Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:apple-single-dispatch",
        "name":"Apple single dispatch fixture",
        "cells":[{
            "id":"worker","kind":"agent","prompt":"Return one word.",
            "output":{"kind":"text"},"retry":{"attempts":3},
            "budget":{"maxEffectMs":FIXTURE_TIMEOUT_MS}
        }],
        "edges":[]
    }))
    .unwrap()
}

fn request() -> Value {
    json!({
        "contract":"algal.effect.v1","kind":"agent","cellId":"worker",
        "prompt":"Return one word.","context":{},"output":{"kind":"text"},
        "budget":{"maxContextBytes":1024,"maxOutputBytes":1024}
    })
}

#[tokio::test]
async fn schema_failure_does_not_fallback_or_retry_the_cell() {
    let fixture =
        Fixture::new(r#"printf '{"id":%s,"ok":false,"error":{"code":"invalidSchema"}}\n' "$id""#);
    let root = fixture.directory.path().join("store");
    let mut service = ProcessService::open(&root).unwrap();
    let mut host = fixture.host();
    service
        .create(
            "schema",
            manifest(),
            json!({}),
            3,
            &host,
            &Transports::new(),
        )
        .unwrap();
    let failed = service
        .tick_journal("schema", None, &mut host, &Transports::new(), true, 2)
        .await
        .unwrap();
    assert_eq!(failed.process.status, "failed");
    assert!(failed.process.receipt.is_some());
    let journal = service.journal("schema").unwrap();
    let effects = journal["effects"].as_array().unwrap();
    assert_eq!(effects.len(), 1);
    let record = &effects[0]["record"];
    assert_eq!(record["state"], "completed");
    assert_eq!(record["receipt"]["retryable"], false);
    assert_eq!(record["receipt"]["error"]["code"], "EFFECT_FAILED");
    assert_eq!(
        record["receipt"]["error"]["message"],
        "apple bridge: invalidSchema"
    );
    let requests = fixture.requests();
    assert_eq!(
        requests.len(),
        1,
        "schema fallback or VM retry dispatched again"
    );
    assert_eq!(requests[0]["schema"], json!({"type":"string"}));
    assert!(requests[0].get("expectJson").is_none());
    fixture.assert_one_spawn();
    assert_eq!(service.verify("schema", &host).await.unwrap()["ok"], true);
    assert_eq!(
        fixture.requests().len(),
        1,
        "verification dispatched a request"
    );
}

#[tokio::test]
async fn lost_or_malformed_reply_keeps_original_cause_and_blocks_redispatch() {
    for (response, cause, removes_executable) in [
        (
            "/bin/rm -f \"$0\"\nexit 0",
            "bridge disconnected while awaiting response",
            true,
        ),
        (
            r#"printf '{"id":%s,"ok":true}\n' "$id""#,
            "malformed response",
            false,
        ),
    ] {
        let fixture = Fixture::new(response);
        let root = fixture.directory.path().join("store");
        let mut host = fixture.host();
        let mut service = ProcessService::open(&root).unwrap();
        service
            .create("lost", manifest(), json!({}), 3, &host, &Transports::new())
            .unwrap();
        let error = service
            .tick_journal("lost", None, &mut host, &Transports::new(), true, 2)
            .await
            .unwrap_err();
        assert_eq!(error.code, "EFFECT_FAILED");
        assert!(error.uncertain);
        assert!(
            error.message.contains(cause),
            "expected {cause}; received {} fixture requests; error: {error:?}",
            fixture.requests().len()
        );
        assert!(error.message.starts_with("apple bridge: "));
        assert!(error.message.len() <= 1024);
        if removes_executable {
            assert!(
                !fixture.bridge.exists(),
                "fixture must make any later spawn fail"
            );
        }
        let uncertain = service.inspect("lost").unwrap();
        assert_eq!(uncertain.process.status, "uncertain");
        assert!(uncertain.process.receipt.is_none());
        assert!(!root.join("runs").exists(), "unsettled receipt was stored");
        let journal = service.journal("lost").unwrap();
        assert_eq!(journal["effects"].as_array().unwrap().len(), 1);
        let record = &journal["effects"][0]["record"];
        assert_eq!(record["state"], "started");
        assert_eq!(record["attempt"], 0);
        assert!(record.get("receipt").is_none());
        drop(service);
        let mut restarted = ProcessService::open(&root).unwrap();
        assert!(
            restarted
                .tick_journal("lost", None, &mut host, &Transports::new(), true, 2)
                .await
                .is_err()
        );
        assert_eq!(
            restarted
                .schedule_journal(16, &mut host, &Transports::new(), true, 2)
                .await
                .unwrap()["ticks"],
            0
        );
        assert_eq!(
            restarted
                .recover("lost", &uncertain.digest, &mut host, &Transports::new())
                .await
                .unwrap_err()
                .code,
            "RECOVERY_BLOCKED"
        );
        assert_eq!(restarted.inspect("lost").unwrap().digest, uncertain.digest);
        assert_eq!(restarted.journal("lost").unwrap(), journal);
        assert!(!root.join("runs").exists());
        assert_eq!(fixture.requests().len(), 1);
        fixture.assert_one_spawn();
    }
}

#[tokio::test]
async fn invalid_model_output_does_not_trigger_another_generation() {
    let fixture = Fixture::new(r#"printf '{"id":%s,"ok":true,"value":42}\n' "$id""#);
    let mut host = fixture.host();
    let receipt = runtime::run(
        manifest(),
        json!({}),
        &mut Store::default(),
        &mut host,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(receipt["outcome"], "failed", "{receipt}");
    let effects = receipt["effects"].as_array().unwrap();
    assert_eq!(effects.len(), 1);
    assert_eq!(effects[0]["retryable"], false);
    assert_eq!(fixture.requests().len(), 1);
    fixture.assert_one_spawn();
}

#[tokio::test]
async fn concurrent_call_fails_before_submission_and_warm_connection_is_reused() {
    let fixture = Fixture::new(
        "while [ ! -f \"$0.release\" ]; do /bin/sleep 0.01; done\n\
         printf '{\"id\":%s,\"ok\":true,\"value\":\"ready\"}\\n' \"$id\"",
    );
    let mut first_host = fixture.host();
    let first = tokio::spawn(async move {
        first_host
            .effect(&request(), FIXTURE_TIMEOUT_MS, None)
            .await
    });
    let started = Instant::now();
    while fixture.requests().is_empty() {
        assert!(
            started.elapsed() < Duration::from_millis(FIXTURE_TIMEOUT_MS),
            "fixture did not receive request"
        );
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    let mut host = fixture.host();
    let rejected = tokio::time::timeout(
        Duration::from_secs(1),
        host.effect(&request(), FIXTURE_TIMEOUT_MS, None),
    )
    .await
    .expect("concurrent call queued behind the active request")
    .unwrap();
    assert_eq!(rejected["error"]["message"], "apple bridge queue full");
    assert_eq!(rejected["retryable"], false);
    assert_eq!(fixture.requests().len(), 1);
    fs::write(fixture.bridge.with_extension("release"), b"ready").unwrap();
    let completed = first.await.unwrap().unwrap();
    assert_eq!(completed["output"], "ready", "{completed}");
    // A new explicit request after a settled response still uses the warm child.
    let next = host
        .effect(&request(), FIXTURE_TIMEOUT_MS, None)
        .await
        .unwrap();
    assert_eq!(next["output"], "ready", "{next}");
    assert_eq!(fixture.requests().len(), 2);
    fixture.assert_one_spawn();
}
