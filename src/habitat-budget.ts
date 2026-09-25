/** Habitat-wide work accounting: one account for every run that belongs to
 * one habitat activity (a foundry run, a search, or the evaluations of an
 * application experiment), separate from the per-run root budget.
 *
 * Before a run starts, the account reserves the run's declared ceiling: its
 * root manifest's `maxWork` and `maxAgentCalls` (nested children share the
 * root allowance), plus one run. The run is admitted only when that ceiling
 * fits beside everything already charged. After the run, the account charges
 * the work units and executor attempts its receipt records, whatever the
 * outcome: losing candidates, failed runs, failure-edge recovery, and retried
 * provider attempts all cost what they recorded. The rest of the reservation
 * is released. The first refused reservation is terminal. It is recorded
 * with the limits it would have exceeded, and the account admits nothing
 * afterwards.
 *
 * The closed `algal.habitat-budget.v1` record lists every admitted run in
 * admission order with its receipt, ceiling, and charge, so the admission
 * arithmetic is recomputed from the record alone and every charge is checked
 * against a receipt that replays offline. It carries no wall-clock values.
 *
 * This is deliberately not the application namespace quota:
 * `algal.application-quota.v1` is a mutable host ledger of filesystem bytes
 * measured from the environment and never replayed. This account charges
 * deterministic receipt quantities and is retained as evidence. */
import { BOUNDS, manifestToJson, type Budgets } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { FnRegistry } from "./registry";
import { parseRunReceipt, type RunReceipt } from "./run";
import type { Store } from "./store-contract";
import type { ToolRegistry } from "./tools";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

export const HABITAT_BUDGET_CONTRACT = "algal.habitat-budget.v1" as const;

const MAX_RUNS = 4_096;

export const HABITAT_BUDGET_BOUNDS = Object.freeze({
  /** Admitted runs per account, and the largest `limits.runs`. */
  maxRuns: MAX_RUNS,
  /** Largest `limits.work`: `maxRuns` runs at the largest per-run `maxWork`. */
  maxWork: MAX_RUNS * BOUNDS.maxWork,
  /** Largest `limits.attempts`: `maxRuns` runs at the largest per-run `maxAgentCalls`. */
  maxAttempts: MAX_RUNS * BOUNDS.maxAgentCalls,
  /** Largest work one run may be charged; the foundry case-record bound. */
  maxRunWork: 4_294_967_295,
});

export const HABITAT_ACTIVITIES = ["experiment", "foundry", "search"] as const;
export type HabitatActivity = (typeof HABITAT_ACTIVITIES)[number];
/** Limits a refused reservation would exceed, in this (sorted) order. */
export type HabitatDimension = "attempts" | "runs" | "work";

export type HabitatLimits = { work: number; attempts: number; runs: number };
export type HabitatAmount = { work: number; attempts: number };
export type HabitatRun = {
  manifest: Digest;
  receipt: Digest;
  /** The root manifest's declared `maxWork` and `maxAgentCalls`. */
  ceiling: HabitatAmount;
  /** The receipt's recorded `work.units` and `work.agentCalls`. */
  charged: HabitatAmount;
};
export type HabitatRefusal = { manifest: Digest; ceiling: HabitatAmount; reasons: HabitatDimension[] };
export type HabitatBudget = {
  contract: typeof HABITAT_BUDGET_CONTRACT;
  activity: HabitatActivity;
  limits: HabitatLimits;
  /** Admitted runs in admission order; at most `limits.runs`. */
  runs: HabitatRun[];
  charged: HabitatAmount & { runs: number };
  outcome: "complete" | "exhausted";
  /** The terminal refusal; present exactly when `outcome` is `exhausted`. */
  refused: HabitatRefusal | null;
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `habitat budget: ${message}`);
}

function closed(value: unknown, fields: readonly string[], at: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${at} must be an object`);
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!fields.includes(key)) fail(`${at} has unknown field "${key}"`);
  }
  for (const key of fields) {
    if (!Object.hasOwn(record, key)) fail(`${at} is missing "${key}"`);
  }
  return record;
}

function count(value: unknown, min: number, max: number, at: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${at} must be an integer in ${min}..${max}`);
  }
  return value;
}

function reference(value: unknown, at: string): Digest {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) fail(`${at} must be a sha256 digest`);
  return value as Digest;
}

function activity(value: unknown): HabitatActivity {
  if (typeof value !== "string" || !(HABITAT_ACTIVITIES as readonly string[]).includes(value)) {
    fail("activity must be experiment, foundry, or search");
  }
  return value as HabitatActivity;
}

function ceilingOf(value: unknown, at: string): HabitatAmount {
  const v = closed(value, ["work", "attempts"], at);
  return {
    work: count(v.work, 1, BOUNDS.maxWork, `${at}.work`),
    attempts: count(v.attempts, 0, BOUNDS.maxAgentCalls, `${at}.attempts`),
  };
}

/** The reservation a run's root manifest declares. */
export function habitatCeiling(budgets: Pick<Budgets, "maxWork" | "maxAgentCalls">): HabitatAmount {
  return ceilingOf({ work: budgets.maxWork, attempts: budgets.maxAgentCalls }, "ceiling");
}

/** The limits a reservation of `ceiling` would exceed after `charged`, in
 * sorted order; empty when the reservation fits. */
function exceeded(limits: HabitatLimits, charged: HabitatAmount & { runs: number }, ceiling: HabitatAmount): HabitatDimension[] {
  const reasons: HabitatDimension[] = [];
  if (charged.attempts + ceiling.attempts > limits.attempts) reasons.push("attempts");
  if (charged.runs + 1 > limits.runs) reasons.push("runs");
  if (charged.work + ceiling.work > limits.work) reasons.push("work");
  return reasons;
}

/** One closed run entry, `{manifest, receipt, ceiling, charged}`, with the
 * per-run bounds and no account arithmetic; `extra` names additional fields
 * the caller parses itself (a schedule's `activity`). */
export function parseHabitatRun(value: unknown, at: string, extra: readonly string[] = []): HabitatRun {
  const r = closed(value, ["manifest", "receipt", "ceiling", "charged", ...extra], at);
  const ceiling = ceilingOf(r.ceiling, `${at}.ceiling`);
  const c = closed(r.charged, ["work", "attempts"], `${at}.charged`);
  return {
    manifest: reference(r.manifest, `${at}.manifest`),
    receipt: reference(r.receipt, `${at}.receipt`),
    ceiling,
    charged: {
      work: count(c.work, 0, HABITAT_BUDGET_BOUNDS.maxRunWork, `${at}.charged.work`),
      attempts: count(c.attempts, 0, ceiling.attempts, `${at}.charged.attempts`),
    },
  };
}

export function parseHabitatLimits(value: unknown): HabitatLimits {
  const v = closed(value, ["work", "attempts", "runs"], "limits");
  return {
    work: count(v.work, 1, HABITAT_BUDGET_BOUNDS.maxWork, "limits.work"),
    attempts: count(v.attempts, 0, HABITAT_BUDGET_BOUNDS.maxAttempts, "limits.attempts"),
    runs: count(v.runs, 1, HABITAT_BUDGET_BOUNDS.maxRuns, "limits.runs"),
  };
}

/** Parses a closed `algal.habitat-budget.v1` record and recomputes its
 * arithmetic: every run was admitted within the limits at its turn, the
 * totals are the sum of the charges, and a refusal names exactly the limits
 * its ceiling exceeds. Evidence checks against a store are separate. */
export function parseHabitatBudget(value: unknown): HabitatBudget {
  const v = closed(value, ["contract", "activity", "limits", "runs", "charged", "outcome", "refused"], "record");
  if (v.contract !== HABITAT_BUDGET_CONTRACT) fail(`contract must be ${HABITAT_BUDGET_CONTRACT}`);
  const kind = activity(v.activity);
  const limits = parseHabitatLimits(v.limits);
  if (!Array.isArray(v.runs) || v.runs.length > limits.runs) fail("runs must be a list of at most limits.runs entries");
  const totals = { work: 0, attempts: 0, runs: 0 };
  const runs = v.runs.map((raw: unknown, i): HabitatRun => {
    const at = `runs[${i}]`;
    const r = closed(raw, ["manifest", "receipt", "ceiling", "charged"], at);
    const ceiling = ceilingOf(r.ceiling, `${at}.ceiling`);
    const c = closed(r.charged, ["work", "attempts"], `${at}.charged`);
    const charged = {
      work: count(c.work, 0, HABITAT_BUDGET_BOUNDS.maxRunWork, `${at}.charged.work`),
      // The runtime refuses an attempt past maxAgentCalls, so a charge never
      // exceeds its ceiling. Work can: a run stops only after the activation
      // that crossed its own maxWork, and its receipt records that amount.
      attempts: count(c.attempts, 0, ceiling.attempts, `${at}.charged.attempts`),
    };
    if (exceeded(limits, totals, ceiling).length) fail(`${at} was admitted beyond the limits`);
    totals.work += charged.work;
    totals.attempts += charged.attempts;
    totals.runs += 1;
    return { manifest: reference(r.manifest, `${at}.manifest`), receipt: reference(r.receipt, `${at}.receipt`), ceiling, charged };
  });
  const c = closed(v.charged, ["work", "attempts", "runs"], "charged");
  if (c.work !== totals.work || c.attempts !== totals.attempts || c.runs !== totals.runs) fail("charged totals differ from the runs");
  if (v.outcome !== "complete" && v.outcome !== "exhausted") fail("outcome must be complete or exhausted");
  let refused: HabitatRefusal | null = null;
  if (v.outcome === "complete") {
    if (v.refused !== null) fail("a complete account has no refusal");
  } else {
    const r = closed(v.refused, ["manifest", "ceiling", "reasons"], "refused");
    const ceiling = ceilingOf(r.ceiling, "refused.ceiling");
    const reasons = exceeded(limits, totals, ceiling);
    if (reasons.length === 0) fail("refused ceiling fits within the limits");
    if (!Array.isArray(r.reasons) || r.reasons.length !== reasons.length || r.reasons.some((reason, i) => reason !== reasons[i])) {
      fail("refused.reasons must name exactly the exceeded limits");
    }
    refused = { manifest: reference(r.manifest, "refused.manifest"), ceiling, reasons };
  }
  return {
    contract: HABITAT_BUDGET_CONTRACT, activity: kind, limits, runs,
    charged: { work: totals.work, attempts: totals.attempts, runs: totals.runs },
    outcome: v.outcome, refused,
  };
}

/** A run an activity asks its account to start. */
export type HabitatRunRequest = {
  manifest: Digest;
  budgets: Pick<Budgets, "maxWork" | "maxAgentCalls">;
  /** The run's arguments. A resumed schedule checks them against the
   * receipt it serves from its journal. */
  args: Record<string, Record<string, JsonValue>>;
};

export type HabitatRunResult = { receipt: RunReceipt; receiptDigest: Digest };

/** What an activity needs from an account. `HabitatAccount` is the
 * standalone account; a habitat schedule gives each of its activities a view
 * of one shared account (see habitat-schedule.ts). */
export interface HabitatLedger {
  readonly activity: HabitatActivity;
  /** True once a reservation has been refused. */
  readonly exhausted: boolean;
  /** Reserves the run's declared ceiling, starts the run, stores its receipt,
   * and charges what the receipt records. A refused reservation throws
   * `BUDGET_EXHAUSTED`; a run that throws before its receipt is stored
   * releases its reservation and rethrows. */
  admit(request: HabitatRunRequest, execute: () => Promise<RunReceipt>, store: Store): Promise<HabitatRunResult>;
}

/** One habitat activity's account. A host calls `reserve` before each run and
 * `charge` with its receipt after (or `admit`, which does both around the
 * run); `record` closes the account as evidence. */
export class HabitatAccount implements HabitatLedger {
  readonly activity: HabitatActivity;
  readonly limits: HabitatLimits;
  readonly #runs: HabitatRun[] = [];
  readonly #charged = { work: 0, attempts: 0, runs: 0 };
  #refused: HabitatRefusal | null = null;
  #pending: { manifest: Digest; ceiling: HabitatAmount } | null = null;

  constructor(kind: HabitatActivity, limits: HabitatLimits) {
    this.activity = activity(kind);
    this.limits = parseHabitatLimits(limits);
  }

  /** Rebuilds an account from a record it wrote earlier so its activity can
   * continue, for example across separate `application evaluate` commands.
   * The record must be complete, and every listed run must reconcile with
   * the store: its manifest declares the recorded ceiling and its receipt
   * records the charge. Anything else is refused. */
  static async resume(value: unknown, store: Store): Promise<HabitatAccount> {
    const budget = parseHabitatBudget(value);
    if (budget.outcome !== "complete") {
      throw new AlgalError("BUDGET_EXHAUSTED", "habitat budget: an exhausted account cannot continue");
    }
    const { mismatches } = await checkHabitatBudgetEvidence(budget, store);
    if (mismatches.length) {
      throw new AlgalError("PARSE_FAILED", `habitat budget: the account does not reconcile with the store: ${mismatches[0]}`);
    }
    const account = new HabitatAccount(budget.activity, budget.limits);
    account.#runs.push(...budget.runs);
    account.#charged.work = budget.charged.work;
    account.#charged.attempts = budget.charged.attempts;
    account.#charged.runs = budget.charged.runs;
    return account;
  }

  /** True once a reservation has been refused; the account then admits nothing. */
  get exhausted(): boolean {
    return this.#refused !== null;
  }

  async admit(request: HabitatRunRequest, execute: () => Promise<RunReceipt>, store: Store): Promise<HabitatRunResult> {
    this.reserve(request.manifest, request.budgets);
    let receipt: RunReceipt;
    let receiptDigest: Digest;
    try {
      receipt = await execute();
      receiptDigest = await store.putReceipt(receipt as unknown as JsonValue);
    } catch (error) {
      // No stored receipt exists to charge; the reservation is released and
      // the account stays usable for the record.
      this.release();
      throw error;
    }
    this.charge(receiptDigest, receipt);
    return { receipt, receiptDigest };
  }

  /** Reserves a run's declared ceiling before it starts. A refusal is
   * recorded as the terminal outcome and throws `BUDGET_EXHAUSTED`; every
   * later reservation throws too. */
  reserve(manifest: Digest, budgets: Pick<Budgets, "maxWork" | "maxAgentCalls">): void {
    if (this.#pending) throw new AlgalError("INTERNAL", "habitat budget: the previous run was not charged");
    if (this.#refused) {
      throw new AlgalError("BUDGET_EXHAUSTED", `habitat budget exhausted: ${this.#refused.reasons.join(", ")}`);
    }
    const ceiling = habitatCeiling(budgets);
    const run = reference(manifest, "manifest");
    const reasons = exceeded(this.limits, this.#charged, ceiling);
    if (reasons.length) {
      this.#refused = { manifest: run, ceiling, reasons };
      throw new AlgalError("BUDGET_EXHAUSTED", `habitat budget exhausted: ${reasons.join(", ")}`);
    }
    this.#pending = { manifest: run, ceiling };
  }

  /** Charges the reserved run what its receipt records and releases the rest
   * of the reservation. The receipt must be stored under `receipt`. */
  charge(receipt: Digest, recorded: Pick<RunReceipt, "manifestDigest" | "work">): void {
    const pending = this.#pending;
    if (!pending) throw new AlgalError("INTERNAL", "habitat budget: no reservation to charge");
    if (recorded.manifestDigest !== pending.manifest) {
      throw new AlgalError("INTERNAL", "habitat budget: the receipt ran another manifest");
    }
    const charged = {
      work: count(recorded.work.units, 0, HABITAT_BUDGET_BOUNDS.maxRunWork, "charged.work"),
      attempts: count(recorded.work.agentCalls, 0, pending.ceiling.attempts, "charged.attempts"),
    };
    const run = { manifest: pending.manifest, receipt: reference(receipt, "receipt"), ceiling: pending.ceiling, charged };
    this.#pending = null;
    this.#runs.push(run);
    this.#charged.work += charged.work;
    this.#charged.attempts += charged.attempts;
    this.#charged.runs += 1;
  }

  /** Releases an open reservation when the run ended without a receipt,
   * for example when admission failed before anything ran. Nothing is
   * charged and the account stays usable, so the evidence record can still
   * be written; the run is not listed because it recorded nothing. */
  release(): void {
    if (!this.#pending) throw new AlgalError("INTERNAL", "habitat budget: no reservation to release");
    this.#pending = null;
  }

  /** The closed record: `complete` unless a reservation was refused. */
  record(): HabitatBudget {
    if (this.#pending) throw new AlgalError("INTERNAL", "habitat budget: a reservation is still open");
    return parseHabitatBudget({
      contract: HABITAT_BUDGET_CONTRACT,
      activity: this.activity,
      limits: { ...this.limits },
      runs: this.#runs.map(run => ({ ...run, ceiling: { ...run.ceiling }, charged: { ...run.charged } })),
      charged: { ...this.#charged },
      outcome: this.#refused ? "exhausted" : "complete",
      refused: this.#refused ? { ...this.#refused, ceiling: { ...this.#refused.ceiling }, reasons: [...this.#refused.reasons] } : null,
    });
  }
}

/** A finished activity's evidence must name exactly the runs it admitted, in
 * admission order, under a complete account of the same activity. */
export function habitatBindingMismatches(
  budget: HabitatBudget,
  kind: HabitatActivity,
  expected: readonly { manifest: Digest; receipt: Digest }[],
): string[] {
  const mismatches: string[] = [];
  if (budget.activity !== kind) mismatches.push(`budget activity is not ${kind}`);
  if (budget.outcome !== "complete") mismatches.push("budget outcome is not complete");
  if (budget.runs.length !== expected.length) {
    mismatches.push(`budget charges ${budget.runs.length} runs, the ${kind} records ${expected.length}`);
  }
  budget.runs.forEach((run, i) => {
    const want = expected[i];
    if (want && (run.manifest !== want.manifest || run.receipt !== want.receipt)) {
      mismatches.push(`budget run ${i} is not the ${kind}'s run ${i}`);
    }
  });
  return mismatches;
}

/** Checks the record against a store: each ceiling is its manifest's declared
 * budget, and each charge is the work its receipt records. With `replay`,
 * every receipt is also replayed offline. */
export async function checkHabitatBudgetEvidence(
  budget: HabitatBudget,
  store: Store,
  replay?: { fns: FnRegistry; tools?: ToolRegistry },
): Promise<{ mismatches: string[]; checkedReceipts: number }> {
  return checkHabitatRunsEvidence(budget.runs, budget.refused, store, { label: "budget", ...(replay ? { replay } : {}) });
}

/** The shared evidence check for listed runs, labelled `<label> run <i>`:
 * each ceiling is its manifest's declared budget and each charge is the work
 * its receipt records. With `replay`, a run's receipt is also replayed
 * offline, for every run or for those `replayRun` selects. */
export async function checkHabitatRunsEvidence(
  runs: readonly HabitatRun[],
  refused: { manifest: Digest; ceiling: HabitatAmount } | null,
  store: Store,
  options: { label: string; replay?: { fns: FnRegistry; tools?: ToolRegistry }; replayRun?: (index: number) => boolean },
): Promise<{ mismatches: string[]; checkedReceipts: number }> {
  const mismatches: string[] = [];
  let checkedReceipts = 0;
  const declared = async (manifest: Digest, ceiling: HabitatAmount, at: string) => {
    const stored = await store.getManifest(manifest);
    if (!stored) {
      mismatches.push(`${at}: manifest ${manifest} missing`);
      return undefined;
    }
    if (stored.budgets.maxWork !== ceiling.work || stored.budgets.maxAgentCalls !== ceiling.attempts) {
      mismatches.push(`${at}: ceiling differs from its manifest`);
    }
    return stored;
  };
  for (const [i, run] of runs.entries()) {
    const at = `${options.label} run ${i}`;
    const manifest = await declared(run.manifest, run.ceiling, at);
    if (!manifest) continue;
    const stored = await store.getReceipt(run.receipt);
    if (!stored) {
      mismatches.push(`${at}: receipt ${run.receipt} missing`);
      continue;
    }
    const receipt = parseRunReceipt(stored);
    if (receipt.manifestDigest !== run.manifest) {
      mismatches.push(`${at}: receipt ran another manifest`);
      continue;
    }
    if (receipt.work.units !== run.charged.work || receipt.work.agentCalls !== run.charged.attempts) {
      mismatches.push(`${at}: charge differs from its receipt`);
    }
    if (options.replay && (options.replayRun?.(i) ?? true)) {
      const verified = await verifyReceipt(stored, manifestToJson(manifest), store, options.replay.fns, undefined, options.replay.tools);
      checkedReceipts++;
      if (!verified.ok) mismatches.push(`${at}: receipt ${run.receipt}: ${verified.mismatches.join("; ")}`);
    }
  }
  if (refused) await declared(refused.manifest, refused.ceiling, `${options.label} refusal`);
  return { mismatches, checkedReceipts };
}

export type HabitatBudgetVerifyReport = {
  ok: boolean;
  digest: Digest;
  outcome: HabitatBudget["outcome"];
  checkedReceipts: number;
  mismatches: string[];
};

/** Verifies a standalone record, such as the terminal record an exhausted
 * activity leaves: its arithmetic, every ceiling and charge, and an offline
 * replay of every admitted run. With `expected`, a record of another
 * activity is a mismatch (`foundry search-verify` expects `search`). */
export async function verifyHabitatBudget(
  value: unknown,
  store: Store,
  fns: FnRegistry,
  tools?: ToolRegistry,
  expected?: HabitatActivity,
): Promise<HabitatBudgetVerifyReport> {
  const budget = parseHabitatBudget(value);
  const { mismatches, checkedReceipts } = await checkHabitatBudgetEvidence(budget, store, { fns, ...(tools ? { tools } : {}) });
  if (expected !== undefined && budget.activity !== expected) mismatches.unshift(`budget activity is not ${expected}`);
  return {
    ok: mismatches.length === 0,
    digest: digestCanonical(budget as unknown as JsonValue),
    outcome: budget.outcome,
    checkedReceipts,
    mismatches,
  };
}
