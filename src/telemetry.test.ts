import { describe, expect, test } from "bun:test";
import { telemetryCommandFamily } from "./telemetry";

describe("aggregate command telemetry", () => {
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
