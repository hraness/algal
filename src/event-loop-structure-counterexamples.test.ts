/* eslint-disable @typescript-eslint/no-explicit-any -- Synthetic foreign records under test. */
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
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
  const single = structuredClone(fixture.failed);
  single.entries = [single.entries[1]];
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

test("output identity remains a replay gap despite valid structural digests", () => {
  const changed = structuredClone(fixture.base);
  changed.entries[0].decision.outputs[0] = `sha256:${"0".repeat(64)}`;
  seal(changed);
  expect(changed.digest).not.toBe(fixture.base.digest);
  expect(parseEventLoopTrace(changed).digest).toBe(changed.digest);
  // Evidence of the remaining hole, not an assertion that this is a valid execution.
  expect(verifyEventLoopTraceStructure(changed, pinned).digest).toBe(changed.digest);
});
