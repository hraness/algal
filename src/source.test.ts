import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileSource, SOURCE_BOUNDS, SourceError } from "./source";
import { manifestToJson } from "./contract";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { scriptedExecutor, type EffectRequest, type Executor } from "./effects";
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

test("source diagnostics reject invalid programs, insufficient budgets and authority fabrication", async () => {
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

test("effectful match selects one arm, gates every inactive cell, and replays its receipt", async () => {
  const { manifest, sourceMap } = compileSource(await fixture("route.algal"));
  const args = JSON.parse(await fixture("route.args.json"));
  for (const [choice, selected, calls] of [["help", 1, 2], ["sales", 2, 2], ["other", 3, 1]] as const) {
    const store = new MemoryStore();
    await compileOrganism(manifest, builtinRegistry(), store);
    const responses = JSON.parse(await fixture(`route.responses.${choice}.json`));
    const delegate = scriptedExecutor(responses); const requests: EffectRequest[] = [];
    const executor: Executor = { ...delegate, execute: async request => { requests.push(request); return delegate.execute(request); } };
    const receipt = await runOrganism({ manifest, args, store, fns: builtinRegistry(), executors: [executor] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.work.agentCalls).toBe(calls);
    expect(requests.map(request => request.cellId)).toEqual(choice === "other" ? ["b1-intent-decide"] : ["b1-intent-decide", `branch-1-arm-${selected}`]);
    for (const request of requests) expect(Object.keys(request.context.inputs as object)).toEqual(request.kind === "decide" ? ["context"] : ["instruction", "context"]);
    for (const cell of manifest.cells.filter(cell => cell.id.startsWith("branch-1-arm-"))) {
      expect(receipt.cells[cell.id]?.status).toBe(cell.id.startsWith(`branch-1-arm-${selected}`) ? "committed" : "skipped");
      expect("inputs" in cell && cell.inputs?.["source-control-1"]?.optional).not.toBe(true);
      expect(manifest.edges.some(edge => edge.to.cell === cell.id && edge.to.port === "source-control-1" && edge.guard)).toBe(true);
    }
    expect(receipt.cells.result?.outputs?.out).toBe(choice === "other" ? "Needs a human review." : responses[`branch-1-arm-${selected}`]);
    expect(sourceMap.manifestDigest).toBe(receipt.manifestDigest);
    expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(manifest), store, builtinRegistry())).ok).toBe(true);
    expect(requests).toHaveLength(calls);
  }
});

test("effectful if gates nested selectors, failing operands, bare names, and constants", async () => {
  const source = `program nested(flags: json, email: text) -> text {
    budget { max_agent_calls: 1 }
    let resultText = if flags.outer {
      if flags.inner {
        generate "use the number" using (1 / 0)
      } else { generate "reply" using email }
    } else { email }
    return resultText
  }`;
  const { manifest } = compileSource(source);
  for (const [flags, expected, calls] of [[{ outer: false, inner: "invalid" }, "message", 0], [{ outer: true, inner: false }, "response", 1]] as const) {
    const receipt = await runOrganism({ manifest, args: { input: { flags, email: "message" } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor({ "branch-2-arm-2": "response" })] });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.work.agentCalls).toBe(calls);
    expect(receipt.cells.result?.outputs?.out).toBe(expected);
    expect(receipt.cells["branch-2-arm-1-context"]?.status).toBe("skipped");
    if (!flags.outer) {
      expect(receipt.cells["branch-2-select"]?.status).toBe("skipped");
      expect(receipt.cells["branch-1-arm-1"]?.status).toBe("skipped");
      expect(receipt.cells["branch-1-arm-2"]?.status).toBe("committed");
    }
  }
  const selectedFailure = await runOrganism({ manifest, args: { input: { flags: { outer: true, inner: true }, email: "message" } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [] });
  expect(selectedFailure.outcome).toBe("failed");
  expect(selectedFailure.work.agentCalls).toBe(0);
});

test("branch-local decisions validate before use and preserve matching closed label sets", async () => {
  const source = `program choices(flags: json, email: text) -> text {
    budget { max_agent_calls: 2 }
    let decision = if flags.first {
      decide "first" using email as choice { help: "support", other: "review" }
    } else { decide "second" using email as choice { other: "review", help: "support" } }
    return match decision.value {
      help => generate "reply" using email,
      other => "review"
    }
  }`;
  const { manifest } = compileSource(source);
  for (const first of [true, false]) {
    const id = `branch-1-arm-${first ? 1 : 2}-decide`;
    const answer = { choice: "help", confidence: 0.9, probabilities: { help: 0.9, other: 0.1 } };
    const responses = { [id]: { answers: { answer } }, "branch-2-arm-1": "reply" };
    const run = () => runOrganism({ manifest, args: { input: { flags: { first }, email: "message" } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    const receipt = await run();
    expect(receipt.outcome).toBe("complete"); expect(receipt.work.agentCalls).toBe(2);
    expect(receipt.cells.result?.outputs?.out).toBe("reply");
    answer.choice = "unlisted";
    const malformed = await run();
    expect(malformed.outcome).toBe("failed"); expect(malformed.work.agentCalls).toBe(1);
    expect(malformed.cells["branch-2-arm-1"]?.status).not.toBe("committed");
  }
  expect(() => compileSource(source.replace('other: "review", help: "support"', 'other: "review", different: "support"'))).toThrow(/closed choice/);
});

test("branch budgets use maximum arm attempts and add sequential effects", async () => {
  const source = `program attempts(flag: json) -> text {
    budget { max_agent_calls: 2 }
    let first = if flag { generate "a" using flag } else { generate "b" using flag }
    return if flag { generate "c" using first } else { "done" }
  }`;
  const { manifest } = compileSource(source);
  expect(manifest.cells.filter(cell => cell.kind === "agent")).toHaveLength(3);
  expect(() => compileSource(source.replace("max_agent_calls: 2", "max_agent_calls: 1"))).toThrow(/2 explicit effects/);
  for (const [flag, calls, output] of [[true, 2, "c"], [false, 1, "done"]] as const) {
    const receipt = await runOrganism({ manifest, args: { input: { flag } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor({ "branch-1-arm-1": "a", "branch-1-arm-2": "b", "branch-2-arm-1": "c" })] });
    expect(receipt.outcome).toBe("complete"); expect(receipt.work.agentCalls).toBe(calls); expect(receipt.cells.result?.outputs?.out).toBe(output);
  }
});

test("deep branches inherit control transitively without quadratic edge growth", async () => {
  let body = 'generate "draft" using "context"';
  for (let depth = 0; depth < 12; depth++) body = `if true { ${body} } else { "skip" }`;
  const { manifest } = compileSource(`program deep() -> text { budget { max_agent_calls: 1 } return ${body} }`);
  expect(manifest.cells.length).toBe(39);
  expect(manifest.edges.length).toBeLessThan(100);
  const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor({ "branch-12-arm-1": "draft" })] });
  expect(receipt.outcome).toBe("complete"); expect(receipt.work.agentCalls).toBe(1); expect(receipt.cells.result?.outputs?.out).toBe("draft");
});

test("effects stay out of composite values, conditions, discriminants and effect operands", () => {
  const effect = 'generate "reply" using "context"';
  const program = (result: string, output = "text") => `program invalid() -> ${output} { budget { max_agent_calls: 4 } return ${result} }`;
  for (const source of [
    program(`{hidden: ${effect}}`, "json"), program(`[${effect}]`, "json"),
    program(`"prefix" + (${effect})`), program(`if (${effect}) == "yes" { "a" } else { "b" }`),
    program(`match (${effect}) { yes => "a", no => "b" }`),
    program(`generate (${effect}) using "context"`), program(`generate "reply" using (${effect})`),
    program(`if true { ${effect} } else { 2 }`), program(`if "yes" { ${effect} } else { "no" }`),
  ]) expect(() => compileSource(source), source).toThrow(SourceError);
});

test("effectful match admits every maximum-width arm and still enforces core cell bounds", async () => {
  const labels = Array.from({ length: SOURCE_BOUNDS.maxChoiceLabels }, (_, i) => `label${i}`);
  const wide = `program wide(context: text) -> text { budget { max_agent_calls: 2 }
    let decision = decide "Select a label" using context as choice { ${labels.map(l => `${l}: "${l}"`).join(",")} }
    return match decision.value { ${labels.map(l => `${l} => generate "${l}" using context`).join(",")} }
  }`;
  const { manifest } = compileSource(wide);
  for (const [index, choice] of labels.entries()) {
    const responses = { "b1-decision-decide": { answers: { answer: { choice, confidence: 1, probabilities: Object.fromEntries(labels.map(l => [l, l === choice ? 1 : 0])) } } }, [`branch-1-arm-${index + 1}`]: choice };
    const receipt = await runOrganism({ manifest, args: { input: { context: "select" } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
    expect(receipt.outcome).toBe("complete"); expect(receipt.work.agentCalls).toBe(2); expect(receipt.cells.result?.outputs?.out).toBe(choice);
  }
  const oversized = wide.replace(/generate "(label[0-9]+)" using context/g, 'if true { generate "$1" using "x" } else { generate "$1" using "y" }');
  expect(() => compileSource(oversized)).toThrow(/cell limit/);
  const long = `program long() -> text { budget { max_agent_calls: 1 } let ${"a".repeat(40)} = if true { generate "x" using "y" } else { "z" } return ${"a".repeat(40)} }`;
  expect(compileSource(long).manifest.cells.every(cell => cell.id.length <= 64)).toBe(true);
});

test("annotations retain source meaning and names while existing executable identities stay stable", async () => {
  for (const [name, digest] of [
    ["reply", "sha256:fa60e616cc9c4474cc3f31962932cc3ff33ac12155f011919b09e2f1e2d08012"],
    ["quote", "sha256:040dae4481f1d996b39019cd9ba8595c837b20a151c661bc86d2a305301c4ea9"],
    ["uncertain", "sha256:da4e470b18a03926ae69a9706037f77448ed7a1179eba4ea22ea85824db362c9"],
  ] as const) expect(compileSource(await fixture(`${name}.algal`)).sourceMap.manifestDigest).toBe(digest);
  const { sourceMap } = compileSource(await fixture("route.algal"));
  const item = (id: string) => sourceMap.cells.find(cell => cell.cellId === id)?.annotation;
  expect(item("input")?.details).toEqual(["email: text"]);
  expect(item("b1-intent-decide")?.summary).toContain('"What does this email need?"');
  expect(item("b1-intent-decide")?.details).toEqual(["help: Help with a problem", "sales: Information before buying", "other: Anything else"]);
  expect(item("b1-intent")?.summary).toContain("Validate");
  expect(item("result")?.title).toBe("return"); expect(item("result")?.summary).toBe("match intent.value");
  expect(item("result")?.details).toEqual(['help => generate "Draft a helpful support reply." using email', 'sales => generate "Draft a concise sales reply." using email', 'other => "Needs a human review."']);
  expect(item("branch-1-arm-1")?.details).toEqual(['instruction: "Draft a helpful support reply."', "context: email"]);
  const spelled = compileSource('program names(orderData: json) -> json { budget { max_agent_calls: 0 } let unitPrice = orderData.price return unitPrice }');
  expect(spelled.sourceMap.cells.find(cell => cell.role === "expression")?.annotation?.title).toBe("unitPrice");
  const long = compileSource(`program long() -> text { budget { max_agent_calls: 1 } return generate "${"x".repeat(3000)}" using "${"y".repeat(3000)}" }`);
  for (const cell of [...sourceMap.cells, ...long.sourceMap.cells]) {
    expect(cell.annotation).toBeDefined();
    expect(cell.annotation!.title.length).toBeLessThanOrEqual(96); expect(cell.annotation!.operation.length).toBeLessThanOrEqual(40);
    expect(cell.annotation!.summary.length).toBeLessThanOrEqual(160); expect(cell.annotation!.details.length).toBeLessThanOrEqual(16);
    for (const detail of cell.annotation!.details) expect(detail.length).toBeLessThanOrEqual(160);
  }
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
