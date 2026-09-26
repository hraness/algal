// Independent source-level interpreter: evaluates a checked source program
// directly over its AST — no lowering to `algal.expr.v1` programs and no
// generated-cell machinery. Dynamic semantics mirror the documented runtime:
// strict operator typing, short-circuit evaluation, `get`-style field reads,
// decision normalization, exact call/each argument binding, ordered `each`
// results, and the root budgets' depth/call accounting.
import { checkSchema } from "../../src/effects";
import { decisionAnswerSchema } from "../../src/decisions";
import { checkValue } from "../../src/run";
import { compareUtf8, utf8Length } from "../../src/utf8";
import { canonicalBytes, canonicalize, type JsonObject, type JsonValue } from "../../src/values";
import { parseModule } from "./parse";
import { Checker } from "./check";
import { parameterPort } from "./types";
import {
  MISSING, SOURCE_LIMITS, SrcError, fail, kebab,
  type Budgets, type CheckedModule, type Expr, type Maybe,
  type PortType, type SourceObservation, type SourceOracle, type SourceRun,
} from "./model";

const B = SOURCE_LIMITS;

// ------------------------------------------------------ module loading ---
// Mirrors the documented project rules: normalized project-relative keys,
// bounded files/bytes/depth, cycle rejection, memoization by key — including
// the shared-subtree depth accounting (a memoized module's own height still
// counts against a deeper second visit).

const invalidPathCharacters = (value: string): boolean =>
  value.includes("\\") || value.includes(":") || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

export function projectKey(key: string): string {
  if (typeof key !== "string" || !key.endsWith(".algal") || key.length > 512 || invalidPathCharacters(key) || key.split("/").some(part => !part || part === "." || part === "..")) {
    fail("load", "PARSE_FAILED", "source keys must be normalized project-relative .algal paths");
  }
  return key;
}

/** Resolve an `import ... from` path against the importing unit's key —
 *  logical resolution only; never touches the filesystem. */
export function resolveImport(importerKey: string, path: string): string {
  projectKey(importerKey);
  if (typeof path !== "string" || !(path.startsWith("./") || path.startsWith("../")) || !path.endsWith(".algal") || path.length > 512 || invalidPathCharacters(path)) {
    fail("load", "PARSE_FAILED", "imports require a relative ./ or ../ .algal path; absolute paths and URLs are not supported");
  }
  const parts = importerKey.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (part === ".") continue;
    if (part === "..") {
      if (!parts.length) fail("load", "PARSE_FAILED", "import escapes the source project root");
      parts.pop();
    } else {
      if (!part) fail("load", "PARSE_FAILED", "import paths cannot contain empty segments");
      parts.push(part);
    }
  }
  return projectKey(parts.join("/"));
}

export type LoadedProject = {
  entry: string;
  checked: Map<string, CheckedModule>;
  sources: Map<string, string>;
};

export function loadProject(source: string, options: { entry?: string; modules?: Readonly<Record<string, string>> } = {}): LoadedProject & { root: CheckedModule } {
  const entryKey = options.entry ?? "main.algal";
  const entry = projectKey(entryKey);
  const sources = new Map<string, string>();
  let totalBytes = 0;
  const insert = (key: string, text: string): void => {
    projectKey(key);
    if (typeof text !== "string") fail("load", "PARSE_FAILED", `source module ${key} must contain source text`, key);
    if (sources.has(key)) {
      if (sources.get(key) !== text) fail("load", "PARSE_FAILED", `entry source differs from modules[${JSON.stringify(key)}]`, key);
      return;
    }
    const bytes = utf8Length(text);
    if (bytes > B.maxSourceBytes) fail("load", "PARSE_FAILED", `source exceeds ${B.maxSourceBytes} UTF-8 bytes`, key);
    if (sources.size >= B.maxFiles) fail("load", "PARSE_FAILED", `source project exceeds ${B.maxFiles} files`, key);
    totalBytes += bytes;
    if (totalBytes > B.maxProjectBytes) fail("load", "PARSE_FAILED", `source project exceeds ${B.maxProjectBytes} UTF-8 bytes`, key);
    sources.set(key, text);
  };
  insert(entry, source);
  for (const [key, text] of Object.entries(options.modules ?? {})) insert(key, text);

  const checked = new Map<string, CheckedModule>();
  const active = new Set<string>();
  const visit = (key: string, depth: number, importer?: string): CheckedModule => {
    if (active.has(key)) fail("load", "PARSE_FAILED", `source import cycle at ${key}`);
    if (depth > B.maxImportDepth) fail("load", "PARSE_FAILED", `source import depth exceeds ${B.maxImportDepth}`);
    const cached = checked.get(key);
    if (cached) {
      if (depth + cached.importDepth > B.maxImportDepth) fail("load", "PARSE_FAILED", `source import depth exceeds ${B.maxImportDepth}`, importer ?? key);
      return cached;
    }
    const text = sources.get(key);
    if (text === undefined) fail("load", "PARSE_FAILED", `source module not supplied: ${key}`, importer ?? key);
    active.add(key);
    try {
      const module = parseModule(text, key);
      const imports = new Map<string, CheckedModule>();
      for (const declaration of module.imports) {
        imports.set(declaration.alias, visit(resolveImport(key, declaration.path), depth + 1, key));
      }
      const importDepth = imports.size ? 1 + Math.max(...[...imports.values()].map(child => child.importDepth)) : 0;
      const outcome = new Checker(imports, key).compile(module.program);
      const mod: CheckedModule = {
        key, module, imports,
        parameters: module.program.parameters.map(param => ({ name: param.name, port: parameterPort(param.type), sourceType: param.type })),
        output: module.program.output,
        analysis: outcome.analysis,
        importDepth,
        check: outcome,
        resultPort: outcome.resultPort,
      };
      checked.set(key, mod);
      return mod;
    } catch (error) {
      if (error instanceof SrcError && error.source === undefined) {
        throw new SrcError(error.phase, error.code, error.message, key);
      }
      throw error;
    } finally { active.delete(key); }
  };
  const root = visit(entry, 0);
  return { entry, checked, sources, root };
}

/** The generated `modules` closure: every manifest a run of the entry could
 *  embed — the reachable call/each children in lowering order (a child's own
 *  closure precedes it), plus the generated trigger wrapper for each wrapped
 *  call — memoized by manifest identity so a shared child contributes one
 *  entry at its first position. Wrappers appear as `{ kind: "wrapper" }`
 *  markers the differential resolves to their predicted digests. */
export type ClosureEntry =
  | { kind: "module"; module: CheckedModule }
  | { kind: "wrapper"; child: CheckedModule };
export function moduleClosure(root: CheckedModule): ClosureEntry[] {
  const out: ClosureEntry[] = [];
  const emit = (mod: CheckedModule): void => {
    for (const site of mod.check!.calls) {
      emit(site.child);
      out.push({ kind: "module", module: site.child });
      if (site.wrapped) out.push({ kind: "wrapper", child: site.child });
    }
  };
  emit(root);
  // `modules.set(digest)` deduplicates by manifest identity; a repeated
  // entry keeps its first position.
  const seen = new Set<string>();
  return out.filter(entry => {
    const identity = entry.kind === "module" ? programIdentity(entry.module) : `wrapper:${programIdentity(entry.child)}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

/** A canonical semantic identity for a checked module — the source-side
 *  analogue of `manifestDigest` for module deduplication. It projects the
 *  program's meaning (name, budgets, interface, body AST with types resolved
 *  to schemas, and resolved import identities), ignoring only layout trivia
 *  that never reaches an executable manifest. */
export function programIdentity(mod: CheckedModule): string {
  const identities = new Map<CheckedModule, string>();
  const fieldTypeId = (type: import("./model").FieldType): unknown => {
    switch (type.kind) {
      case "record": return { record: type.schema };
      case "list": return { list: fieldTypeId(type.item), unique: type.unique === true };
      default: { const { kind: _k, ...rest } = type as { kind: string }; return { kind: type.kind, ...rest }; }
    }
  };
  const sourceTypeId = (type: import("./model").SourceType): unknown =>
    typeof type === "object" ? (type.kind === "record" ? { record: type.schema } : { list: fieldTypeId(type.item) }) : type;
  // Identity is per-module: `call`/`each` aliases resolve in the module that
  // declares them, so exprId carries its module context.
  const exprId = (m: CheckedModule, expr: Expr): unknown => {
    switch (expr.kind) {
      case "literal": return { lit: expr.value };
      case "name": return { name: expr.name };
      case "field": return { field: exprId(m, expr.value), name: expr.field };
      case "probability": return { probability: [exprId(m, expr.value), exprId(m, expr.label)] };
      case "unary": return { unary: [expr.op, exprId(m, expr.value)] };
      case "binary": return { binary: [expr.op, exprId(m, expr.left), exprId(m, expr.right)] };
      case "record": return { record: expr.entries.map(([key, value]) => [key, exprId(m, value)]) };
      case "list": return { list: expr.items.map(item => exprId(m, item)) };
      case "if": return { if: [exprId(m, expr.condition), exprId(m, expr.yes), exprId(m, expr.no)] };
      case "match": return { match: exprId(m, expr.value), arms: expr.arms.map(([label, arm]) => [label, exprId(m, arm)]) };
      case "decide": return { decide: expr.question, context: exprId(m, expr.context), criteria: expr.criteria };
      case "generate": return { generate: [exprId(m, expr.instruction), exprId(m, expr.context)] };
      case "call": return { call: identityOf(m.imports.get(expr.alias)!), args: exprId(m, expr.args) };
      case "each": return { each: identityOf(m.imports.get(expr.alias)!), over: expr.over, items: exprId(m, expr.items), args: exprId(m, expr.args), maxItems: expr.maxItems };
    }
  };
  const identityOf = (m: CheckedModule): string => {
    const known = identities.get(m);
    if (known) return known;
    const program = m.module.program;
    const id = canonicalize({
      name: program.name,
      budgets: program.budgets,
      parameters: program.parameters.map(param => [param.name, sourceTypeId(param.type)]),
      output: sourceTypeId(program.output),
      bindings: program.bindings.map(binding => [binding.name, exprId(m, binding.expr)]),
      result: exprId(m, program.result),
    } as JsonValue);
    identities.set(m, id);
    return id;
  };
  return identityOf(mod);
}

// ------------------------------------------------------------ evaluation --

export type EvalState = {
  oracle: SourceOracle;
  observations: import("./model").SourceObservation[];
  agentCalls: number;
  budgets: Budgets;
  depth: number;
};
export type EvalEnv = Map<string, Maybe<JsonValue>>;

/** Deep JSON equality matching the contract's `eq`: numbers compare as
 *  binary64, object key order is ignored, cross-type is false. */
export function eqv(a: JsonValue, b: JsonValue): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) {
    if (typeof a === "number" && typeof b === "number") return a === b;
    return false;
  }
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => eqv(x, (b as JsonValue[])[i]!));
  }
  if (Array.isArray(b)) return false;
  const keys = Object.keys(a as JsonObject);
  return keys.length === Object.keys(b as JsonObject).length &&
    keys.every(key => Object.hasOwn(b as JsonObject, key) && eqv((a as JsonObject)[key]!, (b as JsonObject)[key]!));
}

/** The `algal.expr.v1` produced-value bound (`value_bytes` in the evaluator):
 *  depth, per-string bytes, list length, object keys, and canonical byte
 *  total. Applied to every generated cell's produced `out`; a violation is an
 *  `EXPR_BOUNDS` error the runtime rewrites to `EXPR_FAILED`. */
const valueByteCheck = (value: JsonValue, depth = 0): void => {
  if (depth > 32) fail("eval", "EXPR_FAILED", "value-depth exceeds 32");
  if (typeof value === "string") {
    if (utf8Length(value) > 65_536) fail("eval", "EXPR_FAILED", "string-bytes exceeds 65536");
  } else if (Array.isArray(value)) {
    if (value.length > 1024) fail("eval", "EXPR_FAILED", "list-len exceeds 1024");
    for (const item of value) valueByteCheck(item, depth + 1);
  } else if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as JsonObject);
    if (keys.length > 256) fail("eval", "EXPR_FAILED", "object-keys exceeds 256");
    for (const key of keys) {
      if (utf8Length(key) > 65_536) fail("eval", "EXPR_FAILED", "string-bytes exceeds 65536");
      valueByteCheck((value as JsonObject)[key]!, depth + 1);
    }
  }
  if (depth === 0 && canonicalBytes(value) > 262_144) fail("eval", "EXPR_FAILED", "value-bytes exceeds 262144");
};
const checkPort = (value: JsonValue, port: PortType, what: string): void => {
  try { checkValue(value, port as never, what); }
  catch (error) {
    if (error instanceof Error && "code" in error) fail("eval", String((error as { code: unknown }).code), (error as Error).message);
    throw error;
  }
};
const get = (value: JsonValue, key: string): JsonValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (Object.hasOwn(value as JsonObject, key) ? (value as JsonObject)[key]! : null)
    : null;
const requireBool = (value: Maybe<JsonValue>, what: string): boolean => {
  if (value === MISSING) return fail("eval", "EXPR_FAILED", `${what}: undelivered`) as never;
  if (typeof value !== "boolean") fail("eval", "EXPR_FAILED", `${what}: expected boolean, found ${value === null ? "null" : Array.isArray(value) ? "list" : typeof value}`);
  return value;
};
const requireNum = (value: Maybe<JsonValue>, what: string): number => {
  if (value === MISSING) return fail("eval", "EXPR_FAILED", `${what}: undelivered`) as never;
  if (typeof value !== "number") fail("eval", "EXPR_FAILED", `${what}: expected number, found ${value === null ? "null" : Array.isArray(value) ? "list" : typeof value}`);
  return value;
};

/** Every name an expression reads: each is a wired input of the generated
 *  cell, so one undelivered name skips the whole cell regardless of which
 *  position the operator would have evaluated first. */
function freeNames(expr: Expr, out: Set<string>): Set<string> {
  switch (expr.kind) {
    case "literal": return out;
    case "name": out.add(expr.name); return out;
    case "field": case "unary": return freeNames(expr.value, out);
    case "probability": freeNames(expr.value, out); return freeNames(expr.label, out);
    case "binary": freeNames(expr.left, out); return freeNames(expr.right, out);
    case "record": for (const [, value] of expr.entries) freeNames(value, out); return out;
    case "list": for (const item of expr.items) freeNames(item, out); return out;
    case "if": freeNames(expr.condition, out); freeNames(expr.yes, out); return freeNames(expr.no, out);
    case "match": freeNames(expr.value, out); for (const [, arm] of expr.arms) freeNames(arm, out); return out;
    case "decide": return freeNames(expr.context, out);
    case "generate": freeNames(expr.instruction, out); return freeNames(expr.context, out);
    case "call": return freeNames(expr.args, out);
    case "each": freeNames(expr.items, out); return freeNames(expr.args, out);
  }
}
const undelivered = (expr: Expr, env: EvalEnv): boolean => {
  for (const name of freeNames(expr, new Set())) {
    const value = env.get(name);
    if (value === undefined || value === MISSING) return true;
  }
  return false;
};

export class Run {
  readonly observations: SourceObservation[] = [];
  agentCalls = 0;
  steps = 0;
  constructor(readonly oracle: SourceOracle, readonly budgets: Budgets) {}
  /** One executor attempt against `max_agent_calls`. */
  private charge(): void {
    if (this.agentCalls + 1 > this.budgets.maxAgentCalls) fail("eval", "BUDGET_EXHAUSTED", "maxAgentCalls exhausted");
    this.agentCalls += 1;
  }
  /** One generated-cell activation against `max_steps`. The charge lands
   *  before the cell's own work, matching `step(ctx)` inside `runCell`. */
  private step(): void {
    if (this.steps + 1 > this.budgets.maxSteps) fail("eval", "BUDGET_EXHAUSTED", "maxSteps exhausted");
    this.steps += 1;
  }
  /** The effect context view budget: `{inputs, turn}` for every generated
   *  decide/agent cell — source cells never set view.cells, graph, note, or
   *  toolLog. The check precedes the agent-call charge and dispatch. */
  private contextBytes(inputs: JsonObject): void {
    const bytes = canonicalBytes({ inputs, turn: 0 });
    if (bytes > this.budgets.maxContextBytes) {
      fail("eval", "BUDGET_EXHAUSTED", `context view ${bytes}B exceeds maxContextBytes ${this.budgets.maxContextBytes}B`);
    }
  }
  private outputBytes(raw: JsonValue): void {
    const bytes = canonicalBytes(raw);
    if (bytes > this.budgets.maxOutputBytes) {
      fail("eval", "BUDGET_EXHAUSTED", `effect output ${bytes}B exceeds maxOutputBytes ${this.budgets.maxOutputBytes}B`);
    }
  }

  /** One generated expression cell: skipped when a wired input is
   *  undelivered, otherwise charged and evaluated; the produced `out` is
   *  checked against the port byte bound, as `checkOutputs` does. */
  private evalCell(expr: Expr, env: EvalEnv, mod: CheckedModule, depth: number): Maybe<JsonValue> {
    if (undelivered(expr, env)) return MISSING;
    this.step();
    const value = this.evalExpr(expr, env, mod, depth);
    if (value === MISSING) return MISSING;
    valueByteCheck(value);
    return value;
  }
  /** An effect operand: a bare name wires to its producer cell directly;
   *  any other expression gets its own generated cell. */
  private evalOperand(expr: Expr, env: EvalEnv, mod: CheckedModule, depth: number): Maybe<JsonValue> {
    return expr.kind === "name" ? this.evalExpr(expr, env, mod, depth) : this.evalCell(expr, env, mod, depth);
  }

  /** Evaluate a whole module: bind declared parameters from kebab-keyed
   *  arguments, run bindings in order, evaluate the result, apply the output
   *  contract. `scope` is the cell-path prefix this module's cells live at. */
  runModule(mod: CheckedModule, args: Record<string, JsonValue>, scope: string, depth: number): Maybe<JsonValue> {
    if (depth > this.budgets.maxDepth) fail("eval", "DEPTH_EXCEEDED", `depth ${depth} exceeds maxDepth ${this.budgets.maxDepth}`);
    const env: EvalEnv = new Map();
    // The `input` cell exists exactly when the program declares parameters.
    if (mod.parameters.length) this.step();
    for (const param of mod.parameters) {
      const name = kebab(param.name);
      // An absent argument leaves the port undelivered rather than failing —
      // cells depending on it skip downstream; `undefined` counts as absent.
      const raw = Object.hasOwn(args, name) ? args[name] : undefined;
      const supplied = raw === undefined ? MISSING : raw;
      if (supplied !== MISSING) checkPort(supplied, param.port, `input.${name}`);
      env.set(param.name, supplied);
    }
    for (const [i, binding] of mod.module.program.bindings.entries()) {
      const id = `b${i + 1}-${kebab(binding.name)}`;
      env.set(binding.name, this.evalTail(binding.expr, env, mod, scope, id, depth));
    }
    const result = this.evalTail(mod.module.program.result, env, mod, scope, this.resultSite(mod), depth);
    if (result === MISSING) return MISSING;
    checkPort(result, mod.resultPort!, "result.out");
    return result;
  }
  private resultSite(mod: CheckedModule): string {
    return mod.check!.sites.get(mod.module.program.result)?.id ?? "result";
  }

  /** A tail position: binding, `return`, or branch arm — the positions where
   *  effects are admitted. `pos` is the generated cell id for the position. */
  private evalTail(expr: Expr, env: EvalEnv, mod: CheckedModule, scope: string, pos: string, depth: number): Maybe<JsonValue> {
    switch (expr.kind) {
      case "if": case "match": {
        const info = mod.check!.sites.get(expr);
        if (info?.branch === undefined) break; // pure — one expression cell below
        // Selector → gated arm cells → many-ported merge. The selector is
        // its own cell; a skipped selector leaves every arm unselected.
        const discriminant = expr.kind === "if" ? expr.condition : expr.value;
        const value = this.evalCell(discriminant, env, mod, depth);
        if (value === MISSING) return MISSING;
        const arms: [string, Expr][] = expr.kind === "if"
          ? [["yes", expr.yes], ["no", expr.no]]
          : expr.arms;
        let index: number;
        if (expr.kind === "if") {
          index = requireBool(value, "if") ? 0 : 1;
        } else {
          // The selector's declared choice output rejects a foreign label
          // before any arm's guard can fire.
          if (typeof value !== "string" || !info.branch.labels.includes(value)) {
            fail("eval", "TYPE_MISMATCH", `match discriminant is not a declared label`);
          }
          index = arms.findIndex(([label]) => label === value);
          // A declared label with no arm delivers nothing — checked matches
          // cover exactly, so this is unreachable through `checkModule`.
          if (index < 0) return MISSING;
        }
        const arm = this.evalTail(arms[index]![1], env, mod, scope, `branch-${info.branch.index}-arm-${index + 1}`, depth);
        if (arm === MISSING) return MISSING; // the merge sees zero items and skips
        this.step();                          // merge cell
        return arm;
      }
      case "decide": {
        const context = this.evalOperand(expr.context, env, mod, depth);
        if (context === MISSING) return MISSING;
        const site = `${scope}${pos}-decide`;
        this.step();                          // decide cell
        this.contextBytes({ context });
        this.charge();
        const obs = { kind: "decide" as const, site, question: expr.question, criteria: expr.criteria, context };
        this.observations.push(obs);
        let raw: JsonValue;
        try { raw = this.oracle.decide(obs); }
        catch (error) { throw this.asEval(error); }
        this.outputBytes(raw);
        this.step();                          // decision-check cell
        return this.normalizeDecision(raw, expr.criteria.map(([label]) => label), site);
      }
      case "generate": {
        const instruction = this.evalOperand(expr.instruction, env, mod, depth);
        const context = this.evalOperand(expr.context, env, mod, depth);
        if (instruction === MISSING || context === MISSING) return MISSING;
        const site = `${scope}${pos}`;
        this.step();                          // agent cell
        // The agent's `instruction` input port is `text`; a statically-text
        // operand always delivers a string, so this check is unreachable on
        // checked programs but kept for exactness on foreign calls.
        if (typeof instruction !== "string") fail("eval", "TYPE_MISMATCH", `${pos}.instruction expected text`);
        this.contextBytes({ instruction, context });
        this.charge();
        const obs = { kind: "generate" as const, site, instruction, context };
        this.observations.push(obs);
        let raw: JsonValue;
        try { raw = this.oracle.generate(obs); }
        catch (error) { throw this.asEval(error); }
        this.outputBytes(raw);
        if (typeof raw !== "string") fail("eval", "EFFECT_UNPARSEABLE", `cell "${pos}": expected text output`);
        return raw;
      }
      case "call": return this.evalCall(expr, env, mod, scope, pos, depth);
      case "each": return this.evalEach(expr, env, mod, scope, pos, depth);
      default: return this.evalCell(expr, env, mod, depth);
    }
    // Pure `if`/`match` reach here only through the `break` above — one
    // expression cell evaluates the whole conditional.
    return this.evalCell(expr, env, mod, depth);
  }

  /** The generated `decision-check` normalization: the answer must carry a
   *  declared choice, a confidence in [0,1], and an in-range probability for
   *  every declared label; the emitted decision keeps declared labels only. */
  private normalizeDecision(raw: JsonValue, labels: string[], site: string): JsonValue {
    try { checkSchema(decisionAnswerSchema({ answer: { type: "choice", instructions: "", criteria: {} } }), raw, `cell "${site}" output`, "EFFECT_UNPARSEABLE"); }
    catch (error) { throw this.asEval(error); }
    const answer = get(get(raw, "answers"), "answer");
    const choice = get(answer, "choice");
    const confidence = get(answer, "confidence");
    const probabilities = get(answer, "probabilities");
    const valid = typeof choice === "string" && labels.includes(choice)
      && typeof confidence === "number" && confidence >= 0 && confidence <= 1
      && labels.every(label => {
        const p = get(probabilities, label);
        return typeof p === "number" && p >= 0 && p <= 1;
      });
    if (!valid) fail("eval", "EXPR_FAILED", `decision at ${site} carries malformed metadata`);
    const normalized: JsonObject = { value: choice, confidence, probabilities: Object.fromEntries(labels.map(label => [label, get(probabilities, label)])) };
    return normalized;
  }
  private asEval(error: unknown): SrcError {
    if (error instanceof SrcError) return error.phase === "eval" ? error : new SrcError("eval", error.code, error.message);
    if (error instanceof Error && "code" in error && typeof (error as { code: unknown }).code === "string") {
      return new SrcError("eval", (error as { code: string }).code, (error as Error).message);
    }
    return new SrcError("eval", "INTERNAL", error instanceof Error ? error.message : String(error));
  }

  private evalCall(expr: Extract<Expr, { kind: "call" }>, env: EvalEnv, mod: CheckedModule, scope: string, pos: string, depth: number): Maybe<JsonValue> {
    const child = mod.imports.get(expr.alias)!;
    const info = mod.check!.sites.get(expr);
    const args = expr.args.kind === "record" ? new Map(expr.args.entries) : new Map<string, Expr>();
    // One generated `pos-arg-N` cell per child parameter, in declaration
    // order. A skipped argument cell leaves the composition's input
    // undelivered — the organism cell itself never activates.
    const supplied: Record<string, JsonValue> = {};
    let skipped = false;
    for (const param of child.parameters) {
      const value = this.evalCell(args.get(param.name)!, env, mod, depth);
      if (value === MISSING) { skipped = true; continue; }
      // A `text` parameter's argument cell runs `sconcat` on a dynamic-JSON
      // argument; a non-string fails inside that cell before any port check.
      if (param.sourceType === "text" && typeof value !== "string") fail("eval", "EXPR_FAILED", `sconcat: expected string`);
      supplied[kebab(param.name)] = value;
    }
    if (skipped) return MISSING;
    const wrapped = info?.wrap === true;
    if (wrapped) this.step();         // `pos-trigger`
    this.step();                       // the organism cell itself
    for (const param of child.parameters) {
      checkPort(supplied[kebab(param.name)]!, param.port, `${pos}.${kebab(param.name)}`);
    }
    if (wrapped) { this.step(); this.step(); } // wrapper `input` + `call`
    const childScope = `${scope}${pos}/${wrapped ? "call/" : ""}`;
    return this.runModule(child, supplied, childScope, depth + (wrapped ? 2 : 1));
  }

  private evalEach(expr: Extract<Expr, { kind: "each" }>, env: EvalEnv, mod: CheckedModule, scope: string, pos: string, depth: number): Maybe<JsonValue> {
    const child = mod.imports.get(expr.alias)!;
    const args = expr.args.kind === "record" ? new Map(expr.args.entries) : new Map<string, Expr>();
    const over = expr.over;
    const supplied: Record<string, JsonValue> = {};
    let skipped = false;
    for (const param of child.parameters) {
      const arg = param.name === over ? expr.items : args.get(param.name)!;
      const value = this.evalCell(arg, env, mod, depth);
      if (value === MISSING) { skipped = true; continue; }
      if (param.name !== over && param.sourceType === "text" && typeof value !== "string") fail("eval", "EXPR_FAILED", `sconcat: expected string`);
      supplied[kebab(param.name)] = value;
    }
    if (skipped) return MISSING;
    this.step();                       // the `pos-each` cell
    for (const param of child.parameters) {
      // `over` arrives as a json port carrying the whole list; every other
      // parameter is checked against the child's declared port contract.
      checkPort(supplied[kebab(param.name)]!, param.name === over ? { type: "json" } : param.port, `${pos}-each.${kebab(param.name)}`);
    }
    const list = supplied[kebab(over)]!;
    if (!Array.isArray(list)) fail("eval", "TYPE_MISMATCH", `each cell "${pos}-each" over "${over}" expected a list`);
    if (list.length > expr.maxItems) fail("eval", "BUDGET_EXHAUSTED", `each cell "${pos}-each" got ${list.length} items, maxItems ${expr.maxItems}`);
    const overParam = child.parameters.find(param => param.name === over)!;
    const results: JsonValue[] = [];
    for (const [i, item] of list.entries()) {
      checkPort(item, overParam.port, `${pos}-each.${kebab(over)}[${i}]`);
      const outcome = this.runModule(child, { ...supplied, [kebab(over)]: item }, `${scope}${pos}-each/i${i}/`, depth + 1);
      if (outcome !== MISSING) results.push(outcome);
    }
    this.step();                       // the `pos` results-collection cell
    return results;
  }

  /** The pure position: literals, names, fields, records, lists, operators,
   *  conditionals and matches — evaluated directly, never via a generated
   *  expr program. Everything here happens inside one `evalCell` step. */
  evalExpr(expr: Expr, env: EvalEnv, mod: CheckedModule, depth: number): Maybe<JsonValue> {
    switch (expr.kind) {
      case "literal": return expr.value;
      case "name": {
        const value = env.get(expr.name);
        if (value === undefined) fail("eval", "EXPR_FAILED", `unbound name "${expr.name}"`);
        return value;
      }
      case "field": {
        const value = this.evalExpr(expr.value, env, mod, depth);
        if (value === MISSING) return MISSING;
        return get(value, expr.field);
      }
      case "probability": {
        const value = this.evalExpr(expr.value, env, mod, depth);
        if (value === MISSING) return MISSING;
        const label = this.evalExpr(expr.label, env, mod, depth);
        if (label === MISSING) return MISSING;
        if (typeof label !== "string") fail("eval", "EXPR_FAILED", `probability label must be text`);
        return get(get(value, "probabilities"), label);
      }
      case "record": {
        const out: JsonObject = {};
        // Generated programs evaluate record fields in canonical (BTreeMap)
        // key order, so an earlier-alphabet field failure wins over a later
        // one — match that evaluation order here.
        for (const [key, value] of [...expr.entries].sort((a, b) => compareUtf8(a[0], b[0]))) {
          const item = this.evalExpr(value, env, mod, depth);
          if (item === MISSING) return MISSING;
          Object.defineProperty(out, key, { value: item, writable: true, enumerable: true, configurable: true });
        }
        valueByteCheck(out);
        return out;
      }
      case "list": {
        const out: JsonValue[] = [];
        for (const item of expr.items) {
          const value = this.evalExpr(item, env, mod, depth);
          if (value === MISSING) return MISSING;
          out.push(value);
        }
        valueByteCheck(out);
        return out;
      }
      case "unary": {
        const value = this.evalExpr(expr.value, env, mod, depth);
        if (value === MISSING) return MISSING;
        if (expr.op === "not") return !requireBool(value, "not");
        const n = -requireNum(value, "neg");
        if (!Number.isFinite(n)) fail("eval", "EXPR_FAILED", "neg produced a non-finite number");
        return n || 0;
      }
      case "binary": return this.evalBinary(expr, env, mod, depth);
      case "if": {
        // A pure-position `if`: no effects inside, so both arms are pure and
        // evaluate in place within this cell — `["if", c, y, n]` selects one.
        const condition = this.evalExpr(expr.condition, env, mod, depth);
        if (condition === MISSING) return MISSING;
        return this.evalExpr(requireBool(condition, "if") ? expr.yes : expr.no, env, mod, depth);
      }
      case "match": {
        // A pure-position `match` lowers to a balanced `contains` tree inside
        // one cell; a foreign discriminant falls to the last arm — that path
        // is unreachable on statically checked programs, mirrored for
        // exactness.
        const value = this.evalExpr(expr.value, env, mod, depth);
        if (value === MISSING) return MISSING;
        const arm = expr.arms.find(([label]) => label === value) ?? expr.arms[expr.arms.length - 1]!;
        return this.evalExpr(arm[1], env, mod, depth);
      }
      case "decide": case "generate": case "call": case "each":
        return fail("eval", "EXPR_FAILED", "effect in a pure position");
    }
  }

  private evalBinary(expr: Extract<Expr, { kind: "binary" }>, env: EvalEnv, mod: CheckedModule, depth: number): Maybe<JsonValue> {
    // The static operator rewrite (`+` on text → `sconcat`) is recorded by the
    // checker; the emitted algal.expr.v1 program uses the resolved op.
    const op = mod.check?.sites.get(expr)?.op ?? expr.op;
    if (op === "and" || op === "or") {
      const want = op === "and";
      for (const node of [expr.left, expr.right]) {
        const value = this.evalExpr(node, env, mod, depth);
        if (value === MISSING) return MISSING;
        if (requireBool(value, op) !== want) return !want;
      }
      return want;
    }
    const left = this.evalExpr(expr.left, env, mod, depth);
    if (left === MISSING) return MISSING;
    const right = this.evalExpr(expr.right, env, mod, depth);
    if (right === MISSING) return MISSING;
    switch (op) {
      case "eq": return eqv(left, right);
      case "neq": return !eqv(left, right);
      case "lt": case "lte": case "gt": case "gte": {
        if (typeof left === "number" && typeof right === "number") {
          return op === "lt" ? left < right : op === "lte" ? left <= right : op === "gt" ? left > right : left >= right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return op === "lt" ? left < right : op === "lte" ? left <= right : op === "gt" ? left > right : left >= right;
        }
        return fail("eval", "EXPR_FAILED", `${op}: expected two numbers or two strings`);
      }
      case "add": case "mul": case "sub": case "div": case "mod": {
        const a = requireNum(left, op); const b = requireNum(right, op);
        if ((op === "div" || op === "mod") && b === 0) fail("eval", "EXPR_FAILED", `${op}: division by zero`);
        const r = op === "add" ? a + b : op === "mul" ? a * b : op === "sub" ? a - b : op === "div" ? a / b : a % b;
        if (!Number.isFinite(r)) fail("eval", "EXPR_FAILED", `${op} produced a non-finite number`);
        return r || 0;
      }
      case "sconcat": {
        if (typeof left !== "string" || typeof right !== "string") fail("eval", "EXPR_FAILED", `sconcat: expected two strings`);
        return left + right;
      }
      default: return fail("eval", "EXPR_FAILED", `unsupported operator ${op}`);
    }
  }
}

/** Evaluate a checked entry module. `args` are keyed by interface (kebab)
 *  names, exactly as they would arrive at the generated `input` cell. */
export function runProgram(project: LoadedProject, entry: CheckedModule, args: Record<string, JsonValue>, oracle: SourceOracle): SourceRun {
  const run = new Run(oracle, entry.module.program.budgets);
  try {
    const value = run.runModule(entry, args, "", 0);
    return { ok: true, value, observations: run.observations, agentCalls: run.agentCalls, steps: run.steps, ...(value === MISSING ? { resultAbsent: true } : {}) };
  } catch (error) {
    const src = error instanceof SrcError ? error : undefined;
    return {
      ok: false,
      error: { code: src?.code ?? "INTERNAL", message: src?.message ?? String(error) },
      observations: run.observations,
      agentCalls: run.agentCalls,
      steps: run.steps,
    };
  }
}
