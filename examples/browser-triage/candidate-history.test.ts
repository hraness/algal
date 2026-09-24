import { describe, expect, test } from "bun:test";
import { MemoryApplicationStorage } from "../../src/application-storage";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store";
import type { JsonValue } from "../../src/values";
import type { Digest } from "../../src/digest";
import { DEFAULT_SESSION, type Task } from "../local-triage/contract";
import { hash } from "../local-triage/core";
import { BrowserTriageController, MAX_EVALUATIONS } from "./controller";

const task = (id = "first"): Task => ({ id, title: "A task saved in this browser", priority: "normal", status: "open", category: "inbox" });
const categories = { config: { sort: "title" as const, group: "category" as const, allowReopen: false }, schemaVersion: 2 as const, rationale: "Organize tasks by category." };
const titles = { config: { sort: "title" as const, group: "none" as const, allowReopen: true }, schemaVersion: 1 as const, rationale: "Order tasks by title." };
const unchanged = { config: { sort: "priority" as const, group: "status" as const, allowReopen: true }, schemaVersion: 1 as const, rationale: "Keep the current workflow." };

/** Live storage whose rows can disappear or change bytes between phases.
 * Any write while evidence is missing or changed would be a repair attempt. */
function fixture() {
  const source = new MemoryStore(), hidden = new Set<string>(), corrupt = new Map<Digest, JsonValue>(), reads = new Map<Digest, number>();
  let forbiddenWrites = 0;
  const hooks: { beforeSlot?: (name: string, value: JsonValue) => void; afterSlot?: (name: string, value: JsonValue) => void } = {};
  const store = new Proxy(source, {
    get(target, key) {
      if (key === "getValue") return async (ref: Digest) => {
        reads.set(ref, (reads.get(ref) ?? 0) + 1);
        if (hidden.has(`getValue:${ref}`)) return undefined;
        return corrupt.has(ref) ? structuredClone(corrupt.get(ref)) : target.getValue(ref);
      };
      if (key === "getReceipt" || key === "getManifest") return async (ref: Digest) => hidden.has(`${key}:${ref}`) ? undefined : target[key](ref);
      if (["putValue", "putReceipt", "putManifest"].includes(String(key))) return async (value: never) => {
        if (hidden.size || corrupt.size) { forbiddenWrites++; throw new Error("Attempted to reconstruct missing or changed evidence"); }
        return target[key as "putValue"](value);
      };
      if (key === "setSlot") return async (name: string, value: JsonValue) => { hooks.beforeSlot?.(name, value); await target.setSlot(name, value); hooks.afterSlot?.(name, value); };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Store;
  const storage = new MemoryApplicationStorage(store), controller = new BrowserTriageController(storage);
  // Counts the individual candidate proofs, each of which replays the full history.
  const individual = { calls: 0 }, inspect = controller.core.inspectEvaluation.bind(controller.core);
  controller.core.inspectEvaluation = ref => { individual.calls++; return inspect(ref); };
  const head = async () => (await storage.readHead(controller.application) as { state: Digest }).state;
  return { storage, controller, hidden, corrupt, reads, hooks, individual, head, get forbiddenWrites() { return forbiddenWrites; } };
}
async function withCandidates(f: ReturnType<typeof fixture>) {
  const initial = await f.controller.initialize(), added = await f.controller.act(initial.head, { kind: "add", task: task() });
  const first = await f.controller.propose(added.head, categories), second = await f.controller.propose(added.head, titles);
  return { added, first: first.pending!, second: second.pending! };
}

describe("saved workflow candidates share each read phase's private source", () => {
  test("completed candidates are proven without individual history replays, with unchanged results", async () => {
    const f = fixture(), { added, first, second } = await withCandidates(f);
    f.individual.calls = 0;
    const captured = await f.controller.capture();
    expect(f.individual.calls).toBe(0);
    expect(captured.pending).toEqual(second); expect(captured.remainingEvaluations).toBe(MAX_EVALUATIONS - 2);
    // The individual proof of each candidate yields exactly the shared result.
    expect(await f.controller.core.inspectEvaluation(first.reference)).toEqual(first);
    expect(await f.controller.core.inspectEvaluation(second.reference)).toEqual(second);
    f.individual.calls = 0;
    const edited = await f.controller.act(added.head, { kind: "edit", taskId: "first", title: "Edited with saved candidates", priority: "high", category: "inbox" });
    expect(f.individual.calls).toBe(0); expect(edited.pending).toBeNull();
    await expect(f.controller.adopt(added.head, first.reference)).rejects.toThrow("Stale");
  });

  test("a candidate root removed after an earlier phase proved it rejects the same operation", async () => {
    for (const stage of ["prepare", "settle", "draft"] as const) {
      const f = fixture(), { added, first } = await withCandidates(f);
      f.hooks.afterSlot = (name, value) => {
        const pending = (value as { pending?: unknown }).pending;
        const armed = stage === "draft" ? name.startsWith("triage-session-") : name.startsWith("triage-journal-") && (stage === "prepare" ? pending !== null : pending === null);
        if (armed) { delete f.hooks.afterSlot; f.hidden.add(`getValue:${first.reference}`); }
      };
      const draft = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, title: "Saved while a candidate disappears" } };
      const operation = stage === "draft" ? f.controller.saveSession(added.head, null, draft) : f.controller.act(added.head, { kind: "add", task: task("second") });
      await expect(operation).rejects.toThrow("Missing or changed application record");
      expect(f.forbiddenWrites).toBe(0);
      // Before publication the head stays put; later phases reject after it.
      if (stage === "settle") expect(await f.head()).not.toBe(added.head); else expect(await f.head()).toBe(added.head);
      await expect(f.controller.capture()).rejects.toThrow("Missing or changed application record");
      f.hidden.clear();
      const restored = stage === "prepare" ? await f.controller.recover() : await f.controller.capture();
      expect(restored.recovery).toBeNull(); expect(restored.remainingEvaluations).toBe(MAX_EVALUATIONS - 2);
      expect(restored.tasks).toEqual(stage === "draft" ? [task()] : [task(), task("second")]);
      expect(restored.history).toHaveLength(stage === "draft" ? 2 : 3);
      if (stage === "draft") expect(restored.session).toEqual(draft);
    }
  });

  test("candidate proofs never carry across operations in either direction", async () => {
    const f = fixture(), { added, first } = await withCandidates(f);
    const before = await f.controller.capture();
    for (const operation of [() => f.controller.capture(), () => f.controller.exportBundle()]) {
      const reads = f.reads.get(first.reference) ?? 0;
      await operation();
      expect(f.reads.get(first.reference) ?? 0).toBeGreaterThan(reads);
    }
    f.hidden.add(`getReceipt:${first.evaluation.receipts[0]!}`);
    await expect(f.controller.capture()).rejects.toThrow();
    await expect(f.controller.act(added.head, { kind: "add", task: task("second") })).rejects.toThrow();
    await expect(f.controller.adopt(added.head, first.reference)).rejects.toThrow();
    await expect(f.controller.exportBundle()).rejects.toThrow();
    expect(f.forbiddenWrites).toBe(0); expect(await f.head()).toBe(added.head);
    // A rejection is not retained either: restored evidence verifies again.
    f.hidden.clear();
    expect(await f.controller.capture()).toEqual(before);
  });

  test("a corrupted or forged candidate evaluation record is rejected", async () => {
    const f = fixture(), initial = await f.controller.initialize();
    const rejected = (await f.controller.propose(initial.head, unchanged)).pending!;
    expect(rejected.evaluation.accepted).toBe(false);
    const saved = await f.storage.store.getValue(rejected.reference) as Record<string, JsonValue>;
    // Changed bytes under the saved digest.
    f.corrupt.set(rejected.reference, { ...saved, accepted: true });
    await expect(f.controller.capture()).rejects.toThrow("Missing or changed application record");
    await expect(f.controller.adopt(initial.head, rejected.reference)).rejects.toThrow("Missing or changed application record");
    await expect(f.controller.act(initial.head, { kind: "add", task: task() })).rejects.toThrow("Missing or changed application record");
    expect(f.forbiddenWrites).toBe(0); expect(await f.head()).toBe(initial.head);
    f.corrupt.clear();
    expect((await f.controller.capture()).pending?.evaluation.accepted).toBe(false);
    // A well-formed forgery saved under its own digest and substituted into
    // the saved preparation and journal fails the recomputed evaluation.
    const slot = `triage-journal-${hash(f.controller.application).slice(7, 39)}`, journal = await f.storage.store.getSlot(slot) as { completed: Digest[]; evaluations: Digest[] };
    const preparedRef = journal.completed.at(-1)!, preparedValue = await f.storage.store.getValue(preparedRef) as Record<string, JsonValue>;
    const forged = await f.storage.store.putValue({ ...saved, accepted: true }), forgedPrepared = await f.storage.store.putValue({ ...preparedValue, evaluation: forged });
    await f.storage.store.setSlot(slot, { ...journal, completed: [...journal.completed.slice(0, -1), forgedPrepared], evaluations: [forged] });
    await expect(f.controller.capture()).rejects.toThrow("Rejected or forged evaluation");
    await expect(f.controller.adopt(initial.head, forged)).rejects.toThrow("Rejected or forged evaluation");
    expect(await f.head()).toBe(initial.head);
  });

  test("candidates beyond the shared source bounds keep individual proofs with the same results", async () => {
    const f = fixture(), { added, first } = await withCandidates(f), shared = await f.controller.capture();
    // Pad only the shared request, which offers candidate and scope roots, past
    // the export reference bound; history alone and single proofs still fit.
    const padding = Array.from({ length: 8193 }, (_, index) => hash(`absent-root-${index}`));
    const core = f.controller.core as unknown as { exportRecords(extra?: Digest[]): Promise<unknown> };
    const exportRecords = core.exportRecords.bind(core);
    core.exportRecords = (extra = []) => exportRecords(extra.length > 2 ? [...extra, ...padding] : extra);
    f.individual.calls = 0;
    expect(await f.controller.capture()).toEqual(shared);
    expect(f.individual.calls).toBe(2);
    f.individual.calls = 0;
    const edited = await f.controller.act(added.head, { kind: "complete", taskId: "first" });
    expect(edited.tasks[0]?.status).toBe("done"); expect(f.individual.calls).toBe(2);
    f.hidden.add(`getReceipt:${first.evaluation.receipts[0]!}`);
    await expect(f.controller.capture()).rejects.toThrow();
    expect(f.forbiddenWrites).toBe(0);
  });

  test("a pending workflow preparation is still proven individually from live evidence", async () => {
    const f = fixture(), initial = await f.controller.initialize();
    f.hooks.beforeSlot = (name, value) => {
      if (name.startsWith("triage-journal-") && (value as { pending?: unknown }).pending === null) { delete f.hooks.beforeSlot; throw new Error("Injected journal settlement failure"); }
    };
    await expect(f.controller.propose(initial.head, categories)).rejects.toThrow("settlement failure");
    f.individual.calls = 0;
    const pending = await f.controller.capture();
    expect(pending.recovery?.kind).toBe("propose"); expect(pending.pending).toBeNull(); expect(pending.remainingEvaluations).toBe(MAX_EVALUATIONS);
    expect(f.individual.calls).toBe(1);
    const prepared = await f.storage.store.getValue(pending.recovery!.reference) as { evaluation: Digest };
    const receipts = (await f.storage.store.getValue(prepared.evaluation) as { receipts: Digest[] }).receipts;
    f.hidden.add(`getReceipt:${receipts[0]!}`);
    await expect(f.controller.recover()).rejects.toThrow();
    expect(f.forbiddenWrites).toBe(0);
    f.hidden.clear();
    const recovered = await f.controller.recover();
    expect(recovered.recovery).toBeNull(); expect(recovered.pending?.reference).toBe(prepared.evaluation);
    expect(recovered.remainingEvaluations).toBe(MAX_EVALUATIONS - 1);
  });
});
