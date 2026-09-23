import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApplicationService, type ApplicationDispatchContext } from "./application";
import {
  parseApplicationDrain, produceApplicationDrain, verifyApplicationDrain,
  APPLICATION_DRAIN_LIMITS,
} from "./application-drain";
import { digestCanonical, type Digest } from "./digest";
import { capabilityHandle } from "./capabilities";
import { parseOrganismManifest } from "./contract";
import { applicationJson } from "./application-contract";
import { canonicalize, type JsonValue } from "./values";

const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
const hashed = (v: unknown) => digestCanonical(v as never);

/** The same fixture shape as the Rust drain tests: one schema-1 revision,
 * one empty genesis memory, then a schema-2 revision bridged by a migration
 * record consumed through an ordinary observation. */
async function seed(dir: string) {
  const service = new ApplicationService(dir, {
    async admitCommit() {},
    async admitDispatch() {
      return { kind: "delivery" as const, recipient: capabilityHandle("mailbox-send", { fixture: "route" }), hostProfile: hashed({ contract: "algal.test-host-profile.v1" }) };
    },
  });
  const put = (v: JsonValue) => service.store.putValue(v);
  const manifest = await service.store.putManifest(parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:drain", name: "drain",
    interface: { inputs: {}, outputs: { answer: { cell: "out", port: "value" } } },
    cells: [{ id: "out", kind: "const", outputs: { value: { type: "json", value: "ok" } } }],
    edges: [],
  }));
  const schema = await put({ contract: "algal.application-memory-schema.v1", relations: [{ name: "available", arity: 1 }] });
  const program = await put({ contract: "algal.query.v1", rules: [], query: { relation: "available", terms: [{ var: "x" }, { var: "polarity" }] }, limits: { maxWork: 50_000, maxRounds: 32, maxDerived: 128, maxBindings: 128, maxRows: 16, maxOutputBytes: 262_144 } });
  const query = await put({ contract: "algal.application-memory-query.v1", id: "available", schema, program, procedures: [], polarityColumn: 1, conflict: "single-value" });
  const queries = await put({ contract: "algal.application-memory-queries.v1", queries: [query] });
  const views = await put({ contract: "algal.test-views.v1" });
  const runtime = await put({ contract: "algal.test-runtime.v1" });
  const policy = await put({ contract: "algal.test-policy.v1" });
  const revision = await put({
    contract: "algal.application-revision.v1", application: "parity", parent: null,
    schema, queries, views, runtimeProfile: runtime, evaluationPolicy: policy,
    capabilityRequirements: [],
    entrypoints: [{ name: "run", manifest, applicability: query, maxGenerations: 1, capabilities: [], queries: [query] }],
  });
  const frontier = await put({ contract: "algal.application-memory-frontier.v1", application: "parity", previous: null, sequence: 0, mutation: null, status: "settled" });
  const attestation = await put({ contract: "algal.test-attestation.v1" });
  const scope = await put({ contract: "algal.application-memory-scope.v1", application: "parity", environment: "fixture", task: "task-1", frontier, bindings: [], completeFor: [], attestation });
  const memory = await put({ contract: "algal.application-memory.v1", application: "parity", schema, previous: null, scope, observations: [], hypotheses: [], withdrawn: [] });
  return { service, revision, memory };
}

const ops = (name: string) => hashed({ contract: "algal.test-op.v1", name });
const command = (operation: string, kind: string, expectedHead: Digest | null, revision: Digest, memory: Digest, intents: JsonValue[], evidence: Digest[] = []) =>
  ({ application: "parity", operation, kind, expectedHead, revision, memory, intents, evidence, causedBy: null });

/** A schema-2 revision plus migration record consumed by a migrated snapshot —
 * the minimum commit-valid migrate evidence, mirroring the Rust fixture. */
async function migratedFixture(service: ApplicationService, application: string, priorRevision: Digest, priorMemory: Digest) {
  const schema2 = await service.store.putValue({ contract: "algal.application-memory-schema.v1", relations: [{ name: "moved", arity: 1 }] });
  const prior = await service.store.getValue(priorRevision) as Record<string, JsonValue>;
  // Activation compatibility: the candidate names the incumbent as parent,
  // keeps the runtime profile, and covers every entrypoint.
  const candidate = await service.store.putValue({ ...prior, schema: schema2, parent: priorRevision });
  const migration = await service.store.putValue({
    contract: "algal.application-migration.v1", application,
    from: priorMemory, previousRevision: priorRevision, candidateRevision: candidate,
    program: (prior.entrypoints as { manifest: Digest }[])[0]!.manifest,
    receipt: (prior.entrypoints as { manifest: Digest }[])[0]!.manifest,
    claims: [{ relation: "moved", tuple: ["tool-a"], polarity: "supported" }],
  });
  const observation = await service.store.putValue({
    contract: "algal.application-memory-observation.v1", application,
    scope: schema2, procedure: schema2, raw: migration, receipt: schema2, decoder: schema2, admission: schema2, claims: [],
  });
  const migrated = await service.store.putValue({
    contract: "algal.application-memory.v1", application,
    schema: schema2, previous: null, scope: schema2, observations: [observation], hypotheses: [], withdrawn: [],
  });
  return { schema2, migration, migrated, candidate };
}

describe("application drain", () => {
  test("a migrate must drain every undispatched pending intent explicitly", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-drain-")); dirs.push(dir);
    const { service, revision, memory } = await seed(dir);
    const genesis = await service.create(command(ops("create"), "create", null, revision, memory, []));
    const intentsState = await service.commit(command(ops("work"), "investigate", genesis.digest, revision, memory, [
      { kind: "deliver", route: "keep", message: revision },
      { kind: "deliver", route: "drop", message: revision },
    ]));
    const [abandonedIntent, carriedIntent] = intentsState.transition.intents;
    const { migration, migrated, candidate } = await migratedFixture(service, "parity", revision, memory);
    // Without a drain the migrate is refused.
    await expect(service.commit(command(ops("migrate-bare"), "migrate", intentsState.digest, candidate, migrated, [], [migration])))
      .rejects.toThrow("Pending intents require explicit drain");
    // Partial coverage fails the producer and the transition.
    const partial = await service.store.putValue({
      contract: "algal.application-drain.v1", application: "parity", parentState: intentsState.digest,
      dispositions: [{ intent: abandonedIntent!, status: "abandoned" }],
    });
    await expect(service.commit(command(ops("migrate-short"), "migrate", intentsState.digest, candidate, migrated, [], [migration, partial].sort())))
      .rejects.toThrow();
    // The complete drain commits; abandonment is a projection, not a rewrite.
    const dispositions = [
      { intent: abandonedIntent!, status: "abandoned" as const },
      { intent: carriedIntent!, status: "migrated" as const },
    ].sort((a, b) => (a.intent < b.intent ? -1 : 1));
    const drain = await produceApplicationDrain(service, { application: "parity", parentState: intentsState.digest, dispositions });
    await verifyApplicationDrain(service, drain, intentsState.digest);
    const migratedState = await service.commit(command(ops("migrate"), "migrate", intentsState.digest, candidate, migrated, [], [migration, drain].sort()));
    expect(migratedState.state.epoch).toBe(1);
    const pending = await (service as unknown as { pending(h: unknown): Promise<{ intent: string }[]> }).pending(await service.history("parity"));
    expect(pending.map(p => p.intent)).toEqual([carriedIntent!]);
    const undispatched = await service.undispatchedPending("parity", migratedState.digest);
    expect(undispatched.some(p => p.intent === abandonedIntent)).toBe(false);
    // The original intent records are untouched in CAS.
    expect(await service.store.getValue(abandonedIntent!)).toMatchObject({ contract: "algal.application-intent.v1" });
    // Carried-forward work still dispatches.
    const settled = await service.dispatchPending("parity", {
      configurationDigest: hashed({ contract: "algal.test-dispatcher.v1" }),
      async dispatch(context: ApplicationDispatchContext) {
        const work = context.intent as { message: Digest };
        return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
      },
    });
    expect(settled.map(row => row.status)).toEqual(["settled"]);
  });

  test("a drain with no undispatched pending work is non-applicable evidence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-drain-")); dirs.push(dir);
    const { service, revision, memory } = await seed(dir);
    const genesis = await service.create(command(ops("create"), "create", null, revision, memory, []));
    const { migration, migrated, candidate } = await migratedFixture(service, "parity", revision, memory);
    const drain = await produceApplicationDrain(service, { application: "parity", parentState: genesis.digest, dispositions: [] });
    await expect(service.commit(command(ops("migrate"), "migrate", genesis.digest, candidate, migrated, [], [migration, drain].sort())))
      .rejects.toThrow("Drain record is not applicable");
    // Without the drain the same migrate commits.
    await service.commit(command(ops("migrate-ok"), "migrate", genesis.digest, candidate, migrated, [], [migration]));
  });

  test("the parser is closed, bounded, and requires sorted unique intents", () => {
    const parentState = hashed("state"), a = hashed("a"), b = hashed("b");
    const record = { contract: "algal.application-drain.v1", application: "parity", parentState, dispositions: [{ intent: a, status: "migrated" }] };
    parseApplicationDrain(record);
    expect(() => parseApplicationDrain({ ...record, extra: true })).toThrow();
    expect(() => parseApplicationDrain({ ...record, dispositions: [{ intent: a, status: "dropped" }] })).toThrow();
    expect(() => parseApplicationDrain({ ...record, dispositions: [{ intent: b, status: "migrated" }, { intent: a, status: "abandoned" }] })).toThrow();
    expect(() => parseApplicationDrain({ ...record, dispositions: [{ intent: a, status: "migrated" }, { intent: a, status: "abandoned" }] })).toThrow();
    const over = Array.from({ length: APPLICATION_DRAIN_LIMITS.dispositions + 1 }, (_, i) => ({ intent: hashed(`i-${String(i).padStart(4, "0")}`), status: "migrated" }));
    expect(() => parseApplicationDrain({ ...record, dispositions: over })).toThrow();
  });

  test("binding, completeness, tampered bytes, and settled work are refused", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-drain-")); dirs.push(dir);
    const { service, revision, memory } = await seed(dir);
    const genesis = await service.create(command(ops("create"), "create", null, revision, memory, []));
    const state = await service.commit(command(ops("work"), "investigate", genesis.digest, revision, memory, [
      { kind: "deliver", route: "keep", message: revision },
    ]));
    const intent = state.transition.intents[0]!;
    const input = { application: "parity", parentState: state.digest, dispositions: [{ intent, status: "migrated" }] };
    // Wrong parent and wrong application are refused; extras and omissions too.
    await expect(produceApplicationDrain(service, { ...input, parentState: genesis.digest })).rejects.toThrow();
    await expect(produceApplicationDrain(service, { ...input, application: "other" })).rejects.toThrow();
    await expect(produceApplicationDrain(service, { application: "parity", parentState: state.digest, dispositions: [] })).rejects.toThrow();
    await expect(produceApplicationDrain(service, {
      application: "parity", parentState: state.digest,
      dispositions: [{ intent, status: "migrated" }, { intent: hashed("extra"), status: "abandoned" }].sort((a, b) => (a.intent < b.intent ? -1 : 1)),
    })).rejects.toThrow();
    const drain = await produceApplicationDrain(service, input);
    await expect(verifyApplicationDrain(service, drain, genesis.digest)).rejects.toThrow();
    // Changed bytes under the same addressed filename fail digest recompute.
    const tampered = applicationJson({ contract: "algal.application-drain.v1", application: "parity", parentState: state.digest, dispositions: [] });
    await writeFile(join(dir, "values", drain.slice(7) + ".json"), canonicalize(tampered));
    await expect(verifyApplicationDrain(service, drain, state.digest)).rejects.toThrow();
    // A settled intent is no longer pending and cannot be drained.
    const sink = {
      configurationDigest: hashed({ contract: "algal.test-dispatcher.v1" }),
      async dispatch(context: ApplicationDispatchContext) {
        const work = context.intent as { message: Digest };
        return { status: "settled" as const, result: { kind: "delivery" as const, message: work.message, idempotencyKey: context.dispatch.identity } };
      },
    };
    await service.dispatchPending("parity", sink, 1);
    await expect(produceApplicationDrain(service, { application: "parity", parentState: state.digest, dispositions: [] })).resolves.toBeTruthy();
  });
});
