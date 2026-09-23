//! `algal.interapp-message.v1` — parity port of `src/application-message.ts`.
//! The verifiable inter-application message record a settled `deliver`
//! dispatch retains: sender application, committing operation, exact work
//! intent, declared route, admitted recipient capability, and payload body —
//! so a recipient can check authorship claims against the content-addressed
//! store without trusting a transient dispatcher result.
//!
//! The record is minted inside `Service::execute` the moment a delivery
//! settles, before the outbox acknowledges settlement. What it proves: this
//! exact application, operation, intent, route, recipient, and body were
//! bound together in one settled delivery dispatch. What it does not prove:
//! receipt by any external party, human intent, or authority beyond the host
//! policy that admitted the route.

use serde_json::{Value, json};
use std::path::Path;

use crate::application::{Dispatch, DispatchPlan, Intent, Service, WorkIntent, parse_intent};
use crate::application_host::read_channel;
use crate::application_memory::{
    app_id, app_json, app_object, app_ref, app_tag, get_record, put_record,
};
use crate::canonical::digest;
use crate::contract::text;
use crate::store::Store;
use crate::{Error, Result};

fn fail(message: &str) -> Error {
    Error::new("RECEIPT_MISMATCH", message)
}

/// `algal.interapp-message.v1` — `value` retains the canonical record for
/// digest reproduction checks.
#[derive(Clone, Debug)]
pub struct InterappMessage {
    pub application: String,
    pub operation: String,
    pub intent: String,
    pub route: String,
    pub to: String,
    pub body: Value,
    pub value: Value,
}

/// `parseInterappMessage` — closed record; `to` must carry the
/// `mailbox-send` capability class exactly as the delivery plan's recipient.
pub fn parse_interapp_message(input: &Value) -> Result<InterappMessage> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "operation",
            "intent",
            "route",
            "to",
            "body",
        ],
    )?;
    app_tag(&v["contract"], "algal.interapp-message.v1")?;
    let handle =
        crate::capabilities::parse_capability_handle(text(&v["to"], 256)?, Some("mailbox-send"))?;
    Ok(InterappMessage {
        application: app_id(&v["application"])?.to_owned(),
        operation: app_ref(&v["operation"])?.to_owned(),
        intent: app_ref(&v["intent"])?.to_owned(),
        route: app_id(&v["route"])?.to_owned(),
        to: handle.handle,
        body: app_json(&v["body"])?,
        value: input.clone(),
    })
}

/// `interappMessageRecord` — the record a settled delivery retains, or
/// `None` for any other dispatch shape. The caller digests/stores `value`.
pub fn interapp_message_record(
    dispatch: &Dispatch,
    work: &Intent,
    body: &Value,
) -> Option<InterappMessage> {
    let (route, recipient) = match (&work.work, &dispatch.plan) {
        (WorkIntent::Deliver { route, .. }, DispatchPlan::Delivery { recipient, .. })
            if dispatch.status == "settled" && dispatch.result.is_some() =>
        {
            (route, recipient)
        }
        _ => return None,
    };
    let value = json!({
        "contract": "algal.interapp-message.v1", "application": work.application,
        "operation": work.operation, "intent": dispatch.intent,
        "route": route, "to": recipient, "body": body,
    });
    Some(InterappMessage {
        application: work.application.clone(),
        operation: work.operation.clone(),
        intent: dispatch.intent.clone(),
        route: route.clone(),
        to: recipient.clone(),
        body: body.clone(),
        value,
    })
}

/// `mintInterappMessage` — mint the message record for a freshly settled
/// delivery. Returns `None` when the dispatch is not a settled delivery or
/// when the bound record would exceed the application record bound (the
/// channel outcome still stands; the verifier simply finds no record).
/// Re-running the mint is idempotent.
pub fn mint_interapp_message(
    store: &mut Store,
    dispatch: &Dispatch,
    work: &Intent,
) -> Result<Option<String>> {
    let message_ref = match &work.work {
        WorkIntent::Deliver { message, .. }
            if matches!(dispatch.plan, DispatchPlan::Delivery { .. })
                && dispatch.status == "settled"
                && dispatch.result.is_some() =>
        {
            message
        }
        _ => return Ok(None),
    };
    if work.application != dispatch.application
        || digest(&app_json(&work.value)?)? != dispatch.intent
    {
        return Err(fail("Interapp message intent binding mismatch"));
    }
    let Some(result_ref) = dispatch.result.as_deref() else {
        return Ok(None);
    };
    // Re-derive the settlement binding from CAS: the record claims only what
    // the retained result and the intent's own message reference establish.
    let result = get_record(store, result_ref)?;
    let value = app_object(&result, &["kind", "message", "idempotencyKey"])?;
    app_tag(&value["kind"], "delivery")?;
    if app_ref(&value["idempotencyKey"])? != dispatch.identity
        || app_ref(&value["message"])? != message_ref
    {
        return Err(fail("Delivery settlement changed its identity or message"));
    }
    let body = get_record(store, message_ref)?;
    let Some(record) = interapp_message_record(dispatch, work, &body) else {
        return Ok(None);
    };
    if app_json(&record.value).is_err() {
        return Ok(None);
    }
    Ok(Some(put_record(store, &record.value)?))
}

/// `verifyInterappMessage` — CAS-level verification: parse the record, load
/// the intent it names, confirm every binding the record asserts, and
/// re-resolve the payload digest to the embedded body. Does not consult the
/// application history or channel; `verify_interapp_delivery` adds those.
pub fn verify_interapp_message(store: &Store, reference: &str) -> Result<InterappMessage> {
    let record = parse_interapp_message(&get_record(store, reference)?)?;
    let work = parse_intent(&get_record(store, &record.intent)?)?;
    let (route, message) = match &work.work {
        WorkIntent::Deliver { route, message } => (route, message),
        _ => return Err(fail("Interapp message does not bind its intent")),
    };
    if work.application != record.application
        || work.operation != record.operation
        || route != &record.route
    {
        return Err(fail("Interapp message does not bind its intent"));
    }
    let body = get_record(store, message)?;
    if digest(&app_json(&body)?)? != digest(&app_json(&record.body)?)? {
        return Err(fail("Interapp message does not bind its payload"));
    }
    Ok(record)
}

/// `verifyInterappDelivery` — the CAS bindings above, plus the retained
/// dispatch for the cited intent must be the settled delivery the record
/// describes (same recipient, same settled result), inside the application's
/// validated history. When `channels_dir` is supplied the durable channel
/// must also retain the outcome `{identity, message}` the record implies —
/// the receiver-side half of the delivery.
pub fn verify_interapp_delivery(
    service: &Service<'_>,
    reference: &str,
    channels_dir: Option<&Path>,
) -> Result<InterappMessage> {
    let record = verify_interapp_message(&service.store, reference)?;
    let work = parse_intent(&get_record(&service.store, &record.intent)?)?;
    let message_ref = match &work.work {
        WorkIntent::Deliver { message, .. } => message.clone(),
        _ => return Err(fail("Interapp message does not bind its intent")),
    };
    let history = service.history(&record.application)?;
    let source = history
        .iter()
        .find(|s| s.transition.intents.contains(&record.intent))
        .ok_or_else(|| fail("Interapp message intent is not in application history"))?;
    let dispatch = service
        .read_dispatch(&record.application, &record.intent, &work, source)?
        .filter(|d| d.status == "settled")
        .ok_or_else(|| fail("Interapp message delivery did not settle"))?;
    match &dispatch.plan {
        DispatchPlan::Delivery { recipient, .. } if recipient == &record.to => (),
        _ => return Err(fail("Interapp message recipient mismatch")),
    }
    // The minted record is itself content-addressed: recomputing it from the
    // retained dispatch proves no field was relabelled after settlement.
    let body = get_record(&service.store, &message_ref)?;
    let expected = interapp_message_record(&dispatch, &work, &body)
        .ok_or_else(|| fail("Interapp message record does not reproduce"))?;
    if digest(&app_json(&expected.value)?)? != reference {
        return Err(fail("Interapp message record does not reproduce"));
    }
    if let Some(dir) = channels_dir {
        let outcomes = read_channel(dir, &record.route)?;
        if !outcomes
            .iter()
            .any(|o| o.identity == dispatch.identity && o.message == message_ref)
        {
            return Err(fail("Interapp message lacks its channel outcome"));
        }
    }
    Ok(record)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{
        Admission, CommitContext, DispatchAdmission, DispatchContext, Dispatcher,
    };
    use serde_json::{Value, json};
    use std::future::Future;
    use std::pin::Pin;
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
                    "episodes need a domain dispatcher",
                )),
            }
        }
    }

    struct Sink;
    impl Dispatcher for Sink {
        fn configuration_digest(&self) -> &str {
            "sha256:0000000000000000000000000000000000000000000000000000000000000001"
        }
        fn dispatch<'a>(
            &'a self,
            context: &'a DispatchContext<'a>,
        ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
            Box::pin(async move {
                match &context.intent.work {
                    WorkIntent::Deliver { message, .. } => Ok(json!({
                        "status": "settled",
                        "result": {"kind": "delivery", "message": message,
                            "idempotencyKey": context.dispatch.identity},
                    })),
                    _ => Err(Error::invalid("sink unset")),
                }
            })
        }
    }

    /// The smallest honest fixture: a manifest + memory chain so commits
    /// validate, an admit-all host, and a dispatcher that settles deliveries.
    struct Fixture {
        revision: String,
        memory: String,
        message: String,
        channels: std::path::PathBuf,
    }

    fn seed(dir: &std::path::Path) -> Fixture {
        let mut store = Store::open(dir, true).unwrap();
        let put = |store: &mut Store, v: Value| put_record(store, &v).unwrap();
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
        let schema = put(&mut store, json!({"contract":"algal.test-schema.v1"}));
        let queries = put(&mut store, json!({"contract":"algal.test-queries.v1"}));
        let views = put(&mut store, json!({"contract":"algal.test-views.v1"}));
        let runtime = put(&mut store, json!({"contract":"algal.test-runtime.v1"}));
        let policy = put(&mut store, json!({"contract":"algal.test-policy.v1"}));
        let query = put(&mut store, json!({"contract":"algal.test-query.v1"}));
        let revision = put(
            &mut store,
            json!({"contract":"algal.application-revision.v1","application":"parity","parent":null,"schema":schema,"queries":queries,"views":views,"runtimeProfile":runtime,"evaluationPolicy":policy,"capabilityRequirements":[],"entrypoints":[{"name":"run","manifest":manifest,"applicability":query,"maxGenerations":1,"capabilities":[],"queries":[query]}]}),
        );
        let memory = put(
            &mut store,
            json!({"contract":"algal.test-memory.v1","facts":[]}),
        );
        let message = put(
            &mut store,
            json!({"contract":"algal.test-message.v1","body":"hello"}),
        );
        Fixture {
            revision,
            memory,
            message,
            channels: dir.join("channels"),
        }
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

    fn ops(name: &str) -> String {
        hashed(&json!({"contract":"algal.test-op.v1","name":name}))
    }

    /// Store a record with `patch` applied over `base`; returns its digest.
    fn forged(store: &mut Store, base: &Value, patch: Value) -> String {
        let mut value = base.clone();
        for (key, v) in patch.as_object().unwrap() {
            value[key] = v.clone();
        }
        put_record(store, &value).unwrap()
    }

    /// Commit a `deliver` intent and settle it; returns the settled dispatch,
    /// the intent record, and the minted message reference.
    async fn settle(service: &mut Service<'_>, fixture: &Fixture) -> (Dispatch, Intent, String) {
        let intent_ref = {
            let intents =
                vec![json!({"kind":"deliver","route":"investigate","message":fixture.message})];
            let snapshot = service
                .commit(&command(
                    &ops("deliver-1"),
                    "investigate",
                    Some(&service.inspect("parity").unwrap().unwrap().digest),
                    &fixture.revision,
                    &fixture.memory,
                    intents,
                ))
                .await
                .unwrap();
            snapshot.transition.intents[0].clone()
        };
        let attempts = service.dispatch_pending("parity", &Sink, 32).await.unwrap();
        let dispatch = match &attempts[0] {
            crate::application::DispatchAttempt::Admitted(d) => (**d).clone(),
            _ => panic!("expected an admitted dispatch"),
        };
        assert_eq!(dispatch.status, "settled");
        let work = parse_intent(&get_record(&service.store, &intent_ref).unwrap()).unwrap();
        let body = get_record(&service.store, &fixture.message).unwrap();
        let record = interapp_message_record(&dispatch, &work, &body).unwrap();
        let reference = hashed(&record.value);
        (dispatch, work, reference)
    }

    #[tokio::test]
    async fn a_settled_delivery_mints_a_fully_verifiable_record() {
        let tmp = tempdir().unwrap();
        let fixture = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &fixture.revision,
                &fixture.memory,
                vec![],
            ))
            .await
            .unwrap();
        let (dispatch, _work, reference) = settle(&mut service, &fixture).await;
        let verified = verify_interapp_message(&service.store, &reference).unwrap();
        assert_eq!(verified.application, "parity");
        assert_eq!(verified.intent, dispatch.intent);
        assert_eq!(verified.route, "investigate");
        // Without a channel directory the check is CAS + history only.
        verify_interapp_delivery(&service, &reference, None).unwrap();
        // Populate the route channel with the outcome the record implies.
        std::fs::create_dir_all(&fixture.channels).unwrap();
        std::fs::write(
            fixture.channels.join("investigate.json"),
            serde_json::to_string(&json!({"contract":"algal.host-channel.v2","route":"investigate","outcomes":[{"identity":dispatch.identity,"message":fixture.message}]})).unwrap(),
        )
        .unwrap();
        verify_interapp_delivery(&service, &reference, Some(&fixture.channels)).unwrap();
    }

    #[tokio::test]
    async fn channel_evidence_is_required_when_a_directory_is_supplied() {
        let tmp = tempdir().unwrap();
        let fixture = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &fixture.revision,
                &fixture.memory,
                vec![],
            ))
            .await
            .unwrap();
        let (_, _, reference) = settle(&mut service, &fixture).await;
        let missing = tmp.path().join("no-channel");
        let error = verify_interapp_delivery(&service, &reference, Some(&missing)).unwrap_err();
        assert!(error.message.contains("channel outcome"));
    }

    #[tokio::test]
    async fn tampered_records_fail_verification() {
        let tmp = tempdir().unwrap();
        let fixture = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &fixture.revision,
                &fixture.memory,
                vec![],
            ))
            .await
            .unwrap();
        let (dispatch, work, _) = settle(&mut service, &fixture).await;
        let body = get_record(&service.store, &fixture.message).unwrap();
        let record = interapp_message_record(&dispatch, &work, &body).unwrap();
        // Relabelling the sender, route, or operation breaks the intent binding.
        for (key, value) in [
            ("application", json!("foreign")),
            ("route", json!("elsewhere")),
            ("operation", json!(ops("other"))),
        ] {
            let reference = forged(&mut service.store, &record.value, json!({key: value}));
            assert!(verify_interapp_message(&service.store, &reference).is_err());
        }
        // Relabelling the payload breaks the payload binding.
        let swapped = forged(
            &mut service.store,
            &record.value,
            json!({"body": {"contract":"algal.test-message.v1","body":"swapped"}}),
        );
        assert!(verify_interapp_message(&service.store, &swapped).is_err());
        // Relabelling the recipient passes CAS checks but fails the plan check.
        let other = format!("cap:mailbox-send:{}", ops("elsewhere"));
        let recipient = forged(&mut service.store, &record.value, json!({"to": other}));
        verify_interapp_message(&service.store, &recipient).unwrap();
        assert!(verify_interapp_delivery(&service, &recipient, None).is_err());
    }

    #[tokio::test]
    async fn non_delivery_and_unsettled_dispatches_mint_nothing() {
        let tmp = tempdir().unwrap();
        let fixture = seed(tmp.path());
        let allow = Allow;
        let mut service = Service::new(tmp.path(), &allow).unwrap();
        service
            .create(&command(
                &ops("create"),
                "create",
                None,
                &fixture.revision,
                &fixture.memory,
                vec![],
            ))
            .await
            .unwrap();
        let (dispatch, work, _) = settle(&mut service, &fixture).await;
        let mut blocked = dispatch.clone();
        blocked.status = "blocked".to_owned();
        blocked.result = None;
        blocked.reason = Some("held".to_owned());
        assert!(
            mint_interapp_message(&mut service.store, &blocked, &work)
                .unwrap()
                .is_none()
        );
        let start = parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "parity",
            "operation": work.operation, "ordinal": 1,
            "kind": "start-episode", "entrypoint": "run", "input": ops("input"),
        }))
        .unwrap();
        assert!(
            mint_interapp_message(&mut service.store, &dispatch, &start)
                .unwrap()
                .is_none()
        );
    }

    #[test]
    fn parse_rejects_malformed_records() {
        let base = json!({
            "contract": "algal.interapp-message.v1", "application": "parity",
            "operation": hashed(&json!("op")), "intent": hashed(&json!("intent")),
            "route": "investigate",
            "to": format!("cap:mailbox-send:{}", hashed(&json!("r"))),
            "body": {"contract":"algal.test-message.v1"},
        });
        assert!(parse_interapp_message(&base).is_ok());
        let mut extra = base.clone();
        extra["extra"] = json!(1);
        assert!(parse_interapp_message(&extra).is_err());
        let mut tag = base.clone();
        tag["contract"] = json!("algal.other.v1");
        assert!(parse_interapp_message(&tag).is_err());
        let mut cap = base.clone();
        cap["to"] = json!(format!("cap:file-write:{}", hashed(&json!("r"))));
        assert!(parse_interapp_message(&cap).is_err());
        let mut route = base.clone();
        route["route"] = json!("Bad Route");
        assert!(parse_interapp_message(&route).is_err());
    }
}
