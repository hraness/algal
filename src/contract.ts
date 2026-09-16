// morphogen.organism.v1 — the organism manifest contract.
//
// A manifest is a finite typed graph: cells with declared ports, edges between
// ports, budgets over the whole run, and an optional interface so the organism
// can be embedded as a cell inside a larger organism. A manifest carries no
// executable code: fn cells name registry refs and agent cells declare prompts,
// context views, output contracts, and routes. The structure is the program.

import { MorphogenError } from "./errors";
import {
  asArray,
  asInt,
  asJsonValue,
  asObject,
  asSafeId,
  asString,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const CONTRACT = "morphogen.organism.v1" as const;

// ---------------------------------------------------------------- bounds ---

export const BOUNDS = {
  maxCells: 64,
  maxEdges: 256,
  maxIdLen: 64,
  maxNameLen: 120,
  maxNoteLen: 2000,
  maxPromptLen: 8192,
  maxLabels: 32,
  maxLabelLen: 64,
  maxRefLen: 64,
  maxTools: 16,
  maxTurns: 16,
  maxPortNameLen: 64,
  maxSteps: 1024,
  maxAgentCalls: 64,
  maxWork: 100_000_000,
  maxContextBytes: 262_144,
  maxOutputBytes: 262_144,
  maxDepth: 8,
  maxEvents: 4096,
  maxArgsBytes: 1_048_576,
  maxSchemaDepth: 4,
  maxInterfacePorts: 32,
} as const;

export const DEFAULT_BUDGETS = {
  maxSteps: 256,
  maxAgentCalls: 16,
  maxWork: 1_000_000,
  maxContextBytes: 65_536,
  maxOutputBytes: 65_536,
  maxDepth: 4,
} as const;

// ----------------------------------------------------------------- types ---

export type PortType =
  | { type: "text"; optional?: boolean }
  | { type: "json"; optional?: boolean }
  | { type: "choice"; optional?: boolean; labels?: string[] };

export type PortName = string;
export type PortMap = Record<PortName, PortType>;

export type AgentOutput =
  | { kind: "text" }
  | { kind: "json"; schema: JsonObject }
  | { kind: "choice"; labels: string[]; onMiss?: string };

export type Route = {
  provider?: string;
  model?: string;
  preset?: string;
};

export type CellBudget = {
  maxContextBytes?: number;
  maxOutputBytes?: number;
  maxTurns?: number;
};

export type AgentView = {
  inputs: "*" | PortName[];
  note?: string;
};

export type Cell =
  | { id: string; kind: "input"; outputs: PortMap }
  | { id: string; kind: "const"; outputs: Record<PortName, PortType & { value: JsonValue }> }
  | { id: string; kind: "fn"; fn: string }
  | {
      id: string;
      kind: "agent";
      inputs: PortMap;
      prompt: string;
      view: AgentView;
      output: AgentOutput;
      route?: Route;
      tools?: string[];
      budget?: CellBudget;
    }
  | {
      id: string;
      kind: "classifier";
      inputs: PortMap;
      prompt: string;
      view: AgentView;
      output: { kind: "choice"; labels: string[]; onMiss?: string };
      route?: Route;
      tools?: string[];
      budget?: CellBudget;
      shadow?: { take: string };
    }
  | { id: string; kind: "organism"; manifest: string };

export type Edge = {
  from: { cell: string; port: PortName };
  to: { cell: string; port: PortName };
  guard?: { equals: string };
};

export type Budgets = {
  maxSteps: number;
  maxAgentCalls: number;
  maxWork: number;
  maxContextBytes: number;
  maxOutputBytes: number;
  maxDepth: number;
};

export type OrganismInterface = {
  inputs: Record<string, { cell: string; port: PortName }>;
  outputs: Record<string, { cell: string; port: PortName }>;
};

export type OrganismManifest = {
  contract: typeof CONTRACT;
  key: string;
  name: string;
  note?: string;
  budgets: Budgets;
  interface?: OrganismInterface;
  cells: Cell[];
  edges: Edge[];
};

// ------------------------------------------------------------- port type ---

function parsePortType(u: unknown, what: string): PortType {
  if (typeof u === "string") {
    if (u === "text" || u === "json" || u === "choice") return { type: u };
    throw new MorphogenError("PARSE_FAILED", `${what}: unknown port type "${u}"`);
  }
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["type", "optional", "labels"], what);
  const type = asString(reqField(obj, "type", what), `${what}.type`, 16);
  if (type !== "text" && type !== "json" && type !== "choice") {
    throw new MorphogenError("PARSE_FAILED", `${what}.type: unknown "${type}"`);
  }
  const optionalRaw = optField(obj, "optional");
  const optional =
    optionalRaw === undefined
      ? undefined
      : optionalRaw === true || optionalRaw === false
        ? optionalRaw
        : fail(`${what}.optional must be a boolean`);
  const labelsRaw = optField(obj, "labels");
  let labels: string[] | undefined;
  if (labelsRaw !== undefined) {
    labels = asArray(labelsRaw, `${what}.labels`).map((l, i) =>
      asString(l, `${what}.labels[${i}]`, BOUNDS.maxLabelLen),
    );
    if (labels.length > BOUNDS.maxLabels) {
      throw new MorphogenError(
        "PARSE_FAILED",
        `${what}.labels exceeds ${BOUNDS.maxLabels}`,
      );
    }
    if (type !== "choice") {
      throw new MorphogenError(
        "PARSE_FAILED",
        `${what}.labels requires type "choice"`,
      );
    }
  }
  if (type === "choice") {
    const out: { type: "choice"; optional?: boolean; labels?: string[] } = {
      type,
    };
    if (labels !== undefined) out.labels = labels;
    if (optional !== undefined) out.optional = optional;
    return out;
  }
  const out: PortType = { type };
  if (optional !== undefined) out.optional = optional;
  return out;
}

function fail(msg: string): never {
  throw new MorphogenError("PARSE_FAILED", msg);
}

function parsePortMap(u: unknown, what: string): PortMap {
  const obj = asObject(u, what);
  if (Object.keys(obj).length > BOUNDS.maxInterfacePorts) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `${what} exceeds ${BOUNDS.maxInterfacePorts} ports`,
    );
  }
  const out: PortMap = {};
  for (const [name, decl] of Object.entries(obj)) {
    asSafeId(name, `${what} port name`);
    out[name] = parsePortType(decl, `${what}.${name}`);
  }
  return out;
}

// ------------------------------------------------------------ agent bits ---

function parseAgentOutput(u: unknown, what: string): AgentOutput {
  const obj = asObject(u, what);
  const kind = asString(reqField(obj, "kind", what), `${what}.kind`, 16);
  switch (kind) {
    case "text": {
      noUnknownKeys(obj, ["kind"], what);
      return { kind: "text" };
    }
    case "json": {
      noUnknownKeys(obj, ["kind", "schema"], what);
      const schema = asObject(reqField(obj, "schema", what), `${what}.schema`);
      checkSchemaDepth(schema, `${what}.schema`, 0);
      return { kind: "json", schema };
    }
    case "choice": {
      noUnknownKeys(obj, ["kind", "labels", "onMiss"], what);
      const labels = asArray(reqField(obj, "labels", what), `${what}.labels`).map(
        (l, i) => asString(l, `${what}.labels[${i}]`, BOUNDS.maxLabelLen),
      );
      if (labels.length === 0 || labels.length > BOUNDS.maxLabels) {
        throw new MorphogenError(
          "PARSE_FAILED",
          `${what}.labels must have 1..${BOUNDS.maxLabels} entries`,
        );
      }
      if (new Set(labels).size !== labels.length) {
        throw new MorphogenError(
          "PARSE_FAILED",
          `${what}.labels must be unique`,
        );
      }
      const out: AgentOutput = { kind: "choice", labels };
      const onMiss = optField(obj, "onMiss");
      if (onMiss !== undefined) {
        const miss = asString(onMiss, `${what}.onMiss`, BOUNDS.maxLabelLen);
        if (!labels.includes(miss)) {
          throw new MorphogenError(
            "PARSE_FAILED",
            `${what}.onMiss "${miss}" is not a declared label`,
          );
        }
        out.onMiss = miss;
      }
      return out;
    }
    default:
      throw new MorphogenError(
        "PARSE_FAILED",
        `${what}.kind: unknown "${kind}"`,
      );
  }
}

function checkSchemaDepth(u: JsonValue, what: string, depth: number): void {
  if (depth > BOUNDS.maxSchemaDepth) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `${what} exceeds schema depth ${BOUNDS.maxSchemaDepth}`,
    );
  }
  if (u !== null && typeof u === "object") {
    const entries = Array.isArray(u)
      ? u.map((v, i) => [`${i}`, v] as const)
      : Object.entries(u);
    for (const [k, v] of entries) {
      checkSchemaDepth(v, `${what}.${k}`, depth + 1);
    }
  }
}

function parseView(u: unknown, what: string): AgentView {
  if (u === undefined) return { inputs: "*" };
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["inputs", "note"], what);
  const inputsRaw = optField(obj, "inputs");
  let inputs: "*" | PortName[] = "*";
  if (inputsRaw !== undefined && inputsRaw !== "*") {
    inputs = asArray(inputsRaw, `${what}.inputs`).map((n, i) =>
      asSafeId(n, `${what}.inputs[${i}]`),
    );
  }
  const note = optField(obj, "note");
  const view: AgentView = { inputs };
  if (note !== undefined) {
    view.note = asString(note, `${what}.note`, BOUNDS.maxNoteLen);
  }
  return view;
}

function parseRoute(u: unknown, what: string): Route {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["provider", "model", "preset"], what);
  const route: Route = {};
  for (const key of ["provider", "model", "preset"] as const) {
    const v = optField(obj, key);
    if (v !== undefined) {
      route[key] = asString(v, `${what}.${key}`, BOUNDS.maxRefLen);
    }
  }
  return route;
}

// ----------------------------------------------------------------- cells ---

function parseCell(u: unknown, what: string): Cell {
  const obj = asObject(u, what);
  const id = asSafeId(reqField(obj, "id", what), `${what}.id`);
  const kind = asString(reqField(obj, "kind", what), `${what}.kind`, 16);

  switch (kind) {
    case "input": {
      noUnknownKeys(obj, ["id", "kind", "outputs"], what);
      return {
        id,
        kind,
        outputs: parsePortMap(
          reqField(obj, "outputs", what),
          `${what}.outputs`,
        ),
      };
    }
    case "const": {
      noUnknownKeys(obj, ["id", "kind", "outputs"], what);
      const raw = asObject(reqField(obj, "outputs", what), `${what}.outputs`);
      if (Object.keys(raw).length > BOUNDS.maxInterfacePorts) {
        throw new MorphogenError(
          "PARSE_FAILED",
          `${what}.outputs exceeds ${BOUNDS.maxInterfacePorts} ports`,
        );
      }
      const outputs: Record<PortName, PortType & { value: JsonValue }> = {};
      for (const [name, decl] of Object.entries(raw)) {
        asSafeId(name, `${what}.outputs port name`);
        const d = asObject(decl, `${what}.outputs.${name}`);
        const pt = parsePortType(d, `${what}.outputs.${name}`);
        const value = reqField(d, "value", `${what}.outputs.${name}`);
        asJsonValue(value, `${what}.outputs.${name}.value`);
        outputs[name] = { ...pt, value: value as JsonValue };
      }
      return { id, kind, outputs };
    }
    case "fn": {
      noUnknownKeys(obj, ["id", "kind", "fn"], what);
      return {
        id,
        kind,
        fn: asString(reqField(obj, "fn", what), `${what}.fn`, BOUNDS.maxRefLen),
      };
    }
    case "organism": {
      noUnknownKeys(obj, ["id", "kind", "manifest"], what);
      return {
        id,
        kind,
        manifest: asString(
          reqField(obj, "manifest", what),
          `${what}.manifest`,
          72,
        ),
      };
    }
    case "agent":
    case "classifier": {
      noUnknownKeys(
        obj,
        [
          "id", "kind", "inputs", "prompt", "view", "output",
          "route", "tools", "budget", "shadow",
        ],
        what,
      );
      const inputs = obj.inputs === undefined
        ? {}
        : parsePortMap(obj.inputs, `${what}.inputs`);
      const prompt = asString(
        reqField(obj, "prompt", what),
        `${what}.prompt`,
        BOUNDS.maxPromptLen,
      );
      const view = parseView(obj.view, `${what}.view`);
      const output = parseAgentOutput(
        reqField(obj, "output", what),
        `${what}.output`,
      );
      const route =
        obj.route === undefined
          ? undefined
          : parseRoute(obj.route, `${what}.route`);
      let budget: CellBudget | undefined;
      if (obj.budget !== undefined) {
        const b = asObject(obj.budget, `${what}.budget`);
        noUnknownKeys(
          b,
          ["maxContextBytes", "maxOutputBytes", "maxTurns"],
          `${what}.budget`,
        );
        budget = {};
        const ctx = optField(b, "maxContextBytes");
        const outB = optField(b, "maxOutputBytes");
        const turns = optField(b, "maxTurns");
        if (ctx !== undefined) {
          budget.maxContextBytes = asInt(
            ctx,
            `${what}.budget.maxContextBytes`,
            1,
            BOUNDS.maxContextBytes,
          );
        }
        if (outB !== undefined) {
          budget.maxOutputBytes = asInt(
            outB,
            `${what}.budget.maxOutputBytes`,
            1,
            BOUNDS.maxOutputBytes,
          );
        }
        if (turns !== undefined) {
          budget.maxTurns = asInt(
            turns,
            `${what}.budget.maxTurns`,
            1,
            BOUNDS.maxTurns,
          );
        }
      }
      let tools: string[] | undefined;
      if (obj.tools !== undefined) {
        tools = asArray(obj.tools, `${what}.tools`).map((t, i) =>
          asString(t, `${what}.tools[${i}]`, BOUNDS.maxRefLen),
        );
        if (tools.length === 0 || tools.length > BOUNDS.maxTools) {
          throw new MorphogenError(
            "PARSE_FAILED",
            `${what}.tools must have 1..${BOUNDS.maxTools} entries`,
          );
        }
        if (new Set(tools).size !== tools.length) {
          throw new MorphogenError(
            "PARSE_FAILED",
            `${what}.tools must be unique`,
          );
        }
      }
      if (kind === "classifier") {
        if (output.kind !== "choice") {
          throw new MorphogenError(
            "PARSE_FAILED",
            `${what}: classifier output must be {kind:"choice"}`,
          );
        }
        if (obj.shadow !== undefined) {
          const s = asObject(obj.shadow, `${what}.shadow`);
          noUnknownKeys(s, ["take"], `${what}.shadow`);
          const take = asString(
            reqField(s, "take", `${what}.shadow`),
            `${what}.shadow.take`,
            BOUNDS.maxLabelLen,
          );
          if (!output.labels.includes(take)) {
            throw new MorphogenError(
              "PARSE_FAILED",
              `${what}.shadow.take must be a declared label`,
            );
          }
          const cell: Cell = {
            id,
            kind,
            inputs,
            prompt,
            view,
            output,
            shadow: { take },
          };
          if (route) cell.route = route;
          if (tools) cell.tools = tools;
          if (budget) cell.budget = budget;
          return cell;
        }
        const cell: Cell = {
          id,
          kind,
          inputs,
          prompt,
          view,
          output,
        };
        if (route) cell.route = route;
        if (tools) cell.tools = tools;
        if (budget) cell.budget = budget;
        return cell;
      }
      const cell: Cell = { id, kind, inputs, prompt, view, output };
      if (route) cell.route = route;
      if (tools) cell.tools = tools;
      if (budget) cell.budget = budget;
      return cell;
    }
    default:
      throw new MorphogenError(
        "PARSE_FAILED",
        `${what}.kind: unknown "${kind}"`,
      );
  }
}

// ----------------------------------------------------------------- edges ---

function parseEdge(u: unknown, what: string): Edge {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["from", "to", "guard"], what);
  const end = (v: unknown, w: string): { cell: string; port: PortName } => {
    const e = asObject(v, w);
    noUnknownKeys(e, ["cell", "port"], w);
    return {
      cell: asSafeId(reqField(e, "cell", w), `${w}.cell`),
      port: asSafeId(reqField(e, "port", w), `${w}.port`),
    };
  };
  const edge: Edge = {
    from: end(reqField(obj, "from", what), `${what}.from`),
    to: end(reqField(obj, "to", what), `${what}.to`),
  };
  const guard = optField(obj, "guard");
  if (guard !== undefined) {
    const g = asObject(guard, `${what}.guard`);
    noUnknownKeys(g, ["equals"], `${what}.guard`);
    edge.guard = {
      equals: asString(
        reqField(g, "equals", `${what}.guard`),
        `${what}.guard.equals`,
        BOUNDS.maxLabelLen,
      ),
    };
  }
  return edge;
}

// --------------------------------------------------------------- budgets ---

function parseBudgets(u: unknown): Budgets {
  const base: Budgets = { ...DEFAULT_BUDGETS };
  if (u === undefined) return base;
  const obj = asObject(u, "budgets");
  noUnknownKeys(
    obj,
    [
      "maxSteps",
      "maxAgentCalls",
      "maxWork",
      "maxContextBytes",
      "maxOutputBytes",
      "maxDepth",
    ],
    "budgets",
  );
  const int = (key: keyof Budgets, min: number, max: number): number | undefined =>
    obj[key] === undefined ? undefined : asInt(obj[key], `budgets.${key}`, min, max);
  base.maxSteps = int("maxSteps", 1, BOUNDS.maxSteps) ?? base.maxSteps;
  base.maxAgentCalls =
    int("maxAgentCalls", 0, BOUNDS.maxAgentCalls) ?? base.maxAgentCalls;
  base.maxWork = int("maxWork", 1, BOUNDS.maxWork) ?? base.maxWork;
  base.maxContextBytes =
    int("maxContextBytes", 1, BOUNDS.maxContextBytes) ?? base.maxContextBytes;
  base.maxOutputBytes =
    int("maxOutputBytes", 1, BOUNDS.maxOutputBytes) ?? base.maxOutputBytes;
  base.maxDepth = int("maxDepth", 0, BOUNDS.maxDepth) ?? base.maxDepth;
  return base;
}

// ------------------------------------------------------------- interface ---

function parseInterface(u: unknown): OrganismInterface | undefined {
  if (u === undefined) return undefined;
  const obj = asObject(u, "interface");
  noUnknownKeys(obj, ["inputs", "outputs"], "interface");
  const end = (
    v: unknown,
    what: string,
  ): Record<string, { cell: string; port: PortName }> => {
    const m = asObject(v, what);
    if (Object.keys(m).length > BOUNDS.maxInterfacePorts) {
      throw new MorphogenError(
        "PARSE_FAILED",
        `${what} exceeds ${BOUNDS.maxInterfacePorts} ports`,
      );
    }
    const out: Record<string, { cell: string; port: PortName }> = {};
    for (const [name, target] of Object.entries(m)) {
      asSafeId(name, `${what} port name`);
      const t = asObject(target, `${what}.${name}`);
      noUnknownKeys(t, ["cell", "port"], `${what}.${name}`);
      out[name] = {
        cell: asSafeId(reqField(t, "cell", `${what}.${name}`), `${what}.${name}.cell`),
        port: asSafeId(reqField(t, "port", `${what}.${name}`), `${what}.${name}.port`),
      };
    }
    return out;
  };
  return {
    inputs:
      obj.inputs === undefined ? {} : end(obj.inputs, "interface.inputs"),
    outputs:
      obj.outputs === undefined ? {} : end(obj.outputs, "interface.outputs"),
  };
}

// ------------------------------------------------------------- manifest ----

export function parseOrganismManifest(u: unknown): OrganismManifest {
  const what = "manifest";
  const obj = asObject(u, what);
  noUnknownKeys(
    obj,
    ["contract", "key", "name", "note", "budgets", "interface", "cells", "edges"],
    what,
  );
  const contract = asString(reqField(obj, "contract", what), `${what}.contract`, 64);
  if (contract !== CONTRACT) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `manifest.contract must be "${CONTRACT}" (got "${contract}")`,
    );
  }
  const key = asString(reqField(obj, "key", what), `${what}.key`, BOUNDS.maxIdLen);
  if (!/^organism:[a-z][a-z0-9-]*$/.test(key)) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `manifest.key must match "organism:<kebab-key>"`,
    );
  }
  const name = asString(reqField(obj, "name", what), `${what}.name`, BOUNDS.maxNameLen);
  const manifest: OrganismManifest = {
    contract: CONTRACT,
    key,
    name,
    budgets: parseBudgets(obj.budgets),
    cells: asArray(reqField(obj, "cells", what), `${what}.cells`).map((c, i) =>
      parseCell(c, `${what}.cells[${i}]`),
    ),
    edges:
      obj.edges === undefined
        ? []
        : asArray(obj.edges, `${what}.edges`).map((e, i) =>
            parseEdge(e, `${what}.edges[${i}]`),
          ),
  };
  const note = optField(obj, "note");
  if (note !== undefined) {
    manifest.note = asString(note, `${what}.note`, BOUNDS.maxNoteLen);
  }
  const iface = parseInterface(obj.interface);
  if (iface) manifest.interface = iface;

  if (manifest.cells.length > BOUNDS.maxCells) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `manifest.cells exceeds ${BOUNDS.maxCells}`,
    );
  }
  if (manifest.edges.length > BOUNDS.maxEdges) {
    throw new MorphogenError(
      "PARSE_FAILED",
      `manifest.edges exceeds ${BOUNDS.maxEdges}`,
    );
  }
  return manifest;
}

export function manifestToJson(m: OrganismManifest): JsonObject {
  const budgets: JsonObject = {
    maxAgentCalls: m.budgets.maxAgentCalls,
    maxContextBytes: m.budgets.maxContextBytes,
    maxDepth: m.budgets.maxDepth,
    maxOutputBytes: m.budgets.maxOutputBytes,
    maxSteps: m.budgets.maxSteps,
    maxWork: m.budgets.maxWork,
  };
  const cellJson = (c: Cell): JsonObject => {
    switch (c.kind) {
      case "input":
        return { id: c.id, kind: c.kind, outputs: portMapJson(c.outputs) };
      case "const": {
        const o: JsonObject = {};
        for (const [k, v] of Object.entries(c.outputs)) {
          const pd = portTypeJson(v);
          pd.value = v.value;
          o[k] = pd;
        }
        return { id: c.id, kind: c.kind, outputs: o };
      }
      case "fn":
        return { id: c.id, kind: c.kind, fn: c.fn };
      case "organism":
        return { id: c.id, kind: c.kind, manifest: c.manifest };
      case "agent":
      case "classifier": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          prompt: c.prompt,
          view: viewJson(c.view),
          output: outputJson(c.output),
        };
        if (Object.keys(c.inputs).length > 0) o.inputs = portMapJson(c.inputs);
        if (c.route) o.route = routeJson(c.route);
        if (c.tools) o.tools = c.tools;
        if (c.kind === "classifier" && c.shadow) o.shadow = { take: c.shadow.take };
        if (c.budget) {
          const b: JsonObject = {};
          if (c.budget.maxContextBytes !== undefined)
            b.maxContextBytes = c.budget.maxContextBytes;
          if (c.budget.maxOutputBytes !== undefined)
            b.maxOutputBytes = c.budget.maxOutputBytes;
          if (c.budget.maxTurns !== undefined)
            b.maxTurns = c.budget.maxTurns;
          o.budget = b;
        }
        return o;
      }
    }
  };
  const out: JsonObject = {
    contract: m.contract,
    key: m.key,
    name: m.name,
    budgets,
    cells: m.cells.map(cellJson),
    edges: m.edges.map((e) => {
      const o: JsonObject = {
        from: { cell: e.from.cell, port: e.from.port },
        to: { cell: e.to.cell, port: e.to.port },
      };
      if (e.guard) o.guard = { equals: e.guard.equals };
      return o;
    }),
  };
  if (m.note !== undefined) out.note = m.note;
  if (m.interface) {
    const mapEnds = (m2: Record<string, { cell: string; port: string }>) => {
      const o: JsonObject = {};
      for (const [k, v] of Object.entries(m2)) {
        o[k] = { cell: v.cell, port: v.port };
      }
      return o;
    };
    out.interface = {
      inputs: mapEnds(m.interface.inputs),
      outputs: mapEnds(m.interface.outputs),
    };
  }
  return out;
}

function portMapJson(m: PortMap): JsonObject {
  const o: JsonObject = {};
  for (const [k, v] of Object.entries(m)) o[k] = portTypeJson(v);
  return o;
}

function portTypeJson(p: PortType): JsonObject {
  const o: JsonObject = { type: p.type };
  if (p.optional) o.optional = true;
  if (p.type === "choice" && p.labels) o.labels = p.labels;
  return o;
}

function viewJson(v: AgentView): JsonObject {
  const o: JsonObject = { inputs: v.inputs === "*" ? "*" : v.inputs };
  if (v.note !== undefined) o.note = v.note;
  return o;
}

function outputJson(o: AgentOutput): JsonObject {
  switch (o.kind) {
    case "text":
      return { kind: "text" };
    case "json":
      return { kind: "json", schema: o.schema };
    case "choice": {
      const r: JsonObject = { kind: "choice", labels: o.labels };
      if (o.onMiss !== undefined) r.onMiss = o.onMiss;
      return r;
    }
  }
}

function routeJson(r: Route): JsonObject {
  const o: JsonObject = {};
  if (r.provider !== undefined) o.provider = r.provider;
  if (r.model !== undefined) o.model = r.model;
  if (r.preset !== undefined) o.preset = r.preset;
  return o;
}
