/** Durable application lifecycle, shared with the native implementation.
 * Process execution and uncertain-effect custody remain the existing VM's. */
import { lstat, opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  APPLICATION_LIMITS, applicationId, applicationInt, applicationJson, applicationList,
  applicationObject, applicationRef, applicationRefs, applicationTag, getApplicationRecord,
  nullableApplicationRef, parseApplicationHead, parseApplicationRevision, parseApplicationState,
  parseApplicationTransition, parseEpisodeBinding, parseWorkIntent, putApplicationRecord,
  type ApplicationRevision, type ApplicationState, type ApplicationTransition,
  type EpisodeBinding, type WorkIntent,
} from "./application-contract";
import { parseApplicationMigration, type ApplicationMigration } from "./application-migration";
import { checkApplicationDrainBinding, checkApplicationDrainCoverage, parseApplicationDrain, type ApplicationDrain } from "./application-drain";
import { verifyApplicationRestoration } from "./application-restoration";
import { verifyApplicationProposalBinding } from "./application-proposal";
import { validateApplicationGoals } from "./application-goal";
import { withApplicationQuota } from "./application-quota";
import { parseMemoryObservation, parseMemorySnapshot } from "./application-memory";
import { parseCapabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { SHARED_LEASE_RETRY, hostDirectory, hostLease, hostNames, hostRead, hostWrite } from "./host-state";
import { FileStore } from "./store";
import type { JsonValue } from "./values";

export const APPLICATION_SERVICE_LIMITS = Object.freeze({ applications: 32, pending: 128, dispatches: 4096, dispatchBatch: 32 });
export type ApplicationIntentSpec = {kind: "start-episode"; entrypoint: string; input: Digest} | {kind: "deliver"; route: string; message: Digest};
export type ApplicationCommand = {
  application: string; operation: Digest; kind: ApplicationTransition["kind"];
  expectedHead: Digest | null; revision: Digest; memory: Digest;
  intents: ApplicationIntentSpec[]; evidence: Digest[]; causedBy: Digest | null;
};
export type ApplicationSnapshot = {digest: Digest; state: ApplicationState; transition: ApplicationTransition; revision: ApplicationRevision};
export type ApplicationPending = {intent: Digest; sourceState: Digest; work: WorkIntent; dispatch: ApplicationDispatch | null};
export type ApplicationDispatchPlan = {kind: "episode"; binding: EpisodeBinding} | {kind: "delivery"; recipient: string; hostProfile: Digest};
export type ApplicationDispatch = {
  contract: "algal.application-dispatch.v1"; application: string; intent: Digest;
  sourceState: Digest; configurationDigest: Digest; identity: Digest; plan: ApplicationDispatchPlan;
  status: "started" | "settled" | "blocked" | "uncertain"; result: Digest | null; reason: string | null;
};
/** A failed admission grants no plan or effect authority and leaves the intent pending. */
export type ApplicationAdmissionDenial = {
  contract: "algal.application-admission-denied.v1"; application: string; intent: Digest;
  sourceState: Digest; currentState: Digest; status: "denied"; reason: string;
};
export type ApplicationDispatchAttempt = ApplicationDispatch | ApplicationAdmissionDenial;
export type ApplicationDispatchContext = {current: ApplicationSnapshot; snapshot: ApplicationSnapshot; intent: WorkIntent; dispatch: ApplicationDispatch};
export type ApplicationDispatchResult = {kind: "episode"; binding: Digest; process: string; outcome?: Digest} | {kind: "delivery"; message: Digest; idempotencyKey: Digest};
export type ApplicationDispatchOutcome = {status: "settled"; result: ApplicationDispatchResult} | {status: "blocked" | "uncertain"; reason: string};
export interface ApplicationDispatcher {
  configurationDigest: Digest;
  /** Admit one logical delivery/episode; success does not claim task completion. */
  dispatch(context: ApplicationDispatchContext): Promise<unknown>;
  /** Explicit reconciliation only. Must not blindly repeat an uncertain external write. */
  reconcile?(context: ApplicationDispatchContext): Promise<unknown>;
}
export interface ApplicationAdmission {
  /** Mandatory trusted host boundary, called under application custody. Validate
   * memory/evidence truth classes, compiled closure/interfaces, capability grants,
   * applicability, evaluation policy and any externally tracked writer barriers. */
  admitCommit(context: {
    command: ApplicationCommand; current: ApplicationSnapshot | null;
    revision: ApplicationRevision; previousRevision: ApplicationRevision | null;
    pending: ApplicationPending[]; store: FileStore;
  }): Promise<void>;
  /** No dispatch authority exists if this method is absent. */
  admitDispatch?(context: {
    current: ApplicationSnapshot; snapshot: ApplicationSnapshot; intent: WorkIntent;
    previousDispatch: ApplicationDispatch | null; store: FileStore;
  }): Promise<unknown>;
}
export type ApplicationFaultPoint = "prepared" | "head-published" | "dispatch-started" | "dispatch-settled";
export type ApplicationOptions = {fault?: (point: ApplicationFaultPoint) => void | Promise<void>};

type Operation = {contract: "algal.application-operation.v1"; application: string; operation: Digest; request: Digest; transition: Digest; state: Digest};
type IntentRow = {ref: Digest; work: WorkIntent};
const json = applicationJson;
const hash = (value: unknown): Digest => digestCanonical(json(value));
const same = (a: unknown, b: unknown): boolean => hash(a) === hash(b);
const fail = (message: string): never => { throw new AlgalError("RECEIPT_MISMATCH", message); };
function reason(value: unknown): string {
  if (typeof value !== "string" || !value.length || Buffer.byteLength(value) > 1024) throw new Error("Invalid application dispatch reason");
  return value;
}
function intentSpec(raw: unknown): ApplicationIntentSpec {
  const value = json(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid intent specification");
  if (value.kind === "start-episode") {
    const v = applicationObject(value, ["kind", "entrypoint", "input"]);
    return {kind: "start-episode", entrypoint: applicationId(v.entrypoint), input: applicationRef(v.input)};
  }
  const v = applicationObject(value, ["kind", "route", "message"]);
  applicationTag(v.kind, "deliver");
  return {kind: "deliver", route: applicationId(v.route), message: applicationRef(v.message)};
}
export function parseApplicationCommand(raw: unknown): ApplicationCommand {
  const v = applicationObject(raw, ["application", "operation", "kind", "expectedHead", "revision", "memory", "intents", "evidence", "causedBy"]);
  if (v.kind !== "create" && v.kind !== "memory" && v.kind !== "investigate" && v.kind !== "activate" && v.kind !== "migrate" && v.kind !== "restore" && v.kind !== "propose") throw new Error("Invalid application command kind");
  return {application: applicationId(v.application), operation: applicationRef(v.operation), kind: v.kind,
    expectedHead: nullableApplicationRef(v.expectedHead), revision: applicationRef(v.revision), memory: applicationRef(v.memory),
    intents: applicationList(v.intents, APPLICATION_LIMITS.intents, intentSpec), evidence: applicationRefs(v.evidence, 16), causedBy: nullableApplicationRef(v.causedBy)};
}
function parseOperation(raw: unknown): Operation {
  const v = applicationObject(raw, ["contract", "application", "operation", "request", "transition", "state"]);
  applicationTag(v.contract, "algal.application-operation.v1");
  return {contract: "algal.application-operation.v1", application: applicationId(v.application), operation: applicationRef(v.operation), request: applicationRef(v.request), transition: applicationRef(v.transition), state: applicationRef(v.state)};
}
function parsePlan(raw: unknown): ApplicationDispatchPlan {
  const v = json(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid application dispatch plan");
  if (v.kind === "episode") {
    const p = applicationObject(v, ["kind", "binding"]);
    return {kind: "episode", binding: parseEpisodeBinding(p.binding)};
  }
  const p = applicationObject(v, ["kind", "recipient", "hostProfile"]);
  applicationTag(p.kind, "delivery");
  return {kind: "delivery", recipient: parseCapabilityHandle(p.recipient, "mailbox-send").handle, hostProfile: applicationRef(p.hostProfile)};
}
function dispatchIdentity(application: string, intent: Digest, plan: ApplicationDispatchPlan): Digest {
  return hash({contract: "algal.application-dispatch-identity.v1", application, intent, plan});
}
export function applicationProcessName(application: string, intent: Digest): string {
  return "a-" + hash({contract: "algal.application-process-name.v1", application: applicationId(application), intent: applicationRef(intent)}).slice(7, 69);
}
function parseDispatch(raw: unknown): ApplicationDispatch {
  const v = applicationObject(raw, ["contract", "application", "intent", "sourceState", "configurationDigest", "identity", "plan", "status", "result", "reason"]);
  applicationTag(v.contract, "algal.application-dispatch.v1");
  if (!["started", "settled", "blocked", "uncertain"].includes(String(v.status))) throw new Error("Invalid application dispatch status");
  const status = v.status as ApplicationDispatch["status"], result = nullableApplicationRef(v.result), why = v.reason === null ? null : reason(v.reason);
  if ((status === "settled") !== (result !== null) || ((status === "blocked" || status === "uncertain") !== (why !== null))) throw new Error("Invalid application dispatch result");
  const application = applicationId(v.application), intent = applicationRef(v.intent), plan = parsePlan(v.plan), identity = applicationRef(v.identity);
  if (identity !== dispatchIdentity(application, intent, plan)) fail("Dispatch identity changed");
  return {contract: "algal.application-dispatch.v1", application, intent, sourceState: applicationRef(v.sourceState), configurationDigest: applicationRef(v.configurationDigest), identity, plan, status, result, reason: why};
}
function parseDispatchResult(raw: unknown, record: ApplicationDispatch, work: WorkIntent): ApplicationDispatchResult {
  if (record.plan.kind === "episode") {
    if (work.kind !== "start-episode") fail("Episode settlement does not bind a start intent");
    const hasOutcome = !!raw && typeof raw === "object" && Object.hasOwn(raw, "outcome");
    const value = applicationObject(raw, hasOutcome ? ["kind", "binding", "process", "outcome"] : ["kind", "binding", "process"]);
    applicationTag(value.kind, "episode");
    const binding = applicationRef(value.binding), process = applicationId(value.process);
    if (binding !== hash(record.plan.binding) || process !== record.plan.binding.process) fail("Episode settlement changed its binding");
    return {kind: "episode", binding, process, ...(hasOutcome ? {outcome: applicationRef(value.outcome)} : {})};
  }
  const value = applicationObject(raw, ["kind", "message", "idempotencyKey"]);
  applicationTag(value.kind, "delivery");
  const message = applicationRef(value.message), idempotencyKey = applicationRef(value.idempotencyKey);
  if (work.kind !== "deliver" || idempotencyKey !== record.identity || message !== work.message) fail("Delivery settlement changed its identity or message");
  return {kind: "delivery", message, idempotencyKey};
}
function parseOutcome(raw: unknown, record: ApplicationDispatch, work: WorkIntent): ApplicationDispatchOutcome {
  const v = json(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid dispatch outcome");
  if (v.status === "settled") {
    const p = applicationObject(v, ["status", "result"]);
    return {status: "settled", result: parseDispatchResult(p.result, record, work)};
  }
  const p = applicationObject(v, ["status", "reason"]);
  if (p.status !== "blocked" && p.status !== "uncertain") throw new Error("Invalid dispatch outcome status");
  return {status: p.status, reason: reason(p.reason)};
}

export class ApplicationService {
  readonly dir: string;
  readonly store: FileStore;
  constructor(dir: string, private readonly admission: ApplicationAdmission, private readonly options: ApplicationOptions = {}) {
    if (!admission || typeof admission.admitCommit !== "function") throw new Error("Trusted application admission is required");
    this.dir = resolve(dir); this.store = new FileStore(this.dir);
  }
  private path(application: string): string { return join(this.dir, "applications", applicationId(application)); }
  private async custody<T>(application: string, creating: boolean, action: () => Promise<T>): Promise<T> {
    const root = join(this.dir, "applications");
    await hostDirectory(root);
    // The shared creation lease serializes only the namespace scan and the
    // committed-head check; admission then runs under the application's own
    // mutex. Until a head exists that mutex is a per-application creation
    // lease inside `.creation` — coordination residue, never a reserved
    // namespace — so independent creations and a refused first commit never
    // queue behind or consume capacity through a trusted host call.
    const selected = await hostLease(join(root, ".creation"), "application-creation", async (): Promise<{existing: true} | {creating: true} | {result: T}> => {
      let count = 0, committed = false, scanned = 0;
      for await (const entry of await opendir(root)) {
        if (++scanned > APPLICATION_SERVICE_LIMITS.applications + 2) throw new Error("Application directory bound exceeded");
        if (entry.name === ".creation") continue;
        // Stray regular files (editor/OS residue such as .DS_Store) are not
        // applications and never brick custody; symlinks and special files do.
        if (entry.isFile() && !entry.isSymbolicLink()) continue;
        if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("Invalid application directory");
        applicationId(entry.name); count++;
        if (entry.name === application) {
          try {
            const head = await lstat(join(root, entry.name, "head.json"));
            committed = head.isFile() && !head.isSymbolicLink();
          } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        }
      }
      if (committed) return {existing: true};
      if (!creating) return {result: await action()};
      if (count >= APPLICATION_SERVICE_LIMITS.applications) throw new Error("Application count exhausted");
      return {creating: true};
    }, SHARED_LEASE_RETRY);
    if ("result" in selected) return selected.result;
    if ("creating" in selected) return hostLease(join(root, ".creation", "pending", applicationId(application)), "application-" + application, action);
    return hostLease(this.path(application), "application-" + application, action);
  }
  private async value(ref: Digest): Promise<JsonValue> { return getApplicationRecord(this.store, ref, json); }
  /** Intent rows validated by the most recent `history()` pass, keyed by state
   * digest; `pending()` reuses them instead of re-reading the same records. */
  private readonly validatedIntents = new Map<Digest, IntentRow[]>();
  /** Records shared across the states of one history: a revision or memory
   * digest is verified once per `history()` call (content-addressed, immutable). */
  private async snapshot(ref: Digest, shared: {revisions: Map<Digest, ApplicationRevision>; memories: Set<Digest>}): Promise<ApplicationSnapshot> {
    const state = await getApplicationRecord(this.store, ref, parseApplicationState);
    const transition = await getApplicationRecord(this.store, state.transition, parseApplicationTransition);
    let revision = shared.revisions.get(state.revision);
    if (!revision) { revision = await getApplicationRecord(this.store, state.revision, parseApplicationRevision); shared.revisions.set(state.revision, revision); }
    if (state.application !== transition.application || state.application !== revision.application || state.revision !== transition.revision || state.memory !== transition.memory || state.previous !== transition.previous) fail("Application state/transition binding mismatch");
    if (!shared.memories.has(state.memory)) { await this.value(state.memory); shared.memories.add(state.memory); }
    return {digest: ref, state, transition, revision: structuredClone(revision)};
  }
  private checkStep(prior: ApplicationSnapshot | null, next: ApplicationSnapshot): void {
    const {state, transition, revision} = next;
    if (!prior) {
      if (transition.kind !== "create" || state.sequence !== 0 || state.epoch !== 0 || revision.parent !== null) fail("Invalid application origin");
      return;
    }
    if (state.application !== prior.state.application || state.previous !== prior.digest || state.sequence !== prior.state.sequence + 1 || transition.kind === "create") fail("Invalid application state succession");
    const activating = transition.kind === "activate" || transition.kind === "migrate" || transition.kind === "restore";
    if (state.epoch !== prior.state.epoch + Number(activating)) fail("Invalid activation epoch");
    if (activating) {
      if (state.revision === prior.state.revision || revision.parent !== prior.state.revision || revision.runtimeProfile !== prior.revision.runtimeProfile || revision.capabilityRequirements.some(c => !prior.revision.capabilityRequirements.includes(c)) || prior.revision.entrypoints.some(e => !revision.entrypoints.some(n => n.name === e.name))) fail("Incompatible application activation");
      // An activate keeps the memory schema; a schema change requires the
      // migrate kind carrying migration evidence, verified asynchronously.
      if (transition.kind === "activate" && revision.schema !== prior.revision.schema) fail("Incompatible application activation");
    } else if (state.revision !== prior.state.revision) fail("Memory/investigation cannot change the revision");
    if (transition.kind === "restore" && (state.memory !== prior.state.memory || transition.intents.length)) fail("Restoration must preserve current memory and create no intents");
    if (transition.kind === "propose" && (state.memory !== prior.state.memory || transition.intents.length)) fail("Proposal must preserve current memory and create no intents");
    if (transition.kind === "investigate" && (state.memory !== prior.state.memory || !transition.intents.length)) fail("Invalid investigation transition");
  }
  /** A migrate transition must carry migration evidence that binds the prior
   * memory to the new one: the record names the prior snapshot as its source,
   * the new revision as its target, and the migrated memory actually consumes
   * it — at least one observation decodes from the record itself. */
  private async checkMigration(prior: ApplicationSnapshot, next: ApplicationSnapshot): Promise<void> {
    const migrations = new Map<Digest, ApplicationMigration>();
    for (const ref of next.transition.evidence) {
      const record = await this.value(ref);
      if (record !== null && typeof record === "object" && (record as { contract?: unknown }).contract === "algal.application-migration.v1") migrations.set(ref, parseApplicationMigration(record));
    }
    if (!migrations.size) fail("Migration transition lacks migration evidence");
    const memory = await getApplicationRecord(this.store, next.state.memory, parseMemorySnapshot);
    if (memory.schema !== next.revision.schema) fail("Migrated memory schema does not match the revision");
    for (const [ref, migration] of migrations) {
      if (migration.application !== next.state.application || migration.from !== prior.state.memory || migration.previousRevision !== prior.state.revision || migration.candidateRevision !== next.state.revision) fail("Migration evidence does not bind this transition");
      let consumed = false;
      for (const observationRef of memory.observations) {
        const observation = await getApplicationRecord(this.store, observationRef, parseMemoryObservation);
        if (observation.raw === ref) consumed = true;
      }
      if (!consumed) fail("Migration evidence is not consumed by the migrated memory");
    }
  }
  /** Drain records cited by the transition's evidence — other evidence kinds
   * stay inert here and keep their own checks. */
  private async transitionDrains(transition: ApplicationTransition): Promise<ApplicationDrain[]> {
    const drains: ApplicationDrain[] = [];
    for (const ref of transition.evidence) {
      const record = await this.value(ref);
      if (record !== null && typeof record === "object" && !Array.isArray(record) && (record as { contract?: unknown }).contract === "algal.application-drain.v1") drains.push(parseApplicationDrain(record));
    }
    return drains;
  }
  /** Commit-time drain rule: a migrate with undispatched pending intents must
   * cite exactly one drain naming the whole set; with none pending, any drain
   * is non-applicable evidence. Dispatched intents are never drainable — the
   * unsettled barrier already wedges the transition for them. */
  private async checkDrain(prior: ApplicationSnapshot, transition: ApplicationTransition, pending: ApplicationPending[]): Promise<void> {
    const drains = await this.transitionDrains(transition);
    const undispatched = new Set(pending.filter(p => p.dispatch === null).map(p => p.intent));
    if (!undispatched.size) {
      if (drains.length) throw new Error("Drain record is not applicable");
      return;
    }
    if (drains.length !== 1) throw new Error("Pending intents require explicit drain");
    checkApplicationDrainBinding(drains[0]!, transition.application, prior.digest);
    checkApplicationDrainCoverage(drains[0]!, undispatched);
  }
  /** Retained-history drain replay. Dispatch records written after the citing
   * migrate commits are indistinguishable from earlier settlements, so the
   * replay enforces the stable subset of completeness: the drain binds its
   * transition, every cited intent belongs to the drained prefix and was not
   * abandoned earlier, no `abandoned` intent carries a dispatch record, and
   * no still-undispatched intent of the prefix was left out. */
  private async checkDrainRetained(prefix: ApplicationSnapshot[], prior: ApplicationSnapshot, transition: ApplicationTransition): Promise<void> {
    const drains = await this.transitionDrains(transition);
    if (!drains.length) return;
    const abandoned = await this.abandoned(prefix);
    const rows: IntentRow[] = [];
    for (const snapshot of prefix) rows.push(...await this.validatedIntentRows(snapshot));
    for (const drain of drains) {
      checkApplicationDrainBinding(drain, transition.application, prior.digest);
      const known = new Set<Digest>();
      for (const { ref, work } of rows) {
        known.add(ref);
        if (abandoned.has(ref)) continue;
        const dispatch = await this.dispatchRecord(transition.application, ref, work);
        const disposition = drain.dispositions.find(d => d.intent === ref);
        if ((disposition?.status === "abandoned" && dispatch !== null) || (disposition === undefined && dispatch === null)) fail("Drain dispositions must match the undispatched pending intents");
      }
      if (drain.dispositions.some(d => !known.has(d.intent) || abandoned.has(d.intent))) fail("Drain dispositions must match the undispatched pending intents");
    }
  }
  /** Intents abandoned by drains cited through retained migrate transitions.
   * Abandonment is a projection rule: the intent records stay in history and
   * CAS; only `pending()` and `dispatchPending` stop selecting them. */
  private async abandoned(history: ApplicationSnapshot[]): Promise<Set<Digest>> {
    const abandoned = new Set<Digest>();
    for (const snapshot of history) {
      if (snapshot.transition.kind !== "migrate") continue;
      for (const drain of await this.transitionDrains(snapshot.transition)) {
        for (const disposition of drain.dispositions) if (disposition.status === "abandoned") abandoned.add(disposition.intent);
      }
    }
    return abandoned;
  }
  async history(application: unknown): Promise<ApplicationSnapshot[]> {
    const name = applicationId(application);
    // Inspection never reserves a name or bypasses the creation count limit.
    for (const path of [this.dir, join(this.dir, "applications"), this.path(name)]) {
      try {
        const stat = await lstat(path);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Invalid application directory");
      } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    }
    const raw = await hostRead(join(this.path(name), "head.json"), 512);
    if (raw === undefined) return [];
    const head = parseApplicationHead(raw);
    if (head.application !== name) fail("Application head identity mismatch");
    const history: ApplicationSnapshot[] = [], seen = new Set<Digest>(), shared = {revisions: new Map<Digest, ApplicationRevision>(), memories: new Set<Digest>()};
    this.validatedIntents.clear();
    let ref: Digest | null = head.state;
    while (ref !== null) {
      if (history.length >= APPLICATION_LIMITS.states || seen.has(ref)) fail("Application history bound/cycle");
      seen.add(ref);
      const item = await this.snapshot(ref, shared);
      if (item.state.application !== name) fail("Application history identity mismatch");
      history.push(item); ref = item.state.previous;
    }
    history.reverse();
    const operations = new Set<Digest>();
    for (let i = 0; i < history.length; i++) {
      const item = history[i]!;
      this.checkStep(history[i - 1] ?? null, item);
      if (item.transition.kind === "migrate") {
        await this.checkMigration(history[i - 1]!, item);
        await this.checkDrainRetained(history.slice(0, i), history[i - 1]!, item.transition);
      }
      if (item.transition.kind === "restore") await verifyApplicationRestoration(this.store, { application: name, parentState: history[i - 1]!.digest, candidateRevision: item.state.revision, evidence: item.transition.evidence });
      if (item.transition.kind === "propose") await verifyApplicationProposalBinding(this.store, { application: name, parentState: history[i - 1]!.digest, revision: item.state.revision, evidence: item.transition.evidence });
      if (operations.has(item.transition.operation)) fail("Repeated operation in application history");
      operations.add(item.transition.operation);
      this.validatedIntents.set(item.digest, await this.intents(item));
    }
    return history;
  }
  async inspect(application: unknown): Promise<ApplicationSnapshot | null> { return (await this.history(application)).at(-1) ?? null; }
  private async intents(snapshot: ApplicationSnapshot): Promise<IntentRow[]> {
    const rows: IntentRow[] = [];
    for (const ref of snapshot.transition.intents) {
      const work = await getApplicationRecord(this.store, ref, parseWorkIntent);
      if (work.application !== snapshot.state.application || work.operation !== snapshot.transition.operation) fail("Intent transition mismatch");
      rows.push({ref, work});
    }
    rows.sort((a, b) => a.work.ordinal - b.work.ordinal);
    if (rows.some((r, i) => r.work.ordinal !== i)) fail("Intent ordinal sequence mismatch");
    const command: ApplicationCommand = {application: snapshot.state.application, operation: snapshot.transition.operation, kind: snapshot.transition.kind, expectedHead: snapshot.state.previous, revision: snapshot.state.revision, memory: snapshot.state.memory, intents: rows.map(({work}) => work.kind === "start-episode" ? {kind: work.kind, entrypoint: work.entrypoint, input: work.input} : {kind: work.kind, route: work.route, message: work.message}), evidence: snapshot.transition.evidence, causedBy: snapshot.transition.causedBy};
    if (hash(command) !== snapshot.transition.request) fail("Transition normalized request mismatch");
    return rows;
  }
  /** Rows from the last `history()` pass when it validated this state; otherwise a fresh pass. */
  private async validatedIntentRows(snapshot: ApplicationSnapshot): Promise<IntentRow[]> {
    return this.validatedIntents.get(snapshot.digest) ?? this.intents(snapshot);
  }
  private async dispatchRecord(application: string, ref: Digest, work: WorkIntent): Promise<ApplicationDispatch | null> {
    const raw = await hostRead(join(this.path(application), "outbox", ref.slice(7) + ".json"), APPLICATION_LIMITS.recordBytes);
    if (raw === undefined) return null;
    const record = parseDispatch(raw);
    if (record.application !== application || record.intent !== ref) fail("Outbox identity mismatch");
    if (record.result !== null) parseDispatchResult(await this.value(record.result), record, work);
    return record;
  }
  /** Read one validated retained dispatch for a historical intent. This does
   * not acquire dispatch authority or claim atomicity with a captured head. */
  async readDispatch(application: string, intent: Digest, work: WorkIntent, snapshot: ApplicationSnapshot): Promise<ApplicationDispatch | null> {
    const name = applicationId(application), ref = applicationRef(intent), parsed = parseWorkIntent(work);
    if (parsed.application !== name || hash(parsed) !== ref) fail("Dispatch inspection intent mismatch");
    const record = await this.dispatchRecord(name, ref, parsed);
    if (snapshot.state.application !== name || !snapshot.transition.intents.includes(ref)) fail("Dispatch inspection source mismatch");
    if (record) {
      if (record.sourceState !== snapshot.digest) fail("Dispatch inspection state mismatch");
      await this.validatePlan(snapshot, parsed, ref, record.plan);
    }
    return record;
  }
  private async pending(history: ApplicationSnapshot[]): Promise<ApplicationPending[]> {
    const abandoned = await this.abandoned(history);
    const pending: ApplicationPending[] = [];
    let total = 0;
    for (const snapshot of history) for (const {ref, work} of await this.validatedIntentRows(snapshot)) {
      if (++total > APPLICATION_SERVICE_LIMITS.dispatches) throw new Error("Retained application intent bound exceeded");
      const dispatch = await this.dispatchRecord(snapshot.state.application, ref, work);
      if (dispatch && dispatch.sourceState !== snapshot.digest) fail("Dispatch state binding mismatch");
      if (dispatch?.status !== "settled" && !abandoned.has(ref)) pending.push({intent: ref, sourceState: snapshot.digest, work, dispatch});
    }
    if (pending.length > APPLICATION_SERVICE_LIMITS.pending) throw new Error("Pending application intent bound exceeded");
    return pending;
  }
  /** The undispatched pending intents at `parentState` — the exact set a
   * drain must cover. Dispatches recorded later do not rewrite a committed
   * drain; this projection evaluates the current outbox against retained
   * history ending at that state. */
  async undispatchedPending(application: unknown, parentState: unknown): Promise<ApplicationPending[]> {
    const name = applicationId(application), state = applicationRef(parentState);
    const history = await this.history(name);
    const index = history.findIndex(snapshot => snapshot.digest === state);
    if (index < 0) throw new Error("Drain parent is not a committed state");
    return (await this.pending(history.slice(0, index + 1))).filter(p => p.dispatch === null);
  }
  async create(command: unknown): Promise<ApplicationSnapshot> {
    const parsed = parseApplicationCommand(command);
    if (parsed.kind !== "create" || parsed.expectedHead !== null) throw new Error("create requires a genesis command");
    return this.commit(parsed);
  }
  async commit(input: unknown): Promise<ApplicationSnapshot> {
    const command = parseApplicationCommand(input); // snapshots before the first await
    const path = this.path(command.application);
    return this.custody(command.application, true, async () => {
      const history = await this.history(command.application), current = history.at(-1) ?? null;
      const request = hash(command), operationPath = join(path, "operations", command.operation.slice(7) + ".json");
      const raw = await hostRead(operationPath, 2048);
      let prepared: Operation | null = null;
      if (raw !== undefined) {
        prepared = parseOperation(raw);
        if (prepared.application !== command.application || prepared.operation !== command.operation || prepared.request !== request) fail("Operation already claims another request");
        const committed = history.find(s => s.digest === prepared!.state);
        if (committed) {
          if (committed.state.transition !== prepared.transition || committed.transition.request !== request) fail("Operation commit binding mismatch");
          return committed;
        }
      }
      // History is the authority on committed operations: a removed operation
      // record must not let the same identity commit a second state.
      if (history.some(s => s.transition.operation === command.operation)) fail("Operation already committed in application history");
      if ((current?.digest ?? null) !== command.expectedHead) throw new AlgalError("RECEIPT_MISMATCH", "Stale application head");
      if (history.length >= APPLICATION_LIMITS.states) throw new Error("Application state bound exhausted");
      const revision = await getApplicationRecord(this.store, command.revision, parseApplicationRevision);
      if (revision.application !== command.application) fail("Revision belongs to another application");
      await validateApplicationGoals(this.store, revision);
      for (const ref of [command.memory, revision.schema, revision.queries, revision.views, revision.runtimeProfile, revision.evaluationPolicy, ...command.evidence, ...(command.causedBy ? [command.causedBy] : []), ...revision.entrypoints.map(e => e.applicability)]) await this.value(ref);
      // An inhabitant's declared capabilities must be a subset of what the
      // revision admits, and its applicability query must be inside its own
      // declared memory view — both checkable inside the revision record
      // itself. The view's membership in the queries bundle is a memory-layer
      // property, enforced by validateForRevision.
      for (const entry of revision.entrypoints) {
        if (entry.capabilities.some(c => !revision.capabilityRequirements.includes(c))) fail("Entrypoint capability exceeds the revision's requirements");
        if (!entry.queries.includes(entry.applicability)) fail("Entrypoint applicability is outside its declared memory view");
      }
      for (const entry of revision.entrypoints) if (!await this.store.getManifest(entry.manifest)) fail("Missing entrypoint manifest");
      const pending = await this.pending(history);
      if (pending.length + command.intents.length > APPLICATION_SERVICE_LIMITS.pending) throw new Error("Pending intent capacity exceeded");
      const total = history.reduce((sum, s) => sum + s.transition.intents.length, 0);
      if (total + command.intents.length > APPLICATION_SERVICE_LIMITS.dispatches) throw new Error("Retained intent capacity exceeded");
      if ((command.kind === "activate" || command.kind === "migrate" || command.kind === "restore") && pending.some(p => p.dispatch !== null)) throw new Error("Unsettled dispatch blocks activation");
      const intents: WorkIntent[] = command.intents.map((spec, ordinal) => parseWorkIntent({contract: "algal.application-intent.v1", application: command.application, operation: command.operation, ordinal, ...spec}));
      for (const work of intents) {
        await this.value(work.kind === "start-episode" ? work.input : work.message);
        if (work.kind === "start-episode" && !revision.entrypoints.some(e => e.name === work.entrypoint)) fail("Unknown intent entrypoint");
      }
      const transition = parseApplicationTransition({contract: "algal.application-transition.v1", application: command.application, operation: command.operation, request, kind: command.kind, previous: command.expectedHead, revision: command.revision, memory: command.memory, intents: intents.map(hash).sort(), evidence: command.evidence, causedBy: command.causedBy});
      const state = parseApplicationState({contract: "algal.application-state.v1", application: command.application, sequence: history.length, epoch: (current?.state.epoch ?? 0) + Number(command.kind === "activate" || command.kind === "migrate" || command.kind === "restore"), revision: command.revision, memory: command.memory, previous: command.expectedHead, transition: hash(transition)});
      const next = {digest: hash(state), state, transition, revision};
      this.checkStep(current, next);
      if (next.transition.kind === "migrate") {
        await this.checkMigration(current!, next);
        await this.checkDrain(current!, next.transition, pending);
      }
      if (next.transition.kind === "restore") await verifyApplicationRestoration(this.store, { application: command.application, parentState: current!.digest, candidateRevision: command.revision, evidence: command.evidence });
      if (next.transition.kind === "propose") await verifyApplicationProposalBinding(this.store, { application: command.application, parentState: current!.digest, revision: command.revision, evidence: command.evidence });
      const operation: Operation = {contract: "algal.application-operation.v1", application: command.application, operation: command.operation, request, transition: state.transition, state: next.digest};
      if (prepared && !same(prepared, operation)) fail("Prepared operation changed");
      // Copies keep trusted admission from accidentally mutating the prepared commit.
      await this.admission.admitCommit({command: parseApplicationCommand(command), current: structuredClone(current), revision: structuredClone(revision), previousRevision: structuredClone(current?.revision ?? null), pending: structuredClone(pending), store: this.store});
      const operationsPath = join(path, "operations");
      let operations: string[] = [];
      try { await lstat(operationsPath); operations = await hostNames(operationsPath, APPLICATION_LIMITS.states, /^[a-f0-9]{64}\.json$/, false); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      if (!prepared && operations.length >= APPLICATION_LIMITS.states) throw new Error("Application operation bound exhausted");
      const head = json({contract: "algal.application-head.v1", application: command.application, state: next.digest});
      await withApplicationQuota(this.dir, command.application, [json(operation), head], async () => {
        for (const intent of intents) await putApplicationRecord(this.store, intent);
        await putApplicationRecord(this.store, transition); await putApplicationRecord(this.store, state);
        await hostWrite(operationPath, json(operation), 2048);
        await this.options.fault?.("prepared");
        try {
          await hostWrite(join(path, "head.json"), head, 512, false);
          await this.options.fault?.("head-published");
        } catch {
          throw new AlgalError("IO_FAILED", "Application commit acknowledgment uncertain; inspect the exact operation", {operation: command.operation}, {uncertain: true});
        }
      });
      return structuredClone(next);
    });
  }
  private async validatePlan(snapshot: ApplicationSnapshot, work: WorkIntent, ref: Digest, plan: ApplicationDispatchPlan): Promise<void> {
    if (work.kind === "deliver") { if (plan.kind !== "delivery") fail("Delivery requires a delivery plan"); return; }
    if (plan.kind !== "episode") throw new Error("Episode requires an episode binding");
    const b = plan.binding, entry = snapshot.revision.entrypoints.find(e => e.name === work.entrypoint);
    if (!entry || b.application !== snapshot.state.application || b.intent !== ref || b.sourceState !== snapshot.digest || b.revision !== snapshot.state.revision || b.memory !== snapshot.state.memory || b.epoch !== snapshot.state.epoch || b.entrypoint !== entry.name || b.manifest !== entry.manifest || b.arguments !== work.input || b.maxGenerations !== entry.maxGenerations || b.process !== applicationProcessName(b.application, ref)) fail("Episode binding does not preserve its captured state");
    await this.value(b.arguments);
  }
  private async admitPlan(current: ApplicationSnapshot, snapshot: ApplicationSnapshot, work: WorkIntent, ref: Digest, previousDispatch: ApplicationDispatch | null): Promise<ApplicationDispatchPlan> {
    if (!this.admission.admitDispatch) throw new AlgalError("CAPABILITY_DENIED", "Trusted dispatch admission is required");
    const plan = parsePlan(await this.admission.admitDispatch({current: structuredClone(current), snapshot: structuredClone(snapshot), intent: structuredClone(work), previousDispatch: structuredClone(previousDispatch), store: this.store}));
    await this.validatePlan(snapshot, work, ref, plan);
    if (previousDispatch && !same(plan, previousDispatch.plan)) fail("Reconciliation cannot change the admitted dispatch plan");
    if (!previousDispatch && plan.kind === "episode" && plan.binding.access === "external-write" && snapshot.digest !== current.digest) throw new Error("Stale episode cannot acquire an external writer");
    return plan;
  }
  private async execute(current: ApplicationSnapshot, snapshot: ApplicationSnapshot, work: WorkIntent, record: ApplicationDispatch, dispatcher: ApplicationDispatcher, reconciliation: boolean): Promise<ApplicationDispatch> {
    if (record.configurationDigest !== dispatcher.configurationDigest) fail("Dispatcher configuration changed");
    const path = join(this.path(record.application), "outbox", record.intent.slice(7) + ".json");
    if (!reconciliation) {
      await withApplicationQuota(this.dir, record.application, [json(record)], () => hostWrite(path, json(record), APPLICATION_LIMITS.recordBytes));
      await this.options.fault?.("dispatch-started");
    }
    let outcome: ApplicationDispatchOutcome;
    try {
      const context = structuredClone({current, snapshot, intent: work, dispatch: record});
      outcome = parseOutcome(await (reconciliation ? dispatcher.reconcile!(context) : dispatcher.dispatch(context)), record, work);
    } catch {
      outcome = {status: "uncertain", reason: "Dispatcher did not establish settlement; explicit reconciliation required"};
    }
    const updated: ApplicationDispatch = {...record, status: outcome.status, result: outcome.status === "settled" ? await putApplicationRecord(this.store, outcome.result) : null, reason: outcome.status === "settled" ? null : outcome.reason};
    await withApplicationQuota(this.dir, record.application, [json(updated)], () => hostWrite(path, json(updated), APPLICATION_LIMITS.recordBytes, false));
    await this.options.fault?.("dispatch-settled");
    return updated;
  }
  async dispatchPending(application: unknown, dispatcher: ApplicationDispatcher, max: unknown = 32): Promise<ApplicationDispatchAttempt[]> {
    const name = applicationId(application), limit = applicationInt(max, 1, APPLICATION_SERVICE_LIMITS.dispatchBatch), configurationDigest = applicationRef(dispatcher.configurationDigest);
    const bound: ApplicationDispatcher = {configurationDigest, dispatch: dispatcher.dispatch.bind(dispatcher)};
    return this.custody(name, false, async () => {
      const history = await this.history(name), pending = await this.pending(history), results: ApplicationDispatchAttempt[] = [];
      let dispatched = 0;
      for (const row of pending) {
        if (row.dispatch) { results.push(row.dispatch); continue; } // Never automatically repeat an uncertain or blocked admission.
        if (dispatched >= limit) continue;
        const snapshot = history.find(s => s.digest === row.sourceState)!, current = history.at(-1)!;
        let plan: ApplicationDispatchPlan;
        try { plan = await this.admitPlan(current, snapshot, row.work, row.intent, null); }
        catch (error) {
          results.push({ contract: "algal.application-admission-denied.v1", application: name, intent: row.intent,
            sourceState: snapshot.digest, currentState: current.digest, status: "denied",
            // Transient record: the first 256 Unicode scalar values, as native does.
            reason: error instanceof Error && error.message ? Array.from(error.message).slice(0, 256).join("") : "Trusted host did not admit this intent" });
          continue;
        }
        if (plan.kind === "episode") await putApplicationRecord(this.store, plan.binding);
        const record: ApplicationDispatch = {contract: "algal.application-dispatch.v1", application: name, intent: row.intent, sourceState: snapshot.digest, configurationDigest, identity: dispatchIdentity(name, row.intent, plan), plan, status: "started", result: null, reason: null};
        results.push(await this.execute(current, snapshot, row.work, record, bound, false));
        dispatched++;
      }
      return structuredClone(results);
    });
  }
  async reconcileDispatch(application: unknown, intent: unknown, dispatcher: ApplicationDispatcher): Promise<ApplicationDispatch> {
    const name = applicationId(application), ref = applicationRef(intent), config = applicationRef(dispatcher.configurationDigest), reconcile = dispatcher.reconcile?.bind(dispatcher);
    if (!reconcile) throw new Error("Explicit dispatcher reconciliation is required");
    return this.custody(name, false, async () => {
      const history = await this.history(name);
      const row = (await this.pending(history)).find(p => p.intent === ref);
      if (!row) {
        const source = history.find(s => s.transition.intents.includes(ref));
        const work = source ? (await this.validatedIntentRows(source)).find(item => item.ref === ref)?.work : undefined;
        if (!source || !work) throw new Error("No reachable application intent");
        const settled = await this.dispatchRecord(name, ref, work);
        if (settled?.status === "settled" && history.some(s => s.digest === settled.sourceState && s.transition.intents.includes(ref))) return settled;
        throw new Error("No reachable unsettled dispatch");
      }
      if (!row.dispatch) throw new Error("Dispatch has not been admitted");
      const snapshot = history.find(s => s.digest === row.sourceState)!, current = history.at(-1)!;
      if (row.dispatch.configurationDigest !== config) fail("Dispatcher configuration changed");
      await this.admitPlan(current, snapshot, row.work, ref, row.dispatch);
      return this.execute(current, snapshot, row.work, row.dispatch, {configurationDigest: config, dispatch: dispatcher.dispatch.bind(dispatcher), reconcile}, true);
    });
  }
}
