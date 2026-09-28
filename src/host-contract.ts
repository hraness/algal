/** Shared additive evidence, qualification, promotion and lifecycle records.
 * These records are data-only projections. They never grant authority, attest
 * provider truth, or retry an external effect. */
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { boundedJsonSnapshot } from "./json-snapshot";
import { asInt, asObject, asString, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const EVALUATION_EVIDENCE_CONTRACT = "algal.evaluation-evidence.v1" as const;
export const HOST_PROFILE_CONTRACT = "algal.host-profile.v1" as const;
export const PROMOTION_DECISION_CONTRACT = "algal.promotion-decision.v1" as const;
export const HOST_LIFECYCLE_CONTRACT = "algal.host-lifecycle.v1" as const;

export const HOST_CONTRACT_BOUNDS = Object.freeze({
  maxBytes: 4_194_304, maxDepth: 48, maxNodes: 131_072, maxEntries: 4_096, maxStringBytes: 262_144,
  maxGroups: 64, maxCases: 2_048, maxLimitEntries: 32, maxCapabilities: 128,
  maxProbes: 64, maxActions: 32, maxMetrics: 128, maxLimit: 4_294_967_295,
});

export type EvaluationOutcomeCase = { id: string; group: string; outcome: "complete" | "failed" | "uncertain"; passed: boolean; score: number; receipt: Digest | null; feedback: string | null };
export type EvaluationOutcome = { passed: number; total: number; score: number; cases: EvaluationOutcomeCase[] };
export type EvaluationEvidence = {
  contract: typeof EVALUATION_EVIDENCE_CONTRACT;
  baseArtifact: Digest; candidateArtifact: Digest; dataset: { digest: Digest; groups: string[]; splitPolicy: string; labelProvenance: string; redactionPolicy: string };
  evaluator: { scorerDigest: Digest; runtimeDigest: Digest; routeDigest: Digest | null };
  usage: { modelCalls: number; tokensIn: number; tokensOut: number; units: string };
  charges: { reserved: number; settled: number; unit: string };
  outcomes: { train: EvaluationOutcome; validation: EvaluationOutcome; holdout: EvaluationOutcome };
  independentReview: { status: "not-reviewed" | "reviewed" | "rejected"; reviewer: string | null; notes: string | null };
  claimCategory: "mechanism" | "replay" | "qualified-boundary" | "effectiveness" | "activation";
  limitations: string[];
  digest: Digest;
};

export type HostProfile = {
  contract: typeof HOST_PROFILE_CONTRACT;
  host: { id: string; kind: string; version: string };
  runtime: { runtimeDigest: Digest; evaluatorDigest: Digest; supportedContracts: string[] };
  route: { profileDigest: Digest; scopeDigest: Digest; accountScopeDigest: Digest | null };
  limits: { maxConcurrent: number; maxQueue: number; maxInputBytes: number; maxOutputBytes: number; maxWork: number };
  usageUnits: { name: string; semantics: string };
  resultRetention: { mode: "none" | "digest-only" | "original"; maxBytes: number; originalRetrieval: boolean };
  uncertainEffectPolicy: "reconcile-required" | "read-only" | "unsupported";
  probes: { id: string; status: "passed" | "failed" | "not-run"; evidence: Digest | null }[];
  absentCapabilities: string[];
  digest: Digest;
};

export type PromotionDecision = {
  contract: typeof PROMOTION_DECISION_CONTRACT;
  incumbent: Digest; candidate: Digest; evidence: Digest; policy: Digest;
  scope: { environment: string; tenant: string | null; contact: string | null };
  rollout: { mode: "shadow" | "canary" | "active"; sampleLimit: number; trafficLimit: number; expiresAfter: number | null };
  reviewer: { id: string; status: "approved" | "rejected" | "expired" };
  rollback: { target: Digest; compatibility: Digest; reason: string | null };
  observedMetrics: Record<string, number>;
  digest: Digest;
};

export type HostLifecycle = {
  contract: typeof HOST_LIFECYCLE_CONTRACT;
  owner: string; generation: number;
  state: "ready" | "running" | "suspended" | "uncertain" | "settled" | "failed" | "stopped";
  pendingIntent: Digest | null;
  backlog: { queued: number; active: number };
  heldAuthority: string[];
  usage: { units: number; charges: number; unit: string };
  receipt: Digest | null;
  permittedOperatorActions: ("inspect" | "resume" | "suspend" | "reconcile" | "drain" | "rollback" | "stop")[];
  digest: Digest;
};

const json = (v: unknown): JsonValue => v as JsonValue;
function fail(at: string, message: string): never { throw new AlgalError("PARSE_FAILED", `${at}: ${message}`); }
function bounded(value: unknown, at: string): JsonValue { return boundedJsonSnapshot(value, HOST_CONTRACT_BOUNDS, at); }
function object(value: unknown, at: string, keys: readonly string[]): Record<string, unknown> { const v = asObject(value, at); noUnknownKeys(v, keys, at); return v; }
function str(value: unknown, at: string, max = 256): string { return asString(value, at, max); }
function count(value: unknown, at: string, min: number = 0, max: number = HOST_CONTRACT_BOUNDS.maxLimit): number { return asInt(value, at, min, max); }
function finite(value: unknown, at: string): number { if (typeof value !== "number" || !Number.isFinite(value)) fail(at, "must be a finite number"); return value; }
function oneOf<T extends string>(value: unknown, allowed: readonly T[], at: string): T { if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) fail(at, `must be one of: ${allowed.join(", ")}`); return value as T; }
function nullableDigest(value: unknown, at: string): Digest | null { return value === null ? null : asDigest(value, at); }
function sortedStrings(value: unknown, at: string, max: number): string[] { if (!Array.isArray(value) || value.length > max) fail(at, `must contain at most ${max} items`); const out = value.map((v, i) => str(v, `${at}[${i}]`)); if (out.some((v, i) => i && v <= out[i - 1]!)) fail(at, "must be sorted and unique"); return out; }
function signed<T extends { digest: Digest }>(base: Omit<T, "digest">, digest: unknown, at: string): T { const actual = asDigest(digest, `${at}.digest`); const expected = digestCanonical(json(base)); if (expected !== actual) throw new AlgalError("DIGEST_MISMATCH", `${at}: digest differs`); return { ...base, digest: actual } as T; }
function normalized<T extends { digest: Digest }>(raw: Record<string, unknown>, base: Omit<T, "digest">, at: string): T { const result = signed<T>(base, raw.digest, at); if (canonicalize(json(raw)) !== canonicalize(json(result))) fail(at, "record is not normalized"); return result; }

function parseOutcome(value: unknown, at: string): EvaluationOutcome {
  const v = object(value, at, ["passed", "total", "score", "cases"]);
  const casesRaw = v.cases; if (!Array.isArray(casesRaw) || casesRaw.length > HOST_CONTRACT_BOUNDS.maxCases) fail(`${at}.cases`, "too many cases");
  const outcomes = ["complete", "failed", "uncertain"] as const;
  const cases = casesRaw.map((item, i) => { const c = object(item, `${at}.cases[${i}]`, ["id", "group", "outcome", "passed", "score", "receipt", "feedback"]); const outcome = oneOf(c.outcome, outcomes, `${at}.cases[${i}].outcome`); if (typeof c.passed !== "boolean") fail(`${at}.cases[${i}].passed`, "must be boolean"); return { id: str(c.id, `${at}.cases[${i}].id`, 128), group: str(c.group, `${at}.cases[${i}].group`, 128), outcome, passed: c.passed, score: finite(c.score, `${at}.cases[${i}].score`), receipt: nullableDigest(c.receipt, `${at}.cases[${i}].receipt`), feedback: c.feedback === null ? null : str(c.feedback, `${at}.cases[${i}].feedback`, 4096) }; });
  const passed = count(v.passed, `${at}.passed`, 0, cases.length), total = count(v.total, `${at}.total`, 0, HOST_CONTRACT_BOUNDS.maxCases); if (total !== cases.length || passed > total || cases.filter(c => c.passed).length !== passed) fail(at, "outcome totals differ from cases");
  return { passed, total, score: finite(v.score, `${at}.score`), cases };
}

export function parseEvaluationEvidence(value: unknown): EvaluationEvidence {
  const raw = object(bounded(value, "evaluation evidence"), "evaluation evidence", ["contract", "baseArtifact", "candidateArtifact", "dataset", "evaluator", "usage", "charges", "outcomes", "independentReview", "claimCategory", "limitations", "digest"]);
  if (raw.contract !== EVALUATION_EVIDENCE_CONTRACT) fail("evaluation evidence.contract", `expected ${EVALUATION_EVIDENCE_CONTRACT}`);
  const d = object(raw.dataset, "evaluation evidence.dataset", ["digest", "groups", "splitPolicy", "labelProvenance", "redactionPolicy"]);
  const e = object(raw.evaluator, "evaluation evidence.evaluator", ["scorerDigest", "runtimeDigest", "routeDigest"]);
  const u = object(raw.usage, "evaluation evidence.usage", ["modelCalls", "tokensIn", "tokensOut", "units"]);
  const ch = object(raw.charges, "evaluation evidence.charges", ["reserved", "settled", "unit"]);
  const o = object(raw.outcomes, "evaluation evidence.outcomes", ["train", "validation", "holdout"]);
  const review = object(raw.independentReview, "evaluation evidence.independentReview", ["status", "reviewer", "notes"]);
  const reviewStatus = oneOf(review.status, ["not-reviewed", "reviewed", "rejected"], "evaluation evidence.independentReview.status");
  const claimCategory = oneOf(raw.claimCategory, ["mechanism", "replay", "qualified-boundary", "effectiveness", "activation"], "evaluation evidence.claimCategory");
  const base = { contract: EVALUATION_EVIDENCE_CONTRACT, baseArtifact: asDigest(raw.baseArtifact, "evaluation evidence.baseArtifact"), candidateArtifact: asDigest(raw.candidateArtifact, "evaluation evidence.candidateArtifact"), dataset: { digest: asDigest(d.digest, "dataset.digest"), groups: sortedStrings(d.groups, "dataset.groups", HOST_CONTRACT_BOUNDS.maxGroups), splitPolicy: str(d.splitPolicy, "dataset.splitPolicy", 1024), labelProvenance: str(d.labelProvenance, "dataset.labelProvenance", 1024), redactionPolicy: str(d.redactionPolicy, "dataset.redactionPolicy", 1024) }, evaluator: { scorerDigest: asDigest(e.scorerDigest, "evaluator.scorerDigest"), runtimeDigest: asDigest(e.runtimeDigest, "evaluator.runtimeDigest"), routeDigest: nullableDigest(e.routeDigest, "evaluator.routeDigest") }, usage: { modelCalls: count(u.modelCalls, "usage.modelCalls"), tokensIn: count(u.tokensIn, "usage.tokensIn"), tokensOut: count(u.tokensOut, "usage.tokensOut"), units: str(u.units, "usage.units", 128) }, charges: { reserved: finite(ch.reserved, "charges.reserved"), settled: finite(ch.settled, "charges.settled"), unit: str(ch.unit, "charges.unit", 128) }, outcomes: { train: parseOutcome(o.train, "outcomes.train"), validation: parseOutcome(o.validation, "outcomes.validation"), holdout: parseOutcome(o.holdout, "outcomes.holdout") }, independentReview: { status: reviewStatus, reviewer: review.reviewer === null ? null : str(review.reviewer, "reviewer", 256), notes: review.notes === null ? null : str(review.notes, "review notes", 4096) }, claimCategory, limitations: sortedStrings(raw.limitations, "limitations", 32) } satisfies Omit<EvaluationEvidence, "digest">;
  if (base.charges.settled > base.charges.reserved) fail("evaluation evidence.charges", "settled charges exceed the reservation");
  return normalized<EvaluationEvidence>(raw, base, "evaluation evidence");
}
export function buildEvaluationEvidence(value: Omit<EvaluationEvidence, "digest">): EvaluationEvidence { return parseEvaluationEvidence({ ...value, digest: digestCanonical(json(value)) }); }
export const verifyEvaluationEvidence = parseEvaluationEvidence;

export function parseHostProfile(value: unknown): HostProfile {
  const raw = object(bounded(value, "host profile"), "host profile", ["contract", "host", "runtime", "route", "limits", "usageUnits", "resultRetention", "uncertainEffectPolicy", "probes", "absentCapabilities", "digest"]);
  if (raw.contract !== HOST_PROFILE_CONTRACT) fail("host profile.contract", `expected ${HOST_PROFILE_CONTRACT}`);
  const h = object(raw.host, "host", ["id", "kind", "version"]), rt = object(raw.runtime, "runtime", ["runtimeDigest", "evaluatorDigest", "supportedContracts"]), r = object(raw.route, "route", ["profileDigest", "scopeDigest", "accountScopeDigest"]), l = object(raw.limits, "limits", ["maxConcurrent", "maxQueue", "maxInputBytes", "maxOutputBytes", "maxWork"]), units = object(raw.usageUnits, "usageUnits", ["name", "semantics"]), ret = object(raw.resultRetention, "resultRetention", ["mode", "maxBytes", "originalRetrieval"]);
  const probesRaw = raw.probes; if (!Array.isArray(probesRaw) || probesRaw.length > HOST_CONTRACT_BOUNDS.maxProbes) fail("probes", "too many probes");
  const probes = probesRaw.map((x, i) => { const p = object(x, `probes[${i}]`, ["id", "status", "evidence"]); const status = oneOf(p.status, ["passed", "failed", "not-run"], `probes[${i}].status`); return { id: str(p.id, `probes[${i}].id`, 128), status, evidence: nullableDigest(p.evidence, `probes[${i}].evidence`) }; });
  if (probes.some((p, i) => i && p.id <= probes[i - 1]!.id)) fail("probes", "must be sorted by unique id");
  const retentionMode = oneOf(ret.mode, ["none", "digest-only", "original"], "resultRetention.mode");
  if (typeof ret.originalRetrieval !== "boolean") fail("resultRetention.originalRetrieval", "must be boolean");
  const uncertainEffectPolicy = oneOf(raw.uncertainEffectPolicy, ["reconcile-required", "read-only", "unsupported"], "uncertainEffectPolicy");
  const base = { contract: HOST_PROFILE_CONTRACT, host: { id: str(h.id, "host.id", 128), kind: str(h.kind, "host.kind", 128), version: str(h.version, "host.version", 128) }, runtime: { runtimeDigest: asDigest(rt.runtimeDigest, "runtime.runtimeDigest"), evaluatorDigest: asDigest(rt.evaluatorDigest, "runtime.evaluatorDigest"), supportedContracts: sortedStrings(rt.supportedContracts, "runtime.supportedContracts", 64) }, route: { profileDigest: asDigest(r.profileDigest, "route.profileDigest"), scopeDigest: asDigest(r.scopeDigest, "route.scopeDigest"), accountScopeDigest: nullableDigest(r.accountScopeDigest, "route.accountScopeDigest") }, limits: { maxConcurrent: count(l.maxConcurrent, "limits.maxConcurrent"), maxQueue: count(l.maxQueue, "limits.maxQueue"), maxInputBytes: count(l.maxInputBytes, "limits.maxInputBytes"), maxOutputBytes: count(l.maxOutputBytes, "limits.maxOutputBytes"), maxWork: count(l.maxWork, "limits.maxWork") }, usageUnits: { name: str(units.name, "usageUnits.name", 128), semantics: str(units.semantics, "usageUnits.semantics", 1024) }, resultRetention: { mode: retentionMode, maxBytes: count(ret.maxBytes, "resultRetention.maxBytes"), originalRetrieval: ret.originalRetrieval }, uncertainEffectPolicy, probes, absentCapabilities: sortedStrings(raw.absentCapabilities, "absentCapabilities", HOST_CONTRACT_BOUNDS.maxCapabilities) } satisfies Omit<HostProfile, "digest">;
  return normalized<HostProfile>(raw, base, "host profile");
}
export function buildHostProfile(value: Omit<HostProfile, "digest">): HostProfile { return parseHostProfile({ ...value, digest: digestCanonical(json(value)) }); }
export const verifyHostProfile = parseHostProfile;

export function parsePromotionDecision(value: unknown): PromotionDecision {
  const raw = object(bounded(value, "promotion decision"), "promotion decision", ["contract", "incumbent", "candidate", "evidence", "policy", "scope", "rollout", "reviewer", "rollback", "observedMetrics", "digest"]);
  if (raw.contract !== PROMOTION_DECISION_CONTRACT) fail("promotion decision.contract", `expected ${PROMOTION_DECISION_CONTRACT}`);
  const s = object(raw.scope, "scope", ["environment", "tenant", "contact"]), ro = object(raw.rollout, "rollout", ["mode", "sampleLimit", "trafficLimit", "expiresAfter"]), rv = object(raw.reviewer, "reviewer", ["id", "status"]), rb = object(raw.rollback, "rollback", ["target", "compatibility", "reason"]);
  const rolloutMode = oneOf(ro.mode, ["shadow", "canary", "active"], "rollout.mode");
  const reviewerStatus = oneOf(rv.status, ["approved", "rejected", "expired"], "reviewer.status");
  const metrics = asObject(raw.observedMetrics, "observedMetrics"); if (Object.keys(metrics).length > HOST_CONTRACT_BOUNDS.maxMetrics) fail("observedMetrics", "too many metrics"); const observedMetrics: Record<string, number> = {}; for (const [k, v] of Object.entries(metrics)) observedMetrics[str(k, "metric name", 128)] = finite(v, `observedMetrics.${k}`);
  const base = { contract: PROMOTION_DECISION_CONTRACT, incumbent: asDigest(raw.incumbent, "incumbent"), candidate: asDigest(raw.candidate, "candidate"), evidence: asDigest(raw.evidence, "evidence"), policy: asDigest(raw.policy, "policy"), scope: { environment: str(s.environment, "scope.environment", 128), tenant: s.tenant === null ? null : str(s.tenant, "scope.tenant", 256), contact: s.contact === null ? null : str(s.contact, "scope.contact", 256) }, rollout: { mode: rolloutMode, sampleLimit: count(ro.sampleLimit, "rollout.sampleLimit"), trafficLimit: count(ro.trafficLimit, "rollout.trafficLimit"), expiresAfter: ro.expiresAfter === null ? null : count(ro.expiresAfter, "rollout.expiresAfter") }, reviewer: { id: str(rv.id, "reviewer.id", 256), status: reviewerStatus }, rollback: { target: asDigest(rb.target, "rollback.target"), compatibility: asDigest(rb.compatibility, "rollback.compatibility"), reason: rb.reason === null ? null : str(rb.reason, "rollback.reason", 1024) }, observedMetrics } satisfies Omit<PromotionDecision, "digest">;
  if (base.candidate === base.incumbent) fail("promotion decision", "candidate must differ from incumbent");
  return normalized<PromotionDecision>(raw, base, "promotion decision");
}
export function buildPromotionDecision(value: Omit<PromotionDecision, "digest">): PromotionDecision { return parsePromotionDecision({ ...value, digest: digestCanonical(json(value)) }); }
export const verifyPromotionDecision = parsePromotionDecision;

export function parseHostLifecycle(value: unknown): HostLifecycle {
  const raw = object(bounded(value, "host lifecycle"), "host lifecycle", ["contract", "owner", "generation", "state", "pendingIntent", "backlog", "heldAuthority", "usage", "receipt", "permittedOperatorActions", "digest"]);
  if (raw.contract !== HOST_LIFECYCLE_CONTRACT) fail("host lifecycle.contract", `expected ${HOST_LIFECYCLE_CONTRACT}`);
  const b = object(raw.backlog, "backlog", ["queued", "active"]), u = object(raw.usage, "usage", ["units", "charges", "unit"]); const states = ["ready", "running", "suspended", "uncertain", "settled", "failed", "stopped"] as const; const actions = ["inspect", "resume", "suspend", "reconcile", "drain", "rollback", "stop"] as const;
  const state = oneOf(raw.state, states, "host lifecycle.state"); if (!Array.isArray(raw.permittedOperatorActions) || raw.permittedOperatorActions.length > HOST_CONTRACT_BOUNDS.maxActions) fail("permittedOperatorActions", "must be a bounded list"); const permittedOperatorActions = raw.permittedOperatorActions.map((x, i) => oneOf(x, actions, `permittedOperatorActions[${i}]`)); if (permittedOperatorActions.some((a, i) => i && a <= permittedOperatorActions[i - 1]!)) fail("permittedOperatorActions", "must be sorted and unique");
  const base = { contract: HOST_LIFECYCLE_CONTRACT, owner: str(raw.owner, "owner", 256), generation: count(raw.generation, "generation"), state, pendingIntent: nullableDigest(raw.pendingIntent, "pendingIntent"), backlog: { queued: count(b.queued, "backlog.queued"), active: count(b.active, "backlog.active") }, heldAuthority: sortedStrings(raw.heldAuthority, "heldAuthority", HOST_CONTRACT_BOUNDS.maxCapabilities), usage: { units: finite(u.units, "usage.units"), charges: finite(u.charges, "usage.charges"), unit: str(u.unit, "usage.unit", 128) }, receipt: nullableDigest(raw.receipt, "receipt"), permittedOperatorActions } satisfies Omit<HostLifecycle, "digest">;
  if (base.state === "uncertain" && base.pendingIntent === null) fail("host lifecycle", "uncertain state requires pendingIntent"); if (base.state !== "uncertain" && base.pendingIntent !== null && base.state !== "running" && base.state !== "suspended") fail("host lifecycle", "pendingIntent is only valid for running, suspended or uncertain state");
  return normalized<HostLifecycle>(raw, base, "host lifecycle");
}
export function buildHostLifecycle(value: Omit<HostLifecycle, "digest">): HostLifecycle { return parseHostLifecycle({ ...value, digest: digestCanonical(json(value)) }); }
export const verifyHostLifecycle = parseHostLifecycle;

export type HostContractRecord = EvaluationEvidence | HostProfile | PromotionDecision | HostLifecycle;
export function parseHostContractRecord(value: unknown): HostContractRecord {
  const raw = asObject(bounded(value, "host contract record"), "host contract record");
  switch (raw.contract) { case EVALUATION_EVIDENCE_CONTRACT: return parseEvaluationEvidence(raw); case HOST_PROFILE_CONTRACT: return parseHostProfile(raw); case PROMOTION_DECISION_CONTRACT: return parsePromotionDecision(raw); case HOST_LIFECYCLE_CONTRACT: return parseHostLifecycle(raw); default: fail("host contract record.contract", "unknown contract"); }
}
