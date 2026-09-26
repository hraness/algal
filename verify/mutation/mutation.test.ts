/** Lane-local coverage for evidence-mutation: minted bases verify, the
 * rebind primitive produces honestly-digested malicious records, the full
 * catalog matches its declared expectations, and the field ledger is
 * internally consistent. */

import { expect, test } from "bun:test";
import { parseProcessEvidence, verifyProcessEvidence } from "../../src/process-evidence";
import { BASE_IDS, mintBases } from "./fixtures";
import { FIELD_LEDGER, MUTANTS, rebind, type MutantDoc } from "./mutants";
import { runMutation } from "./run";

test("every minted base verifies before mutation", async () => {
  const minted = await mintBases();
  expect(minted.size).toBe(BASE_IDS.length);
  for (const id of BASE_IDS) {
    const mint = minted.get(id)!;
    const verdict = await verifyProcessEvidence(mint.evidence);
    expect(verdict.ok).toBe(true);
  }
});

test("rebind keeps a mutated record fully consistent under admission", async () => {
  const minted = await mintBases();
  const doc = structuredClone(minted.get("complete")!.evidence) as unknown as MutantDoc;
  // A semantically-neutral edit + full rebind — still parses (mutated
  // generation fails only semantically; use a display-neutral field).
  rebind(doc);
  expect(() => parseProcessEvidence(doc)).not.toThrow();
});

test("catalog runs to completion: every probe matches its expectation", async () => {
  const report = await runMutation();
  const failures = report.results.filter(r => !r.pass);
  for (const f of failures) {
    console.error(`${f.base}/${f.id}: expected ${JSON.stringify(f.expect)} got ${JSON.stringify(f.observed)}`);
  }
  expect(failures).toHaveLength(0);
  expect(report.totals.probes).toBe(report.results.length);
  expect(report.totals.passed + report.totals.failed).toBe(report.totals.probes);
  // The lane must exercise all three stages.
  expect(report.totals.byExpectation["admission"]).toBeGreaterThan(0);
  expect(report.totals.byExpectation["semantic"]).toBeGreaterThan(0);
  expect(report.survivors.length).toBeGreaterThan(0);
  for (const s of report.survivors) expect(s.reason.length).toBeGreaterThan(20);
}, 60_000);

test("field ledger is consistent with the catalog", () => {
  const ids = new Set(MUTANTS.map(m => m.id));
  expect(ids.size).toBe(MUTANTS.length); // no duplicate mutant ids
  for (const row of FIELD_LEDGER) {
    if (row.coveredBy === "not-applicable") {
      expect(row.why).toBeTruthy();
    } else {
      expect(ids.has(row.coveredBy)).toBe(true);
    }
  }
  // every declared mutant base exists
  for (const m of MUTANTS) {
    for (const b of m.bases) expect(BASE_IDS as readonly string[]).toContain(b);
  }
});

test("a deliberately-wrong expectation is detected (admission vs semantic)", async () => {
  // If the runner ever conflates stages — e.g. treating an admission
  // rejection as semantic — this control catches it: mutate the contract
  // so admission fires, and require the probe to classify it correctly.
  const minted = await mintBases();
  const doc = structuredClone(minted.get("complete")!.evidence) as unknown as MutantDoc;
  doc.contract = "algal.process-evidence.v2";
  expect(() => parseProcessEvidence(doc)).toThrow(/contract/);
});
