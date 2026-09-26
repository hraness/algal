import { describe, expect, test } from "bun:test";
import {
  canonical, checkQueryResult, type Json, type Reason,
} from "../reference/memory/checker";
import {
  BASES, MUTATION_CASES, SURVIVOR_CASES, runMutationSuite,
  type MutationClass,
} from "./mutants";

/** Every named Phase 11 mutant class must appear at least once. */
const REQUIRED_CLASSES: MutationClass[] = [
  "premise-order", "premise-count", "premise-substituted",
  "conclusion-substituted", "rule-identity", "snapshot-membership",
  "observation-authority", "proof-identity", "cycle", "iteration-bound",
  "row-set", "envelope-identity",
];

describe("memory-mutation: targeted semantic mutants", () => {
  test("catalog is deterministic with unique identities and full class coverage", () => {
    expect(new Set(MUTATION_CASES.map(c => c.id)).size).toBe(MUTATION_CASES.length);
    expect(new Set(BASES.map(b => b.id)).size).toBe(BASES.length);
    const classes = new Set(MUTATION_CASES.map(c => c.class));
    for (const cls of REQUIRED_CLASSES) expect(classes.has(cls)).toBe(true);
    // Every case's mutation must actually change the checker input — a
    // mutant identical to its baseline proves nothing.
    const baseById = new Map(BASES.map(b => [b.id, b]));
    for (const c of MUTATION_CASES) {
      const base = baseById.get(c.base);
      expect(base, `${c.id}: unknown base`).toBeDefined();
      expect(canonical(c.input as unknown as Json), `${c.id}: mutant identical to baseline`)
        .not.toBe(canonical(base!.input as unknown as Json));
    }
  });

  for (const base of BASES) {
    test(`baseline ${base.id} accepts`, () => {
      const verdict = checkQueryResult(base.input);
      expect(verdict).toEqual({ accept: true, rows: expect.any(Number) });
    });
  }

  for (const c of MUTATION_CASES) {
    test(c.id, () => {
      // Baseline is re-established inside the case test so a mutant is only
      // ever read against a known-good derivation.
      const verdict = checkQueryResult(c.input);
      expect(verdict.accept, `${c.mutation} — expected ${c.expect}, got accept`).toBe(false);
      if (!verdict.accept) {
        expect(verdict.reason as Reason, `${c.mutation} — wrong reason`).toBe(c.expect);
        expect(typeof verdict.detail).toBe("string");
        expect(verdict.detail.length).toBeGreaterThan(0);
      }
    });
  }

  test("survivor mutants are accepted exactly as documented", () => {
    for (const s of SURVIVOR_CASES) {
      const verdict = checkQueryResult(s.input);
      expect(verdict.accept, `${s.id}: documented survivor now rejects — the checker's contract changed`).toBe(true);
    }
  });

  test("runMutationSuite report is complete and self-consistent", () => {
    const report = runMutationSuite();
    expect(report.basesAccepted).toBe(true);
    expect(report.total).toBe(MUTATION_CASES.length);
    expect(report.caught).toBe(report.total);
    for (const c of report.cases) expect(c.caught).toBe(true);
  });
});
