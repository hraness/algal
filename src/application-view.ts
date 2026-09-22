/** Pure, bounded projection of one captured application state. The renderer
 * receives data and fenced actions; it never probes, dispatches, or resolves a
 * mutable latest pointer. */
import { APPLICATION_LIMITS, applicationId, applicationInt, applicationJson, applicationList, applicationObject, applicationRef, applicationTag } from "./application-contract";
import { bindApplicationGoalCaptures, parseApplicationGoalCapture, type ApplicationGoalCapture } from "./application-goal";
import { parseApplicationViewEvidence, type ApplicationViewEvidence } from "./application-view-evidence";
export { collectApplicationViewEvidence, parseApplicationViewEvidence } from "./application-view-evidence";
export type { ApplicationViewEvidence } from "./application-view-evidence";
import type { MemoryStatus } from "./application-memory";
import type { ApplicationSnapshot } from "./application";
import type { Digest } from "./digest";
import type { Store } from "./store";
import { canonicalize } from "./values";

export const APPLICATION_VIEW_WIDGETS = ["procedures", "memory", "history", "investigations", "goals"] as const;
export type ApplicationViewWidget = (typeof APPLICATION_VIEW_WIDGETS)[number];
export const APPLICATION_APPLICABILITY_STATUSES = ["unknown", "supported", "stale", "opposed", "conflicted", "exhausted", "failed", "cancelled"] as const;
export type ApplicationViewSpec = {
  contract: "algal.application-view-spec.v1";
  title: string;
  widgets: ApplicationViewWidget[];
};
export type ApplicationRuntimeProfile = {
  contract: "algal.application-runtime-profile.v1";
  runtime: "bun-native-memory";
  policy: "pure-case-evaluation.v1";
};
export type ApplicationViewAction =
  | { kind: "investigate"; expectedState: Digest; intent: Digest }
  | { kind: "execute-procedure"; expectedState: Digest; procedure: Digest; queryResult: Digest };
export type ApplicationApplicability = {
  status: ApplicationView["procedures"][number]["applicability"];
  /** A supported result is only actionable when its producer records the
   * exact captured state and procedure it queried. */
  queryResult?: { digest: Digest; state: Digest; procedure: Digest };
};
export type ApplicationView = {
  contract: "algal.application-view.v1";
  application: string;
  state: Digest;
  revision: Digest;
  memory: Digest;
  title: string;
  widgets: ApplicationViewWidget[];
  goals?: ApplicationGoalCapture[];
  evidence?: ApplicationViewEvidence;
  procedures: { name: string; manifest: Digest; applicability: MemoryStatus }[];
  history: { state: Digest; sequence: number; revision: Digest; memory: Digest }[];
  investigations: { intent: Digest; expectedState: Digest }[];
  actions: ApplicationViewAction[];
  truncated: boolean;
};

const text = (value: unknown, max: number): string => {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value) > max || value.includes("\0")) throw new Error("Invalid view text");
  return value;
};
const widgets = (value: unknown): ApplicationViewWidget[] => {
  const list = applicationList(value, 5, item => {
    if (typeof item !== "string" || !(APPLICATION_VIEW_WIDGETS as readonly string[]).includes(item)) throw new Error("Unknown view widget");
    return item as ApplicationViewWidget;
  });
  if (new Set(list).size !== list.length || list.some((v, i) => i > 0 && v < list[i - 1]!)) throw new Error("View widgets must be sorted and unique");
  return list;
};
export function parseApplicationViewSpec(input: unknown): ApplicationViewSpec {
  const v = applicationObject(input, ["contract", "title", "widgets"]);
  applicationTag(v.contract, "algal.application-view-spec.v1");
  return { contract: "algal.application-view-spec.v1", title: text(v.title, 256), widgets: widgets(v.widgets) };
}
export function parseApplicationRuntimeProfile(input: unknown): ApplicationRuntimeProfile {
  const v = applicationObject(input, ["contract", "runtime", "policy"]);
  applicationTag(v.contract, "algal.application-runtime-profile.v1");
  if (v.runtime !== "bun-native-memory" || v.policy !== "pure-case-evaluation.v1") throw new Error("Unsupported application runtime profile");
  return { contract: "algal.application-runtime-profile.v1", runtime: "bun-native-memory", policy: "pure-case-evaluation.v1" };
}

export function projectApplicationView(input: {
  snapshot: ApplicationSnapshot;
  spec: ApplicationViewSpec;
  history?: ApplicationSnapshot[];
  applicability?: Record<string, ApplicationApplicability>;
  goals?: ApplicationGoalCapture[];
  evidence?: ApplicationViewEvidence;
}): ApplicationView {
  const { snapshot, spec } = input;
  const history = input.history ?? [snapshot];
  if (history.length > APPLICATION_LIMITS.states) throw new Error("View history bound exceeded");
  if (!history.length || history[history.length - 1]!.digest !== snapshot.digest) throw new Error("View history must terminate at the captured state");
  for (let i = 0; i < history.length; i++) {
    if (history[i]!.state.application !== snapshot.state.application) throw new Error("View history crosses application boundaries");
    if (i > 0 && history[i]!.state.sequence <= history[i - 1]!.state.sequence) throw new Error("View history sequences must increase");
  }
  const applicability = input.applicability ?? {};
  const evidence = input.evidence === undefined ? undefined : parseApplicationViewEvidence(input.evidence, snapshot.digest, snapshot.state.memory);
  const selectedApplicability = (name: string): ApplicationApplicability | undefined => {
    const selected = Object.hasOwn(applicability, name) ? applicability[name] : undefined;
    if (!evidence) return selected;
    const entry = snapshot.revision.entrypoints.find(item => item.name === name)!, query = evidence.queries.find(item => item.query === entry.applicability);
    if (!query) throw new Error("View evidence omits the entrypoint applicability query");
    if (selected && (selected.status !== query.status || (selected.queryResult && selected.queryResult.digest !== query.derivation))) throw new Error("Applicability conflicts with captured evidence");
    return selected ?? {status: query.status};
  };
  const procedures = snapshot.revision.entrypoints.map(entry => ({
    name: entry.name,
    manifest: entry.manifest,
    applicability: selectedApplicability(entry.name)?.status ?? "unknown",
  }));
  const goals = snapshot.revision.goals !== undefined || input.goals !== undefined ? bindApplicationGoalCaptures(snapshot, input.goals ?? []) : undefined;
  const actions: ApplicationViewAction[] = [];
  for (const entry of snapshot.revision.entrypoints) {
    const result = selectedApplicability(entry.name)?.queryResult;
    if (result && selectedApplicability(entry.name)?.status === "supported") {
      if (result.state !== snapshot.digest || result.procedure !== entry.manifest) throw new Error("Applicability result is not bound to the captured application state");
      actions.push({kind: "execute-procedure", expectedState: snapshot.digest, procedure: entry.manifest, queryResult: result.digest});
    }
  }
  const investigations = snapshot.transition.intents.map(intent => ({intent, expectedState: snapshot.digest}));
  const view: ApplicationView = {
    contract: "algal.application-view.v1", application: snapshot.state.application, state: snapshot.digest,
    revision: snapshot.state.revision, memory: snapshot.state.memory, title: spec.title, widgets: spec.widgets,
    ...(goals !== undefined ? {goals} : {}),
    ...(evidence !== undefined ? {evidence} : {}),
    procedures, history: history.slice(-128).map(item => ({state: item.digest, sequence: item.state.sequence, revision: item.state.revision, memory: item.state.memory})),
    investigations, actions, truncated: history.length > 128,
  };
  if (Buffer.byteLength(canonicalize(applicationJson(view))) > 262_144) throw new Error("Application view byte bound exceeded");
  return parseApplicationView(view);
}

export async function loadApplicationViewSpec(store: Store, ref: Digest): Promise<ApplicationViewSpec> {
  const value = await store.getValue(applicationRef(ref));
  if (value === undefined) throw new Error("Missing application view specification");
  return parseApplicationViewSpec(value);
}
export async function loadApplicationRuntimeProfile(store: Store, ref: Digest): Promise<ApplicationRuntimeProfile> {
  const value = await store.getValue(applicationRef(ref));
  if (value === undefined) throw new Error("Missing application runtime profile");
  return parseApplicationRuntimeProfile(value);
}

export function parseApplicationView(input: unknown): ApplicationView {
  const hasGoals = !!input && typeof input === "object" && Object.hasOwn(input, "goals");
  const hasEvidence = !!input && typeof input === "object" && Object.hasOwn(input, "evidence");
  const v = applicationObject(input, ["contract", "application", "state", "revision", "memory", "title", "widgets", "procedures", "history", "investigations", "actions", "truncated", ...(hasGoals ? ["goals"] : []), ...(hasEvidence ? ["evidence"] : [])]);
  applicationTag(v.contract, "algal.application-view.v1");
  const application = applicationId(v.application), state = applicationRef(v.state), revision = applicationRef(v.revision), memory = applicationRef(v.memory);
  const procedures = applicationList(v.procedures, 32, raw => {
    const p = applicationObject(raw, ["name", "manifest", "applicability"]);
    if (!(APPLICATION_APPLICABILITY_STATUSES as readonly string[]).includes(String(p.applicability))) throw new Error("Invalid view applicability");
    return {name: applicationId(p.name), manifest: applicationRef(p.manifest), applicability: p.applicability as ApplicationView["procedures"][number]["applicability"]};
  });
  if (new Set(procedures.map(p => p.name)).size !== procedures.length) throw new Error("Duplicate view procedure");
  const goals = hasGoals ? applicationList(v.goals, 8, parseApplicationGoalCapture) : undefined;
  if (goals && (new Set(goals.map(g => g.goal)).size !== goals.length || new Set(goals.map(g => g.definition.id)).size !== goals.length || goals.some((g, i) => (i > 0 && g.goal < goals[i - 1]!.goal) || g.state !== state || g.memory !== memory || g.definition.application !== application || !procedures.some(p => p.name === g.definition.entrypoint)))) throw new Error("Goal capture crosses the captured application state");
  const history = applicationList(v.history, 128, raw => {
    const h = applicationObject(raw, ["state", "sequence", "revision", "memory"]);
    return {state: applicationRef(h.state), sequence: applicationInt(h.sequence, 0, 4095), revision: applicationRef(h.revision), memory: applicationRef(h.memory)};
  });
  if (!history.length || history[history.length - 1]!.state !== state || history[history.length - 1]!.revision !== revision || history[history.length - 1]!.memory !== memory) throw new Error("View history does not terminate at the captured state");
  for (let i = 1; i < history.length; i++) if (history[i]!.sequence <= history[i - 1]!.sequence) throw new Error("View history sequences must increase");
  const investigations = applicationList(v.investigations, 32, raw => {
    const i = applicationObject(raw, ["intent", "expectedState"]);
    const expectedState = applicationRef(i.expectedState); if (expectedState !== state) throw new Error("Investigation is not fenced to the captured state");
    return {intent: applicationRef(i.intent), expectedState};
  });
  const actions = applicationList(v.actions, 32, raw => {
    const a = applicationJson(raw);
    if (!a || typeof a !== "object" || Array.isArray(a)) throw new Error("Invalid view action");
    if (a.kind === "investigate") {
      const i = applicationObject(a, ["kind", "expectedState", "intent"]); const expectedState = applicationRef(i.expectedState), intent = applicationRef(i.intent); if (expectedState !== state || !investigations.some(item => item.intent === intent)) throw new Error("Investigation action is not fenced to the captured state"); return {kind: "investigate" as const, expectedState, intent};
    }
    const e = applicationObject(a, ["kind", "expectedState", "procedure", "queryResult"]); applicationTag(e.kind, "execute-procedure");
    const expectedState = applicationRef(e.expectedState), procedure = applicationRef(e.procedure);
    if (expectedState !== state || !procedures.some(item => item.manifest === procedure && item.applicability === "supported")) throw new Error("Procedure action is not fenced to supported applicability at the captured state");
    return {kind: "execute-procedure" as const, expectedState, procedure, queryResult: applicationRef(e.queryResult)};
  });
  applicationId(v.application); applicationRef(v.state); applicationRef(v.revision); applicationRef(v.memory); text(v.title, 256); widgets(v.widgets);
  if (typeof v.truncated !== "boolean") throw new Error("Invalid view truncation marker");
  const evidence = hasEvidence ? parseApplicationViewEvidence(v.evidence, state, memory) : undefined;
  if (evidence?.revisions.at(-1)!.revision !== undefined && evidence.revisions.at(-1)!.revision !== revision) throw new Error("Evidence revision differs from captured view revision");
  if (evidence?.work.some(work => history.some(row => row.state === work.sourceState && (row.revision !== work.revision || row.memory !== work.memory)))) throw new Error("Evidence work binding differs from captured history");
  if (evidence && actions.some(action => action.kind === "execute-procedure" && !evidence.queries.some(query => query.derivation === action.queryResult && query.status === "supported"))) throw new Error("View action conflicts with captured query evidence");
  return {contract: "algal.application-view.v1", application, state, revision, memory, title: text(v.title, 256), widgets: widgets(v.widgets), ...(goals !== undefined ? {goals} : {}), ...(evidence !== undefined ? {evidence} : {}), procedures, history, investigations, actions, truncated: v.truncated};
}
