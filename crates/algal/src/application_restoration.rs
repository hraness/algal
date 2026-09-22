//! Forward-only restoration of retained pure strategies. Stored records do
//! not authorize restoration; PolicyHost requires an explicit policy option.
use crate::application::{Service, parse_revision, parse_state};
use crate::application_memory::{
    app_id, app_object, app_object_opt, app_ref, app_refs, app_tag, get_record, opt_ref, put_record,
};
use crate::canonical::digest;
use crate::graph::{Transports, compile, interface_signature};
use crate::store::Store;
use crate::{Error, Result};
use serde_json::{Value, json};
use std::collections::BTreeSet;

pub fn parse_policy(input: &Value) -> Result<Value> {
    let v = app_object(input, &["contract", "application", "mode"])?;
    app_tag(&v["contract"], "algal.application-restoration-policy.v1")?;
    app_id(&v["application"])?;
    app_tag(&v["mode"], "retained-pure-strategy-manifests")?;
    Ok(input.clone())
}

pub fn parse_restoration(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "parentState",
            "targetState",
            "candidateRevision",
            "policy",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-restoration.v1")?;
    app_id(&v["application"])?;
    for field in ["parentState", "targetState", "candidateRevision", "policy"] {
        app_ref(&v[field])?;
    }
    Ok(input.clone())
}

fn restored_revision(
    store: &Store,
    application: &str,
    parent_state: &str,
    target_state: &str,
) -> Result<Value> {
    let parent = parse_state(&get_record(store, parent_state)?)?;
    if parent.application != application {
        return Err(Error::invalid("Restoration belongs to another application"));
    }
    let mut cursor = parent.previous.clone();
    let mut seen = BTreeSet::from([parent_state.to_owned()]);
    while let Some(reference) = cursor.as_ref() {
        if seen.len() >= 4096 || !seen.insert(reference.clone()) {
            return Err(Error::invalid("Restoration ancestry bound/cycle"));
        }
        let state = parse_state(&get_record(store, reference)?)?;
        if state.application != application {
            return Err(Error::invalid(
                "Restoration ancestry belongs to another application",
            ));
        }
        if reference == target_state {
            break;
        }
        cursor = state.previous;
    }
    if cursor.is_none() {
        return Err(Error::invalid(
            "Restoration target is not a retained ancestor",
        ));
    }
    let target = parse_state(&get_record(store, target_state)?)?;
    let current = parse_revision(&get_record(store, &parent.revision)?)?;
    let historical = parse_revision(&get_record(store, &target.revision)?)?;
    if current.application != application
        || historical.application != application
        || current
            .entrypoints
            .iter()
            .map(|e| &e.name)
            .collect::<Vec<_>>()
            != historical
                .entrypoints
                .iter()
                .map(|e| &e.name)
                .collect::<Vec<_>>()
    {
        return Err(Error::invalid("Restoration entrypoints differ"));
    }
    let mut candidate = current.value.clone();
    candidate["parent"] = json!(parent.revision);
    let mut changed = 0;
    for (index, entry) in current.entrypoints.iter().enumerate() {
        let old = &historical.entrypoints[index];
        if old.manifest != entry.manifest {
            changed += 1;
            let incumbent = store.manifest(&entry.manifest)?;
            let target_manifest = store.manifest(&old.manifest)?;
            for manifest in [&incumbent, &target_manifest] {
                if manifest
                    .cells
                    .iter()
                    .any(|c| !matches!(c["kind"].as_str(), Some("input" | "const" | "fn" | "expr")))
                {
                    return Err(Error::invalid(
                        "Restoration can only change pure strategy manifests",
                    ));
                }
            }
            let old_b = &target_manifest.budgets;
            let now = &incumbent.budgets;
            if old_b.max_steps > now.max_steps
                || old_b.max_agent_calls > now.max_agent_calls
                || old_b.max_work > now.max_work
                || old_b.max_context_bytes > now.max_context_bytes
                || old_b.max_output_bytes > now.max_output_bytes
                || old_b.max_depth > now.max_depth
            {
                return Err(Error::invalid("Restoration widens a manifest budget"));
            }
            let mut overlay = store.overlay();
            let left = interface_signature(&compile(
                incumbent,
                &mut overlay,
                &Default::default(),
                &Transports::new(),
                0,
            )?)?;
            let right = interface_signature(&compile(
                target_manifest,
                &mut overlay,
                &Default::default(),
                &Transports::new(),
                0,
            )?)?;
            if left.inputs != right.inputs || left.outputs != right.outputs {
                return Err(Error::invalid("Restoration changes the compiled interface"));
            }
        }
        candidate["entrypoints"][index]["manifest"] = json!(old.manifest);
    }
    if changed == 0 {
        return Err(Error::invalid(
            "Restoration must change a strategy manifest",
        ));
    }
    parse_revision(&candidate)?;
    Ok(candidate)
}

pub fn verify_restoration(
    store: &Store,
    application: &str,
    parent_state: &str,
    candidate_revision: &str,
    evidence: &[String],
) -> Result<Value> {
    let mut records = Vec::new();
    for reference in evidence {
        let value = get_record(store, reference)?;
        if value["contract"] == "algal.application-restoration.v1" {
            records.push(parse_restoration(&value)?);
        }
    }
    if records.len() != 1 {
        return Err(Error::invalid(
            "Restoration requires exactly one restoration record",
        ));
    }
    let record = records.remove(0);
    if record["application"] != application
        || record["parentState"] != parent_state
        || record["candidateRevision"] != candidate_revision
    {
        return Err(Error::invalid(
            "Restoration evidence does not bind this transition",
        ));
    }
    let policy = parse_policy(&get_record(store, app_ref(&record["policy"])?)?)?;
    if policy["application"] != application {
        return Err(Error::invalid(
            "Restoration policy belongs to another application",
        ));
    }
    let expected = restored_revision(
        store,
        application,
        parent_state,
        app_ref(&record["targetState"])?,
    )?;
    let candidate = parse_revision(&get_record(store, candidate_revision)?)?;
    if digest(&expected)? != digest(&candidate.value)? {
        return Err(Error::invalid(
            "Restoration must preserve current revision metadata and authority",
        ));
    }
    Ok(record)
}

pub async fn restore_revision(lifecycle: &mut Service<'_>, input: &Value) -> Result<Value> {
    let v = app_object_opt(
        input,
        &[
            "application",
            "operation",
            "expectedHead",
            "targetState",
            "policy",
        ],
        &["evidence", "causedBy"],
    )?;
    let application = app_id(&v["application"])?;
    let operation = app_ref(&v["operation"])?;
    let expected_head = app_ref(&v["expectedHead"])?;
    let target_state = app_ref(&v["targetState"])?;
    let policy = app_ref(&v["policy"])?;
    let mut evidence = match v.get("evidence") {
        Some(v) => app_refs(v, 15)?,
        None => Vec::new(),
    };
    let caused_by = opt_ref(v.get("causedBy").unwrap_or(&Value::Null))?;
    let candidate = restored_revision(&lifecycle.store, application, expected_head, target_state)?;
    let revision = put_record(&mut lifecycle.store, &candidate)?;
    let restoration = put_record(
        &mut lifecycle.store,
        &json!({"contract":"algal.application-restoration.v1", "application":application, "parentState":expected_head,"targetState":target_state,"candidateRevision":revision,"policy":policy}),
    )?;
    let current = parse_state(&get_record(&lifecycle.store, expected_head)?)?;
    evidence.push(restoration.clone());
    evidence.sort();
    evidence.dedup();
    let snapshot = lifecycle.commit(&json!({"application":application,"operation":operation,"kind":"restore","expectedHead":expected_head,"revision":revision,"memory":current.memory,"intents":[],"evidence":evidence,"causedBy":caused_by})).await?;
    Ok(json!({"snapshot":snapshot.digest,"revision":revision,"restoration":restoration}))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::Manifest;

    fn strategy(value: &str) -> Manifest {
        Manifest::parse(&json!({"contract":"algal.organism.v1","key":"organism:strategy","name":"Strategy",
            "interface":{"inputs":{},"outputs":{"strategy":{"cell":"out","port":"value"}}},
            "cells":[{"id":"out","kind":"const","outputs":{"value":{"type":"json","value":value}}}],"edges":[]})).unwrap()
    }

    fn fixture(store: &mut Store, incumbent: &Manifest) -> (String, String, String) {
        let reference = put_record(store, &json!("retained reference")).unwrap();
        let prior_manifest = store.put("manifests", &strategy("prior").value).unwrap();
        let current_manifest = store.put("manifests", &incumbent.value).unwrap();
        let revision = json!({"contract":"algal.application-revision.v1","application":"workspace","parent":null,
            "schema":reference,"queries":reference,"views":reference,"runtimeProfile":reference,"evaluationPolicy":reference,
            "capabilityRequirements":[],"entrypoints":[{"name":"strategy","manifest":prior_manifest,"applicability":reference,"queries":[reference],"capabilities":[],"maxGenerations":1}]});
        let prior_revision = put_record(store, &revision).unwrap();
        let state = json!({"contract":"algal.application-state.v1","application":"workspace","sequence":0,"epoch":0,"revision":prior_revision,"memory":reference,"previous":null,"transition":reference});
        let prior_state = put_record(store, &state).unwrap();
        let mut current = revision;
        current["parent"] = json!(prior_revision);
        current["entrypoints"][0]["manifest"] = json!(current_manifest);
        current["views"] = json!(put_record(store, &json!("current view")).unwrap());
        let current_revision = put_record(store, &current).unwrap();
        let mut next = state;
        next["previous"] = json!(prior_state);
        next["revision"] = json!(current_revision);
        next["sequence"] = json!(1);
        next["epoch"] = json!(1);
        let parent_state = put_record(store, &next).unwrap();
        (prior_state, parent_state, current_revision)
    }

    #[test]
    fn restoration_preserves_current_metadata_and_rejects_non_ancestry_or_tampering() {
        let dir = tempfile::tempdir().unwrap();
        let mut store = Store::open(dir.path(), true).unwrap();
        let (prior, parent, current) = fixture(&mut store, &strategy("current"));
        let restored = restored_revision(&store, "workspace", &parent, &prior).unwrap();
        assert_eq!(restored["parent"], current);
        assert_eq!(
            restored["views"],
            get_record(&store, &current).unwrap()["views"]
        );
        assert!(restored_revision(&store, "workspace", &parent, &parent).is_err());
        let policy = put_record(&mut store, &json!({"contract":"algal.application-restoration-policy.v1","application":"workspace","mode":"retained-pure-strategy-manifests"})).unwrap();
        let candidate = put_record(&mut store, &restored).unwrap();
        let record = json!({"contract":"algal.application-restoration.v1","application":"workspace","parentState":parent,"targetState":prior,"candidateRevision":candidate,"policy":policy});
        let evidence = put_record(&mut store, &record).unwrap();
        verify_restoration(&store, "workspace", &parent, &candidate, &[evidence]).unwrap();
        let mut altered = restored;
        altered["goals"] = json!([]);
        let candidate = put_record(&mut store, &altered).unwrap();
        let mut record = record;
        record["candidateRevision"] = json!(candidate);
        let evidence = put_record(&mut store, &record).unwrap();
        assert!(verify_restoration(&store, "workspace", &parent, &candidate, &[evidence]).is_err());
    }

    #[test]
    fn restoration_never_widens_budget_or_changes_effectful_harness() {
        for kind in ["budget", "agent", "interface"] {
            let dir = tempfile::tempdir().unwrap();
            let mut store = Store::open(dir.path(), true).unwrap();
            let mut candidate = strategy("current").value;
            match kind {
                "budget" => candidate["budgets"]["maxWork"] = json!(1),
                "agent" => {
                    candidate["cells"] = json!([{"id":"out","kind":"agent","prompt":"Never executed","output":{"kind":"text"}}])
                }
                _ => {
                    candidate["interface"]["outputs"] =
                        json!({"changed":{"cell":"out","port":"value"}})
                }
            }
            let (prior, parent, _) = fixture(&mut store, &Manifest::parse(&candidate).unwrap());
            assert!(
                restored_revision(&store, "workspace", &parent, &prior).is_err(),
                "{kind}"
            );
        }
        assert!(parse_policy(&json!({"contract":"algal.application-restoration-policy.v1","application":"workspace","mode":"retained-pure-strategy-manifests","extra":true})).is_err());
    }
}
