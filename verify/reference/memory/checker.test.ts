import { describe, expect, test } from "bun:test";
import { checkQueryResult, digestDocument, internals, type Json } from "./checker";
import { fixtures } from "./fixtures";

const cases = fixtures();

describe("independent memory derivation checker", () => {
  test("fixture inventory is deterministic with unique identities", () => {
    expect(new Set(cases.map(f => f.id)).size).toBe(cases.length);
    expect(fixtures().map(f => f.id)).toEqual(cases.map(f => f.id));
    for (const f of cases) {
      expect(checkQueryResult(f.input)).toEqual(checkQueryResult(f.input));
    }
  });

  for (const f of cases) {
    test(f.id, () => {
      const verdict = checkQueryResult(f.input);
      expect(verdict.accept).toBe(f.expect.accept);
      if (!f.expect.accept) {
        expect(verdict.accept).toBe(false);
        if (!verdict.accept) expect(verdict.reason as string).toBe(f.expect.reason);
      } else if (verdict.accept && f.expect.rows !== undefined) {
        expect(verdict.rows).toBe(f.expect.rows);
      }
    });
  }

  test("canonical serialization and digests agree with the production codec", () => {
    // Cross-check this checker's canonical form against src/values.ts. The
    // admitted key domain here excludes u32-index-like keys; the scheduler
    // oracle separately pins the array-index-first order.
    const samples: Json[] = [
      null, true, false, 0, 1, -2, 1.5, -0, 1e-7, 1024,
      "", "a", "depends", "😀", "esc\"ape", "line\nfeed",
      [1, "a", null], { b: 1, a: ["red", false] },
      { relation: "depends", tuple: ["app", "parser"], sources: ["sha256:" + "0".repeat(64)] },
      { kind: "rule", premises: ["sha256:" + "1".repeat(64)], rule: "sha256:" + "2".repeat(64) },
    ];
    for (const s of samples) {
      expect(digestDocument(s)).toMatch(/^sha256:[a-f0-9]{64}$/);
      // Production digest of the same value (imported only for this codec pin).
      expect(digestDocument(s)).toBe(digestCanonicalOf(s));
    }
  });

  test("every expected rejection reason is produced", () => {
    const produced = new Set(
      cases.filter(f => !f.expect.accept)
        .map(f => (checkQueryResult(f.input) as { reason: string }).reason));
    const expected = new Set(
      cases.filter(f => !f.expect.accept)
        .map(f => (f.expect as { reason: string }).reason));
    expect(produced).toEqual(expected);
  });

  test("independent evaluation exposes the documented counts", () => {
    const f = cases.find(x => x.id === "transitive-chain-accepts")!;
    const snap = admitSnapshot(f.input.snapshot);
    const prog = admitProgram(f.input.program);
    const out = internals.evaluate(snap.facts, prog.rules, prog.query, prog.limits);
    expect(out.ok).toBe(true);
    expect(out.rounds).toBe(3);
    expect(out.baseFacts).toBe(2);
    expect(out.derivedFacts).toBe(3);
    expect([...out.rows.values()].map(r => r.tuple))
      .toEqual([["app", "lexer"], ["app", "parser"]]);
  });
});

// The production codec is imported in the test only, to pin byte agreement of
// the checker's own canonicalization; the checker itself never imports it.
import { digestCanonical } from "../../../src/digest";
import { admitProgram, admitSnapshot } from "./checker";
function digestCanonicalOf(v: Json): string { return digestCanonical(v as never); }
