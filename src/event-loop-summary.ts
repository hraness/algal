import { parseEventLoopTrace } from "./event-loop-contract";
import { snapshotEventLoopValue } from "./event-loop-structure";

/** Counts and resource claims derived only from a validated P1 trace. */
export type EventLoopTraceSummary = {
  accepted: number;
  duplicate: number;
  backpressure: number;
  failed: number;
  continued: number;
  quiet: number;
  deferred: number;
  escalated: number;
  unmatched: number;
  fuelClaimed: number;
  peakStateBytesClaimed: number;
  notificationsClaimed: number;
  effectsRequestedClaimed: number;
  effectsSettledClaimed: number;
};

type Entry = {
  decision: {
    kind: "accepted" | "duplicate" | "backpressure" | "failed";
    outcome?: "continue" | "quiet" | "defer" | "escalate" | "no-transition";
    resources?: { fuel: number; stateBytes: number; outputEvents: number };
    effects?: { requested: number; settled: number };
  };
};

/** Parse first; counts are bounded by the trace's 256 entries and per-entry limits.
 * These figures summarize claims, not execution, measured fuel, or host effects.
 */
export function summarizeEventLoopTrace(value: unknown): { digest: string; summary: EventLoopTraceSummary } {
  // Never aggregate the caller's object after checking its digest. A foreign
  // proxy could change a field between parsing and summarizing.
  const copy = snapshotEventLoopValue(value);
  const { digest } = parseEventLoopTrace(copy);
  const summary: EventLoopTraceSummary = {
    accepted: 0, duplicate: 0, backpressure: 0, failed: 0,
    continued: 0, quiet: 0, deferred: 0, escalated: 0, unmatched: 0,
    fuelClaimed: 0, peakStateBytesClaimed: 0, notificationsClaimed: 0,
    effectsRequestedClaimed: 0, effectsSettledClaimed: 0,
  };
  // The parser has already checked every descriptor, kind, resource bound,
  // outcome and effect count. No foreign value is cast until that succeeds.
  for (const { decision } of (copy as unknown as { entries: Entry[] }).entries) {
    summary[decision.kind]++;
    if (decision.kind !== "accepted" && decision.kind !== "failed") continue;
    const resources = decision.resources!;
    summary.fuelClaimed += resources.fuel;
    summary.peakStateBytesClaimed = Math.max(summary.peakStateBytesClaimed, resources.stateBytes);
    summary.notificationsClaimed += resources.outputEvents;
    if (decision.kind === "failed") continue;
    const outcome = decision.outcome!;
    const outcomeKey = {
      continue: "continued", quiet: "quiet", defer: "deferred",
      escalate: "escalated", "no-transition": "unmatched",
    } as const;
    summary[outcomeKey[outcome]]++;
    summary.effectsRequestedClaimed += decision.effects!.requested;
    summary.effectsSettledClaimed += decision.effects!.settled;
  }
  return { digest, summary };
}
