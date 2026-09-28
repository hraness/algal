import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { scriptedExecutor, type EffectRequest } from "../../../../src/effects";
import { generateExperimentTasks, parseExperimentFamilyConfig } from "../../../../src/experiment-family";
import { parseExperimentArm } from "../../../../src/experiment-run";
import { checkHabitatBudgetEvidence, parseHabitatBudget } from "../../../../src/habitat-budget";
import { builtinRegistry } from "../../../../src/registry";
import { MemoryStore } from "../../../../src/store";
import { asObject, type JsonValue } from "../../../../src/values";
import { buildStudyConfigs } from "./build";
import { generateStudySeed } from "./seed";
import { ARM_BUDGET, CORPORA, corpusTasks, frozenHoldoutTasks, learningTasks, SEED_BUDGET, STUDY_ROOT, STUDY_SLUGS, taskLineageGroup } from "./shared";

const corpus = join(STUDY_ROOT, "tasks", "v4");
const first = learningTasks(corpus)[0]!;
const library = asObject(JSON.parse(readFileSync(join(STUDY_ROOT, "pipeline", "record-triage.algal.json"), "utf8")), "library");
const generated = { ...library, key: "organism:generated-seed-fixture" };
const rejected = { ...generated, key: "organism:rejected-seed-fixture" };
const labels = (split: "train" | "validation") => Object.fromEntries(first.inputs.find((b) => b.split === split)!.expect.out.results.map((r) => [r.recordId, r.label]));

function execution(responses: Record<string, JsonValue>) {
  const requests: EffectRequest[] = [];
  const inner = scriptedExecutor(responses);
  return {
    requests,
    executors: [{ ...inner, async execute(request: EffectRequest) { requests.push(request); return inner.execute(request); } }],
  };
}

async function passingSeed() {
  const store = new MemoryStore();
  const result = await generateStudySeed({ first, corpus, store, executors: [scriptedExecutor({
    writer: { manifest: generated }, classify: [labels("train"), labels("train"), labels("validation")],
  })] });
  return { ...result, store };
}

describe("v5 generated seed", () => {
  test("keeps the first passing generation and charges invalid and failing predecessors", async () => {
    const store = new MemoryStore();
    const f = execution({
      writer: [{ manifest: {} }, { manifest: rejected }, { manifest: generated }],
      classify: [labels("train"), labels("train"), {}, labels("train"), labels("train"), labels("validation")],
    });
    const result = await generateStudySeed({ first, corpus, store, executors: f.executors });
    expect(result.summary.qualified).toBe(true);
    expect(result.summary.attempts).toHaveLength(3);
    expect(result.summary.attempts[0]!.outcome).toBe("invalid");
    expect(result.summary.attempts[0]!.generator).not.toBeNull();
    expect(result.summary.attempts[1]!.validation).toEqual({ passed: 0, total: 1 });
    expect(result.summary.attempts[1]!.report).not.toBeNull();
    const digest = digestCanonical(manifestToJson(parseOrganismManifest(generated)));
    expect(result.summary.manifest).toBe(digest);
    expect(result.catalog?.entries[0]?.manifest).toBe(digest);
    expect(result.catalog?.entries[0]?.taskId).toBe("seed-acquisition-01-3");
    expect(result.summary.taskDigest).toBe(first.digest);
    const account = parseHabitatBudget(await store.getValue(result.summary.account));
    expect(account.limits).toEqual(SEED_BUDGET);
    expect(account.runs).toHaveLength(9);
    expect(account.charged.attempts).toBe(9);
    const evidence = await checkHabitatBudgetEvidence(account, store, { fns: builtinRegistry() });
    expect(evidence.mismatches).toEqual([]);
    expect(evidence.checkedReceipts).toBe(9);
    const heldoutIds = first.inputs.find((b) => b.split === "holdout")!.records.map((r) => r.id);
    for (const request of f.requests) {
      const inputs = asObject(request.context.inputs, "request inputs");
      if (request.cellId === "writer") {
        expect(Object.keys(asObject(inputs.task, "generator task"))).toEqual(["taxonomy", "recordSchema", "rules", "outputFormat"]);
      } else {
        const records = inputs.records as { id: string }[];
        expect(records.some((r) => heldoutIds.includes(r.id))).toBe(false);
      }
    }
  });

  test("refuses a catalog when all generated candidates fail machine validation", async () => {
    const store = new MemoryStore();
    const result = await generateStudySeed({ first, corpus, store, maxGenerations: 1,
      executors: [scriptedExecutor({ writer: { manifest: generated }, classify: {} })] });
    expect(result.catalog).toBeNull();
    expect(result.manifest).toBeNull();
    expect(result.summary.qualified).toBe(false);
    expect(result.summary.termination).toBe("generation-limit");
    expect(result.summary.attempts[0]!.validation).toEqual({ passed: 0, total: 1 });
    expect(result.summary.attempts[0]!.report).not.toBeNull();
    expect(parseHabitatBudget(await store.getValue(result.summary.account)).charged.runs).toBe(4);
  });

  test("does not renew the seed ceiling after a refused candidate reservation", async () => {
    const store = new MemoryStore();
    const result = await generateStudySeed({ first, corpus, store, budget: { work: 500_000, attempts: 64, runs: 64 },
      executors: [scriptedExecutor({ writer: { manifest: generated } })] });
    expect(result.summary.qualified).toBe(false);
    expect(result.summary.termination).toBe("budget-limit");
    expect(result.summary.attempts).toHaveLength(1);
    expect(result.summary.attempts[0]!.outcome).toBe("exhausted");
    const account = parseHabitatBudget(await store.getValue(result.summary.account));
    expect(account.outcome).toBe("exhausted");
    expect(account.runs).toHaveLength(1);
    expect((await checkHabitatBudgetEvidence(account, store)).mismatches).toEqual([]);
  });
});

describe("v5 matched setup", () => {
  test("all arms start from the exact generated seed and share only learning records", async () => {
    const seed = await passingSeed();
    const configs = buildStudyConfigs(corpus, seed.catalog, manifestToJson(seed.manifest!), seed.summary);
    for (const [name, config] of Object.entries(configs)) {
      const arm = parseExperimentArm(config.arm);
      expect(arm.budget).toEqual(ARM_BUDGET);
      expect(config.tasks).toHaveLength(40);
      expect(config.tasks.every((t) => t.phase !== "shift" && t.expect !== undefined)).toBe(true);
      if (name === "fixed") {
        expect(digestCanonical(manifestToJson(arm.manifest!))).toBe(seed.summary.manifest!);
        expect(arm.manifest!.key).toBe(generated.key);
      } else expect(config.catalog).toEqual(seed.catalog!);
    }
    const normal = parseExperimentArm(configs.optimizer!.arm);
    const raw = parseExperimentArm(configs["optimizer-raw"]!.arm);
    expect(normal.normalizeEmitted).toBe(true);
    expect(raw.normalizeEmitted).toBe(false);
    expect(raw).toEqual({ ...normal, normalizeEmitted: false });
    expect(normal.generator).toEqual(parseExperimentArm(configs.retained!.arm).generator);
  });

  test("rejects unqualified, substituted, and other-corpus seeds", async () => {
    const seed = await passingSeed();
    const args = [corpus, seed.catalog, manifestToJson(seed.manifest!)] as const;
    expect(() => buildStudyConfigs(...args, { ...seed.summary, qualified: false })).toThrow("qualified");
    expect(() => buildStudyConfigs(corpus, seed.catalog, library, seed.summary)).toThrow("exact");
    expect(() => buildStudyConfigs(join(STUDY_ROOT, "tasks", "v5", "b"), seed.catalog, args[2], seed.summary)).toThrow("corpus");
  });

  test("new holdouts reproduce and share no ancestor group with learning or previous shift tasks", () => {
    const existing = CORPORA.flatMap((path) => corpusTasks(join(STUDY_ROOT, "tasks", path)));
    const learnedGroups = new Set(existing.map(taskLineageGroup));
    const frozenGroups = new Set<string>();
    for (const slug of STUDY_SLUGS) {
      const tasks = frozenHoldoutTasks(slug);
      expect(tasks).toHaveLength(8);
      const config = parseExperimentFamilyConfig(JSON.parse(readFileSync(join(STUDY_ROOT, "configs", "v5", "holdout", `${slug}.family.json`), "utf8")));
      expect(generateExperimentTasks(config).tasks).toEqual(tasks);
      for (const task of tasks) {
        expect(task.phase).toBe("shift");
        const group = taskLineageGroup(task);
        expect(learnedGroups.has(group)).toBe(false);
        expect(frozenGroups.has(group)).toBe(false);
        frozenGroups.add(group);
      }
    }
    expect(frozenGroups.size).toBe(24);
    for (const path of CORPORA) {
      const tasks = corpusTasks(join(STUDY_ROOT, "tasks", path));
      const original = tasks.find((t) => t.phase === "acquisition")!;
      const shifted = tasks.find((t) => t.phase === "shift")!;
      expect(taskLineageGroup(original)).toBe(taskLineageGroup(shifted));
    }
  });
});
