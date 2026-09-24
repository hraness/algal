import { array, boolean, digest, gitHash, member, record, relativePath, requireThat, string, strings } from "./schema";
import { governedPaths, hashFile, hashJson, readFileBounded, readJson, type FileBinding } from "./files";
import { SUITES } from "./suites";

export const EVIDENCE_STATES = ["not-started", "observed", "tested", "finite-checked", "proved-model", "proved-implementation", "qualified"] as const;
export type EvidenceState = typeof EVIDENCE_STATES[number];
export type SourceBinding = FileBinding & { symbols: string[] };
export type Property = {
  id: string; owner: string; reviewer: string; phase: string; findings: string[];
  severity: "critical" | "high" | "medium" | "low";
  statement: string; failure: string; domain: string; quantifiers: string;
  exclusions: string[]; profiles: string[]; assumptions: string[]; bounds: Record<string, string | number>;
  versions: string[]; relation: { kind: "unestablished" | "assumed" | "tested" | "proved"; description: string };
  sources: SourceBinding[]; specs: SourceBinding[]; licensedClaims: string[];
  evidence: { status: EvidenceState; suite: string | null; required: boolean; results: string[] };
  unresolved: string[];
};
export type Registry = {
  contract: "algal.verification-properties.v1";
  baseline: { commit: string; tree: string };
  dependencies: FileBinding[];
  profiles: { id: string; description: string; assumptions: string[] }[];
  properties: Property[];
};
export type Toolchains = {
  contract: "algal.verification-toolchains.v1";
  tools: { id: string; version: string; status: "available" | "planned"; command: string[]; sha256: string | null; notes: string }[];
};

const FAMILY_COUNTS: Record<string, number> = { ADM: 4, VAL: 5, GRF: 5, EXE: 6, EXP: 5, SRC: 4, RCP: 6, STO: 5, CUS: 4, PRO: 7, CAP: 4, MBX: 5, APP: 10, MEM: 7, CTX: 3, RET: 3, EVO: 8, HST: 15, PKG: 6, CLD: 7 };
export const REQUIRED_PROPERTY_IDS = Object.entries(FAMILY_COUNTS).flatMap(([prefix, count]) => Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`));
export const REQUIRED_FINDINGS = Array.from({ length: 12 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);

function fileBinding(value: unknown, label: string): FileBinding {
  const item = record(value, ["path", "sha256"], label);
  return { path: relativePath(item.path, `${label}.path`), sha256: digest(item.sha256, `${label}.sha256`) };
}

function sourceBindings(value: unknown, label: string): SourceBinding[] {
  const result = array(value, label, 1, 256).map((value, i) => {
    const item = record(value, ["path", "sha256", "symbols"], `${label}[${i}]`);
    return { path: relativePath(item.path, `${label}.path`), sha256: digest(item.sha256, `${label}.sha256`), symbols: strings(item.symbols, `${label}.symbols`, 1) };
  });
  requireThat(new Set(result.map(item => item.path)).size === result.length, `${label}: duplicate path`);
  return result;
}

function bounds(value: unknown, label: string): Record<string, string | number> {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), `${label}: expected bound map`);
  const entries = Object.entries(value);
  requireThat(entries.length > 0 && entries.length <= 128, `${label}: empty or excessive bounds`);
  const result: Record<string, string | number> = Object.create(null);
  for (const [key, item] of entries) {
    string(key, `${label} key`, 128);
    if (typeof item === "number") {
      requireThat(Number.isFinite(item) && item >= 0, `${label}.${key}: invalid numeric bound`);
      result[key] = item;
    } else result[key] = string(item, `${label}.${key}`);
  }
  return result;
}

function property(value: unknown, label: string): Property {
  const item = record(value, ["id", "owner", "reviewer", "phase", "findings", "severity", "statement", "failure", "domain", "quantifiers", "exclusions", "profiles", "assumptions", "bounds", "versions", "relation", "sources", "specs", "licensedClaims", "evidence", "unresolved"], label);
  const id = string(item.id, `${label}.id`, 32);
  requireThat(/^[A-Z]{3}-\d{2}$/.test(id), `${label}: invalid property ID`);
  const phase = string(item.phase, `${id}.phase`, 2);
  requireThat(/^(0\d|1\d)$/.test(phase), `${id}: phase must be 00..19`);
  const findings = strings(item.findings, `${id}.findings`, 0, 12);
  for (const finding of findings) requireThat(REQUIRED_FINDINGS.includes(finding), `${id}: unknown audit finding ${finding}`);
  const relation = record(item.relation, ["kind", "description"], `${id}.relation`);
  const evidence = record(item.evidence, ["status", "suite", "required", "results"], `${id}.evidence`);
  const status = member(evidence.status, EVIDENCE_STATES, `${id}.evidence.status`);
  const suite = evidence.suite === null ? null : string(evidence.suite, `${id}.evidence.suite`, 128);
  if (suite !== null) requireThat(SUITES.has(suite), `${id}: unknown suite ${suite}`);
  const required = boolean(evidence.required, `${id}.evidence.required`);
  const results = strings(evidence.results, `${id}.evidence.results`, 0, 64).map(path => relativePath(path, `${id}.result path`));
  const licensedClaims = strings(item.licensedClaims, `${id}.licensedClaims`);
  const unresolved = strings(item.unresolved, `${id}.unresolved`);
  const kind = member(relation.kind, ["unestablished", "assumed", "tested", "proved"] as const, `${id}.relation.kind`);
  if (kind === "proved") requireThat(status === "proved-implementation", `${id}: proved relation requires implementation evidence`);
  if (status === "not-started") {
    requireThat(!required && results.length === 0 && licensedClaims.length === 0 && unresolved.length > 0 && kind === "unestablished", `${id}: pending work cannot license claims or required passing evidence`);
  } else if (status !== "observed") {
    requireThat(suite !== null && results.length > 0, `${id}: claimed evidence needs a suite and result`);
    // Phase 00 deliberately has no admitted formal/result adapter. A document
    // asserting a successful proof cannot activate a future suite by itself.
    requireThat(SUITES.get(suite) === "ready", `${id}: evidence suite is Not started`);
    requireThat(false, `${id}: production proof/test-result admission adapter is Not started`);
  }
  if (required) requireThat(suite !== null && SUITES.get(suite) === "ready" && results.length > 0, `${id}: required evidence has no implemented passing harness`);
  if (status === "observed") requireThat(results.length === 0 && licensedClaims.length === 0 && !required && kind !== "proved" && kind !== "tested", `${id}: observation is not admitted execution/proof evidence`);
  return {
    id, phase, findings, severity: member(item.severity, ["critical", "high", "medium", "low"] as const, `${id}.severity`),
    owner: string(item.owner, `${id}.owner`, 256), reviewer: string(item.reviewer, `${id}.reviewer`, 256),
    statement: string(item.statement, `${id}.statement`), failure: string(item.failure, `${id}.failure`), domain: string(item.domain, `${id}.domain`), quantifiers: string(item.quantifiers, `${id}.quantifiers`),
    exclusions: strings(item.exclusions, `${id}.exclusions`), profiles: strings(item.profiles, `${id}.profiles`, 1), assumptions: strings(item.assumptions, `${id}.assumptions`, 1), bounds: bounds(item.bounds, `${id}.bounds`),
    versions: strings(item.versions, `${id}.versions`, 1), relation: { kind, description: string(relation.description, `${id}.relation.description`) },
    sources: sourceBindings(item.sources, `${id}.sources`), specs: sourceBindings(item.specs, `${id}.specs`), licensedClaims,
    evidence: { status, suite, required, results }, unresolved,
  };
}

export function parseRegistry(value: unknown): Registry {
  const root = record(value, ["contract", "baseline", "dependencies", "profiles", "properties"], "registry");
  requireThat(root.contract === "algal.verification-properties.v1", "unknown properties contract");
  const baseline = record(root.baseline, ["commit", "tree"], "baseline");
  const profiles = array(root.profiles, "profiles", 1, 32).map((value, i) => {
    const item = record(value, ["id", "description", "assumptions"], `profile ${i}`);
    const id = string(item.id, "profile id", 128);
    requireThat(/^[a-z][a-z0-9-]*$/.test(id), "invalid profile ID");
    return { id, description: string(item.description, "profile description"), assumptions: strings(item.assumptions, "profile assumptions", 1) };
  });
  requireThat(new Set(profiles.map(item => item.id)).size === profiles.length, "duplicate profile ID");
  const dependencies = array(root.dependencies, "dependencies", 1, 10_000).map((value, i) => fileBinding(value, `dependency ${i}`));
  requireThat(new Set(dependencies.map(item => item.path)).size === dependencies.length, "duplicate dependency path");
  const properties = array(root.properties, "properties", 1, 512).map((value, i) => property(value, `property ${i}`));
  requireThat(new Set(properties.map(item => item.id)).size === properties.length, "duplicate property ID");
  for (const item of properties) for (const profile of item.profiles) requireThat(profiles.some(candidate => candidate.id === profile), `${item.id}: unknown profile ${profile}`);
  return { contract: root.contract, baseline: { commit: gitHash(baseline.commit, "baseline commit"), tree: gitHash(baseline.tree, "baseline tree") }, dependencies, profiles, properties };
}

export function parseToolchains(value: unknown): Toolchains {
  const root = record(value, ["contract", "tools"], "toolchains");
  requireThat(root.contract === "algal.verification-toolchains.v1", "unknown toolchain contract");
  const tools = array(root.tools, "tools", 1, 64).map((value, i) => {
    const tool = record(value, ["id", "version", "status", "command", "sha256", "notes"], `tool ${i}`);
    const command = array(tool.command, "tool command", 1, 32).map(item => string(item, "tool argument"));
    return { id: string(tool.id, "tool id", 128), version: string(tool.version, "tool version", 128), status: member(tool.status, ["available", "planned"] as const, "tool status"), command, sha256: tool.sha256 === null ? null : digest(tool.sha256, "tool digest"), notes: string(tool.notes, "tool notes") };
  });
  requireThat(new Set(tools.map(item => item.id)).size === tools.length, "duplicate tool ID");
  return { contract: root.contract, tools };
}

export type ClaimsReport = { properties: number; findings: number; dependencies: number; statuses: Record<EvidenceState, number>; sourceDigest: string; registryDigest: string; toolchainsDigest: string; licensedClaims: number; formalClaims: number };

export async function validateClaims(root: string, options: { inventory?: boolean; coverage?: boolean } = {}): Promise<ClaimsReport> {
  const registry = parseRegistry(await readJson(root, "verify/properties.json"));
  parseToolchains(await readJson(root, "verify/toolchains.json"));
  const assumptionsText = new TextDecoder("utf-8", { fatal: true }).decode(await readFileBounded(root, "verify/assumptions.md"));
  const assumptionIds = [...assumptionsText.matchAll(/^\| (A-[A-Z][A-Z0-9-]*) \|/gm)].map(match => match[1]!);
  requireThat(assumptionIds.length > 0 && new Set(assumptionIds).size === assumptionIds.length, "assumptions: missing or duplicate assumption definitions");
  for (const item of [...registry.profiles, ...registry.properties]) for (const assumption of item.assumptions) {
    requireThat(assumptionIds.includes(assumption), `${item.id}: undefined assumption ${assumption}`);
  }
  if (options.coverage !== false) {
    const present = new Set(registry.properties.map(item => item.id));
    for (const id of REQUIRED_PROPERTY_IDS) requireThat(present.has(id), `missing governed property ${id}`);
    const findings = new Set(registry.properties.flatMap(item => item.findings));
    for (const finding of REQUIRED_FINDINGS) requireThat(findings.has(finding), `missing audit finding ${finding}`);
  }
  if (options.inventory !== false) {
    const paths = await governedPaths(root);
    const recorded = registry.dependencies.map(item => item.path).sort();
    requireThat(paths.length === recorded.length && paths.every((path, i) => path === recorded[i]), `governed dependency inventory differs; missing: ${paths.filter(path => !recorded.includes(path)).join(", ") || "none"}; obsolete: ${recorded.filter(path => !paths.includes(path)).join(", ") || "none"}`);
  }
  const allBindings = [...registry.dependencies, ...registry.properties.flatMap(item => [...item.sources, ...item.specs])];
  const expected = new Map<string, string>();
  for (const binding of allBindings) {
    requireThat(!expected.has(binding.path) || expected.get(binding.path) === binding.sha256, `${binding.path}: conflicting source hashes`);
    expected.set(binding.path, binding.sha256);
  }
  for (const [path, sha256] of expected) requireThat(await hashFile(root, path) === sha256, `${path}: stale dependency/source digest`);
  const statuses = Object.fromEntries(EVIDENCE_STATES.map(status => [status, 0])) as Record<EvidenceState, number>;
  for (const item of registry.properties) statuses[item.evidence.status]++;
  return { properties: registry.properties.length, findings: new Set(registry.properties.flatMap(item => item.findings)).size, dependencies: registry.dependencies.length, statuses,
    sourceDigest: hashJson([...expected.keys()].sort().map(path => ({ path, sha256: expected.get(path)! }))),
    registryDigest: await hashFile(root, "verify/properties.json"), toolchainsDigest: await hashFile(root, "verify/toolchains.json"),
    licensedClaims: registry.properties.reduce((count, item) => count + item.licensedClaims.length, 0), formalClaims: 0 };
}
