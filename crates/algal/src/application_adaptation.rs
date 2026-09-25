//! Bounded proposal/evaluation/activation admission for application
//! revisions — port of src/application-adaptation.ts. This module wraps the
//! shared foundry evaluator; it is not a second evaluator and it never
//! publishes an application head. Case-pure evaluation admits builtin
//! function cells only and no effect executors; the native registry is
//! structurally the builtin one (there is no injectable fn registry), so
//! `isBuiltinRegistry` holds by construction.

use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};

use crate::application::{Revision, parse_revision, parse_state};
use crate::application_memory::{
    app_id, app_json, app_object, app_object_opt, app_ref, app_tag, bounded_text, get_record,
    parse_queries, parse_query, parse_schema, put_record,
};
use crate::canonical::{canonical, digest};
use crate::contract::{Manifest, object};
use crate::effects::Host;
use crate::graph::{Compiled, Transports, compile, interface_signature};
use crate::scorer::check_scorer;
use crate::store::Store;
use crate::{Error, Result, foundry, habitat_budget};

const MAX_EVALUATION_CASES: usize = 32;
const MAX_EVALUATION_WORK: u64 = 1_000_000;
const MAX_EVALUATION_MODEL_CALLS: u64 = 16;

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

fn same(a: &Value, b: &Value) -> Result<bool> {
    Ok(canonical(&app_json(a)?)? == canonical(&app_json(b)?)?)
}

fn int(value: &Value, min: u64, max: u64) -> Result<u64> {
    let n = value
        .as_u64()
        .ok_or_else(|| fail("evaluation bound must be a non-negative integer"))?;
    if n < min || n > max {
        return Err(fail("evaluation bound outside its range"));
    }
    Ok(n)
}

/// `applicationInt` bounds in src/application-contract.ts parse order:
/// the field must be an integer inside [min, max].
pub fn parse_evaluation_policy(input: &Value) -> Result<Value> {
    let v = app_object_opt(
        input,
        &[
            "contract",
            "maxCases",
            "maxWork",
            "maxModelCalls",
            "requireHoldoutPass",
            "strictValidationImprovement",
        ],
        &["research", "composition"],
    )?;
    app_tag(&v["contract"], "algal.application-evaluation-policy.v1")?;
    if v["requireHoldoutPass"] != true || v["strictValidationImprovement"] != true {
        return Err(fail("Adaptation policy cannot weaken acceptance"));
    }
    int(&v["maxCases"], 3, MAX_EVALUATION_CASES as u64)?;
    int(&v["maxWork"], 1, MAX_EVALUATION_WORK)?;
    int(&v["maxModelCalls"], 0, MAX_EVALUATION_MODEL_CALLS)?;
    if let Some(research) = v.get("research") {
        app_ref(research)?;
    }
    if v.get("composition")
        .is_some_and(|mode| mode.as_str() != Some("closed-pure-v1"))
    {
        return Err(fail("Invalid evaluation composition policy"));
    }
    app_json(input)
}

/// Case ids follow the foundry `^[a-z0-9]+(?:-[a-z0-9]+)*$` bound — the
/// reference applies it inside `runFoundry` even though the record parser
/// only bounds text, so the effective contract is the stricter one.
fn case_id(value: &Value) -> Result<String> {
    let id = bounded_text(value, 64)?;
    let ok = !id.is_empty()
        && id.split('-').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
        });
    if !ok {
        return Err(fail("Invalid evaluation case id"));
    }
    Ok(id)
}

pub fn parse_evaluation_cases(input: &Value) -> Result<Vec<foundry::FoundryCase>> {
    let v = app_object(input, &["contract", "cases"])?;
    app_tag(&v["contract"], "algal.application-evaluation-cases.v1")?;
    let mut ids = BTreeSet::new();
    let mut cases = Vec::new();
    for row in crate::contract::list(&v["cases"], MAX_EVALUATION_CASES)? {
        let c = app_object(row, &["id", "split", "args", "expect"])?;
        let id = case_id(&c["id"])?;
        if !ids.insert(id.clone()) {
            return Err(fail("Duplicate evaluation case"));
        }
        let split = match c["split"].as_str() {
            Some(split @ ("train" | "validation" | "holdout")) => split.to_owned(),
            _ => return Err(fail("Invalid evaluation split")),
        };
        object(&c["args"])?;
        object(&c["expect"])?;
        cases.push(foundry::FoundryCase {
            id,
            split,
            args: c["args"].clone(),
            expect: c["expect"].clone(),
        });
    }
    if !cases.iter().any(|c| c.split == "train")
        || !cases.iter().any(|c| c.split == "validation")
        || !cases.iter().any(|c| c.split == "holdout")
    {
        return Err(fail(
            "Evaluation requires train, validation, and holdout cases",
        ));
    }
    Ok(cases)
}

/// Returns the `algal.expr.v1` scorer envelope, or `None` for a null scorer.
pub fn parse_evaluation_scorer(input: &Value) -> Result<Option<Value>> {
    let v = app_object(input, &["contract", "scorer"])?;
    app_tag(&v["contract"], "algal.application-evaluation-scorer.v1")?;
    if v["scorer"].is_null() {
        return Ok(None);
    }
    check_scorer(&v["scorer"])?;
    Ok(Some(v["scorer"].clone()))
}

pub struct EvaluationRequest {
    pub parent_state: String,
    pub candidate_revision: String,
    pub entrypoint: String,
    pub cases: String,
    pub scorer: String,
    pub policy: String,
    /// Optional environment label attributing the evidence to a deployment
    /// context; absent on older records and preserved when absent.
    pub environment: Option<String>,
    pub value: Value,
}

pub fn parse_evaluation_request(input: &Value) -> Result<EvaluationRequest> {
    let v = app_object_opt(
        input,
        &[
            "contract",
            "parentState",
            "candidateRevision",
            "entrypoint",
            "cases",
            "scorer",
            "policy",
        ],
        &["environment"],
    )?;
    app_tag(&v["contract"], "algal.application-evaluation-request.v1")?;
    Ok(EvaluationRequest {
        parent_state: app_ref(&v["parentState"])?.to_owned(),
        candidate_revision: app_ref(&v["candidateRevision"])?.to_owned(),
        entrypoint: app_id(&v["entrypoint"])?.to_owned(),
        cases: app_ref(&v["cases"])?.to_owned(),
        scorer: app_ref(&v["scorer"])?.to_owned(),
        policy: app_ref(&v["policy"])?.to_owned(),
        environment: v
            .get("environment")
            .map(|value| app_id(value).map(str::to_owned))
            .transpose()?,
        value: app_json(input)?,
    })
}

fn parse_verdict(input: &Value) -> Result<()> {
    let verdict = object(input).map_err(|_| fail("Invalid evaluation verdict"))?;
    match verdict["status"].as_str() {
        Some("accepted") => {
            crate::contract::keys(input, &["status", "selectedManifest"])
                .map_err(|_| fail("Invalid evaluation verdict"))?;
            app_ref(&verdict["selectedManifest"])?;
        }
        Some("rejected") | Some("incomplete") => {
            crate::contract::keys(input, &["status", "reasons"])
                .map_err(|_| fail("Invalid evaluation verdict"))?;
            for reason in crate::contract::list(&verdict["reasons"], 16)
                .map_err(|_| fail("Invalid evaluation verdict"))?
            {
                bounded_text(reason, 256)?;
            }
        }
        _ => return Err(fail("Invalid evaluation verdict")),
    }
    Ok(())
}

pub fn parse_evaluation(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "request",
            "parentState",
            "candidateRevision",
            "cases",
            "scorer",
            "policy",
            "foundryReport",
            "compatibility",
            "verdict",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-evaluation.v1")?;
    app_ref(&v["request"])?;
    app_ref(&v["parentState"])?;
    app_ref(&v["candidateRevision"])?;
    app_ref(&v["cases"])?;
    app_ref(&v["scorer"])?;
    app_ref(&v["policy"])?;
    app_ref(&v["foundryReport"])?;
    app_ref(&v["compatibility"])?;
    parse_verdict(&v["verdict"])?;
    app_json(input)
}

pub struct LoadedRevision {
    pub revision: Revision,
    pub manifests: BTreeMap<String, Manifest>,
}

/// Load a revision with every record it references — the evaluation contract
/// rejects revisions whose memory schema, query bundle, entrypoint manifests
/// or policy cannot be read back intact.
pub(crate) fn load_revision(store: &Store, reference: &str) -> Result<LoadedRevision> {
    let revision = parse_revision(&get_record(store, reference)?)?;
    let schema = parse_schema(&get_record(store, &revision.schema)?)?;
    let queries = parse_queries(&get_record(store, &revision.queries)?)?;
    for query_ref in &queries.queries {
        let query = parse_query(&get_record(store, query_ref)?)?;
        if query.schema != revision.schema {
            return Err(fail("Memory query schema does not match revision schema"));
        }
        let program = get_record(store, &query.program)?;
        if object(&program)?["contract"] != "algal.query.v1" {
            return Err(fail("Memory query program has wrong kind"));
        }
    }
    let mut manifests = BTreeMap::new();
    for entrypoint in &revision.entrypoints {
        if !queries.queries.contains(&entrypoint.applicability) {
            return Err(fail("Entrypoint applicability is not in the query bundle"));
        }
        let query = parse_query(&get_record(store, &entrypoint.applicability)?)?;
        if query.schema != revision.schema {
            return Err(fail("Entrypoint applicability schema mismatch"));
        }
        let manifest = store
            .get("manifests", &entrypoint.manifest)?
            .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?;
        manifests.insert(entrypoint.name.clone(), Manifest::parse(&manifest)?);
    }
    get_record(store, &revision.views)?;
    get_record(store, &revision.runtime_profile)?;
    parse_evaluation_policy(&get_record(store, &revision.evaluation_policy)?)?;
    if schema.relations.is_empty() {
        return Err(fail("Empty memory schema"));
    }
    Ok(LoadedRevision {
        revision,
        manifests,
    })
}

/// Case-pure admission: only input/const/fn/expr cells may run during
/// evaluation. The native fn registry is the builtin one by construction —
/// there is no injectable registry to check against.
pub(crate) fn pure_manifest(manifest: &Manifest) -> Result<()> {
    for cell in &manifest.cells {
        match cell["kind"].as_str() {
            Some("input" | "const" | "fn" | "expr") => (),
            _ => {
                return Err(fail(&format!(
                    "Case-pure evaluation rejects {} cells",
                    cell["kind"].as_str().unwrap_or("unknown")
                )));
            }
        }
    }
    Ok(())
}

/// Only evaluation opts into local static composition. Proposal generation
/// and old policies keep the original flat rule so their evidence replays.
/// Compile first with no transports or tools: its occurrence/depth/byte
/// bounds limit this complete walk, including inactive descendants.
fn evaluation_manifest(manifest: &Manifest, store: &Store, policy: &Value) -> Result<()> {
    if policy.get("composition").is_none() {
        return pure_manifest(manifest);
    }
    let compiled = compile(
        manifest.clone(),
        &mut store.overlay(),
        &Default::default(),
        &Transports::new(),
        0,
    )?;
    let mut pending: Vec<&Compiled> = vec![&compiled];
    while let Some(current) = pending.pop() {
        for cell in &current.manifest.cells {
            match cell["kind"].as_str() {
                Some("organism" | "each" | "repeat") => {
                    if cell.get("via").is_some() {
                        return Err(fail("Case-pure evaluation rejects transport references"));
                    }
                }
                Some("input" | "const" | "fn" | "expr") => (),
                _ => {
                    return Err(fail(&format!(
                        "Case-pure evaluation rejects {} cells",
                        cell["kind"].as_str().unwrap_or("unknown")
                    )));
                }
            }
        }
        pending.extend(current.children.values());
    }
    Ok(())
}

fn entrypoint<'a>(
    revision: &'a Revision,
    name: &str,
) -> Result<&'a crate::application::Entrypoint> {
    revision
        .entrypoints
        .iter()
        .find(|item| item.name == name)
        .ok_or_else(|| fail(&format!("Unknown application entrypoint {name}")))
}

fn check_compatibility_loaded(
    store: &Store,
    previous: &LoadedRevision,
    candidate: &LoadedRevision,
) -> Result<Value> {
    let mut reasons: Vec<String> = Vec::new();
    if previous.revision.application != candidate.revision.application {
        reasons.push("application-identity".to_owned());
    }
    for (label, a, b) in [
        (
            "schema",
            &previous.revision.schema,
            &candidate.revision.schema,
        ),
        (
            "queries",
            &previous.revision.queries,
            &candidate.revision.queries,
        ),
        ("views", &previous.revision.views, &candidate.revision.views),
        (
            "runtimeProfile",
            &previous.revision.runtime_profile,
            &candidate.revision.runtime_profile,
        ),
        (
            "evaluationPolicy",
            &previous.revision.evaluation_policy,
            &candidate.revision.evaluation_policy,
        ),
    ] {
        if a != b {
            reasons.push(format!("changed-{label}"));
        }
    }
    let previous_caps: BTreeSet<&String> =
        previous.revision.capability_requirements.iter().collect();
    if candidate
        .revision
        .capability_requirements
        .iter()
        .any(|capability| !previous_caps.contains(capability))
    {
        reasons.push("capability-expansion".to_owned());
    }
    let old_names: Vec<&str> = previous
        .revision
        .entrypoints
        .iter()
        .map(|e| e.name.as_str())
        .collect();
    let new_names: Vec<&str> = candidate
        .revision
        .entrypoints
        .iter()
        .map(|e| e.name.as_str())
        .collect();
    if !same(&json!(old_names), &json!(new_names))? {
        reasons.push("entrypoint-set".to_owned());
    }
    for name in &old_names {
        let old_entry = entrypoint(&previous.revision, name)?;
        let Some(new_entry) = candidate
            .revision
            .entrypoints
            .iter()
            .find(|entry| entry.name == *name)
        else {
            continue;
        };
        if old_entry.max_generations != new_entry.max_generations {
            reasons.push(format!("changed-{name}-budget"));
        }
        if new_entry
            .capabilities
            .iter()
            .any(|cap| !old_entry.capabilities.contains(cap))
        {
            reasons.push(format!("changed-{name}-capabilities"));
        }
        if new_entry.applicability != old_entry.applicability
            || new_entry.queries != old_entry.queries
        {
            reasons.push(format!("changed-{name}-memory-view"));
        }
        let old_manifest = previous.manifests.get(*name);
        let new_manifest = candidate.manifests.get(*name);
        let same_interface = match (old_manifest, new_manifest) {
            (Some(old), Some(new)) => same(
                old.value.get("interface").unwrap_or(&Value::Null),
                new.value.get("interface").unwrap_or(&Value::Null),
            )?,
            _ => false,
        };
        if !same_interface {
            reasons.push(format!("changed-{name}-interface"));
        } else if let (Some(old), Some(new)) = (old_manifest, new_manifest)
            && old.value.get("interface").is_some()
            && new.value.get("interface").is_some()
        {
            let mut overlay = store.overlay();
            let old = interface_signature(&compile(
                old.clone(),
                &mut overlay,
                &Default::default(),
                &Transports::new(),
                0,
            )?)?;
            let new = interface_signature(&compile(
                new.clone(),
                &mut overlay,
                &Default::default(),
                &Transports::new(),
                0,
            )?)?;
            if old.inputs != new.inputs || old.outputs != new.outputs {
                reasons.push(format!("changed-{name}-interface-types"));
            }
        }
    }
    Ok(json!({
        "contract": "algal.application-compatibility.v1",
        "previousRevision": digest(&previous.revision.value)?,
        "candidateRevision": digest(&candidate.revision.value)?,
        "status": if reasons.is_empty() { "compatible" } else { "incompatible" },
        "reasons": reasons,
    }))
}

/// `checkApplicationCompatibility` in src/application-adaptation.ts.
pub fn check_application_compatibility(
    store: &Store,
    previous_revision: &str,
    candidate_revision: &str,
) -> Result<Value> {
    let previous_ref = json!(previous_revision);
    let candidate_ref = json!(candidate_revision);
    let previous = load_revision(store, app_ref(&previous_ref)?)?;
    let candidate = load_revision(store, app_ref(&candidate_ref)?)?;
    check_compatibility_loaded(store, &previous, &candidate)
}

/// Every reported case must bind a frozen case, and every frozen case must
/// appear exactly once per population — a duplicated passing receipt cannot
/// stand in for an omitted failing one.
fn report_cases(
    report: &Value,
    cases: &[foundry::FoundryCase],
    incumbent: &str,
    candidate: &str,
    store: &Store,
) -> Result<()> {
    let frozen: BTreeMap<&str, &foundry::FoundryCase> =
        cases.iter().map(|c| (c.id.as_str(), c)).collect();
    let candidates = report["candidates"].as_array().cloned().unwrap_or_default();
    let candidate_result = candidates
        .iter()
        .find(|c| c["manifestDigest"].as_str() == Some(candidate));
    let incumbent_result = candidates
        .iter()
        .find(|c| c["manifestDigest"].as_str() == Some(incumbent));
    if candidate_result.is_none() || incumbent_result.is_none() || candidates.len() != 2 {
        return Err(fail(
            "Foundry report population is not exactly incumbent/candidate",
        ));
    }
    let candidate_result = candidate_result.unwrap();
    let incumbent_result = incumbent_result.unwrap();
    let holdout_cases = report["holdout"]["cases"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let mut all: Vec<&Value> = Vec::new();
    for result in &candidates {
        all.extend(result["cases"].as_array().into_iter().flatten());
    }
    all.extend(holdout_cases.iter());
    if all.len() > 256 {
        return Err(fail("Foundry evidence exceeds case bound"));
    }
    for result in &all {
        let id = result["id"].as_str().unwrap_or("");
        let expected = frozen
            .get(id)
            .ok_or_else(|| fail(&format!("Foundry case {id} differs from frozen case set")))?;
        if expected.split != result["split"].as_str().unwrap_or("")
            || !same(&expected.args, &result["args"])?
            || !same(&expected.expect, &result["expect"])?
        {
            return Err(fail(&format!(
                "Foundry case {id} differs from frozen case set"
            )));
        }
    }
    let exact_case_ids =
        |actual: &[Value], expected: &[&foundry::FoundryCase], label: &str| -> Result<()> {
            let mut actual_ids: Vec<&str> = actual
                .iter()
                .map(|c| c["id"].as_str().unwrap_or(""))
                .collect();
            let mut expected_ids: Vec<&str> = expected.iter().map(|c| c.id.as_str()).collect();
            if actual_ids.len() != expected_ids.len()
                || actual_ids.iter().collect::<BTreeSet<_>>().len() != actual_ids.len()
            {
                return Err(fail(&format!(
                    "{label} case population differs from frozen case set"
                )));
            }
            actual_ids.sort();
            expected_ids.sort();
            if actual_ids != expected_ids {
                return Err(fail(&format!(
                    "{label} case population differs from frozen case set"
                )));
            }
            Ok(())
        };
    let selection: Vec<&foundry::FoundryCase> =
        cases.iter().filter(|c| c.split != "holdout").collect();
    let holdout: Vec<&foundry::FoundryCase> =
        cases.iter().filter(|c| c.split == "holdout").collect();
    exact_case_ids(
        candidate_result["cases"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or(&[]),
        &selection,
        "Candidate",
    )?;
    exact_case_ids(
        incumbent_result["cases"]
            .as_array()
            .map(Vec::as_slice)
            .unwrap_or(&[]),
        &selection,
        "Incumbent",
    )?;
    exact_case_ids(&holdout_cases, &holdout, "Holdout")?;
    let verify_receipt_args = |result_case: &Value, manifest_digest: &str| -> Result<()> {
        let manifest_value = store
            .get("manifests", manifest_digest)?
            .ok_or_else(|| fail("Foundry candidate manifest interface missing"))?;
        let manifest = Manifest::parse(&manifest_value)?;
        let inputs = object(&manifest.value["interface"]["inputs"])
            .map_err(|_| fail("Foundry candidate manifest interface missing"))?;
        let mut args = Map::new();
        let id = result_case["id"].as_str().unwrap_or("");
        for (name, value) in object(&frozen[id].args)? {
            let target = object(&inputs[name.as_str()]).map_err(|_| {
                fail(&format!(
                    "Frozen case input {name} is not in candidate interface"
                ))
            })?;
            args.entry(target["cell"].as_str().unwrap_or("").to_owned())
                .or_insert_with(|| json!({}))[target["port"].as_str().unwrap_or("")] =
                value.clone();
        }
        let receipt = store
            .get("runs", result_case["receiptDigest"].as_str().unwrap_or(""))?
            .ok_or_else(|| fail("Foundry receipt missing during binding verification"))?;
        if receipt["contract"] != "algal.run.v1" || !same(&receipt["args"], &Value::Object(args))? {
            return Err(fail(&format!("Foundry receipt args differ for case {id}")));
        }
        Ok(())
    };
    for result in [incumbent_result, candidate_result] {
        let result_cases = result["cases"].as_array().cloned().unwrap_or_default();
        if result_cases.iter().any(|c| {
            c["split"].as_str() == Some("holdout")
                || !selection
                    .iter()
                    .any(|f| f.id.as_str() == c["id"].as_str().unwrap_or(""))
        }) {
            return Err(fail(
                "Foundry candidate case population differs from frozen selection",
            ));
        }
        for result_case in &result_cases {
            verify_receipt_args(result_case, result["manifestDigest"].as_str().unwrap_or(""))?;
        }
    }
    if holdout_cases.iter().any(|c| {
        c["split"].as_str() != Some("holdout")
            || !holdout
                .iter()
                .any(|f| f.id.as_str() == c["id"].as_str().unwrap_or(""))
    }) {
        return Err(fail("Foundry holdout differs from frozen holdout"));
    }
    // Holdout receipts are execution evidence too. Bind their actual input to
    // the frozen case, using the manifest the foundry selected for holdout.
    for result_case in &holdout_cases {
        verify_receipt_args(result_case, report["promoted"].as_str().unwrap_or(""))?;
    }
    Ok(())
}

/// `acceptance` in src/application-adaptation.ts — the deterministic verdict
/// recomputed identically at verify time.
fn acceptance(
    report: &Value,
    incumbent: &str,
    candidate: &str,
    policy: &Value,
    compatibility: &Value,
) -> Result<Value> {
    if compatibility["status"].as_str() != Some("compatible") {
        let mut reasons = vec![json!("incompatible")];
        reasons.extend(
            compatibility["reasons"]
                .as_array()
                .cloned()
                .unwrap_or_default(),
        );
        return Ok(json!({"status":"rejected","reasons":reasons}));
    }
    let candidates = report["candidates"].as_array().cloned().unwrap_or_default();
    let old = candidates
        .iter()
        .find(|c| c["manifestDigest"].as_str() == Some(incumbent));
    let next = candidates
        .iter()
        .find(|c| c["manifestDigest"].as_str() == Some(candidate));
    if old.is_none() || next.is_none() || report["promoted"].as_str() != Some(candidate) {
        return Ok(json!({"status":"rejected","reasons":["selected-candidate-mismatch"]}));
    }
    let old = old.unwrap();
    let next = next.unwrap();
    let mut reasons: Vec<String> = Vec::new();
    let passed = |score: &Value| score["passed"].as_u64().unwrap_or(0);
    let total = |score: &Value| score["total"].as_u64().unwrap_or(0);
    if passed(&next["validation"]) <= passed(&old["validation"]) {
        reasons.push("no-improvement".to_owned());
    }
    let next_cases = next["cases"].as_array().cloned().unwrap_or_default();
    let old_cases = old["cases"].as_array().cloned().unwrap_or_default();
    if next_cases.iter().any(|c| {
        c["split"].as_str() == Some("validation")
            && c["passed"] != true
            && old_cases
                .iter()
                .any(|o| o["id"] == c["id"] && o["passed"] == true)
    }) {
        reasons.push("regression".to_owned());
    }
    let holdout = &report["holdout"];
    if policy["requireHoldoutPass"] == true
        && (total(holdout) == 0 || passed(holdout) != total(holdout))
    {
        reasons.push("holdout-failed".to_owned());
    }
    let holdout_cases = holdout["cases"].as_array().cloned().unwrap_or_default();
    if next_cases
        .iter()
        .chain(&holdout_cases)
        .any(|c| c["outcome"].as_str() != Some("complete"))
    {
        reasons.push("incomplete-evaluation".to_owned());
    }
    let all: Vec<&Value> = candidates
        .iter()
        .flat_map(|c| c["cases"].as_array().into_iter().flatten())
        .chain(holdout_cases.iter())
        .collect();
    if all
        .iter()
        .map(|c| c["work"]["units"].as_u64().unwrap_or(0))
        .sum::<u64>()
        > policy["maxWork"].as_u64().unwrap_or(0)
    {
        reasons.push("budget-exhausted".to_owned());
    }
    if all
        .iter()
        .map(|c| c["work"]["agentCalls"].as_u64().unwrap_or(0))
        .sum::<u64>()
        > policy["maxModelCalls"].as_u64().unwrap_or(0)
    {
        reasons.push("budget-exhausted".to_owned());
    }
    if passed(&next["validation"]) == 0 || total(&old["validation"]) != total(&next["validation"]) {
        reasons.push("insufficient-quality".to_owned());
    }
    if reasons.is_empty() {
        Ok(json!({"status":"accepted","selectedManifest":candidate}))
    } else {
        Ok(json!({"status":"rejected","reasons":reasons}))
    }
}

fn verify_binding(
    store: &Store,
    request: &EvaluationRequest,
    state: &Value,
    report: &Value,
    cases: &[foundry::FoundryCase],
    candidate: &LoadedRevision,
    incumbent: &LoadedRevision,
) -> Result<()> {
    if state["application"].as_str() != Some(candidate.revision.application.as_str())
        || candidate.revision.parent.as_deref() != state["revision"].as_str()
    {
        return Err(fail("Parent state does not bind candidate revision"));
    }
    let old_entry = entrypoint(&incumbent.revision, &request.entrypoint)?;
    let new_entry = entrypoint(&candidate.revision, &request.entrypoint)?;
    let policy = parse_evaluation_policy(&get_record(store, &request.policy)?)?;
    evaluation_manifest(
        incumbent
            .manifests
            .get(&request.entrypoint)
            .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?,
        store,
        &policy,
    )?;
    evaluation_manifest(
        candidate
            .manifests
            .get(&request.entrypoint)
            .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?,
        store,
        &policy,
    )?;
    let candidates = report["candidates"].as_array().cloned().unwrap_or_default();
    if !candidates
        .iter()
        .any(|c| c["manifestDigest"].as_str() == Some(old_entry.manifest.as_str()))
        || !candidates
            .iter()
            .any(|c| c["manifestDigest"].as_str() == Some(new_entry.manifest.as_str()))
    {
        return Err(fail(
            "Foundry report population is not the bound incumbent/candidate",
        ));
    }
    report_cases(
        report,
        cases,
        &old_entry.manifest,
        &new_entry.manifest,
        store,
    )
}

/// `evaluateApplicationRevision` — run the frozen case set through the
/// foundry for incumbent and candidate entrypoint manifests, verify the
/// evidence, then store the compatibility, report and evaluation records.
/// Returns the stored evaluation digest and record.
pub async fn evaluate_application_revision(
    store: &mut Store,
    input: &Value,
    host: &mut Host,
    transports: &Transports,
) -> Result<(String, Value)> {
    evaluate_application_revision_in(store, input, host, transports, None).await
}

/// `evaluateApplicationRevision` with an `experiment` habitat account the
/// host supplies. Every incumbent, candidate, and holdout run is reserved
/// and charged there; a refused reservation stops the evaluation with
/// `BUDGET_EXHAUSTED` before its report or evaluation record is stored. The
/// evaluation, its foundry report, and their digests are the same with or
/// without an account.
pub async fn evaluate_application_revision_in(
    store: &mut Store,
    input: &Value,
    host: &mut Host,
    transports: &Transports,
    account: Option<&mut habitat_budget::Account>,
) -> Result<(String, Value)> {
    if account
        .as_deref()
        .is_some_and(|account| account.activity() != "experiment")
    {
        return Err(fail(
            "An application evaluation charges an experiment habitat account",
        ));
    }
    let request = parse_evaluation_request(input)?;
    let request_ref = put_record(store, &request.value)?;
    let state = parse_state(&get_record(store, &request.parent_state)?)?;
    let candidate = load_revision(store, &request.candidate_revision)?;
    let incumbent = load_revision(store, &state.revision)?;
    if candidate.revision.parent.as_deref() != Some(state.revision.as_str()) {
        return Err(fail(
            "Candidate revision parent is not the application state revision",
        ));
    }
    if request.policy != candidate.revision.evaluation_policy {
        return Err(fail("Evaluation policy is not bound to candidate revision"));
    }
    let policy = parse_evaluation_policy(&get_record(store, &request.policy)?)?;
    let cases = parse_evaluation_cases(&get_record(store, &request.cases)?)?;
    let scorer = parse_evaluation_scorer(&get_record(store, &request.scorer)?)?;
    if cases.len() as u64 > policy["maxCases"].as_u64().unwrap_or(0) {
        return Err(fail("Evaluation case set exceeds policy bound"));
    }
    let old = entrypoint(&incumbent.revision, &request.entrypoint)?;
    let next = entrypoint(&candidate.revision, &request.entrypoint)?;
    let old_manifest = incumbent
        .manifests
        .get(&request.entrypoint)
        .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?;
    let next_manifest = candidate
        .manifests
        .get(&request.entrypoint)
        .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?;
    evaluation_manifest(old_manifest, store, &policy)?;
    evaluation_manifest(next_manifest, store, &policy)?;
    // An experiment's account is charged for every run but never embedded,
    // so the report keeps the bytes an uncharged evaluation writes.
    let report = foundry::run_within(
        &[old_manifest.clone(), next_manifest.clone()],
        &cases,
        scorer.as_ref(),
        None,
        store,
        host,
        transports,
        account,
    )
    .await?;
    let verified = foundry::verify(&report, store, host).await?;
    if verified["ok"] != true {
        return Err(fail(&format!(
            "Foundry report failed verification: {}",
            verified["mismatches"]
                .as_array()
                .map(|m| {
                    m.iter()
                        .map(|x| x.as_str().unwrap_or("").to_owned())
                        .collect::<Vec<_>>()
                        .join("; ")
                })
                .unwrap_or_default()
        )));
    }
    verify_binding(
        store,
        &request,
        &state.value,
        &report,
        &cases,
        &candidate,
        &incumbent,
    )?;
    let compatibility = check_compatibility_loaded(store, &incumbent, &candidate)?;
    let compatibility_ref = put_record(store, &compatibility)?;
    let foundry_report_ref = put_record(store, &report)?;
    let verdict = acceptance(
        &report,
        &old.manifest,
        &next.manifest,
        &policy,
        &compatibility,
    )?;
    let evaluation = json!({
        "contract": "algal.application-evaluation.v1",
        "request": request_ref,
        "parentState": request.parent_state,
        "candidateRevision": request.candidate_revision,
        "cases": request.cases,
        "scorer": request.scorer,
        "policy": request.policy,
        "foundryReport": foundry_report_ref,
        "compatibility": compatibility_ref,
        "verdict": verdict,
    });
    let evaluation_ref = put_record(store, &evaluation)?;
    Ok((evaluation_ref, evaluation))
}

/// `verifyApplicationEvaluation` — replay every binding before trusting a
/// stored evaluation record.
pub async fn verify_application_evaluation(
    store: &Store,
    evaluation_ref: &str,
    expected_state_ref: &str,
    host: &Host,
) -> Result<Value> {
    let evaluation = parse_evaluation(&get_record(store, evaluation_ref)?)?;
    let request = parse_evaluation_request(&get_record(
        store,
        evaluation["request"].as_str().unwrap_or(""),
    )?)?;
    if digest(&request.value)? != evaluation["request"].as_str().unwrap_or("")
        || evaluation["parentState"].as_str() != Some(request.parent_state.as_str())
        || evaluation["candidateRevision"].as_str() != Some(request.candidate_revision.as_str())
        || evaluation["cases"].as_str() != Some(request.cases.as_str())
        || evaluation["scorer"].as_str() != Some(request.scorer.as_str())
        || evaluation["policy"].as_str() != Some(request.policy.as_str())
    {
        return Err(fail("Evaluation fields are not bound to its request"));
    }
    if request.parent_state != expected_state_ref
        || evaluation["parentState"].as_str() != Some(expected_state_ref)
    {
        return Err(fail("Evaluation parent state is stale"));
    }
    let state = parse_state(&get_record(store, expected_state_ref)?)?;
    let candidate = load_revision(store, &request.candidate_revision)?;
    let incumbent = load_revision(store, &state.revision)?;
    if request.policy != candidate.revision.evaluation_policy {
        return Err(fail("Evaluation policy is not bound to candidate revision"));
    }
    let policy = parse_evaluation_policy(&get_record(store, &request.policy)?)?;
    evaluation_manifest(
        incumbent
            .manifests
            .get(&request.entrypoint)
            .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?,
        store,
        &policy,
    )?;
    evaluation_manifest(
        candidate
            .manifests
            .get(&request.entrypoint)
            .ok_or_else(|| fail("Entrypoint manifest is missing or wrong-kind"))?,
        store,
        &policy,
    )?;
    let cases = parse_evaluation_cases(&get_record(store, &request.cases)?)?;
    let scorer = parse_evaluation_scorer(&get_record(store, &request.scorer)?)?;
    let report = get_record(store, evaluation["foundryReport"].as_str().unwrap_or(""))?;
    let verified = foundry::verify(&report, store, host).await?;
    if verified["ok"] != true {
        return Err(fail(&format!(
            "Foundry evidence is invalid: {}",
            verified["mismatches"]
                .as_array()
                .map(|m| {
                    m.iter()
                        .map(|x| x.as_str().unwrap_or("").to_owned())
                        .collect::<Vec<_>>()
                        .join("; ")
                })
                .unwrap_or_default()
        )));
    }
    if !same(
        report.get("scorer").unwrap_or(&Value::Null),
        &scorer.clone().unwrap_or(Value::Null),
    )? {
        return Err(fail(
            "Foundry scorer is not bound to the evaluation request",
        ));
    }
    verify_binding(
        store,
        &request,
        &state.value,
        &report,
        &cases,
        &candidate,
        &incumbent,
    )?;
    let compatibility = check_compatibility_loaded(store, &incumbent, &candidate)?;
    let stored = get_record(store, evaluation["compatibility"].as_str().unwrap_or(""))?;
    if !same(&stored, &compatibility)? {
        return Err(fail("Stored compatibility evidence changed"));
    }
    let old = entrypoint(&incumbent.revision, &request.entrypoint)?;
    let next = entrypoint(&candidate.revision, &request.entrypoint)?;
    let verdict = acceptance(
        &report,
        &old.manifest,
        &next.manifest,
        &policy,
        &compatibility,
    )?;
    if !same(&evaluation["verdict"], &verdict)? {
        return Err(fail("Stored acceptance is not reproducible"));
    }
    Ok(evaluation)
}

/// `admitApplicationActivation` — the lifecycle caller's CAS boundary: an
/// activation may commit only with a reproducibly accepted evaluation that
/// names the exact candidate revision being activated.
pub async fn admit_application_activation(
    store: &Store,
    input: &Value,
    host: &Host,
) -> Result<Value> {
    let v = app_object(input, &["evaluation", "expectedState", "revision"])?;
    let evaluation = app_ref(&v["evaluation"])?.to_owned();
    let expected_state = app_ref(&v["expectedState"])?.to_owned();
    let revision = app_ref(&v["revision"])?.to_owned();
    let checked = verify_application_evaluation(store, &evaluation, &expected_state, host).await?;
    if checked["verdict"]["status"] != "accepted"
        || checked["candidateRevision"].as_str() != Some(revision.as_str())
    {
        return Err(fail(
            "Activation requires a reproducibly accepted candidate revision",
        ));
    }
    Ok(json!({
        "evaluation": checked,
        "revision": revision,
        "state": expected_state,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canonical::digest;
    use tempfile::tempdir;

    fn hashed(value: &Value) -> String {
        digest(&app_json(value).unwrap()).unwrap()
    }

    fn put(store: &mut Store, value: Value) -> String {
        store.put("values", &app_json(&value).unwrap()).unwrap()
    }

    fn expr_manifest(key: &str, program: Value) -> Value {
        json!({
            "contract": "algal.organism.v1", "key": key, "name": key,
            "interface": {
                "inputs": {"q": {"cell": "src", "port": "value"}},
                "outputs": {"answer": {"cell": "out", "port": "out"}},
            },
            "cells": [
                {"id": "src", "kind": "input", "outputs": {"value": "json"}},
                {"id": "out", "kind": "expr", "inputs": {"value": "json"},
                    "expr": {"contract": "algal.expr.v1", "program": program},
                    "output": {"kind": "json", "schema": {"type": "string"}}},
            ],
            "edges": [{"from": {"cell": "src", "port": "value"}, "to": {"cell": "out", "port": "value"}}],
        })
    }

    struct Fixture {
        state: String,
        incumbent: String,
        candidate: String,
        revision1: String,
        revision2: String,
        cases: String,
        scorer: String,
        policy: String,
    }

    fn seed(store: &mut Store, candidate_program: Value) -> Fixture {
        seed_manifest(
            store,
            expr_manifest("organism:candidate", candidate_program),
            false,
        )
    }

    fn seed_manifest(store: &mut Store, candidate_value: Value, composition: bool) -> Fixture {
        let incumbent = store
            .put(
                "manifests",
                &Manifest::parse(&expr_manifest("organism:incumbent", json!("ok")))
                    .unwrap()
                    .value,
            )
            .unwrap();
        let candidate = store
            .put(
                "manifests",
                &Manifest::parse(&candidate_value).unwrap().value,
            )
            .unwrap();
        let schema = put(
            store,
            json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"available","arity":1}]}),
        );
        let program = put(
            store,
            json!({"contract":"algal.query.v1","rules":[],"query":{"relation":"available","terms":[{"var":"x"},{"var":"polarity"}]},"limits":{"maxWork":50000,"maxRounds":32,"maxDerived":128,"maxBindings":128,"maxRows":16,"maxOutputBytes":262144}}),
        );
        let query = put(
            store,
            json!({"contract":"algal.application-memory-query.v1","id":"available","schema":schema,"program":program,"procedures":[],"polarityColumn":1,"conflict":"single-value"}),
        );
        let queries = put(
            store,
            json!({"contract":"algal.application-memory-queries.v1","queries":[query]}),
        );
        let views = put(store, json!({"contract":"algal.test-views.v1"}));
        let runtime = put(store, json!({"contract":"algal.test-runtime.v1"}));
        let mut policy_value = json!({"contract":"algal.application-evaluation-policy.v1","maxCases":8,"maxWork":1000000,"maxModelCalls":0,"requireHoldoutPass":true,"strictValidationImprovement":true});
        if composition {
            policy_value["composition"] = json!("closed-pure-v1");
        }
        let policy = put(store, policy_value);
        let entrypoint = |manifest: &str| json!({"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]});
        let revision1 = put(
            store,
            json!({"contract":"algal.application-revision.v1","application":"parity","parent":null,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[entrypoint(&incumbent)]}),
        );
        let revision2 = put(
            store,
            json!({"contract":"algal.application-revision.v1","application":"parity","parent":revision1,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[entrypoint(&candidate)]}),
        );
        let state = put(
            store,
            json!({"contract":"algal.application-state.v1","application":"parity","sequence":0,"epoch":0,"revision":revision1,"memory":hashed(&json!("memory")),"previous":null,"transition":hashed(&json!("transition"))}),
        );
        let cases = put(
            store,
            json!({"contract":"algal.application-evaluation-cases.v1","cases":[
                {"id":"train-ok","split":"train","args":{"q":"t1"},"expect":{"answer":"ok"}},
                {"id":"val-ok","split":"validation","args":{"q":"v1"},"expect":{"answer":"ok"}},
                {"id":"val-fixed","split":"validation","args":{"q":"v2"},"expect":{"answer":"v2-ok"}},
                {"id":"hold-fixed","split":"holdout","args":{"q":"h1"},"expect":{"answer":"h1-ok"}},
            ]}),
        );
        let scorer = put(
            store,
            json!({"contract":"algal.application-evaluation-scorer.v1","scorer":null}),
        );
        Fixture {
            state,
            incumbent,
            candidate,
            revision1,
            revision2,
            cases,
            scorer,
            policy,
        }
    }

    fn request(fixture: &Fixture) -> Value {
        json!({
            "contract": "algal.application-evaluation-request.v1",
            "parentState": fixture.state, "candidateRevision": fixture.revision2,
            "entrypoint": "run", "cases": fixture.cases,
            "scorer": fixture.scorer, "policy": fixture.policy,
        })
    }

    fn composed(store: &mut Store, child: Manifest, kind: &str, key: &str) -> Manifest {
        let child_ref = store.put("manifests", &child.value).unwrap();
        let mut cells = vec![json!({"id":"src","kind":"input","outputs":{"value":"json"}})];
        let mut edges = Vec::new();
        if kind == "each" {
            cells.push(json!({"id":"list","kind":"expr","inputs":{"value":"json"},"expr":{"contract":"algal.expr.v1","program":["list",["get","value"]]},"output":{"kind":"json","schema":{"type":"array"}}}));
            edges.push(
                json!({"from":{"cell":"src","port":"value"},"to":{"cell":"list","port":"value"}}),
            );
        }
        let mut invocation = json!({"id":"child","kind":kind,"manifest":child_ref});
        if kind == "each" {
            invocation["over"] = json!("q");
            invocation["maxItems"] = json!(2);
        } else if kind == "repeat" {
            invocation["maxRounds"] = json!(2);
            invocation["carry"] = json!({"answer":"q"});
        }
        cells.push(invocation);
        let program = if kind == "each" {
            json!(["nth", ["get", "value"], 0])
        } else {
            json!(["get", "value"])
        };
        cells.push(json!({"id":"out","kind":"expr","inputs":{"value":"json"},"expr":{"contract":"algal.expr.v1","program":program},"output":{"kind":"json","schema":{"type":"string"}}}));
        edges.push(json!({"from":{"cell":if kind == "each" {"list"} else {"src"},"port":if kind == "each" {"out"} else {"value"}},"to":{"cell":"child","port":"q"}}));
        edges.push(
            json!({"from":{"cell":"child","port":"answer"},"to":{"cell":"out","port":"value"}}),
        );
        Manifest::parse(&json!({"contract":"algal.organism.v1","key":key,"name":key,"interface":{"inputs":{"q":{"cell":"src","port":"value"}},"outputs":{"answer":{"cell":"out","port":"out"}}},"cells":cells,"edges":edges})).unwrap()
    }

    fn nested(store: &mut Store, leaf: Manifest) -> Manifest {
        let each = composed(store, leaf, "each", "organism:pure-each");
        let repeat = composed(store, each, "repeat", "organism:pure-repeat");
        composed(store, repeat, "organism", "organism:pure-nested")
    }

    #[test]
    fn composition_policy_is_exact_and_legacy_bytes_are_unchanged() {
        let original = json!({"contract":"algal.application-evaluation-policy.v1","maxCases":8,"maxWork":1000000,"maxModelCalls":0,"requireHoldoutPass":true,"strictValidationImprovement":true});
        assert_eq!(
            canonical(&parse_evaluation_policy(&original).unwrap()).unwrap(),
            canonical(&original).unwrap()
        );
        let mut policy = original.clone();
        policy["composition"] = json!("closed-pure-v1");
        assert_eq!(parse_evaluation_policy(&policy).unwrap(), policy);
        policy["research"] = json!(hashed(&json!("research")));
        assert_eq!(parse_evaluation_policy(&policy).unwrap(), policy);
        for invalid in [
            Value::Null,
            json!(false),
            json!(1),
            json!(""),
            json!("closed-pure-v2"),
            json!({}),
        ] {
            policy["composition"] = invalid;
            assert!(parse_evaluation_policy(&policy).is_err());
        }
        policy["composition"] = json!("closed-pure-v1");
        policy["extra"] = json!(true);
        assert!(parse_evaluation_policy(&policy).is_err());
    }

    #[tokio::test]
    async fn closed_pure_composition_evaluates_replays_and_activates() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let program = json!([
            "if",
            ["eq", ["get", "value"], "v2"],
            "v2-ok",
            [
                "if",
                ["eq", ["get", "value"], "h1"],
                "h1-ok",
                ["get", "value"]
            ]
        ]);
        // Repetition preserves the already transformed result. Other cases
        // normalize to "ok" before reaching this reusable nested program.
        let leaf = Manifest::parse(&expr_manifest("organism:composed-leaf", program)).unwrap();
        let candidate = nested(&mut store, leaf);
        let fixture = seed_manifest(&mut store, candidate.value.clone(), true);
        let cases = get_record(&store, &fixture.cases).unwrap();
        let mut cases = cases.clone();
        cases["cases"][0]["args"]["q"] = json!("ok");
        cases["cases"][1]["args"]["q"] = json!("ok");
        let mut input = request(&fixture);
        input["cases"] = json!(put(&mut store, cases));
        let (reference, evaluation) = evaluate_application_revision(
            &mut store,
            &input,
            &mut Host::default(),
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(evaluation["verdict"]["status"], "accepted");
        assert_eq!(
            verify_application_evaluation(&store, &reference, &fixture.state, &Host::default())
                .await
                .unwrap(),
            evaluation
        );
        let admitted = admit_application_activation(&store, &json!({"evaluation":reference,"expectedState":fixture.state,"revision":fixture.revision2}), &Host::default()).await.unwrap();
        assert_eq!(admitted["revision"], fixture.revision2);
        assert!(pure_manifest(&candidate).is_err());
        let legacy = seed_manifest(&mut store, candidate.value, false);
        assert!(
            evaluate_application_revision(
                &mut store,
                &request(&legacy),
                &mut Host::default(),
                &Transports::new()
            )
            .await
            .is_err()
        );
    }

    #[test]
    fn closed_pure_composition_rejects_effects_transports_and_missing_children() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let policy = json!({"composition":"closed-pure-v1"});
        let leaf =
            Manifest::parse(&expr_manifest("organism:pure", json!(["get", "value"]))).unwrap();
        let good = nested(&mut store, leaf.clone());
        evaluation_manifest(&good, &store, &policy).unwrap();
        for hidden in [
            json!({"id":"hidden","kind":"agent","inputs":{"value":"json"},"prompt":"must not execute","view":{"inputs":["value"]},"output":{"kind":"text"}}),
            json!({"id":"hidden","kind":"slot","name":"private","mode":"read","default":null}),
            json!({"id":"hidden","kind":"store"}),
            json!({"id":"hidden","kind":"load"}),
            json!({"id":"hidden","kind":"spawn"}),
            json!({"id":"hidden","kind":"tool","tool":"hidden.v1"}),
            json!({"id":"hidden","kind":"recall","inputs":{"value":"json"},"query":{"contract":"algal.expr.v1","program":"query"}}),
            json!({"id":"hidden","kind":"fn","fn":"unknown.v1"}),
        ] {
            let mut value = leaf.value.clone();
            if hidden["kind"] == "agent" || hidden["kind"] == "recall" {
                value["edges"].as_array_mut().unwrap().push(json!({"from":{"cell":"src","port":"value"},"to":{"cell":"hidden","port":"value"},"guard":{"expr":{"contract":"algal.expr.v1","program":false}}}));
            }
            value["cells"].as_array_mut().unwrap().push(hidden);
            let candidate = nested(&mut store, Manifest::parse(&value).unwrap());
            assert!(evaluation_manifest(&candidate, &store, &policy).is_err());
        }
        let mut via = good.value.clone();
        via["cells"][1]["via"] = json!("local");
        let via = Manifest::parse(&via).unwrap();
        assert!(evaluation_manifest(&via, &store, &policy).is_err());
        let mut missing = good.value;
        missing["cells"][1]["manifest"] = json!(hashed(&json!("missing")));
        assert!(evaluation_manifest(&Manifest::parse(&missing).unwrap(), &store, &policy).is_err());
    }

    #[tokio::test]
    async fn pure_composition_keeps_root_budgets_and_expanded_compile_limits() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let policy = json!({"composition":"closed-pure-v1"});
        let leaf =
            Manifest::parse(&expr_manifest("organism:pure", json!(["get", "value"]))).unwrap();
        for budgets in [
            json!({"maxDepth":1}),
            json!({"maxSteps":4}),
            json!({"maxWork":100}),
        ] {
            let mut candidate = nested(&mut store, leaf.clone()).value;
            candidate["budgets"] = budgets;
            let fixture = seed_manifest(&mut store, candidate, true);
            let (reference, evaluation) = evaluate_application_revision(
                &mut store,
                &request(&fixture),
                &mut Host::default(),
                &Transports::new(),
            )
            .await
            .unwrap();
            assert_eq!(evaluation["verdict"]["status"], "rejected");
            assert_eq!(
                verify_application_evaluation(&store, &reference, &fixture.state, &Host::default())
                    .await
                    .unwrap(),
                evaluation
            );
        }
        let mut deep = leaf.clone();
        for i in 0..66 {
            deep = composed(&mut store, deep, "organism", &format!("organism:depth-{i}"));
        }
        assert!(evaluation_manifest(&deep, &store, &policy).is_err());
        let mut expanded = leaf;
        for i in 0..11 {
            let base = composed(
                &mut store,
                expanded,
                "organism",
                &format!("organism:expanded-{i}"),
            );
            let mut value = base.value;
            let mut second = value["cells"][1].clone();
            second["id"] = json!("second");
            value["cells"].as_array_mut().unwrap().push(second);
            value["edges"].as_array_mut().unwrap().push(
                json!({"from":{"cell":"src","port":"value"},"to":{"cell":"second","port":"q"}}),
            );
            expanded = Manifest::parse(&value).unwrap();
        }
        assert!(evaluation_manifest(&expanded, &store, &policy).is_err());
    }

    #[tokio::test]
    async fn evaluate_verifies_and_admits_a_strict_improvement() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let fixture = seed(
            &mut store,
            json!([
                "if",
                ["eq", ["get", "value"], "v2"],
                "v2-ok",
                ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]
            ]),
        );
        // The candidate preserves every passing case and fixes the two that
        // failed: strictly better validation, clean holdout, no regression.
        let compatibility =
            check_application_compatibility(&store, &fixture.revision1, &fixture.revision2)
                .unwrap();
        assert_eq!(compatibility["status"], json!("compatible"));
        let mut host = Host::default();
        let (evaluation_ref, evaluation) = evaluate_application_revision(
            &mut store,
            &request(&fixture),
            &mut host,
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(
            evaluation["verdict"]["status"],
            json!("accepted"),
            "{}",
            evaluation["verdict"]
        );
        assert_eq!(
            evaluation["verdict"]["selectedManifest"],
            json!(fixture.candidate)
        );
        // The stored evidence re-verifies and the verdict reproduces.
        let checked = verify_application_evaluation(
            &store,
            &evaluation_ref,
            &fixture.state,
            &Host::default(),
        )
        .await
        .unwrap();
        assert_eq!(checked["verdict"], evaluation["verdict"]);
        let admitted = admit_application_activation(
            &store,
            &json!({"evaluation": evaluation_ref, "expectedState": fixture.state, "revision": fixture.revision2}),
            &Host::default(),
        )
        .await
        .unwrap();
        assert_eq!(admitted["revision"], json!(fixture.revision2));
        assert_eq!(admitted["evaluation"]["verdict"], evaluation["verdict"]);
        // The incumbent manifest was evaluated as the old candidate row.
        let report = get_record(&store, evaluation["foundryReport"].as_str().unwrap()).unwrap();
        assert_eq!(report["promoted"], json!(fixture.candidate));
        assert_eq!(report["holdout"]["passed"], json!(1));
        assert_eq!(
            report["candidates"][0]["manifestDigest"],
            json!(fixture.incumbent)
        );
        // A different revision is never admitted off this evaluation.
        assert!(
            admit_application_activation(
                &store,
                &json!({"evaluation": evaluation_ref, "expectedState": fixture.state, "revision": fixture.revision1}),
                &Host::default(),
            )
            .await
            .is_err()
        );
        // A stale expected state is never admitted either.
        assert!(
            verify_application_evaluation(
                &store,
                &evaluation_ref,
                &fixture.revision1,
                &Host::default(),
            )
            .await
            .is_err()
        );
    }

    #[tokio::test]
    async fn a_non_improving_candidate_is_rejected_and_unadmitted() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        // Same program as the incumbent: no strict validation improvement and
        // the shared holdout failure — a rejected verdict either way.
        let fixture = seed(&mut store, json!("ok"));
        let mut host = Host::default();
        let (evaluation_ref, evaluation) = evaluate_application_revision(
            &mut store,
            &request(&fixture),
            &mut host,
            &Transports::new(),
        )
        .await
        .unwrap();
        assert_eq!(evaluation["verdict"]["status"], json!("rejected"));
        assert!(
            admit_application_activation(
                &store,
                &json!({"evaluation": evaluation_ref, "expectedState": fixture.state, "revision": fixture.revision2}),
                &Host::default(),
            )
            .await
            .is_err()
        );
    }

    #[tokio::test]
    async fn evaluation_rejects_unbound_policy_and_missing_holdout() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let fixture = seed(&mut store, json!("ok"));
        // A request naming a policy other than the candidate revision's bound
        // policy is rejected before any case runs.
        let other_policy = put(
            &mut store,
            json!({"contract":"algal.application-evaluation-policy.v1","maxCases":4,"maxWork":1000000,"maxModelCalls":0,"requireHoldoutPass":true,"strictValidationImprovement":true}),
        );
        let mut unbound = request(&fixture);
        unbound["policy"] = json!(other_policy);
        assert!(
            evaluate_application_revision(
                &mut store,
                &unbound,
                &mut Host::default(),
                &Transports::new(),
            )
            .await
            .is_err()
        );
        // A case set without a holdout case is inadmissible.
        let short = put(
            &mut store,
            json!({"contract":"algal.application-evaluation-cases.v1","cases":[
                {"id":"train-ok","split":"train","args":{"q":"t1"},"expect":{"answer":"ok"}},
                {"id":"val-ok","split":"validation","args":{"q":"v1"},"expect":{"answer":"ok"}},
            ]}),
        );
        let mut bad_cases = request(&fixture);
        bad_cases["cases"] = json!(short);
        assert!(
            evaluate_application_revision(
                &mut store,
                &bad_cases,
                &mut Host::default(),
                &Transports::new(),
            )
            .await
            .is_err()
        );
    }

    #[tokio::test]
    async fn a_charged_evaluation_keeps_its_record_and_charges_every_run() {
        use habitat_budget::{Account, Limits};
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let fixture = seed(
            &mut store,
            json!([
                "if",
                ["eq", ["get", "value"], "v2"],
                "v2-ok",
                ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]
            ]),
        );
        let limits = |runs| Limits {
            work: 10_000_000,
            attempts: 64,
            runs,
        };
        let (plain, _) = evaluate_application_revision(
            &mut store,
            &request(&fixture),
            &mut Host::default(),
            &Transports::new(),
        )
        .await
        .unwrap();
        let mut account = Account::new("experiment", limits(64)).unwrap();
        let (charged, evaluation) = evaluate_application_revision_in(
            &mut store,
            &request(&fixture),
            &mut Host::default(),
            &Transports::new(),
            Some(&mut account),
        )
        .await
        .unwrap();
        // The account changes no evaluation, report, or digest.
        assert_eq!(charged, plain);
        let record = account.record().unwrap();
        let report = get_record(&store, evaluation["foundryReport"].as_str().unwrap()).unwrap();
        assert!(report.get("budget").is_none());
        let runs: Vec<(String, String)> = record["runs"]
            .as_array()
            .unwrap()
            .iter()
            .map(|run| {
                (
                    run["manifest"].as_str().unwrap().to_owned(),
                    run["receipt"].as_str().unwrap().to_owned(),
                )
            })
            .collect();
        assert_eq!(runs, foundry::report_runs(&report));
        assert_eq!(record["activity"], "experiment");
        // A record continues in a later command only while it reconciles.
        let resumed = Account::resume(&record, &store).await.unwrap();
        assert_eq!(resumed.record().unwrap(), record);
        let mut changed = record.clone();
        let work = changed["runs"][0]["charged"]["work"].as_u64().unwrap();
        changed["runs"][0]["charged"]["work"] = json!(work + 1);
        let total = changed["charged"]["work"].as_u64().unwrap();
        changed["charged"]["work"] = json!(total + 1);
        assert!(Account::resume(&changed, &store).await.is_err());
        // Only an experiment account charges an evaluation.
        let mut foundry_account = Account::new("foundry", limits(64)).unwrap();
        assert!(
            evaluate_application_revision_in(
                &mut store,
                &request(&fixture),
                &mut Host::default(),
                &Transports::new(),
                Some(&mut foundry_account),
            )
            .await
            .is_err()
        );
        // Exhaustion stops the evaluation and leaves the terminal record.
        let mut small = Account::new("experiment", limits(3)).unwrap();
        let error = evaluate_application_revision_in(
            &mut store,
            &request(&fixture),
            &mut Host::default(),
            &Transports::new(),
            Some(&mut small),
        )
        .await
        .unwrap_err();
        assert_eq!(error.code, "BUDGET_EXHAUSTED");
        let exhausted = small.record().unwrap();
        assert_eq!(exhausted["outcome"], "exhausted");
        assert_eq!(exhausted["runs"].as_array().unwrap().len(), 3);
        assert!(Account::resume(&exhausted, &store).await.is_err());
    }
}
