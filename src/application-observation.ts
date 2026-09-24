/** Observation-to-state bridge. A trusted observation admitted through the
 * memory service becomes the next application state only through the normal
 * lifecycle commit, so the head CAS remains the sole race fence and idempotent
 * operation replay is preserved. Immutable CAS records written before a stale
 * commit are orphaned evidence, never state. */
import {
  applicationId, applicationRef, applicationRefs, getApplicationRecord,
  parseApplicationState,
} from "./application-contract";
import type { ApplicationCore, ApplicationSnapshot } from "./application-core";
import {
  parseMemorySnapshot,
  type ApplicationMemoryService, type MemoryObservationInput,
} from "./application-memory";
import type { Digest } from "./digest";

export type AppendObservationInput = {
  application: string;
  /** Idempotent operation identity; a retry with the same inputs recommits nothing. */
  operation: Digest;
  /** The head the caller observed against; commit rejects once it is stale. */
  expectedHead: Digest;
  /** Declared for symmetry with expectedHead; must equal that state's memory. */
  expectedMemory: Digest;
  observation: MemoryObservationInput;
  evidence?: Digest[];
  causedBy?: Digest | null;
};
export type AppendedObservation = {
  snapshot: ApplicationSnapshot;
  observation: Digest;
  memory: Digest;
};

export async function appendObservation(
  lifecycle: ApplicationCore,
  memory: ApplicationMemoryService,
  input: AppendObservationInput,
): Promise<AppendedObservation> {
  const application = applicationId(input.application);
  const operation = applicationRef(input.operation);
  const expectedHead = applicationRef(input.expectedHead);
  const expectedMemory = applicationRef(input.expectedMemory);
  const evidence = applicationRefs(input.evidence ?? [], 16);
  const causedBy = input.causedBy === undefined || input.causedBy === null ? null : applicationRef(input.causedBy);
  if (input.observation?.application !== application) throw new Error("Observation belongs to another application");

  // Resolve the expected state, not the live head: successor contents and the
  // commit request digest stay identical across an idempotent retry.
  const expected = await getApplicationRecord(lifecycle.store, expectedHead, parseApplicationState);
  if (expected.application !== application || expected.memory !== expectedMemory) {
    throw new Error("Observation expectation does not match the named application state");
  }
  const prior = await getApplicationRecord(lifecycle.store, expected.memory, parseMemorySnapshot);
  if (prior.application !== application) throw new Error("Cross-application memory predecessor");

  const observation = await memory.observe(input.observation);
  const observations = [...new Set([...prior.observations, observation])].sort();
  const nextMemory = await memory.snapshot({
    application, schema: prior.schema, previous: expected.memory, scope: input.observation.scope,
    observations, hypotheses: prior.hypotheses, withdrawn: prior.withdrawn,
    ...(prior.archive ? { archive: prior.archive } : {}),
  });
  const snapshot = await lifecycle.commit({
    application, operation, kind: "memory", expectedHead,
    revision: expected.revision, memory: nextMemory,
    intents: [], evidence, causedBy,
  });
  return { snapshot, observation, memory: nextMemory };
}
