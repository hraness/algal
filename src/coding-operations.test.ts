import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestCanonical, digestText } from "./digest";
import { AlgalError } from "./errors";
import {
  CODING_OPERATION_PROTOCOL,
  codingOperationCommandTransport,
  parseCodingOperationAdapter,
  parseCodingOperationBinding,
  parseCodingOperationOutcome,
  parseCodingOperationRequest,
  type CodingOperationAdapter,
  type CodingOperationBinding,
  type CodingOperationOutcome,
} from "./coding-operations";
import type { JsonValue } from "./values";

const dirs: string[] = [];
afterEach(async () => {
  for (const directory of dirs.splice(0)) await rm(directory, { recursive: true, force: true });
});
const payload = { prompt: "literal $(not-a-shell) `not-a-command`\nrepair", workspace: "/fixture/workspace" };
const binding: CodingOperationBinding = {
  operationId: "op_fixture-001", authorityId: "ledger_fixture-001", requestDigest: digestCanonical(payload),
};
const acceptanceRef = digestText("accepted operation record");
const accepted = (revision = 1): CodingOperationOutcome => ({
  contract: CODING_OPERATION_PROTOCOL, ...binding, revision, state: "accepted", acceptanceRef,
});
const terminal = (outcome: "completed" | "failed" | "cancelled" = "completed", text = "done 😀"): CodingOperationOutcome => ({
  contract: CODING_OPERATION_PROTOCOL, ...binding, revision: 2, state: "terminal", acceptanceRef,
  outcome, settlement: "all-admitted-work-settled", result: { text, digest: digestText(text), length: Buffer.byteLength(text) },
});
const unknown = (reason: "missing" | "expired" | "unavailable" | "unresolved", revision = 0): CodingOperationOutcome => ({
  contract: CODING_OPERATION_PROTOCOL, ...binding, revision, state: "unknown", reason,
});
const adapter = (argvPrefix: string[] = []): CodingOperationAdapter => ({
  protocol: CODING_OPERATION_PROTOCOL, authorityId: binding.authorityId, executable: process.execPath, argvPrefix,
});
const request = () => ({ binding, signal: new AbortController().signal, timeoutMs: 1000, maxOutputBytes: 8192 });
async function fixture(source: string): Promise<{ path: string; directory: string; record: string }> {
  const directory = await mkdtemp(join(tmpdir(), "algal-operation-protocol-"));
  dirs.push(directory);
  const path = join(directory, "adapter.ts");
  const record = join(directory, "request.json");
  await writeFile(path, source);
  return { path, directory, record };
}

// This host protocol does not prove an adapter's truthfulness. These tests cover
// strict evidence admission and the exact executable/stdio boundary only.
describe("coding operation evidence", () => {
  test("parses each closed state and all settled terminal outcomes", () => {
    expect(parseCodingOperationOutcome(accepted(), binding)).toEqual(accepted());
    for (const reason of ["missing", "expired", "unavailable", "unresolved"] as const)
      expect(parseCodingOperationOutcome(unknown(reason), binding).state).toBe("unknown");
    for (const result of ["completed", "failed", "cancelled"] as const)
      expect(parseCodingOperationOutcome(terminal(result), binding)).toEqual(terminal(result));
    // A lost submit acknowledgement need not leave a locally seen acceptance.
    expect(parseCodingOperationOutcome(terminal(), binding).state).toBe("terminal");
  });

  test("binds the exact operation, authority, request and result bytes", () => {
    for (const change of [
      { operationId: "other" }, { authorityId: "other" }, { requestDigest: digestText("other") },
    ]) expect(() => parseCodingOperationOutcome({ ...terminal(), ...change }, binding)).toThrow("binding mismatch");
    const good = terminal();
    if (good.state !== "terminal") throw new Error("fixture");
    for (const change of [{ text: "other" }, { length: good.result.text.length }, { digest: digestText("other") }])
      expect(() => parseCodingOperationOutcome({ ...good, result: { ...good.result, ...change } }, binding)).toThrow("integrity mismatch");
  });

  test("forbids incomplete settlement and state-specific extra fields", () => {
    for (const value of [
      { ...accepted(), result: "forbidden" }, { ...unknown("missing"), acceptanceRef },
      { ...terminal(), joined: true }, { ...terminal(), settlement: "immediate-child-joined" },
      { ...terminal(), settlement: undefined }, { ...terminal(), outcome: "running" },
      { ...unknown("missing"), reason: "never-started" },
      { ...accepted(), acceptanceRef: "provider-session-not-a-proof" },
      { ...terminal(), result: { text: "", digest: digestText(""), length: 0, extra: true } },
    ]) expect(() => parseCodingOperationOutcome(value, binding)).toThrow();
  });

  test("rejects stale, same-revision conflicting and rebound acceptance evidence", () => {
    expect(parseCodingOperationOutcome(accepted(), binding, { previous: accepted() })).toEqual(accepted());
    expect(parseCodingOperationOutcome(terminal(), binding, { previous: accepted() })).toEqual(terminal());
    expect(() => parseCodingOperationOutcome(accepted(), binding, { previous: accepted(2) })).toThrow("stale");
    expect(() => parseCodingOperationOutcome({ ...terminal(), revision: 1 }, binding, { previous: accepted() })).toThrow("conflicting");
    expect(() => parseCodingOperationOutcome({ ...terminal(), acceptanceRef: digestText("other") }, binding, { previous: accepted() })).toThrow("acceptance binding");
    const latestUnknown = unknown("unavailable", 2);
    expect(parseCodingOperationOutcome(latestUnknown, binding, { previous: accepted() })).toEqual(latestUnknown);
    // Hosts must retain the accepted witness, not let an unknown erase it.
    expect(() => parseCodingOperationOutcome({ ...terminal(), revision: 3, acceptanceRef: digestText("other") }, binding, { previous: accepted() })).toThrow("acceptance binding");
  });

  test("terminal proofs admit only byte-identical repeats, including revision", () => {
    const done = terminal();
    expect(parseCodingOperationOutcome(done, binding, { previous: done })).toEqual(done);
    for (const changed of [
      { ...done, revision: 3 }, { ...terminal("failed"), revision: 3 },
      { ...terminal("completed", "changed"), revision: 3 }, unknown("expired", 3), accepted(3),
    ]) expect(() => parseCodingOperationOutcome(changed, binding, { previous: done })).toThrow("conflicting");
  });

  test("bounds identifiers, revisions, result bytes and the entire result envelope", () => {
    for (const revision of [-1, 0, 0.5, NaN, Infinity, 2_147_483_648])
      expect(() => parseCodingOperationOutcome({ ...accepted(), revision }, binding)).toThrow();
    for (const operationId of ["", "x".repeat(161), "bad\nvalue", "with space", "é"])
      expect(() => parseCodingOperationBinding({ ...binding, operationId })).toThrow();
    for (const value of [{ ...binding, extra: true }, { ...binding, requestDigest: "sha256:no" }])
      expect(() => parseCodingOperationBinding(value)).toThrow();
    expect(() => parseCodingOperationOutcome(terminal("completed", "x".repeat(1024)), binding, { maxOutputBytes: 1024 })).toThrow("byte bound");
    expect(() => parseCodingOperationOutcome(terminal("completed", "😀".repeat(400)), binding, { maxOutputBytes: 1024 })).toThrow();
    expect(() => parseCodingOperationOutcome(accepted(), binding, { maxOutputBytes: 1_048_577 })).toThrow();
  });
});

describe("coding operation requests", () => {
  test("submit binds canonical payload and observe forbids the task payload", () => {
    const submit = { contract: "algal.coding-operation-request.v1", action: "submit", binding, payload } as const;
    const observe = { contract: "algal.coding-operation-request.v1", action: "observe", binding } as const;
    expect(parseCodingOperationRequest(submit)).toEqual(submit);
    expect(parseCodingOperationRequest(observe)).toEqual(observe);
    expect(() => parseCodingOperationRequest({ ...submit, payload: { changed: true } })).toThrow("digest mismatch");
    for (const bad of [{ ...observe, payload }, { ...observe, retry: true }, { ...observe, action: "recover" }, { ...submit, payload: undefined }])
      expect(() => parseCodingOperationRequest(bad)).toThrow();
  });

  test("SDK payload traversal is bounded before canonicalization", () => {
    const deep: Record<string, unknown> = {};
    deep.self = deep;
    const values: unknown[] = [deep, new Date(), Infinity, { undefined }, new Array(257).fill(null), Object.fromEntries(new Array(65).fill(0).map((_, i) => [String(i), 0])), { ["x".repeat(257)]: true }, "x".repeat(1_048_577)];
    for (const value of values)
      expect(() => parseCodingOperationRequest({ contract: "algal.coding-operation-request.v1", action: "submit", binding, payload: value })).toThrow();
    let depth: JsonValue = null;
    for (let n = 0; n < 18; n++) depth = { depth };
    expect(() => parseCodingOperationRequest({ contract: "algal.coding-operation-request.v1", action: "submit", binding, payload: depth })).toThrow("structural bounds");
  });

  test("adapter argv is static, absolute, bounded and closed", () => {
    expect(parseCodingOperationAdapter(adapter(["literal $(not-shell)", ""]))).toEqual(adapter(["literal $(not-shell)", ""]));
    for (const bad of [
      { ...adapter(), executable: "bun" }, { ...adapter(), executable: "/tmp/a\n" },
      { ...adapter(), extra: true }, { ...adapter(), argvPrefix: new Array(32).fill("") },
      { ...adapter(), argvPrefix: ["x".repeat(4097)] }, { ...adapter(), argvPrefix: ["\0"] },
      { ...adapter(), argvPrefix: ["😀".repeat(2000)] }, { ...adapter(), argvPrefix: new Array(5).fill("x".repeat(4096)) },
      { ...adapter(), protocol: "xcb-session-search" },
    ]) expect(() => parseCodingOperationAdapter(bad)).toThrow();
  });
});

describe("coding operation fixed command transport", () => {
  test("preserves literal argv, submits once and observes without payload", async () => {
    const f = await fixture(`const input=JSON.parse(await Bun.stdin.text());
      await Bun.write(new URL('./request.json',import.meta.url),JSON.stringify({input,argv:process.argv.slice(2)}));
      console.log(JSON.stringify({contract:'algal.coding-operation.v1',...input.binding,state:'accepted',revision:1,acceptanceRef:${JSON.stringify(acceptanceRef)}}));`);
    const config = adapter([f.path, "literal $(never) `never`", ""]);
    const transport = codingOperationCommandTransport(config);
    config.argvPrefix[0] = "/missing-after-config-mutation";
    const submitted = await transport.submit({ ...request(), payload });
    expect(submitted).toEqual(accepted());
    const first = JSON.parse(await readFile(f.record, "utf8"));
    expect(first.argv).toEqual(["literal $(never) `never`", "", "submit"]);
    expect(first.input).toEqual({ contract: "algal.coding-operation-request.v1", action: "submit", binding, payload });
    await transport.observe(request());
    const second = JSON.parse(await readFile(f.record, "utf8"));
    expect(second.argv.at(-1)).toBe("observe");
    expect(second.input).toEqual({ contract: "algal.coding-operation-request.v1", action: "observe", binding });
  });

  test("pre-aborted, mismatched authority and payload requests never execute", async () => {
    const f = await fixture(`await Bun.write(new URL('./request.json',import.meta.url),'dispatched');`);
    const transport = codingOperationCommandTransport(adapter([f.path]));
    const aborted = AbortSignal.abort();
    await expect(transport.submit({ ...request(), payload, signal: aborted })).rejects.toThrow("before dispatch");
    await expect(transport.observe({ ...request(), signal: aborted })).rejects.toThrow("before dispatch");
    await expect(transport.observe({ ...request(), binding: { ...binding, authorityId: "other" } })).rejects.toThrow("authority");
    await expect(transport.submit({ ...request(), payload: { changed: true } })).rejects.toThrow("digest mismatch");
    await expect(transport.observe({ ...request(), timeoutMs: 600_001 })).rejects.toThrow();
    expect(await Bun.file(f.record).exists()).toBe(false);
  });

  test("post-dispatch timeout, malformed, oversized and failed responses retain uncertainty", async () => {
    for (const source of [
      "await Bun.stdin.text();setInterval(()=>{},1000)",
      "await Bun.stdin.text();console.log('not json')",
      "await Bun.stdin.text();console.log('x'.repeat(20000))",
      "await Bun.stdin.text();process.exit(7)",
      `await Bun.stdin.text();console.log(${JSON.stringify(JSON.stringify({ ...terminal(), settlement: "unresolved" }))})`,
    ]) {
      const f = await fixture(source);
      const transport = codingOperationCommandTransport(adapter([f.path]));
      const error = await transport.submit({ ...request(), payload, timeoutMs: 100 }).catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(AlgalError);
      expect((error as AlgalError).uncertain).toBe(true);
      expect((error as AlgalError).message).toContain("settlement unknown");
    }
  });
});
