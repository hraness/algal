import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { effectRequestDigest, scriptedExecutor, type EffectRequest } from "../../../../src/effects";
import { expectedTaskOutput, taskSpecData } from "../../../../src/experiment-task";
import { parseHabitatBudget } from "../../../../src/habitat-budget";
import { MemoryStore } from "../../../../src/store";
import { asObject, canonicalize, type JsonObject, type JsonValue } from "../../../../src/values";
import { seedTrainingExamples, studyGenerator } from "./generators";
import { ROUND_SCHEDULE, SEED_BUDGET, seedTask } from "./protocol";
import { caseDiagnostics, DEVELOPMENT_CONTRACT, generateStudySeed, SEED_CONTRACT, selectionDiagnostics, verifySeedEvidence,
  type SeedSummary } from "./seed";

const first = seedTask("p-01");
const library = asObject(JSON.parse(readFileSync(join(import.meta.dir, "../../pipeline/record-triage.algal.json"), "utf8")), "library");
const generated = { ...library, key: "organism:v9-pool-seed-fixture" };
const revised = { ...library, key: "organism:v9-pool-revised-fixture" };
const opts = { first, blockId: "p-01", corpus: "p-01" };
// `wrong` mislabels every record (true) or the first n records (a number).
const labels = (split: "train" | "validation" | "development", wrong: boolean | number = false) => Object.fromEntries(
  first.inputs.find(batch => batch.split === split)!.expect.out.results.map((row, i) => [
    row.recordId, (wrong === true || (typeof wrong === "number" && i < wrong)) ? first.taxonomy.classes.find(c => c.id !== row.label)!.id : row.label,
  ]),
);
// The agreement value of an all-wrong development batch under the fixture task.
const WRONG_SCORE = 0;
function execution(responses: Record<string, JsonValue>) {
  const requests: EffectRequest[] = [];
  const inner = scriptedExecutor(responses);
  return { requests, executors: [{ ...inner, async execute(request: EffectRequest) {
    requests.push(structuredClone(request));
    return inner.execute(request);
  } }] };
}
function passing() {
  return execution({ writer: { manifest: generated }, classify: [labels("train"), labels("train"), labels("validation")] });
}
/** A stage closed by `reconcile` from a retained snapshot: the same bytes with the terminal marker. */
const closed = (snapshot: SeedSummary): SeedSummary => ({ ...structuredClone(snapshot), termination: "interrupted" });
const reconciliation = (snapshot: SeedSummary) => ({ snapshot: digestCanonical(snapshot as unknown as JsonValue) });

describe("v9-pool seed acquisition with development feedback", () => {
  test("keeps the v8 contract ids on the byte-identical seed and development shapes", () => {
    expect(SEED_CONTRACT).toBe("algal.study-seed.v3");
    expect(DEVELOPMENT_CONTRACT).toBe("algal.study-development-score.v2");
    // The writer manifests carry the v8 organism keys, so the writer request identity is v8's.
    expect(asObject(studyGenerator("generator.algal.json").manifest, "generator").key).toBe("organism:record-triage-generator-v8");
    expect(asObject(studyGenerator("reviser.algal.json").manifest, "reviser").key).toBe("organism:record-triage-reviser-v8");
  });

  test("scores a failed candidate on the development batch and feeds only the bounded score forward", async () => {
    const store = new MemoryStore();
    // Generation 1: training passes, validation fails, development passes.
    // Generation 2: training fails, validation fails, development fails.
    // Generation 3: qualifies; no development run follows qualification.
    const run = execution({
      writer: [{ manifest: generated }, { manifest: revised }, { manifest: generated }],
      classify: [labels("train"), labels("train"), labels("validation", true), labels("development"),
        labels("train", true), labels("train", true), labels("validation", true), labels("development", true),
        labels("train"), labels("train"), labels("validation")],
    });
    const snapshots: SeedSummary[] = [];
    const result = await generateStudySeed({ ...opts, store, executors: run.executors, onAttempt: snapshot => { snapshots.push(snapshot); } });
    expect(result.summary.qualified).toBe(true);
    expect(result.summary.termination).toBe("qualified");
    expect(result.summary.attempts.map(a => a.round)).toEqual(ROUND_SCHEDULE.slice(0, 3));
    expect(result.summary.attempts.map(a => a.mode)).toEqual(["generate", "revise", "revise"]);
    expect(result.summary.attempts.map(a => a.development)).toEqual([{ score: 1 }, { score: WRONG_SCORE }, null]);
    expect(result.summary.attempts.map(a => a.repeatedManifest)).toEqual([false, false, true]);
    expect(result.summary.attempts.every(a => a.request !== null && !a.duplicateRequest)).toBe(true);
    expect(new Set(result.summary.attempts.map(a => a.request)).size).toBe(3);
    expect(result.summary.duplicateRequests).toBe(0);
    expect(result.summary.attempts[1]!.developmentHistory).toEqual([{ generation: 1, round: "contrastive-examples", score: 1 }]);
    expect(result.summary.attempts[2]!.developmentHistory).toEqual([
      { generation: 1, round: "contrastive-examples", score: 1 }, { generation: 2, round: "error-analysis", score: WRONG_SCORE }]);
    const account = await verifySeedEvidence(result.summary, first, store);
    expect(account.limits).toEqual(SEED_BUDGET);
    // 3 generations x (writer, task run, training case, validation case) + 2 development runs.
    expect(account.charged.runs).toBe(14);
    expect(snapshots.at(-1)!.inFlight).toBeNull();
    const writers = run.requests.filter(request => request.cellId === "writer");
    expect(writers).toHaveLength(3);
    const initial = asObject(writers[0]!.context.inputs, "writer inputs");
    expect(initial.task).toEqual(taskSpecData(first));
    expect(initial.training).toEqual(seedTrainingExamples(first));
    expect([initial.generation, initial.round, initial.development]).toEqual([1, "contrastive-examples", []]);
    expect(initial).not.toHaveProperty("evidence");
    const third = asObject(writers[2]!.context.inputs, "writer inputs");
    expect([third.generation, third.round]).toEqual([3, "invariant-extraction"]);
    expect(third.development).toEqual(result.summary.attempts[2]!.developmentHistory);
    expect(Object.keys(asObject(third.evidence, "feedback")).sort()).toEqual(["actual", "expected", "records"]);
    for (const writer of writers) {
      const text = JSON.stringify(writer.context);
      expect(text).not.toContain("validation-");
      expect(text).not.toContain("holdout-");
      expect(text).not.toContain("development-");
      for (const attempt of result.summary.attempts) if (attempt.report !== null) expect(text).not.toContain(attempt.report);
    }
    const developmentRuns = run.requests.filter(request => request.cellId === "classify")
      .filter(request => JSON.stringify(request.context).includes("development-01"));
    expect(developmentRuns).toHaveLength(2);
  });

  test("generation and round make otherwise identical writer requests distinct", async () => {
    const store = new MemoryStore();
    const run = execution({ writer: { manifest: {} }, classify: {} });
    const result = await generateStudySeed({ ...opts, store, executors: run.executors, maxGenerations: 3 });
    expect(result.summary.qualified).toBe(false);
    expect(result.summary.termination).toBe("generation-limit");
    expect(result.summary.attempts.map(a => a.outcome)).toEqual(["invalid", "invalid", "invalid"]);
    expect(result.summary.attempts.map(a => a.fallback)).toEqual([null, "no-valid-prior", "no-valid-prior"]);
    expect(result.summary.attempts.map(a => a.development)).toEqual([null, null, null]);
    const requests = run.requests.filter(request => request.cellId === "writer").map(effectRequestDigest);
    expect(new Set(requests).size).toBe(3);
    expect(new Set(result.summary.attempts.map(a => a.request)).size).toBe(3);
    await verifySeedEvidence(result.summary, first, store);
  });

  test("changing only validation, holdout, and development text/truth leaves every writer request unchanged", async () => {
    const changed = structuredClone(first);
    for (const batch of changed.inputs.filter(batch => batch.split !== "train")) {
      for (const row of batch.records) row.body = "sealed alternative text";
      batch.expect.out = expectedTaskOutput(changed, batch.records, batch.records.map(() => changed.taxonomy.classes.at(-1)!.id));
    }
    const { digest: _oldDigest, ...body } = changed;
    changed.digest = digestCanonical(body as unknown as JsonValue);
    const writers: Digest[][] = [];
    for (const task of [first, changed]) {
      const store = new MemoryStore();
      const run = execution({ writer: { manifest: generated }, classify: {} });
      const result = await generateStudySeed({ ...opts, first: task, store, executors: run.executors, maxGenerations: 2 });
      expect(result.summary.qualified).toBe(false);
      expect(result.summary.attempts.map(a => a.development)).toEqual([{ score: 0 }, { score: 0 }]);
      await verifySeedEvidence(result.summary, task, store);
      writers.push(run.requests.filter(request => request.cellId === "writer").map(effectRequestDigest));
    }
    expect(writers[0]).toHaveLength(2);
    expect(writers[1]).toEqual(writers[0]);
  });

  test("accepts the first validation pass even when that candidate's training batch fails", async () => {
    const store = new MemoryStore();
    const run = execution({ writer: { manifest: generated },
      classify: [labels("train", true), labels("train", true), labels("validation")] });
    const result = await generateStudySeed({ ...opts, store, executors: run.executors });
    expect(result.summary.qualified).toBe(true);
    expect(result.summary.train).toEqual({ passed: 0, total: 1 });
    expect(result.summary.validation).toEqual({ passed: 1, total: 1 });
    expect(result.summary.attempts).toHaveLength(1);
    expect(result.summary.attempts[0]!.development).toBeNull();
    await verifySeedEvidence(result.summary, first, store);
  });

  test("preserves generation-limit and exhausted outcomes, including a refused development run", async () => {
    const failedStore = new MemoryStore();
    const failed = await generateStudySeed({ ...opts, store: failedStore, maxGenerations: 2,
      executors: execution({ writer: { manifest: {} } }).executors });
    expect(failed.summary.termination).toBe("generation-limit");
    expect((await verifySeedEvidence(failed.summary, first, failedStore)).charged.runs).toBe(2);
    const store = new MemoryStore();
    const result = await generateStudySeed({ ...opts, store, budget: { work: 500000, attempts: 64, runs: 64 },
      executors: execution({ writer: { manifest: generated } }).executors });
    expect(result.summary.termination).toBe("budget-limit");
    expect(result.summary.attempts[0]!.outcome).toBe("exhausted");
    expect(result.summary.attempts[0]!.development).toBeNull();
    expect((await verifySeedEvidence(result.summary, first, store)).charged.runs).toBe(1);
    // Exactly enough runs for the writer and the three selection cases: no
    // development run is attempted once the account is spent.
    const refusedStore = new MemoryStore();
    const refused = await generateStudySeed({ ...opts, store: refusedStore, budget: { ...SEED_BUDGET, runs: 4 },
      executors: execution({ writer: { manifest: generated }, classify: {} }).executors });
    expect(refused.summary.termination).toBe("budget-limit");
    expect(refused.summary.attempts).toHaveLength(1);
    expect(refused.summary.attempts[0]!.development).toBeNull();
    expect(refused.summary.attempts[0]!.developmentRecord).toBeNull();
    expect((await verifySeedEvidence(refused.summary, first, refusedStore)).charged.runs).toBe(4);
    // One agent call of headroom is below the candidate's two-call ceiling:
    // the development reservation is refused and retained as a record that
    // charged nothing.
    const tightStore = new MemoryStore();
    const tight = await generateStudySeed({ ...opts, store: tightStore, budget: { ...SEED_BUDGET, attempts: 5 },
      executors: execution({ writer: { manifest: generated }, classify: {} }).executors });
    expect(tight.summary.termination).toBe("budget-limit");
    const attempt = tight.summary.attempts[0]!;
    expect(attempt.development).toEqual({ score: 0 });
    const record = asObject(await tightStore.getValue(attempt.developmentRecord!), "record");
    expect([record.outcome, record.receipt, record.score]).toEqual(["refused", null, 0]);
    const ledger = parseHabitatBudget(await tightStore.getValue(record.account as Digest));
    expect(ledger.outcome).toBe("exhausted");
    expect(ledger.runs).toHaveLength(0);
    expect((await verifySeedEvidence(tight.summary, first, tightStore)).charged.runs).toBe(4);
  });

  test("rejects a rehashed development score, a stripped development record, and a false history", async () => {
    const store = new MemoryStore();
    const result = await generateStudySeed({ ...opts, store, maxGenerations: 2,
      executors: execution({ writer: { manifest: generated }, classify: {} }).executors });
    expect(result.summary.attempts.map(a => a.development)).toEqual([{ score: 0 }, { score: 0 }]);
    const inflated = structuredClone(result.summary);
    inflated.attempts[0]!.development = { score: 1 };
    await expect(verifySeedEvidence(inflated, first, store)).rejects.toThrow("development score differs from its record");
    const record = asObject(await store.getValue(result.summary.attempts[0]!.developmentRecord!), "record");
    const forged = structuredClone(result.summary);
    forged.attempts[0]!.developmentRecord = await store.putValue({ ...record, score: 1 });
    forged.attempts[0]!.development = { score: 1 };
    await expect(verifySeedEvidence(forged, first, store)).rejects.toThrow("development score differs from receipt");
    const stripped = structuredClone(result.summary);
    stripped.attempts[0]!.development = null;
    stripped.attempts[0]!.developmentRecord = null;
    await expect(verifySeedEvidence(stripped, first, store)).rejects.toThrow("development score presence mismatch");
    const history = structuredClone(result.summary);
    history.attempts[1]!.developmentHistory = [{ generation: 1, round: "contrastive-examples", score: 1 }];
    await expect(verifySeedEvidence(history, first, store)).rejects.toThrow("development history mismatch");
    const round = structuredClone(result.summary);
    round.attempts[1]!.round = "fresh-synthesis";
    await expect(verifySeedEvidence(round, first, store)).rejects.toThrow("round mismatch");
  });

  test("retains a duplicate writer request as a protocol failure and stops without retrying", async () => {
    const store = new MemoryStore();
    const run = execution({ writer: { manifest: generated }, classify: {} });
    const result = await generateStudySeed({ ...opts, store, executors: run.executors, maxGenerations: 3 });
    expect(result.summary.termination).toBe("generation-limit");
    // Rewrite the second attempt's request identity to the first's, as a
    // driver that ignored generation and round would have produced.
    const altered = structuredClone(result.summary);
    altered.attempts[1]!.request = altered.attempts[0]!.request;
    altered.attempts[1]!.duplicateRequest = true;
    await expect(verifySeedEvidence(altered, first, store)).rejects.toThrow("writer request identity mismatch");
    const flagged = structuredClone(result.summary);
    flagged.attempts[1]!.duplicateRequest = true;
    await expect(verifySeedEvidence(flagged, first, store)).rejects.toThrow("duplicate request flag mismatch");
    const miscounted = structuredClone(result.summary);
    miscounted.duplicateRequests = 1;
    await expect(verifySeedEvidence(miscounted, first, store)).rejects.toThrow("duplicate request count mismatch");
    const repeated = structuredClone(result.summary);
    repeated.attempts[1]!.repeatedManifest = false;
    await expect(verifySeedEvidence(repeated, first, store)).rejects.toThrow("repeated manifest flag mismatch");
  });

  test("binds training evidence and rejects a rehashed selection report claiming a false pass", async () => {
    const store = new MemoryStore();
    const result = await generateStudySeed({ ...opts, store, maxGenerations: 2,
      executors: execution({ writer: { manifest: generated }, classify: {} }).executors });
    const altered = structuredClone(result.summary);
    altered.attempts[1]!.trainEvidence = await store.putValue({ validation: "injected" });
    await expect(verifySeedEvidence(altered, first, store)).rejects.toThrow("training lineage");
    const attempt = result.summary.attempts[0]!;
    const report = asObject(await store.getValue(attempt.report!), "report");
    const candidates = report.candidates as JsonValue[];
    const candidate = asObject(candidates[0], "candidate");
    const cases = candidate.cases as JsonValue[];
    asObject(cases[1], "validation").passed = true;
    const fakeReport = await store.putValue(report);
    const run = asObject(await store.getValue(attempt.run), "run");
    asObject(run.promote, "promote").report = fakeReport;
    const fakeRun = await store.putValue(run);
    const session = asObject(await store.getValue(attempt.session), "session");
    asObject((session.tasks as JsonValue[])[0], "task").run = fakeRun;
    const tampered = structuredClone(result.summary);
    Object.assign(tampered.attempts[0]!, { report: fakeReport, run: fakeRun, session: await store.putValue(session) });
    await expect(verifySeedEvidence(tampered, first, store)).rejects.toThrow("selection score differs");
  });

  test("rejects a selection without an executed candidate and substitution of another runnable manifest", async () => {
    const store = new MemoryStore();
    const result = await generateStudySeed({ ...opts, store, executors: passing().executors });
    for (const modification of ["missing-execution", "substitute-manifest"]) {
      const summary = structuredClone(result.summary);
      const attempt = summary.attempts[0]!;
      const run = asObject(await store.getValue(attempt.run), "run");
      if (modification === "missing-execution") {
        run.outcome = "invalid"; run.receipt = null; run.args = null;
        attempt.outcome = "invalid";
      } else {
        const replacement = await store.putManifest(parseOrganismManifest(revised));
        run.manifest = replacement; attempt.manifest = replacement;
      }
      attempt.run = await store.putValue(run);
      const session = asObject(await store.getValue(attempt.session), "session");
      asObject((session.tasks as JsonValue[])[0], "task").run = attempt.run;
      attempt.session = await store.putValue(session);
      await expect(verifySeedEvidence(summary, first, store)).rejects.toThrow(
        modification === "missing-execution" ? "selection lacks an executed" : "manifest differs from generated",
      );
    }
  });

  test("rejects a task without a development batch and a v6 summary contract", async () => {
    const learning = structuredClone(first);
    learning.inputs = learning.inputs.slice(0, 3);
    const { digest: _d, ...body } = learning;
    learning.digest = digestCanonical(body as unknown as JsonValue);
    await expect(generateStudySeed({ ...opts, first: learning, store: new MemoryStore(), executors: passing().executors }))
      .rejects.toThrow("no development batch");
    const store = new MemoryStore();
    const result = await generateStudySeed({ ...opts, store, executors: passing().executors });
    await expect(verifySeedEvidence({ ...result.summary, contract: "algal.study-seed.v2" as never }, first, store)).rejects.toThrow("protocol mismatch");
    expect(canonicalize(manifestToJson(result.manifest!))).toBe(canonicalize(manifestToJson(parseOrganismManifest(generated))));
  });

  test("persists an explicit incomplete descriptor on host interruption with no automatic retry", async () => {
    class InterruptedStore extends MemoryStore {
      override async putValue(value: JsonValue): Promise<Digest> {
        if (value !== null && typeof value === "object" && !Array.isArray(value) && value.contract === "algal.experiment-session.v1") {
          throw new Error("synthetic session persistence failure");
        }
        return super.putValue(value);
      }
    }
    const store = new InterruptedStore();
    const run = passing();
    const snapshots: SeedSummary[] = [];
    await expect(generateStudySeed({ ...opts, store, executors: run.executors,
      onAttempt: snapshot => { snapshots.push(snapshot); } })).rejects.toThrow("synthetic session persistence failure");
    const last = snapshots.at(-1)!;
    expect(last.termination).toBe("interrupted");
    expect(last.qualified).toBe(false);
    expect(last.inFlight?.generation).toBe(1);
    expect(last.inFlight?.round).toBe("contrastive-examples");
    await expect(verifySeedEvidence(last, first, store)).rejects.toThrow("unfinished seed evidence");
    // Closed by reconcile from that retained snapshot: no completed attempt,
    // the in-flight plan is the protocol's first generation.
    const account = await verifySeedEvidence(last, first, store, reconciliation(last));
    expect(account.charged.runs).toBe(0);
    await expect(verifySeedEvidence(last, first, store, { snapshot: digestCanonical({ forged: true }) }))
      .rejects.toThrow("reconciled summary differs from its retained snapshot");
  });

  test("verifies a stage reconciled from a mid-search snapshot and rejects every other closing", async () => {
    const store = new MemoryStore();
    // Generation 1: validation fails, development scored. Generation 2 qualifies.
    const run = execution({
      writer: [{ manifest: generated }, { manifest: revised }],
      classify: [labels("train"), labels("train"), labels("validation", true), labels("development"),
        labels("train"), labels("train"), labels("validation")],
    });
    const snapshots: SeedSummary[] = [];
    const result = await generateStudySeed({ ...opts, store, executors: run.executors, onAttempt: snapshot => { snapshots.push(snapshot); } });
    expect(result.summary.qualified).toBe(true);
    // Retained in order: initial, gen 1 in flight, gen 1 done, gen 2 in flight, qualified.
    expect(snapshots.map(s => [s.termination, s.attempts.length, s.inFlight?.generation ?? null])).toEqual([
      ["in-progress", 0, null], ["in-progress", 0, 1], ["in-progress", 1, null], ["in-progress", 1, 2], ["qualified", 2, null]]);
    const between = snapshots[2]!;
    const inFlight = snapshots[3]!;
    for (const snapshot of [snapshots[0]!, snapshots[1]!, between, inFlight]) {
      await expect(verifySeedEvidence(snapshot, first, store)).rejects.toThrow("unfinished seed evidence");
      await expect(verifySeedEvidence(closed(snapshot), first, store)).rejects.toThrow("unfinished seed evidence");
      await expect(verifySeedEvidence(closed(snapshot), first, store, reconciliation(closed(snapshots[4]!))))
        .rejects.toThrow("reconciled summary differs from its retained snapshot");
    }
    // Writer, task run, train and validation cases, then the development run.
    expect((await verifySeedEvidence(closed(between), first, store, reconciliation(between))).charged.runs).toBe(5);
    expect((await verifySeedEvidence(closed(inFlight), first, store, reconciliation(inFlight))).charged.runs).toBe(5);
    // A snapshot the driver wrote as `interrupted` reconciles by its own digest.
    const thrown = closed(inFlight);
    await verifySeedEvidence(thrown, first, store, reconciliation(thrown));
    // A completed search is never reconciled.
    await expect(verifySeedEvidence(result.summary, first, store, reconciliation(result.summary)))
      .rejects.toThrow("reconciliation record given for a seed not closed as interrupted");
    // Closing the qualified snapshot hides a qualified attempt: the exposed
    // candidate is rejected first, and stripping it exposes the promotion.
    const hidden = closed(snapshots[4]!);
    await expect(verifySeedEvidence(hidden, first, store, reconciliation(hidden))).rejects.toThrow("interrupted seed exposes a selected candidate");
    const stripped: SeedSummary = { ...hidden, qualified: false, manifest: null, report: null, catalog: null, train: null, validation: null };
    await expect(verifySeedEvidence(stripped, first, store, reconciliation(stripped))).rejects.toThrow("interrupted seed hides a qualified attempt");
    // The retained attempts still verify: a rehashed development score or a
    // trimmed attempt list is rejected under the closed snapshot's digest.
    const inflated = closed(between);
    expect(inflated.attempts[0]!.development).toEqual({ score: 1 });
    inflated.attempts[0]!.development = { score: 0.5 };
    await expect(verifySeedEvidence(inflated, first, store, reconciliation(inflated))).rejects.toThrow("development score differs from its record");
    const trimmed = closed(inFlight);
    trimmed.attempts = [];
    await expect(verifySeedEvidence(trimmed, first, store, reconciliation(inFlight))).rejects.toThrow("reconciled summary differs from its retained snapshot");
    // Under its own digest the trimmed list still fails the account join.
    await expect(verifySeedEvidence(trimmed, first, store, reconciliation(trimmed))).rejects.toThrow("aggregate account mismatch");
    const regressed = closed(inFlight);
    regressed.inFlight = { ...regressed.inFlight!, generation: 1, round: "contrastive-examples" };
    await expect(verifySeedEvidence(regressed, first, store, reconciliation(regressed))).rejects.toThrow("in-flight plan order or round mismatch");
    // The in-flight plan must be the protocol's next generation from the verified state.
    const replanned = closed(inFlight);
    replanned.inFlight = { ...replanned.inFlight!, configuration: replanned.attempts[0]!.configuration };
    await expect(verifySeedEvidence(replanned, first, store, reconciliation(replanned))).rejects.toThrow("in-flight configuration differs");
    const rehistoried = closed(inFlight);
    rehistoried.inFlight = { ...rehistoried.inFlight!, developmentHistory: [] };
    await expect(verifySeedEvidence(rehistoried, first, store, reconciliation(rehistoried))).rejects.toThrow("in-flight plan development history mismatch");
    // Retained attempts that end the search on their own are not an interruption.
    const limitedStore = new MemoryStore();
    const limited = await generateStudySeed({ ...opts, store: limitedStore, maxGenerations: 1,
      executors: execution({ writer: { manifest: generated }, classify: {} }).executors });
    expect(limited.summary.termination).toBe("generation-limit");
    const ended = closed(limited.summary);
    await expect(verifySeedEvidence(ended, first, limitedStore, reconciliation(ended))).rejects.toThrow("interrupted seed carries a terminating attempt");
  });

  test("reads exact rows, labels, summaries, and misses from a stored selection report", async () => {
    const store = new MemoryStore();
    const run = execution({
      writer: [{ manifest: generated }, { manifest: revised }],
      classify: [labels("train"), labels("train"), labels("validation", 3), labels("development"),
        labels("train"), labels("train"), labels("validation")],
    });
    const result = await generateStudySeed({ ...opts, store, executors: run.executors });
    expect(result.summary.qualified).toBe(true);
    const reports = await Promise.all(result.summary.attempts.map(a => store.getValue(a.report!)));
    const partial = selectionDiagnostics(reports[0]);
    expect(partial.train).toEqual({ total: 24, exactRows: 24, labelsCorrect: 24, summaryExact: true, missedRecordIds: [], problems: [] });
    const validationIds = first.inputs.find(batch => batch.split === "validation")!.expect.out.results.map(row => row.recordId);
    expect(partial.validation).toEqual({ total: 12, exactRows: 9, labelsCorrect: 9, summaryExact: false,
      missedRecordIds: validationIds.slice(0, 3), problems: [] });
    const exact = selectionDiagnostics(reports[1]);
    expect(exact.validation).toEqual({ total: 12, exactRows: 12, labelsCorrect: 12, summaryExact: true, missedRecordIds: [], problems: [] });
    // The development case reads through the same pure diagnosis.
    const development = first.inputs.find(batch => batch.split === "development")!;
    const truth = { out: development.expect.out as unknown as JsonValue };
    expect(caseDiagnostics({ expect: truth, outputs: truth }).exactRows).toBe(12);
    await expect(Promise.resolve().then(() => selectionDiagnostics({ ...asObject(reports[0], "report"), candidates: [] })))
      .rejects.toThrow("one candidate");
  });

  test("diagnoses a missing row, a duplicate record id, and malformed output without a provider call", () => {
    const rows = [
      { recordId: "r-1", label: "a", decision: "close", priority: "p1", queue: "support" },
      { recordId: "r-2", label: "b", decision: "defer", priority: "p2", queue: "engineering" },
    ];
    const summary = [{ name: "total", counts: [{ key: "records", count: 2 }] }];
    const expect_ = { out: { results: rows, summary } };
    const report = (out: JsonValue) => ({ promoted: "sha256:x", candidates: [{ cases: [
      { id: "t", split: "train", expect: expect_, outputs: { out } },
      { id: "v", split: "validation", expect: expect_, outputs: { out: { results: rows, summary } } },
    ] }] });
    const exact = selectionDiagnostics(report({ results: rows, summary }));
    expect(exact.train).toEqual({ total: 2, exactRows: 2, labelsCorrect: 2, summaryExact: true, missedRecordIds: [], problems: [] });
    // A missing row is a miss; a right label on a wrong row counts once.
    const missing = selectionDiagnostics(report({ results: [rows[0]!], summary })).train;
    expect(missing).toEqual({ total: 2, exactRows: 1, labelsCorrect: 1, summaryExact: true, missedRecordIds: ["r-2"], problems: [] });
    const relabeled = selectionDiagnostics(report({ results: [rows[0]!, { ...rows[1]!, queue: "trust" }], summary: [] })).train;
    expect(relabeled).toEqual({ total: 2, exactRows: 1, labelsCorrect: 2, summaryExact: false, missedRecordIds: ["r-2"], problems: [] });
    // Duplicate ids void the record list, as arms/v5/grade.ts does; the summary still compares.
    const duplicate = selectionDiagnostics(report({ results: [rows[0]!, rows[0]!], summary })).train;
    expect(duplicate).toEqual({ total: 2, exactRows: 0, labelsCorrect: 0, summaryExact: true, missedRecordIds: ["r-1", "r-2"],
      problems: ["invalid or duplicate result records"] });
    const unlabeled = selectionDiagnostics(report({ results: [{ recordId: "r-1" }], summary })).train;
    expect(unlabeled.problems).toEqual(["invalid or duplicate result records"]);
    expect(unlabeled.exactRows).toBe(0);
    // Output that is not a record-triage object at all.
    for (const out of ["text", null, 7, [rows]] as JsonValue[]) {
      expect(selectionDiagnostics(report(out)).train).toEqual({ total: 2, exactRows: 0, labelsCorrect: 0, summaryExact: false,
        missedRecordIds: ["r-1", "r-2"], problems: ["invalid record-triage output"] });
    }
    expect(caseDiagnostics({ expect: expect_, outputs: null }).problems).toEqual(["invalid record-triage output"]);
    expect(caseDiagnostics({ expect: expect_, outputs: {} }).problems).toEqual(["invalid record-triage output"]);
    // Malformed truth is a caller error, never a diagnosis.
    expect(() => caseDiagnostics({ expect: { out: { results: [], summary } }, outputs: { out: { results: rows, summary } } })).toThrow("expected 1..64 records");
    expect(() => caseDiagnostics({ expect: { out: { results: rows } }, outputs: { out: { results: rows, summary } } })).toThrow("summary absent");
    // A report must carry exactly one case per split.
    const twice = report({ results: rows, summary });
    (twice.candidates[0]!.cases as JsonObject[]).push({ id: "t2", split: "train", expect: expect_, outputs: {} });
    expect(() => selectionDiagnostics(twice)).toThrow("exactly one train case");
  });

  test("reports a fractional development score that the pass indicator would hide", async () => {
    // Generation 1: training passes, validation fails, three of twelve
    // development labels wrong. Generation 2: qualifies.
    const store = new MemoryStore();
    const run = execution({
      writer: [{ manifest: generated }, { manifest: revised }],
      classify: [labels("train"), labels("train"), labels("validation", true), labels("development", 3),
        labels("train"), labels("train"), labels("validation")],
    });
    const result = await generateStudySeed({ ...opts, store, executors: run.executors });
    expect(result.summary.qualified).toBe(true);
    const partial = result.summary.attempts[0]!.development!.score;
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(0.9);
    expect(Math.round(partial * 100) / 100).toBe(partial);
    expect(result.summary.attempts[1]!.developmentHistory).toEqual([{ generation: 1, round: "contrastive-examples", score: partial }]);
    const record = asObject(await store.getValue(result.summary.attempts[0]!.developmentRecord!), "record");
    expect(record.score).toBe(partial);
    const request = run.requests.filter(r => r.cellId === "writer")[1]!;
    expect(canonicalize(request as unknown as JsonValue)).toContain(`"score":${partial}`);
    await verifySeedEvidence(result.summary, first, store);
    const nudged = structuredClone(result.summary);
    nudged.attempts[0]!.development = { score: Math.round((partial + 0.01) * 100) / 100 };
    await expect(verifySeedEvidence(nudged, first, store)).rejects.toThrow("development score differs from its record");
  });
});
