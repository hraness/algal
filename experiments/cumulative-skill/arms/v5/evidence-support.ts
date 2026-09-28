// Offline joins and accounting for the matched study. None of these helpers
// construct an executor or grant operational authority.
import { manifestToJson, type OrganismManifest } from "../../../../src/contract";
import { asDigest, digestCanonical, type Digest } from "../../../../src/digest";
import { evalScorer } from "../../../../src/expr";
import { taskBatchArgs, type ExperimentTaskSpec } from "../../../../src/experiment-task";
import { checkHabitatBudgetEvidence, parseHabitatBudget, type HabitatBudget, type HabitatLimits } from "../../../../src/habitat-budget";
import { parseEvaluationEvidence, parsePromotionDecision } from "../../../../src/host-contract";
import { IMPROVE_SPLIT_POLICY, type ImproveCase, type ImproveLabels, type ImproveResult } from "../../../../src/improve";
import { parseRunReceipt, receiptDigest, RUNTIME_VERSION } from "../../../../src/run";
import type { Store } from "../../../../src/store";
import { asObject, canonicalize, noUnknownKeys, type JsonObject, type JsonValue } from "../../../../src/values";
import { SCORER, taskLineageGroup, taskTruth } from "./shared";

export const ARMS = ["fixed", "retained", "optimizer", "optimizer-raw"] as const;
export type StudyArm = typeof ARMS[number];
export const json = (value: unknown): JsonValue => value as JsonValue;
export const same = (a: unknown, b: unknown): boolean => canonicalize(json(a)) === canonicalize(json(b));
export function requireMatch(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export async function storedValue(store: Pick<Store, "getValue">, digest: Digest): Promise<JsonValue> {
  const value = await store.getValue(digest);
  requireMatch(value !== undefined && digestCanonical(value) === digest, `missing or mismatched value ${digest}`);
  return value;
}
export async function storedManifest(store: Pick<Store, "getManifest">, digest: Digest): Promise<OrganismManifest> {
  const manifest = await store.getManifest(digest);
  requireMatch(manifest !== undefined && digestCanonical(manifestToJson(manifest)) === digest, `missing or mismatched manifest ${digest}`);
  return manifest;
}

export type StudyCost = {
  workUnits: number; admittedRuns: number; modelCalls: number;
  tokensIn: number | null; tokensOut: number | null; effectsMissingUsage: number;
};
export const zeroCost = (): StudyCost => ({ workUnits: 0, admittedRuns: 0, modelCalls: 0, tokensIn: 0, tokensOut: 0, effectsMissingUsage: 0 });
export function addCosts(...costs: StudyCost[]): StudyCost {
  return costs.reduce((a, b) => ({ workUnits: a.workUnits + b.workUnits,
    admittedRuns: a.admittedRuns + b.admittedRuns, modelCalls: a.modelCalls + b.modelCalls,
    tokensIn: a.tokensIn === null || b.tokensIn === null ? null : a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut === null || b.tokensOut === null ? null : a.tokensOut + b.tokensOut,
    effectsMissingUsage: a.effectsMissingUsage + b.effectsMissingUsage }), zeroCost());
}

/** Charges count admissions, including identical receipt content on repeated
 * runs. Missing token usage stays unknown, never a zero-dollar inference. */
export async function accountCost(store: Store, account: HabitatBudget): Promise<StudyCost> {
  const checked = await checkHabitatBudgetEvidence(account, store);
  requireMatch(checked.mismatches.length === 0, `account evidence: ${checked.mismatches.join("; ")}`);
  const cost = zeroCost();
  cost.workUnits = account.charged.work;
  cost.admittedRuns = account.charged.runs;
  cost.modelCalls = account.charged.attempts;
  for (const run of account.runs) {
    const raw = await store.getReceipt(run.receipt);
    requireMatch(raw !== undefined && digestCanonical(raw) === run.receipt, `missing or mismatched charged receipt ${run.receipt}`);
    const receipt = parseRunReceipt(raw);
    requireMatch(receipt.digest === receiptDigest(receipt), "charged receipt inner digest mismatch");
    for (const effect of receipt.effects) {
      if (effect.usage?.tokensIn === undefined) cost.tokensIn = null;
      else if (cost.tokensIn !== null) cost.tokensIn += effect.usage.tokensIn;
      if (effect.usage?.tokensOut === undefined) cost.tokensOut = null;
      else if (cost.tokensOut !== null) cost.tokensOut += effect.usage.tokensOut;
      if (effect.usage?.tokensIn === undefined || effect.usage?.tokensOut === undefined) cost.effectsMissingUsage++;
    }
    const unrecorded = Math.max(0, receipt.work.agentCalls - receipt.effects.length);
    if (unrecorded > 0) {
      cost.tokensIn = null; cost.tokensOut = null; cost.effectsMissingUsage += unrecorded;
    }
  }
  return cost;
}

/** Every frozen holdout lineage is absent from the entire learning corpus,
 * not just from the two selection cases. No learned shift batch is reused. */
export function frozenCases(learning: ExperimentTaskSpec[], holdout: ExperimentTaskSpec[]): ImproveCase[] {
  requireMatch(learning.length > 0 && learning.every((task) => task.phase !== "shift"), "learning schedule contains shift data");
  requireMatch(holdout.length === 8 && holdout.every((task) => task.phase === "shift"), "expected eight fresh shift holdout tasks");
  const learnedGroups = new Set(learning.map(taskLineageGroup));
  requireMatch(holdout.every((task) => !learnedGroups.has(taskLineageGroup(task))), "frozen holdout shares learning ancestry");
  const acquisition = learning.find((task) => task.phase === "acquisition");
  const unseen = learning.find((task) => task.phase === "unseen");
  requireMatch(acquisition !== undefined && unseen !== undefined, "frozen evaluation needs acquisition and unseen selection cases");
  requireMatch(taskLineageGroup(acquisition) !== taskLineageGroup(unseen), "selection groups overlap");
  const make = (task: ExperimentTaskSpec, split: ImproveCase["split"]): ImproveCase => ({
    id: `${split}-${task.taskId}`, group: taskLineageGroup(task), split,
    args: taskBatchArgs(task, task.inputs.find((batch) => batch.split === "holdout")!),
    expect: taskTruth(task),
  });
  return [make(acquisition, "train"), make(unseen, "validation"), ...holdout.map((task) => make(task, "holdout"))];
}

export type FrozenHead = { name: StudyArm; manifest: Digest | null };
export const FROZEN_POLICY = { rule: "strict-holdout-improvement", minHoldoutGroups: 3, independentLabels: true };
export const FROZEN_LABELS = {
  provenance: "Independent deterministic machine truth from fresh seeded synthetic record-triage tasks; no human judgment or provider attestation.",
  redactionPolicy: "Synthetic records only; no user, provider, or private data.", independent: true,
};
export type FrozenExpectation = { incumbent: Digest; heads: FrozenHead[]; cases: ImproveCase[];
  policy: JsonValue; budget: HabitatLimits; environment: string; labels: ImproveLabels };
function mappedInputs(manifest: OrganismManifest, task: ImproveCase): Record<string, JsonObject> {
  const args: Record<string, JsonObject> = {};
  for (const [name, val] of Object.entries(task.args)) {
    const target = manifest.interface!.inputs[name];
    requireMatch(target !== undefined, `${manifest.key}: case input absent from manifest`);
    (args[target.cell] ??= {})[target.port] = val;
  }
  return args;
}

/** Validate the exported native records against the exact frozen suite and
 * stored receipts, including cached exports read on a later offline pass. */
export async function verifyFrozenResult(value: unknown, expected: FrozenExpectation, store: Store): Promise<ImproveResult> {
  const raw = asObject(value, "frozen result");
  noUnknownKeys(raw, ["report", "evidence", "decisions"], "frozen result");
  const result = raw as unknown as ImproveResult;
  const report = asObject(raw.report, "frozen report");
  noUnknownKeys(report, ["contract", "incumbent", "dataset", "arms", "winner", "comparison", "insufficientReasons", "digest"], "frozen report");
  const { digest, ...base } = report;
  requireMatch(report.contract === "algal.improve.v1" && digest === digestCanonical(base), "frozen report digest mismatch");
  requireMatch(report.incumbent === expected.incumbent && asObject(report.dataset, "dataset").digest === digestCanonical(json(expected.cases)), "frozen report plan mismatch");
  requireMatch(same(report.dataset, { digest: digestCanonical(json(expected.cases)), groups: [...new Set(expected.cases.map((task) => task.group))].sort(),
    splitPolicy: IMPROVE_SPLIT_POLICY, labelProvenance: expected.labels.provenance, redactionPolicy: expected.labels.redactionPolicy }), "frozen dataset protocol mismatch");
  requireMatch(Array.isArray(report.arms) && report.arms.length <= 5 && Array.isArray(raw.evidence) && Array.isArray(raw.decisions), "invalid frozen result lists");
  const wanted = [{ name: "incumbent", manifest: expected.incumbent }, ...expected.heads.filter((head) => head.name !== "fixed" && head.manifest !== null)];
  requireMatch(same(result.report.arms.map((arm) => arm.name), wanted.map((head) => head.name)), "frozen report arm coverage mismatch");
  const evidence = result.evidence.map(parseEvaluationEvidence);
  const decisions = result.decisions.map(parsePromotionDecision);
  const byEvidence = new Map(evidence.map((record) => [record.digest, record]));
  const selectionCases = expected.cases.filter((task) => task.split !== "holdout");
  const heldCases = expected.cases.filter((task) => task.split === "holdout");
  const holdoutGroupCount = new Set(heldCases.map((task) => task.group)).size;
  const incumbentManifest = await storedManifest(store, expected.incumbent);
  const score = (rows: ImproveResult["report"]["arms"][number]["holdout"]) => rows.length === 0 ? 0 : rows.filter((row) => row.passed).length / rows.length;
  for (const [i, arm] of result.report.arms.entries()) {
    noUnknownKeys(asObject(arm, "frozen arm"), ["name", "kind", "generations", "candidates", "promoted", "exhausted", "failure", "workUnits", "holdout", "evidence", "decision", "pareto", "budget"], "frozen arm");
    const head = wanted[i]!.manifest!;
    requireMatch(arm.kind === "fixed" && arm.generations.length === 0 && (arm.promoted === null || arm.promoted === head), `${arm.name}: not the frozen singleton candidate`);
    requireMatch(arm.candidates.length <= 1 && arm.candidates.every((candidate) => candidate.manifestDigest === head), `${arm.name}: candidate drift`);
    requireMatch(arm.budget !== undefined, `${arm.name}: missing frozen account`);
    const budget = parseHabitatBudget(arm.budget);
    requireMatch(budget.activity === "foundry" && same(budget.limits, expected.budget), `${arm.name}: frozen budget protocol mismatch`);
    await accountCost(store, budget);
    requireMatch(arm.workUnits === budget.charged.work, `${arm.name}: work differs from account`);
    const manifest = await storedManifest(store, head);
    const rows = [...arm.candidates.flatMap((candidate) => candidate.cases), ...arm.holdout];
    requireMatch((arm.evidence !== null) === (arm.promoted !== null), `${arm.name}: native evidence presence mismatch`);
    requireMatch((arm.decision !== null) === (arm.name !== "incumbent" && arm.promoted !== null && arm.promoted !== expected.incumbent), `${arm.name}: native decision presence mismatch`);
    requireMatch(rows.length <= expected.cases.length && new Set(rows.map((row) => row.id)).size === rows.length, `${arm.name}: duplicate or extra frozen case`);
    if (!arm.exhausted && arm.failure === null) {
      requireMatch(budget.outcome === "complete" && arm.promoted === head && arm.candidates.length === 1 &&
        same(arm.candidates[0]!.cases.map((row) => row.id), selectionCases.map((task) => task.id)) &&
        same(arm.holdout.map((row) => row.id), heldCases.map((task) => task.id)), `${arm.name}: frozen split/order/coverage mismatch`);
      requireMatch(same(budget.runs.map((run) => ({ manifest: run.manifest, receipt: run.receipt })),
        rows.flatMap((row) => row.receiptDigest === null ? [] : [{ manifest: head, receipt: row.receiptDigest }])), `${arm.name}: frozen account run order or multiplicity mismatch`);
    } else {
      // runImprovement's fixed-arm catch retains the account but discards the
      // interrupted result assignment. Never turn that absence into a pass.
      requireMatch(arm.promoted === null && rows.length === 0 && arm.candidates.length === 0 &&
        (!arm.exhausted || budget.outcome === "exhausted"), `${arm.name}: invalid interrupted native result`);
      let last = -1;
      for (const run of budget.runs) {
        const receipt = parseRunReceipt(await store.getReceipt(run.receipt));
        const next = expected.cases.findIndex((task, index) => index > last && same(receipt.args, mappedInputs(manifest, task)));
        requireMatch(run.manifest === head && next > last, `${arm.name}: interrupted account has unrelated or repeated runs`);
        last = next;
      }
    }
    for (const candidate of arm.candidates) {
      noUnknownKeys(asObject(candidate, "frozen candidate"), ["manifestDigest", "manifestKey", "train", "validation", "work", "usage", "cases"], "frozen candidate");
      for (const split of ["train", "validation"] as const) {
        const splitRows = candidate.cases.filter((row) => row.split === split);
        requireMatch(same(candidate[split], { passed: splitRows.filter((row) => row.passed).length, total: splitRows.length }), `${arm.name}: selection score mismatch`);
      }
      requireMatch(candidate.manifestKey === manifest.key && same(candidate.work, candidate.cases.reduce((total, row) => ({
        units: total.units + row.work.units, steps: total.steps + row.work.steps, agentCalls: total.agentCalls + row.work.agentCalls,
      }), { units: 0, steps: 0, agentCalls: 0 })) && same(candidate.usage, candidate.cases.reduce((total, row) => ({
        tokensIn: total.tokensIn + row.usage.tokensIn, tokensOut: total.tokensOut + row.usage.tokensOut,
      }), { tokensIn: 0, tokensOut: 0 })), `${arm.name}: selection accounting mismatch`);
    }
    for (const row of rows) {
      noUnknownKeys(asObject(row, "frozen case"), ["id", "group", "split", "passed", "outcome", "feedback", "args", "outputs", "expect", "receiptDigest", "reservedUnits", "work", "usage"], "frozen case");
      const task = expected.cases.find((candidate) => candidate.id === row.id);
      requireMatch(task !== undefined && row.group === task.group && row.split === task.split && same(row.args, task.args) && same(row.expect, task.expect), `${arm.name}/${row.id}: frozen case identity mismatch`);
      if (row.receiptDigest === null) {
        requireMatch(row.outcome === "failed" && !row.passed && row.reservedUnits === 0 &&
          same(row.work, { steps: 0, agentCalls: 0, units: 0 }) && same(row.usage, { tokensIn: 0, tokensOut: 0 }) &&
          same(row.outputs, {}), `${arm.name}/${row.id}: missing receipt scored as success`);
        continue;
      }
      const receiptValue = await store.getReceipt(asDigest(row.receiptDigest, "case receipt"));
      requireMatch(receiptValue !== undefined && digestCanonical(receiptValue) === row.receiptDigest, `${arm.name}/${row.id}: receipt digest mismatch`);
      const receipt = parseRunReceipt(receiptValue);
      const args = mappedInputs(manifest, task);
      const outputs: JsonObject = {};
      for (const [name, source] of Object.entries(manifest.interface!.outputs)) {
        const output = receipt.cells[source.cell]?.outputs?.[source.port];
        if (output !== undefined) outputs[name] = output;
      }
      requireMatch(receipt.digest === receiptDigest(receipt) && receipt.manifestDigest === head && same(receipt.args, args) &&
        row.outcome === receipt.outcome && same(row.outputs, outputs) && same(row.work, receipt.work), `${arm.name}/${row.id}: frozen receipt identity mismatch`);
      requireMatch(budget.runs.some((run) => run.manifest === head && run.receipt === row.receiptDigest), `${arm.name}/${row.id}: receipt not charged`);
      requireMatch(row.reservedUnits === manifest.budgets.maxWork && same(row.usage,
        receipt.effects.reduce((total, effect) => ({ tokensIn: total.tokensIn + (effect.usage?.tokensIn ?? 0),
          tokensOut: total.tokensOut + (effect.usage?.tokensOut ?? 0) }), { tokensIn: 0, tokensOut: 0 })), `${arm.name}/${row.id}: receipt usage or reservation mismatch`);
      requireMatch(row.passed === (receipt.outcome === "complete" && evalScorer(SCORER as never, task, outputs)), `${arm.name}/${row.id}: frozen score mismatch`);
    }
    if (arm.evidence !== null) {
      const record = byEvidence.get(arm.evidence);
      requireMatch(record !== undefined && record.candidateArtifact === head && record.baseArtifact === expected.incumbent && same(record.dataset, result.report.dataset), `${arm.name}: evidence names another candidate or dataset`);
      requireMatch(record.evaluator.scorerDigest === digestCanonical(json(SCORER)) &&
        record.evaluator.runtimeDigest === digestCanonical({ name: "algal", version: RUNTIME_VERSION }) && record.evaluator.routeDigest === null, `${arm.name}: evaluator identity mismatch`);
      const limitations = ["independent review pending"];
      if (!expected.labels.independent) limitations.push("labels are not independent");
      if (holdoutGroupCount < 3) limitations.push(`holdout covers ${holdoutGroupCount} group(s), below the minimum 3`);
      requireMatch(same(record.independentReview, { status: "not-reviewed", reviewer: null, notes: null }) &&
        same(record.limitations, limitations.sort()) && record.claimCategory ===
          (expected.labels.independent && holdoutGroupCount >= 3 && arm.holdout.length > 0 ? "effectiveness" : "replay") &&
        record.charges.unit === "work-units" && record.usage.units === "algal work units (receipt work.units)", `${arm.name}: native review, units, or claim mismatch`);
      requireMatch(record.charges.reserved === rows.reduce((total, row) => total + row.reservedUnits, 0) &&
        record.charges.settled === rows.reduce((total, row) => total + row.work.units, 0) &&
        record.usage.modelCalls === rows.reduce((total, row) => total + row.work.agentCalls, 0) &&
        record.usage.tokensIn === rows.reduce((total, row) => total + row.usage.tokensIn, 0) &&
        record.usage.tokensOut === rows.reduce((total, row) => total + row.usage.tokensOut, 0), `${arm.name}: evidence accounting mismatch`);
      for (const split of ["train", "validation", "holdout"] as const) {
        const splitRows = rows.filter((row) => row.split === split);
        const outcome = record.outcomes[split];
        requireMatch(outcome.total === splitRows.length && outcome.passed === splitRows.filter((row) => row.passed).length &&
          outcome.score === (outcome.total === 0 ? 0 : outcome.passed / outcome.total) &&
          same(outcome.cases, splitRows.map((row) => ({ id: row.id, group: row.group,
            outcome: row.outcome === "complete" ? "complete" : row.outcome === "suspended" ? "uncertain" : "failed",
            passed: row.passed, score: row.passed ? 1 : 0, receipt: row.receiptDigest, feedback: row.feedback }))), `${arm.name}: evidence outcome mismatch`);
      }
    } else requireMatch(arm.promoted === null, `${arm.name}: missing candidate evidence`);
    if (arm.decision !== null) {
      const decision = decisions.find((record) => record.digest === arm.decision);
      requireMatch(decision !== undefined && decision.incumbent === expected.incumbent && decision.candidate === head && decision.evidence === arm.evidence, `${arm.name}: decision evidence mismatch`);
      requireMatch(decision.policy === digestCanonical(expected.policy) && decision.scope.environment === expected.environment &&
        decision.scope.tenant === null && decision.scope.contact === null && decision.reviewer.id === "algal.improve.v1" &&
        decision.rollback.target === expected.incumbent && decision.rollback.compatibility === digestCanonical(json(incumbentManifest.interface ?? null)), `${arm.name}: decision policy or scope mismatch`);
      requireMatch(same(decision.rollout, { mode: "shadow", sampleLimit: 0, trafficLimit: 0, expiresAfter: null }), "study decision would activate traffic");
      requireMatch(decision.rollback.reason === (decision.reviewer.status === "approved" ? null : result.report.comparison === "insufficient" ? "insufficient evidence" : "another arm won the comparison"), `${arm.name}: native rollback reason differs`);
      const incumbent = result.report.arms[0]!;
      requireMatch(same(decision.observedMetrics, { holdoutPassed: arm.holdout.filter((row) => row.passed).length, holdoutTotal: arm.holdout.length,
        holdoutScore: score(arm.holdout), incumbentHoldoutScore: score(incumbent.holdout), workUnits: arm.workUnits, incumbentWorkUnits: incumbent.workUnits }), `${arm.name}: decision metrics differ from evidence`);
      if (decision.reviewer.status === "approved") requireMatch(result.report.winner === arm.name && score(arm.holdout) > score(incumbent.holdout), "approval requires strict frozen holdout improvement");
    }
  }
  requireMatch(same(evidence.map((record) => record.digest), result.report.arms.flatMap((arm) => arm.evidence === null ? [] : [arm.evidence])) &&
    same(decisions.map((record) => record.digest), result.report.arms.flatMap((arm) => arm.decision === null ? [] : [arm.decision])), "uncited or reordered frozen records");
  const baseline = result.report.arms[0]!;
  const contenders = result.report.arms.slice(1).filter((arm) => arm.promoted !== null && arm.holdout.length > 0);
  const improving = contenders.filter((arm) => score(arm.holdout) > score(baseline.holdout));
  const reasons: string[] = [];
  if (baseline.holdout.length === 0) reasons.push("incumbent baseline has no holdout evidence");
  if (!expected.labels.independent) reasons.push("labels are not independent");
  const groups = new Set(heldCases.map((task) => task.group)).size;
  if (groups < 3) reasons.push(`holdout covers ${groups} group(s), below the minimum 3`);
  if (contenders.length === 0) reasons.push("no non-incumbent arm completed a holdout evaluation");
  if (contenders.length > 0 && improving.length === 0) reasons.push("no arm improved on the incumbent baseline holdout score");
  const winner = reasons.length > 0 ? null : improving.sort((a, b) => score(b.holdout) - score(a.holdout) || a.workUnits - b.workUnits || a.name.localeCompare(b.name))[0]!.name;
  requireMatch(result.report.winner === winner && result.report.comparison === (winner === null ? "insufficient" : "decisive") &&
    same(result.report.insufficientReasons, reasons.sort()), "native comparison differs from frozen outcomes");
  for (const arm of result.report.arms) {
    const decision = decisions.find((record) => record.digest === arm.decision);
    if (decision !== undefined) requireMatch(decision.reviewer.status === (arm.name === winner ? "approved" : "rejected"), `${arm.name}: decision does not follow native winner`);
    const pareto = !result.report.arms.some((other) => other !== arm && other.holdout.length > 0 && score(other.holdout) >= score(arm.holdout) &&
      other.workUnits <= arm.workUnits && (score(other.holdout) > score(arm.holdout) || other.workUnits < arm.workUnits));
    requireMatch(arm.pareto === pareto, `${arm.name}: native Pareto outcome differs`);
  }
  return result;
}

/** Self-signed record identities and whole-record CAS addresses differ. Keep
 * the explicit mapping so native decision references can be resolved. */
export async function putSignedRecord(store: Pick<Store, "putValue">, record: { digest: Digest }): Promise<{ recordDigest: Digest; valueDigest: Digest }> {
  const value = json(record);
  const { digest, ...base } = asObject(value, "signed study record");
  requireMatch(digest === digestCanonical(base), "signed study record digest mismatch");
  return { recordDigest: record.digest, valueDigest: await store.putValue(value) };
}

export type CohortArm = { arm: StudyArm; passed: number; planned: number; observed: number; complete: boolean; cost: StudyCost };
export type Cohort = { corpus: string; arms: CohortArm[] };
export function pairedSummary(cohorts: Cohort[]) {
  const comparisons = ARMS.filter((arm) => arm !== "fixed").map((arm) => {
    const pairs = cohorts.map((cohort) => {
      const candidate = cohort.arms.find((row) => row.arm === arm);
      const baseline = cohort.arms.find((row) => row.arm === "fixed");
      requireMatch(candidate !== undefined && baseline !== undefined && candidate.planned === baseline.planned && baseline.planned > 0, "paired summary is missing a matched arm or denominator");
      return { corpus: cohort.corpus, candidate: candidate.passed / candidate.planned, baseline: baseline.passed / baseline.planned,
        delta: (candidate.passed - baseline.passed) / candidate.planned,
        complete: candidate.complete && baseline.complete,
        workDelta: candidate.cost.workUnits - baseline.cost.workUnits,
        modelCallDelta: candidate.cost.modelCalls - baseline.cost.modelCalls };
    });
    const complete = pairs.length === 3 && pairs.every((pair) => pair.complete);
    return { arm, pairs, cohorts: pairs.length, complete,
      meanDelta: pairs.length === 0 ? null : pairs.reduce((sum, pair) => sum + pair.delta, 0) / pairs.length,
      minDelta: pairs.length === 0 ? null : Math.min(...pairs.map((pair) => pair.delta)),
      maxDelta: pairs.length === 0 ? null : Math.max(...pairs.map((pair) => pair.delta)),
      positive: pairs.filter((pair) => pair.delta > 0).length, tied: pairs.filter((pair) => pair.delta === 0).length,
      negative: pairs.filter((pair) => pair.delta < 0).length,
      finding: !complete ? "insufficient" : pairs.every((pair) => pair.delta === 0) ? "no-observed-gain" :
        pairs.every((pair) => pair.delta > 0) ? "positive-on-all-three-corpora" : "mixed-or-negative" };
  });
  return { comparisons, limits: [
    "Three corpus seeds, one session per arm and seed; task batches are not independent study repetitions.",
    "Descriptive paired differences only; no significance or production-effectiveness claim.",
    "Scores divide by all planned holdouts, including failed and unexecuted cases.",
    "Standalone strategy costs include the full common seed cost; realized study cost counts that seed once.",
    "Work and model-call counts are receipt accounting, not provider billing; absent token usage remains null.",
  ] };
}
