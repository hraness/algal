use algal::{
    canonical::{canonical, digest, read_json},
    capabilities::parse_capability_handle,
    contract::Manifest,
    effects::{Backend, Host, command_output},
    embeddings::Embedder,
    graph::{Transports, compile},
    mailbox::{self, MailboxService},
    runtime, semantic,
    store::{Store, pack, unpack},
};
use serde_json::{Value, json};
use std::{
    fs::{self, File},
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}
fn transports() -> Transports {
    [("bundles".into(), root().join("examples/bundles"))].into()
}

#[test]
fn every_bundled_manifest_is_admitted_and_normalizes_stably() {
    let examples = root().join("examples");
    let mut store = Store::default();
    assert!(store.load_modules(&examples).unwrap() >= 39);
    for entry in fs::read_dir(examples).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy();
        if !name.ends_with(".algal.json") {
            continue;
        }
        let manifest =
            Manifest::parse(&read_json(File::open(&path).unwrap(), 1_048_576).unwrap()).unwrap();
        assert_eq!(
            manifest.digest().unwrap(),
            Manifest::parse(&manifest.value).unwrap().digest().unwrap()
        );
        compile(manifest, &mut store, &Default::default(), &transports(), 0)
            .unwrap_or_else(|error| panic!("{name}: {error}"));
    }
}

#[tokio::test]
async fn every_scripted_example_runs_and_replays_without_a_provider() {
    let examples = root().join("examples");
    for entry in fs::read_dir(&examples).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy();
        let Some(id) = name
            .strip_suffix(".algal.json")
            .or_else(|| name.strip_suffix(".algal.json"))
        else {
            continue;
        };
        let load_optional = |suffix: &str| -> Value {
            let path = examples.join(format!("{id}.{suffix}.json"));
            if !path.exists() {
                return json!({});
            }
            read_json(File::open(path).unwrap(), 1_048_576).unwrap()
        };
        let mut store = Store::default();
        store.load_modules(&examples).unwrap();
        let manifest =
            Manifest::parse(&read_json(File::open(&path).unwrap(), 1_048_576).unwrap()).unwrap();
        let receipt = runtime::run(
            manifest.clone(),
            load_optional("args"),
            &mut store,
            &mut Host::scripted(load_optional("responses")),
            &transports(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(
            receipt["outcome"],
            "complete",
            "{id}: {}",
            canonical(&receipt).unwrap()
        );
        let verified = runtime::verify(&receipt, manifest, &store, &Host::default())
            .await
            .unwrap();
        assert_eq!(verified["ok"], true, "{id}: {verified}");
    }
}

#[tokio::test]
async fn compact_triages_the_tool_log_through_a_recorded_decide_effect() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:compact",
        "name":"Compact",
        "cells":[
            {"id":"src","kind":"input","outputs":{"v":"json"}},
            {"id":"a","kind":"agent","inputs":{"v":"json"},
             "prompt":"gather and summarize","output":{"kind":"text"},
             "tools":["pick.v1"],"compact":{"maxLogBytes":150,"keepRecent":1},
             "budget":{"maxTurns":4}}
        ],
        "edges":[{"from":{"cell":"src","port":"v"},"to":{"cell":"a","port":"v"}}]
    }))
    .unwrap();
    let mut store = Store::default();
    let responses = json!({"a":[
        {"tool":"pick.v1","inputs":{"record":{"name":"wisp","age":3},"field":"name"}},
        {"tool":"pick.v1","inputs":{"record":{"name":"wisp","age":3},"field":"age"}},
        {"answers":{"keep_0":{"noul":0.1}}},
        "the name is wisp, age 3"
    ]});
    let receipt = runtime::run(
        manifest.clone(),
        json!({"src":{"v":{"name":"wisp","age":3}}}),
        &mut store,
        &mut Host::scripted(responses),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        receipt["outcome"],
        "complete",
        "{}",
        canonical(&receipt).unwrap()
    );
    assert_eq!(
        receipt["cells"]["a"]["outputs"]["out"],
        "the name is wisp, age 3"
    );
    // three agent effects + one recorded decide effect
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 4);
    // the dropped entry left the log — the pinned tail remains verbatim
    let calls = receipt["cells"]["a"]["toolCalls"].as_array().unwrap();
    assert_eq!(calls.len(), 1);
    assert_eq!(calls[0]["inputs"]["field"], "age");
    let verified = runtime::verify(&receipt, manifest, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
}

#[tokio::test]
async fn recall_records_ranked_hits_and_feeds_load_by_ref() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:recall",
        "name":"Recall",
        "cells":[
            {"id":"src","kind":"input","outputs":{"q":"text"}},
            {"id":"memory","kind":"recall","inputs":{"q":"text"},
             "query":{"contract":"algal.expr.v1","program":["sconcat",["get","q"]," habitat"]},
             "k":2,"embedder":"local"},
            {"id":"full","kind":"load"}
        ],
        "edges":[
            {"from":{"cell":"src","port":"q"},"to":{"cell":"memory","port":"q"}},
            {"from":{"cell":"memory","port":"ref"},"to":{"cell":"full","port":"ref"}}
        ]
    }))
    .unwrap();
    let mut store = Store::default();
    let payload = json!({"habitat":"coral reef","depth":12});
    let reference = store.put("values", &payload).unwrap();
    let hit = json!({
        "id":digest(&json!("chunk")).unwrap(),
        "source":format!("value:{}",&reference[7..]),
        "seq":0,"score":0.8,"text":"A coral habitat record","ref":reference
    });
    let receipt = runtime::run(
        manifest.clone(),
        json!({"src":{"q":"coral"}}),
        &mut store,
        &mut Host::scripted(json!({"memory":{"hits":[hit]}})),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        receipt["outcome"],
        "complete",
        "{}",
        canonical(&receipt).unwrap()
    );
    assert_eq!(receipt["cells"]["memory"]["outputs"]["ref"], reference);
    assert_eq!(receipt["cells"]["full"]["outputs"]["data"], payload);
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 1);
    let verified = runtime::verify(&receipt, manifest.clone(), &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
    let empty = runtime::run(
        manifest,
        json!({"src":{"q":"nothing"}}),
        &mut store,
        &mut Host::scripted(json!({"memory":{"hits":[]}})),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(empty["outcome"], "complete");
    assert_eq!(empty["cells"]["full"]["status"], "skipped");
}

#[tokio::test]
async fn recall_reranks_hits_through_a_recorded_decision_effect() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:recall-rerank",
        "name":"RecallRerank",
        "cells":[
            {"id":"src","kind":"input","outputs":{"q":"text"}},
            {"id":"memory","kind":"recall","inputs":{"q":"text"},
             "query":{"contract":"algal.expr.v1","program":["get","q"]},
             "k":2,"embedder":"local",
             "rerank":{"route":{"provider":"scripted"},"take":1}},
            {"id":"full","kind":"load"}
        ],
        "edges":[
            {"from":{"cell":"src","port":"q"},"to":{"cell":"memory","port":"q"}},
            {"from":{"cell":"memory","port":"ref"},"to":{"cell":"full","port":"ref"}}
        ]
    }))
    .unwrap();
    let mut store = Store::default();
    let first_payload = json!({"species":"sprig","habitat":"cliff"});
    let second_payload = json!({"species":"sprig","habitat":"tidepool"});
    let first_ref = store.put("values", &first_payload).unwrap();
    let second_ref = store.put("values", &second_payload).unwrap();
    let first_hit = json!({
        "id":digest(&json!("first-hit")).unwrap(),
        "source":format!("value:{}",&first_ref[7..]),"seq":0,"score":0.95,
        "text":"A sprig observed on a dry cliff","ref":first_ref
    });
    let second_hit = json!({
        "id":digest(&json!("second-hit")).unwrap(),
        "source":format!("value:{}",&second_ref[7..]),"seq":0,"score":0.7,
        "text":"A sprig living in a tidepool habitat","ref":second_ref
    });
    let responses = json!({"memory":[
        {"hits":[first_hit,second_hit.clone()]},
        {"answers":{"hit_0":{"noul":0.1},"hit_1":{"noul":0.9}}}
    ]});
    let receipt = runtime::run(
        manifest.clone(),
        json!({"src":{"q":"sprig tidepool habitat"}}),
        &mut store,
        &mut Host::scripted(responses),
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(receipt["outcome"], "complete");
    assert_eq!(
        receipt["cells"]["memory"]["outputs"]["out"],
        json!({"hits":[second_hit]})
    );
    assert_eq!(receipt["cells"]["memory"]["outputs"]["ref"], second_ref);
    assert_eq!(receipt["cells"]["full"]["outputs"]["data"], second_payload);
    assert_eq!(receipt["effects"].as_array().unwrap().len(), 2);
    assert_eq!(receipt["work"]["agentCalls"], 2);
    let verified = runtime::verify(&receipt, manifest, &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true, "{verified}");
}

#[test]
fn recall_contract_rejects_invalid_configuration() {
    let cell = |query: Value, k: usize, embedder: &str| {
        json!({
            "contract":"algal.organism.v1","key":"organism:recall-bad","name":"Bad",
            "cells":[{"id":"memory","kind":"recall","inputs":{"q":"text"},
                "query":{"contract":"algal.expr.v1","program":query},
                "k":k,"embedder":embedder}],"edges":[]
        })
    };
    assert!(Manifest::parse(&cell(json!(["get", "q"]), 33, "local")).is_err());
    assert!(Manifest::parse(&cell(json!(["get", "q"]), 1, "unknown")).is_err());
    assert!(Manifest::parse(&cell(json!(["get", "missing"]), 1, "local")).is_err());
    let rerank = |policy: Value| {
        json!({
            "contract":"algal.organism.v1","key":"organism:recall-policy","name":"Policy",
            "cells":[{"id":"memory","kind":"recall","inputs":{"q":"text"},
                "query":{"contract":"algal.expr.v1","program":["get","q"]},
                "k":2,"rerank":policy}],"edges":[]
        })
    };
    assert!(Manifest::parse(&rerank(json!({}))).is_err());
    assert!(Manifest::parse(&rerank(json!({"route":{"model":"jev"}}))).is_err());
    assert!(Manifest::parse(&rerank(json!({"route":{"provider":"jev"},"take":3}))).is_err());
    assert!(Manifest::parse(&rerank(json!({"route":{"provider":"jev"},"extra":true}))).is_err());
    let inputless = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:recall-fixed","name":"Fixed",
        "cells":[{"id":"memory","kind":"recall",
            "query":{"contract":"algal.expr.v1","program":"fixed query"}}],"edges":[]
    }))
    .unwrap();
    assert_eq!(inputless.cells[0]["inputs"], json!({}));
    assert!(
        semantic::bind_recall_output(
            &json!({"hits":[{
                "id":digest(&json!("mismatch")).unwrap(),
                "source":format!("value:{}","a".repeat(64)),"seq":0,"score":1,
                "text":"x","ref":format!("sha256:{}","b".repeat(64))
            }]}),
            2
        )
        .is_err()
    );
}

#[tokio::test]
async fn recall_backend_queries_the_derived_index() {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let dir = std::env::temp_dir().join(format!("algal-recall-{}-{suffix}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let mut store = Store::open(&dir, true).unwrap();
    let payload = json!({"species":"coral","habitat":"warm reef"});
    let reference = store.put("values", &payload).unwrap();
    let embedder = Embedder::resolve(Some("local")).unwrap();
    semantic::index_store(&dir, None, &embedder, 120_000)
        .await
        .unwrap();
    let mut host = Host::default();
    host.entries.push((
        "recall".into(),
        Backend::Recall {
            dir: dir.clone(),
            embedder: "local".into(),
        },
    ));
    let request = json!({
        "contract":"algal.effect.v1","cellId":"memory","kind":"recall","prompt":"",
        "context":{"inputs":{"q":"coral habitat"}},
        "output":{"kind":"json","schema":{"type":"object","required":["hits"],
            "properties":{"hits":{"type":"array"}}}},
        "budget":{"maxContextBytes":4096,"maxOutputBytes":8192},
        "route":{"provider":"recall"},
        "recall":{"query":"coral habitat","k":2,"embedder":"local"}
    });
    let receipt = host
        .effect(&request, 120_000, Some(&mut store))
        .await
        .unwrap();
    let hits = receipt["output"]["hits"].as_array().unwrap();
    assert_eq!(hits.len(), 1);
    assert_eq!(hits[0]["ref"], reference);
    assert!(hits[0]["text"].as_str().unwrap().contains("coral"));
    fs::remove_dir_all(dir).unwrap();
}

#[tokio::test]
async fn host_routes_only_to_admitted_effect_capabilities() {
    let request = json!({
        "contract":"algal.effect.v1","cellId":"worker","kind":"agent","prompt":"work",
        "context":{},"output":{"kind":"text"},
        "budget":{"maxContextBytes":4096,"maxOutputBytes":4096}
    });
    let mut host = Host::default();
    host.entries.push((
        "memory".into(),
        Backend::Recall {
            dir: ".".into(),
            embedder: "local".into(),
        },
    ));
    host.entries.push((
        "scripted".into(),
        Backend::Scripted {
            responses: json!({"worker":"done"}),
        },
    ));
    let selected = host.effect(&request, 1_000, None).await.unwrap();
    assert_eq!(selected["output"], "done");
    assert_eq!(selected["executor"], "scripted");

    let mut routed = request.clone();
    routed["route"] = json!({"provider":"memory"});
    let unbound = host.effect(&routed, 1_000, None).await.unwrap();
    assert_eq!(unbound["error"]["code"], "EFFECT_UNBOUND");
    assert_eq!(unbound["executor"], "unbound");
    assert_eq!(unbound["retryable"], false);

    // A route miss is served by a scripted wildcard — fixtures simulate any
    // admitted route — while a live-only host fails the same miss closed.
    let mut missed = request.clone();
    missed["route"] = json!({"provider":"absent"});
    let simulated = host.effect(&missed, 1_000, None).await.unwrap();
    assert_eq!(simulated["output"], "done");
    assert_eq!(simulated["executor"], "scripted");

    let mut model_host = Host::default();
    model_host.entries.push((
        "model".into(),
        Backend::Gateway {
            model: "provider/model".into(),
        },
    ));
    let live_miss = model_host.effect(&missed, 1_000, None).await.unwrap();
    assert_eq!(live_miss["error"]["code"], "EFFECT_UNBOUND");
    assert_eq!(live_miss["executor"], "unbound");

    let mut gate = request;
    gate["kind"] = json!("gate");
    let denied = model_host.effect(&gate, 1_000, None).await.unwrap();
    assert_eq!(denied["error"]["code"], "EFFECT_UNBOUND");
}

#[tokio::test]
async fn a_suspended_run_resumes_against_live_executors() {
    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:suspendable","name":"Suspendable",
        "cells":[
            {"id":"src","kind":"input","outputs":{"v":{"type":"text"}}},
            {"id":"worker","kind":"agent","inputs":{"v":{"type":"text"}},"prompt":"work",
             "output":{"kind":"text"},"retry":{"attempts":4}},
            {"id":"sink","kind":"fn","fn":"echo.v1"}
        ],
        "edges":[
            {"from":{"cell":"src","port":"v"},"to":{"cell":"worker","port":"v"}},
            {"from":{"cell":"worker","port":"out"},"to":{"cell":"sink","port":"value"}}
        ]
    }))
    .unwrap();
    let mut store = Store::default();
    // exit 75 (EX_TEMPFAIL) asks the host to suspend the run
    let mut pending = Host::default();
    pending.entries.push((
        "gatekeeper".into(),
        Backend::Command {
            argv: vec!["sh".into(), "-c".into(), "exit 75".into()],
            cwd: None,
            timeout_ms: 5_000,
        },
    ));
    let suspended = runtime::run(
        manifest.clone(),
        json!({"src":{"v":"ticket"}}),
        &mut store,
        &mut pending,
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(
        suspended["outcome"],
        "suspended",
        "initial suspension receipt: {}",
        canonical(&suspended).unwrap()
    );
    assert_eq!(suspended["cells"]["worker"]["status"], "suspended");
    // suspension bypasses retry: one recorded attempt, non-retryable
    let effects = suspended["effects"].as_array().unwrap();
    assert_eq!(effects.len(), 1);
    assert_eq!(effects[0]["error"]["code"], "EFFECT_SUSPENDED");
    assert_eq!(effects[0]["retryable"], false);
    assert!(suspended["cells"].get("sink").is_none());
    assert!(
        suspended["events"]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["kind"] == "cell.suspend")
    );

    // the suspended checkpoint verifies bit-for-bit: replay reproduces the
    // suspension, not a fabricated answer
    let verified = runtime::verify(&suspended, manifest.clone(), &store, &Host::default())
        .await
        .unwrap();
    assert_eq!(verified["ok"], true);
    assert_eq!(verified["outcome"], "suspended");

    // resume: the recorded prefix replays, the suspended request re-issues
    // against the live host
    let mut live = Host::scripted(json!({"worker":"the deferred answer"}));
    let resumed = runtime::resume(
        &suspended,
        manifest.clone(),
        &mut store,
        &mut live,
        &transports(),
    )
    .await
    .unwrap();
    assert_eq!(resumed["outcome"], "complete");
    assert_eq!(
        resumed["cells"]["worker"]["outputs"]["out"],
        "the deferred answer"
    );
    assert_eq!(resumed["cells"]["sink"]["status"], "committed");
    let effects = resumed["effects"].as_array().unwrap();
    assert_eq!(effects.len(), 1);
    assert_eq!(effects[0]["requestDigest"], effects_digest(&suspended));
    assert_eq!(effects[0]["output"], "the deferred answer");

    // resuming with a still-suspending executor suspends identically
    let mut still_pending = Host::default();
    still_pending.entries.push((
        "gatekeeper".into(),
        Backend::Command {
            argv: vec!["sh".into(), "-c".into(), "exit 75".into()],
            cwd: None,
            timeout_ms: 5_000,
        },
    ));
    let again = runtime::resume(
        &suspended,
        manifest.clone(),
        &mut store,
        &mut still_pending,
        &transports(),
    )
    .await
    .unwrap();
    assert_eq!(
        again["outcome"],
        "suspended",
        "repeated suspension receipt: {}",
        canonical(&again).unwrap()
    );
    assert_eq!(again["cells"]["worker"]["status"], "suspended");
    assert_eq!(
        again["effects"][0]["requestDigest"],
        effects_digest(&suspended)
    );
    assert_eq!(again["effects"][0]["error"]["code"], "EFFECT_SUSPENDED");
}

#[tokio::test]
async fn command_exit_status_survives_an_early_closed_stdin() {
    // A payload larger than an OS pipe can hold forces the writer to observe
    // the closed reader; this reproduces the immediate-exit race without sleeps.
    let payload = vec![b'x'; 1_048_576];
    for (script, expected) in [
        ("exec 0<&-; exit 75", "EFFECT_SUSPENDED"),
        ("exec 0<&-; exit 1", "EFFECT_FAILED"),
        ("exec 0<&-; printf 'ignored request'", "EFFECT_FAILED"),
    ] {
        let error = command_output(
            &["sh".into(), "-c".into(), script.into()],
            None,
            &payload,
            1024,
            5000,
        )
        .await
        .unwrap_err();
        assert_eq!(error.code, expected, "{script}: {error}");
    }
}

fn effects_digest(receipt: &Value) -> Value {
    receipt["effects"][0]["requestDigest"].clone()
}

#[tokio::test]
async fn mailbox_capabilities_suspend_and_wake_a_process() {
    let directory = tempfile::tempdir().unwrap();
    let service = MailboxService::open(directory.path());
    let config = service.create("worker", 1, 32).unwrap();
    let first_key = mailbox::external_wake_key().unwrap();
    let first = service
        .send(&config.send, json!({"task":"one"}), &first_key)
        .unwrap();
    assert_eq!(
        service
            .send(&config.send, json!({"task":"one"}), &first_key)
            .unwrap(),
        first
    );
    assert_eq!(
        service
            .send(
                &config.send,
                json!({"task":"two"}),
                &mailbox::external_wake_key().unwrap()
            )
            .unwrap_err()
            .code,
        "MAILBOX_FULL"
    );
    assert_eq!(
        service.receive(&config.receive).unwrap(),
        json!({"id":first["id"],"message":{"task":"one"}})
    );
    assert_eq!(
        service
            .send(&config.send, json!({"task":"one"}), &first_key)
            .unwrap(),
        first
    );
    assert_eq!(
        service
            .send(&config.send, json!({"task":"changed"}), &first_key)
            .unwrap_err()
            .code,
        "DIGEST_MISMATCH"
    );
    assert_eq!(
        service.receive(&config.receive).unwrap_err().code,
        "EFFECT_SUSPENDED"
    );

    let manifest = Manifest::parse(&json!({
        "contract":"algal.organism.v1",
        "key":"organism:mailbox-receiver",
        "name":"Mailbox receiver",
        "cells":[
            {"id":"source","kind":"input","outputs":{"inbox":{"type":"cap","capability":"mailbox-receive"}}},
            {"id":"wait","kind":"tool","tool":"mailbox.receive.v1"}
        ],
        "edges":[
            {"from":{"cell":"source","port":"inbox"},"to":{"cell":"wait","port":"mailbox"}}
        ]
    }))
    .unwrap();
    let mut host = Host::default();
    host.install_mailboxes(service.clone()).unwrap();
    let mut store = Store::default();
    let suspended = runtime::run(
        manifest.clone(),
        json!({"source":{"inbox":config.receive}}),
        &mut store,
        &mut host,
        &transports(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(suspended["outcome"], "suspended");
    assert_eq!(suspended["cells"]["wait"]["status"], "suspended");
    assert_eq!(suspended["effects"][0]["retryable"], false);
    assert_eq!(
        runtime::verify(&suspended, manifest.clone(), &store, &host)
            .await
            .unwrap()["ok"],
        true
    );
    let wake = service
        .send(
            &config.send,
            json!({"command":"continue"}),
            &mailbox::external_wake_key().unwrap(),
        )
        .unwrap();
    let resumed = runtime::resume(
        &suspended,
        manifest.clone(),
        &mut store,
        &mut host,
        &transports(),
    )
    .await
    .unwrap();
    assert_eq!(resumed["outcome"], "complete");
    assert_eq!(resumed["cells"]["wait"]["outputs"]["id"], wake["id"]);
    assert_eq!(
        resumed["effects"][0]["requestDigest"],
        suspended["effects"][0]["requestDigest"]
    );
    assert_eq!(
        runtime::verify(&resumed, manifest, &store, &host)
            .await
            .unwrap()["ok"],
        true
    );
    service.revoke(&config.send).unwrap();
    assert_eq!(
        service
            .send(
                &config.send,
                Value::Null,
                &mailbox::external_wake_key().unwrap()
            )
            .unwrap_err()
            .code,
        "CAPABILITY_DENIED"
    );
}

#[test]
fn mailbox_authority_files_reject_tampering_and_symlinks() {
    let directory = tempfile::tempdir().unwrap();
    let service = MailboxService::open(directory.path());
    let config = service.create("audited", 8, 1_024).unwrap();
    let parsed = parse_capability_handle(&config.send, None).unwrap();
    let record_path = directory
        .path()
        .join("capabilities")
        .join(format!("{}.json", &parsed.digest[7..]));
    let mut record = read_json(File::open(&record_path).unwrap(), 65_536).unwrap();
    record["mailbox"] = json!("other");
    fs::write(&record_path, canonical(&record).unwrap()).unwrap();
    assert_eq!(
        service
            .send(
                &config.send,
                Value::Null,
                &mailbox::external_wake_key().unwrap()
            )
            .unwrap_err()
            .code,
        "DIGEST_MISMATCH"
    );

    #[cfg(unix)]
    {
        let linked = tempfile::tempdir().unwrap();
        let outside = linked.path().join("outside");
        fs::create_dir(&outside).unwrap();
        std::os::unix::fs::symlink(&outside, linked.path().join("mailboxes")).unwrap();
        assert_eq!(
            MailboxService::open(linked.path())
                .create("escaped", 8, 1_024)
                .unwrap_err()
                .code,
            "IO_FAILED"
        );
    }
}

#[test]
fn tampered_bundle_does_not_partially_install() {
    let manifest = Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:empty","name":"Empty","cells":[]}),
    )
    .unwrap();
    let mut bundle = pack(&manifest, &Store::default()).unwrap();
    bundle["values"][format!("sha256:{}", "a".repeat(64))] = json!("forged");
    let mut destination = Store::default();
    assert!(unpack(&bundle, &mut destination).is_err());
    assert!(
        destination
            .get("manifests", &manifest.digest().unwrap())
            .unwrap()
            .is_none()
    );
}

#[test]
fn structural_errors_never_reach_effect_execution() {
    let manifest = Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:cycle","name":"Cycle","cells":[
            {"id":"one","kind":"fn","fn":"echo.v1"},{"id":"two","kind":"fn","fn":"echo.v1"}
        ],"edges":[
            {"from":{"cell":"one","port":"value"},"to":{"cell":"two","port":"value"}},
            {"from":{"cell":"two","port":"value"},"to":{"cell":"one","port":"value"}}
        ]}),
    )
    .unwrap();
    let error = match compile(
        manifest,
        &mut Store::default(),
        &Default::default(),
        &Default::default(),
        0,
    ) {
        Ok(_) => panic!("cycle accepted"),
        Err(e) => e,
    };
    assert_eq!(error.code, "GRAPH_CYCLE");
}
