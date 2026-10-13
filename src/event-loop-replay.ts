import { createHash } from "node:crypto";
import { canonicalize, type JsonObject, type JsonValue } from "./values";
import { checkProgram, evalProgram } from "./expr";
import { EventLoopContractError } from "./event-loop-contract";
import { snapshotEventLoopValue, verifyEventLoopTraceStructure } from "./event-loop-structure";
import { summarizeEventLoopTrace, type EventLoopTraceSummary } from "./event-loop-summary";

const hash = (value: JsonValue): string => `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const bytes = (value: JsonValue): number => Buffer.byteLength(canonicalize(value), "utf8");
const fail = (code: EventLoopContractError["code"]): never => { throw new EventLoopContractError(code); };
type Expr = { contract: "algal.expr.v1"; program: JsonValue };
type Rule = { id: string; on: string; when: Expr | null;
  writes: Array<{path: [string]; value: Expr}>;
  outputs: Array<{kind: "notify"; target: string; event: string; payload: Expr}>;
  result: {kind: "continue" | "quiet" | "defer" | "escalate"; key?: Expr; request?: Expr};
};
type Behavior = { actors: Array<{id: string; state: {fields: Array<{name: string; type: string; initial: JsonValue}>}; transitions: Rule[]}> };
type Decision = {kind: string; transition: string | null; outcome: string; reason?: string; stateDigest: string;
  outputs: string[]; pending?: JsonValue; effects: {requested: number; settled: number; receipts: string[]};
  resources: {fuel: number; stateBytes: number; outputEvents: number}};
type Trace = {actor: string; limits: {maxStateBytes: number; maxTransitionFuel: number};
  entries: Array<{type: string; payload: JsonValue; messageDigest: string; decision: Decision}>};
type Failure = {reason: "fuel-exhausted" | "expression-error" | "state-overflow" | "output-invalid";
  transition: string | null; fuel: number};

/** Identity of one checked notification. A parent delivery, transition and
 * bounded ordinal distinguish two otherwise identical notifications. */
export function eventLoopNotificationDigest(parent: string, transition: string, ordinal: number,
  target: string, type: string, payload: JsonValue): string {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= 64) fail("EVENT_LOOP_BOUNDS");
  return hash({parent, transition, ordinal, target, type, payload});
}

// Re-evaluate a failed input from the *unchanged* state. The first failing
// operation determines the reason, selected rule and measured fuel. No write
// or notification is committed, including those evaluated before the failure.
function deriveFailure(entry: Trace["entries"][number], rules: Rule[], state: JsonObject,
  types: Map<string, string>, schemas: Map<string, Map<string, string>>,
  limits: Trace["limits"]): Failure | null {
  const env: JsonObject = {state, event: entry.payload};
  let fuel = 0;
  let selected: Rule | undefined;
  const failure = (reason: Failure["reason"]): Failure => ({reason, transition: selected?.id ?? null, fuel});
  const evaluate = (expr: Expr): {ok: true; value: JsonValue} | {ok: false; reason: Failure["reason"]} => {
    const result = evalProgram(expr.program, env, limits.maxTransitionFuel - fuel);
    fuel += result.fuel;
    return result.ok ? {ok: true, value: result.value} :
      {ok: false, reason: result.err.code === "EXPR_FUEL" ? "fuel-exhausted" : "expression-error"};
  };
  for (const rule of rules) {
    if (rule.on !== entry.type) continue;
    if (rule.when !== null) {
      const guard = evaluate(rule.when);
      if (!guard.ok) return failure(guard.reason);
      if (typeof guard.value !== "boolean") return failure("expression-error");
      if (!guard.value) continue;
    }
    selected = rule;
    break;
  }
  if (!selected) return null;
  const next: JsonObject = {...state};
  for (const write of selected.writes) {
    const value = evaluate(write.value);
    if (!value.ok) return failure(value.reason);
    if (!typed(value.value, types.get(write.path[0])!)) return failure("expression-error");
    next[write.path[0]] = value.value;
  }
  if (bytes(next) > limits.maxStateBytes) return failure("state-overflow");
  for (const output of selected.outputs) {
    const payload = evaluate(output.payload);
    if (!payload.ok) return failure(payload.reason);
    if (!record(payload.value, schemas.get(output.event)!)) return failure("output-invalid");
  }
  if (selected.result.kind === "defer" || selected.result.kind === "escalate") {
    const pending = selected.result.kind === "defer" ? selected.result.key! : selected.result.request!;
    const value = evaluate(pending);
    if (!value.ok) return failure(value.reason);
  }
  return null;
}

/** Replay successful and failed decisions from the declared initial state.
 * Pending decisions require a checked evaluated value witness. This is
 * internal consistency, not a host effect, delivery proof or observation of
 * a running actor.
 */
export function replayEventLoopTrace(traceValue: unknown, behaviorValue: unknown):
  {digest: string; summary: EventLoopTraceSummary} {
  // Copy both foreign values before parsing. Subsequent reads never reach a
  // getter or a caller-owned object which could change between the two joins.
  const traceCopy = snapshotEventLoopValue(traceValue);
  const behaviorCopy = snapshotEventLoopValue(behaviorValue);
  const {digest} = verifyEventLoopTraceStructure(traceCopy, behaviorCopy);
  const trace = traceCopy as unknown as Trace;
  const behavior = behaviorCopy as unknown as Behavior;
  const actor = behavior.actors.find((item) => item.id === trace.actor)!;
  const schemas = new Map<string, Map<string, string>>();
  for (const event of (behaviorCopy as {events: Array<{id: string; payload: {fields: Array<{name: string; type: string}>}}>}).events) {
    schemas.set(event.id, new Map(event.payload.fields.map((field) => [field.name, field.type])));
  }
  const types = new Map(actor.state.fields.map((field) => [field.name, field.type]));
  let state: JsonObject = Object.fromEntries(actor.state.fields.map((field) => [field.name, field.initial]));
  const rules = [...actor.transitions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  // Admission of all reachable expressions is independent of the path taken
  // by this trace; a malformed dormant rule is not a valid behavior.
  for (const rule of rules) {
    for (const expr of [rule.when, ...rule.writes.map((write) => write.value),
      ...rule.outputs.map((output) => output.payload), rule.result.key, rule.result.request]) {
      if (expr === null || expr === undefined) continue;
      const checked = checkProgram(expr.program, ["state", "event"]);
      if (!checked.ok) fail(checked.err.code === "EXPR_BOUNDS" ? "EVENT_LOOP_BOUNDS" :
        checked.err.code === "EXPR_UNKNOWN_NAME" ? "EVENT_LOOP_REFERENCE" : "EVENT_LOOP_SEMANTIC");
    }
  }
  for (const entry of trace.entries) {
    const claim = entry.decision;
    if (claim.kind === "duplicate" || claim.kind === "backpressure") continue;
    if (claim.kind === "failed") {
      const actual = deriveFailure(entry, rules, state, types, schemas, trace.limits);
      if (!actual || claim.reason !== actual.reason || claim.transition !== actual.transition ||
          claim.resources.fuel !== actual.fuel || claim.stateDigest !== hash(state) ||
          claim.resources.stateBytes !== bytes(state) || claim.resources.outputEvents !== 0) {
        fail("EVENT_LOOP_SEMANTIC");
      }
      continue;
    }
    if (claim.kind !== "accepted") fail("EVENT_LOOP_SEMANTIC");
    const before = state;
    const env: JsonObject = {state: before, event: entry.payload};
    let fuel = 0;
    const evaluate = (expr: Expr): JsonValue => {
      const result = evalProgram(expr.program, env, trace.limits.maxTransitionFuel - fuel);
      fuel += result.fuel;
      if ("value" in result) return result.value;
      return fail(result.err.code === "EXPR_FUEL" ? "EVENT_LOOP_BOUNDS" : "EVENT_LOOP_SEMANTIC");
    };
    let selected: Rule | undefined;
    for (const rule of rules) {
      if (rule.on !== entry.type) continue;
      const guard = rule.when === null ? true : evaluate(rule.when);
      if (typeof guard !== "boolean") fail("EVENT_LOOP_SEMANTIC");
      if (guard) { selected = rule; break; }
    }
    if (selected?.id !== (claim.transition ?? undefined) ||
        (selected?.result.kind ?? "no-transition") !== claim.outcome) fail("EVENT_LOOP_SEMANTIC");
    const outputs: string[] = [];
    if (selected) {
      const next: JsonObject = {...before};
      for (const write of selected.writes) {
        const value = evaluate(write.value); // every write sees pre-transition state
        if (!typed(value, types.get(write.path[0])!)) fail("EVENT_LOOP_SCHEMA");
        next[write.path[0]] = value;
      }
      if (bytes(next) > trace.limits.maxStateBytes) fail("EVENT_LOOP_BOUNDS");
      for (const [ordinal, output] of selected.outputs.entries()) {
        const payload = evaluate(output.payload);
        if (!record(payload, schemas.get(output.event)!)) fail("EVENT_LOOP_SCHEMA");
        const target = output.target === "self" ? trace.actor : output.target;
        outputs.push(eventLoopNotificationDigest(entry.messageDigest, selected.id, ordinal, target, output.event, payload));
      }
      if (selected.result.kind === "defer" || selected.result.kind === "escalate") {
        const pending = evaluate(selected.result.kind === "defer" ? selected.result.key! : selected.result.request!);
        // Presence is separate from value: null is a valid pending witness.
        if (!Object.hasOwn(claim, "pending") || canonicalize(claim.pending!) !== canonicalize(pending)) {
          fail("EVENT_LOOP_SEMANTIC");
        }
      }
      state = next;
    }
    if (claim.stateDigest !== hash(state) || claim.resources.stateBytes !== bytes(state) ||
        claim.resources.fuel !== fuel || claim.resources.outputEvents !== outputs.length ||
        canonicalize(claim.outputs) !== canonicalize(outputs) ||
        claim.effects.requested !== 0 || claim.effects.settled !== 0 || claim.effects.receipts.length !== 0) {
      fail("EVENT_LOOP_SEMANTIC");
    }
  }
  return {digest, summary: summarizeEventLoopTrace(traceCopy).summary};
}

function typed(value: JsonValue, type: string): boolean {
  return type === "json" || (type === "null" ? value === null : typeof value === type);
}
function record(value: JsonValue, fields: Map<string, string>): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== fields.size) return false;
  return [...fields].every(([name, type]) => Object.hasOwn(value, name) && typed(value[name]!, type));
}
