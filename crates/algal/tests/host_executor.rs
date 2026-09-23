use algal::{
    Error, Result,
    canonical::digest,
    contract::Manifest,
    effects::{Backend, Host, HostExecutor},
    graph::Transports,
    journal::Journal,
    runtime,
    store::Store,
};
use serde_json::{Value, json};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicUsize, Ordering},
};

struct Capture {
    identity: Mutex<String>,
    requests: Mutex<Vec<Value>>,
    answers: Mutex<Vec<Result<Value>>>,
    calls: AtomicUsize,
    change_during_call: bool,
    journal: Option<Arc<Mutex<Journal>>>,
}
impl Capture {
    fn new(answers: Vec<Result<Value>>) -> Self {
        Self {
            identity: Mutex::new(digest(&json!({"adapter":"fixture-v1","project":"one"})).unwrap()),
            requests: Mutex::default(),
            answers: Mutex::new(answers),
            calls: AtomicUsize::new(0),
            change_during_call: false,
            journal: None,
        }
    }
}
impl HostExecutor for Capture {
    fn configuration_digest(&self) -> String {
        self.identity.lock().unwrap().clone()
    }
    fn execute(&self, request: &Value) -> Result<Value> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        self.requests.lock().unwrap().push(request.clone());
        if let Some(journal) = &self.journal {
            assert_eq!(
                journal.lock().unwrap().describe().unwrap()["effects"][0]["record"]["state"],
                "started"
            );
        }
        if self.change_during_call {
            *self.identity.lock().unwrap() = digest(&json!("changed")).unwrap();
        }
        let mut answers = self.answers.lock().unwrap();
        if answers.is_empty() {
            Err(Error::new("EFFECT_SUSPENDED", "awaiting settled child"))
        } else {
            answers.remove(0)
        }
    }
}
fn host(executor: &Arc<Capture>) -> Host {
    let mut host = Host::default();
    host.register_executor("project-agent", executor.clone())
        .unwrap();
    host
}
fn manifest() -> Manifest {
    Manifest::parse(&json!({
        "contract":"algal.organism.v1", "key":"organism:host-executor", "name":"Host executor",
        "cells":[{"id":"work","kind":"agent","prompt":"A bounded child task",
            "route":{"provider":"project-agent"},"output":{"kind":"text"},
            "retry":{"attempts":3}, "budget":{"maxOutputBytes":64}}], "edges":[]
    }))
    .unwrap()
}
fn request() -> Value {
    json!({"contract":"algal.effect.v1","cellId":"work","kind":"agent", "prompt":"task",
        "context":{},"output":{"kind":"text"},"budget":{"maxOutputBytes":64},
        "route":{"provider":"project-agent"}})
}

#[tokio::test]
async fn capture_suspend_supply_resume_and_offline_replay() {
    let executor = Arc::new(Capture::new(vec![]));
    let mut host = host(&executor);
    assert!(host.has_executor());
    let mut store = Store::default();
    let suspended = runtime::run(
        manifest(),
        json!({}),
        &mut store,
        &mut host,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(suspended["outcome"], "suspended");
    assert_eq!(suspended["effects"].as_array().unwrap().len(), 1);
    assert_eq!(suspended["effects"][0]["retryable"], false);
    assert_eq!(
        suspended["effects"][0]["configurationDigest"],
        executor.configuration_digest()
    );
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        runtime::verify(&suspended, manifest(), &store, &host)
            .await
            .unwrap()["ok"],
        true
    );
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
    executor
        .answers
        .lock()
        .unwrap()
        .push(Ok(json!("settled result")));
    let resumed = runtime::resume(
        &suspended,
        manifest(),
        &mut store,
        &mut host,
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(resumed["outcome"], "complete");
    assert_eq!(resumed["cells"]["work"]["outputs"]["out"], "settled result");
    assert_eq!(
        resumed["effects"][0]["requestDigest"],
        suspended["effects"][0]["requestDigest"]
    );
    {
        let captured = executor.requests.lock().unwrap();
        assert_eq!(captured[0], captured[1]);
    }
    assert_eq!(
        runtime::verify(&resumed, manifest(), &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
    let replayed = runtime::resume(
        &resumed,
        manifest(),
        &mut store,
        &mut host,
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(replayed, resumed);
    assert_eq!(executor.calls.load(Ordering::SeqCst), 2);
    // Strict replay never invokes the registered callback, even on a miss.
    host.replay = Host::replay(&json!([])).unwrap().replay;
    host.replay_fallthrough = false;
    assert_eq!(
        host.effect(&request(), 1000, None).await.unwrap()["error"]["code"],
        "EFFECT_UNBOUND"
    );
    assert_eq!(executor.calls.load(Ordering::SeqCst), 2);
}

#[tokio::test]
async fn immutable_configuration_is_checked_at_registration_dispatch_and_resume() {
    let executor = Arc::new(Capture::new(vec![]));
    let mut live = host(&executor);
    let mut store = Store::default();
    let suspended = runtime::run(
        manifest(),
        json!({}),
        &mut store,
        &mut live,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    *executor.identity.lock().unwrap() = digest(&json!("different-profile")).unwrap();
    assert_eq!(
        live.effect(&request(), 1000, None).await.unwrap_err().code,
        "DIGEST_MISMATCH"
    );
    let mut changed = host(&executor);
    assert_eq!(
        runtime::resume(
            &suspended,
            manifest(),
            &mut store,
            &mut changed,
            &Transports::new()
        )
        .await
        .unwrap_err()
        .code,
        "DIGEST_MISMATCH"
    );
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
    *executor.identity.lock().unwrap() = "not-a-digest".into();
    assert!(
        Host::default()
            .register_executor("project-agent", executor)
            .is_err()
    );
}

#[test]
fn registry_rejects_names_overrides_aliases_and_overflow() {
    let executor = Arc::new(Capture::new(vec![]));
    for name in ["", "Capital", "with space", "provider:alias"] {
        assert!(
            Host::default()
                .register_executor(name, executor.clone())
                .is_err()
        );
    }
    let mut live = host(&executor);
    assert!(
        live.register_executor("project-agent", executor.clone())
            .is_err()
    );
    let mut configured = Host::scripted(json!({}));
    assert!(
        configured
            .register_executor("scripted", executor.clone())
            .is_err()
    );
    configured.entries[0].0 = "provider:project-agent".into();
    assert!(
        configured
            .register_executor("project-agent", executor.clone())
            .is_err()
    );
    let mut bounded = Host::default();
    for n in 0..16 {
        bounded
            .register_executor(&format!("executor-{n}"), executor.clone())
            .unwrap();
    }
    assert!(bounded.register_executor("overflow", executor).is_err());
}

#[tokio::test]
async fn routes_capabilities_and_post_registration_collision_fail_closed() {
    let executor = Arc::new(Capture::new(vec![Ok(json!("answer"))]));
    let mut live = host(&executor);
    for kind in ["gate", "classifier", "decide", "recall"] {
        let mut req = request();
        req["kind"] = json!(kind);
        assert_eq!(
            live.effect(&req, 1000, None).await.unwrap()["error"]["code"],
            "EFFECT_UNBOUND"
        );
    }
    let mut missing = request();
    missing["route"] = json!({"preset":"not-admitted"});
    assert_eq!(
        live.effect(&missing, 1000, None).await.unwrap()["error"]["code"],
        "EFFECT_UNBOUND"
    );
    let mut default = request();
    default["route"] = json!({});
    assert_eq!(
        live.effect(&default, 1000, None).await.unwrap()["output"],
        "answer"
    );
    live.entries.push((
        "preset:project-agent".into(),
        Backend::Scripted {
            responses: json!({"work":"override"}),
        },
    ));
    assert!(live.effect(&request(), 1000, None).await.is_err());
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn callbacks_are_never_cached_or_retried_and_keep_runtime_budgets() {
    let executor = Arc::new(Capture::new(vec![Ok(json!("one")), Ok(json!("two"))]));
    let mut live = host(&executor);
    live.cache = true;
    let mut store = Store::default();
    assert_eq!(
        live.effect(&request(), 1000, Some(&mut store))
            .await
            .unwrap()["output"],
        "one"
    );
    assert_eq!(
        live.effect(&request(), 1000, Some(&mut store))
            .await
            .unwrap()["output"],
        "two"
    );
    assert_eq!(executor.calls.load(Ordering::SeqCst), 2);
    let executor = Arc::new(Capture::new(vec![Err(Error::new(
        "EFFECT_FAILED",
        "settled child failed",
    ))]));
    let mut live = host(&executor);
    let failed = runtime::run(
        manifest(),
        json!({}),
        &mut store,
        &mut live,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(failed["outcome"], "failed");
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        runtime::verify(&failed, manifest(), &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
    let mut limited = manifest().value;
    limited["budgets"] = json!({"maxAgentCalls":0});
    let limited = Manifest::parse(&limited).unwrap();
    let failed = runtime::run(
        limited,
        json!({}),
        &mut store,
        &mut live,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(failed["failure"]["code"], "BUDGET_EXHAUSTED");
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn malformed_and_oversized_results_produce_bounded_verifiable_failures() {
    for answer in [
        Ok(json!("x".repeat(65))),
        Ok(json!(17)),
        Err(Error::new("not-a-contract-code", "bad")),
        Err(Error::new("EFFECT_FAILED", "x".repeat(3000))),
    ] {
        let executor = Arc::new(Capture::new(vec![answer]));
        let mut live = host(&executor);
        let mut store = Store::default();
        let failed = runtime::run(
            manifest(),
            json!({}),
            &mut store,
            &mut live,
            &Transports::new(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(failed["outcome"], "failed");
        assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
        assert_eq!(
            runtime::verify(&failed, manifest(), &store, &Host::default())
                .await
                .unwrap()["ok"],
            true
        );
    }
}

#[tokio::test]
async fn journal_records_intent_before_callback_and_recovery_does_not_reinvoke() {
    let directory = tempfile::tempdir().unwrap();
    let intent = digest(&json!("intent")).unwrap();
    let manifest = manifest().digest().unwrap();
    let journal = Arc::new(Mutex::new(
        Journal::create(directory.path(), "fixture", &intent, &manifest, 2).unwrap(),
    ));
    let mut capture = Capture::new(vec![Ok(json!("settled"))]);
    capture.journal = Some(journal.clone());
    let executor = Arc::new(capture);
    let mut live = host(&executor);
    live.journal = Some(journal.clone());
    let receipt = live.effect(&request(), 1000, None).await.unwrap();
    assert_eq!(
        journal.lock().unwrap().describe().unwrap()["effects"][0]["record"]["state"],
        "completed"
    );
    journal.lock().unwrap().finish().unwrap();
    let mut recovered = Journal::open(directory.path(), "fixture", &intent, &manifest).unwrap();
    recovered.begin_recovery().unwrap();
    live.journal = Some(Arc::new(Mutex::new(recovered)));
    assert_eq!(live.effect(&request(), 1000, None).await.unwrap(), receipt);
    live.journal
        .as_ref()
        .unwrap()
        .lock()
        .unwrap()
        .finish()
        .unwrap();
    assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
    // A changed callback cannot consume recorded completion from this journal.
    let changed = Arc::new(Capture::new(vec![]));
    *changed.identity.lock().unwrap() = digest(&json!("changed")).unwrap();
    let mut live = host(&changed);
    let mut recovered = Journal::open(directory.path(), "fixture", &intent, &manifest).unwrap();
    recovered.begin_recovery().unwrap();
    live.journal = Some(Arc::new(Mutex::new(recovered)));
    assert!(live.effect(&request(), 1000, None).await.is_err());
    assert_eq!(changed.calls.load(Ordering::SeqCst), 0);
}

#[tokio::test]
async fn uncertainty_or_in_call_config_mutation_leaves_journal_unsettled() {
    for mutate in [false, true] {
        let directory = tempfile::tempdir().unwrap();
        let journal = Arc::new(Mutex::new(
            Journal::create(
                directory.path(),
                "fixture",
                &digest(&json!("intent")).unwrap(),
                &manifest().digest().unwrap(),
                2,
            )
            .unwrap(),
        ));
        let mut capture = Capture::new(vec![Err(Error::new(
            "EFFECT_FAILED",
            "unknown child settlement",
        )
        .uncertain())]);
        capture.change_during_call = mutate;
        capture.journal = Some(journal.clone());
        let executor = Arc::new(capture);
        let mut live = host(&executor);
        live.journal = Some(journal.clone());
        assert!(live.effect(&request(), 1000, None).await.is_err());
        assert!(journal.lock().unwrap().finish().is_err());
        assert_eq!(
            journal.lock().unwrap().describe().unwrap()["effects"][0]["record"]["state"],
            "started"
        );
        assert_eq!(executor.calls.load(Ordering::SeqCst), 1);
    }
}

#[tokio::test]
async fn suspended_journal_generation_resumes_with_a_new_intent_and_settled_result() {
    let directory = tempfile::tempdir().unwrap();
    let create = |generation| {
        Arc::new(Mutex::new(
            Journal::create(
                directory.path(),
                "fixture",
                &digest(&json!({"generation":generation})).unwrap(),
                &manifest().digest().unwrap(),
                2,
            )
            .unwrap(),
        ))
    };
    let initial = create(0);
    let executor = Arc::new(Capture::new(vec![]));
    let mut live = host(&executor);
    live.journal = Some(initial.clone());
    let mut store = Store::default();
    let suspended = runtime::run(
        manifest(),
        json!({}),
        &mut store,
        &mut live,
        &Transports::new(),
        None,
    )
    .await
    .unwrap();
    assert_eq!(suspended["outcome"], "suspended");
    initial.lock().unwrap().finish().unwrap();
    assert_eq!(
        initial.lock().unwrap().describe().unwrap()["effects"][0]["record"]["receipt"]["error"]["code"],
        "EFFECT_SUSPENDED"
    );
    executor
        .answers
        .lock()
        .unwrap()
        .push(Ok(json!("settled next generation")));
    // Resumption is a new supervisor intent. Crash recovery of the old intent
    // must replay its suspension, while this generation can observe new state.
    let resumed_journal = create(1);
    live.journal = Some(resumed_journal.clone());
    let resumed = runtime::resume(
        &suspended,
        manifest(),
        &mut store,
        &mut live,
        &Transports::new(),
    )
    .await
    .unwrap();
    assert_eq!(resumed["outcome"], "complete");
    resumed_journal.lock().unwrap().finish().unwrap();
    assert_eq!(
        resumed_journal.lock().unwrap().describe().unwrap()["effects"][0]["record"]["receipt"]["output"],
        "settled next generation"
    );
    assert_eq!(executor.calls.load(Ordering::SeqCst), 2);
    assert_eq!(
        runtime::verify(&resumed, manifest(), &store, &Host::default())
            .await
            .unwrap()["ok"],
        true
    );
}
