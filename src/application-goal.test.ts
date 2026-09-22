import { expect, test } from "bun:test";
import { bindApplicationGoalCaptures, captureApplicationGoals, parseApplicationGoal, validateApplicationGoals } from "./application-goal";
import { parseApplicationRevision, parseApplicationState, parseApplicationTransition } from "./application-contract";
import { parseApplicationView, projectApplicationView } from "./application-view";
import type { ApplicationSnapshot } from "./application";
import { digestCanonical } from "./digest";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";

const hash = (value: unknown) => digestCanonical(value as JsonValue);
async function fixture(id = "discover") {
  const store = new MemoryStore(), schema = hash("schema"), manifest = hash("manifest");
  const query = await store.putValue({contract: "algal.application-memory-query.v1", id: "available", schema, program: hash("program"), procedures: [], polarityColumn: 1, conflict: "single-value"});
  const queries = await store.putValue({contract: "algal.application-memory-queries.v1", queries: [query]});
  const definition = parseApplicationGoal({contract: "algal.application-goal.v1", application: "demo", id, description: "Discover the current tool", query, entrypoint: "run"});
  const goal = await store.putValue(definition);
  const revision = parseApplicationRevision({contract: "algal.application-revision.v1", application: "demo", parent: null, schema, queries, views: hash("views"), runtimeProfile: hash("runtime"), evaluationPolicy: hash("policy"), goals: [goal], capabilityRequirements: [], entrypoints: [{name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query]}]});
  const state = parseApplicationState({contract: "algal.application-state.v1", application: "demo", sequence: 0, epoch: 0, revision: hash(revision), memory: hash("memory"), previous: null, transition: hash("transition")});
  const transition = parseApplicationTransition({contract: "algal.application-transition.v1", application: "demo", operation: hash("operation"), request: hash("request"), kind: "create", previous: null, revision: state.revision, memory: state.memory, intents: [], evidence: [], causedBy: null});
  const snapshot: ApplicationSnapshot = {digest: hash(state), state, revision, transition};
  const derivation = {contract: "algal.application-memory-derivation.v1", application: "demo", capturedState: snapshot.digest, memory: state.memory, query, frontier: hash("frontier"), engine: hash("engine"), admission: hash("admission"), status: "supported", conditional: true, verified: true, result: hash("result"), snapshot: hash("facts"), program: hash("program"), sourceRefs: [], work: 1, reason: null};
  return {store, definition, goal, snapshot, derivation};
}

test("valid inherited-property goal names use only owned evidence", async () => {
  const f = await fixture("constructor");
  expect((await captureApplicationGoals(f.store, f.snapshot))[0]!.status).toBe("unknown");
  const evidence = await f.store.putValue(f.derivation);
  const inherited = Object.create({constructor: evidence}) as Record<string, typeof evidence>;
  expect((await captureApplicationGoals(f.store, f.snapshot, inherited))[0]!.derivation).toBeNull();
  const captured = await captureApplicationGoals(f.store, f.snapshot, {constructor: evidence});
  expect(captured[0]!.status).toBe("supported");
  expect(captured[0]!.derivation).toBe(evidence);
});

test("goals preserve legacy revision absence and reject unbound definitions", async () => {
  const f = await fixture(), {goals: _goals, ...legacy} = f.snapshot.revision;
  expect(Object.hasOwn(parseApplicationRevision(legacy), "goals")).toBe(false);
  expect(parseApplicationRevision({...legacy, goals: []}).goals).toEqual([]);
  const refs = Array.from({length: 9}, (_, i) => hash(i)).sort();
  for (const goals of [null, [f.goal, f.goal], refs, refs.slice(0, 2).reverse()]) expect(() => parseApplicationRevision({...legacy, goals})).toThrow();
  expect(await validateApplicationGoals(f.store, f.snapshot.revision)).toHaveLength(1);
  for (const mutation of [{application: "other"}, {entrypoint: "other"}, {query: hash("foreign-query")}]) {
    const ref = await f.store.putValue({...f.definition, ...mutation});
    await expect(validateApplicationGoals(f.store, {...f.snapshot.revision, goals: [ref]})).rejects.toThrow();
  }
  const wrong = await f.store.putValue({contract: "wrong"});
  await expect(validateApplicationGoals(f.store, {...f.snapshot.revision, goals: [wrong]})).rejects.toThrow();
  expect(() => parseApplicationGoal({...f.definition, description: "é".repeat(1025)})).toThrow();
  expect(() => parseApplicationGoal({...f.definition, extra: true})).toThrow();
});

test("goal captures preserve uncertainty and reject stale or cross-query evidence", async () => {
  const f = await fixture();
  const unknown = await captureApplicationGoals(f.store, f.snapshot);
  expect(unknown[0]!.status).toBe("unknown"); expect(unknown[0]!.derivation).toBeNull();
  for (const status of ["supported", "opposed", "conflicted", "unknown", "stale", "exhausted", "failed", "cancelled"] as const) {
    const ref = await f.store.putValue({...f.derivation, status});
    const rows = await captureApplicationGoals(f.store, f.snapshot, {discover: ref});
    expect(rows[0]!.status).toBe(status);
  }
  for (const mutation of [{application: "other"}, {capturedState: hash("later")}, {memory: hash("later-memory")}, {query: hash("other-query")}, {contract: "wrong"}, {verified: false}]) {
    const ref = await f.store.putValue({...f.derivation, ...mutation});
    await expect(captureApplicationGoals(f.store, f.snapshot, {discover: ref})).rejects.toThrow();
  }
  await expect(captureApplicationGoals(f.store, f.snapshot, {other: hash("record")})).rejects.toThrow();
  expect(() => bindApplicationGoalCaptures(f.snapshot, [{...unknown[0]!, state: hash("later")}])).toThrow();
  expect(() => bindApplicationGoalCaptures(f.snapshot, [])).toThrow();
});

test("goal views carry exact definitions and capture fences without creating actions", async () => {
  const f = await fixture(), goals = await captureApplicationGoals(f.store, f.snapshot);
  const view = projectApplicationView({snapshot: f.snapshot, spec: {contract: "algal.application-view-spec.v1", title: "Goals", widgets: ["goals", "procedures"]}, goals});
  expect(view.goals).toEqual(goals); expect(view.actions).toEqual([]);
  expect(() => parseApplicationView({...view, goals: [{...goals[0]!, definition: {...f.definition, description: "altered"}}]})).toThrow();
  expect(() => parseApplicationView({...view, goals: [{...goals[0]!, memory: hash("new memory")}]})).toThrow();
  expect(() => parseApplicationView({...view, goals: [{...goals[0]!, status: "supported"}]})).toThrow();
});
