import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, type EventLoopCode } from "./event-loop-errors";
import { snapshotEventLoopValue } from "./event-loop-snapshot";
export { EventLoopContractError, type EventLoopCode } from "./event-loop-errors";

// P1 trace admission only. A caller must separately check the P0 behavior and
// replay its expressions before treating a trace as execution evidence.

type Row = Record<string, unknown>;
const bytes = (value: string): number => Buffer.byteLength(value, "utf8");
function fail(code: EventLoopCode): never { throw new EventLoopContractError(code); }
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TRACE_BYTES = 1_048_576;

// Unknown objects are data, not trusted records. Check descriptors before any
// field access so an accessor cannot execute code while we validate the trace.
function dataKeys(value: object): string[] {
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    if (typeof key !== "string") fail("EVENT_LOOP_PARSE");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) fail("EVENT_LOOP_PARSE");
  }
  return keys as string[];
}
function dataList(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail("EVENT_LOOP_BOUNDS");
  if (Reflect.ownKeys(value).length !== value.length + 1) fail("EVENT_LOOP_PARSE");
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, i);
    if (!descriptor?.enumerable || !("value" in descriptor)) fail("EVENT_LOOP_PARSE");
  }
  return value;
}
function row(value: unknown, keys: readonly string[] | ((result: Row) => readonly string[])): Row {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail("EVENT_LOOP_PARSE");
  const result = value as Row;
  const present = dataKeys(result);
  const allowed = typeof keys === "function" ? keys(result) : keys;
  for (const key of present) if (!allowed.includes(key)) fail("EVENT_LOOP_UNKNOWN_KEY");
  for (const key of allowed) if (!Object.hasOwn(result, key)) fail("EVENT_LOOP_PARSE");
  return result;
}
function id(value: unknown): string {
  if (typeof value !== "string" || bytes(value) < 1 || bytes(value) > 64 || !ID.test(value)) fail("EVENT_LOOP_ID");
  return value;
}
function digest(value: unknown): string {
  if (typeof value !== "string" || !DIGEST.test(value)) fail("EVENT_LOOP_DIGEST");
  return value;
}
function int(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) fail("EVENT_LOOP_BOUNDS");
  return value;
}
function list(value: unknown, min: number, max: number): unknown[] {
  return dataList(value, min, max);
}
function tag(value: unknown, names: readonly string[]): string {
  if (typeof value !== "string" || !names.includes(value)) fail("EVENT_LOOP_SEMANTIC");
  return value;
}
// Check foreign JSON before canonicalization: depth 0 is a scalar. Limits
// match algal.expr.v1 JSON values; do not walk cycles or arbitrarily deep trees.
function json(value: unknown): JsonValue {
  const active = new Set<object>();
  function walk(v: unknown, depth: number): void {
    if (depth > 32) fail("EVENT_LOOP_BOUNDS");
    if (typeof v === "string") { if (bytes(v) > 65_536) fail("EVENT_LOOP_BOUNDS"); return; }
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "number") { if (!Number.isFinite(v)) fail("EVENT_LOOP_PARSE"); return; }
    if (typeof v !== "object") fail("EVENT_LOOP_PARSE");
    if (depth === 32) fail("EVENT_LOOP_BOUNDS");
    if (active.has(v)) fail("EVENT_LOOP_PARSE");
    active.add(v);
    if (Array.isArray(v)) {
      dataList(v, 0, 1_024);
      for (const item of v) walk(item, depth + 1);
    } else {
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) fail("EVENT_LOOP_PARSE");
      const keys = dataKeys(v);
      if (keys.length > 256) fail("EVENT_LOOP_BOUNDS");
      for (const key of keys) {
        if (bytes(key) > 65_536) fail("EVENT_LOOP_BOUNDS");
        walk((v as Row)[key], depth + 1);
      }
    }
    active.delete(v);
  }
  walk(value, 0);
  const checked = value as JsonValue;
  if (bytes(canonicalize(checked)) > 262_144) fail("EVENT_LOOP_BOUNDS");
  return checked;
}
function checkedHash(value: unknown, expected: unknown): void {
  if (digest(expected) !== hash(value as JsonValue)) fail("EVENT_LOOP_DIGEST");
}

/** Strict shape/identity parser, not a scheduler, expression evaluator or replay verifier. */
export function parseEventLoopTrace(value: unknown): { digest: string; entries: number } {
  // A checked descriptor on a foreign object does not freeze a Proxy's next
  // read. Work only from an inert, bounded snapshot through the digest check.
  const root = row(snapshotEventLoopValue(value), ["contract", "behavior", "actor", "limits", "entries", "digest"]);
  if (root.contract !== "algal.event-loop.trace.v1") fail("EVENT_LOOP_CONTRACT");
  const behavior = digest(root.behavior);
  const actor = id(root.actor);
  const limits = row(root.limits, ["maxEventBytes", "maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"]);
  const maxEvent = int(limits.maxEventBytes, 1, 65_536);
  const maxState = int(limits.maxStateBytes, 1, 262_144);
  const maxOutput = int(limits.maxOutputEvents, 0, 64);
  const maxFuel = int(limits.maxTransitionFuel, 1, 100_000);
  const maxMailbox = int(limits.maxMailboxDepth, 1, 1_024);
  const entries = list(root.entries, 1, 256);
  const bound = new Map<string, string>();
  // At most one digest per entry, so this map has at most 256 keys.
  const stateSizes = new Map<string, number>();
  function rememberState(state: string, size: number): void {
    const previous = stateSizes.get(state);
    if (previous !== undefined && previous !== size) fail("EVENT_LOOP_SEMANTIC");
    stateSizes.set(state, size);
  }
  let lastState: string | undefined;
  let lastStateBytes: number | undefined;
  for (const entry of entries) {
    const item = row(entry, ["source", "sequence", "type", "payload", "delivery", "eventDigest", "messageDigest", "depthBefore", "decision"]);
    const source = id(item.source);
    const sequence = int(item.sequence, 0, 2_147_483_647);
    const type = id(item.type);
    const payload = json(item.payload);
    const delivery = id(item.delivery);
    if (bytes(canonicalize({source, sequence, type, payload})) > maxEvent) fail("EVENT_LOOP_BOUNDS");
    checkedHash({behavior, actor, source, sequence, type, payload}, item.eventDigest);
    checkedHash({event: item.eventDigest, target: actor, delivery}, item.messageDigest);
    const depth = int(item.depthBefore, 0, maxMailbox);
    const key = `${source}\0${sequence}`;
    const content = canonicalize({type, payload});
    const previous = bound.get(key);
    if (previous !== undefined && previous !== content) fail("EVENT_LOOP_ID");
    const decision = row(item.decision, (choice) => choice.kind === "accepted"
      ? ["kind", "transition", "outcome", "stateDigest", "outputs", "effects", "resources",
        ...(choice.outcome === "defer" || choice.outcome === "escalate") && Object.hasOwn(choice, "pending") ? ["pending"] : []]
      : choice.kind === "failed"
        ? ["kind", "reason", "transition", "stateDigest", "resources"]
        : choice.kind === "backpressure" ? ["kind", "policy", "reason"] : ["kind"]);
    const kind = tag(decision.kind, ["accepted", "duplicate", "backpressure", "failed"]);
    if (kind === "duplicate") {
      if (previous === undefined) fail("EVENT_LOOP_SEMANTIC");
    } else if (kind === "backpressure") {
      if (previous !== undefined || depth !== maxMailbox) fail("EVENT_LOOP_SEMANTIC");
      tag(decision.policy, ["reject", "defer", "quarantine"]);
      id(decision.reason);
    } else {
      if (previous !== undefined || depth === maxMailbox) fail("EVENT_LOOP_SEMANTIC");
      if (kind === "failed") {
        tag(decision.reason, ["fuel-exhausted", "expression-error", "state-overflow", "output-invalid", "output-overflow"]);
        if (decision.transition !== null) id(decision.transition);
        const state = digest(decision.stateDigest);
        const resources = row(decision.resources, ["fuel", "stateBytes", "outputEvents"]);
        int(resources.fuel, 0, maxFuel);
        const stateBytes = int(resources.stateBytes, 0, maxState);
        if (int(resources.outputEvents, 0, maxOutput) !== 0 ||
            (lastState !== undefined && (state !== lastState || stateBytes !== lastStateBytes))) fail("EVENT_LOOP_SEMANTIC");
        rememberState(state, stateBytes);
        bound.set(key, content);
        continue;
      }
      const outcome = tag(decision.outcome, ["continue", "quiet", "defer", "escalate", "no-transition"]);
      if (outcome === "no-transition") {
        if (decision.transition !== null) fail("EVENT_LOOP_SEMANTIC");
      } else id(decision.transition);
      if (Object.hasOwn(decision, "pending")) {
        if (outcome !== "defer" && outcome !== "escalate") fail("EVENT_LOOP_SEMANTIC");
        // Legacy shape-only pending records may omit the value; replay refuses
        // them. A supplied witness is limited independently of the trace size.
        if (bytes(canonicalize(json(decision.pending))) > 16_384) fail("EVENT_LOOP_BOUNDS");
      }
      const state = digest(decision.stateDigest);
      const outputs = list(decision.outputs, 0, maxOutput);
      outputs.forEach(digest);
      const effects = row(decision.effects, ["requested", "settled", "receipts"]);
      const requested = int(effects.requested, 0, 64);
      const settled = int(effects.settled, 0, requested);
      const receipts = list(effects.receipts, settled, settled);
      receipts.forEach(digest);
      // P0 transitions are pure. Notifications are data, and defer/escalate
      // are pending requests, not completed external effects.
      if (requested !== 0) fail("EVENT_LOOP_SEMANTIC");
      const resources = row(decision.resources, ["fuel", "stateBytes", "outputEvents"]);
      int(resources.fuel, 0, maxFuel);
      const stateBytes = int(resources.stateBytes, 0, maxState);
      if (int(resources.outputEvents, 0, maxOutput) !== outputs.length) fail("EVENT_LOOP_SEMANTIC");
      if (["quiet", "defer", "escalate", "no-transition"].includes(outcome) && outputs.length > 0) fail("EVENT_LOOP_SEMANTIC");
      if (["defer", "escalate", "no-transition"].includes(outcome) && requested > 0) fail("EVENT_LOOP_SEMANTIC");
      if (["defer", "escalate", "no-transition"].includes(outcome) && lastState !== undefined && state !== lastState) fail("EVENT_LOOP_SEMANTIC");
      rememberState(state, stateBytes);
      lastState = state;
      lastStateBytes = stateBytes;
      bound.set(key, content);
    }
  }
  // All foreign leaves and objects are checked above. The byte check here
  // does not impose an extra payload depth limit beyond the 32-level rule.
  if (bytes(canonicalize(root as JsonValue)) > MAX_TRACE_BYTES) fail("EVENT_LOOP_BOUNDS");
  const { digest: claimed, ...body } = root;
  checkedHash(body, claimed);
  return { digest: digest(claimed), entries: entries.length };
}
