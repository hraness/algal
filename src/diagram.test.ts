import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createProgramDiagram, renderMermaid, renderSvg } from "./diagram";
import { parseOrganismManifest } from "./contract";
import { compileSource, type SourceCompilation } from "./source";
import { MemoryStore } from "./store";
import { builtinRegistry } from "./registry";
import { runOrganism, receiptDigest } from "./run";
import { compileOrganism } from "./graph";
import { scriptedExecutor } from "./effects";

const examples = join(import.meta.dir, "../examples");

async function sourceStore(compilation: SourceCompilation): Promise<MemoryStore> {
  const store = new MemoryStore();
  for (const module of compilation.modules) await store.putManifest(module);
  return store;
}

test("project annotations recompile imported content and resolve child signatures", async () => {
  const source = 'import child from "./child.algal" program caller(email: text) -> text { budget { max_agent_calls: 0 } return call child using { email: email } }';
  const child = 'program child(email: text) -> text { budget { max_agent_calls: 0 } return email }';
  const sourceOptions = { entry: "caller.algal", modules: { "child.algal": child } };
  const result = compileSource(source, sourceOptions);
  const store = new MemoryStore();
  for (const module of result.modules) await store.putManifest(module);
  const compiled = await compileOrganism(result.manifest, builtinRegistry(), store);
  const view = createProgramDiagram(result.manifest, { source, sourceOptions, ports: compiled.ports });
  expect(view.nodes.length).toBe(result.manifest.cells.length);
  expect(view.edges.length).toBe(result.manifest.edges.length);
  const call = view.nodes.find(node => node.kind === "organism")!;
  expect(call.source?.operation).toBe("call");
  expect(call.inputs.find(port => port.name === "email")?.type?.type).toBe("text");
  expect(renderSvg(view)).toContain("CALL");
  expect(() => createProgramDiagram(result.manifest, { source })).toThrow();
  expect(() => createProgramDiagram(result.manifest, { sourceOptions })).toThrow(/requires original source/);
  expect(() => createProgramDiagram(result.manifest, { source, sourceOptions: { ...sourceOptions,
    modules: { "child.algal": child.replace("return email", 'return "Changed"') } } })).toThrow(/does not compile to this manifest/);
});

test("all bundled manifest kinds render deterministically without executing effects", async () => {
  const files = (await readdir(examples)).filter(f => f.endsWith(".algal.json"));
  files.push("vm/release-review.algal.json", "vm/approval-wait.algal.json");
  const kinds = new Set<string>();
  for (const file of files) {
    const manifest = parseOrganismManifest(JSON.parse(await readFile(join(examples, file), "utf8")));
    const diagram = createProgramDiagram(manifest);
    expect(diagram.nodes).toHaveLength(manifest.cells.length);
    expect(diagram.edges).toHaveLength(manifest.edges.length);
    for (const node of diagram.nodes) {
      kinds.add(node.kind);
      expect(node.status).toBeUndefined();
    }
    const mermaid = renderMermaid(diagram);
    const svg = renderSvg(diagram);
    expect(mermaid).toBe(renderMermaid(createProgramDiagram(manifest)));
    expect(svg).toBe(renderSvg(createProgramDiagram(manifest)));
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain("undefined");
    expect(svg).not.toContain("NaN");
  }
  expect(kinds.size).toBe(17);
});

test("repeat limits, guards, capabilities and unknown external signatures stay explicit", async () => {
  const read = async (file: string) => createProgramDiagram(parseOrganismManifest(JSON.parse(await readFile(join(examples, file), "utf8"))));
  const refine = await read("refine.algal.json");
  expect(refine.nodes.find(n => n.kind === "repeat")?.details).toContain("At most 4 rounds");
  expect(refine.nodes.find(n => n.kind === "repeat")?.details).toContain("Limit reached: return last outputs");
  expect(refine.edges.filter(e => e.guard)).toHaveLength(2);
  expect(renderMermaid(refine)).toContain("ship");
  expect(renderMermaid(refine)).toContain("revise");
  expect(refine.nodes.find(n => n.id === "loop")?.inputs.some(p => p.type === null)).toBe(true);
  const wait = await read("vm/approval-wait.algal.json");
  expect(wait.nodes.some(n => n.outputs.some(p => p.type?.type === "cap"))).toBe(true);
  expect(renderSvg(wait)).not.toContain("next tick");
  const recovery = await read("recover.algal.json");
  expect(recovery.edges.some(e => e.kind === "failure")).toBe(true);
  expect(renderMermaid(recovery)).toContain("-.->");
});

test("untrusted strings cannot introduce SVG elements or Mermaid directives", () => {
  const malicious = '</text><script>alert(1)</script>" ]\nclick n0 "https://evil.test"\n%%{init:{}}%%';
  const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:escape", name: "<unsafe>\uffff\ufffe\ud800", cells: [{ id: "answer", kind: "agent", prompt: malicious, output: { kind: "text" } }] });
  const diagram = createProgramDiagram(manifest);
  const svg = renderSvg(diagram);
  const mermaid = renderMermaid(diagram);
  expect(svg).not.toContain("<script>");
  expect(svg).toContain("&lt;script&gt;");
  expect(svg).not.toContain("\uffff");
  expect(svg).not.toContain("\ufffe");
  expect(svg).not.toContain("\ud800");
  expect(mermaid).not.toContain("\nclick");
  expect(mermaid).not.toContain("%%{init");
  expect(mermaid).not.toContain("</text>");
});

test("receipt overlays are bound to exact artifacts and retain actual recorded states", async () => {
  const { manifest } = compileSource('program demo() -> text { budget { max_agent_calls: 0 } return "hello" }');
  const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [] });
  const view = createProgramDiagram(manifest, { receipt });
  expect(view.nodes[0]?.status).toBe("committed");
  expect(view.receipt?.verification).toBe("digest-bound");
  expect(renderSvg(view)).toContain("not replay-verified");
  const other = compileSource('program other() -> text { budget { max_agent_calls: 0 } return "hello" }').manifest;
  expect(() => createProgramDiagram(other, { receipt })).toThrow(/does not belong/);
  const tampered = structuredClone(receipt);
  tampered.cells.result!.status = "failed";
  expect(() => createProgramDiagram(manifest, { receipt: tampered })).toThrow(/digest mismatch/);
  // A self-consistent recording is not falsely described as verified truth.
  tampered.digest = receiptDigest(tampered);
  expect(renderMermaid(createProgramDiagram(manifest, { receipt: tampered }))).toContain("not replay-verified");
});

test("diagrams reject ambiguous IDs, missing endpoints and cycles", () => {
  const base = { contract: "algal.organism.v1", key: "organism:bad", name: "Bad", cells: [{ id: "a", kind: "fn", fn: "echo.v1" }, { id: "b", kind: "fn", fn: "echo.v1" }] };
  for (const edges of [
    [{ from: { cell: "a", port: "value" }, to: { cell: "missing", port: "value" } }],
    [{ from: { cell: "a", port: "value" }, to: { cell: "b", port: "value" } }, { from: { cell: "b", port: "value" }, to: { cell: "a", port: "value" } }],
  ]) expect(() => createProgramDiagram(parseOrganismManifest({ ...base, edges }))).toThrow();
  expect(() => createProgramDiagram(parseOrganismManifest({ ...base, cells: [base.cells[0], base.cells[0]] }))).toThrow(/duplicate/);
});

test("source annotations explain the source without changing exact graph or receipt identity", async () => {
  const source = await readFile(join(examples, "source/reply.algal"), "utf8");
  const { manifest, sourceMap } = compileSource(source);
  const plain = createProgramDiagram(manifest);
  const annotated = createProgramDiagram(manifest, { source });
  expect(annotated.manifestDigest).toBe(plain.manifestDigest);
  expect(annotated.source?.digest).toBe(sourceMap.sourceDigest);
  expect(annotated.nodes.map(({ source: _source, ...node }) => node)).toEqual(plain.nodes);
  expect(annotated.edges).toEqual(plain.edges);
  expect(annotated.nodes.every(node => node.source !== undefined)).toBe(true);
  const match = annotated.nodes.find(node => node.id === "b2-task")!;
  expect(match.source?.title).toContain("task");
  expect(match.source?.operation).toBe("match");
  const text = JSON.stringify(match.source);
  for (const word of ["intent", "help", "sales", "other", "support", "clarifying"]) expect(text).toContain(word);
  const svg = renderSvg(annotated, { compact: true });
  expect(svg).toContain("What does this email need?");
  expect(svg).toContain("ID b2-task");
  expect(svg).not.toContain("undefined");
  expect(renderMermaid(annotated)).toContain("ID b2-task");
  expect(createProgramDiagram(manifest, { source: `// formatting only\n${source}` }).source?.digest).not.toBe(annotated.source?.digest);
  expect(() => createProgramDiagram(manifest, { source: source.replace("budget { max_agent_calls: 2 }", "budget { max_agent_calls: 3 }") })).toThrow(/does not compile/);
});

test("source-derived content stays escaped and supports receipt overlays", async () => {
  const payload = '</text><script>bad()</script>\\nclick n0 "https://invalid.test"';
  const source = `program demo() -> text { budget { max_agent_calls: 0 } return ${JSON.stringify(payload)} }`;
  const { manifest } = compileSource(source);
  const receipt = await runOrganism({ manifest, store: new MemoryStore(), fns: builtinRegistry(), executors: [] });
  const diagram = createProgramDiagram(manifest, { source, receipt });
  expect(diagram.nodes[0]?.source).toBeDefined();
  expect(diagram.nodes[0]?.status).toBe("committed");
  expect(diagram.receipt?.digest).toBe(receipt.digest);
  expect(renderSvg(diagram)).not.toContain("<script>");
  expect(renderSvg(diagram)).toContain("&lt;script&gt;");
  expect(renderMermaid(diagram)).not.toContain("\nclick");
});

test("focused item diagrams retain exact child dataflow and use only that invocation's root receipt records", async () => {
  const child = `program child(data: json) -> text { budget { max_agent_calls: 1 }
    return if data.send { generate "Reply" using data.message } else { "Skipped reply" }
  }`;
  const source = `import child from "./child.algal" program batch(items: json) -> json {
    budget { max_agent_calls: 2 }
    return each child over data in items using {} max_items 2
  }`;
  const sourceOptions = { entry: "batch.algal", modules: { "child.algal": child } };
  const compilation = compileSource(source, sourceOptions);
  const each = compilation.manifest.cells.find(cell => cell.kind === "each")!;
  const childCompilation = compileSource(child);
  const model = childCompilation.manifest.cells.find(cell => cell.kind === "agent")!;
  const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { items: [{ send: true, message: "hello" }, { send: false, message: "unused" }] } },
    store: await sourceStore(compilation), fns: builtinRegistry(), executors: [scriptedExecutor({ [model.id]: "answer" })] });
  expect(receipt.outcome).toBe("complete");
  const before = JSON.stringify(receipt);
  // Deliberately incompatible root port data must never label the child.
  const ports = new Map([["input", { inputs: {}, outputs: { data: { type: "text" as const } } }]]);
  const views = [0, 1].map(index => createProgramDiagram(compilation.manifest, {
    source, sourceOptions, receipt, focus: `${each.id}/i${index}`, ports,
  }));
  expect(views[0]!.nodes.find(node => node.id === model.id)?.status).toBe("committed");
  expect(views[1]!.nodes.find(node => node.id === model.id)?.status).toBe("skipped");
  const plainChild = createProgramDiagram(childCompilation.manifest, { source: child });
  for (const [index, view] of views.entries()) {
    const prefix = `${each.id}/i${index}`;
    expect(view.manifestDigest).toBe(childCompilation.sourceMap.manifestDigest);
    expect(view.nodes.map(node => node.id)).toEqual(plainChild.nodes.map(node => node.id));
    expect(view.edges).toEqual(plainChild.edges);
    expect(view.nodes.find(node => node.id === "input")?.outputs.find(port => port.name === "data")?.type?.type).toBe("json");
    for (const node of view.nodes) expect(node.status).toBe(receipt.cells[`${prefix}/${node.id}`]?.status);
    expect(view.scope).toMatchObject({ rootManifestDigest: receipt.manifestDigest, rootReceiptDigest: receipt.digest,
      invocationPath: prefix, source: "child.algal", generated: false });
    expect(view.scope?.frames).toHaveLength(1);
    expect(view.scope?.frames[0]).toMatchObject({ path: prefix, kind: "each", index, manifestDigest: view.manifestDigest });
    expect(view.scope?.frames[0]?.location?.source).toBe("batch.algal");
    expect(view.receipt).toEqual({ digest: receipt.digest, outcome: receipt.outcome, verification: "digest-bound" });
    expect(view.source?.digest).toBe(childCompilation.sourceMap.sourceDigest);
    for (const rendered of [renderSvg(view), renderSvg(view, { header: false }), renderMermaid(view)]) {
      expect(rendered).toContain(prefix);
      expect(rendered).toContain("Root manifest:");
      expect(rendered).toContain(receipt.manifestDigest);
      expect(rendered).toContain(receipt.digest);
      expect(rendered).toContain("child.algal");
    }
  }
  expect(renderSvg(views[0]!).match(/aria-labelledby="([^"]+)"/)?.[1]).not.toBe(renderSvg(views[1]!).match(/aria-labelledby="([^"]+)"/)?.[1]);
  expect(JSON.stringify(receipt)).toBe(before);
});

test("focus is a bounded source invocation and receipt overlays require observed execution", async () => {
  const child = 'program child(value: text) -> text { budget { max_agent_calls: 0 } return value }';
  const source = `import child from "./child.algal" program batch(data: json) -> json {
    budget { max_agent_calls: 0 }
    return if data.run { each child over value in data.items using {} max_items 2 } else { [] }
  }`;
  const sourceOptions = { modules: { "child.algal": child } };
  const compilation = compileSource(source, sourceOptions);
  const each = compilation.manifest.cells.find(cell => cell.kind === "each")!;
  const staticView = createProgramDiagram(compilation.manifest, { source, sourceOptions, focus: `${each.id}/i1` });
  expect(staticView.nodes.every(node => node.status === undefined)).toBe(true);
  expect(staticView.receipt).toBeUndefined();
  expect(staticView.scope?.rootReceiptDigest).toBeUndefined();
  expect(renderSvg(staticView)).toContain("Static definition");
  expect(() => createProgramDiagram(compilation.manifest, { focus: `${each.id}/i0` })).toThrow(/requires original source/);
  for (const focus of ["unknown", each.id, `${each.id}/i2`, `${each.id}/i01`, `${each.id}/i-1`, `${each.id}/i0/result`, "../result", "x".repeat(1025)]) {
    expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions, focus }), focus).toThrow(/invalid focus/);
  }
  for (const data of [{ run: true, items: [] }, { run: false, items: ["never"] }, { run: true, items: ["one"] }]) {
    const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { data } }, store: await sourceStore(compilation), fns: builtinRegistry(), executors: [] });
    expect(receipt.outcome).toBe("complete");
    expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt, focus: `${each.id}/i1` })).toThrow(/was not recorded/);
    if (data.items.length === 0 || !data.run) expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt, focus: `${each.id}/i0` })).toThrow(/was not recorded/);
  }
  const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { data: { run: true, items: ["one"] } } }, store: await sourceStore(compilation), fns: builtinRegistry(), executors: [] });
  const focus = `${each.id}/i0`;
  expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions: { modules: { "child.algal": child.replace("return value", 'return "different"') } }, receipt, focus })).toThrow(/does not compile/);
  const childReceipt = await runOrganism({ manifest: compileSource(child).manifest, args: { input: { value: "one" } }, store: new MemoryStore(), fns: builtinRegistry(), executors: [] });
  expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt: childReceipt, focus })).toThrow(/does not belong/);
  const tampered = structuredClone(receipt);
  tampered.cells[`${focus}/result`]!.status = "failed";
  expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt: tampered, focus })).toThrow(/digest mismatch/);
});

test("focus keeps generated wrappers explicit until the exact inner call is selected", async () => {
  const child = 'program ping() -> text { budget { max_agent_calls: 1 } return generate "ping" using "known" }';
  const source = `import ping from "./ping.algal" program root(flag: json) -> text {
    budget { max_agent_calls: 1, max_depth: 2 }
    return if flag { call ping using {} } else { "skip" }
  }`;
  const sourceOptions = { modules: { "ping.algal": child } };
  const compilation = compileSource(source, sourceOptions);
  const call = compilation.manifest.cells.find(cell => cell.kind === "organism")!;
  const receipt = await runOrganism({ manifest: compilation.manifest, args: { input: { flag: true } }, store: await sourceStore(compilation), fns: builtinRegistry(), executors: [scriptedExecutor({ result: "pong" })] });
  const wrapper = createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt, focus: call.id });
  expect(wrapper.scope?.generated).toBe(true);
  expect(wrapper.scope?.source).toBeUndefined();
  expect(wrapper.source).toBeUndefined();
  expect(wrapper.nodes.every(node => node.source === undefined)).toBe(true);
  expect(wrapper.nodes.some(node => node.id === "call" && node.kind === "organism")).toBe(true);
  expect(wrapper.nodes.find(node => node.id === "call")?.outputs.find(port => port.name === "result")?.type?.type).toBe("text");
  expect(renderSvg(wrapper)).toContain("generated wrapper");
  const inner = createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt, focus: `${call.id}/call` });
  expect(inner.scope?.generated).toBe(false);
  expect(inner.scope?.source).toBe("ping.algal");
  expect(inner.scope?.frames).toHaveLength(2);
  expect(inner.manifestDigest).toBe(compileSource(child).sourceMap.manifestDigest);
  expect(inner.nodes.find(node => node.id === "result")?.status).toBe("committed");
  expect(inner.receipt?.digest).toBe(receipt.digest);
  expect(inner.manifestDigest).not.toBe(wrapper.manifestDigest);
});

test("an attempted child with a terminal budget failure retains root evidence without inventing cell states", async () => {
  const child = 'program child() -> text { budget { max_agent_calls: 0 } return "hello" }';
  const source = `import child from "./child.algal" program root() -> text {
    budget { max_agent_calls: 0, max_steps: 1 } return call child using {}
  }`;
  const sourceOptions = { modules: { "child.algal": child } };
  const compilation = compileSource(source, sourceOptions);
  const receipt = await runOrganism({ manifest: compilation.manifest, store: await sourceStore(compilation), fns: builtinRegistry(), executors: [] });
  expect(receipt.outcome).toBe("failed");
  expect(receipt.failure?.path).toBe("result/result");
  expect(Object.keys(receipt.cells).some(path => path.startsWith("result/"))).toBe(false);
  const view = createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt, focus: "result" });
  expect(view.nodes.every(node => node.status === undefined)).toBe(true);
  expect(view.receipt?.failure).toEqual(receipt.failure);
  expect(view.scope?.rootReceiptDigest).toBe(receipt.digest);
  expect(renderSvg(view, { header: false })).toContain("Root failure:");
  // A self-consistent recording still needs a structurally valid failure path.
  const invalid = structuredClone(receipt);
  invalid.failure!.path = "result/not-a-cell";
  invalid.digest = receiptDigest(invalid);
  expect(() => createProgramDiagram(compilation.manifest, { source, sourceOptions, receipt: invalid, focus: "result" })).toThrow(/was not recorded/);
});

test("identical child digests retain each call site's actual source origin and safely escaped breadcrumbs", () => {
  const first = 'program same(value: text) -> text { budget { max_agent_calls: 0 } return value }';
  const second = `// distinct original location\n\n${first}`;
  const path = "<unsafe>&child.algal";
  const source = `import first from "./first.algal" import second from ${JSON.stringify(`./${path}`)}
    program root(value: text) -> text { budget { max_agent_calls: 0 }
      let firstValue = call first using {value: value}
      return call second using {value: firstValue}
    }`;
  const sourceOptions = { entry: "root.algal", modules: { "first.algal": first, [path]: second } };
  const compilation = compileSource(source, sourceOptions);
  expect(compilation.modules).toHaveLength(1);
  const calls = compilation.manifest.cells.filter(cell => cell.kind === "organism");
  const one = createProgramDiagram(compilation.manifest, { source, sourceOptions, focus: calls[0]!.id });
  const two = createProgramDiagram(compilation.manifest, { source, sourceOptions, focus: calls[1]!.id });
  expect(one.manifestDigest).toBe(two.manifestDigest);
  expect(one.scope?.source).toBe("first.algal");
  expect(two.scope?.source).toBe(path);
  expect(one.source?.digest).not.toBe(two.source?.digest);
  expect(two.nodes.find(node => node.id === "result")?.source?.span.start.line).toBe(3);
  expect(one.nodes.find(node => node.id === "result")?.source?.span.start.line).toBe(1);
  expect(renderSvg(two)).not.toContain("<unsafe>");
  expect(renderSvg(two)).toContain("&lt;unsafe&gt;&amp;child.algal");
  expect(renderMermaid(two)).not.toContain("<unsafe>");
  expect(renderMermaid(two)).toContain("#60;unsafe#62;#38;child.algal");
});
