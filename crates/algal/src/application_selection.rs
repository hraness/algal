//! Environment-keyed selection among compared alternatives — port of
//! src/application-selection.ts. An `algal.application-selection-policy.v1`
//! record is pure data: for one entrypoint at one parent state it maps an
//! environment label to a retained comparison and the manifest that
//! comparison selected. Authority stays with the host's `selectionEnvironment`
//! option — a policy in CAS grants nothing, and under a host that names an
//! environment it can only narrow which accepted alternative may be
//! installed. Every row is replayed through `verify_comparison`, so a
//! selection is never trusted on its own.

use serde_json::{Value, json};

use crate::application_comparison::verify_comparison;
use crate::application_memory::{app_id, app_object, app_ref, app_tag, get_record};
use crate::canonical::check_digest;
use crate::contract::list;
use crate::effects::Host;
use crate::store::Store;
use crate::{Error, Result};
use std::collections::BTreeMap;

const SELECTION_LIMIT: usize = 16;

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

/// `parseApplicationSelectionPolicy` — closed record with 1..16 rows sorted
/// unique by environment.
pub fn parse_selection_policy(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "parentState",
            "entrypoint",
            "selections",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-selection-policy.v1")?;
    let rows = list(&v["selections"], SELECTION_LIMIT)?;
    let mut environments = Vec::with_capacity(rows.len());
    for row in rows {
        let r = app_object(row, &["environment", "comparison", "manifest"])?;
        environments.push(app_id(&r["environment"])?.to_owned());
        app_ref(&r["comparison"])?;
        app_ref(&r["manifest"])?;
    }
    if rows.is_empty() {
        return Err(fail("Selection policy requires at least one row"));
    }
    if environments.windows(2).any(|pair| pair[0] >= pair[1]) {
        return Err(fail(
            "Selection rows must be sorted and unique by environment",
        ));
    }
    app_id(&v["application"])?;
    app_ref(&v["parentState"])?;
    app_id(&v["entrypoint"])?;
    Ok(input.clone())
}

/// `verifyApplicationSelectionPolicy` — replays every row: the cited
/// comparison must verify against the policy's parent state, name the same
/// application, entrypoint and environment, and have selected exactly the
/// row's manifest.
pub async fn verify_selection_policy(
    store: &Store,
    policy_ref: &str,
    expected_parent_state: &str,
    host: &Host,
) -> Result<(Value, BTreeMap<String, Value>)> {
    let policy = parse_selection_policy(&get_record(store, policy_ref)?)?;
    if policy["parentState"].as_str() != Some(check_digest(expected_parent_state)?) {
        return Err(fail("Selection policy parent state is stale"));
    }
    let mut comparisons = BTreeMap::new();
    for row in policy["selections"].as_array().into_iter().flatten() {
        let comparison = verify_comparison(
            store,
            app_ref(&row["comparison"])?,
            expected_parent_state,
            host,
        )
        .await?;
        if comparison["application"].as_str() != policy["application"].as_str()
            || comparison["entrypoint"].as_str() != policy["entrypoint"].as_str()
            || comparison["environment"].as_str() != row["environment"].as_str()
        {
            return Err(fail("Selection row comparison does not bind this policy"));
        }
        if comparison["selected"].as_str() != row["manifest"].as_str() {
            return Err(fail(
                "Selection row does not name the comparison's selected manifest",
            ));
        }
        comparisons.insert(
            row["environment"].as_str().unwrap_or_default().to_owned(),
            comparison,
        );
    }
    Ok((policy, comparisons))
}

/// `selectApplicationStrategy` — resolves the strategy a verified policy
/// selects for one environment.
pub async fn select_application_strategy(
    store: &Store,
    policy_ref: &str,
    environment: &str,
    expected_parent_state: &str,
    host: &Host,
) -> Result<Value> {
    let environment_value = json!(environment);
    let label = app_id(&environment_value)?.to_owned();
    let (policy, comparisons) =
        verify_selection_policy(store, policy_ref, expected_parent_state, host).await?;
    let row = policy["selections"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|row| row["environment"].as_str() == Some(label.as_str()))
        .ok_or_else(|| fail("Selection policy has no row for this environment"))?;
    Ok(json!({
        "policy": policy,
        "row": row,
        "comparison": comparisons[&label],
        "manifest": row["manifest"],
    }))
}
