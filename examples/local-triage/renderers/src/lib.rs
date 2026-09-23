use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs,
    io::Read,
    path::PathBuf,
    process::{Command, Stdio},
    sync::atomic::{AtomicU64, Ordering},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

pub type Result<T> = std::result::Result<T, String>;
pub const MAX_BYTES: usize = 262_144;
static SERIAL: AtomicU64 = AtomicU64::new(0);
fn nonce() -> String {
    format!(
        "{:x}-{:x}-{:x}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos(),
        std::process::id(),
        SERIAL.fetch_add(1, Ordering::Relaxed)
    )
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub priority: String,
    pub status: String,
    pub category: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Config {
    pub sort: String,
    pub group: String,
    pub allow_reopen: bool,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Definition {
    pub contract: String,
    pub schema_version: u8,
    pub config: Config,
    pub program: Value,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Draft {
    pub task_id: Option<String>,
    pub title: String,
    pub priority: String,
    pub category: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Session {
    pub contract: String,
    pub filter: String,
    pub query: String,
    pub draft: Draft,
    pub focused_field: Option<String>,
}
impl Default for Session {
    fn default() -> Self {
        Self {
            contract: "algal.triage-session.v1".into(),
            filter: "all".into(),
            query: String::new(),
            draft: Draft {
                task_id: None,
                title: String::new(),
                priority: "normal".into(),
                category: "inbox".into(),
            },
            focused_field: None,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Action {
    pub kind: String,
    pub label: String,
    pub enabled: bool,
    pub reason: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Row {
    pub task: Task,
    pub actions: Vec<Action>,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Group {
    pub id: String,
    pub label: String,
    pub tasks: Vec<Row>,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Field {
    pub name: String,
    pub label: String,
    pub value: String,
    pub max_length: usize,
    pub options: Vec<String>,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Submit {
    pub label: String,
    pub enabled: bool,
    pub reason: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Form {
    pub kind: String,
    pub id: String,
    pub fields: Vec<Field>,
    pub submit: Submit,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Filter {
    pub value: String,
    pub label: String,
    pub selected: bool,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct View {
    pub kind: String,
    pub title: String,
    pub ordering: String,
    pub groups: Vec<Group>,
    pub form: Form,
    pub filters: Vec<Filter>,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Capacity {
    pub tasks: usize,
    pub states: usize,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Why {
    pub task_id: String,
    pub reason: String,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Capture {
    pub contract: String,
    pub application: String,
    pub head: String,
    pub revision: String,
    pub memory: String,
    pub sequence: usize,
    pub definition: Definition,
    pub tasks: Vec<Task>,
    pub session: Session,
    pub view: View,
    pub capacity: Capacity,
    pub evidence: Vec<String>,
    pub why: Vec<Why>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SessionRecord {
    pub contract: String,
    pub application: String,
    pub captured_head: String,
    pub captured_revision: String,
    pub schema_version: u8,
    pub session: Session,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SessionLoad {
    pub record: Option<SessionRecord>,
    pub reference: Option<String>,
    pub status: String,
    pub reason: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Check {
    pub name: String,
    pub passed: bool,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Evaluation {
    pub contract: String,
    pub expected_head: String,
    pub proposal: String,
    pub candidate_revision: String,
    pub accepted: bool,
    pub checks: Vec<Check>,
    pub receipts: Vec<String>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preview {
    pub definition: Definition,
    pub view: View,
    pub why: Vec<Why>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evaluated {
    pub reference: String,
    pub evaluation: Evaluation,
    pub capture: Capture,
    pub preview: Preview,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ControlIdentity {
    pub id: String,
    pub kind: String,
    pub parent: String,
}
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SessionCompatibility {
    pub retain_draft: bool,
    pub requires_rebase: bool,
    pub preserve_focus: bool,
}
pub fn session_compatibility(
    before: &[ControlIdentity],
    after: &[ControlIdentity],
    focused: Option<&str>,
    head_changed: bool,
) -> SessionCompatibility {
    let preserve_focus = focused.is_none_or(|id| {
        before
            .iter()
            .find(|c| c.id == id)
            .is_some_and(|old| after.iter().any(|new| new == old))
    });
    SessionCompatibility {
        retain_draft: true,
        requires_rebase: head_changed || !preserve_focus,
        preserve_focus,
    }
}
fn controls(view: &View) -> Vec<ControlIdentity> {
    view.form
        .fields
        .iter()
        .map(|field| ControlIdentity {
            id: field.name.clone(),
            kind: if field.options.is_empty() {
                "text"
            } else {
                "select"
            }
            .into(),
            parent: view.form.id.clone(),
        })
        .collect()
}

pub fn identifier(s: &str) -> bool {
    s.len() <= 48
        && s.as_bytes().first().is_some_and(u8::is_ascii_lowercase)
        && s.bytes()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}
fn digest(s: &str) -> bool {
    s.len() == 71
        && s.starts_with("sha256:")
        && s[7..]
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}
fn text(s: &str, max: usize) -> bool {
    s.encode_utf16().count() <= max && !s.chars().any(char::is_control)
}
fn valid_session(s: &Session) -> bool {
    s.contract == "algal.triage-session.v1"
        && ["all", "open", "done"].contains(&s.filter.as_str())
        && text(&s.query, 120)
        && text(&s.draft.title, 120)
        && text(&s.draft.category, 24)
        && ["high", "normal", "low"].contains(&s.draft.priority.as_str())
        && s.draft.task_id.as_deref().is_none_or(identifier)
        && s.focused_field
            .as_deref()
            .is_none_or(|f| ["title", "priority", "category", "query"].contains(&f))
}
pub fn bounded_json(bytes: &[u8]) -> Result<Value> {
    if bytes.len() > MAX_BYTES {
        return Err("Host response exceeds byte bound".into());
    }
    let value: Value = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
    fn visit(v: &Value, depth: usize, n: &mut usize) -> Result<()> {
        *n += 1;
        if depth > 32 || *n > 32_768 {
            return Err("Host response structure bound".into());
        }
        match v {
            Value::Array(xs) => {
                if xs.len() > 1024 {
                    return Err("Array bound".into());
                }
                for x in xs {
                    visit(x, depth + 1, n)?;
                }
            }
            Value::Object(xs) => {
                if xs.len() > 256 {
                    return Err("Object bound".into());
                }
                for x in xs.values() {
                    visit(x, depth + 1, n)?;
                }
            }
            Value::String(s) if s.len() > 65_536 => return Err("String bound".into()),
            _ => {}
        }
        Ok(())
    }
    visit(&value, 0, &mut 0)?;
    Ok(value)
}
pub fn parse_capture(value: Value) -> Result<Capture> {
    let c: Capture = serde_json::from_value(value).map_err(|e| e.to_string())?;
    if c.contract != "algal.triage-capture.v1"
        || !identifier(&c.application)
        || ![&c.head, &c.revision, &c.memory].iter().all(|r| digest(r))
        || c.tasks.len() > 32
        || c.sequence > 127
        || c.capacity.tasks != 32 - c.tasks.len()
        || c.capacity.states != 127 - c.sequence
        || ![1, 2].contains(&c.definition.schema_version)
        || c.view.kind != "triage"
        || c.view.groups.len() > 32
        || c.view.form.fields.len() > 3
        || c.view.filters.len() > 3
        || c.definition.contract != "algal.triage-revision.v1"
        || !["priority", "title", "created"].contains(&c.definition.config.sort.as_str())
        || !["none", "status", "priority", "category"].contains(&c.definition.config.group.as_str())
        || !valid_session(&c.session)
        || c.view.form.kind != "form"
        || c.view.form.id != "task-editor"
        || c.view.form.fields.iter().any(|f| {
            !["title", "priority", "category"].contains(&f.name.as_str())
                || f.max_length > 120
                || f.options.len() > 3
                || !text(&f.value, 120)
        })
        || c.view
            .filters
            .iter()
            .any(|f| !["all", "open", "done"].contains(&f.value.as_str()))
        || c.evidence.len() > 16
        || c.evidence.iter().any(|r| !digest(r))
        || c.why.len() > 32
    {
        return Err("Invalid bounded capture".into());
    }
    let mut ids = std::collections::BTreeSet::new();
    for t in &c.tasks {
        if !identifier(&t.id)
            || !ids.insert(&t.id)
            || !text(&t.title, 120)
            || t.title.trim().is_empty()
            || !text(&t.category, 24)
            || !["high", "normal", "low"].contains(&t.priority.as_str())
            || !["open", "done"].contains(&t.status.as_str())
        {
            return Err("Invalid task".into());
        }
    }
    let mut shown = std::collections::BTreeSet::new();
    for g in &c.view.groups {
        for r in &g.tasks {
            if !c.tasks.contains(&r.task)
                || !shown.insert(&r.task.id)
                || r.actions.len() > 3
                || r.actions
                    .iter()
                    .any(|a| !["edit", "complete", "reopen"].contains(&a.kind.as_str()))
            {
                return Err("Presentation differs from captured task facts".into());
            }
        }
    }
    Ok(c)
}

#[derive(Clone, Debug)]
pub struct Options {
    pub host: PathBuf,
    pub directory: PathBuf,
    pub application: String,
    pub snapshot: bool,
}
impl Options {
    pub fn apple_available(&self) -> bool {
        self.host.parent().is_some_and(|parent| {
            parent.join("algal-native").is_file() && parent.join("algal-apple").is_file()
        })
    }
    pub fn apple_options(&self, instruction: &str) -> Result<Value> {
        if !self.apple_available() {
            return Err(
                "This package has no bundled Apple runtime; import an explicit proposal instead"
                    .into(),
            );
        }
        if instruction.trim().is_empty()
            || instruction.encode_utf16().count() > 512
            || instruction.chars().any(char::is_control)
        {
            return Err("Describe a workflow change in 1–512 characters".into());
        }
        let parent = self.host.parent().ok_or("Missing host parent")?;
        Ok(
            json!({ "native":parent.join("algal-native"), "bridge":parent.join("algal-apple"), "attemptDirectory":self.directory.join("inference-attempts").join(nonce()), "instruction":instruction }),
        )
    }
    pub fn parse() -> Result<Self> {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let parent = exe.parent().ok_or("Missing executable parent")?;
        let host = if parent.file_name().is_some_and(|n| n == "MacOS") {
            parent.join("../Resources/bin/triage-host")
        } else {
            parent.join("triage-host")
        };
        let default_directory = std::env::var_os("HOME")
            .map(|home| PathBuf::from(home).join("Library/Application Support/ALGAL Triage"))
            .unwrap_or_default();
        let mut result = Self {
            host,
            directory: default_directory,
            application: "local-triage".into(),
            snapshot: false,
        };
        let mut args = std::env::args().skip(1);
        while let Some(arg) = args.next() {
            match arg.as_str() {
                "--host" => result.host = args.next().ok_or("--host requires a path")?.into(),
                "--dir" => result.directory = args.next().ok_or("--dir requires a path")?.into(),
                "--application" => {
                    result.application = args.next().ok_or("--application requires ID")?
                }
                "--snapshot" => result.snapshot = true,
                _ => return Err(format!("Unknown argument {arg}")),
            }
        }
        if result.directory.as_os_str().is_empty() {
            return Err("Pass --dir when HOME is unavailable".into());
        }
        if !identifier(&result.application) {
            return Err("Invalid application identity".into());
        }
        result.host = fs::canonicalize(&result.host)
            .map_err(|e| format!("Host executable unavailable: {e}"))?;
        if !fs::metadata(&result.host)
            .map_err(|e| e.to_string())?
            .is_file()
        {
            return Err("Host path is not a file".into());
        }
        Ok(result)
    }
    pub fn call(&self, args: &[&str], input: Option<&Value>) -> Result<Value> {
        let request = if let Some(value) = input {
            let dir = std::env::temp_dir().join(format!("algal-triage-ui-{}", nonce()));
            fs::create_dir(&dir).map_err(|e| e.to_string())?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&dir, fs::Permissions::from_mode(0o700))
                    .map_err(|e| e.to_string())?;
            }
            let file = dir.join("request.json");
            let bytes = serde_json::to_vec(value).map_err(|e| e.to_string())?;
            if bytes.len() > MAX_BYTES {
                return Err("Request bound exceeded".into());
            }
            fs::write(&file, bytes).map_err(|e| e.to_string())?;
            Some((dir, file))
        } else {
            None
        };
        let result = (|| {
            let mut command = Command::new(&self.host);
            command.arg(&self.directory).arg(&self.application);
            for arg in args {
                if *arg == "@json" {
                    command.arg(&request.as_ref().ok_or("JSON placeholder without input")?.1);
                } else {
                    command.arg(arg);
                }
            }
            let mut child = command
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| e.to_string())?;
            let stdout = child.stdout.take().ok_or("Missing host stdout")?;
            let stderr = child.stderr.take().ok_or("Missing host stderr")?;
            let out = thread::spawn(move || {
                let mut bytes = Vec::new();
                stdout
                    .take((MAX_BYTES + 1) as u64)
                    .read_to_end(&mut bytes)
                    .map(|_| bytes)
            });
            let err = thread::spawn(move || {
                let mut bytes = Vec::new();
                stderr.take(16_385).read_to_end(&mut bytes).map(|_| bytes)
            });
            let deadline = Instant::now()
                + Duration::from_secs(if args.first() == Some(&"propose-apple") {
                    120
                } else {
                    45
                });
            let status = loop {
                if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                    break status;
                }
                if Instant::now() > deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    let _ = out.join();
                    let _ = err.join();
                    return Err("Host timed out. Refresh and reconcile retained state before another mutation.".into());
                }
                thread::sleep(Duration::from_millis(10));
            };
            let bytes = out
                .join()
                .map_err(|_| "Host stdout thread failed")?
                .map_err(|e| e.to_string())?;
            let errors = err
                .join()
                .map_err(|_| "Host stderr thread failed")?
                .map_err(|e| e.to_string())?;
            if !status.success() {
                return Err(String::from_utf8_lossy(&errors)
                    .chars()
                    .take(1024)
                    .collect());
            }
            bounded_json(&bytes)
        })();
        if let Some((directory, _)) = request {
            let _ = fs::remove_dir_all(directory);
        }
        result
    }
}

#[derive(Clone, Debug)]
pub struct Model {
    pub options: Options,
    pub capture: Capture,
    pub session: Session,
    pub session_ref: Option<String>,
    pub stale: bool,
    pub dirty: bool,
    pub message: String,
    pub preview: Option<Evaluated>,
    pub policy: Config,
    pub schema_version: u8,
    pub path: String,
    pub fork_name: String,
}
impl Model {
    pub fn open(options: Options) -> Result<Self> {
        // An absent app is initialized explicitly; an unreadable/corrupt existing
        // application is never replaced by this path.
        let initial = match options.call(&["capture"], None) {
            Ok(value) => value,
            Err(e) if e.contains("Initialize this local triage application first") => {
                options.call(&["init"], None)?
            }
            Err(e) => return Err(e),
        };
        let capture = parse_capture(initial)?;
        let loaded: SessionLoad =
            serde_json::from_value(options.call(&["load-session", "native"], None)?)
                .map_err(|e| e.to_string())?;
        let session = loaded
            .record
            .as_ref()
            .map(|r| r.session.clone())
            .unwrap_or_default();
        let stale = loaded.status == "stale"
            || loaded
                .record
                .as_ref()
                .is_some_and(|r| r.captured_head != capture.head);
        let capture = parse_capture(options.call(&["capture", "@json"], Some(&json!(session)))?)?;
        Ok(Self {
            policy: capture.definition.config.clone(),
            schema_version: capture.definition.schema_version,
            options,
            capture,
            session,
            session_ref: loaded.reference,
            stale,
            dirty: false,
            message: loaded
                .reason
                .unwrap_or_else(|| "Local facts, local drafts. No network required.".into()),
            preview: None,
            path: String::new(),
            fork_name: "experiment".into(),
        })
    }
    pub fn perform(&mut self, result: Result<()>) {
        if let Err(error) = result {
            self.message = error;
        }
    }
    pub fn refresh(&mut self) -> Result<()> {
        let c = parse_capture(
            self.options
                .call(&["capture", "@json"], Some(&json!(self.session)))?,
        )?;
        let compatibility = session_compatibility(
            &controls(&self.capture.view),
            &controls(&c.view),
            self.session
                .focused_field
                .as_deref()
                .filter(|f| *f != "query"),
            c.head != self.capture.head,
        );
        self.stale |= compatibility.requires_rebase;
        if !compatibility.preserve_focus {
            self.session.focused_field = None;
        }
        self.capture = c;
        self.message = if self.stale {
            "State changed. Your draft is retained; explicitly rebase before submitting."
        } else {
            "Refreshed the same captured state."
        }
        .into();
        Ok(())
    }
    pub fn save(&mut self, rebase: bool) -> Result<()> {
        if self.stale && !rebase {
            return Err("Draft is stale. Refresh, inspect changes, then Rebase draft.".into());
        }
        let loaded: SessionLoad = serde_json::from_value(self.options.call(&["save-session", "native", "@json"], Some(&json!({ "expectedSession": self.session_ref, "capturedHead": self.capture.head, "session": self.session })))?).map_err(|e| e.to_string())?;
        self.session_ref = loaded.reference;
        self.stale = loaded.status != "current";
        self.dirty = false;
        self.message = "Draft saved separately from task facts.".into();
        Ok(())
    }
    pub fn reload_draft(&mut self) -> Result<()> {
        let loaded: SessionLoad =
            serde_json::from_value(self.options.call(&["load-session", "native"], None)?)
                .map_err(|e| e.to_string())?;
        if let Some(record) = loaded.record {
            self.session = record.session;
            self.stale = record.captured_head != self.capture.head;
        }
        self.session_ref = loaded.reference;
        self.dirty = false;
        self.refresh()?;
        self.message = "Loaded the retained draft after explicit discard of unsaved edits.".into();
        Ok(())
    }
    pub fn edit(&mut self, task: &Task) {
        self.session.draft = Draft {
            task_id: Some(task.id.clone()),
            title: task.title.clone(),
            priority: task.priority.clone(),
            category: task.category.clone(),
        };
        self.dirty = true;
        self.message = "Editing a session draft. Submit to change task facts.".into();
    }
    pub fn new_draft(&mut self) {
        self.session.draft = Session::default().draft;
        self.dirty = true;
    }
    fn operation(&self, label: &str) -> Result<String> {
        self.options
            .call(&["operation", &format!("{label}-{}", nonce())], None)?
            .as_str()
            .map(str::to_owned)
            .ok_or("Host did not return an operation digest".into())
    }
    pub fn action(&mut self, action: Value) -> Result<()> {
        if self.stale {
            return Err("Refresh and explicitly rebase the stale draft first".into());
        }
        let operation = self.operation("command")?;
        let next = self.options.call(&["command", "@json"], Some(&json!({ "contract":"algal.triage-command.v1", "expectedHead":self.capture.head, "operation":operation, "action":action })));
        match next {
            Ok(value) => {
                self.capture = parse_capture(value)?;
                self.preview = None;
                self.message = "Task facts committed with a replayable receipt.".into();
                Ok(())
            }
            Err(e) => {
                self.stale = true;
                Err(e)
            }
        }
    }
    pub fn submit(&mut self) -> Result<()> {
        let draft = &self.session.draft;
        let action = if let Some(task_id) = &draft.task_id {
            json!({ "kind":"edit", "taskId":task_id, "title":draft.title, "priority":draft.priority, "category":draft.category })
        } else {
            json!({ "kind":"add", "task":{ "id":format!("task-{}", nonce()), "title":draft.title, "priority":draft.priority, "category":draft.category, "status":"open" } })
        };
        self.action(action)?;
        self.new_draft();
        self.save(false)?;
        self.refresh()
    }
    pub fn filter(&mut self, filter: &str) -> Result<()> {
        self.session.filter = filter.into();
        self.dirty = true;
        self.refresh()
    }
    pub fn evaluate(&mut self) -> Result<()> {
        if self.stale {
            return Err("Rebase before proposing a revision".into());
        }
        let proposal = json!({ "contract":"algal.triage-proposal.v1", "expectedHead":self.capture.head, "config":self.policy, "schemaVersion":self.schema_version, "source":"owner", "rationale":"Owner requested this local task workflow." });
        let result: Evaluated = serde_json::from_value(
            self.options
                .call(&["propose-evaluate", "@json"], Some(&proposal))?,
        )
        .map_err(|e| e.to_string())?;
        self.message = "Preview only: current facts and policy are unchanged.".into();
        self.preview = Some(result);
        Ok(())
    }
    pub fn import_proposal(&mut self) -> Result<()> {
        let result: Evaluated =
            serde_json::from_value(self.options.call(&["propose-evaluate", &self.path], None)?)
                .map_err(|e| e.to_string())?;
        self.preview = Some(result);
        self.message = "Imported proposal evaluated; inspect checks before adoption.".into();
        Ok(())
    }
    pub fn adopt(&mut self) -> Result<()> {
        let preview = self.preview.as_ref().ok_or("Preview a policy first")?;
        if !preview.evaluation.accepted || self.stale {
            return Err("Rejected or stale policy cannot be adopted".into());
        }
        let reference = preview.reference.clone();
        let operation = self.operation("adopt")?;
        self.capture = parse_capture(
            self.options
                .call(&["adopt", &reference, &operation], None)?,
        )?;
        self.policy = self.capture.definition.config.clone();
        self.schema_version = self.capture.definition.schema_version;
        self.preview = None;
        self.stale = true;
        self.message =
            "Revision adopted; task facts retained. Rebase your retained draft explicitly.".into();
        Ok(())
    }
    pub fn export(&mut self) -> Result<()> {
        self.options.call(&["export", &self.path], None)?;
        self.message =
            "Portable pure evidence exported; no drafts or mutable custody copied.".into();
        Ok(())
    }
    pub fn import(&mut self) -> Result<()> {
        let response = self.options.call(&["import", &self.path], None)?;
        self.message = format!(
            "Imported without adoption: {}",
            response["reference"].as_str().unwrap_or("unknown")
        );
        Ok(())
    }
    pub fn fork(&mut self) -> Result<()> {
        if !identifier(&self.fork_name) {
            return Err("Choose a lowercase fork identity".into());
        }
        self.options
            .call(&["fork", &self.path, &self.fork_name], None)?;
        self.message = format!(
            "Created independent app {}. Open with --application {}.",
            self.fork_name, self.fork_name
        );
        Ok(())
    }
    pub fn rows(&self) -> Vec<Row> {
        self.capture
            .view
            .groups
            .iter()
            .flat_map(|g| g.tasks.iter().cloned())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn identifiers_and_foreign_json_are_bounded() {
        assert!(identifier("task-123"));
        assert!(!identifier("../state"));
        assert!(!identifier(&"a".repeat(49)));
        assert!(bounded_json(&vec![b' '; MAX_BYTES + 1]).is_err());
        assert!(serde_json::from_value::<Draft>(json!({"taskId":null,"title":"x","priority":"normal","category":"inbox","authority":true})).is_err());
    }
    #[test]
    fn drafts_are_independent_typed_data() {
        let mut s = Session::default();
        s.draft.title = "Unsubmitted".into();
        let bytes = serde_json::to_vec(&s).unwrap();
        let restored: Session = serde_json::from_value(bounded_json(&bytes).unwrap()).unwrap();
        assert_eq!(s, restored);
        assert!(!String::from_utf8(bytes).unwrap().contains("expectedHead"));
    }
    #[test]
    fn digest_and_text_bounds_match_contract_shape() {
        assert!(digest(&format!("sha256:{}", "a".repeat(64))));
        assert!(!digest("sha256:short"));
        assert!(text("🌱", 2));
        assert!(!text("🌱", 1));
        assert!(!text("bad\nline", 120));
    }
    #[test]
    fn real_capture_is_renderable_and_foreign_or_incoherent_data_is_rejected() {
        let value = bounded_json(include_bytes!("../fixture.json")).unwrap();
        let capture = parse_capture(value.clone()).unwrap();
        assert_eq!(capture.tasks.len(), 2);
        assert_eq!(capture.view.groups[0].tasks[0].task.id, "review");
        let mut extra = value.clone();
        extra["authority"] = json!(true);
        assert!(parse_capture(extra).is_err());
        let mut dishonest = value.clone();
        dishonest["view"]["groups"][0]["tasks"][0]["task"]["title"] =
            json!("Unbacked displayed content");
        assert!(parse_capture(dishonest).is_err());
        let mut overflow = value;
        overflow["capacity"]["tasks"] = json!(33);
        assert!(parse_capture(overflow).is_err());
    }
    #[test]
    fn shared_session_identity_fixtures_preserve_draft_and_require_explicit_rebase() {
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields, rename_all = "camelCase")]
        struct Case {
            name: String,
            before: Vec<ControlIdentity>,
            after: Vec<ControlIdentity>,
            focused_field: Option<String>,
            head_changed: bool,
            expected: SessionCompatibility,
        }
        let fixtures: Vec<Case> =
            serde_json::from_str(include_str!("../../session-compatibility-fixtures.json"))
                .unwrap();
        assert_eq!(fixtures.len(), 5);
        for case in fixtures {
            assert_eq!(
                session_compatibility(
                    &case.before,
                    &case.after,
                    case.focused_field.as_deref(),
                    case.head_changed
                ),
                case.expected,
                "{}",
                case.name
            );
        }
    }
}
