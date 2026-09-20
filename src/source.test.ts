import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compileSource, sourceImports, resolveSourceImport, SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS, SourceError, type SourceCompilation } from "./source";
import { manifestToJson } from "./contract";
import { compileOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { MemoryStore } from "./store";
import { scriptedExecutor, type EffectRequest, type Executor } from "./effects";
import { runOrganism } from "./run";
import { verifyReceipt } from "./verify";
import type { JsonValue } from "./values";
import { packOrganism, unpackBundle } from "./bundle";

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

const childText = `program draft(email: text, tone: text) -> text {
  budget { max_agent_calls: 1 }
  return generate tone using email
}`;
async function projectStore(compilation: SourceCompilation): Promise<MemoryStore> {
  const store = new MemoryStore();
  for (const manifest of compilation.modules) await store.putManifest(manifest);
  return store;
}

test("source imports share parser diagnostics and resolve only bounded project-relative keys", () => {
  const source = `// header\nimport draft from "./parts/draft.algal"; /* ok */\nimport other from "../other.algal"\n${pure("1")}`;
  const imports = sourceImports(source);
  expect(imports.map(({ alias, path }) => ({ alias, path }))).toEqual([{ alias: "draft", path: "./parts/draft.algal" }, { alias: "other", path: "../other.algal" }]);
  expect(imports[0]!.span.start.line).toBe(2);
  expect(resolveSourceImport("app/main.algal", imports[0]!.path, imports[0]!.span)).toBe("app/parts/draft.algal");
  expect(resolveSourceImport("app/main.algal", imports[1]!.path, imports[1]!.span)).toBe("other.algal");
  for (const path of ["/tmp/a.algal", "https://x/a.algal", "a.algal", "./a.json", "../../outside.algal", "./a\\b.algal", "./a\nb.algal", "./a//b.algal"]) {
    expect(() => resolveSourceImport("app/main.algal", path, imports[0]!.span), path).toThrow(SourceError);
  }
  expect(() => sourceImports(`import x from "./a.algal" import x from "./b.algal" ${pure("1")}`)).toThrow(/duplicate import/);
  expect(() => sourceImports(`${Array.from({ length: 17 }, (_, i) => `import a${i} from "./a.algal"`).join("\n")} ${pure("1")}`)).toThrow(/import limit/);
});

test("source calls preserve child identity and exact named context through portable closures", async () => {
  const source = `import draft from "./draft.algal"
    program caller(email: text) -> text { budget { max_agent_calls: 1 }
      let secret = "LOCAL SECRET"
      return call draft using { tone: "helpful", email: email }
    }`;
  const compilation = compileSource(source, { modules: { "draft.algal": childText } });
  const child = compileSource(childText);
  expect(compilation.analysis).toEqual({ maxAgentCalls: 1, requiredDepth: 1 });
  expect(compilation.modules).toEqual([child.manifest]);
  expect(compilation.manifest.cells.find(cell => cell.id === "result")).toEqual({ id: "result", kind: "organism", manifest: child.sourceMap.manifestDigest });
  const store = await projectStore(compilation);
  const delegate = scriptedExecutor({ result: "reply" });
  const requests: EffectRequest[] = [];
  const executor: Executor = { ...delegate, execute: async request => { requests.push(request); return delegate.execute(request); } };
  const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { email: "question" } }, store, fns: builtinRegistry(), executors: [executor] });
  expect(receipt.outcome).toBe("complete"); expect(receipt.cells.result?.outputs?.result).toBe("reply");
  expect(JSON.stringify(requests)).toContain("question"); expect(JSON.stringify(requests)).toContain("helpful");
  expect(JSON.stringify(requests)).not.toContain("LOCAL SECRET"); expect(JSON.stringify(requests)).not.toContain("source-control");
  const bundle = await packOrganism(compilation.manifest, store);
  const portable = new MemoryStore(); await unpackBundle(bundle, portable);
  expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(compilation.manifest), portable, builtinRegistry())).ok).toBe(true);
  const changed = compileSource(source, { modules: { "draft.algal": childText.replace("generate tone", 'generate "different"') } });
  expect(changed.sourceMap.manifestDigest).not.toBe(compilation.sourceMap.manifestDigest);
});

test("call branches gate every argument and preserve child contexts for dynamic text", async () => {
  const source = `import draft from "./draft.algal"
    program caller(data: json) -> text { budget { max_agent_calls: 1 }
      return if data.run { call draft using {email: data.email, tone: "helpful"} }
      else { "skip" }
    }`;
  const compilation = compileSource(source, { modules: { "draft.algal": childText } });
  for (const [data, outcome, result, calls] of [
    [{ run: false, email: 42 }, "complete", "skip", 0],
    [{ run: true, email: "hello" }, "complete", "reply", 1],
    [{ run: true, email: 42 }, "failed", undefined, 0],
  ] as const) {
    const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { data } }, store: await projectStore(compilation), fns: builtinRegistry(), executors: [scriptedExecutor({ result: "reply" })] });
    expect(receipt.outcome).toBe(outcome); expect(receipt.work.agentCalls).toBe(calls);
    expect(receipt.cells.result?.outputs?.out).toBe(result);
    if (!data.run) { expect(receipt.cells["branch-1-arm-1"]?.status).toBe("skipped"); expect(receipt.cells["branch-1-arm-1-arg-1"]?.status).toBe("skipped"); }
  }
  const unsafe = source.replace("data.email", "1 / 0");
  expect(() => compileSource(unsafe, { modules: { "draft.algal": childText } })).toThrow(/must be text/);
});

test("guarded parameterless calls use a trigger wrapper without changing the child", async () => {
  const child = `program ping() -> text { budget { max_agent_calls: 1 } return generate "ping" using "known" }`;
  const source = `import ping from "./ping.algal" program root(flag: json) -> text {
    budget { max_agent_calls: 1, max_depth: 2 }
    return if flag { call ping using {} } else { "skip" }
  }`;
  const compilation = compileSource(source, { modules: { "ping.algal": child } });
  expect(compilation.analysis).toEqual({ maxAgentCalls: 1, requiredDepth: 2 });
  expect(compilation.modules).toHaveLength(2);
  expect(compilation.modules[0]).toEqual(compileSource(child).manifest);
  for (const flag of [false, true]) {
    const delegate = scriptedExecutor({ result: "pong" }); const requests: EffectRequest[] = [];
    const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { flag } }, store: await projectStore(compilation), fns: builtinRegistry(), executors: [{ ...delegate, execute: async request => { requests.push(request); return delegate.execute(request); } }] });
    expect(receipt.outcome).toBe("complete"); expect(receipt.work.agentCalls).toBe(Number(flag));
    expect(receipt.cells.result?.outputs?.out).toBe(flag ? "pong" : "skip");
    expect(JSON.stringify(requests)).not.toContain("trigger"); expect(JSON.stringify(requests)).not.toContain("source-control");
  }
  expect(() => compileSource(source.replace("max_depth: 2", "max_depth: 1"), { modules: { "ping.algal": child } })).toThrow(/requires depth 2/);
  const direct = compileSource(`import ping from "./ping.algal" program root() -> text { budget { max_agent_calls: 1 } return call ping using {} }`, { modules: { "ping.algal": child } });
  expect(direct.analysis.requiredDepth).toBe(1); expect(direct.modules).toHaveLength(1);
});

test("each returns ordered whole lists including empty lists and enforces runtime element limits", async () => {
  const child = 'program label(item: text, prefix: text) -> text { budget { max_agent_calls: 0 } return prefix + item }';
  const source = `import label from "./label.algal" program batch(data: json) -> json {
    budget { max_agent_calls: 0 }
    return if data.run { each label over item in data.items using {prefix: "#"} max_items 3 } else { [] }
  }`;
  const compilation = compileSource(source, { modules: { "label.algal": child } });
  expect(compilation.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 1 });
  for (const [run, items, outcome, expected] of [
    [true, ["a", "b"], "complete", ["#a", "#b"]], [true, [], "complete", []],
    [false, "not a list", "complete", []], [true, "not a list", "failed", undefined],
    [true, [2], "failed", undefined], [true, ["a", "b", "c", "d"], "failed", undefined],
  ] as const) {
    const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { data: { run, items: items as unknown as JsonValue } } }, store: await projectStore(compilation), fns: builtinRegistry(), executors: [] });
    expect(receipt.outcome).toBe(outcome); expect(receipt.cells.result?.outputs?.out).toEqual(expected === undefined ? undefined : [...expected]);
    if (outcome === "complete") expect((await verifyReceipt(receipt as unknown as JsonValue, manifestToJson(compilation.manifest), await projectStore(compilation), builtinRegistry())).ok).toBe(true);
  }
});

test("composition bounds count transitive calls, maximum arms, each limits and real embedding depth", () => {
  const middle = `import draft from "./draft.algal" program twice(email: text) -> text { budget { max_agent_calls: 2 }
    let first = call draft using {email: email, tone: "first"}
    return call draft using {email: first, tone: "second"}
  }`;
  const modules = { "twice.algal": middle, "draft.algal": childText };
  const source = `import twice from "./twice.algal" program batch(emails: json) -> json { budget { max_agent_calls: 6, max_depth: 2 }
    return each twice over email in emails using {} max_items 3
  }`;
  const compilation = compileSource(source, { modules });
  expect(compilation.analysis).toEqual({ maxAgentCalls: 6, requiredDepth: 2 }); expect(compilation.modules).toHaveLength(2);
  expect(() => compileSource(source.replace("max_agent_calls: 6", "max_agent_calls: 5"), { modules })).toThrow(/6 explicit effects/);
  expect(() => compileSource(source.replace("max_depth: 2", "max_depth: 1"), { modules })).toThrow(/requires depth 2/);
  for (const limit of ["0", "65", "1.5"]) expect(() => compileSource(source.replace("max_items 3", `max_items ${limit}`), { modules })).toThrow(/max_items/);
  const branched = `import twice from "./twice.algal" import draft from "./draft.algal" program fork(flag: json) -> text {
    budget { max_agent_calls: 2 } return if flag { call twice using {email: "hello"} } else { call draft using {email: "hello", tone: "one"} }
  }`;
  expect(compileSource(branched, { modules }).analysis.maxAgentCalls).toBe(2);
});

test("module closure is deterministic, shared imports deduplicate, and unused supplied modules add no authority", () => {
  const source = `import a from "./same.algal" import b from "./same.algal" import unused from "./unused.algal"
    program root() -> text { budget { max_agent_calls: 0 } let first = call a using {name: "A"} return call b using {name: first} }`;
  const same = 'program same(name: text) -> text { budget { max_agent_calls: 0 } return name }';
  const modules = { "same.algal": same, "unused.algal": pure("1") };
  const a = compileSource(source, { modules }); const b = compileSource(source, { modules: { "main.algal": source, ...modules } });
  expect(a).toEqual(b); expect(a.modules).toHaveLength(1);
  const nested = compileSource(`import same from "../same.algal" program nested() -> text { budget { max_agent_calls: 0 } return call same using {name: "x"} }`, { entry: "app/main.algal", modules });
  expect(nested.modules).toEqual(a.modules);
});

test("imports reject missing files, cycles, excessive depth, invalid keys and untrusted module objects", () => {
  const source = `import child from "./child.algal" ${pure("1")}`;
  expect(() => compileSource(source)).toThrow(/not supplied/);
  expect(() => compileSource(source, { modules: { "child.algal": `import parent from "./main.algal" ${pure("1")}` } })).toThrow(/cycle/);
  expect(() => compileSource(source, { modules: { "child.algal": "program bad(" } })).toThrow(/child.algal/);
  for (const entry of ["/main.algal", "./main.algal", "a/../main.algal", "a//main.algal", "https://x/main.algal", "main.json"]) expect(() => compileSource(pure("1"), { entry })).toThrow(/normalized/);
  expect(() => compileSource(pure("1"), { modules: { "main.algal": pure("2") } })).toThrow(/differs/);
  expect(() => compileSource(source, { modules: { "child.algal": compileSource(pure("1")) as unknown as string } })).toThrow(/source text/);
  const tooMany = Object.fromEntries(Array.from({ length: SOURCE_PROJECT_BOUNDS.maxFiles }, (_, i) => [`m${i}.algal`, pure("1")]));
  expect(() => compileSource(pure("1"), { modules: tooMany })).toThrow(/files/);
  const chain = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`m${i}.algal`, `${i < 8 ? `import next from "./m${i + 1}.algal"` : ""} ${pure("1")}`]));
  expect(() => compileSource(`import first from "./m0.algal" ${pure("1")}`, { modules: chain })).toThrow(/import depth/);
  // Visiting a shared subtree first must not let memoization hide a deeper path.
  expect(() => compileSource(`import early from "./m5.algal" import first from "./m0.algal" ${pure("1")}`, { modules: chain })).toThrow(/import depth/);
});

test("composition rejects invalid argument records, alias shadowing and effects in call operands", () => {
  const source = (expression: string) => `import draft from "./draft.algal" program caller(email: text) -> text { budget { max_agent_calls: 4 } return ${expression} }`;
  for (const expression of [
    'call missing using {}', 'call draft using email', 'call draft using {email: email}',
    'call draft using {email: email, tone: "x", extra: "bad"}', 'call draft using {email: 2, tone: "x"}',
    'call draft using {email: generate "x" using email, tone: "x"}',
    'generate "x" using (call draft using {email: email, tone: "x"})',
    'each draft over missing in [] using {email: email, tone: "x"} max_items 2',
    'each draft over email in [] using {email: email, tone: "x"} max_items 2',
  ]) expect(() => compileSource(source(expression), { modules: { "draft.algal": childText } }), expression).toThrow(SourceError);
  expect(() => compileSource(source('"ok"').replace("email: text", "draft: text"), { modules: { "draft.algal": childText } })).toThrow(/shadows/);
  expect(() => compileSource(source('"ok"').replace('return "ok"', 'let draft = "bad" return "ok"'), { modules: { "draft.algal": childText } })).toThrow(/immutable/);
});

test("project source origins retain per-call file identity outside executable digests", () => {
  const same = 'program same() -> text { budget { max_agent_calls: 0 } return "value" }';
  const source = `import a from "./a.algal" import b from "./b.algal" program root(flag: json) -> text {
    budget { max_agent_calls: 0 } let first = call a using {}
    return if flag { call b using {} } else { first }
  }`;
  const modules = { "a.algal": same, "b.algal": `// alternate origin\n${same}` };
  const compilation = compileSource(source, { entry: "main.algal", modules });
  expect(Object.keys(compilation.project.units)).toEqual(["a.algal", "b.algal", "main.algal"]);
  expect(compilation.project.entry).toBe("main.algal");
  expect(compilation.project.units["a.algal"]?.manifestDigest).toBe(compilation.project.units["b.algal"]?.manifestDigest);
  expect(compilation.project.calls.map(call => [call.source, call.cellId, call.childSource])).toEqual([
    ["main.algal", "b1-first", "a.algal"], ["main.algal", "branch-1-arm-1", "b.algal"],
  ]);
  const guarded = compilation.project.calls[1]!;
  expect(guarded.wrapper?.innerCellId).toBe("call");
  expect(compilation.modules.some(module => module.cells.some(cell => cell.kind === "organism" && cell.id === "call" && cell.manifest === guarded.childManifestDigest))).toBe(true);
  const reformatted = compileSource(`// root comment\n${source}`, { modules });
  expect(reformatted.sourceMap.manifestDigest).toBe(compilation.sourceMap.manifestDigest);
  expect(reformatted.sourceMap.sourceDigest).not.toBe(compilation.sourceMap.sourceDigest);
  expect(reformatted.project.units["main.algal"]?.cells[0]?.span.start.line).not.toBe(compilation.project.units["main.algal"]?.cells[0]?.span.start.line);
});

function compilationError(source: string, options?: Parameters<typeof compileSource>[1]): SourceError {
  try { compileSource(source, options); }
  catch (error) {
    expect(error).toBeInstanceOf(SourceError);
    return error as SourceError;
  }
  throw new Error("invalid source was accepted");
}

test("source errors preserve exact primary locations and bounded private source text", () => {
  const source = 'program root() -> json {\n  budget { max_agent_calls: 0 }\n  return unknown\n}';
  const error = compilationError(source);
  expect(error.code).toBe("PARSE_FAILED");
  expect(error.message).toBe("main.algal:3:10: unknown name unknown");
  expect(error.diagnostic).toEqual({ message: "unknown name unknown", source: "main.algal", imports: [],
    span: { start: { offset: source.indexOf("unknown"), line: 3, column: 10 }, end: { offset: source.indexOf("unknown") + 7, line: 3, column: 17 } },
  });
  expect(error.sourceText).toBe(source);
  expect(Object.keys(error)).not.toContain("sourceText");
  expect(JSON.stringify(error)).not.toContain("max_agent_calls");
  const frame = { source: "main.algal", path: "./child.algal", span: error.diagnostic.span };
  const bounded = new SourceError("example", error.diagnostic.span, { sourceText: "é".repeat(SOURCE_BOUNDS.maxSourceBytes), imports: Array(12).fill(frame) });
  expect(bounded.sourceText).toBeUndefined(); expect(bounded.diagnostic.imports).toHaveLength(8);
  expect(bounded.diagnostic.importsTruncated).toBe(true);
  frame.span.start.line = 99;
  expect(bounded.diagnostic.span.start.line).toBe(3); expect(bounded.diagnostic.imports[0]!.span.start.line).toBe(3);
  const maximum = new SourceError("example", bounded.diagnostic.span, { sourceText: "é".repeat(SOURCE_BOUNDS.maxSourceBytes / 2) });
  expect(Buffer.byteLength(maximum.sourceText!)).toBe(SOURCE_BOUNDS.maxSourceBytes);
});

test("nested compiler syntax, type, and budget errors identify the child and ordered import declarations", () => {
  const source = '// root\nimport middle from "./middle.algal"\nprogram root() -> json { budget { max_agent_calls: 0 } return 1 }';
  const middle = '// middle\n\nimport leaf from "./leaf.algal"\nprogram middle() -> json { budget { max_agent_calls: 0 } return 1 }';
  for (const [result, outputType, expected, endColumn] of [
    [")", "json", "unsupported expression", 11],
    ["42", "text", "program declares text", 12],
    ['generate "draft" using "context"', "text", "1 explicit effects", 2],
  ] as const) {
    const leaf = `program leaf() -> ${outputType} {\n  budget { max_agent_calls: 0 }\n  return ${result}\n}`;
    const error = compilationError(source, { entry: "entry.algal", modules: { "middle.algal": middle, "leaf.algal": leaf } });
    expect(error.diagnostic.source).toBe("leaf.algal"); expect(error.sourceText).toBe(leaf);
    expect(error.diagnostic.message).toContain(expected);
    expect(error.diagnostic.message).not.toContain("middle.algal");
    expect(error.message).toStartWith("leaf.algal:");
    expect(error.diagnostic.span.start.line).toBe(expected === "1 explicit effects" ? 1 : 3);
    expect(error.diagnostic.span.start.column).toBe(expected === "1 explicit effects" ? 1 : 10);
    expect(error.diagnostic.span.end.column).toBe(endColumn);
    expect(error.diagnostic.imports.map(frame => [frame.source, frame.path, frame.span.start.line, frame.span.start.column])).toEqual([
      ["entry.algal", "./middle.algal", 2, 1], ["middle.algal", "./leaf.algal", 3, 1],
    ]);
    for (const [index, text] of [source, middle].entries()) {
      const frame = error.diagnostic.imports[index]!;
      expect(text.slice(frame.span.start.offset, frame.span.end.offset)).toBe(index === 0 ? 'import middle from "./middle.algal"' : 'import leaf from "./leaf.algal"');
    }
  }
});

test("missing imports, invalid paths, and cycles identify the importing declaration", () => {
  const source = 'import middle from "./middle.algal"\nprogram root() -> json { budget { max_agent_calls: 0 } return 1 }';
  for (const [path, message] of [["./missing.algal", "not supplied"], ["../outside.algal", "escapes"], ["./entry.algal", "cycle"]] as const) {
    const declaration = `import child from ${JSON.stringify(path)}`;
    const middle = `// middle\n\n${declaration}\nprogram middle() -> json { budget { max_agent_calls: 0 } return 1 }`;
    const error = compilationError(source, { entry: "entry.algal", modules: { "middle.algal": middle } });
    expect(error.diagnostic.source).toBe("middle.algal"); expect(error.sourceText).toBe(middle);
    expect(error.diagnostic.message).toContain(message);
    expect(error.diagnostic.span.start).toEqual({ offset: middle.indexOf("import"), line: 3, column: 1 });
    expect(error.diagnostic.span.end).toEqual({ offset: middle.indexOf("import") + declaration.length, line: 3, column: declaration.length + 1 });
    expect(error.diagnostic.imports.map(frame => [frame.source, frame.path])).toEqual([["entry.algal", "./middle.algal"]]);
  }
  const rootMissing = compilationError(source, { entry: "entry.algal" });
  expect(rootMissing.diagnostic.source).toBe("entry.algal"); expect(rootMissing.diagnostic.imports).toEqual([]);
  expect(rootMissing.sourceText).toBe(source);
});

test("import depth errors preserve the rejecting declaration and a bounded ancestry even through cached modules", () => {
  const modules: Record<string, string> = {};
  for (let index = 0; index <= 9; index++) modules[`d${index}.algal`] = `${index < 9 ? `// depth\nimport child from "./d${index + 1}.algal"\n` : ""}program leaf() -> json { budget { max_agent_calls: 0 } return 1 }`;
  const error = compilationError(modules["d0.algal"]!, { entry: "d0.algal", modules });
  expect(error.diagnostic.source).toBe("d8.algal"); expect(error.sourceText).toBe(modules["d8.algal"]);
  expect(error.diagnostic.span.start.line).toBe(2); expect(error.diagnostic.span.start.column).toBe(1);
  expect(error.diagnostic.imports.map(frame => frame.source)).toEqual(Array.from({ length: 8 }, (_, index) => `d${index}.algal`));
  expect(error.diagnostic.importsTruncated).toBeUndefined();
  delete modules["d0.algal"]; delete modules["d9.algal"];
  modules["d8.algal"] = 'program leaf() -> json { budget { max_agent_calls: 0 } return 1 }';
  modules["detour.algal"] = 'import child from "./d1.algal"\nprogram detour() -> json { budget { max_agent_calls: 0 } return 1 }';
  const root = 'import first from "./d1.algal"\nimport later from "./detour.algal"\nprogram root() -> json { budget { max_agent_calls: 0 } return 1 }';
  const cached = compilationError(root, { modules });
  expect(cached.diagnostic.source).toBe("detour.algal"); expect(cached.sourceText).toBe(modules["detour.algal"]);
  expect(cached.diagnostic.span.start.line).toBe(1);
  expect(cached.diagnostic.imports.map(frame => [frame.source, frame.path, frame.span.start.line])).toEqual([["main.algal", "./detour.algal", 2]]);
});
