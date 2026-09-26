/** Lane-local coverage for fuzz-smoke: mutator determinism and bounds, the
 * finding/shrink/dedup path over an injected evaluator, per-generator
 * accounting including vacuous and zero-finding generators, and a real
 * in-process wasm smoke run over the deterministic catalog. */

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { catalog } from "../differential/cases";
import { parseJsonBytes } from "../differential/json";
import { Rng } from "../differential/prng";
import { admitFuzzReport, fuzzProfile, DEFAULT_FUZZ_SEEDS } from "./adapter";
import { MUTATORS, type Mutator } from "./mutate";
import { FUZZ_LIMITS, runFuzz, type FuzzReport } from "./run";

const enc = new TextEncoder();
const WASM = join(import.meta.dir, "../../src/algal_expr.wasm");
const ROOT = join(import.meta.dir, "../..");
const SEED_BYTES = enc.encode('{"program":["add",1,2],"env":{"x":0},"fuel":100}');

test("mutators are deterministic under a fixed seed", () => {
  for (const m of MUTATORS) {
    const a = m.apply(SEED_BYTES, new Rng(7), SEED_BYTES);
    const b = m.apply(SEED_BYTES, new Rng(7), SEED_BYTES);
    if (a === null || b === null) { expect(a).toBe(b); continue; }
    expect(Buffer.from(a).toString("base64")).toBe(Buffer.from(b).toString("base64"));
  }
});

test("byte mutators produce different bytes within the input bound", () => {
  for (const m of MUTATORS.filter(m => m.family === "byte")) {
    const out = m.apply(SEED_BYTES, new Rng(0x1234), SEED_BYTES);
    if (out === null) continue; // precondition may legitimately fail
    expect(out.byteLength).toBeLessThanOrEqual(FUZZ_LIMITS.inputBytes);
    expect(Buffer.from(out).equals(Buffer.from(SEED_BYTES))).toBe(false);
  }
});

test("grammar mutators re-encode to admitted JSON when they produce", () => {
  const bases = catalog([1]).filter(c => {
    if (c.bytes.byteLength === 0 || c.bytes.byteLength >= 4096) return false;
    return parseJsonBytes(c.bytes).ok;
  });
  // A names-field base for grammar-names-mutate (only check-mode envelopes carry names).
  const namesBase = enc.encode('{"program":["get","x"],"names":["x","y"]}');
  for (const m of MUTATORS.filter(m => m.family === "grammar")) {
    let produced = 0;
    for (const base of [...bases, { bytes: namesBase } as never]) {
      const out = m.apply(base.bytes, new Rng(99));
      if (out === null) continue;
      produced++;
      const reparsed = parseJsonBytes(out);
      expect(reparsed.ok).toBe(true);
    }
    expect(produced).toBeGreaterThan(0); // no grammar mutator is vacuous on this base set
  }
});

test("a forced evaluator divergence is found, shrunk, and deduplicated", async () => {
  // A dishonest evaluator that always claims fuel 9 for ok responses — a
  // deterministic synthetic divergence exercising the finding path without
  // relying on a production bug.
  const liar = (mode: "eval" | "check", bytes: Uint8Array) => {
    void bytes;
    if (mode === "check") return { status: "ok" as const, text: '{"ok":true}' };
    return { status: "ok" as const, text: '{"fuel":9,"ok":true,"value":null}' };
  };
  const archiveDir = await mkdtemp(join(tmpdir(), "fuzz-liar-"));
  const report = await runFuzz({
    root: ROOT, wasm: WASM, seeds: [1], archiveDir, reps: 2,
    evaluate: liar,
    mutators: [MUTATORS.find(m => m.id === "grammar-num-perturb")!, MUTATORS.find(m => m.id === "byte-flip")!],
  });
  expect(report.counterexamples.length).toBeGreaterThan(0);
  expect(report.counterexamples.length).toBeLessThanOrEqual(FUZZ_LIMITS.counterexamples);
  for (const cx of report.counterexamples) {
    expect(cx.minimizedBytes).toBeLessThanOrEqual(cx.originalBytes);
    expect(cx.minimizedSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(cx.verdict === "divergence" || cx.verdict === "crash").toBe(true);
    expect(cx.shrinkAttempts).toBeGreaterThan(0);
  }
  expect(() => admitFuzzReport(report)).toThrow("counterexample");
});

test("vacuous and zero-finding generators are reported separately", async () => {
  const never: Mutator = { id: "test-vacuous", family: "byte", apply: () => null };
  const noop: Mutator = { id: "test-noop", family: "grammar", apply: b => b.slice() }; // declined: identical bytes
  const grow: Mutator = { id: "test-grow", family: "byte", apply: (b, _r) => Uint8Array.from([...b, 0x20]) }; // trailing space: still admits
  const archiveDir = await mkdtemp(join(tmpdir(), "fuzz-vac-"));
  const report = await runFuzz({
    root: ROOT, wasm: WASM, seeds: [1], archiveDir, reps: 2,
    mutators: [never, noop, grow],
  });
  // test-vacuous cannot produce; test-noop produces only byte-identical
  // mutants, which the runner declines — both are vacuous generators.
  expect(report.vacuousMutators).toEqual(["test-vacuous", "test-noop"]);
  expect(report.mutators["test-noop"]!.declined).toBeGreaterThan(0);
  expect(report.mutators["test-noop"]!.produced).toBe(0);
  expect(report.zeroFindingMutators).toEqual(["test-grow"]);
  expect(report.verdicts).toHaveProperty("agree");
});

test("real wasm smoke run: verdicts tally, no counterexamples, report persisted", async () => {
  const archiveDir = await mkdtemp(join(tmpdir(), "fuzz-real-"));
  const report = await runFuzz({ root: ROOT, wasm: WASM, seeds: [1], archiveDir, reps: 2 });
  expect(report.contract).toBe("algal.fuzz-smoke-report.v1");
  const tally = Object.values(report.verdicts).reduce((a, b) => a + (b ?? 0), 0);
  expect(tally).toBe(report.executed);
  expect(report.executed + report.declined).toBe(report.plannedIterations);
  expect(report.counterexamples).toHaveLength(0);
  expect(report.mutators["byte-flip"]!.produced).toBeGreaterThan(0);
  expect(Object.keys(report.mutators)).toHaveLength(MUTATORS.length);
  admitFuzzReport(report);
}, 60_000);

test("profile selection and report admission reject oversize or dishonest input", () => {
  expect(() => fuzzProfile("relative", undefined, undefined)).toThrow("absolute");
  expect(fuzzProfile(undefined, undefined, undefined).seeds).toEqual([...DEFAULT_FUZZ_SEEDS]);
  expect(fuzzProfile(undefined, "5", "3").reps).toBe(3);
  expect(() => fuzzProfile(undefined, "", undefined)).toThrow();
  expect(() => fuzzProfile(undefined, "0x10", undefined)).toThrow();
  expect(() => fuzzProfile(undefined, undefined, "17")).toThrow("iteration count bound");
  expect(() => fuzzProfile(undefined, undefined, "x")).toThrow();
  const base: FuzzReport = {
    contract: "algal.fuzz-smoke-report.v1", seeds: [1], plannedIterations: 4,
    executed: 4, declined: 0, verdicts: { agree: 4 }, mutators: {},
    zeroFindingMutators: [], vacuousMutators: [], coverage: { ops: [], codes: {} },
    counterexamples: [], native: { present: false, checked: 0, agreements: 0, timeouts: 0 }, elapsedMs: 0,
  };
  expect(() => admitFuzzReport(base)).not.toThrow();
  expect(() => admitFuzzReport({ ...base, verdicts: { agree: 3 } })).toThrow("account for every");
  expect(() => admitFuzzReport({ ...base, executed: 0, verdicts: {} })).toThrow("not evidence");
});
