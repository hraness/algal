import { expect, test } from "bun:test";
import { commandJson } from "./io";

// Near the command input limit, exercising real pipe backpressure where the
// platform exposes it. Kernel acceptance does not prove the child consumed it.
const largeInput = "x".repeat(1_048_570);

test("early stdin close preserves an authoritative suspension exit without an unhandled rejection", async () => {
  await expect(commandJson(["/bin/sh", "-c", "exec 0<&-; exit 75"], largeInput))
    .rejects.toMatchObject({ code: "EFFECT_SUSPENDED" });
});

test("early stdin close preserves other nonzero command exits", async () => {
  await expect(commandJson(["/bin/sh", "-c", "exec 0<&-; exit 2"], largeInput))
    .rejects.toMatchObject({ code: "EFFECT_FAILED", message: "executor exited 2; diagnostics withheld" });
});

test("asynchronous stdin failures settle before a successful exit can accept the request", async () => {
  // Isolate deterministic FileSink failures in another process. A real child
  // closing stdin may still let the kernel accept the entire bounded payload.
  const source = `
    import {commandJson} from ${JSON.stringify(new URL("./io.ts", import.meta.url).href)};
    const results = [];
    for (const fail of ["write", "end"]) for (const exit of [0, 75, 2]) {
      const pipeFailure = async () => { await Promise.resolve(); throw Object.assign(new Error("PRIVATE_PIPE_DIAGNOSTIC"), {code: "EPIPE"}); };
      Bun.spawn = () => ({
        stdin: {
          write: fail === "write" ? pipeFailure : async value => value.length,
          end: fail === "end" ? pipeFailure : async () => 0,
        },
        stdout: new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode("null")); controller.close();}}),
        stderr: new ReadableStream({start(controller) {controller.close();}}),
        exited: Promise.resolve(exit),
        kill() {},
      });
      try {
        results.push({fail, exit, result: await commandJson(["controlled-command"], "x".repeat(1048570))});
      } catch (error) { results.push({fail, exit, code: error.code, message: error.message}); }
    }
    console.log(JSON.stringify(results));
  `;
  const child = Bun.spawn([process.execPath, "-e", source], {stdin: "ignore", stdout: "pipe", stderr: "pipe"});
  const [output, diagnostic, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code).toBe(0);
  expect(diagnostic).toBe("");
  expect(JSON.parse(output)).toEqual(["write", "end"].flatMap(fail => [
    {fail, exit: 0, code: "EFFECT_FAILED", message: "executor closed stdin before request delivery"},
    {fail, exit: 75, code: "EFFECT_SUSPENDED", message: "executor asked the host to suspend the run"},
    {fail, exit: 2, code: "EFFECT_FAILED", message: "executor exited 2; diagnostics withheld"},
  ]));
  expect(output).not.toContain("PRIVATE_PIPE_DIAGNOSTIC");
});

test("commands can consume the complete bounded request before answering", async () => {
  const result = await commandJson([process.execPath, "-e", "const input = JSON.parse(await Bun.stdin.text()); console.log(JSON.stringify(input.length));"], largeInput);
  expect(result).toBe(largeInput.length);
});

test("a blocked stdin write remains bounded by the command timeout", async () => {
  await expect(commandJson([process.execPath, "-e", "await Bun.sleep(10_000);"], largeInput, { timeoutMs: 20 }))
    .rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
});
