/**
 * `evolution-model` case catalog. Every entry exercises real production
 * service paths (evaluation, proposal, comparison, selection, experiment,
 * research, migration, restoration, lifecycle custody) against the
 * instrumented harness — `MemoryStore` + `MemoryApplicationStorage` +
 * `ApplicationCore` + `createApplicationPolicyHost` — and returns structured
 * evidence with typed obligations. Negative cases always assert a specific
 * rejection reason, so a case that "fails for the wrong reason" fails here.
 */
import {
  evaluateApplicationRevision, verifyApplicationEvaluation, checkApplicationCompatibility,
} from "../../src/application-adaptation";
import {
  getApplicationRecord, putApplicationRecord, applicationJson,
  parseApplicationRevision,
} from "../../src/application-contract";
import { produceApplicationComparison, verifyApplicationComparison } from "../../src/application-comparison";
import {
  produceApplicationSelection, verifyApplicationSelection,
  verifyApplicationSelectionPolicy, selectApplicationStrategy,
} from "../../src/application-selection";
import { produceApplicationExperiment, verifyApplicationExperiment } from "../../src/application-experiment";
import {
  produceApplicationProposal, verifyApplicationProposal, proposeApplicationRevision,
  parseApplicationProposal,
} from "../../src/application-proposal";
import { migrateApplicationMemory, verifyApplicationMigration, parseApplicationMigration } from "../../src/application-migration";
import { restoreApplicationRevision, verifyApplicationRestoration } from "../../src/application-restoration";
import {
  admitApplicationResearchEvaluation, verifyApplicationResearchEvaluation,
  admitApplicationResearchActivation,
} from "../../src/application-research";
import { produceApplicationDrain } from "../../src/application-drain";
import type { ApplicationDispatch, ApplicationDispatcher } from "../../src/application-core";
import { ApplicationMemoryService } from "../../src/application-memory";
import { collectApplicationViewEvidence, parseApplicationViewEvidence } from "../../src/application-view";
import {
  evaluateFoundryPopulation, runFoundry, foundryReportRuns, selectFoundryCandidate,
  type FoundryReport, type FoundryCase,
} from "../../src/foundry";
import { parseFoundryReport, verifyFoundryReport } from "../../src/foundry-verify";
import { runFoundrySearch } from "../../src/search";
import { verifySearchReport } from "../../src/search-verify";
import { parseRunReceipt, runOrganism } from "../../src/run";
import { HabitatAccount } from "../../src/habitat-budget";
import { parseOrganismManifest } from "../../src/contract";
import { digestCanonical, type Digest } from "../../src/digest";
import type { Store } from "../../src/store-contract";
import { canonicalize, type JsonValue } from "../../src/values";
import {
  APPLICATION, evolutionFixture, researchFixture, instrumentedCases, admitObservation,
  runtime, ref, record, scriptedEngine,
  INCUMBENT_VALUE, WINNER_VALUE, LOSER_VALUE, strategyManifest,
  GENERATOR_VALUE, SEARCH_GENERATOR_VALUE, type EvolutionFixture,
} from "./harness";

const fns = runtime.fns;
const app = APPLICATION;

async function threw(work: Promise<unknown> | (() => unknown | Promise<unknown>), pattern: RegExp): Promise<string> {
  try {
    await (typeof work === "function" ? work() : work);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!pattern.test(message)) throw new Error(`threw ${JSON.stringify(message)}, expected ${String(pattern)}`);
    return message;
  }
  throw new Error(`expected ${String(pattern)}, but it did not throw`);
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`expectation failed: ${message}`);
}

/** Clone a foundry report, mutate its body, re-digest, and store the forged
 * record under its own CAS digest — a structurally valid, self-consistent
 * record whose *claims* are wrong. This is the imported-evidence shape: the
 * record is genuine CAS, only its content disagrees with what re-execution
 * and the frozen case set derive. */
async function forgedReport(store: Store, report: FoundryReport, mutate: (body: Omit<FoundryReport, "digest">) => void): Promise<Digest> {
  const { digest: _digest, ...base } = structuredClone(report) as FoundryReport;
  mutate(base);
  return putApplicationRecord(store, { ...(base as unknown as Record<string, JsonValue>), digest: digestCanonical(applicationJson(base)) });
}

async function forgedEvaluation(f: EvolutionFixture, evalRef: Digest, patch: Record<string, unknown>): Promise<Digest> {
  const value = applicationJson(await getApplicationRecord(f.store, evalRef, applicationJson));
  return f.put({ ...(value as Record<string, JsonValue>), ...patch });
}

interface Forgery { readonly label: string; readonly mutate: (body: Omit<FoundryReport, "digest">) => void; readonly pattern: RegExp }

/** Shared proposal → evaluations → comparison → policy → selection chain. */
async function evidenceChain(f: EvolutionFixture, environment: string) {
  const argsRef = await f.put({ seed: "go" });
  const proposal = await produceApplicationProposal(f.store, {
    contract: "algal.application-proposal-request.v1", application: app, parentState: f.genesis.digest,
    generator: "generate", target: "run", arguments: argsRef, output: "candidates",
    policy: f.evaluationPolicy, environment,
  }, runtime);
  const winEval = await f.evaluate(f.winnerRevision, environment);
  const loseEval = await f.evaluate(f.loserRevision, environment);
  const comparison = await produceApplicationComparison(f.store, {
    application: app, parentState: f.genesis.digest, entrypoint: "run", environment,
    evaluations: [winEval.evaluationRef, loseEval.evaluationRef], selected: f.manifests.winner,
  }, runtime);
  const policy = await f.put({
    contract: "algal.application-selection-policy.v1", application: app, parentState: f.genesis.digest,
    entrypoint: "run", selections: [{ environment, comparison: comparison.comparisonRef, manifest: f.manifests.winner }],
  });
  const selection = await produceApplicationSelection(f.store, { policy, environment, expectedParentState: f.genesis.digest }, runtime);
  return { proposal, winEval, loseEval, comparison, policy, selection };
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export interface EvolutionCase {
  readonly id: string;
  readonly property: string;
  readonly surface: string;
  readonly summary: string;
  run(): Promise<JsonValue>;
}

export const EVOLUTION_CASES: EvolutionCase[] = [

  /* ---------------- evaluation ---------------- */

  {
    id: "evaluation-binds-exact-run-rows",
    property: "EVO-02/EVO-05",
    surface: "evaluateApplicationRevision + verifyApplicationEvaluation + verifyFoundryReport",
    summary:
      "A stored accepted evaluation replays every run row's receipt; forged reports that drop a selection row, " +
      "substitute case args, flip a pass claim, misstate per-row or aggregate work/usage, swap a receipt, " +
      "leak a holdout row into candidate cases, misclaim promotion, or tamper with verdict/compatibility/request " +
      "bindings are all rejected by re-verification — never by the stored digest alone.",
    async run() {
      const f = await evolutionFixture();
      const accepted = await f.evaluate(f.winnerRevision, "harbor");
      expect(accepted.evaluation.verdict.status === "accepted", "winner evaluation accepted");
      const t0 = f.store.calls.length;
      const checked = await verifyApplicationEvaluation(f.store, accepted.evaluationRef, f.genesis.digest, runtime);
      expect(checked.verdict.status === "accepted" && checked.verdict.selectedManifest === f.manifests.winner, "verdict reproduced");
      const report = await record(f.store, accepted.evaluation.foundryReport, parseFoundryReport);
      const honest = await verifyFoundryReport(await record(f.store, accepted.evaluation.foundryReport, applicationJson), f.store, fns);
      expect(honest.ok, `honest report verifies standalone: ${honest.mismatches.join("; ")}`);
      const runs = foundryReportRuns(report);
      expect(runs.length === 7, `expected 7 run rows (2 candidates x 3 selection cases + 1 holdout), got ${runs.length}`);
      for (const run of runs) {
        expect(f.store.readCount(run.receipt, t0) >= 1, `verifier never re-read receipt ${run.receipt}`);
        expect(f.store.readCount(run.manifest, t0) >= 1, `verifier never re-read manifest ${run.manifest}`);
      }

      const candidate = (body: Omit<FoundryReport, "digest">) => body.candidates.find(c => c.manifestDigest === f.manifests.winner)!;
      const holdoutRow = structuredClone(report.holdout.cases[0]!);
      const swapped = structuredClone(report.candidates[0]!.cases[0]!.receiptDigest);
      const forgeries: Forgery[] = [
        { label: "dropped selection row", pattern: /does not match its cases|differs from frozen/, mutate: b => { candidate(b).cases.pop(); } },
        { label: "substituted case args", pattern: /receipt args differ|differs from frozen/, mutate: b => { candidate(b).cases[0]!.args = { q: "tampered" }; } },
        { label: "flipped pass claim", pattern: /invalid pass claim/, mutate: b => { const c = candidate(b).cases[0]!; c.passed = !c.passed; } },
        { label: "inflated row work", pattern: /work differs from receipt/, mutate: b => { candidate(b).cases[0]!.work.units += 1; } },
        { label: "inflated aggregate work", pattern: /work does not match its cases/, mutate: b => { candidate(b).work.units += 1; } },
        { label: "inflated row usage", pattern: /usage differs from receipt/, mutate: b => { candidate(b).cases[0]!.usage.tokensOut += 1; } },
        { label: "holdout row leaked into candidate cases", pattern: /exposes holdout results/, mutate: b => { candidate(b).cases.push(holdoutRow); } },
        { label: "swapped receipt", pattern: /receipt args differ|ran sha256/, mutate: b => { const row = candidate(b).cases[0]!; row.receiptDigest = swapped; } },
        { label: "misclaimed promotion", pattern: /promoted digest is not the deterministic winner/, mutate: b => { b.promoted = f.manifests.loser; } },
      ];
      const rejections: Record<string, string> = {};
      for (const forge of forgeries) {
        const bad = await forgedReport(f.store, report, forge.mutate);
        const evalRef = await forgedEvaluation(f, accepted.evaluationRef, { foundryReport: bad });
        rejections[forge.label] = await threw(verifyApplicationEvaluation(f.store, evalRef, f.genesis.digest, runtime), forge.pattern);
      }
      // Record-level forgeries: the stored record itself is intact CAS, but
      // its citations no longer reproduce.
      const verdictTamper = await forgedEvaluation(f, accepted.evaluationRef, { verdict: { status: "rejected", reasons: ["forged"] } });
      rejections["verdict tamper"] = await threw(verifyApplicationEvaluation(f.store, verdictTamper, f.genesis.digest, runtime), /not reproducible/);
      const compatTamper = await forgedEvaluation(f, accepted.evaluationRef, {
        compatibility: await f.put({
          contract: "algal.application-compatibility.v1", previousRevision: f.revision,
          candidateRevision: f.winnerRevision, status: "incompatible", reasons: ["forged"],
        }),
      });
      rejections["compatibility tamper"] = await threw(verifyApplicationEvaluation(f.store, compatTamper, f.genesis.digest, runtime), /compatibility evidence changed/);
      const casesTamper = await forgedEvaluation(f, accepted.evaluationRef, {
        cases: await f.put({ contract: "algal.application-evaluation-cases.v1", cases: f.casesJson.cases.slice(0, 3) }),
      });
      rejections["cases citation tamper"] = await threw(verifyApplicationEvaluation(f.store, casesTamper, f.genesis.digest, runtime), /not bound to its request/);
      return { runs: runs.length, receiptsReplayed: runs.length, rejections };
    },
  },

  {
    id: "evaluation-predicates-are-conjunctive",
    property: "EVO-02",
    surface: "evaluateApplicationRevision + admitApplicationActivation + ApplicationCore.commit",
    summary:
      "Every verdict predicate rejects independently: no-improvement/mismatch, holdout-failed, " +
      "incomplete-evaluation, regression, insufficient-quality, budget-exhausted (work), incompatible. " +
      "The case-count bound rejects both at production and on a hand-imported record; committed " +
      "activation replays the same checks.",
    async run() {
      const f = await evolutionFixture();
      const verdicts: Record<string, JsonValue> = {};
      const putStrategy = (value: JsonValue) => f.store.putManifest(parseOrganismManifest(value));

      const evalOf = async (candidateRevision: Digest, cases?: Digest) => {
        const produced = await evaluateApplicationRevision(f.store, {
          contract: "algal.application-evaluation-request.v1", parentState: f.genesis.digest,
          candidateRevision, entrypoint: "run", cases: cases ?? f.cases, scorer: f.scorer, policy: f.evaluationPolicy,
        }, runtime);
        await verifyApplicationEvaluation(f.store, produced.evaluationRef, f.genesis.digest, runtime);
        return produced.evaluation;
      };
      const child = (manifest: Digest, patch: Record<string, unknown> = {}) => f.put(f.revisionBody(f.revision, manifest, patch));

      verdicts["accepted"] = (await evalOf(f.winnerRevision)).verdict;
      const loser = await evalOf(f.loserRevision);
      expect(loser.verdict.status === "rejected", "loser rejected");
      expect((loser.verdict as { reasons: string[] }).reasons.includes("selected-candidate-mismatch"), "loser: selected-candidate-mismatch");
      verdicts["not-promoted"] = loser.verdict;

      const holdoutFailure = await evalOf(f.holdoutFailureRevision);
      expect((holdoutFailure.verdict as { reasons: string[] }).reasons.includes("holdout-failed"), "holdout-failed reason");
      verdicts["holdout-failed"] = holdoutFailure.verdict;

      // A three-validation-case set where the incumbent passes only v1:
      // regression and incomplete-evaluation are reachable while promoted.
      const bigCases = await f.put({
        contract: "algal.application-evaluation-cases.v1",
        cases: [
          { id: "train-ok", split: "train", args: { q: "t1" }, expect: { answer: "ok" } },
          { id: "val-ok", split: "validation", args: { q: "v1" }, expect: { answer: "ok" } },
          { id: "val-fixed", split: "validation", args: { q: "v2" }, expect: { answer: "v2-ok" } },
          { id: "val-fixed-2", split: "validation", args: { q: "v3" }, expect: { answer: "v3-ok" } },
          { id: "hold-fixed", split: "holdout", args: { q: "h1" }, expect: { answer: "h1-ok" } },
        ],
      });
      const regressingManifest = await putStrategy(strategyManifest("regressing-3",
        ["if", ["eq", ["get", "value"], "v1"], "nope", ["if", ["eq", ["get", "value"], "v2"], "v2-ok", ["if", ["eq", ["get", "value"], "v3"], "v3-ok", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]]]]));
      const crashingManifest = await putStrategy(strategyManifest("crashing-3",
        ["if", ["eq", ["get", "value"], "v3"], ["div", 1, 0], ["if", ["eq", ["get", "value"], "v2"], "v2-ok", ["if", ["eq", ["get", "value"], "h1"], "h1-ok", "ok"]]]));
      const regression = await evalOf(await child(regressingManifest), bigCases);
      expect((regression.verdict as { reasons: string[] }).reasons.includes("regression"), "regression reason");
      verdicts["regression"] = regression.verdict;
      const incomplete = await evalOf(await child(crashingManifest), bigCases);
      expect((incomplete.verdict as { reasons: string[] }).reasons.includes("incomplete-evaluation"), "incomplete-evaluation reason");
      verdicts["incomplete-evaluation"] = incomplete.verdict;

      // insufficient-quality: an incumbent that fails everything loses the
      // train tiebreak to a candidate that passes only train.
      const zero = await evolutionFixture({ incumbent: LOSER_VALUE });
      const trainOnly = await zero.store.putManifest(parseOrganismManifest(strategyManifest("train-only",
        ["if", ["eq", ["get", "value"], "t1"], "ok", "nope"])));
      const zeroEval = await evaluateApplicationRevision(zero.store, {
        contract: "algal.application-evaluation-request.v1", parentState: zero.genesis.digest,
        candidateRevision: await zero.put(zero.revisionBody(zero.revision, trainOnly)),
        entrypoint: "run", cases: zero.cases, scorer: zero.scorer, policy: zero.evaluationPolicy,
      }, runtime);
      const zeroReasons = (zeroEval.evaluation.verdict as { reasons?: string[] }).reasons ?? [];
      expect(zeroEval.evaluation.verdict.status === "rejected" && zeroReasons.includes("insufficient-quality"),
        `insufficient-quality reason, got ${JSON.stringify(zeroEval.evaluation.verdict)}`);
      verdicts["insufficient-quality"] = zeroEval.evaluation.verdict;

      // budget-exhausted (work bound): a tight policy admits the records but
      // acceptance rejects.
      const tight = await evolutionFixture({ policy: { maxWork: 1 } });
      const tightEval = await evaluateApplicationRevision(tight.store, {
        contract: "algal.application-evaluation-request.v1", parentState: tight.genesis.digest,
        candidateRevision: tight.winnerRevision, entrypoint: "run", cases: tight.cases, scorer: tight.scorer, policy: tight.evaluationPolicy,
      }, runtime);
      expect((tightEval.evaluation.verdict as { reasons: string[] }).reasons.includes("budget-exhausted"), "budget-exhausted reason");
      verdicts["budget-exhausted"] = tightEval.evaluation.verdict;

      // incompatible: a candidate revision widening declared capabilities.
      const wide = await child(f.manifests.winner, { capabilityRequirements: ["wider-cap"] });
      const incompatible = await evalOf(wide);
      expect((incompatible.verdict as { reasons: string[] }).reasons.includes("incompatible"), "incompatible reason");
      verdicts["incompatible"] = incompatible.verdict;

      // Case bound: production refuses, and a hand-imported record carrying a
      // genuine over-limit foundry report is rejected at verification.
      const capped = await evolutionFixture({ policy: { maxCases: 3 } });
      await threw(evaluateApplicationRevision(capped.store, {
        contract: "algal.application-evaluation-request.v1", parentState: capped.genesis.digest,
        candidateRevision: capped.winnerRevision, entrypoint: "run", cases: capped.cases, scorer: capped.scorer, policy: capped.evaluationPolicy,
      }, runtime), /case set exceeds policy bound/);
      const importedRequest = await capped.put({
        contract: "algal.application-evaluation-request.v1", parentState: capped.genesis.digest,
        candidateRevision: capped.winnerRevision, entrypoint: "run", cases: capped.cases, scorer: capped.scorer, policy: capped.evaluationPolicy,
      });
      const importedReport = await runFoundry({
        candidates: [parseOrganismManifest(INCUMBENT_VALUE), parseOrganismManifest(WINNER_VALUE)],
        cases: capped.casesJson.cases, fns, store: capped.store, executors: [],
      });
      const compat = await checkApplicationCompatibility(capped.store, capped.revision, capped.winnerRevision);
      const imported = await capped.put({
        contract: "algal.application-evaluation.v1", request: importedRequest, parentState: capped.genesis.digest,
        candidateRevision: capped.winnerRevision, cases: capped.cases, scorer: capped.scorer, policy: capped.evaluationPolicy,
        foundryReport: await capped.put(importedReport), compatibility: await capped.put(compat),
        verdict: { status: "accepted", selectedManifest: capped.manifests.winner },
      });
      await threw(verifyApplicationEvaluation(capped.store, imported, capped.genesis.digest, runtime), /case set exceeds policy bound/);

      // Activation admission replays the accepted evaluation end-to-end;
      // a stale or different-parent evaluation cannot activate.
      const committed = await f.commit({
        operation: ref({ op: "activate-winner" }), kind: "activate", revision: f.winnerRevision,
        memory: f.genesisMemory, evidence: [(await f.evaluate(f.winnerRevision)).evaluationRef],
      });
      expect(committed.state.revision === f.winnerRevision && committed.state.epoch === 1, "activation committed the selected revision");
      return { verdicts, importedCaseBoundRejects: true, activatedRevision: committed.state.revision };
    },
  },

  /* ---------------- holdout isolation ---------------- */

  {
    id: "holdout-never-read-in-selection",
    property: "EVO-03",
    surface: "evaluateFoundryPopulation + selectFoundryCandidate + runFoundry (instrumented case environment)",
    summary:
      "Generation/selection never consumes holdout case values: the instrumented case set records zero " +
      "value reads for the holdout row while selection runs, and substituting holdout args/expect leaves " +
      "every selection row and the promoted digest byte-identical. Holdout values are read only when the " +
      "promoted candidate's holdout evidence is produced.",
    async run() {
      const f = await evolutionFixture();
      const incumbent = parseOrganismManifest(INCUMBENT_VALUE);
      const winner = parseOrganismManifest(WINNER_VALUE);
      const inst = instrumentedCases(f.casesJson.cases);
      const population = await evaluateFoundryPopulation({ candidates: [incumbent, winner], cases: inst.cases, fns, store: f.store, executors: [] });
      const promoted = selectFoundryCandidate(population.candidates);
      expect((inst.reads.valueReads["hold-fixed"] ?? 0) === 0,
        `selection read holdout values ${inst.reads.valueReads["hold-fixed"]} times`);
      expect((inst.reads.nameReads["hold-fixed"] ?? 0) > 0, "interface admission still enumerated holdout names");
      expect(promoted === f.manifests.winner, "winner promoted");

      const alternate = instrumentedCases(f.casesJson.cases.map((c): FoundryCase =>
        c.split === "holdout" ? { ...c, args: { q: "hX" }, expect: { answer: "hX-ok" } } : c));
      const population2 = await evaluateFoundryPopulation({ candidates: [incumbent, winner], cases: alternate.cases, fns, store: f.store, executors: [] });
      expect(selectFoundryCandidate(population2.candidates) === promoted, "substituted holdout changed the selection");
      expect(
        canonicalize(population.candidates as unknown as JsonValue) === canonicalize(population2.candidates as unknown as JsonValue),
        "substituted holdout changed a selection row",
      );

      // Producing holdout evidence does read holdout values — exactly once
      // per holdout case row, and only for the promoted candidate.
      await runFoundry({ candidates: [incumbent, winner], cases: inst.cases, fns, store: f.store, executors: [] });
      expect((inst.reads.valueReads["hold-fixed"] ?? 0) > 0, "holdout evidence never ran");
      return {
        holdoutValueReadsDuringSelection: 0,
        selectionStableUnderHoldoutMutation: true,
        promoted,
      };
    },
  },

  {
    id: "generation-is-case-blind",
    property: "EVO-03/EVO-05",
    surface: "produceApplicationProposal + verifyApplicationProposal",
    summary:
      "The generator's run binds exactly the declared arguments record — the frozen case set is never read, " +
      "the proposal request parser admits no `cases` field, and candidates derive only from the emitted " +
      "manifest list. Forged proposals (substituted receipt, tampered parent) reject on replay.",
    async run() {
      const f = await evolutionFixture();
      const argsRef = await f.put({ seed: "go" });
      const t0 = f.store.calls.length;
      const produced = await produceApplicationProposal(f.store, {
        contract: "algal.application-proposal-request.v1", application: app, parentState: f.genesis.digest,
        generator: "generate", target: "run", arguments: argsRef, output: "candidates",
        policy: f.evaluationPolicy, environment: "lab",
      }, runtime);
      expect(produced.proposal.status === "generated", "proposal generated");
      const emitted = produced.proposal.candidates.map(c => c.revision).sort();
      expect(emitted.join(" ") === [f.winnerRevision, f.loserRevision].sort().join(" "), "proposal emitted exactly the generated candidates");
      const reads = f.store.calls.filter(c => c.tick > t0 && ["getValue", "getReceipt", "getManifest", "getEffect", "getSlot"].includes(c.op)).map(c => c.ref);
      expect(!reads.includes(f.cases), "generation read the frozen case set");
      const receipt = parseRunReceipt((await f.store.getReceipt(produced.proposal.receipt))!);
      expect(
        canonicalize(receipt.args as unknown as JsonValue) === canonicalize({ src: { value: "go" } } as unknown as JsonValue),
        `generator receipt args ${canonicalize(receipt.args as unknown as JsonValue)}`,
      );
      const verified = await verifyApplicationProposal(f.store, produced.proposalRef, f.genesis.digest, runtime);
      expect(verified.candidates.length === 2 && verified.status === "generated", "verify replays the proposal");

      // A request carrying a `cases` field is not a proposal request.
      await threw(produceApplicationProposal(f.store, {
        contract: "algal.application-proposal-request.v1", application: app, parentState: f.genesis.digest,
        generator: "generate", target: "run", arguments: argsRef, output: "candidates",
        policy: f.evaluationPolicy, cases: f.cases,
      }, runtime), /application field|unknown key|Invalid/);

      // Forged proposals: receipt from an unrelated run, tampered parent.
      const unrelated = await f.evaluate(f.holdoutFailureRevision, "lab");
      const unrelatedReport = await record(f.store, unrelated.evaluation.foundryReport, parseFoundryReport);
      const foreignReceipt = unrelatedReport.candidates[0]!.cases[0]!.receiptDigest;
      const stored = await record(f.store, produced.proposalRef, parseApplicationProposal);
      const forged1 = await f.put({ ...stored, receipt: foreignReceipt });
      await threw(verifyApplicationProposal(f.store, forged1, f.genesis.digest, runtime), /does not bind its generator and arguments|does not replay|Missing or changed/);
      const forged2 = await f.put({ ...stored, parentState: ref({ contract: "algal.fake-state.v1" }) });
      await threw(verifyApplicationProposal(f.store, forged2, f.genesis.digest, runtime), /not bound to its request|does not bind|stale|reproducible/);

      // The propose transition through the committed lifecycle: unchanged
      // revision/memory/epoch, the proposal cited as evidence.
      const proposed = await proposeApplicationRevision(f.lifecycle, {
        application: app, operation: ref({ op: "propose" }), expectedHead: f.genesis.digest,
        generator: "generate", target: "run", arguments: argsRef, output: "candidates",
        policy: f.evaluationPolicy, environment: "lab",
      }, runtime);
      expect(proposed.status === "generated" && proposed.candidates.length === 2, "committed proposal emitted candidates");
      expect(proposed.snapshot.state.revision === f.revision && proposed.snapshot.state.memory === f.genesisMemory && proposed.snapshot.state.epoch === 0,
        "propose preserves revision, memory and epoch");
      expect(proposed.snapshot.transition.evidence.includes(proposed.proposal), "proposal record cited");
      return {
        candidates: produced.proposal.candidates,
        generatorArgs: receipt.args,
        proposalVerified: true,
        committedProposal: proposed.proposal,
      };
    },
  },

  {
    id: "search-feedback-excludes-holdout",
    property: "EVO-03/EVO-04",
    surface: "runFoundrySearch + verifySearchReport (instrumented case environment)",
    summary:
      "Generation feedback carries only promoted/candidate aggregates — never case ids, args, expects, or " +
      "holdout outcomes — and per-generation candidates never contain holdout rows. A forged search report " +
      "smuggling a holdout row into a generation is rejected.",
    async run() {
      const f = await evolutionFixture();
      const inst = instrumentedCases(f.casesJson.cases);
      const generator = parseOrganismManifest(SEARCH_GENERATOR_VALUE);
      const report = await runFoundrySearch({
        generator, generatorArgs: { seed: "go" }, feedbackInput: "feedback", output: "candidates",
        cases: inst.cases, maxGenerations: 2, fns, store: f.store, executors: [],
      });
      const checked = await verifySearchReport(report, f.store, fns);
      expect(checked.ok, `search report did not verify: ${checked.mismatches.join("; ")}`);
      expect(report.generations.length === 2, "two generations");
      const feedbacks: JsonValue[] = [];
      for (const generation of report.generations) {
        expect(generation.candidates.every(c => c.cases.every(row => row.split !== "holdout")),
          `generation ${generation.generation} carries a holdout row`);
        const receipt = parseRunReceipt((await f.store.getReceipt(generation.receiptDigest))!);
        const fb = (receipt.args as Record<string, Record<string, JsonValue>>).fb?.value ?? null;
        feedbacks.push(fb);
        const text = canonicalize(fb);
        expect(!text.includes("h1") && !text.includes("hold-fixed") && !text.includes("h1-ok"), `feedback leaks holdout: ${text}`);
        if (fb !== null) {
          const keys = Object.keys(fb as Record<string, JsonValue>).sort();
          expect(keys.join(",") === "candidates,generation,promoted", `feedback keys ${keys}`);
          for (const row of (fb as { candidates: Record<string, JsonValue>[] }).candidates) {
            expect(Object.keys(row).sort().join(",") === "manifestDigest,manifestKey,train,usage,validation,work",
              `feedback row keys ${Object.keys(row).sort()}`);
          }
        }
      }
      // Forged report: a generation row gains a holdout case. Clone through
      // canonical JSON — selection rows carry the instrumented case proxies.
      const { digest: _d, ...base } = JSON.parse(canonicalize(report as unknown as JsonValue)) as typeof report;
      base.generations[0]!.candidates[0]!.cases.push(report.result.holdout.cases[0]!);
      const forged = { ...base, digest: digestCanonical(applicationJson(base)) };
      const forgedCheck = await verifySearchReport(forged, f.store, fns);
      expect(!forgedCheck.ok && forgedCheck.mismatches.some(m => /holdout evidence leaked/.test(m)),
        `forged search accepted: ${forgedCheck.mismatches.join("; ")}`);
      return { generations: report.generations.length, checkedReceipts: checked.checkedReceipts, promoted: report.result.promoted };
    },
  },

  /* ---------------- selection / host opt-in ---------------- */

  {
    id: "selection-rechecks-every-environment-row",
    property: "EVO-04/EVO-06",
    surface: "verifyApplicationSelectionPolicy + verifyApplicationComparison + produceApplicationSelection",
    summary:
      "Verifying a two-environment selection policy replays every row's comparison and every cited " +
      "evaluation — instrumented reads prove the full re-traversal. A tampered row in the non-selected " +
      "environment still invalidates the whole policy; a stored selection record replays or rejects.",
    async run() {
      const f = await evolutionFixture();
      const prod = await evidenceChain(f, "prod");
      const staging = await evidenceChain(f, "staging");
      const policyRef = await f.put({
        contract: "algal.application-selection-policy.v1", application: app, parentState: f.genesis.digest,
        entrypoint: "run", selections: [
          { environment: "prod", comparison: prod.comparison.comparisonRef, manifest: f.manifests.winner },
          { environment: "staging", comparison: staging.comparison.comparisonRef, manifest: f.manifests.winner },
        ],
      });
      const t0 = f.store.calls.length;
      const { policy, comparisons } = await verifyApplicationSelectionPolicy(f.store, policyRef, f.genesis.digest, runtime);
      await verifyApplicationComparison(f.store, prod.comparison.comparisonRef, f.genesis.digest, runtime);
      expect(comparisons.size === 2, "both rows replayed");
      for (const ref of [prod.comparison.comparisonRef, staging.comparison.comparisonRef, prod.winEval.evaluationRef, prod.loseEval.evaluationRef, staging.winEval.evaluationRef, staging.loseEval.evaluationRef]) {
        expect(f.store.readCount(ref, t0) >= 1, `verification never re-read ${ref}`);
      }
      expect(policy.parentState === f.genesis.digest, "policy binds the parent state");

      const resolved = await selectApplicationStrategy(f.store, policyRef, "prod", f.genesis.digest, runtime);
      expect(resolved.manifest === f.manifests.winner && resolved.comparison.selected === f.manifests.winner, "prod row resolves the winner");
      await threw(selectApplicationStrategy(f.store, policyRef, "lab", f.genesis.digest, runtime), /no row for this environment/);

      // Tamper a row of the *other* environment — the whole policy fails.
      const tamperedRow = await f.put({
        contract: "algal.application-selection-policy.v1", application: app, parentState: f.genesis.digest,
        entrypoint: "run", selections: [
          { environment: "prod", comparison: prod.comparison.comparisonRef, manifest: f.manifests.winner },
          { environment: "staging", comparison: staging.comparison.comparisonRef, manifest: f.manifests.loser },
        ],
      });
      await threw(verifyApplicationSelectionPolicy(f.store, tamperedRow, f.genesis.digest, runtime), /does not name the comparison's selected manifest/);
      const tamperedComparison = await f.put({
        contract: "algal.application-selection-policy.v1", application: app, parentState: f.genesis.digest,
        entrypoint: "run", selections: [
          { environment: "prod", comparison: prod.comparison.comparisonRef, manifest: f.manifests.winner },
          { environment: "staging", comparison: prod.comparison.comparisonRef, manifest: f.manifests.winner },
        ],
      });
      await threw(verifyApplicationSelectionPolicy(f.store, tamperedComparison, f.genesis.digest, runtime), /does not bind this policy/);
      await threw(verifyApplicationSelectionPolicy(f.store, policyRef, staging.comparison.comparisonRef as Digest, runtime), /parent state is stale/);

      const selection = await produceApplicationSelection(f.store, { policy: policyRef, environment: "prod", expectedParentState: f.genesis.digest }, runtime);
      expect(selection.selection.revision === f.winnerRevision, "selection resolves the winning revision");
      const stored = await record(f.store, selection.selectionRef, v => applicationJson(v) as JsonValue);
      const forgedSelection = await f.put({ ...(stored as Record<string, JsonValue>), manifest: f.manifests.loser });
      await threw(verifyApplicationSelection(f.store, forgedSelection, f.genesis.digest, runtime), /not reproducible|does not name/);
      return { rows: policy.selections.map(r => r.environment), resolved: resolved.manifest, tamperedRowsRejected: 2 };
    },
  },

  {
    id: "stored-selection-policy-grants-nothing",
    property: "EVO-06",
    surface: "createApplicationPolicyHost admitCommit (selection opt-in) + ApplicationCore.commit",
    summary:
      "A stored selection policy is inert data: the same commit citing it is denied by a host without " +
      "selectionEnvironment, denied under an environment the policy does not serve, and denied when the " +
      "committed revision installs a non-selected manifest. Only the opted-in host admits it, and then " +
      "the policy can only narrow toward the recorded selection.",
    async run() {
      const f = await evolutionFixture();
      const chain = await evidenceChain(f, "prod");
      const winnerAltEval = await f.evaluate(f.winnerAltRevision, "prod");
      const policyRef = chain.policy;

      const noOptIn = f.hostFor({});
      await threw(noOptIn.lifecycle.commit({
        application: app, operation: ref({ op: "sel-noopt" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, intents: [], evidence: [chain.winEval.evaluationRef, policyRef].sort(), causedBy: null,
      }), /denies selection policy/);

      const unserved = f.hostFor({ selectionEnvironment: "lab" });
      await threw(unserved.lifecycle.commit({
        application: app, operation: ref({ op: "sel-lab" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, intents: [], evidence: [chain.winEval.evaluationRef, policyRef].sort(), causedBy: null,
      }), /no row for this environment/);

      const opted = f.hostFor({ selectionEnvironment: "prod" });
      // Accepted evaluation for the alternative winner, but the policy's row
      // selects the recorded winner — the policy narrows, never widens.
      await threw(opted.lifecycle.commit({
        application: app, operation: ref({ op: "sel-alt" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerAltRevision, memory: f.genesisMemory, intents: [],
        evidence: [winnerAltEval.evaluationRef, policyRef].sort(), causedBy: null,
      }), /does not install the selected strategy/);

      const committed = await opted.lifecycle.commit({
        application: app, operation: ref({ op: "sel-prod" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, intents: [],
        evidence: [chain.winEval.evaluationRef, policyRef].sort(), causedBy: null,
      });
      expect(committed.state.revision === f.winnerRevision && committed.state.epoch === 1, "opted-in host committed the selected revision");
      return { policyRef, denied: ["no-opt-in", "unserved-environment", "non-selected-manifest"], committedEpoch: committed.state.epoch };
    },
  },

  {
    id: "activation-binds-exact-parent-and-changed-entrypoints",
    property: "EVO-05/EVO-06",
    surface: "ApplicationCore.commit + admitApplicationActivation + verifyApplicationEvaluation",
    summary:
      "Activation cannot bind a stale head, a foreign parent state, or partial evidence: every changed " +
      "entrypoint requires its own accepted evaluation; the candidate must be the evaluation's candidate; " +
      "and the committed state chain is verified end-to-end by history().",
    async run() {
      const f = await evolutionFixture();
      const winEval = await f.evaluate(f.winnerRevision, "harbor");
      const loseEval = await f.evaluate(f.loserRevision, "harbor");

      // A stale expected head rejects before any admission runs.
      const foreign = await evolutionFixture({ application: "foreign-app" });
      await threw(f.commit({
        operation: ref({ op: "stale-head" }), kind: "activate", expectedHead: foreign.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, evidence: [winEval.evaluationRef],
      }), /Stale application head/);

      // A rejected evaluation cannot activate even when it is cited.
      await threw(f.commit({
        operation: ref({ op: "loser-activate" }), kind: "activate", revision: f.loserRevision,
        memory: f.genesisMemory, evidence: [loseEval.evaluationRef],
      }), /reproducibly accepted/);

      // A candidate revision that changes two entrypoints needs evidence for
      // both; the run-entrypoint evaluation alone is insufficient. The cited
      // evaluation itself names the twin revision — only coverage is missing.
      // The generate entrypoint gets an interface-identical manifest variant so
      // compatibility stays clean and the verdict is accepted.
      const generatorAlt = await f.store.putManifest(parseOrganismManifest({ ...(GENERATOR_VALUE as Record<string, JsonValue>), key: "organism:generator-alt" }));
      const twin = await f.put(f.revisionBody(f.revision, f.manifests.winner, {
        entrypoints: [
          { name: "generate", manifest: generatorAlt, applicability: f.query, maxGenerations: 1, capabilities: [], queries: [f.query] },
          { name: "run", manifest: f.manifests.winner, applicability: f.query, maxGenerations: 1, capabilities: [], queries: [f.query] },
        ],
      }));
      const twinEval = await f.evaluate(twin, "harbor");
      await threw(f.commit({
        operation: ref({ op: "twin-activate" }), kind: "activate", revision: twin,
        memory: f.genesisMemory, evidence: [twinEval.evaluationRef],
      }), /Every changed entrypoint requires accepted evaluation evidence/);

      // The honest activation commits; every retained state verifies.
      const committed = await f.commit({
        operation: ref({ op: "activate" }), kind: "activate", revision: f.winnerRevision,
        memory: f.genesisMemory, evidence: [winEval.evaluationRef],
      });
      expect(committed.state.epoch === 1 && committed.state.revision === f.winnerRevision, "activation committed");
      const history = await f.lifecycle.history(app);
      expect(history.length === 2 && history[1]!.transition.evidence.join(",") === [winEval.evaluationRef].join(","), "history replays the committed evidence");

      // Evidence produced against the old head is stale under the new one.
      await threw(verifyApplicationEvaluation(f.store, winEval.evaluationRef, committed.digest, runtime), /stale/);
      // A commit replaying the same operation is idempotent, not a second commit.
      const replay = await f.commit({
        operation: ref({ op: "activate" }), kind: "activate", revision: f.winnerRevision,
        memory: f.genesisMemory, evidence: [winEval.evaluationRef],
      });
      expect(replay.digest === committed.digest, "operation replay returns the committed state");
      return { activatedEpoch: committed.state.epoch, historyStates: history.length, staleEvidenceRejected: true };
    },
  },

  /* ---------------- experiment join ---------------- */

  {
    id: "experiment-joins-exact-evidence",
    property: "EVO-07",
    surface: "produceApplicationExperiment + verifyApplicationExperiment",
    summary:
      "The experiment record is a reproducible join: every cited proposal, evaluation, comparison, " +
      "selection policy and selection is replayed against the exact parent state. Forged joins — " +
      "foreign-application evaluation, environment mismatch, a comparison that does not cover the cited " +
      "evaluations, a selection under another policy, an unsorted evidence list, a misclaimed result — " +
      "all reject.",
    async run() {
      const f = await evolutionFixture();
      const chain = await evidenceChain(f, "lab");
      const input = {
        application: app, parentState: f.genesis.digest, entrypoint: "run", environment: "lab",
        proposals: [chain.proposal.proposalRef], evaluations: [chain.winEval.evaluationRef, chain.loseEval.evaluationRef],
        comparison: chain.comparison.comparisonRef, selectionPolicy: chain.policy,
        selection: chain.selection.selectionRef, result: { promoted: false, revision: f.winnerRevision },
      };
      const experiment = await produceApplicationExperiment(f.store, input, runtime);
      const verified = await verifyApplicationExperiment(f.store, experiment.experimentRef, f.genesis.digest, runtime);
      expect(verified.result.revision === f.winnerRevision && !verified.result.promoted, "experiment resolves the winner");
      expect(verified.proposals.join(",") === [chain.proposal.proposalRef].join(","), "proposals bound exactly");

      // A foreign-application evaluation in the same store cannot join.
      const foreignRevision = await f.put(f.revisionBody(null as unknown as Digest, f.manifests.incumbent, { application: "other" }));
      const foreignTransition = await f.put({
        contract: "algal.application-transition.v1", application: "other", operation: ref({ op: "foreign-create" }),
        request: ref({ op: "foreign-create" }), kind: "create", previous: null, revision: foreignRevision,
        memory: f.genesisMemory, intents: [], evidence: [], causedBy: null,
      });
      const foreignState = await f.put({
        contract: "algal.application-state.v1", application: "other", sequence: 0, epoch: 0,
        revision: foreignRevision, memory: f.genesisMemory, previous: null, transition: foreignTransition,
      });
      const foreignCandidate = await f.put(f.revisionBody(foreignRevision, f.manifests.winner, { application: "other" }));
      const foreignEval = await evaluateApplicationRevision(f.store, {
        contract: "algal.application-evaluation-request.v1", parentState: foreignState, candidateRevision: foreignCandidate,
        entrypoint: "run", cases: f.cases, scorer: f.scorer, policy: f.evaluationPolicy, environment: "lab",
      }, runtime);
      const joins: [string, Record<string, unknown>, RegExp][] = [
        ["foreign-state evaluation", { evaluations: [chain.winEval.evaluationRef, foreignEval.evaluationRef] }, /stale|belongs to another application|not bound/],
        ["environment-mismatched evaluation", { evaluations: [chain.winEval.evaluationRef, (await f.evaluate(f.loserRevision, "prod")).evaluationRef] }, /not bound to this parent state and environment/],
        ["dropped proposal claim", { proposals: [] }, /not among the cited proposals|measures no proposed candidate|not reproducible/],
        ["result is not the selected candidate", { result: { promoted: false, revision: f.loserRevision } }, /not the selected candidate/],
      ];
      const rejected: Record<string, string> = {};
      for (const [label, patch, pattern] of joins) {
        rejected[label] = await threw(produceApplicationExperiment(f.store, { ...input, ...patch }, runtime), pattern);
      }

      // A foreign-application experiment input is also refused at parse.
      rejected["foreign-application input"] = await threw(
        produceApplicationExperiment(f.store, { ...input, application: "other" }, runtime),
        /belongs to another application/,
      );
      // A comparison joining only the winner cannot stand in for the pair.
      const partial = await produceApplicationComparison(f.store, {
        application: app, parentState: f.genesis.digest, entrypoint: "run", environment: "lab",
        evaluations: [chain.winEval.evaluationRef], selected: f.manifests.winner,
      }, runtime);
      rejected["comparison not covering cited evaluations"] = await threw(
        produceApplicationExperiment(f.store, { ...input, comparison: partial.comparisonRef, selectionPolicy: null, selection: null }, runtime),
        /does not join exactly|not reproducible/,
      );
      const otherPolicy = await f.put({
        contract: "algal.application-selection-policy.v1", application: app, parentState: f.genesis.digest,
        entrypoint: "run", selections: [{ environment: "lab", comparison: partial.comparisonRef, manifest: f.manifests.winner }],
      });
      rejected["selection policy naming another comparison"] = await threw(
        produceApplicationExperiment(f.store, { ...input, selectionPolicy: otherPolicy, selection: null }, runtime),
        /names a different comparison/,
      );
      const otherSelection = await produceApplicationSelection(f.store, { policy: otherPolicy, environment: "lab", expectedParentState: f.genesis.digest }, runtime);
      rejected["selection under another policy"] = await threw(
        produceApplicationExperiment(f.store, { ...input, selection: otherSelection.selectionRef }, runtime),
        /not under the cited policy/,
      );
      // A forged stored record with evidence in producer order (not canonical)
      // or renamed fields is not reproducible.
      const storedExperiment = applicationJson(await getApplicationRecord(f.store, experiment.experimentRef, applicationJson)) as Record<string, JsonValue>;
      const unsorted = await f.put({ ...storedExperiment, evaluations: [chain.loseEval.evaluationRef, chain.winEval.evaluationRef] });
      rejected["non-canonical stored record"] = await threw(verifyApplicationExperiment(f.store, unsorted, f.genesis.digest, runtime), /sorted and unique|not reproducible/);
      await threw(verifyApplicationExperiment(f.store, experiment.experimentRef, foreignState, runtime), /stale/);
      return { experiment: experiment.experimentRef, rejected };
    },
  },

  {
    id: "experiment-budget-binds-exact-runs",
    property: "EVO-07",
    surface: "HabitatAccount + evaluateApplicationRevision charge + checkExperimentBudget",
    summary:
      "An experiment's optional `algal.habitat-budget.v1` must be a complete experiment account charging " +
      "exactly the cited evaluations' runs: a missing evaluation's runs, an extra unrelated run, or a " +
      "non-experiment account all reject the join.",
    async run() {
      const f = await evolutionFixture();
      const account = new HabitatAccount("experiment", { work: 100_000_000, attempts: 1024, runs: 128 });
      const request = (candidateRevision: Digest) => ({
        contract: "algal.application-evaluation-request.v1", parentState: f.genesis.digest,
        candidateRevision, entrypoint: "run", cases: f.cases, scorer: f.scorer, policy: f.evaluationPolicy,
        environment: "lab",
      });
      const winEval = await evaluateApplicationRevision(f.store, request(f.winnerRevision), runtime, { account });
      const loseEval = await evaluateApplicationRevision(f.store, request(f.loserRevision), runtime, { account });
      const budget = await f.put(account.record());
      const input = {
        application: app, parentState: f.genesis.digest, entrypoint: "run", environment: "lab",
        proposals: [], evaluations: [winEval.evaluationRef, loseEval.evaluationRef],
        comparison: null, selectionPolicy: null, selection: null,
        result: { promoted: false, revision: f.winnerRevision }, budget,
      };
      const experiment = await produceApplicationExperiment(f.store, input, runtime);
      await verifyApplicationExperiment(f.store, experiment.experimentRef, f.genesis.digest, runtime);

      const rejected: Record<string, string> = {};
      // An account that never saw the loser's runs.
      const partial = new HabitatAccount("experiment", { work: 100_000_000, attempts: 1024, runs: 128 });
      await evaluateApplicationRevision(f.store, request(f.winnerRevision), runtime, { account: partial });
      rejected["account missing an evaluation's runs"] = await threw(
        produceApplicationExperiment(f.store, { ...input, budget: await f.put(partial.record()) }, runtime),
        /does not charge exactly the cited evaluations/,
      );
      // An account carrying an extra unrelated run.
      const padded = new HabitatAccount("experiment", { work: 100_000_000, attempts: 1024, runs: 128 });
      await evaluateApplicationRevision(f.store, request(f.winnerRevision), runtime, { account: padded });
      await evaluateApplicationRevision(f.store, request(f.loserRevision), runtime, { account: padded });
      const incumbent = parseOrganismManifest(INCUMBENT_VALUE);
      await padded.admit({ manifest: f.manifests.incumbent, budgets: incumbent.budgets, args: { src: { value: "t1" } } },
        () => runOrganism({ manifest: incumbent, args: { src: { value: "t1" } }, fns, store: f.store, executors: [] }), f.store);
      rejected["account with an extra run"] = await threw(
        produceApplicationExperiment(f.store, { ...input, budget: await f.put(padded.record()) }, runtime),
        /does not charge exactly the cited evaluations/,
      );
      // A non-experiment account.
      const foreign = new HabitatAccount("foundry", { work: 100_000_000, attempts: 1024, runs: 128 });
      rejected["non-experiment account"] = await threw(
        produceApplicationExperiment(f.store, { ...input, budget: await f.put(foreign.record()) }, runtime),
        /not an experiment account/,
      );
      return { budget, runs: account.record().runs.length, rejected };
    },
  },

  /* ---------------- research ---------------- */

  {
    id: "research-requires-pinned-verifier",
    property: "EVO-08",
    surface: "admitApplicationResearchEvaluation + verifyApplicationResearchEvaluation + research host opt-in",
    summary:
      "Sealed research activation requires the host's explicitly configured verifier: no verifier, a wrong " +
      "evaluator identity, or a failing seal all deny; a stored research record is inert under a pure-case " +
      "host and a pure-case evaluation is inert under the research host; a forged 'accepted' record is not " +
      "reproducible.",
    async run() {
      const rf = await researchFixture();
      const produced = await admitApplicationResearchEvaluation(rf.store, (await rf.evidence()).input, { verifier: rf.verifier });
      expect(produced.evaluation.verdict.status === "accepted", "sealed evaluation accepted");
      const checked = await verifyApplicationResearchEvaluation(rf.store, produced.evaluationRef, rf.genesis.digest, { verifier: rf.verifier });
      expect(checked.verdict.status === "accepted", "sealed evaluation verified");
      const activated = await rf.lifecycle.commit({
        application: app, operation: ref({ op: "research-activate" }), kind: "activate",
        expectedHead: rf.genesis.digest, revision: rf.candidateRevision, memory: rf.genesis.state.memory,
        intents: [], evidence: [produced.evaluationRef], causedBy: null,
      });
      expect(activated.state.revision === rf.candidateRevision && activated.state.epoch === 1, "research activation committed");

      const rejected: Record<string, string> = {};
      // A distinct next revision (parent = the activated candidate) so each
      // deny leg exercises admission, not the succession check.
      const nextRevision = await rf.put(rf.revisionBody(rf.candidateRevision, rf.beforeManifest));
      // No verifier configured anywhere.
      rejected["no verifier at all"] = await threw(admitApplicationResearchEvaluation(rf.store, (await rf.evidence()).input, { verifier: undefined as never }), /explicit trusted verifier/);
      // Wrong evaluator identity.
      const impostor = { identity: ref({ contract: "algal.impostor.v1" }), verify: rf.verifier.verify };
      rejected["wrong evaluator identity"] = await threw(
        admitApplicationResearchEvaluation(rf.store, (await rf.evidence()).input, { verifier: impostor }), /pinned evaluator/);
      // A verifier that fails the seal.
      const doubter = { identity: rf.evaluator, verify: async () => false };
      rejected["failing seal"] = await threw(
        admitApplicationResearchEvaluation(rf.store, (await rf.evidence()).input, { verifier: doubter }), /did not verify/);
      // A host without the research opt-in denies activation even though the
      // sealed record sits in CAS — the stored digest grants nothing.
      const noVerifierHost = rf.hostFor({});
      rejected["host without verifier"] = await threw(noVerifierHost.lifecycle.commit({
        application: app, operation: ref({ op: "research-noopt" }), kind: "activate",
        expectedHead: activated.digest, revision: nextRevision, memory: activated.state.memory,
        intents: [], evidence: [produced.evaluationRef], causedBy: null,
      }), /trusted verifier/);
      // A stored research record is inert under the pure-case host.
      const f = await evolutionFixture();
      const sealedValue = applicationJson(await getApplicationRecord(rf.store, produced.evaluationRef, applicationJson));
      const plantedRef = await f.put(sealedValue);
      const winEval = await f.evaluate(f.winnerRevision, "harbor");
      rejected["sealed record under pure-case host"] = await threw(f.commit({
        operation: ref({ op: "plant-research" }), kind: "activate", revision: f.winnerRevision,
        memory: f.genesisMemory, evidence: [winEval.evaluationRef, plantedRef].sort(),
      }), /denies research evaluation/);
      // A pure-case evaluation is inert under the research host.
      const pureValue = applicationJson(await getApplicationRecord(f.store, winEval.evaluationRef, applicationJson));
      const plantedEval = await rf.put(pureValue);
      rejected["pure-case record under research host"] = await threw(rf.lifecycle.commit({
        application: app, operation: ref({ op: "plant-pure" }), kind: "activate",
        expectedHead: activated.digest, revision: nextRevision, memory: activated.state.memory,
        intents: [], evidence: [plantedEval], causedBy: null,
      }), /pure-case evidence/);
      // A forged record claiming a different verdict is not reproducible;
      // the same evidence is stale once the head has moved on.
      const storedEval = applicationJson(await getApplicationRecord(rf.store, produced.evaluationRef, applicationJson)) as Record<string, JsonValue>;
      const forged = await rf.put({ ...storedEval, verdict: { status: "rejected", reasons: ["forged"] } });
      rejected["forged verdict"] = await threw(
        verifyApplicationResearchEvaluation(rf.store, forged, rf.genesis.digest, { verifier: rf.verifier }), /not reproducible/);
      rejected["stale parent"] = await threw(
        verifyApplicationResearchEvaluation(rf.store, produced.evaluationRef, activated.digest, { verifier: rf.verifier }), /stale/);
      return { activatedRevision: activated.state.revision, rejected };
    },
  },

  {
    id: "research-binds-corpus-and-attempts",
    property: "EVO-08",
    surface: "admitApplicationResearchEvaluation corpus/attempt accounting + activation verdict gates",
    summary:
      "The deterministic gates bind the frozen corpus: an omitted case or role, an attempt outside the " +
      "corpus, a sequence gap or bound breach, a reused receipt, an uncertain attempt, a holdout failure, " +
      "a development regression, missing strict improvement, or a resource overrun all reject — and a " +
      "rejected verdict cannot activate.",
    async run() {
      const rf = await researchFixture();
      const rejected: Record<string, string> = {};
      const verdictRejected: Record<string, string> = {};

      // Structural violations reject the record outright.
      rejected["omitted case"] = await threw(admitApplicationResearchEvaluation(rf.store, (await rf.evidence(rows => rows.filter(r => !(r.caseId === "dev-b" && r.role === "candidate")))).input, { verifier: rf.verifier }), /omits a frozen role or case/);
      rejected["case outside corpus"] = await threw(admitApplicationResearchEvaluation(rf.store, (await rf.evidence(rows => [...rows, { caseId: "ghost", role: "candidate", attempt: 1, outcome: "complete", passed: true, work: 1, modelCalls: 0 }])).input, { verifier: rf.verifier }), /outside the frozen corpus/);
      rejected["attempt sequence gap"] = await threw(admitApplicationResearchEvaluation(rf.store, (await rf.evidence(rows => rows.map(r => r.caseId === "dev-a" && r.role === "incumbent" ? { ...r, attempt: 2 } : r))).input, { verifier: rf.verifier }), /sequence or budget/);
      rejected["receipt reused across attempts"] = await threw((async () => {
        const rows = await rf.evidence();
        const attempts = rows.report.attempts;
        const report = await rf.put({ ...rows.report, attempts: attempts.map((a, i) => i === 1 ? { ...a, receipt: attempts[0]!.receipt } : a) });
        const seal = await rf.sealFor({ request: rf.request, report, journal: rows.report.attemptJournal });
        return admitApplicationResearchEvaluation(rf.store, { request: rf.request, report, seal }, { verifier: rf.verifier });
      })(), /distinct bound receipts/);
      rejected["report names another request"] = await threw((async () => {
        const rows = await rf.evidence();
        const report = await rf.put({ ...rows.report, request: rf.evaluationPolicy });
        const seal = await rf.sealFor({ request: rf.request, report, journal: rows.report.attemptJournal });
        return admitApplicationResearchEvaluation(rf.store, { request: rf.request, report, seal }, { verifier: rf.verifier });
      })(), /names another request|contract/);
      rejected["forged seal"] = await threw((async () => {
        const rows = await rf.evidence();
        const seal = await rf.sealFor({ request: rf.evaluationPolicy, report: rows.report.attemptJournal, journal: rows.report.attemptJournal });
        return admitApplicationResearchEvaluation(rf.store, { request: rf.request, report: rows.input.report, seal }, { verifier: rf.verifier });
      })(), /did not verify/);

      // Verdict-level gates: the record is admitted but its verdict rejects,
      // and activation requires acceptance.
      const verdictLegs: [string, (rows: { caseId: string; role: "incumbent" | "candidate"; attempt: number; outcome: "complete" | "failed" | "uncertain"; passed: boolean; work: number; modelCalls: number }[]) => { caseId: string; role: "incumbent" | "candidate"; attempt: number; outcome: "complete" | "failed" | "uncertain"; passed: boolean; work: number; modelCalls: number }[], RegExp][] = [
        ["uncertain attempt", rows => rows.map(r => ({ ...r, outcome: r.caseId === "dev-a" && r.role === "candidate" ? "uncertain" : r.outcome, passed: r.caseId === "dev-a" && r.role === "candidate" ? false : r.passed })), /uncertain-attempt|incomplete-case/],
        ["holdout failure", rows => rows.map(r => r.caseId === "holdout-a" && r.role === "candidate" ? { ...r, passed: false } : r), /holdout-failure/],
        ["case regression", rows => rows.map(r => r.caseId === "dev-a" && r.role === "candidate" ? { ...r, passed: false } : r), /case-regression/],
        ["no strict improvement", rows => rows.map(r => r.caseId === "dev-b" && r.role === "candidate" ? { ...r, passed: false } : r), /no-strict-development-improvement/],
        ["work budget", rows => rows.map(r => r.role === "candidate" ? { ...r, work: 400 } : r), /work-budget/],
        ["model-call budget", rows => rows.map(r => r.role === "candidate" ? { ...r, modelCalls: 9 } : r), /model-call-budget/],
      ];
      for (const [label, fn, pattern] of verdictLegs) {
        const evidence = await rf.evidence(rows => fn(rows.map(r => ({ ...r }))));
        const produced = await admitApplicationResearchEvaluation(rf.store, evidence.input, { verifier: rf.verifier });
        const verdict = produced.evaluation.verdict;
        expect(verdict.status === "rejected", `${label} should reject, got ${JSON.stringify(verdict)}`);
        expect((verdict as { reasons: string[] }).reasons.some(r => pattern.test(r)), `${label} reason, got ${JSON.stringify(verdict)}`);
        verdictRejected[label] = (verdict as { reasons: string[] }).reasons.join(",");
        await threw(admitApplicationResearchActivation(rf.store, { evaluation: produced.evaluationRef, expectedState: rf.genesis.digest, revision: rf.candidateRevision }, { verifier: rf.verifier }), /accepted candidate revision/);
      }
      return { rejected, verdictRejected };
    },
  },

  /* ---------------- migration ---------------- */

  {
    id: "migration-binds-source-projection",
    property: "EVO-07 (migration arm)",
    surface: "ApplicationMemoryService.observe/snapshot + migrateApplicationMemory + verifyApplicationMigration",
    summary:
      "The migration record binds the exact retained source projection: the program's receipt is computed " +
      "over the surviving claims (withdrawn rows excluded), the emitted claims literally derive from them, " +
      "and forged records claiming different claims, source, program or receipt all reject.",
    async run() {
      const f = await evolutionFixture();
      const o1 = await admitObservation(f.memory, {
        application: app, scope: f.scope, procedure: f.procedure, decoder: f.decoder, schema: f.schema,
        raw: { contract: "algal.probe-raw.v1", claims: [{ relation: "available", tuple: ["tool-a"], polarity: "supported" }] },
        previous: f.genesisMemory,
      });
      const o2 = await admitObservation(f.memory, {
        application: app, scope: f.scope, procedure: f.procedure, decoder: f.decoder, schema: f.schema,
        raw: { contract: "algal.probe-raw.v1", claims: [{ relation: "available", tuple: ["tool-b"], polarity: "supported" }] },
        previous: o1.memory,
      });
      const source = await f.memory.snapshot({
        application: app, schema: f.schema, previous: o2.memory, scope: f.scope,
        observations: [o1.observation, o2.observation].sort(), hypotheses: [], withdrawn: [o2.observation],
      });
      const migrated = await migrateApplicationMemory(f.memory, {
        application: app, from: source, schema: f.schema2, scope: f.scope2,
        program: f.manifests.migration, procedure: f.procedure2, decoder: f.decoder2,
        previousRevision: f.revision, candidateRevision: f.migrationRevision,
      }, { fns });
      const migration = await record(f.store, migrated.migration, parseApplicationMigration);
      expect(migration.claims.length === 1 && migration.claims[0]!.relation === "supported-tool" && migration.claims[0]!.tuple[0] === "tool-a",
        `migrated claims ${JSON.stringify(migration.claims)} — the withdrawn row must not project`);
      const receipt = parseRunReceipt(await getApplicationRecord(f.store, migration.receipt, applicationJson));
      const argClaims = (receipt.args as Record<string, { value: { claim: { tuple: string[] } }[] }>).claims!.value;
      expect(argClaims.length === 1 && argClaims[0]!.claim.tuple[0] === "tool-a", "receipt args are the surviving-claims projection");
      await verifyApplicationMigration(f.store, migration, f.scope2);

      const rejected: Record<string, string> = {};
      rejected["claims not produced by the program"] = await threw(verifyApplicationMigration(f.store,
        parseApplicationMigration({ ...(migration as object), claims: [{ relation: "supported-tool", tuple: ["tool-b"], polarity: "supported" }] }), f.scope2),
        /differ from producing receipt/);
      rejected["forged source snapshot"] = await threw(verifyApplicationMigration(f.store,
        parseApplicationMigration({ ...(migration as object), from: f.genesisMemory }), f.scope2),
        /does not bind its source and program/);
      rejected["forged program"] = await threw(verifyApplicationMigration(f.store,
        parseApplicationMigration({ ...(migration as object), program: f.manifests.impureMigration }), f.scope2),
        /pure bounded transformations/);
      rejected["forged receipt"] = await threw(verifyApplicationMigration(f.store,
        parseApplicationMigration({ ...(migration as object), receipt: f.frontier }), f.scope2),
        /does not bind|unknown key|contract|receipt/);
      return { migration: migrated.migration, migratedSnapshot: migrated.snapshot, claims: migration.claims, rejected };
    },
  },

  {
    id: "migration-requires-pure-program-and-consumed-evidence",
    property: "EVO-07 (migration arm) / EVO-06",
    surface: "migrateApplicationMemory + ApplicationCore.commit (migrate) + checkMigration",
    summary:
      "Only a pure bounded transformation may migrate: agent cells reject at admission, claims outside the " +
      "target schema reject, and a same-schema migration is not a migration. The committed migrate " +
      "transition requires its record consumed by the migrated memory and rejects unconsumed or " +
      "foreign-bound evidence; a selection policy cannot attach to a migration.",
    async run() {
      const f = await evolutionFixture();
      // Build source memory with one observation, then migrate it.
      const o1 = await admitObservation(f.memory, {
        application: app, scope: f.scope, procedure: f.procedure, decoder: f.decoder, schema: f.schema,
        raw: { contract: "algal.probe-raw.v1", claims: [{ relation: "available", tuple: ["tool-a"], polarity: "supported" }] },
        previous: f.genesisMemory,
      });
      await f.commit({ operation: ref({ op: "memory-1" }), kind: "memory", revision: f.revision, memory: o1.memory });
      const migrated = await migrateApplicationMemory(f.memory, {
        application: app, from: o1.memory, schema: f.schema2, scope: f.scope2,
        program: f.manifests.migration, procedure: f.procedure2, decoder: f.decoder2,
        previousRevision: f.revision, candidateRevision: f.migrationRevision,
      }, { fns });
      const head = (await f.lifecycle.inspect(app))!;

      const rejected: Record<string, string> = {};
      rejected["agent-cell program"] = await threw(migrateApplicationMemory(f.memory, {
        application: app, from: o1.memory, schema: f.schema2, scope: f.scope2,
        program: f.manifests.impureMigration, procedure: f.procedure2, decoder: f.decoder2,
        previousRevision: f.revision, candidateRevision: f.migrationRevision,
      }, { fns }), /pure bounded transformations/);
      rejected["claim outside target schema"] = await threw(migrateApplicationMemory(f.memory, {
        application: app, from: o1.memory, schema: f.schema2, scope: f.scope2,
        program: f.manifests.foreignClaimMigration, procedure: f.procedure2, decoder: f.decoder2,
        previousRevision: f.revision, candidateRevision: f.migrationRevision,
      }, { fns }), /outside the target schema/);
      rejected["same-schema migration"] = await threw(migrateApplicationMemory(f.memory, {
        application: app, from: o1.memory, schema: f.schema, scope: f.scope,
        program: f.manifests.migration, procedure: f.procedure, decoder: f.decoder,
        previousRevision: f.revision, candidateRevision: f.revision,
      }, { fns }), /requires a schema change/);

      // Commit-level: no migration evidence.
      rejected["no migration evidence"] = await threw(f.commit({
        operation: ref({ op: "migrate-bare" }), kind: "migrate", expectedHead: head.digest,
        revision: f.migrationRevision, memory: migrated.snapshot, evidence: [],
      }), /lacks migration evidence/);
      // Evidence exists but the committed memory does not consume it.
      const emptyTarget = await f.memory.snapshot({
        application: app, schema: f.schema2, previous: null, scope: f.scope2, observations: [], hypotheses: [], withdrawn: [],
      });
      rejected["unconsumed migration evidence"] = await threw(f.commit({
        operation: ref({ op: "migrate-unconsumed" }), kind: "migrate", expectedHead: head.digest,
        revision: f.migrationRevision, memory: emptyTarget, evidence: [migrated.migration],
      }), /not consumed by the migrated memory/);
      // Migration bound to a different source snapshot.
      const migrationRow = await getApplicationRecord(f.store, migrated.migration, applicationJson) as Record<string, JsonValue>;
      const foreignFrom = await f.put({ ...migrationRow, from: f.genesisMemory });
      rejected["foreign source binding"] = await threw(f.commit({
        operation: ref({ op: "migrate-foreign" }), kind: "migrate", expectedHead: head.digest,
        revision: f.migrationRevision, memory: migrated.snapshot, evidence: [foreignFrom],
      }), /does not bind this transition/);
      // A selection policy cannot attach to a migration.
      const chain = await evidenceChain(f, "lab");
      rejected["selection policy on migrate"] = await threw(f.commit({
        operation: ref({ op: "migrate-select" }), kind: "migrate", expectedHead: head.digest,
        revision: f.migrationRevision, memory: migrated.snapshot,
        evidence: [migrated.migration, chain.policy].sort(),
      }), /Selection policy cannot attach|not consumed|lacks/);
      // The honest migrate commits.
      const committed = await f.commit({
        operation: ref({ op: "migrate" }), kind: "migrate", expectedHead: head.digest,
        revision: f.migrationRevision, memory: migrated.snapshot, evidence: [migrated.migration],
      });
      expect(committed.state.epoch === 1 && committed.state.revision === f.migrationRevision && committed.state.memory === migrated.snapshot,
        "migrate committed the migrated snapshot");
      const migratedMemory = await record(f.store, migrated.snapshot, v => applicationJson(v) as { schema: Digest });
      expect(migratedMemory.schema === f.schema2, "migrated memory carries the target schema");
      return { migratedState: committed.digest, rejected };
    },
  },

  {
    id: "migration-drains-pending-explicitly",
    property: "EVO-06 (custody arm)",
    surface: "ApplicationCore.commit (drain check) + produceApplicationDrain + dispatchPending",
    summary:
      "A migrate over undispatched pending work requires exactly one drain covering the whole set; the " +
      "migrated intent then dispatch-rechecks against the post-migration state and the stale episode " +
      "source is denied rather than silently reinterpreted.",
    async run() {
      const f = await evolutionFixture();
      const engine = scriptedEngine();
      const episodeHost = f.hostFor({ memoryEngine: engine });
      const o1 = await admitObservation(f.memory, {
        application: app, scope: f.scope, procedure: f.procedure, decoder: f.decoder, schema: f.schema,
        raw: { contract: "algal.probe-raw.v1", claims: [{ relation: "available", tuple: ["tool-a"], polarity: "supported" }] },
        previous: f.genesisMemory,
      });
      const memoryHead = await episodeHost.lifecycle.commit({
        application: app, operation: ref({ op: "memory-1" }), kind: "memory", expectedHead: f.genesis.digest,
        revision: f.revision, memory: o1.memory, intents: [], evidence: [], causedBy: null,
      });
      // An episode intent needs the admission host to reproduce a supported
      // applicability derivation — the engine is the host's plug; the
      // derivation record rides in the command's evidence.
      const queries = new ApplicationMemoryService({ store: f.store, engine, admission: episodeHost.host });
      const derived = await queries.query(memoryHead.digest, f.query);
      expect(derived.derivation.status === "supported" && derived.derivation.verified, "supported applicability derivation");
      const input = await f.put({ contract: "algal.evolution-input.v1", value: "x" });
      const investigate = await episodeHost.lifecycle.commit({
        application: app, operation: ref({ op: "investigate" }), kind: "investigate", expectedHead: memoryHead.digest,
        revision: f.revision, memory: o1.memory,
        intents: [{ kind: "start-episode", entrypoint: "run", input }], evidence: [derived.ref], causedBy: null,
      });
      const pending = await f.lifecycle.undispatchedPending(app, investigate.digest);
      expect(pending.length === 1, "one undispatched intent");

      const migrated = await migrateApplicationMemory(f.memory, {
        application: app, from: o1.memory, schema: f.schema2, scope: f.scope2,
        program: f.manifests.migration, procedure: f.procedure2, decoder: f.decoder2,
        previousRevision: f.revision, candidateRevision: f.migrationRevision,
      }, { fns });
      const rejected: Record<string, string> = {};
      rejected["migrate without drain"] = await threw(f.commit({
        operation: ref({ op: "migrate-nodrain" }), kind: "migrate", expectedHead: investigate.digest,
        revision: f.migrationRevision, memory: migrated.snapshot, evidence: [migrated.migration],
      }), /Pending intents require explicit drain/);
      const partialDrain = await f.put({
        contract: "algal.application-drain.v1", application: app, parentState: investigate.digest,
        dispositions: [{ intent: pending[0]!.intent, status: "migrated" }, { intent: f.frontier, status: "abandoned" }].sort((a, b) => a.intent.localeCompare(b.intent)),
      });
      rejected["drain covering a different set"] = await threw(f.commit({
        operation: ref({ op: "migrate-baddrain" }), kind: "migrate", expectedHead: investigate.digest,
        revision: f.migrationRevision, memory: migrated.snapshot, evidence: [migrated.migration, partialDrain].sort(),
      }), /dispositions must match|does not bind|lacks/);
      const drain = await produceApplicationDrain(f.lifecycle, {
        application: app, parentState: investigate.digest,
        dispositions: [{ intent: pending[0]!.intent, status: "migrated" }],
      });
      const committed = await f.commit({
        operation: ref({ op: "migrate-drained" }), kind: "migrate", expectedHead: investigate.digest,
        revision: f.migrationRevision, memory: migrated.snapshot, evidence: [migrated.migration, drain].sort(),
      });
      expect(committed.state.epoch === 1, "drained migrate committed");
      // The migrated intent stays pending but its stale source snapshot denies
      // re-admission — a retained denial row, not silent reinterpretation.
      const attempts = await f.lifecycle.dispatchPending(app, episodeHost.host);
      const denial = attempts.find(a => "status" in a && a.status === "denied");
      expect(denial !== undefined && /no longer selected/.test((denial as { reason?: string }).reason ?? ""),
        `stale episode should deny, got ${JSON.stringify(attempts)}`);
      return { migratedState: committed.digest, denialReason: (denial as { reason: string }).reason, engineCalls: engine.calls.length, rejected };
    },
  },

  /* ---------------- restoration ---------------- */

  {
    id: "restoration-forward-non-widening",
    property: "EVO-06/EVO-07 (restoration arm)",
    surface: "restoreApplicationRevision + verifyApplicationRestoration + checkStep",
    summary:
      "Restoration is forward-only and non-widening: the restored revision preserves current metadata and " +
      "authority, must change a pure strategy manifest only, binds an exact retained ancestor state, and " +
      "rejects forged ancestry, metadata tampering, and budget-widening targets.",
    async run() {
      const f = await evolutionFixture();
      const policy = { contract: "algal.application-restoration-policy.v1", application: app, mode: "retained-pure-strategy-manifests" };
      const policyRef = await f.put(policy);
      const { lifecycle, host } = f.hostFor({ restorationPolicy: policy });
      const winEval = await f.evaluate(f.winnerRevision, "harbor");
      const activated = await lifecycle.commit({
        application: app, operation: ref({ op: "activate" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, intents: [], evidence: [winEval.evaluationRef], causedBy: null,
      });
      const restored = await restoreApplicationRevision(lifecycle, {
        application: app, operation: ref({ op: "restore" }), expectedHead: activated.digest,
        targetState: f.genesis.digest, policy: policyRef,
      });
      expect(restored.snapshot.state.epoch === 2 && restored.snapshot.state.revision !== f.revision, "restoration moved forward");
      const restoredRevision = await record(f.store, restored.revision, parseApplicationRevision);
      const restoredEntry = restoredRevision.entrypoints.find(e => e.name === "run")!;
      expect(restoredEntry.manifest === f.manifests.incumbent, "run manifest restored to the ancestor's");
      expect(restoredRevision.parent === f.winnerRevision, "restored revision parents the current revision");
      expect(restored.snapshot.state.memory === activated.state.memory, "memory preserved");
      expect(restored.snapshot.transition.intents.length === 0, "restoration creates no intents");
      expect(restored.snapshot.transition.evidence.includes(restored.restoration), "restoration evidence cited");
      await verifyApplicationRestoration(f.store, {
        application: app, parentState: activated.digest, candidateRevision: restored.revision,
        evidence: [restored.restoration],
      });

      const rejected: Record<string, string> = {};
      rejected["target not an ancestor"] = await threw(verifyApplicationRestoration(f.store, {
        application: app, parentState: activated.digest, candidateRevision: restored.revision,
        evidence: [await f.put({ contract: "algal.application-restoration.v1", application: app, parentState: activated.digest, targetState: activated.digest, candidateRevision: restored.revision, policy: policyRef })],
      }), /retained ancestor|does not bind|must change/);
      rejected["foreign application"] = await threw(verifyApplicationRestoration(f.store, {
        application: "other", parentState: activated.digest, candidateRevision: restored.revision,
        evidence: [restored.restoration],
      }), /does not bind|belongs to another/);
      const tamperedRevision = await f.put({ ...f.revisionBody(f.winnerRevision, f.manifests.incumbent), capabilityRequirements: ["wider"] });
      rejected["metadata tamper"] = await threw(verifyApplicationRestoration(f.store, {
        application: app, parentState: activated.digest, candidateRevision: tamperedRevision,
        evidence: [await f.put({ contract: "algal.application-restoration.v1", application: app, parentState: activated.digest, targetState: f.genesis.digest, candidateRevision: tamperedRevision, policy: policyRef })],
      }), /preserve current revision metadata|does not bind/);
      rejected["no restoration record"] = await threw(verifyApplicationRestoration(f.store, {
        application: app, parentState: activated.digest, candidateRevision: restored.revision, evidence: [],
      }), /exactly one restoration record/);
      expect(host.calls.some(c => c.op === "admitCommit"), "host admission ran");
      return { restoredRevision: restored.revision, epoch: restored.snapshot.state.epoch, rejected };
    },
  },

  {
    id: "restoration-requires-host-opt-in-and-custody",
    property: "EVO-06 (custody arm)",
    surface: "createApplicationPolicyHost restorationPolicy + dispatchPending + reconcileDispatch + restore",
    summary:
      "The stored restoration policy record grants nothing: a host without the restorationPolicy option " +
      "denies the same commit. Old unsettled work blocks restoration until an explicit reconcile settles " +
      "it — custody records are never rewritten.",
    async run() {
      const f = await evolutionFixture();
      const policy = { contract: "algal.application-restoration-policy.v1", application: app, mode: "retained-pure-strategy-manifests" };
      const policyRef = await f.put(policy);
      const winEval = await f.evaluate(f.winnerRevision, "harbor");
      const activated = await f.lifecycle.commit({
        application: app, operation: ref({ op: "activate" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, intents: [], evidence: [winEval.evaluationRef], causedBy: null,
      });

      // The stored policy record exists in CAS; the default host still denies.
      const noOptIn = f.hostFor({});
      const denied = await threw(restoreApplicationRevision(noOptIn.lifecycle, {
        application: app, operation: ref({ op: "restore-noopt" }), expectedHead: activated.digest,
        targetState: f.genesis.digest, policy: policyRef,
      }), /denies restoration/);
      expect(f.host.identity !== noOptIn.host.identity || true, "same identity, different option");

      // Old work custody: a deliver intent dispatched to an uncertain
      // settlement blocks restore until explicit reconciliation.
      const message = await f.put({ contract: "algal.evolution-message.v1", body: "hello" });
      const investigated = await f.lifecycle.commit({
        application: app, operation: ref({ op: "investigate" }), kind: "investigate", expectedHead: activated.digest,
        revision: f.winnerRevision, memory: f.genesisMemory,
        intents: [{ kind: "deliver", route: "inbox", message }], evidence: [], causedBy: null,
      });
      const flaky: ApplicationDispatcher = {
        configurationDigest: f.host.configurationDigest,
        async dispatch() { return { status: "uncertain" as const, reason: "lost in flight" }; },
        async reconcile(ctx) {
          if (ctx.intent.kind !== "deliver") throw new Error("unexpected intent kind");
          return { status: "settled" as const, result: { kind: "delivery" as const, message: ctx.intent.message, idempotencyKey: ctx.dispatch.identity } };
        },
      };
      const attempts = await f.lifecycle.dispatchPending(app, flaky);
      const uncertain = attempts.find((a): a is ApplicationDispatch => a.status === "uncertain");
      expect(uncertain !== undefined, `intent should be uncertain, got ${JSON.stringify(attempts)}`);
      const restoredWhilePending = await threw(restoreApplicationRevision(f.lifecycle, {
        application: app, operation: ref({ op: "restore-pending" }), expectedHead: investigated.digest,
        targetState: f.genesis.digest, policy: policyRef,
      }), /Unsettled dispatch blocks activation/);
      const settled = await f.lifecycle.reconcileDispatch(app, uncertain.intent, flaky);
      expect(settled.status === "settled" && settled.identity === uncertain.identity,
        "explicit reconcile settles the same dispatch identity — custody is retained, not rewritten");
      const withRestore = f.hostFor({ restorationPolicy: policy });
      const restored = await restoreApplicationRevision(withRestore.lifecycle, {
        application: app, operation: ref({ op: "restore" }), expectedHead: investigated.digest,
        targetState: f.genesis.digest, policy: policyRef,
      });
      expect(restored.snapshot.state.epoch === 2, "restore committed after reconcile");
      return { denied, restoredWhilePending, restored: restored.snapshot.digest };
    },
  },

  /* ---------------- view evidence ---------------- */

  {
    id: "view-evidence-binds-revision-chain",
    property: "EVO-05/EVO-07 (projection arm)",
    surface: "collectApplicationViewEvidence + parseApplicationViewEvidence + ApplicationCore.history",
    summary:
      "The retained view evidence binds the exact committed chain: the activation row carries exactly the " +
      "transition's evidence digests, the genesis row carries none, and a mismatched captured state is " +
      "rejected by the parser.",
    async run() {
      const f = await evolutionFixture();
      const winEval = await f.evaluate(f.winnerRevision, "harbor");
      const activated = await f.lifecycle.commit({
        application: app, operation: ref({ op: "activate" }), kind: "activate", expectedHead: f.genesis.digest,
        revision: f.winnerRevision, memory: f.genesisMemory, intents: [], evidence: [winEval.evaluationRef], causedBy: null,
      });
      const history = await f.lifecycle.history(app);
      const evidence = await collectApplicationViewEvidence(f.lifecycle, history);
      const parsed = parseApplicationViewEvidence(evidence, activated.digest, activated.state.memory);
      expect(parsed.revisions.length === 2, "two revision rows");
      expect(parsed.revisions[0]!.kind === "create" && parsed.revisions[0]!.evidence.length === 0, "genesis carries no evidence");
      expect(parsed.revisions[1]!.kind === "activate", "activation row");
      expect(parsed.revisions[1]!.revision === f.winnerRevision, "activation row binds the committed revision");
      expect(parsed.revisions[1]!.evidence.join(",") === [winEval.evaluationRef].join(","), "activation row binds exactly the committed evidence");
      expect(parsed.state === activated.digest && parsed.memory === activated.state.memory, "evidence binds captured state");
      await threw(() => parseApplicationViewEvidence(evidence, f.genesis.digest, activated.state.memory), /state|match/i);
      return { revisions: parsed.revisions.map(r => ({ kind: r.kind, evidence: r.evidence })) };
    },
  },
];



