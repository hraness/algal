import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createProgramDiagram, renderMermaid, renderSvg } from "./diagram";
import { parseOrganismManifest } from "./contract";
import { compileSource } from "./source";
import { MemoryStore } from "./store";
import { builtinRegistry } from "./registry";
import { runOrganism, receiptDigest } from "./run";
import { compileOrganism } from "./graph";

const examples = join(import.meta.dir, "../examples");

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
