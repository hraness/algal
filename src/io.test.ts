import { expect, test } from "bun:test";
import { commandJson } from "./io";

// Larger than an OS pipe buffer, but below the command input limit. An early
// close must therefore settle the asynchronous stdin flush, including EPIPE.
const largeInput = "x".repeat(1_048_570);

test("early stdin close preserves an authoritative suspension exit without an unhandled rejection", async () => {
  await expect(commandJson(["/bin/sh", "-c", "exec 0<&-; exit 75"], largeInput))
    .rejects.toMatchObject({ code: "EFFECT_SUSPENDED" });
});

test("early stdin close preserves other nonzero command exits", async () => {
  await expect(commandJson(["/bin/sh", "-c", "exec 0<&-; exit 2"], largeInput))
    .rejects.toMatchObject({ code: "EFFECT_FAILED", message: "executor exited 2; diagnostics withheld" });
});

test("a success exit cannot accept a partially delivered request", async () => {
  await expect(commandJson(["/bin/sh", "-c", "exec 0<&-; printf null"], largeInput))
    .rejects.toMatchObject({ code: "EFFECT_FAILED", message: "executor closed stdin before request delivery" });
});

test("commands can consume the complete bounded request before answering", async () => {
  const result = await commandJson([process.execPath, "-e", "const input = JSON.parse(await Bun.stdin.text()); console.log(JSON.stringify(input.length));"], largeInput);
  expect(result).toBe(largeInput.length);
});
