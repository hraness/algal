//! A bounded local supervisor. Immutable generations preserve execution evidence;
//! a durable uncertain intent prevents automatic retry after ambiguous dispatch.
use crate::{
    Error, Result,
    canonical::{canonical, check_digest, read_json},
    capabilities::{parse_capability_handle, parse_wake_capabilities},
    contract::{Manifest, check_value, id, object},
    effects::Host,
    graph::{Transports, compile},
    journal::Journal,
    lease::OwnerLease,
    mailbox::{MAILBOX_RECEIVE, MailboxService},
    runtime,
    store::Store,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::BTreeSet,
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

const MAX_PROCESSES: usize = 1024;
const MAX_CHAIN: usize = 129;
const MAX_RECORD_BYTES: usize = 512_000;
const MAX_RECEIPT_BYTES: usize = 16_000_000;
static TEMP_ID: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProcessRecord {
    pub contract: String,
    pub name: String,
    pub manifest_digest: String,
    pub args: Value,
    pub max_generations: usize,
    pub generation: usize,
    pub status: String,
    pub wake: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cause: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProcessState {
    pub digest: String,
    pub process: ProcessRecord,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Head {
    contract: String,
    name: String,
    record: String,
}

fn no_link(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(Error::new("IO_FAILED", "process symlinks are not admitted"))
        }
        Ok(_) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

struct Lease {
    path: PathBuf,
    marker: Value,
    _custody: OwnerLease,
}
impl Lease {
    fn acquire(path: PathBuf) -> Result<Self> {
        no_link(&path)?;
        let parent = path
            .parent()
            .ok_or_else(|| Error::invalid("creation lease parent"))?;
        let root = parent
            .parent()
            .ok_or_else(|| Error::invalid("creation lease root"))?;
        let custody = root.join(".process-creation");
        let owner = OwnerLease::acquire(&custody, "process-creation")?;
        let prior = crate::lease::read(&path, 4096).map_err(|_| {
            Error::new(
                "IO_FAILED",
                "legacy process creation lease requires operator reconciliation",
            )
        })?;
        if let Some(prior) = prior {
            let nonce = prior["nonce"].as_str().unwrap_or("");
            if prior.as_object().is_none_or(|v| v.len() != 2)
                || prior["contract"] != "algal.process-creation-owner.v1"
                || nonce.len() != 64
                || !nonce
                    .bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
            {
                return Err(Error::new(
                    "IO_FAILED",
                    "legacy process creation lease requires operator reconciliation",
                ));
            }
            let history = custody.join("creation-owners");
            let names = crate::lease::names(&history, 256)?;
            if names.iter().any(|name| {
                !name.strip_suffix(".json").is_some_and(|stem| {
                    stem.len() == 64
                        && stem
                            .bytes()
                            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                })
            }) {
                return Err(Error::invalid("invalid creation recovery evidence name"));
            }
            let filename = format!("{nonce}.json");
            if names.len() >= 256 && !names.contains(&filename) {
                return Err(Error::limit("creation recovery evidence limit exceeded"));
            }
            crate::lease::write(&history.join(filename), &prior, false)?;
            fs::remove_file(&path)?;
            File::open(parent)?.sync_all()?;
        }
        let mut nonce = [0u8; 32];
        getrandom::fill(&mut nonce)
            .map_err(|_| Error::new("IO_FAILED", "creation lease entropy unavailable"))?;
        let nonce: String = nonce.iter().map(|b| format!("{b:02x}")).collect();
        let marker = json!({"contract":"algal.process-creation-owner.v1","nonce":nonce});
        crate::lease::write(&path, &marker, false)?;
        Ok(Self {
            path,
            marker,
            _custody: owner,
        })
    }
}
impl Drop for Lease {
    fn drop(&mut self) {
        if crate::lease::read(&self.path, 4096).ok().flatten().as_ref() == Some(&self.marker) {
            let _ = fs::remove_file(&self.path);
            if let Some(parent) = self.path.parent() {
                let _ = File::open(parent).and_then(|file| file.sync_all());
            }
        }
    }
}

fn bounded_nodes(value: &Value) -> Result<()> {
    let mut stack = vec![(value, 0)];
    let mut count = 0;
    while let Some((value, depth)) = stack.pop() {
        count += 1;
        if count > 100_000 || depth > 64 {
            return Err(Error::limit("process JSON depth/count exceeded"));
        }
        let children = match value {
            Value::Array(values) => values.len(),
            Value::Object(values) => values.len(),
            _ => 0,
        };
        if count + stack.len() + children > 100_000 {
            return Err(Error::limit("process JSON node count exceeded"));
        }
        match value {
            Value::Array(values) => stack.extend(values.iter().map(|value| (value, depth + 1))),
            Value::Object(values) => stack.extend(values.values().map(|value| (value, depth + 1))),
            _ => (),
        }
    }
    Ok(())
}

pub(crate) fn record(value: Value) -> Result<ProcessRecord> {
    bounded_nodes(&value)?;
    if canonical(&value)?.len() > MAX_RECORD_BYTES {
        return Err(Error::limit("process record bytes"));
    }
    for field in ["previous", "receipt", "cause"] {
        if value.get(field).is_some_and(Value::is_null) {
            return Err(Error::invalid(
                "optional process fields must be omitted, not null",
            ));
        }
    }
    let record: ProcessRecord = serde_json::from_value(value)?;
    id(&json!(record.name))?;
    check_digest(&record.manifest_digest)?;
    for (name, ports) in object(&record.args)? {
        id(&json!(name))?;
        for port in object(ports)?.keys() {
            id(&json!(port))?;
        }
    }
    if canonical(&record.args)?.len() > 250_000 {
        return Err(Error::limit("process argument bytes"));
    }
    if record.contract != "algal.process.v1"
        || !(1..=64).contains(&record.max_generations)
        || record.generation > record.max_generations
        || ![
            "ready",
            "uncertain",
            "suspended",
            "complete",
            "failed",
            "stuck",
        ]
        .contains(&record.status.as_str())
    {
        return Err(Error::invalid("process record contract, bounds, or status"));
    }
    if !record.wake.is_empty() {
        parse_wake_capabilities(&json!(record.wake))?;
        if record.wake.windows(2).any(|pair| pair[0] >= pair[1]) {
            return Err(Error::invalid("process wake must be sorted and unique"));
        }
    }
    for key in [&record.previous, &record.receipt].into_iter().flatten() {
        check_digest(key)?;
    }
    if let Some(cause) = &record.cause
        && cause != "start"
        && cause != "manual"
    {
        parse_capability_handle(cause, None)?;
    }
    if record.status == "ready" {
        if record.generation != 0
            || record.previous.is_some()
            || record.receipt.is_some()
            || record.cause.is_some()
            || !record.wake.is_empty()
        {
            return Err(Error::invalid(
                "initial process must be ready generation zero",
            ));
        }
    } else if record.generation == 0 || record.previous.is_none() || record.cause.is_none() {
        return Err(Error::invalid("process generation needs parent and cause"));
    }
    if !["ready", "uncertain", "suspended"].contains(&record.status.as_str())
        && !record.wake.is_empty()
    {
        return Err(Error::invalid("terminal process cannot have wake evidence"));
    }
    if !["ready", "uncertain"].contains(&record.status.as_str()) && record.receipt.is_none() {
        return Err(Error::invalid("process outcome requires a receipt"));
    }
    Ok(record)
}

fn same_definition(a: &ProcessRecord, b: &ProcessRecord) -> bool {
    a.name == b.name
        && a.manifest_digest == b.manifest_digest
        && a.args == b.args
        && a.max_generations == b.max_generations
}

fn transition(previous: &ProcessRecord, next: &ProcessRecord) -> Result<()> {
    if !same_definition(previous, next) {
        return Err(Error::invalid("process definition changed"));
    }
    if next.status == "uncertain" {
        let valid_cause = if previous.status == "ready" {
            next.cause.as_deref() == Some("start")
        } else {
            next.cause.as_deref().is_some_and(|cause| {
                cause == "manual" || previous.wake.iter().any(|handle| handle == cause)
            })
        };
        if !["ready", "suspended"].contains(&previous.status.as_str())
            || next.generation != previous.generation + 1
            || next.receipt != previous.receipt
            || next.wake != previous.wake
            || !valid_cause
        {
            return Err(Error::invalid("invalid process dispatch transition"));
        }
    } else if previous.status != "uncertain"
        || next.generation != previous.generation
        || next.cause != previous.cause
        || !["suspended", "complete", "failed", "stuck"].contains(&next.status.as_str())
    {
        return Err(Error::invalid("invalid process outcome transition"));
    }
    Ok(())
}

fn continuation(checkpoint: &Value, receipt: &Value) -> Result<()> {
    let preserved: Vec<_> = checkpoint["effects"]
        .as_array()
        .ok_or_else(|| Error::invalid("checkpoint effects"))?
        .iter()
        .filter(|effect| effect["error"]["code"] != "EFFECT_SUSPENDED")
        .collect();
    let effects = receipt["effects"]
        .as_array()
        .ok_or_else(|| Error::invalid("continuation effects"))?;
    if effects.len() < preserved.len()
        || preserved
            .iter()
            .zip(effects)
            .any(|(before, after)| *before != after)
    {
        return Err(Error::invalid(
            "process continuation changed recorded effect prefix",
        ));
    }
    for (path, cell) in object(&checkpoint["cells"])? {
        if (cell["status"] == "committed" || cell["status"] == "skipped")
            && receipt["cells"].get(path) != Some(cell)
        {
            return Err(Error::invalid(
                "process continuation changed committed cell prefix",
            ));
        }
    }
    Ok(())
}

fn wake(receipt: &Value) -> Result<Vec<String>> {
    let mut handles = BTreeSet::new();
    if receipt["outcome"] == "suspended" {
        for effect in receipt["effects"]
            .as_array()
            .ok_or_else(|| Error::invalid("receipt effects"))?
        {
            if let Some(value) = effect.get("wake") {
                if effect["error"]["code"] != "EFFECT_SUSPENDED" {
                    return Err(Error::invalid("wake requires suspended effect"));
                }
                handles.extend(parse_wake_capabilities(value)?);
            }
        }
    }
    if handles.len() > 16 {
        return Err(Error::limit("process wake count"));
    }
    Ok(handles.into_iter().collect())
}

pub struct ProcessService {
    root: PathBuf,
    pub store: Store,
}
impl ProcessService {
    pub fn open(root: &Path) -> Result<Self> {
        no_link(root)?;
        Ok(Self {
            root: root.to_path_buf(),
            store: Store::open(root, true)?,
        })
    }

    fn processes_dir(&self) -> Result<PathBuf> {
        no_link(&self.root)?;
        let path = self.root.join("processes");
        no_link(&path)?;
        Ok(path)
    }

    fn directory(&self, name: &str) -> Result<PathBuf> {
        id(&json!(name))?;
        let path = self.processes_dir()?.join(name);
        no_link(&path)?;
        Ok(path)
    }

    fn persist(&mut self, process: &ProcessRecord) -> Result<ProcessState> {
        let value = serde_json::to_value(process)?;
        record(value.clone())?;
        let key = self.store.put("values", &value)?;
        File::open(self.root.join("values"))?.sync_all()?;
        Ok(ProcessState {
            digest: key,
            process: process.clone(),
        })
    }

    fn publish(&self, state: &ProcessState) -> Result<()> {
        let directory = self.directory(&state.process.name)?;
        let path = directory.join("head.json");
        no_link(&path)?;
        let temporary = directory.join(format!(
            ".head-{}-{}",
            std::process::id(),
            TEMP_ID.fetch_add(1, Ordering::Relaxed)
        ));
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&temporary)?;
        let result = (|| -> Result<()> {
            let head = json!({"contract":"algal.process-head.v1","name":state.process.name,"record":state.digest});
            file.write_all(canonical(&head)?.as_bytes())?;
            file.sync_all()?;
            fs::rename(&temporary, &path)?;
            File::open(&directory)?.sync_all()?;
            Ok(())
        })();
        if result.is_err() {
            let _ = fs::remove_file(&temporary);
        }
        result
    }

    fn cas(&self, kind: &str, key: &str, max_bytes: usize) -> Result<Value> {
        check_digest(key)?;
        no_link(&self.root)?;
        let directory = self.root.join(kind);
        no_link(&directory)?;
        let path = directory.join(format!("{}.json", &key[7..]));
        no_link(&path)?;
        let file = crate::store::open_regular_file(&path, max_bytes)?
            .ok_or_else(|| Error::from(std::io::Error::from(std::io::ErrorKind::NotFound)))?;
        let value = read_json(file, max_bytes)?;
        bounded_nodes(&value)?;
        if crate::canonical::digest(&value)? != key {
            return Err(Error::new("DIGEST_MISMATCH", "process CAS digest mismatch"));
        }
        Ok(value)
    }

    fn load_record(&self, key: &str) -> Result<ProcessState> {
        let value = self.cas("values", key, MAX_RECORD_BYTES)?;
        Ok(ProcessState {
            digest: key.to_owned(),
            process: record(value)?,
        })
    }

    fn chain(&self, name: &str) -> Result<Vec<ProcessState>> {
        let path = self.directory(name)?.join("head.json");
        no_link(&path)?;
        let file = crate::store::open_regular_file(&path, 4096)?
            .ok_or_else(|| Error::from(std::io::Error::from(std::io::ErrorKind::NotFound)))?;
        let head: Head = serde_json::from_value(read_json(file, 4096)?)?;
        if head.contract != "algal.process-head.v1" || head.name != name {
            return Err(Error::invalid("process head contract or name"));
        }
        check_digest(&head.record)?;
        let snapshot = self.load_record(&head.record)?;
        if snapshot.process.name != name {
            return Err(Error::invalid("process record name mismatch"));
        }
        read_process_history(&snapshot, &self.store)
    }

    fn manifest(&self, process: &ProcessRecord) -> Result<Manifest> {
        Manifest::parse(&self.cas("manifests", &process.manifest_digest, 1_048_576)?)
    }

    fn load_receipt(&self, process: &ProcessRecord) -> Result<Value> {
        let key = process
            .receipt
            .as_ref()
            .ok_or_else(|| Error::invalid("process has no receipt"))?;
        let receipt = self.cas("runs", key, MAX_RECEIPT_BYTES)?;
        bounded_nodes(&receipt)?;
        if canonical(&receipt)?.len() > MAX_RECEIPT_BYTES {
            return Err(Error::limit("process receipt bytes"));
        }
        if receipt["contract"] != "algal.run.v1"
            || receipt["manifestDigest"] != process.manifest_digest
            || receipt["args"] != process.args
            || receipt["digest"] != runtime::receipt_digest(&receipt)?
        {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "process receipt binding mismatch",
            ));
        }
        Ok(receipt)
    }

    pub fn inspect(&self, name: &str) -> Result<ProcessState> {
        self.chain(name)?
            .pop()
            .ok_or_else(|| Error::invalid("empty process chain"))
    }

    fn names(&self) -> Result<Vec<String>> {
        let entries = match fs::read_dir(self.processes_dir()?) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => return Err(error.into()),
        };
        let mut names = Vec::new();
        for (index, entry) in entries.enumerate() {
            if index >= MAX_PROCESSES + 16 {
                return Err(Error::limit("process directory entries"));
            }
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if entry.file_type()?.is_symlink() {
                return Err(Error::new("IO_FAILED", "process symlinks are not admitted"));
            }
            if name == ".lock" {
                continue;
            }
            if !entry.file_type()?.is_dir() {
                return Err(Error::invalid("unexpected process directory entry"));
            }
            id(&json!(name))?;
            names.push(name);
            if names.len() > MAX_PROCESSES {
                return Err(Error::limit("process count"));
            }
        }
        names.sort();
        Ok(names)
    }

    pub fn list(&self) -> Result<Vec<ProcessState>> {
        self.names()?
            .iter()
            .map(|name| self.inspect(name))
            .collect()
    }

    pub fn create(
        &mut self,
        name: &str,
        manifest: Manifest,
        args: Value,
        max_generations: usize,
        host: &Host,
        transports: &Transports,
    ) -> Result<ProcessState> {
        id(&json!(name))?;
        object(&args)?;
        if !(1..=64).contains(&max_generations) || canonical(&args)?.len() > 250_000 {
            return Err(Error::limit("process creation bounds"));
        }
        // Validate the input-cell map before admitting a process that can dispatch.
        for (cell_name, inputs) in object(&args)? {
            let cell = manifest
                .cells
                .iter()
                .find(|cell| cell["id"] == *cell_name && cell["kind"] == "input")
                .ok_or_else(|| Error::invalid("process argument names an unknown input cell"))?;
            for (port_name, value) in object(inputs)? {
                let port = cell["outputs"]
                    .get(port_name)
                    .ok_or_else(|| Error::invalid("process argument names an unknown port"))?;
                check_value(port, value)?;
            }
        }
        compile(
            manifest.clone(),
            &mut self.store,
            &host.tool_signatures(),
            transports,
            0,
        )?;
        let processes = self.processes_dir()?;
        fs::create_dir_all(&processes)?;
        let _creation = Lease::acquire(processes.join(".lock"))?;
        let retained = self.names()?.len();
        let manifest_digest = crate::canonical::digest(&manifest.value)?;
        let process = ProcessRecord {
            contract: "algal.process.v1".into(),
            name: name.into(),
            manifest_digest,
            args,
            max_generations,
            generation: 0,
            status: "ready".into(),
            wake: Vec::new(),
            previous: None,
            receipt: None,
            cause: None,
        };
        let expected = crate::canonical::digest(&serde_json::to_value(&process)?)?;
        let directory = self.directory(name)?;
        let marker_path = directory.join(".creating.json");
        if directory.exists() {
            // A retained name's directory is only recoverable when its creation
            // marker proves this exact intended record was interrupted before
            // the head published. Legacy and foreign directories stay closed.
            if directory.join("head.json").exists() {
                return Err(Error::invalid("process name already exists"));
            }
            let claimed = match crate::store::open_regular_file(&marker_path, 4096)? {
                Some(file) => {
                    let marker = read_json(file, 4096)?;
                    marker.as_object().is_some_and(|o| o.len() == 3)
                        && marker["contract"] == "algal.process-creation.v1"
                        && marker["name"] == name
                        && marker["record"] == expected
                }
                None => false,
            };
            if !claimed {
                return Err(Error::invalid(
                    "process name is retained by a completed or interrupted creation",
                ));
            }
            for entry in fs::read_dir(&directory)? {
                let entry = entry?;
                let name = entry.file_name();
                let name = name.to_str().unwrap_or("");
                let scratch = name == ".creating.json"
                    || name == ".lock"
                    || matches!(
                        name,
                        ".owner.sqlite"
                            | ".owner.sqlite-journal"
                            | ".owner.sqlite-wal"
                            | ".owner.sqlite-shm"
                    )
                    || name.starts_with(".tmp-")
                    || name.starts_with(".head-")
                    || name.ends_with(".tmp")
                    || (name == "owners" && entry.file_type()?.is_dir());
                if !scratch {
                    return Err(Error::invalid(
                        "interrupted process creation contains foreign entries",
                    ));
                }
            }
        } else {
            if retained >= MAX_PROCESSES {
                return Err(Error::limit("process count"));
            }
            fs::create_dir(&directory)?;
            File::open(&processes)?.sync_all()?;
            crate::lease::write(
                &marker_path,
                &json!({"contract":"algal.process-creation.v1","name":name,"record":expected}),
                false,
            )?;
        }
        let _lease = OwnerLease::acquire(&directory, name)?;
        let admitted = self.store.admit(&manifest)?;
        debug_assert_eq!(admitted, process.manifest_digest);
        File::open(self.root.join("manifests"))?.sync_all()?;
        let state = self.persist(&process)?;
        self.publish(&state)?;
        fs::remove_file(&marker_path)?;
        File::open(&directory)?.sync_all()?;
        Ok(state)
    }

    pub async fn tick(
        &mut self,
        name: &str,
        cause: Option<&str>,
        host: &mut Host,
        transports: &Transports,
    ) -> Result<ProcessState> {
        self.tick_journal(name, cause, host, transports, false, 2)
            .await
    }

    pub async fn tick_journal(
        &mut self,
        name: &str,
        cause: Option<&str>,
        host: &mut Host,
        transports: &Transports,
        journal: bool,
        max_recoveries: usize,
    ) -> Result<ProcessState> {
        let _lease = OwnerLease::acquire(&self.directory(name)?, name)?;
        let current = self.inspect(name)?;
        if !["ready", "suspended"].contains(&current.process.status.as_str()) {
            return Err(Error::invalid(
                "process is terminal or uncertain; cannot dispatch",
            ));
        }
        if current.process.generation >= current.process.max_generations {
            return Err(Error::limit("process generation limit"));
        }
        let cause = if current.process.status == "ready" {
            "start".to_owned()
        } else {
            cause.unwrap_or("manual").to_owned()
        };
        if cause != "start"
            && cause != "manual"
            && (!current.process.wake.contains(&cause)
                || !MailboxService::open(&self.root).has_pending(&cause)?)
        {
            return Err(Error::invalid("process wake is not ready"));
        }
        let manifest = self.manifest(&current.process)?;
        if journal {
            self.recovery_safe(&manifest, host, transports)?;
        }
        let checkpoint = self.checkpoint(&current.process, &manifest, host).await?;
        let mut intent = current.process.clone();
        intent.generation += 1;
        intent.status = "uncertain".into();
        intent.previous = Some(current.digest);
        intent.cause = Some(cause);
        transition(&current.process, &intent)?;
        let intent = self.persist(&intent)?;
        // The journal must exist before an uncertain head can become observable.
        let journal = if journal {
            Some(Journal::create(
                &self.root,
                name,
                &intent.digest,
                &intent.process.manifest_digest,
                max_recoveries,
            )?)
        } else {
            None
        };
        self.publish(&intent)?;
        self.dispatch(intent, manifest, checkpoint, host, transports, journal)
            .await
    }

    fn recovery_safe(
        &mut self,
        manifest: &Manifest,
        host: &Host,
        transports: &Transports,
    ) -> Result<()> {
        let compiled = compile(
            manifest.clone(),
            &mut self.store,
            &host.tool_signatures(),
            transports,
            0,
        )?;
        let mut stack = vec![&compiled];
        while let Some(compiled) = stack.pop() {
            for cell in &compiled.manifest.cells {
                if ["slot", "spawn"].contains(&cell["kind"].as_str().unwrap_or("")) {
                    return Err(Error::new(
                        "RECOVERY_BLOCKED",
                        "journal recovery does not admit slot or spawn cells",
                    ));
                }
                if cell["kind"] == "fn" {
                    crate::registry::signature(cell["fn"].as_str().unwrap_or(""))?;
                }
            }
            stack.extend(compiled.children.values());
        }
        Ok(())
    }

    async fn checkpoint(
        &self,
        process: &ProcessRecord,
        manifest: &Manifest,
        host: &Host,
    ) -> Result<Option<Value>> {
        if process.receipt.is_none() {
            return Ok(None);
        }
        let receipt = self.load_receipt(process)?;
        if runtime::verify(&receipt, manifest.clone(), &self.store, host).await?["ok"] != true {
            return Err(Error::new(
                "VERIFY_FAILED",
                "process checkpoint does not replay",
            ));
        }
        Ok(Some(receipt))
    }

    pub async fn recover(
        &mut self,
        name: &str,
        expected_intent: &str,
        host: &mut Host,
        transports: &Transports,
    ) -> Result<ProcessState> {
        check_digest(expected_intent)?;
        let _lease = OwnerLease::acquire(&self.directory(name)?, name)?;
        let intent = self.inspect(name)?;
        if intent.process.status != "uncertain" || intent.digest != expected_intent {
            return Err(Error::new(
                "RECOVERY_BLOCKED",
                "recovery requires the exact current uncertain intent",
            ));
        }
        let manifest = self.manifest(&intent.process)?;
        self.recovery_safe(&manifest, host, transports)?;
        let checkpoint = self.checkpoint(&intent.process, &manifest, host).await?;
        let mut journal = Journal::open(
            &self.root,
            name,
            &intent.digest,
            &intent.process.manifest_digest,
        )?;
        journal.begin_recovery()?;
        self.dispatch(
            intent,
            manifest,
            checkpoint,
            host,
            transports,
            Some(journal),
        )
        .await
    }

    async fn dispatch(
        &mut self,
        intent: ProcessState,
        manifest: Manifest,
        checkpoint: Option<Value>,
        host: &mut Host,
        transports: &Transports,
        journal: Option<Journal>,
    ) -> Result<ProcessState> {
        let scope = host.process_scope.replace(intent.process.name.clone());
        let previous_journal = host.journal.take();
        let journal = journal.map(|journal| std::sync::Arc::new(std::sync::Mutex::new(journal)));
        host.journal = journal.clone();
        let result = match checkpoint {
            Some(receipt) => {
                runtime::resume(&receipt, manifest, &mut self.store, host, transports).await
            }
            None => {
                runtime::run(
                    manifest,
                    intent.process.args.clone(),
                    &mut self.store,
                    host,
                    transports,
                    None,
                )
                .await
            }
        };
        host.process_scope = scope;
        host.journal = previous_journal;
        if let Some(journal) = journal
            && let Err(mut blocked) = journal
                .lock()
                .map_err(|_| Error::new("RECOVERY_BLOCKED", "journal mutex poisoned"))?
                .finish()
        {
            // The runtime may have caught an uncertain executor error in a
            // failed receipt. Keep the journal's settlement refusal, while
            // preserving a bounded diagnostic from that unpublished result.
            // It must not become a stored receipt or a terminal process head.
            fn excerpt(value: &str, maximum: usize) -> &str {
                let mut end = value.len().min(maximum);
                while !value.is_char_boundary(end) {
                    end -= 1;
                }
                &value[..end]
            }
            let cause = match &result {
                Err(error) => Some((error.code.as_str(), error.message.as_str(), None)),
                Ok(receipt) => receipt.get("failure").and_then(|failure| {
                    Some((
                        failure.get("code")?.as_str()?,
                        failure.get("message")?.as_str()?,
                        failure.get("path").and_then(Value::as_str),
                    ))
                }),
            };
            if let Some((code, message, path)) = cause {
                blocked.message.push_str(&format!(
                    "; execution cause {}: {}",
                    excerpt(code, 64),
                    excerpt(message, 640)
                ));
                if let Some(path) = path {
                    blocked
                        .message
                        .push_str(&format!(" (cell {})", excerpt(path, 128)));
                }
            }
            return Err(blocked);
        }
        let receipt = result?;
        bounded_nodes(&receipt)?;
        if canonical(&receipt)?.len() > MAX_RECEIPT_BYTES {
            return Err(Error::limit("process receipt bytes"));
        }
        let receipt_key = self.store.put("runs", &receipt)?;
        File::open(self.root.join("runs"))?.sync_all()?;
        let mut outcome = intent.process;
        outcome.previous = Some(intent.digest);
        outcome.receipt = Some(receipt_key);
        outcome.status = receipt["outcome"]
            .as_str()
            .ok_or_else(|| Error::invalid("run outcome missing"))?
            .to_owned();
        outcome.wake = wake(&receipt)?;
        let state = self.persist(&outcome)?;
        self.publish(&state)?;
        Ok(state)
    }

    pub async fn schedule(
        &mut self,
        max_ticks: usize,
        host: &mut Host,
        transports: &Transports,
    ) -> Result<Value> {
        self.schedule_journal(max_ticks, host, transports, false, 2)
            .await
    }

    pub async fn schedule_journal(
        &mut self,
        max_ticks: usize,
        host: &mut Host,
        transports: &Transports,
        journal: bool,
        max_recoveries: usize,
    ) -> Result<Value> {
        if !(1..=1024).contains(&max_ticks) {
            return Err(Error::limit("process scheduler maxTicks"));
        }
        let candidates = self.list()?;
        let mut advanced = Vec::new();
        for candidate in candidates {
            if advanced.len() >= max_ticks {
                break;
            }
            if candidate.process.generation >= candidate.process.max_generations {
                continue;
            }
            let cause = if candidate.process.status == "ready" {
                Some("start".to_owned())
            } else if candidate.process.status == "suspended" {
                let mut ready = None;
                for handle in &candidate.process.wake {
                    if parse_capability_handle(handle, None)?.capability == MAILBOX_RECEIVE
                        && MailboxService::open(&self.root).has_pending(handle)?
                    {
                        ready = Some(handle.clone());
                        break;
                    }
                }
                ready
            } else {
                None
            };
            if let Some(cause) = cause {
                advanced.push(
                    self.tick_journal(
                        &candidate.process.name,
                        Some(&cause),
                        host,
                        transports,
                        journal,
                        max_recoveries,
                    )
                    .await?,
                );
            }
        }
        Ok(json!({"ticks":advanced.len(),"processes":advanced}))
    }

    pub fn journal(&self, name: &str) -> Result<Value> {
        let chain = self.chain(name)?;
        let intent = chain
            .iter()
            .rev()
            .find(|state| state.process.status == "uncertain")
            .ok_or_else(|| Error::new("IO_FAILED", "process has no dispatch intent"))?;
        Journal::open(
            &self.root,
            name,
            &intent.digest,
            &intent.process.manifest_digest,
        )?
        .describe()
    }

    pub async fn verify(&self, name: &str, host: &Host) -> Result<Value> {
        let snapshot = self.inspect(name)?;
        let mut report = verify_process_snapshot(&snapshot, &self.store, host).await?;
        report.as_object_mut().unwrap().remove("status");
        Ok(report)
    }
}

/// Store-only process history validation, shared by named processes and portable
/// evidence. It never opens a process directory, mailbox, owner lease or journal.
fn stored(store: &Store, kind: &str, key: &str, bound: usize) -> Result<Value> {
    check_digest(key)?;
    let value = store
        .get_bounded(kind, key, bound)?
        .ok_or_else(|| Error::new("STORE_MISS", "process evidence object missing"))?;
    bounded_nodes(&value)?;
    if canonical(&value)?.len() > bound {
        return Err(Error::limit("process evidence object bytes"));
    }
    if crate::canonical::digest(&value)? != key {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "process evidence object digest",
        ));
    }
    Ok(value)
}

pub(crate) fn stored_receipt(store: &Store, process: &ProcessRecord) -> Result<Value> {
    let key = process
        .receipt
        .as_ref()
        .ok_or_else(|| Error::invalid("process has no receipt"))?;
    let receipt = stored(store, "runs", key, MAX_RECEIPT_BYTES)?;
    if receipt["contract"] != "algal.run.v1"
        || receipt["manifestDigest"] != process.manifest_digest
        || receipt["args"] != process.args
        || receipt["digest"] != runtime::receipt_digest(&receipt)?
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "process receipt binding mismatch",
        ));
    }
    Ok(receipt)
}

pub fn read_process_history(snapshot: &ProcessState, store: &Store) -> Result<Vec<ProcessState>> {
    if crate::canonical::digest(&serde_json::to_value(&snapshot.process)?)? != snapshot.digest {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "process snapshot binding mismatch",
        ));
    }
    let mut chain = Vec::new();
    let mut key = snapshot.digest.clone();
    let mut seen = BTreeSet::new();
    loop {
        if chain.len() >= MAX_CHAIN || !seen.insert(key.clone()) {
            return Err(Error::limit("process chain bound or cycle"));
        }
        let process = record(stored(store, "values", &key, MAX_RECORD_BYTES)?)?;
        if process.name != snapshot.process.name {
            return Err(Error::invalid("process record name mismatch"));
        }
        let previous = process.previous.clone();
        chain.push(ProcessState {
            digest: key,
            process,
        });
        match previous {
            Some(previous) => key = previous,
            None => break,
        }
    }
    chain.reverse();
    if chain[0].process.status != "ready" {
        return Err(Error::invalid("process chain has no ready origin"));
    }
    for pair in chain.windows(2) {
        transition(&pair[0].process, &pair[1].process)?;
    }
    for (index, state) in chain.iter().enumerate() {
        if !["ready", "uncertain"].contains(&state.process.status.as_str()) {
            let receipt = stored_receipt(store, &state.process)?;
            if let Some(previous) = index.checked_sub(1).and_then(|index| chain.get(index))
                && previous.process.receipt.is_some()
            {
                continuation(&stored_receipt(store, &previous.process)?, &receipt)?;
            }
            if receipt["outcome"] != state.process.status || wake(&receipt)? != state.process.wake {
                return Err(Error::invalid("process outcome does not match receipt"));
            }
        }
    }
    Ok(chain)
}

pub async fn verify_process_snapshot(
    snapshot: &ProcessState,
    store: &Store,
    host: &Host,
) -> Result<Value> {
    let root = Manifest::parse(&stored(
        store,
        "manifests",
        &snapshot.process.manifest_digest,
        1_048_576,
    )?)?;
    compile(
        root,
        &mut store.overlay(),
        &host.tool_signatures(),
        &Transports::new(),
        0,
    )?;
    let chain = read_process_history(snapshot, store)?;
    let mut receipts = BTreeSet::new();
    for state in &chain {
        if let Some(key) = &state.process.receipt
            && receipts.insert(key.clone())
        {
            let receipt = stored_receipt(store, &state.process)?;
            let manifest = Manifest::parse(&stored(
                store,
                "manifests",
                &state.process.manifest_digest,
                1_048_576,
            )?)?;
            if runtime::verify(&receipt, manifest, store, host).await?["ok"] != true {
                return Err(Error::new(
                    "VERIFY_FAILED",
                    "process generation does not replay",
                ));
            }
        }
    }
    Manifest::parse(&stored(
        store,
        "manifests",
        &chain[0].process.manifest_digest,
        1_048_576,
    )?)?;
    store.check_evidence_reads()?;
    Ok(json!({"ok":true,"generations":snapshot.process.generation,
        "receipts":chain.iter().filter(|state| !["ready", "uncertain"].contains(&state.process.status.as_str())).count(),
        "digest":snapshot.digest,"status":snapshot.process.status}))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canonical::digest;
    use tempfile::tempdir;

    fn manifest(value: &str) -> Manifest {
        Manifest::parse(&json!({
            "contract": "algal.organism.v1", "key": "organism:create-recovery",
            "name": "create recovery",
            "cells": [{"id": "out", "kind": "const",
                "outputs": {"value": {"type": "json", "value": value}}}],
            "edges": [],
        }))
        .unwrap()
    }

    fn intended_record(name: &str, manifest: &Manifest) -> Value {
        serde_json::to_value(ProcessRecord {
            contract: "algal.process.v1".into(),
            name: name.into(),
            manifest_digest: digest(&manifest.value).unwrap(),
            args: json!({}),
            max_generations: 16,
            generation: 0,
            status: "ready".into(),
            wake: Vec::new(),
            previous: None,
            receipt: None,
            cause: None,
        })
        .unwrap()
    }

    fn marker(name: &str, record: &Value) -> Value {
        json!({
            "contract": "algal.process-creation.v1",
            "name": name,
            "record": digest(record).unwrap(),
        })
    }

    fn plant(root: &Path, name: &str, marker: &Value) -> PathBuf {
        let directory = root.join("processes").join(name);
        fs::create_dir_all(&directory).unwrap();
        crate::lease::write(&directory.join(".creating.json"), marker, false).unwrap();
        directory
    }

    fn service(root: &Path) -> ProcessService {
        ProcessService::open(root).unwrap()
    }

    #[test]
    fn exact_interrupted_creation_can_recover_at_capacity() {
        let root = tempdir().unwrap();
        let program = manifest("ok");
        plant(
            root.path(),
            "retained",
            &marker("retained", &intended_record("retained", &program)),
        );
        for i in 1..MAX_PROCESSES {
            fs::create_dir(root.path().join("processes").join(format!("reserved-{i}"))).unwrap();
        }
        let mut service = service(root.path());
        service
            .create(
                "retained",
                program.clone(),
                json!({}),
                16,
                &Host::default(),
                &Transports::new(),
            )
            .unwrap();
        assert_eq!(
            service
                .create(
                    "new",
                    program,
                    json!({}),
                    16,
                    &Host::default(),
                    &Transports::new()
                )
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
    }

    #[test]
    fn legacy_creation_lock_is_preserved() {
        let root = tempdir().unwrap();
        fs::create_dir(root.path().join("processes")).unwrap();
        let lock = root.path().join("processes/.lock");
        fs::write(&lock, "algal process lease\n").unwrap();
        assert!(
            service(root.path())
                .create(
                    "legacy",
                    manifest("ok"),
                    json!({}),
                    16,
                    &Host::default(),
                    &Transports::new()
                )
                .is_err()
        );
        assert_eq!(fs::read_to_string(lock).unwrap(), "algal process lease\n");
        assert!(!root.path().join("processes/legacy").exists());
    }

    #[test]
    #[cfg(unix)]
    fn creation_custody_crash_child() {
        let Ok(root) = std::env::var("ALGAL_CREATION_CRASH_ROOT") else {
            return;
        };
        let root = Path::new(&root);
        fs::create_dir_all(root.join("processes")).unwrap();
        let _lease = Lease::acquire(root.join("processes/.lock")).unwrap();
        plant(
            root,
            "crashed",
            &marker("crashed", &intended_record("crashed", &manifest("ok"))),
        );
        let _ = std::process::Command::new("/bin/kill")
            .arg("-KILL")
            .arg(std::process::id().to_string())
            .status();
        unreachable!();
    }

    #[test]
    #[cfg(unix)]
    fn killed_creation_owner_releases_custody_and_exact_marker_recovers() {
        use std::os::unix::process::ExitStatusExt;
        let root = tempdir().unwrap();
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "process::tests::creation_custody_crash_child"])
            .env("ALGAL_CREATION_CRASH_ROOT", root.path())
            .stdout(std::process::Stdio::null())
            .status()
            .unwrap();
        assert_eq!(status.signal(), Some(libc::SIGKILL));
        assert!(root.path().join("processes/.lock").exists());
        let mut service = service(root.path());
        let recovered = service
            .create(
                "crashed",
                manifest("ok"),
                json!({}),
                16,
                &Host::default(),
                &Transports::new(),
            )
            .unwrap();
        assert_eq!(recovered.process.status, "ready");
        assert_eq!(service.inspect("crashed").unwrap().digest, recovered.digest);
        assert!(!root.path().join("processes/.lock").exists());
        assert_eq!(
            fs::read_dir(root.path().join(".process-creation/creation-owners"))
                .unwrap()
                .count(),
            1
        );
    }

    #[test]
    fn interrupted_creation_resumes_when_marker_matches() {
        let root = tempdir().unwrap();
        let manifest = manifest("ok");
        let record = intended_record("ghost", &manifest);
        plant(root.path(), "ghost", &marker("ghost", &record));
        let mut service = service(root.path());
        let host = Host::default();
        let transports = Transports::new();
        let state = service
            .create("ghost", manifest, json!({}), 16, &host, &transports)
            .unwrap();
        assert_eq!(state.process.status, "ready");
        assert_eq!(state.digest, digest(&record).unwrap());
        let directory = root.path().join("processes/ghost");
        assert!(!directory.join(".creating.json").exists());
        assert!(directory.join("head.json").exists());
    }

    #[test]
    fn interrupted_creation_resumes_over_owner_lease_scratch() {
        let root = tempdir().unwrap();
        let manifest = manifest("ok");
        let record = intended_record("leased", &manifest);
        let directory = plant(root.path(), "leased", &marker("leased", &record));
        // A crash after the owner lease acquired leaves its SQLite custody
        // database and stale lock marker beside the creation marker.
        {
            let _owner = OwnerLease::acquire(&directory, "leased").unwrap();
        }
        fs::remove_file(directory.join(".lock")).unwrap_or(());
        crate::lease::write(
            &directory.join(".lock"),
            &json!({"contract":"algal.process-owner.v2","process":"leased","nonce":"a".repeat(64)}),
            false,
        )
        .unwrap();
        let mut service = service(root.path());
        let host = Host::default();
        let transports = Transports::new();
        service
            .create("leased", manifest, json!({}), 16, &host, &transports)
            .unwrap();
    }

    #[test]
    fn bare_interrupted_directory_stays_closed() {
        let root = tempdir().unwrap();
        fs::create_dir_all(root.path().join("processes/bare")).unwrap();
        let mut service = service(root.path());
        let host = Host::default();
        let transports = Transports::new();
        assert!(
            service
                .create("bare", manifest("ok"), json!({}), 16, &host, &transports)
                .is_err()
        );
    }

    #[test]
    fn completed_process_name_still_rejects() {
        let root = tempdir().unwrap();
        let mut service = service(root.path());
        let host = Host::default();
        let transports = Transports::new();
        service
            .create("settled", manifest("ok"), json!({}), 16, &host, &transports)
            .unwrap();
        assert!(
            service
                .create("settled", manifest("ok"), json!({}), 16, &host, &transports)
                .is_err()
        );
    }

    #[test]
    fn mismatched_and_foreign_interrupted_directories_stay_closed() {
        let root = tempdir().unwrap();
        // A marker pinning a different intended record must not be reused.
        let organism = manifest("ok");
        let other = intended_record("other", &manifest("different"));
        plant(root.path(), "other", &marker("other", &other));
        let mut service = service(root.path());
        let host = Host::default();
        let transports = Transports::new();
        assert!(
            service
                .create("other", organism.clone(), json!({}), 16, &host, &transports)
                .is_err()
        );
        // A matching marker plus a foreign entry must not be reused.
        let record = intended_record("foreign", &organism);
        let directory = plant(root.path(), "foreign", &marker("foreign", &record));
        fs::write(directory.join("foreign.txt"), "not ours").unwrap();
        assert!(
            service
                .create(
                    "foreign",
                    organism.clone(),
                    json!({}),
                    16,
                    &host,
                    &transports
                )
                .is_err()
        );
        // A malformed marker must not be reused.
        plant(
            root.path(),
            "malformed",
            &json!({"contract": "algal.process-creation.v1"}),
        );
        assert!(
            service
                .create("malformed", organism, json!({}), 16, &host, &transports)
                .is_err()
        );
    }
}
