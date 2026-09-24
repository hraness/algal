/** Forward-only restoration of retained pure strategies. Authority is an
 * explicit host option; a stored policy or historical state grants none. */
import {
  APPLICATION_LIMITS, applicationId, applicationJson, applicationObject,
  applicationRef, applicationRefs, applicationTag, getApplicationRecord,
  nullableApplicationRef, parseApplicationRevision, parseApplicationState,
  putApplicationRecord, type ApplicationRevision,
} from "./application-contract";
import type { ApplicationCore, ApplicationSnapshot } from "./application-core";
import { digestCanonical, type Digest } from "./digest";
import { compileOrganism, interfaceSignature } from "./graph";
import { builtinRegistry } from "./registry";
import { replayStore } from "./store-memory";
import type { Store } from "./store-contract";

export type ApplicationRestorationPolicy = {
  contract: "algal.application-restoration-policy.v1";
  application: string;
  mode: "retained-pure-strategy-manifests";
};
export type ApplicationRestoration = {
  contract: "algal.application-restoration.v1";
  application: string;
  parentState: Digest; targetState: Digest; candidateRevision: Digest; policy: Digest;
};
export type RestoreApplicationRevisionInput = {
  application: string; operation: Digest; expectedHead: Digest; targetState: Digest; policy: Digest;
  evidence?: Digest[]; causedBy?: Digest | null;
};
export type RestoredApplicationRevision = { snapshot: ApplicationSnapshot; revision: Digest; restoration: Digest };
const hash = (value: unknown) => digestCanonical(applicationJson(value));

export function parseApplicationRestorationPolicy(input: unknown): ApplicationRestorationPolicy {
  const v = applicationObject(input, ["contract", "application", "mode"]);
  applicationTag(v.contract, "algal.application-restoration-policy.v1");
  applicationTag(v.mode, "retained-pure-strategy-manifests");
  return { contract: "algal.application-restoration-policy.v1", application: applicationId(v.application), mode: "retained-pure-strategy-manifests" };
}
export function parseApplicationRestoration(input: unknown): ApplicationRestoration {
  const v = applicationObject(input, ["contract", "application", "parentState", "targetState", "candidateRevision", "policy"]);
  applicationTag(v.contract, "algal.application-restoration.v1");
  return { contract: "algal.application-restoration.v1", application: applicationId(v.application), parentState: applicationRef(v.parentState), targetState: applicationRef(v.targetState), candidateRevision: applicationRef(v.candidateRevision), policy: applicationRef(v.policy) };
}

async function restoredRevision(store: Store, application: string, parentState: Digest, targetState: Digest): Promise<ApplicationRevision> {
  const parent = await getApplicationRecord(store, parentState, parseApplicationState);
  if (parent.application !== application) throw new Error("Restoration belongs to another application");
  let cursor = parent.previous;
  const seen = new Set<Digest>([parentState]);
  while (cursor !== null) {
    if (seen.size >= APPLICATION_LIMITS.states || seen.has(cursor)) throw new Error("Restoration ancestry bound/cycle");
    seen.add(cursor);
    const state = await getApplicationRecord(store, cursor, parseApplicationState);
    if (state.application !== application) throw new Error("Restoration ancestry belongs to another application");
    if (cursor === targetState) break;
    cursor = state.previous;
  }
  if (cursor === null) throw new Error("Restoration target is not a retained ancestor");
  const target = await getApplicationRecord(store, targetState, parseApplicationState);
  const current = await getApplicationRecord(store, parent.revision, parseApplicationRevision);
  const historical = await getApplicationRecord(store, target.revision, parseApplicationRevision);
  if (current.application !== application || historical.application !== application || hash(current.entrypoints.map(entry => entry.name)) !== hash(historical.entrypoints.map(entry => entry.name))) throw new Error("Restoration entrypoints differ");
  let changed = 0;
  const entrypoints = [];
  for (const entry of current.entrypoints) {
    const old = historical.entrypoints.find(row => row.name === entry.name)!;
    if (old.manifest !== entry.manifest) {
      changed++;
      const incumbent = await store.getManifest(entry.manifest), candidate = await store.getManifest(old.manifest);
      if (!incumbent || !candidate) throw new Error("Restoration manifest is missing");
      for (const manifest of [incumbent, candidate]) if (manifest.cells.some(cell => !["input", "const", "fn", "expr"].includes(cell.kind))) throw new Error("Restoration can only change pure strategy manifests");
      for (const key of ["maxSteps", "maxAgentCalls", "maxWork", "maxContextBytes", "maxOutputBytes", "maxDepth"] as const) if (candidate.budgets[key] > incumbent.budgets[key]) throw new Error("Restoration widens a manifest budget");
      const registry = builtinRegistry(), readOnly = replayStore(store);
      const left = await compileOrganism(incumbent, registry, readOnly), right = await compileOrganism(candidate, registry, readOnly);
      if (hash(interfaceSignature(left)) !== hash(interfaceSignature(right))) throw new Error("Restoration changes the compiled interface");
    }
    entrypoints.push({ ...entry, manifest: old.manifest });
  }
  if (!changed) throw new Error("Restoration must change a strategy manifest");
  return parseApplicationRevision({ ...current, parent: parent.revision, entrypoints });
}

/** Structural verification is independent of host authority and runs on both
 * commit and retained-history inspection. Only the host can authorize policy. */
export async function verifyApplicationRestoration(store: Store, input: {
  application: string; parentState: Digest; candidateRevision: Digest; evidence: Digest[];
}): Promise<ApplicationRestoration> {
  const matches: ApplicationRestoration[] = [];
  for (const reference of input.evidence) {
    const value = await getApplicationRecord(store, reference, applicationJson);
    if (value && typeof value === "object" && !Array.isArray(value) && value.contract === "algal.application-restoration.v1") matches.push(parseApplicationRestoration(value));
  }
  if (matches.length !== 1) throw new Error("Restoration requires exactly one restoration record");
  const record = matches[0]!;
  if (record.application !== input.application || record.parentState !== input.parentState || record.candidateRevision !== input.candidateRevision) throw new Error("Restoration evidence does not bind this transition");
  const policy = await getApplicationRecord(store, record.policy, parseApplicationRestorationPolicy);
  if (policy.application !== input.application) throw new Error("Restoration policy belongs to another application");
  const expected = await restoredRevision(store, record.application, record.parentState, record.targetState);
  const candidate = await getApplicationRecord(store, input.candidateRevision, parseApplicationRevision);
  if (hash(candidate) !== hash(expected)) throw new Error("Restoration must preserve current revision metadata and authority");
  return record;
}

export async function restoreApplicationRevision(lifecycle: ApplicationCore, input: RestoreApplicationRevisionInput): Promise<RestoredApplicationRevision> {
  const optional = ["evidence", "causedBy"].filter(key => Object.hasOwn(input, key));
  const v = applicationObject(input, ["application", "operation", "expectedHead", "targetState", "policy", ...optional]);
  const application = applicationId(v.application), operation = applicationRef(v.operation), expectedHead = applicationRef(v.expectedHead);
  const targetState = applicationRef(v.targetState), policy = applicationRef(v.policy), evidence = applicationRefs(v.evidence ?? [], 15), causedBy = nullableApplicationRef(v.causedBy ?? null);
  const revision = await putApplicationRecord(lifecycle.store, await restoredRevision(lifecycle.store, application, expectedHead, targetState));
  const restoration = await putApplicationRecord(lifecycle.store, { contract: "algal.application-restoration.v1", application, parentState: expectedHead, targetState, candidateRevision: revision, policy });
  const current = await getApplicationRecord(lifecycle.store, expectedHead, parseApplicationState);
  const snapshot = await lifecycle.commit({ application, operation, kind: "restore", expectedHead, revision, memory: current.memory, intents: [], evidence: [...new Set([...evidence, restoration])].sort(), causedBy });
  return { snapshot, revision, restoration };
}
