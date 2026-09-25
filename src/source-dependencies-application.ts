// Application revision links for a source dependency report. One
// application's validated history is read through a caller-supplied reader:
// each module and occurrence is linked to the revision entrypoints whose
// recorded static closure contains its executable digest, to the evaluation
// records that measured such an entrypoint, and to the transition that
// activated each revision. Matching uses digests from recorded evidence
// only, never names. Evaluations are not replayed; records that cannot be
// read, parsed, or bound are counted rather than guessed. The join is
// presentation-only and writes nothing.
import { parseApplicationEvaluation, parseApplicationEvaluationRequest } from "./application-adaptation";
import { parseApplicationComparison } from "./application-comparison";
import {
  APPLICATION_LIMITS, applicationId, applicationJson, parseApplicationRevision,
  parseApplicationState, parseApplicationTransition, type ApplicationRevision, type ApplicationTransition,
} from "./application-contract";
import type { ApplicationSnapshot } from "./application-core";
import { parseApplicationExperiment } from "./application-experiment";
import { manifestToJson, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { COMPILE_BOUNDS } from "./graph";
import type { Store } from "./store-contract";
import { compareUtf8 } from "./utf8";
import type { JsonValue } from "./values";

export const SOURCE_DEPENDENCY_APPLICATION_BOUNDS = Object.freeze({
  /** Records read beyond validated history: transition evidence, evaluation
   * records and their requests, candidate revisions, and manifests outside
   * the report. A join that needs more is refused. */
  maxRecords: 4_096,
  /** Revision entrypoint rows kept; the latest are kept and the rest counted. */
  maxEntrypoints: 64,
  /** Evaluation links kept per row; the latest are kept and the rest counted. */
  maxEvaluations: 16,
  /** Static nesting followed through manifests outside the report. */
  maxClosureDepth: COMPILE_BOUNDS.maxDepth,
});

export interface SourceDependencyApplicationReader {
  /** Validated retained history in genesis-to-head order, as
   * `ApplicationCore.history` returns it. The join checks every digest binding
   * again, so a reader cannot substitute a state, transition, or revision. */
  history(application: string): Promise<readonly ApplicationSnapshot[]>;
  readonly store: Pick<Store, "getValue" | "getManifest">;
}
export type SourceDependencyApplicationOptions = { readonly name: string; readonly reader: SourceDependencyApplicationReader };

export type SourceDependencyApplicationActivation = {
  readonly sequence: number;
  readonly kind: "create" | "activate" | "migrate" | "restore";
  readonly state: Digest;
  readonly transition: Digest;
};
export type SourceDependencyApplicationEvaluation = {
  readonly evaluation: Digest;
  /** The committed state the candidate was measured against, and its sequence. */
  readonly parentState: Digest;
  readonly parentSequence: number;
  /** The recorded verdict; the join does not replay evaluations. */
  readonly verdict: "accepted" | "rejected" | "incomplete";
};
export type SourceDependencyApplicationEntrypoint = {
  readonly revision: Digest;
  /** The recorded entrypoint name, shown as a label; matching never uses it. */
  readonly entrypoint: string;
  readonly manifest: Digest;
  /** The closure contains the report's root, so every occurrence's call path runs inside this entrypoint. */
  readonly root: boolean;
  /** False when a manifest in the closure outside the report could not be read or is only named at run time. */
  readonly complete: boolean;
  /** The application head selects this revision. */
  readonly current: boolean;
  /** The committed transition that selected this revision, or null for a revision known only from evaluation records. */
  readonly activation: SourceDependencyApplicationActivation | null;
  /** Evaluation records that measured this revision at this entrypoint, oldest first. */
  readonly evaluations: readonly SourceDependencyApplicationEvaluation[];
};
export type SourceDependencyApplicationModuleLinks = { readonly manifestDigest: Digest; readonly entrypoints: readonly number[] };
export type SourceDependencyApplicationOccurrenceLinks = { readonly path: readonly string[]; readonly entrypoints: readonly number[] };
export type SourceDependencyApplication = {
  readonly name: string;
  /** Head state digest when the history was read. */
  readonly head: Digest;
  /** Links come from digests in recorded evidence, not from replay. */
  readonly verification: "digest-bound";
  /** Revision entrypoints whose closure contains a report module, ordered by
   * activation or first evaluation; indices below refer to this list. */
  readonly entrypoints: readonly SourceDependencyApplicationEntrypoint[];
  /** Parallels `report.modules`. */
  readonly modules: readonly SourceDependencyApplicationModuleLinks[];
  /** Parallels `report.occurrences`; an occurrence links wherever its digest does. */
  readonly occurrences: readonly SourceDependencyApplicationOccurrenceLinks[];
  readonly counts: {
    readonly states: number;
    /** Distinct revisions examined: selected by a state or measured by an evaluation record. */
    readonly revisions: { readonly matched: number; readonly unmatched: number; readonly unresolved: number };
    /** Distinct evaluation records cited by transition evidence, directly or through a comparison or experiment. */
    readonly evaluations: { readonly matched: number; readonly unmatched: number; readonly unreadable: number };
    readonly evidence: { readonly examined: number; readonly unreadable: number };
    /** Manifests outside the report read to follow a closure. */
    readonly manifests: { readonly examined: number; readonly unreadable: number };
  };
  readonly omitted: { readonly entrypoints: number; readonly evaluations: number };
};
/** The report's static structure, supplied by `createSourceDependencyReport`. */
export type SourceDependencyApplicationStructure = {
  readonly root: Digest;
  readonly modules: readonly Digest[];
  readonly manifests: ReadonlyMap<Digest, OrganismManifest>;
  readonly occurrences: readonly { readonly path: readonly string[]; readonly manifestDigest: Digest }[];
};

const ACTIVATING = new Set<ApplicationTransition["kind"]>(["create", "activate", "migrate", "restore"]);
type Closure = { readonly modules: ReadonlySet<Digest>; readonly complete: boolean };
type State = { readonly digest: Digest; readonly transition: ApplicationTransition; readonly revision: ApplicationRevision; readonly revisionDigest: Digest; readonly transitionDigest: Digest };
type Link = SourceDependencyApplicationEvaluation;
const invalid = (message: string): never => { throw new AlgalError("PARSE_FAILED", `source dependencies: ${message}`); };

/** Read the options once, synchronously, before any await. */
export function captureSourceDependencyApplication(value: unknown): SourceDependencyApplicationOptions {
  if (value === null || typeof value !== "object") return invalid("application options must be an object");
  const name: unknown = (value as { name?: unknown }).name;
  const reader: unknown = (value as { reader?: unknown }).reader;
  try { applicationId(name); } catch { return invalid("application name must match ^[a-z][a-z0-9._-]{0,63}$"); }
  if (reader === null || typeof reader !== "object") return invalid("application reader must be an object");
  const history: unknown = (reader as { history?: unknown }).history;
  const store: unknown = (reader as { store?: unknown }).store;
  if (typeof history !== "function" || store === null || typeof store !== "object") return invalid("application reader needs history() and a store");
  const getValue: unknown = (store as { getValue?: unknown }).getValue;
  const getManifest: unknown = (store as { getManifest?: unknown }).getManifest;
  if (typeof getValue !== "function" || typeof getManifest !== "function") return invalid("application store needs getValue() and getManifest()");
  return {
    name: name as string,
    reader: {
      history: application => (history as SourceDependencyApplicationReader["history"]).call(reader, application),
      store: {
        getValue: digest => (getValue as Store["getValue"]).call(store, digest),
        getManifest: digest => (getManifest as Store["getManifest"]).call(store, digest),
      },
    },
  };
}

/** Recheck the reader's history: closed parsers, digest bindings, sequence, and predecessor links. */
function validatedHistory(snapshots: readonly ApplicationSnapshot[], name: string): State[] {
  if (!Array.isArray(snapshots)) return invalid("application history must be a list");
  if (snapshots.length === 0) throw new AlgalError("STORE_MISS", `source dependencies: application ${name} has no retained history`);
  if (snapshots.length > APPLICATION_LIMITS.states) throw new AlgalError("BUDGET_EXHAUSTED", `source dependencies: application history exceeds ${APPLICATION_LIMITS.states} states`);
  const states: State[] = [];
  for (const [index, snapshot] of snapshots.entries()) {
    try {
      const raw = snapshot as { digest?: unknown; state?: unknown; transition?: unknown; revision?: unknown };
      const digest = asDigest(raw.digest, "application state");
      const state = parseApplicationState(raw.state);
      const transition = parseApplicationTransition(raw.transition);
      const revision = parseApplicationRevision(raw.revision);
      const transitionDigest = digestCanonical(applicationJson(raw.transition));
      const revisionDigest = digestCanonical(applicationJson(raw.revision));
      if (digestCanonical(applicationJson(raw.state)) !== digest || state.transition !== transitionDigest || state.revision !== revisionDigest
        || state.application !== name || transition.application !== name || revision.application !== name
        || state.sequence !== index || state.previous !== (index === 0 ? null : states[index - 1]!.digest)
        || transition.revision !== state.revision || transition.memory !== state.memory || transition.previous !== state.previous) throw new Error("binding");
      states.push({ digest, transition, revision, revisionDigest, transitionDigest });
    } catch {
      throw new AlgalError("DIGEST_MISMATCH", `source dependencies: application history is not a validated chain at state ${index}`);
    }
  }
  return states;
}

/** Join one application's recorded revisions, evaluations, and activations
 * with a report's modules and occurrences. */
export async function joinSourceDependencyApplication(structure: SourceDependencyApplicationStructure, options: SourceDependencyApplicationOptions): Promise<SourceDependencyApplication> {
  const bounds = SOURCE_DEPENDENCY_APPLICATION_BOUNDS;
  const { name, reader } = options;
  const store = reader.store;
  let reads = 0;
  const charge = (): void => {
    if (++reads > bounds.maxRecords) throw new AlgalError("BUDGET_EXHAUSTED", `source dependencies: application evidence needs more than ${bounds.maxRecords} record reads`);
  };
  /** One charged read of a content-addressed application record; a missing,
   * changed, oversized, or unparseable record yields undefined. */
  const read = async <T>(reference: Digest, parse: (value: unknown) => T): Promise<T | undefined> => {
    charge();
    try {
      const value = await store.getValue(reference);
      if (value === undefined || digestCanonical(applicationJson(value)) !== reference) return undefined;
      return parse(value);
    } catch { return undefined; }
  };
  let snapshots: readonly ApplicationSnapshot[];
  try { snapshots = await reader.history(name); }
  catch (error) {
    if (error instanceof AlgalError) throw error;
    throw new AlgalError("DIGEST_MISMATCH", `source dependencies: application history could not be validated: ${error instanceof Error ? error.message : String(error)}`);
  }
  const states = validatedHistory(snapshots, name);
  const head = states.at(-1)!;
  const sequenceOf = new Map(states.map((state, index) => [state.digest, index]));
  const revisions = new Map<Digest, ApplicationRevision>();
  const activations = new Map<Digest, SourceDependencyApplicationActivation>();
  states.forEach((state, sequence) => {
    if (!revisions.has(state.revisionDigest)) revisions.set(state.revisionDigest, state.revision);
    // A revision names its parent, so a linear history can select it only once.
    if (ACTIVATING.has(state.transition.kind) && !activations.has(state.revisionDigest)) {
      activations.set(state.revisionDigest, { sequence, kind: state.transition.kind as SourceDependencyApplicationActivation["kind"], state: state.digest, transition: state.transitionDigest });
    }
  });

  // Evidence is read newest first; evaluation records come from transition
  // evidence directly or through a cited comparison or experiment.
  const evidence = { examined: 0, unreadable: 0 };
  const seenEvidence = new Set<Digest>();
  const queue: Digest[] = [];
  const queued = new Set<Digest>();
  const enqueue = (reference: Digest): void => { if (!queued.has(reference)) { queued.add(reference); queue.push(reference); } };
  for (let index = states.length - 1; index >= 0; index--) {
    for (const reference of states[index]!.transition.evidence) {
      if (seenEvidence.has(reference)) continue;
      seenEvidence.add(reference);
      evidence.examined++;
      const record = await read(reference, value => value as JsonValue);
      try {
        if (record === undefined) throw new Error("unreadable evidence");
        const contract = record !== null && typeof record === "object" && !Array.isArray(record) ? (record as { contract?: JsonValue }).contract : undefined;
        if (contract === "algal.application-evaluation.v1") enqueue(reference);
        else if (contract === "algal.application-comparison.v1") for (const row of parseApplicationComparison(record).results) enqueue(row.evaluation);
        else if (contract === "algal.application-experiment.v1") for (const cited of parseApplicationExperiment(record).evaluations) enqueue(cited);
      } catch { evidence.unreadable++; }
    }
  }

  const evaluations = { matched: 0, unmatched: 0, unreadable: 0 };
  const measured: { revision: Digest; entrypoint: string; manifest: Digest; link: Link }[] = [];
  const firstEvaluation = new Map<Digest, number>();
  for (const reference of queue) {
    const evaluation = await read(reference, parseApplicationEvaluation);
    const request = evaluation === undefined ? undefined : await read(evaluation.request, parseApplicationEvaluationRequest);
    if (evaluation === undefined || request === undefined || request.parentState !== evaluation.parentState || request.candidateRevision !== evaluation.candidateRevision
      || request.cases !== evaluation.cases || request.scorer !== evaluation.scorer || request.policy !== evaluation.policy) { evaluations.unreadable++; continue; }
    const sequence = sequenceOf.get(request.parentState);
    if (sequence === undefined) { evaluations.unmatched++; continue; }
    const candidate = revisions.get(request.candidateRevision) ?? await read(request.candidateRevision, parseApplicationRevision);
    if (candidate === undefined) { evaluations.unreadable++; continue; }
    if (candidate.application !== name) { evaluations.unmatched++; continue; }
    // The structural checks evaluation replay starts with, without the replay.
    const entry = candidate.entrypoints.find(item => item.name === request.entrypoint);
    if (candidate.parent !== states[sequence]!.revisionDigest || candidate.evaluationPolicy !== request.policy || entry === undefined) { evaluations.unreadable++; continue; }
    if (!revisions.has(request.candidateRevision)) revisions.set(request.candidateRevision, candidate);
    firstEvaluation.set(request.candidateRevision, Math.min(firstEvaluation.get(request.candidateRevision) ?? sequence, sequence));
    measured.push({ revision: request.candidateRevision, entrypoint: entry.name, manifest: entry.manifest, link: { evaluation: reference, parentState: request.parentState, parentSequence: sequence, verdict: evaluation.verdict.status } });
  }

  // Closures: a report module's closure is known from compilation; any other
  // manifest is read by digest and its static children followed.
  const manifests = { examined: 0, unreadable: 0 };
  const memo = new Map<Digest, Closure>();
  const closure = async (digest: Digest, depth: number): Promise<Closure> => {
    const cached = memo.get(digest);
    if (cached !== undefined) return cached;
    let manifest = structure.manifests.get(digest);
    const known = manifest !== undefined;
    if (manifest === undefined) {
      if (depth > bounds.maxClosureDepth) return { modules: new Set(), complete: false };
      manifests.examined++;
      charge();
      try {
        manifest = await store.getManifest(digest);
        if (manifest !== undefined && digestCanonical(manifestToJson(manifest)) !== digest) manifest = undefined;
      } catch { manifest = undefined; }
      if (manifest === undefined) {
        manifests.unreadable++;
        const missing = { modules: new Set<Digest>(), complete: false };
        memo.set(digest, missing);
        return missing;
      }
    }
    const modules = new Set<Digest>(known ? [digest] : []);
    let complete = true;
    for (const cell of manifest.cells) {
      if (cell.kind === "spawn") { complete = false; continue; }
      if (cell.kind !== "organism" && cell.kind !== "each" && cell.kind !== "repeat") continue;
      let child: Digest;
      try { child = asDigest(cell.manifest, `cell "${cell.id}".manifest`); } catch { complete = false; continue; }
      const inner = await closure(child, depth + 1);
      for (const module of inner.modules) modules.add(module);
      complete &&= inner.complete;
    }
    const result = { modules, complete };
    memo.set(digest, result);
    return result;
  };

  type Row = SourceDependencyApplicationEntrypoint & { readonly anchor: number; readonly modules: ReadonlySet<Digest>; readonly links: Link[] };
  const rows: Row[] = [];
  const counts = { matched: 0, unmatched: 0, unresolved: 0 };
  const rowFor = new Map<string, Row>();
  const key = (revision: Digest, entrypoint: string): string => `${revision}\n${entrypoint}`;
  for (const [digest, revision] of revisions) {
    const activation = activations.get(digest) ?? null;
    // A candidate measured against state N could be activated at N + 1 at the earliest.
    const anchor = activation?.sequence ?? (firstEvaluation.get(digest) ?? 0) + 1;
    let matched = false;
    let complete = true;
    for (const entry of revision.entrypoints) {
      const found = await closure(entry.manifest, 0);
      complete &&= found.complete;
      if (found.modules.size === 0) continue;
      matched = true;
      const row: Row = {
        revision: digest, entrypoint: entry.name, manifest: entry.manifest, root: found.modules.has(structure.root), complete: found.complete,
        current: digest === head.revisionDigest, activation, evaluations: [], anchor, modules: found.modules, links: [],
      };
      rows.push(row);
      rowFor.set(key(digest, entry.name), row);
    }
    if (matched) counts.matched++;
    else if (complete) counts.unmatched++;
    else counts.unresolved++;
  }
  for (const item of measured) {
    const row = rowFor.get(key(item.revision, item.entrypoint));
    if (row !== undefined) { row.links.push(item.link); evaluations.matched++; continue; }
    // No report module in the measured closure: unmatched when the closure
    // was read completely, otherwise it cannot be decided.
    if ((await closure(item.manifest, 0)).complete) evaluations.unmatched++;
    else evaluations.unreadable++;
  }

  const order = (left: Row, right: Row): number => left.anchor - right.anchor || compareUtf8(left.revision, right.revision) || compareUtf8(left.entrypoint, right.entrypoint);
  const sorted = rows.sort(order);
  const kept = sorted.slice(Math.max(0, sorted.length - bounds.maxEntrypoints));
  let omittedEvaluations = 0;
  const entrypoints: SourceDependencyApplicationEntrypoint[] = kept.map(row => {
    const links = row.links.sort((left, right) => left.parentSequence - right.parentSequence || compareUtf8(left.evaluation, right.evaluation));
    omittedEvaluations += Math.max(0, links.length - bounds.maxEvaluations);
    return {
      revision: row.revision, entrypoint: row.entrypoint, manifest: row.manifest, root: row.root, complete: row.complete, current: row.current, activation: row.activation,
      evaluations: links.slice(Math.max(0, links.length - bounds.maxEvaluations)),
    };
  });
  const linksFor = (digest: Digest): number[] => kept.flatMap((row, index) => row.modules.has(digest) ? [index] : []);
  return {
    name, head: head.digest, verification: "digest-bound", entrypoints,
    modules: structure.modules.map(digest => ({ manifestDigest: digest, entrypoints: linksFor(digest) })),
    occurrences: structure.occurrences.map(occurrence => ({ path: occurrence.path, entrypoints: linksFor(occurrence.manifestDigest) })),
    counts: { states: states.length, revisions: counts, evaluations, evidence, manifests },
    omitted: { entrypoints: sorted.length - kept.length, evaluations: omittedEvaluations },
  };
}
