import { BrowserGrowController, type GrowCapture } from "../examples/browser-grow/controller";
import { makeRevision, type SurfaceSignalEvent } from "../examples/malleable-site/surface";
import { IndexedDbApplicationStorage } from "../src/application-browser-storage";
import { changedFields } from "./living-render";
import { loadSurfaceEvaluator, mountSurface, type SurfaceMount } from "./living";
import { loadLocalModel, probeLocalModel, suggestConfig, unloadLocalModel } from "./browser-inference";

const DEFAULT_DATABASE = "algal-grow-v1";
const DATABASE_KEY = "algal.grow.workspace.v1";
const validDatabase = (name: string | null): name is string => name !== null && /^algal-grow-v1(?:-[a-f0-9-]{36})?$/.test(name);
function selectedDatabase(): string {
  const query = new URL(location.href).searchParams.get("workspace");
  if (validDatabase(query)) return query;
  try { const saved = localStorage.getItem(DATABASE_KEY); if (validDatabase(saved)) return saved; } catch { /* Preference only; application state is in IndexedDB. */ }
  return DEFAULT_DATABASE;
}
function rememberDatabase(name: string, fresh = false): void {
  const url = new URL(location.href);
  url.searchParams.set("workspace", name);
  if (fresh) history.pushState(null, "", url); else history.replaceState(null, "", url);
  try { localStorage.setItem(DATABASE_KEY, name); } catch { /* The URL still identifies this workspace on reload. */ }
}
function download(value: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
function errorText(error: unknown): string { return error instanceof Error ? error.message : "The operation did not complete. Export recovery records if the workspace cannot reopen."; }

async function start(root: HTMLElement): Promise<void> {
  const get = <T extends HTMLElement>(id: string): T => {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Missing browser workspace element ${id}`);
    return element;
  };
  const status = get("grow-status");
  const message = (text: string, error = false): void => { status.textContent = text; status.toggleAttribute("data-error", error); };
  const audience = get<HTMLSelectElement>("grow-audience"), release = get<HTMLSelectElement>("grow-release");
  const auto = get<HTMLInputElement>("grow-auto"), fileInput = get<HTMLInputElement>("grow-import");
  const modelStatus = get("grow-model-status"), modelProgress = get<HTMLProgressElement>("grow-model-progress");
  let database = selectedDatabase(), storage: IndexedDbApplicationStorage | undefined;
  let controller: BrowserGrowController | undefined, capture: GrowCapture | undefined;
  let activeMount: SurfaceMount | undefined, candidateMount: SurfaceMount | undefined;
  let channel: BroadcastChannel | undefined;
  let busy = false, modelBusy = false, modelReady = false, gpuAvailable = false, signalsDirty = false, refreshPending = false;
  let modelAbort: AbortController | undefined;

  function controls(): void {
    const ready = capture !== undefined && controller !== undefined;
    const held = !!capture && (capture.controls.inferencePaused || capture.controls.pinnedRevision !== null);
    const exhausted = !capture || capture.remainingStates === 0;
    for (const button of root.querySelectorAll<HTMLButtonElement>("button[data-restore]")) button.disabled = busy || exhausted || capture?.controls.pinnedRevision !== null;
    audience.disabled = release.disabled = busy || !ready || exhausted;
    get<HTMLFormElement>("grow-signals").querySelector<HTMLButtonElement>("button")!.disabled = busy || !ready || exhausted;
    auto.disabled = busy || !ready || held || exhausted;
    get<HTMLButtonElement>("grow-propose").disabled = busy || !ready || held || exhausted || capture?.remainingCandidates === 0 || capture?.pending !== null;
    get<HTMLButtonElement>("grow-adopt").disabled = busy || !ready || held || exhausted || !capture?.pending?.accepted || (capture.pending.source === "model" && capture.controls.modelActivationPaused);
    get<HTMLButtonElement>("grow-pause").disabled = get<HTMLButtonElement>("grow-pin").disabled = busy || !ready || exhausted;
    get<HTMLButtonElement>("grow-export").disabled = busy || !ready;
    fileInput.disabled = busy;
    get<HTMLButtonElement>("grow-new").disabled = busy;
    get<HTMLButtonElement>("grow-model-load").disabled = busy || modelBusy || modelReady || !gpuAvailable || !ready || held;
    get<HTMLButtonElement>("grow-model-propose").disabled = busy || modelBusy || !modelReady || !ready || held || exhausted || capture?.remainingCandidates === 0 || capture?.pending !== null;
    get("grow-model-stop").hidden = !modelBusy && !modelReady;
    root.setAttribute("aria-busy", String(busy));
  }
  function show(next: GrowCapture, resetSignals = false): void {
    capture = next;
    if (!activeMount) activeMount = mountSurface(get("grow-active-view"), next.definition, next.signals);
    else activeMount.update(next.definition, next.signals);
    if (resetSignals || !signalsDirty) { audience.value = next.signals.audience; release.value = next.signals.release; signalsDirty = false; }
    get("grow-runtime").textContent = "Running locally · saved in this browser";
    get("grow-sequence").textContent = `/ step ${next.sequence + 1}`;
    get("grow-head").textContent = next.head;
    get("grow-revision").textContent = next.revisionDigest;
    get("grow-signal-evidence").textContent = JSON.stringify(next.signals);
    get("grow-program").textContent = JSON.stringify(next.definition, null, 2);
    get("grow-history-count").textContent = `${next.history.length} history steps · ${next.remainingCandidates} proposals left`;
    get("grow-pause").textContent = next.controls.inferencePaused ? "Resume evolution" : "Pause evolution";
    get("grow-pin").textContent = next.controls.pinnedRevision ? "Unpin this version" : "Pin this version";
    get("grow-control-note").textContent = next.controls.pinnedRevision ? "This version is pinned. You can save new context." : next.controls.inferencePaused ? "Evolution is paused. Your current component keeps running." : "You choose when to use a proposal that passes the checks.";
    if (next.controls.inferencePaused || next.controls.pinnedRevision) auto.checked = false;
    get("grow-candidate").hidden = next.pending === null;
    if (next.pending) {
      const pending = next.pending, definition = makeRevision(pending.proposal.config);
      if (!candidateMount) candidateMount = mountSurface(get("grow-candidate-view"), definition, next.signals);
      else candidateMount.update(definition, next.signals);
      get("grow-source").textContent = pending.source === "rules" ? "Local rules · no AI call" : "Model proposal";
      get("grow-rationale").textContent = pending.proposal.rationale;
      get("grow-fit").textContent = `Fit score: ${pending.fit.before} → ${pending.fit.after} out of 4. ${pending.accepted ? "The proposal passed the checks and can be applied." : "The proposal did not pass all requirements and cannot be applied."}`;
      get("grow-evaluation").textContent = JSON.stringify({ fit: pending.fit, shadow: pending.shadow.report }, null, 2);
      const changes = get("grow-changes"); changes.replaceChildren();
      for (const field of changedFields(next.definition.config, pending.proposal.config)) { const li = document.createElement("li"); li.textContent = field; changes.append(li); }
    }
    const historyList = get("grow-history"); historyList.replaceChildren();
    for (const row of next.history) {
      const item = document.createElement("li"), number = document.createElement("span"), copy = document.createElement("div");
      number.className = "living-history-number"; number.textContent = String(row.sequence + 1).padStart(2, "0");
      copy.className = "living-history-copy";
      const title = document.createElement("strong"), kind = document.createElement("span");
      title.textContent = row.headline; kind.textContent = `${row.kind}${row.source ? ` · ${row.source === "rules" ? "local rules" : "model"}` : ""}`;
      copy.append(title, kind); item.append(number, copy);
      if (row.state === next.head) { const label = document.createElement("span"); label.className = "living-small-label"; label.textContent = "Current"; item.append(label); }
      else if (row.revision !== next.revisionDigest) {
        const button = document.createElement("button"); button.type = "button"; button.className = "living-text-button";
        button.dataset.restore = row.state; button.textContent = "Restore"; button.setAttribute("aria-label", `Restore behavior from step ${row.sequence + 1}`);
        button.addEventListener("click", () => { void action(async () => {
          if (!controller || !capture) return;
          show(await controller.restore(capture.head, row.state));
          message("Restored the earlier behavior as a new step and kept the current context.");
        }); }); item.append(button);
      }
      historyList.append(item);
    }
    root.dataset.ready = "true";
    get("grow-controls").hidden = get("grow-actions").hidden = false;
    controls();
  }
  async function refresh(): Promise<void> {
    if (!controller) return;
    if (busy) { refreshPending = true; return; }
    const source = controller, previous = capture;
    try {
      const next = await source.capture();
      if (source !== controller || previous !== capture) return;
      if (busy) { refreshPending = true; return; }
      if (next.head !== capture?.head || next.pending?.reference !== capture?.pending?.reference) { show(next); message("Loaded the changes from another tab."); }
    } catch (error) { if (source === controller && previous === capture && !busy) message(errorText(error), true); }
  }
  function connect(): void {
    channel?.close();
    if (typeof BroadcastChannel === "undefined") return;
    channel = new BroadcastChannel(`algal-grow:${database}`);
    channel.onmessage = event => { if (event.data === "changed") void refresh(); };
  }
  async function action(operation: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true; controls();
    try { await operation(); channel?.postMessage("changed"); }
    catch (error) {
      // Re-read after uncertain publication. Never resend an operation or erase
      // the journal just because a browser write was interrupted.
      try { if (controller) show(await controller.capture()); } catch { /* Preserve last rendered state and diagnostic records. */ }
      message(errorText(error), true);
    } finally { busy = false; controls(); if (refreshPending) { refreshPending = false; void refresh(); } }
  }
  async function proposeRules(): Promise<void> {
    if (!controller || !capture) return;
    const candidate = await controller.propose(capture.head, { source: "rules" });
    show(await controller.capture());
    message(candidate.accepted ? "The local-rule proposal passed the checks. Compare the versions before choosing one." : "Saved the proposal for inspection. It did not pass the requirements for use.");
  }
  get("grow-propose").addEventListener("click", () => { void action(proposeRules); });
  get("grow-adopt").addEventListener("click", () => { void action(async () => {
    if (!controller || !capture?.pending) return;
    show(await controller.adopt(capture.head, capture.pending.reference));
    message("Applied the change and saved its checks in the history.");
  }); });
  for (const input of [audience, release]) input.addEventListener("change", () => { signalsDirty = true; });
  get<HTMLFormElement>("grow-signals").addEventListener("submit", event => {
    event.preventDefault();
    void action(async () => {
      if (!controller || !capture) return;
      const desired = { audience: audience.value, release: release.value };
      const events: SurfaceSignalEvent[] = [];
      if (desired.audience === "builders" || desired.audience === "operators") {
        if (desired.audience !== capture.signals.audience) events.push({ kind: "audience", value: desired.audience });
      }
      if (desired.release === "preview" || desired.release === "available") {
        if (desired.release !== capture.signals.release) events.push({ kind: "release", value: desired.release });
      }
      // An explicit capture may reaffirm context. It is a new ordered input,
      // allowing one new bounded attempt after an earlier rejected proposal.
      if (!events.length) events.push({ kind: "audience", value: capture.signals.audience });
      if (events.length > capture.remainingStates) throw new Error("This workspace has too few history steps left to save both inputs. Export it and create a workspace to continue.");
      for (const input of events) capture = await controller.signal(capture.head, input);
      show(capture, true);
      if (auto.checked && capture.remainingStates > 0 && capture.remainingCandidates > 0 && !capture.controls.inferencePaused && !capture.controls.pinnedRevision) {
        const candidate = await controller.propose(capture.head, { source: "rules" });
        if (candidate.accepted) { show(await controller.adopt(capture.head, candidate.reference)); message("Saved the context and automatically applied one proposal that passed the checks."); }
        else { show(await controller.capture()); message("Saved the context and proposal. The proposal did not pass the requirements for use."); }
      } else message("Saved the context in the application history and updated the component.");
    });
  });
  get("grow-pause").addEventListener("click", () => { void action(async () => {
    if (!controller || !capture) return;
    const paused = !capture.controls.inferencePaused;
    show(await controller.setControls(capture.head, { ...capture.controls, inferencePaused: paused, modelActivationPaused: paused }));
    message(paused ? "Evolution paused and saved." : "Evolution resumed. Automatic adoption remains off until you enable it.");
  }); });
  get("grow-pin").addEventListener("click", () => { void action(async () => {
    if (!controller || !capture) return;
    show(await controller.setControls(capture.head, { ...capture.controls, pinnedRevision: capture.controls.pinnedRevision ? null : capture.revisionDigest }));
    message(capture.controls.pinnedRevision ? "Current behavior pinned and saved." : "Behavior unpinned. Future changes still need to pass the checks.");
  }); });
  get("grow-export").addEventListener("click", () => { void action(async () => {
    if (!controller) return;
    const bundle = await controller.exportBundle(); await BrowserGrowController.verifyBundle(bundle);
    download(bundle, "algal-growing-application.json"); message("Exported the history after replaying the execution records and checking the proposals.");
  }); });
  get("grow-raw-export").addEventListener("click", () => { void action(async () => {
    download(await IndexedDbApplicationStorage.exportRaw({ name: database }), "algal-browser-recovery.json");
    message("Exported raw records for troubleshooting. Use Export verified history for a file you can import here.");
  }); });
  fileInput.addEventListener("change", () => { void action(async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    if (file.size > 4_194_304) throw new Error("An application export must be no larger than 4 MiB.");
    const input: unknown = JSON.parse(await file.text()); await BrowserGrowController.verifyBundle(input);
    const name = `${DEFAULT_DATABASE}-${crypto.randomUUID()}`, imported = await IndexedDbApplicationStorage.open({ name });
    try {
      const nextController = await BrowserGrowController.importBundle(imported, input);
      const next = await nextController.capture();
      rememberDatabase(name, true); storage?.close(); storage = imported; controller = nextController; database = name; connect();
      auto.checked = false; show(next, true); message("Imported the history into a separate workspace. Use Back to return to the earlier workspace.");
    } catch (error) { imported.close(); throw error; }
    finally { fileInput.value = ""; }
  }); });
  get("grow-new").addEventListener("click", () => { void action(async () => {
    const name = `${DEFAULT_DATABASE}-${crypto.randomUUID()}`, fresh = await IndexedDbApplicationStorage.open({ name });
    try {
      const nextController = new BrowserGrowController(fresh), next = await nextController.initialize();
      rememberDatabase(name, true); storage?.close(); storage = fresh; controller = nextController; database = name; connect();
      auto.checked = false; show(next, true); message("Created a workspace. Use your browser's Back button to return to the earlier workspace.");
    } catch (error) { fresh.close(); throw error; }
  }); });
  get("grow-model-load").addEventListener("click", () => { void action(async () => {
    modelBusy = true; modelAbort = new AbortController(); modelProgress.hidden = false; controls();
    try {
      await loadLocalModel(progress => { modelProgress.value = progress.fraction; modelStatus.textContent = progress.message; }, { signal: modelAbort.signal });
      modelReady = true; modelStatus.textContent = "Local model loaded. A proposal stays on this device and must pass the same checks.";
    } finally { modelBusy = false; modelProgress.hidden = true; controls(); }
  }); });
  get("grow-model-propose").addEventListener("click", () => { void action(async () => {
    if (!controller || !capture) return;
    const parent = capture, activeController = controller;
    modelBusy = true; modelAbort = new AbortController(); modelStatus.textContent = "Generating one proposal on this device…"; controls();
    try {
      const config = await suggestConfig({ config: parent.definition.config, signals: parent.signals }, { signal: modelAbort.signal });
      await activeController.propose(parent.head, { source: "model", config, rationale: "A local WebGPU model proposed this content and layout. The fixed host policy independently checks it; the model's suggestion is not evidence of quality." });
      show(await activeController.capture()); modelStatus.textContent = "Generated one local proposal. Inspect the results of its checks.";
      message(capture?.pending?.accepted ? "The on-device proposal passed the checks. Choose Use this version to apply it." : "Saved the on-device proposal for inspection. It did not pass the requirements for use.");
    } catch (error) { unloadLocalModel(); modelReady = false; modelStatus.textContent = "The attempt ended. Load the model before trying again."; throw error; }
    finally { modelBusy = false; controls(); }
  }); });
  get("grow-model-stop").addEventListener("click", () => {
    modelAbort?.abort(); unloadLocalModel(); modelReady = false; modelBusy = false;
    modelStatus.textContent = "Local AI stopped and unloaded. No automatic retry will run."; controls();
  });
  window.addEventListener("focus", () => { void refresh(); });
  window.addEventListener("popstate", () => { location.reload(); });
  window.addEventListener("pagehide", () => { modelAbort?.abort(); unloadLocalModel(); modelReady = false; channel?.close(); });
  window.addEventListener("pageshow", event => { if (event.persisted) { connect(); modelStatus.textContent = "AI is unloaded. Enable it again when needed."; controls(); void refresh(); } });

  // Offline shell preparation never changes the authoritative application DB.
  let registration: ServiceWorkerRegistration | undefined;
  async function offlineStatus(cache: boolean): Promise<void> {
    const note = get("grow-offline-status");
    if (!registration?.active) { note.textContent = "This workspace is not saved for offline use. Connect to the internet and select Save for offline use."; return; }
    const worker = registration.active, ports = new MessageChannel();
    const ready = await new Promise<boolean>(resolve => {
      const timer = setTimeout(() => { ports.port1.close(); resolve(false); }, 40_000);
      ports.port1.onmessage = event => { clearTimeout(timer); ports.port1.close(); resolve(!!event.data && event.data.ready === true); };
      worker.postMessage(cache ? "cache-offline" : "offline-status", [ports.port2]);
    });
    let persisted = false;
    try { persisted = cache ? await navigator.storage.persist() : await navigator.storage.persisted(); } catch { /* Optional persistence request; still report shell state accurately. */ }
    note.textContent = ready
      ? `Saved this workspace’s code and assets for offline use with local rules. ${persisted ? "The browser granted persistent storage." : "The browser has not granted persistent storage; keep an export."}${registration.waiting ? " A new application version will open after you close its older tabs." : ""}`
      : "Offline preparation is incomplete. Keep this tab open or reconnect and select Save for offline use.";
    note.dataset.ready = String(ready);
  }
  get("grow-offline").addEventListener("click", () => { void offlineStatus(true).catch(error => { get("grow-offline-status").textContent = errorText(error); }); });
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/grow/sw.js", { scope: "/grow/", updateViaCache: "none" }).then(async value => {
      registration = value; await navigator.serviceWorker.ready; await offlineStatus(false);
    }).catch(() => { get("grow-offline-status").textContent = "Offline preparation is unavailable. A connection is needed to reopen this page."; });
  } else get("grow-offline-status").textContent = "This browser cannot save the workspace’s code and assets for offline use.";
  void probeLocalModel().then(probe => { gpuAvailable = probe.available; modelStatus.textContent = probe.reason; controls(); }).catch(error => { modelStatus.textContent = errorText(error); });
  try {
    await loadSurfaceEvaluator();
    storage = await IndexedDbApplicationStorage.open({ name: database }); controller = new BrowserGrowController(storage);
    show(await controller.initialize(), true); rememberDatabase(database); connect();
    message("");
  } catch (error) {
    get("grow-runtime").textContent = "Local history could not be opened";
    message(`${errorText(error)} Export recovery records for troubleshooting, or import a verified history into a separate workspace.`, true);
  } finally { controls(); }
}

const root = document.getElementById("grow-root");
if (root) void start(root);
