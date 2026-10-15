import { expect, test } from "bun:test";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { summarizeEventLoopBehavior } from "./event-loop-behavior";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
import { behaviorFieldVectors, fieldHash } from "../scripts/event-loop-behavior-field-vectors";

function digestBody(record: Record<string, JsonValue>): string {
  const {digest: _old, ...body} = record;
  return fieldHash(body);
}

test("28 isolated behavior field cells refuse after accepted, redigested controls", () => {
  const vectors = behaviorFieldVectors();
  expect(vectors).toHaveLength(28);
  expect(new Set(vectors.map(({cell}) => cell)).size).toBe(28);
  for (const {cell, control, behavior, controlTrace, trace, expected} of vectors) {
    expect(control.digest, cell).toBe(digestBody(control));
    expect(controlTrace.behavior, cell).toBe(control.digest);
    expect(trace.digest, cell).toBe(digestBody(trace));
    expect(parseEventLoopTrace(trace).digest, cell).toBe(trace.digest);
    expect(summarizeEventLoopBehavior(control, controlTrace.actor).digest, cell).toBe(control.digest);
    expect(verifyEventLoopTraceStructure(controlTrace, control).digest, cell).toBe(controlTrace.digest);
    if (cell === "digest:missing") {
      expect(Object.hasOwn(behavior, "digest"), cell).toBe(false);
      expect(trace.behavior, cell).toBe(control.digest);
    } else {
      expect(behavior.digest, cell).toBe(digestBody(behavior));
      expect(trace.behavior, cell).toBe(behavior.digest);
      expect(canonicalize(behavior as JsonValue), cell).not.toBe(canonicalize(control as JsonValue));
    }
    expect(() => summarizeEventLoopBehavior(behavior, trace.actor), cell)
      .toThrow(new EventLoopContractError(expected as EventLoopContractError["code"]));
    expect(() => verifyEventLoopTraceStructure(trace, behavior), cell)
      .toThrow(new EventLoopContractError(expected as EventLoopContractError["code"]));
  }
});
