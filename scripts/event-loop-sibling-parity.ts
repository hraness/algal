/* eslint-disable @typescript-eslint/no-explicit-any -- Foreign adversarial records in parity vectors. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError, parseEventLoopTrace } from "../src/event-loop-contract";
import { verifyEventLoopTraceStructure } from "../src/event-loop-structure";

const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
  return value;
}
function bind(behavior: any): any {
  const trace = structuredClone(fixture.base);
  trace.behavior = behavior.digest;
  trace.limits = structuredClone(behavior.limits);
  for (const entry of trace.entries) {
    entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  }
  return seal(trace);
}
const vectors: Array<{name: string; behavior: any; trace: any; expected: string}> = [];
function addRoot(name: string, change: (behavior: any) => void, expected?: string): void {
  const behavior = structuredClone(pinned);
  const actor = structuredClone(behavior.actors[0]);
  actor.id = "observer";
  behavior.actors.push(actor);
  change(behavior);
  seal(behavior);
  const trace = bind(behavior);
  if (parseEventLoopTrace(trace).digest !== trace.digest) throw new Error(`invalid witness: ${name}`);
  vectors.push({name, behavior, trace, expected: expected ?? trace.digest});
}
function add(name: string, change?: (actor: any) => void, expected?: string): void {
  addRoot(name, (behavior) => { change?.(behavior.actors[1]); }, expected);
}
function addMeta(name: string, change: (meta: any) => void, expected?: string): void {
  addRoot(name, (behavior) => { change(behavior.behavior); seal(behavior.behavior); }, expected);
}
add("valid-sibling");
add("invalid-sibling-schema", (a) => { a.state.fields[0].type = "invalid"; }, "EVENT_LOOP_SCHEMA");
add("oversize-sibling-state", (a) => { a.state.fields[0].type = "string"; a.state.fields[0].initial = "x".repeat(16_384); }, "EVENT_LOOP_BOUNDS");
add("empty-sibling-rules", (a) => { a.transitions = []; }, "EVENT_LOOP_BOUNDS");
add("unknown-sibling-event", (a) => { a.transitions[0].on = "undeclared"; }, "EVENT_LOOP_REFERENCE");
add("unknown-sibling-field", (a) => { a.transitions[0].writes[0].path = ["undeclared"]; }, "EVENT_LOOP_REFERENCE");
add("duplicate-sibling-write", (a) => { a.transitions[0].writes.push(structuredClone(a.transitions[0].writes[0])); }, "EVENT_LOOP_SEMANTIC");
add("invalid-sibling-expression", (a) => { a.transitions[0].when.contract = "invalid"; }, "EVENT_LOOP_CONTRACT");
add("unknown-sibling-target", (a) => { a.transitions[0].outputs[0].target = "undeclared"; }, "EVENT_LOOP_REFERENCE");
add("pending-sibling-write", (a) => { a.transitions[0].outputs = []; a.transitions[0].result = {kind: "defer", key: a.transitions[0].when}; }, "EVENT_LOOP_SEMANTIC");

// Field-specific redigested behavior witnesses, not a claim of complete P1 coverage.
// Every case keeps the selected actor's trace unchanged while checking the
// event declarations or an unselected actor before the trace is replayed.
addRoot("missing-event-schema-kind", (b) => { delete b.events[2].payload.kind; }, "EVENT_LOOP_PARSE");
addRoot("extra-event-schema-key", (b) => { b.events[2].payload.unexpected = true; }, "EVENT_LOOP_UNKNOWN_KEY");
addRoot("malformed-event-field-type", (b) => { b.events[2].payload.fields[0].type = "bytes"; }, "EVENT_LOOP_SCHEMA");
addRoot("duplicate-event-with-malformed-schema", (b) => { b.events[2].id = "increment"; b.events[2].payload.fields[0].type = "bytes"; }, "EVENT_LOOP_ID");
addRoot("missing-event-field-name", (b) => { delete b.events[2].payload.fields[0].name; }, "EVENT_LOOP_PARSE");
addRoot("extra-event-field-key", (b) => { b.events[2].payload.fields[0].optional = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("missing-sibling-state-kind", (a) => { delete a.state.kind; }, "EVENT_LOOP_PARSE");
add("extra-sibling-state-key", (a) => { a.state.extra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("missing-sibling-initial", (a) => { delete a.state.fields[0].initial; }, "EVENT_LOOP_PARSE");
add("extra-sibling-state-field-key", (a) => { a.state.fields[0].optional = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("sibling-state-field-at-64", (a) => {
  for (let i = 1; i < 64; i++) a.state.fields.push({name: `field-${i}`, type: "number", initial: 0});
});
add("sibling-state-field-at-65", (a) => {
  for (let i = 1; i < 65; i++) a.state.fields.push({name: `field-${i}`, type: "number", initial: 0});
}, "EVENT_LOOP_BOUNDS");
add("missing-sibling-transition-on", (a) => { delete a.transitions[0].on; }, "EVENT_LOOP_PARSE");
add("extra-sibling-transition-key", (a) => { a.transitions[0].debug = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("missing-sibling-write-value", (a) => { delete a.transitions[0].writes[0].value; }, "EVENT_LOOP_PARSE");
add("extra-sibling-write-key", (a) => { a.transitions[0].writes[0].extra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("empty-sibling-write-path", (a) => { a.transitions[0].writes[0].path = []; }, "EVENT_LOOP_BOUNDS");
add("nested-sibling-write-path", (a) => { a.transitions[0].writes[0].path = ["count", "nested"]; }, "EVENT_LOOP_BOUNDS");
add("missing-sibling-output-payload", (a) => { delete a.transitions[0].outputs[0].payload; }, "EVENT_LOOP_PARSE");
add("extra-sibling-output-key", (a) => { a.transitions[0].outputs[0].extra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("missing-sibling-result-kind", (a) => { delete a.transitions[0].result.kind; }, "EVENT_LOOP_PARSE");
add("extra-sibling-result-key", (a) => { a.transitions[0].result.extra = true; }, "EVENT_LOOP_UNKNOWN_KEY");

// The metadata digest is recomputed independently of the root and trace. This
// reaches the field checker instead of accepting a trivial stale-root refusal.
addMeta("missing-behavior-id", (m) => { delete m.id; }, "EVENT_LOOP_PARSE");
addMeta("missing-behavior-revision", (m) => { delete m.revision; }, "EVENT_LOOP_PARSE");
addMeta("missing-behavior-source-digest", (m) => { delete m.sourceDigest; }, "EVENT_LOOP_PARSE");
addMeta("extra-behavior-metadata-key", (m) => { m.unexpected = true; }, "EVENT_LOOP_UNKNOWN_KEY");
addRoot("missing-behavior-metadata-digest", (b) => { delete b.behavior.digest; }, "EVENT_LOOP_PARSE");
addMeta("behavior-id-at-64", (m) => { m.id = "a".repeat(64); });
addMeta("behavior-id-at-65", (m) => { m.id = "a".repeat(65); }, "EVENT_LOOP_ID");
addMeta("malformed-behavior-id", (m) => { m.id = "Mixed Case"; }, "EVENT_LOOP_ID");
addMeta("behavior-revision-at-maximum", (m) => { m.revision = 2_147_483_647; });
addMeta("behavior-revision-above-maximum", (m) => { m.revision = 2_147_483_648; }, "EVENT_LOOP_BOUNDS");
addMeta("behavior-revision-zero", (m) => { m.revision = 0; }, "EVENT_LOOP_BOUNDS");
addMeta("malformed-behavior-source-digest", (m) => { m.sourceDigest = "sha256:INVALID"; }, "EVENT_LOOP_DIGEST");
addRoot("stale-behavior-metadata-digest", (b) => { b.behavior.revision++; }, "EVENT_LOOP_DIGEST");
for (const reverse of [false, true]) {
  const name = `competing-malformed-siblings-${reverse ? "reverse" : "forward"}`;
  const behavior = structuredClone(pinned);
  const high = structuredClone(behavior.actors[0]);
  high.id = "z-fault";
  high.state.fields[0].type = "invalid";
  const low = structuredClone(behavior.actors[0]);
  low.id = "a-fault";
  low.transitions = [];
  behavior.actors.push(...(reverse ? [low, high] : [high, low]));
  seal(behavior);
  const trace = bind(behavior);
  if (parseEventLoopTrace(trace).digest !== trace.digest) throw new Error(`invalid witness: ${name}`);
  vectors.push({name, behavior, trace, expected: "EVENT_LOOP_BOUNDS"});
}
const results = vectors.map(({name, trace, behavior}) => {
  try { return {name, result: verifyEventLoopTraceStructure(trace, behavior)}; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return {name, result: {code: error.code}}; }
});
for (const [index, vector] of vectors.entries()) {
  if (Object.values(results[index]!.result)[0] !== vector.expected) throw new Error(`TypeScript mismatch: ${vector.name}`);
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_structure_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env, CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(vectors.map(({name, trace, behavior}) => ({name, trace, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust sibling parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) throw new Error("event-loop sibling parity mismatch");
console.log(`event-loop sibling parity: ${vectors.length} redigested vectors, matching digests, selected-actor summary and refusal codes`);
