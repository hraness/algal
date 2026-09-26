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

function receipt(m: OrganismManifest, manifestDigest: Digest, work: { steps: number; agentCalls: number; units: number }, outcome = "complete"): RunReceipt {
  const base = {
    contract: RUN_CONTRACT,
    runtime: { name: "algal", version: "fixture" },
    manifestDigest,
    manifestKey: m.key,
    args: {},
    outcome,
    cells: {},
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
    sessions: { retained: Digest; fresh: Digest };
    catalogs: { retained: Digest; fresh: Digest };
    records: { retained: Digest[]; fresh: Digest[] };
    manifests: { k: Digest; f: Digest; g: Digest };
  };
};

/** One study, two sessions. `retained` consults the catalog: a miss on the
 * acquisition task promotes a kept manifest that two later held-out tasks
 * reuse (one passes, one fails); a third held-out hit fails admission.
 * `fresh` generates every task and keeps nothing. */
async function fixture(): Promise<Fixture> {
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
  const recordDigests = { retained: [] as Digest[], fresh: [] as Digest[] };
  for (const record of retainedRecords) recordDigests.retained.push(await store.putValue(record as unknown as JsonValue));
  for (const record of freshRecords) recordDigests.fresh.push(await store.putValue(record as unknown as JsonValue));
  const ceiling = { work: 100, attempts: 4 };
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
    arms: [{ session: retainedSession }, { session: freshSession }],
  };
  return {
    dir,
    config,
    digests: {
      kept: dK,
      selection,
      receipts,
      sessions: { retained: retainedSession, fresh: freshSession },
      catalogs: { retained: catalogR, fresh: catalogF },
      records: recordDigests,
      manifests: { k: dK, f: dF, g: dG },
    },
  };
}

describe("skill experiment rollup", () => {
  test("aggregates a fixture store's arms and joins kept manifests to later receipts", async () => {
    const { dir, config, digests } = await fixture();
    const report = await buildExperimentReport(dir, config);
    expect(report.contract).toBe(SKILL_EXPERIMENT_CONTRACT);
    expect(report.study).toBe("triage-study");
    expect(report.arms).toHaveLength(2);
    const [retained, fresh] = report.arms;
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
    });
    // The built report round-trips its own strict parser and digest.
    const parsed = parseSkillExperimentReport(report as unknown as JsonValue);
    expect(parsed).toEqual(report);
    const { digest: _omit, ...base } = report;
    expect(digestCanonical(base as unknown as JsonValue)).toBe(report.digest);
    const text = renderExperimentReport(report);
    expect(text).toContain("retained");
    expect(text).toContain("fresh");
    expect(text).toContain("1/3");
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
    expect(verified).toMatchObject({ ok: true, digest: report.digest, checkedRecords: 6, uncited: 0, storeMoved: false });
  });

  test("verify catches a doctored aggregate even with a recomputed digest", async () => {
    const { dir, config } = await fixture();
    const report = await buildExperimentReport(dir, config);
    const { digest: _omit, ...base } = report as unknown as { digest: Digest } & Record<string, unknown>;
    const arms = (base.arms as JsonObject[]).map((arm, i) =>
      i === 0 ? { ...arm, heldOutPassed: 2, tasksPassed: 3 } : arm);
    const doctored = { ...base, arms };
    const value = { ...doctored, digest: digestCanonical(doctored as unknown as JsonValue) } as JsonValue;
    const verified = await verifyExperimentReport(value, dir);
    expect(verified.ok).toBe(false);
    expect(verified.mismatches.some((m) => m.includes("heldOutPassed"))).toBe(true);
    expect(verified.mismatches.some((m) => m.includes("tasksPassed"))).toBe(true);
  });

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
