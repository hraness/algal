import { utf8Length } from "./utf8";
/** A retained query objective, not a claim that executing a procedure succeeds.
 * Captures are display data; fresh evaluation uses the admitted memory service. */
import { applicationId, applicationList, applicationObject, applicationRef, applicationTag, getApplicationRecord, type ApplicationRevision } from "./application-contract";
import { parseMemoryDerivation, parseMemoryQueries, parseMemoryQuery, type ApplicationMemoryService, type MemoryStatus } from "./application-memory";
import type { ApplicationSnapshot } from "./application-core";
import { digestCanonical, type Digest } from "./digest";
import type { Store } from "./store-contract";

export type ApplicationGoal = { contract: "algal.application-goal.v1"; application: string; id: string; description: string; query: Digest; entrypoint: string };
export type ApplicationGoalCapture = { goal: Digest; definition: ApplicationGoal; state: Digest; memory: Digest; status: MemoryStatus; derivation: Digest | null };
const statuses: readonly string[] = ["supported", "opposed", "conflicted", "unknown", "stale", "exhausted", "failed", "cancelled"];
export function parseApplicationGoal(input: unknown): ApplicationGoal {
  const v = applicationObject(input, ["contract", "application", "id", "description", "query", "entrypoint"]);
  applicationTag(v.contract, "algal.application-goal.v1");
  if (typeof v.description !== "string" || !v.description.length || utf8Length(v.description) > 2048 || v.description.includes("\0")) throw new Error("Invalid application goal description");
  return { contract: "algal.application-goal.v1", application: applicationId(v.application), id: applicationId(v.id), description: v.description, query: applicationRef(v.query), entrypoint: applicationId(v.entrypoint) };
}
export async function validateApplicationGoals(store: Store, revision: ApplicationRevision): Promise<{ref: Digest; goal: ApplicationGoal}[]> {
  const refs = revision.goals ?? [];
  if (!refs.length) return [];
  const queries = await getApplicationRecord(store, revision.queries, parseMemoryQueries), ids = new Set<string>();
  const out: {ref: Digest; goal: ApplicationGoal}[] = [];
  for (const ref of refs) {
    const goal = await getApplicationRecord(store, ref, parseApplicationGoal);
    const entry = revision.entrypoints.find(e => e.name === goal.entrypoint);
    if (goal.application !== revision.application || ids.has(goal.id) || !entry || !entry.queries.includes(goal.query) || !queries.queries.includes(goal.query)) throw new Error("Application goal is not bound to its revision");
    const query = await getApplicationRecord(store, goal.query, parseMemoryQuery);
    if (query.schema !== revision.schema) throw new Error("Application goal query schema differs from revision");
    ids.add(goal.id); out.push({ref, goal});
  }
  return out;
}
export function parseApplicationGoalCapture(input: unknown): ApplicationGoalCapture {
  const v = applicationObject(input, ["goal", "definition", "state", "memory", "status", "derivation"]);
  const goal = applicationRef(v.goal), definition = parseApplicationGoal(v.definition);
  if (digestCanonical(definition) !== goal || !statuses.includes(String(v.status))) throw new Error("Invalid captured application goal");
  const derivation = v.derivation === null ? null : applicationRef(v.derivation);
  if (derivation === null && v.status !== "unknown") throw new Error("Goal status requires captured derivation evidence");
  return {goal, definition, state: applicationRef(v.state), memory: applicationRef(v.memory), status: v.status as MemoryStatus, derivation};
}
export function bindApplicationGoalCaptures(snapshot: ApplicationSnapshot, input: unknown): ApplicationGoalCapture[] {
  const goals = applicationList(input, 8, parseApplicationGoalCapture), expected = snapshot.revision.goals ?? [];
  if (goals.length !== expected.length || goals.some((g, i) => g.goal !== expected[i])) throw new Error("Goal captures do not cover the captured revision");
  const ids = new Set<string>();
  for (const g of goals) {
    const entry = snapshot.revision.entrypoints.find(e => e.name === g.definition.entrypoint);
    if (g.state !== snapshot.digest || g.memory !== snapshot.state.memory || g.definition.application !== snapshot.state.application || ids.has(g.definition.id) || !entry?.queries.includes(g.definition.query)) throw new Error("Goal capture crosses the captured application state");
    ids.add(g.definition.id);
  }
  return goals;
}
/** Load already-produced derivations, checking their type and exact fences.
 * This does not replay them or turn an untrusted producer into an authority. */
export async function captureApplicationGoals(store: Store, snapshot: ApplicationSnapshot, evidence: Record<string, Digest> = {}): Promise<ApplicationGoalCapture[]> {
  const definitions = await validateApplicationGoals(store, snapshot.revision);
  if (Object.keys(evidence).some(id => !definitions.some(d => d.goal.id === id))) throw new Error("Evidence names an unselected application goal");
  const rows: ApplicationGoalCapture[] = [];
  for (const {ref, goal} of definitions) {
    const derivation = Object.hasOwn(evidence, goal.id) ? evidence[goal.id] ?? null : null;
    let status: MemoryStatus = "unknown";
    if (derivation !== null) {
      const d = await getApplicationRecord(store, derivation, parseMemoryDerivation);
      if (d.application !== goal.application || d.capturedState !== snapshot.digest || d.memory !== snapshot.state.memory || d.query !== goal.query) throw new Error("Goal derivation crosses the captured application state");
      status = d.status;
    }
    rows.push({goal: ref, definition: goal, state: snapshot.digest, memory: snapshot.state.memory, status, derivation});
  }
  return bindApplicationGoalCaptures(snapshot, rows);
}
export async function evaluateApplicationGoals(memory: ApplicationMemoryService, snapshot: ApplicationSnapshot): Promise<ApplicationGoalCapture[]> {
  const definitions = await validateApplicationGoals(memory.store, snapshot.revision), evidence: Record<string, Digest> = {};
  for (const {goal} of definitions) evidence[goal.id] = (await memory.query(snapshot.digest, goal.query)).ref;
  return captureApplicationGoals(memory.store, snapshot, evidence);
}
