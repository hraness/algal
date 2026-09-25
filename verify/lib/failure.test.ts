import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CommandFailure } from "./runner";
import { stableJson } from "./files";
import { commandFailureRecord, retainFailure } from "./failure";

test("raw failure survives exclusive-file collision and remaining diagnostics are attempted", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-failure-retention-test-"));
  const primary = new Error("original invalid UTF-8 output");
  const bytes = Uint8Array.of(255, 0, 254);
  try {
    await writeFile(join(directory, "stdout.bin"), "earlier evidence", { flag: "wx" });
    let caught: unknown;
    try {
      await retainFailure(primary, [
        () => writeFile(join(directory, "stdout.bin"), bytes, { flag: "wx" }),
        () => writeFile(join(directory, "stderr.bin"), bytes, { flag: "wx" }),
        () => writeFile(join(directory, "failure.json"), "{}\n", { flag: "wx" }),
      ]);
    } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(AggregateError);
    const aggregate = caught as AggregateError;
    expect(aggregate.cause).toBe(primary);
    expect(aggregate.message).toContain(primary.message);
    expect(aggregate.errors[0]).toBe(primary);
    expect(aggregate.errors).toHaveLength(2);
    expect(await readFile(join(directory, "stdout.bin"), "utf8")).toBe("earlier evidence");
    expect(new Uint8Array(await readFile(join(directory, "stderr.bin")))).toEqual(bytes);
    expect(await readFile(join(directory, "failure.json"), "utf8")).toBe("{}\n");
  } finally { await rm(directory, { recursive: true }); }
});

test("successful diagnostic retention rethrows the exact original failure", async () => {
  const primary = new Error("primary"), visited: number[] = [];
  let caught: unknown;
  try { await retainFailure(primary, [async () => { visited.push(1); }, async () => { visited.push(2); }]); }
  catch (error) { caught = error; }
  expect(caught).toBe(primary);
  expect(visited).toEqual([1, 2]);
});

test("missing supervisor observations serialize without inventing completion", () => {
  const failure = new CommandFailure("no completion", Uint8Array.of(255), new Uint8Array(), {
    command: ["/fixture/child"], completion: undefined, drained: undefined,
    receivedBytes: { stdout: 1, stderr: 0 }, supervisorExit: undefined,
    timedOut: true, outputExceeded: false, stdoutEnded: false, stderrEnded: false,
  });
  const raw = stableJson(commandFailureRecord(failure));
  const record = JSON.parse(raw);
  expect(record.observation.completion).toBeNull();
  expect(record.observation.drained).toBeNull();
  expect(record.observation.supervisorExit).toBeNull();
  expect(record.observation.timedOut).toBe(true);
  expect(record.observation.stdoutEnded).toBe(false);
  expect(record.observation.receivedBytes).toEqual({ stdout: 1, stderr: 0 });
});

test("every failing writer is attempted while caller path and original cause survive", async () => {
  const original = new Error("original command failure"), primary = new Error("trace run rejected; raw evidence at /owned/stage", { cause: original });
  const first = new Error("stdout blocked"), second = new Error("stderr blocked"), visited: number[] = [];
  let caught: unknown;
  try { await retainFailure(primary, [() => { visited.push(1); throw first; }, async () => { visited.push(2); throw second; }, async () => { visited.push(3); }]); }
  catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(AggregateError);
  const result = caught as AggregateError;
  expect(result.message).toContain("/owned/stage");
  expect(result.cause).toBe(primary);
  expect((result.cause as Error).cause).toBe(original);
  expect(result.errors).toEqual([primary, first, second]);
  expect(visited).toEqual([1, 2, 3]);
});
