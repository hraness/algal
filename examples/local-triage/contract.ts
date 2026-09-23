/** The bounded, renderer-neutral contract. Drafts are session data, never facts. */
import type { Digest } from "../../src/digest-type";
import type { JsonValue } from "../../src/values";

export const MAX_TASKS = 32;
export const MAX_STATES = 128;
export type Priority = "high" | "normal" | "low";
export type Status = "open" | "done";
export type Task = { id: string; title: string; priority: Priority; status: Status; category: string };
export type Config = { sort: "priority" | "title" | "created"; group: "none" | "status" | "priority" | "category"; allowReopen: boolean };
export type Revision = { contract: "algal.triage-revision.v1"; schemaVersion: 1 | 2; config: Config; program: JsonValue };
export type Session = { contract: "algal.triage-session.v1"; filter: "all" | Status; query: string; draft: { taskId: string | null; title: string; priority: Priority; category: string }; focusedField: "title" | "priority" | "category" | "query" | null };
export type Action = { kind: "add"; task: Task } | { kind: "edit"; taskId: string; title: string; priority: Priority; category: string } | { kind: "complete" | "reopen"; taskId: string };
export type Command = { contract: "algal.triage-command.v1"; expectedHead: Digest; operation: Digest; action: Action };
export type Proposal = { contract: "algal.triage-proposal.v1"; expectedHead: Digest; config: Config; schemaVersion: 1 | 2; source: "owner" | "model"; rationale: string };
export type Evaluation = { contract: "algal.triage-evaluation.v1"; expectedHead: Digest; proposal: Digest; candidateRevision: Digest; accepted: boolean; checks: { name: string; passed: boolean }[]; receipts: Digest[] };
export type View = { kind: "triage"; title: string; ordering: string; groups: { id: string; label: string; tasks: { task: Task; actions: { kind: "edit" | "complete" | "reopen"; label: string; enabled: boolean; reason: string | null }[] }[] }[]; form: { kind: "form"; id: "task-editor"; fields: { name: "title" | "priority" | "category"; label: string; value: string; maxLength: number; options: string[] }[]; submit: { label: string; enabled: boolean; reason: string | null } }; filters: { value: "all" | Status; label: string; selected: boolean }[] };
export type Capture = { contract: "algal.triage-capture.v1"; application: string; head: Digest; revision: Digest; memory: Digest; sequence: number; definition: Revision; tasks: Task[]; session: Session; view: View; capacity: { tasks: number; states: number }; evidence: Digest[]; why: { taskId: string; reason: string }[] };
export type SessionRecord = { contract: "algal.triage-session-record.v1"; application: string; capturedHead: Digest; capturedRevision: Digest; schemaVersion: 1 | 2; session: Session };
export type SessionLoad = { record: SessionRecord | null; reference: Digest | null; status: "current" | "stale" | "missing"; reason: string | null };
export type FieldConflict = { taskId: string; field: "title" | "priority" | "status" | "category"; base: string | null; local: string; incoming: string };
export type MergeReview = { contract: "algal.triage-merge.v1"; expectedHead: Digest; source: Digest; tasks: Task[]; conflicts: FieldConflict[] };
export type Transfer = { contract: "algal.triage-transfer.v1"; claim: "portable-data-and-pure-replay"; application: string; head: Digest; states: Digest[]; records: { kind: "value" | "manifest" | "receipt"; reference: Digest; value: JsonValue }[] };

export const DEFAULT_CONFIG: Config = { sort: "priority", group: "status", allowReopen: true };
export const DEFAULT_SESSION: Session = { contract: "algal.triage-session.v1", filter: "all", query: "", draft: { taskId: null, title: "", priority: "normal", category: "inbox" }, focusedField: null };

export function object(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error("Expected triage object");
  if (Object.keys(input).sort().join("\0") !== [...keys].sort().join("\0")) throw new Error("Unknown or missing triage field");
  return input as Record<string, unknown>;
}
export function text(input: unknown, max: number, empty = false): string {
  if (typeof input !== "string" || input.length > max || (!empty && !input.trim()) || /[\uD800-\uDFFF]/u.test(input) || Array.from(input).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error("Invalid triage text");
  return input;
}
export function choice<T extends string>(input: unknown, choices: readonly T[]): T {
  if (typeof input !== "string" || !choices.includes(input as T)) throw new Error("Invalid triage choice");
  return input as T;
}
export function id(input: unknown): string { const s = text(input, 48); if (!/^[a-z][a-z0-9-]*$/.test(s)) throw new Error("Invalid triage ID"); return s; }
export function reference(input: unknown): Digest { if (typeof input !== "string" || !/^sha256:[a-f0-9]{64}$/.test(input)) throw new Error("Invalid triage reference"); return input as Digest; }
export function parseConfig(input: unknown): Config {
  const v = object(input, ["sort", "group", "allowReopen"]);
  if (typeof v.allowReopen !== "boolean") throw new Error("Invalid triage workflow");
  return { sort: choice(v.sort, ["priority", "title", "created"]), group: choice(v.group, ["none", "status", "priority", "category"]), allowReopen: v.allowReopen };
}
export function parseTask(input: unknown): Task { const v = object(input, ["id", "title", "priority", "status", "category"]); return { id: id(v.id), title: text(v.title, 120), priority: choice(v.priority, ["high", "normal", "low"]), status: choice(v.status, ["open", "done"]), category: text(v.category, 24) }; }
export function parseTasks(input: unknown): Task[] {
  if (!Array.isArray(input) || input.length > MAX_TASKS) throw new Error("Task capacity exceeded");
  const tasks = input.map(parseTask); if (new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error("Duplicate task ID"); return tasks;
}
export function parseSession(input: unknown): Session {
  const v = object(input, ["contract", "filter", "query", "draft", "focusedField"]), d = object(v.draft, ["taskId", "title", "priority", "category"]);
  if (v.contract !== DEFAULT_SESSION.contract) throw new Error("Invalid triage session");
  return { contract: DEFAULT_SESSION.contract, filter: choice(v.filter, ["all", "open", "done"]), query: text(v.query, 120, true), draft: { taskId: d.taskId === null ? null : id(d.taskId), title: text(d.title, 120, true), priority: choice(d.priority, ["high", "normal", "low"]), category: text(d.category, 24, true) }, focusedField: v.focusedField === null ? null : choice(v.focusedField, ["title", "priority", "category", "query"] as const) };
}
export function parseAction(input: unknown): Action {
  if (!input || typeof input !== "object") throw new Error("Invalid action");
  const kind = (input as { kind?: unknown }).kind;
  if (kind === "add") { const v = object(input, ["kind", "task"]); const task = parseTask(v.task); if (task.status !== "open") throw new Error("New tasks start open"); return { kind, task }; }
  if (kind === "edit") { const v = object(input, ["kind", "taskId", "title", "priority", "category"]); return { kind, taskId: id(v.taskId), title: text(v.title, 120), priority: choice(v.priority, ["high", "normal", "low"]), category: text(v.category, 24) }; }
  if (kind === "complete" || kind === "reopen") { const v = object(input, ["kind", "taskId"]); return { kind, taskId: id(v.taskId) }; }
  throw new Error("Unknown triage action");
}
export function parseCommand(input: unknown): Command { const v = object(input, ["contract", "expectedHead", "operation", "action"]); if (v.contract !== "algal.triage-command.v1") throw new Error("Invalid command contract"); return { contract: v.contract, expectedHead: reference(v.expectedHead), operation: reference(v.operation), action: parseAction(v.action) }; }
export function parseProposal(input: unknown): Proposal { const v = object(input, ["contract", "expectedHead", "config", "schemaVersion", "source", "rationale"]); if (v.contract !== "algal.triage-proposal.v1" || (v.schemaVersion !== 1 && v.schemaVersion !== 2)) throw new Error("Invalid proposal contract/schema"); return { contract: v.contract, expectedHead: reference(v.expectedHead), config: parseConfig(v.config), schemaVersion: v.schemaVersion, source: choice(v.source, ["owner", "model"]), rationale: text(v.rationale, 768) }; }
