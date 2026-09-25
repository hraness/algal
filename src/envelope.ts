// Authority envelope: a static, parseable record (`algal.authority-envelope.v1`)
// answering two review questions for one manifest without running it — which
// capability classes one invocation can reach, and the most work it can do.
//
// The analyzer compiles the manifest's transitive child closure with the same
// registries a run would see, walks every statically embedded occurrence
// (organism, repeat, and each cells), and reports typed capability channels:
// producer ports that can emit a handle, consumer ports wired to a live
// producer, and model-declared tool channels whose supply is runtime data.
// Work bounds compose per-cell worst-case charges with per-occurrence
// invocation bounds under saturating arithmetic, then clamp to the budget
// ceilings the runtime enforces. A wired `spawn` cell marks the closure open:
// its program arrives as data, so nothing about it is enumerated and verdicts
// for classes the admitted registries can consume degrade to "unknown".
import { BOUNDS, manifestToJson, type Budgets, type Cell, type OrganismManifest, type PortMap, type PortType } from "./contract";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { AlgalError } from "./errors";
import { COMPILE_BOUNDS, compileOrganism, interfaceSignature, type CompiledOrganism } from "./graph";
import { builtinRegistry, type FnRegistry } from "./registry";
import { RECEIPT_BOUNDS, WORK } from "./run";
import { asCapabilityClass } from "./capabilities";
import { MemoryStore } from "./store-memory";
import type { Store } from "./store-contract";
import type { ToolRegistry } from "./tools";
import type { Transport } from "./transport-contract";
import { freezeDeep, printableText } from "./source-dependencies";
import { activationAnalysis } from "./source-dependencies-estimate";
import { compareUtf8, utf8Length } from "./utf8";
import {
  asArray,
  asInt,
  asObject,
  asString,
  canonicalize,
  noUnknownKeys,
  optField,
  reqField,
  type JsonValue,
} from "./values";

export const AUTHORITY_ENVELOPE_CONTRACT = "algal.authority-envelope.v1" as const;
export const AUTHORITY_ENVELOPE_BOUNDS = Object.freeze({
  /** Canonical JSON bytes of one completed report. */
  maxReportBytes: 8_388_608,
  /** Expanded occurrences, including the root; equals graph admission. */
  maxOccurrences: COMPILE_BOUNDS.maxInstances,
  maxDepth: COMPILE_BOUNDS.maxDepth,
  /** Invocation products saturate here: no receipt can record more cells. */
  maxInvocations: RECEIPT_BOUNDS.maxCells,
  /** Work-unit sums saturate at the largest integer a receipt can record. */
  maxUnits: Number.MAX_SAFE_INTEGER,
  /** Capability classes listed in one report, queried classes included. */
  maxCapabilities: 1_024,
  /** Producers or consumers listed for one class. */
  maxCapabilityUses: 4_096,
  /** Function, tool, and slot references listed. */
  maxRefs: 4_096,
  /** Capability classes one `capabilities` query option may name. */
  maxQueries: 256,
});

// ------------------------------------------------------------------ types ---

/** How a capability producer port can emit a handle of its class. */
export type EnvelopeProducerRole =
  /** An input cell's declared output — the caller supplies the handle as an
   * argument (the root's args, or a parent's delegation for a nested cell). */
  | "args"
  /** A host-registered `fn` cell's declared output — the function mints it. */
  | "fn"
  /** A `tool` cell's declared output — the host tool mints it. */
  | "tool"
  /** A composition cell's interface output — re-exported from inside a child. */
  | "delegated"
  /** A tool a model cell declares whose output lands in its tool log. */
  | "tool-result";

export type EnvelopeCapabilityProducer = {
  readonly path: readonly string[];
  readonly cell: string;
  readonly port: string;
  readonly role: EnvelopeProducerRole;
  /** Present on "tool-result" producers: the declared reference. */
  readonly tool?: string;
  /** Interface input names through which a nested input cell receives its
   * arguments — the delegation hop that feeds it. Absent at the root. */
  readonly interface?: readonly string[];
  /** The port can emit a class handle on some run: an input arg may be
   * supplied, the host signature mints it when its cell can activate, or a
   * delegated port traces to a live producer inside the child. */
  readonly live: boolean;
};

/** How a capability consumer port exercises — or merely receives — a handle. */
export type EnvelopeConsumerUse =
  /** A `tool` cell's input: the host tool dereferences the handle. */
  | "tool"
  /** A `fn` cell's input: the host function receives the handle. */
  | "fn"
  /** A model-declared tool's input: the model supplies the handle on a call. */
  | "model"
  /** A composition cell's input: authority delegates into a child occurrence;
   * exercise is recorded on the child's own consumers. */
  | "delegated"
  /** An effect cell's input (agent/classifier/gate/decide/recall): the handle
   * is delivered into the request context — a disclosure, not an exercise. */
  | "context"
  /** A pure cell's input (expr): the handle is data; the program may re-emit
   * the string into untyped outputs but cannot dereference it. */
  | "data";

export type EnvelopePortEndpoint = {
  readonly cell: string;
  readonly port: string;
  /** For edge feeds and model-visible producers: whether the endpoint can
   * emit on some run. */
  readonly live?: boolean;
  readonly tool?: string;
};

export type EnvelopeCapabilityConsumer = {
  readonly path: readonly string[];
  readonly cell: string;
  readonly port: string;
  readonly use: EnvelopeConsumerUse;
  /** Present on edge consumers when the declared port is optional. */
  readonly optional?: true;
  /** Present on "model" consumers: the declared tool/fn reference. */
  readonly tool?: string;
  /** Edge consumer: a live producer is wired. Model consumer: the declaring
   * cell can activate — supply is a context-data question the structure
   * cannot close. */
  readonly fed: boolean;
  /** Every producer endpoint wired to this port (edge consumers only). */
  readonly feeds?: readonly EnvelopePortEndpoint[];
  /** Typed-live producers visible to the model (its inputs in view, cells it
   * views, and outputs of the tools it declares). Model channels can also
   * receive a handle embedded in untyped context data — absence of visible
   * supply is not a denial. */
  readonly visible?: readonly EnvelopePortEndpoint[];
};

export type EnvelopeCapability = {
  readonly class: string;
  /** "can": a declared channel can exercise the class — a tool/fn input wired
   * to a live producer, or a model-declared consuming tool. "cannot": no
   * channel can exercise it and the closure is closed (or no admitted
   * signature consumes the class, even under spawn). "unknown": the closure
   * is open and spawned content could exercise it. */
  readonly verdict: "can" | "cannot" | "unknown";
  readonly producers: readonly EnvelopeCapabilityProducer[];
  readonly consumers: readonly EnvelopeCapabilityConsumer[];
};

export type EnvelopeUse = {
  readonly path: readonly string[];
  readonly cell: string;
  /** "cell" — an `fn`/`tool` cell references it; "model" — an agent or
   * classifier declares it for the model to call. */
  readonly via: "cell" | "model";
};

export type EnvelopeFunctionRef = {
  readonly ref: string;
  readonly cost: number;
  readonly uses: readonly EnvelopeUse[];
};

export type EnvelopeToolRef = {
  readonly ref: string;
  readonly effect: "read" | "write";
  readonly cost: number;
  readonly maxOutputBytes: number;
  readonly uses: readonly EnvelopeUse[];
};

export type EnvelopeSlotUse = {
  readonly name: string;
  readonly mode: "read" | "write";
  readonly uses: readonly { readonly path: readonly string[]; readonly cell: string }[];
};

export type EnvelopeCellWork = {
  readonly id: string;
  readonly kind: Cell["kind"];
  /** Worst-case work units one activation of this cell can charge. */
  readonly units: number;
  /** Worst-case effect attempts one activation can record. */
  readonly agentCalls: number;
  readonly fn?: string;
  readonly tool?: string;
  readonly manifest?: Digest;
  readonly via?: string;
  readonly maxRounds?: number;
  readonly maxItems?: number;
  readonly over?: string;
  readonly slot?: { readonly name: string; readonly mode: "read" | "write" };
  readonly spawn?: true;
  readonly attempts?: number;
  readonly turns?: number;
  readonly tools?: readonly string[];
};

export type EnvelopeModule = {
  readonly manifestDigest: Digest;
  readonly key: string;
  readonly name: string;
  readonly interface: { readonly inputs: PortMap; readonly outputs: PortMap };
  readonly budgets: Budgets;
  /** Occurrences of this digest across the closure. */
  readonly occurrences: number;
  /** Worst-case cost of one invocation of this manifest, children excluded. */
  readonly selfWork: { readonly steps: number; readonly agentCalls: number; readonly units: number };
  readonly cells: readonly EnvelopeCellWork[];
};

export type EnvelopeCaller = {
  /** Static path of the calling occurrence: composition cell IDs from root. */
  readonly path: readonly string[];
  readonly cellId: string;
  readonly kind: "organism" | "repeat" | "each";
  readonly maxItems?: number;
  readonly maxRounds?: number;
  readonly via?: string;
};

export type EnvelopeOccurrence = {
  readonly path: readonly string[];
  readonly depth: number;
  readonly manifestDigest: Digest;
  readonly key: string;
  readonly caller?: EnvelopeCaller;
  /** False when the occurrence is deeper than the root budgets' maxDepth:
   * a run can never reach it, so it contributes no work or authority. */
  readonly runnable: boolean;
  readonly invocations: {
    /** 1 when every completed root invocation that supplies inputs runs it. */
    readonly min: number;
    /** Most invocations any run can record: the product of enclosing limits,
     * saturating at the cap. */
    readonly max: number;
    readonly saturated?: true;
  };
  /** This occurrence's contribution to the structural work bound:
   * invocation max × the module's per-invocation self work. */
  readonly work: { readonly steps: number; readonly agentCalls: number; readonly units: number };
};

export type EnvelopeWorkBound = {
  /** The closed-structure worst case: invocation bounds × per-invocation
   * cell charges, saturated at the dimension cap. Under an open closure this
   * counts only statically known content. */
  readonly structural: number;
  /** The most one invocation can record: `structural` clamped to the ceiling
   * the runtime enforces — maxSteps, maxAgentCalls, or maxWork plus the
   * largest single-activation charge (the check trails the charge). */
  readonly bound: number;
  readonly saturated?: true;
  /** Present when a spawn cell can admit content this bound does not cover;
   * the budget ceiling still applies. */
  readonly open?: true;
};

export type EnvelopeOpenCell = {
  readonly path: readonly string[];
  readonly cell: string;
  readonly kind: "spawn";
  /** True when the cell can run: its `manifest` input is wired, its
   * occurrence is runnable, and depth admits the child it parses. */
  readonly possible: boolean;
};

export type AuthorityEnvelope = {
  readonly contract: typeof AUTHORITY_ENVELOPE_CONTRACT;
  /** Computed from the compiled closure alone — no cell ran. */
  readonly basis: "static-structure";
  readonly root: { readonly digest: Digest; readonly key: string; readonly name: string };
  /** Root budgets — the ceilings the runtime enforces on the whole run. */
  readonly budgets: Budgets;
  readonly counts: {
    readonly modules: number;
    readonly occurrences: number;
    readonly cells: number;
    readonly spawnCells: number;
    readonly capabilities: number;
    readonly functions: number;
    readonly tools: number;
    readonly slots: number;
  };
  readonly closure: {
    /** False when a possible spawn cell admits manifests this report cannot
     * enumerate. */
    readonly closed: boolean;
    readonly cells: readonly EnvelopeOpenCell[];
    /** Classes an admitted function or tool signature can produce. */
    readonly mintable: readonly string[];
    /** Classes an admitted function or tool signature can consume — what
     * spawned content could exercise given a handle. */
    readonly consumable: readonly string[];
  };
  readonly capabilities: readonly EnvelopeCapability[];
  readonly functions: readonly EnvelopeFunctionRef[];
  readonly tools: readonly EnvelopeToolRef[];
  readonly slots: readonly EnvelopeSlotUse[];
  readonly modules: readonly EnvelopeModule[];
  readonly occurrences: readonly EnvelopeOccurrence[];
  readonly work: {
    readonly steps: EnvelopeWorkBound;
    readonly agentCalls: EnvelopeWorkBound;
    readonly units: EnvelopeWorkBound;
    /** The largest units a single cell activation can charge — how far a
     * recorded run's units can exceed maxWork before the next check. */
    readonly activationCeiling: number;
  };
};

export type AuthorityEnvelopeOptions = {
  /** The host function registry; defaults to the builtin registry. */
  readonly fns?: FnRegistry;
  /** Manifest store for digest-referenced children; defaults to memory. */
  readonly store?: Store;
  /** Host tool registry — required when any cell references a tool. */
  readonly tools?: ToolRegistry;
  /** Named transports for resolving `via` cells' missing children. */
  readonly transports?: Record<string, Transport>;
  /** Capability classes to answer verdicts for even when undeclared. */
  readonly capabilities?: readonly string[];
};

// ------------------------------------------------------------- envelopes ---

const envelopes = new WeakSet<AuthorityEnvelope>();

function comparePaths(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const order = compareUtf8(left[index]!, right[index]!);
    if (order !== 0) return order;
  }
  return left.length - right.length;
}

const pathKey = (path: readonly string[]): string => path.join("/");
const endpointKey = (path: readonly string[], cell: string, port: string): string =>
  `${path.join("/")}|${cell}|${port}`;

type OccurrenceRecord = {
  readonly node: CompiledOrganism;
  readonly digest: Digest;
  readonly path: readonly string[];
  readonly depth: number;
  readonly caller?: {
    readonly parent: number;
    readonly cellId: string;
    readonly kind: "organism" | "repeat" | "each";
    readonly maxItems?: number;
    readonly maxRounds?: number;
    readonly via?: string;
  };
};

const COMPOSITION_KINDS = new Set(["organism", "repeat", "each"]);
const ENVELOPE_CELL_KINDS = new Set<string>([
  "input", "const", "fn", "expr", "agent", "classifier", "gate", "decide",
  "recall", "repeat", "each", "organism", "store", "load", "slot", "spawn",
  "tool",
]);

/** Build the envelope for an admitted manifest. Compiles the transitive child
 * closure with the supplied registries — resolution failures, unknown
 * functions or tools, and oversized closures fail the same way `check` fails.
 * No cell executes and no transport is contacted beyond the `via` fetches a
 * compile would perform. */
export async function createAuthorityEnvelope(
  manifest: OrganismManifest,
  options: AuthorityEnvelopeOptions = {},
): Promise<AuthorityEnvelope> {
  const fns = options.fns ?? builtinRegistry();
  const store = options.store ?? new MemoryStore();
  const tools = options.tools;
  const queried = new Set<string>();
  if (options.capabilities !== undefined) {
    if (options.capabilities.length > AUTHORITY_ENVELOPE_BOUNDS.maxQueries) {
      throw new AlgalError("PARSE_FAILED", `envelope: capabilities exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxQueries} queries`);
    }
    for (const cls of options.capabilities) queried.add(asCapabilityClass(cls, "envelope: capabilities"));
  }
  const compiled = await compileOrganism(manifest, fns, store, 0, options.transports, tools);
  const budgets = manifest.budgets;
  const rootDigest = digestCanonical(manifestToJson(manifest));

  // ------------------------------------------------- occurrences (DFS) ---
  const occurrences: OccurrenceRecord[] = [];
  const visit = (
    node: CompiledOrganism,
    digest: Digest,
    path: readonly string[],
    depth: number,
    caller: OccurrenceRecord["caller"],
  ): void => {
    if (occurrences.length >= AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences) {
      throw new AlgalError("BUDGET_EXHAUSTED", `envelope: more than ${AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences} static occurrences`);
    }
    if (depth > AUTHORITY_ENVELOPE_BOUNDS.maxDepth) {
      throw new AlgalError("DEPTH_EXCEEDED", `envelope: static embedding exceeds depth ${AUTHORITY_ENVELOPE_BOUNDS.maxDepth}`);
    }
    const index = occurrences.length;
    occurrences.push({ node, digest, path, depth, ...(caller === undefined ? {} : { caller }) });
    for (const cell of node.manifest.cells) {
      const child = node.children.get(cell.id);
      if (child === undefined) continue;
      if (cell.kind !== "organism" && cell.kind !== "repeat" && cell.kind !== "each") {
        throw new AlgalError("INTERNAL", `envelope: compiled child on non-composition cell "${cell.id}"`);
      }
      const kind = cell.kind;
      const via = node.resolvedVia.get(cell.id);
      visit(child, digestCanonical(manifestToJson(child.manifest)), [...path, cell.id], depth + 1, {
        parent: index, cellId: cell.id, kind,
        ...(cell.kind === "each" ? { maxItems: cell.maxItems } : {}),
        ...(cell.kind === "repeat" ? { maxRounds: cell.maxRounds } : {}),
        ...(via === undefined ? {} : { via }),
      });
    }
  };
  visit(compiled, rootDigest, [], 0, undefined);
  const indexByPath = new Map(occurrences.map((occurrence, index) => [pathKey(occurrence.path), index]));
  // An inner run is refused when its depth exceeds the root budgets'
  // maxDepth — shared budgets, so deeper occurrences can never execute.
  const runnable = occurrences.map(occurrence => occurrence.depth <= budgets.maxDepth);

  // ------------------------------------------------- invocation bounds ---
  const cap = AUTHORITY_ENVELOPE_BOUNDS.maxInvocations;
  const nodesByDigest = new Map<Digest, CompiledOrganism>();
  for (const occurrence of occurrences) if (!nodesByDigest.has(occurrence.digest)) nodesByDigest.set(occurrence.digest, occurrence.node);
  const analyses = new Map<Digest, ReturnType<typeof activationAnalysis>>();
  const analysis = (digest: Digest): ReturnType<typeof activationAnalysis> => {
    let found = analyses.get(digest);
    if (found === undefined) { found = activationAnalysis(nodesByDigest.get(digest)!); analyses.set(digest, found); }
    return found;
  };
  // `each` can always run zero items; `organism`/`repeat` run once per
  // activation — an occurrence's minimum needs the caller itself guaranteed.
  const kindGuaranteed = (cell: Cell): boolean => cell.kind === "organism" || cell.kind === "repeat";
  const bounds: { min: number; max: number; saturated: boolean; reliable: boolean }[] = [];
  occurrences.forEach((occurrence) => {
    const caller = occurrence.caller;
    if (caller === undefined) {
      bounds.push({ min: 1, max: 1, saturated: false, reliable: true });
      return;
    }
    const parent = bounds[caller.parent]!;
    const parentNode = occurrences[caller.parent]!.node;
    const callerCell = parentNode.manifest.cells.find(candidate => candidate.id === caller.cellId)!;
    const factor = callerCell.kind === "each" ? callerCell.maxItems : callerCell.kind === "repeat" ? callerCell.maxRounds : 1;
    let max = parent.max * factor;
    let saturated = parent.saturated;
    if (max > cap) { max = cap; saturated = true; }
    const parentAnalysis = analysis(occurrences[caller.parent]!.digest);
    // `each` can always run zero items; `organism`/`repeat` run once per
    // activation — the minimum needs the caller to always run and never ride
    // a failure route.
    const min = kindGuaranteed(callerCell) && parent.min === 1 && parent.reliable && parentAnalysis.always(caller.cellId) ? 1 : 0;
    bounds.push({ min, max, saturated, reliable: parent.reliable && !parentAnalysis.routed(caller.cellId) });
  });

  // ----------------------------------------------------- liveness oracle ---
  // live(oi, cell, port): a producer output port can emit its declared value
  // on some run of that occurrence. fed(oi, cell, port): a consumer input
  // port has a wired, live producer (or a repeat carry). activatable(oi,
  // cell): the cell can receive enough to run — every required input wired
  // (cap inputs additionally fed), and at least one input wired. All three
  // are existential "can" answers; a runtime miss is still possible.
  const liveMemo = new Map<string, boolean>();
  const liveActive = new Set<string>();
  const fedMemo = new Map<string, boolean>();
  const actMemo = new Map<string, boolean>();
  const inboundEdges = (oi: number, cellId: string, port: string): number[] =>
    (occurrences[oi]!.node.inbound.get(cellId) ?? [])
      .filter(entry => entry.port === port && occurrences[oi]!.node.manifest.edges[entry.edge]!.on !== "fail")
      .map(entry => entry.edge);

  const activatable = (oi: number, cellId: string): boolean => {
    if (!runnable[oi]) return false;
    const key = `${oi}|${cellId}`;
    const memo = actMemo.get(key);
    if (memo !== undefined) return memo;
    actMemo.set(key, false);
    const node = occurrences[oi]!.node;
    const sig = node.ports.get(cellId)!;
    const names = Object.keys(sig.inputs);
    let result = true;
    if (names.length > 0) {
      let wired = false;
      for (const port of names) {
        const pt = sig.inputs[port]!;
        const edges = inboundEdges(oi, cellId, port);
        if (edges.length > 0) wired = true;
        if (pt.optional === true) continue;
        if (edges.length === 0) { result = false; break; }
        if (pt.type === "cap" && !fed(oi, cellId, port)) { result = false; break; }
      }
      // The runtime skips a cell whose inputs deliver nothing at all.
      if (result && !wired) result = false;
    }
    actMemo.set(key, result);
    return result;
  };

  const fed = (oi: number, cellId: string, port: string): boolean => {
    if (!runnable[oi]) return false;
    const key = `${oi}|${cellId}|${port}`;
    const memo = fedMemo.get(key);
    if (memo !== undefined) return memo;
    fedMemo.set(key, false);
    const node = occurrences[oi]!.node;
    let result = inboundEdges(oi, cellId, port).some(index => {
      const edge = node.manifest.edges[index]!;
      return live(oi, edge.from.cell, edge.from.port);
    });
    const cell = node.manifest.cells.find(candidate => candidate.id === cellId)!;
    if (!result && cell.kind === "repeat" && cell.maxRounds > 1) {
      // A carried input is fed from the previous round's interface output —
      // a handle that exists once persists for the remaining rounds.
      const childIndex = indexByPath.get(pathKey([...occurrences[oi]!.path, cellId]));
      const iface = childIndex === undefined ? undefined : occurrences[childIndex]!.node.manifest.interface;
      if (iface !== undefined) {
        for (const [outName, inName] of Object.entries(cell.carry ?? {})) {
          if (inName !== port) continue;
          const target = iface.outputs[outName];
          if (target !== undefined && live(childIndex!, target.cell, target.port)) { result = true; break; }
        }
      }
    }
    fedMemo.set(key, result);
    return result;
  };

  const live = (oi: number, cellId: string, port: string): boolean => {
    if (!runnable[oi]) return false;
    const key = endpointKey(occurrences[oi]!.path, cellId, port);
    const memo = liveMemo.get(key);
    if (memo !== undefined) return memo;
    if (liveActive.has(key)) return false;
    liveActive.add(key);
    const occurrence = occurrences[oi]!;
    const cell = occurrence.node.manifest.cells.find(candidate => candidate.id === cellId)!;
    let result = false;
    switch (cell.kind) {
      case "input": {
        if (occurrence.caller === undefined) { result = true; break; }
        // Nested input: live iff a parent edge feeds the interface input (or
        // a repeat carry supplies it) — typed delegation preserves the class.
        const iface = occurrence.node.manifest.interface;
        const parent = occurrence.caller.parent;
        const callerCell = occurrences[parent]!.node.manifest.cells
          .find(candidate => candidate.id === occurrence.caller!.cellId)!;
        for (const [name, target] of Object.entries(iface?.inputs ?? {})) {
          if (target.cell !== cellId || target.port !== port) continue;
          if (fed(parent, occurrence.caller.cellId, name)) { result = true; break; }
          if (callerCell.kind === "repeat" && callerCell.maxRounds > 1) {
            for (const [outName, inName] of Object.entries(callerCell.carry ?? {})) {
              if (inName !== name) continue;
              const source = iface?.outputs[outName];
              if (source !== undefined && live(oi, source.cell, source.port)) { result = true; break; }
            }
          }
          if (result) break;
        }
        break;
      }
      case "fn":
      case "tool":
        // The host mints the handle when the cell can run.
        result = activatable(oi, cellId);
        break;
      case "organism":
      case "repeat":
      case "each": {
        if (!activatable(oi, cellId)) break;
        const childIndex = indexByPath.get(pathKey([...occurrence.path, cellId]));
        const target = childIndex === undefined
          ? undefined
          : occurrences[childIndex]!.node.manifest.interface?.outputs[port];
        result = target !== undefined && live(childIndex!, target.cell, target.port);
        break;
      }
      default:
        break;
    }
    liveActive.delete(key);
    liveMemo.set(key, result);
    return result;
  };

  // --------------------------------------------------- capability scan ---
  const capabilityEntries = new Map<string, { producers: EnvelopeCapabilityProducer[]; consumers: EnvelopeCapabilityConsumer[] }>();
  const touch = (cls: string) => {
    let entry = capabilityEntries.get(cls);
    if (entry === undefined) { entry = { producers: [], consumers: [] }; capabilityEntries.set(cls, entry); }
    return entry;
  };
  // Classes the admitted registries can mint or consume — what spawned
  // content could reach even though the program never names it.
  const mintable = new Set<string>();
  const consumable = new Set<string>();
  const signatureClasses = (ports: PortMap, into: Set<string>) => {
    for (const pt of Object.values(ports)) if (pt.type === "cap") into.add(pt.capability);
  };
  for (const entry of fns.values()) {
    signatureClasses(entry.signature.outputs, mintable);
    signatureClasses(entry.signature.inputs, consumable);
  }
  for (const entry of tools?.values() ?? []) {
    signatureClasses(entry.signature.outputs, mintable);
    signatureClasses(entry.signature.inputs, consumable);
  }
  const declaredSignature = (ref: string): { inputs: PortMap; outputs: PortMap } | undefined =>
    fns.get(ref)?.signature ?? tools?.get(ref)?.signature;

  const consumerUse = (cell: Cell): EnvelopeConsumerUse =>
    cell.kind === "fn" ? "fn" : cell.kind === "tool" ? "tool"
      : COMPOSITION_KINDS.has(cell.kind) ? "delegated"
      : cell.kind === "expr" ? "data" : "context";

  occurrences.forEach((occurrence, oi) => {
    for (const cell of occurrence.node.manifest.cells) {
      const sig = occurrence.node.ports.get(cell.id)!;
      for (const [port, pt] of Object.entries(sig.outputs)) {
        if (pt.type !== "cap") continue;
        const role: EnvelopeProducerRole = cell.kind === "input" ? "args"
          : cell.kind === "fn" ? "fn" : cell.kind === "tool" ? "tool" : "delegated";
        const entry = touch(pt.capability);
        if (entry.producers.length >= AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
          throw new AlgalError("BUDGET_EXHAUSTED", `envelope: capability "${pt.capability}" exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses} producers`);
        }
        const names = cell.kind === "input" && occurrence.caller !== undefined
          ? Object.entries(occurrence.node.manifest.interface?.inputs ?? {})
              .filter(([, target]) => target.cell === cell.id && target.port === port)
              .map(([name]) => name).sort(compareUtf8)
          : [];
        entry.producers.push({
          path: occurrence.path, cell: cell.id, port, role,
          ...(names.length > 0 ? { interface: names } : {}),
          live: live(oi, cell.id, port),
        });
      }
      for (const [port, pt] of Object.entries(sig.inputs)) {
        if (pt.type !== "cap") continue;
        const entry = touch(pt.capability);
        if (entry.consumers.length >= AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
          throw new AlgalError("BUDGET_EXHAUSTED", `envelope: capability "${pt.capability}" exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses} consumers`);
        }
        const feeds = inboundEdges(oi, cell.id, port).map(index => {
          const edge = occurrence.node.manifest.edges[index]!;
          return { cell: edge.from.cell, port: edge.from.port, live: live(oi, edge.from.cell, edge.from.port) };
        }).sort((left, right) => compareUtf8(left.cell, right.cell) || compareUtf8(left.port, right.port));
        entry.consumers.push({
          path: occurrence.path, cell: cell.id, port, use: consumerUse(cell),
          ...(pt.optional === true ? { optional: true as const } : {}),
          fed: fed(oi, cell.id, port),
          feeds,
        });
      }
      if (cell.kind !== "agent" && cell.kind !== "classifier") continue;
      // Declared tools are authority channels: the model may present a handle
      // it received through typed visibility or untyped context data.
      for (const ref of cell.tools ?? []) {
        const signature = declaredSignature(ref)!;
        for (const [port, pt] of Object.entries(signature.inputs)) {
          if (pt.type !== "cap") continue;
          const entry = touch(pt.capability);
          if (entry.consumers.length >= AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
            throw new AlgalError("BUDGET_EXHAUSTED", `envelope: capability "${pt.capability}" exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses} consumers`);
          }
          const visible: EnvelopePortEndpoint[] = [];
          for (const [name, ipt] of Object.entries(sig.inputs)) {
            if (ipt.type !== "cap" || ipt.capability !== pt.capability) continue;
            if (cell.view.inputs !== "*" && !cell.view.inputs.includes(name)) continue;
            if (fed(oi, cell.id, name)) visible.push({ cell: cell.id, port: name, live: true });
          }
          for (const cv of cell.view.cells ?? []) {
            const viewed = occurrence.node.ports.get(cv.cell)!;
            for (const [name, opt] of Object.entries(viewed.outputs)) {
              if (opt.type !== "cap" || opt.capability !== pt.capability) continue;
              if (cv.ports !== undefined && !cv.ports.includes(name)) continue;
              if (live(oi, cv.cell, name)) visible.push({ cell: cv.cell, port: name, live: true });
            }
          }
          for (const other of cell.tools ?? []) {
            const otherSig = declaredSignature(other)!;
            for (const [name, opt] of Object.entries(otherSig.outputs)) {
              if (opt.type === "cap" && opt.capability === pt.capability) {
                visible.push({ cell: cell.id, port: name, tool: other, live: true });
              }
            }
          }
          visible.sort((left, right) =>
            compareUtf8(left.cell, right.cell) || compareUtf8(left.port, right.port));
          entry.consumers.push({
            path: occurrence.path, cell: cell.id, port, use: "model", tool: ref,
            fed: activatable(oi, cell.id),
            ...(visible.length > 0 ? { visible } : {}),
          });
        }
        for (const [port, pt] of Object.entries(signature.outputs)) {
          if (pt.type !== "cap") continue;
          const entry = touch(pt.capability);
          if (entry.producers.length >= AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
            throw new AlgalError("BUDGET_EXHAUSTED", `envelope: capability "${pt.capability}" exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses} producers`);
          }
          entry.producers.push({
            path: occurrence.path, cell: cell.id, port, role: "tool-result", tool: ref,
            live: activatable(oi, cell.id),
          });
        }
      }
    }
  });
  for (const cls of queried) touch(cls);
  if (capabilityEntries.size > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities) {
    throw new AlgalError("BUDGET_EXHAUSTED", `envelope: exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities} capability classes`);
  }

  // ------------------------------------------------------ spawn closure ---
  const openCells: EnvelopeOpenCell[] = [];
  occurrences.forEach((occurrence, oi) => {
    for (const cell of occurrence.node.manifest.cells) {
      if (cell.kind !== "spawn") continue;
      openCells.push({
        path: occurrence.path, cell: cell.id, kind: "spawn",
        possible: runnable[oi] === true && occurrence.depth + 1 <= budgets.maxDepth && activatable(oi, cell.id),
      });
    }
  });
  openCells.sort((left, right) => comparePaths(left.path, right.path) || compareUtf8(left.cell, right.cell));
  const closed = !openCells.some(cell => cell.possible);
  const capabilityList: EnvelopeCapability[] = [...capabilityEntries.keys()].sort(compareUtf8).map(cls => {
    const entry = capabilityEntries.get(cls)!;
    entry.producers.sort((left, right) => comparePaths(left.path, right.path) || compareUtf8(left.cell, right.cell) || compareUtf8(left.port, right.port));
    entry.consumers.sort((left, right) => comparePaths(left.path, right.path) || compareUtf8(left.cell, right.cell) || compareUtf8(left.port, right.port));
    const exercised = entry.consumers.some(consumer =>
      consumer.fed && (consumer.use === "tool" || consumer.use === "fn" || consumer.use === "model"));
    return {
      class: cls,
      // Under an open closure, spawned content could exercise only a class
      // some admitted signature consumes — minted or smuggled handles still
      // need a consuming channel, and capability ports cannot pass through
      // spawn's json interface.
      verdict: exercised ? "can" as const
        : !closed && consumable.has(cls) ? "unknown" as const
        : "cannot" as const,
      producers: entry.producers,
      consumers: entry.consumers,
    };
  });

  // ---------------------------------------------------------- references ---
  const functionUses = new Map<string, EnvelopeUse[]>();
  const toolUses = new Map<string, EnvelopeUse[]>();
  for (const occurrence of occurrences) {
    for (const cell of occurrence.node.manifest.cells) {
      const use = { path: occurrence.path, cell: cell.id };
      if (cell.kind === "fn") (functionUses.get(cell.fn) ?? functionUses.set(cell.fn, []).get(cell.fn)!).push({ ...use, via: "cell" });
      else if (cell.kind === "tool") (toolUses.get(cell.tool) ?? toolUses.set(cell.tool, []).get(cell.tool)!).push({ ...use, via: "cell" });
      if (cell.kind === "agent" || cell.kind === "classifier") {
        for (const ref of cell.tools ?? []) {
          if (fns.has(ref)) (functionUses.get(ref) ?? functionUses.set(ref, []).get(ref)!).push({ ...use, via: "model" });
          else (toolUses.get(ref) ?? toolUses.set(ref, []).get(ref)!).push({ ...use, via: "model" });
        }
      }
    }
  }
  const sortUses = (uses: EnvelopeUse[]) =>
    uses.sort((left, right) => comparePaths(left.path, right.path) || compareUtf8(left.cell, right.cell) || compareUtf8(left.via, right.via));
  const functions: EnvelopeFunctionRef[] = [...functionUses.keys()].sort(compareUtf8).map(ref => ({
    ref, cost: fns.get(ref)!.signature.cost, uses: sortUses(functionUses.get(ref)!),
  }));
  const toolRefs: EnvelopeToolRef[] = [...toolUses.keys()].sort(compareUtf8).map(ref => {
    const signature = tools?.get(ref)?.signature;
    if (signature === undefined) {
      throw new AlgalError("INTERNAL", `envelope: tool "${ref}" used but not in the registry`);
    }
    return { ref, effect: signature.effect, cost: signature.cost, maxOutputBytes: signature.maxOutputBytes, uses: sortUses(toolUses.get(ref)!) };
  });
  // Group slot uses by (name, mode) — a name may be read in one occurrence
  // and written in another.
  const slotsByKey = new Map<string, { name: string; mode: "read" | "write"; uses: { path: readonly string[]; cell: string }[] }>();
  occurrences.forEach(occurrence => {
    for (const cell of occurrence.node.manifest.cells) {
      if (cell.kind !== "slot") continue;
      const key = `${cell.name}|${cell.mode}`;
      let entry = slotsByKey.get(key);
      if (entry === undefined) { entry = { name: cell.name, mode: cell.mode, uses: [] }; slotsByKey.set(key, entry); }
      entry.uses.push({ path: occurrence.path, cell: cell.id });
    }
  });
  const slots: EnvelopeSlotUse[] = [...slotsByKey.values()]
    .sort((left, right) => compareUtf8(left.name, right.name) || compareUtf8(left.mode, right.mode))
    .map(entry => ({ name: entry.name, mode: entry.mode, uses: entry.uses.sort((a, b) => comparePaths(a.path, b.path) || compareUtf8(a.cell, b.cell)) }));
  if (functions.length > AUTHORITY_ENVELOPE_BOUNDS.maxRefs || toolRefs.length > AUTHORITY_ENVELOPE_BOUNDS.maxRefs || slots.length > AUTHORITY_ENVELOPE_BOUNDS.maxRefs) {
    throw new AlgalError("BUDGET_EXHAUSTED", `envelope: exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxRefs} references`);
  }

  // ------------------------------------------------------------ work -------
  const signatureCharge = (ref: string): number => {
    const fn = fns.get(ref);
    if (fn !== undefined) return fn.signature.cost;
    const tool = tools?.get(ref);
    return tool === undefined ? 0 : tool.signature.cost + tool.signature.maxOutputBytes;
  };
  const cellWork = (node: CompiledOrganism, cell: Cell): { units: number; agentCalls: number } => {
    let units = WORK.activation;
    let agentCalls = 0;
    // An expr guard evaluates at most once per edge per invocation.
    for (const entry of node.inbound.get(cell.id) ?? []) {
      const guard = node.manifest.edges[entry.edge]!.guard;
      if (guard !== undefined && "expr" in guard) units += BOUNDS.maxExprFuel;
    }
    const effective = cell.kind === "agent" || cell.kind === "classifier"
      || cell.kind === "gate" || cell.kind === "decide" || cell.kind === "recall";
    const maxCtx = (effective ? cell.budget?.maxContextBytes : undefined) ?? budgets.maxContextBytes;
    const maxOut = (effective ? cell.budget?.maxOutputBytes : undefined) ?? budgets.maxOutputBytes;
    const perCall = WORK.effectBase + maxCtx * WORK.perContextByte + maxOut * WORK.perOutputByte;
    const attempts = (effective ? cell.retry?.attempts : undefined) ?? 1;
    switch (cell.kind) {
      case "fn": units += fns.get(cell.fn)!.signature.cost; break;
      case "expr": units += BOUNDS.maxExprFuel; break;
      case "tool": { const signature = tools!.get(cell.tool)!.signature; units += signature.cost + signature.maxOutputBytes; break; }
      case "store": case "load": units += BOUNDS.maxBlobBytes; break;
      case "slot": if (cell.mode === "write") units += BOUNDS.maxBlobBytes; break;
      case "recall": {
        // query fuel + attempts for the recall effect + attempts for the
        // optional rerank decide effect
        const calls = attempts * (cell.rerank === undefined ? 1 : 2);
        units += BOUNDS.maxExprFuel + calls * perCall;
        agentCalls += calls;
        break;
      }
      case "agent": case "classifier": case "gate": case "decide": {
        const declared = cell.kind === "gate" || cell.kind === "decide" ? undefined : cell.tools;
        const turns = cell.kind === "decide" ? 1 : cell.budget?.maxTurns ?? (declared?.length ? 8 : 1);
        let calls = turns * attempts;
        // A non-elide compaction can fire every turn once the log grows.
        if (cell.kind === "agent" && cell.compact !== undefined && cell.compact.mode !== "elide") calls += turns;
        let toolCharge = 0;
        for (const ref of declared ?? []) toolCharge = Math.max(toolCharge, signatureCharge(ref));
        units += calls * perCall + turns * toolCharge;
        agentCalls += calls;
        break;
      }
      default: break;
    }
    return { units, agentCalls };
  };

  const moduleByDigest = new Map<Digest, { node: CompiledOrganism; occurrences: number }>();
  for (const occurrence of occurrences) {
    const found = moduleByDigest.get(occurrence.digest);
    if (found === undefined) moduleByDigest.set(occurrence.digest, { node: occurrence.node, occurrences: 1 });
    else found.occurrences += 1;
  }
  const modules: EnvelopeModule[] = [...moduleByDigest.keys()].sort(compareUtf8).map(digest => {
    const { node, occurrences: count } = moduleByDigest.get(digest)!;
    const cells: EnvelopeCellWork[] = node.manifest.cells.map(cell => {
      const work = cellWork(node, cell);
      const detail: {
        fn?: string; tool?: string; manifest?: Digest; via?: string;
        maxRounds?: number; maxItems?: number; over?: string;
        slot?: { name: string; mode: "read" | "write" }; spawn?: true;
        attempts?: number; turns?: number; tools?: string[];
      } = {};
      if (cell.kind === "fn") detail.fn = cell.fn;
      else if (cell.kind === "tool") detail.tool = cell.tool;
      else if (cell.kind === "organism" || cell.kind === "repeat" || cell.kind === "each") {
        detail.manifest = asDigest(cell.manifest, `envelope cell "${cell.id}" manifest`);
        if (cell.via !== undefined) detail.via = cell.via;
        if (cell.kind === "repeat") detail.maxRounds = cell.maxRounds;
        if (cell.kind === "each") { detail.maxItems = cell.maxItems; detail.over = cell.over; }
      } else if (cell.kind === "slot") detail.slot = { name: cell.name, mode: cell.mode };
      else if (cell.kind === "spawn") detail.spawn = true;
      if ("retry" in cell && cell.retry !== undefined) detail.attempts = cell.retry.attempts;
      if ((cell.kind === "agent" || cell.kind === "classifier" || cell.kind === "gate") && cell.budget?.maxTurns !== undefined) detail.turns = cell.budget.maxTurns;
      if ((cell.kind === "agent" || cell.kind === "classifier") && cell.tools !== undefined) detail.tools = [...cell.tools].sort(compareUtf8);
      return { id: cell.id, kind: cell.kind, units: work.units, agentCalls: work.agentCalls, ...detail } as EnvelopeCellWork;
    });
    const selfWork = cells.reduce(
      (total, cell) => ({ steps: total.steps + 1, agentCalls: total.agentCalls + cell.agentCalls, units: total.units + cell.units }),
      { steps: 0, agentCalls: 0, units: 0 },
    );
    const iface = node.manifest.interface === undefined ? { inputs: {}, outputs: {} } : interfaceSignature(node);
    return {
      manifestDigest: digest, key: node.manifest.key, name: node.manifest.name,
      interface: iface, budgets: { ...node.manifest.budgets },
      occurrences: count, selfWork, cells,
    };
  });
  const selfWorkByDigest = new Map(modules.map(module => [module.manifestDigest, module.selfWork]));
  const unitsCap = AUTHORITY_ENVELOPE_BOUNDS.maxUnits;
  const product = (times: number, each: { steps: number; agentCalls: number; units: number }) => ({
    steps: Math.min(times * each.steps, unitsCap),
    agentCalls: Math.min(times * each.agentCalls, unitsCap),
    units: Math.min(times * each.units, unitsCap),
  });
  const reportOccurrences: EnvelopeOccurrence[] = occurrences.map((occurrence, index) => {
    const bound = bounds[index]!;
    const self = selfWorkByDigest.get(occurrence.digest)!;
    const caller = occurrence.caller;
    return {
      path: occurrence.path, depth: occurrence.depth, manifestDigest: occurrence.digest,
      key: occurrence.node.manifest.key,
      ...(caller === undefined ? {} : { caller: {
        path: occurrences[caller.parent]!.path, cellId: caller.cellId, kind: caller.kind,
        ...(caller.maxItems === undefined ? {} : { maxItems: caller.maxItems }),
        ...(caller.maxRounds === undefined ? {} : { maxRounds: caller.maxRounds }),
        ...(caller.via === undefined ? {} : { via: caller.via }),
      } }),
      runnable: runnable[index]!,
      invocations: { min: bound.min, max: bound.max, ...(bound.saturated ? { saturated: true as const } : {}) },
      work: product(bound.max, self),
    };
  }).sort((left, right) => comparePaths(left.path, right.path));

  // Largest single-activation charge in the closed part — the check trails
  // the charge, so a receipt can exceed maxWork by this much. Under an open
  // closure any manifest the registries admit could produce the theoretical
  // ceiling, so take the larger.
  const activationCeiling = (() => {
    let worst = 0;
    for (const module of modules) for (const cell of module.cells) worst = Math.max(worst, cell.units);
    if (closed) return worst;
    const perCallMax = WORK.effectBase + BOUNDS.maxContextBytes * WORK.perContextByte + BOUNDS.maxOutputBytes * WORK.perOutputByte;
    let signatureMax = 0;
    for (const entry of fns.values()) signatureMax = Math.max(signatureMax, entry.signature.cost);
    for (const entry of tools?.values() ?? []) signatureMax = Math.max(signatureMax, entry.signature.cost + entry.signature.maxOutputBytes);
    const theoretical = Math.max(
      BOUNDS.maxBlobBytes,
      BOUNDS.maxExprFuel,
      BOUNDS.maxExprFuel + 2 * BOUNDS.maxRetryAttempts * perCallMax,
      BOUNDS.maxTurns * (BOUNDS.maxRetryAttempts + 1) * perCallMax + BOUNDS.maxTurns * signatureMax,
      signatureMax,
    ) + WORK.activation;
    return Math.max(worst, theoretical);
  })();

  const structural = { steps: 0, agentCalls: 0, units: 0 };
  // Invocation products that hit the occurrence cap truncate the dimension's
  // structural bound the same way — the marker carries through.
  const hitCap = { steps: false, agentCalls: false, units: false };
  for (const [index, occurrence] of occurrences.entries()) {
    if (!runnable[index]) continue;
    const bound = bounds[index]!;
    const self = selfWorkByDigest.get(occurrence.digest)!;
    const add = (into: "steps" | "agentCalls" | "units", value: number) => {
      structural[into] += bound.max * value;
      if (bound.saturated || structural[into] >= unitsCap) {
        structural[into] = Math.min(structural[into], unitsCap);
        hitCap[into] = true;
      }
    };
    add("steps", self.steps);
    add("agentCalls", self.agentCalls);
    add("units", self.units);
  }
  const open = !closed;
  // `structural` sums only statically known content — under an open closure
  // the honest bound is the ceiling the runtime enforces, not the partial sum.
  const dimension = (value: number, ceiling: number, capped: boolean): EnvelopeWorkBound => ({
    structural: value, bound: open ? ceiling : Math.min(value, ceiling),
    ...(capped ? { saturated: true as const } : {}),
    ...(open ? { open: true as const } : {}),
  });
  const work = {
    steps: dimension(structural.steps, budgets.maxSteps, hitCap.steps),
    agentCalls: dimension(structural.agentCalls, budgets.maxAgentCalls, hitCap.agentCalls),
    units: dimension(structural.units, budgets.maxWork + activationCeiling, hitCap.units),
    activationCeiling,
  };

  const cellsTotal = modules.reduce((total, module) => total + module.cells.length, 0);
  const report: AuthorityEnvelope = {
    contract: AUTHORITY_ENVELOPE_CONTRACT,
    basis: "static-structure",
    root: { digest: rootDigest, key: manifest.key, name: manifest.name },
    budgets: { ...budgets },
    counts: {
      modules: modules.length, occurrences: reportOccurrences.length, cells: cellsTotal,
      spawnCells: openCells.length, capabilities: capabilityList.length,
      functions: functions.length, tools: toolRefs.length, slots: slots.length,
    },
    closure: {
      closed, cells: openCells,
      mintable: [...mintable].sort(compareUtf8),
      consumable: [...consumable].sort(compareUtf8),
    },
    capabilities: capabilityList,
    functions, tools: toolRefs, slots,
    modules, occurrences: reportOccurrences, work,
  };
  if (utf8Length(canonicalize(report as unknown as JsonValue)) > AUTHORITY_ENVELOPE_BOUNDS.maxReportBytes) {
    throw new AlgalError("BUDGET_EXHAUSTED", `envelope: report exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxReportBytes} bytes`);
  }
  freezeDeep(report);
  envelopes.add(report);
  return report;
}

// ------------------------------------------------------------- parsing -----

const parsePath = (u: unknown, what: string): readonly string[] => {
  const parts = asArray(u, what).map((part, index) => asString(part, `${what}[${index}]`, BOUNDS.maxIdLen));
  if (parts.length > AUTHORITY_ENVELOPE_BOUNDS.maxDepth) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceeds depth ${AUTHORITY_ENVELOPE_BOUNDS.maxDepth}`);
  }
  return parts;
};

const parseUseList = (u: unknown, what: string): EnvelopeUse[] =>
  asArray(u, what).map((entry, index) => {
    const at = `${what}[${index}]`;
    const obj = asObject(entry, at);
    noUnknownKeys(obj, ["path", "cell", "via"], at);
    const via = asString(reqField(obj, "via", at), `${at}.via`, 8);
    if (via !== "cell" && via !== "model") {
      throw new AlgalError("PARSE_FAILED", `${at}.via must be cell|model`);
    }
    return { path: parsePath(reqField(obj, "path", at), `${at}.path`), cell: asString(reqField(obj, "cell", at), `${at}.cell`, BOUNDS.maxIdLen), via };
  });

const parseEndpointList = (u: unknown, what: string): EnvelopePortEndpoint[] =>
  asArray(u, what).map((entry, index) => {
    const at = `${what}[${index}]`;
    const obj = asObject(entry, at);
    noUnknownKeys(obj, ["cell", "port", "live", "tool"], at);
    const live = optField(obj, "live");
    if (live !== undefined && typeof live !== "boolean") {
      throw new AlgalError("PARSE_FAILED", `${at}.live must be a boolean`);
    }
    const tool = optField(obj, "tool");
    return {
      cell: asString(reqField(obj, "cell", at), `${at}.cell`, BOUNDS.maxIdLen),
      port: asString(reqField(obj, "port", at), `${at}.port`, BOUNDS.maxPortNameLen),
      ...(live === undefined ? {} : { live }),
      ...(tool === undefined ? {} : { tool: asString(tool, `${at}.tool`, BOUNDS.maxRefLen) }),
    };
  });

const parseBudgets = (u: unknown, what: string): Budgets => {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["maxSteps", "maxAgentCalls", "maxWork", "maxContextBytes", "maxOutputBytes", "maxDepth"], what);
  return {
    maxSteps: asInt(reqField(obj, "maxSteps", what), `${what}.maxSteps`, 1, BOUNDS.maxSteps),
    maxAgentCalls: asInt(reqField(obj, "maxAgentCalls", what), `${what}.maxAgentCalls`, 1, BOUNDS.maxAgentCalls),
    maxWork: asInt(reqField(obj, "maxWork", what), `${what}.maxWork`, 1, BOUNDS.maxWork),
    maxContextBytes: asInt(reqField(obj, "maxContextBytes", what), `${what}.maxContextBytes`, 1, BOUNDS.maxContextBytes),
    maxOutputBytes: asInt(reqField(obj, "maxOutputBytes", what), `${what}.maxOutputBytes`, 1, BOUNDS.maxOutputBytes),
    maxDepth: asInt(reqField(obj, "maxDepth", what), `${what}.maxDepth`, 1, BOUNDS.maxDepth),
  };
};

const parsePortMapField = (u: unknown, what: string): PortMap => {
  const obj = asObject(u, what);
  if (Object.keys(obj).length > BOUNDS.maxInterfacePorts) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what} exceeds ${BOUNDS.maxInterfacePorts} ports`);
  }
  const out: PortMap = {};
  for (const [name, raw] of Object.entries(obj)) {
    asString(name, `${what} name`, BOUNDS.maxPortNameLen);
    out[name] = parseEnvelopePortType(raw, `${what}.${name}`);
  }
  return out;
};

function parseEnvelopePortType(u: unknown, what: string): PortType {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["type", "optional", "many", "labels", "capability"], what);
  const type = asString(reqField(obj, "type", what), `${what}.type`, 8);
  if (type !== "text" && type !== "json" && type !== "choice" && type !== "ref" && type !== "cap") {
    throw new AlgalError("PARSE_FAILED", `${what}.type: unknown "${type}"`);
  }
  const optional = optField(obj, "optional");
  const many = optField(obj, "many");
  if ((optional !== undefined && optional !== true) || (many !== undefined && many !== true)) {
    throw new AlgalError("PARSE_FAILED", `${what}: optional and many must be true when present`);
  }
  const out: { optional?: true; many?: true } = {
    ...(optional === true ? { optional: true } : {}),
    ...(many === true ? { many: true } : {}),
  };
  if (type === "cap") {
    return { type, capability: asCapabilityClass(reqField(obj, "capability", what), `${what}.capability`), ...out };
  }
  if (type === "choice") {
    const labels = optField(obj, "labels");
    if (labels !== undefined) {
      const list = asArray(labels, `${what}.labels`).map((label, index) => asString(label, `${what}.labels[${index}]`, BOUNDS.maxLabelLen));
      if (list.length > BOUNDS.maxLabels) throw new AlgalError("PARSE_FAILED", `${what}.labels exceeds ${BOUNDS.maxLabels}`);
      return { type, labels: list, ...out };
    }
  }
  return { type, ...out };
}

const parseWorkTriplet = (u: unknown, what: string, max: number): { steps: number; agentCalls: number; units: number } => {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["steps", "agentCalls", "units"], what);
  return {
    steps: asInt(reqField(obj, "steps", what), `${what}.steps`, 0, max),
    agentCalls: asInt(reqField(obj, "agentCalls", what), `${what}.agentCalls`, 0, max),
    units: asInt(reqField(obj, "units", what), `${what}.units`, 0, max),
  };
};

/** Validate a foreign `algal.authority-envelope.v1` report under the same
 * bounds the writer enforces. Reports admitted this way may be rendered. */
export function parseAuthorityEnvelope(u: unknown): AuthorityEnvelope {
  const what = "authority envelope";
  const obj = asObject(u, what);
  noUnknownKeys(obj, [
    "contract", "basis", "root", "budgets", "counts", "closure",
    "capabilities", "functions", "tools", "slots", "modules", "occurrences", "work",
  ], what);
  const contract = asString(reqField(obj, "contract", what), `${what}.contract`, 64);
  if (contract !== AUTHORITY_ENVELOPE_CONTRACT) {
    throw new AlgalError("PARSE_FAILED", `${what}.contract must be ${AUTHORITY_ENVELOPE_CONTRACT}`);
  }
  const basis = asString(reqField(obj, "basis", what), `${what}.basis`, 32);
  if (basis !== "static-structure") throw new AlgalError("PARSE_FAILED", `${what}.basis must be static-structure`);

  const rootObj = asObject(reqField(obj, "root", what), `${what}.root`);
  noUnknownKeys(rootObj, ["digest", "key", "name"], `${what}.root`);
  const root = {
    digest: asDigest(reqField(rootObj, "digest", `${what}.root`), `${what}.root.digest`),
    key: asString(reqField(rootObj, "key", `${what}.root`), `${what}.root.key`, BOUNDS.maxIdLen),
    name: asString(reqField(rootObj, "name", `${what}.root`), `${what}.root.name`, BOUNDS.maxNameLen),
  };
  const budgets = parseBudgets(reqField(obj, "budgets", what), `${what}.budgets`);

  const countsObj = asObject(reqField(obj, "counts", what), `${what}.counts`);
  noUnknownKeys(countsObj, ["modules", "occurrences", "cells", "spawnCells", "capabilities", "functions", "tools", "slots"], `${what}.counts`);
  const counts = {
    modules: asInt(reqField(countsObj, "modules", `${what}.counts`), `${what}.counts.modules`, 0, COMPILE_BOUNDS.maxInstances),
    occurrences: asInt(reqField(countsObj, "occurrences", `${what}.counts`), `${what}.counts.occurrences`, 0, COMPILE_BOUNDS.maxInstances),
    cells: asInt(reqField(countsObj, "cells", `${what}.counts`), `${what}.counts.cells`, 0, COMPILE_BOUNDS.maxCells),
    spawnCells: asInt(reqField(countsObj, "spawnCells", `${what}.counts`), `${what}.counts.spawnCells`, 0, COMPILE_BOUNDS.maxCells),
    capabilities: asInt(reqField(countsObj, "capabilities", `${what}.counts`), `${what}.counts.capabilities`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities),
    functions: asInt(reqField(countsObj, "functions", `${what}.counts`), `${what}.counts.functions`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxRefs),
    tools: asInt(reqField(countsObj, "tools", `${what}.counts`), `${what}.counts.tools`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxRefs),
    slots: asInt(reqField(countsObj, "slots", `${what}.counts`), `${what}.counts.slots`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxRefs),
  };

  const closureObj = asObject(reqField(obj, "closure", what), `${what}.closure`);
  noUnknownKeys(closureObj, ["closed", "cells", "mintable", "consumable"], `${what}.closure`);
  const closedRaw = reqField(closureObj, "closed", `${what}.closure`);
  if (typeof closedRaw !== "boolean") throw new AlgalError("PARSE_FAILED", `${what}.closure.closed must be a boolean`);
  const classList = (u2: unknown, at: string): string[] =>
    asArray(u2, at).map((cls, index) => asCapabilityClass(cls, `${at}[${index}]`));
  const mintable = classList(reqField(closureObj, "mintable", `${what}.closure`), `${what}.closure.mintable`);
  const consumable = classList(reqField(closureObj, "consumable", `${what}.closure`), `${what}.closure.consumable`);
  if (mintable.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities || consumable.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what}.closure class list exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities}`);
  }
  const openCells: EnvelopeOpenCell[] = asArray(reqField(closureObj, "cells", `${what}.closure`), `${what}.closure.cells`).map((entry, index) => {
    const at = `${what}.closure.cells[${index}]`;
    const cellObj = asObject(entry, at);
    noUnknownKeys(cellObj, ["path", "cell", "kind", "possible"], at);
    if (reqField(cellObj, "kind", at) !== "spawn") throw new AlgalError("PARSE_FAILED", `${at}.kind must be spawn`);
    const possible = reqField(cellObj, "possible", at);
    if (typeof possible !== "boolean") throw new AlgalError("PARSE_FAILED", `${at}.possible must be a boolean`);
    return {
      path: parsePath(reqField(cellObj, "path", at), `${at}.path`),
      cell: asString(reqField(cellObj, "cell", at), `${at}.cell`, BOUNDS.maxIdLen),
      kind: "spawn", possible,
    };
  });

  const capabilities: EnvelopeCapability[] = asArray(reqField(obj, "capabilities", what), `${what}.capabilities`).map((entry, index) => {
    const at = `${what}.capabilities[${index}]`;
    const capObj = asObject(entry, at);
    noUnknownKeys(capObj, ["class", "verdict", "producers", "consumers"], at);
    const cls = asCapabilityClass(reqField(capObj, "class", at), `${at}.class`);
    const verdict = asString(reqField(capObj, "verdict", at), `${at}.verdict`, 8);
    if (verdict !== "can" && verdict !== "cannot" && verdict !== "unknown") {
      throw new AlgalError("PARSE_FAILED", `${at}.verdict must be can|cannot|unknown`);
    }
    const producers: EnvelopeCapabilityProducer[] = asArray(reqField(capObj, "producers", at), `${at}.producers`).map((producer, p) => {
      const where = `${at}.producers[${p}]`;
      const pObj = asObject(producer, where);
      noUnknownKeys(pObj, ["path", "cell", "port", "role", "tool", "interface", "live"], where);
      const role = asString(reqField(pObj, "role", where), `${where}.role`, 16);
      if (!["args", "fn", "tool", "delegated", "tool-result"].includes(role)) {
        throw new AlgalError("PARSE_FAILED", `${where}.role must be args|fn|tool|delegated|tool-result`);
      }
      const live = reqField(pObj, "live", where);
      if (typeof live !== "boolean") throw new AlgalError("PARSE_FAILED", `${where}.live must be a boolean`);
      const tool = optField(pObj, "tool");
      const iface = optField(pObj, "interface");
      return {
        path: parsePath(reqField(pObj, "path", where), `${where}.path`),
        cell: asString(reqField(pObj, "cell", where), `${where}.cell`, BOUNDS.maxIdLen),
        port: asString(reqField(pObj, "port", where), `${where}.port`, BOUNDS.maxPortNameLen),
        role: role as EnvelopeProducerRole,
        ...(tool === undefined ? {} : { tool: asString(tool, `${where}.tool`, BOUNDS.maxRefLen) }),
        ...(iface === undefined ? {} : { interface: asArray(iface, `${where}.interface`).map((name, n) => asString(name, `${where}.interface[${n}]`, BOUNDS.maxPortNameLen)) }),
        live,
      };
    });
    if (producers.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${at}.producers exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses}`);
    }
    const consumers: EnvelopeCapabilityConsumer[] = asArray(reqField(capObj, "consumers", at), `${at}.consumers`).map((consumer, c) => {
      const where = `${at}.consumers[${c}]`;
      const cObj = asObject(consumer, where);
      noUnknownKeys(cObj, ["path", "cell", "port", "use", "optional", "tool", "fed", "feeds", "visible"], where);
      const use = asString(reqField(cObj, "use", where), `${where}.use`, 16);
      if (!["tool", "fn", "model", "delegated", "context", "data"].includes(use)) {
        throw new AlgalError("PARSE_FAILED", `${where}.use must be tool|fn|model|delegated|context|data`);
      }
      const fedRaw = reqField(cObj, "fed", where);
      if (typeof fedRaw !== "boolean") throw new AlgalError("PARSE_FAILED", `${where}.fed must be a boolean`);
      const optional = optField(cObj, "optional");
      if (optional !== undefined && optional !== true) throw new AlgalError("PARSE_FAILED", `${where}.optional must be true when present`);
      const tool = optField(cObj, "tool");
      const feeds = optField(cObj, "feeds");
      const visible = optField(cObj, "visible");
      return {
        path: parsePath(reqField(cObj, "path", where), `${where}.path`),
        cell: asString(reqField(cObj, "cell", where), `${where}.cell`, BOUNDS.maxIdLen),
        port: asString(reqField(cObj, "port", where), `${where}.port`, BOUNDS.maxPortNameLen),
        use: use as EnvelopeConsumerUse,
        ...(optional === true ? { optional: true as const } : {}),
        ...(tool === undefined ? {} : { tool: asString(tool, `${where}.tool`, BOUNDS.maxRefLen) }),
        fed: fedRaw,
        ...(feeds === undefined ? {} : { feeds: parseEndpointList(feeds, `${where}.feeds`) }),
        ...(visible === undefined ? {} : { visible: parseEndpointList(visible, `${where}.visible`) }),
      };
    });
    if (consumers.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${at}.consumers exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses}`);
    }
    return { class: cls, verdict, producers, consumers };
  });
  if (capabilities.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what}.capabilities exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilities}`);
  }

  const functions: EnvelopeFunctionRef[] = asArray(reqField(obj, "functions", what), `${what}.functions`).map((entry, index) => {
    const at = `${what}.functions[${index}]`;
    const fObj = asObject(entry, at);
    noUnknownKeys(fObj, ["ref", "cost", "uses"], at);
    const uses = parseUseList(reqField(fObj, "uses", at), `${at}.uses`);
    if (uses.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${at}.uses exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses}`);
    }
    return {
      ref: asString(reqField(fObj, "ref", at), `${at}.ref`, BOUNDS.maxRefLen),
      cost: asInt(reqField(fObj, "cost", at), `${at}.cost`, 0, Number.MAX_SAFE_INTEGER),
      uses,
    };
  });
  const toolRefs: EnvelopeToolRef[] = asArray(reqField(obj, "tools", what), `${what}.tools`).map((entry, index) => {
    const at = `${what}.tools[${index}]`;
    const tObj = asObject(entry, at);
    noUnknownKeys(tObj, ["ref", "effect", "cost", "maxOutputBytes", "uses"], at);
    const effect = asString(reqField(tObj, "effect", at), `${at}.effect`, 8);
    if (effect !== "read" && effect !== "write") throw new AlgalError("PARSE_FAILED", `${at}.effect must be read|write`);
    const uses = parseUseList(reqField(tObj, "uses", at), `${at}.uses`);
    if (uses.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${at}.uses exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses}`);
    }
    return {
      ref: asString(reqField(tObj, "ref", at), `${at}.ref`, BOUNDS.maxRefLen),
      effect,
      cost: asInt(reqField(tObj, "cost", at), `${at}.cost`, 0, Number.MAX_SAFE_INTEGER),
      maxOutputBytes: asInt(reqField(tObj, "maxOutputBytes", at), `${at}.maxOutputBytes`, 1, BOUNDS.maxValueBytes),
      uses,
    };
  });
  const slots: EnvelopeSlotUse[] = asArray(reqField(obj, "slots", what), `${what}.slots`).map((entry, index) => {
    const at = `${what}.slots[${index}]`;
    const sObj = asObject(entry, at);
    noUnknownKeys(sObj, ["name", "mode", "uses"], at);
    const mode = asString(reqField(sObj, "mode", at), `${at}.mode`, 8);
    if (mode !== "read" && mode !== "write") throw new AlgalError("PARSE_FAILED", `${at}.mode must be read|write`);
    const uses = asArray(reqField(sObj, "uses", at), `${at}.uses`).map((use, u) => {
      const where = `${at}.uses[${u}]`;
      const uObj = asObject(use, where);
      noUnknownKeys(uObj, ["path", "cell"], where);
      return {
        path: parsePath(reqField(uObj, "path", where), `${where}.path`),
        cell: asString(reqField(uObj, "cell", where), `${where}.cell`, BOUNDS.maxIdLen),
      };
    });
    if (uses.length > AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${at}.uses exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxCapabilityUses}`);
    }
    return { name: asString(reqField(sObj, "name", at), `${at}.name`, BOUNDS.maxPortNameLen), mode, uses };
  });
  if (functions.length > AUTHORITY_ENVELOPE_BOUNDS.maxRefs || toolRefs.length > AUTHORITY_ENVELOPE_BOUNDS.maxRefs || slots.length > AUTHORITY_ENVELOPE_BOUNDS.maxRefs) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what} reference lists exceed ${AUTHORITY_ENVELOPE_BOUNDS.maxRefs}`);
  }

  const modules: EnvelopeModule[] = asArray(reqField(obj, "modules", what), `${what}.modules`).map((entry, index) => {
    const at = `${what}.modules[${index}]`;
    const mObj = asObject(entry, at);
    noUnknownKeys(mObj, ["manifestDigest", "key", "name", "interface", "budgets", "occurrences", "selfWork", "cells"], at);
    const ifaceObj = asObject(reqField(mObj, "interface", at), `${at}.interface`);
    noUnknownKeys(ifaceObj, ["inputs", "outputs"], `${at}.interface`);
    const cells: EnvelopeCellWork[] = asArray(reqField(mObj, "cells", at), `${at}.cells`).map((cell, c) => {
      const where = `${at}.cells[${c}]`;
      const cObj = asObject(cell, where);
      noUnknownKeys(cObj, ["id", "kind", "units", "agentCalls", "fn", "tool", "manifest", "via", "maxRounds", "maxItems", "over", "slot", "spawn", "attempts", "turns", "tools"], where);
      const kind = asString(reqField(cObj, "kind", where), `${where}.kind`, 16);
      if (!ENVELOPE_CELL_KINDS.has(kind)) {
        throw new AlgalError("PARSE_FAILED", `${where}.kind: unknown "${kind}"`);
      }
      const opt = (key: string) => optField(cObj, key);
      const slot = opt("slot");
      let slotParsed: EnvelopeCellWork["slot"];
      if (slot !== undefined) {
        const slotObj = asObject(slot, `${where}.slot`);
        noUnknownKeys(slotObj, ["name", "mode"], `${where}.slot`);
        const mode = asString(reqField(slotObj, "mode", `${where}.slot`), `${where}.slot.mode`, 8);
        if (mode !== "read" && mode !== "write") throw new AlgalError("PARSE_FAILED", `${where}.slot.mode must be read|write`);
        slotParsed = { name: asString(reqField(slotObj, "name", `${where}.slot`), `${where}.slot.name`, BOUNDS.maxPortNameLen), mode };
      }
      const manifest = opt("manifest");
      const toolsList = opt("tools");
      const spawn = opt("spawn");
      if (spawn !== undefined && spawn !== true) {
        throw new AlgalError("PARSE_FAILED", `${where}.spawn must be true when present`);
      }
      return {
        id: asString(reqField(cObj, "id", where), `${where}.id`, BOUNDS.maxIdLen),
        kind: kind as Cell["kind"],
        units: asInt(reqField(cObj, "units", where), `${where}.units`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
        agentCalls: asInt(reqField(cObj, "agentCalls", where), `${where}.agentCalls`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
        ...(opt("fn") === undefined ? {} : { fn: asString(opt("fn"), `${where}.fn`, BOUNDS.maxRefLen) }),
        ...(opt("tool") === undefined ? {} : { tool: asString(opt("tool"), `${where}.tool`, BOUNDS.maxRefLen) }),
        ...(manifest === undefined ? {} : { manifest: asDigest(manifest, `${where}.manifest`) }),
        ...(opt("via") === undefined ? {} : { via: asString(opt("via"), `${where}.via`, BOUNDS.maxIdLen) }),
        ...(opt("maxRounds") === undefined ? {} : { maxRounds: asInt(opt("maxRounds"), `${where}.maxRounds`, 1, BOUNDS.maxRounds) }),
        ...(opt("maxItems") === undefined ? {} : { maxItems: asInt(opt("maxItems"), `${where}.maxItems`, 1, BOUNDS.maxEachItems) }),
        ...(opt("over") === undefined ? {} : { over: asString(opt("over"), `${where}.over`, BOUNDS.maxPortNameLen) }),
        ...(slotParsed === undefined ? {} : { slot: slotParsed }),
        ...(spawn === undefined ? {} : { spawn: true as const }),
        ...(opt("attempts") === undefined ? {} : { attempts: asInt(opt("attempts"), `${where}.attempts`, 1, BOUNDS.maxRetryAttempts) }),
        ...(opt("turns") === undefined ? {} : { turns: asInt(opt("turns"), `${where}.turns`, 1, BOUNDS.maxTurns) }),
        ...(toolsList === undefined ? {} : { tools: asArray(toolsList, `${where}.tools`).map((t, i) => asString(t, `${where}.tools[${i}]`, BOUNDS.maxRefLen)) }),
      };
    });
    if (cells.length > COMPILE_BOUNDS.maxCells) {
      throw new AlgalError("BUDGET_EXHAUSTED", `${at}.cells exceeds ${COMPILE_BOUNDS.maxCells}`);
    }
    return {
      manifestDigest: asDigest(reqField(mObj, "manifestDigest", at), `${at}.manifestDigest`),
      key: asString(reqField(mObj, "key", at), `${at}.key`, BOUNDS.maxIdLen),
      name: asString(reqField(mObj, "name", at), `${at}.name`, BOUNDS.maxNameLen),
      interface: {
        inputs: parsePortMapField(reqField(ifaceObj, "inputs", `${at}.interface`), `${at}.interface.inputs`),
        outputs: parsePortMapField(reqField(ifaceObj, "outputs", `${at}.interface`), `${at}.interface.outputs`),
      },
      budgets: parseBudgets(reqField(mObj, "budgets", at), `${at}.budgets`),
      occurrences: asInt(reqField(mObj, "occurrences", at), `${at}.occurrences`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences),
      selfWork: parseWorkTriplet(reqField(mObj, "selfWork", at), `${at}.selfWork`, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
      cells,
    };
  });
  if (modules.length > AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what}.modules exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences}`);
  }

  const reportOccurrences: EnvelopeOccurrence[] = asArray(reqField(obj, "occurrences", what), `${what}.occurrences`).map((entry, index) => {
    const at = `${what}.occurrences[${index}]`;
    const oObj = asObject(entry, at);
    noUnknownKeys(oObj, ["path", "depth", "manifestDigest", "key", "caller", "runnable", "invocations", "work"], at);
    const callerRaw = optField(oObj, "caller");
    let caller: EnvelopeCaller | undefined;
    if (callerRaw !== undefined) {
      const cObj = asObject(callerRaw, `${at}.caller`);
      noUnknownKeys(cObj, ["path", "cellId", "kind", "maxItems", "maxRounds", "via"], `${at}.caller`);
      const kind = asString(reqField(cObj, "kind", `${at}.caller`), `${at}.caller.kind`, 16);
      if (kind !== "organism" && kind !== "repeat" && kind !== "each") {
        throw new AlgalError("PARSE_FAILED", `${at}.caller.kind must be organism|repeat|each`);
      }
      caller = {
        path: parsePath(reqField(cObj, "path", `${at}.caller`), `${at}.caller.path`),
        cellId: asString(reqField(cObj, "cellId", `${at}.caller`), `${at}.caller.cellId`, BOUNDS.maxIdLen),
        kind,
        ...(optField(cObj, "maxItems") === undefined ? {} : { maxItems: asInt(optField(cObj, "maxItems"), `${at}.caller.maxItems`, 1, BOUNDS.maxEachItems) }),
        ...(optField(cObj, "maxRounds") === undefined ? {} : { maxRounds: asInt(optField(cObj, "maxRounds"), `${at}.caller.maxRounds`, 1, BOUNDS.maxRounds) }),
        ...(optField(cObj, "via") === undefined ? {} : { via: asString(optField(cObj, "via"), `${at}.caller.via`, BOUNDS.maxIdLen) }),
      };
    }
    const runnable = reqField(oObj, "runnable", at);
    if (typeof runnable !== "boolean") throw new AlgalError("PARSE_FAILED", `${at}.runnable must be a boolean`);
    const invObj = asObject(reqField(oObj, "invocations", at), `${at}.invocations`);
    noUnknownKeys(invObj, ["min", "max", "saturated"], `${at}.invocations`);
    const saturated = optField(invObj, "saturated");
    if (saturated !== undefined && saturated !== true) throw new AlgalError("PARSE_FAILED", `${at}.invocations.saturated must be true when present`);
    return {
      path: parsePath(reqField(oObj, "path", at), `${at}.path`),
      depth: asInt(reqField(oObj, "depth", at), `${at}.depth`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxDepth),
      manifestDigest: asDigest(reqField(oObj, "manifestDigest", at), `${at}.manifestDigest`),
      key: asString(reqField(oObj, "key", at), `${at}.key`, BOUNDS.maxIdLen),
      ...(caller === undefined ? {} : { caller }),
      runnable,
      invocations: {
        min: asInt(reqField(invObj, "min", `${at}.invocations`), `${at}.invocations.min`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxInvocations),
        max: asInt(reqField(invObj, "max", `${at}.invocations`), `${at}.invocations.max`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxInvocations),
        ...(saturated === true ? { saturated: true as const } : {}),
      },
      work: parseWorkTriplet(reqField(oObj, "work", at), `${at}.work`, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
    };
  });
  if (reportOccurrences.length > AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences) {
    throw new AlgalError("BUDGET_EXHAUSTED", `${what}.occurrences exceeds ${AUTHORITY_ENVELOPE_BOUNDS.maxOccurrences}`);
  }

  const workObj = asObject(reqField(obj, "work", what), `${what}.work`);
  noUnknownKeys(workObj, ["steps", "agentCalls", "units", "activationCeiling"], `${what}.work`);
  const bound = (u2: unknown, at: string): EnvelopeWorkBound => {
    const bObj = asObject(u2, at);
    noUnknownKeys(bObj, ["structural", "bound", "saturated", "open"], at);
    const saturated = optField(bObj, "saturated");
    const open = optField(bObj, "open");
    if ((saturated !== undefined && saturated !== true) || (open !== undefined && open !== true)) {
      throw new AlgalError("PARSE_FAILED", `${at}: saturated and open must be true when present`);
    }
    return {
      structural: asInt(reqField(bObj, "structural", at), `${at}.structural`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
      bound: asInt(reqField(bObj, "bound", at), `${at}.bound`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
      ...(saturated === true ? { saturated: true as const } : {}),
      ...(open === true ? { open: true as const } : {}),
    };
  };
  const work = {
    steps: bound(reqField(workObj, "steps", `${what}.work`), `${what}.work.steps`),
    agentCalls: bound(reqField(workObj, "agentCalls", `${what}.work`), `${what}.work.agentCalls`),
    units: bound(reqField(workObj, "units", `${what}.work`), `${what}.work.units`),
    activationCeiling: asInt(reqField(workObj, "activationCeiling", `${what}.work`), `${what}.work.activationCeiling`, 0, AUTHORITY_ENVELOPE_BOUNDS.maxUnits),
  };

  const report: AuthorityEnvelope = {
    contract: AUTHORITY_ENVELOPE_CONTRACT, basis, root, budgets, counts,
    closure: { closed: closedRaw, cells: openCells, mintable, consumable },
    capabilities, functions, tools: toolRefs, slots, modules,
    occurrences: reportOccurrences, work,
  };
  freezeDeep(report);
  envelopes.add(report);
  return report;
}

// ------------------------------------------------------------ rendering ----

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? "" : "s"}`;
const pathText = (path: readonly string[]): string => (path.length === 0 ? "(root)" : path.join("/"));

/** Render an envelope this module produced or parsed. The renderer refuses
 * foreign or modified objects so unverified labels never present as analysis. */
export function renderAuthorityEnvelope(report: AuthorityEnvelope): string {
  if (!envelopes.has(report)) {
    throw new AlgalError("PARSE_FAILED", "envelope: only reports created by createAuthorityEnvelope or parseAuthorityEnvelope can be rendered");
  }
  const { counts, budgets } = report;
  const lines = [
    `ALGAL authority envelope · digest-bound static structure (no run)`,
    `Root: ${report.root.key} · ${report.root.digest}`,
    `Budgets: steps≤${budgets.maxSteps} agentCalls≤${budgets.maxAgentCalls} work≤${budgets.maxWork} ctx≤${budgets.maxContextBytes} out≤${budgets.maxOutputBytes} depth≤${budgets.maxDepth}`,
    `Closure: ${report.closure.closed ? "closed" : `open — ${plural(report.closure.cells.filter(c => c.possible).length, "possible spawn cell")}`} · modules ${counts.modules} · occurrences ${counts.occurrences} · cells ${counts.cells}`,
  ];
  if (report.closure.mintable.length > 0 || report.closure.consumable.length > 0) {
    lines.push(`Registry classes: mintable ${report.closure.mintable.join(", ") || "none"} · consumable ${report.closure.consumable.join(", ") || "none"}`);
  }
  const fmtBound = (bound: EnvelopeWorkBound): string =>
    `≤${bound.bound}${bound.structural !== bound.bound ? ` (structural ${bound.structural}${bound.saturated === true ? ", saturated" : ""})` : ""}${bound.open === true ? " open" : ""}`;
  lines.push(`Work per root invocation: steps ${fmtBound(report.work.steps)} · agentCalls ${fmtBound(report.work.agentCalls)} · units ${fmtBound(report.work.units)}`);
  if (report.work.activationCeiling > 0) {
    lines.push(`Largest single-activation charge: ${report.work.activationCeiling} units (a recorded run can exceed maxWork by this much)`);
  }
  lines.push("", "Capabilities");
  if (report.capabilities.length === 0) lines.push("  none declared");
  for (const capability of report.capabilities) {
    lines.push(`  ${capability.class}: ${capability.verdict}`);
    for (const producer of capability.producers) {
      const iface = producer.interface === undefined ? "" : ` via interface ${producer.interface.join("|")}`;
      const tool = producer.tool === undefined ? "" : ` via tool ${producer.tool}`;
      lines.push(`    producer ${pathText(producer.path)} ${producer.cell}.${producer.port} (${producer.role}${iface}${tool}) ${producer.live ? "live" : "dead"}`);
    }
    for (const consumer of capability.consumers) {
      const tool = consumer.tool === undefined ? "" : ` via tool ${consumer.tool}`;
      const feeds = consumer.feeds === undefined || consumer.feeds.length === 0
        ? "unwired"
        : `fed by ${consumer.feeds.map(feed => `${feed.cell}.${feed.port}${feed.live === false ? " (dead)" : ""}`).join(", ")}`;
      const visible = consumer.visible === undefined ? "" : ` · visible ${consumer.visible.map(v => `${v.cell}.${v.port}${v.tool === undefined ? "" : ` (${v.tool})`}`).join(", ")}`;
      lines.push(`    consumer ${pathText(consumer.path)} ${consumer.cell}.${consumer.port} (${consumer.use}${tool}${consumer.optional === true ? ", optional" : ""}) ${consumer.use === "model" ? (consumer.fed ? "cell can run" : "cell cannot run") : feeds}${visible}`);
    }
  }
  if (report.functions.length > 0 || report.tools.length > 0) {
    lines.push("", "References");
    for (const fn of report.functions) {
      lines.push(`  fn ${fn.ref} cost ${fn.cost} — ${fn.uses.map(u => `${pathText(u.path)} ${u.cell} (${u.via})`).join("; ") || "unused"}`);
    }
    for (const tool of report.tools) {
      lines.push(`  tool ${tool.ref} ${tool.effect} cost ${tool.cost} out≤${tool.maxOutputBytes} — ${tool.uses.map(u => `${pathText(u.path)} ${u.cell} (${u.via})`).join("; ") || "unused"}`);
    }
  }
  if (report.slots.length > 0) {
    lines.push("", "Slots");
    for (const slot of report.slots) {
      lines.push(`  ${slot.name} ${slot.mode} — ${slot.uses.map(u => `${pathText(u.path)} ${u.cell}`).join("; ")}`);
    }
  }
  if (report.closure.cells.length > 0) {
    lines.push("", "Open cells");
    for (const cell of report.closure.cells) {
      lines.push(`  ${pathText(cell.path)} ${cell.cell} (${cell.kind}) ${cell.possible ? "can admit unseen manifests" : "never runnable"}`);
    }
  }
  lines.push("", "Modules");
  for (const module of report.modules) {
    lines.push(`  ${module.manifestDigest}  ${module.key} · ${plural(module.cells.length, "cell")} · ${plural(module.occurrences, "occurrence")} · self work ≤${module.selfWork.units} units, ${module.selfWork.agentCalls} calls`);
  }
  lines.push("", "Occurrences");
  for (const occurrence of report.occurrences) {
    const caller = occurrence.caller;
    const from = caller === undefined ? "" : ` ← ${pathText(caller.path)} ${caller.cellId} (${caller.kind}${caller.maxItems === undefined ? "" : ` ≤${caller.maxItems} items`}${caller.maxRounds === undefined ? "" : ` ≤${caller.maxRounds} rounds`})`;
    lines.push(`  ${pathText(occurrence.path)}  ${occurrence.manifestDigest.slice(0, 19)}…  ${occurrence.invocations.min === occurrence.invocations.max ? `×${occurrence.invocations.max}` : `${occurrence.invocations.min}…${occurrence.invocations.max}`}${occurrence.invocations.saturated === true ? " (saturated)" : ""}${occurrence.runnable ? "" : " · beyond maxDepth"}${from} — ≤${occurrence.work.units} units, ${occurrence.work.agentCalls} calls`);
  }
  return `${printableText(lines.join("\n"))}\n`;
}
