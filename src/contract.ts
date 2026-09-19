// algal.organism.v1 — the organism manifest contract.
//
// A manifest is a finite typed graph: cells with declared ports, edges between
// ports, budgets over the whole run, and an optional interface so the organism
// can be embedded as a cell inside a larger organism. A manifest carries no
// host code: fn cells name registry refs, agent cells declare prompts and
// contracts, and expr cells carry bounded contract-interpreted programs as
// data (algal.expr.v1). The structure is the program.

import { AlgalError } from "./errors";
import { checkProgram } from "./expr";
import {
  parseDecisionQuestions,
  type DecisionQuestions,
} from "./decisions";
import { checkEmbedderSpec } from "./embeddings";
import type { Digest } from "./digest";
import {
  asArray,
  asInt,
  asJsonValue,
  asObject,
  asSafeId,
  asString,
  canonicalBytes,
  noUnknownKeys,
  optField,
  reqField,
  type JsonObject,
  type JsonValue,
} from "./values";

export const CONTRACT = "algal.organism.v1" as const;

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
  /** Tool-log tail entries a compact policy may pin from keep/drop triage. */
  maxToolLogPinned: 8,
  /** Recall cells return at most this many hits. */
  maxRecallK: 32,
  /** A recall query is bounded text — the expr program's output limit. */
  maxRecallQueryBytes: 4096,
  maxViewCells: 16,
  maxRounds: 16,
  maxEachItems: 64,
  maxPortNameLen: 64,
  maxSteps: 1024,
  maxAgentCalls: 64,
  maxWork: 100_000_000,
  maxContextBytes: 262_144,
  maxOutputBytes: 262_144,
  maxDepth: 8,
  maxEvents: 4096,
  maxArgsBytes: 1_048_576,
  maxBlobBytes: 262_144,
  maxRetryAttempts: 8,
  /** One bundle file a transport reads — closure of manifests + values. */
  maxBundleBytes: 67_108_864,
  maxTransports: 16,
  /** Per-effect-call wall-clock bound ceiling — 10 minutes. */
  maxEffectMs: 600_000,
  /** Fuel budget for a single `expr` cell activation. */
  maxExprFuel: 100_000,
  /** A single port value — produced or collected — never exceeds this.
   * Larger payloads go through `store` cells and `ref` tokens. */
  maxValueBytes: 262_144,
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
  | { type: "text"; optional?: boolean; many?: boolean }
  | {
      type: "json";
      optional?: boolean;
      many?: boolean;
      /** bounded schema subset — same shape as agent json output contracts */
      schema?: JsonObject;
    }
  | { type: "choice"; optional?: boolean; many?: boolean; labels?: string[] }
  | { type: "ref"; optional?: boolean; many?: boolean };

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
  /** Wall-clock bound per effect call, in milliseconds. Enforcement only —
   * receipts record the timeout as an effect error, never the clock. */
  maxEffectMs?: number;
};

export type CellView = { cell: string; ports?: PortName[] };

/** Recorded tool-log compaction policy for `agent` cells. When the
 * canonical tool log exceeds `maxLogBytes`, the runtime issues a `decide`
 * effect asking a noul keep-question per unpinned entry; dropped entries
 * leave the log verbatim and the decision is an ordinary replayable effect.
 * Compaction preserves sources — kept entries are byte-identical. */
export type CompactPolicy = {
  /** Trigger threshold on canonical toolLog bytes (1..maxContextBytes). */
  maxLogBytes: number;
  /** Pinned tail entries never considered for dropping (0..8). */
  keepRecent?: number;
  /** Independent executor route for the keep/drop decisions — a cheap
   * decision provider can compact while a frontier model runs the cell. */
  route?: Route;
};

export type AgentView = {
  inputs: "*" | PortName[];
  /** Ancestor cell ids whose records (status + committed outputs) enter the
   * context under `cells`. Ancestor-only: the manifest is rejected when a
   * named cell cannot have resolved before this cell activates. `ports`
   * slices the ancestor's outputs; absent means all ports. */
  cells?: CellView[];
  /** When true and `cells` is declared, the effect context carries `graph`:
   * the edges among the named cells plus edges from them to this cell —
   * the wiring of the slice the agent can see. */
  graph?: boolean;
  note?: string;
};

export type Cell =
  | { id: string; kind: "input"; outputs: PortMap }
  | { id: string; kind: "const"; outputs: Record<PortName, PortType & { value: JsonValue }> }
  | { id: string; kind: "fn"; fn: string }
  /** `expr` evaluates a bounded pure `algal.expr.v1` program over its input
   * ports — where `fn` composes host-registered functions, `expr` carries the
   * program itself as manifest data: contract-interpreted, fuel-metered, and
   * effect-free, so replay is exact. The value binds to the single port
   * `out`; `output` follows the agent output contract. */
  | {
      id: string;
      kind: "expr";
      inputs: PortMap;
      expr: { contract: "algal.expr.v1"; program: JsonValue };
      output: AgentOutput;
    }
  | { id: string; kind: "tool"; tool: string; budget?: { maxEffectMs?: number } }
  | {
      id: string;
      kind: "agent";
      inputs: PortMap;
      prompt: string;
      view: AgentView;
      output: AgentOutput;
      route?: Route;
      tools?: string[];
      compact?: CompactPolicy;
      budget?: CellBudget;
      retry?: { attempts: number };
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
      retry?: { attempts: number };
    }
  | {
      id: string;
      kind: "repeat";
      manifest: Digest;
      maxRounds: number;
      carry?: Record<string, string>;
      until?: { output: string; equals: string; field?: string };
      via?: string;
    }
  | {
      id: string;
      kind: "each";
      manifest: Digest;
      over: PortName;
      maxItems: number;
      via?: string;
    }
  | {
      id: string;
      kind: "gate";
      inputs: PortMap;
      prompt: string;
      view: AgentView;
      output: { kind: "choice"; labels: string[]; onMiss?: string };
      route?: Route;
      budget?: CellBudget;
      retry?: { attempts: number };
    }
  | {
      /** A declared typed-decision probe: `noul`/`choice`/`score` questions
       * over the cell's input state, answered by whichever decision provider
       * the host routes (Jev today). The provider decides — it never
       * generates — so the output contract is derived, not declared. */
      id: string;
      kind: "decide";
      inputs: PortMap;
      prompt?: string;
      questions: DecisionQuestions;
      view: AgentView;
      route?: Route;
      budget?: CellBudget;
      retry?: { attempts: number };
    }
  | {
      /** Bounded semantic-recall probe: an `algal.expr.v1` program over the
       * cell's inputs produces a text query; the host's derived semantic
       * index answers with ranked hits as a recorded effect — replayable
       * like any other, and composable downstream (`ref` hits feed `load`). */
      id: string;
      kind: "recall";
      inputs: PortMap;
      query: { contract: "algal.expr.v1"; program: JsonValue };
      k?: number;
      embedder?: string;
      route?: Route;
      budget?: CellBudget;
      retry?: { attempts: number };
    }
  | { id: string; kind: "organism"; manifest: string; via?: string }
  /** `store` writes its `data` input into the content-addressed store and
   * produces a `ref`; `load` resolves a `ref` back to its payload. The only
   * IO cells — payloads live in CAS, only digest tokens ride edges. */
  | { id: string; kind: "store" }
  | { id: string; kind: "load" }
  /** `slot` is durable, mutable state: a named cell in the store that
   * persists across runs. `read` emits the stored value (or `default` when
   * the slot is empty); `write` stores its `data` input and echoes it.
   * Reads are nondeterministic input — like effects, the served value is
   * recorded on the cell receipt and replayed verbatim by `verify`. Names
   * share one flat space across organisms: two organisms naming the same
   * slot share memory on purpose. */
  | {
      id: string;
      kind: "slot";
      name: string;
      mode: "read" | "write";
      /** Read mode only: emitted when the slot has never been written. */
      default?: JsonValue;
    }
  /** `spawn` runs a manifest delivered as *data*: a json producer (usually
   * an agent) emits an organism manifest, and the cell parses it through the
   * same contract, admits it to the store by digest, and runs it under the
   * root manifest's budgets and depth bound. This is the honest first form
   * of breeding — the emitted program is still data, still bounded, still
   * fully on the receipt, and its digest is the spawned run's provenance. */
  | { id: string; kind: "spawn" };

export type Edge = {
  from: { cell: string; port: PortName };
  to: { cell: string; port: PortName };
  /** Bare `{equals}` guards a choice producer by label; `{field, equals}`
   * guards a json producer by a string field of the delivered record.
   * `{expr}` evaluates an `algal.expr.v1` program over `{"value": produced}`
   * and must return a boolean — routing logic as data on any producer type. */
  guard?:
    | { equals: string; field?: string }
    | { expr: { contract: "algal.expr.v1"; program: JsonValue } };
  /** "fail": the edge fires when the producer's activation fails and
   * delivers the failure record {code, message} — the producer port is
   * still named (uniform grammar) but the delivered value is the record.
   * A failed cell with no fail edge fails the run; with one, the failure
   * is handled by structure. */
  on?: "fail";
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
    if (u === "text" || u === "json" || u === "choice" || u === "ref") {
      return { type: u };
    }
    throw new AlgalError("PARSE_FAILED", `${what}: unknown port type "${u}"`);
  }
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["type", "optional", "many", "labels", "schema"], what);
  const type = asString(reqField(obj, "type", what), `${what}.type`, 16);
  if (
    type !== "text" &&
    type !== "json" &&
    type !== "choice" &&
    type !== "ref"
  ) {
    throw new AlgalError("PARSE_FAILED", `${what}.type: unknown "${type}"`);
  }
  const asBool = (v: unknown, name: string) =>
    v === true || v === false ? v : fail(`${what}.${name} must be a boolean`);
  const optionalRaw = optField(obj, "optional");
  const optional =
    optionalRaw === undefined ? undefined : asBool(optionalRaw, "optional");
  const manyRaw = optField(obj, "many");
  const many = manyRaw === undefined ? undefined : asBool(manyRaw, "many");
  const labelsRaw = optField(obj, "labels");
  let labels: string[] | undefined;
  if (labelsRaw !== undefined) {
    labels = asArray(labelsRaw, `${what}.labels`).map((l, i) =>
      asString(l, `${what}.labels[${i}]`, BOUNDS.maxLabelLen),
    );
    if (labels.length > BOUNDS.maxLabels) {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.labels exceeds ${BOUNDS.maxLabels}`,
      );
    }
    if (type !== "choice") {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.labels requires type "choice"`,
      );
    }
  }
  const schemaRaw = optField(obj, "schema");
  let schema: JsonObject | undefined;
  if (schemaRaw !== undefined) {
    if (type !== "json") {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.schema requires type "json"`,
      );
    }
    schema = asObject(schemaRaw, `${what}.schema`);
    checkSchemaDepth(schema, `${what}.schema`, 0);
  }
  if (type === "choice") {
    const out: {
      type: "choice";
      optional?: boolean;
      many?: boolean;
      labels?: string[];
    } = { type };
    if (labels !== undefined) out.labels = labels;
    if (optional !== undefined) out.optional = optional;
    if (many !== undefined) out.many = many;
    return out;
  }
  const out: PortType = { type };
  if (schema !== undefined && out.type === "json") out.schema = schema;
  if (optional !== undefined) out.optional = optional;
  if (many !== undefined) out.many = many;
  return out;
}

function fail(msg: string): never {
  throw new AlgalError("PARSE_FAILED", msg);
}

export function parsePortMap(
  u: unknown,
  what: string,
  role: "consumer" | "producer" = "consumer",
): PortMap {
  const obj = asObject(u, what);
  if (Object.keys(obj).length > BOUNDS.maxInterfacePorts) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${what} exceeds ${BOUNDS.maxInterfacePorts} ports`,
    );
  }
  const out: PortMap = {};
  for (const [name, decl] of Object.entries(obj)) {
    asSafeId(name, `${what} port name`);
    const pt = parsePortType(decl, `${what}.${name}`);
    if (role === "producer" && pt.many) {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.${name}: many is only valid on input ports`,
      );
    }
    out[name] = pt;
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
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.labels must have 1..${BOUNDS.maxLabels} entries`,
        );
      }
      if (new Set(labels).size !== labels.length) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.labels must be unique`,
        );
      }
      const out: AgentOutput = { kind: "choice", labels };
      const onMiss = optField(obj, "onMiss");
      if (onMiss !== undefined) {
        const miss = asString(onMiss, `${what}.onMiss`, BOUNDS.maxLabelLen);
        if (!labels.includes(miss)) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.onMiss "${miss}" is not a declared label`,
          );
        }
        out.onMiss = miss;
      }
      return out;
    }
    default:
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.kind: unknown "${kind}"`,
      );
  }
}

function checkSchemaDepth(u: JsonValue, what: string, depth: number): void {
  if (depth > BOUNDS.maxSchemaDepth) {
    throw new AlgalError(
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
  noUnknownKeys(obj, ["inputs", "cells", "graph", "note"], what);
  const inputsRaw = optField(obj, "inputs");
  let inputs: "*" | PortName[] = "*";
  if (inputsRaw !== undefined && inputsRaw !== "*") {
    inputs = asArray(inputsRaw, `${what}.inputs`).map((n, i) =>
      asSafeId(n, `${what}.inputs[${i}]`),
    );
  }
  const cellsRaw = optField(obj, "cells");
  let cells: CellView[] | undefined;
  if (cellsRaw !== undefined) {
    cells = asArray(cellsRaw, `${what}.cells`).map((n, i) => {
      const at = `${what}.cells[${i}]`;
      if (typeof n === "string") return { cell: asSafeId(n, at) };
      const e = asObject(n, at);
      noUnknownKeys(e, ["cell", "ports"], at);
      const cv: CellView = {
        cell: asSafeId(reqField(e, "cell", at), `${at}.cell`),
      };
      const ps = optField(e, "ports");
      if (ps !== undefined) {
        cv.ports = asArray(ps, `${at}.ports`).map((p, j) =>
          asSafeId(p, `${at}.ports[${j}]`),
        );
        if (cv.ports.length === 0 || cv.ports.length > BOUNDS.maxInterfacePorts) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${at}.ports must have 1..${BOUNDS.maxInterfacePorts} entries`,
          );
        }
        if (new Set(cv.ports).size !== cv.ports.length) {
          throw new AlgalError("PARSE_FAILED", `${at}.ports must be unique`);
        }
      }
      return cv;
    });
    if (cells.length === 0 || cells.length > BOUNDS.maxViewCells) {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.cells must have 1..${BOUNDS.maxViewCells} entries`,
      );
    }
    if (new Set(cells.map((c) => c.cell)).size !== cells.length) {
      throw new AlgalError("PARSE_FAILED", `${what}.cells must be unique`);
    }
  }
  const graphRaw = optField(obj, "graph");
  const note = optField(obj, "note");
  const view: AgentView = { inputs };
  if (cells) view.cells = cells;
  if (graphRaw !== undefined) {
    if (graphRaw !== true && graphRaw !== false) {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.graph must be a boolean`,
      );
    }
    view.graph = graphRaw;
  }
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
          "producer",
        ),
      };
    }
    case "const": {
      noUnknownKeys(obj, ["id", "kind", "outputs"], what);
      const raw = asObject(reqField(obj, "outputs", what), `${what}.outputs`);
      if (Object.keys(raw).length > BOUNDS.maxInterfacePorts) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.outputs exceeds ${BOUNDS.maxInterfacePorts} ports`,
        );
      }
      const outputs: Record<PortName, PortType & { value: JsonValue }> = {};
      for (const [name, decl] of Object.entries(raw)) {
        asSafeId(name, `${what}.outputs port name`);
        const d = asObject(decl, `${what}.outputs.${name}`);
        // `value` is the const payload, not a port-type field — split it off
        // before type parsing so parsePortType's unknown-key check still bites
        const value = reqField(d, "value", `${what}.outputs.${name}`);
        asJsonValue(value, `${what}.outputs.${name}.value`);
        const { value: _v, ...typeDecl } = d;
        const pt = parsePortType(typeDecl, `${what}.outputs.${name}`);
        if (pt.many) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.outputs.${name}: many is only valid on input ports`,
          );
        }
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
    case "expr": {
      noUnknownKeys(obj, ["id", "kind", "inputs", "expr", "output"], what);
      const inputs =
        obj.inputs === undefined
          ? {}
          : parsePortMap(obj.inputs, `${what}.inputs`);
      const expr = asObject(reqField(obj, "expr", what), `${what}.expr`);
      noUnknownKeys(expr, ["contract", "program"], `${what}.expr`);
      if (expr.contract !== "algal.expr.v1") {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.expr.contract must be "algal.expr.v1"`,
        );
      }
      const program = asJsonValue(
        reqField(expr, "program", `${what}.expr`),
        `${what}.expr.program`,
      );
      const output = parseAgentOutput(
        reqField(obj, "output", what),
        `${what}.output`,
      );
      if (output.kind === "choice" && output.onMiss !== undefined) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.output.onMiss has no meaning on expr cells — a program returns exact values`,
        );
      }
      const check = checkProgram(program, Object.keys(inputs));
      if (!check.ok) {
        const { code, ...details } = check.err;
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.expr.program: ${code} ${JSON.stringify(details)}`,
        );
      }
      return {
        id,
        kind,
        inputs,
        expr: { contract: "algal.expr.v1", program },
        output,
      };
    }
    case "tool": {
      noUnknownKeys(obj, ["id", "kind", "tool", "budget"], what);
      const cell: Cell = {
        id,
        kind,
        tool: asString(reqField(obj, "tool", what), `${what}.tool`, BOUNDS.maxRefLen),
      };
      if (obj.budget !== undefined) {
        const budget = asObject(obj.budget, `${what}.budget`);
        noUnknownKeys(budget, ["maxEffectMs"], `${what}.budget`);
        const maxEffectMs = optField(budget, "maxEffectMs");
        cell.budget = maxEffectMs === undefined
          ? {}
          : {
              maxEffectMs: asInt(
                maxEffectMs,
                `${what}.budget.maxEffectMs`,
                1,
                BOUNDS.maxEffectMs,
              ),
            };
      }
      return cell;
    }
    case "store":
    case "load":
    case "spawn": {
      noUnknownKeys(obj, ["id", "kind"], what);
      return { id, kind };
    }
    case "slot": {
      noUnknownKeys(obj, ["id", "kind", "name", "mode", "default"], what);
      const name = asSafeId(reqField(obj, "name", what), `${what}.name`);
      const modeRaw = asString(reqField(obj, "mode", what), `${what}.mode`, 8);
      if (modeRaw !== "read" && modeRaw !== "write") {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.mode must be "read" or "write"`,
        );
      }
      const mode = modeRaw;
      const cell: Cell = { id, kind, name, mode };
      const def = optField(obj, "default");
      if (def !== undefined) {
        if (mode !== "read") {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.default is only valid on read-mode slot cells`,
          );
        }
        asJsonValue(def, `${what}.default`);
        if (canonicalBytes(def as JsonValue) > BOUNDS.maxValueBytes) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.default exceeds maxValueBytes ${BOUNDS.maxValueBytes}B`,
          );
        }
        cell.default = def as JsonValue;
      }
      return cell;
    }
    case "organism": {
      noUnknownKeys(obj, ["id", "kind", "manifest", "via"], what);
      const cell: Cell = {
        id,
        kind,
        manifest: asString(
          reqField(obj, "manifest", what),
          `${what}.manifest`,
          72,
        ) as Digest,
      };
      const via = optField(obj, "via");
      if (via !== undefined) {
        cell.via = asSafeId(via, `${what}.via`);
      }
      return cell;
    }
    case "repeat": {
      noUnknownKeys(
        obj,
        ["id", "kind", "manifest", "maxRounds", "carry", "until", "via"],
        what,
      );
      const cell: Cell = {
        id,
        kind,
        manifest: asString(
          reqField(obj, "manifest", what),
          `${what}.manifest`,
          72,
        ) as Digest,
        maxRounds: asInt(
          reqField(obj, "maxRounds", what),
          `${what}.maxRounds`,
          1,
          BOUNDS.maxRounds,
        ),
      };
      const carry = optField(obj, "carry");
      if (carry !== undefined) {
        const cm = asObject(carry, `${what}.carry`);
        if (Object.keys(cm).length > BOUNDS.maxInterfacePorts) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.carry exceeds ${BOUNDS.maxInterfacePorts} entries`,
          );
        }
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(cm)) {
          out[asSafeId(k, `${what}.carry key`)] = asSafeId(
            v,
            `${what}.carry.${k}`,
          );
        }
        cell.carry = out;
      }
      const until = optField(obj, "until");
      if (until !== undefined) {
        const uo = asObject(until, `${what}.until`);
        noUnknownKeys(uo, ["output", "equals", "field"], `${what}.until`);
        cell.until = {
          output: asSafeId(
            reqField(uo, "output", `${what}.until`),
            `${what}.until.output`,
          ),
          equals: asString(
            reqField(uo, "equals", `${what}.until`),
            `${what}.until.equals`,
            BOUNDS.maxLabelLen,
          ),
        };
        const uf = optField(uo, "field");
        if (uf !== undefined) {
          cell.until.field = asSafeId(uf, `${what}.until.field`);
        }
      }
      const via = optField(obj, "via");
      if (via !== undefined) {
        cell.via = asSafeId(via, `${what}.via`);
      }
      return cell;
    }
    case "each": {
      noUnknownKeys(
        obj,
        ["id", "kind", "manifest", "over", "maxItems", "via"],
        what,
      );
      const cell: Cell = {
        id,
        kind,
        manifest: asString(
          reqField(obj, "manifest", what),
          `${what}.manifest`,
          72,
        ) as Digest,
        over: asSafeId(reqField(obj, "over", what), `${what}.over`),
        maxItems: asInt(
          reqField(obj, "maxItems", what),
          `${what}.maxItems`,
          1,
          BOUNDS.maxEachItems,
        ),
      };
      const via = optField(obj, "via");
      if (via !== undefined) {
        cell.via = asSafeId(via, `${what}.via`);
      }
      return cell;
    }
    case "agent":
    case "classifier":
    case "gate": {
      noUnknownKeys(
        obj,
        [
          "id", "kind", "inputs", "prompt", "view", "output",
          "route", "tools", "compact", "budget", "shadow", "retry",
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
          ["maxContextBytes", "maxOutputBytes", "maxTurns", "maxEffectMs"],
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
        const ems = optField(b, "maxEffectMs");
        if (ems !== undefined) {
          budget.maxEffectMs = asInt(
            ems,
            `${what}.budget.maxEffectMs`,
            1,
            BOUNDS.maxEffectMs,
          );
        }
      }
      let tools: string[] | undefined;
      if (obj.tools !== undefined) {
        tools = asArray(obj.tools, `${what}.tools`).map((t, i) =>
          asString(t, `${what}.tools[${i}]`, BOUNDS.maxRefLen),
        );
        if (tools.length === 0 || tools.length > BOUNDS.maxTools) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.tools must have 1..${BOUNDS.maxTools} entries`,
          );
        }
        if (new Set(tools).size !== tools.length) {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}.tools must be unique`,
          );
        }
      }
      let compact: CompactPolicy | undefined;
      if (obj.compact !== undefined) {
        const c = asObject(obj.compact, `${what}.compact`);
        noUnknownKeys(c, ["maxLogBytes", "keepRecent", "route"], `${what}.compact`);
        compact = {
          maxLogBytes: asInt(
            reqField(c, "maxLogBytes", `${what}.compact`),
            `${what}.compact.maxLogBytes`,
            1,
            BOUNDS.maxContextBytes,
          ),
        };
        const recent = optField(c, "keepRecent");
        if (recent !== undefined) {
          compact.keepRecent = asInt(
            recent,
            `${what}.compact.keepRecent`,
            0,
            BOUNDS.maxToolLogPinned,
          );
        }
        if (c.route !== undefined) {
          compact.route = parseRoute(c.route, `${what}.compact.route`);
        }
      }
      let retry: { attempts: number } | undefined;
      if (obj.retry !== undefined) {
        const r = asObject(obj.retry, `${what}.retry`);
        noUnknownKeys(r, ["attempts"], `${what}.retry`);
        retry = {
          attempts: asInt(
            reqField(r, "attempts", `${what}.retry`),
            `${what}.retry.attempts`,
            2,
            BOUNDS.maxRetryAttempts,
          ),
        };
      }
      if (kind !== "agent" && obj.compact !== undefined) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}: compact is agent-only — only tool-bearing cells accumulate a log`,
        );
      }
      if (kind === "agent" && compact !== undefined && obj.tools === undefined) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}: compact needs tools — no tool log ever accumulates`,
        );
      }
      if (kind === "gate" && (obj.tools !== undefined || obj.shadow !== undefined)) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}: gate cells take no tools or shadow — a gate is an approval point, not a worker`,
        );
      }
      if (kind === "classifier" || kind === "gate") {
        if (output.kind !== "choice") {
          throw new AlgalError(
            "PARSE_FAILED",
            `${what}: ${kind} output must be {kind:"choice"}`,
          );
        }
        if (kind === "gate") {
          const cell: Cell = { id, kind: "gate", inputs, prompt, view, output };
          if (route) cell.route = route;
          if (budget) cell.budget = budget;
          if (retry) cell.retry = retry;
          return cell;
        }
        let shadow: { take: string } | undefined;
        if (obj.shadow !== undefined) {
          const s = asObject(obj.shadow, `${what}.shadow`);
          noUnknownKeys(s, ["take"], `${what}.shadow`);
          const take = asString(
            reqField(s, "take", `${what}.shadow`),
            `${what}.shadow.take`,
            BOUNDS.maxLabelLen,
          );
          if (!output.labels.includes(take)) {
            throw new AlgalError(
              "PARSE_FAILED",
              `${what}.shadow.take must be a declared label`,
            );
          }
          shadow = { take };
        }
        const cell: Cell = {
          id,
          kind: "classifier",
          inputs,
          prompt,
          view,
          output,
        };
        if (shadow) cell.shadow = shadow;
        if (route) cell.route = route;
        if (tools) cell.tools = tools;
        if (budget) cell.budget = budget;
        if (retry) cell.retry = retry;
        return cell;
      }
      const cell: Cell = { id, kind: "agent", inputs, prompt, view, output };
      if (route) cell.route = route;
      if (tools) cell.tools = tools;
      if (compact) cell.compact = compact;
      if (budget) cell.budget = budget;
      if (retry) cell.retry = retry;
      return cell;
    }
    case "decide": {
      noUnknownKeys(
        obj,
        ["id", "kind", "inputs", "prompt", "questions", "view", "route", "budget", "retry"],
        what,
      );
      const inputs = obj.inputs === undefined
        ? {}
        : parsePortMap(obj.inputs, `${what}.inputs`);
      const prompt = obj.prompt === undefined
        ? undefined
        : asString(obj.prompt, `${what}.prompt`, BOUNDS.maxPromptLen);
      const questions = parseDecisionQuestions(
        reqField(obj, "questions", what),
        `${what}.questions`,
      );
      const view = parseView(obj.view, `${what}.view`);
      const route = obj.route === undefined
        ? undefined
        : parseRoute(obj.route, `${what}.route`);
      let budget: CellBudget | undefined;
      if (obj.budget !== undefined) {
        const b = asObject(obj.budget, `${what}.budget`);
        noUnknownKeys(
          b,
          ["maxContextBytes", "maxOutputBytes", "maxEffectMs"],
          `${what}.budget`,
        );
        budget = {};
        const ctx = optField(b, "maxContextBytes");
        const outB = optField(b, "maxOutputBytes");
        const ems = optField(b, "maxEffectMs");
        if (ctx !== undefined) {
          budget.maxContextBytes = asInt(ctx, `${what}.budget.maxContextBytes`, 1, BOUNDS.maxContextBytes);
        }
        if (outB !== undefined) {
          budget.maxOutputBytes = asInt(outB, `${what}.budget.maxOutputBytes`, 1, BOUNDS.maxOutputBytes);
        }
        if (ems !== undefined) {
          budget.maxEffectMs = asInt(ems, `${what}.budget.maxEffectMs`, 1, BOUNDS.maxEffectMs);
        }
      }
      let retry: { attempts: number } | undefined;
      if (obj.retry !== undefined) {
        const r = asObject(obj.retry, `${what}.retry`);
        noUnknownKeys(r, ["attempts"], `${what}.retry`);
        retry = {
          attempts: asInt(
            reqField(r, "attempts", `${what}.retry`),
            `${what}.retry.attempts`,
            2,
            BOUNDS.maxRetryAttempts,
          ),
        };
      }
      const cell: Cell = { id, kind: "decide", inputs, questions, view };
      if (prompt !== undefined) cell.prompt = prompt;
      if (route) cell.route = route;
      if (budget) cell.budget = budget;
      if (retry) cell.retry = retry;
      return cell;
    }
    case "recall": {
      noUnknownKeys(
        obj,
        ["id", "kind", "inputs", "query", "k", "embedder", "route", "budget", "retry"],
        what,
      );
      const inputs = obj.inputs === undefined
        ? {}
        : parsePortMap(obj.inputs, `${what}.inputs`);
      const query = asObject(reqField(obj, "query", what), `${what}.query`);
      noUnknownKeys(query, ["contract", "program"], `${what}.query`);
      if (query.contract !== "algal.expr.v1") {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.query.contract must be "algal.expr.v1"`,
        );
      }
      const program = asJsonValue(
        reqField(query, "program", `${what}.query`),
        `${what}.query.program`,
      );
      const check = checkProgram(program, Object.keys(inputs));
      if (!check.ok) {
        const { code, ...details } = check.err;
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.query.program: ${code} ${JSON.stringify(details)}`,
        );
      }
      const cell: Cell = {
        id,
        kind,
        inputs,
        query: { contract: "algal.expr.v1", program },
      };
      if (obj.k !== undefined) {
        cell.k = asInt(obj.k, `${what}.k`, 1, BOUNDS.maxRecallK);
      }
      if (obj.embedder !== undefined) {
        cell.embedder = checkEmbedderSpec(
          asString(obj.embedder, `${what}.embedder`, BOUNDS.maxRefLen),
          `${what}.embedder`,
        );
      }
      if (obj.route !== undefined) {
        cell.route = parseRoute(obj.route, `${what}.route`);
      }
      if (obj.budget !== undefined) {
        const b = asObject(obj.budget, `${what}.budget`);
        noUnknownKeys(
          b,
          ["maxContextBytes", "maxOutputBytes", "maxEffectMs"],
          `${what}.budget`,
        );
        const budget: CellBudget = {};
        const ctx = optField(b, "maxContextBytes");
        const outB = optField(b, "maxOutputBytes");
        const ems = optField(b, "maxEffectMs");
        if (ctx !== undefined) {
          budget.maxContextBytes = asInt(ctx, `${what}.budget.maxContextBytes`, 1, BOUNDS.maxContextBytes);
        }
        if (outB !== undefined) {
          budget.maxOutputBytes = asInt(outB, `${what}.budget.maxOutputBytes`, 1, BOUNDS.maxOutputBytes);
        }
        if (ems !== undefined) {
          budget.maxEffectMs = asInt(ems, `${what}.budget.maxEffectMs`, 1, BOUNDS.maxEffectMs);
        }
        cell.budget = budget;
      }
      if (obj.retry !== undefined) {
        const r = asObject(obj.retry, `${what}.retry`);
        noUnknownKeys(r, ["attempts"], `${what}.retry`);
        cell.retry = {
          attempts: asInt(
            reqField(r, "attempts", `${what}.retry`),
            `${what}.retry.attempts`,
            2,
            BOUNDS.maxRetryAttempts,
          ),
        };
      }
      return cell;
    }
    default:
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.kind: unknown "${kind}"`,
      );
  }
}

// ----------------------------------------------------------------- edges ---

function parseEdge(u: unknown, what: string): Edge {
  const obj = asObject(u, what);
  noUnknownKeys(obj, ["from", "to", "guard", "on"], what);
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
    noUnknownKeys(g, ["equals", "field", "expr"], `${what}.guard`);
    if (g.expr !== undefined) {
      if (g.equals !== undefined || g.field !== undefined) {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.guard: expr cannot mix with equals/field`,
        );
      }
      const e = asObject(g.expr, `${what}.guard.expr`);
      noUnknownKeys(e, ["contract", "program"], `${what}.guard.expr`);
      if (e.contract !== "algal.expr.v1") {
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.guard.expr.contract must be "algal.expr.v1"`,
        );
      }
      const program = asJsonValue(
        reqField(e, "program", `${what}.guard.expr`),
        `${what}.guard.expr.program`,
      );
      const check = checkProgram(program, ["value"]);
      if (!check.ok) {
        const { code, ...details } = check.err;
        throw new AlgalError(
          "PARSE_FAILED",
          `${what}.guard.expr.program: ${code} ${JSON.stringify(details)}`,
        );
      }
      edge.guard = { expr: { contract: "algal.expr.v1", program } };
    } else {
      edge.guard = {
        equals: asString(
          reqField(g, "equals", `${what}.guard`),
          `${what}.guard.equals`,
          BOUNDS.maxLabelLen,
        ),
      };
      const f = optField(g, "field");
      if (f !== undefined) {
        edge.guard.field = asSafeId(f, `${what}.guard.field`);
      }
    }
  }
  const on = optField(obj, "on");
  if (on !== undefined) {
    if (on !== "fail") {
      throw new AlgalError(
        "PARSE_FAILED",
        `${what}.on: unknown "${String(on)}" — the only value is "fail"`,
      );
    }
    edge.on = "fail";
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
      throw new AlgalError(
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
    throw new AlgalError(
      "PARSE_FAILED",
      `manifest.contract must be "${CONTRACT}" (got "${contract}")`,
    );
  }
  const key = asString(reqField(obj, "key", what), `${what}.key`, BOUNDS.maxIdLen);
  if (!/^organism:[a-z][a-z0-9-]*$/.test(key)) {
    throw new AlgalError(
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
    throw new AlgalError(
      "PARSE_FAILED",
      `manifest.cells exceeds ${BOUNDS.maxCells}`,
    );
  }
  if (manifest.edges.length > BOUNDS.maxEdges) {
    throw new AlgalError(
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
      case "expr": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          expr: c.expr,
          output: outputJson(c.output),
        };
        if (Object.keys(c.inputs).length) o.inputs = portMapJson(c.inputs);
        return o;
      }
      case "tool":
        return {
          id: c.id,
          kind: c.kind,
          tool: c.tool,
          ...(c.budget ? { budget: c.budget as unknown as JsonValue } : {}),
        };
      case "store":
      case "load":
      case "spawn":
        return { id: c.id, kind: c.kind };
      case "slot": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          name: c.name,
          mode: c.mode,
        };
        if (c.default !== undefined) o.default = c.default;
        return o;
      }
      case "organism": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          manifest: c.manifest,
        };
        if (c.via) o.via = c.via;
        return o;
      }
      case "repeat": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          manifest: c.manifest,
          maxRounds: c.maxRounds,
        };
        if (c.carry) o.carry = c.carry;
        if (c.until) {
          o.until = {
            output: c.until.output,
            equals: c.until.equals,
            ...(c.until.field !== undefined ? { field: c.until.field } : {}),
          };
        }
        if (c.via) o.via = c.via;
        return o;
      }
      case "each": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          manifest: c.manifest,
          over: c.over,
          maxItems: c.maxItems,
        };
        if (c.via) o.via = c.via;
        return o;
      }
      case "agent":
      case "classifier":
      case "gate": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          prompt: c.prompt,
          view: viewJson(c.view),
          output: outputJson(c.output),
        };
        if (Object.keys(c.inputs).length > 0) o.inputs = portMapJson(c.inputs);
        if (c.route) o.route = routeJson(c.route);
        if (c.kind !== "gate" && c.tools) o.tools = c.tools;
        if (c.kind === "agent" && c.compact) {
          const cp: JsonObject = { maxLogBytes: c.compact.maxLogBytes };
          if (c.compact.keepRecent !== undefined) cp.keepRecent = c.compact.keepRecent;
          if (c.compact.route) cp.route = routeJson(c.compact.route);
          o.compact = cp;
        }
        if (c.kind === "classifier" && c.shadow) o.shadow = { take: c.shadow.take };
        if (c.retry) o.retry = { attempts: c.retry.attempts };
        if (c.budget) {
          const b: JsonObject = {};
          if (c.budget.maxContextBytes !== undefined)
            b.maxContextBytes = c.budget.maxContextBytes;
          if (c.budget.maxOutputBytes !== undefined)
            b.maxOutputBytes = c.budget.maxOutputBytes;
          if (c.budget.maxTurns !== undefined)
            b.maxTurns = c.budget.maxTurns;
          if (c.budget.maxEffectMs !== undefined)
            b.maxEffectMs = c.budget.maxEffectMs;
          o.budget = b;
        }
        return o;
      }
      case "decide": {
        const o: JsonObject = {
          id: c.id,
          kind: "decide",
          questions: c.questions as unknown as JsonValue,
          view: viewJson(c.view),
        };
        if (Object.keys(c.inputs).length > 0) o.inputs = portMapJson(c.inputs);
        if (c.prompt !== undefined) o.prompt = c.prompt;
        if (c.route) o.route = routeJson(c.route);
        if (c.retry) o.retry = { attempts: c.retry.attempts };
        if (c.budget) {
          const b: JsonObject = {};
          if (c.budget.maxContextBytes !== undefined)
            b.maxContextBytes = c.budget.maxContextBytes;
          if (c.budget.maxOutputBytes !== undefined)
            b.maxOutputBytes = c.budget.maxOutputBytes;
          if (c.budget.maxEffectMs !== undefined)
            b.maxEffectMs = c.budget.maxEffectMs;
          o.budget = b;
        }
        return o;
      }
      case "recall": {
        const o: JsonObject = {
          id: c.id,
          kind: c.kind,
          query: { contract: c.query.contract, program: c.query.program as JsonValue },
        };
        o.inputs = portMapJson(c.inputs);
        if (c.k !== undefined) o.k = c.k;
        if (c.embedder !== undefined) o.embedder = c.embedder;
        if (c.route) o.route = routeJson(c.route);
        if (c.retry) o.retry = { attempts: c.retry.attempts };
        if (c.budget) {
          const b: JsonObject = {};
          if (c.budget.maxContextBytes !== undefined)
            b.maxContextBytes = c.budget.maxContextBytes;
          if (c.budget.maxOutputBytes !== undefined)
            b.maxOutputBytes = c.budget.maxOutputBytes;
          if (c.budget.maxEffectMs !== undefined)
            b.maxEffectMs = c.budget.maxEffectMs;
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
      if (e.on) o.on = e.on;
      if (e.guard) {
        o.guard =
          "expr" in e.guard
            ? { expr: e.guard.expr }
            : {
                equals: e.guard.equals,
                ...(e.guard.field !== undefined
                  ? { field: e.guard.field }
                  : {}),
              };
      }
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
  if (p.many) o.many = true;
  if (p.type === "choice" && p.labels) o.labels = p.labels;
  if (p.type === "json" && p.schema) o.schema = p.schema;
  return o;
}

function viewJson(v: AgentView): JsonObject {
  const o: JsonObject = { inputs: v.inputs === "*" ? "*" : v.inputs };
  if (v.cells) {
    o.cells = v.cells.map((c) =>
      c.ports === undefined ? c.cell : { cell: c.cell, ports: c.ports },
    );
  }
  if (v.graph) o.graph = true;
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
