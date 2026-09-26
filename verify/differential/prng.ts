/** Deterministic xorshift32 PRNG. Seeds are explicit uint32 constants —
 * never wall-clock or /dev/urandom — and every seed used is recorded in
 * evidence output. Mirrors the corpus PRNG discipline. */

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }
  u32(): number {
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return this.s;
  }
  /** Uniform draw in [0, n). */
  below(n: number): number {
    if (n <= 0) throw new Error("invalid draw bound");
    return this.u32() % n;
  }
  pick<T>(items: readonly T[]): T {
    return items[this.below(items.length)]!;
  }
  bool(pct: number): boolean {
    return this.below(100) < pct;
  }
}
