import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical } from "../../../../src/digest";
import { scriptedExecutor } from "../../../../src/effects";
import { buildExperimentReport, parseSkillExperimentConfig } from "../../../../src/experiment-report";
import { parseExperimentArm, parseExperimentCatalog, parseExperimentTaskSet, runExperimentArm } from "../../../../src/experiment-run";
import { HabitatAccount } from "../../../../src/habitat-budget";
import { buildEvaluationEvidence, buildPromotionDecision } from "../../../../src/host-contract";
import { runImprovement, type ImproveCase } from "../../../../src/improve";
import { builtinRegistry } from "../../../../src/registry";
import { runOrganism } from "../../../../src/run";
import { FileStore, MemoryStore } from "../../../../src/store";
import { asObject } from "../../../../src/values";
import { buildStudyConfigs } from "./build";
import { defaultExecutor, executorArgumentsDigest, frozenArtifactState, preflightCorpus, verifyAttemptBinding, verifyObservedRoute } from "./evidence";
import { accountCost, ARMS, frozenCases, FROZEN_POLICY, json, pairedSummary, putSignedRecord, verifyFrozenResult, zeroCost, type Cohort, type FrozenExpectation } from "./evidence-support";
import { corpusTruth, gradeStudy } from "./grade";
import { generateStudySeed } from "./seed";
import { ARM_BUDGET, corpusTasks, frozenHoldoutTasks, learningTasks, SCORER, STUDY_ROOT } from "./shared";

const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
const output = (label = "billing") => ({ results: [{ recordId: "r1", label, decision: "accept" }], summary: { billing: 1 } });
const candidate = (key: string, label = "billing") => parseOrganismManifest({
  contract: "algal.organism.v1", key: `organism:${key}`, name: key,
  interface: { inputs: { q: { cell: "in", port: "value" } }, outputs: { out: { cell: "out", port: "value" } } },
  cells: [{ id: "in", kind: "input", outputs: { value: "json" } },
    { id: "out", kind: "const", outputs: { value: { type: "json", value: output(label) } } }], edges: [],
});
const cases: ImproveCase[] = ["train", "validation", ...Array.from({ length: 8 }, () => "holdout")].map((split, index) => ({
  id: `case-${index}`, group: `group-${index}`, split: split as ImproveCase["split"], args: { q: index }, expect: { out: output() },
}));
async function frozenFixture(tie = false, runs = 32) {
  const store = new MemoryStore();
  const incumbent = candidate("baseline", tie ? "billing" : "wrong");
  const improved = candidate("improved");
  const degraded = candidate("degraded", "wrong");
  const expected: FrozenExpectation = {
    incumbent: await store.putManifest(incumbent), cases, policy: FROZEN_POLICY, budget: { ...ARM_BUDGET, runs }, environment: "experiment:test:synthetic",
    labels: { independent: true, provenance: "synthetic fixture", redactionPolicy: "synthetic only" },
    heads: [{ name: "fixed", manifest: await store.putManifest(incumbent) }, { name: "retained", manifest: await store.putManifest(incumbent) },
      { name: "optimizer", manifest: await store.putManifest(improved) }, { name: "optimizer-raw", manifest: await store.putManifest(degraded) }],
  };
  const result = await runImprovement({ incumbent,
    arms: [{ kind: "fixed", name: "retained", candidates: [incumbent] }, { kind: "fixed", name: "optimizer", candidates: [improved] },
      { kind: "fixed", name: "optimizer-raw", candidates: [degraded] }],
    cases, labels: expected.labels,
    scorer: SCORER as never, budget: expected.budget, policy: expected.policy, environment: expected.environment,
    fns: builtinRegistry(), store, executors: [],
  });
  return { store, result, expected };
}
function resignReport(result: Awaited<ReturnType<typeof frozenFixture>>["result"]) {
  const { digest: _digest, ...body } = result.report;
  result.report.digest = digestCanonical(json(body));
}

describe("v5 frozen evidence", () => {
  test("decisions cite exactly the frozen candidate and baseline, with resolvable self-digest/CAS mapping", async () => {
    const f = await frozenFixture();
    await verifyFrozenResult(f.result, f.expected, f.store);
    expect(f.result.report.winner).toBe("optimizer");
    const decision = f.result.decisions.find((record) => record.reviewer.status === "approved")!;
    const evidence = f.result.evidence.find((record) => record.digest === decision.evidence)!;
    expect(evidence.candidateArtifact).toBe(decision.candidate);
    expect(evidence.outcomes.holdout.total).toBe(8);
    expect(decision.observedMetrics.incumbentHoldoutScore).toBe(0);
    const address = await putSignedRecord(f.store, evidence);
    expect(address.valueDigest).not.toBe(address.recordDigest);
    expect(await f.store.getValue(address.valueDigest)).toEqual(json(evidence));
    expect(await f.store.getValue(address.recordDigest)).toBeUndefined();
    expect(decision.rollout).toEqual({ mode: "shadow", sampleLimit: 0, trafficLimit: 0, expiresAfter: null });
  });

  test("ties and degradation never approve, and exhausted evaluations stay insufficient", async () => {
    const tied = await frozenFixture(true);
    await verifyFrozenResult(tied.result, tied.expected, tied.store);
    expect(tied.result.report.comparison).toBe("insufficient");
    expect(tied.result.decisions.every((record) => record.reviewer.status === "rejected")).toBe(true);
    const exhausted = await frozenFixture(false, 1);
    await verifyFrozenResult(exhausted.result, exhausted.expected, exhausted.store);
    expect(exhausted.result.report.comparison).toBe("insufficient");
    expect(exhausted.result.report.arms.every((arm) => arm.exhausted && arm.holdout.length === 0)).toBe(true);
  });

  test("rejects candidate, split, omission, accounting, policy, and evaluator substitutions", async () => {
    const f = await frozenFixture();
    const omitted = structuredClone(f.result);
    omitted.report.arms[2]!.holdout.pop(); resignReport(omitted);
    await expect(verifyFrozenResult(omitted, f.expected, f.store)).rejects.toThrow("coverage");
    const swapped = structuredClone(f.result);
    const arm = swapped.report.arms[2]!;
    [arm.candidates[0]!.cases[0], arm.holdout[0]] = [arm.holdout[0]!, arm.candidates[0]!.cases[0]!]; resignReport(swapped);
    await expect(verifyFrozenResult(swapped, f.expected, f.store)).rejects.toThrow("split/order");
    const wrongHead = structuredClone(f.expected); wrongHead.heads[2]!.manifest = wrongHead.incumbent;
    await expect(verifyFrozenResult(f.result, wrongHead, f.store)).rejects.toThrow("frozen singleton");
    const changedAccount = structuredClone(f.result);
    const account = changedAccount.report.arms[2]!.budget!;
    account.runs[1]!.receipt = account.runs[0]!.receipt; resignReport(changedAccount);
    await expect(verifyFrozenResult(changedAccount, f.expected, f.store)).rejects.toThrow("order or multiplicity");
    const changedBudget = structuredClone(f.expected); changedBudget.budget.runs++;
    await expect(verifyFrozenResult(f.result, changedBudget, f.store)).rejects.toThrow("budget protocol");
    const altered = structuredClone(f.result);
    const original = altered.evidence.find((record) => record.digest === altered.report.arms[2]!.evidence)!;
    const { digest: _evidenceDigest, ...evidenceBody } = original;
    const changed = buildEvaluationEvidence({ ...evidenceBody, evaluator: { ...original.evaluator, scorerDigest: digestCanonical({ fake: true }) } });
    altered.evidence[altered.evidence.indexOf(original)] = changed;
    altered.report.arms[2]!.evidence = changed.digest; resignReport(altered);
    await expect(verifyFrozenResult(altered, f.expected, f.store)).rejects.toThrow("evaluator");
    const changedUsage = structuredClone(f.result);
    const charged = buildEvaluationEvidence({ ...evidenceBody, usage: { ...evidenceBody.usage, tokensIn: 123 } });
    changedUsage.evidence[changedUsage.evidence.findIndex((record) => record.digest === original.digest)] = charged;
    changedUsage.report.arms[2]!.evidence = charged.digest; resignReport(changedUsage);
    await expect(verifyFrozenResult(changedUsage, f.expected, f.store)).rejects.toThrow("accounting");
    const changedPolicy = structuredClone(f.result);
    const decision = changedPolicy.decisions.find((record) => record.reviewer.status === "approved")!;
    const { digest: _decisionDigest, ...decisionBody } = decision;
    const replacement = buildPromotionDecision({ ...decisionBody, policy: digestCanonical({ fake: true }) });
    changedPolicy.decisions[changedPolicy.decisions.indexOf(decision)] = replacement;
    changedPolicy.report.arms[2]!.decision = replacement.digest; resignReport(changedPolicy);
    await expect(verifyFrozenResult(changedPolicy, f.expected, f.store)).rejects.toThrow("policy");
    const deletedDecision = structuredClone(f.result);
    deletedDecision.decisions = deletedDecision.decisions.filter((record) => record.digest !== deletedDecision.report.arms[2]!.decision);
    deletedDecision.report.arms[2]!.decision = null; resignReport(deletedDecision);
    await expect(verifyFrozenResult(deletedDecision, f.expected, f.store)).rejects.toThrow("decision presence");
    for (const body of [
      { ...evidenceBody, independentReview: { status: "reviewed" as const, reviewer: "invented-reviewer", notes: null } },
      { ...evidenceBody, charges: { ...evidenceBody.charges, unit: "USD" } },
    ]) {
      const corrupt = structuredClone(f.result);
      const record = buildEvaluationEvidence(body);
      corrupt.evidence[corrupt.evidence.findIndex((row) => row.digest === original.digest)] = record;
      corrupt.report.arms[2]!.evidence = record.digest; resignReport(corrupt);
      await expect(verifyFrozenResult(corrupt, f.expected, f.store)).rejects.toThrow("native review");
    }
  });

  test("uses fresh ancestry groups and refuses relabeled learned shift tasks", () => {
    const learning = learningTasks(join(STUDY_ROOT, "tasks/v4"));
    const fresh = frozenCases(learning, frozenHoldoutTasks("v4"));
    expect(fresh.map((row) => row.split)).toEqual(["train", "validation", ...Array(8).fill("holdout")]);
    expect(new Set(fresh.map((row) => row.group)).size).toBe(10);
    const learnedShift = corpusTasks(join(STUDY_ROOT, "tasks/v4")).filter((task) => task.phase === "shift");
    expect(() => frozenCases(learning, learnedShift)).toThrow("learning ancestry");
  });

  test("provider default wrapper resolves the same explicit route as the CLI", async () => {
    const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:default-route", name: "Route fixture",
      interface: { inputs: {}, outputs: { out: { cell: "answer", port: "out" } } },
      cells: [{ id: "answer", kind: "agent", prompt: "fixture", route: { provider: "default" }, output: { kind: "json", schema: { type: "object" } } }], edges: [] });
    const { routeWildcard: _wildcard, ...inner } = scriptedExecutor({ answer: output() });
    const result = await runOrganism({ manifest, fns: builtinRegistry(), store: new MemoryStore(), executors: [defaultExecutor({ ...inner, id: "openai:fixture" })] });
    expect(result.outcome).toBe("complete");
    expect(result.effects[0]!.executor).toBe("default");
  });

  test("preserves local unbound-route failures while rejecting an unrecorded executor", async () => {
    const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:unbound-route", name: "Unbound fixture",
      interface: { inputs: {}, outputs: { out: { cell: "answer", port: "out" } } },
      cells: [{ id: "answer", kind: "agent", prompt: "fixture", route: { provider: "missing" }, output: { kind: "json", schema: { type: "object" } } }], edges: [] });
    const store = new MemoryStore();
    const digest = await store.putManifest(manifest);
    const account = new HabitatAccount("foundry", ARM_BUDGET);
    const failed = await account.admit({ manifest: digest, budgets: manifest.budgets, args: {} },
      () => runOrganism({ manifest, fns: builtinRegistry(), store, executors: [] }), store);
    expect(failed.receipt.effects[0]!.executor).toBe("unbound");
    const execution = encode({ executor: { baseUrl: "https://example.invalid/v1", model: "fixture" } });
    await verifyObservedRoute(store, account.record().runs, execution);
    const foreign = new HabitatAccount("foundry", ARM_BUDGET);
    await foreign.admit({ manifest: digest, budgets: manifest.budgets, args: {} },
      () => runOrganism({ manifest, fns: builtinRegistry(), store, executors: [{ id: "missing", execute: async () => ({}) }] }), store);
    await expect(verifyObservedRoute(store, foreign.record().runs, execution)).rejects.toThrow("configuration differs");
  });
});

describe("v5 accounting and paired cohorts", () => {
  test("counts repeated admissions even when receipts are identical", async () => {
    const store = new MemoryStore();
    const manifest = candidate("same");
    const digest = await store.putManifest(manifest);
    const account = new HabitatAccount("foundry", ARM_BUDGET);
    for (let i = 0; i < 2; i++) await account.admit({ manifest: digest, budgets: manifest.budgets, args: { in: { value: 1 } } },
      () => runOrganism({ manifest, args: { in: { value: 1 } }, fns: builtinRegistry(), store, executors: [] }), store);
    const budget = account.record();
    expect(budget.runs[0]!.receipt).toBe(budget.runs[1]!.receipt);
    const cost = await accountCost(store, budget);
    expect(cost.admittedRuns).toBe(2);
    expect(cost.workUnits).toBe(budget.runs[0]!.charged.work * 2);
  });

  test("preserves zero/negative paired differences and three-cohort requirement", () => {
    const cohorts: Cohort[] = ["v4", "v5-b", "v5-c"].map((corpus, index) => ({ corpus,
      arms: ARMS.map((arm) => ({ arm, passed: arm === "optimizer" ? [3, 4, 5][index]! : 4,
        observed: 8, planned: 8, complete: true, cost: zeroCost() })) }));
    const result = pairedSummary(cohorts);
    expect(result.comparisons.find((row) => row.arm === "retained")!.finding).toBe("no-observed-gain");
    expect(result.comparisons.find((row) => row.arm === "optimizer")!.meanDelta).toBe(0);
    expect(result.comparisons.find((row) => row.arm === "optimizer")!.negative).toBe(1);
    expect(pairedSummary(cohorts.slice(0, 1)).comparisons.every((row) => row.finding === "insufficient")).toBe(true);
    expect(frozenArtifactState(true, false)).toBe("interrupted");
    expect(frozenArtifactState(false, false)).toBe("not-started");
    expect(() => frozenArtifactState(false, true)).toThrow("no pre-execution plan");
  });
});

const encode = (value: unknown) => Buffer.from(JSON.stringify(value, null, 1) + "\n");
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
async function diskFixture(qualified: boolean) {
  const root = mkdtempSync(join(tmpdir(), "algal-v5-evidence-")); temporary.push(root);
  const corpusDir = join(root, "v4");
  const corpus = join(STUDY_ROOT, "tasks/v4");
  const first = learningTasks(corpus)[0]!;
  const executionBytes = encode({ contract: "algal.study-execution.v1", executor: {}, executorArgumentsDigest: digestCanonical([]) });
  mkdirSync(join(corpusDir, "seed.attempt"), { recursive: true });
  writeFileSync(join(corpusDir, "seed.attempt/execution.json"), executionBytes);
  const storeDir = join(root, "stores/v4/seed");
  const store = new FileStore(storeDir);
  const library = asObject(JSON.parse(readFileSync(join(STUDY_ROOT, "pipeline/record-triage.algal.json"), "utf8")), "library");
  const generated = { ...library, key: "organism:evidence-fixture" };
  const labels = (split: "train" | "validation") => Object.fromEntries(first.inputs.find((batch) => batch.split === split)!.expect.out.results.map((row) => [row.recordId, row.label]));
  const seed = await generateStudySeed({ first, corpus, store,
    executors: [scriptedExecutor({ writer: { manifest: generated }, classify: qualified ? [labels("train"), labels("train"), labels("validation")] : {} })] });
  writeFileSync(join(corpusDir, "seed-summary.json"), encode(seed.summary));
  if (!qualified) return { root, corpusDir, executionBytes, seed };
  writeFileSync(join(corpusDir, "seed-catalog.json"), encode(seed.catalog));
  writeFileSync(join(corpusDir, "seed-manifest.json"), encode(manifestToJson(seed.manifest!)));
  const configs = buildStudyConfigs(corpus, seed.catalog, manifestToJson(seed.manifest!), seed.summary);
  const sessions: Record<string, string> = {};
  for (const arm of ARMS) {
    const config = configs[arm]!;
    const attemptDir = join(corpusDir, "attempts", arm);
    mkdirSync(attemptDir, { recursive: true });
    const configBytes = encode(config);
    writeFileSync(join(attemptDir, "config.json"), configBytes);
    writeFileSync(join(corpusDir, `${arm}.config.json`), configBytes);
    writeFileSync(join(attemptDir, "execution.json"), executionBytes);
    writeFileSync(join(attemptDir, "binding.json"), encode({ contract: "algal.study-attempt.v1", arm,
      configBytesSha256: hash(configBytes), executionBytesSha256: hash(executionBytes) }));
    const armStoreDir = join(root, "stores/v4", arm);
    cpSync(storeDir, armStoreDir, { recursive: true });
    const armStore = new FileStore(armStoreDir);
    const result = await runExperimentArm({ arm: parseExperimentArm(config.arm),
      tasks: parseExperimentTaskSet({ contract: "algal.experiment-tasks.v1", tasks: config.tasks }).tasks,
      ...(config.catalog === undefined ? {} : { catalog: parseExperimentCatalog(config.catalog).entries }),
      store: armStore, fns: builtinRegistry(), executors: [scriptedExecutor({ writer: { manifest: generated }, classify: {} })] });
    sessions[arm] = result.sessionDigest;
    writeFileSync(join(attemptDir, "session.json"), encode({ session: result.sessionDigest, outcome: result.session.outcome,
      arm: result.session.arm, tasks: result.session.tasks.length, budget: result.session.budget, catalog: result.session.catalog }));
    writeFileSync(join(corpusDir, `${arm}.scores.json`), encode(await gradeStudy(armStore, corpusTruth(corpus), config, result.sessionDigest)));
    const report = await buildExperimentReport(armStoreDir, parseSkillExperimentConfig({ contract: "algal.skill-experiment.config.v1", study: "cumulative-skill-v5-matched", arms: [{ session: result.sessionDigest }] }));
    writeFileSync(join(corpusDir, `${arm}.report.json`), encode(report));
  }
  writeFileSync(join(corpusDir, "sessions.json"), encode(sessions));
  return { root, corpusDir, executionBytes, seed };
}

describe("v5 archived study preflight", () => {
  test("matches the actual Python writer for ASCII and Unicode argv", () => {
    for (const args of [["--model", "grok"], ["--model", "grok-é-🚀 with spaces"]]) {
      const process = Bun.spawnSync(["python3", "-B", "-c", "import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('study_execution',sys.argv[1])\nm=importlib.util.module_from_spec(s)\ns.loader.exec_module(m)\nprint(m.digest(json.loads(sys.argv[2])))",
        join(import.meta.dir, "execution.py"), JSON.stringify(args)]);
      expect(process.exitCode).toBe(0);
      expect(process.stdout.toString().trim()).toBe(executorArgumentsDigest(args));
    }
  });

  test("preserves completed seed failure and its charges without inventing arm sessions", async () => {
    const f = await diskFixture(false);
    const checked = await preflightCorpus(f.root, "v4", f.executionBytes);
    expect(checked.status).toBe("seed-failed");
    expect(checked.seedCost.modelCalls).toBeGreaterThan(0);
    expect(checked.seedCost.tokensIn).toBeNull();
    writeFileSync(join(f.corpusDir, "seed-summary.json"), encode({ ...f.seed.summary, maxGenerations: 9 }));
    await expect(preflightCorpus(f.root, "v4", f.executionBytes)).rejects.toThrow("protocol budget");
  });

  test("recomputes matched configs and scores, refusing swapped scores and missing qualified arms", async () => {
    const f = await diskFixture(true);
    const checked = await preflightCorpus(f.root, "v4", f.executionBytes);
    expect(checked.status).toBe("qualified");
    if (checked.status !== "qualified") throw new Error("fixture did not qualify");
    const scorePath = join(f.corpusDir, "optimizer-raw.scores.json");
    const original = readFileSync(scorePath);
    writeFileSync(scorePath, readFileSync(join(f.corpusDir, "optimizer.scores.json")));
    await expect(preflightCorpus(f.root, "v4", f.executionBytes)).rejects.toThrow("supplied scores differ");
    writeFileSync(scorePath, original);
    const config = asObject(json(checked.arms.find((row) => row.arm === "optimizer")!.config), "config");
    const configBytes = encode(config);
    const binding = { contract: "algal.study-attempt.v1", arm: "optimizer-raw", configBytesSha256: hash(configBytes), executionBytesSha256: hash(f.executionBytes) };
    expect(() => verifyAttemptBinding("optimizer-raw", configBytes, f.executionBytes, binding, config)).toThrow("normalization");
    const sessions = JSON.parse(readFileSync(join(f.corpusDir, "sessions.json"), "utf8"));
    delete sessions.fixed;
    writeFileSync(join(f.corpusDir, "sessions.json"), encode(sessions));
    await expect(preflightCorpus(f.root, "v4", f.executionBytes)).rejects.toThrow("missing fixed session");
  }, 30_000);
});
