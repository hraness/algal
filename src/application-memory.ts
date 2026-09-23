/** Experimental application memory. Source admission is a host trust boundary;
 * a native witness establishes only consequences of the admitted projection. */
import {
  applicationId, applicationInt, applicationJson, applicationList, applicationObject,
  applicationRef, applicationRefs, applicationTag, getApplicationRecord,
  nullableApplicationRef, parseApplicationRevision, parseApplicationState,
  putApplicationRecord, type ApplicationRevision,
} from "./application-contract";
import { digestCanonical, type Digest } from "./digest";
import type { Store } from "./store";
import { canonicalize, type JsonValue } from "./values";

type Atom = string | number | boolean | null;
export type MemoryClaim = { relation: string; tuple: Atom[]; polarity: "supported" | "opposed" };
/** A fingerprint is deliberately not a content-store reference. */
export type MemoryResourceVersion =
  | { kind: "store"; reference: Digest }
  | { kind: "file"; sha256: string }
  | { kind: "token"; issuer: string; value: string };
export type MemorySchema = { contract: "algal.application-memory-schema.v1"; relations: { name: string; arity: number }[] };
export type MemoryQueries = { contract: "algal.application-memory-queries.v1"; queries: Digest[] };
export type MemoryProcedure = {
  contract: "algal.application-memory-procedure.v1"; id: string; schema: Digest;
  manifest: Digest; decoder: Digest; dependencies: string[]; prerequisite: Digest | null;
};
export type MemoryQuery = {
  contract: "algal.application-memory-query.v1"; id: string; schema: Digest; program: Digest;
  procedures: Digest[]; polarityColumn: number; conflict: "single-value" | "set-of-values";
};
export type MemoryFrontier = {
  contract: "algal.application-memory-frontier.v1"; application: string;
  previous: Digest | null; sequence: number; mutation: Digest | null; status: "settled" | "uncertain";
};
export type MemoryScope = {
  contract: "algal.application-memory-scope.v1"; application: string; environment: string; task: string;
  frontier: Digest; bindings: { key: string; version: MemoryResourceVersion }[];
  completeFor: Digest[]; attestation: Digest;
};
export type MemoryObservationInput = {
  application: string; scope: Digest; procedure: Digest; raw: Digest; receipt: Digest; decoder: Digest;
};
export type MemoryObservation = MemoryObservationInput & {
  contract: "algal.application-memory-observation.v1"; admission: Digest; claims: MemoryClaim[];
};
export type MemoryHypothesis = {
  contract: "algal.application-memory-hypothesis.v1"; application: string; scope: Digest;
  claim: MemoryClaim; proposedBy: Digest; evidence: Digest[];
};
export type MemorySnapshotInput = {
  application: string; schema: Digest; previous: Digest | null; scope: Digest;
  observations: Digest[]; hypotheses: Digest[]; withdrawn: Digest[];
  /** Retained historical selection; omitted on existing, unarchived records. */
  archive?: Digest;
};
export type MemorySnapshot = MemorySnapshotInput & { contract: "algal.application-memory.v1" };
export type MemoryArchive = {
  contract: "algal.application-memory-archive.v1"; application: string; schema: Digest;
  sequence: number; previous: Digest | null; snapshot: Digest;
};
export type MemoryArchiveEntry = { reference: Digest; archive: MemoryArchive; snapshot: MemorySnapshot };
export type MemoryRolloverInput = { memory: Digest; retainObservations: Digest[]; retainHypotheses: Digest[] };
export type MemoryRollover = { memory: Digest; archive: Digest };
export const APPLICATION_MEMORY_ARCHIVE_LIMIT = 128;
export type MemoryStatus = "supported" | "opposed" | "conflicted" | "unknown" | "stale" | "exhausted" | "failed" | "cancelled";
export type MemoryDerivation = {
  contract: "algal.application-memory-derivation.v1"; application: string; capturedState: Digest;
  memory: Digest; query: Digest; frontier: Digest; engine: Digest; admission: Digest;
  status: MemoryStatus; conditional: true; verified: boolean; result: Digest | null;
  snapshot: Digest | null; program: Digest; sourceRefs: Digest[]; work: number | null; reason: string | null;
};

export type MemoryEngineResult =
  | { kind: "complete"; result: JsonValue }
  | { kind: "incomplete"; status: "exhausted" | "failed" | "cancelled"; reason: string; work: number | null };
export interface MemoryQueryEngine {
  readonly identity: Digest;
  query(snapshot: JsonValue, program: JsonValue, signal?: AbortSignal): Promise<MemoryEngineResult>;
  verify(snapshot: JsonValue, program: JsonValue, result: JsonValue, signal?: AbortSignal): Promise<boolean>;
  settle(): Promise<void>;
}
export type ObservationAdmission = {
  observation: MemoryObservationInput; scope: MemoryScope; frontier: MemoryFrontier;
  procedure: MemoryProcedure; raw: JsonValue; receipt: JsonValue;
};
/** Mandatory trusted host implementation. Callbacks must be bounded, pure
 * validation/decoding. They must verify actual receipt bindings and authority;
 * strings in CAS records cannot authenticate themselves. */
export interface MemoryAdmissionHost {
  readonly identity: Digest;
  currentFrontier(application: string): Promise<Digest>;
  validateScope(input: { scope: MemoryScope; frontier: MemoryFrontier; attestation: JsonValue }): Promise<void>;
  decodeObservation(input: ObservationAdmission): Promise<MemoryClaim[]>;
}

const json = applicationJson;
const same = (a: unknown, b: unknown): boolean => canonicalize(json(a)) === canonicalize(json(b));
function sortedIds(value: unknown, max: number): string[] {
  const rows = applicationList(value, max, applicationId);
  if (new Set(rows).size !== rows.length || rows.some((v, i) => i > 0 && v < rows[i - 1]!)) throw new Error("Memory identifiers must be sorted and unique");
  return rows;
}
function boundedText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > max || value.includes("\0")) throw new Error("Invalid memory text");
  return value;
}
function parseAtom(value: unknown): Atom {
  if (value !== null && typeof value !== "string" && typeof value !== "boolean" && (typeof value !== "number" || !Number.isFinite(value))) throw new Error("Memory atoms must be primitives");
  if (Buffer.byteLength(canonicalize(value as JsonValue)) > 1024) throw new Error("Memory atom exceeds bound");
  return value as Atom;
}
export function parseMemoryClaim(input: unknown): MemoryClaim {
  const v = applicationObject(input, ["relation", "tuple", "polarity"]);
  if (v.polarity !== "supported" && v.polarity !== "opposed") throw new Error("Invalid claim polarity");
  return { relation: applicationId(v.relation), tuple: applicationList(v.tuple, 7, parseAtom), polarity: v.polarity };
}
export function parseMemorySchema(input: unknown): MemorySchema {
  const v = applicationObject(input, ["contract", "relations"]); applicationTag(v.contract, "algal.application-memory-schema.v1");
  const relations = applicationList(v.relations, 16, row => {
    const r = applicationObject(row, ["name", "arity"]);
    return { name: applicationId(r.name), arity: applicationInt(r.arity, 0, 7) };
  });
  if (!relations.length || new Set(relations.map(r => r.name)).size !== relations.length || relations.some((r, i) => i > 0 && r.name < relations[i - 1]!.name)) throw new Error("Memory relations must be nonempty, sorted and unique");
  return { contract: "algal.application-memory-schema.v1", relations };
}
export function parseMemoryQueries(input: unknown): MemoryQueries {
  const v = applicationObject(input, ["contract", "queries"]); applicationTag(v.contract, "algal.application-memory-queries.v1");
  return { contract: "algal.application-memory-queries.v1", queries: applicationRefs(v.queries, 32) };
}
export function parseMemoryProcedure(input: unknown): MemoryProcedure {
  const v = applicationObject(input, ["contract", "id", "schema", "manifest", "decoder", "dependencies", "prerequisite"]);
  applicationTag(v.contract, "algal.application-memory-procedure.v1");
  return { contract: "algal.application-memory-procedure.v1", id: applicationId(v.id), schema: applicationRef(v.schema), manifest: applicationRef(v.manifest), decoder: applicationRef(v.decoder), dependencies: sortedIds(v.dependencies, 8), prerequisite: nullableApplicationRef(v.prerequisite) };
}
export function parseMemoryQuery(input: unknown): MemoryQuery {
  const v = applicationObject(input, ["contract", "id", "schema", "program", "procedures", "polarityColumn", "conflict"]);
  applicationTag(v.contract, "algal.application-memory-query.v1");
  if (v.conflict !== "single-value" && v.conflict !== "set-of-values") throw new Error("Invalid query interpretation");
  return { contract: "algal.application-memory-query.v1", id: applicationId(v.id), schema: applicationRef(v.schema), program: applicationRef(v.program), procedures: applicationRefs(v.procedures, 16), polarityColumn: applicationInt(v.polarityColumn, 0, 7), conflict: v.conflict };
}
/** Structural admission only: Rust remains the sole rule evaluator. Explicit
 * limits are required so the host cannot accidentally inherit larger defaults. */
export function parseMemoryNativeProgram(input: unknown): JsonValue {
  const v = applicationObject(input, ["contract", "rules", "query", "limits"]);
  applicationTag(v.contract, "algal.query.v1");
  const arities = new Map<string, number>();
  const literal = (input: unknown): { relation: string; terms: JsonValue[] } => {
    const row = applicationObject(input, ["relation", "terms"]), relation = applicationId(row.relation);
    const terms = applicationList(row.terms, 8, value => {
      if (value && typeof value === "object") {
        const variable = applicationObject(value, ["var"]); return { var: applicationId(variable.var) };
      }
      return parseAtom(value);
    });
    if (arities.has(relation) && arities.get(relation) !== terms.length) throw new Error("Inconsistent memory relation arity");
    arities.set(relation, terms.length); return { relation, terms };
  };
  const variableNames = (terms: JsonValue[]): string[] => terms.flatMap(term => term && typeof term === "object" && !Array.isArray(term) ? [term.var as string] : []);
  const rules = applicationList(v.rules, 12, input => {
    const r = applicationObject(input, ["id", "head", "body"]), head = literal(r.head), body = applicationList(r.body, 8, literal);
    if (!body.length) throw new Error("Memory rules need a body");
    const bound = new Set(body.flatMap(b => variableNames(b.terms)));
    if (variableNames(head.terms).some(name => !bound.has(name))) throw new Error("Unsafe memory rule");
    return { id: applicationId(r.id), head, body };
  });
  if (new Set(rules.map(r => r.id)).size !== rules.length) throw new Error("Duplicate memory rule identifier");
  const query = literal(v.query), limits = applicationObject(v.limits, Object.keys(APPLICATION_MEMORY_NATIVE_LIMITS));
  for (const [key, max] of Object.entries(APPLICATION_MEMORY_NATIVE_LIMITS)) applicationInt(limits[key], 1, max);
  const result = json({ contract: "algal.query.v1", rules, query, limits });
  if (Buffer.byteLength(canonicalize(result)) > 65_536) throw new Error("Memory program exceeds byte bound");
  return result;
}
/** Tuple arity of an admitted program's query literal; result rows carry exactly these columns. */
export function memoryQueryLiteralArity(program: JsonValue): number {
  return (program as { query: { terms: JsonValue[] } }).query.terms.length;
}
/** A query's declared polarity column must address a column the program's
 * query literal actually produces; checked wherever query and program meet. */
export function checkMemoryQueryPolarity(query: MemoryQuery, program: JsonValue): void {
  if (query.polarityColumn >= memoryQueryLiteralArity(program)) throw new Error("Query polarity column exceeds its query literal arity");
}
export function parseMemoryFrontier(input: unknown): MemoryFrontier {
  const v = applicationObject(input, ["contract", "application", "previous", "sequence", "mutation", "status"]);
  applicationTag(v.contract, "algal.application-memory-frontier.v1");
  if (v.status !== "settled" && v.status !== "uncertain") throw new Error("Invalid mutation frontier status");
  const sequence = applicationInt(v.sequence, 0, 4095), previous = nullableApplicationRef(v.previous), mutation = nullableApplicationRef(v.mutation);
  if ((sequence === 0) !== (previous === null) || (sequence === 0) !== (mutation === null) || (sequence === 0 && v.status !== "settled")) throw new Error("Invalid mutation frontier lineage");
  return { contract: "algal.application-memory-frontier.v1", application: applicationId(v.application), sequence, previous, mutation, status: v.status };
}
export function parseMemoryResourceVersion(input: unknown): MemoryResourceVersion {
  const raw = json(input);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected resource version");
  if (raw.kind === "store") { const v = applicationObject(raw, ["kind", "reference"]); return { kind: "store", reference: applicationRef(v.reference) }; }
  if (raw.kind === "file") {
    const v = applicationObject(raw, ["kind", "sha256"]);
    if (typeof v.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(v.sha256)) throw new Error("Invalid external fingerprint");
    return { kind: "file", sha256: v.sha256 };
  }
  if (raw.kind === "token") { const v = applicationObject(raw, ["kind", "issuer", "value"]); return { kind: "token", issuer: applicationId(v.issuer), value: boundedText(v.value, 128) }; }
  throw new Error("Invalid resource version kind");
}
export function parseMemoryScope(input: unknown): MemoryScope {
  const v = applicationObject(input, ["contract", "application", "environment", "task", "frontier", "bindings", "completeFor", "attestation"]);
  applicationTag(v.contract, "algal.application-memory-scope.v1");
  const bindings = applicationList(v.bindings, 32, row => { const b = applicationObject(row, ["key", "version"]); return { key: applicationId(b.key), version: parseMemoryResourceVersion(b.version) }; });
  if (new Set(bindings.map(b => b.key)).size !== bindings.length || bindings.some((b, i) => i > 0 && b.key < bindings[i - 1]!.key)) throw new Error("Scope bindings must be sorted and unique");
  return { contract: "algal.application-memory-scope.v1", application: applicationId(v.application), environment: applicationId(v.environment), task: applicationId(v.task), frontier: applicationRef(v.frontier), bindings, completeFor: applicationRefs(v.completeFor, 32), attestation: applicationRef(v.attestation) };
}
function observationInput(input: unknown): MemoryObservationInput {
  const v = applicationObject(input, ["application", "scope", "procedure", "raw", "receipt", "decoder"]);
  return { application: applicationId(v.application), scope: applicationRef(v.scope), procedure: applicationRef(v.procedure), raw: applicationRef(v.raw), receipt: applicationRef(v.receipt), decoder: applicationRef(v.decoder) };
}
export function parseMemoryObservation(input: unknown): MemoryObservation {
  const v = applicationObject(input, ["contract", "application", "scope", "procedure", "raw", "receipt", "decoder", "admission", "claims"]);
  applicationTag(v.contract, "algal.application-memory-observation.v1");
  const { contract: _c, admission, claims, ...base } = v;
  return { contract: "algal.application-memory-observation.v1", ...observationInput(base), admission: applicationRef(admission), claims: applicationList(claims, 32, parseMemoryClaim) };
}
export function parseMemoryHypothesis(input: unknown): MemoryHypothesis {
  const v = applicationObject(input, ["contract", "application", "scope", "claim", "proposedBy", "evidence"]);
  applicationTag(v.contract, "algal.application-memory-hypothesis.v1");
  return { contract: "algal.application-memory-hypothesis.v1", application: applicationId(v.application), scope: applicationRef(v.scope), claim: parseMemoryClaim(v.claim), proposedBy: applicationRef(v.proposedBy), evidence: applicationRefs(v.evidence, 16) };
}
export function parseMemorySnapshot(input: unknown): MemorySnapshot {
  const hasArchive = !!input && typeof input === "object" && Object.hasOwn(input, "archive");
  const v = applicationObject(input, ["contract", "application", "schema", "previous", "scope", "observations", "hypotheses", "withdrawn", ...(hasArchive ? ["archive"] : [])]);
  applicationTag(v.contract, "algal.application-memory.v1");
  const observations = applicationRefs(v.observations, 128), withdrawn = applicationRefs(v.withdrawn, 128);
  if (withdrawn.some(ref => !observations.includes(ref))) throw new Error("Withdrawal must name an admitted observation");
  return { contract: "algal.application-memory.v1", application: applicationId(v.application), schema: applicationRef(v.schema), previous: nullableApplicationRef(v.previous), scope: applicationRef(v.scope), observations, hypotheses: applicationRefs(v.hypotheses, 64), withdrawn, ...(hasArchive ? { archive: applicationRef(v.archive) } : {}) };
}
export function parseMemoryArchive(input: unknown): MemoryArchive {
  const v = applicationObject(input, ["contract", "application", "schema", "sequence", "previous", "snapshot"]);
  applicationTag(v.contract, "algal.application-memory-archive.v1");
  const sequence = applicationInt(v.sequence, 0, APPLICATION_MEMORY_ARCHIVE_LIMIT - 1), previous = nullableApplicationRef(v.previous);
  if ((sequence === 0) !== (previous === null)) throw new Error("Invalid memory archive predecessor");
  return { contract: "algal.application-memory-archive.v1", application: applicationId(v.application), schema: applicationRef(v.schema), sequence, previous, snapshot: applicationRef(v.snapshot) };
}
const MEMORY_STATUSES: MemoryStatus[] = ["supported", "opposed", "conflicted", "unknown", "stale", "exhausted", "failed", "cancelled"];
export function parseMemoryDerivation(input: unknown): MemoryDerivation {
  const v = applicationObject(input, ["contract", "application", "capturedState", "memory", "query", "frontier", "engine", "admission", "status", "conditional", "verified", "result", "snapshot", "program", "sourceRefs", "work", "reason"]);
  applicationTag(v.contract, "algal.application-memory-derivation.v1");
  if (!MEMORY_STATUSES.includes(v.status as MemoryStatus)) throw new Error("Invalid memory derivation status");
  if (v.conditional !== true || typeof v.verified !== "boolean") throw new Error("Invalid memory derivation evidence flags");
  const status = v.status as MemoryStatus, result = nullableApplicationRef(v.result), snapshot = nullableApplicationRef(v.snapshot), work = v.work === null ? null : applicationInt(v.work, 0, 50_000), reason = v.reason === null ? null : boundedText(v.reason, 256);
  if ((status === "supported" || status === "opposed" || status === "conflicted") && (result === null || snapshot === null || !v.verified)) throw new Error("A resolved derivation requires a verified result and fact snapshot");
  return { contract: "algal.application-memory-derivation.v1", application: applicationId(v.application), capturedState: applicationRef(v.capturedState), memory: applicationRef(v.memory), query: applicationRef(v.query), frontier: applicationRef(v.frontier), engine: applicationRef(v.engine), admission: applicationRef(v.admission), status, conditional: true, verified: v.verified, result, snapshot, program: applicationRef(v.program), sourceRefs: applicationRefs(v.sourceRefs, 128), work, reason };
}

type Admitted = { observation: MemoryObservation; scope: MemoryScope; procedure: MemoryProcedure };
export class ApplicationMemoryService {
  readonly store: Store;
  readonly engine: MemoryQueryEngine;
  private readonly admission: MemoryAdmissionHost;
  constructor(options: { store: Store; engine: MemoryQueryEngine; admission: MemoryAdmissionHost }) {
    if (!options.admission || typeof options.admission.validateScope !== "function" || typeof options.admission.decodeObservation !== "function" || typeof options.admission.currentFrontier !== "function") throw new Error("Trusted memory admission host required");
    applicationRef(options.admission.identity); applicationRef(options.engine.identity);
    this.store = options.store; this.engine = options.engine; this.admission = options.admission;
  }
  private value(ref: Digest): Promise<JsonValue> { return getApplicationRecord(this.store, ref, json); }
  async validateScope(input: unknown): Promise<MemoryScope> {
    const scope = parseMemoryScope(input);
    const frontier = await getApplicationRecord(this.store, scope.frontier, parseMemoryFrontier);
    if (frontier.application !== scope.application) throw new Error("Cross-application scope frontier");
    if (frontier.previous) {
      const previous = await getApplicationRecord(this.store, frontier.previous, parseMemoryFrontier);
      if (previous.application !== frontier.application || previous.sequence + 1 !== frontier.sequence) throw new Error("Invalid frontier predecessor");
      await this.value(frontier.mutation!);
    }
    for (const binding of scope.bindings) if (binding.version.kind === "store") await this.value(binding.version.reference);
    for (const ref of scope.completeFor) {
      const procedure = await getApplicationRecord(this.store, ref, parseMemoryProcedure);
      if (procedure.dependencies.some(key => !scope.bindings.some(b => b.key === key))) throw new Error("Complete scope omits a procedure dependency");
    }
    const attestation = await this.value(scope.attestation);
    await this.admission.validateScope({ scope: structuredClone(scope), frontier: structuredClone(frontier), attestation });
    return scope;
  }
  async putScope(input: unknown): Promise<Digest> { return putApplicationRecord(this.store, await this.validateScope(input)); }
  private async decode(input: MemoryObservationInput): Promise<{ claims: MemoryClaim[]; scope: MemoryScope; procedure: MemoryProcedure }> {
    const scope = await this.validateScope(await this.value(input.scope));
    const procedure = await getApplicationRecord(this.store, input.procedure, parseMemoryProcedure);
    if (scope.application !== input.application || input.decoder !== procedure.decoder) throw new Error("Observation scope or decoder binding mismatch");
    const schema = await getApplicationRecord(this.store, procedure.schema, parseMemorySchema);
    const frontier = await getApplicationRecord(this.store, scope.frontier, parseMemoryFrontier);
    if (frontier.status !== "settled") throw new Error("Uncertain mutation cannot admit an observation");
    const raw = await this.value(input.raw), receipt = await this.value(input.receipt);
    // Decoder must resolve to existing data, but authority comes from the host registry.
    await this.value(input.decoder);
    const claims = applicationList(await this.admission.decodeObservation({ observation: structuredClone(input), scope: structuredClone(scope), frontier: structuredClone(frontier), procedure: structuredClone(procedure), raw, receipt }), 32, parseMemoryClaim);
    for (const claim of claims) this.checkClaim(schema, claim);
    return { claims, scope, procedure };
  }
  private checkClaim(schema: MemorySchema, claim: MemoryClaim): void {
    if (!schema.relations.some(r => r.name === claim.relation && r.arity === claim.tuple.length)) throw new Error("Claim does not match memory schema");
  }
  async observe(input: MemoryObservationInput): Promise<Digest> {
    const checked = observationInput(input), decoded = await this.decode(checked);
    return putApplicationRecord(this.store, { contract: "algal.application-memory-observation.v1", ...checked, admission: this.admission.identity, claims: decoded.claims });
  }
  private async admit(ref: Digest): Promise<Admitted> {
    const observation = await getApplicationRecord(this.store, ref, parseMemoryObservation);
    if (observation.admission !== this.admission.identity) throw new Error("Unadmitted observation authority");
    const { contract: _contract, admission: _admission, claims, ...input } = observation;
    const decoded = await this.decode(input);
    if (!same(claims, decoded.claims)) throw new Error("Stored claim differs from trusted source decoding");
    return { observation, scope: decoded.scope, procedure: decoded.procedure };
  }
  private async archives(memory: MemorySnapshot): Promise<MemoryArchiveEntry[]> {
    const result: MemoryArchiveEntry[] = [], seen = new Set<Digest>();
    let reference: Digest | null = memory.archive ?? null, expected: number | null = null;
    while (reference !== null) {
      if (result.length >= APPLICATION_MEMORY_ARCHIVE_LIMIT || seen.has(reference)) throw new Error("Memory archive bound/cycle");
      seen.add(reference);
      const archive = await getApplicationRecord(this.store, reference, parseMemoryArchive);
      const snapshot = await getApplicationRecord(this.store, archive.snapshot, parseMemorySnapshot);
      if (archive.application !== memory.application || archive.schema !== memory.schema || snapshot.application !== memory.application || snapshot.schema !== memory.schema) throw new Error("Memory archive application/schema mismatch");
      if ((expected !== null && archive.sequence !== expected) || (snapshot.archive ?? null) !== archive.previous) throw new Error("Memory archive lineage mismatch");
      result.push({ reference, archive, snapshot });
      expected = archive.sequence - 1; reference = archive.previous;
    }
    return result;
  }
  /** Newest-first retained cutovers. Archived observations are provenance,
   * not selected facts; their original snapshots/raw/receipts remain in CAS. */
  async archiveHistory(memoryRef: Digest): Promise<MemoryArchiveEntry[]> {
    return this.archives(await getApplicationRecord(this.store, memoryRef, parseMemorySnapshot));
  }
  private async validateSnapshot(input: unknown): Promise<{ memory: MemorySnapshot; scope: MemoryScope; observations: Map<Digest, Admitted> }> {
    const memory = parseMemorySnapshot(input), schema = await getApplicationRecord(this.store, memory.schema, parseMemorySchema);
    const scope = await this.validateScope(await this.value(memory.scope));
    if (scope.application !== memory.application) throw new Error("Cross-application memory scope");
    const archives = await this.archives(memory);
    if (!memory.previous && memory.archive) throw new Error("Memory archive requires a predecessor");
    if (memory.previous) {
      const previous = await getApplicationRecord(this.store, memory.previous, parseMemorySnapshot);
      if (previous.application !== memory.application || previous.schema !== memory.schema) throw new Error("Memory predecessor application/schema mismatch; migration required");
      if (memory.archive !== previous.archive) {
        const cutover = archives[0]?.archive;
        if (!cutover || cutover.snapshot !== memory.previous || cutover.previous !== (previous.archive ?? null)) throw new Error("Memory rollover must archive its exact predecessor");
        if (memory.scope !== previous.scope || memory.observations.some(ref => !previous.observations.includes(ref)) || memory.hypotheses.some(ref => !previous.hypotheses.includes(ref))) throw new Error("Memory rollover may only retain the previous selection and scope");
        if (!same(memory.withdrawn, previous.withdrawn.filter(ref => memory.observations.includes(ref)))) throw new Error("Memory rollover must retain selected withdrawals");
        if (memory.observations.length === previous.observations.length && memory.hypotheses.length === previous.hypotheses.length) throw new Error("Memory rollover must retire an observation or hypothesis");
      } else {
        if (previous.withdrawn.some(ref => !memory.withdrawn.includes(ref)) || previous.observations.some(ref => !memory.observations.includes(ref))) throw new Error("Memory history or withdrawals cannot silently disappear");
        const archived = new Set(archives.flatMap(entry => entry.snapshot.observations));
        if (memory.observations.some(ref => !previous.observations.includes(ref) && archived.has(ref))) throw new Error("Retired observations cannot be resurrected");
      }
    }
    const observations = new Map<Digest, Admitted>();
    for (const ref of memory.observations) {
      const row = await this.admit(ref);
      if (row.observation.application !== memory.application || row.procedure.schema !== memory.schema) throw new Error("Cross-application or incompatible observation");
      observations.set(ref, row);
    }
    for (const ref of memory.hypotheses) {
      const h = await getApplicationRecord(this.store, ref, parseMemoryHypothesis);
      if (h.application !== memory.application) throw new Error("Cross-application hypothesis");
      const hs = await this.validateScope(await this.value(h.scope));
      if (hs.application !== memory.application) throw new Error("Cross-application hypothesis scope");
      this.checkClaim(schema, h.claim); await this.value(h.proposedBy);
      for (const evidence of h.evidence) await this.value(evidence);
    }
    return { memory, scope, observations };
  }
  async snapshot(input: MemorySnapshotInput): Promise<Digest> {
    const hasArchive = !!input && typeof input === "object" && Object.hasOwn(input, "archive");
    const checked = parseMemorySnapshot({ ...applicationObject(input, ["application", "schema", "previous", "scope", "observations", "hypotheses", "withdrawn", ...(hasArchive ? ["archive"] : [])]), contract: "algal.application-memory.v1" });
    await this.validateSnapshot(checked);
    return putApplicationRecord(this.store, checked);
  }
  /** Explicit active-selection cutover. Does not publish a lifecycle head,
   * erase provenance, reclaim storage, or reset state/intent capacity. */
  async rollover(input: MemoryRolloverInput): Promise<MemoryRollover> {
    const v = applicationObject(input, ["memory", "retainObservations", "retainHypotheses"]);
    const previous = applicationRef(v.memory), observations = applicationRefs(v.retainObservations, 128), hypotheses = applicationRefs(v.retainHypotheses, 64);
    const { memory } = await this.validateSnapshot(await this.value(previous));
    const archive = await putApplicationRecord(this.store, parseMemoryArchive({
      contract: "algal.application-memory-archive.v1", application: memory.application, schema: memory.schema,
      sequence: memory.archive ? (await getApplicationRecord(this.store, memory.archive, parseMemoryArchive)).sequence + 1 : 0,
      previous: memory.archive ?? null, snapshot: previous,
    }));
    const next = await this.snapshot({ application: memory.application, schema: memory.schema, previous,
      scope: memory.scope, observations, hypotheses, withdrawn: memory.withdrawn.filter(ref => observations.includes(ref)), archive });
    return { memory: next, archive };
  }
  /** Admission helper for root-owned lifecycle commits; no hidden native query or effect. */
  async validateForRevision(memoryRef: Digest, input: ApplicationRevision): Promise<MemorySnapshot> {
    return (await this.validateRevisionSnapshot(memoryRef, input)).memory;
  }
  /** The same admission, keeping the validated scope and admitted observations
   * so a query need not re-derive them from the identical records. */
  private async validateRevisionSnapshot(memoryRef: Digest, input: ApplicationRevision): Promise<{ memory: MemorySnapshot; scope: MemoryScope; observations: Map<Digest, Admitted> }> {
    const revision = parseApplicationRevision(input), validated = await this.validateSnapshot(await this.value(memoryRef)), { memory } = validated;
    if (memory.application !== revision.application || memory.schema !== revision.schema) throw new Error("Memory incompatible with application revision schema");
    const queries = await getApplicationRecord(this.store, revision.queries, parseMemoryQueries);
    for (const entry of revision.entrypoints) {
      if (entry.queries.some(q => !queries.queries.includes(q))) throw new Error("Entrypoint memory view exceeds the revision's queries");
    }
    for (const ref of queries.queries) {
      const query = await getApplicationRecord(this.store, ref, parseMemoryQuery);
      if (query.schema !== revision.schema) throw new Error("Query schema incompatible with revision");
      checkMemoryQueryPolarity(query, parseMemoryNativeProgram(await this.value(query.program)));
      for (const procedure of query.procedures) {
        const p = await getApplicationRecord(this.store, procedure, parseMemoryProcedure);
        if (p.schema !== revision.schema) throw new Error("Procedure schema incompatible with revision");
      }
    }
    if (revision.entrypoints.some(e => !queries.queries.includes(e.applicability))) throw new Error("Entrypoint applicability query missing from revision");
    return validated;
  }
  async query(capturedStateRef: Digest, queryRef: Digest, signal?: AbortSignal): Promise<{ ref: Digest; derivation: MemoryDerivation }> {
    const stateRef = applicationRef(capturedStateRef), selectedQuery = applicationRef(queryRef);
    const state = await getApplicationRecord(this.store, stateRef, parseApplicationState);
    const revision = await getApplicationRecord(this.store, state.revision, parseApplicationRevision);
    const { memory, scope, observations } = await this.validateRevisionSnapshot(state.memory, revision);
    if (state.application !== revision.application) throw new Error("State/revision application mismatch");
    const bundle = await getApplicationRecord(this.store, revision.queries, parseMemoryQueries);
    if (!bundle.queries.includes(selectedQuery)) throw new Error("Query not selected by captured revision");
    const query = await getApplicationRecord(this.store, selectedQuery, parseMemoryQuery);
    const frontierRef = applicationRef(await this.admission.currentFrontier(memory.application));
    const frontier = await getApplicationRecord(this.store, frontierRef, parseMemoryFrontier);
    if (frontier.application !== memory.application) throw new Error("Host supplied cross-application frontier");
    const program = parseMemoryNativeProgram(await this.value(query.program));
    checkMemoryQueryPolarity(query, program);
    const sources: Digest[] = [], facts: JsonValue[] = []; let stale = false;
    const usableScope = scope.frontier === frontierRef && frontier.status === "settled";
    for (const [ref, row] of observations) {
      if (memory.withdrawn.includes(ref) || !query.procedures.includes(row.observation.procedure)) continue;
      // A current attestation cannot silently recertify old observations after
      // a mutation, even with empty/unchanged declared dependencies or a new task.
      const applicable = usableScope && row.scope.frontier === frontierRef && row.scope.environment === scope.environment && scope.completeFor.includes(row.observation.procedure) && row.scope.completeFor.includes(row.observation.procedure) && row.procedure.dependencies.every(key => {
        const a = row.scope.bindings.find(b => b.key === key), b = scope.bindings.find(b => b.key === key);
        return !!a && !!b && same(a.version, b.version);
      });
      if (!applicable) { stale = true; continue; }
      sources.push(ref);
      for (const claim of row.observation.claims) facts.push({ relation: claim.relation, tuple: [...claim.tuple, claim.polarity], sources: [ref, memory.scope, row.observation.procedure] });
    }
    const derivation: MemoryDerivation = { contract: "algal.application-memory-derivation.v1", application: state.application, capturedState: stateRef, memory: state.memory, query: selectedQuery, frontier: frontierRef, engine: this.engine.identity, admission: this.admission.identity, status: "failed", conditional: true, verified: false, result: null, snapshot: null, program: query.program, sourceRefs: sources.sort(), work: null, reason: null };
    const save = async () => ({ ref: await putApplicationRecord(this.store, derivation), derivation: structuredClone(derivation) });
    if (signal?.aborted) { derivation.status = "cancelled"; derivation.reason = "cancelled"; return save(); }
    if (facts.length > 128) { derivation.status = "exhausted"; derivation.reason = "fact-limit"; return save(); }
    const snapshot = json({ contract: "algal.memory.v1", facts });
    derivation.snapshot = await putApplicationRecord(this.store, snapshot);
    try {
      const output = await this.engine.query(snapshot, program, signal);
      if (output.kind === "incomplete") { derivation.status = output.status; derivation.reason = boundedText(output.reason, 256); derivation.work = output.work; return save(); }
      const result = applicationObject(output.result, ["contract", "snapshot", "program", "complete", "witnessPolicy", "rows", "proofs", "work", "rounds", "baseFacts", "derivedFacts"]);
      applicationTag(result.contract, "algal.query-result.v1");
      if (result.complete !== true || result.snapshot !== derivation.snapshot || result.program !== query.program || result.witnessPolicy !== "first-canonical-derivation") throw new Error("Native result binding mismatch");
      const rows = applicationList(result.rows, 16, row => { const r = applicationObject(row, ["tuple", "proof"]); applicationRef(r.proof); return applicationList(r.tuple, 8, parseAtom); });
      derivation.work = applicationInt(result.work, 0, 50_000);
      if (!await this.engine.verify(snapshot, program, output.result, signal)) throw new Error("Native derivation did not verify");
      if (signal?.aborted) { derivation.status = "cancelled"; derivation.reason = "cancelled"; return save(); }
      const supports: Atom[][] = [], opposes: Atom[][] = [];
      for (const row of rows) {
        if (query.polarityColumn >= row.length) throw new Error("Query result row lacks the polarity column");
        const polarity = row[query.polarityColumn];
        if (polarity !== "supported" && polarity !== "opposed") throw new Error("Query result lacks declared polarity");
        (polarity === "supported" ? supports : opposes).push(row.filter((_v, i) => i !== query.polarityColumn));
      }
      derivation.status = (supports.length && opposes.length) || (query.conflict === "single-value" && new Set(supports.map(r => canonicalize(r))).size > 1) ? "conflicted" : supports.length ? "supported" : opposes.length ? "opposed" : stale || !usableScope ? "stale" : "unknown";
      derivation.result = await putApplicationRecord(this.store, output.result); derivation.verified = true;
    } catch { derivation.status = signal?.aborted ? "cancelled" : "failed"; derivation.reason = signal?.aborted ? "cancelled" : "query-or-verification-failed"; }
    return save();
  }
}

/** Shared admission convenience without granting authority from stored JSON. */
export async function validateMemoryForRevision(service: ApplicationMemoryService, memory: Digest, revision: ApplicationRevision): Promise<MemorySnapshot> {
  return service.validateForRevision(memory, revision);
}

export const APPLICATION_MEMORY_NATIVE_LIMITS = Object.freeze({ maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 });
export const APPLICATION_MEMORY_ENGINE_ID = digestCanonical({ contract: "algal.application-memory-engine.v1", nativeContract: "algal.query.v1" });
