import { expect, test } from "bun:test";
import { verifyEventLoopTraceStructure } from "./event-loop-structure";
import { summarizeEventLoopTrace } from "./event-loop-summary";

const fixture = await Bun.file(new URL("../scripts/fixtures/event-loop-contract.json", import.meta.url)).json();
const behavior = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();

test("foreign array length is copied without a property-get trap", () => {
  const trace = structuredClone(fixture.base);
  let reads = 0;
  trace.entries = new Proxy(trace.entries, {
    get() { reads++; throw new Error("read from caller's entries array"); },
  });
  expect(verifyEventLoopTraceStructure(trace, behavior).digest).toBe(fixture.base.digest);
  expect(summarizeEventLoopTrace(trace).digest).toBe(fixture.base.digest);
  expect(reads).toBe(0);
});
