// `algal experiment verify` — re-checks a skill-experiment report against
// the evidence it cites: each arm's session record, its habitat account, its
// catalog, and the ordered task run records. Every aggregate is re-derived
// from the cited records the same way the rollup derives it, so a doctored
// count, a misattributed reuse run, or a borrowed session is a mismatch, not
// an opinion. Two coverage signals ride beside the per-field re-derivation:
// `uncited` counts stored run records claiming an arm's taskIds that the
// session does not cite, and `storeMoved` reports whether the store
// fingerprint differs from the index state the report was computed against.
import { resolve } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { EXPERIMENT_RUN_CONTRACT } from "./experiment-run";
import {
  aggregateExperimentArm,
  loadExperimentArmEvidence,
  parseSkillExperimentReport,
  scanExperimentRunRecords,
  type SkillExperimentArm,
} from "./experiment-report";
import { checkHabitatBudgetEvidence } from "./habitat-budget";
import { programIndexStatus } from "./program-db";
import { parseRunReceipt } from "./run";
import { FileStore } from "./store";
import { asObject, canonicalize, type JsonValue } from "./values";

export type SkillExperimentVerifyReport = {
  ok: boolean;
  digest: Digest;
  /** Task run records examined across all arms. */
  checkedRecords: number;
  /** Stored run records claiming a cited arm's taskIds that the session does
   * not list — duplicate or shadow evidence. */
  uncited: number;
  /** True when the store fingerprint differs from the report's index digest —
   * evidence was added or removed after the report was computed. */
  storeMoved: boolean;
  mismatches: string[];
};

/** Compare one arm's claimed aggregates with the values its cited records
 * derive, pushing a labelled mismatch per drifted field. */
function checkArmAggregates(
  arm: SkillExperimentArm,
  derived: Omit<SkillExperimentArm, "name" | "family" | "session" | "account" | "catalog">,
  mismatches: string[],
): void {
  const at = `arm ${arm.name}`;
  const counts: [keyof Omit<SkillExperimentArm, "name" | "family" | "session" | "account" | "catalog" | "limits" | "reuse" | "holdoutGaps" | "records" | "accountOutcome">, number][] = [
    ["workTotal", derived.workTotal],
    ["attemptsTotal", derived.attemptsTotal],
    ["runsTotal", derived.runsTotal],
    ["tasksAttempted", derived.tasksAttempted],
    ["tasksPassed", derived.tasksPassed],
    ["heldOutPassed", derived.heldOutPassed],
    ["heldOutTotal", derived.heldOutTotal],
    ["invalidTasks", derived.invalidTasks],
    ["exhaustedTasks", derived.exhaustedTasks],
    ["consultations", derived.consultations],
    ["catalogHits", derived.catalogHits],
    ["catalogMisses", derived.catalogMisses],
    ["admissionFailures", derived.admissionFailures],
    ["keptEntries", derived.keptEntries],
    ["reusedEntries", derived.reusedEntries],
  ];
  for (const [field, want] of counts) {
    if (arm[field] !== want) mismatches.push(`${at}.${field}: claimed ${arm[field]}, the cited records derive ${want}`);
  }
  if (arm.accountOutcome !== derived.accountOutcome) {
    mismatches.push(`${at}.accountOutcome: claimed ${arm.accountOutcome}, the account is ${derived.accountOutcome}`);
  }
  if (canonicalize(arm.limits as unknown as JsonValue) !== canonicalize(derived.limits as unknown as JsonValue)) {
    mismatches.push(`${at}.limits differ from the account record`);
  }
  if (canonicalize(arm.reuse as unknown as JsonValue) !== canonicalize(derived.reuse as unknown as JsonValue)) {
    mismatches.push(`${at}.reuse does not match the cited records' reuse join`);
  }
  if (canonicalize(arm.holdoutGaps as unknown as JsonValue) !== canonicalize(derived.holdoutGaps as unknown as JsonValue)) {
    mismatches.push(`${at}.holdoutGaps do not match the cited records`);
  }
  if (canonicalize(arm.records as unknown as JsonValue) !== canonicalize(derived.records as unknown as JsonValue)) {
    mismatches.push(`${at}.records do not match the session's task records in order`);
  }
}

/** Verify an `algal.skill-experiment.v1` report against a store. The digest
 * is recomputed; then, per arm, the cited session is re-parsed (its arm,
 * family, account, and catalog digests must match the report's claims), the
 * account is reconciled with `checkHabitatBudgetEvidence`, every task run
 * record is re-parsed and its receipt re-checked, promotion evidence is
 * re-opened (the stored selection must promote the recorded manifest at the
 * recorded validation score), and each aggregate is re-derived and
 * compared. */
export async function verifyExperimentReport(value: unknown, dir: string): Promise<SkillExperimentVerifyReport> {
  const report = parseSkillExperimentReport(value);
  const root = resolve(dir);
  const store = new FileStore(root);
  const mismatches: string[] = [];
  const { digest: claimed, ...base } = report;
  const actual = digestCanonical(base as unknown as JsonValue);
  if (actual !== claimed) mismatches.push(`digest: claimed ${claimed}, computed ${actual}`);
  let checkedRecords = 0;
  const cited = new Set<Digest>();
  const taskClaims = new Map<string, Set<string>>();
  for (const arm of report.arms) {
    const at = `arm ${arm.name}`;
    let evidence;
    try {
      evidence = await loadExperimentArmEvidence(root, arm.session);
    } catch (error) {
      mismatches.push(`${at}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const { session, records, catalog, account } = evidence;
    if (session.arm !== arm.name) mismatches.push(`${at}: session ${arm.session} ran arm ${session.arm}`);
    if (session.family !== arm.family) mismatches.push(`${at}: session family ${session.family}, not ${arm.family}`);
    if (session.budget !== arm.account) mismatches.push(`${at}: session account is ${session.budget}, not ${arm.account}`);
    if (session.catalog !== arm.catalog) mismatches.push(`${at}: session catalog is ${session.catalog}, not ${arm.catalog}`);
    // The account's own evidence: ceilings are the manifests' declared
    // budgets and charges are the stored receipts' recorded work.
    const accountCheck = await checkHabitatBudgetEvidence(account, store);
    for (const mismatch of accountCheck.mismatches) mismatches.push(`${at}: ${mismatch}`);
    taskClaims.set(arm.name, new Set(session.tasks.map((task) => task.taskId)));
    for (const { digest, run } of records) {
      cited.add(digest);
      checkedRecords += 1;
      const task = `task ${run.taskId}`;
      // Every manifest and receipt the record names must exist and agree.
      if (run.manifest !== null && (await store.getManifest(run.manifest)) === undefined) {
        mismatches.push(`${at}: ${task}'s manifest ${run.manifest} is not in the store`);
      }
      if (run.args !== null && (await store.getValue(run.args)) === undefined) {
        mismatches.push(`${at}: ${task}'s args ${run.args} is not in the store`);
      }
      if (run.generator !== null) {
        const generatorReceipt = await store.getReceipt(run.generator.receipt);
        if (generatorReceipt === undefined) {
          mismatches.push(`${at}: ${task}'s generator receipt ${run.generator.receipt} is not in the store`);
        } else if (parseRunReceipt(generatorReceipt).manifestDigest !== run.generator.manifest) {
          mismatches.push(`${at}: ${task}'s generator receipt ran another manifest`);
        }
      }
      if (run.receipt !== null) {
        const stored = await store.getReceipt(run.receipt);
        if (stored === undefined) {
          mismatches.push(`${at}: ${task}'s receipt ${run.receipt} is not in the store`);
        } else if (parseRunReceipt(stored).manifestDigest !== run.manifest) {
          mismatches.push(`${at}: ${task}'s receipt ran ${parseRunReceipt(stored).manifestDigest}, not ${run.manifest}`);
        }
      }
      // A promotion's evidence: the stored selection must promote the
      // recorded manifest at the recorded validation score.
      if (run.promote?.report) {
        const selection = await store.getValue(run.promote.report);
        if (selection === undefined) {
          mismatches.push(`${at}: ${task}'s promotion evidence ${run.promote.report} is not in the store`);
        } else {
          try {
            const value = asObject(selection, `promotion evidence`);
            const candidates = Array.isArray(value.candidates) ? value.candidates : [];
            const candidate = candidates
              .map((entry) => asObject(entry, `promotion candidate`))
              .find((entry) => entry.manifestDigest === run.manifest);
            if (candidate === undefined) {
              mismatches.push(`${at}: ${task}'s promotion evidence has no candidate ${run.manifest}`);
            } else {
              const validation = asObject(candidate.validation, `promotion validation`);
              if (
                run.promote.validation !== null &&
                (validation.passed !== run.promote.validation.passed || validation.total !== run.promote.validation.total)
              ) {
                mismatches.push(
                  `${at}: ${task} claims validation ${run.promote.validation.passed}/${run.promote.validation.total}, ` +
                  `the promotion evidence records ${String(validation.passed)}/${String(validation.total)}`,
                );
              }
            }
          } catch (error) {
            mismatches.push(`${at}: ${task}'s promotion evidence does not parse: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }
    try {
      const derived = aggregateExperimentArm(
        session,
        records,
        catalog,
        account,
        (manifest) => {
          const set = new Set<Digest>();
          for (const { run } of records) {
            if (run.receipt !== null && run.manifest === manifest) set.add(run.receipt);
          }
          return set;
        },
      );
      checkArmAggregates(arm, derived, mismatches);
    } catch (error) {
      mismatches.push(`${at}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Coverage: a stored run record claiming a cited arm's taskId that the
  // session does not list is shadow evidence the report must explain.
  let uncited = 0;
  const scanned = await scanExperimentRunRecords(root);
  for (const entry of scanned) {
    if (entry.run === undefined) continue;
    const tasks = taskClaims.get(entry.run.arm);
    if (tasks?.has(entry.run.taskId) && !cited.has(entry.digest)) {
      uncited += 1;
      mismatches.push(`another ${EXPERIMENT_RUN_CONTRACT} record ${entry.digest} claims arm ${entry.run.arm} task ${entry.run.taskId}`);
    }
  }
  let storeMoved = false;
  try {
    const status = await programIndexStatus(root);
    storeMoved = status.digest.current !== report.index;
  } catch {
    // A store that cannot be scanned leaves the moved check unanswered.
  }
  return { ok: mismatches.length === 0, digest: claimed, checkedRecords, uncited, storeMoved, mismatches };
}
