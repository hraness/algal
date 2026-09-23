/** Bounded read-only diagnostic closure. Retained verification flags are
 * producer claims; collection grants no authority and performs no replay. */
import type { ApplicationService, ApplicationSnapshot, ApplicationDispatch } from "./application";
import { APPLICATION_LIMITS, applicationId, applicationInt, applicationJson, applicationList, applicationObject, applicationRef, applicationRefs, applicationTag, getApplicationRecord, nullableApplicationRef, parseApplicationState, parseApplicationRevision, parseApplicationTransition, parseWorkIntent, type ApplicationTransition, type WorkIntent } from "./application-contract";
import { parseInvestigationRequest } from "./application-investigation";
import { parseMemoryDerivation, parseMemoryNativeProgram, parseMemoryObservation, parseMemoryProcedure, parseMemoryQueries, parseMemoryQuery, parseMemoryScope, parseMemorySnapshot, type MemoryDerivation, type MemoryStatus } from "./application-memory";
import { BOUNDS } from "./contract";
import { digestCanonical, type Digest } from "./digest";

export type ApplicationViewQueryEvidence = {query: Digest; id: string; program: Digest; derivation: Digest | null; status: MemoryStatus; reason: string | null; result: Digest | null; facts: Digest | null; sourceRefs: Digest[]; procedures: Digest[]; claimedVerified: boolean};
export type ApplicationViewProbeEvidence = {procedure: Digest; id: string; manifest: Digest; decoder: Digest; dependencies: string[]; prerequisite: Digest | null; budgets: {maxSteps: number; maxWork: number; maxAgentCalls: number; maxOutputBytes: number} | null};
export type ApplicationViewSourceEvidence = {observation: Digest; scope: Digest; procedure: Digest; raw: Digest; receipt: Digest; decoder: Digest; admission: Digest};
export type ApplicationViewRevisionEvidence = {state: Digest; revision: Digest; parent: Digest | null; kind: ApplicationTransition["kind"]; evidence: Digest[]};
export type ApplicationViewWorkEvidence = {intent: Digest; sourceState: Digest; revision: Digest; memory: Digest; kind: "deliver" | "start-episode"; status: "pending" | ApplicationDispatch["status"]; request: Digest | null; query: Digest | null; procedures: Digest[]; process: string | null; binding: Digest | null; result: Digest | null; reason: string | null};
export type ApplicationViewEvidence = {contract: "algal.application-view-evidence.v1"; state: Digest; memory: Digest; queries: ApplicationViewQueryEvidence[]; probes: ApplicationViewProbeEvidence[]; sources: ApplicationViewSourceEvidence[]; revisions: ApplicationViewRevisionEvidence[]; work: ApplicationViewWorkEvidence[]; truncated: {queries: boolean; probes: boolean; sources: boolean; revisions: boolean; work: boolean}};
const statuses = ["supported", "opposed", "conflicted", "unknown", "stale", "exhausted", "failed", "cancelled"];
const kinds = ["create", "memory", "investigate", "activate", "migrate", "restore", "propose"];
const fail = (message: string): never => { throw new Error("View evidence: " + message); };
function text(value: unknown, max = 1024): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !value.length || Buffer.byteLength(value) > max || value.includes("\0")) fail("invalid reason");
  return value as string;
}
function sorted<T>(rows: T[], key: (row: T) => string): T[] {
  if (rows.some((row, i) => i > 0 && key(rows[i - 1]!) >= key(row))) fail("rows must be sorted and unique");
  return rows;
}
export function parseApplicationViewEvidence(input: unknown, state?: Digest, memory?: Digest): ApplicationViewEvidence {
  const v = applicationObject(input, ["contract", "state", "memory", "queries", "probes", "sources", "revisions", "work", "truncated"]);
  applicationTag(v.contract, "algal.application-view-evidence.v1");
  const capturedState = applicationRef(v.state), capturedMemory = applicationRef(v.memory);
  if ((state !== undefined && state !== capturedState) || (memory !== undefined && memory !== capturedMemory)) fail("crosses captured state or memory");
  const queries = sorted(applicationList(v.queries, 32, raw => {
    const q = applicationObject(raw, ["query", "id", "program", "derivation", "status", "reason", "result", "facts", "sourceRefs", "procedures", "claimedVerified"]);
    if (!statuses.includes(String(q.status)) || typeof q.claimedVerified !== "boolean") fail("invalid query status");
    const row: ApplicationViewQueryEvidence = {query: applicationRef(q.query), id: applicationId(q.id), program: applicationRef(q.program), derivation: nullableApplicationRef(q.derivation), status: q.status as MemoryStatus, reason: text(q.reason, 256), result: nullableApplicationRef(q.result), facts: nullableApplicationRef(q.facts), sourceRefs: applicationRefs(q.sourceRefs, 128), procedures: applicationRefs(q.procedures, 16), claimedVerified: q.claimedVerified as boolean};
    if (row.derivation === null && (row.status !== "unknown" || row.result !== null || row.facts !== null || row.sourceRefs.length || row.claimedVerified || row.reason !== null)) fail("unproduced query claims evidence");
    if (["supported", "opposed", "conflicted"].includes(row.status) && (!row.claimedVerified || row.result === null || row.facts === null)) fail("resolved query lacks evidence");
    return row;
  }), q => q.query);
  const probes = sorted(applicationList(v.probes, 32, raw => {
    const p = applicationObject(raw, ["procedure", "id", "manifest", "decoder", "dependencies", "prerequisite", "budgets"]), b = p.budgets === null ? null : applicationObject(p.budgets, ["maxSteps", "maxWork", "maxAgentCalls", "maxOutputBytes"]);
    const dependencies = sorted(applicationList(p.dependencies, 8, applicationId), id => id);
    return {procedure: applicationRef(p.procedure), id: applicationId(p.id), manifest: applicationRef(p.manifest), decoder: applicationRef(p.decoder), dependencies, prerequisite: nullableApplicationRef(p.prerequisite), budgets: b === null ? null : {maxSteps: applicationInt(b.maxSteps, 1, BOUNDS.maxSteps), maxWork: applicationInt(b.maxWork, 1, BOUNDS.maxWork), maxAgentCalls: applicationInt(b.maxAgentCalls, 0, BOUNDS.maxAgentCalls), maxOutputBytes: applicationInt(b.maxOutputBytes, 1, BOUNDS.maxOutputBytes)}};
  }), p => p.procedure);
  const sources = sorted(applicationList(v.sources, 32, raw => {
    const s = applicationObject(raw, ["observation", "scope", "procedure", "raw", "receipt", "decoder", "admission"]);
    return {observation: applicationRef(s.observation), scope: applicationRef(s.scope), procedure: applicationRef(s.procedure), raw: applicationRef(s.raw), receipt: applicationRef(s.receipt), decoder: applicationRef(s.decoder), admission: applicationRef(s.admission)};
  }), s => s.observation);
  const revisions = applicationList(v.revisions, 32, raw => {
    const r = applicationObject(raw, ["state", "revision", "parent", "kind", "evidence"]);
    if (!kinds.includes(String(r.kind))) fail("invalid transition kind");
    return {state: applicationRef(r.state), revision: applicationRef(r.revision), parent: nullableApplicationRef(r.parent), kind: r.kind as ApplicationTransition["kind"], evidence: applicationRefs(r.evidence, 16)};
  });
  if (!revisions.length || revisions.at(-1)!.state !== capturedState || new Set(revisions.map(r => r.state)).size !== revisions.length) fail("revision history does not terminate at captured state");
  const work = applicationList(v.work, 32, raw => {
    const w = applicationObject(raw, ["intent", "sourceState", "revision", "memory", "kind", "status", "request", "query", "procedures", "process", "binding", "result", "reason"]);
    if ((w.kind !== "deliver" && w.kind !== "start-episode") || !["pending", "started", "settled", "blocked", "uncertain"].includes(String(w.status))) fail("invalid work status/kind");
    const row: ApplicationViewWorkEvidence = {intent: applicationRef(w.intent), sourceState: applicationRef(w.sourceState), revision: applicationRef(w.revision), memory: applicationRef(w.memory), kind: w.kind as ApplicationViewWorkEvidence["kind"], status: w.status as ApplicationViewWorkEvidence["status"], request: nullableApplicationRef(w.request), query: nullableApplicationRef(w.query), procedures: applicationRefs(w.procedures, 16), process: w.process === null ? null : applicationId(w.process), binding: nullableApplicationRef(w.binding), result: nullableApplicationRef(w.result), reason: text(w.reason)};
    if ((row.request === null) !== (row.query === null) || (row.request === null && row.procedures.length) || (row.kind === "start-episode" && row.request !== null) || (row.process === null) !== (row.binding === null) || (row.kind === "deliver" && row.process !== null)) fail("inconsistent work binding");
    if ((row.status === "settled") !== (row.result !== null) || ((row.status === "blocked" || row.status === "uncertain") !== (row.reason !== null)) || (row.status === "pending" && row.process !== null)) fail("inconsistent work settlement");
    return row;
  });
  if (new Set(work.map(w => w.intent)).size !== work.length) fail("duplicate work intent");
  const t = applicationObject(v.truncated, ["queries", "probes", "sources", "revisions", "work"]);
  for (const value of Object.values(t)) if (typeof value !== "boolean") fail("invalid truncation marker");
  return {contract: "algal.application-view-evidence.v1", state: capturedState, memory: capturedMemory, queries, probes, sources, revisions, work, truncated: t as ApplicationViewEvidence["truncated"]};
}

/** The caller supplies one history() read. Immutable evidence is fenced to its
 * last state; mutable work rows are separately observed, never a new head. */
export async function collectApplicationViewEvidence(service: ApplicationService, history: ApplicationSnapshot[], derivations: Digest[] = []): Promise<ApplicationViewEvidence> {
  if (!history.length || history.length > APPLICATION_LIMITS.states) fail("invalid history bound");
  const snapshot = history.at(-1)!, store = service.store, application = snapshot.state.application;
  for (let i = 0; i < history.length; i++) {
    const row = history[i]!;
    if (row.state.application !== application || row.revision.application !== application || digestCanonical(applicationJson(row.state)) !== row.digest || digestCanonical(applicationJson(row.revision)) !== row.state.revision || digestCanonical(applicationJson(row.transition)) !== row.state.transition || row.state.sequence !== i || row.state.previous !== (history[i - 1]?.digest ?? null)) fail("inconsistent captured history");
    await getApplicationRecord(store, row.digest, parseApplicationState);
    await getApplicationRecord(store, row.state.revision, parseApplicationRevision);
    await getApplicationRecord(store, row.state.transition, parseApplicationTransition);
  }
  const memory = await getApplicationRecord(store, snapshot.state.memory, parseMemorySnapshot);
  if (memory.application !== application || memory.schema !== snapshot.revision.schema) fail("memory belongs to another captured application");
  const bundle = await getApplicationRecord(store, snapshot.revision.queries, parseMemoryQueries);
  const active = memory.observations.filter(ref => !memory.withdrawn.includes(ref)), supplied = new Map<Digest, {ref: Digest; value: MemoryDerivation}>();
  for (const ref of applicationRefs(derivations, 32)) {
    const d = await getApplicationRecord(store, ref, parseMemoryDerivation);
    if (d.application !== application || d.capturedState !== snapshot.digest || d.memory !== snapshot.state.memory || !bundle.queries.includes(d.query) || supplied.has(d.query) || d.sourceRefs.some(source => !active.includes(source))) fail("derivation crosses captured state or sources");
    supplied.set(d.query, {ref, value: d});
  }
  const queries: ApplicationViewQueryEvidence[] = [], procedureRefs = new Set<Digest>();
  for (const ref of bundle.queries) {
    const query = await getApplicationRecord(store, ref, parseMemoryQuery);
    if (query.schema !== snapshot.revision.schema) fail("query schema differs from revision");
    await getApplicationRecord(store, query.program, parseMemoryNativeProgram);
    const d = supplied.get(ref);
    if (d && d.value.program !== query.program) fail("derivation program differs from query");
    for (const procedure of query.procedures) procedureRefs.add(procedure);
    queries.push({query: ref, id: query.id, program: query.program, derivation: d?.ref ?? null, status: d?.value.status ?? "unknown", reason: d?.value.reason ?? null, result: d?.value.result ?? null, facts: d?.value.snapshot ?? null, sourceRefs: d?.value.sourceRefs ?? [], procedures: query.procedures, claimedVerified: d?.value.verified ?? false});
  }
  const selectedProbes = [...procedureRefs].sort(), probes: ApplicationViewProbeEvidence[] = [];
  for (const ref of selectedProbes.slice(0, 32)) {
    const procedure = await getApplicationRecord(store, ref, parseMemoryProcedure), manifest = await store.getManifest(procedure.manifest);
    if (procedure.schema !== snapshot.revision.schema) return fail("probe schema differs from revision");
    let budgets: ApplicationViewProbeEvidence["budgets"] = null;
    if (manifest) {
      const {maxSteps, maxWork, maxAgentCalls, maxOutputBytes} = manifest.budgets;
      budgets = {maxSteps, maxWork, maxAgentCalls, maxOutputBytes};
    } else await getApplicationRecord(store, procedure.manifest, applicationJson);
    probes.push({procedure: ref, id: procedure.id, manifest: procedure.manifest, decoder: procedure.decoder, dependencies: procedure.dependencies, prerequisite: procedure.prerequisite, budgets});
  }
  const sources: ApplicationViewSourceEvidence[] = [];
  for (const ref of active.slice(0, 32)) {
    const observation = await getApplicationRecord(store, ref, parseMemoryObservation), scope = await getApplicationRecord(store, observation.scope, parseMemoryScope), procedure = await getApplicationRecord(store, observation.procedure, parseMemoryProcedure);
    if (observation.application !== application || scope.application !== application || procedure.schema !== memory.schema || procedure.decoder !== observation.decoder) fail("source crosses application or procedure binding");
    const {scope: scopeRef, procedure: procedureRef, raw, receipt, decoder, admission} = observation;
    sources.push({observation: ref, scope: scopeRef, procedure: procedureRef, raw, receipt, decoder, admission});
  }
  const allWork: {source: ApplicationSnapshot; ref: Digest; work: WorkIntent}[] = [];
  for (const source of history) {
    const rows = await Promise.all(source.transition.intents.map(async ref => ({ref, work: await getApplicationRecord(store, ref, parseWorkIntent)})));
    rows.sort((a, b) => a.work.ordinal - b.work.ordinal);
    for (const [index, row] of rows.entries()) {
      if (row.work.application !== application || row.work.operation !== source.transition.operation || row.work.ordinal !== index) fail("intent crosses originating transition");
      allWork.push({source, ...row});
      if (allWork.length > 4096) fail("work history bound exceeded");
    }
  }
  const work: ApplicationViewWorkEvidence[] = [];
  for (const {source, ref, work: intent} of allWork.slice(-32)) {
    const dispatch = await service.readDispatch(application, ref, intent, source);
    if (dispatch && dispatch.sourceState !== source.digest) fail("dispatch crosses originating state");
    let request: Digest | null = null, query: Digest | null = null, procedures: Digest[] = [];
    if (intent.kind === "deliver") {
      const raw = await getApplicationRecord(store, intent.message, applicationJson);
      if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.contract === "algal.application-investigation-request.v1") {
        const r = parseInvestigationRequest(raw), original = history.find(s => s.digest === r.state && s.state.sequence <= source.state.sequence);
        const entry = original?.revision.entrypoints.find(e => e.name === r.entrypoint), q = await getApplicationRecord(store, r.query, parseMemoryQuery), d = await getApplicationRecord(store, r.derivation, parseMemoryDerivation);
        if (!original || r.application !== application || r.memory !== original.state.memory || entry?.applicability !== r.query || digestCanonical(r.procedures) !== digestCanonical(q.procedures) || d.application !== application || d.capturedState !== r.state || d.memory !== r.memory || d.query !== r.query || d.program !== q.program || d.status === "supported") fail("investigation crosses originating query/state");
        request = intent.message; query = r.query; procedures = r.procedures;
      }
    }
    const binding = dispatch?.plan.kind === "episode" ? dispatch.plan.binding : null;
    work.push({intent: ref, sourceState: source.digest, revision: source.state.revision, memory: source.state.memory, kind: intent.kind, status: dispatch?.status ?? "pending", request, query, procedures, process: binding?.process ?? null, binding: binding ? digestCanonical(applicationJson(binding)) : null, result: dispatch?.result ?? null, reason: dispatch?.reason ?? null});
  }
  const revisions = history.slice(-32).map(row => ({state: row.digest, revision: row.state.revision, parent: row.revision.parent, kind: row.transition.kind, evidence: row.transition.evidence}));
  return parseApplicationViewEvidence({contract: "algal.application-view-evidence.v1", state: snapshot.digest, memory: snapshot.state.memory, queries, probes, sources, revisions, work, truncated: {queries: false, probes: selectedProbes.length > 32, sources: active.length > 32, revisions: history.length > 32, work: allWork.length > 32}}, snapshot.digest, snapshot.state.memory);
}
