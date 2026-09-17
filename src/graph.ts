// Graph admission: compile a parsed manifest into a checked organism.
// Everything structural is decided here — cycles, port existence, type
// compatibility, guard validity, interface integrity — before any cell runs.

import { MorphogenError } from "./errors";
import type {
  Cell,
  OrganismInterface,
  OrganismManifest,
  PortMap,
  PortType,
} from "./contract";
import type { FnRegistry } from "./registry";
import type { Store } from "./store";
import { asDigest } from "./digest";
import { parseOrganismManifest } from "./contract";
import { unpackBundle } from "./bundle";
import type { Transport } from "./transport";
import type { JsonValue } from "./values";

export type CellPorts = { inputs: PortMap; outputs: PortMap };

export type CompiledOrganism = {
  manifest: OrganismManifest;
  ports: Map<string, CellPorts>;
  inbound: Map<string, { edge: number; port: string }[]>;
  /** Compiled sub-organisms for organism cells, keyed by cell id. */
  children: Map<string, CompiledOrganism>;
  /** Cells whose sub-manifest came through a transport this compile —
   * cell id → transport name. Recorded on the receipt as provenance. */
  resolvedVia: Map<string, string>;
};

export function outputPortType(
  cell: Cell,
  port: string,
  sigs: { inputs: PortMap; outputs: PortMap },
): PortType {
  const t = sigs.outputs[port];
  if (!t) {
    throw new MorphogenError(
      "MANIFEST_INVALID",
      `cell "${cell.id}" has no output port "${port}"`,
    );
  }
  return t;
}

/** Signature for a cell: what ports it exposes. fn/organism ports come from
 * the registry / sub-manifest interface; input/agent/classifier are declared. */
export function cellSignature(
  cell: Cell,
  fns: FnRegistry,
  children: Map<string, CompiledOrganism>,
): CellPorts {
  switch (cell.kind) {
    case "input":
      return { inputs: {}, outputs: cell.outputs };
    case "const": {
      const outputs: PortMap = {};
      for (const [k, v] of Object.entries(cell.outputs)) {
        const { value: _v, ...pt } = v;
        outputs[k] = pt;
      }
      return { inputs: {}, outputs };
    }
    case "fn": {
      const sig = fns.get(cell.fn);
      if (!sig) {
        throw new MorphogenError(
          "FN_UNKNOWN",
          `cell "${cell.id}" references unknown fn "${cell.fn}"`,
        );
      }
      return {
        inputs: { ...sig.signature.inputs },
        outputs: { ...sig.signature.outputs },
      };
    }
    case "agent":
    case "classifier":
    case "gate":
      return {
        inputs: cell.inputs,
        outputs: { out: agentOutputPortType(cell.output) },
      };
    case "store":
      return {
        inputs: { data: { type: "json" } },
        outputs: { ref: { type: "ref" } },
      };
    case "load":
      return {
        inputs: { ref: { type: "ref" } },
        outputs: { data: { type: "json" } },
      };
    case "slot":
      return cell.mode === "write"
        ? {
            inputs: { data: { type: "json" } },
            outputs: { data: { type: "json" } },
          }
        : { inputs: {}, outputs: { data: { type: "json" } } };
    case "spawn":
      return {
        inputs: {
          manifest: { type: "json" },
          /** Interface-input map for the spawned organism:
           * `{<interface input name>: value}`, same shape an organism cell's
           * declared inputs take. */
          args: { type: "json", optional: true },
        },
        outputs: {
          /** The spawned organism's interface outputs as a record. */
          data: { type: "json" },
          /** The admitted manifest's digest — provenance of what ran. */
          digest: { type: "text" },
        },
      };
    case "organism": {
      const sub = children.get(cell.id);
      if (!sub?.manifest.interface) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `organism cell "${cell.id}" requires a sub-manifest with an interface`,
        );
      }
      return interfaceSignature(cell.id, sub);
    }
    case "repeat": {
      const sub = children.get(cell.id);
      if (!sub?.manifest.interface) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `repeat cell "${cell.id}" requires a sub-manifest with an interface`,
        );
      }
      const sig = interfaceSignature(cell.id, sub);
      const iface = sub.manifest.interface;
      // carry: interface output name → interface input name; a carried input
      // is optional on the repeat cell since round 0 may run without it
      for (const [outName, inName] of Object.entries(cell.carry ?? {})) {
        if (!iface.outputs[outName]) {
          throw new MorphogenError(
            "INTERFACE_MISMATCH",
            `repeat cell "${cell.id}" carry key "${outName}" is not an interface output of "${sub.manifest.key}"`,
          );
        }
        if (!iface.inputs[inName]) {
          throw new MorphogenError(
            "INTERFACE_MISMATCH",
            `repeat cell "${cell.id}" carry target "${inName}" is not an interface input of "${sub.manifest.key}"`,
          );
        }
        sig.inputs[inName] = { ...sig.inputs[inName]!, optional: true };
      }
      if (cell.until) {
        const target = iface.outputs[cell.until.output];
        if (!target) {
          throw new MorphogenError(
            "INTERFACE_MISMATCH",
            `repeat cell "${cell.id}" until.output "${cell.until.output}" is not an interface output of "${sub.manifest.key}"`,
          );
        }
        const pt = sig.outputs[cell.until.output]!;
        if (cell.until.field !== undefined) {
          if (pt.type !== "json") {
            throw new MorphogenError(
              "GUARD_INVALID",
              `repeat cell "${cell.id}" until.field requires a json output, got ${describePort(pt)}`,
            );
          }
        } else if (
          pt.type === "choice" &&
          pt.labels &&
          !pt.labels.includes(cell.until.equals)
        ) {
          throw new MorphogenError(
            "GUARD_INVALID",
            `repeat cell "${cell.id}" until.equals "${cell.until.equals}" not in labels of "${cell.until.output}"`,
          );
        }
      }
      return sig;
    }
    case "each": {
      const sub = children.get(cell.id);
      if (!sub?.manifest.interface) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `each cell "${cell.id}" requires a sub-manifest with an interface`,
        );
      }
      const iface = sub.manifest.interface;
      const sig = interfaceSignature(cell.id, sub);
      if (!iface.inputs[cell.over]) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `each cell "${cell.id}" over "${cell.over}" is not an interface input of "${sub.manifest.key}"`,
        );
      }
      // the over port receives the whole list as a single json value
      sig.inputs[cell.over] = { type: "json" };
      // every interface output becomes a list of per-item results
      for (const name of Object.keys(sig.outputs)) {
        sig.outputs[name] = { ...sig.outputs[name]!, many: true };
      }
      return sig;
    }
  }
}

/** Ports a digest-embedded sub-manifest exposes: interface inputs resolve to
 * the targeted input cell's port types; interface outputs to the targeted
 * cells' output port types. */
function interfaceSignature(
  cellId: string,
  sub: CompiledOrganism,
): CellPorts {
  const iface = sub.manifest.interface!;
  const inputs: PortMap = {};
  for (const [name, target] of Object.entries(iface.inputs)) {
    const inner = sub.manifest.cells.find((c) => c.id === target.cell);
    if (!inner || inner.kind !== "input") {
      throw new MorphogenError(
        "INTERFACE_MISMATCH",
        `interface input "${name}" of "${sub.manifest.key}" must target an input cell`,
      );
    }
    const pt = inner.outputs[target.port];
    if (!pt) {
      throw new MorphogenError(
        "INTERFACE_MISMATCH",
        `interface input "${name}" of "${sub.manifest.key}" targets missing port "${target.cell}.${target.port}"`,
      );
    }
    inputs[name] = pt;
  }
  const outputs: PortMap = {};
  for (const [name, target] of Object.entries(iface.outputs)) {
    const pt = sub.ports.get(target.cell)?.outputs[target.port];
    if (!pt) {
      throw new MorphogenError(
        "INTERFACE_MISMATCH",
        `interface output "${name}" of "${sub.manifest.key}" targets missing port "${target.cell}.${target.port}"`,
      );
    }
    outputs[name] = pt;
  }
  return { inputs, outputs };
}

function mustCell(m: OrganismManifest, id: string): Cell {
  const c = m.cells.find((x) => x.id === id);
  if (!c) {
    throw new MorphogenError(
      "INTERFACE_MISMATCH",
      `organism "${m.key}" interface references missing cell "${id}"`,
    );
  }
  return c;
}

export function agentOutputPortType(o: {
  kind: "text" | "json" | "choice";
  labels?: string[];
}): PortType {
  switch (o.kind) {
    case "text":
      return { type: "text" };
    case "json":
      return { type: "json" };
    case "choice": {
      const out: { type: "choice"; labels?: string[] } = { type: "choice" };
      if (o.labels !== undefined) out.labels = o.labels;
      return out;
    }
  }
}

/** producer → consumer compatibility. A `many` producer carries a list:
 * it feeds a `many` consumer element-wise (the edge flattens) or a `json`
 * consumer as a whole list value; scalar non-json consumers reject it. */
export function portCompatible(producer: PortType, consumer: PortType): boolean {
  // a ref token is not the payload — only ref ports can carry it
  if (producer.type === "ref" || consumer.type === "ref") {
    return producer.type === "ref" && consumer.type === "ref";
  }
  if (producer.many && !consumer.many && consumer.type !== "json") {
    return false;
  }
  if (consumer.type === "json") return true;
  if (producer.type === consumer.type) {
    if (producer.type === "choice" && consumer.type === "choice") {
      if (!producer.labels || !consumer.labels) return true;
      return producer.labels.every((l) => consumer.labels!.includes(l));
    }
    return true;
  }
  return producer.type === "choice" && consumer.type === "text";
}

/** Check and compile: resolves organism sub-manifests from the store,
 * validates structure, rejects cycles. Pure — no execution. */
const MAX_COMPILE_DEPTH = 64;

export async function compileOrganism(
  manifest: OrganismManifest,
  fns: FnRegistry,
  store: Store,
  depth = 0,
  transports?: Record<string, Transport>,
): Promise<CompiledOrganism> {
  if (depth > MAX_COMPILE_DEPTH) {
    throw new MorphogenError(
      "DEPTH_EXCEEDED",
      `embedding chain exceeds compile depth ${MAX_COMPILE_DEPTH}`,
    );
  }
  const seen = new Set<string>();
  for (const cell of manifest.cells) {
    if (seen.has(cell.id)) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `duplicate cell id "${cell.id}"`,
      );
    }
    seen.add(cell.id);
  }

  // resolve organism/repeat children recursively; digest references always
  // point to already-stored manifests, so the embedding graph is acyclic by
  // construction. A `via` cell whose manifest misses locally fetches the
  // closure bundle through the named transport — digests verify on install.
  const children = new Map<string, CompiledOrganism>();
  const resolvedVia = new Map<string, string>();
  for (const cell of manifest.cells) {
    if (cell.kind !== "organism" && cell.kind !== "repeat" && cell.kind !== "each") continue;
    const digest = asDigest(cell.manifest, `cell "${cell.id}".manifest`);
    let sub = await store.getManifest(digest);
    if (!sub && cell.via) {
      const t = transports?.[cell.via];
      if (!t) {
        throw new MorphogenError(
          "STORE_MISS",
          `cell "${cell.id}" manifest ${digest} not in store and transport "${cell.via}" is not configured`,
        );
      }
      const bundle = await t.getBundle(digest);
      if (!bundle) {
        throw new MorphogenError(
          "STORE_MISS",
          `cell "${cell.id}": transport "${cell.via}" has no bundle rooted at ${digest}`,
        );
      }
      await unpackBundle(bundle, store);
      sub = await store.getManifest(digest);
      if (sub) resolvedVia.set(cell.id, cell.via);
    }
    if (!sub) {
      throw new MorphogenError(
        "STORE_MISS",
        `organism cell "${cell.id}" manifest ${digest} not in store`,
      );
    }
    children.set(
      cell.id,
      await compileOrganism(sub, fns, store, depth + 1, transports),
    );
  }

  // signatures
  const ports = new Map<string, CellPorts>();
  for (const cell of manifest.cells) {
    ports.set(cell.id, cellSignature(cell, fns, children));
  }

  // interface integrity (top-level manifest interface)
  if (manifest.interface) {
    for (const [name, t] of Object.entries(manifest.interface.inputs)) {
      const c = mustCell(manifest, t.cell);
      if (c.kind !== "input") {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `interface input "${name}" must target an input cell`,
        );
      }
      if (!c.outputs[t.port]) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `interface input "${name}" targets missing port "${t.cell}.${t.port}"`,
        );
      }
    }
    for (const [name, t] of Object.entries(manifest.interface.outputs)) {
      const sig = ports.get(t.cell)!;
      if (!sig.outputs[t.port]) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `interface output "${name}" targets missing port "${t.cell}.${t.port}"`,
        );
      }
    }
  }

  // edges
  const inbound = new Map<string, { edge: number; port: string }[]>();
  manifest.edges.forEach((e, i) => {
    const from = manifest.cells.find((c) => c.id === e.from.cell);
    const to = manifest.cells.find((c) => c.id === e.to.cell);
    if (!from) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `edge ${i}: unknown from cell "${e.from.cell}"`,
      );
    }
    if (!to) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `edge ${i}: unknown to cell "${e.to.cell}"`,
      );
    }
    const pt = outputPortType(from, e.from.port, ports.get(from.id)!);
    const ct = ports.get(to.id)!.inputs[e.to.port];
    if (!ct) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `edge ${i}: cell "${e.to.cell}" has no input port "${e.to.port}"`,
      );
    }
    if (e.on === "fail") {
      if (e.guard) {
        throw new MorphogenError(
          "GUARD_INVALID",
          `edge ${i}: guard is not valid on an on:"fail" edge`,
        );
      }
      if (ct.type !== "json") {
        throw new MorphogenError(
          "TYPE_MISMATCH",
          `edge ${i}: on:"fail" delivers a failure record — consumer port "${e.to.cell}.${e.to.port}" must be json, got ${describePort(ct)}`,
        );
      }
    } else if (!portCompatible(pt, ct)) {
      throw new MorphogenError(
        "TYPE_MISMATCH",
        `edge ${i}: ${e.from.cell}.${e.from.port} (${describePort(pt)}) cannot feed ${e.to.cell}.${e.to.port} (${describePort(ct)})`,
      );
    }
    if (e.guard) {
      if (e.guard.field !== undefined) {
        if (pt.type !== "json") {
          throw new MorphogenError(
            "GUARD_INVALID",
            `edge ${i}: field guard requires a json producer, got ${describePort(pt)}`,
          );
        }
      } else {
        if (pt.type !== "choice") {
          throw new MorphogenError(
            "GUARD_INVALID",
            `edge ${i}: guard requires a choice producer, got ${describePort(pt)}`,
          );
        }
        if (pt.labels && !pt.labels.includes(e.guard.equals)) {
          throw new MorphogenError(
            "GUARD_INVALID",
            `edge ${i}: guard label "${e.guard.equals}" not in producer labels`,
          );
        }
      }
    }
    const list = inbound.get(to.id) ?? [];
    if (
      list.some(
        (x) =>
          x.port === e.to.port &&
          (manifest.edges[x.edge]!.on === "fail") !== (e.on === "fail"),
      )
    ) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `edge ${i}: input port "${e.to.cell}.${e.to.port}" mixes normal and on:"fail" edges`,
      );
    }
    if (!ct.many && list.some((x) => x.port === e.to.port)) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `edge ${i}: input port "${e.to.cell}.${e.to.port}" already has an edge; inputs are single-assignment`,
      );
    }
    list.push({ edge: i, port: e.to.port });
    inbound.set(to.id, list);
  });

  // agent/classifier/gate views: inputs must be declared inputs; cells must
  // be ancestors (resolved before the viewer can activate); tools must be
  // registry fns the host admits
  const rev = new Map<string, string[]>();
  for (const e of manifest.edges) {
    const list = rev.get(e.to.cell) ?? [];
    list.push(e.from.cell);
    rev.set(e.to.cell, list);
  }
  const ancestorsOf = (id: string): Set<string> => {
    const out = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const p of rev.get(cur) ?? []) {
        if (!out.has(p)) {
          out.add(p);
          stack.push(p);
        }
      }
    }
    return out;
  };
  for (const cell of manifest.cells) {
    if (cell.kind !== "agent" && cell.kind !== "classifier" && cell.kind !== "gate")
      continue;
    if (cell.view.inputs !== "*") {
      for (const name of cell.view.inputs) {
        if (!ports.get(cell.id)!.inputs[name]) {
          throw new MorphogenError(
            "MANIFEST_INVALID",
            `cell "${cell.id}" view.inputs references undeclared input "${name}"`,
          );
        }
      }
    }
    if (cell.view.graph && !cell.view.cells?.length) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `cell "${cell.id}" view.graph requires view.cells — the graph fragment covers named ancestors`,
      );
    }
    if (cell.view.cells?.length) {
      const ancestors = ancestorsOf(cell.id);
      for (const cv of cell.view.cells) {
        if (!ports.has(cv.cell)) {
          throw new MorphogenError(
            "MANIFEST_INVALID",
            `cell "${cell.id}" view.cells references unknown cell "${cv.cell}"`,
          );
        }
        if (!ancestors.has(cv.cell)) {
          throw new MorphogenError(
            "MANIFEST_INVALID",
            `cell "${cell.id}" view.cells names "${cv.cell}", which is not an ancestor — its record would not exist at activation`,
          );
        }
        for (const p of cv.ports ?? []) {
          if (!ports.get(cv.cell)!.outputs[p]) {
            throw new MorphogenError(
              "MANIFEST_INVALID",
              `cell "${cell.id}" view.cells names port "${cv.cell}.${p}", which is not an output port`,
            );
          }
        }
      }
    }
    for (const ref of (cell.kind === "gate" ? [] : cell.tools) ?? []) {
      if (!fns.has(ref)) {
        throw new MorphogenError(
          "FN_UNKNOWN",
          `cell "${cell.id}" declares unknown tool fn "${ref}"`,
        );
      }
    }
  }

  // acyclicity (Kahn)
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const c of manifest.cells) {
    indeg.set(c.id, 0);
    adj.set(c.id, []);
  }
  for (const e of manifest.edges) {
    indeg.set(e.to.cell, (indeg.get(e.to.cell) ?? 0) + 1);
    adj.get(e.from.cell)!.push(e.to.cell);
  }
  const queue = manifest.cells
    .map((c) => c.id)
    .filter((id) => indeg.get(id) === 0);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!;
    visited++;
    for (const next of adj.get(id)!) {
      const d = indeg.get(next)! - 1;
      indeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  if (visited !== manifest.cells.length) {
    throw new MorphogenError(
      "GRAPH_CYCLE",
      "manifest graph contains a cycle; organisms must be acyclic",
    );
  }

  return { manifest, ports, inbound, children, resolvedVia };
}

function describePort(p: PortType): string {
  const t = p.type === "choice"
    ? `choice(${p.labels ? p.labels.join("|") : "*"})`
    : p.type;
  return p.many ? `${t}[]` : t;
}

export function ifaceOrEmpty(i: OrganismInterface | undefined): OrganismInterface {
  return i ?? { inputs: {}, outputs: {} };
}

export function argsForSubOrganism(
  sub: OrganismManifest,
  outerInputs: Record<string, JsonValue>,
): Record<string, Record<string, JsonValue>> {
  const args: Record<string, Record<string, JsonValue>> = {};
  const iface = ifaceOrEmpty(sub.interface);
  for (const [name, target] of Object.entries(iface.inputs)) {
    const v = outerInputs[name];
    if (v === undefined) continue;
    args[target.cell] = { ...(args[target.cell] ?? {}), [target.port]: v };
  }
  return args;
}

export { parseOrganismManifest };
