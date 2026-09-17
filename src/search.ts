import { manifestToJson, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { MorphogenError } from "./errors";
import {
  FOUNDRY_BOUNDS,
  evaluateFoundryPopulation,
  generateFoundryCandidates,
  runFoundry,
  type FoundryCase,
  type FoundryLineage,
  type FoundryReport,
  type FoundrySelection,
} from "./foundry";
import type { FnRegistry } from "./registry";
import type { Store } from "./store";
import type { Transport } from "./transport";
import type { JsonValue } from "./values";

export const SEARCH_CONTRACT = "morphogen.search.v1" as const;

export const SEARCH_BOUNDS = {
  maxGenerations: 8,
} as const;

export type SearchGeneration = FoundryLineage & FoundrySelection & {
  generation: number;
  proposed: Digest[];
};

export type SearchReport = {
  contract: typeof SEARCH_CONTRACT;
  generatorDigest: Digest;
  generations: SearchGeneration[];
  result: FoundryReport;
  digest: Digest;
};

export type SearchOptions = {
  generator: OrganismManifest;
  generatorArgs: Record<string, JsonValue>;
  feedbackInput?: string;
  output: string;
  field?: string;
  seeds?: OrganismManifest[];
  cases: FoundryCase[];
  maxGenerations: number;
  fns: FnRegistry;
  store: Store;
  executors: Executor[];
  transports?: Record<string, Transport>;
};

function feedback(generation: number, selection?: FoundrySelection): JsonValue {
  if (!selection) return null;
  return {
    generation,
    promoted: selection.promoted,
    candidates: selection.candidates.map((candidate) => ({
      manifestDigest: candidate.manifestDigest,
      manifestKey: candidate.manifestKey,
      train: candidate.train,
      validation: candidate.validation,
      work: candidate.work,
    })),
  };
}

function dedupe(candidates: OrganismManifest[]): OrganismManifest[] {
  const seen = new Set<Digest>();
  return candidates.filter((candidate) => {
    const digest = digestCanonical(manifestToJson(candidate));
    if (seen.has(digest)) return false;
    seen.add(digest);
    return true;
  });
}

export async function runFoundrySearch(opts: SearchOptions): Promise<SearchReport> {
  if (!Number.isInteger(opts.maxGenerations) || opts.maxGenerations < 1 || opts.maxGenerations > SEARCH_BOUNDS.maxGenerations) {
    throw new MorphogenError("PARSE_FAILED", `search maxGenerations must be 1..${SEARCH_BOUNDS.maxGenerations}`);
  }
  let survivors = dedupe(opts.seeds ?? []);
  let prior: FoundrySelection | undefined;
  const generations: SearchGeneration[] = [];
  for (let generation = 0; generation < opts.maxGenerations; generation++) {
    const args = {
      ...opts.generatorArgs,
      ...(opts.feedbackInput ? { [opts.feedbackInput]: feedback(generation, prior) } : {}),
    };
    const generated = await generateFoundryCandidates({
      generator: opts.generator,
      args,
      output: opts.output,
      ...(opts.field ? { field: opts.field } : {}),
      fns: opts.fns,
      store: opts.store,
      executors: opts.executors,
      ...(opts.transports ? { transports: opts.transports } : {}),
    });
    const population = dedupe([...survivors, ...generated.candidates]);
    if (population.length > FOUNDRY_BOUNDS.maxCandidates) {
      throw new MorphogenError("BUDGET_EXHAUSTED", `search population exceeds ${FOUNDRY_BOUNDS.maxCandidates}`);
    }
    prior = await evaluateFoundryPopulation({
      candidates: population,
      cases: opts.cases,
      fns: opts.fns,
      store: opts.store,
      executors: opts.executors,
      ...(opts.transports ? { transports: opts.transports } : {}),
    });
    generations.push({
      generation,
      generatorDigest: generated.generatorDigest,
      receiptDigest: generated.receiptDigest,
      proposed: generated.candidates.map((candidate) => digestCanonical(manifestToJson(candidate))),
      ...prior,
    });
    survivors = population.filter(
      (candidate) => digestCanonical(manifestToJson(candidate)) === prior!.promoted,
    );
  }
  const last = generations.at(-1)!;
  const finalPopulation = dedupe([
    ...survivors,
    ...(await Promise.all(last.proposed.map(async (digest) => opts.store.getManifest(digest))))
      .filter((candidate): candidate is OrganismManifest => candidate !== undefined),
  ]);
  const result = await runFoundry({
    candidates: finalPopulation,
    cases: opts.cases,
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
    lineage: {
      generatorDigest: last.generatorDigest,
      receiptDigest: last.receiptDigest,
    },
  });
  const base = {
    contract: SEARCH_CONTRACT,
    generatorDigest: digestCanonical(manifestToJson(opts.generator)),
    generations,
    result,
  };
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}
