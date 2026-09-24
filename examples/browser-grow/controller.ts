/** Browser-local evolution over the portable application lifecycle. No network,
 * model, dispatcher or arbitrary code is admitted by this controller. */
import { applicationJson, applicationObject, applicationRef, getApplicationRecord } from "../../src/application-contract";
import type { ApplicationSnapshot } from "../../src/application-core";
import { MemoryApplicationStorage, type ApplicationStorage } from "../../src/application-storage";
import { digestCanonical, type Digest } from "../../src/digest";
import { manifestToJson } from "../../src/contract";
import { APPLICATION, MarketingCore, exportEvidence, importEvidence, parseEvidence, verifyEvidence, type SurfaceEvidence } from "../malleable-site/core";
import { evaluateShadow, verifyShadow, type ShadowReport } from "../malleable-site/shadow";
import { parseConfig, parseProposal, parseSignalEvent, type SurfaceConfig, type SurfaceProposal, type SurfaceRevision, type SurfaceSignalEvent, type SurfaceSignals, type SurfaceView } from "../malleable-site/surface";
import { parseControls, type WorkbenchControls } from "../malleable-site/workbench-contract";
import { evaluateFit, GROW_POLICY, ruleConfig, type GrowFit } from "./policy";

const hash = (value: unknown): Digest => digestCanonical(applicationJson(value));
const JOURNAL_SLOT = "browser-grow-journal";
const MUTATION_LOCK = "browser-grow-controller";
const EXPORT_BYTES = 4_194_304;
export type GrowSource = "rules" | "model";
export type GrowProposalInput = { source: "rules" } | { source: "model"; config: unknown; rationale: string };
type CandidateRecord = {
  contract: "algal.browser-grow-candidate.v1"; parentState: Digest; source: GrowSource;
  proposal: Digest; preview: Digest; shadow: Digest; policy: Digest; fit: GrowFit; accepted: boolean;
};
type Journal = { contract: "algal.browser-grow-journal.v1"; evaluations: Digest[] };
export type GrowCandidate = {
  reference: Digest; parentState: Digest; source: GrowSource; proposal: SurfaceProposal;
  preview: Digest; shadow: { reference: Digest; report: ShadowReport }; fit: GrowFit; accepted: boolean; view: SurfaceView;
};
export type GrowHistoryItem = { state: Digest; sequence: number; revision: Digest; headline: string; kind: string; source: GrowSource | null };
export type GrowCapture = {
  head: Digest; sequence: number; revisionDigest: Digest; definition: SurfaceRevision;
  signals: SurfaceSignals; view: SurfaceView; controls: WorkbenchControls; controlsDigest: Digest;
  history: GrowHistoryItem[]; pending: GrowCandidate | null; candidates: GrowCandidate[];
  remainingStates: number; remainingCandidates: number; objective: string;
};
export type GrowBundle = { contract: "algal.browser-grow-export.v1"; claim: "content-integrity-and-local-policy-replay"; evidence: SurfaceEvidence; journal: Journal };
function journal(input: unknown): Journal {
  const value = applicationObject(input, ["contract", "evaluations"]);
  if (value.contract !== "algal.browser-grow-journal.v1" || !Array.isArray(value.evaluations) || value.evaluations.length > GROW_POLICY.maxCandidates) throw new Error("Invalid bounded browser evolution journal");
  const evaluations = value.evaluations.map(applicationRef);
  if (new Set(evaluations).size !== evaluations.length) throw new Error("Duplicate browser candidate reference");
  return { contract: value.contract, evaluations };
}
function record(input: unknown): CandidateRecord {
  const value = applicationObject(input, ["contract", "parentState", "source", "proposal", "preview", "shadow", "policy", "fit", "accepted"]);
  if (value.contract !== "algal.browser-grow-candidate.v1" || (value.source !== "rules" && value.source !== "model") || typeof value.accepted !== "boolean") throw new Error("Invalid browser candidate");
  // Fit is independently recomputed before it is exposed or grants adoption.
  return { contract: value.contract, parentState: applicationRef(value.parentState), source: value.source, proposal: applicationRef(value.proposal), preview: applicationRef(value.preview), shadow: applicationRef(value.shadow), policy: applicationRef(value.policy), fit: applicationJson(value.fit) as unknown as GrowFit, accepted: value.accepted };
}
function proposalInput(input: unknown): GrowProposalInput {
  const source = (input as { source?: unknown } | null)?.source;
  const value = applicationObject(input, source === "rules" ? ["source"] : ["source", "config", "rationale"]);
  if (value.source === "rules") return { source: "rules" };
  if (value.source !== "model" || typeof value.rationale !== "string") throw new Error("Unknown local proposal source");
  return { source: "model", config: parseConfig(value.config), rationale: value.rationale };
}
function emptyJournal(): Journal { return { contract: "algal.browser-grow-journal.v1", evaluations: [] }; }
function parseBundle(input: unknown): GrowBundle {
  const text = JSON.stringify(input);
  if (typeof text !== "string" || new TextEncoder().encode(text).length > EXPORT_BYTES) throw new Error("Browser workspace exceeds its 4 MiB export bound");
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error("Invalid browser workspace object");
  const v = input as Record<string, unknown>;
  if (Object.keys(v).sort().join("\0") !== ["contract", "claim", "evidence", "journal"].sort().join("\0")) throw new Error("Unknown browser workspace field");
  if (v.contract !== "algal.browser-grow-export.v1" || v.claim !== "content-integrity-and-local-policy-replay") throw new Error("Invalid browser workspace contract");
  return { contract: v.contract, claim: v.claim, evidence: parseEvidence(v.evidence, applicationRef((v.evidence as { head?: unknown } | null)?.head)), journal: journal(v.journal) };
}

export class BrowserGrowController {
  readonly host: MarketingCore;
  constructor(readonly storage: ApplicationStorage) { this.host = new MarketingCore(storage); }
  private mutate<T>(action: () => Promise<T>): Promise<T> { return this.storage.custody(MUTATION_LOCK, false, action); }
  private async readJournal(): Promise<Journal> {
    const retained = await this.storage.store.getSlot(JOURNAL_SLOT);
    if (retained === undefined) throw new Error("Missing retained browser evolution journal; it cannot be reconstructed by inspection");
    return journal(retained);
  }
  private async exact(expectedHead: Digest): Promise<ApplicationSnapshot> {
    const current = await this.host.current();
    if (current.digest !== applicationRef(expectedHead)) throw new Error("This workspace changed. Reload its current state before continuing.");
    await verifyEvidence(await exportEvidence(this.host), current.digest);
    await this.retained(await this.readJournal(), await this.host.service.history(APPLICATION));
    return current;
  }
  async initialize(): Promise<GrowCapture> {
    await this.mutate(async () => {
      if (await this.storage.readHead(APPLICATION) === undefined) {
        const operations = await this.storage.operationCount(APPLICATION), retained = await this.storage.store.getSlot(JOURNAL_SLOT);
        if (retained !== undefined && journal(retained).evaluations.length !== 0) throw new Error("Incomplete browser workspace is retained; initialization cannot replace it");
        if (retained === undefined) {
          if (operations !== 0) throw new Error("Incomplete browser genesis is missing its retained journal");
          // Initialize the empty index before genesis so a prepared first commit
          // can be reconciled without inventing a lost proposal history.
          await this.storage.store.setSlot(JOURNAL_SLOT, applicationJson(emptyJournal()));
        }
        if (operations === 0) await this.host.initialize();
        else await this.recoverPreparedGenesis(operations);
      }
    });
    return this.capture();
  }
  private async recoverPreparedGenesis(operations: number): Promise<void> {
    // The default genesis is derived elsewhere before touching retained bytes.
    // Unknown preparations and lost CAS evidence are never silently repaired.
    if (operations !== 1) throw new Error("Unknown incomplete browser operations require explicit recovery");
    const expectedHost = new MarketingCore(new MemoryApplicationStorage()), expected = await expectedHost.initialize();
    const t = expected.transition, expectedOperation = { contract: "algal.application-operation.v1", application: APPLICATION, operation: t.operation, request: t.request, transition: expected.state.transition, state: expected.digest };
    const operation = await this.storage.readOperation(APPLICATION, t.operation);
    if (operation === undefined || hash(operation) !== hash(expectedOperation)) throw new Error("Incomplete browser genesis does not match the exact default creation");
    const evidence = await exportEvidence(expectedHost);
    for (const row of evidence.records) {
      const value = row.kind === "manifest" ? await this.storage.store.getManifest(row.reference) : row.kind === "receipt" ? await this.storage.store.getReceipt(row.reference) : await this.storage.store.getValue(row.reference);
      if (value === undefined || hash(row.kind === "manifest" ? manifestToJson(value as Parameters<typeof manifestToJson>[0]) : value) !== row.reference) throw new Error("Incomplete browser genesis is missing retained evidence");
    }
    const recovered = await this.host.service.commit({ application: APPLICATION, operation: t.operation, kind: t.kind, expectedHead: t.previous, revision: t.revision, memory: t.memory, intents: [], evidence: t.evidence, causedBy: t.causedBy });
    if (recovered.digest !== expected.digest) throw new Error("Recovered browser genesis changed its identity");
  }
  private async candidate(reference: Digest): Promise<GrowCandidate> {
    const store = this.storage.store, r = await getApplicationRecord(store, reference, record);
    if (r.policy !== hash(GROW_POLICY) || hash(await getApplicationRecord(store, r.policy, applicationJson)) !== hash(GROW_POLICY)) throw new Error("Unadmitted browser evolution policy");
    const preview = await this.host.previewDetails(r.preview), proposal = await getApplicationRecord(store, r.proposal, parseProposal);
    if (preview.record.parentState !== r.parentState || preview.record.proposal !== r.proposal || hash(preview.proposal) !== r.proposal || proposal.source !== (r.source === "rules" ? "owner" : "model")) throw new Error("Candidate preview/source binding mismatch");
    const parent = await this.host.snapshot(r.parentState), signals = await this.host.signals(parent), definition = await this.host.revision(parent);
    if (r.source === "rules" && hash(proposal.config) !== hash(ruleConfig(signals))) throw new Error("Rule candidate differs from the declared local generator");
    const report = await verifyShadow(this.host, r.shadow);
    if (report.parentState !== r.parentState || report.proposal !== r.proposal || report.candidateRevision !== preview.record.candidateRevision) throw new Error("Candidate shadow binding mismatch");
    const fit = evaluateFit(definition.config, proposal.config, signals), accepted = fit.strictlyImproves && report.outcome === "pass";
    if (hash(fit) !== hash(r.fit) || accepted !== r.accepted) throw new Error("Candidate fit/admission replay mismatch");
    return { reference, parentState: r.parentState, source: r.source, proposal, preview: r.preview, shadow: { reference: r.shadow, report }, fit, accepted, view: preview.view };
  }
  private async retained(j: Journal, history: ApplicationSnapshot[]): Promise<GrowCandidate[]> {
    const candidates: GrowCandidate[] = [];
    const heads = new Set(history.map(row => row.digest));
    for (const reference of j.evaluations) {
      const candidate = await this.candidate(reference);
      if (!heads.has(candidate.parentState)) throw new Error("Candidate parent is outside this captured application history");
      candidates.push(candidate);
    }
    if (new Set(candidates.map(c => c.parentState)).size !== candidates.length) throw new Error("More than one proposal was retained for one explicit state");
    for (const row of history) if (row.transition.kind === "activate") {
      const match = candidates.find(c => c.parentState === row.state.previous && row.transition.evidence.length === 1 && c.preview === row.transition.evidence[0]);
      if (!match?.accepted) throw new Error("Activation lacks retained strict-improvement browser evaluation");
    }
    return candidates;
  }
  async capture(): Promise<GrowCapture> { return this.mutate(() => this.captureOwned()); }
  private async captureOwned(): Promise<GrowCapture> {
    const history = await this.host.service.history(APPLICATION), current = history.at(-1);
    if (!current) throw new Error("Initialize this browser workspace first");
    // Verify every retained memory/update proof in a separate volatile host
    // before a fresh view or signal could reproduce a lost historical receipt.
    await verifyEvidence(await exportEvidence(this.host), current.digest);
    // Candidate dependencies are checked before rendering can reproduce a lost receipt.
    const candidates = await this.retained(await this.readJournal(), history), rendered = await this.host.render(current, history);
    const definition = await this.host.revision(current), { controls } = await this.host.memoryDetails(current);
    const rows: GrowHistoryItem[] = [];
    for (const snapshot of history) {
      const revision = await this.host.revision(snapshot), candidate = candidates.find(c => snapshot.transition.kind === "activate" && c.preview === snapshot.transition.evidence[0]);
      rows.push({ state: snapshot.digest, sequence: snapshot.state.sequence, revision: hash(revision), headline: revision.config.headline, kind: snapshot.transition.kind, source: candidate?.source ?? null });
    }
    return { head: current.digest, sequence: current.state.sequence, revisionDigest: rendered.revision, definition, signals: rendered.signals, view: rendered.view, controls, controlsDigest: hash(controls), history: rows, pending: candidates.find(c => c.parentState === current.digest) ?? null, candidates, remainingStates: 64 - history.length, remainingCandidates: GROW_POLICY.maxCandidates - candidates.length, objective: GROW_POLICY.objective };
  }
  async signal(expectedHead: Digest, input: SurfaceSignalEvent): Promise<GrowCapture> {
    await this.mutate(async () => {
      const parent = await this.exact(expectedHead), event = parseSignalEvent(input), details = await this.host.memoryDetails(parent);
      const sequence = (details.cursors.find(row => row.source === "owner" && row.stream === "browser-context")?.sequence ?? 0) + 1;
      await this.host.signalEnvelope(expectedHead, { contract: "algal.marketing-signal-envelope.v1", source: "owner", stream: "browser-context", sequence, event });
    });
    return this.capture();
  }
  async propose(expectedHead: Digest, proposalValue: GrowProposalInput): Promise<GrowCandidate> {
    const input = proposalInput(proposalValue);
    return this.mutate(async () => {
      const parent = await this.exact(expectedHead), details = await this.host.memoryDetails(parent), j = await this.readJournal();
      if (details.controls.inferencePaused || details.controls.pinnedRevision !== null) throw new Error("Evolution is paused or the current revision is pinned");
      if (j.evaluations.length >= GROW_POLICY.maxCandidates) throw new Error("Browser candidate capacity reached; export this workspace");
      for (const reference of j.evaluations) if ((await getApplicationRecord(this.storage.store, reference, record)).parentState === expectedHead) throw new Error("This state already has its one retained proposal");
      const signals = await this.host.signals(parent), before = await this.host.revision(parent);
      const config = input.source === "rules" ? ruleConfig(signals) : parseConfig(input.config);
      const proposal = parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: hash(before), config, source: input.source === "rules" ? "owner" : "model", rationale: input.source === "rules" ? "Local rules propose wording and layout for your explicit audience and release objective. No model ran." : input.rationale });
      const preview = await this.host.preview(expectedHead, proposal), shadow = await evaluateShadow(this.host, expectedHead, proposal);
      const fit = evaluateFit(before.config, config, signals), candidate: CandidateRecord = { contract: "algal.browser-grow-candidate.v1", parentState: expectedHead, source: input.source, proposal: preview.record.proposal, preview: preview.reference, shadow: shadow.reference, policy: await this.storage.store.putValue(applicationJson(GROW_POLICY)), fit, accepted: fit.strictlyImproves && shadow.report.outcome === "pass" };
      const reference = await this.storage.store.putValue(applicationJson(candidate));
      await this.exact(expectedHead);
      await this.storage.store.setSlot(JOURNAL_SLOT, applicationJson({ ...j, evaluations: [...j.evaluations, reference] }));
      return this.candidate(reference);
    });
  }
  async adopt(expectedHead: Digest, reference: Digest): Promise<GrowCapture> {
    await this.mutate(async () => {
      const parent = await this.exact(expectedHead), j = await this.readJournal();
      if (!j.evaluations.includes(applicationRef(reference))) throw new Error("Unknown retained browser proposal");
      const candidate = await this.candidate(reference), { controls } = await this.host.memoryDetails(parent);
      if (candidate.parentState !== expectedHead) throw new Error("This proposal belongs to an earlier state");
      if (!candidate.accepted) throw new Error("This proposal did not strictly improve the declared fit and pass all guardrails");
      if (controls.inferencePaused || controls.pinnedRevision !== null || (candidate.source === "model" && controls.modelActivationPaused)) throw new Error("Evolution adoption is paused or pinned");
      await this.host.activate(candidate.preview, hash({ contract: "algal.browser-grow-adopt.v1", expectedHead, candidate: reference }));
    });
    return this.capture();
  }
  async restore(expectedHead: Digest, targetState: Digest): Promise<GrowCapture> {
    await this.mutate(async () => {
      const current = await this.exact(expectedHead), target = await this.host.snapshot(applicationRef(targetState));
      if (current.state.revision === target.state.revision || hash((await this.host.revision(current)).config) === hash((await this.host.revision(target)).config)) throw new Error("That behavior is already in use");
      await this.host.restore(expectedHead, targetState, hash({ contract: "algal.browser-grow-restore.v1", expectedHead, targetState }));
    });
    return this.capture();
  }
  async setControls(expectedHead: Digest, controlsInput: WorkbenchControls): Promise<GrowCapture> {
    await this.mutate(async () => {
      const parent = await this.exact(expectedHead), { controls } = await this.host.memoryDetails(parent), next = parseControls(controlsInput);
      if (hash(controls) === hash(next)) return;
      await this.host.setControls(expectedHead, hash(controls), next, hash({ contract: "algal.browser-grow-controls.v1", expectedHead, controls: next }));
    });
    return this.capture();
  }
  async exportBundle(): Promise<GrowBundle> {
    return this.mutate(async () => {
      const j = await this.readJournal(), history = await this.host.service.history(APPLICATION);
      const head = history.at(-1)?.digest;
      if (!head) throw new Error("Initialize this browser workspace first");
      await verifyEvidence(await exportEvidence(this.host), head);
      await this.retained(j, history);
      return parseBundle({ contract: "algal.browser-grow-export.v1", claim: "content-integrity-and-local-policy-replay", evidence: await exportEvidence(this.host, j.evaluations), journal: j });
    });
  }
  static async verifyBundle(input: unknown): Promise<{ ok: true; head: Digest; states: number; candidates: number }> {
    const bundle = parseBundle(input), storage = new MemoryApplicationStorage();
    if (!Array.isArray(bundle.evidence.records)) throw new Error("Invalid browser evidence records");
    const exportedCandidates = bundle.evidence.records.filter(row => row.value && typeof row.value === "object" && !Array.isArray(row.value) && row.value.contract === "algal.browser-grow-candidate.v1").map(row => row.reference).sort();
    if (hash(exportedCandidates) !== hash([...bundle.journal.evaluations].sort())) throw new Error("Browser journal omits or invents exported candidate records");
    await importEvidence(bundle.evidence, applicationRef(bundle.evidence.head), storage);
    const controller = new BrowserGrowController(storage), history = await controller.host.service.history(APPLICATION);
    await controller.retained(bundle.journal, history);
    return { ok: true, head: bundle.evidence.head, states: history.length, candidates: bundle.journal.evaluations.length };
  }
  static async importBundle(storage: ApplicationStorage, input: unknown): Promise<BrowserGrowController> {
    // Snapshot foreign input before the first await, then independently verify.
    const bundle = parseBundle(input);
    await BrowserGrowController.verifyBundle(bundle);
    return storage.custody(MUTATION_LOCK, false, async () => {
      if (await storage.store.getSlot(JOURNAL_SLOT) !== undefined) throw new Error("Import requires a fresh browser workspace");
      await importEvidence(bundle.evidence, bundle.evidence.head, storage);
      await storage.store.setSlot(JOURNAL_SLOT, applicationJson(bundle.journal));
      return new BrowserGrowController(storage);
    });
  }
}

export { GROW_POLICY, evaluateFit, ruleConfig } from "./policy";
export type { SurfaceConfig, SurfaceSignalEvent, WorkbenchControls };
