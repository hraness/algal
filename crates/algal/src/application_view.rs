//! Pure, bounded projection of one captured application state — the native
//! port of `src/application-view.ts`. The renderer receives data and fenced
//! actions; it never probes, dispatches, or resolves a mutable latest pointer.

use serde_json::{Value, json};
use std::collections::BTreeMap;

use crate::application::{Service, Snapshot};
use crate::application_memory::{
    app_id, app_object, app_object_opt, app_ref, app_tag, bounded_text, get_record,
};
use crate::canonical::canonical;
use crate::contract::{integer, list};
use crate::{Error, Result};

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

const VIEW_SPEC: &str = "algal.application-view-spec.v1";
const VIEW: &str = "algal.application-view.v1";
const PROFILE: &str = "algal.application-runtime-profile.v1";
const WIDGETS: [&str; 5] = ["procedures", "memory", "history", "investigations", "goals"];
const STATUSES: [&str; 8] = [
    "unknown",
    "supported",
    "stale",
    "opposed",
    "conflicted",
    "exhausted",
    "failed",
    "cancelled",
];

pub struct ViewSpec {
    pub title: String,
    pub widgets: Vec<String>,
}

fn widgets(value: &Value) -> Result<Vec<String>> {
    let mut out = Vec::new();
    for item in list(value, 5)? {
        let name = item
            .as_str()
            .filter(|s| WIDGETS.contains(s))
            .ok_or_else(|| fail("Unknown view widget"))?;
        out.push(name.to_owned());
    }
    if out.windows(2).any(|w| w[0] >= w[1]) {
        return Err(fail("View widgets must be sorted and unique"));
    }
    Ok(out)
}

pub fn parse_view_spec(input: &Value) -> Result<ViewSpec> {
    let v = app_object(input, &["contract", "title", "widgets"])?;
    app_tag(&v["contract"], VIEW_SPEC)?;
    Ok(ViewSpec {
        title: bounded_text(&v["title"], 256)?,
        widgets: widgets(&v["widgets"])?,
    })
}

pub fn parse_runtime_profile(input: &Value) -> Result<Value> {
    let v = app_object(input, &["contract", "runtime", "policy"])?;
    app_tag(&v["contract"], PROFILE)?;
    if v["runtime"].as_str() != Some("bun-native-memory")
        || v["policy"].as_str() != Some("pure-case-evaluation.v1")
    {
        return Err(fail("Unsupported application runtime profile"));
    }
    Ok(input.clone())
}

/// Caller-supplied applicability evidence for one entrypoint. A `supported`
/// result is only actionable when its producer records the exact captured
/// state and procedure it queried.
#[derive(Clone)]
pub struct Applicability {
    pub status: String,
    pub query_result: Option<QueryResult>,
}

#[derive(Clone)]
pub struct QueryResult {
    pub digest: String,
    pub state: String,
    pub procedure: String,
}

fn parse_applicability(value: &Value) -> Result<Applicability> {
    let a = app_object_opt(value, &["status"], &["queryResult"])?;
    let status = a["status"]
        .as_str()
        .filter(|s| STATUSES.contains(s))
        .ok_or_else(|| fail("Invalid view applicability"))?
        .to_owned();
    let query_result = match a.get("queryResult") {
        Some(raw) if !raw.is_null() => {
            let q = app_object(raw, &["digest", "state", "procedure"])?;
            Some(QueryResult {
                digest: app_ref(&q["digest"])?.to_owned(),
                state: app_ref(&q["state"])?.to_owned(),
                procedure: app_ref(&q["procedure"])?.to_owned(),
            })
        }
        _ => None,
    };
    Ok(Applicability {
        status,
        query_result,
    })
}

/// Project `snapshot` into a bounded `algal.application-view.v1` record. All
/// fencing is exact: history must terminate at the captured state, actions and
/// supported applicability must name it, and the byte bound is checked on the
/// emitted record.
pub fn project_view(
    snapshot: &Snapshot,
    spec: &ViewSpec,
    history: Option<&[Snapshot]>,
    applicability: &BTreeMap<String, Applicability>,
) -> Result<Value> {
    project_view_with_goals(snapshot, spec, history, applicability, None)
}

pub fn project_view_with_goals(
    snapshot: &Snapshot,
    spec: &ViewSpec,
    history: Option<&[Snapshot]>,
    applicability: &BTreeMap<String, Applicability>,
    goals: Option<&Value>,
) -> Result<Value> {
    project_view_with_evidence(snapshot, spec, history, applicability, goals, None)
}

pub fn project_view_with_evidence(
    snapshot: &Snapshot,
    spec: &ViewSpec,
    history: Option<&[Snapshot]>,
    applicability: &BTreeMap<String, Applicability>,
    goals: Option<&Value>,
    evidence: Option<&Value>,
) -> Result<Value> {
    let mut captured_applicability = applicability.clone();
    if let Some(evidence) = evidence {
        let evidence = crate::application_view_evidence::parse(
            evidence,
            &snapshot.digest,
            &snapshot.state.memory,
        )?;
        for entry in &snapshot.revision.entrypoints {
            let query = evidence["queries"]
                .as_array()
                .unwrap()
                .iter()
                .find(|q| q["query"] == entry.applicability)
                .ok_or_else(|| fail("View evidence omits selected applicability query"))?;
            let status = query["status"].as_str().unwrap();
            if let Some(explicit) = applicability.get(&entry.name) {
                if explicit.status != status
                    || explicit
                        .query_result
                        .as_ref()
                        .is_some_and(|q| query["derivation"] != q.digest)
                {
                    return Err(fail("Applicability conflicts with captured query evidence"));
                }
            } else {
                captured_applicability.insert(
                    entry.name.clone(),
                    Applicability {
                        status: status.into(),
                        query_result: None,
                    },
                );
            }
        }
    }
    let applicability = &captured_applicability;
    let captured_goals = if snapshot.revision.goals.is_some() || goals.is_some() {
        Some(crate::application_goal::bind_captures(
            snapshot,
            goals.unwrap_or(&json!([])),
        )?)
    } else {
        None
    };
    let empty;
    let history = match history {
        Some(h) => h,
        None => {
            empty = [snapshot.clone()];
            &empty[..]
        }
    };
    if history.len() > 4096 {
        return Err(fail("View history bound exceeded"));
    }
    if history.is_empty() || history[history.len() - 1].digest != snapshot.digest {
        return Err(fail("View history must terminate at the captured state"));
    }
    for (i, item) in history.iter().enumerate() {
        if item.state.application != snapshot.state.application {
            return Err(fail("View history crosses application boundaries"));
        }
        if i > 0 && item.state.sequence <= history[i - 1].state.sequence {
            return Err(fail("View history sequences must increase"));
        }
    }
    let procedures: Vec<Value> = snapshot
        .revision
        .entrypoints
        .iter()
        .map(|entry| {
            json!({
                "name": entry.name,
                "manifest": entry.manifest,
                "applicability": applicability
                    .get(&entry.name)
                    .map(|a| a.status.as_str())
                    .unwrap_or("unknown"),
            })
        })
        .collect();
    let mut actions = Vec::new();
    for entry in &snapshot.revision.entrypoints {
        if let Some(a) = applicability.get(&entry.name)
            && a.status == "supported"
            && let Some(result) = &a.query_result
        {
            if result.state != snapshot.digest || result.procedure != entry.manifest {
                return Err(fail(
                    "Applicability result is not bound to the captured application state",
                ));
            }
            actions.push(json!({
                "kind": "execute-procedure",
                "expectedState": snapshot.digest,
                "procedure": entry.manifest,
                "queryResult": result.digest,
            }));
        }
    }
    let investigations: Vec<Value> = snapshot
        .transition
        .intents
        .iter()
        .map(|intent| json!({"intent": intent, "expectedState": snapshot.digest}))
        .collect();
    let mut view = json!({
        "contract": VIEW,
        "application": snapshot.state.application,
        "state": snapshot.digest,
        "revision": snapshot.state.revision,
        "memory": snapshot.state.memory,
        "title": spec.title,
        "widgets": spec.widgets,
        "procedures": procedures,
        "history": history.iter().skip(history.len().saturating_sub(128)).map(|item| json!({
            "state": item.digest,
            "sequence": item.state.sequence,
            "revision": item.state.revision,
            "memory": item.state.memory,
        })).collect::<Vec<Value>>(),
        "investigations": investigations,
        "actions": actions,
        "truncated": history.len() > 128,
    });
    if let Some(goals) = captured_goals {
        view["goals"] = goals;
    }
    if let Some(evidence) = evidence {
        view["evidence"] = evidence.clone();
    }
    if canonical(&view)?.len() > 262_144 {
        return Err(fail("Application view byte bound exceeded"));
    }
    parse_view(&view)
}

pub fn load_view_spec(service: &Service, reference: &str) -> Result<ViewSpec> {
    parse_view_spec(&get_record(&service.store, reference)?)
}

/// Closed `algal.application-view.v1` validator — mirrors
/// `parseApplicationView`: every record is checked against its own fences, so
/// views crossing states, applications, or unlisted procedures are rejected.
pub fn parse_view(input: &Value) -> Result<Value> {
    let v = app_object_opt(
        input,
        &[
            "contract",
            "application",
            "state",
            "revision",
            "memory",
            "title",
            "widgets",
            "procedures",
            "history",
            "investigations",
            "actions",
            "truncated",
        ],
        &["goals", "evidence"],
    )?;
    app_tag(&v["contract"], VIEW)?;
    let application = app_id(&v["application"])?.to_owned();
    let state = app_ref(&v["state"])?.to_owned();
    let revision = app_ref(&v["revision"])?.to_owned();
    let memory = app_ref(&v["memory"])?.to_owned();
    let mut procedures = Vec::new();
    let mut procedure_names = std::collections::BTreeSet::new();
    for raw in list(&v["procedures"], 32)? {
        let p = app_object(raw, &["name", "manifest", "applicability"])?;
        let applicability = p["applicability"]
            .as_str()
            .filter(|s| STATUSES.contains(s))
            .ok_or_else(|| fail("Invalid view applicability"))?;
        if !procedure_names.insert(app_id(&p["name"])?.to_owned()) {
            return Err(fail("Duplicate view procedure"));
        }
        procedures.push(json!({
            "name": app_id(&p["name"])?,
            "manifest": app_ref(&p["manifest"])?,
            "applicability": applicability,
        }));
    }
    let goals = if let Some(raw) = v.get("goals") {
        let mut refs = Vec::new();
        let mut ids = std::collections::BTreeSet::new();
        for row in list(raw, 8)? {
            let row = crate::application_goal::parse_capture(row)?;
            let goal = crate::application_goal::parse_goal(&row["definition"])?;
            let reference = app_ref(&row["goal"])?;
            if row["state"] != state
                || row["memory"] != memory
                || goal.application != application
                || !ids.insert(goal.id)
                || !procedures.iter().any(|p| p["name"] == goal.entrypoint)
                || refs
                    .last()
                    .is_some_and(|last: &String| last.as_str() >= reference)
            {
                return Err(fail("Goal capture crosses the captured application state"));
            }
            refs.push(reference.to_owned());
        }
        Some(raw.clone())
    } else {
        None
    };
    let mut history = Vec::new();
    for raw in list(&v["history"], 128)? {
        let h = app_object(raw, &["state", "sequence", "revision", "memory"])?;
        history.push(json!({
            "state": app_ref(&h["state"])?,
            "sequence": integer(&h["sequence"], 0, 4095)?,
            "revision": app_ref(&h["revision"])?,
            "memory": app_ref(&h["memory"])?,
        }));
    }
    let last = history
        .last()
        .ok_or_else(|| fail("View history does not terminate at the captured state"))?;
    if last["state"].as_str() != Some(state.as_str())
        || last["revision"].as_str() != Some(revision.as_str())
        || last["memory"].as_str() != Some(memory.as_str())
    {
        return Err(fail(
            "View history does not terminate at the captured state",
        ));
    }
    for i in 1..history.len() {
        if history[i]["sequence"].as_u64() <= history[i - 1]["sequence"].as_u64() {
            return Err(fail("View history sequences must increase"));
        }
    }
    let mut investigations = Vec::new();
    for raw in list(&v["investigations"], 32)? {
        let i = app_object(raw, &["intent", "expectedState"])?;
        let expected = app_ref(&i["expectedState"])?;
        if expected != state {
            return Err(fail("Investigation is not fenced to the captured state"));
        }
        investigations.push(json!({
            "intent": app_ref(&i["intent"])?,
            "expectedState": expected,
        }));
    }
    let mut actions = Vec::new();
    for raw in list(&v["actions"], 32)? {
        let a = crate::contract::object(raw)?;
        match a.get("kind").and_then(Value::as_str) {
            Some("investigate") => {
                let i = app_object(raw, &["kind", "expectedState", "intent"])?;
                let expected = app_ref(&i["expectedState"])?;
                if expected != state
                    || !investigations
                        .iter()
                        .any(|row| row["intent"] == i["intent"])
                {
                    return Err(fail(
                        "Investigation action is not fenced to the captured state",
                    ));
                }
                actions.push(json!({
                    "kind": "investigate",
                    "expectedState": expected,
                    "intent": app_ref(&i["intent"])?,
                }));
            }
            _ => {
                let e = app_object(raw, &["kind", "expectedState", "procedure", "queryResult"])?;
                app_tag(&e["kind"], "execute-procedure")?;
                let expected = app_ref(&e["expectedState"])?;
                let procedure = app_ref(&e["procedure"])?;
                if expected != state
                    || !procedures.iter().any(|p| {
                        p["manifest"].as_str() == Some(procedure)
                            && p["applicability"] == "supported"
                    })
                {
                    return Err(fail("Procedure action is not fenced to the captured state"));
                }
                actions.push(json!({
                    "kind": "execute-procedure",
                    "expectedState": expected,
                    "procedure": procedure,
                    "queryResult": app_ref(&e["queryResult"])?,
                }));
            }
        }
    }
    let title = bounded_text(&v["title"], 256)?;
    let spec_widgets = widgets(&v["widgets"])?;
    let truncated = v["truncated"]
        .as_bool()
        .ok_or_else(|| fail("Invalid view truncation marker"))?;
    let mut output = json!({
        "contract": VIEW,
        "application": application,
        "state": state,
        "revision": revision,
        "memory": memory,
        "title": title,
        "widgets": spec_widgets,
        "procedures": procedures,
        "history": history,
        "investigations": investigations,
        "actions": actions,
        "truncated": truncated,
    });
    if let Some(goals) = goals {
        output["goals"] = goals;
    }
    if let Some(evidence) = v.get("evidence") {
        output["evidence"] = crate::application_view_evidence::parse(evidence, &state, &memory)?;
        if evidence["revisions"].as_array().unwrap().last().unwrap()["revision"] != revision {
            return Err(fail("Evidence revision differs from captured view"));
        }
        for row in evidence["work"].as_array().unwrap() {
            if let Some(source) = output["history"]
                .as_array()
                .unwrap()
                .iter()
                .find(|h| h["state"] == row["sourceState"])
                && (source["revision"] != row["revision"] || source["memory"] != row["memory"])
            {
                return Err(fail("Work evidence differs from captured history"));
            }
        }
        for action in output["actions"].as_array().unwrap() {
            if action["kind"] == "execute-procedure"
                && !evidence["queries"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|q| q["status"] == "supported" && q["derivation"] == action["queryResult"])
            {
                return Err(fail("View action lacks matching captured query evidence"));
            }
        }
    }
    Ok(output)
}

/// `algal application view <input>` — resolves the current head, projects the
/// captured state, and emits the fenced view record. Input record:
/// `{application, spec: <spec digest>, applicability?: {name: {status,
/// queryResult?}}}`.
pub fn view(service: &Service, input: &Value) -> Result<Value> {
    let v = app_object_opt(
        input,
        &["application", "spec"],
        &[
            "applicability",
            "goalDerivations",
            "evidence",
            "derivations",
        ],
    )?;
    let application = app_id(&v["application"])?;
    let spec_ref = app_ref(&v["spec"])?;
    let mut applicability = BTreeMap::new();
    if let Some(raw) = v.get("applicability")
        && !raw.is_null()
    {
        for (name, row) in crate::contract::object(raw)? {
            applicability.insert(name.clone(), parse_applicability(row)?);
        }
    }
    let history = service.history(application)?;
    let snapshot = history
        .last()
        .ok_or_else(|| fail("Missing application state"))?;
    let spec = load_view_spec(service, spec_ref)?;
    let mut evidence = BTreeMap::new();
    if let Some(raw) = v.get("goalDerivations") {
        for (id, reference) in crate::contract::object(raw)? {
            evidence.insert(
                app_id(&json!(id))?.to_owned(),
                app_ref(reference)?.to_owned(),
            );
        }
    }
    let goals = crate::application_goal::capture_goals(&service.store, snapshot, &evidence)?;
    let mut captured_evidence = None;
    if let Some(requested) = v.get("evidence") {
        if requested != &json!(true) {
            return Err(fail("Evidence capture requires literal true"));
        }
        let derivations = match v.get("derivations") {
            Some(refs) => crate::application_memory::app_refs(refs, 32)?,
            None => vec![],
        };
        captured_evidence = Some(crate::application_view_evidence::collect(
            service,
            &history,
            &derivations,
        )?);
    } else if v.contains_key("derivations") {
        return Err(fail("Derivations require evidence capture"));
    }
    project_view_with_evidence(
        snapshot,
        &spec,
        Some(&history),
        &applicability,
        snapshot.revision.goals.as_ref().map(|_| &goals),
        captured_evidence.as_ref(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{Entrypoint, Revision, State, Transition, TransitionKind};
    use crate::application_memory::app_json;
    use crate::canonical::digest;
    use serde_json::json;

    fn hashed(value: &Value) -> String {
        digest(&app_json(value).unwrap()).unwrap()
    }

    fn snapshot() -> Snapshot {
        let manifest = hashed(&json!("manifest"));
        let query = hashed(&json!("query"));
        Snapshot {
            digest: hashed(&json!({"snap": 1})),
            state: State {
                application: "demo".to_owned(),
                sequence: 0,
                epoch: 0,
                revision: hashed(&json!({"rev": 1})),
                memory: hashed(&json!({"mem": 1})),
                previous: None,
                transition: hashed(&json!({"tr": 1})),
                value: Value::Null,
            },
            transition: Transition {
                application: "demo".to_owned(),
                operation: hashed(&json!({"op": 1})),
                request: hashed(&json!({"req": 1})),
                kind: TransitionKind::Create,
                previous: None,
                revision: hashed(&json!({"rev": 1})),
                memory: hashed(&json!({"mem": 1})),
                intents: vec![],
                evidence: vec![],
                caused_by: None,
                value: Value::Null,
            },
            revision: Revision {
                application: "demo".to_owned(),
                parent: None,
                schema: hashed(&json!({"s": 1})),
                queries: hashed(&json!({"q": 1})),
                views: hashed(&json!({"v": 1})),
                runtime_profile: hashed(&json!({"p": 1})),
                evaluation_policy: hashed(&json!({"e": 1})),
                goals: None,
                capability_requirements: vec![],
                entrypoints: vec![Entrypoint {
                    name: "run".to_owned(),
                    manifest,
                    applicability: query.clone(),
                    max_generations: 1,
                    capabilities: vec![],
                    queries: vec![query],
                }],
                value: Value::Null,
            },
        }
    }

    fn spec() -> ViewSpec {
        parse_view_spec(&json!({
            "contract": "algal.application-view-spec.v1",
            "title": "Demo",
            "widgets": ["procedures"],
        }))
        .unwrap()
    }

    #[test]
    fn parses_fixed_widgets_and_runtime_profile() {
        let spec = parse_view_spec(&json!({
            "contract": "algal.application-view-spec.v1",
            "title": "Demo",
            "widgets": ["history", "procedures"],
        }))
        .unwrap();
        assert_eq!(spec.widgets, vec!["history", "procedures"]);
        assert!(
            parse_view_spec(&json!({
                "contract": "algal.application-view-spec.v1",
                "title": "Demo",
                "widgets": ["html"],
            }))
            .is_err()
        );
        assert_eq!(
            parse_runtime_profile(&json!({
                "contract": "algal.application-runtime-profile.v1",
                "runtime": "bun-native-memory",
                "policy": "pure-case-evaluation.v1",
            }))
            .unwrap()["policy"],
            json!("pure-case-evaluation.v1")
        );
        assert!(
            parse_runtime_profile(&json!({
                "contract": "algal.application-runtime-profile.v1",
                "runtime": "other",
                "policy": "pure-case-evaluation.v1",
            }))
            .is_err()
        );
    }

    #[test]
    fn preserves_incomplete_applicability_and_rejects_actions() {
        let current = snapshot();
        for status in ["exhausted", "failed", "cancelled"] {
            let applicability = BTreeMap::from([(
                "run".to_owned(),
                Applicability {
                    status: status.to_owned(),
                    query_result: None,
                },
            )]);
            let mut view = project_view(&current, &spec(), None, &applicability).unwrap();
            assert_eq!(view["procedures"][0]["applicability"], status);
            assert_eq!(view["actions"], json!([]));
            view["actions"] = json!([{"kind":"execute-procedure","expectedState":current.digest,"procedure":current.revision.entrypoints[0].manifest,"queryResult":hashed(&json!("unsupported"))}]);
            assert!(parse_view(&view).is_err());
        }
    }

    #[test]
    fn long_history_retains_captured_tail_with_truncation() {
        let history: Vec<_> = (0..130)
            .map(|sequence| {
                let mut item = snapshot();
                item.state.sequence = sequence;
                item.digest = hashed(&json!({"sequence": sequence}));
                item
            })
            .collect();
        let view = project_view(&history[129], &spec(), Some(&history), &BTreeMap::new()).unwrap();
        assert_eq!(view["truncated"], true);
        assert_eq!(view["history"].as_array().unwrap().len(), 128);
        assert_eq!(view["history"][0]["sequence"], 2);
        assert_eq!(view["history"][127]["state"], history[129].digest);
    }

    #[test]
    fn projects_captured_state_and_fences_actions() {
        let current = snapshot();
        let result = hashed(&json!({"qr": 1}));
        let mut applicability = BTreeMap::new();
        applicability.insert(
            "run".to_owned(),
            Applicability {
                status: "supported".to_owned(),
                query_result: Some(QueryResult {
                    digest: result.clone(),
                    state: current.digest.clone(),
                    procedure: current.revision.entrypoints[0].manifest.clone(),
                }),
            },
        );
        let view = project_view(&current, &spec(), None, &applicability).unwrap();
        assert_eq!(view["state"], json!(current.digest));
        assert_eq!(
            view["actions"],
            json!([{
                "kind": "execute-procedure",
                "expectedState": current.digest,
                "procedure": current.revision.entrypoints[0].manifest,
                "queryResult": result,
            }])
        );
        assert_eq!(view["investigations"], json!([]));
        assert_eq!(view["history"][0]["state"], json!(current.digest));
    }

    #[test]
    fn rejects_records_crossing_the_captured_state() {
        let current = snapshot();
        let other = hashed(&json!("other-state"));
        let result = hashed(&json!({"qr": 1}));
        let mut applicability = BTreeMap::new();
        applicability.insert(
            "run".to_owned(),
            Applicability {
                status: "supported".to_owned(),
                query_result: Some(QueryResult {
                    digest: result,
                    state: other.clone(),
                    procedure: current.revision.entrypoints[0].manifest.clone(),
                }),
            },
        );
        assert!(project_view(&current, &spec(), None, &applicability).is_err());

        let view = project_view(&current, &spec(), None, &BTreeMap::new()).unwrap();
        let mut crossed = view.clone();
        crossed["actions"] = json!([{
            "kind": "investigate",
            "expectedState": other,
            "intent": hashed(&json!("intent")),
        }]);
        assert!(parse_view(&crossed).is_err());
        let mut terminated = view.clone();
        terminated["history"][0]["state"] = json!(other);
        assert!(parse_view(&terminated).is_err());
        assert!(parse_view(&view).is_ok());
    }
}
