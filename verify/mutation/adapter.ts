/**
 * verify/mutation/adapter.ts — lane entry for the planned suite
 * `evidence-mutation`. The lane is fully in-process: it mints evidence
 * through the real exporter, applies every catalog mutant, and probes
 * each against the production parser and semantic verifier. No external
 * authority, no environment selection — the artifact under test is the
 * committed source itself, bound through `mutationDefinition`.
 * Evidence is retained under verify/results/ with classification
 * "diagnostic": the mutation outcome table is a measured property of the
 * shipped verifier, not an admission claim about it.
 */
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashJson } from "../lib/files";
import { retainEvidence } from "../lib/evidence-retention";
import { retainFailure } from "../lib/failure";
import { requireThat } from "../lib/schema";
import { mutationDefinition } from "./definition";
import { MUTANTS } from "./mutants";
import { MUTATION_LIMITS, runMutation, type MutationReport } from "./run";

/** The suite passes only when every probe matches its declared stage,
 * code, and message part — including the documented survivors. */
export function admitMutationReport(report: MutationReport): void {
  requireThat(report.contract === "algal.evidence-mutation-report.v1", "mutation report contract");
  requireThat(report.totals.mutants === MUTANTS.length && report.totals.mutants <= MUTATION_LIMITS.mutants, "mutant bound");
  requireThat(report.totals.probes > 0, "a mutation run that probed nothing is not evidence");
  requireThat(report.totals.failed === 0,
    `evidence-mutation mismatches: ${report.results.filter(r => !r.pass).map(r => `${r.base}/${r.id}`).join(", ")}`);
}

export async function runMutationSuite(root: string): Promise<unknown> {
  if (await realpath(join(root, "verify/mutation")) !== await realpath(import.meta.dir)) {
    throw new Error("mutation repository/module root differs");
  }
  const archive = await mkdtemp(join(tmpdir(), "algal-mutation-"));
  const authority = {
    definitionDigest: hashJson(await mutationDefinition(root, import.meta.dir)),
    candidateDirectory: import.meta.dir,
    recordedArchive: archive,
  };
  const selection = {
    resultsRoot: join(root, "verify/results"), suite: "evidence-mutation", sourceRoot: archive,
    recordedArchive: archive, authorityDigest: hashJson(authority),
    limits: { maxBytes: 8_388_608, maxFileBytes: 1_048_576, maxEntries: 256, maxDepth: 2 },
  };
  try {
    const report = await runMutation();
    await writeFile(join(archive, "report.json"), JSON.stringify(report, null, 2) + "\n");
    admitMutationReport(report);
    const evidence = await retainEvidence({ ...selection, classification: "diagnostic" });
    return { report, evidence, scope: "Every security/custody/policy-relevant evidence field mutated under a fully-rehashed digest chain, over five minted evidence topologies; admission vs semantic rejection typed per probe. Survivors are documented self-consistency boundaries, not defects. Exhaustive over the declared field ledger — not over arbitrary multi-field interactions." };
  } catch (error) {
    return retainFailure(error, [async () => { await retainEvidence({ ...selection, classification: "diagnostic" }); }]);
  }
}
