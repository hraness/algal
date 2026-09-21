/** Experimental Bun host lifecycle. Process execution remains the existing VM's.
 * No native application parity or automatic interrupted process creation is claimed. */
import { opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  APPLICATION_LIMITS, applicationId, applicationInt, applicationJson, applicationList,
  applicationObject, applicationRef, applicationRefs, applicationTag, getApplicationRecord,
  nullableApplicationRef, parseApplicationHead, parseApplicationRevision, parseApplicationState,
  parseApplicationTransition, parseEpisodeBinding, parseWorkIntent, putApplicationRecord,
  type ApplicationRevision, type ApplicationState, type ApplicationTransition,
  type EpisodeBinding, type WorkIntent,
} from "./application-contract";
import { parseCapabilityHandle } from "./capabilities";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { hostDirectory, hostLease, hostNames, hostRead, hostWrite } from "./host-state";
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
export type ApplicationDispatchContext = {snapshot: ApplicationSnapshot; intent: WorkIntent; dispatch: ApplicationDispatch};
export type ApplicationDispatchOutcome = {status: "settled"; result: JsonValue} | {status: "blocked" | "uncertain"; reason: string};
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
  admitDispatch?(context: {snapshot: ApplicationSnapshot; intent: WorkIntent; store: FileStore}): Promise<unknown>;
}
export type ApplicationFaultPoint = "prepared" | "head-published" | "dispatch-started" | "dispatch-settled";
export type ApplicationOptions = {fault?: (point: ApplicationFaultPoint) => void | Promise<void>};

type Operation = {contract: "algal.application-operation.v1"; application: string; operation: Digest; request: Digest; transition: Digest; state: Digest};
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
  if (v.kind !== "create" && v.kind !== "memory" && v.kind !== "investigate" && v.kind !== "activate") throw new Error("Invalid application command kind");
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
function parseOutcome(raw: unknown): ApplicationDispatchOutcome {
  const v = json(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid dispatch outcome");
  if (v.status === "settled") {
    const p = applicationObject(v, ["status", "result"]);
    return {status: "settled", result: p.result!};
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
  private async prepare(application: string): Promise<string> {
    const root = join(this.dir, "applications");
    await hostDirectory(root);
    // Reservation alone is not application creation. Failed reservations remain counted.
    await hostLease(join(root, ".creation"), "application-creation", async () => {
      let count = 0, exists = false, scanned = 0;
      for await (const entry of await opendir(root)) {
        if (++scanned > APPLICATION_SERVICE_LIMITS.applications + 2) throw new Error("Application directory bound exceeded");
        if (entry.name === ".creation") continue;
        if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("Invalid application directory");
        applicationId(entry.name); count++; exists ||= entry.name === application;
      }
      if (!exists && count >= APPLICATION_SERVICE_LIMITS.applications) throw new Error("Application count exhausted");
      await hostDirectory(this.path(application));
    });
    return this.path(application);
  }
  private async value(ref: Digest): Promise<JsonValue> { return getApplicationRecord(this.store, ref, json); }
  private async snapshot(ref: Digest): Promise<ApplicationSnapshot> {
    const state = await getApplicationRecord(this.store, ref, parseApplicationState);
    const transition = await getApplicationRecord(this.store, state.transition, parseApplicationTransition);
    const revision = await getApplicationRecord(this.store, state.revision, parseApplicationRevision);
    if (state.application !== transition.application || state.application !== revision.application || state.revision !== transition.revision || state.memory !== transition.memory || state.previous !== transition.previous) fail("Application state/transition binding mismatch");
    await this.value(state.memory);
    return {digest: ref, state, transition, revision};
  }
  private checkStep(prior: ApplicationSnapshot | null, next: ApplicationSnapshot): void {
    const {state, transition, revision} = next;
    if (!prior) {
      if (transition.kind !== "create" || state.sequence !== 0 || state.epoch !== 0 || revision.parent !== null) fail("Invalid application origin");
      return;
    }
    if (state.application !== prior.state.application || state.previous !== prior.digest || state.sequence !== prior.state.sequence + 1 || transition.kind === "create") fail("Invalid application state succession");
    const activating = transition.kind === "activate";
    if (state.epoch !== prior.state.epoch + Number(activating)) fail("Invalid activation epoch");
    if (activating) {
      if (state.revision === prior.state.revision || revision.parent !== prior.state.revision || revision.schema !== prior.revision.schema || revision.runtimeProfile !== prior.revision.runtimeProfile || revision.capabilityRequirements.some(c => !prior.revision.capabilityRequirements.includes(c)) || prior.revision.entrypoints.some(e => !revision.entrypoints.some(n => n.name === e.name))) fail("Incompatible application activation");
    } else if (state.revision !== prior.state.revision) fail("Memory/investigation cannot change the revision");
    if (transition.kind === "investigate" && (state.memory !== prior.state.memory || !transition.intents.length)) fail("Invalid investigation transition");
  }
  async history(application: unknown): Promise<ApplicationSnapshot[]> {
    const name = applicationId(application);
    await hostDirectory(this.path(name));
    const raw = await hostRead(join(this.path(name), "head.json"), 512);
    if (raw === undefined) return [];
    const head = parseApplicationHead(raw);
    if (head.application !== name) fail("Application head identity mismatch");
    const history: ApplicationSnapshot[] = [], seen = new Set<Digest>();
    let ref: Digest | null = head.state;
    while (ref !== null) {
      if (history.length >= APPLICATION_LIMITS.states || seen.has(ref)) fail("Application history bound/cycle");
      seen.add(ref);
      const item = await this.snapshot(ref);
      if (item.state.application !== name) fail("Application history identity mismatch");
      history.push(item); ref = item.state.previous;
    }
    history.reverse();
    const operations = new Set<Digest>();
    for (let i = 0; i < history.length; i++) {
      const item = history[i]!;
      this.checkStep(history[i - 1] ?? null, item);
      if (operations.has(item.transition.operation)) fail("Repeated operation in application history");
      operations.add(item.transition.operation);
      await this.intents(item);
    }
    return history;
  }
  async inspect(application: unknown): Promise<ApplicationSnapshot | null> { return (await this.history(application)).at(-1) ?? null; }
  private async intents(snapshot: ApplicationSnapshot): Promise<{ref: Digest; work: WorkIntent}[]> {
    const rows = [];
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
  private async dispatchRecord(application: string, ref: Digest): Promise<ApplicationDispatch | null> {
    const raw = await hostRead(join(this.path(application), "outbox", ref.slice(7) + ".json"), APPLICATION_LIMITS.recordBytes);
    if (raw === undefined) return null;
    const record = parseDispatch(raw);
    if (record.application !== application || record.intent !== ref) fail("Outbox identity mismatch");
    if (record.result !== null) await this.value(record.result);
    return record;
  }
  private async pending(history: ApplicationSnapshot[]): Promise<ApplicationPending[]> {
    const pending: ApplicationPending[] = [];
    let total = 0;
    for (const snapshot of history) for (const {ref, work} of await this.intents(snapshot)) {
      if (++total > APPLICATION_SERVICE_LIMITS.dispatches) throw new Error("Retained application intent bound exceeded");
      const dispatch = await this.dispatchRecord(snapshot.state.application, ref);
      if (dispatch && dispatch.sourceState !== snapshot.digest) fail("Dispatch state binding mismatch");
      if (dispatch?.status !== "settled") pending.push({intent: ref, sourceState: snapshot.digest, work, dispatch});
    }
    if (pending.length > APPLICATION_SERVICE_LIMITS.pending) throw new Error("Pending application intent bound exceeded");
    return pending;
  }
  async create(command: unknown): Promise<ApplicationSnapshot> {
    const parsed = parseApplicationCommand(command);
    if (parsed.kind !== "create" || parsed.expectedHead !== null) throw new Error("create requires a genesis command");
    return this.commit(parsed);
  }
  async commit(input: unknown): Promise<ApplicationSnapshot> {
    const command = parseApplicationCommand(input); // snapshots before the first await
    const path = await this.prepare(command.application);
    return hostLease(path, "application-" + command.application, async () => {
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
      if ((current?.digest ?? null) !== command.expectedHead) throw new AlgalError("RECEIPT_MISMATCH", "Stale application head");
      if (history.length >= APPLICATION_LIMITS.states) throw new Error("Application state bound exhausted");
      const revision = await getApplicationRecord(this.store, command.revision, parseApplicationRevision);
      if (revision.application !== command.application) fail("Revision belongs to another application");
      for (const ref of [command.memory, revision.schema, revision.queries, revision.views, revision.runtimeProfile, revision.evaluationPolicy, ...command.evidence, ...(command.causedBy ? [command.causedBy] : []), ...revision.entrypoints.map(e => e.applicability)]) await this.value(ref);
      for (const entry of revision.entrypoints) if (!await this.store.getManifest(entry.manifest)) fail("Missing entrypoint manifest");
      const pending = await this.pending(history);
      if (pending.length + command.intents.length > APPLICATION_SERVICE_LIMITS.pending) throw new Error("Pending intent capacity exceeded");
      const total = history.reduce((sum, s) => sum + s.transition.intents.length, 0);
      if (total + command.intents.length > APPLICATION_SERVICE_LIMITS.dispatches) throw new Error("Retained intent capacity exceeded");
      if (command.kind === "activate" && pending.some(p => p.dispatch !== null)) throw new Error("Unsettled dispatch blocks activation");
      const intents: WorkIntent[] = command.intents.map((spec, ordinal) => parseWorkIntent({contract: "algal.application-intent.v1", application: command.application, operation: command.operation, ordinal, ...spec}));
      for (const work of intents) {
        await this.value(work.kind === "start-episode" ? work.input : work.message);
        if (work.kind === "start-episode" && !revision.entrypoints.some(e => e.name === work.entrypoint)) fail("Unknown intent entrypoint");
      }
      const transition = parseApplicationTransition({contract: "algal.application-transition.v1", application: command.application, operation: command.operation, request, kind: command.kind, previous: command.expectedHead, revision: command.revision, memory: command.memory, intents: intents.map(hash).sort(), evidence: command.evidence, causedBy: command.causedBy});
      const state = parseApplicationState({contract: "algal.application-state.v1", application: command.application, sequence: history.length, epoch: (current?.state.epoch ?? 0) + Number(command.kind === "activate"), revision: command.revision, memory: command.memory, previous: command.expectedHead, transition: hash(transition)});
      const next = {digest: hash(state), state, transition, revision};
      this.checkStep(current, next);
      const operation: Operation = {contract: "algal.application-operation.v1", application: command.application, operation: command.operation, request, transition: state.transition, state: next.digest};
      if (prepared && !same(prepared, operation)) fail("Prepared operation changed");
      // Copies keep trusted admission from accidentally mutating the prepared commit.
      await this.admission.admitCommit({command: parseApplicationCommand(command), current: structuredClone(current), revision: structuredClone(revision), previousRevision: structuredClone(current?.revision ?? null), pending: structuredClone(pending), store: this.store});
      const operations = await hostNames(join(path, "operations"), APPLICATION_LIMITS.states, /^[a-f0-9]{64}\.json$/);
      if (!prepared && operations.length >= APPLICATION_LIMITS.states) throw new Error("Application operation bound exhausted");
      for (const intent of intents) await putApplicationRecord(this.store, intent);
      await putApplicationRecord(this.store, transition); await putApplicationRecord(this.store, state);
      await hostWrite(operationPath, json(operation), 2048);
      await this.options.fault?.("prepared");
      try {
        await hostWrite(join(path, "head.json"), json({contract: "algal.application-head.v1", application: command.application, state: next.digest}), 512, false);
        await this.options.fault?.("head-published");
      } catch {
        throw new AlgalError("IO_FAILED", "Application commit acknowledgment uncertain; inspect the exact operation", {operation: command.operation}, {uncertain: true});
      }
      return structuredClone(next);
    });
  }
  private async validatePlan(snapshot: ApplicationSnapshot, work: WorkIntent, ref: Digest, plan: ApplicationDispatchPlan): Promise<void> {
    if (work.kind === "deliver") { if (plan.kind !== "delivery") fail("Delivery requires a delivery plan"); return; }
    if (plan.kind !== "episode") fail("Episode requires an episode binding");
    if (plan.kind !== "episode") return;
    const b = plan.binding, entry = snapshot.revision.entrypoints.find(e => e.name === work.entrypoint);
    if (!entry || b.application !== snapshot.state.application || b.intent !== ref || b.sourceState !== snapshot.digest || b.revision !== snapshot.state.revision || b.memory !== snapshot.state.memory || b.epoch !== snapshot.state.epoch || b.entrypoint !== entry.name || b.manifest !== entry.manifest || b.maxGenerations !== entry.maxGenerations || b.process !== applicationProcessName(b.application, ref)) fail("Episode binding does not preserve its captured state");
    await this.value(b.arguments);
  }
  private async execute(snapshot: ApplicationSnapshot, work: WorkIntent, record: ApplicationDispatch, dispatcher: ApplicationDispatcher, reconciliation: boolean): Promise<ApplicationDispatch> {
    if (record.configurationDigest !== dispatcher.configurationDigest) fail("Dispatcher configuration changed");
    const path = join(this.path(record.application), "outbox", record.intent.slice(7) + ".json");
    if (!reconciliation) {
      await hostWrite(path, json(record), APPLICATION_LIMITS.recordBytes);
      await this.options.fault?.("dispatch-started");
    }
    let outcome: ApplicationDispatchOutcome;
    try {
      const context = structuredClone({snapshot, intent: work, dispatch: record});
      outcome = parseOutcome(await (reconciliation ? dispatcher.reconcile!(context) : dispatcher.dispatch(context)));
    } catch {
      outcome = {status: "uncertain", reason: "Dispatcher did not establish settlement; explicit reconciliation required"};
    }
    const updated: ApplicationDispatch = {...record, status: outcome.status, result: outcome.status === "settled" ? await putApplicationRecord(this.store, outcome.result) : null, reason: outcome.status === "settled" ? null : outcome.reason};
    await hostWrite(path, json(updated), APPLICATION_LIMITS.recordBytes, false);
    await this.options.fault?.("dispatch-settled");
    return updated;
  }
  async dispatchPending(application: unknown, dispatcher: ApplicationDispatcher, max: unknown = 32): Promise<ApplicationDispatch[]> {
    const name = applicationId(application), limit = applicationInt(max, 1, APPLICATION_SERVICE_LIMITS.dispatchBatch), configurationDigest = applicationRef(dispatcher.configurationDigest);
    const bound: ApplicationDispatcher = {configurationDigest, dispatch: dispatcher.dispatch.bind(dispatcher)};
    await this.prepare(name);
    return hostLease(this.path(name), "application-" + name, async () => {
      const history = await this.history(name), pending = await this.pending(history), results: ApplicationDispatch[] = [];
      for (const row of pending.slice(0, limit)) {
        if (row.dispatch) { results.push(row.dispatch); continue; } // Never automatically repeat an uncertain or blocked admission.
        if (!this.admission.admitDispatch) throw new AlgalError("CAPABILITY_DENIED", "Trusted dispatch admission is required");
        const snapshot = history.find(s => s.digest === row.sourceState)!;
        const plan = parsePlan(await this.admission.admitDispatch({snapshot: structuredClone(snapshot), intent: structuredClone(row.work), store: this.store}));
        await this.validatePlan(snapshot, row.work, row.intent, plan);
        if (plan.kind === "episode" && plan.binding.access === "external-write" && snapshot.state.epoch !== history.at(-1)!.state.epoch) throw new Error("Stale episode cannot acquire an external writer");
        if (plan.kind === "episode") await putApplicationRecord(this.store, plan.binding);
        const record: ApplicationDispatch = {contract: "algal.application-dispatch.v1", application: name, intent: row.intent, sourceState: snapshot.digest, configurationDigest, identity: dispatchIdentity(name, row.intent, plan), plan, status: "started", result: null, reason: null};
        results.push(await this.execute(snapshot, row.work, record, bound, false));
      }
      return structuredClone(results);
    });
  }
  async reconcileDispatch(application: unknown, intent: unknown, dispatcher: ApplicationDispatcher): Promise<ApplicationDispatch> {
    const name = applicationId(application), ref = applicationRef(intent), config = applicationRef(dispatcher.configurationDigest), reconcile = dispatcher.reconcile?.bind(dispatcher);
    if (!reconcile) throw new Error("Explicit dispatcher reconciliation is required");
    await this.prepare(name);
    return hostLease(this.path(name), "application-" + name, async () => {
      const history = await this.history(name);
      const row = (await this.pending(history)).find(p => p.intent === ref);
      if (!row) {
        const settled = await this.dispatchRecord(name, ref);
        if (settled?.status === "settled" && history.some(s => s.digest === settled.sourceState && s.transition.intents.includes(ref))) return settled;
        throw new Error("No reachable unsettled dispatch");
      }
      if (!row.dispatch) throw new Error("Dispatch has not been admitted");
      const snapshot = history.find(s => s.digest === row.sourceState)!;
      await this.validatePlan(snapshot, row.work, ref, row.dispatch.plan);
      return this.execute(snapshot, row.work, row.dispatch, {configurationDigest: config, dispatch: dispatcher.dispatch.bind(dispatcher), reconcile}, true);
    });
  }
}
