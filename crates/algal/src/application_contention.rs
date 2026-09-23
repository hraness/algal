//! `algal.application-contention.v1` — parity port of
//! `src/application-contention.ts`. Retained evidence of a CAS head race:
//! every attempted command by CAS digest, each deterministic outcome, and
//! the committed winner, so a single-writer fence decision is inspectable
//! rather than transient.
//!
//! Production is deterministic and serial — attempts run in input order
//! against the live lifecycle. Verification is structural and side-effect
//! free: the winner's committed state must be the recorded parent's direct
//! child carrying the winner command's request digest, and every rejected
//! attempt must still derive its recorded rejection from the retained
//! history under the lifecycle's own check order.
//!
//! Bounds: 1..8 attempts; commands and reasons inherit the application
//! record and dispatch-reason bounds. No wall-clock fields. The record
//! proves what the fence decided for these exact commands; it does not
//! establish physical simultaneity or linearizability across hosts.

use serde_json::{Value, json};
use std::collections::BTreeSet;

use crate::application::{Command, Service, Snapshot, parse_command};
use crate::application_memory::{app_object, app_ref, app_tag, get_record, put_record};
use crate::contract::{list, text};
use crate::{Error, Result};

/// 1..8 raced commands; rejection reasons share the dispatch-reason bound.
pub const CONTENTION_ATTEMPTS: usize = 8;
const CONTENTION_REASON_BYTES: usize = 1024;
const STALE_HEAD_REASON: &str = "Stale application head";
const OPERATION_COMMITTED_REASON: &str = "Operation already committed in application history";

fn fail(message: &str) -> Error {
    Error::new("RECEIPT_MISMATCH", message)
}

fn reason(value: &Value) -> Result<String> {
    let s = value
        .as_str()
        .ok_or_else(|| Error::invalid("Invalid application contention reason"))?;
    if s.is_empty() || s.len() > CONTENTION_REASON_BYTES {
        return Err(Error::invalid("Invalid application contention reason"));
    }
    Ok(s.to_owned())
}

/// One raced command: the CAS digest of its exact `ApplicationCommand`
/// record (whose `expectedHead` must name `parentState`) and the verdict.
#[derive(Clone, Debug)]
pub struct ContentionAttempt {
    pub command: String,
    pub status: String,
    pub reason: Option<String>,
}

/// `algal.application-contention.v1` — `value` retains the canonical record.
#[derive(Clone, Debug)]
pub struct Contention {
    pub parent_state: String,
    pub attempts: Vec<ContentionAttempt>,
    pub winner: String,
    pub value: Value,
}

/// `parseApplicationContention` — closed record; 1..8 attempts sorted unique
/// by command digest; exactly one committed; a committed attempt carries no
/// reason and every rejected attempt carries a nonempty bounded reason; the
/// declared `winner` must be the committed command.
pub fn parse_contention(input: &Value) -> Result<Contention> {
    let v = app_object(input, &["contract", "parentState", "attempts", "winner"])?;
    app_tag(&v["contract"], "algal.application-contention.v1")?;
    let rows = list(&v["attempts"], CONTENTION_ATTEMPTS)?;
    if rows.is_empty() {
        return Err(Error::invalid(
            "Application contention attempt bound exceeded",
        ));
    }
    let mut previous = String::new();
    let mut committed = 0usize;
    let mut winner: Option<String> = None;
    let mut attempts = Vec::with_capacity(rows.len());
    for raw in rows {
        let has_reason = raw.is_object() && raw.get("reason").is_some();
        let a = app_object(
            raw,
            if has_reason {
                &["command", "status", "reason"]
            } else {
                &["command", "status"]
            },
        )?;
        let command = app_ref(&a["command"])?.to_owned();
        let status = text(&a["status"], 16)?;
        if status != "committed" && status != "rejected" {
            return Err(Error::invalid("Invalid application contention status"));
        }
        let why = if has_reason {
            Some(reason(&a["reason"])?)
        } else {
            None
        };
        if (status == "committed") != why.is_none() {
            return Err(Error::invalid(
                "Application contention status/reason mismatch",
            ));
        }
        if command <= previous {
            return Err(Error::invalid(
                "Application contention attempts must be sorted and unique",
            ));
        }
        previous = command.clone();
        if status == "committed" {
            committed += 1;
            winner = Some(command.clone());
        }
        attempts.push(ContentionAttempt {
            command,
            status: status.to_owned(),
            reason: why,
        });
    }
    let declared = app_ref(&v["winner"])?.to_owned();
    if committed != 1 || winner.as_deref() != Some(declared.as_str()) {
        return Err(Error::invalid(
            "Application contention requires exactly one committed winner",
        ));
    }
    Ok(Contention {
        parent_state: app_ref(&v["parentState"])?.to_owned(),
        attempts,
        winner: declared,
        value: input.clone(),
    })
}

/// `produceApplicationContention` — race `attempts` serially against
/// `parentState`: each command is retained under CAS, then committed in
/// input order. The first commit wins; every later attempt must take the
/// exact stale-head rejection — any other failure aborts production without
/// a record, as does a race with zero or multiple commits.
pub async fn produce_contention(
    service: &mut Service<'_>,
    input: &Value,
) -> Result<(String, Contention, Snapshot)> {
    let v = app_object(input, &["parentState", "attempts"])?;
    let parent_state = app_ref(&v["parentState"])?.to_owned();
    let rows = list(&v["attempts"], CONTENTION_ATTEMPTS)?;
    if rows.is_empty() {
        return Err(Error::invalid(
            "Application contention attempt bound exceeded",
        ));
    }
    let mut seen = BTreeSet::new();
    let mut attempts: Vec<ContentionAttempt> = Vec::new();
    let mut application: Option<String> = None;
    let mut winner: Option<(String, Snapshot)> = None;
    for raw in rows {
        let command: Command = parse_command(raw)?;
        if command.expected_head.as_deref() != Some(parent_state.as_str()) {
            return Err(Error::invalid(
                "Contention attempt does not race the expected head",
            ));
        }
        if let Some(name) = &application
            && command.application != *name
        {
            return Err(Error::invalid(
                "Contention attempts must name one application",
            ));
        }
        application = Some(command.application.clone());
        let command_ref = put_record(&mut service.store, &command.value())?;
        if !seen.insert(command_ref.clone()) {
            return Err(Error::invalid("Contention attempts must be unique"));
        }
        let snapshot = match service.commit(&command.value()).await {
            Ok(snapshot) => snapshot,
            Err(error) if error.message == STALE_HEAD_REASON => {
                attempts.push(ContentionAttempt {
                    command: command_ref,
                    status: "rejected".to_owned(),
                    reason: Some(STALE_HEAD_REASON.to_owned()),
                });
                continue;
            }
            Err(error) => return Err(error),
        };
        if winner.is_some() {
            return Err(Error::invalid(
                "Contention produced more than one committed writer",
            ));
        }
        winner = Some((command_ref.clone(), snapshot.clone()));
        attempts.push(ContentionAttempt {
            command: command_ref,
            status: "committed".to_owned(),
            reason: None,
        });
    }
    let Some((winner_ref, snapshot)) = winner else {
        return Err(Error::invalid("Contention produced no committed writer"));
    };
    attempts.sort_by(|a, b| a.command.cmp(&b.command));
    let record = parse_contention(&json!({
        "contract": "algal.application-contention.v1",
        "parentState": parent_state,
        "attempts": attempts.iter().map(|a| {
            let mut row = json!({"command": a.command, "status": a.status});
            if let Some(why) = &a.reason {
                row["reason"] = json!(why);
            }
            row
        }).collect::<Vec<_>>(),
        "winner": winner_ref,
    }))?;
    let reference = put_record(&mut service.store, &record.value)?;
    Ok((reference, record, snapshot))
}

/// `verifyApplicationContention` — verify a retained contention record
/// against retained history; no commits run and nothing is published. A
/// fabricated loser (its command would commit today, or its operation is the
/// committed winner) fails verification.
pub fn verify_contention(service: &Service<'_>, reference: &str) -> Result<Contention> {
    let record = parse_contention(&get_record(&service.store, reference)?)?;
    let mut commands: Vec<Command> = Vec::with_capacity(record.attempts.len());
    let mut application: Option<String> = None;
    for attempt in &record.attempts {
        let command = parse_command(&get_record(&service.store, &attempt.command)?)?;
        if command.expected_head.as_deref() != Some(record.parent_state.as_str()) {
            return Err(fail("Contention attempt does not race the expected head"));
        }
        if let Some(name) = &application
            && command.application != *name
        {
            return Err(fail("Contention attempts must name one application"));
        }
        application = Some(command.application.clone());
        commands.push(command);
    }
    let history = service.history(application.as_deref().unwrap_or_default())?;
    let parent = history
        .iter()
        .position(|s| s.digest == record.parent_state)
        .ok_or_else(|| fail("Contention parent state is not in application history"))?;
    let child = history.get(parent + 1);
    let winner = commands
        .iter()
        .zip(record.attempts.iter())
        .find(|(_, a)| a.command == record.winner)
        .map(|(c, _)| c)
        .ok_or_else(|| fail("Contention winner is not committed on the expected head"))?;
    // The command's CAS digest is its request digest — the transition the
    // winning commit retained carries both.
    if child.map(|s| s.transition.request.as_str()) != Some(record.winner.as_str())
        || child.map(|s| s.transition.operation.as_str()) != Some(winner.operation.as_str())
    {
        return Err(fail(
            "Contention winner is not committed on the expected head",
        ));
    }
    for (command, attempt) in commands.iter().zip(record.attempts.iter()) {
        if attempt.status != "rejected" {
            continue;
        }
        let expected = if history
            .iter()
            .any(|s| s.transition.operation == command.operation)
        {
            OPERATION_COMMITTED_REASON
        } else {
            STALE_HEAD_REASON
        };
        if attempt.reason.as_deref() != Some(expected) {
            return Err(fail("Contention rejection is not reproducible"));
        }
    }
    Ok(record)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{Admission, CommitContext, DispatchAdmission};
    use crate::canonical::digest;
    use crate::store::Store;
    use serde_json::{Value, json};
    use tempfile::tempdir;

    fn hashed(value: &Value) -> String {
        digest(&crate::application_memory::app_json(value).unwrap()).unwrap()
    }

    struct Allow;
    impl Admission for Allow {
        fn admit_commit(&self, _: &CommitContext) -> Result<()> {
            Ok(())
        }
        fn admit_dispatch(&self, _: &DispatchAdmission) -> Result<Value> {
            Err(Error::new("CAPABILITY_DENIED", "no dispatch in fixture"))
        }
    }

    struct Fixture {
        revision: String,
        memory: String,
        genesis: String,
    }

    fn command(
        operation: &str,
        kind: &str,
        expected_head: Option<&str>,
        revision: &str,
        memory: &str,
    ) -> Value {
        json!({
            "application": "parity", "operation": operation, "kind": kind,
            "expectedHead": expected_head, "revision": revision, "memory": memory,
            "intents": [], "evidence": [], "causedBy": null,
        })
    }

    fn ops(name: &str) -> String {
        hashed(&json!({"contract":"algal.test-op.v1","name":name}))
    }

    async fn fixture() -> (tempfile::TempDir, Service<'static>, Fixture) {
        let tmp = tempdir().unwrap();
        let mut store = Store::open(tmp.path(), true).unwrap();
        let manifest = store
            .put(
                "manifests",
                &crate::contract::Manifest::parse(&json!({
                    "contract": "algal.organism.v1", "key": "organism:test", "name": "test",
                    "cells": [{"id": "out", "kind": "const", "outputs": {"value": {"type": "json", "value": "ok"}}}],
                    "edges": [],
                }))
                .unwrap()
                .value,
            )
            .unwrap();
        let schema = put_record(&mut store, &json!({"contract":"algal.test-schema.v1"})).unwrap();
        let queries = put_record(&mut store, &json!({"contract":"algal.test-queries.v1"})).unwrap();
        let views = put_record(&mut store, &json!({"contract":"algal.test-views.v1"})).unwrap();
        let runtime = put_record(&mut store, &json!({"contract":"algal.test-runtime.v1"})).unwrap();
        let policy = put_record(&mut store, &json!({"contract":"algal.test-policy.v1"})).unwrap();
        let query = put_record(&mut store, &json!({"contract":"algal.test-query.v1"})).unwrap();
        let revision = put_record(
            &mut store,
            &json!({"contract":"algal.application-revision.v1","application":"parity","parent":null,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]}),
        )
        .unwrap();
        let memory = put_record(
            &mut store,
            &json!({"contract":"algal.test-memory.v1","facts":[]}),
        )
        .unwrap();
        let allow: &'static Allow = Box::leak(Box::new(Allow));
        let mut service = Service::new(tmp.path(), allow).unwrap();
        let genesis = service
            .create(&command(&ops("create"), "create", None, &revision, &memory))
            .await
            .unwrap();
        (
            tmp,
            service,
            Fixture {
                revision,
                memory,
                genesis: genesis.digest,
            },
        )
    }

    #[tokio::test]
    async fn produces_and_verifies_a_retained_race() {
        let (_tmp, mut service, f) = fixture().await;
        let attempts = vec![
            command(
                &ops("winner"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
            command(
                &ops("loser-a"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
            command(
                &ops("loser-b"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
        ];
        let (reference, record, snapshot) = produce_contention(
            &mut service,
            &json!({"parentState": f.genesis, "attempts": attempts}),
        )
        .await
        .unwrap();
        assert_eq!(record.parent_state, f.genesis);
        assert_eq!(record.attempts.len(), 3);
        // Sorted unique by command digest; exactly one committed winner.
        let refs: Vec<&str> = record.attempts.iter().map(|a| a.command.as_str()).collect();
        let mut sorted = refs.clone();
        sorted.sort();
        assert_eq!(refs, sorted);
        let committed: Vec<_> = record
            .attempts
            .iter()
            .filter(|a| a.status == "committed")
            .collect();
        assert_eq!(committed.len(), 1);
        assert_eq!(committed[0].command, record.winner);
        assert!(committed[0].reason.is_none());
        for attempt in record.attempts.iter().filter(|a| a.status == "rejected") {
            assert_eq!(attempt.reason.as_deref(), Some(STALE_HEAD_REASON));
        }
        // The first attempt in input order won the race.
        assert_eq!(
            record.winner,
            hashed(
                &parse_command(&json!({
                    "application": "parity", "operation": ops("winner"), "kind": "memory",
                    "expectedHead": f.genesis, "revision": f.revision, "memory": f.memory,
                    "intents": [], "evidence": [], "causedBy": null,
                }))
                .unwrap()
                .value()
            )
        );
        assert_eq!(snapshot.state.previous.as_deref(), Some(f.genesis.as_str()));
        let verified = verify_contention(&service, &reference).unwrap();
        assert_eq!(verified.winner, record.winner);
        // The history grew by exactly the winning transition.
        assert_eq!(service.history("parity").unwrap().len(), 2);
        // Replaying the same race reproduces the identical record digest.
        let attempts = vec![
            command(
                &ops("winner"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
            command(
                &ops("loser-a"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
            command(
                &ops("loser-b"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
        ];
        let (replayed, _, _) = produce_contention(
            &mut service,
            &json!({"parentState": f.genesis, "attempts": attempts}),
        )
        .await
        .unwrap();
        assert_eq!(replayed, reference);
    }

    #[tokio::test]
    async fn production_rejects_malformed_races() {
        let (_tmp, mut service, f) = fixture().await;
        let later = service
            .commit(&command(
                &ops("advance"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ))
            .await
            .unwrap();
        // Attempts must race the declared parent.
        let mixed = json!({"parentState": f.genesis, "attempts": [
            command(&ops("x"), "memory", Some(&f.genesis), &f.revision, &f.memory),
            command(&ops("y"), "memory", Some(&later.digest), &f.revision, &f.memory),
        ]});
        assert!(produce_contention(&mut service, &mixed).await.is_err());
        // Duplicate commands are not a race.
        let dup = command(
            &ops("dup"),
            "memory",
            Some(&f.genesis),
            &f.revision,
            &f.memory,
        );
        assert!(
            produce_contention(
                &mut service,
                &json!({"parentState": f.genesis, "attempts": [dup.clone(), dup]})
            )
            .await
            .is_err()
        );
        // Empty and oversized attempt lists.
        assert!(
            produce_contention(
                &mut service,
                &json!({"parentState": f.genesis, "attempts": []})
            )
            .await
            .is_err()
        );
        let too_many: Vec<Value> = (0..9)
            .map(|i| {
                command(
                    &ops(&format!("c{i}")),
                    "memory",
                    Some(&f.genesis),
                    &f.revision,
                    &f.memory,
                )
            })
            .collect();
        assert!(
            produce_contention(
                &mut service,
                &json!({"parentState": f.genesis, "attempts": too_many})
            )
            .await
            .is_err()
        );
        // A non-stale-head failure aborts production without a record.
        let missing = command(
            &ops("bad"),
            "memory",
            Some(&f.genesis),
            &ops("missing-revision"),
            &f.memory,
        );
        assert!(
            produce_contention(
                &mut service,
                &json!({"parentState": f.genesis, "attempts": [missing]})
            )
            .await
            .is_err()
        );
        assert_eq!(service.history("parity").unwrap().len(), 2);
    }

    #[tokio::test]
    async fn verification_rejects_forged_winners_and_losers() {
        let (_tmp, mut service, f) = fixture().await;
        let attempts = vec![
            command(
                &ops("w"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
            command(
                &ops("l"),
                "memory",
                Some(&f.genesis),
                &f.revision,
                &f.memory,
            ),
        ];
        let (_, record, _) = produce_contention(
            &mut service,
            &json!({"parentState": f.genesis, "attempts": attempts}),
        )
        .await
        .unwrap();
        // Flip the statuses: the loser cannot pose as the committed writer.
        let loser = record
            .attempts
            .iter()
            .find(|a| a.command != record.winner)
            .unwrap()
            .command
            .clone();
        let flipped: Vec<Value> = record
            .attempts
            .iter()
            .map(|a| {
                if a.command == record.winner {
                    json!({"command": a.command, "status": "rejected", "reason": STALE_HEAD_REASON})
                } else {
                    json!({"command": a.command, "status": "committed"})
                }
            })
            .collect();
        let forged = put_record(
            &mut service.store,
            &json!({"contract":"algal.application-contention.v1","parentState":f.genesis,"attempts":flipped,"winner":loser}),
        )
        .unwrap();
        let error = verify_contention(&service, &forged).unwrap_err();
        assert!(error.message.contains("not committed"));
        // A loser claiming a rejection the lifecycle would not derive.
        let wrong_reason: Vec<Value> = record
            .attempts
            .iter()
            .map(|a| {
                if a.status == "rejected" {
                    json!({"command": a.command, "status": "rejected", "reason": OPERATION_COMMITTED_REASON})
                } else {
                    json!({"command": a.command, "status": "committed"})
                }
            })
            .collect();
        let forged = put_record(
            &mut service.store,
            &json!({"contract":"algal.application-contention.v1","parentState":f.genesis,"attempts":wrong_reason,"winner":record.winner}),
        )
        .unwrap();
        let error = verify_contention(&service, &forged).unwrap_err();
        assert!(error.message.contains("not reproducible"));
    }

    #[test]
    fn parse_rejects_malformed_records() {
        let (a, b, c) = (
            hashed(&json!("a")),
            hashed(&json!("b")),
            hashed(&json!("c")),
        );
        // Command digests must appear sorted; order the fixture accordingly.
        let (first, second) = if a < b {
            (a.clone(), b.clone())
        } else {
            (b.clone(), a.clone())
        };
        let base = |attempts: Value, winner: &str| json!({"contract":"algal.application-contention.v1","parentState":hashed(&json!("p")),"attempts":attempts,"winner":winner});
        // Valid: one committed, one rejected, sorted.
        let ok = base(
            json!([
                {"command": first, "status": "committed"},
                {"command": second, "status": "rejected", "reason": "Stale application head"},
            ]),
            &first.clone(),
        );
        assert!(parse_contention(&ok).is_ok());
        // Empty attempts.
        assert!(parse_contention(&base(json!([]), &a)).is_err());
        // Duplicate.
        let dup = base(
            json!([
                {"command": a, "status": "committed"},
                {"command": a, "status": "rejected", "reason": "Stale application head"},
            ]),
            &a,
        );
        assert!(parse_contention(&dup).is_err());
        // Rejected without a reason.
        let no_reason = base(
            json!([
                {"command": a, "status": "committed"},
                {"command": c, "status": "rejected"},
            ]),
            &a,
        );
        assert!(parse_contention(&no_reason).is_err());
        // Committed carrying a reason.
        let with_reason = base(
            json!([
                {"command": a, "status": "committed", "reason": "why"},
                {"command": c, "status": "rejected", "reason": "Stale application head"},
            ]),
            &a,
        );
        assert!(parse_contention(&with_reason).is_err());
        // Zero committed.
        let none = base(
            json!([{"command": a, "status": "rejected", "reason": "Stale application head"}]),
            &a,
        );
        assert!(parse_contention(&none).is_err());
        // Winner that is not the committed attempt.
        let wrong = base(
            json!([
                {"command": a, "status": "committed"},
                {"command": c, "status": "rejected", "reason": "Stale application head"},
            ]),
            &c,
        );
        assert!(parse_contention(&wrong).is_err());
    }
}
