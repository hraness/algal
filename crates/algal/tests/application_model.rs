//! Real-service histories corresponding to the bounded application models.
use algal::{
    Error, Result,
    application::{
        Admission, CommitContext, DispatchAdmission, DispatchContext, DispatchPlan, Dispatcher,
        Service, WorkIntent, process_name,
    },
    application_contention::{produce_contention, verify_contention},
    application_drain::produce_drain,
    application_host::{ChannelDelivery, PolicyHost, read_channel},
    application_message::{verify_interapp_delivery, verify_interapp_message},
    canonical::digest,
    contract::Manifest,
    store::Store,
};
use serde_json::{Value, json};
use std::{
    cell::Cell,
    fs,
    future::Future,
    path::{Path, PathBuf},
    pin::Pin,
    sync::atomic::{AtomicBool, Ordering},
};
use tempfile::{TempDir, tempdir};

fn hash(value: &Value) -> String {
    digest(value).unwrap()
}
fn put(store: &mut Store, value: Value) -> String {
    store.put("values", &value).unwrap()
}
struct Fixture {
    dir: TempDir,
    channels: PathBuf,
    recipient: String,
    host: PolicyHost,
    body: Value,
    command: Value,
}
fn fixture() -> Fixture {
    let dir = tempdir().unwrap();
    let channels = dir.path().join("channels");
    let recipient = format!("cap:mailbox-send:{}", hash(&json!({"fixture":"model"})));
    let host = PolicyHost::new(&json!({"contract":"algal.application-host.v1","application":"model","frontier":hash(&json!("frontier")),"hostProfile":hash(&json!("profile")),"episodeAccess":"observe","routes":[{"route":"inbox","recipient":recipient,"hostProfile":hash(&json!("profile"))}],"attestation":null,"decoders":[]}), &channels).unwrap();
    let mut store = Store::open(dir.path(), true).unwrap();
    let manifest = store.admit(&Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:application-model","name":"Application model","cells":[{"id":"out","kind":"const","outputs":{"value":{"type":"json","value":"ok"}}}],"edges":[]})).unwrap()).unwrap();
    let schema = put(
        &mut store,
        json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"ready","arity":1}]}),
    );
    let query = put(&mut store, json!({"contract":"algal.fixture-query.v1"}));
    let body = json!({"contract":"algal.application-revision.v1","application":"model","parent":null,"schema":schema,"queries":query,"views":query,"runtimeProfile":query,"evaluationPolicy":query,"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]});
    let revision = put(&mut store, body.clone());
    let memory = put(
        &mut store,
        json!({"contract":"algal.fixture-memory.v1","facts":[]}),
    );
    let command = json!({"application":"model","operation":hash(&json!("create")),"kind":"create","expectedHead":null,"revision":revision,"memory":memory,"intents":[],"evidence":[],"causedBy":null});
    Fixture {
        dir,
        channels,
        recipient,
        host,
        body,
        command,
    }
}
// Fixture commits are trusted; dispatch admission uses the production policy.
struct AllowHost<'a>(&'a PolicyHost);
impl Admission for AllowHost<'_> {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        Ok(())
    }
    fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
        self.0.admit_dispatch(context)
    }
}
fn advance(command: &Value, operation: &str, parent: &str, memory: &str) -> Value {
    let mut next = command.clone();
    next["operation"] = json!(hash(&json!(operation)));
    next["kind"] = json!("memory");
    next["expectedHead"] = json!(parent);
    next["memory"] = json!(memory);
    next["intents"] = json!([]);
    next
}

#[tokio::test]
async fn indexed_retry_survives_head_advance_and_fresh_host_denial() {
    let f = fixture();
    let allow = AllowHost(&f.host);
    let mut service = Service::new(f.dir.path(), &allow).unwrap();
    let initial = service.create(&f.command).await.unwrap();
    let memory = put(&mut service.store, json!({"facts":["new"]}));
    let next = service
        .commit(&advance(&f.command, "advance", &initial.digest, &memory))
        .await
        .unwrap();
    struct Denied(Cell<usize>);
    impl Admission for Denied {
        fn admit_commit(&self, _: &CommitContext) -> Result<()> {
            self.0.set(self.0.get() + 1);
            Err(Error::invalid("fresh commit denied"))
        }
        fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
            Err(Error::invalid("no dispatch"))
        }
    }
    let denied = Denied(Cell::new(0));
    let mut reopened = Service::new(f.dir.path(), &denied).unwrap();
    assert_eq!(
        reopened.create(&f.command).await.unwrap().digest,
        initial.digest
    );
    let mut changed = f.command.clone();
    changed["memory"] = json!(memory);
    assert!(
        reopened
            .create(&changed)
            .await
            .unwrap_err()
            .message
            .contains("another request")
    );
    assert!(
        reopened
            .commit(&advance(&f.command, "fresh", &next.digest, &memory))
            .await
            .unwrap_err()
            .message
            .contains("fresh commit denied")
    );
    assert_eq!(denied.0.get(), 1);
    assert_eq!(
        reopened.inspect("model").unwrap().unwrap().digest,
        next.digest
    );
    assert_eq!(
        reopened
            .history("model")
            .unwrap()
            .iter()
            .map(|s| &s.digest)
            .collect::<Vec<_>>(),
        vec![&initial.digest, &next.digest]
    );
}

#[tokio::test]
async fn prepared_orphan_resumes_only_while_its_original_head_remains_selected() {
    for newer_head in [false, true] {
        let f = fixture();
        let allow = AllowHost(&f.host);
        let armed = AtomicBool::new(false);
        let hook = |point| {
            if point == "prepared" && armed.swap(false, Ordering::SeqCst) {
                Err(Error::invalid("prepared cut"))
            } else {
                Ok(())
            }
        };
        let mut service = Service::new(f.dir.path(), &allow)
            .unwrap()
            .with_fault_hook(&hook);
        let initial = service.create(&f.command).await.unwrap();
        let message = put(&mut service.store, json!("orphan"));
        let mut command = f.command.clone();
        command["operation"] = json!(hash(&json!("prepared")));
        command["kind"] = json!("investigate");
        command["expectedHead"] = json!(initial.digest);
        command["intents"] = json!([{"kind":"deliver","route":"inbox","message":message}]);
        armed.store(true, Ordering::SeqCst);
        assert!(
            service
                .commit(&command)
                .await
                .unwrap_err()
                .message
                .contains("prepared cut")
        );
        let operation_path = f
            .dir
            .path()
            .join("applications/model/operations")
            .join(format!(
                "{}.json",
                &command["operation"].as_str().unwrap()[7..]
            ));
        let prepared_bytes = fs::read(&operation_path).unwrap();
        let prepared: Value = serde_json::from_slice(&prepared_bytes).unwrap();
        assert_eq!(
            service.inspect("model").unwrap().unwrap().digest,
            initial.digest
        );
        assert!(
            service
                .dispatch_pending("model", &f.host, 1)
                .await
                .unwrap()
                .is_empty()
        );
        assert!(read_channel(&f.channels, "inbox").unwrap().is_empty());
        if newer_head {
            let memory = put(&mut service.store, json!({"facts":["new"]}));
            let newer = service
                .commit(&advance(&f.command, "winner", &initial.digest, &memory))
                .await
                .unwrap();
            assert!(
                service
                    .commit(&command)
                    .await
                    .unwrap_err()
                    .message
                    .contains("Stale application head")
            );
            assert_eq!(
                service.inspect("model").unwrap().unwrap().digest,
                newer.digest
            );
            assert!(
                service
                    .dispatch_pending("model", &f.host, 1)
                    .await
                    .unwrap()
                    .is_empty()
            );
        } else {
            assert_eq!(
                service.commit(&command).await.unwrap().digest,
                prepared["state"]
            );
            assert_eq!(
                service.dispatch_pending("model", &f.host, 1).await.unwrap()[0].value()["status"],
                "settled"
            );
            assert_eq!(read_channel(&f.channels, "inbox").unwrap().len(), 1);
        }
        assert_eq!(fs::read(&operation_path).unwrap(), prepared_bytes);
        assert_eq!(service.history("model").unwrap().len(), 2);
    }
}

#[tokio::test]
async fn migrated_episode_keeps_its_source_without_default_host_authority() {
    let f = fixture();
    let allow = AllowHost(&f.host);
    let mut service = Service::new(f.dir.path(), &allow).unwrap();
    let input = put(&mut service.store, json!({}));
    let mut command = f.command.clone();
    command["intents"] = json!([{"kind":"start-episode","entrypoint":"run","input":input}]);
    let source = service.create(&command).await.unwrap();
    let intent = source.transition.intents[0].clone();
    let original = service.store.get("values", &intent).unwrap();
    let schema = put(
        &mut service.store,
        json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"moved","arity":1}]}),
    );
    let mut candidate = f.body.clone();
    candidate["parent"] = json!(source.state.revision);
    candidate["schema"] = json!(schema);
    let candidate = put(&mut service.store, candidate);
    let migration = put(
        &mut service.store,
        json!({"contract":"algal.application-migration.v1","application":"model","from":source.state.memory,"previousRevision":source.state.revision,"candidateRevision":candidate,"program":f.body["entrypoints"][0]["manifest"],"receipt":f.body["entrypoints"][0]["manifest"],"claims":[]}),
    );
    let observation = put(
        &mut service.store,
        json!({"contract":"algal.application-memory-observation.v1","application":"model","scope":schema,"procedure":schema,"raw":migration,"receipt":schema,"decoder":schema,"admission":schema,"claims":[]}),
    );
    let memory = put(
        &mut service.store,
        json!({"contract":"algal.application-memory.v1","application":"model","schema":schema,"previous":null,"scope":schema,"observations":[observation],"hypotheses":[],"withdrawn":[]}),
    );
    let drain = produce_drain(&mut service, &json!({"application":"model","parentState":source.digest,"dispositions":[{"intent":intent,"status":"migrated"}]})).unwrap();
    let mut evidence = vec![migration, drain];
    evidence.sort();
    let mut command = advance(&f.command, "migrate", &source.digest, &memory);
    command["kind"] = json!("migrate");
    command["revision"] = json!(candidate);
    command["evidence"] = json!(evidence);
    let selected = service.commit(&command).await.unwrap();
    assert_eq!(
        service
            .dispatch_pending("model", &f.host, 1)
            .await
            .unwrap()
            .iter()
            .map(|row| row.value())
            .collect::<Vec<_>>(),
        vec![
            json!({"contract":"algal.application-admission-denied.v1","application":"model","intent":intent,"sourceState":source.digest,"currentState":selected.digest,"status":"denied","reason":"Episode source memory or revision is no longer selected"})
        ]
    );
    assert_eq!(
        service
            .undispatched_pending("model", &selected.digest)
            .unwrap()
            .iter()
            .map(|row| &row.intent)
            .collect::<Vec<_>>(),
        vec![&intent]
    );
    assert_eq!(service.store.get("values", &intent).unwrap(), original);
    assert_eq!(
        service.inspect("model").unwrap().unwrap().digest,
        selected.digest
    );
}

struct QuotaAfterEffect<'a> {
    host: &'a PolicyHost,
    root: &'a Path,
    config: String,
    dispatches: Cell<usize>,
    reconciliations: Cell<usize>,
}
impl Dispatcher for QuotaAfterEffect<'_> {
    fn configuration_digest(&self) -> &str {
        &self.config
    }
    fn dispatch<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
        Box::pin(async move {
            self.dispatches.set(self.dispatches.get() + 1);
            let outcome = self.host.dispatch(context).await?;
            // Owned fixture fault: fill the application with an actual sparse
            // file after the channel effect, before settlement's quota scan.
            fs::File::create(self.root.join("applications/model/settlement-quota"))?
                .set_len(256 * 1024 * 1024)?;
            Ok(outcome)
        })
    }
    fn can_reconcile(&self) -> bool {
        true
    }
    fn reconcile<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
        Box::pin(async move {
            self.reconciliations.set(self.reconciliations.get() + 1);
            self.host.reconcile(context).await
        })
    }
}

#[tokio::test]
async fn channel_result_and_message_survive_settlement_quota_failure_without_redispatch() {
    let f = fixture();
    let allow = AllowHost(&f.host);
    let mut service = Service::new(f.dir.path(), &allow).unwrap();
    let body = json!({"payload":"durable"});
    let message = put(&mut service.store, body.clone());
    let mut command = f.command.clone();
    command["intents"] = json!([{"kind":"deliver","route":"inbox","message":message}]);
    let source = service.create(&command).await.unwrap();
    let intent = &source.transition.intents[0];
    let outbox = f
        .dir
        .path()
        .join("applications/model/outbox")
        .join(format!("{}.json", &intent[7..]));
    let mut dispatcher = QuotaAfterEffect {
        host: &f.host,
        root: f.dir.path(),
        config: f.host.configuration_digest().to_owned(),
        dispatches: Cell::new(0),
        reconciliations: Cell::new(0),
    };
    assert!(
        service
            .dispatch_pending("model", &dispatcher, 1)
            .await
            .unwrap_err()
            .message
            .contains("per-application")
    );
    let retained = fs::read(&outbox).unwrap();
    let started: Value = serde_json::from_slice(&retained).unwrap();
    assert_eq!(started["status"], "started");
    let outcomes = vec![ChannelDelivery {
        identity: started["identity"].as_str().unwrap().to_owned(),
        message: message.clone(),
    }];
    assert_eq!(read_channel(&f.channels, "inbox").unwrap(), outcomes);
    let result = json!({"kind":"delivery","message":message,"idempotencyKey":started["identity"]});
    assert_eq!(
        service.store.get("values", &hash(&result)).unwrap(),
        Some(result)
    );
    let record = json!({"contract":"algal.interapp-message.v1","application":"model","operation":f.command["operation"],"intent":intent,"route":"inbox","to":f.recipient,"body":body});
    assert_eq!(
        verify_interapp_message(&service.store, &hash(&record))
            .unwrap()
            .value,
        record
    );
    assert!(
        verify_interapp_delivery(&service, &hash(&record), Some(&f.channels))
            .unwrap_err()
            .message
            .contains("did not settle")
    );
    assert_eq!(
        service
            .dispatch_pending("model", &dispatcher, 1)
            .await
            .unwrap()[0]
            .value()["status"],
        "started"
    );
    dispatcher.config = hash(&json!("changed"));
    assert!(
        service
            .reconcile_dispatch("model", intent, &dispatcher)
            .await
            .unwrap_err()
            .message
            .contains("configuration changed")
    );
    assert_eq!(dispatcher.reconciliations.get(), 0);
    dispatcher.config = f.host.configuration_digest().to_owned();
    assert!(
        service
            .reconcile_dispatch("model", intent, &dispatcher)
            .await
            .unwrap_err()
            .message
            .contains("per-application")
    );
    assert_eq!(dispatcher.dispatches.get(), 1);
    assert_eq!(dispatcher.reconciliations.get(), 1);
    assert_eq!(read_channel(&f.channels, "inbox").unwrap(), outcomes);
    assert_eq!(fs::read(&outbox).unwrap(), retained);
    assert_eq!(
        service.inspect("model").unwrap().unwrap().digest,
        source.digest
    );
}

#[tokio::test]
async fn later_valid_reuse_of_a_losing_operation_invalidates_stale_head_evidence() {
    let f = fixture();
    let allow = AllowHost(&f.host);
    let mut service = Service::new(f.dir.path(), &allow).unwrap();
    let initial = service.create(&f.command).await.unwrap();
    let memory = initial.state.memory.clone();
    let winner = advance(&f.command, "winner", &initial.digest, &memory);
    let loser = advance(&f.command, "reused-loser", &initial.digest, &memory);
    let (reference, record, selected) = produce_contention(
        &mut service,
        &json!({"parentState":initial.digest,"attempts":[winner,loser]}),
    )
    .await
    .unwrap();
    assert_eq!(
        verify_contention(&service, &reference).unwrap().winner,
        record.winner
    );
    let retained = service.store.get("values", &reference).unwrap();
    let mut later = loser.clone();
    later["expectedHead"] = json!(selected.digest);
    let later = service.commit(&later).await.unwrap();
    assert_eq!(later.transition.operation, loser["operation"]);
    assert!(
        verify_contention(&service, &reference)
            .unwrap_err()
            .message
            .contains("not reproducible")
    );
    assert!(
        service
            .commit(&loser)
            .await
            .unwrap_err()
            .message
            .contains("another request")
    );
    assert_eq!(service.store.get("values", &reference).unwrap(), retained);
    assert_eq!(
        service.inspect("model").unwrap().unwrap().digest,
        later.digest
    );
    assert_eq!(
        service
            .history("model")
            .unwrap()
            .iter()
            .map(|row| row.transition.operation.clone())
            .collect::<Vec<_>>(),
        vec![
            initial.transition.operation,
            winner["operation"].as_str().unwrap().to_owned(),
            loser["operation"].as_str().unwrap().to_owned()
        ]
    );
}

struct WriterAdmission {
    change_plan: Cell<bool>,
}
impl Admission for WriterAdmission {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        Ok(())
    }
    fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
        if let Some(previous) = context.previous_dispatch {
            let mut plan = previous.plan.value();
            if self.change_plan.get() {
                plan["binding"]["hostProfile"] = json!(hash(&json!("changed-host")));
            }
            return Ok(plan);
        }
        let WorkIntent::StartEpisode { entrypoint, input } = &context.intent.work else {
            return Err(Error::invalid("writer fixture requires episode"));
        };
        let entry = &context.snapshot.revision.entrypoints[0];
        let intent = hash(&context.intent.value);
        Ok(
            json!({"kind":"episode","binding":{"contract":"algal.application-episode.v1","application":"model","intent":intent,"sourceState":context.snapshot.digest,"revision":context.snapshot.state.revision,"memory":context.snapshot.state.memory,"epoch":context.snapshot.state.epoch,"entrypoint":entrypoint,"manifest":entry.manifest,"arguments":input,"process":process_name("model", &intent)?,"maxGenerations":entry.max_generations,"hostProfile":hash(&json!("profile")),"access":"external-write"}}),
        )
    }
}
struct PersistentWriter {
    path: PathBuf,
    config: String,
    dispatches: Cell<usize>,
    reconciliations: Cell<usize>,
}
impl Dispatcher for PersistentWriter {
    fn configuration_digest(&self) -> &str {
        &self.config
    }
    fn dispatch<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
        Box::pin(async move {
            self.dispatches.set(self.dispatches.get() + 1);
            fs::write(
                &self.path,
                serde_json::to_vec(
                    &json!({"identity":context.dispatch.identity,"writes":self.dispatches.get()}),
                )
                .unwrap(),
            )?;
            Ok(json!({"status":"uncertain","reason":"lost acknowledgement after owned write"}))
        })
    }
    fn can_reconcile(&self) -> bool {
        true
    }
    fn reconcile<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
        Box::pin(async move {
            self.reconciliations.set(self.reconciliations.get() + 1);
            let effect: Value = serde_json::from_slice(&fs::read(&self.path).unwrap()).unwrap();
            assert_eq!(
                effect,
                json!({"identity":context.dispatch.identity,"writes":1})
            );
            let DispatchPlan::Episode { binding } = &context.dispatch.plan else {
                panic!("wrong plan")
            };
            assert_eq!(binding.source_state, context.snapshot.digest);
            assert_eq!(binding.memory, context.snapshot.state.memory);
            assert_ne!(binding.memory, context.current.state.memory);
            Some(Ok(
                json!({"status":"settled","result":{"kind":"episode","binding":hash(&binding.value),"process":binding.process}}),
            ))
        })
    }
}

#[tokio::test]
async fn persisted_old_writer_reconciles_after_memory_advance_without_replaying_its_effect() {
    let f = fixture();
    let admission = WriterAdmission {
        change_plan: Cell::new(false),
    };
    let mut service = Service::new(f.dir.path(), &admission).unwrap();
    let input = put(&mut service.store, json!("writer-input"));
    let mut command = f.command.clone();
    command["intents"] = json!([{"kind":"start-episode","entrypoint":"run","input":input}]);
    let source = service.create(&command).await.unwrap();
    let intent = &source.transition.intents[0];
    let outbox = f
        .dir
        .path()
        .join("applications/model/outbox")
        .join(format!("{}.json", &intent[7..]));
    let mut dispatcher = PersistentWriter {
        path: f.dir.path().join("owned-writer-effect.json"),
        config: hash(&json!("writer-dispatcher")),
        dispatches: Cell::new(0),
        reconciliations: Cell::new(0),
    };
    let started = service
        .dispatch_pending("model", &dispatcher, 1)
        .await
        .unwrap()[0]
        .value();
    assert_eq!(started["status"], "uncertain");
    assert_eq!(
        serde_json::from_slice::<Value>(&fs::read(&outbox).unwrap()).unwrap(),
        started
    );
    let effect = fs::read(&dispatcher.path).unwrap();
    let memory = put(&mut service.store, json!({"facts":["new"]}));
    let selected = service
        .commit(&advance(
            &f.command,
            "writer-memory",
            &source.digest,
            &memory,
        ))
        .await
        .unwrap();
    assert_eq!(
        service
            .dispatch_pending("model", &dispatcher, 1)
            .await
            .unwrap()[0]
            .value(),
        started
    );
    dispatcher.config = hash(&json!("changed-dispatcher"));
    assert!(
        service
            .reconcile_dispatch("model", intent, &dispatcher)
            .await
            .unwrap_err()
            .message
            .contains("configuration changed")
    );
    dispatcher.config = hash(&json!("writer-dispatcher"));
    admission.change_plan.set(true);
    assert!(
        service
            .reconcile_dispatch("model", intent, &dispatcher)
            .await
            .unwrap_err()
            .message
            .contains("cannot change")
    );
    assert_eq!(dispatcher.reconciliations.get(), 0);
    assert_eq!(
        serde_json::from_slice::<Value>(&fs::read(&outbox).unwrap()).unwrap(),
        started
    );
    // A new service with the production default host admits the retained old
    // plan without granting fresh authority against the newly selected memory.
    let mut reopened = Service::new(f.dir.path(), &f.host).unwrap();
    let settled = reopened
        .reconcile_dispatch("model", intent, &dispatcher)
        .await
        .unwrap();
    assert_eq!(settled.status, "settled");
    assert_eq!(settled.identity, started["identity"]);
    assert_eq!(settled.plan.value(), started["plan"]);
    assert_eq!(
        serde_json::from_slice::<Value>(&fs::read(&outbox).unwrap()).unwrap(),
        settled.value
    );
    assert!(
        reopened
            .dispatch_pending("model", &dispatcher, 1)
            .await
            .unwrap()
            .is_empty()
    );
    assert_eq!(dispatcher.dispatches.get(), 1);
    assert_eq!(dispatcher.reconciliations.get(), 1);
    assert_eq!(fs::read(&dispatcher.path).unwrap(), effect);
    assert_eq!(
        reopened.inspect("model").unwrap().unwrap().digest,
        selected.digest
    );
}
