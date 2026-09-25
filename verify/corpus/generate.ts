import type { Expr } from "./oracle";
import { hex, parseCase, rawCatalog, type Case } from "./schema";
export const SEEDS = [1, 0x6d2b79f5, 0x9e3779b9, 0xffffffff] as const;
export class Random {
  private state: number;
  constructor(seed: number) { if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error("nonzero uint32 seed"); this.state = seed; }
  draw(bound: number): number {
    if (!Number.isInteger(bound) || bound < 1 || bound > 65536) throw new Error("draw bound");
    let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state % bound;
  }
}
export function grammar(seed: number, count = 24): Case[] {
  if (count !== 24) throw new Error("fixed grammar case count");
  const rng = new Random(seed);
  function numeric(depth: number): Expr {
    if (!depth || rng.draw(4) === 0) return rng.draw(19) - 9;
    switch (rng.draw(3)) {
      case 0: return ["add", numeric(depth - 1), numeric(depth - 1)];
      case 1: return ["sub", numeric(depth - 1), numeric(depth - 1)];
      default: return ["neg", numeric(depth - 1)];
    }
  }
  function boolean(depth: number): Expr {
    if (!depth) return rng.draw(2) === 0;
    switch (rng.draw(4)) {
      case 0: return ["lt", numeric(depth - 1), numeric(depth - 1)];
      case 1: return ["not", boolean(depth - 1)];
      case 2: return ["and", boolean(depth - 1), boolean(depth - 1)];
      default: return ["or", boolean(depth - 1), boolean(depth - 1)];
    }
  }
  return Array.from({ length: count }, (_, index): Case => {
    let program: Expr;
    switch (index % 12) {
      case 0: program = numeric(0); break;
      case 1: program = ["add", numeric(3), numeric(2)]; break;
      case 2: program = ["sub", numeric(3), numeric(2)]; break;
      case 3: program = ["neg", numeric(3)]; break;
      case 4: program = ["lt", numeric(3), numeric(3)]; break;
      case 5: program = ["not", boolean(3)]; break;
      case 6: program = ["and", false, ["lt", ["div", 1, 0], 0]]; break;
      case 7: program = ["or", true, ["lt", ["div", 1, 0], 0]]; break;
      case 8: program = ["if", boolean(3), numeric(3), numeric(3)]; break;
      case 9: program = ["slen", ["", "a", "😀", "é", "\0", "\ufeff", "\ue000"][rng.draw(7)]!]; break;
      case 10: program = ["if", false, ["div", 1, 0], numeric(3)]; break;
      default: program = ["if", true, ["div", 1, 0], numeric(3)];
    }
    return parseCase({ contract: "algal.corpus-case.v1", id: `grammar-${seed.toString(16)}-${index}`, domain: "grammar", program });
  });
}
export function catalog(): Case[] {
  const generated = SEEDS.flatMap(seed => grammar(seed));
  const raw = Object.entries(rawCatalog()).map(([id, row]) => parseCase({ contract: "algal.corpus-case.v1", id: `raw-${id}`, domain: "raw", hex: hex(row.bytes), expectation: ["invalid-utf8", "truncated-utf8", "surrogate-utf8"].includes(id) ? "invalid-utf8" : "catalog", catalog: ["invalid-utf8", "truncated-utf8", "surrogate-utf8"].includes(id) ? "" : id }));
  return [...generated, ...raw];
}
