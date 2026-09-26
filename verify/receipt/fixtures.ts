/**
 * verify/receipt/fixtures.ts — static fixtures for the receipt-closure
 * decision. Numbers marked "measured" come from an actual run of the
 * materialized `record-orders` shape (scripts/source-scaling.ts) on
 * feat/formal-verification-foundation, or from the published table in
 * docs/scale-measurements.md. Numbers marked approximate/named are stated
 * measurements of the would-be envelope, used to classify — nothing here
 * mints a receipt or spawns a run.
 */

import type { ReceiptDimensions, RunSummary } from "./bounds";

/** `record-orders` size 1, measured on a real minted receipt: outcome
 *  complete, 310 steps / 414,602 units (docs/scale-measurements.md row), and
 *  the receipt-walker dimensions computed over the minted envelope —
 *  421,330 nodes, depth 8, 16,767,671 string-content bytes, 19,154,560
 *  canonical bytes, 310 cell records, 0 effects, 312 events, 48,245 bytes of
 *  args. Mintable under the receipt and store envelopes — but it already
 *  exceeds durable-process custody (100,000 nodes / 16,000,000 bytes), which
 *  makes it a measured instance of the residual gap documented in
 *  closure.md. */
export const RECORD_ORDERS_1: RunSummary = {
  outcome: "complete",
  failure: null,
  work: { steps: 310, agentCalls: 0, units: 414_602 },
  receipt: {
    nodes: 421_330,
    maxDepth: 8,
    stringBytes: 16_767_671,
    canonicalBytes: 19_154_560,
    cells: 310,
    effects: 0,
    events: 312,
    argsBytes: 48_245,
  },
};

/** `record-orders` size 7 — the finding-F09 shape. The generated run reaches
 *  maxSteps 1,024 and fails BUDGET_EXHAUSTED with measured work
 *  {steps: 1024, agentCalls: 0, units: 1,349,157} (docs/scale-measurements.md
 *  row; reproduced via measuredRun → {outcome: "failed", failure:
 *  "BUDGET_EXHAUSTED"} + message "receipt structural bounds exceeded"). The
 *  envelope it attempted to mint measures ~1,385,149 nodes at depth 7 —
 *  over the 1,000,000-node receipt/store bound — with a canonical body of
 *  roughly 55 MB (approximate; the runtime rejects on the node count before
 *  canonical accounting completes). */
export const RECORD_ORDERS_7: RunSummary = {
  outcome: "failed",
  failure: "BUDGET_EXHAUSTED",
  work: { steps: 1_024, agentCalls: 0, units: 1_349_157 },
  receipt: {
    nodes: 1_385_149,
    maxDepth: 7,
    canonicalBytes: 55_000_000,
  },
};

/** The same size-7 run as the thrown channel reports it: no receipt exists,
 *  the mint threw BUDGET_EXHAUSTED, and the error's `details` payload still
 *  carries the measured outcome/failure/work (src/run.ts:285; consumed by
 *  `unmintableRun`, scripts/source-scaling.ts:517-524). `exceeded` is empty —
 *  the details payload does not name the violated bound. */
export const RECORD_ORDERS_7_THROWN: RunSummary = {
  outcome: "failed",
  failure: "BUDGET_EXHAUSTED",
  work: { steps: 1_024, agentCalls: 0, units: 1_349_157 },
  receipt: null,
  mintCode: "BUDGET_EXHAUSTED",
};

/** A small complete run comfortably under every bound. */
export const SMALL_COMPLETE: RunSummary = {
  outcome: "complete",
  failure: null,
  work: { steps: 4, agentCalls: 0, units: 512 },
  receipt: {
    nodes: 412,
    maxDepth: 9,
    stringBytes: 3_900,
    canonicalBytes: 4_121,
    cells: 4,
    effects: 0,
    events: 6,
    argsBytes: 200,
  },
};

/** Mintable under the receipt envelope and the store document, but refused
 *  by durable-process custody on both axes: 500,000 nodes and a 30 MB body
 *  sit between the envelope bound and PROCESS_RUNS's 100,000/16,000,000. */
export const OVER_PROCESS_CUSTODY: RunSummary = {
  outcome: "complete",
  failure: null,
  work: { steps: 900, agentCalls: 0, units: 2_000_000 },
  receipt: { nodes: 500_000, maxDepth: 12, canonicalBytes: 30_000_000 },
};

/** Envelope boundary: exactly 1,000,000 nodes is admitted; one more is not
 *  (`++nodes > maxNodes`, src/run.ts:1870). */
export const NODE_BOUNDARY: ReceiptDimensions = {
  nodes: 1_000_000,
  maxDepth: 9,
  canonicalBytes: 20_000_000,
};
export const NODE_BOUNDARY_OVER: ReceiptDimensions = {
  ...NODE_BOUNDARY,
  nodes: 1_000_001,
};

/** Depth boundary: a node at depth 64 is admitted; depth 65 is not. */
export const DEPTH_BOUNDARY: ReceiptDimensions = {
  nodes: 66,
  maxDepth: 64,
  canonicalBytes: 700,
};
export const DEPTH_BOUNDARY_OVER: ReceiptDimensions = {
  ...DEPTH_BOUNDARY,
  maxDepth: 65,
};

/** Canonical-byte boundary: exactly 64 MiB is admitted; one byte more is
 *  not. The string-content term trips earlier than the canonical check, so
 *  a body admitted at the canonical bound keeps stringBytes under it too. */
export const BYTE_BOUNDARY: ReceiptDimensions = {
  nodes: 12,
  maxDepth: 5,
  stringBytes: 67_000_000,
  canonicalBytes: 67_108_864,
};
export const BYTE_BOUNDARY_OVER: ReceiptDimensions = {
  ...BYTE_BOUNDARY,
  canonicalBytes: 67_108_865,
};

/** A case where the early string-content term is the violated bound while
 *  the canonical serialization is also over — both are reported. */
export const STRING_AND_CANONICAL_OVER: ReceiptDimensions = {
  nodes: 10,
  maxDepth: 4,
  stringBytes: 68_000_000,
  canonicalBytes: 68_000_010,
};

/** Multiple bounds crossed at once — every violation is reported. */
export const MULTI_EXCEEDED: ReceiptDimensions = {
  nodes: 2_000_000,
  maxDepth: 70,
  canonicalBytes: 80_000_000,
};

/** A structurally admissible envelope whose measured field counts exceed
 *  `parseReceiptFields` bounds — unreachable from a real mint (cells ≤
 *  steps ≤ 1,024; events hard-capped at 4,096; args pre-admitted ≤ 1 MiB), so
 *  the decision flags it invalid rather than mintable. */
export const FIELD_CELLS_OVER: ReceiptDimensions = {
  nodes: 300_000,
  maxDepth: 9,
  canonicalBytes: 10_000_000,
  cells: 65_537,
};
export const FIELD_EFFECTS_OVER: ReceiptDimensions = {
  nodes: 300_000,
  maxDepth: 9,
  canonicalBytes: 10_000_000,
  effects: 16_449,
};
export const FIELD_EVENTS_OVER: ReceiptDimensions = {
  nodes: 300_000,
  maxDepth: 9,
  canonicalBytes: 10_000_000,
  events: 4_097,
};
export const FIELD_ARGS_OVER: ReceiptDimensions = {
  nodes: 300_000,
  maxDepth: 9,
  canonicalBytes: 10_000_000,
  argsBytes: 1_048_577,
};

/** Field-boundary controls: exactly at the caps, all admissible. */
export const FIELD_BOUNDARY: ReceiptDimensions = {
  nodes: 300_000,
  maxDepth: 9,
  canonicalBytes: 10_000_000,
  cells: 65_536,
  effects: 16_448,
  events: 4_096,
  argsBytes: 1_048_576,
};

export function summaryOf(receipt: ReceiptDimensions, over: Partial<RunSummary> = {}): RunSummary {
  return {
    outcome: "complete",
    failure: null,
    work: { steps: 1, agentCalls: 0, units: 100 },
    ...over,
    receipt,
  };
}
