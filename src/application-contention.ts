/** `algal.application-contention.v1` — retained evidence of a CAS head race.
 * When several writers attempt transitions against one captured expected head,
 * the application's single-writer fence admits exactly one and rejects the
 * rest as stale. Until now that race existed only transiently in returned
 * errors; this record makes it durable: every attempted command (by CAS
 * digest), each deterministic outcome, and the committed winner.
 *
 * Production is deterministic and serial — attempts run in input order
 * against the live lifecycle, so the record is a faithful account of a race
 * resolved by the head fence, not a simulation. Verification is structural
 * and side-effect free: the winner's committed state must be the recorded
 * parent's direct child carrying the winner command's request digest, and
 * every rejected attempt must still derive its recorded rejection from the
 * retained history under the lifecycle's own check order.
 *
 * Bounds: 1..8 attempts; commands and reasons inherit the application record
 * and dispatch-reason bounds. No wall-clock fields. The record proves what
 * the fence decided for these exact commands; it does not establish physical
 * simultaneity or linearizability across hosts. */
import {
  applicationObject, applicationRef, applicationTag, getApplicationRecord,
  putApplicationRecord,
} from "./application-contract";
import {
  parseApplicationCommand,
  type ApplicationCommand, type ApplicationService, type ApplicationSnapshot,
} from "./application";
import { isAlgalError } from "./errors";
import type { Digest } from "./digest";

export const CONTENTION_LIMITS = Object.freeze({ attempts: 8, reasonBytes: 1024 });

export type ContentionStatus = "committed" | "rejected";
/** One raced command: the CAS digest of its exact `ApplicationCommand` record
 * (whose `expectedHead` must name `parentState`) and the fence's verdict. */
export type ContentionAttempt = { command: Digest; status: ContentionStatus; reason?: string };
export type ApplicationContention = {
  contract: "algal.application-contention.v1";
  /** The captured expected head every attempt raced. */
  parentState: Digest;
  /** 1..8 attempts, sorted unique by command digest; exactly one committed. */
  attempts: ContentionAttempt[];
  /** The committed attempt's command digest — also its transition's `request`. */
  winner: Digest;
};
export type ProduceContentionInput = { parentState: Digest; attempts: ApplicationCommand[] };
export type ProducedContention = { contention: Digest; record: ApplicationContention; snapshot: ApplicationSnapshot };

const STALE_HEAD_REASON = "Stale application head";
const OPERATION_COMMITTED_REASON = "Operation already committed in application history";

function reason(value: unknown): string {
  if (typeof value !== "string" || !value.length || Buffer.byteLength(value) > CONTENTION_LIMITS.reasonBytes) throw new Error("Invalid application contention reason");
  return value;
}

export function parseApplicationContention(input: unknown): ApplicationContention {
  const v = applicationObject(input, ["contract", "parentState", "attempts", "winner"]);
  applicationTag(v.contract, "algal.application-contention.v1");
  if (!Array.isArray(v.attempts) || v.attempts.length < 1 || v.attempts.length > CONTENTION_LIMITS.attempts) throw new Error("Application contention attempt bound exceeded");
  let previous = "";
  let committed = 0;
  let winner: Digest | null = null;
  const attempts: ContentionAttempt[] = v.attempts.map(raw => {
    const hasReason = !!raw && typeof raw === "object" && Object.hasOwn(raw, "reason");
    const a = applicationObject(raw, hasReason ? ["command", "status", "reason"] : ["command", "status"]);
    const command = applicationRef(a.command);
    const status = a.status;
    if (status !== "committed" && status !== "rejected") throw new Error("Invalid application contention status");
    const why = hasReason ? reason(a.reason) : undefined;
    if ((status === "committed") !== (why === undefined)) throw new Error("Application contention status/reason mismatch");
    if (command <= previous) throw new Error("Application contention attempts must be sorted and unique");
    previous = command;
    if (status === "committed") { committed++; winner = command; }
    return why === undefined ? { command, status } : { command, status, reason: why };
  });
  const declared = applicationRef(v.winner);
  if (committed !== 1 || winner !== declared) throw new Error("Application contention requires exactly one committed winner");
  return {
    contract: "algal.application-contention.v1",
    parentState: applicationRef(v.parentState),
    attempts,
    winner: declared,
  };
}

/** Race `attempts` serially against `parentState`: each command is retained
 * under CAS, then committed in input order. The first commit wins; every
 * later attempt must take the exact stale-head rejection — any other failure
 * aborts production without a record, as does a race with zero or multiple
 * commits. The returned record and its digest are deterministic: replaying
 * the same input on the same history reproduces it byte-for-byte (the winner
 * replays its committed operation, losers still fence). */
export async function produceApplicationContention(
  lifecycle: ApplicationService,
  input: ProduceContentionInput,
): Promise<ProducedContention> {
  const v = applicationObject(input, ["parentState", "attempts"]);
  const parentState = applicationRef(v.parentState);
  if (!Array.isArray(v.attempts) || v.attempts.length < 1 || v.attempts.length > CONTENTION_LIMITS.attempts) throw new Error("Application contention attempt bound exceeded");
  const seen = new Set<Digest>();
  const attempts: ContentionAttempt[] = [];
  let application: string | null = null;
  let winner: { command: Digest; snapshot: ApplicationSnapshot } | null = null;
  for (const raw of v.attempts) {
    const command = parseApplicationCommand(raw);
    if (command.expectedHead !== parentState) throw new Error("Contention attempt does not race the expected head");
    if (application !== null && command.application !== application) throw new Error("Contention attempts must name one application");
    application = command.application;
    const commandRef = await putApplicationRecord(lifecycle.store, command);
    if (seen.has(commandRef)) throw new Error("Contention attempts must be unique");
    seen.add(commandRef);
    let snapshot: ApplicationSnapshot;
    try {
      snapshot = await lifecycle.commit(command);
    } catch (error) {
      if (isAlgalError(error) && error.message === STALE_HEAD_REASON) {
        attempts.push({ command: commandRef, status: "rejected", reason: STALE_HEAD_REASON });
        continue;
      }
      throw error;
    }
    if (winner !== null) throw new Error("Contention produced more than one committed writer");
    winner = { command: commandRef, snapshot };
    attempts.push({ command: commandRef, status: "committed" });
  }
  if (winner === null) throw new Error("Contention produced no committed writer");
  attempts.sort((a, b) => (a.command < b.command ? -1 : 1));
  const record = parseApplicationContention({ contract: "algal.application-contention.v1", parentState, attempts, winner: winner.command });
  const contention = await putApplicationRecord(lifecycle.store, record);
  return { contention, record, snapshot: winner.snapshot };
}

/** Verify a retained contention record against retained history — no commits
 * run and nothing is published. The winner's committed state must be the
 * parent state's direct child carrying the winner command's request digest;
 * every rejected attempt's recorded reason must be the rejection the
 * lifecycle would still derive under its own check order: a committed
 * operation collides before the head check, otherwise the moved head fences
 * the attempt as stale. A fabricated loser (its command would commit today,
 * or its operation is the committed winner) fails verification. */
export async function verifyApplicationContention(
  lifecycle: ApplicationService,
  reference: Digest,
): Promise<ApplicationContention> {
  const record = await getApplicationRecord(lifecycle.store, reference, parseApplicationContention);
  const commands = new Map<Digest, ApplicationCommand>();
  let application: string | null = null;
  for (const attempt of record.attempts) {
    const command = await getApplicationRecord(lifecycle.store, attempt.command, parseApplicationCommand);
    if (command.expectedHead !== record.parentState) throw new Error("Contention attempt does not race the expected head");
    if (application !== null && command.application !== application) throw new Error("Contention attempts must name one application");
    application = command.application;
    commands.set(attempt.command, command);
  }
  const history = await lifecycle.history(application!);
  const parentIndex = history.findIndex(s => s.digest === record.parentState);
  if (parentIndex < 0) throw new Error("Contention parent state is not in application history");
  const child = history[parentIndex + 1];
  const winner = commands.get(record.winner)!;
  if (child === undefined || child.transition.request !== record.winner || child.transition.operation !== winner.operation) {
    throw new Error("Contention winner is not committed on the expected head");
  }
  for (const attempt of record.attempts) {
    if (attempt.status !== "rejected") continue;
    const command = commands.get(attempt.command)!;
    const expected = history.some(s => s.transition.operation === command.operation)
      ? OPERATION_COMMITTED_REASON
      : STALE_HEAD_REASON;
    if (attempt.reason !== expected) throw new Error("Contention rejection is not reproducible");
  }
  return record;
}
