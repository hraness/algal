/** Scheduling half of the application loop as checked operations.
 * `scheduleInvestigations` turns an applicability derivation that is not
 * `supported` into a durable investigation request delivered on a declared
 * route; `requestExecution` turns a verified `supported` derivation into a
 * `start-episode` intent. Both publish only through the normal lifecycle
 * commit, so the head CAS remains the sole race fence, stale expectations
 * reject, and identical retries replay the operation record. */
import {
  applicationId, applicationList, applicationObject, applicationRef, applicationRefs, applicationTag,
  getApplicationRecord, parseApplicationRevision, parseApplicationState, putApplicationRecord,
} from "./application-contract";
import type { ApplicationService, ApplicationSnapshot } from "./application";
import {
  parseMemoryDerivation, parseMemoryQuery,
  type ApplicationMemoryService, type MemoryStatus,
} from "./application-memory";
import type { Digest } from "./digest";

/** Work handed to the investigation route: the state whose applicability was
 * not supported, the query that evaluated it, and the admitted procedures an
 * investigator may probe to produce the missing evidence. */
export type InvestigationRequest = {
  contract: "algal.application-investigation-request.v1";
  application: string; state: Digest; memory: Digest; entrypoint: string;
  query: Digest; procedures: Digest[]; derivation: Digest;
};
export function parseInvestigationRequest(input: unknown): InvestigationRequest {
  const v = applicationObject(input, ["contract", "application", "state", "memory", "entrypoint", "query", "procedures", "derivation"]);
  applicationTag(v.contract, "algal.application-investigation-request.v1");
  return {
    contract: "algal.application-investigation-request.v1",
    application: applicationId(v.application), state: applicationRef(v.state),
    memory: applicationRef(v.memory), entrypoint: applicationId(v.entrypoint),
    query: applicationRef(v.query), procedures: applicationRefs(v.procedures, 16),
    derivation: applicationRef(v.derivation),
  };
}

export type ScheduleInvestigationsInput = {
  application: string;
  /** Idempotent operation identity; a retry with the same inputs recommits nothing. */
  operation: Digest;
  expectedHead: Digest;
  /** Declared for symmetry with expectedHead; must equal that state's memory. */
  expectedMemory: Digest;
  /** Host-declared route that receives investigation requests. */
  route: string;
  /** Optional entrypoint subset; each name must exist in the revision. */
  entrypoints?: string[];
  causedBy?: Digest | null;
};
export type EntrypointDerivation = { entrypoint: string; query: Digest; derivation: Digest; status: MemoryStatus };
export type ScheduledInvestigations = {
  /** Null when every selected entrypoint already evaluates supported. */
  snapshot: ApplicationSnapshot | null;
  derivations: EntrypointDerivation[];
  requests: Digest[];
};

export async function scheduleInvestigations(
  lifecycle: ApplicationService,
  memory: ApplicationMemoryService,
  input: ScheduleInvestigationsInput,
): Promise<ScheduledInvestigations> {
  const application = applicationId(input.application);
  const operation = applicationRef(input.operation);
  const expectedHead = applicationRef(input.expectedHead);
  const expectedMemory = applicationRef(input.expectedMemory);
  const route = applicationId(input.route);
  const entrypoints = input.entrypoints === undefined ? undefined : applicationList(input.entrypoints, 32, applicationId);
  const causedBy = input.causedBy === undefined || input.causedBy === null ? null : applicationRef(input.causedBy);

  const expected = await getApplicationRecord(lifecycle.store, expectedHead, parseApplicationState);
  if (expected.application !== application || expected.memory !== expectedMemory) {
    throw new Error("Investigation expectation does not match the named application state");
  }
  const revision = await getApplicationRecord(lifecycle.store, expected.revision, parseApplicationRevision);
  const selected = entrypoints === undefined
    ? revision.entrypoints
    : revision.entrypoints.filter(e => entrypoints.includes(e.name));
  if (entrypoints !== undefined && selected.length !== new Set(entrypoints).size) {
    throw new Error("Investigation names an unknown entrypoint");
  }

  const derivations: EntrypointDerivation[] = [];
  const requests: Digest[] = [];
  for (const entrypoint of selected) {
    const { ref, derivation } = await memory.query(expectedHead, entrypoint.applicability);
    derivations.push({ entrypoint: entrypoint.name, query: entrypoint.applicability, derivation: ref, status: derivation.status });
    if (derivation.status === "supported") continue;
    const query = await getApplicationRecord(lifecycle.store, entrypoint.applicability, parseMemoryQuery);
    const request = await putApplicationRecord(lifecycle.store, {
      contract: "algal.application-investigation-request.v1", application, state: expectedHead,
      memory: expectedMemory, entrypoint: entrypoint.name, query: entrypoint.applicability,
      procedures: query.procedures, derivation: ref,
    } satisfies InvestigationRequest);
    requests.push(request);
  }
  if (!requests.length) return { snapshot: null, derivations, requests };

  const snapshot = await lifecycle.commit({
    application, operation, kind: "investigate", expectedHead,
    revision: expected.revision, memory: expectedMemory,
    intents: requests.map(message => ({ kind: "deliver" as const, route, message })),
    evidence: derivations.map(d => d.derivation).slice(0, 16), causedBy,
  });
  return { snapshot, derivations, requests };
}

export type RequestExecutionInput = {
  application: string;
  /** Idempotent operation identity; a retry with the same inputs recommits nothing. */
  operation: Digest;
  expectedHead: Digest;
  expectedMemory: Digest;
  entrypoint: string;
  /** Episode arguments record the manifest binds. */
  input: Digest;
  /** The verified `supported` applicability derivation the caller cites. */
  derivation: Digest;
  evidence?: Digest[];
  causedBy?: Digest | null;
};

export async function requestExecution(
  lifecycle: ApplicationService,
  input: RequestExecutionInput,
): Promise<ApplicationSnapshot> {
  const application = applicationId(input.application);
  const operation = applicationRef(input.operation);
  const expectedHead = applicationRef(input.expectedHead);
  const expectedMemory = applicationRef(input.expectedMemory);
  const entrypointName = applicationId(input.entrypoint);
  const episodeInput = applicationRef(input.input);
  const derivationRef = applicationRef(input.derivation);
  const evidence = applicationRefs(input.evidence ?? [], 15);
  const causedBy = input.causedBy === undefined || input.causedBy === null ? null : applicationRef(input.causedBy);

  const expected = await getApplicationRecord(lifecycle.store, expectedHead, parseApplicationState);
  if (expected.application !== application || expected.memory !== expectedMemory) {
    throw new Error("Execution expectation does not match the named application state");
  }
  const revision = await getApplicationRecord(lifecycle.store, expected.revision, parseApplicationRevision);
  const entrypoint = revision.entrypoints.find(e => e.name === entrypointName);
  if (!entrypoint) throw new Error("Execution names an unknown entrypoint");

  const derivation = await getApplicationRecord(lifecycle.store, derivationRef, parseMemoryDerivation);
  if (
    derivation.application !== application || derivation.capturedState !== expectedHead ||
    derivation.memory !== expectedMemory || derivation.query !== entrypoint.applicability ||
    derivation.status !== "supported" || derivation.verified !== true
  ) {
    throw new Error("Execution is not bound to a verified supported applicability derivation on the expected state");
  }

  return lifecycle.commit({
    application, operation, kind: "investigate", expectedHead,
    revision: expected.revision, memory: expectedMemory,
    intents: [{ kind: "start-episode", entrypoint: entrypointName, input: episodeInput }],
    evidence: [derivationRef, ...evidence], causedBy,
  });
}
