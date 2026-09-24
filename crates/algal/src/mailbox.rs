use crate::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, canonical, check_digest, digest, read_json},
    capabilities::{capability_handle, parse_capability_handle},
    contract::id,
    durable_fs,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
};

pub const CAPABILITY_CONTRACT: &str = "algal.capability.v1";
pub const MAILBOX_CONTRACT: &str = "algal.mailbox.v1";
pub const MAILBOX_MESSAGE_CONTRACT: &str = "algal.mailbox-message.v1";
pub const MAILBOX_DELIVERY_CONTRACT: &str = "algal.mailbox-delivery.v1";
pub const MAILBOX_SEND: &str = "mailbox-send";
pub const MAILBOX_RECEIVE: &str = "mailbox-receive";
pub const MAILBOX_SEND_TOOL: &str = "mailbox.send.v1";
pub const MAILBOX_RECEIVE_TOOL: &str = "mailbox.receive.v1";
pub const MAX_MAILBOXES: usize = 1_024;
// Physical namespace entries, including ignored files and orphan directories.
pub const MAX_MAILBOX_DIRECTORY_ENTRIES: usize = 2_064;
pub const MAX_MESSAGES: usize = 1_024;
pub const MAX_MESSAGE_BYTES: usize = 250_000;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MailboxConfig {
    pub contract: String,
    pub name: String,
    pub max_messages: usize,
    pub max_message_bytes: usize,
    pub send: String,
    pub receive: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct CapabilityRecord {
    contract: String,
    handle: String,
    capability: String,
    mailbox: String,
    nonce: String,
    revoked: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MailboxMessage {
    contract: String,
    id: String,
    mailbox: String,
    idempotency_key: String,
    value: Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct MailboxDelivery {
    contract: String,
    id: String,
}

#[derive(Clone, Debug)]
pub struct MailboxService {
    root: PathBuf,
}

fn descriptor(capability: &str, mailbox: &str, nonce: &str) -> Value {
    json!({
        "capability":capability,
        "contract":CAPABILITY_CONTRACT,
        "mailbox":mailbox,
        "nonce":nonce,
    })
}

fn new_capability(capability: &str, mailbox: &str, nonce: &str) -> Result<CapabilityRecord> {
    Ok(CapabilityRecord {
        contract: CAPABILITY_CONTRACT.to_owned(),
        handle: capability_handle(capability, &descriptor(capability, mailbox, nonce))?,
        capability: capability.to_owned(),
        mailbox: mailbox.to_owned(),
        nonce: nonce.to_owned(),
        revoked: false,
    })
}

fn envelope(mailbox: &str, idempotency_key: &str, value: &Value) -> Value {
    json!({
        "contract":MAILBOX_MESSAGE_CONTRACT,
        "idempotencyKey":idempotency_key,
        "mailbox":mailbox,
        "value":value,
    })
}

fn nonce() -> Result<String> {
    let mut entropy = [0_u8; 32];
    getrandom::fill(&mut entropy)
        .map_err(|_| Error::new("IO_FAILED", "operating-system entropy unavailable"))?;
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut nonce = String::with_capacity(64);
    for byte in entropy {
        nonce.push(HEX[usize::from(byte >> 4)] as char);
        nonce.push(HEX[usize::from(byte & 15)] as char);
    }
    Ok(nonce)
}

fn no_link(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err(Error::new("IO_FAILED", "mailbox symlinks are not admitted"))
        }
        Ok(_) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}

fn write_new(path: &Path, value: &Value) -> Result<bool> {
    no_link(path)?;
    let bytes = canonical(value)?;
    if durable_fs::publish(path, bytes.as_bytes(), false)? {
        return Ok(true);
    }
    let retained = read_retained(path, |retained| {
        if canonical(retained)? != bytes {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "immutable mailbox publication conflicts",
            ));
        }
        Ok(())
    })?;
    if retained.is_none() {
        return Err(Error::new(
            "IO_FAILED",
            "retained mailbox publication disappeared",
        ));
    }
    Ok(false)
}

struct MailboxLock {
    path: Option<PathBuf>,
    _file: File,
}
impl MailboxLock {
    fn release(mut self) -> Result<()> {
        // Disarm before unlink: a post-unlink failure must never cause Drop to
        // delete a later caller's newly created lock at the same pathname.
        let path = self
            .path
            .take()
            .ok_or_else(|| Error::new("IO_FAILED", "mailbox lock already released"))?;
        durable_fs::unlink(&path, "unlink-lock")
    }
}
impl Drop for MailboxLock {
    fn drop(&mut self) {
        if let Some(path) = self.path.take() {
            let _ = durable_fs::unlink(&path, "unlink-lock");
        }
    }
}

fn write_replace(path: &Path, value: &Value) -> Result<()> {
    durable_fs::publish(path, canonical(value)?.as_bytes(), true)?;
    Ok(())
}

fn read_optional(path: &Path) -> Result<Option<Value>> {
    no_link(path)?;
    crate::store::open_regular_file(path, MAX_DOCUMENT_BYTES)?
        .map(|file| read_json(file, MAX_DOCUMENT_BYTES))
        .transpose()
}

fn read_retained(path: &Path, admit: impl FnOnce(&Value) -> Result<()>) -> Result<Option<Value>> {
    no_link(path)?;
    let Some(file) = crate::store::open_regular_file(path, MAX_DOCUMENT_BYTES)? else {
        return Ok(None);
    };
    let value = read_json(&file, MAX_DOCUMENT_BYTES)?;
    admit(&value)?;
    durable_fs::sync_retained(&file, path)?;
    Ok(Some(value))
}

fn parse_config(value: Value) -> Result<MailboxConfig> {
    let config: MailboxConfig = serde_json::from_value(value)?;
    if config.contract != MAILBOX_CONTRACT {
        return Err(Error::invalid("mailbox contract"));
    }
    id(&json!(config.name))?;
    if config.max_messages == 0
        || config.max_messages > MAX_MESSAGES
        || config.max_message_bytes == 0
        || config.max_message_bytes > MAX_MESSAGE_BYTES
    {
        return Err(Error::limit("mailbox bounds"));
    }
    parse_capability_handle(&config.send, Some(MAILBOX_SEND))?;
    parse_capability_handle(&config.receive, Some(MAILBOX_RECEIVE))?;
    Ok(config)
}

fn parse_record(value: Value) -> Result<CapabilityRecord> {
    let record: CapabilityRecord = serde_json::from_value(value)?;
    if record.contract != CAPABILITY_CONTRACT
        || ![MAILBOX_SEND, MAILBOX_RECEIVE].contains(&record.capability.as_str())
    {
        return Err(Error::invalid("capability record"));
    }
    id(&json!(record.mailbox))?;
    parse_capability_handle(&record.handle, Some(&record.capability))?;
    if capability_handle(
        &record.capability,
        &descriptor(&record.capability, &record.mailbox, &record.nonce),
    )? != record.handle
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "capability handle does not match its admission",
        ));
    }
    Ok(record)
}

fn parse_message(value: Value) -> Result<MailboxMessage> {
    let message: MailboxMessage = serde_json::from_value(value)?;
    if message.contract != MAILBOX_MESSAGE_CONTRACT {
        return Err(Error::invalid("mailbox message contract"));
    }
    id(&json!(message.mailbox))?;
    check_digest(&message.idempotency_key)?;
    if digest(&envelope(
        &message.mailbox,
        &message.idempotency_key,
        &message.value,
    ))? != message.id
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "mailbox message id does not match its contents",
        ));
    }
    Ok(message)
}

fn parse_delivery(value: Value) -> Result<MailboxDelivery> {
    let delivery: MailboxDelivery = serde_json::from_value(value)?;
    if delivery.contract != MAILBOX_DELIVERY_CONTRACT {
        return Err(Error::invalid("mailbox delivery contract"));
    }
    check_digest(&delivery.id)?;
    Ok(delivery)
}

impl MailboxService {
    pub fn open(root: &Path) -> Self {
        Self {
            root: root.to_path_buf(),
        }
    }

    fn config_path(&self, name: &str) -> Result<PathBuf> {
        id(&json!(name))?;
        let mailboxes = self.root.join("mailboxes");
        let mailbox = mailboxes.join(name);
        let path = mailbox.join("config.json");
        for candidate in [&self.root, &mailboxes, &mailbox, &path] {
            no_link(candidate)?;
        }
        Ok(path)
    }

    fn record_path(&self, handle: &str) -> Result<PathBuf> {
        let parsed = parse_capability_handle(handle, None)?;
        let capabilities = self.root.join("capabilities");
        let path = capabilities.join(format!("{}.json", &parsed.digest[7..]));
        for candidate in [&self.root, &capabilities, &path] {
            no_link(candidate)?;
        }
        Ok(path)
    }

    fn messages_dir(&self, name: &str) -> Result<PathBuf> {
        id(&json!(name))?;
        let mailboxes = self.root.join("mailboxes");
        let mailbox = mailboxes.join(name);
        let path = mailbox.join("messages");
        for candidate in [&self.root, &mailboxes, &mailbox, &path] {
            no_link(candidate)?;
        }
        Ok(path)
    }

    fn pending_dir(&self, name: &str) -> Result<PathBuf> {
        id(&json!(name))?;
        let mailboxes = self.root.join("mailboxes");
        let mailbox = mailboxes.join(name);
        let path = mailbox.join("pending");
        for candidate in [&self.root, &mailboxes, &mailbox, &path] {
            no_link(candidate)?;
        }
        Ok(path)
    }

    fn consumed_dir(&self, name: &str) -> Result<PathBuf> {
        id(&json!(name))?;
        let mailboxes = self.root.join("mailboxes");
        let mailbox = mailboxes.join(name);
        let path = mailbox.join("consumed");
        for candidate in [&self.root, &mailboxes, &mailbox, &path] {
            no_link(candidate)?;
        }
        Ok(path)
    }

    pub fn create(
        &self,
        name: &str,
        max_messages: usize,
        max_message_bytes: usize,
    ) -> Result<MailboxConfig> {
        id(&json!(name))?;
        if max_messages == 0
            || max_messages > MAX_MESSAGES
            || max_message_bytes == 0
            || max_message_bytes > MAX_MESSAGE_BYTES
        {
            return Err(Error::limit("mailbox bounds"));
        }
        // All creators share custody before observing admission or its bound.
        // Kept outside mailboxes/ so lease history cannot become a mailbox.
        no_link(&self.root)?;
        let _admission = crate::lease::OwnerLease::acquire(
            &self.root.join(".mailbox-admission"),
            "mailbox-admission",
        )?;
        if let Some(existing) = self.inspect(name)? {
            if existing.max_messages != max_messages
                || existing.max_message_bytes != max_message_bytes
            {
                return Err(Error::invalid("mailbox already has different bounds"));
            }
            self.retain_config(&existing)?;
            return Ok(existing);
        }
        if self.list()?.len() >= MAX_MAILBOXES {
            return Err(Error::limit("mailbox count exhausted"));
        }
        let seed = nonce()?;
        let send = new_capability(MAILBOX_SEND, name, &format!("{seed}-send"))?;
        let receive = new_capability(MAILBOX_RECEIVE, name, &format!("{seed}-receive"))?;
        let config = MailboxConfig {
            contract: MAILBOX_CONTRACT.to_owned(),
            name: name.to_owned(),
            max_messages,
            max_message_bytes,
            send: send.handle.clone(),
            receive: receive.handle.clone(),
        };
        durable_fs::directory(&self.messages_dir(name)?)?;
        durable_fs::directory(&self.pending_dir(name)?)?;
        durable_fs::directory(&self.consumed_dir(name)?)?;
        durable_fs::directory(&self.root.join("capabilities"))?;
        write_new(
            &self.record_path(&send.handle)?,
            &serde_json::to_value(send)?,
        )?;
        write_new(
            &self.record_path(&receive.handle)?,
            &serde_json::to_value(receive)?,
        )?;
        if !write_new(&self.config_path(name)?, &serde_json::to_value(&config)?)? {
            let existing = self
                .inspect(name)?
                .ok_or_else(|| Error::new("IO_FAILED", "mailbox creation raced"))?;
            if existing.max_messages != max_messages
                || existing.max_message_bytes != max_message_bytes
            {
                return Err(Error::invalid("mailbox already has different bounds"));
            }
            self.retain_config(&existing)?;
            return Ok(existing);
        }
        Ok(config)
    }

    fn retain_config(&self, config: &MailboxConfig) -> Result<()> {
        for handle in [&config.send, &config.receive] {
            let retained = read_retained(&self.record_path(handle)?, |raw| {
                let record = parse_record(raw.clone())?;
                // Revoked authority remains revoked; never mint a replacement.
                if record.handle != *handle || record.mailbox != config.name {
                    return Err(Error::new(
                        "DIGEST_MISMATCH",
                        "mailbox authority does not match its configuration",
                    ));
                }
                Ok(())
            })?;
            if retained.is_none() {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "mailbox configuration has no authority record",
                ));
            }
        }
        let retained = read_retained(&self.config_path(&config.name)?, |raw| {
            if parse_config(raw.clone())? != *config {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "mailbox configuration changed during publication",
                ));
            }
            Ok(())
        })?;
        if retained.is_none() {
            return Err(Error::new(
                "IO_FAILED",
                "retained mailbox configuration disappeared",
            ));
        }
        for path in [
            self.messages_dir(&config.name)?,
            self.pending_dir(&config.name)?,
            self.consumed_dir(&config.name)?,
        ] {
            let metadata = fs::symlink_metadata(&path)?;
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err(Error::new("IO_FAILED", "mailbox directory is not admitted"));
            }
            durable_fs::directory(&path)?;
        }
        Ok(())
    }

    pub fn inspect(&self, name: &str) -> Result<Option<MailboxConfig>> {
        let path = self.config_path(name)?;
        let Some(value) = read_optional(&path)? else {
            return Ok(None);
        };
        let config = parse_config(value)?;
        if config.name != name {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "mailbox config is in the wrong directory",
            ));
        }
        Ok(Some(config))
    }

    pub fn list(&self) -> Result<Vec<MailboxConfig>> {
        let mut configs = Vec::new();
        let mailboxes = self.root.join("mailboxes");
        no_link(&self.root)?;
        no_link(&mailboxes)?;
        match fs::read_dir(mailboxes) {
            Ok(entries) => {
                for (index, entry) in entries.enumerate() {
                    let entry = entry?;
                    if index >= MAX_MAILBOX_DIRECTORY_ENTRIES {
                        return Err(Error::limit(
                            "mailbox namespace physical entry bound exceeded",
                        ));
                    }
                    let file_type = entry.file_type()?;
                    if file_type.is_symlink() {
                        return Err(Error::new("IO_FAILED", "mailbox symlinks are not admitted"));
                    }
                    if !file_type.is_dir() {
                        continue;
                    }
                    no_link(&entry.path())?;
                    let path = entry.path().join("config.json");
                    no_link(&path)?;
                    let Some(value) = read_optional(&path)? else {
                        continue;
                    };
                    let config = parse_config(value)?;
                    if entry.file_name().to_string_lossy() != config.name {
                        return Err(Error::new(
                            "DIGEST_MISMATCH",
                            "mailbox config is in the wrong directory",
                        ));
                    }
                    configs.push(config);
                    if configs.len() > MAX_MAILBOXES {
                        return Err(Error::limit("mailbox count exhausted"));
                    }
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(configs),
            Err(error) => return Err(error.into()),
        }
        configs.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(configs)
    }

    fn resolve(&self, handle: &str, expected: &str) -> Result<(MailboxConfig, CapabilityRecord)> {
        let parsed = parse_capability_handle(handle, Some(expected))?;
        let record = read_optional(&self.record_path(&parsed.handle)?)?
            .ok_or_else(|| Error::new("CAPABILITY_DENIED", "capability is not admitted"))?;
        let record = parse_record(record)?;
        if record.handle != handle || record.revoked {
            return Err(Error::new("CAPABILITY_DENIED", "capability is not active"));
        }
        let config = self
            .inspect(&record.mailbox)?
            .ok_or_else(|| Error::new("CAPABILITY_DENIED", "mailbox is not admitted"))?;
        let admitted = if expected == MAILBOX_SEND {
            &config.send
        } else {
            &config.receive
        };
        if admitted != handle {
            return Err(Error::new(
                "CAPABILITY_DENIED",
                "capability admission does not match its mailbox",
            ));
        }
        Ok((config, record))
    }

    fn lock(&self, name: &str) -> Result<MailboxLock> {
        for directory in [
            self.messages_dir(name)?,
            self.pending_dir(name)?,
            self.consumed_dir(name)?,
            self.root.join("capabilities"),
        ] {
            let info = fs::symlink_metadata(directory)?;
            if !info.is_dir() || info.file_type().is_symlink() {
                return Err(Error::new(
                    "IO_FAILED",
                    "admitted mailbox directory is missing or invalid",
                ));
            }
        }
        let config = self.config_path(name)?;
        let path = config
            .parent()
            .ok_or_else(|| Error::invalid("mailbox parent"))?
            .join(".lock");
        no_link(&path)?;
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut owned = None;
        durable_fs::step("create-lock", &path, None, || {
            let file = options.open(&path).map_err(|error| {
                if error.kind() == std::io::ErrorKind::AlreadyExists {
                    Error::new("IO_FAILED", format!("mailbox \"{name}\" is locked; reconcile the owning operation before retrying"))
                } else { error.into() }
            })?;
            owned = Some(MailboxLock {
                path: Some(path.clone()),
                _file: file,
            });
            Ok(())
        })?;
        owned.ok_or_else(|| Error::new("IO_FAILED", "mailbox lock was not acquired"))
    }

    fn with_lock<T>(&self, name: &str, action: impl FnOnce(&mut bool) -> Result<T>) -> Result<T> {
        let lock = self.lock(name)?;
        let mut mutation_attempted = false;
        let result = action(&mut mutation_attempted);
        let released = lock.release();
        result
            .and_then(|value| released.map(|()| value))
            .map_err(|error| {
                // Publication may have taken effect before an error is returned;
                // even a successful transfer still needs the release acknowledgment.
                // The flag is host-only and leaves the wire code/message unchanged.
                if mutation_attempted {
                    error.uncertain()
                } else {
                    error
                }
            })
    }

    /// Host readiness observation; it never dequeues a delivery.
    pub fn has_pending(&self, handle: &str) -> Result<bool> {
        let (config, _) = self.resolve(handle, MAILBOX_RECEIVE)?;
        self.with_lock(&config.name, |_| {
            let (config, _) = self.resolve(handle, MAILBOX_RECEIVE)?;
            Ok(!self.unambiguous_pending(&config)?.is_empty())
        })
    }

    pub fn revoke(&self, handle: &str) -> Result<()> {
        let parsed = parse_capability_handle(handle, None)?;
        if ![MAILBOX_SEND, MAILBOX_RECEIVE].contains(&parsed.capability.as_str()) {
            return Err(Error::new(
                "CAPABILITY_DENIED",
                "capability is not a mailbox right",
            ));
        }
        let (config, _) = self.resolve(handle, &parsed.capability)?;
        self.with_lock(&config.name, |mutation_attempted| {
            let (_, mut record) = self.resolve(handle, &parsed.capability)?;
            record.revoked = true;
            *mutation_attempted = true;
            write_replace(&self.record_path(handle)?, &serde_json::to_value(record)?)
        })
    }

    fn message_files(&self, name: &str, max: usize) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();
        match fs::read_dir(self.pending_dir(name)?) {
            Ok(entries) => {
                for (count, entry) in entries.enumerate() {
                    if count >= max * 2 + 16 {
                        return Err(Error::limit("mailbox pending physical entry count"));
                    }
                    let entry = entry?;
                    let file_type = entry.file_type()?;
                    if file_type.is_symlink() {
                        return Err(Error::new("IO_FAILED", "mailbox symlinks are not admitted"));
                    }
                    if file_type.is_file()
                        && entry.path().extension().and_then(|v| v.to_str()) == Some("json")
                    {
                        files.push(entry.path());
                        if files.len() > max {
                            return Err(Error::limit("mailbox pending entry count"));
                        }
                    }
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(files),
            Err(error) => return Err(error.into()),
        }
        files.sort();
        Ok(files)
    }

    pub fn send(&self, handle: &str, value: Value, idempotency_key: &str) -> Result<Value> {
        check_digest(idempotency_key)?;
        let (config, _) = self.resolve(handle, MAILBOX_SEND)?;
        self.with_lock(&config.name, |mutation_attempted| {
            self.send_locked(handle, value, idempotency_key, mutation_attempted)
        })
    }

    fn send_locked(
        &self,
        handle: &str,
        value: Value,
        idempotency_key: &str,
        mutation_attempted: &mut bool,
    ) -> Result<Value> {
        let (config, _) = self.resolve(handle, MAILBOX_SEND)?;
        let bytes = canonical(&value)?.len();
        if bytes > config.max_message_bytes {
            return Err(Error::limit(format!(
                "mailbox message {bytes}B exceeds {}B",
                config.max_message_bytes
            )));
        }
        let id = digest(&envelope(&config.name, idempotency_key, &value))?;
        let file = format!("{}.json", &idempotency_key[7..]);
        let message_path = self.messages_dir(&config.name)?.join(&file);
        let pending_path = self.pending_dir(&config.name)?.join(&file);
        let consumed_path = self.consumed_dir(&config.name)?.join(&file);
        let validate_message = |raw: &Value| -> Result<()> {
            let message = parse_message(raw.clone())?;
            if message.id != id
                || message.idempotency_key != idempotency_key
                || message.mailbox != config.name
            {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "idempotency key already claims a different mailbox message",
                ));
            }
            Ok(())
        };
        if read_retained(&message_path, validate_message)?.is_none() {
            for marker in [&pending_path, &consumed_path] {
                if read_optional(marker)?.is_some() {
                    return Err(Error::new(
                        "DIGEST_MISMATCH",
                        "mailbox delivery has no message claim",
                    ));
                }
            }
            if self.message_files(&config.name, config.max_messages)?.len() >= config.max_messages {
                return Err(Error::new(
                    "MAILBOX_FULL",
                    format!("mailbox \"{}\" is full", config.name),
                ));
            }
            let message = MailboxMessage {
                contract: MAILBOX_MESSAGE_CONTRACT.to_owned(),
                id: id.clone(),
                mailbox: config.name.clone(),
                idempotency_key: idempotency_key.to_owned(),
                value,
            };
            *mutation_attempted = true;
            if !write_new(&message_path, &serde_json::to_value(message)?)? {
                validate_message(
                    &read_optional(&message_path)?
                        .ok_or_else(|| Error::new("IO_FAILED", "mailbox send raced"))?,
                )?;
            }
        }
        let (pending, consumed) = self.delivery_markers(&config, &file, &id)?;
        for (path, marker) in [(&pending_path, pending), (&consumed_path, consumed)] {
            if marker.is_none() {
                continue;
            }
            let retained = read_retained(path, |raw| {
                if parse_delivery(raw.clone())?.id != id {
                    return Err(Error::new(
                        "DIGEST_MISMATCH",
                        "mailbox delivery claims another message",
                    ));
                }
                Ok(())
            })?;
            if retained.is_none() {
                return Err(Error::new("IO_FAILED", "mailbox delivery disappeared"));
            }
            return Ok(json!({"id":id}));
        }
        if self.message_files(&config.name, config.max_messages)?.len() >= config.max_messages {
            return Err(Error::new(
                "MAILBOX_FULL",
                format!("mailbox \"{}\" is full", config.name),
            ));
        }
        let delivery = MailboxDelivery {
            contract: MAILBOX_DELIVERY_CONTRACT.to_owned(),
            id: id.clone(),
        };
        *mutation_attempted = true;
        if !write_new(&pending_path, &serde_json::to_value(delivery)?)? {
            let claimed = read_optional(&pending_path)?
                .ok_or_else(|| Error::new("IO_FAILED", "mailbox send raced"))?;
            if parse_delivery(claimed)?.id != id {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "mailbox delivery raced another message",
                ));
            }
        }
        Ok(json!({"id":id}))
    }

    pub fn receive(&self, handle: &str) -> Result<Value> {
        let (config, _) = self.resolve(handle, MAILBOX_RECEIVE)?;
        self.with_lock(&config.name, |mutation_attempted| {
            self.receive_locked(handle, mutation_attempted)
        })
    }

    fn delivery_markers(
        &self,
        config: &MailboxConfig,
        file: &str,
        id: &str,
    ) -> Result<(Option<Value>, Option<Value>)> {
        let pending = read_optional(&self.pending_dir(&config.name)?.join(file))?;
        let consumed = read_optional(&self.consumed_dir(&config.name)?.join(file))?;
        for raw in [&pending, &consumed].into_iter().flatten() {
            if parse_delivery(raw.clone())?.id != id {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "mailbox delivery claims another message",
                ));
            }
        }
        if pending.is_some() && consumed.is_some() {
            return Err(Error::new(
                "IO_FAILED",
                "mailbox delivery is uncertain; pending and consumed evidence require reconciliation",
            ));
        }
        Ok((pending, consumed))
    }

    fn unambiguous_pending(&self, config: &MailboxConfig) -> Result<Vec<PathBuf>> {
        let pending = self.message_files(&config.name, config.max_messages)?;
        for path in &pending {
            let file = path
                .file_name()
                .and_then(|v| v.to_str())
                .ok_or_else(|| Error::invalid("mailbox message filename"))?;
            if read_optional(&self.consumed_dir(&config.name)?.join(file))?.is_none() {
                continue;
            }
            let message = parse_message(
                read_optional(&self.messages_dir(&config.name)?.join(file))?
                    .ok_or_else(|| Error::new("DIGEST_MISMATCH", "mailbox message missing"))?,
            )?;
            if message.mailbox != config.name
                || file != format!("{}.json", &message.idempotency_key[7..])
            {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "mailbox delivery has a foreign message claim",
                ));
            }
            self.delivery_markers(config, file, &message.id)?;
        }
        Ok(pending)
    }

    fn receive_locked(&self, handle: &str, mutation_attempted: &mut bool) -> Result<Value> {
        let (config, _) = self.resolve(handle, MAILBOX_RECEIVE)?;
        for _ in 0..16 {
            let files = self.unambiguous_pending(&config)?;
            if files.is_empty() {
                return Err(Error::suspended(
                    format!("mailbox \"{}\" is empty", config.name),
                    handle,
                ));
            }
            for source in files {
                let Some(marker) = read_optional(&source)? else {
                    continue;
                };
                let delivery = parse_delivery(marker)?;
                let file = source
                    .file_name()
                    .and_then(|v| v.to_str())
                    .ok_or_else(|| Error::invalid("mailbox message filename"))?;
                let message_path = self.messages_dir(&config.name)?.join(file);
                let message =
                    parse_message(read_optional(&message_path)?.ok_or_else(|| {
                        Error::new("DIGEST_MISMATCH", "mailbox message missing")
                    })?)?;
                if delivery.id != message.id
                    || file != format!("{}.json", &message.idempotency_key[7..])
                    || message.mailbox != config.name
                {
                    return Err(Error::new("DIGEST_MISMATCH", "mailbox delivery is corrupt"));
                }
                let bytes = canonical(&message.value)?.len();
                if bytes > config.max_message_bytes {
                    return Err(Error::limit(format!(
                        "mailbox message {bytes}B exceeds {}B",
                        config.max_message_bytes
                    )));
                }
                self.delivery_markers(&config, file, &message.id)?;
                read_retained(&message_path, |raw| {
                    let retained = parse_message(raw.clone())?;
                    if retained.id != message.id
                        || retained.mailbox != config.name
                        || retained.idempotency_key != message.idempotency_key
                    {
                        return Err(Error::new(
                            "DIGEST_MISMATCH",
                            "mailbox message changed during consumption",
                        ));
                    }
                    Ok(())
                })?
                .ok_or_else(|| Error::new("IO_FAILED", "mailbox message disappeared"))?;
                *mutation_attempted = true;
                write_new(
                    &self.consumed_dir(&config.name)?.join(file),
                    &json!({"contract":MAILBOX_DELIVERY_CONTRACT,"id":message.id}),
                )?;
                durable_fs::unlink(&source, "unlink-pending")?;
                return Ok(json!({"id":message.id,"message":message.value}));
            }
        }
        Err(Error::suspended(
            format!("mailbox \"{}\" is busy", config.name),
            handle,
        ))
    }
}

pub fn external_wake_key() -> Result<String> {
    digest(&json!({
        "contract":"algal.mailbox-wake.v1",
        "nonce":nonce()?,
    }))
}
