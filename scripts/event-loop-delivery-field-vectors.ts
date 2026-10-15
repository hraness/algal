/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately forged, redigested behavior and trace records. */
import { createHash } from "node:crypto";
import { canonicalize, type JsonValue } from "../src/values";
import { eventLoopNotificationDigest } from "../src/event-loop-replay";

const pinned = await Bun.file(new URL("../benchmarks/language/actors/echo.json", import.meta.url)).json();
const fixture = await Bun.file(new URL("./fixtures/event-loop-contract.json", import.meta.url)).json();
const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
function seal(record: any): void {
  const {digest: _old, ...body} = record;
  record.digest = hash(body);
}
function bind(behavior: any, template: any): any {
  const trace = structuredClone(template);
  trace.behavior = behavior.digest;
  const entry = trace.entries[0];
  entry.eventDigest = hash({behavior: trace.behavior, actor: trace.actor, source: entry.source,
    sequence: entry.sequence, type: entry.type, payload: entry.payload});
  entry.messageDigest = hash({event: entry.eventDigest, target: trace.actor, delivery: entry.delivery});
  if (entry.decision.outputs.length) {
    entry.decision.outputs[0] = eventLoopNotificationDigest(entry.messageDigest, "increment", 0,
      "observer", "incremented", {amount: 1});
  }
  seal(trace);
  return trace;
}

export type DeliveryFieldVector = {
  field: string; control: {behavior: any; trace: any}; mutation: {behavior: any; trace: any};
  expected: "EVENT_LOOP_SEMANTIC";
};

/** A sibling actor becomes the selected actor. Every pair has a replayable
 * control; both traces and both behaviors are reidentified and redigested.
 * The changed expression is valid syntax, so shape and structural checks
 * cannot establish its evaluated value. */
export function deliveryFieldVectors(): DeliveryFieldVector[] {
  const vectors: DeliveryFieldVector[] = [];
  function add(field: string, prepare: (behavior: any, template: any) => void,
    change: (behavior: any, template: any) => void): void {
    const behavior = structuredClone(pinned);
    const observer = structuredClone(behavior.actors[0]);
    observer.id = "observer";
    behavior.actors.push(observer);
    const template = structuredClone(fixture.base);
    template.actor = "observer";
    template.entries = [template.entries[0]];
    template.entries[0].decision.resources.fuel = 27; // guard 9 + write 14 + output 4
    prepare(behavior, template);
    seal(behavior);
    const control = {behavior, trace: bind(behavior, template)};
    const changed = structuredClone(behavior);
    const claim = structuredClone(template);
    change(changed, claim);
    seal(changed);
    const mutation = {behavior: changed, trace: bind(changed, claim)};
    vectors.push({field, control, mutation, expected: "EVENT_LOOP_SEMANTIC"});
  }
  const selected = (behavior: any): any => behavior.actors[1];
  const rule = (behavior: any): any => selected(behavior).transitions[0];
  add("state.fields[*].initial", () => {}, (behavior) => { selected(behavior).state.fields[0].initial = 1; });
  add("transitions[*].when", () => {}, (behavior) => { rule(behavior).when.program = false; });
  add("transitions[*].writes[*].value", () => {}, (behavior) => {
    rule(behavior).writes[0].value.program = ["add", ["get", "state", "count"], 2];
  });
  add("transitions[*].outputs[*].payload", () => {}, (behavior, claim) => {
    rule(behavior).outputs[0].payload.program = {amount: 2};
    claim.entries[0].decision.resources.fuel = 25; // guard 9 + write 14 + literal record 2
  });
  for (const [kind, field, original, changed, fuel] of [
    ["defer", "key", "ticket", "other", 10],
    ["escalate", "request", {action: "review"}, {action: "reject"}, 11],
  ] as const) {
    add(`transitions[*].result.${field}`, (behavior, template) => {
      const current = rule(behavior);
      current.writes = [];
      current.outputs = [];
      current.result = {kind, [field]: {contract: "algal.expr.v1", program: original}};
      template.entries[0].decision = {kind: "accepted", transition: "increment", outcome: kind,
        pending: original, stateDigest: hash({count: 0}), outputs: [],
        effects: {requested: 0, settled: 0, receipts: []},
        resources: {fuel, stateBytes: 11, outputEvents: 0}};
    }, (behavior) => { rule(behavior).result[field].program = changed; });
  }
  if (vectors.length !== 6 || new Set(vectors.map(({field}) => field)).size !== 6) {
    throw new Error("delivery field inventory changed");
  }
  return vectors;
}
