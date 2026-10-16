import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError, parseEventLoopTrace } from "../src/event-loop-contract";
import { replayEventLoopTrace } from "../src/event-loop-replay";
import { verifyEventLoopTraceStructure } from "../src/event-loop-structure";

const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const seal = <T extends {digest: string}>(value: T): T => {
  const {digest: _old, ...body} = value;
  value.digest = hash(body as JsonValue);
  return value;
};
function vector(program: JsonValue, slot: "guard" | "write" = "guard") {
  const behavior = structuredClone(pinned);
  const unused = structuredClone(behavior.actors[0]);
  unused.id = "observer";
  if (slot === "guard") unused.transitions[0].when.program = program;
  else unused.transitions[0].writes[0].value.program = program;
  behavior.actors.push(unused);
  seal(behavior);
  const trace = structuredClone(fixture.base);
  trace.entries = [trace.entries[3]]; // accepted reset; no notification to rebind
  trace.entries[0].decision.resources.fuel = 1;
  trace.behavior = behavior.digest;
  const entry = trace.entries[0];
  entry.eventDigest = hash({behavior:trace.behavior, actor:trace.actor, source:entry.source,
    sequence:entry.sequence, type:entry.type, payload:entry.payload});
  entry.messageDigest = hash({event:entry.eventDigest, target:trace.actor, delivery:entry.delivery});
  seal(trace);
  return {behavior, trace};
}
const accepted = vector(["get", "event", "amount"]);
const refused = vector(["not-an-op"]);
const badWrite = vector(["get", "unknown"], "write");
if (parseEventLoopTrace(refused.trace).digest !== refused.trace.digest ||
    verifyEventLoopTraceStructure(refused.trace, refused.behavior).digest !== refused.trace.digest ||
    parseEventLoopTrace(badWrite.trace).digest !== badWrite.trace.digest ||
    verifyEventLoopTraceStructure(badWrite.trace, badWrite.behavior).digest !== badWrite.trace.digest) {
  throw new Error("unselected actor does not reach expression replay");
}
const vectors = [
  {name:"valid-sibling", ...accepted, expected:accepted.trace.digest},
  {name:"invalid-sibling-expression", ...refused, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"unknown-sibling-write", ...badWrite, expected:"EVENT_LOOP_REFERENCE"},
];
const results = vectors.map(({name, trace, behavior}) => {
  try { return {name, result:replayEventLoopTrace(trace, behavior)}; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return {name, result:{code:error.code}}; }
});
for (const [i, vector] of vectors.entries()) {
  if (Object.values(results[i]!.result)[0] !== vector.expected) throw new Error(`TS replay mismatch: ${vector.name}`);
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_replay_parity"], {
  stdin:"pipe", stdout:"pipe", stderr:"pipe", env:{...process.env,
    CARGO_NET_OFFLINE:process.env.CARGO_NET_OFFLINE ?? "true", CARGO_TARGET_DIR:process.env.CARGO_TARGET_DIR ?? `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(vectors.map(({name, trace, behavior}) => ({name, trace, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust replay parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) throw new Error("event-loop sibling replay parity mismatch");
console.log(`event-loop sibling replay parity: ${vectors.length} shared successful and refusal vectors`);
