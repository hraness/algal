import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ApplicationService } from "./application";
import { parseOrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { collectApplicationViewEvidence, parseApplicationViewEvidence, parseApplicationView, projectApplicationView } from "./application-view";
import type { JsonValue } from "./values";

const dirs: string[] = [], hash = (v: unknown) => digestCanonical(v as JsonValue);
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, {recursive: true, force: true}); });
async function fixture(count = 1, hostProbe = false) {
  const dir = await mkdtemp(join(tmpdir(), "algal-view-evidence-")); dirs.push(dir);
  const service = new ApplicationService(dir, {async admitCommit() {}}), store = service.store;
  const manifest = await store.putManifest(parseOrganismManifest({contract: "algal.organism.v1", key: "organism:probe", name: "Probe", cells: [{id: "value", kind: "const", outputs: {out: {type: "json", value: true}}}], edges: []}));
  const probeManifest = hostProbe ? await store.putValue({contract: "algal.fixture-host-probe.v1", id: "read-stock", maxBytes: 1024}) : manifest;
  const schema = await store.putValue({contract: "algal.application-memory-schema.v1", relations: [{name: "available", arity: 1}]}), decoder = hash("decoder"), frontier = hash("frontier");
  const program = await store.putValue({contract: "algal.query.v1", rules: [], query: {relation: "available", terms: [{var: "x"}, {var: "polarity"}]}, limits: {maxWork: 50000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262144}});
  const probes: Digest[] = [], observations: Digest[] = [];
  let currentScope!: Digest;
  for (let i = 0; i < count; i++) {
    const procedure = await store.putValue({contract: "algal.application-memory-procedure.v1", id: `probe-${i}`, schema, manifest: probeManifest, decoder, dependencies: ["stock"], prerequisite: null}); probes.push(procedure);
    currentScope = await store.putValue({contract: "algal.application-memory-scope.v1", application: "demo", environment: "fixture", task: "task", frontier, bindings: [{key: "stock", version: {kind: "token", issuer: "fixture", value: "v1"}}], completeFor: [procedure], attestation: hash("attestation")});
    const raw = await store.putValue({observed: i}), receipt = await store.putValue({contract: "algal.fixture-receipt.v1", raw});
    observations.push(await store.putValue({contract: "algal.application-memory-observation.v1", application: "demo", scope: currentScope, procedure, raw, receipt, decoder, admission: hash("admission"), claims: [{relation: "available", tuple: [i], polarity: "supported"}]}));
  }
  probes.sort(); observations.sort();
  const queryRefs: Digest[] = [];
  for (let i = 0; i < probes.length; i += 16) queryRefs.push(await store.putValue({contract: "algal.application-memory-query.v1", id: `query-${i}`, schema, program, procedures: probes.slice(i, i + 16), polarityColumn: 1, conflict: "single-value"}));
  queryRefs.sort();
  const queries = await store.putValue({contract: "algal.application-memory-queries.v1", queries: queryRefs});
  const views = await store.putValue({contract: "algal.application-view-spec.v1", title: "Evidence", widgets: ["investigations", "memory", "procedures"]});
  const metadata = await store.putValue({contract: "algal.fixture.v1"});
  const revision = await store.putValue({contract: "algal.application-revision.v1", application: "demo", parent: null, schema, queries, views, runtimeProfile: metadata, evaluationPolicy: metadata, capabilityRequirements: [], entrypoints: [{name: "discover", manifest, applicability: queryRefs[0]!, maxGenerations: 1, capabilities: [], queries: queryRefs}]});
  const memory = await store.putValue({contract: "algal.application-memory.v1", application: "demo", schema, previous: null, scope: currentScope, observations, hypotheses: [], withdrawn: []});
  const initial = await service.create({application: "demo", operation: hash("genesis"), kind: "create", expectedHead: null, revision, memory, intents: [], evidence: [], causedBy: null});
  async function derivation(state: Digest, status: "unknown" | "supported" = "unknown") {
    return store.putValue({contract: "algal.application-memory-derivation.v1", application: "demo", capturedState: state, memory, query: queryRefs[0]!, frontier, engine: hash("engine"), admission: hash("admission"), status, conditional: true, verified: status === "supported", result: status === "supported" ? metadata : null, snapshot: status === "supported" ? metadata : null, program, sourceRefs: status === "supported" ? observations : [], work: 1, reason: null});
  }
  return {service, store, initial, revision, memory, probes, observations, queryRefs, program, derivation};
}

test("diagnostics retain unresolved request, declared probes and actual budget without querying", async () => {
  const f = await fixture(), unresolved = await f.derivation(f.initial.digest);
  const request = await f.store.putValue({contract: "algal.application-investigation-request.v1", application: "demo", state: f.initial.digest, memory: f.memory, entrypoint: "discover", query: f.queryRefs[0]!, procedures: f.probes, derivation: unresolved});
  const next = await f.service.commit({application: "demo", operation: hash("investigate"), kind: "investigate", expectedHead: f.initial.digest, revision: f.revision, memory: f.memory, intents: [{kind: "deliver", route: "investigator", message: request}], evidence: [unresolved], causedBy: null});
  const history = await f.service.history("demo"), evidence = await collectApplicationViewEvidence(f.service, history);
  expect(evidence.queries[0]!.status).toBe("unknown"); expect(evidence.queries[0]!.derivation).toBeNull();
  expect(evidence.probes[0]!.dependencies).toEqual(["stock"]); expect(evidence.probes[0]!.budgets!.maxSteps).toBeGreaterThan(0);
  expect(evidence.work[0]).toMatchObject({sourceState: next.digest, request, query: f.queryRefs[0], procedures: f.probes, status: "pending", process: null});
  expect(evidence.sources[0]!.observation).toBe(f.observations[0]!);
  await expect(collectApplicationViewEvidence(f.service, history, [unresolved])).rejects.toThrow("captured state");
  const current = await f.derivation(next.digest, "supported"), supported = await collectApplicationViewEvidence(f.service, history, [current]);
  const spec = {contract: "algal.application-view-spec.v1" as const, title: "Evidence", widgets: ["procedures" as const]};
  const view = projectApplicationView({snapshot: next, history, spec, evidence: supported});
  expect(view.procedures[0]!.applicability).toBe("supported"); expect(view.actions).toEqual([]);
  expect(() => projectApplicationView({snapshot: next, history, spec, evidence: supported, applicability: {discover: {status: "opposed"}}})).toThrow("conflicts");
  const inherited = Object.create({discover: {status: "opposed"}}) as NonNullable<Parameters<typeof projectApplicationView>[0]["applicability"]>;
  expect(projectApplicationView({snapshot: next, history, spec, evidence: supported, applicability: inherited}).procedures[0]!.applicability).toBe("supported");
  expect(() => parseApplicationView({...view, evidence: {...supported, state: f.initial.digest}})).toThrow("captured state");
  expect(() => parseApplicationView({...view, evidence: {...supported, revisions: [{...supported.revisions.at(-1)!, revision: hash("foreign")} ]}})).toThrow("revision");
  expect(parseApplicationViewEvidence({...supported, revisions: [{...supported.revisions.at(-1)!, kind: "propose"}]}).revisions.at(-1)!.kind).toBe("propose");
  expect(() => parseApplicationViewEvidence({...supported, revisions: [{...supported.revisions.at(-1)!, kind: "generate"}]})).toThrow("transition kind");
});

test("host-owned probe declarations never acquire invented VM budgets", async () => {
  const f = await fixture(1, true), evidence = await collectApplicationViewEvidence(f.service, await f.service.history("demo"));
  expect(evidence.probes[0]!.budgets).toBeNull();
  expect(await f.store.getValue(evidence.probes[0]!.manifest)).toMatchObject({contract: "algal.fixture-host-probe.v1", maxBytes: 1024});
  expect(() => parseApplicationViewEvidence({...evidence, probes: [{...evidence.probes[0]!, budgets: {maxSteps: 0, maxWork: 1, maxAgentCalls: 0, maxOutputBytes: 1}}]})).toThrow();
});

test("diagnostic summaries clip details deterministically and retain complete references", async () => {
  const f = await fixture(33), message = await f.store.putValue({payload: "retained"});
  let current = f.initial;
  for (let i = 1; i <= 34; i++) current = await f.service.commit({application: "demo", operation: hash(`step-${i}`), kind: "memory", expectedHead: current.digest, revision: f.revision, memory: f.memory, intents: [{kind: "deliver", route: "inbox", message}], evidence: [], causedBy: null});
  const history = await f.service.history("demo"), evidence = await collectApplicationViewEvidence(f.service, history);
  expect(evidence.probes.map(p => p.procedure)).toEqual(f.probes.slice(0, 32));
  expect(evidence.sources.map(s => s.observation)).toEqual(f.observations.slice(0, 32));
  expect(evidence.revisions.map(r => r.state)).toEqual(history.slice(-32).map(s => s.digest));
  expect(evidence.work.map(w => w.sourceState)).toEqual(history.slice(-32).map(s => s.digest));
  expect(evidence.truncated).toEqual({queries: false, probes: true, sources: true, revisions: true, work: true});
  expect(evidence.queries.flatMap(q => q.procedures).sort()).toEqual(f.probes);
  expect(() => parseApplicationViewEvidence({...evidence, probes: [...evidence.probes, evidence.probes[0]]})).toThrow();
  expect(() => parseApplicationViewEvidence({...evidence, work: [{...evidence.work[0]!, status: "settled"}, ...evidence.work.slice(1)]})).toThrow("settlement");
});
