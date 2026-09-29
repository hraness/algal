import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Digest } from "../../../../src/digest";
import type { JsonObject, JsonValue } from "../../../../src/values";
import { zeroCost } from "../v5/evidence-support";
import { hash, startStage, writeNew, type FrozenIdentity } from "./guards";
import { BLOCKS, POOL, POOL_BLOCK_IDS, RECONCILIATION_CONTRACT, seedTask } from "./protocol";
import { closedStage, comparison, inspectSession, offlineSummary, parseReconciliation, poolDecision, retainedSeedSnapshots, searchAccuracy,
  seedQualified, selfClosedSnapshot, type AttemptReading, type PoolRow, type PrimaryRow, type SeedEvidence, type SessionSummary } from "./results";
import { caseDiagnostics, type SeedSummary } from "./seed";

const digest = `sha256:${"a".repeat(64)}` as Digest;
type Termination = SeedSummary["termination"];
/** A closed search: qualified by the build's predicate unless a termination says otherwise. */
function seed(block: string, termination: Termination = "qualified", extra: Partial<SeedSummary> = {}): SeedEvidence {
  const qualified = termination === "qualified";
  const summary = { blockId: block, qualified, termination, duplicateRequests: 0, validation: qualified ? { passed: 1, total: 1 } : null,
    manifest: qualified ? digest : null, catalog: qualified ? digest : null, attempts: [], ...extra } as unknown as SeedSummary;
  return { summary, reconciled: termination === "interrupted", cost: { ...zeroCost(), workUnits: 10 },
    unreferenced: termination === "interrupted" ? { ...zeroCost(), workUnits: 5, admittedRuns: 1, modelCalls: 1 } : zeroCost(), catalog: null, manifest: null };
}
const session = (passed: number, tasks = 8): SessionSummary => ({ session: digest, outcome: "complete", observed: tasks, head: digest,
  cost: { ...zeroCost(), workUnits: 100 * tasks }, counts: { tasks, complete: tasks, labelsCorrect: passed * 12,
    recordsCorrect: passed * 12, recordsTotal: tasks * 12, summariesExact: passed, outputsExact: passed, scorerPassed: passed }, reconciled: false });
const reconciled = (): SessionSummary => ({ session: null, outcome: "interrupted", observed: 0, head: null,
  cost: { ...zeroCost(), workUnits: 50, admittedRuns: 1, modelCalls: 1 }, counts: { tasks: 0, complete: 0, labelsCorrect: 0, recordsCorrect: 0,
    recordsTotal: 0, summariesExact: 0, outputsExact: 0, scorerPassed: 0 }, reconciled: true });
const pool = (terminations: Termination[]): PoolRow[] => terminations.map((termination, i) => ({ block: POOL_BLOCK_IDS[i]!, seed: seed(POOL_BLOCK_IDS[i]!, termination) }));
const primaryRows = (fixed: number[], optimizer: number[], blocks = BLOCKS.slice(0, 6)): PrimaryRow[] => blocks.map((block, i) => ({ block,
  learning: { block: block.id, seed: seed(block.id), arms: Object.fromEntries(ARM_NAMES.map(arm => [arm, session(30, 40)])) },
  frozen: Object.fromEntries(ARM_NAMES.map(arm => [arm, session(arm === "fixed" ? fixed[i]! : arm === "retained" ? fixed[i]! : optimizer[i]!)])),
}));
const ARM_NAMES = ["fixed", "retained", "optimizer", "optimizer-raw"] as const;

describe("v9-pool pool decision", () => {
  test("the build's qualification predicate decides the pool, not the qualified flag alone", () => {
    expect(seedQualified(seed("p-01").summary)).toBe(true);
    expect(seedQualified(seed("p-01", "qualified", { duplicateRequests: 1 }).summary)).toBe(false);
    expect(seedQualified(seed("p-01", "qualified", { validation: { passed: 0, total: 1 } }).summary)).toBe(false);
    expect(seedQualified(seed("p-01", "qualified", { catalog: null }).summary)).toBe(false);
    expect(seedQualified(seed("p-01", "qualified", { termination: "generation-limit" }).summary)).toBe(false);
    expect(seedQualified(seed("p-01", "generation-limit").summary)).toBe(false);
  });

  test("sixteen launched with fewer than six qualified is insufficient; interrupted counts as launched and not qualified", () => {
    const terminations: Termination[] = ["qualified", "generation-limit", "qualified", "interrupted", "budget-limit", "qualified", "duplicate-request",
      "generation-limit", "qualified", "interrupted", "generation-limit", "qualified", "generation-limit", "budget-limit", "generation-limit", "generation-limit"];
    const decision = poolDecision(pool(terminations));
    expect(decision.status).toBe("insufficient");
    expect(decision.primary).toBeNull();
    expect(decision.launched).toEqual([...POOL_BLOCK_IDS]);
    expect(decision.qualified).toEqual(["p-01", "p-03", "p-06", "p-09", "p-12"]);
    expect(decision.interrupted).toEqual(["p-04", "p-10"]);
    expect(decision.unqualified).toHaveLength(9);
    expect(decision.qualifiedNotCompared).toEqual([]);
    expect(decision.reasons).toEqual(["fewer than 6 of 16 seed searches qualified"]);
    expect(decision.rates).toEqual({ qualifiedPerLaunched: 0.313, interruptedPerLaunched: 0.125 });
    // Every launched search's charge and every in-flight receipt stays in the pool cost.
    expect(decision.poolAccountedCost.workUnits).toBe(160);
    expect(decision.poolUnreferencedCost).toEqual({ ...zeroCost(), workUnits: 10, admittedRuns: 2, modelCalls: 2 });
    expect(decision.poolCost.workUnits).toBe(170);
  });

  test("six or more qualified selects the six lowest-index qualified blocks and names the rest", () => {
    const terminations: Termination[] = ["generation-limit", "qualified", "qualified", "interrupted", "qualified", "qualified", "generation-limit", "qualified", "qualified", "qualified"];
    const decision = poolDecision(pool(terminations));
    expect(decision.status).toBe("qualified");
    expect(decision.primary).toEqual(["p-02", "p-03", "p-05", "p-06", "p-08", "p-09"]);
    expect(decision.qualifiedNotCompared).toEqual(["p-10"]);
    expect(decision.reasons).toEqual([]);
    expect(decision.rates.qualifiedPerLaunched).toBe(0.7);
    // Exactly six qualified among sixteen still qualifies.
    const exact = poolDecision(pool(Array.from({ length: 16 }, (_, i) => (i % 3 === 0 ? "qualified" : "generation-limit") as Termination)));
    expect(exact.status).toBe("qualified");
    expect(exact.primary).toEqual(["p-01", "p-04", "p-07", "p-10", "p-13", "p-16"]);
  });

  test("a partial pool below six qualified is not yet decidable", () => {
    const decision = poolDecision(pool(["qualified", "generation-limit", "qualified", "qualified", "interrupted", "qualified", "qualified"]));
    expect(decision.status).toBe("in-progress");
    expect(decision.primary).toBeNull();
    expect(decision.reasons).toEqual(["pool still launching: 7 launched, 5 qualified"]);
    expect(poolDecision([]).status).toBe("in-progress");
  });

  test("launched searches must be a protocol-order prefix within the cap", () => {
    const rows = pool(["qualified", "qualified"]);
    expect(() => poolDecision([rows[1]!, rows[0]!])).toThrow("protocol-order prefix");
    expect(() => poolDecision([rows[0]!, { block: "p-03", seed: seed("p-03") }])).toThrow("protocol-order prefix");
    expect(() => poolDecision([rows[0]!, { block: "p-02", seed: seed("p-09") }])).toThrow("protocol-order prefix");
    expect(() => poolDecision(pool(Array.from({ length: 17 }, () => "qualified" as Termination)))).toThrow("more than 16");
  });
});

describe("v9-pool primary rule", () => {
  test("six strict wins with a strict aggregate meets the rule; secondary arms decide nothing", () => {
    const rows = primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 6, 6]);
    const result = comparison(rows, { ...zeroCost(), workUnits: 1000 });
    expect(result.status).toBe("descriptive-repeatability-rule-met");
    expect(result.coverage).toEqual({ complete: true, missing: [] });
    expect([result.wins, result.ties, result.losses]).toEqual([6, 0, 0]);
    expect(result.aggregate).toEqual({ optimizer: 36, fixed: 18, plannedTasks: 48, strict: true });
    expect(result.blocks.map(block => block.outcome)).toEqual(Array(6).fill("win"));
    expect(result.headroomBlocks).toBe(6);
    expect(result.secondary.retained).toEqual({ complete: true, wins: 0, ties: 6, losses: 0, passed: 18 });
    expect(result.secondary["optimizer-raw"].wins).toBe(6);
    expect(result.secondaryComplete).toBe(true);
    expect(result.arms.optimizer.planned).toBe(48);
    expect(result.arms.optimizer.cost.workUnits).toBe(6 * (4000 + 800));
    expect(result.workRatio.optimizerToFixed).toBe(1);
    expect(result.comparisonCost.workUnits).toBe(4 * 6 * 4800);
    expect(result.totalRealizedCost.workUnits).toBe(1000 + 4 * 6 * 4800);
    expect(result.nullTail).toContain("7/64");
    delete rows[0]!.frozen["optimizer-raw"];
    const secondary = comparison(rows, zeroCost());
    expect(secondary.status).toBe("descriptive-repeatability-rule-met");
    expect(secondary.secondaryComplete).toBe(false);
    expect(secondary.secondary["optimizer-raw"]).toEqual({ complete: false, wins: 5, ties: 0, losses: 0, passed: 30 });
  });

  test("five of six wins meets the rule, four does not, and a tie is not a win", () => {
    expect(comparison(primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 6, 1]), zeroCost()).status).toBe("descriptive-repeatability-rule-met");
    const four = comparison(primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 1, 1]), zeroCost());
    expect(four.status).toBe("descriptive-repeatability-rule-not-met");
    expect([four.wins, four.losses, four.aggregate.strict]).toEqual([4, 2, true]);
    const tied = comparison(primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 3, 3]), zeroCost());
    expect(tied.status).toBe("descriptive-repeatability-rule-not-met");
    expect([tied.wins, tied.ties, tied.losses]).toEqual([4, 2, 0]);
    expect(tied.blocks[4]!.outcome).toBe("tie");
    // Five wins beside one tie still meets the rule: the tie is simply not a win.
    expect(comparison(primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 6, 3]), zeroCost()).status).toBe("descriptive-repeatability-rule-met");
  });

  test("five wins without a strict aggregate does not meet the rule", () => {
    const result = comparison(primaryRows([3, 3, 3, 3, 3, 7], [4, 4, 4, 4, 4, 1]), zeroCost());
    expect(result.wins).toBe(5);
    expect(result.aggregate).toEqual({ optimizer: 21, fixed: 22, plannedTasks: 48, strict: false });
    expect(result.status).toBe("descriptive-repeatability-rule-not-met");
    const equal = comparison(primaryRows([3, 3, 3, 3, 3, 7], [4, 4, 4, 4, 4, 2]), zeroCost());
    expect(equal.aggregate).toEqual({ optimizer: 22, fixed: 22, plannedTasks: 48, strict: false });
    expect(equal.status).toBe("descriptive-repeatability-rule-not-met");
    expect(equal.headroomBlocks).toBe(5);
  });

  test("a reconciled or missing primary stage fails coverage and is insufficient, never a missing observation", () => {
    const rows = primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 6, 6]);
    rows[2]!.frozen.optimizer = reconciled();
    const frozen = comparison(rows, zeroCost());
    expect(frozen.status).toBe("insufficient");
    expect(frozen.coverage).toEqual({ complete: false, missing: ["p-03/frozen-optimizer"] });
    expect(frozen.blocks[2]).toMatchObject({ block: "p-03", fixed: 3, optimizer: null, outcome: "incomplete", headroom: true });
    expect(frozen.wins).toBe(5);
    expect(frozen.arms.optimizer.cost.workUnits).toBe(5 * 4800 + 4000 + 50);
    rows[2]!.frozen.optimizer = session(6);
    rows[4]!.learning.arms.fixed = reconciled();
    delete rows[4]!.frozen.fixed;
    expect(comparison(rows, zeroCost()).coverage.missing).toEqual(["p-05/learning-fixed", "p-05/frozen-fixed"]);
    rows[4]!.learning.arms.fixed = { ...session(30, 40), observed: 39, counts: { ...session(30, 40).counts, tasks: 39 } };
    rows[4]!.frozen.fixed = session(3);
    expect(comparison(rows, zeroCost()).status).toBe("insufficient");
    // A reconciled secondary stage leaves the primary intact.
    rows[4]!.learning.arms.fixed = session(30, 40);
    rows[1]!.learning.arms.retained = reconciled();
    delete rows[1]!.frozen.retained;
    const secondary = comparison(rows, zeroCost());
    expect(secondary.status).toBe("descriptive-repeatability-rule-met");
    expect(secondary.secondary.retained.complete).toBe(false);
  });

  test("coverage needs exactly six distinct primary blocks with qualified seeds", () => {
    const rows = primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 6, 6]);
    expect(comparison(rows.slice(0, 5), zeroCost()).coverage.missing).toEqual(["6 distinct primary blocks"]);
    expect(comparison([...rows.slice(0, 5), rows[0]!], zeroCost()).status).toBe("insufficient");
    rows[3]!.learning.seed = seed("p-04", "generation-limit");
    expect(comparison(rows, zeroCost()).coverage.missing).toEqual(["p-04/seed"]);
    // Rows are read in protocol order whatever order they arrive in.
    const shuffled = comparison([rows[5]!, rows[0]!, rows[2]!, rows[1]!, rows[4]!, rows[3]!], zeroCost());
    expect(shuffled.blocks.map(block => block.block)).toEqual(["p-01", "p-02", "p-03", "p-04", "p-05", "p-06"]);
  });

  test("fully observed terminal errors count as failures and do not become missing observations", () => {
    const rows = primaryRows([3, 3, 3, 3, 3, 3], [6, 6, 6, 6, 6, 6]);
    rows[0]!.frozen.fixed!.counts.complete = 5;
    expect(comparison(rows, zeroCost()).status).toBe("descriptive-repeatability-rule-met");
  });
});

describe("v9-pool offline analyses", () => {
  const block = BLOCKS[0]!;
  const first = seedTask(block);
  const batch = (split: "train" | "validation" | "development") => first.inputs.find(row => row.split === split)!;
  const truth = (split: "train" | "validation" | "development") => ({ out: batch(split).expect.out as unknown as JsonValue });
  const exact = (split: "train" | "validation" | "development") => structuredClone(truth(split)) as JsonValue;
  /** Copies the truth and breaks the named rows: a wrong label, a duplicate id, or a malformed row. */
  function altered(split: "train" | "validation" | "development", edits: { wrongLabel?: number[]; duplicate?: number[]; malformed?: number[]; dropSummary?: boolean }): JsonValue {
    const out = structuredClone(batch(split).expect.out) as unknown as JsonObject;
    const results = out.results as JsonObject[];
    for (const i of edits.wrongLabel ?? []) results[i]!.label = `${results[i]!.label}-wrong`;
    for (const i of edits.duplicate ?? []) results[i]!.recordId = results[0]!.recordId!;
    for (const i of edits.malformed ?? []) (results as JsonValue[])[i] = "not a record";
    if (edits.dropSummary) delete out.summary;
    return { out } as JsonValue;
  }
  const reading = (generation: number, train: JsonValue | null, validation: JsonValue | null, development: JsonValue | null = null): AttemptReading => ({
    generation, round: "contrastive-examples", mode: generation === 1 ? "generate" : "revise",
    selection: train === null ? null : { train: caseDiagnostics({ expect: truth("train"), outputs: train }), validation: caseDiagnostics({ expect: truth("validation"), outputs: validation }) },
    development: development === null ? null : caseDiagnostics({ expect: truth("development"), outputs: development }),
  });
  const validationIds = batch("validation").expect.out.results.map(row => row.recordId);

  test("exact, missing, wrong, duplicate, and malformed rows read as the v5 grader reads them", () => {
    const search = searchAccuracy(block, { termination: "qualified", qualified: true }, first, [reading(1, exact("train"), exact("validation"), exact("development"))]);
    expect(search).toMatchObject({ block: "p-01", index: 0, generations: 1, executedGenerations: 1, maxExactValidationRows: 12, persistentMisses: [],
      firstGenerationAtOrAbove: { 11: 1, 10: 1 }, perLabelSummaryDeclared: first.outputFormat.summaries.includes("perLabel") });
    expect(search.attempts[0]).toEqual({ generation: 1, round: "contrastive-examples", mode: "generate", executed: true,
      trainExactRows: 24, trainRows: 24, trainSummaryExact: true, validationExactRows: 12, validationRows: 12, validationSummaryExact: true,
      validationMissedRecordIds: [], labelsCorrect: { train: 24, validation: 12, development: 12 } });
    const wrong = searchAccuracy(block, { termination: "generation-limit", qualified: false }, first,
      [reading(1, altered("train", { wrongLabel: [0, 1] }), altered("validation", { wrongLabel: [3], dropSummary: true }), altered("development", { wrongLabel: [0] }))]);
    expect(wrong.attempts[0]).toMatchObject({ trainExactRows: 22, trainSummaryExact: true, validationExactRows: 11, validationSummaryExact: false,
      validationMissedRecordIds: [validationIds[3]!], labelsCorrect: { train: 22, validation: 11, development: 11 } });
    expect(wrong.maxExactValidationRows).toBe(11);
    expect(wrong.persistentMisses).toEqual([validationIds[3]!]);
    // A duplicate id or a malformed row invalidates the whole results list; the summary still compares.
    const duplicate = searchAccuracy(block, { termination: "generation-limit", qualified: false }, first, [reading(1, altered("train", { duplicate: [5] }), altered("validation", { malformed: [2] }))]);
    expect(duplicate.attempts[0]).toMatchObject({ trainExactRows: 0, trainSummaryExact: true, validationExactRows: 0, validationSummaryExact: true,
      validationMissedRecordIds: validationIds, labelsCorrect: { train: 0, validation: 0, development: null } });
    expect(duplicate.persistentMisses).toEqual(validationIds);
    expect(duplicate.firstGenerationAtOrAbove).toEqual({ 11: null, 10: null });
    // An unreadable output scores nothing and is still an executed generation.
    const unreadable = searchAccuracy(block, { termination: "budget-limit", qualified: false }, first, [reading(1, "garbage", 42)]);
    expect(unreadable.attempts[0]).toMatchObject({ executed: true, trainExactRows: 0, trainSummaryExact: false, validationExactRows: 0, validationMissedRecordIds: validationIds });
    expect(unreadable.executedGenerations).toBe(1);
  });

  test("persistent misses and first-generation thresholds read across executed generations only", () => {
    const readings = [
      reading(1, null, null),
      reading(2, altered("train", {}), altered("validation", { wrongLabel: [1, 4, 7] })),
      reading(3, altered("train", {}), altered("validation", { wrongLabel: [4, 7] })),
      reading(4, altered("train", {}), altered("validation", { wrongLabel: [4] }), altered("development", {})),
    ];
    const search = searchAccuracy(block, { termination: "generation-limit", qualified: false }, first, readings);
    expect(search.attempts.map(attempt => attempt.executed)).toEqual([false, true, true, true]);
    expect(search.attempts[0]).toMatchObject({ trainExactRows: null, validationExactRows: null, validationMissedRecordIds: [], labelsCorrect: { train: null, validation: null, development: null } });
    expect(search.attempts.map(attempt => attempt.validationExactRows)).toEqual([null, 9, 10, 11]);
    expect(search).toMatchObject({ generations: 4, executedGenerations: 3, maxExactValidationRows: 11, persistentMisses: [validationIds[4]!],
      firstGenerationAtOrAbove: { 11: 4, 10: 3 } });
    expect(search.attempts[3]!.labelsCorrect.development).toBe(12);
    const none = searchAccuracy(block, { termination: "interrupted", qualified: false }, first, [reading(1, null, null)]);
    expect(none).toMatchObject({ maxExactValidationRows: null, persistentMisses: [], executedGenerations: 1 - 1, firstGenerationAtOrAbove: { 11: null, 10: null } });
    expect(searchAccuracy(block, { termination: "interrupted", qualified: false }, first, []).persistentMisses).toEqual([]);
    expect(() => searchAccuracy(block, { termination: "qualified", qualified: true }, first, [reading(2, null, null)])).toThrow("generation order");
    expect(() => searchAccuracy(block, { termination: "qualified", qualified: true }, first, Array.from({ length: 9 }, (_, i) => reading(i + 1, null, null)))).toThrow("too many");
  });

  test("the preregistered reading splits unqualified searches and never decides", () => {
    const search = (id: string, qualified: boolean, max: number | null, misses: string[]) => ({ ...searchAccuracy(BLOCKS[0]!, { termination: qualified ? "qualified" : "generation-limit", qualified }, first, []),
      block: id, maxExactValidationRows: max, persistentMisses: misses });
    const summary = offlineSummary([search("p-01", true, 12, []), search("p-02", false, 11, ["r-1"]), search("p-03", false, 9, ["r-1", "r-2"]),
      search("p-04", false, 11, ["r-1", "r-2"]), search("p-05", false, 10, ["r-3"]), search("p-06", false, null, [])]);
    expect(summary.contract).toBe("algal.study-offline.v1");
    expect(summary.unqualified).toEqual({ searches: 5, singlePersistentMissReaching11: 1, multipleMissesBelow11: 1, other: 3 });
    expect(summary.reading).toContain("2 of 5 exhausted searches at 11/12");
    expect(() => offlineSummary(Array.from({ length: 17 }, () => search("p-01", true, 12, [])))).toThrow("too many searches");
  });
});

describe("v9-pool reconciled stages", () => {
  const freeze = { digest, route: { baseUrl: "https://api.x.ai/v1", model: "grok-4.5", credentialEnv: "XAI_API_KEY" } } as FrozenIdentity;
  const record = (block: string, stage: string, input: unknown, extra: Partial<Record<string, unknown>> = {}) => ({ contract: RECONCILIATION_CONTRACT, freeze: digest, block, stage,
    input: hash(input), termination: "interrupted", snapshot: null, storeReceipts: 0, retry: "none", ...extra });

  test("a reconciliation record parses exactly", () => {
    const value = record("p-01", "learning-fixed", { input: 1 });
    expect(parseReconciliation(value)).toEqual(value as never);
    expect(() => parseReconciliation({ ...value, retry: "once" })).toThrow("terminal interrupted");
    expect(() => parseReconciliation({ ...value, termination: "complete" })).toThrow("terminal interrupted");
    expect(() => parseReconciliation({ ...value, extra: 1 })).toThrow();
    expect(() => parseReconciliation({ ...value, storeReceipts: 8193 })).toThrow();
    expect(() => parseReconciliation({ ...value, block: "P 1" })).toThrow("invalid block");
  });

  test("a stage closes by result, by record, or by both, and never by an open attempt", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-stage-"));
    try {
      const block = BLOCKS[0]!;
      const config = { arm: { arm: "fixed" }, tasks: [] } as unknown as JsonObject;
      const dir = startStage(root, freeze, block.id, "frozen-fixed", config);
      expect(() => closedStage(root, freeze, block.id, "frozen-fixed", config)).toThrow("not closed");
      await expect(inspectSession(root, freeze, block, "frozen-fixed", config, [])).rejects.toThrow("not closed");
      // Record only: the task's shape — no result beside the record.
      writeNew(join(dir, "reconciliation.json"), record(block.id, "frozen-fixed", config, { storeReceipts: null }));
      expect(closedStage(root, freeze, block.id, "frozen-fixed", config)).toEqual({ result: null, reconciliation: record(block.id, "frozen-fixed", config, { storeReceipts: null }) as never });
      const summary = await inspectSession(root, freeze, block, "frozen-fixed", config, []);
      expect(summary).toEqual({ session: null, outcome: "interrupted", observed: 0, head: null, cost: zeroCost(),
        counts: { tasks: 0, complete: 0, labelsCorrect: 0, recordsCorrect: 0, recordsTotal: 0, summariesExact: 0, outputsExact: 0, scorerPassed: 0 }, reconciled: true });
      // Record and result: the driver's `reconcile` shape.
      writeNew(join(dir, "result.json"), { session: null, reconciliation: hash(record(block.id, "frozen-fixed", config, { storeReceipts: null })) });
      expect((await inspectSession(root, freeze, block, "frozen-fixed", config, [])).reconciled).toBe(true);
      // The record is bound to the attempt it closes.
      const other = startStage(root, freeze, block.id, "frozen-retained", config);
      writeNew(join(other, "reconciliation.json"), record(block.id, "frozen-fixed", config));
      expect(() => closedStage(root, freeze, block.id, "frozen-retained", config)).toThrow("reconciliation binding mismatch");
      const stale = startStage(root, freeze, block.id, "frozen-optimizer", config);
      writeNew(join(stale, "reconciliation.json"), record(block.id, "frozen-optimizer", { other: true }));
      expect(() => closedStage(root, freeze, block.id, "frozen-optimizer", config)).toThrow("reconciliation binding mismatch");
      // A result that names a session beside a record is not a reconciled stage.
      const mixed = startStage(root, freeze, block.id, "learning-fixed", config);
      writeNew(join(mixed, "reconciliation.json"), record(block.id, "learning-fixed", config));
      writeNew(join(mixed, "result.json"), { session: digest });
      await expect(inspectSession(root, freeze, block, "learning-fixed", config, [])).rejects.toThrow("carries a session");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("retained seed snapshots list latest first, name their own hash, and mark the search's own closing", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-snapshots-"));
    try {
      const snapshot = (attempts: number, inFlight: unknown, termination = "in-progress", qualified = false) => ({ contract: "algal.study-seed.v3", qualified, termination, inFlight,
        attempts: Array.from({ length: attempts }, (_, i) => ({ generation: i + 1 })) });
      const retain = (summary: unknown) => { writeNew(join(root, `seed-${hash(summary).slice(7)}.json`), summary); return hash(summary); };
      expect(retainedSeedSnapshots(root, "p-01/seed")).toEqual([]);
      expect(selfClosedSnapshot([], "p-01/seed")).toBeNull();
      const initial = retain(snapshot(0, null));
      const planned = retain(snapshot(0, { generation: 1 }));
      const settled = retain(snapshot(1, null));
      const thrown = retain(snapshot(1, null, "interrupted"));
      const next = retain(snapshot(1, { generation: 2 }));
      // Most attempts first; among equals the thrown-error snapshot, then the planned one, then the settled one.
      expect(retainedSeedSnapshots(root, "p-01/seed").map(s => [s.digest, s.attempts, s.rank, s.terminal])).toEqual([[thrown, 1, 2, false], [next, 1, 1, false], [settled, 1, 0, false], [planned, 0, 1, false], [initial, 0, 0, false]]);
      expect(selfClosedSnapshot(retainedSeedSnapshots(root, "p-01/seed"), "p-01/seed")).toBeNull();
      const renamed = join(root, `seed-${"c".repeat(64)}.json`);
      writeFileSync(renamed, JSON.stringify(snapshot(0, null)));
      expect(() => retainedSeedSnapshots(root, "p-01/seed")).toThrow("snapshot hash mismatch");
      rmSync(renamed);
      // A terminal snapshot sorts first and is the search's own closing; a
      // second one, or one below a later snapshot, is nobody's.
      const closed = retain(snapshot(2, null, "generation-limit"));
      expect(retainedSeedSnapshots(root, "p-01/seed")[0]).toMatchObject({ digest: closed, attempts: 2, rank: 2, terminal: true });
      expect(selfClosedSnapshot(retainedSeedSnapshots(root, "p-01/seed"), "p-01/seed")?.digest).toBe(closed);
      const qualified = retain(snapshot(2, null, "qualified", true));
      expect(() => selfClosedSnapshot(retainedSeedSnapshots(root, "p-01/seed"), "p-01/seed")).toThrow("more than one retained snapshot is terminal");
      rmSync(join(root, `seed-${qualified.slice(7)}.json`));
      // Among equal attempts the terminal snapshot is the latest; one with more attempts is later.
      retain(snapshot(2, { generation: 3 }));
      expect(selfClosedSnapshot(retainedSeedSnapshots(root, "p-01/seed"), "p-01/seed")?.digest).toBe(closed);
      retain(snapshot(3, null));
      expect(() => selfClosedSnapshot(retainedSeedSnapshots(root, "p-01/seed"), "p-01/seed")).toThrow("p-01/seed: a retained snapshot already terminated as generation-limit below a later one");
      rmSync(join(root, `seed-${closed.slice(7)}.json`));
      retain(snapshot(2, null, "closed"));
      expect(() => retainedSeedSnapshots(root, "p-01/seed")).toThrow("unknown termination closed");
      rmSync(join(root, `seed-${hash(snapshot(2, null, "closed")).slice(7)}.json`));
      retain(snapshot(9, null));
      expect(() => retainedSeedSnapshots(root, "p-01/seed")).toThrow("too many attempts");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("a reconciled stage's receipts are summed and checked against the record's count", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-receipts-"));
    try {
      const block = BLOCKS[1]!;
      const config = { arm: { arm: "fixed" }, tasks: [] } as unknown as JsonObject;
      const dir = startStage(root, freeze, block.id, "frozen-fixed", config);
      const runs = join(root, "stores", block.id, "frozen-fixed", "runs");
      mkdirSync(runs, { recursive: true });
      writeFileSync(join(runs, "not-a-receipt.txt"), "x");
      writeNew(join(dir, "reconciliation.json"), record(block.id, "frozen-fixed", config, { storeReceipts: 1 }));
      await expect(inspectSession(root, freeze, block, "frozen-fixed", config, [])).rejects.toThrow("unexpected receipt path");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe("v9-pool constants the rules read", () => {
  test("the plan's numbers are the protocol's", () => {
    expect([POOL.launchCap, POOL.minimumQualified, POOL.primarySize, POOL.winsRequired, POOL.frozenTasksPrimary]).toEqual([16, 6, 6, 5, 48]);
    expect(POOL_BLOCK_IDS).toHaveLength(16);
  });
});
