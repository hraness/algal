import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInventoryScenario } from "./run";
import { sha256 } from "../coding-harness/memory-records";
import { parseApplicationContention, parseInterappMessage } from "../../index";
import { FileStore } from "../../src/store";

const roots: string[] = [];
afterEach(async () => { for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true }); });
const native = process.env.ALGAL_MEMORY_NATIVE;
const nativeTest = native ? test : test.skip;

nativeTest("inventory inhabitants retain evidence through restart, contention and evaluated revision", async () => {
  const parent = await mkdtemp(join(tmpdir(), "algal-inventory-")); roots.push(parent);
  const root = join(parent, "scenario");
  const evidence = await runInventoryScenario(root, native!, native!);
  expect(evidence.decision).toBe("restock");
  expect(evidence.goal.statuses).toEqual(["unknown", "supported", "stale", "supported", "supported"]);
  expect(evidence.observations).toBe(4);
  expect(evidence.probeEffects).toBe(4);
  expect(evidence.episodeEffects).toBe(2);
  expect(evidence.restartRedeliveries).toBe(0);
  expect(evidence.contenders.accepted).toBe(1);
  expect(evidence.contenders.rejected).toBe(2);
  expect(evidence.contenders.loserReasons).toEqual(["Stale application head", "Stale application head"]);
  expect(evidence.contenders.winner).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(evidence.message).toMatch(/^sha256:[a-f0-9]{64}$/);
  // The retained records verify against the scenario CAS: the race kept all
  // three attempted commands with exactly the committed winner, and the last
  // settled delivery kept its sender/operation/route/recipient/payload bind.
  const cas = new FileStore(join(root, "application"));
  const contention = parseApplicationContention(await cas.getValue(evidence.contenders.record));
  expect(contention.winner).toBe(evidence.contenders.winner);
  expect(contention.attempts).toHaveLength(3);
  expect(contention.attempts.filter(a => a.status === "committed")).toHaveLength(1);
  const delivered = parseInterappMessage(await cas.getValue(evidence.message));
  expect(delivered.application).toBe("inventory");
  expect(delivered.route).toBe("proposals");
  expect(evidence.hostInvocations).toHaveLength(8);
  expect(new Set(evidence.hostInvocations.map(p => p.pid)).size).toBe(8);
  expect(evidence.hostInvocations.every(p => p.pid !== process.pid && p.exitCode === 0)).toBe(true);
  expect(evidence.toolDiscovery).toEqual({ before: "tools/inventory-a", after: "tools/inventory-b", executions: 2 });
  expect(evidence.evaluationCases).toEqual({ train: 2, validation: 3, holdout: 2, executions: 12 });
  expect(new Set(evidence.inhabitants.map(i => i.maxWork)).size).toBe(3);
  expect(evidence.inhabitants.map(i => i.maxWork).sort((a, b) => a - b)).toEqual([2000, 3000, 4000]);
  expect(evidence.inhabitants.every(i => i.maxAgentCalls === 0)).toBe(true);
  expect(evidence.inhabitants.find(i => i.name === "planner")!.capabilities).toEqual([]);
  expect(evidence.qualification).toEqual({ proposal: "authored-deterministic", inference: "native-replay-verified", modelCalls: 0, paidApiSpendUsd: 0 });
  const view = JSON.parse(await readFile(join(root, "view.json"), "utf8"));
  expect(view.state).toBe(evidence.state);
  expect(view.goals[0].goal).toBe(evidence.goal.reference);
  expect(view.goals[0].state).toBe(evidence.state);
  expect(view.goals[0].status).toBe("supported");
  expect(view.goals[0].definition.entrypoint).toBe("planner");
  expect(view.evidence.state).toBe(evidence.state);
  expect(view.evidence.queries.some((q: {status: string}) => q.status === "supported")).toBe(true);
  expect(view.evidence.probes).toHaveLength(2);
  expect(view.evidence.probes.every((p: {budgets: unknown}) => p.budgets === null)).toBe(true);
  expect(view.evidence.sources.length).toBeGreaterThanOrEqual(2);
  expect(view.evidence.revisions.some((r: {kind: string}) => r.kind === "activate")).toBe(true);
  expect(view.evidence.work.some((w: {kind: string; status: string; binding: string | null}) => w.kind === "start-episode" && w.status === "settled" && w.binding)).toBe(true);
  const unknown = JSON.parse(await readFile(join(root, "view-unknown.json"), "utf8"));
  expect(unknown.state).not.toBe(view.state);
  expect(unknown.goals[0].status).toBe("unknown");
  expect(unknown.evidence.queries[0].status).toBe("unknown");
  expect(unknown.evidence.queries[0].procedures).toHaveLength(2);
  expect(unknown.evidence.queries[0].sourceRefs).toEqual([]);
  expect(unknown.evidence.work.some((w: {status: string; request: string | null}) => w.status === "pending" && w.request)).toBe(true);
  expect(unknown.actions).toEqual([]);
  expect(evidence.unknownView).toBeTruthy();
  expect(await readFile(evidence.unknownReport!, "utf8")).toContain("No supporting result");
  const report = await readFile(evidence.report!, "utf8");
  expect(report).toContain("Observation provenance");
  expect(report).toContain("Host probe; execution bounds are supplied by the admitted host");
  for (const path of [evidence.report!, evidence.unknownReport!]) {
    const html = await readFile(path, "utf8");
    expect(html).toContain("default-src 'none'");
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/src="http|href="http|fetch\(|XMLHttpRequest|sendBeacon/);
  }
  const truncated = view.evidence.truncated as Record<string, unknown>;
  expect(Object.keys(truncated).sort()).toEqual(["probes", "queries", "revisions", "sources", "work"]);
  expect(Object.values(truncated).every(v => v === false)).toBe(true);
  const emitted = new Set(await readdir(root));
  for (const phase of ["initialize", "observe", "refresh", "propose", "evaluate", "activate", "execute", "inspect"])
    expect(emitted.has(`phase-${phase}.json`)).toBe(true);
  for (const name of ["evidence.json", "native-sha256", "view.json", "view-unknown.json", "report.html", "report-unknown.html", "tool-observe.json", "tool-execute.json"])
    expect(emitted.has(name)).toBe(true);
  expect(evidence.nativeSha256).toBe(sha256(await readFile(native!)));
  expect(await readFile(join(root, "native-sha256"), "utf8")).toBe(evidence.nativeSha256);
  expect(view.procedures.find((p: { name: string }) => p.name === "planner").applicability).toBe("supported");
  await expect(runInventoryScenario(root, native!)).rejects.toThrow();
}, 60000);

test("the demo refuses relative native executable paths before creating a workspace", async () => {
  await expect(runInventoryScenario("/unused-inventory-test", "algal")).rejects.toThrow("absolute");
});
