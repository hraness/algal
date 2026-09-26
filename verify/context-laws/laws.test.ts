import { afterEach, describe, expect, test } from "bun:test";
import { cleanupContextLaws, LAW_CASES, runContextLaws } from "./laws";

describe("context-laws: algebraic laws over the real context/memory paths", () => {
  afterEach(async () => { await cleanupContextLaws(); });

  test("catalog is deterministic with unique identities and bounded properties", () => {
    expect(new Set(LAW_CASES.map(c => c.id)).size).toBe(LAW_CASES.length);
    for (const c of LAW_CASES) {
      expect(c.property).toMatch(/^(CTX|MEM)-\d+/);
      expect(c.summary.length).toBeGreaterThan(0);
    }
  });

  for (const c of LAW_CASES) {
    test(c.id, async () => {
      const evidence = await c.run();
      expect(evidence.ok, `${c.summary} — ${evidence.detail}`).toBe(true);
      expect(evidence.detail.length).toBeGreaterThan(0);
    });
  }

  test("runContextLaws report is complete and self-consistent", async () => {
    const report = await runContextLaws();
    expect(report.total).toBe(LAW_CASES.length);
    expect(report.satisfied).toBe(report.total);
    for (const r of report.cases) expect(r.ok, `${r.id}: ${r.detail}`).toBe(true);
  });
});
