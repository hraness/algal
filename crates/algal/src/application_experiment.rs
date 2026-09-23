//! Bounded experiment evidence — port of src/application-experiment.ts. One
//! closed record joining the full adaptation evidence chain — proposals,
//! evaluations, an optional comparison, an optional selection policy, and an
//! optional retained selection — for one application, one parent state, one
//! entrypoint, and one environment.
//!
//! Every cited record is replayed in full against the exact parent state
//! before minting and again on verification, so the experiment is a
//! reproducible join, never a hand-assembled citation list. `result` is
//! retained metadata about what the chain resolved to: `revision` names the
//! winning candidate revision the evidence selects (or null), and `promoted`
//! is the producer's claim that an activation actually committed it. Minting
//! an experiment never performs an activation — an experiment that selected
//! nothing, or selected a candidate that was not promoted, remains valid
//! retained evidence. The record grants no authority: activation still
//! requires the reproduced accepted-evaluation coverage and the host's own
//! selection/restoration checks. When the default host is offered an
//! experiment as `activate`/`migrate`/`restore` evidence it replays it like
//! comparison evidence and requires `result.revision` to be the committed
//! revision.

use serde_json::{Value, json};
use std::collections::BTreeSet;

use crate::application::{Revision, parse_revision, parse_state};
use crate::application_adaptation::{parse_evaluation_request, verify_application_evaluation};
use crate::application_comparison::verify_comparison;
use crate::application_memory::{
    app_id, app_json, app_object, app_ref, app_refs, app_tag, get_record, opt_ref, put_record,
};
use crate::application_proposal::{
    parse_application_proposal, parse_proposal_request, verify_proposal,
};
use crate::application_selection::{verify_selection, verify_selection_policy};
use crate::canonical::canonical;
use crate::contract::list;
use crate::effects::Host;
use crate::store::Store;
use crate::{Error, Result};

const EXPERIMENT_PROPOSALS: usize = 8;
const EXPERIMENT_EVALUATIONS: usize = 8;

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

/// `parseApplicationExperiment` — closed record: bounded sorted-unique
/// proposal/evaluation lists, at least one cited record, a selection that
/// requires a policy, and `result.promoted` requiring `result.revision`.
pub fn parse_experiment(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "parentState",
            "entrypoint",
            "environment",
            "proposals",
            "evaluations",
            "comparison",
            "selectionPolicy",
            "selection",
            "result",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-experiment.v1")?;
    let proposals = app_refs(&v["proposals"], EXPERIMENT_PROPOSALS)?;
    let evaluations = app_refs(&v["evaluations"], EXPERIMENT_EVALUATIONS)?;
    if proposals.len() + evaluations.len() == 0 {
        return Err(fail("Experiment requires at least one evidence record"));
    }
    opt_ref(&v["comparison"])?;
    let selection_policy = opt_ref(&v["selectionPolicy"])?;
    let selection = opt_ref(&v["selection"])?;
    if selection.is_some() && selection_policy.is_none() {
        return Err(fail("Experiment selection requires a selection policy"));
    }
    let r = app_object(&v["result"], &["promoted", "revision"])?;
    if !r["promoted"].is_boolean() {
        return Err(fail("Invalid experiment promotion flag"));
    }
    let result_revision = opt_ref(&r["revision"])?;
    if r["promoted"].as_bool() == Some(true) && result_revision.is_none() {
        return Err(fail("Experiment promotion requires a revision"));
    }
    app_id(&v["application"])?;
    app_ref(&v["parentState"])?;
    app_id(&v["entrypoint"])?;
    app_id(&v["environment"])?;
    Ok(input.clone())
}

struct ExperimentInput {
    application: String,
    parent_state: String,
    entrypoint: String,
    environment: String,
    proposals: Vec<String>,
    evaluations: Vec<String>,
    comparison: Option<String>,
    selection_policy: Option<String>,
    selection: Option<String>,
    promoted: bool,
    result_revision: Option<String>,
}

fn parse_experiment_input(input: &Value) -> Result<ExperimentInput> {
    let v = app_object(
        input,
        &[
            "application",
            "parentState",
            "entrypoint",
            "environment",
            "proposals",
            "evaluations",
            "comparison",
            "selectionPolicy",
            "selection",
            "result",
        ],
    )?;
    let proposals: Vec<String> = list(&v["proposals"], EXPERIMENT_PROPOSALS)?
        .iter()
        .map(|row| app_ref(row).map(str::to_owned))
        .collect::<Result<_>>()?;
    let evaluations: Vec<String> = list(&v["evaluations"], EXPERIMENT_EVALUATIONS)?
        .iter()
        .map(|row| app_ref(row).map(str::to_owned))
        .collect::<Result<_>>()?;
    let comparison = opt_ref(&v["comparison"])?;
    let selection_policy = opt_ref(&v["selectionPolicy"])?;
    let selection = opt_ref(&v["selection"])?;
    if selection.is_some() && selection_policy.is_none() {
        return Err(fail("Experiment selection requires a selection policy"));
    }
    let r = app_object(&v["result"], &["promoted", "revision"])?;
    let promoted = r["promoted"]
        .as_bool()
        .ok_or_else(|| fail("Invalid experiment promotion flag"))?;
    let result_revision = opt_ref(&r["revision"])?;
    if promoted && result_revision.is_none() {
        return Err(fail("Experiment promotion requires a revision"));
    }
    Ok(ExperimentInput {
        application: app_id(&v["application"])?.to_owned(),
        parent_state: app_ref(&v["parentState"])?.to_owned(),
        entrypoint: app_id(&v["entrypoint"])?.to_owned(),
        environment: app_id(&v["environment"])?.to_owned(),
        proposals,
        evaluations,
        comparison,
        selection_policy,
        selection,
        promoted,
        result_revision,
    })
}

/// Replays every cited record against the parent state and derives the
/// canonical experiment. All join semantics live here, so the stored record
/// is exactly what verification reproduces.
async fn derive_experiment(store: &Store, input: &ExperimentInput, host: &Host) -> Result<Value> {
    if input.proposals.len() > EXPERIMENT_PROPOSALS
        || input.evaluations.len() > EXPERIMENT_EVALUATIONS
    {
        return Err(fail("Experiment evidence bound exceeded"));
    }
    if input.proposals.iter().collect::<BTreeSet<_>>().len() != input.proposals.len()
        || input.evaluations.iter().collect::<BTreeSet<_>>().len() != input.evaluations.len()
    {
        return Err(fail("Experiment evidence must be unique"));
    }
    if input.proposals.len() + input.evaluations.len() == 0 {
        return Err(fail("Experiment requires at least one evidence record"));
    }

    // The parent state names the application; nothing may join across
    // applications or heads.
    let state = parse_state(&get_record(store, &input.parent_state)?)?;
    if state.application != input.application {
        return Err(fail(
            "Experiment parent state belongs to another application",
        ));
    }

    // Proposals replay bit-for-bit: each must name this application and
    // target entrypoint, target this head's incumbent revision, and be
    // anchored to this parent state or — when the `propose` transition
    // committed first — to its immediate predecessor. The frozen request
    // must carry the experiment environment. Their candidates bound what may
    // be selected.
    let mut proposal_candidates = BTreeSet::new();
    for reference in &input.proposals {
        let proposal = parse_application_proposal(&get_record(store, reference)?)?;
        if proposal["application"].as_str() != Some(input.application.as_str())
            || proposal["target"].as_str() != Some(input.entrypoint.as_str())
            || proposal["revision"].as_str() != Some(state.revision.as_str())
            || (proposal["parentState"].as_str() != Some(input.parent_state.as_str())
                && proposal["parentState"].as_str() != state.previous.as_deref())
        {
            return Err(fail("Experiment proposal does not bind this experiment"));
        }
        verify_proposal(
            store,
            reference,
            proposal["parentState"].as_str().unwrap_or_default(),
            host,
        )
        .await?;
        let request = parse_proposal_request(&get_record(store, app_ref(&proposal["request"])?)?)?;
        if request.environment.as_deref() != Some(input.environment.as_str()) {
            return Err(fail("Experiment proposal is not bound to this environment"));
        }
        for candidate in proposal["candidates"].as_array().into_iter().flatten() {
            proposal_candidates.insert(
                candidate["revision"]
                    .as_str()
                    .unwrap_or_default()
                    .to_owned(),
            );
        }
    }

    // Evaluations replay bit-for-bit: each request must carry this parent
    // state, entrypoint, and environment, all requests share the frozen
    // measurement set, and a measured candidate must come from a cited
    // proposal when proposals are part of the chain.
    let mut accepted_candidates = BTreeSet::new();
    let mut shared: Option<(String, String, String)> = None;
    for reference in &input.evaluations {
        let checked =
            verify_application_evaluation(store, reference, &input.parent_state, host).await?;
        let request = parse_evaluation_request(&get_record(
            store,
            checked["request"].as_str().unwrap_or(""),
        )?)?;
        if request.parent_state != input.parent_state
            || request.environment.as_deref() != Some(input.environment.as_str())
        {
            return Err(fail(
                "Experiment evaluation is not bound to this parent state and environment",
            ));
        }
        if request.entrypoint != input.entrypoint {
            return Err(fail("Experiment evaluation measures another entrypoint"));
        }
        let candidate = parse_revision(&get_record(store, &request.candidate_revision)?)?;
        if candidate.application != input.application {
            return Err(fail("Experiment candidate belongs to another application"));
        }
        if !input.proposals.is_empty() && !proposal_candidates.contains(&request.candidate_revision)
        {
            return Err(fail("Experiment evaluation measures no proposed candidate"));
        }
        let fields = (
            request.cases.clone(),
            request.scorer.clone(),
            request.policy.clone(),
        );
        match &shared {
            None => shared = Some(fields),
            Some((cases, scorer, policy))
                if cases == &fields.0 && scorer == &fields.1 && policy == &fields.2 => {}
            _ => {
                return Err(fail(
                    "Experiment evaluations must share cases, scorer, and policy",
                ));
            }
        }
        if checked["verdict"]["status"].as_str() == Some("accepted") {
            accepted_candidates.insert(request.candidate_revision.clone());
        }
    }

    // An optional comparison must bind this experiment and join exactly the
    // cited evaluations — nothing more, nothing less.
    let mut selected_revision: Option<String> = None;
    if let Some(comparison_ref) = &input.comparison {
        let compared = verify_comparison(store, comparison_ref, &input.parent_state, host).await?;
        if compared["application"].as_str() != Some(input.application.as_str())
            || compared["entrypoint"].as_str() != Some(input.entrypoint.as_str())
            || compared["environment"].as_str() != Some(input.environment.as_str())
        {
            return Err(fail("Experiment comparison does not bind this experiment"));
        }
        let mut joined: Vec<&str> = compared["results"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|row| row["evaluation"].as_str())
            .collect();
        joined.sort_unstable();
        let mut cited = input.evaluations.clone();
        cited.sort_unstable();
        if joined != cited.iter().map(String::as_str).collect::<Vec<_>>() {
            return Err(fail(
                "Experiment comparison does not join exactly the cited evaluations",
            ));
        }
        if let Some(selected) = compared["selected"].as_str() {
            selected_revision = compared["results"]
                .as_array()
                .into_iter()
                .flatten()
                .find(|row| row["manifest"].as_str() == Some(selected))
                .and_then(|row| row["revision"].as_str())
                .map(str::to_owned);
        }
    }

    // An optional selection policy must bind this experiment and serve its
    // environment through exactly the cited comparison.
    if let Some(policy_ref) = &input.selection_policy {
        let (policy, _comparisons) =
            verify_selection_policy(store, policy_ref, &input.parent_state, host).await?;
        if policy["application"].as_str() != Some(input.application.as_str())
            || policy["entrypoint"].as_str() != Some(input.entrypoint.as_str())
        {
            return Err(fail(
                "Experiment selection policy does not bind this experiment",
            ));
        }
        let row = policy["selections"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|item| item["environment"].as_str() == Some(input.environment.as_str()))
            .ok_or_else(|| fail("Experiment selection policy does not serve this environment"))?;
        if row["comparison"].as_str() != input.comparison.as_deref() {
            return Err(fail(
                "Experiment selection policy names a different comparison",
            ));
        }
    }

    // An optional retained selection must resolve under the cited policy and
    // comparison and pick a candidate the cited proposals emitted.
    if let Some(selection_ref) = &input.selection {
        let resolved = verify_selection(store, selection_ref, &input.parent_state, host).await?;
        if resolved["application"].as_str() != Some(input.application.as_str())
            || resolved["entrypoint"].as_str() != Some(input.entrypoint.as_str())
            || resolved["environment"].as_str() != Some(input.environment.as_str())
        {
            return Err(fail("Experiment selection does not bind this experiment"));
        }
        if resolved["policy"].as_str() != input.selection_policy.as_deref()
            || resolved["comparison"].as_str() != input.comparison.as_deref()
        {
            return Err(fail(
                "Experiment selection is not under the cited policy and comparison",
            ));
        }
        let revision = resolved["revision"].as_str().unwrap_or_default().to_owned();
        if !proposal_candidates.contains(&revision) {
            return Err(fail(
                "Experiment selection is not among the cited proposals",
            ));
        }
        selected_revision = Some(revision);
    }

    // `result.revision` names the candidate the evidence selects. `promoted`
    // records that an activation actually committed — a claim retained with
    // the join, not an effect the experiment performs.
    if let Some(result_revision) = &input.result_revision {
        if input.selection.is_some() || input.comparison.is_some() {
            if Some(result_revision.as_str()) != selected_revision.as_deref() {
                return Err(fail("Experiment result is not the selected candidate"));
            }
        } else if !accepted_candidates.contains(result_revision) {
            return Err(fail("Experiment result names no accepted candidate"));
        }
    }
    let mut proposals = input.proposals.clone();
    proposals.sort_unstable();
    let mut evaluations = input.evaluations.clone();
    evaluations.sort_unstable();
    Ok(json!({
        "contract": "algal.application-experiment.v1",
        "application": input.application,
        "parentState": input.parent_state,
        "entrypoint": input.entrypoint,
        "environment": input.environment,
        "proposals": proposals,
        "evaluations": evaluations,
        "comparison": input.comparison.clone().map_or(Value::Null, Value::String),
        "selectionPolicy": input.selection_policy.clone().map_or(Value::Null, Value::String),
        "selection": input.selection.clone().map_or(Value::Null, Value::String),
        "result": {
            "promoted": input.promoted,
            "revision": input.result_revision.clone().map_or(Value::Null, Value::String),
        },
    }))
}

/// `produceApplicationExperiment` — derive and store the experiment record.
/// Producing the record is an evidence join; it never activates the selected
/// revision itself.
pub async fn produce_experiment(
    store: &mut Store,
    input: &Value,
    host: &Host,
) -> Result<(String, Value)> {
    let request = parse_experiment_input(input)?;
    let experiment = derive_experiment(store, &request, host).await?;
    let experiment_ref = put_record(store, &experiment)?;
    Ok((experiment_ref, experiment))
}

/// `verifyApplicationExperiment` — every cited record is re-verified against
/// the named parent state and the recomputed record must equal the stored
/// one byte-for-byte.
pub async fn verify_experiment(
    store: &Store,
    experiment_ref: &str,
    expected_parent_state: &str,
    host: &Host,
) -> Result<Value> {
    let stored = parse_experiment(&get_record(store, experiment_ref)?)?;
    if stored["parentState"].as_str() != Some(expected_parent_state) {
        return Err(fail("Experiment parent state is stale"));
    }
    let request = ExperimentInput {
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
        proposals: app_refs(&stored["proposals"], EXPERIMENT_PROPOSALS)?,
        evaluations: app_refs(&stored["evaluations"], EXPERIMENT_EVALUATIONS)?,
        comparison: opt_ref(&stored["comparison"])?,
        selection_policy: opt_ref(&stored["selectionPolicy"])?,
        selection: opt_ref(&stored["selection"])?,
        promoted: stored["result"]["promoted"].as_bool().unwrap_or_default(),
        result_revision: opt_ref(&stored["result"]["revision"])?,
    };
    let recomputed = derive_experiment(store, &request, host).await?;
    if canonical(&app_json(&recomputed)?)? != canonical(&app_json(&stored)?)? {
        return Err(fail("Experiment is not reproducible from its evidence"));
    }
    Ok(stored)
}

/// `checkExperimentBinding` — the record must name this application and the
/// commit's parent state, its entrypoint must exist in the committed
/// revision, and its `result.revision` must be exactly the committed
/// revision — an experiment that selected nothing, or another candidate,
/// cannot attach to a transition installing a different strategy. Full
/// evidence replay is `verify_experiment`, which the default host runs first.
pub fn check_experiment_binding(
    stored: &Value,
    application: &str,
    parent_state: &str,
    committed: Option<(&str, &Revision)>,
) -> Result<()> {
    if stored["application"].as_str() != Some(application)
        || stored["parentState"].as_str() != Some(parent_state)
    {
        return Err(fail("Experiment evidence does not bind this transition"));
    }
    if let Some((digest, revision)) = committed {
        let entrypoint = stored["entrypoint"].as_str().unwrap_or_default();
        if !revision
            .entrypoints
            .iter()
            .any(|entry| entry.name == entrypoint)
        {
            return Err(fail(
                "Experiment entrypoint is not in the committed revision",
            ));
        }
        if stored["result"]["revision"].as_str() != Some(digest) {
            return Err(fail(
                "Experiment result does not name the committed revision",
            ));
        }
    }
    Ok(())
}
