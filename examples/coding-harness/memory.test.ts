import { afterEach, expect, test } from "bun:test";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalize, digestCanonical, type JsonValue } from "../../index";
import type { HarnessMemoryConfig, MemoryProcedure, MemoryTerminal } from "./memory-contract";
import { getMemoryRecord, json, object, putMemoryRecord, recordRefPath, sha256 } from "./memory-records";
import { createHarnessMemory, decodeProbe, probeCommand } from "./memory";
const native = process.env.ALGAL_MEMORY_NATIVE;
const nativeTest = native ? test : test.skip;
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "memory-engine-")); roots.push(root);
  await mkdir(join(root, "sandbox"));
  await writeFile(join(root, "sandbox/config.json"), '{"factor":3}'); await writeFile(join(root, "sandbox/notes.txt"), "initial");
  const procedure: MemoryProcedure = { id: "factor", description: "Read configured factor", operation: { kind: "read-json-field", path: "config.json", field: "factor" }, dependencies: ["config"] };
  const config: HarnessMemoryConfig = { mode: "logical", owner: "arm-l", storeDir: join(root, "store"), nativeExecutable: native!, expectedNativeSha256: sha256(await readFile(native!)), procedures: [procedure], scope: { sequenceId: "sequence", taskId: "first", environmentId: "fixture", dependencies: { config: { path: "config.json", digest: sha256('{"factor":3}') }, unrelated: { path: "notes.txt", digest: sha256("initial") } } } };
  let calls = 0;
  const terminal: MemoryTerminal = async (request, signal) => {
    calls++; if (signal?.aborted) throw new Error("cancelled");
    const child = Bun.spawn(["/bin/sh", "-c", request.command], { cwd: join(root, "sandbox"), stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    return { stdout, stderr, exitCode };
  };
  return { root, config, terminal, calls: () => calls };
}
const query = (id = "factor") => ({ type: "memory.query" as const, procedure: id });
const probe = (id = "factor") => ({ type: "memory.probe" as const, procedure: id });
function resultObject(value: JsonValue): Record<string, unknown> { return object(value); }

nativeTest("real sandbox probe, source redecoding, deterministic native witness and verification", async () => {
  const f = await fixture(), memory = await createHarnessMemory(f.config);
  const observed = resultObject(await memory.execute(probe(), f.terminal)); expect(observed.status).toBe("observed");
  expect(observed.result).toEqual({ polarity: "supported", value: 3 });
  const a = resultObject(await memory.execute(query(), f.terminal)), b = resultObject(await memory.execute(query(), f.terminal));
  expect(a.status).toBe("supported"); expect(b).toEqual(a); expect(f.calls()).toBe(1);
  const r = object(a.result); expect(r.complete).toBe(true); expect(r.witnessPolicy).toBe("first-canonical-derivation");
  expect((r.rows as unknown[]).map((row) => object(row).tuple)).toEqual([["factor", "supported", 3]]);
  expect((object(memory.evidence()).queries as unknown[]).every((q) => object(q).verified === true)).toBe(true);
  const original = object(await getMemoryRecord(f.config.storeDir, a.resultRef as string));
  const nodes = r.nodes as unknown[][], references = r.references as string[], restored: Record<string, JsonValue> = {};
  function restore(index: number): string {
    const node = nodes[index]!;
    const value: JsonValue = node[0] === "fact"
      ? { kind: "fact", fact: references[node[1] as number]!, sources: (node[2] as number[]).map((i) => references[i]!) }
      : { kind: "rule", rule: references[node[1] as number]!, premises: (node[2] as number[]).map(restore) };
    const id = digestCanonical(value); restored[id] = value; return id;
  }
  const restoredRows = (r.rows as unknown[]).map((row) => { const entry = object(row); return { tuple: entry.tuple, proof: restore(entry.proof as number) }; });
  expect(original.rows).toEqual(restoredRows); expect(original.proofs).toEqual(restored);
  await memory.settle();
});
nativeTest("query/read stay pure, unknown opposition conflict and exhaustion remain distinct", async () => {
  const f = await fixture(); let m = await createHarnessMemory(f.config);
  expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("unknown"); expect(f.calls()).toBe(0);
  await m.execute({ type: "memory.read" }, f.terminal); expect(f.calls()).toBe(0);
  const missing = { ...f.config.procedures[0]!, id: "missing", operation: { kind: "resolve-tool" as const, tool: "definitely-not-a-tool-algal" }, dependencies: [] };
  m = await createHarnessMemory({ ...f.config, procedures: [missing] });
  await m.execute(probe("missing"), f.terminal); expect(resultObject(await m.execute(query("missing"), f.terminal)).status).toBe("opposed");
  m = await createHarnessMemory({ ...f.config, maxWork: 1 });
  const exhausted = resultObject(await m.execute(query(), f.terminal)); expect(exhausted.status).toBe("exhausted"); expect(exhausted.result).toBeUndefined();
  // Explicit inconsistent observations at the same declared scope remain conflict, never latest-write truth.
  const unstable = { ...f.config.procedures[0]!, dependencies: [] };
  m = await createHarnessMemory({ ...f.config, procedures: [unstable] });
  await m.execute(probe(), f.terminal); await writeFile(join(f.root, "sandbox/config.json"), '{"factor":4}'); await m.execute(probe(), f.terminal);
  expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("conflicted");
});
nativeTest("unrelated changes preserve support, relevant changes stale, explicit refresh revalidates", async () => {
  const f = await fixture(); let m = await createHarnessMemory(f.config); await m.execute(probe(), f.terminal);
  const next = structuredClone(f.config); next.scope.taskId = "second"; next.scope.dependencies.unrelated!.digest = sha256("edited");
  await writeFile(join(f.root, "sandbox/notes.txt"), "edited"); m = await createHarnessMemory(next);
  expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("supported");
  m.invalidate(); expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("stale"); expect(f.calls()).toBe(1);
  await m.execute(probe(), f.terminal); expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("supported");
  next.scope.dependencies.config!.digest = sha256('{"factor":5}'); await writeFile(join(f.root, "sandbox/config.json"), '{"factor":5}'); m = await createHarnessMemory(next);
  expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("stale");
  await m.execute(probe(), f.terminal); const answer = resultObject(await m.execute(query(), f.terminal)); expect(answer.status).toBe("supported");
  expect((object(answer.result).rows as unknown[]).map((row) => object(row).tuple)).toEqual([["factor", "supported", 5]]);
});
nativeTest("correction recomputes surviving support; historical snapshot/procedure replay persists", async () => {
  const f = await fixture(); let m = await createHarnessMemory(f.config); await m.execute(probe(), f.terminal);
  const before = resultObject(await m.execute(query(), f.terminal)); const originalSnapshot = await getMemoryRecord(f.config.storeDir, before.snapshotRef as string);
  const next = structuredClone(f.config); next.scope.taskId = "second"; m = await createHarnessMemory(next); await m.execute(probe(), f.terminal);
  const refs = object(m.evidence()).sourceRefs as string[]; expect(refs.length).toBe(2);
  m = await createHarnessMemory({ ...next, excludedRefs: [refs[0]] });
  const after = resultObject(await m.execute(query(), f.terminal)); expect(after.status).toBe("supported"); expect(after.sourceRefs).toEqual([refs[1]]);
  expect(await getMemoryRecord(f.config.storeDir, before.snapshotRef as string)).toEqual(originalSnapshot);
  const changed = { ...next, procedures: [{ ...next.procedures[0]!, operation: { kind: "read-json-field", path: "config.json", field: "missing" } }] };
  m = await createHarnessMemory(changed); expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("stale");
  await m.execute(probe(), f.terminal); expect(resultObject(await m.execute(query(), f.terminal)).status).toBe("opposed");
  const old = await createHarnessMemory(next); expect(resultObject(await old.execute(query(), f.terminal)).status).toBe("supported");
});
nativeTest("private cross-arm records rejected; explicit seed imports allowed only in sequence; none hides history", async () => {
  const f = await fixture(); const seed = await createHarnessMemory({ ...f.config, owner: "seed" }); await seed.execute(probe(), f.terminal);
  const refs = object(seed.evidence()).sourceRefs as string[];
  const target = join(f.root, "arm-store"); await mkdir(target); await cp(join(f.config.storeDir, "records"), join(target, "records"), { recursive: true });
  const allowed = { ...f.config, storeDir: target, seedRefs: refs };
  const logical = await createHarnessMemory(allowed); expect(resultObject(await logical.execute(query(), f.terminal)).status).toBe("supported");
  const other = structuredClone(allowed); other.scope.sequenceId = "foreign";
  await expect(createHarnessMemory(other)).rejects.toThrow("out-of-sequence");
  const none = await createHarnessMemory({ ...allowed, mode: "none" }); expect(resultObject(await none.execute(query(), f.terminal)).status).toBe("unknown");
  expect((resultObject(await none.execute({ type: "memory.read" }, f.terminal)).observations as unknown[])).toEqual([]);
  const ownerIndex = `index-${sha256(canonicalize(json([f.config.owner, f.config.scope.sequenceId])))}.json`;
  await writeFile(join(target, ownerIndex), canonicalize(json({ contract: "algal.harness-memory-index.v1", owner: f.config.owner, sequenceId: f.config.scope.sequenceId, taskId: f.config.scope.taskId, sourceRefs: refs, invalidatedRefs: [] })));
  await expect(createHarnessMemory({ ...allowed, seedRefs: [] })).rejects.toThrow("Cross-owner");
});
nativeTest("restart has no effects, source tampering and hypotheses cannot be admitted", async () => {
  const f = await fixture(); const memory = await createHarnessMemory(f.config); await memory.execute(probe(), f.terminal);
  const refs = object(memory.evidence()).sourceRefs as string[]; await createHarnessMemory(f.config); expect(f.calls()).toBe(1);
  const source = object(await getMemoryRecord(f.config.storeDir, refs[0]!)); const rawRef = source.rawRef as string;
  const path = recordRefPath(f.config.storeDir, rawRef); await chmod(path, 0o600); await writeFile(path, "{}");
  await expect(createHarnessMemory(f.config)).rejects.toThrow("digest mismatch");
  const hypothesis = await putMemoryRecord(f.config.storeDir, { contract: "algal.hypothesis.v1", claim: "supported" });
  await expect(createHarnessMemory({ ...f.config, owner: "different", seedRefs: [hypothesis] })).rejects.toThrow();
});
nativeTest("bounded observations, explicit visible overflow, operation cap, and cancelled query", async () => {
  const f = await fixture(); const memory = await createHarnessMemory({ ...f.config, maxVisibleBytes: 256 });
  expect(resultObject(await memory.execute({ type: "memory.read" }, f.terminal)).status).toBe("exhausted");
  const controller = new AbortController(); controller.abort(); await expect(memory.execute(query(), f.terminal, controller.signal)).rejects.toThrow("cancelled"); expect(f.calls()).toBe(0);
  const capped = await createHarnessMemory({ ...f.config, maxOperations: 1 }); await capped.execute(query(), f.terminal);
  expect(resultObject(await capped.execute(probe(), f.terminal)).status).toBe("exhausted"); expect(f.calls()).toBe(0);
  const raw = { contract: "algal.harness-probe-raw.v1", command: probeCommand(f.config.procedures[0]!, f.config.scope), result: { exitCode: 0, stdout: "not a frame", stderr: "" } };
  expect(() => decodeProbe(f.config.procedures[0]!, f.config.scope, raw)).toThrow("Malformed");
});

nativeTest("ordinary terminal invalidation cannot be cleared for old tool facts by an unrelated probe", async () => {
  const f = await fixture();
  const tool: MemoryProcedure = { id: "tool", description: "Resolve sh", operation: { kind: "resolve-tool", tool: "sh" }, dependencies: [] };
  let memory = await createHarnessMemory({ ...f.config, procedures: [...f.config.procedures, tool] });
  await memory.execute(probe("tool"), f.terminal);
  memory.invalidate();
  await memory.execute(probe(), f.terminal);
  expect(resultObject(await memory.execute(query("tool"), f.terminal)).status).toBe("stale");
  // A new episode starts from a host-declared original snapshot; a fresh tool probe is current.
  memory = await createHarnessMemory({ ...f.config, procedures: [...f.config.procedures, tool] });
  memory.invalidate(); await memory.execute(probe("tool"), f.terminal);
  expect(resultObject(await memory.execute(query("tool"), f.terminal)).status).toBe("supported");
});
nativeTest("native prerequisite join rejects mismatched dependency despite a forged current marker", async () => {
  const f = await fixture(); const memory = await createHarnessMemory(f.config); await memory.execute(probe(), f.terminal);
  const answer = resultObject(await memory.execute(query(), f.terminal));
  const snapshot = object(await getMemoryRecord(f.config.storeDir, answer.snapshotRef as string));
  const facts = snapshot.facts as Record<string, unknown>[];
  const required = facts.find((fact) => fact.relation === "requires")!;
  (required.tuple as unknown[])[3] = "0".repeat(64);
  const alteredRef = await putMemoryRecord(f.config.storeDir, json(snapshot));
  const child = Bun.spawn([native!, "memory", "query", recordRefPath(f.config.storeDir, alteredRef), recordRefPath(f.config.storeDir, answer.programRef as string)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect({ code, stderr }).toEqual({ code: 0, stderr: "" }); expect(object(JSON.parse(stdout)).rows).toEqual([]);
  // Exact historical native snapshot/program/result still verify after this replacement.
  const verify = Bun.spawn([native!, "memory", "verify", recordRefPath(f.config.storeDir, answer.snapshotRef as string), recordRefPath(f.config.storeDir, answer.programRef as string), recordRefPath(f.config.storeDir, answer.resultRef as string)], { stdout: "pipe", stderr: "pipe" });
  const [verification, verifyCode] = await Promise.all([new Response(verify.stdout).text(), verify.exited]); expect(verifyCode).toBe(0); expect(JSON.parse(verification)).toEqual({ ok: true });
});

nativeTest("repeated exhausted operations never return null or unknown and never exceed the byte cap", async () => {
  const f = await fixture(); const memory = await createHarnessMemory({ ...f.config, maxOperations: 1, maxVisibleBytes: 256 });
  for (let index = 0; index < 20; index++) {
    try { expect(resultObject(await memory.execute(query(), f.terminal)).status).toBe("exhausted"); }
    catch (error) { expect(String(error)).toContain("visible-byte allowance exhausted"); }
  }
  expect(object(memory.evidence()).visibleBytes as number).toBeLessThanOrEqual(256); expect(f.calls()).toBe(0);
});

nativeTest("same-task restart retains terminal invalidations and fresh task scope may re-admit history", async () => {
  const f = await fixture(); let memory = await createHarnessMemory(f.config); await memory.execute(probe(), f.terminal);
  memory.invalidate(); await memory.settle();
  memory = await createHarnessMemory(f.config); expect(resultObject(await memory.execute(query(), f.terminal)).status).toBe("stale"); expect(f.calls()).toBe(1);
  const next = structuredClone(f.config); next.scope.taskId = "fresh-task";
  memory = await createHarnessMemory(next); expect(resultObject(await memory.execute(query(), f.terminal)).status).toBe("supported"); expect(f.calls()).toBe(1);
});

nativeTest("five prerequisite dependencies finish within eight rounds; six are rejected at admission", async () => {
  const f = await fixture(); const config = structuredClone(f.config); config.scope.dependencies = {};
  config.procedures[0]!.dependencies = [];
  for (let i = 1; i <= 5; i++) { const name = `d${i}`; config.scope.dependencies[name] = { path: "config.json", digest: sha256('{"factor":3}') }; config.procedures[0]!.dependencies.push(name); }
  const memory = await createHarnessMemory(config); await memory.execute(probe(), f.terminal);
  const answer = resultObject(await memory.execute(query(), f.terminal)); expect(answer.status).toBe("supported"); expect(object(answer.result).rounds).toBe(8);
  config.scope.dependencies.d6 = { path: "config.json", digest: sha256('{"factor":3}') }; config.procedures[0]!.dependencies.push("d6");
  await expect(createHarnessMemory(config)).rejects.toThrow("five procedure dependencies");
});
nativeTest("episodic retrieval retains three raw observations without repeating interpreter source", async () => {
  const f = await fixture(); let memory = await createHarnessMemory(f.config);
  await memory.execute(probe(), f.terminal); await memory.execute(probe(), f.terminal); await memory.execute(probe(), f.terminal);
  memory = await createHarnessMemory({ ...f.config, mode: "episodic" });
  const output = resultObject(await memory.execute({ type: "memory.read" }, f.terminal)); expect(output.status).toBe("read");
  const observations = output.observations as unknown[]; expect(observations.length).toBe(3);
  expect(observations.map((value) => object(value).command)).toEqual(Array(3).fill(f.config.procedures[0]!.operation));
  expect(observations.every((value) => typeof object(value).rawRef === "string")).toBe(true);
  expect(object(memory.evidence()).visibleBytes as number).toBeLessThan(8192);
});
nativeTest("failed probe retains bounded raw evidence without promoting an observation", async () => {
  const f = await fixture(), memory = await createHarnessMemory(f.config);
  const failed: MemoryTerminal = async () => ({ exitCode: 1, stdout: "", stderr: "missing dependency" });
  expect(resultObject(await memory.execute(probe(), failed)).status).toBe("error");
  const evidence = object(memory.evidence()); expect(evidence.sourceRefs).toEqual([]);
  const attempts = evidence.probes as unknown[]; const ref = object(attempts[0]).rawRef as string;
  expect(object(await getMemoryRecord(f.config.storeDir, ref)).result).toEqual({ exitCode: 1, stdout: "", stderr: "missing dependency" });
});
