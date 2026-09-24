use crate::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, canonical, check_digest, digest, digest_bytes, read_json},
    contract::{Manifest, id, keys, object},
    durable_fs,
};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

pub type SourceReads = BTreeMap<(String, String), Option<Value>>;
#[derive(Default)]
struct ReadTrace {
    source_keys: BTreeSet<(String, String)>,
    reads: SourceReads,
    bytes: usize,
}
/// A local memory/overlay value admitted through `put`, with the byte length of
/// its canonical form so bounded reads never re-encode it. Persistent writes do
/// not populate this map: subsequent reads must admit the retained file.
#[derive(Clone)]
struct Cached {
    value: Value,
    bytes: usize,
}
#[derive(Clone, Default)]
pub struct Store {
    root: Option<PathBuf>,
    writable: bool,
    data: BTreeMap<(String, String), Cached>,
    effects: BTreeMap<String, Value>,
    slots: BTreeMap<String, Value>,
    trace: Option<Arc<Mutex<ReadTrace>>>,
    overlay_written: BTreeSet<(String, String)>,
    allowed_missing: Option<Arc<BTreeSet<(String, String)>>>,
    evidence_violation: Arc<Mutex<bool>>,
}

fn no_link(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.file_type().is_symlink() => {
            Err(Error::new("IO_FAILED", "store symlinks are not admitted"))
        }
        Ok(_) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.into()),
    }
}

/// Open a bounded JSON artifact and validate the descriptor, not a racy stat.
/// On Unix, reject its final symlink and never wait for a special-file writer.
/// Absence remains a miss; callers retain their own JSON and node validation.
pub fn open_regular_file(path: &Path, max_bytes: usize) -> Result<Option<File>> {
    open_json_file(path, max_bytes, false)
}

/// Explicitly selected inputs may be symlinks to regular files. The opened
/// target must be regular and bounded; on Unix, a FIFO never waits for a writer.
pub fn open_input_file(path: &Path, max_bytes: usize) -> Result<Option<File>> {
    open_json_file(path, max_bytes, true)
}

fn open_json_file(path: &Path, max_bytes: usize, follow_links: bool) -> Result<Option<File>> {
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NONBLOCK | if follow_links { 0 } else { libc::O_NOFOLLOW });
    }
    #[cfg(not(unix))]
    let _ = follow_links;
    let file = match options.open(path) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    let metadata = file.metadata()?;
    if !metadata.is_file() || metadata.len() > max_bytes as u64 {
        return Err(Error::limit("JSON artifact file type or bytes"));
    }
    Ok(Some(file))
}

/// Install `bytes` at `path`. Returns whether this call installed them: an
/// immutable entry that already existed is left untouched and yields `false`.
fn publish(path: &Path, bytes: &[u8], replace: bool) -> Result<bool> {
    let parent = path
        .parent()
        .ok_or_else(|| Error::invalid("store parent"))?;
    no_link(parent)?;
    no_link(path)?;
    // Keep the Store's established special-file admission error, before the
    // shared publisher applies its generic target guard. Never replace it.
    if let Ok(metadata) = fs::symlink_metadata(path)
        && !metadata.is_file()
    {
        return Err(Error::limit("JSON artifact file type or bytes"));
    }
    durable_fs::publish(path, bytes, replace)
}

/// Apply the reference file store's JSON node/depth bounds before admitting
/// the closed effect receipt and its bounded canonical publication encoding.
fn admit_effect_receipt(value: &Value) -> Result<String> {
    let mut pending = vec![(value, 0usize)];
    let mut nodes = 0usize;
    while let Some((value, depth)) = pending.pop() {
        nodes += 1;
        if nodes > 1_000_000 || depth > 64 {
            return Err(Error::limit("effect receipt structural bounds"));
        }
        match value {
            Value::Array(values) => {
                if values.len() + pending.len() > 1_000_000 {
                    return Err(Error::limit("effect receipt node bound"));
                }
                pending.extend(values.iter().map(|value| (value, depth + 1)));
            }
            Value::Object(values) => {
                if values.len() + pending.len() > 1_000_000 {
                    return Err(Error::limit("effect receipt node bound"));
                }
                pending.extend(values.values().map(|value| (value, depth + 1)));
            }
            _ => {}
        }
    }
    crate::receipt::validate_effect(value)?;
    canonical(value)
}

fn read_effect_receipt(path: &Path, request_digest: &str, retain: bool) -> Result<Option<Value>> {
    let Some(file) = open_regular_file(path, MAX_DOCUMENT_BYTES)? else {
        return Ok(None);
    };
    let value = read_json(&file, MAX_DOCUMENT_BYTES)?;
    admit_effect_receipt(&value)?;
    if value["requestDigest"].as_str() != Some(request_digest) {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            format!("effect file claims a different request than {request_digest}"),
        ));
    }
    if retain {
        durable_fs::sync_retained(&file, path)?;
    }
    Ok(Some(value))
}

impl Store {
    pub fn open(root: &Path, writable: bool) -> Result<Self> {
        no_link(root)?;
        Ok(Self {
            root: Some(root.to_path_buf()),
            writable,
            ..Self::default()
        })
    }

    /// Keep the backing store readable while applying writes only to this
    /// copy's memory layer, as with a store opened with `writable = false`.
    pub fn overlay(&self) -> Self {
        Self {
            writable: false,
            ..self.clone()
        }
    }

    /// Trace the immutable source layer. Subsequent overlay writes are excluded;
    /// all overlays share the collector, including reads of preseeded SDK data.
    pub fn trace_source_reads(&self) -> Self {
        Self {
            writable: false,
            overlay_written: BTreeSet::new(),
            evidence_violation: Arc::new(Mutex::new(false)),
            trace: Some(Arc::new(Mutex::new(ReadTrace {
                source_keys: self.data.keys().cloned().collect(),
                ..ReadTrace::default()
            }))),
            ..self.clone()
        }
    }

    pub fn source_reads(&self) -> Result<SourceReads> {
        Ok(self
            .trace
            .as_ref()
            .ok_or_else(|| Error::invalid("store is not traced"))?
            .lock()
            .map_err(|_| Error::invalid("read trace poisoned"))?
            .reads
            .clone())
    }

    /// Only declared negative dependencies may resolve to None. Undeclared reads
    /// poison verification even if a replay catches their error in a receipt.
    pub fn evidence_memory(missing: BTreeSet<(String, String)>) -> Self {
        Self {
            allowed_missing: Some(Arc::new(missing)),
            ..Self::default()
        }
    }

    pub fn check_evidence_reads(&self) -> Result<()> {
        if *self
            .evidence_violation
            .lock()
            .map_err(|_| Error::invalid("evidence read state poisoned"))?
        {
            return Err(Error::new(
                "VERIFY_FAILED",
                "process evidence omitted a store dependency",
            ));
        }
        Ok(())
    }

    fn source_read(&self, kind: &str, key: &str, value: Option<Value>) -> Result<Option<Value>> {
        if let Some(allowed) = &self.allowed_missing
            && value.is_none()
            && ["manifests", "values"].contains(&kind)
            && !allowed.contains(&(kind.to_owned(), key.to_owned()))
        {
            *self
                .evidence_violation
                .lock()
                .map_err(|_| Error::invalid("evidence read state poisoned"))? = true;
            return Err(Error::new(
                "VERIFY_FAILED",
                "undeclared process evidence dependency",
            ));
        }
        if let Some(trace) = &self.trace
            && ["manifests", "values"].contains(&kind)
        {
            let mut trace = trace
                .lock()
                .map_err(|_| Error::invalid("read trace poisoned"))?;
            let identity = (kind.to_owned(), key.to_owned());
            if let Some(previous) = trace.reads.get(&identity) {
                if previous != &value {
                    return Err(Error::new(
                        "DIGEST_MISMATCH",
                        "source store changed during evidence export",
                    ));
                }
            } else {
                let count = trace
                    .reads
                    .iter()
                    .filter(|((namespace, _), item)| {
                        namespace == kind && item.is_some() == value.is_some()
                    })
                    .count();
                let maximum = if kind == "values" && value.is_some() {
                    641
                } else {
                    512
                };
                if count >= maximum {
                    return Err(Error::limit("process evidence read count"));
                }
                trace.bytes += value
                    .as_ref()
                    .map(canonical)
                    .transpose()?
                    .map_or(0, |bytes| bytes.len());
                if trace.bytes > MAX_DOCUMENT_BYTES {
                    return Err(Error::limit("process evidence read bytes"));
                }
                trace.reads.insert(identity, value.clone());
            }
        }
        Ok(value)
    }

    fn path(&self, kind: &str, key: &str) -> Result<Option<PathBuf>> {
        if !["manifests", "values", "runs"].contains(&kind) {
            return Err(Error::invalid("store namespace"));
        }
        check_digest(key)?;
        self.root
            .as_ref()
            .map(|root| {
                no_link(root)?;
                no_link(&root.join(kind))?;
                let path = root.join(kind).join(format!("{}.json", &key[7..]));
                no_link(&path)?;
                Ok(path)
            })
            .transpose()
    }

    pub fn get(&self, kind: &str, key: &str) -> Result<Option<Value>> {
        self.get_bounded(
            kind,
            key,
            if kind == "manifests" && (self.trace.is_some() || self.allowed_missing.is_some()) {
                1_048_576
            } else {
                MAX_DOCUMENT_BYTES
            },
        )
    }

    pub fn reserve_trace_bytes(&self, bytes: usize) -> Result<()> {
        if let Some(trace) = &self.trace {
            let mut trace = trace
                .lock()
                .map_err(|_| Error::invalid("read trace poisoned"))?;
            trace.bytes = trace
                .bytes
                .checked_add(bytes)
                .ok_or_else(|| Error::limit("process evidence bytes"))?;
            if trace.bytes > MAX_DOCUMENT_BYTES {
                return Err(Error::limit("process evidence bytes"));
            }
        }
        Ok(())
    }

    pub fn get_bounded(&self, kind: &str, key: &str, bound: usize) -> Result<Option<Value>> {
        let result = self.get_bounded_inner(kind, key, bound);
        if result.is_err() && (self.trace.is_some() || self.allowed_missing.is_some()) {
            *self
                .evidence_violation
                .lock()
                .map_err(|_| Error::invalid("evidence read state poisoned"))? = true;
        }
        result
    }

    fn get_bounded_inner(&self, kind: &str, key: &str, bound: usize) -> Result<Option<Value>> {
        if bound > MAX_DOCUMENT_BYTES {
            return Err(Error::limit("store object byte bound"));
        }
        let path = self.path(kind, key)?;
        let identity = (kind.to_owned(), key.to_owned());
        if (!self.writable || self.root.is_none())
            && let Some(Cached { value, bytes }) = self.data.get(&identity)
        {
            if *bytes > bound {
                return Err(Error::limit("store object bytes"));
            }
            let source = self
                .trace
                .as_ref()
                .map(|trace| {
                    trace
                        .lock()
                        .map(|trace| trace.source_keys.contains(&identity))
                        .map_err(|_| Error::invalid("read trace poisoned"))
                })
                .transpose()?
                .unwrap_or(false)
                && !self.overlay_written.contains(&identity);
            return if source {
                self.source_read(kind, key, Some(value.clone()))
            } else {
                Ok(Some(value.clone()))
            };
        }
        let Some(path) = path else {
            return self.source_read(kind, key, None);
        };
        let Some(file) = open_regular_file(&path, bound)? else {
            return self.source_read(kind, key, None);
        };
        let raw = read_json(file, bound)?;
        let value = if kind == "manifests" {
            Manifest::parse(&raw)?.value
        } else {
            raw
        };
        if digest(&value)? != key {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "store content does not match its digest",
            ));
        }
        self.source_read(kind, key, Some(value))
    }

    pub fn put(&mut self, kind: &str, value: &Value) -> Result<String> {
        // One canonical encoding serves the digest, the published bytes, and
        // the cached byte length.
        let text = canonical(value)?;
        let key = digest_bytes(text.as_bytes());
        if self.trace.is_some() {
            self.overlay_written.insert((kind.to_owned(), key.clone()));
        }
        let path = self.path(kind, &key)?;
        if self.writable
            && let Some(path) = path
            && !publish(&path, text.as_bytes(), false)?
        {
            // An entry already existed and was left untouched: it must still
            // hash to the key, including corruption. A fresh link installed
            // exactly the synced bytes above, so it needs no read-back.
            let file = open_regular_file(&path, MAX_DOCUMENT_BYTES)?.ok_or_else(|| {
                Error::new("IO_FAILED", format!("{}: file not found", path.display()))
            })?;
            let installed = read_json(&file, MAX_DOCUMENT_BYTES)?;
            if digest(&installed)? != key {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "existing store content is corrupt",
                ));
            }
            durable_fs::sync_retained(&file, &path)?;
        }
        if !self.writable || self.root.is_none() {
            self.data.insert(
                (kind.to_owned(), key.clone()),
                Cached {
                    value: value.clone(),
                    bytes: text.len(),
                },
            );
        }
        Ok(key)
    }

    pub fn manifest(&self, key: &str) -> Result<Manifest> {
        let value = self
            .get("manifests", key)?
            .ok_or_else(|| Error::new("STORE_MISS", format!("manifest {key} not in store")))?;
        Manifest::parse(&value)
    }

    pub fn admit(&mut self, manifest: &Manifest) -> Result<String> {
        self.put("manifests", &manifest.value)
    }

    fn effect_path(&self, key: &str) -> Result<Option<PathBuf>> {
        check_digest(key)?;
        self.root
            .as_ref()
            .map(|root| {
                no_link(root)?;
                no_link(&root.join("effects"))?;
                let path = root.join("effects").join(format!("{}.json", &key[7..]));
                no_link(&path)?;
                Ok(path)
            })
            .transpose()
    }

    /// The memo key for an executor-scoped effect request — a digest of
    /// the executor identity and request digest so the same request served
    /// by different executors never collides.
    pub fn effect_key(request_digest: &str, executor: &str) -> Result<String> {
        check_digest(request_digest)?;
        digest(&json!({
            "contract":"algal.effect-cache.v1",
            "executor":executor,
            "requestDigest":request_digest,
        }))
    }

    /// Read a memoized effect receipt recorded under `(request, executor)`.
    /// A stored record must name the request it claims — a corrupt or
    /// foreign file is a hard error, never a silent miss.
    pub fn get_effect(&self, request_digest: &str, executor: &str) -> Result<Option<Value>> {
        if self.allowed_missing.is_some() || self.trace.is_some() {
            *self
                .evidence_violation
                .lock()
                .map_err(|_| Error::invalid("evidence read state poisoned"))? = true;
            return Err(Error::new(
                "VERIFY_FAILED",
                "process evidence cannot read host slots or effect cache",
            ));
        }

        let key = Self::effect_key(request_digest, executor)?;
        if (!self.writable || self.root.is_none())
            && let Some(value) = self.effects.get(&key)
        {
            return Ok(Some(value.clone()));
        }
        let Some(path) = self.effect_path(&key)? else {
            return Ok(None);
        };
        read_effect_receipt(&path, request_digest, false)
    }

    /// Record an effect response for later runs. Writable file stores admit
    /// the retained disk winner on every read. Nonpersistent stores and overlays retain the
    /// first response in their memory layer, which may shadow a backing file
    /// without changing it.
    pub fn put_effect(&mut self, receipt: &Value, executor: &str) -> Result<String> {
        let text = admit_effect_receipt(receipt)?;
        let request_digest = receipt["requestDigest"]
            .as_str()
            .ok_or_else(|| Error::invalid("effect receipt needs requestDigest"))?
            .to_owned();
        let key = Self::effect_key(&request_digest, executor)?;
        if self.writable
            && let Some(path) = self.effect_path(&key)?
        {
            if !publish(&path, text.as_bytes(), false)? {
                // Read the actual immutable winner, bypassing the memory map.
                // Never memoize a proposal that lost publication or hide a
                // malformed retained record behind the proposed receipt.
                read_effect_receipt(&path, &request_digest, true)?.ok_or_else(|| {
                    Error::new("IO_FAILED", "retained effect receipt disappeared")
                })?;
            }
        } else {
            self.effects.entry(key).or_insert_with(|| receipt.clone());
        }
        Ok(request_digest)
    }

    pub fn get_slot(&self, name: &str) -> Result<Option<Value>> {
        if self.allowed_missing.is_some() || self.trace.is_some() {
            *self
                .evidence_violation
                .lock()
                .map_err(|_| Error::invalid("evidence read state poisoned"))? = true;
            return Err(Error::new(
                "VERIFY_FAILED",
                "process evidence cannot read host slots or effect cache",
            ));
        }

        id(&json!(name))?;
        if (!self.writable || self.root.is_none())
            && let Some(value) = self.slots.get(name)
        {
            return Ok(Some(value.clone()));
        }
        let Some(root) = &self.root else {
            return Ok(None);
        };
        no_link(root)?;
        no_link(&root.join("slots"))?;
        let path = root.join("slots").join(format!("{name}.json"));
        no_link(&path)?;
        open_regular_file(&path, 262_144)?
            .map(|file| read_json(file, 262_144))
            .transpose()
    }

    pub fn set_slot(&mut self, name: &str, value: &Value) -> Result<()> {
        id(&json!(name))?;
        let bytes = canonical(value)?;
        if bytes.len() > 262_144 {
            return Err(Error::limit("slot bytes"));
        }
        if self.writable
            && let Some(root) = &self.root
        {
            no_link(root)?;
            publish(
                &root.join("slots").join(format!("{name}.json")),
                bytes.as_bytes(),
                true,
            )?;
        }
        self.slots.insert(name.to_owned(), value.clone());
        Ok(())
    }

    pub fn load_modules(&mut self, directory: &Path) -> Result<usize> {
        let mut entries = Vec::new();
        for entry in fs::read_dir(directory)? {
            if entries.len() >= 4096 {
                return Err(Error::limit("module directory entries"));
            }
            entries.push(entry?.path());
        }
        entries.sort();
        let mut count = 0;
        for path in entries {
            let name = path.file_name().and_then(|v| v.to_str()).unwrap_or("");
            if name.ends_with(".algal.json") {
                if count >= 512 {
                    return Err(Error::limit("module count"));
                }
                let file = open_input_file(&path, 1_048_576)?.ok_or_else(|| {
                    Error::new("IO_FAILED", format!("{}: file not found", path.display()))
                })?;
                let manifest = Manifest::parse(&read_json(file, 1_048_576)?)?;
                self.admit(&manifest)?;
                count += 1;
            }
        }
        Ok(count)
    }
}

/// Whole canonical bundle bounds, including wrapper/default amplification.
/// Count values (not object keys) as nodes, at root depth zero. The collector
/// charges entries before retaining them, so many individually admitted values
/// cannot first allocate an unbounded aggregate and only then be rejected.
#[derive(Default)]
struct BundleBudget {
    nodes: usize,
    bytes: usize,
}

impl BundleBudget {
    fn add(&mut self, bytes: usize) -> Result<()> {
        self.bytes = self.bytes.saturating_add(bytes);
        if self.bytes > MAX_DOCUMENT_BYTES {
            return Err(Error::limit("bundle document byte bound exceeded"));
        }
        Ok(())
    }

    fn string(&mut self, value: &str) -> Result<()> {
        self.add(2)?;
        self.add(value.len())?;
        for byte in value.bytes() {
            match byte {
                b'"' | b'\\' | b'\x08' | b'\t' | b'\n' | b'\x0c' | b'\r' => self.add(1)?,
                0..=31 => self.add(5)?,
                _ => {}
            }
        }
        Ok(())
    }

    fn member(&mut self, key: &str, value: &Value, depth: usize, first: bool) -> Result<()> {
        self.add(if first { 1 } else { 2 })?;
        self.string(key)?;
        self.visit(value, depth)
    }

    fn visit(&mut self, value: &Value, depth: usize) -> Result<()> {
        self.nodes += 1;
        if self.nodes > 1_000_000 || depth > 64 {
            return Err(Error::limit("bundle document depth/node bound exceeded"));
        }
        match value {
            Value::Null => self.add(4),
            Value::Bool(value) => self.add(if *value { 4 } else { 5 }),
            Value::Number(value) => {
                let number = value
                    .as_f64()
                    .filter(|number| number.is_finite())
                    .ok_or_else(|| Error::invalid("finite JSON number required"))?;
                self.add(ryu_js::Buffer::new().format(number).len())
            }
            Value::String(value) => self.string(value),
            Value::Array(values) => {
                if values.len() > 1_000_000 - self.nodes {
                    return Err(Error::limit("bundle document node bound exceeded"));
                }
                self.add(2 + values.len().saturating_sub(1))?;
                for value in values {
                    self.visit(value, depth + 1)?;
                }
                Ok(())
            }
            Value::Object(values) => {
                self.add(2)?;
                for (index, (key, value)) in values.iter().enumerate() {
                    self.member(key, value, depth + 1, index == 0)?;
                }
                Ok(())
            }
        }
    }
}

pub fn pack(root: &Manifest, store: &Store) -> Result<Value> {
    fn visit(
        manifest: &Manifest,
        store: &Store,
        manifests: &mut BTreeMap<String, Value>,
        values: &mut BTreeMap<String, Value>,
        resources: &mut BundleBudget,
    ) -> Result<()> {
        let key = manifest.digest()?;
        if manifests.contains_key(&key) {
            return Ok(());
        }
        if manifests.len() >= 512 {
            return Err(Error::limit("bundle manifest count"));
        }
        resources.member(&key, &manifest.value, 2, manifests.is_empty())?;
        manifests.insert(key, manifest.value.clone());
        for cell in &manifest.cells {
            if ["organism", "each", "repeat"]
                .iter()
                .any(|kind| cell["kind"] == *kind)
            {
                visit(
                    &store.manifest(cell["manifest"].as_str().unwrap())?,
                    store,
                    manifests,
                    values,
                    resources,
                )?;
            }
            if cell["kind"] == "const" {
                for port in object(&cell["outputs"])?.values() {
                    if port["type"] == "ref" {
                        let reference = port["value"]
                            .as_str()
                            .ok_or_else(|| Error::invalid("const reference"))?;
                        if values.contains_key(reference) {
                            continue;
                        }
                        if values.len() >= 512 {
                            return Err(Error::limit("bundle value count"));
                        }
                        let value = store
                            .get("values", reference)?
                            .ok_or_else(|| Error::new("STORE_MISS", "bundle reference missing"))?;
                        resources.member(reference, &value, 2, values.is_empty())?;
                        values.insert(reference.to_owned(), value);
                    }
                }
            }
        }
        Ok(())
    }
    let mut manifests = BTreeMap::new();
    let mut values = BTreeMap::new();
    let mut resources = BundleBudget::default();
    resources.visit(
        &json!({"contract":"algal.bundle.v1","root":root.digest()?,"manifests":{},"values":{}}),
        0,
    )?;
    visit(root, store, &mut manifests, &mut values, &mut resources)?;
    let bundle = json!({"contract":"algal.bundle.v1","root":root.digest()?,"manifests":manifests,"values":values});
    BundleBudget::default().visit(&bundle, 0)?;
    canonical(&bundle)?;
    Ok(bundle)
}

pub fn unpack(bundle: &Value, store: &mut Store) -> Result<Manifest> {
    keys(bundle, &["contract", "root", "manifests", "values"])?;
    if bundle["contract"] != "algal.bundle.v1" {
        return Err(Error::invalid("bundle contract"));
    }
    BundleBudget::default().visit(bundle, 0)?;
    let root = bundle["root"]
        .as_str()
        .ok_or_else(|| Error::invalid("bundle root"))?;
    check_digest(root)?;
    let mut admitted = json!({"contract":"algal.bundle.v1","root":root,"manifests":{},"values":{}});
    for namespace in ["manifests", "values"] {
        let empty = json!({});
        let values = object(bundle.get(namespace).unwrap_or(&empty))?;
        if values.len() > 512 {
            return Err(Error::limit("bundle entry count"));
        }
        for (claimed, raw) in values {
            check_digest(claimed)?;
            let value = if namespace == "manifests" {
                Manifest::parse(raw)?.value
            } else {
                raw.clone()
            };
            if digest(&value)? != *claimed {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "bundle content does not match digest",
                ));
            }
            admitted[namespace][claimed] = value;
        }
    }
    if bundle["manifests"].get(root).is_none() {
        return Err(Error::invalid("bundle root missing"));
    }
    // Manifest defaults can enlarge a supplied representation. Admit the
    // normalized envelope before writes; partial supplied-record imports stay
    // compatible and do not claim static dependency completeness.
    BundleBudget::default().visit(&admitted, 0)?;
    for namespace in ["manifests", "values"] {
        for value in object(&admitted[namespace])?.values() {
            store.put(namespace, value)?;
        }
    }
    store.manifest(root)
}
