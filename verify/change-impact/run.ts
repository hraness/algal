/**
 * verify/change-impact/run.ts — emit the `algal.change-impact.v1` report.
 *
 * The report is the Phase 17 semantic-input → required-verification map:
 * every governed input (the same set `captureBinding` hashes into every
 * suite result) is classified and resolved to the suites its edit requires.
 * The run then executes the policy self-test — deliberate fixture mutations
 * of the map that must all be rejected — before reporting status. A
 * "passed" report means the map is complete, every required name resolves
 * to a registered suite or the aggregate, and the gate demonstrably rejects
 * tampering.
 */
import { realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { hashFile, hashJson, stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { SUITES } from "../lib/suites";
import { AGGREGATE_SUITE, CLASSIFICATION_RULES } from "./classification";
import { buildImpactMap, mapDigest, type ImpactRow } from "./impact";
import { admitChangeImpactReport, checkImpact, type ChangeImpactReport } from "./policy";
import { runSelftest, SELFTEST_CASES } from "./selftest";

/** Canonical serialization of the rule table so the report binds the exact
 *  classification policy that produced it. */
function rulesDigest(): string {
  return hashJson(CLASSIFICATION_RULES.map(rule => ({ name: rule.name, class: rule.class, match: rule.match, suites: [...rule.suites] })));
}

export async function runChangeImpact(root: string): Promise<ChangeImpactReport> {
  const { rows, ctx, unresolvedImports } = await buildImpactMap(root);
  const violations = checkImpact(rows, ctx);
  const selftest = runSelftest(rows, ctx);

  const classes: Record<string, number> = {};
  const suitesReferenced = new Set<string>();
  let suiteDischarged = 0, classified = 0;
  const coverage = { propertyBound: 0, laneBound: 0, importClosure: 0, aggregateFallback: 0, classifiedOnly: 0 };
  const reviewQueue: string[] = [];
  for (const row of rows) {
    classes[row.class] = (classes[row.class] ?? 0) + 1;
    for (const suite of row.required) suitesReferenced.add(suite);
    if (row.discharge === "suite") suiteDischarged++; else classified++;
    if (row.properties.length > 0) coverage.propertyBound++;
    if (row.class === "suite-source") coverage.laneBound++;
    if (row.via.includes("import-closure")) coverage.importClosure++;
    if (row.via.includes("aggregate-fallback")) coverage.aggregateFallback++;
    if (row.discharge === "classified") coverage.classifiedOnly++;
    if (row.via.includes("aggregate-fallback") || row.discharge === "classified") reviewQueue.push(row.path);
  }
  requireThat(suiteDischarged + classified === rows.length, "discharge accounting");

  // Pinned digest drift: registry-pinned content that no longer matches —
  // the claims suite's own gate, surfaced here as a review signal.
  const staleBindings: string[] = [];
  for (const [path, pinned] of ctx.pinnedDigests) {
    const current = ctx.digests.get(path);
    if (current !== undefined && current !== pinned) staleBindings.push(path);
  }
  staleBindings.sort();

  const suiteStatus = (name: string): "ready" | "not-started" | "aggregate" =>
    name === AGGREGATE_SUITE ? "aggregate" : SUITES.get(name) === "ready" ? "ready" : "not-started";
  const suites: Record<string, "ready" | "not-started" | "aggregate"> = {};
  for (const suite of [...suitesReferenced].sort()) suites[suite] = suiteStatus(suite);

  const status = violations.length === 0 && selftest.allRejected ? "passed" : "failed";
  const report: ChangeImpactReport = {
    contract: "algal.change-impact.v1",
    status,
    inputs: { total: rows.length, suite: suiteDischarged, classified, unresolvedImports },
    classes,
    suites,
    coverage,
    reviewQueue,
    staleBindings,
    map: rows,
    selftest,
    violations,
    digests: {
      map: mapDigest(rows),
      rules: rulesDigest(),
      registry: await hashFile(root, "verify/properties.json"),
      runner: await hashFile(root, "verify/lib/runner.ts"),
    },
  };
  admitChangeImpactReport(JSON.parse(stableJson(report)), ctx);
  requireThat(SELFTEST_CASES.length === report.selftest.cases.length, "selftest case count drifted");
  return report;
}

export type { ImpactRow };

async function main(): Promise<void> {
  const root = await realpath(resolve(dirname(import.meta.path), "..", ".."));
  const report = await runChangeImpact(root);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "passed") process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  });
}
