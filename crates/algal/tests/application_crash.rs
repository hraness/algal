//! Actual owned-process termination at application publication boundaries.
#![cfg(unix)]

use algal::{
    application::{
        Admission, CommitContext, DispatchAdmission, DispatchContext, Dispatcher, Service,
        WorkIntent,
    },
    canonical::digest,
    contract::Manifest,
    error::Result,
    store::Store,
};
use serde_json::{Value, json};
use std::{
    fs::{self, OpenOptions},
    future::Future,
    io::{Read, Write},
    os::unix::process::ExitStatusExt,
    path::{Path, PathBuf},
    pin::Pin,
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, Instant},
};

fn hash(value: &Value) -> String {
    digest(value).unwrap()
}
struct Allow;
impl Admission for Allow {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        Ok(())
    }
    fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
        Ok(
            json!({"kind":"delivery", "recipient":format!("cap:mailbox-send:{}",hash(&json!({"fixture":"crash"}))), "hostProfile":hash(&json!("crash-profile"))}),
        )
    }
}

struct Barrier {
    directory: PathBuf,
    mode: String,
    point: String,
    token: String,
}
impl Barrier {
    fn stop(&self, point: &str) {
        if self.mode != "crash" || self.point != point {
            return;
        }
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(self.directory.join("barrier.json"))
            .unwrap();
        file.write_all(
            serde_json::to_string(
                &json!({"token":self.token,"point":point,"pid":std::process::id()}),
            )
            .unwrap()
            .as_bytes(),
        )
        .unwrap();
        file.sync_all().unwrap();
        // Only the parent owning this Child handle may terminate this barrier.
        loop {
            thread::park_timeout(Duration::from_secs(1));
        }
    }
    fn effects(&self) -> Vec<String> {
        match fs::read_to_string(self.directory.join("fixture-effect.txt")) {
            Ok(text) => text.lines().map(str::to_owned).collect(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
            Err(error) => panic!("cannot inspect fixture effect: {error}"),
        }
    }
}
struct Sink<'a> {
    barrier: &'a Barrier,
    configuration: String,
}
fn settled(context: &DispatchContext) -> Value {
    let WorkIntent::Deliver { message, .. } = &context.intent.work else {
        panic!("expected fixture delivery")
    };
    json!({"status":"settled","result":{"kind":"delivery","message":message,"idempotencyKey":context.dispatch.identity}})
}
impl Dispatcher for Sink<'_> {
    fn configuration_digest(&self) -> &str {
        &self.configuration
    }
    fn dispatch<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
        Box::pin(async move {
            let mut file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(self.barrier.directory.join("fixture-effect.txt"))?;
            writeln!(file, "{}", context.dispatch.identity)?;
            file.sync_all()?;
            self.barrier.stop("effect-applied");
            Ok(settled(context))
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
            let writes = self.barrier.effects();
            Some(Ok(if writes == [context.dispatch.identity.clone()] {
                settled(context)
            } else {
                json!({"status":"blocked","reason":"Fixture has no exact completed effect evidence"})
            }))
        })
    }
}

fn put(store: &mut Store, value: Value) -> String {
    store.put("values", &value).unwrap()
}
async fn setup(service: &mut Service<'_>) -> Value {
    let manifest = service.store.put("manifests", &Manifest::parse(&json!({
        "contract":"algal.organism.v1","key":"organism:application-crash","name":"Crash fixture",
        "cells":[{"id":"out","kind":"const","outputs":{"value":{"type":"json","value":"ok"}}}],"edges":[]
    })).unwrap().value).unwrap();
    let schema = put(
        &mut service.store,
        json!({"contract":"algal.schema.fixture.v1"}),
    );
    let queries = put(
        &mut service.store,
        json!({"contract":"algal.queries.fixture.v1"}),
    );
    let views = put(
        &mut service.store,
        json!({"contract":"algal.views.fixture.v1"}),
    );
    let profile = put(
        &mut service.store,
        json!({"contract":"algal.runtime.fixture.v1"}),
    );
    let policy = put(
        &mut service.store,
        json!({"contract":"algal.policy.fixture.v1"}),
    );
    let query = put(
        &mut service.store,
        json!({"contract":"algal.query.fixture.v1"}),
    );
    let revision = put(
        &mut service.store,
        json!({"contract":"algal.application-revision.v1","application":"fixture","parent":null,
        "schema":schema,"queries":queries,"views":views,"runtimeProfile":profile,"evaluationPolicy":policy,"capabilityRequirements":[],
        "entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]}),
    );
    let before = put(
        &mut service.store,
        json!({"contract":"algal.memory.fixture.v1","facts":["before"]}),
    );
    let after = put(
        &mut service.store,
        json!({"contract":"algal.memory.fixture.v1","facts":["after"]}),
    );
    let initial = service.create(&json!({"application":"fixture","operation":hash(&json!("genesis")),"kind":"create","expectedHead":null,
        "revision":revision,"memory":before,"intents":[],"evidence":[],"causedBy":null})).await.unwrap();
    let message = put(
        &mut service.store,
        json!({"contract":"algal.message.fixture.v1","value":"local-write"}),
    );
    json!({"genesis":initial.digest,"before":before,"after":after,"command":{
        "application":"fixture","operation":hash(&json!("advance")),"kind":"memory","expectedHead":initial.digest,
        "revision":revision,"memory":after,"intents":[{"kind":"deliver","route":"sink","message":message}],"evidence":[],"causedBy":null}})
}

async fn verify(service: &mut Service<'_>, scenario: &Value, barrier: &Barrier, sink: &Sink<'_>) {
    let history = service.history("fixture").unwrap();
    let head = history.last().unwrap();
    let prepared = barrier.point == "prepared";
    assert_eq!(history.len(), if prepared { 1 } else { 2 });
    assert_eq!(
        head.state.memory,
        scenario[if prepared { "before" } else { "after" }]
            .as_str()
            .unwrap()
    );
    assert_eq!(head.state.sequence, usize::from(!prepared));
    assert_eq!(
        head.state.previous.as_deref(),
        if prepared {
            None
        } else {
            scenario["genesis"].as_str()
        }
    );
    for snapshot in &history {
        let mut refs = vec![
            &snapshot.state.revision,
            &snapshot.state.memory,
            &snapshot.state.transition,
            &snapshot.revision.schema,
            &snapshot.revision.queries,
            &snapshot.revision.views,
            &snapshot.revision.runtime_profile,
            &snapshot.revision.evaluation_policy,
        ];
        refs.extend(snapshot.transition.intents.iter());
        for entry in &snapshot.revision.entrypoints {
            refs.push(&entry.applicability);
            refs.extend(entry.queries.iter());
            service.store.manifest(&entry.manifest).unwrap();
        }
        for reference in refs {
            assert!(service.store.get("values", reference).unwrap().is_some());
        }
    }
    let before = barrier.effects().len();
    assert_eq!(
        before,
        usize::from(["effect-applied", "dispatch-settled"].contains(&barrier.point.as_str()))
    );
    let pending = service.dispatch_pending("fixture", sink, 32).await.unwrap();
    if prepared {
        assert!(pending.is_empty());
        assert!(barrier.effects().is_empty());
    } else if ["dispatch-started", "effect-applied"].contains(&barrier.point.as_str()) {
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].value()["status"], "started");
        assert_eq!(barrier.effects().len(), before);
        let repeated = service.dispatch_pending("fixture", sink, 32).await.unwrap();
        assert_eq!(
            repeated.iter().map(|r| r.value()).collect::<Vec<_>>(),
            pending.iter().map(|r| r.value()).collect::<Vec<_>>()
        );
        assert_eq!(barrier.effects().len(), before);
        let checked = service
            .reconcile_dispatch("fixture", &head.transition.intents[0], sink)
            .await
            .unwrap();
        assert_eq!(
            checked.value["status"],
            if barrier.point == "effect-applied" {
                "settled"
            } else {
                "blocked"
            }
        );
        assert_eq!(barrier.effects().len(), before);
    } else {
        assert_eq!(
            pending.len(),
            usize::from(barrier.point == "head-published")
        );
    }
    let recovered = service.commit(&scenario["command"]).await.unwrap();
    assert_eq!(service.history("fixture").unwrap().len(), 2);
    if !prepared {
        assert_eq!(recovered.digest, head.digest);
    }
    service.dispatch_pending("fixture", sink, 32).await.unwrap();
    service.dispatch_pending("fixture", sink, 32).await.unwrap();
    assert_eq!(
        barrier.effects().len(),
        usize::from(barrier.point != "dispatch-started")
    );
}

#[test]
#[ignore = "owned subprocess fixture; launched only with exact private test parameters"]
fn application_crash_child() {
    let directory = PathBuf::from(std::env::var("ALGAL_CRASH_DIRECTORY").unwrap());
    let mode = std::env::var("ALGAL_CRASH_MODE").unwrap();
    let point = std::env::var("ALGAL_CRASH_POINT").unwrap();
    let token = std::env::var("ALGAL_CRASH_TOKEN").unwrap();
    assert_eq!(token.len(), 48);
    assert!(token.bytes().all(|b| b.is_ascii_hexdigit()));
    let barrier = Barrier {
        directory: directory.clone(),
        mode: mode.clone(),
        point,
        token,
    };
    let fault = |point: &'static str| {
        barrier.stop(point);
        Ok(())
    };
    let mut service = Service::new(&directory, &Allow)
        .unwrap()
        .with_fault_hook(&fault);
    let sink = Sink {
        barrier: &barrier,
        configuration: hash(&json!("crash-dispatcher")),
    };
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    runtime.block_on(async {
        let path = directory.join("scenario.json");
        if mode == "setup" {
            fs::write(
                path,
                serde_json::to_vec(&setup(&mut service).await).unwrap(),
            )
            .unwrap();
        } else {
            let scenario: Value = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
            if mode == "crash" {
                service.commit(&scenario["command"]).await.unwrap();
                service
                    .dispatch_pending("fixture", &sink, 32)
                    .await
                    .unwrap();
                panic!("requested crash barrier was not reached");
            }
            assert_eq!(mode, "verify");
            verify(&mut service, &scenario, &barrier, &sink).await;
        }
    });
    fs::write(directory.join(format!("{mode}.json")), serde_json::to_vec(&json!({"ok":true,"token":barrier.token,"point":barrier.point,"pid":std::process::id()})).unwrap()).unwrap();
}

struct OwnedChild(Child);
impl Drop for OwnedChild {
    fn drop(&mut self) {
        if self.0.try_wait().ok().flatten().is_none() {
            let _ = self.0.kill();
        }
        let _ = self.0.wait();
    }
}
fn launch(directory: &Path, mode: &str, point: &str, token: &str) -> u32 {
    let mut child = OwnedChild(
        Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "application_crash_child",
                "--ignored",
                "--nocapture",
            ])
            .env("ALGAL_CRASH_DIRECTORY", directory)
            .env("ALGAL_CRASH_MODE", mode)
            .env("ALGAL_CRASH_POINT", point)
            .env("ALGAL_CRASH_TOKEN", token)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap(),
    );
    let pid = child.0.id();
    let deadline = Instant::now() + Duration::from_secs(10);
    if mode == "crash" {
        loop {
            if let Ok(bytes) = fs::read(directory.join("barrier.json")) {
                // A concurrently created file may be observed before its write.
                if let Ok(value) = serde_json::from_slice::<Value>(&bytes) {
                    assert_eq!(value, json!({"token":token,"point":point,"pid":pid}));
                    break;
                }
            }
            assert!(
                child.0.try_wait().unwrap().is_none(),
                "child exited before {point} barrier"
            );
            assert!(Instant::now() < deadline, "child missed {point} barrier");
            thread::sleep(Duration::from_millis(5));
        }
        child.0.kill().unwrap();
        assert_eq!(child.0.wait().unwrap().signal(), Some(9));
    } else {
        let status = loop {
            if let Some(status) = child.0.try_wait().unwrap() {
                break status;
            }
            assert!(
                Instant::now() < deadline,
                "child did not finish {mode}:{point}"
            );
            thread::sleep(Duration::from_millis(5));
        };
        let mut stderr = String::new();
        let mut stdout = String::new();
        child
            .0
            .stderr
            .take()
            .unwrap()
            .take(65537)
            .read_to_string(&mut stderr)
            .unwrap();
        child
            .0
            .stdout
            .take()
            .unwrap()
            .take(65537)
            .read_to_string(&mut stdout)
            .unwrap();
        assert!(
            status.success(),
            "{mode}:{point} failed: {stdout}\n{stderr}"
        );
        assert!(stdout.len() <= 65536 && stderr.len() <= 65536);
        let value: Value =
            serde_json::from_slice(&fs::read(directory.join(format!("{mode}.json"))).unwrap())
                .unwrap();
        assert_eq!(
            value,
            json!({"ok":true,"token":token,"point":point,"pid":pid})
        );
    }
    pid
}

#[test]
fn publication_and_delivery_survive_actual_sigkill() {
    for point in [
        "prepared",
        "head-published",
        "dispatch-started",
        "effect-applied",
        "dispatch-settled",
    ] {
        let directory = tempfile::tempdir().unwrap();
        let mut bytes = [0u8; 24];
        getrandom::fill(&mut bytes).unwrap();
        let token = bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();
        let setup = launch(directory.path(), "setup", point, &token);
        let killed = launch(directory.path(), "crash", point, &token);
        let reopened = launch(directory.path(), "verify", point, &token);
        assert_ne!(setup, killed);
        assert_ne!(killed, reopened);
        assert_ne!(setup, reopened);
    }
}
