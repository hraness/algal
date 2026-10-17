import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { replayEventLoopTrace } from "../src/event-loop-replay";
import { pureEffectVectors } from "./event-loop-pure-effect-vectors";

const {behavior, control, vectors} = await pureEffectVectors();
if (replayEventLoopTrace(control, behavior).digest !== control.digest) {
  throw new Error("pure-effect control no longer replays");
}
const inputs = [{name: "zero", trace: control, behavior},
  ...vectors.map(({name, value}) => ({name, trace: value, behavior}))];
const expected = inputs.map(({name, trace}) => {
  try { return {name, result: replayEventLoopTrace(trace, behavior)}; }
  catch (error) {
    if (!(error instanceof EventLoopContractError)) throw error;
    return {name, result: {code: error.code}};
  }
});
for (const [i, vector] of vectors.entries()) {
  const result = expected[i + 1]!.result;
  if (!("code" in result) || result.code !== vector.expected) {
    throw new Error(`TypeScript pure-effect refusal mismatch: ${vector.name}`);
  }
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_replay_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env,
    CARGO_NET_OFFLINE: process.env.CARGO_NET_OFFLINE ?? "true", CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(inputs));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([
  new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited,
]);
if (status !== 0) throw new Error(`Rust pure-effect replay failed (${status}): ${stderr}`);
const native: unknown = JSON.parse(stdout);
if (!Array.isArray(native) || native.length !== expected.length ||
    canonicalize(native as JsonValue) !== canonicalize(expected as JsonValue)) {
  throw new Error("event-loop pure-effect replay parity mismatch");
}
console.log(`event-loop pure-effect replay parity: ${inputs.length} shared control and refusal vectors`);
