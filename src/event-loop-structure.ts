import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";

// P1 structural join only. Guards, expression results, output identities, and
// actual resource use require a separate evaluator/replay check.
type Field = "contract" | "behavior" | "limits" | "events" | "actors" | "digest" | "id" |
  "revision" | "sourceDigest" | "kind" | "fields" | "name" | "type" | "initial" | "program" |
  "maxEventBytes" | "maxStateBytes" | "maxOutputEvents" | "maxTransitionFuel" | "maxMailboxDepth" |
  "state" | "transitions" | "payload" | "on" | "when" | "writes" | "outputs" | "result" |
  "path" | "value" | "target" | "event" | "key" | "request";
type Row = Record<Field, JsonValue> & Record<string, JsonValue>;
type Code = EventLoopContractError["code"];
function fail(code: Code): never { throw new EventLoopContractError(code); }
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const size = (s: string): number => Buffer.byteLength(s, "utf8");

// Take an inert, bounded copy before hashing or selecting any behavior field.
// A foreign accessor cannot become part of a validated record.
export function snapshotEventLoopValue(value: unknown): JsonValue {
  const active = new Set<object>();
  function walk(v: unknown, depth: number): JsonValue {
    if (depth > 32) fail("EVENT_LOOP_BOUNDS");
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "string") { if (size(v) > 65_536) fail("EVENT_LOOP_BOUNDS"); return v; }
    if (typeof v === "number") { if (!Number.isFinite(v)) fail("EVENT_LOOP_PARSE"); return v; }
    if (typeof v !== "object" || active.has(v)) fail("EVENT_LOOP_PARSE");
    if (depth === 32) fail("EVENT_LOOP_BOUNDS");
    active.add(v);
    if (Array.isArray(v)) {
      // A proxy around an array can trap `v.length`; take its data descriptor
      // instead, just as we do for indexed elements and object properties.
      const length = Object.getOwnPropertyDescriptor(v, "length")?.value as unknown;
      if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 ||
          length > 1_024 || Reflect.ownKeys(v).length !== length + 1) fail("EVENT_LOOP_BOUNDS");
      const copy: JsonValue[] = [];
      for (let i = 0; i < length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(v, i);
        if (!descriptor?.enumerable || !("value" in descriptor)) fail("EVENT_LOOP_PARSE");
        copy.push(walk(descriptor.value, depth + 1));
      }
      active.delete(v);
      return copy;
    }
    if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail("EVENT_LOOP_PARSE");
    const keys = Reflect.ownKeys(v);
    if (keys.length > 256) fail("EVENT_LOOP_BOUNDS");
    const copy: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
    for (const key of keys) {
      if (typeof key !== "string") fail("EVENT_LOOP_PARSE");
      if (size(key) > 65_536) fail("EVENT_LOOP_BOUNDS");
      const descriptor = Object.getOwnPropertyDescriptor(v, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) fail("EVENT_LOOP_PARSE");
      copy[key] = walk(descriptor.value, depth + 1);
    }
    active.delete(v);
    return copy;
  }
  const copy = walk(value, 0);
  if (size(canonicalize(copy)) > 1_048_576) fail("EVENT_LOOP_BOUNDS");
  return copy;
}
function row(value: JsonValue, keys: readonly string[]): Row {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("EVENT_LOOP_PARSE");
  if (Object.keys(value).some((key) => !keys.includes(key))) fail("EVENT_LOOP_UNKNOWN_KEY");
  if (keys.some((key) => !Object.hasOwn(value, key))) fail("EVENT_LOOP_PARSE");
  return value as Row;
}
function list(value: JsonValue, min: number, max: number): JsonValue[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail("EVENT_LOOP_BOUNDS");
  return value;
}
function id(value: JsonValue): string {
  if (typeof value !== "string" || size(value) < 1 || size(value) > 64 || !idPattern.test(value)) fail("EVENT_LOOP_ID");
  return value;
}
function digest(value: JsonValue): string {
  if (typeof value !== "string" || !digestPattern.test(value)) fail("EVENT_LOOP_DIGEST");
  return value;
}
function integer(value: JsonValue, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail("EVENT_LOOP_BOUNDS");
  return value;
}
function schema(value: JsonValue, initial: boolean): Map<string, string> {
  const record = row(value, ["kind", "fields"]);
  if (record.kind !== "record") fail("EVENT_LOOP_SCHEMA");
  const fields = new Map<string, string>();
  for (const field of list(record.fields, 0, 64)) {
    const data = row(field, initial ? ["name", "type", "initial"] : ["name", "type"]);
    const name = id(data.name);
    if (fields.has(name)) fail("EVENT_LOOP_ID");
    if (typeof data.type !== "string" || !["null", "boolean", "number", "string", "json"].includes(data.type)) fail("EVENT_LOOP_SCHEMA");
    fields.set(name, data.type);
    if (initial) typed(data.initial, data.type);
  }
  return fields;
}
function typed(value: JsonValue, type: string): void {
  if (type === "json") return; // snapshot has already bounded nested JSON.
  if (type === "null" ? value !== null : typeof value !== type) fail("EVENT_LOOP_SCHEMA");
}
function expression(value: JsonValue): void {
  const expr = row(value, ["contract", "program"]);
  if (expr.contract !== "algal.expr.v1") fail("EVENT_LOOP_CONTRACT");
  if (size(canonicalize(expr)) > 16_384) fail("EVENT_LOOP_BOUNDS");
  // Expression grammar, fuel and values belong to algal.expr.v1 replay.
}
function unique(map: Map<string, unknown>, name: string): void {
  if (map.has(name)) fail("EVENT_LOOP_ID");
}
export type EventLoopStaticSummary = {
  events: number; transitions: number; writes: number;
  notifications: number; deferrals: number; escalations: number;
};
type Transition = { on: string; result: string; outputs: number; writes: number; unconditional: boolean };

/** Check a trace against the pinned behavior's declarations, not its execution.
 * Unlike parseEventLoopTrace, this rejects a re-digested reset delivery that
 * claims the increment transition or a notification it does not declare.
 */
export function verifyEventLoopTraceStructure(trace: unknown, behaviorValue: unknown):
  { digest: string; staticSummary: EventLoopStaticSummary } {
  // Parse and join the same inert copy. Reading the caller's trace after the
  // digest check would allow a foreign object to change between those steps.
  const traceCopy = snapshotEventLoopValue(trace);
  const { digest: traceDigest } = parseEventLoopTrace(traceCopy);
  const behavior = row(snapshotEventLoopValue(behaviorValue), ["contract", "behavior", "limits", "events", "actors", "digest"]);
  if (behavior.contract !== "algal.event-loop.v1") fail("EVENT_LOOP_CONTRACT");
  const meta = row(behavior.behavior, ["id", "revision", "sourceDigest", "digest"]);
  id(meta.id);
  integer(meta.revision, 1, 2_147_483_647);
  digest(meta.sourceDigest);
  const {digest: metaHash, ...metaBody} = meta;
  if (digest(metaHash) !== hash(metaBody)) fail("EVENT_LOOP_DIGEST");
  const {digest: artifactHash, ...artifactBody} = behavior;
  if (digest(artifactHash) !== hash(artifactBody)) fail("EVENT_LOOP_DIGEST");
  const checked = traceCopy as unknown as { behavior: string; actor: string; limits: JsonValue; entries: Array<{type: string; payload: JsonValue; decision: {
    kind: string; transition?: string | null; outcome?: string; outputs?: string[];
    stateDigest?: string; resources?: {stateBytes: number};
  }}> };
  if (checked.behavior !== artifactHash) fail("EVENT_LOOP_DIGEST");
  const limits = row(behavior.limits, ["maxEventBytes", "maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"]);
  for (const [key, min, max] of [
    ["maxEventBytes", 1, 65_536], ["maxStateBytes", 1, 262_144], ["maxOutputEvents", 0, 64],
    ["maxTransitionFuel", 1, 100_000], ["maxMailboxDepth", 1, 1_024],
  ] as const) integer(limits[key], min, max);
  if (canonicalize(limits) !== canonicalize(checked.limits)) fail("EVENT_LOOP_SEMANTIC");
  const events = new Map<string, Map<string, string>>();
  for (const event of list(behavior.events, 1, 128)) {
    const declaration = row(event, ["id", "payload"]);
    const name = id(declaration.id);
    unique(events, name);
    events.set(name, schema(declaration.payload, false));
  }
  const actors = new Map<string, Row>();
  for (const actor of list(behavior.actors, 1, 64)) {
    const declaration = row(actor, ["id", "state", "transitions"]);
    const name = id(declaration.id);
    unique(actors, name);
    actors.set(name, declaration);
  }
  const current = actors.get(checked.actor);
  if (!current) fail("EVENT_LOOP_REFERENCE");
  const state = schema(current.state, true);
  const initial: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  for (const field of list(row(current.state, ["kind", "fields"]).fields, 0, 64)) {
    const item = row(field, ["name", "type", "initial"]);
    initial[id(item.name)] = item.initial;
  }
  const initialBytes = size(canonicalize(initial));
  if (initialBytes > integer(limits.maxStateBytes, 1, 262_144)) fail("EVENT_LOOP_BOUNDS");
  const initialDigest = hash(initial);
  const transitions = new Map<string, Transition>();
  const staticSummary: EventLoopStaticSummary = {events: events.size, transitions: 0, writes: 0, notifications: 0, deferrals: 0, escalations: 0};
  for (const transition of list(current.transitions, 1, 256)) {
    const rule = row(transition, ["id", "on", "when", "writes", "outputs", "result"]);
    const name = id(rule.id);
    unique(transitions, name);
    const on = id(rule.on);
    if (!events.has(on)) fail("EVENT_LOOP_REFERENCE");
    if (rule.when !== null) expression(rule.when);
    const written = new Set<string>();
    for (const write of list(rule.writes, 0, 64)) {
      const item = row(write, ["path", "value"]);
      const path = list(item.path, 1, 1);
      const field = id(path[0]!);
      if (!state.has(field)) fail("EVENT_LOOP_REFERENCE");
      if (written.has(field)) fail("EVENT_LOOP_SEMANTIC");
      written.add(field);
      expression(item.value);
      staticSummary.writes++;
    }
    const outputs = list(rule.outputs, 0, integer(limits.maxOutputEvents, 0, 64));
    for (const output of outputs) {
      const item = row(output, ["kind", "target", "event", "payload"]);
      if (item.kind !== "notify") fail("EVENT_LOOP_SEMANTIC");
      const target = id(item.target);
      if (target !== "self" && !actors.has(target)) fail("EVENT_LOOP_REFERENCE");
      if (!events.has(id(item.event))) fail("EVENT_LOOP_REFERENCE");
      expression(item.payload);
      staticSummary.notifications++;
    }
    const result = row(rule.result, rule.result !== null && typeof rule.result === "object" && !Array.isArray(rule.result) &&
      (rule.result as Row).kind === "defer" ? ["kind", "key"] :
      rule.result !== null && typeof rule.result === "object" && !Array.isArray(rule.result) && (rule.result as Row).kind === "escalate" ? ["kind", "request"] : ["kind"]);
    const outcome = result.kind;
    if (!["continue", "quiet", "defer", "escalate"].includes(outcome as string)) fail("EVENT_LOOP_SEMANTIC");
    if (outcome !== "continue" && outputs.length) fail("EVENT_LOOP_SEMANTIC");
    if ((outcome === "defer" || outcome === "escalate") && rule.writes instanceof Array && rule.writes.length) fail("EVENT_LOOP_SEMANTIC");
    if (outcome === "defer") { expression(result.key); staticSummary.deferrals++; }
    if (outcome === "escalate") { expression(result.request); staticSummary.escalations++; }
    transitions.set(name, {on, result: outcome as string, outputs: outputs.length, writes: written.size, unconditional: rule.when === null});
    staticSummary.transitions++;
  }
  // The digest covers every actor, so an unchecked sibling could smuggle an
  // invalid declaration into an otherwise valid trace. Keep the returned
  // counts selected-actor-only; check all other declarations before joining.
  // Visit siblings by id, not input order, so competing errors have the same
  // first refusal in the TypeScript and Rust mirrors.
  for (const [actorId, actor] of [...actors].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
    if (actorId === checked.actor) continue;
    const fields = schema(actor.state, true);
    const siblingInitial: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
    for (const field of list(row(actor.state, ["kind", "fields"]).fields, 0, 64)) {
      const item = row(field, ["name", "type", "initial"]);
      siblingInitial[id(item.name)] = item.initial;
    }
    if (size(canonicalize(siblingInitial)) > integer(limits.maxStateBytes, 1, 262_144)) fail("EVENT_LOOP_BOUNDS");
    const names = new Map<string, true>();
    for (const transition of list(actor.transitions, 1, 256)) {
      const rule = row(transition, ["id", "on", "when", "writes", "outputs", "result"]);
      const name = id(rule.id);
      unique(names, name);
      names.set(name, true);
      if (!events.has(id(rule.on))) fail("EVENT_LOOP_REFERENCE");
      if (rule.when !== null) expression(rule.when);
      const written = new Set<string>();
      for (const write of list(rule.writes, 0, 64)) {
        const item = row(write, ["path", "value"]);
        const field = id(list(item.path, 1, 1)[0]!);
        if (!fields.has(field)) fail("EVENT_LOOP_REFERENCE");
        if (written.has(field)) fail("EVENT_LOOP_SEMANTIC");
        written.add(field);
        expression(item.value);
      }
      const outputs = list(rule.outputs, 0, integer(limits.maxOutputEvents, 0, 64));
      for (const output of outputs) {
        const item = row(output, ["kind", "target", "event", "payload"]);
        if (item.kind !== "notify") fail("EVENT_LOOP_SEMANTIC");
        const target = id(item.target);
        if (target !== "self" && !actors.has(target)) fail("EVENT_LOOP_REFERENCE");
        if (!events.has(id(item.event))) fail("EVENT_LOOP_REFERENCE");
        expression(item.payload);
      }
      const shape = rule.result !== null && typeof rule.result === "object" && !Array.isArray(rule.result) ? rule.result as Row : null;
      const result = row(rule.result, shape?.kind === "defer" ? ["kind", "key"] :
        shape?.kind === "escalate" ? ["kind", "request"] : ["kind"]);
      const outcome = result.kind;
      if (!["continue", "quiet", "defer", "escalate"].includes(outcome as string)) fail("EVENT_LOOP_SEMANTIC");
      if (outcome !== "continue" && outputs.length) fail("EVENT_LOOP_SEMANTIC");
      if ((outcome === "defer" || outcome === "escalate") && rule.writes instanceof Array && rule.writes.length) fail("EVENT_LOOP_SEMANTIC");
      if (outcome === "defer") expression(result.key);
      if (outcome === "escalate") expression(result.request);
    }
  }
  let committed = false;
  let lastDigest = initialDigest;
  let lastBytes = initialBytes;
  for (const entry of checked.entries) {
    const fields = events.get(entry.type);
    if (!fields) fail("EVENT_LOOP_REFERENCE");
    const payload = row(entry.payload, [...fields.keys()]);
    for (const [name, type] of fields) typed(payload[name]!, type);
    const decision = entry.decision;
    if (decision.kind === "duplicate" || decision.kind === "backpressure") continue;
    const selected = decision.transition === null ? undefined : transitions.get(decision.transition!);
    if (decision.transition !== null && (!selected || selected.on !== entry.type)) fail("EVENT_LOOP_REFERENCE");
    // A named selection cannot skip a lexically earlier unconditional rule,
    // even when a later evaluation failed. Null selection may fail earlier.
    // Guarded predecessors and whether failure occurred require replay.
    if (decision.transition !== null && [...transitions].some(([name, rule]) =>
      name < decision.transition! && rule.on === entry.type && rule.unconditional)) fail("EVENT_LOOP_SEMANTIC");
    // Before the first committed transition, a failed or pending/unmatched
    // decision cannot change the behavior's declared initial state. The shape
    // parser checks continuity only after an accepted state was recorded.
    if (!committed && (decision.kind === "failed" || ["defer", "escalate", "no-transition"].includes(decision.outcome!)) &&
        (decision.stateDigest !== initialDigest || decision.resources?.stateBytes !== initialBytes)) fail("EVENT_LOOP_SEMANTIC");
    if (decision.kind === "failed") continue; // failure claims are not replayed.
    if (decision.outcome === "no-transition") {
      if ([...transitions.values()].some((t) => t.on === entry.type && t.unconditional)) fail("EVENT_LOOP_SEMANTIC");
    } else if (!selected || selected.result !== decision.outcome || selected.outputs !== decision.outputs?.length) {
      fail("EVENT_LOOP_SEMANTIC");
    }
    if (decision.outcome === "continue" || decision.outcome === "quiet") {
      // An accepted rule with no state writes cannot change the prior state,
      // even when expression replay is not available for rules with writes.
      if (selected?.writes === 0 && (decision.stateDigest !== lastDigest || decision.resources?.stateBytes !== lastBytes)) {
        fail("EVENT_LOOP_SEMANTIC");
      }
      lastDigest = decision.stateDigest!;
      lastBytes = decision.resources!.stateBytes;
      committed = true;
    }
  }
  return {digest: traceDigest, staticSummary};
}
