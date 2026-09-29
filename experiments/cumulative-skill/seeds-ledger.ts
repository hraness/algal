// One record of every task seed the cumulative-skill studies have drawn and
// every range a planned line has reserved, so no protocol repeats a lineage.
// The consumed list is static and reviewed; `armProtocolSeeds` reads the
// committed arm protocols so a test can check the two against each other.
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { asArray, asInt, asObject } from "../../src/values";

export const ARMS_ROOT = resolve(import.meta.dir, "arms");
/** Largest value a family generator accepts as a seed. */
export const MAX_SEED = 0xffff_ffff;

/** Every v5, v6, v7, and v8 task seed and ancestor: v8's 115 previous seeds
 * plus its own 52 block seeds. A study that ran, even interrupted, consumed
 * its seeds; a planned study that has not run holds a reserved range instead. */
export const CONSUMED_SEEDS: readonly number[] = [57019, 99733, 271828, 314159, 644901, 739391, 20260927, 20261028, 20261029,
  41000001, 41000002, 41000003, 41000004, 41000005, 41000006,
  ...Array.from({ length: 48 }, (_, i) => 61000001 + i), ...Array.from({ length: 52 }, (_, i) => 71000001 + i),
  ...Array.from({ length: 52 }, (_, i) => 81000001 + i)];
/** The `configs/*.family.json` seeds of the original v4-era corpus; no arm
 * protocol lists them under previousSeeds, so the ledger names them here. */
export const FAMILY_CONFIG_SEEDS: readonly number[] = [20260925, 77013, 987654];
export type SeedRange = { readonly first: number; readonly last: number };
/** Ranges the 2026-09-29 design round assigned to its three candidate lines.
 * Only the pool line is implemented; the other two stay reserved so a later
 * protocol on either axis cannot collide with this one. */
export const RESERVED_RANGES = {
  threshold: { first: 91000001, last: 91000084 },
  diagnostic: { first: 92000001, last: 92000052 },
  pool: { first: 93000001, last: 93000064 },
} as const satisfies Record<string, SeedRange>;
export type ReservedLine = keyof typeof RESERVED_RANGES;
export const LEDGER_SEEDS: ReadonlySet<number> = new Set([...CONSUMED_SEEDS, ...FAMILY_CONFIG_SEEDS]);

export function reservedLine(seed: number): ReservedLine | null {
  for (const [line, range] of Object.entries(RESERVED_RANGES) as [ReservedLine, SeedRange][]) {
    if (seed >= range.first && seed <= range.last) return line;
  }
  return null;
}
export type SeedStatus = "consumed" | "family-config" | `reserved:${ReservedLine}` | "free";
export function seedStatus(seed: number): SeedStatus {
  asInt(seed, "seed", 1, MAX_SEED);
  if (FAMILY_CONFIG_SEEDS.includes(seed)) return "family-config";
  if (CONSUMED_SEEDS.includes(seed)) return "consumed";
  const line = reservedLine(seed);
  return line === null ? "free" : `reserved:${line}`;
}

export type ArmProtocolSeeds = { arm: string; study: string; previousSeeds: number[]; blocks: { id: string; seeds: number[] }[] };
const SEED_NAMES = ["acquisition", "unseen", "shift", "ancestor"] as const;
function requireMatch(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`seeds ledger: ${message}`);
}
/** Reads only the seed-bearing fields of one committed arm protocol; the arm's
 * own parser owns the rest of its shape. */
function protocolSeeds(arm: string, path: string): ArmProtocolSeeds {
  const info = lstatSync(path);
  requireMatch(info.isFile() && !info.isSymbolicLink() && info.size <= 1_048_576, `${arm}: protocol.json must be a regular file under 1 MiB`);
  const v = asObject(JSON.parse(readFileSync(path, "utf8")), `${arm} protocol`);
  requireMatch(typeof v.study === "string" && /^[a-z0-9-]{1,64}$/.test(v.study), `${arm}: protocol names no study`);
  const previous = asArray(v.previousSeeds, `${arm} previousSeeds`);
  requireMatch(previous.length <= 4096, `${arm}: too many previous seeds`);
  const previousSeeds = previous.map((seed, i) => asInt(seed, `${arm} previousSeeds[${i}]`, 1, MAX_SEED));
  requireMatch(new Set(previousSeeds).size === previousSeeds.length, `${arm}: previous seeds repeat`);
  const rows = asArray(v.blocks, `${arm} blocks`);
  requireMatch(rows.length >= 1 && rows.length <= 64, `${arm}: block count out of range`);
  const blocks = rows.map((row, i) => {
    const block = asObject(row, `${arm} blocks[${i}]`);
    requireMatch(typeof block.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(block.id) && block.id.length <= 64, `${arm}: blocks[${i}] has no valid id`);
    const seeds = asObject(block.seeds, `${arm} blocks[${i}].seeds`);
    requireMatch(Object.keys(seeds).length === SEED_NAMES.length && SEED_NAMES.every((name) => name in seeds), `${arm}: blocks[${i}] draws the wrong seed names`);
    return { id: block.id, seeds: SEED_NAMES.map((name) => asInt(seeds[name], `${arm} blocks[${i}].seeds.${name}`, 1, MAX_SEED)) };
  });
  return { arm, study: v.study, previousSeeds, blocks };
}
/** Every `arms/<name>/protocol.json`, in directory order. Arms without a
 * protocol file (v4, v5) drew their seeds through `configs/` and appear only
 * through the consumed list. */
export function armProtocolSeeds(root = ARMS_ROOT): ArmProtocolSeeds[] {
  const rows: ArmProtocolSeeds[] = [];
  for (const name of readdirSync(root).sort()) {
    const dir = join(root, name);
    const info = lstatSync(dir);
    requireMatch(!info.isSymbolicLink(), `arm symlink is not allowed: ${dir}`);
    if (!info.isDirectory()) continue;
    const path = join(dir, "protocol.json");
    if (existsSync(path)) rows.push(protocolSeeds(name, path));
  }
  requireMatch(rows.length <= 64, "too many arm protocols");
  return rows;
}
