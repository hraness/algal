/** Browser-safe, closed example protocol. These values describe admitted local
 * commands; they are not authentication credentials or a new VM contract. */
import type { Digest } from "../../src/digest-type";
import { parseProposal, parseRevision, parseSignalEvent, parseSignals, parseView, type SurfaceProposal, type SurfaceRevision, type SurfaceSignalEvent, type SurfaceSignals, type SurfaceView } from "./surface";

export const WORKBENCH_LIMITS = Object.freeze({ states: 64, streams: 16, journal: 128, recordBytes: 32_768, captureBytes: 2_097_152 });
export type WorkbenchControls = { inferencePaused: boolean; modelActivationPaused: boolean; pinnedRevision: Digest | null };
export const DEFAULT_CONTROLS: Readonly<WorkbenchControls> = Object.freeze({ inferencePaused: false, modelActivationPaused: false, pinnedRevision: null });
export type SignalEnvelope = { contract: "algal.marketing-signal-envelope.v1"; source: "owner" | "environment" | "demo"; stream: string; sequence: number; event: SurfaceSignalEvent };
export type SignalCursor = { source: SignalEnvelope["source"]; stream: string; sequence: number; envelope: Digest };
export type CommandBase = { contract: "algal.marketing-command.v1"; actor: "human" | "agent"; operation: Digest; expectedHead: Digest; expectedControls: Digest };
export type WorkbenchCommand = CommandBase & (
  | { kind: "preview"; proposal: SurfaceProposal }
  | { kind: "activate"; preview: Digest }
  | { kind: "signal"; envelope: SignalEnvelope }
  | { kind: "restore"; targetState: Digest }
  | { kind: "set-controls"; controls: WorkbenchControls }
);
export type WorkbenchAction = { kind: WorkbenchCommand["kind"] | "infer"; allowed: boolean; reason: string | null };
export type WorkbenchPreview = { reference: Digest; parentState: Digest; proposal: SurfaceProposal; candidateRevision: Digest; receipt: Digest; view: SurfaceView };
export type AttemptAdmission = { operation: Digest; expectedHead: Digest; expectedControls: Digest; manifest: Digest; backend: "gateway" | "local" | "apple"; model: string };
export type AttemptSettlement = { status: "completed" | "failed" | "uncertain"; proposal: SurfaceProposal | null; receipt: Digest | null; accounting: Digest | null; reason: string | null };
export type WorkbenchUsage = { accounting: Digest; configuration: Digest; calls: number; completedCalls: number; reservedMicrousd: number; inputTokens: number | null; outputTokens: number | null; billing: "host-reserved" };
export type WorkbenchAttempt = { reference: Digest; admission: AttemptAdmission; settlement: AttemptSettlement | null; settlements: { reference: Digest; outcome: AttemptSettlement; reconciled: boolean }[] };
export type ShadowRecord = { operation: Digest; parentState: Digest; proposal: SurfaceProposal; accepted: boolean; policy: Digest; evidence: Digest; reason: string };
export type WorkbenchShadow = ShadowRecord & { reference: Digest };
export type WorkbenchHistory = { head: Digest; sequence: number; kind: string; applicationRevision: Digest; memory: Digest; evidence: Digest[] };
export type NodeExplanation = { node: string; revision: Digest; signalFields: ("audience" | "release")[]; configFields: ("headline" | "body" | "ctaLabel" | "layout")[]; receipt: Digest };
export type WorkbenchCapture = {
  contract: "algal.marketing-capture.v1"; application: "malleable-marketing"; head: Digest; sequence: number;
  revision: SurfaceRevision; revisionDigest: Digest; applicationRevision: Digest; signals: SurfaceSignals; view: SurfaceView;
  provenance: { memory: Digest; receipt: Digest; cursors: SignalCursor[]; nodes: NodeExplanation[] };
  controls: WorkbenchControls; controlsRef: Digest; history: WorkbenchHistory[];
  previews: WorkbenchPreview[]; attempts: WorkbenchAttempt[]; shadows: WorkbenchShadow[];
  observation: { journalEntries: number; pendingAttempts: number; completedAttempts: number; failedAttempts: number; uncertainAttempts: number; actualCostMicrousd: null; usage: WorkbenchUsage[] };
  actions: WorkbenchAction[]; gaps: string[];
};
export type WorkbenchResult = { capture: WorkbenchCapture; preview: WorkbenchPreview | null };

export function workbenchObject(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error("Expected plain workbench object");
  if (Object.keys(input).sort().join("\0") !== [...keys].sort().join("\0")) throw new Error("Unknown or missing workbench field");
  return input as Record<string, unknown>;
}
export function workbenchRef(input: unknown): Digest {
  if (typeof input !== "string" || !/^sha256:[a-f0-9]{64}$/.test(input)) throw new Error("Invalid workbench reference");
  return input as Digest;
}
export function workbenchText(input: unknown, max = 512): string {
  if (typeof input !== "string" || !input.trim() || input.length > max || /[\uD800-\uDFFF]/u.test(input) || Array.from(input).some(char => { const code = char.charCodeAt(0); return code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13); })) throw new Error("Invalid workbench text");
  return input;
}
function int(input: unknown, max: number, min = 0): number { if (!Number.isSafeInteger(input) || (input as number) < min || (input as number) > max) throw new Error("Workbench count bound exceeded"); return input as number; }
function bool(input: unknown): boolean { if (typeof input !== "boolean") throw new Error("Invalid workbench boolean"); return input; }
function list<T>(input: unknown, max: number, parse: (v: unknown) => T): T[] { if (!Array.isArray(input) || input.length > max) throw new Error("Workbench list bound exceeded"); return input.map(parse); }
function choice<T extends string>(input: unknown, values: readonly T[]): T { if (typeof input !== "string" || !values.includes(input as T)) throw new Error("Invalid workbench choice"); return input as T; }
export function boundWorkbench(input: unknown, bytes: number = WORKBENCH_LIMITS.recordBytes): void {
  let nodes = 0;
  const visit = (value: unknown, depth: number): void => { if (++nodes > 100_000 || depth > 32) throw new Error("Workbench structural bound exceeded"); if (value && typeof value === "object") { if (Object.keys(value).length > 1024) throw new Error("Workbench collection bound exceeded"); for (const child of Object.values(value)) visit(child, depth + 1); } };
  visit(input, 0);
  if (new TextEncoder().encode(JSON.stringify(input)).length > bytes) throw new Error("Workbench byte bound exceeded");
}
export function parseControls(input: unknown): WorkbenchControls { const v = workbenchObject(input, ["inferencePaused", "modelActivationPaused", "pinnedRevision"]); return { inferencePaused: bool(v.inferencePaused), modelActivationPaused: bool(v.modelActivationPaused), pinnedRevision: v.pinnedRevision === null ? null : workbenchRef(v.pinnedRevision) }; }
export function parseSignalEnvelope(input: unknown): SignalEnvelope {
  const v = workbenchObject(input, ["contract", "source", "stream", "sequence", "event"]);
  if (v.contract !== "algal.marketing-signal-envelope.v1") throw new Error("Invalid signal envelope contract");
  const stream = workbenchText(v.stream, 64); if (!/^[a-z][a-z0-9-]*$/.test(stream)) throw new Error("Invalid signal stream");
  return { contract: v.contract, source: choice(v.source, ["owner", "environment", "demo"]), stream, sequence: int(v.sequence, 1_000_000, 1), event: parseSignalEvent(v.event) };
}
export function parseSignalCursors(input: unknown): SignalCursor[] {
  const rows = list(input, WORKBENCH_LIMITS.streams, raw => { const v = workbenchObject(raw, ["source", "stream", "sequence", "envelope"]); const e = parseSignalEnvelope({ contract: "algal.marketing-signal-envelope.v1", source: v.source, stream: v.stream, sequence: v.sequence, event: { kind: "release", value: "preview" } }); return { source: e.source, stream: e.stream, sequence: e.sequence, envelope: workbenchRef(v.envelope) }; });
  const ids = rows.map(row => `${row.source}/${row.stream}`); if (new Set(ids).size !== rows.length || ids.join("\0") !== [...ids].sort().join("\0")) throw new Error("Signal cursors must be unique and sorted"); return rows;
}
export function parseWorkbenchCommand(input: unknown): WorkbenchCommand {
  boundWorkbench(input); const kind = (input as { kind?: unknown } | null)?.kind;
  const field = kind === "preview" ? "proposal" : kind === "activate" ? "preview" : kind === "signal" ? "envelope" : kind === "restore" ? "targetState" : "controls";
  const v = workbenchObject(input, ["contract", "actor", "operation", "expectedHead", "expectedControls", "kind", field]);
  if (v.contract !== "algal.marketing-command.v1") throw new Error("Invalid workbench command contract");
  const base: CommandBase = { contract: v.contract, actor: choice(v.actor, ["human", "agent"]), operation: workbenchRef(v.operation), expectedHead: workbenchRef(v.expectedHead), expectedControls: workbenchRef(v.expectedControls) };
  if (kind === "preview") return { ...base, kind, proposal: parseProposal(v.proposal) };
  if (kind === "activate") return { ...base, kind, preview: workbenchRef(v.preview) };
  if (kind === "signal") return { ...base, kind, envelope: parseSignalEnvelope(v.envelope) };
  if (kind === "restore") return { ...base, kind, targetState: workbenchRef(v.targetState) };
  if (kind === "set-controls") return { ...base, kind, controls: parseControls(v.controls) };
  throw new Error("Unknown workbench command");
}
export function parseAttemptAdmission(input: unknown): AttemptAdmission { const v = workbenchObject(input, ["operation", "expectedHead", "expectedControls", "manifest", "backend", "model"]); return { operation: workbenchRef(v.operation), expectedHead: workbenchRef(v.expectedHead), expectedControls: workbenchRef(v.expectedControls), manifest: workbenchRef(v.manifest), backend: choice(v.backend, ["gateway", "local", "apple"]), model: workbenchText(v.model, 128) }; }
export function parseAttemptSettlement(input: unknown): AttemptSettlement {
  boundWorkbench(input); const v = workbenchObject(input, ["status", "proposal", "receipt", "accounting", "reason"]);
  const value: AttemptSettlement = { status: choice(v.status, ["completed", "failed", "uncertain"]), proposal: v.proposal === null ? null : parseProposal(v.proposal), receipt: v.receipt === null ? null : workbenchRef(v.receipt), accounting: v.accounting === null ? null : workbenchRef(v.accounting), reason: v.reason === null ? null : workbenchText(v.reason) };
  if (value.status === "completed" && (!value.proposal || !value.receipt || !value.accounting || value.reason !== null)) throw new Error("Completed attempt requires proposal, receipt and accounting");
  if (value.status !== "completed" && (!value.reason || value.proposal !== null)) throw new Error("Failed or uncertain attempt requires a reason, no proposal");
  return value;
}
export function parseShadowRecord(input: unknown): ShadowRecord { boundWorkbench(input); const v = workbenchObject(input, ["operation", "parentState", "proposal", "accepted", "policy", "evidence", "reason"]); return { operation: workbenchRef(v.operation), parentState: workbenchRef(v.parentState), proposal: parseProposal(v.proposal), accepted: bool(v.accepted), policy: workbenchRef(v.policy), evidence: workbenchRef(v.evidence), reason: workbenchText(v.reason) }; }
export function parseWorkbenchPreview(input: unknown): WorkbenchPreview { const v = workbenchObject(input, ["reference", "parentState", "proposal", "candidateRevision", "receipt", "view"]); return { reference: workbenchRef(v.reference), parentState: workbenchRef(v.parentState), proposal: parseProposal(v.proposal), candidateRevision: workbenchRef(v.candidateRevision), receipt: workbenchRef(v.receipt), view: parseView(v.view) }; }
export function parseWorkbenchCapture(input: unknown): WorkbenchCapture {
  boundWorkbench(input, WORKBENCH_LIMITS.captureBytes);
  const v = workbenchObject(input, ["contract", "application", "head", "sequence", "revision", "revisionDigest", "applicationRevision", "signals", "view", "provenance", "controls", "controlsRef", "history", "previews", "attempts", "shadows", "observation", "actions", "gaps"]);
  if (v.contract !== "algal.marketing-capture.v1" || v.application !== "malleable-marketing") throw new Error("Invalid workbench capture");
  const p = workbenchObject(v.provenance, ["memory", "receipt", "cursors", "nodes"]), o = workbenchObject(v.observation, ["journalEntries", "pendingAttempts", "completedAttempts", "failedAttempts", "uncertainAttempts", "actualCostMicrousd", "usage"]);
  if (o.actualCostMicrousd !== null) throw new Error("Actual billing is unknown");
  const result: WorkbenchCapture = { contract: v.contract, application: v.application, head: workbenchRef(v.head), sequence: int(v.sequence, 63), revision: parseRevision(v.revision), revisionDigest: workbenchRef(v.revisionDigest), applicationRevision: workbenchRef(v.applicationRevision), signals: parseSignals(v.signals), view: parseView(v.view),
    provenance: { memory: workbenchRef(p.memory), receipt: workbenchRef(p.receipt), cursors: parseSignalCursors(p.cursors), nodes: list(p.nodes, 32, raw => { const n = workbenchObject(raw, ["node", "revision", "signalFields", "configFields", "receipt"]); return { node: workbenchText(n.node, 64), revision: workbenchRef(n.revision), signalFields: list(n.signalFields, 2, x => choice(x, ["audience", "release"])), configFields: list(n.configFields, 4, x => choice(x, ["headline", "body", "ctaLabel", "layout"])), receipt: workbenchRef(n.receipt) }; }) }, controls: parseControls(v.controls), controlsRef: workbenchRef(v.controlsRef),
    history: list(v.history, 64, raw => { const h = workbenchObject(raw, ["head", "sequence", "kind", "applicationRevision", "memory", "evidence"]); return { head: workbenchRef(h.head), sequence: int(h.sequence, 63), kind: choice(h.kind, ["create", "memory", "activate", "restore"]), applicationRevision: workbenchRef(h.applicationRevision), memory: workbenchRef(h.memory), evidence: list(h.evidence, 1, workbenchRef) }; }),
    previews: list(v.previews, 128, parseWorkbenchPreview), attempts: list(v.attempts, 128, raw => { const a = workbenchObject(raw, ["reference", "admission", "settlement", "settlements"]); return { reference: workbenchRef(a.reference), admission: parseAttemptAdmission(a.admission), settlement: a.settlement === null ? null : parseAttemptSettlement(a.settlement), settlements: list(a.settlements, 2, raw => { const e = workbenchObject(raw, ["reference", "outcome", "reconciled"]); return { reference: workbenchRef(e.reference), outcome: parseAttemptSettlement(e.outcome), reconciled: bool(e.reconciled) }; }) }; }), shadows: list(v.shadows, 128, raw => { const s = workbenchObject(raw, ["reference", "operation", "parentState", "proposal", "accepted", "policy", "evidence", "reason"]); const { reference, ...rest } = s; return { reference: workbenchRef(reference), ...parseShadowRecord(rest) }; }),
    observation: { journalEntries: int(o.journalEntries, 128), pendingAttempts: int(o.pendingAttempts, 128), completedAttempts: int(o.completedAttempts, 128), failedAttempts: int(o.failedAttempts, 128), uncertainAttempts: int(o.uncertainAttempts, 128), actualCostMicrousd: null, usage: list(o.usage, 128, raw => { const u = workbenchObject(raw, ["accounting", "configuration", "calls", "completedCalls", "reservedMicrousd", "inputTokens", "outputTokens", "billing"]); if (u.billing !== "host-reserved") throw new Error("Invalid usage truth class"); return { accounting: workbenchRef(u.accounting), configuration: workbenchRef(u.configuration), calls: int(u.calls, 64), completedCalls: int(u.completedCalls, 64), reservedMicrousd: int(u.reservedMicrousd, 1_000_000_000), inputTokens: u.inputTokens === null ? null : int(u.inputTokens, 64_000_000_000), outputTokens: u.outputTokens === null ? null : int(u.outputTokens, 64_000_000_000), billing: u.billing }; }) },
    actions: list(v.actions, 6, raw => { const a = workbenchObject(raw, ["kind", "allowed", "reason"]); const allowed = bool(a.allowed), reason = a.reason === null ? null : workbenchText(a.reason); if (allowed !== (reason === null)) throw new Error("Action availability reason mismatch"); return { kind: choice(a.kind, ["preview", "activate", "signal", "restore", "set-controls", "infer"]), allowed, reason }; }), gaps: list(v.gaps, 16, x => workbenchText(x)),
  };
  if (result.history.length !== result.sequence + 1 || result.history.at(-1)?.head !== result.head || result.history.some((row, i) => row.sequence !== i)) throw new Error("Capture history/head mismatch");
  const terminal = result.history.at(-1)!;
  if (terminal.applicationRevision !== result.applicationRevision || terminal.memory !== result.provenance.memory) throw new Error("Capture terminal provenance mismatch");
  const ids: string[] = [];
  const visit = (node: SurfaceView | SurfaceView["children"][number]): void => { ids.push(node.id); if (node.kind === "stack") node.children.forEach(visit); }; visit(result.view);
  if (ids.length !== 6 || result.provenance.nodes.length !== ids.length || new Set(result.provenance.nodes.map(row => row.node)).size !== ids.length || result.provenance.nodes.some(row => !ids.includes(row.node) || row.revision !== result.revisionDigest || row.receipt !== result.provenance.receipt)) throw new Error("Capture node provenance mismatch");
  if (result.actions.length !== 6 || new Set(result.actions.map(row => row.kind)).size !== 6) throw new Error("Capture action set mismatch");
  for (const attempt of result.attempts) {
    if ((attempt.settlement === null) !== (attempt.settlements.length === 0) || (attempt.settlements.length === 2 && (attempt.settlements[0]!.outcome.status !== "uncertain" || !attempt.settlements[1]!.reconciled || attempt.settlements[1]!.outcome.status !== "completed")) || attempt.settlements[0]?.reconciled) throw new Error("Capture settlement history mismatch");
    if (attempt.settlement !== null && JSON.stringify(attempt.settlement) !== JSON.stringify(attempt.settlements.at(-1)!.outcome)) throw new Error("Capture latest settlement mismatch");
  }
  const observed = result.observation;
  if (observed.pendingAttempts !== result.attempts.filter(row => row.settlement === null).length || observed.completedAttempts !== result.attempts.filter(row => row.settlement?.status === "completed").length || observed.failedAttempts !== result.attempts.filter(row => row.settlement?.status === "failed").length || observed.uncertainAttempts !== result.attempts.filter(row => row.settlement?.status === "uncertain").length) throw new Error("Capture observed totals mismatch");
  return result;
}
