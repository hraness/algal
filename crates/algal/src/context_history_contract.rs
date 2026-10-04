use crate::{
    Error, Result, agent_context,
    application_memory::{app_id, app_ref},
    canonical::{canonical, digest},
    capabilities::{capability_handle, parse_capability_handle},
    contract::{integer, keys, list, object},
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};

pub const MAX_LEAVES: usize = agent_context::MAX_ENTRIES;
pub const MAX_ENTRY_BYTES: usize = agent_context::MAX_ENTRY_BYTES;
pub const MAX_SOURCE_BYTES: usize = agent_context::MAX_TOTAL_BYTES;
pub const MAX_LABEL_BYTES: usize = agent_context::MAX_LABEL_BYTES;
pub const MAX_INTERNAL_NODES: usize = 1023;
pub const MAX_TREE_NODES: usize = 2047;
pub const MAX_TREE_DEPTH: usize = 10;
pub const MAX_EPOCHS: usize = 128;
pub const MAX_POSITIONS: usize = 131072;
pub const MAX_GENERATION: usize = 4095;
pub const MAX_HISTORY_BYTES: usize = 2097152;
pub const MAX_LEAF_BYTES: usize = 2048;
pub const MAX_NODE_BYTES: usize = 2048;
pub const MAX_SUMMARY_BYTES: usize = 16384;
pub const MAX_SUMMARY_RECORD_BYTES: usize = 32768;
pub const MAX_REQUEST_BYTES: usize = 4096;
pub const MAX_RESULT_BYTES: usize = 2048;
pub const MAX_GENERATION_BYTES: usize = 262144;
pub const MAX_CURSOR_BYTES: usize = 2048;
pub const MAX_VIEW_BYTES: usize = 65536;
pub const MAX_VIEW_ITEMS: usize = 128;
pub const MAX_GRANT_BYTES: usize = 16384;
pub const MAX_REF_BYTES: usize = 512;
pub const MAX_QUEUE_RECORD_BYTES: usize = 131072;
pub const MAX_QUEUED_JOBS: usize = 1023;
pub const MAX_QUEUE_BYTES: usize = 524288;
pub const MAX_BATCH_JOBS: usize = 32;
pub const MAX_MAINTENANCE_WORK: usize = 67108864;
pub const MAX_JSON_DEPTH: usize = 8;
pub const MAX_JSON_NODES: usize = 16384;

pub const CONTEXT_HISTORY_READ_CEILINGS: [(&str, usize); 6] = [
    ("maxReadBytes", 65536),
    ("maxScanBytes", 8388608),
    ("maxOutputBytes", 65536),
    ("maxNodes", 2047),
    ("maxWork", 67108864),
    ("maxSearchResults", 128),
];
pub const CONTEXT_HISTORY_JOB_CEILINGS: [(&str, usize); 5] = [
    ("maxSourceBytes", 65536),
    ("maxInputBytes", 131072),
    ("maxOutputBytes", 32768),
    ("maxWork", 16777216),
    ("maxModelCalls", 1),
];
const LINEAGE: [&str; 7] = [
    "history",
    "node",
    "sources",
    "children",
    "prompt",
    "policy",
    "summarizer",
];
const UNAVAILABLE: [&str; 4] = [
    "source-unavailable",
    "retention-expired",
    "source-not-selected",
    "revoked",
];
const INCOMPLETE: [&str; 4] = [
    "page-limit",
    "missing-summary",
    "source-unavailable",
    "cancelled",
];
const BUDGET_REASONS: [&str; 5] = [
    "read-limit",
    "scan-limit",
    "output-limit",
    "work-limit",
    "protected-overflow",
];

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ContextHistoryScope {
    pub application: String,
    pub realm: String,
    pub workspace: String,
    pub task: String,
    pub audience: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContextHistoryLeaf {
    pub position: usize,
    pub event: String,
    pub source_index: usize,
    pub entry: String,
    pub bytes: usize,
    pub kind: agent_context::AgentContextKind,
    pub label: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContextHistory {
    pub schema: String,
    pub scope: ContextHistoryScope,
    pub head: String,
    pub snapshot: String,
    pub epoch: usize,
    pub first_position: usize,
    pub leaves: Vec<ContextHistoryLeaf>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ContextHistoryNode {
    pub schema: String,
    pub history: String,
    pub start: usize,
    pub end: usize,
    pub sources: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ContextHistoryRef {
    pub schema: String,
    pub history: String,
    pub capability: String,
}

#[derive(Clone, Copy)]
struct JsonLimits {
    bytes: usize,
    depth: usize,
    nodes: usize,
    entries: usize,
    string: usize,
}
const RECORD_LIMITS: JsonLimits = JsonLimits {
    bytes: MAX_HISTORY_BYTES,
    depth: MAX_JSON_DEPTH,
    nodes: MAX_JSON_NODES,
    entries: MAX_TREE_NODES,
    string: MAX_VIEW_BYTES * 6,
};
fn invalid(message: &str) -> Error {
    Error::invalid(message)
}
fn denied() -> Error {
    Error::new(
        "CAPABILITY_DENIED",
        "context history scope does not authorize this operation",
    )
}
fn closed<'a>(value: &'a Value, fields: &[&str]) -> Result<&'a Map<String, Value>> {
    keys(value, fields)?;
    let row = object(value)?;
    if fields.iter().any(|key| !row.contains_key(*key)) {
        return Err(invalid("context history object has a missing field"));
    }
    Ok(row)
}
fn text(value: &Value, max: usize) -> Result<&str> {
    let s = value
        .as_str()
        .ok_or_else(|| invalid("expected context history text"))?;
    if s.len() > max {
        return Err(invalid("context history text exceeds its UTF-8 bound"));
    }
    Ok(s)
}
fn one_of<'a>(value: &'a Value, allowed: &[&str]) -> Result<&'a str> {
    let s = text(value, 128)?;
    if !allowed.contains(&s) {
        return Err(invalid("invalid context history tag"));
    }
    Ok(s)
}
fn tag(value: &Value, expected: &str) -> Result<()> {
    if value != expected {
        return Err(invalid("invalid context history schema or tag"));
    }
    Ok(())
}
fn encoded(value: &Value) -> Result<usize> {
    Ok(canonical(value)?.len())
}
fn byte_bound(value: &Value, max: usize) -> Result<()> {
    if encoded(value)? > max {
        return Err(Error::limit("context history encoded byte bound"));
    }
    Ok(())
}
fn hash<T: Serialize>(value: &T) -> Result<String> {
    digest(&serde_json::to_value(value)?)
}
fn json_string_bytes(value: &str) -> usize {
    2 + value
        .chars()
        .map(|ch| match ch {
            '"' | '\\' | '\u{8}' | '\t' | '\n' | '\u{c}' | '\r' => 2,
            ch if ch < '\u{20}' => 6,
            ch => ch.len_utf8(),
        })
        .sum::<usize>()
}
fn bounded(value: &Value, limits: JsonLimits) -> Result<Value> {
    struct Walk {
        limits: JsonLimits,
        bytes: usize,
        nodes: usize,
    }
    impl Walk {
        fn charge(&mut self, bytes: usize) -> Result<()> {
            self.bytes = self
                .bytes
                .checked_add(bytes)
                .ok_or_else(|| Error::limit("context history JSON bytes"))?;
            if self.bytes > self.limits.bytes {
                return Err(Error::limit("context history JSON bytes"));
            }
            Ok(())
        }
        fn string(&mut self, s: &str) -> Result<usize> {
            if s.len() > self.limits.string {
                return Err(Error::limit("context history JSON string"));
            }
            let bytes = json_string_bytes(s);
            if bytes - 2 > self.limits.string {
                return Err(Error::limit("context history JSON string"));
            }
            Ok(bytes)
        }
        fn visit(&mut self, value: &Value, depth: usize) -> Result<Value> {
            self.nodes += 1;
            if self.nodes > self.limits.nodes {
                return Err(Error::limit("context history JSON nodes"));
            }
            match value {
                Value::Null => {
                    self.charge(4)?;
                    Ok(Value::Null)
                }
                Value::Bool(b) => {
                    self.charge(if *b { 4 } else { 5 })?;
                    Ok(json!(b))
                }
                Value::Number(number) => {
                    let n = number
                        .as_f64()
                        .filter(|n| n.is_finite())
                        .ok_or_else(|| invalid("finite context history JSON numbers required"))?;
                    self.charge(ryu_js::Buffer::new().format(n).len())?;
                    if (0.0..=9007199254740991.0).contains(&n) && n.fract() == 0.0 {
                        Ok(json!(n as u64))
                    } else {
                        Ok(value.clone())
                    }
                }
                Value::String(s) => {
                    let bytes = self.string(s)?;
                    self.charge(bytes)?;
                    Ok(json!(s))
                }
                Value::Array(values) => {
                    if depth >= self.limits.depth || values.len() > self.limits.entries {
                        return Err(Error::limit("context history JSON depth or entries"));
                    }
                    self.charge(2 + values.len().saturating_sub(1))?;
                    Ok(Value::Array(
                        values
                            .iter()
                            .map(|v| self.visit(v, depth + 1))
                            .collect::<Result<_>>()?,
                    ))
                }
                Value::Object(values) => {
                    if depth >= self.limits.depth || values.len() > self.limits.entries {
                        return Err(Error::limit("context history JSON depth or entries"));
                    }
                    self.charge(2 + values.len().saturating_sub(1))?;
                    let mut names = values.keys().collect::<Vec<_>>();
                    names.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
                    let mut out = Map::new();
                    for name in names {
                        let bytes = self.string(name)?;
                        self.charge(bytes + 1)?;
                        out.insert(name.clone(), self.visit(&values[name], depth + 1)?);
                    }
                    Ok(Value::Object(out))
                }
            }
        }
    }
    Walk {
        limits,
        bytes: 0,
        nodes: 0,
    }
    .visit(value, 0)
}
fn scope(value: &Value) -> Result<()> {
    let fields = ["application", "realm", "workspace", "task", "audience"];
    closed(value, &fields)?;
    for field in fields {
        app_id(&value[field])?;
    }
    Ok(())
}
fn range(start: &Value, end: &Value) -> Result<(usize, usize)> {
    let a = integer(start, 0, MAX_LEAVES - 1)?;
    let b = integer(end, a + 1, MAX_LEAVES)?;
    let len = b - a;
    if !len.is_power_of_two() || !a.is_multiple_of(len) || len.ilog2() as usize > MAX_TREE_DEPTH {
        return Err(invalid(
            "context history ranges must be aligned powers of two",
        ));
    }
    Ok((a, b))
}
fn refs(value: &Value, max: usize) -> Result<Vec<String>> {
    let refs = list(value, max)?
        .iter()
        .map(|v| app_ref(v).map(str::to_owned))
        .collect::<Result<Vec<_>>>()?;
    if refs.iter().collect::<BTreeSet<_>>().len() != refs.len() {
        return Err(invalid("duplicate context history reference"));
    }
    Ok(refs)
}
fn indices(value: &Value) -> Result<Vec<usize>> {
    let indices = list(value, MAX_LEAVES)?
        .iter()
        .map(|v| integer(v, 0, MAX_LEAVES - 1))
        .collect::<Result<Vec<_>>>()?;
    if indices.windows(2).any(|pair| pair[0] >= pair[1]) {
        return Err(invalid(
            "context history indices must be unique and increasing",
        ));
    }
    Ok(indices)
}
fn limits(value: &Value, fields: &[(&str, usize)]) -> Result<()> {
    closed(
        value,
        &fields.iter().map(|(name, _)| *name).collect::<Vec<_>>(),
    )?;
    for (name, max) in fields {
        integer(&value[*name], 1, *max)?;
    }
    Ok(())
}
fn leaf(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "position",
            "event",
            "sourceIndex",
            "entry",
            "bytes",
            "kind",
            "label",
        ],
    )?;
    integer(&value["position"], 0, MAX_POSITIONS - 1)?;
    app_ref(&value["event"])?;
    integer(&value["sourceIndex"], 0, MAX_LEAVES - 1)?;
    app_ref(&value["entry"])?;
    integer(&value["bytes"], 0, MAX_ENTRY_BYTES)?;
    one_of(
        &value["kind"],
        &["instruction", "input", "observation", "output"],
    )?;
    text(&value["label"], MAX_LABEL_BYTES)?;
    Ok(())
}
fn history_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema",
            "scope",
            "head",
            "snapshot",
            "epoch",
            "firstPosition",
            "leaves",
        ],
    )?;
    scope(&value["scope"])?;
    app_ref(&value["head"])?;
    app_ref(&value["snapshot"])?;
    integer(&value["epoch"], 0, MAX_EPOCHS - 1)?;
    let first = integer(&value["firstPosition"], 0, MAX_POSITIONS)?;
    let leaves = list(&value["leaves"], MAX_LEAVES)?;
    if first + leaves.len() > MAX_POSITIONS {
        return Err(invalid("context history logical position bound"));
    }
    let mut events = BTreeSet::new();
    let mut source_indices = BTreeSet::new();
    let mut bodies = BTreeMap::new();
    let mut total = 0;
    for (index, row) in leaves.iter().enumerate() {
        leaf(row)?;
        if integer(&row["position"], 0, MAX_POSITIONS - 1)? != first + index
            || !events.insert(app_ref(&row["event"])?)
            || !source_indices.insert(integer(&row["sourceIndex"], 0, MAX_LEAVES - 1)?)
        {
            return Err(invalid(
                "duplicate source event/index or nonconsecutive context history position",
            ));
        }
        let bytes = integer(&row["bytes"], 0, MAX_ENTRY_BYTES)?;
        total += bytes;
        if total > MAX_SOURCE_BYTES {
            return Err(Error::limit("context history source byte bound exceeded"));
        }
        let metadata = (bytes, &row["kind"], &row["label"]);
        if bodies
            .insert(app_ref(&row["entry"])?, metadata)
            .is_some_and(|previous| previous != metadata)
        {
            return Err(invalid("conflicting metadata for the same original entry"));
        }
    }
    Ok(())
}
fn node_record(value: &Value) -> Result<()> {
    closed(value, &["schema", "history", "start", "end", "sources"])?;
    byte_bound(value, MAX_NODE_BYTES)?;
    app_ref(&value["history"])?;
    range(&value["start"], &value["end"])?;
    app_ref(&value["sources"])?;
    Ok(())
}
fn lineage(value: &Value) -> Result<()> {
    for name in [
        "history",
        "node",
        "sources",
        "prompt",
        "policy",
        "summarizer",
    ] {
        app_ref(&value[name])?;
    }
    let children = refs(&value["children"], 2)?;
    if !children.is_empty() && children.len() != 2 {
        return Err(invalid(
            "a summary must use originals or exactly two ordered children",
        ));
    }
    Ok(())
}
fn summary_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema",
            "history",
            "node",
            "sources",
            "children",
            "prompt",
            "policy",
            "summarizer",
            "body",
        ],
    )?;
    byte_bound(value, MAX_SUMMARY_RECORD_BYTES)?;
    lineage(value)?;
    text(&value["body"], MAX_SUMMARY_BYTES)?;
    Ok(())
}
fn request_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema",
            "history",
            "node",
            "sources",
            "children",
            "prompt",
            "policy",
            "summarizer",
            "generation",
            "limits",
        ],
    )?;
    byte_bound(value, MAX_REQUEST_BYTES)?;
    lineage(value)?;
    integer(&value["generation"], 0, MAX_GENERATION)?;
    limits(&value["limits"], &CONTEXT_HISTORY_JOB_CEILINGS)
}
fn result_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema", "request", "status", "summary", "receipt", "usage", "reason",
        ],
    )?;
    byte_bound(value, MAX_RESULT_BYTES)?;
    app_ref(&value["request"])?;
    let usage = &value["usage"];
    closed(usage, &["inputBytes", "outputBytes", "work", "modelCalls"])?;
    integer(&usage["inputBytes"], 0, 131072)?;
    integer(&usage["outputBytes"], 0, 32768)?;
    integer(&usage["work"], 0, 16777216)?;
    let calls = integer(&usage["modelCalls"], 0, 1)?;
    let status = one_of(
        &value["status"],
        &[
            "complete",
            "failed",
            "cancelled",
            "uncertain",
            "budget-exhausted",
        ],
    )?;
    if status == "complete" {
        app_ref(&value["summary"])?;
        app_ref(&value["receipt"])?;
        if !value["reason"].is_null() {
            return Err(invalid("a complete summary result has no failure reason"));
        }
    } else {
        if !value["summary"].is_null()
            || value["reason"] != status
            || (status == "uncertain" && calls != 1)
        {
            return Err(invalid("invalid incomplete summary result"));
        }
        if !value["receipt"].is_null() {
            app_ref(&value["receipt"])?;
        }
    }
    Ok(())
}
fn generation_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema",
            "history",
            "generation",
            "prompt",
            "policy",
            "summarizer",
            "summaries",
        ],
    )?;
    byte_bound(value, MAX_GENERATION_BYTES)?;
    for name in ["history", "prompt", "policy", "summarizer"] {
        app_ref(&value[name])?;
    }
    integer(&value["generation"], 0, MAX_GENERATION)?;
    let mut nodes = BTreeSet::new();
    let mut summaries = BTreeSet::new();
    for row in list(&value["summaries"], MAX_INTERNAL_NODES)? {
        closed(row, &["node", "summary"])?;
        if !nodes.insert(app_ref(&row["node"])?) || !summaries.insert(app_ref(&row["summary"])?) {
            return Err(invalid("duplicate published summary or source node"));
        }
    }
    Ok(())
}
fn binding(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "history",
            "head",
            "audience",
            "generation",
            "policy",
            "budget",
            "selection",
        ],
    )?;
    app_id(&value["audience"])?;
    for name in [
        "history",
        "head",
        "generation",
        "policy",
        "budget",
        "selection",
    ] {
        app_ref(&value[name])?;
    }
    Ok(())
}
fn cursor_record(value: &Value) -> Result<()> {
    closed(value, &["schema", "binding", "offset"])?;
    tag(&value["schema"], "algal.context-history-cursor.v1")?;
    byte_bound(value, MAX_CURSOR_BYTES)?;
    binding(&value["binding"])?;
    integer(&value["offset"], 0, MAX_LEAVES)?;
    Ok(())
}
fn view_item(value: &Value) -> Result<(usize, usize, usize)> {
    let kind = one_of(
        &value["kind"],
        &["exact", "summary", "pending", "unavailable"],
    )?;
    let mut fields = vec!["kind", "node", "start", "end"];
    fields.extend(match kind {
        "exact" => vec!["text"],
        "summary" => vec!["summary", "text"],
        _ => vec!["reason"],
    });
    closed(value, &fields)?;
    app_ref(&value["node"])?;
    let (start, end) = range(&value["start"], &value["end"])?;
    let bytes = match kind {
        "exact" => {
            if end - start != 1 {
                return Err(invalid("exact view items must name one original leaf"));
            }
            text(&value["text"], 65536)?.len()
        }
        "summary" => {
            if end - start < 2 {
                return Err(invalid("a derived summary must name an internal node"));
            }
            app_ref(&value["summary"])?;
            text(&value["text"], MAX_SUMMARY_BYTES)?.len()
        }
        "pending" => {
            tag(&value["reason"], "missing-summary")?;
            0
        }
        _ => {
            one_of(&value["reason"], &UNAVAILABLE)?;
            0
        }
    };
    Ok((start, end, bytes))
}
fn view_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema", "binding", "limits", "start", "end", "items", "status", "reason", "cursor",
            "usage",
        ],
    )?;
    binding(&value["binding"])?;
    let budget = &value["limits"];
    limits(budget, &CONTEXT_HISTORY_READ_CEILINGS)?;
    byte_bound(
        value,
        integer(&budget["maxOutputBytes"], 1, MAX_VIEW_BYTES)?,
    )?;
    let start = integer(&value["start"], 0, MAX_LEAVES)?;
    let end = integer(&value["end"], start, MAX_LEAVES)?;
    let items = list(&value["items"], MAX_VIEW_ITEMS)?;
    let mut offset = start;
    let mut body_bytes = 0;
    for item in items {
        let (a, b, bytes) = view_item(item)?;
        if a != offset {
            return Err(invalid(
                "context history view coverage has a gap or overlap",
            ));
        }
        offset = b;
        body_bytes += bytes;
    }
    if offset != end {
        return Err(invalid(
            "context history view coverage differs from its declared range",
        ));
    }
    if !value["cursor"].is_null() {
        cursor_record(&value["cursor"])?;
        if value["cursor"]["binding"] != value["binding"]
            || integer(&value["cursor"]["offset"], 0, MAX_LEAVES)? != end
        {
            return Err(invalid(
                "context history continuation changed its captured binding or offset",
            ));
        }
    }
    let usage = &value["usage"];
    closed(usage, &["readBytes", "scanBytes", "nodeVisits", "work"])?;
    let read = integer(
        &usage["readBytes"],
        0,
        integer(&budget["maxReadBytes"], 1, 65536)?,
    )?;
    integer(
        &usage["scanBytes"],
        0,
        integer(&budget["maxScanBytes"], 1, 8388608)?,
    )?;
    let visits = integer(
        &usage["nodeVisits"],
        0,
        integer(&budget["maxNodes"], 1, MAX_TREE_NODES)?,
    )?;
    let work = integer(
        &usage["work"],
        0,
        integer(&budget["maxWork"], 1, MAX_MAINTENANCE_WORK)?,
    )?;
    if read < body_bytes || visits < items.len() || work < visits {
        return Err(invalid(
            "context history view understates displayed bytes or node work",
        ));
    }
    match one_of(
        &value["status"],
        &["complete", "incomplete", "unavailable", "budget-exhausted"],
    )? {
        "complete" => {
            if !value["reason"].is_null()
                || !value["cursor"].is_null()
                || items
                    .iter()
                    .any(|row| row["kind"] == "pending" || row["kind"] == "unavailable")
            {
                return Err(invalid(
                    "a complete view cannot hide missing ranges or a continuation",
                ));
            }
        }
        "incomplete" => {
            one_of(&value["reason"], &INCOMPLETE)?;
        }
        "unavailable" => {
            one_of(&value["reason"], &UNAVAILABLE)?;
            if items
                .iter()
                .any(|row| row["kind"] == "exact" || row["kind"] == "summary")
            {
                return Err(invalid(
                    "an unavailable view cannot contain readable bodies",
                ));
            }
        }
        _ => {
            one_of(&value["reason"], &BUDGET_REASONS)?;
        }
    }
    Ok(())
}
fn grant_record(value: &Value) -> Result<()> {
    closed(value, &["schema", "history", "scope", "indices", "limits"])?;
    byte_bound(value, MAX_GRANT_BYTES)?;
    app_ref(&value["history"])?;
    scope(&value["scope"])?;
    indices(&value["indices"])?;
    limits(&value["limits"], &CONTEXT_HISTORY_READ_CEILINGS)
}
fn access_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema", "history", "scope", "head", "snapshot", "revision", "indices", "state",
        ],
    )?;
    byte_bound(value, MAX_GRANT_BYTES)?;
    scope(&value["scope"])?;
    for name in ["history", "head", "snapshot"] {
        app_ref(&value[name])?;
    }
    integer(&value["revision"], 0, MAX_GENERATION)?;
    indices(&value["indices"])?;
    one_of(&value["state"], &["active", "revoked", "unavailable"])?;
    Ok(())
}
fn ref_record(value: &Value) -> Result<()> {
    closed(value, &["schema", "history", "capability"])?;
    byte_bound(value, MAX_REF_BYTES)?;
    app_ref(&value["history"])?;
    parse_capability_handle(text(&value["capability"], 128)?, Some("context-history"))?;
    Ok(())
}
fn queue_record(value: &Value) -> Result<()> {
    closed(
        value,
        &[
            "schema",
            "history",
            "generation",
            "requests",
            "batchSize",
            "work",
        ],
    )?;
    byte_bound(value, MAX_QUEUE_RECORD_BYTES)?;
    app_ref(&value["history"])?;
    integer(&value["generation"], 0, MAX_GENERATION)?;
    refs(&value["requests"], MAX_QUEUED_JOBS)?;
    integer(&value["batchSize"], 1, MAX_BATCH_JOBS)?;
    integer(&value["work"], 0, MAX_MAINTENANCE_WORK)?;
    Ok(())
}
pub fn parse_context_history_record(input: &Value) -> Result<Value> {
    let value = bounded(input, RECORD_LIMITS)?;
    match text(&value["schema"], 128)? {
        "algal.context-history.v1" => history_record(&value)?,
        "algal.context-history-node.v1" => node_record(&value)?,
        "algal.context-history-summary.v1" => summary_record(&value)?,
        "algal.context-history-summary-request.v1" => request_record(&value)?,
        "algal.context-history-summary-result.v1" => result_record(&value)?,
        "algal.context-history-generation.v1" => generation_record(&value)?,
        "algal.context-history-cursor.v1" => cursor_record(&value)?,
        "algal.context-history-view.v1" => view_record(&value)?,
        "algal.context-history-grant.v1" => grant_record(&value)?,
        "algal.context-history-ref.v1" => ref_record(&value)?,
        "algal.context-history-access.v1" => access_record(&value)?,
        "algal.context-history-queue.v1" => queue_record(&value)?,
        _ => return Err(invalid("invalid context history schema")),
    }
    Ok(value)
}
fn parse(input: &Value, schema: &str) -> Result<Value> {
    let value = parse_context_history_record(input)?;
    tag(&value["schema"], schema)?;
    Ok(value)
}
pub fn parse_context_history_leaf(input: &Value) -> Result<ContextHistoryLeaf> {
    let value = bounded(
        input,
        JsonLimits {
            bytes: MAX_LEAF_BYTES,
            ..RECORD_LIMITS
        },
    )?;
    leaf(&value)?;
    Ok(serde_json::from_value(value)?)
}
pub fn parse_context_history(input: &Value) -> Result<ContextHistory> {
    Ok(serde_json::from_value(parse(
        input,
        "algal.context-history.v1",
    )?)?)
}
pub fn parse_context_history_node(input: &Value) -> Result<ContextHistoryNode> {
    Ok(serde_json::from_value(parse(
        input,
        "algal.context-history-node.v1",
    )?)?)
}
pub fn parse_context_history_summary(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-summary.v1")
}
pub fn parse_context_history_summary_request(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-summary-request.v1")
}
pub fn parse_context_history_summary_result(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-summary-result.v1")
}
pub fn parse_context_history_generation(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-generation.v1")
}
pub fn parse_context_history_cursor(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-cursor.v1")
}
pub fn parse_context_history_view(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-view.v1")
}
pub fn parse_context_history_grant(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-grant.v1")
}
pub fn parse_context_history_access(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-access.v1")
}
pub fn parse_context_history_ref(input: &Value) -> Result<ContextHistoryRef> {
    Ok(serde_json::from_value(parse(
        input,
        "algal.context-history-ref.v1",
    )?)?)
}
pub fn parse_context_history_queue(input: &Value) -> Result<Value> {
    parse(input, "algal.context-history-queue.v1")
}
pub fn context_history_digest(input: &Value) -> Result<String> {
    digest(&parse_context_history_record(input)?)
}

fn source_entry(source: &ContextHistoryLeaf, input: &Value) -> Result<()> {
    let value = bounded(
        input,
        JsonLimits {
            bytes: MAX_ENTRY_BYTES * 6 + 2048,
            depth: 1,
            nodes: 5,
            entries: 4,
            string: MAX_ENTRY_BYTES * 6,
        },
    )?;
    closed(&value, &["schema", "kind", "label", "text"])?;
    tag(&value["schema"], "algal.agent-context-entry.v1")?;
    one_of(
        &value["kind"],
        &["instruction", "input", "observation", "output"],
    )?;
    let label = text(&value["label"], MAX_LABEL_BYTES)?;
    let body = text(&value["text"], MAX_ENTRY_BYTES)?;
    if digest(&value)? != source.entry
        || body.len() != source.bytes
        || value["kind"] != serde_json::to_value(&source.kind)?
        || label != source.label
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "original context history entry differs from captured metadata",
        ));
    }
    Ok(())
}
pub fn validate_context_history_sources(
    history_input: &Value,
    snapshot_input: &Value,
    entries_input: &Value,
) -> Result<()> {
    let history = parse_context_history(history_input)?;
    let snapshot = bounded(
        snapshot_input,
        JsonLimits {
            bytes: 262144,
            depth: 3,
            nodes: 4096,
            entries: MAX_LEAVES,
            string: 100,
        },
    )?;
    closed(&snapshot, &["schema", "entries"])?;
    tag(&snapshot["schema"], "algal.agent-context.v1")?;
    let rows = list(&snapshot["entries"], MAX_LEAVES)?;
    let mut total = 0;
    for row in rows {
        closed(row, &["digest", "bytes"])?;
        app_ref(&row["digest"])?;
        total += integer(&row["bytes"], 0, MAX_ENTRY_BYTES)?;
        if total > MAX_SOURCE_BYTES {
            return Err(Error::limit(
                "original context history snapshot source byte bound",
            ));
        }
    }
    if digest(&snapshot)? != history.snapshot {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "original context history snapshot differs from captured identity",
        ));
    }
    let entries = list(entries_input, MAX_LEAVES)?;
    if entries.len() != history.leaves.len() {
        return Err(invalid(
            "context history source proof count differs from captured leaves",
        ));
    }
    for (source, entry) in history.leaves.iter().zip(entries) {
        let row = rows
            .get(source.source_index)
            .ok_or_else(|| invalid("context history source index exceeds its original snapshot"))?;
        if app_ref(&row["digest"])? != source.entry
            || integer(&row["bytes"], 0, MAX_ENTRY_BYTES)? != source.bytes
        {
            return Err(invalid(
                "context history leaf differs from its original snapshot source",
            ));
        }
        source_entry(source, entry)?;
    }
    Ok(())
}
fn make_node(history: &ContextHistory, start: usize, end: usize) -> Result<ContextHistoryNode> {
    make_node_with_id(history, start, end, &hash(history)?)
}
fn make_node_with_id(
    history: &ContextHistory,
    start: usize,
    end: usize,
    id: &str,
) -> Result<ContextHistoryNode> {
    range(&json!(start), &json!(end))?;
    if end > history.leaves.len() {
        return Err(invalid(
            "context history node extends beyond the captured head",
        ));
    }
    Ok(ContextHistoryNode {
        schema: "algal.context-history-node.v1".to_owned(),
        history: id.to_owned(),
        start,
        end,
        sources: digest(
            &json!({"schema":"algal.context-history-sources.v1","history":id,"leaves":&history.leaves[start..end]}),
        )?,
    })
}
pub fn context_history_node(
    history_input: &Value,
    start: usize,
    end: usize,
) -> Result<ContextHistoryNode> {
    make_node(&parse_context_history(history_input)?, start, end)
}
fn checked_node(history: &ContextHistory, node: &ContextHistoryNode) -> Result<()> {
    checked_node_with_id(history, node, &hash(history)?)
}
fn checked_node_with_id(
    history: &ContextHistory,
    node: &ContextHistoryNode,
    id: &str,
) -> Result<()> {
    if *node != make_node_with_id(history, node.start, node.end, id)? {
        return Err(invalid(
            "context history node has a different history or ordered source set",
        ));
    }
    Ok(())
}
pub fn validate_context_history_node(history_input: &Value, node_input: &Value) -> Result<()> {
    checked_node(
        &parse_context_history(history_input)?,
        &parse_context_history_node(node_input)?,
    )
}
fn recipe_equal(a: &Value, b: &Value) -> bool {
    ["prompt", "policy", "summarizer"]
        .iter()
        .all(|key| a[key] == b[key])
}
fn checked_lineage(
    history: &ContextHistory,
    node: &ContextHistoryNode,
    value: &Value,
    children: &[Value],
) -> Result<()> {
    checked_lineage_with_id(history, node, value, children, &hash(history)?)
}
fn checked_lineage_with_id(
    history: &ContextHistory,
    node: &ContextHistoryNode,
    value: &Value,
    children: &[Value],
    id: &str,
) -> Result<()> {
    checked_node_with_id(history, node, id)?;
    let child_refs = refs(&value["children"], 2)?;
    if node.end - node.start < 2
        || app_ref(&value["history"])? != node.history
        || app_ref(&value["node"])? != hash(node)?
        || app_ref(&value["sources"])? != node.sources
        || children.len() != child_refs.len()
    {
        return Err(invalid(
            "summary lineage differs from the captured source node",
        ));
    }
    if children.is_empty() {
        return Ok(());
    }
    if node.end - node.start < 4 {
        return Err(invalid(
            "summary children must name internal nodes, not original leaves",
        ));
    }
    let middle = (node.start + node.end) / 2;
    let halves = [
        make_node_with_id(history, node.start, middle, id)?,
        make_node_with_id(history, middle, node.end, id)?,
    ];
    for (index, child) in children.iter().enumerate() {
        let half = &halves[index];
        if digest(child)? != child_refs[index]
            || child["history"] != value["history"]
            || app_ref(&child["node"])? != hash(half)?
            || app_ref(&child["sources"])? != half.sources
            || !recipe_equal(value, child)
        {
            return Err(invalid(
                "summary child has a different history, audience, range, body or recipe",
            ));
        }
    }
    Ok(())
}
pub fn validate_context_history_summary(
    history_input: &Value,
    node_input: &Value,
    summary_input: &Value,
    children_input: &Value,
) -> Result<()> {
    let children = list(children_input, 2)?
        .iter()
        .map(parse_context_history_summary)
        .collect::<Result<Vec<_>>>()?;
    checked_lineage(
        &parse_context_history(history_input)?,
        &parse_context_history_node(node_input)?,
        &parse_context_history_summary(summary_input)?,
        &children,
    )
}
pub fn validate_context_history_summary_request(
    history_input: &Value,
    node_input: &Value,
    request_input: &Value,
    children_input: &Value,
) -> Result<()> {
    let history = parse_context_history(history_input)?;
    let node = parse_context_history_node(node_input)?;
    let request = parse_context_history_summary_request(request_input)?;
    let children = list(children_input, 2)?
        .iter()
        .map(parse_context_history_summary)
        .collect::<Result<Vec<_>>>()?;
    checked_lineage(&history, &node, &request, &children)?;
    let raw = history.leaves[node.start..node.end]
        .iter()
        .map(|row| row.bytes)
        .sum::<usize>();
    if children.is_empty() && raw > integer(&request["limits"]["maxSourceBytes"], 1, 65536)? {
        return Err(Error::limit(
            "summary request exceeds its original-source read allowance",
        ));
    }
    if !children.is_empty()
        && encoded(&json!(children))? > integer(&request["limits"]["maxInputBytes"], 1, 131072)?
    {
        return Err(Error::limit(
            "summary request exceeds its encoded child input allowance",
        ));
    }
    Ok(())
}
pub fn validate_context_history_summary_result(
    request_input: &Value,
    result_input: &Value,
    summary_input: Option<&Value>,
) -> Result<()> {
    let request = parse_context_history_summary_request(request_input)?;
    let result = parse_context_history_summary_result(result_input)?;
    if app_ref(&result["request"])? != digest(&request)? {
        return Err(invalid("summary result belongs to a different request"));
    }
    for (field, cap) in [
        ("inputBytes", "maxInputBytes"),
        ("outputBytes", "maxOutputBytes"),
        ("work", "maxWork"),
        ("modelCalls", "maxModelCalls"),
    ] {
        if result["usage"][field].as_u64() > request["limits"][cap].as_u64() {
            return Err(Error::limit(
                "summary result exceeds its requested work allowance",
            ));
        }
    }
    if result["status"] != "complete" {
        if summary_input.is_some() {
            return Err(invalid(
                "an incomplete summary result cannot publish a derivative",
            ));
        }
        return Ok(());
    }
    let summary = parse_context_history_summary(
        summary_input.ok_or_else(|| invalid("missing completed summary body"))?,
    )?;
    if digest(&summary)? != app_ref(&result["summary"])?
        || integer(&result["usage"]["outputBytes"], 0, MAX_SUMMARY_RECORD_BYTES)?
            != encoded(&summary)?
        || LINEAGE.iter().any(|key| summary[key] != request[key])
    {
        return Err(invalid(
            "summary result changed its body, lineage, recipe or encoded output size",
        ));
    }
    Ok(())
}
fn internal_node_count(leaves: usize) -> usize {
    leaves - leaves.count_ones() as usize
}
struct Pool {
    nodes: BTreeMap<String, ContextHistoryNode>,
    summaries: BTreeMap<String, Value>,
}
fn checked_pool(
    history: &ContextHistory,
    generation: &Value,
    nodes_input: &Value,
    summaries_input: &Value,
    complete: bool,
) -> Result<Pool> {
    let history_id = hash(history)?;
    if app_ref(&generation["history"])? != history_id {
        return Err(invalid(
            "summary generation belongs to another captured history or audience",
        ));
    }
    let node_rows = list(nodes_input, MAX_TREE_NODES)?
        .iter()
        .map(parse_context_history_node)
        .collect::<Result<Vec<_>>>()?;
    let summary_rows = list(summaries_input, MAX_INTERNAL_NODES)?
        .iter()
        .map(parse_context_history_summary)
        .collect::<Result<Vec<_>>>()?;
    let published = list(&generation["summaries"], MAX_INTERNAL_NODES)?;
    let count = internal_node_count(history.leaves.len());
    if node_rows.len() > history.leaves.len() + count
        || summary_rows.len() > count
        || published.len() > count
    {
        return Err(invalid(
            "captured history tree or internal summary capacity exceeded",
        ));
    }
    let mut nodes = BTreeMap::new();
    let mut summaries = BTreeMap::new();
    for node in &node_rows {
        checked_node_with_id(history, node, &history_id)?;
        nodes.insert(hash(node)?, node.clone());
    }
    for summary in &summary_rows {
        summaries.insert(digest(summary)?, summary.clone());
    }
    if nodes.len() != node_rows.len() || summaries.len() != summary_rows.len() {
        return Err(invalid(
            "duplicate source descriptor or conflicting summary body",
        ));
    }
    if complete && summary_rows.len() != published.len() {
        return Err(invalid(
            "published generation has missing or extra summaries",
        ));
    }
    let publications = published
        .iter()
        .map(|row| Ok((app_ref(&row["summary"])?, app_ref(&row["node"])?)))
        .collect::<Result<BTreeMap<_, _>>>()?;
    for summary in &summary_rows {
        let id = digest(summary)?;
        let node_id = app_ref(&summary["node"])?;
        let node = nodes
            .get(node_id)
            .ok_or_else(|| invalid("published source descriptor is unavailable"))?;
        if publications.get(id.as_str()).copied() != Some(node_id)
            || !recipe_equal(summary, generation)
        {
            return Err(invalid(
                "published summary differs from its generation or source descriptor",
            ));
        }
        let children = refs(&summary["children"], 2)?
            .iter()
            .map(|id| {
                summaries
                    .get(id)
                    .cloned()
                    .ok_or_else(|| invalid("published summary child is unavailable"))
            })
            .collect::<Result<Vec<_>>>()?;
        checked_lineage_with_id(history, node, summary, &children, &history_id)?;
    }
    if complete
        && published
            .iter()
            .any(|row| !summaries.contains_key(row["summary"].as_str().unwrap_or_default()))
    {
        return Err(invalid(
            "published generation contains an unavailable summary",
        ));
    }
    Ok(Pool { nodes, summaries })
}
pub fn validate_context_history_generation(
    history_input: &Value,
    generation_input: &Value,
    nodes_input: &Value,
    summaries_input: &Value,
) -> Result<()> {
    checked_pool(
        &parse_context_history(history_input)?,
        &parse_context_history_generation(generation_input)?,
        nodes_input,
        summaries_input,
        true,
    )?;
    Ok(())
}
pub fn validate_context_history_view(
    history_input: &Value,
    generation_input: &Value,
    view_input: &Value,
    nodes_input: &Value,
    summaries_input: &Value,
    cursor_input: Option<&Value>,
) -> Result<()> {
    let history = parse_context_history(history_input)?;
    let generation = parse_context_history_generation(generation_input)?;
    let view = parse_context_history_view(view_input)?;
    let pool = checked_pool(&history, &generation, nodes_input, summaries_input, false)?;
    let binding = &view["binding"];
    if app_ref(&binding["history"])? != hash(&history)?
        || app_ref(&binding["head"])? != history.head
        || app_id(&binding["audience"])? != history.scope.audience
        || app_ref(&binding["generation"])? != digest(&generation)?
        || binding["policy"] != generation["policy"]
        || app_ref(&binding["budget"])? != digest(&view["limits"])?
    {
        return Err(invalid(
            "context history view changed its captured head, audience, generation, policy or budget",
        ));
    }
    let end = integer(&view["end"], 0, MAX_LEAVES)?;
    if end > history.leaves.len()
        || (view["status"] == "complete" && end != history.leaves.len())
        || (end < history.leaves.len()
            && view["cursor"].is_null()
            && view["status"] != "unavailable")
    {
        return Err(invalid(
            "context history view omits its unfinished captured prefix",
        ));
    }
    if let Some(cursor_input) = cursor_input {
        let cursor = parse_context_history_cursor(cursor_input)?;
        if cursor["binding"] != *binding || cursor["offset"] != view["start"] {
            return Err(invalid(
                "context history continuation belongs to a different head, audience, generation, selection or budget",
            ));
        }
    }
    for item in list(&view["items"], MAX_VIEW_ITEMS)? {
        let node = pool
            .nodes
            .get(app_ref(&item["node"])?)
            .ok_or_else(|| invalid("context history view source descriptor is unavailable"))?;
        if node.start != integer(&item["start"], 0, MAX_LEAVES - 1)?
            || node.end != integer(&item["end"], 1, MAX_LEAVES)?
        {
            return Err(invalid(
                "context history view item changed its source range",
            ));
        }
        if item["kind"] == "exact" {
            let source = &history.leaves[node.start];
            source_entry(
                source,
                &json!({"schema":"algal.agent-context-entry.v1","kind":source.kind,"label":source.label,"text":item["text"]}),
            )?;
        } else if item["kind"] == "summary" {
            let summary = pool
                .summaries
                .get(app_ref(&item["summary"])?)
                .ok_or_else(|| invalid("published view summary is unavailable"))?;
            if summary["node"] != item["node"] || summary["body"] != item["text"] {
                return Err(invalid(
                    "context history view changed a published summary body",
                ));
            }
        }
    }
    Ok(())
}
pub fn validate_context_history_queue(
    history_input: &Value,
    queue_input: &Value,
    requests_input: &Value,
) -> Result<()> {
    let history = parse_context_history(history_input)?;
    let queue = parse_context_history_queue(queue_input)?;
    let requests = list(requests_input, MAX_QUEUED_JOBS)?
        .iter()
        .map(parse_context_history_summary_request)
        .collect::<Result<Vec<_>>>()?;
    let requested = refs(&queue["requests"], MAX_QUEUED_JOBS)?;
    if app_ref(&queue["history"])? != hash(&history)?
        || requests.len() != requested.len()
        || requests.len() > internal_node_count(history.leaves.len())
        || requests
            .iter()
            .map(|row| row["node"].as_str().unwrap_or_default())
            .collect::<BTreeSet<_>>()
            .len()
            != requests.len()
    {
        return Err(invalid(
            "summary queue changed its history, source jobs or internal-node capacity",
        ));
    }
    let mut bytes = encoded(&queue)?;
    let mut work = 0usize;
    for (index, request) in requests.iter().enumerate() {
        if digest(request)? != requested[index]
            || request["history"] != queue["history"]
            || request["generation"] != queue["generation"]
        {
            return Err(invalid(
                "summary queue request belongs to a different history or generation",
            ));
        }
        bytes = bytes
            .checked_add(encoded(request)?)
            .ok_or_else(|| Error::limit("summary queue encoded bytes"))?;
        work = work
            .checked_add(integer(&request["limits"]["maxWork"], 1, 16777216)?)
            .ok_or_else(|| Error::limit("summary queue rebuild work"))?;
        if bytes > MAX_QUEUE_BYTES || work > MAX_MAINTENANCE_WORK {
            return Err(Error::limit(
                "summary queue exceeds its encoded bytes or total rebuild work",
            ));
        }
    }
    if work != integer(&queue["work"], 0, MAX_MAINTENANCE_WORK)? {
        return Err(invalid(
            "summary queue planned work differs from its requests",
        ));
    }
    Ok(())
}
pub fn context_history_ref(grant_input: &Value) -> Result<ContextHistoryRef> {
    let grant = parse_context_history_grant(grant_input)?;
    Ok(ContextHistoryRef {
        schema: "algal.context-history-ref.v1".to_owned(),
        history: app_ref(&grant["history"])?.to_owned(),
        capability: capability_handle("context-history", &grant)?,
    })
}
pub fn validate_context_history_access(
    history_input: &Value,
    ref_input: &Value,
    grant_input: &Value,
    access_input: &Value,
    node_input: Option<&Value>,
) -> Result<()> {
    let history = parse_context_history(history_input)?;
    let reference = parse_context_history_ref(ref_input)?;
    let grant = parse_context_history_grant(grant_input)?;
    let access = parse_context_history_access(access_input)?;
    let id = hash(&history)?;
    let history_scope = serde_json::to_value(&history.scope)?;
    if access["state"] != "active"
        || reference.history != id
        || app_ref(&grant["history"])? != id
        || app_ref(&access["history"])? != id
        || reference.capability != context_history_ref(&grant)?.capability
        || history_scope != grant["scope"]
        || history_scope != access["scope"]
        || app_ref(&access["head"])? != history.head
        || app_ref(&access["snapshot"])? != history.snapshot
    {
        return Err(denied());
    }
    let granted = indices(&grant["indices"])?
        .into_iter()
        .collect::<BTreeSet<_>>();
    let current = indices(&access["indices"])?
        .into_iter()
        .collect::<BTreeSet<_>>();
    let catalog = history
        .leaves
        .iter()
        .map(|row| row.source_index)
        .collect::<BTreeSet<_>>();
    if !granted.is_subset(&catalog) {
        return Err(denied());
    }
    let selected = if let Some(node_input) = node_input {
        let node = parse_context_history_node(node_input)?;
        checked_node(&history, &node)?;
        &history.leaves[node.start..node.end]
    } else {
        &history.leaves
    };
    if selected
        .iter()
        .any(|row| !granted.contains(&row.source_index) || !current.contains(&row.source_index))
    {
        return Err(denied());
    }
    Ok(())
}
pub fn validate_context_history_delegation(
    parent_input: &Value,
    child_input: &Value,
) -> Result<()> {
    let parent = parse_context_history_grant(parent_input)?;
    let child = parse_context_history_grant(child_input)?;
    let parent_indices = indices(&parent["indices"])?
        .into_iter()
        .collect::<BTreeSet<_>>();
    if parent["history"] != child["history"]
        || parent["scope"] != child["scope"]
        || indices(&child["indices"])?
            .iter()
            .any(|index| !parent_indices.contains(index))
        || CONTEXT_HISTORY_READ_CEILINGS
            .iter()
            .any(|(name, _)| child["limits"][name].as_u64() > parent["limits"][name].as_u64())
    {
        return Err(denied());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canonical::{canonical, digest};
    use serde_json::{Value, json};

    fn fixture() -> Value {
        serde_json::from_str(include_str!(
            "../../../scripts/fixtures/context-history.json"
        ))
        .unwrap()
    }
    fn record(fixture: &Value, name: &str) -> Value {
        fixture["records"][name].clone()
    }
    fn nodes(f: &Value) -> Value {
        Value::Array(
            ["leaf0", "leaf1", "leaf2", "leaf3", "left", "right", "root"]
                .map(|name| record(f, name))
                .to_vec(),
        )
    }
    fn summaries(f: &Value) -> Value {
        Value::Array(
            ["summaryLeft", "summaryRight", "summaryRoot"]
                .map(|name| record(f, name))
                .to_vec(),
        )
    }
    fn children(f: &Value) -> Value {
        json!([record(f, "summaryLeft"), record(f, "summaryRight")])
    }
    fn descend<'a>(value: &'a mut Value, path: &[Value]) -> &'a mut Value {
        let mut target = value;
        for key in path {
            target = if let Some(key) = key.as_str() {
                target.get_mut(key).unwrap()
            } else {
                target.get_mut(key.as_u64().unwrap() as usize).unwrap()
            };
        }
        target
    }
    fn changed(value: &Value, path: &Value, replacement: Value) -> Value {
        let mut out = value.clone();
        let path = path.as_array().unwrap();
        let parent = descend(&mut out, &path[..path.len() - 1]);
        let key = path.last().unwrap();
        if let Some(key) = key.as_str() {
            parent
                .as_object_mut()
                .unwrap()
                .insert(key.to_owned(), replacement);
        } else {
            parent[key.as_u64().unwrap() as usize] = replacement;
        }
        out
    }
    fn objects(value: &Value, path: Vec<Value>, out: &mut Vec<(Vec<Value>, Vec<String>)>) {
        match value {
            Value::Object(values) => {
                out.push((path.clone(), values.keys().cloned().collect()));
                for (key, value) in values {
                    let mut next = path.clone();
                    next.push(json!(key));
                    objects(value, next, out);
                }
            }
            Value::Array(values) => {
                for (index, value) in values.iter().enumerate() {
                    let mut next = path.clone();
                    next.push(json!(index));
                    objects(value, next, out);
                }
            }
            _ => (),
        }
    }
    fn other() -> Value {
        json!(digest(&json!({"name":"other"})).unwrap())
    }
    fn view_variant(f: &Value, row: &Value) -> Value {
        let mut out = record(f, row["base"].as_str().unwrap());
        for change in row["changes"].as_array().unwrap() {
            out = changed(&out, &change["path"], change["value"].clone());
        }
        out
    }
    fn large_history(f: &Value, count: usize) -> Value {
        let mut history = record(f, "history");
        history["epoch"] = json!(127);
        history["firstPosition"] = json!(131072 - count);
        history["leaves"] = Value::Array((0..count).map(|index| json!({
            "position":131072 - count + index,
            "event":digest(&json!({"event":index})).unwrap(), "sourceIndex":index,
            "entry":digest(&json!({"entry":index})).unwrap(),
            "bytes":if index < 8 {1048576} else {0}, "kind":"input", "label":"\0".repeat(128)
        })).collect());
        history
    }

    #[test]
    fn fixed_shared_canonical_vectors_and_degraded_views() {
        let f = fixture();
        for (name, value) in f["records"].as_object().unwrap() {
            assert_eq!(
                context_history_digest(value).unwrap(),
                f["digests"][name],
                "{name}"
            );
            let parsed =
                serde_json::to_value(parse_context_history_record(value).unwrap()).unwrap();
            assert_eq!(
                canonical(&parsed).unwrap(),
                canonical(value).unwrap(),
                "{name}"
            );
        }
        for row in f["validViews"].as_array().unwrap() {
            let value = view_variant(&f, row);
            assert_eq!(context_history_digest(&value).unwrap(), row["digest"]);
            validate_context_history_view(
                &record(&f, "history"),
                &record(&f, "generation"),
                &value,
                &nodes(&f),
                &summaries(&f),
                None,
            )
            .unwrap();
        }
    }

    #[test]
    fn shared_failure_results_and_identical_bodies_in_distinct_events() {
        let f = fixture();
        for row in f["validResults"].as_array().unwrap() {
            let result = view_variant(&f, row);
            assert_eq!(context_history_digest(&result).unwrap(), row["digest"]);
            validate_context_history_summary_result(&record(&f, "request"), &result, None).unwrap();
            assert!(
                validate_context_history_summary_result(
                    &record(&f, "request"),
                    &result,
                    Some(&record(&f, "summaryRoot"))
                )
                .is_err()
            );
        }
        let mut history = record(&f, "history");
        let mut snapshot = f["snapshot"].clone();
        for key in ["entry", "bytes", "kind", "label"] {
            history["leaves"][1][key] = history["leaves"][0][key].clone();
        }
        snapshot["entries"][1] = snapshot["entries"][0].clone();
        history["snapshot"] = json!(digest(&snapshot).unwrap());
        validate_context_history_sources(
            &history,
            &snapshot,
            &json!([
                f["sources"][0],
                f["sources"][0],
                f["sources"][2],
                f["sources"][3]
            ]),
        )
        .unwrap();
        assert!(
            parse_context_history(&changed(
                &history,
                &json!(["leaves", 1, "label"]),
                json!("different body label")
            ))
            .is_err()
        );
    }

    #[test]
    fn valid_sources_nodes_jobs_generations_queues_and_pages() {
        let f = fixture();
        let history = record(&f, "history");
        validate_context_history_sources(&history, &f["snapshot"], &f["sources"]).unwrap();
        for node in nodes(&f).as_array().unwrap() {
            validate_context_history_node(&history, node).unwrap();
        }
        assert_eq!(
            serde_json::to_value(context_history_node(&history, 0, 4).unwrap()).unwrap(),
            record(&f, "root")
        );
        validate_context_history_summary(
            &history,
            &record(&f, "root"),
            &record(&f, "summaryRoot"),
            &children(&f),
        )
        .unwrap();
        validate_context_history_summary_request(
            &history,
            &record(&f, "root"),
            &record(&f, "request"),
            &children(&f),
        )
        .unwrap();
        validate_context_history_summary_result(
            &record(&f, "request"),
            &record(&f, "result"),
            Some(&record(&f, "summaryRoot")),
        )
        .unwrap();
        validate_context_history_generation(
            &history,
            &record(&f, "generation"),
            &nodes(&f),
            &summaries(&f),
        )
        .unwrap();
        validate_context_history_queue(
            &history,
            &record(&f, "queue"),
            &json!([record(&f, "request")]),
        )
        .unwrap();
        validate_context_history_view(
            &history,
            &record(&f, "generation"),
            &record(&f, "view"),
            &nodes(&f),
            &summaries(&f),
            None,
        )
        .unwrap();
        validate_context_history_view(
            &history,
            &record(&f, "generation"),
            &record(&f, "tail"),
            &nodes(&f),
            &summaries(&f),
            Some(&record(&f, "cursor")),
        )
        .unwrap();
        validate_context_history_access(
            &history,
            &record(&f, "ref"),
            &record(&f, "grant"),
            &record(&f, "access"),
            None,
        )
        .unwrap();
        assert_eq!(
            serde_json::to_value(context_history_ref(&record(&f, "grant")).unwrap()).unwrap(),
            record(&f, "ref")
        );
    }

    #[test]
    fn all_object_keys_are_required_and_closed() {
        let f = fixture();
        let mut values = f["records"]
            .as_object()
            .unwrap()
            .values()
            .cloned()
            .collect::<Vec<_>>();
        values.extend(
            f["validViews"]
                .as_array()
                .unwrap()
                .iter()
                .chain(f["validResults"].as_array().unwrap())
                .map(|row| view_variant(&f, row)),
        );
        for value in values {
            let mut paths = Vec::new();
            objects(&value, vec![], &mut paths);
            for (path, keys) in paths {
                let mut unknown = value.clone();
                descend(&mut unknown, &path)
                    .as_object_mut()
                    .unwrap()
                    .insert("unknown".to_owned(), json!(true));
                assert!(parse_context_history_record(&unknown).is_err());
                for key in keys {
                    let mut missing = value.clone();
                    descend(&mut missing, &path)
                        .as_object_mut()
                        .unwrap()
                        .remove(&key);
                    assert!(
                        parse_context_history_record(&missing).is_err(),
                        "path {path:?}, field {key}"
                    );
                }
            }
        }
    }

    #[test]
    fn shared_refusals_and_every_numeric_limit() {
        let f = fixture();
        for row in f["refusals"].as_array().unwrap() {
            let value = changed(
                &record(&f, row["record"].as_str().unwrap()),
                &row["path"],
                row["value"].clone(),
            );
            assert!(parse_context_history_record(&value).is_err(), "{row}");
        }
        for row in f["numericBounds"].as_array().unwrap() {
            let max = row["max"].as_u64().unwrap();
            for replacement in [
                json!(max + 1),
                json!(-1),
                json!(0.5),
                Value::Null,
                json!("1"),
                json!(true),
            ] {
                let value = changed(
                    &record(&f, row["record"].as_str().unwrap()),
                    &row["path"],
                    replacement,
                );
                assert!(parse_context_history_record(&value).is_err(), "{row}");
            }
        }
    }

    #[test]
    fn unicode_ingress_and_semantic_json_normalization() {
        let f = fixture();
        assert!(serde_json::from_str::<Value>(r#"{"label":"\ud800"}"#).is_err());
        assert!(serde_json::from_str::<Value>(r#"{"label":"\udc00"}"#).is_err());
        let history = record(&f, "history");
        assert_eq!(
            context_history_digest(&changed(&history, &json!(["epoch"]), json!(-0.0))).unwrap(),
            f["digests"]["history"]
        );
        assert_eq!(
            context_history_digest(&changed(&history, &json!(["epoch"]), json!(0.0))).unwrap(),
            f["digests"]["history"]
        );
        assert!(
            parse_context_history_record(&changed(
                &history,
                &json!(["leaves", 0, "label"]),
                json!("é".repeat(64))
            ))
            .is_ok()
        );
        assert!(
            parse_context_history_record(&changed(
                &history,
                &json!(["leaves", 0, "label"]),
                json!("é".repeat(65))
            ))
            .is_err()
        );
        assert!(
            parse_context_history_record(&changed(
                &record(&f, "summaryLeft"),
                &json!(["body"]),
                json!("𝄞\u{feff}東京\n\0")
            ))
            .is_ok()
        );
    }

    #[test]
    fn maximum_capture_tree_depth_and_encoded_json_overhead() {
        let f = fixture();
        let history = large_history(&f, 1024);
        let parsed = parse_context_history(&history).unwrap();
        assert_eq!(parsed.leaves.len(), 1024);
        assert_eq!(
            parsed.leaves.iter().map(|leaf| leaf.bytes).sum::<usize>(),
            8388608
        );
        assert!(canonical(&history).unwrap().len() <= MAX_HISTORY_BYTES);
        let root = context_history_node(&history, 0, 1024).unwrap();
        assert_eq!((root.end - root.start).ilog2(), 10);
        assert_eq!(MAX_INTERNAL_NODES, 1023);
        assert_eq!(MAX_TREE_NODES, 2047);
        assert!(parse_context_history(&large_history(&f, 1025)).is_err());
        assert!(
            parse_context_history(&changed(&history, &json!(["leaves", 8, "bytes"]), json!(1)))
                .is_err()
        );
        assert!(
            parse_context_history(&changed(
                &history,
                &json!(["leaves", 0, "label"]),
                json!("\0".repeat(129))
            ))
            .is_err()
        );
        assert!(context_history_node(&history, 0, 2048).is_err());
        assert!(
            parse_context_history_record(&changed(
                &record(&f, "summaryLeft"),
                &json!(["body"]),
                json!("x".repeat(16384))
            ))
            .is_ok()
        );
        assert!(
            parse_context_history_record(&changed(
                &record(&f, "summaryLeft"),
                &json!(["body"]),
                json!("x".repeat(16385))
            ))
            .is_err()
        );
        assert!(
            parse_context_history_record(&changed(
                &record(&f, "summaryLeft"),
                &json!(["body"]),
                json!("\0".repeat(6000))
            ))
            .is_err()
        );
        let mut page = record(&f, "tail");
        page["start"] = json!(3);
        page["items"] = json!([{"kind":"exact","node":f["digests"]["leaf3"],"start":3,"end":4,"text":"\0".repeat(11000)}]);
        page["usage"]["readBytes"] = json!(11000);
        assert!(parse_context_history_record(&page).is_err());
        let page = changed(
            &record(&f, "tail"),
            &json!(["limits", "maxOutputBytes"]),
            json!(1024),
        );
        let bytes = canonical(&page).unwrap().len();
        assert!(
            parse_context_history_record(&changed(
                &page,
                &json!(["limits", "maxOutputBytes"]),
                json!(bytes)
            ))
            .is_ok()
        );
        assert!(
            parse_context_history_record(&changed(
                &page,
                &json!(["limits", "maxOutputBytes"]),
                json!(bytes - 1)
            ))
            .is_err()
        );
        let rows = vec![record(&f, "root"); 2048];
        assert!(
            validate_context_history_generation(
                &record(&f, "history"),
                &record(&f, "generation"),
                &json!(rows),
                &summaries(&f)
            )
            .is_err()
        );
        let generation = record(&f, "generation");
        assert!(
            parse_context_history_record(&changed(
                &generation,
                &json!(["summaries"]),
                json!(vec![generation["summaries"][0].clone(); 1024])
            ))
            .is_err()
        );
        assert!(
            parse_context_history_record(&changed(
                &record(&f, "queue"),
                &json!(["requests"]),
                json!(vec![other(); 1024])
            ))
            .is_err()
        );
    }

    #[test]
    fn maximum_original_body_uses_the_existing_v1_record() {
        let f = fixture();
        let source = json!({"schema":"algal.agent-context-entry.v1","kind":"input","label":"\0".repeat(128),"text":"\0".repeat(1048576)});
        let snapshot = json!({"schema":"algal.agent-context.v1","entries":[{"digest":digest(&source).unwrap(),"bytes":1048576}]});
        let mut history = record(&f, "history");
        history["snapshot"] = json!(digest(&snapshot).unwrap());
        history["leaves"] = json!([{"position":0,"event":f["records"]["history"]["leaves"][0]["event"],"sourceIndex":0,"entry":digest(&source).unwrap(),"bytes":1048576,"kind":"input","label":source["label"]}]);
        validate_context_history_sources(&history, &snapshot, &json!([source])).unwrap();
    }

    #[test]
    fn cross_record_sources_jobs_publications_and_pages_refuse_substitution() {
        let f = fixture();
        let history = record(&f, "history");
        assert!(
            validate_context_history_sources(
                &history,
                &changed(&f["snapshot"], &json!(["entries", 0, "bytes"]), json!(25)),
                &f["sources"]
            )
            .is_err()
        );
        assert!(
            validate_context_history_sources(
                &history,
                &f["snapshot"],
                &changed(&f["sources"], &json!([0, "text"]), json!("changed"))
            )
            .is_err()
        );
        assert!(
            validate_context_history_node(
                &history,
                &changed(&record(&f, "root"), &json!(["history"]), other())
            )
            .is_err()
        );
        assert!(
            validate_context_history_node(
                &history,
                &changed(&record(&f, "root"), &json!(["sources"]), other())
            )
            .is_err()
        );
        assert!(
            validate_context_history_summary(
                &history,
                &record(&f, "root"),
                &record(&f, "summaryRoot"),
                &json!([record(&f, "summaryRight"), record(&f, "summaryLeft")])
            )
            .is_err()
        );
        assert!(
            validate_context_history_summary_request(
                &history,
                &record(&f, "root"),
                &changed(&record(&f, "request"), &json!(["sources"]), other()),
                &children(&f)
            )
            .is_err()
        );
        assert!(
            validate_context_history_summary_result(
                &record(&f, "request"),
                &record(&f, "result"),
                Some(&changed(
                    &record(&f, "summaryRoot"),
                    &json!(["body"]),
                    json!("conflict")
                ))
            )
            .is_err()
        );
        assert!(
            validate_context_history_generation(
                &history,
                &changed(&record(&f, "generation"), &json!(["prompt"]), other()),
                &nodes(&f),
                &summaries(&f)
            )
            .is_err()
        );
        assert!(
            validate_context_history_queue(
                &history,
                &changed(&record(&f, "queue"), &json!(["work"]), json!(1)),
                &json!([record(&f, "request")])
            )
            .is_err()
        );
        for (field, value) in [
            ("head", other()),
            ("audience", json!("child")),
            ("generation", other()),
            ("policy", other()),
            ("budget", other()),
            ("selection", other()),
        ] {
            let cursor = changed(&record(&f, "cursor"), &json!(["binding", field]), value);
            assert!(
                validate_context_history_view(
                    &history,
                    &record(&f, "generation"),
                    &record(&f, "tail"),
                    &nodes(&f),
                    &summaries(&f),
                    Some(&cursor)
                )
                .is_err()
            );
        }
    }

    #[test]
    fn leaf_summaries_cannot_be_child_derivatives() {
        let f = fixture();
        let forged = (0..2)
            .map(|index| {
                let leaf = format!("leaf{index}");
                let mut summary = record(&f, "summaryLeft");
                summary["node"] = f["digests"][&leaf].clone();
                summary["sources"] = f["records"][&leaf]["sources"].clone();
                summary["body"] = json!("invented leaf summary");
                summary
            })
            .collect::<Vec<_>>();
        let mut parent = record(&f, "summaryLeft");
        parent["children"] = json!(
            forged
                .iter()
                .map(|row| digest(row).unwrap())
                .collect::<Vec<_>>()
        );
        assert!(
            validate_context_history_summary(
                &record(&f, "history"),
                &record(&f, "left"),
                &parent,
                &json!(forged)
            )
            .is_err()
        );
    }

    #[test]
    fn queue_bytes_include_the_reference_frame_and_jobs_and_work_is_cumulative() {
        let f = fixture();
        let mut history = large_history(&f, 1024);
        for leaf in history["leaves"].as_array_mut().unwrap() {
            leaf["bytes"] = json!(0);
        }
        let id = digest(&history).unwrap();
        let leaves = history["leaves"].as_array().unwrap();
        let mut jobs = Vec::new();
        let mut size = 2;
        while size <= 1024 {
            for start in (0..1024).step_by(size) {
                let node = json!({"schema":"algal.context-history-node.v1","history":id,"start":start,"end":start + size,
                    "sources":digest(&json!({"schema":"algal.context-history-sources.v1","history":id,"leaves":&leaves[start..start+size]})).unwrap()});
                let mut job = record(&f, "request");
                job["history"] = json!(id);
                job["node"] = json!(digest(&node).unwrap());
                job["sources"] = node["sources"].clone();
                job["children"] = json!([]);
                job["limits"]["maxWork"] = json!(1);
                jobs.push(job);
            }
            size *= 2;
        }
        let job_ids = jobs
            .iter()
            .map(|row| digest(row).unwrap())
            .collect::<Vec<_>>();
        let queue = |count: usize| {
            let mut value = record(&f, "queue");
            value["history"] = json!(id);
            value["requests"] = json!(&job_ids[..count]);
            value["work"] = json!(count);
            value
        };
        let job_bytes = canonical(&jobs[0]).unwrap().len();
        let total = |count: usize| canonical(&queue(count)).unwrap().len() + job_bytes * count;
        let mut count = 0;
        while count < jobs.len() && total(count + 1) <= MAX_QUEUE_BYTES {
            count += 1;
        }
        assert_eq!(MAX_QUEUE_BYTES, 524288);
        assert!(count < jobs.len());
        validate_context_history_queue(&history, &queue(count), &json!(&jobs[..count])).unwrap();
        let error =
            validate_context_history_queue(&history, &queue(count + 1), &json!(&jobs[..count + 1]))
                .unwrap_err();
        assert_eq!(error.code, "BUDGET_EXHAUSTED");
        let costly = jobs[..5]
            .iter()
            .map(|row| changed(row, &json!(["limits", "maxWork"]), json!(16777216)))
            .collect::<Vec<_>>();
        let mut costly_queue = queue(0);
        costly_queue["requests"] = json!(
            costly
                .iter()
                .map(|row| digest(row).unwrap())
                .collect::<Vec<_>>()
        );
        costly_queue["work"] = json!(67108864);
        assert_eq!(
            validate_context_history_queue(&history, &costly_queue, &json!(costly))
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
    }

    #[test]
    fn empty_and_one_leaf_captures_and_maximum_collection_shapes() {
        let f = fixture();
        let history = record(&f, "history");
        let empty = changed(&history, &json!(["leaves"]), json!([]));
        assert!(parse_context_history(&empty).unwrap().leaves.is_empty());
        validate_context_history_sources(&empty, &f["snapshot"], &json!([])).unwrap();
        assert!(context_history_node(&empty, 0, 1).is_err());
        let one = changed(&history, &json!(["leaves"]), json!([history["leaves"][0]]));
        validate_context_history_sources(&one, &f["snapshot"], &json!([f["sources"][0]])).unwrap();
        assert_eq!(context_history_node(&one, 0, 1).unwrap().end, 1);
        let mut grant = record(&f, "grant");
        grant["indices"] = json!((0..1024).collect::<Vec<_>>());
        assert!(parse_context_history_grant(&grant).is_ok());
        let mut generation = record(&f, "generation");
        generation["summaries"] = json!((0..1023).map(|index|json!({"node":digest(&json!({"node":index})).unwrap(),"summary":digest(&json!({"summary":index})).unwrap()})).collect::<Vec<_>>());
        assert!(parse_context_history_generation(&generation).is_ok());
        let mut queue = record(&f, "queue");
        queue["requests"] = json!(
            (0..1023)
                .map(|index| digest(&json!({"job":index})).unwrap())
                .collect::<Vec<_>>()
        );
        queue["batchSize"] = json!(32);
        assert!(parse_context_history_queue(&queue).is_ok());
        for key in ["application", "realm", "workspace", "task", "audience"] {
            assert!(
                parse_context_history_record(&changed(
                    &history,
                    &json!(["scope", key]),
                    json!("a".repeat(64))
                ))
                .is_ok()
            );
            assert!(
                parse_context_history_record(&changed(
                    &history,
                    &json!(["scope", key]),
                    json!("a".repeat(65))
                ))
                .is_err()
            );
        }
    }

    #[test]
    fn current_revocation_denies_summary_and_metadata_and_delegation_only_narrows() {
        let f = fixture();
        for row in f["accessRefusals"].as_array().unwrap() {
            let access = changed(&record(&f, "access"), &row["path"], row["value"].clone());
            let node = row["node"].as_str().map(|name| record(&f, name));
            let error = validate_context_history_access(
                &record(&f, "history"),
                &record(&f, "ref"),
                &record(&f, "grant"),
                &access,
                node.as_ref(),
            )
            .unwrap_err();
            assert_eq!(error.code, "CAPABILITY_DENIED", "{}", row["name"]);
        }
        let access = changed(&record(&f, "access"), &json!(["indices"]), json!([0, 1]));
        validate_context_history_access(
            &record(&f, "history"),
            &record(&f, "ref"),
            &record(&f, "grant"),
            &access,
            Some(&record(&f, "left")),
        )
        .unwrap();
        let child = changed(&record(&f, "grant"), &json!(["indices"]), json!([0]));
        validate_context_history_delegation(&record(&f, "grant"), &child).unwrap();
        validate_context_history_delegation(
            &record(&f, "grant"),
            &changed(&child, &json!(["indices"]), json!([])),
        )
        .unwrap();
        for mutation in [
            changed(&child, &json!(["indices"]), json!([4])),
            changed(&child, &json!(["scope", "audience"]), json!("child")),
            changed(&child, &json!(["scope", "task"]), json!("other")),
            changed(&child, &json!(["history"]), other()),
        ] {
            assert!(validate_context_history_delegation(&record(&f, "grant"), &mutation).is_err());
        }
    }
}
