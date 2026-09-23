import { canonicalize, type JsonValue } from "../src/values";
import { parseProposal, evaluateView, revisionDigest, type SurfaceProposal } from "../examples/malleable-site/surface";
import { parseWorkbenchCapture, WORKBENCH_LIMITS, type WorkbenchCapture, type WorkbenchCommand, type SignalEnvelope } from "../examples/malleable-site/workbench-contract";
import type { Digest } from "../src/digest-type";
import { loadSurfaceEvaluator, mountSurface, type SurfaceMount } from "./living";

const root = document.querySelector<HTMLElement>("#wb-root");
function get<T extends HTMLElement>(id: string): T { const element = document.getElementById(id); if (!element) throw new Error("Missing workbench control"); return element as T; }
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
async function hash(input: JsonValue): Promise<Digest> { const bytes = new TextEncoder().encode(canonicalize(input)); const digest = await crypto.subtle.digest("SHA-256", bytes); return `sha256:${Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("")}`; }
function facts(target: HTMLElement, rows: [string, string][]): void { target.replaceChildren(...rows.map(([label, value]) => { const row = el("div"); row.append(el("dt", label), el("dd", value)); return row; })); }

async function start(): Promise<void> {
  if (!root) return;
  const fragment = new URLSearchParams(location.hash.slice(1)), offered = fragment.get("token");
  const token = location.hostname === "127.0.0.1" && offered && /^[a-f0-9]{64}$/.test(offered) ? offered : null;
  if (offered) history.replaceState(null, "", location.pathname + location.search);
  let connected = token !== null, capture: WorkbenchCapture, mount: SurfaceMount | undefined;
  let selected = "headline", busy = false, composing = false, draftDirty = false;
  const message = (text: string, failed = false) => { get("wb-status").textContent = text; get("wb-status").toggleAttribute("data-error", failed); };
  const allowed = (kind: WorkbenchCommand["kind"]) => connected && capture.actions.find(action => action.kind === kind)?.allowed === true;
  async function readJson(response: Response, max = WORKBENCH_LIMITS.captureBytes): Promise<unknown> {
    if (!response.ok || !response.body) throw new Error("The host did not admit this request. Refresh before trying another command; your draft is kept.");
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let count = 0;
    try { for (;;) { const row = await reader.read(); if (row.done) break; count += row.value.length; if (count > max) throw new Error("Capture exceeds its bound"); chunks.push(row.value); } }
    finally { await reader.cancel(); }
    const bytes = new Uint8Array(count); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  async function request(path: string, input?: unknown): Promise<unknown> {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20_000);
    try { return await readJson(await fetch(path, { method: input === undefined ? "GET" : "POST", credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(input === undefined ? {} : { "content-type": "application/json" }) }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) })); }
    finally { clearTimeout(timer); }
  }
  async function accept(input: unknown): Promise<void> {
    const next = parseWorkbenchCapture(input);
    if (await revisionDigest(next.revision) !== next.revisionDigest || await hash(next.controls) !== next.controlsRef || canonicalize(evaluateView(next.revision, next.signals)) !== canonicalize(next.view)) throw new Error("Capture content does not match its revision and inputs.");
    if (next.provenance.nodes.some(node => node.revision !== next.revisionDigest || node.receipt !== next.provenance.receipt)) throw new Error("Explanation belongs to another captured execution.");
    capture = next;
    if (!mount) mount = mountSurface(get("wb-surface"), capture.revision, capture.signals);
    else mount.update(capture.revision, capture.signals);
    render();
  }
  function controls(): void {
    root!.setAttribute("aria-busy", String(busy));
    for (const button of root!.querySelectorAll<HTMLButtonElement>("button")) button.disabled = busy || composing || button.dataset.blocked === "true";
    get<HTMLInputElement>("wb-import").disabled = busy || composing;
  }
  async function action(fn: () => Promise<void>): Promise<void> {
    if (busy || composing) return;
    busy = true; controls();
    try { await fn(); } catch (error) { message(error instanceof Error ? error.message : "The operation failed. Your current application and draft are kept.", true); }
    finally { busy = false; controls(); }
  }
  function button(label: string, enabled: boolean, run: () => Promise<void>): HTMLButtonElement {
    const node = el("button", label); node.type = "button"; node.className = "living-text-button"; node.dataset.blocked = String(!enabled); node.addEventListener("click", () => { void action(run); }); return node;
  }
  async function send(fields: Omit<WorkbenchCommand, "contract" | "actor" | "operation" | "expectedHead" | "expectedControls"> & Record<string, unknown>, operation?: Digest): Promise<void> {
    if (!connected) throw new Error("Open the local host to send owner commands.");
    const body = { contract: "algal.marketing-command.v1", actor: "human", expectedHead: capture.head, expectedControls: capture.controlsRef, operation: operation ?? await hash({ identity: crypto.randomUUID() }), ...fields };
    const result = await request("/api/command", body) as { capture: unknown };
    await accept(result.capture);
    message("The host admitted this command. The surface and explanation now share the new capture.");
  }
  function explain(): void {
    const node = capture.provenance.nodes.find(n => n.node === selected) ?? capture.provenance.nodes[0];
    if (!node) throw new Error("Capture omits explanations");
    selected = node.node;
    const labels: Record<string, string> = { headline: "The headline", body: "The body copy", cta: "The documentation link", surface: "The layout", audience: "The audience label", release: "The release status" };
    get("wb-why-title").textContent = labels[selected] ?? selected;
    get("wb-why-copy").textContent = node.signalFields.length ? "A pure view rule turns the captured signal into this label. No model call is needed to display it." : selected === "cta" ? "The revision supplies the label. The trusted renderer fixes the destination to the documentation." : "This value comes directly from the captured revision. A proposal changes it only after the host admits a new revision.";
    const rows: [string, string][] = node.configFields.map(field => [`Revision · ${field}`, capture.revision.config[field]]);
    for (const field of node.signalFields) {
      rows.push([`Signal · ${field}`, capture.signals[field]]);
      rows.push(["Source evidence", capture.provenance.cursors.length ? "Ordered signal envelopes are retained with the captured memory." : "Initial or legacy input; no admitted stream provenance is available."]);
    }
    if (selected === "cta") rows.push(["Fixed destination", "/docs/"]);
    facts(get("wb-why-fields"), rows);
    facts(get("wb-why-refs"), [["Application state", capture.head], ["Surface revision", capture.revisionDigest], ["Memory", capture.provenance.memory], ["View receipt", node.receipt]]);
    for (const item of get("wb-node-list").querySelectorAll<HTMLButtonElement>("button")) item.setAttribute("aria-pressed", String(item.dataset.node === selected));
  }
  function card(title: string, copy: string): HTMLElement { const node = el("article"); node.className = "workbench-card"; node.append(el("h3", title), el("p", copy)); return node; }
  function render(): void {
    get("wb-mode").textContent = connected ? "Connected local owner workspace" : "Captured evidence · read only";
    get("wb-state-label").textContent = `State ${capture.sequence + 1} · ${capture.head.slice(7, 19)}`;
    get("wb-capacity").textContent = `${64 - capture.history.length} state changes remaining`;
    get("wb-refresh").hidden = !connected; get("wb-edit").hidden = !connected; get("wb-owner-controls").hidden = !connected;
    get("wb-node-list").replaceChildren(...capture.provenance.nodes.map(node => { const b = el("button", node.node); b.type = "button"; b.dataset.node = node.node; b.addEventListener("click", () => { selected = node.node; explain(); }); return b; }));
    explain();
    get("wb-history").replaceChildren(...capture.history.map(row => {
      const item = el("li"), title = row.kind === "create" ? "Workspace created" : row.kind === "activate" ? "Revision adopted" : row.kind === "restore" ? "Earlier revision restored forward" : "Signals or controls changed";
      item.append(el("span", String(row.sequence + 1).padStart(2, "0")), el("span", title));
      if (connected && row.head !== capture.head) item.append(button("Restore", allowed("restore"), () => send({ kind: "restore", targetState: row.head })));
      return item;
    }));
    const names: Record<string, string> = { preview: "Preview a proposal", activate: "Adopt a revision", signal: "Admit a signal", restore: "Restore forward", "set-controls": "Change owner controls", infer: "Request a model proposal" };
    get("wb-actions").replaceChildren(...capture.actions.map(row => { const item = el("li"); item.append(el("span", names[row.kind] ?? row.kind), el("span", row.allowed ? "Available at this capture" : row.reason ?? "Unavailable")); return item; }));
    get("wb-freeze").textContent = capture.controls.inferencePaused && capture.controls.modelActivationPaused ? "Resume model evolution" : "Pause model evolution";
    get("wb-pin").textContent = capture.controls.pinnedRevision ? "Unpin this version" : "Pin this version";
    for (const id of ["wb-freeze", "wb-pin"]) get(id).dataset.blocked = String(!allowed("set-controls"));
    get("wb-proposal-count").textContent = `${capture.previews.length} previews · ${capture.shadows.length} checks`;
    get("wb-previews").replaceChildren(...capture.previews.map(preview => {
      const stale = preview.parentState !== capture.head, node = card(preview.proposal.config.headline, `${preview.proposal.source === "model" ? "Model" : "Owner"} proposal · ${stale ? "Earlier state; cannot be adopted" : "This captured state"}. ${preview.proposal.rationale}`);
      if (connected) node.append(button(stale ? "Preview is stale" : "Adopt this revision", !stale && allowed("activate") && !(preview.proposal.source === "model" && capture.controls.modelActivationPaused), () => send({ kind: "activate", preview: preview.reference })));
      return node;
    }));
    if (!capture.previews.length) get("wb-previews").append(el("p", "No retained previews in this capture."));
    get("wb-shadows").replaceChildren(...capture.shadows.map(shadow => card(shadow.accepted ? "Offline guardrails passed" : "Offline guardrails did not pass", shadow.reason)));
    get("wb-inference-count").textContent = `${capture.attempts.length} attempts`;
    const attemptCards = new Map<Digest, HTMLElement>();
    get("wb-attempts").replaceChildren(...capture.attempts.map(attempt => {
      const node = card(`${attempt.admission.backend} · ${attempt.settlement?.status ?? "pending or unknown"}`, `${attempt.admission.model}. ${attempt.settlement?.reason ?? (attempt.settlement ? "Recorded completion; inspect the proposal separately." : "An admitted attempt has no terminal record. It must not be automatically retried.")}`);
      attemptCards.set(attempt.reference, node); return node;
    }));
    const usage = capture.observation.usage;
    get("wb-billing").textContent = usage.length ? `${usage.reduce((sum, row) => sum + row.reservedMicrousd, 0)} micro-USD reserved across ${usage.length} retained accounting records. Reservations are host budget limits. Individual Gateway charges, when available, appear below.` : "No recorded accounting is available. Actual provider billing is unknown.";
    for (const row of capture.observation.gatewayCosts ?? []) {
      const cost = row.cost;
      const detail = cost
        ? `Gateway reports a USD ${cost.gatewayCostUsd} debit for ${cost.model}, with ${cost.tokensIn} input and ${cost.tokensOut} output tokens. ${cost.isByok ? `Its upstream list-price estimate is USD ${cost.upstreamInferenceCostUsd}; the provider invoice is unknown.` : "This retained response is not a provider attestation or an aggregate invoice."}`
        : row.status === "generation-unavailable" ? "This attempt has no retained Gateway generation identity. Its actual charge remains unknown."
        : row.status === "receipt-unavailable" ? "A generation was observed, but the execution receipt is unavailable. No charge is attributed until the identities can be reconciled."
        : "The generation is retained. Its actual charge remains unknown until an explicit owner lookup supplies a matching response.";
      attemptCards.get(row.attempt)?.append(el("h4", cost ? "Reported Gateway charge" : "Gateway charge unavailable"), el("p", detail));
    }
    get("wb-gaps").replaceChildren(...capture.gaps.map(gap => el("li", gap)));
    if (!draftDirty) { get<HTMLTextAreaElement>("wb-headline").value = capture.revision.config.headline; get<HTMLTextAreaElement>("wb-body").value = capture.revision.config.body; get<HTMLInputElement>("wb-cta").value = capture.revision.config.ctaLabel; get<HTMLSelectElement>("wb-layout").value = capture.revision.config.layout; }
    get<HTMLSelectElement>("wb-audience").value = capture.signals.audience; get<HTMLSelectElement>("wb-release").value = capture.signals.release;
    controls();
  }
  function proposal(): SurfaceProposal { return parseProposal({ contract: "algal.marketing-proposal.v1", baseRevision: capture.revisionDigest, config: { headline: get<HTMLTextAreaElement>("wb-headline").value, body: get<HTMLTextAreaElement>("wb-body").value, ctaLabel: get<HTMLInputElement>("wb-cta").value, layout: get<HTMLSelectElement>("wb-layout").value }, source: "owner", rationale: "An explicit edit in the connected owner workbench." }); }
  get("wb-form").addEventListener("input", () => { draftDirty = true; });
  root.addEventListener("compositionstart", () => { composing = true; controls(); });
  root.addEventListener("compositionend", () => { composing = false; draftDirty = true; controls(); });
  get("wb-form").addEventListener("submit", event => { event.preventDefault(); void action(() => send({ kind: "preview", proposal: proposal() })); });
  get("wb-refresh").addEventListener("click", () => { void action(async () => { await accept(await request("/api/capture")); message("Refreshed from the host. Your draft is kept."); }); });
  get("wb-freeze").addEventListener("click", () => { void action(() => { const pause = !(capture.controls.inferencePaused && capture.controls.modelActivationPaused); return send({ kind: "set-controls", controls: { ...capture.controls, inferencePaused: pause, modelActivationPaused: pause } }); }); });
  get("wb-pin").addEventListener("click", () => { void action(() => send({ kind: "set-controls", controls: { ...capture.controls, pinnedRevision: capture.controls.pinnedRevision ? null : capture.revisionDigest } })); });
  get("wb-shadow").addEventListener("click", () => { void action(async () => { const result = await request("/api/shadow", { expectedHead: capture.head, proposal: proposal() }) as { capture: unknown }; await accept(result.capture); message("Offline guardrails recorded. This does not authorize activation or claim marketing improvement."); }); });
  get("wb-signal").addEventListener("click", () => { void action(async () => {
    const values = { audience: get<HTMLSelectElement>("wb-audience").value, release: get<HTMLSelectElement>("wb-release").value };
    for (const field of ["audience", "release"] as const) if (values[field] !== capture.signals[field]) {
      const stream = `workbench-${field}`, sequence = (capture.provenance.cursors.find(c => c.source === "demo" && c.stream === stream)?.sequence ?? 0) + 1;
      const envelope = { contract: "algal.marketing-signal-envelope.v1", source: "demo", stream, sequence, event: { kind: field, value: values[field] } } as SignalEnvelope;
      await send({ kind: "signal", envelope }, await hash({ contract: "algal.marketing-signal-operation.v1", source: envelope.source, stream, sequence }));
    }
  }); });
  get("wb-export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(capture, null, 2) + "\n"], { type: "application/json" })), link = el("a"); link.href = url; link.download = "algal-component-capture.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  get<HTMLInputElement>("wb-import").addEventListener("change", () => { void action(async () => {
    const input = get<HTMLInputElement>("wb-import"), file = input.files?.[0]; input.value = ""; if (!file) return;
    if (file.size > WORKBENCH_LIMITS.captureBytes) throw new Error("Capture exceeds its byte bound.");
    const value: unknown = JSON.parse(await file.text());
    const previousConnection = connected; connected = false;
    try { await accept(value); } catch (error) { connected = previousConnection; throw error; }
    message("Opened a read-only capture. References establish content identity, not authorship or live host authority.");
  }); });
  await loadSurfaceEvaluator();
  await accept(await request(connected ? "/api/capture" : "/workbench/capture.json"));
  busy = false; controls(); root.dataset.ready = "true";
  message(connected ? "Connected to the local owner host. Commands are fenced to the displayed state." : "This recorded example is read only. Open a local host to issue the same typed commands.");
}
if (root) void start().catch(() => { root.setAttribute("aria-busy", "false"); get("wb-status").textContent = "The capture could not be opened. The static component remains available; no application state was changed."; get("wb-status").setAttribute("data-error", ""); });
// Opening an owner URL in a tab already showing this public capture is a
// same-document fragment navigation. Re-enter the authenticated startup flow.
window.addEventListener("hashchange", () => {
  const offered = new URLSearchParams(location.hash.slice(1)).get("token");
  if (root && location.hostname === "127.0.0.1" && offered && /^[a-f0-9]{64}$/.test(offered)) location.reload();
});
