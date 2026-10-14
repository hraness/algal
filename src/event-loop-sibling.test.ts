/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately malformed foreign behavior records. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";

const base = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
  return value;
}
function bind(behavior: any): any {
  const trace = structuredClone(base.base);
  trace.behavior = behavior.digest;
  for (const entry of trace.entries) {
    entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  }
  return seal(trace);
}
function withSibling(change?: (sibling: any) => void): {behavior: any; trace: any} {
  const behavior = structuredClone(pinned);
  const sibling = structuredClone(behavior.actors[0]);
  sibling.id = "observer";
  change?.(sibling);
  behavior.actors.push(sibling);
  seal(behavior);
  return {behavior, trace: bind(behavior)};
}

test("valid unselected actor remains bound to the trace without changing selected-actor counts", () => {
  const {behavior, trace} = withSibling();
  expect(verifyEventLoopTraceStructure(trace, behavior)).toEqual({
    digest: trace.digest, staticSummary: verifyEventLoopTraceStructure(base.base, pinned).staticSummary,
  });
});

test("a repeated event id wins over its malformed unused schema", () => {
  const behavior = structuredClone(pinned);
  behavior.events[2].id = "increment";
  behavior.events[2].payload.fields[0].type = "bytes";
  seal(behavior);
  const trace = bind(behavior);
  expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
  expect(() => verifyEventLoopTraceStructure(trace, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_ID"));
});

test("redigested trace cannot launder malformed unselected actor declarations", () => {
  const vectors: Array<[string, (sibling: any) => void, string]> = [
    ["state type", (actor) => { actor.state.fields[0].type = "invalid"; }, "EVENT_LOOP_SCHEMA"],
    ["state bytes", (actor) => { actor.state.fields[0].type = "string"; actor.state.fields[0].initial = "x".repeat(16_384); }, "EVENT_LOOP_BOUNDS"],
    ["missing transition", (actor) => { actor.transitions = []; }, "EVENT_LOOP_BOUNDS"],
    ["unknown event", (actor) => { actor.transitions[0].on = "undeclared"; }, "EVENT_LOOP_REFERENCE"],
    ["unknown field", (actor) => { actor.transitions[0].writes[0].path = ["undeclared"]; }, "EVENT_LOOP_REFERENCE"],
    ["duplicate write", (actor) => { actor.transitions[0].writes.push(structuredClone(actor.transitions[0].writes[0])); }, "EVENT_LOOP_SEMANTIC"],
    ["bad expression", (actor) => { actor.transitions[0].when.contract = "invalid"; }, "EVENT_LOOP_CONTRACT"],
    ["unknown target", (actor) => { actor.transitions[0].outputs[0].target = "undeclared"; }, "EVENT_LOOP_REFERENCE"],
    ["pending write", (actor) => { actor.transitions[0].outputs = []; actor.transitions[0].result = {kind: "defer", key: actor.transitions[0].when}; }, "EVENT_LOOP_SEMANTIC"],
    ["missing state kind", (actor) => { delete actor.state.kind; }, "EVENT_LOOP_PARSE"],
    ["extra state key", (actor) => { actor.state.extra = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
    ["missing state initial", (actor) => { delete actor.state.fields[0].initial; }, "EVENT_LOOP_PARSE"],
    ["extra state field key", (actor) => { actor.state.fields[0].optional = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
    ["missing transition on", (actor) => { delete actor.transitions[0].on; }, "EVENT_LOOP_PARSE"],
    ["extra transition key", (actor) => { actor.transitions[0].debug = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
    ["missing write value", (actor) => { delete actor.transitions[0].writes[0].value; }, "EVENT_LOOP_PARSE"],
    ["extra write key", (actor) => { actor.transitions[0].writes[0].extra = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
    ["empty write path", (actor) => { actor.transitions[0].writes[0].path = []; }, "EVENT_LOOP_BOUNDS"],
    ["nested write path", (actor) => { actor.transitions[0].writes[0].path = ["count", "nested"]; }, "EVENT_LOOP_BOUNDS"],
    ["missing output payload", (actor) => { delete actor.transitions[0].outputs[0].payload; }, "EVENT_LOOP_PARSE"],
    ["extra output key", (actor) => { actor.transitions[0].outputs[0].extra = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
    ["missing result kind", (actor) => { delete actor.transitions[0].result.kind; }, "EVENT_LOOP_PARSE"],
    ["extra result key", (actor) => { actor.transitions[0].result.extra = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
  ];
  for (const [name, change, code] of vectors) {
    const {behavior, trace} = withSibling(change);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(() => verifyEventLoopTraceStructure(trace, behavior), name).toThrow(new EventLoopContractError(code as EventLoopContractError["code"]));
  }
});

test("behavior metadata checks field shape and id and revision bounds after redigesting", () => {
  const vectors: Array<[string, (meta: any) => void, string | null]> = [
    ["missing id", (m) => { delete m.id; }, "EVENT_LOOP_PARSE"],
    ["missing revision", (m) => { delete m.revision; }, "EVENT_LOOP_PARSE"],
    ["missing source digest", (m) => { delete m.sourceDigest; }, "EVENT_LOOP_PARSE"],
    ["extra metadata key", (m) => { m.unexpected = true; }, "EVENT_LOOP_UNKNOWN_KEY"],
    ["id at 64", (m) => { m.id = "a".repeat(64); }, null],
    ["id at 65", (m) => { m.id = "a".repeat(65); }, "EVENT_LOOP_ID"],
    ["invalid id syntax", (m) => { m.id = "Mixed Case"; }, "EVENT_LOOP_ID"],
    ["revision at maximum", (m) => { m.revision = 2_147_483_647; }, null],
    ["revision above maximum", (m) => { m.revision = 2_147_483_648; }, "EVENT_LOOP_BOUNDS"],
    ["revision zero", (m) => { m.revision = 0; }, "EVENT_LOOP_BOUNDS"],
    ["invalid source digest", (m) => { m.sourceDigest = "sha256:INVALID"; }, "EVENT_LOOP_DIGEST"],
  ];
  for (const [name, change, code] of vectors) {
    const behavior = structuredClone(pinned);
    change(behavior.behavior);
    seal(behavior.behavior);
    seal(behavior);
    const trace = bind(behavior);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    if (code === null) expect(verifyEventLoopTraceStructure(trace, behavior).digest, name).toBe(trace.digest);
    else expect(() => verifyEventLoopTraceStructure(trace, behavior), name).toThrow(new EventLoopContractError(code as EventLoopContractError["code"]));
  }
  for (const [name, change, code] of [
    ["missing metadata digest", (b: any) => { delete b.behavior.digest; }, "EVENT_LOOP_PARSE"],
    ["stale metadata digest", (b: any) => { b.behavior.revision++; }, "EVENT_LOOP_DIGEST"],
  ] as const) {
    const behavior = structuredClone(pinned);
    change(behavior);
    seal(behavior);
    const trace = bind(behavior);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(() => verifyEventLoopTraceStructure(trace, behavior), name).toThrow(new EventLoopContractError(code));
  }
});

test("an unselected actor accepts 64 state fields and refuses 65", () => {
  for (const count of [64, 65]) {
    const {behavior, trace} = withSibling((actor) => {
      for (let i = 1; i < count; i++) actor.state.fields.push({name: `field-${i}`, type: "number", initial: 0});
    });
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    if (count === 64) expect(verifyEventLoopTraceStructure(trace, behavior).digest).toBe(trace.digest);
    else expect(() => verifyEventLoopTraceStructure(trace, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
  }
});

test("competing malformed siblings have a stable first refusal independent of actor list order", () => {
  for (const reverse of [false, true]) {
    const behavior = structuredClone(pinned);
    const high = structuredClone(behavior.actors[0]);
    high.id = "z-fault";
    high.state.fields[0].type = "invalid";
    const low = structuredClone(behavior.actors[0]);
    low.id = "a-fault";
    low.transitions = [];
    behavior.actors.push(...(reverse ? [low, high] : [high, low]));
    seal(behavior);
    const trace = bind(behavior);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(() => verifyEventLoopTraceStructure(trace, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
  }
});
