import { afterEach, expect, test } from "bun:test";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { hashBytes, hashJson, stableJson } from "./files";
import { readRetainedEvidence, retainEvidence, type EvidenceLimits } from "./evidence-retention";

const scratch: string[] = [];
afterEach(async () => { for (const path of scratch.splice(0)) await rm(path, { recursive: true, force: true }); });
const limits: EvidenceLimits = { maxBytes: 2048, maxFileBytes: 1024, maxEntries: 8, maxDepth: 2 };
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "algal-retention-test-")); scratch.push(root);
  const sourceRoot = join(root, "source"), resultsRoot = join(root, "results");
  await mkdir(sourceRoot); await mkdir(resultsRoot); await mkdir(join(sourceRoot, "case"));
  await writeFile(join(sourceRoot, "case/raw.bin"), new Uint8Array([0, 255, 128, 13, 10]));
  await writeFile(join(sourceRoot, "result.json"), '{"ok":true}\n');
  return { resultsRoot, sourceRoot, suite: "history-slice", recordedArchive: sourceRoot, authorityDigest: hashJson({ exact: "selected outside archive" }), limits };
}
async function admit(root: string) {
  expect([...await readFile(join(root, "case/raw.bin"))]).toEqual([0, 255, 128, 13, 10]);
  expect(await Bun.file(join(root, "result.json")).text()).toBe('{"ok":true}\n');
  return { observations: 4, formalClaims: 0 };
}
test("retains exact raw bytes; re-admits copied physical root with original identity; returns small pointer", async () => {
  const f = await fixture(); let called = 0;
  const pointer = await retainEvidence({ ...f, classification: "admitted", readmit: async root => { called++; expect(root).not.toBe(f.recordedArchive); return admit(root); } });
  expect(called).toBe(1); expect(pointer.admission).toEqual({ observations: 4, formalClaims: 0 });
  expect(pointer.rawBytes).toBe(17); expect(pointer.files).toBe(2); expect(stableJson(pointer).length).toBeLessThan(1500);
  const directory = dirname(join(f.resultsRoot, pointer.manifest.path));
  const raw = await readFile(join(directory, "manifest.json"));
  expect(hashBytes(raw)).toBe(pointer.manifest.sha256); expect(raw.byteLength).toBe(pointer.manifest.bytes);
  expect(directory.endsWith(pointer.manifest.sha256.slice(7))).toBe(true);
  const manifest = JSON.parse(raw.toString()); expect(manifest.recordedArchive).toBe(f.sourceRoot); expect(manifest.classification).toBe("admitted");
  expect(await readRetainedEvidence({ ...f, directory, manifestSha256: pointer.manifest.sha256, classification: "admitted", readmit: admit })).toEqual(pointer.admission);
  expect(await retainEvidence({ ...f, classification: "admitted", readmit: admit })).toEqual(pointer);
});
test("reader failure cannot publish an admitted manifest or pointer", async () => {
  const f = await fixture(), error = new Error("target mismatch");
  await expect(retainEvidence({ ...f, classification: "admitted", readmit: async () => { throw error; } })).rejects.toBe(error);
  const roots = await readdir(f.resultsRoot); expect(roots).toHaveLength(1);
  expect(await readdir(join(f.resultsRoot, roots[0]!))).toEqual(["raw"]);
  const diagnostic = await retainEvidence({ ...f, classification: "diagnostic" });
  expect(diagnostic.classification).toBe("diagnostic"); expect(diagnostic.admission).toBeNull();
  expect(await readRetainedEvidence({ ...f, directory: dirname(join(f.resultsRoot, diagnostic.manifest.path)), manifestSha256: diagnostic.manifest.sha256, classification: "diagnostic" })).toBeNull();
});
test("diagnostic evidence cannot be promoted by only changing the requested classification", async () => {
  const f = await fixture(), p = await retainEvidence({ ...f, classification: "diagnostic" }); let called = false;
  await expect(readRetainedEvidence({ ...f, directory: dirname(join(f.resultsRoot, p.manifest.path)), manifestSha256: p.manifest.sha256, classification: "admitted", readmit: async () => { called = true; return {}; } })).rejects.toThrow("selection differs");
  expect(called).toBe(false);
});
for (const target of ["file", "directory", "root"] as const) test(`rejects ${target} symlink source`, async () => {
  const f = await fixture();
  if (target === "root") { const link = join(dirname(f.sourceRoot), "source-link"); await symlink(f.sourceRoot, link); f.sourceRoot = link; }
  else await symlink(target === "file" ? join(f.sourceRoot, "result.json") : join(f.sourceRoot, "case"), join(f.sourceRoot, "bad"));
  await expect(retainEvidence({ ...f, classification: "diagnostic" })).rejects.toThrow();
});
test("rejects unsafe names, nonnormalized selected paths and overlapping roots", async () => {
  const f = await fixture();
  await writeFile(join(f.sourceRoot, "a\\b"), "bad"); await expect(retainEvidence({ ...f, classification: "diagnostic" })).rejects.toThrow("relative evidence path");
  await rm(join(f.sourceRoot, "a\\b"));
  await expect(retainEvidence({ ...f, sourceRoot: f.sourceRoot + "/../source", classification: "diagnostic" })).rejects.toThrow("normalized");
  await expect(retainEvidence({ ...f, resultsRoot: f.sourceRoot, classification: "diagnostic" })).rejects.toThrow("disjoint");
});
for (const [name, change] of [
  ["file bytes", { maxFileBytes: 4 }], ["aggregate bytes", { maxBytes: 12, maxFileBytes: 12 }],
  ["entries", { maxEntries: 2 }], ["depth", { maxDepth: 1 }],
] as const) test(`enforces ${name} limit on physical archive`, async () => {
  const f = await fixture();
  if (name === "depth") await mkdir(join(f.sourceRoot, "case/deep"));
  await expect(retainEvidence({ ...f, limits: { ...f.limits, ...change }, classification: "diagnostic" })).rejects.toThrow();
  expect(await readdir(f.resultsRoot)).toHaveLength(0);
});
test("rejects oversized path and invalid limits before publication", async () => {
  const f = await fixture(); let path = f.sourceRoot;
  for (let i = 0; i < 3; i++) { path = join(path, "x".repeat(180)); await mkdir(path); }
  await writeFile(join(path, "raw"), "a");
  await expect(retainEvidence({ ...f, limits: { ...limits, maxEntries: 16, maxDepth: 8 }, classification: "diagnostic" })).rejects.toThrow("relative evidence path");
  await expect(retainEvidence({ ...f, limits: { ...limits, maxBytes: Number.MAX_SAFE_INTEGER }, classification: "diagnostic" })).rejects.toThrow("limit ceiling");
});
for (const change of ["bytes", "extra", "symlink", "manifest", "outer"] as const) test(`offline readmission rejects persisted ${change} tampering before callback`, async () => {
  const f = await fixture(), p = await retainEvidence({ ...f, classification: "admitted", readmit: admit });
  const directory = dirname(join(f.resultsRoot, p.manifest.path)), raw = join(f.resultsRoot, p.rawRoot); let called = false;
  if (change === "bytes") await writeFile(join(raw, "case/raw.bin"), "xxxxx");
  if (change === "extra") await writeFile(join(raw, "extra"), "extra");
  if (change === "symlink") { await rm(join(raw, "case/raw.bin")); await symlink(join(f.sourceRoot, "case/raw.bin"), join(raw, "case/raw.bin")); }
  if (change === "manifest") await writeFile(join(directory, "manifest.json"), "{}");
  if (change === "outer") await writeFile(join(directory, "extra"), "extra");
  await expect(readRetainedEvidence({ ...f, directory, manifestSha256: p.manifest.sha256, classification: "admitted", readmit: async () => { called = true; return {}; } })).rejects.toThrow();
  expect(called).toBe(false);
});
test("existing hash directory cannot overwrite changed bytes or follow a replacement directory symlink", async () => {
  const f = await fixture(), p = await retainEvidence({ ...f, classification: "diagnostic" });
  const raw = join(f.resultsRoot, p.rawRoot); await writeFile(join(raw, "case/raw.bin"), "bad");
  await expect(retainEvidence({ ...f, classification: "diagnostic" })).rejects.toThrow("bytes differ");
  expect(await Bun.file(join(raw, "case/raw.bin")).text()).toBe("bad");
  await rm(join(raw, "case"), { recursive: true }); await symlink(join(f.sourceRoot, "case"), join(raw, "case"));
  await expect(retainEvidence({ ...f, classification: "diagnostic" })).rejects.toThrow("nonregular");
});
for (const change of ["raw", "source"] as const) test(`rejects ${change} mutation inside readmission before manifest publication`, async () => {
  const f = await fixture();
  await expect(retainEvidence({ ...f, classification: "admitted", readmit: async physicalRoot => { await writeFile(join(change === "raw" ? physicalRoot : f.sourceRoot, "result.json"), "changed"); return {}; } })).rejects.toThrow("changed during admission");
  for (const name of await readdir(f.resultsRoot)) expect(await readdir(join(f.resultsRoot, name))).toEqual(["raw"]);
});
test("re-admission rejects authority drift and oversized callback summary", async () => {
  const f = await fixture(), p = await retainEvidence({ ...f, classification: "admitted", readmit: admit }); let called = false;
  await expect(readRetainedEvidence({ ...f, authorityDigest: hashJson("other authority"), directory: dirname(join(f.resultsRoot, p.manifest.path)), manifestSha256: p.manifest.sha256, classification: "admitted", readmit: async () => { called = true; return {}; } })).rejects.toThrow("selection differs");
  expect(called).toBe(false);
  await expect(retainEvidence({ ...f, classification: "admitted", readmit: async () => ({ bytes: "x".repeat(8192) }) })).rejects.toThrow("summary byte bound");
});
test("48 MiB history archive remains raw files and a small pointer, without base64 expansion", async () => {
  const f = await fixture(); await rm(f.sourceRoot, { recursive: true }); await mkdir(f.sourceRoot);
  const raw = Buffer.alloc(1_048_576, 0xA5);
  for (let i = 0; i < 48; i++) await writeFile(join(f.sourceRoot, `${i}.bin`), raw);
  const large = { ...f, limits: { maxBytes: 48 * 1_048_576, maxFileBytes: 1_048_576, maxEntries: 48, maxDepth: 1 } };
  const p = await retainEvidence({ ...large, classification: "admitted", readmit: async root => { expect((await readdir(root)).length).toBe(48); expect(await readFile(join(root, "47.bin"))).toEqual(raw); return { rawFiles: 48 }; } });
  expect(p.rawBytes).toBe(50_331_648); expect(stableJson(p).length).toBeLessThan(1500); expect(p.manifest.bytes).toBeLessThan(8192);
  let retainedBytes = p.manifest.bytes; for (const name of await readdir(join(f.resultsRoot, p.rawRoot))) retainedBytes += (await lstat(join(f.resultsRoot, p.rawRoot, name))).size;
  expect(retainedBytes).toBeLessThan(51_000_000);
}, 20_000);
