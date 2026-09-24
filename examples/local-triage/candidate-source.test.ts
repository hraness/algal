import { expect, test } from "bun:test";
import { MemoryApplicationStorage } from "../../src/application-storage";
import { MemoryStore } from "../../src/store-memory";
import type { OrganismManifest } from "../../src/contract";
import type { Digest } from "../../src/digest-type";
import type { JsonValue } from "../../src/values";
import type { Task } from "./contract";
import { TriageCore, hash } from "./core";

const task = (id = "one"): Task => ({ id, title: "A saved task", priority: "normal", status: "open", category: "inbox" });
/** Counts every write and can hide one receipt row from reads. */
class ObservedStore extends MemoryStore {
  writes = 0;
  missingReceipt: Digest | undefined;
  override async getReceipt(ref: Digest) { return ref === this.missingReceipt ? undefined : super.getReceipt(ref); }
  override async putManifest(value: OrganismManifest) { this.writes++; return super.putManifest(value); }
  override async putReceipt(value: JsonValue) { this.writes++; return super.putReceipt(value); }
  override async putValue(value: JsonValue) { this.writes++; return super.putValue(value); }
  override async setSlot(name: string, value: JsonValue) { this.writes++; return super.setSlot(name, value); }
}

test("saved candidates join one private source as bounded, individually equivalent proofs", async () => {
  const store = new ObservedStore(), core = new TriageCore(new MemoryApplicationStorage(store)), initial = await core.initialize({ tasks: [task()] });
  const upgrade = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: initial.head, schemaVersion: 2, config: { ...initial.definition.config, group: "category" }, source: "owner", rationale: "Add categories" });
  const rejected = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: initial.head, schemaVersion: 1, config: initial.definition.config, source: "owner", rationale: "No workflow change" });
  store.writes = 0;
  const proven = await core.withVerifiedSource(async (_source, found) => new Map(found), [], [upgrade.reference, rejected.reference, upgrade.reference]);
  expect([...proven.keys()].sort()).toEqual([upgrade.reference, rejected.reference].sort());
  expect(proven.get(upgrade.reference)).toEqual(await core.inspectEvaluation(upgrade.reference));
  expect(proven.get(rejected.reference)).toEqual(await core.inspectEvaluation(rejected.reference));
  expect(proven.get(rejected.reference)?.evaluation.accepted).toBe(false);
  expect((await core.withVerifiedSource(async (_source, found) => found.size))).toBe(0);
  // A caller's copy cannot poison the scope's own proof.
  await core.withVerifiedSource(async (source, found) => {
    found.get(upgrade.reference)!.evaluation.accepted = false;
    expect((await source.inspectEvaluation(upgrade.reference)).evaluation.accepted).toBe(true);
  }, [], [upgrade.reference]);
  await expect(core.withVerifiedSource(async () => undefined, [], Array.from({ length: 33 }, (_, index) => hash(`candidate-${index}`)))).rejects.toThrow("bound");
  expect(store.writes).toBe(0);
  // A later scope rereads live rows: a missing candidate receipt rejects
  // before the callback runs and is never recreated.
  let entered = false;
  store.missingReceipt = upgrade.evaluation.receipts[0]!;
  await expect(core.withVerifiedSource(async () => { entered = true; }, [], [upgrade.reference])).rejects.toThrow();
  expect(entered).toBe(false); expect(store.writes).toBe(0);
  expect(await store.getReceipt(upgrade.evaluation.receipts[0]!)).toBeUndefined();
  store.missingReceipt = undefined;
  expect((await core.withVerifiedSource(async (_source, found) => found.get(upgrade.reference), [], [upgrade.reference]))).toEqual(upgrade);
});
