/** Habitat schedules: several habitat activities (foundry runs and searches)
 * draw on one habitat work account, and a deterministic scheduler decides
 * which activity starts the next run.
 *
 * Activities run as interleaved coroutines. Each asks its view of the shared
 * account to admit one run at a time; the scheduler grants a request only
 * once every unfinished activity is waiting for one, then picks the next
 * activity after the last granted one in activity order (`round-robin`). At
 * most one activity computes at a time, so the order is a function of the
 * activities' own deterministic runs, and verification recomputes it from
 * the record. Each grant reserves the run's declared ceiling on the shared
 * account and charges what its receipt records, exactly as
 * `algal.habitat-budget.v1` does. The first refused reservation ends every
 * unfinished activity with the outcome `exhausted`; finished activities keep
 * their reports.
 *
 * The closed `algal.habitat-schedule.v1` record lists every charged run with
 * the activity it served, the shared account's totals and refusal, and each
 * activity's outcome and stored report digest. Reports produced inside a
 * schedule never embed an account of their own.
 *
 * A journal makes a schedule resumable. After each charged run the host
 * writes one immutable entry; a later invocation replays the activities from
 * the start and serves each journaled run from its stored receipt instead of
 * starting it again, provided the entry reconciles: same activity, manifest,
 * ceiling, arguments, and charge. Anything else is refused. Once the journal
 * is consumed, new runs start and are journaled in turn. Replaying a complete
 * journal writes the same record bytes without starting any run. No record
 * or journal entry carries a wall-clock value. */
import { join } from "node:path";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { foundryReportRuns, type FoundryReport } from "./foundry";
import { verifyFoundryReport } from "./foundry-verify";
import {
  checkHabitatRunsEvidence, habitatCeiling, HABITAT_BUDGET_CONTRACT, HabitatAccount, parseHabitatBudget,
  parseHabitatLimits, parseHabitatRun, type HabitatAmount, type HabitatLedger, type HabitatLimits,
  type HabitatRefusal, type HabitatRun, type HabitatRunRequest, type HabitatRunResult,
} from "./habitat-budget";
import { hostNames, hostRead, hostWrite } from "./host-state";
import type { FnRegistry } from "./registry";
import { parseRunReceipt, type RunReceipt } from "./run";
import { searchReportRuns, type SearchReport } from "./search";
import { verifySearchReport } from "./search-verify";
import type { Store } from "./store-contract";
import type { ToolRegistry } from "./tools";
import { asInt, asObject, asString, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const HABITAT_SCHEDULE_CONTRACT = "algal.habitat-schedule.v1" as const;
export const HABITAT_SCHEDULE_CONFIG_CONTRACT = "algal.habitat-schedule.config.v1" as const;
export const HABITAT_JOURNAL_CONTRACT = "algal.habitat-journal.v1" as const;

export const HABITAT_SCHEDULE_BOUNDS = Object.freeze({
  /** Activities in one schedule. */
  maxActivities: 8,
  /** Characters in one activity config path. */
  maxConfigPath: 512,
  /** Bytes of one journal file: the header or one run entry. */
  maxJournalEntryBytes: 4_096,
});

export const HABITAT_SCHEDULE_ORDERS = ["round-robin"] as const;
export type HabitatScheduleOrder = (typeof HABITAT_SCHEDULE_ORDERS)[number];
export const HABITAT_SCHEDULE_KINDS = ["foundry", "search"] as const;
export type HabitatScheduleKind = (typeof HABITAT_SCHEDULE_KINDS)[number];

export type HabitatScheduleRun = HabitatRun & { activity: number };
export type HabitatScheduleActivity = {
  kind: HabitatScheduleKind;
  outcome: "complete" | "exhausted";
  /** The stored report's digest; null for an exhausted activity. */
  report: Digest | null;
};
export type HabitatSchedule = {
  contract: typeof HABITAT_SCHEDULE_CONTRACT;
  order: HabitatScheduleOrder;
  limits: HabitatLimits;
  activities: HabitatScheduleActivity[];
  /** Charged runs in charge order, each naming the activity it served. */
  runs: HabitatScheduleRun[];
  charged: HabitatAmount & { runs: number };
  outcome: "complete" | "exhausted";
  /** The first refused reservation and the activity that asked for it. */
  refused: (HabitatRefusal & { activity: number }) | null;
};

export type HabitatScheduleConfig = {
  order: HabitatScheduleOrder;
  budget: HabitatLimits;
  /** Each activity's `algal.foundry.config.v1` path, relative to the schedule. */
  activities: { kind: HabitatScheduleKind; config: string }[];
};

function fail(message: string): never {
  throw new AlgalError("PARSE_FAILED", `habitat schedule: ${message}`);
}

function mismatch(message: string): never {
  throw new AlgalError("RECEIPT_MISMATCH", `habitat journal: ${message}`);
}

function closed(value: unknown, fields: readonly string[], at: string) {
  const record = asObject(value, `habitat schedule ${at}`);
  noUnknownKeys(record, fields, `habitat schedule ${at}`);
  for (const key of fields) if (!Object.hasOwn(record, key)) fail(`${at} is missing "${key}"`);
  return record;
}

function order(value: unknown): HabitatScheduleOrder {
  if (!(HABITAT_SCHEDULE_ORDERS as readonly unknown[]).includes(value)) fail("order must be round-robin");
  return value as HabitatScheduleOrder;
}

function kind(value: unknown, at: string): HabitatScheduleKind {
  if (!(HABITAT_SCHEDULE_KINDS as readonly unknown[]).includes(value)) fail(`${at}.kind must be foundry or search`);
  return value as HabitatScheduleKind;
}

function activityList(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > HABITAT_SCHEDULE_BOUNDS.maxActivities) {
    fail(`${at} must list 1 to ${HABITAT_SCHEDULE_BOUNDS.maxActivities} activities`);
  }
  return value;
}

/** Parses a closed `algal.habitat-schedule.config.v1`. */
export function parseHabitatScheduleConfig(value: unknown): HabitatScheduleConfig {
  const v = closed(value, ["contract", "order", "budget", "activities"], "config");
  if (v.contract !== HABITAT_SCHEDULE_CONFIG_CONTRACT) fail(`config.contract must be ${HABITAT_SCHEDULE_CONFIG_CONTRACT}`);
  return {
    order: order(v.order),
    budget: parseHabitatLimits(v.budget),
    activities: activityList(v.activities, "config.activities").map((raw, i) => {
      const at = `config.activities[${i}]`;
      const a = closed(raw, ["kind", "config"], at);
      const config = asString(a.config, `habitat schedule ${at}.config`, HABITAT_SCHEDULE_BOUNDS.maxConfigPath);
      if (config.length === 0) fail(`${at}.config must be a path`);
      return { kind: kind(a.kind, at), config };
    }),
  };
}

/** The activity the round-robin order grants next: the first waiting
 * activity after `last` in activity order, wrapping around. */
function nextTurn(last: number, waiting: (activity: number) => boolean, activities: number): number | null {
  for (let step = 1; step <= activities; step++) {
    const activity = (last + step + activities) % activities;
    if (waiting(activity)) return activity;
  }
  return null;
}

/** Parses a closed `algal.habitat-schedule.v1` record. It recomputes the
 * shared account's arithmetic, requires each activity's outcome to agree
 * with the refusal, and recomputes the round-robin order from the number of
 * runs each activity was charged: every unfinished activity waits for a
 * grant, a finished activity waits for nothing, and the refused activity is
 * the one whose turn came next. */
export function parseHabitatSchedule(value: unknown): HabitatSchedule {
  const v = closed(value, ["contract", "order", "limits", "activities", "runs", "charged", "outcome", "refused"], "record");
  if (v.contract !== HABITAT_SCHEDULE_CONTRACT) fail(`contract must be ${HABITAT_SCHEDULE_CONTRACT}`);
  const scheduleOrder = order(v.order);
  const activities = activityList(v.activities, "activities").map((raw, i): HabitatScheduleActivity => {
    const at = `activities[${i}]`;
    const a = closed(raw, ["kind", "outcome", "report"], at);
    if (a.outcome !== "complete" && a.outcome !== "exhausted") fail(`${at}.outcome must be complete or exhausted`);
    if (a.outcome === "complete") {
      return { kind: kind(a.kind, at), outcome: "complete", report: asDigest(a.report, `habitat schedule ${at}.report`) };
    }
    if (a.report !== null) fail(`${at}: an exhausted activity has no report`);
    return { kind: kind(a.kind, at), outcome: "exhausted", report: null };
  });
  const index = (raw: unknown, at: string) => asInt(raw, `habitat schedule ${at}`, 0, activities.length - 1);
  const limits = parseHabitatLimits(v.limits);
  if (!Array.isArray(v.runs) || v.runs.length > limits.runs) fail("runs must be a list of at most limits.runs entries");
  const turns = v.runs.map((raw, i) => index(asObject(raw, `habitat schedule runs[${i}]`).activity, `runs[${i}].activity`));
  const runs = v.runs.map((raw, i) => parseHabitatRun(raw, `runs[${i}]`, ["activity"]));
  let refusedActivity: number | null = null;
  let refused: unknown = v.refused;
  if (v.refused !== null) {
    const r = asObject(v.refused, "habitat schedule refused");
    refusedActivity = index(r.activity, "refused.activity");
    const { activity: _activity, ...rest } = r;
    refused = rest;
  }
  // The account arithmetic is the habitat budget's: each run fit when it
  // was admitted, the totals are the charges' sums, and a refusal names
  // exactly the limits it exceeds.
  const account = parseHabitatBudget({
    contract: HABITAT_BUDGET_CONTRACT, activity: "foundry", limits: v.limits,
    runs: runs as unknown as JsonValue, charged: v.charged, outcome: v.outcome, refused: refused as JsonValue,
  });
  const exhausted = activities.some(activity => activity.outcome === "exhausted");
  if ((account.outcome === "exhausted") !== exhausted) fail("the outcome must be exhausted exactly when an activity is");
  if (refusedActivity !== null && activities[refusedActivity]!.outcome !== "exhausted") fail("the refused activity must be exhausted");
  const remaining = activities.map((_, i) => turns.filter(turn => turn === i).length);
  const waiting = (i: number) => remaining[i]! > 0 || activities[i]!.outcome === "exhausted";
  let last = -1;
  for (const [i, turn] of turns.entries()) {
    const expected = nextTurn(last, waiting, activities.length);
    if (expected !== turn || remaining[turn]! === 0) fail(`runs[${i}] is not the round-robin turn`);
    remaining[turn]!--;
    last = turn;
  }
  if (refusedActivity !== null && nextTurn(last, waiting, activities.length) !== refusedActivity) {
    fail("the refused activity is not the round-robin turn");
  }
  return {
    contract: HABITAT_SCHEDULE_CONTRACT, order: scheduleOrder, limits: account.limits, activities,
    runs: account.runs.map((run, i) => ({ activity: turns[i]!, ...run })),
    charged: account.charged, outcome: account.outcome,
    refused: account.refused ? { activity: refusedActivity!, ...account.refused } : null,
  };
}

/** A durable, append-only journal of one schedule's charged runs. */
export type HabitatJournal = {
  /** Runs journaled so far, in charge order. */
  readonly runs: readonly HabitatScheduleRun[];
  /** Durably records the next charged run. */
  append(run: HabitatScheduleRun): Promise<void>;
};

const ordinal = (n: number): string => `${String(n).padStart(6, "0")}.json`;

function journalRun(value: unknown, at: string): HabitatScheduleRun {
  const activity = asInt(asObject(value, `habitat journal ${at}`).activity, `habitat journal ${at}.activity`, 0, HABITAT_SCHEDULE_BOUNDS.maxActivities - 1);
  return { activity, ...parseHabitatRun(value, at, ["activity"]) };
}

/** Opens (or creates) a journal directory: `journal.json` binds it to one
 * order and one set of limits, and `runs/<ordinal>.json` holds one immutable
 * entry per charged run, with no gaps. A journal written under another order
 * or other limits is refused. */
export async function openHabitatJournal(dir: string, scheduleOrder: HabitatScheduleOrder, limits: HabitatLimits): Promise<HabitatJournal> {
  const header = { contract: HABITAT_JOURNAL_CONTRACT, order: order(scheduleOrder), limits: parseHabitatLimits(limits) };
  const headerPath = join(dir, "journal.json");
  const existing = await hostRead(headerPath, HABITAT_SCHEDULE_BOUNDS.maxJournalEntryBytes);
  if (existing === undefined) await hostWrite(headerPath, header, HABITAT_SCHEDULE_BOUNDS.maxJournalEntryBytes);
  else if (canonicalize(existing) !== canonicalize(header)) mismatch("the journal belongs to another order or other limits");
  const runsDir = join(dir, "runs");
  const names = await hostNames(runsDir, header.limits.runs, /^\d{6}\.json$/);
  const runs: HabitatScheduleRun[] = [];
  for (const [i, name] of names.entries()) {
    if (name !== ordinal(i)) mismatch(`entry ${i} is missing`);
    runs.push(journalRun(await hostRead(join(runsDir, name), HABITAT_SCHEDULE_BOUNDS.maxJournalEntryBytes), `run ${i}`));
  }
  return {
    runs,
    async append(run) {
      const entry = journalRun(run, `run ${runs.length}`);
      await hostWrite(join(runsDir, ordinal(runs.length)), entry as unknown as JsonValue, HABITAT_SCHEDULE_BOUNDS.maxJournalEntryBytes);
      runs.push(entry);
    },
  };
}

export type HabitatScheduleActivitySpec = {
  kind: HabitatScheduleKind;
  /** Runs the activity through its view of the shared account and returns
   * its report: `runFoundryWithin` (after any generator) for a foundry and
   * `runFoundrySearch` for a search. */
  run(ledger: HabitatLedger): Promise<FoundryReport | SearchReport>;
};

export type HabitatScheduleOptions = {
  order: HabitatScheduleOrder;
  limits: HabitatLimits;
  activities: HabitatScheduleActivitySpec[];
  store: Store;
  /** Resumes from and extends this journal. */
  journal?: HabitatJournal;
};

export type HabitatScheduleResult = {
  schedule: HabitatSchedule;
  /** Each activity's report, or null for an exhausted activity. */
  reports: (FoundryReport | SearchReport | null)[];
};

type Pending = {
  request: HabitatRunRequest;
  execute: () => Promise<RunReceipt>;
  store: Store;
  resolve: (result: HabitatRunResult) => void;
  reject: (error: unknown) => void;
};

const exhaustion = (error: unknown) => error instanceof AlgalError && error.code === "BUDGET_EXHAUSTED";

/** The runs a complete activity's report records, in admission order. */
function reportRuns(kind: HabitatScheduleKind, report: FoundryReport | SearchReport): { manifest: Digest; receipt: Digest }[] {
  return kind === "search" ? searchReportRuns(report as SearchReport) : foundryReportRuns(report as FoundryReport);
}

/** A complete activity's report must record exactly the runs the schedule
 * charged to that activity, in order, and carry no account of its own. */
function bindingMismatches(schedule: HabitatSchedule, activity: number, report: FoundryReport | SearchReport): string[] {
  const at = `activity ${activity}`;
  const kindOf = schedule.activities[activity]!.kind;
  const charged = schedule.runs.filter(run => run.activity === activity);
  const recorded = reportRuns(kindOf, report);
  const mismatches: string[] = [];
  if (report.budget !== undefined) mismatches.push(`${at}: the report carries its own budget`);
  if (charged.length !== recorded.length) mismatches.push(`${at}: the schedule charges ${charged.length} runs, the report records ${recorded.length}`);
  charged.forEach((run, i) => {
    const want = recorded[i];
    if (want && (run.manifest !== want.manifest || run.receipt !== want.receipt)) mismatches.push(`${at}: charged run ${i} is not the report's run ${i}`);
  });
  return mismatches;
}

/** Runs every activity against one shared account in round-robin order,
 * stores each complete activity's report, and returns the closed record.
 * With a journal, journaled runs are served from their stored receipts
 * first; an entry that does not reconcile stops the schedule with
 * `RECEIPT_MISMATCH`. An activity that fails for any reason other than a
 * refused reservation stops the schedule and rethrows that error; the
 * journal keeps every run charged so far. */
export async function runHabitatSchedule(opts: HabitatScheduleOptions): Promise<HabitatScheduleResult> {
  const scheduleOrder = order(opts.order);
  const limits = parseHabitatLimits(opts.limits);
  const count = activityList(opts.activities, "activities").length;
  const kinds = opts.activities.map((activity, i) => kind(activity.kind, `activities[${i}]`));
  const journaled = [...(opts.journal?.runs ?? [])];
  if (journaled.length > limits.runs) mismatch("the journal holds more runs than the limits allow");
  for (const [i, run] of journaled.entries()) if (run.activity >= count) mismatch(`run ${i} names activity ${run.activity}`);
  // The shared account's arithmetic; its activity label never leaves here.
  const account = new HabitatAccount("foundry", limits);
  const turns: number[] = [];
  let refusedActivity: number | null = null;
  const refusedHere = new Array<boolean>(count).fill(false);
  const pending = new Array<Pending | null>(count).fill(null);
  const running = new Array<boolean>(count).fill(true);
  const done = new Array<boolean>(count).fill(false);
  const reports = new Array<FoundryReport | SearchReport | null>(count).fill(null);
  let failure: { error: unknown } | null = null;
  let granting = false;
  let last = -1;
  let settle!: () => void;
  const finished = new Promise<void>(resolve => { settle = resolve; });

  const serve = async (activity: number, request: HabitatRunRequest, store: Store): Promise<HabitatRunResult> => {
    const position = turns.length;
    const entry = journaled[position]!;
    const at = `run ${position}`;
    if (entry.activity !== activity) mismatch(`${at} served activity ${entry.activity}, the schedule granted activity ${activity}`);
    if (entry.manifest !== request.manifest) mismatch(`${at} ran another manifest`);
    const ceiling = habitatCeiling(request.budgets);
    if (entry.ceiling.work !== ceiling.work || entry.ceiling.attempts !== ceiling.attempts) mismatch(`${at}: ceiling differs from its manifest`);
    const stored = await store.getReceipt(entry.receipt);
    if (!stored) mismatch(`${at}: receipt ${entry.receipt} missing`);
    const receipt = parseRunReceipt(stored);
    if (receipt.manifestDigest !== request.manifest) mismatch(`${at}: receipt ran another manifest`);
    if (canonicalize(receipt.args as unknown as JsonValue) !== canonicalize(request.args as unknown as JsonValue)) {
      mismatch(`${at}: receipt arguments differ from the run's`);
    }
    if (receipt.work.units !== entry.charged.work || receipt.work.agentCalls !== entry.charged.attempts) mismatch(`${at}: charge differs from its receipt`);
    return { receipt, receiptDigest: entry.receipt };
  };

  const admit = async (activity: number, p: Pending): Promise<HabitatRunResult> => {
    try {
      account.reserve(p.request.manifest, p.request.budgets);
    } catch (error) {
      if (refusedActivity === null && account.exhausted) refusedActivity = activity;
      throw error;
    }
    let result: HabitatRunResult;
    const live = turns.length >= journaled.length;
    try {
      if (live) {
        const receipt = await p.execute();
        result = { receipt, receiptDigest: await p.store.putReceipt(receipt as unknown as JsonValue) };
      } else {
        result = await serve(activity, p.request, p.store);
      }
    } catch (error) {
      // No receipt to charge: release the reservation, keep the account.
      account.release();
      throw error;
    }
    account.charge(result.receiptDigest, result.receipt);
    turns.push(activity);
    if (live && opts.journal) {
      // The entry the account just recorded for this run.
      await opts.journal.append({
        activity, manifest: p.request.manifest, receipt: result.receiptDigest, ceiling: habitatCeiling(p.request.budgets),
        charged: { work: result.receipt.work.units, attempts: result.receipt.work.agentCalls },
      });
    }
    return result;
  };

  const pump = (): void => {
    if (granting || running.some(Boolean)) return;
    if (done.every(Boolean)) {
      settle();
      return;
    }
    const activity = nextTurn(last, i => pending[i] !== null, count);
    if (activity === null) return;
    const p = pending[activity]!;
    pending[activity] = null;
    running[activity] = true;
    granting = true;
    last = activity;
    const granted = failure
      ? Promise.reject(new AlgalError("INTERNAL", "habitat schedule stopped after another activity failed"))
      : admit(activity, p);
    granted.then(
      result => { granting = false; p.resolve(result); },
      (error: unknown) => {
        granting = false;
        if (exhaustion(error) && account.exhausted) refusedHere[activity] = true;
        p.reject(error);
      },
    ).finally(pump);
  };

  const view = (activity: number): HabitatLedger => ({
    activity: kinds[activity]!,
    get exhausted() { return account.exhausted; },
    admit: (request, execute, store) => new Promise<HabitatRunResult>((resolve, reject) => {
      pending[activity] = { request, execute, store, resolve, reject };
      running[activity] = false;
      pump();
    }),
  });

  opts.activities.forEach((spec, activity) => {
    void spec.run(view(activity)).then(
      report => { reports[activity] = report; },
      (error: unknown) => {
        if (!refusedHere[activity] && failure === null) failure = { error };
      },
    ).finally(() => {
      done[activity] = true;
      running[activity] = false;
      pump();
    });
  });
  await finished;
  if (failure) throw (failure as { error: unknown }).error;
  if (turns.length < journaled.length) mismatch("the journal holds runs the schedule did not request");
  const budget = account.record();
  const activities: HabitatScheduleActivity[] = [];
  for (const [activity, report] of reports.entries()) {
    if (refusedHere[activity] || report === null) {
      reports[activity] = null;
      activities.push({ kind: kinds[activity]!, outcome: "exhausted", report: null });
    } else {
      activities.push({ kind: kinds[activity]!, outcome: "complete", report: await opts.store.putValue(report as unknown as JsonValue) });
    }
  }
  const schedule = parseHabitatSchedule({
    contract: HABITAT_SCHEDULE_CONTRACT, order: scheduleOrder, limits: budget.limits, activities,
    runs: budget.runs.map((run, i) => ({ activity: turns[i]!, ...run })),
    charged: budget.charged, outcome: budget.outcome,
    refused: budget.refused ? { activity: refusedActivity!, ...budget.refused } : null,
  } as unknown as JsonValue);
  // Every complete report must record exactly its charged runs; anything
  // else is a host wiring error, and the record would not verify.
  const wiring = reports.flatMap((report, activity) => report ? bindingMismatches(schedule, activity, report) : []);
  if (wiring.length) throw new AlgalError("INTERNAL", `habitat schedule: ${wiring.join("; ")}`);
  return { schedule, reports };
}

export type HabitatScheduleVerifyReport = {
  ok: boolean;
  digest: Digest;
  outcome: HabitatSchedule["outcome"];
  checkedReceipts: number;
  mismatches: string[];
};

/** Verifies a schedule record against a store: the record's arithmetic and
 * round-robin order, each complete activity's report (verified as a foundry
 * or search report, replaying its runs) and its binding to the runs charged
 * to that activity, every ceiling and charge, and an offline replay of the
 * runs of exhausted activities. */
export async function verifyHabitatSchedule(
  value: unknown,
  store: Store,
  fns: FnRegistry,
  tools?: ToolRegistry,
): Promise<HabitatScheduleVerifyReport> {
  const schedule = parseHabitatSchedule(value);
  const mismatches: string[] = [];
  let checkedReceipts = 0;
  for (const [activity, entry] of schedule.activities.entries()) {
    if (entry.report === null) continue;
    const at = `activity ${activity}`;
    const report = await store.getValue(entry.report);
    if (report === undefined) {
      mismatches.push(`${at}: report ${entry.report} missing`);
      continue;
    }
    const contract = entry.kind === "search" ? "algal.search.v1" : "algal.foundry.v1";
    if (report === null || typeof report !== "object" || Array.isArray(report) || report.contract !== contract) {
      mismatches.push(`${at}: report is not an ${contract} report`);
      continue;
    }
    try {
      const verified = entry.kind === "search"
        ? await verifySearchReport(report, store, fns, tools)
        : await verifyFoundryReport(report, store, fns, tools);
      checkedReceipts += verified.checkedReceipts;
      mismatches.push(...verified.mismatches.map(problem => `${at}: ${problem}`));
      mismatches.push(...bindingMismatches(schedule, activity, report as unknown as FoundryReport | SearchReport));
    } catch (error) {
      mismatches.push(`${at}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const exhausted = (i: number) => schedule.activities[schedule.runs[i]!.activity]!.outcome === "exhausted";
  const evidence = await checkHabitatRunsEvidence(schedule.runs, schedule.refused, store, {
    label: "schedule", replay: { fns, ...(tools ? { tools } : {}) }, replayRun: exhausted,
  });
  mismatches.push(...evidence.mismatches);
  checkedReceipts += evidence.checkedReceipts;
  return {
    ok: mismatches.length === 0,
    digest: digestCanonical(schedule as unknown as JsonValue),
    outcome: schedule.outcome,
    checkedReceipts,
    mismatches,
  };
}
