// verify(receipt): re-run the organism with the recorded effect receipts as
// a replay executor, then compare canonical receipts. A mismatch means the
// manifest, the receipts, or the runtime changed — the receipt catches it.

import { digestCanonical, type Digest } from "./digest";
import { replayExecutor } from "./effects";
import { builtinRegistry, type FnRegistry } from "./registry";
import { parseRunReceipt, runOrganism, type RunReceipt } from "./run";
import { manifestToJson, parseOrganismManifest } from "./contract";
import type { Store } from "./store";
import { MorphogenError } from "./errors";
import type { JsonValue } from "./values";

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

  const rerun = await runOrganism({
    manifest,
    args: original.args,
    fns,
    store,
    executors: [replayExecutor(original.effects)],
  });

  const mismatches = diffReceipts(original, rerun);
  return {
    ok: mismatches.length === 0,
    outcome: rerun.outcome,
    digest: rerun.digest,
    mismatches,
  };
}

function diffReceipts(a: RunReceipt, b: RunReceipt): string[] {
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
    if (JSON.stringify(ac.outputs ?? {}) !== JSON.stringify(bc.outputs ?? {})) {
      out.push(`cell ${k}: outputs differ`);
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
      if (JSON.stringify(e.output) !== JSON.stringify(o.output)) {
        out.push(`effect ${i}: output differs`);
      }
    });
  }
  if (a.work.steps !== b.work.steps) out.push(`work.steps: ${a.work.steps} vs ${b.work.steps}`);
  if (a.work.agentCalls !== b.work.agentCalls)
    out.push(`work.agentCalls: ${a.work.agentCalls} vs ${b.work.agentCalls}`);
  if ((a.failure === undefined) !== (b.failure === undefined)) {
    out.push(`failure presence differs`);
  } else if (a.failure && b.failure && a.failure.code !== b.failure.code) {
    out.push(`failure.code: ${a.failure.code} vs ${b.failure.code}`);
  }
  return out;
}

export function requireReceiptManifest(receipt: RunReceipt): Digest {
  if (!receipt.manifestDigest) {
    throw new MorphogenError("PARSE_FAILED", "receipt has no manifestDigest");
  }
  return receipt.manifestDigest;
}
