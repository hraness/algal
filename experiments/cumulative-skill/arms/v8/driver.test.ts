import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import type { Digest } from "../../../../src/digest";
import { scriptedExecutor } from "../../../../src/effects";
import type { JsonValue } from "../../../../src/values";
import { zeroCost } from "../v5/evidence-support";
import { checkFreeze, freezeStudy, hash, readJson, startStage, verifyStage, writeNew, type FrozenIdentity } from "./guards";
import { PROTOCOL, ARMS, frozenHoldoutTasks } from "./protocol";
import { calibrationDecision, comparison, fixedConfig, inspectSession, type CalibrationRow, type ConfirmatoryRow, type SeedEvidence, type SessionSummary } from "./results";
import { datasets, executeConfig, mapConcurrent } from "./run";

const digest = `sha256:${"a".repeat(64)}` as Digest;
const seed = (qualified = true): SeedEvidence => ({ summary: { qualified, duplicateRequests: 0 } as SeedEvidence["summary"], cost: zeroCost(), catalog: null, manifest: null });
const session = (passed: number, tasks = 8): SessionSummary => ({ session: digest, outcome: "complete", observed: tasks, head: digest,
  cost: { ...zeroCost(), workUnits: 100 }, counts: { tasks, complete: tasks, labelsCorrect: passed * 12,
    recordsCorrect: passed * 12, recordsTotal: tasks * 12, summariesExact: passed, outputsExact: passed, scorerPassed: passed } });

describe("v8 stopping and comparison rules", () => {
  test("stops for failed seeds, saturation, and unfinished evaluation without dropping their costs", () => {
    const rows: CalibrationRow[] = ["cal-a", "cal-b", "cal-c", "cal-d"].map(block => ({ block, seed: seed(), frozen: session(6) }));
    expect(calibrationDecision(rows).proceed).toBe(true);
    rows[0]!.frozen = session(8);
    expect(calibrationDecision(rows).proceed).toBe(true);
    rows[1]!.frozen = session(7);
    expect(calibrationDecision(rows).proceed).toBe(false);
    expect(calibrationDecision(rows).headroomBlocks).toBe(2);
    rows[1]!.frozen = session(6);
    expect(calibrationDecision(rows.slice(0, 3)).reasons).toContain("all four planned calibration blocks are required");
    expect(calibrationDecision([rows[1]!, rows[0]!, rows[2]!, rows[3]!]).proceed).toBe(false);
    rows[2]!.seed = seed(false);
    rows[2]!.seed.cost.workUnits = 500;
    rows[2]!.frozen = null;
    expect(calibrationDecision(rows).proceed).toBe(false);
    expect(calibrationDecision(rows).cost.workUnits).toBe(800);
    rows[2]!.seed = seed();
    rows[2]!.frozen = { ...session(5), observed: 7 };
    expect(calibrationDecision(rows).proceed).toBe(false);
  });

  test("fully observed terminal errors count as failures and do not become missing observations", () => {
    const rows: CalibrationRow[] = ["cal-a", "cal-b", "cal-c", "cal-d"].map(block => ({ block, seed: seed(), frozen: session(5) }));
    rows[0]!.frozen!.counts.complete = 5;
    expect(calibrationDecision(rows).proceed).toBe(true);
  });

  test("requires repeated primary wins and all planned primary blocks, reports secondary gaps separately", () => {
    const rows: ConfirmatoryRow[] = PROTOCOL.blocks.filter(block => block.stage === "confirmatory").map(block => ({ block,
      learning: { block: block.id, seed: seed(), arms: Object.fromEntries(ARMS.map(arm => [arm, session(30, 40)])) },
      frozen: Object.fromEntries(ARMS.map(arm => [arm, session(arm === "fixed" ? 3 : 6)])),
    }));
    expect(comparison(rows, zeroCost()).status).toBe("descriptive-repeatability-rule-met");
    delete rows[0]!.frozen["optimizer-raw"];
    const secondary = comparison(rows, zeroCost());
    expect(secondary.primaryComplete).toBe(true);
    expect(secondary.secondaryComplete).toBe(false);
    expect(secondary.arms.fixed.planned).toBe(72);
    rows[0]!.frozen.optimizer = session(3);
    rows[1]!.frozen.optimizer = session(3);
    expect(comparison(rows, zeroCost()).status).toBe("descriptive-repeatability-rule-not-met");
    delete rows[2]!.frozen.optimizer;
    expect(comparison(rows, zeroCost()).status).toBe("insufficient");
    expect(comparison([...rows.slice(0, 8), rows[0]!], zeroCost()).status).toBe("insufficient");
  });
});

describe("v8 execution guards", () => {
  test("an attempt claim cannot be retried and its input cannot be substituted", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v8-stage-"));
    try {
      const freeze = { digest } as FrozenIdentity;
      const path = startStage(root, freeze, "cal-a", "seed", { input: 1 });
      expect(() => startStage(root, freeze, "cal-a", "seed", { input: 1 })).toThrow("already started");
      expect(() => verifyStage(root, freeze, "cal-a", "seed", { input: 1 })).toThrow();
      writeNew(join(path, "result.json"), { finished: true });
      expect(verifyStage(root, freeze, "cal-a", "seed", { input: 1 })).toEqual({ finished: true });
      expect(() => verifyStage(root, freeze, "cal-a", "seed", { input: 2 })).toThrow("binding mismatch");
      writeFileSync(join(path, "input.json"), '{"input":2}');
      expect(() => verifyStage(root, freeze, "cal-a", "seed", { input: 1 })).toThrow("snapshot mismatch");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("a failed lane waits for its in-flight peer before returning", async () => {
    const finished: number[] = [];
    await expect(mapConcurrent([0, 1, 2], 2, async item => {
      if (item === 0) throw new Error("fixture failure");
      await new Promise(resolve => setTimeout(resolve, 10));
      finished.push(item);
    })).rejects.toThrow("study lane failed");
    expect(finished).toEqual([1]);
  });

  test("frozen execution rejects a substituted fixed manifest even with rewritten config binding", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v8-fixed-"));
    try {
      const study = join(root, "study");
      const data = datasets();
      const freeze = freezeStudy(study, PROTOCOL, data, "a".repeat(40));
      expect(checkFreeze(study, PROTOCOL, data).digest).toBe(freeze.digest);
      const block = PROTOCOL.blocks[0]!;
      const tasks = frozenHoldoutTasks(block).slice(0, 1);
      const manifest = manifestToJson(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:fixed-fixture", name: "fixed fixture",
        cells: [{ id: "in", kind: "input", outputs: { records: { type: "json" }, spec: { type: "json" } } },
          { id: "out", kind: "const", outputs: { value: { type: "json", value: tasks[0]!.inputs.find(batch => batch.split === "holdout")!.expect.out } } }],
        edges: [], interface: { inputs: { records: { cell: "in", port: "records" }, spec: { cell: "in", port: "spec" } }, outputs: { out: { cell: "out", port: "value" } } },
        budgets: { maxSteps: 8, maxAgentCalls: 2, maxWork: 500000 },
      }));
      const config = fixedConfig(manifest, tasks);
      await executeConfig({ study, freeze, block, stage: "frozen-fixed", config, executor: scriptedExecutor({}) });
      const checked = await inspectSession(study, freeze, block, "frozen-fixed", config, tasks);
      expect(checked.counts.scorerPassed).toBe(1);
      await expect(executeConfig({ study, freeze, block, stage: "frozen-fixed", config, executor: scriptedExecutor({}) })).rejects.toThrow("store already exists");
      const replacement = fixedConfig({ ...(manifest as object), key: "organism:substituted" } as JsonValue, tasks);
      const attempt = join(study, block.id, "attempts", "frozen-fixed");
      const binding = JSON.parse(readFileSync(join(attempt, "binding.json"), "utf8"));
      writeFileSync(join(attempt, "binding.json"), JSON.stringify({ ...binding, input: hash(replacement) }));
      writeFileSync(join(attempt, "input.json"), JSON.stringify(replacement));
      await expect(inspectSession(study, freeze, block, "frozen-fixed", replacement, tasks)).rejects.toThrow("different manifest");
      const saved = readJson(join(study, "protocol.json")) as Record<string, unknown>;
      writeFileSync(join(study, "protocol.json"), JSON.stringify({ ...saved, concurrency: 1 }));
      expect(() => checkFreeze(study, PROTOCOL, data)).toThrow("protocol differs");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
