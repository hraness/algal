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
import { MorphogenError } from "./errors";
import type { FnRegistry } from "./registry";
import { runOrganism } from "./run";
import type { Store } from "./store";
import type { Transport } from "./transport";
import type { ToolRegistry } from "./tools";
import { canonicalize, type JsonValue } from "./values";

export const BENCH_CONTRACT = "morphogen.bench.v1" as const;

export const BENCH_BOUNDS = {
  maxSystems: 8,
  maxCases: 256,
  maxIdLen: 64,
} as const;

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

export type BenchOptions = {
  systems: BenchSystem[];
  cases: BenchCase[];
  fns: FnRegistry;
  store: Store;
  transports?: Record<string, Transport>;
  tools?: ToolRegistry;
};

/** Effect attribution: calls and tokens grouped by the recorded model, or
 * by executor id when the effect reports no model (tools, scripted runs). */
export type BenchAttribution = {
  calls: number;
  tokensIn: number;
  tokensOut: number;
};

export type BenchCaseResult = {
  id: string;
  passed: boolean;
  outcome: "complete" | "failed" | "stuck";
  outputs: Record<string, JsonValue>;
  expect: Record<string, JsonValue>;
  receiptDigest: Digest;
  effectCalls: number;
  work: { steps: number; agentCalls: number; units: number };
  usage: { tokensIn: number; tokensOut: number };
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
  usage: { tokensIn: number; tokensOut: number };
  attribution: Record<string, BenchAttribution>;
  cases: BenchCaseResult[];
};

export type BenchReport = {
  contract: typeof BENCH_CONTRACT;
  /** Digest of the canonical case list — what every system was measured on. */
  workload: Digest;
  /** The full case list, so a verifier needs no config to check provenance. */
  cases: BenchCase[];
  systems: BenchSystemResult[];
  /** Non-dominated system ids on (passed ↑, total tokens ↓, effect
   * calls ↓), sorted by passed desc then tokens asc then calls asc. */
  pareto: string[];
  digest: Digest;
};

function fail(message: string): never {
  throw new MorphogenError("PARSE_FAILED", message);
}

function validate(opts: BenchOptions): void {
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
    const inputs = new Set(Object.keys(system.manifest.interface.inputs));
    const outputs = new Set(Object.keys(system.manifest.interface.outputs));
    for (const c of opts.cases) {
      for (const name of Object.keys(c.args)) {
        if (!inputs.has(name)) fail(`case ${c.id}: unknown system input "${name}"`);
      }
      for (const name of outputs) {
        if (!(name in c.expect)) fail(`case ${c.id}: missing expected output "${name}"`);
      }
      for (const name of Object.keys(c.expect)) {
        if (!outputs.has(name)) fail(`case ${c.id}: unknown expected output "${name}"`);
      }
    }
  }
}

function caseArgs(
  manifest: OrganismManifest,
  c: BenchCase,
): Record<string, Record<string, JsonValue>> {
  const args: Record<string, Record<string, JsonValue>> = {};
  for (const [name, value] of Object.entries(c.args)) {
    const target = manifest.interface!.inputs[name]!;
    (args[target.cell] ??= {})[target.port] = value;
  }
  return args;
}

function attribute(effects: EffectReceipt[]): {
  usage: { tokensIn: number; tokensOut: number };
  attribution: Record<string, BenchAttribution>;
} {
  const attribution: Record<string, BenchAttribution> = {};
  const usage = { tokensIn: 0, tokensOut: 0 };
  for (const effect of effects) {
    const key = effect.usage?.model ?? effect.executor;
    const entry = (attribution[key] ??= { calls: 0, tokensIn: 0, tokensOut: 0 });
    entry.calls += 1;
    const tokensIn = effect.usage?.tokensIn ?? 0;
    const tokensOut = effect.usage?.tokensOut ?? 0;
    entry.tokensIn += tokensIn;
    entry.tokensOut += tokensOut;
    usage.tokensIn += tokensIn;
    usage.tokensOut += tokensOut;
  }
  return { usage, attribution };
}

function mergeAttribution(
  into: Record<string, BenchAttribution>,
  from: Record<string, BenchAttribution>,
): void {
  for (const [key, value] of Object.entries(from)) {
    const entry = (into[key] ??= { calls: 0, tokensIn: 0, tokensOut: 0 });
    entry.calls += value.calls;
    entry.tokensIn += value.tokensIn;
    entry.tokensOut += value.tokensOut;
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
  const outputs: Record<string, JsonValue> = {};
  for (const [name, source] of Object.entries(system.manifest.interface!.outputs)) {
    const value = receipt.cells[source.cell]?.outputs?.[source.port];
    if (value !== undefined) outputs[name] = value;
  }
  const { usage, attribution } = attribute(receipt.effects);
  return {
    id: c.id,
    passed: receipt.outcome === "complete" && canonicalize(outputs) === canonicalize(c.expect),
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

/** Non-dominated systems on (passed ↑, total tokens ↓, effect calls ↓).
 * A system is dominated when another is at least as good on all three
 * axes and strictly better on one — deterministic, ties broken by id.
 * Scripted runs report no tokens, so effect calls carry the cost signal
 * that live runs would attribute to providers. */
export function benchPareto(systems: BenchSystemResult[]): string[] {
  const tokens = (s: BenchSystemResult) => s.usage.tokensIn + s.usage.tokensOut;
  const calls = (s: BenchSystemResult) => s.effectCalls;
  const kept = systems.filter(
    (s) =>
      !systems.some(
        (o) =>
          o.id !== s.id &&
          o.passed >= s.passed &&
          tokens(o) <= tokens(s) &&
          calls(o) <= calls(s) &&
          (o.passed > s.passed || tokens(o) < tokens(s) || calls(o) < calls(s)),
      ),
  );
  return kept
    .sort(
      (a, b) =>
        b.passed - a.passed ||
        tokens(a) - tokens(b) ||
        calls(a) - calls(b) ||
        a.id.localeCompare(b.id),
    )
    .map((s) => s.id);
}

export async function runBenchmark(opts: BenchOptions): Promise<BenchReport> {
  validate(opts);
  const systems: BenchSystemResult[] = [];
  for (const system of opts.systems) {
    const manifestDigest = await opts.store.putManifest(system.manifest);
    const cases: BenchCaseResult[] = [];
    for (const c of opts.cases) cases.push(await evaluateCase(system, c, opts));
    const attribution: Record<string, BenchAttribution> = {};
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
        }),
        { tokensIn: 0, tokensOut: 0 },
      ),
      attribution,
      cases,
    });
  }
  const base = {
    contract: BENCH_CONTRACT,
    workload: digestCanonical(opts.cases as unknown as JsonValue),
    cases: opts.cases,
    systems,
    pareto: benchPareto(systems),
  };
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}
