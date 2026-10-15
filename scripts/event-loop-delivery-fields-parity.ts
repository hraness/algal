import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { replayEventLoopTrace } from "../src/event-loop-replay";
import { deliveryFieldVectors } from "./event-loop-delivery-field-vectors";

const pairs = deliveryFieldVectors();
const vectors = pairs.flatMap(({field, control, mutation, expected}) => [
  {name: `${field}:control`, ...control, expected: control.trace.digest},
  {name: `${field}:mutation`, ...mutation, expected},
]);
if (vectors.length !== 12 || vectors.length > 64) throw new Error("delivery replay inventory changed");
const input = JSON.stringify(vectors.map(({name, trace, behavior}) => ({name, trace, behavior})));
if (Buffer.byteLength(input, "utf8") > 4 * 1024 * 1024) throw new Error("native delivery replay input too large");
const results = vectors.map(({name, behavior, trace}) => {
  try { return {name, result: replayEventLoopTrace(trace, behavior)}; }
  catch (error) {
    if (!(error instanceof EventLoopContractError)) throw error;
    return {name, result: {code: error.code}};
  }
});
for (const [index, vector] of vectors.entries()) {
  const actual = results[index]!.result;
  if ("code" in actual ? actual.code !== vector.expected :
      actual.digest !== vector.expected || actual.summary.accepted !== 1 || actual.summary.failed !== 0) {
    throw new Error(`TypeScript delivery replay mismatch: ${vector.name}`);
  }
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_replay_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env,
    CARGO_NET_OFFLINE: process.env.CARGO_NET_OFFLINE ?? "true", CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(input);
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([
  new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited,
]);
if (status !== 0) throw new Error(`Rust delivery replay parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) {
  throw new Error("event-loop delivery replay parity mismatch");
}
console.log(`event-loop delivery replay parity: ${pairs.length} control/mutation pairs (${vectors.length} records)`);
