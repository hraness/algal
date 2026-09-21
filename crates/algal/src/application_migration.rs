//! Declarative schema migration — port of src/application-migration.ts. A
//! migration is a bounded ALGAL program mapping one memory snapshot's claims
//! into claims admitted under a new schema. The run receipt plus emitted
//! claims ride in a durable `algal.application-migration.v1` record, and the
//! migrated claims arrive in the new memory chain as an ordinary observation
//! whose raw record is that record — the trusted admission host decodes it
//! like any other source, so migrated evidence keeps the same custody shape
//! as probed evidence.
//!
//! A `migrate` transition (not `activate`) carries the record in its
//! evidence; the lifecycle verifies that the record binds the prior memory,
//! names the new revision, and is actually consumed by the migrated snapshot.

use serde_json::{Value, json};

use crate::application_memory::{
    MemoryService, app_id, app_object, app_ref, claim_value, get_record, parse_claim,
    parse_hypothesis, parse_observation, parse_schema, parse_scope, parse_snapshot, put_record,
};
use crate::contract::Manifest;
use crate::effects::Host;
use crate::graph::Transports;
use crate::store::Store;
use crate::{Error, Result, runtime};

fn fail(message: &str) -> Error {
    Error::invalid(message)
}

/// `migrateApplicationMemory` — runs the migration program over the source
/// snapshot's claims, stores the migration record, and admits the emitted
/// claims as one observation into a fresh memory chain under the new schema
/// (`previous: null` — cross-schema lineage rides the migration record, not
/// the predecessor pointer). Returns the emit record shared with the
/// reference implementation.
pub async fn migrate_memory(
    memory: &MemoryService<'_>,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
    input: &Value,
) -> Result<Value> {
    let v = app_object(
        input,
        &[
            "application",
            "from",
            "schema",
            "scope",
            "program",
            "procedure",
            "decoder",
            "previousRevision",
            "candidateRevision",
        ],
    )?;
    let application = app_id(&v["application"])?.to_owned();
    let schema_ref = app_ref(&v["schema"])?.to_owned();
    let from_ref = app_ref(&v["from"])?.to_owned();
    let program = app_ref(&v["program"])?.to_owned();
    let scope = app_ref(&v["scope"])?.to_owned();
    let procedure = app_ref(&v["procedure"])?.to_owned();
    let decoder = app_ref(&v["decoder"])?.to_owned();
    let previous_revision = app_ref(&v["previousRevision"])?.to_owned();
    let candidate_revision = app_ref(&v["candidateRevision"])?.to_owned();
    let from = parse_snapshot(&get_record(store, &from_ref)?)?;
    if from.application != application {
        return Err(fail("Migration source belongs to another application"));
    }
    if from.schema == schema_ref {
        return Err(fail("Migration requires a schema change"));
    }
    let target = parse_schema(&get_record(store, &schema_ref)?)?;
    // The program sees the whole admitted claim set — observations and
    // hypotheses alike — annotated with each observation's scope frontier and
    // the migration scope's frontier, so the program can decide what carries
    // forward rather than copying stale evidence.
    let target_scope = parse_scope(&get_record(store, &scope)?)?;
    let mut claims: Vec<Value> = Vec::new();
    for reference in &from.observations {
        let observation = parse_observation(&get_record(store, reference)?)?;
        let observation_scope = parse_scope(&get_record(store, &observation.input.scope)?)?;
        for claim in &observation.claims {
            claims.push(json!({
                "claim": claim_value(claim),
                "frontier": observation_scope.frontier,
            }));
        }
    }
    for reference in &from.hypotheses {
        let hypothesis = parse_hypothesis(&get_record(store, reference)?)?;
        claims.push(json!({"claim": claim_value(&hypothesis.claim), "frontier": Value::Null}));
    }
    if claims.len() > 64 {
        return Err(fail("Migration claim input bound exceeded"));
    }
    let manifest_value = store
        .get("manifests", &program)?
        .ok_or_else(|| fail("Migration manifest missing from the store"))?;
    let manifest = Manifest::parse(&manifest_value)?;
    // `runOrganism` carries `processName`; the native equivalent is the host
    // process scope, which binds effect idempotency keys to the same
    // `algal.process-effect.v1` record. Restore it after the run.
    let prior_scope = host
        .process_scope
        .replace(format!("migrate-{}", &from_ref[7..15]));
    let run = runtime::run(
        manifest.clone(),
        json!({
            "claims": {"value": claims},
            "frontier": {"value": target_scope.frontier},
        }),
        store,
        host,
        transports,
        None,
    )
    .await;
    host.process_scope = prior_scope;
    let receipt = run?;
    if receipt["outcome"] != "complete" {
        return Err(fail(&format!(
            "Migration program did not complete: {}",
            receipt["outcome"].as_str().unwrap_or("")
        )));
    }
    let produced = manifest.value["interface"]["outputs"]["migrated"]
        .as_object()
        .and_then(|out| {
            receipt["cells"][out["cell"].as_str().unwrap_or("")]["outputs"]
                .get(out["port"].as_str().unwrap_or(""))
                .cloned()
        });
    let emitted_value = produced.unwrap_or(Value::Null);
    let emitted_rows = crate::contract::list(
        &app_object(&emitted_value, &["claims"])
            .map_err(|_| fail("Migration output must be an object with claims"))?["claims"],
        64,
    )?;
    let mut emitted = Vec::with_capacity(emitted_rows.len());
    for row in emitted_rows {
        emitted.push(parse_claim(row)?);
    }
    for claim in &emitted {
        if !target
            .relations
            .iter()
            .any(|(name, arity)| *name == claim.relation && *arity == claim.tuple.len())
        {
            return Err(fail("Migration emitted a claim outside the target schema"));
        }
    }
    let receipt_ref = put_record(store, &receipt)?;
    let migration = put_record(
        store,
        &json!({
            "contract": "algal.application-migration.v1",
            "application": application,
            "from": from_ref,
            "previousRevision": previous_revision,
            "candidateRevision": candidate_revision,
            "program": program,
            "receipt": receipt_ref,
            "claims": emitted.iter().map(claim_value).collect::<Vec<_>>(),
        }),
    )?;
    let observation = json!({
        "application": application,
        "scope": scope,
        "procedure": procedure,
        "raw": migration,
        "receipt": receipt_ref,
        "decoder": decoder,
    });
    let observation_ref = memory.observe(store, &observation)?;
    let snapshot = memory.snapshot(
        store,
        &json!({
            "application": application,
            "schema": schema_ref,
            "previous": Value::Null,
            "scope": scope,
            "observations": [observation_ref],
            "hypotheses": [],
            "withdrawn": [],
        }),
    )?;
    Ok(json!({
        "migration": migration,
        "observation": observation,
        "snapshot": snapshot,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application_memory::{
        Claim, EngineResult, MemoryAdmission, MemoryEngine, MemoryFrontier, MemoryScope,
        ObservationAdmission,
    };
    use crate::canonical::digest;
    use crate::contract::list;
    use tempfile::tempdir;

    fn hashed(value: &Value) -> String {
        digest(&crate::application_memory::app_json(value).unwrap()).unwrap()
    }

    fn put(store: &mut Store, value: Value) -> String {
        store
            .put(
                "values",
                &crate::application_memory::app_json(&value).unwrap(),
            )
            .unwrap()
    }

    /// Test admission: decodes claims from any raw record carrying a `claims`
    /// list — probe raws and migration records alike.
    struct Admission {
        identity: String,
        frontier: String,
    }
    impl MemoryAdmission for Admission {
        fn identity(&self) -> &str {
            &self.identity
        }
        fn current_frontier(&self, _: &str) -> Result<String> {
            Ok(self.frontier.clone())
        }
        fn validate_scope(&self, _: &MemoryScope, _: &MemoryFrontier, _: &Value) -> Result<()> {
            Ok(())
        }
        fn decode_observation(&self, input: &ObservationAdmission) -> Result<Vec<Claim>> {
            list(&input.raw["claims"], 64)?
                .iter()
                .map(parse_claim)
                .collect()
        }
    }

    struct NoEngine;
    impl MemoryEngine for NoEngine {
        fn identity(&self) -> &str {
            "algal.test-engine.v1"
        }
        fn query(&self, _: &Value, _: &Value) -> EngineResult {
            EngineResult::Incomplete {
                status: "failed".to_owned(),
                reason: "test engine".to_owned(),
                work: None,
            }
        }
        fn verify(&self, _: &Value, _: &Value, _: &Value) -> bool {
            false
        }
    }

    struct Fixture {
        input: Value,
        source: String,
        schema1: String,
        schema2: String,
    }

    fn seed(store: &mut Store, emitted: Value) -> Fixture {
        let schema1 = put(
            store,
            json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"available","arity":1}]}),
        );
        let schema2 = put(
            store,
            json!({"contract":"algal.application-memory-schema.v1","relations":[{"name":"supported-tool","arity":1}]}),
        );
        let frontier = put(
            store,
            json!({"contract":"algal.application-memory-frontier.v1","application":"parity","previous":null,"sequence":0,"mutation":null,"status":"settled"}),
        );
        let attestation = put(store, json!({"contract":"algal.test-attestation.v1"}));
        let decoder = put(store, json!({"contract":"algal.test-decoder.v1"}));
        let decoder2 = put(store, json!({"contract":"algal.test-decoder2.v1"}));
        let manifest_ref = put(store, json!({"contract":"algal.test-manifest.v1"}));
        let procedure = put(
            store,
            json!({"contract":"algal.application-memory-procedure.v1","id":"probe","schema":schema1,"manifest":manifest_ref,"decoder":decoder,"dependencies":[],"prerequisite":null}),
        );
        let scope = put(
            store,
            json!({"contract":"algal.application-memory-scope.v1","application":"parity","environment":"fixture","task":"task-1","frontier":frontier,"bindings":[],"completeFor":[procedure],"attestation":attestation}),
        );
        let raw = put(
            store,
            json!({"contract":"algal.test-raw.v1","claims":[{"relation":"available","tuple":["tool-a"],"polarity":"supported"}]}),
        );
        let receipt = put(store, json!({"contract":"algal.test-receipt.v1","raw":raw}));
        let observation = put(
            store,
            json!({"contract":"algal.application-memory-observation.v1","application":"parity","scope":scope,"procedure":procedure,"raw":raw,"receipt":receipt,"decoder":decoder,"admission":hashed(&json!("admission")),"claims":[{"relation":"available","tuple":["tool-a"],"polarity":"supported"}]}),
        );
        let source = put(
            store,
            json!({"contract":"algal.application-memory.v1","application":"parity","schema":schema1,"previous":null,"scope":scope,"observations":[observation],"hypotheses":[],"withdrawn":[]}),
        );
        // The migration program echoes a fixed claim list under the new
        // schema — the producer path (run, record, decode, fresh chain) is
        // what is under test, not mapping cleverness.
        let program = store
            .put(
                "manifests",
                &Manifest::parse(&json!({
                    "contract": "algal.organism.v1", "key": "organism:migrate", "name": "migrate",
                    "interface": {
                        "inputs": {"claims": {"cell": "claims", "port": "value"}, "frontier": {"cell": "frontier", "port": "value"}},
                        "outputs": {"migrated": {"cell": "out", "port": "value"}},
                    },
                    "cells": [
                        {"id": "claims", "kind": "input", "outputs": {"value": "json"}},
                        {"id": "frontier", "kind": "input", "outputs": {"value": "json"}},
                        {"id": "out", "kind": "const", "outputs": {"value": {"type": "json", "value": {"claims": emitted}}}},
                    ],
                    "edges": [],
                }))
                .unwrap()
                .value,
            )
            .unwrap();
        let procedure2 = put(
            store,
            json!({"contract":"algal.application-memory-procedure.v1","id":"migrate","schema":schema2,"manifest":program,"decoder":decoder2,"dependencies":[],"prerequisite":null}),
        );
        let scope2 = put(
            store,
            json!({"contract":"algal.application-memory-scope.v1","application":"parity","environment":"fixture","task":"task-1","frontier":frontier,"bindings":[],"completeFor":[procedure2],"attestation":attestation}),
        );
        let input = json!({
            "application": "parity", "from": source, "schema": schema2,
            "scope": scope2, "procedure": procedure2, "program": program,
            "decoder": decoder2,
            "previousRevision": hashed(&json!("previous")),
            "candidateRevision": hashed(&json!("candidate")),
        });
        Fixture {
            input,
            source,
            schema1,
            schema2,
        }
    }

    #[tokio::test]
    async fn migration_runs_the_program_and_opens_a_fresh_chain() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let fixture = seed(
            &mut store,
            json!([{"relation":"supported-tool","tuple":["tool-a"],"polarity":"supported"}]),
        );
        let admission = Admission {
            identity: hashed(&json!({"contract":"algal.test-admission.v1"})),
            frontier: fixture.input["scope"].as_str().unwrap().to_owned(),
        };
        let engine = NoEngine;
        let memory = MemoryService {
            engine: &engine,
            admission: &admission,
        };
        let out = migrate_memory(
            &memory,
            &mut store,
            &mut Host::default(),
            &Transports::new(),
            &fixture.input,
        )
        .await
        .unwrap();
        let migration = get_record(&store, out["migration"].as_str().unwrap()).unwrap();
        assert_eq!(migration["from"], json!(fixture.source));
        assert_eq!(migration["program"], fixture.input["program"]);
        assert_eq!(migration["claims"][0]["relation"], json!("supported-tool"));
        // The run receipt is stored as an application record and named by the
        // migration record — the observation binds that same receipt.
        let receipt = get_record(&store, migration["receipt"].as_str().unwrap()).unwrap();
        assert_eq!(receipt["contract"], json!("algal.run.v1"));
        assert_eq!(receipt["outcome"], json!("complete"));
        assert_eq!(out["observation"]["raw"], json!(out["migration"]));
        assert_eq!(out["observation"]["receipt"], migration["receipt"]);
        let snapshot = get_record(&store, out["snapshot"].as_str().unwrap()).unwrap();
        assert_eq!(snapshot["previous"], Value::Null);
        assert_eq!(snapshot["schema"], json!(fixture.schema2));
        let migrated_observation =
            get_record(&store, snapshot["observations"][0].as_str().unwrap()).unwrap();
        assert_eq!(migrated_observation["raw"], json!(out["migration"]));
        assert_eq!(
            migrated_observation["claims"][0]["relation"],
            json!("supported-tool")
        );
    }

    #[tokio::test]
    async fn migration_requires_a_schema_change_and_in_schema_claims() {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let fixture = seed(
            &mut store,
            json!([{"relation":"supported-tool","tuple":["tool-a"],"polarity":"supported"}]),
        );
        let admission = Admission {
            identity: hashed(&json!({"contract":"algal.test-admission.v1"})),
            frontier: fixture.input["scope"].as_str().unwrap().to_owned(),
        };
        let engine = NoEngine;
        let memory = MemoryService {
            engine: &engine,
            admission: &admission,
        };
        // No schema change — rejected before the program runs.
        let mut same_schema = fixture.input.clone();
        same_schema["schema"] = json!(fixture.schema1);
        assert!(
            migrate_memory(
                &memory,
                &mut store,
                &mut Host::default(),
                &Transports::new(),
                &same_schema,
            )
            .await
            .is_err()
        );
        // Claims outside the target schema are rejected. The second seed
        // shares every record digest except the emitting program manifest.
        let out_of_schema = seed(
            &mut store,
            json!([{"relation":"unsupported","tuple":["tool-a"],"polarity":"supported"}]),
        );
        assert!(
            migrate_memory(
                &memory,
                &mut store,
                &mut Host::default(),
                &Transports::new(),
                &out_of_schema.input,
            )
            .await
            .is_err()
        );
    }
}
