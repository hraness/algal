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
import type { JsonValue } from "./values";

export type CellPorts = { inputs: PortMap; outputs: PortMap };

export type CompiledOrganism = {
  manifest: OrganismManifest;
  ports: Map<string, CellPorts>;
  inbound: Map<string, { edge: number; port: string }[]>;
  /** Compiled sub-organisms for organism cells, keyed by cell id. */
  children: Map<string, CompiledOrganism>;
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
    case "organism": {
      const sub = children.get(cell.id);
      if (!sub?.manifest.interface) {
        throw new MorphogenError(
          "INTERFACE_MISMATCH",
          `organism cell "${cell.id}" requires a sub-manifest with an interface`,
        );
      }
      const inputs: PortMap = {};
      for (const [name, target] of Object.entries(sub.manifest.interface.inputs)) {
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
      for (const [name, target] of Object.entries(sub.manifest.interface.outputs)) {
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
  }
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

/** producer → consumer compatibility. */
export function portCompatible(producer: PortType, consumer: PortType): boolean {
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

  // resolve organism children recursively; digest references always point to
  // already-stored manifests, so the embedding graph is acyclic by construction
  const children = new Map<string, CompiledOrganism>();
  for (const cell of manifest.cells) {
    if (cell.kind !== "organism") continue;
    const digest = asDigest(cell.manifest, `cell "${cell.id}".manifest`);
    const sub = await store.getManifest(digest);
    if (!sub) {
      throw new MorphogenError(
        "STORE_MISS",
        `organism cell "${cell.id}" manifest ${digest} not in store`,
      );
    }
    children.set(cell.id, await compileOrganism(sub, fns, store, depth + 1));
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
    if (!portCompatible(pt, ct)) {
      throw new MorphogenError(
        "TYPE_MISMATCH",
        `edge ${i}: ${e.from.cell}.${e.from.port} (${describePort(pt)}) cannot feed ${e.to.cell}.${e.to.port} (${describePort(ct)})`,
      );
    }
    if (e.guard) {
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
    const list = inbound.get(to.id) ?? [];
    if (list.some((x) => x.port === e.to.port)) {
      throw new MorphogenError(
        "MANIFEST_INVALID",
        `edge ${i}: input port "${e.to.cell}.${e.to.port}" already has an edge; inputs are single-assignment`,
      );
    }
    list.push({ edge: i, port: e.to.port });
    inbound.set(to.id, list);
  });

  // agent/classifier view inputs must be declared inputs; tools must be
  // registry fns the host admits
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

  return { manifest, ports, inbound, children };
}

function describePort(p: PortType): string {
  return p.type === "choice"
    ? `choice(${p.labels ? p.labels.join("|") : "*"})`
    : p.type;
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
