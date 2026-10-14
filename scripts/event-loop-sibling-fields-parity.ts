import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError, parseEventLoopTrace } from "../src/event-loop-contract";
import { verifyEventLoopTraceStructure } from "../src/event-loop-structure";
import { siblingFieldVectors } from "./event-loop-sibling-field-vectors";

const vectors = siblingFieldVectors();
if (vectors.length !== 17) throw new Error("field-vector inventory changed");
// Compare both sides of each vector with Rust. A TypeScript-only control
// would not show that the native checker accepts the undamaged declaration.
const rows = vectors.flatMap(({name, trace, behavior, controlTrace, controlBehavior, expected}) => [
  {name: `control-${name}`, trace: controlTrace, behavior: controlBehavior, expected: undefined},
  {name, trace, behavior, expected},
]);
if (rows.length !== 34) throw new Error("control/vector pair count changed");
const results = rows.map(({name, trace, behavior, expected}) => {
  if (parseEventLoopTrace(trace).digest !== trace.digest) throw new Error(`invalid trace witness: ${name}`);
  try {
    const result = verifyEventLoopTraceStructure(trace, behavior);
    if (expected || result.digest !== trace.digest) throw new Error(`unexpected acceptance: ${name}`);
    return {name, result};
  } catch (error) {
    if (!(error instanceof EventLoopContractError)) throw error;
    if (error.code !== expected) throw new Error(`unexpected refusal: ${name}: ${error.code}`);
    return {name, result: {code: error.code}};
  }
});
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_structure_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env, CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(rows.map(({name, trace, behavior}) => ({name, trace, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust sibling field parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) throw new Error("event-loop sibling field parity mismatch");
console.log(`event-loop sibling field parity: ${vectors.length} redigested vectors with controls, ${rows.length} TypeScript/Rust matches`);
