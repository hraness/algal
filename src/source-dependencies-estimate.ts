// Static invocation bounds for a source dependency report: how many times each
// occurrence can run per root invocation, derived from the item limits of
// enclosing `each` cells and from branch guards. The bound describes possible
// work, never observed work, and it is presentation-only: it sits outside
// executable identity and changes no manifest, receipt, or digest.
import type { Edge, PortType } from "./contract";
import type { Digest } from "./digest";
import { AlgalError } from "./errors";
import type { CompiledOrganism } from "./graph";
import { RECEIPT_BOUNDS, type RunReceipt } from "./run";
import type { SourceDependencyOccurrence } from "./source-dependencies";
import { compareUtf8 } from "./utf8";

export const SOURCE_DEPENDENCY_ESTIMATE_BOUNDS = Object.freeze({
  /** Larger products saturate at this value: one receipt holds at most this
   * many cells, so no recorded run can show more invocations of anything. */
  maxInvocations: RECEIPT_BOUNDS.maxCells,
});

export type SourceDependencyInvocationBound = {
  /** Static occurrence path; the list parallels `report.occurrences`. */
  readonly path: readonly string[];
  /** 1 when every completed root invocation that supplies each declared
   * input runs this occurrence, otherwise 0: under a branch arm, under an
   * `each`, or wherever the static structure cannot show it. */
  readonly min: number;
  /** Most invocations any run can record: the product of the item limits of
   * every enclosing `each`, at most `cap`. */
  readonly max: number;
  /** Present when the product exceeded `cap`; `max` is then the cap. */
  readonly saturated?: true;
  /** With a receipt: distinct recorded invocations. Item markers are read
   * without the `each` limit here, so an out-of-range item raises the count
   * above `max` instead of disappearing. */
  readonly recorded?: number;
};
export type SourceDependencyModuleInvocations = {
  readonly manifestDigest: Digest;
  /** Sums over the module's occurrences, saturating at `cap`. */
  readonly min: number;
  readonly max: number;
  readonly saturated?: true;
};
export type SourceDependencyEstimate = {
  /** Derived from static structure: an upper bound on possible work, not observed work. */
  readonly basis: "static-structure";
  readonly cap: number;
  readonly occurrences: readonly SourceDependencyInvocationBound[];
  /** Parallels `report.modules`. */
  readonly modules: readonly SourceDependencyModuleInvocations[];
  /** With a receipt: paths whose recorded invocations exceed `max`. Each one
   * is an inconsistency between the receipt and the compiled program. */
  readonly exceeded?: readonly (readonly string[])[];
};

/** Selector cell ID to the label its guard requires. Empty means the cell
 * activates on every completed invocation of its manifest. */
type Condition = ReadonlyMap<string, string>;
const ALWAYS: Condition = new Map();
const conditionKey = (condition: Condition): string => JSON.stringify([...condition].sort(([left], [right]) => compareUtf8(left, right)));

/** Which cells of one compiled module activate on every completed invocation
 * that supplies each declared input. The analysis follows the runtime's
 * readiness rule: a cell with inputs runs when each required port and at
 * least one port receive a value. Plain edges pass their producer's
 * condition; an `equals` guard on a labeled choice adds that label; two or
 * more edges into one port combine only when they differ in one selector
 * whose labels they cover, which is how a compiled branch merges its arms.
 * Anything else, including failure routes and many-to-many flattening, is
 * left unproven, so the result never overstates a lower bound. */
function activationAnalysis(node: CompiledOrganism): { always(cellId: string): boolean; routed(cellId: string): boolean } {
  const edges = node.manifest.edges;
  const routed = new Set(edges.filter(edge => edge.on === "fail").map(edge => edge.from.cell));
  const selectors = new Map<string, readonly string[]>();
  const memo = new Map<string, Condition | undefined>();
  const conjoin = (left: Condition, right: Condition): Condition | undefined => {
    const out = new Map(left);
    for (const [selector, label] of right) {
      const existing = out.get(selector);
      if (existing !== undefined && existing !== label) return undefined;
      out.set(selector, label);
    }
    return out;
  };
  const disjoin = (terms: readonly Condition[]): Condition | undefined => {
    if (terms.length === 0) return undefined;
    if (terms.some(term => term.size === 0)) return ALWAYS;
    const distinct = [...new Map(terms.map(term => [conditionKey(term), term])).values()];
    if (distinct.length === 1) return distinct[0];
    for (const selector of distinct[0]!.keys()) {
      const labels = selectors.get(selector);
      if (labels === undefined) continue;
      const rests = new Set<string>();
      const covered = new Set<string>();
      let rest: Map<string, string> | undefined;
      for (const term of distinct) {
        const label = term.get(selector);
        if (label === undefined) { rests.clear(); break; }
        covered.add(label);
        rest = new Map(term);
        rest.delete(selector);
        rests.add(conditionKey(rest));
      }
      if (rest !== undefined && rests.size === 1 && labels.every(label => covered.has(label))) return rest;
    }
    return undefined;
  };
  const delivery = (edge: Edge, consumer: PortType): Condition | undefined => {
    if (edge.on === "fail" || routed.has(edge.from.cell)) return undefined;
    const produced = node.ports.get(edge.from.cell)?.outputs[edge.from.port];
    // A committed cell may omit an optional output, and a many-to-many edge
    // can deliver an empty list, which the runtime counts as no value.
    if (produced === undefined || produced.optional === true || (produced.many === true && consumer.many === true)) return undefined;
    const source = condition(edge.from.cell);
    if (source === undefined || edge.guard === undefined) return source;
    if (!("equals" in edge.guard) || edge.guard.field !== undefined || produced.type !== "choice" || produced.many === true) return undefined;
    const labels = produced.labels;
    if (labels === undefined || !labels.includes(edge.guard.equals)) return undefined;
    selectors.set(edge.from.cell, labels);
    return conjoin(source, new Map([[edge.from.cell, edge.guard.equals]]));
  };
  const condition = (cellId: string): Condition | undefined => {
    if (memo.has(cellId)) return memo.get(cellId);
    // Admitted graphs are acyclic; a revisit stays unproven.
    memo.set(cellId, undefined);
    const signature = node.ports.get(cellId);
    let result: Condition | undefined = signature === undefined ? undefined : ALWAYS;
    const names = signature === undefined ? [] : Object.keys(signature.inputs);
    if (signature !== undefined && names.length > 0) {
      let delivered = false;
      for (const name of names) {
        const port = signature.inputs[name]!;
        const inbound = (node.inbound.get(cellId) ?? []).filter(entry => entry.port === name);
        const terms: Condition[] = [];
        for (const entry of inbound) {
          const term = delivery(edges[entry.edge]!, port);
          if (term !== undefined) terms.push(term);
        }
        const joined = disjoin(terms);
        if (joined === undefined) {
          if (port.optional === true) continue;
          result = undefined;
          break;
        }
        delivered = true;
        result = conjoin(result!, joined);
        if (result === undefined) break;
      }
      if (!delivered) result = undefined;
    }
    memo.set(cellId, result);
    return result;
  };
  return { always: cellId => condition(cellId)?.size === 0, routed: cellId => routed.has(cellId) };
}

const EACH_MARKER = /^i(0|[1-9][0-9]*)$/;
/** Distinct recorded invocation prefixes per occurrence, reading item markers
 * without the item limit. The execution join keeps its own count, which
 * leaves out-of-range items unattributed. */
function recordedInvocations(receipt: RunReceipt, occurrences: readonly SourceDependencyOccurrence[], nodes: ReadonlyMap<Digest, CompiledOrganism>): number[] {
  const indexByPath = new Map(occurrences.map((occurrence, index) => [occurrence.path.join("/"), index]));
  const prefixes = occurrences.map(() => new Set<string>());
  for (const path of Object.keys(receipt.cells)) {
    const segments = path === "" ? [] : path.split("/");
    let index = 0;
    let cursor = 0;
    while (cursor < segments.length) {
      const cell = nodes.get(occurrences[index]!.manifestDigest)!.manifest.cells.find(candidate => candidate.id === segments[cursor]);
      if (cell === undefined) break;
      cursor++;
      if (cursor === segments.length) { prefixes[index]!.add(segments.slice(0, cursor - 1).join("/")); break; }
      if (cell.kind !== "organism" && cell.kind !== "each") break;
      if (cell.kind === "each") {
        if (!EACH_MARKER.test(segments[cursor]!)) break;
        cursor++;
        if (cursor === segments.length) break;
      }
      const next = indexByPath.get([...occurrences[index]!.path, cell.id].join("/"));
      if (next === undefined) break;
      index = next;
    }
  }
  return prefixes.map(set => set.size);
}

/** Bound every occurrence of a report per root invocation. `occurrences`
 * must be sorted so each caller precedes its children, as report paths are;
 * `modules` lists the report's module digests in report order.
 */
export function estimateSourceDependencyInvocations(
  occurrences: readonly SourceDependencyOccurrence[],
  modules: readonly Digest[],
  nodes: ReadonlyMap<Digest, CompiledOrganism>,
  receipt?: RunReceipt,
): SourceDependencyEstimate {
  const cap = SOURCE_DEPENDENCY_ESTIMATE_BOUNDS.maxInvocations;
  const indexByPath = new Map(occurrences.map((occurrence, index) => [occurrence.path.join("/"), index]));
  const analyses = new Map<Digest, ReturnType<typeof activationAnalysis>>();
  const analysis = (digest: Digest) => {
    let found = analyses.get(digest);
    if (found === undefined) { found = activationAnalysis(nodes.get(digest)!); analyses.set(digest, found); }
    return found;
  };
  const bounds: { min: number; max: number; saturated: boolean; reliable: boolean }[] = [];
  for (const occurrence of occurrences) {
    const caller = occurrence.caller;
    if (caller === undefined) { bounds.push({ min: 1, max: 1, saturated: false, reliable: true }); continue; }
    const parentIndex = indexByPath.get(caller.path.join("/"));
    const parent = parentIndex === undefined ? undefined : bounds[parentIndex];
    const cell = parentIndex === undefined ? undefined : nodes.get(occurrences[parentIndex]!.manifestDigest)?.manifest.cells.find(candidate => candidate.id === caller.cellId);
    if (parent === undefined || cell === undefined || (cell.kind !== "organism" && cell.kind !== "each")) {
      throw new AlgalError("INTERNAL", `source dependencies: caller of occurrence "${occurrence.path.join("/")}" is unavailable for the estimate`);
    }
    const parentAnalysis = analysis(occurrences[parentIndex!]!.manifestDigest);
    let max = parent.max * (cell.kind === "each" ? cell.maxItems : 1);
    let saturated = parent.saturated;
    if (max > cap) { max = cap; saturated = true; }
    // A child can fail without failing its caller only through a failure
    // route; its own calls are then no longer guaranteed.
    const min = cell.kind === "organism" && parent.min === 1 && parent.reliable && parentAnalysis.always(cell.id) ? 1 : 0;
    bounds.push({ min, max, saturated, reliable: parent.reliable && !parentAnalysis.routed(cell.id) });
  }
  const recorded = receipt === undefined ? undefined : recordedInvocations(receipt, occurrences, nodes);
  const entries: SourceDependencyInvocationBound[] = occurrences.map((occurrence, index) => ({
    path: occurrence.path, min: bounds[index]!.min, max: bounds[index]!.max,
    ...(bounds[index]!.saturated ? { saturated: true as const } : {}),
    ...(recorded === undefined ? {} : { recorded: recorded[index]! }),
  }));
  const totals = new Map<Digest, { min: number; max: number; saturated: boolean }>(modules.map(digest => [digest, { min: 0, max: 0, saturated: false }]));
  occurrences.forEach((occurrence, index) => {
    const total = totals.get(occurrence.manifestDigest);
    if (total === undefined) throw new AlgalError("INTERNAL", "source dependencies: occurrence module is missing from the estimate");
    total.min += bounds[index]!.min;
    total.max += bounds[index]!.max;
    total.saturated ||= bounds[index]!.saturated;
    if (total.max > cap) { total.max = cap; total.saturated = true; }
  });
  return {
    basis: "static-structure", cap, occurrences: entries,
    modules: modules.map(digest => {
      const total = totals.get(digest)!;
      return { manifestDigest: digest, min: total.min, max: total.max, ...(total.saturated ? { saturated: true as const } : {}) };
    }),
    ...(recorded === undefined ? {} : { exceeded: entries.filter(entry => entry.recorded! > entry.max).map(entry => entry.path) }),
  };
}
