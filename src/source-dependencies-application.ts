// Application revision links for a source dependency report. One
// application's validated history is read through a caller-supplied reader:
// each module and occurrence is linked to the revision entrypoints whose
// recorded static closure contains its executable digest, to the evaluation
// records that measured such an entrypoint, and to the transition that
// activated each revision. With `episodes`, each settled `start-episode`
// dispatch is also followed through its result, outcome record, and run
// receipt to count that receipt's recorded invocations against every report
// occurrence whose digest the episode's program contains. Matching uses
// digests from recorded evidence only, never names. Evaluations are not
// replayed; records that cannot be read, parsed, or bound are counted rather
// than guessed. The join is presentation-only and writes nothing.
import { parseApplicationEvaluation, parseApplicationEvaluationRequest } from "./application-adaptation";
import { parseApplicationComparison } from "./application-comparison";
import {
  APPLICATION_LIMITS, applicationId, applicationJson, applicationObject, applicationRef, applicationTag,
  parseApplicationRevision, parseApplicationState, parseApplicationTransition, parseWorkIntent,
  type ApplicationRevision, type ApplicationState, type ApplicationTransition, type EpisodeBinding, type WorkIntent,
} from "./application-contract";
import { applicationProcessName, type ApplicationDispatch, type ApplicationSnapshot } from "./application-core";
import { parseApplicationExperiment } from "./application-experiment";
import { manifestToJson, type OrganismManifest } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { COMPILE_BOUNDS } from "./graph";
import { parseRunReceipt, RECEIPT_BOUNDS, receiptDigest, type RunOutcome, type RunReceipt } from "./run";
import type { Store } from "./store-contract";
import { compareUtf8 } from "./utf8";
import type { JsonValue } from "./values";

export const SOURCE_DEPENDENCY_APPLICATION_BOUNDS = Object.freeze({
  /** Records read beyond validated history: transition evidence, evaluation
   * records and their requests, candidate revisions, episode intents and
   * dispatch chains, receipts, and manifests outside the report. A join that
   * needs more is refused. */
  maxRecords: 4_096,
  /** Revision entrypoint rows kept; the latest are kept and the rest counted. */
  maxEntrypoints: 64,
  /** Evaluation links kept per row; the latest are kept and the rest counted. */
  maxEvaluations: 16,
  /** Settled episode dispatches whose evidence chain is read; the latest are
   * kept and the rest counted. */
  maxEpisodes: 64,
  /** Recorded invocation counts kept per occurrence. */
  maxCountsPerOccurrence: 16,
  /** Static sites of one episode program: the compiler's instance limit. */
  maxEpisodeSites: COMPILE_BOUNDS.maxInstances,
  /** Static nesting followed through manifests outside the report. */
  maxClosureDepth: COMPILE_BOUNDS.maxDepth,
});

export interface SourceDependencyApplicationReader {
  /** Validated retained history in genesis-to-head order, as
   * `ApplicationCore.history` returns it. The join checks every digest binding
   * again, so a reader cannot substitute a state, transition, or revision. */
  history(application: string): Promise<readonly ApplicationSnapshot[]>;
  /** One retained dispatch record for a committed intent, as
   * `ApplicationCore.readDispatch` returns it: bound to the intent, the
   * source state, and the snapshot's revision, or null when none was
   * recorded. Without it every episode is counted as unreadable. */
  readDispatch?(application: string, intent: Digest, work: WorkIntent, snapshot: ApplicationSnapshot): Promise<ApplicationDispatch | null>;
  readonly store: Pick<Store, "getValue" | "getManifest"> & { readonly getReceipt?: Store["getReceipt"] };
}
export type SourceDependencyApplicationOptions = {
  readonly name: string;
  readonly reader: SourceDependencyApplicationReader;
  /** Also attribute recorded invocations of settled episode dispatches to
   * every report occurrence whose digest the episode's program contains. */
  readonly episodes?: boolean;
};

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
/** One settled episode dispatch whose evidence chain was followed, in the
 * order its intents were committed (state, then intent ordinal). */
export type SourceDependencyApplicationEpisode = {
  /** The committed `start-episode` intent digest: the dispatch's outbox key. */
  readonly intent: Digest;
  /** Sequence of the state whose transition committed the intent. */
  readonly source: number;
  /** Index into `application.entrypoints` of the revision entrypoint the
   * binding ran, or null when that entrypoint's row was not kept. */
  readonly entrypoint: number | null;
  /** Digest of the `algal.episode-outcome.v2` record the settled result
   * names, or null when it names none or the record could not be bound. */
  readonly outcome: Digest | null;
  /** Digest of the run receipt the outcome names, or null when the chain
   * could not be read and bound to the episode binding. */
  readonly receipt: Digest | null;
  /** The receipt's recorded run outcome, or null when no receipt was bound. */
  readonly run: RunOutcome | null;
  /** Recorded cells in a bound receipt that no static site of the episode's
   * program owns — paths under a `spawn` or any foreign shape. Nothing is
   * guessed for them. */
  readonly unresolved: number;
};
/** One receipt's recorded invocation count for a call site of one settled
 * episode, contributed to every report occurrence sharing the site's
 * executable digest. */
export type SourceDependencyApplicationEpisodeCount = {
  /** Index into `application.episodes.dispatches`. */
  readonly dispatch: number;
  /** The call site inside that episode's program: composition cell IDs from
   * its root, equal to this occurrence's path when the episode ran it. */
  readonly site: readonly string[];
  /** Distinct recorded invocations of that site in the episode's receipt. */
  readonly invocations: number;
  /** Most invocations the episode's program allows that site: enclosing
   * `each` and `repeat` limits multiplied, saturated at the receipt cell
   * limit like the invocation estimate. */
  readonly bound: number;
  /** Present when the recorded count exceeds the bound: an inconsistency
   * between the receipt and the program it claims to have run. */
  readonly exceeded?: true;
};
export type SourceDependencyApplicationEpisodes = {
  /** `start-episode` intents read from validated history. */
  readonly intents: number;
  /** Intents whose dispatch record was bound and settled. */
  readonly settled: number;
  /** Intents with no dispatch record, or one that has not settled. */
  readonly unsettled: number;
  /** Evidence that could not be read, parsed, or bound: the intent, dispatch,
   * result, outcome, or receipt record, or a manifest in the episode's
   * program. Counted per failure rather than guessed. */
  readonly unreadable: number;
  /** The latest settled dispatches, at most `maxEpisodes`. */
  readonly dispatches: readonly SourceDependencyApplicationEpisode[];
  /** Settled dispatches beyond `maxEpisodes`, counted but not read further. */
  readonly omitted: number;
  /** Settled-dispatch sites whose recorded count exceeded the site's bound:
   * an inconsistency between the receipt and the program it claims to have
   * run, reported rather than hidden. */
  readonly exceeded: number;
};
export type SourceDependencyApplicationOccurrenceLinks = {
  readonly path: readonly string[];
  readonly entrypoints: readonly number[];
  /** With `episodes: true`: one row per counted call site of a settled
   * episode whose program contains this occurrence's digest. */
  readonly episodes?: readonly SourceDependencyApplicationEpisodeCount[];
  /** Contribution rows dropped by `maxCountsPerOccurrence`. */
  readonly episodesOmitted?: number;
};
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
  /** Present when requested with `episodes: true`. */
  readonly episodes?: SourceDependencyApplicationEpisodes;
  readonly counts: {
    readonly states: number;
    /** Distinct revisions examined: selected by a state or measured by an evaluation record. */
    readonly revisions: { readonly matched: number; readonly unmatched: number; readonly unresolved: number };
    /** Distinct evaluation records cited by transition evidence, directly or through a comparison or experiment. */
    readonly evaluations: { readonly matched: number; readonly unmatched: number; readonly unreadable: number };
    readonly evidence: { readonly examined: number; readonly unreadable: number };
    /** Manifests outside the report read to follow a closure or episode program. */
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
type State = { readonly digest: Digest; readonly state: ApplicationState; readonly transition: ApplicationTransition; readonly revision: ApplicationRevision; readonly revisionDigest: Digest; readonly transitionDigest: Digest };
type Link = SourceDependencyApplicationEvaluation;
const invalid = (message: string): never => { throw new AlgalError("PARSE_FAILED", `source dependencies: ${message}`); };

/** Read the options once, synchronously, before any await. */
export function captureSourceDependencyApplication(value: unknown): SourceDependencyApplicationOptions {
  if (value === null || typeof value !== "object") return invalid("application options must be an object");
  const name: unknown = (value as { name?: unknown }).name;
  const reader: unknown = (value as { reader?: unknown }).reader;
  const episodes: unknown = (value as { episodes?: unknown }).episodes;
  try { applicationId(name); } catch { return invalid("application name must match ^[a-z][a-z0-9._-]{0,63}$"); }
  if (episodes !== undefined && typeof episodes !== "boolean") return invalid("application episodes must be a boolean");
  if (reader === null || typeof reader !== "object") return invalid("application reader must be an object");
  const history: unknown = (reader as { history?: unknown }).history;
  const store: unknown = (reader as { store?: unknown }).store;
  if (typeof history !== "function" || store === null || typeof store !== "object") return invalid("application reader needs history() and a store");
  const getValue: unknown = (store as { getValue?: unknown }).getValue;
  const getManifest: unknown = (store as { getManifest?: unknown }).getManifest;
  if (typeof getValue !== "function" || typeof getManifest !== "function") return invalid("application store needs getValue() and getManifest()");
  const getReceipt: unknown = (store as { getReceipt?: unknown }).getReceipt;
  const readDispatch: unknown = (reader as { readDispatch?: unknown }).readDispatch;
  // Optional members are assigned after construction so absent values stay
  // absent under exactOptionalPropertyTypes.
  const captured: {
    name: string;
    episodes?: boolean;
    reader: {
      history: SourceDependencyApplicationReader["history"];
      readDispatch?: NonNullable<SourceDependencyApplicationReader["readDispatch"]>;
      store: Pick<Store, "getValue" | "getManifest"> & { getReceipt?: Store["getReceipt"] };
    };
  } = {
    name: name as string,
    reader: {
      history: application => (history as SourceDependencyApplicationReader["history"]).call(reader, application),
      store: {
        getValue: digest => (getValue as Store["getValue"]).call(store, digest),
        getManifest: digest => (getManifest as Store["getManifest"]).call(store, digest),
      },
    },
  };
  if (episodes !== undefined) captured.episodes = episodes as boolean;
  if (typeof readDispatch === "function") {
    captured.reader.readDispatch = (application, intent, work, snapshot) =>
      (readDispatch as NonNullable<SourceDependencyApplicationReader["readDispatch"]>).call(reader, application, intent, work, snapshot);
  }
  if (typeof getReceipt === "function") {
    captured.reader.store.getReceipt = digest => (getReceipt as Store["getReceipt"]).call(store, digest);
  }
  return captured;
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
      states.push({ digest, state, transition, revision, revisionDigest, transitionDigest });
    } catch {
      throw new AlgalError("DIGEST_MISMATCH", `source dependencies: application history is not a validated chain at state ${index}`);
    }
  }
  return states;
}

const EPISODE_ITEM = /^i(0|[1-9][0-9]*)$/;
const EPISODE_ROUND = /^r(0|[1-9][0-9]*)$/;
const DISPATCH_STATUSES: ReadonlySet<string> = new Set(["started", "settled", "blocked", "uncertain"]);
type EpisodeIntent = Extract<WorkIntent, { kind: "start-episode" }>;
/** One static call site in an episode's program: its path of composition cell
 * IDs, its executable digest, and the bound its enclosing `each` and `repeat`
 * item limits give its invocations per root run. */
type EpisodeSite = { readonly path: readonly string[]; readonly digest: Digest; readonly bound: number; readonly manifest: OrganismManifest };
type EpisodeProgram = { readonly sites: EpisodeSite[]; readonly indexByPath: ReadonlyMap<string, number> };

/** Recheck a dispatch record the reader claims is a settled episode: the
 * outbox row is not content-addressed, so the join repeats every binding the
 * dispatcher's admission enforced, including the identity digest over the
 * plan. "unsettled" is a readable record that is absent or not settled;
 * "unreadable" is one that cannot stand as evidence. */
function episodeDispatch(record: ApplicationDispatch, name: string, ref: Digest, work: EpisodeIntent, state: State): "unsettled" | "unreadable" | EpisodeBinding {
  try {
    if (!DISPATCH_STATUSES.has(record.status)) return "unreadable";
    if (record.status !== "settled") return "unsettled";
    if (record.contract !== "algal.application-dispatch.v1" || record.application !== name || record.intent !== ref || record.sourceState !== state.digest
      || record.result === null || record.plan.kind !== "episode") return "unreadable";
    if (record.identity !== digestCanonical(applicationJson({ contract: "algal.application-dispatch-identity.v1", application: name, intent: ref, plan: record.plan }))) return "unreadable";
    const b = record.plan.binding;
    const entry = state.revision.entrypoints.find(candidate => candidate.name === work.entrypoint);
    if (entry === undefined || b.application !== name || b.intent !== ref || b.sourceState !== state.digest || b.revision !== state.revisionDigest
      || b.memory !== state.state.memory || b.epoch !== state.state.epoch || b.entrypoint !== entry.name || b.manifest !== entry.manifest
      || b.arguments !== work.input || b.maxGenerations !== entry.maxGenerations || b.process !== applicationProcessName(name, ref)) return "unreadable";
    return b;
  } catch { return "unreadable"; }
}
/** A settled dispatch's result record: `readDispatch` checks the same binding
 * when it validates the outbox row; the join reads the record again for the
 * outcome reference it may carry. */
function parseEpisodeResult(value: unknown): { readonly binding: Digest; readonly process: string; readonly outcome: Digest | null } {
  const hasOutcome = value !== null && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "outcome");
  const found = applicationObject(value, hasOutcome ? ["kind", "binding", "process", "outcome"] : ["kind", "binding", "process"]);
  applicationTag(found.kind, "episode");
  return { binding: applicationRef(found.binding), process: applicationId(found.process), outcome: hasOutcome ? applicationRef(found.outcome) : null };
}
/** The `algal.episode-outcome.v2` record a settled result names. */
function parseEpisodeOutcome(value: unknown): { readonly binding: Digest; readonly processState: Digest; readonly receipt: Digest } {
  const found = applicationObject(value, ["contract", "binding", "processState", "receipt"]);
  applicationTag(found.contract, "algal.episode-outcome.v2");
  return { binding: applicationRef(found.binding), processState: applicationRef(found.processState), receipt: applicationRef(found.receipt) };
}
/** Distinct recorded invocation prefixes per site, matching item and round
 * markers by shape rather than by the cell's limit, so an out-of-range
 * recording counts above the site's bound instead of disappearing. Paths
 * that resolve to no site are counted unresolved rather than guessed. */
function episodeInvocations(receipt: RunReceipt, program: EpisodeProgram): { readonly invocations: number[]; readonly unresolved: number } {
  const prefixes = program.sites.map(() => new Set<string>());
  let unresolved = 0;
  for (const path of Object.keys(receipt.cells)) {
    const segments = path === "" ? [] : path.split("/");
    let index = 0;
    let cursor = 0;
    let resolved = false;
    while (cursor < segments.length) {
      const site = program.sites[index]!;
      const cell = site.manifest.cells.find(candidate => candidate.id === segments[cursor]);
      if (cell === undefined) break;
      cursor++;
      if (cursor === segments.length) { prefixes[index]!.add(segments.slice(0, cursor - 1).join("/")); resolved = true; break; }
      if (cell.kind !== "organism" && cell.kind !== "each" && cell.kind !== "repeat") break;
      const marker = cell.kind === "each" ? EPISODE_ITEM : cell.kind === "repeat" ? EPISODE_ROUND : undefined;
      if (marker !== undefined) {
        if (!marker.test(segments[cursor]!)) break;
        cursor++;
        if (cursor === segments.length) break;
      }
      const next = program.indexByPath.get([...site.path, cell.id].join("/"));
      if (next === undefined) break;
      index = next;
    }
    if (!resolved) unresolved++;
  }
  return { invocations: prefixes.map(set => set.size), unresolved };
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

  // Episode evidence: each settled start-episode dispatch in history is
  // followed through its result and outcome records to the run receipt it
  // binds, and the receipt's recorded invocations are counted against every
  // report occurrence whose digest appears in the episode program's sites.
  const episodeCounts = structure.occurrences.map(() => ({ list: [] as SourceDependencyApplicationEpisodeCount[], omitted: 0 }));
  let episodes: SourceDependencyApplicationEpisodes | undefined;
  if (options.episodes === true) {
    const tallies = { intents: 0, settled: 0, unsettled: 0, unreadable: 0, exceeded: 0 };
    type Candidate = { intent: Digest; source: number; ordinal: number; binding: EpisodeBinding; result: Digest };
    const candidates: Candidate[] = [];
    const readDispatch = reader.readDispatch;
    for (const [sequence, state] of states.entries()) {
      for (const ref of state.transition.intents) {
        const work = await read(ref, parseWorkIntent);
        if (work === undefined || work.application !== name || work.operation !== state.transition.operation) { tallies.unreadable++; continue; }
        if (work.kind !== "start-episode") continue;
        tallies.intents++;
        if (readDispatch === undefined) { tallies.unreadable++; continue; }
        charge();
        let record: ApplicationDispatch | null;
        try {
          record = await readDispatch(name, ref, work, { digest: state.digest, state: state.state, transition: state.transition, revision: state.revision });
        } catch { tallies.unreadable++; continue; }
        if (record === null) { tallies.unsettled++; continue; }
        const binding = episodeDispatch(record, name, ref, work, state);
        if (binding === "unreadable") { tallies.unreadable++; continue; }
        if (binding === "unsettled") { tallies.unsettled++; continue; }
        tallies.settled++;
        candidates.push({ intent: ref, source: sequence, ordinal: work.ordinal, binding, result: record.result! });
      }
    }
    candidates.sort((left, right) => left.source - right.source || left.ordinal - right.ordinal);
    const scanned = candidates.slice(Math.max(0, candidates.length - bounds.maxEpisodes));
    const entrypointIndex = new Map(kept.map((row, index) => [row, index]));
    const reportDigests = new Set(structure.modules);
    const occurrenceIndices = new Map<Digest, number[]>();
    structure.occurrences.forEach((occurrence, index) => {
      const list = occurrenceIndices.get(occurrence.manifestDigest) ?? [];
      list.push(index);
      occurrenceIndices.set(occurrence.manifestDigest, list);
    });
    /** One charged read of a run receipt: missing, oversized, malformed,
     * rebound, or self-inconsistent records all yield undefined. */
    const readReceipt = async (reference: Digest): Promise<RunReceipt | undefined> => {
      if (store.getReceipt === undefined) return undefined;
      charge();
      try {
        const value = await store.getReceipt(reference);
        if (value === undefined) return undefined;
        const receipt = parseRunReceipt(value);
        if (digestCanonical(value) !== reference || receiptDigest(receipt) !== receipt.digest) return undefined;
        return receipt;
      } catch { return undefined; }
    };
    /** The static call sites of an episode program, expanded once per root
     * digest. Manifests outside the report are charged and digest-checked;
     * `spawn` cells and unreadable manifests simply leave no sites beneath
     * them. */
    const programs = new Map<Digest, EpisodeProgram>();
    const episodeManifests = new Map<Digest, OrganismManifest | undefined>();
    const expand = async (root: Digest): Promise<EpisodeProgram> => {
      const known = programs.get(root);
      if (known !== undefined) return known;
      const sites: EpisodeSite[] = [];
      const cap = RECEIPT_BOUNDS.maxCells;
      const visit = async (digest: Digest, path: readonly string[], bound: number, depth: number): Promise<void> => {
        if (sites.length >= bounds.maxEpisodeSites) return;
        let manifest = structure.manifests.get(digest);
        if (manifest === undefined) {
          if (!episodeManifests.has(digest)) {
            let found: OrganismManifest | undefined;
            if (depth <= bounds.maxClosureDepth) {
              manifests.examined++;
              charge();
              try {
                found = await store.getManifest(digest);
                if (found !== undefined && digestCanonical(manifestToJson(found)) !== digest) found = undefined;
              } catch { found = undefined; }
              if (found === undefined) manifests.unreadable++;
            }
            episodeManifests.set(digest, found);
          }
          manifest = episodeManifests.get(digest);
          if (manifest === undefined) return;
        }
        sites.push({ path, digest, bound, manifest });
        for (const cell of manifest.cells) {
          if (cell.kind !== "organism" && cell.kind !== "each" && cell.kind !== "repeat") continue;
          let child: Digest;
          try { child = asDigest(cell.manifest, `cell "${cell.id}".manifest`); } catch { continue; }
          const next = Math.min(bound * (cell.kind === "each" ? cell.maxItems : cell.kind === "repeat" ? cell.maxRounds : 1), cap);
          await visit(child, [...path, cell.id], next, depth + 1);
        }
      };
      await visit(root, [], 1, 0);
      const program = { sites, indexByPath: new Map(sites.map((site, index) => [site.path.join("/"), index])) };
      programs.set(root, program);
      return program;
    };
    const dispatches: SourceDependencyApplicationEpisode[] = [];
    for (const candidate of scanned) {
      const row = rowFor.get(key(candidate.binding.revision, candidate.binding.entrypoint));
      const dispatch = {
        intent: candidate.intent, source: candidate.source,
        entrypoint: row === undefined ? null : (entrypointIndex.get(row) ?? null),
        outcome: null as Digest | null, receipt: null as Digest | null, run: null as RunOutcome | null, unresolved: 0,
      };
      dispatches.push(dispatch);
      const index = dispatches.length - 1;
      const bindingDigest = digestCanonical(applicationJson(candidate.binding));
      const result = await read(candidate.result, parseEpisodeResult);
      if (result === undefined || result.binding !== bindingDigest || result.process !== candidate.binding.process) { tallies.unreadable++; continue; }
      if (result.outcome === null) continue;
      const outcome = await read(result.outcome, parseEpisodeOutcome);
      if (outcome === undefined || outcome.binding !== bindingDigest) { tallies.unreadable++; continue; }
      dispatch.outcome = result.outcome;
      const receipt = await readReceipt(outcome.receipt);
      if (receipt === undefined || receipt.manifestDigest !== candidate.binding.manifest || digestCanonical(receipt.args) !== candidate.binding.arguments) { tallies.unreadable++; continue; }
      dispatch.receipt = outcome.receipt;
      dispatch.run = receipt.outcome;
      const program = await expand(candidate.binding.manifest);
      const counted = episodeInvocations(receipt, program);
      dispatch.unresolved = counted.unresolved;
      program.sites.forEach((site, siteIndex) => {
        if (!reportDigests.has(site.digest)) return;
        const count = counted.invocations[siteIndex]!;
        const exceeded = count > site.bound;
        if (exceeded) tallies.exceeded++;
        for (const occurrence of occurrenceIndices.get(site.digest) ?? []) {
          const bucket = episodeCounts[occurrence]!;
          if (bucket.list.length >= bounds.maxCountsPerOccurrence) { bucket.omitted++; continue; }
          bucket.list.push({ dispatch: index, site: site.path, invocations: count, bound: site.bound, ...(exceeded ? { exceeded: true as const } : {}) });
        }
      });
    }
    episodes = {
      intents: tallies.intents, settled: tallies.settled, unsettled: tallies.unsettled, unreadable: tallies.unreadable,
      dispatches, omitted: candidates.length - scanned.length, exceeded: tallies.exceeded,
    };
  }
  return {
    name, head: head.digest, verification: "digest-bound", entrypoints,
    modules: structure.modules.map(digest => ({ manifestDigest: digest, entrypoints: linksFor(digest) })),
    occurrences: structure.occurrences.map((occurrence, index) => {
      const links = { path: occurrence.path, entrypoints: linksFor(occurrence.manifestDigest) };
      if (episodes === undefined) return links;
      const bucket = episodeCounts[index]!;
      return { ...links, episodes: bucket.list, ...(bucket.omitted > 0 ? { episodesOmitted: bucket.omitted } : {}) };
    }),
    ...(episodes === undefined ? {} : { episodes }),
    counts: { states: states.length, revisions: counts, evaluations, evidence, manifests },
    omitted: { entrypoints: sorted.length - kept.length, evaluations: omittedEvaluations },
  };
}
