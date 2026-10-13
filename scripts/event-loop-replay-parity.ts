import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError, parseEventLoopTrace } from "../src/event-loop-contract";
import { eventLoopNotificationDigest, replayEventLoopTrace } from "../src/event-loop-replay";
import { verifyEventLoopTraceStructure } from "../src/event-loop-structure";

const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const behavior = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const seal = <T extends {digest: string}>(value: T): T => {
  const {digest: _prior, ...body} = value;
  value.digest = hash(body as JsonValue);
  return value;
};
const identify = (entry: typeof trace.entries[number], record: typeof trace): void => {
  entry.eventDigest = hash({behavior:record.behavior, actor:record.actor, source:entry.source,
    sequence:entry.sequence, type:entry.type, payload:entry.payload});
  entry.messageDigest = hash({event:entry.eventDigest, target:record.actor, delivery:entry.delivery});
};
const trace = structuredClone(fixture.base);
trace.entries[0].decision.resources.fuel = 27;
trace.entries[0].decision.outputs[0] = eventLoopNotificationDigest(trace.entries[0].messageDigest,
  "increment", 0, "counter", "incremented", {amount: 1});
trace.entries[3].decision.resources.fuel = 1;
seal(trace);
const substituted = structuredClone(trace);
substituted.entries[0].decision.outputs[0] = `sha256:${"0".repeat(64)}`;
seal(substituted);
if (parseEventLoopTrace(substituted).digest !== substituted.digest ||
    verifyEventLoopTraceStructure(substituted, behavior).digest !== substituted.digest) {
  throw new Error("output substitution no longer reaches replay");
}
const wrongFuel = structuredClone(trace);
wrongFuel.entries[0].decision.resources.fuel = 26;
seal(wrongFuel);
const wrongState = structuredClone(trace);
wrongState.entries[0].decision.stateDigest = hash({count: 2});
seal(wrongState);
const falseGuard = structuredClone(trace);
falseGuard.entries = [falseGuard.entries[0]];
falseGuard.entries[0].payload.amount = 0;
identify(falseGuard.entries[0], falseGuard);
falseGuard.entries[0].decision = {kind:"accepted",transition:null,outcome:"no-transition",
  stateDigest:hash({count:0}),outputs:[],effects:{requested:0,settled:0,receipts:[]},
  resources:{fuel:9,stateBytes:Buffer.byteLength(canonicalize({count:0})),outputEvents:0}};
seal(falseGuard);
const wrongGuard = structuredClone(falseGuard);
wrongGuard.entries[0].decision.resources.fuel = 8;
seal(wrongGuard);
// The shape-only fixture's first decision has placeholder fuel and output id.
const failedAfterCommit = structuredClone(fixture.failed);
failedAfterCommit.entries = [structuredClone(trace.entries[0]), ...failedAfterCommit.entries.slice(1)];
seal(failedAfterCommit);
const firstCommit = structuredClone(failedAfterCommit);
firstCommit.entries = [firstCommit.entries[0]];
seal(firstCommit);
if (replayEventLoopTrace(firstCommit, behavior).digest !== firstCommit.digest) {
  throw new Error("failed-decision negative control does not replay its preceding commit");
}
function pending(kind: "defer" | "escalate"): {trace: typeof trace; behavior: typeof behavior} {
  const proposed = structuredClone(behavior);
  const rule = proposed.actors[0].transitions[0];
  rule.writes = [];
  rule.outputs = [];
  rule.result = kind === "defer"
    ? {kind, key: {contract: "algal.expr.v1", program: "ticket"}}
    : {kind, request: {contract: "algal.expr.v1", program: {action: "review"}}};
  seal(proposed);
  const record = structuredClone(trace);
  record.entries = [record.entries[0]];
  record.behavior = proposed.digest;
  const entry = record.entries[0];
  identify(entry, record);
  entry.decision = {kind:"accepted",transition:"increment",outcome:kind,
    stateDigest:hash({count:0}),outputs:[],effects:{requested:0,settled:0,receipts:[]},
    resources:{fuel:0,stateBytes:Buffer.byteLength(canonicalize({count:0})),outputEvents:0}};
  return {trace:seal(record), behavior:proposed};
}
function failureCase(reason: "fuel-exhausted" | "expression-error" | "state-overflow" | "output-invalid"):
  {trace: typeof trace; behavior: typeof behavior} {
  const proposed = structuredClone(behavior);
  const record = structuredClone(trace);
  record.entries = [record.entries[0]];
  const entry = record.entries[0];
  let fuel: number;
  let transition: string | null;
  if (reason === "fuel-exhausted") {
    proposed.limits.maxTransitionFuel = record.limits.maxTransitionFuel = 8;
    fuel = 8; transition = null;
  } else if (reason === "expression-error") {
    proposed.actors[0].transitions[0].when.program = 0;
    fuel = 1; transition = null;
  } else if (reason === "state-overflow") {
    proposed.limits.maxStateBytes = record.limits.maxStateBytes = 11;
    entry.payload.amount = 100;
    fuel = 23; transition = "increment";
  } else {
    proposed.actors[0].transitions[0].outputs[0].payload.program = 0;
    fuel = 24; transition = "increment";
  }
  seal(proposed);
  record.behavior = proposed.digest;
  identify(entry, record);
  entry.decision = {kind:"failed",reason,transition,stateDigest:hash({count:0}),
    resources:{fuel,stateBytes:11,outputEvents:0}};
  return {trace:seal(record), behavior:proposed};
}
const deferred = pending("defer");
const escalated = pending("escalate");
for (const {trace: record, behavior: proposed} of [
  {trace: failedAfterCommit, behavior}, deferred, escalated,
]) {
  if (parseEventLoopTrace(record).digest !== record.digest ||
      verifyEventLoopTraceStructure(record, proposed).digest !== record.digest) {
    throw new Error("pending or invented failure does not reach replay");
  }
}
const vectors = [
  {name:"replayable", trace, behavior, expected:trace.digest},
  {name:"substituted-output", trace:substituted, behavior, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"wrong-fuel", trace:wrongFuel, behavior, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"wrong-state", trace:wrongState, behavior, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"false-guard", trace:falseGuard, behavior, expected:falseGuard.digest},
  {name:"false-guard-wrong-fuel", trace:wrongGuard, behavior, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"unsupported-failure", trace:fixture.failed, behavior, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"valid-commit-before-failure", trace:firstCommit, behavior, expected:firstCommit.digest},
  {name:"failed-after-valid-commit", trace:failedAfterCommit, behavior, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"deferred-without-witness", ...deferred, expected:"EVENT_LOOP_SEMANTIC"},
  {name:"escalated-without-witness", ...escalated, expected:"EVENT_LOOP_SEMANTIC"},
];
for (const [kind, original, value] of [
  ["defer", deferred, "ticket"], ["escalate", escalated, {action:"review"}],
] as const) {
  const valid = structuredClone(original.trace);
  valid.entries[0].decision.pending = value;
  valid.entries[0].decision.resources.fuel = kind === "defer" ? 10 : 11; // guard 9, literal 1 or object 2
  seal(valid);
  vectors.push({name:`${kind}-checked`,trace:valid,behavior:original.behavior,expected:valid.digest});
  const forged = structuredClone(valid);
  forged.entries[0].decision.pending = false;
  seal(forged);
  vectors.push({name:`${kind}-forged-value`,trace:forged,behavior:original.behavior,expected:"EVENT_LOOP_SEMANTIC"});
  const wrongFuel = structuredClone(valid);
  wrongFuel.entries[0].decision.resources.fuel -= 1;
  seal(wrongFuel);
  vectors.push({name:`${kind}-wrong-fuel`,trace:wrongFuel,behavior:original.behavior,expected:"EVENT_LOOP_SEMANTIC"});
  const oversized = structuredClone(valid);
  oversized.entries[0].decision.pending = "x".repeat(16_383);
  seal(oversized);
  vectors.push({name:`${kind}-oversized`,trace:oversized,behavior:original.behavior,expected:"EVENT_LOOP_BOUNDS"});
}
for (const reason of ["fuel-exhausted", "expression-error", "state-overflow", "output-invalid"] as const) {
  const valid = failureCase(reason);
  vectors.push({name:`failed-${reason}`, ...valid, expected:valid.trace.digest});
  const wrong = structuredClone(valid.trace);
  wrong.entries[0].decision.reason = reason === "output-invalid" ? "state-overflow" : "output-invalid";
  seal(wrong);
  vectors.push({name:`forged-${reason}`, trace:wrong, behavior:valid.behavior, expected:"EVENT_LOOP_SEMANTIC"});
}
const results = vectors.map(({name, trace, behavior}) => {
  try { return {name, result: replayEventLoopTrace(trace, behavior)}; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return {name, result:{code:error.code}}; }
});
for (const [index, vector] of vectors.entries()) {
  if (Object.values(results[index]!.result)[0] !== vector.expected) throw new Error(`TS replay mismatch: ${vector.name}`);
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_replay_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env,
    CARGO_NET_OFFLINE:process.env.CARGO_NET_OFFLINE ?? "true", CARGO_TARGET_DIR:`${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(vectors.map(({name, trace, behavior}) => ({name, trace, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust replay parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) throw new Error("event-loop replay parity mismatch");
console.log(`event-loop replay parity: ${vectors.length} shared successful and refusal vectors`);
