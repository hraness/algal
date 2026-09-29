import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { digestCanonical, type Digest } from "../../../../src/digest";
import { effectRequestDigest, scriptedExecutor, type EffectRequest } from "../../../../src/effects";
import { expectedTaskOutput, taskSpecData } from "../../../../src/experiment-task";
import { parseHabitatBudget } from "../../../../src/habitat-budget";
import { MemoryStore } from "../../../../src/store";
import { asObject, type JsonValue } from "../../../../src/values";
import { seedTrainingExamples } from "./generators";
import { learningTasks, SEED_BUDGET } from "./protocol";
import { generateStudySeed, verifySeedEvidence, type SeedSummary } from "./seed";

const first = learningTasks("cal-a")[0]!;
const library = asObject(JSON.parse(readFileSync(join(import.meta.dir, "../../pipeline/record-triage.algal.json"), "utf8")), "library");
const generated = { ...library, key: "organism:v6-seed-fixture" };
const revised = { ...library, key: "organism:v6-revised-fixture" };
const opts = { first, blockId: "cal-a", corpus: "cal-a" };
const labels = (split: "train" | "validation", wrong = false) => Object.fromEntries(
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

describe("v6 training-only seed acquisition", () => {
  test("records invalid emissions, failed training, last-valid fallback, and all costs before first passing validation", async () => {
    const store = new MemoryStore();
    const run = execution({
      writer: [{ manifest: {} }, { manifest: generated }, { manifest: {} }, { manifest: revised }],
      classify: [labels("train", true), labels("train", true), labels("validation", true),
        labels("train"), labels("train"), labels("validation")],
    });
    const snapshots: SeedSummary[] = [];
    const result = await generateStudySeed({ ...opts, store, executors: run.executors,
      onAttempt: snapshot => { snapshots.push(snapshot); } });
    expect(result.summary.qualified).toBe(true);
    expect(result.summary.attempts.map(a => a.mode)).toEqual(["generate", "generate", "revise", "revise"]);
    expect(result.summary.attempts[1]!.fallback).toBe("no-valid-prior");
    expect(result.summary.attempts.map(a => a.outcome)).toEqual(["invalid", "complete", "invalid", "complete"]);
    expect(result.summary.attempts[3]!.parentManifest).toBe(result.summary.attempts[1]!.manifest);
    expect(result.summary.attempts[3]!.trainEvidence).toBe(result.summary.attempts[2]!.trainEvidence);
    expect(result.catalog?.entries[0]?.taskId).toBe("seed-acquisition-01-4");
    const account = await verifySeedEvidence(result.summary, first, store);
    expect(account.limits).toEqual(SEED_BUDGET);
    expect(account.charged.runs).toBe(10);
    expect(account.charged.attempts).toBe(10);
    expect(snapshots[0]!.attempts).toEqual([]);
    expect(snapshots[1]!.inFlight?.generation).toBe(1);
    expect(snapshots.at(-1)!.inFlight).toBeNull();
    const writers = run.requests.filter(request => request.cellId === "writer");
    expect(writers).toHaveLength(4);
    const initial = asObject(writers[0]!.context.inputs, "writer inputs");
    expect(initial.task).toEqual(taskSpecData(first));
    expect(initial.training).toEqual(seedTrainingExamples(first));
    expect(initial).not.toHaveProperty("evidence");
    const inputs = asObject(writers[3]!.context.inputs, "writer inputs");
    const evidence = asObject(inputs.evidence, "feedback");
    expect(Object.keys(evidence).sort()).toEqual(["actual", "expected", "records"]);
    expect(evidence.expected).toEqual(seedTrainingExamples(first).expected);
    expect(evidence.actual).not.toEqual(evidence.expected);
    expect(inputs.kept).toEqual(manifestToJson(parseOrganismManifest(generated)));
    for (const writer of writers) {
      const text = JSON.stringify(writer.context);
      expect(text).not.toContain("validation-");
      expect(text).not.toContain("holdout-");
      expect(text).not.toContain(result.summary.attempts[1]!.report!);
    }
  });

  test("changing only validation and holdout text/truth leaves every writer request unchanged", async () => {
    const changed = structuredClone(first);
    for (const batch of changed.inputs.filter(batch => batch.split !== "train")) {
      for (const row of batch.records) row.body = "sealed alternative text";
      batch.expect.out = expectedTaskOutput(changed, batch.records,
        batch.records.map(() => changed.taxonomy.classes.at(-1)!.id));
    }
    const { digest: _oldDigest, ...body } = changed;
    changed.digest = digestCanonical(body as unknown as JsonValue);
    const writers: Digest[][] = [];
    for (const task of [first, changed]) {
      const store = new MemoryStore();
      const run = execution({ writer: { manifest: generated }, classify: {} });
      const result = await generateStudySeed({ ...opts, first: task, store, executors: run.executors, maxGenerations: 2 });
      expect(result.summary.qualified).toBe(false);
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
    await verifySeedEvidence(result.summary, first, store);
  });

  test("preserves generation-limit and exhausted outcomes without renewing the account", async () => {
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
    expect((await verifySeedEvidence(result.summary, first, store)).charged.runs).toBe(1);
    const prefixStore = new MemoryStore();
    const prefix = await generateStudySeed({ ...opts, store: prefixStore, budget: { ...SEED_BUDGET, runs: 3 },
      executors: passing().executors });
    expect(prefix.summary.termination).toBe("budget-limit");
    expect(prefix.summary.attempts[0]!.report).toBeNull();
    expect((await verifySeedEvidence(prefix.summary, first, prefixStore)).charged.runs).toBe(3);
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
    expect(last.attempts).toHaveLength(0);
    expect(run.requests.filter(request => request.cellId === "writer")).toHaveLength(1);
    expect(parseHabitatBudget(await store.getValue(last.account)).charged.runs).toBe(0);
    await expect(verifySeedEvidence(last, first, store)).rejects.toThrow("unfinished");
  });
});
