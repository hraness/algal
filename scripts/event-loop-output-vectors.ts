/* eslint-disable @typescript-eslint/no-explicit-any -- Mutated wire records are intentional negative cases. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { evalProgram } from "../src/expr";
import { eventLoopNotificationDigest } from "../src/event-loop-replay";

const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const echo = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const bytes = (value: JsonValue): number => Buffer.byteLength(canonicalize(value), "utf8");
function seal(value: any): void {
  const {digest: _prior, ...body} = value;
  value.digest = hash(body);
}
function identify(entry: any, trace: any): void {
  entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
}
function proposal(text: string, limit: number, passThrough = false): {trace: any; behavior: any; outputBytes: number} {
  const behavior = structuredClone(echo);
  const trace = structuredClone(fixture.base);
  trace.entries = [trace.entries[0]];
  behavior.limits.maxEventBytes = trace.limits.maxEventBytes = limit;
  behavior.events.find((event: any) => event.id === "incremented").payload.fields[0].type = "string";
  const rule = behavior.actors[0].transitions[0];
  if (passThrough) {
    behavior.events.find((event: any) => event.id === "increment").payload.fields[0].type = "string";
    rule.when = null;
    rule.writes = [];
    rule.outputs[0].payload.program = ["get", "event"];
    trace.entries[0].payload.amount = text;
  } else {
    rule.outputs[0].payload.program = {amount: text};
  }
  seal(behavior);
  trace.behavior = behavior.digest;
  const entry = trace.entries[0];
  identify(entry, trace);
  const payload = {amount: text};
  const target = trace.actor;
  const outputBytes = bytes({parent: entry.messageDigest, transition: rule.id, ordinal: 0,
    target, type: "incremented", payload});
  const evaluated = evalProgram(rule.outputs[0].payload.program, {state: {count: 0}, event: entry.payload});
  if (!evaluated.ok || canonicalize(evaluated.value) !== canonicalize(payload)) throw new Error("invalid output control");
  const guardFuel = rule.when === null ? 0 : evalProgram(rule.when.program, {state: {count: 0}, event: entry.payload}).fuel;
  const writeFuel = rule.writes.length ? evalProgram(rule.writes[0].value.program,
    {state: {count: 0}, event: entry.payload}).fuel : 0;
  const fuel = guardFuel + writeFuel + evaluated.fuel;
  entry.decision = {kind: "accepted", transition: rule.id, outcome: "continue",
    stateDigest: hash({count: passThrough ? 0 : 1}),
    outputs: [eventLoopNotificationDigest(entry.messageDigest, rule.id, 0, target, "incremented", payload)],
    effects: {requested: 0, settled: 0, receipts: []},
    resources: {fuel, stateBytes: bytes({count: passThrough ? 0 : 1}), outputEvents: 1}};
  seal(trace);
  return {trace, behavior, outputBytes};
}
function failure(control: ReturnType<typeof proposal>): {trace: any; behavior: any; outputBytes: number} {
  const trace = structuredClone(control.trace);
  const entry = trace.entries[0];
  entry.decision = {kind: "failed", reason: "output-overflow", transition: "increment",
    stateDigest: hash({count: 0}),
    resources: {fuel: entry.decision.resources.fuel, stateBytes: bytes({count: 0}), outputEvents: 0}};
  seal(trace);
  return {trace, behavior: control.behavior, outputBytes: control.outputBytes};
}
const small = proposal("", 1024);
const floor = small.outputBytes;
const below = proposal("", floor - 1);
const exact = proposal("", floor);
const unicodeBytes = proposal("é", 1024).outputBytes;
const unicodeFit = proposal("é", unicodeBytes);
const unicodeExcess = proposal("éx", unicodeBytes);
if (unicodeExcess.outputBytes !== unicodeFit.outputBytes + 1) throw new Error("invalid UTF-8 boundary control");
const low = proposal("x".repeat(130), 128);
const highBase = proposal("", 65_536, true).outputBytes;
const high = proposal("x".repeat(65_536 - highBase), 65_536, true);
const highExcess = proposal("x".repeat(65_536 - highBase + 1), 65_536, true);
const wrongReason = failure(low);
wrongReason.trace.entries[0].decision.reason = "output-invalid";
seal(wrongReason.trace);
const highLimit = structuredClone(high);
highLimit.behavior.limits.maxEventBytes = highLimit.trace.limits.maxEventBytes = 65_537;
seal(highLimit.behavior);
highLimit.trace.behavior = highLimit.behavior.digest;
identify(highLimit.trace.entries[0], highLimit.trace);
seal(highLimit.trace);
const schemaFirst = structuredClone(low);
schemaFirst.behavior.actors[0].transitions[0].outputs[0].payload.program = 0;
seal(schemaFirst.behavior);
schemaFirst.trace.behavior = schemaFirst.behavior.digest;
identify(schemaFirst.trace.entries[0], schemaFirst.trace);
schemaFirst.trace.entries[0].decision = {kind: "failed", reason: "output-invalid", transition: "increment",
  stateDigest: hash({count: 0}), resources: {fuel: 24, stateBytes: bytes({count: 0}), outputEvents: 0}};
seal(schemaFirst.trace);

export const outputBoundary = {floor, unicodeBytes: unicodeFit.outputBytes,
  unicodeExcessBytes: unicodeExcess.outputBytes, highBytes: high.outputBytes,
  highExcessBytes: highExcess.outputBytes};
export const outputVectors: Array<{name: string; trace: any; behavior: any; expected: string}> = [
  {name: "small-control", ...small, expected: small.trace.digest},
  {name: "one-byte-short", ...failure(below), expected: failure(below).trace.digest},
  {name: "exact-fit", ...exact, expected: exact.trace.digest},
  {name: "unicode-exact-fit", ...unicodeFit, expected: unicodeFit.trace.digest},
  {name: "unicode-first-excess-accepted-claim", ...unicodeExcess, expected: "EVENT_LOOP_BOUNDS"},
  {name: "unicode-first-excess-failed", ...failure(unicodeExcess), expected: failure(unicodeExcess).trace.digest},
  {name: "old-counterexample-accepted-claim", ...low, expected: "EVENT_LOOP_BOUNDS"},
  {name: "old-counterexample-failed", ...failure(low), expected: failure(low).trace.digest},
  {name: "wrong-failed-reason", ...wrongReason, expected: "EVENT_LOOP_SEMANTIC"},
  {name: "schema-before-size", ...schemaFirst, expected: schemaFirst.trace.digest},
  {name: "max-fit", ...high, expected: high.trace.digest},
  {name: "max-one-byte-excess-accepted-claim", ...highExcess, expected: "EVENT_LOOP_BOUNDS"},
  {name: "max-one-byte-excess-failed", ...failure(highExcess), expected: failure(highExcess).trace.digest},
  {name: "limit-first-excess", ...highLimit, expected: "EVENT_LOOP_BOUNDS"},
];
