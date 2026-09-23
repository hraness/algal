/** Local experimental host. Owner edits are explicit compatibility admissions,
 * not accepted optimization evaluations. No dispatcher/effect authority. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationAdmission, type ApplicationSnapshot } from "../../src/application";
import { applicationJson, applicationObject, applicationRef, getApplicationRecord, parseApplicationRevision, parseApplicationState, parseApplicationTransition } from "../../src/application-contract";
import { checkApplicationCompatibility } from "../../src/application-adaptation";
import { APPLICATION_MEMORY_NATIVE_LIMITS } from "../../src/application-memory";
import { packOrganism } from "../../src/bundle";
import { restoreApplicationRevision, verifyApplicationRestoration } from "../../src/application-restoration";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import { compileOrganism } from "../../src/graph";
import { builtinRegistry } from "../../src/registry";
import { runOrganism, parseRunReceipt, type RunReceipt } from "../../src/run";
import { MemoryStore, type Store } from "../../src/store";
import { verifyReceipt } from "../../src/verify";
import { canonicalize, type JsonValue } from "../../src/values";
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, SIGNAL_UPDATE_PROGRAM, evaluateView, makeRevision, parseProposal, parseRevision, parseSignalEvent, parseSignals, updateSignals, type SurfaceConfig, type SurfaceProposal, type SurfaceRevision, type SurfaceSignalEvent, type SurfaceSignals } from "./surface";

export const APPLICATION = "malleable-marketing";
const json = applicationJson;
const hash = (v: unknown): Digest => digestCanonical(json(v));
const same = (a: unknown, b: unknown): boolean => hash(a) === hash(b);
const PROFILE = { contract: "algal.marketing-host-profile.v1", mode: "experimental-owner-edit", effects: "none", maxStates: 64 };
const POLICY = { contract: "algal.application-evaluation-policy.v1", maxCases: 4, maxWork: 100_000, maxModelCalls: 0, requireHoldoutPass: true, strictValidationImprovement: true };
const SCHEMA = { contract: "algal.application-memory-schema.v1", relations: [{ name: "signal", arity: 2 }] };
const VIEWS = { contract: "algal.application-view-spec.v1", title: "Malleable marketing", widgets: ["history", "memory"] };
const RESTORE = { contract: "algal.application-restoration-policy.v1", application: APPLICATION, mode: "retained-pure-strategy-manifests" };
const BUDGETS = { maxSteps: 8, maxAgentCalls: 0, maxWork: 50_000, maxContextBytes: 8192, maxOutputBytes: 8192, maxDepth: 4 };

function manifest(name: "view" | "update", program: JsonValue, definition?: SurfaceRevision): OrganismManifest {
  const ports = name === "view" ? ["signals"] : ["signals", "event"];
  return parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:marketing-${name}`, name: `Marketing ${name}`, budgets: BUDGETS,
    interface: { inputs: Object.fromEntries(ports.map(port => [port, { cell: "input", port }])), outputs: { value: { cell: "result", port: "out" } } },
    cells: [{ id: "input", kind: "input", outputs: Object.fromEntries(ports.map(port => [port, "json"])) },
      ...(definition ? [{ id: "definition", kind: "const", outputs: { value: { type: "json", value: definition } } }] : []),
      { id: "result", kind: "expr", inputs: Object.fromEntries(ports.map(port => [port, "json"])), expr: { contract: "algal.expr.v1", program }, output: { kind: "json", schema: { type: "object" } } }],
    edges: ports.map(port => ({ from: { cell: "input", port }, to: { cell: "result", port } })) });
}
export function viewManifest(input: SurfaceRevision): OrganismManifest { const revision = parseRevision(input); return manifest("view", revision.program, revision); }
export function updateManifest(): OrganismManifest { return manifest("update", SIGNAL_UPDATE_PROGRAM); }
export async function buildSurfaceFixture() {
  const store = new MemoryStore(), revision = makeRevision(DEFAULT_CONFIG), signals = parseSignals(DEFAULT_SIGNALS), m = viewManifest(revision);
  await store.putManifest(m);
  const execution = await run(store, m, { signals }), view = evaluateView(revision, signals);
  await checkRun(store, execution.ref, m, { signals }, view);
  return { revision, signals, view, manifest: manifestToJson(m), bundle: json(await packOrganism(m, store)), receipt: execution.receipt };
}
function definition(m: OrganismManifest): SurfaceRevision {
  const cell = m.cells.find(c => c.id === "definition");
  if (!cell || cell.kind !== "const") throw new Error("Missing marketing definition");
  const revision = parseRevision(cell.outputs.value?.value);
  if (!same(manifestToJson(m), manifestToJson(viewManifest(revision)))) throw new Error("View manifest differs from the known builder");
  return revision;
}
async function run(store: Store, m: OrganismManifest, input: Record<string, JsonValue>): Promise<{ receipt: RunReceipt; ref: Digest }> {
  const receipt = await runOrganism({ manifest: m, args: { input }, fns: builtinRegistry(), store, executors: [] });
  if (receipt.outcome !== "complete") throw new Error("Pure surface run failed");
  return { receipt, ref: await store.putReceipt(json(receipt)) };
}
async function checkRun(store: Store, reference: Digest, m: OrganismManifest, input: Record<string, JsonValue>, output: unknown): Promise<void> {
  const raw = await store.getReceipt(reference);
  if (!raw || hash(raw) !== reference) throw new Error("Missing or changed surface receipt");
  const receipt = parseRunReceipt(raw);
  if (!same(receipt.args, { input }) || receipt.outcome !== "complete" || !same(receipt.cells.result?.outputs?.out, output) || !(await verifyReceipt(raw, manifestToJson(m), store)).ok) throw new Error("Surface receipt binding/replay failed");
}
type SurfaceMemory = { contract: "algal.marketing-memory.v1"; signals: SurfaceSignals; previous: Digest | null; event: SurfaceSignalEvent | null; receipt: Digest | null };
function memory(input: unknown): SurfaceMemory {
  const v = applicationObject(input, ["contract", "signals", "previous", "event", "receipt"]);
  if (v.contract !== "algal.marketing-memory.v1") throw new Error("Invalid marketing memory");
  return { contract: "algal.marketing-memory.v1", signals: parseSignals(v.signals), previous: v.previous === null ? null : applicationRef(v.previous), event: v.event === null ? null : parseSignalEvent(v.event), receipt: v.receipt === null ? null : applicationRef(v.receipt) };
}
type Preview = { contract: "algal.marketing-owner-preview.v1"; parentState: Digest; proposal: Digest; candidateRevision: Digest; compatibility: Digest; receipt: Digest };
function previewRecord(input: unknown): Preview {
  const v = applicationObject(input, ["contract", "parentState", "proposal", "candidateRevision", "compatibility", "receipt"]);
  if (v.contract !== "algal.marketing-owner-preview.v1") throw new Error("Invalid marketing preview");
  return { contract: "algal.marketing-owner-preview.v1", parentState: applicationRef(v.parentState), proposal: applicationRef(v.proposal), candidateRevision: applicationRef(v.candidateRevision), compatibility: applicationRef(v.compatibility), receipt: applicationRef(v.receipt) };
}
async function records(store: Store) {
  const put = (v: unknown) => store.putValue(json(v));
  const schema = await put(SCHEMA);
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "signal", terms: [{ var: "name" }, { var: "value" }, { var: "polarity" }] }, limits: APPLICATION_MEMORY_NATIVE_LIMITS });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "signals", schema, program, procedures: [], polarityColumn: 2, conflict: "set-of-values" });
  return { schema, query, queries: await put({ contract: "algal.application-memory-queries.v1", queries: [query] }), views: await put(VIEWS), runtimeProfile: await put(PROFILE), evaluationPolicy: await put(POLICY) };
}
async function validateRevision(store: Store, revisionRef: Digest): Promise<SurfaceRevision> {
  const r = await getApplicationRecord(store, revisionRef, parseApplicationRevision), expected = await records(store);
  for (const key of ["schema", "queries", "views", "runtimeProfile", "evaluationPolicy"] as const) if (r[key] !== expected[key]) throw new Error(`Unexpected surface ${key}`);
  if (r.application !== APPLICATION || r.capabilityRequirements.length || r.goals !== undefined || r.entrypoints.length !== 2) throw new Error("Surface profile cannot acquire authority");
  let surface: SurfaceRevision | null = null;
  for (const [index, name] of ["update", "view"].entries()) {
    const entry = r.entrypoints[index]!;
    if (entry.name !== name || entry.maxGenerations !== 1 || entry.capabilities.length || entry.applicability !== expected.query || !same(entry.queries, [expected.query])) throw new Error("Unexpected surface entrypoint");
    const m = await store.getManifest(entry.manifest);
    if (!m) throw new Error("Missing surface manifest");
    if (name === "view") surface = definition(m);
    else if (!same(manifestToJson(m), manifestToJson(updateManifest()))) throw new Error("Update manifest differs from the known builder");
    await compileOrganism(m, builtinRegistry(), store);
  }
  return surface!;
}
async function validatePreview(store: Store, reference: Digest, parent: ApplicationSnapshot, candidate: Digest): Promise<void> {
  const p = await getApplicationRecord(store, reference, previewRecord);
  if (p.parentState !== parent.digest || p.candidateRevision !== candidate) throw new Error("Stale or mismatched owner preview");
  const proposal = await getApplicationRecord(store, p.proposal, parseProposal);
  const before = await validateRevision(store, parent.state.revision), after = await validateRevision(store, candidate);
  if (proposal.baseRevision !== hash(before) || !same(proposal.config, after.config)) throw new Error("Proposal does not bind the candidate/base revision");
  const compatibility = await checkApplicationCompatibility(store, parent.state.revision, candidate);
  if (compatibility.status !== "compatible" || p.compatibility !== hash(compatibility)) throw new Error("Incompatible owner edit");
  if (!same(await store.getValue(p.compatibility), compatibility)) throw new Error("Missing compatibility evidence");
  const state = await getApplicationRecord(store, parent.state.memory, memory);
  await checkRun(store, p.receipt, viewManifest(after), { signals: state.signals }, evaluateView(after, state.signals));
}
export function ownerEditAdmission(): ApplicationAdmission {
  return { async admitCommit({ command, current, revision, pending, store }) {
    if (command.application !== APPLICATION || command.intents.length || command.causedBy !== null || pending.length || (current && current.state.sequence >= 63)) throw new Error("Owner-edit host bounds/authority exceeded");
    await validateRevision(store, command.revision);
    const next = await getApplicationRecord(store, command.memory, memory);
    if (!current) {
      if (command.kind !== "create" || command.evidence.length || next.previous !== null || next.event !== null || next.receipt !== null) throw new Error("Invalid surface genesis");
      return;
    }
    if (command.kind === "memory") {
      if (command.evidence.length !== 1 || next.previous !== current.state.memory || !next.event || !next.receipt || command.evidence[0] !== hash({ contract: "algal.marketing-signal-evidence.v1", receipt: next.receipt })) throw new Error("Signal must extend current memory with its receipt");
      const prior = await getApplicationRecord(store, current.state.memory, memory);
      const updated = updateSignals(prior.signals, next.event);
      if (!same(next.signals, updated)) throw new Error("Signal memory does not match update");
      await checkRun(store, next.receipt, updateManifest(), { signals: prior.signals, event: next.event }, updated);
      return;
    }
    if (command.memory !== current.state.memory || revision.parent !== current.state.revision) throw new Error("Owner edit must preserve current memory");
    if (command.kind === "activate") {
      if (command.evidence.length !== 1) throw new Error("Owner activation requires one exact preview");
      await validatePreview(store, command.evidence[0]!, current, command.revision);
      return;
    }
    if (command.kind === "restore") {
      const restoration = await verifyApplicationRestoration(store, { application: APPLICATION, parentState: current.digest, candidateRevision: command.revision, evidence: command.evidence });
      if (restoration.policy !== hash(RESTORE) || command.evidence.length !== 1) throw new Error("Unadmitted restoration policy/evidence");
      return;
    }
    throw new Error("Owner-edit host denies command kind");
  } };
}
export class MarketingHost {
  readonly service: ApplicationService;
  constructor(directory: string) { this.service = new ApplicationService(directory, ownerEditAdmission()); }
  private put(v: unknown): Promise<Digest> { return this.service.store.putValue(json(v)); }
  async current(): Promise<ApplicationSnapshot> { const s = await this.service.inspect(APPLICATION); if (!s) throw new Error("Initialize this surface first"); return s; }
  async revision(snapshot?: ApplicationSnapshot): Promise<SurfaceRevision> { return validateRevision(this.service.store, (snapshot ?? await this.current()).state.revision); }
  async signals(snapshot?: ApplicationSnapshot): Promise<SurfaceSignals> { return (await getApplicationRecord(this.service.store, (snapshot ?? await this.current()).state.memory, memory)).signals; }
  async initialize(config: SurfaceConfig = DEFAULT_CONFIG, signals: SurfaceSignals = DEFAULT_SIGNALS): Promise<ApplicationSnapshot> {
    const store = this.service.store, fixed = await records(store), surface = makeRevision(config);
    const view = await store.putManifest(viewManifest(surface)), update = await store.putManifest(updateManifest());
    const revision = await this.put({ contract: "algal.application-revision.v1", application: APPLICATION, parent: null, schema: fixed.schema, queries: fixed.queries, views: fixed.views, runtimeProfile: fixed.runtimeProfile, evaluationPolicy: fixed.evaluationPolicy, capabilityRequirements: [], entrypoints: [["update", update], ["view", view]].map(([name, manifest]) => ({ name, manifest, applicability: fixed.query, maxGenerations: 1, capabilities: [], queries: [fixed.query] })) });
    const initial = await this.put({ contract: "algal.marketing-memory.v1", signals: parseSignals(signals), previous: null, event: null, receipt: null });
    return this.service.create({ application: APPLICATION, operation: hash({ kind: "initialize", revision, memory: initial }), kind: "create", expectedHead: null, revision, memory: initial, intents: [], evidence: [], causedBy: null });
  }
  async render(snapshot?: ApplicationSnapshot) {
    const state = snapshot ?? await this.current(), revision = await this.revision(state), signals = await this.signals(state);
    const execution = await run(this.service.store, viewManifest(revision), { signals });
    return { head: state.digest, revision: hash(revision), signals, view: evaluateView(revision, signals), receipt: execution.ref };
  }
  async signal(expectedHead: Digest, eventInput: SurfaceSignalEvent, operation: Digest): Promise<ApplicationSnapshot> {
    const event = parseSignalEvent(eventInput), parent = await this.snapshot(expectedHead), prior = await this.signals(parent);
    const execution = await run(this.service.store, updateManifest(), { signals: prior, event });
    const next = await this.put({ contract: "algal.marketing-memory.v1", signals: updateSignals(prior, event), previous: parent.state.memory, event, receipt: execution.ref });
    const evidence = await this.put({ contract: "algal.marketing-signal-evidence.v1", receipt: execution.ref });
    return this.service.commit({ application: APPLICATION, operation, kind: "memory", expectedHead, revision: parent.state.revision, memory: next, intents: [], evidence: [evidence], causedBy: null });
  }
  async snapshot(reference: Digest): Promise<ApplicationSnapshot> {
    const snapshot = (await this.service.history(APPLICATION)).find(row => row.digest === reference);
    if (!snapshot) throw new Error("Unknown retained surface head");
    return snapshot;
  }
  async preview(expectedHead: Digest, proposalInput: SurfaceProposal): Promise<{ reference: Digest; record: Preview; view: ReturnType<typeof evaluateView> }> {
    const proposal = parseProposal(proposalInput), current = await this.current();
    if (current.digest !== expectedHead || proposal.baseRevision !== hash(await this.revision(current))) throw new Error("Stale surface proposal/head");
    const surface = makeRevision(proposal.config), m = await this.service.store.putManifest(viewManifest(surface));
    const candidateRevision = await this.put({ ...current.revision, parent: current.state.revision, entrypoints: current.revision.entrypoints.map(entry => entry.name === "view" ? { ...entry, manifest: m } : entry) });
    const compatibility = await checkApplicationCompatibility(this.service.store, current.state.revision, candidateRevision);
    if (compatibility.status !== "compatible") throw new Error("Incompatible surface preview");
    const signals = await this.signals(current), execution = await run(this.service.store, viewManifest(surface), { signals });
    const record: Preview = { contract: "algal.marketing-owner-preview.v1", parentState: expectedHead, proposal: await this.put(proposal), candidateRevision, compatibility: await this.put(compatibility), receipt: execution.ref };
    const reference = await this.put(record);
    await validatePreview(this.service.store, reference, current, candidateRevision);
    return { reference, record, view: evaluateView(surface, signals) };
  }
  async activate(reference: Digest, operation: Digest): Promise<ApplicationSnapshot> {
    const p = await getApplicationRecord(this.service.store, reference, previewRecord), parent = await this.snapshot(p.parentState);
    return this.service.commit({ application: APPLICATION, operation, kind: "activate", expectedHead: p.parentState, revision: p.candidateRevision, memory: parent.state.memory, intents: [], evidence: [reference], causedBy: null });
  }
  async restore(expectedHead: Digest, targetState: Digest, operation: Digest): Promise<ApplicationSnapshot> {
    return (await restoreApplicationRevision(this.service, { application: APPLICATION, operation, expectedHead, targetState, policy: await this.put(RESTORE) })).snapshot;
  }
}

type ExportRecord = { kind: "value" | "manifest" | "receipt"; reference: Digest; value: JsonValue };
export type SurfaceEvidence = { contract: "algal.marketing-evidence.v1"; claim: "content-integrity-and-pure-replay"; head: Digest; states: Digest[]; records: ExportRecord[] };
const EXPORT_MAX_BYTES = 4_194_304;
/** Retained reachable CAS only. No credentials, filesystem operation custody,
 * provider attestation, traffic metrics, or optimization claim is exported. */
export async function exportEvidence(host: MarketingHost): Promise<SurfaceEvidence> {
  const history = await host.service.history(APPLICATION);
  if (!history.length || history.length > 64) throw new Error("Invalid surface history bound");
  const states = history.map(row => row.digest), records: ExportRecord[] = [], seen = new Set<Digest>(), pending = [...states];
  let bytes = 0;
  while (pending.length) {
    const reference = pending.pop()!;
    if (seen.has(reference)) continue;
    seen.add(reference);
    if (seen.size > 4096 || records.length > 1024) throw new Error("Surface export record bound exceeded");
    const store = host.service.store;
    let value = await store.getValue(reference), kind: ExportRecord["kind"] = "value";
    if (value === undefined) { const m = await store.getManifest(reference); if (m) value = manifestToJson(m); kind = "manifest"; }
    if (value === undefined) { value = await store.getReceipt(reference); kind = "receipt"; }
    if (value === undefined) continue; // execution/operation IDs are hashes, not CAS references
    const record = { kind, reference, value };
    bytes += Buffer.byteLength(canonicalize(json(record)));
    if (bytes > EXPORT_MAX_BYTES - 16_384) throw new Error("Surface export byte bound exceeded");
    records.push(record);
    const scan = (v: JsonValue): void => {
      if (typeof v === "string" && /^sha256:[a-f0-9]{64}$/.test(v)) pending.push(v as Digest);
      else if (v && typeof v === "object") Object.values(v).forEach(scan);
    };
    scan(value);
  }
  return { contract: "algal.marketing-evidence.v1", claim: "content-integrity-and-pure-replay", head: states.at(-1)!, states, records: records.sort((a, b) => a.reference.localeCompare(b.reference)) };
}
/** An externally retained expectedHead anchors verification. A self-supplied
 * head only establishes internal consistency, never authorship or custody. */
export async function verifyEvidence(input: unknown, expectedHead: Digest): Promise<{ ok: true; head: Digest; states: number; receipts: number; claim: string }> {
  if (Buffer.byteLength(JSON.stringify(input)) > EXPORT_MAX_BYTES) throw new Error("Surface evidence byte bound exceeded");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid surface evidence");
  const v = input as Record<string, unknown>;
  if (Object.keys(v).sort().join("\0") !== ["contract", "claim", "head", "states", "records"].sort().join("\0") || v.contract !== "algal.marketing-evidence.v1" || v.claim !== "content-integrity-and-pure-replay" || applicationRef(v.head) !== applicationRef(expectedHead)) throw new Error("Surface evidence contract/head mismatch");
  if (!Array.isArray(v.states) || !v.states.length || v.states.length > 64 || !Array.isArray(v.records) || v.records.length > 1024) throw new Error("Surface evidence count bound exceeded");
  const states = v.states.map(applicationRef);
  if (new Set(states).size !== states.length || states.at(-1) !== expectedHead) throw new Error("Invalid evidence state chain");
  const directory = await mkdtemp(join(tmpdir(), "algal-surface-verify-"));
  try {
    const host = new MarketingHost(directory), store = host.service.store, seen = new Set<Digest>();
    let receipts = 0;
    for (const raw of v.records) {
      const row = applicationObject(raw, ["kind", "reference", "value"]), reference = applicationRef(row.reference);
      if (seen.has(reference) || hash(row.value) !== reference) throw new Error("Duplicate or tampered evidence record");
      seen.add(reference);
      if (row.kind === "value") await store.putValue(row.value!);
      else if (row.kind === "manifest") await store.putManifest(parseOrganismManifest(row.value));
      else if (row.kind === "receipt") { parseRunReceipt(row.value); await store.putReceipt(row.value!); receipts++; }
      else throw new Error("Unknown evidence record kind");
    }
    for (const reference of states) {
      const state = await getApplicationRecord(store, reference, parseApplicationState), transition = await getApplicationRecord(store, state.transition, parseApplicationTransition);
      if (transition.intents.length) throw new Error("Evidence cannot acquire dispatch authority");
      const result = await host.service.commit({ application: transition.application, operation: transition.operation, kind: transition.kind, expectedHead: transition.previous, revision: transition.revision, memory: transition.memory, intents: [], evidence: transition.evidence, causedBy: transition.causedBy });
      if (result.digest !== reference) throw new Error("Evidence lifecycle replay mismatch");
    }
    for (const raw of v.records) {
      const row = raw as ExportRecord;
      if (row.kind !== "receipt") continue;
      const r = parseRunReceipt(row.value), m = await store.getManifest(r.manifestDigest);
      if (!m || !(await verifyReceipt(row.value, manifestToJson(m), store)).ok) throw new Error("Evidence receipt replay failed");
    }
    return { ok: true, head: expectedHead, states: states.length, receipts, claim: "content-integrity-and-pure-replay; not authorship or filesystem custody" };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
