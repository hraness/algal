import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { replayEventLoopTrace } from "../src/event-loop-replay";
import { outputVectors } from "./event-loop-output-vectors";

const results = outputVectors.map(({name, trace, behavior, expected}) => {
  try {
    const result = replayEventLoopTrace(trace, behavior);
    if (result.digest !== expected) throw new Error(`unexpected TS digest: ${name}`);
    return {name, result};
  } catch (error) {
    if (!(error instanceof EventLoopContractError)) throw error;
    if (error.code !== expected) throw new Error(`unexpected TS refusal: ${name}: ${error.code}`);
    return {name, result: {code: error.code}};
  }
});
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_replay_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env,
    CARGO_NET_OFFLINE: process.env.CARGO_NET_OFFLINE ?? "true", CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(outputVectors.map(({name, trace, behavior}) => ({name, trace, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust output parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) {
  throw new Error("event-loop output parity mismatch");
}
console.log(`event-loop output parity: ${outputVectors.length} shared boundary and refusal vectors`);
