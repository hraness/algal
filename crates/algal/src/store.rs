use crate::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, canonical, check_digest, digest, read_json},
    contract::{Manifest, id, keys, object},
};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

static TEMP_ID: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Default)]
pub struct Store {
    root: Option<PathBuf>,
    writable: bool,
    data: BTreeMap<(String, String), Value>,
    slots: BTreeMap<String, Value>,
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

fn write_new(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    Ok(())
}

fn publish(path: &Path, bytes: &[u8], replace: bool) -> Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| Error::invalid("store parent"))?;
    no_link(parent)?;
    fs::create_dir_all(parent)?;
    no_link(path)?;
    let temporary = parent.join(format!(
        ".algal-{}-{}",
        std::process::id(),
        TEMP_ID.fetch_add(1, Ordering::Relaxed)
    ));
    write_new(&temporary, bytes)?;
    let result = if replace {
        fs::rename(&temporary, path)
    } else {
        fs::hard_link(&temporary, path)
    };
    let cleanup = fs::remove_file(&temporary);
    match result {
        Ok(()) => (),
        Err(e) if !replace && e.kind() == std::io::ErrorKind::AlreadyExists => (),
        Err(e) => return Err(e.into()),
    }
    if let Err(e) = cleanup {
        if e.kind() != std::io::ErrorKind::NotFound {
            return Err(e.into());
        }
    }
    Ok(())
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

    pub fn overlay(&self) -> Self {
        Self {
            writable: false,
            ..self.clone()
        }
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
        let path = self.path(kind, key)?;
        if let Some(value) = self.data.get(&(kind.to_owned(), key.to_owned())) {
            return Ok(Some(value.clone()));
        }
        let Some(path) = path else {
            return Ok(None);
        };
        let file = match File::open(path) {
            Ok(file) => file,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.into()),
        };
        let raw = read_json(file, MAX_DOCUMENT_BYTES)?;
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
        Ok(Some(value))
    }

    pub fn put(&mut self, kind: &str, value: &Value) -> Result<String> {
        let key = digest(value)?;
        let path = self.path(kind, &key)?;
        if self.writable {
            if let Some(path) = path {
                publish(&path, canonical(value)?.as_bytes(), false)?;
                let installed = read_json(File::open(&path)?, MAX_DOCUMENT_BYTES)?;
                if digest(&installed)? != key {
                    return Err(Error::new(
                        "DIGEST_MISMATCH",
                        "existing store content is corrupt",
                    ));
                }
            }
        }
        self.data
            .insert((kind.to_owned(), key.clone()), value.clone());
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
        let key = Self::effect_key(request_digest, executor)?;
        if let Some(value) = self.data.get(&("effects".to_owned(), key.clone())) {
            return Ok(Some(value.clone()));
        }
        let Some(path) = self.effect_path(&key)? else {
            return Ok(None);
        };
        let file = match File::open(&path) {
            Ok(file) => file,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.into()),
        };
        let value = read_json(file, MAX_DOCUMENT_BYTES)?;
        if value["requestDigest"].as_str() != Some(request_digest) {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                format!("effect file claims a different request than {request_digest}"),
            ));
        }
        if value["executor"].as_str().is_none() {
            return Err(Error::invalid("effect record needs an executor"));
        }
        if value.get("output").is_none() && value.get("error").is_none() {
            return Err(Error::invalid("effect record needs an output or error"));
        }
        Ok(Some(value))
    }

    /// Record an effect response for later runs. First write wins — a
    /// later differing response for the same request can never overwrite
    /// the memo.
    pub fn put_effect(&mut self, receipt: &Value, executor: &str) -> Result<String> {
        let request_digest = receipt["requestDigest"]
            .as_str()
            .ok_or_else(|| Error::invalid("effect receipt needs requestDigest"))?
            .to_owned();
        let key = Self::effect_key(&request_digest, executor)?;
        if self.writable {
            if let Some(path) = self.effect_path(&key)? {
                publish(&path, canonical(receipt)?.as_bytes(), false)?;
            }
        }
        self.data
            .entry(("effects".to_owned(), key))
            .or_insert_with(|| receipt.clone());
        Ok(request_digest)
    }

    pub fn get_slot(&self, name: &str) -> Result<Option<Value>> {
        id(&json!(name))?;
        if !self.writable || self.root.is_none() {
            if let Some(value) = self.slots.get(name) {
                return Ok(Some(value.clone()));
            }
        }
        let Some(root) = &self.root else {
            return Ok(None);
        };
        no_link(root)?;
        no_link(&root.join("slots"))?;
        let path = root.join("slots").join(format!("{name}.json"));
        no_link(&path)?;
        match File::open(path) {
            Ok(file) => Ok(Some(read_json(file, 262_144)?)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_slot(&mut self, name: &str, value: &Value) -> Result<()> {
        id(&json!(name))?;
        let bytes = canonical(value)?;
        if bytes.len() > 262_144 {
            return Err(Error::limit("slot bytes"));
        }
        if self.writable {
            if let Some(root) = &self.root {
                no_link(root)?;
                publish(
                    &root.join("slots").join(format!("{name}.json")),
                    bytes.as_bytes(),
                    true,
                )?;
            }
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
                let manifest = Manifest::parse(&read_json(File::open(path)?, 1_048_576)?)?;
                self.admit(&manifest)?;
                count += 1;
            }
        }
        Ok(count)
    }
}

pub fn pack(root: &Manifest, store: &Store) -> Result<Value> {
    fn visit(
        manifest: &Manifest,
        store: &Store,
        manifests: &mut BTreeMap<String, Value>,
        values: &mut BTreeMap<String, Value>,
    ) -> Result<()> {
        let key = manifest.digest()?;
        if manifests.contains_key(&key) {
            return Ok(());
        }
        if manifests.len() >= 512 {
            return Err(Error::limit("bundle manifest count"));
        }
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
                )?;
            }
            if cell["kind"] == "const" {
                for port in object(&cell["outputs"])?.values() {
                    if port["type"] == "ref" {
                        let reference = port["value"]
                            .as_str()
                            .ok_or_else(|| Error::invalid("const reference"))?;
                        let value = store
                            .get("values", reference)?
                            .ok_or_else(|| Error::new("STORE_MISS", "bundle reference missing"))?;
                        values.insert(reference.to_owned(), value);
                        if values.len() > 512 {
                            return Err(Error::limit("bundle value count"));
                        }
                    }
                }
            }
        }
        Ok(())
    }
    let mut manifests = BTreeMap::new();
    let mut values = BTreeMap::new();
    visit(root, store, &mut manifests, &mut values)?;
    let bundle = json!({"contract":"algal.bundle.v1","root":root.digest()?,"manifests":manifests,"values":values});
    canonical(&bundle)?;
    Ok(bundle)
}

pub fn unpack(bundle: &Value, store: &mut Store) -> Result<Manifest> {
    keys(bundle, &["contract", "root", "manifests", "values"])?;
    if bundle["contract"] != "algal.bundle.v1" {
        return Err(Error::invalid("bundle contract"));
    }
    canonical(bundle)?;
    let root = bundle["root"]
        .as_str()
        .ok_or_else(|| Error::invalid("bundle root"))?;
    check_digest(root)?;
    let mut admitted = Vec::new();
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
            admitted.push((namespace, value));
        }
    }
    if bundle["manifests"].get(root).is_none() {
        return Err(Error::invalid("bundle root missing"));
    }
    for (namespace, value) in admitted {
        store.put(namespace, &value)?;
    }
    store.manifest(root)
}
