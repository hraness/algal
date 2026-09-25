import { inputBytes, parseCase, LIMITS, hex, type Case } from "./schema";
import type { Expr } from "./oracle";
export class Mismatch extends Error {
  constructor(readonly property: string, readonly caseId: string, readonly target: string, message: string) { super(message); }
  signature(): string { return `${this.property}:${this.target}`; }
}
function* expressions(x: Expr, charge: () => boolean): Generator<Expr> {
  if (!charge()) return;
  if (typeof x === "number") { if (x !== 0) yield 0; return; }
  if (typeof x === "boolean") { if (x) yield false; return; }
  if (typeof x === "string") { if (x.length) yield ""; return; }
  for (let i = 1; i < x.length; i++) { if (!charge()) return; yield x[i]!; }
  for (let i = 1; i < x.length; i++) for (const reduced of expressions(x[i]!, charge)) {
    if (!charge()) return;
    const copy = [...x]; copy[i] = reduced; yield copy;
  }
}
export function* reductions(c: Case, charge: () => boolean = () => true): Generator<Case> {
  if (c.domain === "grammar") {
    for (const program of expressions(c.program, charge)) {
      if (!charge()) return;
      try { const candidate = parseCase({ ...c, program }); if (inputBytes(candidate).length < inputBytes(c).length) yield candidate; } catch { /* Outside independent grammar. */ }
    }
  } else if (c.expectation === "invalid-utf8") {
    const bytes = inputBytes(c);
    for (let size = Math.max(1, Math.floor(bytes.length / 2)); size >= 1; size = Math.floor(size / 2)) {
      for (let offset = 0; offset + size <= bytes.length; offset++) {
        if (!charge()) return;
        try { yield parseCase({ ...c, hex: hex(Uint8Array.from([...bytes.subarray(0, offset), ...bytes.subarray(offset + size)])) }); } catch { /* Must remain independently invalid UTF-8. */ }
      }
    }
  }
}
export async function shrink(c: Case, reproduce: (candidate: Case) => Promise<void>, options: { attempts?: number; timeoutMs?: number } = {}) {
  const max = options.attempts ?? LIMITS.shrinkAttempts, timeout = options.timeoutMs ?? LIMITS.shrinkMs;
  if (!Number.isInteger(max) || max < 1 || max > LIMITS.shrinkAttempts || !Number.isInteger(timeout) || timeout < 1 || timeout > LIMITS.shrinkMs) throw new Error("shrink limits");
  let signature: string;
  try { await reproduce(c); throw new Error("original does not reproduce"); } catch (e) { if (!(e instanceof Mismatch)) throw e; signature = e.signature(); }
  const started = performance.now();
  let best = c, attempts = 0, replays = 0, exhausted = false;
  // Charge generation visits/copies/admission, including candidates rejected before yield.
  const charge = () => {
    if (attempts >= max || performance.now() - started >= timeout) { exhausted = true; return false; }
    attempts++; return true;
  };
  outer: for (;;) {
    for (const candidate of reductions(best, charge)) {
      if (performance.now() - started >= timeout) { exhausted = true; break outer; }
      replays++;
      try { await reproduce(candidate); } catch (e) {
        if (!(e instanceof Mismatch)) throw e; // Infrastructure faults stop shrinking; they do not improve the candidate.
        if (e.signature() === signature) { best = candidate; continue outer; }
      }
    }
    break;
  }
  // One fresh final replay is mandatory, even after bounded search exhaustion.
  try { await reproduce(best); throw new Error("minimized mismatch no longer reproduces"); } catch (e) { if (!(e instanceof Mismatch) || e.signature() !== signature) throw e; }
  return { original: c, minimized: best, signature, attempts, replays, exhausted, originalBytes: inputBytes(c).length, minimizedBytes: inputBytes(best).length };
}
