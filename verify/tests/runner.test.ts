import { describe, expect, test } from "bun:test";
import { hashBytes, hashJson } from "../lib/files";
import { admitInfrastructureResult, admitSelftestOutput, CHILD_ENV, requireSameBinding, requireSuccess, runCommand, runSuite, type CommandResult, type RunBinding } from "../lib/runner";

function binding(): RunBinding {
  const inputs = [{ path: "verify/model.tla", sha256: hashBytes("model") }];
  return { commit: "a".repeat(40), tree: "b".repeat(40), inputs, inputDigest: hashJson(inputs), runtime: { path: "/fixture/bun", sha256: hashBytes("bun"), version: "1.3.14", platform: "darwin", arch: "arm64" }, environment: CHILD_ENV };
}
function commandResult(): CommandResult { return { command: ["bun", "test"], exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout: "", stderr: " 27 pass\n 0 fail\nRan 27 tests across 3 files. [100ms]\n" }; }

describe("runner fail-closed admission", () => {
  test("unknown and planned suites cannot pass through an absent adapter", async () => {
    await expect(runSuite("/unneeded", "made-up")).rejects.toThrow("unknown verification suite");
    await expect(runSuite("/unneeded", "lean-core")).rejects.toThrow("Not started");
  });
  test("successful output must include nonempty parsed Bun test completion", () => {
    expect(admitSelftestOutput(commandResult())).toBe(27);
    for (const patch of [{ stdout: "passed", stderr: "" }, { stderr: "0 pass\n0 fail\n" }, { stderr: "27 pass\n1 fail\n" }, { exitCode: 1 }, { signal: "SIGTERM" }, { timedOut: true }, { outputExceeded: true }, { cleanupObserved: false }]) {
      expect(() => admitSelftestOutput({ ...commandResult(), ...patch })).toThrow();
    }
    for (const skipped of ["1 skip", "1 skipped", "1 todo", "(skip) disabled check", "(todo) unfinished check"]) expect(() => admitSelftestOutput({ ...commandResult(), stdout: skipped + "\n" })).toThrow("skipped or left todo");
    expect(() => admitSelftestOutput({ ...commandResult(), stderr: "27 pass\n0 fail\nRan 28 tests across 3 files.\n" })).toThrow("executed-test count");
  });
  test("results require exact source/model/runtime/Git binding, no proof promotion", () => {
    const current = binding();
    const good = { contract: "algal.verification-result.v1", suite: "claims", status: "passed", evidenceClass: "infrastructure-only", formalClaims: 0, binding: current, details: {} };
    expect(() => admitInfrastructureResult(good, "claims", current)).not.toThrow();
    for (const patch of [{ status: "skipped" }, { formalClaims: 1 }, { evidenceClass: "proved-implementation" }, { suite: "lean-core" }, { unknown: true }]) expect(() => admitInfrastructureResult({ ...good, ...patch }, "claims", current)).toThrow();
    const changed = structuredClone(current);
    changed.inputs[0]!.sha256 = hashBytes("changed model");
    changed.inputDigest = hashJson(changed.inputs);
    expect(() => admitInfrastructureResult(good, "claims", changed)).toThrow("stale");
    for (const other of [{ ...current, commit: "c".repeat(40) }, { ...current, runtime: { ...current.runtime, sha256: hashBytes("other runtime") } }, changed]) expect(() => requireSameBinding(current, other)).toThrow("changed during execution");
  });
});

describe("bounded child execution", () => {
  test("records exact argv and bounded raw output; nonzero fails", async () => {
    const command = [process.execPath, "-e", 'console.log("fixture output")'];
    const good = await runCommand(command, process.cwd());
    expect(good.command).toEqual(command);
    expect(good.stdout).toBe("fixture output\n");
    expect(() => requireSuccess(good)).not.toThrow();
    const bad = await runCommand([process.execPath, "-e", "process.exit(4)"], process.cwd());
    expect(bad.exitCode).toBe(4);
    expect(() => requireSuccess(bad)).toThrow();
  });
  test("deadline and excessive output fail and terminate the owned process", async () => {
    const timeout = await runCommand([process.execPath, "-e", "setInterval(() => {}, 1000)"], process.cwd(), { timeoutMs: 100 });
    expect(timeout.timedOut).toBe(true);
    expect(timeout.cleanupObserved).toBe(true);
    expect(() => requireSuccess(timeout)).toThrow();
    // Keep the owned child alive until the output limiter stops it. A command
    // already exiting can make its process group disappear before the signal.
    const output = await runCommand([process.execPath, "-e", 'console.log("x".repeat(4096)); setInterval(() => {}, 1000)'], process.cwd(), { maxOutputBytes: 128 });
    expect(output.outputExceeded).toBe(true);
    expect(output.cleanupObserved).toBe(true);
    expect(() => requireSuccess(output)).toThrow();
  });
  test("deadline stops inherited pipe writers after their direct parent exits", async () => {
    const started = performance.now();
    const result = await runCommand(["/bin/sh", "-c", "/bin/sleep 5 & exit 0"], process.cwd(), { timeoutMs: 150 });
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(true);
    expect(result.cleanupObserved).toBe(true);
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(() => requireSuccess(result)).toThrow();
  });
  test("successful descendant output is drained before command cleanup", async () => {
    const result = await runCommand(["/bin/sh", "-c", "(/bin/sleep 0.05; printf final-output; printf final-error >&2) & exit 0"], process.cwd(), { timeoutMs: 2_000 });
    expect(result.stdout).toBe("final-output");
    expect(result.stderr).toBe("final-error");
    expect(result.cleanupObserved).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(() => requireSuccess(result)).not.toThrow();
  });
  test("missing executable fails, rather than creating a successful empty result", async () => {
    await expect(runCommand(["/algal-verification-missing-tool"], process.cwd())).rejects.toThrow();
  });
});
