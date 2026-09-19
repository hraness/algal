import { describe, expect, test } from "bun:test";
import { parseOrganismManifest } from "./contract";
import { scriptedExecutor, type Executor } from "./effects";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { runBenchmark } from "./bench";
import { parseBenchReport, verifyBenchReport } from "./bench-verify";
import { canonicalize, type JsonValue } from "./values";

const single = parseOrganismManifest({
  contract: "algal.organism.v1",
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
  contract: "algal.organism.v1",
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

  test("an expr scorer replaces exact-match and verifies offline", async () => {
    const store = new MemoryStore();
    const scorer = {
      contract: "algal.expr.v1" as const,
      program: [
        "or",
        ["eq", ["get", "outputs", "out"], ["get", "expect", "out"]],
        ["eq", ["get", "outputs", "out"], "other"],
      ],
    };
    const report = await runBenchmark({
      fns: builtinRegistry(),
      store,
      cases,
      scorer,
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
      ],
    });
    // 'other' counts as acceptable under the scorer: the cheap system's t4
    // miss against exact-match passes here — 4/4, not 3/4.
    expect(report.scorer).toEqual(scorer);
    const byId = new Map(report.systems.map((s) => [s.id, s]));
    expect(byId.get("cheap-single")!.passed).toBe(4);
    expect(byId.get("frontier-single")!.passed).toBe(4);
    const verified = await verifyBenchReport(report, store, builtinRegistry());
    expect(verified.ok).toBe(true);
    expect(verified.mismatches).toEqual([]);

    // a tampered scorer program flips recomputed claims even when the
    // report digest is recomputed over the forgery
    const tampered = JSON.parse(canonicalize(report as unknown as JsonValue)) as {
      scorer: { program: JsonValue };
      digest?: string;
    };
    tampered.scorer.program = ["eq", ["get", "outputs", "out"], "other"];
    const { digestCanonical } = await import("./digest");
    const { digest: _d, ...base } = tampered as Record<string, JsonValue> & { digest: string };
    tampered.digest = digestCanonical(base as JsonValue);
    const again = await verifyBenchReport(tampered, store, builtinRegistry());
    expect(again.ok).toBe(false);
    expect(again.mismatches.some((m) => m.includes("invalid pass claim"))).toBe(true);
  });

  test("configured axes replace the default pareto and verify offline", async () => {
    const store = new MemoryStore();
    const axes = [
      {
        name: "quality",
        dir: "up" as const,
        expr: { contract: "algal.expr.v1" as const, program: ["get", "passed"] },
      },
      {
        name: "frontier",
        dir: "down" as const,
        expr: {
          contract: "algal.expr.v1" as const,
          program: [
            "if",
            ["has", ["get", "attribution"], "claude-opus"],
            ["get", "attribution", "claude-opus", "calls"],
            0,
          ],
        },
      },
    ];
    const report = await runBenchmark({
      fns: builtinRegistry(),
      store,
      cases,
      axes,
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
    expect(report.axes).toEqual(axes);
    const byId = new Map(report.systems.map((s) => [s.id, s]));
    expect(byId.get("cheap-single")!.axisValues).toEqual({ quality: 3, frontier: 0 });
    expect(byId.get("frontier-single")!.axisValues).toEqual({ quality: 4, frontier: 4 });
    expect(byId.get("circuit")!.axisValues).toEqual({ quality: 4, frontier: 1 });
    // under (quality ↑, frontier-calls ↓) the circuit dominates
    // frontier-single outright — the default three-survivor pareto drops it
    expect(report.pareto).toEqual(["circuit", "cheap-single"]);
    const verified = await verifyBenchReport(report, store, builtinRegistry());
    expect(verified.ok).toBe(true);
    expect(verified.mismatches).toEqual([]);

    // a tampered axis value fails recomputation even with a recomputed digest
    const tampered = JSON.parse(canonicalize(report as unknown as JsonValue)) as {
      systems: { axisValues: Record<string, number> }[];
      pareto: string[];
      digest?: string;
    };
    tampered.systems[2]!.axisValues.frontier = 9;
    const { digestCanonical } = await import("./digest");
    const { digest: _d, ...base } = tampered as Record<string, JsonValue> & { digest: string };
    tampered.digest = digestCanonical(base as JsonValue);
    const again = await verifyBenchReport(tampered, store, builtinRegistry());
    expect(again.ok).toBe(false);
    expect(again.mismatches.some((m) => m.includes('axis "frontier"'))).toBe(true);

    // a forged pareto fails even when the axis values are honest
    const forged = JSON.parse(canonicalize(report as unknown as JsonValue)) as {
      pareto: string[];
      digest?: string;
    };
    forged.pareto = ["cheap-single"];
    const { digest: _d2, ...base2 } = forged as Record<string, JsonValue> & { digest: string };
    forged.digest = digestCanonical(base2 as JsonValue);
    const forgedCheck = await verifyBenchReport(forged, store, builtinRegistry());
    expect(forgedCheck.ok).toBe(false);
    expect(forgedCheck.mismatches.some((m) => m.includes("pareto"))).toBe(true);
  });

  test("invalid axes fail at admission and at eval", async () => {
    const store = new MemoryStore();
    const cheap = metered("cheap", "qwen-flash", { route: ["billing"] }, CHEAP);
    const oneCase = [cases[0]!];
    const oneSystem = [{ id: "a", manifest: single, executors: [cheap] }];
    const expr = (program: JsonValue) => ({ contract: "algal.expr.v1" as const, program });
    // unbound name: static check fails before any run
    await expect(
      runBenchmark({
        fns: builtinRegistry(),
        store,
        cases: oneCase,
        axes: [{ name: "x", dir: "up", expr: expr(["get", "bogus"]) }],
        systems: oneSystem,
      }),
    ).rejects.toMatchObject({ code: "AXIS_INVALID" });
    // nonnumeric result: fails at eval, after the runs complete
    await expect(
      runBenchmark({
        fns: builtinRegistry(),
        store,
        cases: oneCase,
        axes: [{ name: "x", dir: "up", expr: expr(["get", "manifestKey"]) }],
        systems: oneSystem,
      }),
    ).rejects.toMatchObject({ code: "AXIS_INVALID" });
    // duplicate names
    await expect(
      runBenchmark({
        fns: builtinRegistry(),
        store,
        cases: oneCase,
        axes: [
          { name: "x", dir: "up", expr: expr(["get", "passed"]) },
          { name: "x", dir: "down", expr: expr(["get", "effectCalls"]) },
        ],
        systems: oneSystem,
      }),
    ).rejects.toThrow(/duplicate bench axis/);
    // empty and oversized lists
    await expect(
      runBenchmark({ fns: builtinRegistry(), store, cases: oneCase, axes: [], systems: oneSystem }),
    ).rejects.toThrow(/non-empty/);
    await expect(
      runBenchmark({
        fns: builtinRegistry(),
        store,
        cases: oneCase,
        axes: Array.from({ length: 9 }, (_, i) => ({
          name: `a${i}`,
          dir: "up" as const,
          expr: expr(["get", "passed"]),
        })),
        systems: oneSystem,
      }),
    ).rejects.toThrow(/at most 8/);
  });

  test("axisValues and axes must agree in a parsed report", async () => {
    const { report } = await bench();
    // a report that records axisValues without declaring axes fails parse
    const stray = JSON.parse(canonicalize(report as unknown as JsonValue)) as {
      systems: Record<string, JsonValue>[];
    };
    stray.systems[0]!.axisValues = { quality: 3 };
    expect(() => parseBenchReport(stray)).toThrow(/requires bench\.axes/);
    // and axes without the recorded values fail too
    const missing = JSON.parse(canonicalize(report as unknown as JsonValue)) as Record<string, JsonValue>;
    missing.axes = [
      {
        name: "quality",
        dir: "up",
        expr: { contract: "algal.expr.v1", program: ["get", "passed"] },
      },
    ];
    expect(() => parseBenchReport(missing)).toThrow(/required by bench\.axes/);
  });

  test("invalid scorers fail at admission and at eval", async () => {
    const store = new MemoryStore();
    const cheap = metered("cheap", "qwen-flash", { route: ["billing"] }, CHEAP);
    const oneCase = [cases[0]!];
    // unbound name: static check fails before any run
    await expect(
      runBenchmark({
        fns: builtinRegistry(),
        store,
        cases: oneCase,
        scorer: { contract: "algal.expr.v1", program: ["eq", ["get", "bogus"], true] },
        systems: [{ id: "a", manifest: single, executors: [cheap] }],
      }),
    ).rejects.toMatchObject({ code: "SCORER_INVALID" });
    // non-boolean result: fails at eval, mid-run
    await expect(
      runBenchmark({
        fns: builtinRegistry(),
        store,
        cases: oneCase,
        scorer: { contract: "algal.expr.v1", program: ["get", "outputs", "out"] },
        systems: [{ id: "a", manifest: single, executors: [cheap] }],
      }),
    ).rejects.toMatchObject({ code: "SCORER_INVALID" });
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
