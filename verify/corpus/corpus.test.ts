import { expect, test } from "bun:test";
import { denote, admitExpr, project } from "./oracle";
import { catalog, grammar, Random, SEEDS } from "./generate";
import { expected, inputBytes, parseCase, hex, LIMITS, type Case } from "./schema";
import { Mismatch, reductions, shrink } from "./shrink";
import { admitCommand, admitInventory, admitWorker, CommandRejected, compare, CaptureBudget, utf8Size, jsonSize, encodeRecord, primaryFailure, retainFailure, failureRecord, requireAbsolutePath, run } from "./run";
import { hashBytes, stableJson } from "../lib/files";
import type { CommandResult } from "../lib/runner";
const fixture = (program: unknown): Case => parseCase({ contract: "algal.corpus-case.v1", id: "unit", domain: "grammar", program });
test("independent exact arithmetic and scalar-width denotation", () => {
  expect(denote(["sub", ["add", 9, 8], ["neg", 2]])).toEqual({ ok: true, value: 19 });
  expect(denote(["slen", "a😀é\0"])).toEqual({ ok: true, value: 6 });
  expect(denote(["lt", -3, 4])).toEqual({ ok: true, value: true });
});
test("short circuit avoids a live fault but selected fault remains visible", () => {
  for (const program of [["and", false, ["lt", ["div", 1, 0], 0]], ["or", true, ["lt", ["div", 1, 0], 0]], ["if", false, ["div", 1, 0], 7]])
    expect(denote(program).ok).toBe(true);
  expect(denote(["if", true, ["div", 1, 0], 7])).toEqual({ ok: false, code: "EXPR_DIV_ZERO" });
});
test("oracle rejects unsupported arithmetic and untaken foreign branches", () => {
  for (const p of [["div", 1, 2], ["mul", 2, 2], ["if", true, 1, ["not-an-op", 0]], ["and", true, 1], ["slen", "\ud800"], 17])
    expect(() => admitExpr(p)).toThrow();
});
test("fixed generator is nonvacuous, deterministic and domain admitted", () => {
  const a = catalog(); admitInventory(a);
  expect(a).toHaveLength(115); expect(a.filter(c => c.domain === "grammar")).toHaveLength(96);
  expect(stableJson(a)).toBe(stableJson(catalog()));
  expect(new Set(SEEDS.map(seed => hashBytes(stableJson(grammar(seed))))).size).toBe(4);
  expect(a.filter(c => expected(c).ok).length).toBeGreaterThan(80);
  expect(a.filter(c => !expected(c).ok).length).toBeGreaterThan(10);
  expect(() => grammar(1, 0)).toThrow(); expect(() => new Random(0)).toThrow();
});
test("case admission rejects zero/duplicate inventories and altered raw expectations", () => {
  expect(() => admitInventory([])).toThrow(); expect(() => admitInventory([fixture(1), fixture(2)])).toThrow();
  const raw = catalog().find(c => c.id === "raw-exponent-one")!;
  expect(() => parseCase({ ...raw, hex: hex(new TextEncoder().encode("{}")) })).toThrow();
  expect(() => parseCase({ ...raw, unrelated: true })).toThrow();
  expect(() => parseCase({ ...raw, expectation: "invalid-utf8", catalog: "" })).toThrow();
});
test("projection refuses malformed results and parse-after-evaluation", () => {
  for (const raw of [{ ok: true, value: 1 }, { ok: true, value: 1, fuel: 0, extra: true }, { ok: false, err: { code: "EXPR_PARSE" }, fuel: 1 }])
    expect(() => project(raw)).toThrow();
  expect(() => compare(fixture(1), '{"ok":true,"value":2,"fuel":1}', "subject")).toThrow(Mismatch);
});
test("command admission retains exact custody and failure categories", () => {
  const argv = ["/fixed/tool", "eval"], good: CommandResult = { command: argv, exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout: "", stderr: "" };
  admitCommand(good, argv);
  for (const [field, value, category] of [["timedOut", true, "timeout"], ["outputExceeded", true, "output-exhaustion"], ["cleanupObserved", false, "custody-failure"], ["signal", "SIGSEGV", "signal"], ["exitCode", 1, "command-nonzero"]] as const) {
    try { admitCommand({ ...good, [field]: value }, argv); throw new Error("incorrectly accepted"); }
    catch (e) { expect(e).toBeInstanceOf(CommandRejected); expect((e as CommandRejected).category).toBe(category); }
  }
  expect(() => admitCommand({ ...good, command: ["/other"] }, argv)).toThrow();
});
test("selected and recorded argv are closed own data with character and UTF8 limits", () => {
  const selected = ["/fixed/tool"], result = (command: string[]): CommandResult => ({ command, exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout: "", stderr: "" });
  for (const valid of [["a".repeat(4096)], ["é".repeat(2048)], Array.from({ length: 64 }, () => "argument")]) expect(() => admitCommand(result(valid), valid)).not.toThrow();
  const sparse: string[] = []; sparse.length = 1;
  const extra = ["argument"]; Object.assign(extra, { extra: true });
  const hidden = ["argument"]; Object.defineProperty(hidden, "extra", { value: true });
  const symbol = ["argument"]; Object.defineProperty(symbol, Symbol("extra"), { value: true });
  const nonenumerable = ["argument"]; Object.defineProperty(nonenumerable, "0", { value: "argument", enumerable: false });
  const inherited = ["argument"]; Object.setPrototypeOf(inherited, {});
  let getterReads = 0;
  const accessor: string[] = []; Object.defineProperty(accessor, "0", { enumerable: true, get() { getterReads++; return "argument"; } });
  for (const invalid of [[], [""], ["a\0b"], ["a".repeat(4097)], ["é".repeat(2048) + "a"], Array.from({ length: 65 }, () => "argument"), sparse, extra, hidden, symbol, nonenumerable, inherited, accessor, [7]] as string[][]) {
    expect(() => admitCommand(result(invalid), invalid)).toThrow("expected");
    expect(() => admitCommand(result(invalid), selected)).toThrow("recorded");
  }
  expect(getterReads).toBe(0);
});
test("selected authority paths enforce UTF8 bounds before filesystem access", () => {
  for (const valid of ["/" + "a".repeat(4095), "/" + "é".repeat(2047) + "a"]) expect(() => requireAbsolutePath(valid)).not.toThrow();
  for (const invalid of ["relative", "/" + "a".repeat(4096), "/" + "é".repeat(2048), "/a\0b", "/a\nb"]) expect(() => requireAbsolutePath(invalid)).toThrow("authorized absolute path");
});
test("producer refuses overlong selected paths before filesystem or target work", async () => {
  const tooLong = "/" + "é".repeat(2048);
  await expect(run({ profile: "native", native: tooLong })).rejects.toThrow("authorized absolute path");
  await expect(run({ profile: "full", native: "/authorized/not-executed", rebuilt: tooLong })).rejects.toThrow("authorized absolute path");
  await expect(run({ profile: "local", replay: tooLong })).rejects.toThrow("authorized absolute path");
  await expect(run({ profile: "local" }, tooLong)).rejects.toThrow("authorized absolute path");
});
test("aggregate capture narrows the next command and archive refusal precedes writes", () => {
  const output = new CaptureBudget(); output.capture(LIMITS.aggregateOutputBytes - 1);
  expect(output.nextCommandLimit()).toBe(1); output.capture(1);
  expect(() => output.nextCommandLimit()).toThrow(); expect(() => output.capture(1)).toThrow();
  const archive = new CaptureBudget(); let writes = 0;
  const write = (size: number) => { archive.reserveRecord(size); writes++; };
  for (let n = 0; n < 3; n++) write(LIMITS.recordBytes);
  write(LIMITS.recordBytes - LIMITS.failureBytes);
  expect(() => write(1)).toThrow(); expect(writes).toBe(4);
  expect(archive.archiveBytes + LIMITS.failureBytes).toBe(LIMITS.archiveBytes);
  expect(() => archive.nextCommandLimit()).toThrow();
});
test("worker identity and semantic controls reject false-success output", () => {
  const c = fixture(1), value = { ok: true, value: 1, fuel: 1 }, digest = hashBytes("artifact");
  const good = { contract: "algal.corpus-worker.v1", id: c.id, inputSha256: hashBytes(inputBytes(c)), wasmSha256: digest, raw: JSON.stringify(value), bun: value };
  admitWorker(c, good, digest, true);
  for (const changed of [{ ...good, inputSha256: hashBytes("other") }, { ...good, wasmSha256: hashBytes("other") }, { ...good, raw: '{"ok":true,"value":2,"fuel":1}' }, { ...good, bun: { ...value, fuel: 2 } }, { ...good, extra: 1 }])
    expect(() => admitWorker(c, changed, digest, true)).toThrow();
  try { admitWorker(c, { ...good, raw: '{"ok":true,"value":2,"fuel":1}' }, digest, true, "rebuilt-wasm"); throw new Error("wrong value accepted"); }
  catch (e) { expect(e).toBeInstanceOf(Mismatch); expect((e as Mismatch).target).toBe("rebuilt-wasm"); }
});
test("grammar shrink retains same semantic failure and reconfirms it", async () => {
  const original = fixture(["if", false, ["div", 1, 0], ["add", 4, ["neg", 1]]]);
  let calls = 0;
  // Actual mutation of this pure subset: visit all children before selecting a control branch.
  // Division-by-zero is the subset's only runtime fault, so eager traversal exposes it anywhere.
  function eagerFault(x: unknown): boolean { return Array.isArray(x) && (x[0] === "div" || x.slice(1).some(eagerFault)); }
  const reproduce = async (c: Case) => {
    calls++; if (c.domain !== "grammar") throw new Error("grammar control");
    const normal = expected(c), mutated = eagerFault(c.program) ? { ok: false, err: { code: "EXPR_DIV_ZERO" }, fuel: 1 }
      : normal.ok ? { ok: true, value: normal.value, fuel: 1 } : { ok: false, err: { code: normal.code }, fuel: 1 };
    compare(c, JSON.stringify(mutated), "eager-branches");
  };
  const result = await shrink(original, reproduce);
  expect(result.minimizedBytes).toBeLessThan(result.originalBytes);
  expect(result.signature).toBe("unexpected-error:number:EXPR_DIV_ZERO:eager-branches");
  expect(calls).toBe(result.replays + 2);
  expect(result.minimized.domain === "grammar" && eagerFault(result.minimized.program)).toBe(true);
});
test("raw shrink preserves malformed-UTF8 premise, including shortest bytes", async () => {
  const c = catalog().find(c => c.id === "raw-invalid-utf8")!;
  const result = await shrink(c, async candidate => compare(candidate, '{"ok":true,"value":true,"fuel":1}', "bad-raw-parser"));
  expect(result.minimizedBytes).toBe(1); expect(result.signature).toBe("unexpected-success:EXPR_PARSE:boolean:bad-raw-parser");
  for (const r of reductions(c)) expect(() => new TextDecoder("utf-8", { fatal: true }).decode(inputBytes(r))).toThrow();
});
test("raw candidate generation charges rejected UTF8 candidates before yielding", async () => {
  const bytes = Uint8Array.from([0xff, ...new Uint8Array(16_000).fill(65)]);
  const original = parseCase({ contract: "algal.corpus-case.v1", id: "long-invalid", domain: "raw", hex: hex(bytes), expectation: "invalid-utf8", catalog: "" });
  let calls = 0;
  const result = await shrink(original, async c => { calls++; compare(c, '{"ok":true,"value":true,"fuel":1}', "broken-parser"); }, { attempts: 1 });
  expect(result.attempts).toBe(1); expect(result.replays).toBe(0); expect(calls).toBe(2);
  expect(result.exhausted).toBe(true); expect(result.minimized).toEqual(original);
});
test("shrinker rejects wrong-value to parse-error and error-class substitutions", async () => {
  const original = fixture(["add", 1, 1]);
  const result = await shrink(original, async c => {
    if (c.domain !== "grammar") throw new Error("grammar control");
    compare(c, Array.isArray(c.program) ? '{"ok":true,"value":3,"fuel":1}' : '{"ok":false,"err":{"code":"EXPR_PARSE"},"fuel":0}', "subject");
  });
  expect(result.signature).toBe("wrong-value:number:number:subject");
  expect(result.minimized.domain === "grammar" && Array.isArray(result.minimized.program)).toBe(true);
  const get = (c: Case, output: string) => { try { compare(c, output, "subject"); } catch (e) { if (e instanceof Mismatch) return e.signature(); throw e; } throw new Error("expected mismatch"); };
  const fault = fixture(["div", 1, 0]);
  expect(get(fault, '{"ok":false,"err":{"code":"EXPR_PARSE"},"fuel":0}')).not.toBe(get(fault, '{"ok":true,"value":1,"fuel":1}'));
});
test("shrink cannot replace semantics with timeout/infrastructure or another mismatch", async () => {
  let calls = 0;
  await expect(shrink(fixture(["neg", 2]), async c => { if (++calls === 1) throw new Mismatch("value", c.id, "subject", "seed"); throw new Error("deadline"); })).rejects.toThrow("deadline");
  const c = fixture(["neg", 2]); calls = 0;
  const result = await shrink(c, async candidate => { calls++; throw new Mismatch(stableJson(candidate) === stableJson(c) ? "seed-property" : "other-property", candidate.id, "subject", "fault"); });
  expect(result.minimized).toEqual(c);
  await expect(shrink(c, async () => {}, { attempts: 0 })).rejects.toThrow();
});

test("archive preflight counts exact escapes and refuses before invoking serialization", () => {
  const vector = { z: ["\ud800", "\udfff", "😀", "\u0000", "é", "\n", "\\", '"'], a: [null, false, 1e20] };
  const encoded = stableJson(vector), size = new TextEncoder().encode(encoded).byteLength;
  expect(jsonSize(vector, size)).toBe(size);
  expect(() => jsonSize(vector, size - 1)).toThrow("encoded record bound");
  expect(utf8Size("\ud800é😀")).toBe(new TextEncoder().encode("\ud800é😀").byteLength);
  const budget = new CaptureBudget();
  const record = encodeRecord(vector, budget);
  expect(record).toBe(encoded + "\n"); expect(budget.archiveBytes).toBe(size + 1);
  let reads = 0;
  const getter = Object.defineProperty({}, "payload", { enumerable: true, get() { reads++; return "payload"; } });
  expect(() => encodeRecord(getter, budget)).toThrow("metadata object own data"); expect(reads).toBe(0);
  expect(() => encodeRecord({ oversized: "a".repeat(LIMITS.recordBytes) }, budget)).toThrow("encoded record bound");
  expect(budget.archiveBytes).toBe(size + 1);
});
test("secondary retention failures preserve the original semantic exception", async () => {
  const original = new Mismatch("wrong-value:number:number", "unit", "subject", "value");
  let error: unknown;
  try { await retainFailure(original, async () => { throw new Error("archive full"); }); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(AggregateError); expect(primaryFailure(error)).toBe(original);
  expect((error as AggregateError).errors[1].message).toBe("archive full");
});

test("wrapper fuel-only difference retains its own semantic mismatch while shrinking", async () => {
  const c = fixture(["add", 1, 1]), digest = hashBytes("artifact");
  const result = await shrink(c, async candidate => {
    const want = expected(candidate); if (!want.ok) throw new Error("successful fixture expected");
    const raw = { ok: true, value: want.value, fuel: 1 };
    admitWorker(candidate, { contract: "algal.corpus-worker.v1", id: candidate.id, inputSha256: hashBytes(inputBytes(candidate)), wasmSha256: digest,
      raw: JSON.stringify(raw), bun: { ...raw, fuel: 2 } }, digest, true);
  });
  expect(result.signature).toBe("full-result:bun-wrapper");
  expect(result.minimizedBytes).toBeLessThan(result.originalBytes);
});

test("terminal failure metadata preflights bounded previews while retaining primary identity", () => {
  const original = new Mismatch("\ud800".repeat(1_000_000), "id".repeat(1_000), "target".repeat(1_000), "\u0000".repeat(1_000_000));
  const wrapped = new AggregateError([original, new Error("retention")], "\udfff".repeat(10_000), { cause: original });
  const encoded = failureRecord(wrapped, { completedRows: 0, invocations: 1, archiveBytes: 0, capturedOutputBytes: 0 });
  expect(new TextEncoder().encode(encoded).byteLength).toBeLessThanOrEqual(LIMITS.failureBytes);
  const record = JSON.parse(encoded);
  expect(record.category).toBe("semantic-mismatch"); expect(record.semantic.truncated).toBe(true); expect(record.errorTruncated).toBe(true);
  expect(record.semantic.property.length).toBe(256); expect(primaryFailure(wrapped)).toBe(original);
});
