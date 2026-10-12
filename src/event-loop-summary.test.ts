import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError } from "./event-loop-contract";
import { summarizeEventLoopTrace } from "./event-loop-summary";
import { eventLoopVectors, tsResults } from "../scripts/event-loop-contract-parity";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
type RecordValue = Record<string, JsonValue>;
function seal(trace: RecordValue): RecordValue {
  for (const entry of trace.entries as RecordValue[]) {
    entry.eventDigest = hash({behavior: trace.behavior!, actor: trace.actor!, source: entry.source!,
      sequence: entry.sequence!, type: entry.type!, payload: entry.payload!});
    entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor!, delivery: entry.delivery!});
  }
  const { digest: _digest, ...body } = trace;
  trace.digest = hash(body);
  return trace;
}

test("validated summaries count decisions and claimed resources, not effects", async () => {
  expect(summarizeEventLoopTrace(fixture.base).summary).toEqual({
    accepted: 2, duplicate: 1, backpressure: 1, failed: 0,
    continued: 1, quiet: 1, deferred: 0, escalated: 0, unmatched: 0,
    fuelClaimed: 14, peakStateBytesClaimed: 11, notificationsClaimed: 1,
    effectsRequestedClaimed: 0, effectsSettledClaimed: 0,
  });
  expect(summarizeEventLoopTrace(fixture.failed).summary).toMatchObject({
    accepted: 1, duplicate: 1, failed: 1, fuelClaimed: 1_012, notificationsClaimed: 1,
  });
  const vectors = await eventLoopVectors();
  for (const { name, result } of tsResults(vectors)) {
    if ("summary" in result) {
      const entries = (vectors.find((vector) => vector.name === name)!.value as RecordValue).entries as JsonValue[];
      expect(result.summary.accepted + result.summary.duplicate + result.summary.backpressure + result.summary.failed).toBe(entries.length);
    }
  }
});

test("summary fields have zero, per-entry maximum and 256-entry maximum cases", () => {
  const zero = structuredClone(fixture.base) as RecordValue;
  const first = (zero.entries as RecordValue[])[0]!;
  zero.entries = [first];
  const decision = first.decision as RecordValue;
  decision.outcome = "quiet";
  decision.outputs = [];
  decision.resources = {fuel: 0, stateBytes: 0, outputEvents: 0};
  expect(summarizeEventLoopTrace(seal(zero)).summary).toMatchObject({
    accepted: 1, fuelClaimed: 0, peakStateBytesClaimed: 0, notificationsClaimed: 0,
  });

  const one = structuredClone(fixture.base) as RecordValue;
  one.limits = {...(one.limits as RecordValue), maxOutputEvents: 64, maxTransitionFuel: 100_000};
  const output = (one.entries as RecordValue[])[0]!;
  one.entries = [output];
  const result = output.decision as RecordValue;
  result.outputs = Array(64).fill((result.outputs as JsonValue[])[0]);
  result.resources = {fuel: 100_000, stateBytes: 16_384, outputEvents: 64};
  expect(summarizeEventLoopTrace(seal(one)).summary).toMatchObject({
    accepted: 1, fuelClaimed: 100_000, peakStateBytesClaimed: 16_384, notificationsClaimed: 64,
  });
  (result.outputs as JsonValue[]).push((result.outputs as JsonValue[])[0]!);
  expect(() => summarizeEventLoopTrace(seal(one))).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));

  const many = structuredClone(zero) as RecordValue;
  many.limits = {...(many.limits as RecordValue), maxTransitionFuel: 100_000};
  const entries: RecordValue[] = [];
  for (let sequence = 0; sequence < 256; sequence++) {
    const entry = structuredClone(first) as RecordValue;
    entry.sequence = sequence;
    entry.delivery = `attempt-${sequence}`;
    (entry.decision as RecordValue).resources = {fuel: 100_000, stateBytes: 16_384, outputEvents: 0};
    entries.push(entry);
  }
  many.entries = entries;
  expect(summarizeEventLoopTrace(seal(many)).summary).toMatchObject({
    accepted: 256, fuelClaimed: 25_600_000, peakStateBytesClaimed: 16_384,
  });
  many.entries = [...entries, structuredClone(entries[0]!)];
  expect(() => summarizeEventLoopTrace(seal(many))).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
});

test("pending outcomes, unmatched deliveries and invalid effect claims", () => {
  for (const [outcome, field] of [
    ["defer", "deferred"], ["escalate", "escalated"], ["no-transition", "unmatched"],
  ] as const) {
    const trace = structuredClone(fixture.base) as RecordValue;
    const entry = (trace.entries as RecordValue[])[0]!;
    trace.entries = [entry];
    const decision = entry.decision as RecordValue;
    decision.outcome = outcome;
    decision.outputs = [];
    (decision.resources as RecordValue).outputEvents = 0;
    if (outcome === "no-transition") decision.transition = null;
    expect(summarizeEventLoopTrace(seal(trace)).summary[field]).toBe(1);
    (decision.effects as RecordValue).requested = 1;
    expect(() => summarizeEventLoopTrace(seal(trace))).toThrow(new EventLoopContractError("EVENT_LOOP_SEMANTIC"));
  }
});
