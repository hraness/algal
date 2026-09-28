import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  EVALUATION_EVIDENCE_CONTRACT, HOST_CONTRACT_BOUNDS, HOST_LIFECYCLE_CONTRACT, HOST_PROFILE_CONTRACT, PROMOTION_DECISION_CONTRACT,
  buildEvaluationEvidence, buildHostLifecycle, buildHostProfile, buildPromotionDecision,
  parseEvaluationEvidence, parseHostLifecycle, parseHostProfile, parsePromotionDecision,
} from "./host-contract";
import { canonicalize, type JsonValue } from "./values";

const json = (value: unknown) => value as JsonValue;

type FixtureCase = { name: string; record: keyof Fixture["valid"]; ops: [string, (string | number)[], unknown][]; error: string };
type Fixture = {
  contract: "algal.host-contract-fixtures.v1";
  valid: { evaluationEvidence: JsonValue & { digest: Digest }; hostProfile: JsonValue & { digest: Digest }; promotionDecision: JsonValue & { digest: Digest }; hostLifecycle: JsonValue & { digest: Digest } };
  invalid: FixtureCase[];
};
const fixture = JSON.parse(await readFile(join(resolve(import.meta.dir, ".."), "scripts", "fixtures", "host-contract.json"), "utf8")) as Fixture;

const parsers = {
  evaluationEvidence: parseEvaluationEvidence,
  hostProfile: parseHostProfile,
  promotionDecision: parsePromotionDecision,
  hostLifecycle: parseHostLifecycle,
} as const;

function applyOps(record: JsonValue, ops: FixtureCase["ops"]): JsonValue {
  const root = structuredClone(record) as Record<string, unknown> | unknown[];
  for (const [op, path, value] of ops) {
    let target = root as Record<string, unknown>;
    for (const key of path.slice(0, -1)) target = target[key as keyof typeof target] as Record<string, unknown>;
    const last = path[path.length - 1]!;
    if (op === "set") target[last as keyof typeof target] = value;
    else if (op === "delete" || op === "del") delete target[last as keyof typeof target];
    else throw new Error(`unknown fixture op ${op}`);
  }
  return json(root);
}

function codeOf(fn: () => unknown): string {
  try { fn(); } catch (error) { if (error instanceof AlgalError) return error.code; throw error; }
  return "ACCEPTED";
}

describe("shared host contracts", () => {
  test("valid fixture records parse to identical canonical digests", () => {
    for (const [name, record] of Object.entries(fixture.valid) as [keyof Fixture["valid"], (typeof fixture.valid)[keyof Fixture["valid"]]][]) {
      const parsed = parsers[name](record);
      expect(parsed.digest).toBe(record.digest);
      expect(canonicalize(json(parsed))).toBe(canonicalize(record));
    }
  });

  test("invalid fixtures are rejected with the recorded error code", () => {
    for (const entry of fixture.invalid) {
      const mutated = applyOps(fixture.valid[entry.record], entry.ops);
      expect(codeOf(() => parsers[entry.record](mutated)), entry.name).toBe(entry.error);
    }
  });

  test("builders produce normalized self-consistent records", () => {
    const evidence = parseEvaluationEvidence(fixture.valid.evaluationEvidence);
    const { digest: _a, ...evidenceBase } = evidence;
    expect(buildEvaluationEvidence(evidenceBase)).toEqual(evidence);
    const profile = parseHostProfile(fixture.valid.hostProfile);
    const { digest: _b, ...profileBase } = profile;
    expect(buildHostProfile(profileBase)).toEqual(profile);
    const promotion = parsePromotionDecision(fixture.valid.promotionDecision);
    const { digest: _c, ...promotionBase } = promotion;
    expect(buildPromotionDecision(promotionBase)).toEqual(promotion);
    const lifecycle = parseHostLifecycle(fixture.valid.hostLifecycle);
    const { digest: _d, ...lifecycleBase } = lifecycle;
    expect(buildHostLifecycle(lifecycleBase)).toEqual(lifecycle);
  });

  test("digest binds every field; a mutated digest differs", () => {
    const mutated = applyOps(fixture.valid.evaluationEvidence, [["set", ["limitations"], ["changed"]]]);
    expect(codeOf(() => parseEvaluationEvidence(mutated))).toBe("DIGEST_MISMATCH");
    const profile = applyOps(fixture.valid.hostProfile, [["set", ["host", "version"], "9.9.9"]]);
    expect(codeOf(() => parseHostProfile(profile))).toBe("DIGEST_MISMATCH");
  });

  test("bounds refuse oversized records before parsing", () => {
    const huge = applyOps(fixture.valid.evaluationEvidence, [["set", ["limitations"], ["x".repeat(HOST_CONTRACT_BOUNDS.maxStringBytes + 1)]], ["set", ["digest"], "sha256:0000000000000000000000000000000000000000000000000000000000000000"]]);
    expect(codeOf(() => parseEvaluationEvidence(huge))).toBe("BUDGET_EXHAUSTED");
    const deep = { contract: EVALUATION_EVIDENCE_CONTRACT, nested: null as unknown };
    let node: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < HOST_CONTRACT_BOUNDS.maxDepth + 2; i++) node = { next: node };
    deep.nested = node;
    expect(codeOf(() => parseEvaluationEvidence(deep))).toBe("BUDGET_EXHAUSTED");
  });

  test("records are data-only and cannot carry effects or authority", () => {
    const lifecycle = applyOps(fixture.valid.hostLifecycle, [["set", ["heldAuthority"], ["mailbox-send:ambient"]]]);
    expect(codeOf(() => parseHostLifecycle(lifecycle))).toBe("DIGEST_MISMATCH");
    expect(HOST_LIFECYCLE_CONTRACT).toBe("algal.host-lifecycle.v1");
    expect(HOST_PROFILE_CONTRACT).toBe("algal.host-profile.v1");
    expect(PROMOTION_DECISION_CONTRACT).toBe("algal.promotion-decision.v1");
  });
});
