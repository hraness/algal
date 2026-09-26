/**
 * verify/differential/adapter.ts — lane entry for the planned suite
 * `differential`. Selects authority explicitly:
 *   ALGAL_DIFFERENTIAL_NATIVE_BIN — absolute path to the frozen
 *     `verification_boundary` binary (required; no ambient discovery)
 *   ALGAL_DIFFERENTIAL_SEEDS — optional comma-separated uint32 override for
 *     the generated-case stream (default is the recorded fixed stream)
 * The committed WASM artifact is read at src/algal_expr.wasm; the Bun runtime
 * identity is process.execPath. The suite registers evidence under
 * verify/results/ with classification "diagnostic" — this lane's comparison
 * output is a report, not an admission claim.
 */
import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { hashJson } from "../lib/files";
import { retainEvidence } from "../lib/evidence-retention";
import { retainFailure } from "../lib/failure";
import { requireThat } from "../lib/schema";
import { differentialDefinition } from "./definition";
import { artifactRef, runDifferential, LIMITS, type Report } from "./run";

export const DEFAULT_SEEDS = [1, 0x6d2b79f5, 0x9e3779b9, 0xffffffff] as const;

export function differentialProfile(binary: string | undefined, seeds: string | undefined): { native: string; seeds: number[] } {
  if (!binary || !isAbsolute(binary)) throw new Error("differential requires explicit absolute ALGAL_DIFFERENTIAL_NATIVE_BIN");
  const list = seeds === undefined
    ? [...DEFAULT_SEEDS]
    : seeds.split(",").map(s => {
      const t = s.trim();
      const n = Number(t);
      requireThat(/^[0-9]{1,10}$/.test(t) && Number.isInteger(n) && n <= 0xffffffff, `invalid seed ${s}`);
      return n >>> 0;
    });
  requireThat(list.length > 0 && list.length <= 16, "seed count bound");
  return { native: binary, seeds: list };
}

/** Shape the registered lane's result contract — honest about coverage. */
export function admitReport(report: Report): void {
  requireThat(report.cases > 0 && report.cases <= LIMITS.cases, "report case bound");
  requireThat(report.verdicts["infra-failure"] === undefined && report.verdicts["mismatch-oracle"] === undefined
    && report.verdicts["mismatch-targets"] === undefined && report.verdicts["mismatch-wrapper"] === undefined,
    "differential report contains failures or mismatches");
  requireThat((report.verdicts["agree"] ?? 0) + (report.verdicts["uncovered"] ?? 0) + (report.verdicts["wasm-transport"] ?? 0) === report.cases,
    "verdict tally does not cover every case");
}

export async function runDifferentialSuite(root: string): Promise<unknown> {
  if (await realpath(join(root, "verify/differential")) !== await realpath(import.meta.dir)) {
    throw new Error("differential repository/module root differs");
  }
  const { native, seeds } = differentialProfile(process.env.ALGAL_DIFFERENTIAL_NATIVE_BIN, process.env.ALGAL_DIFFERENTIAL_SEEDS);
  const nativeRef = await artifactRef(native);
  const archive = await mkdtemp(join(tmpdir(), "algal-differential-"));
  const authority = {
    definitionDigest: hashJson(await differentialDefinition(root, import.meta.dir)),
    artifacts: { bun: await artifactRef(process.execPath), wasm: await artifactRef(join(root, "src/algal_expr.wasm")), native: nativeRef },
    candidateDirectory: import.meta.dir,
    recordedArchive: archive,
    seeds,
  };
  const selection = {
    resultsRoot: join(root, "verify/results"), suite: "differential", sourceRoot: archive,
    recordedArchive: archive, authorityDigest: hashJson(authority),
    limits: { maxBytes: 67_108_864, maxFileBytes: 8_388_608, maxEntries: 8192, maxDepth: 4 },
  };
  try {
    const report = await runDifferential({ root, wasm: join(root, "src/algal_expr.wasm"), native: nativeRef.path, seeds, archiveDir: archive, mode: "subprocess" });
    admitReport(report);
    const evidence = await retainEvidence({ ...selection, classification: "diagnostic" });
    return { report, evidence, scope: "Sampled agreement among committed WASM, native binary, Bun wrapper, and an independent mirror oracle over the adversarial catalog. No exhaustive-fuzz, build-provenance, or Phase08-completion claim." };
  } catch (error) {
    return retainFailure(error, [async () => { await retainEvidence({ ...selection, classification: "diagnostic" }); }]);
  }
}
