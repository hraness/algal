import { BrowserTriageController, MAX_EVALUATIONS, type BrowserTriageCapture } from "../examples/browser-triage/controller";
import { DEFAULT_SESSION, MAX_TASKS, MAX_STATES, id, type Config, type Session } from "../examples/local-triage/contract";
import { evaluateView } from "../examples/local-triage/programs";
import { sessionCompatibility } from "../examples/local-triage-web/session";
import { IndexedDbApplicationStorage } from "../src/application-browser-storage";
import type { Digest } from "../src/digest-type";
import { loadSurfaceEvaluator } from "./living";
import { checkLabel, draftAction, renderEditor, renderTaskGroups, triageWidgets, workflowSummary } from "./tasks-render";

type Workspace = { database: string; application: string };
const DEFAULT_WORKSPACE: Workspace = { database: "algal-tasks-v1", application: "browser-triage" };
const PREFERENCE = "algal.tasks.workspace.v1";
const validDatabase = (name: unknown): name is string => typeof name === "string" && /^algal-tasks-v1(?:-[a-f0-9-]{36})?$/.test(name);
function workspace(value: unknown): Workspace {
  if (!value || typeof value !== "object" || !("database" in value) || !("application" in value) || !validDatabase(value.database)) throw new Error("This workspace address is invalid. Open /tasks/ to select a saved workspace.");
  return { database: value.database, application: id(value.application) };
}
function selectedWorkspace(): Workspace {
  const url = new URL(location.href);
  if (url.searchParams.has("workspace") || url.searchParams.has("application")) return workspace({ database: url.searchParams.get("workspace"), application: url.searchParams.get("application") ?? DEFAULT_WORKSPACE.application });
  try { const saved: unknown = JSON.parse(localStorage.getItem(PREFERENCE) ?? "null"); if (saved !== null) return workspace(saved); } catch { /* The preference does not hold task data. */ }
  return DEFAULT_WORKSPACE;
}
function remember(value: Workspace, fresh: boolean): void {
  const url = new URL(location.href); url.searchParams.set("workspace", value.database); url.searchParams.set("application", value.application);
  if (fresh) history.pushState(null, "", url); else history.replaceState(null, "", url);
  try { localStorage.setItem(PREFERENCE, JSON.stringify(value)); } catch { /* The URL still identifies this workspace. */ }
}
function download(value: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
const errorText = (error: unknown): string => error instanceof Error ? error.message : "The operation could not finish. Your saved records are preserved.";
const cloneSession = (value: Session): Session => structuredClone(value);
const count = (value: number, noun: string): string => `${value} ${noun}${value === 1 ? "" : "s"}`;

async function start(root: HTMLElement): Promise<void> {
  const get = <T extends HTMLElement>(name: string): T => { const found = root.querySelector<T>(`#tasks-${name}`); if (!found) throw new Error(`Missing task control ${name}`); return found; };
  const message = (text: string, error = false): void => { get("status").textContent = text; get("status").toggleAttribute("data-error", error); };
  let selected = DEFAULT_WORKSPACE, storage: IndexedDbApplicationStorage | undefined, controller: BrowserTriageController | undefined, capture: BrowserTriageCapture | undefined;
  let session = cloneSession(DEFAULT_SESSION), sessionRef: Digest | null = null, sessionHead: Digest | null = null;
  let dirty = false, stale = false, draftConflict = false, busy = true, composing = false, refreshPending = false, workflowDirty = false, selectedKnown = false;
  let channel: BroadcastChannel | undefined;
  const unsaved = (): boolean => dirty || workflowDirty;
  const switchMessage = "Save or discard your draft, and preview or discard workflow edits, before switching workspaces.";
  function workflowInput(): { config: Config; schemaVersion: 1 | 2 } {
    return { config: { sort: get<HTMLSelectElement>("sort").value as Config["sort"], group: get<HTMLSelectElement>("group").value as Config["group"], allowReopen: get<HTMLSelectElement>("reopen").value === "true" }, schemaVersion: Number(get<HTMLSelectElement>("schema").value) as 1 | 2 };
  }

  function buttons(): void {
    const ready = !!capture && !!controller, blocked = busy || composing || !ready, recovering = !!capture?.recovery;
    let view: ReturnType<typeof evaluateView> | undefined;
    try { if (capture) view = evaluateView(capture.definition, capture.tasks, session); } catch { /* Keep invalid draft text visible until the owner corrects it. */ }
    const changed = blocked || recovering || stale || draftConflict || capture?.capacity.states === 0 || !view;
    root.setAttribute("aria-busy", String(busy));
    for (const name of ["refresh", "clear", "load-draft"]) get<HTMLButtonElement>(name).disabled = blocked || recovering;
    get<HTMLButtonElement>("save").disabled = blocked || recovering || stale || draftConflict || !dirty || !view;
    get<HTMLButtonElement>("discard").disabled = blocked || recovering || !dirty;
    get<HTMLButtonElement>("rebase").disabled = blocked || recovering || draftConflict || !stale || !view;
    get<HTMLButtonElement>("evaluate").disabled = changed || capture?.remainingEvaluations === 0;
    get<HTMLButtonElement>("adopt").disabled = changed || workflowDirty || !capture?.pending?.evaluation.accepted || capture.pending.evaluation.expectedHead !== capture.head;
    get<HTMLButtonElement>("discard-workflow").disabled = blocked || !workflowDirty;
    get("workflow-status").textContent = workflowDirty ? "Workflow edits are not saved. Preview or discard them before switching workspaces." : "";
    get<HTMLButtonElement>("recover").disabled = blocked || !recovering;
    get<HTMLButtonElement>("export").disabled = blocked || recovering;
    get<HTMLButtonElement>("new").disabled = busy || composing || unsaved();
    get<HTMLInputElement>("import").disabled = busy || composing || unsaved();
    get<HTMLButtonElement>("raw-export").disabled = busy || composing || !selectedKnown;
    get("stale").hidden = !stale; get("draft-conflict").hidden = !draftConflict; get("recovery").hidden = !recovering;
    get("session-status").textContent = draftConflict ? "Your edits are kept in this tab. A newer draft is saved in the workspace." : dirty ? "Unsaved draft. Save or discard edits before closing or switching workspaces." : stale ? "Saved draft needs review against the current version." : "Draft saved in this browser.";
    get("session-status").dataset.state = draftConflict ? "conflict" : stale ? "stale" : dirty ? "unsaved" : "saved";
    get("edit-note").hidden = !dirty || !capture?.tasks.length;
    if (capture) {
      get<HTMLButtonElement>("submit").disabled = changed || !view?.form.submit.enabled;
      get("submit-reason").textContent = capture.capacity.states === 0 ? "The history limit is reached. Export this workspace before starting another." : view?.form.submit.reason ?? "";
      for (const button of get("list").querySelectorAll<HTMLButtonElement>("button")) {
        const draftWouldBeReplaced = button.dataset.action === "edit" && dirty;
        button.disabled = blocked || recovering || stale || draftConflict || !view || capture.capacity.states === 0 || button.dataset.enabled !== "true" || draftWouldBeReplaced;
        if (button.dataset.action === "edit") {
          if (draftWouldBeReplaced) { button.title = "Save or discard your draft before editing another task."; button.setAttribute("aria-describedby", "tasks-edit-note"); }
          else { button.removeAttribute("title"); button.removeAttribute("aria-describedby"); }
        }
      }
    }
  }
  function renderSession(): void {
    if (!capture) return;
    let view: ReturnType<typeof evaluateView>;
    try { view = evaluateView(capture.definition, capture.tasks, session); }
    catch { message("This draft contains unsupported text. Use single-line text within the field’s length limit before saving.", true); buttons(); return; }
    renderEditor(get("fields"), view);
    get("editor-heading").textContent = session.draft.taskId === null ? "New task" : "Edit task";
    get("submit").textContent = view.form.submit.label;
    get<HTMLSelectElement>("filter").value = session.filter;
    const query = get<HTMLInputElement>("query"); if (query.value !== session.query) query.value = session.query;
    get("ordering").textContent = workflowSummary(capture.definition.config, capture.definition.schemaVersion);
    renderTaskGroups(get("list"), view, { onAction: (kind, taskId) => {
      if (kind === "edit") {
        if (dirty) { message("Save or discard your draft before editing another task.", true); return; }
        const task = capture?.tasks.find(row => row.id === taskId); if (!task) return;
        session.draft = { taskId, title: task.title, priority: task.priority, category: task.category }; session.focusedField = "title"; dirty = true; renderSession(); get<HTMLInputElement>("title").focus();
      } else void action(async () => { if (!controller || !capture) return; const next = await controller.act(capture.head, { kind, taskId }); await compositionSettled(); show(next); message(kind === "complete" ? "Task completed. Review your draft before the next edit." : "Task reopened. Review your draft before the next edit."); });
    } });
    buttons();
  }
  function show(next: BrowserTriageCapture, options: { loadSession?: boolean; acknowledgeSession?: boolean } = {}): void {
    const previous = capture;
    if (options.loadSession) {
      session = cloneSession(next.sessionState.record?.session ?? DEFAULT_SESSION); sessionRef = next.sessionState.reference;
      sessionHead = next.sessionState.record?.capturedHead ?? next.head; dirty = false; draftConflict = false;
      stale = next.sessionState.status === "stale";
    } else {
      if (options.acknowledgeSession) { sessionRef = next.sessionState.reference; sessionHead = next.sessionState.record?.capturedHead ?? next.head; draftConflict = false; }
      else if (sessionRef !== next.sessionState.reference) draftConflict = true;
      if (previous) {
        const policy = sessionCompatibility(triageWidgets(previous.view), triageWidgets(next.view), session.focusedField, sessionHead !== next.head);
        if (!policy.preserveFocus) { const active = document.activeElement; if (active instanceof HTMLElement && active.id === `tasks-${session.focusedField}`) active.blur(); session.focusedField = null; }
        stale = policy.requiresRebase || next.sessionState.status === "stale";
      }
    }
    capture = next;
    get("capacity").textContent = `${next.tasks.length}/${MAX_TASKS} tasks · ${count(next.capacity.states, "history step")} and ${count(next.remainingEvaluations, "proposal")} left`;
    get("sequence").textContent = `Step ${next.sequence + 1}`;
    get("head").textContent = next.head; get("revision").textContent = next.revision; get("memory").textContent = next.memory;
    get("schema-status").textContent = `v${next.definition.schemaVersion}`;
    get("limits").textContent = `Each workspace holds up to ${MAX_TASKS} tasks, ${MAX_STATES} history steps, and ${MAX_EVALUATIONS} workflow proposals. At the task limit, edits remain available. A full history blocks task and workflow changes; the proposal limit blocks new previews. Saved records are not removed automatically.`;
    if (draftConflict) get("saved-draft").textContent = JSON.stringify(next.sessionState.record?.session.draft ?? null, null, 2);
    if (!workflowDirty) {
      const saved = next.pending?.evaluation.expectedHead === next.head ? next.pending.preview.definition : next.definition;
      get<HTMLSelectElement>("sort").value = saved.config.sort; get<HTMLSelectElement>("group").value = saved.config.group;
      get<HTMLSelectElement>("schema").value = String(saved.schemaVersion); get<HTMLSelectElement>("reopen").value = String(saved.config.allowReopen);
    }
    const pending = next.pending; get("preview").hidden = !pending;
    if (pending) {
      const current = pending.evaluation.expectedHead === next.head;
      get("candidate-state").textContent = !current ? "Earlier version" : pending.evaluation.accepted ? "Checks passed" : "Checks failed";
      get("candidate-description").textContent = `${workflowSummary(pending.preview.definition.config, pending.preview.definition.schemaVersion)}${current ? "" : " This preview belongs to an earlier version. Create a new preview before applying it."}`;
      renderTaskGroups(get("candidate-view"), pending.preview.view);
      get("checks").replaceChildren(...pending.evaluation.checks.map(check => { const item = document.createElement("li"); item.dataset.passed = String(check.passed); item.textContent = `${check.passed ? "Passed" : "Failed"}: ${checkLabel(check.name)}`; return item; }));
    }
    const names: Record<string, string> = { create: "Created workspace", memory: "Changed tasks", activate: "Changed workflow", migrate: "Added categories" };
    get("history-count").textContent = count(next.history.length, "step");
    get("history").replaceChildren(...next.history.map(row => {
      const item = document.createElement("li"), number = document.createElement("span"), copy = document.createElement("div"), title = document.createElement("strong");
      number.className = "living-history-number"; number.textContent = String(row.sequence + 1).padStart(2, "0"); copy.className = "living-history-copy"; title.textContent = names[row.kind] ?? row.kind; copy.append(title); item.append(number, copy);
      if (row.head === next.head) { const current = document.createElement("span"); current.className = "living-small-label"; current.textContent = "Current"; item.append(current); } return item;
    }));
    get("content").hidden = false; root.dataset.ready = "true"; renderSession();
  }
  async function compositionSettled(): Promise<void> {
    while (composing) { await new Promise<void>(resolve => root.addEventListener("compositionend", () => resolve(), { once: true })); await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  }
  async function refresh(): Promise<void> {
    if (!controller) return;
    if (busy || composing) { refreshPending = true; return; }
    const source = controller, previous = capture;
    try {
      const next = await source.capture(); await compositionSettled();
      if (source !== controller || previous !== capture) return;
      if (busy) { refreshPending = true; return; }
      show(next);
    } catch (error) { if (source === controller) message(errorText(error), true); }
  }
  function connect(): void {
    channel?.close();
    if (typeof BroadcastChannel === "undefined") return;
    channel = new BroadcastChannel(`algal-tasks:${selected.database}:${selected.application}`);
    channel.onmessage = event => { if (event.data === "changed") void refresh(); };
  }
  async function action(operation: () => Promise<void>): Promise<void> {
    if (busy || composing) return;
    busy = true; buttons();
    try { await operation(); channel?.postMessage("changed"); }
    catch (error) {
      try { if (controller) { const next = await controller.capture(); await compositionSettled(); show(next); } } catch { /* Preserve the last view and records for recovery. */ }
      message(errorText(error), true);
    } finally { busy = false; buttons(); if (refreshPending) { refreshPending = false; void refresh(); } }
  }
  async function save(rebase: boolean): Promise<void> {
    if (!controller || !capture) return;
    const submitted = cloneSession(session), bytes = JSON.stringify(submitted);
    const next = rebase ? await controller.rebaseSession(capture.head, sessionRef, submitted) : await controller.saveSession(capture.head, sessionRef, submitted);
    await compositionSettled(); dirty = JSON.stringify(session) !== bytes; show(next, { acknowledgeSession: true });
    message(dirty ? "Saved the submitted draft. Your newer edits remain unsaved." : rebase ? "Saved your draft with the current version." : "Draft saved.");
  }
  get<HTMLFormElement>("editor").addEventListener("submit", event => { event.preventDefault(); void action(async () => {
    if (!controller || !capture) return;
    const submitted = JSON.stringify(session.draft), command = draftAction(session, capture.definition.schemaVersion, `task-${crypto.randomUUID()}`);
    const next = await controller.act(capture.head, command); await compositionSettled(); show(next);
    if (JSON.stringify(session.draft) === submitted) {
      session.draft = cloneSession(DEFAULT_SESSION).draft; dirty = true; renderSession();
      try { await save(true); message("Task saved. The submitted draft is cleared."); }
      catch (error) {
        try { const current = await controller.capture(); await compositionSettled(); show(current); } catch { /* The acknowledged task remains saved even when draft reconciliation fails. */ }
        message(`Task saved. The cleared draft could not be saved: ${errorText(error)} Review the saved draft before continuing.`, true);
      }
    } else message("Task saved. Your newer draft is preserved; review it before the next edit.");
  }); });
  get("fields").addEventListener("input", event => {
    const target = event.target; if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const name = target.name; if (name !== "title" && name !== "priority" && name !== "category") return;
    if (name === "priority") session.draft.priority = target.value as Session["draft"]["priority"]; else session.draft[name] = target.value;
    session.focusedField = name; dirty = true; if (!composing) renderSession();
  });
  root.addEventListener("focusin", event => { const target = event.target; if (!(target instanceof HTMLElement)) return; const field = target.id.slice(6); if (["title", "priority", "category", "query"].includes(field)) session.focusedField = field as Session["focusedField"]; });
  root.addEventListener("compositionstart", () => { composing = true; buttons(); });
  root.addEventListener("compositionend", event => {
    // Some IMEs update the DOM before compositionend and emit the final input
    // afterward. Preserve that final text before any model-driven DOM patch.
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      if (target.id === "tasks-title") session.draft.title = target.value;
      else if (target.id === "tasks-category") session.draft.category = target.value;
      else if (target.id === "tasks-query") session.query = target.value;
    }
    composing = false; dirty = true; renderSession(); if (refreshPending && !busy) { refreshPending = false; void refresh(); }
  });
  get<HTMLInputElement>("query").addEventListener("input", event => { session.query = (event.target as HTMLInputElement).value; dirty = true; if (!composing) renderSession(); });
  get<HTMLSelectElement>("filter").addEventListener("change", event => { session.filter = (event.target as HTMLSelectElement).value as Session["filter"]; dirty = true; renderSession(); });
  get("save").addEventListener("click", () => { void action(() => save(false)); });
  get("rebase").addEventListener("click", () => { void action(() => save(true)); });
  get("clear").addEventListener("click", () => { session.draft = cloneSession(DEFAULT_SESSION).draft; dirty = true; renderSession(); message("Draft cleared in this tab. Save it to replace the saved draft."); });
  get("discard").addEventListener("click", () => { if (capture) { show(capture, { loadSession: true }); message("Discarded this tab’s unsaved edits and loaded the saved draft."); } });
  get("load-draft").addEventListener("click", () => { if (capture) { show(capture, { loadSession: true }); message("Loaded the saved draft and replaced this tab’s edits."); } });
  get("refresh").addEventListener("click", () => { void refresh(); });
  get("recover").addEventListener("click", () => { void action(async () => { if (controller) { const next = await controller.recover(); await compositionSettled(); show(next); message("Recovered the saved operation. Review the current tasks and draft before continuing."); } }); });
  get("workflow-form").addEventListener("input", () => { workflowDirty = true; buttons(); });
  get("discard-workflow").addEventListener("click", () => { if (capture) { workflowDirty = false; show(capture); message("Discarded workflow edits and loaded the saved choices."); } });
  get<HTMLFormElement>("workflow-form").addEventListener("submit", event => { event.preventDefault(); void action(async () => {
    if (!controller || !capture) return;
    const input = workflowInput(), submitted = JSON.stringify(input);
    const next = await controller.propose(capture.head, { ...input, rationale: "An explicit browser workflow edit." }); await compositionSettled(); workflowDirty = JSON.stringify(workflowInput()) !== submitted; show(next);
    message(next.pending?.evaluation.accepted ? "Preview saved. Compare it with your task list before applying it." : "The proposal did not pass all checks and cannot be applied.");
  }); });
  get("adopt").addEventListener("click", () => { void action(async () => { if (!controller || !capture?.pending) return; const submitted = JSON.stringify(workflowInput()); const next = await controller.adopt(capture.head, capture.pending.reference); await compositionSettled(); workflowDirty = JSON.stringify(workflowInput()) !== submitted; show(next); message("Workflow applied. Your tasks and draft are preserved. Review the draft before another edit."); }); });
  get("export").addEventListener("click", () => { void action(async () => { if (controller) { download(await controller.exportBundle(), "algal-tasks-history.json"); message("Exported tasks and applied history. Drafts and unapplied proposals are excluded."); } }); });
  async function select(next: Workspace, nextStorage: IndexedDbApplicationStorage, nextController: BrowserTriageController, nextCapture: BrowserTriageCapture): Promise<void> {
    await compositionSettled(); if (unsaved()) throw new Error(switchMessage);
    channel?.close(); storage?.close(); selected = next; selectedKnown = true; storage = nextStorage; controller = nextController; workflowDirty = false;
    show(nextCapture, { loadSession: true }); remember(next, true); connect();
  }
  get("new").addEventListener("click", () => { void action(async () => {
    await loadSurfaceEvaluator(); const next = { database: `algal-tasks-v1-${crypto.randomUUID()}`, application: DEFAULT_WORKSPACE.application };
    const nextStorage = await IndexedDbApplicationStorage.open({ name: next.database });
    try { const nextController = new BrowserTriageController(nextStorage, next.application); const nextCapture = await nextController.initialize(); await select(next, nextStorage, nextController, nextCapture); message("Created an empty workspace. Use Back to return to the previous one."); } catch (error) { nextStorage.close(); throw error; }
  }); });
  get<HTMLInputElement>("import").addEventListener("change", event => { const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return; void action(async () => {
    try {
      if (unsaved()) throw new Error(switchMessage);
      if (file.size > 8_388_608) throw new Error("An application export must be no larger than 8 MiB.");
      await loadSurfaceEvaluator(); const bundle: unknown = JSON.parse(await file.text()); await BrowserTriageController.verifyBundle(bundle);
      const next = { database: `algal-tasks-v1-${crypto.randomUUID()}`, application: `tasks-${crypto.randomUUID()}` };
      const nextStorage = await IndexedDbApplicationStorage.open({ name: next.database });
      try { const nextController = await BrowserTriageController.importBundle(nextStorage, bundle, next.application); const nextCapture = await nextController.capture(); await select(next, nextStorage, nextController, nextCapture); message("Imported tasks into a separate workspace. Drafts and unapplied proposals were not included."); } catch (error) { nextStorage.close(); throw error; }
    } finally { input.value = ""; }
  }); });
  get("raw-export").addEventListener("click", () => { void action(async () => { download(await IndexedDbApplicationStorage.exportRaw({ name: selected.database }), "algal-tasks-recovery.json"); message("Exported stored recovery records. These may include unfinished drafts."); }); });

  let registration: ServiceWorkerRegistration | undefined;
  async function offlineStatus(cache: boolean): Promise<void> {
    const note = get("offline-status");
    if (!registration?.active) { note.textContent = "Connect to the internet and select Save for offline use after the application opens."; return; }
    const ports = new MessageChannel(), worker = registration.active;
    const ready = await new Promise<boolean>(resolve => { const timer = setTimeout(() => { ports.port1.close(); resolve(false); }, 40_000); ports.port1.onmessage = event => { clearTimeout(timer); ports.port1.close(); resolve(!!event.data && event.data.ready === true); }; worker.postMessage(cache ? "cache-offline" : "offline-status", [ports.port2]); });
    let persisted = false; try { persisted = cache ? await navigator.storage.persist() : await navigator.storage.persisted(); } catch { /* Storage persistence is optional. */ }
    note.textContent = ready ? `Saved this application’s code and assets for offline use. ${persisted ? "The browser granted persistent storage." : "The browser has not granted persistent storage; keep an export."}${registration.waiting ? " A new application version will open after you close its older tabs." : ""}` : "Offline preparation is incomplete. Reconnect and select Save for offline use.";
    note.dataset.ready = String(ready);
  }
  get("offline").addEventListener("click", () => { void offlineStatus(true).catch(error => { get("offline-status").textContent = errorText(error); }); });
  if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/tasks/sw.js", { scope: "/tasks/", updateViaCache: "none" }).then(async value => { registration = value; await navigator.serviceWorker.ready; await offlineStatus(false); }).catch(() => { get("offline-status").textContent = "Offline preparation is unavailable. A connection is needed to reopen this page."; });
  else get("offline-status").textContent = "This browser cannot save the application’s assets for offline use.";
  window.addEventListener("focus", () => { void refresh(); });
  window.addEventListener("beforeunload", event => { if (unsaved()) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("popstate", () => { if (unsaved()) { remember(selected, true); message(switchMessage, true); } else location.reload(); });
  window.addEventListener("pagehide", () => channel?.close());
  window.addEventListener("pageshow", event => { if (event.persisted) { connect(); void refresh(); } });
  buttons();
  try {
    selected = selectedWorkspace(); selectedKnown = true; await loadSurfaceEvaluator(); storage = await IndexedDbApplicationStorage.open({ name: selected.database }); controller = new BrowserTriageController(storage, selected.application);
    show(await controller.initialize(), { loadSession: true }); remember(selected, false); connect(); message("");
  } catch (error) { get("capacity").textContent = "Local tasks could not be opened"; message(`${errorText(error)} Export recovery records for troubleshooting, or create a separate workspace.`, true); }
  finally { busy = false; buttons(); }
}

const root = document.getElementById("tasks-root");
if (root) void start(root);
