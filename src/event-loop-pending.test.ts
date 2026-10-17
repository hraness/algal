/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately forged foreign trace records. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { replayEventLoopTrace } from "./event-loop-replay";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const behavior = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
  return value;
}
function pending(kind: "defer" | "escalate", witness: JsonValue): {trace: any; model: any} {
  const model = structuredClone(behavior);
  const rule = model.actors[0].transitions[0];
  rule.writes = [];
  rule.outputs = [];
  rule.result = kind === "defer"
    ? {kind, key: {contract: "algal.expr.v1", program: witness}}
    : {kind, request: {contract: "algal.expr.v1", program: witness}};
  seal(model);
  const trace = structuredClone(fixture.base);
  trace.entries = [trace.entries[0]];
  trace.behavior = model.digest;
  const entry = trace.entries[0];
  entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  entry.decision = {kind: "accepted", transition: "increment", outcome: kind,
    stateDigest: hash({count: 0}), outputs: [], pending: witness,
    effects: {requested: 0, settled: 0, receipts: []},
    resources: {fuel: kind === "defer" ? 10 : 11, stateBytes: 11, outputEvents: 0}};
  return {trace: seal(trace), model};
}
function rejects(value: unknown, model: unknown, code: EventLoopContractError["code"]): void {
  expect(() => replayEventLoopTrace(value, model)).toThrow(new EventLoopContractError(code));
}

test("deferred and escalated values replay, but do not claim host delivery", () => {
  for (const [kind, witness] of [["defer", "ticket"], ["escalate", {action: "review"}]] as const) {
    const {trace, model} = pending(kind, witness);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(verifyEventLoopTraceStructure(trace, model).digest).toBe(trace.digest);
    expect(replayEventLoopTrace(trace, model)).toMatchObject({digest: trace.digest,
      summary: {accepted: 1, deferred: kind === "defer" ? 1 : 0,
        escalated: kind === "escalate" ? 1 : 0, fuelClaimed: kind === "defer" ? 10 : 11,
        effectsRequestedClaimed: 0}});
    for (const mutation of ["missing", "wrong-value", "wrong-fuel"] as const) {
      const wrong = structuredClone(trace);
      if (mutation === "missing") delete wrong.entries[0].decision.pending;
      if (mutation === "wrong-value") wrong.entries[0].decision.pending = false;
      if (mutation === "wrong-fuel") wrong.entries[0].decision.resources.fuel -= 1;
      seal(wrong);
      expect(parseEventLoopTrace(wrong).digest).toBe(wrong.digest);
      rejects(wrong, model, "EVENT_LOOP_SEMANTIC");
    }
  }
});

test("null pending witness is present for both outcomes, unlike an omitted field", () => {
  for (const kind of ["defer", "escalate"] as const) {
    const {trace, model} = pending(kind, null);
    trace.entries[0].decision.resources.fuel = 10; // guard 9, null literal 1
    seal(trace);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(replayEventLoopTrace(trace, model).digest).toBe(trace.digest);
    const missing = structuredClone(trace);
    delete missing.entries[0].decision.pending;
    seal(missing);
    expect(parseEventLoopTrace(missing).digest).toBe(missing.digest);
    rejects(missing, model, "EVENT_LOOP_SEMANTIC");
  }
});

test("numeric pending witness accepts a normalized 1.0 and refuses a different value", () => {
  const {trace, model} = pending("defer", 1);
  trace.entries[0].decision.pending = JSON.parse("1.0"); // JavaScript normalizes the spelling to 1.
  seal(trace);
  expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
  expect(replayEventLoopTrace(trace, model).digest).toBe(trace.digest);
  trace.entries[0].decision.pending = 2;
  seal(trace);
  rejects(trace, model, "EVENT_LOOP_SEMANTIC");
});

test("pending witness has a separate canonical byte limit and closed outcome shape", () => {
  const {trace, model} = pending("defer", "ticket");
  const boundary = structuredClone(trace);
  boundary.entries[0].decision.pending = "x".repeat(16_382); // JSON quotes make 16,384 bytes
  seal(boundary);
  expect(parseEventLoopTrace(boundary).digest).toBe(boundary.digest);
  rejects(boundary, model, "EVENT_LOOP_SEMANTIC");
  boundary.entries[0].decision.pending += "x";
  seal(boundary);
  rejects(boundary, model, "EVENT_LOOP_BOUNDS");
  const unexpected = structuredClone(fixture.base);
  unexpected.entries = [unexpected.entries[0]];
  unexpected.entries[0].decision.pending = null;
  seal(unexpected);
  rejects(unexpected, behavior, "EVENT_LOOP_UNKNOWN_KEY");
  const deep = structuredClone(trace);
  let value: JsonValue = null;
  for (let i = 0; i < 33; i++) value = [value];
  deep.entries[0].decision.pending = value;
  seal(deep);
  rejects(deep, model, "EVENT_LOOP_BOUNDS");
});

test("a pending expression that exhausts fuel is a failure, not an accepted request", () => {
  const {trace, model} = pending("escalate", {action: "review"});
  model.limits.maxTransitionFuel = trace.limits.maxTransitionFuel = 9;
  seal(model);
  trace.behavior = model.digest;
  const entry = trace.entries[0];
  entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  entry.decision = {kind: "failed", reason: "fuel-exhausted", transition: "increment",
    stateDigest: hash({count: 0}), resources: {fuel: 9, stateBytes: 11, outputEvents: 0}};
  seal(trace);
  expect(replayEventLoopTrace(trace, model).summary).toMatchObject({failed: 1, fuelClaimed: 9});
});
