/**
 * `memory-authority` case catalog (Phase 15). Each case exercises the real
 * production composition — `ApplicationMemoryService` over a `Store`, the
 * production `createApplicationPolicyHost` admission boundary,
 * `ApplicationCore` lifecycle custody on `MemoryApplicationStorage`, the
 * view/goal evidence projectors and the investigation/execution request
 * path — under instrumented hosts, with the independent derivation checker
 * (`verify/reference/memory`) as the proof oracle. A case returns
 * `satisfied` only when every embedded assertion holds; any failure throws.
 *
 * Coverage of the Phase-15 criterion (docs/formal-verification-plan.md):
 *
 *  A. "a displayed/actionable derivation binds exact captured state (the
 *     selected facts/program, admission host, engine, and frontier), so
 *     stale evidence cannot start fresh work"
 *     → derivation-binds-captured-state, stale-evidence-cannot-start-work,
 *       dispatch-admission-reproduces-current-evidence,
 *       displayed-evidence-fences, goal-capture-fences
 *  B. "proof answers bind the exact snapshot/generation and source rows"
 *     → proof-binds-exact-snapshot-and-rows,
 *       proof-does-not-transfer-across-generations, source-selection-is-exact
 *  C. "selection rechecks every environment row and the exact parent; replay
 *     does not widen scope"
 *     → every-row-rechecked-on-replay, exact-parent-lineage,
 *       no-scope-widening-on-replay, withdrawal-is-not-deletion
 *  D. "claims admitted under one admission host/engine do not transfer;
 *     withheld authority fails closed"
 *     → foreign-admission-rejected, engine-identity-is-authority,
 *       withheld-authority-fails-closed, engine-dishonesty-fails-closed,
 *       investigation-requests-bind-origin
 */
import { checkQueryResult } from "../reference/memory/checker";
import {
  ApplicationMemoryService,
  parseMemoryDerivation, parseMemoryObservation,
  type MemoryClaim,
} from "../../src/application-memory";
import { applicationJson, putApplicationRecord } from "../../src/application-contract";
import { ApplicationCore, type ApplicationSnapshot } from "../../src/application-core";
import {
  captureApplicationGoals, bindApplicationGoalCaptures,
} from "../../src/application-goal";
import {
  collectApplicationViewEvidence, projectApplicationView,
  loadApplicationViewSpec, type ApplicationViewAction,
} from "../../src/application-view";
import {
  requestExecution, scheduleInvestigations, parseInvestigationRequest,
} from "../../src/application-investigation";
import type { Digest } from "../../src/digest";
import type { JsonValue } from "../../src/values";
import {
  authorityFixture, checkerEngine, checkStoredDerivation, instrumentedPolicyHost,
  ref, writeRawState, type AuthorityFixture,
} from "./harness";

const APPLICATION = "workspace";
const json = applicationJson;

interface CaseResult {
  status: "satisfied";
  evidence: Record<string, JsonValue>;
}
interface AuthorityCase {
  readonly id: string;
  readonly property: string;
  readonly surface: string;
  readonly summary: string;
  run(): Promise<CaseResult>;
}

function evidence(v: Record<string, JsonValue>): CaseResult {
  return { status: "satisfied", evidence: v };
}

async function threw(p: Promise<unknown>, pattern: string | RegExp): Promise<string> {
  try {
    await p;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ok = typeof pattern === "string" ? message.includes(pattern) : pattern.test(message);
    if (!ok) throw new Error(`expected rejection matching ${String(pattern)}, got: ${message}`);
    return message;
  }
  throw new Error("expected rejection, call succeeded");
}

function threwSync(f: () => unknown, pattern: string | RegExp): string {
  try {
    f();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ok = typeof pattern === "string" ? message.includes(pattern) : pattern.test(message);
    if (!ok) throw new Error(`expected rejection matching ${String(pattern)}, got: ${message}`);
    return message;
  }
  throw new Error("expected rejection, call succeeded");
}

function expect(v: unknown, what: string): asserts v {
  if (!v) throw new Error(`expected ${what}`);
}

function eq(a: unknown, b: unknown, what: string): void {
  if (a !== b) throw new Error(`${what}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

function sameSet(a: readonly unknown[], b: readonly unknown[]): boolean {
  const aa = [...a].sort() as JsonValue[], bb = [...b].sort() as JsonValue[];
  return aa.length === bb.length && aa.every((v, i) => JSON.stringify(v) === JSON.stringify(bb[i]));
}

/** A stored derivation record re-put under rebound fields: the copy is
 *  well-formed (CAS + `parseMemoryDerivation` both accept it) yet names a
 *  different authority, so it can never be the reproduced evidence. */
async function rebindDerivation(
  fx: AuthorityFixture, base: Digest, overrides: Record<string, JsonValue>,
): Promise<Digest> {
  const record = json(await fx.store.getValue(base)) as Record<string, JsonValue>;
  const copy = { ...record, ...overrides };
  parseMemoryDerivation(copy); // remains a well-formed derivation record
  return putApplicationRecord(fx.store, copy);
}

async function inputFor(fx: AuthorityFixture, label: string): Promise<Digest> {
  return putApplicationRecord(fx.store, { src: { value: label } });
}

/** The observation refs a committed state selects (sorted, in-memory order). */
async function selectedObservations(fx: AuthorityFixture, state: ApplicationSnapshot): Promise<Digest[]> {
  return (await fx.readState(state.digest)).memory.observations;
}

/** A minimal second revision whose queries bundle names exactly `queryRef`;
 *  used for states the fixture's primary revision does not govern. */
async function foreignRevision(fx: AuthorityFixture, queryRef: Digest): Promise<Digest> {
  const queries = await putApplicationRecord(fx.store, {
    contract: "algal.application-memory-queries.v1", queries: [queryRef],
  });
  const body = json(await fx.store.getValue(fx.revision)) as Record<string, JsonValue>;
  return putApplicationRecord(fx.store, {
    ...body, queries,
    entrypoints: [{
      name: "run", manifest: fx.manifest, applicability: queryRef,
      maxGenerations: 1, capabilities: [], queries: [queryRef],
    }],
  });
}

const CASES: AuthorityCase[] = [

  // ------------------------------------------------------------- A: capture
  {
    id: "derivation-binds-captured-state",
    property: "MEM-02",
    surface: "captured-state binding",
    summary:
      "A produced MemoryDerivation binds the exact captured state, selected " +
      "memory, query and program, the host's attested frontier, and the " +
      "engine + admission identities — every field a content digest. A " +
      "record rebound on any authority field is well-formed yet a different " +
      "CAS identity, and re-querying deterministically reproduces the same " +
      "record.",
    async run() {
      const fx = await authorityFixture();
      const seen = await fx.observe("tool-a", "supported", fx.genesis, "a");
      const { ref: refd, derivation } = await fx.memory.query(seen.snapshot.digest, fx.query);
      expect(derivation.capturedState === seen.snapshot.digest, "capturedState binds the queried state");
      expect(derivation.memory === seen.snapshot.state.memory, "memory binds the state's selected memory");
      expect(derivation.query === fx.query && derivation.program === fx.program, "query/program bind the selected records");
      expect(derivation.frontier === fx.frontier0, "frontier binds the host's attested frontier");
      expect(derivation.engine === fx.engine.identity, "engine binds the producing engine identity");
      expect(derivation.admission === fx.host.identity, "admission binds the host authority identity");
      expect(derivation.status === "supported" && derivation.verified && derivation.conditional, "status/verified/conditional");
      expect(sameSet(derivation.sourceRefs, [seen.observation]), "sourceRefs bind the selected observations");
      expect(derivation.result !== null && derivation.snapshot !== null, "result/snapshot retained");
      // Every authority field is inside the content identity: a rebound
      // copy is well-formed yet a different record.
      const rebound: Digest[] = [];
      for (const over of [
        { engine: ref("foreign-engine") }, { admission: ref("foreign-host") },
        { frontier: ref("foreign-frontier") }, { program: fx.program2 },
        { capturedState: fx.genesis.digest }, { memory: fx.genesisMemory },
      ]) rebound.push(await rebindDerivation(fx, refd, over));
      expect(rebound.every(r => r !== refd), "each rebound field yields a distinct record");
      expect(await checkStoredDerivation(fx.store, derivation), "checker accepts the produced evidence under declared sources");
      const again = await fx.memory.query(seen.snapshot.digest, fx.query);
      eq(again.ref, refd, "deterministic reproduction yields the identical derivation record");
      return evidence({
        derivation: refd, capturedState: derivation.capturedState,
        memory: derivation.memory, query: derivation.query, program: derivation.program,
        frontier: derivation.frontier, engine: derivation.engine, admission: derivation.admission,
        rebound: rebound,
      });
    },
  },
  {
    id: "stale-evidence-cannot-start-work",
    property: "MEM-02,EVO-06",
    surface: "captured-state binding",
    summary:
      "Fresh work needs the derivation reproduced at the current head. A " +
      "stale derivation is refused at the request fence (capturedState is " +
      "bound); a record forged onto the new head still cannot start work " +
      "because host admission reproduces the derivation and requires the " +
      "cited ref to be the produced one.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      expect(d1.derivation.status === "supported", "baseline supported");
      const input = await inputFor(fx, "probe");
      // Positive control: the produced derivation starts work once.
      const committed = await requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-1"),
        expectedHead: s1.digest, expectedMemory: s1.state.memory,
        entrypoint: "run", input, derivation: d1.ref,
      });
      eq(committed.transition.intents.length, 1, "one start-episode intent committed");
      const workRow = json(await fx.store.getValue(committed.transition.intents[0]!)) as Record<string, JsonValue>;
      eq(workRow.kind, "start-episode", "intent kind");
      const again = await requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-1"),
        expectedHead: s1.digest, expectedMemory: s1.state.memory,
        entrypoint: "run", input, derivation: d1.ref,
      });
      eq(again.digest, committed.digest, "identical retry replays the committed operation");
      // Advance the head: the derivation's captured state is stale.
      const s2 = (await fx.observe("tool-b", "supported", committed, "b")).snapshot;
      const msg1 = await threw(requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-stale"),
        expectedHead: s2.digest, expectedMemory: s2.state.memory,
        entrypoint: "run", input, derivation: d1.ref,
      }), "not bound to a verified supported applicability derivation");
      // A record forged onto the new head passes the request fence (the
      // fields it checks are satisfied) but is not the reproduced evidence:
      // the host recomputes the query at the real head and the cited digest
      // differs from the produced derivation.
      const forged = await rebindDerivation(fx, d1.ref, {
        capturedState: s2.digest, memory: s2.state.memory,
      });
      const msg2 = await threw(requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-forged"),
        expectedHead: s2.digest, expectedMemory: s2.state.memory,
        entrypoint: "run", input, derivation: forged,
      }), "reproduced supported");
      const d2 = await fx.memory.query(s2.digest, fx.query);
      expect(d2.ref !== d1.ref && d2.ref !== forged, "reproduction is a distinct record from both stale and forged");
      eq(d2.derivation.capturedState, s2.digest, "fresh derivation binds the current head");
      const head = await fx.lifecycle.inspect(APPLICATION);
      eq(head!.digest, s2.digest, "no commit leaked through a rejected request");
      return evidence({
        committed: committed.digest, staleFence: msg1, forgedFence: msg2, head: head!.digest,
      });
    },
  },
  {
    id: "dispatch-admission-reproduces-current-evidence",
    property: "MEM-02,EVO-05",
    surface: "captured-state binding",
    summary:
      "Dispatch admission reruns the applicability query over a replay CAS " +
      "overlay and binds the episode plan to the intent's source state. A " +
      "pending intent whose source memory is no longer selected is refused " +
      "with a typed, transient denial record — it is not consumed and not " +
      "silently retried.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      const input = await inputFor(fx, "probe");
      const s1x = await requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-2"),
        expectedHead: s1.digest, expectedMemory: s1.state.memory,
        entrypoint: "run", input, derivation: d1.ref,
      });
      const admitted = await fx.lifecycle.dispatchPending(APPLICATION, fx.host);
      const dispatch = admitted.find(r => "plan" in r);
      expect(dispatch !== undefined && "plan" in dispatch && dispatch.plan.kind === "episode", "episode plan admitted");
      if (dispatch === undefined || !("plan" in dispatch) || dispatch.plan.kind !== "episode") throw new Error("plan kind");
      const binding = dispatch.plan.binding;
      eq(binding.sourceState, s1x.digest, "binding captures the intent's source state");
      expect(binding.memory === s1x.state.memory && binding.revision === s1x.state.revision, "binding captures memory+revision");
      expect(binding.epoch === s1x.state.epoch && binding.manifest === fx.manifest, "binding captures epoch+manifest");
      eq(dispatch.status, "blocked", "no domain dispatcher is admitted for episodes here");
      eq(dispatch.configurationDigest, fx.host.configurationDigest, "dispatch record binds the serving host configuration");
      const replay = await fx.lifecycle.dispatchPending(APPLICATION, fx.host);
      eq(replay.find(r => "plan" in r)?.identity, dispatch.identity, "a blocked dispatch record is never silently retried");
      // Commit a second intent, then advance the head before dispatching it:
      // dispatch-time admission must re-run the fence against the current
      // head and refuse the stale source state.
      const s2 = (await fx.observe("tool-b", "supported", s1x, "b")).snapshot;
      const d2 = await fx.memory.query(s2.digest, fx.query);
      const s2x = await requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-3"),
        expectedHead: s2.digest, expectedMemory: s2.state.memory,
        entrypoint: "run", input: await inputFor(fx, "probe-2"), derivation: d2.ref,
      });
      const s3 = (await fx.observe("tool-c", "supported", s2x, "c")).snapshot;
      const attempted = await fx.lifecycle.dispatchPending(APPLICATION, fx.host);
      const denial = attempted.find(r => !("plan" in r));
      expect(denial !== undefined && !("plan" in denial), "typed denial record produced for the stale intent");
      if (denial === undefined || "plan" in denial) throw new Error("denial");
      eq(denial.contract, "algal.application-admission-denied.v1", "denial contract");
      eq(denial.status, "denied", "denial status");
      eq(denial.sourceState, s2x.digest, "denial binds the stale source state");
      eq(denial.currentState, s3.digest, "denial binds the current state");
      expect(denial.reason.includes("no longer selected"), "denial reason names the stale selection");
      const attempted2 = await fx.lifecycle.dispatchPending(APPLICATION, fx.host);
      const denial2 = attempted2.find(r => !("plan" in r));
      expect(denial2 !== undefined && denial2.intent === denial.intent, "the unadmitted intent is not consumed");
      return evidence({
        binding: {
          sourceState: binding.sourceState, memory: binding.memory,
          revision: binding.revision, epoch: binding.epoch, manifest: binding.manifest,
        },
        denial: { sourceState: denial.sourceState, currentState: denial.currentState, reason: denial.reason },
      });
    },
  },
  {
    id: "displayed-evidence-fences",
    property: "MEM-02,EVO-05",
    surface: "captured-state binding",
    summary:
      "View evidence collection re-binds each supplied derivation to the " +
      "captured state, the queries bundle and the active source set; the " +
      "view action fence emits an execute-procedure action only for a " +
      "supported, evidence-matched result bound to the captured state. " +
      "Displayed evidence grants no authority by itself.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      const history = await fx.lifecycle.history(APPLICATION);
      const spec = await loadApplicationViewSpec(fx.store, fx.revisionRecord.views);
      const collected = await collectApplicationViewEvidence(fx.lifecycle, history, [d1.ref]);
      eq(collected.state, s1.digest, "evidence binds the captured state");
      eq(collected.memory, s1.state.memory, "evidence binds the captured memory");
      const qrow = collected.queries.find(q => q.query === fx.query)!;
      eq(qrow.derivation, d1.ref, "query evidence carries the produced ref");
      eq(qrow.status, "supported", "evidence status reads the produced record");
      // Derivations rebound on capturedState, memory, query or source set
      // are refused at collection.
      const ghost = await writeRawState(fx, { memory: fx.genesisMemory, previous: null, sequence: 0, operation: "ghost" });
      const dOther = await fx.memory.query(ghost, fx.query); // well-formed, bound to a foreign state
      const fences: string[] = [];
      fences.push(await threw(
        collectApplicationViewEvidence(fx.lifecycle, history, [dOther.ref]),
        "derivation crosses captured state or sources",
      ));
      fences.push(await threw(
        collectApplicationViewEvidence(fx.lifecycle, history, [await rebindDerivation(fx, d1.ref, { capturedState: ghost })]),
        "derivation crosses captured state or sources",
      ));
      fences.push(await threw(
        collectApplicationViewEvidence(fx.lifecycle, history, [await rebindDerivation(fx, d1.ref, { query: fx.query2 })]),
        "derivation program differs",
      ));
      const foreignObs = await fx.admit("tool-z", "supported"); // admitted, but not selected by s1's memory
      fences.push(await threw(
        collectApplicationViewEvidence(fx.lifecycle, history, [await rebindDerivation(fx, d1.ref, { sourceRefs: [foreignObs] })]),
        "derivation crosses captured state or sources",
      ));
      // Positive: the produced derivation yields an actionable view row.
      // The revision declares a goal, so the projection requires captures
      // covering it — the produced derivation supplies that too.
      const goals = await captureApplicationGoals(fx.store, s1, { "g-applicable": d1.ref });
      const view = projectApplicationView({
        snapshot: s1, spec, history, evidence: collected, goals,
        applicability: {
          run: { status: "supported", queryResult: { digest: d1.ref, state: s1.digest, procedure: fx.manifest } },
        },
      });
      const action = view.actions.find((a: ApplicationViewAction) => a.kind === "execute-procedure");
      expect(action !== undefined && action.kind === "execute-procedure", "actionable row produced");
      if (action?.kind === "execute-procedure") {
        eq(action.expectedState, s1.digest, "action fenced to the captured state");
        eq(action.queryResult, d1.ref, "action names the produced derivation ref");
        eq(action.procedure, fx.manifest, "action names the selected manifest");
      }
      // Advance the head; the old evidence cannot dress the new state.
      const s2 = (await fx.observe("tool-b", "supported", s1, "b")).snapshot;
      const history2 = await fx.lifecycle.history(APPLICATION);
      const d2 = await fx.memory.query(s2.digest, fx.query);
      const collected2 = await collectApplicationViewEvidence(fx.lifecycle, history2, [d2.ref]);
      const goals2 = await captureApplicationGoals(fx.store, s2, { "g-applicable": d2.ref });
      // The right derivation ref under the wrong captured state, and the
      // wrong derivation ref under the right state, are distinct fences.
      const actionFence = threwSync(() => projectApplicationView({
        snapshot: s2, spec, history: history2, evidence: collected2, goals: goals2,
        applicability: {
          run: { status: "supported", queryResult: { digest: d2.ref, state: s1.digest, procedure: fx.manifest } },
        },
      }), "not bound to the captured application state");
      const evidenceFence = threwSync(() => projectApplicationView({
        snapshot: s2, spec, history: history2, evidence: collected2, goals: goals2,
        applicability: {
          run: { status: "supported", queryResult: { digest: d1.ref, state: s2.digest, procedure: fx.manifest } },
        },
      }), "conflicts with captured evidence");
      // And the stale derivation is refused at collection under the new head.
      const staleFence = await threw(
        collectApplicationViewEvidence(fx.lifecycle, history2, [d1.ref]),
        "derivation crosses captured state or sources",
      );
      return evidence({
        collectionFences: fences as unknown as JsonValue,
        actionFence, evidenceFence, staleFence,
      });
    },
  },
  {
    id: "goal-capture-fences",
    property: "MEM-02,EVO-05",
    surface: "captured-state binding",
    summary:
      "Goal captures require one produced derivation per declared goal, " +
      "bound to the captured state/memory/query; missing evidence reports " +
      "unknown (never supported), and a capture list that does not cover " +
      "the revision's goals or crosses the captured state is refused.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      const captured = await captureApplicationGoals(fx.store, s1, { "g-applicable": d1.ref });
      eq(captured.length, 1, "one declared goal");
      eq(captured[0]!.status, "supported", "goal capture reads the produced derivation");
      eq(captured[0]!.state, s1.digest, "capture binds the state");
      eq(captured[0]!.memory, s1.state.memory, "capture binds the memory");
      eq(captured[0]!.derivation, d1.ref, "capture names the produced derivation");
      const missing = await captureApplicationGoals(fx.store, s1, {});
      eq(missing[0]!.status, "unknown", "absent derivation is declared unknown");
      // Evidence keyed under a name no goal selects is refused.
      await threw(
        captureApplicationGoals(fx.store, s1, { "g-foreign": d1.ref }),
        "unselected application goal",
      );
      // Each fence field rejects on rebind.
      const ghost = await writeRawState(fx, { memory: fx.genesisMemory, previous: s1.digest, sequence: 2, operation: "ghost-goal" });
      for (const over of [
        { capturedState: ghost }, { memory: fx.genesisMemory }, { query: fx.query2 },
      ]) {
        await threw(
          captureApplicationGoals(fx.store, s1, { "g-applicable": await rebindDerivation(fx, d1.ref, over) }),
          "crosses the captured application state",
        );
      }
      threwSync(() => bindApplicationGoalCaptures(s1, []), "do not cover the captured revision");
      threwSync(
        () => bindApplicationGoalCaptures(s1, [{ ...json(captured[0]) as object, state: fx.genesis.digest } as never]),
        "crosses the captured application state",
      );
      return evidence({ goal: captured[0]!.goal, status: captured[0]!.status });
    },
  },

  // ------------------------------------------------------------ B: witness
  {
    id: "proof-binds-exact-snapshot-and-rows",
    property: "MEM-01,MEM-03",
    surface: "query-witness binding",
    summary:
      "The produced fact snapshot carries each selected row with its exact " +
      "(observation, scope, procedure) source triple; the result envelope " +
      "binds the snapshot and program content digests; the independent " +
      "checker accepts only under that snapshot, that program and the " +
      "declared source set — dropping or withdrawing a source row, or " +
      "swapping the snapshot document, rejects.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const obs = (await selectedObservations(fx, s1))[0]!;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      const snapshot = json(await fx.store.getValue(d1.derivation.snapshot!)) as {
        contract: string; facts: { relation: string; tuple: JsonValue[]; sources: string[] }[];
      };
      eq(snapshot.contract, "algal.memory.v1", "snapshot contract");
      eq(snapshot.facts.length, 1, "one selected fact");
      const fact = snapshot.facts[0]!;
      eq(fact.relation, "available", "fact relation");
      expect(JSON.stringify(fact.tuple) === JSON.stringify(["tool-a", "supported"]), "fact tuple binds claim + polarity column");
      expect(sameSet(fact.sources, [obs, fx.scope, fx.procedure]), "fact sources are the exact observation/scope/procedure triple");
      const result = json(await fx.store.getValue(d1.derivation.result!)) as Record<string, JsonValue>;
      eq(result.snapshot, d1.derivation.snapshot, "result binds the snapshot content digest");
      eq(result.program, d1.derivation.program, "result binds the program content digest");
      eq(result.witnessPolicy, "first-canonical-derivation", "witness policy pinned");
      const snapshotDoc = await fx.store.getValue(d1.derivation.snapshot!);
      const programDoc = await fx.store.getValue(d1.derivation.program);
      const base = { snapshot: snapshotDoc, program: programDoc, claimed: result };
      const full = checkQueryResult({
        ...base, selection: { allowedSources: [obs, fx.scope, fx.procedure].sort() },
      } as never);
      expect(full.accept === true, "checker accepts under the declared source set");
      const narrowed = checkQueryResult({
        ...base, selection: { allowedSources: [obs, fx.procedure].sort() },
      } as never);
      expect(narrowed.accept === false && !narrowed.accept && narrowed.reason === "unselected-source",
        "dropping the scope source row rejects");
      const withdrawn = checkQueryResult({ ...base, selection: { withdrawn: [obs] } } as never);
      expect(withdrawn.accept === false && !withdrawn.accept && withdrawn.reason === "withdrawn-source",
        "withdrawing the observation source rejects");
      const otherDoc = json({
        contract: "algal.memory.v1",
        facts: [...snapshot.facts, { relation: "available", tuple: ["tool-z", "opposed"], sources: fact.sources }],
      });
      const moved = checkQueryResult({ ...base, snapshot: otherDoc, selection: {} } as never);
      expect(moved.accept === false && !moved.accept && moved.reason === "snapshot-digest-mismatch",
        "a different snapshot document is not this evidence's bound object");
      const otherProgram = await fx.store.getValue(fx.program2);
      const movedProgram = checkQueryResult({ ...base, program: otherProgram, selection: {} } as never);
      expect(movedProgram.accept === false && !movedProgram.accept && movedProgram.reason === "program-digest-mismatch",
        "a different program document is not this evidence's bound object");
      return evidence({
        snapshotDigest: d1.derivation.snapshot!, programDigest: d1.derivation.program,
        resultDigest: d1.derivation.result!, factSources: fact.sources as JsonValue[],
      });
    },
  },
  {
    id: "proof-does-not-transfer-across-generations",
    property: "MEM-01,MEM-03",
    surface: "query-witness binding",
    summary:
      "Advancing memory to a new generation changes the fact snapshot's " +
      "content digest; the prior generation's result is refused under the " +
      "new snapshot (and conversely), and the service fails closed when an " +
      "engine returns the previous generation's envelope.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const s2 = (await fx.observe("tool-b", "supported", s1, "b")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      const d2 = await fx.memory.query(s2.digest, fx.query);
      expect(d1.derivation.snapshot !== d2.derivation.snapshot, "generations produce distinct fact snapshots");
      expect(d1.derivation.result !== d2.derivation.result, "generations produce distinct results");
      eq(d2.derivation.sourceRefs.length, 2, "the new generation selects both rows");
      const r1 = await fx.store.getValue(d1.derivation.result!);
      const r2 = await fx.store.getValue(d2.derivation.result!);
      const s1doc = await fx.store.getValue(d1.derivation.snapshot!);
      const s2doc = await fx.store.getValue(d2.derivation.snapshot!);
      const program = await fx.store.getValue(fx.program);
      const forward = checkQueryResult({ snapshot: s2doc, program, claimed: r1, selection: {} } as never);
      expect(forward.accept === false && !forward.accept && forward.reason === "snapshot-digest-mismatch",
        "a result valid under generation 1 is refused under generation 2");
      const backward = checkQueryResult({ snapshot: s1doc, program, claimed: r2, selection: {} } as never);
      expect(backward.accept === false && !backward.accept && backward.reason === "snapshot-digest-mismatch",
        "generation 2 evidence cannot masquerade under generation 1");
      // Service-level: an engine answering with the prior generation's
      // envelope under the new snapshot cannot produce support — the result
      // binding check precedes verification and fails closed.
      const staleEngine = {
        ...checkerEngine(),
        async query() { return { kind: "complete" as const, result: r1! }; },
      };
      const service = new ApplicationMemoryService({ store: fx.store, engine: staleEngine, admission: fx.host });
      const out = await service.query(s2.digest, fx.query);
      eq(out.derivation.status, "failed", "stale-generation engine answer fails closed");
      eq(out.derivation.verified, false, "not verified");
      eq(out.derivation.result, null, "no result retained");
      return evidence({
        snapshot1: d1.derivation.snapshot!, snapshot2: d2.derivation.snapshot!,
        staleEngineStatus: out.derivation.status,
      });
    },
  },
  {
    id: "source-selection-is-exact",
    property: "MEM-01",
    surface: "query-witness binding",
    summary:
      "Only observations whose procedure is inside the query's explicit " +
      "procedures, admitted under a current scope, and not withdrawn " +
      "contribute facts. An unselected procedure's row is absent from both " +
      "the snapshot and the proof's source set; a withdrawn row contributes " +
      "nothing and cannot be cited.",
    async run() {
      const fx = await authorityFixture();
      const a = await fx.admit("tool-a", "supported");
      const c = await fx.admit("tool-c", "supported", { procedure: fx.procedure2, decoder: fx.decoder2 });
      const observations = [a, c].sort();
      const memoryRef = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations, hypotheses: [], withdrawn: [],
      });
      const state = await writeRawState(fx, { memory: memoryRef, previous: null, sequence: 0, operation: "sel-1" });
      const d = await fx.memory.query(state, fx.query);
      const snap = json(await fx.store.getValue(d.derivation.snapshot!)) as { facts: { tuple: JsonValue[]; sources: string[] }[] };
      eq(snap.facts.length, 1, "only the selected procedure's row contributes a fact");
      eq(snap.facts[0]!.tuple[0], "tool-a", "the selected row is tool-a");
      eq(d.derivation.sourceRefs.length, 1, "sourceRefs name exactly the selected observation");
      eq(d.derivation.sourceRefs[0], a, "the unselected procedure's row is not a source");
      eq(d.derivation.status, "supported", "the selected row supports");
      // The other row was admitted into memory yet never enters the answer
      // or its provenance: selection is explicit, not ambient.
      parseMemoryObservation(await fx.store.getValue(c));
      const memory2 = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: memoryRef, scope: fx.scope,
        observations, hypotheses: [], withdrawn: [a],
      });
      const state2 = await writeRawState(fx, { memory: memory2, previous: state, sequence: 1, operation: "sel-2" });
      const d2 = await fx.memory.query(state2, fx.query);
      eq(d2.derivation.status, "unknown", "withdrawing the sole source yields unknown");
      eq(d2.derivation.sourceRefs.length, 0, "withdrawn rows are not sources");
      const snap2 = json(await fx.store.getValue(d2.derivation.snapshot!)) as { facts: unknown[] };
      eq(snap2.facts.length, 0, "the withdrawn row contributes no fact");
      return evidence({ sourceRefs: d.derivation.sourceRefs, withdrawnStatus: d2.derivation.status });
    },
  },

  // ----------------------------------------------------------- C: selection
  {
    id: "every-row-rechecked-on-replay",
    property: "MEM-02,MEM-03",
    surface: "state/commit fence",
    summary:
      "Snapshot validation re-decodes every selected observation through " +
      "the trusted host — a stored record whose claims differ from the " +
      "decode of its own raw is refused wherever it sits in the row set, " +
      "and the host call log shows the per-row rechecks actually happened: " +
      "one decode per selected row, one scope validation per row plus the " +
      "snapshot's, one attested-frontier read.",
    async run() {
      const fx = await authorityFixture();
      const a = await fx.admit("tool-a", "supported");
      const b = await fx.admit("tool-b", "supported");
      // Forged row: the raw decodes to `opposed`; the stored claims say
      // `supported`. Well-formed bytes — only the host's decode tells.
      const raw = await putApplicationRecord(fx.store, {
        contract: "algal.probe-raw.v1", tool: "tool-c",
        claims: [{ relation: "available", tuple: ["tool-c"], polarity: "opposed" }],
      });
      const forged = await fx.forgeObservation(
        [{ relation: "available", tuple: ["tool-c"], polarity: "supported" }], { raw },
      );
      const before = fx.host.calls.length;
      const snapshotReject = await threw(fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: [a, b, forged].sort(), hypotheses: [], withdrawn: [],
      }), "differs from trusted source decoding");
      const made = fx.host.calls.slice(before);
      expect(made.filter(c => c.op === "decodeObservation").length >= 1, "each row was re-decoded until the forged one rejected");
      expect(made.filter(c => c.op === "validateScope").length >= 2, "scope rows were revalidated per row");
      // The same memory, committed by hand into CAS, refuses at query
      // replay — no degraded derivation is produced.
      const badMemory = await putApplicationRecord(fx.store, {
        contract: "algal.application-memory.v1", application: APPLICATION, schema: fx.schema,
        previous: null, scope: fx.scope, observations: [a, b, forged].sort(), hypotheses: [], withdrawn: [],
      });
      const badState = await writeRawState(fx, { memory: badMemory, previous: null, sequence: 0, operation: "forge-state" });
      const queryReject = await threw(fx.memory.query(badState, fx.query), "differs from trusted source decoding");
      // Counted determinism on the honest path.
      const honest = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: [a, b].sort(), hypotheses: [], withdrawn: [],
      });
      const honestState = await writeRawState(fx, { memory: honest, previous: null, sequence: 0, operation: "count-state" });
      const before2 = fx.host.calls.length;
      const d = await fx.memory.query(honestState, fx.query);
      const calls = fx.host.calls.slice(before2);
      eq(calls.filter(c => c.op === "decodeObservation").length, 2, "one decode per selected row");
      eq(calls.filter(c => c.op === "validateScope").length, 3, "snapshot scope plus one per row");
      eq(calls.filter(c => c.op === "currentFrontier").length, 1, "one attested-frontier read");
      eq(d.derivation.status, "supported", "honest rows support");
      return evidence({ snapshotReject, queryReject, decodeCount: 2, scopeCount: 3 });
    },
  },
  {
    id: "exact-parent-lineage",
    property: "MEM-02,EVO-05",
    surface: "state/commit fence",
    summary:
      "A successor memory names its exact predecessor and cannot silently " +
      "drop selected rows or withdrawals; a committed memory transition " +
      "must carry a successor of the currently-selected snapshot; and " +
      "retained-history replay refuses a hand-written state whose " +
      "transition request does not normalize.",
    async run() {
      const fx = await authorityFixture();
      const a = await fx.admit("tool-a", "supported");
      const m1 = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: [a], hypotheses: [], withdrawn: [],
      });
      const dropped = await threw(fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: m1, scope: fx.scope,
        observations: [], hypotheses: [], withdrawn: [],
      }), "silently disappear");
      const m2 = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: m1, scope: fx.scope,
        observations: [a], hypotheses: [], withdrawn: [a],
      });
      const unwithdrawn = await threw(fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: m2, scope: fx.scope,
        observations: [a], hypotheses: [], withdrawn: [],
      }), "silently disappear");
      // Committed transitions: the successor must name the current snapshot.
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const b = await fx.admit("tool-b", "supported");
      const stray = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: fx.genesisMemory, scope: fx.scope,
        observations: [...await selectedObservations(fx, s1), b].sort(), hypotheses: [], withdrawn: [],
      });
      // `stray` skips the committed successor yet keeps its rows plus one —
      // content-addressed, so it is a distinct record, and its `previous`
      // field names the genesis memory instead of the current one.
      expect(stray !== s1.state.memory, "stray successor is a distinct record");
      const predecessor = await threw(fx.lifecycle.commit({
        application: APPLICATION, operation: ref("op-stray"), kind: "memory",
        expectedHead: s1.digest, revision: s1.state.revision, memory: stray,
        intents: [], evidence: [], causedBy: null,
      }), "preserve the current snapshot as its predecessor");
      // Retained-history replay: a hand-written state whose transition
      // request does not normalize is rejected when the history is read.
      const bogus = await writeRawState(fx, {
        memory: s1.state.memory, previous: s1.digest, sequence: 2, operation: "bogus-tail",
      });
      await fx.storage.writeHead(APPLICATION, json({
        contract: "algal.application-head.v1", application: APPLICATION, state: bogus,
      }));
      const replay = await threw(fx.lifecycle.inspect(APPLICATION), "normalized request");
      return evidence({ dropped, unwithdrawn, predecessor, replay });
    },
  },
  {
    id: "no-scope-widening-on-replay",
    property: "MEM-02",
    surface: "state/commit fence",
    summary:
      "Replaying a memory under a scope whose environment, declared " +
      "procedure completeness, or dependency binding versions differ from " +
      "the row's recorded scope yields `stale` with no selected sources — " +
      "the recorded environment rows are rechecked field-by-field and scope " +
      "is never widened on replay.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const row = (await selectedObservations(fx, s1))[0]!;
      const scopeBody = json(await fx.store.getValue(fx.scope)) as Record<string, JsonValue>;
      const envScope = await fx.memory.putScope({ ...scopeBody, environment: "other-env" });
      const incompleteScope = await fx.memory.putScope({ ...scopeBody, completeFor: [] });
      // Dependency-bound procedure: the binding version is part of scope.
      const depsBase = {
        ...scopeBody, completeFor: [fx.procedureDeps],
        bindings: [{ key: "tool", version: { kind: "store", reference: fx.toolV1 } }],
      };
      const depsScopeV1 = await fx.memory.putScope(json(depsBase));
      const depsScopeV2 = await fx.memory.putScope(json({
        ...depsBase, bindings: [{ key: "tool", version: { kind: "store", reference: fx.toolV2 } }],
      }));
      const depRow = await fx.admit("tool-dep", "supported", { scope: depsScopeV1, procedure: fx.procedureDeps });
      const depq = await putApplicationRecord(fx.store, {
        contract: "algal.application-memory-query.v1", id: "depq",
        schema: fx.schema, program: fx.program, procedures: [fx.procedureDeps],
        polarityColumn: 1, conflict: "single-value",
      });
      const depRevision = await foreignRevision(fx, depq);
      const statuses: Record<string, string> = {};
      for (const [name, scopeRef, rows, revisionRef] of [
        ["environment", envScope, [row], undefined],
        ["completeness", incompleteScope, [row], undefined],
        ["dependency-version", depsScopeV2, [depRow], depRevision],
      ] as const) {
        const mem = await fx.memory.snapshot({
          application: APPLICATION, schema: fx.schema, previous: null, scope: scopeRef,
          observations: [...rows].sort(), hypotheses: [], withdrawn: [],
        });
        const state = await writeRawState(fx, {
          memory: mem, previous: null, sequence: 0,
          operation: `wide-${name}`, revision: revisionRef ?? fx.revision,
        });
        const d = await fx.memory.query(state, name === "dependency-version" ? depq : fx.query);
        statuses[name] = d.derivation.status;
        expect(d.derivation.status === "stale", `${name}: replay is stale, not widened to supported`);
        eq(d.derivation.sourceRefs.length, 0, `${name}: no sources selected under the widened scope`);
      }
      return evidence({ statuses: statuses as unknown as JsonValue });
    },
  },
  {
    id: "withdrawal-is-not-deletion",
    property: "MEM-02,MEM-03",
    surface: "state/commit fence",
    summary:
      "A withdrawn observation stays named in the memory record and " +
      "resolvable in CAS, contributes no fact and no source, and its prior " +
      "supported derivation cannot start work under the post-withdrawal " +
      "state.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const obs = (await selectedObservations(fx, s1))[0]!;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      eq(d1.derivation.status, "supported", "pre-withdrawal support");
      const withdrawnMemory = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: s1.state.memory, scope: fx.scope,
        observations: [obs], hypotheses: [], withdrawn: [obs],
      });
      const s2 = await fx.lifecycle.commit({
        application: APPLICATION, operation: ref("op-withdraw"), kind: "memory",
        expectedHead: s1.digest, revision: s1.state.revision, memory: withdrawnMemory,
        intents: [], evidence: [], causedBy: null,
      });
      const d2 = await fx.memory.query(s2.digest, fx.query);
      eq(d2.derivation.status, "unknown", "withdrawn support is absent, not degraded to supported");
      eq(d2.derivation.sourceRefs.length, 0, "no sources under withdrawal");
      const input = await inputFor(fx, "probe");
      const msg = await threw(requestExecution(fx.lifecycle, {
        application: APPLICATION, operation: ref("op-exec-wd"),
        expectedHead: s2.digest, expectedMemory: s2.state.memory,
        entrypoint: "run", input, derivation: d1.ref,
      }), "not bound to a verified supported applicability derivation");
      parseMemoryObservation(await fx.store.getValue(obs));
      const mem2 = await fx.readState(s2.digest);
      expect(mem2.memory.withdrawn.includes(obs), "the withdrawal marker is retained");
      expect(mem2.memory.observations.includes(obs), "the row is still named, not deleted");
      return evidence({ before: d1.derivation.status, after: d2.derivation.status, observation: obs, fence: msg });
    },
  },

  // ------------------------------------------------------------ D: boundary
  {
    id: "foreign-admission-rejected",
    property: "MEM-02,EVO-05",
    surface: "admission-host fence",
    summary:
      "An observation's admission field binds the admitting host's " +
      "identity. A second host (different attestation) derives a different " +
      "identity; under it the foreign row refuses at snapshot and at query " +
      "replay, and the host mints its own distinct record — claims do not " +
      "transfer across authorities.",
    async run() {
      const fx = await authorityFixture();
      const a = await fx.admit("tool-a", "supported");
      const record = json(await fx.store.getValue(a)) as Record<string, JsonValue>;
      eq(record.admission, fx.host.identity, "the record binds the admitting host");
      // Host B: identical decoders/routes, different attestation → different
      // authority identity.
      const policyB = { ...(fx.policyInput as Record<string, JsonValue>), attestation: "algal.other-attestation.v1" };
      const hostB = instrumentedPolicyHost(policyB, { memoryEngine: fx.engine });
      expect(hostB.identity !== fx.host.identity, "foreign policy yields a foreign authority identity");
      const serviceB = new ApplicationMemoryService({ store: fx.store, engine: fx.engine, admission: hostB });
      // B admits its own scope (its attestation contract) and mints its own
      // observation record over the same raw — a distinct CAS identity.
      const attestationB = await putApplicationRecord(fx.store, { contract: "algal.other-attestation.v1" });
      const scopeBody = json(await fx.store.getValue(fx.scope)) as Record<string, JsonValue>;
      const scopeB = await serviceB.putScope(json({ ...scopeBody, attestation: attestationB }));
      const bRecord = await serviceB.observe({
        application: APPLICATION, scope: scopeB, procedure: fx.procedure,
        raw: record.raw as Digest, receipt: record.receipt as Digest, decoder: fx.decoder,
      });
      expect(bRecord !== a, "host B's admission is a distinct record");
      eq((json(await fx.store.getValue(bRecord)) as Record<string, JsonValue>).admission, hostB.identity, "B's record binds B");
      // A record replaying A's raw evidence under a B-admitted scope still
      // carries A's admission — foreign under B's authority.
      const foreignRow = await fx.forgeObservation(
        record.claims as unknown as MemoryClaim[], {
          scope: scopeB, admission: fx.host.identity,
          raw: record.raw as Digest, receipt: record.receipt as Digest,
        });
      const rejected = await threw(serviceB.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: scopeB,
        observations: [foreignRow], hypotheses: [], withdrawn: [],
      }), "Unadmitted observation authority");
      // A's own scope is itself foreign under B (different attestation).
      const scopeReject = await threw(serviceB.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: [a], hypotheses: [], withdrawn: [],
      }), "admitted contract");
      // The mirror: a record claiming B's identity under A's scope is foreign
      // under A's service.
      const foreign = await fx.forgeObservation(
        [{ relation: "available", tuple: ["forged"], polarity: "supported" }],
        { admission: hostB.identity },
      );
      const mirror = await threw(fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: [foreign], hypotheses: [], withdrawn: [],
      }), "Unadmitted observation authority");
      const memB = await putApplicationRecord(fx.store, {
        contract: "algal.application-memory.v1", application: APPLICATION, schema: fx.schema,
        previous: null, scope: scopeB, observations: [foreignRow], hypotheses: [], withdrawn: [],
      });
      const stateB = await writeRawState(fx, { memory: memB, previous: null, sequence: 0, operation: "foreign-state-b" });
      const queryReject = await threw(serviceB.query(stateB, fx.query), "Unadmitted observation authority");
      return evidence({ snapshotReject: rejected, mirrorReject: mirror, scopeReject, queryReject, hostA: fx.host.identity, hostB: hostB.identity });
    },
  },
  {
    id: "engine-identity-is-authority",
    property: "MEM-02",
    surface: "engine fence",
    summary:
      "The derivation binds the producing engine's identity. Host admission " +
      "reproduces the query under the engine it was configured with, so " +
      "evidence produced under engine E1 cannot authorize work through a " +
      "host reproducing under E2 — even a record that is byte-identical " +
      "except for its engine field.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      eq(d1.derivation.engine, fx.engine.identity, "derivation binds the producing engine");
      const engine2 = checkerEngine({ contract: "algal.memory-authority-engine.v1", lane: "second" });
      expect(engine2.identity !== fx.engine.identity, "distinct engine identity");
      const hostE2 = instrumentedPolicyHost(fx.policyInput, { memoryEngine: engine2 });
      const lifecycleE2 = new ApplicationCore(fx.storage, hostE2);
      const input = await inputFor(fx, "probe");
      const rejected = await threw(requestExecution(lifecycleE2, {
        application: APPLICATION, operation: ref("op-exec-e2"),
        expectedHead: s1.digest, expectedMemory: s1.state.memory,
        entrypoint: "run", input, derivation: d1.ref,
      }), "reproduced supported");
      // The E2 host's own production authorizes under E2 — a different
      // record by exactly the engine field.
      const memoryE2 = new ApplicationMemoryService({ store: fx.store, engine: engine2, admission: hostE2 });
      const dE2 = await memoryE2.query(s1.digest, fx.query);
      eq(dE2.derivation.engine, engine2.identity, "E2 derivation binds E2");
      expect(dE2.ref !== d1.ref, "different engine → different derivation record");
      eq((json(await fx.store.getValue(dE2.ref)) as Record<string, JsonValue>).admission,
        fx.host.identity, "same policy → same admission identity (engine is not part of it)");
      const committed = await requestExecution(lifecycleE2, {
        application: APPLICATION, operation: ref("op-exec-e2-ok"),
        expectedHead: s1.digest, expectedMemory: s1.state.memory,
        entrypoint: "run", input, derivation: dE2.ref,
      });
      eq(committed.transition.intents.length, 1, "E2-produced evidence authorizes under E2");
      // At the new head, an honest E1 production (same host identity — the
      // engine is not part of it) is still foreign to an E2 reproducer.
      const d3 = await fx.memory.query(committed.digest, fx.query);
      eq(d3.derivation.engine, fx.engine.identity, "production under E1 at the new head");
      eq(d3.derivation.capturedState, committed.digest, "bound to the current head");
      const transferReject = await threw(requestExecution(lifecycleE2, {
        application: APPLICATION, operation: ref("op-exec-e2-transfer"),
        expectedHead: committed.digest, expectedMemory: committed.state.memory,
        entrypoint: "run", input, derivation: d3.ref,
      }), "reproduced supported");
      // And the engine field is inside the content identity: rebading the
      // E2 production back to E1 reproduces the E1 record byte-for-byte —
      // `rebadged === d1.ref` — which was already refused above. There is
      // no "borrowed" engine authority.
      const rebadged = await rebindDerivation(fx, dE2.ref, { engine: fx.engine.identity });
      eq(rebadged, d1.ref, "a record claiming engine E1 is exactly the E1 record");
      return evidence({ rejected, transferReject, e1: fx.engine.identity, e2: engine2.identity, rebadged });
    },
  },
  {
    id: "withheld-authority-fails-closed",
    property: "MEM-06",
    surface: "fail-closed boundary",
    summary:
      "Refused decoders, refused scope attestation, an uncertain attested " +
      "frontier, a scope bound to an uncertain frontier, an aborted signal " +
      "and an over-limit fact set each produce a bounded non-supported " +
      "outcome or a refused call — never a degraded or unbounded supported " +
      "answer.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const rejections: Record<string, JsonValue> = {};
      // (a) Host refuses to decode: observe cannot mint the record, and
      //     re-validation of the existing memory refuses.
      fx.host.denyDecoders.add(fx.decoder);
      rejections.decoderWithheld = await threw(fx.admit("tool-x", "supported"), "decoder refused");
      rejections.snapshotWithheld = await threw(fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: await selectedObservations(fx, s1), hypotheses: [], withdrawn: [],
      }), "decoder refused");
      fx.host.denyDecoders.delete(fx.decoder);
      // (b) Host refuses scope validation: query throws — no derivation,
      //     no degraded answer.
      fx.host.denyScopes = true;
      rejections.scopeWithheld = await threw(fx.memory.query(s1.digest, fx.query), "scope validation refused");
      fx.host.denyScopes = false;
      // (c) Attested frontier moves to an uncertain record: every row is
      //     stale under it — a bounded status, not an exception.
      const uncertain = await fx.frontierAfter(fx.frontier0, { status: "uncertain" });
      fx.host.setFrontier(uncertain);
      const stale = await fx.memory.query(s1.digest, fx.query);
      eq(stale.derivation.status, "stale", "uncertain frontier yields stale");
      rejections.uncertainFrontier = stale.derivation.status;
      // (d) A scope bound to an uncertain frontier can be written, but the
      //     decode path refuses to admit observations under it.
      const uScope = await fx.memory.putScope(json({
        ...(json(await fx.store.getValue(fx.scope)) as Record<string, JsonValue>),
        frontier: uncertain,
      }));
      rejections.uncertainDecode = await threw(
        fx.admit("tool-u", "supported", { scope: uScope }),
        "Uncertain mutation cannot admit",
      );
      fx.host.setFrontier(fx.frontier0);
      // (e) Cancellation is a typed status, not support.
      const cancelled = await fx.memory.query(s1.digest, fx.query, AbortSignal.abort());
      eq(cancelled.derivation.status, "cancelled", "aborted signal yields cancelled");
      rejections.cancelled = cancelled.derivation.status;
      // (f) Over-limit fact sets exhaust rather than truncate to a supported
      //     subset: 5 rows × 32 claims = 160 facts > the 128 bound.
      const rows: Digest[] = [];
      for (let i = 0; i < 5; i++) {
        const claims: MemoryClaim[] = Array.from({ length: 32 }, (_, j) => ({
          relation: "available", tuple: [`t-${i}-${j}`], polarity: "supported" as const,
        }));
        rows.push(await fx.admit(`t-${i}`, "supported", {
          raw: json({ contract: "algal.probe-raw.v1", batch: i, claims }),
        }));
      }
      const big = await fx.memory.snapshot({
        application: APPLICATION, schema: fx.schema, previous: null, scope: fx.scope,
        observations: rows.sort(), hypotheses: [], withdrawn: [],
      });
      const bigState = await writeRawState(fx, { memory: big, previous: null, sequence: 0, operation: "big-state" });
      const exhausted = await fx.memory.query(bigState, fx.query);
      eq(exhausted.derivation.status, "exhausted", "over-limit fact set exhausts");
      eq(exhausted.derivation.reason, "fact-limit", "typed exhaustion reason");
      eq(exhausted.derivation.verified, false, "exhaustion is not verified");
      eq(exhausted.derivation.result, null, "exhaustion retains no result");
      rejections.factLimit = exhausted.derivation.status;
      return evidence(rejections);
    },
  },
  {
    id: "engine-dishonesty-fails-closed",
    property: "MEM-06",
    surface: "fail-closed boundary",
    summary:
      "Engine envelopes that misbind the snapshot or program, decline the " +
      "witness policy, claim completeness falsely, or smuggle extra rows " +
      "fail closed to `failed` with nothing retained — the service's own " +
      "binding checks precede and gate verification.",
    async run() {
      const fx = await authorityFixture();
      const s1 = (await fx.observe("tool-a", "supported", fx.genesis, "a")).snapshot;
      const honest = await fx.memory.query(s1.digest, fx.query);
      const result = json(await fx.store.getValue(honest.derivation.result!)) as Record<string, JsonValue>;
      const outcomes: Record<string, JsonValue> = {};
      const tamper = async (label: string, patch: Record<string, JsonValue>) => {
        const engine = {
          ...checkerEngine(),
          async query() { return { kind: "complete" as const, result: json({ ...result, ...patch }) }; },
        };
        const service = new ApplicationMemoryService({ store: fx.store, engine, admission: fx.host });
        const out = await service.query(s1.digest, fx.query);
        expect(out.derivation.status === "failed", `${label}: fails closed`);
        expect(out.derivation.verified === false, `${label}: not verified`);
        expect(out.derivation.result === null, `${label}: retains no result`);
        outcomes[label] = out.derivation.status;
      };
      await tamper("foreign-snapshot", { snapshot: ref("other-snapshot") });
      await tamper("foreign-program", { program: ref("other-program") });
      await tamper("witness-policy", { witnessPolicy: "any-derivation" });
      await tamper("incomplete", { complete: false });
      await tamper("extra-row", {
        rows: [...(result.rows as JsonValue[]),
          { tuple: ["tool-a", "supported"], proof: "sha256:" + "0".repeat(64) }],
      });
      for (const [label, engine] of [
        ["thrown", { ...checkerEngine(), async query() { throw new Error("engine exploded"); } }],
        ["verify-refused", { ...checkerEngine(), async verify() { return false; } }],
      ] as const) {
        const service = new ApplicationMemoryService({ store: fx.store, engine, admission: fx.host });
        const out = await service.query(s1.digest, fx.query);
        eq(out.derivation.status, "failed", `${label}: fails closed`);
        eq(out.derivation.reason, "query-or-verification-failed", `${label}: typed reason`);
        outcomes[label] = out.derivation.status;
      }
      return evidence(outcomes);
    },
  },
  {
    id: "investigation-requests-bind-origin",
    property: "MEM-02,EVO-05",
    surface: "captured-state binding",
    summary:
      "A non-supported derivation may only mint bounded investigation work: " +
      "requests bind the exact state, memory, entrypoint, query, procedures " +
      "and produced derivation; evidence replay re-reads the request and " +
      "refuses one that cites a supported derivation.",
    async run() {
      const fx = await authorityFixture();
      const scheduled = await scheduleInvestigations(fx.lifecycle, fx.memory, {
        application: APPLICATION, operation: ref("op-inv-1"),
        expectedHead: fx.genesis.digest, expectedMemory: fx.genesis.state.memory,
        route: "inbox",
      });
      expect(scheduled.snapshot !== null, "investigation transition committed");
      eq(scheduled.derivations.length, 1, "one entrypoint derivation");
      eq(scheduled.derivations[0]!.status, "unknown", "the genesis query is unknown");
      eq(scheduled.requests.length, 1, "one investigation request minted");
      const request = parseInvestigationRequest(await fx.store.getValue(scheduled.requests[0]!));
      eq(request.state, fx.genesis.digest, "request binds the queried state");
      eq(request.memory, fx.genesis.state.memory, "request binds the memory");
      eq(request.entrypoint, "run", "request binds the entrypoint");
      eq(request.query, fx.query, "request binds the applicability query");
      expect(sameSet(request.procedures, [fx.procedure]), "request names the query's procedures");
      eq(request.derivation, scheduled.derivations[0]!.derivation, "request cites the produced derivation");
      const collected = await collectApplicationViewEvidence(
        fx.lifecycle, await fx.lifecycle.history(APPLICATION), [],
      );
      const workRow = collected.work.find(w => w.request === scheduled.requests[0]!);
      expect(workRow !== undefined, "the request is visible as work evidence");
      eq(workRow!.status, "pending", "undelivered");
      // A request citing a supported derivation is malformed on replay —
      // investigations exist only where support is absent.
      const s1 = (await fx.observe("tool-a", "supported", scheduled.snapshot!, "a")).snapshot;
      const d1 = await fx.memory.query(s1.digest, fx.query);
      eq(d1.derivation.status, "supported", "supported derivation produced");
      const badRequest = await putApplicationRecord(fx.store, {
        contract: "algal.application-investigation-request.v1",
        application: APPLICATION, state: s1.digest, memory: s1.state.memory,
        entrypoint: "run", query: fx.query, procedures: [fx.procedure],
        derivation: d1.ref,
      });
      await fx.lifecycle.commit({
        application: APPLICATION, operation: ref("op-inv-bad"), kind: "investigate",
        expectedHead: s1.digest, revision: s1.state.revision, memory: s1.state.memory,
        intents: [{ kind: "deliver", route: "inbox", message: badRequest }],
        evidence: [], causedBy: null,
      });
      const forged = await threw(
        collectApplicationViewEvidence(fx.lifecycle, await fx.lifecycle.history(APPLICATION), []),
        "investigation crosses originating query/state",
      );
      return evidence({
        request: scheduled.requests[0]!, status: scheduled.derivations[0]!.status, forged,
      });
    },
  },
];

export const AUTHORITY_CASES: readonly AuthorityCase[] = CASES;

export interface MemoryAuthorityReport {
  suite: "memory-authority";
  total: number;
  satisfied: number;
  cases: {
    id: string; property: string; surface: string;
    status: "satisfied" | "failed"; detail?: string;
    evidence?: Record<string, JsonValue>;
  }[];
}

export async function runMemoryAuthority(): Promise<MemoryAuthorityReport> {
  const cases: MemoryAuthorityReport["cases"] = [];
  for (const c of CASES) {
    try {
      const result = await c.run();
      cases.push({ id: c.id, property: c.property, surface: c.surface, status: "satisfied", evidence: result.evidence });
    } catch (error) {
      cases.push({
        id: c.id, property: c.property, surface: c.surface, status: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    suite: "memory-authority", total: CASES.length,
    satisfied: cases.filter(x => x.status === "satisfied").length, cases,
  };
}
