//! Declarative application host — parity port of `src/application-host.ts`.
//! `algal.application-host.v1` admits one application with a pinned mutation
//! frontier, attestation-checked scopes, decoder policies admitting
//! self-describing raw evidence bound by receipts naming the raw digest,
//! route→delivery plans, and episode bindings fencing the captured state.
//! The dispatcher settles `deliver` intents by appending the message digest
//! to a durable channel file; episodes are blocked honestly because program
//! execution stays with a domain dispatcher.

use crate::{
    Error, Result,
    application::{
        Admission, CommitContext, DispatchAdmission, DispatchContext, Dispatcher, WorkIntent,
        parse_episode_binding, process_name,
    },
    application_memory::{
        self as mem, MemoryAdmission, MemoryService, ObservationAdmission, app_id, app_json,
        app_object, app_ref, bounded_text,
    },
    canonical::digest,
    capabilities::parse_capability_handle,
    contract::{list, object, text},
    lease,
};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::pin::Pin;

#[derive(Clone, Debug)]
pub struct RoutePolicy {
    pub recipient: String,
    pub host_profile: String,
}

#[derive(Clone, Debug)]
pub struct DecoderPolicy {
    pub raw_contract: String,
    pub receipt_contract: String,
    /// "names-raw": the receipt carries the raw digest (probe evidence).
    /// "names-receipt": the raw record carries the producing receipt's digest
    /// — under CAS the same binding inverted (a migration record cannot be
    /// named by the run receipt that produced it).
    pub receipt_binding: String,
}

/// A parsed `algal.application-host.v1` record.
#[derive(Clone, Debug)]
pub struct Policy {
    pub application: String,
    pub frontier: String,
    pub host_profile: String,
    pub episode_access: String,
    pub routes: BTreeMap<String, RoutePolicy>,
    pub attestation: Option<String>,
    pub decoders: BTreeMap<String, DecoderPolicy>,
    pub value: Value,
    pub reference: String,
}

pub fn parse_policy(input: &Value) -> Result<Policy> {
    let v = app_object(
        input,
        &[
            "contract",
            "application",
            "frontier",
            "hostProfile",
            "episodeAccess",
            "routes",
            "attestation",
            "decoders",
        ],
    )?;
    mem::app_tag(&v["contract"], "algal.application-host.v1")?;
    let access = bounded_text(&v["episodeAccess"], 24)?;
    if access != "observe" && access != "external-write" {
        return Err(Error::invalid("Invalid episode access"));
    }
    let mut routes = BTreeMap::new();
    let mut previous_route = String::new();
    for row in list(&v["routes"], 16)? {
        let r = app_object(row, &["route", "recipient", "hostProfile"])?;
        let route = app_id(&r["route"])?.to_owned();
        if route <= previous_route {
            return Err(Error::invalid("Host routes must be sorted and unique"));
        }
        previous_route = route.clone();
        routes.insert(
            route,
            RoutePolicy {
                recipient: parse_capability_handle(
                    text(&r["recipient"], 256)?,
                    Some("mailbox-send"),
                )?
                .handle,
                host_profile: app_ref(&r["hostProfile"])?.to_owned(),
            },
        );
    }
    let mut decoders = BTreeMap::new();
    let mut previous_decoder = String::new();
    for row in list(&v["decoders"], 16)? {
        let d = app_object(
            row,
            &[
                "decoder",
                "rawContract",
                "receiptContract",
                "receiptBinding",
            ],
        )?;
        let decoder = app_ref(&d["decoder"])?.to_owned();
        if decoder <= previous_decoder {
            return Err(Error::invalid(
                "Host decoder policies must be sorted and unique",
            ));
        }
        previous_decoder = decoder.clone();
        let receipt_binding = bounded_text(&d["receiptBinding"], 32)?;
        if receipt_binding != "names-raw" && receipt_binding != "names-receipt" {
            return Err(Error::invalid("Invalid receipt binding mode"));
        }
        decoders.insert(
            decoder,
            DecoderPolicy {
                raw_contract: bounded_text(&d["rawContract"], 128)?,
                receipt_contract: bounded_text(&d["receiptContract"], 128)?,
                receipt_binding,
            },
        );
    }
    let attestation = if v["attestation"].is_null() {
        None
    } else {
        Some(bounded_text(&v["attestation"], 128)?)
    };
    let policy = Policy {
        application: app_id(&v["application"])?.to_owned(),
        frontier: app_ref(&v["frontier"])?.to_owned(),
        host_profile: app_ref(&v["hostProfile"])?.to_owned(),
        episode_access: access,
        routes,
        attestation,
        decoders,
        value: app_json(input)?,
        reference: String::new(),
    };
    let reference = digest(&policy.value)?;
    Ok(Policy {
        reference,
        ..policy
    })
}

fn read_channel(channels_dir: &Path, route: &str) -> Result<Vec<String>> {
    // The TypeScript channel read is unbounded; the outcome list itself is
    // capped at 4096 digests (~300KiB), so this byte bound is generous slack
    // and never rejects a legal channel.
    let raw = match lease::read(&channels_dir.join(format!("{route}.json")), 1_048_576)? {
        Some(raw) => raw,
        None => return Ok(Vec::new()),
    };
    let v = app_object(&raw, &["contract", "route", "outcomes"])?;
    mem::app_tag(&v["contract"], "algal.host-channel.v1")?;
    if v["route"] != json!(route) {
        return Err(Error::invalid("Channel route mismatch"));
    }
    app_refs_channel(&v["outcomes"], 4096)
}

fn app_refs_channel(value: &Value, max: usize) -> Result<Vec<String>> {
    let rows = list(value, max)?;
    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        out.push(app_ref(row)?.to_owned());
    }
    Ok(out)
}

fn write_channel(channels_dir: &Path, route: &str, outcomes: &[String]) -> Result<()> {
    lease::write(
        &channels_dir.join(format!("{route}.json")),
        &json!({"contract":"algal.host-channel.v1","route":route,"outcomes":outcomes}),
        true,
    )
}

/// The three host traits on one value. `identity` and
/// `configuration_digest` bind the exact policy digest so a policy change is
/// a new host, never silent drift.
pub struct PolicyHost {
    pub policy: Policy,
    identity: String,
    configuration_digest: String,
    channels_dir: PathBuf,
}

impl PolicyHost {
    pub fn new(input: &Value, channels_dir: &Path) -> Result<Self> {
        let policy = parse_policy(input)?;
        let identity = digest(&app_json(&json!({
            "contract": "algal.host-admission.v1", "policy": policy.reference,
        }))?)?;
        let configuration_digest = digest(&app_json(&json!({
            "contract": "algal.host-dispatcher.v1", "policy": policy.reference,
        }))?)?;
        Ok(Self {
            policy,
            identity,
            configuration_digest,
            channels_dir: channels_dir.to_path_buf(),
        })
    }

    fn settle_delivery(&self, work_route: &str, message: &str, identity: &str) -> Result<Value> {
        let mut outcomes = read_channel(&self.channels_dir, work_route)?;
        if !outcomes.contains(&message.to_owned()) {
            outcomes.push(message.to_owned());
            if outcomes.len() > 4096 {
                return Err(Error::limit("Channel bound exceeded"));
            }
            write_channel(&self.channels_dir, work_route, &outcomes)?;
        }
        Ok(json!({
            "status": "settled",
            "result": {"kind":"delivery","message":message,"idempotencyKey":identity},
        }))
    }
}

impl Admission for PolicyHost {
    fn admit_commit(&self, _context: &CommitContext) -> Result<()> {
        Ok(())
    }
    fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
        match &context.intent.work {
            WorkIntent::Deliver { route, .. } => {
                let policy = self
                    .policy
                    .routes
                    .get(route)
                    .ok_or_else(|| Error::invalid("Host policy denies this route"))?;
                Ok(json!({
                    "kind": "delivery", "recipient": policy.recipient,
                    "hostProfile": policy.host_profile,
                }))
            }
            WorkIntent::StartEpisode { entrypoint, input } => {
                let snapshot = context.snapshot;
                let entry = snapshot
                    .revision
                    .entrypoints
                    .iter()
                    .find(|e| &e.name == entrypoint)
                    .ok_or_else(|| Error::invalid("Unknown episode entrypoint"))?;
                let intent_ref = digest(&app_json(&context.intent.value)?)?;
                let binding = parse_episode_binding(&json!({
                    "contract": "algal.application-episode.v1",
                    "application": context.intent.application, "intent": intent_ref,
                    "sourceState": snapshot.digest, "revision": snapshot.state.revision,
                    "memory": snapshot.state.memory, "epoch": snapshot.state.epoch,
                    "entrypoint": entry.name, "manifest": entry.manifest,
                    "arguments": input, "maxGenerations": entry.max_generations,
                    "process": process_name(&context.intent.application, &intent_ref)?,
                    "hostProfile": self.policy.host_profile, "access": self.policy.episode_access,
                }))?;
                Ok(json!({"kind":"episode","binding":binding.value}))
            }
        }
    }
}

impl MemoryAdmission for PolicyHost {
    fn identity(&self) -> &str {
        &self.identity
    }
    fn current_frontier(&self, application: &str) -> Result<String> {
        if application != self.policy.application {
            return Err(Error::invalid("Frontier requested for another application"));
        }
        Ok(self.policy.frontier.clone())
    }
    fn validate_scope(
        &self,
        scope: &mem::MemoryScope,
        _frontier: &mem::MemoryFrontier,
        attestation: &Value,
    ) -> Result<()> {
        if scope.application != self.policy.application {
            return Err(Error::invalid("Cross-application scope"));
        }
        if let Some(required) = &self.policy.attestation {
            let att = object(attestation)?;
            if att.get("contract") != Some(&json!(required)) {
                return Err(Error::invalid(
                    "Scope attestation is not the admitted contract",
                ));
            }
        }
        Ok(())
    }
    fn decode_observation(&self, input: &ObservationAdmission) -> Result<Vec<mem::Claim>> {
        let decoder = self
            .policy
            .decoders
            .get(&input.observation.decoder)
            .ok_or_else(|| Error::invalid("Host policy denies this decoder"))?;
        // The contract binds the evidence kind, not the record shape:
        // lifecycle records such as algal.application-migration.v1
        // legitimately carry claims alongside their other fields.
        let bounded = object(&input.raw)?;
        if bounded.get("contract") != Some(&json!(decoder.raw_contract)) {
            return Err(Error::invalid("Raw evidence is not the admitted contract"));
        }
        let mut claims = Vec::new();
        for row in list(bounded.get("claims").unwrap_or(&Value::Null), 32)? {
            claims.push(mem::parse_claim(row)?);
        }
        let proof = object(&input.receipt)?;
        if proof.get("contract") != Some(&json!(decoder.receipt_contract)) {
            return Err(Error::invalid("Receipt does not bind the raw evidence"));
        }
        if decoder.receipt_binding == "names-raw" {
            if proof.get("raw") != Some(&json!(input.observation.raw)) {
                return Err(Error::invalid("Receipt does not bind the raw evidence"));
            }
        } else if bounded.get("receipt") != Some(&json!(input.observation.receipt)) {
            return Err(Error::invalid("Receipt does not bind the raw evidence"));
        }
        Ok(claims)
    }
}

impl Dispatcher for PolicyHost {
    fn configuration_digest(&self) -> &str {
        &self.configuration_digest
    }
    fn dispatch<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
        Box::pin(async move {
            match &context.intent.work {
                WorkIntent::Deliver { route, message } => {
                    self.settle_delivery(route, message, &context.dispatch.identity)
                }
                WorkIntent::StartEpisode { .. } => Ok(json!({
                    "status": "blocked",
                    "reason": "Episode execution requires a domain dispatcher",
                })),
            }
        })
    }
    fn can_reconcile(&self) -> bool {
        true
    }
    fn reconcile<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
        Box::pin(async move {
            match &context.intent.work {
                WorkIntent::Deliver { route, message } => {
                    match read_channel(&self.channels_dir, route) {
                        Ok(outcomes) if outcomes.contains(message) => Some(Ok(json!({
                            "status": "settled",
                            "result": {"kind":"delivery","message":message,"idempotencyKey":context.dispatch.identity},
                        }))),
                        Ok(_) => None,
                        Err(e) => Some(Err(e)),
                    }
                }
                WorkIntent::StartEpisode { .. } => None,
            }
        })
    }
}

/// The composed application dispatcher — `createApplicationDomainDispatcher`
/// parity. Deliveries settle through the policy host's durable channels;
/// `start-episode` intents run the admitted binding through the VM via
/// `dispatch_episode`. Its configuration digest binds the admitted policy
/// record, so the durable dispatch identifies exactly which dispatcher
/// contract executed it.
pub struct DomainDispatcher<'a> {
    host: &'a PolicyHost,
    dir: PathBuf,
    configuration_digest: String,
}

impl<'a> DomainDispatcher<'a> {
    pub fn new(host: &'a PolicyHost, dir: &Path) -> Result<Self> {
        Ok(Self {
            host,
            dir: dir.to_path_buf(),
            configuration_digest: digest(&app_json(&json!({
                "contract": "algal.application-dispatcher.v1",
                "policy": host.policy.reference,
            }))?)?,
        })
    }
}

impl Dispatcher for DomainDispatcher<'_> {
    fn configuration_digest(&self) -> &str {
        &self.configuration_digest
    }
    fn dispatch<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<Value>> + 'a>> {
        match &context.dispatch.plan {
            crate::application::DispatchPlan::Episode { .. } => Box::pin(
                crate::application_episode::dispatch_episode(context, &self.dir),
            ),
            crate::application::DispatchPlan::Delivery { .. } => self.host.dispatch(context),
        }
    }
    fn can_reconcile(&self) -> bool {
        self.host.can_reconcile()
    }
    fn reconcile<'a>(
        &'a self,
        context: &'a DispatchContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Option<Result<Value>>> + 'a>> {
        // Episodes never silently retry: an uncertain episode is an uncertain
        // external write, so reconcile falls through to the policy host's
        // `None` and the dispatch stays uncertain until the caller settles it.
        self.host.reconcile(context)
    }
}

/// Convenience: construct the memory service for a host.
pub fn memory_service<'a>(
    engine: &'a dyn mem::MemoryEngine,
    host: &'a PolicyHost,
) -> MemoryService<'a> {
    MemoryService {
        engine,
        admission: host,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{Intent, Revision, Snapshot, State, Transition, TransitionKind};
    use crate::application_memory::{ObservationInput, parse_claim};
    use crate::store::Store;
    use serde_json::json;
    use tempfile::tempdir;

    fn hashed(value: Value) -> String {
        digest(&app_json(&value).unwrap()).unwrap()
    }
    fn refn(n: usize) -> String {
        hashed(json!({"contract": "algal.test-ref.v1", "n": n}))
    }
    fn mailbox(n: usize) -> String {
        format!("cap:mailbox-send:{}", refn(n))
    }
    fn policy_value() -> Value {
        json!({
            "contract": "algal.application-host.v1", "application": "parity",
            "frontier": refn(1), "hostProfile": refn(2), "episodeAccess": "observe",
            "attestation": "algal.test-attestation.v1",
            "routes": [{"route": "investigate", "recipient": mailbox(3), "hostProfile": refn(4)}],
            "decoders": [{"decoder": refn(5), "rawContract": "algal.test-raw.v1", "receiptContract": "algal.test-receipt.v1", "receiptBinding": "names-raw"}],
        })
    }

    #[test]
    fn policy_tables_must_be_sorted_and_unique() {
        let mut p = policy_value();
        p["routes"] = json!([
            {"route": "zeta", "recipient": mailbox(6), "hostProfile": refn(4)},
            {"route": "investigate", "recipient": mailbox(3), "hostProfile": refn(4)},
        ]);
        assert!(parse_policy(&p).is_err());
        let mut d = policy_value();
        d["decoders"] = json!([
            {"decoder": refn(7), "rawContract": "a", "receiptContract": "b", "receiptBinding": "names-raw"},
            {"decoder": refn(7), "rawContract": "a", "receiptContract": "b", "receiptBinding": "names-raw"},
        ]);
        assert!(parse_policy(&d).is_err());
        d["episodeAccess"] = json!("execute");
        assert!(parse_policy(&d).is_err());
        assert!(parse_policy(&policy_value()).is_ok());
    }

    fn snapshot() -> Snapshot {
        let revision = Revision {
            application: "parity".to_owned(),
            parent: None,
            schema: refn(10),
            queries: refn(11),
            views: refn(12),
            runtime_profile: refn(13),
            evaluation_policy: refn(14),
            capability_requirements: vec![],
            entrypoints: vec![crate::application::Entrypoint {
                name: "run".to_owned(),
                manifest: refn(15),
                applicability: refn(16),
                max_generations: 1,
                capabilities: vec![],
                queries: vec![refn(16)],
            }],
            value: Value::Null,
        };
        let transition = Transition {
            application: "parity".to_owned(),
            operation: refn(17),
            request: refn(18),
            kind: TransitionKind::Create,
            previous: None,
            revision: refn(19),
            memory: refn(20),
            intents: vec![],
            evidence: vec![],
            caused_by: None,
            value: Value::Null,
        };
        let state = State {
            application: "parity".to_owned(),
            sequence: 0,
            epoch: 0,
            revision: refn(19),
            memory: refn(20),
            previous: None,
            transition: refn(21),
            value: Value::Null,
        };
        Snapshot {
            digest: refn(22),
            state,
            transition,
            revision,
        }
    }

    fn deliver_intent(message: &str) -> Intent {
        crate::application::parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "parity",
            "operation": refn(23), "ordinal": 0,
            "kind": "deliver", "route": "investigate", "message": message,
        }))
        .unwrap()
    }

    #[test]
    fn routes_not_in_policy_are_denied() {
        let tmp = tempdir().unwrap();
        let host = PolicyHost::new(&policy_value(), tmp.path()).unwrap();
        let current = snapshot();
        let intent = deliver_intent(&refn(30));
        let store = Store::open(tmp.path(), true).unwrap();
        let admission = DispatchAdmission {
            current: &current,
            snapshot: &current,
            intent: &intent,
            previous_dispatch: None,
            store: &store,
        };
        let plan = Admission::admit_dispatch(&host, &admission).unwrap();
        assert_eq!(plan["kind"], json!("delivery"));
        assert_eq!(plan["recipient"], json!(mailbox(3)));
        let denied = crate::application::parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "parity",
            "operation": refn(23), "ordinal": 1,
            "kind": "deliver", "route": "exfiltrate", "message": refn(30),
        }))
        .unwrap();
        let denied = DispatchAdmission {
            current: &current,
            snapshot: &current,
            intent: &denied,
            previous_dispatch: None,
            store: &store,
        };
        assert!(Admission::admit_dispatch(&host, &denied).is_err());
    }

    #[test]
    fn observations_require_a_declared_decoder_and_bound_receipt() {
        let tmp = tempdir().unwrap();
        let host = PolicyHost::new(&policy_value(), tmp.path()).unwrap();
        let raw = json!({"contract": "algal.test-raw.v1", "claims": [{"relation": "available", "tuple": ["tool-a"], "polarity": "supported"}]});
        let raw_ref = hashed(raw.clone());
        let receipt = json!({"contract": "algal.test-receipt.v1", "raw": raw_ref});
        let base = ObservationInput {
            application: "parity".to_owned(),
            scope: refn(31),
            procedure: refn(32),
            raw: raw_ref.clone(),
            receipt: hashed(receipt.clone()),
            decoder: refn(5),
        };
        let scope = mem::MemoryScope {
            application: "parity".to_owned(),
            environment: "fixture".to_owned(),
            task: "task-1".to_owned(),
            frontier: refn(1),
            bindings: vec![],
            complete_for: vec![refn(32)],
            attestation: refn(33),
            value: Value::Null,
        };
        let frontier = mem::MemoryFrontier {
            application: "parity".to_owned(),
            sequence: 0,
            previous: None,
            mutation: None,
            status: "settled".to_owned(),
        };
        let procedure = mem::MemoryProcedure {
            id: "probe".to_owned(),
            schema: refn(34),
            manifest: refn(35),
            decoder: refn(5),
            dependencies: vec![],
            prerequisite: None,
            value: Value::Null,
        };
        let admission =
            |raw: &Value, receipt: &Value, observation: &ObservationInput| ObservationAdmission {
                observation: observation.clone(),
                scope: scope.clone(),
                frontier: frontier.clone(),
                procedure: procedure.clone(),
                raw: raw.clone(),
                receipt: receipt.clone(),
            };
        let claims =
            MemoryAdmission::decode_observation(&host, &admission(&raw, &receipt, &base)).unwrap();
        assert_eq!(claims, vec![parse_claim(&raw["claims"][0]).unwrap()]);
        // The contract binds the evidence kind, not a closed record shape:
        // lifecycle records carrying claims alongside other fields decode.
        let mut wide = raw.clone();
        wide["extra"] = json!("field");
        let wide_ref = hashed(wide.clone());
        let wide_receipt = json!({"contract": "algal.test-receipt.v1", "raw": wide_ref});
        let mut wide_observation = base.clone();
        wide_observation.raw = wide_ref;
        wide_observation.receipt = hashed(wide_receipt.clone());
        assert_eq!(
            MemoryAdmission::decode_observation(
                &host,
                &admission(&wide, &wide_receipt, &wide_observation),
            )
            .unwrap(),
            vec![parse_claim(&raw["claims"][0]).unwrap()],
        );
        // Undeclared decoder denied.
        let mut other = base.clone();
        other.decoder = refn(99);
        assert!(
            MemoryAdmission::decode_observation(&host, &admission(&raw, &receipt, &other)).is_err()
        );
        // Wrong raw contract denied.
        let bad_raw = json!({"contract": "algal.other.v1", "claims": []});
        assert!(
            MemoryAdmission::decode_observation(&host, &admission(&bad_raw, &receipt, &base))
                .is_err()
        );
        // Receipt binding the wrong raw digest denied.
        let bad_receipt = json!({"contract": "algal.test-receipt.v1", "raw": refn(98)});
        assert!(
            MemoryAdmission::decode_observation(&host, &admission(&raw, &bad_receipt, &base))
                .is_err()
        );
    }

    #[test]
    fn names_receipt_binding_lets_the_raw_record_name_its_receipt() {
        let tmp = tempdir().unwrap();
        let mut policy = policy_value();
        policy["decoders"] = json!([
            {"decoder": refn(5), "rawContract": "algal.application-migration.v1", "receiptContract": "algal.run.v1", "receiptBinding": "names-receipt"},
        ]);
        let host = PolicyHost::new(&policy, tmp.path()).unwrap();
        // The migration record names its producing run receipt; the
        // observation's receipt ref must be that same digest.
        let receipt = json!({"contract": "algal.run.v1", "outcome": "complete"});
        let receipt_ref = hashed(receipt.clone());
        let raw = json!({
            "contract": "algal.application-migration.v1", "receipt": receipt_ref,
            "claims": [{"relation": "supported-tool", "tuple": ["tool-a"], "polarity": "supported"}],
            "program": refn(50), "from": refn(51),
        });
        let raw_ref = hashed(raw.clone());
        let observation = ObservationInput {
            application: "parity".to_owned(),
            scope: refn(31),
            procedure: refn(32),
            raw: raw_ref.clone(),
            receipt: receipt_ref.clone(),
            decoder: refn(5),
        };
        let scope = mem::MemoryScope {
            application: "parity".to_owned(),
            environment: "fixture".to_owned(),
            task: "task-1".to_owned(),
            frontier: refn(1),
            bindings: vec![],
            complete_for: vec![refn(32)],
            attestation: refn(33),
            value: Value::Null,
        };
        let frontier = mem::MemoryFrontier {
            application: "parity".to_owned(),
            sequence: 0,
            previous: None,
            mutation: None,
            status: "settled".to_owned(),
        };
        let procedure = mem::MemoryProcedure {
            id: "migrate".to_owned(),
            schema: refn(34),
            manifest: refn(35),
            decoder: refn(5),
            dependencies: vec![],
            prerequisite: None,
            value: Value::Null,
        };
        let admission = |receipt: Value| ObservationAdmission {
            observation: observation.clone(),
            scope: scope.clone(),
            frontier: frontier.clone(),
            procedure: procedure.clone(),
            raw: raw.clone(),
            receipt,
        };
        assert_eq!(
            MemoryAdmission::decode_observation(&host, &admission(receipt.clone())).unwrap(),
            vec![parse_claim(&raw["claims"][0]).unwrap()],
        );
        // A raw naming a different digest than the observation's receipt ref
        // is denied — the record must name its own producing receipt.
        let mut stray = raw.clone();
        stray["receipt"] = json!(refn(99));
        let mut stray_observation = observation.clone();
        stray_observation.raw = hashed(stray.clone());
        let stray_admission = ObservationAdmission {
            observation: stray_observation,
            scope: scope.clone(),
            frontier: frontier.clone(),
            procedure: procedure.clone(),
            raw: stray,
            receipt: receipt.clone(),
        };
        assert!(MemoryAdmission::decode_observation(&host, &stray_admission).is_err());
        // The receipt contract is still enforced under names-receipt.
        let wrong_contract = json!({"contract": "algal.test-receipt.v1", "receipt": receipt_ref});
        assert!(MemoryAdmission::decode_observation(&host, &admission(wrong_contract)).is_err());
    }

    #[tokio::test]
    async fn delivery_appends_to_the_channel_idempotently() {
        let tmp = tempdir().unwrap();
        let host = PolicyHost::new(&policy_value(), tmp.path()).unwrap();
        let current = snapshot();
        let message = refn(40);
        let intent = deliver_intent(&message);
        let plan = crate::application::DispatchPlan::Delivery {
            recipient: mailbox(3),
            host_profile: refn(4),
        };
        let record = crate::application::Dispatch {
            application: "parity".to_owned(),
            intent: hashed(intent.value.clone()),
            source_state: current.digest.clone(),
            configuration_digest: refn(41),
            identity: refn(42),
            plan: plan.clone(),
            status: "started".to_owned(),
            result: None,
            reason: None,
            value: json!({
                "contract": "algal.application-dispatch.v1", "application": "parity",
                "intent": hashed(intent.value.clone()), "sourceState": current.digest,
                "configurationDigest": refn(41), "identity": refn(42),
                "plan": plan.value(), "status": "started", "result": null, "reason": null,
            }),
        };
        let context = DispatchContext {
            current: &current,
            snapshot: &current,
            intent: &intent,
            dispatch: &record,
        };
        let first = Dispatcher::dispatch(&host, &context).await.unwrap();
        assert_eq!(first["status"], json!("settled"));
        let second = Dispatcher::dispatch(&host, &context).await.unwrap();
        assert_eq!(first, second);
        let channel: Value = serde_json::from_str(
            &std::fs::read_to_string(tmp.path().join("investigate.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(channel["outcomes"], json!([message]));
        // Reconcile settles a recorded delivery; an absent one stays open.
        assert!(
            Dispatcher::reconcile(&host, &context)
                .await
                .unwrap()
                .unwrap()["status"]
                == json!("settled")
        );
        let other_intent = deliver_intent(&refn(43));
        let other = DispatchContext {
            current: &current,
            snapshot: &current,
            intent: &other_intent,
            dispatch: &record,
        };
        assert!(Dispatcher::reconcile(&host, &other).await.is_none());
    }

    #[tokio::test]
    async fn episode_dispatch_is_blocked_and_stays_open() {
        let tmp = tempdir().unwrap();
        let host = PolicyHost::new(&policy_value(), tmp.path()).unwrap();
        let current = snapshot();
        let intent = crate::application::parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "parity",
            "operation": refn(50), "ordinal": 0,
            "kind": "start-episode", "entrypoint": "run", "input": refn(51),
        }))
        .unwrap();
        let binding = crate::application::parse_episode_binding(&json!({
            "contract": "algal.application-episode.v1", "application": "parity",
            "intent": hashed(intent.value.clone()), "sourceState": current.digest,
            "revision": refn(52), "memory": refn(53), "epoch": 0,
            "entrypoint": "run", "manifest": refn(54), "arguments": refn(55),
            "process": "a-episode-parity", "maxGenerations": 4,
            "hostProfile": refn(56), "access": "observe",
        }))
        .unwrap();
        let plan = crate::application::DispatchPlan::Episode {
            binding: Box::new(binding),
        };
        let record = crate::application::Dispatch {
            application: "parity".to_owned(),
            intent: hashed(intent.value.clone()),
            source_state: current.digest.clone(),
            configuration_digest: refn(57),
            identity: refn(58),
            plan: plan.clone(),
            status: "started".to_owned(),
            result: None,
            reason: None,
            value: json!({
                "contract": "algal.application-dispatch.v1", "application": "parity",
                "intent": hashed(intent.value.clone()), "sourceState": current.digest,
                "configurationDigest": refn(57), "identity": refn(58),
                "plan": plan.value(), "status": "started", "result": null, "reason": null,
            }),
        };
        let context = DispatchContext {
            current: &current,
            snapshot: &current,
            intent: &intent,
            dispatch: &record,
        };
        let outcome = Dispatcher::dispatch(&host, &context).await.unwrap();
        assert_eq!(outcome["status"], json!("blocked"));
        // Episodes are never silently retried or settled by reconciliation.
        assert!(Dispatcher::reconcile(&host, &context).await.is_none());
    }
}
