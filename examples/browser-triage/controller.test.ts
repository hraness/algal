import { describe, expect, test } from "bun:test";
import { MemoryApplicationStorage } from "../../src/application-storage";
import { MemoryStore } from "../../src/store-memory";
import type { Store } from "../../src/store";
import type { JsonValue } from "../../src/values";
import type { Digest } from "../../src/digest";
import { parseApplicationRevision, getApplicationRecord } from "../../src/application-contract";
import { DEFAULT_SESSION, type Task } from "../local-triage/contract";
import { hash } from "../local-triage/core";
import { BrowserTriageController, MAX_EVALUATIONS } from "./controller";

const task = (id = "first"): Task => ({ id, title: "A task saved in this browser", priority: "normal", status: "open", category: "inbox" });
const workflow = { config: { sort: "title" as const, group: "category" as const, allowReopen: false }, schemaVersion: 2 as const, rationale: "Organize tasks by category and prevent reopening completed tasks." };
class FaultStorage extends MemoryApplicationStorage {
  fault: "before-head" | "after-head" | null = null;
  override async writeHead(application: string, value: JsonValue): Promise<void> {
    const failure = this.fault; this.fault = null;
    if (failure === "before-head") throw new Error("Injected interruption before head write");
    await super.writeHead(application, value);
    if (failure === "after-head") throw new Error("Injected lost head acknowledgement");
  }
}
function fixture() {
  const source = new MemoryStore(), hidden = new Set<string>();
  let forbiddenWrites = 0, readOnly = false;
  const store = new Proxy(source, {
    get(target, key) {
      if (["getValue", "getReceipt", "getManifest"].includes(String(key))) return async (ref: Digest) => hidden.has(`${String(key)}:${ref}`) ? undefined : target[key as "getValue"](ref);
      if (["putValue", "putReceipt", "putManifest"].includes(String(key))) return async (value: never) => {
        if (hidden.size || readOnly) { forbiddenWrites++; throw new Error("Attempted to reconstruct hidden evidence"); }
        return target[key as "putValue"](value);
      };
      const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Store;
  const storage = new FaultStorage(store);
  return { storage, controller: new BrowserTriageController(storage), hidden, forbidWrites() { readOnly = true; }, get forbiddenWrites() { return forbiddenWrites; } };
}

describe("browser task controller", () => {
  test("capture rejects a direct core write after journal verification", async () => {
    const f = fixture(), initial = await f.controller.initialize();
    // The unchanged schedule first returns a coherent, fully checked snapshot.
    const baseline = await f.controller.capture();
    expect(baseline.head).toBe(initial.head);
    expect(baseline.history.at(-1)?.head).toBe(initial.head);
    const journalKey = `triage-journal-${hash(f.controller.application).slice(7, 39)}`;
    const savedJournal = await f.storage.store.getSlot(journalKey);
    const original = f.controller.core.withVerifiedSource.bind(f.controller.core);
    let calls = 0, injectedHead: Digest | undefined;
    f.controller.core.withVerifiedSource = async (callback, extra = []) => {
      if (++calls === 2) {
        const changed = await f.controller.core.command({ contract: "algal.triage-command.v1", expectedHead: initial.head, operation: hash("independent-public-core-writer"), action: { kind: "add", task: task("outside") } });
        injectedHead = changed.head;
        // All following capture work must remain read-only, including failure.
        f.forbidWrites();
      }
      return original(callback, extra);
    };
    await expect(f.controller.capture()).rejects.toThrow("Task head changed after journal verification");
    expect(injectedHead).toBeDefined();
    expect(injectedHead).not.toBe(initial.head);
    expect(await f.storage.readHead(f.controller.application)).toEqual({ contract: "algal.application-head.v1", application: f.controller.application, state: injectedHead! });
    expect(await f.storage.store.getSlot(journalKey)).toEqual(savedJournal);
    expect(f.forbiddenWrites).toBe(0);
  }, 30_000);
  for (const mutation of ["empty", "empty-records", "missing-state", "missing-receipt", "invalid-kind", "truncated-prefix", "wrong-application", "proposal-evaluation", "proposal-receipt"] as const) {
    test(`completed index ${mutation} rejects without live reconstruction`, async () => {
      const f = fixture(), initial = await f.controller.initialize();
      let current = await f.controller.act(initial.head, { kind: "add", task: task() });
      if (mutation.startsWith("proposal-")) current = await f.controller.propose(current.head, workflow);
      // Establish a passing nonempty baseline before each independent mutation.
      expect((await f.controller.capture()).head).toBe(current.head);
      const key = `triage-journal-${hash(f.controller.application).slice(7, 39)}`;
      const journal = await f.storage.store.getSlot(key) as { completed: Digest[] } & Record<string, JsonValue>;
      const prepared = await f.storage.store.getValue(journal.completed.at(-1)!) as { transfer: Digest; evaluation: Digest | null } & Record<string, JsonValue>;
      const index = await f.storage.store.getValue(prepared.transfer) as { states: Digest[]; records: { kind: string; reference: Digest }[] } & Record<string, JsonValue>;
      expect(index.states).toHaveLength(2); expect(index.records.length).toBeGreaterThan(0);
      if (mutation === "empty") { index.states = []; index.records = []; }
      else if (mutation === "empty-records") index.records = [];
      else if (mutation === "missing-state") index.records = index.records.filter(row => row.reference !== current.head);
      else if (mutation === "missing-receipt") { const removed = index.records.find(row => row.kind === "receipt")!; expect(removed).toBeDefined(); index.records = index.records.filter(row => row !== removed); }
      else if (mutation === "invalid-kind") index.records[0]!.kind = "unknown";
      else if (mutation === "truncated-prefix") index.states = [current.head];
      else if (mutation === "wrong-application") index.application = "unrelated-triage";
      else {
        const removed = mutation === "proposal-evaluation" ? prepared.evaluation! : current.pending!.evaluation.receipts[0]!;
        expect(index.records.some(row => row.reference === removed)).toBe(true);
        index.records = index.records.filter(row => row.reference !== removed);
        // The live record is present; acceptance must depend on this saved index.
        expect(await f.storage.store.getValue(removed)).toBeDefined();
      }
      const changedTransfer = await f.storage.store.putValue(index);
      const changedPrepared = await f.storage.store.putValue({ ...prepared, transfer: changedTransfer });
      journal.completed[journal.completed.length - 1] = changedPrepared;
      await f.storage.store.setSlot(key, journal);
      const savedJournal = await f.storage.store.getSlot(key), savedHead = await f.storage.readHead(f.controller.application);
      f.forbidWrites();
      await expect(f.controller.capture()).rejects.toThrow();
      await expect(new BrowserTriageController(f.storage).capture()).rejects.toThrow();
      expect(f.forbiddenWrites).toBe(0);
      expect(await f.storage.store.getSlot(key)).toEqual(savedJournal);
      expect(await f.storage.readHead(f.controller.application)).toEqual(savedHead);
    }, 30_000);
  }

  test("empty schema-v1 application and task actions survive controller restart", async () => {
    const { controller, storage } = fixture(), initial = await controller.initialize();
    expect(initial.tasks).toEqual([]); expect(initial.definition.schemaVersion).toBe(1);
    expect(initial.remainingEvaluations).toBe(MAX_EVALUATIONS); expect(initial.history).toHaveLength(1);
    const added = await controller.act(initial.head, { kind: "add", task: task() });
    const completed = await controller.act(added.head, { kind: "complete", taskId: "first" });
    expect(completed.tasks[0]?.status).toBe("done");
    const reopened = await new BrowserTriageController(storage).act(completed.head, { kind: "reopen", taskId: "first" });
    expect(reopened.tasks[0]?.status).toBe("open"); expect(reopened.history).toHaveLength(4);
    await expect(controller.act(initial.head, { kind: "add", task: task("stale") })).rejects.toThrow("Stale");
    expect((await controller.capture()).tasks).toHaveLength(1);
  });
  test("saved drafts use CAS, preserve unsaved input on explicit rebase, and never become task facts", async () => {
    const { controller, storage } = fixture(), initial = await controller.initialize();
    const draft = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, title: "Saved but unsubmitted" } };
    const saved = await controller.saveSession(initial.head, null, draft);
    expect(saved.sessionState.status).toBe("current");
    await expect(controller.saveSession(initial.head, null, draft)).rejects.toThrow("Newer session");
    const peer = new BrowserTriageController(storage, controller.application, "another-tab");
    const added = await peer.act(initial.head, { kind: "add", task: task() });
    const reopened = await new BrowserTriageController(storage).initialize();
    expect(reopened.sessionState.status).toBe("stale"); expect(reopened.session.draft.title).toBe(draft.draft.title);
    await expect(controller.saveSession(added.head, saved.sessionState.reference, draft)).rejects.toThrow("rebase");
    await expect(controller.act(added.head, { kind: "add", task: task("second") })).rejects.toThrow("Rebase");
    const live = { ...draft, draft: { ...draft.draft, title: "Newer unsaved edit" } };
    const rebased = await controller.rebaseSession(added.head, saved.sessionState.reference, live);
    expect(rebased.sessionState.status).toBe("current"); expect(rebased.session.draft.title).toBe(live.draft.title);
    expect(rebased.tasks[0]?.title).toBe(task().title);
    expect(JSON.stringify(await controller.exportBundle())).not.toContain(live.draft.title);
  });
  test("workflow preview survives restart, adoption migrates real task memory, and stale drafts stay saved", async () => {
    const { controller, storage } = fixture(), initial = await controller.initialize();
    const added = await controller.act(initial.head, { kind: "add", task: task() });
    const draft = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, title: "Keep through migration" } };
    const saved = await controller.saveSession(added.head, null, draft);
    const evaluated = await controller.propose(added.head, workflow);
    expect(evaluated.head).toBe(added.head); expect(evaluated.pending?.evaluation.accepted).toBe(true);
    const reopened = await new BrowserTriageController(storage).initialize();
    expect(reopened.pending?.reference).toBe(evaluated.pending?.reference);
    const adopted = await controller.adopt(added.head, reopened.pending!.reference);
    expect(adopted.definition.schemaVersion).toBe(2); expect(adopted.tasks).toEqual(added.tasks);
    expect(adopted.history.at(-1)?.kind).toBe("migrate"); expect(adopted.sessionState.status).toBe("stale");
    expect(adopted.session.draft.title).toBe(draft.draft.title);
    const rebased = await controller.rebaseSession(adopted.head, saved.sessionState.reference);
    const edited = await controller.act(rebased.head, { kind: "edit", taskId: "first", title: task().title, priority: "high", category: "work" });
    expect(edited.tasks[0]?.category).toBe("work");
    await expect(controller.adopt(adopted.head, reopened.pending!.reference)).rejects.toThrow("Stale");
  });
  test("rejected owner workflow remains inspectable and cannot be adopted", async () => {
    const { controller, storage } = fixture(), initial = await controller.initialize();
    const result = await controller.propose(initial.head, { config: initial.definition.config, schemaVersion: 1, rationale: "Keep the same workflow" });
    expect(result.pending?.evaluation.accepted).toBe(false);
    const duplicate = await controller.propose(initial.head, { config: initial.definition.config, schemaVersion: 1, rationale: "Keep the same workflow" });
    expect(duplicate.pending?.reference).toBe(result.pending?.reference); expect(duplicate.remainingEvaluations).toBe(MAX_EVALUATIONS - 1);
    expect((await new BrowserTriageController(storage).capture()).pending?.reference).toBe(result.pending?.reference);
    await expect(controller.adopt(initial.head, result.pending!.reference)).rejects.toThrow("did not pass");
    expect((await controller.capture()).head).toBe(initial.head);
  });
  test("interruption before publication and after acknowledgement recovers one saved action", async () => {
    for (const fault of ["before-head", "after-head"] as const) {
      const { controller, storage } = fixture(), initial = await controller.initialize(); storage.fault = fault;
      await expect(controller.act(initial.head, { kind: "add", task: task() })).rejects.toThrow("acknowledgment uncertain");
      const restarted = new BrowserTriageController(storage), pending = await restarted.initialize();
      expect(pending.recovery?.kind).toBe("act");
      await expect(restarted.act(pending.head, { kind: "add", task: task("other") })).rejects.toThrow("recovery");
      const recovered = await restarted.recover();
      expect(recovered.tasks).toEqual([task()]); expect(recovered.history).toHaveLength(2); expect(recovered.recovery).toBeNull();
      expect((await restarted.recover()).head).toBe(recovered.head);
      await expect(restarted.act(initial.head, { kind: "add", task: task() })).rejects.toThrow("Stale");
    }
  });
  test("saved genesis and migration recover without duplicate publication", async () => {
    const { controller, storage } = fixture(); storage.fault = "before-head";
    await expect(controller.initialize()).rejects.toThrow("acknowledgment uncertain");
    const initial = await new BrowserTriageController(storage).initialize(); expect(initial.history).toHaveLength(1);
    const added = await controller.act(initial.head, { kind: "add", task: task() }), candidate = await controller.propose(added.head, workflow);
    storage.fault = "before-head";
    await expect(controller.adopt(added.head, candidate.pending!.reference)).rejects.toThrow("acknowledgment uncertain");
    const recovered = await new BrowserTriageController(storage).recover();
    expect(recovered.definition.schemaVersion).toBe(2); expect(recovered.tasks).toEqual([task()]); expect(recovered.history).toHaveLength(3);
  });
  test("missing pending/candidate/committed evidence stops without reconstructing records", async () => {
    for (const kind of ["pending", "pending-target", "candidate", "committed"] as const) {
      const f = fixture(), initial = await f.controller.initialize();
      let method: () => Promise<unknown>;
      if (kind === "pending" || kind === "pending-target") {
        const before = new Set((await f.controller.exportBundle()).records.map(row => row.reference));
        f.storage.fault = "before-head";
        await expect(f.controller.act(initial.head, { kind: "add", task: task() })).rejects.toThrow();
        const pending = await f.controller.capture();
        if (kind === "pending") f.hidden.add(`getValue:${pending.recovery!.reference}`);
        else {
          const preparation = await f.storage.store.getValue(pending.recovery!.reference) as { transfer: Digest };
          const transfer = await f.controller.core.readTransfer(preparation.transfer);
          f.hidden.add(`getReceipt:${transfer.records.find(row => row.kind === "receipt" && !before.has(row.reference))!.reference}`);
        }
        method = () => f.controller.recover();
      } else if (kind === "candidate") {
        const candidate = await f.controller.propose(initial.head, workflow);
        f.hidden.add(`getReceipt:${candidate.pending!.evaluation.receipts[0]!}`); method = () => f.controller.capture();
      } else {
        const revision = await getApplicationRecord(f.storage.store, initial.revision, parseApplicationRevision);
        f.hidden.add(`getManifest:${revision.entrypoints.find(e => e.name === "update")!.manifest}`); method = () => f.controller.act(initial.head, { kind: "add", task: task() });
      }
      await expect(method()).rejects.toThrow(); expect(f.forbiddenWrites).toBe(0);
      expect((await f.storage.readHead(f.controller.application) as { state: Digest }).state).toBe(initial.head);
    }
  });
  test("concurrent owners serialize changes and transfer import preserves the source", async () => {
    const { controller, storage } = fixture(), initial = await controller.initialize(), peer = new BrowserTriageController(storage);
    const results = await Promise.allSettled([controller.act(initial.head, { kind: "add", task: task("one") }), peer.act(initial.head, { kind: "add", task: task("two") })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const current = await controller.capture(), candidate = await controller.propose(current.head, workflow), transfer = await controller.exportBundle();
    expect(transfer.records.some(row => row.reference === candidate.pending!.reference)).toBe(false);
    expect((await BrowserTriageController.verifyBundle(transfer)).ok).toBe(true);
    const destination = new MemoryApplicationStorage(), imported = await BrowserTriageController.importBundle(destination, transfer, "task-fork");
    const fork = await imported.capture(); expect(fork.tasks).toEqual(current.tasks); expect(fork.pending).toBeNull(); expect(fork.sessionState.status).toBe("missing");
    expect(fork.application).not.toBe(current.application); expect((await controller.capture()).head).toBe(current.head);
    await expect(BrowserTriageController.importBundle(destination, transfer, "task-fork")).rejects.toThrow("fresh");
    expect((await imported.capture()).head).toBe(fork.head);
  });
  test("interrupted fork copying cannot reopen as an empty application", async () => {
    const { controller } = fixture(), initial = await controller.initialize();
    await controller.act(initial.head, { kind: "add", task: task() });
    const transfer = await controller.exportBundle(), source = new MemoryStore(); let failCopy = false;
    const store = new Proxy(source, {
      get(target, key) {
        if (key === "setSlot") return async (name: string, value: JsonValue) => { await target.setSlot(name, value); failCopy = true; };
        if (key === "putValue") return async (value: JsonValue) => {
          if (failCopy) { failCopy = false; throw new Error("Injected interruption while copying fork"); }
          return target.putValue(value);
        };
        const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Store;
    const destination = new MemoryApplicationStorage(store);
    await expect(BrowserTriageController.importBundle(destination, transfer, "incomplete-fork")).rejects.toThrow("copying fork");
    await expect(new BrowserTriageController(destination, "incomplete-fork").initialize()).rejects.toThrow("Incomplete saved fork");
    expect(await destination.readHead("incomplete-fork")).toBeUndefined();
    expect((await controller.capture()).tasks).toEqual([task()]);
    const recoverable = new FaultStorage(); recoverable.fault = "before-head";
    await expect(BrowserTriageController.importBundle(recoverable, transfer, "recoverable-fork")).rejects.toThrow("acknowledgment uncertain");
    const recovered = await new BrowserTriageController(recoverable, "recoverable-fork").initialize();
    expect(recovered.tasks).toEqual([task()]); expect(recovered.history).toHaveLength(1); expect(recovered.recovery).toBeNull();
  });
  test("failed journal publication and settlement preserve exact task retry semantics", async () => {
    for (const stage of ["prepare", "settle"] as const) {
      const source = new MemoryStore(); let armed = false;
      const store = new Proxy(source, {
        get(target, key) {
          if (key === "setSlot") return async (name: string, value: JsonValue) => {
            const pending = (value as { pending?: unknown }).pending;
            if (armed && name.startsWith("triage-journal-") && (stage === "prepare" ? pending !== null : pending === null)) {
              armed = false; throw new Error("Injected journal quota failure");
            }
            return target.setSlot(name, value);
          };
          const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
        },
      }) as Store;
      const storage = new MemoryApplicationStorage(store), controller = new BrowserTriageController(storage), initial = await controller.initialize(); armed = true;
      await expect(controller.act(initial.head, { kind: "add", task: task() })).rejects.toThrow("quota failure");
      const reopened = await new BrowserTriageController(storage).initialize();
      expect(reopened.tasks).toHaveLength(stage === "prepare" ? 0 : 1);
      expect(reopened.recovery === null).toBe(stage === "prepare");
      const recovered = stage === "prepare" ? await controller.act(initial.head, { kind: "add", task: task() }) : await controller.recover();
      expect(recovered.tasks).toEqual([task()]); expect(recovered.history).toHaveLength(2);
    }
  });
  test("a failed draft write leaves a committed task intact and the draft available to rebase", async () => {
    const source = new MemoryStore(); let failDraft = false;
    const store = new Proxy(source, {
      get(target, key) {
        if (key === "setSlot") return async (name: string, value: JsonValue) => {
          if (failDraft && name.startsWith("triage-session-")) { failDraft = false; throw new Error("Injected draft quota failure"); }
          return target.setSlot(name, value);
        };
        const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Store;
    const storage = new MemoryApplicationStorage(store), controller = new BrowserTriageController(storage), initial = await controller.initialize();
    const draft = { ...DEFAULT_SESSION, draft: { ...DEFAULT_SESSION.draft, title: task().title } };
    const saved = await controller.saveSession(initial.head, null, draft), added = await controller.act(initial.head, { kind: "add", task: task() });
    failDraft = true;
    await expect(controller.rebaseSession(added.head, saved.sessionState.reference, DEFAULT_SESSION)).rejects.toThrow("draft quota failure");
    const reopened = await new BrowserTriageController(storage).initialize();
    expect(reopened.head).toBe(added.head); expect(reopened.tasks).toEqual([task()]); expect(reopened.history).toHaveLength(2);
    expect(reopened.sessionState.status).toBe("stale"); expect(reopened.session).toEqual(draft);
    const rebased = await controller.rebaseSession(added.head, saved.sessionState.reference, DEFAULT_SESSION);
    expect(rebased.sessionState.status).toBe("current"); expect(rebased.tasks).toEqual([task()]); expect(rebased.head).toBe(added.head);
  });
  test("32 tasks remain usable and editable after sequential additions reach capacity", async () => {
    const testStarted = performance.now(), { controller } = fixture(); let current = await controller.initialize();
    const times: number[] = [];
    for (let index = 0; index < 32; index++) {
      const started = performance.now();
      current = await controller.act(current.head, { kind: "add", task: task(`task-${index}`) });
      times.push(performance.now() - started);
      if ((index + 1) % 8 === 0) console.info(JSON.stringify({ measurement: "browser-triage-memory-capacity-progress", tasks: index + 1, elapsedMs: Math.round(performance.now() - testStarted) }));
      // Yield a timer turn so a runaway replay cannot starve Bun's test timeout.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(current.tasks).toHaveLength(32); expect(current.capacity.tasks).toBe(0); expect(current.history).toHaveLength(33);
    await expect(controller.act(current.head, { kind: "add", task: task("overflow") })).rejects.toThrow("capacity");
    const started = performance.now();
    const edited = await controller.act(current.head, { kind: "edit", taskId: "task-31", title: "Edited at task capacity", priority: "high", category: "inbox" });
    const editMs = performance.now() - started;
    expect(edited.tasks).toHaveLength(32); expect(edited.tasks[31]?.title).toBe("Edited at task capacity");
    const transfer = await controller.exportBundle();
    expect((await BrowserTriageController.verifyBundle(transfer)).ok).toBe(true);
    console.info(JSON.stringify({ measurement: "browser-triage-memory-capacity", firstAddMs: Math.round(times[0]!), lastAddMs: Math.round(times.at(-1)!), editAtCapacityMs: Math.round(editMs), transferRecords: transfer.records.length, transferBytes: new TextEncoder().encode(JSON.stringify(transfer)).byteLength, totalMs: Math.round(performance.now() - testStarted) }));
  }, 180_000);
});
