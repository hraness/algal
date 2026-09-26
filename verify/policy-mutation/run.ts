/**
 * Probe registry + runner for the `policy-mutation` suite.
 *
 * A probe is one decision surface of the production policy host (or one of
 * the seams it delegates to). Each probe's `seed` builds a fresh mutable
 * context from a world, and `decide` runs the real call. The runner replays
 * every mutant's probe on a baseline environment and a mutated environment,
 * then classifies the outcome against the declared expectation — including
 * the declared admission-identity effect.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ApplicationMemoryService, parseMemoryFrontier, parseMemoryProcedure, parseMemoryScope,
  type MemoryQueryEngine,
} from "../../src/application-memory";
import { applicationJson, parseWorkIntent, type WorkIntent } from "../../src/application-contract";
import {
  applicationProcessName, parseApplicationCommand,
  type ApplicationCommand, type ApplicationDispatch, type ApplicationDispatchPlan,
  type ApplicationDispatchOutcome, type ApplicationSnapshot,
} from "../../src/application-core";
import {
  admitApplicationResearchActivation, verifyApplicationResearchEvaluation,
} from "../../src/application-research";
import { capabilityHandle } from "../../src/capabilities";
import { errorReport } from "../../src/errors";
import { canonicalize, type JsonValue } from "../../src/values";
import type { Digest } from "../../src/digest";
import {
  APPLICATION, ENVIRONMENT, PROFILE_DIGEST, ref,
  freshChannelsDir, hostFor, policyFixture, worldFixture,
  type HostOptions, type LiteWorld, type PolicyFixture, type PolicyHost,
} from "./harness";
import {
  FIELD_LEDGER, MUTANTS,
  type MutantExpect, type PolicyMutant, type ProbeEnv, type ProbeId, type ProbeOutcome,
} from "./mutants";

const json = applicationJson;

interface ProbeDef {
  /** Baseline context + option seeds, built from the world the probe runs
   *  against. Mutants edit `ctx`/`policy`/`options` after seeding. */
  seed(world: LiteWorld, fx: PolicyFixture): Promise<{ ctx: Record<string, unknown>; options?: Partial<HostOptions> }>;
  /** Run the production decision; returns the normalized decision payload. */
  decide(env: ProbeEnv, host: PolicyHost): Promise<JsonValue>;
  /** Every run (baseline and mutant) mints a fresh world under `env.policy`
   *  — required when the probed call has durable side effects. */
  isolate?: boolean;
}

const commitCtx = async (world: LiteWorld, over: {
  kind: ApplicationCommand["kind"];
  head: ApplicationSnapshot | null;
  revision: Digest;
  memory: Digest;
  intents?: unknown[];
  evidence?: Digest[];
}) => ({
  command: parseApplicationCommand(json({
    application: APPLICATION,
    operation: ref({ contract: "algal.probe-operation.v1", kind: over.kind, memory: over.memory }),
    kind: over.kind, expectedHead: over.head === null ? null : over.head.digest,
    revision: over.revision, memory: over.memory,
    intents: over.intents ?? [], evidence: over.evidence ?? [], causedBy: null,
  })),
  current: over.head,
  previousRevision: over.head === null ? null : world.records.revisionParsed,
});

const admit = async (env: ProbeEnv, host: PolicyHost): Promise<JsonValue> => {
  await host.admitCommit({
    command: env.ctx["command"] as ApplicationCommand,
    current: (env.ctx["current"] ?? null) as ApplicationSnapshot | null,
    revision: env.ctx["revision"] as never,
    previousRevision: (env.ctx["previousRevision"] ?? null) as never,
    pending: (env.ctx["pending"] ?? []) as never,
    store: env.world.store,
  });
  return "admitted";
};

const planDetail = (plan: ApplicationDispatchPlan): JsonValue => {
  if (plan.kind === "delivery") return json({ kind: "delivery", recipient: plan.recipient, hostProfile: plan.hostProfile });
  const b = plan.binding;
  return json({
    kind: "episode", access: b.access, hostProfile: b.hostProfile,
    entrypoint: b.entrypoint, maxGenerations: b.maxGenerations, process: b.process,
  });
};

const admitDispatch = async (env: ProbeEnv, host: PolicyHost): Promise<JsonValue> => {
  const plan = await host.admitDispatch!({
    current: env.ctx["current"] as ApplicationSnapshot,
    snapshot: env.ctx["snapshot"] as ApplicationSnapshot,
    intent: env.ctx["intent"] as WorkIntent,
    previousDispatch: (env.ctx["previousDispatch"] ?? null) as ApplicationDispatch | null,
    store: env.world.store,
  });
  return planDetail(plan as ApplicationDispatchPlan);
};

/** The dispatch record the probes hand to `dispatch`/`reconcile` — exactly
 *  the shape `ApplicationCore` mints after `admitDispatch`. */
const deliveryDispatch = (sourceState: Digest, intentRef: Digest, plan: ApplicationDispatchPlan): ApplicationDispatch => ({
  contract: "algal.application-dispatch.v1",
  application: APPLICATION,
  intent: intentRef,
  sourceState,
  configurationDigest: ref({ contract: "algal.host-dispatcher.v1", policy: "seed" }),
  identity: ref({ contract: "algal.application-dispatch-identity.v1", application: APPLICATION, intent: intentRef, plan }),
  plan, status: "started", result: null, reason: null,
});

const deliveryPlan = (): ApplicationDispatchPlan => ({
  kind: "delivery",
  recipient: capabilityHandle("mailbox-send", "policy-mutation"),
  hostProfile: PROFILE_DIGEST,
});

const deliverySeed = async (world: LiteWorld) => {
  const plan = deliveryPlan();
  const intentRef = ref(world.intentDeliverWork);
  return {
    ctx: {
      current: world.sD, snapshot: world.sD,
      intent: structuredClone(world.intentDeliverWork),
      dispatch: deliveryDispatch(world.sD.digest, intentRef, plan),
    },
  };
};

const outcomeDetail = (outcome: unknown): JsonValue => {
  const o = outcome as ApplicationDispatchOutcome;
  return json(o.status === "settled"
    ? { status: o.status, resultKind: o.result.kind }
    : { status: o.status, reason: o.reason });
};

const PROBES: Record<ProbeId, ProbeDef> = {
  identity: {
    seed: async () => ({ ctx: {} }),
    decide: async (_env, host) => json({ identity: host.identity, configurationDigest: host.configurationDigest }),
  },
  "current-frontier": {
    seed: async () => ({ ctx: { application: APPLICATION } }),
    decide: async (env, host) => host.currentFrontier(env.ctx["application"] as string),
  },
  "commit-create": {
    seed: async world => ({
      ctx: {
        ...(await commitCtx(world, { kind: "create", head: null, revision: world.records.revision, memory: world.records.genesisMemory })),
        revision: world.records.revisionParsed,
        pending: [],
      },
    }),
    decide: admit,
  },
  "commit-create-research": {
    seed: async (world, fx) => ({
      ctx: {
        ...(await commitCtx(world, { kind: "create", head: null, revision: fx.research.revisionRef, memory: world.records.genesisMemory })),
        revision: fx.research.revisionParsed,
        pending: [],
      },
      options: { researchVerifier: fx.research.verifierV },
    }),
    decide: admit,
  },
  "commit-memory": {
    seed: async world => ({
      ctx: {
        ...(await commitCtx(world, { kind: "memory", head: world.genesis, revision: world.records.revision, memory: world.records.genesisMemory })),
        revision: world.records.revisionParsed,
        pending: [],
      },
    }),
    decide: admit,
  },
  "commit-deliver": {
    seed: async world => ({
      ctx: {
        ...(await commitCtx(world, {
          kind: "investigate", head: world.genesis, revision: world.records.revision, memory: world.records.genesisMemory,
          intents: [{ kind: "deliver", route: "inbox", message: world.records.message }],
        })),
        revision: world.records.revisionParsed,
        pending: [],
      },
    }),
    decide: admit,
  },
  "commit-episode": {
    seed: async world => ({
      ctx: {
        ...(await commitCtx(world, {
          kind: "investigate", head: world.sC, revision: world.sC.state.revision, memory: world.sC.state.memory,
          intents: [{ kind: "start-episode", entrypoint: "run", input: world.records.input }],
          evidence: [world.derivationC],
        })),
        revision: world.records.revisionParsed,
        pending: [],
      },
    }),
    decide: admit,
  },
  "commit-activate": {
    seed: async (world, fx) => ({
      ctx: {
        ...(await commitCtx(world, {
          kind: "activate", head: world.sD, revision: world.records.revision2, memory: world.sD.state.memory,
          evidence: [fx.evalM2],
        })),
        revision: world.records.revision2Parsed,
        pending: await world.lifecycle.undispatchedPending(APPLICATION, world.sD.digest),
      },
    }),
    decide: admit,
  },
  "commit-activate-selection": {
    seed: async (world, fx) => ({
      ctx: {
        ...(await commitCtx(world, {
          kind: "activate", head: world.sD, revision: world.records.revision2, memory: world.sD.state.memory,
          evidence: [fx.evalM2, fx.selectionPolicy].sort(),
        })),
        revision: world.records.revision2Parsed,
        pending: await world.lifecycle.undispatchedPending(APPLICATION, world.sD.digest),
      },
      options: { selectionEnvironment: ENVIRONMENT },
    }),
    decide: admit,
  },
  "commit-restore": {
    seed: async (world, fx) => ({
      ctx: {
        ...(await commitCtx(world, {
          kind: "restore", head: fx.sA, revision: fx.revisionRestored, memory: fx.sA.state.memory,
          evidence: [fx.restorationRecord],
        })),
        revision: fx.revisionRestoredParsed,
        previousRevision: world.records.revision2Parsed,
        pending: [],
      },
      options: { restorationPolicy: fx.restorationPolicy },
    }),
    decide: admit,
  },
  "commit-migrate": {
    seed: async world => ({
      ctx: {
        ...(await commitCtx(world, {
          kind: "migrate", head: world.sD, revision: world.records.revision, memory: world.sD.state.memory,
        })),
        revision: world.records.revisionParsed,
        pending: await world.lifecycle.undispatchedPending(APPLICATION, world.sD.digest),
      },
    }),
    decide: admit,
  },
  "admit-deliver": {
    seed: async world => ({
      ctx: { current: world.sD, snapshot: world.sD, intent: structuredClone(world.intentDeliverWork), previousDispatch: null },
    }),
    decide: admitDispatch,
  },
  "admit-deliver-alerts": {
    seed: async world => ({
      ctx: {
        current: world.sD, snapshot: world.sD, previousDispatch: null,
        intent: parseWorkIntent(json({
          contract: "algal.application-intent.v1", application: APPLICATION,
          operation: ref({ contract: "algal.probe-operation.v1", n: 9 }), ordinal: 0,
          kind: "deliver", route: "alerts", message: world.records.message,
        })),
      },
    }),
    decide: admitDispatch,
  },
  "admit-episode": {
    seed: async world => ({
      ctx: { current: world.sC, snapshot: world.sC, intent: structuredClone(world.intentEpisodeWork), previousDispatch: null },
    }),
    decide: admitDispatch,
  },
  "validate-scope": {
    seed: async world => ({
      ctx: {
        scope: parseMemoryScope(await world.store.getValue(world.records.scope)),
        frontier: parseMemoryFrontier(await world.store.getValue(world.records.frontier0)),
        attestation: await world.store.getValue(world.records.attestation),
      },
    }),
    decide: async (env, host) => {
      await host.validateScope({
        scope: env.ctx["scope"] as never,
        frontier: env.ctx["frontier"] as never,
        attestation: env.ctx["attestation"] as JsonValue,
      });
      return "admitted";
    },
  },
  "scope-mint": {
    seed: async world => ({
      ctx: {
        scopeInput: {
          contract: "algal.application-memory-scope.v1",
          application: APPLICATION, environment: ENVIRONMENT, task: "task-1",
          frontier: world.records.frontier0, bindings: [],
          completeFor: [world.records.procedure], attestation: world.records.attestation,
        },
      },
    }),
    decide: async (env, host) => {
      const service = new ApplicationMemoryService({
        store: env.world.store, engine: env.world.engine, admission: host,
      });
      return json(await service.putScope(env.ctx["scopeInput"]));
    },
  },
  "validate-memory": {
    seed: async () => ({ ctx: {} }),
    decide: async (env, host) => {
      const service = new ApplicationMemoryService({
        store: env.world.store,
        engine: (env.options.memoryEngine ?? env.fx.engineA) as MemoryQueryEngine,
        admission: host,
      });
      const snapshot = await service.validateForRevision(env.world.sC.state.memory, env.world.records.revisionParsed);
      return json(snapshot);
    },
  },
  "decode-raw": {
    seed: async world => ({
      ctx: {
        observation: {
          application: APPLICATION, scope: world.records.scope, procedure: world.records.procedure,
          raw: world.records.raw, receipt: world.records.receipt, decoder: world.records.decoder,
        },
        scope: parseMemoryScope(await world.store.getValue(world.records.scope)),
        frontier: parseMemoryFrontier(await world.store.getValue(world.records.frontier0)),
        procedure: parseMemoryProcedure(await world.store.getValue(world.records.procedure)),
        raw: await world.store.getValue(world.records.raw),
        receipt: await world.store.getValue(world.records.receipt),
      },
    }),
    decide: async (env, host) => json(await host.decodeObservation(env.ctx as never)),
  },
  "decode-receipted": {
    seed: async world => ({
      ctx: {
        observation: {
          application: APPLICATION, scope: world.records.scope, procedure: world.records.procedure,
          raw: world.records.raw2, receipt: world.records.receipt2, decoder: world.records.decoder2,
        },
        scope: parseMemoryScope(await world.store.getValue(world.records.scope)),
        frontier: parseMemoryFrontier(await world.store.getValue(world.records.frontier0)),
        procedure: parseMemoryProcedure(await world.store.getValue(world.records.procedure)),
        raw: await world.store.getValue(world.records.raw2),
        receipt: await world.store.getValue(world.records.receipt2),
      },
    }),
    decide: async (env, host) => json(await host.decodeObservation(env.ctx as never)),
  },
  "exec-deliver": {
    seed: deliverySeed,
    decide: async (env, host) => outcomeDetail(await host.dispatch({
      current: env.ctx["current"] as ApplicationSnapshot,
      snapshot: env.ctx["snapshot"] as ApplicationSnapshot,
      intent: env.ctx["intent"] as WorkIntent,
      dispatch: env.ctx["dispatch"] as ApplicationDispatch,
    })),
  },
  "exec-episode": {
    seed: async world => {
      const intentRef = ref(world.intentEpisodeWork);
      const plan: ApplicationDispatchPlan = {
        kind: "episode",
        binding: {
          contract: "algal.application-episode.v1", application: APPLICATION,
          intent: intentRef, sourceState: world.sC.digest,
          revision: world.sC.state.revision, memory: world.sC.state.memory, epoch: world.sC.state.epoch,
          entrypoint: "run", manifest: world.records.manifest, arguments: world.records.input,
          process: applicationProcessName(APPLICATION, intentRef),
          maxGenerations: 1, hostProfile: PROFILE_DIGEST, access: "observe",
        },
      };
      return {
        ctx: {
          current: world.sC, snapshot: world.sC, intent: structuredClone(world.intentEpisodeWork),
          dispatch: deliveryDispatch(world.sC.digest, intentRef, plan),
        },
      };
    },
    decide: async (env, host) => outcomeDetail(await host.dispatch({
      current: env.ctx["current"] as ApplicationSnapshot,
      snapshot: env.ctx["snapshot"] as ApplicationSnapshot,
      intent: env.ctx["intent"] as WorkIntent,
      dispatch: env.ctx["dispatch"] as ApplicationDispatch,
    })),
  },
  "exec-reconcile": {
    seed: async world => {
      const seeded = await deliverySeed(world);
      return {
        ctx: {
          ...seeded.ctx,
          channelFile: {
            contract: "algal.host-channel.v2", route: "inbox",
            outcomes: [{ identity: (seeded.ctx["dispatch"] as ApplicationDispatch).identity, message: world.records.message }],
          },
        },
      };
    },
    decide: async (env, host) => {
      await writeFile(join(env.options.channelsDir, "inbox.json"), canonicalize(applicationJson(env.ctx["channelFile"])));
      return outcomeDetail(await host.reconcile!({
        current: env.ctx["current"] as ApplicationSnapshot,
        snapshot: env.ctx["snapshot"] as ApplicationSnapshot,
        intent: env.ctx["intent"] as WorkIntent,
        dispatch: env.ctx["dispatch"] as ApplicationDispatch,
      }));
    },
  },
  "dispatch-pending": {
    isolate: true,
    seed: async () => ({ ctx: {} }),
    decide: async env => {
      const attempts = await env.world.lifecycle.dispatchPending(APPLICATION, env.world.host);
      const row = attempts.find(a => a.intent === env.world.intentDeliver) ?? attempts[0];
      if (!row) throw new Error("dispatchPending produced no attempt");
      if (row.status === "denied") throw new Error(row.reason);
      return json({ contract: row.contract, status: row.status });
    },
  },
  "dispatch-reconcile": {
    seed: async () => ({ ctx: {} }),
    decide: async (env, host) => {
      // Two-phase stale-configuration probe: the world (and its dispatch
      // record) are minted under the BASE policy; reconciliation then runs
      // against `host` — the mutant's dispatcher configuration.
      const world = await worldFixture(env.fx.lite.policyInput, {
        memoryEngine: env.fx.engineA, channelsDir: await freshChannelsDir(),
      });
      await world.lifecycle.dispatchPending(APPLICATION, world.host);
      const updated = await world.lifecycle.reconcileDispatch(APPLICATION, world.intentEpisode, host);
      return json({ status: updated.status });
    },
  },
  "research-verify": {
    seed: async (_world, fx) => ({
      ctx: { expectedState: fx.research.stateRef },
      options: { researchVerifier: fx.research.verifierV },
    }),
    decide: async env => {
      const { verdict } = await verifyApplicationResearchEvaluation(
        env.fx.lite.store, env.fx.research.evaluationRef,
        env.ctx["expectedState"] as Digest,
        { verifier: env.options.researchVerifier as never },
      );
      return json(verdict);
    },
  },
  "research-activate": {
    seed: async (_world, fx) => ({
      ctx: {},
      options: { researchVerifier: fx.research.verifierV },
    }),
    decide: async env => {
      const result = await admitApplicationResearchActivation(
        env.fx.lite.store,
        {
          evaluation: env.fx.research.evaluationRef,
          expectedState: env.fx.research.stateRef,
          revision: env.fx.research.candidateRef,
        },
        { verifier: env.options.researchVerifier as never },
      );
      return json({ state: result.state, revision: result.revision });
    },
  },
};

async function runProbe(probe: ProbeId, env: ProbeEnv): Promise<ProbeOutcome> {
  let host: PolicyHost;
  try {
    host = hostFor(env.policy, env.options);
  } catch (error) {
    const r = errorReport(error);
    return { outcome: "reject", at: "construct", code: r.code, message: r.message };
  }
  try {
    return { outcome: "admit", detail: await PROBES[probe].decide(env, host) };
  } catch (error) {
    const r = errorReport(error);
    return { outcome: "reject", at: "decision", code: r.code, message: r.message };
  }
}

async function buildEnv(probe: ProbeId, fx: PolicyFixture): Promise<ProbeEnv> {
  const env: ProbeEnv = {
    fx,
    world: fx.lite,
    policy: structuredClone(fx.lite.policyInput),
    options: { channelsDir: await freshChannelsDir(), memoryEngine: fx.engineA },
    ctx: {},
  };
  const seeded = await PROBES[probe].seed(env.world, fx);
  // Seeded contexts alias shared world records — deep-clone so a mutant can
  // never poison another run through an in-place field edit.
  env.ctx = structuredClone(seeded.ctx);
  if (seeded.options) Object.assign(env.options, seeded.options);
  return env;
}

const canon = (v: JsonValue): string => canonicalize(applicationJson(v));

function evaluate(expect: MutantExpect, base: ProbeOutcome, got: ProbeOutcome, fx: PolicyFixture, control?: ProbeOutcome): boolean {
  switch (expect.kind) {
    case "reject":
      return got.outcome === "reject" && got.at === expect.at && got.message.includes(expect.part);
    case "flip":
      // Widening mutant: the SAME context/policy-input change must deny
      // under the base policy and admit under the mutated policy.
      return control !== undefined && control.outcome === "reject" && got.outcome === "admit";
    case "admit":
      if (base.outcome !== "admit" || got.outcome !== "admit") return false;
      return expect.change === "different"
        ? canon(base.detail) !== canon(got.detail)
        : canon(base.detail) === canon(got.detail);
    case "identity": {
      if (got.outcome !== "admit") return false;
      const detail = got.detail as { identity: string; configurationDigest: string };
      return (expect.admission === "same") === (detail.identity === fx.baseIdentity)
        && (expect.configuration === "same") === (detail.configurationDigest === fx.baseConfiguration);
    }
  }
}

export interface MutantResult {
  id: string;
  field: string;
  class: string;
  probe: ProbeId;
  expect: MutantExpect;
  baseline: ProbeOutcome;
  observed: ProbeOutcome;
  pass: boolean;
  survivor: string | undefined;
  identity: { declared: PolicyMutant["identityEffect"] | undefined; observed: "identity" | "configuration" | "none" | undefined; pass: boolean | undefined };
}

export interface PolicyMutationReport {
  contract: "algal.policy-mutation-report.v1";
  suite: "policy-mutation";
  mutants: number;
  killed: number;
  survived: number;                    // declared survivors that behaved as declared
  failures: { id: string; want: string; got: ProbeOutcome }[];
  probes: { id: ProbeId; baseline: ProbeOutcome }[];
  ledger: { fields: number; excluded: number; covered: number };
}

export async function runPolicyMutation(fixture?: PolicyFixture): Promise<PolicyMutationReport> {
  const fx = fixture ?? await policyFixture();
  const baselines = new Map<ProbeId, ProbeOutcome>();
  const baselineFor = async (probe: ProbeId): Promise<ProbeOutcome> => {
    if (!baselines.has(probe)) {
      const env = await buildEnv(probe, fx);
      if (PROBES[probe].isolate) env.world = await worldFixture(env.policy, env.options);
      baselines.set(probe, await runProbe(probe, env));
    }
    return baselines.get(probe)!;
  };
  const results: MutantResult[] = [];
  const failures: PolicyMutationReport["failures"] = [];
  for (const mutant of MUTANTS) {
    const baseline = await baselineFor(mutant.probe);
    const env = await buildEnv(mutant.probe, fx);
    let observed: ProbeOutcome;
    try {
      if (mutant.ownWorld || PROBES[mutant.probe].isolate) {
        // Mutants on world-rebuilding probes may only touch `policy`/`options`
        // — the world is minted under the mutated policy and the context is
        // re-seeded from it.
        await mutant.mutate(env);
        env.world = await worldFixture(env.policy, env.options);
        env.ctx = (await PROBES[mutant.probe].seed(env.world, fx)).ctx;
      } else {
        await mutant.mutate(env);
      }
      observed = await runProbe(mutant.probe, env);
    } catch (error) {
      const r = errorReport(error);
      observed = { outcome: "reject", at: "construct", code: r.code, message: r.message };
    }
    // Declared admission-identity effect: construct the mutant host and
    // compare its digests against the base host.
    let identityObserved: MutantResult["identity"]["observed"];
    let identityPass: boolean | undefined;
    if (mutant.identityEffect !== undefined) {
      try {
        const h = hostFor(env.policy, env.options);
        identityObserved = h.identity !== fx.baseIdentity ? "identity"
          : h.configurationDigest !== fx.baseConfiguration ? "configuration" : "none";
        identityPass = identityObserved === mutant.identityEffect;
      } catch {
        identityPass = false;
      }
    }
    // For widening flips, replay the same mutation under the BASE policy —
    // the control must deny for the flip to be meaningful.
    let control: ProbeOutcome | undefined;
    if (mutant.expect.kind === "flip" && observed.outcome === "admit") {
      const controlEnv = await buildEnv(mutant.probe, fx);
      await mutant.mutate(controlEnv);
      controlEnv.policy = structuredClone(fx.lite.policyInput);
      controlEnv.options = { channelsDir: await freshChannelsDir(), memoryEngine: fx.engineA, ...(await PROBES[mutant.probe].seed(controlEnv.world, fx)).options };
      control = await runProbe(mutant.probe, controlEnv);
    }
    const pass = evaluate(mutant.expect, baseline, observed, fx, control) && identityPass !== false;
    results.push({
      id: mutant.id, field: mutant.field, class: mutant.class, probe: mutant.probe,
      expect: mutant.expect, baseline, observed, pass,
      survivor: mutant.survivor,
      identity: { declared: mutant.identityEffect, observed: identityObserved, pass: identityPass },
    });
    if (!pass) failures.push({ id: mutant.id, want: JSON.stringify(mutant.expect), got: observed });
  }
  return {
    contract: "algal.policy-mutation-report.v1",
    suite: "policy-mutation",
    mutants: results.length,
    killed: results.filter(r => r.pass && r.survivor === undefined).length,
    survived: results.filter(r => r.pass && r.survivor !== undefined).length,
    failures,
    probes: [...baselines.keys()].map(id => ({ id, baseline: baselines.get(id)! })),
    ledger: {
      fields: FIELD_LEDGER.length,
      excluded: FIELD_LEDGER.filter(r => r.kind === "excluded").length,
      covered: FIELD_LEDGER.filter(r => r.coveredBy.length > 0).length,
    },
  };
}
