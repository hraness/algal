import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { EventLoopContractError, parseEventLoopTrace } from "../src/event-loop-contract";
import { verifyEventLoopTraceStructure } from "../src/event-loop-structure";
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
type Vector = {name: string; trace: typeof fixture.base; behavior: typeof pinned; expected: string};
const vectors: Vector[] = [];
const add = (name: string, trace: typeof fixture.base, behavior: typeof pinned, expected: string): void => {
  vectors.push({name, trace, behavior, expected});
};
const reseal = (trace: typeof fixture.base): typeof fixture.base => {
  const {digest: _old, ...body} = trace;
  trace.digest = hash(body);
  return trace;
};
add("pinned", fixture.base, pinned, fixture.base.digest);
add("failed", fixture.failed, pinned, fixture.failed.digest);
// A digest-only parser accepts the redigested forgery. Neither structural
// verifier may accept reset as increment or its undeclared notification.
const forged = structuredClone(fixture.base);
forged.entries[3].decision = structuredClone(forged.entries[0].decision);
reseal(forged);
if (parseEventLoopTrace(forged).digest !== forged.digest) throw new Error("witness no longer reaches structural verification");
add("reset-claims-increment", forged, pinned, "EVENT_LOOP_REFERENCE");
const notification = structuredClone(forged);
notification.entries[3].decision.transition = "reset";
add("reset-claims-notification", reseal(notification), pinned, "EVENT_LOOP_SEMANTIC");
const missing = structuredClone(forged);
missing.entries[3].decision.transition = "not-declared";
add("missing-transition", reseal(missing), pinned, "EVENT_LOOP_REFERENCE");
const limits = structuredClone(fixture.base);
limits.limits.maxMailboxDepth = 65;
limits.entries[2].depthBefore = 65;
add("copied-limits-mismatch", reseal(limits), pinned, "EVENT_LOOP_SEMANTIC");
const tampered = structuredClone(pinned);
tampered.actors[0].transitions[1].outputs = structuredClone(tampered.actors[0].transitions[0].outputs);
add("behavior-digest-mismatch", fixture.base, tampered, "EVENT_LOOP_DIGEST");
const unknown = structuredClone(pinned);
unknown.undeclared = true;
add("behavior-unknown-key", fixture.base, unknown, "EVENT_LOOP_UNKNOWN_KEY");
const badPayload = structuredClone(fixture.base);
badPayload.entries[3].payload = {amount: 1};
badPayload.entries[3].eventDigest = hash({behavior:badPayload.behavior, actor:badPayload.actor,
  source:badPayload.entries[3].source, sequence:badPayload.entries[3].sequence,
  type:badPayload.entries[3].type, payload:badPayload.entries[3].payload});
badPayload.entries[3].messageDigest = hash({event:badPayload.entries[3].eventDigest, target:badPayload.actor, delivery:badPayload.entries[3].delivery});
add("reset-schema", reseal(badPayload), pinned, "EVENT_LOOP_UNKNOWN_KEY");
// One transition cannot write the same state field twice, even if the caller
// re-digests both the behavior and every event in the bound trace.
const repeated = structuredClone(pinned);
repeated.actors[0].transitions[0].writes.push(structuredClone(repeated.actors[0].transitions[0].writes[0]));
reseal(repeated);
const repeatedTrace = structuredClone(fixture.base);
repeatedTrace.behavior = repeated.digest;
for (const entry of repeatedTrace.entries) {
  entry.eventDigest = hash({behavior: repeatedTrace.behavior, actor: repeatedTrace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: repeatedTrace.actor, delivery: entry.delivery});
}
add("repeated-write-path", reseal(repeatedTrace), repeated, "EVENT_LOOP_SEMANTIC");

// A rule appended after increment but ordered before it by id must win.
function priority(id: string): typeof pinned {
  const proposed = structuredClone(pinned);
  proposed.actors[0].transitions.push({id, on: "increment", when: null, writes: [], outputs: [], result: {kind: "quiet"}});
  return reseal(proposed);
}
function bind(behavior: typeof pinned, trace: typeof fixture.base = fixture.base): typeof fixture.base {
  const record = structuredClone(trace);
  record.behavior = behavior.digest;
  for (const entry of record.entries) {
    entry.eventDigest = hash({behavior: record.behavior, actor: record.actor, source: entry.source,
      sequence: entry.sequence, type: entry.type, payload: entry.payload});
    entry.messageDigest = hash({event: entry.eventDigest, target: record.actor, delivery: entry.delivery});
  }
  return reseal(record);
}
const earlier = priority("a-priority");
const preempted = bind(earlier);
if (parseEventLoopTrace(preempted).digest !== preempted.digest) throw new Error("priority witness does not parse");
add("earlier-unconditional-id", preempted, earlier, "EVENT_LOOP_SEMANTIC");
const later = priority("z-priority");
const notPreempted = bind(later);
add("later-unconditional-id", notPreempted, later, notPreempted.digest);
// A single failed entry names increment despite an earlier unconditional id.
// Shape parsing succeeds; both structural joins must reject this priority lie.
const initial = Object.fromEntries(pinned.actors[0].state.fields.map((field: {name: string; initial: JsonValue}) => [field.name, field.initial]));
const initialDigest = hash(initial);
const initialBytes = Buffer.byteLength(canonicalize(initial));
const singleFailed = structuredClone(fixture.failed);
singleFailed.entries = [singleFailed.entries[1]];
singleFailed.entries[0].decision.stateDigest = initialDigest;
singleFailed.entries[0].decision.resources.stateBytes = initialBytes;
singleFailed.entries[0].decision.transition = "increment";
const failedPreempted = bind(earlier, singleFailed);
if (parseEventLoopTrace(failedPreempted).digest !== failedPreempted.digest) throw new Error("failed priority witness does not parse");
add("failed-earlier-unconditional-id", failedPreempted, earlier, "EVENT_LOOP_SEMANTIC");
const failedUnselected = structuredClone(failedPreempted);
failedUnselected.entries[0].decision.transition = null;
reseal(failedUnselected);
add("failed-before-selection", failedUnselected, earlier, failedUnselected.digest);
const failedNotPreempted = bind(later, singleFailed);
add("failed-later-unconditional-id", failedNotPreempted, later, failedNotPreempted.digest);
// Before a commit, a failed decision cannot invent an unrelated initial state.
const firstFailed = bind(pinned, singleFailed);
add("first-failed-initial", firstFailed, pinned, firstFailed.digest);
const forgedInitial = structuredClone(firstFailed);
forgedInitial.entries[0].decision.stateDigest = `sha256:${"0".repeat(64)}`;
reseal(forgedInitial);
if (parseEventLoopTrace(forgedInitial).digest !== forgedInitial.digest) throw new Error("initial-state witness does not parse");
add("first-failed-forged-state", forgedInitial, pinned, "EVENT_LOOP_SEMANTIC");
const wrongInitialBytes = structuredClone(firstFailed);
wrongInitialBytes.entries[0].decision.resources.stateBytes = initialBytes - 1;
add("first-failed-forged-bytes", reseal(wrongInitialBytes), pinned, "EVENT_LOOP_SEMANTIC");
const unmatched = structuredClone(fixture.base);
unmatched.entries = [unmatched.entries[0]];
unmatched.entries[0].decision = {kind: "accepted", transition: null, outcome: "no-transition",
  stateDigest: initialDigest, outputs: [], effects: {requested: 0, settled: 0, receipts: []},
  resources: {fuel: 0, stateBytes: initialBytes, outputEvents: 0}};
reseal(unmatched);
add("first-unmatched-initial", unmatched, pinned, unmatched.digest);
const wrongUnmatched = structuredClone(unmatched);
wrongUnmatched.entries[0].decision.resources.stateBytes = initialBytes + 1;
add("first-unmatched-forged-bytes", reseal(wrongUnmatched), pinned, "EVENT_LOOP_SEMANTIC");
// A selected rule with no writes cannot change state, before or after a commit.
const noWrites = structuredClone(pinned);
noWrites.actors[0].transitions[1].writes = [];
reseal(noWrites);
const unchanged = structuredClone(fixture.base);
unchanged.entries[3].decision.stateDigest = unchanged.entries[0].decision.stateDigest;
const afterCommit = bind(noWrites, unchanged);
add("no-write-after-commit", afterCommit, noWrites, afterCommit.digest);
const afterForged = structuredClone(afterCommit);
afterForged.entries[3].decision.stateDigest = initialDigest;
add("no-write-after-forged-state", reseal(afterForged), noWrites, "EVENT_LOOP_SEMANTIC");
const firstNoWrite = structuredClone(unchanged);
firstNoWrite.entries = [firstNoWrite.entries[3]];
firstNoWrite.entries[0].decision.stateDigest = initialDigest;
firstNoWrite.entries[0].decision.resources.stateBytes = initialBytes;
const firstQuiet = bind(noWrites, firstNoWrite);
add("no-write-first-quiet", firstQuiet, noWrites, firstQuiet.digest);
const firstForged = structuredClone(firstQuiet);
firstForged.entries[0].decision.stateDigest = fixture.base.entries[0].decision.stateDigest;
reseal(firstForged);
if (parseEventLoopTrace(firstForged).digest !== firstForged.digest) throw new Error("no-write witness does not parse");
add("no-write-first-forged-state", firstForged, noWrites, "EVENT_LOOP_SEMANTIC");
const firstWrongBytes = structuredClone(firstQuiet);
firstWrongBytes.entries[0].decision.resources.stateBytes = initialBytes + 1;
add("no-write-first-forged-bytes", reseal(firstWrongBytes), noWrites, "EVENT_LOOP_SEMANTIC");
const noWritesContinue = structuredClone(noWrites);
noWritesContinue.actors[0].transitions[1].result.kind = "continue";
reseal(noWritesContinue);
const firstContinue = structuredClone(firstNoWrite);
firstContinue.entries[0].decision.outcome = "continue";
const continued = bind(noWritesContinue, firstContinue);
add("no-write-first-continue", continued, noWritesContinue, continued.digest);

// A changed output digest still passes the shape and structural join. Preserve
// this counterexample until actual notification identity replay is implemented.
const substituted = structuredClone(fixture.base);
substituted.entries[0].decision.outputs[0] = `sha256:${"0".repeat(64)}`;
reseal(substituted);
add("substituted-output-unverified", substituted, pinned, substituted.digest);

const results = vectors.map(({name, trace, behavior}) => {
  try { return {name, result: verifyEventLoopTraceStructure(trace, behavior)}; }
  catch (error) { if (!(error instanceof EventLoopContractError)) throw error; return {name, result: {code: error.code}}; }
});
for (const [i, vector] of vectors.entries()) {
  if (Object.values(results[i]!.result)[0] !== vector.expected) throw new Error(`TypeScript structural mismatch: ${vector.name}`);
}
const rust = Bun.spawn(["cargo", "run", "-q", "-p", "algal", "--locked", "--example", "event_loop_structure_parity"], {
  stdin: "pipe", stdout: "pipe", stderr: "pipe", env: {...process.env, CARGO_TARGET_DIR: `${process.cwd()}/target`},
});
rust.stdin.write(JSON.stringify(vectors.map(({name, trace, behavior}) => ({name, trace, behavior}))));
rust.stdin.end();
const [stdout, stderr, status] = await Promise.all([new Response(rust.stdout).text(), new Response(rust.stderr).text(), rust.exited]);
if (status !== 0) throw new Error(`Rust structural parity failed (${status}): ${stderr}`);
if (canonicalize(JSON.parse(stdout) as JsonValue) !== canonicalize(results as JsonValue)) throw new Error("event-loop structural parity mismatch");
console.log(`event-loop structural join parity: ${vectors.length} shared vectors, matching digests, static declaration counts, refusal codes and unverified output counterexample`);
