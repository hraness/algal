import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInventoryScenario } from "./run";

const roots: string[] = [];
afterEach(async () => { for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true }); });
const native = process.env.ALGAL_MEMORY_NATIVE;
const nativeTest = native ? test : test.skip;

nativeTest("inventory inhabitants retain evidence through restart, contention and evaluated revision", async () => {
  const parent = await mkdtemp(join(tmpdir(), "algal-inventory-")); roots.push(parent);
  const root = join(parent, "scenario");
  const evidence = await runInventoryScenario(root, native!);
  expect(evidence.decision).toBe("restock");
  expect(evidence.goal.statuses).toEqual(["unknown", "supported", "stale", "supported", "supported"]);
  expect(evidence.observations).toBe(4);
  expect(evidence.probeEffects).toBe(4);
  expect(evidence.episodeEffects).toBe(2);
  expect(evidence.restartRedeliveries).toBe(0);
  expect(evidence.contenders).toEqual({ accepted: 1, rejected: 1 });
  expect(evidence.hostInvocations).toHaveLength(8);
  expect(new Set(evidence.hostInvocations.map(p => p.pid)).size).toBe(8);
  expect(evidence.hostInvocations.every(p => p.pid !== process.pid && p.exitCode === 0)).toBe(true);
  expect(evidence.toolDiscovery).toEqual({ before: "tools/inventory-a", after: "tools/inventory-b", executions: 2 });
  expect(evidence.evaluationCases).toEqual({ train: 2, validation: 3, holdout: 2, executions: 12 });
  expect(new Set(evidence.inhabitants.map(i => i.maxWork)).size).toBe(3);
  expect(evidence.inhabitants.find(i => i.name === "planner")!.capabilities).toEqual([]);
  expect(evidence.qualification).toEqual({ proposal: "authored-deterministic", inference: "native-replay-verified", modelCalls: 0, paidApiSpendUsd: 0 });
  const view = JSON.parse(await readFile(join(root, "view.json"), "utf8"));
  expect(view.state).toBe(evidence.state);
  expect(view.goals[0].goal).toBe(evidence.goal.reference);
  expect(view.goals[0].state).toBe(evidence.state);
  expect(view.goals[0].status).toBe("supported");
  expect(view.goals[0].definition.entrypoint).toBe("planner");
  expect(view.procedures.find((p: { name: string }) => p.name === "planner").applicability).toBe("supported");
  await expect(runInventoryScenario(root, native!)).rejects.toThrow();
}, 60000);

test("the demo refuses relative native executable paths before creating a workspace", async () => {
  await expect(runInventoryScenario("/unused-inventory-test", "algal")).rejects.toThrow("absolute");
});
