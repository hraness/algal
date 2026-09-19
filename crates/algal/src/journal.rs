//! Ordered host-only dispatch journal. Unknown writes are evidence, never retry permission.
use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    contract::{keys, text},
    lease,
    store::Store,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs::File,
    path::{Path, PathBuf},
};
const MAX_ENTRIES: usize = 4096;
const MAX_RECORD: usize = 1_048_576;
const MAX_BYTES: usize = 16_777_216;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Binding {
    pub request_digest: String,
    pub executor: String,
    pub configuration_digest: String,
    pub idempotency_key: String,
    pub recovery: String,
}
impl Binding {
    fn validate(&self) -> Result<()> {
        check_digest(&self.request_digest)?;
        check_digest(&self.configuration_digest)?;
        check_digest(&self.idempotency_key)?;
        text(&json!(self.executor), 256)?;
        if !["read", "never"].contains(&self.recovery.as_str()) {
            return Err(Error::invalid("journal recovery policy"));
        }
        Ok(())
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Record {
    contract: String,
    intent: String,
    ordinal: usize,
    #[serde(flatten)]
    binding: Binding,
    state: String,
    attempt: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    previous: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    receipt: Option<Value>,
}
impl Record {
    fn parse(value: Value, intent: &str, ordinal: usize) -> Result<Self> {
        keys(
            &value,
            &[
                "contract",
                "intent",
                "ordinal",
                "requestDigest",
                "executor",
                "configurationDigest",
                "idempotencyKey",
                "recovery",
                "state",
                "attempt",
                "previous",
                "receipt",
            ],
        )?;
        for field in ["previous", "receipt"] {
            if value.get(field).is_some_and(Value::is_null) {
                return Err(Error::invalid("journal optional field must be omitted"));
            }
        }
        let record: Self = serde_json::from_value(value)?;
        record.binding.validate()?;
        if record.contract != "algal.process-effect-record.v1"
            || record.intent != intent
            || record.ordinal != ordinal
            || ordinal >= MAX_ENTRIES
            || record.attempt > 8
            || !["started", "completed"].contains(&record.state.as_str())
        {
            return Err(Error::invalid("journal record identity/bounds"));
        }
        if let Some(previous) = &record.previous {
            check_digest(previous)?;
        }
        if (record.state == "completed") != record.receipt.is_some() {
            return Err(Error::invalid("journal record completion receipt"));
        }
        if let Some(receipt) = &record.receipt {
            keys(
                receipt,
                &[
                    "requestDigest",
                    "executor",
                    "configurationDigest",
                    "output",
                    "error",
                    "usage",
                    "cached",
                    "retryable",
                    "wake",
                ],
            )?;
            if receipt["requestDigest"] != record.binding.request_digest
                || receipt.get("output").is_some() == receipt.get("error").is_some()
            {
                return Err(Error::invalid("journal receipt identity/result"));
            }
            text(&receipt["executor"], 256)?;
            if let Some(config) = receipt.get("configurationDigest") {
                check_digest(
                    config
                        .as_str()
                        .ok_or_else(|| Error::invalid("receipt configuration digest"))?,
                )?;
                if config != &json!(record.binding.configuration_digest) {
                    return Err(Error::invalid("journal receipt configuration mismatch"));
                }
            }
            if receipt.get("cached").is_some_and(|v| v != &json!(true))
                || receipt.get("retryable").is_some_and(|v| v != &json!(false))
            {
                return Err(Error::invalid("journal receipt boolean"));
            }
            if let Some(error) = receipt.get("error") {
                let error: crate::Error = serde_json::from_value(error.clone())?;
                text(&json!(error.code), 64)?;
                text(&json!(error.message), 2048)?;
                if ![
                    "PARSE_FAILED",
                    "MANIFEST_INVALID",
                    "GRAPH_CYCLE",
                    "TYPE_MISMATCH",
                    "GUARD_INVALID",
                    "SCORER_INVALID",
                    "AXIS_INVALID",
                    "INTERFACE_MISMATCH",
                    "DEPTH_EXCEEDED",
                    "INPUT_MISSING",
                    "FN_UNKNOWN",
                    "FN_FAILED",
                    "EXPR_FAILED",
                    "TOOL_UNKNOWN",
                    "TOOL_FAILED",
                    "EFFECT_FAILED",
                    "EFFECT_UNPARSEABLE",
                    "EFFECT_UNBOUND",
                    "EFFECT_SUSPENDED",
                    "CAPABILITY_DENIED",
                    "MAILBOX_FULL",
                    "BUDGET_EXHAUSTED",
                    "STUCK",
                    "STORE_MISS",
                    "DIGEST_MISMATCH",
                    "RECEIPT_MISMATCH",
                    "IO_FAILED",
                    "INTERNAL",
                ]
                .contains(&error.code.as_str())
                {
                    return Err(Error::invalid("journal receipt unknown error code"));
                }
            }
            if let Some(usage) = receipt.get("usage") {
                keys(usage, &["model", "tokensIn", "tokensOut"])?;
                if let Some(model) = usage.get("model") {
                    text(model, 128)?;
                }
                for field in ["tokensIn", "tokensOut"] {
                    if usage.get(field).is_some_and(|tokens| {
                        tokens.as_u64().is_none_or(|n| n > 9_007_199_254_740_991)
                    }) {
                        return Err(Error::invalid("journal receipt usage count"));
                    }
                }
            }
            crate::effects::Host::replay(&json!([receipt]))?;
        }
        Ok(record)
    }
}

pub struct Journal {
    root: PathBuf,
    directory: PathBuf,
    intent: String,
    store: Store,
    records: Vec<(String, Record)>,
    cursor: usize,
    max_recoveries: usize,
    max_entries: usize,
    recovering: bool,
    poisoned: bool,
    bytes: usize,
}
fn journal_directory(root: &Path, process: &str, intent: &str) -> Result<PathBuf> {
    crate::contract::id(&json!(process))?;
    check_digest(intent)?;
    lease::directory(root)?;
    let mut directory = root.to_path_buf();
    for component in ["processes", process, "journals", &intent[7..]] {
        directory.push(component);
        lease::directory(&directory)?;
    }
    lease::directory(&root.join("values"))?;
    Ok(directory)
}

impl Journal {
    pub fn create(
        root: &Path,
        process: &str,
        intent: &str,
        manifest: &str,
        max_recoveries: usize,
    ) -> Result<Self> {
        if !(1..=8).contains(&max_recoveries) {
            return Err(Error::limit("journal recovery cap"));
        }
        check_digest(intent)?;
        check_digest(manifest)?;
        let directory = journal_directory(root, process, intent)?;
        lease::write(
            &directory.join("header.json"),
            &json!({"contract":"algal.process-journal.v1","process":process,"intent":intent,"manifestDigest":manifest,"maxEntries":MAX_ENTRIES,"maxRecoveries":max_recoveries}),
            false,
        )?;
        let journal = Self::open(root, process, intent, manifest)?;
        if !journal.records.is_empty()
            || !lease::names(&directory.join("recoveries"), 8)?.is_empty()
        {
            return Err(Error::new(
                "IO_FAILED",
                "prospective journal already has dispatch evidence",
            ));
        }
        Ok(journal)
    }
    pub fn open(root: &Path, process: &str, intent: &str, manifest: &str) -> Result<Self> {
        check_digest(intent)?;
        let directory = journal_directory(root, process, intent)?;
        lease::directory(&directory)?;
        let header = lease::read(&directory.join("header.json"), 4096)?
            .ok_or_else(|| Error::invalid("uncertain process has no recovery journal"))?;
        keys(
            &header,
            &[
                "contract",
                "process",
                "intent",
                "manifestDigest",
                "maxEntries",
                "maxRecoveries",
            ],
        )?;
        let max_recoveries = header["maxRecoveries"]
            .as_u64()
            .filter(|n| (1..=8).contains(n))
            .ok_or_else(|| Error::invalid("journal recovery limit"))?
            as usize;
        let max_entries = header["maxEntries"]
            .as_u64()
            .filter(|n| (1..=4096).contains(n))
            .ok_or_else(|| Error::invalid("journal entry limit"))?
            as usize;
        if header["contract"] != "algal.process-journal.v1"
            || header["process"] != process
            || header["intent"] != intent
            || header["manifestDigest"] != manifest
        {
            return Err(Error::invalid("journal header mismatch"));
        }
        let mut journal = Self {
            root: root.to_owned(),
            directory,
            intent: intent.into(),
            store: Store::open(root, true)?,
            records: Vec::new(),
            cursor: 0,
            max_recoveries,
            max_entries,
            recovering: false,
            poisoned: false,
            bytes: 0,
        };
        let names = lease::names(&journal.directory.join("entries"), max_entries)?;
        for (ordinal, name) in names.iter().enumerate() {
            if name != &format!("{ordinal:06}.json") {
                return Err(Error::invalid("journal entries must be contiguous"));
            }
            let head = lease::read(&journal.directory.join("entries").join(name), 4096)?
                .ok_or_else(|| Error::invalid("journal entry missing"))?;
            keys(&head, &["contract", "record"])?;
            if head["contract"] != "algal.process-effect-head.v1" {
                return Err(Error::invalid("journal effect head contract"));
            }
            let key = head["record"]
                .as_str()
                .ok_or_else(|| Error::invalid("journal effect head digest"))?
                .to_owned();
            let mut next = key.clone();
            let mut chain = Vec::new();
            loop {
                if chain.len() >= 2 * (max_recoveries + 1) {
                    return Err(Error::limit("journal entry history"));
                }
                check_digest(&next)?;
                let raw = lease::read(
                    &root.join("values").join(format!("{}.json", &next[7..])),
                    MAX_RECORD,
                )?
                .ok_or_else(|| Error::invalid("journal CAS record missing"))?;
                if digest(&raw)? != next {
                    return Err(Error::new("VERIFY_FAILED", "journal CAS digest mismatch"));
                }
                journal.bytes += canonical(&raw)?.len();
                if journal.bytes > MAX_BYTES {
                    return Err(Error::limit("journal total bytes"));
                }
                let record = Record::parse(raw, intent, ordinal)?;
                let previous = record.previous.clone();
                chain.push(record);
                if let Some(previous) = previous {
                    next = previous;
                } else {
                    break;
                }
            }
            chain.reverse();
            if chain[0].state != "started" || chain[0].attempt != 0 {
                return Err(Error::invalid("journal first record"));
            }
            for pair in chain.windows(2) {
                let (a, b) = (&pair[0], &pair[1]);
                if a.binding != b.binding
                    || a.state != "started"
                    || !((b.state == "completed" && b.attempt == a.attempt)
                        || (b.state == "started"
                            && a.binding.recovery == "read"
                            && b.attempt == a.attempt + 1))
                {
                    return Err(Error::invalid("journal entry transition"));
                }
            }
            let current = chain
                .pop()
                .ok_or_else(|| Error::invalid("journal empty entry"))?;
            if current.state == "started" && ordinal + 1 != names.len() {
                return Err(Error::invalid("pending journal entry must be last"));
            }
            journal.records.push((key, current));
        }
        journal.recovery_count()?;
        Ok(journal)
    }
    fn recovery_count(&self) -> Result<usize> {
        let names = lease::names(&self.directory.join("recoveries"), self.max_recoveries)?;
        for (index, name) in names.iter().enumerate() {
            if name != &format!("{:06}.json", index + 1) {
                return Err(Error::invalid("journal recovery sequence"));
            }
            let expected = json!({"contract":"algal.process-recovery-attempt.v1","intent":self.intent,"attempt":index+1});
            if lease::read(&self.directory.join("recoveries").join(name), 4096)?.as_ref()
                != Some(&expected)
            {
                return Err(Error::invalid("journal recovery attempt"));
            }
        }
        if self.records.iter().any(|(_, r)| r.attempt > names.len()) {
            return Err(Error::invalid("journal retry lacks recovery attempt"));
        }
        Ok(names.len())
    }
    pub fn begin_recovery(&mut self) -> Result<()> {
        if self.recovering || self.cursor != 0 {
            return Err(Error::invalid("journal recovery already started"));
        }
        if self
            .records
            .iter()
            .any(|(_, r)| r.state == "started" && r.binding.recovery == "never")
        {
            return Err(Error::new(
                "RECOVERY_BLOCKED",
                "unknown external write requires adapter reconciliation",
            ));
        }
        let count = self.recovery_count()?;
        if count >= self.max_recoveries {
            return Err(Error::limit("journal recovery attempts exhausted"));
        }
        lease::write(
            &self
                .directory
                .join("recoveries")
                .join(format!("{:06}.json", count + 1)),
            &json!({"contract":"algal.process-recovery-attempt.v1","intent":self.intent,"attempt":count+1}),
            false,
        )?;
        self.recovering = true;
        Ok(())
    }
    fn persist(&mut self, record: Record) -> Result<()> {
        let value = serde_json::to_value(&record)?;
        Record::parse(value.clone(), &self.intent, record.ordinal)?;
        let bytes = canonical(&value)?.len();
        if bytes > MAX_RECORD || self.bytes.saturating_add(bytes) > MAX_BYTES {
            return Err(Error::limit("journal bytes"));
        }
        let key = self.store.put("values", &value)?;
        File::open(self.root.join("values"))?.sync_all()?;
        lease::write(
            &self
                .directory
                .join("entries")
                .join(format!("{:06}.json", record.ordinal)),
            &json!({"contract":"algal.process-effect-head.v1","record":key}),
            true,
        )?;
        self.bytes += bytes;
        if record.ordinal == self.records.len() {
            self.records.push((key, record));
        } else {
            let ordinal = record.ordinal;
            self.records[ordinal] = (key, record);
        }
        Ok(())
    }
    pub fn before(&mut self, binding: Binding) -> Result<Option<Value>> {
        let result = self.before_inner(binding);
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }
    fn before_inner(&mut self, binding: Binding) -> Result<Option<Value>> {
        if self.poisoned {
            return Err(Error::new("RECOVERY_BLOCKED", "journal is poisoned"));
        }
        binding.validate()?;
        if let Some((key, record)) = self.records.get(self.cursor).cloned() {
            if !self.recovering || record.binding != binding {
                return Err(Error::new(
                    "RECOVERY_BLOCKED",
                    "journal dispatch order or host binding changed",
                ));
            }
            if record.state == "completed" {
                self.cursor += 1;
                return Ok(record.receipt);
            }
            if binding.recovery != "read" {
                return Err(Error::new("RECOVERY_BLOCKED", "unknown write cannot retry"));
            }
            let mut retry = record;
            retry.attempt += 1;
            retry.previous = Some(key);
            self.persist(retry)?;
        } else {
            if self.cursor >= self.max_entries {
                return Err(Error::limit("journal entries"));
            }
            self.persist(Record {
                contract: "algal.process-effect-record.v1".into(),
                intent: self.intent.clone(),
                ordinal: self.cursor,
                binding,
                state: "started".into(),
                attempt: 0,
                previous: None,
                receipt: None,
            })?;
        }
        Ok(None)
    }
    pub fn after(&mut self, receipt: &Value) -> Result<()> {
        let result = (|| {
            if self.poisoned {
                return Err(Error::new("RECOVERY_BLOCKED", "journal is poisoned"));
            }
            let (key, mut record) = self
                .records
                .get(self.cursor)
                .cloned()
                .ok_or_else(|| Error::invalid("journal dispatch not started"))?;
            if record.state != "started" {
                return Err(Error::invalid("journal dispatch already completed"));
            }
            record.state = "completed".into();
            record.previous = Some(key);
            record.receipt = Some(receipt.clone());
            self.persist(record)?;
            self.cursor += 1;
            Ok(())
        })();
        if result.is_err() {
            self.poisoned = true;
        }
        result
    }
    pub fn describe(&self) -> Result<Value> {
        let header = lease::read(&self.directory.join("header.json"), 4096)?
            .ok_or_else(|| Error::invalid("journal header missing"))?;
        let effects: Vec<Value> = self
            .records
            .iter()
            .map(|(key, record)| json!({"digest":key,"record":record}))
            .collect();
        Ok(json!({"header":header,"effects":effects,"bytes":self.bytes}))
    }

    pub fn poison(&mut self) {
        self.poisoned = true;
    }
    pub fn finish(&self) -> Result<()> {
        if self.poisoned
            || self.cursor != self.records.len()
            || self.records.iter().any(|(_, r)| r.state != "completed")
        {
            return Err(Error::new(
                "RECOVERY_BLOCKED",
                "journal is poisoned or unconsumed",
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn key(value: &str) -> String {
        digest(&json!(value)).unwrap()
    }
    fn binding(name: &str, recovery: &str) -> Binding {
        Binding {
            request_digest: key(name),
            executor: "test".into(),
            configuration_digest: key("configuration"),
            idempotency_key: key(&format!("scope:{name}")),
            recovery: recovery.into(),
        }
    }
    fn journal(root: &Path) -> Journal {
        Journal::create(root, "worker", &key("intent"), &key("manifest"), 2).unwrap()
    }
    fn reopen(root: &Path) -> Journal {
        Journal::open(root, "worker", &key("intent"), &key("manifest")).unwrap()
    }
    #[test]
    fn completed_prefix_replays_exactly_before_retrying_pending_read() {
        let root = tempfile::tempdir().unwrap();
        let mut journal = journal(root.path());
        let write = binding("write", "never");
        let read = binding("read", "read");
        assert!(journal.before(write.clone()).unwrap().is_none());
        let receipt = json!({"requestDigest":write.request_digest,"executor":"served-model","output":{"ok":true},"usage":{"tokensIn":3},"retryable":false});
        journal.after(&receipt).unwrap();
        journal.before(read.clone()).unwrap();
        drop(journal);
        let mut journal = reopen(root.path());
        journal.begin_recovery().unwrap();
        assert_eq!(journal.before(write).unwrap(), Some(receipt));
        assert!(journal.before(read.clone()).unwrap().is_none());
        journal
            .after(&json!({"requestDigest":read.request_digest,"executor":"test","output":17}))
            .unwrap();
        journal.finish().unwrap();
        assert_eq!(journal.records[1].1.attempt, 1);
        let reopened = reopen(root.path());
        assert_eq!(reopened.records.len(), 2);
    }
    #[test]
    fn unknown_write_blocks_before_consuming_recovery_budget() {
        let root = tempfile::tempdir().unwrap();
        let mut journal = journal(root.path());
        journal.before(binding("write", "never")).unwrap();
        drop(journal);
        let mut journal = reopen(root.path());
        assert!(journal.begin_recovery().is_err());
        assert_eq!(journal.recovery_count().unwrap(), 0);
    }
    #[test]
    fn changed_host_binding_poison_prevents_later_dispatch_and_outcome() {
        let root = tempfile::tempdir().unwrap();
        let mut journal = journal(root.path());
        let original = binding("write", "never");
        journal.before(original.clone()).unwrap();
        journal
            .after(
                &json!({"requestDigest":original.request_digest,"executor":"test","output":true}),
            )
            .unwrap();
        drop(journal);
        let mut journal = reopen(root.path());
        journal.begin_recovery().unwrap();
        let mut changed = original.clone();
        changed.configuration_digest = key("different");
        assert!(journal.before(changed).is_err());
        assert!(journal.before(original).is_err());
        assert!(journal.finish().is_err());
    }
    #[test]
    fn read_recovery_budget_is_durable_and_bounded() {
        let root = tempfile::tempdir().unwrap();
        let read = binding("read", "read");
        let mut journal = journal(root.path());
        journal.before(read.clone()).unwrap();
        drop(journal);
        for attempt in 1..=2 {
            let mut journal = reopen(root.path());
            journal.begin_recovery().unwrap();
            journal.before(read.clone()).unwrap();
            assert_eq!(journal.records[0].1.attempt, attempt);
        }
        let mut journal = reopen(root.path());
        assert!(journal.begin_recovery().is_err());
        assert_eq!(journal.recovery_count().unwrap(), 2);
    }
    #[test]
    fn tampered_immutable_record_rejects_open() {
        let root = tempfile::tempdir().unwrap();
        let mut journal = journal(root.path());
        journal.before(binding("read", "read")).unwrap();
        let path = root
            .path()
            .join("values")
            .join(format!("{}.json", &journal.records[0].0[7..]));
        drop(journal);
        std::fs::write(path, "{}").unwrap();
        assert!(Journal::open(root.path(), "worker", &key("intent"), &key("manifest")).is_err());
    }
}
