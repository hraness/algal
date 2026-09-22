// A presentation-only, exact view of a manifest. Edges are dependencies,
// never a wall-clock schedule; nested programs remain explicit boundaries.
import {
  manifestToJson,
  parseOrganismManifest,
  type Budgets,
  type Cell,
  type Edge,
  type OrganismManifest,
  type PortMap,
  type PortType,
} from "./contract";
import { digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { cellSignature, type CellPorts, type CompiledOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, receiptDigest, type CellRecord, type RunReceipt } from "./run";
import { type SourceCompilerOptions, type SourceSpan } from "./source";
import { createSourceTrace, resolveSourcePath, type SourceTraceFrame } from "./source-trace";
import { canonicalize } from "./values";

export type DiagramCategory = "input" | "pure" | "model" | "effect" | "tool" | "composition" | "state";
export type DiagramPort = { name: string; type: PortType | null };
export type DiagramNode = {
  id: string;
  kind: Cell["kind"];
  category: DiagramCategory;
  label: string;
  details: string[];
  inputs: DiagramPort[];
  outputs: DiagramPort[];
  interfaceInputs: string[];
  interfaceOutputs: string[];
  rank: number;
  source?: { title: string; operation: string; summary: string; details: string[]; span: SourceSpan };
  status?: CellRecord["status"];
  evidence?: { rounds?: number; items?: number; failure?: { code: string; message: string } };
};
export type DiagramEdge = {
  id: string;
  from: Edge["from"];
  to: Edge["to"];
  type: PortType | null;
  kind: "data" | "failure";
  guard?: Edge["guard"];
  label: string;
};
export type ProgramDiagram = {
  contract: "algal.diagram.v1";
  view: "exact";
  name: string;
  key: string;
  manifestDigest: Digest;
  budgets: Budgets;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  source?: { digest: Digest; compilerVersion: string; profile: string };
  /** A child view remains bound to the original root artifact and receipt.
   * Frames and module paths are reconstructed from the original source. */
  scope?: {
    rootManifestDigest: Digest;
    rootReceiptDigest?: Digest;
    invocationPath: string;
    source?: string;
    generated: boolean;
    frames: SourceTraceFrame[];
  };
  receipt?: { digest: Digest; outcome: RunReceipt["outcome"]; verification: "digest-bound"; failure?: NonNullable<RunReceipt["failure"]> };
};
export type DiagramOptions = {
  receipt?: RunReceipt;
  /** Original source is recompiled and matched to the manifest before any
   * source labels are displayed. Persisted annotations are never trusted. */
  source?: string;
  /** Explicit local module texts used to recompile the original project. */
  sourceOptions?: SourceCompilerOptions;
  /** Exact invocation prefix, such as replies-each/i1. Requires source;
   * with a receipt, the invocation must actually have been recorded. */
  focus?: string;
  /** Pass compileOrganism(...).ports for host/child signatures. Without it,
   * externally defined ports remain unknown, never guessed from names. */
  ports?: ReadonlyMap<string, CellPorts>;
};
export type SvgDiagramOptions = { compact?: boolean; header?: boolean };

const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const sortedEntries = <T>(o: Record<string, T>): [string, T][] => Object.entries(o).sort(([a], [b]) => compare(a, b));

function description(cell: Cell): Pick<DiagramNode, "category" | "label" | "details"> {
  switch (cell.kind) {
    case "input": return { category: "input", label: "INPUT", details: [] };
    case "const": return { category: "pure", label: "PURE · constant", details: [] };
    case "fn": return { category: "pure", label: "PURE · function", details: [cell.fn] };
    case "expr": return { category: "pure", label: "PURE · expression", details: ["Bounded algal.expr.v1"] };
    case "agent": return { category: "model", label: "MODEL · generate", details: [cell.prompt, ...(cell.tools?.length ? [`Admitted tools: ${cell.tools.join(", ")}`] : [])] };
    case "classifier": return { category: "model", label: "MODEL · classify", details: [`Choice: ${cell.output.labels.join(" | ")}`, cell.prompt] };
    case "decide": return { category: "model", label: "MODEL · decide", details: sortedEntries(cell.questions).map(([name, q]) => `${name}: ${q.type}${q.type === "choice" ? ` (${Object.keys(q.criteria).sort(compare).join(" | ")})` : ""}`) };
    case "gate": return { category: "effect", label: "EFFECT · gate", details: [`Choice: ${cell.output.labels.join(" | ")}`, cell.prompt] };
    case "tool": return { category: "tool", label: "TOOL · external operation", details: [cell.tool, "Authority and behavior supplied by host"] };
    case "recall": return { category: "effect", label: "EFFECT · semantic recall", details: [...(cell.k === undefined ? [] : [`Up to ${cell.k} results`]), ...(cell.rerank ? ["Recorded reranking decision"] : [])] };
    case "organism": return { category: "composition", label: "CALL · child program", details: [cell.manifest, ...(cell.via ? [`Via ${cell.via}`] : [])] };
    case "repeat": return { category: "composition", label: "REPEAT · bounded child", details: [
      `At most ${cell.maxRounds} rounds`,
      ...(cell.until ? [`Until ${cell.until.output}${cell.until.field === undefined ? "" : `.${cell.until.field}`} = ${JSON.stringify(cell.until.equals)}`] : []),
      ...sortedEntries(cell.carry ?? {}).map(([out, input]) => `Carry ${out} → ${input}`),
      "Limit reached: return last outputs",
      cell.manifest,
      ...(cell.via ? [`Via ${cell.via}`] : []),
    ] };
    case "each": return { category: "composition", label: "EACH · bounded children", details: [`Up to ${cell.maxItems} items over ${cell.over}`, "Outputs are per-item lists", cell.manifest, ...(cell.via ? [`Via ${cell.via}`] : [])] };
    case "store": return { category: "state", label: "STORE · content write", details: ["Payload → content-addressed ref"] };
    case "load": return { category: "state", label: "LOAD · content read", details: ["Content-addressed ref → payload"] };
    case "slot": return { category: "state", label: `SLOT · ${cell.mode.toUpperCase()}`, details: [cell.name, ...(cell.mode === "read" && cell.default !== undefined ? ["Default when empty"] : [])] };
    case "spawn": return { category: "composition", label: "SPAWN · proposed program", details: ["Parse, admit, run manifest as data", "Parent budgets and depth apply"] };
  }
}

function declaredSignature(cell: Cell): CellPorts | undefined {
  // These signatures require a host registry or admitted child closure.
  if (["tool", "organism", "repeat", "each"].includes(cell.kind)) return undefined;
  if (cell.kind === "fn" && !builtinRegistry().has(cell.fn)) return undefined;
  return cellSignature(cell, builtinRegistry(), new Map());
}

/** Resolve only signatures from the already compiled, closed source project.
 * This is structural inspection, not tool admission or graph execution. */
function sourcePorts(manifest: OrganismManifest, modules: OrganismManifest[]): ReadonlyMap<string, CellPorts> {
  const manifests = new Map<string, OrganismManifest>([manifest, ...modules].map(m => [digestCanonical(manifestToJson(m)), m]));
  const cache = new Map<Digest, CompiledOrganism>();
  const visiting = new Set<Digest>();
  const inspect = (m: OrganismManifest): CompiledOrganism => {
    const digest = digestCanonical(manifestToJson(m));
    const cached = cache.get(digest);
    if (cached) return cached;
    if (visiting.has(digest)) throw new AlgalError("MANIFEST_INVALID", "diagram: cyclic source closure");
    visiting.add(digest);
    const children = new Map<string, CompiledOrganism>();
    for (const cell of m.cells) {
      if (cell.kind !== "organism" && cell.kind !== "each" && cell.kind !== "repeat") continue;
      const child = manifests.get(cell.manifest);
      if (!child) throw new AlgalError("MANIFEST_INVALID", "diagram: child is missing from the compiled source closure");
      children.set(cell.id, inspect(child));
    }
    const ports = new Map(m.cells.map(cell => [cell.id, cellSignature(cell, builtinRegistry(), children)]));
    const result: CompiledOrganism = { manifest: m, ports, children, inbound: new Map(), resolvedVia: new Map() };
    visiting.delete(digest);
    cache.set(digest, result);
    return result;
  };
  return inspect(manifest).ports;
}

function portList(ports: PortMap | undefined, names: string[]): DiagramPort[] {
  return [...new Set([...Object.keys(ports ?? {}), ...names])].sort(compare)
    .map(name => ({ name, type: ports?.[name] ? structuredClone(ports[name]) : null }));
}

export function describeDiagramPort(port: PortType | null): string {
  if (!port) return "unknown";
  const base = port.type === "cap" ? `cap<${port.capability}>` : port.type;
  return `${base}${port.many ? "[]" : ""}${port.optional ? "?" : ""}`;
}

function guardLabel(guard: Edge["guard"]): string {
  if (!guard) return "";
  if ("expr" in guard) return `if expr ${canonicalize(guard.expr.program)}`;
  return `if ${guard.field === undefined ? "value" : `value.${guard.field}`} = ${JSON.stringify(guard.equals)}`;
}

/** Build a bounded, serializable view, without executing/admitting tools or
 * fetching nested manifests. External signatures can be supplied separately.
 * Receipt self-digests establish integrity, not replay or provider truth. */
export function createProgramDiagram(manifest: OrganismManifest, options: DiagramOptions = {}): ProgramDiagram {
  const root = parseOrganismManifest(manifest);
  const rootManifestDigest = digestCanonical(manifestToJson(root));
  if (options.source !== undefined && typeof options.source !== "string") {
    throw new AlgalError("MANIFEST_INVALID", "diagram: source must be text");
  }
  if (options.source === undefined && options.sourceOptions !== undefined) {
    throw new AlgalError("MANIFEST_INVALID", "diagram: sourceOptions requires original source");
  }
  if (options.focus !== undefined && options.source === undefined) {
    throw new AlgalError("MANIFEST_INVALID", "diagram: focus requires original source");
  }
  const trace = options.source === undefined ? undefined : createSourceTrace(options.source, options.sourceOptions);
  if (trace && trace.compilation.sourceMap.manifestDigest !== rootManifestDigest) {
    throw new AlgalError("MANIFEST_INVALID", "diagram: source does not compile to this manifest");
  }
  let receipt: RunReceipt | undefined;
  if (options.receipt) {
    receipt = parseRunReceipt(options.receipt);
    if (receipt.manifestDigest !== rootManifestDigest || receipt.manifestKey !== root.key) {
      throw new AlgalError("MANIFEST_INVALID", "diagram: receipt does not belong to this manifest");
    }
    if (receiptDigest(receipt) !== receipt.digest) throw new AlgalError("MANIFEST_INVALID", "diagram: receipt digest mismatch");
  }
  const resolved = trace && options.focus !== undefined ? resolveSourcePath(trace, options.focus, "invocation") : undefined;
  if (resolved && !resolved.ok) throw new AlgalError("MANIFEST_INVALID", `diagram: invalid focus: ${resolved.reason}`);
  const m = resolved?.ok ? resolved.manifest : root;
  const manifestDigest = resolved?.ok ? resolved.manifestDigest : rootManifestDigest;
  const sourceMap = resolved?.ok ? resolved.sourceMap : trace?.compilation.sourceMap;
  const invocationPath = resolved?.ok ? resolved.invocationPath : "";
  const receiptCellId = (cellId: string): string => invocationPath ? `${invocationPath}/${cellId}` : cellId;
  if (receipt && trace && invocationPath) {
    // A budget failure can enter a child before recording its first cell.
    // Resolve terminal/event paths through the same closed manifest walk;
    // matching arbitrary receipt prefixes would invent invocation evidence.
    const recordsCell = m.cells.some(cell => Object.hasOwn(receipt.cells, receiptCellId(cell.id)));
    const recordsBoundary = (path: string, mode: "cell" | "invocation"): boolean => {
      const found = resolveSourcePath(trace, path, mode);
      return found.ok && found.frames.some(frame => frame.path === invocationPath);
    };
    const recordsFailure = !recordsCell && receipt.failure?.path !== undefined && recordsBoundary(receipt.failure.path, "cell");
    const recordsEvent = !recordsCell && !recordsFailure && receipt.events.some(event => (event.kind === "run.start" || event.kind === "run.end")
      && event.path !== undefined && (event.path === invocationPath || event.path.startsWith(`${invocationPath}/`))
      && recordsBoundary(event.path, "invocation"));
    if (!recordsCell && !recordsFailure && !recordsEvent) {
      throw new AlgalError("MANIFEST_INVALID", "diagram: focus invocation was not recorded in this receipt");
    }
  }
  const ports = trace ? sourcePorts(m, trace.compilation.modules) : undefined;
  const ids = new Set(m.cells.map(c => c.id));
  if (ids.size !== m.cells.length) throw new AlgalError("MANIFEST_INVALID", "diagram: duplicate cell id");
  for (const edge of m.edges) {
    if (!ids.has(edge.from.cell) || !ids.has(edge.to.cell)) throw new AlgalError("MANIFEST_INVALID", "diagram: edge references missing cell");
  }
  for (const endpoint of [...Object.values(m.interface?.inputs ?? {}), ...Object.values(m.interface?.outputs ?? {})]) {
    if (!ids.has(endpoint.cell)) throw new AlgalError("MANIFEST_INVALID", "diagram: interface references missing cell");
  }
  const nodes: DiagramNode[] = [...m.cells].sort((a, b) => compare(a.id, b.id)).map(cell => {
    const signature = (!invocationPath ? options.ports?.get(cell.id) : undefined) ?? ports?.get(cell.id) ?? declaredSignature(cell);
    const recordId = receiptCellId(cell.id);
    const record = receipt && Object.hasOwn(receipt.cells, recordId) ? receipt.cells[recordId] : undefined;
    const ifaceIn = sortedEntries(m.interface?.inputs ?? {}).filter(([, p]) => p.cell === cell.id);
    const ifaceOut = sortedEntries(m.interface?.outputs ?? {}).filter(([, p]) => p.cell === cell.id);
    const inputs = portList(signature?.inputs, m.edges.filter(e => e.to.cell === cell.id).map(e => e.to.port));
    const outputs = portList(signature?.outputs, [
      ...m.edges.filter(e => e.from.cell === cell.id).map(e => e.from.port),
      ...ifaceIn.map(([, p]) => p.port), ...ifaceOut.map(([, p]) => p.port),
    ]);
    const origin = sourceMap?.cells.find(entry => entry.cellId === cell.id);
    return {
      id: cell.id, kind: cell.kind, ...description(cell), inputs, outputs,
      ...(origin?.annotation ? { source: { ...structuredClone(origin.annotation), span: structuredClone(origin.span) } } : {}),
      interfaceInputs: ifaceIn.map(([name, p]) => `${name} → ${p.port}`),
      interfaceOutputs: ifaceOut.map(([name, p]) => `${p.port} → ${name}`),
      rank: 0,
      ...(record ? { status: record.status, evidence: {
        ...(cell.kind === "repeat" && record.rounds !== undefined ? { rounds: record.rounds } : {}),
        ...(cell.kind === "each" && record.items !== undefined ? { items: record.items } : {}),
        ...(record.status === "failed" && record.failure ? { failure: { ...record.failure } } : {}),
      } } : {}),
    };
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges: DiagramEdge[] = m.edges.map((edge, index) => {
    const type = edge.on === "fail" ? { type: "json" as const } : byId.get(edge.from.cell)!.outputs.find(p => p.name === edge.from.port)?.type ?? null;
    return {
      id: `e${index}`, from: { ...edge.from }, to: { ...edge.to }, type,
      kind: edge.on === "fail" ? "failure" : "data",
      ...(edge.guard ? { guard: structuredClone(edge.guard) } : {}),
      label: `${edge.from.port} → ${edge.to.port} · ${edge.on === "fail" ? "failure {code, message}" : describeDiagramPort(type)}${edge.guard ? ` · ${guardLabel(edge.guard)}` : ""}`,
    };
  });
  // Topological ranks are layout only; they do not promise parallelism.
  const pending = new Set(nodes.map(n => n.id));
  while (pending.size) {
    let progressed = false;
    for (const node of nodes) {
      if (!pending.has(node.id)) continue;
      const incoming = edges.filter(e => e.to.cell === node.id);
      if (incoming.some(e => pending.has(e.from.cell))) continue;
      node.rank = incoming.length ? 1 + Math.max(...incoming.map(e => byId.get(e.from.cell)!.rank)) : 0;
      pending.delete(node.id);
      progressed = true;
    }
    if (!progressed) throw new AlgalError("MANIFEST_INVALID", "diagram: cyclic dependencies cannot be rendered as a DAG");
  }
  return {
    contract: "algal.diagram.v1", view: "exact", name: m.name, key: m.key,
    manifestDigest, budgets: { ...m.budgets }, nodes, edges,
    ...(sourceMap ? { source: { digest: sourceMap.sourceDigest, compilerVersion: sourceMap.compilerVersion, profile: sourceMap.profile } } : {}),
    ...(resolved?.ok ? { scope: {
      rootManifestDigest, ...(receipt ? { rootReceiptDigest: receipt.digest } : {}),
      invocationPath, ...(resolved.source === undefined ? {} : { source: resolved.source }),
      generated: resolved.generated, frames: structuredClone(resolved.frames),
    } } : {}),
    ...(receipt ? { receipt: { digest: receipt.digest, outcome: receipt.outcome, verification: "digest-bound" as const,
      ...(receipt.failure ? { failure: structuredClone(receipt.failure) } : {}),
    } } : {}),
  };
}

// XML and Mermaid have different escaping rules. Arbitrary strings never
// become IDs, syntax, links, CSS, or directives in either renderer.
function clean(value: string): string {
  // XML 1.0 characters only, including correctly paired astral code points.
  // Also remove directional overrides so labels cannot visually reorder code.
  return [...value].filter(char => {
    const cp = char.codePointAt(0)!;
    return (cp === 9 || cp === 10 || cp === 13 || (cp >= 32 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfffd) || (cp >= 0x10000 && cp <= 0x10ffff))
      && !(cp >= 0x7f && cp <= 0x9f) && !(cp >= 0x202a && cp <= 0x202e) && !(cp >= 0x2066 && cp <= 0x2069);
  }).join("").replace(/\s+/gu, " ").trim();
}
function xml(value: string): string {
  return clean(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function mermaid(value: string): string {
  // Mermaid decimal entities cannot terminate quoted labels. Encode every
  // grammar-significant character, including # to prevent injected entities.
  return clean(value).replace(/[^\p{L}\p{N} .,:=_/→·?()-]/gu, char => `#${char.codePointAt(0)!};`);
}
function clip(value: string, max: number): string {
  const chars = [...clean(value)];
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("")}…`;
}

const palette: Record<DiagramCategory, { fill: string; stroke: string }> = {
  input: { fill: "#eff6ff", stroke: "#2563eb" },
  pure: { fill: "#f1f5f9", stroke: "#64748b" },
  model: { fill: "#eef2ff", stroke: "#6366f1" },
  effect: { fill: "#fff7ed", stroke: "#c2410c" },
  tool: { fill: "#fff7ed", stroke: "#c2410c" },
  composition: { fill: "#f0fdfa", stroke: "#0f766e" },
  state: { fill: "#fdf4ff", stroke: "#a21caf" },
};

function scopeDetails(view: ProgramDiagram): string[] {
  if (!view.scope) return [];
  const scope = view.scope;
  const breadcrumb = ["Root", ...scope.frames.map(frame => {
    const title = frame.location?.annotation?.title ?? frame.kind;
    return `${title}${frame.index === undefined ? "" : ` [${frame.kind === "each" ? "item" : "round"} ${frame.index}]`}`;
  })].join(" → ");
  return [
    breadcrumb,
    `Invocation: ${scope.invocationPath || "root"}`,
    scope.generated ? "Source: generated wrapper (exact manifest)" : `Source: ${scope.source}`,
    `Root manifest: ${scope.rootManifestDigest}`,
    ...(scope.rootReceiptDigest ? [`Root receipt: ${scope.rootReceiptDigest} · ${view.receipt?.outcome ?? "recorded"} · digest-bound`] : ["Static definition · no execution status"]),
    ...(view.receipt?.failure ? [`Root failure: ${view.receipt.failure.code}${view.receipt.failure.path ? ` at ${view.receipt.failure.path}` : ""}`] : []),
  ];
}

export function renderMermaid(view: ProgramDiagram): string {
  const ids = new Map(view.nodes.map((node, index) => [node.id, `n${index}`]));
  const lines = ["flowchart TD", `  accTitle: ${mermaid(clip(view.name, 160))}`, "  accDescr: Exact manifest data dependencies. Layout does not imply timing or parallel execution.",
    `  limits["Limits: ${view.budgets.maxAgentCalls} executor attempts · ${view.budgets.maxSteps} steps · depth ${view.budgets.maxDepth}"]`,
  ];
  if (view.scope) lines.push(`  scope["${scopeDetails(view).map(mermaid).join("<br/>")}"]`);
  for (const node of view.nodes) {
    const labels = [nodeLabel(node), ...(node.source
      ? [node.source.title, `ID ${node.id}`, node.source.summary, ...node.source.details, sourceLocation(node)]
      : [node.id, ...node.details]).map(d => clip(d, 110)),
      ...node.interfaceInputs.map(p => `INPUT ${p}`), ...node.interfaceOutputs.map(p => `OUTPUT ${p}`),
      ...(node.status ? [`RECORDED ${node.status}`] : [])];
    lines.push(`  ${ids.get(node.id)}["${labels.map(mermaid).join("<br/>")}"]:::${node.category}`);
  }
  for (const edge of view.edges) {
    lines.push(`  ${ids.get(edge.from.cell)} ${edge.kind === "failure" ? "-.->" : "-->"}|"${mermaid(clip(edge.label, 150))}"| ${ids.get(edge.to.cell)}`);
  }
  for (const [category, colors] of Object.entries(palette)) lines.push(`  classDef ${category} fill:${colors.fill},stroke:${colors.stroke},color:#0f172a`);
  if (view.receipt) lines.push(`  %% Receipt ${view.receipt.digest}; digest-bound, not replay-verified. Missing cell statuses are unobserved.`);
  return `${lines.join("\n")}\n`;
}

type PositionedNode = { node: DiagramNode; x: number; y: number; width: number; height: number; lines: string[] };

/** Serializable geometry for a diagram: positioned node boxes (with their
 * rendered text lines) and routed edge paths. Shared by the SVG renderer and
 * by interactive viewers so every presentation draws the same graph. */
export type DiagramNodeLayout = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: DiagramCategory;
  status?: DiagramNode["status"];
  /** Node face fill. */
  fill: string;
  /** Category accent used for the side bar and kind label. */
  accent: string;
  /** Recorded-status-aware border color. */
  stroke: string;
  label: string;
  title: string;
  lines: string[];
};
export type DiagramEdgeLayout = {
  id: string;
  kind: DiagramEdge["kind"];
  path: string;
  labelX: number;
  labelY: number;
  label: string;
};
export type DiagramLayout = {
  width: number;
  height: number;
  margin: number;
  headerHeight: number;
  contentWidth: number;
  nodes: DiagramNodeLayout[];
  edges: DiagramEdgeLayout[];
};

/** Compute the layered layout used by `renderSvg`. Ranks are layout only;
 * they do not promise parallel or timed execution. */
export function layoutDiagram(view: ProgramDiagram, options: SvgDiagramOptions = {}): DiagramLayout {
  const compact = options.compact ?? false;
  const header = options.header ?? true;
  const nodeWidth = 336;
  const gapX = 72;
  const gapY = compact ? 68 : 86;
  const margin = 32;
  const scopeLines = scopeDetails(view);
  const mainHeaderHeight = header ? (view.receipt ? 154 : 132) : 20;
  const headerHeight = mainHeaderHeight + (scopeLines.length ? scopeLines.length * 19 + 12 : 0);
  const levels: DiagramNode[][] = [];
  for (const node of view.nodes) (levels[node.rank] ??= []).push(node);
  // Stable barycentric ordering reduces crossings without a layout dependency.
  const order = new Map<string, number>();
  for (const level of levels) {
    const barycenter = (node: DiagramNode): number => {
      const incoming = view.edges.filter(e => e.to.cell === node.id);
      return incoming.length ? incoming.reduce((sum, e) => sum + (order.get(e.from.cell) ?? 0), 0) / incoming.length : 0;
    };
    level.sort((a, b) => barycenter(a) - barycenter(b) || compare(a.id, b.id));
    level.forEach((node, i) => order.set(node.id, i));
  }
  const contentWidth = Math.max(1, ...levels.map(level => level.length)) * (nodeWidth + gapX) - gapX;
  const longEdges = view.edges.filter(edge => view.nodes.find(n => n.id === edge.to.cell)!.rank > view.nodes.find(n => n.id === edge.from.cell)!.rank + 1);
  const gutter = longEdges.length ? 44 + Math.min(longEdges.length, 8) * 12 : 0;
  const width = contentWidth + 2 * margin + gutter;
  let y = headerHeight;
  const placed: PositionedNode[] = [];
  const levelGaps: number[] = [];
  for (const [rank, level] of levels.entries()) {
    const row = level.map(node => {
      const lines = visibleDetails(node, compact);
      return { node, lines, height: 65 + lines.length * 17 };
    });
    const rowWidth = row.length * (nodeWidth + gapX) - gapX;
    row.forEach((entry, index) => placed.push({ ...entry, width: nodeWidth, x: margin + (contentWidth - rowWidth) / 2 + index * (nodeWidth + gapX), y }));
    // A separate label lane for each outgoing edge keeps dense fan-out and
    // long context wires readable. The bounds already cap the edge count.
    const outgoingCount = view.edges.filter(edge => level.some(node => node.id === edge.from.cell)).length;
    const levelGap = Math.max(gapY, 26 + outgoingCount * 19);
    levelGaps[rank] = levelGap;
    y += Math.max(0, ...row.map(n => n.height)) + levelGap;
  }
  const height = Math.max(headerHeight + 48, y - (levelGaps.at(-1) ?? gapY) + 50);
  const byId = new Map(placed.map(n => [n.node.id, n]));
  const edgeLayouts = view.edges.map(edge => {
    const from = byId.get(edge.from.cell)!;
    const to = byId.get(edge.to.cell)!;
    const outgoing = view.edges.filter(e => e.from.cell === edge.from.cell);
    const incoming = view.edges.filter(e => e.to.cell === edge.to.cell);
    const x1 = from.x + from.width * (outgoing.indexOf(edge) + 1) / (outgoing.length + 1);
    const x2 = to.x + to.width * (incoming.indexOf(edge) + 1) / (incoming.length + 1);
    const y1 = from.y + from.height;
    const y2 = to.y;
    const rankEdges = view.edges.filter(candidate => byId.get(candidate.from.cell)!.node.rank === from.node.rank);
    const rowBottom = Math.max(...placed.filter(box => box.node.rank === from.node.rank).map(box => box.y + box.height));
    const midY = rowBottom + 16 + rankEdges.indexOf(edge) * 19;
    const longIndex = longEdges.indexOf(edge);
    let path: string;
    if (longIndex >= 0) {
      const laneX = margin + contentWidth + 26 + (longIndex % 8) * 12;
      path = `M ${x1} ${y1} V ${midY} H ${laneX} V ${y2 - 16} H ${x2} V ${y2}`;
    } else path = `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
    // Put the guard first: clipping must never hide which branch is selected.
    const shownLabel = edge.guard && "equals" in edge.guard
      ? `when ${edge.guard.field ? `${edge.guard.field} = ` : ""}${JSON.stringify(edge.guard.equals)} · ${edge.from.port} → ${edge.to.port}`
      : edge.label;
    const label = clip(shownLabel, compact ? 44 : 58);
    const labelWidth = Math.min(contentWidth, [...label].length * 5.8 + 12);
    const centerX = longIndex >= 0 ? x1 : (x1 + x2) / 2;
    const labelX = Math.max(margin + labelWidth / 2, Math.min(width - margin - labelWidth / 2, centerX));
    return { id: edge.id, kind: edge.kind, path, labelX, labelY: midY, label };
  });
  return {
    width, height, margin, headerHeight, contentWidth,
    nodes: placed.map(box => {
      const colors = palette[box.node.category];
      const statusStroke = box.node.status === "failed" ? "#dc2626" : box.node.status === "suspended" ? "#d97706" : box.node.status === "committed" ? "#16a34a" : colors.stroke;
      return {
        id: box.node.id, x: box.x, y: box.y, width: box.width, height: box.height,
        category: box.node.category,
        ...(box.node.status ? { status: box.node.status } : {}),
        fill: colors.fill, accent: colors.stroke, stroke: statusStroke,
        label: clip(nodeLabel(box.node), 45),
        title: clip(box.node.source?.title ?? box.node.id, 31),
        lines: box.lines,
      };
    }),
    edges: edgeLayouts,
  };
}

function nodeLabel(node: DiagramNode): string {
  return node.source ? `${node.category.toUpperCase()} · ${node.source.operation.replaceAll("-", " ")}` : node.label;
}

function sourceLocation(node: DiagramNode): string {
  if (!node.source) return "";
  const { start, end } = node.source.span;
  return start.line === end.line ? `Source line ${start.line}` : `Source lines ${start.line}–${end.line}`;
}

function visibleDetails(node: DiagramNode, compact: boolean): string[] {
  let rows = node.source ? [node.source.summary, ...node.source.details].filter(Boolean)
    : node.details.map(detail => detail.startsWith("sha256:") ? `Child ${detail.slice(0, 19)}…` : detail);
  if (compact && node.source) {
    if (node.source.operation === "input" || node.source.operation === "generate") rows = node.source.details;
    if (node.source.operation === "decision-check") rows = ["Validate choice and probability metadata."];
    if (node.source.operation === "branch-merge") rows = ["Exactly one selected arm supplies the result."];
  }
  const limit = node.source ? (compact ? 5 : 8) : node.kind === "repeat" ? 8 : compact ? 2 : 5;
  const lines = rows.slice(0, limit);
  if (rows.length > limit) lines.push(`+ ${rows.length - limit} details in diagram JSON`);
  if (node.source) lines.push(`ID ${node.id} · ${sourceLocation(node)}`);
  for (const p of node.inputs.filter(p => p.type?.type === "cap")) lines.push(`Authority: ${p.name} · ${describeDiagramPort(p.type)}`);
  if (!compact) {
    if (node.inputs.length) lines.push(`in  ${node.inputs.map(p => `${p.name}: ${describeDiagramPort(p.type)}`).join(", ")}`);
    if (node.outputs.length) lines.push(`out  ${node.outputs.map(p => `${p.name}: ${describeDiagramPort(p.type)}`).join(", ")}`);
  }
  lines.push(...node.interfaceInputs.map(p => `INPUT ${p}`), ...node.interfaceOutputs.map(p => `OUTPUT ${p}`));
  if (node.evidence?.rounds !== undefined) lines.push(`Recorded rounds: ${node.evidence.rounds}`);
  if (node.evidence?.items !== undefined) lines.push(`Recorded items: ${node.evidence.items}`);
  if (node.evidence?.failure) lines.push(`Failure: ${node.evidence.failure.code}`);
  if (node.status) lines.push(`RECORDED ${node.status.toUpperCase()}`);
  return lines;
}

/** Portable SVG: no scripts, foreignObject, network assets, or graph runtime.
 * Full labels live in title elements; exact ports/guards remain in the view.
 * JSON view is the accessible unabridged companion for very dense programs. */
export function renderSvg(view: ProgramDiagram, options: SvgDiagramOptions = {}): string {
  const header = options.header ?? true;
  const layout = layoutDiagram(view, options);
  const margin = layout.margin;
  const width = layout.width;
  const height = layout.height;
  const mainHeaderHeight = header ? (view.receipt ? 154 : 132) : 20;
  const scopeLines = scopeDetails(view);
  const nodesById = new Map(view.nodes.map(node => [node.id, node]));
  const edgesById = new Map(view.edges.map(edge => [edge.id, edge]));
  const prefix = `algal-${view.manifestDigest.slice(7, 19)}${view.scope ? `-${digestCanonical({ root: view.scope.rootManifestDigest, path: view.scope.invocationPath }).slice(7, 19)}` : ""}`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc">`,
    `<title id="${prefix}-title">${xml(view.name)} — Algal program</title>`,
    `<desc id="${prefix}-desc">Exact data dependencies of ${xml(view.key)}. ${view.nodes.length} cells and ${view.edges.length} edges. Arrows carry named values; layout does not imply time or parallel execution. Dashed arrows carry failure records. ${view.receipt ? "Statuses are from a digest-bound root receipt, not replay-verified here. Missing statuses are unobserved." : "No execution status is implied."}${scopeLines.length ? ` ${xml(scopeLines.join(". "))}` : ""}</desc>`,
    `<defs><marker id="${prefix}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/></marker></defs>`,
    `<rect width="${width}" height="${height}" rx="16" fill="#ffffff"/>`,
    `<g font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fill="#0f172a">`,
  ];
  if (header) {
    out.push(`<text x="${margin}" y="34" font-size="20" font-weight="700"><title>${xml(view.name)}</title>${xml(clip(view.name, Math.floor((width - margin * 2) / 12)))}</text>`);
    out.push(`<text x="${margin}" y="56" font-size="11" fill="#475569">${xml(clip(`Exact manifest · ${view.manifestDigest}`, Math.floor((width - margin * 2) / 6)))}</text>`);
    out.push(`<text x="${margin}" y="78" font-size="12" fill="#475569">${xml(clip(`Limits: ${view.budgets.maxAgentCalls} executor calls · ${view.budgets.maxSteps} steps · depth ${view.budgets.maxDepth}`, Math.floor((width - margin * 2) / 6.3)))}</text>`);
    out.push(`<text x="${margin}" y="98" font-size="11" fill="#475569">Arrows are data dependencies; dashed = failure.</text>`);
    if (view.receipt) out.push(`<text x="${margin}" y="119" font-size="11" fill="#475569">${xml(clip(`Recorded ${view.scope ? "root " : ""}${view.receipt.outcome} · digest-bound, not replay-verified`, Math.floor((width - margin * 2) / 6)))}</text>`);
  }
  scopeLines.forEach((line, index) => out.push(`<text x="${margin}" y="${mainHeaderHeight + index * 19}" font-size="11" fill="#475569"><title>${xml(line)}</title>${xml(clip(line, Math.floor((width - margin * 2) / 6)))}</text>`));
  for (const edge of layout.edges) {
    const source = edgesById.get(edge.id)!;
    const labelWidth = Math.min(layout.contentWidth, [...edge.label].length * 5.8 + 12);
    out.push(`<path d="${edge.path}" fill="none" stroke="${edge.kind === "failure" ? "#b45309" : "#94a3b8"}" stroke-width="1.6"${edge.kind === "failure" ? ' stroke-dasharray="5 4"' : ""} marker-end="url(#${prefix}-arrow)"><title>${xml(source.label)}</title></path>`);
    out.push(`<rect x="${edge.labelX - labelWidth / 2}" y="${edge.labelY - 9}" width="${labelWidth}" height="16" rx="4" fill="#ffffff" fill-opacity="0.96"/>`);
    out.push(`<text x="${edge.labelX}" y="${edge.labelY + 2}" font-size="10" text-anchor="middle" fill="${edge.kind === "failure" ? "#92400e" : "#475569"}"><title>${xml(source.label)}</title>${xml(edge.label)}</text>`);
  }
  for (const box of layout.nodes) {
    const node = nodesById.get(box.id)!;
    const { x, y: top, width: w, height: h, lines } = box;
    out.push(`<g><title>${xml([node.label, node.id, ...(node.source ? [node.source.title, node.source.summary, ...node.source.details, sourceLocation(node)] : []), ...node.details, ...node.inputs.map(p => `in ${p.name}: ${describeDiagramPort(p.type)}`), ...node.outputs.map(p => `out ${p.name}: ${describeDiagramPort(p.type)}`), ...lines].join("; "))}</title>`);
    out.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="10" fill="${box.fill}" stroke="${box.stroke}" stroke-width="1.4"${node.status === "skipped" ? ' stroke-dasharray="5 4"' : ""}/>`);
    out.push(`<rect x="${x}" y="${top + 12}" width="4" height="${h - 24}" rx="2" fill="${box.accent}"/>`);
    out.push(`<text x="${x + 17}" y="${top + 23}" font-size="10" letter-spacing="0.5" font-weight="700" fill="${box.accent}">${xml(box.label)}</text>`);
    out.push(`<text x="${x + 17}" y="${top + 46}" font-size="16" font-weight="650">${xml(box.title)}</text>`);
    lines.forEach((line, i) => out.push(`<text x="${x + 17}" y="${top + 66 + i * 17}" font-size="11" fill="${line.startsWith("RECORDED ") ? box.stroke : "#475569"}"><title>${xml(line)}</title>${xml(clip(line, 47))}</text>`));
    out.push("</g>");
  }
  out.push("</g></svg>");
  return `${out.join("\n")}\n`;
}
