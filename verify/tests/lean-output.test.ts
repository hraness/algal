import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { parseModuleAudit, parseTheoremAudit, parseVectorOutput, theoremNames } from "../lean/output";
import type { CommandResult } from "../lib/runner";

const positive = await Bun.file(resolve(import.meta.dir, "../lean/fixtures/audit-positive.json")).json() as CommandResult;
const name = "Algal.Core.Probe.accepted";
const fixtureFile = "AuditProbe.lean";

test("vector output has exactly one complete JSON line under successful custody", () => {
  expect(parseVectorOutput({ ...positive, stdout: "{\"x\":1}\n" })).toEqual({ x: 1 });
  for (const stdout of ["{}", "{}\n\n", "{}\n{}\n", "{\n}\n", "\n", "{}\r\n\r\n"])
    expect(() => parseVectorOutput({ ...positive, stdout })).toThrow();
});

test("actual toy Lean environment audit is parsed without becoming a production claim", () => {
  expect(parseTheoremAudit(positive, fixtureFile, [name])).toEqual([{ name, type: "True", transitiveAxioms: [] }]);
});

test("Lean audit rejects incomplete execution and missing/duplicate theorem records", () => {
  for (const patch of [{ exitCode: 1 }, { timedOut: true }, { cleanupObserved: false }, { outputExceeded: true }, { stderr: "warning" }, { stdout: "" }, { stdout: positive.stdout + positive.stdout }, { stdout: positive.stdout.trimEnd() }])
    expect(() => parseTheoremAudit({ ...positive, ...patch }, fixtureFile, [name])).toThrow();
  expect(() => parseTheoremAudit(positive, fixtureFile, [])).toThrow();
  expect(() => parseTheoremAudit(positive, fixtureFile, [name, name])).toThrow();
  expect(() => parseTheoremAudit(positive, fixtureFile, ["missing"])).toThrow();
});

test("Lean diagnostics cannot hide errors, unrelated output, non-theorems or unreviewed transitive axioms", () => {
  for (const change of [
    (message: Record<string, unknown>) => { message.severity = "warning"; },
    (message: Record<string, unknown>) => { message.severity = "error"; },
    (message: Record<string, unknown>) => { message.fileName = "Other.lean"; },
    (message: Record<string, unknown>) => { message.isSilent = true; },
    (message: Record<string, unknown>) => { message.extra = true; },
  ]) {
    const message = JSON.parse(positive.stdout); change(message);
    expect(() => parseTheoremAudit({ ...positive, stdout: JSON.stringify(message) + "\n" }, fixtureFile, [name])).toThrow();
  }
  for (const patch of [{ declarationKind: "definition" }, { name: "other" }, { type: "" }, { transitiveAxioms: ["sorryAx"] }, { transitiveAxioms: ["Algal.Core.Hidden.assumption"] }, { transitiveAxioms: ["Lean.ofReduceBool"] }, { extra: true }]) {
    const message = JSON.parse(positive.stdout);
    message.data = JSON.stringify({ ...JSON.parse(message.data), ...patch });
    expect(() => parseTheoremAudit({ ...positive, stdout: JSON.stringify(message) + "\n" }, fixtureFile, [name])).toThrow();
  }
});

test("core inventory requires exact scope, theorem roles, domains and both witness classes", async () => {
  const inventory = await Bun.file(resolve(import.meta.dir, "../lean/Algal/Core/theorems.json")).json();
  expect(theoremNames(inventory).length).toBeGreaterThan(0);
  for (const patch of [{ proofScope: "production-proof" }, { allowedAxioms: ["sorryAx"] }, { domains: [] }, { theorems: [] }, { unmetCriteria: [] }])
    expect(() => theoremNames({ ...inventory, ...patch })).toThrow();
  for (const domain of [{ ...inventory.domains[0], admittedWitnesses: [] }, { ...inventory.domains[0], rejectedWitnesses: ["missing"] }])
    expect(() => theoremNames({ ...inventory, domains: [domain, ...inventory.domains.slice(1)] })).toThrow();
  expect(() => theoremNames({ ...inventory, theorems: [inventory.theorems[0], ...inventory.theorems] })).toThrow();
  const confused = structuredClone(inventory);
  confused.domains[0].rejectedWitnesses = confused.domains[0].admittedWitnesses;
  expect(() => theoremNames(confused)).toThrow("witness role mismatch");
});

test("whole-module audit retains private generated theorems and rejects unclaimed axioms", () => {
  const module = "Algal.Core.Probe", privateName = "_private.Algal.Core.Probe.0.helper.match_1";
  const data = { contract: "algal.lean-module-theorems.v1", modules: [module], theorems: [
    { name, module, internalDetail: false, transitiveAxioms: [] as string[] },
    { name: privateName, module, internalDetail: true, transitiveAxioms: ["propext"] },
  ] };
  const result = (value: unknown): CommandResult => ({ ...positive, stdout: JSON.stringify({ ...JSON.parse(positive.stdout), data: JSON.stringify(value) }) + "\n" });
  const claims = [{ name, module }];
  expect(parseModuleAudit(result(data), fixtureFile, [module], claims)).toEqual(data.theorems);
  for (const patch of [
    { contract: "unknown" }, { modules: [] }, { modules: ["Other"] }, { theorems: [] },
    { theorems: [data.theorems[1]] }, { theorems: [...data.theorems, data.theorems[0]] },
    { theorems: [data.theorems[0], { ...data.theorems[1], transitiveAxioms: ["Hidden.assumption"] }] },
    { theorems: [data.theorems[0], { ...data.theorems[1], module: "Other" }] },
    { theorems: [data.theorems[0], { ...data.theorems[1], internalDetail: "true" }] },
  ]) expect(() => parseModuleAudit(result({ ...data, ...patch }), fixtureFile, [module], claims)).toThrow();
  for (const patch of [{ timedOut: true }, { cleanupObserved: false }, { stderr: "warning" }, { stdout: result(data).stdout + result(data).stdout }])
    expect(() => parseModuleAudit({ ...result(data), ...patch }, fixtureFile, [module], claims)).toThrow();
});
