import { expect, test } from "bun:test";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { summarizeEventLoopBehavior } from "./event-loop-behavior";
import { replayEventLoopTrace } from "./event-loop-replay";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
import { deliveryFieldVectors } from "../scripts/event-loop-delivery-field-vectors";

test("six selected-sibling field pairs require delivery replay after structural acceptance", () => {
  const vectors = deliveryFieldVectors();
  expect(vectors).toHaveLength(6);
  const records = vectors.flatMap(({field, control, mutation}) => [
    {name: `${field}:control`, ...control}, {name: `${field}:mutation`, ...mutation},
  ]);
  expect(records).toHaveLength(12);
  expect(records.length).toBeLessThanOrEqual(64);
  expect(Buffer.byteLength(JSON.stringify(records), "utf8")).toBeLessThanOrEqual(4 * 1024 * 1024);
  for (const {field, control, mutation, expected} of vectors) {
    for (const {behavior, trace} of [control, mutation]) {
      expect(behavior.actors[0].id, field).toBe("counter");
      expect(trace.actor, field).toBe("observer");
      expect(trace.behavior, field).toBe(behavior.digest);
      expect(parseEventLoopTrace(trace).digest, field).toBe(trace.digest);
      expect(summarizeEventLoopBehavior(behavior, trace.actor).digest, field).toBe(behavior.digest);
      expect(verifyEventLoopTraceStructure(trace, behavior).digest, field).toBe(trace.digest);
    }
    expect(canonicalize(control.behavior as JsonValue), field)
      .not.toBe(canonicalize(mutation.behavior as JsonValue));
    expect(replayEventLoopTrace(control.trace, control.behavior), field).toMatchObject({
      digest: control.trace.digest, summary: {accepted: 1, failed: 0},
    });
    expect(() => replayEventLoopTrace(mutation.trace, mutation.behavior), field)
      .toThrow(new EventLoopContractError(expected));
  }
});
