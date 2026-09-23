import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { admitJavaRuntimeFiles, admitTlcCommandOutput, parseTlcOutput, renderTlcConfiguration, validateModelInventory } from "../lib/tlc";
import { MODEL_PROFILES, MODEL_MUTATIONS } from "./definitions";
import { admitTlcConfiguration } from "../lib/proof";
import type { CommandResult } from "../lib/runner";
import type { FileBinding } from "../lib/files";

// Actual pinned TLC output is a parser fixture, never admitted production proof.
const fixture = (name: string) => readFileSync(join(import.meta.dir, "fixtures", name), "utf8");
const safety = fixture("safety.log"), action = fixture("action.log"), liveness = fixture("liveness.log");
const remove = (text: string, code: number) => text.replace(new RegExp(`@!@!@STARTMSG ${code}:\\d+ @!@!@\\n[\\s\\S]*?@!@!@ENDMSG ${code} @!@!@\\n`, "g"), "");
const config = admitTlcConfiguration({
  contract: "algal.verification-tlc-config.v1", mode: "model-check", behavior: "temporal", specification: "Spec", constants: {},
  invariants: ["TypeOK", "NoSibling", "AckWasPublished", "CapacityBound"], properties: [], importantActions: ["AcquirePrimary"],
  constraints: [], actionConstraints: [], overrides: [], symmetry: null,
}, { invariants: ["TypeOK", "NoSibling"], properties: [], importantActions: ["AcquirePrimary"] });
// Synthetic completion metadata around retained real raw logs tests admission;
// only the actual runner can establish that a tool was executed.
const completed = (stdout: string, exitCode = 0): CommandResult => ({ command: ["parser-fixture"], exitCode, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout, stderr: "" });
const success = { kind: "success" as const, property: null, action: null };
const witness = { kind: "action" as const, property: "NeverAcquirePrimary", action: "AcquirePrimary" };
const witnessConfig = { ...config, properties: ["NeverAcquirePrimary"] };

describe("pinned TLC raw output", () => {
  test("joined inventories reject cross-suite ID collisions and unbound mutation targets", () => {
    expect(() => validateModelInventory(MODEL_PROFILES, MODEL_MUTATIONS)).not.toThrow();
    const profile = MODEL_PROFILES[0]!, mutation = MODEL_MUTATIONS[0]!;
    expect(() => validateModelInventory([...MODEL_PROFILES, { ...profile, suite: "publication" }], MODEL_MUTATIONS)).toThrow("globally unique");
    expect(() => validateModelInventory(MODEL_PROFILES, [...MODEL_MUTATIONS, { ...mutation, id: profile.id }])).toThrow("globally unique");
    expect(() => validateModelInventory(MODEL_PROFILES, [{ ...mutation, base: "missing-profile" }])).toThrow("missing base");
    expect(() => validateModelInventory(MODEL_PROFILES, [{ ...mutation, property: "NotEnabled" }])).toThrow("not enabled");
    expect(() => validateModelInventory([{ ...profile, actions: [profile.actions[0]!, profile.actions[0]!] }], [])).toThrow("duplicate action");
  });

  test("reads real exhausted safety and reachable action/liveness counterexamples", () => {
    const safe = parseTlcOutput(safety, "Custody");
    expect(safe.success).toBe(true);
    expect(safe.distinctStates).toBe(323);
    expect(safe.generatedStates).toBe(719);
    expect(safe.statesLeft).toBe(0);
    expect(safe.checkedInvariants).toEqual(["TypeOK", "NoSibling", "AckWasPublished", "CapacityBound"]);
    expect(safe.fingerprintEstimate).toBeGreaterThan(0);
    const reached = parseTlcOutput(action, "Custody");
    expect(reached.violation).toEqual({ kind: "action", property: "NeverAcquirePrimary" });
    expect(reached.trace.at(-1)!.action).toBe("AcquirePrimary");
    expect(reached.trace.at(-2)!.body).not.toBe(reached.trace.at(-1)!.body);
    const unfair = parseTlcOutput(liveness, "Custody");
    expect(unfair.violation).toEqual({ kind: "liveness", property: null });
    expect(unfair.temporalComplete).toBe(true);
    expect(unfair.loop).toBe("9: Stuttering");
  });

  test("reads actual single-variable record states and rejects missing assignments", () => {
    const raw = fixture("one-variable.txt");
    const parsed = parseTlcOutput(raw, "MailboxProtocol");
    expect(parsed.violation).toEqual({ kind: "invariant", property: "NoRevival" });
    expect(parsed.trace.length).toBeGreaterThan(1);
    expect(parsed.trace[0]!.body.startsWith("s = [")).toBe(true);
    expect(parsed.trace.at(-1)!.body).not.toBe(parsed.trace.at(-2)!.body);
    expect(() => parseTlcOutput(raw.replace("s = [", "missing assignment ["), "MailboxProtocol")).toThrow("state body");
    expect(() => parseTlcOutput(raw.replace("s = [", " = ["), "MailboxProtocol")).toThrow("state body");
  });

  test("pairs intermediate and complete checks across actual temporal branches", () => {
    const raw = fixture("branched-temporal.txt"), parsed = parseTlcOutput(raw, "MailboxProtocol");
    expect(parsed.success).toBe(true);
    expect(parsed.temporalComplete).toBe(true);
    expect(parsed.distinctStates).toBe(9280);
    const temporal = { ...config, invariants: parsed.checkedInvariants, properties: ["SelectedReceiveReturns"] };
    expect(admitTlcCommandOutput(completed(raw), "MailboxProtocol", temporal, success).temporalComplete).toBe(true);
    for (const changed of [
      remove(raw, 2212),
      raw.replace("has 2 branches", "has 3 branches"),
      raw.replace("Checking 2 branches", "Checking 1 branches"),
      raw.replace("18560 total distinct", "18559 total distinct"),
      raw.replace("10366 total distinct", "18562 total distinct"),
      raw.replace("10366 total distinct", "1 total distinct"),
      raw.replace("10366 total distinct", "0 total distinct"),
      raw.replace("10366 total distinct", "10365 total distinct"),
      raw.replace("for the complete state", "for the current state"),
      remove(raw, 2267),
    ]) expect(() => admitTlcCommandOutput(completed(changed), "MailboxProtocol", temporal, success)).toThrow();
    const ends = raw.match(/@!@!@STARTMSG 2267:0 @!@!@\n[\s\S]*?@!@!@ENDMSG 2267 @!@!@\n/g)!;
    expect(ends).toHaveLength(2);
    expect(() => parseTlcOutput(raw.replace(ends[0]!, ""), "MailboxProtocol")).toThrow("overlapping");
    expect(() => parseTlcOutput(raw.replace(ends[1]!, ""), "MailboxProtocol")).toThrow("before temporal completion");
    expect(() => parseTlcOutput(raw.replace(ends[0]!, ends[0]! + ends[0]!), "MailboxProtocol")).toThrow("without matching start");
    const final = /@!@!@STARTMSG 2192:0 @!@!@\nChecking 2 branches of temporal properties for the complete[^\n]+\n@!@!@ENDMSG 2192 @!@!@\n/.exec(raw)![0];
    expect(() => parseTlcOutput(raw.replace(final, final + final), "MailboxProtocol")).toThrow("overlapping");
    const late = raw.replace(final, "").replace(ends[1]!, "").replace("@!@!@STARTMSG 2186", final + ends[1]! + "@!@!@STARTMSG 2186");
    expect(() => parseTlcOutput(late, "MailboxProtocol")).toThrow("after success");
    const livenessEnd = liveness.match(/@!@!@STARTMSG 2267:0 @!@!@\n[\s\S]*?@!@!@ENDMSG 2267 @!@!@\n/)![0];
    const early = liveness.replace(livenessEnd, "").replace("@!@!@STARTMSG 2116", livenessEnd + "@!@!@STARTMSG 2116");
    expect(() => parseTlcOutput(early, "Custody")).toThrow("outside its complete temporal check");
    expect(() => parseTlcOutput(liveness.replace("Checking temporal properties", "Checking 1 branches of temporal properties"), "Custody")).toThrow("branch prefix");
  });

  test.each([2262, 2186, 2187, 2190, 2193, 2199, 2774])("rejects missing mandatory frame %i", code => {
    expect(() => parseTlcOutput(remove(safety, code), "Custody")).toThrow();
  });
  test.each([
    ["truncated", safety.slice(0, -50)],
    ["unterminated line", safety.slice(0, -1)],
    ["unframed error", safety.replace("Starting SANY...", "Starting SANY...").replace("Semantic processing of module Custody", "Semantic errors: model unavailable")],
    ["nested frame", safety.replace("719 states generated", "@!@!@STARTMSG 2193:0 @!@!@\n719 states generated")],
    ["wrong end", safety.replace("ENDMSG 2199", "ENDMSG 2193")],
    ["wrong tool", safety.replace("rev: 5a47802", "rev: changed")],
    ["simulation", safety.replace("breadth-first search Model-Checking", "Simulation")],
    ["wrong seed", safety.replace("seed 1 with", "seed 2 with")],
    ["wrong polynomial", safety.replace("fp 0 and", "fp 1 and")],
    ["empty initial", safety.replace("initial states: 1 distinct", "initial states: 0 distinct")],
    ["missing FP", safety.replace(/calculated \(optimistic\): {2}val = [0-9.Ee+-]+/, "fingerprint omitted")],
    ["unsafe FP", safety.replace(/calculated \(optimistic\): {2}val = [0-9.Ee+-]+/, "calculated (optimistic):  val = 0.1")],
    ["NaN FP", safety.replace(/calculated \(optimistic\): {2}val = [0-9.Ee+-]+/, "calculated (optimistic):  val = NaN")],
    ["warning", safety.replace("STARTMSG 2194:0", "STARTMSG 2194:3")],
    ["unknown output", safety.replace("STARTMSG 2194:0", "STARTMSG 9999:0")],
    ["extra footer", safety + "TLC crashed after success\n"],
  ])("rejects %s", (_name, output) => expect(() => parseTlcOutput(output, "Custody")).toThrow());

  test("rejects absent/noninitial/discontinuous counterexamples and missing liveness loops", () => {
    expect(() => parseTlcOutput(remove(action, 2217), "Custody")).toThrow();
    expect(() => parseTlcOutput(action.replace("<Initial predicate>", "<not initial>"), "Custody")).toThrow();
    expect(() => parseTlcOutput(action.replace("2: <Select", "9: <Select"), "Custody")).toThrow();
    expect(() => parseTlcOutput(remove(liveness, 2218), "Custody")).toThrow();
    expect(() => parseTlcOutput(remove(liveness, 2267), "Custody")).toThrow();
    expect(() => parseTlcOutput(remove(action, 2121), "Custody")).toThrow();
    expect(() => parseTlcOutput(action.replace("The behavior up to this point is:", "Not actually a counterexample:"), "Custody")).toThrow();
    expect(() => parseTlcOutput(remove(liveness, 2264), "Custody")).toThrow();
  });

  test("renders a closed configuration and prohibits reductions or injected syntax", () => {
    const config = admitTlcConfiguration({
      contract: "algal.verification-tlc-config.v1", mode: "model-check", behavior: "temporal", specification: "Spec",
      constants: { Mutation: '"none"', Capacity: "1" }, invariants: ["TypeOK", "NoSibling"], properties: [], importantActions: ["Select"],
      constraints: [], actionConstraints: [], overrides: [], symmetry: null,
    }, { invariants: ["TypeOK", "NoSibling"], properties: [], importantActions: ["Select"] });
    expect(renderTlcConfiguration(config)).toBe('CONSTANT Capacity = 1\nCONSTANT Mutation = "none"\nSPECIFICATION Spec\nINVARIANT TypeOK\nINVARIANT NoSibling\n');
    expect(() => renderTlcConfiguration({ ...config, constraints: [{ definition: "Disabled", justification: "test" }] })).toThrow();
    expect(() => renderTlcConfiguration({ ...config, constants: { ...config.constants, Capacity: "1\nCONSTRAINT Disabled" } })).toThrow();
  });

  test("admits process completion, exact properties and reachable transitions together", () => {
    expect(admitTlcCommandOutput(completed(safety), "Custody", config, success).success).toBe(true);
    expect(admitTlcCommandOutput(completed(action, 13), "Custody", { ...config, properties: ["NeverAcquirePrimary"] }, witness).trace).toHaveLength(3);
    const temporal = { ...config, invariants: ["TypeOK", "NoSibling"], properties: ["EventuallyDone"] };
    expect(admitTlcCommandOutput(completed(liveness, 13), "Custody", temporal, { kind: "liveness", property: "EventuallyDone", action: null }).loop).not.toBeNull();
    expect(() => admitTlcCommandOutput(completed(liveness, 13), "Custody", { ...temporal, properties: ["EventuallyDone", "AnotherProperty"] }, { kind: "liveness", property: "EventuallyDone", action: null })).toThrow();
  });

  test.each([
    { exitCode: 255 }, { signal: "SIGKILL" }, { timedOut: true }, { outputExceeded: true }, { cleanupObserved: false }, { stderr: "warning\n" },
  ])("rejects failed process custody/completion %j", changed => {
    expect(() => admitTlcCommandOutput({ ...completed(safety), ...changed }, "Custody", config, success)).toThrow();
  });

  test("rejects queue leftovers, constant-only exploration and disabled/uncompleted properties", () => {
    expect(() => admitTlcCommandOutput(completed(safety.replaceAll("323 distinct states found, 0 states left", "323 distinct states found, 1 states left")), "Custody", config, success)).toThrow();
    expect(() => admitTlcCommandOutput(completed(safety.replaceAll("719 states generated, 323 distinct states found", "1 states generated, 1 distinct states found")), "Custody", config, success)).toThrow();
    expect(() => admitTlcCommandOutput(completed(safety), "Custody", { ...config, invariants: [...config.invariants, "Missing"] }, success)).toThrow();
    expect(() => admitTlcCommandOutput(completed(safety), "Custody", { ...config, properties: ["EventuallyDone"] }, success)).toThrow();
  });

  test("rejects a wrong-property failure, coverage-only witness, wrong action and stuttering states", () => {
    expect(() => admitTlcCommandOutput(completed(action, 12), "Custody", config, { kind: "invariant", property: "NoSibling", action: null })).toThrow();
    expect(() => admitTlcCommandOutput(completed(action, 13), "Custody", witnessConfig, { ...witness, property: "NeverSelect" })).toThrow();
    expect(() => admitTlcCommandOutput(completed(remove(action, 2217), 13), "Custody", witnessConfig, witness)).toThrow();
    expect(() => admitTlcCommandOutput(completed(action, 13), "Custody", witnessConfig, { ...witness, action: "Publish" })).toThrow();
    const states = parseTlcOutput(action, "Custody").trace;
    const stuttered = action.replace(states[2]!.body, states[1]!.body);
    expect(() => admitTlcCommandOutput(completed(stuttered, 13), "Custody", witnessConfig, witness)).toThrow();
    expect(() => admitTlcCommandOutput(completed(action, 13), "Custody", config, witness)).toThrow();
  });

  test("binds the complete Java runtime to verified archive contents", () => {
    const manifest = JSON.parse(readFileSync(join(import.meta.dir, "java-runtime.json"), "utf8")) as { files: FileBinding[]; archive: { sha256: string } };
    expect(() => admitJavaRuntimeFiles(manifest, manifest.files)).not.toThrow();
    const changed = structuredClone(manifest.files);
    changed.find(file => file.path === "lib/modules")!.sha256 = `sha256:${"0".repeat(64)}`;
    expect(() => admitJavaRuntimeFiles(manifest, changed)).toThrow();
    expect(() => admitJavaRuntimeFiles(manifest, manifest.files.filter(file => file.path !== "lib/server/libjvm.dylib"))).toThrow();
    expect(() => admitJavaRuntimeFiles(manifest, [...manifest.files, manifest.files[0]!])).toThrow();
    expect(() => admitJavaRuntimeFiles({ ...manifest, archive: { ...manifest.archive, sha256: `sha256:${"0".repeat(64)}` } }, manifest.files)).toThrow();
  });
});
