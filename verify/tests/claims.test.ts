import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseRegistry, parseToolchains, validateClaims, type Registry } from "../lib/claims";
import { governedPaths, hashBytes, hashFile, hashJson, inputBindings, readFileBounded, readJson } from "../lib/files";

const roots: string[] = [];
async function fixture(): Promise<{ root: string; registry: Registry }> {
  const root = await mkdtemp(join(tmpdir(), "algal-verification-"));
  roots.push(root);
  for (const directory of ["src", "spec", "verify", "scripts"]) await mkdir(join(root, directory));
  await writeFile(join(root, "src/core.ts"), "export const limit = 3;\n");
  await writeFile(join(root, "spec/core.md"), "# Bounded core\n");
  await writeFile(join(root, "scripts/verify.ts"), "// fixture runner\n");
  await writeFile(join(root, "verify/assumptions.md"), "| A-SPEC | reviewed contract |\n");
  const source = { path: "src/core.ts", sha256: await hashFile(root, "src/core.ts") };
  const spec = { path: "spec/core.md", sha256: await hashFile(root, "spec/core.md") };
  const registry: Registry = {
    contract: "algal.verification-properties.v1", baseline: { commit: "a".repeat(40), tree: "b".repeat(40) }, dependencies: await Promise.all((await governedPaths(root)).map(async path => ({ path, sha256: await hashFile(root, path) }))),
    profiles: [{ id: "pure-core", description: "Bounded in-memory execution", assumptions: ["A-SPEC"] }],
    properties: [{ id: "ADM-01", owner: "admission", reviewer: "independent", phase: "01", findings: ["F01"], severity: "high",
      statement: "Admission rejects over-bound input", failure: "Over-bound value is admitted", domain: "Bounded JSON", quantifiers: "Every admitted value", exclusions: ["Arbitrary host code"],
      profiles: ["pure-core"], assumptions: ["A-SPEC"], bounds: { cells: "BOUNDS.maxCells" }, versions: ["algal.organism.v1"], relation: { kind: "unestablished", description: "Production correspondence is pending" },
      sources: [{ ...source, symbols: ["limit"] }], specs: [{ ...spec, symbols: ["Bounded core"] }], licensedClaims: [], evidence: { status: "not-started", suite: "boundary", required: false, results: [] }, unresolved: ["Build and review harness"] }],
  };
  await writeFile(join(root, "verify/properties.json"), JSON.stringify(registry));
  await writeFile(join(root, "verify/toolchains.json"), JSON.stringify({ contract: "algal.verification-toolchains.v1", tools: [{ id: "bun", version: "1.3.14", status: "available", command: ["bun"], sha256: null, notes: "Result binds exact executable" }] }));
  return { root, registry };
}
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("claim ledger admission", () => {
  test("pending obligations validate without licensing a claim", async () => {
    const { root } = await fixture();
    const report = await validateClaims(root, { coverage: false });
    expect(report.statuses["not-started"]).toBe(1);
    expect(report.licensedClaims).toBe(0);
    expect(report.formalClaims).toBe(0);
  });

  test("complete family/finding inventory is required by default", async () => {
    const { root } = await fixture();
    await expect(validateClaims(root)).rejects.toThrow("missing governed property");
  });

  test("unknown fields, duplicate IDs, missing assumptions/bounds/source mappings fail", async () => {
    const { registry } = await fixture();
    expect(() => parseRegistry({ ...registry, extra: true })).toThrow("unknown key");
    expect(() => parseRegistry({ ...registry, properties: [...registry.properties, ...registry.properties] })).toThrow("duplicate property ID");
    for (const key of ["assumptions", "bounds", "sources", "specs", "failure", "versions", "relation"]) {
      const broken = structuredClone(registry) as unknown as { properties: Record<string, unknown>[] };
      delete broken.properties[0]![key];
      expect(() => parseRegistry(broken)).toThrow(`missing ${key}`);
    }
    for (const key of ["assumptions", "sources", "specs", "versions"]) {
      const broken = structuredClone(registry) as unknown as { properties: Record<string, unknown>[] };
      broken.properties[0]![key] = [];
      expect(() => parseRegistry(broken)).toThrow();
    }
  });

  test("empty bounds, unknown states/suites and required pending evidence fail", async () => {
    const { registry } = await fixture();
    const change = (patch: Record<string, unknown>) => ({ ...registry, properties: [{ ...registry.properties[0], ...patch }] });
    expect(() => parseRegistry(change({ bounds: {} }))).toThrow("empty");
    expect(() => parseRegistry(change({ evidence: { status: "green", suite: "boundary", required: false, results: [] } }))).toThrow("unknown value");
    expect(() => parseRegistry(change({ evidence: { status: "not-started", suite: "missing-harness", required: false, results: [] } }))).toThrow("unknown suite");
    expect(() => parseRegistry(change({ evidence: { status: "not-started", suite: "boundary", required: true, results: [] } }))).toThrow("pending work");
    expect(() => parseRegistry(change({ licensedClaims: ["proved correct"] }))).toThrow("pending work");
  });

  test("a claim above its suite's evidence class rejects at admission", async () => {
    const { registry } = await fixture();
    const claim = (status: string, suite: string, results: string[] = []) => ({ ...registry, properties: [{ ...registry.properties[0], relation: { kind: "tested", description: "x" }, unresolved: [], evidence: { status, suite, required: true, results } }] });
    expect(() => parseRegistry(claim("proved-implementation", "claims", ["verify/results/x.json"]))).toThrow("proved-implementation evidence requires a proved-implementation-class suite");
    expect(() => parseRegistry(claim("proved-model", "boundary", ["verify/results/x.json"]))).toThrow("proved-model evidence requires a proved-model-class suite");
    expect(() => parseRegistry(claim("tested", "lean-core", ["verify/results/x.json"]))).toThrow("tested evidence requires a tested-class suite");
    expect(() => parseRegistry(claim("tested", "kani", ["verify/results/x.json"]))).toThrow("Not started");
    expect(() => parseRegistry(claim("tested", "boundary"))).toThrow("claimed evidence needs a suite and result");
  });

  test("claimed results must be admitted content-addressed evidence for the named suite", async () => {
    const { root, registry } = await fixture();
    const writeManifest = async (name: string, suite: string, classification: string) => {
      const dir = join(root, "verify/results", name);
      await mkdir(dir, { recursive: true });
      const bytes = Buffer.from(JSON.stringify({ contract: "algal.retained-evidence.v1", suite, classification, authorityDigest: "sha256:" + "0".repeat(64), recordedArchive: "/tmp/x", limits: {}, files: [], directories: [], bytes: 0 }) + "\n");
      const digest = (await hashBytes(bytes)).slice(7);
      const realDir = join(root, "verify/results", digest);
      await mkdir(realDir, { recursive: true });
      await writeFile(join(realDir, "manifest.json"), bytes);
      return `verify/results/${digest}/manifest.json`;
    };
    const base = { ...registry.properties[0], relation: { kind: "tested", description: "x" }, unresolved: [], evidence: { status: "tested", suite: "boundary", required: true, results: [] as string[] } };
    const registryWith = (results: string[]) => ({ ...registry, properties: [{ ...base, evidence: { ...base.evidence, results } }] });
    // Admitted manifest for the right suite: validates.
    const good = await writeManifest("unused", "boundary", "admitted");
    await writeFile(join(root, "verify/properties.json"), JSON.stringify(registryWith([good])));
    expect((await validateClaims(root, { coverage: false, inventory: false })).statuses.tested).toBe(1);
    // A diagnostic manifest or wrong suite rejects.
    const diagnostic = await writeManifest("unused2", "boundary", "diagnostic");
    await writeFile(join(root, "verify/properties.json"), JSON.stringify(registryWith([diagnostic])));
    await expect(validateClaims(root, { coverage: false, inventory: false })).rejects.toThrow("diagnostic evidence");
    const wrongSuite = await writeManifest("unused3", "claims", "admitted");
    await writeFile(join(root, "verify/properties.json"), JSON.stringify(registryWith([wrongSuite])));
    await expect(validateClaims(root, { coverage: false, inventory: false })).rejects.toThrow("belongs to suite");
    // A non-content-addressed or missing path rejects.
    await writeFile(join(root, "verify/properties.json"), JSON.stringify(registryWith(["verify/results/deadbeef/manifest.json"])));
    await expect(validateClaims(root, { coverage: false, inventory: false })).rejects.toThrow();
  });

  test("assumption references must name defined assumptions", async () => {
    const { root, registry } = await fixture();
    registry.properties[0]!.assumptions = ["A-MISSING"];
    await writeFile(join(root, "verify/properties.json"), JSON.stringify(registry));
    await expect(validateClaims(root, { coverage: false })).rejects.toThrow("undefined assumption");
  });

  test("source and newly introduced production files invalidate the ledger", async () => {
    const { root } = await fixture();
    await writeFile(join(root, "src/core.ts"), "export const limit = 4;\n");
    await expect(validateClaims(root, { coverage: false })).rejects.toThrow("stale dependency/source digest");
    await writeFile(join(root, "src/core.ts"), "export const limit = 3;\n");
    await writeFile(join(root, "src/new.ts"), "export const newInput = 1;\n");
    await expect(validateClaims(root, { coverage: false })).rejects.toThrow("inventory differs");
  });

  test("examples/build/workflow additions enter the governed inventory", async () => {
    const { root } = await fixture();
    for (const directory of ["examples", ".github/workflows", "crates/a/src"]) await mkdir(join(root, directory), { recursive: true });
    for (const path of ["examples/new.algal.json", ".github/workflows/ci.yml", "crates/a/src/lib.rs", "scripts/build-expr-wasm.sh"]) await writeFile(join(root, path), "input");
    expect(await governedPaths(root)).toEqual([".github/workflows/ci.yml", "crates/a/src/lib.rs", "examples/new.algal.json", "scripts/build-expr-wasm.sh", "scripts/verify.ts", "spec/core.md", "src/core.ts"]);
  });

  test("browser workers, qualification scripts and tests invalidate evidence while generated site output does not", async () => {
    const { root } = await fixture();
    const sources = ["site/browser-inference-worker.ts", "site/grow-offline.ts", "tests/browser-grow-storage.ts", "scripts/browser-grow-qualification.mjs"];
    for (const path of [...sources, "site/dist/grow/sw.js"]) {
      await mkdir(join(root, path.substring(0, path.lastIndexOf("/"))), { recursive: true });
      await writeFile(join(root, path), "original");
    }
    for (const path of sources) {
      const before = hashJson(await inputBindings(root));
      await writeFile(join(root, path), "changed");
      expect(hashJson(await inputBindings(root))).not.toBe(before);
    }
    const before = hashJson(await inputBindings(root));
    await writeFile(join(root, "site/dist/grow/sw.js"), "generated");
    expect(hashJson(await inputBindings(root))).toBe(before);
  });

  test("generated caches are excluded while fixture data and imported Lean source remain inputs", async () => {
    const { root } = await fixture();
    const cachePaths = ["examples/__pycache__/example.pyc", "examples/.venv/bin/python", "crates/a/target/artifact", "verify/.lake/build/Model.olean", "verify/results/run.json"];
    for (const path of [...cachePaths, "examples/fixtures/data.bin", "verify/.lake/packages/library/Imported.lean"]) {
      await mkdir(join(root, path.substring(0, path.lastIndexOf("/"))), { recursive: true });
      await writeFile(join(root, path), "content");
    }
    const paths = (await inputBindings(root)).map(input => input.path);
    for (const path of cachePaths) expect(paths).not.toContain(path);
    expect(paths).toContain("examples/fixtures/data.bin");
    expect(paths).toContain("verify/.lake/packages/library/Imported.lean");
  });

  test("model, imported library, config and assumptions edits invalidate input binding", async () => {
    const { root } = await fixture();
    await mkdir(join(root, "verify/lean"));
    for (const path of ["verify/lean/Imported.lean", "verify/model.tla", "verify/model.cfg"]) await writeFile(join(root, path), "original");
    for (const path of ["verify/lean/Imported.lean", "verify/model.tla", "verify/model.cfg", "verify/assumptions.md", "scripts/verify.ts", "verify/toolchains.json"]) {
      const before = hashJson(await inputBindings(root));
      await writeFile(join(root, path), "changed");
      expect(hashJson(await inputBindings(root))).not.toBe(before);
    }
  });

  test("tool argv may repeat; metadata must be closed and bounded", () => {
    const value = { contract: "algal.verification-toolchains.v1", tools: [{ id: "tool", version: "1", status: "planned", command: ["tool", "x", "x"], sha256: null, notes: "No tool claim" }] };
    expect(parseToolchains(value).tools[0]!.command).toEqual(["tool", "x", "x"]);
    expect(() => parseToolchains({ ...value, trusted: true })).toThrow("unknown key");
  });
});

describe("bounded verification input reader", () => {
  test("rejects traversal, symlinks and oversize bytes", async () => {
    const { root } = await fixture();
    await expect(readFileBounded(root, "../outside")).rejects.toThrow("relative path");
    await symlink(join(root, "src/core.ts"), join(root, "src/link.ts"));
    await expect(hashFile(root, "src/link.ts")).rejects.toThrow("symbolic links");
    await expect(governedPaths(root)).rejects.toThrow("nonregular");
    await expect(readFileBounded(root, "src/core.ts", 2)).rejects.toThrow("size bound");
  });

  test("rejects malformed UTF-8, BOM, and unparsable JSON", async () => {
    const { root } = await fixture();
    for (const bytes of [new Uint8Array([123, 255, 125]), Buffer.from("\ufeff{}"), Buffer.from("{")]) {
      await writeFile(join(root, "verify/bad.json"), bytes);
      await expect(readJson(root, "verify/bad.json")).rejects.toThrow();
    }
    expect(hashBytes("abc")).toBe("sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
