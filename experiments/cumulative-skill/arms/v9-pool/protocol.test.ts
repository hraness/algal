import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { digestCanonical } from "../../../../src/digest";
import { canonicalize, type JsonValue } from "../../../../src/values";
import { ARMS_ROOT, LEDGER_SEEDS, RESERVED_RANGES } from "../../seeds-ledger";
import { ARMS, ARM_BUDGET, BLOCKS, blockById, blockIndex, blockSeeds, COMPARISON, FROZEN_BUDGET, frozenHoldoutTasks, frozenTasks,
  generateBlock, LEARNING_BUDGET, learningTasks, loadProtocol, parseProtocol, POOL, POOL_BLOCK_IDS, POOL_CONTRACT, PREVIOUS_SEEDS, PROTOCOL,
  PROTOCOL_CONTRACT, PROTOCOL_DIGEST, RECONCILIATION_CONTRACT, RESULT_CONTRACT, ROUND_SCHEDULE, SEED_BUDGET, seedTask, STUDY_ID,
  taskLineageGroup } from "./protocol";

type Block = { id: string; stage: string; repetition: number; armOrder: string[]; seeds: Record<string, number> };
type RawProtocol = { contract: string; study: string; status: string; blocks: Block[]; previousSeeds: number[] } & Record<string, JsonValue>;
const raw = JSON.parse(readFileSync(join(import.meta.dir, "protocol.json"), "utf8")) as RawProtocol;
const v8 = JSON.parse(readFileSync(join(import.meta.dir, "..", "v8", "protocol.json"), "utf8")) as RawProtocol;
const LINE_RULE = "If fewer than six of sixteen seed searches qualify, or the primary rule is not met, the conditional-pool line ends; " +
  "no larger pool, smaller primary set, lower win count, redrawn blocks, extra arms, or changed comparison rule is proposed on this axis.";

describe("v9-pool protocol file", () => {
  test("is an implemented protocol without live study artifacts", () => {
    expect(raw.contract).toBe("algal.study-protocol.v3");
    expect(raw.study).toBe("cumulative-skill-v9-pool");
    expect(raw.status).toBe("implemented-no-inference");
    for (const artifact of ["freeze.json", "pool.json", "results.json", "replay.json", "stores"]) {
      expect(existsSync(join(import.meta.dir, artifact))).toBe(false);
    }
    expect(raw.blocks).toHaveLength(16);
    expect(raw.blocks.map((b) => b.id)).toEqual(Array.from({ length: 16 }, (_, i) => `p-${String(i + 1).padStart(2, "0")}`));
    expect(raw.blocks.every((b) => b.stage === "pool")).toBe(true);
    expect(raw.blocks.map((b) => b.repetition)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(raw.blocks[0]!.armOrder).toEqual(["fixed", "retained", "optimizer", "optimizer-raw"]);
    expect(raw.blocks[1]!.armOrder).toEqual(["retained", "optimizer", "optimizer-raw", "fixed"]);
    expect(raw.blocks[3]!.armOrder).toEqual(["optimizer-raw", "fixed", "retained", "optimizer"]);
    expect(raw.blocks[4]!.armOrder).toEqual(raw.blocks[0]!.armOrder);
    expect(PROTOCOL.seed.roundSchedule).toHaveLength(8);
    expect(PROTOCOL.seed.developmentFeedback.labels).toBe(false);
    expect(PROTOCOL.seed.writerNeverReceives).toContain("selection labels");
    expect(PROTOCOL.seed.writerNeverReceives).toContain("selection scores");
    expect(PROTOCOL.basis.lineRule).toBe(LINE_RULE);
    expect(PROTOCOL.basis.v8Protocol).toBe("dc64c02f9274ae92f5475cc9a9a2a4f2c8e4fd57");
    expect(PROTOCOL.basis.change).toContain("estimand");
    expect(PROTOCOL.basis.change).toContain("favors the optimizer");
    expect([PROTOCOL.pool.size, PROTOCOL.pool.minimumQualified, PROTOCOL.pool.primarySize, PROTOCOL.pool.winsRequired]).toEqual([16, 6, 6, 5]);
    expect(PROTOCOL.pool.nullTail).toContain("7/64");
    expect(PROTOCOL.comparison.successRule).toContain("descriptive-repeatability-rule-met");
    expect(PROTOCOL.comparison.requiredCoverage).toEqual(["six primary blocks", "fixed arm", "optimizer arm"]);
    expect(PROTOCOL.comparison.offlineReading).toContain("2 of 5 exhausted searches");
    expect(PROTOCOL.runDiscipline).toContain("detached");
    expect(PROTOCOL.freezeRule).toContain("seeds ledger");
    expect("calibration" in raw).toBe(false);
    expect("replication" in raw).toBe(false);
  });

  test("keeps every protocol string within the 1024-byte bound", () => {
    const visit = (value: JsonValue, path: string): void => {
      if (typeof value === "string") expect(Buffer.byteLength(value), path).toBeLessThanOrEqual(1024);
      else if (Array.isArray(value)) value.forEach((item, i) => visit(item, `${path}[${i}]`));
      else if (value !== null && typeof value === "object") for (const [key, item] of Object.entries(value)) visit(item, `${path}.${key}`);
    };
    visit(raw as unknown as JsonValue, "protocol");
  });

  test("carries the v8 seed procedure byte for byte and changes only the design", () => {
    for (const key of ["executor", "concurrency", "seed", "budgets"]) expect(canonicalize(raw[key]!)).toBe(canonicalize(v8[key]!));
    const { v5ToV8AncestorsExcluded, ...tasks } = raw.tasks as Record<string, JsonValue>;
    const { v5ToV7AncestorsExcluded, ...v8Tasks } = v8.tasks as Record<string, JsonValue>;
    expect([v5ToV8AncestorsExcluded, v5ToV7AncestorsExcluded]).toEqual([true, true]);
    expect(canonicalize(tasks)).toBe(canonicalize(v8Tasks));
    const unchanged = raw.unchanged as Record<string, JsonValue>;
    const v8Unchanged = v8.unchanged as Record<string, JsonValue>;
    for (const key of ["family", "scorerPassAt", "confirmatoryArms", "claims"]) expect(unchanged[key]).toEqual(v8Unchanged[key]!);
    expect("calibrationGate" in unchanged).toBe(false);
    const accounting = raw.costAccounting as Record<string, JsonValue>;
    const v8Accounting = v8.costAccounting as Record<string, JsonValue>;
    for (const key of Object.keys(v8Accounting)) expect(accounting[key]).toEqual(v8Accounting[key]!);
    expect(new Set(Object.keys(raw))).not.toEqual(new Set(Object.keys(v8)));
  });

  test("task and ancestor seeds are unique, follow the formula, and stay disjoint from the ledger", () => {
    const prior = new Set(raw.previousSeeds);
    const current = raw.blocks.flatMap((b) => Object.values(b.seeds));
    expect(new Set(current).size).toBe(current.length);
    expect(current.every((seed) => !prior.has(seed) && !LEDGER_SEEDS.has(seed))).toBe(true);
    expect(current.every((seed) => seed >= RESERVED_RANGES.pool.first && seed <= RESERVED_RANGES.pool.last)).toBe(true);
    expect(Math.min(...current)).toBe(93000001);
    expect(Math.max(...current)).toBe(93000064);
    expect(prior.size).toBe(167);
    raw.blocks.forEach((b, i) => expect(b.seeds).toEqual(blockSeeds(i)));
    expect(raw.previousSeeds).toEqual([...v8.previousSeeds, ...v8.blocks.flatMap((b) => Object.values(b.seeds))]);
    expect(PREVIOUS_SEEDS).toEqual(raw.previousSeeds);
    expect([...prior].every((seed) => LEDGER_SEEDS.has(seed))).toBe(true);
  });
});

/** The contract ids v9-pool reuses from v8 unchanged, each with the exported
 * types whose depth-0 keys are that record's key set (nested records listed
 * beside their root). Every other id v9-pool defines must be its own. */
const SHARED_CONTRACTS: Record<string, { file: string; types: string[] }> = {
  "algal.study-freeze.v1": { file: "guards.ts", types: ["FrozenIdentity"] },
  "algal.study-stage.v1": { file: "guards.ts", types: ["StageAttempt"] },
  "algal.study-seed.v3": { file: "seed.ts", types: ["SeedSummary", "SeedAttempt", "SeedPlan"] },
  "algal.study-development-score.v2": { file: "seed.ts", types: ["DevelopmentRecord"] },
};

/** `algal.study-*` ids that records outside the arms directories already
 * carry with their own key sets: no arm may define them. The v8 lane's
 * hand-made study-level reconciliation is read back from its archive below,
 * so this list cannot drift from what the archive carries. */
const EXTERNAL_CONTRACTS: Record<string, string> = {
  "algal.study-reconciliation.v1": "results/v8/calibration-2026-09-29/evidence.tar.gz: study/reconciliation.json",
};
const V8_ARCHIVE = join(ARMS_ROOT, "..", "results", "v8", "calibration-2026-09-29", "evidence.tar.gz");

/** One member of a gzipped ustar archive, read without a subprocess. */
function archivedFile(archive: string, member: string): string {
  const bytes = Bun.gunzipSync(readFileSync(archive));
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start: number, length: number) => Buffer.from(header.subarray(start, start + length)).toString("utf8").replace(/\0[\s\S]*$/, "");
    const prefix = field(345, 155);
    const name = prefix === "" ? field(0, 100) : `${prefix}/${field(0, 100)}`;
    const size = parseInt(field(124, 12), 8);
    if (name === member) return Buffer.from(bytes.subarray(offset + 512, offset + 512 + size)).toString("utf8");
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${member} is not in ${archive}`);
}

/** Every `algal.study-*.vN` literal in an arm's non-test sources. */
function contractIds(dir: string): Set<string> {
  const ids = new Set<string>();
  for (const file of readdirSync(dir).sort()) {
    if (!/\.(?:ts|json)$/.test(file) || file.endsWith(".test.ts")) continue;
    for (const match of readFileSync(join(dir, file), "utf8").matchAll(/"(algal\.study-[a-z-]+\.v[0-9]+)"/g)) ids.add(match[1]!);
  }
  return ids;
}

/** The sorted depth-0 keys of `export type <name> = ... { ... };` in a source
 * file: the object literal's members split at top-level semicolons, doc
 * comments removed, so a renamed member alias (v9-pool's `SeedTermination`)
 * does not change the key set while an added or removed member does. */
function typeKeys(source: string, name: string): string[] {
  const start = source.indexOf(`export type ${name} = `);
  if (start < 0) throw new Error(`type ${name} not found`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let close = open;
  for (; close < source.length; close++) {
    if (source[close] === "{") depth++;
    else if (source[close] === "}" && --depth === 0) break;
  }
  if (depth !== 0) throw new Error(`type ${name} is unterminated`);
  const body = source.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
  const keys: string[] = [];
  const member = (segment: string): void => {
    const key = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\??:/.exec(segment)?.[1];
    if (key === undefined) throw new Error(`type ${name}: member without a key: ${segment.trim()}`);
    keys.push(key);
  };
  let segment = "";
  depth = 0;
  for (const char of body) {
    if (char === "{") depth++;
    else if (char === "}") depth--;
    if (char === ";" && depth === 0) {
      member(segment);
      segment = "";
    } else segment += char;
  }
  // The last member may omit its separator, as `StageAttempt` does.
  if (segment.trim() !== "") member(segment);
  if (new Set(keys).size !== keys.length) throw new Error(`type ${name}: duplicate key`);
  return keys.sort();
}

describe("v9-pool protocol module", () => {
  test("shares a contract id with another arm only for an identical key set", () => {
    const ids = [PROTOCOL_CONTRACT, POOL_CONTRACT, RESULT_CONTRACT, RECONCILIATION_CONTRACT];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^algal\.study-[a-z-]+\.v[1-9][0-9]*$/);
    expect(STUDY_ID).toBe("cumulative-skill-v9-pool");
    expect(PROTOCOL.contract).toBe(PROTOCOL_CONTRACT);
    expect(PROTOCOL.study).toBe(STUDY_ID);
    const own = contractIds(join(ARMS_ROOT, "v9-pool"));
    for (const id of ids) expect(own.has(id), `${id} is not defined by v9-pool`).toBe(true);
    for (const id of Object.keys(SHARED_CONTRACTS)) expect(own.has(id), `${id} is not defined by v9-pool`).toBe(true);
    const elsewhere = new Map<string, string[]>();
    for (const name of readdirSync(ARMS_ROOT).sort()) {
      if (name === "v9-pool") continue;
      for (const id of contractIds(join(ARMS_ROOT, name))) elsewhere.set(id, [...(elsewhere.get(id) ?? []), name]);
    }
    for (const id of [...own].sort()) {
      const arms = elsewhere.get(id) ?? [];
      const shared = SHARED_CONTRACTS[id];
      expect(EXTERNAL_CONTRACTS[id], `${id} is already carried by ${EXTERNAL_CONTRACTS[id]}`).toBeUndefined();
      if (shared === undefined) {
        expect(arms, `${id} is also defined by ${arms.join(", ")}`).toEqual([]);
        continue;
      }
      expect(arms, `${id} is shared with v8`).toContain("v8");
      const ours = readFileSync(join(ARMS_ROOT, "v9-pool", shared.file), "utf8");
      const theirs = readFileSync(join(ARMS_ROOT, "v8", shared.file), "utf8");
      for (const type of shared.types) expect(typeKeys(ours, type), `${id}: ${type} key set differs from v8`).toEqual(typeKeys(theirs, type));
    }
  });

  test("does not reuse the id of the archived hand-made reconciliation, whose key set differs", () => {
    const archived = JSON.parse(archivedFile(V8_ARCHIVE, "study/reconciliation.json")) as Record<string, unknown>;
    expect(archived.contract).toBe("algal.study-reconciliation.v1");
    expect(EXTERNAL_CONTRACTS[archived.contract as string]).toBeDefined();
    expect(Object.keys(archived).sort()).toEqual(["cause", "completeRows", "contract", "decision", "decisionScope", "driverArtifacts", "freeze",
      "incomplete", "replay", "retry", "sourceCommit", "status", "study"]);
    expect(RECONCILIATION_CONTRACT).toBe("algal.study-stage-reconciliation.v1");
    const ours = typeKeys(readFileSync(join(ARMS_ROOT, "v9-pool", "results.ts"), "utf8"), "Reconciliation");
    expect(ours).toEqual(["block", "contract", "freeze", "input", "retry", "snapshot", "stage", "storeReceipts", "termination"]);
    expect(ours).not.toEqual(Object.keys(archived).sort());
    expect(() => archivedFile(V8_ARCHIVE, "study/absent.json")).toThrow("is not in");
  });

  test("reads a record's key set from its exported type", () => {
    const seed = readFileSync(join(import.meta.dir, "seed.ts"), "utf8");
    expect(typeKeys(seed, "SeedSummary")).toContain("termination");
    expect(typeKeys(seed, "SeedSummary")).toContain("attempts");
    expect(typeKeys(seed, "SeedAttempt")).toContain("developmentRecord");
    expect(typeKeys(seed, "SeedPlan")).toEqual(["configuration", "developmentHistory", "fallback", "feedbackReceipt", "generation", "mode", "parentManifest", "round", "trainEvidence"]);
    expect(() => typeKeys(seed, "NoSuchRecord")).toThrow("not found");
    expect(typeKeys("export type A = { a: { b: string; c: number }; d: string; };", "A")).toEqual(["a", "d"]);
    expect(typeKeys("export type A = { a: string; b: string; };", "A")).not.toEqual(typeKeys("export type A = { a: string; };", "A"));
    expect(() => typeKeys("export type A = { a: string; a: number; };", "A")).toThrow("duplicate key");
    expect(typeKeys("export type A = { b: string; a: string };", "A")).toEqual(["a", "b"]);
    expect(() => typeKeys("export type A = { a: string; string };", "A")).toThrow("without a key");
    expect(() => typeKeys("export type A = { a: string; ", "A")).toThrow("unterminated");
  });

  test("exposes the v8 constants, the pool rule, and the block helpers", () => {
    expect(ARMS).toEqual(["fixed", "retained", "optimizer", "optimizer-raw"]);
    expect(POOL).toEqual({ size: 16, launchCap: 16, concurrency: 3, minimumQualified: 6, primarySize: 6, winsRequired: 5, frozenTasksPrimary: 48 });
    expect(COMPARISON.primary).toBe("optimizer-versus-fixed");
    expect(COMPARISON.tiesWin).toBe(false);
    expect(LEARNING_BUDGET).toEqual(ARM_BUDGET);
    expect(FROZEN_BUDGET).toEqual(ARM_BUDGET);
    expect(ARM_BUDGET).toEqual({ work: 40_000_000, attempts: 1024, runs: 512 });
    expect(SEED_BUDGET).toEqual({ work: 8_000_000, attempts: 64, runs: 64 });
    expect(ROUND_SCHEDULE).toEqual(PROTOCOL.seed.roundSchedule);
    expect(POOL_BLOCK_IDS).toEqual(BLOCKS.map((b) => b.id));
    expect(BLOCKS).toHaveLength(16);
    expect(blockIndex("p-01")).toBe(0);
    expect(blockIndex("p-16")).toBe(15);
    expect(() => blockIndex("cal-a")).toThrow("unknown block");
    expect(() => blockById("a-r1")).toThrow("unknown block");
    expect(blockSeeds(0)).toEqual({ acquisition: 93000001, unseen: 93000002, shift: 93000003, ancestor: 93000004 });
    expect(blockSeeds(15)).toEqual({ acquisition: 93000061, unseen: 93000062, shift: 93000063, ancestor: 93000064 });
    expect(() => blockSeeds(16)).toThrow();
    expect(() => blockSeeds(-1)).toThrow();
    expect(frozenTasks).toBe(frozenHoldoutTasks);
  });

  test("builds every block as v8 does and keeps a stable digest", () => {
    const seen = new Set(PROTOCOL.previousSeeds);
    const groups = new Set<string>();
    for (const b of BLOCKS) {
      for (const seed of Object.values(b.seeds)) {
        expect(seen.has(seed)).toBe(false);
        seen.add(seed);
      }
      const data = generateBlock(b);
      expect(data.seed.taskId).toBe(data.learning[0]!.taskId);
      expect(data.seed.inputs.map((batch) => batch.split)).toEqual(["train", "validation", "holdout", "development"]);
      expect(data.seed.inputs[3]!.records).toHaveLength(12);
      expect(canonicalize(data.seed.inputs.slice(0, 3) as unknown as JsonValue)).toBe(canonicalize(data.learning[0]!.inputs as unknown as JsonValue));
      expect(data.learning).toHaveLength(40);
      expect(data.frozen).toHaveLength(8);
      expect(data.frozen.every((task) => task.phase === "shift" && task.inputs.find((row) => row.split === "holdout")!.records.length === 12)).toBe(true);
      expect(seedTask(b.id)).toEqual(data.seed);
      expect(learningTasks(b.id)).toEqual(data.learning);
      for (const task of [...data.learning, ...data.frozen]) {
        const group = taskLineageGroup(task);
        expect(groups.has(group)).toBe(false);
        groups.add(group);
      }
    }
    expect(groups.size).toBe(16 * 48);
    expect(loadProtocol()).toEqual(PROTOCOL);
    expect(loadProtocol()).toEqual(parseProtocol(raw));
    expect(digestCanonical(PROTOCOL as unknown as JsonValue)).toBe(PROTOCOL_DIGEST);
    expect(digestCanonical(loadProtocol() as unknown as JsonValue)).toBe(PROTOCOL_DIGEST);
    expect(PROTOCOL_DIGEST).not.toBe(digestCanonical(v8 as unknown as JsonValue));
  });

  test("rejects unknown keys, wrong block order, reused seeds, and design drift", () => {
    expect(() => parseProtocol({ ...PROTOCOL, extra: true })).toThrow("unknown key");
    expect(() => parseProtocol({ ...PROTOCOL, pool: { ...PROTOCOL.pool, spares: 2 } })).toThrow("unknown key");
    expect(() => parseProtocol({ ...PROTOCOL, calibration: {} })).toThrow("unknown key");
    const missing = structuredClone(PROTOCOL);
    missing.blocks.pop();
    expect(() => parseProtocol(missing)).toThrow("16 planned blocks");
    const swapped = structuredClone(PROTOCOL);
    [swapped.blocks[0], swapped.blocks[1]] = [swapped.blocks[1]!, swapped.blocks[0]!];
    expect(() => parseProtocol(swapped)).toThrow("identity/order");
    const renamed = structuredClone(PROTOCOL);
    renamed.blocks[15]!.id = "p-17";
    expect(() => parseProtocol(renamed)).toThrow("identity/order");
    const staged = structuredClone(PROTOCOL);
    (staged.blocks[2] as { stage: string }).stage = "calibration";
    expect(() => parseProtocol(staged)).toThrow("identity/order");
    const shared = structuredClone(PROTOCOL);
    shared.blocks[3]!.seeds.ancestor = shared.blocks[0]!.seeds.acquisition;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    shared.blocks[3]!.seeds.ancestor = PROTOCOL.previousSeeds[0]!;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    shared.blocks[3]!.seeds.ancestor = 81000052;
    expect(() => parseProtocol(shared)).toThrow("reused seed");
    const drifted = structuredClone(PROTOCOL);
    drifted.blocks[3]!.seeds.ancestor = 93000065;
    expect(() => parseProtocol(drifted)).toThrow("seed formula");
    const order = structuredClone(PROTOCOL);
    order.blocks[5]!.armOrder = [...ARMS];
    expect(() => parseProtocol(order)).toThrow("arm order");
    const previous = structuredClone(PROTOCOL);
    previous.previousSeeds.pop();
    expect(() => parseProtocol(previous)).toThrow("previous seeds");
    const changed = structuredClone(PROTOCOL);
    changed.tasks.shape.scorerPassAt = 0.8;
    expect(() => parseProtocol(changed)).toThrow("family shape");
    const rounds = structuredClone(PROTOCOL);
    rounds.seed.roundSchedule[7] = "error-analysis";
    expect(() => parseProtocol(rounds)).toThrow("round schedule");
    expect(() => parseProtocol({ ...PROTOCOL, status: "design-only-no-inference" })).toThrow("status");
    expect(() => parseProtocol({ ...PROTOCOL, study: "cumulative-skill-v9" })).toThrow("study");
    expect(() => parseProtocol({ ...PROTOCOL, contract: "algal.study-protocol.v2" })).toThrow("contract");
    expect(() => parseProtocol({ ...PROTOCOL, pool: { ...PROTOCOL.pool, winsRequired: 4 } })).toThrow("pool gate");
    expect(() => parseProtocol({ ...PROTOCOL, pool: { ...PROTOCOL.pool, size: 12 } })).toThrow("pool gate");
    expect(() => parseProtocol({ ...PROTOCOL, pool: { ...PROTOCOL.pool, nullTail: "P = 0.125" } })).toThrow("7/64");
    expect(() => parseProtocol({ ...PROTOCOL, pool: { ...PROTOCOL.pool, headroom: "" } })).toThrow("pool.headroom");
    expect(() => parseProtocol({ ...PROTOCOL, comparison: { ...PROTOCOL.comparison, tiesWin: true } })).toThrow("comparison rule");
    expect(() => parseProtocol({ ...PROTOCOL, comparison: { ...PROTOCOL.comparison, coverage: "x".repeat(1025) } })).toThrow();
    expect(() => parseProtocol({ ...PROTOCOL, basis: { ...PROTOCOL.basis, lineRule: "" } })).toThrow("line rule");
    expect(() => parseProtocol({ ...PROTOCOL, basis: { ...PROTOCOL.basis, change: "The design changes." } })).toThrow("estimand");
    expect(() => parseProtocol({ ...PROTOCOL, basis: { ...PROTOCOL.basis, v8Protocol: "main" } })).toThrow("v8 protocol commit");
    expect(() => parseProtocol({ ...PROTOCOL, freezeRule: "Commit this protocol." })).toThrow("seeds ledger");
    expect(() => parseProtocol({ ...PROTOCOL, runDiscipline: "" })).toThrow("runDiscipline");
    expect(() => parseProtocol({ ...PROTOCOL, budgets: { ...PROTOCOL.budgets, learning: { ...ARM_BUDGET, runs: 513 } } })).toThrow("learning budget");
    const task = generateBlock("p-01").frozen[0]!;
    expect(() => taskLineageGroup({ ...task, family: { ...task.family, revisedFrom: "acquisition-02" } })).toThrow("forged ancestor");
    expect(() => generateBlock({ ...blockById("p-01"), seeds: { ...blockById("p-01").seeds, unseen: 1 } })).toThrow("block differs");
  });
});
