// Synthetic fixtures only: fabricated manifests, receipts, habitat accounts,
// catalogs, and the arm-runner's session/run records in a scratch FileStore.
// No executor ever runs.
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import {
  buildExperimentReport,
  parseSkillExperimentReport,
  renderExperimentReport,
  SKILL_EXPERIMENT_CONFIG_CONTRACT,
  SKILL_EXPERIMENT_CONTRACT,
  type SkillExperimentConfig,
} from "./experiment-report";
import { verifyExperimentReport } from "./experiment-verify";
import { parseExperimentCatalog, parseExperimentRun, parseExperimentSession, type ExperimentCatalog, type ExperimentRun } from "./experiment-run";
import { receiptDigest, RUN_CONTRACT, type RunReceipt } from "./run";
import { FileStore } from "./store";
import type { JsonObject, JsonValue } from "./values";

const dirs: string[] = [];
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop()!, { recursive: true, force: true });
});

function manifest(key: string, budgets = { maxWork: 100, maxAgentCalls: 4 }): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key,
    name: key,
    budgets,
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: key } } }],
    edges: [],
  });
}

function receipt(m: OrganismManifest, manifestDigest: Digest, work: { steps: number; agentCalls: number; units: number }, outcome = "complete", output?: JsonValue): RunReceipt {
  const base = {
    contract: RUN_CONTRACT,
    runtime: { name: "algal", version: "fixture" },
    manifestDigest,
    manifestKey: m.key,
    args: {},
    outcome,
    cells: output === undefined ? {} : { out: { status: "committed", work: work.units, outputs: { value: output } } },
    effects: [],
    events: [],
    work,
  };
  return { ...base, digest: receiptDigest(base as Omit<RunReceipt, "digest">) } as RunReceipt;
}

function accountRecord(
  limits: { work: number; attempts: number; runs: number },
  runs: { manifest: Digest; receipt: Digest; ceiling: { work: number; attempts: number }; charged: { work: number; attempts: number } }[],
  outcome: "complete" | "exhausted" = "complete",
): JsonObject {
  const charged = {
    work: runs.reduce((sum, run) => sum + run.charged.work, 0),
    attempts: runs.reduce((sum, run) => sum + run.charged.attempts, 0),
    runs: runs.length,
  };
  return {
    contract: "algal.habitat-budget.v1",
    activity: "experiment",
    limits,
    runs: runs.map((run) => ({ manifest: run.manifest, receipt: run.receipt, ceiling: run.ceiling, charged: run.charged })),
    charged,
    outcome,
    refused: null,
  } as unknown as JsonObject;
}

/** The promotion evidence `promote.report` cites: a foundry selection record
 * naming the kept manifest and the validation score the run record claims. */
function selectionRecord(manifestDigest: Digest, validation: { passed: number; total: number }): JsonObject {
  return {
    candidates: [{ manifestDigest, manifestKey: "organism:kept", validation, train: { passed: 1, total: 1 } }],
    promoted: manifestDigest,
  } as unknown as JsonObject;
}

function runRecord(over: Record<string, unknown>): JsonObject {
  return { contract: "algal.experiment-run.v1", ...over } as JsonObject;
}

type Fixture = {
  dir: string;
  config: SkillExperimentConfig;
  digests: {
    kept: Digest;
    selection: Digest;
    receipts: { r1: Digest; r2: Digest; r3: Digest; r4: Digest; r5: Digest; g1: Digest; e1: Digest };
    opt: Record<string, Digest>;
    sessions: { retained: Digest; fresh: Digest; optimizer: Digest };
    catalogs: { retained: Digest; fresh: Digest; optimizer: Digest };
    records: { retained: Digest[]; fresh: Digest[]; optimizer: Digest[] };
    manifests: { k: Digest; f: Digest; g: Digest; v: Digest };
  };
};

/** One study, two sessions. `retained` consults the catalog: a miss on the
 * acquisition task promotes a kept manifest that two later held-out tasks
 * reuse (one passes, one fails); a third held-out hit fails admission.
 * `fresh` generates every task and keeps nothing. */
async function fixture(sameRevisionManifest = false, revisionTrigger: "requalification" | "failed-run" | "missed-expectation" = "requalification"): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "algal-experiment-"));
  dirs.push(dir);
  const store = new FileStore(dir);
  const [mK, mF, mG] = [manifest("organism:kept"), manifest("organism:fresh"), manifest("organism:generator")];
  const [dK, dF, dG] = [
    await store.putManifest(mK),
    await store.putManifest(mF),
    await store.putManifest(mG),
  ];
  const receipts = {
    // retained: generator run, task run, promotion-evaluation run, then the
    // two held-out reuses — admission order as the account records it.
    g1: await store.putReceipt(receipt(mG, dG, { steps: 1, agentCalls: 1, units: 5 }) as unknown as JsonValue),
    r1: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 2, units: 10 }) as unknown as JsonValue),
    e1: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 8 }) as unknown as JsonValue),
    r2: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 12 }) as unknown as JsonValue),
    r3: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 14 }, "failed") as unknown as JsonValue),
    r4: await store.putReceipt(receipt(mF, dF, { steps: 1, agentCalls: 1, units: 20 }) as unknown as JsonValue),
    r5: await store.putReceipt(receipt(mF, dF, { steps: 1, agentCalls: 0, units: 22 }, "failed") as unknown as JsonValue),
  };
  const selection = await store.putValue(selectionRecord(dK, { passed: 3, total: 4 }));
  const argsK = await store.putValue({ in: {} } as JsonValue);
  const argsF = await store.putValue({ in: {} } as JsonValue);
  const catalogR = await store.putValue({
    contract: "algal.experiment-catalog.v1",
    entries: [{
      family: "triage",
      manifest: dK,
      interfaceDigest: digestCanonical({ family: "triage" } as JsonValue),
      cases: [{ id: "t-1", split: "train" }, { id: "v-1", split: "validation" }],
      report: selection,
      taskId: "t-acq-1",
    }],
  } as unknown as JsonObject);
  const catalogF = await store.putValue({ contract: "algal.experiment-catalog.v1", entries: [] } as unknown as JsonObject);
  const retainedRecords: JsonObject[] = [
    runRecord({
      arm: "retained", taskId: "t-acq-1", phase: "acquisition",
      consult: { outcome: "miss", entry: null, manifest: null },
      generator: { manifest: dG, receipt: receipts.g1 },
      manifest: dK, args: argsK, receipt: receipts.r1, outcome: "complete",
      work: { units: 10, agentCalls: 2 }, failure: null,
      promote: { evaluated: true, validation: { passed: 3, total: 4 }, promoted: true, entry: 0, report: selection },
    }),
    runRecord({
      arm: "retained", taskId: "t-unseen-2", phase: "unseen",
      consult: { outcome: "hit", entry: 0, manifest: dK },
      generator: null,
      manifest: dK, args: argsK, receipt: receipts.r2, outcome: "complete",
      work: { units: 12, agentCalls: 1 }, failure: null, promote: null,
    }),
    runRecord({
      arm: "retained", taskId: "t-shift-3", phase: "shift",
      consult: { outcome: "hit", entry: 0, manifest: dK },
      generator: null,
      manifest: dK, args: argsK, receipt: receipts.r3, outcome: "failed",
      work: { units: 14, agentCalls: 1 }, failure: null, promote: null,
      // The operator touched this task twice; the other records carry none.
      corrections: [
        { kind: "operator-edit", note: "record schema field renamed by hand" },
        { kind: "hint", note: "operator supplied the revised taxonomy" },
      ],
    }),
    runRecord({
      arm: "retained", taskId: "t-unseen-4", phase: "unseen",
      consult: { outcome: "hit", entry: 0, manifest: dK },
      generator: null,
      manifest: dK, args: null, receipt: null, outcome: "invalid",
      work: { units: 0, agentCalls: 0 }, failure: { code: "invalid-args", message: "interface args do not satisfy the kept manifest" }, promote: null,
    }),
  ];
  const freshRecords: JsonObject[] = [
    runRecord({
      arm: "fresh", taskId: "t-f-unseen", phase: "unseen",
      consult: { outcome: "disabled", entry: null, manifest: null },
      generator: null,
      manifest: dF, args: argsF, receipt: receipts.r4, outcome: "complete",
      work: { units: 20, agentCalls: 1 }, failure: null, promote: null,
    }),
    runRecord({
      arm: "fresh", taskId: "t-f-shift", phase: "shift",
      consult: { outcome: "disabled", entry: null, manifest: null },
      generator: null,
      manifest: dF, args: argsF, receipt: receipts.r5, outcome: "failed",
      work: { units: 22, agentCalls: 0 }, failure: null, promote: null,
    }),
  ];
  // optimizer: one acquired entry, a stale-hit re-qualification that
  // demotes it, and a promoted revision that supersedes it — then a cite.
  const mV = sameRevisionManifest ? mK : manifest("organism:revised");
  const mR = parseOrganismManifest({
    ...manifest("organism:reviser"),
    interface: { inputs: {}, outputs: { manifest: { cell: "out", port: "value" } } },
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: mV } } }],
  });
  const [dV, dR] = [await store.putManifest(mV), await store.putManifest(mR)];
  const opt = {
    gO: await store.putReceipt(receipt(mG, dG, { steps: 1, agentCalls: 1, units: 5 }) as unknown as JsonValue),
    rO0: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 10 }) as unknown as JsonValue),
    eO0: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 8 }) as unknown as JsonValue),
    rO1: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 9 }, revisionTrigger === "failed-run" ? "failed" : "complete") as unknown as JsonValue),
    eO1: await store.putReceipt(receipt(mK, dK, { steps: 1, agentCalls: 1, units: 7 }) as unknown as JsonValue),
    rV: await store.putReceipt(receipt(mR, dR, { steps: 1, agentCalls: 1, units: 6 }, "complete", mV as unknown as JsonValue) as unknown as JsonValue),
    eV: await store.putReceipt(receipt(mV, dV, { steps: 1, agentCalls: 1, units: 5 }) as unknown as JsonValue),
    rO2: await store.putReceipt(receipt(mV, dV, { steps: 1, agentCalls: 1, units: 8 }) as unknown as JsonValue),
  };
  const sel0 = await store.putValue(selectionRecord(dK, { passed: 3, total: 3 }));
  const selBad = await store.putValue(selectionRecord(dK, { passed: 1, total: 3 }));
  const selGood = await store.putValue(selectionRecord(dV, { passed: 3, total: 3 }));
  const ev1 = await store.putValue(revisionTrigger === "requalification"
    ? { taskId: "t-stale-2", trigger: revisionTrigger, report: selBad }
    : { taskId: "t-stale-2", trigger: revisionTrigger, receipt: opt.rO1!, outcome: revisionTrigger === "failed-run" ? "failed" : "complete",
      ...(revisionTrigger === "missed-expectation" ? { expect: {} } : {}) });
  const catalogO = await store.putValue({
    contract: "algal.experiment-catalog.v1",
    entries: [
      {
        family: "triage", manifest: dK, interfaceDigest: null,
        cases: [{ id: "t-1", split: "train" }, { id: "v-1", split: "validation" }],
        report: sel0, taskId: "t-acq-1", retired: revisionTrigger === "requalification" ? selBad : ev1,
      },
      {
        family: "triage", manifest: dV, interfaceDigest: null,
        cases: [{ id: "t-1", split: "train" }, { id: "v-1", split: "validation" }],
        report: selGood, taskId: "t-stale-2", supersedes: 0,
      },
    ],
  } as unknown as JsonObject);
  const optimizerRecords: JsonObject[] = [
    runRecord({
      arm: "optimizer", taskId: "t-acq-1", phase: "acquisition",
      consult: { outcome: "miss", entry: null, manifest: null },
      generator: { manifest: dG, receipt: opt.gO },
      manifest: dK, args: argsK, receipt: opt.rO0, outcome: "complete",
      work: { units: 10, agentCalls: 1 }, failure: null,
      promote: { evaluated: true, promoted: true, entry: 0, report: sel0, validation: { passed: 3, total: 3 } },
    }),
    runRecord({
      arm: "optimizer", taskId: "t-stale-2", phase: "unseen",
      consult: { outcome: "hit", entry: 0, manifest: dK },
      generator: null,
      manifest: dK, args: argsK, receipt: opt.rO1, outcome: revisionTrigger === "failed-run" ? "failed" : "complete",
      work: { units: 9, agentCalls: 1 }, failure: null,
      promote: revisionTrigger === "requalification" ? { evaluated: true, promoted: false, entry: 0, report: selBad, validation: { passed: 1, total: 3 }, demoted: true } : null,
      revise: {
        trigger: revisionTrigger, evidence: ev1,
        generator: { manifest: dR, receipt: opt.rV },
        evaluated: true, promoted: true, report: selGood, validation: { passed: 3, total: 3 },
        entry: 1, supersedes: 0,
      },
    }),
    runRecord({
      arm: "optimizer", taskId: "t-hit-3", phase: "unseen",
      consult: { outcome: "hit", entry: 1, manifest: dV },
      generator: null,
      manifest: dV, args: argsK, receipt: opt.rO2, outcome: "complete",
      work: { units: 8, agentCalls: 1 }, failure: null,
      promote: { evaluated: false, promoted: false, entry: 1, report: selGood, validation: { passed: 3, total: 3 } },
    }),
  ];
  const optimizerDigests: Digest[] = [];
  for (const record of optimizerRecords) optimizerDigests.push(await store.putValue(record as unknown as JsonValue));
  const ceiling = { work: 100, attempts: 4 };
  const optimizerAccount = await store.putValue(accountRecord(
    { work: 1_000, attempts: 100, runs: 10 },
    [
      { manifest: dG, receipt: opt.gO, ceiling, charged: { work: 5, attempts: 1 } },
      { manifest: dK, receipt: opt.rO0, ceiling, charged: { work: 10, attempts: 1 } },
      { manifest: dK, receipt: opt.eO0, ceiling, charged: { work: 8, attempts: 1 } },
      { manifest: dK, receipt: opt.rO1, ceiling, charged: { work: 9, attempts: 1 } },
      { manifest: dK, receipt: opt.eO1, ceiling, charged: { work: 7, attempts: 1 } },
      { manifest: dR, receipt: opt.rV, ceiling, charged: { work: 6, attempts: 1 } },
      { manifest: dV, receipt: opt.eV, ceiling, charged: { work: 5, attempts: 1 } },
      { manifest: dV, receipt: opt.rO2, ceiling, charged: { work: 8, attempts: 1 } },
    ],
  ));
  const optimizerSession = await store.putValue({
    contract: "algal.experiment-session.v1",
    arm: "optimizer",
    family: "triage",
    tasks: optimizerRecords.map((record, i) => ({ taskId: record.taskId, phase: record.phase, run: optimizerDigests[i]! })),
    budget: optimizerAccount,
    catalog: catalogO,
    outcome: "complete",
  } as unknown as JsonObject);
  const recordDigests = { retained: [] as Digest[], fresh: [] as Digest[], optimizer: optimizerDigests };
  for (const record of retainedRecords) recordDigests.retained.push(await store.putValue(record as unknown as JsonValue));
  for (const record of freshRecords) recordDigests.fresh.push(await store.putValue(record as unknown as JsonValue));
  const retainedAccount = await store.putValue(accountRecord(
    { work: 1_000, attempts: 100, runs: 10 },
    [
      { manifest: dG, receipt: receipts.g1, ceiling, charged: { work: 5, attempts: 1 } },
      { manifest: dK, receipt: receipts.r1, ceiling, charged: { work: 10, attempts: 2 } },
      { manifest: dK, receipt: receipts.e1, ceiling, charged: { work: 8, attempts: 1 } },
      { manifest: dK, receipt: receipts.r2, ceiling, charged: { work: 12, attempts: 1 } },
      { manifest: dK, receipt: receipts.r3, ceiling, charged: { work: 14, attempts: 1 } },
    ],
  ));
  const freshAccount = await store.putValue(accountRecord(
    { work: 1_000, attempts: 100, runs: 10 },
    [
      { manifest: dF, receipt: receipts.r4, ceiling, charged: { work: 20, attempts: 1 } },
      { manifest: dF, receipt: receipts.r5, ceiling, charged: { work: 22, attempts: 0 } },
    ],
  ));
  const tasksOf = (records: JsonObject[], digests: Digest[]) =>
    records.map((record, i) => ({ taskId: record.taskId, phase: record.phase, run: digests[i] }));
  const retainedSession = await store.putValue({
    contract: "algal.experiment-session.v1",
    arm: "retained",
    family: "triage",
    tasks: tasksOf(retainedRecords, recordDigests.retained),
    budget: retainedAccount,
    catalog: catalogR,
    outcome: "complete",
  } as unknown as JsonObject);
  const freshSession = await store.putValue({
    contract: "algal.experiment-session.v1",
    arm: "fresh",
    family: "triage",
    tasks: tasksOf(freshRecords, recordDigests.fresh),
    budget: freshAccount,
    catalog: catalogF,
    outcome: "complete",
  } as unknown as JsonObject);
  const config: SkillExperimentConfig = {
    contract: SKILL_EXPERIMENT_CONFIG_CONTRACT,
    study: "triage-study",
    arms: [{ session: retainedSession }, { session: freshSession }, { session: optimizerSession }],
  };
  return {
    dir,
    config,
    digests: {
      kept: dK,
      selection,
      receipts,
      opt,
      sessions: { retained: retainedSession, fresh: freshSession, optimizer: optimizerSession },
      catalogs: { retained: catalogR, fresh: catalogF, optimizer: catalogO },
      records: recordDigests,
      manifests: { k: dK, f: dF, g: dG, v: dV },
    },
  };
}

/** Rebuild the content-addressed session after tampering with one revision.
 * The verifier must reject the joins even when all enclosing digests agree. */
async function rewriteRevision(f: Fixture, change: (run: ExperimentRun, catalog: ExperimentCatalog, store: FileStore) => Promise<void>): Promise<SkillExperimentConfig> {
  const store = new FileStore(f.dir);
  const session = parseExperimentSession(await store.getValue(f.digests.sessions.optimizer));
  const run = parseExperimentRun(await store.getValue(session.tasks[1]!.run));
  const catalog = parseExperimentCatalog(await store.getValue(session.catalog));
  await change(run, catalog, store);
  session.tasks[1]!.run = await store.putValue(run as unknown as JsonValue);
  session.catalog = await store.putValue(catalog as unknown as JsonValue);
  return { ...f.config, arms: [{ session: await store.putValue(session as unknown as JsonValue) }] };
}

describe("skill experiment rollup", () => {
  test("aggregates a fixture store's arms and joins kept manifests to later receipts", async () => {
    const { dir, config, digests } = await fixture();
    const report = await buildExperimentReport(dir, config);
    expect(report.contract).toBe(SKILL_EXPERIMENT_CONTRACT);
    expect(report.study).toBe("triage-study");
    expect(report.arms).toHaveLength(3);
    const [retained, fresh, optimizer] = report.arms;
    expect(retained).toMatchObject({
      name: "retained",
      family: "triage",
      session: digests.sessions.retained,
      accountOutcome: "complete",
      workTotal: 49,
      attemptsTotal: 6,
      runsTotal: 5,
      tasksAttempted: 4,
      tasksPassed: 2,
      heldOutPassed: 1,
      heldOutTotal: 3,
      invalidTasks: 1,
      exhaustedTasks: 0,
      consultations: 4,
      catalogHits: 3,
      catalogMisses: 1,
      admissionFailures: 1,
      keptEntries: 1,
      reusedEntries: 1,
      correctionsTotal: 2,
    });
    expect(retained?.records).toEqual(digests.records.retained);
    expect(retained?.reuse).toEqual([{
      manifest: digests.kept,
      entry: 0,
      taskId: "t-acq-1",
      promotedSequence: 0,
      runs: [digests.receipts.r2, digests.receipts.r3],
      heldOutRuns: [digests.receipts.r2, digests.receipts.r3],
    }]);
    expect(retained?.holdoutGaps).toEqual([{
      manifest: digests.kept,
      validation: { passed: 3, total: 4 },
      heldOut: { passed: 1, total: 2 },
    }]);
    expect(fresh).toMatchObject({
      name: "fresh",
      workTotal: 42,
      attemptsTotal: 1,
      runsTotal: 2,
      tasksAttempted: 2,
      tasksPassed: 1,
      heldOutPassed: 1,
      heldOutTotal: 2,
      consultations: 0,
      catalogHits: 0,
      catalogMisses: 0,
      keptEntries: 0,
      reusedEntries: 0,
      reuse: [],
      holdoutGaps: [],
      correctionsTotal: 0,
    });
    // The optimizer arm: one acquired entry, one re-qualification demotion,
    // one promoted revision superseding it, then a cite of the revision.
    expect(optimizer).toMatchObject({
      name: "optimizer",
      session: digests.sessions.optimizer,
      workTotal: 58,
      attemptsTotal: 8,
      runsTotal: 8,
      tasksAttempted: 3,
      tasksPassed: 3,
      heldOutPassed: 2,
      heldOutTotal: 2,
      consultations: 3,
      catalogHits: 2,
      catalogMisses: 1,
      keptEntries: 2,
      reusedEntries: 2,
      revisionsTotal: 1,
      demotionsTotal: 1,
      correctionsTotal: 0,
    });
    expect(optimizer?.reuse).toEqual([
      { manifest: digests.kept, entry: 0, taskId: "t-acq-1", promotedSequence: 0, runs: [digests.opt.rO1!], heldOutRuns: [digests.opt.rO1!] },
      { manifest: digests.manifests.v, entry: 1, taskId: "t-stale-2", promotedSequence: 1, runs: [digests.opt.rO2!], heldOutRuns: [digests.opt.rO2!] },
    ]);
    // The revision's promotion joins the holdout-gap ledger like an ordinary
    // in-session promotion, carrying the validation the revise record cites.
    expect(optimizer?.holdoutGaps).toEqual([
      { manifest: digests.kept, validation: { passed: 3, total: 3 }, heldOut: { passed: 1, total: 1 } },
      { manifest: digests.manifests.v, validation: { passed: 3, total: 3 }, heldOut: { passed: 1, total: 1 } },
    ]);
    // The built report round-trips its own strict parser and digest.
    const parsed = parseSkillExperimentReport(report as unknown as JsonValue);
    expect(parsed).toEqual(report);
    const { digest: _omit, ...base } = report;
    expect(digestCanonical(base as unknown as JsonValue)).toBe(report.digest);
    const text = renderExperimentReport(report);
    expect(text).toContain("retained");
    expect(text).toContain("fresh");
    expect(text).toContain("1/3");
    expect(text).toContain("operator corrections recorded: retained 2");
  });

  test("fails the rollup when a task receipt is not charged to the arm's account", async () => {
    const { dir, config, digests } = await fixture();
    const store = new FileStore(dir);
    // A doctored retained account that drops the failing reuse's charge.
    const ceiling = { work: 100, attempts: 4 };
    const wrong = await store.putValue(accountRecord(
      { work: 1_000, attempts: 100, runs: 10 },
      [
        { manifest: digests.manifests.g, receipt: digests.receipts.g1, ceiling, charged: { work: 5, attempts: 1 } },
        { manifest: digests.kept, receipt: digests.receipts.r1, ceiling, charged: { work: 10, attempts: 2 } },
        { manifest: digests.kept, receipt: digests.receipts.e1, ceiling, charged: { work: 8, attempts: 1 } },
        { manifest: digests.kept, receipt: digests.receipts.r2, ceiling, charged: { work: 12, attempts: 1 } },
      ],
    ));
    const wrongSession = await store.putValue({
      contract: "algal.experiment-session.v1",
      arm: "retained",
      family: "triage",
      tasks: [
        { taskId: "t-acq-1", phase: "acquisition", run: digests.records.retained[0] },
        { taskId: "t-unseen-2", phase: "unseen", run: digests.records.retained[1] },
        { taskId: "t-shift-3", phase: "shift", run: digests.records.retained[2] },
        { taskId: "t-unseen-4", phase: "unseen", run: digests.records.retained[3] },
      ],
      budget: wrong,
      catalog: digests.catalogs.retained,
      outcome: "complete",
    } as unknown as JsonObject);
    await expect(buildExperimentReport(dir, { ...config, arms: [{ session: wrongSession }, config.arms[1]!] }))
      .rejects.toMatchObject({ code: "PARSE_FAILED" });
  });

  test("verify re-derives every aggregate against the cited evidence", async () => {
    const { dir, config } = await fixture();
    const report = await buildExperimentReport(dir, config);
    const verified = await verifyExperimentReport(report as unknown as JsonValue, dir);
    expect(verified.mismatches).toEqual([]);
    expect(verified).toMatchObject({ ok: true, digest: report.digest, checkedRecords: 9, uncited: 0, storeMoved: false });
  });

  test("verify catches a doctored aggregate even with a recomputed digest", async () => {
    const { dir, config } = await fixture();
    const report = await buildExperimentReport(dir, config);
    const { digest: _omit, ...base } = report as unknown as { digest: Digest } & Record<string, unknown>;
    const arms = (base.arms as JsonObject[]).map((arm, i) =>
      i === 0 ? { ...arm, heldOutPassed: 2, tasksPassed: 3, correctionsTotal: 0 } :
        i === 2 ? { ...arm, revisionsTotal: 0, demotionsTotal: 0 } : arm);
    const doctored = { ...base, arms };
    const value = { ...doctored, digest: digestCanonical(doctored as unknown as JsonValue) } as JsonValue;
    const verified = await verifyExperimentReport(value, dir);
    expect(verified.ok).toBe(false);
    expect(verified.mismatches.some((m) => m.includes("heldOutPassed"))).toBe(true);
    expect(verified.mismatches.some((m) => m.includes("tasksPassed"))).toBe(true);
    // correctionsTotal is re-derived from the cited records, not trusted.
    expect(verified.mismatches.some((m) => m.includes("correctionsTotal: claimed 0, the cited records derive 2"))).toBe(true);
    expect(verified.mismatches.some((m) => m.includes("revisionsTotal: claimed 0, the cited records derive 1"))).toBe(true);
    expect(verified.mismatches.some((m) => m.includes("demotionsTotal: claimed 0, the cited records derive 1"))).toBe(true);
  });

  test("attributes identical-manifest re-promotion to the catalog entry actually consulted", async () => {
    const f = await fixture(true);
    const report = await buildExperimentReport(f.dir, f.config);
    const optimizer = report.arms[2]!;
    expect(optimizer.reuse.map((entry) => ({ entry: entry.entry, runs: entry.runs }))).toEqual([
      { entry: 0, runs: [f.digests.opt.rO1!] },
      { entry: 1, runs: [f.digests.opt.rO2!] },
    ]);
    expect(optimizer.holdoutGaps.map((gap) => gap.heldOut)).toEqual([{ passed: 1, total: 1 }, { passed: 1, total: 1 }]);
    expect((await verifyExperimentReport(report, f.dir)).mismatches).toEqual([]);
    const forged = structuredClone(report);
    forged.arms[2]!.reuse[0]!.runs.push(f.digests.opt.rO2!);
    forged.arms[2]!.reuse[0]!.heldOutRuns.push(f.digests.opt.rO2!);
    const { digest: _omit, ...base } = forged;
    forged.digest = digestCanonical(base as unknown as JsonValue);
    const checked = await verifyExperimentReport(forged, f.dir);
    expect(checked.mismatches.some((m) => m.includes("reuse entry 0 does not match its consulted task receipts"))).toBe(true);
  });

  for (const trigger of ["failed-run", "missed-expectation"] as const) {
    test(`verifies a ${trigger} revision retired by its triggering evidence`, async () => {
      const f = await fixture(false, trigger);
      const report = await buildExperimentReport(f.dir, f.config);
      expect((await verifyExperimentReport(report, f.dir)).mismatches).toEqual([]);
    });
  }

  test("rejects a passing revision selection and matching catalog that the reviser never emitted", async () => {
    const f = await fixture();
    const store = new FileStore(f.dir);
    const session = parseExperimentSession(await store.getValue(f.digests.sessions.optimizer));
    session.tasks.pop();
    f.digests.sessions.optimizer = await store.putValue(session as unknown as JsonValue);
    const config = await rewriteRevision(f, async (run, catalog, store) => {
      run.revise!.report = await store.putValue(selectionRecord(run.manifest!, { passed: 3, total: 3 }));
      catalog.entries[1]!.report = run.revise!.report;
      catalog.entries[1]!.manifest = run.manifest!;
    });
    const report = await buildExperimentReport(f.dir, config);
    const checked = await verifyExperimentReport(report, f.dir);
    expect(checked.mismatches.some((m) => m.includes("evaluated a manifest absent from the reviser's declared outputs"))).toBe(true);
  });

  const revisionTampering: { name: string; expected: string; change: (run: ExperimentRun, catalog: ExperimentCatalog, store: FileStore) => Promise<void> }[] = [
    {
      name: "missing trigger evidence", expected: "revision evidence sha256:",
      change: async (run) => { run.revise!.evidence = `sha256:${"f".repeat(64)}`; },
    },
    {
      name: "borrowed trigger task", expected: "evidence names another task or trigger",
      change: async (run, _catalog, store) => {
        run.revise!.evidence = await store.putValue({ taskId: "another-task", trigger: "requalification", report: run.promote!.report! });
      },
    },
    {
      name: "borrowed requalification", expected: "evidence does not name its failed requalification",
      change: async (run, catalog, store) => {
        run.revise!.evidence = await store.putValue({ taskId: run.taskId, trigger: "requalification", report: catalog.entries[0]!.report });
      },
    },
    {
      name: "reviser identity", expected: "reviser receipt ran another manifest",
      change: async (run) => { run.revise!.generator!.manifest = run.manifest!; },
    },
    {
      name: "uncharged revision without account refusal", expected: "has no reviser receipt without an exhausted account",
      change: async (run, catalog) => {
        const prior = run.revise!;
        run.revise = { ...prior, generator: null, evaluated: false, promoted: false, report: null, validation: null, entry: null };
        delete catalog.entries[1]!.supersedes;
      },
    },
    {
      name: "missing revision evaluation", expected: "revision evaluation sha256:",
      change: async (run, catalog) => {
        run.revise!.report = `sha256:${"f".repeat(64)}`;
        catalog.entries[1]!.report = run.revise!.report;
      },
    },
    {
      name: "revision validation score", expected: "validation does not match its evaluation",
      change: async (run) => { run.revise!.validation = { passed: 0, total: 3 }; },
    },
    {
      name: "borrowed evaluated candidate", expected: "promotion does not match the passing evaluated manifest",
      change: async (run, catalog, store) => {
        run.revise!.report = await store.putValue(selectionRecord(run.manifest!, { passed: 3, total: 3 }));
        catalog.entries[1]!.report = run.revise!.report;
      },
    },
    {
      name: "unrelated superseded entry", expected: "does not supersede the optimizer's consulted entry",
      change: async (run, catalog) => {
        run.revise!.supersedes = 1;
        catalog.entries[1]!.supersedes = 1;
        catalog.entries[1]!.retired = run.revise!.evidence;
      },
    },
    {
      name: "unrelated retirement evidence", expected: "retirement does not cite its triggering evidence",
      change: async (run, _catalog, store) => {
        run.promote!.demoted = false;
        run.revise!.trigger = "missed-expectation";
        run.revise!.evidence = await store.putValue({ taskId: run.taskId, trigger: "missed-expectation", outcome: "complete", receipt: run.receipt!, expect: {} });
      },
    },
  ];
  for (const tamper of revisionTampering) {
    test(`verify catches ${tamper.name} with recomputed record and report digests`, async () => {
      const f = await fixture();
      const config = await rewriteRevision(f, tamper.change);
      const report = await buildExperimentReport(f.dir, config);
      const checked = await verifyExperimentReport(report, f.dir);
      expect(checked.ok).toBe(false);
      expect(checked.mismatches.some((m) => m.includes(tamper.expected))).toBe(true);
    });
  }

  test("verify flags stored run records the session does not cite", async () => {
    const { dir, config, digests } = await fixture();
    const report = await buildExperimentReport(dir, config);
    const store = new FileStore(dir);
    // A second record claims retained's t-unseen-2 without the session's say.
    await store.putValue(runRecord({
      arm: "retained", taskId: "t-unseen-2", phase: "unseen",
      consult: { outcome: "miss", entry: null, manifest: null },
      generator: null,
      manifest: digests.kept, args: digests.selection, receipt: digests.receipts.r2, outcome: "complete",
      work: { units: 12, agentCalls: 1 }, failure: null, promote: null,
    }) as unknown as JsonValue);
    const verified = await verifyExperimentReport(report as unknown as JsonValue, dir);
    expect(verified.ok).toBe(false);
    expect(verified.uncited).toBe(1);
    expect(verified.storeMoved).toBe(true);
  });
});

describe("skill experiment parser", () => {
  const D = (n: number) => `sha256:${String(n).repeat(64)}` as Digest;
  const minimalArm = (over: Record<string, unknown> = {}): JsonObject => ({
    name: "retained",
    family: "triage",
    session: D(1),
    account: D(1),
    catalog: D(1),
    accountOutcome: "complete",
    limits: { work: 100, attempts: 10, runs: 4 },
    workTotal: 0,
    attemptsTotal: 0,
    runsTotal: 0,
    tasksAttempted: 0,
    tasksPassed: 0,
    heldOutPassed: 0,
    heldOutTotal: 0,
    invalidTasks: 0,
    exhaustedTasks: 0,
    consultations: 0,
    catalogHits: 0,
    catalogMisses: 0,
    admissionFailures: 0,
    keptEntries: 0,
    reusedEntries: 0,
    reuse: [],
    holdoutGaps: [],
    correctionsTotal: 0,
    revisionsTotal: 0,
    demotionsTotal: 0,
    records: [],
    ...over,
  }) as unknown as JsonObject;
  const minimalReport = (arms: JsonObject[] = [minimalArm()]): JsonObject => ({
    contract: SKILL_EXPERIMENT_CONTRACT,
    study: "s",
    index: D(2),
    arms,
    digest: D(3),
  }) as unknown as JsonObject;

  test("rejects unknown keys at every level", () => {
    expect(() => parseSkillExperimentReport({ ...minimalReport(), extra: 1 })).toThrow(AlgalError);
    expect(() => parseSkillExperimentReport(minimalReport([{ ...minimalArm(), extra: 1 }] as JsonObject[]))).toThrow(AlgalError);
    expect(() => parseSkillExperimentReport({ ...minimalReport(), contract: "algal.application-experiment.v1" })).toThrow(AlgalError);
  });

  test("rejects incoherent counts", () => {
    const bad = (over: Record<string, unknown>) =>
      parseSkillExperimentReport(minimalReport([minimalArm({ runsTotal: 1, tasksAttempted: 1, records: [D(4)], ...over })]));
    expect(() => bad({ tasksPassed: 2 })).toThrow(AlgalError);
    expect(() => bad({ heldOutTotal: 2 })).toThrow(AlgalError);
    expect(() => bad({ heldOutPassed: 1, heldOutTotal: 0 })).toThrow(AlgalError);
    expect(() => bad({ tasksAttempted: 2, runsTotal: 1, records: [D(4), D(5)] })).toThrow(AlgalError);
    expect(() => bad({ consultations: 1 })).toThrow(AlgalError); // hits+misses must equal consultations
    expect(() => bad({ admissionFailures: 1 })).toThrow(AlgalError); // no hits to fail
    expect(() => bad({ reusedEntries: 1 })).toThrow(AlgalError);
    expect(() => bad({ workTotal: 101 })).toThrow(AlgalError); // beyond declared limits
    expect(() => bad({ tasksAttempted: 0, records: [D(4)] })).toThrow(AlgalError);
    // One record carries at most maxCorrections entries (32).
    expect(() => bad({ correctionsTotal: 33 })).toThrow(AlgalError);
    expect(() => bad({ name: "plural" })).toThrow(AlgalError); // arm names come from the runner's contract
  });

  test("rejects over-bound lists and oversized records", () => {
    const tooMany = Array.from({ length: 65 }, (_, i) => `sha256:${String(i).padStart(64, "0")}`);
    expect(() => parseSkillExperimentReport(minimalReport([minimalArm({ tasksAttempted: 65, runsTotal: 65, records: tooMany })] as JsonObject[]))).toThrow(AlgalError);
    const oversized = { ...minimalReport(), padding: "x".repeat(1_100_000) };
    expect(() => parseSkillExperimentReport(oversized)).toThrow(AlgalError);
    expect(() => parseSkillExperimentReport(minimalReport([]) as never)).toThrow(AlgalError); // arms must be non-empty
  });

  test("kept entries and gaps must be reported in catalog order", () => {
    const arm = minimalArm({
      runsTotal: 1, tasksAttempted: 1, records: [D(4)],
      keptEntries: 1, reusedEntries: 1,
      reuse: [{ manifest: D(7), entry: 0, taskId: "t", promotedSequence: 0, runs: [D(8)], heldOutRuns: [D(8)] }],
      holdoutGaps: [{ manifest: D(7), validation: { passed: 3, total: 4 }, heldOut: { passed: 1, total: 1 } }],
    });
    expect(() => parseSkillExperimentReport(minimalReport([arm]))).not.toThrow();
    // A reuse row out of catalog order or a gap for an unlisted entry fails.
    const shuffled = minimalArm({
      runsTotal: 1, tasksAttempted: 1, records: [D(4)],
      keptEntries: 2, reusedEntries: 0,
      reuse: [
        { manifest: D(7), entry: 1, taskId: "t", promotedSequence: 0, runs: [], heldOutRuns: [] },
        { manifest: D(8), entry: 0, taskId: "u", promotedSequence: null, runs: [], heldOutRuns: [] },
      ],
      holdoutGaps: [],
    });
    expect(() => parseSkillExperimentReport(minimalReport([shuffled]))).toThrow(AlgalError);
    const stray = minimalArm({
      runsTotal: 1, tasksAttempted: 1, records: [D(4)],
      keptEntries: 0, reusedEntries: 0,
      holdoutGaps: [{ manifest: D(9), validation: { passed: 3, total: 4 }, heldOut: { passed: 0, total: 0 } }],
    });
    expect(() => parseSkillExperimentReport(minimalReport([stray]))).toThrow(AlgalError);
  });
});

describe("skill experiment cli", () => {
  const root = resolve(import.meta.dir, "..");
  async function cli(...args: string[]) {
    const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    return { stdout, stderr, code };
  }

  test("report, verify, and inspect --format text round-trip through the CLI", async () => {
    const { dir, config } = await fixture();
    const configPath = join(dir, "config.json");
    const reportPath = join(dir, "report.json");
    await writeFile(configPath, JSON.stringify(config));
    const built = await cli("experiment", "report", configPath, "--dir", dir, "--out", reportPath);
    expect(built.code, built.stderr).toBe(0);
    const report = JSON.parse(await Bun.file(reportPath).text());
    expect(report.contract).toBe(SKILL_EXPERIMENT_CONTRACT);
    const verified = await cli("experiment", "verify", reportPath, "--dir", dir);
    expect(verified.code, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout).ok).toBe(true);
    const text = await cli("experiment", "inspect", reportPath, "--format", "text");
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toContain("retained");
    expect(text.stdout).toContain("held-out");
  });
});
