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
    _file: File,
}
impl Lease {
    fn acquire(path: PathBuf) -> Result<Self> {
        no_link(&path)?;
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let file = options.open(&path).map_err(|error| {
            if error.kind() == std::io::ErrorKind::AlreadyExists {
                Error::new(
                    "IO_FAILED",
                    "process is locked; reconcile the owning operation before retrying",
                )
            } else {
                error.into()
            }
        })?;
        Ok(Self { path, _file: file })
    }
}
impl Drop for Lease {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
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

fn record(value: Value) -> Result<ProcessRecord> {
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
        let metadata = fs::symlink_metadata(&path)?;
        if !metadata.file_type().is_file() || metadata.len() > max_bytes as u64 {
            return Err(Error::limit("process CAS file type or bytes"));
        }
        let value = read_json(File::open(path)?, max_bytes)?;
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
        let metadata = fs::symlink_metadata(&path)?;
        if !metadata.file_type().is_file() || metadata.len() > 4096 {
            return Err(Error::limit("process head file type or bytes"));
        }
        let head: Head = serde_json::from_value(read_json(File::open(path)?, 4096)?)?;
        if head.contract != "algal.process-head.v1" || head.name != name {
            return Err(Error::invalid("process head contract or name"));
        }
        check_digest(&head.record)?;
        let mut chain = Vec::new();
        let mut key = head.record;
        let mut seen = BTreeSet::new();
        loop {
            if chain.len() >= MAX_CHAIN || !seen.insert(key.clone()) {
                return Err(Error::limit("process chain bound or cycle"));
            }
            let state = self.load_record(&key)?;
            if state.process.name != name {
                return Err(Error::invalid("process record name mismatch"));
            }
            let previous = state.process.previous.clone();
            chain.push(state);
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
                let receipt = self.load_receipt(&state.process)?;
                if let Some(previous) = index.checked_sub(1).and_then(|index| chain.get(index))
                    && previous.process.receipt.is_some()
                {
                    continuation(&self.load_receipt(&previous.process)?, &receipt)?;
                }
                if receipt["outcome"] != state.process.status
                    || wake(&receipt)? != state.process.wake
                {
                    return Err(Error::invalid("process outcome does not match receipt"));
                }
            }
        }
        Ok(chain)
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

    pub fn list(&self) -> Result<Vec<ProcessState>> {
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
        names.iter().map(|name| self.inspect(name)).collect()
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
        if self.list()?.len() >= MAX_PROCESSES {
            return Err(Error::limit("process count"));
        }
        let directory = self.directory(name)?;
        if directory.exists() {
            return Err(Error::invalid("process name already exists"));
        }
        fs::create_dir(&directory)?;
        File::open(&processes)?.sync_all()?;
        let _lease = OwnerLease::acquire(&directory, name)?;
        let manifest_digest = self.store.admit(&manifest)?;
        File::open(self.root.join("manifests"))?.sync_all()?;
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
        let state = self.persist(&process)?;
        self.publish(&state)?;
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
        if let Some(journal) = journal {
            journal
                .lock()
                .map_err(|_| Error::new("RECOVERY_BLOCKED", "journal mutex poisoned"))?
                .finish()?;
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
        let chain = self.chain(name)?;
        let mut receipts = BTreeSet::new();
        for state in &chain {
            if let Some(key) = &state.process.receipt
                && receipts.insert(key.clone())
            {
                let receipt = self.load_receipt(&state.process)?;
                let manifest = self.manifest(&state.process)?;
                if runtime::verify(&receipt, manifest, &self.store, host).await?["ok"] != true {
                    return Err(Error::new(
                        "VERIFY_FAILED",
                        "process generation does not replay",
                    ));
                }
            }
        }
        self.manifest(&chain[0].process)?;
        let head = chain
            .last()
            .ok_or_else(|| Error::invalid("empty process chain"))?;
        Ok(
            json!({"ok":true,"generations":head.process.generation,"receipts":chain.iter().filter(|state| !["ready", "uncertain"].contains(&state.process.status.as_str())).count(),"digest":head.digest}),
        )
    }
}
