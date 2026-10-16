/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately malformed foreign behavior. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { replayEventLoopTrace } from "./event-loop-replay";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): any {
  const {digest: _prior, ...body} = value;
  value.digest = hash(body);
  return value;
}
function sibling(program: JsonValue, slot: "guard" | "write" = "guard"): {behavior: any; trace: any} {
  const behavior = structuredClone(pinned);
  const unused = structuredClone(behavior.actors[0]);
  unused.id = "observer";
  if (slot === "guard") unused.transitions[0].when.program = program;
  else unused.transitions[0].writes[0].value.program = program;
  behavior.actors.push(unused);
  seal(behavior);
  const trace = structuredClone(fixture.base);
  trace.entries = [trace.entries[3]]; // an accepted reset with no output and one unit of fuel
  trace.entries[0].decision.resources.fuel = 1;
  trace.behavior = behavior.digest;
  const entry = trace.entries[0];
  entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  return {behavior, trace: seal(trace)};
}

test("replay checks malformed expressions even for an actor absent from the trace", () => {
  const valid = sibling(["get", "event", "amount"]);
  expect(replayEventLoopTrace(valid.trace, valid.behavior).digest).toBe(valid.trace.digest);
  const invalid = sibling(["not-an-op"]);
  expect(parseEventLoopTrace(invalid.trace).digest).toBe(invalid.trace.digest);
  expect(verifyEventLoopTraceStructure(invalid.trace, invalid.behavior).digest).toBe(invalid.trace.digest);
  expect(() => replayEventLoopTrace(invalid.trace, invalid.behavior))
    .toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
});

test("replay rejects an unselected actor's unknown state-write name", () => {
  const valid = sibling(["get", "event", "amount"], "write");
  expect(replayEventLoopTrace(valid.trace, valid.behavior).digest).toBe(valid.trace.digest);
  const invalid = sibling(["get", "unknown"], "write");
  expect(parseEventLoopTrace(invalid.trace).digest).toBe(invalid.trace.digest);
  expect(verifyEventLoopTraceStructure(invalid.trace, invalid.behavior).digest).toBe(invalid.trace.digest);
  expect(() => replayEventLoopTrace(invalid.trace, invalid.behavior))
    .toThrow(new EventLoopContractError("EVENT_LOOP_REFERENCE"));
});
