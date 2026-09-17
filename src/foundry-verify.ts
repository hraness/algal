import { manifestToJson } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { MorphogenError } from "./errors";
import {
  FOUNDRY_BOUNDS,
  FOUNDRY_CONTRACT,
  selectFoundryCandidate,
  type FoundryCandidateResult,
  type FoundryCaseResult,
  type FoundryReport,
} from "./foundry";
import type { FnRegistry } from "./registry";
import { parseRunReceipt } from "./run";
import type { Store } from "./store";
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

function parseScore(value: JsonValue | undefined, at: string) {
  const score = object(value, at);
  keys(score, ["passed", "total"], at);
  const parsed = {
    passed: count(score.passed, `${at}.passed`),
    total: count(score.total, `${at}.total`),
  };
  if (parsed.total === 0 || parsed.passed > parsed.total) {
    throw new MorphogenError("PARSE_FAILED", `${at} is not a valid score`);
  }
  return parsed;
}

function parseCase(value: JsonValue, at: string): FoundryCaseResult {
  const c = object(value, at);
  keys(c, ["id", "split", "passed", "outcome", "outputs", "expect", "receiptDigest", "work"], at);
  const split = text(c.split, `${at}.split`);
  const outcome = text(c.outcome, `${at}.outcome`);
  if (split !== "train" && split !== "validation" && split !== "holdout") {
    throw new MorphogenError("PARSE_FAILED", `${at}.split is invalid`);
  }
  if (outcome !== "complete" && outcome !== "failed" && outcome !== "stuck") {
    throw new MorphogenError("PARSE_FAILED", `${at}.outcome is invalid`);
  }
  if (typeof c.passed !== "boolean") {
    throw new MorphogenError("PARSE_FAILED", `${at}.passed must be boolean`);
  }
  return {
    id: text(c.id, `${at}.id`),
    split,
    passed: c.passed,
    outcome,
    outputs: object(c.outputs, `${at}.outputs`),
    expect: object(c.expect, `${at}.expect`),
    receiptDigest: digest(c.receiptDigest, `${at}.receiptDigest`),
    work: parseWork(c.work, `${at}.work`),
  };
}

function parseCandidate(value: JsonValue, i: number): FoundryCandidateResult {
  const at = `foundry.candidates[${i}]`;
  const c = object(value, at);
  keys(c, ["manifestDigest", "manifestKey", "train", "validation", "work", "cases"], at);
  if (!Array.isArray(c.cases) || c.cases.length === 0 || c.cases.length > FOUNDRY_BOUNDS.maxCases) {
    throw new MorphogenError("PARSE_FAILED", `${at}.cases must be a bounded non-empty list`);
  }
  return {
    manifestDigest: digest(c.manifestDigest, `${at}.manifestDigest`),
    manifestKey: text(c.manifestKey, `${at}.manifestKey`),
    train: parseScore(c.train, `${at}.train`),
    validation: parseScore(c.validation, `${at}.validation`),
    work: parseWork(c.work, `${at}.work`),
    cases: c.cases.map((entry, j) => parseCase(entry, `${at}.cases[${j}]`)),
  };
}

export function parseFoundryReport(value: unknown): FoundryReport {
  const report = object(value, "foundry");
  keys(report, ["contract", "candidates", "promoted", "holdout", "lineage", "digest"], "foundry");
  if (report.contract !== FOUNDRY_CONTRACT) {
    throw new MorphogenError("PARSE_FAILED", `foundry.contract must be ${FOUNDRY_CONTRACT}`);
  }
  if (!Array.isArray(report.candidates) || report.candidates.length === 0 || report.candidates.length > FOUNDRY_BOUNDS.maxCandidates) {
    throw new MorphogenError("PARSE_FAILED", "foundry.candidates must be a bounded non-empty list");
  }
  const holdout = object(report.holdout, "foundry.holdout");
  keys(holdout, ["passed", "total", "cases"], "foundry.holdout");
  const holdoutScore = {
    passed: count(holdout.passed, "foundry.holdout.passed"),
    total: count(holdout.total, "foundry.holdout.total"),
  };
  if (holdoutScore.total === 0 || holdoutScore.passed > holdoutScore.total) {
    throw new MorphogenError("PARSE_FAILED", "foundry.holdout is not a valid score");
  }
  if (!Array.isArray(holdout.cases) || holdout.cases.length !== holdoutScore.total) {
    throw new MorphogenError("PARSE_FAILED", "foundry.holdout.cases must match its total");
  }
  const lineage = report.lineage === undefined ? undefined : object(report.lineage, "foundry.lineage");
  if (lineage) keys(lineage, ["generatorDigest", "receiptDigest"], "foundry.lineage");
  return {
    contract: FOUNDRY_CONTRACT,
    candidates: report.candidates.map(parseCandidate),
    promoted: digest(report.promoted, "foundry.promoted"),
    holdout: {
      ...holdoutScore,
      cases: holdout.cases.map((entry, i) => parseCase(entry, `foundry.holdout.cases[${i}]`)),
    },
    ...(lineage ? {
      lineage: {
        generatorDigest: digest(lineage.generatorDigest, "foundry.lineage.generatorDigest"),
        receiptDigest: digest(lineage.receiptDigest, "foundry.lineage.receiptDigest"),
      },
    } : {}),
    digest: digest(report.digest, "foundry.digest"),
  };
}

export type FoundryVerifyReport = {
  ok: boolean;
  digest: Digest;
  checkedReceipts: number;
  mismatches: string[];
};

export async function verifyFoundryReport(
  value: unknown,
  store: Store,
  fns: FnRegistry,
): Promise<FoundryVerifyReport> {
  const report = parseFoundryReport(value);
  const mismatches: string[] = [];
  const { digest: claimed, ...base } = report;
  const actual = digestCanonical(base as unknown as JsonValue);
  if (actual !== claimed) mismatches.push(`digest: claimed ${claimed}, computed ${actual}`);
  if (selectFoundryCandidate(report.candidates) !== report.promoted) {
    mismatches.push("promoted digest is not the deterministic winner");
  }
  const checkScore = (
    label: string,
    cases: FoundryCaseResult[],
    split: FoundryCaseResult["split"],
    claimedScore: { passed: number; total: number },
  ) => {
    const selected = cases.filter((c) => c.split === split);
    const passed = selected.filter((c) => c.passed).length;
    if (selected.length !== claimedScore.total || passed !== claimedScore.passed) {
      mismatches.push(`${label} score does not match its cases`);
    }
    for (const c of selected) {
      const expectedPass = c.outcome === "complete" && canonicalize(c.outputs) === canonicalize(c.expect);
      if (c.passed !== expectedPass) mismatches.push(`${label} case ${c.id} has an invalid pass claim`);
    }
  };
  for (const candidate of report.candidates) {
    checkScore(candidate.manifestKey, candidate.cases, "train", candidate.train);
    checkScore(candidate.manifestKey, candidate.cases, "validation", candidate.validation);
    if (candidate.cases.some((c) => c.split === "holdout")) {
      mismatches.push(`${candidate.manifestKey} exposes holdout results before promotion`);
    }
    const work = candidate.cases.reduce(
      (total, c) => ({
        steps: total.steps + c.work.steps,
        agentCalls: total.agentCalls + c.work.agentCalls,
        units: total.units + c.work.units,
      }),
      { steps: 0, agentCalls: 0, units: 0 },
    );
    if (canonicalize(work as unknown as JsonValue) !== canonicalize(candidate.work as unknown as JsonValue)) {
      mismatches.push(`${candidate.manifestKey} work does not match its cases`);
    }
  }
  checkScore("holdout", report.holdout.cases, "holdout", report.holdout);
  if (report.holdout.cases.some((c) => c.split !== "holdout")) {
    mismatches.push("holdout contains a non-holdout case");
  }
  let checkedReceipts = 0;
  const verifyCases = async (
    manifestDigest: Digest,
    cases: FoundryCaseResult[],
    verifyClaims = true,
  ) => {
    const manifest = await store.getManifest(manifestDigest);
    if (!manifest) {
      mismatches.push(`manifest ${manifestDigest} missing`);
      return;
    }
    for (const c of cases) {
      const stored = await store.getReceipt(c.receiptDigest);
      if (!stored) {
        mismatches.push(`receipt ${c.receiptDigest} missing`);
        continue;
      }
      const receipt = parseRunReceipt(stored);
      if (receipt.manifestDigest !== manifestDigest) {
        mismatches.push(`receipt ${c.receiptDigest} ran ${receipt.manifestDigest}, expected ${manifestDigest}`);
        continue;
      }
      if (verifyClaims) {
        const outputs: Record<string, JsonValue> = {};
        for (const [name, source] of Object.entries(manifest.interface?.outputs ?? {})) {
          const output = receipt.cells[source.cell]?.outputs?.[source.port];
          if (output !== undefined) outputs[name] = output;
        }
        if (receipt.outcome !== c.outcome) mismatches.push(`case ${c.id}: outcome differs from receipt`);
        if (canonicalize(outputs) !== canonicalize(c.outputs)) {
          mismatches.push(`case ${c.id}: outputs differ from receipt`);
        }
        if (canonicalize(receipt.work as unknown as JsonValue) !== canonicalize(c.work as unknown as JsonValue)) {
          mismatches.push(`case ${c.id}: work differs from receipt`);
        }
      }
      const verified = await verifyReceipt(receipt, manifestToJson(manifest), store, fns);
      checkedReceipts++;
      if (!verified.ok) mismatches.push(`receipt ${c.receiptDigest}: ${verified.mismatches.join("; ")}`);
    }
  };
  for (const candidate of report.candidates) {
    await verifyCases(candidate.manifestDigest, candidate.cases);
  }
  await verifyCases(report.promoted, report.holdout.cases);
  if (report.lineage) await verifyCases(report.lineage.generatorDigest, [{
    id: "generator",
    split: "train",
    passed: true,
    outcome: "complete",
    outputs: {},
    expect: {},
    receiptDigest: report.lineage.receiptDigest,
    work: { steps: 0, agentCalls: 0, units: 0 },
  }], false);
  return { ok: mismatches.length === 0, digest: claimed, checkedReceipts, mismatches };
}
