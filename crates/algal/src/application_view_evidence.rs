//! Bounded, read-only evidence joins for one captured application history.
//! Captured producer claims and separately observed dispatch records grant no
//! authority and do not imply a replay or an atomic outbox snapshot.
use crate::application::{
    DispatchPlan, Service, Snapshot, WorkIntent, parse_intent, parse_investigation_request,
};
use crate::application_memory::{
    self as mem, app_id, app_object, app_ref, app_refs, app_tag, bounded_text, get_record, opt_ref,
};
use crate::canonical::{canonical, digest};
use crate::contract::{integer, list};
use crate::{Error, Result};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};

const CONTRACT: &str = "algal.application-view-evidence.v1";
fn fail(message: &str) -> Error {
    Error::invalid(message)
}
fn nullable_text(value: &Value, max: usize) -> Result<()> {
    if !value.is_null() {
        bounded_text(value, max)?;
    }
    Ok(())
}
fn choice(value: &Value, choices: &[&str]) -> Result<()> {
    if !value.as_str().is_some_and(|s| choices.contains(&s)) {
        return Err(fail("Invalid view evidence variant"));
    }
    Ok(())
}
fn unique(rows: &[Value], key: &str) -> Result<()> {
    let mut keys = BTreeSet::new();
    for row in rows {
        if !keys.insert(app_ref(&row[key])?) {
            return Err(fail("Duplicate view evidence reference"));
        }
    }
    Ok(())
}
fn sorted(rows: &[Value], key: &str) -> Result<()> {
    unique(rows, key)?;
    if rows
        .windows(2)
        .any(|w| w[0][key].as_str() >= w[1][key].as_str())
    {
        return Err(fail("View evidence references must be sorted and unique"));
    }
    Ok(())
}

/// Validate closed display summaries and their capture fences. References are
/// not authentication; the collector is responsible for their store bindings.
pub fn parse(input: &Value, state: &str, memory: &str) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "contract",
            "state",
            "memory",
            "queries",
            "probes",
            "sources",
            "revisions",
            "work",
            "truncated",
        ],
    )?;
    app_tag(&v["contract"], CONTRACT)?;
    if app_ref(&v["state"])? != state || app_ref(&v["memory"])? != memory {
        return Err(fail("View evidence crosses the captured state"));
    }
    let queries = list(&v["queries"], 32)?;
    sorted(queries, "query")?;
    for row in queries {
        let q = app_object(
            row,
            &[
                "query",
                "id",
                "program",
                "derivation",
                "status",
                "reason",
                "result",
                "facts",
                "sourceRefs",
                "procedures",
                "claimedVerified",
            ],
        )?;
        app_id(&q["id"])?;
        app_ref(&q["program"])?;
        let derivation = opt_ref(&q["derivation"])?;
        choice(&q["status"], &mem::STATUSES)?;
        nullable_text(&q["reason"], 256)?;
        let result = opt_ref(&q["result"])?;
        let facts = opt_ref(&q["facts"])?;
        let sources = app_refs(&q["sourceRefs"], 128)?;
        app_refs(&q["procedures"], 16)?;
        let verified = q["claimedVerified"]
            .as_bool()
            .ok_or_else(|| fail("Invalid view evidence verification flag"))?;
        if derivation.is_none()
            && (q["status"] != "unknown"
                || !q["reason"].is_null()
                || result.is_some()
                || facts.is_some()
                || !sources.is_empty()
                || verified)
        {
            return Err(fail("Query evidence requires a derivation"));
        }
        if ["supported", "opposed", "conflicted"]
            .contains(&q["status"].as_str().unwrap_or_default())
            && (result.is_none() || facts.is_none() || !verified)
        {
            return Err(fail("Resolved query lacks retained evidence"));
        }
    }
    let probes = list(&v["probes"], 32)?;
    sorted(probes, "procedure")?;
    for row in probes {
        let p = app_object(
            row,
            &[
                "procedure",
                "id",
                "manifest",
                "decoder",
                "dependencies",
                "prerequisite",
                "budgets",
            ],
        )?;
        app_id(&p["id"])?;
        app_ref(&p["manifest"])?;
        app_ref(&p["decoder"])?;
        opt_ref(&p["prerequisite"])?;
        let mut previous: Option<&str> = None;
        for dep in list(&p["dependencies"], 8)? {
            let id = app_id(dep)?;
            if previous.is_some_and(|last| last >= id) {
                return Err(fail("Probe dependencies must be sorted and unique"));
            }
            previous = Some(id);
        }
        if !p["budgets"].is_null() {
            let b = app_object(
                &p["budgets"],
                &["maxSteps", "maxWork", "maxAgentCalls", "maxOutputBytes"],
            )?;
            integer(&b["maxSteps"], 1, 1024)?;
            integer(&b["maxWork"], 1, 100_000_000)?;
            integer(&b["maxAgentCalls"], 0, 64)?;
            integer(&b["maxOutputBytes"], 1, 262_144)?;
        }
    }
    let sources = list(&v["sources"], 32)?;
    sorted(sources, "observation")?;
    for row in sources {
        let s = app_object(
            row,
            &[
                "observation",
                "scope",
                "procedure",
                "raw",
                "receipt",
                "decoder",
                "admission",
            ],
        )?;
        for key in [
            "scope",
            "procedure",
            "raw",
            "receipt",
            "decoder",
            "admission",
        ] {
            app_ref(&s[key])?;
        }
    }
    let revisions = list(&v["revisions"], 32)?;
    unique(revisions, "state")?;
    for row in revisions {
        let r = app_object(row, &["state", "revision", "parent", "kind", "evidence"])?;
        app_ref(&r["revision"])?;
        opt_ref(&r["parent"])?;
        choice(
            &r["kind"],
            &[
                "create",
                "memory",
                "investigate",
                "activate",
                "migrate",
                "restore",
                "propose",
            ],
        )?;
        app_refs(&r["evidence"], 16)?;
    }
    if revisions.last().is_none_or(|r| r["state"] != state) {
        return Err(fail(
            "Evidence revision history must terminate at the captured state",
        ));
    }
    let work = list(&v["work"], 32)?;
    unique(work, "intent")?;
    for row in work {
        let w = app_object(
            row,
            &[
                "intent",
                "sourceState",
                "revision",
                "memory",
                "kind",
                "status",
                "request",
                "query",
                "procedures",
                "process",
                "binding",
                "result",
                "reason",
            ],
        )?;
        for key in ["sourceState", "revision", "memory"] {
            app_ref(&w[key])?;
        }
        choice(&w["kind"], &["start-episode", "deliver"])?;
        choice(
            &w["status"],
            &["pending", "started", "settled", "blocked", "uncertain"],
        )?;
        let request = opt_ref(&w["request"])?;
        let query = opt_ref(&w["query"])?;
        let procedures = app_refs(&w["procedures"], 16)?;
        let binding = opt_ref(&w["binding"])?;
        let result = opt_ref(&w["result"])?;
        if !w["process"].is_null() {
            app_id(&w["process"])?;
        }
        nullable_text(&w["reason"], 1024)?;
        if request.is_some() != query.is_some()
            || (request.is_none() && !procedures.is_empty())
            || (request.is_some() && w["kind"] != "deliver")
            || binding.is_some() != !w["process"].is_null()
            || (binding.is_some() && w["kind"] != "start-episode")
            || (w["status"] == "settled") != result.is_some()
            || (matches!(w["status"].as_str(), Some("blocked" | "uncertain")))
                != !w["reason"].is_null()
            || (w["status"] == "pending" && binding.is_some())
        {
            return Err(fail("Inconsistent captured work evidence"));
        }
    }
    let truncated = app_object(
        &v["truncated"],
        &["queries", "probes", "sources", "revisions", "work"],
    )?;
    for value in truncated.values() {
        if !value.is_boolean() {
            return Err(fail("Invalid evidence truncation marker"));
        }
    }
    if canonical(input)?.len() > 262_144 {
        return Err(fail("Application evidence byte bound exceeded"));
    }
    Ok(input.clone())
}

pub fn collect(service: &Service, history: &[Snapshot], derivations: &[String]) -> Result<Value> {
    let current = history
        .last()
        .ok_or_else(|| fail("Missing captured application history"))?;
    if history.len() > 4096 || derivations.len() > 32 {
        return Err(fail("Evidence input bound exceeded"));
    }
    let app = &current.state.application;
    app_refs(&json!(derivations), 32)?;
    for (index, item) in history.iter().enumerate() {
        if item.state.application != *app
            || digest(&item.state.value)? != item.digest
            || get_record(&service.store, &item.digest)? != item.state.value
            || get_record(&service.store, &item.state.revision)? != item.revision.value
            || get_record(&service.store, &item.state.transition)? != item.transition.value
            || item.state.sequence != index
            || item.state.previous.as_deref()
                != index.checked_sub(1).map(|i| history[i].digest.as_str())
        {
            return Err(fail("Evidence history is not one complete captured chain"));
        }
    }
    let memory = mem::parse_snapshot(&get_record(&service.store, &current.state.memory)?)?;
    if memory.application != *app || memory.schema != current.revision.schema {
        return Err(fail("Evidence memory crosses application revision"));
    }
    let bundle = mem::parse_queries(&get_record(&service.store, &current.revision.queries)?)?;
    let mut supplied = BTreeMap::new();
    for reference in derivations {
        let d = mem::parse_derivation(&get_record(&service.store, reference)?)?;
        if d.application != *app
            || d.captured_state != current.digest
            || d.memory != current.state.memory
            || !bundle.queries.contains(&d.query)
            || supplied.contains_key(&d.query)
        {
            return Err(fail(
                "Evidence derivation crosses the captured application state",
            ));
        }
        supplied.insert(d.query.clone(), (reference, d));
    }
    let mut queries = Vec::new();
    let mut probe_refs = BTreeSet::new();
    for reference in &bundle.queries {
        let q = mem::parse_query(&get_record(&service.store, reference)?)?;
        if q.schema != current.revision.schema {
            return Err(fail("Evidence query schema mismatch"));
        }
        mem::parse_native_program(&get_record(&service.store, &q.program)?)?;
        probe_refs.extend(q.procedures.iter().cloned());
        let mut row = json!({"query":reference,"id":q.id,"program":q.program,"derivation":null,"status":"unknown","reason":null,"result":null,"facts":null,"sourceRefs":[],"procedures":q.procedures,"claimedVerified":false});
        if let Some((derivation, d)) = supplied.get(reference) {
            if d.program != q.program
                || d.source_refs.iter().any(|source| {
                    !memory.observations.contains(source) || memory.withdrawn.contains(source)
                })
            {
                return Err(fail("Derivation source/program is outside captured memory"));
            }
            row["derivation"] = json!(derivation);
            row["status"] = json!(d.status);
            row["reason"] = json!(d.reason);
            row["result"] = json!(d.result);
            row["facts"] = json!(d.snapshot);
            row["sourceRefs"] = json!(d.source_refs);
            row["claimedVerified"] = json!(d.verified);
        }
        queries.push(row);
    }
    let mut probes = Vec::new();
    for reference in probe_refs.iter().take(32) {
        let p = mem::parse_procedure(&get_record(&service.store, reference)?)?;
        if p.schema != current.revision.schema {
            return Err(fail("Evidence probe schema mismatch"));
        }
        let budgets = if let Some(raw) = service.store.get("manifests", &p.manifest)? {
            let manifest = crate::contract::Manifest::parse(&raw)?;
            json!({"maxSteps":manifest.budgets.max_steps,"maxWork":manifest.budgets.max_work,"maxAgentCalls":manifest.budgets.max_agent_calls,"maxOutputBytes":manifest.budgets.max_output_bytes})
        } else {
            get_record(&service.store, &p.manifest)?;
            Value::Null
        };
        probes.push(json!({"procedure":reference,"id":p.id,"manifest":p.manifest,"decoder":p.decoder,"dependencies":p.dependencies,"prerequisite":p.prerequisite,"budgets":budgets}));
    }
    let source_refs: Vec<_> = memory
        .observations
        .iter()
        .filter(|reference| !memory.withdrawn.contains(reference))
        .collect();
    let mut sources = Vec::new();
    for reference in source_refs.iter().take(32) {
        let s = mem::parse_observation(&get_record(&service.store, reference)?)?;
        let scope = mem::parse_scope(&get_record(&service.store, &s.input.scope)?)?;
        let procedure = mem::parse_procedure(&get_record(&service.store, &s.input.procedure)?)?;
        if s.input.application != *app
            || scope.application != *app
            || procedure.schema != memory.schema
            || procedure.decoder != s.input.decoder
        {
            return Err(fail(
                "Evidence source crosses application or procedure binding",
            ));
        }
        sources.push(json!({"observation":reference,"scope":s.input.scope,"procedure":s.input.procedure,"raw":s.input.raw,"receipt":s.input.receipt,"decoder":s.input.decoder,"admission":s.admission}));
    }
    let revisions: Vec<_> = history.iter().skip(history.len().saturating_sub(32)).map(|s| json!({"state":s.digest,"revision":s.state.revision,"parent":s.revision.parent,"kind":s.transition.kind.as_str(),"evidence":s.transition.evidence})).collect();
    let mut all_work = Vec::new();
    for s in history {
        let mut rows = Vec::new();
        for reference in &s.transition.intents {
            let intent = parse_intent(&get_record(&service.store, reference)?)?;
            rows.push((intent.ordinal, reference));
        }
        rows.sort_by_key(|(ordinal, _)| *ordinal);
        for (index, (ordinal, reference)) in rows.into_iter().enumerate() {
            if all_work.len() >= 4096 {
                return Err(fail("Retained application intent bound exceeded"));
            }
            let work = parse_intent(&get_record(&service.store, reference)?)?;
            if ordinal != index
                || work.application != *app
                || work.operation != s.transition.operation
            {
                return Err(fail("Evidence intent crosses originating transition"));
            }
            all_work.push((s, reference));
        }
    }
    let mut work = Vec::new();
    for (s, reference) in all_work.iter().skip(all_work.len().saturating_sub(32)) {
        let intent = parse_intent(&get_record(&service.store, reference)?)?;
        if intent.application != *app
            || intent.operation != s.transition.operation
            || s.state.application != *app
        {
            return Err(fail("Evidence intent crosses its original state"));
        }
        let mut row = json!({"intent":reference,"sourceState":s.digest,"revision":s.state.revision,"memory":s.state.memory,"kind":intent.value["kind"],"status":"pending","request":null,"query":null,"procedures":[],"process":null,"binding":null,"result":null,"reason":null});
        if let WorkIntent::Deliver { message, .. } = &intent.work {
            let raw = get_record(&service.store, message)?;
            if raw["contract"] == "algal.application-investigation-request.v1" {
                let request = parse_investigation_request(&raw)?;
                let origin = history
                    .iter()
                    .find(|h| h.digest == request.state && h.state.sequence <= s.state.sequence)
                    .ok_or_else(|| fail("Investigation origin is outside captured history"))?;
                let entry = origin
                    .revision
                    .entrypoints
                    .iter()
                    .find(|e| e.name == request.entrypoint)
                    .ok_or_else(|| fail("Investigation entrypoint is unselected"))?;
                if request.application != *app
                    || request.memory != origin.state.memory
                    || request.query != entry.applicability
                {
                    return Err(fail("Investigation request crosses its original state"));
                }
                let d = mem::parse_derivation(&get_record(&service.store, &request.derivation)?)?;
                let q = mem::parse_query(&get_record(&service.store, &request.query)?)?;
                if d.application != *app
                    || d.captured_state != request.state
                    || d.memory != request.memory
                    || d.query != request.query
                    || d.program != q.program
                    || d.status == "supported"
                    || request.procedures != q.procedures
                {
                    return Err(fail("Investigation derivation/query mismatch"));
                }
                row["request"] = json!(message);
                row["query"] = json!(request.query);
                row["procedures"] = json!(request.procedures);
            }
        }
        if let Some(dispatch) = service.dispatch_record(app, reference, &intent)? {
            if dispatch.source_state != s.digest {
                return Err(fail("Work dispatch crosses original state"));
            }
            service.validate_plan(s, &intent, reference, &dispatch.plan)?;
            row["status"] = json!(dispatch.status);
            row["result"] = json!(dispatch.result);
            row["reason"] = json!(dispatch.reason);
            if let DispatchPlan::Episode { binding } = &dispatch.plan {
                row["process"] = json!(binding.process);
                row["binding"] = json!(digest(&binding.value)?);
            }
        }
        work.push(row);
    }
    let output = json!({"contract":CONTRACT,"state":current.digest,"memory":current.state.memory,"queries":queries,"probes":probes,"sources":sources,"revisions":revisions,"work":work,"truncated":{"queries":false,"probes":probe_refs.len()>32,"sources":source_refs.len()>32,"revisions":history.len()>32,"work":all_work.len()>32}});
    parse(&output, &current.digest, &current.state.memory)
}
