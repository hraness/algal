/** Portable owner-local task lifecycle. There is deliberately no dispatcher. */
import { ApplicationCore, type ApplicationSnapshot, type ApplicationAdmission } from "../../src/application-core";
import { MemoryApplicationStorage, type ApplicationStorage } from "../../src/application-storage";
import { utf8Length } from "../../src/utf8";
import { applicationJson, getApplicationRecord, parseApplicationHead, parseApplicationRevision, parseApplicationState, parseApplicationTransition } from "../../src/application-contract";
import { ApplicationMemoryService, APPLICATION_MEMORY_NATIVE_LIMITS, parseMemorySnapshot, parseMemoryObservation, type MemoryClaim, type MemoryAdmissionHost, type MemoryQueryEngine } from "../../src/application-memory";
import { migrateApplicationMemory, parseApplicationMigration, verifyApplicationMigration } from "../../src/application-migration";
import { digestCanonical, type Digest } from "../../src/digest";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { runOrganism, parseRunReceipt, type RunReceipt } from "../../src/run";
import { builtinRegistry } from "../../src/registry";
import { verifyReceipt } from "../../src/verify";
import type { Store } from "../../src/store-contract";
import { canonicalize, type JsonValue } from "../../src/values";
import { DEFAULT_CONFIG, DEFAULT_SESSION, MAX_TASKS, MAX_STATES, object, id, reference, parseTasks, parseSession, parseCommand, parseProposal, type Config, type Task, type Session, type SessionRecord, type SessionLoad, type Command, type Proposal, type Revision, type Evaluation, type Capture, type Transfer, type MergeReview, type FieldConflict } from "./contract";
import { makeRevision, parseRevision, evaluateView, updateTasks, viewManifest, updateManifest, claimsManifest, migrationManifest } from "./programs";

export const hash = (value: unknown): Digest => digestCanonical(applicationJson(value));
const same = (a: unknown, b: unknown) => hash(a) === hash(b);
export const TRIAGE_SESSION_BYTES = 4096;
/** Session records are renderer state, separate from authoritative task facts.
 * Compare-and-set must hold one owner across the read and durable write. */
export interface TriageSessionStorage {
  read(application: string, sessionId: string): Promise<JsonValue | undefined>;
  compareAndSet(application: string, sessionId: string, expected: Digest | null, value: JsonValue): Promise<void>;
}
export class SlotTriageSessionStorage implements TriageSessionStorage {
  constructor(private readonly storage: ApplicationStorage) {}
  private key(application: string, sessionId: string): string {
    // Keep the name within the storage port's 64-character identifier limit.
    return `triage-session-${hash({ application: id(application), session: id(sessionId) }).slice(7, 55)}`;
  }
  async read(application: string, sessionId: string): Promise<JsonValue | undefined> {
    const value = await this.storage.store.getSlot(this.key(application, sessionId));
    if (value !== undefined && utf8Length(canonicalize(value)) > TRIAGE_SESSION_BYTES) throw new Error("Session byte bound exceeded; saved data preserved");
    return value;
  }
  async compareAndSet(application: string, sessionId: string, expected: Digest | null, value: JsonValue): Promise<void> {
    const key = this.key(application, sessionId), record = applicationJson(value);
    if (utf8Length(canonicalize(record)) > TRIAGE_SESSION_BYTES) throw new Error("Session byte bound exceeded");
    if (expected !== null) reference(expected);
    await this.storage.custody(key, false, async () => {
      const retained = await this.read(application, sessionId);
      if ((retained === undefined ? null : hash(retained)) !== expected) throw new Error("Newer session draft exists; explicit merge required");
      await this.storage.store.setSlot(key, record);
    });
  }
}
export type TriageEvaluationDetails = {
  reference: Digest; evaluation: Evaluation; capture: Capture;
  preview: { definition: Revision; view: Capture["view"]; why: Capture["why"] };
};
const PROFILE = { contract: "algal.triage-host-profile.v1", effects: "none", maxTasks: MAX_TASKS, maxStates: MAX_STATES };
const POLICY = { contract: "algal.application-evaluation-policy.v1", maxCases: 8, maxWork: 800000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: false };
const EXPORT_BYTES = 8_388_608;
export type TriageTransferVerification = { ok: true; states: number; receipts: number; head: Digest };
/** Only a fresh, private memory copy owns these immutable proofs. Limits apply
 * across all proof categories; a full memo merely falls back to verification. */
class ProofMemo {
  private readonly values = new Map<string, unknown>();
  private bytes = 0;
  async prove<T>(key: string, action: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    return cached === undefined ? this.set(key, await action()) : cached;
  }
  get<T>(key: string): T | undefined { return structuredClone(this.values.get(key)) as T | undefined; }
  set<T>(key: string, value: T): T {
    if (!this.values.has(key) && this.values.size < 1024) {
      const bytes = utf8Length(key) + utf8Length(JSON.stringify(value));
      if (this.bytes + bytes <= EXPORT_BYTES) { this.values.set(key, structuredClone(value)); this.bytes += bytes; }
    }
    return value;
  }
  clear(): void { this.values.clear(); this.bytes = 0; }
}
async function verifyPureReceipt(store: Store, receipt: RunReceipt, manifest: OrganismManifest, memo?: ProofMemo): Promise<void> {
  const key = `receipt:${hash(receipt)}:${hash(manifestToJson(manifest))}`;
  const prove = async () => {
    if (!(await verifyReceipt(applicationJson(receipt), manifestToJson(manifest), store)).ok) throw new Error("Triage receipt replay failed");
    return true;
  };
  if (memo) await memo.prove(key, prove); else await prove();
}
const engine: MemoryQueryEngine = { identity: hash({ contract: "algal.triage-direct-projection.v1" }), async query() { throw new Error("Triage uses direct admitted task projection, not a Datalog query engine"); }, async verify() { return false; }, async settle() {} };
export async function pureRun(store: Store, manifest: OrganismManifest, input: Record<string, JsonValue>): Promise<{ receipt: RunReceipt; reference: Digest; value: JsonValue }> {
  const args = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, { value }]));
  const receipt = await runOrganism({ manifest, args, store, fns: builtinRegistry(), executors: [] });
  if (receipt.outcome !== "complete" || receipt.cells.result?.outputs?.out === undefined) throw new Error(`Pure triage execution failed: ${receipt.outcome}`);
  await store.putValue(applicationJson(receipt));
  return { receipt, reference: await store.putReceipt(applicationJson(receipt)), value: receipt.cells.result.outputs.out };
}
async function replay(store: Store, ref: Digest, manifest: OrganismManifest, input: Record<string, JsonValue>, output: unknown, memo?: ProofMemo): Promise<void> {
  const receipt = await getApplicationRecord(store, ref, parseRunReceipt), retained = await store.getReceipt(ref);
  const retainedManifest = await store.getManifest(hash(manifestToJson(manifest)));
  if (retained === undefined || !same(retained, receipt) || !retainedManifest || !same(manifestToJson(retainedManifest), manifestToJson(manifest))) throw new Error("Missing retained triage receipt or manifest");
  const args = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, { value }]));
  if (!same(receipt.args, args) || receipt.outcome !== "complete" || !same(receipt.cells.result?.outputs?.out, output)) throw new Error("Triage receipt binding/replay failed");
  await verifyPureReceipt(store, receipt, manifest, memo);
}
function tasksFromClaims(claims: MemoryClaim[], schemaVersion: 1 | 2): Task[] {
  return parseTasks(claims.map(c => {
    if (c.relation !== "task" || c.polarity !== "supported" || c.tuple.length !== (schemaVersion === 1 ? 4 : 5)) throw new Error("Invalid task claim");
    return { id: c.tuple[0], title: c.tuple[1], priority: c.tuple[2], status: c.tuple[3], category: schemaVersion === 1 ? "inbox" : c.tuple[4] };
  }));
}
type Fixed = { schema: Digest; decoder: Digest; procedure: Digest; query: Digest; scope: Digest; queries: Digest; views: Digest; runtimeProfile: Digest; evaluationPolicy: Digest };
type Origin = { contract: "algal.triage-origin.v1"; tasks: Task[]; source: Digest | null };
type MergeAdoption = { contract: "algal.triage-merge-adoption.v1"; review: Digest; resolutions: { taskId: string; field: FieldConflict["field"]; value: string }[] };

export class TriageCore {
  readonly service: ApplicationCore;
  readonly memory: ApplicationMemoryService;
  readonly application: string;
  private proofMemo: ProofMemo | undefined;
  private provenHead: Digest | undefined;
  private retainedHistory: { head: Digest | null; snapshots: ApplicationSnapshot[] } | undefined;
  constructor(readonly storage: ApplicationStorage, application = "local-triage", readonly sessions: TriageSessionStorage = new SlotTriageSessionStorage(storage)) {
    this.application = id(application);
    const admission: ApplicationAdmission = { admitCommit: context => this.admit(context) };
    this.service = new ApplicationCore(storage, admission);
    const memoryAdmission: MemoryAdmissionHost = {
      identity: hash({ contract: "algal.triage-memory-admission.v1", application }),
      currentFrontier: async () => this.frontier(),
      validateScope: async ({ scope, frontier, attestation }) => {
        if (scope.application !== this.application || scope.frontier !== await this.frontier() || frontier.status !== "settled" || scope.environment !== "owner-local" || scope.task !== "task-triage" || scope.bindings.length || !same(attestation, { contract: "algal.triage-owner-scope.v1", application: this.application })) throw new Error("Unadmitted local scope");
        const known = [await this.fixed(1), await this.fixed(2)];
        if (scope.completeFor.length !== 1 || !known.some(f => f.procedure === scope.completeFor[0])) throw new Error("Unadmitted triage procedure");
      },
      decodeObservation: async ({ observation, raw, procedure }) => {
        const key = `observation:${this.application}:${hash({ observation, raw, procedure })}`;
        const prove = async (): Promise<MemoryClaim[]> => {
        const version = procedure.schema === (await this.fixed(1)).schema ? 1 : procedure.schema === (await this.fixed(2)).schema ? 2 : null;
        if (!version) throw new Error("Unknown task schema");
        const fixed = await this.fixed(version);
        if (observation.decoder !== fixed.decoder || observation.procedure !== fixed.procedure) throw new Error("Unadmitted task decoder");
        if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.contract === "algal.application-migration.v1") {
          const migration = parseApplicationMigration(raw);
          if (version !== 2 || migration.application !== this.application || migration.program !== hash(manifestToJson(migrationManifest())) || migration.receipt !== observation.receipt) throw new Error("Unadmitted migration");
          await verifyApplicationMigration(this.service.store, migration, observation.scope);
          tasksFromClaims(migration.claims, 2);
          return migration.claims;
        }
        const v = object(raw, ["contract", "tasks", "schemaVersion", "receipt", "previous"]);
        if (v.contract !== "algal.triage-facts.v1" || v.schemaVersion !== version || v.receipt !== observation.receipt) throw new Error("Unbound task facts");
        const tasks = parseTasks(v.tasks); if (v.previous !== null) reference(v.previous);
        if (version === 1 && tasks.some(t => t.category !== "inbox")) throw new Error("v1 cannot retain category facts");
        const claims = tasks.map(t => ({ relation: "task", tuple: [t.id, t.title, t.priority, t.status, ...(version === 2 ? [t.category] : [])], polarity: "supported" as const }));
        await replay(this.service.store, observation.receipt, claimsManifest(version), { tasks }, { claims }, this.proofMemo);
        return claims;
        };
        return this.proofMemo ? this.proofMemo.prove(key, prove) : prove();
      },
    };
    this.memory = new ApplicationMemoryService({ store: this.service.store, engine, admission: memoryAdmission });
  }
  private put(value: unknown): Promise<Digest> { return this.service.store.putValue(applicationJson(value)); }
  private frontier(): Promise<Digest> { return Promise.resolve(hash({ contract: "algal.application-memory-frontier.v1", application: this.application, previous: null, sequence: 0, mutation: null, status: "settled" })); }
  /** Expected metadata is derived without writing during reads/admission.
   * Only explicit revision construction installs these retained records. */
  private async fixed(version: 1 | 2, mode: "references" | "install" | "verify" = "references"): Promise<Fixed> {
    const key = `fixed:${this.application}:${version}:${mode}`;
    const prove = async (): Promise<Fixed> => {
    const values: JsonValue[] = [], value = (input: unknown): Digest => { const item = applicationJson(input); values.push(item); return hash(item); };
    const schema = value({ contract: "algal.application-memory-schema.v1", relations: [{ name: "task", arity: version === 1 ? 4 : 5 }] });
    const decoder = value({ contract: "algal.triage-decoder.v1", schemaVersion: version });
    const manifest = claimsManifest(version), manifestRef = hash(manifestToJson(manifest));
    const procedure = value({ contract: "algal.application-memory-procedure.v1", id: "task-facts", schema, manifest: manifestRef, decoder, dependencies: [], prerequisite: null });
    const queryProgram = value({ contract: "algal.query.v1", rules: [], query: { relation: "task", terms: [...["id", "title", "priority", "status", ...(version === 2 ? ["category"] : []), "polarity"].map(name => ({ var: name }))] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
    const query = value({ contract: "algal.application-memory-query.v1", id: "tasks", schema, program: queryProgram, procedures: [procedure], polarityColumn: version === 1 ? 4 : 5, conflict: "set-of-values" });
    const frontier = value({ contract: "algal.application-memory-frontier.v1", application: this.application, previous: null, sequence: 0, mutation: null, status: "settled" });
    const attestation = value({ contract: "algal.triage-owner-scope.v1", application: this.application });
    const scope = value({ contract: "algal.application-memory-scope.v1", application: this.application, environment: "owner-local", task: "task-triage", frontier, bindings: [], completeFor: [procedure], attestation });
    const result = { schema, decoder, procedure, query, scope, queries: value({ contract: "algal.application-memory-queries.v1", queries: [query] }), views: value({ contract: "algal.application-view-spec.v1", title: "Local triage", widgets: ["memory", "history"] }), runtimeProfile: value(PROFILE), evaluationPolicy: value(POLICY) };
    if (mode === "install") {
      await this.service.store.putManifest(manifest);
      for (const item of values) await this.put(item);
    } else if (mode === "verify") {
      const retained = await this.service.store.getManifest(manifestRef);
      if (!retained || !same(manifestToJson(retained), manifestToJson(manifest))) throw new Error("Missing retained triage facts manifest");
      for (const item of values) if (!same(await getApplicationRecord(this.service.store, hash(item), applicationJson), item)) throw new Error("Retained triage metadata mismatch");
    }
    return result;
    };
    return mode !== "install" && this.proofMemo ? this.proofMemo.prove(key, prove) : prove();
  }
  private async revisionRecord(definition: Revision, parent: Digest | null, install = true): Promise<Digest> {
    const r = parseRevision(definition), fixed = await this.fixed(r.schemaVersion, install ? "install" : "references"), manifests = [updateManifest(), viewManifest(r)];
    const record = { contract: "algal.application-revision.v1", application: this.application, parent, schema: fixed.schema, queries: fixed.queries, views: fixed.views, runtimeProfile: fixed.runtimeProfile, evaluationPolicy: fixed.evaluationPolicy, capabilityRequirements: [], entrypoints: manifests.map((m, i) => ({ name: i === 0 ? "update" : "view", manifest: hash(manifestToJson(m)), applicability: fixed.query, maxGenerations: 1, capabilities: [], queries: [fixed.query] })) };
    if (!install) return hash(record);
    for (const manifest of manifests) await this.service.store.putManifest(manifest);
    return this.put(record);
  }
  private async definition(revisionRef: Digest): Promise<Revision> {
    const key = `definition:${this.application}:${revisionRef}`;
    const prove = async (): Promise<Revision> => {
    const r = await getApplicationRecord(this.service.store, revisionRef, parseApplicationRevision);
    const m = await this.service.store.getManifest(r.entrypoints.find(e => e.name === "view")?.manifest ?? revisionRef);
    const cell = m?.cells.find(c => c.id === "definition"); if (!cell || cell.kind !== "const") throw new Error("Missing triage definition");
    const definition = parseRevision(cell.outputs.value?.value);
    if (revisionRef !== await this.revisionRecord(definition, r.parent, false)) throw new Error("Unadmitted triage revision or authority");
    await this.fixed(definition.schemaVersion, "verify");
    for (const entry of r.entrypoints) if (!await this.service.store.getManifest(entry.manifest)) throw new Error("Missing retained triage entrypoint manifest");
    return definition;
    };
    return this.proofMemo ? this.proofMemo.prove(key, prove) : prove();
  }
  private async tasks(snapshot: ApplicationSnapshot): Promise<Task[]> {
    const key = `tasks:${this.application}:${hash({ revision: snapshot.state.revision, memory: snapshot.state.memory, revisionRecord: snapshot.revision })}`;
    const prove = async (): Promise<Task[]> => {
    const definition = await this.definition(snapshot.state.revision);
    const memory = await this.memory.validateForRevision(snapshot.state.memory, snapshot.revision);
    const active = memory.observations.filter(ref => !memory.withdrawn.includes(ref));
    if (active.length !== 1 || memory.hypotheses.length || memory.archive !== undefined) throw new Error("Task snapshot must select exactly one complete fact observation");
    const tasks = tasksFromClaims((await getApplicationRecord(this.service.store, active[0]!, parseMemoryObservation)).claims, definition.schemaVersion);
    return tasks;
    };
    return this.proofMemo ? this.proofMemo.prove(key, prove) : prove();
  }
  private async facts(tasksInput: Task[], version: 1 | 2, previous: Digest | null): Promise<Digest> {
    const tasks = parseTasks(tasksInput), fixed = await this.fixed(version), execution = await pureRun(this.service.store, claimsManifest(version), { tasks });
    const raw = await this.put({ contract: "algal.triage-facts.v1", tasks, schemaVersion: version, receipt: execution.reference, previous });
    const observation = await this.memory.observe({ application: this.application, scope: fixed.scope, procedure: fixed.procedure, raw, receipt: execution.reference, decoder: fixed.decoder });
    const prior = previous ? await getApplicationRecord(this.service.store, previous, parseMemorySnapshot) : null;
    return this.memory.snapshot({ application: this.application, schema: fixed.schema, previous, scope: fixed.scope, observations: [...new Set([...(prior?.observations ?? []), observation])].sort(), hypotheses: [], withdrawn: (prior?.observations ?? []).filter(r => r !== observation).sort() });
  }
  async current(): Promise<ApplicationSnapshot> { const current = this.proofMemo ? (await this.history()).at(-1) : await this.service.inspect(this.application); if (!current) throw new Error("Initialize this local triage application first"); return current; }
  /** Recheck saved history without installing any records. In particular, an
   * update/proposal must not recreate missing manifests or old evidence. */
  async verifySourceClosure(): Promise<void> {
    if (!this.proofMemo) {
      if (await this.storage.readHead(this.application) === undefined) return;
      return this.withVerifiedSource(async () => undefined);
    }
    const history = await this.history(), head = history.at(-1)?.digest;
    if (head !== undefined && this.provenHead === head) return;
    let current: ApplicationSnapshot | null = null;
    for (const snapshot of history) {
      const t = snapshot.transition;
      await this.admit({
        command: { application: this.application, operation: t.operation, kind: t.kind, expectedHead: t.previous, revision: t.revision, memory: t.memory, intents: [], evidence: t.evidence, causedBy: t.causedBy },
        current, revision: snapshot.revision, previousRevision: current?.revision ?? null,
        pending: [], store: this.service.store,
      });
      if (t.intents.length) throw new Error("Triage history cannot carry external effect authority");
      current = snapshot;
    }
    this.provenHead = head;
  }
  private async history(): Promise<ApplicationSnapshot[]> {
    if (!this.proofMemo) return this.service.history(this.application);
    const raw = await this.storage.readHead(this.application), pointer = raw === undefined ? null : parseApplicationHead(raw);
    if (pointer !== null && pointer.application !== this.application) throw new Error("Triage head application mismatch");
    const head = pointer?.state ?? null;
    if (this.retainedHistory?.head !== head) this.retainedHistory = { head, snapshots: await this.service.history(this.application) };
    return structuredClone(this.retainedHistory.snapshots);
  }
  private async exact(expected: Digest): Promise<ApplicationSnapshot> { const current = await this.current(); if (current.digest !== expected) throw new Error("Stale triage head; capture and explicitly rebase the command"); return current; }
  private async at(head: Digest): Promise<ApplicationSnapshot> { const snapshot = (await this.history()).find(s => s.digest === head); if (!snapshot) throw new Error("Unknown retained triage head"); return snapshot; }
  private async captureAt(snapshot: ApplicationSnapshot, input: Session): Promise<Capture> {
    const session = parseSession(input), definition = await this.definition(snapshot.state.revision), tasks = await this.tasks(snapshot), view = evaluateView(definition, tasks, session);
    return { contract: "algal.triage-capture.v1", application: this.application, head: snapshot.digest, revision: snapshot.state.revision, memory: snapshot.state.memory, sequence: snapshot.state.sequence, definition, tasks, session, view, capacity: { tasks: MAX_TASKS - tasks.length, states: MAX_STATES - snapshot.state.sequence - 1 }, evidence: snapshot.transition.evidence, why: view.groups.flatMap(g => g.tasks.map((row, index) => ({ taskId: row.task.id, reason: `${view.ordering} Group ${g.label}, position ${index + 1}; facts from ${snapshot.state.memory}.` }))) };
  }
  async capture(session: Session = DEFAULT_SESSION): Promise<Capture> {
    if (!this.proofMemo) return this.withVerifiedSource(core => core.capture(session));
    await this.verifySourceClosure();
    return this.captureAt(await this.current(), session);
  }
  async loadSession(sessionId: string): Promise<SessionLoad> {
    const raw = await this.sessions.read(this.application, id(sessionId));
    if (raw === undefined) return { record: null, reference: null, status: "missing", reason: null };
    const v = object(raw, ["contract", "application", "capturedHead", "capturedRevision", "schemaVersion", "session"]);
    if (v.contract !== "algal.triage-session-record.v1" || v.application !== this.application || (v.schemaVersion !== 1 && v.schemaVersion !== 2)) throw new Error("Invalid retained session; saved data preserved for reconciliation");
    const record: SessionRecord = { contract: v.contract, application: this.application, capturedHead: reference(v.capturedHead), capturedRevision: reference(v.capturedRevision), schemaVersion: v.schemaVersion, session: parseSession(v.session) };
    const current = await this.capture(), origin = await this.at(record.capturedHead);
    if (origin.state.revision !== record.capturedRevision || (await this.definition(origin.state.revision)).schemaVersion !== record.schemaVersion) throw new Error("Retained session binding changed; saved data preserved");
    const reason = current.head !== record.capturedHead ? "Authoritative state changed; draft retained. Capture and explicitly rebase before submission." : record.session.draft.taskId !== null && !current.tasks.some(t => t.id === record.session.draft.taskId) ? "Draft names a missing task; retained for explicit recovery." : null;
    return { record, reference: hash(record), status: reason ? "stale" : "current", reason };
  }
  async saveSession(sessionId: string, input: { expectedSession: Digest | null; capturedHead: Digest; session: Session }): Promise<SessionLoad> {
    const v = object(input, ["expectedSession", "capturedHead", "session"]), expectedSession = v.expectedSession === null ? null : reference(v.expectedSession), capturedHead = reference(v.capturedHead), session = parseSession(v.session);
    await this.verifySourceClosure();
    const current = await this.captureAt(await this.exact(capturedHead), session);
    if (session.draft.taskId !== null && !current.tasks.some(t => t.id === session.draft.taskId)) throw new Error("Draft task is absent; recover or clear it explicitly");
    if (current.definition.schemaVersion === 1 && session.draft.category !== "inbox") throw new Error("Draft category needs schema v2");
    const record: SessionRecord = { contract: "algal.triage-session-record.v1", application: this.application, capturedHead, capturedRevision: current.revision, schemaVersion: current.definition.schemaVersion, session };
    await this.sessions.compareAndSet(this.application, id(sessionId), expectedSession, applicationJson(record));
    return this.loadSession(sessionId);
  }
  async initialize(input: { schemaVersion?: 1 | 2; config?: Config; tasks?: Task[] } = {}, source: Digest | null = null): Promise<Capture> {
    const definition = makeRevision(input.config ?? DEFAULT_CONFIG, input.schemaVersion ?? 1), tasks = parseTasks(input.tasks ?? []);
    await this.verifySourceClosure();
    if (await this.storage.readHead(this.application) === undefined && await this.storage.operationCount(this.application) !== 0) throw new Error("Prepared triage creation requires exact retained-operation recovery");
    const revision = await this.revisionRecord(definition, null), memory = await this.facts(tasks, definition.schemaVersion, null);
    const origin = await this.put({ contract: "algal.triage-origin.v1", tasks, source });
    const snapshot = await this.service.create({ application: this.application, operation: hash({ kind: "create", revision, memory, origin }), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [origin], causedBy: null });
    return this.captureAt(snapshot, DEFAULT_SESSION);
  }
  async command(input: Command): Promise<Capture> {
    const command = parseCommand(input);
    await this.verifySourceClosure();
    const prior = await this.at(command.expectedHead), definition = await this.definition(prior.state.revision), before = await this.tasks(prior), after = updateTasks(before, command.action, definition);
    const execution = await pureRun(this.service.store, updateManifest(), { tasks: before, action: command.action });
    const memory = await this.facts(after, definition.schemaVersion, prior.state.memory), evidence = await this.put({ contract: "algal.triage-change.v1", command, receipt: execution.reference });
    const snapshot = await this.service.commit({ application: this.application, operation: command.operation, kind: "memory", expectedHead: command.expectedHead, revision: prior.state.revision, memory, intents: [], evidence: [evidence], causedBy: null });
    return this.captureAt(snapshot, DEFAULT_SESSION);
  }
  private evaluationChecks(proposal: Proposal, before: Revision, definition: Revision, tasks: Task[]) {
    const checks = [{ name: "schema-forward-only", passed: proposal.schemaVersion >= before.schemaVersion }, { name: "configuration-changes", passed: !same(before, definition) }, { name: "facts-and-task-capacity-preserved", passed: tasks.length <= MAX_TASKS }];
    for (const session of [DEFAULT_SESSION, { ...DEFAULT_SESSION, filter: "open" as const }, { ...DEFAULT_SESSION, filter: "done" as const }]) {
      const view = evaluateView(definition, tasks, session), visible = view.groups.flatMap(g => g.tasks.map(row => row.task));
      checks.push({ name: `filter-${session.filter}-preserves-exact-facts`, passed: visible.length === tasks.filter(t => session.filter === "all" || t.status === session.filter).length && visible.every(t => tasks.some(old => same(t, old))) && new Set(visible.map(t => t.id)).size === visible.length });
    }
    return checks;
  }
  private async evaluate(proposal: Proposal): Promise<{ evaluation: Evaluation; definition: Revision }> {
    const prior = await this.at(proposal.expectedHead), before = await this.definition(prior.state.revision), definition = makeRevision(proposal.config, proposal.schemaVersion), tasks = await this.tasks(prior);
    const candidateRevision = await this.revisionRecord(definition, prior.state.revision), checks = this.evaluationChecks(proposal, before, definition, tasks), receipts: Digest[] = [];
    for (const session of [DEFAULT_SESSION, { ...DEFAULT_SESSION, filter: "open" as const }, { ...DEFAULT_SESSION, filter: "done" as const }]) receipts.push((await pureRun(this.service.store, viewManifest(definition), { tasks, session })).reference);
    const evaluation: Evaluation = { contract: "algal.triage-evaluation.v1", expectedHead: proposal.expectedHead, proposal: await this.put(proposal), candidateRevision, accepted: checks.every(c => c.passed), checks, receipts };
    return { evaluation, definition };
  }
  async proposeEvaluate(input: Proposal): Promise<TriageEvaluationDetails> {
    const proposal = parseProposal(input);
    await this.verifySourceClosure();
    const current = await this.exact(proposal.expectedHead), { evaluation, definition } = await this.evaluate(proposal), reference = await this.put(evaluation), capture = await this.captureAt(current, DEFAULT_SESSION);
    const view = evaluateView(definition, capture.tasks, capture.session);
    return { reference, evaluation, capture, preview: { definition, view, why: view.groups.flatMap(g => g.tasks.map((row, index) => ({ taskId: row.task.id, reason: `${view.ordering} Preview group ${g.label}, position ${index + 1}; unchanged facts from ${capture.memory}.` }))) } };
  }
  private async evaluation(ref: Digest, requireAccepted = true): Promise<Evaluation> {
    const key = `evaluation:${ref}`, cached = this.proofMemo?.get<Evaluation>(key);
    if (cached) { if (requireAccepted && !cached.accepted) throw new Error("Rejected or forged evaluation"); return cached; }
    const raw = await getApplicationRecord(this.service.store, ref, value => object(value, ["contract", "expectedHead", "proposal", "candidateRevision", "accepted", "checks", "receipts"]));
    if (raw.contract !== "algal.triage-evaluation.v1" || !Array.isArray(raw.receipts) || raw.receipts.length !== 3) throw new Error("Invalid retained evaluation");
    const proposal = await getApplicationRecord(this.service.store, reference(raw.proposal), parseProposal), prior = await this.at(proposal.expectedHead), before = await this.definition(prior.state.revision), definition = await this.definition(reference(raw.candidateRevision)), tasks = await this.tasks(prior);
    if (!same(definition, makeRevision(proposal.config, proposal.schemaVersion))) throw new Error("Evaluation candidate differs from proposal");
    const checks = this.evaluationChecks(proposal, before, definition, tasks), receipts = raw.receipts.map(reference);
    const sessions = [DEFAULT_SESSION, { ...DEFAULT_SESSION, filter: "open" as const }, { ...DEFAULT_SESSION, filter: "done" as const }];
    for (const [i, session] of sessions.entries()) await replay(this.service.store, receipts[i]!, viewManifest(definition), { tasks, session }, evaluateView(definition, tasks, session), this.proofMemo);
    const expected: Evaluation = { contract: "algal.triage-evaluation.v1", expectedHead: proposal.expectedHead, proposal: hash(proposal), candidateRevision: await this.revisionRecord(definition, prior.state.revision, false), accepted: checks.every(c => c.passed), checks, receipts };
    if (!same(raw, expected) || (requireAccepted && !expected.accepted)) throw new Error("Rejected or forged evaluation"); return this.proofMemo?.set(key, expected) ?? expected;
  }
  /** Reopen an existing proposal without rerunning construction or healing its
   * dependencies. Rejected evaluations remain inspectable, never adoptable. */
  async inspectEvaluation(input: Digest): Promise<TriageEvaluationDetails> {
    const ref = reference(input);
    if (!this.proofMemo) return this.withVerifiedSource(core => core.inspectEvaluation(ref), [ref]);
    await this.verifySourceClosure();
    const evaluation = await this.evaluation(ref, false), prior = await this.at(evaluation.expectedHead);
    const capture = await this.captureAt(prior, DEFAULT_SESSION), definition = await this.definition(evaluation.candidateRevision);
    const view = evaluateView(definition, capture.tasks, capture.session);
    return { reference: ref, evaluation, capture, preview: { definition, view, why: view.groups.flatMap(g => g.tasks.map((row, index) => ({ taskId: row.task.id, reason: `${view.ordering} Preview group ${g.label}, position ${index + 1}; unchanged facts from ${capture.memory}.` }))) } };
  }
  async adopt(evaluationRef: Digest, operation: Digest): Promise<Capture> {
    await this.verifySourceClosure();
    const evaluation = await this.evaluation(reference(evaluationRef)), prior = await this.at(evaluation.expectedHead), definition = await this.definition(evaluation.candidateRevision);
    let memory = prior.state.memory, kind: "activate" | "migrate" = "activate", evidence = [evaluationRef];
    if (prior.revision.schema !== (await this.fixed(definition.schemaVersion)).schema) {
      const fixed = await this.fixed(2), migrated = await migrateApplicationMemory(this.memory, { application: this.application, from: prior.state.memory, schema: fixed.schema, scope: fixed.scope, program: await this.service.store.putManifest(migrationManifest()), procedure: fixed.procedure, decoder: fixed.decoder, previousRevision: prior.state.revision, candidateRevision: evaluation.candidateRevision }, { fns: builtinRegistry() });
      memory = migrated.snapshot; kind = "migrate"; evidence = [...evidence, migrated.migration].sort();
    }
    const snapshot = await this.service.commit({ application: this.application, operation: reference(operation), kind, expectedHead: evaluation.expectedHead, revision: evaluation.candidateRevision, memory, intents: [], evidence, causedBy: null });
    return this.captureAt(snapshot, DEFAULT_SESSION);
  }
  private async admit({ command, current, revision, pending }: Parameters<ApplicationAdmission["admitCommit"]>[0]): Promise<void> {
    if (command.application !== this.application || command.intents.length || command.causedBy !== null || pending.length || (current && current.state.sequence >= MAX_STATES - 1)) throw new Error("Triage authority/state capacity exceeded");
    await this.definition(command.revision);
    const synthetic: ApplicationSnapshot = { digest: command.expectedHead ?? hash("origin"), state: { contract: "algal.application-state.v1", application: this.application, sequence: 0, epoch: 0, revision: command.revision, memory: command.memory, previous: null, transition: hash("admission") }, transition: current?.transition ?? {} as ApplicationSnapshot["transition"], revision };
    const nextTasks = await this.tasks(synthetic);
    if (!current) {
      if (command.kind !== "create" || command.evidence.length !== 1) throw new Error("Invalid triage origin");
      const raw = await this.service.store.getValue(command.evidence[0]!), v = object(raw, ["contract", "tasks", "source"]);
      if (v.contract !== "algal.triage-origin.v1" || !same(nextTasks, parseTasks(v.tasks))) throw new Error("Origin task binding mismatch");
      if (v.source !== null) {
        const source = await this.readTransfer(reference(v.source));
        const sourceState = await this.transferCapture(source);
        if (source.application === this.application || !same(nextTasks, sourceState.tasks) || !same(await this.definition(command.revision), sourceState.definition)) throw new Error("Fork must preserve source data/configuration under a new identity");
      }
      return;
    }
    if (command.kind === "memory") {
      if (command.evidence.length !== 1) throw new Error("Task changes require exact evidence");
      const raw = await this.service.store.getValue(command.evidence[0]!);
      if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.contract === "algal.triage-change.v1") {
        const v = object(raw, ["contract", "command", "receipt"]), change = parseCommand(v.command);
        if (change.expectedHead !== current.digest || change.operation !== command.operation) throw new Error("Task command/head identity mismatch");
        const before = await this.tasks(current), after = updateTasks(before, change.action, await this.definition(current.state.revision));
        if (!same(nextTasks, after)) throw new Error("Task update differs from expression");
        await replay(this.service.store, reference(v.receipt), updateManifest(), { tasks: before, action: change.action }, after, this.proofMemo);
      } else {
        const v = object(raw, ["contract", "review", "resolutions"]);
        if (v.contract !== "algal.triage-merge-adoption.v1") throw new Error("Unknown task change evidence");
        const review = await this.mergeReview(reference(v.review));
        if (review.expectedHead !== current.digest || !same(nextTasks, this.resolve(review, v.resolutions))) throw new Error("Merge resolution/head mismatch");
      }
      const mem = await getApplicationRecord(this.service.store, command.memory, parseMemorySnapshot);
      if (mem.previous !== current.state.memory) throw new Error("Task memory must extend current facts");
      return;
    }
    if (command.kind === "activate" || command.kind === "migrate") {
      const evaluations = await Promise.all(command.evidence.map(async ref => ({ ref, raw: await this.service.store.getValue(ref) })));
      const row = evaluations.find(r => r.raw && typeof r.raw === "object" && !Array.isArray(r.raw) && r.raw.contract === "algal.triage-evaluation.v1");
      if (!row) throw new Error("Adoption requires retained independent evaluation");
      const evaluation = await this.evaluation(row.ref);
      if (evaluation.expectedHead !== current.digest || evaluation.candidateRevision !== command.revision || !same(nextTasks, await this.tasks(current))) throw new Error("Adoption must preserve current task facts");
      if (command.kind === "activate" && (command.memory !== current.state.memory || command.evidence.length !== 1)) throw new Error("Workflow revision preserves memory");
      if (command.kind === "migrate" && command.evidence.length !== 2) throw new Error("Migration needs exact evidence");
      return;
    }
    throw new Error("Unadmitted triage transition kind");
  }

  /** Read the live closure before copying it. A callback owns one isolated
   * proof scope; the next public call always rereads the live evidence. */
  async withVerifiedSource<T>(callback: (core: TriageCore) => Promise<T>, extraEvaluations: Digest[] = []): Promise<T> {
    if (!Array.isArray(extraEvaluations) || extraEvaluations.length > 32) throw new Error("Extra evaluation export bound exceeded");
    const refs = extraEvaluations.map(reference), roots = [...refs];
    for (const ref of refs) {
      const raw = await getApplicationRecord(this.service.store, ref, value => object(value, ["contract", "expectedHead", "proposal", "candidateRevision", "accepted", "checks", "receipts"]));
      if (raw.contract !== "algal.triage-evaluation.v1") throw new Error("Invalid retained evaluation");
      const definition = await this.definition(reference(raw.candidateRevision));
      roots.push((await this.fixed(definition.schemaVersion)).scope);
    }
    const transfer = await this.exportRecords(roots);
    return TriageCore.withVerifiedTransfer(transfer, async core => {
      for (const ref of refs) await core.inspectEvaluation(ref);
      return callback(core);
    }, this.sessions);
  }
  /** Internal construction boundary: no caller can enable memoization on a
   * supplied live driver. Even an escaped core loses all proofs on scope exit. */
  static async withVerifiedTransfer<T>(input: unknown, callback: (core: TriageCore, verdict: TriageTransferVerification) => Promise<T>, sessions?: TriageSessionStorage, depth = 0): Promise<T> {
    if (depth > 8) throw new Error("Fork ancestry verification bound exceeded");
    const transfer = parseTransfer(input), storage = new MemoryApplicationStorage();
    // A simulation may inspect durable drafts, but only the live core can
    // persist one against its published head. Default sessions stay private.
    const scopedSessions: TriageSessionStorage = sessions === undefined ? new SlotTriageSessionStorage(storage) : {
      read: (application, sessionId) => sessions.read(application, sessionId),
      compareAndSet: async () => { throw new Error("Isolated verification sessions are read-only; use the live core to save a draft"); },
    };
    const core = new TriageCore(storage, transfer.application, scopedSessions);
    await copyRecords(storage.store, transfer);
    const memo = new ProofMemo(); core.proofMemo = memo;
    try {
      const genesis = await getApplicationRecord(storage.store, transfer.states[0]!, parseApplicationState), genesisTransition = await getApplicationRecord(storage.store, genesis.transition, parseApplicationTransition);
      const origin = object(await storage.store.getValue(genesisTransition.evidence[0]!), ["contract", "tasks", "source"]);
      if (origin.source !== null) await verifyTransfer(await core.readTransfer(reference(origin.source)), depth + 1);
      for (const head of transfer.states) {
        const state = await getApplicationRecord(storage.store, head, parseApplicationState), transition = await getApplicationRecord(storage.store, state.transition, parseApplicationTransition);
        if (state.application !== transfer.application || transition.intents.length || transition.causedBy !== null) throw new Error("Transfer cannot carry external effect authority");
        const snapshot = await core.service.commit({ application: transition.application, operation: transition.operation, kind: transition.kind, expectedHead: transition.previous, revision: transition.revision, memory: transition.memory, intents: [], evidence: transition.evidence, causedBy: null });
        if (snapshot.digest !== head) throw new Error("Transfer lifecycle replay mismatch");
      }
      // Each exact transition just passed admission in this private driver.
      core.provenHead = transfer.head;
      await core.capture();
      let receipts = 0;
      for (const row of transfer.records) if (row.kind === "receipt" || (row.value && typeof row.value === "object" && !Array.isArray(row.value) && row.value.contract === "algal.run.v1")) {
        const receipt = parseRunReceipt(row.value), manifest = await storage.store.getManifest(receipt.manifestDigest);
        if (receipt.effects.length) throw new Error("Transfer contains external effect evidence");
        if (!manifest) throw new Error("Transfer receipt manifest missing");
        await verifyPureReceipt(storage.store, receipt, manifest, memo); receipts++;
      }
      return await callback(core, { ok: true, states: transfer.states.length, receipts, head: transfer.head });
    } finally {
      memo.clear(); core.proofMemo = undefined; core.provenHead = undefined; core.retainedHistory = undefined;
    }
  }

  async export(extraEvaluations: Digest[] = []): Promise<Transfer> {
    if (!Array.isArray(extraEvaluations) || extraEvaluations.length > 32) throw new Error("Extra evaluation export bound exceeded");
    const refs = extraEvaluations.map(reference);
    if (!this.proofMemo) return this.withVerifiedSource(core => core.export(refs), refs);
    await this.verifySourceClosure();
    const roots = [...refs];
    for (const ref of refs) {
      const evaluation = await this.evaluation(ref, false), definition = await this.definition(evaluation.candidateRevision);
      // A schema-changing proposal has no target memory yet. Its scope,
      // frontier and attestation are still required by revision verification.
      // definition() checked those saved records; deriving their refs writes none.
      roots.push((await this.fixed(definition.schemaVersion)).scope);
    }
    const transfer = await this.exportRecords(roots);
    // The public transfer has historically normalized all run records into
    // receipt rows. Normalize only after source verification; private snapshots
    // retain the actual row kinds so copying cannot repair missing aliases.
    return { ...transfer, records: transfer.records.map(row => row.value && typeof row.value === "object" && !Array.isArray(row.value) && row.value.contract === "algal.run.v1" ? { ...row, kind: "receipt" as const } : row) };
  }
  private async exportRecords(extra: Digest[] = []): Promise<Transfer> {
    const history = await this.history(), states = history.map(s => s.digest);
    if (!states.length || states.length > MAX_STATES) throw new Error("Invalid task history export");
    const records: Transfer["records"] = [], seen = new Set<Digest>(), pending = [...states, ...extra]; let bytes = 0;
    while (pending.length) {
      const ref = pending.pop()!; if (seen.has(ref)) continue; seen.add(ref); if (seen.size > 8192) throw new Error("Export reference bound");
      let value = await this.service.store.getValue(ref), kind: Transfer["records"][number]["kind"] = "value";
      if (value === undefined) { const manifest = await this.service.store.getManifest(ref); if (manifest) value = manifestToJson(manifest); kind = "manifest"; }
      if (value === undefined) { value = await this.service.store.getReceipt(ref); kind = "receipt"; }
      if (value === undefined) continue;
      if (value && typeof value === "object" && !Array.isArray(value) && value.contract === "algal.run.v1") {
        const receipt = await this.service.store.getReceipt(ref), alias = await this.service.store.getValue(ref);
        if (alias === undefined || (receipt !== undefined && (!same(receipt, alias) || hash(receipt) !== ref))) throw new Error("Missing or inconsistent retained triage receipt");
        // Core migrations deliberately retain a value-only run record. Keep
        // its row kind: copying must never manufacture a missing receipt row.
        // Triage's pure receipts require both aliases during admission.
        kind = receipt === undefined ? "value" : "receipt";
      } else if (value && typeof value === "object" && !Array.isArray(value) && value.contract === "algal.organism.v1") {
        const manifest = await this.service.store.getManifest(ref);
        if (!manifest || !same(manifestToJson(manifest), value)) throw new Error("Missing or inconsistent retained triage manifest");
        kind = "manifest";
      }
      const record = { kind, reference: ref, value }; bytes += utf8Length(canonicalize(applicationJson(record)));
      if (bytes > EXPORT_BYTES - 65536 || records.length >= 1024) throw new Error("Export byte/record capacity exceeded");
      records.push(record);
      const scan = (v: JsonValue): void => { if (typeof v === "string" && /^sha256:[a-f0-9]{64}$/.test(v)) pending.push(v as Digest); else if (v && typeof v === "object") Object.values(v).forEach(scan); }; scan(value);
    }
    return { contract: "algal.triage-transfer.v1", claim: "portable-data-and-pure-replay", application: this.application, head: states.at(-1)!, states, records: records.sort((a, b) => a.reference.localeCompare(b.reference)) };
  }
  async import(input: Transfer): Promise<{ reference: Digest; application: string; head: Digest; duplicate: boolean }> {
    const transfer = parseTransfer(input);
    await this.verifySourceClosure();
    const index = { contract: "algal.triage-transfer-index.v1", application: transfer.application, head: transfer.head, states: transfer.states, records: transfer.records.map(r => ({ kind: r.kind, reference: r.reference })) }, ref = hash(index), duplicate = await this.service.store.getValue(ref) !== undefined;
    if (duplicate) {
      const retained = await this.readTransfer(ref);
      if (!same(retained, transfer)) throw new Error("Retained transfer index differs from import");
      await verifyTransfer(retained);
    } else { await verifyTransfer(transfer); await copyRecords(this.service.store, transfer); await this.put(index); }
    return { reference: ref, application: transfer.application, head: transfer.head, duplicate };
  }
  async readTransfer(ref: Digest): Promise<Transfer> {
    const index = await this.readTransferIndex(ref), records = [];
    for (const row of index.records) records.push({ kind: row.kind, reference: row.reference, value: await this.readTransferRow(row.kind, row.reference) });
    return parseTransfer({ contract: "algal.triage-transfer.v1", claim: "portable-data-and-pure-replay", application: index.application, head: index.head, states: index.states, records });
  }
  /** The saved index names each row's kind and reference. Row content is read
   * separately so a caller can reuse a row it already reread and rehashed. */
  async readTransferIndex(ref: Digest): Promise<{ application: string; head: Digest; states: Digest[]; records: { kind: Transfer["records"][number]["kind"]; reference: Digest }[] }> {
    const raw = await getApplicationRecord(this.service.store, ref, v => object(v, ["contract", "application", "head", "states", "records"]));
    if (raw.contract !== "algal.triage-transfer-index.v1" || !Array.isArray(raw.records) || raw.records.length > 1024 || !Array.isArray(raw.states) || !raw.states.length || raw.states.length > MAX_STATES) throw new Error("Invalid transfer index");
    const records: { kind: Transfer["records"][number]["kind"]; reference: Digest }[] = raw.records.map(item => {
      const r = object(item, ["kind", "reference"]);
      if (r.kind !== "value" && r.kind !== "manifest" && r.kind !== "receipt") throw new Error("Invalid transfer record kind");
      return { kind: r.kind, reference: reference(r.reference) };
    });
    const states = raw.states.map(reference), head = reference(raw.head);
    if (new Set(states).size !== states.length || states.at(-1) !== head || new Set(records.map(r => r.reference)).size !== records.length) throw new Error("Tampered or duplicate transfer content");
    return { application: id(raw.application), head, states, records };
  }
  /** Receipt rows need both retained aliases. The returned content is bound to
   * its reference by the caller's hash check, never by this read alone. */
  async readTransferRow(kind: Transfer["records"][number]["kind"], ref: Digest): Promise<JsonValue> {
    const value = kind === "manifest" ? await this.service.store.getManifest(ref).then(m => m ? manifestToJson(m) : undefined) : kind === "receipt" ? await this.service.store.getReceipt(ref) : await this.service.store.getValue(ref);
    if (value === undefined) throw new Error("Missing transfer index content");
    if (kind === "receipt") { const retainedValue = await this.service.store.getValue(ref); if (retainedValue === undefined || !same(retainedValue, value)) throw new Error("Missing or inconsistent retained transfer receipt"); }
    return value;
  }
  private async transferCapture(transfer: Transfer): Promise<Capture> {
    const source = new TriageCore(this.storage, transfer.application, this.sessions);
    source.proofMemo = this.proofMemo;
    const state = await getApplicationRecord(this.service.store, transfer.head, parseApplicationState), transition = await getApplicationRecord(this.service.store, state.transition, parseApplicationTransition), revision = await getApplicationRecord(this.service.store, state.revision, parseApplicationRevision);
    return source.captureAt({ digest: transfer.head, state, transition, revision }, DEFAULT_SESSION);
  }
  async fork(input: Transfer, newApplication: string): Promise<Capture> {
    const imported = await this.import(input), transfer = await this.readTransfer(imported.reference), captured = await this.transferCapture(transfer);
    if (id(newApplication) === transfer.application) throw new Error("Fork needs a new application identity");
    return new TriageCore(this.storage, newApplication, this.sessions).initialize({ schemaVersion: captured.definition.schemaVersion, config: captured.definition.config, tasks: captured.tasks }, imported.reference);
  }
  async reviewMerge(expectedHead: Digest, source: Digest): Promise<{ reference: Digest; review: MergeReview }> {
    await this.verifySourceClosure();
    await this.exact(expectedHead); const review = await this.computeMerge(expectedHead, source); return { reference: await this.put(review), review };
  }
  private async computeMerge(expectedHead: Digest, source: Digest): Promise<MergeReview> {
    const local = await this.captureAt(await this.at(expectedHead), DEFAULT_SESSION), incomingTransfer = await this.readTransfer(source), incoming = await this.transferCapture(incomingTransfer);
    if (local.definition.schemaVersion !== incoming.definition.schemaVersion) throw new Error("Explicit schema migration required before merge");
    const localTransfer = await this.exportRecords();
    localTransfer.states = localTransfer.states.slice(0, localTransfer.states.indexOf(expectedHead) + 1); localTransfer.head = expectedHead;
    const ancestors = async (t: Transfer): Promise<Map<Digest, Task[]>> => {
      const result = new Map<Digest, Task[]>(); let current: Transfer | null = t; let count = 0;
      while (current) {
        if (++count > 8) throw new Error("Fork ancestry bound exceeded");
        const sourceHost = new TriageCore(this.storage, current.application, this.sessions);
        sourceHost.proofMemo = this.proofMemo;
        for (const head of [...current.states].reverse()) {
          const state = await getApplicationRecord(this.service.store, head, parseApplicationState), transition = await getApplicationRecord(this.service.store, state.transition, parseApplicationTransition), revision = await getApplicationRecord(this.service.store, state.revision, parseApplicationRevision);
          result.set(head, await sourceHost.tasks({ digest: head, state, transition, revision }));
        }
        const genesis = await getApplicationRecord(this.service.store, current.states[0]!, parseApplicationState), transition = await getApplicationRecord(this.service.store, genesis.transition, parseApplicationTransition), origin = await this.service.store.getValue(transition.evidence[0]!) as Origin;
        current = origin.source ? await this.readTransfer(origin.source) : null;
      }
      return result;
    };
    const ours = await ancestors(localTransfer), theirs = await ancestors(incomingTransfer), common = [...ours.keys()].find(key => theirs.has(key));
    if (!common) throw new Error("No shared retained ancestor; import remains inspectable and separate");
    const base = ours.get(common)!, tasks = structuredClone(local.tasks), conflicts: FieldConflict[] = [];
    for (const remote of incoming.tasks) {
      const target = tasks.find(t => t.id === remote.id), original = base.find(t => t.id === remote.id);
      if (!target) { tasks.push(remote); continue; }
      for (const field of ["title", "priority", "status", "category"] as const) {
        if (target[field] === remote[field] || remote[field] === original?.[field]) continue;
        if (original && target[field] === original[field]) Object.assign(target, { [field]: remote[field] });
        else conflicts.push({ taskId: target.id, field, base: original?.[field] ?? null, local: target[field], incoming: remote[field] });
      }
    }
    return { contract: "algal.triage-merge.v1", expectedHead, source, tasks: parseTasks(tasks), conflicts };
  }
  private async mergeReview(ref: Digest): Promise<MergeReview> {
    const raw = await this.service.store.getValue(ref), v = object(raw, ["contract", "expectedHead", "source", "tasks", "conflicts"]);
    if (v.contract !== "algal.triage-merge.v1") throw new Error("Invalid merge review");
    const expected = await this.computeMerge(reference(v.expectedHead), reference(v.source));
    if (!same(raw, expected)) throw new Error("Forged merge review"); return expected;
  }
  private resolve(review: MergeReview, input: unknown): Task[] {
    if (!Array.isArray(input) || input.length !== review.conflicts.length || input.length > MAX_TASKS * 4) throw new Error("Every field conflict needs one explicit resolution");
    const tasks = structuredClone(review.tasks), seen = new Set<string>();
    for (const raw of input) { const r = object(raw, ["taskId", "field", "value"]), conflict = review.conflicts.find(c => c.taskId === r.taskId && c.field === r.field); if (!conflict || typeof r.value !== "string" || seen.has(`${conflict.taskId}/${conflict.field}`)) throw new Error("Unknown/duplicate conflict resolution"); seen.add(`${conflict.taskId}/${conflict.field}`); Object.assign(tasks.find(t => t.id === conflict.taskId)!, { [conflict.field]: r.value }); }
    return parseTasks(tasks);
  }
  async adoptMerge(reviewRef: Digest, resolutions: MergeAdoption["resolutions"], operation: Digest): Promise<Capture> {
    await this.verifySourceClosure();
    const review = await this.mergeReview(reference(reviewRef)), prior = await this.at(review.expectedHead), tasks = this.resolve(review, resolutions), definition = await this.definition(prior.state.revision), memory = await this.facts(tasks, definition.schemaVersion, prior.state.memory);
    const evidence = await this.put({ contract: "algal.triage-merge-adoption.v1", review: reviewRef, resolutions });
    const snapshot = await this.service.commit({ application: this.application, operation: reference(operation), kind: "memory", expectedHead: review.expectedHead, revision: prior.state.revision, memory, intents: [], evidence: [evidence], causedBy: null });
    return this.captureAt(snapshot, DEFAULT_SESSION);
  }
}

export function parseTransfer(input: unknown): Transfer {
  const encoded = JSON.stringify(input); if (!encoded || utf8Length(encoded) > EXPORT_BYTES) throw new Error("Transfer byte bound exceeded");
  const v = object(input, ["contract", "claim", "application", "head", "states", "records"]);
  if (v.contract !== "algal.triage-transfer.v1" || v.claim !== "portable-data-and-pure-replay" || !Array.isArray(v.states) || !v.states.length || v.states.length > MAX_STATES || !Array.isArray(v.records) || v.records.length > 1024) throw new Error("Invalid transfer bounds/contract");
  const states = v.states.map(reference), records: Transfer["records"] = v.records.map(raw => { const r = object(raw, ["kind", "reference", "value"]); if (r.kind !== "value" && r.kind !== "manifest" && r.kind !== "receipt") throw new Error("Invalid transfer record kind"); return { kind: r.kind, reference: reference(r.reference), value: applicationJson(r.value) }; });
  if (new Set(states).size !== states.length || states.at(-1) !== v.head || new Set(records.map(r => r.reference)).size !== records.length || records.some(r => hash(r.value) !== r.reference)) throw new Error("Tampered or duplicate transfer content");
  return { contract: v.contract, claim: v.claim, application: id(v.application), head: reference(v.head), states, records };
}
async function copyRecords(store: Store, transfer: Transfer): Promise<void> {
  for (const r of transfer.records) {
    if (r.kind === "manifest") {
      const manifest = parseOrganismManifest(r.value);
      if (manifest.cells.some(c => !["input", "const", "expr"].includes(c.kind)) || manifest.budgets.maxAgentCalls !== 0) throw new Error("Transfer contains an effect-capable manifest");
      await store.putManifest(manifest);
    } else if (r.kind === "receipt") {
      const receipt = parseRunReceipt(r.value);
      if (receipt.effects.length) throw new Error("Transfer contains external effect evidence");
      await store.putReceipt(r.value); await store.putValue(r.value);
    } else await store.putValue(r.value);
  }
}
export async function withVerifiedTransfer<T>(input: unknown, callback: (core: TriageCore, verdict: TriageTransferVerification) => Promise<T>, sessions?: TriageSessionStorage): Promise<T> {
  return TriageCore.withVerifiedTransfer(input, callback, sessions);
}
export async function verifyTransfer(input: unknown, depth = 0): Promise<TriageTransferVerification> {
  return TriageCore.withVerifiedTransfer(input, async (_core, verdict) => verdict, undefined, depth);
}
