/** Declarative application host policy: `algal.application-host.v1` admits a
 * single application with a pinned mutation frontier, attestation-checked
 * scopes, decoder policies that admit self-describing raw evidence
 * (`rawContract` records carrying claims) bound by receipts that name the
 * raw digest, route→delivery plans, and episode bindings that fence the
 * captured state exactly. Its dispatcher settles `deliver` intents by
 * appending the message digest to a durable channel file; episodes require
 * a domain dispatcher and are blocked honestly. Both runtimes implement the
 * same record so `scripts/application-parity.ts` exercises one policy. */
import { join } from "node:path";
import { applicationId, applicationJson, applicationList, applicationObject, applicationRef, applicationTag, getApplicationRecord } from "./application-contract";
import type { ApplicationAdmission, ApplicationDispatchContext, ApplicationDispatcher } from "./application";
import { applicationProcessName } from "./application";
import type { EpisodeExecutors } from "./application-episode";
import { dispatchApplicationEpisode, reconcileApplicationEpisode } from "./application-episode";
import type { MemoryAdmissionHost, MemoryClaim, MemoryQueryEngine } from "./application-memory";
import { ApplicationMemoryService, parseMemoryClaim } from "./application-memory";
import { admitApplicationActivation, parseApplicationEvaluationRequest, parseEvaluationPolicy } from "./application-adaptation";
import { parseApplicationRuntimeProfile, parseApplicationViewSpec } from "./application-view";
import { parseApplicationMigration, verifyApplicationMigration } from "./application-migration";
import { parseApplicationRestorationPolicy, verifyApplicationRestoration, type ApplicationRestorationPolicy } from "./application-restoration";
import { checkComparisonBinding, verifyApplicationComparison } from "./application-comparison";
import { verifyApplicationProposal } from "./application-proposal";
import { selectApplicationStrategy } from "./application-selection";
import { admitApplicationResearchActivation, parseApplicationResearchRequest, parseApplicationResearchPolicy, parseApplicationResearchCorpus, type ApplicationResearchVerifier } from "./application-research";
import { builtinRegistry } from "./registry";
import { compileOrganism } from "./graph";
import { hostDirectory, hostLease, hostRead, hostWrite } from "./host-state";
import { parseCapabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { replayStore, type Store } from "./store";
import { asObject, type JsonValue } from "./values";

const json = applicationJson;
const ref = (value: unknown): Digest => digestCanonical(json(value));
function boundedText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > max || value.includes("\0")) throw new Error("Invalid host policy text");
  return value;
}

export interface ApplicationHostPolicy {
  readonly application: string;
  readonly frontier: Digest;
  readonly hostProfile: Digest;
  readonly episodeAccess: "observe" | "external-write";
  readonly routes: ReadonlyMap<string, { recipient: string; hostProfile: Digest }>;
  readonly attestation: string | null;
  readonly decoders: ReadonlyMap<Digest, { rawContract: string; receiptContract: string; receiptBinding: "names-raw" | "names-receipt" }>;
  readonly value: JsonValue;
}

export function parseApplicationHostPolicy(input: unknown): ApplicationHostPolicy {
  const v = applicationObject(input, ["contract", "application", "frontier", "hostProfile", "episodeAccess", "routes", "attestation", "decoders"]);
  applicationTag(v.contract, "algal.application-host.v1");
  if (v.episodeAccess !== "observe" && v.episodeAccess !== "external-write") throw new Error("Invalid episode access");
  const routes = new Map<string, { recipient: string; hostProfile: Digest }>();
  let previousRoute = "";
  for (const row of applicationList(v.routes, 16, r => applicationObject(r, ["route", "recipient", "hostProfile"]))) {
    const route = applicationId(row.route);
    if (route <= previousRoute) throw new Error("Host routes must be sorted and unique");
    previousRoute = route;
    routes.set(route, { recipient: parseCapabilityHandle(row.recipient, "mailbox-send").handle, hostProfile: applicationRef(row.hostProfile) });
  }
  const decoders = new Map<Digest, { rawContract: string; receiptContract: string; receiptBinding: "names-raw" | "names-receipt" }>();
  let previousDecoder = "";
  for (const row of applicationList(v.decoders, 16, d => applicationObject(d, ["decoder", "rawContract", "receiptContract", "receiptBinding"]))) {
    const decoder = applicationRef(row.decoder);
    if (decoder <= previousDecoder) throw new Error("Host decoder policies must be sorted and unique");
    previousDecoder = decoder;
    if (row.receiptBinding !== "names-raw" && row.receiptBinding !== "names-receipt") throw new Error("Invalid receipt binding mode");
    decoders.set(decoder, { rawContract: boundedText(row.rawContract, 128), receiptContract: boundedText(row.receiptContract, 128), receiptBinding: row.receiptBinding });
  }
  return {
    application: applicationId(v.application), frontier: applicationRef(v.frontier), hostProfile: applicationRef(v.hostProfile),
    episodeAccess: v.episodeAccess, routes, attestation: v.attestation === null ? null : boundedText(v.attestation, 128), decoders,
    value: json(input),
  };
}

type ChannelDelivery = { identity: Digest; message: Digest };
/** V2 binds every durable completion to its exact dispatch identity. */
async function readChannel(channelsDir: string, route: string): Promise<ChannelDelivery[]> {
  await hostDirectory(channelsDir);
  const raw = await hostRead(join(channelsDir, `${route}.json`), 1_048_576);
  if (raw === undefined) return [];
  // Channel custody has its own 1 MiB bound; a full 4096-entry channel is
  // larger than the separate application-record limit.
  const v = asObject(raw, "channel");
  if (Object.keys(v).sort().join("\0") !== "contract\0outcomes\0route") throw new Error("Unknown or missing channel field");
  if (v.contract === "algal.host-channel.v1") throw new Error("Legacy channel lacks dispatch identities; explicit migration required");
  applicationTag(v.contract, "algal.host-channel.v2");
  if (v.route !== route) throw new Error("Channel route mismatch");
  const seen = new Set<Digest>();
  return applicationList(v.outcomes, 4096, row => {
    const value = applicationObject(row, ["identity", "message"]);
    const identity = applicationRef(value.identity), message = applicationRef(value.message);
    if (seen.has(identity)) throw new Error("Duplicate channel dispatch identity");
    seen.add(identity); return { identity, message };
  });
}
async function writeChannel(channelsDir: string, route: string, outcomes: ChannelDelivery[]): Promise<void> {
  await hostWrite(join(channelsDir, `${route}.json`), { contract: "algal.host-channel.v2", route, outcomes }, 1_048_576, false);
}

// Structural memory validation never invokes inference or invents an engine receipt.
const admissionOnlyEngine: MemoryQueryEngine = {
  identity: ref({ contract: "algal.application-validation-only.v1" }),
  async query() { throw new Error("Admission-only engine cannot execute queries"); },
  async verify() { throw new Error("Admission-only engine cannot verify queries"); },
  async settle() {},
};

/** Admission pins every policy field except the mutable frontier selection;
 * execution configuration still binds the complete policy record. */
export function createApplicationPolicyHost(input: unknown, options: { channelsDir: string; memoryEngine?: MemoryQueryEngine; restorationPolicy?: ApplicationRestorationPolicy; selectionEnvironment?: string; researchVerifier?: ApplicationResearchVerifier }): ApplicationAdmission & MemoryAdmissionHost & ApplicationDispatcher {
  const policy = parseApplicationHostPolicy(input);
  const researchVerifier = options.researchVerifier === undefined ? null : { identity: applicationRef(options.researchVerifier.identity), verify: options.researchVerifier.verify.bind(options.researchVerifier) };
  const restorationPolicy = options.restorationPolicy === undefined ? null : parseApplicationRestorationPolicy(options.restorationPolicy);
  if (restorationPolicy && restorationPolicy.application !== policy.application) throw new Error("Restoration policy belongs to another application");
  // The environment this host deploys into. It is host authority, outside
  // the admitted policy record like restorationPolicy: a stored selection
  // policy grants nothing until a host names the environment it serves.
  const selectionEnvironment = options.selectionEnvironment === undefined ? null : applicationId(options.selectionEnvironment);
  const { frontier: _frontier, ...authority } = asObject(policy.value, "host policy");
  const identity = ref({ contract: "algal.host-admission.v2", policy: ref(authority) });
  const configurationDigest = ref({ contract: "algal.host-dispatcher.v1", policy: ref(policy.value) });
  const channelsDir = options.channelsDir;
  const host: ApplicationAdmission & MemoryAdmissionHost & ApplicationDispatcher = {
    identity,
    configurationDigest,
    async admitCommit({ command, current, revision, store }) {
      if (command.application !== policy.application || revision.application !== policy.application) throw new Error("Host policy belongs to another application");
      const memory = new ApplicationMemoryService({ store, engine: admissionOnlyEngine, admission: host });
      const snapshot = await memory.validateForRevision(command.memory, revision);
      const value = (reference: Digest) => getApplicationRecord(store, reference, applicationJson);
      const profile = parseApplicationRuntimeProfile(await value(revision.runtimeProfile));
      parseApplicationViewSpec(await value(revision.views));
      const evaluationPolicy = parseEvaluationPolicy(await value(revision.evaluationPolicy));
      const researchMode = profile.policy === "sealed-research-evaluation.v1";
      if (researchMode) {
        if (!researchVerifier || !evaluationPolicy.research) throw new Error("Research runtime requires a pinned policy and explicit trusted verifier");
        const research = await getApplicationRecord(store, evaluationPolicy.research, parseApplicationResearchPolicy);
        if (research.evaluator !== researchVerifier.identity) throw new Error("Research verifier differs from the pinned evaluator");
        await value(research.evaluator); await value(research.harness);
        const corpus = await getApplicationRecord(store, research.corpus, parseApplicationResearchCorpus);
        if (corpus.cases.length > evaluationPolicy.maxCases || research.strategyEntrypoints.some(name => !revision.entrypoints.some(entry => entry.name === name))) throw new Error("Research policy is outside the admitted revision or case budget");
        if (command.kind === "migrate") throw new Error("Research runtime does not admit schema migration");
      } else if (evaluationPolicy.research !== undefined) throw new Error("Research policy requires an explicit sealed research runtime profile");
      if (current && command.kind !== "migrate" && command.memory !== current.state.memory && snapshot.previous !== current.state.memory) throw new Error("Memory update must preserve the current snapshot as its predecessor");
      for (const entry of revision.entrypoints) {
        const manifest = await store.getManifest(entry.manifest);
        if (!manifest) throw new Error("Entrypoint manifest is missing");
        await compileOrganism(manifest, builtinRegistry(), store);
      }
      for (const intent of command.intents) if (intent.kind === "start-episode") {
        if (!current || command.memory !== current.state.memory || command.revision !== current.state.revision) throw new Error("Execution must preserve the selected memory and revision");
        if (!options.memoryEngine) throw new Error("Episode admission requires an explicit memory query engine");
        const entry = revision.entrypoints.find(entry => entry.name === intent.entrypoint)!;
        const queries = new ApplicationMemoryService({ store: replayStore(store), engine: options.memoryEngine, admission: host });
        const derived = await queries.query(current.digest, entry.applicability);
        if (derived.derivation.status !== "supported" || !derived.derivation.verified || !command.evidence.includes(derived.ref)) throw new Error("Execution requires reproduced supported applicability evidence");
      }
      if (command.kind === "restore") {
        if (!current || !restorationPolicy) throw new Error("Host policy denies restoration");
        const checked = await verifyApplicationRestoration(store, { application: command.application, parentState: current.digest, candidateRevision: command.revision, evidence: command.evidence });
        if (checked.policy !== ref(restorationPolicy)) throw new Error("Restoration requires the explicit host policy");
      }
      if (command.kind === "propose") {
        if (!current) throw new Error("Proposal requires an incumbent");
        let replayed = 0;
        for (const evidence of command.evidence) {
          const record = await value(evidence);
          if (record && typeof record === "object" && !Array.isArray(record) && record.contract === "algal.application-proposal.v1") {
            await verifyApplicationProposal(store, evidence, current.digest, { fns: builtinRegistry() });
            replayed++;
          }
        }
        if (replayed !== 1) throw new Error("Proposal requires exactly one proposal record");
      }
      if (command.kind === "activate" || command.kind === "migrate" || command.kind === "restore") {
        if (!current) throw new Error("Revision change requires an incumbent");
        for (const evidence of command.evidence) {
          const record = await value(evidence);
          if (record && typeof record === "object" && !Array.isArray(record) && record.contract === "algal.application-comparison.v1") {
            const stored = await verifyApplicationComparison(store, evidence, current.digest, { fns: builtinRegistry() });
            checkComparisonBinding(stored, command.application, current.digest, revision);
          }
        }
        // Environment-keyed selection: a cited selection policy is replayed
        // in full and can only narrow the installed strategy to the one its
        // row for this host's environment selected. It never substitutes
        // for the accepted-evaluation coverage checks below.
        const policies: Digest[] = [];
        for (const evidence of command.evidence) {
          const record = await value(evidence);
          if (record && typeof record === "object" && !Array.isArray(record) && record.contract === "algal.application-selection-policy.v1") policies.push(evidence);
        }
        if (policies.length) {
          if (command.kind === "migrate") throw new Error("Selection policy cannot attach to a migration");
          if (selectionEnvironment === null) throw new Error("Host policy denies selection policy");
          if (policies.length !== 1) throw new Error("Selection requires exactly one selection policy");
          const selected = await selectApplicationStrategy(store, policies[0]!, selectionEnvironment, current.digest, { fns: builtinRegistry() });
          if (selected.policy.application !== command.application) throw new Error("Selection policy belongs to another application");
          const entry = revision.entrypoints.find(item => item.name === selected.policy.entrypoint);
          if (!entry || entry.manifest !== selected.manifest) throw new Error("Activation does not install the selected strategy");
        }
      }
      if (command.kind === "activate" || command.kind === "migrate") {
        if (!current) throw new Error("Revision change requires an incumbent");
        for (const entry of revision.entrypoints) {
          const old = current.revision.entrypoints.find(previous => previous.name === entry.name);
          if (old && (entry.maxGenerations !== old.maxGenerations || entry.capabilities.some(capability => !old.capabilities.includes(capability)))) throw new Error("Revision change widens an entrypoint's budget or authority");
        }
        const changed = revision.entrypoints.filter(entry => current.revision.entrypoints.find(old => old.name === entry.name)?.manifest !== entry.manifest);
        const accepted = new Set<string>();
        for (const evidence of command.evidence) {
          const record = await value(evidence);
          if (record && typeof record === "object" && !Array.isArray(record) && record.contract === "algal.application-research-evaluation.v1") {
            if (!researchMode || !researchVerifier) throw new Error("Host policy denies research evaluation");
            const checked = await admitApplicationResearchActivation(store, { evaluation: evidence, expectedState: current.digest, revision: command.revision }, { verifier: researchVerifier });
            const request = await getApplicationRecord(store, checked.evaluation.request, parseApplicationResearchRequest);
            accepted.add(request.entrypoint);
          }
          if (record && typeof record === "object" && !Array.isArray(record) && record.contract === "algal.application-evaluation.v1") {
            if (researchMode) throw new Error("Research activation cannot use pure-case evidence");
            const checked = await admitApplicationActivation(store, { evaluation: evidence, expectedState: current.digest, revision: command.revision }, { fns: builtinRegistry() });
            const request = await getApplicationRecord(store, checked.evaluation.request, parseApplicationEvaluationRequest);
            accepted.add(request.entrypoint);
          }
        }
        if (command.kind === "activate" && !accepted.size) throw new Error("Activation requires reproducibly accepted evaluation evidence");
        if (changed.some(entry => !accepted.has(entry.name))) throw new Error("Every changed entrypoint requires accepted evaluation evidence");
        if (command.kind === "migrate") {
          let verified = 0;
          for (const evidence of command.evidence) {
            const record = await value(evidence);
            if (record && typeof record === "object" && !Array.isArray(record) && record.contract === "algal.application-migration.v1") {
              await verifyApplicationMigration(store, parseApplicationMigration(record), snapshot.scope);
              verified++;
            }
          }
          if (!verified) throw new Error("Migration requires verified producing evidence");
        }
      }
    },
    async admitDispatch({ current, snapshot, intent, previousDispatch, store }) {
      if (snapshot.state.application !== policy.application || intent.application !== policy.application) throw new Error("Host policy belongs to another application");
      if (previousDispatch) return previousDispatch.plan;
      if (intent.kind === "deliver") {
        const route = policy.routes.get(intent.route);
        if (!route) throw new Error("Host policy denies this route");
        return { kind: "delivery" as const, recipient: route.recipient, hostProfile: route.hostProfile };
      }
      const entry = snapshot.revision.entrypoints.find(e => e.name === intent.entrypoint);
      if (!entry) throw new Error("Unknown episode entrypoint");
      if (snapshot.state.memory !== current.state.memory || snapshot.state.revision !== current.state.revision) throw new Error("Episode source memory or revision is no longer selected");
      if (!options.memoryEngine) throw new Error("Episode admission requires an explicit memory query engine");
      const queries = new ApplicationMemoryService({ store: replayStore(store), engine: options.memoryEngine, admission: host });
      const derived = await queries.query(snapshot.digest, entry.applicability);
      if (derived.derivation.status !== "supported" || !derived.derivation.verified) throw new Error("Episode applicability is not currently supported");
      const intentRef = digestCanonical(json(intent));
      return {
        kind: "episode" as const,
        binding: {
          contract: "algal.application-episode.v1" as const, application: intent.application, intent: intentRef,
          sourceState: snapshot.digest, revision: snapshot.state.revision, memory: snapshot.state.memory,
          epoch: snapshot.state.epoch, entrypoint: entry.name, manifest: entry.manifest, arguments: intent.input,
          process: applicationProcessName(intent.application, intentRef), maxGenerations: entry.maxGenerations,
          hostProfile: policy.hostProfile, access: policy.episodeAccess,
        },
      };
    },
    async currentFrontier(application) {
      if (application !== policy.application) throw new Error("Frontier requested for another application");
      return policy.frontier;
    },
    async validateScope({ scope, attestation }) {
      if (scope.application !== policy.application) throw new Error("Cross-application scope");
      if (policy.attestation !== null && asObject(attestation, "scope attestation")["contract"] !== policy.attestation) throw new Error("Scope attestation is not the admitted contract");
    },
    async decodeObservation({ observation, raw, receipt }): Promise<MemoryClaim[]> {
      const decoder = policy.decoders.get(observation.decoder);
      if (!decoder) throw new Error("Host policy denies this decoder");
      // The contract binds the evidence kind, not the record shape: lifecycle
      // records such as algal.application-migration.v1 legitimately carry
      // claims alongside their other fields.
      const bounded = asObject(raw, "raw evidence");
      if (bounded["contract"] !== decoder.rawContract) throw new Error("Raw evidence is not the admitted contract");
      const claims = applicationList(bounded["claims"], 32, parseMemoryClaim);
      const proof = asObject(receipt, "observation receipt");
      if (proof["contract"] !== decoder.receiptContract) throw new Error("Receipt does not bind the raw evidence");
      // Two custody shapes: "names-raw" receipts carry the raw digest
      // (probe evidence); "names-receipt" raws carry the producing receipt's
      // digest, so the observation's receipt ref must equal raw.receipt —
      // under CAS that is the same binding inverted (a migration record
      // cannot be named by the run receipt that produced it).
      if (decoder.receiptBinding === "names-raw") {
        if (proof["raw"] !== observation.raw) throw new Error("Receipt does not bind the raw evidence");
      } else if (bounded["receipt"] !== observation.receipt) {
        throw new Error("Receipt does not bind the raw evidence");
      }
      return claims;
    },
    async dispatch(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.application !== policy.application) throw new Error("Host policy belongs to another application");
      if (work.kind !== "deliver") return { status: "blocked" as const, reason: "Episode execution requires a domain dispatcher" };
      await hostLease(join(channelsDir, ".custody", work.route), `channel-${work.route}`, async () => {
        const outcomes = await readChannel(channelsDir, work.route);
        const prior = outcomes.find(outcome => outcome.identity === context.dispatch.identity);
        if (prior && prior.message !== work.message) throw new Error("Channel dispatch identity changed its message");
        if (!prior) {
          outcomes.push({ identity: context.dispatch.identity, message: work.message });
          if (outcomes.length > 4096) throw new Error("Channel bound exceeded");
          await writeChannel(channelsDir, work.route, outcomes);
        }
      });
      return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
    },
    async reconcile(context: ApplicationDispatchContext) {
      const work = context.intent;
      if (work.application !== policy.application) throw new Error("Host policy belongs to another application");
      if (work.kind !== "deliver") return undefined;
      const outcomes = await readChannel(channelsDir, work.route);
      const prior = outcomes.find(outcome => outcome.identity === context.dispatch.identity);
      if (!prior) return undefined;
      if (prior.message !== work.message) throw new Error("Channel dispatch identity changed its message");
      return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
    },
  };
  return host;
}

/** The composed application dispatcher — `DomainDispatcher` parity.
 * Deliveries settle through the policy host's durable channels;
 * `start-episode` intents run the admitted binding through the VM via
 * `dispatchApplicationEpisode`. The configuration digest binds the admitted
 * policy record, so a durable dispatch identifies exactly which dispatcher
 * contract executed it. Explicit episode reconciliation reuses matching durable
 * processes; their journal refuses unsafe retries of uncertain live writes. */
export function createApplicationDomainDispatcher(input: unknown, options: {
  channelsDir: string; store: Store; executors?: EpisodeExecutors;
}): ApplicationDispatcher {
  const policy = parseApplicationHostPolicy(input);
  const host = createApplicationPolicyHost(input, { channelsDir: options.channelsDir });
  return {
    configurationDigest: ref({ contract: "algal.application-dispatcher.v1", policy: ref(policy.value) }),
    dispatch: (context) =>
      context.dispatch.plan.kind === "episode"
        ? dispatchApplicationEpisode(context, options.executors ? { store: options.store, executors: options.executors } : { store: options.store })
        : host.dispatch(context),
    reconcile: async (context) => context.dispatch.plan.kind === "episode"
      ? reconcileApplicationEpisode(context, options.executors ? { store: options.store, executors: options.executors } : { store: options.store })
      : await host.reconcile?.(context),
  };
}
