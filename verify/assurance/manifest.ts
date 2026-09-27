/** Phase 17 release-assurance manifest: a bounded `algal.assurance-manifest.v1`
 * record that mirrors the parsed property ledger one claim per property, binds
 * each claimed result to content-addressed retained evidence under
 * `verify/results/`, and binds the exact governing input set per claim.
 *
 * The manifest licenses nothing by itself: every claim is checked against the
 * ledger (`checkManifestConsistency`) and against the live tree
 * (`checkManifestEvidence`). The EVIDENCE_STATES lattice is reused verbatim —
 * a claim may *parse* at any evidence class, but consistency requires it to be
 * exactly what the named suite's evidence class produces, so a model-level
 * suite can never back a `proved-implementation` or `qualified` entry. */

import { isAbsolute, join } from "node:path";
import { EVIDENCE_STATES, suiteEvidenceClass, type EvidenceState, type Registry } from "../lib/claims";
import { readRetainedEvidence } from "../lib/evidence-retention";
import { hashFile, hashJson, inputBindings, readJson, type FileBinding } from "../lib/files";
import { array, boolean, digest, member, natural, record, relativePath, requireThat, string } from "../lib/schema";
import { SUITES } from "../lib/suites";

export const MANIFEST_PATH = "verify/assurance/manifest.json";
const RESULT_PATTERN = /^verify\/results\/([0-9a-f]{64})\/manifest\.json$/;

export type AssuranceClaim = {
  /** Ledger property id this claim mirrors. */
  id: string;
  /** Evidence class from the shared ledger lattice — never weakened. */
  evidence: EvidenceState;
  /** Named suite that produced the evidence, or null. */
  suite: string | null;
  required: boolean;
  /** Result bindings: content-addressed retained-evidence manifests. */
  results: FileBinding[];
  /** Governing input set: the property's ledger sources ∪ specs bindings. */
  inputs: FileBinding[];
};
export type AssuranceManifest = {
  contract: "algal.assurance-manifest.v1";
  registryDigest: string;
  toolchainsDigest: string;
  distributionsDigest: string;
  inputDigest: string;
  claims: AssuranceClaim[];
};

function binding(value: unknown, label: string): FileBinding {
  const item = record(value, ["path", "sha256"], label);
  return { path: relativePath(item.path, `${label}.path`), sha256: digest(item.sha256, `${label}.sha256`) };
}
function sortedUniquePaths(bindings: FileBinding[], label: string): void {
  const paths = bindings.map(item => item.path);
  requireThat(new Set(paths).size === paths.length, `${label}: duplicate path`);
  for (let i = 1; i < paths.length; i++) requireThat(paths[i - 1]! < paths[i]!, `${label}: entries must be sorted by path`);
}

export function parseAssuranceManifest(value: unknown): AssuranceManifest {
  const root = record(value, ["claims", "contract", "distributionsDigest", "inputDigest", "registryDigest", "toolchainsDigest"], "assurance manifest");
  requireThat(root.contract === "algal.assurance-manifest.v1", "unknown assurance manifest contract");
  const claims = array(root.claims, "claims", 1, 512).map((value, i) => {
    const item = record(value, ["evidence", "id", "inputs", "required", "results", "suite"], `claim ${i}`);
    const id = string(item.id, `claim ${i}.id`, 32);
    requireThat(/^[A-Z]{3}-\d{2}$/.test(id), `${id}: invalid property ID`);
    const evidence = member(item.evidence, EVIDENCE_STATES, `${id}.evidence`);
    const suite = item.suite === null ? null : string(item.suite, `${id}.suite`, 128);
    if (suite !== null) requireThat(SUITES.has(suite), `${id}: unknown suite ${suite}`);
    const results = array(item.results, `${id}.results`, 0, 64).map((value, j) => {
      const result = binding(value, `${id}.results[${j}]`);
      const match = RESULT_PATTERN.exec(result.path);
      requireThat(match !== null, `${id}: ${result.path} is not a content-addressed retained manifest`);
      requireThat(result.sha256 === `sha256:${match![1]}`, `${id}: result binding digest must equal its content address`);
      return result;
    });
    const inputs = array(item.inputs, `${id}.inputs`, 1, 512).map((value, j) => binding(value, `${id}.inputs[${j}]`));
    sortedUniquePaths(results, `${id}.results`);
    sortedUniquePaths(inputs, `${id}.inputs`);
    return { id, evidence, suite, required: boolean(item.required, `${id}.required`), results, inputs };
  });
  requireThat(new Set(claims.map(claim => claim.id)).size === claims.length, "duplicate claim id");
  return {
    contract: "algal.assurance-manifest.v1",
    registryDigest: digest(root.registryDigest, "registryDigest"),
    toolchainsDigest: digest(root.toolchainsDigest, "toolchainsDigest"),
    distributionsDigest: digest(root.distributionsDigest, "distributionsDigest"),
    inputDigest: digest(root.inputDigest, "inputDigest"),
    claims,
  };
}

/** Pure honesty checks: the manifest mirrors the parsed ledger exactly and no
 * claim asserts evidence above what its suite can produce. No filesystem. */
export function checkManifestConsistency(manifest: AssuranceManifest, registry: Registry): void {
  requireThat(manifest.claims.length === registry.properties.length, "assurance claim inventory differs from the ledger");
  for (const [i, property] of registry.properties.entries()) {
    const claim = manifest.claims[i]!;
    requireThat(claim.id === property.id, `claim ${i}: ledger order differs (${claim.id} != ${property.id})`);
    requireThat(claim.evidence === property.evidence.status, `${claim.id}: manifest evidence ${claim.evidence} differs from ledger ${property.evidence.status}`);
    requireThat(claim.suite === property.evidence.suite, `${claim.id}: suite ${claim.suite} differs from ledger ${property.evidence.suite}`);
    requireThat(claim.required === property.evidence.required, `${claim.id}: required flag differs from the ledger`);
    if (claim.evidence === "not-started" || claim.evidence === "observed") {
      requireThat(claim.results.length === 0 && !claim.required, `${claim.id}: ${claim.evidence} evidence cannot cite results or be required`);
    } else {
      // Ready evidence must name a READY suite, and its class must be exactly
      // what that suite's scope supports — the same ceiling the ledger enforces.
      requireThat(claim.suite !== null && SUITES.get(claim.suite) === "ready", `${claim.id}: ${claim.evidence} evidence requires a READY suite`);
      requireThat(claim.evidence === suiteEvidenceClass(claim.suite), `${claim.id}: ${claim.evidence} is not the ${suiteEvidenceClass(claim.suite)} evidence that suite ${claim.suite} produces`);
      requireThat(claim.results.length > 0, `${claim.id}: ${claim.evidence} evidence needs a retained result`);
    }
    if (claim.required) requireThat(claim.suite !== null && SUITES.get(claim.suite) === "ready" && claim.results.length > 0, `${claim.id}: required evidence has no ready passing harness`);
    const recorded = [...property.evidence.results].sort();
    requireThat(claim.results.length === recorded.length && claim.results.every((result, j) => result.path === recorded[j]), `${claim.id}: result set differs from the ledger`);
    const expected = new Map<string, string>();
    for (const input of [...property.sources, ...property.specs]) {
      requireThat(!expected.has(input.path) || expected.get(input.path) === input.sha256, `${claim.id}: conflicting ledger digests for ${input.path}`);
      expected.set(input.path, input.sha256);
    }
    requireThat(claim.inputs.length === expected.size, `${claim.id}: governing input set differs from the ledger`);
    for (const input of claim.inputs) requireThat(expected.get(input.path) === input.sha256, `${claim.id}: input ${input.path} is outside the ledger governing set or its digest differs`);
  }
}

type RetainedSelection = {
  suite: string; classification: "admitted" | "diagnostic"; recordedArchive: string; authorityDigest: string;
  limits: { maxBytes: number; maxFileBytes: number; maxEntries: number; maxDepth: number };
};
function parseRetainedSelection(value: unknown, label: string): RetainedSelection {
  const item = record(value, ["authorityDigest", "bytes", "classification", "contract", "directories", "files", "limits", "recordedArchive", "suite"], label);
  requireThat(item.contract === "algal.retained-evidence.v1", `${label}: not a retained evidence manifest`);
  const suite = string(item.suite, `${label}.suite`, 128);
  requireThat(/^[a-z][a-z0-9-]{0,79}$/.test(suite), `${label}: invalid evidence suite`);
  const recordedArchive = string(item.recordedArchive, `${label}.recordedArchive`, 4096);
  requireThat(isAbsolute(recordedArchive), `${label}: recordedArchive must be an absolute path`);
  const limits = record(item.limits, ["maxBytes", "maxDepth", "maxEntries", "maxFileBytes"], `${label}.limits`);
  natural(item.bytes, `${label}.bytes`);
  array(item.directories, `${label}.directories`, 0, 8192);
  array(item.files, `${label}.files`, 0, 8192);
  return {
    suite, classification: member(item.classification, ["admitted", "diagnostic"] as const, `${label}.classification`),
    recordedArchive, authorityDigest: digest(item.authorityDigest, `${label}.authorityDigest`),
    limits: { maxBytes: natural(limits.maxBytes, `${label}.maxBytes`), maxFileBytes: natural(limits.maxFileBytes, `${label}.maxFileBytes`), maxEntries: natural(limits.maxEntries, `${label}.maxEntries`), maxDepth: natural(limits.maxDepth, `${label}.maxDepth`) },
  };
}

export type EvidenceCheck = { claims: number; governingInputs: number; resolvedResults: number };

/** Filesystem honesty: recorded digests must match the current tree, every
 * governing input must still hash to its recorded digest, and every claimed
 * result must resolve to an admitted retained-evidence container whose recorded
 * suite matches and whose raw bytes re-inventory exactly. The manifest's own
 * file is the single self-reference exclusion in the input digest. */
export async function checkManifestEvidence(root: string, manifest: AssuranceManifest): Promise<EvidenceCheck> {
  requireThat(await hashFile(root, "verify/properties.json") === manifest.registryDigest, "stale properties digest");
  requireThat(await hashFile(root, "verify/toolchains.json") === manifest.toolchainsDigest, "stale toolchains digest");
  requireThat(await hashFile(root, "verify/toolchain-distributions.json") === manifest.distributionsDigest, "stale toolchain distributions digest");
  const inputs = (await inputBindings(root)).filter(input => input.path !== MANIFEST_PATH);
  requireThat(hashJson(inputs) === manifest.inputDigest, "stale governing input set — a governed or verification input was added, removed or changed");
  let governingInputs = 0, resolvedResults = 0;
  for (const claim of manifest.claims) {
    for (const input of claim.inputs) {
      governingInputs++;
      // Ledger bindings may name governed files outside the conservative input
      // roots (docs/, for example); each is hashed directly.
      const actual = await hashFile(root, input.path).catch(() => null);
      requireThat(actual === input.sha256, `${claim.id}: governing input ${input.path} changed or is missing`);
    }
    for (const result of claim.results) {
      resolvedResults++;
      const match = RESULT_PATTERN.exec(result.path)!;
      requireThat(await hashFile(root, result.path) === result.sha256, `${claim.id}: retained manifest ${result.path} changed`);
      const selection = parseRetainedSelection(await readJson(root, result.path), `${claim.id}: ${result.path}`);
      requireThat(selection.suite === claim.suite, `${claim.id}: retained result belongs to suite ${selection.suite}, not ${claim.suite}`);
      requireThat(selection.classification === "admitted", `${claim.id}: diagnostic evidence cannot back a claim`);
      // Deep integrity: re-inventory the retained raw bytes and byte-compare
      // the reconstructed manifest, rather than trusting the outer file alone.
      await readRetainedEvidence({
        directory: join(root, "verify/results", match[1]), manifestSha256: result.sha256,
        suite: claim.suite!, classification: "admitted",
        recordedArchive: selection.recordedArchive, authorityDigest: selection.authorityDigest, limits: selection.limits,
        readmit: async () => null,
      });
    }
  }
  return { claims: manifest.claims.length, governingInputs, resolvedResults };
}

/** Derive the honest manifest from the live ledger and tree. The committed
 * manifest must equal this output byte-for-byte (canonical stableJson form). */
export async function deriveManifest(root: string, registry: Registry): Promise<AssuranceManifest> {
  const claims: AssuranceClaim[] = [];
  for (const property of registry.properties) {
    const inputs = new Map<string, string>();
    for (const input of [...property.sources, ...property.specs]) {
      requireThat(!inputs.has(input.path) || inputs.get(input.path) === input.sha256, `${property.id}: conflicting ledger digests for ${input.path}`);
      inputs.set(input.path, input.sha256);
    }
    const results: FileBinding[] = [];
    for (const path of [...property.evidence.results].sort()) {
      const match = RESULT_PATTERN.exec(path);
      requireThat(match !== null, `${property.id}: ${path} is not a content-addressed retained manifest`);
      results.push({ path, sha256: `sha256:${match[1]}` });
    }
    claims.push({
      id: property.id, evidence: property.evidence.status, suite: property.evidence.suite, required: property.evidence.required, results,
      inputs: [...inputs.entries()].map(([path, sha256]) => ({ path, sha256 })).sort((a, b) => a.path < b.path ? -1 : 1),
    });
  }
  const inputs = (await inputBindings(root)).filter(input => input.path !== MANIFEST_PATH);
  return {
    contract: "algal.assurance-manifest.v1",
    registryDigest: await hashFile(root, "verify/properties.json"),
    toolchainsDigest: await hashFile(root, "verify/toolchains.json"),
    distributionsDigest: await hashFile(root, "verify/toolchain-distributions.json"),
    inputDigest: hashJson(inputs), claims,
  };
}
