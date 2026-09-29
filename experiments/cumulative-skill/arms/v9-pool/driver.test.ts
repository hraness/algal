import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import type { Digest } from "../../../../src/digest";
import { scriptedExecutor } from "../../../../src/effects";
import { FileStore } from "../../../../src/store";
import { asObject, type JsonObject, type JsonValue } from "../../../../src/values";
import { checkFreeze, freezeStudy, hash, readJson, startStage, verifyStage, writeNew, type FrozenIdentity } from "./guards";
import { ARMS, BLOCKS, POOL, POOL_CONTRACT, POOL_BLOCK_IDS, PROTOCOL, RECONCILIATION_CONTRACT, blockById, frozenHoldoutTasks, seedTask } from "./protocol";
import { fixedConfig, inspectSeed, inspectSession, poolDecision, retainedSeedSnapshots, seedInput, stageDone, storePath } from "./results";
import { CEILINGS, checkCeilings, datasets, executeConfig, launchInOrder, mapConcurrent, reconcileStage, stageCounts, type LaunchStatus } from "./run";
import { DEVELOPMENT_CONTRACT, generateStudySeed, type SeedSummary } from "./seed";

const digest = `sha256:${"a".repeat(64)}` as Digest;
const freeze = { digest } as FrozenIdentity;
const ids = [...POOL_BLOCK_IDS];
const primary = ids.slice(0, POOL.primarySize);
const pool = (status: "qualified" | "insufficient", blocks: string[] | null = primary) => ({ contract: POOL_CONTRACT, freeze: digest, status, primary: blocks });
/** The six lowest-index qualified blocks among the launched prefix. */
const lowestQualified = (launched: string[], qualified: (id: string) => boolean) => launched.filter(qualified).slice(0, POOL.primarySize);

/** A scripted pool: `outcome` per block, launches settle after `delay(id)`,
 * and the status map closes a block only after its launch settled. */
async function scriptedPool(outcome: (id: string) => boolean, opts: { width?: number; cap?: number; closed?: Map<string, boolean>;
  delay?: (id: string) => number; fail?: string } = {}) {
  const closed = opts.closed ?? new Map<string, boolean>();
  const launches: string[] = [];
  const status = (id: string): LaunchStatus => !closed.has(id) ? "not-launched" : closed.get(id) ? "qualified" : "not-qualified";
  const launched = await launchInOrder(ids, { width: opts.width ?? POOL.concurrency, cap: opts.cap ?? POOL.launchCap, stopAfter: POOL.minimumQualified, status,
    launch: async id => {
      launches.push(id);
      await new Promise(resolve => setTimeout(resolve, opts.delay?.(id) ?? 0));
      if (id === opts.fail) throw new Error("fixture failure");
      closed.set(id, outcome(id));
    } });
  return { launched, launches, closed, status };
}

describe("v9-pool seed launcher", () => {
  // Qualified at p-01, p-03, p-04, p-06, p-07, p-08, p-10, ...: the sixth closed qualification is p-08.
  const outcome = (id: string) => ![2, 5, 9, 12, 14].includes(ids.indexOf(id) + 1);

  test("launches in order and launches nothing after the sixth closed qualification", async () => {
    const serial = await scriptedPool(outcome, { width: 1 });
    expect(serial.launches).toEqual(ids.slice(0, 8));
    expect(serial.launched).toEqual(ids.slice(0, 8));
    // Three lanes keep launching until the sixth closes, then only drain.
    const wide = await scriptedPool(outcome);
    expect(wide.launches).toEqual(ids.slice(0, wide.launches.length));
    expect(wide.launches.length).toBeGreaterThanOrEqual(8);
    expect(wide.launches.length).toBeLessThanOrEqual(10);
    expect(wide.launched).toEqual(wide.launches);
    expect(wide.launches.every(id => wide.closed.has(id))).toBe(true);
    await expect(launchInOrder(ids, { width: 4, cap: 16, stopAfter: 6, status: () => "not-launched", launch: async () => {} })).rejects.toThrow("concurrency");
  });

  test("never launches past the cap and closes every launched search", async () => {
    const none = await scriptedPool(() => false);
    expect(none.launches).toEqual(ids);
    expect(none.launched).toHaveLength(POOL.launchCap);
    const five = await scriptedPool(() => true, { cap: 5 });
    expect(five.launches).toEqual(ids.slice(0, 5));
    expect(CEILINGS).toEqual({ seed: 16, learning: 24, frozen: 24 });
  });

  test("resumes a partial pool from the first unlaunched block and is a no-op on a closed pool", async () => {
    const closed = new Map(ids.slice(0, 5).map(id => [id, outcome(id)]));
    const resumed = await scriptedPool(outcome, { width: 1, closed });
    expect(resumed.launches).toEqual(ids.slice(5, 8));
    expect(resumed.launched).toEqual(ids.slice(0, 8));
    const done = await scriptedPool(outcome, { closed: new Map(resumed.launched.map(id => [id, outcome(id)])) });
    expect(done.launches).toEqual([]);
    expect(done.launched).toEqual(ids.slice(0, 8));
    // A reconciled block closes as not qualified and the next index launches.
    const reconciled = new Map(ids.slice(0, 3).map(id => [id, false]));
    const after = await scriptedPool(outcome, { width: 1, closed: reconciled });
    expect(after.launches[0]).toBe("p-04");
    expect(after.launched.slice(0, 3)).toEqual(ids.slice(0, 3));
    await expect(scriptedPool(outcome, { cap: 2, closed: reconciled })).rejects.toThrow("exceed the cap");
  });

  test("a failed lane stops new launches, lets its peers finish, and reports the failure", async () => {
    const closed = new Map<string, boolean>();
    await expect(scriptedPool(outcome, { closed, fail: "p-02", delay: id => id === "p-02" ? 0 : 5 })).rejects.toThrow("seed lane failed");
    expect([...closed.keys()].sort()).toEqual(["p-01", "p-03"]);
  });

  test("the primary set does not depend on lane timing", async () => {
    let seed = 7;
    const random = () => { seed = (seed * 48271) % 2147483647; return seed % 7; };
    const sets = new Set<string>();
    for (let round = 0; round < 6; round++) {
      const run = await scriptedPool(outcome, { delay: () => random() });
      expect(run.launched).toEqual(ids.slice(0, run.launched.length));
      sets.add(lowestQualified(run.launched, outcome).join(","));
    }
    expect([...sets]).toEqual(["p-01,p-03,p-04,p-06,p-07,p-08"]);
  });
});

describe("v9-pool reconciliation", () => {
  /** A freeze without a provider route: scripted receipts carry no route to check. */
  const reconcileFreeze = { digest, route: {} } as unknown as FrozenIdentity;
  const block = blockById("p-01");
  const first = seedTask(block);
  const input = seedInput(block);
  const library = asObject(JSON.parse(readFileSync(join(import.meta.dir, "../../pipeline/record-triage.algal.json"), "utf8")), "library");
  const generated = { ...library, key: "organism:v9-pool-driver-fixture" };
  const revised = { ...library, key: "organism:v9-pool-driver-revised" };
  const labels = (split: "train" | "validation") => Object.fromEntries(
    first.inputs.find(batch => batch.split === split)!.expect.out.results.map(row => [row.recordId, row.label]));
  const isRecord = (value: JsonValue, contract: string): value is JsonObject =>
    value !== null && typeof value === "object" && !Array.isArray(value) && value.contract === contract;
  /** Throws while the development record is stored: the attempt was pushed and its score never lands. */
  class DevelopmentFailure extends FileStore {
    override async putValue(value: JsonValue): Promise<Digest> {
      if (isRecord(value, DEVELOPMENT_CONTRACT)) throw new Error("synthetic development record failure");
      return super.putValue(value);
    }
  }
  /** Throws on the first read after a second attempt's aggregate account is
   * stored: the charge landed and the attempt was never pushed. */
  class SelectionFailure extends FileStore {
    private armed = false;
    override async putValue(value: JsonValue): Promise<Digest> {
      const stored = await super.putValue(value);
      if (isRecord(value, "algal.habitat-budget.v1") && Array.isArray(value.runs) && value.runs.length > 5) this.armed = true;
      return stored;
    }
    override async getValue(digest: Digest): Promise<JsonValue | undefined> {
      if (this.armed) throw new Error("synthetic selection read failure");
      return super.getValue(digest);
    }
  }
  /** Throws while the session is stored: nothing of the attempt landed. */
  class SessionFailure extends FileStore {
    override async putValue(value: JsonValue): Promise<Digest> {
      if (isRecord(value, "algal.experiment-session.v1")) throw new Error("synthetic session persistence failure");
      return super.putValue(value);
    }
  }
  const shape = (snapshots: SeedSummary[]) => snapshots.map(s => [s.termination, s.attempts.length, s.inFlight?.generation ?? null]);
  const record = (snapshot: SeedSummary, storeReceipts: number | null) => ({ contract: RECONCILIATION_CONTRACT, freeze: digest, block: block.id, stage: "seed",
    input: hash(input), termination: "interrupted", snapshot: hash(snapshot), storeReceipts, retry: "none" });
  /** Runs one scripted search the way `seed` does: the stage is claimed and
   * every summary is retained beside it; a store failure ends the search. */
  async function retainedSearch(study: string, store: FileStore, responses: Record<string, JsonValue>) {
    const dir = startStage(study, reconcileFreeze, block.id, "seed", input);
    const snapshots: SeedSummary[] = [];
    const [outcome] = await Promise.allSettled([generateStudySeed({ first, blockId: block.id, corpus: block.id, store, executors: [scriptedExecutor(responses)],
      onAttempt: summary => {
        snapshots.push(summary);
        const path = join(dir, `seed-${hash(summary).slice(7)}.json`);
        if (!existsSync(path)) writeNew(path, summary);
      } })]);
    const receipts = readdirSync(join(store.dir, "runs")).length;
    return { dir, snapshots, outcome: outcome!, receipts };
  }

  test("closes a search whose development score never landed from the snapshot before the push, exactly once", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      const study = join(root, "study");
      const store = new DevelopmentFailure(storePath(study, block.id, "seed"));
      const { dir, snapshots, outcome, receipts } = await retainedSearch(study, store, { writer: { manifest: generated }, classify: {} });
      expect(outcome.status).toBe("rejected");
      // Retained: initial, generation 1 in flight, then the thrown-error
      // snapshot carrying the pushed attempt without its development score.
      expect(shape(snapshots)).toEqual([["in-progress", 0, null], ["in-progress", 0, 1], ["interrupted", 1, null]]);
      expect(snapshots[2]!.attempts[0]!.developmentRecord).toBeNull();
      expect(retainedSeedSnapshots(dir, "p-01/seed").map(s => s.digest)).toEqual([hash(snapshots[2]), hash(snapshots[1]), hash(snapshots[0])]);
      // Writer, task run (one receipt with the identical training case),
      // validation case, then the development run.
      expect(receipts).toBe(4);
      const closed = await reconcileStage(study, reconcileFreeze, "p-01", "seed");
      expect(closed).toEqual(record(snapshots[1]!, 4) as never);
      expect(readJson(join(dir, "reconciliation.json"))).toEqual(closed);
      expect(readJson(join(dir, "result.json"))).toEqual({ ...snapshots[1], termination: "interrupted" });
      expect(verifyStage(study, reconcileFreeze, "p-01", "seed", input)).toEqual({ ...snapshots[1], termination: "interrupted" });
      const seed = await inspectSeed(study, reconcileFreeze, block);
      expect(seed.reconciled).toBe(true);
      expect([seed.summary.termination, seed.summary.qualified, seed.summary.attempts.length, seed.summary.inFlight?.generation]).toEqual(["interrupted", false, 0, 1]);
      expect(seed.cost.admittedRuns).toBe(0);
      expect(seed.unreferenced.admittedRuns).toBe(4);
      expect(poolDecision([{ block: block.id, seed }])).toMatchObject({ launched: ["p-01"], interrupted: ["p-01"], qualified: [], status: "in-progress" });
      await expect(reconcileStage(study, reconcileFreeze, "p-01", "seed")).rejects.toThrow("already closed");
      await expect(reconcileStage(study, reconcileFreeze, "p-02", "seed")).rejects.toThrow("never started");
      await expect(reconcileStage(study, reconcileFreeze, "p-99", "seed")).rejects.toThrow("unknown block");
      await expect(reconcileStage(study, reconcileFreeze, "p-01", "frozen-writer")).rejects.toThrow("unknown stage");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60_000);

  test("skips a thrown-error snapshot that charged an attempt it never pushed, keeps one that verifies, and refuses an early closing", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      // Generation 1 completes with its development score; generation 2's
      // charge lands and then the selection read fails before the push.
      const study = join(root, "study");
      const store = new SelectionFailure(storePath(study, block.id, "seed"));
      const { dir, snapshots, outcome, receipts } = await retainedSearch(study, store, { writer: [{ manifest: generated }, { manifest: revised }], classify: {} });
      expect(outcome.status).toBe("rejected");
      expect(shape(snapshots)).toEqual([["in-progress", 0, null], ["in-progress", 0, 1], ["in-progress", 1, null], ["in-progress", 1, 2], ["interrupted", 1, 2]]);
      expect(snapshots[4]!.account).not.toBe(snapshots[3]!.account);
      // Four receipts from generation 1 and three from the unpushed generation 2.
      expect(receipts).toBe(7);
      // A hand-written record that names an earlier snapshot hides the completed attempt.
      writeNew(join(dir, "reconciliation.json"), record(snapshots[1]!, 7));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("a later retained snapshot verifies");
      rmSync(join(dir, "reconciliation.json"));
      // Naming the unverifiable thrown-error snapshot fails the verifier itself.
      writeNew(join(dir, "reconciliation.json"), record(snapshots[4]!, 7));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("aggregate account mismatch");
      rmSync(join(dir, "reconciliation.json"));
      // A seed record always counts the store's receipts.
      writeNew(join(dir, "reconciliation.json"), record(snapshots[3]!, null));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("store receipt count");
      rmSync(join(dir, "reconciliation.json"));
      writeNew(join(dir, "reconciliation.json"), record(snapshots[3]!, 6));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("store receipts differ");
      rmSync(join(dir, "reconciliation.json"));
      const closed = await reconcileStage(study, reconcileFreeze, "p-01", "seed");
      expect(closed).toMatchObject({ snapshot: hash(snapshots[3]), storeReceipts: 7 });
      const seed = await inspectSeed(study, reconcileFreeze, block);
      // Five admissions charged to generation 1; three receipts no account names.
      expect([seed.summary.attempts.length, seed.summary.inFlight?.generation, seed.cost.admittedRuns, seed.unreferenced.admittedRuns]).toEqual([1, 2, 5, 3]);
      // A thrown-error snapshot that verifies is preferred over the plan it repeats.
      const other = join(root, "other");
      const session = await retainedSearch(other, new SessionFailure(storePath(other, block.id, "seed")), { writer: { manifest: generated }, classify: {} });
      expect(shape(session.snapshots)).toEqual([["in-progress", 0, null], ["in-progress", 0, 1], ["interrupted", 0, 1]]);
      const thrown = await reconcileStage(other, reconcileFreeze, "p-01", "seed");
      expect(thrown).toMatchObject({ snapshot: hash(session.snapshots[2]), storeReceipts: session.receipts });
      expect(readJson(join(session.dir, "result.json"))).toEqual(session.snapshots[2] as never);
      expect((await inspectSeed(other, reconcileFreeze, block)).unreferenced.admittedRuns).toBe(session.receipts);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60_000);

  test("a damaged store never licenses an earlier closing: an in-progress snapshot that does not verify stops reconcile and inspection", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      const study = join(root, "study");
      const store = new SelectionFailure(storePath(study, block.id, "seed"));
      const { dir, snapshots } = await retainedSearch(study, store, { writer: [{ manifest: generated }, { manifest: revised }], classify: {} });
      expect(shape(snapshots)).toEqual([["in-progress", 0, null], ["in-progress", 0, 1], ["in-progress", 1, null], ["in-progress", 1, 2], ["interrupted", 1, 2]]);
      // Generation 1's development record is referenced by every snapshot from the settled one on.
      const record1 = snapshots[2]!.attempts[0]!.developmentRecord!;
      rmSync(join(store.dir, "values", `${record1.slice(7)}.json`));
      await expect(reconcileStage(study, reconcileFreeze, "p-01", "seed")).rejects.toThrow("retained in-progress snapshot does not verify");
      expect(existsSync(join(dir, "reconciliation.json"))).toBe(false);
      // A hand-written record naming the plan before the damaged attempt is refused the same way.
      writeNew(join(dir, "reconciliation.json"), record(snapshots[1]!, 7));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("a later in-progress snapshot does not verify");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60_000);

  test("a search whose store settled the next generation cannot be closed as interrupted before it", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      // A qualified search whose terminal snapshot is missing: the plan-1
      // snapshot verifies on its own, but the store holds the promoted catalog.
      const study = join(root, "study");
      const passing = await retainedSearch(study, new FileStore(storePath(study, block.id, "seed")),
        { writer: { manifest: generated }, classify: [labels("train"), labels("train"), labels("validation")] });
      expect(shape(passing.snapshots)).toEqual([["in-progress", 0, null], ["in-progress", 0, 1], ["qualified", 1, null]]);
      rmSync(join(passing.dir, `seed-${hash(passing.snapshots[2]).slice(7)}.json`));
      await expect(reconcileStage(study, reconcileFreeze, "p-01", "seed")).rejects.toThrow("holds a closed generation 1 (promoted catalog)");
      writeNew(join(passing.dir, "reconciliation.json"), record(passing.snapshots[1]!, passing.receipts));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("holds a closed generation 1 (promoted catalog)");
      // A search exhausted at the generation limit whose terminal snapshot is
      // missing: generation 8 was scored, so the plan-8 snapshot is no closing.
      const other = join(root, "other");
      const exhausted = await retainedSearch(other, new FileStore(storePath(other, block.id, "seed")), { writer: { manifest: generated }, classify: {} });
      expect(shape(exhausted.snapshots).at(-1)).toEqual(["generation-limit", 8, null]);
      rmSync(join(exhausted.dir, `seed-${hash(exhausted.snapshots.at(-1)).slice(7)}.json`));
      await expect(reconcileStage(other, reconcileFreeze, "p-01", "seed")).rejects.toThrow("holds a closed generation 8 (development record)");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60_000);

  test("recovers a search that closed on its own but lost its result, writing no record, and finishes a half-written close", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      // Killed between the terminal snapshot and the result: the terminal
      // snapshot is the result, and the search inspects as its own closing.
      const study = join(root, "study");
      const exhausted = await retainedSearch(study, new FileStore(storePath(study, block.id, "seed")), { writer: { manifest: generated }, classify: {} });
      expect(exhausted.outcome.status).toBe("fulfilled");
      const terminal = exhausted.snapshots.at(-1)!;
      expect([terminal.termination, terminal.attempts.length]).toEqual(["generation-limit", 8]);
      expect(retainedSeedSnapshots(exhausted.dir, "p-01/seed")[0]).toMatchObject({ digest: hash(terminal), terminal: true });
      const own = await reconcileStage(study, reconcileFreeze, "p-01", "seed");
      expect(own).toEqual({ block: "p-01", stage: "seed", termination: "generation-limit", snapshot: hash(terminal), storeReceipts: exhausted.receipts });
      expect(existsSync(join(exhausted.dir, "reconciliation.json"))).toBe(false);
      expect(readJson(join(exhausted.dir, "result.json"))).toEqual(terminal as never);
      const seed = await inspectSeed(study, reconcileFreeze, block);
      expect([seed.reconciled, seed.summary.termination, seed.summary.qualified, seed.summary.attempts.length]).toEqual([false, "generation-limit", false, 8]);
      // Every receipt file is named by the account (identical receipts share one file).
      expect(seed.unreferenced.admittedRuns).toBe(0);
      expect(seed.cost.admittedRuns).toBeGreaterThanOrEqual(exhausted.receipts);
      expect(poolDecision([{ block: block.id, seed }])).toMatchObject({ launched: ["p-01"], unqualified: ["p-01"], interrupted: [], qualified: [] });
      await expect(reconcileStage(study, reconcileFreeze, "p-01", "seed")).rejects.toThrow("already closed");
      // A record beside a search that closed on its own is refused either way.
      rmSync(join(exhausted.dir, "result.json"));
      writeNew(join(exhausted.dir, "reconciliation.json"), record(exhausted.snapshots[1]!, exhausted.receipts));
      await expect(reconcileStage(study, reconcileFreeze, "p-01", "seed")).rejects.toThrow("record stands beside a search that closed on its own");
      writeNew(join(exhausted.dir, "result.json"), terminal);
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("already terminated as generation-limit");
      // Killed between the record and the result: the second `reconcile`
      // rebuilds the result from the same evidence and keeps the record.
      const other = join(root, "other");
      const session = await retainedSearch(other, new SessionFailure(storePath(other, block.id, "seed")), { writer: { manifest: generated }, classify: {} });
      const closed = await reconcileStage(other, reconcileFreeze, "p-01", "seed");
      const result = readJson(join(session.dir, "result.json"));
      rmSync(join(session.dir, "result.json"));
      expect(stageDone(other, block.id, "seed")).toBe(false);
      expect(await reconcileStage(other, reconcileFreeze, "p-01", "seed")).toEqual(closed);
      expect(readJson(join(session.dir, "result.json"))).toEqual(result);
      expect(readJson(join(session.dir, "reconciliation.json"))).toEqual(closed);
      expect((await inspectSeed(other, reconcileFreeze, block)).reconciled).toBe(true);
      // A record that disagrees with the evidence is never completed.
      rmSync(join(session.dir, "result.json"));
      rmSync(join(session.dir, "reconciliation.json"));
      writeNew(join(session.dir, "reconciliation.json"), { ...closed, storeReceipts: session.receipts + 1 });
      await expect(reconcileStage(other, reconcileFreeze, "p-01", "seed")).rejects.toThrow("saved reconciliation record differs from the evidence");
      expect(existsSync(join(session.dir, "result.json"))).toBe(false);
      // The same for an arm stage.
      const arm = startStage(other, reconcileFreeze, "p-02", "learning-fixed", { arm: "fixed" });
      const armRecord = await reconcileStage(other, reconcileFreeze, "p-02", "learning-fixed");
      rmSync(join(arm, "result.json"));
      expect(await reconcileStage(other, reconcileFreeze, "p-02", "learning-fixed")).toEqual(armRecord);
      expect(readJson(join(arm, "result.json"))).toEqual({ session: null, reconciliation: hash(armRecord) });
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60_000);

  const snapshot = (attempts: number, inFlight: unknown, termination = "in-progress") => ({
    contract: "algal.study-seed.v3", blockId: "p-02", qualified: false, manifest: null, termination, inFlight,
    attempts: Array.from({ length: attempts }, (_, i) => ({ generation: i + 1 })),
  });
  const retain = (dir: string, summary: unknown) => writeNew(join(dir, `seed-${hash(summary).slice(7)}.json`), summary);

  test("recovers a qualified search that lost its result, refuses a record beside it, a snapshot without a store or that does not verify, a forged terminal one, a foreign binding, and a renamed file", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      const study = join(root, "study");
      const passing = await retainedSearch(study, new FileStore(storePath(study, block.id, "seed")),
        { writer: { manifest: generated }, classify: [labels("train"), labels("train"), labels("validation")] });
      expect(passing.outcome.status).toBe("fulfilled");
      expect(shape(passing.snapshots)).toEqual([["in-progress", 0, null], ["in-progress", 0, 1], ["qualified", 1, null]]);
      // The qualified snapshot is the search's own closing; nothing is reconciled.
      expect(await reconcileStage(study, reconcileFreeze, "p-01", "seed")).toEqual({ block: "p-01", stage: "seed", termination: "qualified", snapshot: hash(passing.snapshots[2]), storeReceipts: passing.receipts });
      expect(readJson(join(passing.dir, "result.json"))).toEqual(passing.snapshots[2] as never);
      const seed = await inspectSeed(study, reconcileFreeze, block);
      expect([seed.reconciled, seed.summary.qualified, seed.unreferenced.admittedRuns]).toEqual([false, true, 0]);
      expect(poolDecision([{ block: block.id, seed }])).toMatchObject({ qualified: ["p-01"], interrupted: [] });
      writeNew(join(passing.dir, "reconciliation.json"), record(passing.snapshots[1]!, passing.receipts));
      await expect(inspectSeed(study, reconcileFreeze, block)).rejects.toThrow("already terminated as qualified");
      const dir = startStage(root, freeze, "p-02", "seed", { block: "p-02" });
      await expect(reconcileStage(root, freeze, "p-02", "seed")).rejects.toThrow("no retained seed snapshot");
      retain(dir, snapshot(0, null));
      retain(dir, snapshot(0, { generation: 1 }));
      await expect(reconcileStage(root, freeze, "p-02", "seed")).rejects.toThrow("no seed store");
      mkdirSync(storePath(root, "p-02", "seed"), { recursive: true });
      // A plan that does not verify is damage, not an earlier closing; only a
      // thrown-error snapshot may be passed over, and one alone leaves nothing.
      await expect(reconcileStage(root, freeze, "p-02", "seed")).rejects.toThrow("retained in-progress snapshot does not verify");
      expect(existsSync(join(dir, "reconciliation.json"))).toBe(false);
      const alone = startStage(root, freeze, "p-06", "seed", { block: "p-06" });
      retain(alone, { ...snapshot(0, { generation: 1 }, "interrupted"), blockId: "p-06" });
      mkdirSync(storePath(root, "p-06", "seed"), { recursive: true });
      await expect(reconcileStage(root, freeze, "p-06", "seed")).rejects.toThrow("no retained snapshot verifies");
      // A terminal snapshot is closed by the seed verifier, never by the reconciler's own rules.
      const terminal = startStage(root, freeze, "p-03", "seed", { block: "p-03" });
      retain(terminal, snapshot(3, null, "generation-limit"));
      mkdirSync(storePath(root, "p-03", "seed"), { recursive: true });
      await expect(reconcileStage(root, freeze, "p-03", "seed")).rejects.toThrow("v9-pool seed: summary protocol mismatch");
      expect(existsSync(join(terminal, "result.json"))).toBe(false);
      retain(terminal, snapshot(4, { generation: 5 }));
      await expect(reconcileStage(root, freeze, "p-03", "seed")).rejects.toThrow("already terminated as generation-limit below a later one");
      retain(terminal, snapshot(5, null, "budget-limit"));
      await expect(reconcileStage(root, freeze, "p-03", "seed")).rejects.toThrow("more than one retained snapshot is terminal");
      const forged = startStage(root, freeze, "p-04", "seed", { block: "p-04" });
      retain(forged, snapshot(1, null));
      writeFileSync(join(forged, "binding.json"), JSON.stringify({ ...(readJson(join(forged, "binding.json")) as object), freeze: hash("other") }));
      await expect(reconcileStage(root, freeze, "p-04", "seed")).rejects.toThrow("binding mismatch");
      const renamed = startStage(root, freeze, "p-05", "seed", { block: "p-05" });
      writeFileSync(join(renamed, `seed-${"b".repeat(64)}.json`), JSON.stringify(snapshot(1, null)));
      await expect(reconcileStage(root, freeze, "p-05", "seed")).rejects.toThrow("snapshot hash mismatch");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 60_000);

  test("closes an arm stage without a session and refuses a completed one", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-reconcile-"));
    try {
      const dir = startStage(root, freeze, "p-01", "learning-optimizer", { arm: "optimizer" });
      const closed = await reconcileStage(root, freeze, "p-01", "learning-optimizer");
      expect(closed.snapshot).toBeNull();
      expect(readJson(join(dir, "result.json"))).toEqual({ session: null, reconciliation: hash(closed) });
      const done = startStage(root, freeze, "p-01", "frozen-fixed", { arm: "fixed" });
      writeNew(join(done, "result.json"), { session: digest });
      await expect(reconcileStage(root, freeze, "p-01", "frozen-fixed")).rejects.toThrow("already closed");
      expect(stageCounts(root)).toEqual({ seed: 0, learning: 1, frozen: 1 });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe("v9-pool hard ceilings", () => {
  test("arm stages need a qualified pool and a primary block; no stage passes its ceiling", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-ceiling-"));
    try {
      expect(() => checkCeilings(root, { block: "p-01", stage: "learning-fixed" })).toThrow("no pool decision");
      expect(checkCeilings(root, { block: "p-01", stage: "seed" })).toEqual({ seed: 0, learning: 0, frozen: 0 });
      writeNew(join(root, "pool.json"), pool("insufficient", null));
      expect(() => checkCeilings(root, { block: "p-01", stage: "frozen-optimizer" })).toThrow("did not qualify");
      rmSync(join(root, "pool.json"));
      writeNew(join(root, "pool.json"), pool("qualified", [...primary.slice(0, 5), "p-01"]));
      expect(() => checkCeilings(root, { block: "p-01", stage: "learning-fixed" })).toThrow("six distinct blocks");
      rmSync(join(root, "pool.json"));
      writeNew(join(root, "pool.json"), pool("qualified"));
      expect(() => checkCeilings(root, { block: "p-07", stage: "learning-fixed" })).toThrow("only on the six primary blocks");
      for (const id of primary) for (const arm of ARMS) {
        checkCeilings(root, { block: id, stage: `learning-${arm}` });
        startStage(root, freeze, id, `learning-${arm}`, { arm });
      }
      expect(checkCeilings(root)).toEqual({ seed: 0, learning: 24, frozen: 0 });
      expect(() => checkCeilings(root, { block: "p-01", stage: "learning-fixed" })).toThrow("reached the plan ceiling of 24");
      expect(() => checkCeilings(root, { block: "p-01", stage: "frozen-fixed" })).not.toThrow();
      for (const block of BLOCKS) startStage(root, freeze, block.id, "seed", { block: block.id });
      expect(() => checkCeilings(root, { block: "p-01", stage: "seed" })).toThrow("reached the plan ceiling of 16");
      startStage(root, freeze, "p-07", "learning-fixed", { arm: "fixed" });
      expect(() => checkCeilings(root)).toThrow("learning stages exceed the plan ceiling");
      startStage(root, freeze, "p-08", "calibration", { arm: "fixed" });
      expect(() => stageCounts(root)).toThrow("unknown stage calibration");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe("v9-pool execution guards", () => {
  test("an attempt claim cannot be retried and its input cannot be substituted", () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-stage-"));
    try {
      const path = startStage(root, freeze, "p-01", "seed", { input: 1 });
      expect(() => startStage(root, freeze, "p-01", "seed", { input: 1 })).toThrow("already started");
      expect(() => verifyStage(root, freeze, "p-01", "seed", { input: 1 })).toThrow();
      writeNew(join(path, "result.json"), { finished: true });
      expect(verifyStage(root, freeze, "p-01", "seed", { input: 1 })).toEqual({ finished: true });
      expect(() => verifyStage(root, freeze, "p-01", "seed", { input: 2 })).toThrow("binding mismatch");
      writeFileSync(join(path, "input.json"), '{"input":2}');
      expect(() => verifyStage(root, freeze, "p-01", "seed", { input: 1 })).toThrow("snapshot mismatch");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("a failed lane waits for its in-flight peer before returning", async () => {
    const finished: number[] = [];
    await expect(mapConcurrent([0, 1, 2], 2, async item => {
      if (item === 0) throw new Error("fixture failure");
      await new Promise(resolve => setTimeout(resolve, 10));
      finished.push(item);
    })).rejects.toThrow("study lane failed");
    expect(finished).toEqual([1]);
  });

  test("learning refuses without a pool decision; frozen execution rejects a substituted fixed manifest even with rewritten config binding", async () => {
    const root = mkdtempSync(join(tmpdir(), "algal-v9-pool-fixed-"));
    try {
      const study = join(root, "study");
      const data = datasets();
      expect(data).toHaveLength(16);
      const frozen = freezeStudy(study, PROTOCOL, data, "a".repeat(40));
      expect(checkFreeze(study, PROTOCOL, data).digest).toBe(frozen.digest);
      const { learn } = await import("./run");
      await expect(learn(study, frozen)).rejects.toThrow("no pool decision");
      const block = PROTOCOL.blocks[0]!;
      const tasks = frozenHoldoutTasks(block).slice(0, 1);
      const manifest = manifestToJson(parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:fixed-fixture", name: "fixed fixture",
        cells: [{ id: "in", kind: "input", outputs: { records: { type: "json" }, spec: { type: "json" } } },
          { id: "out", kind: "const", outputs: { value: { type: "json", value: tasks[0]!.inputs.find(batch => batch.split === "holdout")!.expect.out } } }],
        edges: [], interface: { inputs: { records: { cell: "in", port: "records" }, spec: { cell: "in", port: "spec" } }, outputs: { out: { cell: "out", port: "value" } } },
        budgets: { maxSteps: 8, maxAgentCalls: 2, maxWork: 500000 },
      }));
      const config = fixedConfig(manifest, tasks);
      // No arm stage runs before the pool decision names its primary blocks.
      await expect(executeConfig({ study, freeze: frozen, block, stage: "frozen-fixed", config, executor: scriptedExecutor({}) })).rejects.toThrow("no pool decision");
      expect(existsSync(join(study, block.id))).toBe(false);
      writeNew(join(study, "pool.json"), { ...pool("qualified"), freeze: frozen.digest });
      const outside = PROTOCOL.blocks[6]!;
      await expect(executeConfig({ study, freeze: frozen, block: outside, stage: "frozen-fixed", config, executor: scriptedExecutor({}) })).rejects.toThrow("six primary blocks");
      await executeConfig({ study, freeze: frozen, block, stage: "frozen-fixed", config, executor: scriptedExecutor({}) });
      const checked = await inspectSession(study, frozen, block, "frozen-fixed", config, tasks);
      expect(checked.counts.scorerPassed).toBe(1);
      await expect(executeConfig({ study, freeze: frozen, block, stage: "frozen-fixed", config, executor: scriptedExecutor({}) })).rejects.toThrow("store already exists");
      const replacement = fixedConfig({ ...(manifest as object), key: "organism:substituted" } as JsonValue, tasks);
      const attempt = join(study, block.id, "attempts", "frozen-fixed");
      const binding = JSON.parse(readFileSync(join(attempt, "binding.json"), "utf8"));
      writeFileSync(join(attempt, "binding.json"), JSON.stringify({ ...binding, input: hash(replacement) }));
      writeFileSync(join(attempt, "input.json"), JSON.stringify(replacement));
      await expect(inspectSession(study, frozen, block, "frozen-fixed", replacement, tasks)).rejects.toThrow("different manifest");
      const saved = readJson(join(study, "protocol.json")) as Record<string, unknown>;
      writeFileSync(join(study, "protocol.json"), JSON.stringify({ ...saved, concurrency: 1 }));
      expect(() => checkFreeze(study, PROTOCOL, data)).toThrow("protocol differs");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);
});
