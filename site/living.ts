/** The preview is a local editor, not an ApplicationService or a cloud host. */
import {
  DEFAULT_SIGNALS, evaluateView, makeRevision, parseConfig, parseProposal,
  parseRevision, parseSignalEvent, revisionDigest, updateSignals,
  type SurfaceNode, type SurfaceRevision, type SurfaceSignals, type SurfaceView,
} from "../examples/malleable-site/surface";
import { setExprExports, type EvalExports } from "../src/expr";
import {
  assertProposalBase, changedFields, parseDraft, parsePreviewFile,
  surfaceClass, surfaceTag, WORKSPACE_BYTES, WORKSPACE_LIMIT,
  type PreviewEntry, type PreviewWorkspace,
} from "./living-render";

const STORAGE_KEY = "algal.living.preview.v1";
let evaluator: Promise<void> | undefined;

async function fetchBytes(path: string, limit: number): Promise<Uint8Array> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12_000);
  try {
    const response = await fetch(path, { signal: abort.signal, redirect: "error", credentials: "same-origin" });
    if (!response.ok || !response.body) throw new Error("This preview asset could not be loaded. Your current version is unchanged.");
    const declared = response.headers.get("content-length");
    if (declared !== null && Number(declared) > limit) throw new Error("Preview asset exceeds its size limit.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) throw new Error("Preview asset exceeds its size limit.");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } finally { clearTimeout(timer); }
}

/** Call once before mounting an embed. No inference or remote model access. */
export function loadSurfaceEvaluator(): Promise<void> {
  evaluator ??= (async () => {
    const bytes = await fetchBytes("/living/algal_expr.wasm", 2_097_152);
    const { instance } = await WebAssembly.instantiate(bytes as Uint8Array<ArrayBuffer>, {});
    const ex = instance.exports;
    if (!(ex.memory instanceof WebAssembly.Memory) || ["algal_alloc", "algal_dealloc", "algal_eval", "algal_check"].some(name => typeof ex[name] !== "function")) throw new Error("The local evaluator has an unsupported interface.");
    setExprExports(ex as EvalExports);
  })();
  return evaluator;
}

function patchNode(parent: HTMLElement, node: SurfaceNode, position: number): HTMLElement {
  const tag = surfaceTag(node);
  const found = Array.from(parent.children).find(child => child instanceof HTMLElement && child.dataset.surfaceId === node.id);
  const element = found instanceof HTMLElement && found.localName === tag ? found : document.createElement(tag);
  element.className = surfaceClass(node);
  element.dataset.surfaceId = node.id;
  if (node.kind === "stack") {
    for (let index = 0; index < node.children.length; index++) patchNode(element, node.children[index]!, index);
    for (const child of Array.from(element.children).slice(node.children.length)) child.remove();
    // Static fragments have no meaningful free-standing text nodes.
    for (const child of Array.from(element.childNodes)) if (child.nodeType !== Node.ELEMENT_NODE) child.remove();
  } else {
    const value = node.kind === "link" ? node.label : node.text;
    if (element.textContent !== value) element.textContent = value;
    if (node.kind === "link") element.setAttribute("href", "/docs/");
  }
  if (parent.children[position] !== element) parent.insertBefore(element, parent.children[position] ?? null);
  return element;
}

export type SurfaceMount = {
  update(revision: SurfaceRevision, signals: SurfaceSignals): SurfaceView;
  destroy(): void;
};

/** Independent roots use scoped node keys, never document-global element IDs.
 * Evaluate before touching fallback content; update preserves surviving nodes. */
export function mountSurface(root: HTMLElement, revision: SurfaceRevision, signals: SurfaceSignals): SurfaceMount {
  const fallback = Array.from(root.childNodes).map(node => node.cloneNode(true));
  let alive = true;
  const update = (next: SurfaceRevision, inputs: SurfaceSignals): SurfaceView => {
    if (!alive) throw new Error("This surface has been unmounted.");
    const view = evaluateView(next, inputs);
    patchNode(root, view, 0);
    for (const child of Array.from(root.children).slice(1)) child.remove();
    for (const child of Array.from(root.childNodes)) if (child.nodeType !== Node.ELEMENT_NODE) child.remove();
    return view;
  };
  update(revision, signals);
  return { update, destroy() { if (alive) root.replaceChildren(...fallback); alive = false; } };
}

async function startWorkbench(root: HTMLElement): Promise<void> {
  function get<T extends HTMLElement>(id: string): T {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Missing preview element: ${id}`);
    return element;
  }
  const status = get("living-status");
  const message = (text: string, error = false): void => {
    status.textContent = text;
    status.toggleAttribute("data-error", error);
  };
  try {
    const [initialBytes] = await Promise.all([fetchBytes("/living/initial.json", WORKSPACE_BYTES), loadSurfaceEvaluator()]);
    const original = parseRevision(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(initialBytes)) as unknown);
    let workspace: PreviewWorkspace = {
      contract: "algal.marketing-preview.v1", entries: [{ revision: original, source: "original" }],
      signals: { ...DEFAULT_SIGNALS }, draft: { ...original.config }, pending: null,
    };
    let startupNote = "Ready. Edit a draft or change a simulated signal.";
    let storageAvailable = true;
    // An unreadable existing workspace may still be recoverable. Ordinary
    // edits must not silently replace it with the fallback experiment.
    let protectStoredPreview = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = parsePreviewFile(saved);
        if (parsed.contract !== "algal.marketing-preview.v1") throw new Error("Expected workspace");
        workspace = parsed;
        startupNote = "Your local preview and draft are restored.";
      }
    } catch {
      startupNote = "The saved preview could not be opened. Showing the original; your stored file has not been replaced.";
      storageAvailable = false;
      protectStoredPreview = true;
    }
    const current = (): SurfaceRevision => workspace.entries[workspace.entries.length - 1]!.revision;
    let activeDigest = await revisionDigest(current());
    if (workspace.pending !== null) {
      try { assertProposalBase(workspace.pending, activeDigest); }
      catch { workspace.pending = null; startupNote = "Your versions and draft are restored. An outdated pending proposal was left out."; }
    }
    const activeMount = mountSurface(get("living-active-view"), current(), workspace.signals);
    let candidateMount: SurfaceMount | undefined;
    const form = get<HTMLFormElement>("living-editor");
    const headline = get<HTMLTextAreaElement>("living-headline");
    const body = get<HTMLTextAreaElement>("living-body");
    const cta = get<HTMLInputElement>("living-cta");
    const layout = get<HTMLSelectElement>("living-layout");
    const audience = get<HTMLSelectElement>("living-audience");
    const release = get<HTMLSelectElement>("living-release");
    const candidate = get("living-candidate");
    const importInput = get<HTMLInputElement>("living-import");
    const resetButton = get<HTMLButtonElement>("living-reset");
    const resetCancel = get<HTMLButtonElement>("living-reset-cancel");
    let busy = false;
    let composing = false;
    let resetArmed = false;
    let draftGeneration = 0;

    function setDraftFields(): void {
      headline.value = workspace.draft.headline;
      body.value = workspace.draft.body;
      cta.value = workspace.draft.ctaLabel;
      layout.value = workspace.draft.layout;
    }
    function readDraft(): void {
      workspace.draft = parseDraft({ headline: headline.value, body: body.value, ctaLabel: cta.value, layout: layout.value });
      get("living-draft-status").textContent = changedFields(current().config, workspace.draft).length ? "Unapplied draft" : "Matches current version";
    }
    function persist(): void {
      if (protectStoredPreview) {
        get("living-storage-note").textContent = "The saved preview could not be read and is kept untouched. Export this experiment to retain it. Reset or import a workspace to replace the saved preview explicitly.";
        return;
      }
      try {
        const text = JSON.stringify(workspace);
        if (new TextEncoder().encode(text).length > WORKSPACE_BYTES) throw new Error("Preview too large");
        localStorage.setItem(STORAGE_KEY, text);
        storageAvailable = true;
      } catch { storageAvailable = false; }
      get("living-storage-note").textContent = storageAvailable
        ? "Saved locally on this device. Other tabs may have independent drafts."
        : "Local saving is unavailable. You can keep working and export a workspace to retain this experiment.";
    }
    function setControls(): void {
      for (const button of root.querySelectorAll<HTMLButtonElement>("button")) button.disabled = busy || composing;
      audience.disabled = busy || composing;
      release.disabled = busy || composing;
      importInput.disabled = busy || composing;
      get<HTMLButtonElement>("living-use").disabled = busy || composing || workspace.pending === null || workspace.entries.length >= WORKSPACE_LIMIT;
      resetButton.textContent = resetArmed ? "Reset now — clear this experiment" : "Reset local preview";
      resetCancel.hidden = !resetArmed;
      root.setAttribute("aria-busy", String(busy));
    }
    function history(): void {
      const list = get("living-history");
      const fragment = document.createDocumentFragment();
      workspace.entries.forEach((entry, index) => {
        const item = document.createElement("li");
        const number = document.createElement("span");
        number.className = "living-history-number";
        number.textContent = String(index + 1).padStart(2, "0");
        const copy = document.createElement("div");
        copy.className = "living-history-copy";
        const title = document.createElement("strong");
        title.textContent = entry.revision.config.headline;
        const source = document.createElement("span");
        source.textContent = entry.source === "original" ? "Starting version" : entry.source === "restore" ? "Restored as a new version" : entry.source === "model" ? "Model-proposed edit" : "Manual edit";
        copy.append(title, source);
        item.append(number, copy);
        if (index === workspace.entries.length - 1) {
          const label = document.createElement("span");
          label.className = "living-small-label";
          label.textContent = "In use here";
          item.append(label);
        } else {
          const button = document.createElement("button");
          button.className = "living-text-button";
          button.type = "button";
          button.textContent = "Restore";
          button.setAttribute("aria-label", `Restore version ${index + 1}`);
          button.addEventListener("click", () => { void action(async () => {
            await append(entry.revision, "restore");
            message(`Version ${index + 1} restored as version ${workspace.entries.length}. Your editor draft is kept.`);
            focusCurrent();
          }); });
          item.append(button);
        }
        fragment.append(item);
      });
      list.replaceChildren(fragment);
      const count = workspace.entries.length;
      get("living-history-count").textContent = `${count} ${count === 1 ? "version" : "versions"}`;
    }
    function render(): void {
      activeMount.update(current(), workspace.signals);
      audience.value = workspace.signals.audience;
      release.value = workspace.signals.release;
      get("living-version").textContent = `/ version ${workspace.entries.length}`;
      const pending = workspace.pending;
      candidate.hidden = pending === null;
      if (pending !== null) {
        assertProposalBase(pending, activeDigest);
        const revision = makeRevision(pending.config);
        if (candidateMount) candidateMount.update(revision, workspace.signals);
        else candidateMount = mountSurface(get("living-pending-view"), revision, workspace.signals);
        get("living-proposal-source").textContent = pending.source === "model" ? "Model proposal" : "Manual edit";
        get("living-proposal-rationale").textContent = pending.rationale;
        const changes = changedFields(current().config, pending.config).map(field => {
          const item = document.createElement("li"); item.textContent = `${field} changed`; return item;
        });
        get("living-changes").replaceChildren(...changes);
      }
      get("living-revision-digest").textContent = activeDigest;
      get("living-signal-evidence").textContent = JSON.stringify(workspace.signals);
      get("living-program").textContent = JSON.stringify(current(), null, 2);
      get("living-draft-status").textContent = changedFields(current().config, workspace.draft).length ? "Unapplied draft" : "Matches current version";
      history();
      setControls();
    }
    function focusCurrent(): void {
      const label = get("living-active-label");
      label.tabIndex = -1;
      label.focus({ preventScroll: true });
    }
    async function append(revision: SurfaceRevision, source: PreviewEntry["source"]): Promise<void> {
      if (workspace.entries.length >= WORKSPACE_LIMIT) throw new Error("This preview has reached 24 versions. Export it before starting a new experiment.");
      const next = parseRevision(revision);
      const digest = await revisionDigest(next);
      if (composing) throw new Error("Finish composing your text, then try again. Your draft is kept.");
      if (digest === activeDigest) throw new Error("This version is already in use here.");
      evaluateView(next, workspace.signals);
      workspace.entries.push({ revision: next, source });
      workspace.pending = null;
      activeDigest = digest;
    }
    async function action(task: () => void | Promise<void>): Promise<void> {
      if (busy) return;
      if (composing) { message("Finish composing your text, then try again. Your draft is kept."); return; }
      busy = true; setControls();
      try {
        await task();
        readDraft();
        render();
        persist();
      } catch (error) { message(error instanceof Error ? error.message : "This change could not be applied. Your current version is kept.", true); }
      finally { busy = false; setControls(); }
    }

    setDraftFields();
    render();
    for (const id of ["living-controls", "living-editor-panel", "living-tools"]) get(id).hidden = false;
    get("living-fallback-note").hidden = true;
    get("living-runtime-label").textContent = "Running locally";
    if (!storageAvailable) get("living-storage-note").textContent = "Local saving could not be read. Export your experiment to retain it; the original saved file has not been replaced.";
    root.dataset.ready = "true";
    message(startupNote);

    form.addEventListener("compositionstart", () => { composing = true; setControls(); });
    form.addEventListener("compositionend", () => {
      draftGeneration++;
      composing = false; setControls();
      try { readDraft(); persist(); } catch { message("This draft exceeds a text limit. Shorten it before previewing.", true); }
    });
    form.addEventListener("input", () => {
      draftGeneration++;
      if (composing) return;
      try { readDraft(); persist(); } catch { message("This draft exceeds a text limit. Shorten it before previewing.", true); }
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      void action(() => {
        readDraft();
        const config = parseConfig(workspace.draft);
        if (!changedFields(current().config, config).length) throw new Error("Change a word or the layout to preview a new version.");
        const proposal = parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: activeDigest, config, source: "owner", rationale: "Your edits, ready to compare. Use this version when it feels right." });
        evaluateView(makeRevision(config), workspace.signals);
        workspace.pending = proposal;
        message("Draft previewed below the current version. Nothing has been replaced.");
      });
    });
    get("living-use").addEventListener("click", () => { void action(async () => {
      const proposal = workspace.pending;
      if (!proposal) return;
      assertProposalBase(proposal, activeDigest);
      await append(makeRevision(proposal.config), proposal.source);
      message(`Version ${workspace.entries.length} is now in use here. Your editor draft is kept.`);
      focusCurrent();
    }); });
    get("living-discard").addEventListener("click", () => { void action(() => {
      workspace.pending = null;
      message("Preview dismissed. Your current version and editor draft are kept.");
      get("living-preview").focus({ preventScroll: true });
    }); });
    for (const [select, kind] of [[audience, "audience"], [release, "release"]] as const) {
      select.addEventListener("change", () => { void action(() => {
        const event = parseSignalEvent({ kind, value: select.value });
        workspace.signals = updateSignals(workspace.signals, event);
        message("Simulated context updated. Both versions use the same inputs; your draft is kept.");
      }); });
    }
    get("living-model-proposal").addEventListener("click", () => { void action(async () => {
      const bytes = await fetchBytes("/living/model-proposal.json", WORKSPACE_BYTES);
      const proposal = parseProposal(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown);
      assertProposalBase(proposal, activeDigest);
      evaluateView(makeRevision(proposal.config), workspace.signals);
      if (composing) throw new Error("Finish composing your text before loading a proposal. Your draft is kept.");
      workspace.pending = proposal;
      message("Recorded AI proposal loaded for comparison. It has not changed the component or your draft.");
    }); });
    get("living-export").addEventListener("click", () => { void action(() => {
      readDraft();
      const text = JSON.stringify(workspace, null, 2);
      if (new TextEncoder().encode(text).length > WORKSPACE_BYTES) throw new Error("This preview exceeds the export size limit.");
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "algal-local-preview.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      message("Workspace exported with your current draft, versions, and simulated inputs.");
    }); });
    importInput.addEventListener("change", () => { void action(async () => {
      const startingDraftGeneration = draftGeneration;
      const file = importInput.files?.[0];
      importInput.value = "";
      if (!file) return;
      if (file.size > WORKSPACE_BYTES) throw new Error("Preview files must be smaller than 128 KiB.");
      const parsed = parsePreviewFile(await file.text());
      if (composing) throw new Error("Finish composing your text before importing. Your draft is kept.");
      if (parsed.contract === "algal.marketing-proposal.v1") {
        assertProposalBase(parsed, activeDigest);
        evaluateView(makeRevision(parsed.config), workspace.signals);
        workspace.pending = parsed;
        message("Proposal imported for comparison. Your current version and editor draft are kept.");
      } else {
        const revision = parsed.entries[parsed.entries.length - 1]!.revision;
        const digest = await revisionDigest(revision);
        if (parsed.pending) assertProposalBase(parsed.pending, digest);
        evaluateView(revision, parsed.signals);
        if (parsed.pending) evaluateView(makeRevision(parsed.pending.config), parsed.signals);
        if (composing) throw new Error("Finish composing your text before importing. Your draft is kept.");
        if (draftGeneration !== startingDraftGeneration) throw new Error("Your draft changed while the workspace was loading. Nothing was replaced; import again when you are ready.");
        workspace = parsed; activeDigest = digest;
        protectStoredPreview = false;
        setDraftFields();
        message("Local workspace imported, including its draft and history. Nothing was published.");
      }
    }); });
    resetButton.addEventListener("click", () => { void action(async () => {
      if (!resetArmed) { resetArmed = true; message("Reset will clear this local experiment and its draft. Export first to keep a copy, or choose Cancel reset."); return; }
      const startingDraftGeneration = draftGeneration;
      const digest = await revisionDigest(original);
      if (composing) throw new Error("Finish composing your text before resetting.");
      if (draftGeneration !== startingDraftGeneration) throw new Error("Your draft changed while the reset was preparing. Nothing was replaced; reset again when you are ready.");
      workspace = { contract: "algal.marketing-preview.v1", entries: [{ revision: original, source: "original" }], signals: { ...DEFAULT_SIGNALS }, draft: { ...original.config }, pending: null };
      activeDigest = digest; resetArmed = false;
      protectStoredPreview = false;
      setDraftFields();
      message("Local preview reset to the original component.");
      focusCurrent();
    }); });
    resetCancel.addEventListener("click", () => { void action(() => { resetArmed = false; message("Reset canceled. Your experiment is kept."); resetButton.focus(); }); });
  } catch {
    message("The interactive workbench could not start. The original component remains available. Reload to try again.", true);
  }
}

if (typeof document !== "undefined") {
  const root = document.getElementById("living-root");
  if (root) void startWorkbench(root);
}
