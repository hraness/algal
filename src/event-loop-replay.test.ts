/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately forged foreign trace records. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { replayEventLoopTrace, eventLoopNotificationDigest } from "./event-loop-replay";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const behavior = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): any {
  const {digest: _prior, ...body} = value;
  value.digest = hash(body);
  return value;
}
function identify(entry: any, trace: any): void {
  entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
}
function replayable(): any {
  const trace = structuredClone(fixture.base);
  const entry = trace.entries[0];
  entry.decision.resources.fuel = 27; // shared expr: guard 9, write 14, output 4
  entry.decision.outputs[0] = eventLoopNotificationDigest(entry.messageDigest, "increment", 0,
    "counter", "incremented", {amount: 1});
  trace.entries[3].decision.resources.fuel = 1; // literal reset write
  return seal(trace);
}
function failedAfterValidCommit(): any {
  const trace = replayable();
  trace.entries = [trace.entries[0], ...structuredClone(fixture.failed.entries.slice(1))];
  return seal(trace);
}
function failureCase(reason: "fuel-exhausted" | "expression-error" | "state-overflow" | "output-invalid"):
  {trace: any; model: any} {
  const model = structuredClone(behavior);
  const trace = replayable();
  trace.entries = [trace.entries[0]];
  const entry = trace.entries[0];
  let fuel: number;
  let transition: string | null;
  if (reason === "fuel-exhausted") {
    model.limits.maxTransitionFuel = trace.limits.maxTransitionFuel = 8;
    fuel = 8; transition = null; // guard exhausts its eight available fuel units
  } else if (reason === "expression-error") {
    model.actors[0].transitions[0].when.program = 0; // non-boolean guard
    fuel = 1; transition = null;
  } else if (reason === "state-overflow") {
    model.limits.maxStateBytes = trace.limits.maxStateBytes = 11;
    entry.payload.amount = 100;
    fuel = 23; transition = "increment"; // guard 9 + write 14, no output
  } else {
    model.actors[0].transitions[0].outputs[0].payload.program = 0; // not a record
    fuel = 24; transition = "increment"; // guard 9 + write 14 + literal 1
  }
  seal(model);
  trace.behavior = model.digest;
  identify(entry, trace);
  entry.decision = {kind: "failed", reason, transition, stateDigest: hash({count: 0}),
    resources: {fuel, stateBytes: 11, outputEvents: 0}};
  return {trace: seal(trace), model};
}
function pending(kind: "defer" | "escalate"): {trace: any; proposed: any} {
  const proposed = structuredClone(behavior);
  const rule = proposed.actors[0].transitions[0];
  rule.writes = [];
  rule.outputs = [];
  rule.result = kind === "defer"
    ? {kind, key: {contract: "algal.expr.v1", program: "ticket"}}
    : {kind, request: {contract: "algal.expr.v1", program: {action: "review"}}};
  seal(proposed);
  const trace = replayable();
  trace.entries = [trace.entries[0]];
  const entry = trace.entries[0];
  trace.behavior = proposed.digest;
  identify(entry, trace);
  entry.decision = {kind: "accepted", transition: "increment", outcome: kind, stateDigest: hash({count: 0}),
    outputs: [], effects: {requested: 0, settled: 0, receipts: []},
    resources: {fuel: 0, stateBytes: Buffer.byteLength(canonicalize({count: 0})), outputEvents: 0}};
  return {trace: seal(trace), proposed};
}

test("replay derives ordered guards, writes, output identity and measured fuel", () => {
  const trace = replayable();
  expect(replayEventLoopTrace(trace, behavior)).toMatchObject({digest: trace.digest,
    summary: {accepted: 2, duplicate: 1, backpressure: 1, continued: 1, quiet: 1,
      fuelClaimed: 28, notificationsClaimed: 1, effectsRequestedClaimed: 0}});
  expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
  const substituted = structuredClone(trace);
  substituted.entries[0].decision.outputs[0] = `sha256:${"0".repeat(64)}`;
  seal(substituted);
  expect(verifyEventLoopTraceStructure(substituted, behavior).digest).toBe(substituted.digest);
  expect(() => replayEventLoopTrace(substituted, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  const wrongState = structuredClone(trace);
  wrongState.entries[0].decision.stateDigest = hash({count: 2});
  seal(wrongState);
  expect(() => replayEventLoopTrace(wrongState, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  const wrongFuel = structuredClone(trace);
  wrongFuel.entries[0].decision.resources.fuel = 26;
  seal(wrongFuel);
  expect(() => replayEventLoopTrace(wrongFuel, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
});

test("a false guard leaves initial state; sorted guarded rules cannot be skipped", () => {
  const trace = replayable();
  trace.entries = [trace.entries[0]];
  const first = trace.entries[0];
  first.payload.amount = 0;
  identify(first, trace);
  first.decision = {kind: "accepted", transition: null, outcome: "no-transition", stateDigest: hash({count: 0}),
    outputs: [], effects: {requested: 0, settled: 0, receipts: []},
    resources: {fuel: 9, stateBytes: Buffer.byteLength(canonicalize({count: 0})), outputEvents: 0}};
  seal(trace);
  expect(replayEventLoopTrace(trace, behavior).summary.unmatched).toBe(1);
  const wrong = structuredClone(trace);
  wrong.entries[0].payload.amount = 1;
  identify(wrong.entries[0], wrong);
  seal(wrong);
  expect(() => replayEventLoopTrace(wrong, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
});

test("fuel budget and ordinal boundaries are limited; invented failure refuses", () => {
  const trace = replayable();
  expect(eventLoopNotificationDigest(trace.entries[0].messageDigest, "increment", 0, "counter", "incremented", {amount:1})).toMatch(/^sha256:/);
  expect(eventLoopNotificationDigest(trace.entries[0].messageDigest, "increment", 63, "counter", "incremented", {amount:1})).toMatch(/^sha256:/);
  for (const invalid of [-1, 64]) expect(() => eventLoopNotificationDigest(
    trace.entries[0].messageDigest, "increment", invalid, "counter", "incremented", {amount:1},
  )).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
  const over = structuredClone(behavior);
  over.limits.maxTransitionFuel = 26;
  seal(over);
  trace.behavior = over.digest;
  for (const entry of trace.entries) identify(entry, trace);
  trace.limits.maxTransitionFuel = 26;
  trace.entries[0].decision.outputs[0] = eventLoopNotificationDigest(trace.entries[0].messageDigest,
    "increment", 0, "counter", "incremented", {amount:1});
  seal(trace);
  expect(() => replayEventLoopTrace(trace, over)).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
  expect(() => replayEventLoopTrace(fixture.failed, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
});

test("all four deterministic failure reasons replay without committing state or outputs", () => {
  for (const reason of ["fuel-exhausted", "expression-error", "state-overflow", "output-invalid"] as const) {
    const {trace, model} = failureCase(reason);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(verifyEventLoopTraceStructure(trace, model).digest).toBe(trace.digest);
    expect(replayEventLoopTrace(trace, model)).toMatchObject({digest: trace.digest,
      summary: {failed: 1, accepted: 0, fuelClaimed: trace.entries[0].decision.resources.fuel}});
    for (const mutation of ["fuel", "reason", "transition"] as const) {
      const wrong = structuredClone(trace);
      const decision = wrong.entries[0].decision;
      if (mutation === "fuel") decision.resources.fuel += reason === "fuel-exhausted" ? -1 : 1;
      if (mutation === "reason") decision.reason = reason === "output-invalid" ? "state-overflow" : "output-invalid";
      if (mutation === "transition") decision.transition = decision.transition === null ? "increment" : null;
      seal(wrong);
      expect(() => replayEventLoopTrace(wrong, model)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
    }
  }
  const {trace, model} = failureCase("state-overflow");
  const reset = structuredClone(replayable().entries[3]);
  identify(reset, trace);
  trace.entries.push(reset);
  seal(trace);
  expect(replayEventLoopTrace(trace, model).summary).toMatchObject({failed: 1, quiet: 1, fuelClaimed: 24});
});

test("invented failure and pending records refuse after shape and structure acceptance", () => {
  const failed = failedAfterValidCommit();
  expect(parseEventLoopTrace(failed).digest).toBe(failed.digest);
  expect(verifyEventLoopTraceStructure(failed, behavior).digest).toBe(failed.digest);
  expect(replayEventLoopTrace(seal({...failed, entries: [failed.entries[0]]}), behavior).summary.continued).toBe(1);
  expect(() => replayEventLoopTrace(failed, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  for (const kind of ["defer", "escalate"] as const) {
    const {trace, proposed} = pending(kind);
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(verifyEventLoopTraceStructure(trace, proposed).digest).toBe(trace.digest);
    expect(() => replayEventLoopTrace(trace, proposed)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  }
});

test("foreign accessors never run during replay", () => {
  let read = 0;
  const trace = replayable();
  Object.defineProperty(trace, "actor", {enumerable: true, get() { read++; return "counter"; }});
  expect(() => replayEventLoopTrace(trace, behavior)).toThrow(new EventLoopContractError("EVENT_LOOP_PARSE"));
  expect(read).toBe(0);
});
