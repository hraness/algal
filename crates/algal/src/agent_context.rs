//! Exact immutable context, with host permissions separate from content digests.
//! A reference is never authority by itself. Keep the host in trusted code and
//! expose operations bound to one reference to the agent.
use crate::{
    Error, Result,
    canonical::{check_digest, digest},
    capabilities::{capability_handle, parse_capability_handle},
    contract::{integer, keys, object},
    store::Store,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub const MAX_ENTRIES: usize = 1024;
pub const MAX_ENTRY_BYTES: usize = 1_048_576;
pub const MAX_TOTAL_BYTES: usize = 8_388_608;
pub const MAX_LABEL_BYTES: usize = 128;
pub const MAX_READ_BYTES: usize = 65_536;
pub const MAX_SEARCH_RESULTS: usize = 128;
pub const MAX_QUERY_BYTES: usize = 4096;
pub const MAX_GRANTS: usize = 256;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AgentContextKind {
    Instruction,
    Input,
    Observation,
    Output,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct AgentContextEntryInput {
    pub kind: AgentContextKind,
    pub label: String,
    pub text: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AgentContextLimits {
    pub max_read_bytes: usize,
    pub max_scan_bytes: usize,
    pub max_search_results: usize,
}
impl Default for AgentContextLimits {
    fn default() -> Self {
        Self {
            max_read_bytes: MAX_READ_BYTES,
            max_scan_bytes: MAX_TOTAL_BYTES,
            max_search_results: MAX_SEARCH_RESULTS,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct AgentContextRef {
    pub schema: String,
    pub snapshot: String,
    pub capability: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Source {
    digest: String,
    bytes: usize,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Snapshot {
    schema: String,
    entries: Vec<Source>,
}
#[derive(Clone)]
struct Grant {
    snapshot: String,
    indices: Vec<usize>,
    limits: AgentContextLimits,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AgentContextMatch {
    pub index: usize,
    pub start_byte: usize,
    pub end_byte: usize,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AgentContextSearchResult {
    pub matches: Vec<AgentContextMatch>,
    pub scanned_bytes: usize,
    pub complete: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct AgentContextEntryMetadata {
    pub index: usize,
    pub digest: String,
    pub kind: AgentContextKind,
    pub label: String,
    pub bytes: usize,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct AgentContextInspection {
    pub snapshot: String,
    pub entries: Vec<AgentContextEntryMetadata>,
}

fn denied() -> Error {
    Error::new(
        "CAPABILITY_DENIED",
        "agent context scope does not authorize this operation",
    )
}
fn validate_entry(entry: &AgentContextEntryInput) -> Result<()> {
    if entry.label.len() > MAX_LABEL_BYTES || entry.text.len() > MAX_ENTRY_BYTES {
        return Err(Error::invalid("agent context entry exceeds UTF-8 bounds"));
    }
    Ok(())
}
fn parse_entry(value: &Value) -> Result<AgentContextEntryInput> {
    keys(value, &["schema", "kind", "label", "text"])?;
    if value["schema"] != "algal.agent-context-entry.v1" {
        return Err(Error::invalid("invalid agent context entry schema"));
    }
    let mut obj = object(value)?.clone();
    obj.remove("schema");
    let entry: AgentContextEntryInput = serde_json::from_value(Value::Object(obj))?;
    validate_entry(&entry)?;
    Ok(entry)
}
fn load_snapshot(store: &Store, id: &str) -> Result<Snapshot> {
    check_digest(id)?;
    let value = store
        .get_bounded("values", id, 262_144)?
        .ok_or_else(|| Error::new("STORE_MISS", "agent context snapshot unavailable"))?;
    let snapshot: Snapshot = serde_json::from_value(value.clone())?;
    if snapshot.schema != "algal.agent-context.v1" || snapshot.entries.len() > MAX_ENTRIES {
        return Err(Error::invalid("invalid agent context snapshot"));
    }
    let mut total = 0usize;
    for entry in &snapshot.entries {
        check_digest(&entry.digest)?;
        if entry.bytes > MAX_ENTRY_BYTES {
            return Err(Error::invalid("context entry byte limit"));
        }
        total += entry.bytes;
        if total > MAX_TOTAL_BYTES {
            return Err(Error::limit("agent context source byte bound"));
        }
    }
    if digest(&value)? != id {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "agent context snapshot was changed",
        ));
    }
    Ok(snapshot)
}
fn load_entry(store: &Store, source: &Source) -> Result<AgentContextEntryInput> {
    // JSON escaping can expand one source byte into six bytes.
    let value = store
        .get_bounded("values", &source.digest, MAX_ENTRY_BYTES * 6 + 2048)?
        .ok_or_else(|| Error::new("STORE_MISS", "agent context source unavailable"))?;
    let entry = parse_entry(&value)?;
    if digest(&value)? != source.digest || entry.text.len() != source.bytes {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "agent context source was changed",
        ));
    }
    Ok(entry)
}
pub fn parse_agent_context_ref(value: &Value) -> Result<AgentContextRef> {
    let reference: AgentContextRef = serde_json::from_value(value.clone())?;
    if reference.schema != "algal.agent-context-ref.v1" {
        return Err(Error::invalid("invalid agent context reference schema"));
    }
    check_digest(&reference.snapshot)?;
    parse_capability_handle(&reference.capability, Some("agent-context"))?;
    Ok(reference)
}
fn checked_indices(indices: &[usize], count: usize) -> Result<Vec<usize>> {
    if indices.len() > MAX_ENTRIES
        || indices.iter().any(|index| *index >= count)
        || indices.windows(2).any(|pair| pair[0] >= pair[1])
    {
        return Err(Error::invalid(
            "context indices must be in range, unique and increasing",
        ));
    }
    Ok(indices.to_vec())
}
fn checked_limits(
    requested: Option<&Value>,
    ceiling: &AgentContextLimits,
) -> Result<AgentContextLimits> {
    let empty = json!({});
    let value = requested.unwrap_or(&empty);
    keys(value, &["maxReadBytes", "maxScanBytes", "maxSearchResults"])?;
    object(value)?;
    let bounded = |key: &str, max: usize| -> Result<usize> {
        let Some(value) = value.get(key) else {
            return Ok(max);
        };
        integer(value, 1, max)
    };
    Ok(AgentContextLimits {
        max_read_bytes: bounded("maxReadBytes", ceiling.max_read_bytes)?,
        max_scan_bytes: bounded("maxScanBytes", ceiling.max_scan_bytes)?,
        max_search_results: bounded("maxSearchResults", ceiling.max_search_results)?,
    })
}
/// Capture exact source strings in immutable CAS records. Further snapshots and
/// restricted readers preserve these originals; they do not delete sources.
pub fn put_agent_context(store: &mut Store, entries: &[AgentContextEntryInput]) -> Result<String> {
    if entries.len() > MAX_ENTRIES {
        return Err(Error::invalid("context entry count"));
    }
    let mut total = 0usize;
    for entry in entries {
        validate_entry(entry)?;
        total += entry.text.len();
        if total > MAX_TOTAL_BYTES {
            return Err(Error::limit("agent context source byte bound"));
        }
    }
    let mut sources = Vec::new();
    for entry in entries {
        let record = json!({"schema":"algal.agent-context-entry.v1","kind":entry.kind,"label":entry.label,"text":entry.text});
        sources.push(Source {
            digest: store.put("values", &record)?,
            bytes: entry.text.len(),
        });
    }
    store.put(
        "values",
        &json!({"schema":"algal.agent-context.v1","entries":sources}),
    )
}

/// Per-principal host registry. Handles are identifiers, not secrets; the host
/// decides grants and must never restore permission from serialized refs alone.
pub struct AgentContextHost<'a> {
    store: &'a Store,
    grants: BTreeMap<String, Grant>,
}
impl<'a> AgentContextHost<'a> {
    pub fn new(store: &'a Store) -> Self {
        Self {
            store,
            grants: BTreeMap::new(),
        }
    }
    fn registered(&self, reference: &AgentContextRef) -> Result<&Grant> {
        parse_agent_context_ref(&serde_json::to_value(reference)?)?;
        self.grants
            .get(&reference.capability)
            .filter(|grant| grant.snapshot == reference.snapshot)
            .ok_or_else(denied)
    }
    fn register(&mut self, grant: Grant) -> Result<AgentContextRef> {
        let capability = capability_handle(
            "agent-context",
            &json!({"schema":"algal.agent-context-grant.v1","snapshot":grant.snapshot,"indices":grant.indices,"limits":grant.limits}),
        )?;
        if !self.grants.contains_key(&capability) && self.grants.len() >= MAX_GRANTS {
            return Err(Error::limit("agent context grant bound"));
        }
        let reference = AgentContextRef {
            schema: "algal.agent-context-ref.v1".to_owned(),
            snapshot: grant.snapshot.clone(),
            capability: capability.clone(),
        };
        self.grants.insert(capability, grant);
        Ok(reference)
    }
    /// Trusted host-only grant. Permission is not implied by a content digest.
    pub fn grant(
        &mut self,
        snapshot: &str,
        indices: Option<&[usize]>,
        limits: Option<&Value>,
    ) -> Result<AgentContextRef> {
        let record = load_snapshot(self.store, snapshot)?;
        let all: Vec<_> = (0..record.entries.len()).collect();
        let grant = Grant {
            snapshot: snapshot.to_owned(),
            indices: checked_indices(indices.unwrap_or(&all), record.entries.len())?,
            limits: checked_limits(limits, &AgentContextLimits::default())?,
        };
        self.register(grant)
    }
    pub fn delegate(
        &mut self,
        reference: &AgentContextRef,
        indices: &[usize],
        limits: Option<&Value>,
    ) -> Result<AgentContextRef> {
        let parent = self.registered(reference)?;
        let indices = checked_indices(indices, MAX_ENTRIES)?;
        if indices.iter().any(|index| !parent.indices.contains(index)) {
            return Err(denied());
        }
        load_snapshot(self.store, &parent.snapshot)?;
        let grant = Grant {
            snapshot: parent.snapshot.clone(),
            indices,
            limits: checked_limits(limits, &parent.limits)?,
        };
        self.register(grant)
    }
    fn source(
        &self,
        reference: &AgentContextRef,
        index: usize,
    ) -> Result<(&Grant, Source, AgentContextEntryInput)> {
        let grant = self.registered(reference)?;
        if !grant.indices.contains(&index) {
            return Err(denied());
        }
        let record = load_snapshot(self.store, &grant.snapshot)?;
        let source = record.entries[index].clone();
        let value = load_entry(self.store, &source)?;
        Ok((grant, source, value))
    }
    pub fn inspect(&self, reference: &AgentContextRef) -> Result<AgentContextInspection> {
        let grant = self.registered(reference)?;
        let snapshot = load_snapshot(self.store, &grant.snapshot)?;
        let mut entries = Vec::new();
        for index in &grant.indices {
            let source = &snapshot.entries[*index];
            let entry = load_entry(self.store, source)?;
            entries.push(AgentContextEntryMetadata {
                index: *index,
                digest: source.digest.clone(),
                kind: entry.kind,
                label: entry.label,
                bytes: source.bytes,
            });
        }
        Ok(AgentContextInspection {
            snapshot: grant.snapshot.clone(),
            entries,
        })
    }
    pub fn read(
        &self,
        reference: &AgentContextRef,
        index: usize,
    ) -> Result<AgentContextEntryInput> {
        let (grant, source, value) = self.source(reference, index)?;
        if source.bytes > grant.limits.max_read_bytes {
            return Err(Error::limit("context read exceeds byte limit; use slice"));
        }
        Ok(value)
    }
    pub fn slice(
        &self,
        reference: &AgentContextRef,
        index: usize,
        start_byte: usize,
        end_byte: usize,
    ) -> Result<String> {
        let (grant, source, value) = self.source(reference, index)?;
        if start_byte > end_byte
            || end_byte > source.bytes
            || !value.text.is_char_boundary(start_byte)
            || !value.text.is_char_boundary(end_byte)
        {
            return Err(Error::invalid(
                "context slice must use valid UTF-8 boundaries",
            ));
        }
        if end_byte - start_byte > grant.limits.max_read_bytes {
            return Err(Error::limit("context slice exceeds byte limit"));
        }
        Ok(value.text[start_byte..end_byte].to_owned())
    }
    pub fn search(
        &self,
        reference: &AgentContextRef,
        options: &Value,
    ) -> Result<AgentContextSearchResult> {
        let grant = self.registered(reference)?;
        keys(options, &["query", "maxResults", "maxScanBytes"])?;
        let query = options["query"]
            .as_str()
            .filter(|text| !text.is_empty() && text.len() <= MAX_QUERY_BYTES)
            .ok_or_else(|| Error::invalid("context search query byte bound"))?;
        let bounded = |key: &str, max: usize| -> Result<usize> {
            let Some(value) = options.get(key) else {
                return Ok(max);
            };
            integer(value, 1, max)
        };
        let result_limit = bounded("maxResults", grant.limits.max_search_results)?;
        let scan_limit = bounded("maxScanBytes", grant.limits.max_scan_bytes)?;
        let snapshot = load_snapshot(self.store, &grant.snapshot)?;
        let mut result = AgentContextSearchResult {
            matches: Vec::new(),
            scanned_bytes: 0,
            complete: true,
        };
        for index in &grant.indices {
            let source = &snapshot.entries[*index];
            if source.bytes > scan_limit - result.scanned_bytes {
                result.complete = false;
                break;
            }
            let entry = load_entry(self.store, source)?;
            result.scanned_bytes += source.bytes;
            for (position, _) in entry.text.match_indices(query) {
                result.matches.push(AgentContextMatch {
                    index: *index,
                    start_byte: position,
                    end_byte: position + query.len(),
                });
                if result.matches.len() >= result_limit {
                    result.complete = false;
                    return Ok(result);
                }
            }
        }
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn entries() -> Vec<AgentContextEntryInput> {
        vec![
            AgentContextEntryInput {
                kind: AgentContextKind::Instruction,
                label: "original".into(),
                text: "Keep exact 🐚 instructions.\n".into(),
            },
            AgentContextEntryInput {
                kind: AgentContextKind::Input,
                label: "structured".into(),
                text: crate::canonical::canonical(&json!({"z":"東京","a":[1,true]})).unwrap(),
            },
            AgentContextEntryInput {
                kind: AgentContextKind::Observation,
                label: "tool".into(),
                text: "é🐚 é🐚 needle needle".into(),
            },
            AgentContextEntryInput {
                kind: AgentContextKind::Output,
                label: "response".into(),
                text: "private answer".into(),
            },
        ]
    }

    #[test]
    fn exact_sources_and_immutable_snapshots() {
        let mut store = Store::default();
        let original = entries();
        let id = put_agent_context(&mut store, &original).unwrap();
        let mut later = original.clone();
        later.push(AgentContextEntryInput {
            kind: AgentContextKind::Output,
            label: "later".into(),
            text: "new".into(),
        });
        let next = put_agent_context(&mut store, &later).unwrap();
        assert_ne!(id, next);
        let mut host = AgentContextHost::new(&store);
        let reference = host.grant(&id, None, None).unwrap();
        assert_eq!(host.read(&reference, 1).unwrap(), original[1]);
        let mut copy = host.read(&reference, 0).unwrap();
        copy.text = "changed".into();
        assert_eq!(host.read(&reference, 0).unwrap(), original[0]);
        assert_eq!(host.inspect(&reference).unwrap().entries.len(), 4);
        assert!(store.get("values", &id).unwrap().is_some());
    }

    #[test]
    fn references_require_host_permission_and_delegation_attenuates() {
        let mut store = Store::default();
        let id = put_agent_context(&mut store, &entries()).unwrap();
        let empty = put_agent_context(&mut store, &[]).unwrap();
        let mut host = AgentContextHost::new(&store);
        let reference = host.grant(&id, None, None).unwrap();
        assert_eq!(
            AgentContextHost::new(&store)
                .read(&reference, 0)
                .unwrap_err()
                .code,
            "CAPABILITY_DENIED"
        );
        let mut forged = reference.clone();
        forged.snapshot = empty;
        assert_eq!(host.read(&forged, 0).unwrap_err().code, "CAPABILITY_DENIED");
        forged = reference.clone();
        forged.capability =
            capability_handle("agent-context", &json!({"snapshot":id,"indices":[0]})).unwrap();
        assert_eq!(host.read(&forged, 0).unwrap_err().code, "CAPABILITY_DENIED");
        let child = host
            .delegate(
                &reference,
                &[0, 2],
                Some(&json!({"maxReadBytes":8,"maxSearchResults":1})),
            )
            .unwrap();
        assert_eq!(
            host.inspect(&child)
                .unwrap()
                .entries
                .iter()
                .map(|entry| entry.index)
                .collect::<Vec<_>>(),
            vec![0, 2]
        );
        assert_eq!(host.read(&child, 3).unwrap_err().code, "CAPABILITY_DENIED");
        assert_eq!(
            host.delegate(&child, &[1], None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
        assert!(
            host.delegate(&child, &[0], Some(&json!({"maxReadBytes":9})))
                .is_err()
        );
        let none = host.delegate(&child, &[], None).unwrap();
        assert!(host.inspect(&none).unwrap().entries.is_empty());
        for invalid in [vec![0, 0], vec![2, 0], vec![1024]] {
            assert!(host.delegate(&reference, &invalid, None).is_err());
        }
        let mut unknown = serde_json::to_value(&reference).unwrap();
        unknown["trust"] = json!(true);
        assert!(parse_agent_context_ref(&unknown).is_err());
    }

    #[test]
    fn exact_search_and_utf8_slicing_obey_bounds() {
        let mut store = Store::default();
        let id = put_agent_context(&mut store, &entries()).unwrap();
        let bom = put_agent_context(
            &mut store,
            &[AgentContextEntryInput {
                kind: AgentContextKind::Input,
                label: "bom".into(),
                text: "\u{feff}x".into(),
            }],
        )
        .unwrap();
        let mut host = AgentContextHost::new(&store);
        let reference = host
            .grant(&id, Some(&[2]), Some(&json!({"maxReadBytes":6})))
            .unwrap();
        assert_eq!(
            host.read(&reference, 2).unwrap_err().code,
            "BUDGET_EXHAUSTED"
        );
        assert_eq!(host.slice(&reference, 2, 0, 6).unwrap(), "é🐚");
        for (start, end) in [(1, 2), (2, 5), (1, 1), (6, 0), (0, 1000)] {
            assert!(host.slice(&reference, 2, start, end).is_err());
        }
        assert_eq!(host.slice(&reference, 2, 6, 6).unwrap(), "");
        let bom_ref = host.grant(&bom, None, None).unwrap();
        assert_eq!(host.slice(&bom_ref, 0, 0, 4).unwrap(), "\u{feff}x");
        assert_eq!(
            serde_json::to_value(host.search(&reference, &json!({"query":"🐚"})).unwrap()).unwrap(),
            json!({"matches":[{"index":2,"startByte":2,"endByte":6},{"index":2,"startByte":9,"endByte":13}],"scannedBytes":27,"complete":true})
        );
        assert!(
            host.search(&reference, &json!({"query":"private"}))
                .unwrap()
                .matches
                .is_empty()
        );
        assert_eq!(
            serde_json::to_value(
                host.search(&reference, &json!({"query":"needle","maxScanBytes":1}))
                    .unwrap()
            )
            .unwrap(),
            json!({"matches":[],"scannedBytes":0,"complete":false})
        );
        assert!(
            !host
                .search(&reference, &json!({"query":"needle","maxResults":1}))
                .unwrap()
                .complete
        );
        for options in [
            json!({"query":""}),
            json!({"query":"x","maxResults":129}),
            json!({"query":"x","maxResults":null}),
            json!({"query":"x","unknown":true}),
        ] {
            assert!(host.search(&reference, &options).is_err());
        }
    }

    #[test]
    fn foreign_records_and_all_limits_are_checked() {
        let mut store = Store::default();
        let base = AgentContextEntryInput {
            kind: AgentContextKind::Input,
            label: "x".into(),
            text: "".into(),
        };
        let mut invalid = base.clone();
        invalid.label = "é".repeat(65);
        assert!(put_agent_context(&mut store, &[invalid]).is_err());
        invalid = base.clone();
        invalid.text = "x".repeat(MAX_ENTRY_BYTES + 1);
        assert!(put_agent_context(&mut store, &[invalid]).is_err());
        assert!(put_agent_context(&mut store, &vec![base.clone(); 1025]).is_err());
        invalid = base.clone();
        invalid.text = "x".repeat(MAX_ENTRY_BYTES);
        assert_eq!(
            put_agent_context(&mut store, &vec![invalid; 9])
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
        let empty = put_agent_context(&mut store, &[]).unwrap();
        let id = put_agent_context(&mut store, &[base]).unwrap();
        let mut host = AgentContextHost::new(&store);
        let empty_ref = host.grant(&empty, None, None).unwrap();
        assert!(host.inspect(&empty_ref).unwrap().entries.is_empty());
        for options in [
            json!({"maxReadBytes":0}),
            json!({"maxScanBytes":8388609}),
            json!({"maxSearchResults":129}),
            json!({"maxReadBytes":null}),
            json!({"extra":1}),
        ] {
            assert!(host.grant(&empty, Some(&[]), Some(&options)).is_err());
        }
        for n in 1..=255 {
            host.grant(&id, Some(&[0]), Some(&json!({"maxReadBytes":n})))
                .unwrap();
        }
        assert_eq!(
            host.grant(&id, Some(&[0]), Some(&json!({"maxReadBytes":256})))
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
    }

    #[test]
    fn unavailable_corrupt_or_false_size_source_is_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let mut store = Store::open(dir.path(), true).unwrap();
        let id = put_agent_context(&mut store, &entries()).unwrap();
        let snapshot = store.get("values", &id).unwrap().unwrap();
        let source = snapshot["entries"][0]["digest"].as_str().unwrap();
        let path = dir
            .path()
            .join("values")
            .join(format!("{}.json", &source[7..]));
        // Reopen so native Store's trusted in-memory write cache is not involved.
        fs::remove_file(&path).unwrap();
        let reopened = Store::open(dir.path(), false).unwrap();
        let mut host = AgentContextHost::new(&reopened);
        let reference = host.grant(&id, None, None).unwrap();
        assert_eq!(host.read(&reference, 0).unwrap_err().code, "STORE_MISS");
        fs::write(&path, "{}").unwrap();
        assert_eq!(
            host.read(&reference, 0).unwrap_err().code,
            "DIGEST_MISMATCH"
        );

        let mut memory = Store::default();
        let id = put_agent_context(&mut memory, &entries()).unwrap();
        let mut snapshot = memory.get("values", &id).unwrap().unwrap();
        snapshot["entries"][0]["bytes"] = json!(1);
        let bad = memory.put("values", &snapshot).unwrap();
        let mut host = AgentContextHost::new(&memory);
        let reference = host.grant(&bad, None, None).unwrap();
        assert_eq!(
            host.read(&reference, 0).unwrap_err().code,
            "DIGEST_MISMATCH"
        );
    }
}
