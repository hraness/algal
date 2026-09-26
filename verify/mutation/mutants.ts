/**
 * verify/mutation/mutants.ts — the evidence-mutation catalog.
 *
 * Every mutant starts from a genuine exported `algal.process-evidence.v1`
 * document and mutates one security-, custody- or policy-relevant field.
 * The decisive detail: mutants REHASH what they touch. `rebind` recomputes
 * every receipt's own `digest` field, re-keys the receipts map under the
 * new canonical digests, re-points every record's `receipt` reference, then
 * rechains the records map — `previous` links rebuilt, keys recomputed as
 * `digestCanonical(content)`, `head` advanced to the new tail. Nothing
 * survives on a stale digest: the digest layer is already proven by the
 * corpus; the question this lane answers is whether the SEMANTIC layer —
 * chain transition rules plus bit-for-bit replay — still catches the lie
 * after every digest in the malicious record is honestly recomputed.
 *
 * Expected outcomes are written independently of the implementation:
 *   admission — structural/digest/parse rejection before any replay
 *   semantic  — the document admits; history or replay must catch it
 *   survivor  — a documented boundary where self-consistent evidence of a
 *               different claim legitimately verifies; each survivor names
 *               the binding obligation it illustrates
 *
 * FIELD_LEDGER is the lane's explicit coverage inventory: every
 * security-relevant field is named by a mutant or declared not-applicable
 * with a reason.
 */

import { digestCanonical, type Digest } from "../../src/digest";
import type { JsonValue } from "../../src/values";
import { manifestToJson, parseOrganismManifest } from "../../src/contract";
import type { BaseId } from "./fixtures";

const json = (v: unknown): JsonValue => v as JsonValue;
const dig = (v: unknown): string => digestCanonical(json(v));
const FOREIGN = ("sha256:" + "f".repeat(64)) as Digest;

/** The plain-JSON form of a ProcessEvidence document (post-structuredClone). */
export type MutantDoc = {
  contract: unknown;
  head: unknown;
  records: Record<string, Record<string, unknown>>;
  receipts: Record<string, Record<string, unknown>>;
  program: { contract: unknown; root: unknown; manifests: Record<string, unknown>; values: Record<string, unknown> };
  tools: Record<string, Record<string, unknown>>;
  missing: { manifests: unknown[]; values: unknown[] };
  [extra: string]: unknown;
};

export type MutantExpect =
  | { stage: "admission"; code: string; part?: string }
  | { stage: "semantic"; code: string; part?: string }
  | { stage: "survivor"; reason: string };

export type Mutant = {
  id: string;
  field: string;
  kind: "admission" | "semantic" | "survivor-probe";
  bases: readonly BaseId[];
  apply(doc: MutantDoc): void;
  expect: MutantExpect;
  note: string;
};

const ALL: readonly BaseId[] = ["complete", "failed-miss", "suspended", "uncertain", "value-dep"];
const RECEIPTED: readonly BaseId[] = ["complete", "failed-miss", "suspended", "value-dep"];
const TERMINAL: readonly BaseId[] = ["complete", "failed-miss", "suspended", "value-dep"];
const COMPLETE: readonly BaseId[] = ["complete", "value-dep"];

// ------------------------------------------------------------- rebind -----

/** Ordered chain keys, gen0 → head. Throws if the walk leaves the map. */
export function chainKeys(doc: MutantDoc): string[] {
  const keys: string[] = [];
  let cur = doc.head as string | undefined;
  while (cur !== undefined) {
    keys.unshift(cur);
    const rec = doc.records[cur];
    if (!rec) throw new Error(`mutant chain walk left the evidence at ${cur}`);
    cur = rec.previous as string | undefined;
  }
  return keys;
}

/** Recompute every digest linkage in the document after content edits.
 * Receipts get a fresh `digest` field and are re-keyed; record `previous`
 * and `receipt` pointers are re-pointed; record keys and `head` are
 * recomputed. The result is honest at every digest boundary — only the
 * semantic layer can still catch what changed. */
export function rebind(doc: MutantDoc): void {
  const receipts: Record<string, Record<string, unknown>> = {};
  const receiptRemap = new Map<string, string>();
  for (const [key, rec] of Object.entries(doc.receipts)) {
    const r = structuredClone(rec);
    delete r["digest"];
    r["digest"] = dig(r);
    const nk = dig(r);
    receipts[nk] = r;
    receiptRemap.set(key, nk);
  }
  doc.receipts = receipts;

  const keys = chainKeys(doc);
  const recs = keys.map(k => structuredClone(doc.records[k]!));
  const extras = Object.entries(doc.records).filter(([k]) => !keys.includes(k));
  const next: Record<string, Record<string, unknown>> = {};
  const newKeys: string[] = [];
  for (let j = 0; j < recs.length; j++) {
    const r = recs[j]!;
    if (j > 0) r["previous"] = newKeys[j - 1]!;
    if (r["receipt"] !== undefined) r["receipt"] = receiptRemap.get(r["receipt"] as string) ?? r["receipt"];
    newKeys[j] = dig(r);
    next[newKeys[j]!] = r;
  }
  for (const [, v] of extras) {
    const r = structuredClone(v);
    if (r["receipt"] !== undefined) r["receipt"] = receiptRemap.get(r["receipt"] as string) ?? r["receipt"];
    next[dig(r)] = r;
  }
  doc.records = next;
  doc.head = newKeys[newKeys.length - 1]!;
}

/** Mutate chain record `index` (gen0 = 0, head = last), then rebind. */
export function atRecord(doc: MutantDoc, index: number, mutate: (rec: Record<string, unknown>) => void): void {
  const keys = chainKeys(doc);
  if (index < 0 || index >= keys.length) throw new Error("chain index out of range");
  mutate(doc.records[keys[index]!]!);
  rebind(doc);
}

/** Mutate the head record's content, then rebind. */
export function atHead(doc: MutantDoc, mutate: (rec: Record<string, unknown>) => void): void {
  atRecord(doc, chainKeys(doc).length - 1, mutate);
}

/** Mutate the first receipt's content, then rebind (digest field, map key,
 * record pointers and the chain tail are all honestly recomputed). */
export function atReceipt(doc: MutantDoc, mutate: (rec: Record<string, unknown>) => void): void {
  const key = Object.keys(doc.receipts)[0];
  if (key === undefined) throw new Error("base carries no receipt");
  mutate(doc.receipts[key]!);
  rebind(doc);
}

/** Mutate the first program manifest's content, re-key it under the honest
 * manifest digest, repoint `root` and every record's `manifestDigest`, then
 * rebind. `touchReceipts` also rewrites `receipt.manifestDigest` so the
 * mutated claim is fully self-consistent. */
export function atManifest(doc: MutantDoc, mutate: (m: Record<string, unknown>) => void, touchReceipts = false): void {
  const [k, v] = Object.entries(doc.program.manifests)[0]!;
  const mutated = structuredClone(v) as Record<string, unknown>;
  mutate(mutated);
  const key = dig(manifestToJson(parseOrganismManifest(mutated)));
  delete doc.program.manifests[k];
  doc.program.manifests[key] = mutated;
  doc.program.root = key;
  for (const rec of Object.values(doc.records)) rec["manifestDigest"] = key;
  if (touchReceipts) for (const rec of Object.values(doc.receipts)) rec["manifestDigest"] = key;
  rebind(doc);
}

function firstCell(receipt: Record<string, unknown>): [string, Record<string, unknown>] {
  const cells = receipt["cells"] as Record<string, Record<string, unknown>>;
  const k = Object.keys(cells)[0]!;
  return [k, cells[k]!];
}

function firstEffect(receipt: Record<string, unknown>): Record<string, unknown> {
  const e = (receipt["effects"] as Record<string, unknown>[]);
  if (e.length === 0) throw new Error("base receipt carries no effects");
  return e[0]!;
}

// ------------------------------------------------------------- catalog ----

export const MUTANTS: readonly Mutant[] = [
  // ---------------------------------------------------- envelope level ---
  {
    id: "envelope-contract-rewritten", field: "contract", kind: "admission", bases: ALL,
    apply: d => { d.contract = "algal.process-evidence.v2"; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "contract" },
    note: "the envelope contract names the verifier's own schema",
  },
  {
    id: "envelope-unknown-key", field: "(envelope unknown key)", kind: "admission", bases: ALL,
    apply: d => { d["executable"] = "/bin/sh"; },
    expect: { stage: "admission", code: "PARSE_FAILED", part: "unknown key" },
    note: "a foreign key cannot smuggle host authority into evidence",
  },
  {
    id: "envelope-head-foreign", field: "head", kind: "admission", bases: ALL,
    apply: d => { d.head = FOREIGN; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "head or root" },
    note: "head must name a declared record",
  },
  {
    id: "envelope-head-nondigest", field: "head", kind: "admission", bases: ALL,
    apply: d => { d.head = "not a digest"; },
    expect: { stage: "admission", code: "PARSE_FAILED" },
    note: "head must be a well-formed digest token",
  },
  // ------------------------------------------------------ record layer ---
  {
    id: "record-stale-key", field: "records (key)", kind: "admission", bases: ALL,
    apply: d => {
      const k = d.head as string;
      d.records[FOREIGN] = structuredClone(d.records[k]!);
      delete d.records[k];
      d.head = FOREIGN;
    },
    expect: { stage: "admission", code: "DIGEST_MISMATCH", part: "digest" },
    note: "control: a key that does not hash to its record is rejected before semantics",
  },
  {
    id: "record-extra-field", field: "records[].(unknown key)", kind: "admission", bases: ALL,
    apply: d => atHead(d, r => { r["executable"] = "/bin/sh"; }),
    expect: { stage: "admission", code: "PARSE_FAILED", part: "unknown key" },
    note: "record schema rejects unknown fields even after honest rebind",
  },
  {
    id: "record-status-bogus", field: "records[].status", kind: "admission", bases: ALL,
    apply: d => atHead(d, r => { r["status"] = "escaped"; }),
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "status" },
    note: "the status vocabulary is closed",
  },
  {
    id: "record-generation-over-max", field: "records[].maxGenerations", kind: "admission", bases: ALL,
    apply: d => atHead(d, r => { r["maxGenerations"] = 0; }),
    expect: { stage: "admission", code: "PARSE_FAILED", part: "maxGenerations" },
    note: "the record parser itself enforces the generation bound — before the semantic layer",
  },
  {
    id: "record-args-nonobject", field: "records[].args", kind: "admission", bases: ALL,
    apply: d => atHead(d, r => { r["args"] = [1, 2]; }),
    expect: { stage: "admission", code: "PARSE_FAILED" },
    note: "args must be a record of input-cell port maps",
  },
  {
    id: "record-wake-on-terminal", field: "records[].wake", kind: "admission", bases: COMPLETE,
    apply: d => atHead(d, r => { r["wake"] = [`cap:wait:sha256:${"a".repeat(64)}`]; }),
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "wake" },
    note: "a terminal record cannot carry pending wake evidence",
  },
  {
    id: "record-wake-stripped", field: "records[].wake", kind: "semantic", bases: ["suspended", "uncertain"],
    apply: d => atHead(d, r => { r["wake"] = []; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "stripping the record's wake alone disagrees with the receipt's suspended effects",
  },
  {
    id: "record-status-complete-to-failed", field: "records[].status", kind: "semantic", bases: COMPLETE,
    apply: d => atHead(d, r => { r["status"] = "failed"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not match record" },
    note: "the receipt's outcome refutes a forged terminal status",
  },
  {
    id: "record-status-to-suspended", field: "records[].status", kind: "semantic", bases: COMPLETE,
    apply: d => atHead(d, r => { r["status"] = "suspended"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not match record" },
    note: "a complete run cannot be re-dressed as a suspension",
  },
  {
    id: "record-generation-bump", field: "records[].generation", kind: "semantic", bases: ALL,
    apply: d => atHead(d, r => { r["generation"] = (r["generation"] as number) + 2; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "invalid" },
    note: "generation arithmetic is checked against the chain",
  },
  {
    id: "record-previous-skip-dispatch", field: "records[].previous", kind: "semantic", bases: TERMINAL,
    apply: d => atHead(d, r => { r["previous"] = chainKeys(d)[0]!; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "transition" },
    note: "skipping the dispatch-intent record breaks the transition rules",
  },
  {
    id: "record-name-mutated", field: "records[].name", kind: "semantic", bases: ALL,
    apply: d => atRecord(d, 0, r => { r["name"] = "forged-name"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "definition changed" },
    note: "the process name is part of the immutable definition across the chain",
  },
  {
    id: "record-args-mutated", field: "records[].args", kind: "semantic", bases: COMPLETE,
    apply: d => atRecord(d, 0, r => { (r["args"] as Record<string, unknown>)["forged"] = { x: 1 }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "definition changed" },
    note: "run arguments are part of the immutable definition",
  },
  {
    id: "record-cause-start-to-manual", field: "records[].cause", kind: "semantic", bases: ALL,
    apply: d => atRecord(d, 1, r => { r["cause"] = "manual"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "cause" },
    note: "a first dispatch is only lawful from cause start",
  },
  {
    id: "record-mid-dropped", field: "records (missing member)", kind: "semantic", bases: ALL,
    apply: d => { delete d.records[chainKeys(d)[1]!]; },
    expect: { stage: "semantic", code: "STORE_MISS", part: "declared dependency" },
    note: "an undeclared read fails closed even though every digest is honest",
  },
  {
    id: "record-manifest-swap", field: "records[].manifestDigest + program.root", kind: "semantic", bases: COMPLETE,
    apply: d => {
      const forged = manifestToJson(parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:forged", name: "Forged",
        cells: [{ id: "forged", kind: "const", outputs: { value: { type: "json", value: 0 } } }], edges: [],
      }));
      const fk = dig(forged);
      d.program.manifests[fk] = forged;
      d.program.root = fk;
      for (const rec of Object.values(d.records)) rec["manifestDigest"] = fk;
      rebind(d);
    },
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not match record" },
    note: "rebinding every record to a foreign manifest still leaves the recorded receipts disagreeing",
  },
  // ------------------------------------------------------ receipt layer --
  {
    id: "receipt-stale-digest-field", field: "receipts[].digest", kind: "admission", bases: RECEIPTED,
    apply: d => {
      const key = Object.keys(d.receipts)[0]!;
      const rec = structuredClone(d.receipts[key]!);
      rec["outcome"] = "stuck";
      delete d.receipts[key];
      d.receipts[dig(rec)] = rec;   // honest map key, stale inner digest field
    },
    expect: { stage: "admission", code: "DIGEST_MISMATCH", part: "receipt" },
    note: "the receipt's own digest field is recomputed at admission",
  },
  {
    id: "receipt-outcome-flip", field: "receipts[].outcome", kind: "semantic", bases: COMPLETE,
    apply: d => atReceipt(d, r => { r["outcome"] = "failed"; r["failure"] = { code: "IO_FAILED", message: "forged" }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not match record" },
    note: "a rehashed receipt whose outcome disagrees with the record fails the history check",
  },
  {
    id: "receipt-outcome-and-status", field: "receipts[].outcome + records[].status", kind: "semantic", bases: COMPLETE,
    apply: d => {
      atReceipt(d, r => { r["outcome"] = "failed"; r["failure"] = { code: "IO_FAILED", message: "forged" }; });
      atHead(d, r => { r["status"] = "failed"; });
    },
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not replay" },
    note: "the deepest lie — record and receipt agree; only bit-for-bit replay refutes it",
  },
  {
    id: "receipt-cell-status", field: "receipts[].cells.*.status", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["status"] = "skipped"; delete c["outputs"]; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "a cell's recorded status cannot be rewritten",
  },
  {
    id: "receipt-cell-outputs", field: "receipts[].cells.*.outputs", kind: "semantic", bases: ["complete"],
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["outputs"] = { value: { answer: 0 } }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "outputs" },
    note: "cell outputs are replayed and compared",
  },
  {
    id: "receipt-cell-work", field: "receipts[].cells.*.work", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["work"] = 0; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "work" },
    note: "per-cell work accounting is replay-checked",
  },
  {
    id: "receipt-cell-via", field: "receipts[].cells.*.via", kind: "survivor-probe", bases: COMPLETE,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["via"] = "forged-transport"; }),
    expect: { stage: "survivor", reason: "via records which transport resolved the cell — it is echoed verbatim by replay (replayVia serves the recorded value), so a forged transport name verifies: the field binds what the host claimed, not an independently re-resolvable fact" },
    note: "documented boundary: transport provenance is replay-echoed",
  },
  {
    id: "receipt-cell-via-uncommitted", field: "receipts[].cells.*.via (on a non-committed cell)", kind: "semantic", bases: ["failed-miss", "suspended"],
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["via"] = "forged-transport"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "replay stamps via only on committed cells — via on a failed/suspended cell cannot be reproduced",
  },
  {
    id: "receipt-cell-slot", field: "receipts[].cells.*.slot", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["slot"] = { name: "forged", mode: "write" }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "slot" },
    note: "durable-slot provenance is replay-pinned",
  },
  {
    id: "receipt-cell-shadowout", field: "receipts[].cells.*.shadowOut", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["shadowOut"] = { forged: true }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "shadowOut" },
    note: "shadow outputs are replay-pinned",
  },
  {
    id: "receipt-cell-rounds", field: "receipts[].cells.*.rounds", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["rounds"] = 99; c["items"] = 7; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "iteration/item accounting is compared",
  },
  {
    id: "receipt-cell-failure", field: "receipts[].cells.*.failure", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["failure"] = { code: "INTERNAL", message: "forged" }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "failure" },
    note: "recorded failure detail is compared",
  },
  {
    id: "receipt-cell-toolcalls", field: "receipts[].cells.*.toolCalls", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["toolCalls"] = [{ forged: true }]; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "toolCalls" },
    note: "the recorded tool-call transcript is compared",
  },
  {
    id: "receipt-cell-effectdigest", field: "receipts[].cells.*.effectDigest", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { const [, c] = firstCell(r); c["effectDigest"] = FOREIGN; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "cell-level effect binding is part of the canonical record",
  },
  {
    id: "receipt-args-mutated", field: "receipts[].args", kind: "semantic", bases: COMPLETE,
    apply: d => atReceipt(d, r => { (r["args"] as Record<string, unknown>)["forged"] = { x: 1 }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "run arguments are replayed verbatim — a mutated set cannot reproduce the cells",
  },
  {
    id: "receipt-work-steps", field: "receipts[].work.steps", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { (r["work"] as Record<string, unknown>)["steps"] = 0; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "work.steps" },
    note: "aggregate work accounting is compared",
  },
  {
    id: "receipt-work-agentcalls", field: "receipts[].work.agentCalls", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { (r["work"] as Record<string, unknown>)["agentCalls"] = 7; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "agentCalls" },
    note: "agent-call accounting is compared",
  },
  {
    id: "receipt-work-units", field: "receipts[].work.units", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { (r["work"] as Record<string, unknown>)["units"] = 0; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "units" },
    note: "unit accounting is compared",
  },
  {
    id: "receipt-events-rewritten", field: "receipts[].events", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { (r["events"] as Record<string, unknown>[])[1]!["path"] = "forged"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "events" },
    note: "the event log is compared canonically",
  },
  {
    id: "receipt-runtime-renamed", field: "receipts[].runtime", kind: "survivor-probe", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { (r["runtime"] as Record<string, unknown>)["version"] = "9.9.9-forged"; }),
    expect: { stage: "survivor", reason: "replay stamps the receipt's own runtime field into the rerun by design — replay determinism must hold across runtime versions, so the recorded runtime is echoed, not re-derived" },
    note: "documented boundary: runtime identity is claimed metadata",
  },
  {
    id: "receipt-manifestkey-renamed", field: "receipts[].manifestKey", kind: "semantic", bases: RECEIPTED,
    apply: d => atReceipt(d, r => { r["manifestKey"] = "organism:forged"; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "the manifest key is part of the canonical record",
  },
  {
    id: "receipt-contract-mutated", field: "receipts[].contract", kind: "admission", bases: RECEIPTED,
    apply: d => { const k = Object.keys(d.receipts)[0]!; const r = structuredClone(d.receipts[k]!); r["contract"] = "algal.run.v2"; delete d.receipts[k]; d.receipts[dig(r)] = r; },
    expect: { stage: "admission", code: "PARSE_FAILED", part: "contract" },
    note: "the receipt contract is checked at admission, before replay",
  },
  {
    id: "receipt-effect-requestdigest", field: "receipts[].effects.*.requestDigest", kind: "semantic", bases: ["suspended"],
    apply: d => atReceipt(d, r => { firstEffect(r)["requestDigest"] = FOREIGN; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "a forged request digest cannot be served by replay and diverges",
  },
  {
    id: "receipt-effect-output", field: "receipts[].effects.*.output", kind: "semantic", bases: ["suspended"],
    apply: d => atReceipt(d, r => { const e = firstEffect(r); delete e["error"]; delete e["wake"]; e["output"] = { forged: true }; }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "turning a suspended effect into a success replays to a different run",
  },
  {
    id: "receipt-effect-error-code", field: "receipts[].effects.*.error.code", kind: "admission", bases: ["suspended"],
    apply: d => atReceipt(d, r => { (firstEffect(r)["error"] as Record<string, unknown>)["code"] = "IO_FAILED"; }),
    expect: { stage: "admission", code: "PARSE_FAILED", part: "wake" },
    note: "the receipt schema pins wake handles to EFFECT_SUSPENDED — the mutation fails before semantics",
  },
  {
    id: "receipt-effect-executor", field: "receipts[].effects.*.executor", kind: "survivor-probe", bases: ["suspended"],
    apply: d => atReceipt(d, r => { firstEffect(r)["executor"] = "tool:forged-executor"; }),
    expect: { stage: "survivor", reason: "the executor id is what the host claimed ran the effect; replay echoes it into the rerun receipt, so a forged id verifies — evidence binds the recorded claim, not the true executor" },
    note: "documented boundary: executor identity is executor-reported",
  },
  {
    id: "receipt-effect-usage", field: "receipts[].effects.*.usage", kind: "survivor-probe", bases: ["suspended"],
    apply: d => atReceipt(d, r => { firstEffect(r)["usage"] = { model: "forged", tokensIn: 1, tokensOut: 1 }; }),
    expect: { stage: "survivor", reason: "usage is executor-reported telemetry replayed verbatim; evidence cannot refute a reported meter — the record binds what was claimed" },
    note: "documented boundary: usage is claimed metering, not re-derived work",
  },
  {
    id: "receipt-effect-configurationdigest", field: "receipts[].effects.*.configurationDigest", kind: "survivor-probe", bases: ["suspended"],
    apply: d => atReceipt(d, r => { firstEffect(r)["configurationDigest"] = FOREIGN; }),
    expect: { stage: "survivor", reason: "configurationDigest binds an admitted executor configuration — it is replayed verbatim; offline evidence cannot re-derive which configuration the host admitted" },
    note: "documented boundary: configuration identity is claimed, replay-echoed",
  },
  {
    id: "receipt-effect-wake-strip", field: "receipts[].effects.*.wake + records[].wake", kind: "survivor-probe", bases: ["suspended"],
    apply: d => {
      atReceipt(d, r => { for (const e of r["effects"] as Record<string, unknown>[]) delete e["wake"]; });
      atHead(d, r => { r["wake"] = []; });
    },
    expect: { stage: "survivor", reason: "the suspension's wake set is evidence-derived — record and receipt agree and replay reproduces the claimed effects; stripping yields consistent evidence of a suspension claiming no wakeup path" },
    note: "documented boundary: the wake set is self-authenticating within the claim",
  },
  {
    id: "receipt-effect-appended", field: "receipts[].effects (count)", kind: "semantic", bases: ["suspended"],
    apply: d => atReceipt(d, r => { const e = structuredClone(firstEffect(r)); e["requestDigest"] = FOREIGN; (r["effects"] as unknown[]).push(e); }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "an extra recorded effect cannot be reproduced by the run",
  },
  // ------------------------------------------------------ program layer --
  {
    id: "program-contract-rewritten", field: "program.contract", kind: "admission", bases: ALL,
    apply: d => { d.program.contract = "algal.bundle.v2"; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "program contract" },
    note: "the embedded bundle contract is fixed",
  },
  {
    id: "program-root-foreign", field: "program.root", kind: "admission", bases: ALL,
    apply: d => { d.program.root = FOREIGN; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "head or root" },
    note: "root must equal the head record's manifestDigest and be declared",
  },
  {
    id: "program-manifest-stale-key", field: "program.manifests (key)", kind: "admission", bases: ALL,
    apply: d => {
      const [k, v] = Object.entries(d.program.manifests)[0]!;
      const m = structuredClone(v) as Record<string, unknown>;
      m["name"] = "forged";
      d.program.manifests[k] = m;  // mutated content, stale key
    },
    expect: { stage: "admission", code: "DIGEST_MISMATCH", part: "manifest" },
    note: "manifest keys are digest-of-parsed-form",
  },
  {
    id: "program-manifest-rekeyed-no-root", field: "program.manifests (key) + root", kind: "admission", bases: ALL,
    apply: d => {
      const [k, v] = Object.entries(d.program.manifests)[0]!;
      const m = structuredClone(v) as Record<string, unknown>;
      m["name"] = "forged";
      delete d.program.manifests[k];
      d.program.manifests[dig(m)] = m;  // honestly keyed — but root still names the old digest
    },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "head or root" },
    note: "an honestly-keyed manifest still fails when root names something absent",
  },
  {
    id: "program-manifest-nonparseable", field: "program.manifests (content)", kind: "admission", bases: ALL,
    apply: d => {
      const [k, v] = Object.entries(d.program.manifests)[0]!;
      const m = structuredClone(v) as Record<string, unknown>;
      m["contract"] = "algal.organism.v2";
      delete d.program.manifests[k];
      d.program.manifests[dig(m)] = m;
    },
    expect: { stage: "admission", code: "PARSE_FAILED" },
    note: "a manifest that fails the manifest parser fails evidence admission",
  },
  {
    id: "program-manifest-cell-forged", field: "program.manifests[].cells", kind: "semantic", bases: ["complete"],
    apply: d => atManifest(d, m => {
      ((((m["cells"] as Record<string, unknown>[])[0]!["outputs"]) as Record<string, unknown>)["value"] as Record<string, unknown>)["value"] = { answer: 0 };
    }),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not match record" },
    note: "a forged manifest keeps the receipts' manifestDigest honest — the record/receipt binding still disagrees",
  },
  {
    id: "program-manifest-budget-lowered", field: "program.manifests[].budgets", kind: "semantic", bases: ["complete"],
    apply: d => atManifest(d, m => { (m["budgets"] as Record<string, unknown>)["maxSteps"] = 1; }, true),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not replay" },
    note: "a self-consistent budget tightening is caught — the event log binds the manifest digest",
  },
  {
    id: "program-manifest-name-renamed", field: "program.manifests[].name + receipts[].manifestDigest", kind: "semantic", bases: ["complete"],
    apply: d => atManifest(d, m => { m["name"] = "Renamed program"; }, true),
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "events" },
    note: "even a semantically inert manifest edit is caught — the run.start event binds the manifest digest",
  },
  {
    id: "program-value-dropped", field: "program.values (needed entry)", kind: "semantic", bases: ["value-dep"],
    apply: d => {
      const needed = Object.keys(d.program.values)[0]!;
      delete d.program.values[needed];
      d.missing.values = [needed];
    },
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "declaring a needed value absent replays to a different outcome",
  },
  {
    id: "program-value-forged", field: "program.values (content)", kind: "admission", bases: ["value-dep"],
    apply: d => {
      const k = Object.keys(d.program.values)[0]!;
      d.program.values[k] = { retained: "forged" };  // same key, different bytes
    },
    expect: { stage: "admission", code: "DIGEST_MISMATCH" },
    note: "content under a foreign digest fails the key check",
  },
  {
    id: "missing-values-overlap", field: "missing.values", kind: "admission", bases: ALL,
    apply: d => { d.missing.values = [d.head as string]; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "overlap" },
    note: "a digest cannot be both present and missing",
  },
  {
    id: "missing-values-unsorted", field: "missing.values (order)", kind: "admission", bases: ["failed-miss"],
    apply: d => { const k = (d.missing.values as string[])[0]!; d.missing.values = [k, k]; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "sorted" },
    note: "the negative list is canonically ordered and unique",
  },
  {
    id: "missing-needed-dropped", field: "missing.values (needed entry)", kind: "semantic", bases: ["failed-miss"],
    apply: d => { d.missing.values = []; },
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH", part: "does not replay" },
    note: "the undeclared read lands inside the replayed run as a cell failure — the receipts diverge",
  },
  {
    id: "missing-manifests-extra", field: "missing.manifests (extra entry)", kind: "survivor-probe", bases: ALL,
    apply: d => { d.missing.manifests = [...(d.missing.manifests as string[]), FOREIGN].sort(); },
    expect: { stage: "survivor", reason: "the missing lists record what the source lacked at export time — an extra absent entry is an unverifiable claim about a past state, inert to replay of the retained head" },
    note: "documented boundary: extra negative declarations are claims, not checks",
  },
  // -------------------------------------------------------- tools layer --
  {
    id: "tools-effect-narrowed", field: "tools[].effect", kind: "semantic", bases: ["suspended", "uncertain"],
    apply: d => { Object.values(d.tools)[0]!["effect"] = "read"; },
    expect: { stage: "semantic", code: "RECEIPT_MISMATCH" },
    note: "narrowing the recorded effect class disagrees with the signature the run admitted",
  },
  {
    id: "tools-signature-invalid", field: "tools[] (schema)", kind: "admission", bases: ["suspended", "uncertain"],
    apply: d => { Object.values(d.tools)[0]!["effect"] = "nuke"; },
    expect: { stage: "admission", code: "PARSE_FAILED" },
    note: "the tool signature schema is closed",
  },
  {
    id: "tools-cost-mutated", field: "tools[].cost", kind: "survivor-probe", bases: ["suspended", "uncertain"],
    apply: d => { Object.values(d.tools)[0]!["cost"] = 999; },
    expect: { stage: "survivor", reason: "the declared signature is evidence of what the run admitted — replayed tool effects are served from the recorded receipts and the declared cost is never re-priced; the signature binds the claimed admission, not an independently recomputed charge" },
    note: "documented boundary: cost is claimed admission metadata",
  },
  {
    id: "tools-name-renamed", field: "tools (name)", kind: "semantic", bases: ["suspended", "uncertain"],
    apply: d => { const [k, v] = Object.entries(d.tools)[0]!; delete d.tools[k]; d.tools["forged.tool.v1"] = v; },
    expect: { stage: "semantic", code: "TOOL_UNKNOWN", part: "unknown tool" },
    note: "renaming the tool leaves the program's reference unbound at compile",
  },
  {
    id: "tools-maxbytes-mutated", field: "tools[].maxOutputBytes", kind: "survivor-probe", bases: ["suspended", "uncertain"],
    apply: d => { Object.values(d.tools)[0]!["maxOutputBytes"] = 1; },
    expect: { stage: "survivor", reason: "the declared output bound is claimed admission metadata — the replayed tool effect is served from the recorded receipt, whose output already fits whatever the record claimed" },
    note: "documented boundary: signature bounds are claimed, not re-enforced offline",
  },
  {
    id: "tools-extra-inert", field: "tools (extra entry)", kind: "survivor-probe", bases: ["suspended"],
    apply: d => { d.tools["fixture.inert.v1"] = { inputs: {}, outputs: {}, effect: "read", cost: 1, maxOutputBytes: 256 }; },
    expect: { stage: "survivor", reason: "a declared-but-unreferenced tool signature is inert — offline tools cannot be invoked; the declared set is evidence of what the run could name, and extra names carry no capability" },
    note: "documented boundary: declaration is not authority",
  },
  {
    id: "tools-name-nul", field: "tools (name format)", kind: "admission", bases: ["suspended"],
    apply: d => { d.tools["bad\0name"] = { inputs: {}, outputs: {}, effect: "read", cost: 1, maxOutputBytes: 256 }; },
    expect: { stage: "admission", code: "RECEIPT_MISMATCH", part: "tool name" },
    note: "tool names cannot contain NUL",
  },
  // ------------------------------------------------------ survivors ------
  {
    id: "record-extra-unreferenced", field: "records (extra member)", kind: "survivor-probe", bases: ALL,
    apply: d => {
      const forged = {
        contract: "algal.process.v1", name: "orphan", manifestDigest: d.program.root,
        args: {}, maxGenerations: 8, generation: 0, status: "ready", wake: [],
      };
      d.records[dig(forged)] = forged;
    },
    expect: { stage: "survivor", reason: "an unreferenced record is declared evidence that replay never reads — it extends the claim set without changing what the head authenticates" },
    note: "documented boundary: membership is not endorsement",
  },
  {
    id: "head-trimmed-to-prior", field: "head (earlier record)", kind: "survivor-probe", bases: ["suspended"],
    apply: d => {
      const keys = chainKeys(d);
      d.head = keys[0]!;
      for (const k of keys.slice(1)) delete d.records[k];
      for (const k of Object.keys(d.receipts)) delete d.receipts[k];
    },
    expect: { stage: "survivor", reason: "evidence of an earlier head is honest evidence of that head — binding `head` to a claimed process is the caller's obligation, discharged through evidenceDigest and the head digest" },
    note: "the verifier authenticates the presented chain, not the claim about which head it should be",
  },
];

/** Every security/custody/policy-relevant field and how the lane treats it. */
export const FIELD_LEDGER: readonly { field: string; coveredBy: string; why?: string }[] = [
  { field: "contract", coveredBy: "envelope-contract-rewritten" },
  { field: "head", coveredBy: "envelope-head-foreign" },
  { field: "records (keys)", coveredBy: "record-stale-key" },
  { field: "records (membership)", coveredBy: "record-mid-dropped" },
  { field: "records[].name", coveredBy: "record-name-mutated" },
  { field: "records[].manifestDigest", coveredBy: "record-manifest-swap" },
  { field: "records[].args", coveredBy: "record-args-mutated" },
  { field: "records[].maxGenerations", coveredBy: "record-generation-over-max" },
  { field: "records[].generation", coveredBy: "record-generation-bump" },
  { field: "records[].status", coveredBy: "record-status-complete-to-failed" },
  { field: "records[].wake", coveredBy: "record-wake-stripped" },
  { field: "records[].previous", coveredBy: "record-previous-skip-dispatch" },
  { field: "records[].receipt", coveredBy: "receipt-outcome-flip" },
  { field: "records[].cause", coveredBy: "record-cause-start-to-manual" },
  { field: "receipts[].contract", coveredBy: "receipt-contract-mutated" },
  { field: "receipts[].digest", coveredBy: "receipt-stale-digest-field" },
  { field: "receipts[].manifestDigest", coveredBy: "program-manifest-name-renamed" },
  { field: "receipts[].manifestKey", coveredBy: "receipt-manifestkey-renamed" },
  { field: "receipts[].runtime", coveredBy: "receipt-runtime-renamed" },
  { field: "receipts[].args", coveredBy: "receipt-args-mutated" },
  { field: "receipts[].outcome", coveredBy: "receipt-outcome-flip" },
  { field: "receipts[].cells.*.status", coveredBy: "receipt-cell-status" },
  { field: "receipts[].cells.*.outputs", coveredBy: "receipt-cell-outputs" },
  { field: "receipts[].cells.*.work", coveredBy: "receipt-cell-work" },
  { field: "receipts[].cells.*.rounds", coveredBy: "receipt-cell-rounds" },
  { field: "receipts[].cells.*.items", coveredBy: "receipt-cell-rounds", why: "items shares the canonical-compare axis with rounds" },
  { field: "receipts[].cells.*.failure", coveredBy: "receipt-cell-failure" },
  { field: "receipts[].cells.*.toolCalls", coveredBy: "receipt-cell-toolcalls" },
  { field: "receipts[].cells.*.shadowOut", coveredBy: "receipt-cell-shadowout" },
  { field: "receipts[].cells.*.via", coveredBy: "receipt-cell-via" },
  { field: "receipts[].cells.*.slot", coveredBy: "receipt-cell-slot" },
  { field: "receipts[].cells.*.effectDigest", coveredBy: "receipt-cell-effectdigest" },
  { field: "receipts[].effects.*.requestDigest", coveredBy: "receipt-effect-requestdigest" },
  { field: "receipts[].effects.*.output", coveredBy: "receipt-effect-output" },
  { field: "receipts[].effects.*.error", coveredBy: "receipt-effect-error-code" },
  { field: "receipts[].effects.*.executor", coveredBy: "receipt-effect-executor" },
  { field: "receipts[].effects.*.usage", coveredBy: "receipt-effect-usage" },
  { field: "receipts[].effects.*.wake", coveredBy: "receipt-effect-wake-strip" },
  { field: "receipts[].effects.*.configurationDigest", coveredBy: "receipt-effect-configurationdigest" },
  { field: "receipts[].effects.*.cached", coveredBy: "receipt-effect-usage", why: "cached is executor-reported metadata on the same replay-echo axis as usage" },
  { field: "receipts[].effects.*.retryable", coveredBy: "not-applicable", why: "admitted value is the literal false only; a mutated true fails schema admission" },
  { field: "receipts[].events", coveredBy: "receipt-events-rewritten" },
  { field: "receipts[].work.*", coveredBy: "receipt-work-steps" },
  { field: "receipts[].failure.*", coveredBy: "receipt-cell-failure", why: "run-level failure detail shares the canonical-compare axis" },
  { field: "program.contract", coveredBy: "program-contract-rewritten" },
  { field: "program.root", coveredBy: "program-root-foreign" },
  { field: "program.manifests (keys/content)", coveredBy: "program-manifest-stale-key" },
  { field: "program.manifests[].cells", coveredBy: "program-manifest-cell-forged" },
  { field: "program.manifests[].budgets", coveredBy: "program-manifest-budget-lowered" },
  { field: "program.manifests[].name", coveredBy: "program-manifest-name-renamed" },
  { field: "program.values (keys/content)", coveredBy: "program-value-forged" },
  { field: "tools (names)", coveredBy: "tools-name-renamed" },
  { field: "tools[].inputs/outputs", coveredBy: "tools-signature-invalid", why: "port-map schema rejects malformed entries at signature admission" },
  { field: "tools[].effect", coveredBy: "tools-effect-narrowed" },
  { field: "tools[].cost", coveredBy: "tools-cost-mutated" },
  { field: "tools[].maxOutputBytes", coveredBy: "tools-maxbytes-mutated" },
  { field: "missing.manifests", coveredBy: "missing-manifests-extra" },
  { field: "missing.values", coveredBy: "missing-needed-dropped" },
];
