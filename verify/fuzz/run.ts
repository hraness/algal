/**
 * verify/fuzz/run.ts — bounded deterministic fuzz driver (suite
 * `fuzz-smoke`). Iterates `seeds × mutators × reps` — a fixed enumerable
 * product, never a time-bounded loop. Each iteration mutates one catalog
 * seed input (grammar-aware value edit or raw-byte edit, occasionally a
 * second chained step), runs it through the committed WASM in-process, and
 * compares against the independent oracle through the differential lane's
 * `compareCase` — the same verdict axis, so a fuzz finding is the same
 * object a catalog mismatch would be.
 *
 * Findings are shrunk with the bounded shrinker and deduplicated by
 * divergence signature (verdict axis + oracle class + wasm class) before
 * shrinking, and by minimized-input digest after. Per-mutator totals are
 * reported, including generators that produced cases but zero findings and
 * generators that produced no cases at all — a vacuous generator is
 * reported, never smoothed over.
 *
 * An optional native leg replays each unique minimized counterexample
 * against a supplied `verification_boundary` binary under runCommand
 * custody, to attribute the divergence to wasm-vs-native or
 * targets-vs-oracle.
 *
 * Evidence classification is `diagnostic`: iteration counts, coverage and
 * runtime are reported as observations, never as proof.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join } from "node:path";
import { stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { runCommand } from "../lib/runner";
import { catalog, type Case } from "../differential/cases";
import { classifyResponse, compareCase, type TargetResponse } from "../differential/engine";
import { callRaw, loadWasmModule, type WasmModule } from "../differential/wasm";
import { shrinkBytes } from "../differential/shrink";
import { Rng } from "../differential/prng";
import { parseJsonBytes } from "../differential/json";
import { MUTATORS, type Mutator } from "./mutate";

export const FUZZ_LIMITS = {
  iterations: 4_096,      // hard bound on total case executions
  inputBytes: 400_000,    // mutated-input byte bound
  shrinkAttempts: 24,
  shrinkMs: 3_000,
  counterexamples: 64,    // retained minimized counterexample bound
  repsPerPair: 8,         // default reps per (seed, mutator) pair
  nativeMs: 10_000,
  nativeOutBytes: 1_048_576,
} as const;

export type FuzzVerdict =
  | "agree"            // wasm response matches the oracle prediction exactly
  | "uncovered"        // oracle declined; wasm response recorded, unranked
  | "wasm-transport"   // zero-byte input cannot cross the allocator
  | "divergence"       // wasm response disagrees with the oracle (mismatch-oracle)
  | "crash";           // wasm trapped or returned a malformed response

export type Counterexample = {
  signature: string;
  file: string;          // findings/<n>.bin under the run archive dir
  baseId: string;
  mutator: string;
  seed: number;
  verdict: "divergence" | "crash";
  oracleCls: string;
  wasmCls: string;
  originalBytes: number;
  minimizedBytes: number;
  minimizedSha256: string;
  shrinkAttempts: number;
  nativeClass?: string;
  nativeAgreesWithWasm?: boolean;
};

export type MutatorStat = {
  family: "grammar" | "byte";
  produced: number;   // mutant bytes returned and executed
  declined: number;   // precondition failed, no-op, or over the byte bound
  findings: number;
};

export type FuzzReport = {
  contract: "algal.fuzz-smoke-report.v1";
  seeds: number[];
  plannedIterations: number;
  executed: number;
  declined: number;
  verdicts: Partial<Record<FuzzVerdict, number>>;
  mutators: Record<string, MutatorStat>;
  /** Produced cases but zero findings — honest "found nothing" reporting. */
  zeroFindingMutators: string[];
  /** Never produced a case — a vacuous generator is named, not hidden. */
  vacuousMutators: string[];
  coverage: { ops: string[]; codes: Record<string, number> };
  counterexamples: Counterexample[];
  /** Attribution of each finding to wasm-vs-native or targets-vs-oracle.
   * `timeouts` is counted separately from crashes/divergence — a timeout is
   * a resource-bound event, never a semantic verdict. The wasm leg is
   * in-process and synchronous so it cannot time out; only the native
   * subprocess can. */
  native: { present: boolean; checked: number; agreements: number; timeouts: number };
  elapsedMs: number;
};

/** The wasm execution leg, injectable so tests can drive the finding path
 * deterministically without relying on a production divergence. */
export type Evaluator = (mode: "eval" | "check", bytes: Uint8Array) => TargetResponse;

function wasmEvaluator(mod: WasmModule): Evaluator {
  return (mode, bytes) => {
    if (bytes.byteLength === 0) return { status: "null-input", error: "zero-byte input cannot be allocated" };
    try {
      return { status: "ok", text: callRaw(mod, mode === "eval" ? "algal_eval" : "algal_check", bytes) };
    } catch (error) {
      return { status: "trap", error: String(error).slice(0, 300) };
    }
  };
}

type Sig = { verdict: FuzzVerdict; oracleCls: string; wasmCls: string; wasmText?: string };

/** The verdict a case would produce — shared by the run loop and the
 * shrinker so "reproduces the finding" is exact, not heuristic. */
function signature(mode: "eval" | "check", bytes: Uint8Array, evaluate: Evaluator): Sig {
  const res = evaluate(mode, bytes);
  const comp = compareCase(mode, bytes, res, null, "skipped");
  const verdict: FuzzVerdict =
    comp.verdict === "mismatch-oracle" ? "divergence"
    : comp.verdict === "infra-failure" ? "crash"
    : comp.verdict === "wasm-transport" ? "wasm-transport"
    : comp.verdict === "uncovered" ? "uncovered"
    : "agree";
  return { verdict, oracleCls: comp.oracleClass, wasmCls: comp.wasmClass, ...(res.status === "ok" ? { wasmText: res.text } : {}) };
}

/** Op-head and error-code coverage over mutant responses (informational). */
function collectOps(v: unknown, out: Set<string>): void {
  if (Array.isArray(v)) {
    if (typeof v[0] === "string") out.add(v[0]);
    for (const item of v) collectOps(item, out);
  } else if (v instanceof Map) {
    for (const item of v.values()) collectOps(item, out);
  }
}

async function nativeReplay(native: string, mode: "eval" | "check", bytes: Uint8Array, dir: string, name: string): Promise<string> {
  const file = join(dir, `${name}.bin`);
  await writeFile(file, bytes);
  const result = await runCommand([native, mode, file], dir, { timeoutMs: FUZZ_LIMITS.nativeMs, maxOutputBytes: FUZZ_LIMITS.nativeOutBytes });
  if (result.exitCode !== 0) return `native-nonzero:${result.exitCode}`;
  return classifyResponse(mode, result.stdout.trim()).cls;
}

export async function runFuzz(opts: {
  root: string;
  wasm: string;
  native?: string | undefined;
  seeds: number[];
  archiveDir: string;
  reps?: number;
  evaluate?: Evaluator;
  /** Test-only seam: restrict the mutator set deterministically. */
  mutators?: readonly Mutator[];
}): Promise<FuzzReport> {
  const t0 = Date.now();
  requireThat(isAbsolute(opts.wasm), "wasm artifact path must be absolute");
  if (opts.native !== undefined) requireThat(isAbsolute(opts.native), "native path must be absolute");
  requireThat(opts.seeds.length > 0 && opts.seeds.length <= 16, "seed count bound");
  const mutators = opts.mutators ?? MUTATORS;
  const reps = Math.min(Math.max(1, Math.floor(opts.reps ?? FUZZ_LIMITS.repsPerPair)), 16);
  const planned = opts.seeds.length * mutators.length * reps;
  requireThat(planned <= FUZZ_LIMITS.iterations && mutators.length > 0, "iteration bound exceeded");

  const cases = catalog(opts.seeds);
  const dir = join(opts.archiveDir, "findings");
  await mkdir(dir, { recursive: false });

  const mod = await loadWasmModule(opts.wasm);
  const evaluate = opts.evaluate ?? wasmEvaluator(mod);

  const stats = new Map<string, MutatorStat>(
    mutators.map(m => [m.id, { family: m.family, produced: 0, declined: 0, findings: 0 }]),
  );
  const verdicts: Partial<Record<FuzzVerdict, number>> = {};
  const ops = new Set<string>();
  const codes: Record<string, number> = {};
  const counterexamples: Counterexample[] = [];
  const seenSigs = new Set<string>();
  const seenMin = new Set<string>();
  let executed = 0, declined = 0;

  for (const seed of opts.seeds) {
    const rng = new Rng(seed);
    for (const mut of mutators) {
      const st = stats.get(mut.id)!;
      for (let r = 0; r < reps; r++) {
        const base: Case = cases[rng.below(cases.length)]!;
        const donor = cases[rng.below(cases.length)]!.bytes;
        let mutated = mut.apply(base.bytes, rng, donor);
        if (mutated !== null && rng.bool(25)) {
          const second = mutators[rng.below(mutators.length)]!;
          const chained = second.apply(mutated, rng, donor);
          if (chained !== null) mutated = chained;
        }
        if (mutated === null || mutated.byteLength > FUZZ_LIMITS.inputBytes
          || (mutated.byteLength === base.bytes.byteLength && Buffer.compare(Buffer.from(mutated), Buffer.from(base.bytes)) === 0)) {
          st.declined++; declined++;
          continue;
        }
        st.produced++;
        executed++;
        const sig = signature(base.mode, mutated, evaluate);
        verdicts[sig.verdict] = (verdicts[sig.verdict] ?? 0) + 1;
        if (sig.wasmCls.startsWith("err:")) { const c = sig.wasmCls.split(":")[1]!; codes[c] = (codes[c] ?? 0) + 1; }
        else if (sig.wasmCls === "ok" || sig.wasmCls.startsWith("ok:")) codes.ok = (codes.ok ?? 0) + 1;
        const parsed = parseJsonBytes(mutated);
        if (parsed.ok && parsed.value instanceof Map) {
          const program = parsed.value.get("program");
          if (program !== undefined) collectOps(program, ops);
        }
        if (sig.verdict !== "divergence" && sig.verdict !== "crash") continue;
        st.findings++;
        const sigKey = `${sig.verdict}|${sig.oracleCls}|${sig.wasmCls}`;
        if (seenSigs.has(sigKey) || counterexamples.length >= FUZZ_LIMITS.counterexamples) continue;
        seenSigs.add(sigKey);
        let min = mutated, attempts = 0;
        try {
          const shrunk = await shrinkBytes(mutated, async candidate => {
            const s = signature(base.mode, candidate, evaluate);
            return s.verdict === sig.verdict && s.wasmCls === sig.wasmCls && s.oracleCls === sig.oracleCls;
          }, { attempts: FUZZ_LIMITS.shrinkAttempts, deadlineMs: FUZZ_LIMITS.shrinkMs });
          min = shrunk.bytes; attempts = shrunk.attempts;
        } catch { /* the seed itself did not reproduce — record unshrunk */ }
        const sha = `sha256:${createHash("sha256").update(min).digest("hex")}`;
        if (seenMin.has(sha)) continue;
        seenMin.add(sha);
        counterexamples.push({
          signature: sigKey, file: `findings/cx-${counterexamples.length + 1}.bin`, baseId: base.id,
          mutator: mut.id, seed, verdict: sig.verdict,
          oracleCls: sig.oracleCls, wasmCls: sig.wasmCls,
          originalBytes: mutated.byteLength, minimizedBytes: min.byteLength,
          minimizedSha256: sha, shrinkAttempts: attempts,
        });
        await writeFile(join(opts.archiveDir, `findings/cx-${counterexamples.length}.bin`), min);
      }
    }
  }

  // Optional native leg: attribute each unique finding (bounded by
  // FUZZ_LIMITS.counterexamples). wasm-only runs leave this absent.
  const native = { present: opts.native !== undefined, checked: 0, agreements: 0, timeouts: 0 };
  if (opts.native !== undefined) {
    for (let i = 0; i < counterexamples.length; i++) {
      const cx = counterexamples[i]!;
      const base = cases.find(c => c.id === cx.baseId)!;
      const bytes = new Uint8Array(await readFile(join(opts.archiveDir, cx.file)));
      cx.nativeClass = await nativeReplay(opts.native, base.mode, bytes, dir, `native-${i + 1}`);
      cx.nativeAgreesWithWasm = cx.nativeClass === cx.wasmCls;
      native.checked++;
      if (cx.nativeAgreesWithWasm) native.agreements++;
      if (cx.nativeClass === "transport:timeout") native.timeouts++;
    }
  }

  const zeroFindingMutators = mutators.filter(m => stats.get(m.id)!.produced > 0 && stats.get(m.id)!.findings === 0).map(m => m.id);
  const vacuousMutators = mutators.filter(m => stats.get(m.id)!.produced === 0).map(m => m.id);
  const report: FuzzReport = {
    contract: "algal.fuzz-smoke-report.v1",
    seeds: opts.seeds,
    plannedIterations: planned,
    executed,
    declined,
    verdicts,
    mutators: Object.fromEntries(stats),
    zeroFindingMutators,
    vacuousMutators,
    coverage: { ops: [...ops].sort(), codes },
    counterexamples,
    native,
    elapsedMs: Date.now() - t0,
  };
  await writeFile(join(opts.archiveDir, "report.json"), stableJson(report) + "\n", { flag: "wx" });
  return report;
}
