/* eslint-disable @typescript-eslint/no-explicit-any -- Dense behavior bound fixtures. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError } from "./event-loop-contract";
import { summarizeEventLoopBehavior } from "./event-loop-behavior";

const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = `sha256:${createHash("sha256").update(canonicalize(body as JsonValue)).digest("hex")}`;
  return value;
}
function dense(): any {
  const b = structuredClone(pinned);
  b.limits = {maxEventBytes: 1, maxStateBytes: 2, maxOutputEvents: 0,
    maxTransitionFuel: 1, maxMailboxDepth: 1};
  b.events = Array.from({length: 128}, (_, i) => ({id: `event-${i}`, payload: {kind: "record",
    fields: Array.from({length: 64}, (_, j) => ({name: `field-${j}`, type: "number"}))}}));
  b.actors[0].state.fields = [];
  b.actors[0].transitions = b.events.map((event: any, i: number) => ({
    id: `rule-${i}`, on: event.id, when: {contract: "algal.expr.v1", program: ["get", "event"]},
    writes: [], outputs: [], result: {kind: "quiet"},
  }));
  return seal(b);
}

test("zero-output and minimum declared limits admit a behavior without inventing a delivery", () => {
  const b = dense();
  const result = summarizeEventLoopBehavior(b, "counter");
  expect(result.summary.limits).toEqual(b.limits);
  expect(result.summary.inputEventTypes).toHaveLength(128);
  expect(result.summary.reads.eventFields).toHaveLength(128);
  expect(result.summary.reads.eventFields.every(({fields}) => fields.length === 64)).toBe(true);
  expect(result.summary.reads.stateFields).toEqual([]);
  expect(result.summary.emits).toEqual([]);
  expect(Buffer.byteLength(canonicalize(result.summary as JsonValue), "utf8")).toBeLessThanOrEqual(1_048_576);
  const excess = structuredClone(b);
  excess.events[0].payload.fields.push({name: "field-extra", type: "number"});
  seal(excess);
  expect(() => summarizeEventLoopBehavior(excess, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
});

test("transition count covers the maximum and refuses the first excess", () => {
  const b = dense();
  b.actors[0].transitions.push(...Array.from({length: 128}, (_, i) => ({
    id: `extra-${i}`, on: `event-${i}`, when: null, writes: [], outputs: [], result: {kind: "quiet"},
  })));
  seal(b);
  expect(summarizeEventLoopBehavior(b, "counter").summary.inputEventTypes).toHaveLength(128);
  b.actors[0].transitions.push({id: "extra-last", on: "event-0", when: null,
    writes: [], outputs: [], result: {kind: "quiet"}});
  seal(b);
  expect(() => summarizeEventLoopBehavior(b, "counter")).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
});
