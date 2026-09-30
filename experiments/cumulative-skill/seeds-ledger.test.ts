import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ARMS_ROOT, armProtocolSeeds, CONSUMED_SEEDS, FAMILY_CONFIG_SEEDS, LEDGER_SEEDS, MAX_SEED, RESERVED_RANGES, reservedLine,
  seedStatus, type ArmProtocolSeeds, type ReservedLine } from "./seeds-ledger";

const arms = armProtocolSeeds();
const byArm = new Map(arms.map((row) => [row.arm, row]));
const blockSeeds = (row: ArmProtocolSeeds) => row.blocks.flatMap((block) => block.seeds);
const inRange = (seed: number, line: ReservedLine) => seed >= RESERVED_RANGES[line].first && seed <= RESERVED_RANGES[line].last;
const sorted = (seeds: Iterable<number>) => [...new Set(seeds)].sort((a, b) => a - b);

describe("seeds ledger", () => {
  test("names every consumed seed once, the family-config seeds, and disjoint reserved ranges", () => {
    expect(CONSUMED_SEEDS).toHaveLength(167);
    expect(new Set(CONSUMED_SEEDS).size).toBe(CONSUMED_SEEDS.length);
    expect(CONSUMED_SEEDS.every((seed) => Number.isInteger(seed) && seed >= 1 && seed <= MAX_SEED)).toBe(true);
    const configs = readdirSync(join(import.meta.dir, "configs")).filter((name) => name.endsWith(".family.json")).sort();
    expect(configs).toEqual(["acquisition.family.json", "shift.family.json", "unseen.family.json"]);
    const configSeeds = configs.map((name) => (JSON.parse(readFileSync(join(import.meta.dir, "configs", name), "utf8")) as { seed: number }).seed);
    expect(sorted(configSeeds)).toEqual(sorted(FAMILY_CONFIG_SEEDS));
    expect(FAMILY_CONFIG_SEEDS.every((seed) => !CONSUMED_SEEDS.includes(seed))).toBe(true);
    expect(LEDGER_SEEDS.size).toBe(CONSUMED_SEEDS.length + FAMILY_CONFIG_SEEDS.length);
    expect(RESERVED_RANGES).toEqual({
      threshold: { first: 91000001, last: 91000084 }, diagnostic: { first: 92000001, last: 92000052 }, pool: { first: 93000001, last: 93000064 },
    });
    const lines = Object.keys(RESERVED_RANGES) as ReservedLine[];
    for (const line of lines) {
      const range = RESERVED_RANGES[line];
      expect(range.first).toBeLessThanOrEqual(range.last);
      for (const seed of LEDGER_SEEDS) expect(inRange(seed, line)).toBe(false);
      for (const other of lines) if (other !== line) expect(inRange(RESERVED_RANGES[other].first, line) || inRange(RESERVED_RANGES[other].last, line)).toBe(false);
    }
  });

  test("classifies seeds and rejects values outside the generator's range", () => {
    expect(seedStatus(57019)).toBe("consumed");
    expect(seedStatus(81000052)).toBe("consumed");
    expect(seedStatus(20260925)).toBe("family-config");
    expect(seedStatus(91000001)).toBe("reserved:threshold");
    expect(seedStatus(92000052)).toBe("reserved:diagnostic");
    expect(seedStatus(93000001)).toBe("reserved:pool");
    expect(seedStatus(93000064)).toBe("reserved:pool");
    expect(seedStatus(93000065)).toBe("free");
    expect(seedStatus(1)).toBe("free");
    expect(reservedLine(90000000)).toBeNull();
    expect(() => seedStatus(0)).toThrow();
    expect(() => seedStatus(MAX_SEED + 1)).toThrow();
    expect(() => seedStatus(1.5)).toThrow();
  });

  test("reads every committed arm protocol", () => {
    expect(arms.map((row) => row.arm)).toEqual(readdirSync(ARMS_ROOT).sort().filter((name) => arms.some((row) => row.arm === name)));
    for (const name of ["v6", "v7", "v8", "v9-pool"]) expect(byArm.has(name), name).toBe(true);
    for (const row of arms) {
      expect(row.study).toMatch(/^cumulative-skill-/);
      expect(row.blocks.length).toBeGreaterThan(0);
      expect(row.blocks.every((block) => block.seeds.length === 4)).toBe(true);
      expect(new Set(row.blocks.map((block) => block.id)).size).toBe(row.blocks.length);
    }
  });

  test("keeps every arm's block seeds pairwise disjoint, disjoint from its own history, and inside the ledger's account", () => {
    const seen = new Map<number, string>();
    const consumedByArms = new Set<number>();
    for (const row of arms) {
      const drawn = blockSeeds(row);
      expect(new Set(drawn).size, `${row.arm} repeats a seed`).toBe(drawn.length);
      const previous = new Set(row.previousSeeds);
      for (const seed of drawn) {
        expect(previous.has(seed), `${row.arm} redraws ${seed} from its own previous seeds`).toBe(false);
        expect(seen.has(seed), `${row.arm} shares ${seed} with ${seen.get(seed)}`).toBe(false);
        seen.set(seed, row.arm);
      }
      for (const seed of row.previousSeeds) expect(LEDGER_SEEDS.has(seed), `${row.arm} lists ${seed} as previous but the ledger omits it`).toBe(true);
      // An arm either drew from consumed history (it ran) or from one reserved range (it has not run); never both, never neither.
      const statuses = new Set(drawn.map(seedStatus));
      expect(statuses.size, `${row.arm} mixes seed statuses ${[...statuses].join(", ")}`).toBe(1);
      const status = [...statuses][0]!;
      if (status === "consumed") {
        for (const seed of [...row.previousSeeds, ...drawn]) consumedByArms.add(seed);
      } else {
        expect(status, `${row.arm} draws unledgered seeds`).toMatch(/^reserved:/);
        expect(drawn.every((seed) => !LEDGER_SEEDS.has(seed))).toBe(true);
      }
    }
    // The static consumed list and the committed protocols agree in both directions.
    expect(sorted(consumedByArms)).toEqual(sorted(CONSUMED_SEEDS));
  });

  test("keeps v9-pool inside its reserved range with the full consumed history as previous seeds", () => {
    const pool = byArm.get("v9-pool")!;
    expect(pool.study).toBe("cumulative-skill-v9-pool");
    expect(pool.blocks).toHaveLength(16);
    const drawn = blockSeeds(pool);
    expect(drawn).toHaveLength(64);
    expect(drawn.every((seed) => inRange(seed, "pool"))).toBe(true);
    expect(sorted(drawn)).toEqual(Array.from({ length: 64 }, (_, i) => RESERVED_RANGES.pool.first + i));
    expect(sorted(pool.previousSeeds)).toEqual(sorted(CONSUMED_SEEDS));
    expect(drawn.every((seed) => seedStatus(seed) === "reserved:pool")).toBe(true);
    for (const line of ["threshold", "diagnostic"] as const) expect(drawn.some((seed) => inRange(seed, line))).toBe(false);
  });

  test("rejects malformed arm protocols and symlinked arm directories", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-seeds-ledger-"));
    try {
      const write = (arm: string, value: unknown) => {
        mkdirSync(join(root, arm), { recursive: true });
        writeFileSync(join(root, arm, "protocol.json"), JSON.stringify(value));
      };
      const good = { study: "cumulative-skill-fixture", previousSeeds: [1, 2], blocks: [{ id: "p-01", seeds: { acquisition: 3, unseen: 4, shift: 5, ancestor: 6 } }] };
      write("good", good);
      mkdirSync(join(root, "no-protocol"));
      expect(armProtocolSeeds(root)).toEqual([{ arm: "good", study: "cumulative-skill-fixture", previousSeeds: [1, 2], blocks: [{ id: "p-01", seeds: [3, 4, 5, 6] }] }]);
      write("bad", { ...good, blocks: [{ id: "p-01", seeds: { acquisition: 3, unseen: 4, shift: 5 } }] });
      expect(() => armProtocolSeeds(root)).toThrow("wrong seed names");
      write("bad", { ...good, blocks: [{ id: "P 1", seeds: good.blocks[0]!.seeds }] });
      expect(() => armProtocolSeeds(root)).toThrow("no valid id");
      write("bad", { ...good, previousSeeds: [1, 1] });
      expect(() => armProtocolSeeds(root)).toThrow("previous seeds repeat");
      write("bad", { ...good, previousSeeds: [0] });
      expect(() => armProtocolSeeds(root)).toThrow("previousSeeds[0]");
      write("bad", { ...good, blocks: [] });
      expect(() => armProtocolSeeds(root)).toThrow("block count");
      write("bad", { ...good, study: "Not A Study" });
      expect(() => armProtocolSeeds(root)).toThrow("names no study");
      write("bad", { ...good, blocks: [{ id: "p-01", seeds: { ...good.blocks[0]!.seeds, ancestor: MAX_SEED + 1 } }] });
      expect(() => armProtocolSeeds(root)).toThrow("seeds.ancestor");
      rmSync(join(root, "bad"), { recursive: true });
      symlinkSync(join(root, "good"), join(root, "linked"));
      expect(() => armProtocolSeeds(root)).toThrow("symlink");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
