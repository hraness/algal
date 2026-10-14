import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "./values";
import { EventLoopContractError, parseEventLoopTrace } from "./event-loop-contract";
import { replayEventLoopTrace } from "./event-loop-replay";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
import { outputBoundary, outputVectors } from "../scripts/event-loop-output-vectors";

const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
test("output envelope limits include parent, ordinal, resolved target and typed payload", () => {
  const minimum = {parent: `sha256:${"0".repeat(64)}`, transition: "a", ordinal: 0,
    target: "a", type: "a", payload: {}};
  expect(Buffer.byteLength(canonicalize(minimum))).toBe(150);
  expect(outputBoundary.floor).toBeGreaterThan(150);
  expect(outputBoundary.unicodeBytes).toBe(outputBoundary.floor + 2);
  expect(outputBoundary.unicodeExcessBytes).toBe(outputBoundary.unicodeBytes + 1);
  expect(outputBoundary.highBytes).toBe(65_536);
  expect(outputBoundary.highExcessBytes).toBe(65_537);
  for (const {name, trace, behavior, expected} of outputVectors) {
    const {digest: _traceDigest, ...traceBody} = trace;
    const {digest: _behaviorDigest, ...behaviorBody} = behavior;
    expect(hash(traceBody as JsonValue)).toBe(trace.digest);
    expect(hash(behaviorBody as JsonValue)).toBe(behavior.digest);
    if (name === "limit-first-excess") {
      expect(() => parseEventLoopTrace(trace)).toThrow(new EventLoopContractError("EVENT_LOOP_BOUNDS"));
      continue;
    }
    expect(parseEventLoopTrace(trace).digest).toBe(trace.digest);
    expect(verifyEventLoopTraceStructure(trace, behavior).digest).toBe(trace.digest);
    try {
      const replay = replayEventLoopTrace(trace, behavior);
      expect(replay.digest).toBe(expected);
      if (name.endsWith("-failed") || name === "one-byte-short" || name === "schema-before-size") {
        expect(replay.summary.failed).toBe(1);
        expect(replay.summary.notificationsClaimed).toBe(0);
        expect(trace.entries[0].decision.stateDigest).toBe(hash({count: 0}));
      }
    } catch (error) {
      if (!(error instanceof EventLoopContractError)) throw error;
      expect(error.code as string).toBe(expected);
    }
  }
});
