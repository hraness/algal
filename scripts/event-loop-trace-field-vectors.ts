/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately malformed redigested trace records. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";

const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): void {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
}

export type TraceFieldVector = {
  name: string;
  control: any;
  value: any;
  expected: string | undefined;
  extra: {path: string[]; key: string} | undefined;
};

// Each control is a valid, minimal prefix. Extra-key probes change only a
// sibling of the named field, not a second field or a stale root digest.
export function traceFieldVectors(): TraceFieldVector[] {
  const vectors: TraceFieldVector[] = [];
  function add(name: string, prefix: "accepted" | "backpressure", change: (value: any) => void,
               expected?: string, extra?: TraceFieldVector["extra"], prepare?: (control: any) => void): void {
    const control = structuredClone(fixture.base);
    control.entries = control.entries.slice(0, prefix === "accepted" ? 1 : 3);
    prepare?.(control);
    seal(control);
    const value = structuredClone(control);
    change(value);
    seal(value);
    vectors.push({name, control, value, expected, extra});
  }
  const extra = (name: string, prefix: "accepted" | "backpressure", path: string[], field: string): void => {
    const key = `${field}Extra`;
    add(name, prefix, (value) => {
      let target = value;
      for (const part of path) target = target[part];
      if (!Object.hasOwn(target, field) || Object.hasOwn(target, key)) throw new Error(`bad extra probe: ${name}`);
      target[key] = true;
    }, "EVENT_LOOP_UNKNOWN_KEY", {path, key});
  };
  for (const field of ["actor", "limits", "entries"]) extra(`root-${field}-extra`, "accepted", [], field);
  extra("entry-decision-extra", "accepted", ["entries", "0"], "decision");
  for (const field of ["kind", "transition", "outcome", "stateDigest", "outputs", "effects", "resources"])
    extra(`accepted-${field}-extra`, "accepted", ["entries", "0", "decision"], field);
  for (const field of ["requested", "settled", "receipts"])
    extra(`effects-${field}-extra`, "accepted", ["entries", "0", "decision", "effects"], field);
  for (const field of ["fuel", "stateBytes", "outputEvents"])
    extra(`resources-${field}-extra`, "accepted", ["entries", "0", "decision", "resources"], field);
  for (const field of ["policy", "reason"])
    extra(`backpressure-${field}-extra`, "backpressure", ["entries", "2", "decision"], field);

  // Changing the actor also changes the event/message identity. Bind the
  // accepted prefix to the new actor before testing the 64-byte ID edge.
  const actor = (length: number) => (value: any): void => {
    value.actor = "a".repeat(length);
    const entry = value.entries[0];
    entry.eventDigest = hash({behavior: value.behavior, actor: value.actor,
      source: entry.source, sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: value.actor, delivery: entry.delivery});
  };
  add("actor-id-at-64", "accepted", actor(64));
  add("actor-id-at-65", "accepted", actor(65), "EVENT_LOOP_ID");
  add("actor-id-malformed", "accepted", (v) => { v.actor = "Invalid"; }, "EVENT_LOOP_ID");
  add("transition-id-at-64", "accepted", (v) => { v.entries[0].decision.transition = "a".repeat(64); });
  add("transition-id-at-65", "accepted", (v) => { v.entries[0].decision.transition = "a".repeat(65); }, "EVENT_LOOP_ID");
  add("backpressure-reason-at-64", "backpressure", (v) => { v.entries[2].decision.reason = "a".repeat(64); });
  add("backpressure-reason-at-65", "backpressure", (v) => { v.entries[2].decision.reason = "a".repeat(65); }, "EVENT_LOOP_ID");
  for (const [length, expected] of [[64, undefined], [65, "EVENT_LOOP_BOUNDS"]] as const) {
    add(`outputs-at-${length}`, "accepted", (v) => {
      v.limits.maxOutputEvents = 64;
      const decision = v.entries[0].decision;
      decision.outputs = Array(length).fill(decision.outputs[0]);
      decision.resources.outputEvents = length;
    }, expected);
  }

  // Shape-only probes for the remaining trace cells. Reidentify a changed
  // payload so the byte refusal cannot be explained by a stale event digest.
  add("limits-malformed", "accepted", (v) => { v.limits = null; }, "EVENT_LOOP_PARSE");
  const setPayload = (v: any, padding: string): void => {
    const entry = v.entries[0];
    entry.payload = {amount: 1, padding};
    entry.eventDigest = hash({behavior: v.behavior, actor: v.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: v.actor, delivery: entry.delivery});
  };
  const entry = fixture.base.entries[0];
  const emptyBytes = Buffer.byteLength(canonicalize({source: entry.source, sequence: entry.sequence,
    type: entry.type, payload: {amount: 1, padding: ""}}));
  const atLimit = 128 - emptyBytes;
  if (atLimit < 2) throw new Error("event byte edge fixture exceeds limit");
  for (const [name, padding] of [["payload-event", "a".repeat(atLimit)],
    ["payload-event-utf8", "a".repeat(atLimit - 2) + "é"]] as const) {
    add(`${name}-at-128`, "accepted", (v) => setPayload(v, padding), undefined, undefined,
      (v) => { v.limits.maxEventBytes = 128; });
    add(`${name}-at-129`, "accepted", (v) => setPayload(v, padding + "a"), "EVENT_LOOP_BOUNDS", undefined,
      (v) => { v.limits.maxEventBytes = 128; setPayload(v, padding); });
  }
  add("decision-malformed", "accepted", (v) => { v.entries[0].decision = null; }, "EVENT_LOOP_PARSE");
  add("effects-malformed", "accepted", (v) => { v.entries[0].decision.effects = null; }, "EVENT_LOOP_PARSE");
  add("resources-malformed", "accepted", (v) => { v.entries[0].decision.resources = null; }, "EVENT_LOOP_PARSE");
  for (const [count, code] of [[1, "EVENT_LOOP_SEMANTIC"], [64, "EVENT_LOOP_SEMANTIC"],
    [65, "EVENT_LOOP_BOUNDS"]] as const)
    add(`effects-requested-${count}`, "accepted", (v) => { v.entries[0].decision.effects.requested = count; }, code);
  for (const count of [1, 65])
    add(`effects-settled-${count}`, "accepted", (v) => { v.entries[0].decision.effects.settled = count; }, "EVENT_LOOP_BOUNDS");
  for (const count of [1, 65])
    add(`effects-receipts-${count}`, "accepted", (v) => {
      v.entries[0].decision.effects.receipts = Array(count).fill(v.entries[0].decision.stateDigest);
    }, "EVENT_LOOP_BOUNDS");
  add("backpressure-reason-malformed", "backpressure", (v) => {
    v.entries[2].decision.reason = null;
  }, "EVENT_LOOP_ID");

  if (vectors.length !== 44) throw new Error("trace field-vector inventory changed");
  return vectors;
}
