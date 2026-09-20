//! An explicit native approval workbench. Its embedded decision is deterministic
//! fixture code; publication means a local outbox artifact, never a remote write.
use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    contract::{Manifest, keys, text},
    effects::Host,
    graph::Transports,
    lease::{self, OwnerLease},
    mailbox::MailboxService,
    process::{ProcessService, read_process_history, verify_process_snapshot},
    process_evidence::{export_process_evidence, verify_process_evidence},
};
use serde_json::{Value, json};
use std::{
    collections::BTreeSet,
    fs::{self, File},
    path::{Component, Path, PathBuf},
};

const NAME: &str = "review";
pub const ACTION: &str = "publish-local-report";
const DEFINITION: &str = "algal.demo-workbench.v1";
const FIXTURE: &str = "deterministic embedded decision; no live provider";

fn physical(path: &Path) -> Result<PathBuf> {
    if path.as_os_str().is_empty()
        || path.to_string_lossy().len() > 4096
        || path.components().any(|c| matches!(c, Component::ParentDir))
    {
        return Err(Error::invalid(
            "demo root must be an explicit bounded path without parent traversal",
        ));
    }
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()?.join(path)
    };
    let parent = absolute
        .parent()
        .ok_or_else(|| Error::invalid("demo root parent"))?
        .canonicalize()?;
    let name = absolute
        .file_name()
        .ok_or_else(|| Error::invalid("demo root leaf"))?;
    Ok(parent.join(name))
}
fn fresh(path: &Path) -> Result<PathBuf> {
    let root = physical(path)?;
    let mut builder = fs::DirBuilder::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder.create(&root).map_err(|error| {
        Error::new(
            "IO_FAILED",
            format!("demo requires a NEW root; existing/partial roots are preserved: {error}"),
        )
    })?;
    File::open(root.parent().unwrap())?.sync_all()?;
    Ok(root)
}
fn identity(root: &Path) -> Result<Value> {
    let meta = fs::symlink_metadata(root)?;
    if !meta.is_dir() || meta.file_type().is_symlink() {
        return Err(Error::invalid("demo root must be a real directory"));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        Ok(json!({"device":meta.dev().to_string(),"inode":meta.ino().to_string()}))
    }
    #[cfg(not(unix))]
    {
        let _ = meta;
        Err(Error::invalid("native demo requires a Unix host"))
    }
}
fn bounded_evidence(value: &Value) -> Result<()> {
    let mut stack = vec![(value, 0)];
    let mut nodes = 0;
    while let Some((v, depth)) = stack.pop() {
        nodes += 1;
        if nodes > 512 || depth > 16 {
            return Err(Error::limit("demo evidence depth/count"));
        }
        match v {
            Value::Object(v) => stack.extend(v.values().map(|v| (v, depth + 1))),
            Value::Array(v) => stack.extend(v.iter().map(|v| (v, depth + 1))),
            _ => (),
        }
    }
    if canonical(value)?.len() > 8192 {
        return Err(Error::limit("demo evidence exceeds 8192 bytes"));
    }
    Ok(())
}
fn edge(from: &str, port: &str, to: &str, input: &str) -> Value {
    json!({"from":{"cell":from,"port":port},"to":{"cell":to,"port":input}})
}
fn programs() -> Result<(Manifest, Manifest)> {
    let wait = Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:demo-approval-wait","name":"Wait after exact proposal publication",
        "interface":{"inputs":{"inbox":{"cell":"input","port":"inbox"},"proposal":{"cell":"input","port":"proposal"}},"outputs":{"approval":{"cell":"receive","port":"message"}}},
        "cells":[{"id":"input","kind":"input","outputs":{"inbox":{"type":"cap","capability":"mailbox-receive"},"proposal":"text"}},{"id":"receive","kind":"tool","tool":"mailbox.receive.v1"}],
        "edges":[edge("input","inbox","receive","mailbox")]}),
    )?;
    let mut conditions = vec![
        json!("and"),
        json!(["eq", ["get", "approval", "decision"], "approve"]),
    ];
    for field in ["demoId", "proposalDigest", "actionDigest", "action"] {
        conditions.push(json!([
            "eq",
            ["get", "approval", field],
            ["get", "binding", field]
        ]));
    }
    let mut edges = vec![
        edge("input", "evidence", "recommend", "evidence"),
        edge("recommend", "out", "propose", "message"),
        edge("input", "proposals", "propose", "mailbox"),
        edge("propose", "id", "wait", "proposal"),
        edge("input", "approvals", "wait", "inbox"),
        edge("wait", "approval", "authorize", "approval"),
        edge("input", "binding", "authorize", "binding"),
        edge("recommend", "out", "authorize", "proposal"),
        edge("input", "publications", "publish", "mailbox"),
    ];
    let mut publish = edge("authorize", "out", "publish", "message");
    publish["guard"] = json!({"field":"action","equals":ACTION});
    edges.push(publish);
    let main = Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:demo-review","name":"Exact local publication approval",
        "budgets":{"maxSteps":64,"maxAgentCalls":1,"maxWork":500000,"maxDepth":4},
        "cells":[{"id":"input","kind":"input","outputs":{"evidence":"json","binding":"json","proposals":{"type":"cap","capability":"mailbox-send"},"approvals":{"type":"cap","capability":"mailbox-receive"},"publications":{"type":"cap","capability":"mailbox-send"}}},
            {"id":"recommend","kind":"agent","inputs":{"evidence":"json"},"prompt":"Deterministic embedded demonstration. Propose the bounded local report for human review; never approve it.","output":{"kind":"json","schema":{"type":"object"}},"budget":{"maxContextBytes":16384,"maxOutputBytes":16384,"maxEffectMs":10000}},
            {"id":"propose","kind":"tool","tool":"mailbox.send.v1"},
            {"id":"wait","kind":"organism","manifest":wait.digest()?},
            {"id":"authorize","kind":"expr","inputs":{"approval":"json","binding":"json","proposal":"json"},"expr":{"contract":"algal.expr.v1","program":["if",conditions,["get","proposal"],{"action":"denied"}]},"output":{"kind":"json","schema":{"type":"object"}}},
            {"id":"publish","kind":"tool","tool":"mailbox.send.v1"}],"edges":edges}),
    )?;
    Ok((main, wait))
}
fn host(root: &Path, definition: &Value) -> Result<Host> {
    let mut host = Host::scripted(json!({"recommend":definition["proposal"]}));
    host.install_mailboxes(MailboxService::open(&root.join("store")))?;
    Ok(host)
}
fn definition(path: &Path) -> Result<(PathBuf, Value)> {
    let root = physical(path)?;
    let current = identity(&root)?;
    let value = lease::read(&root.join("review.json"), 131072)?.ok_or_else(|| {
        Error::new(
            "STORE_MISS",
            "demo initialization is incomplete; preserve this root and choose a new root",
        )
    })?;
    keys(
        &value,
        &[
            "contract",
            "root",
            "identity",
            "demoId",
            "name",
            "evidence",
            "evidenceDigest",
            "proposal",
            "proposalDigest",
            "action",
            "actionDigest",
            "manifestDigest",
            "args",
            "maxGenerations",
        ],
    )?;
    if value["contract"] != DEFINITION
        || value["root"] != json!(root)
        || value["identity"] != current
        || value["name"] != NAME
        || value["maxGenerations"] != 4
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo root/definition identity changed",
        ));
    }
    bounded_evidence(&value["evidence"])?;
    let demo_id = digest(&json!({"contract":DEFINITION,"root":root,"identity":current}))?;
    let evidence_digest = digest(&value["evidence"])?;
    let action = json!({"kind":ACTION,"target":"publication.json","evidenceDigest":evidence_digest,"demoId":demo_id});
    if value["demoId"] != demo_id
        || value["evidenceDigest"] != evidence_digest
        || value["action"] != action
        || value["actionDigest"] != digest(&action)?
        || value["proposalDigest"] != digest(&value["proposal"])?
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo proposal/action/evidence binding changed",
        ));
    }
    let expected_proposal = proposal(&value["evidence"], &action)?;
    if value["proposal"] != expected_proposal
        || value["manifestDigest"] != programs()?.0.digest()?
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo proposal template or program changed",
        ));
    }
    let state = ProcessService::open(&root.join("store"))?.inspect(NAME)?;
    if state.process.args != value["args"]
        || json!(state.process.manifest_digest) != value["manifestDigest"]
        || state.process.max_generations != 4
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo process no longer matches admitted review",
        ));
    }
    let mailboxes = MailboxService::open(&root.join("store"));
    let p = mailboxes
        .inspect("proposals")?
        .ok_or_else(|| Error::invalid("demo proposals missing"))?;
    let a = mailboxes
        .inspect("approvals")?
        .ok_or_else(|| Error::invalid("demo approvals missing"))?;
    let o = mailboxes
        .inspect("publications")?
        .ok_or_else(|| Error::invalid("demo publications missing"))?;
    let expected_args = json!({"input":{"evidence":value["evidence"],"binding":binding(&value),"proposals":p.send,"approvals":a.receive,"publications":o.send}});
    if value["args"] != expected_args {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo approval routing changed",
        ));
    }
    Ok((root, value))
}
fn proposal(evidence: &Value, action: &Value) -> Result<Value> {
    Ok(
        json!({"contract":"algal.demo-proposal.v1","action":ACTION,"title":"Local evidence review report","fixture":FIXTURE,
        "evidenceDigest":digest(evidence)?,"evidence":evidence,"actionDescriptor":action,"actionDigest":digest(action)?,
        "recommendation":"human-review-required","summary":"Publish this exact evidence record locally only if its contents and target are acceptable. This deterministic fixture does not assess factual accuracy."}),
    )
}
fn binding(d: &Value) -> Value {
    json!({"demoId":d["demoId"],"proposalDigest":d["proposalDigest"],"actionDigest":d["actionDigest"],"action":ACTION})
}
fn decision(d: &Value, choice: &str) -> Value {
    let mut v = binding(d);
    v["contract"] = json!("algal.demo-approval.v1");
    v["decision"] = json!(choice);
    v
}
fn read_decision(root: &Path, d: &Value) -> Result<Option<Value>> {
    let value = lease::read(&root.join("decision.json"), 4096)?;
    if let Some(value) = &value {
        let choice = text(&value["decision"], 7)?;
        if !["approve", "deny"].contains(&choice) || value != &decision(d, choice) {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "retained approval binding changed",
            ));
        }
    }
    Ok(value)
}
fn artifact_exists(path: &Path) -> Result<bool> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.is_file() && !meta.file_type().is_symlink() => Ok(true),
        Ok(_) => Err(Error::invalid("demo artifact must be a regular file")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error.into()),
    }
}
fn save_report(root: &Path, report: &Value) -> Result<()> {
    lease::write(&root.join("report.json"), report, true)?;
    crate::demo_report::write(root, report)
}

pub async fn start(path: &Path, evidence: Option<Value>) -> Result<Value> {
    let evidence=evidence.unwrap_or_else(||json!({"subject":"Example release readiness","checks":[{"name":"unit tests","status":"pass"},{"name":"recovery demonstration","status":"pass"}],"note":"Deterministic sample evidence, not results from your project."}));
    bounded_evidence(&evidence)?;
    let (main, wait) = programs()?;
    let root = fresh(path)?;
    let root_identity = identity(&root)?;
    let demo_id = digest(&json!({"contract":DEFINITION,"root":root,"identity":root_identity}))?;
    let evidence_digest = digest(&evidence)?;
    let action = json!({"kind":ACTION,"target":"publication.json","evidenceDigest":evidence_digest,"demoId":demo_id});
    let proposed = proposal(&evidence, &action)?;
    let mut definition = json!({"contract":DEFINITION,"root":root,"identity":root_identity,"demoId":demo_id,"name":NAME,"evidence":evidence,"evidenceDigest":evidence_digest,
        "proposalDigest":digest(&proposed)?,"proposal":proposed,"actionDigest":digest(&action)?,"action":action,"manifestDigest":main.digest()?,"maxGenerations":4});
    let mailboxes = MailboxService::open(&root.join("store"));
    let p = mailboxes.create("proposals", 4, 32768)?;
    let a = mailboxes.create("approvals", 4, 4096)?;
    let o = mailboxes.create("publications", 4, 32768)?;
    let args = json!({"input":{"evidence":definition["evidence"],"binding":binding(&definition),"proposals":p.send,"approvals":a.receive,"publications":o.send}});
    definition["args"] = args.clone();
    lease::write(&root.join("review.json"), &definition, false)?;
    let _owner = OwnerLease::acquire(&root, "demo-review")?;
    let mut service = ProcessService::open(&root.join("store"))?;
    service.store.admit(&wait)?;
    let mut host = host(&root, &definition)?;
    service.create(NAME, main, args, 4, &host, &Transports::new())?;
    service
        .tick_journal(NAME, None, &mut host, &Transports::new(), true, 2)
        .await?;
    let report = inspect(&root).await?;
    save_report(&root, &report)?;
    Ok(report)
}

pub async fn inspect(path: &Path) -> Result<Value> {
    let (root, d) = definition(path)?;
    let service = ProcessService::open(&root.join("store"))?;
    let snapshot = service.inspect(NAME)?;
    let host = host(&root, &d)?;
    let verification = verify_process_snapshot(&snapshot, &service.store, &host).await?;
    let history = read_process_history(&snapshot, &service.store)?;
    let mut decisions = BTreeSet::new();
    let mut proposals = BTreeSet::new();
    let mut publications = BTreeSet::new();
    let mut latest = Value::Null;
    for state in &history {
        if let Some(receipt) = &state.process.receipt {
            let receipt = service
                .store
                .get_bounded("runs", receipt, 16000000)?
                .ok_or_else(|| Error::new("STORE_MISS", "demo receipt missing"))?;
            for (name, counter) in [
                ("recommend", &mut decisions),
                ("propose", &mut proposals),
                ("publish", &mut publications),
            ] {
                let cell = &receipt["cells"][name];
                if cell["status"] == "committed" {
                    counter.insert(text(&cell["effectDigest"], 71)?.to_owned());
                }
            }
            latest = receipt;
        }
    }
    let approval = read_decision(&root, &d)?;
    if let Some(message) = latest["cells"]["wait/receive"]["outputs"].get("message")
        && approval.as_ref() != Some(message)
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "VM approval differs from retained host decision",
        ));
    }
    if publications.len() > 1 || proposals.len() > 1 || decisions.len() > 1 {
        return Err(Error::new(
            "VERIFY_FAILED",
            "demo duplicated an admitted effect",
        ));
    }
    if !publications.is_empty()
        && (approval.as_ref().is_none_or(|a| a["decision"] != "approve")
            || latest["cells"]["authorize"]["outputs"]["out"] != d["proposal"])
    {
        return Err(Error::new(
            "VERIFY_FAILED",
            "publication lacks the exact approved proposal",
        ));
    }
    let status = match snapshot.process.status.as_str() {
        "ready" => "ready",
        "suspended" => "waiting",
        "uncertain" => "uncertain",
        "complete" if !publications.is_empty() => "approved",
        "complete" => "denied",
        _ => "failed",
    };
    let publication = lease::read(&root.join("publication.json"), 32768)?;
    if publication
        .as_ref()
        .is_some_and(|p| p != &d["proposal"] || publications.is_empty())
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "local publication projection is unbound",
        ));
    }
    let executable = std::env::current_exe()?.canonicalize()?;
    if executable.to_string_lossy().len() > 4096 {
        return Err(Error::limit("demo executable path bytes"));
    }
    let history:Vec<_>=history.iter().map(|s|json!({"digest":s.digest,"generation":s.process.generation,"status":s.process.status,"receipt":s.process.receipt})).collect();
    Ok(
        json!({"contract":"algal.demo-report.v1","name":NAME,"root":root,"status":status,"stage":snapshot.process.status,
        "fixture":FIXTURE,"scenario":"Inspect an exact proposal, approve or deny its local publication, and verify retained execution without activating tools.",
        "proposal":{"digest":d["proposalDigest"],"value":d["proposal"]},"evidence":{"digest":d["evidenceDigest"],"value":d["evidence"]},"approval":approval,
        "counters":{"decisions":decisions.len(),"proposals":proposals.len(),"publications":publications.len()},"history":history,"verification":verification,
        "artifacts":{"publication":if publication.is_some(){json!("publication.json")}else{Value::Null},"evidence":if artifact_exists(&root.join("evidence.algal.json"))?{json!("evidence.algal.json")}else{Value::Null},"report":"report.html"},
        "commands":{"inspect":[executable,"demo","inspect",root],"approve":[executable,"demo","approve",root,"--proposal",d["proposalDigest"],"--action",ACTION],"deny":[executable,"demo","deny",root,"--proposal",d["proposalDigest"],"--action",ACTION],"export":[executable,"demo","export",root],"verify":[executable,"demo","verify",root.join("evidence.algal.json")]}}),
    )
}

pub async fn choose(
    path: &Path,
    proposal_digest: &str,
    action: &str,
    approve: bool,
) -> Result<Value> {
    check_digest(proposal_digest)?;
    let (root, before) = definition(path)?;
    let _owner = OwnerLease::acquire(&root, "demo-review")?;
    let (_, d) = definition(&root)?;
    if d != before {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo changed before mutation admission",
        ));
    }
    if d["proposalDigest"] != proposal_digest || action != ACTION {
        return Err(Error::new(
            "CAPABILITY_DENIED",
            "approval must name the exact retained proposal and allowed action",
        ));
    }
    let report = inspect(&root).await?;
    let choice = if approve { "approve" } else { "deny" };
    let approved = decision(&d, choice);
    if let Some(previous) = read_decision(&root, &d)?
        && previous != approved
    {
        return Err(Error::new(
            "CAPABILITY_DENIED",
            "a different decision was already admitted",
        ));
    }
    if report["stage"] == "uncertain" {
        save_report(&root, &report)?;
        return Ok(report);
    }
    if report["stage"] == "complete" {
        if report["status"] == "approved" {
            lease::write(&root.join("publication.json"), &d["proposal"], false)?;
        }
        let report = inspect(&root).await?;
        save_report(&root, &report)?;
        return Ok(report);
    }
    if report["stage"] != "suspended" {
        return Err(Error::new(
            "CAPABILITY_DENIED",
            "demo is not waiting for approval",
        ));
    }
    lease::write(&root.join("decision.json"), &approved, false)?;
    let mailboxes = MailboxService::open(&root.join("store"));
    let mailbox = mailboxes
        .inspect("approvals")?
        .ok_or_else(|| Error::invalid("approval inbox missing"))?;
    mailboxes.send(&mailbox.send, approved.clone(), &digest(&approved)?)?;
    let mut service = ProcessService::open(&root.join("store"))?;
    let mut host = host(&root, &d)?;
    service
        .tick_journal(
            NAME,
            Some(&mailbox.receive),
            &mut host,
            &Transports::new(),
            true,
            2,
        )
        .await?;
    let mut report = inspect(&root).await?;
    if report["status"] == "approved" {
        lease::write(&root.join("publication.json"), &d["proposal"], false)?;
        report = inspect(&root).await?;
    }
    save_report(&root, &report)?;
    Ok(report)
}

/// Refresh only the derived JSON/HTML view; never dispatch a process effect.
pub async fn refresh(path: &Path) -> Result<Value> {
    let (root, before) = definition(path)?;
    let _owner = OwnerLease::acquire(&root, "demo-review")?;
    let (_, current) = definition(&root)?;
    if before != current {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo changed before report admission",
        ));
    }
    let report = inspect(&root).await?;
    save_report(&root, &report)?;
    Ok(report)
}

pub async fn export(path: &Path) -> Result<Value> {
    let (root, before) = definition(path)?;
    let _owner = OwnerLease::acquire(&root, "demo-review")?;
    let (_, d) = definition(&root)?;
    if d != before {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "demo changed before export admission",
        ));
    }
    let service = ProcessService::open(&root.join("store"))?;
    let snapshot = service.inspect(NAME)?;
    let evidence = export_process_evidence(&snapshot, &service.store, &host(&root, &d)?).await?;
    let verification = verify_process_evidence(&evidence).await?;
    lease::write(&root.join("evidence.algal.json"), &evidence, true)?;
    let mut report = inspect(&root).await?;
    report["exportVerification"] = verification;
    save_report(&root, &report)?;
    Ok(evidence)
}

// This backend has a private constructor and is never available through tool
// configuration. It exists solely to put a child we own at a durable barrier.
#[doc(hidden)]
#[derive(Clone)]
pub struct CrashBarrier {
    root: PathBuf,
    definition: Value,
    recovering: bool,
}
impl CrashBarrier {
    pub(crate) async fn run(&self, key: &str, timeout: u64) -> Result<Value> {
        let (_, current) = crash_definition(&self.root, text(&self.definition["token"], 48)?)?;
        if current != self.definition {
            return Err(Error::new("DIGEST_MISMATCH", "fixture definition changed"));
        }
        if self.recovering {
            if current["mode"] != "read" {
                return Err(Error::new(
                    "RECOVERY_BLOCKED",
                    "fixture write cannot recover",
                ));
            }
            return Ok(json!({"out":{"fixture":"recovered deterministic read"}}));
        }
        if current["mode"] == "write" {
            MailboxService::open(&self.root.join("store")).send(
                text(&current["publication"], 256)?,
                json!({"fixture":"write reached publication","token":current["token"]}),
                key,
            )?;
        }
        lease::write(
            &self.root.join("barrier.json"),
            &json!({"contract":"algal.demo-crash-barrier.v1","token":current["token"],"mode":current["mode"],"definitionDigest":digest(&current)?,"idempotencyKey":key}),
            false,
        )?;
        tokio::time::sleep(std::time::Duration::from_millis(timeout.clamp(1000, 15000))).await;
        Err(Error::new(
            "EFFECT_FAILED",
            "fixture barrier expired without its owner terminating the child",
        )
        .uncertain())
    }
}
fn crash_program() -> Result<Manifest> {
    Manifest::parse(
        &json!({"contract":"algal.organism.v1","key":"organism:demo-crash","name":"Deterministic owned crash fixture",
        "cells":[{"id":"source","kind":"input","outputs":{"mailbox":{"type":"cap","capability":"mailbox-send"},"message":"json"}},
        {"id":"prefix","kind":"tool","tool":"mailbox.send.v1"}, {"id":"barrier","kind":"tool","tool":"demo.barrier.v1"}],
        "edges":[edge("source","mailbox","prefix","mailbox"),edge("source","message","prefix","message"),edge("prefix","id","barrier","prefix")]}),
    )
}
fn token(value: &str) -> Result<()> {
    if value.len() != 48
        || !value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err(Error::invalid(
            "fixture token must be 24 random bytes in lowercase hexadecimal",
        ));
    }
    Ok(())
}
fn crash_definition(path: &Path, expected: &str) -> Result<(PathBuf, Value)> {
    token(expected)?;
    let root = physical(path)?;
    let root_identity = identity(&root)?;
    let d = lease::read(&root.join("fixture.json"), 8192)?
        .ok_or_else(|| Error::invalid("crash fixture definition missing"))?;
    keys(
        &d,
        &[
            "contract",
            "root",
            "identity",
            "token",
            "mode",
            "manifestDigest",
            "args",
            "publication",
        ],
    )?;
    if d["contract"] != "algal.demo-crash.v1"
        || d["root"] != json!(root)
        || d["identity"] != root_identity
        || d["token"] != expected
        || ![json!("read"), json!("write")].contains(&d["mode"])
        || d["manifestDigest"] != crash_program()?.digest()?
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "crash fixture admission changed",
        ));
    }
    let mailboxes = MailboxService::open(&root.join("store"));
    let prefix = mailboxes
        .inspect("prefix")?
        .ok_or_else(|| Error::invalid("fixture prefix missing"))?;
    let publication = mailboxes
        .inspect("publications")?
        .ok_or_else(|| Error::invalid("fixture publication missing"))?;
    let args = json!({"source":{"mailbox":prefix.send,"message":{"fixture":"retained prefix","token":expected}}});
    if d["args"] != args || d["publication"] != publication.send {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "crash fixture routing changed",
        ));
    }
    let snapshot = ProcessService::open(&root.join("store"))?.inspect("crash")?;
    if snapshot.process.args != args
        || d["manifestDigest"] != snapshot.process.manifest_digest
        || snapshot.process.max_generations != 2
    {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "crash fixture process changed",
        ));
    }
    Ok((root, d))
}
fn crash_host(root: &Path, d: &Value, recovering: bool) -> Result<Host> {
    use crate::{
        contract::{Signature, ports},
        effects::{Tool, ToolBackend},
    };
    let mut host = Host::default();
    host.install_mailboxes(MailboxService::open(&root.join("store")))?;
    host.tools.insert(
        "demo.barrier.v1".into(),
        Tool {
            configuration_digest: Some(digest(
                &json!({"contract":"algal.demo-crash-binding.v1","definition":d}),
            )?),
            signature: Signature {
                inputs: ports(&json!({"prefix":"text"}), false, false)?,
                outputs: ports(&json!({"out":"json"}), true, false)?,
                cost: 100,
            },
            effect: text(&d["mode"], 5)?.into(),
            max_bytes: 1024,
            backend: ToolBackend::DemoCrash(CrashBarrier {
                root: root.into(),
                definition: d.clone(),
                recovering,
            }),
        },
    );
    Ok(host)
}
#[doc(hidden)]
pub async fn fixture_start(path: &Path, mode: &str, expected: &str) -> Result<Value> {
    token(expected)?;
    if !["read", "write"].contains(&mode) {
        return Err(Error::invalid("fixture mode"));
    }
    let manifest = crash_program()?;
    let root = fresh(path)?;
    let _owner = OwnerLease::acquire(&root, "demo-crash")?;
    let mailboxes = MailboxService::open(&root.join("store"));
    let prefix = mailboxes.create("prefix", 4, 1024)?;
    let publication = mailboxes.create("publications", 4, 1024)?;
    let args = json!({"source":{"mailbox":prefix.send,"message":{"fixture":"retained prefix","token":expected}}});
    let d = json!({"contract":"algal.demo-crash.v1","root":root,"identity":identity(&root)?,"token":expected,"mode":mode,"manifestDigest":manifest.digest()?,"args":args,"publication":publication.send});
    lease::write(&root.join("fixture.json"), &d, false)?;
    let mut host = crash_host(&root, &d, false)?;
    let mut service = ProcessService::open(&root.join("store"))?;
    service.create("crash", manifest, args, 2, &host, &Transports::new())?;
    service
        .tick_journal("crash", None, &mut host, &Transports::new(), true, 2)
        .await?;
    Err(Error::new(
        "VERIFY_FAILED",
        "owned crash fixture did not stop at its barrier",
    ))
}
fn deliveries(root: &Path, name: &str) -> Result<usize> {
    let base = root.join("store/mailboxes").join(name).join("messages");
    for path in [
        root.join("store"),
        root.join("store/mailboxes"),
        root.join("store/mailboxes").join(name),
        base.clone(),
    ] {
        identity(&path)?;
    }
    let names = lease::names(&base, 4)?;
    for file in &names {
        let mut message = lease::read(&base.join(file), 32768)?
            .ok_or_else(|| Error::invalid("fixture delivery disappeared"))?;
        keys(
            &message,
            &["contract", "id", "mailbox", "idempotencyKey", "value"],
        )?;
        let key = text(&message["idempotencyKey"], 71)?;
        check_digest(key)?;
        if message["contract"] != "algal.mailbox-message.v1"
            || message["mailbox"] != name
            || file != &format!("{}.json", &key[7..])
        {
            return Err(Error::invalid("fixture delivery identity"));
        }
        let id = message
            .as_object_mut()
            .unwrap()
            .remove("id")
            .ok_or_else(|| Error::invalid("fixture delivery id"))?;
        if id != digest(&message)? {
            return Err(Error::new(
                "DIGEST_MISMATCH",
                "fixture delivery envelope changed",
            ));
        }
    }
    Ok(names.len())
}
#[doc(hidden)]
pub async fn fixture_recover(path: &Path, expected: &str, intent: &str) -> Result<Value> {
    check_digest(intent)?;
    let (root, before) = crash_definition(path, expected)?;
    let _owner = OwnerLease::acquire(&root, "demo-crash")?;
    let (_, d) = crash_definition(&root, expected)?;
    if before != d {
        return Err(Error::new(
            "DIGEST_MISMATCH",
            "fixture changed before recovery",
        ));
    }
    let mut service = ProcessService::open(&root.join("store"))?;
    let mut host = crash_host(&root, &d, true)?;
    let old = service.inspect("crash")?;
    if old.digest != intent || old.process.status != "uncertain" {
        return Err(Error::new(
            "RECOVERY_BLOCKED",
            "fixture requires exact uncertain intent",
        ));
    }
    let prefix_before = deliveries(&root, "prefix")?;
    let publication_before = deliveries(&root, "publications")?;
    let journal_before = service.journal("crash")?;
    let recovery = service
        .recover("crash", intent, &mut host, &Transports::new())
        .await;
    let refusal = match recovery {
        Ok(_) if d["mode"] == "read" => Value::Null,
        Err(e) if d["mode"] == "write" && e.code == "RECOVERY_BLOCKED" => {
            json!({"code":e.code,"message":e.message})
        }
        Ok(_) => return Err(Error::new("VERIFY_FAILED", "uncertain write recovered")),
        Err(e) => return Err(e),
    };
    let scheduled = service
        .schedule_journal(2, &mut host, &Transports::new(), true, 2)
        .await?;
    let snapshot = service.inspect("crash")?;
    let journal = service.journal("crash")?;
    let prefix = deliveries(&root, "prefix")?;
    let publications = deliveries(&root, "publications")?;
    if prefix_before != 1
        || prefix != 1
        || publication_before != publications
        || publications != if d["mode"] == "write" { 1 } else { 0 }
        || scheduled["ticks"] != 0
    {
        return Err(Error::new(
            "VERIFY_FAILED",
            "fixture dispatch/delivery count changed",
        ));
    }
    if d["mode"] == "write" && (snapshot.digest != old.digest || journal != journal_before) {
        return Err(Error::new(
            "VERIFY_FAILED",
            "blocked write mutated execution evidence",
        ));
    }
    let evidence = export_process_evidence(&snapshot, &service.store, &host).await?;
    let verification = verify_process_evidence(&evidence).await?;
    lease::write(&root.join("evidence.algal.json"), &evidence, false)?;
    let report = json!({"contract":"algal.demo-crash-report.v1","fixture":FIXTURE,"mode":d["mode"],"killedIntent":intent,"status":snapshot.process.status,"recovery":"explicit exact intent only","refusal":refusal,
        "counters":{"prefixPublications":prefix,"pendingWritePublications":publications,"scheduledTicks":scheduled["ticks"]},"journalBefore":journal_before,"journalAfter":journal,"verification":verification});
    lease::write(&root.join("report.json"), &report, false)?;
    Ok(report)
}
async fn child_json(executable: &str, args: &[String]) -> Result<Value> {
    let argv: Vec<_> = std::iter::once(executable.to_owned())
        .chain(args.iter().cloned())
        .collect();
    let bytes = crate::effects::command_output(&argv, None, b"", 4_194_304, 30000).await?;
    crate::canonical::read_json(bytes.as_slice(), 4_194_304)
}
async fn crash_case(executable: &str, path: &Path, mode: &str) -> Result<Value> {
    use std::process::Stdio;
    let mut random = [0u8; 24];
    getrandom::fill(&mut random)
        .map_err(|_| Error::new("IO_FAILED", "fixture entropy unavailable"))?;
    let token: String = random.iter().map(|b| format!("{b:02x}")).collect();
    let mut child = tokio::process::Command::new(executable)
        .args([
            "demo",
            "fixture-start",
            path.to_str()
                .ok_or_else(|| Error::invalid("fixture root UTF-8"))?,
            "--mode",
            mode,
            "--token",
            &token,
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()?;
    let ready = async {
        let start = tokio::time::Instant::now();
        loop {
            if child.try_wait()?.is_some() {
                return Err(Error::new(
                    "VERIFY_FAILED",
                    "crash child exited before its barrier",
                ));
            }
            if let Some(barrier) = lease::read(&path.join("barrier.json"), 4096)? {
                let (_, d) = crash_definition(path, &token)?;
                if barrier["token"] != token
                    || barrier["mode"] != mode
                    || barrier["definitionDigest"] != digest(&d)?
                {
                    return Err(Error::new(
                        "VERIFY_FAILED",
                        "crash readiness token/binding mismatch",
                    ));
                }
                let service = ProcessService::open(&path.join("store"))?;
                let intent = service.inspect("crash")?;
                let journal = service.journal("crash")?;
                let effects = journal["effects"]
                    .as_array()
                    .ok_or_else(|| Error::invalid("fixture journal effects"))?;
                if intent.process.status != "uncertain"
                    || effects.len() != 2
                    || effects[0]["record"]["state"] != "completed"
                    || effects[1]["record"]["state"] != "started"
                    || effects[1]["record"]["idempotencyKey"] != barrier["idempotencyKey"]
                {
                    return Err(Error::new(
                        "VERIFY_FAILED",
                        "crash barrier is not the exact pending journal effect",
                    ));
                }
                return Ok(intent.digest);
            }
            if start.elapsed() > std::time::Duration::from_secs(10) {
                return Err(Error::new("VERIFY_FAILED", "owned child barrier deadline"));
            }
            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        }
    }
    .await;
    // Never consult a PID file: terminate and join only the Child we spawned.
    let killed = child.start_kill();
    let joined = child.wait().await;
    let intent = ready?;
    killed?;
    let status = joined?;
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt;
        if status.signal() != Some(libc::SIGKILL) {
            return Err(Error::new(
                "VERIFY_FAILED",
                "crash child was not killed at its barrier",
            ));
        }
    }
    let mut report = child_json(
        executable,
        &[
            "demo".into(),
            "fixture-recover".into(),
            path.to_string_lossy().into_owned(),
            "--token".into(),
            token,
            "--intent".into(),
            intent,
        ],
    )
    .await?;
    report["ownedChildKilledAndJoined"] = json!(true);
    Ok(report)
}
/// Exercise staged review and exact crash recovery using this executable only.
pub async fn prove(path: &Path) -> Result<Value> {
    let executable = std::env::current_exe()?.canonicalize()?;
    let executable = executable
        .to_str()
        .ok_or_else(|| Error::invalid("executable UTF-8"))?;
    let root = fresh(path)?;
    let _owner = OwnerLease::acquire(&root, "demo-proof")?;
    let approved_root = root.join("approved");
    let denied_root = root.join("denied");
    let approved_path = approved_root.to_string_lossy().into_owned();
    let denied_path = denied_root.to_string_lossy().into_owned();
    let waiting = child_json(
        executable,
        &["demo".into(), "start".into(), approved_path.clone()],
    )
    .await?;
    let proposal = text(&waiting["proposal"]["digest"], 71)?.to_owned();
    let approve_args = [
        "demo".into(),
        "approve".into(),
        approved_path.clone(),
        "--proposal".into(),
        proposal,
        "--action".into(),
        ACTION.into(),
    ];
    let approved = child_json(executable, &approve_args).await?;
    let repeated = child_json(executable, &approve_args).await?;
    let denied_start = child_json(
        executable,
        &["demo".into(), "start".into(), denied_path.clone()],
    )
    .await?;
    let denied = child_json(
        executable,
        &[
            "demo".into(),
            "deny".into(),
            denied_path,
            "--proposal".into(),
            text(&denied_start["proposal"]["digest"], 71)?.into(),
            "--action".into(),
            ACTION.into(),
        ],
    )
    .await?;
    if waiting["status"] != "waiting"
        || approved["status"] != "approved"
        || repeated["verification"] != approved["verification"]
        || denied["status"] != "denied"
        || deliveries(&approved_root, "publications")? != 1
        || deliveries(&denied_root, "publications")? != 0
    {
        return Err(Error::new(
            "VERIFY_FAILED",
            "staged approval proof invariant",
        ));
    }
    let evidence = child_json(executable, &["demo".into(), "export".into(), approved_path]).await?;
    lease::write(&root.join("portable.algal.json"), &evidence, false)?;
    let away = root.join("approved-source-away");
    fs::rename(&approved_root, &away)?;
    File::open(&root)?.sync_all()?;
    let portable = child_json(
        executable,
        &[
            "demo".into(),
            "verify".into(),
            root.join("portable.algal.json")
                .to_string_lossy()
                .into_owned(),
        ],
    )
    .await?;
    if portable["digest"] != approved["verification"]["digest"] {
        return Err(Error::new(
            "VERIFY_FAILED",
            "detached evidence head changed",
        ));
    }
    let read = crash_case(executable, &root.join("read-crash"), "read").await?;
    let write = crash_case(executable, &root.join("write-crash"), "write").await?;
    let report = json!({"contract":"algal.demo-proof.v1","ok":true,"fixture":FIXTURE,"root":root,
        "approval":{"initialStatus":waiting["status"],"status":approved["status"],"duplicateApprovalSameHead":true,"publications":1,"report":"approved-source-away/report.html"},
        "denial":{"status":denied["status"],"publications":0,"report":"denied/report.html"},
        "portable":{"sourceMovedAway":true,"verification":portable,"artifact":"portable.algal.json"},"readCrash":read,"writeCrash":write});
    lease::write(&root.join("proof.json"), &report, false)?;
    Ok(report)
}
