import { createHash } from "node:crypto";
import { asJsonValue, canonicalize } from "../../src/values";

/** Search may change only these data fields; host authority and budgets are fixed. */
export interface HarnessPolicy {
  version: 1;
  context: { mode: "full" } | { mode: "recent-with-first"; maxMessages: number };
  testPolicy: "focused-first" | "test-after-edit";
  recoveryPolicy: "diagnose-once" | "retry-with-context";
}

export interface HarnessMessage {
  role: "user" | "assistant" | "tool";
  content: string;
}

export const BASELINE_POLICY: HarnessPolicy = {
  version: 1,
  context: { mode: "full" },
  testPolicy: "focused-first",
  recoveryPolicy: "diagnose-once",
};

export const DEFAULT_CANDIDATE_POLICIES: HarnessPolicy[] = [
  BASELINE_POLICY,
  { ...BASELINE_POLICY, context: { mode: "recent-with-first", maxMessages: 12 } },
  { ...BASELINE_POLICY, testPolicy: "test-after-edit", recoveryPolicy: "retry-with-context" },
];

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !keys.includes(key))) {
    throw new Error(`${label} has unknown keys`);
  }
  if (keys.some((key) => !Object.hasOwn(result, key))) {
    throw new Error(`${label} is missing required keys`);
  }
  return result;
}

function integer(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256 || value.trim() !== value ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    throw new Error(`${label} must be a nonempty trimmed string of at most 256 characters`);
  }
  return value;
}

function identity(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a sha256 identity`);
  }
  return value;
}

function hash(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalize(asJsonValue(value, "identity input"))).digest("hex")}`;
}

function list(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} must be an array of at most ${max} entries`);
  return value;
}

export function parseHarnessPolicy(value: unknown): HarnessPolicy {
  const obj = object(value, ["version", "context", "testPolicy", "recoveryPolicy"], "policy");
  if (obj.version !== 1) throw new Error("policy.version must be 1");
  const contextValue = obj.context;
  if (contextValue === null || typeof contextValue !== "object" || Array.isArray(contextValue)) {
    throw new Error("policy.context must be an object");
  }
  const mode = (contextValue as Record<string, unknown>).mode;
  let context: HarnessPolicy["context"];
  if (mode === "full") {
    object(contextValue, ["mode"], "policy.context");
    context = { mode };
  } else if (mode === "recent-with-first") {
    const c = object(contextValue, ["mode", "maxMessages"], "policy.context");
    context = { mode, maxMessages: integer(c.maxMessages, 3, 128, "policy.context.maxMessages (instruction plus a complete assistant/tool pair)") };
  } else throw new Error("policy.context.mode is not admitted");
  if (obj.testPolicy !== "focused-first" && obj.testPolicy !== "test-after-edit") {
    throw new Error("policy.testPolicy is not admitted");
  }
  if (obj.recoveryPolicy !== "diagnose-once" && obj.recoveryPolicy !== "retry-with-context") {
    throw new Error("policy.recoveryPolicy is not admitted");
  }
  return { version: 1, context, testPolicy: obj.testPolicy, recoveryPolicy: obj.recoveryPolicy };
}

export function policyId(policy: HarnessPolicy): string {
  return hash(parseHarnessPolicy(policy));
}

export function selectContext<T extends HarnessMessage>(messages: readonly T[], policy: HarnessPolicy): T[] {
  const admitted = parseHarnessPolicy(policy);
  if (messages.length > 128) throw new Error("context exceeds 128 messages");
  if (admitted.context.mode === "full" || messages.length === 0) return [...messages];
  if (messages[0]!.role !== "user" || messages.length % 2 !== 1) {
    throw new Error("recent context requires an instruction followed by complete assistant/tool pairs");
  }
  for (let index = 1; index < messages.length; index += 2) {
    if (messages[index]!.role !== "assistant" || messages[index + 1]!.role !== "tool") {
      throw new Error("recent context requires complete assistant/tool pairs");
    }
  }
  if (messages.length <= admitted.context.maxMessages) return [...messages];
  // An unused slot is preferable to a result whose action has been discarded.
  const retainedMessages = 2 * Math.floor((admitted.context.maxMessages - 1) / 2);
  return [messages[0]!, ...messages.slice(-retainedMessages)];
}

export interface ExperimentSplit {
  benchmark: string;
  revision: string;
  devTaskIds: string[];
  holdoutTaskIds: string[];
}

export function parseExperimentSplit(value: unknown): ExperimentSplit {
  const obj = object(value, ["benchmark", "revision", "devTaskIds", "holdoutTaskIds"], "split");
  const ids = (v: unknown, label: string): string[] => {
    const values = list(v, 256, label).map((id) => text(id, label));
    if (values.length === 0 || new Set(values).size !== values.length) throw new Error(`${label} must be nonempty and unique`);
    return values.sort();
  };
  const devTaskIds = ids(obj.devTaskIds, "development tasks");
  const holdoutTaskIds = ids(obj.holdoutTaskIds, "holdout tasks");
  if (holdoutTaskIds.some((id) => devTaskIds.includes(id))) throw new Error("development and holdout tasks overlap");
  return { benchmark: text(obj.benchmark, "benchmark"), revision: text(obj.revision, "revision"), devTaskIds, holdoutTaskIds };
}

export interface CandidateProposal {
  policy: HarnessPolicy;
  parentPolicyId: string;
  evidenceTaskIds: string[];
}

export function parseCandidateProposal(value: unknown, split: ExperimentSplit): CandidateProposal {
  const admitted = parseExperimentSplit(split);
  const obj = object(value, ["policy", "parentPolicyId", "evidenceTaskIds"], "proposal");
  const evidenceTaskIds = list(obj.evidenceTaskIds, 256, "proposal evidence").map((id) => text(id, "evidence task"));
  if (new Set(evidenceTaskIds).size !== evidenceTaskIds.length) throw new Error("proposal evidence contains duplicate tasks");
  if (evidenceTaskIds.some((id) => !admitted.devTaskIds.includes(id))) throw new Error("proposal evidence must use development tasks only");
  return { policy: parseHarnessPolicy(obj.policy), parentPolicyId: identity(obj.parentPolicyId, "parent policy"), evidenceTaskIds: evidenceTaskIds.sort() };
}

/** null means unreported/unknown, never zero. Wall time belongs in experiment reports, not ALGAL receipts. */
export interface UsageRecord {
  durationMs: number;
  paidCostUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface TrialOutcome extends UsageRecord {
  taskId: string;
  repeat: number;
  policyId: string;
  status: "success" | "failure" | "invalid" | "uncertain";
}

const USAGE_KEYS = ["durationMs", "paidCostUsd", "inputTokens", "outputTokens"] as const;
const OUTCOME_KEYS = ["taskId", "repeat", "policyId", "status", ...USAGE_KEYS] as const;

function usageFields(obj: Record<string, unknown>): UsageRecord {
  const tokens = (v: unknown, label: string): number | null => v === null ? null : integer(v, 0, 1_000_000_000, label);
  const cost = obj.paidCostUsd;
  if (cost !== null && (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > 1_000_000)) {
    throw new Error("paidCostUsd must be null or a finite nonnegative amount at most 1000000");
  }
  return {
    durationMs: integer(obj.durationMs, 0, 604_800_000, "durationMs"),
    paidCostUsd: cost as number | null,
    inputTokens: tokens(obj.inputTokens, "inputTokens"),
    outputTokens: tokens(obj.outputTokens, "outputTokens"),
  };
}

export function parseUsageRecord(value: unknown): UsageRecord {
  return usageFields(object(value, USAGE_KEYS, "usage"));
}

export function parseTrialOutcome(value: unknown): TrialOutcome {
  const obj = object(value, OUTCOME_KEYS, "outcome");
  if (obj.status !== "success" && obj.status !== "failure" && obj.status !== "invalid" && obj.status !== "uncertain") {
    throw new Error("outcome.status is not admitted");
  }
  return {
    taskId: text(obj.taskId, "task ID"), repeat: integer(obj.repeat, 0, 31, "repeat"),
    policyId: identity(obj.policyId, "policy ID"), status: obj.status, ...usageFields(obj),
  };
}

export interface UsageSummary {
  records: number;
  totalDurationMs: number;
  totalPaidCostUsd: number | null;
  knownPaidCostUsd: number;
  unknownCostRecords: number;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
}

export function summarizeUsage(values: readonly UsageRecord[]): UsageSummary {
  const records = list(values, 16_384, "usage records").map(parseUsageRecord);
  const sumOrUnknown = (key: "paidCostUsd" | "inputTokens" | "outputTokens"): number | null =>
    records.some((record) => record[key] === null) ? null : records.reduce((sum, record) => sum + record[key]!, 0);
  return {
    records: records.length,
    totalDurationMs: records.reduce((sum, record) => sum + record.durationMs, 0),
    totalPaidCostUsd: sumOrUnknown("paidCostUsd"),
    knownPaidCostUsd: records.reduce((sum, record) => sum + (record.paidCostUsd ?? 0), 0),
    unknownCostRecords: records.filter((record) => record.paidCostUsd === null).length,
    totalInputTokens: sumOrUnknown("inputTokens"), totalOutputTokens: sumOrUnknown("outputTokens"),
  };
}

export interface OutcomeSummary {
  attempted: number;
  success: number;
  failure: number;
  invalid: number;
  uncertain: number;
  /** All attempts are the denominator: infrastructure exclusions cannot inflate this score. */
  successRate: number | null;
  gradedSuccessRate: number | null;
  usage: UsageSummary;
}

function usageOnly(value: UsageRecord): UsageRecord {
  return { durationMs: value.durationMs, paidCostUsd: value.paidCostUsd, inputTokens: value.inputTokens, outputTokens: value.outputTokens };
}

export function summarizeOutcomes(values: readonly TrialOutcome[]): OutcomeSummary {
  const outcomes = list(values, 8192, "outcomes").map(parseTrialOutcome);
  const keys = outcomes.map((outcome) => `${outcome.policyId}\0${outcome.taskId}\0${outcome.repeat}`);
  if (new Set(keys).size !== keys.length) throw new Error("duplicate trial outcomes");
  const count = (status: TrialOutcome["status"]): number => outcomes.filter((outcome) => outcome.status === status).length;
  const success = count("success");
  const failure = count("failure");
  return {
    attempted: outcomes.length, success, failure, invalid: count("invalid"), uncertain: count("uncertain"),
    successRate: outcomes.length === 0 ? null : success / outcomes.length,
    gradedSuccessRate: success + failure === 0 ? null : success / (success + failure),
    usage: summarizeUsage(outcomes.map(usageOnly)),
  };
}

export interface EvaluatedCandidate {
  policy: HarnessPolicy;
  outcomes: TrialOutcome[];
}

export interface FrozenSelection {
  version: 1;
  policy: HarnessPolicy;
  policyId: string;
  splitId: string;
  developmentEvidenceId: string;
  selectionRule: "development-success-then-validity-then-policy-id-v1";
  developmentSummary: OutcomeSummary;
  /** Includes every candidate's development trials and all supplied proposal/search overhead. */
  searchUsage: UsageSummary;
}

function trialKey(outcome: TrialOutcome): string {
  return `${outcome.taskId}\0${outcome.repeat}`;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Freeze before any holdout evaluation. Equal complete development trial matrices are required. */
export function selectAndFreezePolicy(input: {
  split: ExperimentSplit;
  candidates: EvaluatedCandidate[];
  searchOverhead?: UsageRecord[];
}): FrozenSelection {
  const split = parseExperimentSplit(input.split);
  const candidates = list(input.candidates, 16, "candidates").map((value) => {
    const candidate = object(value, ["policy", "outcomes"], "candidate");
    const policy = parseHarnessPolicy(candidate.policy);
    const id = policyId(policy);
    const outcomes = list(candidate.outcomes, 8192, "candidate outcomes").map(parseTrialOutcome);
    if (outcomes.some((outcome) => outcome.policyId !== id || !split.devTaskIds.includes(outcome.taskId))) {
      throw new Error("selection outcomes must match candidate identity and development tasks only");
    }
    const summary = summarizeOutcomes(outcomes);
    if (split.devTaskIds.some((taskId) => !outcomes.some((outcome) => outcome.taskId === taskId))) {
      throw new Error("candidate is missing development tasks");
    }
    return { policy, id, outcomes, summary };
  });
  if (candidates.length === 0) throw new Error("selection requires candidates");
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) throw new Error("duplicate candidate policy");
  const matrix = candidates[0]!.outcomes.map(trialKey).sort();
  if (candidates.some((candidate) => canonicalize(candidate.outcomes.map(trialKey).sort()) !== canonicalize(matrix))) {
    throw new Error("candidate development trial matrices differ");
  }
  const repeats = [...new Set(candidates[0]!.outcomes.map((outcome) => outcome.repeat))].sort((a, b) => a - b);
  if (repeats.some((repeat, index) => repeat !== index) || matrix.length !== split.devTaskIds.length * repeats.length) {
    throw new Error("development trial matrix must contain consecutive repeats for every task");
  }
  if (candidates.every((candidate) => candidate.summary.success + candidate.summary.failure === 0)) {
    throw new Error("insufficient development evidence: no graded outcomes");
  }
  candidates.sort((a, b) => b.summary.success - a.summary.success ||
    (a.summary.invalid + a.summary.uncertain) - (b.summary.invalid + b.summary.uncertain) || compareText(a.id, b.id));
  const selected = candidates[0]!;
  const overhead = list(input.searchOverhead ?? [], 8192, "search overhead").map(parseUsageRecord);
  const searchUsage = summarizeUsage([...candidates.flatMap((candidate) => candidate.outcomes.map(usageOnly)), ...overhead]);
  Object.freeze(selected.policy.context);
  Object.freeze(selected.policy);
  return Object.freeze({
    version: 1, policy: selected.policy, policyId: selected.id, splitId: hash(split),
    developmentEvidenceId: hash(candidates.map(({ id, outcomes }) => ({ id, outcomes: [...outcomes].sort((a, b) => compareText(trialKey(a), trialKey(b))) }))),
    selectionRule: "development-success-then-validity-then-policy-id-v1",
    developmentSummary: selected.summary, searchUsage,
  });
}

/** Evaluation only: this helper cannot replace or reselect the frozen policy. */
export function summarizeHoldout(splitValue: ExperimentSplit, frozen: FrozenSelection, values: readonly TrialOutcome[]): OutcomeSummary {
  const split = parseExperimentSplit(splitValue);
  if (frozen.version !== 1 || frozen.splitId !== hash(split) || frozen.policyId !== policyId(frozen.policy)) {
    throw new Error("frozen policy or split identity changed");
  }
  const outcomes = list(values, 8192, "holdout outcomes").map(parseTrialOutcome);
  if (outcomes.some((outcome) => outcome.policyId !== frozen.policyId || !split.holdoutTaskIds.includes(outcome.taskId))) {
    throw new Error("holdout outcomes must match the frozen policy and held-out tasks");
  }
  if (split.holdoutTaskIds.some((taskId) => !outcomes.some((outcome) => outcome.taskId === taskId))) {
    throw new Error("holdout report is missing tasks");
  }
  const repeats = [...new Set(outcomes.map((outcome) => outcome.repeat))].sort((a, b) => a - b);
  if (repeats.some((repeat, index) => repeat !== index) || outcomes.length !== split.holdoutTaskIds.length * repeats.length) {
    throw new Error("holdout trial matrix must contain consecutive repeats for every task");
  }
  return summarizeOutcomes(outcomes);
}
