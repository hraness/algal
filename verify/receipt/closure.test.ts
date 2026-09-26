/**
 * verify/receipt/closure.test.ts — Phase 14 receipt-closure evidence.
 *
 * Two layers, all static:
 *   1. `inspectReceiptResources` mirrors `checkReceiptResources`
 *      (src/run.ts:1864-1906) over real values — verified against the
 *      production parser `parseRunReceipt` for accept/reject parity.
 *   2. `decideRunClosure` classifies a produced run summary as mintable /
 *      bounded-failure(BUDGET_EXHAUSTED) / invalid — the checkable form of
 *      the Phase-14 criterion "Artifact byte/depth/node closure is
 *      established or typed bounded failure preserves custody" (RCP-05).
 *
 * No runtime spawning: fixtures carry measured numbers (see fixtures.ts).
 */

import { describe, expect, test } from "bun:test";

// Production mirrors under test — pure parsers only, nothing is executed.
import { parseRunReceipt, RECEIPT_BOUNDS } from "../../src/run";
import { canonicalBytes } from "../../src/values";

import {
  FILE_STORE_DOCUMENT_PROFILE,
  PROCESS_EVIDENCE_PROFILE,
  PROCESS_RUNS_PROFILE,
  RECEIPT_ENVELOPE_PROFILE,
  RECEIPT_FIELD_BOUNDS,
  RECEIPT_RESOURCE_BOUNDS,
  admitDimensions,
  decideRunClosure,
  inspectReceiptResources,
  type ReceiptDimensions,
} from "./bounds";
import {
  BYTE_BOUNDARY,
  BYTE_BOUNDARY_OVER,
  DEPTH_BOUNDARY,
  DEPTH_BOUNDARY_OVER,
  FIELD_ARGS_OVER,
  FIELD_BOUNDARY,
  FIELD_CELLS_OVER,
  FIELD_EFFECTS_OVER,
  FIELD_EVENTS_OVER,
  MULTI_EXCEEDED,
  NODE_BOUNDARY,
  NODE_BOUNDARY_OVER,
  OVER_PROCESS_CUSTODY,
  RECORD_ORDERS_1,
  RECORD_ORDERS_7,
  RECORD_ORDERS_7_THROWN,
  SMALL_COMPLETE,
  STRING_AND_CANONICAL_OVER,
  summaryOf,
} from "./fixtures";

const SMALL = Object.freeze({ name: "small", maxNodes: 20, maxDepth: 4, maxBytes: 30, countsStringBytes: true });

// A field-valid minimal receipt: every required member, all under bounds.
const MINIMAL_RECEIPT = {
  contract: "algal.run.v1",
  runtime: { name: "algal", version: "0.1.0" },
  manifestDigest: `sha256:${"0".repeat(64)}`,
  manifestKey: "organism:test",
  args: {},
  outcome: "complete",
  cells: {},
  effects: [],
  events: [],
  work: { steps: 0, agentCalls: 0, units: 0 },
  digest: `sha256:${"0".repeat(64)}`,
};

// ---------------------------------------------------------------------------
// The mirrored constant must equal the production bound record.
// ---------------------------------------------------------------------------

describe("bound extraction", () => {
  test("RECEIPT_RESOURCE_BOUNDS equals the runtime's RECEIPT_BOUNDS resource members", () => {
    expect(RECEIPT_RESOURCE_BOUNDS).toEqual({
      maxNodes: RECEIPT_BOUNDS.maxNodes,
      maxDepth: RECEIPT_BOUNDS.maxDepth,
      maxBytes: RECEIPT_BOUNDS.maxBytes,
    });
    expect(RECEIPT_RESOURCE_BOUNDS).toEqual({ maxNodes: 1_000_000, maxDepth: 64, maxBytes: 67_108_864 });
  });

  test("RECEIPT_FIELD_BOUNDS equals the runtime's derived field caps", () => {
    expect<number>(RECEIPT_FIELD_BOUNDS.maxCells).toBe(RECEIPT_BOUNDS.maxCells);
    expect<number>(RECEIPT_FIELD_BOUNDS.maxEffects).toBe(RECEIPT_BOUNDS.maxEffects);
    // events and args come from contract BOUNDS via parseReceiptFields.
    expect(RECEIPT_FIELD_BOUNDS.maxEvents).toBe(4_096);
    expect(RECEIPT_FIELD_BOUNDS.maxArgsBytes).toBe(1_048_576);
  });
});

// ---------------------------------------------------------------------------
// Value-level predicate — the exact mirror of checkReceiptResources.
// ---------------------------------------------------------------------------

describe("inspectReceiptResources mirrors the receipt resource walk", () => {
  test("counts every node: scalars, containers and the root", () => {
    const v = inspectReceiptResources([[[0]]], SMALL);
    expect(v).toMatchObject({ ok: true, nodes: 4, maxDepth: 3, stringBytes: 0, canonicalBytes: 7 });
  });

  test("object keys add string bytes, not nodes", () => {
    const v = inspectReceiptResources({ a: 1, b: "xy" }, SMALL);
    // nodes: the root object plus the two member values.
    expect(v).toMatchObject({ ok: true, nodes: 3, maxDepth: 1, stringBytes: 4 });
    // canonical {"a":1,"b":"xy"} is 16 bytes.
    expect(v).toMatchObject({ canonicalBytes: 16 });
  });

  test("canonicalBytes agrees with the production canonicalizer", () => {
    for (const value of [
      MINIMAL_RECEIPT,
      { z: [1, "a\nb", null], a: { b: 2.5 } },
      ["x", { "": [true, false] }],
    ]) {
      const v = inspectReceiptResources(value);
      expect(v.ok).toBe(true);
      if (v.ok) expect(v.canonicalBytes).toBe(canonicalBytes(value));
    }
  });

  test("sparse arrays count serialized positions — holes become null nodes", () => {
    const v = inspectReceiptResources(new Array(3), SMALL);
    expect(v).toMatchObject({ ok: true, nodes: 4, canonicalBytes: 16 });
    // `[null,null,null]` — and the array pre-check refuses before pushing.
    const over = inspectReceiptResources(new Array(3), { ...SMALL, maxNodes: 3 });
    expect(over).toMatchObject({ ok: false, reason: "nodes", message: "receipt node bound exceeded" });
  });

  test("inherited and non-enumerable array indices still count, as they serialize", () => {
    // `i in value` walks the prototype chain — JSON.stringify reads the same
    // way, so an inherited slot serializes and counts.
    const inherited: unknown[] = [];
    inherited.length = 1;
    Object.setPrototypeOf(inherited, [9]);
    const v = inspectReceiptResources(inherited, SMALL);
    expect(v).toMatchObject({ ok: true, nodes: 2, canonicalBytes: 3 }); // [9]
    const hidden = [] as unknown[];
    Object.defineProperty(hidden, "0", { value: 7, enumerable: false, writable: true, configurable: true });
    hidden.length = 1;
    expect(inspectReceiptResources(hidden, SMALL)).toMatchObject({ ok: true, nodes: 2 });
  });

  test("non-enumerable object members do not count — they do not serialize", () => {
    const obj: Record<string, unknown> = {};
    Object.defineProperty(obj, "s", { value: 1, enumerable: false });
    const v = inspectReceiptResources(obj, SMALL);
    expect(v).toMatchObject({ ok: true, nodes: 1, canonicalBytes: 2 }); // {}
  });

  test("depth counts the root as 0; a node at maxDepth is admitted", () => {
    let value: unknown = null;
    for (let i = 0; i < 4; i++) value = [value]; // depth 4
    expect(inspectReceiptResources(value, SMALL)).toMatchObject({ ok: true, maxDepth: 4, nodes: 5 });
    const over = inspectReceiptResources([value], SMALL); // depth 5
    expect(over).toMatchObject({ ok: false, reason: "depth", message: "receipt structural bounds exceeded" });
    if (!over.ok) expect(over.observation.maxDepth).toBe(5);
  });

  test("string content bytes trip the early term before canonical accounting", () => {
    const ok = inspectReceiptResources({ k: "toolong" }, SMALL); // 1 + 7 = 8 ≤ 30
    expect(ok).toMatchObject({ ok: true, stringBytes: 8, canonicalBytes: 15 });
    const strict = inspectReceiptResources({ k: "toolong" }, { ...SMALL, maxBytes: 5 });
    expect(strict).toMatchObject({ ok: false, reason: "stringBytes", message: "receipt byte bound exceeded" });
  });

  test("the canonical-byte check catches escapes the content term undercounts", () => {
    // {"v":"a\n"} — string content is 3 counted bytes (key + "a\n"), the
    // canonical form is 11 with the escape.
    const v = inspectReceiptResources({ v: "a\n" }, { ...SMALL, maxBytes: 6 });
    expect(v).toMatchObject({ ok: false, reason: "canonicalBytes", message: "receipt byte bound exceeded" });
    if (!v.ok) expect(v.observation.canonicalBytes).toBe(11); // {"v":"a\n"}
  });

  test("non-JSON values reject as nonJson, mirroring the runtime arm", () => {
    for (const bad of [undefined, NaN, Infinity, Symbol("s"), 1n, () => 1, { a: undefined }, [undefined]]) {
      const v = inspectReceiptResources(bad, SMALL);
      expect(v).toMatchObject({ ok: false, reason: "nonJson", message: "receipt must contain only JSON values" });
    }
  });

  test("an explicit undefined member is counted then rejected — it is not skipped", () => {
    const v = inspectReceiptResources({ a: 1, u: undefined }, SMALL);
    expect(v).toMatchObject({ ok: false, reason: "nonJson" });
    // LIFO: the last-pushed member pops first — undefined is the second node.
    if (!v.ok) expect(v.observation.nodes).toBe(2); // root + undefined
  });
});

// ---------------------------------------------------------------------------
// Parity with the production parser on real receipt values.
// ---------------------------------------------------------------------------

describe("parity with parseRunReceipt", () => {
  test("a field-valid minimal receipt is admitted by both", () => {
    expect<string>(parseRunReceipt(MINIMAL_RECEIPT).digest).toBe(MINIMAL_RECEIPT.digest);
    const v = inspectReceiptResources(MINIMAL_RECEIPT);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.canonicalBytes).toBe(canonicalBytes(MINIMAL_RECEIPT));
  });

  test("a receipt nested past depth 64 fails the same way on both", () => {
    let deep: unknown = null;
    for (let i = 0; i < 70; i++) deep = [deep];
    const receipt = {
      ...MINIMAL_RECEIPT,
      cells: { pad: { status: "committed", work: 0, outputs: { value: deep } } },
    };
    const v = inspectReceiptResources(receipt);
    expect(v).toMatchObject({ ok: false, reason: "depth" });
    expect(() => parseRunReceipt(receipt)).toThrow(
      expect.objectContaining({ code: "PARSE_FAILED", message: "receipt structural bounds exceeded" }),
    );
  });

  test("exactly one million nodes is admitted and the next node rejected, on both", () => {
    const receipt = (pad: number) => ({
      ...MINIMAL_RECEIPT,
      cells: { pad: { status: "committed", work: 0, outputs: { value: Array(pad).fill(0) } } },
    });
    const base = inspectReceiptResources(receipt(0));
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    const pad = RECEIPT_BOUNDS.maxNodes - base.nodes;
    expect(pad).toBeGreaterThan(0);
    const exact = receipt(pad);
    const exactVerdict = inspectReceiptResources(exact);
    expect(exactVerdict).toMatchObject({ ok: true, nodes: 1_000_000 });
    expect(parseRunReceipt(exact).outcome).toBe("complete");
    const over = receipt(pad + 1);
    expect(inspectReceiptResources(over)).toMatchObject({ ok: false, reason: "nodes" });
    expect(() => parseRunReceipt(over)).toThrow(
      expect.objectContaining({ code: "PARSE_FAILED", message: "receipt structural bounds exceeded" }),
    );
  }, 20_000);
});

// ---------------------------------------------------------------------------
// Summary-level closure decision.
// ---------------------------------------------------------------------------

describe("decideRunClosure: mintable", () => {
  test("a small complete run is mintable and every consumer admits it", () => {
    const v = decideRunClosure(SMALL_COMPLETE);
    expect(v.kind).toBe("mintable");
    if (v.kind !== "mintable") return;
    expect(v.admission).toEqual([
      { profile: "receipt-envelope", admitted: true, exceeded: [] },
      { profile: "file-store-document", admitted: true, exceeded: [] },
      { profile: "process-runs-custody", admitted: true, exceeded: [] },
      { profile: "process-evidence-envelope", admitted: true, exceeded: [] },
    ]);
  });

  test("a receipt exactly at the node, depth and byte bounds is mintable", () => {
    for (const dims of [NODE_BOUNDARY, DEPTH_BOUNDARY, BYTE_BOUNDARY, FIELD_BOUNDARY]) {
      expect(decideRunClosure(summaryOf(dims)).kind).toBe("mintable");
    }
  });

  test("measured record-orders size 1 is mintable — and already exceeds process custody", () => {
    const v = decideRunClosure(RECORD_ORDERS_1);
    expect(v.kind).toBe("mintable");
    if (v.kind !== "mintable") return;
    const byProfile = Object.fromEntries(v.admission.map((a) => [a.profile, a]));
    expect(byProfile["receipt-envelope"]?.admitted).toBe(true);
    expect(byProfile["file-store-document"]?.admitted).toBe(true);
    expect(byProfile["process-evidence-envelope"]?.admitted).toBe(true);
    // 421,330 nodes > 100,000 and 19.15 MB > 16 MB — the durable-process
    // profile refuses a receipt the parser and FileStore accept.
    expect(byProfile["process-runs-custody"]).toEqual({
      profile: "process-runs-custody",
      admitted: false,
      exceeded: ["nodes", "canonicalBytes"],
    });
  });
});

describe("decideRunClosure: typed bounded failure", () => {
  test("record-orders size 7 — 1,385,149 nodes — is the bounded failure", () => {
    const v = decideRunClosure(RECORD_ORDERS_7);
    expect(v).toMatchObject({
      kind: "bounded-failure",
      code: "BUDGET_EXHAUSTED",
      exceeded: ["nodes"],
      details: { outcome: "failed", failure: "BUDGET_EXHAUSTED", work: { steps: 1_024, agentCalls: 0, units: 1_349_157 } },
    });
    if (v.kind !== "bounded-failure") return;
    // Every downstream consumer would also refuse the envelope — nodes alone.
    for (const admission of v.admission) {
      expect(admission.admitted).toBe(false);
      expect(admission.exceeded).toContain("nodes");
    }
  });

  test("the thrown channel with no measured dims is still the bounded failure", () => {
    const v = decideRunClosure(RECORD_ORDERS_7_THROWN);
    expect(v).toMatchObject({
      kind: "bounded-failure",
      code: "BUDGET_EXHAUSTED",
      exceeded: [],
      details: { outcome: "failed", failure: "BUDGET_EXHAUSTED", work: { steps: 1_024, agentCalls: 0, units: 1_349_157 } },
    });
  });

  test("one node over the bound", () => {
    expect(decideRunClosure(summaryOf(NODE_BOUNDARY_OVER))).toMatchObject({
      kind: "bounded-failure", code: "BUDGET_EXHAUSTED", exceeded: ["nodes"],
    });
  });

  test("depth 65 exceeds", () => {
    expect(decideRunClosure(summaryOf(DEPTH_BOUNDARY_OVER))).toMatchObject({
      kind: "bounded-failure", code: "BUDGET_EXHAUSTED", exceeded: ["depth"],
    });
  });

  test("one byte over the canonical bound", () => {
    expect(decideRunClosure(summaryOf(BYTE_BOUNDARY_OVER))).toMatchObject({
      kind: "bounded-failure", code: "BUDGET_EXHAUSTED", exceeded: ["canonicalBytes"],
    });
  });

  test("string-content bytes over the bound report the early term", () => {
    expect(decideRunClosure(summaryOf(STRING_AND_CANONICAL_OVER))).toMatchObject({
      kind: "bounded-failure", exceeded: ["stringBytes", "canonicalBytes"],
    });
  });

  test("multiple bounds crossed at once report every violation", () => {
    expect(decideRunClosure(summaryOf(MULTI_EXCEEDED))).toMatchObject({
      kind: "bounded-failure", exceeded: ["nodes", "depth", "canonicalBytes"],
    });
  });

  test("a complete run can be unmintable — the channel is not failure-specific", () => {
    const v = decideRunClosure(summaryOf(NODE_BOUNDARY_OVER));
    expect(v).toMatchObject({
      kind: "bounded-failure",
      details: { outcome: "complete", failure: null },
    });
  });
});

describe("decideRunClosure: invalid", () => {
  test("field-bound exceedance on a structurally admissible envelope is invalid", () => {
    for (const dims of [FIELD_CELLS_OVER, FIELD_EFFECTS_OVER, FIELD_EVENTS_OVER, FIELD_ARGS_OVER]) {
      const v = decideRunClosure(summaryOf(dims));
      expect(v.kind).toBe("invalid");
      if (v.kind === "invalid") expect(v.reason).toContain("field admission");
    }
  });

  test("a minted-looking envelope that claims a thrown mint error is inconsistent", () => {
    const v = decideRunClosure({ ...SMALL_COMPLETE, mintCode: "BUDGET_EXHAUSTED" });
    expect(v.kind).toBe("invalid");
    if (v.kind === "invalid") expect(v.reason).toContain("inconsistent");
  });

  test("an over-bound envelope with a non-budget mint code is outside the channel", () => {
    const v = decideRunClosure({ ...summaryOf(NODE_BOUNDARY_OVER), mintCode: "PARSE_FAILED" });
    expect(v.kind).toBe("invalid");
    if (v.kind === "invalid") expect(v.reason).toContain("PARSE_FAILED");
  });

  test("no receipt and no bounded-failure throw is unrepresentable", () => {
    for (const summary of [
      { ...SMALL_COMPLETE, receipt: null },
      { ...SMALL_COMPLETE, receipt: null, mintCode: "INTERNAL" },
      { ...SMALL_COMPLETE, receipt: null, mintCode: "PARSE_FAILED" },
    ]) {
      expect(decideRunClosure(summary).kind).toBe("invalid");
    }
  });

  test("malformed summaries reject", () => {
    const bad: unknown[] = [
      null,
      42,
      "summary",
      [],
      { ...SMALL_COMPLETE, extra: 1 },
      { ...SMALL_COMPLETE, outcome: "exploded" },
      { ...SMALL_COMPLETE, failure: "NOT_A_CODE" },
      { ...SMALL_COMPLETE, outcome: "complete", failure: "TYPE_MISMATCH" }, // coherence
      { ...SMALL_COMPLETE, outcome: "failed", failure: null },
      { ...SMALL_COMPLETE, work: { steps: -1, agentCalls: 0, units: 0 } },
      { ...SMALL_COMPLETE, work: { steps: 1.5, agentCalls: 0, units: 150 } },
      { ...SMALL_COMPLETE, work: { steps: 1_025, agentCalls: 0, units: 102_500 } }, // over the schedulable step bound
      { ...SMALL_COMPLETE, work: { steps: 0, agentCalls: 65, units: 0 } },
      { ...SMALL_COMPLETE, work: { steps: 4, agentCalls: 0, units: 399 } }, // below 100 units/step
      { ...SMALL_COMPLETE, work: { steps: 1, agentCalls: 0, units: 100, extra: 0 } },
      { ...SMALL_COMPLETE, mintCode: 500 },
      { ...SMALL_COMPLETE, mintCode: "NOT_A_CODE" },
      { outcome: "complete", failure: null, work: { steps: 0, agentCalls: 0, units: 0 } }, // receipt missing
      { ...SMALL_COMPLETE, receipt: { nodes: -1, maxDepth: 1, canonicalBytes: 10 } },
      { ...SMALL_COMPLETE, receipt: { nodes: 10, maxDepth: NaN, canonicalBytes: 10 } },
      { ...SMALL_COMPLETE, receipt: { nodes: 10, maxDepth: 1.5, canonicalBytes: 10 } },
      { ...SMALL_COMPLETE, receipt: { nodes: 10, maxDepth: 1 } }, // canonicalBytes missing
      { ...SMALL_COMPLETE, receipt: { nodes: 10, maxDepth: 1, canonicalBytes: 10, stringBytes: 11 } }, // impossible
      { ...SMALL_COMPLETE, receipt: { nodes: 10, maxDepth: 1, canonicalBytes: 10, cells: 1.5 } },
      { ...SMALL_COMPLETE, receipt: { nodes: 10, maxDepth: 1, canonicalBytes: 10, bogus: 0 } },
    ];
    for (const summary of bad) {
      const v = decideRunClosure(summary);
      expect(v.kind).toBe("invalid");
      if (v.kind === "invalid") expect(v.reason.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-profile admission is a pure function of the measured dims.
// ---------------------------------------------------------------------------

describe("admitDimensions profiles", () => {
  test("the process-custody profile is strictly tighter than the envelope", () => {
    expect(PROCESS_RUNS_PROFILE.maxNodes).toBeLessThan(RECEIPT_ENVELOPE_PROFILE.maxNodes);
    expect(PROCESS_RUNS_PROFILE.maxBytes).toBeLessThan(RECEIPT_ENVELOPE_PROFILE.maxBytes);
    expect(PROCESS_RUNS_PROFILE.maxDepth).toBe(RECEIPT_ENVELOPE_PROFILE.maxDepth);
    expect(FILE_STORE_DOCUMENT_PROFILE.maxNodes).toBe(RECEIPT_ENVELOPE_PROFILE.maxNodes);
    expect(FILE_STORE_DOCUMENT_PROFILE.maxBytes).toBe(RECEIPT_ENVELOPE_PROFILE.maxBytes);
    expect(PROCESS_EVIDENCE_PROFILE.countsStringBytes).toBe(true);
    expect(FILE_STORE_DOCUMENT_PROFILE.countsStringBytes).toBe(false);
  });

  test("OVER_PROCESS_CUSTODY: mintable yet refused by durable-process custody alone", () => {
    const v = decideRunClosure(OVER_PROCESS_CUSTODY);
    expect(v.kind).toBe("mintable");
    if (v.kind !== "mintable") return;
    const custody = v.admission.find((a) => a.profile === "process-runs-custody");
    expect(custody).toEqual({ profile: "process-runs-custody", admitted: false, exceeded: ["nodes", "canonicalBytes"] });
    expect(v.admission.filter((a) => a.admitted).map((a) => a.profile)).toEqual([
      "receipt-envelope",
      "file-store-document",
      "process-evidence-envelope",
    ]);
  });

  test("the string-content term changes which bound is named, not whether one is", () => {
    // canonicalBytes always covers stringBytes plus syntax, so a summary whose
    // string term exceeds also exceeds canonically. Counting profiles name
    // both; non-counting profiles name canonicalBytes only.
    const dims: ReceiptDimensions = { nodes: 10, maxDepth: 3, stringBytes: 68_000_000, canonicalBytes: 68_000_010 };
    const admission = admitDimensions(dims);
    const byProfile = Object.fromEntries(admission.map((a) => [a.profile, a.exceeded]));
    expect(byProfile).toEqual({
      "receipt-envelope": ["stringBytes", "canonicalBytes"],
      "file-store-document": ["canonicalBytes"],
      "process-runs-custody": ["canonicalBytes"],
      "process-evidence-envelope": ["stringBytes", "canonicalBytes"],
    });
  });
});
