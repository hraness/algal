//! Domain episode execution — the `start-episode` dispatch leg of
//! `examples/coding-harness/application.ts` and `src/application-episode.ts`.
//! The admitted episode binding carries the captured application state: the
//! bound manifest runs under the entrypoint's declared capabilities, its run
//! receipt embeds in an `algal.episode-outcome.v1` record, and the dispatch
//! settles with `{kind: "episode", binding, process, outcome}`. Settlement is not a
//! task claim — the run outcome lives in the evidence, so a failed episode
//! still settles (its receipt records the failure).
//!
//! The process binding (`binding.process`) is the run's `processName`: any
//! effects it performs derive their idempotency keys from the same
//! `algal.process-effect.v1` scope on both runtimes. The native surface
//! supplies the builtin `fn` registry only — manifests needing executors
//! fail in-run, which records honestly in the receipt.

use serde_json::{Value, json};
use std::path::Path;

use crate::application::{DispatchContext, DispatchPlan, parse_revision};
use crate::application_memory::{get_record, put_record};
use crate::contract::object;
use crate::effects::Host;
use crate::graph::{self, Transports};
use crate::mailbox::MailboxService;
use crate::process::ProcessService;
use crate::store::Store;
use crate::{Error, Result};

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

/// Execute one admitted episode binding and return the settlement outcome.
/// `dir` is the application store root — the dispatcher opens its own handle
/// because the dispatch context borrows the service's store immutably.
pub async fn dispatch_episode(context: &DispatchContext<'_>, dir: &Path) -> Result<Value> {
    episode(context, dir, false).await
}

pub async fn reconcile_episode(context: &DispatchContext<'_>, dir: &Path) -> Result<Value> {
    episode(context, dir, true).await
}

async fn episode(context: &DispatchContext<'_>, dir: &Path, reconciliation: bool) -> Result<Value> {
    let binding = match &context.dispatch.plan {
        DispatchPlan::Episode { binding } => binding,
        DispatchPlan::Delivery { .. } => return Err(fail("expected episode plan")),
    };
    let mut store = Store::open(dir, true)?;
    let manifest = store.manifest(&binding.manifest)?;
    // The revision binds the entrypoint's declared capabilities; the native
    // surface supplies no injected executors, so a manifest that needs them
    // fails in-run and records that outcome in its receipt.
    let revision = parse_revision(&get_record(&store, &binding.revision)?)?;
    let entry = revision.entrypoints.iter().find(|entry| entry.name == binding.entrypoint)
        .ok_or_else(|| fail("Episode entrypoint binding changed"))?;
    if entry.manifest != binding.manifest || entry.max_generations != binding.max_generations {
        return Err(fail("Episode entrypoint binding changed"));
    }
    let args = get_record(&store, &binding.arguments)?;
    object(&args)?;
    let mut host = Host::default();
    let transports = Transports::new();
    let compiled = graph::compile(manifest.clone(), &mut store, &host.tool_signatures(), &transports, 0)?;
    let mut stack = vec![&compiled];
    let mut journal = true;
    while let Some(program) = stack.pop() {
        if program.manifest.cells.iter().any(|cell| matches!(cell["kind"].as_str(), Some("slot" | "spawn"))) { journal = false; }
        stack.extend(program.children.values());
    }
    let binding_ref = put_record(&mut store, &binding.value)?;
    let mut processes = ProcessService::open(dir)?;
    let head_path = dir.join("processes").join(&binding.process).join("head.json");
    let mut state = match std::fs::symlink_metadata(head_path) {
        Ok(_) => processes.inspect(&binding.process)?,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            match processes.create(&binding.process, manifest, args.clone(), binding.max_generations, &host, &transports) {
                Ok(state) => state,
                Err(error) => processes.inspect(&binding.process).map_err(|_| error)?,
            }
        }
        Err(error) => return Err(error.into()),
    };
    if state.process.name != binding.process || state.process.manifest_digest != binding.manifest ||
        state.process.max_generations != binding.max_generations || state.process.args != args {
        return Err(fail("Existing process does not match the episode binding"));
    }
    if state.process.status == "ready" {
        state = processes.tick_journal(&binding.process, None, &mut host, &transports, journal, 2).await?;
    } else if state.process.status == "uncertain" {
        if !reconciliation || !journal {
            return Ok(json!({"status":"blocked","reason":"Uncertain process requires explicit journal-safe or adapter reconciliation"}));
        }
        match processes.recover(&binding.process, &state.digest, &mut host, &transports).await {
            Ok(recovered) => state = recovered,
            Err(_) => return Ok(json!({"status":"blocked","reason":"Process journal could not establish safe recovery; adapter reconciliation required"})),
        }
    } else if state.process.status == "suspended" && reconciliation && state.process.generation < state.process.max_generations {
        let mailboxes = MailboxService::open(dir);
        for wake in state.process.wake.clone() {
            if wake.starts_with("cap:mailbox-receive:") && mailboxes.has_pending(&wake)? {
                state = processes.tick_journal(&binding.process, Some(&wake), &mut host, &transports, journal, 2).await?;
                break;
            }
        }
    }
    if state.process.status == "suspended" {
        return Ok(json!({"status":"blocked","reason":if state.process.generation >= state.process.max_generations { "Episode process generation budget exhausted" } else { "Episode process is suspended awaiting an admitted wake" }}));
    }
    if !["complete", "failed", "stuck"].contains(&state.process.status.as_str()) {
        return Ok(json!({"status":"blocked","reason":"Episode process has no terminal receipt"}));
    }
    let receipt_ref = state.process.receipt.as_ref().ok_or_else(|| fail("Episode process has no terminal receipt"))?;
    let receipt = processes.store.get("runs", receipt_ref)?.ok_or_else(|| fail("Episode process receipt missing"))?;
    crate::receipt::validate(&receipt)?;
    if receipt["manifestDigest"] != binding.manifest || receipt["args"] != args {
        return Err(fail("Episode process receipt binding changed"));
    }
    let outcome = put_record(
        &mut store,
        &json!({
            "contract": "algal.episode-outcome.v1",
            "binding": binding_ref,
            "processState": state.digest,
            "receipt": receipt,
        }),
    )?;
    Ok(json!({
        "status": "settled",
        "result": {"kind": "episode", "binding": binding_ref, "process": binding.process.as_str(), "outcome": outcome},
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{
        Dispatch, DispatchPlan, Revision, Snapshot, State, Transition, TransitionKind,
        parse_episode_binding, parse_intent, process_name,
    };
    use crate::application_memory::app_json;
    use crate::canonical::digest;
    use crate::contract::Manifest;
    use serde_json::{Value, json};
    use tempfile::tempdir;

    fn hashed(value: &Value) -> String {
        digest(&app_json(value).unwrap()).unwrap()
    }

    fn seed(dir: &Path) -> (String, String, String) {
        let mut store = Store::open(dir, true).unwrap();
        let manifest = store
            .put(
                "manifests",
                &Manifest::parse(&json!({
                    "contract": "algal.organism.v1", "key": "organism:episode", "name": "episode",
                    "interface": {
                        "inputs": {"q": {"cell": "src", "port": "value"}},
                        "outputs": {"answer": {"cell": "out", "port": "value"}},
                    },
                    "cells": [
                        {"id": "src", "kind": "input", "outputs": {"value": "json"}},
                        {"id": "out", "kind": "const", "outputs": {"value": {"type": "json", "value": "ok"}}},
                    ],
                    "edges": [],
                }))
                .unwrap()
                .value,
            )
            .unwrap();
        let revision = put_record(
            &mut store,
            &json!({
                "contract": "algal.application-revision.v1", "application": "parity",
                "parent": null, "schema": hashed(&json!({"a":1})),
                "queries": hashed(&json!({"b":2})), "views": hashed(&json!({"c":3})),
                "runtimeProfile": hashed(&json!({"d":4})),
                "evaluationPolicy": hashed(&json!({"p":5})), "capabilityRequirements": [],
                "entrypoints": [{"name":"run","manifest":manifest,
                    "applicability":hashed(&json!({"e":6})),"maxGenerations":4,
                    "capabilities":[],"queries":[]}],
            }),
        )
        .unwrap();
        let arguments = put_record(&mut store, &json!({"src": {"value": "probe"}})).unwrap();
        (manifest, revision, arguments)
    }

    fn snapshot() -> Snapshot {
        Snapshot {
            digest: hashed(&json!({"snap":1})),
            state: State {
                application: "parity".to_owned(),
                sequence: 0,
                epoch: 0,
                revision: hashed(&json!({"r":1})),
                memory: hashed(&json!({"m":1})),
                previous: None,
                transition: hashed(&json!({"t":1})),
                value: Value::Null,
            },
            transition: Transition {
                application: "parity".to_owned(),
                operation: hashed(&json!({"o":1})),
                request: hashed(&json!({"q":1})),
                kind: TransitionKind::Create,
                previous: None,
                revision: hashed(&json!({"r":1})),
                memory: hashed(&json!({"m":1})),
                intents: vec![],
                evidence: vec![],
                caused_by: None,
                value: Value::Null,
            },
            revision: Revision {
                application: "parity".to_owned(),
                parent: None,
                schema: hashed(&json!({"a":1})),
                queries: hashed(&json!({"b":2})),
                views: hashed(&json!({"c":3})),
                runtime_profile: hashed(&json!({"d":4})),
                evaluation_policy: hashed(&json!({"p":5})),
                capability_requirements: vec![],
                entrypoints: vec![],
                value: Value::Null,
            },
        }
    }

    fn episode_dispatch(
        manifest: &str,
        revision: &str,
        arguments: &str,
        intent_ref: &str,
    ) -> Dispatch {
        let binding = parse_episode_binding(&json!({
            "contract": "algal.application-episode.v1", "application": "parity",
            "intent": intent_ref, "sourceState": hashed(&json!({"s":1})),
            "revision": revision, "memory": hashed(&json!({"m":1})), "epoch": 0,
            "entrypoint": "run", "manifest": manifest, "arguments": arguments,
            "process": process_name("parity", intent_ref).unwrap(),
            "maxGenerations": 4, "hostProfile": hashed(&json!({"h":1})), "access": "observe",
        }))
        .unwrap();
        Dispatch {
            application: "parity".to_owned(),
            intent: intent_ref.to_owned(),
            source_state: hashed(&json!({"s":1})),
            configuration_digest: hashed(&json!({"cfg":1})),
            identity: hashed(&json!({"id":1})),
            plan: DispatchPlan::Episode {
                binding: Box::new(binding),
            },
            status: "started".to_owned(),
            result: None,
            reason: None,
            value: Value::Null,
        }
    }

    #[tokio::test]
    async fn episode_dispatch_runs_the_bound_manifest_and_settles() {
        let tmp = tempdir().unwrap();
        let (manifest, revision, arguments) = seed(tmp.path());
        let intent = parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "parity",
            "operation": hashed(&json!({"op":1})), "ordinal": 0,
            "kind": "start-episode", "entrypoint": "run", "input": arguments,
        }))
        .unwrap();
        let intent_ref = hashed(&intent.value);
        let dispatch = episode_dispatch(&manifest, &revision, &arguments, &intent_ref);
        let snapshot = snapshot();
        let context = DispatchContext {
            current: &snapshot,
            snapshot: &snapshot,
            intent: &intent,
            dispatch: &dispatch,
        };
        let outcome = dispatch_episode(&context, tmp.path()).await.unwrap();
        assert_eq!(outcome["status"], json!("settled"));
        assert_eq!(outcome["result"]["kind"], json!("episode"));
        assert_eq!(
            outcome["result"]["binding"],
            json!(hashed(&dispatch.plan.value()["binding"]))
        );
        // The outcome record is durable: binding and receipt both landed.
        let store = Store::open(tmp.path(), false).unwrap();
        let outcome_ref = outcome["result"]["outcome"].as_str().unwrap();
        let evidence = get_record(&store, outcome_ref).unwrap();
        assert_eq!(evidence["contract"], "algal.episode-outcome.v1");
        assert_eq!(evidence["binding"], outcome["result"]["binding"]);
        assert_eq!(evidence["receipt"]["manifestDigest"], manifest);
        assert_eq!(evidence["receipt"]["outcome"], "complete");
        let process = ProcessService::open(tmp.path()).unwrap().inspect(outcome["result"]["process"].as_str().unwrap()).unwrap();
        assert_eq!(process.digest, evidence["processState"]);
        assert_eq!(process.process.max_generations, 4);
        assert_eq!(process.process.generation, 1);
        assert_eq!(reconcile_episode(&context, tmp.path()).await.unwrap(), outcome);
        assert_eq!(dispatch_episode(&context, tmp.path()).await.unwrap(), outcome);
    }

    #[tokio::test]
    async fn existing_process_reuse_requires_exact_arguments_and_generation_budget() {
        for mismatch in [None, Some("arguments"), Some("budget")] {
            let tmp = tempdir().unwrap();
            let (manifest, revision, arguments) = seed(tmp.path());
            let intent = parse_intent(&json!({"contract":"algal.application-intent.v1","application":"parity",
                "operation":hashed(&json!("create-reuse")),"ordinal":0,"kind":"start-episode","entrypoint":"run","input":arguments})).unwrap();
            let dispatch = episode_dispatch(&manifest, &revision, &arguments, &hashed(&intent.value));
            let snapshot = snapshot();
            let context = DispatchContext { current: &snapshot, snapshot: &snapshot, intent: &intent, dispatch: &dispatch };
            let name = dispatch.plan.value()["binding"]["process"].as_str().unwrap().to_owned();
            let mut processes = ProcessService::open(tmp.path()).unwrap();
            let program = processes.store.manifest(&manifest).unwrap();
            let mut args = get_record(&processes.store, &arguments).unwrap();
            if mismatch == Some("arguments") { args["src"]["value"] = json!("different"); }
            let ready = processes.create(&name, program, args, if mismatch == Some("budget") { 5 } else { 4 }, &Host::default(), &Transports::new()).unwrap();
            let result = reconcile_episode(&context, tmp.path()).await;
            if mismatch.is_some() {
                assert!(result.unwrap_err().message.contains("does not match"));
                assert_eq!(processes.inspect(&name).unwrap().digest, ready.digest);
            } else {
                assert_eq!(result.unwrap()["status"], "settled");
                assert_eq!(processes.inspect(&name).unwrap().process.generation, 1);
            }
        }
    }

    #[tokio::test]
    async fn explicit_recovery_resumes_pure_intent_but_never_unknown_write() {
        for unknown_write in [false, true] {
            let tmp = tempdir().unwrap();
            let (manifest, revision, arguments) = seed(tmp.path());
            let intent = parse_intent(&json!({"contract":"algal.application-intent.v1","application":"parity",
                "operation":hashed(&json!("recover")),"ordinal":0,"kind":"start-episode","entrypoint":"run","input":arguments})).unwrap();
            let dispatch = episode_dispatch(&manifest, &revision, &arguments, &hashed(&intent.value));
            let snapshot = snapshot();
            let context = DispatchContext { current: &snapshot, snapshot: &snapshot, intent: &intent, dispatch: &dispatch };
            let name = dispatch.plan.value()["binding"]["process"].as_str().unwrap().to_owned();
            let mut processes = ProcessService::open(tmp.path()).unwrap();
            let program = processes.store.manifest(&manifest).unwrap();
            let args = get_record(&processes.store, &arguments).unwrap();
            let ready = processes.create(&name, program, args, 4, &Host::default(), &Transports::new()).unwrap();
            let mut pending = ready.process.clone();
            pending.generation = 1; pending.status = "uncertain".into(); pending.previous = Some(ready.digest); pending.cause = Some("start".into());
            let pending_ref = processes.store.put("values", &serde_json::to_value(pending).unwrap()).unwrap();
            let mut journal = crate::journal::Journal::create(tmp.path(), &name, &pending_ref, &manifest, 2).unwrap();
            if unknown_write {
                journal.before(crate::journal::Binding { request_digest: hashed(&json!("request")), executor: "fixture-write".into(),
                    configuration_digest: hashed(&json!("config")), idempotency_key: hashed(&json!("effect")), recovery: "never".into() }).unwrap();
            }
            crate::lease::write(&tmp.path().join("processes").join(&name).join("head.json"),
                &json!({"contract":"algal.process-head.v1","name":name,"record":pending_ref}), true).unwrap();
            assert_eq!(dispatch_episode(&context, tmp.path()).await.unwrap()["status"], "blocked");
            assert_eq!(processes.inspect(&name).unwrap().digest, pending_ref);
            let recovered = reconcile_episode(&context, tmp.path()).await.unwrap();
            assert_eq!(recovered["status"], if unknown_write { "blocked" } else { "settled" });
            let state = processes.inspect(&name).unwrap();
            assert_eq!(state.process.generation, 1);
            assert_eq!(state.process.status, if unknown_write { "uncertain" } else { "complete" });
            if unknown_write { assert_eq!(state.digest, pending_ref); }
        }
    }

    #[tokio::test]
    async fn episode_dispatch_fails_without_the_bound_manifest() {
        let tmp = tempdir().unwrap();
        let (_manifest, revision, arguments) = seed(tmp.path());
        let intent = parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "parity",
            "operation": hashed(&json!({"op":1})), "ordinal": 0,
            "kind": "start-episode", "entrypoint": "run", "input": arguments,
        }))
        .unwrap();
        let intent_ref = hashed(&intent.value);
        let missing = hashed(&json!({"missing": 1}));
        let dispatch = episode_dispatch(&missing, &revision, &arguments, &intent_ref);
        let snapshot = snapshot();
        let context = DispatchContext {
            current: &snapshot,
            snapshot: &snapshot,
            intent: &intent,
            dispatch: &dispatch,
        };
        assert!(dispatch_episode(&context, tmp.path()).await.is_err());
    }
}
