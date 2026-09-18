import { manifestToJson } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { MorphogenError } from "./errors";
import {
  BENCH_BOUNDS,
  BENCH_CONTRACT,
  benchPareto,
  type BenchAttribution,
  type BenchCase,
  type BenchCaseResult,
  type BenchReport,
  type BenchSystemResult,
} from "./bench";
import type { FnRegistry } from "./registry";
import { parseRunReceipt } from "./run";
import type { Store } from "./store";
import type { ToolRegistry } from "./tools";
import { verifyReceipt } from "./verify";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

function object(value: unknown, at: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new MorphogenError("PARSE_FAILED", `${at} must be an object`);
  }
  return value as JsonObject;
}

function keys(value: JsonObject, allowed: string[], at: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra) throw new MorphogenError("PARSE_FAILED", `${at}: unknown key "${extra}"`);
}

function text(value: JsonValue | undefined, at: string): string {
  if (typeof value !== "string") throw new MorphogenError("PARSE_FAILED", `${at} must be text`);
  return value;
}

function id(value: JsonValue | undefined, at: string): string {
  const parsed = text(value, at);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed) || parsed.length > BENCH_BOUNDS.maxIdLen) {
    throw new MorphogenError("PARSE_FAILED", `${at} is not a valid id`);
  }
  return parsed;
}

function digest(value: JsonValue | undefined, at: string): Digest {
  const parsed = text(value, at);
  if (!/^sha256:[0-9a-f]{64}$/.test(parsed)) {
    throw new MorphogenError("PARSE_FAILED", `${at} must be a sha256 digest`);
  }
  return parsed as Digest;
}

function count(value: JsonValue | undefined, at: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new MorphogenError("PARSE_FAILED", `${at} must be a non-negative integer`);
  }
  return value as number;
}

function parseWork(value: JsonValue | undefined, at: string) {
  const work = object(value, at);
  keys(work, ["steps", "agentCalls", "units"], at);
  return {
    steps: count(work.steps, `${at}.steps`),
    agentCalls: count(work.agentCalls, `${at}.agentCalls`),
    units: count(work.units, `${at}.units`),
  };
}

function parseUsage(value: JsonValue | undefined, at: string) {
  const usage = object(value, at);
  keys(usage, ["tokensIn", "tokensOut"], at);
  return {
    tokensIn: count(usage.tokensIn, `${at}.tokensIn`),
    tokensOut: count(usage.tokensOut, `${at}.tokensOut`),
  };
}

function parseAttribution(value: JsonValue | undefined, at: string): Record<string, BenchAttribution> {
  const map = object(value, at);
  const out: Record<string, BenchAttribution> = {};
  for (const [key, raw] of Object.entries(map)) {
    if (key.length === 0 || key.length > 256) {
      throw new MorphogenError("PARSE_FAILED", `${at} has an invalid attribution key`);
    }
    const entry = object(raw, `${at}.${key}`);
    keys(entry, ["calls", "tokensIn", "tokensOut"], `${at}.${key}`);
    out[key] = {
      calls: count(entry.calls, `${at}.${key}.calls`),
      tokensIn: count(entry.tokensIn, `${at}.${key}.tokensIn`),
      tokensOut: count(entry.tokensOut, `${at}.${key}.tokensOut`),
    };
  }
  return out;
}

function parseBenchCase(value: JsonValue, at: string): BenchCase {
  const c = object(value, at);
  keys(c, ["id", "args", "expect"], at);
  return {
    id: id(c.id, `${at}.id`),
    args: object(c.args, `${at}.args`),
    expect: object(c.expect, `${at}.expect`),
  };
}

function parseCaseResult(value: JsonValue, at: string): BenchCaseResult {
  const c = object(value, at);
  keys(c, ["id", "passed", "outcome", "outputs", "expect", "receiptDigest", "effectCalls", "work", "usage", "attribution"], at);
  const outcome = text(c.outcome, `${at}.outcome`);
  if (outcome !== "complete" && outcome !== "failed" && outcome !== "stuck") {
    throw new MorphogenError("PARSE_FAILED", `${at}.outcome is invalid`);
  }
  if (typeof c.passed !== "boolean") {
    throw new MorphogenError("PARSE_FAILED", `${at}.passed must be boolean`);
  }
  return {
    id: id(c.id, `${at}.id`),
    passed: c.passed,
    outcome,
    outputs: object(c.outputs, `${at}.outputs`),
    expect: object(c.expect, `${at}.expect`),
    receiptDigest: digest(c.receiptDigest, `${at}.receiptDigest`),
    effectCalls: count(c.effectCalls, `${at}.effectCalls`),
    work: parseWork(c.work, `${at}.work`),
    usage: parseUsage(c.usage, `${at}.usage`),
    attribution: parseAttribution(c.attribution, `${at}.attribution`),
  };
}

function parseSystem(value: JsonValue, i: number): BenchSystemResult {
  const at = `bench.systems[${i}]`;
  const s = object(value, at);
  keys(s, ["id", "manifestDigest", "manifestKey", "passed", "total", "effectCalls", "work", "usage", "attribution", "cases"], at);
  const total = count(s.total, `${at}.total`);
  const passed = count(s.passed, `${at}.passed`);
  if (total === 0 || passed > total) {
    throw new MorphogenError("PARSE_FAILED", `${at} is not a valid score`);
  }
  if (!Array.isArray(s.cases) || s.cases.length !== total || s.cases.length > BENCH_BOUNDS.maxCases) {
    throw new MorphogenError("PARSE_FAILED", `${at}.cases must match its total`);
  }
  return {
    id: id(s.id, `${at}.id`),
    manifestDigest: digest(s.manifestDigest, `${at}.manifestDigest`),
    manifestKey: text(s.manifestKey, `${at}.manifestKey`),
    passed,
    total,
    effectCalls: count(s.effectCalls, `${at}.effectCalls`),
    work: parseWork(s.work, `${at}.work`),
    usage: parseUsage(s.usage, `${at}.usage`),
    attribution: parseAttribution(s.attribution, `${at}.attribution`),
    cases: s.cases.map((entry, j) => parseCaseResult(entry, `${at}.cases[${j}]`)),
  };
}

export function parseBenchReport(value: unknown): BenchReport {
  const report = object(value, "bench");
  keys(report, ["contract", "workload", "cases", "systems", "pareto", "digest"], "bench");
  if (report.contract !== BENCH_CONTRACT) {
    throw new MorphogenError("PARSE_FAILED", `bench.contract must be ${BENCH_CONTRACT}`);
  }
  if (!Array.isArray(report.cases) || report.cases.length === 0 || report.cases.length > BENCH_BOUNDS.maxCases) {
    throw new MorphogenError("PARSE_FAILED", "bench.cases must be a bounded non-empty list");
  }
  if (!Array.isArray(report.systems) || report.systems.length === 0 || report.systems.length > BENCH_BOUNDS.maxSystems) {
    throw new MorphogenError("PARSE_FAILED", "bench.systems must be a bounded non-empty list");
  }
  if (!Array.isArray(report.pareto) || report.pareto.length > BENCH_BOUNDS.maxSystems) {
    throw new MorphogenError("PARSE_FAILED", "bench.pareto must be a bounded list");
  }
  const systems = report.systems.map(parseSystem);
  const ids = new Set(systems.map((s) => s.id));
  const pareto = report.pareto.map((entry, i) => {
    const parsed = id(entry as JsonValue, `bench.pareto[${i}]`);
    if (!ids.has(parsed)) {
      throw new MorphogenError("PARSE_FAILED", `bench.pareto[${i}] names an unknown system`);
    }
    return parsed;
  });
  if (new Set(pareto).size !== pareto.length) {
    throw new MorphogenError("PARSE_FAILED", "bench.pareto contains duplicates");
  }
  return {
    contract: BENCH_CONTRACT,
    workload: digest(report.workload, "bench.workload"),
    cases: report.cases.map((entry, i) => parseBenchCase(entry, `bench.cases[${i}]`)),
    systems,
    pareto,
    digest: digest(report.digest, "bench.digest"),
  };
}

export type BenchVerifyReport = {
  ok: boolean;
  digest: Digest;
  checkedReceipts: number;
  mismatches: string[];
};

export async function verifyBenchReport(
  value: unknown,
  store: Store,
  fns: FnRegistry,
  tools?: ToolRegistry,
): Promise<BenchVerifyReport> {
  const report = parseBenchReport(value);
  const mismatches: string[] = [];
  const { digest: claimed, ...base } = report;
  const actual = digestCanonical(base as unknown as JsonValue);
  if (actual !== claimed) mismatches.push(`digest: claimed ${claimed}, computed ${actual}`);
  const workload = digestCanonical(report.cases as unknown as JsonValue);
  if (workload !== report.workload) {
    mismatches.push(`workload: claimed ${report.workload}, computed ${workload}`);
  }
  if (canonicalize(report.pareto as unknown as JsonValue) !== canonicalize(benchPareto(report.systems) as unknown as JsonValue)) {
    mismatches.push("pareto does not match the system totals");
  }
  const caseIds = new Set<string>();
  for (const c of report.cases) {
    if (caseIds.has(c.id)) mismatches.push(`duplicate case id "${c.id}"`);
    caseIds.add(c.id);
  }
  const casesById = new Map(report.cases.map((c) => [c.id, c]));
  const systemIds = new Set<string>();
  let checkedReceipts = 0;
  for (const system of report.systems) {
    if (systemIds.has(system.id)) mismatches.push(`duplicate system id "${system.id}"`);
    systemIds.add(system.id);
    const manifest = await store.getManifest(system.manifestDigest);
    if (!manifest) {
      mismatches.push(`${system.id}: manifest ${system.manifestDigest} missing`);
      continue;
    }
    if (!manifest.interface) {
      mismatches.push(`${system.id}: manifest has no interface`);
    }
    const passed = system.cases.filter((c) => c.passed).length;
    if (passed !== system.passed) mismatches.push(`${system.id}: passed does not match its cases`);
    if (system.cases.length !== report.cases.length) {
      mismatches.push(`${system.id}: case count differs from the workload`);
    }
    const work = { steps: 0, agentCalls: 0, units: 0 };
    const usage = { tokensIn: 0, tokensOut: 0 };
    const attribution: Record<string, BenchAttribution> = {};
    let effectCalls = 0;
    for (const c of system.cases) {
      const benchCase = casesById.get(c.id);
      if (!benchCase) {
        mismatches.push(`${system.id}: case "${c.id}" is not in the workload`);
        continue;
      }
      if (canonicalize(c.expect) !== canonicalize(benchCase.expect)) {
        mismatches.push(`${system.id} case ${c.id}: expect differs from the workload`);
      }
      const expectedPass = c.outcome === "complete" && canonicalize(c.outputs) === canonicalize(c.expect);
      if (c.passed !== expectedPass) {
        mismatches.push(`${system.id} case ${c.id}: invalid pass claim`);
      }
      work.steps += c.work.steps;
      work.agentCalls += c.work.agentCalls;
      work.units += c.work.units;
      usage.tokensIn += c.usage.tokensIn;
      usage.tokensOut += c.usage.tokensOut;
      effectCalls += c.effectCalls;
      for (const [key, value] of Object.entries(c.attribution)) {
        const entry = (attribution[key] ??= { calls: 0, tokensIn: 0, tokensOut: 0 });
        entry.calls += value.calls;
        entry.tokensIn += value.tokensIn;
        entry.tokensOut += value.tokensOut;
      }
      const stored = await store.getReceipt(c.receiptDigest);
      if (!stored) {
        mismatches.push(`${system.id} case ${c.id}: receipt ${c.receiptDigest} missing`);
        continue;
      }
      const receipt = parseRunReceipt(stored);
      if (receipt.manifestDigest !== system.manifestDigest) {
        mismatches.push(`${system.id} case ${c.id}: receipt ran ${receipt.manifestDigest}`);
        continue;
      }
      if (receipt.outcome !== c.outcome) {
        mismatches.push(`${system.id} case ${c.id}: outcome differs from receipt`);
      }
      if (manifest.interface) {
        const outputs: Record<string, JsonValue> = {};
        for (const [name, source] of Object.entries(manifest.interface.outputs)) {
          const value = receipt.cells[source.cell]?.outputs?.[source.port];
          if (value !== undefined) outputs[name] = value;
        }
        if (canonicalize(outputs) !== canonicalize(c.outputs)) {
          mismatches.push(`${system.id} case ${c.id}: outputs differ from receipt`);
        }
        const expectedArgs: Record<string, Record<string, JsonValue>> = {};
        for (const [name, value] of Object.entries(benchCase.args)) {
          const target = manifest.interface.inputs[name];
          if (!target) {
            mismatches.push(`${system.id} case ${c.id}: unknown workload input "${name}"`);
            continue;
          }
          (expectedArgs[target.cell] ??= {})[target.port] = value;
        }
        if (canonicalize(receipt.args as unknown as JsonValue) !== canonicalize(expectedArgs as unknown as JsonValue)) {
          mismatches.push(`${system.id} case ${c.id}: receipt args differ from the workload`);
        }
      }
      if (canonicalize(receipt.work as unknown as JsonValue) !== canonicalize(c.work as unknown as JsonValue)) {
        mismatches.push(`${system.id} case ${c.id}: work differs from receipt`);
      }
      if (receipt.effects.length !== c.effectCalls) {
        mismatches.push(`${system.id} case ${c.id}: effectCalls differs from receipt`);
      }
      const receiptUsage = { tokensIn: 0, tokensOut: 0 };
      const receiptAttribution: Record<string, BenchAttribution> = {};
      for (const effect of receipt.effects) {
        const key = effect.usage?.model ?? effect.executor;
        const entry = (receiptAttribution[key] ??= { calls: 0, tokensIn: 0, tokensOut: 0 });
        entry.calls += 1;
        const tokensIn = effect.usage?.tokensIn ?? 0;
        const tokensOut = effect.usage?.tokensOut ?? 0;
        entry.tokensIn += tokensIn;
        entry.tokensOut += tokensOut;
        receiptUsage.tokensIn += tokensIn;
        receiptUsage.tokensOut += tokensOut;
      }
      if (canonicalize(receiptUsage as unknown as JsonValue) !== canonicalize(c.usage as unknown as JsonValue)) {
        mismatches.push(`${system.id} case ${c.id}: usage differs from receipt`);
      }
      if (canonicalize(receiptAttribution as unknown as JsonValue) !== canonicalize(c.attribution as unknown as JsonValue)) {
        mismatches.push(`${system.id} case ${c.id}: attribution differs from receipt`);
      }
      const verified = await verifyReceipt(
        receipt,
        manifestToJson(manifest),
        store,
        fns,
        undefined,
        tools,
      );
      checkedReceipts++;
      if (!verified.ok) {
        mismatches.push(`${system.id} case ${c.id}: ${verified.mismatches.join("; ")}`);
      }
    }
    if (canonicalize(work as unknown as JsonValue) !== canonicalize(system.work as unknown as JsonValue)) {
      mismatches.push(`${system.id}: work does not match its cases`);
    }
    if (canonicalize(usage as unknown as JsonValue) !== canonicalize(system.usage as unknown as JsonValue)) {
      mismatches.push(`${system.id}: usage does not match its cases`);
    }
    if (canonicalize(attribution as unknown as JsonValue) !== canonicalize(system.attribution as unknown as JsonValue)) {
      mismatches.push(`${system.id}: attribution does not match its cases`);
    }
    if (effectCalls !== system.effectCalls) {
      mismatches.push(`${system.id}: effectCalls does not match its cases`);
    }
  }
  return { ok: mismatches.length === 0, digest: claimed, checkedReceipts, mismatches };
}
