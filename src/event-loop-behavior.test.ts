/* eslint-disable @typescript-eslint/no-explicit-any -- Redigested invalid foreign behavior vectors. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError } from "./event-loop-contract";
import { summarizeEventLoopBehavior } from "./event-loop-behavior";

const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(behavior: any): any {
  const {digest: _old, ...body} = behavior;
  behavior.digest = hash(body);
  return behavior;
}
const envelope = (program: JsonValue): any => ({contract: "algal.expr.v1", program});
function mutate(change: (behavior: any) => void): any {
  const behavior = structuredClone(pinned);
  change(behavior);
  return seal(behavior);
}

test("behavior summary needs no trace and distinguishes declared effects from execution", () => {
  const result = summarizeEventLoopBehavior(pinned, "counter");
  expect(result.digest).toBe(pinned.digest);
  expect(result.summaryDigest).toBe(hash(result.summary as JsonValue));
  expect(result.summary).toEqual({
    actor: "counter", inputEventTypes: ["increment", "reset"],
    reads: {stateFields: ["count"], eventFields: [{event: "increment", fields: ["amount"]}]},
    writes: ["count"], emits: ["incremented"], pendingOutcomes: [], capabilities: [],
    limits: pinned.limits,
  });
  const requests = mutate((b) => {
    b.actors[0].transitions.push({id: "wait", on: "reset", when: null, writes: [], outputs: [],
      result: {kind: "defer", key: envelope("pending")}});
    b.actors[0].transitions.push({id: "escalate", on: "reset", when: null, writes: [], outputs: [],
      result: {kind: "escalate", request: envelope({type: "text"})}});
  });
  expect(summarizeEventLoopBehavior(requests, "counter").summary.pendingOutcomes).toEqual(["defer", "escalate"]);
  expect(summarizeEventLoopBehavior(requests, "counter").summary.capabilities).toEqual([]);
});

test("read sets cover whole records and dynamic paths, without counting quoted programs", () => {
  const behavior = mutate((b) => {
    b.events[0].payload.fields.push({name: "other", type: "number"});
    b.actors[0].state.fields.push({name: "other", type: "number", initial: 0});
    b.actors[0].transitions[0].when = envelope(["get", "event"]);
    b.actors[0].transitions[0].writes[0].value = envelope(["get", "state", ["quote", "count"]]);
    b.actors[0].transitions[0].outputs[0].payload = envelope(["quote", ["get", "state", "not-a-field"]]);
  });
  expect(summarizeEventLoopBehavior(behavior, "counter").summary.reads).toEqual({
    stateFields: ["count", "other"], eventFields: [{event: "increment", fields: ["amount", "other"]}],
  });
  const dynamic = mutate((b) => {
    b.actors[0].state.fields.push({name: "other", type: "number", initial: 0});
    b.actors[0].transitions[0].when = envelope(["get", ["if", true, "event", "state"]]);
  });
  expect(summarizeEventLoopBehavior(dynamic, "counter").summary.reads).toEqual({
    stateFields: ["count", "other"], eventFields: [{event: "increment", fields: ["amount"]}],
  });
});

test("selected actor changes only its own summary but malformed siblings refuse", () => {
  const behavior = mutate((b) => {
    const sibling = structuredClone(b.actors[0]);
    sibling.id = "observer";
    sibling.transitions[0].outputs = [];
    sibling.transitions[0].result = {kind: "quiet"};
    b.actors.push(sibling);
  });
  expect(summarizeEventLoopBehavior(behavior, "counter").summary.emits).toEqual(["incremented"]);
  expect(summarizeEventLoopBehavior(behavior, "observer").summary.emits).toEqual([]);
  behavior.actors[1].transitions[0].when.program = ["bad-op", 1];
  seal(behavior);
  for (const actor of ["counter", "observer"]) {
    expect(() => summarizeEventLoopBehavior(behavior, actor)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  }
  behavior.actors[1].transitions[0].when.program = ["get", "missing"];
  seal(behavior);
  expect(() => summarizeEventLoopBehavior(behavior, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_REFERENCE"));
});

test("behavior summary refuses stale digests, unknown keys, missing references and foreign getters", () => {
  const stale = structuredClone(pinned);
  stale.actors[0].transitions[0].on = "reset";
  expect(() => summarizeEventLoopBehavior(stale, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_DIGEST"));
  const extra = mutate((b) => { b.events[2].payload.extra = true; });
  expect(() => summarizeEventLoopBehavior(extra, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_UNKNOWN_KEY"));
  expect(() => summarizeEventLoopBehavior(pinned, "unknown")).toThrow(new EventLoopContractError("EVENT_LOOP_REFERENCE"));
  expect(() => summarizeEventLoopBehavior(pinned, "A")).toThrow(new EventLoopContractError("EVENT_LOOP_ID"));
  expect(() => summarizeEventLoopBehavior(pinned, "a".repeat(65))).toThrow(new EventLoopContractError("EVENT_LOOP_ID"));
  let calls = 0;
  const foreign = {...pinned};
  Object.defineProperty(foreign, "actors", {enumerable: true, get() { calls++; return pinned.actors; }});
  expect(() => summarizeEventLoopBehavior(foreign, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_PARSE"));
  expect(calls).toBe(0);
});

test("input, state, output and pending summary lists stay inside source bounds", () => {
  const max = mutate((b) => {
    b.limits.maxOutputEvents = 64;
    b.limits.maxEventBytes = 65_536;
    b.limits.maxStateBytes = 262_144;
    b.limits.maxTransitionFuel = 100_000;
    b.limits.maxMailboxDepth = 1_024;
    b.events = Array.from({length: 128}, (_, i) => ({id: `event-${i}`, payload: {kind: "record", fields: []}}));
    b.actors[0].state.fields = Array.from({length: 64}, (_, i) => ({name: `field-${i}`, type: "number", initial: 0}));
    b.actors[0].transitions = b.events.map((event: any, i: number) => ({id: `rule-${i}`, on: event.id,
      when: envelope(["get", "state"]), writes: [{path: [`field-${i % 64}`], value: envelope(1)}],
      outputs: [{kind: "notify", target: "self", event: event.id, payload: envelope({})}], result: {kind: "continue"}}));
  });
  const result = summarizeEventLoopBehavior(max, "counter");
  expect(result.summary.inputEventTypes).toHaveLength(128);
  expect(result.summary.reads.stateFields).toHaveLength(64);
  expect(result.summary.writes).toHaveLength(64);
  expect(result.summary.emits).toHaveLength(128);
  expect(Buffer.byteLength(canonicalize(result.summary as JsonValue), "utf8")).toBeLessThanOrEqual(1_048_576);
  expect(result.summary.limits.maxTransitionFuel).toBe(100_000);
  const excessEvents = mutate((b) => { b.events = [...max.events, {id: "event-extra", payload: {kind: "record", fields: []}}]; });
  expect(() => summarizeEventLoopBehavior(excessEvents, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
  const excessFields = mutate((b) => { b.actors[0].state.fields = [...max.actors[0].state.fields,
    {name: "field-extra", type: "number", initial: 0}]; });
  expect(() => summarizeEventLoopBehavior(excessFields, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
  const excessOutput = mutate((b) => { b.actors[0].transitions[0].outputs = Array.from({length: 65},
    () => structuredClone(b.actors[0].transitions[0].outputs[0])); b.limits.maxOutputEvents = 64; });
  expect(() => summarizeEventLoopBehavior(excessOutput, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
});
