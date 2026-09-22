import { manifestToJson } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  FOUNDRY_CONTRACT,
  selectFoundryCandidate,
  type FoundryReport,
} from "./foundry";
import { parseFoundryReport, verifyFoundryReport } from "./foundry-verify";
import type { FnRegistry } from "./registry";
import { parseRunReceipt } from "./run";
import {
  SEARCH_BOUNDS,
  SEARCH_CONTRACT,
  type SearchGeneration,
  type SearchReport,
} from "./search";
import type { Store } from "./store";
import type { ToolRegistry } from "./tools";
import { verifyReceipt } from "./verify";
import type { JsonObject, JsonValue } from "./values";

function object(value: unknown, at: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AlgalError("PARSE_FAILED", `${at} must be an object`);
  }
  return value as JsonObject;
}

function exactKeys(value: JsonObject, allowed: string[], at: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra) throw new AlgalError("PARSE_FAILED", `${at}: unknown key "${extra}"`);
}

function digest(value: JsonValue | undefined, at: string): Digest {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new AlgalError("PARSE_FAILED", `${at} must be a sha256 digest`);
  }
  return value as Digest;
}

export function parseSearchReport(value: unknown): SearchReport {
  const raw = object(value, "search");
  exactKeys(raw, ["contract", "generatorDigest", "generations", "result", "digest"], "search");
  if (raw.contract !== SEARCH_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `search.contract must be ${SEARCH_CONTRACT}`);
  }
  if (!Array.isArray(raw.generations) || raw.generations.length === 0 || raw.generations.length > SEARCH_BOUNDS.maxGenerations) {
    throw new AlgalError("PARSE_FAILED", "search.generations must be a bounded non-empty list");
  }
  const result = parseFoundryReport(raw.result);
  const generations: SearchGeneration[] = raw.generations.map((entry, index) => {
    const generation = object(entry, `search.generations[${index}]`);
    exactKeys(
      generation,
      ["generation", "generatorDigest", "receiptDigest", "proposed", "candidates", "promoted"],
      `search.generations[${index}]`,
    );
    if (generation.generation !== index) {
      throw new AlgalError("PARSE_FAILED", `search.generations[${index}].generation must be ${index}`);
    }
    if (!Array.isArray(generation.proposed) || generation.proposed.length === 0) {
      throw new AlgalError("PARSE_FAILED", `search.generations[${index}].proposed must be non-empty`);
    }
    const parsed = parseFoundryReport({
      contract: FOUNDRY_CONTRACT,
      candidates: generation.candidates,
      promoted: generation.promoted,
      holdout: result.holdout,
      digest: result.digest,
    });
    return {
      generation: index,
      generatorDigest: digest(generation.generatorDigest, `search.generations[${index}].generatorDigest`),
      receiptDigest: digest(generation.receiptDigest, `search.generations[${index}].receiptDigest`),
      proposed: generation.proposed.map((item, i) => digest(item, `search.generations[${index}].proposed[${i}]`)),
      candidates: parsed.candidates,
      promoted: parsed.promoted,
    };
  });
  return {
    contract: SEARCH_CONTRACT,
    generatorDigest: digest(raw.generatorDigest, "search.generatorDigest"),
    generations,
    result,
    digest: digest(raw.digest, "search.digest"),
  };
}

export type SearchVerifyReport = {
  ok: boolean;
  digest: Digest;
  checkedReceipts: number;
  mismatches: string[];
};

export async function verifySearchReport(
  value: unknown,
  store: Store,
  fns: FnRegistry,
  tools?: ToolRegistry,
): Promise<SearchVerifyReport> {
  const report = parseSearchReport(value);
  const mismatches: string[] = [];
  const { digest: claimed, ...base } = report;
  const computed = digestCanonical(base as unknown as JsonValue);
  if (claimed !== computed) mismatches.push(`digest: claimed ${claimed}, computed ${computed}`);
  const final = await verifyFoundryReport(report.result, store, fns, tools);
  if (!final.ok) mismatches.push(...final.mismatches.map((mismatch) => `result: ${mismatch}`));
  let checkedReceipts = final.checkedReceipts;
  let previousWinner: Digest | undefined;
  for (const generation of report.generations) {
    if (generation.generatorDigest !== report.generatorDigest) {
      mismatches.push(`generation ${generation.generation}: generator digest changed`);
    }
    if (selectFoundryCandidate(generation.candidates) !== generation.promoted) {
      mismatches.push(`generation ${generation.generation}: promoted candidate is not the winner`);
    }
    if (generation.candidates.some((candidate) => candidate.cases.some((c) => c.split === "holdout"))) {
      mismatches.push(`generation ${generation.generation}: holdout evidence leaked into selection`);
    }
    if (previousWinner && !generation.candidates.some((candidate) => candidate.manifestDigest === previousWinner)) {
      mismatches.push(`generation ${generation.generation}: previous winner did not survive`);
    }
    for (const proposed of generation.proposed) {
      if (!generation.candidates.some((candidate) => candidate.manifestDigest === proposed)) {
        mismatches.push(`generation ${generation.generation}: proposed ${proposed} was not evaluated`);
      }
    }
    const promoted = generation.candidates.find((candidate) => candidate.manifestDigest === generation.promoted)!;
    const evidence = promoted.cases[0];
    if (!evidence) {
      mismatches.push(`generation ${generation.generation}: winner has no evidence`);
    } else {
      const synthetic: Omit<FoundryReport, "digest"> = {
        contract: FOUNDRY_CONTRACT,
        candidates: generation.candidates,
        promoted: generation.promoted,
        ...(report.result.scorer !== undefined ? { scorer: report.result.scorer } : {}),
        holdout: {
          passed: evidence.passed ? 1 : 0,
          total: 1,
          cases: [{ ...evidence, split: "holdout" }],
        },
      };
      const foundry = {
        ...synthetic,
        digest: digestCanonical(synthetic as unknown as JsonValue),
      };
      const verified = await verifyFoundryReport(foundry, store, fns, tools);
      checkedReceipts += verified.checkedReceipts;
      if (!verified.ok) {
        mismatches.push(...verified.mismatches.map((mismatch) => `generation ${generation.generation}: ${mismatch}`));
      }
    }
    const generatorManifest = await store.getManifest(generation.generatorDigest);
    const generatorReceiptValue = await store.getReceipt(generation.receiptDigest);
    if (!generatorManifest) {
      mismatches.push(`generation ${generation.generation}: generator manifest missing`);
    } else if (!generatorReceiptValue) {
      mismatches.push(`generation ${generation.generation}: generator receipt missing`);
    } else {
      const generatorReceipt = parseRunReceipt(generatorReceiptValue);
      const verified = await verifyReceipt(
        generatorReceipt,
        manifestToJson(generatorManifest),
        store,
        fns,
        undefined,
        tools,
      );
      checkedReceipts++;
      if (!verified.ok) {
        mismatches.push(`generation ${generation.generation}: generator receipt: ${verified.mismatches.join("; ")}`);
      }
    }
    previousWinner = generation.promoted;
  }
  if (previousWinner !== report.result.promoted) {
    mismatches.push("final result did not preserve the last generation winner");
  }
  return { ok: mismatches.length === 0, digest: claimed, checkedReceipts, mismatches };
}
