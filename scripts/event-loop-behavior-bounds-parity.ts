/* eslint-disable @typescript-eslint/no-explicit-any -- Large generated boundary behavior values. */
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
const base = structuredClone(pinned);
base.limits = {maxEventBytes: 1, maxStateBytes: 2, maxOutputEvents: 0,
  maxTransitionFuel: 1, maxMailboxDepth: 1};
base.events = Array.from({length: 128}, (_, i) => ({id: `event-${i}`, payload: {kind: "record",
  fields: Array.from({length: 64}, (_, j) => ({name: `field-${j}`, type: "number"}))}}));
base.actors[0].state.fields = [];
base.actors[0].transitions = base.events.map((event: any, i: number) => ({
  id: `rule-${i}`, on: event.id, when: {contract: "algal.expr.v1", program: ["get", "event"]},
  writes: [], outputs: [], result: {kind: "quiet"},
}));
seal(base);
type Vector = {name: string; behavior: any; actor: string; expected: string | undefined};
const vectors: Vector[] = [{name: "dense-valid", actor: "counter", behavior: base, expected: undefined}];
function add(name: string, change: (behavior: any) => void, expected: string): void {
  const behavior = structuredClone(base);
  change(behavior);
  vectors.push({name, behavior: seal(behavior), actor: "counter", expected});
}
add("event-field-at-65", (b) => { b.events[0].payload.fields.push({name: "field-extra", type: "number"}); }, "EVENT_LOOP_BOUNDS");
add("transition-at-257", (b) => { b.actors[0].transitions.push(...Array.from({length: 129}, (_, i) => ({
  id: `extra-${i}`, on: `event-${i % 128}`, when: null, writes: [], outputs: [], result: {kind: "quiet"},
}))); }, "EVENT_LOOP_BOUNDS");
add("event-at-129", (b) => { b.events.push({id: "event-extra", payload: {kind: "record", fields: []}}); }, "EVENT_LOOP_BOUNDS");
const ts = vectors.map(({name, actor, behavior}) => {
  try { return {name, result: summarizeEventLoopBehavior(behavior, actor)}; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return {name, result: {code: error.code}}; }
});
for (const [i, vector] of vectors.entries()) {
  const actual = ts[i]!.result;
  if ("code" in actual ? actual.code !== vector.expected : vector.expected !== undefined ||
    actual.digest !== vector.behavior.digest || actual.summaryDigest !== hash(actual.summary as JsonValue) ||
    actual.summary.reads.eventFields.length !== 128 || actual.summary.reads.eventFields.some(({fields}) => fields.length !== 64)) {
    throw new Error(`TypeScript boundary mismatch: ${vector.name}`);
  }
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_behavior_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env,
    CARGO_TARGET_DIR: process.env.CARGO_TARGET_DIR ?? `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(vectors.map(({name, actor, behavior}) => ({name, actor, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust behavior-boundary parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(ts as JsonValue)) throw new Error("event-loop behavior boundary parity mismatch");
console.log(`event-loop behavior boundary parity: ${vectors.length} dense vectors, matching digests and refusal codes`);
