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
import { manifestToJson, parseOrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { EXPERIMENT_RUN_CONTRACT, normalizeEmittedManifest, type ExperimentCatalog, type ExperimentRun } from "./experiment-run";
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
    ["correctionsTotal", derived.correctionsTotal],
    ["revisionsTotal", derived.revisionsTotal],
    ["demotionsTotal", derived.demotionsTotal],
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

/** Resolve reuse by catalog identity independently of the report rollup.
 * Retirement and promotion happen after the triggering task executes. */
function checkCatalogHistory(arm: SkillExperimentArm, runs: ExperimentRun[], catalog: ExperimentCatalog, mismatches: string[]): void {
  const promoted = new Map<number, number>();
  const retired = new Map<number, number>();
  for (const [i, run] of runs.entries()) {
    if (run.promote?.promoted && run.promote.entry !== null) promoted.set(run.promote.entry, i);
    if (run.revise?.promoted && run.revise.entry !== null) promoted.set(run.revise.entry, i);
    if (run.promote?.demoted && run.promote.entry !== null) retired.set(run.promote.entry, i);
    if (run.revise?.supersedes != null) retired.set(run.revise.supersedes, i);
  }
  for (const [i, run] of runs.entries()) {
    if (run.consult.outcome !== "hit") continue;
    const index = run.consult.entry!;
    const added = promoted.get(index);
    const removed = retired.get(index);
    if (added !== undefined && i <= added) {
      mismatches.push(`arm ${arm.name}: task ${run.taskId} consulted entry ${index} before its promotion`);
    }
    if ((removed !== undefined && i > removed) || (removed === undefined && catalog.entries[index]?.retired !== undefined)) {
      mismatches.push(`arm ${arm.name}: task ${run.taskId} consulted retired entry ${index}`);
    }
  }
  for (const row of arm.reuse) {
    const consulted = runs.filter((run, i) => run.consult.outcome === "hit" && run.consult.entry === row.entry &&
      run.receipt !== null && run.manifest === row.manifest && i > (promoted.get(row.entry) ?? -1));
    const expected = consulted.map((run) => run.receipt!);
    const heldOut = consulted.filter((run) => run.phase === "unseen" || run.phase === "shift").map((run) => run.receipt!);
    if (canonicalize(row.runs) !== canonicalize(expected) || canonicalize(row.heldOutRuns) !== canonicalize(heldOut)) {
      mismatches.push(`arm ${arm.name}: reuse entry ${row.entry} does not match its consulted task receipts`);
    }
  }
}

/** Revision records cite three distinct joins: the triggering task's
 * evidence, the reviser's execution, and the candidate's evaluation. */
async function checkRevisionEvidence(run: ExperimentRun, catalog: ExperimentCatalog, accountOutcome: "complete" | "exhausted", store: FileStore, mismatches: string[]): Promise<void> {
  const revise = run.revise;
  if (revise === undefined) return;
  const at = `arm ${run.arm}: task ${run.taskId}'s revision`;
  if (run.arm !== "optimizer" || run.consult.outcome !== "hit" || revise.supersedes !== run.consult.entry) {
    mismatches.push(`${at} does not supersede the optimizer's consulted entry`);
  }
  const prior = catalog.entries[revise.supersedes ?? -1];
  const retirement = run.promote?.demoted === true ? run.promote.report : revise.evidence;
  if (prior === undefined || prior.retired !== retirement) {
    mismatches.push(`${at} retirement does not cite its triggering evidence`);
  }
  const evidence = await store.getValue(revise.evidence);
  if (evidence === undefined) {
    mismatches.push(`${at} evidence ${revise.evidence} is not in the store`);
  } else {
    try {
      const value = asObject(evidence, "revision evidence");
      if (value.taskId !== run.taskId || value.trigger !== revise.trigger) {
        mismatches.push(`${at} evidence names another task or trigger`);
      }
      if (revise.trigger === "requalification") {
        if (run.promote?.demoted !== true || value.report !== run.promote.report || run.promote.entry !== run.consult.entry ||
          run.promote.validation === null || run.promote.validation.passed === run.promote.validation.total) {
          mismatches.push(`${at} evidence does not name its failed requalification`);
        }
      } else {
        const stored = run.receipt === null ? undefined : await store.getReceipt(run.receipt);
        const outcome = stored === undefined ? undefined : parseRunReceipt(stored).outcome;
        if (value.receipt !== run.receipt || value.outcome !== outcome) {
          mismatches.push(`${at} evidence does not match its triggering task receipt and outcome`);
        }
        if ((revise.trigger === "failed-run" && (outcome === undefined || outcome === "complete")) ||
          (revise.trigger === "missed-expectation" && (outcome !== "complete" || value.expect === undefined))) {
          mismatches.push(`${at} evidence does not support its ${revise.trigger} trigger`);
        }
      }
    } catch (error) {
      mismatches.push(`${at} evidence does not parse: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const emitted = new Set<Digest>();
  if (revise.generator !== null) {
    const manifest = await store.getManifest(revise.generator.manifest);
    if (manifest === undefined) {
      mismatches.push(`${at} reviser manifest ${revise.generator.manifest} is not in the store`);
    }
    const stored = await store.getReceipt(revise.generator.receipt);
    if (stored === undefined) {
      mismatches.push(`${at} reviser receipt ${revise.generator.receipt} is not in the store`);
    } else {
      const receipt = parseRunReceipt(stored);
      if (receipt.manifestDigest !== revise.generator.manifest) mismatches.push(`${at} reviser receipt ran another manifest`);
      if (revise.evaluated && receipt.outcome !== "complete") mismatches.push(`${at} evaluated a candidate without a completed reviser`);
      const evidenceInput = manifest?.interface?.inputs.evidence;
      if (evidenceInput !== undefined && evidence !== undefined) {
        const delivered = receipt.args[evidenceInput.cell]?.[evidenceInput.port];
        if (delivered === undefined || canonicalize(delivered) !== canonicalize(evidence)) {
          mismatches.push(`${at} evidence differs from the reviser's recorded input`);
        }
      }
      // The session does not retain the configured output/field selector.
      // Prove the evaluated manifest was exposed by a declared output,
      // either directly or under one wrapper field, as the runner permits.
      for (const source of Object.values(manifest?.interface?.outputs ?? {})) {
        const output = receipt.cells[source.cell]?.outputs?.[source.port];
        const possibilities = [output, ...(output !== null && typeof output === "object" && !Array.isArray(output) ? Object.values(output) : [])];
        for (let candidate of possibilities) {
          if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) continue;
          if (revise.generator.normalized !== undefined) {
            const normalized = normalizeEmittedManifest(candidate);
            if (canonicalize(normalized.repairs) !== canonicalize(revise.generator.normalized)) continue;
            candidate = normalized.value as JsonValue;
          }
          try {
            emitted.add(digestCanonical(manifestToJson(parseOrganismManifest(candidate))));
          } catch {
            // Other declared outputs and wrapper fields need not be manifests.
          }
        }
      }
    }
  } else if (revise.evaluated) {
    mismatches.push(`${at} evaluated a candidate without a reviser receipt`);
  } else if (accountOutcome !== "exhausted") {
    mismatches.push(`${at} has no reviser receipt without an exhausted account`);
  }
  if (revise.report === null) return;
  const selection = await store.getValue(revise.report);
  if (selection === undefined) {
    mismatches.push(`${at} evaluation ${revise.report} is not in the store`);
    return;
  }
  try {
    const value = asObject(selection, "revision evaluation");
    const candidates = Array.isArray(value.candidates) ? value.candidates : [];
    if (candidates.length !== 1) {
      mismatches.push(`${at} evaluation must name one candidate`);
      return;
    }
    const candidate = asObject(candidates[0], "revision candidate");
    const manifest = asDigest(candidate.manifestDigest, "revision candidate manifest");
    if (!emitted.has(manifest)) mismatches.push(`${at} evaluated a manifest absent from the reviser's declared outputs`);
    if ((await store.getManifest(manifest)) === undefined) mismatches.push(`${at} evaluated manifest ${manifest} is not in the store`);
    const validation = asObject(candidate.validation, "revision validation");
    if (revise.validation === null || validation.passed !== revise.validation.passed || validation.total !== revise.validation.total) {
      mismatches.push(`${at} validation does not match its evaluation`);
    }
    if (!revise.evaluated || value.promoted !== manifest) mismatches.push(`${at} evaluation does not select its candidate`);
    if (revise.promoted && (catalog.entries[revise.entry ?? -1]?.manifest !== manifest || validation.passed !== validation.total)) {
      mismatches.push(`${at} promotion does not match the passing evaluated manifest`);
    }
  } catch (error) {
    mismatches.push(`${at} evaluation does not parse: ${error instanceof Error ? error.message : String(error)}`);
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
    checkCatalogHistory(arm, records.map(({ run }) => run), catalog, mismatches);
    for (const { digest, run } of records) {
      cited.add(digest);
      checkedRecords += 1;
      const task = `task ${run.taskId}`;
      await checkRevisionEvidence(run, catalog, account.outcome, store, mismatches);
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
