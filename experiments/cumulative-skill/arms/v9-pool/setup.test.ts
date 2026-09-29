import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { scriptedExecutor } from "../../../../src/effects";
import { parseExperimentArm } from "../../../../src/experiment-run";
import { MemoryStore } from "../../../../src/store";
import { asObject, canonicalize, type JsonValue } from "../../../../src/values";
import { CONSUMED_SEEDS, RESERVED_RANGES } from "../../seeds-ledger";
import { ARM_BUDGET as V5_ARM_BUDGET, SEED_BUDGET as V5_SEED_BUDGET, SCORER as V5_SCORER,
  CORPORA, corpusTasks, frozenHoldoutTasks as v5Holdout, STUDY_SLUGS, taskLineageGroup as v5Group } from "../v5/shared";
import { BLOCKS as V6_BLOCKS } from "../v6/protocol";
import { BLOCKS as V7_BLOCKS } from "../v7/protocol";
import { BLOCKS as V8_BLOCKS } from "../v8/protocol";
import { buildStudyConfigs } from "./build";
import { ARMS, ARM_BUDGET, BLOCKS, blockById, blockConfigs, blockIndex, blockSeeds, generateBlock, learningTasks, loadProtocol,
  parseProtocol, POOL, POOL_BLOCK_IDS, PROTOCOL, PROTOCOL_DIGEST, ROUND_SCHEDULE, SCORER, SEED_BUDGET, seedTask, STUDY_ROOT, taskLineageGroup } from "./protocol";

const block = blockById("p-01");
const first = learningTasks(block)[0]!;
const seed = seedTask(block);
const library = asObject(JSON.parse(readFileSync(join(STUDY_ROOT, "pipeline", "record-triage.algal.json"), "utf8")), "library");
const generated = { ...library, key: "organism:v9-pool-generated-seed-fixture" };
const labels = (split: "train" | "validation") => Object.fromEntries(first.inputs.find((row) => row.split === split)!.expect.out.results.map((row) => [row.recordId, row.label]));

async function passingSeed() {
  const { generateStudySeed } = await import("./seed");
  const store = new MemoryStore();
  return generateStudySeed({ first: seed, corpus: block.id, blockId: block.id, protocolDigest: PROTOCOL_DIGEST, store,
    executors: [scriptedExecutor({ writer: { manifest: generated }, classify: [labels("train"), labels("train"), labels("validation")] })] });
}

describe("v9-pool protocol", () => {
  test("reproduces every planned draw without sharing a seed or ancestor with v5 through v8 or another block", () => {
    const previous = [...CORPORA.flatMap((path) => corpusTasks(join(STUDY_ROOT, "tasks", path))), ...STUDY_SLUGS.flatMap(v5Holdout)];
    const groups = new Set(previous.map(v5Group));
    const originalCount = groups.size;
    const previousSeeds = new Set(previous.flatMap((task) => [task.family.seed, Number(v5Group(task).split("-")[2])]));
    for (const b of [...V6_BLOCKS, ...V7_BLOCKS, ...V8_BLOCKS]) for (const drawn of Object.values(b.seeds)) previousSeeds.add(drawn);
    expect([...previousSeeds].sort((a, b) => a - b)).toEqual(PROTOCOL.previousSeeds);
    expect(PROTOCOL.previousSeeds).toEqual([...CONSUMED_SEEDS]);
    expect(PROTOCOL.previousSeeds).toHaveLength(167);
    const seeds = new Set(PROTOCOL.previousSeeds);
    expect(BLOCKS.map((b) => b.id)).toEqual([...POOL_BLOCK_IDS]);
    expect(BLOCKS).toHaveLength(POOL.size);
    for (const [index, b] of BLOCKS.entries()) {
      expect(blockIndex(b.id)).toBe(index);
      expect(b.stage).toBe("pool");
      expect(b.repetition).toBe(index + 1);
      expect(b.armOrder).toEqual([...ARMS.slice(index % 4), ...ARMS.slice(0, index % 4)]);
      expect(b.seeds).toEqual(blockSeeds(index));
      for (const seed of Object.values(b.seeds)) {
        expect(seeds.has(seed)).toBe(false);
        expect(seed >= RESERVED_RANGES.pool.first && seed <= RESERVED_RANGES.pool.last).toBe(true);
        seeds.add(seed);
      }
      const data = generateBlock(b);
      expect(data.seed.taskId).toBe(data.learning[0]!.taskId);
      expect(data.seed.inputs.map((batch) => batch.split)).toEqual(["train", "validation", "holdout", "development"]);
      expect(data.seed.inputs[3]!.records).toHaveLength(12);
      expect(canonicalize(data.seed.inputs.slice(0, 3) as unknown as JsonValue)).toBe(canonicalize(data.learning[0]!.inputs as unknown as JsonValue));
      expect(data.seed.digest).not.toBe(data.learning[0]!.digest);
      expect(taskLineageGroup(data.seed)).toBe(taskLineageGroup(data.learning[0]!));
      expect(data.learning).toHaveLength(40);
      expect(data.frozen).toHaveLength(8);
      expect(data.learning.every((task) => task.phase !== "shift")).toBe(true);
      expect(data.frozen.every((task) => task.phase === "shift")).toBe(true);
      expect(data.frozen.every((task) => task.inputs.find((batch) => batch.split === "holdout")!.records.length === 12)).toBe(true);
      expect(generateBlock(b)).toEqual(data);
      for (const task of [...data.learning, ...data.frozen]) {
        const group = taskLineageGroup(task);
        expect(groups.has(group)).toBe(false);
        groups.add(group);
      }
      for (const task of data.frozen) expect(taskLineageGroup(task)).toContain(`-${b.seeds.ancestor}-acquisition-`);
    }
    expect(seeds.size - PROTOCOL.previousSeeds.length).toBe(POOL.size * 4);
    expect(groups.size - originalCount).toBe(16 * 48);
    expect(ROUND_SCHEDULE).toEqual(PROTOCOL.seed.roundSchedule);
    expect([PROTOCOL.pool.size, PROTOCOL.pool.launchCap, PROTOCOL.pool.concurrency, PROTOCOL.pool.minimumQualified, PROTOCOL.pool.primarySize,
      PROTOCOL.pool.winsRequired, PROTOCOL.pool.frozenTasksPrimary]).toEqual([16, 16, 3, 6, 6, 5, 48]);
    expect(PROTOCOL.concurrency).toBe(POOL.concurrency);
    expect(loadProtocol()).toEqual(PROTOCOL);
    expect(digestCanonical(PROTOCOL as unknown as JsonValue)).toBe(PROTOCOL_DIGEST);
  });

  test("preserves v5 task difficulty, scorer, and budget ceilings, adding only the seed development batch", () => {
    const reference = JSON.parse(readFileSync(join(STUDY_ROOT, "configs", "v4", "acquisition.family.json"), "utf8"));
    for (const b of BLOCKS) {
      for (const [name, config] of Object.entries(blockConfigs(b))) {
        expect(config.shape).toEqual(reference.shape);
        expect(config.splits).toEqual(name === "seed" ? { ...reference.splits, development: 12 } : reference.splits);
      }
    }
    expect(canonicalize(SCORER)).toBe(canonicalize(V5_SCORER));
    expect(ARM_BUDGET).toEqual(V5_ARM_BUDGET);
    expect(SEED_BUDGET).toEqual(V5_SEED_BUDGET);
  });

  test("rejects missing blocks, seed reuse, schedule drift, and forged lineage", () => {
    const missing = structuredClone(PROTOCOL);
    missing.blocks.pop();
    expect(() => parseProtocol(missing)).toThrow("16 planned blocks");
    const shared = structuredClone(PROTOCOL);
    shared.blocks[3]!.seeds.ancestor = shared.blocks[0]!.seeds.acquisition;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    shared.blocks[3]!.seeds.ancestor = PROTOCOL.previousSeeds[0]!;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    const outside = structuredClone(PROTOCOL);
    outside.blocks[15]!.seeds.ancestor = RESERVED_RANGES.pool.last + 1;
    expect(() => parseProtocol(outside)).toThrow("seed formula");
    const order = structuredClone(PROTOCOL);
    order.blocks[5]!.armOrder = [...ARMS];
    expect(() => parseProtocol(order)).toThrow("arm order");
    expect(() => parseProtocol({ ...PROTOCOL, extra: true })).toThrow();
    const changed = structuredClone(PROTOCOL);
    changed.tasks.shape.scorerPassAt = 0.8;
    expect(() => parseProtocol(changed)).toThrow("family shape");
    const rounds = structuredClone(PROTOCOL);
    rounds.seed.roundSchedule[7] = "error-analysis";
    expect(() => parseProtocol(rounds)).toThrow("round schedule");
    expect(() => parseProtocol({ ...PROTOCOL, status: "design-only-no-inference" })).toThrow("status");
    const gate = structuredClone(PROTOCOL);
    gate.pool.winsRequired = 4;
    expect(() => parseProtocol(gate)).toThrow("pool gate");
    const task = generateBlock(block).frozen[0]!;
    expect(() => taskLineageGroup({ ...task, family: { ...task.family, revisedFrom: "acquisition-02" } })).toThrow("forged ancestor");
    expect(() => generateBlock({ ...block, seeds: { ...block.seeds, unseen: 1 } })).toThrow("block differs");
    expect(() => blockById("cal-a")).toThrow("unknown block");
    expect(() => blockIndex("a-r1")).toThrow("unknown block");
  });
});

describe("v9-pool matched configs", () => {
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
        expect([arm.generator!.args!.generation, arm.generator!.args!.round, arm.generator!.args!.development]).toEqual([1, ROUND_SCHEDULE[0]!, []]);
      }
    }
    const retained = parseExperimentArm(configs.retained!.arm);
    const normal = parseExperimentArm(configs.optimizer!.arm);
    const raw = parseExperimentArm(configs["optimizer-raw"]!.arm);
    expect(raw).toEqual({ ...normal, normalizeEmitted: false });
    expect(normal.generator).toEqual(retained.generator);
    expect(normal.reviser!.args!.training).toEqual(normal.generator!.args!.training);
  });

  test("rejects unqualified or substituted seeds and blocks outside the plan", async () => {
    const seed = await passingSeed();
    const manifest = manifestToJson(seed.manifest!);
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, qualified: false })).toThrow("qualified");
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, termination: "interrupted" })).toThrow("qualified");
    expect(() => buildStudyConfigs(block, seed.catalog, library, seed.summary)).toThrow("exact");
    expect(() => buildStudyConfigs("p-02", seed.catalog, manifest, seed.summary)).toThrow("another block");
    expect(() => buildStudyConfigs("cal-a", seed.catalog, manifest, seed.summary)).toThrow("unknown block");
    expect(() => buildStudyConfigs({ ...block, stage: "confirmatory" as "pool" }, seed.catalog, manifest, seed.summary)).toThrow("block differs");
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, duplicateRequests: 1 })).toThrow("duplicate writer request");
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, taskDigest: first.digest })).toThrow("another block, task");
    expect(() => buildStudyConfigs(block, seed.catalog, manifest, { ...seed.summary, protocol: digestCanonical({ wrong: true }) })).toThrow("protocol");
    expect(canonicalize(manifest)).toBe(canonicalize(manifestToJson(parseOrganismManifest(generated))));
  });
});
