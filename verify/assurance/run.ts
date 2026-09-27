/** Phase 17 assurance suite entry: admit the committed assurance manifest,
 * check it mirrors the parsed ledger exactly, resolve every claimed result to
 * retained evidence, and checksum-verify the toolchain pins. Runner-ready but
 * not yet dispatched through verify/lib/runner.ts — invoke `bun test
 * verify/assurance` (see REGISTRATION.md). */

import { EVIDENCE_STATES, parseRegistry, type EvidenceState } from "../lib/claims";
import { hashBytes, readJson, stableJson } from "../lib/files";
import { requireThat } from "../lib/schema";
import { checkManifestConsistency, checkManifestEvidence, deriveManifest, parseAssuranceManifest, MANIFEST_PATH } from "./manifest";
import { checkToolchains, type ToolchainReport } from "./toolchains";

export type AssuranceDetails = {
  claims: number;
  statuses: Record<EvidenceState, number>;
  governingInputs: number;
  resolvedResults: number;
  manifestDigest: string;
  toolchains: ToolchainReport;
  scope: string;
};

export const ASSURANCE_SCOPE = "Assurance-manifest admission: each ledger property is mirrored once with its evidence class, suite, retained-result bindings and governing input set; claims cannot exceed the class the named suite produces, and toolchain pins are checksum-verified where provisioned. Bookkeeping and freshness evidence only — it proves no new property and qualifies no artifact.";

export async function runAssurance(root: string): Promise<AssuranceDetails> {
  const registry = parseRegistry(await readJson(root, "verify/properties.json"));
  const manifest = parseAssuranceManifest(await readJson(root, MANIFEST_PATH));
  checkManifestConsistency(manifest, registry);
  const evidence = await checkManifestEvidence(root, manifest);
  const derived = await deriveManifest(root, registry);
  requireThat(stableJson(derived) === stableJson(manifest), "committed assurance manifest is not the ledger-derived manifest — regenerate it with bun verify/assurance/generate.ts");
  const toolchains = await checkToolchains(root);
  const statuses = Object.fromEntries(EVIDENCE_STATES.map(status => [status, 0])) as Record<EvidenceState, number>;
  for (const claim of manifest.claims) statuses[claim.evidence]++;
  return {
    claims: manifest.claims.length, statuses,
    governingInputs: evidence.governingInputs, resolvedResults: evidence.resolvedResults,
    manifestDigest: hashBytes(stableJson(manifest)),
    toolchains, scope: ASSURANCE_SCOPE,
  };
}
