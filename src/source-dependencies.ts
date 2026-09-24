// Source dependency inspection: a presentation-only report of a closed source
// project's static program structure. It recompiles the original source, admits
// the executable closure through ordinary graph validation, and never executes
// a program, resolves a package, contacts a transport, or touches durable storage.
import { BOUNDS, manifestToJson, type Budgets, type OrganismManifest, type PortMap, type PortType } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { COMPILE_BOUNDS, compileOrganism, interfaceSignature, type CompiledOrganism } from "./graph";
import { builtinRegistry } from "./registry";
import { parseRunReceipt, receiptDigest, type RunOutcome, type RunReceipt } from "./run";
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
export type SourceDependencyOrigin = { readonly source: string; readonly cellId: string; readonly role: string; readonly span: SourceSpan };
export type SourceDependencyUnit = {
  readonly source: string;
  readonly sourceDigest: Digest;
  readonly manifestDigest: Digest;
  /** Reached from the entry through static calls; an imported but uncalled file is false. */
  readonly calledFromEntry: boolean;
};
export type SourceDependencyInterface = { readonly inputs: PortMap; readonly outputs: PortMap };
export type SourceDependencyModule = {
  readonly manifestDigest: Digest;
  readonly key: string;
  readonly name: string;
  /** Compiler-generated control structure with no source file of its own. */
  readonly generated: boolean;
  /** Reachable source files that compile to this executable digest. */
  readonly sources: readonly string[];
  readonly interface: SourceDependencyInterface;
  readonly budgets: Budgets;
  /** Model-effect kinds declared by this module, and by its whole static subtree. */
  readonly effects: { readonly direct: readonly SourceDependencyEffect[]; readonly transitive: readonly SourceDependencyEffect[] };
  /** Expanded static occurrences of this digest in the root's closure. */
  readonly occurrences: number;
};
export type SourceDependencyCaller = {
  /** Static path of the calling occurrence: composition cell IDs from the root. */
  readonly path: readonly string[];
  readonly cellId: string;
  readonly kind: "call" | "each";
  readonly maxItems?: number;
  readonly origin?: SourceDependencyOrigin;
};
export type SourceDependencyOccurrence = {
  readonly path: readonly string[];
  readonly depth: number;
  readonly manifestDigest: Digest;
  readonly generated: boolean;
  readonly source?: string;
  readonly caller?: SourceDependencyCaller;
};
export type SourceDependencyBundle = { readonly root: Digest; readonly manifests: number; readonly values: number; readonly reachable: number; readonly unreachable: number };
export type SourceDependencyExecutionOccurrence = {
  /** Static occurrence path; the list parallels `report.occurrences`. */
  readonly path: readonly string[];
  /** Distinct recorded invocations of this occurrence (one per `each` item). */
  readonly invocations: number;
  readonly cells: { readonly committed: number; readonly skipped: number; readonly failed: number; readonly suspended: number };
  /** Recorded cells that carried an effect digest (executor attempts). */
  readonly effectCells: number;
  /** Work of this occurrence's own cells, excluding child occurrences' work. */
  readonly selfWork: number;
  /** Work of this occurrence's own cells including every child occurrence. */
  readonly inclusiveWork: number;
};
export type SourceDependencyExecution = {
  readonly receiptDigest: Digest;
  readonly outcome: RunOutcome;
  /** Association and integrity with the recompiled root, not replay verification. */
  readonly verification: "digest-bound";
  readonly work: { readonly steps: number; readonly agentCalls: number; readonly units: number };
  readonly occurrences: readonly SourceDependencyExecutionOccurrence[];
  /** Recorded cells that no static occurrence owns; nothing is guessed for them. */
  readonly unattributed: { readonly cells: number; readonly work: number };
};
export type SourceDependencyReport = {
  readonly contract: typeof SOURCE_DEPENDENCY_CONTRACT;
  readonly entry: string;
  readonly sourceDigest: Digest;
  readonly rootManifestDigest: Digest;
  readonly compilerVersion: string;
  readonly profile: string;
  readonly analysis: { readonly maxAgentCalls: number; readonly requiredDepth: number };
  readonly counts: {
    readonly sourceUnits: number;
    readonly uniqueModules: number;
    readonly dependencyModules: number;
    readonly occurrences: number;
    readonly compositionEdges: number;
    readonly maxDepth: number;
  };
  readonly sourceUnits: readonly SourceDependencyUnit[];
  readonly modules: readonly SourceDependencyModule[];
  readonly occurrences: readonly SourceDependencyOccurrence[];
  readonly bundle?: SourceDependencyBundle;
  readonly execution?: SourceDependencyExecution;
};
export type SourceDependencyOptions = { sourceOptions?: SourceCompilerOptions; bundle?: unknown; receipt?: unknown };

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
/** UTF-8 length of `JSON.stringify(text)`, counted without building the
 * escaped text: quotes, backslash and C0 escapes, lone surrogates as `\uXXXX`. */
function jsonStringBytes(text: string): number {
  let bytes = 2;
  for (let index = 0; index < text.length; index++) {
    const unit = text.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c) bytes += 2;
    else if (unit < 0x20) bytes += unit === 8 || unit === 9 || unit === 10 || unit === 12 || unit === 13 ? 2 : 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; index++; } else bytes += 6;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) bytes += 6;
    else bytes += 3;
  }
  return bytes;
}
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
  // Every UTF-16 unit costs at least one escaped byte, so length screens first.
  const text = (value: string, what: string): number => {
    if (value.length > limits.maxStringBytes) budget(`${what} exceeds ${limits.maxStringBytes} bytes`);
    const encoded = jsonStringBytes(value);
    if (encoded - 2 > limits.maxStringBytes) budget(`${what} exceeds ${limits.maxStringBytes} bytes`);
    return encoded;
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
      case "string": charge(text(value, "string")); return value;
      case "object": break;
      default: return invalid(`unsupported ${typeof value} value`);
    }
    const target = value as object;
    if (depth >= limits.maxDepth) budget(`exceeds nesting depth ${limits.maxDepth}`);
    if (active.has(target)) return invalid("cyclic data");
    // Prototype and length are checked before any key list exists: listing the
    // keys of a huge array or typed array would allocate one string per index.
    const prototype = Object.getPrototypeOf(target) as unknown;
    active.add(target);
    try {
      if (Array.isArray(target)) {
        if (prototype !== Array.prototype) return invalid("arrays must be ordinary arrays");
        const lengthDescriptor = Object.getOwnPropertyDescriptor(target, "length");
        const length: unknown = lengthDescriptor !== undefined && Object.hasOwn(lengthDescriptor, "value") ? lengthDescriptor.value : undefined;
        if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) return invalid("array length is not an integer");
        if (length > limits.maxEntries) budget(`array exceeds ${limits.maxEntries} entries`);
        const keys = Reflect.ownKeys(target);
        if (keys.some(key => typeof key === "symbol")) return invalid("symbol-keyed properties are not JSON");
        if (keys.length !== length + 1) return invalid("arrays must be dense without extra properties");
        charge(2 + Math.max(0, length - 1));
        const out: JsonValue[] = [];
        for (let index = 0; index < length; index++) {
          out.push(visit(dataValue(Object.getOwnPropertyDescriptor(target, index), `array index ${index}`), depth + 1));
        }
        return out;
      }
      if (prototype !== Object.prototype && prototype !== null) return invalid("objects must be plain data objects");
      const keys = Reflect.ownKeys(target);
      if (keys.length > limits.maxEntries) budget(`object exceeds ${limits.maxEntries} entries`);
      if (keys.some(key => typeof key === "symbol")) return invalid("symbol-keyed properties are not JSON");
      const names = keys as string[];
      charge(2 + Math.max(0, names.length - 1));
      const out: JsonObject = {};
      for (const name of names) {
        charge(text(name, "key") + 1);
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
    const classification = Object.hasOwn(SOURCE_DEPENDENCY_CELL_KINDS, cell.kind)
      ? (SOURCE_DEPENDENCY_CELL_KINDS as Readonly<Record<string, string>>)[cell.kind] : undefined;
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

/** Attribute every recorded cell to the static occurrence that owns it by
 * walking the occurrence tree structurally: a composition cell descends, an
 * `each`/`repeat` cell must be followed by a canonical item marker inside its
 * declared bound, and the final segment names the owning cell. Paths that do
 * not resolve are counted as unattributed rather than guessed.
 */
function attributeReceipt(receipt: RunReceipt, occurrences: readonly SourceDependencyOccurrence[], manifests: ReadonlyMap<Digest, OrganismManifest>): SourceDependencyExecution {
  const indexByPath = new Map(occurrences.map((occurrence, index) => [occurrence.path.join("/"), index]));
  const invocations = occurrences.map(() => new Set<string>());
  const cells = occurrences.map(() => ({ committed: 0, skipped: 0, failed: 0, suspended: 0 }));
  const effectCells = occurrences.map(() => 0);
  const inclusive = occurrences.map(() => 0);
  const unattributed = { cells: 0, work: 0 };
  const resolve = (path: string): { index: number; prefix: string } | undefined => {
    const segments = path === "" ? [] : path.split("/");
    if (segments.length === 0) return undefined;
    let index = 0;
    let manifest = manifests.get(occurrences[0]!.manifestDigest)!;
    let cursor = 0;
    while (true) {
      const segment = segments[cursor]!;
      const cell = manifest.cells.find(candidate => candidate.id === segment);
      if (cell === undefined) return undefined;
      cursor++;
      if (cursor === segments.length) return { index, prefix: segments.slice(0, cursor - 1).join("/") };
      if (cell.kind !== "organism" && cell.kind !== "each" && cell.kind !== "repeat") return undefined;
      if (cell.kind === "each" || cell.kind === "repeat") {
        const marker = segments[cursor];
        const match = marker === undefined ? null : new RegExp(`^${cell.kind === "each" ? "i" : "r"}(0|[1-9][0-9]*)$`).exec(marker);
        if (match === null) return undefined;
        const item = Number(match[1]);
        if (!Number.isSafeInteger(item) || item >= (cell.kind === "each" ? cell.maxItems : cell.maxRounds)) return undefined;
        cursor++;
        if (cursor === segments.length) return undefined;
      }
      const next = indexByPath.get([...occurrences[index]!.path, cell.id].join("/"));
      if (next === undefined) return undefined;
      index = next;
      manifest = manifests.get(occurrences[index]!.manifestDigest)!;
    }
  };
  for (const [path, record] of Object.entries(receipt.cells)) {
    const owner = resolve(path);
    if (owner === undefined) {
      unattributed.cells++;
      unattributed.work += record.work;
      continue;
    }
    invocations[owner.index]!.add(owner.prefix);
    cells[owner.index]![record.status]++;
    if (record.effectDigest !== undefined) effectCells[owner.index]!++;
    inclusive[owner.index]! += record.work;
  }
  // A composition cell's recorded work includes its child invocation, so the
  // child's inclusive work is subtracted from the parent's self work.
  const self = [...inclusive];
  occurrences.forEach((occurrence, index) => {
    if (occurrence.caller === undefined) return;
    const parent = indexByPath.get(occurrence.caller.path.join("/"));
    if (parent !== undefined) self[parent]! -= inclusive[index]!;
  });
  return {
    receiptDigest: receipt.digest, outcome: receipt.outcome, verification: "digest-bound",
    work: { steps: receipt.work.steps, agentCalls: receipt.work.agentCalls, units: receipt.work.units },
    occurrences: occurrences.map((occurrence, index) => ({
      path: occurrence.path, invocations: invocations[index]!.size, cells: cells[index]!,
      effectCells: effectCells[index]!, selfWork: self[index]!, inclusiveWork: inclusive[index]!,
    })),
    unattributed,
  };
}

/** Build the report from original source. With `bundle`, the artifact must
 * carry the recompiled root and every reachable child under matching digests;
 * missing children are never repaired from source. With `receipt`, recorded
 * cells are attributed to static occurrences after the receipt's identity is
 * bound to the recompiled root. Returns a frozen report.
 */
export async function createSourceDependencyReport(source: string, options: SourceDependencyOptions = {}): Promise<SourceDependencyReport> {
  // Foreign data is read once and captured synchronously, before the first await.
  const supplied: unknown = options.bundle;
  const artifact = supplied === undefined ? undefined
    : boundedJsonSnapshot(supplied, SOURCE_DEPENDENCY_BOUNDS.bundle, "source dependencies: bundle");
  const suppliedReceipt: unknown = options.receipt;
  const receipt = suppliedReceipt === undefined ? undefined : parseRunReceipt(suppliedReceipt);
  if (receipt !== undefined && receiptDigest(receipt) !== receipt.digest) mismatch("receipt digest mismatch");
  const { compilation } = createSourceTrace(source, options.sourceOptions ?? {});
  const rootDigest = compilation.sourceMap.manifestDigest;
  if (receipt !== undefined && (receipt.manifestDigest !== rootDigest || receipt.manifestKey !== compilation.manifest.key)) {
    mismatch("source does not compile to this receipt's root manifest");
  }
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
  const execution = receipt === undefined ? undefined
    : attributeReceipt(receipt, occurrences, new Map([...nodes.entries()].map(([digest, node]) => [digest, node.manifest])));
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
    ...(execution === undefined ? {} : { execution }),
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
/** Optional fields are read as own data only, so a polluted prototype cannot add lines. */
function own<T extends object, K extends keyof T>(value: T, key: K): T[K] | undefined {
  return Object.hasOwn(value, key) ? value[key] : undefined;
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
  const bundle = own(report, "bundle");
  if (bundle !== undefined) {
    lines.push(`Bundle: root ${bundle.root} · ${bundle.manifests} manifests (${bundle.reachable} reachable, ${bundle.unreachable} unreachable) · ${bundle.values} values`);
  }
  const execution = own(report, "execution");
  if (execution !== undefined) {
    lines.push(`Execution: ${execution.outcome} · receipt ${execution.receiptDigest} · digest-bound (not replay verification) · ${execution.work.steps} steps · ${execution.work.agentCalls} executor attempts · ${execution.work.units} work units`);
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
    const caller = own(occurrence, "caller");
    const origin = caller === undefined ? undefined : own(caller, "origin");
    const maxItems = caller === undefined ? undefined : own(caller, "maxItems");
    const from = caller === undefined ? "" : ` ← ${origin === undefined ? `${caller.path.join("/") || "(root)"} (generated)` : originText(origin)} [${caller.kind}${maxItems === undefined ? "" : ` ≤${maxItems} items`}]`;
    lines.push(`  ${occurrence.path.join("/") || "(root)"}  ${names.get(occurrence.manifestDigest) ?? occurrence.manifestDigest}  ${own(occurrence, "source") ?? "(generated)"}${from}`);
  }
  if (execution !== undefined) {
    lines.push("", "Recorded execution");
    for (const entry of execution.occurrences) {
      const counts = [["committed", entry.cells.committed], ["skipped", entry.cells.skipped], ["failed", entry.cells.failed], ["suspended", entry.cells.suspended]] as const;
      lines.push(`  ${entry.path.join("/") || "(root)"}  ${entry.invocations} invocation${entry.invocations === 1 ? "" : "s"} · ${counts.filter(([, count]) => count > 0).map(([label, count]) => `${count} ${label}`).join(", ") || "no recorded cells"}${entry.effectCells ? ` · ${entry.effectCells} effect cell${entry.effectCells === 1 ? "" : "s"}` : ""} · self ${entry.selfWork} · inclusive ${entry.inclusiveWork}`);
    }
    lines.push(`  Unattributed: ${execution.unattributed.cells} cells · ${execution.unattributed.work} work`);
  }
  return `${printable(lines.join("\n"))}\n`;
}
