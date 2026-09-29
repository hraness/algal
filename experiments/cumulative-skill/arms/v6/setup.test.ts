import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { scriptedExecutor } from "../../../../src/effects";
import { parseExperimentArm } from "../../../../src/experiment-run";
import { MemoryStore } from "../../../../src/store";
import { asObject, canonicalize, type JsonValue } from "../../../../src/values";
import { ARM_BUDGET as V5_ARM_BUDGET, SEED_BUDGET as V5_SEED_BUDGET, SCORER as V5_SCORER,
  CORPORA, corpusTasks, frozenHoldoutTasks as v5Holdout, STUDY_SLUGS, taskLineageGroup as v5Group } from "../v5/shared";
import { buildStudyConfigs } from "./build";
import { ARMS, ARM_BUDGET, BLOCKS, blockById, blockConfigs, generateBlock, learningTasks, loadProtocol,
  parseProtocol, PROTOCOL, PROTOCOL_DIGEST, SCORER, SEED_BUDGET, STUDY_ROOT, taskLineageGroup } from "./protocol";

const block = blockById("a-r1");
const first = learningTasks(block)[0]!;
const library = asObject(JSON.parse(readFileSync(join(STUDY_ROOT, "pipeline", "record-triage.algal.json"), "utf8")), "library");
const generated = { ...library, key: "organism:v6-generated-seed-fixture" };
const labels = (split: "train" | "validation") => Object.fromEntries(first.inputs.find((row) => row.split === split)!.expect.out.results.map((row) => [row.recordId, row.label]));

async function passingSeed() {
  const { generateStudySeed } = await import("./seed");
  const store = new MemoryStore();
  return generateStudySeed({ first, corpus: block.id, blockId: block.id, protocolDigest: PROTOCOL_DIGEST, store,
    executors: [scriptedExecutor({ writer: { manifest: generated }, classify: [labels("train"), labels("train"), labels("validation")] })] });
}

describe("v6 protocol", () => {
  test("reproduces every planned draw without sharing a seed or ancestor with v5 or another block", () => {
    const previous = [...CORPORA.flatMap((path) => corpusTasks(join(STUDY_ROOT, "tasks", path))), ...STUDY_SLUGS.flatMap(v5Holdout)];
    const groups = new Set(previous.map(v5Group));
    const originalCount = groups.size;
    const previousSeeds = new Set(previous.flatMap((task) => [task.family.seed, Number(v5Group(task).split("-")[2])]));
    expect([...previousSeeds].sort((a, b) => a - b)).toEqual(PROTOCOL.previousSeeds);
    const seeds = new Set(PROTOCOL.previousSeeds);
    for (const b of BLOCKS) {
      for (const seed of Object.values(b.seeds)) {
        expect(seeds.has(seed)).toBe(false);
        seeds.add(seed);
      }
      const data = generateBlock(b);
      expect(data.learning).toHaveLength(40);
      expect(data.frozen).toHaveLength(8);
      expect(data.learning.every((task) => task.phase !== "shift")).toBe(true);
      expect(data.frozen.every((task) => task.phase === "shift")).toBe(true);
      expect(generateBlock(b)).toEqual(data);
      for (const task of [...data.learning, ...data.frozen]) {
        const group = taskLineageGroup(task);
        expect(groups.has(group)).toBe(false);
        groups.add(group);
      }
      for (const task of data.frozen) expect(taskLineageGroup(task)).toContain(`-${b.seeds.ancestor}-acquisition-`);
    }
    expect(groups.size - originalCount).toBe(12 * 48);
    expect(loadProtocol()).toEqual(PROTOCOL);
    expect(digestCanonical(PROTOCOL as unknown as JsonValue)).toBe(PROTOCOL_DIGEST);
  });

  test("preserves v5 task difficulty, scorer, and budget ceilings", () => {
    const reference = JSON.parse(readFileSync(join(STUDY_ROOT, "configs", "v4", "acquisition.family.json"), "utf8"));
    for (const b of BLOCKS) {
      for (const config of Object.values(blockConfigs(b))) {
        expect(config.shape).toEqual(reference.shape);
        expect(config.splits).toEqual(reference.splits);
      }
    }
    expect(canonicalize(SCORER)).toBe(canonicalize(V5_SCORER));
    expect(ARM_BUDGET).toEqual(V5_ARM_BUDGET);
    expect(SEED_BUDGET).toEqual(V5_SEED_BUDGET);
  });

  test("rejects missing blocks, seed reuse, schedule drift, and forged lineage", () => {
    const missing = structuredClone(PROTOCOL);
    missing.blocks.pop();
    expect(() => parseProtocol(missing)).toThrow("12 planned blocks");
    const shared = structuredClone(PROTOCOL);
    shared.blocks[3]!.seeds.ancestor = shared.blocks[0]!.seeds.acquisition;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    shared.blocks[3]!.seeds.ancestor = PROTOCOL.previousSeeds[0]!;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    const order = structuredClone(PROTOCOL);
    order.blocks[4]!.armOrder = [...ARMS];
    expect(() => parseProtocol(order)).toThrow("arm order");
    expect(() => parseProtocol({ ...PROTOCOL, extra: true })).toThrow();
    const changed = structuredClone(PROTOCOL);
    changed.tasks.shape.scorerPassAt = 0.8;
    expect(() => parseProtocol(changed)).toThrow("family shape");
    const task = generateBlock(block).frozen[0]!;
    expect(() => taskLineageGroup({ ...task, family: { ...task.family, revisedFrom: "acquisition-02" } })).toThrow("forged ancestor");
    expect(() => generateBlock({ ...block, seeds: { ...block.seeds, unseen: 1 } })).toThrow("block differs");
  });
});

describe("v6 matched configs", () => {
  test("shares the generated seed and train examples while keeping frozen tasks out", async () => {
    const seed = await passingSeed();
    expect(seed.summary.qualified).toBe(true);
    const configs = buildStudyConfigs(block, seed.catalog, manifestToJson(seed.manifest!), seed.summary);
    expect(Object.keys(configs)).toEqual([...ARMS]);
    for (const [name, config] of Object.entries(configs)) {
      const arm = parseExperimentArm(config.arm);
      expect(arm.budget).toEqual(ARM_BUDGET);
      expect(config.tasks).toHaveLength(40);
      for (const task of config.tasks) {
        expect(task.phase).not.toBe("shift");
        expect(task.spec).toEqual(task.args.spec!);
        expect(task.expect).toBeDefined();
      }
      if (name === "fixed") {
        expect(digestCanonical(manifestToJson(arm.manifest!))).toBe(seed.summary.manifest!);
        expect(arm.manifest!.key).toBe(generated.key);
      } else {
        expect(config.catalog).toEqual(seed.catalog!);
        const train = first.inputs.find((row) => row.split === "train")!;
        expect(arm.generator!.args!.training).toEqual({ records: train.records, expected: train.expect.out });
      }
    }
    const retained = parseExperimentArm(configs.retained!.arm);
    const normal = parseExperimentArm(configs.optimizer!.arm);
    const raw = parseExperimentArm(configs["optimizer-raw"]!.arm);
    expect(raw).toEqual({ ...normal, normalizeEmitted: false });
    expect(normal.generator).toEqual(retained.generator);
    expect(normal.reviser!.args!.training).toEqual(normal.generator!.args!.training);
  });

  test("rejects unqualified or substituted seeds and calibration learning", async () => {
    const seed = await passingSeed();
    const manifest = manifestToJson(seed.manifest!);
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, qualified: false })).toThrow("qualified");
    expect(() => buildStudyConfigs(block, seed.catalog, library, seed.summary)).toThrow("exact");
    expect(() => buildStudyConfigs("a-r2", seed.catalog, manifest, seed.summary)).toThrow("another block");
    expect(() => buildStudyConfigs("cal-a", seed.catalog, manifest, seed.summary)).toThrow("calibration");
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, protocol: digestCanonical({ wrong: true }) })).toThrow("protocol");
    expect(canonicalize(manifest)).toBe(canonicalize(manifestToJson(parseOrganismManifest(generated))));
  });
});
