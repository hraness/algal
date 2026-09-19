import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileSource, SOURCE_BOUNDS, SourceError } from "./source";
import { manifestToJson } from "./contract";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { scriptedExecutor, type Executor } from "./effects";
import { runOrganism } from "./run";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";

const examples = join(import.meta.dir, "../examples/source");
const fixture = async (name: string) => readFile(join(examples, name), "utf8");
const pure = (expression: string, output = "json") =>
  `program test() -> ${output} { budget { max_agent_calls: 0 } return ${expression} }`;

test("compiled reply admits, isolates context, runs two effects and replays offline", async () => {
  const source = await fixture("reply.algal");
  const { manifest, sourceMap } = compileSource(source);
  const store = new MemoryStore();
  await compileOrganism(manifest, builtinRegistry(), store);
  const responses = JSON.parse(await fixture("reply.responses.json"));
  const args = JSON.parse(await fixture("reply.args.json"));
  const delegate = scriptedExecutor(responses);
  const requests: unknown[] = [];
  const executor: Executor = { ...delegate, execute: async request => { requests.push(request); return delegate.execute(request); } };
  const receipt = await runOrganism({ manifest, args, store, fns: builtinRegistry(), executors: [executor] });
  expect(receipt.outcome).toBe("complete");
  expect(receipt.work.agentCalls).toBe(2);
  expect(receipt.cells.result?.outputs?.out).toBe(responses.result);
  expect(receipt.cells["b2-task"]?.outputs?.out).toBe("Draft a helpful support reply.");
  expect(requests).toHaveLength(2);
  const decisions = manifest.cells.filter(c => c.kind === "decide");
  expect(decisions[0]?.inputs).toEqual({ context: { type: "text" } });
  expect(decisions[0]?.view).toEqual({ inputs: ["context"] });
  const generation = manifest.cells.find(c => c.kind === "agent");
  expect(generation?.view).toEqual({ inputs: ["instruction", "context"] });
  expect(Object.keys(generation?.inputs ?? {})).toEqual(["instruction", "context"]);
  expect(sourceMap.manifestDigest).toBe(receipt.manifestDigest);
  expect(sourceMap.cells.map(c => c.cellId)).toEqual(manifest.cells.map(c => c.id));
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store, builtinRegistry())).ok).toBe(true);
  expect(requests).toHaveLength(2);
});

test("uncertainty routing uses selected probability, not confidence", async () => {
  const { manifest } = compileSource(await fixture("uncertain.algal"));
  const responses = JSON.parse(await fixture("uncertain.responses.json"));
  for (const [probability, expected] of [[0.4, "Draft a question that clarifies what the sender needs."], [0.94, "Draft a helpful support reply."]] as const) {
    responses["b1-intent-decide"].answers.answer.probabilities = { help: probability, sales: (1 - probability) / 2, other: (1 - probability) / 2 };
    const receipt = await runOrganism({ manifest, args: JSON.parse(await fixture("uncertain.args.json")), store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["b2-task"]?.outputs?.out).toBe(expected);
  }
});

test("malformed decision metadata cannot fall through an exhaustive match", async () => {
  const { manifest } = compileSource(await fixture("reply.algal"));
  for (const invalid of [
    { choice: "unlisted" }, { confidence: -0.1 },
    { probabilities: { help: 2, sales: 0, other: 0 } },
    { probabilities: { help: 0.9, sales: 0.1 } },
  ]) {
    const responses = JSON.parse(await fixture("reply.responses.json"));
    Object.assign(responses["b1-intent-decide"].answers.answer, invalid);
    const receipt = await runOrganism({ manifest, args: JSON.parse(await fixture("reply.args.json")), store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    expect(receipt.outcome).toBe("failed");
    expect(receipt.work.agentCalls).toBe(1);
    expect(receipt.cells.result?.status).not.toBe("committed");
  }
});

test("formatting changes source identity but not executable identity", async () => {
  const source = await fixture("reply.algal");
  const a = compileSource(source);
  const b = compileSource(`/* a comment */\n${source.replaceAll("let ", "let    ")}\n// done\n`);
  expect(manifestToJson(a.manifest)).toEqual(manifestToJson(b.manifest));
  expect(a.sourceMap.manifestDigest).toBe(b.sourceMap.manifestDigest);
  expect(a.sourceMap.sourceDigest).not.toBe(b.sourceMap.sourceDigest);
  expect(a.sourceMap.cells[0]?.span.start.line).not.toBe(b.sourceMap.cells[0]?.span.start.line);
});

test("pure expressions preserve arithmetic, records, lists, null, short circuit and quoted keys", async () => {
  const cases: [string, JsonValue][] = [
    ["{answer: (3 + 4) * 2, empty: null, items: [true, 2, {value: 3}]}", { answer: 14, empty: null, items: [true, 2, { value: 3 }] }],
    ["if false && (1 / 0 == 0) { 0 } else { 9 }", 9],
    ["{\"__proto__\": 1, value: 2}", JSON.parse('{"__proto__":1,"value":2}')],
    ["-5 % 2", -1],
  ];
  for (const [expr, expected] of cases) {
    const { manifest } = compileSource(pure(expr));
    const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells.result?.outputs?.out).toEqual(expected);
  }
});

test("JSON runtime types are checked by pure operators and bindings use safe wire names", async () => {
  const { manifest } = compileSource(`program price(order_data: json) -> json {
    budget { max_agent_calls: 0 }
    let unitPrice = order_data.price
    let total_cost = unitPrice * 2
    return {total: total_cost}
  }`);
  for (const [price, outcome] of [[12, "complete"], ["twelve", "failed"]] as const) {
    const receipt = await runOrganism({ manifest, args: { input: { "order-data": { price } } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [] });
    expect(receipt.outcome).toBe(outcome);
    if (outcome === "complete") expect(receipt.cells.result?.outputs?.out).toEqual({ total: 24 });
  }
});

test("source diagnostics reject invalid programs, effects in branches and authority fabrication", async () => {
  const reply = await fixture("reply.algal");
  const invalid = [
    reply.replace('other => "Draft a clarifying question."', ""),
    reply.replace('help: "Help with a problem"', 'help: "One", help: "Two"'),
    reply.replace("max_agent_calls: 2", "max_agent_calls: 1"),
    reply.replace("using email", "using unknown"),
    pure('if true { generate "do something" using "x" } else { "no" }', "text"),
    'program bad(value: cap) -> text { budget { max_agent_calls: 0 } return "x" }',
    'program bad() -> text { budget { max_agent_calls: 0 } let a = "x" let a = "y" return a }',
    pure('"text"'), pure("1", "text"), pure('true + 1'),
    'program bad() -> text { budget { max_agent_calls: 0, mystery: 2 } return "x" }',
    'program bad() -> text { budget { max_agent_calls: 0 } return process.exit(0) }',
    'program', 'program bad(', 'program bad() -> text { budget { max_agent_calls: 0 }',
    pure('"x"', "text") + ' trailing', pure('"raw\tcontrol"', "text"),
  ];
  for (const source of invalid) expect(() => compileSource(source), source).toThrow(SourceError);
});

test("source parsing and lowering stay bounded", () => {
  expect(() => compileSource(" ".repeat(SOURCE_BOUNDS.maxSourceBytes + 1))).toThrow(/bytes/);
  expect(() => compileSource(pure("(".repeat(100) + "1" + ")".repeat(100)))).toThrow(/nesting/);
  expect(() => compileSource(pure(`[${Array(65).fill("1").join(",")}]`))).toThrow(/collection/);
  expect(() => compileSource(`program too_many() -> json { budget { max_agent_calls: 0 } ${Array.from({ length: 25 }, (_, i) => `let a${i} = ${i}`).join("\n")} return 1 }`)).toThrow(/binding/);
});

test("the maximum choice set compiles and dispatches every exhaustive arm", async () => {
  const labels = Array.from({ length: SOURCE_BOUNDS.maxChoiceLabels }, (_, i) => `label${i}`);
  const source = `program wide(context: text) -> text { budget { max_agent_calls: 1 }
    let decision = decide "Select a label" using context as choice { ${labels.map(l => `${l}: "${l}"`).join(",")} }
    return match decision.value { ${labels.map(l => `${l} => "${l}"`).join(",")} }
  }`;
  const { manifest } = compileSource(source);
  for (const choice of labels) {
    const responses = { "b1-decision-decide": { answers: { answer: { choice, confidence: 1, probabilities: Object.fromEntries(labels.map(l => [l, l === choice ? 1 : 0])) } } } };
    const receipt = await runOrganism({ manifest, args: { input: { context: "select" } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells.result?.outputs?.out).toBe(choice);
  }
});
