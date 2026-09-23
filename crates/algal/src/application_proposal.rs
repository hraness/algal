//! Case-pure, bounded, replayable candidate generation — port of
//! src/application-proposal.ts. A `propose` transition retains
//! `algal.application-proposal.v1`: the evidence that a generator entrypoint
//! of the CURRENT revision was run under the incumbent evaluation policy and
//! emitted candidate manifests for a target entrypoint. Every candidate is
//! an ordinary child revision differing from the incumbent only at the
//! target manifest, so a candidate can never widen authority. The record
//! grants nothing: revision, memory and epoch are unchanged, no intents are
//! created, and a candidate stays an unselected CAS value until an ordinary
//! `activate` carries its reproduced accepted evaluation. Generation
//! failures are retained as evidence, never silently dropped, and the
//! receipt replays bit-for-bit under `verify`.

use serde_json::{Map, Value, json};
use std::collections::BTreeSet;

use crate::application::{Entrypoint, Revision, Service, State, parse_revision, parse_state};
use crate::application_adaptation::{
    LoadedRevision, load_revision, parse_evaluation_policy, pure_manifest,
};
use crate::application_memory::{
    app_id, app_json, app_object, app_object_opt, app_ref, app_refs, app_tag, get_record, opt_ref,
    put_record,
};
use crate::canonical::{canonical, check_digest, digest};
use crate::contract::{Manifest, integer, list, object};
use crate::effects::Host;
use crate::graph::Transports;
use crate::store::Store;
use crate::{Error, Result, receipt, runtime};

const PROPOSAL_CANDIDATES: usize = 8;
const PROPOSAL_REASONS: usize = 16;
const PROPOSAL_REASON_BYTES: usize = 256;

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

fn reason(value: &Value) -> Result<()> {
    match value.as_str() {
        Some(text)
            if !text.is_empty() && !text.contains('\0') && text.len() <= PROPOSAL_REASON_BYTES =>
        {
            Ok(())
        }
        _ => Err(fail("Proposal reason must be bounded text")),
    }
}

/// `algal.application-proposal-request.v1` — the frozen generation input.
pub struct ProposalRequest {
    pub application: String,
    /// Binds the exact head; the generator is that state's revision's entrypoint.
    pub parent_state: String,
    /// Entrypoint of the incumbent revision that emits candidate manifests.
    pub generator: String,
    /// Entrypoint whose manifest the candidates replace.
    pub target: String,
    /// Digest of a CAS object keyed by the generator's interface input names.
    pub arguments: String,
    /// Generator interface output carrying the emitted manifest list.
    pub output: String,
    /// Must equal the incumbent revision's evaluation policy.
    pub policy: String,
    /// Optional environment label; absent on older records and preserved when absent.
    pub environment: Option<String>,
    pub value: Value,
}

pub fn parse_proposal_request(input: &Value) -> Result<ProposalRequest> {
    let v = app_object_opt(
        input,
        &[
            "contract",
            "application",
            "parentState",
            "generator",
            "target",
            "arguments",
            "output",
            "policy",
        ],
        &["environment"],
    )?;
    app_tag(&v["contract"], "algal.application-proposal-request.v1")?;
    Ok(ProposalRequest {
        application: app_id(&v["application"])?.to_owned(),
        parent_state: app_ref(&v["parentState"])?.to_owned(),
        generator: app_id(&v["generator"])?.to_owned(),
        target: app_id(&v["target"])?.to_owned(),
        arguments: app_ref(&v["arguments"])?.to_owned(),
        output: app_id(&v["output"])?.to_owned(),
        policy: app_ref(&v["policy"])?.to_owned(),
        environment: v
            .get("environment")
            .map(|value| app_id(value).map(str::to_owned))
            .transpose()?,
        value: app_json(input)?,
    })
}

/// `parseApplicationProposal` — closed record; a failed proposal carries
/// bounded reasons and no candidates, a generated one carries neither.
pub fn parse_application_proposal(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "request",
            "application",
            "parentState",
            "revision",
            "generator",
            "target",
            "generatorManifest",
            "receipt",
            "status",
            "reasons",
            "candidates",
            "work",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-proposal.v1")?;
    let failed = match v["status"].as_str() {
        Some("generated") => false,
        Some("failed") => true,
        _ => return Err(fail("Invalid proposal status")),
    };
    for row in list(&v["reasons"], PROPOSAL_REASONS)? {
        reason(row)?;
    }
    let rows = list(&v["candidates"], PROPOSAL_CANDIDATES)?;
    for row in rows {
        let c = app_object(row, &["manifest", "revision"])?;
        app_ref(&c["manifest"])?;
        app_ref(&c["revision"])?;
    }
    if rows.windows(2).any(|pair| {
        pair[0]["revision"].as_str().unwrap_or_default()
            >= pair[1]["revision"].as_str().unwrap_or_default()
    }) {
        return Err(fail("Proposal candidates must be sorted by revision"));
    }
    let mut manifests: Vec<&str> = rows
        .iter()
        .map(|row| row["manifest"].as_str().unwrap_or_default())
        .collect();
    manifests.sort_unstable();
    manifests.dedup();
    if manifests.len() != rows.len() {
        return Err(fail("Proposal candidate manifests must be unique"));
    }
    if failed != rows.is_empty() || failed == v["reasons"].as_array().is_none_or(|r| r.is_empty()) {
        return Err(fail(
            "Proposal status does not match its candidates and reasons",
        ));
    }
    let w = app_object(&v["work"], &["steps", "agentCalls", "units"])?;
    for field in ["steps", "agentCalls", "units"] {
        integer(&w[field], 0, 9_007_199_254_740_991)?;
    }
    app_ref(&v["request"])?;
    app_id(&v["application"])?;
    app_ref(&v["parentState"])?;
    app_ref(&v["revision"])?;
    app_id(&v["generator"])?;
    app_id(&v["target"])?;
    app_ref(&v["generatorManifest"])?;
    app_ref(&v["receipt"])?;
    Ok(input.clone())
}

fn entry<'a>(revision: &'a Revision, name: &str) -> Result<&'a Entrypoint> {
    revision
        .entrypoints
        .iter()
        .find(|item| item.name == name)
        .ok_or_else(|| fail(&format!("Unknown application entrypoint {name}")))
}

struct Bound {
    request: ProposalRequest,
    state: State,
    incumbent: LoadedRevision,
    policy: Value,
    generator_manifest: Manifest,
    source_cell: String,
    source_port: String,
    args: Value,
}

/// Resolves and checks everything the request binds, before any run.
fn bind_request(store: &Store, request: ProposalRequest) -> Result<Bound> {
    let state = parse_state(&get_record(store, &request.parent_state)?)?;
    if state.application != request.application {
        return Err(fail("Proposal request belongs to another application"));
    }
    let incumbent = load_revision(store, &state.revision)?;
    if request.policy != incumbent.revision.evaluation_policy {
        return Err(fail(
            "Proposal policy is not bound to the incumbent revision",
        ));
    }
    let policy = parse_evaluation_policy(&get_record(store, &request.policy)?)?;
    entry(&incumbent.revision, &request.generator)?;
    entry(&incumbent.revision, &request.target)?;
    let generator_manifest = incumbent
        .manifests
        .get(&request.generator)
        .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?
        .clone();
    pure_manifest(&generator_manifest)?;
    let interface = object(&generator_manifest.value["interface"])
        .map_err(|_| fail("Generator entrypoint must declare an interface"))?;
    let source = interface
        .get("outputs")
        .and_then(|outputs| outputs.get(request.output.as_str()))
        .ok_or_else(|| {
            fail(&format!(
                "Generator entrypoint has no interface output \"{}\"",
                request.output
            ))
        })?;
    let source_cell = source["cell"].as_str().unwrap_or_default().to_owned();
    let source_port = source["port"].as_str().unwrap_or_default().to_owned();
    let provided = get_record(store, &request.arguments)?;
    let provided = object(&provided)
        .map_err(|_| fail("Proposal arguments must be an object keyed by interface input"))?;
    let empty = Map::new();
    let inputs = interface
        .get("inputs")
        .and_then(Value::as_object)
        .unwrap_or(&empty);
    let mut args = Map::new();
    for (name, value) in provided {
        let target = inputs.get(name).ok_or_else(|| {
            fail(&format!(
                "Generator entrypoint has no interface input \"{name}\""
            ))
        })?;
        args.entry(target["cell"].as_str().unwrap_or_default().to_owned())
            .or_insert_with(|| json!({}))[target["port"].as_str().unwrap_or_default()] =
            value.clone();
    }
    Ok(Bound {
        request,
        state,
        incumbent,
        policy,
        generator_manifest,
        source_cell,
        source_port,
        args: Value::Object(args),
    })
}

struct Candidate {
    manifest: Manifest,
    manifest_ref: String,
    revision: Value,
    revision_ref: String,
}

struct Derived {
    status: &'static str,
    reasons: Vec<String>,
    candidates: Vec<Candidate>,
}

/// Pure derivation of the verdict from the receipt: the same function runs
/// at production and at verification, so the stored record is exactly what
/// replay reproduces. A bad candidate fails the whole proposal — the receipt
/// and reasons are retained, the candidate list is not.
fn derive_candidates(bound: &Bound, receipt: &Value) -> Result<Derived> {
    let mut reasons: Vec<String> = Vec::new();
    let mut note = |why: String| {
        if !reasons.contains(&why) {
            reasons.push(why);
        }
    };
    let mut candidates: Vec<Candidate> = Vec::new();
    let outcome = receipt["outcome"].as_str().unwrap_or_default();
    if outcome != "complete" {
        note(format!("generator-{outcome}"));
    }
    if receipt["work"]["units"].as_u64().unwrap_or(0)
        > bound.policy["maxWork"].as_u64().unwrap_or(0)
        || receipt["work"]["agentCalls"].as_u64().unwrap_or(0)
            > bound.policy["maxModelCalls"].as_u64().unwrap_or(0)
    {
        note("budget-exhausted".to_owned());
    }
    if outcome == "complete" {
        let emitted =
            &receipt["cells"][bound.source_cell.as_str()]["outputs"][bound.source_port.as_str()];
        match emitted.as_array().filter(|emitted| !emitted.is_empty()) {
            None => note("no-candidates".to_owned()),
            Some(emitted) if emitted.len() > PROPOSAL_CANDIDATES => {
                note("candidate-bound".to_owned());
            }
            Some(emitted) => {
                let incumbent_target = entry(&bound.incumbent.revision, &bound.request.target)?
                    .manifest
                    .clone();
                let mut seen = BTreeSet::from([incumbent_target]);
                for value in emitted {
                    let manifest = match Manifest::parse(value) {
                        Ok(manifest) => manifest,
                        Err(_) => {
                            note("invalid-candidate".to_owned());
                            continue;
                        }
                    };
                    if pure_manifest(&manifest).is_err() {
                        note("impure-candidate".to_owned());
                        continue;
                    }
                    let manifest_ref = manifest.digest()?;
                    if !seen.insert(manifest_ref.clone()) {
                        note("duplicate-candidate".to_owned());
                        continue;
                    }
                    let mut revision = bound.incumbent.revision.value.clone();
                    revision["parent"] = json!(bound.state.revision);
                    for row in revision["entrypoints"]
                        .as_array_mut()
                        .expect("parsed revision entrypoints")
                    {
                        if row["name"].as_str() == Some(bound.request.target.as_str()) {
                            row["manifest"] = json!(manifest_ref);
                        }
                    }
                    parse_revision(&revision)?;
                    let revision_ref = digest(&revision)?;
                    candidates.push(Candidate {
                        manifest,
                        manifest_ref,
                        revision,
                        revision_ref,
                    });
                }
            }
        }
    }
    if !reasons.is_empty() {
        return Ok(Derived {
            status: "failed",
            reasons,
            candidates: Vec::new(),
        });
    }
    candidates.sort_by(|a, b| a.revision_ref.cmp(&b.revision_ref));
    Ok(Derived {
        status: "generated",
        reasons,
        candidates,
    })
}

fn assemble(
    bound: &Bound,
    request_ref: &str,
    receipt_ref: &str,
    receipt: &Value,
    derived: Derived,
) -> Result<Value> {
    Ok(json!({
        "contract": "algal.application-proposal.v1",
        "request": request_ref,
        "application": bound.request.application,
        "parentState": bound.request.parent_state,
        "revision": bound.state.revision,
        "generator": bound.request.generator,
        "target": bound.request.target,
        "generatorManifest": entry(&bound.incumbent.revision, &bound.request.generator)?.manifest,
        "receipt": receipt_ref,
        "status": derived.status,
        "reasons": derived.reasons,
        "candidates": derived.candidates.iter().map(|candidate| json!({
            "manifest": candidate.manifest_ref, "revision": candidate.revision_ref,
        })).collect::<Vec<_>>(),
        "work": {
            "steps": receipt["work"]["steps"],
            "agentCalls": receipt["work"]["agentCalls"],
            "units": receipt["work"]["units"],
        },
    }))
}

/// `produceApplicationProposal` — run the generator entrypoint case-pure
/// under the incumbent evaluation policy, retain the receipt, publish every
/// candidate manifest and child revision, and store the proposal record.
pub async fn produce_proposal(
    store: &mut Store,
    input: &Value,
    host: &mut Host,
    transports: &Transports,
) -> Result<(String, Value)> {
    let request = parse_proposal_request(input)?;
    let request_ref = put_record(store, &request.value)?;
    let bound = bind_request(store, request)?;
    let receipt = runtime::run(
        bound.generator_manifest.clone(),
        bound.args.clone(),
        store,
        host,
        transports,
        None,
    )
    .await?;
    let receipt_ref = store.put("runs", &receipt)?;
    let derived = derive_candidates(&bound, &receipt)?;
    for candidate in &derived.candidates {
        if store.put("manifests", &candidate.manifest.value)? != candidate.manifest_ref {
            return Err(fail("Candidate manifest identity differs"));
        }
        if put_record(store, &candidate.revision)? != candidate.revision_ref {
            return Err(fail("Candidate revision identity differs"));
        }
    }
    let proposal = assemble(&bound, &request_ref, &receipt_ref, &receipt, derived)?;
    Ok((put_record(store, &proposal)?, proposal))
}

/// `verifyApplicationProposal` — full replay: the stored proposal must be
/// reproducible from its request, the retained receipt must replay
/// bit-for-bit against the generator manifest and derived arguments, and
/// every published candidate must resolve. Nothing is written.
pub async fn verify_proposal(
    store: &Store,
    proposal_ref: &str,
    expected_parent_state: &str,
    host: &Host,
) -> Result<Value> {
    let stored = parse_application_proposal(&get_record(store, proposal_ref)?)?;
    let request = parse_proposal_request(&get_record(store, app_ref(&stored["request"])?)?)?;
    if stored["parentState"].as_str() != Some(request.parent_state.as_str())
        || stored["application"].as_str() != Some(request.application.as_str())
        || stored["generator"].as_str() != Some(request.generator.as_str())
        || stored["target"].as_str() != Some(request.target.as_str())
    {
        return Err(fail("Proposal fields are not bound to its request"));
    }
    if request.parent_state != check_digest(expected_parent_state)? {
        return Err(fail("Proposal parent state is stale"));
    }
    let bound = bind_request(store, request)?;
    if stored["revision"].as_str() != Some(bound.state.revision.as_str())
        || stored["generatorManifest"].as_str()
            != Some(
                entry(&bound.incumbent.revision, &bound.request.generator)?
                    .manifest
                    .as_str(),
            )
    {
        return Err(fail("Proposal fields are not bound to its request"));
    }
    let receipt_ref = app_ref(&stored["receipt"])?;
    let receipt = store
        .get("runs", receipt_ref)?
        .filter(|value| digest(value).ok().as_deref() == Some(receipt_ref))
        .ok_or_else(|| fail("Missing or changed proposal receipt"))?;
    receipt::validate(&receipt)?;
    if receipt["manifestDigest"].as_str()
        != Some(
            entry(&bound.incumbent.revision, &bound.request.generator)?
                .manifest
                .as_str(),
        )
        || canonical(&receipt["args"])? != canonical(&bound.args)?
    {
        return Err(fail(
            "Proposal receipt does not bind its generator and arguments",
        ));
    }
    let verified = runtime::verify(&receipt, bound.generator_manifest.clone(), store, host).await?;
    if verified["ok"] != true {
        let mismatches = verified["mismatches"]
            .as_array()
            .map(|m| {
                m.iter()
                    .map(|x| x.as_str().unwrap_or_default().to_owned())
                    .collect::<Vec<_>>()
                    .join("; ")
            })
            .unwrap_or_default();
        return Err(fail(&format!(
            "Proposal receipt does not replay: {mismatches}"
        )));
    }
    let recomputed = assemble(
        &bound,
        app_ref(&stored["request"])?,
        receipt_ref,
        &receipt,
        derive_candidates(&bound, &receipt)?,
    )?;
    if canonical(&app_json(&recomputed)?)? != canonical(&app_json(&stored)?)? {
        return Err(fail("Proposal is not reproducible from its evidence"));
    }
    for candidate in stored["candidates"].as_array().into_iter().flatten() {
        parse_revision(&get_record(store, app_ref(&candidate["revision"])?)?)?;
        if store
            .get("manifests", app_ref(&candidate["manifest"])?)?
            .is_none()
        {
            return Err(fail("Proposal candidate manifest is missing"));
        }
    }
    Ok(stored)
}

/// `verifyApplicationProposalBinding` — structural binding, independent of
/// host authority: runs on commit and retained-history inspection, custom
/// trusted hosts included. Exactly one proposal record must name this
/// application, parent state and incumbent revision, and every candidate
/// must be a child of the incumbent differing only at the target
/// entrypoint's manifest. No replay happens here.
pub fn verify_proposal_binding(
    store: &Store,
    application: &str,
    parent_state: &str,
    revision: &str,
    evidence: &[String],
) -> Result<Value> {
    let mut records = Vec::new();
    for reference in evidence {
        let value = get_record(store, reference)?;
        if value["contract"] == "algal.application-proposal.v1" {
            records.push(parse_application_proposal(&value)?);
        }
    }
    if records.len() != 1 {
        return Err(fail("Proposal requires exactly one proposal record"));
    }
    let record = records.remove(0);
    if record["application"].as_str() != Some(application)
        || record["parentState"].as_str() != Some(parent_state)
        || record["revision"].as_str() != Some(revision)
    {
        return Err(fail("Proposal evidence does not bind this transition"));
    }
    let incumbent = parse_revision(&get_record(store, revision)?)?;
    let target = entry(&incumbent, record["target"].as_str().unwrap_or_default())?;
    entry(&incumbent, record["generator"].as_str().unwrap_or_default())?;
    for candidate in record["candidates"].as_array().into_iter().flatten() {
        let child = parse_revision(&get_record(store, app_ref(&candidate["revision"])?)?)?;
        let installed = child.entrypoints.iter().find(|e| e.name == target.name);
        if child.parent.as_deref() != Some(revision)
            || installed.map(|e| e.manifest.as_str()) != candidate["manifest"].as_str()
        {
            return Err(fail(
                "Proposal candidate is not a child of the incumbent at the target manifest",
            ));
        }
        let mut folded = child.value.clone();
        folded["parent"] = json!(incumbent.parent);
        for row in folded["entrypoints"]
            .as_array_mut()
            .expect("parsed revision entrypoints")
        {
            if row["name"].as_str() == Some(target.name.as_str()) {
                row["manifest"] = json!(target.manifest);
            }
        }
        if digest(&app_json(&folded)?)? != revision {
            return Err(fail(
                "Proposal candidate must differ from the incumbent only at the target manifest",
            ));
        }
    }
    Ok(record)
}

/// `proposeApplicationRevision` — produce the proposal and commit the
/// `propose` transition: revision, memory and epoch unchanged, no intents,
/// the proposal as evidence.
pub async fn propose_revision(
    lifecycle: &mut Service<'_>,
    input: &Value,
    host: &mut Host,
    transports: &Transports,
) -> Result<Value> {
    let v = app_object_opt(
        input,
        &[
            "application",
            "operation",
            "expectedHead",
            "generator",
            "target",
            "arguments",
            "output",
            "policy",
        ],
        &["environment", "evidence", "causedBy"],
    )?;
    let application = app_id(&v["application"])?.to_owned();
    let operation = app_ref(&v["operation"])?;
    let expected_head = app_ref(&v["expectedHead"])?;
    let mut request = json!({
        "contract": "algal.application-proposal-request.v1",
        "application": application,
        "parentState": expected_head,
        "generator": app_id(&v["generator"])?,
        "target": app_id(&v["target"])?,
        "arguments": app_ref(&v["arguments"])?,
        "output": app_id(&v["output"])?,
        "policy": app_ref(&v["policy"])?,
    });
    if let Some(environment) = v.get("environment") {
        request["environment"] = json!(app_id(environment)?);
    }
    let mut evidence = match v.get("evidence").filter(|value| !value.is_null()) {
        Some(value) => app_refs(value, 15)?,
        None => Vec::new(),
    };
    let caused_by = opt_ref(v.get("causedBy").unwrap_or(&Value::Null))?;
    let (proposal, record) =
        produce_proposal(&mut lifecycle.store, &request, host, transports).await?;
    let current = parse_state(&get_record(&lifecycle.store, expected_head)?)?;
    evidence.push(proposal.clone());
    evidence.sort();
    evidence.dedup();
    let snapshot = lifecycle
        .commit(&json!({
            "application": application, "operation": operation, "kind": "propose",
            "expectedHead": expected_head, "revision": current.revision, "memory": current.memory,
            "intents": [], "evidence": evidence, "causedBy": caused_by,
        }))
        .await?;
    Ok(json!({
        "snapshot": snapshot.digest,
        "proposal": proposal,
        "status": record["status"],
        "candidates": record["candidates"],
    }))
}
