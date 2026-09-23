// Benchmark evaluation: one workload, several systems, quality/cost evidence.
// A system is an admitted organism plus a host-resolved executor list — a
// cheap single call, a frontier single call, and a decomposed circuit are
// all just systems. Every case result is a replayable run receipt, so the
// report is a content-addressed claim about a Pareto comparison, not a
// leaderboard screenshot. There is no promotion here and no split: a bench
// measures, the foundry selects.

import type { OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { EffectReceipt, Executor } from "./effects";
import { AlgalError } from "./errors";
import {
  checkProgram,
  evalAxis,
  evalScorer,
  type ExprEnvelope,
  type ExprScorer,
} from "./expr";
import type { FnRegistry } from "./registry";
import { runOrganism, type RunOutcome } from "./run";
import type { Store } from "./store";
import type { Transport } from "./transport";
import type { ToolRegistry } from "./tools";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

export const BENCH_CONTRACT = "algal.bench.v1" as const;

export const BENCH_BOUNDS = {
  maxSystems: 8,
  maxCases: 256,
  maxIdLen: 64,
  maxAxes: 8,
} as const;

/** A pareto axis: an `algal.expr.v1` program evaluated once per system
 * over the system's aggregate record — the comparison criteria as data.
 * `dir` is which direction wins ("up" = bigger is better). */
export type BenchAxis = {
  name: string;
  dir: "up" | "down";
  expr: ExprEnvelope;
};

/** The aggregate fields an axis program may read — the same record a
 * system result carries, minus the case list. */
export const BENCH_AXIS_NAMES = [
  "id",
  "manifestKey",
  "manifestDigest",
  "passed",
  "total",
  "effectCalls",
  "work",
  "usage",
  "attribution",
] as const;

export type BenchCase = {
  id: string;
  args: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
};

export type BenchSystem = {
  id: string;
  manifest: OrganismManifest;
  /** Host-resolved executors: the first is the default; named ids are
   * reached through route.provider / route.preset. A cheap-first cascade
   * is a system whose manifest routes escalation cells at a second entry. */
  executors: Executor[];
};

export type BenchPrice = {
  input: number;
  output: number;
};

export type BenchOptions = {
  systems: BenchSystem[];
  cases: BenchCase[];
  fns: FnRegistry;
  store: Store;
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
  /** Optional per-attribution price card, in USD per 1M tokens.
   * Attribution keys are `usage.model` (e.g. "alibaba/qwen3.5-flash")
   * or `effect.executor` for tool/scripted runs. */
  prices?: Record<string, BenchPrice>;
  /** Optional `algal.expr.v1` scorer: replaces exact-match as the pass
   * claim — the same bounded predicate foundry selects under. */
  scorer?: ExprScorer;
  /** Optional pareto axes: replaces the default (passed ↑, cost ↓,
   * effectCalls ↓) dominance criteria with expr programs over each
   * system's aggregates. */
  axes?: BenchAxis[];
};

/** Effect attribution: calls, tokens, and optional cost grouped by the
 * recorded model, or by executor id when no model is reported (tools,
 * scripted runs). */
export type BenchAttribution = {
  calls: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
};

export type BenchCaseResult = {
  id: string;
  passed: boolean;
  outcome: RunOutcome;
  outputs: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
  receiptDigest: Digest;
  effectCalls: number;
  work: { steps: number; agentCalls: number; units: number };
  usage: { tokensIn: number; tokensOut: number; cost: number };
  attribution: Record<string, BenchAttribution>;
};

export type BenchSystemResult = {
  id: string;
  manifestDigest: Digest;
  manifestKey: string;
  passed: number;
  total: number;
  effectCalls: number;
  work: { steps: number; agentCalls: number; units: number };
  usage: { tokensIn: number; tokensOut: number; cost: number };
  attribution: Record<string, BenchAttribution>;
  /** The value each configured axis produced for this system — recorded
   * so the pareto claim is checkable without re-deriving aggregates. */
  axisValues?: Record<string, number>;
  cases: BenchCaseResult[];
};

export type BenchReport = {
  contract: typeof BENCH_CONTRACT;
  /** Digest of the canonical case list — what every system was measured on. */
  workload: Digest;
  /** The full case list, so a verifier needs no config to check provenance. */
  cases: BenchCase[];
  /** Optional USD-per-1M-token price card used to compute `cost`. */
  prices?: Record<string, BenchPrice> | undefined;
  /** The scorer program pass claims were made under, when not exact-match. */
  scorer?: ExprScorer;
  /** The pareto axes dominance was computed under, when not the default. */
  axes?: BenchAxis[];
  systems: BenchSystemResult[];
  /** Non-dominated system ids (passed ↑, cost signal ↓, calls ↓). */
  pareto: string[];
  digest: Digest;
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", message);
}

function ownEntry<T>(map: Record<string, T> | undefined, key: string): T | undefined {
  return map !== undefined && Object.hasOwn(map, key) ? map[key] : undefined;
}

/** Producer and imported-report verification use the same case admission. */
export function benchCaseAdmissionError(manifest: OrganismManifest, c: BenchCase): string | undefined {
  if (!manifest.interface) return `system ${manifest.key} must declare an interface`;
  const { inputs, outputs } = manifest.interface;
  for (const name of Object.keys(c.args)) {
    if (!Object.hasOwn(inputs, name)) return `case ${c.id}: unknown system input "${name}"`;
  }
  for (const name of Object.keys(outputs)) {
    if (!Object.hasOwn(c.expect, name)) return `case ${c.id}: missing expected output "${name}"`;
  }
  for (const name of Object.keys(c.expect)) {
    if (!Object.hasOwn(outputs, name)) return `case ${c.id}: unknown expected output "${name}"`;
  }
  return undefined;
}

function validate(opts: BenchOptions): void {
  if (opts.scorer !== undefined) {
    const c = checkProgram(opts.scorer.program, ["args", "expect", "outputs"]);
    if (!c.ok) {
      throw new AlgalError("SCORER_INVALID", `scorer ${canonicalize(c.err)}`);
    }
  }
  if (opts.axes !== undefined) {
    if (opts.axes.length === 0 || opts.axes.length > BENCH_BOUNDS.maxAxes) {
      fail(`bench axes must be a bounded non-empty list of at most ${BENCH_BOUNDS.maxAxes}`);
    }
    const names = new Set<string>();
    for (const axis of opts.axes) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(axis.name) || axis.name.length > BENCH_BOUNDS.maxIdLen) {
        fail(`invalid bench axis name "${axis.name}"`);
      }
      if (names.has(axis.name)) fail(`duplicate bench axis name "${axis.name}"`);
      names.add(axis.name);
      if (axis.dir !== "up" && axis.dir !== "down") {
        fail(`bench axis "${axis.name}" dir must be "up" or "down"`);
      }
      const c = checkProgram(axis.expr.program, BENCH_AXIS_NAMES);
      if (!c.ok) {
        throw new AlgalError("AXIS_INVALID", `axis "${axis.name}" ${canonicalize(c.err)}`);
      }
    }
  }
  if (opts.systems.length === 0) fail("bench requires at least one system");
  if (opts.systems.length > BENCH_BOUNDS.maxSystems) {
    fail(`bench systems exceed ${BENCH_BOUNDS.maxSystems}`);
  }
  if (opts.cases.length === 0) fail("bench requires at least one case");
  if (opts.cases.length > BENCH_BOUNDS.maxCases) {
    fail(`bench cases exceed ${BENCH_BOUNDS.maxCases}`);
  }
  const caseIds = new Set<string>();
  for (const c of opts.cases) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) || c.id.length > BENCH_BOUNDS.maxIdLen) {
      fail(`invalid bench case id "${c.id}"`);
    }
    if (caseIds.has(c.id)) fail(`duplicate bench case id "${c.id}"`);
    caseIds.add(c.id);
  }
  const systemIds = new Set<string>();
  for (const system of opts.systems) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(system.id) || system.id.length > BENCH_BOUNDS.maxIdLen) {
      fail(`invalid bench system id "${system.id}"`);
    }
    if (systemIds.has(system.id)) fail(`duplicate bench system id "${system.id}"`);
    systemIds.add(system.id);
    if (system.executors.length === 0) {
      fail(`bench system "${system.id}" requires at least one executor`);
    }
    if (!system.manifest.interface) {
      fail(`bench system "${system.id}" manifest must declare an interface`);
    }
    for (const c of opts.cases) {
      const error = benchCaseAdmissionError(system.manifest, c);
      if (error) fail(error);
    }
  }
}

function caseArgs(
  manifest: OrganismManifest,
  c: BenchCase,
): Record<string, Record<string, JsonValue>> {
  const args: Record<string, Record<string, JsonValue>> = Object.create(null) as Record<string, Record<string, JsonValue>>;
  // Admitted names are ASCII; canonical key order resolves aliased targets.
  for (const name of Object.keys(c.args).sort()) {
    const value = c.args[name]!;
    const target = manifest.interface!.inputs[name]!;
    (args[target.cell] ??= Object.create(null) as Record<string, JsonValue>)[target.port] = value;
  }
  return args;
}

function costFor(
  price: BenchPrice | undefined,
  tokensIn: number,
  tokensOut: number,
): number {
  if (!price) return 0;
  return (tokensIn * price.input + tokensOut * price.output) / 1_000_000;
}

function attribute(
  effects: EffectReceipt[],
  prices?: Record<string, BenchPrice>,
): {
  usage: { tokensIn: number; tokensOut: number; cost: number };
  attribution: Record<string, BenchAttribution>;
} {
  const attribution: Record<string, BenchAttribution> = Object.create(null) as Record<string, BenchAttribution>;
  const usage = { tokensIn: 0, tokensOut: 0, cost: 0 };
  for (const effect of effects) {
    const key = effect.usage?.model ?? effect.executor;
    const entry = (attribution[key] ??= {
      calls: 0,
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
    });
    entry.calls += 1;
    const tokensIn = effect.usage?.tokensIn ?? 0;
    const tokensOut = effect.usage?.tokensOut ?? 0;
    entry.tokensIn += tokensIn;
    entry.tokensOut += tokensOut;
    const extraCost = costFor(ownEntry(prices, key), tokensIn, tokensOut);
    entry.cost += extraCost;
    usage.tokensIn += tokensIn;
    usage.tokensOut += tokensOut;
    usage.cost += extraCost;
  }
  return { usage, attribution };
}

function mergeAttribution(
  into: Record<string, BenchAttribution>,
  from: Record<string, BenchAttribution>,
): void {
  for (const [key, value] of Object.entries(from)) {
    const entry = (into[key] ??= { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 });
    entry.calls += value.calls;
    entry.tokensIn += value.tokensIn;
    entry.tokensOut += value.tokensOut;
    entry.cost += value.cost;
  }
}

async function evaluateCase(
  system: BenchSystem,
  c: BenchCase,
  opts: BenchOptions,
): Promise<BenchCaseResult> {
  const receipt = await runOrganism({
    manifest: system.manifest,
    args: caseArgs(system.manifest, c),
    fns: opts.fns,
    store: opts.store,
    executors: system.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
  });
  const receiptDigest = await opts.store.putReceipt(receipt as unknown as JsonValue);
  const outputs: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  for (const [name, source] of Object.entries(system.manifest.interface!.outputs)) {
    const value = ownEntry(ownEntry(receipt.cells, source.cell)?.outputs, source.port);
    if (value !== undefined) outputs[name] = value;
  }
  const { usage, attribution } = attribute(receipt.effects, opts.prices);
  return {
    id: c.id,
    passed: receipt.outcome === "complete" && (opts.scorer !== undefined
      ? evalScorer(opts.scorer, c, outputs)
      : canonicalize(outputs) === canonicalize(c.expect)),
    outcome: receipt.outcome,
    outputs,
    expect: c.expect,
    receiptDigest,
    effectCalls: receipt.effects.length,
    work: receipt.work,
    usage,
    attribution,
  };
}

/** Non-dominated ids over an axis matrix: `dirs[k]` says which direction
 * is better on axis k, `rows[i]` is system `ids[i]`'s axis values. A row
 * is dominated when another is at least as good on every axis (per dir)
 * and strictly better on one. Survivors sort by the axes in order, then
 * id — deterministic. */
function dominancePareto(
  ids: string[],
  dirs: readonly ("up" | "down")[],
  rows: number[][],
): string[] {
  const atLeast = (a: number, b: number, dir: "up" | "down") =>
    dir === "up" ? a >= b : a <= b;
  const better = (a: number, b: number, dir: "up" | "down") =>
    dir === "up" ? a > b : a < b;
  const kept = ids
    .map((id, i) => ({ id, row: rows[i]! }))
    .filter(
      ({ row }) =>
        !rows.some(
          (other) =>
            other !== row &&
            other.every((v, k) => atLeast(v, row[k]!, dirs[k]!)) &&
            other.some((v, k) => better(v, row[k]!, dirs[k]!)),
        ),
    );
  kept.sort((a, b) => {
    for (let k = 0; k < dirs.length; k++) {
      const d =
        dirs[k] === "up" ? b.row[k]! - a.row[k]! : a.row[k]! - b.row[k]!;
      if (d !== 0) return d;
    }
    return a.id.localeCompare(b.id);
  });
  return kept.map((e) => e.id);
}

/** Non-dominated systems on (passed ↑, cost signal ↓, effect calls ↓).
 * The cost signal is the dollar `cost` when prices were supplied,
 * otherwise total token count. The default axis triple, computed through
 * the same dominance machinery configured axes use. */
export function benchPareto(
  systems: BenchSystemResult[],
  hasPrices = false,
): string[] {
  const tokens = (s: BenchSystemResult) => s.usage.tokensIn + s.usage.tokensOut;
  const cost = (s: BenchSystemResult) => (hasPrices ? s.usage.cost : tokens(s));
  return dominancePareto(
    systems.map((s) => s.id),
    ["up", "down", "down"],
    systems.map((s) => [s.passed, cost(s), s.effectCalls]),
  );
}

/** The aggregate record an axis program sees — the system result minus
 * its case list, matching BENCH_AXIS_NAMES. Exported so verification
 * rebuilds the identical environment from a parsed report. */
export function benchAxisEnv(s: BenchSystemResult): JsonObject {
  return {
    id: s.id,
    manifestKey: s.manifestKey,
    manifestDigest: s.manifestDigest,
    passed: s.passed,
    total: s.total,
    effectCalls: s.effectCalls,
    work: s.work as unknown as JsonObject,
    usage: s.usage as unknown as JsonObject,
    attribution: s.attribution as unknown as JsonObject,
  };
}

/** Pareto under configured axes: every axis evaluates once per system and
 * the recorded axisValues are what dominance ran on. Exported so
 * verification recomputes the same claim. */
export function axesPareto(
  systems: BenchSystemResult[],
  axes: BenchAxis[],
): string[] {
  return dominancePareto(
    systems.map((s) => s.id),
    axes.map((a) => a.dir),
    systems.map((s) => axes.map((a) => s.axisValues![a.name]!)),
  );
}

export async function runBenchmark(opts: BenchOptions): Promise<BenchReport> {
  validate(opts);
  const systems: BenchSystemResult[] = [];
  for (const system of opts.systems) {
    const manifestDigest = await opts.store.putManifest(system.manifest);
    const cases: BenchCaseResult[] = [];
    for (const c of opts.cases) cases.push(await evaluateCase(system, c, opts));
    const attribution: Record<string, BenchAttribution> = Object.create(null) as Record<string, BenchAttribution>;
    for (const c of cases) mergeAttribution(attribution, c.attribution);
    systems.push({
      id: system.id,
      manifestDigest,
      manifestKey: system.manifest.key,
      passed: cases.filter((c) => c.passed).length,
      total: cases.length,
      effectCalls: cases.reduce((t, c) => t + c.effectCalls, 0),
      work: cases.reduce(
        (t, c) => ({
          steps: t.steps + c.work.steps,
          agentCalls: t.agentCalls + c.work.agentCalls,
          units: t.units + c.work.units,
        }),
        { steps: 0, agentCalls: 0, units: 0 },
      ),
      usage: cases.reduce(
        (t, c) => ({
          tokensIn: t.tokensIn + c.usage.tokensIn,
          tokensOut: t.tokensOut + c.usage.tokensOut,
          cost: t.cost + c.usage.cost,
        }),
        { tokensIn: 0, tokensOut: 0, cost: 0 },
      ),
      attribution,
      cases,
    });
  }
  if (opts.axes !== undefined) {
    for (const s of systems) {
      const values: Record<string, number> = {};
      const env = benchAxisEnv(s);
      for (const axis of opts.axes) {
        values[axis.name] = evalAxis(axis.expr.program, env);
      }
      s.axisValues = values;
    }
  }
  const base: Omit<BenchReport, "digest"> = {
    contract: BENCH_CONTRACT,
    workload: digestCanonical(opts.cases as unknown as JsonValue),
    cases: opts.cases,
    systems,
    pareto: opts.axes !== undefined
      ? axesPareto(systems, opts.axes)
      : benchPareto(systems, opts.prices !== undefined),
  };
  if (opts.prices !== undefined) base.prices = opts.prices;
  if (opts.scorer !== undefined) base.scorer = opts.scorer;
  if (opts.axes !== undefined) base.axes = opts.axes;
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}
