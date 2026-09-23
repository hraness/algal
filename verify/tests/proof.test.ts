import { describe, expect, test } from "bun:test";
import { hashBytes, hashJson } from "../lib/files";
import { admitLeanResult, admitMutation, admitTlcConfiguration, admitTlcResult, STANDARD_LEAN_AXIOMS } from "../lib/proof";

const required = { invariants: ["Safe"], properties: ["Progress"], importantActions: ["Commit"] };
function configuration() {
  return { contract: "algal.verification-tlc-config.v1", mode: "model-check", behavior: "temporal", specification: "Spec", constants: { Writers: "{w1,w2}" }, ...required, constraints: [], actionConstraints: [], overrides: [], symmetry: null };
}
function tlc() {
  const config = admitTlcConfiguration(configuration(), required);
  return { config, result: { contract: "algal.verification-tlc-result.v1", origin: "synthetic", configurationDigest: hashJson(config), completion: "complete", exitCode: 0, timedOut: false,
    initialStates: 1, distinctStates: 3, generatedStates: 5, statesLeft: 0, checkedInvariants: ["Safe"], checkedProperties: ["Progress"],
    actionTransitions: { Commit: { traceDigest: hashBytes("reachable trace"), fromState: hashBytes("before"), toState: hashBytes("after") } }, errors: [], violations: [], fingerprint: { bits: 64, seed: "1", collisionProbability: 1e-12 } } };
}

describe("synthetic TLC report admission (no production proof)", () => {
  test("complete configured exploration remains labelled synthetic finite evidence", () => {
    const { config, result } = tlc();
    expect(admitTlcResult(result, config)).toEqual({ kind: "finite-model-check", states: 3, origin: "synthetic" });
  });
  test("rejects simulation, constants-only, unnamed specification and missing required checks", () => {
    for (const patch of [{ mode: "simulation" }, { behavior: "constant" }, { specification: "" }, { invariants: [] }, { properties: [] }, { importantActions: [] }]) {
      expect(() => admitTlcConfiguration({ ...configuration(), ...patch }, required)).toThrow();
    }
  });
  test("inventories/reviews reductions and prohibits symmetry with liveness", () => {
    expect(() => admitTlcConfiguration({ ...configuration(), constraints: [{ definition: "x < 3", justification: "" }] }, required)).toThrow();
    expect(() => admitTlcConfiguration({ ...configuration(), symmetry: { definition: "Permutations(Writers)", justification: "Reviewed safety reduction" } }, required)).toThrow("liveness");
    const missing = configuration() as unknown as Record<string, unknown>;
    delete missing.actionConstraints;
    expect(() => admitTlcConfiguration(missing, required)).toThrow("missing actionConstraints");
  });
  test("rejects skipped checks, empty/constant/truncated exploration, timeout and tool errors", () => {
    const { config, result } = tlc();
    for (const patch of [
      { checkedInvariants: [] }, { checkedProperties: [] }, { initialStates: 0 }, { distinctStates: 1 }, { statesLeft: 1 },
      { timedOut: true }, { exitCode: 1 }, { completion: "running" }, { errors: ["parse failure"] }, { violations: ["Safe"] },
      { fingerprint: { bits: 64, seed: "1", collisionProbability: 0.1 } }, { configurationDigest: hashBytes("other") },
    ]) expect(() => admitTlcResult({ ...result, ...patch }, config)).toThrow();
  });
  test("positive action evaluation counters cannot stand in for reachable transitions", () => {
    const { config, result } = tlc();
    expect(() => admitTlcResult({ ...result, actionTransitions: { Commit: 100 } }, config)).toThrow();
    expect(() => admitTlcResult({ ...result, actionTransitions: { Commit: { ...result.actionTransitions.Commit, toState: result.actionTransitions.Commit.fromState } } }, config)).toThrow("nonstuttering");
    expect(() => admitTlcResult({ ...result, distinctStates: 1, actionCoverage: { Commit: 100 } }, config)).toThrow();
  });
});

const leanRequired = { theorems: ["Algal.sound"], allowedAxioms: [...STANDARD_LEAN_AXIOMS] };
function lean() { return { contract: "algal.verification-lean-result.v1", origin: "synthetic", exitCode: 0, timedOut: false, unresolvedGoals: 0, theorems: [{ name: "Algal.sound", transitiveAxioms: ["propext"] }], errors: [] }; }
describe("synthetic Lean report admission (no production proof)", () => {
  test("checks exactly the required theorem exports and retains evidence class", () => {
    expect(admitLeanResult(lean(), leanRequired)).toEqual({ kind: "checked-model-theorems", theorems: 1, origin: "synthetic" });
  });
  test("rejects empty/missing theorem exports, unresolved goals and tool failures", () => {
    for (const patch of [{ theorems: [] }, { theorems: [{ name: "Other", transitiveAxioms: [] }] }, { unresolvedGoals: 1 }, { exitCode: 1 }, { timedOut: true }, { errors: ["type mismatch"] }]) {
      expect(() => admitLeanResult({ ...lean(), ...patch }, leanRequired)).toThrow();
    }
    expect(() => admitLeanResult(lean(), { ...leanRequired, theorems: [] })).toThrow();
  });
  test("rejects sorry and custom/native/compiler axioms even through imported dependencies", () => {
    for (const axiom of ["sorryAx", "Custom.assumption", "Lean.ofReduceBool", "Lean.trustCompiler"]) {
      expect(() => admitLeanResult({ ...lean(), theorems: [{ name: "Algal.sound", transitiveAxioms: [axiom] }] }, leanRequired)).toThrow("unreviewed transitive axiom");
      expect(() => admitLeanResult(lean(), { ...leanRequired, allowedAxioms: [axiom] })).toThrow("unreviewed allowed Lean axiom");
    }
  });
});

test("broken-model mutation must yield the intended counterexample, not a crash", () => {
  const good = { completion: "counterexample", violations: ["Safe"], errors: [], witness: ["before", "after"] };
  expect(() => admitMutation(good, "Safe")).not.toThrow();
  for (const patch of [{ completion: "failed" }, { errors: ["tool crash"] }, { violations: ["Other"] }, { witness: [] }]) expect(() => admitMutation({ ...good, ...patch }, "Safe")).toThrow();
});
