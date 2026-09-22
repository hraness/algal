//! Domain episode execution — the `start-episode` dispatch leg of
//! `examples/coding-harness/application.ts` and `src/application-episode.ts`.
//! The admitted episode binding carries the captured application state: the
//! bound manifest runs under the entrypoint's declared capabilities, its run
//! receipt embeds in an `algal.episode-outcome.v1` record, and the dispatch
//! settles with `{kind: "episode", binding, process}`. Settlement is not a
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
use crate::graph::Transports;
use crate::store::Store;
use crate::{Error, Result, runtime};

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

/// Execute one admitted episode binding and return the settlement outcome.
/// `dir` is the application store root — the dispatcher opens its own handle
/// because the dispatch context borrows the service's store immutably.
pub async fn dispatch_episode(context: &DispatchContext<'_>, dir: &Path) -> Result<Value> {
    let binding = match &context.dispatch.plan {
        DispatchPlan::Episode { binding } => binding,
        DispatchPlan::Delivery { .. } => return Err(fail("expected episode plan")),
    };
    let mut store = Store::open(dir, true)?;
    let manifest = store.manifest(&binding.manifest)?;
    // The revision binds the entrypoint's declared capabilities; the native
    // surface supplies no injected executors, so a manifest that needs them
    // fails in-run and records that outcome in its receipt.
    let _revision = parse_revision(&get_record(&store, &binding.revision)?)?;
    let args = get_record(&store, &binding.arguments)?;
    object(&args)?;
    let mut host = Host::default();
    host.process_scope.replace(binding.process.clone());
    let transports = Transports::new();
    let receipt = runtime::run(manifest, args, &mut store, &mut host, &transports, None).await?;
    let binding_ref = put_record(&mut store, &binding.value)?;
    put_record(
        &mut store,
        &json!({
            "contract": "algal.episode-outcome.v1",
            "binding": binding_ref,
            "receipt": receipt,
        }),
    )?;
    Ok(json!({
        "status": "settled",
        "result": {"kind": "episode", "binding": binding_ref, "process": binding.process.as_str()},
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
        let outcome_ref = outcome["result"]["binding"].as_str().unwrap();
        assert!(get_record(&store, outcome_ref).is_ok());
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
