/* eslint-disable @typescript-eslint/no-explicit-any -- Adversarial behavior records are deliberately malformed. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";

const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): void {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
}
function bind(behavior: any): any {
  const trace = structuredClone(fixture.base);
  trace.behavior = behavior.digest;
  trace.limits = structuredClone(behavior.limits);
  for (const entry of trace.entries) {
    entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  }
  seal(trace);
  return trace;
}

// If the pinned fixture changes, do not silently relabel a selected actor or
// referenced event as a sibling/unused declaration in parity evidence.
function assertUntouched(behavior: any, trace: any, name: string): void {
  const event = behavior.events[3];
  const sibling = behavior.actors[1];
  if (behavior.events.length !== 4 || behavior.actors.length !== 2 || !event || !sibling ||
      trace.actor !== behavior.actors[0].id || trace.actor === sibling.id ||
      trace.entries.some((entry: any) => entry.type === event.id) ||
      behavior.actors.some((actor: any) => actor.transitions.some((rule: any) =>
        rule.on === event.id || rule.outputs.some((output: any) => output.event === event.id)))) {
    throw new Error(`field vector no longer isolates unused event and unselected actor: ${name}`);
  }
}

export type SiblingFieldVector = {
  name: string; behavior: any; trace: any; controlBehavior: any; controlTrace: any; expected: string | undefined;
};
// Each control is a valid sibling plus a declaration never delivered to the
// selected actor. Rebind every entry and both root digests after a mutation.
export function siblingFieldVectors(): SiblingFieldVector[] {
  const vectors: SiblingFieldVector[] = [];
  function add(name: string, change: (b: any) => void, expected?: string, prepare?: (b: any) => void): void {
    const controlBehavior = structuredClone(pinned);
    const sibling = structuredClone(controlBehavior.actors[0]);
    sibling.id = "observer";
    controlBehavior.actors.push(sibling);
    controlBehavior.events.push({id: "unused", payload: {kind: "record", fields: [{name: "note", type: "string"}]}});
    prepare?.(controlBehavior);
    seal(controlBehavior);
    const controlTrace = bind(controlBehavior);
    assertUntouched(controlBehavior, controlTrace, `control-${name}`);
    const behavior = structuredClone(controlBehavior);
    change(behavior);
    seal(behavior);
    const trace = bind(behavior);
    assertUntouched(behavior, trace, name);
    vectors.push({name, behavior, trace, controlBehavior, controlTrace, expected});
  }
  add("unused-event-id-at-64", (b) => { b.events[3].id = "a".repeat(64); });
  add("unused-event-id-at-65", (b) => { b.events[3].id = "a".repeat(65); }, "EVENT_LOOP_ID");
  add("unused-event-kind-invalid", (b) => { b.events[3].payload.kind = "tuple"; }, "EVENT_LOOP_SCHEMA");
  add("unused-event-field-name-at-64", (b) => { b.events[3].payload.fields[0].name = "a".repeat(64); });
  add("unused-event-field-name-at-65", (b) => { b.events[3].payload.fields[0].name = "a".repeat(65); }, "EVENT_LOOP_ID");
  add("sibling-id-at-64", (b) => { b.actors[1].id = "a".repeat(64); });
  add("sibling-id-at-65", (b) => { b.actors[1].id = "a".repeat(65); }, "EVENT_LOOP_ID");
  add("sibling-state-field-name-missing", (b) => { delete b.actors[1].state.fields[0].name; }, "EVENT_LOOP_PARSE");
  add("sibling-transition-id-missing", (b) => { delete b.actors[1].transitions[0].id; }, "EVENT_LOOP_PARSE");
  add("sibling-transition-when-missing", (b) => { delete b.actors[1].transitions[0].when; }, "EVENT_LOOP_PARSE");
  add("sibling-write-path-missing", (b) => { delete b.actors[1].transitions[0].writes[0].path; }, "EVENT_LOOP_PARSE");
  add("sibling-output-target-missing", (b) => { delete b.actors[1].transitions[0].outputs[0].target; }, "EVENT_LOOP_PARSE");
  add("sibling-output-event-missing", (b) => { delete b.actors[1].transitions[0].outputs[0].event; }, "EVENT_LOOP_PARSE");
  const pending = (kind: "defer" | "escalate") => (b: any): void => {
    const rule = b.actors[1].transitions[0];
    rule.writes = [];
    rule.outputs = [];
    rule.result = kind === "defer" ? {kind, key: rule.when} : {kind, request: rule.when};
  };
  add("sibling-defer-control", () => {}, undefined, pending("defer"));
  add("sibling-defer-key-missing", (b) => { delete b.actors[1].transitions[0].result.key; }, "EVENT_LOOP_PARSE", pending("defer"));
  add("sibling-escalate-control", () => {}, undefined, pending("escalate"));
  add("sibling-escalate-request-missing", (b) => { delete b.actors[1].transitions[0].result.request; }, "EVENT_LOOP_PARSE", pending("escalate"));
  return vectors;
}
