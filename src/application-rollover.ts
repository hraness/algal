/** Explicit memory selection rollover through the ordinary expected-head
 * lifecycle. The archive is immutable evidence, never another mutable head. */
import {
  applicationId, applicationObject, applicationRef, applicationRefs,
  getApplicationRecord, nullableApplicationRef, parseApplicationState,
} from "./application-contract";
import type { ApplicationCore, ApplicationSnapshot } from "./application-core";
import type { ApplicationMemoryService, MemoryRollover } from "./application-memory";
import type { Digest } from "./digest";

export type RolloverApplicationMemoryInput = {
  application: string; operation: Digest; expectedHead: Digest; expectedMemory: Digest;
  retainObservations: Digest[]; retainHypotheses: Digest[];
  evidence?: Digest[]; causedBy?: Digest | null;
};
export type RolledApplicationMemory = MemoryRollover & { snapshot: ApplicationSnapshot };

export async function rolloverApplicationMemory(
  lifecycle: ApplicationCore, memory: ApplicationMemoryService, input: RolloverApplicationMemoryInput,
): Promise<RolledApplicationMemory> {
  const optional = ["evidence", "causedBy"].filter(key => Object.hasOwn(input, key));
  const v = applicationObject(input, ["application", "operation", "expectedHead", "expectedMemory", "retainObservations", "retainHypotheses", ...optional]);
  const application = applicationId(v.application), operation = applicationRef(v.operation);
  const expectedHead = applicationRef(v.expectedHead), expectedMemory = applicationRef(v.expectedMemory);
  const retainObservations = applicationRefs(v.retainObservations, 128), retainHypotheses = applicationRefs(v.retainHypotheses, 64);
  const evidence = applicationRefs(v.evidence ?? [], 15), causedBy = nullableApplicationRef(v.causedBy ?? null);
  const expected = await getApplicationRecord(lifecycle.store, expectedHead, parseApplicationState);
  if (expected.application !== application || expected.memory !== expectedMemory) throw new Error("Rollover expectation does not match the named application state");
  const rolled = await memory.rollover({ memory: expectedMemory, retainObservations, retainHypotheses });
  const snapshot = await lifecycle.commit({
    application, operation, kind: "memory", expectedHead, revision: expected.revision, memory: rolled.memory,
    intents: [], evidence: [...new Set([...evidence, rolled.archive])].sort(), causedBy,
  });
  return { snapshot, ...rolled };
}
