/**
 * verify/mutation/run.ts — drives the evidence-mutation catalog.
 *
 * For every (base, mutant) pair: clone the minted evidence, apply the
 * mutant, then probe it in two stages that mirror the production order —
 * `parseProcessEvidence` (admission) then `verifyProcessEvidence`
 * (semantic: chain transition rules + bit-for-bit replay). The observed
 * stage, error code and message are matched against the mutant's declared
 * expectation. A mutant that verifies is only a pass when its expectation
 * is `survivor` — an expected survivor documents where the evidence's
 * self-consistency guarantee ends and the caller's binding obligation
 * begins.
 *
 * The suite fails on ANY observation that does not match its declared
 * expectation — wrong stage, wrong code, missing message part, or an
 * undocumented survivor.
 */

import { errorReport } from "../../src/errors";
import { parseProcessEvidence, verifyProcessEvidence } from "../../src/process-evidence";
import { BASE_IDS, mintBases, type Minted } from "./fixtures";
import { FIELD_LEDGER, MUTANTS, type MutantDoc } from "./mutants";

export const MUTATION_LIMITS = {
  mutants: 256,        // hard bound on catalog size — this lane enumerates, it does not loop
  messageBytes: 512,   // retained rejection detail per probe
} as const;

export type ProbeStage = "admission" | "semantic" | "accepted";

export type Probe = { stage: ProbeStage; code: string; message: string };

export type MutantResult = {
  id: string;
  base: string;
  field: string;
  kind: string;
  expect: { stage: string; code?: string | undefined; part?: string | undefined; reason?: string | undefined };
  observed: { stage: ProbeStage; code?: string | undefined; message?: string | undefined };
  pass: boolean;
};

export type MutationReport = {
  contract: "algal.evidence-mutation-report.v1";
  bases: { id: string; head: string; status: string; records: number; receipts: number }[];
  results: MutantResult[];
  totals: {
    mutants: number;
    probes: number;
    passed: number;
    failed: number;
    byExpectation: Record<string, number>;
    fieldCoverage: { fields: number; covered: number; declaredOnly: number };
  };
  survivors: { id: string; base: string; reason: string }[];
};

async function probe(doc: MutantDoc): Promise<Probe> {
  try {
    parseProcessEvidence(doc);
  } catch (error) {
    const r = errorReport(error);
    return { stage: "admission", code: r.code, message: r.message.slice(0, MUTATION_LIMITS.messageBytes) };
  }
  try {
    await verifyProcessEvidence(doc);
    return { stage: "accepted", code: "", message: "" };
  } catch (error) {
    const r = errorReport(error);
    return { stage: "semantic", code: r.code, message: r.message.slice(0, MUTATION_LIMITS.messageBytes) };
  }
}

function expected(rec: { stage: string; code?: string; part?: string; reason?: string }, p: Probe): boolean {
  if (rec.stage === "survivor") return p.stage === "accepted";
  if (p.stage !== rec.stage) return false;
  if (rec.code !== undefined && p.code !== rec.code) return false;
  if (rec.part !== undefined && !p.message.includes(rec.part)) return false;
  return true;
}

export async function runMutation(): Promise<MutationReport> {
  const minted: Map<string, Minted> = await mintBases();
  const results: MutantResult[] = [];
  const survivors: { id: string; base: string; reason: string }[] = [];
  const byExpectation: Record<string, number> = {};

  for (const baseId of BASE_IDS) {
    const mint = minted.get(baseId)!;
    // Baseline must verify — mutants start from admitted evidence only.
    await verifyProcessEvidence(mint.evidence);
    for (const mut of MUTANTS) {
      if (!mut.bases.includes(baseId)) continue;
      const doc = structuredClone(mint.evidence) as unknown as MutantDoc;
      let applyError: Probe | null = null;
      try {
        mut.apply(doc);
      } catch (error) {
        const r = errorReport(error);
        applyError = { stage: "admission", code: `MUTANT-INFRA:${r.code}`, message: r.message.slice(0, MUTATION_LIMITS.messageBytes) };
      }
      const p = applyError ?? await probe(doc);
      const pass = applyError === null && expected(mut.expect as { stage: string; code?: string; part?: string }, p);
      byExpectation[mut.expect.stage] = (byExpectation[mut.expect.stage] ?? 0) + 1;
      if (p.stage === "accepted" && mut.expect.stage === "survivor") {
        survivors.push({ id: mut.id, base: baseId, reason: mut.expect.reason });
      }
      results.push({
        id: mut.id, base: baseId, field: mut.field, kind: mut.kind,
        expect: mut.expect.stage === "survivor"
          ? { stage: "survivor", reason: mut.expect.reason }
          : { stage: mut.expect.stage, code: mut.expect.code, part: mut.expect.part },
        observed: { stage: p.stage, ...(p.code ? { code: p.code } : {}), ...(p.message ? { message: p.message } : {}) },
        pass,
      });
    }
  }

  const fields = FIELD_LEDGER.length;
  const covered = FIELD_LEDGER.filter(f => f.coveredBy !== "not-applicable").length;
  const report: MutationReport = {
    contract: "algal.evidence-mutation-report.v1",
    bases: BASE_IDS.map(id => {
      const m = minted.get(id)!;
      return {
        id,
        head: m.snapshot.digest,
        status: m.snapshot.process.status,
        records: Object.keys(m.evidence.records).length,
        receipts: Object.keys(m.evidence.receipts).length,
      };
    }),
    results,
    totals: {
      mutants: MUTANTS.length,
      probes: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      byExpectation,
      fieldCoverage: { fields, covered, declaredOnly: fields - covered },
    },
    survivors,
  };
  return report;
}
