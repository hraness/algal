#![cfg(unix)]
use algal::{
    canonical::digest, contract::Manifest, effects::Host, graph::Transports,
    process::ProcessService,
};
use serde_json::{Value, json};
use std::{fs, path::Path};

fn quoted(path: &Path) -> String {
    format!("'{}'", path.to_str().unwrap().replace('\'', "'\\''"))
}

#[tokio::test]
async fn journal_admission_preserves_real_write_intent_and_process_limit_remains_separate() {
    for count in [49_900, 75_000, 100_001] {
        let directory = tempfile::tempdir().unwrap();
        let root = directory.path().canonicalize().unwrap();
        let counter = root.join("effect-count");
        let fallback = root.join("fallback-count");
        let output = root.join("output.json");
        fs::write(
            &output,
            serde_json::to_vec(&json!({"value":vec![0; count]})).unwrap(),
        )
        .unwrap();
        let tools = root.join("tools.json");
        fs::write(&tools, serde_json::to_vec(&json!({
            "record.v1":{"signature":{"inputs":{},"outputs":{"value":{"type":"json"}},"effect":"write","cost":1,"maxOutputBytes":262144},
                "exec":format!("cmd:printf x >> {}; cat {}",quoted(&counter),quoted(&output))},
            "fallback.v1":{"signature":{"inputs":{"error":{"type":"json"}},"outputs":{"value":{"type":"text"}},"effect":"write","cost":1,"maxOutputBytes":256},
                "exec":format!("cmd:printf x >> {}; printf '%s' '{{\"value\":\"fallback\"}}'",quoted(&fallback))}
        })).unwrap()).unwrap();
        let mut host = Host::default();
        host.load_tools(&tools).unwrap();
        let program = Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:journal-closure","name":"journal closure",
            "cells":[{"id":"produce","kind":"tool","tool":"record.v1"},{"id":"fallback","kind":"tool","tool":"fallback.v1"}],
            "edges":[{"from":{"cell":"produce","port":"value"},"to":{"cell":"fallback","port":"error"},"on":"fail"}]})).unwrap();
        let mut service = ProcessService::open(&root).unwrap();
        service
            .create("actor", program, json!({}), 3, &host, &Transports::new())
            .unwrap();
        let result = service
            .tick_journal("actor", None, &mut host, &Transports::new(), true, 2)
            .await;
        let after = service.inspect("actor").unwrap();
        let retained = service.journal("actor").unwrap();
        assert_eq!(fs::read(&counter).unwrap(), b"x");
        assert!(!fallback.exists());
        let record = &retained["effects"][0]["record"];
        assert_eq!(record["recovery"], "never");
        let key = retained["effects"][0]["digest"].as_str().unwrap();
        let record_path = root.join("values").join(format!("{}.json", &key[7..]));
        let record_bytes = fs::read(&record_path).unwrap();
        assert_eq!(
            digest(&serde_json::from_slice::<Value>(&record_bytes).unwrap()).unwrap(),
            key
        );
        if count == 49_900 {
            result.unwrap();
            assert_eq!(after.process.status, "complete");
            assert_eq!(record["state"], "completed");
            assert_eq!(
                record["receipt"]["output"]["value"]
                    .as_array()
                    .unwrap()
                    .len(),
                count
            );
        } else {
            let error = result.unwrap_err();
            assert_eq!(error.code, "BUDGET_EXHAUSTED");
            assert_eq!(error.uncertain, count == 100_001);
            assert_eq!(after.process.status, "uncertain");
            assert!(after.process.receipt.is_none());
            assert_eq!(
                record["state"],
                if count == 100_001 {
                    "started"
                } else {
                    "completed"
                }
            );
            if count == 100_001 {
                assert!(record.get("receipt").is_none());
            }
            let mut fresh = ProcessService::open(&root).unwrap();
            assert_eq!(fresh.journal("actor").unwrap(), retained);
            let error = fresh
                .recover("actor", &after.digest, &mut host, &Transports::new())
                .await
                .unwrap_err();
            if count == 100_001 {
                assert!(error.message.contains("unknown external write"));
            } else {
                assert_eq!(error.code, "BUDGET_EXHAUSTED");
            }
            assert_eq!(fresh.inspect("actor").unwrap().digest, after.digest);
            assert_eq!(fresh.journal("actor").unwrap(), retained);
            assert_eq!(fs::read(&record_path).unwrap(), record_bytes);
            assert_eq!(fs::read(&counter).unwrap(), b"x");
            assert!(!fallback.exists());
        }
    }
}
