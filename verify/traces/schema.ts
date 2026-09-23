/** Test-only portable histories. These identifiers are not product contracts. */
import { array, boolean, digest, member, natural, record, requireThat, string } from "../lib/schema";
import { hashJson, stableJson } from "../lib/files";

export const LIMITS = { histories: 64, commands: 24, payloadBytes: 256, transcriptBytes: 1_048_576, events: 4096 } as const;
export type Value = null | boolean | number | string | Value[] | { [key: string]: Value };
export type Key = 0 | 1 | 2 | 3;
export type Name = 0 | 1;
export const FS_STEPS = ["mkdir", "write-temp", "file-sync", "link", "replace", "dir-sync", "unlink-temp", "unlink-pending", "create-lock", "unlink-lock"] as const;
export const APP_POINTS = ["selected", "admitted", "prepared", "head-published"] as const;
export type Fault = { site: "fs"; step: typeof FS_STEPS[number]; phase: "before" | "after"; occurrence: number; mode: "error" | "cancel" }
  | { site: "application"; point: typeof APP_POINTS[number]; mode: "error" | "cancel" };
export type Target = { kind: "value"; value: Value } | { kind: "effect" | "slot"; key: Key }
  | { kind: "mailbox-pending" | "mailbox-consumed" | "mailbox-message"; box: Name; key: Key }
  | { kind: "mailbox-lock"; box: Name } | { kind: "application-head"; app: Name }
  | { kind: "application-memory"; memory: Name };
export type ObservationTarget = Target | { kind: "mailbox-config"; box: Name } | { kind: "application-history"; app: Name };
export type Action = { kind: "store-put"; value: Value } | { kind: "store-get"; value: Value }
  | { kind: "effect-put"; key: Key; value: Value } | { kind: "slot-set"; key: Key; value: Value }
  | { kind: "effect-get"; key: Key } | { kind: "slot-get"; key: Key }
  | { kind: "mailbox-create"; box: Name; capacity: 1 | 2 }
  | { kind: "mailbox-send"; box: Name; key: Key; value: Value }
  | { kind: "mailbox-receive" | "mailbox-pending"; box: Name }
  | { kind: "mailbox-revoke"; box: Name; right: "send" | "receive" }
  | { kind: "application-create"; app: Name; key: Key; memory: Name | "missing" }
  | { kind: "application-commit"; app: Name; key: Key; memory: Name | "missing"; head: number | null | "missing" }
  | { kind: "application-inspect"; app: Name }
  | { kind: "restart" }
  | { kind: "tamper"; target: Target; mode: "corrupt" | "remove" };
export type Command = { id: number; action: Action; fault: Fault | null };
export type History = { contract: "algal.verification-history.v1"; seed: number; commands: Command[] };
export type Outcome = { status: "ok"; value: Value } | { status: "error"; code: string; message: string; wake: string[]; uncertain: boolean };
export type Event = { kind: "fs"; step: typeof FS_STEPS[number]; phase: "before" | "after"; path: string; target: string | null; inode: string | null }
  | { kind: "application"; point: typeof APP_POINTS[number] };
export type Observation = { target: ObservationTarget; outcome: Outcome };
export type FileObservation = { target: Target; exists: boolean; bytes: number; sha256: string | null };
export type Snapshot = { observations: Observation[]; files: FileObservation[] };
export type Step = { id: number; outcome: Outcome; events: Event[]; faultTriggered: boolean; after: Snapshot };
export type Trace = { contract: "algal.verification-trace.v1"; runtime: "bun" | "native"; historyDigest: string; initial: Snapshot; steps: Step[]; authorities: { alias: string; handle: string }[] };

function bounded(value: unknown, max: number, label: string): number { const n = natural(value, label); requireThat(n <= max, `${label}: bound`); return n; }
function key(value: unknown): Key { return bounded(value, 3, "key") as Key; }
function name(value: unknown): Name { return bounded(value, 1, "name") as Name; }
function scalar(text: string): boolean {
  for (const c of text) { const n = c.codePointAt(0)!; if (n >= 0xd800 && n <= 0xdfff) return false; }
  return true;
}
/** Deliberately small portable JSON domain: scalar Unicode and safe integers. */
export function value(raw: unknown, maxBytes: number = LIMITS.payloadBytes): Value {
  let nodes = 0;
  function walk(raw: unknown, depth: number): Value {
    requireThat(++nodes <= 1024 && depth <= 12, "trace JSON node/depth bound");
    if (raw === null || typeof raw === "boolean") return raw;
    if (typeof raw === "string") { requireThat(scalar(raw), "trace JSON requires scalar Unicode"); return raw; }
    if (typeof raw === "number") { requireThat(Number.isSafeInteger(raw), "trace JSON requires safe integer numbers"); return raw; }
    if (Array.isArray(raw)) return raw.map(v => walk(v, depth + 1));
    requireThat(raw !== null && typeof raw === "object" && [null, Object.prototype].includes(Object.getPrototypeOf(raw)), "trace JSON requires plain values");
    const out: { [key: string]: Value } = Object.create(null);
    for (const [k, v] of Object.entries(raw)) { requireThat(scalar(k), "trace JSON key requires scalar Unicode"); out[k] = walk(v, depth + 1); }
    return out;
  }
  const result = walk(raw, 0);
  requireThat(Buffer.byteLength(stableJson(result)) <= maxBytes, "trace JSON byte bound");
  return result;
}
export function parseTarget(raw: unknown, observation = false): ObservationTarget {
  requireThat(raw !== null && typeof raw === "object" && !Array.isArray(raw), "target object");
  const kind = (raw as { kind?: unknown }).kind;
  if (kind === "value") { const r = record(raw, ["kind", "value"], "target"); return { kind, value: value(r.value) }; }
  if (kind === "effect" || kind === "slot") { const r = record(raw, ["kind", "key"], "target"); return { kind, key: key(r.key) }; }
  if (kind === "mailbox-pending" || kind === "mailbox-consumed" || kind === "mailbox-message") { const r = record(raw, ["kind", "box", "key"], "target"); return { kind, box: name(r.box), key: key(r.key) }; }
  if (kind === "mailbox-lock" || observation && kind === "mailbox-config") { const r = record(raw, ["kind", "box"], "target"); return { kind, box: name(r.box) } as ObservationTarget; }
  if (kind === "application-head" || observation && kind === "application-history") { const r = record(raw, ["kind", "app"], "target"); return { kind, app: name(r.app) } as ObservationTarget; }
  if (kind === "application-memory") { const r = record(raw, ["kind", "memory"], "target"); return { kind, memory: name(r.memory) }; }
  throw new Error("unknown trace target");
}
export function parseFault(raw: unknown): Fault | null {
  if (raw === null) return null;
  requireThat(raw !== null && typeof raw === "object", "fault object");
  if ((raw as { site?: unknown }).site === "fs") {
    const r = record(raw, ["site", "step", "phase", "occurrence", "mode"], "fault");
    const occurrence = bounded(r.occurrence, 256, "fault occurrence"); requireThat(occurrence > 0, "fault occurrence starts at one");
    return { site: "fs", step: member(r.step, FS_STEPS, "fault step"), phase: member(r.phase, ["before", "after"], "fault phase"), occurrence, mode: member(r.mode, ["error", "cancel"], "fault mode") };
  }
  const r = record(raw, ["site", "point", "mode"], "fault"); requireThat(r.site === "application", "fault site");
  return { site: "application", point: member(r.point, APP_POINTS, "fault point"), mode: member(r.mode, ["error", "cancel"], "fault mode") };
}
export function parseAction(raw: unknown): Action {
  requireThat(raw !== null && typeof raw === "object" && !Array.isArray(raw), "action object");
  const kind = (raw as { kind?: unknown }).kind;
  if (kind === "store-put" || kind === "store-get") { const r = record(raw, ["kind", "value"], "action"); return { kind, value: value(r.value) }; }
  if (kind === "effect-put" || kind === "slot-set") { const r = record(raw, ["kind", "key", "value"], "action"); return { kind, key: key(r.key), value: value(r.value) }; }
  if (kind === "effect-get" || kind === "slot-get") { const r = record(raw, ["kind", "key"], "action"); return { kind, key: key(r.key) }; }
  if (kind === "mailbox-create") { const r = record(raw, ["kind", "box", "capacity"], "action"); const capacity = bounded(r.capacity, 2, "mailbox capacity"); requireThat(capacity > 0, "mailbox capacity"); return { kind, box: name(r.box), capacity: capacity as 1 | 2 }; }
  if (kind === "mailbox-send") { const r = record(raw, ["kind", "box", "key", "value"], "action"); return { kind, box: name(r.box), key: key(r.key), value: value(r.value) }; }
  if (kind === "mailbox-receive" || kind === "mailbox-pending") { const r = record(raw, ["kind", "box"], "action"); return { kind, box: name(r.box) }; }
  if (kind === "mailbox-revoke") { const r = record(raw, ["kind", "box", "right"], "action"); return { kind, box: name(r.box), right: member(r.right, ["send", "receive"], "right") }; }
  if (kind === "application-create" || kind === "application-commit") {
    const r = record(raw, ["kind", "app", "key", "memory", ...(kind === "application-commit" ? ["head"] : [])], "action");
    const common = { app: name(r.app), key: key(r.key), memory: r.memory === "missing" ? "missing" as const : name(r.memory) };
    return kind === "application-create" ? { kind, ...common } : { kind, ...common, head: r.head === null || r.head === "missing" ? r.head : bounded(r.head, LIMITS.commands - 1, "head reference") };
  }
  if (kind === "application-inspect") { const r = record(raw, ["kind", "app"], "action"); return { kind, app: name(r.app) }; }
  if (kind === "restart") { record(raw, ["kind"], "action"); return { kind }; }
  if (kind === "tamper") { const r = record(raw, ["kind", "target", "mode"], "action"); return { kind, target: parseTarget(r.target) as Target, mode: member(r.mode, ["corrupt", "remove"], "tamper mode") }; }
  throw new Error("unknown trace command");
}
export function parseHistory(raw: unknown): History {
  const r = record(raw, ["contract", "seed", "commands"], "history"); requireThat(r.contract === "algal.verification-history.v1", "history contract");
  const commands = array(r.commands, "commands", 1, LIMITS.commands).map((raw, id) => {
    const c = record(raw, ["id", "action", "fault"], "command"); requireThat(c.id === id, "command IDs must be contiguous array indices");
    const action = parseAction(c.action), fault = parseFault(c.fault);
    if (action.kind === "application-commit" && typeof action.head === "number") requireThat(action.head < id, "head reference must precede command");
    requireThat(fault === null || !["restart", "tamper"].includes(action.kind), "cannot inject a fault into harness administration");
    return { id, action, fault };
  });
  return { contract: "algal.verification-history.v1", seed: bounded(r.seed, 0xffff_ffff, "seed"), commands };
}
export function parseOutcome(raw: unknown): Outcome {
  requireThat(raw !== null && typeof raw === "object", "outcome object");
  if ((raw as { status?: unknown }).status === "ok") { const r = record(raw, ["status", "value"], "outcome"); return { status: "ok", value: value(r.value, 32_768) }; }
  const r = record(raw, ["status", "code", "message", "wake", "uncertain"], "outcome"); requireThat(r.status === "error", "outcome status");
  const wake = array(r.wake, "wake", 0, 4).map(v => string(v, "wake alias", 64));
  requireThat(wake.every(v => /^box[01]:(send|receive)$/.test(v)) && new Set(wake).size === wake.length, "invalid wake aliases");
  return { status: "error", code: string(r.code, "error code", 64), message: string(r.message, "error message", 4096), wake, uncertain: boolean(r.uncertain, "error uncertainty") };
}
function parseSnapshot(raw: unknown): Snapshot {
  const r = record(raw, ["observations", "files"], "snapshot");
  const observations = array(r.observations, "observations", 1, 128).map(raw => { const r = record(raw, ["target", "outcome"], "observation"); return { target: parseTarget(r.target, true), outcome: parseOutcome(r.outcome) }; });
  const files = array(r.files, "files", 1, 128).map(raw => {
    const f = record(raw, ["target", "exists", "bytes", "sha256"], "file observation"), exists = boolean(f.exists, "file exists"), bytes = bounded(f.bytes, 1_048_576, "file bytes");
    requireThat(exists || bytes === 0 && f.sha256 === null, "absent file must not claim bytes");
    return { target: parseTarget(f.target) as Target, exists, bytes, sha256: exists ? digest(f.sha256, "file hash") : null };
  });
  for (const list of [observations, files]) requireThat(new Set(list.map(o => stableJson(o.target))).size === list.length, "duplicate observation target");
  return { observations, files };
}
function logicalPath(raw: unknown): string {
  const path = string(raw, "trace path", 1024);
  requireThat(path === "." || /^@ancestor\/(?:[1-9]\d{0,2})$/.test(path) || !path.startsWith("/") && !path.includes("\\") && path.split("/").every(part => part.length > 0 && part !== "." && part !== ".." && !part.startsWith("@")), "invalid logical trace path");
  return path;
}
export function parseTrace(raw: unknown, history: History): Trace {
  requireThat(Buffer.byteLength(stableJson(raw)) <= LIMITS.transcriptBytes, "trace byte bound");
  const t = record(raw, ["contract", "runtime", "historyDigest", "initial", "steps", "authorities"], "trace");
  requireThat(t.contract === "algal.verification-trace.v1" && t.historyDigest === hashJson(history), "trace/history identity mismatch");
  const steps = array(t.steps, "trace steps", history.commands.length, history.commands.length).map((raw, id) => {
    const s = record(raw, ["id", "outcome", "events", "faultTriggered", "after"], "trace step"); requireThat(s.id === id, "trace step identity mismatch");
    const events = array(s.events, "events", 0, LIMITS.events).map((raw): Event => {
      requireThat(raw !== null && typeof raw === "object", "event object");
      if ((raw as { kind?: unknown }).kind === "application") { const e = record(raw, ["kind", "point"], "event"); return { kind: "application", point: member(e.point, APP_POINTS, "application point") }; }
      const e = record(raw, ["kind", "step", "phase", "path", "target", "inode"], "event"); requireThat(e.kind === "fs", "unknown trace event kind");
      const inode = e.inode === null ? null : string(e.inode, "inode alias", 16); requireThat(inode === null || /^i(?:0|[1-9]\d{0,5})$/.test(inode), "inode alias");
      return { kind: "fs", step: member(e.step, FS_STEPS, "fs step"), phase: member(e.phase, ["before", "after"], "fs phase"), path: logicalPath(e.path), target: e.target === null ? null : logicalPath(e.target), inode };
    });
    return { id, outcome: parseOutcome(s.outcome), events, faultTriggered: boolean(s.faultTriggered, "fault triggered"), after: parseSnapshot(s.after) };
  });
  const authorities = array(t.authorities, "authorities", 0, 4).map(raw => { const a = record(raw, ["alias", "handle"], "authority"); const alias = string(a.alias, "authority alias", 64); requireThat(/^box[01]:(send|receive)$/.test(alias), "authority alias"); return { alias, handle: string(a.handle, "authority handle", 256) }; });
  requireThat(new Set(authorities.map(a => a.alias)).size === authorities.length && new Set(authorities.map(a => a.handle)).size === authorities.length, "duplicate authority identity");
  return { contract: "algal.verification-trace.v1", runtime: member(t.runtime, ["bun", "native"], "trace runtime"), historyDigest: digest(t.historyDigest, "history digest"), initial: parseSnapshot(t.initial), steps, authorities };
}
