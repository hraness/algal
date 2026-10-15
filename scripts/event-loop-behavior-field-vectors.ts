/* eslint-disable @typescript-eslint/no-explicit-any -- These inputs deliberately violate the behavior contract. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";

const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
export const fieldHash = (v: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(v)).digest("hex")}`;
function seal(v: any): void {
  const {digest: _old, ...body} = v;
  v.digest = fieldHash(body);
}
function bind(b: any, digest = b.digest, limits = b.limits): any {
  const trace = structuredClone(fixture.base);
  trace.behavior = digest;
  trace.limits = structuredClone(limits);
  for (const entry of trace.entries) {
    entry.eventDigest = fieldHash({behavior: digest, actor: trace.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = fieldHash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  }
  seal(trace);
  return trace;
}
const sibling = (b: any): any => b.actors[1];
const rule = (b: any): any => sibling(b).transitions[0];
const field = (b: any): any => sibling(b).state.fields[0];
const output = (b: any): any => rule(b).outputs[0];
const expr = (program: JsonValue): any => ({contract: "algal.expr.v1", program});
const maxExpr = (): any => expr("x".repeat(16_384 - Buffer.byteLength(canonicalize(expr("") as JsonValue), "utf8")));
function pending(kind: "defer" | "escalate"): (b: any) => void {
  return (b) => { rule(b).writes = []; rule(b).outputs = [];
    rule(b).result = kind === "defer" ? {kind, key: maxExpr()} : {kind, request: maxExpr()}; };
}

export type BehaviorFieldVector = {
  cell: string; control: any; behavior: any; controlTrace: any; trace: any;
  expected: string; // both the behavior-only summary and the structural join
};
// An accepted control accompanies each damaged field. Unselected declarations
// keep the trace's selected actor unchanged; every other root is redigested.
export function behaviorFieldVectors(): BehaviorFieldVector[] {
  const vectors: BehaviorFieldVector[] = [];
  function add(cell: string, damage: (b: any) => void, expected: string,
    prepare: (b: any) => void = () => {}, metadata = false, missingRootDigest = false): void {
    const control = structuredClone(pinned);
    const observer = structuredClone(control.actors[0]);
    observer.id = "observer";
    control.actors.push(observer);
    control.events.push({id: "unused", payload: {kind: "record", fields: [{name: "note", type: "string"}]}});
    prepare(control);
    seal(control);
    const controlTrace = bind(control);
    if (controlTrace.actor !== control.actors[0].id || controlTrace.actor === observer.id ||
        controlTrace.entries.some((entry: any) => entry.type === control.events[3].id)) {
      throw new Error(`non-isolated field vector: ${cell}`);
    }
    const behavior = structuredClone(control);
    damage(behavior);
    if (metadata) seal(behavior.behavior);
    if (!missingRootDigest) seal(behavior);
    // A root with no digest cannot be trace-bound. Keep the accepted trace
    // limits valid even when the behavior's limits object has an extra key.
    const trace = bind(behavior, missingRootDigest ? control.digest : behavior.digest, control.limits);
    vectors.push({cell, control, behavior, controlTrace, trace, expected});
  }
  for (const name of ["revision", "sourceDigest", "digest"]) {
    add(`behavior.${name}:extra`, (b) => { b.behavior[`${name}-extra`] = true; }, "EVENT_LOOP_UNKNOWN_KEY", undefined, true);
  }
  add("behavior.sourceDigest:edge", (b) => { b.behavior.sourceDigest += "a"; }, "EVENT_LOOP_DIGEST", undefined, true);
  for (const key of ["maxEventBytes", "maxStateBytes", "maxOutputEvents", "maxTransitionFuel", "maxMailboxDepth"]) {
    add(`limits.${key}:extra`, (b) => { b.limits[`${key}-extra`] = true; }, "EVENT_LOOP_UNKNOWN_KEY");
  }
  add("events[*].id:extra", (b) => { b.events[3].idExtra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
  add("events[*].payload.kind:edge", (b) => { b.events[3].payload.kind = "tuple"; }, "EVENT_LOOP_SCHEMA");
  add("events[*].payload.fields[*].type:edge", (b) => { b.events[3].payload.fields[0].type = "bytes"; }, "EVENT_LOOP_SCHEMA");
  add("actors[*].id:extra", (b) => { sibling(b).idExtra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
  add("actors[*].state.kind:edge", (b) => { sibling(b).state.kind = "tuple"; }, "EVENT_LOOP_SCHEMA");
  add("actors[*].state.kind:malformed", (b) => { sibling(b).state.kind = 1; }, "EVENT_LOOP_SCHEMA");
  add("actors[*].state.fields[*].name:extra", (b) => { field(b).nameExtra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
  add("actors[*].state.fields[*].type:edge", (b) => { field(b).type = "bytes"; }, "EVENT_LOOP_SCHEMA");
  add("actors[*].state.fields[*].initial:edge", (b) => { field(b).initial += "x"; }, "EVENT_LOOP_BOUNDS",
    (b) => { b.limits.maxStateBytes = 262_144; field(b).type = "string"; field(b).initial = "x".repeat(65_536); });
  add("actors[*].transitions[*].on:edge", (b) => { rule(b).on += "a"; }, "EVENT_LOOP_ID",
    (b) => { b.events[3].id = "a".repeat(64); rule(b).on = b.events[3].id; });
  add("actors[*].transitions[*].outputs[*].kind:edge", (b) => { output(b).kind = "send"; }, "EVENT_LOOP_SEMANTIC");
  add("actors[*].transitions[*].outputs[*].target:edge", (b) => { output(b).target += "a"; }, "EVENT_LOOP_ID",
    (b) => { sibling(b).id = "a".repeat(64); output(b).target = sibling(b).id; });
  add("actors[*].transitions[*].outputs[*].event:edge", (b) => { output(b).event += "a"; }, "EVENT_LOOP_ID",
    (b) => { b.events[3].id = "a".repeat(64); output(b).event = b.events[3].id; });
  add("actors[*].transitions[*].outputs[*].payload:edge", (b) => { output(b).payload.program += "x"; }, "EVENT_LOOP_BOUNDS",
    (b) => { output(b).payload = maxExpr(); });
  for (const [kind, key] of [["defer", "key"], ["escalate", "request"]] as const) {
    add(`actors[*].transitions[*].result.${key}:extra`, (b) => { rule(b).result[`${key}-extra`] = true; },
      "EVENT_LOOP_UNKNOWN_KEY", pending(kind));
    add(`actors[*].transitions[*].result.${key}:edge`, (b) => { rule(b).result[key].program += "x"; },
      "EVENT_LOOP_BOUNDS", pending(kind));
  }
  add("digest:missing", (b) => { delete b.digest; }, "EVENT_LOOP_PARSE", undefined, false, true);
  if (vectors.length !== 28) throw new Error("behavior field inventory changed");
  return vectors;
}
