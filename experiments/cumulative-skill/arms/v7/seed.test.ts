import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { effectRequestDigest, scriptedExecutor, type EffectRequest } from "../../../../src/effects";
import { expectedTaskOutput, taskSpecData } from "../../../../src/experiment-task";
import { parseHabitatBudget } from "../../../../src/habitat-budget";
import { MemoryStore } from "../../../../src/store";
import { asObject, canonicalize, type JsonValue } from "../../../../src/values";
import { seedTrainingExamples } from "./generators";
import { ROUND_SCHEDULE, SEED_BUDGET, seedTask } from "./protocol";
import { generateStudySeed, verifySeedEvidence, type SeedSummary } from "./seed";

const first = seedTask("cal-a");
const library = asObject(JSON.parse(readFileSync(join(import.meta.dir, "../../pipeline/record-triage.algal.json"), "utf8")), "library");
const generated = { ...library, key: "organism:v7-seed-fixture" };
const revised = { ...library, key: "organism:v7-revised-fixture" };
const opts = { first, blockId: "cal-a", corpus: "cal-a" };
const labels = (split: "train" | "validation" | "development", wrong = false) => Object.fromEntries(
  first.inputs.find(batch => batch.split === split)!.expect.out.results.map(row => [
    row.recordId, wrong ? first.taxonomy.classes.find(c => c.id !== row.label)!.id : row.label,
  ]),
);
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

describe("v7 seed acquisition with development feedback", () => {
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
    expect(result.summary.attempts.map(a => a.development)).toEqual([{ passed: 1, total: 1 }, { passed: 0, total: 1 }, null]);
    expect(result.summary.attempts.map(a => a.repeatedManifest)).toEqual([false, false, true]);
    expect(result.summary.attempts.every(a => a.request !== null && !a.duplicateRequest)).toBe(true);
    expect(new Set(result.summary.attempts.map(a => a.request)).size).toBe(3);
    expect(result.summary.duplicateRequests).toBe(0);
    expect(result.summary.attempts[1]!.developmentHistory).toEqual([{ generation: 1, round: "contrastive-examples", passed: 1, total: 1 }]);
    expect(result.summary.attempts[2]!.developmentHistory).toEqual([
      { generation: 1, round: "contrastive-examples", passed: 1, total: 1 }, { generation: 2, round: "error-analysis", passed: 0, total: 1 }]);
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
      expect(result.summary.attempts.map(a => a.development)).toEqual([{ passed: 0, total: 1 }, { passed: 0, total: 1 }]);
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
    expect(attempt.development).toEqual({ passed: 0, total: 1 });
    const record = asObject(await tightStore.getValue(attempt.developmentRecord!), "record");
    expect([record.outcome, record.receipt, record.passed]).toEqual(["refused", null, 0]);
    const ledger = parseHabitatBudget(await tightStore.getValue(record.account as Digest));
    expect(ledger.outcome).toBe("exhausted");
    expect(ledger.runs).toHaveLength(0);
    expect((await verifySeedEvidence(tight.summary, first, tightStore)).charged.runs).toBe(4);
  });

  test("rejects a rehashed development score, a stripped development record, and a false history", async () => {
    const store = new MemoryStore();
    const result = await generateStudySeed({ ...opts, store, maxGenerations: 2,
      executors: execution({ writer: { manifest: generated }, classify: {} }).executors });
    expect(result.summary.attempts.map(a => a.development)).toEqual([{ passed: 0, total: 1 }, { passed: 0, total: 1 }]);
    const inflated = structuredClone(result.summary);
    inflated.attempts[0]!.development = { passed: 1, total: 1 };
    await expect(verifySeedEvidence(inflated, first, store)).rejects.toThrow("development score differs from its record");
    const record = asObject(await store.getValue(result.summary.attempts[0]!.developmentRecord!), "record");
    const forged = structuredClone(result.summary);
    forged.attempts[0]!.developmentRecord = await store.putValue({ ...record, passed: 1 });
    forged.attempts[0]!.development = { passed: 1, total: 1 };
    await expect(verifySeedEvidence(forged, first, store)).rejects.toThrow("development score differs from receipt");
    const stripped = structuredClone(result.summary);
    stripped.attempts[0]!.development = null;
    stripped.attempts[0]!.developmentRecord = null;
    await expect(verifySeedEvidence(stripped, first, store)).rejects.toThrow("development score presence mismatch");
    const history = structuredClone(result.summary);
    history.attempts[1]!.developmentHistory = [{ generation: 1, round: "contrastive-examples", passed: 1, total: 1 }];
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
  });
});
