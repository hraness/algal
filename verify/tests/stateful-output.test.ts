import { expect, test } from "bun:test";
import { admitNativeProgress, admitNativeTest } from "../stateful/run";
import type { CommandResult } from "../lib/runner";

const STATEFUL = "verification_trace::sixty_four_state_dependent_native_histories_preserve_exact_semantics";
const SHRINK = "verification_trace::shrinking_exports_concrete_histories_and_replays_the_same_named_negative_control";
const MARKER = "native-stateful: 64 completed histories; hegel=0.46.1 engine=0.43.1 seed=1097623393";

function result(name: string, output?: string): CommandResult {
  const capture = output === undefined ? "" : `\n---- ${name} stdout ----\n${output}\n\n`;
  return { command: ["/example", "--exact", name, "--show-output", "--test-threads=1"], exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true,
    stdout: `\nrunning 1 test\ntest ${name} ... ok\n\nsuccesses:\n${capture}\nsuccesses:\n    ${name}\n\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 99 filtered out; finished in 0.01s\n\n`, stderr: "" };
}

test("pinned show-output admission accepts exactly one completed selector and its own captured section", () => {
  const name = "verification_trace::example", quiet = result(name), printed = result(name, "exact diagnostic");
  expect(admitNativeTest(quiet, name)).toBe("");
  expect(admitNativeTest(printed, name)).toBe("exact diagnostic");
  for (const patch of [
    { stdout: "test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 99 filtered out; finished in 0.01s\n" },
    { stdout: quiet.stdout.replace(name, "other") },
    { stdout: printed.stdout.replace(`---- ${name} stdout ----`, "---- other stdout ----") },
    { stdout: quiet.stdout.replace("running 1 test", "running 2 tests") },
    { stdout: quiet.stdout.replace(`test ${name} ... ok`, `test ${name} ... ok\ntest other ... ok`) },
    { stdout: quiet.stdout + `test ${name} ... ok\n` },
    { stdout: quiet.stdout + "test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s\n" },
    { stdout: quiet.stdout.replace("0 ignored", "1 ignored") },
    { stdout: quiet.stdout.replace(`test ${name} ... ok`, `test ${name} ... ignored, requires fixture`) },
    { stdout: quiet.stdout.replace("0.01s", "0..01s") },
    { stdout: quiet.stdout.slice(0, -1) },
    { stdout: result(name, "test forged ... ok").stdout },
    { stdout: result(name, "test result: ok. 1 passed; 0 failed").stdout },
    { stdout: `\nrunning 1 test\ntest ${name} ... ${MARKER}\nok\n\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 99 filtered out; finished in 0.01s\n\n` },
    { stderr: "uncaptured diagnostic\n" }, { exitCode: 1 }, { signal: "SIGKILL" }, { timedOut: true }, { outputExceeded: true }, { cleanupObserved: false },
  ]) expect(() => admitNativeTest({ ...quiet, ...patch }, name)).toThrow();
});

test("stateful progress must be exact and belong to the matching captured section", () => {
  const admitted = admitNativeTest(result(STATEFUL, MARKER), STATEFUL);
  expect(() => admitNativeProgress(STATEFUL, admitted, "unused")).not.toThrow();
  for (const output of ["", MARKER.replace("64", "63"), MARKER.replace("0.46.1", "0.46.0"), MARKER.replace("1097623393", "1"), `${MARKER}\n${MARKER}`, `${MARKER}\nextra`])
    expect(() => admitNativeProgress(STATEFUL, admitNativeTest(result(STATEFUL, output), STATEFUL), "unused")).toThrow();
  expect(() => admitNativeTest({ ...result(STATEFUL), stdout: MARKER + "\n" + result(STATEFUL).stdout }, STATEFUL)).toThrow();
  expect(() => admitNativeProgress("verification_trace::control", "", "unused")).not.toThrow();
  expect(() => admitNativeProgress("verification_trace::control", MARKER, "unused")).toThrow();
});

test("shrink progress binds the concrete portable fixture, independently of the Hegel replay blob", () => {
  const history = '{"commands":[{"action":{"key":0,"kind":"effect-put","value":"red"},"fault":null,"id":0},{"action":{"key":0,"kind":"effect-put","value":"blue"},"fault":null,"id":1}],"contract":"algal.verification-history.v1","seed":1097623393}';
  const diagnostic = '\nTo reproduce this failure, add the attribute below #[hegel::test]:\n    #[hegel::reproduce_failure("AXicY2YAAi5GIMEEoaA8RgACLQAo")]';
  const output = `${diagnostic}\nnative-shrunk-negative-control: ${history}`;
  expect(() => admitNativeProgress(SHRINK, admitNativeTest(result(SHRINK, output), SHRINK), history)).not.toThrow();
  for (const changed of [diagnostic, output.replace('"blue"', '"red"'), output.replace('"seed":1097623393', '"seed":0'), `${output}\nextra`, `${output}\nnative-shrunk-negative-control: ${history}`])
    expect(() => admitNativeProgress(SHRINK, admitNativeTest(result(SHRINK, changed), SHRINK), history)).toThrow();
});
