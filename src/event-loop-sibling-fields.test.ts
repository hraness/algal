import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
import { siblingFieldVectors } from "../scripts/event-loop-sibling-field-vectors";

const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

test("unused event and unselected actor fields have redigested accepted controls", () => {
  const vectors = siblingFieldVectors();
  expect(vectors).toHaveLength(17);
  for (const {name, behavior, trace, controlBehavior, controlTrace, expected} of vectors) {
    const {digest: _old, ...body} = behavior;
    expect(behavior.digest, name).toBe(hash(body as JsonValue));
    expect(trace.behavior, name).toBe(behavior.digest);
    expect(parseEventLoopTrace(trace).digest, name).toBe(trace.digest);
    const control = verifyEventLoopTraceStructure(controlTrace, controlBehavior);
    expect(control.digest, name).toBe(controlTrace.digest);
    if (expected) {
      expect(behavior.digest, name).not.toBe(controlBehavior.digest);
      expect(() => verifyEventLoopTraceStructure(trace, behavior), name)
        .toThrow(new EventLoopContractError(expected as EventLoopContractError["code"]));
    } else {
      expect(verifyEventLoopTraceStructure(trace, behavior), name)
        .toEqual({digest: trace.digest, staticSummary: control.staticSummary});
    }
  }
});
