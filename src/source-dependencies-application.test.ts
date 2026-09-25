import { expect, test } from "bun:test";
import { ApplicationCore, type ApplicationSnapshot } from "./application-core";
import { MemoryApplicationStorage } from "./application-storage";
import { parseOrganismManifest } from "./contract";
import type { Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  APPLICATION, buildGradesApplication, fabricateEvaluation, gradeModules, gradeSource, hash, permissive, type GradesApplication,
} from "./fixtures/source-dependencies-application";
import { createSourceDependencyReport, renderSourceDependencies, SOURCE_DEPENDENCY_BOUNDS, type SourceDependencyReport } from "./source-dependencies";
import { SOURCE_DEPENDENCY_APPLICATION_BOUNDS, type SourceDependencyApplicationReader } from "./source-dependencies-application";
import { canonicalize, type JsonValue } from "./values";

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fresh = () => new ApplicationCore(new MemoryApplicationStorage(), permissive);
const report = (reader: SourceDependencyApplicationReader, name = APPLICATION, estimate = false) =>
  createSourceDependencyReport(gradeSource, { sourceOptions: { modules: gradeModules }, estimate, application: { name, reader } });
const failure = async (work: Promise<unknown>): Promise<AlgalError> => {
  try { await work; } catch (error) { if (error instanceof AlgalError) return error; throw error; }
  throw new Error("expected an AlgalError");
};
const rowOf = (linked: SourceDependencyReport, revision: Digest) => linked.application!.entrypoints.findIndex(row => row.revision === revision);
/** Commit one memory transition at the head that cites `evidence`. */
async function cite(fixture: GradesApplication, evidence: Digest[], revision: Digest = fixture.revisions.r1): Promise<ApplicationSnapshot> {
  const head = (await fixture.core.inspect(APPLICATION))!;
  return fixture.commit("memory", head.digest, revision, evidence);
}

test("modules and occurrences link to the revisions, evaluations, and activation whose recorded closure contains their digest", async () => {
  const core = fresh();
  const fixture = await buildGradesApplication(core);
  const linked = await report(core, APPLICATION, true);
  const plain = await createSourceDependencyReport(gradeSource, { sourceOptions: { modules: gradeModules } });
  const { application, estimate: _estimate, ...rest } = linked;
  expect(canonicalize(json(rest) as unknown as JsonValue)).toBe(canonicalize(json(plain) as unknown as JsonValue));
  expect(application).toMatchObject({ name: APPLICATION, head: fixture.states.noted.digest, verification: "digest-bound" });
  const { r0, r1, r2 } = fixture.revisions;
  // R1 runs the report's root: activated at state 1 with its accepted
  // evaluation. R2 only shares the label helper and was rejected.
  expect(application!.entrypoints).toEqual([
    {
      revision: r1, entrypoint: "run", manifest: fixture.manifests.grade, root: true, complete: true, current: true,
      activation: { sequence: 1, kind: "activate", state: fixture.states.activated.digest, transition: fixture.states.activated.state.transition },
      evaluations: [{ evaluation: fixture.evaluations.accepted, parentState: fixture.states.genesis.digest, parentSequence: 0, verdict: "accepted" }],
    },
    {
      revision: r2, entrypoint: "run", manifest: fixture.manifests.rival, root: false, complete: true, current: false, activation: null,
      evaluations: [{ evaluation: fixture.evaluations.rejected, parentState: fixture.states.activated.digest, parentSequence: 1, verdict: "rejected" }],
    },
  ]);
  // R0's entrypoint is also named "run" and its program is also named
  // "grade", but its digest differs, so nothing links to it.
  expect(rowOf(linked, r0)).toBe(-1);
  expect(application!.modules).toEqual([
    { manifestDigest: fixture.manifests.grade, entrypoints: [0] },
    { manifestDigest: fixture.manifests.label, entrypoints: [0, 1] },
  ].sort((left, right) => left.manifestDigest < right.manifestDigest ? -1 : 1));
  expect(application!.modules.map(entry => entry.manifestDigest)).toEqual(linked.modules.map(module => module.manifestDigest));
  expect(application!.occurrences).toEqual([{ path: [], entrypoints: [0] }, { path: ["b1-graded"], entrypoints: [0, 1] }]);
  expect(application!.counts).toEqual({
    states: 3,
    revisions: { matched: 2, unmatched: 1, unresolved: 0 },
    // The comparison supplies the rejected evaluation; the unbound forgery is
    // unreadable, and the evaluation of a foreign state is unmatched.
    evaluations: { matched: 2, unmatched: 1, unreadable: 1 },
    evidence: { examined: 5, unreadable: 0 },
    manifests: { examined: 3, unreadable: 0 },
  });
  expect(application!.omitted).toEqual({ entrypoints: 0, evaluations: 0 });
  expect(Object.isFrozen(application!.entrypoints[0]!.activation)).toBe(true);
  const text = renderSourceDependencies(linked);
  expect(text).toContain(`Application: ${APPLICATION} · head ${fixture.states.noted.digest} · 3 states · digest-bound links from recorded evidence (evaluations not replayed)`);
  expect(text).toContain("Application evidence: revisions 2 matched, 1 unmatched, 0 unresolved · evaluation records 2 matched, 1 unmatched, 1 unreadable · evidence records 5 examined, 0 unreadable · outside manifests 3 read, 0 unreadable\n");
  expect(text).toContain(`  [0] ${r1}  run  ${fixture.manifests.grade}\n      contains the root · activated by activate at state 1 · current\n      evaluation ${fixture.evaluations.accepted} accepted at state 0\n`);
  expect(text).toContain(`  [1] ${r2}  run  ${fixture.manifests.rival}\n      shares modules · never activated\n      evaluation ${fixture.evaluations.rejected} rejected at state 1\n`);
  expect(text).toContain(`${fixture.manifests.label}  label  [0] [1]`);
  expect(text).toContain("\n  b1-graded  [0] [1]\n");
  expect(SOURCE_DEPENDENCY_BOUNDS.application).toBe(SOURCE_DEPENDENCY_APPLICATION_BOUNDS);
  // Reading the history wrote nothing.
  expect((await core.inspect(APPLICATION))!.digest).toBe(fixture.states.noted.digest);
});

test("forged, foreign, unbound, and unreadable evidence is counted rather than linked", async () => {
  const core = fresh();
  const fixture = await buildGradesApplication(core);
  const { r1 } = fixture.revisions;
  const parent = fixture.states.noted.digest;
  const candidate = async (manifest: Digest, application = APPLICATION) => fixture.put({ ...fixture.revisionBody(r1, [fixture.entry("audit", fixture.manifests.audit), fixture.entry("run", manifest)]), application });
  // A structurally bound evaluation whose candidate's entrypoint manifest is
  // absent cannot be decided: its revision is unresolved.
  const missingManifest = hash({ fixture: "absent manifest" });
  const unresolved = await fabricateEvaluation(fixture, parent, await candidate(missingManifest), "unresolved");
  // A candidate of another application is unmatched.
  const elsewhere = await fabricateEvaluation(fixture, parent, await candidate(fixture.manifests.grade, "elsewhere"), "elsewhere");
  // An evaluation whose request is not in the store, and a comparison that
  // does not parse, are unreadable.
  const orphan = await fixture.put({ ...fixture.evaluations.acceptedRecord, request: hash({ fixture: "absent request" }) });
  const broken = await fixture.put({ contract: "algal.application-comparison.v1", results: "none" });
  // A candidate whose parent is not the measured state's revision is unbound.
  const wrongParent = await fabricateEvaluation(fixture, parent, await fixture.put(fixture.revisionBody(fixture.revisions.r0, [fixture.entry("audit", fixture.manifests.audit), fixture.entry("run", fixture.manifests.grade)])), "wrong-parent");
  // A fabricated evaluation that binds everything is linked with its recorded
  // verdict: the join associates digests and never replays.
  const fabricatedRevision = await candidate(fixture.manifests.grade);
  const fabricated = await fabricateEvaluation(fixture, parent, fabricatedRevision, "fabricated");
  await cite(fixture, [unresolved, elsewhere, orphan, broken, wrongParent, fabricated]);
  const linked = await report(core);
  const application = linked.application!;
  expect(application.counts).toEqual({
    states: 4,
    revisions: { matched: 3, unmatched: 1, unresolved: 1 },
    evaluations: { matched: 3, unmatched: 2, unreadable: 4 },
    evidence: { examined: 11, unreadable: 1 },
    manifests: { examined: 4, unreadable: 1 },
  });
  const row = application.entrypoints[rowOf(linked, fabricatedRevision)]!;
  expect(row).toMatchObject({ entrypoint: "run", root: true, complete: true, current: false, activation: null });
  expect(row.evaluations).toEqual([{ evaluation: fabricated, parentState: parent, parentSequence: 2, verdict: "accepted" }]);
  expect(application.entrypoints.map(entry => entry.revision)).not.toContain(await candidate(missingManifest));
  // A tampered record in the store is unreadable, not trusted.
  const tampered = new ApplicationCore(new MemoryApplicationStorage(), permissive);
  const copy = await buildGradesApplication(tampered);
  const reader: SourceDependencyApplicationReader = {
    history: name => tampered.history(name),
    store: {
      getManifest: digest => tampered.store.getManifest(digest),
      getValue: async digest => digest === copy.evaluations.accepted ? { ...(await tampered.store.getValue(digest) as Record<string, JsonValue>), verdict: { status: "rejected", reasons: ["forged"] } } : tampered.store.getValue(digest),
    },
  };
  const forged = (await report(reader)).application!;
  expect(forged.counts.evidence).toEqual({ examined: 5, unreadable: 1 });
  expect(forged.entrypoints.find(entry => entry.revision === copy.revisions.r1)!.evaluations).toEqual([]);
});

test("closures are followed through stored manifests outside the report and marked incomplete when they cannot be read", async () => {
  const core = fresh();
  const fixture = await buildGradesApplication(core);
  const parent = fixture.states.noted.digest;
  const wrapper = (key: string, cells: unknown[]) => parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:${key}`, name: key,
    cells: [{ id: "input", kind: "input", outputs: { q: { type: "json" } } }, ...cells], edges: [],
  });
  const outside = await fixture.store.putManifest(wrapper("outside", [{ id: "inner", kind: "organism", manifest: fixture.manifests.grade }]));
  const dynamic = await fixture.store.putManifest(wrapper("dynamic", [{ id: "inner", kind: "organism", manifest: fixture.manifests.label }, { id: "later", kind: "spawn" }]));
  const dangling = await fixture.store.putManifest(wrapper("dangling", [{ id: "inner", kind: "organism", manifest: fixture.manifests.label }, { id: "gone", kind: "each", manifest: hash({ fixture: "gone" }), over: "q", maxItems: 2 }]));
  const revisions: Digest[] = [];
  const evidence: Digest[] = [];
  for (const [salt, manifest] of [["outside", outside], ["dynamic", dynamic], ["dangling", dangling]] as const) {
    const revision = await fixture.put(fixture.revisionBody(fixture.revisions.r1, [fixture.entry("audit", fixture.manifests.audit), fixture.entry("run", manifest)]));
    revisions.push(revision);
    evidence.push(await fabricateEvaluation(fixture, parent, revision, salt));
  }
  await cite(fixture, evidence);
  const linked = await report(core);
  const rows = revisions.map(revision => linked.application!.entrypoints[rowOf(linked, revision)]!);
  expect(rows.map(row => [row.manifest, row.root, row.complete])).toEqual([[outside, true, true], [dynamic, false, false], [dangling, false, false]]);
  const label = linked.application!.modules.find(entry => entry.manifestDigest === fixture.manifests.label)!;
  expect(revisions.every(revision => label.entrypoints.includes(rowOf(linked, revision)))).toBe(true);
  expect(linked.application!.counts.manifests).toEqual({ examined: 7, unreadable: 1 });
  expect(renderSourceDependencies(linked)).toContain("shares modules · closure incomplete · never activated");
});

test("a reader cannot substitute history, and unknown applications and malformed options are refused", async () => {
  const core = fresh();
  const fixture = await buildGradesApplication(core);
  const history = await core.history(APPLICATION);
  const substitute = (snapshots: readonly ApplicationSnapshot[]): SourceDependencyApplicationReader => ({ history: async () => snapshots, store: core.store });
  const swapped = history.map((snapshot, index) => index === 1 ? { ...snapshot, revision: history[0]!.revision } : snapshot);
  const code = async (reader: SourceDependencyApplicationReader, name?: string) => (await failure(report(reader, name))).code;
  expect(await code(substitute(swapped))).toBe("DIGEST_MISMATCH");
  expect(await code(substitute([history[0]!, history[2]!]))).toBe("DIGEST_MISMATCH");
  expect(await code(substitute(history.map(snapshot => ({ ...snapshot, digest: fixture.states.genesis.digest }))))).toBe("DIGEST_MISMATCH");
  expect(await code(substitute([...history].reverse()))).toBe("DIGEST_MISMATCH");
  expect(await code(core, "missing")).toBe("STORE_MISS");
  expect(await code(core, "Not A Name")).toBe("PARSE_FAILED");
  const options = (application: unknown) => createSourceDependencyReport(gradeSource, { sourceOptions: { modules: gradeModules }, application: application as never });
  expect((await failure(options({ name: APPLICATION }))).code).toBe("PARSE_FAILED");
  expect((await failure(options({ name: APPLICATION, reader: { history: () => history } }))).code).toBe("PARSE_FAILED");
  expect((await failure(options({ name: APPLICATION, reader: { history: () => history, store: { getValue: () => undefined } } }))).code).toBe("PARSE_FAILED");
  // Options are captured before the first await; replacing the reader later changes nothing.
  const live = { name: APPLICATION, reader: core as SourceDependencyApplicationReader };
  const pending = createSourceDependencyReport(gradeSource, { sourceOptions: { modules: gradeModules }, application: live });
  live.reader = substitute(swapped);
  live.name = "missing";
  expect((await pending).application!.head).toBe(fixture.states.noted.digest);
});

test("entrypoint rows and evaluation links beyond their bounds keep the latest and count the rest", async () => {
  const core = fresh();
  const fixture = await buildGradesApplication(core);
  // Three revisions with 32 entrypoints each, all running the report's root.
  const names = Array.from({ length: 32 }, (_, index) => `e${String(index).padStart(2, "0")}`);
  const other = new ApplicationCore(new MemoryApplicationStorage(fixture.store), permissive);
  const commit = (kind: "create" | "activate", expectedHead: Digest | null, revision: Digest, operation: string) =>
    other.commit({ application: "wide", operation: hash({ wide: operation }), kind, expectedHead, revision, memory: fixture.memory, intents: [], evidence: [], causedBy: null });
  const wideBody = (parent: Digest | null) => ({ ...fixture.revisionBody(parent, names.map(name => fixture.entry(name, fixture.manifests.grade))), application: "wide" });
  const first = await fixture.put(wideBody(null));
  const a = await commit("create", null, first, "a");
  const second = await fixture.put(wideBody(first));
  const b = await commit("activate", a.digest, second, "b");
  const third = await fixture.put(wideBody(second));
  await commit("activate", b.digest, third, "c");
  const rows = (await report(other, "wide")).application!;
  expect(rows.entrypoints).toHaveLength(SOURCE_DEPENDENCY_APPLICATION_BOUNDS.maxEntrypoints);
  expect(rows.omitted).toEqual({ entrypoints: 32, evaluations: 0 });
  expect(new Set(rows.entrypoints.map(row => row.revision))).toEqual(new Set([second, third]));
  expect(rows.entrypoints.slice(0, 32).every(row => row.revision === second) && rows.entrypoints.slice(32).every(row => row.revision === third && row.current)).toBe(true);
  expect(rows.modules.every(entry => entry.entrypoints.length === 64)).toBe(true);
  expect(rows.counts.revisions).toEqual({ matched: 3, unmatched: 0, unresolved: 0 });
  // Seventeen evaluation records of one candidate entrypoint keep the latest sixteen.
  const candidate = await fixture.put(fixture.revisionBody(fixture.revisions.r1, [fixture.entry("audit", fixture.manifests.audit), fixture.entry("run", fixture.manifests.grade)]));
  const records: Digest[] = [];
  for (let index = 0; index < 17; index++) records.push(await fabricateEvaluation(fixture, fixture.states.noted.digest, candidate, index));
  await cite(fixture, records.slice(0, 9));
  await cite(fixture, records.slice(9));
  const linked = await report(core);
  const row = linked.application!.entrypoints[rowOf(linked, candidate)]!;
  expect(row.evaluations).toHaveLength(SOURCE_DEPENDENCY_APPLICATION_BOUNDS.maxEvaluations);
  expect(linked.application!.omitted).toEqual({ entrypoints: 0, evaluations: 1 });
  expect(renderSourceDependencies(linked)).toContain("omitted 0 entrypoint rows, 1 evaluation link");
});

test("evidence that needs more record reads than the bound is refused", async () => {
  const core = fresh();
  const fixture = await buildGradesApplication(core);
  // 29 transitions cite 16 comparisons of 8 evaluations each: 464 evidence
  // reads plus 3,712 evaluation reads exceed the 4,096-read bound.
  for (let transition = 0; transition < 29; transition++) {
    const comparisons: Digest[] = [];
    for (let slot = 0; slot < 16; slot++) {
      const results = Array.from({ length: 8 }, (_, row) => ({
        revision: hash({ transition, slot, row, kind: "revision" }), manifest: hash({ transition, slot, row, kind: "manifest" }),
        evaluation: hash({ transition, slot, row, kind: "evaluation" }), verdict: "rejected",
      })).sort((left, right) => left.revision < right.revision ? -1 : 1);
      comparisons.push(await fixture.put({
        contract: "algal.application-comparison.v1", application: APPLICATION, parentState: fixture.states.genesis.digest, entrypoint: "run", environment: "lab",
        cases: fixture.cases, scorer: fixture.scorer, policy: fixture.evaluationPolicy, results, selected: null,
      }));
    }
    await cite(fixture, comparisons);
  }
  const refused = await failure(report(core));
  expect(refused.code).toBe("BUDGET_EXHAUSTED");
  expect(refused.message).toContain(`more than ${SOURCE_DEPENDENCY_APPLICATION_BOUNDS.maxRecords} record reads`);
});
