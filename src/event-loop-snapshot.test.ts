import { expect, test } from "bun:test";
import { parseEventLoopTrace } from "./event-loop-contract";
import { snapshotEventLoopValue, verifyEventLoopTraceStructure } from "./event-loop-structure";
import { summarizeEventLoopTrace } from "./event-loop-summary";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const behavior = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();

test("foreign array length is copied without a property-get trap", () => {
  const trace = structuredClone(fixture.base);
  let reads = 0;
  trace.entries = new Proxy(trace.entries, {
    get() { reads++; throw new Error("read from caller's entries array"); },
  });
  expect(parseEventLoopTrace(trace).digest).toBe(fixture.base.digest);
  expect(verifyEventLoopTraceStructure(trace, behavior).digest).toBe(fixture.base.digest);
  expect(summarizeEventLoopTrace(trace).digest).toBe(fixture.base.digest);
  expect(reads).toBe(0);
});

test("foreign root fields cannot change between descriptor check and digest", () => {
  const trace = structuredClone(fixture.base);
  let reads = 0;
  const foreign = new Proxy(trace, {
    get() { reads++; throw new Error("read from caller's root"); },
  });
  expect(parseEventLoopTrace(foreign)).toEqual({digest: fixture.base.digest, entries: 4});
  expect(reads).toBe(0);
});

test("shared subtrees cannot expand past the byte limit before admission", () => {
  let reads = 0;
  let branch: unknown = new Proxy({ value: "x".repeat(65_536) }, {
    getOwnPropertyDescriptor(target, key) {
      if (key === "value" && ++reads > 32) throw new Error("unbounded expansion");
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  for (let i = 0; i < 18; i++) branch = { left: branch, right: branch };
  expect(() => snapshotEventLoopValue(branch)).toThrow("EVENT_LOOP_BOUNDS");
  expect(reads).toBeLessThanOrEqual(32);
});
