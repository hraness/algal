//! Passive application workbench over one validated, captured view record.
//! Rendering never opens a store, resolves a current head, or runs an effect.
use crate::{
    Error, Result,
    application_view::parse_view,
    canonical::{canonical, check_digest, digest},
};
use serde_json::Value;
use std::collections::BTreeSet;

fn escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
fn label(value: &Value) -> String {
    escape(value.as_str().unwrap_or(""))
}

fn reference(value: &Value, captured: &BTreeSet<String>) -> String {
    let Some(value) = value.as_str() else {
        return "—".into();
    };
    if check_digest(value).is_ok() && captured.contains(value) {
        format!(
            "<a href=\"#record-{}\"><code>{}</code></a>",
            &value[7..],
            escape(value)
        )
    } else {
        format!("<code>{}</code>", escape(value))
    }
}
fn references(value: &Value, captured: &BTreeSet<String>) -> String {
    value
        .as_array()
        .into_iter()
        .flatten()
        .map(|v| reference(v, captured))
        .collect::<Vec<_>>()
        .join("<br>")
}
fn details(reference: &Value, title: &str, row: &Value) -> Result<String> {
    let id = reference
        .as_str()
        .filter(|s| check_digest(s).is_ok())
        .map(|s| format!(" id=\"record-{}\"", &s[7..]))
        .unwrap_or_default();
    Ok(format!(
        "<details{id}><summary>{}</summary><pre>{}</pre></details>",
        escape(title),
        escape(&canonical(row)?)
    ))
}
fn diagnostics(view: &Value) -> Result<String> {
    let Some(evidence) = view.get("evidence") else {
        return Ok(String::new());
    };
    let groups = [
        ("queries", "query"),
        ("probes", "procedure"),
        ("sources", "observation"),
        ("revisions", "state"),
        ("work", "intent"),
    ];
    let captured: BTreeSet<String> = groups
        .iter()
        .flat_map(|&(group, key)| {
            evidence[group]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(move |r| r[key].as_str().map(String::from))
        })
        .collect();
    let mut html = String::from(
        "<section id=\"diagnostics\"><h2>Captured evidence and unresolved premises</h2><p>These bounded rows come from one captured application history. References open included row details; other digests identify retained store objects. A declared probe grants no effect authority. Derivation verification is the producer’s recorded claim, not a replay performed by this page.</p>",
    );
    if evidence["truncated"]
        .as_object()
        .is_some_and(|m| m.values().any(|v| v.as_bool() == Some(true)))
    {
        html.push_str("<p class=\"note\">Evidence is explicitly truncated. Omitted rows remain in the retained store; this page does not claim complete dependency or activity coverage.</p>");
    }
    html.push_str("<h3>Queries and supporting evidence</h3><table><thead><tr><th>Query</th><th>Captured status and diagnostic</th><th>Evidence and declared probes</th></tr></thead><tbody>");
    for row in evidence["queries"].as_array().into_iter().flatten() {
        let diagnostic = row["reason"].as_str().map(escape).unwrap_or_else(|| match row["status"].as_str() {
            Some("unknown") if row["sourceRefs"].as_array().is_some_and(Vec::is_empty) => "No supporting result is recorded, and no admitted source observation contributed. Inspect the declared probes for the unresolved premise.".into(),
            Some("unknown") => "No supporting result is recorded. The declared probes and retained result show the available evidence, not a complete explanation of every missing premise.".into(),
            Some("stale") => "The recorded evidence does not establish current applicability in this scope.".into(),
            _ => "No additional diagnostic was recorded.".into(),
        });
        html.push_str(&format!("<tr><td>{}<br>{}</td><td><span class=\"status\">{}</span><p>{}</p><p>Producer claimed verification: {}</p></td><td>Derivation: {}<br>Result/proofs: {}<br>Fact snapshot: {}<br>Sources: {}<br>Declared probes: {}</td></tr>", label(&row["id"]), reference(&row["query"], &captured), label(&row["status"]), diagnostic, if row["claimedVerified"] == true {"yes"} else {"no"}, reference(&row["derivation"], &captured), reference(&row["result"], &captured), reference(&row["facts"], &captured), references(&row["sourceRefs"], &captured), references(&row["procedures"], &captured)));
    }
    html.push_str("</tbody></table><h3>Declared investigation probes</h3><table><thead><tr><th>Probe</th><th>Dependencies and prerequisite</th><th>Execution budget</th></tr></thead><tbody>");
    for row in evidence["probes"].as_array().into_iter().flatten() {
        let dependencies = row["dependencies"]
            .as_array()
            .into_iter()
            .flatten()
            .map(label)
            .collect::<Vec<_>>()
            .join(", ");
        let budget = if row["budgets"].is_null() {
            "Host probe; execution bounds are supplied by the admitted host. No VM budget is asserted.".into()
        } else {
            format!(
                "Steps: {}<br>Work: {}<br>Model calls: {}<br>Output bytes: {}",
                row["budgets"]["maxSteps"],
                row["budgets"]["maxWork"],
                row["budgets"]["maxAgentCalls"],
                row["budgets"]["maxOutputBytes"]
            )
        };
        html.push_str(&format!("<tr><td>{}<br>{}<br>Program / host declaration: {}<br>Decoder: {}</td><td>{}<br>Prerequisite: {}</td><td>{}</td></tr>", label(&row["id"]), reference(&row["procedure"], &captured), reference(&row["manifest"], &captured), reference(&row["decoder"], &captured), dependencies, reference(&row["prerequisite"], &captured), budget));
    }
    html.push_str("</tbody></table><h3>Observation provenance</h3><table><thead><tr><th>Observation</th><th>Scope and acquisition</th><th>Admission</th></tr></thead><tbody>");
    for row in evidence["sources"].as_array().into_iter().flatten() {
        html.push_str(&format!("<tr><td>{}</td><td>Scope: {}<br>Probe: {}<br>Raw result: {}<br>Receipt: {}</td><td>Decoder: {}<br>Admission: {}</td></tr>", reference(&row["observation"], &captured), reference(&row["scope"], &captured), reference(&row["procedure"], &captured), reference(&row["raw"], &captured), reference(&row["receipt"], &captured), reference(&row["decoder"], &captured), reference(&row["admission"], &captured)));
    }
    html.push_str("</tbody></table><h3>Revision and evaluation lineage</h3><table><thead><tr><th>Captured transition</th><th>Revision and parent</th><th>Evidence</th></tr></thead><tbody>");
    for row in evidence["revisions"].as_array().into_iter().flatten() {
        html.push_str(&format!(
            "<tr><td>{}<br>{}</td><td>{}<br>Parent: {}</td><td>{}</td></tr>",
            label(&row["kind"]),
            reference(&row["state"], &captured),
            reference(&row["revision"], &captured),
            reference(&row["parent"], &captured),
            references(&row["evidence"], &captured)
        ));
    }
    html.push_str("</tbody></table><h3>Durable work and original bindings</h3><p>Dispatch status was observed separately from the immutable state capture. It is not a global atomic snapshot and does not erase uncertain effects.</p><table><thead><tr><th>Intent and observed status</th><th>Request and original selection</th><th>Retained outcome</th></tr></thead><tbody>");
    for row in evidence["work"].as_array().into_iter().flatten() {
        html.push_str(&format!("<tr><td>{}<br>{}<br><span class=\"status\">{}</span><p>{}</p></td><td>Source state: {}<br>Revision: {}<br>Memory: {}<br>Request: {}<br>Query: {}<br>Probes: {}</td><td>Process: {}<br>Binding: {}<br>Result: {}</td></tr>", label(&row["kind"]), reference(&row["intent"], &captured), label(&row["status"]), label(&row["reason"]), reference(&row["sourceState"], &captured), reference(&row["revision"], &captured), reference(&row["memory"], &captured), reference(&row["request"], &captured), reference(&row["query"], &captured), references(&row["procedures"], &captured), label(&row["process"]), reference(&row["binding"], &captured), reference(&row["result"], &captured)));
    }
    html.push_str("</tbody></table><h3>Captured diagnostic row details</h3>");
    for (group, key) in groups {
        for row in evidence[group].as_array().into_iter().flatten() {
            html.push_str(&details(
                &row[key],
                &format!("{} · {}", group, row[key].as_str().unwrap_or("")),
                row,
            )?);
        }
    }
    html.push_str("</section>");
    Ok(html)
}

pub fn render(input: &Value) -> Result<String> {
    let view = parse_view(input)?;
    let evidence = canonical(&view)?;
    let view_digest = digest(&view)?;
    let mut html = format!(
        r#"<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer"><title>{}</title>
<style>
:root{{color-scheme:light dark;font-family:system-ui,sans-serif;background:#10151b;color:#dce6ed}}body{{max-width:1100px;margin:0 auto;padding:40px 24px}}h1{{font-size:2.2rem;letter-spacing:-.04em}}h2{{margin-top:2.5rem}}p{{line-height:1.6}}.eyebrow{{color:#7cdac0;letter-spacing:.12em;font-size:.8rem}}.note{{padding:16px;border:1px solid #46535f;border-radius:8px;background:#18212b}}.refs{{display:grid;grid-template-columns:7rem 1fr;gap:10px}}code,pre{{font-family:ui-monospace,monospace;font-size:.83rem;overflow-wrap:anywhere}}pre{{white-space:pre-wrap;background:#18212b;padding:16px;border-radius:8px;max-height:32rem;overflow:auto}}table{{width:100%;border-collapse:collapse}}th,td{{padding:12px 8px;text-align:left;border-bottom:1px solid #334250;vertical-align:top}}td:first-child{{font-weight:600}}.status{{display:inline-block;padding:3px 8px;border:1px solid #68818c;border-radius:4px;font-size:.8rem}}summary{{cursor:pointer;padding:12px 0}}a{{color:#7cdac0}}@media(max-width:600px){{body{{padding:20px 12px}}.refs{{grid-template-columns:1fr}}th,td{{padding:8px 4px}}}}
</style></head><body><div class="eyebrow">ALGAL · APPLICATION WORKBENCH</div><h1>{}</h1>
<p class="note">Historical snapshot. This page performs no actions and contacts no providers. Applicability is the captured producer's report; rendering validates its structure and state references, not the truth of observations or replay of proofs. Submit retained action records through an admitted host, which must recheck the current state.</p>
<div class="refs"><span>Application</span><code>{}</code><span>View</span><code>{}</code><span>State</span><code>{}</code><span>Revision</span><code>{}</code><span>Memory</span><code>{}</code></div>
"#,
        label(&view["title"]),
        label(&view["title"]),
        label(&view["application"]),
        escape(&view_digest),
        label(&view["state"]),
        label(&view["revision"]),
        label(&view["memory"])
    );
    let widgets = view["widgets"].as_array().unwrap();
    if widgets.iter().any(|v| v == "goals") {
        html.push_str("<h2>Goals and captured evidence</h2><table><thead><tr><th>Goal</th><th>Query status</th><th>Selected procedure</th></tr></thead><tbody>");
        for row in view["goals"].as_array().into_iter().flatten() {
            html.push_str(&format!(
                "<tr><td>{}</td><td>{}</td><td>{}</td></tr>",
                label(&row["definition"]["description"]),
                label(&row["status"]),
                label(&row["definition"]["entrypoint"])
            ));
        }
        html.push_str("</tbody></table>");
    }
    if widgets.iter().any(|v| v == "procedures") {
        html.push_str("<h2>Procedures and applicability</h2><table><thead><tr><th>Procedure</th><th>Reported state</th><th>Manifest</th></tr></thead><tbody>");
        for row in view["procedures"].as_array().unwrap() {
            html.push_str(&format!("<tr><td>{}</td><td><span class=\"status\">{}</span></td><td><code>{}</code></td></tr>", label(&row["name"]), label(&row["applicability"]), label(&row["manifest"])));
        }
        html.push_str("</tbody></table>");
    }
    if widgets.iter().any(|v| v == "memory") {
        html.push_str(&format!("<h2>Memory and evidence</h2><p>The selected memory snapshot is <code>{}</code>. Its observations, scopes, hypotheses and derivations remain separate addressed records in the store. Query result references appear in the action records below.</p>", label(&view["memory"])));
    }
    if widgets.iter().any(|v| v == "history") {
        html.push_str("<h2>Revision and memory history</h2>");
        if view["truncated"] == true {
            html.push_str("<p class=\"note\">The latest 128 captured states are shown. Earlier source records remain in the store.</p>");
        }
        html.push_str("<table><thead><tr><th>Sequence</th><th>State</th><th>Revision / memory</th></tr></thead><tbody>");
        for row in view["history"].as_array().unwrap().iter().rev() {
            html.push_str(&format!("<tr><td>{}</td><td><code>{}</code></td><td><code>{}</code><br><code>{}</code></td></tr>", row["sequence"], label(&row["state"]), label(&row["revision"]), label(&row["memory"])));
        }
        html.push_str("</tbody></table>");
    }
    if widgets.iter().any(|v| v == "investigations") {
        html.push_str("<h2>Retained intents</h2><p>These references name the captured transition's intents. Inspect their durable dispatch records to determine whether delivery is pending, settled, blocked, or uncertain.</p>");
        html.push_str(&format!(
            "<pre>{}</pre>",
            escape(&canonical(&view["investigations"])?)
        ));
    }
    html.push_str(&diagnostics(&view)?);
    html.push_str("<h2>Fenced action records</h2><p>Action data grants no authority. Every record names the captured state, so later memory or revision changes require renewed admission.</p>");
    for action in view["actions"].as_array().unwrap() {
        html.push_str(&format!(
            "<details><summary>{}</summary><pre>{}</pre></details>",
            label(&action["kind"]),
            escape(&canonical(action)?)
        ));
    }
    if view["actions"].as_array().unwrap().is_empty() {
        html.push_str("<p>No actionable derivation was supplied for this snapshot.</p>");
    }
    html.push_str(&format!("<details id=\"evidence\"><summary>Complete captured view record</summary><pre>{}</pre></details></body></html>\n", escape(&evidence)));
    if html.len() > 4_194_304 {
        return Err(Error::limit("Application report byte bound exceeded"));
    }
    Ok(html)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn fixture() -> Value {
        let reference = format!("sha256:{}", "a".repeat(64));
        json!({"contract":"algal.application-view.v1","application":"demo","state":reference,"revision":reference,"memory":reference,"title":"</title><script>alert('x')</script>","widgets":["history","memory","procedures"],"procedures":[{"name":"inspect","manifest":reference,"applicability":"exhausted"}],"history":[{"state":reference,"revision":reference,"memory":reference,"sequence":0}],"investigations":[],"actions":[],"truncated":false})
    }
    #[test]
    fn passive_workbench_escapes_data_and_preserves_uncertainty() {
        let value = fixture();
        let html = render(&value).unwrap();
        assert!(!html.contains("<script>"));
        assert!(!html.contains("<form"));
        assert!(html.contains("default-src 'none'"));
        assert!(html.contains("&lt;script&gt;"));
        assert!(html.contains("exhausted"));
        assert!(html.contains(&digest(&value).unwrap()));
        assert_eq!(html, render(&value).unwrap());
    }
    fn diagnostic_fixture() -> Value {
        let mut view = fixture();
        let r = |c: char| format!("sha256:{}", c.to_string().repeat(64));
        view["evidence"] = json!({
            "contract":"algal.application-view-evidence.v1", "state":view["state"], "memory":view["memory"],
            "queries":[{"query":r('b'),"id":"inspect","program":r('c'),"derivation":r('d'),"status":"unknown","reason":"<img src=x onerror=attack()>","result":null,"facts":null,"sourceRefs":[],"procedures":[r('e')],"claimedVerified":false}],
            "probes":[{"procedure":r('e'),"id":"inspect-file","manifest":r('f'),"decoder":r('1'),"dependencies":["configuration"],"prerequisite":null,"budgets":{"maxSteps":4,"maxWork":2000,"maxAgentCalls":0,"maxOutputBytes":1024}}],
            "sources":[{"observation":r('2'),"scope":r('3'),"procedure":r('e'),"raw":r('4'),"receipt":r('5'),"decoder":r('1'),"admission":r('6')}],
            "revisions":[{"state":view["state"],"revision":view["revision"],"parent":null,"kind":"create","evidence":[]}],
            "work":[{"intent":r('7'),"sourceState":view["state"],"revision":view["revision"],"memory":view["memory"],"kind":"deliver","status":"pending","request":r('8'),"query":r('b'),"procedures":[r('e')],"process":null,"binding":null,"result":null,"reason":null}],
            "truncated":{"queries":true,"probes":false,"sources":false,"revisions":false,"work":false}
        });
        view
    }
    #[test]
    fn diagnostic_rows_are_passive_escaped_and_locally_linked() {
        let view = diagnostic_fixture();
        let html = render(&view).unwrap();
        assert!(html.contains("&lt;img src=x onerror=attack()&gt;"));
        assert!(!html.contains("<img"));
        assert!(!html.contains("<script"));
        assert!(!html.contains("<form"));
        assert!(html.contains("Producer claimed verification: no"));
        assert!(html.contains("Evidence is explicitly truncated"));
        assert!(html.contains("Dispatch status was observed separately"));
        assert!(html.contains("Model calls: 0"));
        assert!(html.contains("Observation provenance"));
        assert!(html.contains("Revision and evaluation lineage"));
        let anchor = format!("record-{}", "e".repeat(64));
        assert!(html.contains(&format!("href=\"#{anchor}\"")));
        assert!(html.contains(&format!("id=\"{anchor}\"")));
        assert!(html.len() < 4_194_304);
        assert_eq!(html, render(&view).unwrap());
    }
    #[test]
    fn host_probe_does_not_invent_virtual_machine_budgets() {
        let mut view = diagnostic_fixture();
        view["evidence"]["probes"][0]["budgets"] = Value::Null;
        let html = render(&view).unwrap();
        assert!(html.contains("Host probe; execution bounds are supplied by the admitted host"));
        assert!(!html.contains("Steps: null"));
        assert!(!html.contains("Work: 0"));
    }
    #[test]
    fn diagnostic_report_rejects_cross_state_evidence() {
        let mut view = diagnostic_fixture();
        view["evidence"]["state"] = json!(format!("sha256:{}", "0".repeat(64)));
        assert!(render(&view).is_err());
    }
    #[test]
    fn report_rejects_unfenced_or_unsupported_actions() {
        let mut value = fixture();
        value["actions"] = json!([{"kind":"execute-procedure","expectedState":value["state"],"procedure":value["revision"],"queryResult":value["memory"]}]);
        assert!(render(&value).is_err());
    }
}
