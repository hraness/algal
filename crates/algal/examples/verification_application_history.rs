//! Scratch verification driver. No oracle, production fallback, or arbitrary host effects.
use algal::{
    Error, Result,
    application::{
        Admission, CommitContext, DispatchAdmission, DispatchContext, Dispatcher, Service,
        Snapshot, parse_intent, process_name,
    },
    canonical::digest,
    contract::Manifest,
    store::Store,
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{self, File, OpenOptions},
    future::Future,
    io::{Read, Write},
    os::unix::fs::OpenOptionsExt,
    path::{Path, PathBuf},
    pin::Pin,
    sync::{Arc, Mutex},
};

type Harness<T> = std::result::Result<T, String>;
const HISTORY_BYTES: usize = 32_768;
const TRACE_BYTES: usize = 1_048_576;
fn fail(message: impl Into<String>) -> Error {
    Error::new("INTERNAL", message)
}
fn hash(value: &Value) -> Result<String> {
    digest(value)
}
fn raw_hash(bytes: &[u8]) -> String {
    format!("sha256:{:x}", Sha256::digest(bytes))
}
fn app(index: u64) -> String {
    format!("history-{index}")
}
fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value[key].as_str().expect("closed harness string")
}
fn number(value: &Value, key: &str) -> u64 {
    value[key].as_u64().expect("closed harness integer")
}
fn ensure(condition: bool, reason: &str) -> Harness<()> {
    if condition {
        Ok(())
    } else {
        Err(reason.into())
    }
}
fn fields(value: &Value, wanted: &[&str]) -> Harness<()> {
    let map = value.as_object().ok_or("expected harness object")?;
    ensure(
        map.len() == wanted.len() && wanted.iter().all(|k| map.contains_key(*k)),
        "closed harness fields",
    )
}
fn choice(value: &Value, key: &str, choices: &[&str]) -> Harness<()> {
    ensure(
        value[key].as_str().is_some_and(|v| choices.contains(&v)),
        "finite harness choice",
    )
}
fn integer(value: &Value, key: &str, max: u64) -> Harness<()> {
    ensure(
        value[key].as_u64().is_some_and(|v| v <= max),
        "finite harness integer",
    )
}
fn boolean(value: &Value, key: &str) -> Harness<()> {
    ensure(value[key].is_boolean(), "harness boolean")
}
fn regular_bytes(path: &Path, max: usize) -> Harness<Vec<u8>> {
    let before = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    ensure(
        before.is_file() && !before.file_type().is_symlink() && before.len() <= max as u64,
        "regular file byte bound",
    )?;
    let mut file = OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
        .open(path)
        .map_err(|e| e.to_string())?;
    let info = file.metadata().map_err(|e| e.to_string())?;
    ensure(
        info.is_file() && info.len() <= max as u64,
        "opened regular file byte bound",
    )?;
    let mut bytes = Vec::new();
    let mut chunk = [0u8; 8192];
    loop {
        let n = file.read(&mut chunk).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        ensure(bytes.len() + n <= max, "file grew past byte bound")?;
        bytes.extend_from_slice(&chunk[..n]);
    }
    Ok(bytes)
}
fn optional_bytes(path: &Path, max: usize) -> Harness<Option<Vec<u8>>> {
    match fs::symlink_metadata(path) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
        Ok(_) => regular_bytes(path, max).map(Some),
    }
}
fn parse_history(bytes: &[u8]) -> Harness<Value> {
    ensure(
        bytes.len() <= HISTORY_BYTES && !bytes.starts_with(&[0xef, 0xbb, 0xbf]),
        "history bytes/BOM",
    )?;
    let history: Value = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
    let mut canonical = serde_json::to_vec(&history).map_err(|e| e.to_string())?;
    canonical.push(b'\n');
    ensure(
        bytes == canonical,
        "history must use canonical unique-key JSON plus newline",
    )?;
    fields(
        &history,
        &["contract", "generator", "seed", "profile", "commands"],
    )?;
    choice(&history, "contract", &["algal.application-history.v1"])?;
    choice(&history, "generator", &["state-selected-v1"])?;
    choice(&history, "profile", &["delivery", "writer"])?;
    integer(&history, "seed", u32::MAX.into())?;
    let commands = history["commands"].as_array().ok_or("commands array")?;
    ensure(
        !commands.is_empty() && commands.len() <= 24,
        "history command bound",
    )?;
    for (id, c) in commands.iter().enumerate() {
        fields(c, &["id", "action"])?;
        ensure(
            c["id"].as_u64() == Some(id as u64),
            "contiguous command index",
        )?;
        let a = &c["action"];
        choice(
            a,
            "kind",
            &[
                "create",
                "commit",
                "repeat",
                "scan",
                "reconcile",
                "inspect",
                "restart",
            ],
        )?;
        let kind = text(a, "kind");
        let keys: &[&str] = match kind {
            "create" => &["kind", "app", "key", "memory", "fault"],
            "commit" => &[
                "kind",
                "app",
                "key",
                "transition",
                "head",
                "memory",
                "intents",
                "fault",
            ],
            "repeat" => &["kind", "source", "conflict"],
            "scan" => &[
                "kind",
                "app",
                "configuration",
                "batch",
                "deny",
                "results",
                "access",
            ],
            "reconcile" => &[
                "kind",
                "app",
                "source",
                "ordinal",
                "configuration",
                "plan",
                "deny",
                "result",
            ],
            "inspect" => &["kind", "app"],
            _ => &["kind"],
        };
        fields(a, keys)?;
        for key in ["app", "memory", "configuration", "ordinal", "plan"] {
            if a.get(key).is_some() {
                integer(a, key, 1)?;
            }
        }
        if a.get("key").is_some() {
            integer(a, "key", 3)?;
        }
        if a.get("fault").is_some() {
            choice(a, "fault", &["none", "prepared", "head-published"])?;
        }
        if kind == "commit" {
            choice(a, "transition", &["memory", "investigate"])?;
            choice(a, "intents", &["none", "deliveries", "writer"])?;
        }
        if kind == "repeat" {
            boolean(a, "conflict")?;
        }
        if kind == "reconcile" {
            boolean(a, "deny")?;
            choice(a, "result", &["settled", "blocked", "unknown"])?;
        }
        if kind == "scan" {
            integer(a, "batch", 2)?;
            ensure(number(a, "batch") >= 1, "batch lower bound")?;
            choice(a, "deny", &["none", "first", "all"])?;
            choice(a, "access", &["observe", "external-write"])?;
            let results = a["results"].as_array().ok_or("results array")?;
            ensure(
                results.len() == 2
                    && results.iter().all(|v| {
                        v.as_str()
                            .is_some_and(|s| ["settled", "blocked", "unknown"].contains(&s))
                    }),
                "finite results",
            )?;
        }
        let reference = if kind == "commit" {
            Some("head")
        } else if kind == "repeat" || kind == "reconcile" {
            Some("source")
        } else {
            None
        };
        if let Some(key) = reference {
            integer(a, key, 23)?;
            let source = number(a, key) as usize;
            ensure(source < id, "backward history reference")?;
            ensure(
                ["create", "commit", "repeat"].contains(&text(&commands[source]["action"], "kind")),
                "reference must name a commit command",
            )?;
        }
    }
    Ok(history)
}
fn put(store: &mut Store, value: Value) -> Result<String> {
    store.put("values", &value)
}
fn fixtures(root: &Path) -> Result<Value> {
    let mut store = Store::open(root, true)?;
    let manifest=store.admit(&Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:history-fixture","name":"History fixture","cells":[{"id":"out","kind":"const","outputs":{"value":{"type":"json","value":"ok"}}}],"edges":[]}))?)?;
    let schema = put(&mut store, json!({"fixture":"schema"}))?;
    let queries = put(&mut store, json!({"fixture":"queries"}))?;
    let views = put(&mut store, json!({"fixture":"views"}))?;
    let runtime = put(&mut store, json!({"fixture":"runtime"}))?;
    let policy = put(&mut store, json!({"fixture":"policy"}))?;
    let applicability = put(&mut store, json!({"fixture":"query"}))?;
    let mut revisions = vec![];
    let mut refs = vec![];
    for n in 0..2 {
        let revision = json!({"contract":"algal.application-revision.v1","application":app(n),"parent":null,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":applicability,"maxGenerations":1,"capabilities":[],"queries":[applicability]}]});
        refs.push(put(&mut store, revision.clone())?);
        revisions.push(revision);
    }
    let memories = [
        put(&mut store, json!({"fixture":"memory","memory":0}))?,
        put(&mut store, json!({"fixture":"memory","memory":1}))?,
    ];
    let messages = [
        put(&mut store, json!({"fixture":"message","message":0}))?,
        put(&mut store, json!({"fixture":"message","message":1}))?,
    ];
    Ok(
        json!({"revisions":revisions,"revisionRefs":refs,"memories":memories,"messages":messages,"manifest":manifest,"input":put(&mut store,json!({"fixture":"input"}))?,"profiles":[hash(&json!({"profile":0}))?,hash(&json!({"profile":1}))?],"configurations":[hash(&json!({"configuration":0}))?,hash(&json!({"configuration":1}))?],"recipient":format!("cap:mailbox-send:{}",hash(&json!({"history":true}))?)}),
    )
}
#[derive(Default)]
struct Control {
    action: Value,
    callbacks: Vec<Value>,
    total_callbacks: usize,
    failure: Option<String>,
}
struct Host {
    shared: Arc<Mutex<Control>>,
    fixtures: Value,
}
impl Admission for Host {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        Ok(())
    }
    fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
        let a = self
            .shared
            .lock()
            .map_err(|_| fail("fixture lock poisoned"))?
            .action
            .clone();
        let kind = text(&a, "kind");
        if kind != "scan" && kind != "reconcile" {
            return Err(fail("Fixture did not select a dispatch action"));
        }
        if kind == "scan"
            && (a["deny"] == "all" || a["deny"] == "first" && context.intent.ordinal == 0)
            || kind == "reconcile" && a["deny"] == true
        {
            return Err(fail("History host denied intent"));
        }
        if let Some(previous) = context.previous_dispatch {
            let mut plan = previous.plan.value();
            if kind == "reconcile" && a["plan"] == 1 {
                if plan["kind"] == "delivery" {
                    plan["hostProfile"] = self.fixtures["profiles"][1].clone();
                } else {
                    plan["binding"]["hostProfile"] = self.fixtures["profiles"][1].clone();
                }
            }
            return Ok(plan);
        }
        if context.intent.value["kind"] == "deliver" {
            return Ok(
                json!({"kind":"delivery","recipient":self.fixtures["recipient"],"hostProfile":self.fixtures["profiles"][0]}),
            );
        }
        let intent = hash(&context.intent.value)?;
        Ok(
            json!({"kind":"episode","binding":{"contract":"algal.application-episode.v1","application":context.snapshot.state.application,"intent":intent,"sourceState":context.snapshot.digest,"revision":context.snapshot.state.revision,"memory":context.snapshot.state.memory,"epoch":context.snapshot.state.epoch,"entrypoint":"run","manifest":self.fixtures["manifest"],"arguments":context.intent.value["input"],"process":process_name(&context.snapshot.state.application,&intent)?,"maxGenerations":1,"hostProfile":self.fixtures["profiles"][0],"access":if kind=="scan" {a["access"].clone()} else {json!("external-write")}}}),
        )
    }
}
fn raw_dispatch(root: &Path, application: &str, intent: &str) -> Harness<Value> {
    match optional_bytes(
        &root
            .join("applications")
            .join(application)
            .join("outbox")
            .join(format!("{}.json", &intent[7..])),
        65_536,
    )? {
        Some(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        None => Ok(Value::Null),
    }
}
fn effect(root: &Path, intent: &str) -> Harness<Value> {
    match optional_bytes(
        &root
            .join("owned-effects")
            .join(format!("{}.txt", &intent[7..])),
        4096,
    )? {
        Some(bytes) => {
            let text = std::str::from_utf8(&bytes).map_err(|e| e.to_string())?;
            Ok(json!({"bytes":bytes.len(),"sha256":raw_hash(&bytes),"text":text}))
        }
        None => Ok(Value::Null),
    }
}
fn snapshot(value: &Snapshot) -> Value {
    json!({"digest":value.digest,"state":value.state.value,"transition":value.transition.value,"revision":value.revision.value})
}
fn observe(root: &Path, host: &Host) -> Harness<Value> {
    let reader = Service::new(root, host).map_err(|e| e.to_string())?;
    let mut applications = vec![];
    let mut intents = vec![];
    for index in 0..2 {
        let name = app(index);
        let history = reader.history(&name).map_err(|e| e.to_string())?;
        ensure(history.len() <= 4, "finite observed state count")?;
        let mut works = vec![];
        for state in &history {
            let mut rows = vec![];
            for reference in &state.transition.intents {
                let value = reader
                    .store
                    .get("values", reference)
                    .map_err(|e| e.to_string())?
                    .ok_or("missing intent fixture")?;
                rows.push((reference, parse_intent(&value).map_err(|e| e.to_string())?));
            }
            rows.sort_by_key(|(_, v)| v.ordinal);
            for (reference, work) in rows {
                let dispatch = reader
                    .read_dispatch(&name, reference, &work, state)
                    .map_err(|e| e.to_string())?;
                works.push(json!({"ref":reference,"source":state.digest,"work":work.value,"dispatch":dispatch.map(|d|d.value),"rawDispatch":raw_dispatch(root,&name,reference)?,"effect":effect(root,reference)?}));
            }
        }
        ensure(works.len() <= 4, "finite observed intent count")?;
        applications.push(history.iter().map(snapshot).collect::<Vec<_>>());
        intents.push(works);
    }
    let mut files = vec![];
    for entry in fs::read_dir(root.join("owned-effects")).map_err(|e| e.to_string())? {
        ensure(files.len() < 32, "owned effect file count bound")?;
        let entry = entry.map_err(|e| e.to_string())?;
        ensure(
            entry.file_type().map_err(|e| e.to_string())?.is_file(),
            "owned effect regular file",
        )?;
        let name = entry
            .file_name()
            .into_string()
            .map_err(|_| "effect filename UTF8")?;
        ensure(
            name.len() == 68
                && name.ends_with(".txt")
                && name[..64]
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
            "effect filename identity",
        )?;
        files.push(name);
    }
    files.sort();
    Ok(json!({"applications":applications,"intents":intents,"effectFiles":files}))
}
struct Effects {
    shared: Arc<Mutex<Control>>,
    root: PathBuf,
    configuration: String,
}
impl Effects {
    fn callback(&self, c: &DispatchContext, method: &str) -> Result<Value> {
        let observed = self.observe_callback(c, method);
        match observed {
            Ok(value) => value,
            Err(message) => {
                self.shared
                    .lock()
                    .map_err(|_| fail("fixture lock poisoned"))?
                    .failure = Some(message.clone());
                Err(fail(message))
            }
        }
    }
    fn observe_callback(&self, c: &DispatchContext, method: &str) -> Harness<Result<Value>> {
        let a = self
            .shared
            .lock()
            .map_err(|_| "fixture lock poisoned")?
            .action
            .clone();
        let kind = text(&a, "kind");
        ensure(
            kind == "scan" || kind == "reconcile",
            "No fixture callback choice",
        )?;
        let choice = if kind == "scan" {
            a["results"][c.intent.ordinal]
                .as_str()
                .ok_or("callback ordinal")?
        } else {
            text(&a, "result")
        };
        let before = effect(&self.root, &c.dispatch.intent)?;
        let mut row = json!({"method":method,"intent":c.dispatch.intent,"source":c.snapshot.digest,"current":c.current.digest,"record":c.dispatch.value,"durable":raw_dispatch(&self.root,&c.dispatch.application,&c.dispatch.intent)?,"effectBefore":before["text"],"effectAfter":before["text"]});
        {
            let mut control = self.shared.lock().map_err(|_| "fixture lock poisoned")?;
            ensure(control.total_callbacks < 32, "total callback count bound")?;
            control.total_callbacks += 1;
        }
        if choice != "blocked" && (method == "dispatch" || before.is_null()) {
            let path = self
                .root
                .join("owned-effects")
                .join(format!("{}.txt", &c.dispatch.intent[7..]));
            let mut file = OpenOptions::new()
                .write(true)
                .create_new(true)
                .mode(0o600)
                .open(path)
                .map_err(|e| e.to_string())?;
            file.write_all(format!("{}\n", c.dispatch.identity).as_bytes())
                .map_err(|e| e.to_string())?;
        }
        row["effectAfter"] = effect(&self.root, &c.dispatch.intent)?["text"].clone();
        self.shared
            .lock()
            .map_err(|_| "fixture lock poisoned")?
            .callbacks
            .push(row);
        if choice == "unknown" {
            return Ok(Err(fail("History effect acknowledgment lost")));
        }
        if choice == "blocked" {
            return Ok(Ok(
                json!({"status":"blocked","reason":"History callback blocked"}),
            ));
        }
        let plan = c.dispatch.plan.value();
        let result = if plan["kind"] == "delivery" {
            json!({"kind":"delivery","message":c.intent.value["message"],"idempotencyKey":c.dispatch.identity})
        } else {
            json!({"kind":"episode","binding":hash(&plan["binding"]).map_err(|e|e.to_string())?,"process":plan["binding"]["process"]})
        };
        Ok(Ok(json!({"status":"settled","result":result})))
    }
}
impl Dispatcher for Effects {
    fn configuration_digest(&self) -> &str {
        &self.configuration
    }
    fn dispatch<'a>(
        &'a self,
        c: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
        Box::pin(async move { self.callback(c, "dispatch") })
    }
    fn can_reconcile(&self) -> bool {
        true
    }
    fn reconcile<'a>(
        &'a self,
        c: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
        Box::pin(async move { Some(self.callback(c, "reconcile")) })
    }
}
fn materialize(
    c: &Value,
    f: &Value,
    requests: &BTreeMap<u64, Value>,
    heads: &BTreeMap<u64, String>,
) -> Harness<Value> {
    let a = &c["action"];
    let kind = text(a, "kind");
    if kind == "repeat" {
        let mut prior = requests
            .get(&number(a, "source"))
            .cloned()
            .ok_or("Repeat source has no request")?;
        if a["conflict"] == true {
            prior["memory"] =
                f["memories"][usize::from(prior["memory"] == f["memories"][0])].clone();
        }
        return Ok(prior);
    }
    let app_number = number(a, "app");
    let head = if kind == "create" {
        Value::Null
    } else {
        json!(
            heads
                .get(&number(a, "head"))
                .ok_or("Commit reference has no selected state")?
        )
    };
    let intents = if kind == "create" || a["intents"] == "none" {
        json!([])
    } else if a["intents"] == "writer" {
        json!([{"kind":"start-episode","entrypoint":"run","input":f["input"]}])
    } else {
        json!([{"kind":"deliver","route":"route-0","message":f["messages"][0]},{"kind":"deliver","route":"route-1","message":f["messages"][1]}])
    };
    Ok(
        json!({"application":app(app_number),"operation":hash(&json!({"application":app(app_number),"operation":a["key"]})).map_err(|e|e.to_string())?,"kind":if kind=="create" {json!("create")} else {a["transition"].clone()},"expectedHead":head,"revision":f["revisionRefs"][app_number as usize],"memory":f["memories"][number(a,"memory") as usize],"intents":intents,"evidence":[],"causedBy":null}),
    )
}
async fn replay(root: &Path, history: &Value) -> Harness<Value> {
    let f = fixtures(root).map_err(|e| e.to_string())?;
    fs::create_dir(root.join("owned-effects")).map_err(|e| e.to_string())?;
    let shared = Arc::new(Mutex::new(Control::default()));
    let host = Host {
        shared: shared.clone(),
        fixtures: f.clone(),
    };
    let fault_control = shared.clone();
    let fault = move |point: &'static str| -> Result<()> {
        let c = fault_control
            .lock()
            .map_err(|_| fail("fixture lock poisoned"))?;
        let a = &c.action;
        if (a["kind"] == "create" || a["kind"] == "commit") && a["fault"] == point {
            Err(fail(format!("History fault at {point}")))
        } else {
            Ok(())
        }
    };
    let open = || Service::new(root, &host).map(|s| s.with_fault_hook(&fault));
    let mut service = open().map_err(|e| e.to_string())?;
    let initial = observe(root, &host)?;
    let mut requests = BTreeMap::new();
    let mut heads = BTreeMap::new();
    let mut steps = vec![];
    for c in history["commands"].as_array().ok_or("commands")? {
        let id = number(c, "id");
        let a = &c["action"];
        let kind = text(a, "kind");
        {
            let mut control = shared.lock().map_err(|_| "fixture lock poisoned")?;
            control.action = a.clone();
            control.callbacks.clear();
        }
        let request = if ["create", "commit", "repeat"].contains(&kind) {
            let r = materialize(c, &f, &requests, &heads)?;
            requests.insert(id, r.clone());
            Some(r)
        } else {
            None
        };
        let intent = if kind == "reconcile" {
            let source = heads
                .get(&number(a, "source"))
                .ok_or("Reconcile source has no selected state")?;
            let history = service
                .history(&app(number(a, "app")))
                .map_err(|e| e.to_string())?;
            let snapshot = history
                .iter()
                .find(|s| s.digest == *source)
                .ok_or("Reconcile source not in application history")?;
            let mut found = None;
            for reference in &snapshot.transition.intents {
                let value = service
                    .store
                    .get("values", reference)
                    .map_err(|e| e.to_string())?
                    .ok_or("Reconcile intent absent")?;
                if value["ordinal"] == a["ordinal"] {
                    found = Some(reference.clone());
                }
            }
            Some(found.ok_or("Reconcile source lacks ordinal")?)
        } else {
            None
        };
        let result: Result<Value> = if let Some(r) = &request {
            if kind == "create" {
                service.create(r).await.map(|s| snapshot(&s))
            } else {
                service.commit(r).await.map(|s| snapshot(&s))
            }
        } else if kind == "scan" || kind == "reconcile" {
            let effects = Effects {
                shared: shared.clone(),
                root: root.to_path_buf(),
                configuration: f["configurations"][number(a, "configuration") as usize]
                    .as_str()
                    .ok_or("configuration")?
                    .into(),
            };
            if kind == "scan" {
                service
                    .dispatch_pending(
                        &app(number(a, "app")),
                        &effects,
                        number(a, "batch") as usize,
                    )
                    .await
                    .map(|rows| json!(rows.iter().map(|r| r.value()).collect::<Vec<_>>()))
            } else {
                service
                    .reconcile_dispatch(
                        &app(number(a, "app")),
                        intent.as_ref().ok_or("reconcile intent")?,
                        &effects,
                    )
                    .await
                    .map(|d| d.value)
            }
        } else if kind == "inspect" {
            service
                .inspect(&app(number(a, "app")))
                .map(|s| s.map_or(Value::Null, |s| snapshot(&s)))
        } else {
            service = open().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        };
        if let Some(failure) = shared
            .lock()
            .map_err(|_| "fixture lock poisoned")?
            .failure
            .take()
        {
            return Err(format!("Harness callback failure: {failure}"));
        }
        let outcome = match result {
            Ok(value) => json!({"status":"ok","value":value}),
            Err(error) => {
                json!({"status":"error","code":error.code,"message":error.message,"uncertain":error.uncertain,"details":null,"wake":error.wake})
            }
        };
        let after = observe(root, &host)?;
        if let Some(request) = request {
            let request_hash = hash(&request).map_err(|e| e.to_string())?;
            for rows in after["applications"].as_array().ok_or("applications")? {
                for s in rows.as_array().ok_or("snapshots")? {
                    if s["transition"]["operation"] == request["operation"]
                        && s["transition"]["request"] == request_hash
                    {
                        heads.insert(id, text(s, "digest").to_owned());
                    }
                }
            }
        }
        steps.push(json!({"id":id,"outcome":outcome,"callbacks":shared.lock().map_err(|_|"fixture lock poisoned")?.callbacks.clone(),"after":after}));
    }
    Ok(
        json!({"contract":"algal.application-trace.v1","runtime":"native","historyDigest":hash(history).map_err(|e|e.to_string())?,"fixtures":f,"initial":initial,"steps":steps}),
    )
}
struct LimitedWriter {
    file: File,
    bytes: usize,
}
impl Write for LimitedWriter {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        if self.bytes + bytes.len() > TRACE_BYTES {
            return Err(std::io::Error::other("trace byte bound"));
        }
        let n = self.file.write(bytes)?;
        self.bytes += n;
        Ok(n)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.file.flush()
    }
}
async fn run() -> Harness<()> {
    let args: Vec<String> = std::env::args().collect();
    ensure(
        args.len() == 5 && args[1] == "replay",
        "usage: replay <history.json> <output.json> <owned-empty-root>",
    )?;
    let input = Path::new(&args[2]);
    let output = Path::new(&args[3]);
    let root = Path::new(&args[4]);
    ensure(
        input.is_absolute() && output.is_absolute() && root.is_absolute(),
        "absolute caller paths required",
    )?;
    let info = fs::symlink_metadata(root).map_err(|e| e.to_string())?;
    ensure(
        info.is_dir() && !info.file_type().is_symlink(),
        "owned root must be directory",
    )?;
    ensure(
        fs::read_dir(root)
            .map_err(|e| e.to_string())?
            .next()
            .is_none(),
        "owned root must be empty",
    )?;
    let bytes = regular_bytes(input, HISTORY_BYTES)?;
    let history = parse_history(&bytes)?;
    let trace = replay(root, &history).await?;
    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(output)
        .map_err(|e| e.to_string())?;
    let mut writer = LimitedWriter { file, bytes: 0 };
    serde_json::to_writer(&mut writer, &trace).map_err(|e| e.to_string())?;
    writer.write_all(b"\n").map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;
    println!(
        "{}",
        json!({"contract":"algal.native-history-worker.v1","historyInputSha256":raw_hash(&bytes),"historyInputBytes":bytes.len(),"commands":history["commands"].as_array().ok_or("commands")?.len(),"traceBytes":writer.bytes})
    );
    Ok(())
}
#[tokio::main(flavor = "current_thread")]
async fn main() {
    if let Err(error) = run().await {
        eprintln!("Native history harness: {error}");
        std::process::exit(1);
    }
}
