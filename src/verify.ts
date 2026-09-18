// verify(receipt): re-run the organism with the recorded effect receipts as
// a replay executor, then compare canonical receipts. A mismatch means the
// manifest, the receipts, or the runtime changed — the receipt catches it.

import { digestCanonical, type Digest } from "./digest";
import { replayExecutor } from "./effects";
import { builtinRegistry, type FnRegistry } from "./registry";
import {
  canonicalizeReceipt,
  parseRunReceipt,
  runOrganism,
  type RunReceipt,
} from "./run";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { replayStore, type Store } from "./store";
import type { Transport } from "./transport";
import type { ToolRegistry } from "./tools";
import { AlgalError } from "./errors";
import { canonicalize, type JsonValue } from "./values";

export type VerifyReport = {
  ok: boolean;
  outcome: string;
  digest: Digest;
  mismatches: string[];
};

export async function verifyReceipt(
  receiptJson: JsonValue,
  manifestJson: JsonValue,
  store: Store,
  fns: FnRegistry = builtinRegistry(),
  transports?: Record<string, Transport>,
  tools?: ToolRegistry,
): Promise<VerifyReport> {
  const original = parseRunReceipt(receiptJson);
  const manifest = parseOrganismManifest(manifestJson);
  const manifestDigest = digestCanonical(manifestToJson(manifest));
  if (manifestDigest !== original.manifestDigest) {
    return {
      ok: false,
      outcome: original.outcome,
      digest: original.digest,
      mismatches: [
        `manifestDigest: receipt records ${original.manifestDigest}, supplied manifest hashes to ${manifestDigest}`,
      ],
    };
  }

  const replayVia: Record<string, string> = {};
  const replaySlots: Record<string, { value?: JsonValue; missing?: boolean }> =
    {};
  for (const [path, rec] of Object.entries(original.cells)) {
    if (rec.via) replayVia[path] = rec.via;
    // a recorded slot read is authoritative: the live slot may have been
    // overwritten since — serve what the original run saw, or its failure
    if (rec.slot?.mode === "read") {
      const v = rec.status === "committed" ? rec.outputs?.data : undefined;
      replaySlots[path] = v !== undefined ? { value: v } : { missing: true };
    }
  }
  const rerun = await runOrganism({
    manifest,
    args: original.args,
    fns,
    store: replayStore(store),
    executors: [replayExecutor(original.effects)],
    replayVia,
    replaySlots,
    replayToolEffects: original.effects.filter((effect) => effect.executor.startsWith("tool:")),
    ...(transports ? { transports } : {}),
    ...(tools ? { tools } : {}),
  });

  const mismatches = diffReceipts(original, rerun);
  // bit-for-bit: canonical receipts must be identical — replay reproduces
  // the recorded executor ids and usage, so the digests must match too
  if (canonicalizeReceipt(original) !== canonicalizeReceipt(rerun)) {
    if (mismatches.length === 0) {
      mismatches.push(
        `receipt digests differ: ${original.digest} vs ${rerun.digest}`,
      );
    }
  }
  return {
    ok: mismatches.length === 0,
    outcome: rerun.outcome,
    digest: rerun.digest,
    mismatches,
  };
}

/** Compare canonically — a stored receipt has sorted keys, a fresh run has
 * insertion order; JSON.stringify would flag equal values as different. */
function eq(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return canonicalize(a ?? null) === canonicalize(b ?? null);
}

export function diffReceipts(a: RunReceipt, b: RunReceipt): string[] {
  const out: string[] = [];
  if (a.outcome !== b.outcome) {
    out.push(`outcome: ${a.outcome} vs ${b.outcome}`);
  }
  const aCells = Object.keys(a.cells).sort();
  const bCells = Object.keys(b.cells).sort();
  if (JSON.stringify(aCells) !== JSON.stringify(bCells)) {
    out.push(`cells: ${aCells.join(",")} vs ${bCells.join(",")}`);
  }
  for (const k of aCells) {
    const ac = a.cells[k]!;
    const bc = b.cells[k];
    if (!bc) continue;
    if (ac.status !== bc.status) {
      out.push(`cell ${k}: status ${ac.status} vs ${bc.status}`);
    }
    if (!eq(ac.outputs ?? {}, bc.outputs ?? {})) {
      out.push(`cell ${k}: outputs differ`);
    }
    if (ac.work !== bc.work) {
      out.push(`cell ${k}: work ${ac.work} vs ${bc.work}`);
    }
    if (ac.rounds !== bc.rounds) {
      out.push(`cell ${k}: rounds ${ac.rounds} vs ${bc.rounds}`);
    }
    if (ac.items !== bc.items) {
      out.push(`cell ${k}: items ${ac.items} vs ${bc.items}`);
    }
    if (!eq(ac.failure, bc.failure)) {
      out.push(`cell ${k}: failure differs`);
    }
    if (!eq(ac.toolCalls, bc.toolCalls)) {
      out.push(`cell ${k}: toolCalls differ`);
    }
    if (!eq(ac.shadowOut, bc.shadowOut)) {
      out.push(`cell ${k}: shadowOut differs`);
    }
    if (ac.via !== bc.via) {
      out.push(`cell ${k}: via ${ac.via ?? "local"} vs ${bc.via ?? "local"}`);
    }
    if (!eq(ac.slot, bc.slot)) {
      out.push(`cell ${k}: slot differs`);
    }
  }
  if (a.effects.length !== b.effects.length) {
    out.push(`effects: ${a.effects.length} vs ${b.effects.length}`);
  } else {
    a.effects.forEach((e, i) => {
      const o = b.effects[i]!;
      if (e.requestDigest !== o.requestDigest) {
        out.push(`effect ${i}: requestDigest differs`);
      }
      if (!eq(e.output, o.output)) {
        out.push(`effect ${i}: output differs`);
      }
      if (!eq(e.error, o.error)) {
        out.push(`effect ${i}: error differs`);
      }
      if (e.executor !== o.executor) {
        out.push(`effect ${i}: executor ${e.executor} vs ${o.executor}`);
      }
      if (!eq(e.usage, o.usage)) {
        out.push(`effect ${i}: usage differs`);
      }
    });
  }
  if (!eq(a.events, b.events)) {
    out.push("events: event logs differ");
  }
  if (a.work.steps !== b.work.steps) out.push(`work.steps: ${a.work.steps} vs ${b.work.steps}`);
  if (a.work.agentCalls !== b.work.agentCalls)
    out.push(`work.agentCalls: ${a.work.agentCalls} vs ${b.work.agentCalls}`);
  if (a.work.units !== b.work.units)
    out.push(`work.units: ${a.work.units} vs ${b.work.units}`);
  if ((a.failure === undefined) !== (b.failure === undefined)) {
    out.push(`failure presence differs`);
  } else if (a.failure && b.failure && a.failure.code !== b.failure.code) {
    out.push(`failure.code: ${a.failure.code} vs ${b.failure.code}`);
  }
  return out;
}

export function requireReceiptManifest(receipt: RunReceipt): Digest {
  if (!receipt.manifestDigest) {
    throw new AlgalError("PARSE_FAILED", "receipt has no manifestDigest");
  }
  return receipt.manifestDigest;
}
