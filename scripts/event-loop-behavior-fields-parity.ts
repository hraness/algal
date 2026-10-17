import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { summarizeEventLoopBehavior } from "../src/event-loop-behavior";
import { verifyEventLoopTraceStructure } from "../src/event-loop-structure";
import { behaviorFieldVectors, fieldHash } from "./event-loop-behavior-field-vectors";

const vectors = behaviorFieldVectors();
const rows = vectors.flatMap(({cell, control, behavior, controlTrace, trace, expected}) => [
  {name: `control-${cell}`, actor: controlTrace.actor, behavior: control, trace: controlTrace, expected: undefined},
  {name: cell, actor: trace.actor, behavior, trace, expected},
]);
const result = (f: () => unknown): unknown => {
  try { return f(); }
  catch (error) {
    if (!(error instanceof EventLoopContractError)) throw error;
    return {code: error.code};
  }
};
const summary = rows.map(({name, actor, behavior, expected}) => {
  const value = result(() => summarizeEventLoopBehavior(behavior, actor));
  if (typeof value !== "object" || value === null) throw new Error(`no summary: ${name}`);
  if ("code" in value ? value.code !== expected : expected !== undefined ||
      (value as ReturnType<typeof summarizeEventLoopBehavior>).digest !== behavior.digest ||
      (value as ReturnType<typeof summarizeEventLoopBehavior>).summaryDigest !==
        fieldHash((value as ReturnType<typeof summarizeEventLoopBehavior>).summary as JsonValue)) {
    throw new Error(`unexpected behavior-only result: ${name}`);
  }
  return {name, result: value};
});
const structure = rows.map(({name, behavior, trace, expected}) => {
  const value = result(() => verifyEventLoopTraceStructure(trace, behavior));
  if (typeof value !== "object" || value === null ||
      ("code" in value ? value.code !== expected : expected !== undefined ||
        (value as ReturnType<typeof verifyEventLoopTraceStructure>).digest !== trace.digest)) {
    throw new Error(`unexpected structural result: ${name}`);
  }
  return {name, result: value};
});
// Each native example limits input to 64 rows and 4 MiB. Use 14 complete
// control/damage pairs per request, never silently truncate a vector.
for (const [start, end] of [[0, 28], [28, 56]] as const) {
  for (const [example, expected, input] of [
    ["event_loop_behavior_parity", summary, rows.map(({name, behavior, actor}) => ({name, behavior, actor}))],
    ["event_loop_structure_parity", structure, rows.map(({name, behavior, trace}) => ({name, behavior, trace}))],
  ] as const) {
    const chunk = input.slice(start, end);
    const serialized = JSON.stringify(chunk);
    if (Buffer.byteLength(serialized, "utf8") > 4_194_304) throw new Error(`native input too large: ${example}`);
    const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", example], {
      stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env,
        CARGO_TARGET_DIR: process.env.CARGO_TARGET_DIR ?? `${process.cwd()}/target`},
    });
    rust.stdin.write(serialized);
    rust.stdin.end();
    const [stdout, stderr, status] = await Promise.all([
      new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited,
    ]);
    if (status !== 0) throw new Error(`Rust ${example} failed (${status}): ${stderr}`);
    if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(expected.slice(start, end) as JsonValue)) {
      throw new Error(`TypeScript/Rust mismatch: ${example} rows ${start}..${end}`);
    }
  }
}
console.log(`event-loop behavior fields: ${vectors.length} cells, ${vectors.length} control/damage pairs (${rows.length} records), behavior-only and structural TypeScript/Rust parity`);
