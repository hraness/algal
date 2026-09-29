import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalize, type JsonObject, type JsonValue } from "../../../../src/values";
import { zeroCost, type StudyCost } from "../v5/evidence-support";
import { assertPublic, exportStudy, insufficientCoverage, publicSummary, publicText, sortKeys } from "./export";
import { hash, ROUTE, writeNew } from "./guards";
import { ARMS, BLOCKS, PROTOCOL, RECONCILIATION_CONTRACT, RESULT_CONTRACT, STUDY_ID } from "./protocol";

const json = (value: unknown): JsonValue => value as JsonValue;
const cost = (workUnits: number, extra: Partial<StudyCost> = {}): StudyCost => ({ ...zeroCost(), workUnits, ...extra });
const counts = (passed: number, tasks: number) => ({ tasks, complete: tasks, labelsCorrect: passed * 12, recordsCorrect: passed * 12, recordsTotal: tasks * 12,
  summariesExact: passed, outputsExact: passed, scorerPassed: passed });

/** A collected study on disk: frozen identity, seven launched searches (one
 * reconciled), six primary blocks with four arms each, and stores holding
 * only the accounts and receipts the public summary reads. */
function fixtureStudy(root: string, opts: { replay?: boolean; missingUsage?: boolean; insufficient?: "reconciled" | "exhausted" } = {}): { freeze: JsonObject; results: JsonObject } {
  const body = { contract: "algal.study-freeze.v1", protocol: hash(PROTOCOL), datasets: hash([]), route: ROUTE, bunVersion: Bun.version, sources: {}, sourceCommit: "b".repeat(40) };
  const freeze = { ...body, digest: hash(body) };
  mkdirSync(root, { recursive: true });
  writeNew(join(root, "freeze.json"), freeze);
  writeNew(join(root, "protocol.json"), PROTOCOL);
  const launched = BLOCKS.slice(0, 7).map(block => block.id);
  const interrupted = ["p-03"];
  const qualified = launched.filter(id => !interrupted.includes(id));
  const receipt = (units: number, usage: boolean) => {
    const value = { contract: "algal.run-receipt.v1", work: { units, agentCalls: 1 }, effects: [usage ? { usage: { tokensIn: 100, tokensOut: 20 } } : { error: { code: "TRANSPORT_FAILED" } }] };
    return { digest: hash(value), value };
  };
  const seedRows: Record<string, JsonObject> = {};
  for (const [i, id] of launched.entries()) {
    const store = join(root, "stores", id, "seed");
    mkdirSync(join(store, "values"), { recursive: true });
    mkdirSync(join(store, "runs"), { recursive: true });
    const r1 = receipt(1000, true);
    const r2 = receipt(2000, !(opts.missingUsage && i === 1));
    writeNew(join(store, "runs", `${r1.digest.slice(7)}.json`), r1.value);
    writeNew(join(store, "runs", `${r2.digest.slice(7)}.json`), r2.value);
    const account = { charged: { work: 3000, runs: 2, attempts: 2 }, runs: [{ receipt: r1.digest }, { receipt: r2.digest }] };
    writeNew(join(store, "values", `${hash(account).slice(7)}.json`), account);
    const attempt = (generation: number, passed: number) => ({ generation, round: PROTOCOL.seed.roundSchedule[generation - 1], mode: generation === 1 ? "generate" : "revise",
      outcome: "complete", manifest: hash({ candidate: id, generation }), train: { passed: 24, total: 24 }, validation: { passed, total: 12 },
      development: passed === 12 ? null : { score: 0.5 }, developmentRecord: passed === 12 ? null : hash({ development: id, generation }),
      request: hash({ request: id, generation }), duplicateRequest: false, repeatedManifest: false, failure: null,
      // The private fields the driver stores beside them never reach the summary.
      cells: [{ prompt: "secret" }], outputs: { out: "secret" } });
    const summary = interrupted.includes(id)
      ? { contract: "algal.study-seed.v3", blockId: id, qualified: false, termination: "in-progress", duplicateRequests: 0, manifest: null, account: hash(account),
        attempts: [attempt(1, 9), attempt(2, 10)], inFlight: { generation: 3, round: PROTOCOL.seed.roundSchedule[2], mode: "revise" } }
      : { contract: "algal.study-seed.v3", blockId: id, qualified: true, termination: "qualified", duplicateRequests: 0, manifest: hash({ candidate: id, generation: 2 }),
        account: hash(account), attempts: [attempt(1, 11), attempt(2, 12)], inFlight: null };
    const dir = join(root, id, "attempts", "seed");
    mkdirSync(dir, { recursive: true });
    if (interrupted.includes(id)) {
      const snapshot = hash(summary);
      writeNew(join(dir, `seed-${snapshot.slice(7)}.json`), summary);
      // An extra receipt the in-flight writer call left, named by no account.
      const r3 = receipt(500, true);
      writeNew(join(store, "runs", `${r3.digest.slice(7)}.json`), r3.value);
      writeNew(join(dir, "reconciliation.json"), { contract: RECONCILIATION_CONTRACT, freeze: freeze.digest, block: id, stage: "seed", input: hash({ block: id }),
        termination: "interrupted", snapshot, storeReceipts: 3, retry: "none" });
      seedRows[id] = { summary: json({ ...summary, termination: "interrupted", qualified: false }), reconciled: true, cost: cost(3000, { admittedRuns: 2, modelCalls: 2, tokensIn: 200, tokensOut: 40 }),
        unreferenced: cost(500, { admittedRuns: 1, modelCalls: 1, tokensIn: 100, tokensOut: 20 }), catalog: null, manifest: null };
    } else {
      writeNew(join(dir, "result.json"), summary);
      seedRows[id] = { summary: json(summary), reconciled: false, cost: cost(3000, { admittedRuns: 2, modelCalls: 2, tokensIn: 200, tokensOut: 40 }), unreferenced: zeroCost(), catalog: null, manifest: null };
    }
  }
  const primary = qualified.slice(0, 6);
  const session = (id: string, arm: string, stage: "learning" | "frozen", reconciled: boolean, exhausted = false) => reconciled
    ? { session: null, outcome: "interrupted", observed: 0, head: null, cost: cost(50, { admittedRuns: 1, modelCalls: 1 }), counts: counts(0, 0), reconciled: true }
    : exhausted
      ? { session: hash({ session: id, arm, stage }), outcome: "exhausted", observed: 5, head: hash({ head: id, arm }), cost: cost(500, { admittedRuns: 1, modelCalls: 1, tokensIn: 100, tokensOut: 20 }), counts: counts(2, 5), reconciled: false }
      : { session: hash({ session: id, arm, stage }), outcome: "complete", observed: stage === "learning" ? 40 : 8, head: hash({ head: id, arm }),
        cost: cost(stage === "learning" ? 4000 : 800, { admittedRuns: 1, modelCalls: 1, tokensIn: 100, tokensOut: 20 }), counts: counts(arm === "optimizer" ? 6 : 3, stage === "learning" ? 40 : 8), reconciled: false };
  // An insufficient fixture breaks p-01's frozen optimizer stage one of two ways.
  const broken = (id: string, arm: string) => opts.insufficient !== undefined && id === "p-01" && arm === "optimizer";
  const rows = primary.map(id => ({ block: BLOCKS.find(block => block.id === id)!,
    learning: { block: id, seed: seedRows[id], arms: Object.fromEntries(ARMS.map(arm => [arm, session(id, arm, "learning", id === "p-06" && arm === "retained")])) },
    frozen: Object.fromEntries(ARMS.filter(arm => !(id === "p-06" && arm === "retained")).map(arm => [arm,
      session(id, arm, "frozen", broken(id, arm) && opts.insufficient === "reconciled", broken(id, arm) && opts.insufficient === "exhausted")])) }));
  const poolCost = cost(7 * 3000 + 500, { admittedRuns: 15, modelCalls: 15, tokensIn: 1500, tokensOut: 300 });
  const pool = { contract: "algal.study-pool.v1", freeze: freeze.digest, launched, qualified, interrupted, unqualified: [], primary, qualifiedNotCompared: [],
    status: "qualified", reasons: [], rates: { qualifiedPerLaunched: 0.857, interruptedPerLaunched: 0.143 },
    poolAccountedCost: cost(21000, { admittedRuns: 14, modelCalls: 14, tokensIn: 1400, tokensOut: 280 }), poolUnreferencedCost: cost(500, { admittedRuns: 1, modelCalls: 1, tokensIn: 100, tokensOut: 20 }), poolCost };
  const comparisonCost = cost(4 * 6 * 4800 - 4800 + 50);
  const summary = { status: "descriptive-repeatability-rule-met", primaryContrast: "optimizer versus fixed", plannedBlocks: 6, observedBlocks: 6,
    coverage: { complete: true, missing: [] }, wins: 6, ties: 0, losses: 0, winsRequired: 5, tiesWin: false,
    aggregate: { optimizer: 36, fixed: 18, plannedTasks: 48, strict: true }, blocks: primary.map((id, index) => ({ block: id, index, fixed: 3, optimizer: 6, outcome: "win", headroom: true })),
    headroomBlocks: 6, secondary: { retained: { complete: false, wins: 0, ties: 5, losses: 0, passed: 15 }, "optimizer-raw": { complete: true, wins: 6, ties: 0, losses: 0, passed: 36 } },
    secondaryComplete: false, arms: {}, workRatio: { optimizerToFixed: 1, scope: "" }, nullTail: PROTOCOL.pool.nullTail, poolCost, comparisonCost, totalRealizedCost: cost(poolCost.workUnits + comparisonCost.workUnits),
    interpretation: "descriptive" };
  if (opts.insufficient !== undefined) Object.assign(summary, { status: "insufficient", coverage: { complete: false, missing: ["p-01/frozen-optimizer"] }, wins: 5 });
  const offline = { contract: "algal.study-offline.v1", searches: launched.map((id, index) => ({ block: id, index, termination: interrupted.includes(id) ? "interrupted" : "qualified",
    qualified: !interrupted.includes(id), generations: 2, executedGenerations: 2, maxExactValidationRows: interrupted.includes(id) ? 10 : 12, persistentMisses: interrupted.includes(id) ? ["r-4"] : [],
    firstGenerationAtOrAbove: { 11: interrupted.includes(id) ? null : 1, 10: interrupted.includes(id) ? 2 : 1 }, perLabelSummaryDeclared: true, attempts: [] })),
    unqualified: { searches: 1, singlePersistentMissReaching11: 0, multipleMissesBelow11: 0, other: 1 }, reading: PROTOCOL.comparison.offlineReading };
  const results = { contract: RESULT_CONTRACT, freeze: freeze.digest, status: summary.status, pool, rows, duplicateWriterRequests: 0, offline, summary };
  writeNew(join(root, "results.json"), results);
  if (opts.replay) {
    writeNew(join(root, "replay.json"), { contract: "algal.study-replay.v2", freeze: freeze.digest, results: hash(results), ok: true, checkedReceipts: 15,
      stores: launched.map(id => ({ store: `${id}/seed`, checkedReceipts: id === "p-03" ? 3 : 2, reconciled: id === "p-03" })), countScope: "per store" });
  }
  return { freeze: json(freeze) as JsonObject, results: json(results) as JsonObject };
}

describe("v9-pool public export", () => {
  test("the summary carries identities, counts, costs, and the pool's categories, and never a model input or output", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-export-"));
    try {
      const { freeze, results } = fixtureStudy(join(root, "study"), { replay: true });
      const summary = publicSummary(join(root, "study"), "2026-10-01");
      expect(summary.schema).toBe("algal.cumulative-skill-public.v9-pool");
      expect(summary).toMatchObject({ study: STUDY_ID, studyDate: "2026-10-01", status: "descriptive-repeatability-rule-met", sourceCommit: "b".repeat(40),
        executor: { baseUrl: ROUTE.baseUrl, model: ROUTE.model }, identity: { freeze: freeze.digest, protocol: hash(PROTOCOL), results: hash(results) } });
      const blocks = summary.blocks as JsonObject[];
      expect(blocks).toHaveLength(16);
      expect(blocks.map(block => block.status)).toEqual(["primary", "primary", "interrupted", "primary", "primary", "primary", "primary", ...Array(9).fill("not-launched")]);
      expect(blocks[8]).toMatchObject({ block: "p-09", index: 8, seed: null, arms: null, seeds: BLOCKS[8]!.seeds });
      const seed = blocks[0]!.seed as JsonObject;
      expect(seed).toMatchObject({ qualified: true, termination: "qualified", generations: 2, duplicateRequests: 0, distinctWriterRequests: 2, distinctManifests: 2, interrupted: null,
        cost: { workUnits: 3000, admittedRuns: 2, modelCalls: 2, tokensIn: 200, tokensOut: 40, effectsMissingUsage: 0 } });
      expect((seed.attempts as JsonObject[])[1]).toEqual({ generation: 2, round: PROTOCOL.seed.roundSchedule[1]!, mode: "revise", outcome: "complete", manifest: hash({ candidate: "p-01", generation: 2 }),
        trainingBatches: { passed: 24, total: 24 }, validationBatches: { passed: 12, total: 12 }, developmentScore: null, developmentRecord: null,
        writerRequest: hash({ request: "p-01", generation: 2 }), duplicateRequest: false, repeatedManifest: false, failureCode: null });
      // The reconciled search reads from its retained snapshot with the in-flight plan and the unnamed receipt.
      const reconciled = blocks[2]!.seed as JsonObject;
      expect(reconciled).toMatchObject({ qualified: false, termination: "interrupted", generations: 2, manifest: null,
        interrupted: { completedGenerations: 2, inFlightGeneration: 3, inFlightRound: PROTOCOL.seed.roundSchedule[2]!, inFlightMode: "revise", storeReceipts: 3, unreferencedReceipts: 1,
          unreferencedReceiptCost: { workUnits: 500, admittedRuns: 1, modelCalls: 1, tokensIn: 100, tokensOut: 20, effectsMissingUsage: 0 }, retry: "none" } });
      expect(blocks[2]!.arms).toBeNull();
      const arms = blocks[5]!.arms as Record<string, { learning: JsonObject; frozen: JsonObject | null }>;
      expect(arms.optimizer!.frozen).toMatchObject({ outcome: "complete", observedTasks: 8, head: hash({ head: "p-06", arm: "optimizer" }), reconciled: false, counts: { scorerPassed: 6 } });
      expect(arms.retained!.learning).toMatchObject({ session: null, outcome: "interrupted", observedTasks: 0, head: null, reconciled: true });
      expect(arms.retained!.frozen).toBeNull();
      expect(summary.pool).toMatchObject({ launched: ["p-01", "p-02", "p-03", "p-04", "p-05", "p-06", "p-07"], interrupted: ["p-03"], primary: ["p-01", "p-02", "p-04", "p-05", "p-06", "p-07"], status: "qualified" });
      expect(summary.primaryComparison).toMatchObject({ wins: 6, aggregate: { optimizer: 36, fixed: 18 } });
      expect(summary.receiptFileTotals).toMatchObject({ receiptFiles: 15, effectsWithUsage: 15, tokensIn: 1500, tokensOut: 300, workUnits: 7 * 3000 + 500 });
      expect(summary.recordedFailures).toEqual([]);
      expect(summary.verification).toMatchObject({ offlineReplayPassed: true, receiptFilesChecked: 15 });
      expect((summary.method as JsonObject).poolRule).toEqual(json(PROTOCOL.pool));
      expect((summary.method as JsonObject).estimand).toBe(PROTOCOL.basis.change);
      expect(summary.limitations as string[]).toContain("1 seed search was closed as interrupted by the host, not by the protocol, and by protocol not retried.");
      expect(JSON.stringify(summary)).not.toContain("secret");
      expect(() => assertPublic(summary as JsonValue)).not.toThrow();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("a receipt without usage is a listed transport failure and makes full token totals unknown", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-export-usage-"));
    try {
      fixtureStudy(join(root, "study"), { missingUsage: true });
      const summary = publicSummary(join(root, "study"), "2026-10-01");
      expect(summary.recordedFailures).toEqual([{ block: "p-02", stage: "seed", receipt: expect.stringMatching(/^sha256:[a-f0-9]{64}$/), code: "TRANSPORT_FAILED",
        category: "transport failed; external completion uncertain", usageKnown: false, retried: false, countsAsFailedCase: true }]);
      expect(summary.receiptFileTotals).toMatchObject({ receiptFiles: 15, effectsWithUsage: 14, tokensIn: 1400 });
      const seed = (summary.blocks as JsonObject[])[1]!.seed as JsonObject;
      expect(seed.cost).toMatchObject({ tokensIn: null, tokensOut: null, effectsMissingUsage: 1 });
      expect(summary.verification).toBeNull();
      expect((summary.limitations as string[]).at(-1)).toContain("Transport-failed calls");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("an insufficient primary rule names its missing stages and claims a reconciliation only when one happened", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-export-insufficient-"));
    try {
      fixtureStudy(join(root, "exhausted"), { insufficient: "exhausted" });
      const exhausted = publicSummary(join(root, "exhausted"), "2026-10-01");
      expect(exhausted.status).toBe("insufficient");
      const limitations = exhausted.limitations as string[];
      expect(limitations).toContain("A primary fixed or optimizer stage closed exhausted or short of its planned tasks; the primary rule has no verdict and no block replaced it. Missing: p-01/frozen-optimizer.");
      expect(limitations.some(line => line.includes("reconciled as interrupted"))).toBe(false);
      // The pool qualified; the result's status is the coverage's, not the pool's.
      expect(limitations.some(line => line.startsWith("Fewer than six"))).toBe(false);
      fixtureStudy(join(root, "reconciled"), { insufficient: "reconciled" });
      const reconciled = publicSummary(join(root, "reconciled"), "2026-10-01");
      expect(reconciled.limitations as string[]).toContain("A primary fixed or optimizer stage was reconciled as interrupted (p-01/frozen-optimizer); the primary rule has no verdict and no block replaced it. Missing: p-01/frozen-optimizer.");
      expect(insufficientCoverage({ coverage: { missing: ["6 distinct primary blocks"] } }, new Map())).toBe("The primary set's coverage is incomplete; the primary rule has no verdict and no block replaced it. Missing: 6 distinct primary blocks.");
      expect(() => insufficientCoverage({ coverage: { missing: [] } }, new Map())).toThrow("names no missing stage");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("the export is deterministic, key-sorted, written once, and reproduced byte for byte", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-export-file-"));
    try {
      fixtureStudy(join(root, "study"), { replay: true });
      const docs = join(root, "docs");
      mkdirSync(docs);
      const first = exportStudy(join(root, "study"), "2026-10-01", docs);
      expect(first.path).toBe(join(docs, "cumulative-skill-v9-pool-results-2026-10-01.json"));
      const text = readFileSync(first.path, "utf8");
      expect(text).toBe(publicText(publicSummary(join(root, "study"), "2026-10-01")));
      expect(text.endsWith("}\n")).toBe(true);
      expect(first.bytes).toBe(Buffer.byteLength(text));
      const parsed = JSON.parse(text) as JsonObject;
      expect(Object.keys(parsed)).toEqual([...Object.keys(parsed)].sort());
      expect(hash(parsed)).toBe(first.digest);
      expect(exportStudy(join(root, "study"), "2026-10-01", docs)).toEqual(first);
      expect(readFileSync(first.path, "utf8")).toBe(text);
      writeFileSync(first.path, text + " ");
      expect(() => exportStudy(join(root, "study"), "2026-10-01", docs)).toThrow("existing public summary differs");
      expect(() => exportStudy(join(root, "study"), "20261001", docs)).toThrow("YYYY-MM-DD");
      expect(existsSync(join(docs, "cumulative-skill-v9-pool-results-20261001.json"))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("sorting is recursive and the sanitizer refuses private keys and inline artifacts", () => {
    expect(canonicalize(sortKeys({ b: [{ z: 1, a: { y: 2, x: 3 } }], a: null }))).toBe(canonicalize({ a: null, b: [{ a: { x: 3, y: 2 }, z: 1 }] }));
    expect(publicText({ b: 1, a: [2] })).toBe('{\n  "a": [\n    2\n  ],\n  "b": 1\n}\n');
    expect(() => assertPublic({ blocks: [{ seed: { attempts: [{ outputs: {} }] } }] })).toThrow("blocks[0].seed.attempts[0].outputs: private key");
    expect(() => assertPublic({ rows: [{ cells: [] }] })).toThrow("private key");
    expect(() => assertPublic({ arm: { manifest: { program: 1 } } })).toThrow("arm.manifest: inline artifact");
    expect(() => assertPublic({ manifest: hash(1), session: null, report: "not a digest" })).toThrow("report: inline artifact");
    expect(() => assertPublic({ manifest: hash(1), session: null, counts: { scorerPassed: 1 } })).not.toThrow();
  });

  test("results, freeze, and replay must belong together", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-export-bind-"));
    try {
      const study = join(root, "study");
      const { results } = fixtureStudy(study, { replay: true });
      const replay = JSON.parse(readFileSync(join(study, "replay.json"), "utf8")) as JsonObject;
      writeFileSync(join(study, "replay.json"), canonicalize({ ...replay, results: hash(2) }));
      expect(() => publicSummary(study, "2026-10-01")).toThrow("replay does not verify these results");
      rmSync(join(study, "replay.json"));
      writeFileSync(join(study, "results.json"), canonicalize({ ...results, freeze: hash(3) }));
      expect(() => publicSummary(study, "2026-10-01")).toThrow("results do not belong to this freeze");
      writeFileSync(join(study, "results.json"), canonicalize(results));
      writeFileSync(join(study, "protocol.json"), canonicalize({ ...PROTOCOL, concurrency: 2 } as unknown as JsonValue));
      expect(() => publicSummary(study, "2026-10-01")).toThrow("frozen protocol differs from the freeze");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
