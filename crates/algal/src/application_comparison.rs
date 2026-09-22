//! Environment-attributed comparison of evaluated alternatives — port of
//! src/application-comparison.ts. Each row is reproduced through the ordinary
//! incumbent-versus-candidate evaluator; the record joins the verdicts, the
//! shared frozen measurement set, and the host-declared environment label.
//! `selected` requires an accepted verdict and grants no authority.

use serde_json::{Value, json};

use crate::application::parse_revision;
use crate::application_adaptation::{parse_evaluation_request, verify_application_evaluation};
use crate::application_memory::{
    app_id, app_json, app_object, app_ref, app_tag, get_record, opt_ref, put_record,
};
use crate::canonical::canonical;
use crate::contract::list;
use crate::effects::Host;
use crate::store::Store;
use crate::{Error, Result};

const COMPARISON_RESULT_LIMIT: usize = 8;

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

fn parse_result(input: &Value) -> Result<()> {
    let v = app_object(input, &["revision", "manifest", "evaluation", "verdict"])?;
    app_ref(&v["revision"])?;
    app_ref(&v["manifest"])?;
    app_ref(&v["evaluation"])?;
    match v["verdict"].as_str() {
        Some("accepted") | Some("rejected") | Some("incomplete") => Ok(()),
        _ => Err(fail("Invalid comparison verdict")),
    }
}

/// `parseApplicationComparison` — closed record, sorted unique results, and a
/// selection that must name an accepted manifest.
pub fn parse_comparison(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "parentState",
            "entrypoint",
            "environment",
            "cases",
            "scorer",
            "policy",
            "results",
            "selected",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-comparison.v1")?;
    app_id(&v["application"])?;
    app_ref(&v["parentState"])?;
    app_id(&v["entrypoint"])?;
    app_id(&v["environment"])?;
    app_ref(&v["cases"])?;
    app_ref(&v["scorer"])?;
    app_ref(&v["policy"])?;
    let results = v["results"]
        .as_array()
        .ok_or_else(|| fail("Comparison results must be a list"))?;
    if results.is_empty() || results.len() > COMPARISON_RESULT_LIMIT {
        return Err(fail("Comparison result bound exceeded"));
    }
    let mut revisions = Vec::with_capacity(results.len());
    let mut manifests = Vec::with_capacity(results.len());
    let mut evaluations = Vec::with_capacity(results.len());
    for row in results {
        parse_result(row)?;
        revisions.push(row["revision"].as_str().unwrap_or_default());
        manifests.push(row["manifest"].as_str().unwrap_or_default());
        evaluations.push(row["evaluation"].as_str().unwrap_or_default());
    }
    if revisions.windows(2).any(|pair| pair[0] >= pair[1]) {
        return Err(fail("Comparison results must be sorted by revision"));
    }
    let mut unique = manifests.clone();
    unique.sort_unstable();
    unique.dedup();
    if unique.len() != manifests.len() {
        return Err(fail("Comparison manifests must be unique"));
    }
    let mut unique = evaluations.clone();
    unique.sort_unstable();
    unique.dedup();
    if unique.len() != evaluations.len() {
        return Err(fail("Comparison evaluations must be unique"));
    }
    match &v["selected"] {
        Value::Null => {}
        selected => {
            let selected = app_ref(selected)?;
            let accepted = results.iter().any(|row| {
                row["manifest"].as_str() == Some(selected)
                    && row["verdict"].as_str() == Some("accepted")
            });
            if !accepted {
                return Err(fail("Comparison selection requires an accepted result"));
            }
        }
    }
    Ok(input.clone())
}

struct CompareRequest {
    application: String,
    parent_state: String,
    entrypoint: String,
    environment: String,
    evaluations: Vec<String>,
    selected: Option<String>,
}

fn parse_compare_request(input: &Value) -> Result<CompareRequest> {
    let v = app_object(
        input,
        &[
            "application",
            "parentState",
            "entrypoint",
            "environment",
            "evaluations",
            "selected",
        ],
    )?;
    let mut evaluations = Vec::new();
    for row in list(&v["evaluations"], COMPARISON_RESULT_LIMIT)? {
        evaluations.push(app_ref(row)?.to_owned());
    }
    Ok(CompareRequest {
        application: app_id(&v["application"])?.to_owned(),
        parent_state: app_ref(&v["parentState"])?.to_owned(),
        entrypoint: app_id(&v["entrypoint"])?.to_owned(),
        environment: app_id(&v["environment"])?.to_owned(),
        evaluations,
        selected: opt_ref(&v["selected"])?,
    })
}

/// Recomputes every cited evaluation against the parent state and derives the
/// canonical comparison — shared fields come from the evidence itself.
async fn derive_comparison(store: &Store, request: &CompareRequest, host: &Host) -> Result<Value> {
    if request.evaluations.is_empty() {
        return Err(fail("Comparison evaluation bound exceeded"));
    }
    let mut unique = request.evaluations.clone();
    unique.sort_unstable();
    unique.dedup();
    if unique.len() != request.evaluations.len() {
        return Err(fail("Comparison evaluations must be unique"));
    }
    let mut results = Vec::with_capacity(request.evaluations.len());
    let mut shared: Option<(String, String, String)> = None;
    for evaluation_ref in &request.evaluations {
        let evaluation =
            verify_application_evaluation(store, evaluation_ref, &request.parent_state, host)
                .await?;
        let evaluation_request = parse_evaluation_request(&get_record(
            store,
            evaluation["request"].as_str().unwrap_or(""),
        )?)?;
        if evaluation_request.parent_state != request.parent_state
            || evaluation_request.environment.as_deref() != Some(request.environment.as_str())
        {
            return Err(fail(
                "Comparison evaluation is not bound to this parent state and environment",
            ));
        }
        let candidate =
            parse_revision(&get_record(store, &evaluation_request.candidate_revision)?)?;
        if candidate.application != request.application {
            return Err(fail("Comparison candidate belongs to another application"));
        }
        if evaluation_request.entrypoint != request.entrypoint {
            return Err(fail("Comparison evaluation measures another entrypoint"));
        }
        let entry = candidate
            .entrypoints
            .iter()
            .find(|entry| entry.name == request.entrypoint)
            .ok_or_else(|| fail("Comparison entrypoint is not in the candidate revision"))?;
        let fields = (
            evaluation_request.cases.clone(),
            evaluation_request.scorer.clone(),
            evaluation_request.policy.clone(),
        );
        match &shared {
            None => shared = Some(fields),
            Some((c, s, p)) if c == &fields.0 && s == &fields.1 && p == &fields.2 => {}
            _ => {
                return Err(fail(
                    "Comparison evaluations must share cases, scorer, and policy",
                ));
            }
        }
        results.push(json!({
            "revision": evaluation_request.candidate_revision,
            "manifest": entry.manifest.clone(),
            "evaluation": evaluation_ref,
            "verdict": evaluation["verdict"]["status"].as_str().unwrap_or(""),
        }));
    }
    results.sort_by(|a, b| {
        a["revision"]
            .as_str()
            .unwrap_or_default()
            .cmp(b["revision"].as_str().unwrap_or_default())
    });
    let mut manifests: Vec<&str> = results
        .iter()
        .map(|row| row["manifest"].as_str().unwrap_or_default())
        .collect();
    manifests.sort_unstable();
    manifests.dedup();
    if manifests.len() != results.len() {
        return Err(fail("Comparison manifests must be unique"));
    }
    match &request.selected {
        None => {}
        Some(selected) => {
            let accepted = results.iter().any(|row| {
                row["manifest"].as_str() == Some(selected.as_str())
                    && row["verdict"].as_str() == Some("accepted")
            });
            if !accepted {
                return Err(fail("Comparison selection requires an accepted result"));
            }
        }
    }
    let (cases, scorer, policy) =
        shared.ok_or_else(|| fail("Comparison evaluation bound exceeded"))?;
    Ok(json!({
        "contract": "algal.application-comparison.v1",
        "application": request.application.as_str(),
        "parentState": request.parent_state.as_str(),
        "entrypoint": request.entrypoint.as_str(),
        "environment": request.environment.as_str(),
        "cases": cases,
        "scorer": scorer,
        "policy": policy,
        "results": results,
        "selected": request.selected.clone().map_or(Value::Null, Value::String),
    }))
}

/// `produceApplicationComparison` — derive and store the comparison.
pub async fn produce_comparison(
    store: &mut Store,
    input: &Value,
    host: &Host,
) -> Result<(String, Value)> {
    let request = parse_compare_request(input)?;
    let comparison = derive_comparison(store, &request, host).await?;
    let reference = put_record(store, &comparison)?;
    Ok((reference, comparison))
}

/// `verifyApplicationComparison` — re-verify every cited evaluation against
/// the named parent state and require byte-identical reproduction.
pub async fn verify_comparison(
    store: &Store,
    comparison_ref: &str,
    expected_parent_state: &str,
    host: &Host,
) -> Result<Value> {
    let stored = parse_comparison(&get_record(store, comparison_ref)?)?;
    if stored["parentState"].as_str() != Some(expected_parent_state) {
        return Err(fail("Comparison parent state is stale"));
    }
    let evaluations = stored["results"]
        .as_array()
        .map(|rows| {
            rows.iter()
                .filter_map(|row| row["evaluation"].as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default();
    let request = CompareRequest {
        application: stored["application"]
            .as_str()
            .unwrap_or_default()
            .to_owned(),
        parent_state: stored["parentState"]
            .as_str()
            .unwrap_or_default()
            .to_owned(),
        entrypoint: stored["entrypoint"].as_str().unwrap_or_default().to_owned(),
        environment: stored["environment"]
            .as_str()
            .unwrap_or_default()
            .to_owned(),
        evaluations,
        selected: opt_ref(&stored["selected"])?,
    };
    let recomputed = derive_comparison(store, &request, host).await?;
    if canonical(&app_json(&recomputed)?)? != canonical(&app_json(&stored)?)? {
        return Err(fail("Comparison is not reproducible from its evidence"));
    }
    Ok(stored)
}

/// `checkComparisonBinding` — the record must name this application and the
/// commit's parent state; full replay stays in `verify_comparison`.
pub fn check_comparison_binding(
    stored: &Value,
    application: &str,
    parent_state: &str,
) -> Result<()> {
    if stored["application"].as_str() != Some(application)
        || stored["parentState"].as_str() != Some(parent_state)
    {
        return Err(fail("Comparison evidence does not bind this transition"));
    }
    Ok(())
}
