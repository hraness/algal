//! Passive application workbench over one validated, captured view record.
//! Rendering never opens a store, resolves a current head, or runs an effect.
use crate::{
    Result,
    application_view::parse_view,
    canonical::{canonical, digest},
};
use serde_json::Value;

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
    #[test]
    fn report_rejects_unfenced_or_unsupported_actions() {
        let mut value = fixture();
        value["actions"] = json!([{"kind":"execute-procedure","expectedState":value["state"],"procedure":value["revision"],"queryResult":value["memory"]}]);
        assert!(render(&value).is_err());
    }
}
