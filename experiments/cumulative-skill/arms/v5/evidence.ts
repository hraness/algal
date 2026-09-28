// Recompute learning scores from frozen attempt records, then evaluate each
// final singleton program on a fresh, disjoint suite through runImprovement.
// Native evidence and decisions describe those frozen programs only. The
// study's complete-cohort verdict and full lifecycle costs are separate.
//
// bun evidence.ts <resultsRoot> [--eval-heads <executor flags>] [--route id]
// Without --eval-heads this exports existing results with no executor calls.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { manifestToJson } from "../../../../src/contract";
import { asDigest, digestCanonical } from "../../../../src/digest";
import { commandExecutor, scriptedExecutor, type Executor } from "../../../../src/effects";
import { parseSkillExperimentReport } from "../../../../src/experiment-report";
import { parseExperimentArm, parseExperimentCatalog, parseExperimentRun, parseExperimentSession } from "../../../../src/experiment-run";
import { verifyExperimentReport } from "../../../../src/experiment-verify";
import { parseHabitatBudget, type HabitatRun } from "../../../../src/habitat-budget";
import { runImprovement, type ImproveResult } from "../../../../src/improve";
import { builtinRegistry } from "../../../../src/registry";
import { parseRunReceipt, RUNTIME_VERSION } from "../../../../src/run";
import { boundedJsonSnapshot } from "../../../../src/source-dependencies";
import { FileStore, type Store } from "../../../../src/store";
import { asObject, canonicalize, noUnknownKeys, type JsonObject } from "../../../../src/values";
import { corpusSnapshot, corpusTruth, gradeStudy, loadStudyConfig } from "./grade";
import { buildStudyConfigs } from "./build";
import { accountCost, addCosts, ARMS, frozenCases, FROZEN_LABELS, FROZEN_POLICY, json, pairedSummary, putSignedRecord, requireMatch,
  same, storedManifest, storedValue, verifyFrozenResult, zeroCost, type Cohort, type FrozenExpectation, type StudyArm } from "./evidence-support";
import { ARM_BUDGET, CORPORA, frozenHoldoutTasks, learningTasks, SCORER, SEED_BUDGET, SEED_MAX_GENERATIONS, studyGenerator, STUDY_ROOT, STUDY_SLUGS, type StudySlug } from "./shared";

const FILE_BYTES = 32 * 1024 * 1024;
function bytes(path: string): Buffer {
  const stat = statSync(path);
  requireMatch(stat.isFile() && stat.size <= FILE_BYTES, `${path}: file exceeds byte/type bound`);
  const value = readFileSync(path);
  requireMatch(value.length <= FILE_BYTES, `${path}: file exceeds byte bound`);
  return value;
}
function readJson(path: string): JsonObject {
  return asObject(boundedJsonSnapshot(JSON.parse(bytes(path).toString("utf8")), {
    maxBytes: FILE_BYTES, maxDepth: 64, maxNodes: 1_000_000, maxEntries: 1_000_000, maxStringBytes: FILE_BYTES,
  }, path), path);
}
const byteHash = (value: Buffer): string => createHash("sha256").update(value).digest("hex");
function writeJson(path: string, value: unknown): void { writeFileSync(path, canonicalize(json(value)) + "\n"); }
/** Matches execution.py's compact UTF-8 JSON identity for string argv. */
export function executorArgumentsDigest(args: string[]) {
  return digestCanonical(args);
}

export async function verifyObservedRoute(store: Store, runs: HabitatRun[], executionBytes: Buffer): Promise<void> {
  const identity = asObject(JSON.parse(executionBytes.toString("utf8")), "execution identity");
  const declared = asObject(identity.executor, "executor");
  if (typeof declared.baseUrl !== "string" || typeof declared.model !== "string") return;
  const expected = digestCanonical({ kind: "openai", baseUrl: declared.baseUrl, model: declared.model,
    credentialEnv: declared.credentialEnv ?? null, responseFormat: "json_schema", timeoutMs: 120_000, maxResponseBytes: 2_097_152 });
  for (const run of runs) {
    const receipt = parseRunReceipt(await store.getReceipt(run.receipt));
    requireMatch(receipt.effects.every((effect) => effect.configurationDigest === expected ||
      effect.executor === "unbound" && effect.error?.code === "EFFECT_UNBOUND" &&
      effect.error.message === "no host-admitted executor for this request" && effect.output === undefined &&
      effect.configurationDigest === undefined && effect.usage === undefined && effect.cached === undefined && effect.wake === undefined),
    "observed receipt configuration differs from the recorded study executor");
  }
}

/** Bind the public arm name as well as the native arm kind: both optimizer
 * variants intentionally share a native kind but have distinct protocols. */
export function verifyAttemptBinding(arm: StudyArm, configBytes: Buffer, executionBytes: Buffer,
  binding: unknown, config: JsonObject): void {
  const record = asObject(binding, "attempt binding");
  noUnknownKeys(record, ["contract", "arm", "configBytesSha256", "executionBytesSha256"], "attempt binding");
  requireMatch(record.contract === "algal.study-attempt.v1" && record.arm === arm &&
    record.configBytesSha256 === byteHash(configBytes) && record.executionBytesSha256 === byteHash(executionBytes), `${arm}: attempt/config/execution binding mismatch`);
  const spec = parseExperimentArm(config.arm);
  requireMatch(spec.arm === (arm === "optimizer-raw" ? "optimizer" : arm), `${arm}: wrong native arm`);
  if (arm === "optimizer" || arm === "optimizer-raw") requireMatch(spec.normalizeEmitted === (arm === "optimizer"), `${arm}: normalization protocol mismatch`);
}

export async function preflightCorpus(resultsRoot: string, slug: StudySlug, executionBytes: Buffer) {
  const corpusDir = join(resultsRoot, slug);
  const learningDir = join(STUDY_ROOT, "tasks", CORPORA[STUDY_SLUGS.indexOf(slug)]!);
  const learning = learningTasks(learningDir);
  const truth = corpusTruth(learningDir);
  const seedStore = new FileStore(join(resultsRoot, "stores", slug, "seed"));
  const seed = readJson(join(corpusDir, "seed-summary.json"));
  requireMatch(seed.contract === "algal.study-seed.v1" && typeof seed.qualified === "boolean" &&
    seed.taskDigest === learning[0]!.digest && seed.taskId === learning[0]!.taskId, `${slug}: seed is unqualified or belongs to another corpus`);
  requireMatch(bytes(join(corpusDir, "seed.attempt", "execution.json")).equals(executionBytes), `${slug}: seed executor/runtime mismatch`);
  const seedAccount = parseHabitatBudget(await storedValue(seedStore, asDigest(seed.account, "seed account")));
  requireMatch(seedAccount.activity === "experiment" && same(seedAccount.limits, SEED_BUDGET) &&
    seed.maxGenerations === SEED_MAX_GENERATIONS, `${slug}: seed protocol budget differs`);
  requireMatch(Array.isArray(seed.attempts) && seed.attempts.length > 0 && seed.attempts.length <= 8, `${slug}: invalid seed attempts`);
  const seedRuns: HabitatRun[] = [];
  for (const [i, value] of seed.attempts.entries()) {
    const attempt = asObject(value, "seed attempt");
    requireMatch(attempt.generation === i + 1, `${slug}: unordered seed attempts`);
    const session = parseExperimentSession(await storedValue(seedStore, asDigest(attempt.session, "seed session")));
    requireMatch(session.arm === "retained" && session.tasks.length === 1 && session.tasks[0]!.run === attempt.run && session.budget === attempt.account, `${slug}: seed attempt/session mismatch`);
    const account = parseHabitatBudget(await storedValue(seedStore, session.budget));
    seedRuns.push(...account.runs);
    const run = parseExperimentRun(await storedValue(seedStore, session.tasks[0]!.run));
    requireMatch(run.manifest === attempt.manifest && same(run.generator, attempt.generator) && run.outcome === attempt.outcome &&
      same(run.failure, attempt.failure) && (run.promote?.report ?? null) === attempt.report, `${slug}: seed attempt/run mismatch`);
    const catalog = parseExperimentCatalog(await storedValue(seedStore, session.catalog));
    if (!seed.qualified || i < seed.attempts.length - 1) requireMatch(catalog.entries.length === 0 && run.promote?.promoted !== true, `${slug}: skipped an earlier passing seed`);
    else requireMatch(session.catalog === seed.catalog, `${slug}: final seed catalog differs from qualification`);
    if (run.generator !== null) requireMatch(run.generator.manifest === digestCanonical(studyGenerator("generator.algal.json").manifest), `${slug}: seed generator differs from matched protocol`);
    if (run.promote?.report !== undefined && run.promote.report !== null) {
      const report = asObject(await storedValue(seedStore, run.promote.report), "seed qualification report");
      requireMatch(Array.isArray(report.candidates) && report.candidates.length === 1 && report.promoted === run.manifest, `${slug}: seed qualification population mismatch`);
      const candidate = asObject(report.candidates[0], "seed qualification candidate");
      requireMatch(candidate.manifestDigest === run.manifest && same(candidate.validation, run.promote.validation) &&
        same(candidate.validation, attempt.validation) && same(candidate.train, attempt.train), `${slug}: seed qualification scores mismatch`);
    }
    if (seed.qualified && i === seed.attempts.length - 1) requireMatch(run.generator !== null && run.manifest === seed.manifest &&
      run.promote?.promoted === true && run.promote.report === seed.report &&
      run.promote.validation?.passed === run.promote.validation?.total && (run.promote.validation?.total ?? 0) > 0,
    `${slug}: seed lacks generated passing qualification`);
  }
  requireMatch(same(seedRuns, seedAccount.runs), `${slug}: seed account omits or repeats an attempt`);
  const seedCost = await accountCost(seedStore, seedAccount);
  await verifyObservedRoute(seedStore, seedAccount.runs, executionBytes);
  if (!seed.qualified) {
    requireMatch(seed.manifest === null && seed.report === null && seed.catalog === null &&
      (seed.termination === "generation-limit" && seed.attempts.length === seed.maxGenerations ||
        seed.termination === "budget-limit" && (seedAccount.outcome === "exhausted" || seedAccount.charged.work >= seedAccount.limits.work ||
          seedAccount.charged.runs >= seedAccount.limits.runs)), `${slug}: seed attempt is unfinished, not a completed seed failure`);
    requireMatch(!existsSync(join(corpusDir, "seed-catalog.json")) && !existsSync(join(corpusDir, "seed-manifest.json")) &&
      !existsSync(join(corpusDir, "attempts")), `${slug}: unqualified seed has learning artifacts`);
    return { status: "seed-failed" as const, slug, corpusDir, seed, seedStore, seedCost, truthSnapshot: corpusSnapshot(truth) };
  }
  const seedCatalog = parseExperimentCatalog(readJson(join(corpusDir, "seed-catalog.json")));
  requireMatch(seedCatalog.entries.length === 1 && seedCatalog.entries[0]!.retired === undefined &&
    digestCanonical(json(seedCatalog)) === seed.catalog && seedCatalog.entries[0]!.manifest === seed.manifest &&
    seedCatalog.entries[0]!.report === seed.report, `${slug}: seed catalog identity mismatch`);
  const incumbent = asDigest(seed.manifest, "seed manifest");
  const seedManifest = await storedManifest(seedStore, incumbent);
  requireMatch(same(manifestToJson(seedManifest), readJson(join(corpusDir, "seed-manifest.json"))), `${slug}: seed manifest artifact mismatch`);
  const expectedConfigs = buildStudyConfigs(learningDir, seedCatalog, manifestToJson(seedManifest), seed);
  const sessions = readJson(join(corpusDir, "sessions.json"));
  const arms = [];
  for (const arm of ARMS) {
    requireMatch(typeof sessions[arm] === "string", `${slug}: missing ${arm} session`);
    const sessionDigest = asDigest(sessions[arm], `${arm} session`);
    const attemptDir = join(corpusDir, "attempts", arm);
    const attemptBytes = bytes(join(attemptDir, "config.json"));
    requireMatch(attemptBytes.equals(bytes(join(corpusDir, `${arm}.config.json`))), `${slug}/${arm}: executed config changed`);
    requireMatch(bytes(join(attemptDir, "execution.json")).equals(executionBytes), `${slug}/${arm}: executor/runtime mismatch`);
    const config = await loadStudyConfig(join(attemptDir, "config.json"));
    requireMatch(same(config, expectedConfigs[arm]), `${slug}/${arm}: saved config differs from the matched study protocol`);
    const binding = readJson(join(attemptDir, "binding.json"));
    verifyAttemptBinding(arm, attemptBytes, executionBytes, binding, config);
    const spec = parseExperimentArm(config.arm);
    requireMatch(spec.family === "record-triage" && same(spec.budget, ARM_BUDGET), `${slug}/${arm}: unmatched family or budget`);
    const taskRecords = config.tasks;
    requireMatch(Array.isArray(taskRecords) && same(taskRecords.map((task) => asObject(task, "task").taskId), learning.map((task) => task.taskId)), `${slug}/${arm}: learning plan coverage mismatch`);
    if (arm === "fixed") requireMatch(spec.manifest !== undefined && digestCanonical(manifestToJson(spec.manifest)) === incumbent, `${slug}: fixed arm did not execute shared seed`);
    else requireMatch(same(config.catalog, seedCatalog), `${slug}/${arm}: initial catalog differs from shared seed`);
    const storeDir = join(resultsRoot, "stores", slug, arm);
    const store = new FileStore(storeDir);
    const session = parseExperimentSession(await storedValue(store, sessionDigest));
    const link = readJson(join(attemptDir, "session.json"));
    requireMatch(link.session === sessionDigest && link.outcome === session.outcome && link.arm === session.arm && link.tasks === session.tasks.length &&
      link.budget === session.budget && link.catalog === session.catalog, `${slug}/${arm}: execution/session link mismatch`);
    const scores = await gradeStudy(store, truth, config, sessionDigest);
    requireMatch(same(scores, readJson(join(corpusDir, `${arm}.scores.json`))), `${slug}/${arm}: supplied scores differ from recomputed session/config/corpus scores`);
    const nativeReport = parseSkillExperimentReport(readJson(join(corpusDir, `${arm}.report.json`)));
    requireMatch(nativeReport.arms.length === 1 && nativeReport.arms[0]!.session === sessionDigest, `${slug}/${arm}: report/session mismatch`);
    const verification = await verifyExperimentReport(nativeReport, storeDir);
    requireMatch(verification.ok, `${slug}/${arm}: native report verification failed: ${verification.mismatches.join("; ")}`);
    const account = parseHabitatBudget(await storedValue(store, session.budget));
    await verifyObservedRoute(store, account.runs, executionBytes);
    const catalog = parseExperimentCatalog(await storedValue(store, session.catalog));
    const head = arm === "fixed" ? incumbent : [...catalog.entries].reverse().find((entry) => entry.retired === undefined)?.manifest ?? null;
    if (head !== null) await storedManifest(store, head);
    arms.push({ arm, store, session: sessionDigest, config, binding, link, scores, nativeReport, verification, head,
      account, cost: await accountCost(store, account) });
  }
  const normalized = arms.find((arm) => arm.arm === "optimizer")!.config;
  const raw = arms.find((arm) => arm.arm === "optimizer-raw")!.config;
  const normalizedArm = asObject(normalized.arm, "normalized arm");
  const rawArm = asObject(raw.arm, "raw arm");
  requireMatch(same({ ...normalizedArm, normalizeEmitted: false }, rawArm), `${slug}: optimizer protocols differ beyond normalization`);
  for (const arm of arms.filter((row) => row.arm !== "fixed")) {
    requireMatch(same(asObject(arm.config.arm, "arm").generator, normalizedArm.generator), `${slug}: generators are not matched`);
  }
  const cases = frozenCases(learning, frozenHoldoutTasks(slug));
  const expected: FrozenExpectation = { incumbent, heads: arms.map((arm) => ({ name: arm.arm, manifest: arm.head })), cases,
    policy: FROZEN_POLICY, budget: ARM_BUDGET, environment: `experiment:cumulative-skill-v5:${slug}:synthetic`, labels: FROZEN_LABELS };
  return { status: "qualified" as const, slug, corpusDir, seed, seedStore, seedManifest, seedCost, arms, expected, truthSnapshot: corpusSnapshot(truth) };
}

export function frozenArtifactState(planExists: boolean, resultExists: boolean): "complete" | "interrupted" | "not-started" {
  requireMatch(!resultExists || planExists, "frozen result has no pre-execution plan");
  return resultExists ? "complete" : planExists ? "interrupted" : "not-started";
}

export function defaultExecutor(inner: Executor): Executor {
  return { ...inner, id: "default", ...(inner.receiptFor !== undefined ? { receiptFor: inner.receiptFor.bind(inner) } : {}) };
}

async function executor(flags: Map<string, string>): Promise<Executor> {
  const routes = [flags.has("--responses"), flags.has("--executor-cmd"), flags.has("--base-url") || flags.has("--model")].filter(Boolean).length;
  requireMatch(routes === 1, "--eval-heads requires exactly one executor route");
  if (flags.has("--responses")) return scriptedExecutor(readJson(resolve(flags.get("--responses")!)));
  if (flags.has("--executor-cmd")) return commandExecutor(flags.get("--executor-cmd")!, {});
  requireMatch(flags.has("--base-url") && flags.has("--model"), "executor requires base URL and model");
  const { openAICompatibleExecutor } = await import("../../../../src/openai-compatible");
  return defaultExecutor(openAICompatibleExecutor({ baseUrl: flags.get("--base-url")!, model: flags.get("--model")!,
    ...(flags.has("--credential-env") ? { credentialEnv: flags.get("--credential-env")! } : {}) }));
}

async function main(): Promise<void> {
  const flags = new Map<string, string>();
  const allowed = new Set(["--responses", "--executor-cmd", "--base-url", "--model", "--credential-env", "--route", "--runtime"]);
  const executorFlags = new Set(["--responses", "--executor-cmd", "--base-url", "--model", "--credential-env"]);
  const routeArguments: string[] = [];
  const positionals: string[] = [];
  const argv = process.argv.slice(2);
  let evaluate = false;
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i]!;
    if (argument === "--eval-heads") { requireMatch(!evaluate, "repeated --eval-heads"); evaluate = true; continue; }
    if (!argument.startsWith("--")) { positionals.push(argument); continue; }
    requireMatch(allowed.has(argument) && !flags.has(argument), `unknown or repeated flag ${argument}`);
    const value = argv[++i];
    requireMatch(value !== undefined && !value.startsWith("--"), `flag ${argument} needs a value`);
    flags.set(argument, value);
    if (executorFlags.has(argument)) routeArguments.push(argument, value);
  }
  requireMatch(positionals.length === 1, "usage: evidence.ts <resultsRoot> [--eval-heads <executor flags>]");
  const resultsRoot = resolve(positionals[0]!);
  const executionBytes = bytes(join(resultsRoot, "execution.json"));
  const execution = readJson(join(resultsRoot, "execution.json"));
  noUnknownKeys(execution, ["contract", "executorArgumentsDigest", "executor", "runtimeSourcesDigest", "bunVersion"], "study execution");
  requireMatch(execution.contract === "algal.study-execution.v1", "missing study executor/runtime identity");
  asDigest(execution.executorArgumentsDigest, "executor arguments digest");
  asDigest(execution.runtimeSourcesDigest, "runtime sources digest");
  requireMatch(typeof execution.bunVersion === "string" && execution.bunVersion.length > 0 && execution.bunVersion.length <= 128, "missing bounded Bun runtime version");
  const publicExecutor = asObject(execution.executor, "study executor");
  noUnknownKeys(publicExecutor, ["baseUrl", "model", "credentialEnv"], "study executor");
  if (evaluate) {
    requireMatch(execution.executorArgumentsDigest === executorArgumentsDigest(routeArguments), "frozen executor arguments differ from the recorded study route");
    requireMatch(bytes(join(resultsRoot, "frozen-evaluation.attempt", "execution.json")).equals(executionBytes), "frozen evaluation is not bound to this study execution");
  }
  // Finish every offline integrity check before the first paid frozen run.
  const corpora = [];
  for (const slug of STUDY_SLUGS) corpora.push(await preflightCorpus(resultsRoot, slug, executionBytes));
  const evidenceStore = new FileStore(join(resultsRoot, "evidence-store"));
  const recordsDir = join(resultsRoot, "records");
  mkdirSync(recordsDir, { recursive: true });
  const executionDigest = await evidenceStore.putValue(execution);
  const index: JsonObject = { contract: "algal.study-index.v1", study: "cumulative-skill-v5-matched", execution: executionDigest,
    routeLabel: flags.get("--route") ?? null, runtimeLabel: flags.get("--runtime") ?? null,
    scope: "synthetic record-triage, three corpus seeds, no production activation", corpora: {}, recordAddresses: {},
    limitations: ["Native frozen evidence has routeDigest=null; this study index and frozen input bind its recorded executor/runtime separately.",
      "Native comparison decisions and the complete-cohort study verdict have different scopes; both are retained unmodified.",
      "Attempt files bind recorded inputs and sessions, not host attestation or provider billing."] };
  const addresses = index.recordAddresses as JsonObject;
  const cohorts: Cohort[] = [];
  const incompleteFrozenCosts: string[] = [];
  let realized = zeroCost();
  for (const corpus of corpora) {
    const { slug } = corpus;
    const corpusIndex: JsonObject = { corpusSnapshot: await evidenceStore.putValue(corpus.truthSnapshot),
      seed: { summary: await evidenceStore.putValue(corpus.seed), cost: json(corpus.seedCost), store: `stores/${slug}/seed` }, learning: {} };
    (index.corpora as JsonObject)[slug] = corpusIndex;
    if (corpus.status === "seed-failed") {
      realized = addCosts(realized, corpus.seedCost);
      corpusIndex.status = "seed-failed";
      corpusIndex.studyVerdict = { status: "insufficient", reasons: [`shared seed did not qualify: ${corpus.seed.termination}`], winner: null };
      continue;
    }
    const { expected } = corpus;
    const frozenStore = new FileStore(join(resultsRoot, "stores", slug, "frozen"));
    for (const arm of corpus.arms) {
      requireMatch(corpusIndex.corpusSnapshot === arm.scores.corpusDigest, `${slug}: corpus snapshot CAS mismatch`);
      const binding = { contract: "algal.study-arm-binding.v1", arm: arm.arm, session: arm.session,
        config: await evidenceStore.putValue(arm.config), attempt: await evidenceStore.putValue(arm.binding),
        sessionLink: await evidenceStore.putValue(arm.link), execution: executionDigest,
        corpusDigest: arm.scores.corpusDigest, nativeReport: await putSignedRecord(evidenceStore, arm.nativeReport),
        scores: await evidenceStore.putValue(json(arm.scores)), store: `stores/${slug}/${arm.arm}` };
      (corpusIndex.learning as JsonObject)[arm.arm] = { binding: await evidenceStore.putValue(json(binding)), head: arm.head,
        cost: json(arm.cost), groups: json(arm.scores.groups), sessionOutcome: arm.scores.provenance.sessionOutcome };
    }
    const policy = expected.policy;
    const plan = { contract: "algal.study-frozen-input.v1", slug, execution: executionDigest, ...expected,
      learning: corpusIndex.learning, policy: await evidenceStore.putValue(policy) };
    const planDigest = digestCanonical(json(plan));
    const planPath = join(corpus.corpusDir, "frozen-input.json");
    const resultPath = join(corpus.corpusDir, "frozen-result.json");
    const artifactState = frozenArtifactState(existsSync(planPath), existsSync(resultPath));
    let result: ImproveResult | null = null;
    if (evaluate) {
      requireMatch(!existsSync(planPath) && !existsSync(resultPath), `${slug}: frozen evaluation already started; inspect its retained attempt`);
      writeFileSync(planPath, canonicalize(json(plan)) + "\n", { flag: "wx" });
      await frozenStore.putManifest(corpus.seedManifest);
      const arms = [];
      for (const arm of corpus.arms.filter((row) => row.arm !== "fixed" && row.head !== null)) {
        const manifest = await storedManifest(arm.store, arm.head!);
        await frozenStore.putManifest(manifest);
        arms.push({ kind: "fixed" as const, name: arm.arm, candidates: [manifest] });
      }
      const native = await runImprovement({ incumbent: corpus.seedManifest, arms, cases: expected.cases,
        labels: plan.labels, fns: builtinRegistry(), store: frozenStore, executors: [await executor(flags)],
        scorer: SCORER as never, budget: expected.budget, policy,
        environment: expected.environment,
        rollout: { mode: "shadow", sampleLimit: 0, trafficLimit: 0, expiresAfter: null } });
      // Preserve the unmodified native result before any derived export can fail.
      writeJson(resultPath, native);
      result = await verifyFrozenResult(native, expected, frozenStore);
    } else if (existsSync(resultPath)) {
      requireMatch(same(readJson(planPath), plan), `${slug}: frozen input no longer matches learning records`);
      result = await verifyFrozenResult(readJson(resultPath), expected, frozenStore);
    }
    realized = addCosts(realized, corpus.seedCost, ...corpus.arms.map((arm) => arm.cost));
    if (result === null) {
      corpusIndex.status = artifactState === "interrupted" ? "frozen-evaluation-interrupted" : "awaiting-frozen-evaluation";
      if (artifactState === "interrupted") {
        incompleteFrozenCosts.push(slug);
        corpusIndex.studyVerdict = { status: "insufficient", winner: null,
          reasons: ["frozen evaluation started without a complete result; unknown outstanding cost, no automatic retry"] };
      }
      continue;
    }
    for (const arm of result.report.arms) if (arm.budget !== undefined) await verifyObservedRoute(frozenStore, arm.budget.runs, executionBytes);
    requireMatch(await evidenceStore.putValue(json(plan)) === planDigest, "frozen plan CAS mismatch");
    const reportAddress = await putSignedRecord(evidenceStore, result.report);
    addresses[result.report.digest] = json(reportAddress);
    for (const record of [...result.evidence, ...result.decisions]) {
      const address = await putSignedRecord(evidenceStore, record);
      addresses[record.digest] = json(address);
      writeJson(join(recordsDir, `${slug}.${record.digest.slice(7)}.json`), record);
    }
    await evidenceStore.putValue(json(expected.cases));
    await evidenceStore.putValue(json(SCORER));
    await evidenceStore.putValue({ name: "algal", version: RUNTIME_VERSION });
    await evidenceStore.putValue(json(corpus.seedManifest.interface ?? null));
    await evidenceStore.putManifest(corpus.seedManifest);
    for (const arm of corpus.arms) if (arm.head !== null) await evidenceStore.putManifest(await storedManifest(arm.store, arm.head));
    const cohort: Cohort = { corpus: slug, arms: [] };
    const reasons: string[] = [];
    const frozenArms: JsonObject = {};
    for (const arm of corpus.arms) {
      const native = result.report.arms.find((row) => row.name === (arm.arm === "fixed" ? "incumbent" : arm.arm));
      const evalCost = native?.budget === undefined ? zeroCost() : await accountCost(frozenStore, parseHabitatBudget(native.budget));
      const cost = addCosts(corpus.seedCost, arm.cost, evalCost);
      realized = addCosts(realized, evalCost);
      const planned = expected.cases.filter((task) => task.split === "holdout").length;
      const observed = native?.holdout.length ?? 0;
      const passed = native?.holdout.filter((row) => row.passed).length ?? 0;
      const complete = observed === planned && native?.failure === null && !native.exhausted && arm.scores.provenance.sessionOutcome === "complete";
      if (!complete) reasons.push(`${arm.arm}: incomplete learning or frozen evaluation`);
      cohort.arms.push({ arm: arm.arm, passed, planned, observed, complete, cost });
      frozenArms[arm.arm] = { head: arm.head, evidence: native?.evidence ?? null, decision: native?.decision ?? null,
        passed, planned, observed, score: passed / planned, complete,
        costs: { seed: json(corpus.seedCost), learning: json(arm.cost), frozenEvaluation: json(evalCost), total: json(cost) },
        workPerPassedHoldout: passed === 0 ? null : cost.workUnits / passed,
        callsPerPassedHoldout: passed === 0 ? null : cost.modelCalls / passed };
    }
    cohorts.push(cohort);
    corpusIndex.frozen = { plan: planDigest, report: json(reportAddress), store: `stores/${slug}/frozen`,
      incumbentEvidence: result.report.arms[0]!.evidence, nativeComparison: result.report.comparison,
      nativeWinner: result.report.winner, arms: frozenArms };
    corpusIndex.studyVerdict = { status: reasons.length > 0 ? "insufficient" : result.report.comparison,
      reasons: [...reasons, ...result.report.insufficientReasons], winner: reasons.length > 0 ? null : result.report.winner };
  }
  index.summary = json({ ...pairedSummary(cohorts), realizedCost: incompleteFrozenCosts.length > 0 ? null : realized,
    knownAccountedCost: realized, incompleteFrozenCosts,
    frozenCorpora: cohorts.length, plannedCorpora: STUDY_SLUGS.length,
    seedFailures: corpora.filter((corpus) => corpus.status === "seed-failed").map((corpus) => corpus.slug),
    complete: cohorts.length === STUDY_SLUGS.length && cohorts.every((cohort) => cohort.arms.every((arm) => arm.complete)) });
  writeJson(join(recordsDir, "index.json"), index);
  const indexDigest = await evidenceStore.putValue(index);
  console.log(JSON.stringify({ index: indexDigest, path: join(recordsDir, "index.json"), summary: index.summary }, null, 1));
}

if (import.meta.main) await main();
