/**
 * verify/differential/shrink.ts — bounded deterministic shrinking of a
 * mismatching input while the supplied predicate keeps reproducing. Two
 * reduction levels: byte-prefix/segment deletion for raw inputs, and
 * JVal-tree simplification (subterm replacement, field removal, array
 * shrinking) when the input parses. Every attempt is bounded in count and
 * wall-clock; the loop always reconfirms the final candidate.
 */

import { canonical } from "./canonical";
import { parseJsonBytes, type JVal } from "./json";

export type ShrinkBudget = { attempts: number; deadlineMs: number };
export const SHRINK_BUDGET: ShrinkBudget = { attempts: 64, deadlineMs: 45_000 };

export function smallerTrees(v: JVal): JVal[] {
  const out: JVal[] = [];
  if (Array.isArray(v)) {
    out.push(null, num0(), []);
    for (const item of v) out.push(item);
    if (v.length > 0) { const half = v.slice(0, Math.ceil(v.length / 2)); out.push(half); }
    for (let i = 0; i < v.length; i++) for (const s of smallerTrees(v[i]!)) out.push([...v.slice(0, i), s, ...v.slice(i + 1)]);
  } else if (v instanceof Map) {
    out.push(null, new Map());
    for (const item of v.values()) out.push(item);
    for (const [k, item] of v) for (const s of smallerTrees(item)) { const m = new Map(v); m.set(k, s); out.push(m); }
    for (const k of v.keys()) { const m = new Map(v); m.delete(k); out.push(m); }
  } else if (isNum(v)) out.push(num0());
  else if (typeof v === "string") out.push("", num0());
  else if (typeof v === "boolean") out.push(false, null);
  return out;
}
const num0 = (): JVal => ({ kind: "num", f64: 0, u64: 0n });
const isNum = (v: JVal): v is { kind: "num"; f64: number; u64: bigint | null } =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Map);

/** Enumerates shrunken candidate byte strings, smallest-change first. */
export function* candidates(bytes: Uint8Array): Generator<Uint8Array> {
  // Tree-level first: smaller semantic reproducers are more readable.
  const parsed = parseJsonBytes(bytes);
  if (parsed.ok && parsed.value instanceof Map) {
    const doc = parsed.value;
    const program = doc.get("program");
    if (program !== undefined) {
      for (const p of smallerTrees(program)) {
        const d = new Map(doc);
        d.set("program", p);
        yield enc().encode(canonical(d));
      }
    }
    const env = doc.get("env");
    if (env instanceof Map) {
      for (const e of smallerTrees(env)) {
        const d = new Map(doc);
        d.set("env", e);
        yield enc().encode(canonical(d));
      }
    }
    const fuel = doc.get("fuel");
    if (fuel !== undefined) {
      const d = new Map(doc);
      d.delete("fuel");
      yield enc().encode(canonical(d));
    }
  }
  // Byte-level deletions: prefix halves, then tail truncation, then mid
  // deletes. floor() terminates — ceil would pin size at 1 forever.
  for (let size = Math.ceil(bytes.length / 2); size >= 1; size = Math.floor(size / 2)) {
    yield bytes.subarray(0, size);
    yield bytes.subarray(bytes.length - size);
  }
  const n = bytes.length;
  for (const frac of [2, 4, 8, 16]) {
    const step = Math.max(1, Math.floor(n / frac));
    for (let i = 0; i + step <= n; i += step) {
      yield Uint8Array.from([...bytes.subarray(0, i), ...bytes.subarray(i + step)]);
    }
  }
  const enc2 = enc();
  void enc2;
}
const enc = () => new TextEncoder();

/** Greedy bounded shrink. `reproduces` must be cheap (one target leg). */
export async function shrinkBytes(
  bytes: Uint8Array,
  reproduces: (candidate: Uint8Array) => Promise<boolean>,
  budget: ShrinkBudget = SHRINK_BUDGET,
): Promise<{ bytes: Uint8Array; attempts: number; exhausted: boolean }> {
  let best = bytes;
  let attempts = 0;
  const deadline = Date.now() + budget.deadlineMs;
  let progress = true;
  while (progress && attempts < budget.attempts && Date.now() < deadline) {
    progress = false;
    for (const cand of candidates(best)) {
      if (attempts >= budget.attempts || Date.now() >= deadline) break;
      if (cand.byteLength >= best.byteLength) continue;
      attempts++;
      if (await reproduces(cand)) { best = cand; progress = true; break; }
    }
  }
  // Reconfirm the terminal candidate.
  attempts++;
  if (!(await reproduces(best))) throw new Error("shrink target did not reproduce at its own input");
  return { bytes: best, attempts, exhausted: !progress };
}
