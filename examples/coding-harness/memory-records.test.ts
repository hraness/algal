import { afterEach, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applicable, getMemoryRecord, parseHarnessMemoryConfig, parseObservation, prepareMemoryStore, putMemoryRecord, recordRefPath } from "./memory-records";
import type { HarnessMemoryConfig, MemoryProcedure } from "./memory-contract";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true }))); });
const procedure: MemoryProcedure = { id: "factor", description: "Read factor", operation: { kind: "read-json-field", path: "config.json", field: "factor" }, dependencies: ["config"] };
const config: HarnessMemoryConfig = { mode: "logical", owner: "arm-l", storeDir: "/tmp/store", nativeExecutable: "/tmp/algal", expectedNativeSha256: "a".repeat(64), procedures: [procedure], scope: { sequenceId: "sequence", taskId: "first", environmentId: "environment", dependencies: { config: { path: "config.json", digest: "b".repeat(64) }, unrelated: { path: "notes.txt", digest: "c".repeat(64) } } } };
test("memory config rejects unknown keys, widening, unsafe paths, and unbounded values", () => {
  expect(parseHarnessMemoryConfig(config).maxWork).toBe(50_000);
  for (const change of [{ arbitrary: true }, { maxWork: 50_001 }, { maxOperations: 5 }, { maxVisibleBytes: 8193 }, { owner: "another/owner" }, { expectedNativeSha256: "sha256:" + "a".repeat(64) }, { mode: "hypothesis" }, { seedRefs: ["not-a-ref"] }]) expect(() => parseHarnessMemoryConfig({ ...config, ...change })).toThrow();
  for (const path of ["../secret", "/host/secret", "a/../b", "x\ncommand"]) expect(() => parseHarnessMemoryConfig({ ...config, procedures: [{ ...procedure, operation: { kind: "fingerprint-file", path } }] })).toThrow();
  expect(() => parseHarnessMemoryConfig({ ...config, procedures: [{ ...procedure, dependencies: ["missing"] }] })).toThrow();
  expect(() => parseHarnessMemoryConfig({ ...config, procedures: [{ ...procedure, operation: { kind: "eval", command: "anything" } }] })).toThrow();
});
test("only declared complete dependencies govern same-environment cross-task reuse", () => {
  const unrelated = structuredClone(config.scope); unrelated.taskId = "next"; unrelated.dependencies.unrelated!.digest = "d".repeat(64);
  expect(applicable(config.scope, unrelated, procedure)).toBe(true);
  unrelated.dependencies.config!.digest = "e".repeat(64);
  expect(applicable(config.scope, unrelated, procedure)).toBe(false);
  expect(applicable(config.scope, { ...config.scope, environmentId: "other" }, procedure)).toBe(false);
  expect(applicable(config.scope, { ...config.scope, sequenceId: "other" }, procedure)).toBe(false);
});
test("immutable canonical sources reject missing, altered, and symlink records", async () => {
  const root = await mkdtemp(join(tmpdir(), "memory-records-")); roots.push(root); await prepareMemoryStore(root);
  const ref = await putMemoryRecord(root, { value: "retained" });
  expect(await getMemoryRecord(root, ref)).toEqual({ value: "retained" });
  expect(await putMemoryRecord(root, { value: "retained" })).toBe(ref);
  await expect(getMemoryRecord(root, `sha256:${"0".repeat(64)}`)).rejects.toThrow();
  const path = recordRefPath(root, ref); await chmod(path, 0o600); await writeFile(path, '{"value":"forged"}');
  await expect(getMemoryRecord(root, ref)).rejects.toThrow("digest mismatch");
  await rm(path); await writeFile(join(root, "external.json"), '{"value":"retained"}'); await symlink(join(root, "external.json"), path);
  await expect(getMemoryRecord(root, ref)).rejects.toThrow();
});
test("hypotheses cannot impersonate source observations", () => {
  expect(() => parseObservation({ contract: "algal.hypothesis.v1", claim: ["available", "python"] })).toThrow();
  expect(() => parseObservation({ contract: "algal.harness-observation.v1", owner: "agent", ordinal: 1, scope: config.scope, procedureRef: `sha256:${"a".repeat(64)}`, rawRef: `sha256:${"b".repeat(64)}`, decoder: "model-extraction.v1" })).toThrow();
});
test("legacy observations default to task-bound reuse and unknown policies reject", () => {
  const record = { contract: "algal.harness-observation.v1", owner: "agent", ordinal: 1, scope: config.scope, procedureRef: `sha256:${"a".repeat(64)}`, rawRef: `sha256:${"b".repeat(64)}`, decoder: "algal.harness-probe.v1" };
  expect(parseObservation(record).reuse).toBe("task");
  expect(() => parseObservation({ ...record, reuse: "anywhere" })).toThrow("reuse");
});
