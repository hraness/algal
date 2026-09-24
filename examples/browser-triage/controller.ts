/** Browser task actions use the portable triage core. Preparations save their
 * exact target records before publication, so recovery never reruns a command. */
import { applicationJson, getApplicationRecord, parseApplicationRevision, parseApplicationState, parseApplicationTransition } from "../../src/application-contract";
import type { ApplicationSnapshot } from "../../src/application-core";
import { MemoryApplicationStorage, type ApplicationStorage } from "../../src/application-storage";
import type { Digest } from "../../src/digest";
import { TriageCore, hash, parseTransfer, verifyTransfer, type TriageEvaluationDetails } from "../local-triage/core";
import { DEFAULT_SESSION, MAX_STATES, id, object, reference, parseAction, parseCommand, parseProposal, parseSession, type Action, type Capture, type Config, type Proposal, type Session, type SessionLoad, type Transfer } from "../local-triage/contract";

export const MAX_EVALUATIONS = 16;
type Request = { kind: "create" } | { kind: "fork"; source: Digest } |
  { kind: "act"; expectedHead: Digest; action: Action } |
  { kind: "propose"; proposal: Proposal } |
  { kind: "adopt"; expectedHead: Digest; evaluation: Digest };
type Prepared = {
  contract: "algal.browser-triage-prepared.v1"; request: Request;
  expectedHead: Digest | null; resultHead: Digest; operation: Digest | null;
  transfer: Digest; evaluation: Digest | null;
};
type Initialization = Extract<Request, { kind: "create" | "fork" }>;
type Journal = { contract: "algal.browser-triage-journal.v1"; initialization: Initialization; completed: Digest[]; evaluations: Digest[]; pending: Digest | null };
export type BrowserTriageCapture = Capture & {
  sessionState: SessionLoad; pending: TriageEvaluationDetails | null;
  recovery: { reference: Digest; kind: Request["kind"]; expectedHead: Digest | null } | null;
  remainingEvaluations: number; history: { head: Digest; sequence: number; kind: string }[];
};
export type WorkflowInput = { config: Config; schemaVersion: 1 | 2; rationale: string };
type CheckedJournal = { journal: Journal; history: ApplicationSnapshot[]; candidates: TriageEvaluationDetails[] };
/** One newly read private source for a read phase, the saved journal that
 * chose its candidate roots, and the completed candidates proven inside it. */
type Source = { core: TriageCore; journal: Journal; proven: ReadonlyMap<Digest, TriageEvaluationDetails> };
const same = (a: unknown, b: unknown) => hash(a) === hash(b);
const emptyJournal = (initialization: Initialization = { kind: "create" }): Journal => ({ contract: "algal.browser-triage-journal.v1", initialization, completed: [], evaluations: [], pending: null });
function request(input: unknown): Request {
  const kind = (input as { kind?: unknown } | null)?.kind;
  if (kind === "create") { object(input, ["kind"]); return { kind }; }
  if (kind === "fork") { const v = object(input, ["kind", "source"]); return { kind, source: reference(v.source) }; }
  if (kind === "act") { const v = object(input, ["kind", "expectedHead", "action"]); return { kind, expectedHead: reference(v.expectedHead), action: parseAction(v.action) }; }
  if (kind === "adopt") { const v = object(input, ["kind", "expectedHead", "evaluation"]); return { kind, expectedHead: reference(v.expectedHead), evaluation: reference(v.evaluation) }; }
  if (kind === "propose") {
    const v = object(input, ["kind", "proposal"]), proposal = parseProposal(v.proposal);
    if (proposal.source !== "owner") throw new Error("Browser tasks accept owner-directed workflow changes only");
    return { kind, proposal };
  }
  throw new Error("Unknown browser task request");
}
function prepared(input: unknown): Prepared {
  const v = object(input, ["contract", "request", "expectedHead", "resultHead", "operation", "transfer", "evaluation"]);
  if (v.contract !== "algal.browser-triage-prepared.v1") throw new Error("Invalid saved task preparation");
  return { contract: v.contract, request: request(v.request), expectedHead: v.expectedHead === null ? null : reference(v.expectedHead), resultHead: reference(v.resultHead), operation: v.operation === null ? null : reference(v.operation), transfer: reference(v.transfer), evaluation: v.evaluation === null ? null : reference(v.evaluation) };
}
function journal(input: unknown): Journal {
  const v = object(input, ["contract", "initialization", "completed", "evaluations", "pending"]);
  if (v.contract !== "algal.browser-triage-journal.v1" || !Array.isArray(v.completed) || v.completed.length > MAX_STATES + MAX_EVALUATIONS || !Array.isArray(v.evaluations) || v.evaluations.length > MAX_EVALUATIONS) throw new Error("Invalid browser task journal or capacity");
  const completed = v.completed.map(reference), evaluations = v.evaluations.map(reference), pending = v.pending === null ? null : reference(v.pending);
  const initialization = request(v.initialization);
  if (initialization.kind !== "create" && initialization.kind !== "fork") throw new Error("Invalid saved task initialization");
  if (new Set(completed).size !== completed.length || new Set(evaluations).size !== evaluations.length || (pending !== null && completed.includes(pending))) throw new Error("Duplicate browser task journal entry");
  return { contract: v.contract, initialization, completed, evaluations, pending };
}
async function snapshot(core: TriageCore, head: Digest): Promise<ApplicationSnapshot> {
  const state = await getApplicationRecord(core.service.store, head, parseApplicationState);
  return { digest: head, state, transition: await getApplicationRecord(core.service.store, state.transition, parseApplicationTransition), revision: await getApplicationRecord(core.service.store, state.revision, parseApplicationRevision) };
}
function commit(snapshot: ApplicationSnapshot) {
  const t = snapshot.transition;
  return { application: t.application, operation: t.operation, kind: t.kind, expectedHead: t.previous, revision: t.revision, memory: t.memory, intents: [], evidence: t.evidence, causedBy: t.causedBy };
}
export class BrowserTriageController {
  readonly core: TriageCore;
  readonly application: string;
  readonly sessionId: string;
  private readonly journalSlot: string;
  private readonly lock: string;
  private scope: { checked?: Promise<CheckedJournal>; candidates: Map<Digest, Promise<TriageEvaluationDetails>> } | undefined;
  constructor(readonly storage: ApplicationStorage, application = "browser-triage", sessionId = "browser") {
    this.application = id(application); this.sessionId = id(sessionId);
    const namespace = hash(this.application).slice(7, 39);
    this.journalSlot = `triage-journal-${namespace}`;
    this.lock = `triage-controller-${namespace}`;
    this.core = new TriageCore(storage, this.application);
  }
  private owned<T>(action: () => Promise<T>): Promise<T> {
    return this.storage.custody(this.lock, false, async () => {
      // Proof reuse ends with this custody interval. A later call must reread
      // durable evidence, including rows that disappeared after this call.
      this.scope = { candidates: new Map() };
      try { return await action(); } finally { this.scope = undefined; }
    });
  }
  private async readJournal(): Promise<Journal> {
    const value = await this.storage.store.getSlot(this.journalSlot);
    if (value === undefined) throw new Error("Missing saved task journal; existing records cannot be reconstructed");
    return journal(value);
  }
  private async writeJournal(value: Journal): Promise<void> {
    try { await this.storage.store.setSlot(this.journalSlot, applicationJson(journal(value))); }
    finally { if (this.scope) delete this.scope.checked; }
  }
  private operation(value: Request): Digest { return hash({ contract: "algal.browser-triage-operation.v1", application: this.application, request: value }); }
  private readPrepared(ref: Digest): Promise<Prepared> { return getApplicationRecord(this.storage.store, ref, prepared); }
  /** Individual proof: replays the full history for one evaluation. Pending
   * proposals, and candidates that did not fit a bounded shared source, keep
   * this path with its reuse limited to one operation, as before. */
  private inspectEvaluation(ref: Digest): Promise<TriageEvaluationDetails> {
    if (!this.scope) return this.core.inspectEvaluation(ref);
    let found = this.scope.candidates.get(ref);
    if (!found) { found = this.core.inspectEvaluation(ref); this.scope.candidates.set(ref, found); }
    return found;
  }
  /** A completed candidate proven in this phase's private source shares that
   * source's single history replay. Nothing proven there outlives the phase. */
  private candidate(ref: Digest, source: Source): Promise<TriageEvaluationDetails> {
    const proven = source.proven.get(ref);
    return proven ? Promise.resolve(proven) : this.inspectEvaluation(ref);
  }
  /** Each read phase opens one newly read private source that also carries
   * every completed saved candidate, so the source and candidates are proven
   * together from fresh live evidence. */
  private async withSource<T>(callback: (source: Source) => Promise<T>): Promise<T> {
    const saved = await this.readJournal();
    return this.core.withVerifiedSource((core, proven) => callback({ core, journal: saved, proven }), [], saved.evaluations);
  }

  private async binding(p: Prepared, source: Source): Promise<void> {
    const r = p.request;
    const expected = r.kind === "create" || r.kind === "fork" ? null : r.kind === "propose" ? r.proposal.expectedHead : r.expectedHead;
    if (p.expectedHead !== expected) throw new Error("Saved task request/head mismatch");
    if (r.kind === "propose") {
      if (p.operation !== null || p.evaluation === null || p.resultHead !== expected) throw new Error("Saved workflow preparation mismatch");
      const candidate = await this.candidate(p.evaluation, source);
      if (candidate.evaluation.proposal !== hash(r.proposal) || candidate.evaluation.expectedHead !== expected) throw new Error("Saved workflow differs from its request");
      return;
    }
    if (p.evaluation !== null) throw new Error("Unexpected workflow evaluation on task publication");
    const target = await snapshot(this.core, p.resultHead), t = target.transition;
    if (target.state.application !== this.application || t.application !== this.application || t.previous !== expected || target.state.previous !== expected || t.operation !== p.operation) throw new Error("Saved task target binding mismatch");
    if (r.kind === "act") {
      if (p.operation !== this.operation(r) || t.kind !== "memory" || t.evidence.length !== 1) throw new Error("Saved task action changed");
      const change = await getApplicationRecord(this.storage.store, t.evidence[0]!, value => object(value, ["contract", "command", "receipt"]));
      if (change.contract !== "algal.triage-change.v1" || !same(parseCommand(change.command), { contract: "algal.triage-command.v1", expectedHead: expected, operation: p.operation, action: r.action })) throw new Error("Saved action evidence differs from its request");
    } else if (r.kind === "adopt") {
      const candidate = await this.candidate(r.evaluation, source);
      if (p.operation !== this.operation(r) || !candidate.evaluation.accepted || candidate.evaluation.expectedHead !== expected || candidate.evaluation.candidateRevision !== t.revision || !t.evidence.includes(r.evaluation) || !["activate", "migrate"].includes(t.kind)) throw new Error("Saved workflow adoption changed");
    } else {
      if (t.kind !== "create" || t.evidence.length !== 1) throw new Error("Saved task creation changed");
      const origin = await getApplicationRecord(this.storage.store, t.evidence[0]!, value => object(value, ["contract", "tasks", "source"]));
      if (origin.contract !== "algal.triage-origin.v1") throw new Error("Invalid saved task origin");
      if (r.kind === "create") {
        const expectedCore = new TriageCore(new MemoryApplicationStorage(), this.application), initial = await expectedCore.initialize();
        if (initial.head !== p.resultHead || origin.source !== null || !same(origin.tasks, [])) throw new Error("Saved creation differs from the empty schema-v1 application");
      } else if (origin.source === null || (await this.core.readTransfer(reference(origin.source))).head !== r.source) throw new Error("Saved fork differs from its source");
    }
  }
  private checkedJournal(source?: Source): Promise<CheckedJournal> {
    if (!this.scope) return this.checkJournal(source);
    return this.scope.checked ??= this.checkJournal(source);
  }
  private async checkJournal(input?: Source): Promise<CheckedJournal> {
    // Without a published head there is no history to replay: saved genesis
    // and fork recovery read the live store directly, as before.
    if (!input && await this.storage.readHead(this.application) !== undefined) return this.withSource(source => this.checkJournal(source));
    const source = input ?? { core: this.core, journal: await this.readJournal(), proven: new Map() }, j = source.journal;
    await source.core.verifySourceClosure();
    const history = await source.core.service.history(this.application), publications = new Map<Digest, Prepared>(), evaluations: Digest[] = [];
    for (const ref of j.completed) {
      const p = await this.readPrepared(ref);
      if ((p.request.kind === "create" || p.request.kind === "fork") && !same(p.request, j.initialization)) throw new Error("Saved task initialization changed");
      // The compact index remains part of the saved request. Read-only checks
      // never recreate it, even when all application records are present.
      const index = await getApplicationRecord(this.storage.store, p.transfer, value => object(value, ["contract", "application", "head", "states", "records"]));
      if (index.contract !== "algal.triage-transfer-index.v1" || index.application !== this.application || index.head !== p.resultHead) throw new Error("Saved task preparation index changed");
      await this.binding(p, source);
      if (p.request.kind === "propose") evaluations.push(p.evaluation!);
      else {
        if (publications.has(p.resultHead)) throw new Error("Duplicate task publication");
        if (!history.some(row => row.digest === p.resultHead)) throw new Error("Completed task request is missing from history");
        publications.set(p.resultHead, p);
      }
    }
    if (!same(evaluations, j.evaluations)) throw new Error("Workflow journal differs from completed requests");
    if (j.pending !== null) {
      const p = await this.readPrepared(j.pending), transfer = await this.core.readTransfer(p.transfer);
      if ((p.request.kind === "create" || p.request.kind === "fork") && !same(p.request, j.initialization)) throw new Error("Pending task initialization changed");
      if (transfer.application !== this.application || transfer.head !== p.resultHead) throw new Error("Pending task transfer changed");
      await this.binding(p, source);
      if (p.request.kind !== "propose") {
        if (publications.has(p.resultHead)) throw new Error("Pending task already appears as completed");
        publications.set(p.resultHead, p);
      }
    }
    if (history.some(row => !publications.has(row.digest))) throw new Error("Task history lacks its saved request");
    const candidates: TriageEvaluationDetails[] = [];
    for (const ref of j.evaluations) candidates.push(await this.candidate(ref, source));
    return { journal: j, history, candidates };
  }
  private async exact(expected: Digest, source?: Source): Promise<CheckedJournal> {
    const checked = await this.checkedJournal(source);
    if (checked.journal.pending !== null) throw new Error("A saved task operation needs recovery before another change");
    if (checked.history.at(-1)?.digest !== reference(expected)) throw new Error("Stale task head; reload and explicitly rebase your change");
    return checked;
  }
  private async captureOwned(): Promise<BrowserTriageCapture> {
    // Journal checking and rendering share one newly read private snapshot.
    // Publication has invalidated the old journal proof; the simulated target
    // is never reused as evidence that the live publication succeeded.
    const { journal: j, history, candidates, current, sessionState } = await this.withSource(async source => {
      const checked = await this.checkedJournal(source);
      const sessionState = await source.core.loadSession(this.sessionId);
      return { ...checked, sessionState, current: await source.core.capture(sessionState.record?.session ?? DEFAULT_SESSION) };
    });
    const recovery = j.pending === null ? null : await this.readPrepared(j.pending);
    return { ...current, sessionState, pending: candidates.filter(c => c.evaluation.expectedHead === current.head).at(-1) ?? null, recovery: recovery ? { reference: j.pending!, kind: recovery.request.kind, expectedHead: recovery.expectedHead } : null, remainingEvaluations: MAX_EVALUATIONS - j.evaluations.length, history: history.map(row => ({ head: row.digest, sequence: row.state.sequence, kind: row.transition.kind })) };
  }
  capture(): Promise<BrowserTriageCapture> { return this.owned(() => this.captureOwned()); }
  initialize(): Promise<BrowserTriageCapture> {
    return this.owned(async () => {
      const raw = await this.storage.store.getSlot(this.journalSlot), head = await this.storage.readHead(this.application);
      if (raw === undefined) {
        if (head !== undefined || await this.storage.operationCount(this.application) !== 0) throw new Error("Existing task history is missing its saved journal");
        await this.writeJournal(emptyJournal());
      }
      const j = await this.readJournal();
      if (j.pending !== null) {
        const p = await this.readPrepared(j.pending);
        if (p.request.kind === "create" || p.request.kind === "fork") await this.recoverOwned();
      } else if (head === undefined) {
        if (j.completed.length || j.evaluations.length || await this.storage.operationCount(this.application)) throw new Error("Incomplete task history requires recovery");
        if (j.initialization.kind === "fork") throw new Error("Incomplete saved fork; import the source into a fresh destination");
        const simulation = new TriageCore(new MemoryApplicationStorage(), this.application);
        await simulation.initialize(); await this.prepare(j, { kind: "create" }, await simulation.export(), null); await this.recoverOwned();
      }
      return this.captureOwned();
    });
  }
  private async prepare(j: Journal, value: Request, transfer: Transfer, evaluation: Digest | null): Promise<void> {
    if (j.pending !== null || j.completed.length >= MAX_STATES + MAX_EVALUATIONS) throw new Error("Task request capacity reached");
    if ((value.kind === "create" || value.kind === "fork") && !same(value, j.initialization)) throw new Error("Task initialization differs from its saved intent");
    // import validates existing committed data before copying any new records.
    // The saved transfer index references individual rows under browser limits.
    const imported = await this.core.import(transfer), target = await snapshot(this.core, transfer.head);
    const p: Prepared = { contract: "algal.browser-triage-prepared.v1", request: request(value), expectedHead: value.kind === "create" || value.kind === "fork" ? null : value.kind === "propose" ? value.proposal.expectedHead : value.expectedHead, resultHead: transfer.head, operation: value.kind === "propose" ? null : target.transition.operation, transfer: imported.reference, evaluation };
    const ref = await this.storage.store.putValue(applicationJson(p));
    await this.writeJournal({ ...j, pending: ref });
  }
  private async recoverOwned(): Promise<void> {
    const { journal: j, history } = await this.checkedJournal();
    if (j.pending === null) return;
    const p = await this.readPrepared(j.pending), transfer = await this.core.readTransfer(p.transfer);
    await verifyTransfer(transfer);
    const current = history.at(-1)?.digest ?? null;
    if (p.request.kind === "propose") {
      if (current !== p.expectedHead || !same(transfer.states, history.map(row => row.digest))) throw new Error("Workflow preparation belongs to another task history");
    } else {
      if (current !== p.expectedHead && current !== p.resultHead) throw new Error("Pending task operation conflicts with the current head");
      const expectedHistory = current === p.resultHead ? history.map(row => row.digest) : [...history.map(row => row.digest), p.resultHead];
      if (!same(transfer.states, expectedHistory)) throw new Error("Pending task operation changes more than its saved step");
      const target = await snapshot(this.core, p.resultHead);
      if ((await this.core.service.commit(commit(target))).digest !== p.resultHead) throw new Error("Recovered task state changed");
    }
    await this.writeJournal({ ...j, completed: [...j.completed, j.pending], evaluations: p.evaluation === null ? j.evaluations : [...j.evaluations, p.evaluation], pending: null });
  }
  recover(): Promise<BrowserTriageCapture> { return this.owned(async () => { await this.recoverOwned(); return this.captureOwned(); }); }
  act(expectedHead: Digest, input: Action): Promise<BrowserTriageCapture> {
    const value: Request = { kind: "act", expectedHead: reference(expectedHead), action: parseAction(input) };
    return this.owned(async () => {
      // The unchanged source, saved draft, and simulation use one proof scope.
      // prepare/recovery still reread and verify the durable source and target.
      const { j, target } = await this.withSource(async source => {
        const simulation = source.core, { journal: j } = await this.exact(value.expectedHead, source), session = await simulation.loadSession(this.sessionId);
        if (["add", "edit"].includes(value.action.kind) && session.status === "stale") throw new Error("Rebase the saved draft explicitly before submission");
        await simulation.command({ contract: "algal.triage-command.v1", expectedHead: value.expectedHead, operation: this.operation(value), action: value.action });
        return { j, target: await simulation.export() };
      });
      await this.prepare(j, value, target, null); await this.recoverOwned(); return this.captureOwned();
    });
  }
  propose(expectedHead: Digest, input: WorkflowInput): Promise<BrowserTriageCapture> {
    const v = object(input, ["config", "schemaVersion", "rationale"]), proposal = parseProposal({ contract: "algal.triage-proposal.v1", expectedHead: reference(expectedHead), ...v, source: "owner" });
    return this.owned(async () => {
      const { journal: j, candidates } = await this.exact(proposal.expectedHead);
      if (candidates.some(c => c.evaluation.proposal === hash(proposal))) return this.captureOwned();
      if (j.evaluations.length >= MAX_EVALUATIONS) throw new Error("Workflow evaluation capacity reached");
      const target = await this.core.withVerifiedSource(async simulation => {
        const evaluated = await simulation.proposeEvaluate(proposal);
        return { transfer: await simulation.export([evaluated.reference]), evaluation: evaluated.reference };
      });
      await this.prepare(j, { kind: "propose", proposal }, target.transfer, target.evaluation); await this.recoverOwned(); return this.captureOwned();
    });
  }
  adopt(expectedHead: Digest, evaluation: Digest): Promise<BrowserTriageCapture> {
    const value: Request = { kind: "adopt", expectedHead: reference(expectedHead), evaluation: reference(evaluation) };
    return this.owned(async () => {
      const { journal: j, candidates } = await this.exact(value.expectedHead);
      const candidate = j.evaluations.includes(value.evaluation) ? candidates.find(c => c.reference === value.evaluation) : undefined;
      if (!candidate) throw new Error("Unknown saved workflow evaluation");
      if (!candidate.evaluation.accepted || candidate.evaluation.expectedHead !== value.expectedHead) throw new Error("Workflow did not pass checks for the current task state");
      const target = await this.core.withVerifiedSource(async simulation => {
        await simulation.adopt(value.evaluation, this.operation(value));
        return simulation.export();
      }, [value.evaluation]);
      await this.prepare(j, value, target, null); await this.recoverOwned(); return this.captureOwned();
    });
  }
  saveSession(expectedHead: Digest, expectedSession: Digest | null, input: Session): Promise<BrowserTriageCapture> {
    const session = parseSession(input), expected = reference(expectedHead), prior = expectedSession === null ? null : reference(expectedSession);
    return this.owned(async () => {
      await this.exact(expected);
      if ((await this.core.loadSession(this.sessionId)).status === "stale") throw new Error("Saved draft is stale; explicitly rebase it before saving");
      await this.core.saveSession(this.sessionId, { capturedHead: expected, expectedSession: prior, session }); return this.captureOwned();
    });
  }
  rebaseSession(expectedHead: Digest, expectedSession: Digest | null, input?: Session): Promise<BrowserTriageCapture> {
    const expected = reference(expectedHead), prior = expectedSession === null ? null : reference(expectedSession), session = input === undefined ? undefined : parseSession(input);
    return this.owned(async () => {
      await this.exact(expected);
      const saved = await this.core.loadSession(this.sessionId);
      if (saved.reference !== prior) throw new Error("Newer session draft exists; explicit merge required");
      await this.core.saveSession(this.sessionId, { capturedHead: expected, expectedSession: prior, session: session ?? saved.record?.session ?? DEFAULT_SESSION }); return this.captureOwned();
    });
  }
  exportBundle(): Promise<Transfer> {
    return this.owned(async () => {
      const { journal: j } = await this.checkedJournal();
      if (j.pending !== null) throw new Error("Recover the saved task operation before exporting");
      const transfer = await this.core.export(); await verifyTransfer(transfer); return transfer;
    });
  }
  static verifyBundle(input: unknown) { return verifyTransfer(input); }
  static async importBundle(storage: ApplicationStorage, input: unknown, newApplication: string, sessionId = "browser"): Promise<BrowserTriageController> {
    const transfer = parseTransfer(input); await verifyTransfer(transfer);
    const result = new BrowserTriageController(storage, newApplication, sessionId);
    if (result.application === transfer.application) throw new Error("Import needs a fresh application identity");
    await result.owned(async () => {
      if (await storage.readHead(result.application) !== undefined || await storage.operationCount(result.application) !== 0 || await storage.store.getSlot(result.journalSlot) !== undefined) throw new Error("Import destination must be fresh");
      const simulation = new TriageCore(new MemoryApplicationStorage(), transfer.application);
      await simulation.fork(transfer, result.application);
      const forked = new TriageCore(simulation.storage, result.application), j = emptyJournal({ kind: "fork", source: transfer.head });
      await result.writeJournal(j); await result.prepare(j, { kind: "fork", source: transfer.head }, await forked.export(), null); await result.recoverOwned();
    });
    return result;
  }
}
