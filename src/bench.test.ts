import { describe, expect, test } from "bun:test";
import { parseOrganismManifest } from "./contract";
import { scriptedExecutor, type Executor } from "./effects";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { runBenchmark } from "./bench";
import { parseBenchReport, verifyBenchReport } from "./bench-verify";
import { canonicalize, type JsonValue } from "./values";

const single = parseOrganismManifest({
  contract: "morphogen.organism.v1",
  key: "organism:bench-single",
  name: "Single call",
  cells: [
    { id: "src", kind: "input", outputs: { ticket: "text" } },
    {
      id: "route",
      kind: "classifier",
      inputs: { ticket: "text" },
      prompt: "Route the ticket.",
      view: { inputs: ["ticket"] },
      output: { kind: "choice", labels: ["billing", "technical", "other"] },
    },
  ],
  edges: [
    { from: { cell: "src", port: "ticket" }, to: { cell: "route", port: "ticket" } },
  ],
  interface: {
    inputs: { ticket: { cell: "src", port: "ticket" } },
    outputs: { out: { cell: "route", port: "out" } },
  },
});

const circuit = parseOrganismManifest({
  contract: "morphogen.organism.v1",
  key: "organism:bench-circuit",
  name: "Cheap-first cascade",
  budgets: { maxSteps: 8, maxAgentCalls: 4, maxWork: 100000 },
  cells: [
    { id: "src", kind: "input", outputs: { ticket: "text" } },
    {
      id: "cheap",
      kind: "classifier",
      inputs: { ticket: "text" },
      prompt: "Route the ticket, or abstain.",
      view: { inputs: ["ticket"] },
      output: { kind: "choice", labels: ["billing", "technical", "other", "unsure"] },
      route: { preset: "cheap" },
    },
    {
      id: "escalate",
      kind: "classifier",
      inputs: {
        ticket: "text",
        trigger: { type: "choice", labels: ["billing", "technical", "other", "unsure"] },
      },
      prompt: "Route the ticket the cheap pass could not.",
      view: { inputs: ["ticket"] },
      output: { kind: "choice", labels: ["billing", "technical", "other"] },
      route: { preset: "frontier" },
    },
    { id: "merge", kind: "fn", fn: "coalesce.v1" },
  ],
  edges: [
    { from: { cell: "src", port: "ticket" }, to: { cell: "cheap", port: "ticket" } },
    { from: { cell: "src", port: "ticket" }, to: { cell: "escalate", port: "ticket" } },
    {
      from: { cell: "cheap", port: "out" },
      to: { cell: "escalate", port: "trigger" },
      guard: { equals: "unsure" },
    },
    { from: { cell: "escalate", port: "out" }, to: { cell: "merge", port: "a" } },
    { from: { cell: "cheap", port: "out" }, to: { cell: "merge", port: "b" } },
  ],
  interface: {
    inputs: { ticket: { cell: "src", port: "ticket" } },
    outputs: { out: { cell: "merge", port: "value" } },
  },
});

const cases = [
  { id: "t1", args: { ticket: "charged twice for my subscription" }, expect: { out: "billing" } },
  { id: "t2", args: { ticket: "app crashes on export" }, expect: { out: "technical" } },
  { id: "t3", args: { ticket: "refund for a cancelled plan" }, expect: { out: "billing" } },
  { id: "t4", args: { ticket: "invoice totals look wrong after the update" }, expect: { out: "technical" } },
];

/** Scripted executor that reports model usage so attribution exercises the
 * per-model path — same shape the gateway executor produces. */
function metered(
  id: string,
  model: string,
  responses: Record<string, JsonValue>,
  usage: { tokensIn: number; tokensOut: number },
): Executor {
  const inner = scriptedExecutor(responses, id);
  return {
    id,
    execute: (request, signal) => inner.execute(request, signal),
    receiptFor: () => ({ usage: { model, ...usage } }),
  };
}

const CHEAP = { tokensIn: 100, tokensOut: 10 };
const FRONTIER = { tokensIn: 900, tokensOut: 60 };

async function bench() {
  const store = new MemoryStore();
  const report = await runBenchmark({
    fns: builtinRegistry(),
    store,
    cases,
    systems: [
      {
        id: "cheap-single",
        manifest: single,
        executors: [
          metered("cheap", "qwen-flash", { route: ["billing", "technical", "billing", "other"] }, CHEAP),
        ],
      },
      {
        id: "frontier-single",
        manifest: single,
        executors: [
          metered("frontier", "claude-opus", { route: ["billing", "technical", "billing", "technical"] }, FRONTIER),
        ],
      },
      {
        id: "circuit",
        manifest: circuit,
        executors: [
          metered("cheap", "qwen-flash", { cheap: ["billing", "technical", "billing", "unsure"] }, CHEAP),
          metered("frontier", "claude-opus", { escalate: ["technical"] }, FRONTIER),
        ],
      },
    ],
  });
  return { store, report };
}

describe("bench", () => {
  test("a cheap-first circuit matches frontier quality at frontier-call rate < 1", async () => {
    const { report } = await bench();
    const byId = new Map(report.systems.map((s) => [s.id, s]));
    expect(byId.get("cheap-single")!.passed).toBe(3);
    expect(byId.get("frontier-single")!.passed).toBe(4);
    expect(byId.get("circuit")!.passed).toBe(4);
    // the circuit escalated once: quality of the frontier system at a
    // fraction of its tokens
    const circuit = byId.get("circuit")!;
    expect(circuit.attribution["claude-opus"]!.calls).toBe(1);
    expect(circuit.attribution["qwen-flash"]!.calls).toBe(4);
    expect(circuit.usage.tokensIn).toBe(4 * CHEAP.tokensIn + FRONTIER.tokensIn);
    expect(byId.get("frontier-single")!.usage.tokensIn).toBe(4 * FRONTIER.tokensIn);
    // three-axis pareto: circuit dominates on tokens, frontier-single
    // stays non-dominated on effect calls (4 vs the circuit's 5),
    // cheap-single trades quality for cost
    expect(report.pareto).toEqual(["circuit", "frontier-single", "cheap-single"]);
    expect(report.workload).toMatch(/^sha256:[0-9a-f]{64}$/);
    // the report embeds the workload so verification is self-contained
    const reparsed = parseBenchReport(JSON.parse(canonicalize(report as unknown as JsonValue)));
    expect(reparsed.digest).toBe(report.digest);
    expect(reparsed.cases).toEqual(cases);
  });

  test("bench reports verify offline and detect tampering", async () => {
    const { store, report } = await bench();
    const verified = await verifyBenchReport(report, store, builtinRegistry());
    expect(verified.ok).toBe(true);
    expect(verified.checkedReceipts).toBe(12);
    expect(verified.mismatches).toEqual([]);

    // recomputed-digest tampering still fails: the pass claim no longer
    // matches the recorded outcome and outputs
    const tampered = JSON.parse(canonicalize(report as unknown as JsonValue)) as {
      systems: { cases: { passed: boolean }[] }[];
      digest?: string;
    };
    tampered.systems[0]!.cases[3]!.passed = true;
    const { digestCanonical } = await import("./digest");
    const { digest: _d, ...base } = tampered as Record<string, JsonValue> & { digest: string };
    tampered.digest = digestCanonical(base as JsonValue);
    const again = await verifyBenchReport(tampered, store, builtinRegistry());
    expect(again.ok).toBe(false);
    expect(again.mismatches.some((m) => m.includes("invalid pass claim") || m.includes("passed does not match"))).toBe(true);
  });

  test("validation: bounds, unique ids, and interface coverage", async () => {
    const store = new MemoryStore();
    const fns = builtinRegistry();
    const cheap = metered("cheap", "qwen-flash", { route: "billing" }, CHEAP);
    await expect(
      runBenchmark({ fns, store, cases: [], systems: [{ id: "a", manifest: single, executors: [cheap] }] }),
    ).rejects.toThrow(/at least one case/);
    await expect(
      runBenchmark({
        fns,
        store,
        cases,
        systems: Array.from({ length: 9 }, (_, i) => ({
          id: `s${i}`,
          manifest: single,
          executors: [cheap],
        })),
      }),
    ).rejects.toThrow(/exceed 8/);
    await expect(
      runBenchmark({
        fns,
        store,
        cases,
        systems: [
          { id: "dup", manifest: single, executors: [cheap] },
          { id: "dup", manifest: single, executors: [cheap] },
        ],
      }),
    ).rejects.toThrow(/duplicate bench system id/);
    await expect(
      runBenchmark({
        fns,
        store,
        cases: [{ id: "x1", args: { bogus: "hi" }, expect: { out: "billing" } }],
        systems: [{ id: "a", manifest: single, executors: [cheap] }],
      }),
    ).rejects.toThrow(/unknown system input/);
    await expect(
      runBenchmark({
        fns,
        store,
        cases: [{ id: "x1", args: { ticket: "hi" }, expect: { wrong: "billing" } }],
        systems: [{ id: "a", manifest: single, executors: [cheap] }],
      }),
    ).rejects.toThrow(/unknown expected output|missing expected output/);
  });
});
