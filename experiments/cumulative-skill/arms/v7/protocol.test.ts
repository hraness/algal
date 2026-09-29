import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Block = { id: string; seeds: Record<string, number> };
type Protocol = {
  contract: string; status: string; blocks: Block[]; previousSeeds: number[];
  seed: { roundSchedule: string[]; developmentFeedback: { labels: boolean }; writerNeverReceives: string[] };
  calibration: { proceed: string }; replication: { successRule: string; requiredCoverage: string[] };
};
const protocol = JSON.parse(readFileSync(join(import.meta.dir, "protocol.json"), "utf8")) as Protocol;

test("v7 is a frozen design without live study artifacts", () => {
  expect(protocol.contract).toBe("algal.study-protocol.v2");
  expect(protocol.status).toBe("design-only-no-inference");
  expect(protocol.blocks).toHaveLength(13);
  expect(protocol.blocks.slice(0, 4).map((b) => b.id)).toEqual(["cal-a", "cal-b", "cal-c", "cal-d"]);
  expect(protocol.blocks.slice(4).map((b) => b.id)).toEqual(["a-r1", "a-r2", "a-r3", "b-r1", "b-r2", "b-r3", "c-r1", "c-r2", "c-r3"]);
  expect(protocol.seed.roundSchedule).toHaveLength(8);
  expect(protocol.seed.developmentFeedback.labels).toBe(false);
  expect(protocol.seed.writerNeverReceives).toContain("selection labels");
  expect(protocol.seed.writerNeverReceives).toContain("selection scores");
  expect(protocol.calibration.proceed).toContain("all four seed searches qualify");
  expect(protocol.replication.successRule).toContain("at least two of three");
  expect(protocol.replication.requiredCoverage).toEqual(["all nine confirmatory blocks", "fixed arm", "optimizer arm"]);
});

test("v7 task and ancestor seeds are unique and disjoint from the v6 ledger", () => {
  const prior = new Set(protocol.previousSeeds as number[]);
  const current = protocol.blocks.flatMap((b) => Object.values(b.seeds));
  expect(new Set(current).size).toBe(current.length);
  expect(current.every((seed) => !prior.has(seed))).toBe(true);
  expect(Math.min(...current)).toBe(71000001);
  expect(Math.max(...current)).toBe(71000052);
});
