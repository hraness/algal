import { describe, expect, test } from "bun:test";
import { AUTHORITY_CASES, runMemoryAuthority } from "./cases";

describe("memory-authority", () => {
  test("case catalog is unique and deterministic", () => {
    const ids = AUTHORITY_CASES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of AUTHORITY_CASES) {
      expect(c.property.length).toBeGreaterThan(0);
      expect(c.surface.length).toBeGreaterThan(0);
      expect(c.summary.length).toBeGreaterThan(40);
    }
  });

  for (const c of AUTHORITY_CASES) {
    test(c.id, async () => {
      const out = await c.run();
      expect(out.status).toBe("satisfied");
      expect(Object.keys(out.evidence).length).toBeGreaterThan(0);
    });
  }

  test("report is complete and stable", async () => {
    const report = await runMemoryAuthority();
    expect(report.suite).toBe("memory-authority");
    expect(report.total).toBe(AUTHORITY_CASES.length);
    expect(report.satisfied).toBe(report.total);
    expect(report.cases.every(c => c.status === "satisfied")).toBe(true);
  });
});
