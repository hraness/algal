/* eslint-disable @typescript-eslint/no-explicit-any -- Mutations deliberately feed malformed fixture values to the unknown parser. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { eventLoopVectors, tsResults } from "../scripts/event-loop-contract-parity";

const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const base = fixture.base as any;
const clone = (): any => structuredClone(base);
const seal = (trace: any): any => {
  for (const entry of trace.entries) {
    entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  }
  const { digest: _digest, ...body } = trace;
  trace.digest = hash(body);
  return trace;
};
const code = (value: unknown): string => {
  try { parseEventLoopTrace(value); return "ACCEPTED"; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return error.code; }
};

test("shared fixture validates digest and all deterministic refusals", async () => {
  const vectors = await eventLoopVectors();
  expect(tsResults(vectors).map((v) => Object.values(v.result)[0])).toEqual(vectors.map((v) => v.expected));
  expect(parseEventLoopTrace(base)).toEqual({digest: base.digest, entries: 4});
  expect(parseEventLoopTrace(fixture.failed)).toEqual({digest: fixture.failed.digest, entries: 3});
});

test("logical key rejects re-digested changes, while overflow does not bind a key", () => {
  const conflict = clone();
  conflict.entries[1].payload.amount = 3;
  expect(code(seal(conflict))).toBe("EVENT_LOOP_ID");
  const admitted = clone();
  admitted.entries[2].depthBefore = 0;
  admitted.entries[2].decision = structuredClone(admitted.entries[3].decision);
  admitted.entries[2].delivery = "before";
  admitted.entries[3].decision = {kind: "duplicate"};
  expect(code(seal(admitted))).toBe("ACCEPTED");
  admitted.entries[3].payload = {altered: true};
  expect(code(seal(admitted))).toBe("EVENT_LOOP_ID");
});

test("identity, receipt, and resource summaries are claims, not host calls", () => {
  const trace = clone();
  const accepted = trace.entries[0].decision;
  accepted.effects = {requested: 1, settled: 1, receipts: [hash({effect: "local"})]};
  expect(code(seal(trace))).toBe("ACCEPTED");
  accepted.effects.receipts.push(hash(null));
  expect(code(seal(trace))).toBe("EVENT_LOOP_BOUNDS");
  accepted.effects.receipts.pop();
  accepted.effects.settled = 2;
  expect(code(seal(trace))).toBe("EVENT_LOOP_BOUNDS");
  accepted.effects = {requested: 0, settled: 0, receipts: []};
  accepted.resources.outputEvents = 0;
  expect(code(seal(trace))).toBe("EVENT_LOOP_SEMANTIC");
});

test("failed delivery binds its key, keeps state, and cannot claim outputs or effects", () => {
  const failed = structuredClone(fixture.failed);
  const decision = failed.entries[1].decision;
  for (const reason of ["fuel-exhausted", "expression-error", "state-overflow", "output-invalid"]) {
    decision.reason = reason;
    expect(code(seal(failed))).toBe("ACCEPTED");
  }
  decision.transition = "x".repeat(64);
  decision.resources.fuel = 0;
  decision.resources.stateBytes = 0;
  expect(code(seal(failed))).toBe("ACCEPTED");
  decision.transition += "x";
  expect(code(seal(failed))).toBe("EVENT_LOOP_ID");
  decision.transition = null;
  decision.resources.stateBytes = failed.limits.maxStateBytes;
  expect(code(seal(failed))).toBe("ACCEPTED");
  decision.resources.stateBytes++;
  expect(code(seal(failed))).toBe("EVENT_LOOP_BOUNDS");
  decision.resources.stateBytes = 11;
  decision.resources.outputEvents = 1;
  expect(code(seal(failed))).toBe("EVENT_LOOP_SEMANTIC");
  decision.resources.outputEvents = 0;
  decision.effects = {requested: 0, settled: 0, receipts: []};
  expect(code(seal(failed))).toBe("EVENT_LOOP_UNKNOWN_KEY");
  delete decision.effects;
  decision.stateDigest = hash(null);
  expect(code(seal(failed))).toBe("EVENT_LOOP_SEMANTIC");
  decision.stateDigest = failed.entries[0].decision.stateDigest;
  failed.entries[2].payload.amount++;
  expect(code(seal(failed))).toBe("EVENT_LOOP_ID");
});

test("pending and unmatched decisions cannot change previously recorded state", () => {
  for (const outcome of ["defer", "escalate", "no-transition"]) {
    const trace = clone();
    const decision = trace.entries[3].decision;
    decision.outcome = outcome;
    decision.transition = outcome === "no-transition" ? null : "reset";
    expect(code(seal(trace))).toBe("EVENT_LOOP_SEMANTIC");
    decision.stateDigest = trace.entries[0].decision.stateDigest;
    expect(code(seal(trace))).toBe("ACCEPTED");
  }
});

test("count and declared byte limits enforce both edges and first excess", () => {
  const trace = clone();
  const eventBytes = Buffer.byteLength(canonicalize({source: "source-a", sequence: 0, type: "increment", payload: {amount: 1}}));
  trace.limits.maxEventBytes = eventBytes;
  expect(code(seal(trace))).toBe("ACCEPTED");
  trace.limits.maxEventBytes = eventBytes - 1;
  expect(code(seal(trace))).toBe("EVENT_LOOP_BOUNDS");
  trace.limits.maxEventBytes = 65_536;
  expect(code(seal(trace))).toBe("ACCEPTED");
  trace.limits.maxEventBytes = 65_537;
  expect(code(seal(trace))).toBe("EVENT_LOOP_BOUNDS");
  trace.limits.maxEventBytes = 1024;
  for (const [field, low, high] of [
    ["maxStateBytes", 1, 262_144], ["maxOutputEvents", 0, 64],
    ["maxTransitionFuel", 1, 100_000], ["maxMailboxDepth", 1, 1_024],
  ] as const) {
    const valid = clone();
    valid.limits[field] = high;
    if (field === "maxMailboxDepth") valid.entries[2].depthBefore = high;
    expect(code(seal(valid))).toBe("ACCEPTED");
    valid.limits[field] = high + 1;
    expect(code(seal(valid))).toBe("EVENT_LOOP_BOUNDS");
    valid.limits[field] = low - 1;
    expect(code(seal(valid))).toBe("EVENT_LOOP_BOUNDS");
  }
  const list = clone();
  list.entries = [list.entries[0]];
  expect(code(seal(list))).toBe("ACCEPTED");
  list.entries = [];
  expect(code(seal(list))).toBe("EVENT_LOOP_BOUNDS");
  list.entries = Array.from({length: 257}, () => clone().entries[0]);
  expect(code(seal(list))).toBe("EVENT_LOOP_BOUNDS");
});

test("payload JSON rejects cycles, sparse lists, non-finite values and bounded collection excess", () => {
  const trace = clone();
  trace.entries[0].payload = {amount: Array(1_024).fill(0)};
  expect(code(seal(trace))).toBe("EVENT_LOOP_BOUNDS"); // event byte limit
  trace.entries[0].payload.amount.push(0);
  expect(code(trace)).toBe("EVENT_LOOP_BOUNDS"); // value list limit
  trace.entries[0].payload = {amount: Number.POSITIVE_INFINITY};
  expect(code(trace)).toBe("EVENT_LOOP_PARSE");
  const cycle: any[] = [];
  cycle.push(cycle);
  trace.entries[0].payload = {amount: cycle};
  expect(code(trace)).toBe("EVENT_LOOP_PARSE");
  trace.entries[0].payload = {amount: Array(1)};
  expect(code(trace)).toBe("EVENT_LOOP_PARSE");
  trace.entries[0].payload = {amount: { ["x".repeat(65_537)]: 1 }};
  expect(code(trace)).toBe("EVENT_LOOP_BOUNDS");
});

test("foreign accessors and hidden keys are rejected before their code runs", () => {
  for (const alter of [
    (trace: any) => trace,
    (trace: any) => trace.entries[0].decision,
    (trace: any) => trace.entries[0].payload,
    (trace: any) => trace.entries[0].decision.outputs,
  ]) {
    const trace = clone();
    const target = alter(trace);
    const key = Array.isArray(target) ? "0" : Object.keys(target)[0]!;
    let calls = 0;
    Object.defineProperty(target, key, {enumerable: true, get() { calls++; return null; }});
    expect(code(trace)).toBe("EVENT_LOOP_PARSE");
    expect(calls).toBe(0);
  }
  const trace = clone();
  Object.defineProperty(trace.entries[0].decision, "hidden", {value: 1});
  expect(code(trace)).toBe("EVENT_LOOP_PARSE");
});
