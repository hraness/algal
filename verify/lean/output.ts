import { requireSuccess, type CommandResult } from "../lib/runner";
import { STANDARD_LEAN_AXIOMS } from "../lib/proof";
import { array, boolean, record, relativePath, requireThat, string, strings } from "../lib/schema";

export type TheoremAudit = { name: string; type: string; transitiveAxioms: string[] };
export type ModuleTheoremAudit = { name: string; module: string; internalDetail: boolean; transitiveAxioms: string[] };

function diagnostic(line: string, file: string): string {
  const message = record(JSON.parse(line) as unknown, ["caption", "data", "endPos", "fileName", "isSilent", "keepFullRange", "kind", "pos", "severity"], "Lean diagnostic");
  requireThat(message.severity === "information" && message.caption === "" && message.fileName === file && message.kind === "[anonymous]" && message.isSilent === false, "Lean audit contains a warning, error or unrelated diagnostic");
  boolean(message.keepFullRange, "Lean diagnostic range flag");
  for (const label of ["pos", "endPos"] as const) {
    const position = record(message[label], ["column", "line"], "Lean diagnostic position");
    requireThat(Number.isSafeInteger(position.line) && (position.line as number) > 0 && Number.isSafeInteger(position.column) && (position.column as number) >= 0, "invalid Lean diagnostic position");
  }
  return string(message.data, "Lean audit data", 2_097_152);
}

function admittedAxioms(value: unknown): string[] {
  const axioms = strings(value, "Lean transitive axioms", 0, 4096);
  requireThat(new Set(axioms).size === axioms.length, "duplicate Lean transitive axiom");
  for (const axiom of axioms) requireThat((STANDARD_LEAN_AXIOMS as readonly string[]).includes(axiom), `unreviewed transitive Lean axiom ${axiom}`);
  return axioms;
}

/** Includes every .thmInfo from the exact defining modules, not just claims. */
export function parseModuleAudit(result: CommandResult, file: string, modules: string[], claimed: { name: string; module: string }[]): ModuleTheoremAudit[] {
  requireSuccess(result);
  requireThat(result.stderr === "" && result.stdout.endsWith("\n") && !result.stdout.slice(0, -1).includes("\n") && Buffer.byteLength(result.stdout) <= 2_097_152, "Lean module audit output bounds/stderr mismatch");
  requireThat(modules.length > 0 && new Set(modules).size === modules.length && claimed.length > 0 && new Set(claimed.map(row => row.name)).size === claimed.length, "invalid Lean module/claim inventory");
  const data = record(JSON.parse(diagnostic(result.stdout.slice(0, -1), file)) as unknown, ["contract", "modules", "theorems"], "Lean module audit");
  requireThat(data.contract === "algal.lean-module-theorems.v1" && JSON.stringify(data.modules) === JSON.stringify(modules), "Lean defining module inventory mismatch");
  const rows = array(data.theorems, "Lean module theorems", 1, 8192).map(value => {
    const row = record(value, ["name", "module", "internalDetail", "transitiveAxioms"], "Lean module theorem");
    const module = string(row.module, "Lean defining module", 256);
    requireThat(modules.includes(module), "Lean theorem from unreviewed defining module");
    return { name: string(row.name, "Lean environment theorem name", 4096), module,
      internalDetail: boolean(row.internalDetail, "Lean internal-detail flag"), transitiveAxioms: admittedAxioms(row.transitiveAxioms) };
  });
  const byName = new Map(rows.map(row => [row.name, row]));
  requireThat(byName.size === rows.length, "duplicate Lean module theorem");
  for (const module of modules) requireThat(rows.some(row => row.module === module), "empty Lean defining module audit");
  for (const claim of claimed) requireThat(byName.get(claim.name)?.module === claim.module, "claimed theorem missing from its defining module audit");
  return rows;
}

export function parseVectorOutput(result: CommandResult): unknown {
  requireSuccess(result);
  requireThat(result.stderr === "" && result.stdout.endsWith("\n") && !result.stdout.slice(0, -1).includes("\n") && Buffer.byteLength(result.stdout) <= 65_536, "vector output must be exactly one bounded JSON line");
  return JSON.parse(result.stdout.slice(0, -1)) as unknown;
}

/** Parse actual pinned Lean --json messages emitted by Algal.Audit. These facts
 * require an executed source/tool-bound command; a handwritten report is not a
 * proof receipt. Unexpected diagnostics, including warnings, reject. */
export function parseTheoremAudit(result: CommandResult, file: string, expected: string[]): TheoremAudit[] {
  requireSuccess(result);
  requireThat(result.stderr === "" && result.stdout.endsWith("\n") && Buffer.byteLength(result.stdout) <= 2_097_152, "Lean audit output bounds/stderr mismatch");
  requireThat(expected.length > 0 && expected.length <= 4096 && new Set(expected).size === expected.length, "Lean audit theorem inventory must be nonempty and unique");
  const lines = result.stdout.slice(0, -1).split("\n");
  requireThat(lines.length === expected.length, "Lean audit missing or unexpected theorem output");
  return lines.map((line, index) => {
    const data = record(JSON.parse(diagnostic(line, file)) as unknown, ["contract", "name", "declarationKind", "type", "transitiveAxioms"], "Lean theorem audit");
    requireThat(data.contract === "algal.lean-theorem-audit.v1" && data.declarationKind === "theorem" && data.name === expected[index], "Lean audit theorem declaration mismatch");
    const axioms = admittedAxioms(data.transitiveAxioms);
    return { name: string(data.name, "Lean theorem name", 512), type: string(data.type, "Lean theorem type", 65_536), transitiveAxioms: axioms };
  });
}

export function theoremNames(value: unknown): string[] {
  const inventory = record(value, ["contract", "rootModule", "proofScope", "allowedAxioms", "domains", "theorems", "unmetCriteria"], "Lean core inventory");
  requireThat(inventory.contract === "algal.lean-core-inventory.v1" && inventory.rootModule === "Algal.Core.All" && inventory.proofScope === "semantic-model-only", "Lean core inventory scope mismatch");
  requireThat(JSON.stringify(inventory.allowedAxioms) === JSON.stringify(STANDARD_LEAN_AXIOMS), "Lean core axioms differ from reviewed allowance");
  strings(inventory.unmetCriteria, "Lean unresolved criteria", 1, 128);
  const domains = array(inventory.domains, "Lean core domains", 1, 64).map(value => {
    const domain = record(value, ["id", "module", "scope", "sources", "coveredCriteria", "unmetCriteria", "admittedWitnesses", "rejectedWitnesses"], "Lean core domain");
    const id = string(domain.id, "Lean domain id", 128), module = string(domain.module, "Lean domain module", 256);
    requireThat(/^Algal\.Core\.[A-Za-z][A-Za-z0-9_]*$/.test(module), "invalid Lean domain module");
    string(domain.scope, "Lean domain scope", 4096);
    for (const path of strings(domain.sources, "Lean domain source mapping", 1, 64)) relativePath(path, "Lean domain source path");
    strings(domain.coveredCriteria, "Lean covered criteria", 1, 128);
    strings(domain.unmetCriteria, "Lean domain limitations", 1, 128);
    return { id, module, admitted: strings(domain.admittedWitnesses, "Lean admitted witnesses", 1, 64), rejected: strings(domain.rejectedWitnesses, "Lean rejected witnesses", 1, 64) };
  });
  requireThat(new Set(domains.map(domain => domain.id)).size === domains.length && new Set(domains.map(domain => domain.module)).size === domains.length, "duplicate Lean domain/module");
  const roles = new Map<string, string>();
  const names = array(inventory.theorems, "Lean core theorems", 1, 4096).map(value => {
    const theorem = record(value, ["name", "module", "domain", "role"], "Lean core theorem");
    const name = string(theorem.name, "Lean theorem name", 512);
    requireThat(/^Algal\.Core\.[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(name), "Lean theorem name is not in the reviewed namespace");
    requireThat(["law", "admitted-witness", "rejected-witness", "counterexample-witness"].includes(string(theorem.role, "Lean theorem role", 64)), "unknown Lean theorem role");
    requireThat(name.startsWith(string(theorem.module, "Lean theorem module", 256) + "."), "Lean theorem module mismatch");
    const domain = domains.find(domain => domain.id === theorem.domain);
    requireThat(domain !== undefined && domain.module === theorem.module, "unknown or mismatched Lean theorem domain");
    roles.set(name, theorem.role as string);
    return name;
  });
  requireThat(new Set(names).size === names.length, "duplicate Lean theorem name");
  for (const domain of domains) {
    for (const name of [...domain.admitted, ...domain.rejected]) requireThat(names.includes(name) && name.startsWith(domain.module + "."), "Lean domain witness missing from theorem inventory");
    for (const name of domain.admitted) requireThat(roles.get(name) === "admitted-witness", "Lean admitted witness role mismatch");
    for (const name of domain.rejected) requireThat(roles.get(name) === "rejected-witness", "Lean rejected witness role mismatch");
  }
  return names;
}
