/** Admission for NORMALIZED tool reports. These are not TLC/Lean output adapters.
 * Phase 00 exercises synthetic fixtures; none of these functions executes or proves a model. */
import { hashJson } from "./files";
import { array, boolean, digest, member, namedStrings, natural, record, requireThat, string, strings } from "./schema";

export type TlcRequirements = { invariants: string[]; properties: string[]; importantActions: string[] };
type ReviewedReduction = { definition: string; justification: string };
export type TlcConfiguration = {
  contract: "algal.verification-tlc-config.v1";
  mode: "model-check"; behavior: "temporal"; specification: string;
  constants: Record<string, string>; invariants: string[]; properties: string[]; importantActions: string[];
  constraints: ReviewedReduction[]; actionConstraints: ReviewedReduction[]; overrides: ReviewedReduction[];
  symmetry: ReviewedReduction | null;
};

function reductions(value: unknown, label: string): ReviewedReduction[] {
  const result = array(value, label, 0, 128).map(value => reduction(value, label));
  requireThat(new Set(result.map(item => item.definition)).size === result.length, `${label}: duplicate reduction`);
  return result;
}
function reduction(value: unknown, label: string): ReviewedReduction {
  const item = record(value, ["definition", "justification"], label);
  return { definition: string(item.definition, `${label}.definition`), justification: string(item.justification, `${label}.justification`) };
}
function includesAll(actual: string[], expected: string[], label: string): void {
  for (const name of expected) requireThat(actual.includes(name), `${label}: missing ${name}`);
}
function sameNames(actual: string[], expected: string[], label: string): void {
  requireThat(actual.length === expected.length, `${label}: wrong property set`);
  includesAll(actual, expected, label);
}

export function admitTlcConfiguration(value: unknown, required: TlcRequirements): TlcConfiguration {
  const item = record(value, ["contract", "mode", "behavior", "specification", "constants", "invariants", "properties", "importantActions", "constraints", "actionConstraints", "overrides", "symmetry"], "TLC configuration");
  requireThat(item.contract === "algal.verification-tlc-config.v1", "unknown TLC config contract");
  const invariants = strings(item.invariants, "TLC invariants");
  const properties = strings(item.properties, "TLC properties");
  const importantActions = strings(item.importantActions, "TLC importantActions", 1);
  requireThat(required.invariants.length + required.properties.length > 0, "TLC requirements cannot be empty");
  requireThat(required.importantActions.length > 0, "TLC important action requirements cannot be empty");
  includesAll(invariants, required.invariants, "enabled invariants");
  includesAll(properties, required.properties, "enabled temporal properties");
  includesAll(importantActions, required.importantActions, "important actions");
  const symmetry = item.symmetry === null ? null : reduction(item.symmetry, "symmetry");
  requireThat(properties.length === 0 || symmetry === null, "TLC symmetry is prohibited for liveness checking");
  return {
    contract: item.contract,
    mode: member(item.mode, ["model-check"] as const, "TLC mode"),
    behavior: member(item.behavior, ["temporal"] as const, "TLC behavior"),
    specification: string(item.specification, "TLC specification"),
    constants: namedStrings(item.constants, "TLC constants", 0), invariants, properties, importantActions,
    constraints: reductions(item.constraints, "constraints"), actionConstraints: reductions(item.actionConstraints, "actionConstraints"), overrides: reductions(item.overrides, "overrides"), symmetry,
  };
}

/** A complete normalized report is only as trustworthy as its future raw-output adapter. */
export function admitTlcResult(value: unknown, config: TlcConfiguration): { kind: "finite-model-check"; states: number; origin: "synthetic" | "tool" } {
  const item = record(value, ["contract", "origin", "configurationDigest", "completion", "exitCode", "timedOut", "initialStates", "distinctStates", "generatedStates", "statesLeft", "checkedInvariants", "checkedProperties", "actionTransitions", "errors", "violations", "fingerprint"], "TLC result");
  requireThat(item.contract === "algal.verification-tlc-result.v1", "unknown TLC result contract");
  const origin = member(item.origin, ["synthetic", "tool"] as const, "TLC result origin");
  requireThat(digest(item.configurationDigest, "TLC configuration digest") === hashJson(config), "TLC result configuration mismatch");
  requireThat(item.completion === "complete" && item.exitCode === 0 && boolean(item.timedOut, "TLC timedOut") === false, "TLC did not complete successfully");
  const initial = natural(item.initialStates, "TLC initial states");
  const states = natural(item.distinctStates, "TLC distinct states");
  const generated = natural(item.generatedStates, "TLC generated states");
  requireThat(initial > 0 && states > initial && generated >= states && natural(item.statesLeft, "TLC states left") === 0, "TLC exploration is empty, constant-only, inconsistent or truncated");
  sameNames(strings(item.checkedInvariants, "checked invariants"), config.invariants, "completed invariants");
  sameNames(strings(item.checkedProperties, "checked properties"), config.properties, "completed temporal properties");
  const transitions = record(item.actionTransitions, config.importantActions, "TLC action transitions");
  for (const action of config.importantActions) {
    // The future adapter must derive these witnesses from reachable TLC traces,
    // never from action evaluation counters (which include stuttering actions).
    const witness = record(transitions[action], ["traceDigest", "fromState", "toState"], `${action} witness`);
    digest(witness.traceDigest, `${action} reachable trace digest`);
    requireThat(digest(witness.fromState, `${action} source state`) !== digest(witness.toState, `${action} target state`), `important action ${action} has no nonstuttering witness`);
  }
  requireThat(strings(item.errors, "TLC errors").length === 0 && strings(item.violations, "TLC violations").length === 0, "TLC reported an error or property violation");
  const fingerprint = record(item.fingerprint, ["bits", "seed", "collisionProbability"], "TLC fingerprint");
  requireThat(fingerprint.bits === 64, "unsupported TLC fingerprint width");
  string(fingerprint.seed, "TLC fingerprint seed", 128);
  requireThat(typeof fingerprint.collisionProbability === "number" && Number.isFinite(fingerprint.collisionProbability) && fingerprint.collisionProbability >= 0 && fingerprint.collisionProbability <= 0.000001, "TLC fingerprint collision risk is missing or exceeds admitted threshold");
  return { kind: "finite-model-check", states, origin };
}

export const STANDARD_LEAN_AXIOMS = ["propext", "Classical.choice", "Quot.sound"] as const;
export type LeanRequirements = { theorems: string[]; allowedAxioms: string[] };

export function admitLeanResult(value: unknown, required: LeanRequirements): { kind: "checked-model-theorems"; theorems: number; origin: "synthetic" | "tool" } {
  requireThat(required.theorems.length > 0 && new Set(required.theorems).size === required.theorems.length, "Lean requires unique nonempty release theorem names");
  for (const axiom of required.allowedAxioms) requireThat((STANDARD_LEAN_AXIOMS as readonly string[]).includes(axiom), `unreviewed allowed Lean axiom ${axiom}`);
  const item = record(value, ["contract", "origin", "exitCode", "timedOut", "unresolvedGoals", "theorems", "errors"], "Lean result");
  requireThat(item.contract === "algal.verification-lean-result.v1", "unknown Lean result contract");
  const origin = member(item.origin, ["synthetic", "tool"] as const, "Lean result origin");
  requireThat(item.exitCode === 0 && boolean(item.timedOut, "Lean timedOut") === false && natural(item.unresolvedGoals, "Lean unresolved goals") === 0, "Lean checking did not complete successfully");
  requireThat(strings(item.errors, "Lean errors").length === 0, "Lean reported errors");
  const theorems = array(item.theorems, "Lean theorem exports", 1, 4096).map(value => {
    const theorem = record(value, ["name", "transitiveAxioms"], "Lean theorem");
    const name = string(theorem.name, "Lean theorem name", 512);
    const axioms = strings(theorem.transitiveAxioms, `${name} transitive axioms`, 0, 4096);
    for (const axiom of axioms) requireThat(required.allowedAxioms.includes(axiom), `${name}: unreviewed transitive axiom ${axiom}`);
    return name;
  });
  requireThat(new Set(theorems).size === theorems.length, "duplicate Lean theorem export");
  sameNames(theorems, required.theorems, "Lean release theorem exports");
  return { kind: "checked-model-theorems", theorems: theorems.length, origin };
}

/** A mutation must name a violated expected property, not merely fail to execute. */
export function admitMutation(value: unknown, expectedProperty: string): void {
  const item = record(value, ["completion", "violations", "errors", "witness"], "mutation result");
  requireThat(item.completion === "counterexample", "mutation did not produce a counterexample");
  requireThat(strings(item.errors, "mutation errors").length === 0, "mutation merely crashed the tool");
  requireThat(strings(item.violations, "mutation violations", 1).includes(expectedProperty), "mutation violated another property");
  requireThat(array(item.witness, "mutation witness", 2, 10_000).every(state => typeof state === "string" && state.length > 0 && state.length <= 16_384), "mutation witness is absent or malformed");
}
