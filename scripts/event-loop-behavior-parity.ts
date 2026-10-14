/* eslint-disable @typescript-eslint/no-explicit-any -- Redigested malformed behavior vectors. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError } from "../src/event-loop-contract";
import { summarizeEventLoopBehavior } from "../src/event-loop-behavior";

const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(value: any): any {
  const {digest: _old, ...body} = value;
  value.digest = hash(body);
  return value;
}
const expr = (program: JsonValue): any => ({contract: "algal.expr.v1", program});
type Vector = {name: string; behavior: any; actor: string; expected: string | undefined};
const vectors: Vector[] = [];
function add(name: string, change: (b: any) => void, expected?: string, actor = "counter"): void {
  const behavior = structuredClone(pinned);
  change(behavior);
  seal(behavior);
  vectors.push({name, behavior, actor, expected});
}
add("baseline", () => {});
add("selected-sibling", (b) => { const actor = structuredClone(b.actors[0]); actor.id = "observer";
  actor.transitions[0].outputs = []; actor.transitions[0].result = {kind: "quiet"}; b.actors.push(actor); }, undefined, "observer");
add("pending-defer", (b) => { b.actors[0].transitions.push({id: "wait", on: "reset", when: null,
  writes: [], outputs: [], result: {kind: "defer", key: expr(["get", "state", "count"])}}); });
add("pending-escalate", (b) => { b.actors[0].transitions.push({id: "escalate", on: "reset", when: null,
  writes: [], outputs: [], result: {kind: "escalate", request: expr("request")}}); });
add("whole-event", (b) => { b.events[0].payload.fields.push({name: "other", type: "number"});
  b.actors[0].transitions[0].when.program = ["get", "event"]; });
add("computed-path", (b) => { b.actors[0].state.fields.push({name: "other", type: "number", initial: 0});
  b.actors[0].transitions[0].when.program = ["get", "state", ["quote", "count"]]; });
add("computed-head", (b) => { b.actors[0].transitions[0].when.program =
  ["get", ["if", true, "event", "state"]]; });
add("quoted-get", (b) => { b.actors[0].transitions[0].when.program =
  ["quote", ["get", "state", "count"]]; });
add("limits-lower", (b) => { b.limits.maxEventBytes = 1; b.limits.maxStateBytes = 2;
  b.limits.maxOutputEvents = 1; b.limits.maxTransitionFuel = 1; b.limits.maxMailboxDepth = 1; }, "EVENT_LOOP_BOUNDS");
add("limits-upper", (b) => { b.limits.maxEventBytes = 65_536; b.limits.maxStateBytes = 262_144;
  b.limits.maxOutputEvents = 64; b.limits.maxTransitionFuel = 100_000; b.limits.maxMailboxDepth = 1_024; });
for (const [name, key, high] of [
  ["event-limit", "maxEventBytes", 65_537], ["state-limit", "maxStateBytes", 262_145],
  ["output-limit", "maxOutputEvents", 65], ["fuel-limit", "maxTransitionFuel", 100_001],
  ["mailbox-limit", "maxMailboxDepth", 1_025],
] as const) add(name, (b) => { b.limits[key] = high; }, "EVENT_LOOP_BOUNDS");
add("state-at-64", (b) => { b.actors[0].state.fields = Array.from({length: 64}, (_, i) =>
  ({name: `field-${i}`, type: "number", initial: 0})); b.actors[0].transitions[0].writes[0].path = ["field-0"];
  b.actors[0].transitions[1].writes[0].path = ["field-0"]; });
add("state-at-65", (b) => { b.actors[0].state.fields = Array.from({length: 65}, (_, i) =>
  ({name: `field-${i}`, type: "number", initial: 0})); }, "EVENT_LOOP_BOUNDS");
add("events-at-128", (b) => { b.events.push(...Array.from({length: 125}, (_, i) =>
  ({id: `extra-${i}`, payload: {kind: "record", fields: []}}))); });
add("events-at-129", (b) => { b.events.push(...Array.from({length: 126}, (_, i) =>
  ({id: `extra-${i}`, payload: {kind: "record", fields: []}}))); }, "EVENT_LOOP_BOUNDS");
add("output-at-64", (b) => { b.limits.maxOutputEvents = 64; b.actors[0].transitions[0].outputs =
  Array.from({length: 64}, () => structuredClone(b.actors[0].transitions[0].outputs[0])); });
add("output-at-65", (b) => { b.limits.maxOutputEvents = 64; b.actors[0].transitions[0].outputs =
  Array.from({length: 65}, () => structuredClone(b.actors[0].transitions[0].outputs[0])); }, "EVENT_LOOP_BOUNDS");
add("missing-sibling-expression", (b) => { const actor = structuredClone(b.actors[0]); actor.id = "observer";
  delete actor.transitions[0].when.program; b.actors.push(actor); }, "EVENT_LOOP_PARSE");
add("malformed-sibling-expression", (b) => { const actor = structuredClone(b.actors[0]); actor.id = "observer";
  actor.transitions[0].when.program = ["invalid-op"]; b.actors.push(actor); }, "EVENT_LOOP_SEMANTIC");
add("unbound-sibling-expression", (b) => { const actor = structuredClone(b.actors[0]); actor.id = "observer";
  actor.transitions[0].when.program = ["get", "unknown"]; b.actors.push(actor); }, "EVENT_LOOP_REFERENCE");
add("invalid-sibling-state", (b) => { const actor = structuredClone(b.actors[0]); actor.id = "observer";
  actor.state.fields[0].type = "bytes"; b.actors.push(actor); }, "EVENT_LOOP_SCHEMA");
add("duplicate-event-id", (b) => { b.events[2].id = "increment"; b.events[2].payload.fields[0].type = "bytes"; }, "EVENT_LOOP_ID");
add("unknown-output-target", (b) => { b.actors[0].transitions[0].outputs[0].target = "unknown"; }, "EVENT_LOOP_REFERENCE");
add("unknown-output-type", (b) => { b.actors[0].transitions[0].outputs[0].event = "unknown"; }, "EVENT_LOOP_REFERENCE");
add("duplicate-write", (b) => { b.actors[0].transitions[0].writes.push(structuredClone(b.actors[0].transitions[0].writes[0])); }, "EVENT_LOOP_SEMANTIC");
add("unknown-state-path", (b) => { b.actors[0].transitions[0].writes[0].path = ["unknown"]; }, "EVENT_LOOP_REFERENCE");
add("wrong-contract", (b) => { b.contract = "algal.event-loop.v2"; }, "EVENT_LOOP_CONTRACT");
add("unknown-root", (b) => { b.extra = true; }, "EVENT_LOOP_UNKNOWN_KEY");
add("unknown-actor", () => {}, "EVENT_LOOP_REFERENCE", "missing");
add("invalid-actor", () => {}, "EVENT_LOOP_ID", "Bad Actor");
add("invalid-initial-size", (b) => { b.actors[0].state.fields[0].type = "string";
  b.actors[0].state.fields[0].initial = "x".repeat(16_384); }, "EVENT_LOOP_BOUNDS");
add("stale-metadata", (b) => { b.behavior.revision++; }, "EVENT_LOOP_DIGEST");
const ts = vectors.map(({name, actor, behavior}) => {
  try { return {name, result: summarizeEventLoopBehavior(behavior, actor)}; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return {name, result: {code: error.code}}; }
});
for (const [index, vector] of vectors.entries()) {
  const actual = ts[index]!.result;
  if ("code" in actual ? actual.code !== vector.expected : vector.expected !== undefined ||
      actual.digest !== vector.behavior.digest || actual.summaryDigest !== hash(actual.summary as JsonValue)) {
    throw new Error(`TypeScript behavior mismatch: ${vector.name}`);
  }
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_behavior_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env, CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(vectors.map(({name, actor, behavior}) => ({name, actor, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust behavior parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(ts as JsonValue)) throw new Error("event-loop behavior summary parity mismatch");
console.log(`event-loop behavior summary parity: ${vectors.length} behavior-only vectors, matching digests and refusal codes`);
