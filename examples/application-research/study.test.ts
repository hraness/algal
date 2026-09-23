import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applicationJson, applicationObject } from "../../src/application-contract";
import type { MemoryQueryEngine } from "../../src/application-memory";
import type { Executor } from "../../src/effects";
import { FileStore } from "../../src/store";
import { createBudgetedExecutor } from "../coding-harness/inference-budget";
import { ROUTE_CASES } from "./corpus";
import fixtures from "./query-fixtures.json";
import { answerInput, exactAnswer, hash, makePlan, prepareStudy, readPlan, runStudy, verifyStudy } from "./study";

const roots: string[] = [];
const EXECUTOR_CONFIGURATION = hash("fixture:route-executor-configuration");
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const engine: MemoryQueryEngine = {
  identity: hash({ fixture: "captured-native-query-results", corpus: fixtures }),
  async query(snapshot, program) {
    const row = fixtures.rows.find(row => hash(row.snapshot) === hash(snapshot) && hash(row.program) === hash(program));
    if (!row) throw new Error("No fixture for this exact query");
    return { kind: "complete", result: applicationJson(row.result) };
  },
  async verify(snapshot, program, result) { return fixtures.rows.some(row => hash(row.snapshot) === hash(snapshot) && hash(row.program) === hash(program) && hash(row.result) === hash(result)); },
  async settle() {},
};
async function fixture(options: { perfect?: boolean; regress?: boolean; decline?: boolean; fail?: boolean; failProposal?: boolean; liveLedger?: boolean; badLedger?: boolean; badUsageTotals?: boolean; badUsageToken?: boolean } = {}) {
  const parent = await mkdtemp(join(tmpdir(), "algal-route-study-")); roots.push(parent);
  const root = join(parent, "run");
  const contexts: unknown[] = [];
  const executor: Executor = { id: "fixture:routes", cacheIdentity: EXECUTOR_CONFIGURATION, receiptFor: () => ({ configurationDigest: EXECUTOR_CONFIGURATION }), async execute(request) {
    contexts.push(request.context);
    const inputs = applicationObject(request.context.inputs, ["data"]);
    const data = applicationObject(inputs.data, Object.keys(inputs.data as object));
    if (request.prompt.startsWith("Propose")) {
      if (options.failProposal) throw new Error("Fixture proposal completion unavailable");
      expect(JSON.stringify(data)).not.toContain("holdout");
      expect(Array.isArray(data.development) && data.development.length).toBe(4);
      return { mode: options.decline ? "structured-facts" : "derived-answers", rationale: "Fixture selects the derived context; no model quality evidence." };
    }
    const row = ROUTE_CASES.find(row => row.id === data.id)!;
    const candidate = "derivedAnswers" in data;
    if (options.fail && row.id === "dev-chain" && candidate) throw new Error("Fixture uncertain completion");
    if (options.regress && candidate && row.id === "holdout-loop") return [];
    if (!options.perfect && !candidate && row.id === "dev-cycle") return ["a", "b", "c"];
    return row.expected;
  } };
  executor.executeEffect = async request => ({ output: await executor.execute(request), metadata: { usage: { tokensIn: 10, tokensOut: 5 } } });
  const backend = options.liveLedger ? await createBudgetedExecutor({ executor, ledgerPath: join(parent, "ledger"), budget: { maxCalls: 17, maxCostMicrousd: 17, reserveMicrousdPerCall: 1 }, maxRequestBytes: 16384, maxOutputBytes: 2048 }) : null;
  // "live" exercises the production accounting verifier against a local mock;
  // this temp evidence is never retained or offered as live quality evidence.
  await prepareStudy(root, makePlan({ provenance: backend ? "live" : "fixture", model: "fixture/synthetic", engine: engine.identity, executorConfiguration: backend ? hashConfig(backend.accounting.configurationDigest) : EXECUTOR_CONFIGURATION, maxCostMicrousd: 17, reserveMicrousdPerCall: 1 }));
  const summary = await runStudy(root, { executor: backend?.executor ?? executor, engine, accounting: async () => {
    if (!backend) return { fixture: true, reservedMicrousd: contexts.length };
    await backend.settle();
    if (options.badUsageTotals) return applicationJson({ ...backend.accounting, inputTokens: 0 });
    if (options.badUsageToken) return applicationJson({ ...backend.accounting, records: backend.accounting.records.map((record, index) => index === 0 ? { ...record, tokensIn: -1 } : record) });
    return applicationJson(options.badLedger ? { ...backend.accounting, reservedMicrousd: 0 } : backend.accounting);
  } });
  return { root, summary, contexts, executor };
}
function hashConfig(value: string) { if (!/^sha256:[a-f0-9]{64}$/.test(value)) throw new Error("Invalid test config"); return value as ReturnType<typeof hash>; }

describe("controlled application research (fixtures, not model quality evidence)", () => {
  test("freezes a development-only model proposal, scores paired receipts, activates and replays without models", async () => {
    const f = await fixture();
    expect(f.contexts).toHaveLength(17);
    expect(f.summary.quality).toEqual({ incumbent: 7, candidate: 8, cases: 8 });
    expect(f.summary.activated).toBe(true);
    expect(f.summary.verdict).toBe("accepted");
    expect(await verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator })).toEqual(f.summary);
    await expect(runStudy(f.root, { executor: f.executor, engine, accounting: async () => null })).rejects.toThrow();
    expect(f.contexts).toHaveLength(17);
  });

  test("a ceiling tie is an honest negative result, with no activation", async () => {
    const f = await fixture({ perfect: true });
    expect(f.summary.verdict).toBe("rejected");
    expect(f.summary.reasons).toEqual(["no-strict-development-improvement"]);
    expect(f.summary.activated).toBe(false);
    expect(f.summary.finalState).toBe(f.summary.parentState);
    await verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator });
  });

  test("per-case holdout regression and uncertain calls reject despite development gains", async () => {
    const regressed = await fixture({ regress: true });
    expect(regressed.summary.reasons).toContain("case-regression");
    expect(regressed.summary.reasons).toContain("holdout-failure");
    const failed = await fixture({ fail: true });
    expect(failed.summary.reasons).toContain("uncertain-attempt");
    expect(failed.contexts).toHaveLength(3);
    expect(failed.summary.pendingAnswers).toBe(14);
    expect(failed.summary.activated).toBe(false);
    await verifyStudy(failed.root, { engine, trustedEvaluator: failed.summary.evaluator });
  });

  test("declined proposals are retained, cannot activate, and do not alter the fixed ablation", async () => {
    const f = await fixture({ decline: true });
    expect(f.summary.proposalMode).toBe("structured-facts");
    expect(f.summary.verdict).toBe("proposal-not-admitted");
    expect(f.contexts).toHaveLength(17);
    await verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator });
  });

  test("same-source ablation changes only the derived answer field", () => {
    for (const [index, row] of ROUTE_CASES.entries()) {
      const left = answerInput(row, "incumbent", applicationJson(fixtures.rows[index]!.result));
      const right = answerInput(row, "candidate", applicationJson(fixtures.rows[index]!.result)) as Record<string, unknown>;
      const { derivedAnswers, ...rest } = right;
      expect(applicationJson(rest)).toEqual(left);
      expect(derivedAnswers).toEqual(row.expected);
    }
    expect(exactAnswer(["b", "a"], ["a", "b"])).toBe(false);
    expect(exactAnswer(["a", "a"], ["a"])).toBe(false);
  });

  test("forged summaries, untrusted evaluators and reordered durable attempts fail offline verification", async () => {
    const f = await fixture();
    await expect(verifyStudy(f.root, { engine, trustedEvaluator: hash("foreign-evaluator") })).rejects.toThrow("trusted run");
    const path = join(f.root, "result.json"), original = await readFile(path, "utf8");
    await writeFile(path, JSON.stringify({ ...f.summary, quality: { incumbent: 0, candidate: 8, cases: 8 } }));
    await expect(verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator })).rejects.toThrow("seal");
    await writeFile(path, original);
    const journalPath = join(f.root, "attempts.json"), events = JSON.parse(await readFile(journalPath, "utf8"));
    [events[1], events[2]] = [events[2], events[1]];
    await writeFile(journalPath, JSON.stringify(events));
    await expect(verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator })).rejects.toThrow("Durable attempt log");
  });

  test("retains proposal, query and answer receipts plus all costs in content-addressed evidence", async () => {
    const f = await fixture(), store = new FileStore(join(f.root, "application"));
    const journal = applicationObject(await store.getValue(f.summary.journal), ["contract", "plan", "proposal", "freeze", "queries", "answers", "events", "accounting"]);
    expect(journal.answers).toHaveLength(16);
    expect(journal.queries).toHaveLength(8);
    const accounting = await store.getValue(f.summary.accounting) as { meter: { calls: number; missingUsage: number }; costMeaning: string };
    expect(accounting.meter.calls).toBe(17);
    expect(accounting.meter.missingUsage).toBe(0);
    expect(accounting.costMeaning).toBe("reservation-ceiling-not-settled-provider-charge");
  });

  test("production ledger verification binds each reserved dispatch and stops after uncertainty (mock only)", async () => {
    const f = await fixture({ liveLedger: true });
    await verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator });
    const stopped = await fixture({ liveLedger: true, fail: true });
    expect(stopped.contexts).toHaveLength(3);
    expect(stopped.summary.pendingAnswers).toBe(14);
    await verifyStudy(stopped.root, { engine, trustedEvaluator: stopped.summary.evaluator });
    await expect(fixture({ liveLedger: true, badLedger: true })).rejects.toThrow("Ledger aggregate");
  });

  test("production ledger token totals and individual numeric counts cannot be rewritten (mock only)", async () => {
    await expect(fixture({ liveLedger: true, badUsageTotals: true })).rejects.toThrow("Ledger aggregate token usage");
    await expect(fixture({ liveLedger: true, fail: true, badUsageTotals: true })).rejects.toThrow("Ledger aggregate token usage");
    await expect(fixture({ liveLedger: true, badUsageToken: true })).rejects.toThrow("Invalid ledger token count");
  });

  test("declined and failed proposals have independently authenticated final results", async () => {
    for (const options of [{ decline: true }, { failProposal: true }]) {
      const f = await fixture(options);
      await verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator });
      expect(f.summary.evaluation).toBeNull();
      await writeFile(join(f.root, "result.json"), JSON.stringify({ ...f.summary, reasons: ["forged"] }));
      await expect(verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator })).rejects.toThrow("seal");
    }
  });

  test("frozen configuration drift and oversized or extended foreign records fail closed", async () => {
    const f = await fixture();
    await expect(runStudy(f.root, { executor: { ...f.executor, cacheIdentity: hash("changed-config") }, engine, accounting: async () => null })).rejects.toThrow("Executor differs");
    const plan = await readPlan(f.root);
    await writeFile(join(f.root, "plan.json"), JSON.stringify({ ...plan, unknown: true }));
    await expect(readPlan(f.root)).rejects.toThrow();
    await writeFile(join(f.root, "plan.json"), JSON.stringify(plan));
    await writeFile(join(f.root, "result.json"), JSON.stringify({ ...f.summary, unknown: true }));
    await expect(verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator })).rejects.toThrow();
    await writeFile(join(f.root, "result.json"), " ".repeat(16385));
    await expect(verifyStudy(f.root, { engine, trustedEvaluator: f.summary.evaluator })).rejects.toThrow("byte bound");
  });
});
