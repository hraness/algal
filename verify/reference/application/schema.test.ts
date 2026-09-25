import { expect, test } from "bun:test";
import { syntheticGenerated } from "./archive-fixture";
import { parseTrace } from "./schema";

test("trace parser applies the callback cap across the whole history", () => {
  const { history, trace } = syntheticGenerated({ seed: 1, profile: "delivery" });
  expect(() => parseTrace(trace, history)).not.toThrow();
  const callback = trace.steps.flatMap(step => step.callbacks)[0]!;
  // Shape-only parser boundary: these copies are deliberately not semantic traces.
  const boundary = structuredClone(trace);
  for (const step of boundary.steps) step.callbacks = [];
  boundary.steps[0]!.callbacks = Array.from({ length: 16 }, () => structuredClone(callback));
  boundary.steps[1]!.callbacks = Array.from({ length: 16 }, () => structuredClone(callback));
  expect(() => parseTrace(boundary, history)).not.toThrow();
  boundary.steps[1]!.callbacks.push(structuredClone(callback));
  expect(() => parseTrace(boundary, history)).toThrow("history total callback bound");
});
