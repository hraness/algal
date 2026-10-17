import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, type EventLoopCode } from "./event-loop-errors";

const size = (s: string): number => Buffer.byteLength(s, "utf8");
function fail(code: EventLoopCode): never { throw new EventLoopContractError(code); }

// Take an inert, bounded copy before hashing or selecting any foreign field.
// A property-get trap cannot change the record between validation and use.
export function snapshotEventLoopValue(value: unknown): JsonValue {
  const active = new Set<object>();
  // The exact canonical bound is checked below. This lower bound charges each
  // copied occurrence (including shared subtrees) before it is allocated, so
  // a small cyclic-free DAG cannot expand exponentially before that check.
  let remaining = 1_048_576;
  function charge(bytes: number): void {
    remaining -= bytes;
    if (remaining < 0) fail("EVENT_LOOP_BOUNDS");
  }
  function walk(v: unknown, depth: number): JsonValue {
    if (depth > 32) fail("EVENT_LOOP_BOUNDS");
    charge(1);
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "string") { if (size(v) > 65_536) fail("EVENT_LOOP_BOUNDS"); charge(size(v)); return v; }
    if (typeof v === "number") { if (!Number.isFinite(v)) fail("EVENT_LOOP_PARSE"); return v; }
    if (typeof v !== "object" || active.has(v)) fail("EVENT_LOOP_PARSE");
    if (depth === 32) fail("EVENT_LOOP_BOUNDS");
    active.add(v);
    if (Array.isArray(v)) {
      // A proxy around an array can trap `v.length`; take its data descriptor
      // instead, just as we do for indexed elements and object properties.
      const length = Object.getOwnPropertyDescriptor(v, "length")?.value as unknown;
      if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > 1_024) {
        fail("EVENT_LOOP_BOUNDS");
      }
      if (Reflect.ownKeys(v).length !== length + 1) fail("EVENT_LOOP_PARSE");
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
      charge(size(key) + 1);
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
