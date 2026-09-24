/// <reference lib="dom.iterable" />
/** Real IndexedDB checks for the portable task application. */
import { IndexedDbApplicationStorage } from "../src/application-browser-storage";
import { BrowserTriageController } from "../examples/browser-triage/controller";
import { DEFAULT_SESSION, type Task } from "../examples/local-triage/contract";
import { loadSurfaceEvaluator } from "../site/living";

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  let rejected = false; try { await action(); } catch { rejected = true; }
  assert(rejected, `Expected rejection: ${message}`);
}
export { BrowserTriageController, IndexedDbApplicationStorage, loadSurfaceEvaluator };

export async function storageChecks(): Promise<string[]> {
  await loadSurfaceEvaluator();
  const opened: IndexedDbApplicationStorage[] = [], checks: string[] = [];
  async function open(name = `algal-tasks-qa-${crypto.randomUUID()}`) {
    const storage = await IndexedDbApplicationStorage.open({ name }); opened.push(storage); return storage;
  }
  try {
    const name = `algal-tasks-qa-${crypto.randomUUID()}`;
    let storage = await open(name), controller = new BrowserTriageController(storage);
    const initial = await controller.initialize();
    assert(initial.tasks.length === 0 && initial.definition.schemaVersion === 1, "New workspace starts empty at schema v1");
    const task: Task = { id: "review", title: "Keep the original task", priority: "high", status: "open", category: "inbox" };
    let capture = await controller.act(initial.head, { kind: "add", task });
    const taskHead = capture.head;
    const draft = { ...structuredClone(DEFAULT_SESSION), filter: "open" as const, query: "original", draft: { taskId: null, title: "An unfinished thought", priority: "low" as const, category: "inbox" }, focusedField: "title" as const };
    capture = await controller.saveSession(capture.head, null, draft);
    assert(capture.head === taskHead && capture.tasks.length === 1, "Saving a draft cannot change task facts or the application head");
    const draftRef = capture.sessionState.reference;
    assert(draftRef !== null, "Saved draft has a compare-and-set reference");
    storage.close(); storage = await open(name); controller = new BrowserTriageController(storage);
    capture = await controller.initialize();
    assert(capture.head === taskHead && JSON.stringify(capture.tasks) === JSON.stringify([task]), "Actual IndexedDB reopen preserves task facts");
    assert(JSON.stringify(capture.session) === JSON.stringify(draft), "Draft, filter, query, and focus intent survive IndexedDB reopen");
    await rejects(() => controller.saveSession(capture.head, null, DEFAULT_SESSION), "a stale session reference cannot overwrite the draft");
    checks.push("IndexedDB restart preserves tasks and independent drafts; stale draft writes fail");

    capture = await controller.propose(capture.head, { schemaVersion: 2, config: { sort: "title", group: "category", allowReopen: false }, rationale: "Add categories while preserving task facts." });
    const pending = capture.pending;
    assert(pending?.evaluation.accepted && capture.head === taskHead, "Migration preview is checked without changing the live application");
    storage.close(); storage = await open(name); controller = new BrowserTriageController(storage);
    capture = await controller.initialize();
    assert(capture.pending?.reference === pending.reference, "The evaluated proposal is discoverable after restart");
    capture = await controller.adopt(capture.head, pending.reference);
    assert(capture.definition.schemaVersion === 2 && JSON.stringify(capture.tasks) === JSON.stringify([task]), "Migration preserves IDs, title, priority and status and adds inbox category");
    assert(capture.sessionState.status === "stale" && capture.session.draft.title === draft.draft.title, "Migration preserves the draft and requires explicit rebase");
    const migrationHead = capture.head;
    capture = await controller.rebaseSession(capture.head, capture.sessionState.reference);
    assert(capture.head === migrationHead && capture.sessionState.status === "current" && capture.session.draft.title === draft.draft.title, "Explicit rebase keeps the draft without changing facts");
    capture = await controller.act(capture.head, { kind: "edit", taskId: task.id, title: task.title, priority: task.priority, category: "work" });
    assert(capture.tasks[0]?.category === "work", "The migrated application accepts category edits");
    await rejects(() => controller.act(taskHead, { kind: "complete", taskId: task.id }), "old-head action after migration");
    await rejects(() => controller.adopt(taskHead, pending.reference), "stale migration adoption");
    checks.push("durable checked migration preserves task data, exposes categories, and requires draft rebase");

    capture = await controller.rebaseSession(capture.head, capture.sessionState.reference);
    capture = await controller.act(capture.head, { kind: "complete", taskId: task.id });
    capture = await controller.rebaseSession(capture.head, capture.sessionState.reference);
    await rejects(() => controller.act(capture.head, { kind: "reopen", taskId: task.id }), "the adopted workflow disables reopening");
    assert((await controller.capture()).tasks[0]?.status === "done", "A rejected action cannot change task status");
    const bundle = await controller.exportBundle();
    await BrowserTriageController.verifyBundle(bundle);
    const target = await open(), imported = await BrowserTriageController.importBundle(target, bundle, "imported-triage");
    const importedCapture = await imported.capture();
    assert(JSON.stringify(importedCapture.tasks) === JSON.stringify(capture.tasks) && importedCapture.definition.schemaVersion === 2, "Fresh-identity import preserves tasks and the applied workflow");
    assert(importedCapture.sessionState.status === "missing" && importedCapture.pending === null, "Pure task transfer does not copy drafts or pending proposals");
    await rejects(() => BrowserTriageController.importBundle(target, bundle, "imported-triage"), "import cannot overwrite an existing workspace");
    checks.push("applied action policy and verified fresh-identity import preserve user facts without overwriting workspaces");

    const interrupted = await open(), interruptedController = new BrowserTriageController(interrupted);
    const empty = await interruptedController.initialize(), writeHead = interrupted.writeHead.bind(interrupted);
    let fail = true;
    interrupted.writeHead = async (application, value) => { if (fail) { fail = false; throw new Error("Injected before head publication"); } await writeHead(application, value); };
    await rejects(() => interruptedController.act(empty.head, { kind: "add", task }), "interrupted task publication");
    const recoveryController = new BrowserTriageController(interrupted), recovery = await recoveryController.capture();
    assert(recovery.recovery !== null && recovery.head === empty.head, "Interrupted request remains visible without changing the old head");
    const recovered = await recoveryController.recover();
    assert(recovered.tasks.length === 1 && recovered.tasks[0]?.id === task.id && recovered.recovery === null, "Recovery publishes the saved request exactly once");
    assert((await recoveryController.capture()).tasks.length === 1, "Reopening cannot duplicate the recovered task");
    checks.push("prepared task mutation survives an interrupted IndexedDB publication and recovers once");
    return checks;
  } finally { for (const storage of opened) storage.close(); }
}
