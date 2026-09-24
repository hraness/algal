import { describe, expect, test } from "bun:test";
import { admitNative, admitProjection, admitWorker, runSchedulerConformance } from "./run";
import { workerSummary } from "./worker";
import type { CommandResult } from "../../lib/runner";
const argv = ["/fixture/bun", "/fixture/worker.ts", "ordinary", "case", "/fixture/archive"];
const result = (output: unknown): CommandResult => ({ command: argv, exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout: workerSummary("case", output) + "\n", stderr: "" });
describe("scheduler adapter negative controls", () => {
  test("foreign outcome, cell prefix, work, request order and fallback data are exact", () => {
    const value = { outcome: "complete", cells: { a: { outputs: { value: { code: "EFFECT_FAILED", message: "settled" } } } }, effects: [{ requestDigest: "one" }, { requestDigest: "two" }], work: { units: 1 } };
    expect(() => admitProjection(value, structuredClone(value))).not.toThrow();
    for (const changed of [{ ...value, outcome: "failed" }, { ...value, cells: {} }, { ...value, effects: [...value.effects].reverse() }, { ...value, work: { units: 0 } }, { ...value, cells: { a: { outputs: { value: { code: "EFFECT_FAILED", message: "wrong" } } } } }]) expect(() => admitProjection(value, changed)).toThrow();
  });
  test("worker cannot substitute output, command, extra frame, diagnostics or failed custody", () => {
    const output = { outcome: "complete" }; expect(() => admitWorker(result(output), argv, "case", output)).not.toThrow();
    for (const changed of [{ ...result(output), stdout: workerSummary("case", { outcome: "failed" }) + "\n" }, { ...result(output), command: ["/other"] }, { ...result(output), stdout: result(output).stdout + "{}\n" }, { ...result(output), stderr: "noise" }, { ...result(output), cleanupObserved: false }, { ...result(output), exitCode: 1 }]) expect(() => admitWorker(changed, argv, "case", output)).toThrow();
  });
  test("native accepts only exact argv and declared completed exit codes", () => {
    expect(() => admitNative(result({}), argv, [0])).not.toThrow();
    for (const changed of [{ ...result({}), timedOut: true }, { ...result({}), outputExceeded: true }, { ...result({}), signal: "SIGTERM" }, { ...result({}), cleanupObserved: false }, { ...result({}), exitCode: 2 }, { ...result({}), command: ["/other"] }]) expect(() => admitNative(changed, argv, [0])).toThrow();
  });
  test("native conformance requires an explicitly selected absolute artifact", async () => {
    await expect(runSchedulerConformance("/unused", "relative-algal")).rejects.toThrow("ALGAL_SCHEDULER_NATIVE_BIN");
  });
});
