/** Experimental application host records. Native application parity is not yet claimed. */
import { asDigest, digestCanonical, type Digest } from "./digest";
import type { Store } from "./store";
import { asJsonValue, canonicalize, type JsonValue } from "./values";

export type ApplicationRevision = {
  contract: "algal.application-revision.v1";
  application: string;
  parent: Digest | null;
  schema: Digest;
  queries: Digest;
  views: Digest;
  runtimeProfile: Digest;
  evaluationPolicy: Digest;
  capabilityRequirements: string[];
  entrypoints: { name: string; manifest: Digest; applicability: Digest; maxGenerations: number }[];
};
export type ApplicationTransition = {
  contract: "algal.application-transition.v1";
  application: string;
  operation: Digest;
  request: Digest;
  kind: "create" | "memory" | "investigate" | "activate";
  previous: Digest | null;
  revision: Digest;
  memory: Digest;
  intents: Digest[];
  evidence: Digest[];
  causedBy: Digest | null;
};
export type ApplicationState = {
  contract: "algal.application-state.v1";
  application: string;
  sequence: number;
  epoch: number;
  revision: Digest;
  memory: Digest;
  previous: Digest | null;
  transition: Digest;
};
export type ApplicationHead = { contract: "algal.application-head.v1"; application: string; state: Digest };
export type WorkIntent = {
  contract: "algal.application-intent.v1"; application: string; operation: Digest; ordinal: number;
} & ({kind: "start-episode"; entrypoint: string; input: Digest} | {kind: "deliver"; route: string; message: Digest});
export type EpisodeBinding = {
  contract: "algal.application-episode.v1"; application: string; intent: Digest; sourceState: Digest;
  revision: Digest; memory: Digest; epoch: number; entrypoint: string; manifest: Digest;
  arguments: Digest; process: string; maxGenerations: number; hostProfile: Digest; access: "observe" | "external-write";
};

export const APPLICATION_LIMITS = Object.freeze({ recordBytes: 262_144, depth: 24, nodes: 16_384, states: 4096, intents: 32, entrypoints: 32 });

/** Bound first, then copy, before any asynchronous admission or caller mutation. */
export function applicationJson(input: unknown): JsonValue {
  let nodes = 0;
  const seen = new Set<object>();
  const visit = (value: unknown, depth: number): void => {
    if (++nodes > APPLICATION_LIMITS.nodes || depth > APPLICATION_LIMITS.depth) throw new Error("Application structure bound exceeded");
    if (value && typeof value === "object") {
      if (seen.has(value)) throw new Error("Application cyclic or aliased input");
      seen.add(value);
      if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error("Application record must be plain JSON");
      for (const child of Object.values(value)) visit(child, depth + 1);
    }
  };
  visit(input, 0);
  const value = asJsonValue(input, "application record");
  const bytes = canonicalize(value);
  if (Buffer.byteLength(bytes) > APPLICATION_LIMITS.recordBytes) throw new Error("Application byte bound exceeded");
  return JSON.parse(bytes) as JsonValue;
}
export function applicationObject(input: unknown, fields: readonly string[]): Record<string, JsonValue> {
  const value = applicationJson(input);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected application object");
  if (Object.keys(value).sort().join("\0") !== [...fields].sort().join("\0")) throw new Error("Unknown or missing application field");
  return value;
}
export function applicationId(input: unknown): string {
  if (typeof input !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(input)) throw new Error("Invalid application identifier");
  return input;
}
export function applicationInt(input: unknown, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < min || input > max) throw new Error("Invalid application integer");
  return input;
}
export const applicationRef = (input: unknown): Digest => asDigest(input, "application reference");
export const nullableApplicationRef = (input: unknown): Digest | null => input === null ? null : applicationRef(input);
export function applicationList<T>(input: unknown, max: number, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(input) || input.length > max) throw new Error("Application list bound exceeded");
  return input.map(parse);
}
export function applicationRefs(input: unknown, max: number): Digest[] {
  const result = applicationList(input, max, applicationRef);
  if (new Set(result).size !== result.length || result.some((v, i) => i > 0 && v < result[i - 1]!)) throw new Error("Application references must be sorted and unique");
  return result;
}
export function applicationTag(value: unknown, tag: string): void {
  if (value !== tag) throw new Error(`Expected ${tag}`);
}
export async function putApplicationRecord(store: Store, record: unknown): Promise<Digest> {
  return store.putValue(applicationJson(record));
}
export async function getApplicationRecord<T>(store: Store, ref: Digest, parse: (v: unknown) => T): Promise<T> {
  const value = await store.getValue(applicationRef(ref));
  if (value === undefined || digestCanonical(applicationJson(value)) !== ref) throw new Error("Missing or changed application record");
  return parse(value);
}

export function parseApplicationRevision(input: unknown): ApplicationRevision {
  const v = applicationObject(input, ["contract", "application", "parent", "schema", "queries", "views", "runtimeProfile", "evaluationPolicy", "capabilityRequirements", "entrypoints"]);
  applicationTag(v.contract, "algal.application-revision.v1");
  const capabilities = applicationList(v.capabilityRequirements, 32, applicationId);
  if (new Set(capabilities).size !== capabilities.length || capabilities.some((s, i) => i > 0 && s < capabilities[i - 1]!)) throw new Error("Capabilities must be sorted and unique");
  const entrypoints = applicationList(v.entrypoints, 32, input => {
    const e = applicationObject(input, ["name", "manifest", "applicability", "maxGenerations"]);
    return {name: applicationId(e.name), manifest: applicationRef(e.manifest), applicability: applicationRef(e.applicability), maxGenerations: applicationInt(e.maxGenerations, 1, 64)};
  });
  if (!entrypoints.length || new Set(entrypoints.map(e => e.name)).size !== entrypoints.length || entrypoints.some((e, i) => i > 0 && e.name < entrypoints[i - 1]!.name)) throw new Error("Entrypoints must be nonempty, sorted, unique");
  return {contract: "algal.application-revision.v1", application: applicationId(v.application), parent: nullableApplicationRef(v.parent), schema: applicationRef(v.schema), queries: applicationRef(v.queries), views: applicationRef(v.views), runtimeProfile: applicationRef(v.runtimeProfile), evaluationPolicy: applicationRef(v.evaluationPolicy), capabilityRequirements: capabilities, entrypoints};
}
export function parseApplicationState(input: unknown): ApplicationState {
  const v = applicationObject(input, ["contract", "application", "sequence", "epoch", "revision", "memory", "previous", "transition"]);
  applicationTag(v.contract, "algal.application-state.v1");
  const sequence = applicationInt(v.sequence, 0, 4095), epoch = applicationInt(v.epoch, 0, sequence);
  const previous = nullableApplicationRef(v.previous);
  if ((sequence === 0) !== (previous === null)) throw new Error("Invalid application predecessor");
  return {contract: "algal.application-state.v1", application: applicationId(v.application), sequence, epoch, revision: applicationRef(v.revision), memory: applicationRef(v.memory), previous, transition: applicationRef(v.transition)};
}
export function parseApplicationTransition(input: unknown): ApplicationTransition {
  const v = applicationObject(input, ["contract", "application", "operation", "request", "kind", "previous", "revision", "memory", "intents", "evidence", "causedBy"]);
  applicationTag(v.contract, "algal.application-transition.v1");
  if (v.kind !== "create" && v.kind !== "memory" && v.kind !== "investigate" && v.kind !== "activate") throw new Error("Invalid application transition kind");
  return {contract: "algal.application-transition.v1", application: applicationId(v.application), operation: applicationRef(v.operation), request: applicationRef(v.request), kind: v.kind, previous: nullableApplicationRef(v.previous), revision: applicationRef(v.revision), memory: applicationRef(v.memory), intents: applicationRefs(v.intents, 32), evidence: applicationRefs(v.evidence, 16), causedBy: nullableApplicationRef(v.causedBy)};
}
export function parseApplicationHead(input: unknown): ApplicationHead {
  const v = applicationObject(input, ["contract", "application", "state"]);
  applicationTag(v.contract, "algal.application-head.v1");
  return {contract: "algal.application-head.v1", application: applicationId(v.application), state: applicationRef(v.state)};
}
export function parseWorkIntent(input: unknown): WorkIntent {
  const raw = applicationJson(input);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected application intent");
  const kind = raw.kind;
  if (kind !== "start-episode" && kind !== "deliver") throw new Error("Invalid work intent");
  const v = applicationObject(raw, ["contract", "application", "operation", "ordinal", "kind", ...(kind === "start-episode" ? ["entrypoint", "input"] : ["route", "message"])]);
  applicationTag(v.contract, "algal.application-intent.v1");
  const base = {contract: "algal.application-intent.v1" as const, application: applicationId(v.application), operation: applicationRef(v.operation), ordinal: applicationInt(v.ordinal, 0, 31)};
  return kind === "start-episode" ? {...base, kind, entrypoint: applicationId(v.entrypoint), input: applicationRef(v.input)} : {...base, kind, route: applicationId(v.route), message: applicationRef(v.message)};
}
export function parseEpisodeBinding(input: unknown): EpisodeBinding {
  const v = applicationObject(input, ["contract", "application", "intent", "sourceState", "revision", "memory", "epoch", "entrypoint", "manifest", "arguments", "process", "maxGenerations", "hostProfile", "access"]);
  applicationTag(v.contract, "algal.application-episode.v1");
  if (v.access !== "observe" && v.access !== "external-write") throw new Error("Invalid episode access");
  return {contract: "algal.application-episode.v1", application: applicationId(v.application), intent: applicationRef(v.intent), sourceState: applicationRef(v.sourceState), revision: applicationRef(v.revision), memory: applicationRef(v.memory), epoch: applicationInt(v.epoch, 0, 4095), entrypoint: applicationId(v.entrypoint), manifest: applicationRef(v.manifest), arguments: applicationRef(v.arguments), process: applicationId(v.process), maxGenerations: applicationInt(v.maxGenerations, 1, 64), hostProfile: applicationRef(v.hostProfile), access: v.access};
}
