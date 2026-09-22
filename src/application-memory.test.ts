import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { accessSync, constants } from "node:fs";
import { digestCanonical } from "./digest";
import { parseMemoryFrontier, parseMemoryProcedure, parseMemoryResourceVersion, parseMemorySchema } from "./application-memory";
import { NativeMemoryQueryEngine } from "./application-native-memory";

const ref = (value: unknown) => digestCanonical(value as never);
const pinnedExecutable = "/Users/benguo/Documents/Codex/2026-09-20/i-w/work/native-memory-target/debug/algal";
const configuredExecutable = process.env.ALGAL_MEMORY_NATIVE;
const nativeExecutable = configuredExecutable ?? pinnedExecutable;
const nativeExecutableUsable = (() => {
  try { accessSync(nativeExecutable, constants.R_OK | constants.X_OK); return true; } catch { return false; }
})();
const nativeTest = nativeExecutableUsable ? test : test.skip;

describe("application memory records", () => {
  test("keeps resource versions and frontiers closed", () => {
    expect(parseMemoryResourceVersion({kind: "store", reference: ref("memory-fixture")})).toEqual({kind: "store", reference: ref("memory-fixture")});
    expect(parseMemoryResourceVersion({kind: "file", sha256: "a".repeat(64)})).toEqual({kind: "file", sha256: "a".repeat(64)});
    expect(() => parseMemoryResourceVersion({kind: "file", sha256: "a".repeat(64), reference: ref("wrong-kind")})).toThrow();
    expect(() => parseMemorySchema({contract: "algal.application-memory-schema.v1", relations: [{name: "available", arity: 2, extra: true}]})).toThrow();
    expect(() => parseMemoryFrontier({contract: "algal.application-memory-frontier.v1", application: "workspace", previous: ref("old"), sequence: 0, mutation: null, status: "settled"})).toThrow();
  });
  test("procedure dependencies are explicit data", () => {
    const procedure = parseMemoryProcedure({contract: "algal.application-memory-procedure.v1", id: "discover", schema: ref("schema"), manifest: ref("manifest"), decoder: ref("decoder"), dependencies: ["tool"], prerequisite: null});
    expect(procedure.dependencies).toEqual(["tool"]);
  });
  nativeTest("native adapter preserves the query contract and verifies its witness", async () => {
    const expectedSha256 = configuredExecutable
      ? createHash("sha256").update(Buffer.from(await Bun.file(nativeExecutable).arrayBuffer())).digest("hex")
      : "d24044d99ab184edd86ec4970f350ec124b5d2d76b82f42eb07fd69e65310797";
    const engine = new NativeMemoryQueryEngine({
      executable: nativeExecutable,
      expectedSha256,
    });
    const source = "sha256:" + "a".repeat(64);
    const snapshot = {contract: "algal.memory.v1", facts: [{relation: "available", tuple: ["tool", "supported"], sources: [source]}]};
    const program = {contract: "algal.query.v1", rules: [], query: {relation: "available", terms: [{var: "x"}, {var: "polarity"}]}, limits: {maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144}};
    const answer = await engine.query(snapshot, program);
    expect(answer.kind).toBe("complete");
    if (answer.kind === "complete") expect(await engine.verify(snapshot, program, answer.result)).toBe(true);
    await engine.settle();
  });
});
