/* eslint-disable @typescript-eslint/no-explicit-any -- Intentional malformed foreign records. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const behavior = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const trace = (): any => structuredClone(fixture.base);
const model = (): any => structuredClone(behavior);
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
  return value;
}
function code(value: unknown, proposed: unknown = behavior): string {
  try { verifyEventLoopTraceStructure(value, proposed); return "ACCEPTED"; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return error.code; }
}

test("pinned behavior joins the trace and derives declaration counts, not resource claims", () => {
  expect(verifyEventLoopTraceStructure(trace(), behavior)).toEqual({digest: fixture.base.digest, staticSummary: {
    events: 3, transitions: 2, writes: 2, notifications: 1, deferrals: 0, escalations: 0,
  }});
  expect(code(fixture.failed)).toBe("ACCEPTED");
});

test("re-digested reset cannot claim increment, notification, or a nonexistent transition", () => {
  const forged = trace();
  forged.entries[3].decision = structuredClone(forged.entries[0].decision);
  seal(forged);
  expect(parseEventLoopTrace(forged).digest).toBe(forged.digest);
  expect(code(forged)).toBe("EVENT_LOOP_REFERENCE");
  forged.entries[3].decision.transition = "reset";
  expect(code(seal(forged))).toBe("EVENT_LOOP_SEMANTIC");
  forged.entries[3].decision.outcome = "quiet";
  forged.entries[3].decision.outputs = [];
  forged.entries[3].decision.resources.outputEvents = 0;
  expect(code(seal(forged))).toBe("ACCEPTED"); // No expression evaluation.
  forged.entries[3].decision.transition = "nonexistent";
  expect(code(seal(forged))).toBe("EVENT_LOOP_REFERENCE");
});

test("foreign behavior, actor, limits and typed event payload are checked", () => {
  const wrong = trace();
  wrong.entries[3].payload = {amount: 1};
  wrong.entries[3].eventDigest = hash({behavior: wrong.behavior, actor: wrong.actor, source: wrong.entries[3].source,
    sequence: 0, type: "reset", payload: wrong.entries[3].payload});
  wrong.entries[3].messageDigest = hash({event: wrong.entries[3].eventDigest, target: wrong.actor, delivery: "later"});
  expect(code(seal(wrong))).toBe("EVENT_LOOP_UNKNOWN_KEY");
  const badType = trace();
  badType.entries[0].payload.amount = "1";
  badType.entries[0].eventDigest = hash({behavior: badType.behavior, actor: badType.actor,
    source: "source-a", sequence: 0, type: "increment", payload: badType.entries[0].payload});
  badType.entries[0].messageDigest = hash({event: badType.entries[0].eventDigest, target: badType.actor, delivery: "first"});
  badType.entries[1].payload.amount = "1";
  badType.entries[1].eventDigest = badType.entries[0].eventDigest;
  badType.entries[1].messageDigest = hash({event: badType.entries[1].eventDigest, target: badType.actor, delivery: "again"});
  expect(code(seal(badType))).toBe("EVENT_LOOP_SCHEMA");
  const mismatch = trace();
  mismatch.limits.maxMailboxDepth = 65;
  mismatch.entries[2].depthBefore = 65;
  expect(code(seal(mismatch))).toBe("EVENT_LOOP_SEMANTIC");
  const anotherActor = trace();
  anotherActor.actor = "unknown";
  for (const entry of anotherActor.entries) {
    entry.eventDigest = hash({behavior: anotherActor.behavior, actor: anotherActor.actor,
      source: entry.source, sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: anotherActor.actor, delivery: entry.delivery});
  }
  expect(code(seal(anotherActor))).toBe("EVENT_LOOP_REFERENCE");
});

test("behavior digest, byte limit, unknown keys and accessors reject safely", () => {
  const changed = model();
  changed.actors[0].transitions[1].outputs.push(changed.actors[0].transitions[0].outputs[0]);
  expect(code(trace(), changed)).toBe("EVENT_LOOP_DIGEST");
  const extra = model();
  extra.unexpected = 1;
  expect(code(trace(), extra)).toBe("EVENT_LOOP_UNKNOWN_KEY");
  const oversized = model();
  oversized.extra = "x".repeat(65_537);
  expect(code(trace(), oversized)).toBe("EVENT_LOOP_BOUNDS");
  const accessor = model();
  let invoked = 0;
  Object.defineProperty(accessor.actors[0].transitions[0], "when", {enumerable: true, get() { invoked++; return null; }});
  expect(code(trace(), accessor)).toBe("EVENT_LOOP_PARSE");
  expect(invoked).toBe(0);
  const cycle = model();
  cycle.actors[0].state.fields[0].initial = cycle;
  expect(code(trace(), cycle)).toBe("EVENT_LOOP_PARSE");
});

test("re-digested behavior cannot write one state field twice in a transition", () => {
  const repeated = model();
  repeated.actors[0].transitions[0].writes.push(structuredClone(repeated.actors[0].transitions[0].writes[0]));
  seal(repeated);
  const bound = trace();
  bound.behavior = repeated.digest;
  for (const entry of bound.entries) {
    entry.eventDigest = hash({behavior: bound.behavior, actor: bound.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: bound.actor, delivery: entry.delivery});
  }
  seal(bound);
  expect(parseEventLoopTrace(bound).digest).toBe(bound.digest);
  expect(code(bound, repeated)).toBe("EVENT_LOOP_SEMANTIC");
});
