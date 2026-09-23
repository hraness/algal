//! Explicit drain of undispatched pending work on `migrate` — port of
//! `src/application-drain.ts`. An intent whose dispatch record does not exist
//! pins the operation, revision, and entrypoint of the state that created it;
//! a schema-changing migration cannot silently reinterpret that pin. The
//! `algal.application-drain.v1` record names every undispatched pending intent
//! at the transition's parent state and assigns each an explicit disposition:
//!
//! - `migrated`  — the intent stays pending and dispatchable under the new
//!   revision (the durable record itself is unchanged),
//! - `abandoned` — the intent is intentionally dropped from every future
//!   `pending` projection; its record stays retained in history and CAS as
//!   evidence and is never rewritten or deleted.
//!
//! A `migrate` transition whose parent has undispatched pending intents must
//! cite exactly one drain covering the complete set; a drain cited where no
//! undispatched work exists is non-applicable evidence and is rejected.

use serde_json::{Value, json};
use std::collections::BTreeSet;

use crate::application::Service;
use crate::application_memory::{app_id, app_object, app_ref, app_tag, get_record, put_record};
use crate::contract::list;
use crate::{Error, Result};

/// Dispositions per drain — the same bound as the pending projection.
pub const DISPOSITIONS: usize = 128;

#[derive(Clone, Debug)]
pub struct DrainDisposition {
    pub intent: String,
    pub status: String,
}

/// `algal.application-drain.v1` — the closed record a `migrate` transition
/// cites to make every undispatched pending intent explicit.
#[derive(Clone, Debug)]
pub struct Drain {
    pub application: String,
    pub parent_state: String,
    pub dispositions: Vec<DrainDisposition>,
    pub value: Value,
}

pub fn parse_drain(input: &Value) -> Result<Drain> {
    let v = app_object(
        input,
        &["contract", "application", "parentState", "dispositions"],
    )?;
    app_tag(&v["contract"], "algal.application-drain.v1")?;
    let mut dispositions = Vec::new();
    for row in list(&v["dispositions"], DISPOSITIONS)? {
        let d = app_object(row, &["intent", "status"])?;
        let status = d["status"].as_str().unwrap_or_default();
        if status != "migrated" && status != "abandoned" {
            return Err(Error::invalid("Invalid drain disposition status"));
        }
        dispositions.push(DrainDisposition {
            intent: app_ref(&d["intent"])?.to_owned(),
            status: status.to_owned(),
        });
    }
    if dispositions.windows(2).any(|w| w[0].intent >= w[1].intent) {
        return Err(Error::invalid(
            "Application references must be sorted and unique",
        ));
    }
    Ok(Drain {
        application: app_id(&v["application"])?.to_owned(),
        parent_state: app_ref(&v["parentState"])?.to_owned(),
        dispositions,
        value: input.clone(),
    })
}

/// The drain names this exact application and parent state.
pub fn check_binding(drain: &Drain, application: &str, parent_state: &str) -> Result<()> {
    if drain.application != application || drain.parent_state != parent_state {
        return Err(Error::invalid(
            "Drain evidence does not bind this transition",
        ));
    }
    Ok(())
}

/// Commit-time completeness: the dispositions must name exactly the
/// undispatched pending intents at the drained parent state — no missing
/// rows, no extras.
pub fn check_coverage(drain: &Drain, undispatched: &BTreeSet<&str>) -> Result<()> {
    if drain.dispositions.len() != undispatched.len()
        || drain
            .dispositions
            .iter()
            .any(|d| !undispatched.contains(d.intent.as_str()))
    {
        return Err(Error::invalid(
            "Drain dispositions must match the undispatched pending intents",
        ));
    }
    Ok(())
}

/// `produceApplicationDrain`: records the explicit disposition of every
/// undispatched pending intent at `parentState`; returns the drain digest.
/// The input is the closed `{application, parentState, dispositions}` shape
/// shared with the TypeScript producer.
pub fn produce_drain(service: &mut Service<'_>, input: &Value) -> Result<String> {
    let v = app_object(input, &["application", "parentState", "dispositions"])?;
    let record = parse_drain(&json!({
        "contract": "algal.application-drain.v1",
        "application": v["application"],
        "parentState": v["parentState"],
        "dispositions": v["dispositions"],
    }))?;
    let undispatched = service.undispatched_pending(&record.application, &record.parent_state)?;
    let set: BTreeSet<&str> = undispatched.iter().map(|p| p.intent.as_str()).collect();
    check_coverage(&record, &set)?;
    put_record(&mut service.store, &record.value)
}

/// `verifyApplicationDrain`: re-verifies a stored drain against an expected
/// parent state — the record resolves and re-verifies as a drain, names the
/// expected parent, and covers the undispatched pending set at that state.
pub fn verify_drain(service: &Service<'_>, drain: &str, expected_state: &str) -> Result<Drain> {
    let reference = app_ref(&Value::from(drain))?.to_owned();
    let expected = app_ref(&Value::from(expected_state))?.to_owned();
    let record = parse_drain(&get_record(&service.store, &reference)?)?;
    if record.parent_state != expected {
        return Err(Error::invalid(
            "Drain evidence does not bind this transition",
        ));
    }
    let undispatched = service.undispatched_pending(&record.application, &record.parent_state)?;
    let set: BTreeSet<&str> = undispatched.iter().map(|p| p.intent.as_str()).collect();
    check_coverage(&record, &set)?;
    Ok(record)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{Admission, CommitContext, DispatchAdmission, Service, WorkIntent};
    use crate::application_memory::app_json;
    use crate::canonical::digest;
    use crate::store::Store;
    use serde_json::json;
    use tempfile::tempdir;

    fn hashed(value: &Value) -> String {
        digest(&app_json(value).unwrap()).unwrap()
    }

    struct Allow;
    impl Admission for Allow {
        fn admit_commit(&self, _: &CommitContext) -> Result<()> {
            Ok(())
        }
        fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
            match &context.intent.work {
                WorkIntent::Deliver { .. } => Ok(json!({
                    "kind": "delivery",
                    "recipient": format!("cap:mailbox-send:{}", hashed(&json!({"fixture":"route"}))),
                    "hostProfile": hashed(&json!({"contract":"algal.test-host-profile.v1"})),
                })),
                WorkIntent::StartEpisode { .. } => Err(Error::new(
                    "CAPABILITY_DENIED",
                    "no episodes in drain tests",
                )),
            }
        }
    }

    fn seed(dir: &std::path::Path) -> (String, String) {
        let mut store = Store::open(dir, true).unwrap();
        let put =
            |store: &mut Store, v: Value| store.put("values", &app_json(&v).unwrap()).unwrap();
        let manifest = store
            .put(
                "manifests",
                &crate::contract::Manifest::parse(&json!({
                    "contract": "algal.organism.v1", "key": "organism:drain", "name": "drain",
                    "interface": {"inputs": {}, "outputs": {"answer": {"cell": "out", "port": "value"}}},
                    "cells": [{"id": "out", "kind": "const", "outputs": {"value": {"type": "json", "value": "ok"}}}],
                    "edges": [],
                }))
                .unwrap()
                .value,
            )
            .unwrap();
        let schema = put(
            &mut store,
            json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"available","arity":1}]}),
        );
        let program = put(
            &mut store,
            json!({"contract":"algal.query.v1","rules":[],"query":{"relation":"available","terms":[{"var":"x"},{"var":"polarity"}]},"limits":{"maxWork":50000,"maxRounds":32,"maxDerived":128,"maxBindings":128,"maxRows":16,"maxOutputBytes":262144}}),
        );
        let query = put(
            &mut store,
            json!({"contract":"algal.application-memory-query.v1","id":"available","schema":schema,"program":program,"procedures":[],"polarityColumn":1,"conflict":"single-value"}),
        );
        let queries = put(
            &mut store,
            json!({"contract":"algal.application-memory-queries.v1","queries":[query]}),
        );
        let views = put(&mut store, json!({"contract":"algal.test-views.v1"}));
        let runtime = put(&mut store, json!({"contract":"algal.test-runtime.v1"}));
        let policy = put(&mut store, json!({"contract":"algal.test-policy.v1"}));
        let revision = put(
            &mut store,
            json!({"contract":"algal.application-revision.v1","application":"parity","parent":null,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]}),
        );
        let frontier = put(
            &mut store,
            json!({"contract":"algal.application-memory-frontier.v1","application":"parity","previous":null,"sequence":0,"mutation":null,"status":"settled"}),
        );
        let attestation = put(&mut store, json!({"contract":"algal.test-attestation.v1"}));
        let scope = put(
            &mut store,
            json!({"contract":"algal.application-memory-scope.v1","application":"parity","environment":"fixture","task":"task-1","frontier":frontier,"bindings":[],"completeFor":[],"attestation":attestation}),
        );
        let memory = put(
            &mut store,
            json!({"contract":"algal.application-memory.v1","application":"parity","schema":schema,"previous":null,"scope":scope,"observations":[],"hypotheses":[],"withdrawn":[]}),
        );
        (revision, memory)
    }

    fn ops(name: &str) -> String {
        hashed(&json!({"contract":"algal.test-op.v1","name":name}))
    }

    fn command(
        operation: &str,
        kind: &str,
        expected_head: Option<&str>,
        revision: &str,
        memory: &str,
        intents: Vec<Value>,
    ) -> Value {
        json!({
            "application": "parity", "operation": operation, "kind": kind,
            "expectedHead": expected_head, "revision": revision, "memory": memory,
            "intents": intents, "evidence": [], "causedBy": null,
        })
    }

    /// A migration whose evidence is consumed by the migrated memory, like the
    /// lifecycle test fixture — drain behavior needs a commit-valid migrate.
    fn migrated_fixture(
        store: &mut Store,
        application: &str,
        prior_revision: &str,
        next_revision: &Value,
        prior_memory: &str,
    ) -> (String, String, String, String) {
        let schema2 = put_record(
            store,
            &json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"moved","arity":1}]}),
        )
        .unwrap();
        let mut next = next_revision.clone();
        next["schema"] = json!(schema2);
        // Activation compatibility: the candidate must name the incumbent as
        // its parent, keep the runtime profile, and cover every entrypoint.
        next["parent"] = json!(prior_revision);
        let next_ref = put_record(store, &next).unwrap();
        let migration = json!({
            "contract":"algal.application-migration.v1","application":application,
            "from":prior_memory,"previousRevision":prior_revision,"candidateRevision":next_ref,
            "program":next["entrypoints"][0]["manifest"],"receipt":next["entrypoints"][0]["manifest"],
            "claims":[{"relation":"moved","tuple":["tool-a"],"polarity":"supported"}],
        });
        let migration_ref = put_record(store, &migration).unwrap();
        let observation = put_record(
            store,
            &json!({"contract":"algal.application-memory-observation.v1","application":application,"scope":schema2,"procedure":schema2,"raw":migration_ref,"receipt":schema2,"decoder":schema2,"admission":schema2,"claims":[]}),
        )
        .unwrap();
        let migrated = put_record(
            store,
            &json!({"contract":"algal.application-memory.v1","application":application,"schema":schema2,"previous":null,"scope":schema2,"observations":[observation],"hypotheses":[],"withdrawn":[]}),
        )
        .unwrap();
        (next_ref, schema2, migration_ref, migrated)
    }

    #[tokio::test]
    async fn drain_covers_every_undispatched_pending_intent() {
        let tmp = tempdir().unwrap();
        let (revision, memory) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let genesis = service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &revision,
                &memory,
                vec![],
            ))
            .await
            .unwrap();
        // Two undispatched deliver intents — one migrates, one is abandoned.
        let intents_state = service
            .commit(&command(
                &ops("work"),
                "investigate",
                Some(&genesis.digest),
                &revision,
                &memory,
                vec![
                    json!({"kind":"deliver","route":"keep","message":revision}),
                    json!({"kind":"deliver","route":"drop","message":revision}),
                ],
            ))
            .await
            .unwrap();
        let intent_refs = intents_state.transition.intents.clone();
        assert_eq!(intent_refs.len(), 2);
        // A migrate without a drain is refused.
        let mut store = Store::open(tmp.path(), true).unwrap();
        let revision_record = get_record(&store, &revision).unwrap();
        let (next_ref, _, migration_ref, migrated) =
            migrated_fixture(&mut store, "parity", &revision, &revision_record, &memory);
        let mut bare = command(
            &ops("migrate-bare"),
            "migrate",
            Some(&intents_state.digest),
            &next_ref,
            &migrated,
            vec![],
        );
        bare["evidence"] = json!([migration_ref]);
        let error = service.commit(&bare).await.unwrap_err();
        assert_eq!(error.message, "Pending intents require explicit drain");
        // An incomplete drain fails coverage.
        let mut dispositions: Vec<Value> = intent_refs
            .iter()
            .map(|intent| json!({"intent": intent, "status": "migrated"}))
            .collect();
        dispositions[0]["status"] = json!("abandoned");
        let partial = put_record(
            &mut store,
            &json!({"contract":"algal.application-drain.v1","application":"parity","parentState":intents_state.digest,"dispositions":[dispositions[0]]}),
        )
        .unwrap();
        let mut short = bare.clone();
        short["operation"] = json!(ops("migrate-short"));
        let mut short_evidence = [migration_ref.clone(), partial];
        short_evidence.sort();
        short["evidence"] = json!(short_evidence);
        assert!(service.commit(&short).await.is_err());
        // The complete drain commits and abandons exactly one intent.
        let drain_ref = produce_drain(
            &mut service,
            &json!({"application":"parity","parentState":intents_state.digest,"dispositions":dispositions}),
        )
        .unwrap();
        verify_drain(&service, &drain_ref, &intents_state.digest).unwrap();
        let mut migrate = bare.clone();
        migrate["operation"] = json!(ops("migrate"));
        let mut evidence = [migration_ref.clone(), drain_ref.clone()];
        evidence.sort();
        migrate["evidence"] = json!(evidence);
        let migrated_state = service.commit(&migrate).await.unwrap();
        assert_eq!(migrated_state.state.epoch, 1);
        // The abandoned intent is gone from pending forever; the migrated one
        // stays dispatchable, and the retained records are untouched.
        let history = service.history("parity").unwrap();
        let pending = service.pending(&history).unwrap();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].intent, intent_refs[1]);
        assert!(
            service
                .undispatched_pending("parity", &migrated_state.digest)
                .unwrap()
                .iter()
                .all(|p| p.intent != intent_refs[0])
        );
    }

    #[tokio::test]
    async fn drain_is_non_applicable_without_undispatched_pending() {
        let tmp = tempdir().unwrap();
        let (revision, memory) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let genesis = service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &revision,
                &memory,
                vec![],
            ))
            .await
            .unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let revision_record = get_record(&store, &revision).unwrap();
        let (next_ref, _, migration_ref, migrated) =
            migrated_fixture(&mut store, "parity", &revision, &revision_record, &memory);
        // With zero undispatched pending, an empty drain is still produced
        // but the migrate must refuse it as non-applicable evidence.
        let drain_ref = produce_drain(
            &mut service,
            &json!({"application":"parity","parentState":genesis.digest,"dispositions":[]}),
        )
        .unwrap();
        let mut migrate = command(
            &ops("migrate"),
            "migrate",
            Some(&genesis.digest),
            &next_ref,
            &migrated,
            vec![],
        );
        let mut evidence = [migration_ref.clone(), drain_ref];
        evidence.sort();
        migrate["evidence"] = json!(evidence);
        let error = service.commit(&migrate).await.unwrap_err();
        assert_eq!(error.message, "Drain record is not applicable");
        // Without the drain the same migrate commits.
        migrate["operation"] = json!(ops("migrate-ok"));
        migrate["evidence"] = json!([migration_ref]);
        service.commit(&migrate).await.unwrap();
    }

    #[test]
    fn drain_parser_is_closed_bounded_and_ordered() {
        let record = json!({"contract":"algal.application-drain.v1","application":"parity","parentState":hashed(&json!("state")),"dispositions":[{"intent":hashed(&json!("a")),"status":"migrated"}]});
        parse_drain(&record).unwrap();
        let mut with_extra = record.clone();
        with_extra["extra"] = json!(true);
        assert!(parse_drain(&with_extra).is_err());
        assert!(parse_drain(&json!({"contract":"algal.application-drain.v1","application":"parity","parentState":record["parentState"],"dispositions":[{"intent":record["dispositions"][0]["intent"],"status":"dropped"}]})).is_err());
        let unsorted = json!({"contract":"algal.application-drain.v1","application":"parity","parentState":record["parentState"],"dispositions":[{"intent":hashed(&json!("b")),"status":"migrated"},{"intent":hashed(&json!("a")),"status":"abandoned"}]});
        assert!(parse_drain(&unsorted).is_err());
        let duplicate = json!({"contract":"algal.application-drain.v1","application":"parity","parentState":record["parentState"],"dispositions":[{"intent":hashed(&json!("a")),"status":"migrated"},{"intent":hashed(&json!("a")),"status":"abandoned"}]});
        assert!(parse_drain(&duplicate).is_err());
        let mut over = Vec::new();
        for i in 0..=DISPOSITIONS {
            over.push(json!({"intent": hashed(&json!(format!("i-{i:04}"))), "status": "migrated"}));
        }
        assert!(
            parse_drain(&json!({"contract":"algal.application-drain.v1","application":"parity","parentState":record["parentState"],"dispositions":over}))
                .is_err()
        );
    }

    #[tokio::test]
    async fn drain_rejects_wrong_binding_and_forfeited_rows() {
        let tmp = tempdir().unwrap();
        let (revision, memory) = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        let genesis = service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &revision,
                &memory,
                vec![],
            ))
            .await
            .unwrap();
        let state = service
            .commit(&command(
                &ops("work"),
                "investigate",
                Some(&genesis.digest),
                &revision,
                &memory,
                vec![json!({"kind":"deliver","route":"keep","message":revision})],
            ))
            .await
            .unwrap();
        let intent = state.transition.intents[0].clone();
        let input = json!({"application":"parity","parentState":state.digest,"dispositions":[{"intent":intent,"status":"migrated"}]});
        // Wrong parent state and wrong application are refused.
        let mut wrong_parent = input.clone();
        wrong_parent["parentState"] = json!(genesis.digest);
        assert!(produce_drain(&mut service, &wrong_parent).is_err());
        let mut wrong_app = input.clone();
        wrong_app["application"] = json!("other");
        assert!(produce_drain(&mut service, &wrong_app).is_err());
        // Extra and missing rows fail completeness.
        assert!(
            produce_drain(
                &mut service,
                &json!({"application":"parity","parentState":state.digest,"dispositions":[]})
            )
            .is_err()
        );
        assert!(
            produce_drain(
                &mut service,
                &json!({"application":"parity","parentState":state.digest,"dispositions":[{"intent":intent,"status":"migrated"},{"intent":hashed(&json!("extra")),"status":"abandoned"}]})
            )
            .is_err()
        );
        // Verifying against a different parent is refused.
        let drain = produce_drain(&mut service, &input).unwrap();
        assert!(verify_drain(&service, &drain, &genesis.digest).is_err());
        // A stored record whose bytes were swapped out under the same file
        // name fails the digest recompute. The live service caches records it
        // produced, so the cold read goes through a reopened service.
        let tampered = json!({"contract":"algal.application-drain.v1","application":"parity","parentState":state.digest,"dispositions":[]});
        std::fs::write(
            tmp.path()
                .join("values")
                .join(format!("{}.json", &drain[7..])),
            serde_json::to_string(&tampered).unwrap(),
        )
        .unwrap();
        let reopened = Service::new(tmp.path(), &allow).unwrap();
        assert!(verify_drain(&reopened, &drain, &state.digest).is_err());
        // A settled intent is no longer pending and cannot be drained.
        struct Settle;
        impl crate::application::Dispatcher for Settle {
            fn configuration_digest(&self) -> &str {
                "sha256:0000000000000000000000000000000000000000000000000000000000000001"
            }
            fn dispatch<'a>(
                &'a self,
                context: &'a crate::application::DispatchContext<'a>,
            ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value>> + 'a>>
            {
                Box::pin(async move {
                    let crate::application::WorkIntent::Deliver { message, .. } =
                        &context.intent.work
                    else {
                        unreachable!()
                    };
                    Ok(
                        json!({"status":"settled","result":{"kind":"delivery","message":message,"idempotencyKey":context.dispatch.identity}}),
                    )
                })
            }
        }
        let sink = Settle;
        service.dispatch_pending("parity", &sink, 1).await.unwrap();
        assert!(
            produce_drain(
                &mut service,
                &json!({"application":"parity","parentState":state.digest,"dispositions":[]})
            )
            .is_ok(),
            "settled work leaves no undispatched pending set to drain"
        );
    }
}
