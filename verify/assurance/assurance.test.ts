import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseRegistry, type EvidenceState, type Property, type Registry } from "../lib/claims";
import { retainEvidence } from "../lib/evidence-retention";
import { governedPaths, hashBytes, hashFile, readJson, stableJson } from "../lib/files";
import { checkManifestConsistency, checkManifestEvidence, deriveManifest, parseAssuranceManifest, MANIFEST_PATH, type AssuranceManifest } from "./manifest";
import { runAssurance } from "./run";
import { checkToolchains, parseDistributions } from "./toolchains";

const ROOT = resolve(import.meta.dir, "..", "..");
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

const RESULT = `verify/results/${"a".repeat(64)}/manifest.json`;
const BINDING = { path: RESULT, sha256: `sha256:${"a".repeat(64)}` };

type Claim = AssuranceManifest["claims"][number];
function claim(over: Partial<Claim> = {}): Claim {
  return { id: "ADM-01", evidence: "tested", suite: "boundary", required: true, results: [BINDING],
    inputs: [{ path: "spec/core.md", sha256: `sha256:${"2".repeat(64)}` }, { path: "src/core.ts", sha256: `sha256:${"1".repeat(64)}` }], ...over };
}
function manifest(claims: Claim[] = [claim()]): AssuranceManifest {
  return { contract: "algal.assurance-manifest.v1", registryDigest: `sha256:${"0".repeat(64)}`, toolchainsDigest: `sha256:${"0".repeat(64)}`, distributionsDigest: `sha256:${"0".repeat(64)}`, inputDigest: `sha256:${"0".repeat(64)}`, claims };
}
function property(over: Partial<Property> = {}): Property {
  return {
    id: "ADM-01", owner: "assurance", reviewer: "independent", phase: "17", findings: ["F01"], severity: "high",
    statement: "s", failure: "f", domain: "d", quantifiers: "q", exclusions: [], profiles: ["pure-core"], assumptions: ["A-SPEC"],
    bounds: { cells: 4 }, versions: ["algal.organism.v1"], relation: { kind: "tested", description: "harness correspondence" },
    sources: [{ path: "src/core.ts", sha256: `sha256:${"1".repeat(64)}`, symbols: ["limit"] }],
    specs: [{ path: "spec/core.md", sha256: `sha256:${"2".repeat(64)}`, symbols: ["Bounded core"] }],
    licensedClaims: [], unresolved: [], evidence: { status: "tested", suite: "boundary", required: true, results: [RESULT] }, ...over,
  };
}
function registry(properties: Property[] = [property()]): Registry {
  return { contract: "algal.verification-properties.v1", baseline: { commit: "a".repeat(40), tree: "b".repeat(40) }, dependencies: [{ path: "src/core.ts", sha256: `sha256:${"1".repeat(64)}` }], profiles: [{ id: "pure-core", description: "Bounded", assumptions: ["A-SPEC"] }], properties };
}

describe("assurance manifest schema", () => {
  test("admits a closed bounded manifest at every evidence class", () => {
    for (const evidence of ["not-started", "observed", "tested", "finite-checked", "proved-model", "proved-implementation", "qualified"] as const)
      expect(parseAssuranceManifest(manifest([claim({ evidence })])).claims[0]!.evidence).toBe(evidence);
  });
  test("rejects unknown keys, contract drift, duplicate ids and unknown suites", () => {
    expect(() => parseAssuranceManifest({ ...manifest(), extra: true })).toThrow("unknown key");
    expect(() => parseAssuranceManifest({ ...manifest(), contract: "algal.other.v1" })).toThrow("contract");
    expect(() => parseAssuranceManifest(manifest([claim(), claim()]))).toThrow("duplicate claim id");
    expect(() => parseAssuranceManifest(manifest([claim({ suite: "missing-suite" })]))).toThrow("unknown suite");
    expect(() => parseAssuranceManifest(manifest([claim({ evidence: "green" as EvidenceState })]))).toThrow("unknown value");
  });
  test("rejects non-content-addressed results, stale bindings and unsorted inputs", () => {
    expect(() => parseAssuranceManifest(manifest([claim({ results: [{ path: "verify/results/deadbeef/manifest.json", sha256: `sha256:${"a".repeat(64)}` }] })]))).toThrow("content-addressed");
    expect(() => parseAssuranceManifest(manifest([claim({ results: [{ path: RESULT, sha256: `sha256:${"b".repeat(64)}` }] })]))).toThrow("content address");
    const inputs = [{ path: "src/b.ts", sha256: `sha256:${"1".repeat(64)}` }, { path: "src/a.ts", sha256: `sha256:${ "2".repeat(64) }` }];
    expect(() => parseAssuranceManifest(manifest([claim({ inputs })]))).toThrow("sorted");
    expect(() => parseAssuranceManifest(manifest([claim({ inputs: [inputs[0]!, inputs[0]!] })]))).toThrow("duplicate");
    expect(() => parseAssuranceManifest(manifest([claim({ inputs: [] })]))).toThrow("1..512");
    expect(() => parseAssuranceManifest(manifest([claim({ results: Array.from({ length: 65 }, (_, i) => ({ path: `verify/results/${String(i).padStart(64, "0")}/manifest.json`, sha256: `sha256:${String(i).padStart(64, "0")}` })) })]))).toThrow("64");
  });
});

describe("ledger consistency", () => {
  test("a faithful mirror validates", () => {
    checkManifestConsistency(manifest(), registry());
  });
  test("promotion, demotion, order and coverage drift reject", () => {
    expect(() => checkManifestConsistency(manifest([claim({ evidence: "finite-checked" })]), registry())).toThrow("differs from ledger");
    expect(() => checkManifestConsistency(manifest([claim({ evidence: "not-started" })]), registry())).toThrow("differs from ledger");
    expect(() => checkManifestConsistency(manifest([claim({ id: "VAL-01" })]), registry())).toThrow("ledger order differs");
    expect(() => checkManifestConsistency(manifest([claim(), claim({ id: "VAL-01" })]), registry())).toThrow("inventory differs");
  });
  test("no claim states above what the suite's evidence class supports", () => {
    const propertyAt = (status: EvidenceState, suite: string | null) => property({ evidence: { status, suite, required: true, results: [RESULT] } });
    const claimAt = (evidence: EvidenceState, suite: string | null) => claim({ evidence, suite });
    // A model-level suite cannot back proved-implementation or qualified.
    expect(() => checkManifestConsistency(manifest([claimAt("proved-implementation", "lean-core")]), registry([propertyAt("proved-implementation", "lean-core")]))).toThrow("not the proved-model evidence");
    expect(() => checkManifestConsistency(manifest([claimAt("qualified", "lean-core")]), registry([propertyAt("qualified", "lean-core")]))).toThrow("not the proved-model evidence");
    // A test lane cannot back model or finite-checked claims.
    expect(() => checkManifestConsistency(manifest([claimAt("proved-model", "boundary")]), registry([propertyAt("proved-model", "boundary")]))).toThrow("not the tested evidence");
    expect(() => checkManifestConsistency(manifest([claimAt("finite-checked", "boundary")]), registry([propertyAt("finite-checked", "boundary")]))).toThrow("not the tested evidence");
    // A finite-checked lane cannot back tested claims either — exact class.
    expect(() => checkManifestConsistency(manifest([claimAt("tested", "process-model")]), registry([propertyAt("tested", "process-model")]))).toThrow("not the finite-checked evidence");
  });
  test("ready evidence needs a READY suite and a retained result", () => {
    const planned = property({ evidence: { status: "tested", suite: "hosted-model", required: false, results: [RESULT] } });
    expect(() => checkManifestConsistency(manifest([claim({ suite: "hosted-model", required: false })]), registry([planned]))).toThrow("READY suite");
    const empty = property({ evidence: { status: "tested", suite: "boundary", required: false, results: [RESULT] } });
    expect(() => checkManifestConsistency(manifest([claim({ required: false, results: [] })]), registry([empty]))).toThrow("needs a retained result");
    const unbound = property({ evidence: { status: "observed", suite: "boundary", required: false, results: [] }, relation: { kind: "assumed", description: "reviewed" } });
    expect(() => checkManifestConsistency(manifest([claim({ evidence: "observed", required: true, results: [BINDING] })]), registry([unbound]))).toThrow("required flag differs");
  });
  test("pending or observed claims cannot cite results or be required", () => {
    for (const status of ["not-started", "observed"] as const) {
      const observed = property({ evidence: { status, suite: "boundary", required: false, results: [] }, relation: { kind: "assumed", description: "reviewed" }, unresolved: ["watch"] });
      expect(() => checkManifestConsistency(manifest([claim({ evidence: status, required: false, results: [BINDING] })]), registry([observed]))).toThrow("cannot cite results");
      const forced = property({ evidence: { status, suite: "boundary", required: true, results: [] }, relation: { kind: "assumed", description: "reviewed" }, unresolved: ["watch"] });
      expect(() => checkManifestConsistency(manifest([claim({ evidence: status, required: true, results: [] })]), registry([forced]))).toThrow("cannot cite results");
    }
  });
  test("result set and governing inputs must mirror the ledger", () => {
    const other = `verify/results/${"b".repeat(64)}/manifest.json`;
    expect(() => checkManifestConsistency(manifest([claim({ results: [{ path: other, sha256: `sha256:${"b".repeat(64)}` }] })]), registry())).toThrow("result set differs");
    expect(() => checkManifestConsistency(manifest([claim({ inputs: [{ path: "src/core.ts", sha256: `sha256:${"1".repeat(64)}` }, { path: "spec/core.md", sha256: `sha256:${"3".repeat(64)}` }] })]), registry())).toThrow("digest differs");
    expect(() => checkManifestConsistency(manifest([claim({ inputs: [{ path: "src/other.ts", sha256: `sha256:${"1".repeat(64)}` }] })]), registry())).toThrow("governing input set differs");
    const untested = property({ evidence: { status: "observed", suite: null, required: false, results: [] }, relation: { kind: "assumed", description: "reviewed" } });
    expect(() => checkManifestConsistency(manifest([claim({ evidence: "observed", suite: "boundary", required: false, results: [] })]), registry([untested]))).toThrow("suite boundary differs");
  });
});

const LIMITS = { maxBytes: 1_048_576, maxFileBytes: 1_048_576, maxEntries: 64, maxDepth: 8 };
async function retain(root: string, suite: string, classification: "admitted" | "diagnostic"): Promise<string> {
  const sourceRoot = join(root, `archive-${classification}`);
  await mkdir(sourceRoot, { recursive: true });
  await writeFile(join(sourceRoot, "output.json"), JSON.stringify({ suite, classification }));
  const base = { suite, recordedArchive: sourceRoot, authorityDigest: hashBytes(`${suite}-authority`), limits: LIMITS, sourceRoot, resultsRoot: join(root, "verify/results") };
  const pointer = classification === "admitted"
    ? await retainEvidence({ ...base, classification: "admitted", readmit: async () => ({ admitted: true }) })
    : await retainEvidence({ ...base, classification: "diagnostic" });
  return `verify/results/${pointer.manifest.path}`;
}

async function fixture(): Promise<{ root: string; registry: Registry; retainedPath: string }> {
  const root = await mkdtemp(join(tmpdir(), "algal-assurance-"));
  roots.push(root);
  for (const directory of ["src", "spec", "verify/results", "verify/assurance", "scripts"]) await mkdir(join(root, directory), { recursive: true });
  await writeFile(join(root, "src/core.ts"), "export const limit = 3;\n");
  await writeFile(join(root, "spec/core.md"), "# Bounded core\n");
  await writeFile(join(root, "scripts/verify.ts"), "// fixture runner\n");
  await writeFile(join(root, "verify/assumptions.md"), "| A-SPEC | reviewed contract |\n");
  const retainedPath = await retain(root, "boundary", "admitted");
  const source = { path: "src/core.ts", sha256: await hashFile(root, "src/core.ts"), symbols: ["limit"] };
  const spec = { path: "spec/core.md", sha256: await hashFile(root, "spec/core.md"), symbols: ["Bounded core"] };
  const base = { owner: "assurance", reviewer: "independent", phase: "17", findings: ["F01"], severity: "high" as const,
    statement: "s", failure: "f", domain: "d", quantifiers: "q", exclusions: [], profiles: ["pure-core"], assumptions: ["A-SPEC"],
    bounds: { cells: 4 }, versions: ["algal.organism.v1"], sources: [source], specs: [spec], licensedClaims: [] };
  const registry: Registry = {
    contract: "algal.verification-properties.v1", baseline: { commit: "a".repeat(40), tree: "b".repeat(40) },
    dependencies: await Promise.all((await governedPaths(root)).map(async path => ({ path, sha256: await hashFile(root, path) }))),
    profiles: [{ id: "pure-core", description: "Bounded", assumptions: ["A-SPEC"] }],
    properties: [
      { ...base, id: "ADM-01", relation: { kind: "tested", description: "harness correspondence" }, evidence: { status: "tested", suite: "boundary", required: true, results: [retainedPath] }, unresolved: [] },
      { ...base, id: "VAL-01", relation: { kind: "assumed", description: "reviewed" }, evidence: { status: "observed", suite: "boundary", required: false, results: [] }, unresolved: ["watch"] },
      { ...base, id: "STO-01", relation: { kind: "unestablished", description: "pending" }, evidence: { status: "not-started", suite: "hosted-model", required: false, results: [] }, unresolved: ["harness pending"] },
    ],
  };
  await writeFile(join(root, "verify/properties.json"), JSON.stringify(registry));
  await writeFile(join(root, "verify/toolchains.json"), JSON.stringify({ contract: "algal.verification-toolchains.v1", tools: [{ id: "bun", version: Bun.version, status: "available", command: ["bun"], sha256: null, notes: "runtime bound" }] }));
  await writeFile(join(root, "verify/toolchain-distributions.json"), JSON.stringify({ contract: "algal.verification-toolchain-distributions.v1", scope: "fixture", distributions: [{ id: "bun", version: Bun.version, platform: "test", url: "https://example.invalid/bun.tgz", bytes: 1, sha256: "0".repeat(64), verification: "fixture" }] }));
  return { root, registry, retainedPath };
}

async function commitManifest(root: string, registry: Registry): Promise<AssuranceManifest> {
  const manifest = await deriveManifest(root, registry);
  await writeFile(join(root, MANIFEST_PATH), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

describe("result resolution and freshness", () => {
  test("a derived manifest passes the full pipeline", async () => {
    const { root, registry } = await fixture();
    await commitManifest(root, registry);
    const details = await runAssurance(root);
    expect(details.claims).toBe(3);
    expect(details.statuses.tested).toBe(1);
    expect(details.resolvedResults).toBe(1);
  });
  test("result manifests must be admitted and suite-matching", async () => {
    const { root, registry, retainedPath } = await fixture();
    const manifest = await commitManifest(root, registry);
    // Wrong-suite retained evidence: claim mirrors the ledger's path, but the
    // retained manifest records another suite.
    const wrongSuitePath = await retain(root, "claims", "admitted");
    const wrongRegistry = { ...registry, properties: [{ ...registry.properties[0]!, evidence: { status: "tested" as const, suite: "boundary", required: true, results: [wrongSuitePath] } }] };
    const wrong = await deriveManifest(root, wrongRegistry);
    await expect(checkManifestEvidence(root, wrong)).rejects.toThrow("belongs to suite");
    // Diagnostic evidence can never back a claim.
    const diagnosticPath = await retain(root, "boundary", "diagnostic");
    const diagRegistry = { ...registry, properties: [{ ...registry.properties[0]!, evidence: { status: "tested" as const, suite: "boundary", required: true, results: [diagnosticPath] } }] };
    const diag = await deriveManifest(root, diagRegistry);
    await expect(checkManifestEvidence(root, diag)).rejects.toThrow("diagnostic evidence");
    // Tampered raw bytes fail the deep re-inventory.
    const tampered = structuredClone(manifest);
    await writeFile(join(root, "verify/results", retainedPath.split("/")[2]!, "raw", "output.json"), '{"tampered":true}');
    await expect(checkManifestEvidence(root, tampered)).rejects.toThrow();
  });
  test("stale digests and changed inputs invalidate the manifest", async () => {
    const { root, registry } = await fixture();
    const manifest = await commitManifest(root, registry);
    await writeFile(join(root, "src/new.ts"), "export const added = 1;\n");
    await expect(checkManifestEvidence(root, manifest)).rejects.toThrow("stale governing input set");
    await rm(join(root, "src/new.ts"));
    await writeFile(join(root, "src/core.ts"), "export const limit = 4;\n");
    await expect(checkManifestEvidence(root, manifest)).rejects.toThrow("stale governing input set");
    await writeFile(join(root, "verify/properties.json"), "{}");
    await expect(checkManifestEvidence(root, manifest)).rejects.toThrow("stale properties digest");
  });
});

describe("toolchain pins", () => {
  test("pins checksum-verify provisioned artifacts; absence is reported, not hidden", async () => {
    const report = await checkToolchains(ROOT);
    const byId = new Map(report.tools.map(tool => [tool.id, tool]));
    expect(byId.get("bun")!.verification).toBe("runtime-bound");
    expect(byId.get("bun")!.boundArtifacts[0]!.path).toBe(await realpath(process.execPath));
    for (const tool of report.tools) {
      if (tool.advertised === "planned") expect(tool.pin).toBeNull();
      if (tool.pin !== null && tool.boundArtifacts.length > 0) expect(tool.verification).toBe("checksum-verified");
      expect(["checksum-verified", "runtime-bound", "toolchain-listed", "command-resolved", "not-provisioned", "planned"]).toContain(tool.verification);
    }
    expect(report.distributions).toBeGreaterThan(0);
  });
  test("planned tools carry no pin and distributions must match tool pins", () => {
    const distributions = { contract: "algal.verification-toolchain-distributions.v1", scope: "s", distributions: [{ id: "java", version: "1", platform: "p", url: "https://example.invalid/a.tgz", bytes: 1, sha256: "0".repeat(64), verification: "v" }] };
    expect(parseDistributions(distributions).distributions).toHaveLength(1);
    expect(() => parseDistributions({ ...distributions, extra: 1 })).toThrow("unknown key");
    expect(() => parseDistributions({ ...distributions, distributions: [{ ...distributions.distributions[0], sha256: "zz" }] })).toThrow("sha256");
    expect(() => parseDistributions({ ...distributions, distributions: [{ ...distributions.distributions[0], url: "http://example.invalid/a" }] })).toThrow("https");
  });
  test("pin mismatch, unprovisioned pins and version drift are distinguished", async () => {
    const { root } = await fixture();
    await mkdir(join(root, "tools"), { recursive: true });
    await writeFile(join(root, "tools/t.jar"), "jar bytes");
    const jarDigest = await hashFile(root, "tools/t.jar");
    const writeTools = async (tools: unknown) => writeFile(join(root, "verify/toolchains.json"), JSON.stringify({ contract: "algal.verification-toolchains.v1", tools }));
    const bunTool = { id: "bun", version: Bun.version, status: "available", command: ["bun"], sha256: null, notes: "n" };
    // A provisioned artifact that hashes to the pin verifies.
    await writeTools([bunTool, { id: "t", version: "1", status: "available", command: [join(root, "tools/t.jar")], sha256: jarDigest, notes: "n" }]);
    let report = await checkToolchains(root);
    expect(report.tools.find(tool => tool.id === "t")!.verification).toBe("checksum-verified");
    // Mutated bytes fail the pin outright.
    await writeFile(join(root, "tools/t.jar"), "forged");
    await expect(checkToolchains(root)).rejects.toThrow("checksum pin matches no artifact");
    // An absent artifact is recorded, not claimed.
    await writeTools([bunTool, { id: "t", version: "1", status: "available", command: [join(root, "tools/missing.jar")], sha256: jarDigest, notes: "n" }]);
    report = await checkToolchains(root);
    expect(report.tools.find(tool => tool.id === "t")!.verification).toBe("not-provisioned");
    // A planned tool with a pin, a Bun version drift and a bad distribution all fail.
    await writeTools([{ id: "t", version: "1", status: "planned", command: ["t"], sha256: jarDigest, notes: "n" }]);
    await expect(checkToolchains(root)).rejects.toThrow("planned tool cannot carry");
    // Version drift: the distribution is moved with the pin so the executed-runtime check fires.
    await writeFile(join(root, "verify/toolchain-distributions.json"), JSON.stringify({ contract: "algal.verification-toolchain-distributions.v1", scope: "fixture", distributions: [{ id: "bun", version: "0.0.0", platform: "test", url: "https://example.invalid/bun.tgz", bytes: 1, sha256: "0".repeat(64), verification: "fixture" }] }));
    await writeTools([{ ...bunTool, version: "0.0.0" }]);
    await expect(checkToolchains(root)).rejects.toThrow("differs from pinned");
  });
});

describe("live ledger", () => {
  test("the committed manifest parses, mirrors the ledger and verifies against the tree", async () => {
    const registry = parseRegistry(await readJson(ROOT, "verify/properties.json"));
    const manifest = parseAssuranceManifest(await readJson(ROOT, MANIFEST_PATH));
    checkManifestConsistency(manifest, registry);
    await checkManifestEvidence(ROOT, manifest);
    const derived = await deriveManifest(ROOT, registry);
    expect(stableJson(derived)).toBe(stableJson(manifest));
  });
  test("committed manifest covers every ledger property once", async () => {
    const manifest = parseAssuranceManifest(await readJson(ROOT, MANIFEST_PATH));
    const registry = parseRegistry(await readJson(ROOT, "verify/properties.json"));
    expect(manifest.claims.map(claim => claim.id)).toEqual(registry.properties.map(property => property.id));
    expect(new Set(manifest.claims.map(claim => claim.evidence)).size).toBeGreaterThan(0);
  });
});
