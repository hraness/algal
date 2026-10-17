import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { checkProgram } from "./expr";
import { EventLoopContractError, type EventLoopCode } from "./event-loop-contract";
import { snapshotEventLoopValue } from "./event-loop-structure";

// A behavior-only, pre-execution projection. The trace summary in
// event-loop-summary.ts counts claims made after a delivery instead.
type Field = "contract" | "behavior" | "limits" | "events" | "actors" | "digest" | "id" |
  "revision" | "sourceDigest" | "kind" | "fields" | "name" | "type" | "initial" | "program" |
  "maxEventBytes" | "maxStateBytes" | "maxOutputEvents" | "maxTransitionFuel" | "maxMailboxDepth" |
  "state" | "transitions" | "payload" | "on" | "when" | "writes" | "outputs" | "result" |
  "path" | "value" | "target" | "event" | "key" | "request";
type Row = Record<Field, JsonValue> & Record<string, JsonValue>;
const bytes = (s: string): number => Buffer.byteLength(s, "utf8");
const hash = (v: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(v)).digest("hex")}`;
function fail(code: EventLoopCode): never { throw new EventLoopContractError(code); }
const identifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha = /^sha256:[0-9a-f]{64}$/;
function row(v: JsonValue, keys: readonly string[]): Row {
  if (v === null || typeof v !== "object" || Array.isArray(v)) fail("EVENT_LOOP_PARSE");
  if (Object.keys(v).some((key) => !keys.includes(key))) fail("EVENT_LOOP_UNKNOWN_KEY");
  if (keys.some((key) => !Object.hasOwn(v, key))) fail("EVENT_LOOP_PARSE");
  return v as Row;
}
function list(v: JsonValue, min: number, max: number): JsonValue[] {
  if (!Array.isArray(v) || v.length < min || v.length > max) fail("EVENT_LOOP_BOUNDS");
  return v;
}
function id(v: JsonValue): string {
  if (typeof v !== "string" || bytes(v) < 1 || bytes(v) > 64 || !identifier.test(v)) fail("EVENT_LOOP_ID");
  return v;
}
function digest(v: JsonValue): string {
  if (typeof v !== "string" || !sha.test(v)) fail("EVENT_LOOP_DIGEST");
  return v;
}
function integer(v: JsonValue, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min || v > max) fail("EVENT_LOOP_BOUNDS");
  return v;
}
function checkHash(v: Row): string {
  const {digest: claimed, ...body} = v;
  if (digest(claimed) !== hash(body)) fail("EVENT_LOOP_DIGEST");
  return digest(claimed);
}
function schema(v: JsonValue, initial: boolean): Map<string, string> {
  const data = row(v, ["kind", "fields"]);
  if (data.kind !== "record") fail("EVENT_LOOP_SCHEMA");
  const fields = new Map<string, string>();
  for (const field of list(data.fields, 0, 64)) {
    const item = row(field, initial ? ["name", "type", "initial"] : ["name", "type"]);
    const name = id(item.name);
    if (fields.has(name)) fail("EVENT_LOOP_ID");
    if (typeof item.type !== "string" || !["null", "boolean", "number", "string", "json"].includes(item.type)) fail("EVENT_LOOP_SCHEMA");
    fields.set(name, item.type);
    if (initial && item.type !== "json" && (item.type === "null" ? item.initial !== null : typeof item.initial !== item.type)) fail("EVENT_LOOP_SCHEMA");
  }
  return fields;
}
function expression(v: JsonValue, visit: (program: JsonValue) => void): void {
  const expr = row(v, ["contract", "program"]);
  if (expr.contract !== "algal.expr.v1") fail("EVENT_LOOP_CONTRACT");
  if (bytes(canonicalize(expr)) > 16_384) fail("EVENT_LOOP_BOUNDS");
  const checked = checkProgram(expr.program, ["state", "event"]);
  if (!checked.ok) fail(checked.err.code === "EXPR_BOUNDS" ? "EVENT_LOOP_BOUNDS" :
    checked.err.code === "EXPR_PATH" ? "EVENT_LOOP_REFERENCE" : "EVENT_LOOP_SEMANTIC");
  visit(expr.program);
}
const sorted = (items: Iterable<string>): string[] => [...items].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

export type EventLoopBehaviorSummary = {
  actor: string;
  inputEventTypes: string[];
  reads: { stateFields: string[]; eventFields: Array<{ event: string; fields: string[] }> };
  writes: string[];
  emits: string[];
  pendingOutcomes: string[];
  capabilities: string[];
  limits: { maxEventBytes: number; maxStateBytes: number; maxOutputEvents: number;
    maxTransitionFuel: number; maxMailboxDepth: number };
};

/** Check every declaration and expression without supplying or fabricating a
 * trace. Read sets conservatively include every declared field if a get uses
 * a computed head/path or returns a whole state/event record. A binder may
 * shadow either name, which can only add false positives to this projection.
 * No capability is conferred by the pure v1 behavior or its pending requests.
 */
export function summarizeEventLoopBehavior(value: unknown, actorName: unknown):
  { digest: string; summary: EventLoopBehaviorSummary; summaryDigest: string } {
  const behavior = row(snapshotEventLoopValue(value), ["contract", "behavior", "limits", "events", "actors", "digest"]);
  if (behavior.contract !== "algal.event-loop.v1") fail("EVENT_LOOP_CONTRACT");
  const meta = row(behavior.behavior, ["id", "revision", "sourceDigest", "digest"]);
  id(meta.id);
  integer(meta.revision, 1, 2_147_483_647);
  digest(meta.sourceDigest);
  checkHash(meta);
  const rootDigest = checkHash(behavior);
  if (typeof actorName !== "string") fail("EVENT_LOOP_ID");
  const actor = id(actorName);
  const rawLimits = row(behavior.limits, ["maxEventBytes", "maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"]);
  const limits = {
    maxEventBytes: integer(rawLimits.maxEventBytes, 1, 65_536),
    maxStateBytes: integer(rawLimits.maxStateBytes, 1, 262_144),
    maxOutputEvents: integer(rawLimits.maxOutputEvents, 0, 64),
    maxTransitionFuel: integer(rawLimits.maxTransitionFuel, 1, 100_000),
    maxMailboxDepth: integer(rawLimits.maxMailboxDepth, 1, 1_024),
  };
  const events = new Map<string, Map<string, string>>();
  for (const event of list(behavior.events, 1, 128)) {
    const data = row(event, ["id", "payload"]);
    const name = id(data.id);
    if (events.has(name)) fail("EVENT_LOOP_ID");
    events.set(name, schema(data.payload, false));
  }
  const actors = new Map<string, Row>();
  for (const item of list(behavior.actors, 1, 64)) {
    const data = row(item, ["id", "state", "transitions"]);
    const name = id(data.id);
    if (actors.has(name)) fail("EVENT_LOOP_ID");
    actors.set(name, data);
  }
  if (!actors.has(actor)) fail("EVENT_LOOP_REFERENCE");
  const inputEventTypes = new Set<string>();
  const stateFields = new Set<string>();
  const eventFields = new Map<string, Set<string>>();
  const writes = new Set<string>();
  const emits = new Set<string>();
  const pending = new Set<string>();
  // Expression validation is identical for selected and unselected actors.
  // Inspect in id order so actor array order cannot change the first refusal.
  for (const name of sorted(actors.keys())) {
    const declaration = actors.get(name)!;
    const fields = schema(declaration.state, true);
    const initial: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
    for (const field of list(row(declaration.state, ["kind", "fields"]).fields, 0, 64)) {
      const data = row(field, ["name", "type", "initial"]);
      initial[id(data.name)] = data.initial;
    }
    if (bytes(canonicalize(initial)) > limits.maxStateBytes) fail("EVENT_LOOP_BOUNDS");
    const selected = name === actor;
    const readAll = (event: string): void => {
      for (const key of fields.keys()) stateFields.add(key);
      const found = eventFields.get(event) ?? new Set<string>();
      for (const key of events.get(event)!.keys()) found.add(key);
      eventFields.set(event, found);
    };
    const visit = (node: JsonValue, event: string): void => {
      if (Array.isArray(node)) {
        if (node[0] === "quote") return;
        if (node[0] === "get") {
          const head = node[1];
          const path = node[2];
          if (head === "state") {
            if (path === undefined || typeof path !== "string") {
              for (const key of fields.keys()) stateFields.add(key);
            } else if (fields.has(path)) stateFields.add(path);
          } else if (head === "event") {
            const found = eventFields.get(event) ?? new Set<string>();
            if (path === undefined || typeof path !== "string") {
              for (const key of events.get(event)!.keys()) found.add(key);
            } else if (events.get(event)!.has(path)) found.add(path);
            eventFields.set(event, found);
          } else readAll(event); // computed head or a possibly shadowed binder
        }
        for (let i = 1; i < node.length; i++) visit(node[i]!, event);
      } else if (node !== null && typeof node === "object") {
        for (const child of Object.values(node)) visit(child, event);
      }
    };
    const names = new Set<string>();
    for (const transition of list(declaration.transitions, 1, 256)) {
      const rule = row(transition, ["id", "on", "when", "writes", "outputs", "result"]);
      const ruleId = id(rule.id);
      if (names.has(ruleId)) fail("EVENT_LOOP_ID");
      names.add(ruleId);
      const on = id(rule.on);
      if (!events.has(on)) fail("EVENT_LOOP_REFERENCE");
      if (selected) inputEventTypes.add(on);
      const scan = (expr: JsonValue): void => expression(expr, selected ? (program) => visit(program, on) : () => {});
      if (rule.when !== null) scan(rule.when);
      const written = new Set<string>();
      for (const write of list(rule.writes, 0, 64)) {
        const data = row(write, ["path", "value"]);
        const field = id(list(data.path, 1, 1)[0]!);
        if (!fields.has(field)) fail("EVENT_LOOP_REFERENCE");
        if (written.has(field)) fail("EVENT_LOOP_SEMANTIC");
        written.add(field);
        if (selected) writes.add(field);
        scan(data.value);
      }
      const outputs = list(rule.outputs, 0, limits.maxOutputEvents);
      for (const output of outputs) {
        const data = row(output, ["kind", "target", "event", "payload"]);
        if (data.kind !== "notify") fail("EVENT_LOOP_SEMANTIC");
        const target = id(data.target);
        if (target !== "self" && !actors.has(target)) fail("EVENT_LOOP_REFERENCE");
        const emitted = id(data.event);
        if (!events.has(emitted)) fail("EVENT_LOOP_REFERENCE");
        if (selected) emits.add(emitted);
        scan(data.payload);
      }
      const shape = rule.result !== null && typeof rule.result === "object" && !Array.isArray(rule.result) ? rule.result as Row : null;
      const result = row(rule.result, shape?.kind === "defer" ? ["kind", "key"] : shape?.kind === "escalate" ? ["kind", "request"] : ["kind"]);
      const outcome = result.kind;
      if (!["continue", "quiet", "defer", "escalate"].includes(outcome as string) ||
        (outcome !== "continue" && outputs.length) ||
        ((outcome === "defer" || outcome === "escalate") && written.size)) fail("EVENT_LOOP_SEMANTIC");
      if (outcome === "defer" || outcome === "escalate") {
        scan(outcome === "defer" ? result.key : result.request);
        if (selected) pending.add(outcome);
      }
    }
  }
  const summary: EventLoopBehaviorSummary = {
    actor, inputEventTypes: sorted(inputEventTypes),
    reads: {stateFields: sorted(stateFields), eventFields: sorted(eventFields.keys()).map((event) =>
      ({event, fields: sorted(eventFields.get(event)!)}))},
    writes: sorted(writes), emits: sorted(emits), pendingOutcomes: sorted(pending), capabilities: [], limits,
  };
  // Derived arrays are bounded by the behavior: at most 128 event types,
  // 64 fields per event, 64 state fields, and two pending outcome kinds.
  if (bytes(canonicalize(summary as JsonValue)) > 1_048_576) fail("EVENT_LOOP_BOUNDS");
  return {digest: rootDigest, summary, summaryDigest: hash(summary as JsonValue)};
}
