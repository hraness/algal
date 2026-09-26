// Independent source-level model types for the Phase 13 correspondence
// checker. These declarations mirror the readable `.algal` grammar and its
// static type lattice but share no code with `src/source.ts`: the parser,
// checker, and interpreter in this directory are a second implementation so
// that a production lowering bug produces a divergence rather than being
// reproduced. Only contract-level helpers (canonical JSON, schema versions,
// digest) are imported from `src/` — nothing that encodes source semantics.
import type { JsonObject, JsonValue } from "../../src/values";

export const SOURCE_LIMITS = Object.freeze({
  maxSourceBytes: 65_536, maxTokens: 8_192, maxNodes: 1_024,
  maxDepth: 16, maxBindings: 24, maxParameters: 16,
  maxNameLength: 40, maxChoiceLabels: 16, maxCollectionItems: 64,
  maxFiles: 16, maxImports: 16, maxProjectBytes: 1_048_576, maxImportDepth: 8,
  maxRecords: 16, maxRecordFields: 32,
  maxAllowedValues: 16, maxAllowedValueLength: 64,
  // schema admission limits mirrored from the manifest contract
  maxSchemaLevels: 8, maxSchemaDepth: 4, maxRecordSchemaBytes: 65_536,
  maxTextLength: 1_000_000, // SCHEMA_V3_BOUNDS.maxTextLength
  maxEachItems: 64,         // BOUNDS.maxEachItems
  maxCells: 64, maxEdges: 256, maxIdLength: 64,
  // manifest budget ceilings mirrored from BOUNDS. `contractMaxDepth` is the
  // admission ceiling (BOUNDS.maxDepth=8): source `max_depth` parses 0..16
  // (the expression-depth bound is reused as its range), and admission of
  // the generated manifest is what rejects 9..16.
  contractMaxDepth: 8,
  maxSteps: 1024, maxAgentCalls: 64, maxWork: 100_000_000,
  maxContextBytes: 262_144, maxOutputBytes: 262_144,
} as const);

export const DEFAULT_BUDGETS = Object.freeze({
  maxSteps: 256, maxAgentCalls: 0, maxWork: 1_000_000,
  maxContextBytes: 65_536, maxOutputBytes: 65_536, maxDepth: 4,
} as const);

export type Budgets = {
  maxSteps: number; maxAgentCalls: number; maxWork: number;
  maxContextBytes: number; maxOutputBytes: number; maxDepth: number;
};

/** Failure class: `parse` = malformed text, `check` = static rejection,
 *  `eval` = a dynamic failure a generated run would also produce. The `code`
 *  mirrors the production receipt/compile error code where one exists. */
export class SrcError extends Error {
  constructor(
    readonly phase: "parse" | "check" | "eval" | "load",
    readonly code: string,
    message: string,
    readonly source?: string,
  ) { super(source === undefined ? message : `${source}: ${message}`); this.name = "SrcError"; }
}
export function fail(phase: "parse" | "check" | "eval" | "load", code: string, message: string, source?: string): never {
  throw new SrcError(phase, code, message, source);
}

// ------------------------------------------------------------------ AST ---

export type Expr =
  | { kind: "literal"; value: JsonValue }
  | { kind: "name"; name: string }
  | { kind: "field"; value: Expr; field: string }
  | { kind: "probability"; value: Expr; label: Expr }
  | { kind: "unary"; op: "not" | "neg"; value: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "record"; entries: [string, Expr][] }
  | { kind: "list"; items: Expr[] }
  | { kind: "if"; condition: Expr; yes: Expr; no: Expr }
  | { kind: "match"; value: Expr; arms: [string, Expr][] }
  | { kind: "decide"; question: string; context: Expr; criteria: [string, string][] }
  | { kind: "generate"; instruction: Expr; context: Expr }
  | { kind: "call"; alias: string; args: Expr }
  | { kind: "each"; alias: string; over: string; items: Expr; args: Expr; maxItems: number };

export type FieldType =
  | { kind: "text"; values?: string[]; minimum?: number; maximum?: number; format?: string }
  | { kind: "number"; values?: number[]; minimum?: number; maximum?: number }
  | { kind: "integer"; values?: number[]; minimum?: number; maximum?: number }
  | { kind: "boolean" } | { kind: "json" }
  | Record_ | { kind: "list"; item: FieldType; unique?: boolean };

export type SourceField = { name: string; type: FieldType; optional: boolean };
/** A named record declared before the program. `closed` records reject
 *  undeclared fields. `schema`/`schemaVersion` are the bounded core-schema
 *  projection computed at declaration time (mirroring `recordSchema` +
 *  `schemaVersion` on the production side). */
export type Record_ = { kind: "record"; name: string; closed: boolean; fields: SourceField[]; schema?: JsonObject; schemaVersion?: 2 | 3 };
export type SourceList = { kind: "list"; item: FieldType; schema?: JsonObject; schemaVersion?: 2 | 3 };
export type SourceShape = Record_ | SourceList;
export type SourceType = "text" | "json" | SourceShape;

export type Parameter = { name: string; type: SourceType };
export type Program = {
  name: string; parameters: Parameter[]; output: SourceType; budgets: Budgets;
  bindings: { name: string; expr: Expr }[]; result: Expr;
};
export type Module = {
  imports: { alias: string; path: string }[];
  records: Record_[];
  program: Program;
};

// ------------------------------------------------- static type lattice ---

export type SType =
  | { kind: "text"; literal?: string } | { kind: "number"; literal?: number }
  | { kind: "json" | "boolean" | "null" }
  | { kind: "list"; items?: SType[]; item?: SType }
  | { kind: "choice" | "decision"; labels: string[] }
  | { kind: "record"; fields: Map<string, SType>; declared?: Record_ };

export const isTextType = (t: SType): boolean => t.kind === "text" || t.kind === "choice";

/** The port declaration a lowered value flows into: `text` ports carry
 *  strings, `json` ports carry any JSON under an optional bounded schema. */
export type PortType = { type: "text" | "json" | "choice"; labels?: string[]; schema?: JsonObject; schemaVersion?: 2 | 3; many?: boolean };

export const kebab = (name: string): string => name.toLowerCase().replaceAll("_", "-");

// ------------------------------------------------------------- modules ---

/** Per-expression lowering metadata the interpreter consumes: the generated
 *  position id for tail expressions, whether a call is wrapped in a trigger
 *  shim, the resolved binary operator (`+` on statically-text operands lowers
 *  to `sconcat`), and — for effectful `if`/`match` — the branch index and the
 *  label set the selector contract enforces. */
export type SiteInfo = { id?: string; wrap?: boolean; op?: string; branch?: { index: number; labels: string[] } };

/** A statically checked module: the program, its resolved import closure,
 *  the static call/depth analysis the source semantics itself computes, and
 *  the checker's generated-cell outline + site map. */
export type CheckedModule = {
  key: string;
  module: Module;
  imports: Map<string, CheckedModule>;
  parameters: { name: string; port: PortType; sourceType: SourceType }[];
  output: SourceType;
  analysis: { maxAgentCalls: number; requiredDepth: number };
  importDepth: number;
  /** The check outcome: generated-cell outline, call sites, per-node sites. */
  check?: import("./check").CheckOutcome;
  /** The port contract the result cell's `out` declares. */
  resultPort?: PortType;
};

export type SourceProject = {
  entry: string;
  modules: Map<string, CheckedModule>;
  /** Modules in first-encounter closure order, deduplicated by the checked
   *  program identity — the source-level analogue of `compilation.modules`. */
  closure: CheckedModule[];
};

// ------------------------------------------------------------- effects ---

/** The source-level observation an oracle sees — the same payload a graph
 *  effect request carries, minus generated-cell plumbing. */
export type SourceObservation =
  | { kind: "decide"; site: string; question: string; criteria: [string, string][]; context: JsonValue }
  | { kind: "generate"; site: string; instruction: string; context: JsonValue };

export type SourceOracle = {
  decide: (obs: Extract<SourceObservation, { kind: "decide" }>) => JsonValue;
  generate: (obs: Extract<SourceObservation, { kind: "generate" }>) => JsonValue;
};



/** `missing` models a source value a generated run would never deliver:
 *  an arm cell that stays skipped produces nothing downstream. It is only
 *  reachable through an out-of-labels match discriminant, which static
 *  checks make unreachable — see SCOPE.md. */
export const MISSING: unique symbol = Symbol("algal.source.missing");
export type Missing = typeof MISSING;
export type Maybe<T> = T | Missing;

/** The run projection the differential compares: value or typed failure,
 *  ordered external observations, agent-call and cell-activation counts,
 *  and whether the interface result was ever produced. */
export type SourceRun = {
  ok: boolean;
  value?: Maybe<JsonValue>;
  /** Dynamic failure class; `EXPR_FAILED`, `TYPE_MISMATCH`, `EFFECT_*`,
   *  `BUDGET_EXHAUSTED`, `DEPTH_EXCEEDED` mirror the receipt's failure code. */
  error?: { code: string; message: string };
  /** Ordered oracle observations actually issued — the source-level effect
   *  trace a generated run's effect events must match. */
  observations: SourceObservation[];
  /** Executor attempts charged — decide and generate each cost one. */
  agentCalls: number;
  /** Cell activations on the selected path — the model's `work.steps`. */
  steps: number;
  /** True when the run ended with no result value delivered — the interface
   *  `result` cell stayed skipped (an undelivered argument or an unselected
   *  arm). */
  resultAbsent?: boolean;
};
