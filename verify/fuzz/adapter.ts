/**
 * verify/fuzz/adapter.ts — lane entry for the planned suite `fuzz-smoke`.
 * Authority selection is explicit and deterministic:
 *   ALGAL_FUZZ_SEEDS      — comma-separated uint32 override (default the
 *                           recorded two-seed stream; max 16)
 *   ALGAL_FUZZ_ITERATIONS — per-(seed, mutator) rep count override (max 16;
 *                           the seeds × mutators × reps product is bounded
 *                           by FUZZ_LIMITS.iterations)
 *   ALGAL_FUZZ_NATIVE_BIN — optional absolute `verification_boundary` for
 *                           the finding-attribution replay leg
 * The committed WASM artifact is the subject; the Bun runtime identity is
 * process.execPath. Any surviving minimized counterexample fails the suite
 * after the report is retained — fuzz output is evidence of a disagreement,
 * not a pass/fail vote to soften. Evidence is retained under verify/results/
 * with classification "diagnostic": iteration counts, coverage and elapsed
 * time are observations, not proof.
 */
import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { hashJson } from "../lib/files";
import { retainEvidence } from "../lib/evidence-retention";
import { retainFailure } from "../lib/failure";
import { requireThat } from "../lib/schema";
import { artifactRef } from "../differential/run";
import { fuzzDefinition } from "./definition";
import { FUZZ_LIMITS, runFuzz, type FuzzReport } from "./run";

export const DEFAULT_FUZZ_SEEDS = [1, 0x6d2b79f5] as const;

export function fuzzProfile(nativeBin: string | undefined, seeds: string | undefined, iterations: string | undefined): {
  native: string | undefined;
  seeds: number[];
  reps: number;
} {
  if (nativeBin !== undefined) requireThat(isAbsolute(nativeBin) && nativeBin.length > 1, "fuzz native binary must be an absolute path");
  const list = seeds === undefined
    ? [...DEFAULT_FUZZ_SEEDS]
    : seeds.split(",").map(s => {
      const t = s.trim();
      const n = Number(t);
      requireThat(/^[0-9]{1,10}$/.test(t) && Number.isInteger(n) && n <= 0xffffffff, `invalid seed ${s}`);
      return n >>> 0;
    });
  requireThat(list.length > 0 && list.length <= 16, "seed count bound");
  let reps: number = FUZZ_LIMITS.repsPerPair;
  if (iterations !== undefined) {
    const t = iterations.trim();
    const n = Number(t);
    requireThat(/^[0-9]{1,4}$/.test(t) && Number.isInteger(n) && n >= 1 && n <= 16, "iteration count bound");
    reps = n;
  }
  return { native: nativeBin, seeds: list, reps };
}

/** The suite passes only when zero counterexamples survive minimization. */
export function admitFuzzReport(report: FuzzReport): void {
  requireThat(report.contract === "algal.fuzz-smoke-report.v1", "fuzz report contract");
  requireThat(report.plannedIterations <= FUZZ_LIMITS.iterations && report.plannedIterations > 0, "iteration bound");
  requireThat(report.counterexamples.length <= FUZZ_LIMITS.counterexamples, "counterexample bound exceeded");
  const tally = Object.values(report.verdicts).reduce((a, b) => a + (b ?? 0), 0);
  requireThat(tally === report.executed, "verdicts must account for every executed case");
  requireThat(report.executed > 0, "a fuzz run that executed nothing is not evidence");
  requireThat(report.counterexamples.length === 0, `fuzz-smoke produced ${report.counterexamples.length} unique minimized counterexample(s)`);
}

export async function runFuzzSuite(root: string): Promise<unknown> {
  if (await realpath(join(root, "verify/fuzz")) !== await realpath(import.meta.dir)) {
    throw new Error("fuzz repository/module root differs");
  }
  const { native, seeds, reps } = fuzzProfile(process.env.ALGAL_FUZZ_NATIVE_BIN, process.env.ALGAL_FUZZ_SEEDS, process.env.ALGAL_FUZZ_ITERATIONS);
  const nativeRef = native !== undefined ? await artifactRef(native) : null;
  const archive = await mkdtemp(join(tmpdir(), "algal-fuzz-"));
  const authority = {
    definitionDigest: hashJson(await fuzzDefinition(root, import.meta.dir)),
    artifacts: { bun: await artifactRef(process.execPath), wasm: await artifactRef(join(root, "src/algal_expr.wasm")), native: nativeRef },
    candidateDirectory: import.meta.dir,
    recordedArchive: archive,
    seeds,
    reps,
  };
  const selection = {
    resultsRoot: join(root, "verify/results"), suite: "fuzz-smoke", sourceRoot: archive,
    recordedArchive: archive, authorityDigest: hashJson(authority),
    limits: { maxBytes: 67_108_864, maxFileBytes: 8_388_608, maxEntries: 8192, maxDepth: 4 },
  };
  try {
    const report = await runFuzz({ root, wasm: join(root, "src/algal_expr.wasm"), native: nativeRef?.path, seeds, archiveDir: archive, reps });
    admitFuzzReport(report);
    const evidence = await retainEvidence({ ...selection, classification: "diagnostic" });
    return { report, evidence, scope: "Bounded deterministic seeded mutation fuzz over the committed WASM boundary against an independent mirror oracle, with bounded shrinking and per-generator accounting. Sampled, not exhaustive; iteration counts and coverage are observations, not proof." };
  } catch (error) {
    return retainFailure(error, [async () => { await retainEvidence({ ...selection, classification: "diagnostic" }); }]);
  }
}
