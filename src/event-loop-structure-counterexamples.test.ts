/* eslint-disable @typescript-eslint/no-explicit-any -- Synthetic foreign records under test. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const initial = Object.fromEntries(pinned.actors[0].state.fields.map((field: any) => [field.name, field.initial]));
const initialDigest = hash(initial);
const initialBytes = Buffer.byteLength(canonicalize(initial));
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
  return value;
}
function priority(name: string): any {
  const proposed = structuredClone(pinned);
  // Put the rule after increment in the array; transition id, not array order, decides priority.
  proposed.actors[0].transitions.push({
    id: name, on: "increment", when: null, writes: [], outputs: [], result: {kind: "quiet"},
  });
  return seal(proposed);
}
function bind(proposed: any, trace: any = fixture.base): any {
  const record = structuredClone(trace);
  record.behavior = proposed.digest;
  for (const entry of record.entries) {
    entry.eventDigest = hash({behavior: record.behavior, actor: record.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: record.actor, delivery: entry.delivery});
  }
  return seal(record);
}
function firstFailed(): any {
  const record = structuredClone(fixture.failed);
  record.entries = [record.entries[1]];
  record.entries[0].decision.stateDigest = initialDigest;
  record.entries[0].decision.resources.stateBytes = initialBytes;
  return seal(record);
}

test("an unconditional earlier id wins, regardless of behavior array order", () => {
  const earlier = priority("a-priority");
  const claimedLater = bind(earlier);
  expect(parseEventLoopTrace(claimedLater).digest).toBe(claimedLater.digest);
  expect(() => verifyEventLoopTraceStructure(claimedLater, earlier)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  // A later id cannot preempt increment. This is still not guard evaluation.
  const later = priority("z-priority");
  const allowed = bind(later);
  expect(verifyEventLoopTraceStructure(allowed, later).digest).toBe(allowed.digest);
});

test("a failed selection cannot name an id preempted by a known unconditional rule", () => {
  const single = firstFailed();
  single.entries[0].decision.transition = "increment";
  const earlier = priority("a-priority");
  const claimedLater = bind(earlier, single);
  expect(parseEventLoopTrace(claimedLater).digest).toBe(claimedLater.digest);
  expect(() => verifyEventLoopTraceStructure(claimedLater, earlier)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));

  // Failure before selection completes may name no transition. A later
  // unconditional id also cannot preempt the selected increment rule.
  const unselected = structuredClone(claimedLater);
  unselected.entries[0].decision.transition = null;
  seal(unselected);
  expect(verifyEventLoopTraceStructure(unselected, earlier).digest).toBe(unselected.digest);
  const later = priority("z-priority");
  const allowed = bind(later, single);
  expect(verifyEventLoopTraceStructure(allowed, later).digest).toBe(allowed.digest);
});

test("first failed and unmatched decisions preserve initial digest and canonical byte size", () => {
  const failed = firstFailed();
  expect(verifyEventLoopTraceStructure(failed, pinned).digest).toBe(failed.digest);
  const badDigest = structuredClone(failed);
  badDigest.entries[0].decision.stateDigest = `sha256:${"0".repeat(64)}`;
  seal(badDigest);
  expect(parseEventLoopTrace(badDigest).digest).toBe(badDigest.digest);
  expect(() => verifyEventLoopTraceStructure(badDigest, pinned)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  const badBytes = structuredClone(failed);
  badBytes.entries[0].decision.resources.stateBytes = initialBytes - 1;
  seal(badBytes);
  expect(() => verifyEventLoopTraceStructure(badBytes, pinned)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));

  // An increment guard may be false. No-transition is structurally possible,
  // but it cannot manufacture a different initial state before a commit.
  const unmatched = structuredClone(fixture.base);
  unmatched.entries = [unmatched.entries[0]];
  unmatched.entries[0].decision = {kind: "accepted", transition: null, outcome: "no-transition",
    stateDigest: initialDigest, outputs: [], effects: {requested: 0, settled: 0, receipts: []},
    resources: {fuel: 0, stateBytes: initialBytes, outputEvents: 0}};
  seal(unmatched);
  expect(verifyEventLoopTraceStructure(unmatched, pinned).digest).toBe(unmatched.digest);
  unmatched.entries[0].decision.resources.stateBytes = initialBytes + 1;
  seal(unmatched);
  expect(() => verifyEventLoopTraceStructure(unmatched, pinned)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
});

test("a rule without state writes preserves the previous state, initially and after a commit", () => {
  const noWrites = structuredClone(pinned);
  noWrites.actors[0].transitions[1].writes = [];
  seal(noWrites);
  const trace = structuredClone(fixture.base);
  trace.entries[3].decision.stateDigest = trace.entries[0].decision.stateDigest;
  const afterCommit = bind(noWrites, trace);
  expect(verifyEventLoopTraceStructure(afterCommit, noWrites).digest).toBe(afterCommit.digest);
  const changed = structuredClone(afterCommit);
  changed.entries[3].decision.stateDigest = initialDigest;
  seal(changed);
  expect(parseEventLoopTrace(changed).digest).toBe(changed.digest);
  expect(() => verifyEventLoopTraceStructure(changed, noWrites)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  const wrongBytes = structuredClone(afterCommit);
  wrongBytes.entries[3].decision.resources.stateBytes += 1;
  seal(wrongBytes);
  expect(() => verifyEventLoopTraceStructure(wrongBytes, noWrites)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));

  // With no prior commit, the same quiet rule must preserve the initial state.
  const first = structuredClone(trace);
  first.entries = [first.entries[3]];
  first.entries[0].decision.stateDigest = initialDigest;
  first.entries[0].decision.resources.stateBytes = initialBytes;
  const firstBound = bind(noWrites, first);
  expect(verifyEventLoopTraceStructure(firstBound, noWrites).digest).toBe(firstBound.digest);
  firstBound.entries[0].decision.stateDigest = fixture.base.entries[0].decision.stateDigest;
  seal(firstBound);
  expect(parseEventLoopTrace(firstBound).digest).toBe(firstBound.digest);
  expect(() => verifyEventLoopTraceStructure(firstBound, noWrites)).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));

  // Continue with no writes also preserves state, even if it emits data.
  noWrites.actors[0].transitions[1].result.kind = "continue";
  seal(noWrites);
  first.entries[0].decision.outcome = "continue";
  const continued = bind(noWrites, first);
  expect(verifyEventLoopTraceStructure(continued, noWrites).digest).toBe(continued.digest);
});

test("output identity remains a replay gap despite valid structural digests", () => {
  const changed = structuredClone(fixture.base);
  changed.entries[0].decision.outputs[0] = `sha256:${"0".repeat(64)}`;
  seal(changed);
  expect(changed.digest).not.toBe(fixture.base.digest);
  expect(parseEventLoopTrace(changed).digest).toBe(changed.digest);
  // Evidence of the remaining hole, not an assertion that this is a valid execution.
  expect(verifyEventLoopTraceStructure(changed, pinned).digest).toBe(changed.digest);
});
