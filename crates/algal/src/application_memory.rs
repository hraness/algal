//! Native application memory — parity port of `src/application-memory.ts`.
//! Scoped, admitted observations materialize into bounded native query
//! derivations; the engine here is the crate's own `algal.query.v1`
//! evaluator, so the derivation record's `engine` identity is
//! [`engine_identity`]. The store is threaded per-call so the lifecycle
//! service and the memory service share one `Store` (as in TypeScript).

use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    contract::{integer, list, object, text},
    memory,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::collections::BTreeSet;

pub const RECORD_BYTES: usize = 262_144;
pub const DEPTH: usize = 24;
pub const NODES: usize = 16_384;
pub const ARCHIVE_LIMIT: usize = 128;

pub fn app_json(value: &Value) -> Result<Value> {
    let mut stack = vec![(value, 0usize)];
    let mut count = 0usize;
    while let Some((v, depth)) = stack.pop() {
        count += 1;
        if count > NODES || depth > DEPTH {
            return Err(Error::limit("Application structure bound exceeded"));
        }
        match v {
            Value::Array(a) => stack.extend(a.iter().map(|v| (v, depth + 1))),
            Value::Object(o) => stack.extend(o.values().map(|v| (v, depth + 1))),
            _ => (),
        }
    }
    if canonical(value)?.len() > RECORD_BYTES {
        return Err(Error::limit("Application byte bound exceeded"));
    }
    Ok(value.clone())
}

/// Closed record: every listed key must be present and no other key allowed.
pub fn app_object<'a>(value: &'a Value, fields: &[&str]) -> Result<&'a Map<String, Value>> {
    app_json(value)?;
    let row = object(value)?;
    let mut have: Vec<&str> = row.keys().map(String::as_str).collect();
    have.sort();
    let mut want = fields.to_vec();
    want.sort();
    if have != want {
        return Err(Error::invalid("Unknown or missing application field"));
    }
    Ok(row)
}

/// Object whose keys are a subset of `required ∪ optional` with every
/// `required` key present — mirrors a TypeScript input interface where the
/// listed fields may be absent or `null`.
pub fn app_object_opt<'a>(
    value: &'a Value,
    required: &[&str],
    optional: &[&str],
) -> Result<&'a Map<String, Value>> {
    app_json(value)?;
    let row = object(value)?;
    for key in row.keys() {
        let key = key.as_str();
        if !required.contains(&key) && !optional.contains(&key) {
            return Err(Error::invalid("Unknown or missing application field"));
        }
    }
    if required.iter().any(|key| !row.contains_key(*key)) {
        return Err(Error::invalid("Unknown or missing application field"));
    }
    Ok(row)
}

/// `/^[a-z][a-z0-9._-]{0,63}$/` — wider than the kebab-case contract id.
pub fn app_id(value: &Value) -> Result<&str> {
    let s = text(value, 64)?;
    if s.is_empty()
        || !s.as_bytes()[0].is_ascii_lowercase()
        || !s.bytes().all(|b| {
            b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'.' || b == b'_' || b == b'-'
        })
    {
        return Err(Error::invalid("Invalid application identifier"));
    }
    Ok(s)
}

pub fn app_ref(value: &Value) -> Result<&str> {
    check_digest(text(value, 71)?)
}

pub fn opt_ref(value: &Value) -> Result<Option<String>> {
    if value.is_null() {
        return Ok(None);
    }
    Ok(Some(app_ref(value)?.to_owned()))
}

pub fn app_refs(value: &Value, max: usize) -> Result<Vec<String>> {
    let rows = list(value, max)?;
    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        out.push(app_ref(row)?.to_owned());
    }
    let unique: BTreeSet<_> = out.iter().collect();
    if unique.len() != out.len() || out.windows(2).any(|w| w[0] >= w[1]) {
        return Err(Error::invalid(
            "Application references must be sorted and unique",
        ));
    }
    Ok(out)
}

pub fn app_ids(value: &Value, max: usize) -> Result<Vec<String>> {
    let rows = list(value, max)?;
    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        out.push(app_id(row)?.to_owned());
    }
    let unique: BTreeSet<_> = out.iter().collect();
    if unique.len() != out.len() || out.windows(2).any(|w| w[0] >= w[1]) {
        return Err(Error::invalid("Identifiers must be sorted and unique"));
    }
    Ok(out)
}

pub fn app_tag(value: &Value, tag: &str) -> Result<()> {
    if value.as_str() != Some(tag) {
        return Err(Error::invalid(format!("Expected {tag}")));
    }
    Ok(())
}

pub fn bounded_text(value: &Value, max: usize) -> Result<String> {
    let s = value
        .as_str()
        .ok_or_else(|| Error::invalid("expected text"))?;
    if s.len() > max {
        return Err(Error::invalid("text exceeds bound"));
    }
    if s.is_empty() || s.contains('\0') {
        return Err(Error::invalid("Invalid bounded text"));
    }
    Ok(s.to_owned())
}

/// Content lookup with the record's digest bound to the stored bytes.
pub fn get_record(store: &Store, reference: &str) -> Result<Value> {
    let value = store
        .get("values", check_digest(reference)?)?
        .ok_or_else(|| Error::invalid("Missing or changed application record"))?;
    if digest(&app_json(&value)?)? != reference {
        return Err(Error::invalid("Missing or changed application record"));
    }
    Ok(value)
}

pub fn put_record(store: &mut Store, record: &Value) -> Result<String> {
    store.put("values", &app_json(record)?)
}

fn atom(value: &Value) -> Result<()> {
    match value {
        Value::Null | Value::Bool(_) | Value::String(_) => (),
        Value::Number(n) => {
            if n.as_f64().is_none_or(|f| !f.is_finite()) {
                return Err(Error::invalid("Memory atoms must be primitives"));
            }
        }
        _ => return Err(Error::invalid("Memory atoms must be primitives")),
    }
    if canonical(value)?.len() > 1024 {
        return Err(Error::limit("Memory atom exceeds bound"));
    }
    Ok(())
}

#[derive(Clone, Debug, PartialEq)]
pub struct Claim {
    pub relation: String,
    pub tuple: Vec<Value>,
    pub polarity: String,
}

pub fn parse_claim(input: &Value) -> Result<Claim> {
    let v = app_object(input, &["relation", "tuple", "polarity"])?;
    let polarity = text(&v["polarity"], 16)?;
    if polarity != "supported" && polarity != "opposed" {
        return Err(Error::invalid("Invalid claim polarity"));
    }
    let tuple = list(&v["tuple"], 7)?.clone();
    for item in &tuple {
        atom(item)?;
    }
    Ok(Claim {
        relation: app_id(&v["relation"])?.to_owned(),
        tuple,
        polarity: polarity.to_owned(),
    })
}

pub fn claim_value(claim: &Claim) -> Value {
    json!({"relation": claim.relation, "tuple": claim.tuple, "polarity": claim.polarity})
}

#[derive(Clone, Debug)]
pub struct MemorySchema {
    pub relations: Vec<(String, usize)>,
    pub value: Value,
}

pub fn parse_schema(input: &Value) -> Result<MemorySchema> {
    let v = app_object(input, &["contract", "relations"])?;
    app_tag(&v["contract"], "algal.application-memory-schema.v1")?;
    let mut relations = Vec::new();
    for row in list(&v["relations"], 16)? {
        let r = app_object(row, &["name", "arity"])?;
        relations.push((app_id(&r["name"])?.to_owned(), integer(&r["arity"], 0, 7)?));
    }
    if relations.is_empty()
        || relations.windows(2).any(|w| w[0].0 >= w[1].0)
        || relations
            .iter()
            .map(|r| &r.0)
            .collect::<BTreeSet<_>>()
            .len()
            != relations.len()
    {
        return Err(Error::invalid(
            "Memory relations must be nonempty, sorted and unique",
        ));
    }
    Ok(MemorySchema {
        relations,
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct MemoryQueries {
    pub queries: Vec<String>,
}

pub fn parse_queries(input: &Value) -> Result<MemoryQueries> {
    let v = app_object(input, &["contract", "queries"])?;
    app_tag(&v["contract"], "algal.application-memory-queries.v1")?;
    Ok(MemoryQueries {
        queries: app_refs(&v["queries"], 32)?,
    })
}

#[derive(Clone, Debug)]
pub struct MemoryProcedure {
    pub id: String,
    pub schema: String,
    pub manifest: String,
    pub decoder: String,
    pub dependencies: Vec<String>,
    pub prerequisite: Option<String>,
    pub value: Value,
}

pub fn parse_procedure(input: &Value) -> Result<MemoryProcedure> {
    let v = app_object(
        input,
        &[
            "contract",
            "id",
            "schema",
            "manifest",
            "decoder",
            "dependencies",
            "prerequisite",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-procedure.v1")?;
    Ok(MemoryProcedure {
        id: app_id(&v["id"])?.to_owned(),
        schema: app_ref(&v["schema"])?.to_owned(),
        manifest: app_ref(&v["manifest"])?.to_owned(),
        decoder: app_ref(&v["decoder"])?.to_owned(),
        dependencies: app_ids(&v["dependencies"], 8)?,
        prerequisite: opt_ref(&v["prerequisite"])?,
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct MemoryQuery {
    pub id: String,
    pub schema: String,
    pub program: String,
    pub procedures: Vec<String>,
    pub polarity_column: usize,
    pub conflict: String,
}

pub fn parse_query(input: &Value) -> Result<MemoryQuery> {
    let v = app_object(
        input,
        &[
            "contract",
            "id",
            "schema",
            "program",
            "procedures",
            "polarityColumn",
            "conflict",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-query.v1")?;
    let conflict = text(&v["conflict"], 24)?;
    if conflict != "single-value" && conflict != "set-of-values" {
        return Err(Error::invalid("Invalid query interpretation"));
    }
    Ok(MemoryQuery {
        id: app_id(&v["id"])?.to_owned(),
        schema: app_ref(&v["schema"])?.to_owned(),
        program: app_ref(&v["program"])?.to_owned(),
        procedures: app_refs(&v["procedures"], 16)?,
        polarity_column: integer(&v["polarityColumn"], 0, 7)?,
        conflict: conflict.to_owned(),
    })
}

/// `algal.query.v1` structural admission; the evaluator enforces semantics.
pub fn parse_native_program(input: &Value) -> Result<Value> {
    let v = app_object(input, &["contract", "rules", "query", "limits"])?;
    app_tag(&v["contract"], "algal.query.v1")?;
    let mut arities: Map<String, Value> = Map::new();
    let literal = |input: &Value, arities: &mut Map<String, Value>| -> Result<Value> {
        let row = app_object(input, &["relation", "terms"])?;
        let relation = app_id(&row["relation"])?.to_owned();
        let mut terms = Vec::new();
        for term in list(&row["terms"], 8)? {
            if term.is_object() {
                let variable = app_object(term, &["var"])?;
                terms.push(json!({"var": app_id(&variable["var"])?}));
            } else {
                atom(term)?;
                terms.push(term.clone());
            }
        }
        if let Some(prior) = arities.get(&relation)
            && prior != &json!(terms.len())
        {
            return Err(Error::invalid("Inconsistent memory relation arity"));
        }
        arities.insert(relation.clone(), json!(terms.len()));
        Ok(json!({"relation": relation, "terms": terms}))
    };
    let variable_names = |literal: &Value| -> Vec<String> {
        literal["terms"]
            .as_array()
            .map(|terms| {
                terms
                    .iter()
                    .filter(|t| t.is_object())
                    .map(|t| t["var"].as_str().unwrap_or_default().to_owned())
                    .collect()
            })
            .unwrap_or_default()
    };
    let mut rules = Vec::new();
    for input in list(&v["rules"], 12)? {
        let r = app_object(input, &["id", "head", "body"])?;
        let head = literal(&r["head"], &mut arities)?;
        let mut body = Vec::new();
        for item in list(&r["body"], 8)? {
            body.push(literal(item, &mut arities)?);
        }
        if body.is_empty() {
            return Err(Error::invalid("Memory rules need a body"));
        }
        let bound: BTreeSet<String> = body.iter().flat_map(variable_names).collect();
        if variable_names(&head)
            .iter()
            .any(|name| !bound.contains(name))
        {
            return Err(Error::invalid("Unsafe memory rule"));
        }
        rules.push(json!({"id": app_id(&r["id"])?, "head": head, "body": body}));
    }
    if rules
        .iter()
        .map(|r| r["id"].as_str().unwrap_or_default())
        .collect::<BTreeSet<_>>()
        .len()
        != rules.len()
    {
        return Err(Error::invalid("Duplicate memory rule identifier"));
    }
    let query = literal(&v["query"], &mut arities)?;
    let limit_fields = [
        "maxWork",
        "maxRounds",
        "maxDerived",
        "maxBindings",
        "maxRows",
        "maxOutputBytes",
    ];
    let limits = app_object(&v["limits"], &limit_fields)?;
    for (name, max) in [
        ("maxWork", 50_000usize),
        ("maxRounds", 32),
        ("maxDerived", 128),
        ("maxBindings", 128),
        ("maxRows", 16),
        ("maxOutputBytes", 262_144),
    ] {
        integer(&limits[name], 1, max)?;
    }
    let result = json!({"contract":"algal.query.v1","rules":rules,"query":query,"limits":limits});
    if canonical(&result)?.len() > 65_536 {
        return Err(Error::limit("Memory program exceeds byte bound"));
    }
    Ok(result)
}

#[derive(Clone, Debug, PartialEq)]
pub struct MemoryFrontier {
    pub application: String,
    pub previous: Option<String>,
    pub sequence: usize,
    pub mutation: Option<String>,
    pub status: String,
}

pub fn parse_frontier(input: &Value) -> Result<MemoryFrontier> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "previous",
            "sequence",
            "mutation",
            "status",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-frontier.v1")?;
    let status = text(&v["status"], 16)?;
    if status != "settled" && status != "uncertain" {
        return Err(Error::invalid("Invalid mutation frontier status"));
    }
    let sequence = integer(&v["sequence"], 0, 4095)?;
    let previous = opt_ref(&v["previous"])?;
    let mutation = opt_ref(&v["mutation"])?;
    if (sequence == 0) != previous.is_none()
        || (sequence == 0) != mutation.is_none()
        || (sequence == 0 && status != "settled")
    {
        return Err(Error::invalid("Invalid mutation frontier lineage"));
    }
    Ok(MemoryFrontier {
        application: app_id(&v["application"])?.to_owned(),
        sequence,
        previous,
        mutation,
        status: status.to_owned(),
    })
}

#[derive(Clone, Debug, PartialEq)]
pub enum ResourceVersion {
    Store(String),
    File(String),
    Token { issuer: String, value: String },
}

impl ResourceVersion {
    pub fn value(&self) -> Value {
        match self {
            Self::Store(reference) => json!({"kind":"store","reference":reference}),
            Self::File(sha256) => json!({"kind":"file","sha256":sha256}),
            Self::Token { issuer, value } => {
                json!({"kind":"token","issuer":issuer,"value":value})
            }
        }
    }
}

pub fn parse_resource_version(input: &Value) -> Result<ResourceVersion> {
    let raw = app_json(input)?;
    if !raw.is_object() {
        return Err(Error::invalid("Expected resource version"));
    }
    match raw["kind"].as_str() {
        Some("store") => {
            let v = app_object(&raw, &["kind", "reference"])?;
            Ok(ResourceVersion::Store(app_ref(&v["reference"])?.to_owned()))
        }
        Some("file") => {
            let v = app_object(&raw, &["kind", "sha256"])?;
            Ok(ResourceVersion::File(
                check_digest(text(&v["sha256"], 71)?)?.to_owned(),
            ))
        }
        Some("token") => {
            let v = app_object(&raw, &["kind", "issuer", "value"])?;
            Ok(ResourceVersion::Token {
                issuer: app_id(&v["issuer"])?.to_owned(),
                value: bounded_text(&v["value"], 128)?,
            })
        }
        _ => Err(Error::invalid("Invalid resource version kind")),
    }
}

#[derive(Clone, Debug)]
pub struct MemoryScope {
    pub application: String,
    pub environment: String,
    pub task: String,
    pub frontier: String,
    pub bindings: Vec<(String, ResourceVersion)>,
    pub complete_for: Vec<String>,
    pub attestation: String,
    pub value: Value,
}

pub fn parse_scope(input: &Value) -> Result<MemoryScope> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "environment",
            "task",
            "frontier",
            "bindings",
            "completeFor",
            "attestation",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-scope.v1")?;
    let mut bindings = Vec::new();
    for row in list(&v["bindings"], 32)? {
        let b = app_object(row, &["key", "version"])?;
        bindings.push((
            app_id(&b["key"])?.to_owned(),
            parse_resource_version(&b["version"])?,
        ));
    }
    if bindings.windows(2).any(|w| w[0].0 >= w[1].0)
        || bindings.iter().map(|b| &b.0).collect::<BTreeSet<_>>().len() != bindings.len()
    {
        return Err(Error::invalid("Scope bindings must be sorted and unique"));
    }
    Ok(MemoryScope {
        application: app_id(&v["application"])?.to_owned(),
        environment: app_id(&v["environment"])?.to_owned(),
        task: app_id(&v["task"])?.to_owned(),
        frontier: app_ref(&v["frontier"])?.to_owned(),
        bindings,
        complete_for: app_refs(&v["completeFor"], 32)?,
        attestation: app_ref(&v["attestation"])?.to_owned(),
        value: input.clone(),
    })
}

/// Fields shared by an observation record and an admission input.
#[derive(Clone, Debug)]
pub struct ObservationInput {
    pub application: String,
    pub scope: String,
    pub procedure: String,
    pub raw: String,
    pub receipt: String,
    pub decoder: String,
}

pub fn observation_input(input: &Value) -> Result<ObservationInput> {
    let v = app_object(
        input,
        &[
            "application",
            "scope",
            "procedure",
            "raw",
            "receipt",
            "decoder",
        ],
    )?;
    Ok(ObservationInput {
        application: app_id(&v["application"])?.to_owned(),
        scope: app_ref(&v["scope"])?.to_owned(),
        procedure: app_ref(&v["procedure"])?.to_owned(),
        raw: app_ref(&v["raw"])?.to_owned(),
        receipt: app_ref(&v["receipt"])?.to_owned(),
        decoder: app_ref(&v["decoder"])?.to_owned(),
    })
}

#[derive(Clone, Debug)]
pub struct Observation {
    pub input: ObservationInput,
    pub admission: String,
    pub claims: Vec<Claim>,
    pub value: Value,
}

pub fn parse_observation(input: &Value) -> Result<Observation> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "scope",
            "procedure",
            "raw",
            "receipt",
            "decoder",
            "admission",
            "claims",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-observation.v1")?;
    let mut claims = Vec::new();
    for row in list(&v["claims"], 32)? {
        claims.push(parse_claim(row)?);
    }
    let mut base = v.clone();
    base.remove("contract");
    base.remove("admission");
    base.remove("claims");
    Ok(Observation {
        input: observation_input(&Value::Object(base))?,
        admission: app_ref(&v["admission"])?.to_owned(),
        claims,
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct Hypothesis {
    pub application: String,
    pub scope: String,
    pub claim: Claim,
    pub proposed_by: String,
    pub evidence: Vec<String>,
}

pub fn parse_hypothesis(input: &Value) -> Result<Hypothesis> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "scope",
            "claim",
            "proposedBy",
            "evidence",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-hypothesis.v1")?;
    Ok(Hypothesis {
        application: app_id(&v["application"])?.to_owned(),
        scope: app_ref(&v["scope"])?.to_owned(),
        claim: parse_claim(&v["claim"])?,
        proposed_by: app_ref(&v["proposedBy"])?.to_owned(),
        evidence: app_refs(&v["evidence"], 16)?,
    })
}

#[derive(Clone, Debug)]
pub struct Snapshot {
    pub application: String,
    pub schema: String,
    pub previous: Option<String>,
    pub scope: String,
    pub observations: Vec<String>,
    pub hypotheses: Vec<String>,
    pub withdrawn: Vec<String>,
    pub archive: Option<String>,
    pub value: Value,
}

pub fn parse_snapshot(input: &Value) -> Result<Snapshot> {
    let v = app_object_opt(
        input,
        &[
            "contract",
            "application",
            "schema",
            "previous",
            "scope",
            "observations",
            "hypotheses",
            "withdrawn",
        ],
        &["archive"],
    )?;
    app_tag(&v["contract"], "algal.application-memory.v1")?;
    let observations = app_refs(&v["observations"], 128)?;
    let withdrawn = app_refs(&v["withdrawn"], 128)?;
    if withdrawn.iter().any(|r| !observations.contains(r)) {
        return Err(Error::invalid(
            "Withdrawal must name an admitted observation",
        ));
    }
    Ok(Snapshot {
        application: app_id(&v["application"])?.to_owned(),
        schema: app_ref(&v["schema"])?.to_owned(),
        previous: opt_ref(&v["previous"])?,
        scope: app_ref(&v["scope"])?.to_owned(),
        observations,
        hypotheses: app_refs(&v["hypotheses"], 64)?,
        withdrawn,
        archive: v
            .get("archive")
            .map(|value| app_ref(value).map(str::to_owned))
            .transpose()?,
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct Archive {
    pub application: String,
    pub schema: String,
    pub sequence: usize,
    pub previous: Option<String>,
    pub snapshot: String,
    pub value: Value,
}

pub fn parse_archive(input: &Value) -> Result<Archive> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "schema",
            "sequence",
            "previous",
            "snapshot",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-archive.v1")?;
    let sequence = integer(&v["sequence"], 0, ARCHIVE_LIMIT - 1)?;
    let previous = opt_ref(&v["previous"])?;
    if (sequence == 0) != previous.is_none() {
        return Err(Error::invalid("Invalid memory archive predecessor"));
    }
    Ok(Archive {
        application: app_id(&v["application"])?.to_owned(),
        schema: app_ref(&v["schema"])?.to_owned(),
        sequence,
        previous,
        snapshot: app_ref(&v["snapshot"])?.to_owned(),
        value: input.clone(),
    })
}

#[derive(Clone, Debug)]
pub struct ArchiveEntry {
    pub reference: String,
    pub archive: Archive,
    pub snapshot: Snapshot,
}

pub const STATUSES: [&str; 8] = [
    "supported",
    "opposed",
    "conflicted",
    "unknown",
    "stale",
    "exhausted",
    "failed",
    "cancelled",
];

#[derive(Clone, Debug)]
pub struct Derivation {
    pub application: String,
    pub captured_state: String,
    pub memory: String,
    pub query: String,
    pub frontier: String,
    pub engine: String,
    pub admission: String,
    pub status: String,
    pub verified: bool,
    pub result: Option<String>,
    pub snapshot: Option<String>,
    pub program: String,
    pub source_refs: Vec<String>,
    pub work: Option<usize>,
    pub reason: Option<String>,
    pub value: Value,
}

pub fn parse_derivation(input: &Value) -> Result<Derivation> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "capturedState",
            "memory",
            "query",
            "frontier",
            "engine",
            "admission",
            "status",
            "conditional",
            "verified",
            "result",
            "snapshot",
            "program",
            "sourceRefs",
            "work",
            "reason",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-memory-derivation.v1")?;
    let status = text(&v["status"], 16)?;
    if !STATUSES.contains(&status) {
        return Err(Error::invalid("Invalid memory derivation status"));
    }
    if v["conditional"] != json!(true) || !v["verified"].is_boolean() {
        return Err(Error::invalid("Invalid memory derivation evidence flags"));
    }
    let result = opt_ref(&v["result"])?;
    let snapshot = opt_ref(&v["snapshot"])?;
    let work = if v["work"].is_null() {
        None
    } else {
        Some(integer(&v["work"], 0, 50_000)?)
    };
    let reason = if v["reason"].is_null() {
        None
    } else {
        Some(bounded_text(&v["reason"], 256)?)
    };
    let verified = v["verified"].as_bool().unwrap_or(false);
    if ["supported", "opposed", "conflicted"].contains(&status)
        && (result.is_none() || snapshot.is_none() || !verified)
    {
        return Err(Error::invalid(
            "A resolved derivation requires a verified result and fact snapshot",
        ));
    }
    Ok(Derivation {
        application: app_id(&v["application"])?.to_owned(),
        captured_state: app_ref(&v["capturedState"])?.to_owned(),
        memory: app_ref(&v["memory"])?.to_owned(),
        query: app_ref(&v["query"])?.to_owned(),
        frontier: app_ref(&v["frontier"])?.to_owned(),
        engine: app_ref(&v["engine"])?.to_owned(),
        admission: app_ref(&v["admission"])?.to_owned(),
        status: status.to_owned(),
        verified,
        result,
        snapshot,
        program: app_ref(&v["program"])?.to_owned(),
        source_refs: app_refs(&v["sourceRefs"], 128)?,
        work,
        reason,
        value: input.clone(),
    })
}

/// Engine output parity with `NativeMemoryQueryEngine`: the subprocess
/// transport maps a nonzero exit to `exhausted` only when the emitted error
/// code is `BUDGET_EXHAUSTED`; the in-process engine maps the same codes and
/// reports `work` like the transport (`null` — the native engine does not
/// surface partial work on failure).
pub enum EngineResult {
    Complete(Value),
    Incomplete {
        status: String,
        reason: String,
        work: Option<usize>,
    },
}

pub trait MemoryEngine {
    fn identity(&self) -> &str;
    fn query(&self, snapshot: &Value, program: &Value) -> EngineResult;
    fn verify(&self, snapshot: &Value, program: &Value, result: &Value) -> bool;
}

/// `algal.application-native-memory.v1` identity — identical digest to the
/// TypeScript subprocess transport when the same executable pin and timeout
/// are supplied, since protocol and limits canonicalize identically.
/// `timeout_ms` is bounded `1..=10_000` (the TS transport's own bound; its
/// default is the maximum).
pub fn engine_identity(executable_sha256: &str, timeout_ms: usize) -> Result<String> {
    // The TypeScript pin is the bare 64-hex digest, not the `sha256:` form.
    if executable_sha256.len() != 64
        || !executable_sha256
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
    {
        return Err(Error::invalid("expected a bare 64-hex executable digest"));
    }
    if !(1..=10_000).contains(&timeout_ms) {
        return Err(Error::invalid("Invalid application integer"));
    }
    digest(&json!({
        "contract": "algal.application-native-memory.v1",
        "executableSha256": executable_sha256,
        "protocol": "algal.query.v1",
        "timeoutMs": timeout_ms,
        "limits": {"maxWork":50_000,"maxRounds":32,"maxDerived":128,"maxBindings":128,"maxRows":16,"maxOutputBytes":262_144},
    }))
}

/// In-process native engine used by the native CLI; the TypeScript runtime's
/// `NativeMemoryQueryEngine` drives this same evaluator as a subprocess, so
/// both sides derive identical rows and proofs.
#[derive(Clone)]
pub struct NativeEngine {
    identity: String,
}

impl NativeEngine {
    /// `executable_sha256` is the running binary's bare 64-hex digest — the
    /// same pin the TypeScript transport enforces, so derivations carry
    /// identical `engine` identities across runtimes.
    pub fn new(executable_sha256: &str, timeout_ms: usize) -> Result<Self> {
        Ok(Self {
            identity: engine_identity(executable_sha256, timeout_ms)?,
        })
    }
}

impl MemoryEngine for NativeEngine {
    fn identity(&self) -> &str {
        &self.identity
    }
    fn query(&self, snapshot: &Value, program: &Value) -> EngineResult {
        match memory::query(snapshot, program) {
            Ok(result) => EngineResult::Complete(result),
            Err(error) => EngineResult::Incomplete {
                status: if error.code == "BUDGET_EXHAUSTED" {
                    "exhausted"
                } else {
                    "failed"
                }
                .to_owned(),
                reason: if error.code == "BUDGET_EXHAUSTED" {
                    "native-budget-exhausted"
                } else {
                    "native-query-failed"
                }
                .to_owned(),
                work: None,
            },
        }
    }
    fn verify(&self, snapshot: &Value, program: &Value, result: &Value) -> bool {
        memory::verify(snapshot, program, result).unwrap_or(false)
    }
}

/// Trusted host boundary — identical authority to the TypeScript
/// `MemoryAdmissionHost`: claims are validated structurally and against the
/// schema, but their truth is the host's attestation.
pub trait MemoryAdmission {
    fn identity(&self) -> &str;
    fn current_frontier(&self, application: &str) -> Result<String>;
    fn validate_scope(
        &self,
        scope: &MemoryScope,
        frontier: &MemoryFrontier,
        attestation: &Value,
    ) -> Result<()>;
    fn decode_observation(&self, input: &ObservationAdmission) -> Result<Vec<Claim>>;
}

pub struct ObservationAdmission {
    pub observation: ObservationInput,
    pub scope: MemoryScope,
    pub frontier: MemoryFrontier,
    pub procedure: MemoryProcedure,
    pub raw: Value,
    pub receipt: Value,
}

struct Admitted {
    observation: Observation,
    scope: MemoryScope,
    procedure: MemoryProcedure,
}

/// A snapshot that passed structural and admission validation.
struct ValidatedSnapshot {
    memory: Snapshot,
    scope: MemoryScope,
    observations: Vec<(String, Admitted)>,
}

/// Stateless memory service; the shared `Store` is threaded per call.
pub struct MemoryService<'a> {
    pub engine: &'a dyn MemoryEngine,
    pub admission: &'a dyn MemoryAdmission,
}

fn same(a: &Value, b: &Value) -> Result<bool> {
    Ok(canonical(&app_json(a)?)? == canonical(&app_json(b)?)?)
}

impl MemoryService<'_> {
    pub fn validate_scope(&self, store: &Store, input: &Value) -> Result<MemoryScope> {
        let scope = parse_scope(input)?;
        let frontier = parse_frontier(&get_record(store, &scope.frontier)?)?;
        if frontier.application != scope.application {
            return Err(Error::invalid("Cross-application scope frontier"));
        }
        if let Some(previous) = &frontier.previous {
            let prior = parse_frontier(&get_record(store, previous)?)?;
            if prior.application != frontier.application || prior.sequence + 1 != frontier.sequence
            {
                return Err(Error::invalid("Invalid frontier predecessor"));
            }
            get_record(
                store,
                frontier.mutation.as_deref().expect("frontier lineage"),
            )?;
        }
        for (_, version) in &scope.bindings {
            if let ResourceVersion::Store(reference) = version {
                get_record(store, reference)?;
            }
        }
        for reference in &scope.complete_for {
            let procedure = parse_procedure(&get_record(store, reference)?)?;
            if procedure
                .dependencies
                .iter()
                .any(|key| !scope.bindings.iter().any(|b| &b.0 == key))
            {
                return Err(Error::invalid(
                    "Complete scope omits a procedure dependency",
                ));
            }
        }
        let attestation = get_record(store, &scope.attestation)?;
        self.admission
            .validate_scope(&scope, &frontier, &attestation)?;
        Ok(scope)
    }

    pub fn put_scope(&self, store: &mut Store, input: &Value) -> Result<String> {
        let scope = self.validate_scope(store, input)?;
        put_record(store, &scope.value)
    }

    fn check_claim(schema: &MemorySchema, claim: &Claim) -> Result<()> {
        if !schema
            .relations
            .iter()
            .any(|(name, arity)| name == &claim.relation && *arity == claim.tuple.len())
        {
            return Err(Error::invalid("Claim does not match memory schema"));
        }
        Ok(())
    }

    fn decode(
        &self,
        store: &Store,
        input: &ObservationInput,
    ) -> Result<(Vec<Claim>, MemoryScope, MemoryProcedure)> {
        let scope = self.validate_scope(store, &get_record(store, &input.scope)?)?;
        let procedure = parse_procedure(&get_record(store, &input.procedure)?)?;
        if scope.application != input.application || input.decoder != procedure.decoder {
            return Err(Error::invalid(
                "Observation scope or decoder binding mismatch",
            ));
        }
        let schema = parse_schema(&get_record(store, &procedure.schema)?)?;
        let frontier = parse_frontier(&get_record(store, &scope.frontier)?)?;
        if frontier.status != "settled" {
            return Err(Error::invalid(
                "Uncertain mutation cannot admit an observation",
            ));
        }
        let raw = get_record(store, &input.raw)?;
        let receipt = get_record(store, &input.receipt)?;
        get_record(store, &input.decoder)?;
        let claims = self.admission.decode_observation(&ObservationAdmission {
            observation: input.clone(),
            scope: scope.clone(),
            frontier,
            procedure: procedure.clone(),
            raw,
            receipt,
        })?;
        if claims.len() > 32 {
            return Err(Error::limit("Application list bound exceeded"));
        }
        for claim in &claims {
            Self::check_claim(&schema, claim)?;
        }
        Ok((claims, scope, procedure))
    }

    /// Validate + persist an `algal.application-memory-observation.v1`.
    pub fn observe(&self, store: &mut Store, input: &Value) -> Result<String> {
        let checked = observation_input(input)?;
        let (claims, _, _) = self.decode(store, &checked)?;
        put_record(
            store,
            &json!({
                "contract": "algal.application-memory-observation.v1",
                "application": checked.application, "scope": checked.scope,
                "procedure": checked.procedure, "raw": checked.raw,
                "receipt": checked.receipt, "decoder": checked.decoder,
                "admission": self.admission.identity(),
                "claims": claims.iter().map(claim_value).collect::<Vec<_>>(),
            }),
        )
    }

    fn admit(&self, store: &Store, reference: &str) -> Result<Admitted> {
        let observation = parse_observation(&get_record(store, reference)?)?;
        if observation.admission != self.admission.identity() {
            return Err(Error::invalid("Unadmitted observation authority"));
        }
        let (claims, scope, procedure) = self.decode(store, &observation.input)?;
        if claims.len() != observation.claims.len() {
            return Err(Error::invalid(
                "Stored claim differs from trusted source decoding",
            ));
        }
        for (a, b) in claims.iter().zip(&observation.claims) {
            if !same(&claim_value(a), &claim_value(b))? {
                return Err(Error::invalid(
                    "Stored claim differs from trusted source decoding",
                ));
            }
        }
        Ok(Admitted {
            observation,
            scope,
            procedure,
        })
    }

    fn archives(&self, store: &Store, memory: &Snapshot) -> Result<Vec<ArchiveEntry>> {
        let mut entries = Vec::new();
        let mut seen = BTreeSet::new();
        let mut reference = memory.archive.clone();
        let mut expected = None;
        while let Some(current) = reference {
            if entries.len() >= ARCHIVE_LIMIT || !seen.insert(current.clone()) {
                return Err(Error::invalid("Memory archive bound/cycle"));
            }
            let archive = parse_archive(&get_record(store, &current)?)?;
            let snapshot = parse_snapshot(&get_record(store, &archive.snapshot)?)?;
            if archive.application != memory.application
                || archive.schema != memory.schema
                || snapshot.application != memory.application
                || snapshot.schema != memory.schema
            {
                return Err(Error::invalid("Memory archive application/schema mismatch"));
            }
            if expected.is_some_and(|sequence| archive.sequence != sequence)
                || snapshot.archive != archive.previous
            {
                return Err(Error::invalid("Memory archive lineage mismatch"));
            }
            expected = archive.sequence.checked_sub(1);
            reference = archive.previous.clone();
            entries.push(ArchiveEntry {
                reference: current,
                archive,
                snapshot,
            });
        }
        Ok(entries)
    }

    /// Retained cutovers, newest first. Historical selection is not active truth.
    pub fn archive_history(&self, store: &Store, memory_ref: &str) -> Result<Vec<ArchiveEntry>> {
        self.archives(store, &parse_snapshot(&get_record(store, memory_ref)?)?)
    }

    fn validate_snapshot(&self, store: &Store, input: &Value) -> Result<ValidatedSnapshot> {
        let memory = parse_snapshot(input)?;
        let schema = parse_schema(&get_record(store, &memory.schema)?)?;
        let scope = self.validate_scope(store, &get_record(store, &memory.scope)?)?;
        if scope.application != memory.application {
            return Err(Error::invalid("Cross-application memory scope"));
        }
        let archives = self.archives(store, &memory)?;
        if memory.previous.is_none() && memory.archive.is_some() {
            return Err(Error::invalid("Memory archive requires a predecessor"));
        }
        if let Some(previous) = &memory.previous {
            let prior = parse_snapshot(&get_record(store, previous)?)?;
            if prior.application != memory.application || prior.schema != memory.schema {
                return Err(Error::invalid(
                    "Memory predecessor application/schema mismatch; migration required",
                ));
            }
            if memory.archive != prior.archive {
                let cutover = archives
                    .first()
                    .map(|entry| &entry.archive)
                    .ok_or_else(|| {
                        Error::invalid("Memory rollover must archive its exact predecessor")
                    })?;
                if cutover.snapshot != *previous || cutover.previous != prior.archive {
                    return Err(Error::invalid(
                        "Memory rollover must archive its exact predecessor",
                    ));
                }
                if memory.scope != prior.scope
                    || memory
                        .observations
                        .iter()
                        .any(|reference| !prior.observations.contains(reference))
                    || memory
                        .hypotheses
                        .iter()
                        .any(|reference| !prior.hypotheses.contains(reference))
                {
                    return Err(Error::invalid(
                        "Memory rollover may only retain the previous selection and scope",
                    ));
                }
                let withdrawals: Vec<_> = prior
                    .withdrawn
                    .iter()
                    .filter(|reference| memory.observations.contains(reference))
                    .cloned()
                    .collect();
                if memory.withdrawn != withdrawals {
                    return Err(Error::invalid(
                        "Memory rollover must retain selected withdrawals",
                    ));
                }
                if memory.observations.len() == prior.observations.len()
                    && memory.hypotheses.len() == prior.hypotheses.len()
                {
                    return Err(Error::invalid(
                        "Memory rollover must retire an observation or hypothesis",
                    ));
                }
            } else {
                if prior
                    .withdrawn
                    .iter()
                    .any(|r| !memory.withdrawn.contains(r))
                    || prior
                        .observations
                        .iter()
                        .any(|r| !memory.observations.contains(r))
                {
                    return Err(Error::invalid(
                        "Memory history or withdrawals cannot silently disappear",
                    ));
                }
                let archived: BTreeSet<_> = archives
                    .iter()
                    .flat_map(|entry| &entry.snapshot.observations)
                    .collect();
                if memory.observations.iter().any(|reference| {
                    !prior.observations.contains(reference) && archived.contains(reference)
                }) {
                    return Err(Error::invalid("Retired observations cannot be resurrected"));
                }
            }
        }
        let mut observations = Vec::new();
        for reference in &memory.observations {
            let row = self.admit(store, reference)?;
            if row.observation.input.application != memory.application
                || row.procedure.schema != memory.schema
            {
                return Err(Error::invalid(
                    "Cross-application or incompatible observation",
                ));
            }
            observations.push((reference.clone(), row));
        }
        for reference in &memory.hypotheses {
            let h = parse_hypothesis(&get_record(store, reference)?)?;
            if h.application != memory.application {
                return Err(Error::invalid("Cross-application hypothesis"));
            }
            let hs = self.validate_scope(store, &get_record(store, &h.scope)?)?;
            if hs.application != memory.application {
                return Err(Error::invalid("Cross-application hypothesis scope"));
            }
            Self::check_claim(&schema, &h.claim)?;
            get_record(store, &h.proposed_by)?;
            for evidence in &h.evidence {
                get_record(store, evidence)?;
            }
        }
        Ok(ValidatedSnapshot {
            memory,
            scope,
            observations,
        })
    }

    /// Admit a snapshot record; `input` supplies the contract-free fields.
    pub fn snapshot(&self, store: &mut Store, input: &Value) -> Result<String> {
        let mut record = app_object_opt(
            input,
            &[
                "application",
                "schema",
                "previous",
                "scope",
                "observations",
                "hypotheses",
                "withdrawn",
            ],
            &["archive"],
        )?
        .clone();
        record.insert("contract".to_owned(), json!("algal.application-memory.v1"));
        let checked = parse_snapshot(&Value::Object(record))?;
        self.validate_snapshot(store, &checked.value)?;
        put_record(store, &checked.value)
    }

    /// Archive an active selection without changing any application head or custody.
    pub fn rollover(&self, store: &mut Store, input: &Value) -> Result<Value> {
        let v = app_object(input, &["memory", "retainObservations", "retainHypotheses"])?;
        let previous = app_ref(&v["memory"])?.to_owned();
        let observations = app_refs(&v["retainObservations"], 128)?;
        let hypotheses = app_refs(&v["retainHypotheses"], 64)?;
        let memory = self
            .validate_snapshot(store, &get_record(store, &previous)?)?
            .memory;
        let sequence = match &memory.archive {
            Some(reference) => parse_archive(&get_record(store, reference)?)?.sequence + 1,
            None => 0,
        };
        let archive = parse_archive(
            &json!({ "contract": "algal.application-memory-archive.v1", "application": memory.application,
            "schema": memory.schema, "sequence": sequence, "previous": memory.archive, "snapshot": previous }),
        )?;
        let archive_ref = put_record(store, &archive.value)?;
        let withdrawn: Vec<_> = memory
            .withdrawn
            .iter()
            .filter(|reference| observations.contains(reference))
            .collect();
        let next = self.snapshot(store, &json!({ "application": memory.application, "schema": memory.schema, "previous": previous,
            "scope": memory.scope, "observations": observations, "hypotheses": hypotheses, "withdrawn": withdrawn, "archive": archive_ref }))?;
        Ok(json!({"memory": next, "archive": archive_ref}))
    }

    /// Root-owned lifecycle check: snapshot validity + revision compatibility
    /// (`revision` is a parsed `algal.application-revision.v1`).
    pub fn validate_for_revision(
        &self,
        store: &Store,
        memory_ref: &str,
        revision: &crate::application::Revision,
    ) -> Result<Snapshot> {
        let memory = self
            .validate_snapshot(store, &get_record(store, memory_ref)?)?
            .memory;
        if memory.application != revision.application || memory.schema != revision.schema {
            return Err(Error::invalid(
                "Memory incompatible with application revision schema",
            ));
        }
        let queries = parse_queries(&get_record(store, &revision.queries)?)?;
        for entry in &revision.entrypoints {
            if entry.queries.iter().any(|q| !queries.queries.contains(q)) {
                return Err(Error::invalid(
                    "Entrypoint memory view exceeds the revision's queries",
                ));
            }
        }
        for reference in &queries.queries {
            let query = parse_query(&get_record(store, reference)?)?;
            if query.schema != revision.schema {
                return Err(Error::invalid("Query schema incompatible with revision"));
            }
            parse_native_program(&get_record(store, &query.program)?)?;
            for procedure in &query.procedures {
                let p = parse_procedure(&get_record(store, procedure)?)?;
                if p.schema != revision.schema {
                    return Err(Error::invalid(
                        "Procedure schema incompatible with revision",
                    ));
                }
            }
        }
        if revision
            .entrypoints
            .iter()
            .any(|e| !queries.queries.contains(&e.applicability))
        {
            return Err(Error::invalid(
                "Entrypoint applicability query missing from revision",
            ));
        }
        Ok(memory)
    }

    /// Run the applicability/query derivation for one captured state.
    /// `state_ref` names an `algal.application-state.v1` record.
    pub fn query(
        &self,
        store: &mut Store,
        state_ref: &str,
        query_ref: &str,
    ) -> Result<(String, Derivation)> {
        let state_ref = check_digest(state_ref)?.to_owned();
        let query_ref = check_digest(query_ref)?.to_owned();
        let state = crate::application::parse_state(&get_record(store, &state_ref)?)?;
        let revision = crate::application::parse_revision(&get_record(store, &state.revision)?)?;
        self.validate_for_revision(store, &state.memory, &revision)?;
        if state.application != revision.application {
            return Err(Error::invalid("State/revision application mismatch"));
        }
        let bundle = parse_queries(&get_record(store, &revision.queries)?)?;
        if !bundle.queries.contains(&query_ref) {
            return Err(Error::invalid("Query not selected by captured revision"));
        }
        let query = parse_query(&get_record(store, &query_ref)?)?;
        let ValidatedSnapshot {
            memory,
            scope,
            observations,
        } = self.validate_snapshot(store, &get_record(store, &state.memory)?)?;
        let frontier_ref =
            check_digest(&self.admission.current_frontier(&memory.application)?)?.to_owned();
        let frontier = parse_frontier(&get_record(store, &frontier_ref)?)?;
        if frontier.application != memory.application {
            return Err(Error::invalid("Host supplied cross-application frontier"));
        }
        let program = parse_native_program(&get_record(store, &query.program)?)?;
        let mut sources = Vec::new();
        let mut facts = Vec::new();
        let mut stale = false;
        let usable_scope = scope.frontier == frontier_ref && frontier.status == "settled";
        for (reference, row) in &observations {
            if memory.withdrawn.contains(reference)
                || !query.procedures.contains(&row.observation.input.procedure)
            {
                continue;
            }
            let applicable = usable_scope
                && row.scope.frontier == frontier_ref
                && row.scope.environment == scope.environment
                && scope
                    .complete_for
                    .contains(&row.observation.input.procedure)
                && row
                    .scope
                    .complete_for
                    .contains(&row.observation.input.procedure)
                && row.procedure.dependencies.iter().all(|key| {
                    match (
                        row.scope.bindings.iter().find(|b| &b.0 == key),
                        scope.bindings.iter().find(|b| &b.0 == key),
                    ) {
                        (Some(a), Some(b)) => {
                            canonical(&a.1.value()).ok() == canonical(&b.1.value()).ok()
                        }
                        _ => false,
                    }
                });
            if !applicable {
                stale = true;
                continue;
            }
            sources.push(reference.clone());
            for claim in &row.observation.claims {
                let mut tuple = claim.tuple.clone();
                tuple.push(json!(claim.polarity));
                facts.push(json!({
                    "relation": claim.relation, "tuple": tuple,
                    "sources": [reference, &memory.scope, &row.observation.input.procedure],
                }));
            }
        }
        sources.sort();
        let mut derivation = json!({
            "contract": "algal.application-memory-derivation.v1",
            "application": state.application, "capturedState": state_ref,
            "memory": state.memory, "query": query_ref, "frontier": frontier_ref,
            "engine": self.engine.identity(), "admission": self.admission.identity(),
            "status": "failed", "conditional": true, "verified": false,
            "result": null, "snapshot": null, "program": query.program,
            "sourceRefs": sources, "work": null, "reason": null,
        });
        macro_rules! save {
            ($store:expr, $d:expr) => {{
                let parsed = parse_derivation(&$d)?;
                let reference = put_record($store, &parsed.value)?;
                return Ok((reference, parsed));
            }};
        }
        if facts.len() > 128 {
            derivation["status"] = json!("exhausted");
            derivation["reason"] = json!("fact-limit");
            save!(store, derivation);
        }
        let snapshot = json!({"contract":"algal.memory.v1","facts":facts});
        derivation["snapshot"] = json!(put_record(store, &snapshot)?);
        match self.engine.query(&snapshot, &program) {
            EngineResult::Incomplete {
                status,
                reason,
                work,
            } => {
                derivation["status"] = json!(status);
                derivation["reason"] = json!(bounded_text(&json!(reason), 256)?);
                derivation["work"] = json!(work);
                save!(store, derivation);
            }
            EngineResult::Complete(output) => {
                macro_rules! fail {
                    () => {{
                        derivation["status"] = json!("failed");
                        derivation["reason"] = json!("query-or-verification-failed");
                        save!(store, derivation);
                    }};
                }
                let result = match app_object(
                    &output,
                    &[
                        "contract",
                        "snapshot",
                        "program",
                        "complete",
                        "witnessPolicy",
                        "rows",
                        "proofs",
                        "work",
                        "rounds",
                        "baseFacts",
                        "derivedFacts",
                    ],
                ) {
                    Ok(r) => r,
                    Err(_) => fail!(),
                };
                if result["contract"] != json!("algal.query-result.v1")
                    || result["complete"] != json!(true)
                    || result["snapshot"] != derivation["snapshot"]
                    || result["program"] != json!(query.program)
                    || result["witnessPolicy"] != json!("first-canonical-derivation")
                {
                    fail!();
                }
                let mut rows = Vec::new();
                for row in match list(&result["rows"], 16) {
                    Ok(rows) => rows,
                    Err(_) => fail!(),
                } {
                    let r = match app_object(row, &["tuple", "proof"]) {
                        Ok(r) => r,
                        Err(_) => fail!(),
                    };
                    if app_ref(&r["proof"]).is_err() {
                        fail!();
                    }
                    let tuple = match list(&r["tuple"], 8) {
                        Ok(t) => t.clone(),
                        Err(_) => fail!(),
                    };
                    if tuple.iter().any(|a| atom(a).is_err()) {
                        fail!();
                    }
                    rows.push(tuple);
                }
                derivation["work"] = match integer(&result["work"], 0, 50_000) {
                    Ok(w) => json!(w),
                    Err(_) => fail!(),
                };
                if !self.engine.verify(&snapshot, &program, &output) {
                    fail!();
                }
                let mut supports: Vec<Vec<Value>> = Vec::new();
                let mut opposes: Vec<Vec<Value>> = Vec::new();
                let mut failed = false;
                for row in rows {
                    let polarity = row[query.polarity_column].clone();
                    if polarity != json!("supported") && polarity != json!("opposed") {
                        failed = true;
                        break;
                    }
                    let mut stripped = row.clone();
                    stripped.remove(query.polarity_column);
                    if polarity == json!("supported") {
                        supports.push(stripped);
                    } else {
                        opposes.push(stripped);
                    }
                }
                if failed {
                    fail!();
                }
                let unique_supports: BTreeSet<String> = supports
                    .iter()
                    .filter_map(|r| canonical(&json!(r)).ok())
                    .collect();
                derivation["status"] = json!(if (!supports.is_empty() && !opposes.is_empty())
                    || (query.conflict == "single-value" && unique_supports.len() > 1)
                {
                    "conflicted"
                } else if !supports.is_empty() {
                    "supported"
                } else if !opposes.is_empty() {
                    "opposed"
                } else if stale || !usable_scope {
                    "stale"
                } else {
                    "unknown"
                });
                derivation["result"] = json!(put_record(store, &output)?);
                derivation["verified"] = json!(true);
                save!(store, derivation);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canonical::digest;
    use serde_json::json;
    use tempfile::tempdir;

    struct Host {
        frontier: String,
        identity: String,
    }
    impl MemoryAdmission for Host {
        fn identity(&self) -> &str {
            &self.identity
        }
        fn current_frontier(&self, _: &str) -> Result<String> {
            Ok(self.frontier.clone())
        }
        fn validate_scope(&self, _: &MemoryScope, _: &MemoryFrontier, _: &Value) -> Result<()> {
            Ok(())
        }
        fn decode_observation(&self, input: &ObservationAdmission) -> Result<Vec<Claim>> {
            let raw = app_object(&input.raw, &["contract", "claims"])?;
            app_tag(&raw["contract"], "algal.test-raw.v1")?;
            list(&raw["claims"], 32)?.iter().map(parse_claim).collect()
        }
    }

    struct Fixture {
        schema: String,
        procedure: String,
        scope: String,
        decoder: String,
        query: String,
    }

    fn put(store: &mut Store, v: Value) -> String {
        store.put("values", &app_json(&v).unwrap()).unwrap()
    }

    fn seed(store: &mut Store) -> (Fixture, String) {
        let schema = put(
            store,
            json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"available","arity":1}]}),
        );
        let program = put(
            store,
            json!({"contract":"algal.query.v1","rules":[],"query":{"relation":"available","terms":[{"var":"x"},{"var":"polarity"}]},"limits":{"maxWork":50000,"maxRounds":32,"maxDerived":128,"maxBindings":128,"maxRows":16,"maxOutputBytes":262144}}),
        );
        let decoder = put(store, json!({"contract":"algal.test-decoder.v1"}));
        let manifest = put(store, json!({"contract":"algal.test-manifest.v1"}));
        let procedure = put(
            store,
            json!({"contract":"algal.application-memory-procedure.v1","id":"probe","schema":schema,"manifest":manifest,"decoder":decoder,"dependencies":[],"prerequisite":null}),
        );
        let frontier = put(
            store,
            json!({"contract":"algal.application-memory-frontier.v1","application":"parity","previous":null,"sequence":0,"mutation":null,"status":"settled"}),
        );
        let attestation = put(store, json!({"contract":"algal.test-attestation.v1"}));
        let scope = put(
            store,
            json!({"contract":"algal.application-memory-scope.v1","application":"parity","environment":"fixture","task":"task-1","frontier":frontier,"bindings":[],"completeFor":[procedure],"attestation":attestation}),
        );
        let query = put(
            store,
            json!({"contract":"algal.application-memory-query.v1","id":"available","schema":schema,"program":program,"procedures":[procedure],"polarityColumn":1,"conflict":"single-value"}),
        );
        (
            Fixture {
                schema,
                procedure,
                scope,
                decoder,
                query,
            },
            frontier,
        )
    }

    fn revision_and_state(store: &mut Store, fixture: &Fixture, memory: &str) -> String {
        let queries = put(
            store,
            json!({"contract":"algal.application-memory-queries.v1","queries":[fixture.query]}),
        );
        let revision = put(
            store,
            json!({"contract":"algal.application-revision.v1","application":"parity","parent":null,"schema":fixture.schema,"queries":queries,"views":digest(&json!("v")).unwrap(),"runtimeProfile":digest(&json!("r")).unwrap(),"evaluationPolicy":digest(&json!("e")).unwrap(),"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":digest(&json!("m")).unwrap(),"applicability":fixture.query,"maxGenerations":1,"capabilities":[],"queries":[fixture.query]}]}),
        );
        let transition = put(
            store,
            json!({"contract":"algal.application-transition.v1","application":"parity","operation":digest(&json!("op")).unwrap(),"request":digest(&json!("req")).unwrap(),"kind":"create","previous":null,"revision":revision,"memory":memory,"intents":[],"evidence":[],"causedBy":null}),
        );
        put(
            store,
            json!({"contract":"algal.application-state.v1","application":"parity","sequence":0,"epoch":0,"revision":revision,"memory":memory,"previous":null,"transition":transition}),
        )
    }

    fn observed(
        store: &mut Store,
        service: &MemoryService,
        fixture: &Fixture,
        tool: &str,
    ) -> String {
        let raw = put(
            store,
            json!({"contract":"algal.test-raw.v1","claims":[{"relation":"available","tuple":[tool],"polarity":"supported"}]}),
        );
        let receipt = put(store, json!({"contract":"algal.test-receipt.v1","raw":raw}));
        service
            .observe(
                store,
                &json!({"application":"parity","scope":fixture.scope,"procedure":fixture.procedure,"raw":raw,"receipt":receipt,"decoder":fixture.decoder}),
            )
            .unwrap()
    }

    #[test]
    fn policy_frontier_advances_without_revoking_retained_observations() {
        use crate::application::Dispatcher;
        use crate::application_host::PolicyHost;
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let (mut fixture, frontier) = seed(&mut store);
        let engine = NativeEngine::new(&"0".repeat(64), 10_000).unwrap();
        let policy = json!({"contract":"algal.application-host.v1","application":"parity","frontier":frontier,
            "hostProfile":digest(&json!("profile")).unwrap(),"episodeAccess":"observe","routes":[],"attestation":"algal.test-attestation.v1",
            "decoders":[{"decoder":fixture.decoder,"rawContract":"algal.test-raw.v1","receiptContract":"algal.test-receipt.v1","receiptBinding":"names-raw"}]});
        let host = PolicyHost::new(&policy, tmp.path()).unwrap();
        let service = MemoryService {
            engine: &engine,
            admission: &host,
        };
        let old_observation = observed(&mut store, &service, &fixture, "tool-a");
        let memory = service
            .snapshot(
                &mut store,
                &json!({"application":"parity","schema":fixture.schema,"previous":null,
            "scope":fixture.scope,"observations":[old_observation],"hypotheses":[],"withdrawn":[]}),
            )
            .unwrap();
        let state = revision_and_state(&mut store, &fixture, &memory);
        assert_eq!(
            service
                .query(&mut store, &state, &fixture.query)
                .unwrap()
                .1
                .status,
            "supported"
        );
        let mutation = put(&mut store, json!({"contract":"algal.test-mutation.v1"}));
        let next_frontier = put(
            &mut store,
            json!({"contract":"algal.application-memory-frontier.v1","application":"parity",
            "previous":frontier,"sequence":1,"mutation":mutation,"status":"settled"}),
        );
        let mut next_policy = policy.clone();
        next_policy["frontier"] = json!(next_frontier);
        let next_host = PolicyHost::new(&next_policy, tmp.path()).unwrap();
        assert_eq!(host.identity(), next_host.identity());
        assert_ne!(
            host.configuration_digest(),
            next_host.configuration_digest()
        );
        let next_service = MemoryService {
            engine: &engine,
            admission: &next_host,
        };
        assert_eq!(
            next_service
                .query(&mut store, &state, &fixture.query)
                .unwrap()
                .1
                .status,
            "stale"
        );
        let mut scope = get_record(&store, &fixture.scope).unwrap();
        scope["frontier"] = json!(next_frontier);
        fixture.scope = put(&mut store, scope);
        let fresh = observed(&mut store, &next_service, &fixture, "tool-a");
        let mut observations = vec![old_observation, fresh];
        observations.sort();
        let next_memory = next_service
            .snapshot(
                &mut store,
                &json!({"application":"parity","schema":fixture.schema,"previous":memory,
            "scope":fixture.scope,"observations":observations,"hypotheses":[],"withdrawn":[]}),
            )
            .unwrap();
        let next_state = revision_and_state(&mut store, &fixture, &next_memory);
        assert_eq!(
            next_service
                .query(&mut store, &next_state, &fixture.query)
                .unwrap()
                .1
                .status,
            "supported"
        );
        for field in ["attestation", "decoders"] {
            let mut changed = next_policy.clone();
            if field == "attestation" {
                changed[field] = json!("algal.other-attestation.v1");
            } else {
                changed[field][0]["rawContract"] = json!("algal.other-raw.v1");
            }
            let changed_host = PolicyHost::new(&changed, tmp.path()).unwrap();
            assert_ne!(changed_host.identity(), next_host.identity());
            assert!(
                MemoryService {
                    engine: &engine,
                    admission: &changed_host
                }
                .query(&mut store, &next_state, &fixture.query)
                .is_err()
            );
        }
    }

    #[test]
    fn observation_query_reaches_supported_through_the_native_engine() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let (fixture, frontier) = seed(&mut store);
        let engine = NativeEngine::new(&"0".repeat(64), 10_000).unwrap();
        let host = Host {
            frontier,
            identity: digest(&json!({"contract":"algal.test-admission.v1"})).unwrap(),
        };
        let service = MemoryService {
            engine: &engine,
            admission: &host,
        };
        let observation = observed(&mut store, &service, &fixture, "tool-a");
        let memory = service
            .snapshot(
                &mut store,
                &json!({"application":"parity","schema":fixture.schema,"previous":null,"scope":fixture.scope,"observations":[observation],"hypotheses":[],"withdrawn":[]}),
            )
            .unwrap();
        let state = revision_and_state(&mut store, &fixture, &memory);
        let (reference, derivation) = service.query(&mut store, &state, &fixture.query).unwrap();
        assert_eq!(reference, digest(&derivation.value).unwrap());
        assert_eq!(derivation.status, "supported");
        assert!(derivation.verified);
        assert!(derivation.result.is_some());
    }

    #[test]
    fn competing_single_value_claims_yield_conflicted() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let (fixture, frontier) = seed(&mut store);
        let engine = NativeEngine::new(&"0".repeat(64), 10_000).unwrap();
        let host = Host {
            frontier,
            identity: digest(&json!({"contract":"algal.test-admission.v1"})).unwrap(),
        };
        let service = MemoryService {
            engine: &engine,
            admission: &host,
        };
        let mut observations = [
            observed(&mut store, &service, &fixture, "tool-a"),
            observed(&mut store, &service, &fixture, "tool-b"),
        ];
        observations.sort();
        let memory = service
            .snapshot(
                &mut store,
                &json!({"application":"parity","schema":fixture.schema,"previous":null,"scope":fixture.scope,"observations":observations,"hypotheses":[],"withdrawn":[]}),
            )
            .unwrap();
        let state = revision_and_state(&mut store, &fixture, &memory);
        let (_, derivation) = service.query(&mut store, &state, &fixture.query).unwrap();
        assert_eq!(derivation.status, "conflicted");
    }

    #[test]
    fn stale_scope_marks_the_derivation_stale() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let (fixture, frontier) = seed(&mut store);
        let engine = NativeEngine::new(&"0".repeat(64), 10_000).unwrap();
        // The host advanced the frontier; the captured scope no longer binds it.
        let mutation = put(&mut store, json!({"contract":"algal.test-mutation.v1"}));
        let moved = put(
            &mut store,
            json!({"contract":"algal.application-memory-frontier.v1","application":"parity","previous":frontier,"sequence":1,"mutation":mutation,"status":"settled"}),
        );
        let host = Host {
            frontier: moved,
            identity: digest(&json!({"contract":"algal.test-admission.v1"})).unwrap(),
        };
        let service = MemoryService {
            engine: &engine,
            admission: &host,
        };
        let observation = observed(&mut store, &service, &fixture, "tool-a");
        let memory = service
            .snapshot(
                &mut store,
                &json!({"application":"parity","schema":fixture.schema,"previous":null,"scope":fixture.scope,"observations":[observation],"hypotheses":[],"withdrawn":[]}),
            )
            .unwrap();
        let state = revision_and_state(&mut store, &fixture, &memory);
        let (_, derivation) = service.query(&mut store, &state, &fixture.query).unwrap();
        assert_eq!(derivation.status, "stale");
        assert!(
            !derivation.verified || derivation.result.is_none() || derivation.status == "stale"
        );
    }

    #[test]
    fn rollover_preserves_sources_and_support_beyond_128_observations() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let (fixture, frontier) = seed(&mut store);
        let engine = NativeEngine::new(&"0".repeat(64), 10_000).unwrap();
        let host = Host {
            frontier,
            identity: digest(&json!("rollover-admission")).unwrap(),
        };
        let service = MemoryService {
            engine: &engine,
            admission: &host,
        };
        let mut observations: Vec<_> = (0..128)
            .map(|index| observed(&mut store, &service, &fixture, &format!("tool-{index}")))
            .collect();
        observations.sort();
        let memory = service.snapshot(&mut store, &json!({"application":"parity","schema":fixture.schema,"previous":null,
            "scope":fixture.scope,"observations":observations,"hypotheses":[],"withdrawn":[observations[1]]})).unwrap();
        let rolled = service.rollover(&mut store, &json!({"memory":memory,"retainObservations":[observations[0]],"retainHypotheses":[]})).unwrap();
        let active =
            parse_snapshot(&get_record(&store, rolled["memory"].as_str().unwrap()).unwrap())
                .unwrap();
        assert_eq!(active.observations, vec![observations[0].clone()]);
        assert!(active.withdrawn.is_empty());
        let history = service
            .archive_history(&store, rolled["memory"].as_str().unwrap())
            .unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].snapshot.observations, observations);
        for reference in &history[0].snapshot.observations {
            let observation = parse_observation(&get_record(&store, reference).unwrap()).unwrap();
            get_record(&store, &observation.input.raw).unwrap();
            get_record(&store, &observation.input.receipt).unwrap();
        }
        let state = revision_and_state(&mut store, &fixture, rolled["memory"].as_str().unwrap());
        assert_eq!(
            service
                .query(&mut store, &state, &fixture.query)
                .unwrap()
                .1
                .status,
            "supported"
        );
        let additional = observed(&mut store, &service, &fixture, "tool-129");
        let mut selected = vec![observations[0].clone(), additional];
        selected.sort();
        let input = json!({"application":"parity","schema":fixture.schema,"previous":rolled["memory"],"scope":fixture.scope,
            "observations":selected,"hypotheses":[],"withdrawn":[],"archive":rolled["archive"]});
        service.snapshot(&mut store, &input).unwrap();
        let mut resurrected = input.clone();
        let mut selected = vec![observations[0].clone(), observations[1].clone()];
        selected.sort();
        resurrected["observations"] = json!(selected);
        assert!(
            service
                .snapshot(&mut store, &resurrected)
                .unwrap_err()
                .to_string()
                .contains("resurrected")
        );
        let mut dropped = input.clone();
        dropped.as_object_mut().unwrap().remove("archive");
        assert!(service.snapshot(&mut store, &dropped).is_err());
        let mut invalid = history[0].archive.value.clone();
        invalid["application"] = json!("foreign");
        let foreign = put(&mut store, invalid);
        let mut forged = input;
        forged["archive"] = json!(foreign);
        assert!(service.snapshot(&mut store, &forged).is_err());
    }

    #[test]
    fn rollover_retains_selected_withdrawals_and_fails_closed_at_bounds() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let (fixture, frontier) = seed(&mut store);
        let engine = NativeEngine::new(&"0".repeat(64), 10_000).unwrap();
        let host = Host {
            frontier,
            identity: digest(&json!("rollover-admission")).unwrap(),
        };
        let service = MemoryService {
            engine: &engine,
            admission: &host,
        };
        let mut observations = vec![
            observed(&mut store, &service, &fixture, "keep"),
            observed(&mut store, &service, &fixture, "retire"),
        ];
        observations.sort();
        let memory = service.snapshot(&mut store, &json!({"application":"parity","schema":fixture.schema,"previous":null,
            "scope":fixture.scope,"observations":observations,"hypotheses":[],"withdrawn":[observations[0]]})).unwrap();
        let rolled = service.rollover(&mut store, &json!({"memory":memory,"retainObservations":[observations[0]],"retainHypotheses":[]})).unwrap();
        let active =
            parse_snapshot(&get_record(&store, rolled["memory"].as_str().unwrap()).unwrap())
                .unwrap();
        assert_eq!(active.withdrawn, vec![observations[0].clone()]);
        let mut reset = active.value.clone();
        reset.as_object_mut().unwrap().remove("contract");
        reset["withdrawn"] = json!([]);
        assert!(
            service
                .snapshot(&mut store, &reset)
                .unwrap_err()
                .to_string()
                .contains("selected withdrawals")
        );
        let archive = get_record(&store, rolled["archive"].as_str().unwrap()).unwrap();
        let mut invalid = archive.clone();
        invalid["sequence"] = json!(ARCHIVE_LIMIT);
        assert!(parse_archive(&invalid).is_err());
        let mut invalid = archive.clone();
        invalid["extra"] = json!(true);
        assert!(parse_archive(&invalid).is_err());
        let mut invalid = active.value.clone();
        invalid["archive"] = Value::Null;
        assert!(parse_snapshot(&invalid).is_err());
        assert!(service.rollover(&mut store, &json!({"memory":rolled["memory"],"retainObservations":[observations[0]],"retainHypotheses":[]})).is_err());
    }

    #[test]
    fn engine_identity_pins_bare_hex_and_timeout() {
        assert!(NativeEngine::new(&"ab".repeat(32), 10_000).is_ok());
        assert!(NativeEngine::new(&format!("sha256:{}", "ab".repeat(32)), 10_000).is_err());
        assert!(NativeEngine::new(&"ab".repeat(32), 0).is_err());
        assert!(NativeEngine::new(&"ab".repeat(32), 10_001).is_err());
        let a = engine_identity(&"cd".repeat(32), 10_000).unwrap();
        let b = engine_identity(&"cd".repeat(32), 9_999).unwrap();
        assert_ne!(a, b);
    }

    #[test]
    fn scope_records_are_bounded_and_sorted() {
        let v = |value: Value| parse_scope(&value).map(|_| ());
        assert!(v(json!({"contract":"algal.application-memory-scope.v1","application":"a","environment":"e","task":"t","frontier":digest(&json!(1)).unwrap(),"bindings":[],"completeFor":[],"attestation":digest(&json!(2)).unwrap()})).is_ok());
        // Unsorted bindings are rejected.
        let bindings = json!([
            {"key":"b","version":{"contract":"algal.test.v1"}},
            {"key":"a","version":{"contract":"algal.test.v1"}},
        ]);
        assert!(v(json!({"contract":"algal.application-memory-scope.v1","application":"a","environment":"e","task":"t","frontier":digest(&json!(1)).unwrap(),"bindings":bindings,"completeFor":[],"attestation":digest(&json!(2)).unwrap()})).is_err());
        // Unknown keys are rejected.
        assert!(v(json!({"contract":"algal.application-memory-scope.v1","application":"a","environment":"e","task":"t","frontier":digest(&json!(1)).unwrap(),"bindings":[],"completeFor":[],"attestation":digest(&json!(2)).unwrap(),"extra":1})).is_err());
    }
}
