//! Test-only replay of portable histories against the native public APIs.
//!
//! The wire schema is shared with `verify/traces`. Diagnostic filesystem events
//! are observations of actual calls, not an oracle for API outcomes or a proof
//! of power-loss durability. Faults preserve the real partial state they leave.

use crate::{
    Error, Result,
    application::{Admission, CommitContext, DispatchAdmission, Service, Snapshot as AppSnapshot},
    canonical::{canonical, digest, digest_bytes},
    contract::Manifest,
    durable_fs,
    mailbox::{MailboxConfig, MailboxService},
    store::Store,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    rc::Rc,
    sync::{Arc, Mutex},
};

const HISTORY_CONTRACT: &str = "algal.verification-history.v1";
const MAX_COMMANDS: usize = 24;
const MAX_VALUE_BYTES: usize = 256;
const MAX_HISTORY_BYTES: usize = 32_768;
const MAX_FILE_BYTES: usize = 1_048_576;
const MAX_EVENTS: usize = 4096;
const MAX_TRACE_BYTES: usize = 1_048_576;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct History {
    contract: String,
    seed: u32,
    commands: Vec<Command>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Command {
    id: u16,
    action: Action,
    // Explicit null is required on the wire; absent is not an implicit default.
    #[serde(deserialize_with = "required_nullable")]
    fault: Option<Fault>,
}

fn required_nullable<'de, D, T>(deserializer: D) -> std::result::Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer)
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
enum Action {
    StorePut {
        value: Value,
    },
    StoreGet {
        value: Value,
    },
    EffectPut {
        key: u8,
        value: Value,
    },
    EffectGet {
        key: u8,
    },
    SlotSet {
        key: u8,
        value: Value,
    },
    SlotGet {
        key: u8,
    },
    MailboxCreate {
        r#box: u8,
        capacity: u8,
    },
    MailboxSend {
        r#box: u8,
        key: u8,
        value: Value,
    },
    MailboxReceive {
        r#box: u8,
    },
    MailboxPending {
        r#box: u8,
    },
    MailboxRevoke {
        r#box: u8,
        right: Right,
    },
    ApplicationCreate {
        app: u8,
        key: u8,
        memory: Value,
    },
    ApplicationCommit {
        app: u8,
        key: u8,
        head: Value,
        memory: Value,
    },
    ApplicationInspect {
        app: u8,
    },
    Restart {},
    Tamper {
        target: Target,
        mode: TamperMode,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum Right {
    Send,
    Receive,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
enum Target {
    Value { value: Value },
    Effect { key: u8 },
    Slot { key: u8 },
    MailboxPending { r#box: u8, key: u8 },
    MailboxConsumed { r#box: u8, key: u8 },
    MailboxMessage { r#box: u8, key: u8 },
    MailboxLock { r#box: u8 },
    ApplicationHead { app: u8 },
    ApplicationMemory { memory: u8 },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum TamperMode {
    Corrupt,
    Remove,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "site", rename_all = "kebab-case", deny_unknown_fields)]
enum Fault {
    Fs {
        step: FsStep,
        phase: Phase,
        occurrence: u16,
        mode: FaultMode,
    },
    Application {
        point: ApplicationPoint,
        mode: FaultMode,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum FsStep {
    Mkdir,
    WriteTemp,
    FileSync,
    Link,
    Replace,
    DirSync,
    UnlinkTemp,
    UnlinkPending,
    CreateLock,
    UnlinkLock,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum Phase {
    Before,
    After,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum ApplicationPoint {
    Selected,
    Admitted,
    Prepared,
    HeadPublished,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum FaultMode {
    Error,
    Cancel,
}

fn harness(message: impl Into<String>) -> Error {
    Error::new("TRACE_HARNESS_FAILED", message)
}

fn small_value(value: &Value) -> Result<()> {
    let mut stack = vec![(value, 0)];
    let mut nodes = 0;
    while let Some((value, depth)) = stack.pop() {
        nodes += 1;
        if nodes > 1024 || depth > 12 {
            return Err(harness("trace JSON node/depth bound"));
        }
        match value {
            Value::Number(number) => {
                if !number
                    .as_f64()
                    .is_some_and(|n| n.fract() == 0.0 && n.abs() <= 9_007_199_254_740_991.0)
                {
                    return Err(harness("trace JSON requires safe integer numbers"));
                }
            }
            Value::Array(values) => stack.extend(values.iter().map(|value| (value, depth + 1))),
            Value::Object(values) => stack.extend(values.values().map(|value| (value, depth + 1))),
            _ => {}
        }
    }
    if canonical(value)?.len() > MAX_VALUE_BYTES {
        return Err(harness("trace JSON value exceeds 256 bytes"));
    }
    Ok(())
}

fn index(value: u8, maximum: u8, kind: &str) -> Result<()> {
    if value > maximum {
        return Err(harness(format!("trace {kind} index exceeds {maximum}")));
    }
    Ok(())
}

fn memory_index(value: &Value) -> Result<()> {
    if value.as_str() == Some("missing") || matches!(value.as_u64(), Some(0 | 1)) {
        Ok(())
    } else {
        Err(harness("trace memory must be 0, 1 or missing"))
    }
}

impl History {
    fn validate(&self) -> Result<()> {
        if self.contract != HISTORY_CONTRACT
            || self.commands.is_empty()
            || self.commands.len() > MAX_COMMANDS
        {
            return Err(harness("trace history contract or command bound"));
        }
        for (position, command) in self.commands.iter().enumerate() {
            if usize::from(command.id) != position {
                return Err(harness("trace command ID must equal its array index"));
            }
            match &command.action {
                Action::StorePut { value } | Action::StoreGet { value } => small_value(value)?,
                Action::EffectPut { key, value } | Action::SlotSet { key, value } => {
                    index(*key, 3, "key")?;
                    small_value(value)?;
                }
                Action::EffectGet { key } | Action::SlotGet { key } => index(*key, 3, "key")?,
                Action::MailboxCreate { r#box, capacity } => {
                    index(*r#box, 1, "mailbox")?;
                    if !(1..=2).contains(capacity) {
                        return Err(harness("trace mailbox capacity must be 1 or 2"));
                    }
                }
                Action::MailboxSend { r#box, key, value } => {
                    index(*r#box, 1, "mailbox")?;
                    index(*key, 3, "key")?;
                    small_value(value)?;
                }
                Action::MailboxReceive { r#box }
                | Action::MailboxPending { r#box }
                | Action::MailboxRevoke { r#box, .. } => index(*r#box, 1, "mailbox")?,
                Action::ApplicationCreate { app, key, memory } => {
                    index(*app, 1, "application")?;
                    index(*key, 3, "key")?;
                    memory_index(memory)?;
                }
                Action::ApplicationCommit {
                    app,
                    key,
                    head,
                    memory,
                } => {
                    index(*app, 1, "application")?;
                    index(*key, 3, "key")?;
                    memory_index(memory)?;
                    if !head.is_null()
                        && head.as_str() != Some("missing")
                        && !head.as_u64().is_some_and(|id| id < u64::from(command.id))
                    {
                        return Err(harness(
                            "trace head must name an earlier command, null or missing",
                        ));
                    }
                }
                Action::ApplicationInspect { app } => index(*app, 1, "application")?,
                Action::Restart {} => {}
                Action::Tamper { target, .. } => match target {
                    Target::Value { value } => small_value(value)?,
                    Target::Effect { key } | Target::Slot { key } => index(*key, 3, "key")?,
                    Target::MailboxPending { r#box, key }
                    | Target::MailboxConsumed { r#box, key }
                    | Target::MailboxMessage { r#box, key } => {
                        index(*r#box, 1, "mailbox")?;
                        index(*key, 3, "key")?;
                    }
                    Target::MailboxLock { r#box } => index(*r#box, 1, "mailbox")?,
                    Target::ApplicationHead { app } => index(*app, 1, "application")?,
                    Target::ApplicationMemory { memory } => index(*memory, 1, "memory")?,
                },
            }
            if let Some(Fault::Fs { occurrence, .. }) = command.fault
                && !(1..=256).contains(&occurrence)
            {
                return Err(harness("trace fault occurrence must be between 1 and 256"));
            }
            if command.fault.is_some()
                && matches!(command.action, Action::Restart {} | Action::Tamper { .. })
            {
                return Err(harness("cannot inject a fault into harness administration"));
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
enum Outcome {
    Ok {
        value: Value,
    },
    Error {
        code: String,
        message: String,
        wake: Vec<String>,
        uncertain: bool,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
enum ObservationTarget {
    Value { value: Value },
    Effect { key: u8 },
    Slot { key: u8 },
    MailboxPending { r#box: u8, key: u8 },
    MailboxConsumed { r#box: u8, key: u8 },
    MailboxMessage { r#box: u8, key: u8 },
    MailboxLock { r#box: u8 },
    ApplicationHead { app: u8 },
    ApplicationMemory { memory: u8 },
    MailboxConfig { r#box: u8 },
    ApplicationHistory { app: u8 },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum Event {
    Fs {
        step: String,
        phase: String,
        path: String,
        target: Option<String>,
        inode: Option<String>,
    },
    Application {
        point: ApplicationPoint,
    },
}

#[derive(Clone, Debug, Serialize)]
struct Observation {
    target: ObservationTarget,
    outcome: Outcome,
}

#[derive(Clone, Debug, Serialize)]
struct FileObservation {
    target: Target,
    exists: bool,
    bytes: usize,
    sha256: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
struct Snapshot {
    observations: Vec<Observation>,
    files: Vec<FileObservation>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Step {
    id: u16,
    outcome: Outcome,
    events: Vec<Event>,
    fault_triggered: bool,
    after: Snapshot,
}

#[derive(Clone, Debug, Serialize)]
struct Authority {
    alias: String,
    handle: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Trace {
    contract: &'static str,
    runtime: &'static str,
    history_digest: String,
    initial: Snapshot,
    steps: Vec<Step>,
    authorities: Vec<Authority>,
}

fn key_digest(key: u8) -> Result<String> {
    digest(&json!(["trace-key", key]))
}

fn app_name(app: u8) -> String {
    format!("trace-app-{app}")
}

fn box_name(r#box: u8) -> String {
    format!("trace-box-{box}")
}

fn projection(snapshot: &AppSnapshot) -> Value {
    json!({
        "digest":snapshot.digest,
        "previous":snapshot.state.previous,
        "sequence":snapshot.state.sequence,
        "operation":snapshot.transition.operation,
        "memory":snapshot.state.memory,
    })
}

fn found(value: Option<Value>) -> Value {
    json!({"found":value.is_some(), "value":value})
}

fn serialized<T: Serialize>(value: &T) -> Result<Value> {
    serde_json::to_value(value).map_err(|error| harness(error.to_string()))
}

/// Verification metadata sorts every key lexically by UTF-16. Product JSON
/// instead enumerates array-index keys first. Keep these identities separate.
fn metadata_json(value: &Value) -> Result<String> {
    match value {
        Value::Array(values) => Ok(format!(
            "[{}]",
            values
                .iter()
                .map(metadata_json)
                .collect::<Result<Vec<_>>>()?
                .join(",")
        )),
        Value::Object(values) => {
            let mut keys: Vec<_> = values.keys().collect();
            keys.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
            Ok(format!(
                "{{{}}}",
                keys.into_iter()
                    .map(|key| {
                        Ok(format!(
                            "{}:{}",
                            serde_json::to_string(key)?,
                            metadata_json(&values[key])?
                        ))
                    })
                    .collect::<Result<Vec<_>>>()?
                    .join(",")
            ))
        }
        _ => canonical(value),
    }
}

fn history_digest(history: &History) -> Result<String> {
    Ok(digest_bytes(
        metadata_json(&serialized(history)?)?.as_bytes(),
    ))
}

fn parse_history(bytes: &[u8]) -> Result<History> {
    if bytes.len() > MAX_HISTORY_BYTES {
        return Err(harness("portable history byte bound"));
    }
    let value: Value = serde_json::from_slice(bytes)
        .map_err(|error| harness(format!("closed history JSON: {error}")))?;
    let mut pending = vec![&value];
    while let Some(value) = pending.pop() {
        match value {
            Value::Number(number) => {
                if !number
                    .as_f64()
                    .is_some_and(|n| n.fract() == 0.0 && n.abs() <= 9_007_199_254_740_991.0)
                {
                    return Err(harness("trace JSON requires safe integer numbers"));
                }
            }
            Value::Array(values) => pending.extend(values),
            Value::Object(values) => pending.extend(values.values()),
            _ => {}
        }
    }
    // JSON number spelling is not a wire distinction. Normalize admitted 1.0
    // and 1e0 to 1 before serde decodes bounded integer fields, as JS does.
    let history: History = serde_json::from_str(&metadata_json(&value)?)
        .map_err(|error| harness(format!("closed history schema: {error}")))?;
    history.validate()?;
    Ok(history)
}

#[derive(Default)]
struct Normalizer {
    temps: BTreeMap<PathBuf, String>,
    inodes: BTreeMap<(u64, u64), String>,
}

impl Normalizer {
    fn path(&mut self, root: &Path, path: &Path) -> Result<String> {
        if path == root {
            return Ok(".".to_owned());
        }
        if let Ok(relative) = path.strip_prefix(root) {
            let mut normalized = PathBuf::new();
            let mut actual = root.to_path_buf();
            for component in relative.components() {
                let name = component
                    .as_os_str()
                    .to_str()
                    .ok_or_else(|| harness("non-UTF8 trace path"))?;
                actual.push(name);
                if let Some(suffix) = name.strip_prefix(".tmp-") {
                    if suffix.len() != 48 || !suffix.bytes().all(|b| b.is_ascii_hexdigit()) {
                        return Err(harness("unknown trace temporary path class"));
                    }
                    let next = self.temps.len();
                    let alias = self
                        .temps
                        .entry(actual.clone())
                        .or_insert_with(|| format!(".temp-{next}"));
                    normalized.push(alias);
                } else {
                    normalized.push(name);
                }
            }
            return normalized
                .to_str()
                .map(str::to_owned)
                .ok_or_else(|| harness("non-UTF8 trace relative path"));
        }
        if root.starts_with(path) {
            return Ok(format!(
                "@ancestor/{}",
                root.components().count() - path.components().count()
            ));
        }
        Err(harness("filesystem event escaped fixture root/ancestors"))
    }

    fn inode(&mut self, inode: Option<(u64, u64)>) -> Option<String> {
        inode.map(|identity| {
            let next = self.inodes.len();
            self.inodes
                .entry(identity)
                .or_insert_with(|| format!("i{next}"))
                .clone()
        })
    }
}

struct ActiveEvents {
    root: PathBuf,
    normalizer: Normalizer,
    events: Vec<Event>,
    fault: Option<Fault>,
    matched: u16,
    triggered: bool,
}

impl ActiveEvents {
    fn push(&mut self, event: Event) -> Result<()> {
        if self.events.len() >= MAX_EVENTS {
            return Err(harness("trace event bound exceeded"));
        }
        self.events.push(event);
        Ok(())
    }

    fn inject(&mut self, mode: &FaultMode) -> Result<()> {
        self.triggered = true;
        Err(Error::new(
            "IO_FAILED",
            match mode {
                FaultMode::Error => "trace injected error",
                FaultMode::Cancel => "trace injected cancellation",
            },
        ))
    }

    fn fs(&mut self, event: &durable_fs::Event) -> Result<()> {
        // Validate every checkpoint before admitting an observation. A new
        // production checkpoint needs an explicit schema/correspondence update.
        let step: FsStep = serde_json::from_value(json!(event.step))
            .map_err(|_| harness("unknown native filesystem checkpoint"))?;
        let phase: Phase = serde_json::from_value(json!(event.phase))
            .map_err(|_| harness("unknown native filesystem phase"))?;
        let mode = if let Some(Fault::Fs {
            step: wanted,
            phase: when,
            occurrence,
            mode,
        }) = &self.fault
        {
            if *wanted == step && *when == phase {
                self.matched = self
                    .matched
                    .checked_add(1)
                    .ok_or_else(|| harness("trace fault occurrence overflow"))?;
                (!self.triggered && self.matched == *occurrence).then(|| mode.clone())
            } else {
                None
            }
        } else {
            None
        };
        let path = self.normalizer.path(&self.root, &event.path)?;
        let target = event
            .target
            .as_ref()
            .map(|path| self.normalizer.path(&self.root, path))
            .transpose()?;
        let inode = self.normalizer.inode(event.inode);
        self.push(Event::Fs {
            step: event.step.to_owned(),
            phase: event.phase.to_owned(),
            path,
            target,
            inode,
        })?;
        if let Some(mode) = mode {
            self.inject(&mode)?;
        }
        Ok(())
    }

    fn application(&mut self, point: ApplicationPoint) -> Result<()> {
        let mode = match &self.fault {
            Some(Fault::Application {
                point: wanted,
                mode,
            }) if !self.triggered && *wanted == point => Some(mode.clone()),
            _ => None,
        };
        self.push(Event::Application { point })?;
        if let Some(mode) = mode {
            self.inject(&mode)?;
        }
        Ok(())
    }
}

#[derive(Clone)]
struct TraceAdmission(Arc<Mutex<ActiveEvents>>);

impl Admission for TraceAdmission {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        self.0
            .lock()
            .map_err(|_| harness("trace event mutex poisoned"))?
            .application(ApplicationPoint::Admitted)
    }
    fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
        Err(harness("trace fixture does not confer dispatch authority"))
    }
}

struct ReadAdmission;
impl Admission for ReadAdmission {
    fn admit_commit(&self, _: &CommitContext) -> Result<()> {
        Err(harness("audit observation attempted a mutation"))
    }
    fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
        Err(harness("audit observation attempted dispatch"))
    }
}

struct Driver {
    root: PathBuf,
    store: Store,
    mailboxes: MailboxService,
    configs: BTreeMap<u8, MailboxConfig>,
    revisions: [String; 2],
    memories: [String; 2],
    heads: BTreeMap<u16, (u8, String)>,
    targets: Vec<Target>,
    observation_targets: Vec<ObservationTarget>,
    events: Arc<Mutex<ActiveEvents>>,
    runtime: tokio::runtime::Runtime,
}

impl Driver {
    fn new(root: &Path, history: &History) -> Result<Self> {
        history.validate()?;
        let root = root.canonicalize()?;
        if fs::read_dir(&root)?.next().is_some() {
            return Err(harness(
                "trace fixture root must be an existing empty directory",
            ));
        }
        let mut store = Store::open(&root, true)?;
        let manifest = Manifest::parse(&json!({
            "contract":"algal.organism.v1", "key":"organism:custody-fixture", "name":"Custody fixture",
            "cells":[{"id":"output","kind":"const","outputs":{"value":{"type":"json","value":"ok"}}}], "edges":[],
        }))?;
        let manifest = store.admit(&manifest)?;
        let record = store.put("values", &json!({"contract":"algal.custody.fixture.v1"}))?;
        let memories = [
            store.put(
                "values",
                &json!({"contract":"algal.memory.fixture.v1","facts":[]}),
            )?,
            store.put(
                "values",
                &json!({"contract":"algal.memory.fixture.v1","facts":["changed"]}),
            )?,
        ];
        let revisions = [0, 1].map(|app| {
            store.put("values", &json!({
                "contract":"algal.application-revision.v1","application":app_name(app),"parent":null,
                "schema":record,"queries":record,"views":record,"runtimeProfile":record,"evaluationPolicy":record,
                "capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":record,
                    "maxGenerations":1,"capabilities":[],"queries":[record]}],
            }))
        });
        let [first, second] = revisions;
        let (targets, observation_targets) = inventory(history)?;
        Ok(Self {
            root: root.clone(),
            store,
            mailboxes: MailboxService::open(&root),
            configs: BTreeMap::new(),
            revisions: [first?, second?],
            memories,
            heads: BTreeMap::new(),
            targets,
            observation_targets,
            events: Arc::new(Mutex::new(ActiveEvents {
                root,
                normalizer: Normalizer::default(),
                events: Vec::new(),
                fault: None,
                matched: 0,
                triggered: false,
            })),
            runtime: tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()?,
        })
    }

    fn authority(&self, r#box: u8, right: &Right) -> Result<String> {
        let config = self
            .configs
            .get(&r#box)
            .ok_or_else(|| harness("trace references an unresolved mailbox authority"))?;
        Ok(match right {
            Right::Send => &config.send,
            Right::Receive => &config.receive,
        }
        .clone())
    }

    fn authorities(&self) -> Vec<Authority> {
        let mut authorities = Vec::new();
        for (r#box, config) in &self.configs {
            authorities.push(Authority {
                alias: format!("box{box}:send"),
                handle: config.send.clone(),
            });
            authorities.push(Authority {
                alias: format!("box{box}:receive"),
                handle: config.receive.clone(),
            });
        }
        authorities.sort_by(|a, b| a.alias.cmp(&b.alias));
        authorities
    }

    fn outcome(&self, result: Result<Value>) -> Result<Outcome> {
        match result {
            Ok(value) => Ok(Outcome::Ok { value }),
            Err(error) if error.code == "TRACE_HARNESS_FAILED" => Err(error),
            Err(error) => {
                let authorities = self.authorities();
                let wake = error
                    .wake
                    .iter()
                    .map(|handle| {
                        authorities
                            .iter()
                            .find(|authority| authority.handle == *handle)
                            .map(|authority| authority.alias.clone())
                            .ok_or_else(|| harness("API returned an unrecognized wake authority"))
                    })
                    .collect::<Result<Vec<_>>>()?;
                Ok(Outcome::Error {
                    code: error.code,
                    message: error.message,
                    wake,
                    uncertain: error.uncertain,
                })
            }
        }
    }

    fn target_path(&self, target: &Target) -> Result<PathBuf> {
        let relative = match target {
            Target::Value { value } => format!("values/{}.json", &digest(value)?[7..]),
            Target::Effect { key } => format!(
                "effects/{}.json",
                &Store::effect_key(&key_digest(*key)?, "trace.v1")?[7..]
            ),
            Target::Slot { key } => format!("slots/trace-slot-{key}.json"),
            Target::MailboxPending { r#box, key }
            | Target::MailboxConsumed { r#box, key }
            | Target::MailboxMessage { r#box, key } => {
                let directory = match target {
                    Target::MailboxPending { .. } => "pending",
                    Target::MailboxConsumed { .. } => "consumed",
                    _ => "messages",
                };
                format!(
                    "mailboxes/{}/{directory}/{}.json",
                    box_name(*r#box),
                    &key_digest(*key)?[7..]
                )
            }
            Target::MailboxLock { r#box } => format!("mailboxes/{}/.lock", box_name(*r#box)),
            Target::ApplicationHead { app } => format!("applications/{}/head.json", app_name(*app)),
            Target::ApplicationMemory { memory } => {
                format!("values/{}.json", &self.memories[usize::from(*memory)][7..])
            }
        };
        Ok(self.root.join(relative))
    }

    fn snapshot(&self) -> Result<Snapshot> {
        // Fresh services ensure observation cannot be satisfied by a previous
        // successful put cached in the writer after hostile file tampering.
        let store = Store::open(&self.root, false)?;
        let applications = Service::new(&self.root, &ReadAdmission)?;
        let mut observations = Vec::new();
        for target in &self.observation_targets {
            let result = match target {
                ObservationTarget::Value { value } => {
                    store.get("values", &digest(value)?).map(found)
                }
                ObservationTarget::Effect { key } => {
                    store.get_effect(&key_digest(*key)?, "trace.v1").map(found)
                }
                ObservationTarget::Slot { key } => {
                    store.get_slot(&format!("trace-slot-{key}")).map(found)
                }
                ObservationTarget::MailboxConfig { r#box } => self
                    .mailboxes
                    .inspect(&box_name(*r#box))
                    .map(|config| found(config.map(|config| config_value(*r#box, &config)))),
                ObservationTarget::ApplicationHistory { app } => applications
                    .history(&app_name(*app))
                    .map(|history| json!(history.iter().map(projection).collect::<Vec<_>>())),
                _ => {
                    let target: Target = serde_json::from_value(serialized(target)?)
                        .map_err(|error| harness(error.to_string()))?;
                    read_optional(&self.target_path(&target)?)
                        .and_then(|bytes| {
                            bytes
                                .map(|bytes| serde_json::from_slice(&bytes).map_err(Error::from))
                                .transpose()
                        })
                        .map(found)
                }
            };
            observations.push(Observation {
                target: target.clone(),
                outcome: self.outcome(result)?,
            });
        }
        let files = self
            .targets
            .iter()
            .map(|target| {
                let bytes = read_optional(&self.target_path(target)?)?;
                Ok(FileObservation {
                    target: target.clone(),
                    exists: bytes.is_some(),
                    bytes: bytes.as_ref().map_or(0, Vec::len),
                    sha256: bytes.as_ref().map(|bytes| digest_bytes(bytes)),
                })
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(Snapshot {
            observations,
            files,
        })
    }

    fn memory(&self, memory: &Value) -> Result<String> {
        match memory.as_u64() {
            Some(0 | 1) => Ok(self.memories[memory.as_u64().unwrap() as usize].clone()),
            _ => digest(&json!(["trace-missing"])),
        }
    }

    fn application(
        &mut self,
        command: &Command,
        app: u8,
        key: u8,
        memory: &Value,
        head: &Value,
        create: bool,
    ) -> Result<Value> {
        let head = if head.is_null() {
            Value::Null
        } else if let Some(id) = head.as_u64() {
            let (owner, digest) = self.heads.get(&(id as u16)).ok_or_else(|| {
                harness("trace references a failed or unresolved application head")
            })?;
            if *owner != app {
                return Err(harness(
                    "trace head reference belongs to a different application",
                ));
            }
            json!(digest)
        } else {
            json!(digest(&json!(["trace-missing"]))?)
        };
        let input = json!({
            "application":app_name(app),"operation":key_digest(key)?,"kind":if create {"create"} else {"memory"},
            "expectedHead":head,"revision":self.revisions[usize::from(app)],"memory":self.memory(memory)?,
            "intents":[],"evidence":[],"causedBy":null,
        });
        let admission = TraceAdmission(self.events.clone());
        let selected = || {
            self.events
                .lock()
                .map_err(|_| harness("trace event mutex poisoned"))?
                .application(ApplicationPoint::Selected)
        };
        let boundary = |point| {
            let point = match point {
                "prepared" => ApplicationPoint::Prepared,
                "head-published" => ApplicationPoint::HeadPublished,
                _ => return Err(harness("unknown application trace checkpoint")),
            };
            self.events
                .lock()
                .map_err(|_| harness("trace event mutex poisoned"))?
                .application(point)
        };
        let mut service = Service::new(&self.root, &admission)?
            .with_custody_hook(&selected)
            .with_fault_hook(&boundary);
        let snapshot = if create {
            self.runtime.block_on(service.create(&input))?
        } else {
            self.runtime.block_on(service.commit(&input))?
        };
        self.heads
            .insert(command.id, (app, snapshot.digest.clone()));
        Ok(projection(&snapshot))
    }

    fn execute(&mut self, command: &Command) -> Result<Value> {
        match &command.action {
            Action::StorePut { value } => self.store.put("values", value).map(Value::String),
            Action::StoreGet { value } => self.store.get("values", &digest(value)?).map(found),
            Action::EffectPut { key, value } => self
                .store
                .put_effect(
                    &json!({
                        "requestDigest":key_digest(*key)?,"executor":"trace.v1","output":value,
                    }),
                    "trace.v1",
                )
                .map(Value::String),
            Action::EffectGet { key } => self
                .store
                .get_effect(&key_digest(*key)?, "trace.v1")
                .map(found),
            Action::SlotSet { key, value } => self
                .store
                .set_slot(&format!("trace-slot-{key}"), value)
                .map(|()| Value::Null),
            Action::SlotGet { key } => self.store.get_slot(&format!("trace-slot-{key}")).map(found),
            Action::MailboxCreate { r#box, capacity } => {
                let config =
                    self.mailboxes
                        .create(&box_name(*r#box), usize::from(*capacity), 256)?;
                let value = config_value(*r#box, &config);
                self.configs.insert(*r#box, config);
                Ok(value)
            }
            Action::MailboxSend { r#box, key, value } => self.mailboxes.send(
                &self.authority(*r#box, &Right::Send)?,
                value.clone(),
                &key_digest(*key)?,
            ),
            Action::MailboxReceive { r#box } => self
                .mailboxes
                .receive(&self.authority(*r#box, &Right::Receive)?),
            Action::MailboxPending { r#box } => self
                .mailboxes
                .has_pending(&self.authority(*r#box, &Right::Receive)?)
                .map(Value::Bool),
            Action::MailboxRevoke { r#box, right } => self
                .mailboxes
                .revoke(&self.authority(*r#box, right)?)
                .map(|()| Value::Null),
            Action::ApplicationCreate { app, key, memory } => {
                self.application(command, *app, *key, memory, &Value::Null, true)
            }
            Action::ApplicationCommit {
                app,
                key,
                memory,
                head,
            } => self.application(command, *app, *key, memory, head, false),
            Action::ApplicationInspect { app } => {
                let history = Service::new(&self.root, &ReadAdmission)?.history(&app_name(*app))?;
                if let Some(snapshot) = history.last() {
                    self.heads
                        .insert(command.id, (*app, snapshot.digest.clone()));
                    Ok(projection(snapshot))
                } else {
                    Ok(Value::Null)
                }
            }
            Action::Restart {} => {
                self.store = Store::open(&self.root, true)?;
                self.mailboxes = MailboxService::open(&self.root);
                // Retained aliases remain identities; do not create or repair.
                Ok(Value::Null)
            }
            Action::Tamper { target, mode } => {
                let path = self.target_path(target)?;
                match mode {
                    TamperMode::Corrupt => {
                        let parent = path
                            .parent()
                            .ok_or_else(|| harness("trace target parent"))?;
                        let metadata = fs::symlink_metadata(parent).map_err(|_| {
                            harness("trace corruption requires an existing parent directory")
                        })?;
                        if !metadata.is_dir() || metadata.file_type().is_symlink() {
                            return Err(harness(
                                "trace corruption parent must be a real directory",
                            ));
                        }
                        fs::write(path, b"{broken")?;
                    }
                    TamperMode::Remove => match fs::remove_file(path) {
                        Ok(()) => {}
                        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                        Err(error) => return Err(error.into()),
                    },
                }
                Ok(Value::Null)
            }
        }
    }

    fn step(&mut self, command: &Command) -> Result<Step> {
        {
            let mut events = self
                .events
                .lock()
                .map_err(|_| harness("trace event mutex poisoned"))?;
            events.events.clear();
            events.fault = command.fault.clone();
            events.matched = 0;
            events.triggered = false;
        }
        let observed = self.events.clone();
        // Keep the thread-local probe installed for the entire synchronous
        // call or current-thread block_on. Installing it around future creation
        // would miss the actual filesystem calls during polling.
        let result = durable_fs::with_probe(
            Rc::new(move |event| {
                observed
                    .lock()
                    .map_err(|_| harness("trace event mutex poisoned"))?
                    .fs(event)
            }),
            || self.execute(command),
        );
        let outcome = self.outcome(result)?;
        let (events, fault_triggered) = {
            let mut active = self
                .events
                .lock()
                .map_err(|_| harness("trace event mutex poisoned"))?;
            (std::mem::take(&mut active.events), active.triggered)
        };
        if command.fault.is_some() && !fault_triggered {
            return Err(harness("requested trace fault was not reached"));
        }
        let after = self.snapshot()?;
        Ok(Step {
            id: command.id,
            outcome,
            events,
            fault_triggered,
            after,
        })
    }
}

fn config_value(r#box: u8, config: &MailboxConfig) -> Value {
    json!({"name":config.name,"capacity":config.max_messages,
        "send":format!("box{box}:send"),"receive":format!("box{box}:receive")})
}

fn inventory(history: &History) -> Result<(Vec<Target>, Vec<ObservationTarget>)> {
    let mut targets: Vec<_> = baseline_values()
        .into_iter()
        .map(|value| Target::Value { value })
        .collect();
    for command in &history.commands {
        match &command.action {
            Action::StorePut { value }
            | Action::StoreGet { value }
            | Action::Tamper {
                target: Target::Value { value },
                ..
            } => targets.push(Target::Value {
                value: value.clone(),
            }),
            _ => {}
        }
    }
    for key in 0..4 {
        targets.push(Target::Effect { key });
        targets.push(Target::Slot { key });
        for r#box in 0..2 {
            targets.push(Target::MailboxPending { r#box, key });
            targets.push(Target::MailboxConsumed { r#box, key });
            targets.push(Target::MailboxMessage { r#box, key });
        }
    }
    for number in 0..2 {
        targets.push(Target::MailboxLock { r#box: number });
        targets.push(Target::ApplicationHead { app: number });
        targets.push(Target::ApplicationMemory { memory: number });
    }
    let mut sorted = BTreeMap::new();
    for target in targets {
        sorted.insert(metadata_json(&serialized(&target)?)?, target);
    }
    let mut ordered: Vec<_> = sorted.into_iter().collect();
    ordered.sort_by(|(a, _), (b, _)| a.encode_utf16().cmp(b.encode_utf16()));
    let targets: Vec<_> = ordered.into_iter().map(|(_, target)| target).collect();
    let mut observations: BTreeMap<_, _> = targets
        .iter()
        .map(|target| {
            let value = serialized(target)?;
            Ok((
                metadata_json(&value)?,
                serde_json::from_value(value).map_err(|error| harness(error.to_string()))?,
            ))
        })
        .collect::<Result<_>>()?;
    for number in 0..2 {
        for target in [
            ObservationTarget::MailboxConfig { r#box: number },
            ObservationTarget::ApplicationHistory { app: number },
        ] {
            observations.insert(metadata_json(&serialized(&target)?)?, target);
        }
    }
    let mut observations: Vec<_> = observations.into_iter().collect();
    observations.sort_by(|(a, _), (b, _)| a.encode_utf16().cmp(b.encode_utf16()));
    Ok((
        targets,
        observations.into_iter().map(|(_, target)| target).collect(),
    ))
}

fn baseline_values() -> [Value; 4] {
    [
        json!("red"),
        json!("blue"),
        Value::Null,
        json!({"__proto__":"own"}),
    ]
}

fn read_optional(path: &Path) -> Result<Option<Vec<u8>>> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() > MAX_FILE_BYTES as u64
    {
        return Err(harness("trace observation file type or byte bound"));
    }
    let mut bytes = Vec::new();
    fs::File::open(path)?
        .take(MAX_FILE_BYTES as u64 + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() > MAX_FILE_BYTES || bytes.len() as u64 != metadata.len() {
        return Err(harness("trace observation changed while reading"));
    }
    Ok(Some(bytes))
}

fn replay(history: &History, root: &Path) -> Result<Trace> {
    let mut driver = Driver::new(root, history)?;
    let initial = driver.snapshot()?;
    let steps = history
        .commands
        .iter()
        .map(|command| driver.step(command))
        .collect::<Result<Vec<_>>>()?;
    Ok(Trace {
        contract: "algal.verification-trace.v1",
        runtime: "native",
        history_digest: history_digest(history)?,
        initial,
        steps,
        authorities: driver.authorities(),
    })
}

#[test]
#[ignore = "explicitly invoked owned native trace fixture; requires input/output/root paths"]
fn replay_portable_history() {
    let input = std::env::var_os("ALGAL_TRACE_INPUT")
        .map(PathBuf::from)
        .expect("ALGAL_TRACE_INPUT");
    let output = std::env::var_os("ALGAL_TRACE_OUTPUT")
        .map(PathBuf::from)
        .expect("ALGAL_TRACE_OUTPUT");
    let root = std::env::var_os("ALGAL_TRACE_ROOT")
        .map(PathBuf::from)
        .expect("ALGAL_TRACE_ROOT");
    let mut bytes = Vec::new();
    fs::File::open(input)
        .unwrap()
        .take(MAX_HISTORY_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .unwrap();
    assert!(
        bytes.len() <= MAX_HISTORY_BYTES,
        "portable history byte bound"
    );
    let history = parse_history(&bytes).expect("closed history schema");
    let trace = replay(&history, &root).expect("native trace replay failed");
    let bytes = metadata_json(&serialized(&trace).unwrap()).unwrap();
    assert!(
        bytes.len() <= MAX_TRACE_BYTES,
        "native trace output byte bound"
    );
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(output)
        .unwrap()
        .write_all(bytes.as_bytes())
        .unwrap();
}

fn history(actions: Vec<Value>) -> History {
    History {
        contract: HISTORY_CONTRACT.to_owned(),
        seed: 0,
        commands: actions
            .into_iter()
            .enumerate()
            .map(|(id, action)| Command {
                id: id as u16,
                action: serde_json::from_value(action).unwrap(),
                fault: None,
            })
            .collect(),
    }
}

fn run_fixture(history: &History) -> (tempfile::TempDir, Trace) {
    let root = tempfile::tempdir().unwrap();
    let trace = replay(history, root.path()).unwrap();
    (root, trace)
}

fn ok(outcome: &Outcome) -> &Value {
    match outcome {
        Outcome::Ok { value } => value,
        other => panic!("expected exact success, observed {other:?}"),
    }
}

fn error(outcome: &Outcome, code: &str) {
    assert!(
        matches!(outcome, Outcome::Error { code: actual, .. } if actual == code),
        "expected {code}, observed {outcome:?}"
    );
}

fn observation<'a>(snapshot: &'a Snapshot, target: &Value) -> &'a Outcome {
    &snapshot
        .observations
        .iter()
        .find(|o| serialized(&o.target).unwrap() == *target)
        .unwrap()
        .outcome
}

#[test]
fn rejects_invalid_histories_and_unresolved_authority_without_api_fallback() {
    let normalized = parse_history(
        br#"{"contract":"algal.verification-history.v1","seed":1e0,"commands":[{"id":0.0,"action":{"kind":"slot-set","key":0e0,"value":1.0},"fault":null}]}"#,
    )
    .unwrap();
    assert_eq!(normalized.seed, 1);
    assert_eq!(
        serialized(&normalized.commands[0].action).unwrap(),
        json!({"kind":"slot-set","key":0,"value":1})
    );
    for number in ["0.5", "9007199254740992", "-9007199254740992", "1e100"] {
        let bytes = format!(
            r#"{{"contract":"algal.verification-history.v1","seed":0,"commands":[{{"id":0,"action":{{"kind":"store-put","value":{number}}},"fault":null}}]}}"#
        );
        assert!(parse_history(bytes.as_bytes()).is_err());
    }
    let admitted = json!({"contract":HISTORY_CONTRACT,"seed":0,"commands":[
        {"id":0,"action":{"kind":"restart"},"fault":null}
    ]});
    for mutated in [
        json!({"contract":HISTORY_CONTRACT,"seed":0,"commands":[{"id":0,"action":{"kind":"restart"}}]}),
        json!({"contract":HISTORY_CONTRACT,"seed":0,"commands":[{"id":0,"action":{"kind":"restart","unknown":true},"fault":null}]}),
        json!({"contract":HISTORY_CONTRACT,"seed":0,"commands":[],"unknown":true}),
    ] {
        assert!(serde_json::from_value::<History>(mutated).is_err());
    }
    assert!(
        serde_json::from_value::<History>(admitted)
            .unwrap()
            .validate()
            .is_ok()
    );
    for rejected in [
        history(vec![]),
        history(vec![json!({"kind":"store-put","value":0.5})]),
        history(vec![
            json!({"kind":"store-put","value":9_007_199_254_740_992_u64}),
        ]),
        history(vec![
            json!({"kind":"application-commit","app":0,"key":0,"memory":0,"head":0}),
        ]),
    ] {
        assert!(rejected.validate().is_err());
    }
    let root = tempfile::tempdir().unwrap();
    let unresolved = history(vec![
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"red"}),
    ]);
    assert_eq!(
        replay(&unresolved, root.path()).unwrap_err().code,
        "TRACE_HARNESS_FAILED"
    );
    let root = tempfile::tempdir().unwrap();
    let mut unreachable = history(vec![json!({"kind":"store-get","value":"red"})]);
    unreachable.commands[0].fault = Some(Fault::Fs {
        step: FsStep::Link,
        phase: Phase::Before,
        occurrence: 1,
        mode: FaultMode::Error,
    });
    assert_eq!(
        replay(&unreachable, root.path()).unwrap_err().code,
        "TRACE_HARNESS_FAILED"
    );
}

#[test]
fn exact_mailbox_outcomes_retain_consumed_evidence_and_authority() {
    let history = history(vec![
        json!({"kind":"mailbox-create","box":0,"capacity":1}),
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"red"}),
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"red"}),
        json!({"kind":"mailbox-send","box":0,"key":1,"value":"blue"}),
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"blue"}),
        json!({"kind":"mailbox-receive","box":0}),
        json!({"kind":"restart"}),
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"red"}),
        json!({"kind":"mailbox-receive","box":0}),
        json!({"kind":"mailbox-revoke","box":0,"right":"send"}),
        json!({"kind":"mailbox-send","box":0,"key":1,"value":"blue"}),
    ]);
    let (_, trace) = run_fixture(&history);
    let sent = ok(&trace.steps[1].outcome);
    assert_eq!(ok(&trace.steps[2].outcome), sent);
    error(&trace.steps[3].outcome, "MAILBOX_FULL");
    error(&trace.steps[4].outcome, "DIGEST_MISMATCH");
    assert_eq!(
        ok(&trace.steps[5].outcome),
        &json!({"id":sent["id"],"message":"red"})
    );
    assert_eq!(ok(&trace.steps[7].outcome), sent);
    error(&trace.steps[8].outcome, "EFFECT_SUSPENDED");
    match &trace.steps[8].outcome {
        Outcome::Error {
            wake, uncertain, ..
        } => {
            assert_eq!(wake, &vec!["box0:receive".to_owned()]);
            assert!(!uncertain);
        }
        _ => unreachable!(),
    }
    error(&trace.steps[10].outcome, "CAPABILITY_DENIED");
    let consumed = observation(
        &trace.steps[7].after,
        &json!({"kind":"mailbox-consumed","box":0,"key":0}),
    );
    assert_eq!(ok(consumed)["found"], true);
    assert_eq!(trace.authorities.len(), 2);
}

#[test]
fn failed_receive_preserves_both_delivery_markers_without_implicit_reconciliation() {
    let mut history = history(vec![
        json!({"kind":"mailbox-create","box":0,"capacity":2}),
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"red"}),
        json!({"kind":"mailbox-receive","box":0}),
        json!({"kind":"restart"}),
        json!({"kind":"mailbox-pending","box":0}),
        json!({"kind":"mailbox-send","box":0,"key":0,"value":"red"}),
    ]);
    history.commands[2].fault = Some(Fault::Fs {
        step: FsStep::UnlinkPending,
        phase: Phase::Before,
        occurrence: 1,
        mode: FaultMode::Cancel,
    });
    let (_, trace) = run_fixture(&history);
    for id in [2, 4, 5] {
        error(&trace.steps[id].outcome, "IO_FAILED");
    }
    assert!(trace.steps[2].fault_triggered);
    for kind in ["mailbox-pending", "mailbox-consumed"] {
        let target = json!({"kind":kind,"box":0,"key":0});
        let retained = observation(&trace.steps[2].after, &target);
        assert_eq!(ok(retained)["found"], true);
        assert_eq!(
            serialized(retained).unwrap(),
            serialized(observation(&trace.steps[5].after, &target)).unwrap()
        );
    }
}

#[test]
fn after_link_error_records_real_visible_publication_without_promising_acknowledgment() {
    let mut history = history(vec![
        json!({"kind":"store-put","value":"red"}),
        json!({"kind":"restart"}),
        json!({"kind":"store-get","value":"red"}),
    ]);
    history.commands[0].fault = Some(Fault::Fs {
        step: FsStep::Link,
        phase: Phase::After,
        occurrence: 1,
        mode: FaultMode::Error,
    });
    let (_, trace) = run_fixture(&history);
    error(&trace.steps[0].outcome, "IO_FAILED");
    assert!(trace.steps[0].fault_triggered);
    assert_eq!(
        ok(observation(
            &trace.steps[0].after,
            &json!({"kind":"value","value":"red"})
        )),
        &found(Some(json!("red")))
    );
    assert_eq!(ok(&trace.steps[2].outcome), &found(Some(json!("red"))));
    // A low-level Store error does not set the host dispatch uncertainty flag.
    // The independent checkpoint/files evidence still records possible effect.
    assert!(matches!(
        &trace.steps[0].outcome,
        Outcome::Error {
            uncertain: false,
            ..
        }
    ));
}

#[test]
fn stale_application_writers_exact_retries_and_conflicting_retries_are_distinct() {
    let history = history(vec![
        json!({"kind":"application-create","app":0,"key":0,"memory":0}),
        json!({"kind":"application-commit","app":0,"key":1,"memory":1,"head":0}),
        json!({"kind":"application-commit","app":0,"key":2,"memory":0,"head":0}),
        json!({"kind":"restart"}),
        json!({"kind":"application-commit","app":0,"key":1,"memory":1,"head":0}),
        json!({"kind":"application-commit","app":0,"key":1,"memory":0,"head":1}),
        json!({"kind":"application-commit","app":0,"key":3,"memory":"missing","head":1}),
        json!({"kind":"application-inspect","app":0}),
    ]);
    let (_, trace) = run_fixture(&history);
    let first = ok(&trace.steps[0].outcome);
    let second = ok(&trace.steps[1].outcome);
    assert_eq!(first["sequence"], 0);
    assert_eq!(second["sequence"], 1);
    assert_eq!(second["previous"], first["digest"]);
    assert_eq!(ok(&trace.steps[4].outcome), second);
    error(&trace.steps[2].outcome, "RECEIPT_MISMATCH");
    error(&trace.steps[5].outcome, "RECEIPT_MISMATCH");
    error(&trace.steps[6].outcome, "PARSE_FAILED");
    assert_eq!(ok(&trace.steps[7].outcome), second);
}

#[test]
fn every_application_checkpoint_has_distinct_persisted_failure_observation() {
    for point in [
        ApplicationPoint::Selected,
        ApplicationPoint::Admitted,
        ApplicationPoint::Prepared,
        ApplicationPoint::HeadPublished,
    ] {
        let mut history = history(vec![
            json!({"kind":"application-create","app":0,"key":0,"memory":0}),
        ]);
        history.commands[0].fault = Some(Fault::Application {
            point: point.clone(),
            mode: FaultMode::Error,
        });
        let (_, trace) = run_fixture(&history);
        assert!(trace.steps[0].fault_triggered);
        error(&trace.steps[0].outcome, "IO_FAILED");
        let committed = point == ApplicationPoint::HeadPublished;
        assert_eq!(
            ok(observation(
                &trace.steps[0].after,
                &json!({"kind":"application-history","app":0})
            ))
            .as_array()
            .unwrap()
            .len(),
            usize::from(committed)
        );
        assert!(
            matches!(&trace.steps[0].outcome, Outcome::Error { uncertain, .. } if *uncertain == committed)
        );
    }
}

#[test]
fn persistent_store_commands_admit_retained_files_even_after_prior_cache_fill() {
    for (source, corrupt) in [
        (
            include_str!("../tests/fixtures/verification_trace/retained-cache-corruption.json"),
            true,
        ),
        (
            include_str!("../tests/fixtures/verification_trace/retained-cache-removal.json"),
            false,
        ),
    ] {
        let history: History = serde_json::from_str(source).unwrap();
        let (_, trace) = run_fixture(&history);
        for id in [2, 4, 7, 9] {
            if corrupt {
                error(&trace.steps[id].outcome, "PARSE_FAILED");
            } else {
                assert_eq!(ok(&trace.steps[id].outcome), &found(None));
            }
        }
    }
}

#[derive(Default)]
struct Reference {
    values: BTreeMap<String, Value>,
    effects: BTreeMap<u8, Value>,
    slots: BTreeMap<u8, Value>,
    capacity: usize,
    messages: BTreeMap<u8, (Value, String, bool)>,
    app: Vec<Value>,
    operations: BTreeMap<u8, (Value, Value)>,
    head_steps: BTreeMap<u16, String>,
}

enum Expected {
    Value(Value),
    Error(&'static str, Vec<String>),
    Application {
        previous: Value,
        sequence: usize,
        operation: String,
        memory: String,
        request: Value,
        key: u8,
    },
}

impl Reference {
    fn expectation(&mut self, command: &Command, memories: &[String; 2]) -> Expected {
        match &command.action {
            Action::StorePut { value } => {
                let key = digest(value).unwrap();
                self.values.insert(key.clone(), value.clone());
                Expected::Value(json!(key))
            }
            Action::StoreGet { value } => {
                Expected::Value(found(self.values.get(&digest(value).unwrap()).cloned()))
            }
            Action::EffectPut { key, value } => {
                self.effects.entry(*key).or_insert_with(|| json!({"requestDigest":key_digest(*key).unwrap(),"executor":"trace.v1","output":value}));
                Expected::Value(json!(key_digest(*key).unwrap()))
            }
            Action::EffectGet { key } => Expected::Value(found(self.effects.get(key).cloned())),
            Action::SlotSet { key, value } => {
                self.slots.insert(*key, value.clone());
                Expected::Value(Value::Null)
            }
            Action::SlotGet { key } => Expected::Value(found(self.slots.get(key).cloned())),
            Action::MailboxCreate { r#box: 0, capacity } => {
                self.capacity = usize::from(*capacity);
                Expected::Value(
                    json!({"name":"trace-box-0","capacity":capacity,"send":"box0:send","receive":"box0:receive"}),
                )
            }
            Action::MailboxSend {
                r#box: 0,
                key,
                value,
            } => {
                if let Some((old, id, _)) = self.messages.get(key) {
                    return if old == value {
                        Expected::Value(json!({"id":id}))
                    } else {
                        Expected::Error("DIGEST_MISMATCH", Vec::new())
                    };
                }
                if self
                    .messages
                    .values()
                    .filter(|(_, _, consumed)| !consumed)
                    .count()
                    >= self.capacity
                {
                    return Expected::Error("MAILBOX_FULL", Vec::new());
                }
                let id = digest(
                    &json!({"contract":"algal.mailbox-message.v1","mailbox":"trace-box-0",
                    "idempotencyKey":key_digest(*key).unwrap(),"value":value}),
                )
                .unwrap();
                self.messages
                    .insert(*key, (value.clone(), id.clone(), false));
                Expected::Value(json!({"id":id}))
            }
            Action::MailboxReceive { r#box: 0 } => {
                // The ABI chooses the smallest idempotency digest filename,
                // not insertion order and not the message payload digest.
                let selected = self
                    .messages
                    .iter()
                    .filter(|(_, (_, _, consumed))| !consumed)
                    .map(|(key, _)| (*key, key_digest(*key).unwrap()))
                    .min_by(|a, b| a.1.cmp(&b.1));
                match selected {
                    Some((key, _)) => {
                        let (value, id, consumed) = self.messages.get_mut(&key).unwrap();
                        *consumed = true;
                        Expected::Value(json!({"id":id,"message":value}))
                    }
                    None => Expected::Error("EFFECT_SUSPENDED", vec!["box0:receive".to_owned()]),
                }
            }
            Action::MailboxPending { r#box: 0 } => Expected::Value(json!(
                self.messages.values().any(|(_, _, consumed)| !consumed)
            )),
            Action::ApplicationCreate {
                app: 0,
                key,
                memory,
            }
            | Action::ApplicationCommit {
                app: 0,
                key,
                memory,
                ..
            } => {
                let head = match &command.action {
                    Action::ApplicationCommit { head, .. } => {
                        if let Some(step) = head.as_u64() {
                            json!(self.head_steps[&(step as u16)])
                        } else if head.is_null() {
                            Value::Null
                        } else {
                            json!(digest(&json!(["trace-missing"])).unwrap())
                        }
                    }
                    _ => Value::Null,
                };
                let create = matches!(command.action, Action::ApplicationCreate { .. });
                let request = json!({"create":create,"head":head,"memory":memory});
                if let Some((old, snapshot)) = self.operations.get(key) {
                    return if old == &request {
                        Expected::Value(snapshot.clone())
                    } else {
                        Expected::Error("RECEIPT_MISMATCH", Vec::new())
                    };
                }
                let previous = self
                    .app
                    .last()
                    .map_or(Value::Null, |head| head["digest"].clone());
                if head != previous {
                    return Expected::Error("RECEIPT_MISMATCH", Vec::new());
                }
                if memory == "missing" {
                    return Expected::Error("PARSE_FAILED", Vec::new());
                }
                Expected::Application {
                    previous,
                    sequence: self.app.len(),
                    operation: key_digest(*key).unwrap(),
                    memory: memories[memory.as_u64().unwrap() as usize].clone(),
                    request,
                    key: *key,
                }
            }
            Action::ApplicationInspect { app: 0 } => {
                Expected::Value(self.app.last().cloned().unwrap_or(Value::Null))
            }
            Action::Restart {} => Expected::Value(Value::Null),
            _ => panic!("unmodeled generator action: {:?}", command.action),
        }
    }

    fn check(
        &mut self,
        command: &Command,
        step: &Step,
        expected: Expected,
    ) -> std::result::Result<(), String> {
        match expected {
            Expected::Value(wanted) => {
                if !matches!(&step.outcome, Outcome::Ok { value } if *value == wanted) {
                    return Err(format!(
                        "exact-result: expected {wanted}, got {:?}",
                        step.outcome
                    ));
                }
            }
            Expected::Error(code, wake) => {
                if !matches!(&step.outcome, Outcome::Error { code: actual, wake: actual_wake, uncertain: false, .. } if actual == code && *actual_wake == wake)
                {
                    return Err(format!(
                        "exact-error: expected {code}/{wake:?}/certain, got {:?}",
                        step.outcome
                    ));
                }
            }
            Expected::Application {
                previous,
                sequence,
                operation,
                memory,
                request,
                key,
            } => {
                let Outcome::Ok { value } = &step.outcome else {
                    return Err(format!("application-extension: {:?}", step.outcome));
                };
                if value["previous"] != previous
                    || value["sequence"] != sequence
                    || value["operation"] != operation
                    || value["memory"] != memory
                {
                    return Err(format!(
                        "application-extension: unexpected projection {value}"
                    ));
                }
                crate::canonical::check_digest(value["digest"].as_str().unwrap_or_default())
                    .map_err(|e| format!("application-extension: {e}"))?;
                self.app.push(value.clone());
                self.operations.insert(key, (request, value.clone()));
            }
        }
        if matches!(
            command.action,
            Action::ApplicationCreate { .. }
                | Action::ApplicationCommit { .. }
                | Action::ApplicationInspect { .. }
        ) && let Outcome::Ok { value } = &step.outcome
            && let Some(digest) = value.get("digest").and_then(Value::as_str)
        {
            self.head_steps.insert(command.id, digest.to_owned());
        }
        for value in baseline_values() {
            let expected = found(self.values.get(&digest(&value).unwrap()).cloned());
            if !matches!(observation(&step.after, &json!({"kind":"value","value":value})), Outcome::Ok { value } if *value == expected)
            {
                return Err("persisted-cas: cold value differs from acknowledged writes".to_owned());
            }
        }
        for key in 0..4 {
            for (kind, expected) in [
                ("effect", found(self.effects.get(&key).cloned())),
                ("slot", found(self.slots.get(&key).cloned())),
            ] {
                if !matches!(observation(&step.after, &json!({"kind":kind,"key":key})), Outcome::Ok { value } if *value == expected)
                {
                    return Err(format!("persisted-{kind}: cold value differs from model"));
                }
            }
            for kind in ["mailbox-pending", "mailbox-consumed", "mailbox-message"] {
                let message = self.messages.get(&key);
                let expected = message.and_then(|(value, id, consumed)| match kind {
                    "mailbox-message" => Some(json!({"contract":"algal.mailbox-message.v1","id":id,"mailbox":"trace-box-0","idempotencyKey":key_digest(key).unwrap(),"value":value})),
                    "mailbox-pending" if !consumed => Some(json!({"contract":"algal.mailbox-delivery.v1","id":id})),
                    "mailbox-consumed" if *consumed => Some(json!({"contract":"algal.mailbox-delivery.v1","id":id})),
                    _ => None,
                });
                if !matches!(observation(&step.after, &json!({"kind":kind,"box":0,"key":key})), Outcome::Ok { value } if *value == found(expected.clone()))
                {
                    return Err(format!(
                        "persisted-mailbox: {kind}/{key} differs from delivery history"
                    ));
                }
            }
        }
        if !matches!(observation(&step.after, &json!({"kind":"application-history","app":0})), Outcome::Ok { value } if *value == json!(self.app))
        {
            return Err(
                "persisted-application: cold history differs from acknowledged chain".to_owned(),
            );
        }
        Ok(())
    }
}

fn generated_action(tc: &hegel::TestCase, reference: &Reference, commands: &[Command]) -> Action {
    use hegel::generators as gs;
    let key = || tc.draw_named("key", gs::integers::<u8>().max_value(3));
    let value =
        || baseline_values()[tc.draw_named("value", gs::integers::<usize>().max_value(3))].clone();
    match tc.draw_named("command", gs::integers::<u8>().max_value(11)) {
        0 => {
            let values: Vec<_> = reference.values.values().collect();
            Action::StoreGet {
                value: values[tc.draw_named(
                    "stored",
                    gs::integers::<usize>().max_value(values.len() - 1),
                )]
                .clone(),
            }
        }
        1 => Action::StorePut { value: value() },
        2 => Action::EffectPut {
            key: key(),
            value: value(),
        },
        3 => Action::EffectGet { key: key() },
        4 => Action::SlotSet {
            key: key(),
            value: value(),
        },
        5 => Action::SlotGet { key: key() },
        6 => Action::MailboxSend {
            r#box: 0,
            key: key(),
            value: value(),
        },
        7 => Action::MailboxReceive { r#box: 0 },
        8 => Action::MailboxPending { r#box: 0 },
        9 => {
            if tc.draw_named("retry", gs::booleans()) {
                let accepted: Vec<_> = commands
                    .iter()
                    .filter(|command| {
                        reference.head_steps.contains_key(&command.id)
                            && matches!(
                                command.action,
                                Action::ApplicationCreate { .. } | Action::ApplicationCommit { .. }
                            )
                    })
                    .collect();
                return accepted[tc.draw_named(
                    "accepted-operation",
                    gs::integers::<usize>().max_value(accepted.len() - 1),
                )]
                .action
                .clone();
            }
            let current = reference.app.last().unwrap()["digest"].as_str().unwrap();
            let valid: Vec<_> = reference
                .head_steps
                .iter()
                .filter(|(_, head)| head.as_str() == current)
                .map(|(step, _)| *step)
                .collect();
            let head = if tc.draw_named("stale", gs::integers::<u8>().max_value(3)) == 0 {
                json!(*reference.head_steps.keys().next().unwrap())
            } else {
                json!(
                    valid[tc.draw_named(
                        "current-head",
                        gs::integers::<usize>().max_value(valid.len() - 1)
                    )]
                )
            };
            Action::ApplicationCommit {
                app: 0,
                key: tc.draw_named(
                    "operation-key",
                    gs::integers::<u8>().min_value(1).max_value(3),
                ),
                head,
                memory: if tc.draw_named("missing-memory", gs::integers::<u8>().max_value(5)) == 0 {
                    json!("missing")
                } else {
                    json!(tc.draw_named("memory", gs::integers::<u8>().max_value(1)))
                },
            }
        }
        10 => Action::ApplicationInspect { app: 0 },
        _ => Action::Restart {},
    }
}

struct PortableFailure {
    directory: tempfile::TempDir,
    history: History,
    trace: Trace,
    property: String,
}

fn fail_property(failure: PortableFailure) -> ! {
    // Hegel 0.46.1 keys a failure by its panic source location. Keep different
    // semantic predicates at distinct locations, so shrinking one failure
    // cannot silently switch to another violated property at a common assert.
    // The structured final payload carries the actual concrete shrunk history.
    match failure.property.split(':').next().unwrap_or_default() {
        "exact-result" => std::panic::panic_any(failure),
        "exact-error" => std::panic::panic_any(failure),
        "application-extension" => std::panic::panic_any(failure),
        "persisted-cas" => std::panic::panic_any(failure),
        "persisted-effect" => std::panic::panic_any(failure),
        "persisted-slot" => std::panic::panic_any(failure),
        "persisted-mailbox" => std::panic::panic_any(failure),
        "persisted-application" => std::panic::panic_any(failure),
        "native-harness" => std::panic::panic_any(failure),
        "negative-control.effect-last-wins" => std::panic::panic_any(failure),
        _ => panic!("unregistered native trace property {}", failure.property),
    }
}

fn retain_failure(failure: PortableFailure) -> ! {
    let directory = failure.directory.keep();
    let history = metadata_json(&serialized(&failure.history).unwrap()).unwrap();
    let trace = metadata_json(&serialized(&failure.trace).unwrap()).unwrap();
    fs::write(directory.join("portable-history.json"), history).unwrap();
    fs::write(directory.join("observed-trace.json"), trace).unwrap();
    fs::write(
        directory.join("failure.json"),
        canonical(&json!({
            "property":failure.property,"hegel":"0.46.1","engine":"0.43.1","seed":NATIVE_SEED,
        }))
        .unwrap(),
    )
    .unwrap();
    panic!(
        "native stateful failure retained at {}: {}",
        directory.display(),
        failure.property
    );
}

const NATIVE_SEED: u32 = 0x416c_6761;

#[test]
fn sixty_four_state_dependent_native_histories_preserve_exact_semantics() {
    use hegel::{HealthCheck, Hegel, Phase as HegelPhase, Settings, generators as gs};
    use std::panic::{AssertUnwindSafe, catch_unwind};
    // Hegel deliberately lets these variables override source settings. An
    // operational invocation may increase coverage, but never quietly reduce it
    // or change the seed/database identity used by this retained corpus.
    if let Ok(cases) = std::env::var("HEGEL_TEST_CASES") {
        assert!(cases.parse::<u64>().is_ok_and(|count| count >= 64));
    }
    if let Ok(seed) = std::env::var("HEGEL_SEED") {
        assert_eq!(seed.parse::<u64>().unwrap(), u64::from(NATIVE_SEED));
    }
    if let Ok(database) = std::env::var("HEGEL_DATABASE") {
        assert_eq!(database, "disabled");
    }
    let completed = std::cell::Cell::new(0usize);
    let result = catch_unwind(AssertUnwindSafe(|| {
        Hegel::new(|tc| {
            let directory = tempfile::tempdir().unwrap();
            let mut history = history(vec![json!({"kind":"restart"})]);
            history.seed = NATIVE_SEED;
            let mut driver = Driver::new(directory.path(), &history).unwrap();
            history.commands.clear();
            let mut trace = Trace {
                contract: "algal.verification-trace.v1",
                runtime: "native",
                history_digest: String::new(),
                initial: driver.snapshot().unwrap(),
                steps: Vec::new(),
                authorities: Vec::new(),
            };
            let mut reference = Reference::default();
            let steps = tc.draw_named("steps", gs::integers::<usize>().min_value(8).max_value(24));
            for id in 0..steps {
                let action = match id {
                    0 => Action::StorePut {
                        value: baseline_values()
                            [tc.draw_named("initial-value", gs::integers::<usize>().max_value(3))]
                        .clone(),
                    },
                    1 => Action::MailboxCreate {
                        r#box: 0,
                        capacity: tc
                            .draw_named("capacity", gs::integers::<u8>().min_value(1).max_value(2)),
                    },
                    2 => Action::ApplicationCreate {
                        app: 0,
                        key: 0,
                        memory: json!(
                            tc.draw_named("initial-memory", gs::integers::<u8>().max_value(1))
                        ),
                    },
                    _ => generated_action(&tc, &reference, &history.commands),
                };
                let command = Command {
                    id: id as u16,
                    action,
                    fault: None,
                };
                let expected = reference.expectation(&command, &driver.memories);
                history.commands.push(command.clone());
                tc.note(&metadata_json(&serialized(&history).unwrap()).unwrap());
                let failure = match driver.step(&command) {
                    Ok(step) => {
                        let result = reference.check(&command, &step, expected);
                        trace.steps.push(step);
                        result.err()
                    }
                    Err(error) => Some(format!("native-harness: {error}")),
                };
                if let Some(property) = failure {
                    trace.history_digest = history_digest(&history).unwrap();
                    trace.authorities = driver.authorities();
                    fail_property(PortableFailure {
                        directory,
                        history,
                        trace,
                        property,
                    });
                }
            }
            completed.set(completed.get() + 1);
        })
        .settings(
            Settings::from_profile("base")
                .test_cases(64)
                .seed(Some(u64::from(NATIVE_SEED)))
                .database(None)
                .report_multiple_failures(false)
                .phases(vec![HegelPhase::Generate, HegelPhase::Shrink])
                .suppress_health_check([HealthCheck::TooSlow]),
        )
        .run();
    }));
    if let Err(payload) = result {
        match payload.downcast::<PortableFailure>() {
            Ok(failure) => retain_failure(*failure),
            Err(payload) => std::panic::resume_unwind(payload),
        }
    }
    assert!(
        completed.get() >= 64,
        "Hegel did not complete the required 64 histories"
    );
    println!(
        "native-stateful: {} completed histories; hegel=0.46.1 engine=0.43.1 seed={NATIVE_SEED}",
        completed.get()
    );
}

fn rejects_last_wins_mutant(history: &History, trace: &Trace) -> Option<usize> {
    history.commands.iter().zip(&trace.steps).find_map(|(command, step)| {
        let Action::EffectPut { key, value: proposed } = &command.action else { return None; };
        let observed = observation(&step.after, &json!({"kind":"effect","key":key}));
        matches!(observed, Outcome::Ok { value } if value["found"] == true && value["value"]["output"] != *proposed)
            .then_some(usize::from(command.id))
    })
}

#[test]
fn shrinking_exports_concrete_histories_and_replays_the_same_named_negative_control() {
    use hegel::{HealthCheck, Hegel, Settings, Verbosity, generators as gs};
    use std::panic::{AssertUnwindSafe, catch_unwind};
    // Deliberately wrong oracle, not a production defect: it expects later
    // effect proposals to replace the retained first winner. The framework must
    // find and shrink this *specific* semantic disagreement, not any panic.
    let result = catch_unwind(AssertUnwindSafe(|| {
        Hegel::new(|tc| {
            let directory = tempfile::tempdir().unwrap();
            let mut history = history(vec![json!({"kind":"restart"})]);
            history.seed = NATIVE_SEED;
            let mut driver = Driver::new(directory.path(), &history).unwrap();
            history.commands.clear();
            let mut trace = Trace {
                contract: "algal.verification-trace.v1",
                runtime: "native",
                history_digest: String::new(),
                initial: driver.snapshot().unwrap(),
                steps: Vec::new(),
                authorities: Vec::new(),
            };
            let count = tc.draw_named(
                "commands",
                gs::integers::<usize>().min_value(1).max_value(8),
            );
            for id in 0..count {
                let value = baseline_values()
                    [tc.draw_named("value", gs::integers::<usize>().max_value(3))]
                .clone();
                let command = Command {
                    id: id as u16,
                    action: Action::EffectPut { key: 0, value },
                    fault: None,
                };
                history.commands.push(command.clone());
                trace.steps.push(driver.step(&command).unwrap());
                if rejects_last_wins_mutant(&history, &trace).is_some() {
                    trace.history_digest = history_digest(&history).unwrap();
                    fail_property(PortableFailure {
                        directory,
                        history,
                        trace,
                        property: "negative-control.effect-last-wins".to_owned(),
                    });
                }
            }
        })
        .settings(
            Settings::from_profile("base")
                .test_cases(64)
                .seed(Some(u64::from(NATIVE_SEED)))
                .database(None)
                .report_multiple_failures(false)
                .verbosity(Verbosity::Quiet)
                .suppress_health_check([HealthCheck::TooSlow]),
        )
        .run();
    }));
    let payload = result.expect_err("the incorrect last-wins oracle must fail");
    let failure = payload
        .downcast::<PortableFailure>()
        .unwrap_or_else(|payload| std::panic::resume_unwind(payload));
    assert_eq!(failure.property, "negative-control.effect-last-wins");
    assert_eq!(
        failure.history.commands.len(),
        2,
        "the concrete counterexample must shrink"
    );
    // Write and decode a normal portable fixture, then replay against another
    // real filesystem. Neither a Hegel blob nor its database participates.
    let portable_path = failure.directory.path().join("shrunk-history.json");
    fs::write(
        &portable_path,
        metadata_json(&serialized(&failure.history).unwrap()).unwrap(),
    )
    .unwrap();
    let history: History = serde_json::from_slice(&fs::read(portable_path).unwrap()).unwrap();
    history.validate().unwrap();
    let retained: History = serde_json::from_str(include_str!(
        "../tests/fixtures/verification_trace/hegel-first-wins-negative.json"
    ))
    .unwrap();
    assert_eq!(
        serialized(&history).unwrap(),
        serialized(&retained).unwrap()
    );
    let (_, replayed) = run_fixture(&history);
    assert_eq!(rejects_last_wins_mutant(&history, &replayed), Some(1));
    println!(
        "native-shrunk-negative-control: {}",
        metadata_json(&serialized(&history).unwrap()).unwrap()
    );
}

#[test]
fn portable_target_inventory_uses_utf16_order_for_scalar_unicode() {
    let history = history(vec![
        json!({"kind":"store-get","value":"\u{ffff}"}),
        json!({"kind":"store-get","value":"\u{1f600}"}),
    ]);
    let (targets, _) = inventory(&history).unwrap();
    let values: Vec<_> = targets
        .iter()
        .filter_map(|target| match target {
            Target::Value { value } => value.as_str(),
            _ => None,
        })
        .collect();
    let astral = values
        .iter()
        .position(|value| *value == "\u{1f600}")
        .unwrap();
    let bmp = values
        .iter()
        .position(|value| *value == "\u{ffff}")
        .unwrap();
    assert!(astral < bmp);
    let numeric = json!({"2":"a","10":"b"});
    assert_eq!(metadata_json(&numeric).unwrap(), r#"{"10":"b","2":"a"}"#);
    assert_eq!(canonical(&numeric).unwrap(), r#"{"2":"a","10":"b"}"#);
    let history: History = serde_json::from_str(include_str!(
        "../tests/fixtures/verification_trace/numeric-unicode-keys.json"
    ))
    .unwrap();
    let (_, trace) = run_fixture(&history);
    assert_eq!(trace.history_digest, history_digest(&history).unwrap());
    assert_eq!(
        ok(&trace.steps[0].outcome),
        &json!(digest(&numeric).unwrap())
    );
    assert_eq!(ok(&trace.steps[1].outcome), &found(Some(numeric)));
    assert_eq!(
        ok(&trace.steps[4].outcome),
        &found(Some(json!({"\u{ffff}":1,"\u{1f600}":2})))
    );
}

#[test]
fn aborting_the_real_admission_future_releases_custody_without_publishing_a_head() {
    use std::{future::Future, pin::Pin};
    use tokio::{
        sync::Notify,
        task::LocalSet,
        time::{Duration, timeout},
    };
    struct SuspendedAdmission(Arc<Notify>);
    impl Admission for SuspendedAdmission {
        fn admit_commit(&self, _: &CommitContext) -> Result<()> {
            Err(harness(
                "real cancellation fixture must use async admission",
            ))
        }
        fn verify_commit<'a>(
            &'a self,
            _: &'a CommitContext<'a>,
        ) -> Pin<Box<dyn Future<Output = Result<()>> + 'a>> {
            Box::pin(async move {
                self.0.notify_one();
                std::future::pending().await
            })
        }
        fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
            Err(harness(
                "cancellation fixture never confers dispatch authority",
            ))
        }
    }
    let directory = tempfile::tempdir().unwrap();
    let seed = history(vec![json!({"kind":"restart"})]);
    let mut driver = Driver::new(directory.path(), &seed).unwrap();
    let reached = Arc::new(Notify::new());
    let admission = SuspendedAdmission(reached.clone());
    let root = driver.root.clone();
    let input = json!({"application":"trace-app-0","operation":key_digest(0).unwrap(),"kind":"create","expectedHead":null,
        "revision":driver.revisions[0],"memory":driver.memories[0],"intents":[],"evidence":[],"causedBy":null});
    driver
        .runtime
        .block_on(LocalSet::new().run_until(async move {
            let owned = tokio::task::spawn_local(async move {
                Service::new(&root, &admission)
                    .unwrap()
                    .commit(&input)
                    .await
            });
            timeout(Duration::from_secs(5), reached.notified())
                .await
                .expect("admission barrier reached");
            owned.abort();
            let stopped = timeout(Duration::from_secs(5), owned)
                .await
                .expect("owned task cancellation observed");
            assert!(stopped.unwrap_err().is_cancelled());
        }));
    let after = driver.snapshot().unwrap();
    assert_eq!(
        ok(observation(
            &after,
            &json!({"kind":"application-history","app":0})
        )),
        &json!([])
    );
    assert!(!driver.root.join("applications/trace-app-0").exists());
    // A real second owner proves the cancelled future released its retained
    // SQLite lease. This is explicit new work, not an automatic retry of an
    // effect whose settlement was unknown.
    let command = Command {
        id: 0,
        action: Action::ApplicationCreate {
            app: 0,
            key: 1,
            memory: json!(0),
        },
        fault: None,
    };
    let step = driver.step(&command).unwrap();
    assert_eq!(ok(&step.outcome)["sequence"], 0);
    assert_eq!(ok(&step.outcome)["previous"], Value::Null);
}
