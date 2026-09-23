use algal_triage_renderers::{Model, Options, Result};
use dioxus::prelude::*;
use serde_json::json;
use std::{
    sync::{Arc, Mutex},
    task::{Poll, Waker},
};

fn main() {
    dioxus::LaunchBuilder::desktop()
        .with_cfg(
            dioxus::desktop::Config::new().with_window(
                dioxus::desktop::WindowBuilder::new()
                    .with_title("ALGAL Triage")
                    .with_inner_size(dioxus::desktop::LogicalSize::new(1120.0, 820.0)),
            ),
        )
        .launch(app);
}
type State = Signal<Result<Model>>;
fn run(mut state: State, composing: bool, action: impl FnOnce(&mut Model) -> Result<()>) {
    if composing {
        return;
    }
    if let Ok(model) = state.write().as_mut()
        && let Err(error) = action(model)
    {
        model.message = error;
    }
}
fn edit(mut state: State, action: impl FnOnce(&mut Model)) {
    if let Ok(model) = state.write().as_mut() {
        action(model);
        model.dirty = true;
    }
}
// Native input events cross an asynchronous WebView bridge. Echoing `value`
// back on each render can overwrite text that the browser has already accepted.
// Draft replacement is explicit; ordinary typing/refresh/adoption keeps nodes.
fn replace_draft(
    mut state: State,
    composing: bool,
    mut generation: Signal<u64>,
    action: impl FnOnce(&mut Model) -> Result<()>,
) {
    if composing {
        return;
    }
    if let Ok(model) = state.write().as_mut() {
        let before = model.session.clone();
        if let Err(error) = action(model) {
            model.message = error;
        }
        if model.session.draft != before.draft || model.session.query != before.query {
            generation += 1;
        }
    }
}

fn submit_form(model: &mut Model, event: &FormEvent) -> Result<()> {
    for (name, destination) in [
        ("title", &mut model.session.draft.title),
        ("priority", &mut model.session.draft.priority),
        ("category", &mut model.session.draft.category),
    ] {
        if let Some(FormValue::Text(value)) = event.get_first(name) {
            *destination = value;
        }
    }
    model.submit()
}

#[component]
fn LocalSelect(
    value: String,
    choices: Vec<(String, String)>,
    oninput: EventHandler<FormEvent>,
    name: String,
) -> Element {
    rsx! {
        select { name, onchange: move |event| oninput.call(event),
            for (option, label) in choices {
                option { key: "{option}", value: "{option}", initial_selected: value == option, "{label}" }
            }
        }
    }
}

#[component]
fn LocalText(
    value: String,
    name: String,
    limit: i64,
    placeholder: String,
    kind: String,
    oninput: EventHandler<FormEvent>,
) -> Element {
    rsx! {
        input { name: "{name}", "aria-label": "{name}", r#type: "{kind}", initial_value: "{value}", maxlength: limit, placeholder, autocomplete: "off", oninput: move |event| oninput.call(event) }
    }
}
fn generate_apple(
    mut state: State,
    mut busy: Signal<bool>,
    instruction: String,
    composing: Signal<bool>,
    mut pending: Signal<Option<Result<serde_json::Value>>>,
) {
    if busy() {
        return;
    }
    let Ok(model) = state.read().clone() else {
        return;
    };
    busy.set(true);
    if let Ok(m) = state.write().as_mut() {
        m.message =
            "One on-device proposal attempt is running. Typing does not invoke inference.".into();
    }
    type Completion = (Option<Result<serde_json::Value>>, Option<Waker>);
    let shared = Arc::new(Mutex::new((None, None) as Completion));
    let writer = shared.clone();
    std::thread::spawn(move || {
        let result = model
            .options
            .apple_options(&instruction)
            .and_then(|options| {
                model
                    .options
                    .call(&["propose-apple", "@json"], Some(&options))
            })
            .and_then(|value| {
                let proposal = value.get("proposal").ok_or("Missing model proposal")?;
                model
                    .options
                    .call(&["propose-evaluate", "@json"], Some(proposal))
            });
        if let Ok(mut completed) = writer.lock() {
            completed.0 = Some(result);
            if let Some(waker) = completed.1.take() {
                waker.wake();
            }
        }
    });
    spawn(async move {
        let result = std::future::poll_fn(|cx| {
            let Ok(mut completed) = shared.lock() else {
                return Poll::Ready(Err("Inference completion lock failed".into()));
            };
            if let Some(result) = completed.0.take() {
                Poll::Ready(result)
            } else {
                completed.1 = Some(cx.waker().clone());
                Poll::Pending
            }
        })
        .await;
        busy.set(false);
        if composing() {
            pending.set(Some(result));
        } else {
            apply_apple_completion(state, result);
        }
    });
}

fn apply_apple_completion(mut state: State, result: Result<serde_json::Value>) {
    if let Ok(model) = state.write().as_mut() {
        match result.and_then(|value| serde_json::from_value(value).map_err(|e| e.to_string())) {
            Ok(preview) => {
                model.preview = Some(preview);
                model.message = "On-device proposal retained and evaluated. Inspect it before explicit adoption; your draft is unchanged.".into();
            }
            Err(error) => {
                model.message =
                    format!("No automatic retry. Inspect the retained inference attempt: {error}")
            }
        }
    }
}

fn app() -> Element {
    let state = use_signal(|| Options::parse().and_then(Model::open));
    let mut panel = use_signal(|| "tasks".to_owned());
    let busy = use_signal(|| false);
    let mut composing = use_signal(|| false);
    let draft_generation = use_signal(|| 0u64);
    let mut pending: Signal<Option<Result<serde_json::Value>>> = use_signal(|| None);
    let mut instruction =
        use_signal(|| "Put urgent open tasks first while keeping every task.".to_owned());
    let current = state.read().clone();
    let model = match current {
        Ok(model) => model,
        Err(error) => {
            return rsx! { style { "{STYLE}" } main { class: "startup", h1 { "Local triage" } p { "The local host could not open this application." } pre { "{error}" } p { "Existing state has been preserved. Inspect the host error before reopening." } } };
        }
    };
    let capture = &model.capture;
    let draft = &model.session.draft;
    let stale = model.stale;
    let groups = capture.view.groups.clone();
    let fields = capture.view.form.fields.clone();
    let filters = capture.view.filters.clone();
    rsx! {
        style { "{STYLE}" }
        main {
            oncompositionstart: move |_| composing.set(true),
            oncompositionend: move |_| { composing.set(false); let result = pending.write().take(); if let Some(result) = result { apply_apple_completion(state, result); } },
            header {
                div { p { class: "eyebrow", "ALGAL · LOCAL APPLICATION" } h1 { "Local triage" } p { class: "subtitle", "A small place to think. A workflow you can change." } }
                div { class: "capacity", strong { "{capture.capacity.tasks}" } span { "task slots remaining" } small { "{capture.capacity.states} changes available" } }
            }
            nav { "aria-label": "Workspace",
                for (value, label) in [("tasks", "Tasks"), ("evolve", "Evolve workflow"), ("portable", "History & portability")] {
                    button { key: "{value}", class: if panel() == value { "tab active" } else { "tab" }, onclick: move |_| { if !composing() { panel.set(value.into()); } }, "{label}" }
                }
                button { class: "quiet refresh", onclick: move |_| run(state, composing(), Model::refresh), "Refresh" }
            }
            section { class: "notice", role: "status", "{model.message}" }
            if stale {
                section { class: "stale", strong { "Your draft needs review." } p { "Inspect refreshed task facts, then explicitly rebase the retained draft. A newer saved draft is never overwritten." }
                    button { onclick: move |_| run(state, composing(), |m| m.save(true)), "Rebase draft" }
                    button { class: "quiet", onclick: move |_| replace_draft(state, composing(), draft_generation, Model::reload_draft), "Discard unsaved edits & load saved draft" }
                }
            }
            if panel() == "tasks" {
                div { class: "workspace",
                    section { class: "tasks",
                        div { class: "tools",
                            div { class: "filters", for f in filters { button { key: "{f.value}", class: if f.selected { "pill selected" } else { "pill" }, onclick: move |_| { let value = f.value.clone(); run(state, composing(), |m| m.filter(&value)); }, "{f.label}" } } }
                            form { onsubmit: move |event| { event.prevent_default(); if composing() { return; } run(state, composing(), Model::refresh); },
                                for generation in [draft_generation()] {
                                    LocalText { key: "query-{generation}", kind: "search", name: "Filter task titles", placeholder: "Filter titles…", value: model.session.query.clone(), limit: 120, oninput: move |event: FormEvent| edit(state, |m| { m.session.query = event.value(); m.session.focused_field = Some("query".into()); }) }
                                }
                                button { class: "quiet", r#type: "submit", "Apply" }
                            }
                        }
                        if groups.is_empty() { div { class: "empty", h2 { "Room for your next thought." } p { "Add a task, or adjust the current filter." } } }
                        for group in groups {
                            section { key: "{group.id}", class: "task-group", h2 { "{group.label}" }
                                for row in group.tasks {
                                    article { key: "{row.task.id}", class: if row.task.status == "done" { "task done" } else { "task" },
                                        div { class: "task-copy", h3 { "{row.task.title}" } div { class: "tags", span { class: "priority {row.task.priority}", "{row.task.priority}" } if capture.definition.schema_version == 2 { span { "{row.task.category}" } } span { "{row.task.status}" } }
                                            details { summary { "Why here?" } p { "{capture.view.ordering}" } code { "{row.task.id}" } }
                                        }
                                        div { class: "task-actions",
                                            for action in row.actions {
                                                if action.kind == "edit" || action.enabled {
                                                    button { key: "{action.kind}", class: "quiet", disabled: !action.enabled || stale || composing(), onclick: { let task = row.task.clone(); let kind = action.kind.clone(); move |_| { let task = task.clone(); let kind = kind.clone(); if kind == "edit" { replace_draft(state, composing(), draft_generation, |m| { m.edit(&task); Ok(()) }); } else { run(state, composing(), |m| { m.action(json!({ "kind":kind, "taskId":task.id }))?; m.refresh() }); } } }, "{action.label}" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    aside { class: "editor", h2 { if draft.task_id.is_some() { "Edit task" } else { "New task" } }
                        p { class: "muted", "Your draft is separate from the saved task." }
                        form { onsubmit: move |event| { event.prevent_default(); if composing() { return; } replace_draft(state, composing(), draft_generation, |m| submit_form(m, &event)); },
                            for field in fields {
                                label { key: "{field.name}-{draft_generation}", "{field.label}"
                                    if field.name == "priority" {
                                        LocalSelect { name: "priority", value: draft.priority.clone(), choices: field.options.iter().map(|option| (option.clone(), option.clone())).collect(), oninput: move |event: FormEvent| edit(state, |m| { m.session.draft.priority = event.value(); m.session.focused_field = Some("priority".into()); })
                                        }
                                    } else if field.name == "title" {
                                        LocalText { kind: "text", name: "title", value: draft.title.clone(), limit: field.max_length as i64, placeholder: "What needs your attention?", oninput: move |event: FormEvent| edit(state, |m| { m.session.draft.title = event.value(); m.session.focused_field = Some("title".into()); }) }
                                    } else if field.name == "category" {
                                        LocalText { kind: "text", name: "category", value: draft.category.clone(), limit: field.max_length as i64, placeholder: "", oninput: move |event: FormEvent| edit(state, |m| { m.session.draft.category = event.value(); m.session.focused_field = Some("category".into()); }) }
                                    }
                                }
                            }
                            button { class: "primary", r#type: "submit", disabled: stale || composing() || draft.title.trim().is_empty(), if draft.task_id.is_some() { "Save task" } else { "Add task" } }
                        }
                        div { class: "draft-tools", button { class: "quiet", onclick: move |_| run(state, composing(), |m| m.save(false)), "Save draft" } button { class: "quiet", onclick: move |_| replace_draft(state, composing(), draft_generation, |m| { m.new_draft(); Ok(()) }), "Clear draft" } }
                        small { if model.dirty { "Unsaved draft · Save draft before closing." } else { "Draft saved locally." } }
                    }
                }
            } else if panel() == "evolve" {
                section { class: "evolve", h2 { "Change how work is presented." } p { class: "muted", "Preview a bounded revision. The host checks it independently; adoption keeps every task." }
                    for revision in [capture.revision.clone()] { div { key: "{revision}", class: "policy-grid",
                        label { "Order", LocalSelect { name: "Order", value: model.policy.sort.clone(), choices: ["priority", "title", "created"].map(|v| (v.into(), v.into())).to_vec(), oninput: move |e: FormEvent| edit(state, |m| m.policy.sort = e.value()) } }
                        label { "Group", LocalSelect { name: "Group", value: model.policy.group.clone(), choices: ["none", "status", "priority", "category"].map(|v| (v.into(), v.into())).to_vec(), oninput: move |e: FormEvent| edit(state, |m| m.policy.group = e.value()) } }
                        label { "Task schema", LocalSelect { name: "Task schema", value: model.schema_version.to_string(), choices: vec![("1".into(), "v1 · Core tasks".into()), ("2".into(), "v2 · Add categories".into())], oninput: move |e: FormEvent| edit(state, |m| m.schema_version = e.value().parse().unwrap_or(1)) } }
                        label { class: "checkbox", input { r#type: "checkbox", initial_checked: model.policy.allow_reopen, onchange: move |e| edit(state, |m| m.policy.allow_reopen = e.checked()) } "Allow reopening completed tasks" }
                    } }
                    button { class: "primary", disabled: stale || composing(), onclick: move |_| run(state, composing(), Model::evaluate), "Evaluate & preview" }
                    if let Some(preview) = model.preview.clone() {
                        section { class: "preview", h3 { if preview.evaluation.accepted { "Compatible candidate" } else { "Candidate rejected" } } p { "{preview.preview.view.ordering}" }
                            ul { for check in preview.evaluation.checks { li { "{check.name}: ", if check.passed { "passed" } else { "failed" } } } }
                            p { "{preview.evaluation.receipts.len()} pure execution receipts. A compatible workflow is not a productivity claim." }
                            button { class: "primary", disabled: !preview.evaluation.accepted || stale || composing(), onclick: move |_| run(state, composing(), Model::adopt), "Adopt this revision" }
                        }
                    }
                    section { class: "import-proposal", h3 { "Inspect a model proposal" } p { "Choose a proposal JSON produced by an explicit local inference attempt. Importing it only evaluates and previews." }
                        LocalText { kind: "text", name: "Proposal JSON path", value: model.path.clone(), limit: 2048, placeholder: "/path/to/proposal.json", oninput: move |e: FormEvent| edit(state, |m| m.path = e.value()) }
                        button { class: "quiet", onclick: move |_| run(state, composing(), Model::import_proposal), "Import & evaluate proposal" }
                        label { "How should your workflow change?", LocalText { kind: "text", name: "Workflow instruction", value: instruction(), limit: 512, placeholder: "", oninput: move |e: FormEvent| instruction.set(e.value()) } }
                        p { "Apple Intelligence runs on this Mac. Generate once, inspect the proposal, then choose whether to adopt it. No cloud fallback." }
                        button { class: "quiet", disabled: busy() || stale || composing() || !model.options.apple_available(), onclick: move |_| { if !composing() { generate_apple(state, busy, instruction(), composing, pending); } }, if busy() { "Generating locally…" } else { "Generate one Apple proposal" } }
                        if !model.options.apple_available() { small { "This package does not include the Apple runtime. Proposal import is available above." } }
                    }
                }
            } else {
                section { class: "portability", h2 { "Keep the evidence. Explore another direction." }
                    dl { dt { "Application" } dd { "{capture.application}" } dt { "Captured head" } dd { code { "{capture.head}" } } dt { "Revision" } dd { code { "{capture.revision}" } } dt { "Memory" } dd { code { "{capture.memory}" } } }
                    p { "Export retains immutable facts and pure execution evidence. Imports remain separate. Forks begin with a new identity and no copied drafts, credentials or mutable custody." }
                    label { "Transfer JSON path", LocalText { kind: "text", name: "Transfer JSON path", value: model.path.clone(), limit: 2048, placeholder: "/path/to/triage.json", oninput: move |e: FormEvent| edit(state, |m| m.path = e.value()) } }
                    div { class: "row", button { onclick: move |_| run(state, composing(), Model::export), "Export new file" } button { onclick: move |_| run(state, composing(), Model::import), "Verify & import" } }
                    label { "New fork identity", LocalText { kind: "text", name: "New fork identity", value: model.fork_name.clone(), limit: 48, placeholder: "", oninput: move |e: FormEvent| edit(state, |m| m.fork_name = e.value()) } }
                    button { onclick: move |_| run(state, composing(), Model::fork), "Fork this transfer" }
                    p { class: "muted", "Divergent field conflicts require an explicit review and resolution through the bundled triage-host CLI. This screen never silently merges changes." }
                }
            }
            footer { span { "LOCAL ONLY · Schema v{capture.definition.schema_version} · State {capture.sequence}" } span { "Session drafts are never model inputs." } }
        }
    }
}

const STYLE: &str = r#"
:root{color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#28332c;background:#f5f4ee;font-size:14px}*{box-sizing:border-box}body{margin:0}main{max-width:1180px;margin:auto;padding:38px 40px 20px}header{display:flex;justify-content:space-between;gap:30px;align-items:center;margin-bottom:32px}h1{font-size:38px;font-weight:560;letter-spacing:-1.6px;margin:8px 0}h2{font-size:18px;font-weight:580;margin:0 0 16px}h3{font-size:15px;margin:0 0 9px;font-weight:550}.eyebrow{font-size:10px;letter-spacing:2px;font-weight:700;color:#6d816e}.subtitle,.muted{color:#738077;line-height:1.6}.subtitle{font-size:15px;margin:0}.capacity{text-align:right;display:flex;flex-direction:column;color:#758178;gap:5px}.capacity strong{font-size:30px;color:#354f39;font-weight:500}.capacity span{font-size:12px}.capacity small{font-size:10px}nav{display:flex;border-bottom:1px solid #dce1d7;gap:5px}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #cdd6c9;border-radius:6px;padding:9px 13px;background:#eef1e8;color:inherit}button:disabled{opacity:.45;cursor:default}button:hover:enabled{background:#e1e9d7}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #698b56;outline-offset:2px}.tab{border:0;border-radius:0;padding:13px 18px;background:transparent;color:#829082}.tab.active{border-bottom:2px solid #5c7a49;color:#283b2b}.quiet{background:transparent;border-color:transparent}.refresh{margin-left:auto}.notice{font-size:12px;color:#667869;margin:17px 0 27px;overflow-wrap:anywhere}.workspace{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:35px}.tools{display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between;margin-bottom:25px}.filters{display:flex;gap:5px}.pill{font-size:12px;border:0;border-radius:20px;background:transparent}.selected{background:#e1e9d7}.tools form{display:flex;gap:4px}.tools input{width:160px}.editor{background:#edece3;border:1px solid #e0e2d8;border-radius:10px;padding:23px;height:fit-content}.editor .muted{font-size:12px}label{display:block;font-size:12px;color:#526b56;font-weight:500;margin:20px 0 12px}input,select{width:100%;display:block;margin-top:8px;padding:11px 12px;border:1px solid #d3d8ce;border-radius:5px;background:#fafaf5;color:inherit;min-width:0}.primary{background:#435e3c;color:#fff;border-color:#435e3c}.primary:hover:enabled{background:#354d30}.editor .primary{width:100%;margin-top:9px}.draft-tools{display:flex;gap:6px;margin:17px -10px 6px}.draft-tools button{font-size:11px;padding:8px}.editor small{font-size:10px;color:#7c887b}.task-group h2{font-size:10px;text-transform:uppercase;letter-spacing:1.8px;color:#86907e;margin:24px 0 10px}.task{display:flex;justify-content:space-between;gap:15px;padding:20px 0;border-bottom:1px solid #e2e4d9}.task-copy{min-width:0}.task h3{overflow-wrap:anywhere;line-height:1.5}.done h3{color:#84927c;text-decoration:line-through}.tags{display:flex;gap:10px;font-size:10px;color:#85917e}.priority.high{color:#946443}.task-actions{display:flex;align-items:flex-start;gap:2px}.task-actions button{font-size:11px;padding:7px}.task details{font-size:10px;color:#8e9988;margin-top:12px}.task details p{max-width:400px;line-height:1.6}.empty{padding:75px 10px;color:#82937e}.empty h2{font-size:20px;font-weight:400}.empty p{font-size:13px}.stale{padding:20px;background:#fff1cd;border:1px solid #d8c585;border-radius:8px;margin-bottom:24px}.stale p{line-height:1.6}.stale button{margin-right:10px}.policy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:800px}.checkbox{grid-column:1/-1;display:flex;align-items:center;gap:10px}.checkbox input{width:auto;margin:0}.evolve,.portability{max-width:820px;padding:10px 0 30px;line-height:1.7}.preview{padding:25px;border:1px solid #ced9c4;border-radius:9px;margin-top:25px;background:#eef2e8}.preview ul{font:11px ui-monospace,monospace;line-height:1.9}.import-proposal{margin-top:40px;border-top:1px solid #dce1d7;padding-top:25px}.import-proposal button{margin-top:12px}.row{display:flex;gap:10px}dl{display:grid;grid-template-columns:115px minmax(0,1fr);gap:12px;font-size:11px;margin:25px 0}dt{color:#83917e}dd{margin:0;overflow-wrap:anywhere}code{font:10px ui-monospace,monospace;overflow-wrap:anywhere}footer{display:flex;justify-content:space-between;gap:15px;border-top:1px solid #dce1d7;margin-top:45px;padding-top:18px;font-size:9px;letter-spacing:.5px;color:#8d9987}.startup{max-width:700px}.startup pre{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:850px){main{padding:25px}.workspace{grid-template-columns:1fr}.editor{max-width:500px}.policy-grid{grid-template-columns:1fr}.capacity{display:none}.tab{padding:12px 10px}.task-actions{flex-direction:column}footer{flex-direction:column}}@media(prefers-color-scheme:dark){:root{background:#171d19;color:#e0e8da}.capacity strong{color:#afc69d}.tab.active{color:#d6e4c9}.editor{background:#202821;border-color:#344031}input,select{background:#1b221c;border-color:#465240}.selected,.preview{background:#2a3829}.task,nav,footer{border-color:#364330}button{background:#283526;border-color:#495743}button:hover:enabled{background:#354b30}.quiet,.tab,.pill{background:transparent}.selected{background:#33472d}.primary{background:#587b45;color:white}.stale{background:#3b3420;border-color:#7c6c3c}}
"#;

#[cfg(test)]
mod tests {
    use super::*;
    use dioxus::dioxus_core::{AttributeValue, Mutation};
    use std::{cell::RefCell, collections::HashMap, rc::Rc};

    type InputFixture = Rc<RefCell<(String, u64)>>;
    fn text_fixture(data: InputFixture) -> Element {
        let (value, generation) = data.borrow().clone();
        rsx! { div { for generation in [generation] {
            LocalText { key: "{generation}", value: value.clone(), name: "title", limit: 120, placeholder: "", kind: "text", oninput: |_| {} }
        } } }
    }
    fn controlled_fixture(data: InputFixture) -> Element {
        let value = data.borrow().0.clone();
        rsx! { input { value } }
    }
    #[test]
    fn delayed_text_echo_does_not_write_live_value_or_replace_the_input() {
        let data = Rc::new(RefCell::new((String::new(), 0)));
        let mut dom = VirtualDom::new_with_props(text_fixture, data.clone());
        let initial = dom.rebuild_to_vec();
        assert!(initial.edits.iter().any(|m| matches!(
            m,
            Mutation::SetAttribute {
                name: "initial_value",
                ..
            }
        )));
        let mut text = String::new();
        for character in "Finish the native roadmap review 日本語 🦀".chars() {
            text.push(character);
            data.borrow_mut().0 = text.clone();
            dom.mark_dirty(ScopeId::APP);
            let changes = dom.render_immediate_to_vec();
            assert!(changes.edits.iter().any(|m| matches!(m, Mutation::SetAttribute { name: "initial_value", value: AttributeValue::Text(value), .. } if value == &text)));
            assert!(!changes.edits.iter().any(|m| matches!(
                m,
                Mutation::SetAttribute { name: "value", .. }
                    | Mutation::Remove { .. }
                    | Mutation::ReplaceWith { .. }
            )));
        }
        data.borrow_mut().0 = "Explicitly selected another task".into();
        data.borrow_mut().1 += 1;
        dom.mark_dirty(ScopeId::APP);
        let replaced = dom.render_immediate_to_vec();
        assert!(
            replaced
                .edits
                .iter()
                .any(|m| matches!(m, Mutation::Remove { .. } | Mutation::ReplaceWith { .. }))
        );

        // Negative control: the previous controlled implementation really does
        // emit the late live-value write that caused the observed keystroke loss.
        let mut controlled = VirtualDom::new_with_props(controlled_fixture, data.clone());
        controlled.rebuild_to_vec();
        data.borrow_mut().0 = "Older delayed event".into();
        controlled.mark_dirty(ScopeId::APP);
        assert!(
            controlled
                .render_immediate_to_vec()
                .edits
                .iter()
                .any(|m| matches!(m, Mutation::SetAttribute { name: "value", .. }))
        );
    }

    fn select_fixture() -> Element {
        rsx! { div {
            LocalSelect { name: "priority", value: "normal", choices: ["high", "normal", "low"].map(|value| (value.into(), value.into())).to_vec(), oninput: |_| {} }
            LocalSelect { name: "group", value: "status", choices: ["none", "status", "priority", "category"].map(|value| (value.into(), value.into())).to_vec(), oninput: |_| {} }
        } }
    }
    #[test]
    fn first_mount_selects_the_retained_nonfirst_options() {
        let mut dom = VirtualDom::new(select_fixture);
        let mutations = dom.rebuild_to_vec();
        let mut values = HashMap::new();
        let mut selected = Vec::new();
        for mutation in mutations.edits {
            match mutation {
                Mutation::SetAttribute {
                    name: "value",
                    value: AttributeValue::Text(value),
                    id,
                    ..
                } => {
                    values.insert(id, value);
                }
                Mutation::SetAttribute {
                    name: "initial_selected",
                    value: AttributeValue::Bool(true),
                    id,
                    ..
                } => selected.push(id),
                Mutation::SetAttribute {
                    name: "selected", ..
                } => panic!("Volatile selection writes would race native interaction"),
                _ => {}
            }
        }
        let mut selected_values = selected
            .iter()
            .map(|id| {
                values
                    .get(id)
                    .expect("Selected option has an explicit value")
                    .as_str()
            })
            .collect::<Vec<_>>();
        selected_values.sort();
        assert_eq!(selected_values, ["normal", "status"]);
    }
}
