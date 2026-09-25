import { manifestToJson, type OrganismManifest } from "./contract";
import { digestCanonical, type Digest } from "./digest";
import type { Executor } from "./effects";
import { AlgalError } from "./errors";
import {
  FOUNDRY_BOUNDS,
  evaluateFoundryPopulation,
  foundryReportRuns,
  generateFoundryCandidates,
  runFoundryWithin,
  type FoundryCase,
  type FoundryLineage,
  type FoundryReport,
  type FoundryScorer,
  type FoundrySelection,
} from "./foundry";
import { HabitatAccount, habitatBindingMismatches, type HabitatBudget, type HabitatLedger } from "./habitat-budget";
import type { FnRegistry } from "./registry";
import type { Store } from "./store-contract";
import type { Transport } from "./transport-contract";
import type { ToolRegistry } from "./tools";
import type { JsonValue } from "./values";

export const SEARCH_CONTRACT = "algal.search.v1" as const;

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
  /** The complete `algal.habitat-budget.v1` account every run of the search
   * was admitted through, when the search ran under a habitat budget. */
  budget?: HabitatBudget;
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
  tools?: ToolRegistry;
  scorer?: FoundryScorer;
  /** Habitat account for the whole search: every generator run, every
   * candidate's selection runs in every generation, and the final epoch's
   * selection and holdout runs. A refused reservation stops the search with
   * `BUDGET_EXHAUSTED` and leaves the terminal record on the account. The
   * report embeds a standalone `HabitatAccount`; a schedule's shared account
   * stays in the schedule record. */
  account?: HabitatLedger;
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
      usage: candidate.usage,
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

/** The runs a search report records, in admission order: for each
 * generation its generator run and then each candidate's selection runs,
 * followed by the final epoch's selection and holdout runs. The final
 * report's lineage names the last generator run, which is listed once. */
export function searchReportRuns(
  report: Pick<SearchReport, "generations" | "result">,
): { manifest: Digest; receipt: Digest }[] {
  return [
    ...report.generations.flatMap((generation) => [
      { manifest: generation.generatorDigest, receipt: generation.receiptDigest },
      ...generation.candidates.flatMap((candidate) =>
        candidate.cases.map((c) => ({ manifest: candidate.manifestDigest, receipt: c.receiptDigest }))),
    ]),
    ...foundryReportRuns({ candidates: report.result.candidates, promoted: report.result.promoted, holdout: report.result.holdout }),
  ];
}

export async function runFoundrySearch(opts: SearchOptions): Promise<SearchReport> {
  if (!Number.isInteger(opts.maxGenerations) || opts.maxGenerations < 1 || opts.maxGenerations > SEARCH_BOUNDS.maxGenerations) {
    throw new AlgalError("PARSE_FAILED", `search maxGenerations must be 1..${SEARCH_BOUNDS.maxGenerations}`);
  }
  if (opts.account && opts.account.activity !== "search") {
    throw new AlgalError("PARSE_FAILED", "a search runs under a search habitat account");
  }
  const account = opts.account ? { account: opts.account } : {};
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
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...account,
    });
    const population = dedupe([...survivors, ...generated.candidates]);
    if (population.length > FOUNDRY_BOUNDS.maxCandidates) {
      throw new AlgalError("BUDGET_EXHAUSTED", `search population exceeds ${FOUNDRY_BOUNDS.maxCandidates}`);
    }
    prior = await evaluateFoundryPopulation({
      candidates: population,
      cases: opts.cases,
      fns: opts.fns,
      store: opts.store,
      executors: opts.executors,
      ...(opts.transports ? { transports: opts.transports } : {}),
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(opts.scorer ? { scorer: opts.scorer } : {}),
      ...account,
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
  // The final epoch is charged to the search's account; its report never
  // embeds one.
  const result = await runFoundryWithin({
    candidates: finalPopulation,
    cases: opts.cases,
    fns: opts.fns,
    store: opts.store,
    executors: opts.executors,
    ...(opts.transports ? { transports: opts.transports } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.scorer ? { scorer: opts.scorer } : {}),
    lineage: {
      generatorDigest: last.generatorDigest,
      receiptDigest: last.receiptDigest,
    },
    ...account,
  });
  const base = {
    contract: SEARCH_CONTRACT,
    generatorDigest: digestCanonical(manifestToJson(opts.generator)),
    generations,
    result,
  };
  if (opts.account instanceof HabitatAccount) {
    const budget = opts.account.record();
    // The account must hold exactly this report's runs; anything else is a
    // host wiring error, and the report would not verify.
    const mismatches = habitatBindingMismatches(budget, "search", searchReportRuns(base));
    if (mismatches.length) throw new AlgalError("INTERNAL", `search habitat budget: ${mismatches.join("; ")}`);
    const budgeted = { ...base, budget };
    return { ...budgeted, digest: digestCanonical(budgeted as unknown as JsonValue) };
  }
  return { ...base, digest: digestCanonical(base as unknown as JsonValue) };
}
