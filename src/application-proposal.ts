/** Case-pure, bounded, replayable candidate generation for one application
 * entrypoint. A `propose` transition retains `algal.application-proposal.v1`:
 * the evidence that a generator entrypoint of the CURRENT revision was run
 * under the incumbent evaluation policy and emitted candidate manifests for a
 * target entrypoint. Every candidate becomes an ordinary child revision that
 * differs from the incumbent only at the target manifest, so a candidate can
 * never widen authority. The record grants nothing: revision, memory and
 * epoch are unchanged, no intents are created, and a candidate stays an
 * unselected CAS value until an ordinary `activate` carries its reproduced
 * accepted evaluation. Generation failures are retained as evidence, never
 * silently dropped, and the receipt replays bit-for-bit under `verify`. */
import {
  applicationId, applicationInt, applicationJson, applicationList, applicationObject,
  applicationRef, applicationRefs, applicationTag, getApplicationRecord, nullableApplicationRef,
  parseApplicationRevision, parseApplicationState, putApplicationRecord,
  type ApplicationRevision, type ApplicationState,
} from "./application-contract";
import {
  loadRevision, parseEvaluationPolicy, pureManifest,
  type AdaptationRuntime, type EvaluationPolicy,
} from "./application-adaptation";
import { COMPARISON_LIMITS } from "./application-comparison";
import type { ApplicationCore, ApplicationSnapshot } from "./application-core";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { parseRunReceipt, runOrganism, type RunReceipt } from "./run";
import type { Store } from "./store";
import { canonicalize, type JsonValue } from "./values";
import { verifyReceipt } from "./verify";

export const PROPOSAL_LIMITS = Object.freeze({ candidates: COMPARISON_LIMITS.results, reasons: 16, reasonBytes: 256 });

export type ApplicationProposalRequest = {
  contract: "algal.application-proposal-request.v1";
  application: string;
  /** Binds the exact head; the generator is that state's revision's entrypoint. */
  parentState: Digest;
  /** Entrypoint of the incumbent revision that emits candidate manifests. */
  generator: string;
  /** Entrypoint whose manifest the candidates replace. */
  target: string;
  /** Digest of a CAS object keyed by the generator's interface input names. */
  arguments: Digest;
  /** Generator interface output carrying the emitted manifest list. */
  output: string;
  /** Must equal the incumbent revision's evaluation policy. */
  policy: Digest;
  /** Optional environment label; absent on older records and preserved when absent. */
  environment?: string;
};
export type ApplicationProposalCandidate = { manifest: Digest; revision: Digest };
export type ApplicationProposalStatus = "generated" | "failed";
export type ApplicationProposal = {
  contract: "algal.application-proposal.v1";
  request: Digest;
  application: string;
  parentState: Digest;
  /** The incumbent revision (= parent state's revision). */
  revision: Digest;
  generator: string;
  target: string;
  generatorManifest: Digest;
  /** The `algal.run.v1` receipt in the runs store. */
  receipt: Digest;
  status: ApplicationProposalStatus;
  /** Empty when generated; bounded failure reasons otherwise. */
  reasons: string[];
  /** Sorted by revision, unique manifests and revisions; empty iff failed. */
  candidates: ApplicationProposalCandidate[];
  work: { steps: number; agentCalls: number; units: number };
};
export type ProposeApplicationRevisionInput = {
  application: string; operation: Digest; expectedHead: Digest;
  generator: string; target: string; arguments: Digest; output: string; policy: Digest;
  environment?: string; evidence?: Digest[]; causedBy?: Digest | null;
};
export type ProposedApplicationRevision = { snapshot: ApplicationSnapshot; proposal: Digest; status: ApplicationProposalStatus; candidates: ApplicationProposalCandidate[] };

const hash = (value: unknown): Digest => digestCanonical(applicationJson(value));
function reason(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > PROPOSAL_LIMITS.reasonBytes || value.includes("\0")) throw new Error("Proposal reason must be bounded text");
  return value;
}

export function parseProposalRequest(input: unknown): ApplicationProposalRequest {
  const hasEnvironment = !!input && typeof input === "object" && Object.hasOwn(input, "environment");
  const v = applicationObject(input, ["contract", "application", "parentState", "generator", "target", "arguments", "output", "policy", ...(hasEnvironment ? ["environment"] : [])]);
  applicationTag(v.contract, "algal.application-proposal-request.v1");
  return {
    contract: "algal.application-proposal-request.v1", application: applicationId(v.application), parentState: applicationRef(v.parentState),
    generator: applicationId(v.generator), target: applicationId(v.target), arguments: applicationRef(v.arguments), output: applicationId(v.output), policy: applicationRef(v.policy),
    ...(hasEnvironment ? { environment: applicationId(v.environment) } : {}),
  };
}

export function parseApplicationProposal(input: unknown): ApplicationProposal {
  const v = applicationObject(input, ["contract", "request", "application", "parentState", "revision", "generator", "target", "generatorManifest", "receipt", "status", "reasons", "candidates", "work"]);
  applicationTag(v.contract, "algal.application-proposal.v1");
  if (v.status !== "generated" && v.status !== "failed") throw new Error("Invalid proposal status");
  const reasons = applicationList(v.reasons, PROPOSAL_LIMITS.reasons, reason);
  const candidates = applicationList(v.candidates, PROPOSAL_LIMITS.candidates, row => {
    const c = applicationObject(row, ["manifest", "revision"]);
    return { manifest: applicationRef(c.manifest), revision: applicationRef(c.revision) };
  });
  if (candidates.some((c, i) => i > 0 && c.revision <= candidates[i - 1]!.revision)) throw new Error("Proposal candidates must be sorted by revision");
  if (new Set(candidates.map(c => c.manifest)).size !== candidates.length) throw new Error("Proposal candidate manifests must be unique");
  if ((v.status === "failed") !== (candidates.length === 0) || (v.status === "failed") !== (reasons.length > 0)) throw new Error("Proposal status does not match its candidates and reasons");
  const w = applicationObject(v.work, ["steps", "agentCalls", "units"]);
  const work = { steps: applicationInt(w.steps, 0, Number.MAX_SAFE_INTEGER), agentCalls: applicationInt(w.agentCalls, 0, Number.MAX_SAFE_INTEGER), units: applicationInt(w.units, 0, Number.MAX_SAFE_INTEGER) };
  return {
    contract: "algal.application-proposal.v1", request: applicationRef(v.request), application: applicationId(v.application), parentState: applicationRef(v.parentState),
    revision: applicationRef(v.revision), generator: applicationId(v.generator), target: applicationId(v.target), generatorManifest: applicationRef(v.generatorManifest),
    receipt: applicationRef(v.receipt), status: v.status, reasons, candidates, work,
  };
}

type Loaded = { revision: ApplicationRevision; manifests: Map<string, OrganismManifest> };
type Bound = {
  request: ApplicationProposalRequest; state: ApplicationState; incumbent: Loaded; policy: EvaluationPolicy;
  generatorEntry: ApplicationRevision["entrypoints"][number]; targetEntry: ApplicationRevision["entrypoints"][number];
  generatorManifest: OrganismManifest; source: { cell: string; port: string }; args: Record<string, Record<string, JsonValue>>;
};

function entry(revision: ApplicationRevision, name: string): ApplicationRevision["entrypoints"][number] {
  const value = revision.entrypoints.find(item => item.name === name);
  if (!value) throw new Error(`Unknown application entrypoint ${name}`);
  return value;
}

/** Resolves and checks everything the request binds, before any run. */
async function bindRequest(store: Store, request: ApplicationProposalRequest, runtime: AdaptationRuntime): Promise<Bound> {
  const state = await getApplicationRecord(store, request.parentState, parseApplicationState);
  if (state.application !== request.application) throw new Error("Proposal request belongs to another application");
  const incumbent = await loadRevision(store, state.revision);
  if (request.policy !== incumbent.revision.evaluationPolicy) throw new Error("Proposal policy is not bound to the incumbent revision");
  const policy = parseEvaluationPolicy(await getApplicationRecord(store, request.policy, applicationJson));
  const generatorEntry = entry(incumbent.revision, request.generator), targetEntry = entry(incumbent.revision, request.target);
  const generatorManifest = incumbent.manifests.get(request.generator)!;
  pureManifest(generatorManifest, runtime.fns);
  const iface = generatorManifest.interface;
  if (!iface) throw new Error("Generator entrypoint must declare an interface");
  const source = iface.outputs[request.output];
  if (!source) throw new Error(`Generator entrypoint has no interface output "${request.output}"`);
  const provided = await getApplicationRecord(store, request.arguments, applicationJson);
  if (!provided || typeof provided !== "object" || Array.isArray(provided)) throw new Error("Proposal arguments must be an object keyed by interface input");
  const args: Record<string, Record<string, JsonValue>> = Object.create(null) as Record<string, Record<string, JsonValue>>;
  for (const [name, value] of Object.entries(provided)) {
    const target = iface.inputs[name];
    if (!target) throw new Error(`Generator entrypoint has no interface input "${name}"`);
    (args[target.cell] ??= Object.create(null) as Record<string, JsonValue>)[target.port] = value;
  }
  return { request, state, incumbent, policy, generatorEntry, targetEntry, generatorManifest, source: { cell: source.cell, port: source.port }, args };
}

type Derived = { status: ApplicationProposalStatus; reasons: string[]; candidates: { manifest: OrganismManifest; manifestRef: Digest; revision: ApplicationRevision; revisionRef: Digest }[] };

/** Pure derivation of the verdict from the receipt: the same function runs
 * at production and at verification, so the stored record is exactly what
 * replay reproduces. A bad candidate fails the whole proposal — the receipt
 * and reasons are retained, the candidate list is not. */
function deriveCandidates(bound: Bound, receipt: RunReceipt, fns: AdaptationRuntime["fns"]): Derived {
  const reasons: string[] = [];
  const note = (why: string): void => { if (!reasons.includes(why)) reasons.push(why); };
  const candidates: Derived["candidates"] = [];
  if (receipt.outcome !== "complete") note(`generator-${receipt.outcome}`);
  if (receipt.work.units > bound.policy.maxWork || receipt.work.agentCalls > bound.policy.maxModelCalls) note("budget-exhausted");
  if (receipt.outcome === "complete") {
    const emitted = receipt.cells[bound.source.cell]?.outputs?.[bound.source.port];
    if (!Array.isArray(emitted) || emitted.length === 0) note("no-candidates");
    else if (emitted.length > PROPOSAL_LIMITS.candidates) note("candidate-bound");
    else {
      const seen = new Set<Digest>([bound.targetEntry.manifest]);
      for (const value of emitted) {
        let manifest: OrganismManifest;
        try { manifest = parseOrganismManifest(value); } catch { note("invalid-candidate"); continue; }
        try { pureManifest(manifest, fns); } catch { note("impure-candidate"); continue; }
        const manifestRef = digestCanonical(manifestToJson(manifest));
        if (seen.has(manifestRef)) { note("duplicate-candidate"); continue; }
        seen.add(manifestRef);
        const revision = parseApplicationRevision({
          ...bound.incumbent.revision, parent: bound.state.revision,
          entrypoints: bound.incumbent.revision.entrypoints.map(e => e.name === bound.targetEntry.name ? { ...e, manifest: manifestRef } : e),
        });
        candidates.push({ manifest, manifestRef, revision, revisionRef: hash(revision) });
      }
    }
  }
  if (reasons.length) return { status: "failed", reasons, candidates: [] };
  candidates.sort((a, b) => (a.revisionRef < b.revisionRef ? -1 : a.revisionRef > b.revisionRef ? 1 : 0));
  return { status: "generated", reasons: [], candidates };
}

function assemble(bound: Bound, requestRef: Digest, receiptRef: Digest, receipt: RunReceipt, derived: Derived): ApplicationProposal {
  return {
    contract: "algal.application-proposal.v1", request: requestRef, application: bound.request.application, parentState: bound.request.parentState,
    revision: bound.state.revision, generator: bound.request.generator, target: bound.request.target, generatorManifest: bound.generatorEntry.manifest,
    receipt: receiptRef, status: derived.status, reasons: derived.reasons,
    candidates: derived.candidates.map(c => ({ manifest: c.manifestRef, revision: c.revisionRef })),
    work: { steps: receipt.work.steps, agentCalls: receipt.work.agentCalls, units: receipt.work.units },
  };
}

/** Runs the generator entrypoint case-pure under the incumbent evaluation
 * policy, retains the receipt, publishes every candidate manifest and child
 * revision, and stores the proposal record. */
export async function produceApplicationProposal(store: Store, input: unknown, runtime: AdaptationRuntime): Promise<{ proposalRef: Digest; proposal: ApplicationProposal }> {
  const request = parseProposalRequest(input);
  const requestRef = await putApplicationRecord(store, request);
  const bound = await bindRequest(store, request, runtime);
  const receipt = await runOrganism({ manifest: bound.generatorManifest, args: bound.args, fns: runtime.fns, store, executors: runtime.executors ?? [] });
  const receiptRef = await store.putReceipt(receipt as unknown as JsonValue);
  const derived = deriveCandidates(bound, receipt, runtime.fns);
  for (const candidate of derived.candidates) {
    if (await store.putManifest(candidate.manifest) !== candidate.manifestRef) throw new Error("Candidate manifest identity differs");
    if (await putApplicationRecord(store, candidate.revision) !== candidate.revisionRef) throw new Error("Candidate revision identity differs");
  }
  const proposal = assemble(bound, requestRef, receiptRef, receipt, derived);
  return { proposalRef: await putApplicationRecord(store, proposal), proposal };
}

/** Full replay: the stored proposal must be reproducible from its request,
 * the retained receipt must replay bit-for-bit against the generator
 * manifest and derived arguments, and every published candidate must
 * resolve. Nothing is written. */
export async function verifyApplicationProposal(store: Store, proposalRef: Digest, expectedParentState: Digest, runtime: AdaptationRuntime): Promise<ApplicationProposal> {
  const stored = await getApplicationRecord(store, proposalRef, parseApplicationProposal);
  const request = await getApplicationRecord(store, stored.request, parseProposalRequest);
  if (stored.parentState !== request.parentState || stored.application !== request.application || stored.generator !== request.generator || stored.target !== request.target) throw new Error("Proposal fields are not bound to its request");
  if (request.parentState !== applicationRef(expectedParentState)) throw new Error("Proposal parent state is stale");
  const bound = await bindRequest(store, request, runtime);
  if (stored.revision !== bound.state.revision || stored.generatorManifest !== bound.generatorEntry.manifest) throw new Error("Proposal fields are not bound to its request");
  const receiptValue = await store.getReceipt(stored.receipt);
  if (receiptValue === undefined || digestCanonical(receiptValue) !== stored.receipt) throw new Error("Missing or changed proposal receipt");
  const receipt = parseRunReceipt(receiptValue);
  if (receipt.manifestDigest !== bound.generatorEntry.manifest || canonicalize(receipt.args) !== canonicalize(bound.args)) throw new Error("Proposal receipt does not bind its generator and arguments");
  const verified = await verifyReceipt(receiptValue, manifestToJson(bound.generatorManifest), store, runtime.fns);
  if (!verified.ok) throw new Error(`Proposal receipt does not replay: ${verified.mismatches.join("; ")}`);
  const recomputed = assemble(bound, stored.request, stored.receipt, receipt, deriveCandidates(bound, receipt, runtime.fns));
  if (canonicalize(applicationJson(recomputed)) !== canonicalize(applicationJson(stored))) throw new Error("Proposal is not reproducible from its evidence");
  for (const candidate of stored.candidates) {
    await getApplicationRecord(store, candidate.revision, parseApplicationRevision);
    if (!await store.getManifest(candidate.manifest)) throw new Error("Proposal candidate manifest is missing");
  }
  return stored;
}

/** Structural binding, independent of host authority: runs on commit and
 * retained-history inspection, custom trusted hosts included. Exactly one
 * proposal record must name this application, parent state and incumbent
 * revision, and every candidate must be a child of the incumbent differing
 * only at the target entrypoint's manifest. No replay happens here. */
export async function verifyApplicationProposalBinding(store: Store, input: { application: string; parentState: Digest; revision: Digest; evidence: Digest[] }): Promise<ApplicationProposal> {
  const matches: ApplicationProposal[] = [];
  for (const reference of input.evidence) {
    const value = await getApplicationRecord(store, reference, applicationJson);
    if (value && typeof value === "object" && !Array.isArray(value) && value.contract === "algal.application-proposal.v1") matches.push(parseApplicationProposal(value));
  }
  if (matches.length !== 1) throw new Error("Proposal requires exactly one proposal record");
  const record = matches[0]!;
  if (record.application !== input.application || record.parentState !== input.parentState || record.revision !== input.revision) throw new Error("Proposal evidence does not bind this transition");
  const incumbent = await getApplicationRecord(store, input.revision, parseApplicationRevision);
  const target = entry(incumbent, record.target);
  entry(incumbent, record.generator);
  for (const candidate of record.candidates) {
    const revision = await getApplicationRecord(store, candidate.revision, parseApplicationRevision);
    const installed = revision.entrypoints.find(e => e.name === target.name);
    if (revision.parent !== input.revision || !installed || installed.manifest !== candidate.manifest) throw new Error("Proposal candidate is not a child of the incumbent at the target manifest");
    const folded = { ...revision, parent: incumbent.parent, entrypoints: revision.entrypoints.map(e => e.name === target.name ? { ...e, manifest: target.manifest } : e) };
    if (hash(folded) !== input.revision) throw new Error("Proposal candidate must differ from the incumbent only at the target manifest");
  }
  return record;
}

/** Produces the proposal and commits the `propose` transition: revision,
 * memory and epoch unchanged, no intents, the proposal as evidence. */
export async function proposeApplicationRevision(lifecycle: ApplicationCore, input: ProposeApplicationRevisionInput, runtime: AdaptationRuntime): Promise<ProposedApplicationRevision> {
  const optional = ["environment", "evidence", "causedBy"].filter(key => Object.hasOwn(input, key));
  const v = applicationObject(input, ["application", "operation", "expectedHead", "generator", "target", "arguments", "output", "policy", ...optional]);
  const application = applicationId(v.application), operation = applicationRef(v.operation), expectedHead = applicationRef(v.expectedHead);
  const evidence = applicationRefs(v.evidence ?? [], 15), causedBy = nullableApplicationRef(v.causedBy ?? null);
  const request = parseProposalRequest({
    contract: "algal.application-proposal-request.v1", application, parentState: expectedHead, generator: v.generator, target: v.target,
    arguments: v.arguments, output: v.output, policy: v.policy, ...(Object.hasOwn(input, "environment") ? { environment: v.environment } : {}),
  });
  const produced = await produceApplicationProposal(lifecycle.store, request, runtime);
  const current = await getApplicationRecord(lifecycle.store, expectedHead, parseApplicationState);
  const snapshot = await lifecycle.commit({ application, operation, kind: "propose", expectedHead, revision: current.revision, memory: current.memory, intents: [], evidence: [...new Set([...evidence, produced.proposalRef])].sort(), causedBy });
  return { snapshot, proposal: produced.proposalRef, status: produced.proposal.status, candidates: produced.proposal.candidates };
}
