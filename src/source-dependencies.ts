// Source dependency inspection: a presentation-only report of a closed source
// project's static program structure. It recompiles the original source, admits
// the executable closure through ordinary graph validation, and never executes
// a program, resolves a package, contacts a transport, or touches durable storage.
import { BOUNDS, manifestToJson, type Budgets, type OrganismManifest, type PortMap, type PortType } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { COMPILE_BOUNDS, compileOrganism, interfaceSignature, type CompiledOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { parseBundle, unpackBundle } from "./bundle";
import { MemoryStore } from "./store-memory";
import type { SourceCallOrigin, SourceCompilerOptions, SourcePosition, SourceSpan } from "./source";
import { createSourceTrace } from "./source-trace";
import { compareUtf8, utf8Length } from "./utf8";
import { canonicalize, type JsonObject, type JsonValue } from "./values";

export const SOURCE_DEPENDENCY_CONTRACT = "algal.source-dependencies.v1" as const;
export const SOURCE_DEPENDENCY_BOUNDS = Object.freeze({
  /** Canonical JSON bytes of one completed report. */
  maxReportBytes: 8_388_608,
  /** Expanded static occurrences, including the root; equals graph admission. */
  maxOccurrences: COMPILE_BOUNDS.maxInstances,
  maxDepth: COMPILE_BOUNDS.maxDepth,
  /** Own-data snapshot limits for a supplied bundle value. */
  bundle: Object.freeze({
    maxBytes: BOUNDS.maxBundleBytes, maxDepth: 128, maxNodes: 1_000_000, maxEntries: 65_536, maxStringBytes: 1_048_576,
  }),
});
/** Cell kinds the source compiler emits today. Any other reachable kind is
 * rejected rather than assumed pure, including future compiler additions. */
export const SOURCE_DEPENDENCY_CELL_KINDS = Object.freeze({
  input: "pure", expr: "pure", agent: "effect", decide: "effect", organism: "composition", each: "composition",
} as const);
export type SourceDependencyEffect = "agent" | "decide";
export type SourceDependencyOrigin = { source: string; cellId: string; role: string; span: SourceSpan };
export type SourceDependencyUnit = {
  source: string;
  sourceDigest: Digest;
  manifestDigest: Digest;
  /** Reached from the entry through static calls; an imported but uncalled file is false. */
  calledFromEntry: boolean;
};
export type SourceDependencyInterface = { inputs: PortMap; outputs: PortMap };
export type SourceDependencyModule = {
  manifestDigest: Digest;
  key: string;
  name: string;
  /** Compiler-generated control structure with no source file of its own. */
  generated: boolean;
  /** Reachable source files that compile to this executable digest. */
  sources: string[];
  interface: SourceDependencyInterface;
  budgets: Budgets;
  /** Model-effect kinds declared by this module, and by its whole static subtree. */
  effects: { direct: SourceDependencyEffect[]; transitive: SourceDependencyEffect[] };
  /** Expanded static occurrences of this digest in the root's closure. */
  occurrences: number;
};
export type SourceDependencyCaller = {
  /** Static path of the calling occurrence: composition cell IDs from the root. */
  path: string[];
  cellId: string;
  kind: "call" | "each";
  maxItems?: number;
  origin?: SourceDependencyOrigin;
};
export type SourceDependencyOccurrence = {
  path: string[];
  depth: number;
  manifestDigest: Digest;
  generated: boolean;
  source?: string;
  caller?: SourceDependencyCaller;
};
export type SourceDependencyBundle = { root: Digest; manifests: number; values: number; reachable: number; unreachable: number };
export type SourceDependencyReport = {
  contract: typeof SOURCE_DEPENDENCY_CONTRACT;
  entry: string;
  sourceDigest: Digest;
  rootManifestDigest: Digest;
  compilerVersion: string;
  profile: string;
  analysis: { maxAgentCalls: number; requiredDepth: number };
  counts: {
    sourceUnits: number;
    uniqueModules: number;
    dependencyModules: number;
    occurrences: number;
    compositionEdges: number;
    maxDepth: number;
  };
  sourceUnits: SourceDependencyUnit[];
  modules: SourceDependencyModule[];
  occurrences: SourceDependencyOccurrence[];
  bundle?: SourceDependencyBundle;
};
export type SourceDependencyOptions = { sourceOptions?: SourceCompilerOptions; bundle?: unknown };

const reports = new WeakSet<SourceDependencyReport>();
function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
const mismatch = (message: string): never => { throw new AlgalError("DIGEST_MISMATCH", `source dependencies: ${message}`); };

type SnapshotLimits = typeof SOURCE_DEPENDENCY_BOUNDS.bundle;
/** Copy foreign data into fresh JSON under explicit limits before any parsing.
 * Only data properties are read; getters, `toJSON`, prototypes, symbols, and
 * unusual own properties are rejected rather than invoked or dropped. This is a
 * data boundary, not a sandbox: same-realm Proxy traps can still observe reads.
 */
function boundedJsonSnapshot(value: unknown, limits: SnapshotLimits, label: string): JsonValue {
  let nodes = 0;
  let bytes = 0;
  const active = new Set<object>();
  const budget = (message: string): never => { throw new AlgalError("BUDGET_EXHAUSTED", `${label}: ${message}`); };
  const invalid = (message: string): never => { throw new AlgalError("PARSE_FAILED", `${label}: ${message}`); };
  const charge = (count: number): void => {
    bytes += count;
    if (bytes > limits.maxBytes) budget(`exceeds ${limits.maxBytes} JSON bytes`);
  };
  const dataValue = (descriptor: PropertyDescriptor | undefined, what: string): unknown => {
    if (descriptor === undefined) return invalid(`${what} is missing`);
    if (!Object.hasOwn(descriptor, "value")) return invalid(`${what} is an accessor property`);
    if (!descriptor.enumerable) return invalid(`${what} is not enumerable`);
    return descriptor.value;
  };
  const visit = (value: unknown, depth: number): JsonValue => {
    if (++nodes > limits.maxNodes) budget(`exceeds ${limits.maxNodes} JSON nodes`);
    if (value === null) { charge(4); return null; }
    switch (typeof value) {
      case "boolean": charge(value ? 4 : 5); return value;
      case "number":
        if (!Number.isFinite(value)) return invalid("numbers must be finite");
        charge(String(value).length);
        return value === 0 ? 0 : value;
      case "string": {
        const encoded = utf8Length(JSON.stringify(value));
        if (encoded - 2 > limits.maxStringBytes) budget(`string exceeds ${limits.maxStringBytes} bytes`);
        charge(encoded);
        return value;
      }
      case "object": break;
      default: return invalid(`unsupported ${typeof value} value`);
    }
    const target = value as object;
    if (depth >= limits.maxDepth) budget(`exceeds nesting depth ${limits.maxDepth}`);
    if (active.has(target)) return invalid("cyclic data");
    const prototype = Object.getPrototypeOf(target) as unknown;
    const keys = Reflect.ownKeys(target);
    if (keys.some(key => typeof key === "symbol")) return invalid("symbol-keyed properties are not JSON");
    const names = keys as string[];
    active.add(target);
    try {
      if (Array.isArray(target)) {
        if (prototype !== Array.prototype) return invalid("arrays must be ordinary arrays");
        const lengthDescriptor = Object.getOwnPropertyDescriptor(target, "length");
        const length: unknown = lengthDescriptor !== undefined && Object.hasOwn(lengthDescriptor, "value") ? lengthDescriptor.value : undefined;
        if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) return invalid("array length is not an integer");
        if (length > limits.maxEntries) budget(`array exceeds ${limits.maxEntries} entries`);
        if (names.length !== length + 1) return invalid("arrays must be dense without extra properties");
        charge(2 + Math.max(0, length - 1));
        const out: JsonValue[] = [];
        for (let index = 0; index < length; index++) {
          out.push(visit(dataValue(Object.getOwnPropertyDescriptor(target, index), `array index ${index}`), depth + 1));
        }
        return out;
      }
      if (prototype !== Object.prototype && prototype !== null) return invalid("objects must be plain data objects");
      if (names.length > limits.maxEntries) budget(`object exceeds ${limits.maxEntries} entries`);
      charge(2 + Math.max(0, names.length - 1));
      const out: JsonObject = {};
      for (const name of names) {
        const encoded = utf8Length(JSON.stringify(name));
        if (encoded - 2 > limits.maxStringBytes) budget(`key exceeds ${limits.maxStringBytes} bytes`);
        charge(encoded + 1);
        const copied = visit(dataValue(Object.getOwnPropertyDescriptor(target, name), `property ${JSON.stringify(name)}`), depth + 1);
        // defineProperty keeps a foreign "__proto__" key as ordinary data.
        Object.defineProperty(out, name, { value: copied, enumerable: true, writable: true, configurable: true });
      }
      return out;
    } finally { active.delete(target); }
  };
  return visit(value, 0);
}

/** Classify a compiled module's cells for the report. Composition and pure
 * cells contribute nothing; effect kinds are returned sorted. Unknown kinds
 * are an error: the report never defaults a cell to pure.
 */
export function classifySourceDependencyCells(manifest: OrganismManifest): { effects: SourceDependencyEffect[] } {
  const effects = new Set<SourceDependencyEffect>();
  for (const cell of manifest.cells) {
    const classification = (SOURCE_DEPENDENCY_CELL_KINDS as Readonly<Record<string, string | undefined>>)[cell.kind];
    if (classification === undefined) {
      throw new AlgalError("MANIFEST_INVALID", `source dependencies: cell "${cell.id}" has kind "${cell.kind}", which this report does not classify`);
    }
    if (classification === "effect") effects.add(cell.kind as SourceDependencyEffect);
  }
  return { effects: [...effects].sort(compareUtf8) };
}

function position(value: SourcePosition): SourcePosition {
  for (const part of [value.offset, value.line, value.column]) {
    if (!Number.isSafeInteger(part) || part < 0) throw new AlgalError("INTERNAL", "source dependencies: source map position is not a nonnegative integer");
  }
  return { offset: value.offset, line: value.line, column: value.column };
}
function comparePaths(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const order = compareUtf8(left[index]!, right[index]!);
    if (order !== 0) return order;
  }
  return left.length - right.length;
}
function copyPorts(ports: PortMap): PortMap {
  const out: PortMap = {};
  for (const name of Object.keys(ports).sort(compareUtf8)) out[name] = structuredClone(ports[name]!);
  return out;
}

/** Build the report from original source. With `bundle`, the artifact must
 * carry the recompiled root and every reachable child under matching digests;
 * missing children are never repaired from source. Returns a frozen report.
 */
export async function createSourceDependencyReport(source: string, options: SourceDependencyOptions = {}): Promise<SourceDependencyReport> {
  // Foreign data is captured synchronously, before the first await.
  const artifact = options.bundle === undefined ? undefined
    : boundedJsonSnapshot(options.bundle, SOURCE_DEPENDENCY_BOUNDS.bundle, "source dependencies: bundle");
  const { compilation } = createSourceTrace(source, options.sourceOptions ?? {});
  const rootDigest = compilation.sourceMap.manifestDigest;
  const closure = new Set<Digest>([rootDigest, ...compilation.modules.map(module => digestCanonical(manifestToJson(module)))]);
  const store = new MemoryStore();
  let root: OrganismManifest;
  let installed: { manifests: number; values: number } | undefined;
  if (artifact === undefined) {
    for (const module of compilation.modules) await store.putManifest(module);
    await store.putManifest(compilation.manifest);
    root = compilation.manifest;
  } else {
    const bundle = parseBundle(artifact);
    if (bundle.root !== rootDigest) mismatch(`bundle root ${bundle.root} does not match the compiled root ${rootDigest}`);
    installed = await unpackBundle(bundle, store);
    const stored = await store.getManifest(rootDigest);
    if (stored === undefined) throw new AlgalError("STORE_MISS", "source dependencies: bundle root manifest is unavailable after installation");
    root = stored;
  }
  const compiled = await compileOrganism(root, builtinRegistry(), store);

  const { units, calls, entry } = compilation.project;
  const occurrences: SourceDependencyOccurrence[] = [];
  const nodes = new Map<Digest, CompiledOrganism>();
  const moduleSources = new Map<Digest, Set<string>>();
  const moduleOccurrences = new Map<Digest, number>();
  const calledSources = new Set<string>();
  let maxDepth = 0;
  const location = (sourceKey: string, cellId: string): SourceDependencyOrigin | undefined => {
    const mapped = units[sourceKey]?.cells.find(candidate => candidate.cellId === cellId);
    return mapped === undefined ? undefined
      : { source: sourceKey, cellId, role: mapped.role, span: { start: position(mapped.span.start), end: position(mapped.span.end) } };
  };
  // Traverse every composition cell of every occurrence: a shared helper called
  // twice is one module and two occurrences. Guarded arms and `each` children
  // are one static occurrence each; no dynamic expansion is estimated.
  const visit = (node: CompiledOrganism, digest: Digest, path: string[], depth: number, sourceKey: string | undefined, wrapper: SourceCallOrigin | undefined, caller: SourceDependencyCaller | undefined): void => {
    if (!closure.has(digest)) mismatch(`reachable module ${digest} is outside the compiled closure`);
    if (occurrences.length >= SOURCE_DEPENDENCY_BOUNDS.maxOccurrences) throw new AlgalError("BUDGET_EXHAUSTED", `source dependencies: more than ${SOURCE_DEPENDENCY_BOUNDS.maxOccurrences} static occurrences`);
    if (depth > SOURCE_DEPENDENCY_BOUNDS.maxDepth) throw new AlgalError("DEPTH_EXCEEDED", `source dependencies: static embedding exceeds depth ${SOURCE_DEPENDENCY_BOUNDS.maxDepth}`);
    occurrences.push({
      path, depth, manifestDigest: digest, generated: sourceKey === undefined,
      ...(sourceKey === undefined ? {} : { source: sourceKey }),
      ...(caller === undefined ? {} : { caller }),
    });
    maxDepth = Math.max(maxDepth, depth);
    moduleOccurrences.set(digest, (moduleOccurrences.get(digest) ?? 0) + 1);
    if (!nodes.has(digest)) nodes.set(digest, node);
    if (sourceKey !== undefined) {
      calledSources.add(sourceKey);
      const sources = moduleSources.get(digest) ?? new Set<string>();
      sources.add(sourceKey);
      moduleSources.set(digest, sources);
    }
    for (const cell of node.manifest.cells) {
      if (cell.kind !== "organism" && cell.kind !== "each") continue;
      const child = node.children.get(cell.id);
      if (child === undefined) throw new AlgalError("INTERNAL", `source dependencies: compiled child "${cell.id}" is missing`);
      const childDigest = asDigest(cell.manifest, `cell "${cell.id}".manifest`);
      let nextSource: string | undefined;
      let nextWrapper: SourceCallOrigin | undefined;
      const origin = sourceKey === undefined ? undefined : calls.find(candidate => candidate.source === sourceKey && candidate.cellId === cell.id);
      if (origin !== undefined) {
        if (origin.wrapper !== undefined) {
          if (origin.wrapper.manifestDigest !== childDigest) mismatch(`wrapper origin of "${cell.id}" does not match the declared child digest`);
          nextWrapper = origin;
        } else {
          if (origin.childManifestDigest !== childDigest) mismatch(`source origin of "${cell.id}" does not match the declared child digest`);
          nextSource = origin.childSource;
        }
      } else if (wrapper !== undefined) {
        if (cell.id !== wrapper.wrapper?.innerCellId || childDigest !== wrapper.childManifestDigest) mismatch(`generated wrapper path "${cell.id}" does not match compiler origins`);
        nextSource = wrapper.childSource;
      } else mismatch(`child source origin is unavailable for "${cell.id}"`);
      if (nextSource !== undefined && units[nextSource]?.manifestDigest !== childDigest) mismatch(`child source map of "${cell.id}" does not match the declared child digest`);
      const callerOrigin = sourceKey === undefined ? undefined : location(sourceKey, cell.id);
      const next: SourceDependencyCaller = {
        path, cellId: cell.id, kind: cell.kind === "organism" ? "call" : "each",
        ...(cell.kind === "each" ? { maxItems: cell.maxItems } : {}),
        ...(callerOrigin === undefined ? {} : { origin: callerOrigin }),
      };
      visit(child, childDigest, [...path, cell.id], depth + 1, nextSource, nextWrapper, next);
    }
  };
  visit(compiled, rootDigest, [], 0, entry, undefined, undefined);
  if (nodes.size !== closure.size) mismatch("reachable modules differ from the compiled closure");

  const direct = new Map<Digest, SourceDependencyEffect[]>();
  const transitive = new Map<Digest, Set<SourceDependencyEffect>>();
  const collect = (digest: Digest): Set<SourceDependencyEffect> => {
    const cached = transitive.get(digest);
    if (cached !== undefined) return cached;
    const node = nodes.get(digest)!;
    const own = classifySourceDependencyCells(node.manifest).effects;
    direct.set(digest, own);
    const reachable = new Set<SourceDependencyEffect>(own);
    for (const cell of node.manifest.cells) {
      if (cell.kind !== "organism" && cell.kind !== "each") continue;
      for (const effect of collect(asDigest(cell.manifest, `cell "${cell.id}".manifest`))) reachable.add(effect);
    }
    transitive.set(digest, reachable);
    return reachable;
  };
  const modules: SourceDependencyModule[] = [...nodes.entries()].map(([digest, node]) => {
    const effects = collect(digest);
    const ports = node.manifest.interface === undefined ? { inputs: {}, outputs: {} } : interfaceSignature(node);
    const sources = [...(moduleSources.get(digest) ?? [])].sort(compareUtf8);
    return {
      manifestDigest: digest, key: node.manifest.key, name: node.manifest.name, generated: sources.length === 0, sources,
      interface: { inputs: copyPorts(ports.inputs), outputs: copyPorts(ports.outputs) },
      budgets: { ...node.manifest.budgets },
      effects: { direct: direct.get(digest)!, transitive: [...effects].sort(compareUtf8) },
      occurrences: moduleOccurrences.get(digest)!,
    };
  }).sort((left, right) => compareUtf8(left.manifestDigest, right.manifestDigest));
  const sourceUnits: SourceDependencyUnit[] = Object.keys(units).sort(compareUtf8).map(key => ({
    source: key, sourceDigest: units[key]!.sourceDigest, manifestDigest: units[key]!.manifestDigest, calledFromEntry: calledSources.has(key),
  }));
  occurrences.sort((left, right) => comparePaths(left.path, right.path));
  const report: SourceDependencyReport = {
    contract: SOURCE_DEPENDENCY_CONTRACT, entry,
    sourceDigest: compilation.sourceMap.sourceDigest, rootManifestDigest: rootDigest,
    compilerVersion: compilation.sourceMap.compilerVersion, profile: compilation.sourceMap.profile,
    analysis: { maxAgentCalls: compilation.analysis.maxAgentCalls, requiredDepth: compilation.analysis.requiredDepth },
    counts: {
      sourceUnits: sourceUnits.length, uniqueModules: modules.length, dependencyModules: modules.length - 1,
      occurrences: occurrences.length, compositionEdges: occurrences.length - 1, maxDepth,
    },
    sourceUnits, modules, occurrences,
    ...(installed === undefined ? {} : { bundle: { root: rootDigest, manifests: installed.manifests, values: installed.values, reachable: modules.length, unreachable: installed.manifests - modules.length } }),
  };
  if (utf8Length(canonicalize(report as unknown as JsonValue)) > SOURCE_DEPENDENCY_BOUNDS.maxReportBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", `source dependencies: report exceeds ${SOURCE_DEPENDENCY_BOUNDS.maxReportBytes} bytes`);
  }
  freeze(report);
  reports.add(report);
  return report;
}

function printable(text: string): string {
  return [...text].map(char => {
    const code = char.codePointAt(0)!;
    const control = (code < 32 && char !== "\n") || (code >= 127 && code <= 159);
    const direction = code === 0x061c || code === 0x200e || code === 0x200f || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
    return control || direction || code === 0x2028 || code === 0x2029 ? "�" : char;
  }).join("");
}
function portText(port: PortType): string {
  const base = port.type === "choice" ? `choice(${port.labels ? port.labels.join("|") : "*"})`
    : port.type === "cap" ? `cap(${port.capability})` : port.type;
  return `${base}${port.many ? "[]" : ""}${port.optional ? "?" : ""}`;
}
function portsText(ports: PortMap): string {
  return Object.keys(ports).sort(compareUtf8).map(name => `${name}: ${portText(ports[name]!)}`).join(", ") || "none";
}
function originText(origin: SourceDependencyOrigin): string {
  return `${origin.source}:${origin.span.start.line}:${origin.span.start.column}`;
}

/** Render a report this module created. Foreign or modified report objects are
 * refused, so the renderer never presents unverified labels as compiler output.
 */
export function renderSourceDependencies(report: SourceDependencyReport): string {
  if (!reports.has(report)) throw new AlgalError("PARSE_FAILED", "source dependencies: only reports created by createSourceDependencyReport can be rendered");
  const names = new Map(report.modules.map(module => [module.manifestDigest, module.name]));
  const { counts, analysis } = report;
  const lines = [
    "ALGAL source dependencies · digest-bound static structure (not observed execution)",
    `Entry: ${report.entry}`, `Root: ${report.rootManifestDigest}`,
    `Source: ${report.sourceDigest} · compiler ${report.compilerVersion} (${report.profile})`,
    `Analysis: at most ${analysis.maxAgentCalls} executor attempts · required depth ${analysis.requiredDepth}`,
    `Counts: ${counts.sourceUnits} source files · ${counts.uniqueModules} modules (${counts.dependencyModules} dependencies) · ${counts.occurrences} occurrences · ${counts.compositionEdges} composition edges · depth ${counts.maxDepth}`,
  ];
  if (report.bundle !== undefined) {
    lines.push(`Bundle: root ${report.bundle.root} · ${report.bundle.manifests} manifests (${report.bundle.reachable} reachable, ${report.bundle.unreachable} unreachable) · ${report.bundle.values} values`);
  }
  lines.push("", "Source files");
  for (const unit of report.sourceUnits) lines.push(`  ${unit.source}  ${unit.manifestDigest}  ${unit.calledFromEntry ? "reachable from entry" : "imported but not called"}`);
  lines.push("", "Modules");
  for (const module of report.modules) {
    lines.push(`  ${module.manifestDigest}  ${module.name}${module.generated ? " (generated)" : ""} · ${module.sources.join(", ") || "no source file"} · ${module.occurrences} occurrence${module.occurrences === 1 ? "" : "s"}`);
    lines.push(`    inputs ${portsText(module.interface.inputs)} · outputs ${portsText(module.interface.outputs)}`);
    lines.push(`    budgets: attempts ${module.budgets.maxAgentCalls}, steps ${module.budgets.maxSteps}, depth ${module.budgets.maxDepth} · effects: ${module.effects.direct.join(", ") || "none"} · transitive: ${module.effects.transitive.join(", ") || "none"}`);
  }
  lines.push("", "Occurrences");
  for (const occurrence of report.occurrences) {
    const caller = occurrence.caller;
    const from = caller === undefined ? "" : ` ← ${caller.origin === undefined ? `${caller.path.join("/") || "(root)"}/${caller.cellId}` : originText(caller.origin)} [${caller.kind}${caller.maxItems === undefined ? "" : ` ≤${caller.maxItems} items`}]`;
    lines.push(`  ${occurrence.path.join("/") || "(root)"}  ${names.get(occurrence.manifestDigest) ?? occurrence.manifestDigest}  ${occurrence.source ?? "(generated)"}${from}`);
  }
  return `${printable(lines.join("\n"))}\n`;
}
