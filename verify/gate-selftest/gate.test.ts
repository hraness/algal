/** verify/gate-selftest — self-test of the proof-maintenance gates.
 *
 * Exercises the library predicates that keep a ledger entry, a retained
 * evidence archive or a run result from promoting itself:
 *
 *   1. Suite registry: the runner admits only READY suites; unknown and
 *      planned names reject before any adapter runs.
 *   2. Claims gate (verify/lib/claims.ts): a property claiming status above
 *      `observed` needs a ready suite of the same evidence class, a nonempty
 *      result list and a consistent relation kind at parse time — then
 *      `validateClaims` requires each result to be a content-addressed
 *      `algal.retained-evidence.v1` manifest bound to that suite with
 *      classification `admitted`. Diagnostic evidence and tampered or renamed
 *      manifests never back a claim.
 *   3. Evidence retention: readRetainedEvidence re-derives the recorded
 *      inventory and rejects tampered manifests, bytes and containers before
 *      the readmission callback can run.
 *   4. Runner binding recheck: requireSameBinding and
 *      admitInfrastructureResult fail when the captured input/runtime/Git
 *      binding changed mid-run or across recording.
 *
 * Everything here calls the library functions directly on synthetic fixtures;
 * no second runner, no subprocess, no Lean/TLC dependency.
 */
import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseRegistry, suiteEvidenceClass, validateClaims, type Registry } from "../lib/claims";
import { readRetainedEvidence, retainEvidence, type EvidenceLimits } from "../lib/evidence-retention";
import { governedPaths, hashBytes, hashFile, hashJson } from "../lib/files";
import { admitInfrastructureResult, CHILD_ENV, requireSameBinding, runSuite, type RunBinding } from "../lib/runner";
import { PLANNED_SUITES, READY_SUITES, SUITES } from "../lib/suites";

// --- suite registry --------------------------------------------------------

test("the suite registry admits only READY suites", async () => {
  // The map is exactly READY ∪ PLANNED with no overlap.
  expect(new Set([...READY_SUITES, ...PLANNED_SUITES]).size).toBe(READY_SUITES.length + PLANNED_SUITES.length);
  expect(SUITES.size).toBe(READY_SUITES.length + PLANNED_SUITES.length);
  for (const name of READY_SUITES) expect(SUITES.get(name)).toBe("ready");
  for (const name of PLANNED_SUITES) expect(SUITES.get(name)).toBe("not-started");
  // The dispatch gate rejects unknown names and every planned suite before
  // any filesystem or adapter work — a listed name cannot pass by existing.
  await expect(runSuite("/unneeded", "made-up")).rejects.toThrow("unknown verification suite");
  for (const name of PLANNED_SUITES)
    await expect(runSuite("/unneeded", name)).rejects.toThrow("Not started; no passing result is available");
});

// --- claims gate ------------------------------------------------------------

function pending(): Registry["properties"][number] {
  return {
    id: "ADM-01", owner: "admission", reviewer: "independent", phase: "01", findings: ["F01"], severity: "high",
    statement: "Admission rejects over-bound input", failure: "Over-bound value is admitted",
    domain: "Bounded JSON", quantifiers: "Every admitted value", exclusions: ["Arbitrary host code"],
    profiles: ["pure-core"], assumptions: ["A-SPEC"], bounds: { cells: 16 }, versions: ["algal.organism.v1"],
    relation: { kind: "unestablished", description: "Production correspondence is pending" },
    sources: [{ path: "src/core.ts", sha256: hashBytes("source"), symbols: ["limit"] }],
    specs: [{ path: "spec/core.md", sha256: hashBytes("spec"), symbols: ["Bounded core"] }],
    licensedClaims: [], evidence: { status: "not-started", suite: "boundary", required: false, results: [] },
    unresolved: ["Build and review harness"],
  };
}
function registry(property: Registry["properties"][number]): Registry {
  return {
    contract: "algal.verification-properties.v1",
    baseline: { commit: "a".repeat(40), tree: "b".repeat(40) },
    dependencies: [{ path: "src/core.ts", sha256: hashBytes("source") }],
    profiles: [{ id: "pure-core", description: "Bounded in-memory execution", assumptions: ["A-SPEC"] }],
    properties: [property],
  };
}
function claiming(patch: Record<string, unknown>): Registry {
  const property = { ...pending(), ...(patch as object) } as Registry["properties"][number];
  return registry(property);
}

test("the claims gate: status above observed needs a ready same-class suite, nonempty results and a consistent relation", () => {
  // Control: a plain pending property parses cleanly.
  expect(() => parseRegistry(registry(pending()))).not.toThrow();
  // The declared evidence class of each in-band suite is fixed; qualified and
  // proved-implementation are unreachable in-band.
  expect(suiteEvidenceClass("lean-core")).toBe("proved-model");
  expect(suiteEvidenceClass("process-model")).toBe("finite-checked");
  expect(suiteEvidenceClass("boundary")).toBe("tested");
  // Without a suite or without results the claim rejects first.
  for (const evidence of [
    { status: "tested", suite: null, required: false, results: ["verify/results/x/manifest.json"] },
    { status: "tested", suite: "boundary", required: false, results: [] },
  ]) expect(() => parseRegistry(claiming({
    evidence, relation: { kind: "tested", description: "tested" },
  }))).toThrow("claimed evidence needs a suite and result");
  // A planned suite cannot stand in for a ready one, and an invented name is
  // not a suite at all.
  const planned = PLANNED_SUITES[0]!;
  expect(() => parseRegistry(claiming({
    evidence: { status: "tested", suite: planned, required: false, results: ["verify/results/x/manifest.json"] },
    relation: { kind: "tested", description: "tested" },
  }))).toThrow("evidence suite is Not started");
  expect(() => parseRegistry(claiming({
    evidence: { status: "tested", suite: "no-such-suite", required: false, results: ["verify/results/x/manifest.json"] },
    relation: { kind: "tested", description: "tested" },
  }))).toThrow("unknown suite");
  // The evidence status must equal the class the named suite produces: a
  // regression lane cannot back a model proof and a model suite cannot launder
  // a weaker claim; qualified and proved-implementation have no in-band class.
  for (const [status, suite] of [
    ["tested", "lean-core"], ["proved-model", "boundary"], ["finite-checked", "boundary"],
    ["qualified", "lean-core"], ["proved-implementation", "process-model"], ["proved-implementation", "boundary"],
  ] as const)
    expect(() => parseRegistry(claiming({
      evidence: { status, suite, required: false, results: ["verify/results/x/manifest.json"] },
      relation: { kind: "tested", description: "tested" },
    }))).toThrow(`${status} evidence requires a ${status}-class suite`);
  // The relation kind must match: unestablished cannot be backed by evidence;
  // proved still requires implementation evidence.
  expect(() => parseRegistry(claiming({
    evidence: { status: "tested", suite: "boundary", required: false, results: ["verify/results/x/manifest.json"] },
  }))).toThrow("relation kind unestablished cannot be backed by tested evidence");
  expect(() => parseRegistry(claiming({
    evidence: { status: "proved-model", suite: "lean-core", required: false, results: ["verify/results/x/manifest.json"] },
    relation: { kind: "proved", description: "proved" },
  }))).toThrow("proved relation requires implementation evidence");
  // Well-formed claimed evidence parses: matching class suite + results.
  for (const [status, suite] of [["tested", "boundary"], ["finite-checked", "process-model"], ["proved-model", "lean-core"]] as const)
    expect(() => parseRegistry(claiming({
      evidence: { status, suite, required: true, results: ["verify/results/x/manifest.json"] },
      relation: { kind: "tested", description: "tested" },
    }))).not.toThrow();
  // `required` on pending or merely-observed work is rejected.
  expect(() => parseRegistry(claiming({ evidence: { status: "not-started", suite: "boundary", required: true, results: [] } })))
    .toThrow("pending work cannot license claims");
  expect(() => parseRegistry(claiming({ evidence: { status: "observed", suite: "boundary", required: true, results: [] } })))
    .toThrow("required evidence has no implemented passing harness");
  // `observed` carries no result, claim or proof relation.
  expect(() => parseRegistry(claiming({ evidence: { status: "observed", suite: null, required: false, results: ["verify/results/x.json"] } })))
    .toThrow("observation is not admitted execution/proof evidence");
  expect(() => parseRegistry(claiming({ licensedClaims: ["proved correct"] }))).toThrow("pending work");
});

const scratch: string[] = [];
afterEach(async () => { for (const path of scratch.splice(0)) await rm(path, { recursive: true, force: true }); });

const LIMITS: EvidenceLimits = { maxBytes: 4096, maxFileBytes: 1024, maxEntries: 16, maxDepth: 4 };

/** A minimal governed root plus one real retained-evidence manifest under
 * verify/results, so `validateClaims` exercises the actual result-admission
 * path rather than a stand-in. The manifest's recorded suite may differ from
 * the suite the property claims, which is exactly the misattribution case. */
async function ledgerRoot(manifestSuite: string, claimSuite: string, classification: "admitted" | "diagnostic") {
  const root = await mkdtemp(join(tmpdir(), "algal-gate-ledger-"));
  scratch.push(root);
  for (const directory of ["src", "spec", "verify", "scripts", "verify/results"]) await mkdir(join(root, directory), { recursive: true });
  await writeFile(join(root, "src/core.ts"), "export const limit = 3;\n");
  await writeFile(join(root, "spec/core.md"), "# Bounded core\n");
  await writeFile(join(root, "scripts/verify.ts"), "// fixture runner\n");
  await writeFile(join(root, "verify/assumptions.md"), "| A-SPEC | reviewed contract |\n");
  await writeFile(join(root, "verify/toolchains.json"), JSON.stringify({
    contract: "algal.verification-toolchains.v1",
    tools: [{ id: "bun", version: "1.3.14", status: "available", command: ["bun"], sha256: null, notes: "fixture" }],
  }));
  const evidenceSource = join(root, "evidence-source");
  await mkdir(evidenceSource);
  await writeFile(join(evidenceSource, "raw.log"), "suite output\n");
  const base = {
    suite: manifestSuite, recordedArchive: evidenceSource, authorityDigest: hashJson("authority"), limits: LIMITS,
    sourceRoot: evidenceSource, resultsRoot: join(root, "verify/results"),
  };
  const pointer = classification === "admitted"
    ? await retainEvidence({ ...base, classification: "admitted", readmit: async () => ({ ok: true }) })
    : await retainEvidence({ ...base, classification: "diagnostic" });
  const resultPath = `verify/results/${pointer.manifest.path}`;
  const property = claiming({
    evidence: { status: "tested", suite: claimSuite, required: false, results: [resultPath] },
    relation: { kind: "tested", description: "tested" },
  }).properties[0]!;
  // Source/spec bindings must carry the real fixture digests: validateClaims
  // rejects conflicting hashes for the same path.
  property.sources = [{ path: "src/core.ts", sha256: await hashFile(root, "src/core.ts"), symbols: ["limit"] }];
  property.specs = [{ path: "spec/core.md", sha256: await hashFile(root, "spec/core.md"), symbols: ["Bounded core"] }];
  const value: Registry = { ...registry(property), dependencies: await Promise.all((await governedPaths(root)).map(async path => ({ path, sha256: await hashFile(root, path) }))) };
  await writeFile(join(root, "verify/properties.json"), JSON.stringify(value));
  return { root, resultPath };
}

test("result admission accepts a real admitted manifest and rejects forged, diagnostic and misattributed evidence", async () => {
  // Control: an admitted manifest bound to the claimed suite passes.
  const good = await ledgerRoot("boundary", "boundary", "admitted");
  const report = await validateClaims(good.root, { coverage: false });
  expect(report.statuses.tested).toBe(1);
  // Renamed/tampered manifest: the path is content-addressed, so edited bytes
  // no longer match the digest in the path.
  await writeFile(join(good.root, good.resultPath), "{}\n");
  await expect(validateClaims(good.root, { coverage: false })).rejects.toThrow("digest does not match its content");
  // A diagnostic manifest can never back a claim.
  const diagnostic = await ledgerRoot("boundary", "boundary", "diagnostic");
  await expect(validateClaims(diagnostic.root, { coverage: false })).rejects.toThrow("diagnostic evidence and cannot back a claim");
  // A manifest produced by a different suite cannot be reattributed.
  const wrongSuite = await ledgerRoot("corpus", "boundary", "admitted");
  await expect(validateClaims(wrongSuite.root, { coverage: false })).rejects.toThrow("belongs to suite corpus, not boundary");
  // A non-content-addressed result path is rejected before any read.
  const { root } = await ledgerRoot("boundary", "boundary", "admitted");
  const parsed = JSON.parse(await Bun.file(join(root, "verify/properties.json")).text()) as Registry;
  parsed.properties[0]!.evidence.results = ["verify/results/handwritten.json"];
  await writeFile(join(root, "verify/properties.json"), JSON.stringify(parsed));
  await writeFile(join(root, "verify/results/handwritten.json"), "{}");
  await expect(validateClaims(root, { coverage: false })).rejects.toThrow("not a content-addressed retained manifest");
});

// --- evidence retention -----------------------------------------------------

async function retained() {
  const root = await mkdtemp(join(tmpdir(), "algal-gate-selftest-"));
  scratch.push(root);
  const sourceRoot = join(root, "source"), resultsRoot = join(root, "results");
  await mkdir(sourceRoot); await mkdir(resultsRoot);
  await writeFile(join(sourceRoot, "case.bin"), new Uint8Array([0, 1, 2, 255]));
  const pointer = await retainEvidence({
    suite: "gate-selftest", classification: "admitted", recordedArchive: sourceRoot,
    authorityDigest: hashJson("selected authority"), limits: LIMITS,
    sourceRoot, resultsRoot, readmit: async () => ({ ok: true }),
  });
  const directory = dirname(join(resultsRoot, pointer.manifest.path));
  const selection = { suite: "gate-selftest" as const, recordedArchive: sourceRoot, authorityDigest: hashJson("selected authority"), limits: LIMITS };
  return { directory, pointer, selection };
}

test("a retained archive readmits cleanly before tampering is tested", async () => {
  const { directory, pointer, selection } = await retained();
  await expect(readRetainedEvidence({ ...selection, directory, manifestSha256: pointer.manifest.sha256, classification: "admitted", readmit: async () => ({ ok: true }) }))
    .resolves.toEqual({ ok: true });
});

for (const tamper of ["manifest-bytes", "raw-bytes", "extra-entry"] as const)
  test(`evidence retention rejects a tampered ${tamper} before readmission`, async () => {
    const { directory, pointer, selection } = await retained();
    const raw = join(directory, "raw");
    if (tamper === "manifest-bytes") await writeFile(join(directory, "manifest.json"), "{}");
    if (tamper === "raw-bytes") await writeFile(join(raw, "case.bin"), "forged");
    if (tamper === "extra-entry") await writeFile(join(directory, "extra"), "extra");
    let called = false;
    await expect(readRetainedEvidence({
      ...selection, directory, manifestSha256: pointer.manifest.sha256, classification: "admitted",
      readmit: async () => { called = true; return { ok: true }; },
    })).rejects.toThrow();
    expect(called).toBe(false);
  });

// --- runner binding recheck -------------------------------------------------

function binding(): RunBinding {
  const inputs = [{ path: "verify/model.tla", sha256: hashBytes("model") }];
  return {
    commit: "a".repeat(40), tree: "b".repeat(40), inputs, inputDigest: hashJson(inputs),
    runtime: { path: "/fixture/bun", sha256: hashBytes("bun"), version: "1.3.14", platform: "darwin", arch: "arm64" },
    environment: CHILD_ENV,
  };
}

test("the runner binding recheck fails on mid-run input changes", () => {
  const before = binding();
  // Control: an identical recapture passes.
  expect(() => requireSameBinding(before, binding())).not.toThrow();
  // A mid-run input edit changes the bound file digest and recomputed inputDigest.
  const drifted = binding();
  drifted.inputs[0]!.sha256 = hashBytes("changed model");
  drifted.inputDigest = hashJson(drifted.inputs);
  expect(() => requireSameBinding(before, drifted)).toThrow("changed during execution");
  // A new untracked input appearing mid-run is the same failure.
  const added = binding();
  added.inputs.push({ path: "verify/new.tla", sha256: hashBytes("new") });
  added.inputDigest = hashJson(added.inputs);
  expect(() => requireSameBinding(before, added)).toThrow("changed during execution");
  // A recorded result readmitted against the drifted binding rejects as stale.
  const result = { contract: "algal.verification-result.v1", suite: "claims", status: "passed", evidenceClass: "infrastructure-only", formalClaims: 0, binding: before, details: {} };
  expect(() => admitInfrastructureResult(result, "claims", before)).not.toThrow();
  expect(() => admitInfrastructureResult(result, "claims", drifted)).toThrow("stale or altered verification result binding");
  // And a passed result cannot name a planned suite either.
  const planned = PLANNED_SUITES[0]!;
  expect(() => admitInfrastructureResult({ ...result, suite: planned }, planned, before)).toThrow("unknown or mismatched result suite");
});
