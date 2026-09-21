/** Pure, bounded projection of one captured application state. The renderer
 * receives data and fenced actions; it never probes, dispatches, or resolves a
 * mutable latest pointer. */
import { applicationId, applicationInt, applicationJson, applicationList, applicationObject, applicationRef, applicationTag, type ApplicationRevision } from "./application-contract";
import type { ApplicationSnapshot } from "./application";
import type { Digest } from "./digest";
import type { Store } from "./store";
import { canonicalize, type JsonValue } from "./values";

export const APPLICATION_VIEW_WIDGETS = ["procedures", "memory", "history", "investigations"] as const;
export type ApplicationViewWidget = (typeof APPLICATION_VIEW_WIDGETS)[number];
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
export type ApplicationView = {
  contract: "algal.application-view.v1";
  application: string;
  state: Digest;
  revision: Digest;
  memory: Digest;
  title: string;
  widgets: ApplicationViewWidget[];
  procedures: { name: string; manifest: Digest; applicability: "unknown" | "supported" | "stale" | "opposed" | "conflicted" }[];
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
  const list = applicationList(value, 4, item => {
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
  applicability?: Record<string, { status: ApplicationView["procedures"][number]["applicability"]; queryResult?: Digest }>;
}): ApplicationView {
  const { snapshot, spec } = input;
  const history = input.history ?? [snapshot];
  if (history.length > 128) throw new Error("View history bound exceeded");
  const applicability = input.applicability ?? {};
  const procedures = snapshot.revision.entrypoints.map(entry => ({
    name: entry.name,
    manifest: entry.manifest,
    applicability: applicability[entry.name]?.status ?? "unknown",
  }));
  const actions: ApplicationViewAction[] = [];
  for (const entry of snapshot.revision.entrypoints) {
    const result = applicability[entry.name]?.queryResult;
    if (result && applicability[entry.name]?.status === "supported") actions.push({kind: "execute-procedure", expectedState: snapshot.digest, procedure: entry.manifest, queryResult: result});
  }
  const investigations = snapshot.transition.intents.map(intent => ({intent, expectedState: snapshot.digest}));
  const view: ApplicationView = {
    contract: "algal.application-view.v1", application: snapshot.state.application, state: snapshot.digest,
    revision: snapshot.state.revision, memory: snapshot.state.memory, title: spec.title, widgets: spec.widgets,
    procedures, history: history.slice(-128).map(item => ({state: item.digest, sequence: item.state.sequence, revision: item.state.revision, memory: item.state.memory})),
    investigations, actions, truncated: history.length > 128,
  };
  if (Buffer.byteLength(canonicalize(applicationJson(view))) > 262_144) throw new Error("Application view byte bound exceeded");
  return structuredClone(view);
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
  const v = applicationObject(input, ["contract", "application", "state", "revision", "memory", "title", "widgets", "procedures", "history", "investigations", "actions", "truncated"]);
  applicationTag(v.contract, "algal.application-view.v1");
  applicationId(v.application); applicationRef(v.state); applicationRef(v.revision); applicationRef(v.memory); text(v.title, 256); widgets(v.widgets);
  if (typeof v.truncated !== "boolean") throw new Error("Invalid view truncation marker");
  return applicationJson(v) as ApplicationView;
}
