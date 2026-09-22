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
        Admission, CommitContext, DispatchAdmission, DispatchContext, Dispatcher, TransitionKind,
        WorkIntent, parse_episode_binding, parse_migration, process_name,
    },
    application_adaptation::{
        admit_application_activation, parse_evaluation_policy, parse_evaluation_request,
    },
    application_memory::{
        self as mem, MemoryAdmission, MemoryService, ObservationAdmission, app_id, app_json,
        app_object, app_ref, bounded_text,
    },
    application_migration::verify_migration,
    application_view::{parse_runtime_profile, parse_view_spec},
    canonical::digest,
    capabilities::parse_capability_handle,
    contract::{list, object, text},
    effects::Host,
    graph::{self, Transports},
    lease,
};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
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

#[derive(Clone, Debug, PartialEq)]
struct ChannelDelivery {
    identity: String,
    message: String,
}

fn read_channel(channels_dir: &Path, route: &str) -> Result<Vec<ChannelDelivery>> {
    lease::directory(channels_dir)?;
    let raw = match lease::read(&channels_dir.join(format!("{route}.json")), 1_048_576)? {
        Some(raw) => raw,
        None => return Ok(Vec::new()),
    };
    // The channel has its own byte bound, independent of application records.
    let v = object(&raw)?;
    if v.len() != 3
        || !["contract", "route", "outcomes"]
            .iter()
            .all(|key| v.contains_key(*key))
    {
        return Err(Error::invalid("Unknown or missing channel field"));
    }
    if v["contract"] == "algal.host-channel.v1" {
        return Err(Error::invalid(
            "Legacy channel lacks dispatch identities; explicit migration required",
        ));
    }
    mem::app_tag(&v["contract"], "algal.host-channel.v2")?;
    if v["route"] != json!(route) {
        return Err(Error::invalid("Channel route mismatch"));
    }
    app_refs_channel(&v["outcomes"], 4096)
}

fn app_refs_channel(value: &Value, max: usize) -> Result<Vec<ChannelDelivery>> {
    let rows = list(value, max)?;
    let mut out = Vec::with_capacity(rows.len());
    let mut seen = BTreeSet::new();
    for row in rows {
        let row = app_object(row, &["identity", "message"])?;
        let identity = app_ref(&row["identity"])?.to_owned();
        if !seen.insert(identity.clone()) {
            return Err(Error::invalid("Duplicate channel dispatch identity"));
        }
        out.push(ChannelDelivery {
            identity,
            message: app_ref(&row["message"])?.to_owned(),
        });
    }
    Ok(out)
}

fn write_channel(channels_dir: &Path, route: &str, outcomes: &[ChannelDelivery]) -> Result<()> {
    lease::write(
        &channels_dir.join(format!("{route}.json")),
        &json!({"contract":"algal.host-channel.v2","route":route,"outcomes":outcomes.iter().map(|row| json!({"identity":row.identity,"message":row.message})).collect::<Vec<_>>()}),
        true,
    )
}

/// Admission pins all policy fields except frontier selection; dispatch
/// configuration continues to pin the complete policy record.
pub struct PolicyHost {
    pub policy: Policy,
    identity: String,
    configuration_digest: String,
    channels_dir: PathBuf,
    memory_engine: Option<mem::NativeEngine>,
}

impl PolicyHost {
    pub fn new(input: &Value, channels_dir: &Path) -> Result<Self> {
        let policy = parse_policy(input)?;
        let mut authority = policy.value.clone();
        authority
            .as_object_mut()
            .expect("parsed policy object")
            .remove("frontier");
        let identity = digest(&app_json(&json!({
            "contract": "algal.host-admission.v2", "policy": digest(&authority)?,
        }))?)?;
        let configuration_digest = digest(&app_json(&json!({
            "contract": "algal.host-dispatcher.v1", "policy": policy.reference,
        }))?)?;
        Ok(Self {
            policy,
            identity,
            configuration_digest,
            channels_dir: channels_dir.to_path_buf(),
            memory_engine: None,
        })
    }

    pub fn set_memory_engine(&mut self, engine: mem::NativeEngine) {
        self.memory_engine = Some(engine);
    }

    fn settle_delivery(&self, work_route: &str, message: &str, identity: &str) -> Result<Value> {
        let _lease = lease::OwnerLease::acquire(
            &self.channels_dir.join(".custody").join(work_route),
            &format!("channel-{work_route}"),
        )?;
        let mut outcomes = read_channel(&self.channels_dir, work_route)?;
        let prior = outcomes.iter().find(|row| row.identity == identity);
        if prior.is_some_and(|row| row.message != message) {
            return Err(Error::invalid(
                "Channel dispatch identity changed its message",
            ));
        }
        if prior.is_none() {
            outcomes.push(ChannelDelivery {
                identity: identity.to_owned(),
                message: message.to_owned(),
            });
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
    fn admit_commit(&self, context: &CommitContext) -> Result<()> {
        if context.command.application != self.policy.application
            || context.revision.application != self.policy.application
        {
            return Err(Error::invalid("Host policy belongs to another application"));
        }
        let memory = MemoryService {
            engine: &AdmissionOnlyEngine,
            admission: self,
        };
        let snapshot = memory.validate_for_revision(
            context.store,
            &context.command.memory,
            context.revision,
        )?;
        parse_runtime_profile(&mem::get_record(
            context.store,
            &context.revision.runtime_profile,
        )?)?;
        parse_view_spec(&mem::get_record(context.store, &context.revision.views)?)?;
        parse_evaluation_policy(&mem::get_record(
            context.store,
            &context.revision.evaluation_policy,
        )?)?;
        if let Some(current) = context.current
            && context.command.kind != TransitionKind::Migrate
            && context.command.memory != current.state.memory
            && snapshot.previous.as_deref() != Some(current.state.memory.as_str())
        {
            return Err(Error::invalid(
                "Memory update must preserve the current snapshot as its predecessor",
            ));
        }
        let mut overlay = context.store.overlay();
        for entry in &context.revision.entrypoints {
            graph::compile(
                overlay.manifest(&entry.manifest)?,
                &mut overlay,
                &Default::default(),
                &Transports::new(),
                0,
            )?;
        }
        Ok(())
    }
    fn verify_commit<'a>(
        &'a self,
        context: &'a CommitContext<'a>,
    ) -> Pin<Box<dyn Future<Output = Result<()>> + 'a>> {
        Box::pin(async move {
            self.admit_commit(context)?;
            for intent in &context.command.intents {
                if let crate::application::IntentSpec::StartEpisode { entrypoint, .. } = intent {
                    let current = context.current.ok_or_else(|| {
                        Error::invalid("Execution must preserve the selected memory and revision")
                    })?;
                    if context.command.memory != current.state.memory
                        || context.command.revision != current.state.revision
                    {
                        return Err(Error::invalid(
                            "Execution must preserve the selected memory and revision",
                        ));
                    }
                    let engine = self.memory_engine.as_ref().ok_or_else(|| {
                        Error::invalid("Episode admission requires an explicit memory query engine")
                    })?;
                    let entry = context
                        .revision
                        .entrypoints
                        .iter()
                        .find(|entry| &entry.name == entrypoint)
                        .ok_or_else(|| Error::invalid("Unknown episode entrypoint"))?;
                    let memory = MemoryService {
                        engine,
                        admission: self,
                    };
                    let (reference, derived) = memory.query(
                        &mut context.store.overlay(),
                        &current.digest,
                        &entry.applicability,
                    )?;
                    if derived.status != "supported"
                        || !derived.verified
                        || !context.command.evidence.contains(&reference)
                    {
                        return Err(Error::invalid(
                            "Execution requires reproduced supported applicability evidence",
                        ));
                    }
                }
            }
            if matches!(
                context.command.kind,
                TransitionKind::Activate | TransitionKind::Migrate
            ) {
                let current = context
                    .current
                    .ok_or_else(|| Error::invalid("Revision change requires an incumbent"))?;
                for entry in &context.revision.entrypoints {
                    if let Some(old) = current
                        .revision
                        .entrypoints
                        .iter()
                        .find(|previous| previous.name == entry.name)
                        && (entry.max_generations != old.max_generations
                            || entry
                                .capabilities
                                .iter()
                                .any(|capability| !old.capabilities.contains(capability)))
                    {
                        return Err(Error::invalid(
                            "Revision change widens an entrypoint's budget or authority",
                        ));
                    }
                }
                let mut accepted = std::collections::BTreeSet::new();
                for evidence in &context.command.evidence {
                    let record = mem::get_record(context.store, evidence)?;
                    if record["contract"] == "algal.application-evaluation.v1" {
                        let checked = admit_application_activation(context.store, &json!({
                            "evaluation": evidence, "expectedState": current.digest, "revision": context.command.revision,
                        }), &Host::default()).await?;
                        let request = parse_evaluation_request(&mem::get_record(
                            context.store,
                            app_ref(&checked["evaluation"]["request"])?,
                        )?)?;
                        accepted.insert(request.entrypoint);
                    }
                }
                if context.command.kind == TransitionKind::Activate && accepted.is_empty() {
                    return Err(Error::invalid(
                        "Activation requires reproducibly accepted evaluation evidence",
                    ));
                }
                for entry in &context.revision.entrypoints {
                    if current
                        .revision
                        .entrypoints
                        .iter()
                        .find(|old| old.name == entry.name)
                        .map(|old| old.manifest.as_str())
                        != Some(entry.manifest.as_str())
                        && !accepted.contains(&entry.name)
                    {
                        return Err(Error::invalid(
                            "Every changed entrypoint requires accepted evaluation evidence",
                        ));
                    }
                }
                if context.command.kind == TransitionKind::Migrate {
                    let snapshot = mem::parse_snapshot(&mem::get_record(
                        context.store,
                        &context.command.memory,
                    )?)?;
                    let mut verified = 0;
                    for evidence in &context.command.evidence {
                        let record = mem::get_record(context.store, evidence)?;
                        if record["contract"] == "algal.application-migration.v1" {
                            verify_migration(
                                context.store,
                                &parse_migration(&record)?,
                                &snapshot.scope,
                            )
                            .await?;
                            verified += 1;
                        }
                    }
                    if verified == 0 {
                        return Err(Error::invalid(
                            "Migration requires verified producing evidence",
                        ));
                    }
                }
            }
            Ok(())
        })
    }
    fn admit_dispatch(&self, context: &DispatchAdmission) -> Result<Value> {
        if context.snapshot.state.application != self.policy.application
            || context.intent.application != self.policy.application
        {
            return Err(Error::invalid("Host policy belongs to another application"));
        }
        if let Some(previous) = context.previous_dispatch {
            return Ok(previous.plan.value());
        }
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
                if snapshot.state.memory != context.current.state.memory
                    || snapshot.state.revision != context.current.state.revision
                {
                    return Err(Error::invalid(
                        "Episode source memory or revision is no longer selected",
                    ));
                }
                let engine = self.memory_engine.as_ref().ok_or_else(|| {
                    Error::invalid("Episode admission requires an explicit memory query engine")
                })?;
                let memory = MemoryService {
                    engine,
                    admission: self,
                };
                let (_, derived) = memory.query(
                    &mut context.store.overlay(),
                    &snapshot.digest,
                    &entry.applicability,
                )?;
                if derived.status != "supported" || !derived.verified {
                    return Err(Error::invalid(
                        "Episode applicability is not currently supported",
                    ));
                }
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
            if context.intent.application != self.policy.application {
                return Err(Error::invalid("Host policy belongs to another application"));
            }
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
            if context.intent.application != self.policy.application {
                return Some(Err(Error::invalid(
                    "Host policy belongs to another application",
                )));
            }
            match &context.intent.work {
                WorkIntent::Deliver { route, message } => {
                    match read_channel(&self.channels_dir, route) {
                        Ok(outcomes) => match outcomes
                            .iter()
                            .find(|row| row.identity == context.dispatch.identity)
                        {
                            Some(row) if &row.message == message => Some(Ok(json!({
                                "status": "settled",
                                "result": {"kind":"delivery","message":message,"idempotencyKey":context.dispatch.identity},
                            }))),
                            Some(_) => Some(Err(Error::invalid(
                                "Channel dispatch identity changed its message",
                            ))),
                            None => None,
                        },
                        Err(e) => Some(Err(e)),
                    }
                }
                WorkIntent::StartEpisode { .. } => None,
            }
        })
    }
}

/// Structural admission cannot accidentally invoke or attest an inference engine.
struct AdmissionOnlyEngine;
impl mem::MemoryEngine for AdmissionOnlyEngine {
    fn identity(&self) -> &str {
        "admission-only"
    }
    fn query(&self, _: &Value, _: &Value) -> mem::EngineResult {
        mem::EngineResult::Incomplete {
            status: "failed".into(),
            reason: "admission-only".into(),
            work: None,
        }
    }
    fn verify(&self, _: &Value, _: &Value, _: &Value) -> bool {
        false
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
        if matches!(
            context.dispatch.plan,
            crate::application::DispatchPlan::Episode { .. }
        ) {
            Box::pin(async move {
                Some(crate::application_episode::reconcile_episode(context, &self.dir).await)
            })
        } else {
            self.host.reconcile(context)
        }
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
    #[test]
    fn full_channel_remains_readable() {
        let tmp = tempdir().unwrap();
        let outcomes = (0..4096)
            .map(|i| ChannelDelivery {
                identity: hashed(json!(i)),
                message: hashed(json!("same")),
            })
            .collect::<Vec<_>>();
        write_channel(tmp.path(), "full", &outcomes).unwrap();
        assert_eq!(read_channel(tmp.path(), "full").unwrap(), outcomes);
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

    #[test]
    fn deliveries_bind_identity_and_legacy_channels_fail_closed() {
        let tmp = tempdir().unwrap();
        let host = PolicyHost::new(&policy_value(), tmp.path()).unwrap();
        let message = refn(70);
        host.settle_delivery("investigate", &message, &refn(71))
            .unwrap();
        host.settle_delivery("investigate", &message, &refn(72))
            .unwrap();
        host.settle_delivery("investigate", &message, &refn(71))
            .unwrap();
        let outcomes = read_channel(tmp.path(), "investigate").unwrap();
        assert_eq!(outcomes.len(), 2);
        assert_eq!(outcomes[0].identity, refn(71));
        assert_eq!(outcomes[1].identity, refn(72));
        assert!(
            host.settle_delivery("investigate", &refn(73), &refn(71))
                .is_err()
        );
        let legacy =
            json!({"contract":"algal.host-channel.v1","route":"investigate","outcomes":[message]});
        lease::write(&tmp.path().join("investigate.json"), &legacy, true).unwrap();
        assert!(
            host.settle_delivery("investigate", &message, &refn(74))
                .is_err()
        );
        assert_eq!(
            lease::read(&tmp.path().join("investigate.json"), 1_048_576).unwrap(),
            Some(legacy)
        );
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
            goals: None,
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
        let foreign = crate::application::parse_intent(&json!({
            "contract": "algal.application-intent.v1", "application": "foreign",
            "operation": refn(23), "ordinal": 0,
            "kind": "deliver", "route": "investigate", "message": refn(30),
        }))
        .unwrap();
        assert!(
            Admission::admit_dispatch(
                &host,
                &DispatchAdmission {
                    current: &current,
                    snapshot: &current,
                    intent: &foreign,
                    previous_dispatch: None,
                    store: &store,
                }
            )
            .is_err()
        );
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
        assert_eq!(
            channel["outcomes"],
            json!([{"identity":context.dispatch.identity,"message":message}])
        );
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
        assert!(Dispatcher::reconcile(&host, &other).await.unwrap().is_err());
        let mut other_record = record.clone();
        other_record.identity = refn(44);
        let same_message_new_identity = DispatchContext {
            current: &current,
            snapshot: &current,
            intent: &intent,
            dispatch: &other_record,
        };
        assert!(
            Dispatcher::reconcile(&host, &same_message_new_identity)
                .await
                .is_none()
        );
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
