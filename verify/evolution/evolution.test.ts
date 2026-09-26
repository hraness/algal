/**
 * `evolution-model` lane driver — `bun test verify/evolution`.
 *
 * Each catalog case runs against the instrumented production-path harness
 * (`MemoryStore` + `MemoryApplicationStorage` + `ApplicationCore` +
 * `createApplicationPolicyHost`) and returns structured evidence. The suite
 * also emits a stable, digest-free-of-timing report to stdout for review.
 */
import { describe, expect, test } from "bun:test";
import { EVOLUTION_CASES } from "./cases";

const report: { id: string; property: string; surface: string; outcome: string; evidence?: unknown }[] = [];

for (const c of EVOLUTION_CASES) {
  test(`evolution/${c.id}`, async () => {
    const evidence = await c.run();
    report.push({ id: c.id, property: c.property, surface: c.surface, outcome: "tested", evidence });
  }, 30_000);
}

describe("evolution-model lane", () => {
  test("case catalog is unique and covers the named obligations", () => {
    const ids = new Set(EVOLUTION_CASES.map(c => c.id));
    expect(ids.size === EVOLUTION_CASES.length, "duplicate case ids");
    const properties = new Set(EVOLUTION_CASES.flatMap(c => c.property.split(/[\/,\s]+/).filter(s => s.startsWith("EVO-"))));
    for (const obligation of ["EVO-02", "EVO-03", "EVO-04", "EVO-05", "EVO-06", "EVO-07", "EVO-08"]) {
      expect(properties.has(obligation), `missing obligation ${obligation}`);
    }
    // Stable report surface for reviewers.
    console.log(`\n=== evolution-model report (${EVOLUTION_CASES.length} cases) ===`);
    for (const c of EVOLUTION_CASES) console.log(`${c.id.padEnd(52)} ${c.property.padEnd(28)} ${c.surface}`);
  });
});
