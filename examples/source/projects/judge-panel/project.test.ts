import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { loadSourceProject } from "../../../../src/source-project";
import type { SourceCompilation } from "../../../../src/source";
import { MemoryStore } from "../../../../src/store-memory";
import { builtinRegistry } from "../../../../src/registry";
import { runOrganism } from "../../../../src/run";
import { scriptedExecutor } from "../../../../src/effects";
import type { ErrorCode } from "../../../../src/errors";
import type { JsonValue } from "../../../../src/values";

type Args = Record<string, Record<string, JsonValue>>;
const projects = `${import.meta.dir}/..`;
async function install(compilation: SourceCompilation) {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  await store.putManifest(compilation.manifest);
  return store;
}
const fixture = async (name: "args" | "responses") => JSON.parse(await readFile(`${import.meta.dir}/main.${name}.json`, "utf8"));
const load = () => loadSourceProject(`${import.meta.dir}/main.algal`, { root: projects });
async function execute(compilation: SourceCompilation, args: Args, responses: Record<string, JsonValue>) {
  return runOrganism({ manifest: compilation.manifest, args, store: await install(compilation), fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
}

test("the judge panel fans cases out to per-alternative decide questions", async () => {
  const main = await load();
  expect(main.entry).toBe("judge-panel/main.algal");
  expect(Object.keys(main.sources).sort()).toEqual([
    "judge-panel/judge_alternative.algal", "judge-panel/judge_case.algal", "judge-panel/main.algal",
  ]);
  expect(main.analysis).toEqual({ maxAgentCalls: 16, requiredDepth: 2 });
  const receipt = await execute(main, await fixture("args"), await fixture("responses"));
  expect(receipt.outcome).toBe("complete");
  expect(receipt.work.agentCalls).toBe(8);
  expect(receipt.cells.result!.outputs!.out).toEqual([
    { case: "c1", verdicts: [
      { alternative: "a1", score: 8, confidence: 0.9, keep: 0.9, flagged: true },
      { alternative: "a2", score: 5, confidence: 0.7, keep: 0.6, flagged: true },
    ] },
    { case: "c2", verdicts: [
      { alternative: "a3", score: 7, confidence: 0.8, keep: 0.8, flagged: true },
      { alternative: "a4", score: 4, confidence: 0.6, keep: 0.3, flagged: false },
    ] },
  ]);
});

test("malformed answers, missing responses, and oversized panels fail at their decide or each cells", async () => {
  const main = await load();
  const args = await fixture("args") as Args;
  const responses = await fixture("responses") as Record<string, JsonValue>;
  const badScore = structuredClone(responses);
  (badScore["b1-quality-decide"] as JsonValue[])[0] = { answers: { answer: { score: "high", confidence: 0.9, probabilities: { poor: 0.1, ok: 0.2, great: 0.7 } } } };
  const badNoul = structuredClone(responses);
  (badNoul["b2-keep-decide"] as JsonValue[])[0] = { answers: { answer: { noul: 1.5 } } };
  const threeCases = structuredClone(args);
  (threeCases.input!.cases as JsonValue[]).push((threeCases.input!.cases as JsonValue[])[0]!);
  const fiveAlts = structuredClone(args);
  const first = (fiveAlts.input!.cases as { alternatives: JsonValue[] }[])[0]!;
  first.alternatives = [...first.alternatives, ...first.alternatives, first.alternatives[0]!];
  const cases: [string, Args, Record<string, JsonValue>, ErrorCode, string][] = [
    ["a missing response", args, { "b1-quality-decide": responses["b1-quality-decide"]! }, "EFFECT_UNBOUND", "result-each/i0/b1-verdicts-each/i0/b2-keep-decide"],
    ["a non-numeric score", args, badScore, "EFFECT_UNPARSEABLE", "result-each/i0/b1-verdicts-each/i0/b1-quality-decide"],
    // An out-of-range keep passes the decide cell's schema, then fails the
    // generated decision check before the verdict record is built.
    ["an out-of-range keep", args, badNoul, "EXPR_FAILED", "result-each/i0/b1-verdicts-each/i0/b2-keep"],
    ["a third case", threeCases, responses, "BUDGET_EXHAUSTED", "result-each"],
    ["a fifth alternative", fiveAlts, responses, "BUDGET_EXHAUSTED", "result-each/i0/b1-verdicts-each"],
  ];
  for (const [label, input, resp, code, path] of cases) {
    const receipt = await execute(main, input, resp);
    expect({ label, outcome: receipt.outcome, code: receipt.failure?.code, path: receipt.failure?.path }).toEqual({ label, outcome: "failed", code, path });
    expect(receipt.cells.result?.outputs).toBeUndefined();
  }
});
