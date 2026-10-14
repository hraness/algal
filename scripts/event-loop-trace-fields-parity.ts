import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { summarizeEventLoopTrace } from "../src/event-loop-summary";
import { traceFieldVectors } from "./event-loop-trace-field-vectors";

const vectors = traceFieldVectors();
const rows = vectors.flatMap(({name, control, value, expected}) => [
  {name: `control-${name}`, value: control, expected: undefined},
  {name, value, expected},
]);
if (rows.length !== 56 || rows.length > 128) throw new Error("trace field parity input limit changed");
const typescript = rows.map(({name, value, expected}) => {
  try {
    const result = summarizeEventLoopTrace(value);
    if (expected || result.digest !== value.digest) throw new Error(`unexpected acceptance: ${name}`);
    return {name, result};
  } catch (error) {
    if (!(error instanceof EventLoopContractError)) throw error;
    if (error.code !== expected) throw new Error(`unexpected refusal: ${name}: ${error.code}`);
    return {name, result: {code: error.code}};
  }
});
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_contract_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env, CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(rows.map(({name, value}) => ({name, value}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust trace-field parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(typescript as JsonValue))
  throw new Error("event-loop trace-field parity mismatch");
console.log(`event-loop trace-field parity: ${vectors.length} redigested vectors with controls, ${rows.length} TypeScript/Rust matches`);
