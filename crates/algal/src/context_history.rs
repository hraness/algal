use crate::{
    Error, Result,
    agent_context::{AgentContextEntryInput, AgentContextKind, MAX_GRANTS, MAX_QUERY_BYTES},
    application_memory::app_id,
    canonical::{canonical, check_digest, digest},
    context_history_access::{context_history_selection, validate_context_history_view_access},
    context_history_contract::{
        self as contract, ContextHistory, ContextHistoryLeaf, ContextHistoryNode,
        ContextHistoryRef, context_history_digest, context_history_node, context_history_ref,
        parse_context_history, parse_context_history_access, parse_context_history_cursor,
        parse_context_history_generation, parse_context_history_grant, parse_context_history_node,
        parse_context_history_ref, parse_context_history_summary, parse_context_history_view,
        validate_context_history_access, validate_context_history_delegation,
        validate_context_history_generation, validate_context_history_node,
        validate_context_history_sources,
    },
    contract::{integer as bounded_integer, keys, list, object},
    store::Store,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::atomic::{AtomicBool, Ordering},
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContextHistoryRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ContextHistoryCurrent {
    pub access: Value,
    pub invalidated: Vec<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReadLimits {
    max_read_bytes: usize,
    max_scan_bytes: usize,
    max_output_bytes: usize,
    max_nodes: usize,
    max_work: usize,
    max_search_results: usize,
}
impl Default for ReadLimits {
    fn default() -> Self {
        Self {
            max_read_bytes: 65536,
            max_scan_bytes: 8388608,
            max_output_bytes: 65536,
            max_nodes: 2047,
            max_work: 67108864,
            max_search_results: 128,
        }
    }
}
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct Usage {
    read_bytes: usize,
    scan_bytes: usize,
    node_visits: usize,
    work: usize,
}
struct Meter {
    limits: ReadLimits,
    usage: Usage,
    stop: Option<&'static str>,
}
impl Meter {
    fn stop(&mut self, reason: &'static str) -> Error {
        self.stop = Some(reason);
        Error::limit(
            "context history read exceeds its budget; request a smaller read or a new budget",
        )
    }
    fn charge(&mut self, work: usize, scan: usize, nodes: usize, read: usize) -> Result<()> {
        if self.usage.work + work > self.limits.max_work
            || self.usage.node_visits + nodes > self.limits.max_nodes
        {
            return Err(self.stop("work-limit"));
        }
        if self.usage.scan_bytes + scan > self.limits.max_scan_bytes {
            return Err(self.stop("scan-limit"));
        }
        if self.usage.read_bytes + read > self.limits.max_read_bytes {
            return Err(self.stop("read-limit"));
        }
        self.usage.work += work;
        self.usage.scan_bytes += scan;
        self.usage.node_visits += nodes;
        self.usage.read_bytes += read;
        Ok(())
    }
}
#[derive(Clone)]
struct Catalog {
    history: ContextHistory,
    id: String,
    nodes: BTreeMap<String, ContextHistoryNode>,
    leaves: BTreeMap<usize, usize>,
    selection: Value,
    generation: Value,
    summaries: BTreeMap<String, Value>,
}
#[derive(Clone)]
struct Registered {
    grant: Value,
    history: String,
    parents: BTreeSet<String>,
    revoked: bool,
}
struct SavedSelection {
    reference: String,
    binding: Value,
    request: Value,
    request_digest: String,
    current: String,
}
struct Run<'a> {
    reference: ContextHistoryRef,
    registered: Registered,
    catalog: Catalog,
    targets: Option<Vec<ContextHistoryNode>>,
    current: ContextHistoryCurrent,
    identity: String,
    generation: String,
    meter: Meter,
    cache: BTreeMap<String, Option<Value>>,
    opened: bool,
    cancelled: Option<&'a AtomicBool>,
}
fn denied() -> Error {
    Error::new(
        "CAPABILITY_DENIED",
        "context history scope does not authorize this operation",
    )
}
fn hash<T: Serialize>(value: &T) -> Result<String> {
    digest(&serde_json::to_value(value)?)
}
fn integer(value: &Value, min: usize, max: usize) -> Result<usize> {
    if value.as_u64().is_some() {
        return bounded_integer(value, min, max);
    }
    if let Some(value) = value
        .as_f64()
        .filter(|n| n.is_finite() && n.fract() == 0.0 && *n >= min as f64 && *n <= max as f64)
    {
        return Ok(value as usize);
    }
    Err(Error::invalid(
        "expected a non-negative integer within its bound",
    ))
}
pub fn context_history_output_bytes(value: &Value) -> Result<usize> {
    Ok(canonical(value)?.len())
}
fn checked_indices(value: &Value, count: usize, max: usize) -> Result<Vec<usize>> {
    let values = list(value, max)?
        .iter()
        .map(|value| integer(value, 0, count.saturating_sub(1)))
        .collect::<Result<Vec<_>>>()?;
    if values.iter().any(|n| *n >= count) || values.windows(2).any(|pair| pair[0] >= pair[1]) {
        return Err(Error::invalid(
            "context history indices must be unique and increasing",
        ));
    }
    Ok(values)
}
fn read_limits(value: Option<&Value>, ceiling: &ReadLimits) -> Result<ReadLimits> {
    let mut result = serde_json::to_value(ceiling)?;
    if let Some(value) = value {
        keys(
            value,
            &contract::CONTEXT_HISTORY_READ_CEILINGS.map(|(name, _)| name),
        )?;
        for (name, _) in contract::CONTEXT_HISTORY_READ_CEILINGS {
            if let Some(selected) = value.get(name) {
                result[name] = json!(integer(
                    selected,
                    1,
                    result[name].as_u64().unwrap() as usize
                )?);
            }
        }
    }
    Ok(serde_json::from_value(result)?)
}
fn sorted_union(values: impl Iterator<Item = usize>) -> Vec<usize> {
    values.collect::<BTreeSet<_>>().into_iter().collect()
}
fn cancel(signal: Option<&AtomicBool>) -> Result<()> {
    if signal.is_some_and(|signal| signal.load(Ordering::Relaxed)) {
        return Err(Error::new(
            "EFFECT_FAILED",
            "context history read cancelled",
        ));
    }
    Ok(())
}

pub fn context_history_cover(
    count: usize,
    recent_leaves: usize,
    detailed_indices: &[usize],
) -> Result<Vec<ContextHistoryRange>> {
    if count > contract::MAX_LEAVES || recent_leaves > contract::MAX_LEAVES {
        return Err(Error::invalid(
            "context history cover exceeds its leaf bound",
        ));
    }
    let detailed = checked_indices(&json!(detailed_indices), count, contract::MAX_LEAVES)?
        .into_iter()
        .collect::<BTreeSet<_>>();
    let recent = recent_leaves.min(count);
    fn visit(
        start: usize,
        end: usize,
        count: usize,
        recent: usize,
        detailed: &BTreeSet<usize>,
        result: &mut Vec<ContextHistoryRange>,
    ) {
        let length = end - start;
        if length == 1
            || (detailed.range(start..end).next().is_none()
                && end <= count - recent
                && length <= count - end)
        {
            result.push(ContextHistoryRange { start, end });
        } else {
            let middle = (start + end) / 2;
            visit(start, middle, count, recent, detailed, result);
            visit(middle, end, count, recent, detailed, result);
        }
    }
    let mut result = Vec::new();
    let mut start = 0;
    let mut length = 1 << contract::MAX_TREE_DEPTH;
    while length > 0 {
        if start + length <= count {
            visit(start, start + length, count, recent, &detailed, &mut result);
            start += length;
        }
        length /= 2;
    }
    Ok(result)
}
fn original(value: &Value) -> Result<AgentContextEntryInput> {
    keys(value, &["schema", "kind", "label", "text"])?;
    if value["schema"] != "algal.agent-context-entry.v1" {
        return Err(Error::invalid("invalid original context history entry"));
    }
    let mut fields = object(value)?.clone();
    fields.remove("schema");
    let input: AgentContextEntryInput = serde_json::from_value(Value::Object(fields))?;
    if input.label.len() > contract::MAX_LABEL_BYTES || input.text.len() > contract::MAX_ENTRY_BYTES
    {
        return Err(Error::invalid(
            "original context history text exceeds its UTF-8 bound",
        ));
    }
    Ok(input)
}
fn source_proof(
    store: &Store,
    history: &ContextHistory,
    check: &mut impl FnMut() -> Result<()>,
) -> Result<()> {
    let mut get = |id: &str, bound: usize| -> Result<Value> {
        check()?;
        let value = store.get_bounded("values", id, bound);
        check()?;
        value?
            .ok_or_else(|| Error::new("STORE_MISS", "context history original source unavailable"))
    };
    let snapshot = get(&history.snapshot, 262144)?;
    let mut values = Vec::new();
    let mut seen = BTreeMap::new();
    for leaf in &history.leaves {
        if !seen.contains_key(&leaf.entry) {
            seen.insert(
                leaf.entry.clone(),
                get(&leaf.entry, contract::MAX_ENTRY_BYTES * 6 + 2048)?,
            );
        }
        values.push(seen[&leaf.entry].clone());
    }
    validate_context_history_sources(&serde_json::to_value(history)?, &snapshot, &json!(values))
}
pub fn capture_context_history(store: &Store, input: &Value) -> Result<ContextHistory> {
    keys(
        input,
        &[
            "scope",
            "head",
            "snapshot",
            "epoch",
            "firstPosition",
            "sources",
        ],
    )?;
    if context_history_output_bytes(input)? > contract::MAX_HISTORY_BYTES {
        return Err(Error::limit("context history capture bytes"));
    }
    let base = parse_context_history(
        &json!({"schema":"algal.context-history.v1","scope":input["scope"],"head":input["head"],"snapshot":input["snapshot"],"epoch":input["epoch"],"firstPosition":input["firstPosition"],"leaves":[]}),
    )?;
    let snapshot = store
        .get_bounded("values", &base.snapshot, 262144)?
        .ok_or_else(|| {
            Error::new(
                "STORE_MISS",
                "context history original snapshot unavailable",
            )
        })?;
    keys(&snapshot, &["schema", "entries"])?;
    if snapshot["schema"] != "algal.agent-context.v1" || digest(&snapshot)? != base.snapshot {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "context history original snapshot was changed",
        ));
    }
    let rows = list(&snapshot["entries"], contract::MAX_LEAVES)?;
    let mut leaves = Vec::new();
    for (i, row) in list(&input["sources"], contract::MAX_LEAVES)?
        .iter()
        .enumerate()
    {
        keys(row, &["sourceIndex", "position", "event"])?;
        let index = integer(&row["sourceIndex"], 0, contract::MAX_LEAVES - 1)?;
        let position = integer(&row["position"], 0, contract::MAX_POSITIONS - 1)?;
        if position != base.first_position + i {
            return Err(Error::invalid(
                "context history capture requires explicit consecutive owner positions",
            ));
        }
        let source = rows.get(index).ok_or_else(denied)?;
        let id = source["digest"]
            .as_str()
            .ok_or_else(|| Error::invalid("original source digest"))?;
        check_digest(id)?;
        let value = store
            .get_bounded("values", id, contract::MAX_ENTRY_BYTES * 6 + 2048)?
            .ok_or_else(|| {
                Error::new("STORE_MISS", "context history original source unavailable")
            })?;
        let entry = original(&value)?;
        leaves.push(ContextHistoryLeaf {
            position,
            event: row["event"]
                .as_str()
                .ok_or_else(|| Error::invalid("context history event is required"))?
                .to_owned(),
            source_index: index,
            entry: id.to_owned(),
            bytes: integer(&source["bytes"], 0, contract::MAX_ENTRY_BYTES)?,
            kind: entry.kind,
            label: entry.label,
        });
    }
    let history = parse_context_history(&serde_json::to_value(ContextHistory { leaves, ..base })?)?;
    source_proof(store, &history, &mut || Ok(()))?;
    Ok(history)
}
fn all_nodes(history: &ContextHistory, id: &str) -> Result<BTreeMap<String, ContextHistoryNode>> {
    let mut result = BTreeMap::new();
    let mut length = 1;
    while length <= history.leaves.len() {
        for start in (0..=history.leaves.len() - length).step_by(length) {
            let node = ContextHistoryNode {
                schema: "algal.context-history-node.v1".to_owned(),
                history: id.to_owned(),
                start,
                end: start + length,
                sources: digest(
                    &json!({"schema":"algal.context-history-sources.v1","history":id,"leaves":history.leaves[start..start + length]}),
                )?,
            };
            result.insert(hash(&node)?, node);
        }
        length *= 2;
    }
    Ok(result)
}
fn derivatives(
    history: &ContextHistory,
    input: Option<&Value>,
) -> Result<(Value, BTreeMap<String, Value>)> {
    let id = hash(history)?;
    let Some(input) = input else {
        return Ok((
            parse_context_history_generation(
                &json!({"schema":"algal.context-history-generation.v1","history":id,"generation":0,
            "prompt":hash(&"algal.context-history.no-prompt.v1")?,"policy":hash(&"algal.context-history.recency-aligned.v1")?,"summarizer":hash(&"algal.context-history.no-summarizer.v1")?,"summaries":[]}),
            )?,
            BTreeMap::new(),
        ));
    };
    keys(input, &["generation", "nodes", "summaries"])?;
    let generation = parse_context_history_generation(&input["generation"])?;
    let nodes = list(&input["nodes"], contract::MAX_TREE_NODES)?
        .iter()
        .map(parse_context_history_node)
        .collect::<Result<Vec<_>>>()?;
    let summaries = list(&input["summaries"], contract::MAX_INTERNAL_NODES)?
        .iter()
        .map(parse_context_history_summary)
        .collect::<Result<Vec<_>>>()?;
    validate_context_history_generation(
        &serde_json::to_value(history)?,
        &generation,
        &json!(nodes),
        &json!(summaries),
    )?;
    Ok((
        generation,
        summaries
            .into_iter()
            .map(|value| (value["node"].as_str().unwrap().to_owned(), value))
            .collect(),
    ))
}
fn configuration(
    history: &ContextHistory,
    input: Option<&Value>,
) -> Result<(Value, Value, BTreeMap<String, Value>)> {
    let empty = json!({});
    let input = input.unwrap_or(&empty);
    keys(
        input,
        &[
            "recentLeaves",
            "protectedIndices",
            "relevance",
            "derivatives",
        ],
    )?;
    let catalog = history
        .leaves
        .iter()
        .map(|leaf| leaf.source_index)
        .collect::<BTreeSet<_>>();
    let mut protected = input
        .get("protectedIndices")
        .map(|value| checked_indices(value, contract::MAX_LEAVES, contract::MAX_LEAVES))
        .transpose()?
        .unwrap_or_default();
    let mut relevance = Value::Null;
    if let Some(value) = input.get("relevance") {
        keys(value, &["query", "indices"])?;
        let query = value["query"]
            .as_str()
            .filter(|query| !query.is_empty() && query.len() <= MAX_QUERY_BYTES)
            .ok_or_else(|| Error::invalid("context history relevance query byte bound"))?;
        let picked = checked_indices(
            &value["indices"],
            contract::MAX_LEAVES,
            ReadLimits::default().max_search_results,
        )?;
        if picked.iter().any(|n| !catalog.contains(n)) {
            return Err(denied());
        }
        relevance = json!({"query":query,"indices":picked});
    }
    if protected.iter().any(|n| !catalog.contains(n)) {
        return Err(denied());
    }
    protected.extend(
        history
            .leaves
            .iter()
            .filter(|leaf| leaf.kind == AgentContextKind::Instruction)
            .map(|leaf| leaf.source_index),
    );
    let selection = json!({"recentLeaves":input.get("recentLeaves").map(|value| integer(value, 0, contract::MAX_LEAVES)).transpose()?.unwrap_or(4),"protectedIndices":sorted_union(protected.into_iter()),"relevance":relevance});
    let (generation, summaries) = derivatives(history, input.get("derivatives"))?;
    Ok((selection, generation, summaries))
}

pub struct ContextHistoryHost<'a, F: FnMut(&ContextHistory, &str) -> Result<ContextHistoryCurrent>>
{
    store: &'a Store,
    principal: String,
    resolve: F,
    catalogs: BTreeMap<String, Catalog>,
    grants: BTreeMap<String, Registered>,
    revisions: BTreeMap<String, usize>,
    selections: BTreeMap<String, SavedSelection>,
    cursors: BTreeSet<String>,
}
impl<'a, F: FnMut(&ContextHistory, &str) -> Result<ContextHistoryCurrent>>
    ContextHistoryHost<'a, F>
{
    pub fn new(store: &'a Store, principal: &str, resolve: F) -> Result<Self> {
        app_id(&json!(principal))?;
        Ok(Self {
            store,
            principal: principal.to_owned(),
            resolve,
            catalogs: BTreeMap::new(),
            grants: BTreeMap::new(),
            revisions: BTreeMap::new(),
            selections: BTreeMap::new(),
            cursors: BTreeSet::new(),
        })
    }
    fn registered(&self, reference: &ContextHistoryRef) -> Result<Registered> {
        parse_context_history_ref(&serde_json::to_value(reference)?)?;
        let result = self
            .grants
            .get(&reference.capability)
            .filter(|value| value.history == reference.history)
            .ok_or_else(denied)?;
        let mut pending = vec![reference.capability.clone()];
        let mut seen = BTreeSet::new();
        while let Some(id) = pending.pop() {
            if !seen.insert(id.clone()) {
                continue;
            }
            let value = self
                .grants
                .get(&id)
                .filter(|value| !value.revoked)
                .ok_or_else(denied)?;
            pending.extend(value.parents.iter().cloned());
        }
        Ok(result.clone())
    }
    fn register(
        &mut self,
        grant: Value,
        id: &str,
        parent: Option<&str>,
    ) -> Result<ContextHistoryRef> {
        let reference = context_history_ref(&grant)?;
        if self.grants.contains_key(&reference.capability) {
            self.registered(&reference)?;
            if let Some(parent) = parent.filter(|parent| *parent != reference.capability) {
                self.grants
                    .get_mut(&reference.capability)
                    .unwrap()
                    .parents
                    .insert(parent.to_owned());
            }
        } else {
            if self.grants.len() >= MAX_GRANTS {
                return Err(Error::limit("context history grant bound"));
            }
            self.grants.insert(
                reference.capability.clone(),
                Registered {
                    grant,
                    history: id.to_owned(),
                    parents: parent.map(str::to_owned).into_iter().collect(),
                    revoked: false,
                },
            );
        }
        Ok(reference)
    }
    fn node(catalog: &Catalog, start: usize, end: usize) -> Result<ContextHistoryNode> {
        let node = context_history_node(&serde_json::to_value(&catalog.history)?, start, end)?;
        catalog.nodes.get(&hash(&node)?).cloned().ok_or_else(denied)
    }
    fn lookup(catalog: &Catalog, id: &str) -> Result<ContextHistoryNode> {
        check_digest(id)?;
        let node = catalog.nodes.get(id).cloned().ok_or_else(denied)?;
        validate_context_history_node(
            &serde_json::to_value(&catalog.history)?,
            &serde_json::to_value(&node)?,
        )?;
        Ok(node)
    }
    fn targets(catalog: &Catalog, picked: &[usize]) -> Result<Vec<ContextHistoryNode>> {
        picked
            .iter()
            .map(|index| {
                let leaf = *catalog.leaves.get(index).ok_or_else(denied)?;
                Self::node(catalog, leaf, leaf + 1)
            })
            .collect()
    }
    fn current(
        &mut self,
        catalog: &Catalog,
        reference: &ContextHistoryRef,
        grant: &Value,
        targets: Option<&[ContextHistoryNode]>,
    ) -> Result<ContextHistoryCurrent> {
        let resolved = (self.resolve)(&catalog.history, &self.principal)?;
        let access = parse_context_history_access(&resolved.access)?;
        let invalidated = checked_indices(
            &json!(resolved.invalidated),
            contract::MAX_LEAVES,
            contract::MAX_LEAVES,
        )?;
        if access["history"] != catalog.id
            || access["scope"] != serde_json::to_value(&catalog.history.scope)?
            || access["head"] != catalog.history.head
            || access["snapshot"] != catalog.history.snapshot
            || reference.capability != context_history_ref(grant)?.capability
        {
            return Err(denied());
        }
        let revision = integer(&access["revision"], 0, contract::MAX_GENERATION)?;
        if revision < self.revisions.get(&catalog.id).copied().unwrap_or(0) {
            return Err(denied());
        }
        if !self.revisions.contains_key(&catalog.id) && self.revisions.len() >= MAX_GRANTS {
            return Err(Error::limit("context history access revision bound"));
        }
        self.revisions.insert(catalog.id.clone(), revision);
        if access["state"] == "revoked" {
            for value in self
                .grants
                .values_mut()
                .filter(|value| value.history == catalog.id)
            {
                value.revoked = true;
            }
            return Err(denied());
        }
        if access["state"] != "active"
            || invalidated
                .iter()
                .any(|index| !catalog.leaves.contains_key(index))
        {
            return Err(denied());
        }
        let history = serde_json::to_value(&catalog.history)?;
        let reference = serde_json::to_value(reference)?;
        match targets {
            None => validate_context_history_access(&history, &reference, grant, &access, None)?,
            Some([]) => {
                if grant["indices"] != json!([])
                    || grant["history"] != catalog.id
                    || grant["scope"] != history["scope"]
                {
                    return Err(denied());
                }
            }
            Some(nodes) => {
                for node in nodes {
                    validate_context_history_access(
                        &history,
                        &reference,
                        grant,
                        &access,
                        Some(&serde_json::to_value(node)?),
                    )?;
                }
            }
        }
        Ok(ContextHistoryCurrent {
            access,
            invalidated,
        })
    }
    pub fn admit(
        &mut self,
        history: &Value,
        config: Option<&Value>,
        selected: Option<&[usize]>,
        requested: Option<&Value>,
    ) -> Result<ContextHistoryRef> {
        let history = parse_context_history(history)?;
        let id = hash(&history)?;
        let existing = self.catalogs.get(&id).cloned();
        let catalog = if let Some(existing) = existing {
            if let Some(config) = config {
                let (selection, _, _) = configuration(&history, Some(config))?;
                if selection != existing.selection {
                    return Err(Error::invalid(
                        "a captured history already has a different host selection",
                    ));
                }
            }
            existing
        } else {
            let (selection, generation, summaries) = configuration(&history, config)?;
            Catalog {
                nodes: all_nodes(&history, &id)?,
                leaves: history
                    .leaves
                    .iter()
                    .enumerate()
                    .map(|(i, leaf)| (leaf.source_index, i))
                    .collect(),
                history: history.clone(),
                id: id.clone(),
                selection,
                generation,
                summaries,
            }
        };
        let picked = checked_indices(
            &json!(
                selected
                    .map(<[usize]>::to_vec)
                    .unwrap_or_else(|| sorted_union(
                        history.leaves.iter().map(|leaf| leaf.source_index)
                    ))
            ),
            contract::MAX_LEAVES,
            contract::MAX_LEAVES,
        )?;
        if picked
            .iter()
            .any(|index| !catalog.leaves.contains_key(index))
        {
            return Err(denied());
        }
        let grant = parse_context_history_grant(
            &json!({"schema":"algal.context-history-grant.v1","history":id,"scope":history.scope,"indices":picked,"limits":read_limits(requested, &ReadLimits::default())?}),
        )?;
        let reference = context_history_ref(&grant)?;
        if self.grants.contains_key(&reference.capability) {
            self.registered(&reference)?;
        }
        let mut owner_grant = grant.clone();
        owner_grant["indices"] = json!(sorted_union(
            history.leaves.iter().map(|leaf| leaf.source_index)
        ));
        let owner_ref = context_history_ref(&owner_grant)?;
        let current = hash(&self.current(&catalog, &owner_ref, &owner_grant, None)?)?;
        let store = self.store;
        source_proof(store, &history, &mut || {
            if self.grants.contains_key(&reference.capability) {
                self.registered(&reference)?;
            }
            if hash(&self.current(&catalog, &owner_ref, &owner_grant, None)?)? != current {
                return Err(denied());
            }
            Ok(())
        })?;
        if hash(&self.current(&catalog, &owner_ref, &owner_grant, None)?)? != current {
            return Err(denied());
        }
        if !self.catalogs.contains_key(&id) && self.catalogs.len() >= MAX_GRANTS {
            return Err(Error::limit("context history catalog bound"));
        }
        self.catalogs.insert(id.clone(), catalog);
        self.register(grant, &id, None)
    }
    pub fn revoke(&mut self, reference: &ContextHistoryRef) -> Result<()> {
        parse_context_history_ref(&serde_json::to_value(reference)?)?;
        let value = self
            .grants
            .get_mut(&reference.capability)
            .filter(|value| value.history == reference.history)
            .ok_or_else(denied)?;
        value.revoked = true;
        loop {
            let denied_parents = self
                .grants
                .iter()
                .filter(|(_, value)| value.revoked)
                .map(|(id, _)| id.clone())
                .collect::<BTreeSet<_>>();
            let mut changed = false;
            for value in self.grants.values_mut() {
                if !value.revoked && value.parents.iter().any(|id| denied_parents.contains(id)) {
                    value.revoked = true;
                    changed = true;
                }
            }
            if !changed {
                return Ok(());
            }
        }
    }
    pub fn use_generation(&mut self, reference: &ContextHistoryRef, input: &Value) -> Result<()> {
        let value = self.registered(reference)?;
        let catalog = self.catalogs[&value.history].clone();
        let (generation, summaries) = derivatives(&catalog.history, Some(input))?;
        let current = hash(&self.current(&catalog, reference, &value.grant, None)?)?;
        self.registered(reference)?;
        if hash(&self.current(&catalog, reference, &value.grant, None)?)? != current {
            return Err(denied());
        }
        self.registered(reference)?;
        let catalog = self.catalogs.get_mut(&value.history).unwrap();
        catalog.generation = generation;
        catalog.summaries = summaries;
        Ok(())
    }
    pub fn delegate(
        &mut self,
        reference: &ContextHistoryRef,
        selected: &[usize],
        requested: Option<&Value>,
    ) -> Result<ContextHistoryRef> {
        let value = self.registered(reference)?;
        let catalog = self.catalogs[&value.history].clone();
        let mut grant = value.grant.clone();
        grant["indices"] = json!(checked_indices(
            &json!(selected),
            contract::MAX_LEAVES,
            contract::MAX_LEAVES
        )?);
        grant["limits"] = serde_json::to_value(read_limits(
            requested,
            &serde_json::from_value(value.grant["limits"].clone())?,
        )?)?;
        let grant = parse_context_history_grant(&grant)?;
        validate_context_history_delegation(&value.grant, &grant)?;
        let targets = Self::targets(&catalog, selected)?;
        let before = hash(&self.current(&catalog, reference, &value.grant, Some(&targets))?)?;
        self.registered(reference)?;
        if hash(&self.current(&catalog, reference, &value.grant, Some(&targets))?)? != before {
            return Err(denied());
        }
        self.registered(reference)?;
        self.register(grant, &catalog.id, Some(&reference.capability))
    }
    fn start<'b>(
        &mut self,
        reference: &ContextHistoryRef,
        requested: Option<&Value>,
        targets: Option<Vec<ContextHistoryNode>>,
        cancelled: Option<&'b AtomicBool>,
    ) -> Result<Run<'b>> {
        let registered = self.registered(reference)?;
        let catalog = self.catalogs[&registered.history].clone();
        let limits = read_limits(
            requested,
            &serde_json::from_value(registered.grant["limits"].clone())?,
        )?;
        let current = self.current(&catalog, reference, &registered.grant, targets.as_deref())?;
        self.registered(reference)?;
        let run = Run {
            reference: reference.clone(),
            registered,
            generation: context_history_digest(&catalog.generation)?,
            identity: hash(&current)?,
            catalog,
            current,
            targets,
            meter: Meter {
                limits,
                usage: Usage::default(),
                stop: None,
            },
            cache: BTreeMap::new(),
            opened: false,
            cancelled,
        };
        self.check(&run)?;
        Ok(run)
    }
    fn check(&mut self, run: &Run<'_>) -> Result<()> {
        let value = self.registered(&run.reference)?;
        if value.grant != run.registered.grant
            || context_history_digest(&self.catalogs[&value.history].generation)? != run.generation
        {
            return Err(denied());
        }
        let current = self.current(
            &run.catalog,
            &run.reference,
            &value.grant,
            run.targets.as_deref(),
        )?;
        self.registered(&run.reference)?;
        if hash(&current)? != run.identity {
            return Err(denied());
        }
        Ok(())
    }
    fn get(&mut self, run: &mut Run<'_>, id: &str, bound: usize) -> Result<Value> {
        self.check(run)?;
        cancel(run.cancelled)?;
        let fresh = !run.cache.contains_key(id);
        let bytes = run
            .catalog
            .history
            .leaves
            .iter()
            .find(|leaf| leaf.entry == id)
            .map_or(0, |leaf| leaf.bytes);
        if fresh && bytes > run.meter.limits.max_scan_bytes - run.meter.usage.scan_bytes {
            return Err(run.meter.stop("scan-limit"));
        }
        if fresh {
            let value = self.store.get_bounded("values", id, bound);
            self.check(run)?;
            cancel(run.cancelled)?;
            run.cache.insert(id.to_owned(), value?);
        }
        let value = run.cache[id].clone();
        run.meter.charge(
            value
                .as_ref()
                .map(context_history_output_bytes)
                .transpose()?
                .unwrap_or(1),
            if fresh && value.is_some() { bytes } else { 0 },
            0,
            0,
        )?;
        value.ok_or_else(|| Error::new("STORE_MISS", "context history original source unavailable"))
    }
    fn snapshot(&mut self, run: &mut Run<'_>) -> Result<Value> {
        let id = run.catalog.history.snapshot.clone();
        let value = self.get(run, &id, 262144)?;
        keys(&value, &["schema", "entries"])?;
        if value["schema"] != "algal.agent-context.v1" || digest(&value)? != id {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "original context history snapshot was changed",
            ));
        }
        let mut total = 0;
        for row in list(&value["entries"], contract::MAX_LEAVES)? {
            keys(row, &["digest", "bytes"])?;
            check_digest(
                row["digest"]
                    .as_str()
                    .ok_or_else(|| Error::invalid("original entry digest"))?,
            )?;
            total += integer(&row["bytes"], 0, contract::MAX_ENTRY_BYTES)?;
        }
        if total > contract::MAX_SOURCE_BYTES {
            return Err(Error::limit("original context source byte bound"));
        }
        Ok(value)
    }
    fn open(&mut self, run: &mut Run<'_>) -> Result<()> {
        if !run.opened {
            cancel(run.cancelled)?;
            self.snapshot(run)?;
            run.opened = true;
        }
        Ok(())
    }
    fn original(&mut self, run: &mut Run<'_>, index: usize) -> Result<AgentContextEntryInput> {
        if !checked_indices(
            &run.registered.grant["indices"],
            contract::MAX_LEAVES,
            contract::MAX_LEAVES,
        )?
        .contains(&index)
        {
            return Err(denied());
        }
        self.snapshot(run)?;
        let leaf =
            run.catalog.history.leaves[*run.catalog.leaves.get(&index).ok_or_else(denied)?].clone();
        let value = self.get(run, &leaf.entry, contract::MAX_ENTRY_BYTES * 6 + 2048)?;
        let original = original(&value)?;
        if digest(&value)? != leaf.entry
            || original.text.len() != leaf.bytes
            || original.kind != leaf.kind
            || original.label != leaf.label
        {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "original context history source was changed",
            ));
        }
        Ok(original)
    }
    fn exact_read(&mut self, run: &mut Run<'_>, index: usize) -> Result<AgentContextEntryInput> {
        self.open(run)?;
        let original = self.original(run, index)?;
        if original.text.len() > run.meter.limits.max_read_bytes {
            return Err(Error::limit("context read exceeds byte limit; use slice"));
        }
        Ok(original)
    }
    fn verify(&mut self, run: &mut Run<'_>, node: &ContextHistoryNode) -> Result<()> {
        validate_context_history_node(
            &serde_json::to_value(&run.catalog.history)?,
            &serde_json::to_value(node)?,
        )?;
        run.meter.charge(
            context_history_output_bytes(&serde_json::to_value(node)?)? + 1,
            0,
            1,
            0,
        )?;
        self.open(run)?;
        self.snapshot(run)?;
        self.snapshot(run)?;
        let selected = sorted_union(
            run.catalog.history.leaves[node.start..node.end]
                .iter()
                .map(|leaf| leaf.source_index),
        );
        for index in selected {
            let leaf = run.catalog.history.leaves[run.catalog.leaves[&index]].clone();
            let value = self.get(run, &leaf.entry, contract::MAX_ENTRY_BYTES * 6 + 2048)?;
            let entry = original(&value)?;
            if digest(&value)? != leaf.entry
                || entry.text.len() != leaf.bytes
                || entry.kind != leaf.kind
                || entry.label != leaf.label
            {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "original context history source was changed",
                ));
            }
        }
        self.check(run)?;
        cancel(run.cancelled)
    }
    fn item(
        &mut self,
        run: &mut Run<'_>,
        node: &ContextHistoryNode,
        exacts: &mut BTreeMap<usize, AgentContextEntryInput>,
    ) -> Result<Value> {
        let id = hash(node)?;
        let mut item = json!({"node":id,"start":node.start,"end":node.end});
        if node.end - node.start == 1 {
            run.meter.charge(
                context_history_output_bytes(&serde_json::to_value(node)?)? + 1,
                0,
                1,
                0,
            )?;
            let leaf = run.catalog.history.leaves[node.start].clone();
            if let std::collections::btree_map::Entry::Vacant(entry) =
                exacts.entry(leaf.source_index)
            {
                if leaf.bytes > run.meter.limits.max_read_bytes - run.meter.usage.read_bytes {
                    return Err(run.meter.stop("read-limit"));
                }
                let original = self.exact_read(run, leaf.source_index)?;
                run.meter.charge(0, 0, 0, leaf.bytes)?;
                entry.insert(original);
            }
            self.check(run)?;
            cancel(run.cancelled)?;
            item["kind"] = json!("exact");
            item["text"] = json!(exacts[&leaf.source_index].text);
            return Ok(item);
        }
        self.verify(run, node)?;
        if run.catalog.history.leaves[node.start..node.end]
            .iter()
            .any(|leaf| run.current.invalidated.contains(&leaf.source_index))
            || !run.catalog.summaries.contains_key(&id)
        {
            item["kind"] = json!("pending");
            item["reason"] = json!("missing-summary");
        } else {
            let summary = &run.catalog.summaries[&id];
            run.meter.charge(
                context_history_output_bytes(summary)?,
                0,
                0,
                summary["body"].as_str().unwrap().len(),
            )?;
            item["kind"] = json!("summary");
            item["summary"] = json!(context_history_digest(summary)?);
            item["text"] = summary["body"].clone();
        }
        Ok(item)
    }
    fn finish(run: &Run<'_>, mut output: Value) -> Result<Value> {
        let base = run.meter.usage.work;
        let mut bytes = 0;
        for _ in 0..8 {
            let mut usage = serde_json::to_value(&run.meter.usage)?;
            usage["work"] = json!(base + bytes);
            usage["outputBytes"] = json!(bytes);
            output["usage"] = usage;
            let next = context_history_output_bytes(&output)?;
            if next == bytes {
                if bytes > run.meter.limits.max_output_bytes
                    || base + bytes > run.meter.limits.max_work
                {
                    return Err(Error::limit(
                        "context history read exceeds its budget; request a smaller read or a new budget",
                    ));
                }
                return Ok(output);
            }
            bytes = next;
        }
        Err(Error::limit(
            "context history output accounting did not converge",
        ))
    }
    pub fn inspect(
        &mut self,
        reference: &ContextHistoryRef,
        cancelled: Option<&AtomicBool>,
    ) -> Result<Value> {
        let mut run = self.start(reference, None, None, cancelled)?;
        cancel(cancelled)?;
        self.open(&mut run)?;
        self.snapshot(&mut run)?;
        let selected = checked_indices(
            &run.registered.grant["indices"],
            contract::MAX_LEAVES,
            contract::MAX_LEAVES,
        )?;
        for index in selected {
            let leaf = run.catalog.history.leaves[run.catalog.leaves[&index]].clone();
            let value = self.get(&mut run, &leaf.entry, contract::MAX_ENTRY_BYTES * 6 + 2048)?;
            let entry = original(&value)?;
            if digest(&value)? != leaf.entry
                || entry.text.len() != leaf.bytes
                || entry.kind != leaf.kind
                || entry.label != leaf.label
            {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "original context history source was changed",
                ));
            }
        }
        self.check(&run)?;
        cancel(cancelled)?;
        let count = run.catalog.history.leaves.len();
        run.meter.charge(count, 0, count, 0)?;
        Self::finish(
            &run,
            json!({"history":run.catalog.history,"generation":run.generation}),
        )
    }
    pub fn read(
        &mut self,
        reference: &ContextHistoryRef,
        index: usize,
        requested: Option<&Value>,
        cancelled: Option<&AtomicBool>,
    ) -> Result<Value> {
        if index >= contract::MAX_LEAVES {
            return Err(Error::invalid("context history snapshot index"));
        }
        let value = self.registered(reference)?;
        let targets = Self::targets(&self.catalogs[&value.history], &[index])?;
        let mut run = self.start(reference, requested, Some(targets), cancelled)?;
        cancel(cancelled)?;
        let original = self.exact_read(&mut run, index)?;
        self.check(&run)?;
        cancel(cancelled)?;
        let leaf_index = run.catalog.leaves[&index];
        let leaf = &run.catalog.history.leaves[leaf_index];
        run.meter.charge(1, 0, 1, original.text.len())?;
        Self::finish(
            &run,
            json!({"sourceIndex":index,"leafIndex":leaf_index,"position":leaf.position,"entry":leaf.entry,"kind":original.kind,"label":original.label,"text":original.text}),
        )
    }
    pub fn slice(
        &mut self,
        reference: &ContextHistoryRef,
        index: usize,
        range: ContextHistoryRange,
        requested: Option<&Value>,
        cancelled: Option<&AtomicBool>,
    ) -> Result<Value> {
        if index >= contract::MAX_LEAVES
            || range.start > range.end
            || range.end > contract::MAX_ENTRY_BYTES
        {
            return Err(Error::invalid("context history slice bounds"));
        }
        let value = self.registered(reference)?;
        let targets = Self::targets(&self.catalogs[&value.history], &[index])?;
        let mut run = self.start(reference, requested, Some(targets), cancelled)?;
        cancel(cancelled)?;
        self.open(&mut run)?;
        let original = self.original(&mut run, index)?;
        if range.end > original.text.len()
            || !original.text.is_char_boundary(range.start)
            || !original.text.is_char_boundary(range.end)
        {
            return Err(Error::invalid("context slice must use UTF-8 boundaries"));
        }
        if range.end - range.start > run.meter.limits.max_read_bytes {
            return Err(Error::limit("context slice exceeds byte limit"));
        }
        let text = &original.text[range.start..range.end];
        self.check(&run)?;
        cancel(cancelled)?;
        let leaf_index = run.catalog.leaves[&index];
        let leaf = &run.catalog.history.leaves[leaf_index];
        run.meter.charge(1, 0, 1, text.len())?;
        Self::finish(
            &run,
            json!({"sourceIndex":index,"leafIndex":leaf_index,"position":leaf.position,"startByte":range.start,"endByte":range.end,"text":text}),
        )
    }
    pub fn search(
        &mut self,
        reference: &ContextHistoryRef,
        options: &Value,
        requested: Option<&Value>,
        cancelled: Option<&AtomicBool>,
    ) -> Result<Value> {
        keys(options, &["query", "maxResults", "maxScanBytes"])?;
        let query = options["query"]
            .as_str()
            .filter(|query| !query.is_empty() && query.len() <= MAX_QUERY_BYTES)
            .ok_or_else(|| Error::invalid("context history literal query byte bound"))?;
        let value = self.registered(reference)?;
        let catalog = self.catalogs[&value.history].clone();
        let limits = read_limits(
            requested,
            &serde_json::from_value(value.grant["limits"].clone())?,
        )?;
        let result_limit = options
            .get("maxResults")
            .map(|value| integer(value, 1, limits.max_search_results))
            .transpose()?
            .unwrap_or(limits.max_search_results);
        let scan_limit = options
            .get("maxScanBytes")
            .map(|value| integer(value, 1, limits.max_scan_bytes))
            .transpose()?
            .unwrap_or(limits.max_scan_bytes);
        let picked = checked_indices(
            &value.grant["indices"],
            contract::MAX_LEAVES,
            contract::MAX_LEAVES,
        )?;
        let targets = Self::targets(&catalog, &picked)?;
        let mut run = self.start(
            reference,
            Some(&serde_json::to_value(limits)?),
            Some(targets),
            cancelled,
        )?;
        cancel(cancelled)?;
        self.open(&mut run)?;
        self.snapshot(&mut run)?;
        let mut matches = Vec::new();
        let mut scanned = 0;
        let mut complete = true;
        'sources: for index in &picked {
            let leaf_index = run.catalog.leaves[index];
            let leaf = run.catalog.history.leaves[leaf_index].clone();
            if leaf.bytes > scan_limit - scanned {
                complete = false;
                break;
            }
            let value = self.get(&mut run, &leaf.entry, contract::MAX_ENTRY_BYTES * 6 + 2048)?;
            let entry = original(&value)?;
            if digest(&value)? != leaf.entry
                || entry.text.len() != leaf.bytes
                || entry.kind != leaf.kind
                || entry.label != leaf.label
            {
                return Err(Error::new(
                    "DIGEST_MISMATCH",
                    "original context history source was changed",
                ));
            }
            scanned += leaf.bytes;
            for (start, _) in entry.text.match_indices(query) {
                matches.push(json!({"sourceIndex":index,"leafIndex":leaf_index,"position":leaf.position,"startByte":start,"endByte":start + query.len()}));
                if matches.len() >= result_limit {
                    complete = false;
                    break 'sources;
                }
            }
        }
        self.check(&run)?;
        cancel(cancelled)?;
        run.meter
            .charge(matches.len() + 1, 0, picked.len().max(1), 0)?;
        Self::finish(
            &run,
            json!({"matches":matches,"scannedBytes":scanned,"complete":complete}),
        )
    }
    pub fn expand(
        &mut self,
        reference: &ContextHistoryRef,
        node_id: &str,
        requested: Option<&Value>,
        cancelled: Option<&AtomicBool>,
    ) -> Result<Value> {
        let value = self.registered(reference)?;
        let catalog = self.catalogs[&value.history].clone();
        let node = Self::lookup(&catalog, node_id)?;
        let mut run = self.start(reference, requested, Some(vec![node.clone()]), cancelled)?;
        cancel(cancelled)?;
        let children = if node.end - node.start == 1 {
            vec![node.clone()]
        } else {
            let middle = (node.start + node.end) / 2;
            vec![
                Self::node(&catalog, node.start, middle)?,
                Self::node(&catalog, middle, node.end)?,
            ]
        };
        let mut items = Vec::new();
        let mut exacts = BTreeMap::new();
        for child in &children {
            items.push(self.item(&mut run, child, &mut exacts)?);
        }
        self.check(&run)?;
        cancel(cancelled)?;
        let pending = items.iter().any(|item| item["kind"] == "pending");
        Self::finish(
            &run,
            json!({"node":node_id,"start":node.start,"end":node.end,"items":items,"status":if pending {"incomplete"} else {"complete"},"reason":if pending {json!("missing-summary")} else {Value::Null}}),
        )
    }
    fn binding(&mut self, run: &Run<'_>) -> Result<Value> {
        let request_digest = digest(
            &json!({"schema":"algal.context-history-read-request.v1","principal":self.principal,"request":run.catalog.selection,"current":run.identity,"generation":run.generation,"limits":run.meter.limits}),
        )?;
        let selection =
            context_history_selection(&run.registered.grant, &run.current.access, &request_digest)?;
        let binding = json!({"history":run.catalog.id,"head":run.catalog.history.head,"audience":run.catalog.history.scope.audience,"generation":run.generation,"policy":run.catalog.generation["policy"],"budget":hash(&run.meter.limits)?,"selection":selection});
        if !self.selections.contains_key(&selection) {
            if self.selections.len() >= MAX_GRANTS {
                return Err(Error::limit("context history saved selection bound"));
            }
            self.selections.insert(
                selection,
                SavedSelection {
                    reference: run.reference.capability.clone(),
                    binding: binding.clone(),
                    request: run.catalog.selection.clone(),
                    request_digest,
                    current: run.identity.clone(),
                },
            );
        }
        Ok(binding)
    }
    fn cursor(&mut self, binding: &Value, offset: usize) -> Result<()> {
        let cursor = parse_context_history_cursor(
            &json!({"schema":"algal.context-history-cursor.v1","binding":binding,"offset":offset}),
        )?;
        let id = context_history_digest(&cursor)?;
        if !self.cursors.contains(&id) && self.cursors.len() >= MAX_GRANTS {
            return Err(Error::limit("context history cursor bound"));
        }
        self.cursors.insert(id);
        Ok(())
    }
    fn page(
        run: &mut Run<'_>,
        binding: &Value,
        start: usize,
        items: &[Value],
        status: &str,
        reason: Option<&str>,
    ) -> Result<Value> {
        let end = items
            .last()
            .map_or(start, |item| item["end"].as_u64().unwrap() as usize);
        let cursor = if status == "complete"
            || status == "unavailable"
            || end == run.catalog.history.leaves.len()
        {
            Value::Null
        } else {
            json!({"schema":"algal.context-history-cursor.v1","binding":binding,"offset":end})
        };
        let mut page = json!({"schema":"algal.context-history-view.v1","binding":binding,"limits":run.meter.limits,"start":start,"end":end,"items":items,"status":status,"reason":reason,"cursor":cursor,"usage":run.meter.usage});
        let mut bytes = context_history_output_bytes(&page)?;
        for _ in 0..8 {
            page["usage"]["work"] = json!(run.meter.usage.work + bytes);
            let next = context_history_output_bytes(&page)?;
            if next == bytes {
                break;
            }
            bytes = next;
        }
        if bytes > run.meter.limits.max_output_bytes
            || run.meter.usage.work + bytes > run.meter.limits.max_work
        {
            return Err(run
                .meter
                .stop(if bytes > run.meter.limits.max_output_bytes {
                    "output-limit"
                } else {
                    "work-limit"
                }));
        }
        parse_context_history_view(&page)
    }
    pub fn overview(
        &mut self,
        reference: &ContextHistoryRef,
        options: &Value,
        cancelled: Option<&AtomicBool>,
    ) -> Result<Value> {
        keys(options, &["limits", "cursor"])?;
        let cursor = options
            .get("cursor")
            .map(parse_context_history_cursor)
            .transpose()?;
        let mut run = self.start(reference, options.get("limits"), None, cancelled)?;
        let binding = self.binding(&run)?;
        if let Some(cursor) = &cursor
            && (!self.cursors.contains(&context_history_digest(cursor)?)
                || cursor["binding"] != binding)
        {
            return Err(denied());
        }
        let start = cursor
            .as_ref()
            .map_or(0, |cursor| cursor["offset"].as_u64().unwrap() as usize);
        let protected = checked_indices(
            &run.catalog.selection["protectedIndices"],
            contract::MAX_LEAVES,
            contract::MAX_LEAVES,
        )?;
        let relevant = if run.catalog.selection["relevance"].is_null() {
            Vec::new()
        } else {
            checked_indices(
                &run.catalog.selection["relevance"]["indices"],
                contract::MAX_LEAVES,
                ReadLimits::default().max_search_results,
            )?
        };
        let detailed = sorted_union(
            protected
                .iter()
                .chain(&relevant)
                .map(|index| run.catalog.leaves[index]),
        );
        let recent = run.catalog.selection["recentLeaves"].as_u64().unwrap() as usize;
        let cover = context_history_cover(run.catalog.history.leaves.len(), recent, &detailed)?;
        if start != run.catalog.history.leaves.len()
            && !cover.iter().any(|range| range.start == start)
        {
            return Err(denied());
        }
        let protected_leaves = protected
            .iter()
            .map(|index| run.catalog.leaves[index])
            .filter(|index| *index >= start)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        let mut exacts = BTreeMap::new();
        let mut status = "complete";
        let mut reason = None;
        let body = (|| -> Result<()> {
            cancel(cancelled)?;
            self.open(&mut run)?;
            run.meter
                .charge(cover.len() + run.catalog.history.leaves.len(), 0, 0, 0)?;
            if protected_leaves.len() > contract::MAX_VIEW_ITEMS
                || protected_leaves
                    .iter()
                    .map(|index| run.catalog.history.leaves[*index].bytes)
                    .sum::<usize>()
                    > run.meter.limits.max_read_bytes
            {
                return Err(run.meter.stop("protected-overflow"));
            }
            let recent_start = start.max(run.catalog.history.leaves.len().saturating_sub(recent));
            let reserve = sorted_union(
                protected_leaves
                    .iter()
                    .copied()
                    .chain(recent_start..run.catalog.history.leaves.len()),
            );
            for index in reserve {
                let leaf = run.catalog.history.leaves[index].clone();
                if leaf.bytes > run.meter.limits.max_read_bytes - run.meter.usage.read_bytes {
                    return Err(run.meter.stop(if protected_leaves.contains(&index) {
                        "protected-overflow"
                    } else {
                        "read-limit"
                    }));
                }
                let entry = self.exact_read(&mut run, leaf.source_index)?;
                run.meter.charge(0, 0, 0, leaf.bytes)?;
                exacts.insert(leaf.source_index, entry);
            }
            for range in &cover {
                if range.start < start {
                    continue;
                }
                if items.len() >= contract::MAX_VIEW_ITEMS {
                    status = "incomplete";
                    reason = Some("page-limit");
                    break;
                }
                let node = Self::node(&run.catalog, range.start, range.end)?;
                let item = self.item(&mut run, &node, &mut exacts)?;
                let mut trial = items.clone();
                trial.push(item.clone());
                let complete = trial.last().unwrap()["end"] == run.catalog.history.leaves.len()
                    && trial.iter().all(|item| item["kind"] != "pending");
                Self::page(
                    &mut run,
                    &binding,
                    start,
                    &trial,
                    if complete { "complete" } else { "incomplete" },
                    if trial.iter().any(|item| item["kind"] == "pending") {
                        Some("missing-summary")
                    } else if complete {
                        None
                    } else {
                        Some("page-limit")
                    },
                )?;
                items.push(item);
            }
            if reason.is_none() && items.iter().any(|item| item["kind"] == "pending") {
                status = "incomplete";
                reason = Some("missing-summary");
            }
            Ok(())
        })();
        if let Err(error) = body {
            if error.code == "EFFECT_FAILED"
                && cancelled.is_some_and(|signal| signal.load(Ordering::Relaxed))
            {
                status = "incomplete";
                reason = Some("cancelled");
                items.clear();
            } else if let Some(stop) = run.meter.stop {
                status = "budget-exhausted";
                reason = Some(stop);
            } else if error.code == "STORE_MISS" {
                status = "unavailable";
                reason = Some("source-unavailable");
                items.clear();
            } else {
                return Err(error);
            }
        }
        if status != "unavailable"
            && reason != Some("cancelled")
            && protected_leaves.iter().any(|index| {
                !items
                    .iter()
                    .any(|item| item["kind"] == "exact" && item["start"] == *index)
            })
        {
            status = "budget-exhausted";
            reason = Some("protected-overflow");
            items.clear();
        }
        if reason == Some("protected-overflow") {
            items.clear();
        }
        self.check(&run)?;
        let page = match Self::page(&mut run, &binding, start, &items, status, reason) {
            Ok(page) => page,
            Err(error) if run.meter.stop.is_some() => {
                let reason = run.meter.stop;
                Self::page(&mut run, &binding, start, &[], "budget-exhausted", reason)
                    .map_err(|_| error)?
            }
            Err(error) => return Err(error),
        };
        if !page["cursor"].is_null() {
            self.cursor(
                &binding,
                page["cursor"]["offset"].as_u64().unwrap() as usize,
            )?;
        }
        let selection = self.selections[binding["selection"].as_str().unwrap()]
            .request_digest
            .clone();
        validate_context_history_view_access(
            &serde_json::to_value(&run.catalog.history)?,
            &run.catalog.generation,
            &page,
            &json!(run.catalog.nodes.values().collect::<Vec<_>>()),
            &json!(run.catalog.summaries.values().collect::<Vec<_>>()),
            &json!({"reference":reference,"grant":run.registered.grant,"access":run.current.access,"request":selection}),
            cursor.as_ref(),
        )?;
        Ok(page)
    }
    pub fn validate_view(
        &mut self,
        reference: &ContextHistoryRef,
        input: &Value,
        cursor: Option<&Value>,
    ) -> Result<()> {
        let value = self.registered(reference)?;
        let catalog = self.catalogs[&value.history].clone();
        let view = parse_context_history_view(input)?;
        let selection = self
            .selections
            .get(view["binding"]["selection"].as_str().unwrap())
            .ok_or_else(denied)?;
        if selection.reference != reference.capability
            || selection.binding != view["binding"]
            || selection.request != catalog.selection
        {
            return Err(denied());
        }
        let current_id = selection.current.clone();
        let request = selection.request_digest.clone();
        if let Some(cursor) = cursor
            && !self
                .cursors
                .contains(&context_history_digest(&parse_context_history_cursor(
                    cursor,
                )?)?)
        {
            return Err(denied());
        }
        let current = self.current(&catalog, reference, &value.grant, None)?;
        self.registered(reference)?;
        if hash(&current)? != current_id
            || context_history_digest(&catalog.generation)? != view["binding"]["generation"]
        {
            return Err(denied());
        }
        let mut requested = value.grant.clone();
        requested["limits"] = view["limits"].clone();
        validate_context_history_delegation(&value.grant, &requested)?;
        for item in view["items"].as_array().unwrap() {
            let node = Self::lookup(&catalog, item["node"].as_str().unwrap())?;
            validate_context_history_access(
                &serde_json::to_value(&catalog.history)?,
                &serde_json::to_value(reference)?,
                &value.grant,
                &current.access,
                Some(&serde_json::to_value(&node)?),
            )?;
            if item["kind"] == "summary"
                && catalog.history.leaves[node.start..node.end]
                    .iter()
                    .any(|leaf| current.invalidated.contains(&leaf.source_index))
            {
                return Err(denied());
            }
        }
        validate_context_history_view_access(
            &serde_json::to_value(&catalog.history)?,
            &catalog.generation,
            &view,
            &json!(catalog.nodes.values().collect::<Vec<_>>()),
            &json!(catalog.summaries.values().collect::<Vec<_>>()),
            &json!({"reference":reference,"grant":value.grant,"access":current.access,"request":request}),
            cursor,
        )?;
        let mut run = self.start(reference, Some(&view["limits"]), None, None)?;
        if run.identity != current_id {
            return Err(denied());
        }
        self.open(&mut run)?;
        for item in view["items"].as_array().unwrap() {
            self.verify(
                &mut run,
                &Self::lookup(&catalog, item["node"].as_str().unwrap())?,
            )?;
        }
        self.check(&run)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent_context::put_agent_context;
    use std::{
        cell::{Cell, RefCell},
        rc::Rc,
    };

    fn fixture(count: usize) -> (Store, ContextHistory, Rc<RefCell<ContextHistoryCurrent>>) {
        let mut store = Store::default();
        let sources = (0..count)
            .map(|i| AgentContextEntryInput {
                kind: if i == 0 {
                    AgentContextKind::Instruction
                } else {
                    AgentContextKind::Observation
                },
                label: format!("source-{i}"),
                text: format!("record {i} needle\n"),
            })
            .collect::<Vec<_>>();
        let snapshot = put_agent_context(&mut store, &sources).unwrap();
        let scope = json!({"application":"app","realm":"realm","workspace":"workspace","task":"task","audience":"owner"});
        let selected = (0..count).map(|i| json!({"sourceIndex":i,"position":37 + i,"event":hash(&json!({"event":i})).unwrap()})).collect::<Vec<_>>();
        let history = capture_context_history(&store, &json!({"scope":scope,"head":hash(&json!({"ownerSequence":19})).unwrap(),"snapshot":snapshot,"epoch":2,"firstPosition":37,"sources":selected})).unwrap();
        let current = Rc::new(RefCell::new(ContextHistoryCurrent {
            access: json!({"schema":"algal.context-history-access.v1","history":hash(&history).unwrap(),"scope":scope,"head":history.head,"snapshot":snapshot,"revision":0,"indices":(0..count).collect::<Vec<_>>(),"state":"active"}),
            invalidated: Vec::new(),
        }));
        (store, history, current)
    }
    fn host<'a>(
        store: &'a Store,
        current: Rc<RefCell<ContextHistoryCurrent>>,
    ) -> ContextHistoryHost<'a, impl FnMut(&ContextHistory, &str) -> Result<ContextHistoryCurrent>>
    {
        ContextHistoryHost::new(store, "owner", move |_, _| Ok(current.borrow().clone())).unwrap()
    }
    fn oracle(count: usize, recent: usize, detailed: &[usize]) -> Vec<ContextHistoryRange> {
        let mut result = Vec::new();
        let mut start = 0;
        while start < count {
            let mut best = 1;
            for length in (1..=contract::MAX_TREE_DEPTH).map(|power| 1 << power) {
                let end = start + length;
                if start % length != 0
                    || end > count
                    || end > count.saturating_sub(recent)
                    || length > count - end
                    || detailed.iter().any(|n| *n >= start && *n < end)
                {
                    continue;
                }
                best = length;
            }
            result.push(ContextHistoryRange {
                start,
                end: start + best,
            });
            start += best;
        }
        result
    }
    #[test]
    fn every_prefix_matches_an_independently_enumerated_cover() {
        for count in 0..=contract::MAX_LEAVES {
            for recent in [0, 1, 4, 17] {
                for detailed in [
                    Vec::new(),
                    sorted_union(
                        [0, count / 2, count.saturating_sub(1)]
                            .into_iter()
                            .filter(|n| *n < count),
                    ),
                ] {
                    let actual = context_history_cover(count, recent, &detailed).unwrap();
                    assert_eq!(
                        actual,
                        oracle(count, recent, &detailed),
                        "prefix {count}, recent {recent}"
                    );
                    assert_eq!(
                        actual
                            .iter()
                            .map(|range| range.end - range.start)
                            .sum::<usize>(),
                        count
                    );
                }
            }
        }
        assert!(context_history_cover(1025, 0, &[]).is_err());
        assert!(context_history_cover(8, 1025, &[]).is_err());
        assert!(context_history_cover(8, 0, &[1, 1]).is_err());
    }
    #[test]
    fn missing_summaries_remain_pending_without_source_or_store_writes() {
        let (store, history, current) = fixture(16);
        let store = store.trace_source_reads();
        let mut host = host(&store, current);
        let reference = host
            .admit(&serde_json::to_value(&history).unwrap(), None, None, None)
            .unwrap();
        let page = host.overview(&reference, &json!({}), None).unwrap();
        assert_eq!(page["status"], "incomplete");
        assert_eq!(page["reason"], "missing-summary");
        assert!(
            page["items"]
                .as_array()
                .unwrap()
                .iter()
                .any(|item| item["kind"] == "pending")
        );
        assert!(
            page["items"]
                .as_array()
                .unwrap()
                .iter()
                .any(|item| item["kind"] == "exact" && item["start"] == 0)
        );
        host.validate_view(&reference, &page, None).unwrap();
        let node = context_history_node(&serde_json::to_value(&history).unwrap(), 0, 2).unwrap();
        let expanded = host
            .expand(&reference, &hash(&node).unwrap(), None, None)
            .unwrap();
        assert!(
            expanded["items"]
                .as_array()
                .unwrap()
                .iter()
                .all(|item| item["kind"] == "exact")
        );
        let read = host.read(&reference, 13, None, None).unwrap();
        assert_eq!(read["text"], "record 13 needle\n");
        assert_eq!(read["position"], 50);
        assert_eq!(
            read["usage"]["outputBytes"].as_u64().unwrap() as usize,
            context_history_output_bytes(&read).unwrap()
        );
        assert!(
            store
                .source_reads()
                .unwrap()
                .keys()
                .all(|(kind, id)| kind == "values"
                    && (*id == history.snapshot
                        || history.leaves.iter().any(|leaf| &leaf.entry == id)))
        );
    }
    #[test]
    fn unicode_slices_and_literal_search_preserve_original_bytes() {
        let (mut store, mut history, current) = fixture(1);
        let snapshot = put_agent_context(
            &mut store,
            &[AgentContextEntryInput {
                kind: AgentContextKind::Input,
                label: "unicode".to_owned(),
                text: "\u{feff}é東京 é東京".to_owned(),
            }],
        )
        .unwrap();
        history = capture_context_history(&store, &json!({"scope":history.scope,"head":history.head,"snapshot":snapshot,"epoch":history.epoch,"firstPosition":history.first_position,"sources":[{"sourceIndex":0,"event":history.leaves[0].event,"position":history.first_position}]})).unwrap();
        current.borrow_mut().access["history"] = json!(hash(&history).unwrap());
        current.borrow_mut().access["snapshot"] = json!(snapshot);
        let mut host = host(&store, current);
        let reference = host
            .admit(&serde_json::to_value(history).unwrap(), None, None, None)
            .unwrap();
        assert_eq!(
            host.slice(
                &reference,
                0,
                ContextHistoryRange { start: 0, end: 5 },
                None,
                None
            )
            .unwrap()["text"],
            "\u{feff}é"
        );
        assert_eq!(
            host.slice(
                &reference,
                0,
                ContextHistoryRange { start: 4, end: 5 },
                None,
                None
            )
            .unwrap_err()
            .code,
            "PARSE_FAILED"
        );
        let search = host
            .search(&reference, &json!({"query":"東京"}), None, None)
            .unwrap();
        assert_eq!(search["matches"][0]["startByte"], 5);
        assert_eq!(search["matches"][1]["startByte"], 14);
        assert_eq!(
            host.search(
                &reference,
                &json!({"query":"東京","maxResults":1}),
                None,
                None
            )
            .unwrap()["complete"],
            false
        );
    }
    #[test]
    fn source_selection_revocation_and_revision_rollback_cannot_be_serialized_away() {
        let (store, history, current) = fixture(8);
        let mut host = host(&store, Rc::clone(&current));
        let reference = host
            .admit(&serde_json::to_value(&history).unwrap(), None, None, None)
            .unwrap();
        let page = host.overview(&reference, &json!({}), None).unwrap();
        let child = host.delegate(&reference, &[0, 2], None).unwrap();
        assert_eq!(
            host.read(&child, 1, None, None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
        assert_eq!(
            host.inspect(&child, None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
        assert_eq!(
            host.search(&child, &json!({"query":"needle"}), None, None)
                .unwrap()["matches"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        current.borrow_mut().access["revision"] = json!(1);
        assert_eq!(
            host.validate_view(&reference, &page, None)
                .unwrap_err()
                .code,
            "CAPABILITY_DENIED"
        );
        current.borrow_mut().access["revision"] = json!(0);
        assert_eq!(
            host.read(&reference, 0, None, None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
        current.borrow_mut().access["revision"] = json!(1);
        host.revoke(&reference).unwrap();
        assert_eq!(
            host.read(&child, 0, None, None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
        assert_eq!(
            host.admit(&serde_json::to_value(&history).unwrap(), None, None, None)
                .unwrap_err()
                .code,
            "CAPABILITY_DENIED"
        );
    }
    #[test]
    fn in_flight_access_changes_refuse_the_original_before_disclosure() {
        let (store, history, current) = fixture(8);
        let resolved = Rc::clone(&current);
        let calls = Rc::new(Cell::new(0));
        let trigger = Rc::new(Cell::new(usize::MAX));
        let count = Rc::clone(&calls);
        let change = Rc::clone(&trigger);
        let mut host = ContextHistoryHost::new(&store, "owner", move |_, _| {
            count.set(count.get() + 1);
            if count.get() == change.get() {
                resolved.borrow_mut().access["indices"] = json!([1, 2, 3, 4, 5, 6, 7]);
            }
            Ok(resolved.borrow().clone())
        })
        .unwrap();
        let reference = host
            .admit(&serde_json::to_value(history).unwrap(), None, None, None)
            .unwrap();
        trigger.set(calls.get() + 7);
        assert_eq!(
            host.read(&reference, 0, None, None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
    }
    #[test]
    fn cancellation_and_encoded_output_limits_never_return_partial_originals() {
        let (store, history, current) = fixture(8);
        let mut host = host(&store, current);
        let reference = host
            .admit(&serde_json::to_value(history).unwrap(), None, None, None)
            .unwrap();
        let cancelled = AtomicBool::new(true);
        let page = host
            .overview(&reference, &json!({}), Some(&cancelled))
            .unwrap();
        assert_eq!(page["reason"], "cancelled");
        assert_eq!(page["items"], json!([]));
        assert_eq!(
            host.read(&reference, 0, None, Some(&cancelled))
                .unwrap_err()
                .code,
            "EFFECT_FAILED"
        );
        assert_eq!(
            host.read(&reference, 0, Some(&json!({"maxOutputBytes":1})), None)
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
        assert_eq!(
            host.read(&reference, 0, Some(&json!({"maxWork":1})), None)
                .unwrap_err()
                .code,
            "BUDGET_EXHAUSTED"
        );
    }
    #[test]
    fn cached_pages_require_originals_that_still_exist_in_the_source_store() {
        let (source, history, current) = fixture(16);
        let directory = tempfile::tempdir().unwrap();
        let mut writer = Store::open(directory.path(), true).unwrap();
        for entry in &history.leaves {
            writer
                .put(
                    "values",
                    &source.get("values", &entry.entry).unwrap().unwrap(),
                )
                .unwrap();
        }
        writer
            .put(
                "values",
                &source.get("values", &history.snapshot).unwrap().unwrap(),
            )
            .unwrap();
        let store = Store::open(directory.path(), false).unwrap();
        let mut host = host(&store, current);
        let reference = host
            .admit(&serde_json::to_value(&history).unwrap(), None, None, None)
            .unwrap();
        let page = host.overview(&reference, &json!({}), None).unwrap();
        host.validate_view(&reference, &page, None).unwrap();
        let path = directory
            .path()
            .join("values")
            .join(format!("{}.json", &history.leaves[0].entry[7..]));
        std::fs::remove_file(path).unwrap();
        assert_eq!(
            host.validate_view(&reference, &page, None)
                .unwrap_err()
                .code,
            "STORE_MISS"
        );
    }
    #[test]
    fn numeric_normalization_and_registry_capacity_keep_the_original_bounds() {
        assert_eq!(
            read_limits(Some(&json!({"maxReadBytes":128.0})), &ReadLimits::default())
                .unwrap()
                .max_read_bytes,
            128
        );
        assert_eq!(checked_indices(&json!([0.0]), 1, 1).unwrap(), vec![0]);
        assert!(read_limits(Some(&json!({"maxReadBytes":0.0})), &ReadLimits::default()).is_err());
        assert!(read_limits(Some(&json!({"maxReadBytes":1.5})), &ReadLimits::default()).is_err());
        let (store, history, current) = fixture(0);
        let mut host = host(&store, current);
        let history = serde_json::to_value(history).unwrap();
        let reference = host.admit(&history, None, None, None).unwrap();
        for max in 1..MAX_GRANTS {
            host.admit(&history, None, None, Some(&json!({"maxReadBytes":max})))
                .unwrap();
        }
        assert_eq!(
            host.admit(
                &history,
                None,
                None,
                Some(&json!({"maxReadBytes":MAX_GRANTS}))
            )
            .unwrap_err()
            .code,
            "BUDGET_EXHAUSTED"
        );
        host.revoke(&reference).unwrap();
        assert_eq!(
            host.admit(&history, None, None, None).unwrap_err().code,
            "CAPABILITY_DENIED"
        );
    }
}
