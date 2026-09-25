import { productDigest } from "./product";
import { stableJson } from "../lib/files";
import type { History, Name, ObservationTarget, Target, Value } from "./schema";

export const BASE_VALUES: Value[] = ["red", "blue", null, Object.fromEntries([["__proto__", "own"]])];
export const MEMORY: Value[] = [
  { contract: "algal.memory.fixture.v1", facts: [] },
  { contract: "algal.memory.fixture.v1", facts: ["changed"] },
];
export const MANIFEST = {
  contract: "algal.organism.v1", key: "organism:custody-fixture", name: "Custody fixture",
  cells: [{ id: "output", kind: "const", outputs: { value: { type: "json", value: "ok" } } }], edges: [],
};
export const RECORD = { contract: "algal.custody.fixture.v1" };
export const MISSING = productDigest(["trace-missing"]);
export const keyDigest = (key: number): string => productDigest(["trace-key", key]);
export const appName = (app: number): string => `trace-app-${app}`;
export const boxName = (box: number): string => `trace-box-${box}`;
export const slotName = (key: number): string => `trace-slot-${key}`;
export const authority = (box: number, right: "send" | "receive"): string => `box${box}:${right}`;
export function revision(app: Name, manifest: string, record: string): Value {
  return { contract: "algal.application-revision.v1", application: appName(app), parent: null,
    schema: record, queries: record, views: record, runtimeProfile: record, evaluationPolicy: record,
    capabilityRequirements: [], entrypoints: [{ name: "run", manifest, applicability: record, maxGenerations: 1, capabilities: [], queries: [record] }] };
}
export const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
export function inventory(history: History): { observations: ObservationTarget[]; files: Target[] } {
  const targets: Target[] = BASE_VALUES.map(value => ({ kind: "value", value }));
  for (const { action } of history.commands) {
    if (action.kind === "store-put" || action.kind === "store-get") targets.push({ kind: "value", value: action.value });
    if (action.kind === "tamper" && action.target.kind === "value") targets.push(action.target);
  }
  for (const key of [0, 1, 2, 3] as const) {
    targets.push({ kind: "effect", key }, { kind: "slot", key });
    for (const box of [0, 1] as const) for (const kind of ["mailbox-pending", "mailbox-consumed", "mailbox-message"] as const) targets.push({ kind, box, key });
  }
  for (const n of [0, 1] as const) targets.push({ kind: "mailbox-lock", box: n }, { kind: "application-head", app: n }, { kind: "application-memory", memory: n });
  const files = [...new Map(targets.map(target => [stableJson(target), target])).values()].sort((a, b) => compareText(stableJson(a), stableJson(b)));
  const observations: ObservationTarget[] = [...files];
  for (const n of [0, 1] as const) observations.push({ kind: "mailbox-config", box: n }, { kind: "application-history", app: n });
  observations.sort((a, b) => compareText(stableJson(a), stableJson(b)));
  return { observations, files };
}
