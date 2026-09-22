//! Immutable query objectives and bounded captured evidence. A supported goal
//! establishes its query, not success of any external procedure effect.
use crate::application::{Revision, Snapshot};
use crate::application_memory::{
    MemoryService, app_id, app_object, app_ref, app_tag, bounded_text, get_record,
    parse_derivation, parse_queries, parse_query,
};
use crate::canonical::digest;
use crate::contract::list;
use crate::store::Store;
use crate::{Error, Result};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};

const STATUSES: [&str; 8] = [
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
pub struct Goal {
    pub application: String,
    pub id: String,
    pub query: String,
    pub entrypoint: String,
    pub value: Value,
}
pub fn parse_goal(input: &Value) -> Result<Goal> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "id",
            "description",
            "query",
            "entrypoint",
        ],
    )?;
    app_tag(&v["contract"], "algal.application-goal.v1")?;
    bounded_text(&v["description"], 2048)?;
    Ok(Goal {
        application: app_id(&v["application"])?.into(),
        id: app_id(&v["id"])?.into(),
        query: app_ref(&v["query"])?.into(),
        entrypoint: app_id(&v["entrypoint"])?.into(),
        value: input.clone(),
    })
}
pub fn validate_goals(store: &Store, revision: &Revision) -> Result<Vec<(String, Goal)>> {
    let refs = revision.goals.as_deref().unwrap_or(&[]);
    if refs.is_empty() {
        return Ok(vec![]);
    }
    let queries = parse_queries(&get_record(store, &revision.queries)?)?;
    let mut ids = BTreeSet::new();
    let mut goals = Vec::new();
    for reference in refs {
        let goal = parse_goal(&get_record(store, reference)?)?;
        let entry = revision
            .entrypoints
            .iter()
            .find(|e| e.name == goal.entrypoint);
        if goal.application != revision.application
            || !ids.insert(goal.id.clone())
            || !entry.is_some_and(|e| e.queries.contains(&goal.query))
            || !queries.queries.contains(&goal.query)
        {
            return Err(Error::invalid(
                "Application goal is not bound to its revision",
            ));
        }
        if parse_query(&get_record(store, &goal.query)?)?.schema != revision.schema {
            return Err(Error::invalid(
                "Application goal query schema differs from revision",
            ));
        }
        goals.push((reference.clone(), goal));
    }
    Ok(goals)
}
pub fn parse_capture(input: &Value) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "goal",
            "definition",
            "state",
            "memory",
            "status",
            "derivation",
        ],
    )?;
    let reference = app_ref(&v["goal"])?;
    let goal = parse_goal(&v["definition"])?;
    app_ref(&v["state"])?;
    app_ref(&v["memory"])?;
    if digest(&goal.value)? != reference
        || !v["status"].as_str().is_some_and(|s| STATUSES.contains(&s))
    {
        return Err(Error::invalid("Invalid captured application goal"));
    }
    if v["derivation"].is_null() {
        if v["status"] != "unknown" {
            return Err(Error::invalid(
                "Goal status requires captured derivation evidence",
            ));
        }
    } else {
        app_ref(&v["derivation"])?;
    }
    Ok(input.clone())
}
pub fn bind_captures(snapshot: &Snapshot, input: &Value) -> Result<Value> {
    let goals = list(input, 8)?;
    let expected = snapshot.revision.goals.as_deref().unwrap_or(&[]);
    if goals.len() != expected.len() {
        return Err(Error::invalid(
            "Goal captures do not cover the captured revision",
        ));
    }
    let mut ids = BTreeSet::new();
    for (raw, reference) in goals.iter().zip(expected) {
        let row = parse_capture(raw)?;
        let goal = parse_goal(&row["definition"])?;
        if row["goal"] != *reference {
            return Err(Error::invalid(
                "Goal captures do not cover the captured revision",
            ));
        }
        if row["state"] != snapshot.digest
            || row["memory"] != snapshot.state.memory
            || goal.application != snapshot.state.application
            || !ids.insert(goal.id.clone())
            || !snapshot
                .revision
                .entrypoints
                .iter()
                .any(|e| e.name == goal.entrypoint && e.queries.contains(&goal.query))
        {
            return Err(Error::invalid(
                "Goal capture crosses the captured application state",
            ));
        }
    }
    Ok(input.clone())
}
/// Structural custody of an already-produced derivation; not replay authority.
pub fn capture_goals(
    store: &Store,
    snapshot: &Snapshot,
    evidence: &BTreeMap<String, String>,
) -> Result<Value> {
    let definitions = validate_goals(store, &snapshot.revision)?;
    if evidence
        .keys()
        .any(|id| !definitions.iter().any(|(_, g)| &g.id == id))
    {
        return Err(Error::invalid(
            "Evidence names an unselected application goal",
        ));
    }
    let mut rows = Vec::new();
    for (reference, goal) in definitions {
        let derivation = evidence.get(&goal.id);
        let mut status = "unknown".to_owned();
        if let Some(reference) = derivation {
            let d = parse_derivation(&get_record(store, reference)?)?;
            if d.application != goal.application
                || d.captured_state != snapshot.digest
                || d.memory != snapshot.state.memory
                || d.query != goal.query
            {
                return Err(Error::invalid(
                    "Goal derivation crosses the captured application state",
                ));
            }
            status = d.status;
        }
        rows.push(json!({"goal":reference,"definition":goal.value,"state":snapshot.digest,"memory":snapshot.state.memory,"status":status,"derivation":derivation}));
    }
    bind_captures(snapshot, &json!(rows))
}
pub fn evaluate_goals(
    memory: &MemoryService<'_>,
    store: &mut Store,
    snapshot: &Snapshot,
) -> Result<Value> {
    let definitions = validate_goals(store, &snapshot.revision)?;
    let mut evidence = BTreeMap::new();
    for (_, goal) in definitions {
        evidence.insert(
            goal.id,
            memory.query(store, &snapshot.digest, &goal.query)?.0,
        );
    }
    capture_goals(store, snapshot, &evidence)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{parse_revision, parse_state, parse_transition};
    use crate::application_view::{parse_view, parse_view_spec, project_view_with_goals};
    fn hash(value: &Value) -> String {
        digest(value).unwrap()
    }
    fn fixture() -> (Store, Snapshot, Value, Value) {
        let mut store = Store::default();
        let schema = hash(&json!("schema"));
        let manifest = hash(&json!("manifest"));
        let query = store.put("values", &json!({"contract":"algal.application-memory-query.v1","id":"available","schema":schema,"program":hash(&json!("program")),"procedures":[],"polarityColumn":1,"conflict":"single-value"})).unwrap();
        let queries = store
            .put(
                "values",
                &json!({"contract":"algal.application-memory-queries.v1","queries":[query]}),
            )
            .unwrap();
        let goal = json!({"contract":"algal.application-goal.v1","application":"demo","id":"discover","description":"Discover the current tool","query":query,"entrypoint":"run"});
        let goal_ref = store.put("values", &goal).unwrap();
        let revision = parse_revision(&json!({"contract":"algal.application-revision.v1","application":"demo","parent":null,"schema":schema,"queries":queries,"views":hash(&json!("views")),"runtimeProfile":hash(&json!("runtime")),"evaluationPolicy":hash(&json!("policy")),"goals":[goal_ref],"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]})).unwrap();
        let state = parse_state(&json!({"contract":"algal.application-state.v1","application":"demo","sequence":0,"epoch":0,"revision":hash(&revision.value),"memory":hash(&json!("memory")),"previous":null,"transition":hash(&json!("transition"))})).unwrap();
        let transition = parse_transition(&json!({"contract":"algal.application-transition.v1","application":"demo","operation":hash(&json!("operation")),"request":hash(&json!("request")),"kind":"create","previous":null,"revision":state.revision,"memory":state.memory,"intents":[],"evidence":[],"causedBy":null})).unwrap();
        let snapshot = Snapshot {
            digest: hash(&state.value),
            state,
            revision,
            transition,
        };
        let derivation = json!({"contract":"algal.application-memory-derivation.v1","application":"demo","capturedState":snapshot.digest,"memory":snapshot.state.memory,"query":query,"frontier":hash(&json!("frontier")),"engine":hash(&json!("engine")),"admission":hash(&json!("admission")),"status":"supported","conditional":true,"verified":true,"result":hash(&json!("result")),"snapshot":hash(&json!("facts")),"program":hash(&json!("program")),"sourceRefs":[],"work":1,"reason":null});
        (store, snapshot, goal, derivation)
    }
    #[test]
    fn typed_goals_reject_cross_application_query_and_entrypoint() {
        let (mut store, snapshot, goal, _) = fixture();
        assert_eq!(validate_goals(&store, &snapshot.revision).unwrap().len(), 1);
        for (key, value) in [
            ("application", json!("other")),
            ("entrypoint", json!("other")),
            ("query", json!(hash(&json!("other")))),
            ("contract", json!("wrong")),
        ] {
            let mut bad = goal.clone();
            bad[key] = value;
            let mut revision = snapshot.revision.clone();
            revision.goals = Some(vec![store.put("values", &bad).unwrap()]);
            assert!(validate_goals(&store, &revision).is_err());
        }
        let mut bad = goal;
        bad["description"] = json!("é".repeat(1025));
        assert!(parse_goal(&bad).is_err());
        let mut refs: Vec<_> = (0..9).map(|i| hash(&json!(i))).collect();
        refs.sort();
        for goals in [
            Value::Null,
            json!([refs[0], refs[0]]),
            json!(refs),
            json!([refs[1], refs[0]]),
        ] {
            let mut malformed = snapshot.revision.value.clone();
            malformed["goals"] = goals;
            assert!(parse_revision(&malformed).is_err());
        }
        let mut legacy = snapshot.revision.value.clone();
        legacy.as_object_mut().unwrap().remove("goals");
        assert!(parse_revision(&legacy).unwrap().goals.is_none());
        legacy["goals"] = json!([]);
        assert_eq!(parse_revision(&legacy).unwrap().goals, Some(vec![]));
    }
    #[test]
    fn captured_goal_preserves_status_and_rejects_stale_derivations() {
        let (mut store, snapshot, _, derivation) = fixture();
        let unknown = capture_goals(&store, &snapshot, &BTreeMap::new()).unwrap();
        assert_eq!(unknown[0]["status"], "unknown");
        assert!(unknown[0]["derivation"].is_null());
        for status in STATUSES {
            let mut d = derivation.clone();
            d["status"] = json!(status);
            let evidence = BTreeMap::from([("discover".into(), store.put("values", &d).unwrap())]);
            assert_eq!(
                capture_goals(&store, &snapshot, &evidence).unwrap()[0]["status"],
                status
            );
        }
        for (key, value) in [
            ("application", json!("other")),
            ("capturedState", json!(hash(&json!("other")))),
            ("memory", json!(hash(&json!("other")))),
            ("query", json!(hash(&json!("other")))),
            ("contract", json!("wrong")),
            ("verified", json!(false)),
        ] {
            let mut d = derivation.clone();
            d[key] = value;
            let evidence = BTreeMap::from([("discover".into(), store.put("values", &d).unwrap())]);
            assert!(capture_goals(&store, &snapshot, &evidence).is_err());
        }
        assert!(bind_captures(&snapshot, &json!([])).is_err());
    }
    #[test]
    fn goal_projection_is_fenced_display_data_without_execution_actions() {
        let (store, snapshot, _, _) = fixture();
        let goals = capture_goals(&store, &snapshot, &BTreeMap::new()).unwrap();
        let spec = parse_view_spec(&json!({"contract":"algal.application-view-spec.v1","title":"Goals","widgets":["goals","procedures"]})).unwrap();
        let view = project_view_with_goals(&snapshot, &spec, None, &BTreeMap::new(), Some(&goals))
            .unwrap();
        assert_eq!(view["goals"], goals);
        assert_eq!(view["actions"], json!([]));
        let mut bad = view.clone();
        bad["goals"][0]["state"] = json!(hash(&json!("later")));
        assert!(parse_view(&bad).is_err());
        let mut bad = view.clone();
        bad["goals"][0]["definition"]["description"] = json!("altered");
        assert!(parse_view(&bad).is_err());
        let mut bad = view;
        bad["goals"][0]["status"] = json!("supported");
        assert!(parse_view(&bad).is_err());
    }
}
