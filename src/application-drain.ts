/** Explicit drain of undispatched pending work on `migrate`. An intent whose
 * dispatch record does not exist pins the operation, revision, and entrypoint
 * of the state that created it; a schema-changing migration cannot silently
 * reinterpret that pin. The `algal.application-drain.v1` record names every
 * undispatched pending intent at the transition's parent state and assigns
 * each an explicit disposition:
 *
 * - `migrated`  — the intent stays pending and dispatchable under the new
 *   revision (the durable record itself is unchanged),
 * - `abandoned` — the intent is intentionally dropped from every future
 *   `pending()` projection; its record stays retained in history and CAS as
 *   evidence and is never rewritten or deleted.
 *
 * A `migrate` transition whose parent has undispatched pending intents must
 * cite exactly one drain covering the complete set; a drain cited where no
 * undispatched work exists is non-applicable evidence and is rejected. */
import {
  applicationId, applicationList, applicationObject, applicationRef,
  applicationTag, getApplicationRecord, putApplicationRecord,
} from "./application-contract";
import type { ApplicationCore } from "./application-core";
import type { Digest } from "./digest";

export const APPLICATION_DRAIN_LIMITS = Object.freeze({ dispositions: 128 });

export type ApplicationDrainStatus = "migrated" | "abandoned";
export type ApplicationDrainDisposition = { intent: Digest; status: ApplicationDrainStatus };
export type ApplicationDrain = {
  contract: "algal.application-drain.v1";
  application: string;
  /** The migrate transition's parent state — the set drained. */
  parentState: Digest;
  dispositions: ApplicationDrainDisposition[];
};

export function parseApplicationDrain(input: unknown): ApplicationDrain {
  const v = applicationObject(input, ["contract", "application", "parentState", "dispositions"]);
  applicationTag(v.contract, "algal.application-drain.v1");
  const dispositions = applicationList(v.dispositions, APPLICATION_DRAIN_LIMITS.dispositions, row => {
    const d = applicationObject(row, ["intent", "status"]);
    if (d.status !== "migrated" && d.status !== "abandoned") throw new Error("Invalid drain disposition status");
    return { intent: applicationRef(d.intent), status: d.status as ApplicationDrainStatus };
  });
  if (dispositions.some((d, i) => i > 0 && d.intent <= dispositions[i - 1]!.intent)) throw new Error("Application references must be sorted and unique");
  return {
    contract: "algal.application-drain.v1",
    application: applicationId(v.application),
    parentState: applicationRef(v.parentState),
    dispositions,
  };
}

/** The drain names this exact application and parent state. */
export function checkApplicationDrainBinding(drain: ApplicationDrain, application: string, parentState: Digest): void {
  if (drain.application !== application || drain.parentState !== parentState) throw new Error("Drain evidence does not bind this transition");
}

/** Commit-time completeness: the dispositions must name exactly the
 * undispatched pending intents at the drained parent state — no missing
 * rows, no extras. */
export function checkApplicationDrainCoverage(drain: ApplicationDrain, undispatched: ReadonlySet<Digest>): void {
  if (drain.dispositions.length !== undispatched.size || drain.dispositions.some(d => !undispatched.has(d.intent))) {
    throw new Error("Drain dispositions must match the undispatched pending intents");
  }
}

/** Records the explicit disposition of every undispatched pending intent at
 * `parentState` and returns the stored drain's digest. The input is the
 * closed `{application, parentState, dispositions}` shape shared with the
 * native `application drain` command. */
export async function produceApplicationDrain(service: ApplicationCore, input: unknown): Promise<Digest> {
  const v = applicationObject(input, ["application", "parentState", "dispositions"]);
  const record = parseApplicationDrain({
    contract: "algal.application-drain.v1",
    application: v.application, parentState: v.parentState, dispositions: v.dispositions,
  });
  const undispatched = await service.undispatchedPending(record.application, record.parentState);
  checkApplicationDrainCoverage(record, new Set(undispatched.map(p => p.intent)));
  return putApplicationRecord(service.store, record);
}

/** Re-verifies a stored drain against an expected parent state: the record
 * must resolve and re-verify as a drain, name the expected parent, and its
 * dispositions must equal the undispatched pending set at that state. */
export async function verifyApplicationDrain(service: ApplicationCore, drain: unknown, expectedParentState: unknown): Promise<ApplicationDrain> {
  const reference = applicationRef(drain), expected = applicationRef(expectedParentState);
  const record = await getApplicationRecord(service.store, reference, parseApplicationDrain);
  if (record.parentState !== expected) throw new Error("Drain evidence does not bind this transition");
  const undispatched = await service.undispatchedPending(record.application, record.parentState);
  checkApplicationDrainCoverage(record, new Set(undispatched.map(p => p.intent)));
  return record;
}
