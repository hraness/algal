/** verify/replay/replay-isolation — instrumented replay isolation evidence.
 *
 * Each scenario runs in a supervised `bun fixture.ts <scenario> <dir>`
 * subprocess via `runCommand` (bounded output, deadline, group cleanup).
 * The fixture records and replays real runs against counted `Store`,
 * `Executor`, `ToolRegistry` and `Transport` surfaces, then writes a
 * `report.json` capture the test retains and re-reads through the shared
 * evidence channel (`retainEvidence`/`readRetainedEvidence`). The claim is
 * what the counters observe; no coverage beyond the exercised scenarios.
 */
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { readRetainedEvidence, retainEvidence, type EvidenceLimits } from "../../lib/evidence-retention";
import { readJson } from "../../lib/files";
import { requireSuccess, runCommand } from "../../lib/runner";
import { digestCanonical } from "../../../src/digest";
import type { JsonValue } from "../../../src/values";

const FIXTURE = resolve(import.meta.dir, "fixture.ts");
const ROOT = resolve(import.meta.dir, "../../..");
const CONTRACT = "algal.replay-isolation.v1";
const LIMITS = { commandMs: 30_000, outputBytes: 65_536 };
const EVIDENCE_LIMITS: EvidenceLimits = { maxBytes: 1_048_576, maxFileBytes: 262_144, maxEntries: 32, maxDepth: 2 };

type Report = Record<string, JsonValue> & { contract: typeof CONTRACT; scenario: string };

/** Re-read the retained report and re-admit it only when it is a complete,
 * contract-shaped capture of the scenario — evidence, not a summary. */
async function readmit(physicalRoot: string): Promise<{ scenario: string; fields: number }> {
  const report = await readJson(physicalRoot, "report.json") as Report;
  if (report.contract !== CONTRACT || typeof report.scenario !== "string" || report.ok !== true)
    throw new Error("retained replay-isolation report is not a complete scenario capture");
  return { scenario: report.scenario, fields: Object.keys(report).length };
}

async function runScenario(scenario: string): Promise<{ report: Report; directory: string }> {
  const directory = await mkdtemp(join(tmpdir(), "algal-replay-isolation-"));
  try {
    const result = await runCommand([process.execPath, FIXTURE, scenario, directory], ROOT,
      { timeoutMs: LIMITS.commandMs, maxOutputBytes: LIMITS.outputBytes });
    requireSuccess(result);
    expect(result.stderr).toBe("");
    expect(result.stdout.endsWith("\n") && !result.stdout.slice(0, -1).includes("\n"), "scenario output must be one bounded JSON line").toBe(true);
    const report = JSON.parse(result.stdout) as Report;
    expect(report.contract).toBe(CONTRACT);
    expect(report.scenario).toBe(scenario);

    // Retain the fixture's capture, then read it back offline: the reported
    // counters are byte-exact evidence, not a summarised claim.
    const sourceRoot = await realpath(join(directory, "evidence"));
    const resultsRoot = join(directory, "retained");
    await mkdir(resultsRoot, { recursive: true });
    const selection = {
      suite: "replay-isolation", sourceRoot, resultsRoot,
      recordedArchive: sourceRoot,
      authorityDigest: digestCanonical({ contract: CONTRACT, scenario } as JsonValue),
      limits: EVIDENCE_LIMITS,
    };
    const pointer = await retainEvidence({ ...selection, classification: "admitted", readmit });
    expect(pointer.admission?.scenario).toBe(scenario);
    const retained = await readRetainedEvidence({
      ...selection, directory: dirname(join(resultsRoot, pointer.manifest.path)),
      manifestSha256: pointer.manifest.sha256, classification: "admitted", readmit,
    });
    expect(retained).toEqual(pointer.admission);
    return { report, directory };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

test("replay verify never touches the live provider, tool or mutable-store channel", async () => {
  const { report, directory } = await runScenario("verify-isolation");
  try {
    // The recorded run really did mutate — instrumentation is live.
    expect(Number(report.recordStoreWrites)).toBeGreaterThanOrEqual(3);
    expect(report.recordToolCalls).toBe(1);
    // verifyReceipt: every mutating channel on the source store is zero; the
    // replay overlay absorbed each write. Read-only CAS reads are zero here
    // too — this manifest has no organism/load cells.
    expect(report.verifySourceMutations).toBe(0);
    const verifyCalls = report.verifySourceCalls as Record<string, number>;
    for (const count of Object.values(verifyCalls)) expect(count).toBe(0);
    expect(report.verifyToolCalls).toBe(0);
    // Scheduler arm: an admissible live executor is never selected.
    const live = report.armLiveCalls as Record<string, number>;
    for (const count of Object.values(live)) expect(count).toBe(0);
    expect(report.armSourceMutations).toBe(0);
    expect(report.armToolCalls).toBe(0);
    expect(report.receiptIdentical).toBe(true);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("a missing tool receipt diverges instead of falling through to a live tool", async () => {
  const { report, directory } = await runScenario("tool-miss");
  try {
    expect(report.verifiedOk).toBe(false);
    expect(Number(report.mismatches)).toBeGreaterThan(0);
    expect(report.verifyToolCalls).toBe(0);
    expect(report.verifySourceMutations).toBe(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("resume replays the recorded prefix and dispatches only the unreached tail", async () => {
  const { report, directory } = await runScenario("resume-prefix");
  try {
    expect(report.checkpointOutcome).toBe("suspended");
    expect(report.verifiedOk).toBe(true);
    expect(report.verifyMutations).toBe(0);
    expect(report.resumeOutcome).toBe("complete");
    // The live executor answered exactly the suspended request, once —
    // the whole executor surface is consulted exactly once per dispatch.
    const tail = report.tailCalls as Record<string, number>;
    expect(tail.execute).toBe(1);
    expect(tail.receiptFor).toBe(1);
    expect(tail.executeEffect).toBe(0);
    expect(tail.serves).toBe(0);
    expect(tail.journalConfigurationFor).toBe(0);
    // The committed prefix write is a settled record, not a live mutation:
    // resume skipped setSlot for it and the live slot stays empty.
    const resumeCalls = report.resumeStoreCalls as Record<string, number>;
    expect(resumeCalls.setSlot).toBe(0);
    expect(resumeCalls.getSlot).toBe(0);
    expect(report.settledSlotAfterResume).toBe(null);
    expect(report.resumedEffects).toBe(2);
    expect(report.prefixDigestKept).toBe(true);
    expect(report.step1Status).toBe("committed");
    expect(report.step2Output).toBe("approved work");
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("a checkpoint whose digest field disagrees with its contents is refused before any live tail", async () => {
  const { report, directory } = await runScenario("resume-tampered-digest");
  try {
    expect(report.rejectedCode).toBe("DIGEST_MISMATCH");
    const tail = report.tailCalls as Record<string, number>;
    for (const count of Object.values(tail)) expect(count).toBe(0);
    expect(report.storeMutations).toBe(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("a digest-consistent forged prefix is refused by prefix verification before any live tail", async () => {
  const { report, directory } = await runScenario("resume-tampered-content");
  try {
    expect(report.rejectedCode).toBe("RECEIPT_MISMATCH");
    const tail = report.tailCalls as Record<string, number>;
    for (const count of Object.values(tail)) expect(count).toBe(0);
    expect(report.storeMutations).toBe(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("dependency closure resolves only the declared digests through the declared channels", async () => {
  const { report, directory } = await runScenario("closure");
  try {
    const installed = report.installed as Record<string, JsonValue>;
    expect(installed.verifyMutations).toBe(0);
    expect(installed.verifyTransportCalls).toBe(0);
    // Every manifest read — record and verify — names the declared digest.
    const subDigest = report.subDigest as string;
    for (const digest of [...installed.recordManifestReads as string[], ...installed.verifyManifestReads as string[]])
      expect(digest).toBe(subDigest);
    const via = report.via as Record<string, JsonValue>;
    expect(via.transportCalls).toEqual([subDigest]);
    expect(via.installed).toBe(true);
    expect(via.recordedVia).toBe("docs");
    const viaMiss = report.viaMiss as Record<string, JsonValue>;
    expect(viaMiss.code).toBe("STORE_MISS");
    expect(viaMiss.namesDigest).toBe(true);
    expect(viaMiss.transportCalls).toBe(1);
    const ambient = report.ambientMiss as Record<string, JsonValue>;
    expect(ambient.code).toBe("STORE_MISS");
    expect(ambient.namesDigest).toBe(true);
    expect(ambient.transportCalls).toBe(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);

test("recomputing under a different oracle is distinct, still self-verifying evidence", async () => {
  const { report, directory } = await runScenario("oracle-replacement");
  try {
    expect(report.digestsDiffer).toBe(true);
    expect(report.firstVerified).toBe(true);
    expect(report.secondVerified).toBe(true);
    expect(Number(report.divergences)).toBeGreaterThan(0);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);
