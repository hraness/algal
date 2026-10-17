/* eslint-disable @typescript-eslint/no-explicit-any -- Boundary mutations intentionally create invalid records. */
import {expect, test} from "bun:test";
import {createHash} from "node:crypto";
import {canonicalize, type JsonValue} from "./values";
import {EventLoopContractError} from "./event-loop-contract";
import {verifyEventLoopTraceStructure} from "./event-loop-structure";
const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const original = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const code = (trace: unknown, behavior: unknown): string => {
  try { verifyEventLoopTraceStructure(trace, behavior); return "ACCEPTED"; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return error.code; }
};
function bind(model: any, trace: any = structuredClone(fixture.base)): any {
  const {digest: _oldModel, ...body} = model;
  model.digest = hash(body);
  trace.behavior = model.digest;
  trace.limits = structuredClone(model.limits);
  for (const entry of trace.entries) {
    entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  }
  const {digest: _oldTrace, ...traceBody} = trace;
  trace.digest = hash(traceBody);
  return trace;
}
test("event and actor lists accept their edges and reject first excess", () => {
  const e = structuredClone(original);
  e.events = [original.events[1]];
  e.actors[0].transitions = [original.actors[0].transitions[1]];
  const single = structuredClone(fixture.base);
  single.entries = [single.entries[3]];
  expect(code(bind(e, single), e)).toBe("ACCEPTED");
  e.events = [];
  expect(code(bind(e, single), e)).toBe("EVENT_LOOP_BOUNDS");
  e.events = Array.from({length: 128}, (_, i) => ({...original.events[1], id: `event-${i}`}));
  e.events[0] = original.events[1];
  expect(code(bind(e, single), e)).toBe("ACCEPTED");
  e.events.push({...original.events[1], id: "extra"});
  expect(code(bind(e, single), e)).toBe("EVENT_LOOP_BOUNDS");
  const a = structuredClone(original);
  a.actors = [original.actors[0]];
  expect(code(bind(a), a)).toBe("ACCEPTED");
  a.actors = [];
  expect(code(bind(a), a)).toBe("EVENT_LOOP_BOUNDS");
  a.actors = Array.from({length: 64}, (_, i) => ({...original.actors[0], id: `actor-${i}`}));
  a.actors[0] = original.actors[0];
  expect(code(bind(a), a)).toBe("ACCEPTED");
  a.actors.push({...original.actors[0], id: "extra"});
  expect(code(bind(a), a)).toBe("EVENT_LOOP_BOUNDS");
});
test("selected actor's transitions, state fields, writes and outputs are limited", () => {
  const t = structuredClone(original);
  t.actors[0].transitions = [original.actors[0].transitions[0]];
  const single = structuredClone(fixture.base);
  single.entries = [single.entries[0]];
  expect(code(bind(t, single), t)).toBe("ACCEPTED");
  t.actors[0].transitions = [];
  expect(code(bind(t, single), t)).toBe("EVENT_LOOP_BOUNDS");
  t.actors[0].transitions = Array.from({length: 256}, (_, i) => ({...original.actors[0].transitions[1], id: `rule-${i}`}));
  t.actors[0].transitions[0] = original.actors[0].transitions[0];
  expect(code(bind(t, single), t)).toBe("ACCEPTED");
  t.actors[0].transitions.push({...original.actors[0].transitions[1], id: "extra"});
  expect(code(bind(t, single), t)).toBe("EVENT_LOOP_BOUNDS");
  const fields = structuredClone(original);
  fields.actors[0].state.fields = Array.from({length: 64}, (_, i) => ({name: `field-${i}`, type: "number", initial: 0}));
  fields.actors[0].state.fields[0] = original.actors[0].state.fields[0];
  expect(code(bind(fields), fields)).toBe("ACCEPTED");
  fields.actors[0].state.fields.push({name: "extra", type: "number", initial: 0});
  expect(code(bind(fields), fields)).toBe("EVENT_LOOP_BOUNDS");
  const writes = structuredClone(original);
  writes.actors[0].state.fields = fields.actors[0].state.fields.slice(0, 64);
  writes.actors[0].transitions[1].writes = writes.actors[0].state.fields.map((field: any) => ({path: [field.name], value: original.actors[0].transitions[1].writes[0].value}));
  expect(code(bind(writes), writes)).toBe("ACCEPTED");
  writes.actors[0].transitions[1].writes.push(original.actors[0].transitions[1].writes[0]);
  expect(code(bind(writes), writes)).toBe("EVENT_LOOP_BOUNDS");
  const outputs = structuredClone(original);
  outputs.limits.maxOutputEvents = 64;
  outputs.actors[0].transitions[0].outputs = Array(64).fill(original.actors[0].transitions[0].outputs[0]);
  const reset = structuredClone(fixture.base);
  reset.entries = [reset.entries[3]];
  expect(code(bind(outputs, reset), outputs)).toBe("ACCEPTED");
  outputs.actors[0].transitions[0].outputs.push(original.actors[0].transitions[0].outputs[0]);
  expect(code(bind(outputs, reset), outputs)).toBe("EVENT_LOOP_BOUNDS");
});
test("behavior, expression, depth and collection limits reject their first excess", () => {
  const b = structuredClone(original);
  const expr = b.actors[0].transitions[0].when;
  const envelopeBytes = Buffer.byteLength(canonicalize({contract: "algal.expr.v1", program: ""}));
  expr.program = "x".repeat(16_384 - envelopeBytes);
  expect(code(bind(b), b)).toBe("ACCEPTED");
  expr.program += "x";
  expect(code(bind(b), b)).toBe("EVENT_LOOP_BOUNDS");
  expr.program = Array(1_024).fill(0);
  expect(code(bind(b), b)).toBe("ACCEPTED");
  expr.program.push(0);
  expect(code(fixture.base, b)).toBe("EVENT_LOOP_BOUNDS");
  expr.program = Object.fromEntries(Array.from({length: 257}, (_, i) => [`field-${i}`, 0]));
  expect(code(fixture.base, b)).toBe("EVENT_LOOP_BOUNDS");
  expr.program = "x".repeat(65_537);
  expect(code(fixture.base, b)).toBe("EVENT_LOOP_BOUNDS");
  expr.program = Array(32).fill(null).reduce((v) => [v], 0);
  expect(code(fixture.base, b)).toBe("EVENT_LOOP_BOUNDS");
  const huge = structuredClone(original);
  huge.actors[0].transitions = Array.from({length: 70}, (_, i) => ({...original.actors[0].transitions[0], id: `rule-${i}`,
    when: {contract: "algal.expr.v1", program: "x".repeat(16_300)}}));
  expect(code(fixture.base, huge)).toBe("EVENT_LOOP_BOUNDS"); // Over 1,048,576 bytes.
});
