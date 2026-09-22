/** Declarative schema migration. A migration is a bounded ALGAL program that
 * maps the claims of one memory snapshot into claims admitted under a new
 * schema. The program's run receipt plus its emitted claims ride in a durable
 * `algal.application-migration.v1` record, and the migrated claims arrive in
 * the new memory chain as an ordinary observation whose raw record is that
 * record — the trusted admission host decodes it like any other source, so
 * migrated evidence keeps the same custody shape as probed evidence.
 *
 * A `migrate` transition (not `activate`) carries the record in its evidence;
 * the service verifies that the record binds the prior memory, names the new
 * revision, and is actually consumed by the migrated snapshot. */
import {
  applicationId, applicationList, applicationObject, applicationRef,
  applicationTag, getApplicationRecord, putApplicationRecord,
} from "./application-contract";
import {
  parseMemoryClaim, parseMemoryObservation, parseMemorySchema,
  parseMemoryScope, parseMemorySnapshot, type ApplicationMemoryService, type MemoryClaim,
  type MemoryObservationInput,
} from "./application-memory";
import { type Digest } from "./digest";
import { parseRunReceipt, runOrganism } from "./run";
import type { Executor } from "./effects";
import { builtinRegistry, isBuiltinRegistry, type FnRegistry } from "./registry";
import { canonicalize, type JsonValue } from "./values";
import { manifestToJson, type OrganismManifest } from "./contract";
import type { Store } from "./store";
import { verifyReceipt } from "./verify";

export type ApplicationMigration = {
  contract: "algal.application-migration.v1";
  application: string;
  /** The memory snapshot the claims were migrated from. */
  from: Digest;
  /** Revisions this migration bridges — checked against the transition. */
  previousRevision: Digest; candidateRevision: Digest;
  /** The migration manifest and its run receipt record. */
  program: Digest; receipt: Digest;
  /** The claims the program emitted, re-emitted by the trusted decoder. */
  claims: MemoryClaim[];
};

export function parseApplicationMigration(input: unknown): ApplicationMigration {
  const v = applicationObject(input, ["contract", "application", "from", "previousRevision", "candidateRevision", "program", "receipt", "claims"]);
  applicationTag(v.contract, "algal.application-migration.v1");
  return {
    contract: "algal.application-migration.v1",
    application: applicationId(v.application),
    from: applicationRef(v.from), previousRevision: applicationRef(v.previousRevision), candidateRevision: applicationRef(v.candidateRevision),
    program: applicationRef(v.program), receipt: applicationRef(v.receipt),
    claims: applicationList(v.claims, 64, parseMemoryClaim),
  };
}

export type MigrateMemoryInput = {
  application: string;
  /** The snapshot to migrate from — its schema must differ from `schema`. */
  from: Digest;
  /** The schema the migrated claims are admitted under. */
  schema: Digest;
  /** Scope binding for the migrated claims — carries the current frontier. */
  scope: Digest;
  /** The migration program: a manifest mapping `{claims}` to `{claims}`. */
  program: Digest;
  /** The migration procedure (schema = the new schema) and its decoder record. */
  procedure: Digest; decoder: Digest;
  /** The revisions this migration bridges — checked against the transition. */
  previousRevision: Digest; candidateRevision: Digest;
};

function admitMigrationProgram(manifest: OrganismManifest): void {
  if (manifest.cells.some(cell => !["input", "const", "fn", "expr"].includes(cell.kind))) throw new Error("Migration programs must be pure bounded transformations");
}

async function migrationArguments(store: Store, fromRef: Digest, scopeRef: Digest): Promise<Record<string, Record<string, JsonValue>>> {
  const from = await getApplicationRecord(store, fromRef, parseMemorySnapshot);
  const scope = await getApplicationRecord(store, scopeRef, parseMemoryScope);
  if (from.application !== scope.application) throw new Error("Migration scope belongs to another application");
  const claims: { claim: MemoryClaim; frontier: Digest }[] = [];
  for (const ref of from.observations) {
    if (from.withdrawn.includes(ref)) continue;
    const observation = await getApplicationRecord(store, ref, parseMemoryObservation);
    const observationScope = await getApplicationRecord(store, observation.scope, parseMemoryScope);
    for (const claim of observation.claims) claims.push({ claim, frontier: observationScope.frontier });
  }
  // Hypotheses remain in the retained source snapshot. They never enter the
  // observation projection merely because a schema transformation ran.
  if (claims.length > 64) throw new Error("Migration claim input bound exceeded");
  return { claims: { value: claims as unknown as JsonValue }, frontier: { value: scope.frontier } };
}

/** Replay producing evidence and bind it to the exact retained source projection. */
export async function verifyApplicationMigration(store: Store, migration: ApplicationMigration, scope: Digest): Promise<void> {
  const manifest = await store.getManifest(migration.program);
  if (!manifest) throw new Error("Migration manifest missing from the store");
  admitMigrationProgram(manifest);
  const receipt = await getApplicationRecord(store, migration.receipt, parseRunReceipt);
  const args = await migrationArguments(store, migration.from, scope);
  if (receipt.outcome !== "complete" || receipt.manifestDigest !== migration.program || canonicalize(receipt.args) !== canonicalize(args)) throw new Error("Migration receipt does not bind its source and program");
  const output = manifest.interface?.outputs?.migrated;
  const produced = output ? receipt.cells[output.cell]?.outputs?.[output.port] : undefined;
  const emitted = applicationList(applicationObject(produced, ["claims"]).claims, 64, parseMemoryClaim);
  if (canonicalize(emitted as unknown as JsonValue) !== canonicalize(migration.claims as unknown as JsonValue)) throw new Error("Migration claims differ from producing receipt");
  if (!(await verifyReceipt(receipt, manifestToJson(manifest), store, builtinRegistry())).ok) throw new Error("Migration producing receipt does not replay");
}

/** Runs the migration program over the source snapshot's claims, stores the
 * migration record, and admits the emitted claims as one observation into a
 * fresh memory chain under the new schema (`previous: null` — cross-schema
 * lineage rides the migration record, not the predecessor pointer). */
export async function migrateApplicationMemory(
  memory: ApplicationMemoryService,
  input: MigrateMemoryInput,
  runtime: { fns: FnRegistry; executors?: Executor[] },
): Promise<{ migration: Digest; observation: MemoryObservationInput; snapshot: Digest }> {
  const application = applicationId(input.application);
  const schema = applicationRef(input.schema), fromRef = applicationRef(input.from);
  const program = applicationRef(input.program), scope = applicationRef(input.scope);
  const procedure = applicationRef(input.procedure), decoder = applicationRef(input.decoder);
  const from = await getApplicationRecord(memory.store, fromRef, parseMemorySnapshot);
  if (from.application !== application) throw new Error("Migration source belongs to another application");
  if (from.schema === schema) throw new Error("Migration requires a schema change");
  const target = await getApplicationRecord(memory.store, schema, parseMemorySchema);
  const args = await migrationArguments(memory.store, fromRef, scope);
  const manifest = await memory.store.getManifest(program);
  if (!manifest) throw new Error("Migration manifest missing from the store");
  admitMigrationProgram(manifest);
  if (!isBuiltinRegistry(runtime.fns)) throw new Error("Migration requires the admitted builtin function registry");
  const receipt = await runOrganism({
    manifest, fns: runtime.fns, store: memory.store, executors: runtime.executors ?? [],
    args,
    processName: `migrate-${fromRef.slice(7, 15)}`,
  });
  if (receipt.outcome !== "complete") throw new Error(`Migration program did not complete: ${receipt.outcome}`);
  const out = manifest.interface?.outputs?.migrated;
  const produced = out ? receipt.cells[out.cell]?.outputs?.[out.port] : undefined;
  const emitted = applicationList(applicationObject(produced, ["claims"]).claims, 64, parseMemoryClaim);
  for (const claim of emitted) {
    if (!target.relations.some(r => r.name === claim.relation && r.arity === claim.tuple.length)) throw new Error("Migration emitted a claim outside the target schema");
  }
  const receiptRef = await putApplicationRecord(memory.store, receipt);
  const migration = await putApplicationRecord(memory.store, {
    contract: "algal.application-migration.v1", application,
    from: fromRef, previousRevision: applicationRef(input.previousRevision),
    candidateRevision: applicationRef(input.candidateRevision),
    program, receipt: receiptRef, claims: emitted,
  });
  const observation: MemoryObservationInput = { application, scope, procedure, raw: migration, receipt: receiptRef, decoder };
  const snapshot = await memory.snapshot({
    application, schema, previous: null, scope,
    observations: [await memory.observe(observation)], hypotheses: [], withdrawn: [],
  });
  return { migration, observation, snapshot };
}
