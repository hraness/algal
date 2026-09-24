import { expect, test } from "bun:test";
import { MemoryApplicationStorage } from "../../src/application-storage";
import { MemoryStore } from "../../src/store-memory";
import { getApplicationRecord, parseApplicationRevision } from "../../src/application-contract";
import { manifestToJson, type OrganismManifest } from "../../src/contract";
import type { Digest } from "../../src/digest-type";
import type { JsonValue } from "../../src/values";
import { DEFAULT_SESSION, type Capture, type Command, type Task } from "./contract";
import { SlotTriageSessionStorage, TriageCore, hash, verifyTransfer, withVerifiedTransfer } from "./core";

const task = (id = "one"): Task => ({ id, title: "A saved task", priority: "normal", status: "open", category: "inbox" });
const command = (capture: Capture, label: string, action: Command["action"]): Command => ({ contract: "algal.triage-command.v1", expectedHead: capture.head, operation: hash(label), action });

/** The ordinary memory adapter with observable writes and one missing CAS row.
 * A write to that row would repair it, which reads/recovery must never do. */
class ObservedStore extends MemoryStore {
  writes = 0;
  missing: { kind: "manifest" | "receipt" | "value"; ref: Digest } | undefined;
  private wrote(kind: "manifest" | "receipt" | "value", ref: Digest): void {
    this.writes++;
    if (this.missing?.kind === kind && this.missing.ref === ref) this.missing = undefined;
  }
  override async getManifest(ref: Digest) { return this.missing?.kind === "manifest" && this.missing.ref === ref ? undefined : super.getManifest(ref); }
  override async getReceipt(ref: Digest) { return this.missing?.kind === "receipt" && this.missing.ref === ref ? undefined : super.getReceipt(ref); }
  override async getValue(ref: Digest) { return this.missing?.kind === "value" && this.missing.ref === ref ? undefined : super.getValue(ref); }
  override async putManifest(value: OrganismManifest) { this.wrote("manifest", hash(manifestToJson(value))); return super.putManifest(value); }
  override async putReceipt(value: JsonValue) { this.wrote("receipt", hash(value)); return super.putReceipt(value); }
  override async putValue(value: JsonValue) { this.wrote("value", hash(value)); return super.putValue(value); }
  override async setSlot(name: string, value: JsonValue) { this.writes++; return super.setSlot(name, value); }
}

test("portable task lifecycle retains user facts through workflow adoption and schema migration", async () => {
  const storage = new MemoryApplicationStorage(), core = new TriageCore(storage);
  const initial = await core.initialize({ tasks: [task()] });
  const workflow = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: initial.head, schemaVersion: 1, config: { sort: "title", group: "none", allowReopen: false }, source: "owner", rationale: "Keep tasks in title order" });
  const changed = await core.adopt(workflow.reference, hash("workflow"));
  expect(changed.memory).toBe(initial.memory);
  expect((await core.current()).transition.kind).toBe("activate");
  const upgrade = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: changed.head, schemaVersion: 2, config: { ...changed.definition.config, group: "category" }, source: "owner", rationale: "Add editable categories" });
  const migrated = await new TriageCore(storage).adopt(upgrade.reference, hash("schema-migration"));
  expect(migrated.tasks).toEqual(initial.tasks);
  expect(migrated.memory).not.toBe(initial.memory);
  expect((await core.current()).transition.kind).toBe("migrate");
  expect(migrated.view.form.fields.map(field => field.name)).toEqual(["title", "priority", "category"]);
  const edited = await core.command(command(migrated, "edit-category", { kind: "edit", taskId: "one", title: "User text after migration", priority: "high", category: "work" }));
  const reopened = await new TriageCore(storage).capture();
  expect(reopened.head).toBe(edited.head);
  expect(reopened.tasks[0]).toEqual({ ...task(), title: "User text after migration", priority: "high", category: "work" });
  const transfer = await core.export();
  expect((await verifyTransfer(transfer)).states).toBe(4);
  const runs = transfer.records.filter(row => row.value && typeof row.value === "object" && !Array.isArray(row.value) && row.value.contract === "algal.run.v1");
  expect(runs.length).toBeGreaterThan(0);
  expect(runs.every(row => row.kind === "receipt")).toBe(true);
});

test("slot sessions survive core restart, serialize compare-and-set, and require explicit stale rebasing", async () => {
  const storage = new MemoryApplicationStorage(), core = new TriageCore(storage), initial = await core.initialize({ tasks: [task()] });
  const session = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, taskId: "one", title: "Unsubmitted edit" } };
  const saves = await Promise.allSettled([core, new TriageCore(storage)].map(host => host.saveSession("browser", { expectedSession: null, capturedHead: initial.head, session })));
  expect(saves.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(saves.filter(result => result.status === "rejected")).toHaveLength(1);
  const saved = await new TriageCore(storage).loadSession("browser");
  expect(saved.record?.session).toEqual(session);
  const changed = await core.command(command(initial, "complete", { kind: "complete", taskId: "one" }));
  expect((await core.loadSession("browser")).status).toBe("stale");
  await expect(core.saveSession("browser", { expectedSession: saved.reference, capturedHead: initial.head, session })).rejects.toThrow("Stale");
  const rebased = await core.saveSession("browser", { expectedSession: saved.reference, capturedHead: changed.head, session });
  expect(rebased.status).toBe("current");
  expect((await core.capture()).tasks[0]?.title).toBe("A saved task");
  expect(JSON.stringify(await core.export())).not.toContain("Unsubmitted edit");
  const sessions = new SlotTriageSessionStorage(storage), corrupt = { unexpected: "saved malformed session" };
  await sessions.compareAndSet(core.application, "browser", rebased.reference, corrupt);
  await expect(core.loadSession("browser")).rejects.toThrow();
  expect(await sessions.read(core.application, "browser")).toEqual(corrupt);
  await expect(sessions.compareAndSet(core.application, "browser", hash(corrupt), { oversized: "x".repeat(4096) })).rejects.toThrow("byte bound");
  expect(await sessions.read(core.application, "browser")).toEqual(corrupt);
});

test("saved proposals reopen and export without writes, including rejected proposals", async () => {
  const store = new ObservedStore(), core = new TriageCore(new MemoryApplicationStorage(store)), initial = await core.initialize({ tasks: [task()] });
  const rejected = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: initial.head, schemaVersion: 1, config: initial.definition.config, source: "owner", rationale: "No workflow change" });
  const candidate = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: initial.head, schemaVersion: 2, config: { ...initial.definition.config, group: "category" }, source: "owner", rationale: "Add categories" });
  store.writes = 0;
  expect((await core.inspectEvaluation(rejected.reference)).evaluation.accepted).toBe(false);
  expect(await core.inspectEvaluation(candidate.reference)).toEqual(candidate);
  const transfer = await core.export([rejected.reference, candidate.reference]);
  expect(transfer.records.some(record => record.reference === candidate.reference)).toBe(true);
  expect(transfer.records.some(record => record.reference === rejected.reference)).toBe(true);
  expect(store.writes).toBe(0);
  expect((await verifyTransfer(transfer)).head).toBe(initial.head);
  const imported = new TriageCore(new MemoryApplicationStorage());
  await imported.import(transfer);
  // Import saves portable evidence without publishing another application's
  // head. Replay its exact lifecycle before reopening the pending evaluation.
  for (const original of await core.service.history(core.application)) {
    const t = original.transition;
    await imported.service.commit({ application: imported.application, operation: t.operation, kind: t.kind, expectedHead: t.previous, revision: t.revision, memory: t.memory, intents: [], evidence: t.evidence, causedBy: t.causedBy });
  }
  expect((await imported.capture()).definition.schemaVersion).toBe(1);
  expect(await imported.inspectEvaluation(candidate.reference)).toEqual(candidate);
  expect((await imported.inspectEvaluation(rejected.reference)).evaluation.accepted).toBe(false);
  const revision = await getApplicationRecord(store, candidate.evaluation.candidateRevision, parseApplicationRevision);
  store.missing = { kind: "manifest", ref: revision.entrypoints.find(entry => entry.name === "view")!.manifest };
  await expect(core.inspectEvaluation(candidate.reference)).rejects.toThrow();
  await expect(core.export([candidate.reference])).rejects.toThrow();
  await expect(core.adopt(candidate.reference, hash("missing-candidate"))).rejects.toThrow();
  expect(store.writes).toBe(0);
  expect(store.missing).toBeDefined();
});

test("a missing historical update stops capture and mutations before any evidence can be recreated", async () => {
  const store = new ObservedStore(), core = new TriageCore(new MemoryApplicationStorage(store)), initial = await core.initialize({ tasks: [task()] });
  const complete = await core.command(command(initial, "finish", { kind: "complete", taskId: "one" }));
  const reopened = await core.command(command(complete, "reopen", { kind: "reopen", taskId: "one" }));
  const history = await core.service.history(core.application), missing = history[1]!.transition.evidence[0]!;
  store.missing = { kind: "value", ref: missing }; store.writes = 0;
  await expect(core.capture()).rejects.toThrow();
  await expect(core.command(command(reopened, "must-not-write", { kind: "complete", taskId: "one" }))).rejects.toThrow();
  await expect(core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: reopened.head, schemaVersion: 2, config: reopened.definition.config, source: "owner", rationale: "Must preserve missing history" })).rejects.toThrow();
  expect(store.writes).toBe(0);
  expect(store.missing).toEqual({ kind: "value", ref: missing });
  expect((await core.current()).digest).toBe(reopened.head);
});

test("interrupted genesis cannot be rebuilt by initialization over a prepared operation", async () => {
  class InterruptedStorage extends MemoryApplicationStorage {
    override async writeHead(_application: string, _value: JsonValue): Promise<void> { throw new Error("simulated interruption before head"); }
  }
  const store = new ObservedStore(), storage = new InterruptedStorage(store), core = new TriageCore(storage);
  await expect(core.initialize()).rejects.toThrow("acknowledgment uncertain");
  expect(await storage.operationCount(core.application)).toBe(1);
  expect(await storage.readHead(core.application)).toBeUndefined();
  store.writes = 0;
  await expect(new TriageCore(storage).initialize()).rejects.toThrow("exact retained-operation recovery");
  expect(store.writes).toBe(0);
});


test("source snapshots preserve missing receipt/value/manifest rows and never heal them", async () => {
  const store = new ObservedStore(), core = new TriageCore(new MemoryApplicationStorage(store));
  const initial = await core.initialize({ tasks: [task()] });
  await core.command(command(initial, "snapshot-proof", { kind: "complete", taskId: "one" }));
  const transfer = await core.export(), receipt = transfer.records.find(row => row.kind === "receipt")!, manifest = transfer.records.find(row => row.kind === "manifest")!;
  for (const missing of [{ kind: "receipt" as const, ref: receipt.reference }, { kind: "value" as const, ref: receipt.reference }, { kind: "manifest" as const, ref: manifest.reference }]) {
    store.missing = missing; store.writes = 0;
    let entered = false;
    await expect(core.withVerifiedSource(async () => { entered = true; })).rejects.toThrow();
    await expect(core.capture()).rejects.toThrow();
    expect(entered).toBe(false);
    expect(store.writes).toBe(0);
    expect(store.missing).toEqual(missing);
    store.missing = undefined;
    expect((await core.capture()).tasks[0]?.status).toBe("done");
  }
});

test("isolated proof results cannot be poisoned and source/head proofs expire with their scope", async () => {
  const store = new ObservedStore(), core = new TriageCore(new MemoryApplicationStorage(store));
  const initial = await core.initialize({ tasks: [task()] });
  const candidate = await core.proposeEvaluate({ contract: "algal.triage-proposal.v1", expectedHead: initial.head, schemaVersion: 2, config: { ...initial.definition.config, group: "category" }, source: "owner", rationale: "Add a category" });
  const transfer = await core.export([candidate.reference]);
  let escaped: TriageCore | undefined;
  await withVerifiedTransfer(transfer, async isolated => {
    escaped = isolated;
    const capture = await isolated.capture(), evaluation = await isolated.inspectEvaluation(candidate.reference);
    capture.tasks[0]!.title = "poisoned";
    capture.definition.config.sort = "title";
    evaluation.evaluation.accepted = false;
    evaluation.preview.definition.schemaVersion = 1;
    expect((await isolated.capture()).tasks[0]?.title).toBe("A saved task");
    expect((await isolated.inspectEvaluation(candidate.reference)).evaluation.accepted).toBe(true);
    const adopted = await isolated.adopt(candidate.reference, hash("isolated-upgrade"));
    expect(adopted.definition.schemaVersion).toBe(2);
    expect((await isolated.capture()).head).toBe(adopted.head);
    const changed = await isolated.command(command(adopted, "isolated-edit", { kind: "edit", taskId: "one", title: "Changed privately", priority: "high", category: "work" }));
    expect((await isolated.capture()).head).toBe(changed.head);
    expect((await isolated.capture()).tasks[0]?.title).toBe("Changed privately");
  });
  expect((await core.capture()).head).toBe(initial.head);
  // An escaped private core must reread its store after the callback exits.
  const savedGetReceipt = escaped!.service.store.getReceipt.bind(escaped!.service.store);
  escaped!.service.store.getReceipt = async () => undefined;
  await expect(escaped!.capture()).rejects.toThrow();
  escaped!.service.store.getReceipt = savedGetReceipt;
  const retainedReceipt = transfer.records.find(row => row.kind === "receipt")!.reference;
  store.missing = { kind: "receipt", ref: retainedReceipt }; store.writes = 0;
  await expect(core.withVerifiedSource(async () => undefined, [candidate.reference])).rejects.toThrow();
  expect(store.writes).toBe(0);
});


test("verified simulations cannot save live drafts against unpublished heads", async () => {
  const storage = new MemoryApplicationStorage(), core = new TriageCore(storage);
  const initial = await core.initialize({ tasks: [task()] });
  const session = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, title: "Saved live draft" } };
  const saved = await core.saveSession("browser", { expectedSession: null, capturedHead: initial.head, session });
  await core.withVerifiedSource(async simulation => {
    expect((await simulation.loadSession("browser")).record?.session).toEqual(session);
    const changed = await simulation.command(command(initial, "unpublished-draft-head", { kind: "complete", taskId: "one" }));
    await expect(simulation.saveSession("browser", { expectedSession: saved.reference, capturedHead: changed.head, session: { ...session, draft: { ...session.draft, title: "Must remain private" } } })).rejects.toThrow("use the live core");
  });
  expect((await core.capture()).head).toBe(initial.head);
  expect(await core.loadSession("browser")).toEqual(saved);
  await withVerifiedTransfer(await core.export(), async privateCore => {
    expect((await privateCore.saveSession("private", { expectedSession: null, capturedHead: initial.head, session })).record?.session).toEqual(session);
  });
  expect((await core.loadSession("private")).status).toBe("missing");
});
