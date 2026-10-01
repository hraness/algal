import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { telemetryCommandFamily } from "./telemetry";

describe("aggregate command telemetry", () => {
  test("covers the current CLI's top-level dispatch without accepting subcommands", () => {
    const cli = readFileSync(new URL("../cli.ts", import.meta.url), "utf8").split("async function main(): Promise<number> {")[1]!;
    const commands = [...cli.matchAll(/^ {4}case "([a-z-]+)":/gmu)].map(match => match[1]!);
    expect(commands.length).toBeGreaterThan(30);
    for (const command of [...commands, "task"]) {
      expect(telemetryCommandFamily([command])).toBe(command);
    }
    expect(telemetryCommandFamily(["create"])).toBeUndefined();
    expect(telemetryCommandFamily(["update"])).toBeUndefined();
  });

  test("reports only the command family, never subcommands or their values", () => {
    expect(telemetryCommandFamily(["process", "create", "private-name", "/private/file"])).toBe("process");
    expect(telemetryCommandFamily(["run", "/private/task.algal.json", "--token", "secret"])).toBe("run");
  });

  test("rejects free-form values that would pass a command-shaped regex", () => {
    for (const value of ["private-client", "secret-token", "/private/file", "--help", "--version", "RUN", "", "run\nsecret"]) {
      expect(telemetryCommandFamily([value])).toBeUndefined();
    }
    expect(telemetryCommandFamily([])).toBeUndefined();
  });
});
