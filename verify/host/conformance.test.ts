// Host-conformance foundation tests — drive every violation wrapper in the
// catalog against the real contract surface and assert the runtime's handling
// matches the published obligations in `contract.md`.
//
// Coverage that requires a live provider, a real subprocess, or OS-level
// durability is marked live-only in contract.md and is NOT exercised here.

import { describe, expect, test } from "bun:test";

import {
  HOST_VIOLATION_CASES,
  runHostConformance,
  type Seam,
} from "./conformance";

const SEAMS: Seam[] = [
  "executor",
  "store",
  "tool",
  "transport",
  "memory-admission",
  "host-event",
  "stream",
  "credential",
  "decision",
];

for (const seam of SEAMS) {
  const cases = HOST_VIOLATION_CASES.filter((c) => c.seam === seam);
  describe(`host-conformance ${seam}`, () => {
    for (const c of cases) {
      test(`${c.id} — ${c.summary}`, async () => {
        const evidence = await c.run();
        expect(evidence.ok).toBe(true);
        expect(evidence.detail.length).toBeGreaterThan(0);
      });
    }
  });
}

test("the catalog covers every seam and carries a stable report", async () => {
  const report = await runHostConformance();
  expect(report.suite).toBe("host-conformance");
  expect(report.total).toBe(HOST_VIOLATION_CASES.length);
  expect(report.conformant).toBe(report.total);
  const seams = new Set(report.cases.map((c) => c.seam));
  expect([...seams].sort()).toEqual([...SEAMS].sort());
  for (const c of report.cases) {
    expect(c.ok).toBe(true);
    expect(c.obligation).toMatch(/^HC-[A-Z]{2}-\d{2}$/);
  }
});
