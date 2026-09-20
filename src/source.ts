// A bounded authoring front end. Its output is the ordinary v1 manifest;
// source locations and compiler identity stay in a separate, digest-bound map.
import { BOUNDS, manifestToJson, parseOrganismManifest, type AgentOutput, type Budgets, type Cell, type Edge, type OrganismManifest, type PortMap, type PortType } from "./contract";
import { digestCanonical, digestText, type Digest } from "./digest";
import { AlgalError } from "./errors";
import type { JsonObject, JsonValue } from "./values";

export const SOURCE_VERSION = "algal.source.v1" as const;
export const SOURCE_BOUNDS = Object.freeze({
  maxSourceBytes: 65_536, maxTokens: 8_192, maxNodes: 1_024,
  maxDepth: 16, maxBindings: 24, maxParameters: 16,
  maxNameLength: 40, maxChoiceLabels: 16, maxCollectionItems: 64,
  maxFiles: 16, maxImports: 16, maxProjectBytes: 1_048_576, maxImportDepth: 8,
});
export const SOURCE_PROJECT_BOUNDS = Object.freeze({
  maxFiles: SOURCE_BOUNDS.maxFiles, maxImports: SOURCE_BOUNDS.maxImports,
  maxTotalBytes: SOURCE_BOUNDS.maxProjectBytes, maxImportDepth: SOURCE_BOUNDS.maxImportDepth,
});
/** Changing these defaults or the model-visible envelope changes compilation. */
export const SOURCE_PROFILE = Object.freeze({
  id: "algal.source.profile.v1", compilerVersion: "1.2.0",
  budgets: Object.freeze({ maxSteps: 256, maxAgentCalls: 0, maxWork: 1_000_000,
    maxContextBytes: 65_536, maxOutputBytes: 65_536, maxDepth: 4 }),
  exprFuel: BOUNDS.maxExprFuel,
});
export const GENERATE_PROMPT = "Algal source generation envelope v1. Follow the instruction in inputs.instruction. Use only inputs.context as task context. Return the requested text.";

export type SourcePosition = { offset: number; line: number; column: number };
export type SourceSpan = { start: SourcePosition; end: SourcePosition };
/** Bounded presentation metadata; never part of executable manifest identity. */
export type SourceAnnotation = { title: string; operation: string; summary: string; details: string[] };
export type SourceMap = {
  contract: "algal.source-map.v1";
  sourceDigest: Digest;
  manifestDigest: Digest;
  compilerVersion: string;
  profile: string;
  cells: { cellId: string; role: string; span: SourceSpan; annotation?: SourceAnnotation }[];
};
export type SourceCompilerOptions = { entry?: string; modules?: Readonly<Record<string, string>> };
export type SourceCompilation = {
  manifest: OrganismManifest;
  sourceMap: SourceMap;
  /** Reachable dependency closure, child before parent, excluding the root. */
  modules: OrganismManifest[];
  analysis: { maxAgentCalls: number; requiredDepth: number };
};
export type SourceImport = { path: string; alias: string; span: SourceSpan };
export class SourceError extends AlgalError {
  readonly diagnostic: { message: string; span: SourceSpan };
  constructor(message: string, span: SourceSpan) {
    super("PARSE_FAILED", `${span.start.line}:${span.start.column}: ${message}`);
    this.name = "SourceError";
    this.diagnostic = { message, span };
  }
}

type Token = { kind: "id" | "string" | "number" | "symbol" | "eof"; text: string; start: number; end: number };
type Span = { start: number; end: number };
type Expr = Span & (
  | { kind: "literal"; value: JsonValue }
  | { kind: "name"; name: string }
  | { kind: "field"; value: Expr; field: string }
  | { kind: "probability"; value: Expr; label: Expr }
  | { kind: "unary"; op: string; value: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "record"; entries: [string, Expr][] }
  | { kind: "list"; items: Expr[] }
  | { kind: "if"; condition: Expr; yes: Expr; no: Expr }
  | { kind: "match"; value: Expr; arms: [string, Expr][] }
  | { kind: "decide"; question: string; context: Expr; criteria: [string, string][] }
  | { kind: "generate"; instruction: Expr; context: Expr }
  | { kind: "call"; alias: string; args: Expr }
  | { kind: "each"; alias: string; over: string; items: Expr; args: Expr; maxItems: number }
);
type SourceProgram = Span & { name: string; parameters: { name: string; type: "text" | "json"; span: Span }[]; output: "text" | "json"; budgets: Budgets; bindings: { name: string; expr: Expr }[]; result: Expr };
const reserved = new Set(["program", "budget", "let", "return", "decide", "generate", "using", "as", "choice", "match", "if", "else", "true", "false", "null", "text", "json", "import", "from", "call", "each", "over", "in", "max_items", "__proto__", "prototype", "constructor"]);
const operators: Record<string, { precedence: number; op: string }> = {
  "||": { precedence: 1, op: "or" }, "&&": { precedence: 2, op: "and" },
  "==": { precedence: 3, op: "eq" }, "!=": { precedence: 3, op: "neq" },
  "<": { precedence: 4, op: "lt" }, "<=": { precedence: 4, op: "lte" }, ">": { precedence: 4, op: "gt" }, ">=": { precedence: 4, op: "gte" },
  "+": { precedence: 5, op: "add" }, "-": { precedence: 5, op: "sub" },
  "*": { precedence: 6, op: "mul" }, "/": { precedence: 6, op: "div" }, "%": { precedence: 6, op: "mod" },
};

class Parser {
  readonly tokens: Token[] = [];
  private index = 0;
  private nodes = 0;
  constructor(readonly source: string) {
    if (Buffer.byteLength(source) > SOURCE_BOUNDS.maxSourceBytes) this.fail("source exceeds 65536 UTF-8 bytes", { start: 0, end: 0 });
    let i = 0;
    while (i < source.length) {
      const rest = source.slice(i);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) { i += whitespace[0].length; continue; }
      if (rest.startsWith("//")) { const end = source.indexOf("\n", i); i = end < 0 ? source.length : end + 1; continue; }
      if (rest.startsWith("/*")) { const end = source.indexOf("*/", i + 2); if (end < 0) this.fail("unterminated comment", { start: i, end: source.length }); i = end + 2; continue; }
      const start = i;
      let kind: Token["kind"] = "symbol";
      let text: string;
      if (rest[0] === '"') {
        const match = /^"(?:[^"\\\r\n]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/.exec(rest);
        if (!match) this.fail("invalid or unterminated JSON string", { start, end: start + 1 });
        text = match[0]; kind = "string";
        try { JSON.parse(text); } catch { this.fail("invalid JSON string escape or control character", { start, end: start + text.length }); }
      } else {
        const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
        const number = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(rest);
        if (id) { text = id[0]; kind = "id"; }
        else if (number) { text = number[0]; kind = "number"; }
        else {
          const symbol = /^(?:->|=>|==|!=|<=|>=|&&|\|\||[(){}[\],:;.=+\-*/%!<>])/.exec(rest);
          if (!symbol) this.fail(`unsupported character ${JSON.stringify(rest[0])}`, { start, end: start + 1 });
          text = symbol[0];
        }
      }
      i += text.length;
      this.tokens.push({ kind, text, start, end: i });
      if (this.tokens.length > SOURCE_BOUNDS.maxTokens) this.fail("source token limit exceeded", { start, end: i });
    }
    this.tokens.push({ kind: "eof", text: "<end>", start: i, end: i });
  }
  position(offset: number): SourcePosition {
    const prefix = this.source.slice(0, offset);
    return { offset, line: prefix.split("\n").length, column: offset - prefix.lastIndexOf("\n") };
  }
  span(value: Span): SourceSpan { return { start: this.position(value.start), end: this.position(value.end) }; }
  fail(message: string, span: Span = this.peek()): never { throw new SourceError(message, this.span(span)); }
  private peek(): Token { return this.tokens[Math.min(this.index, this.tokens.length - 1)]!; }
  private take(): Token { const token = this.peek(); if (this.index < this.tokens.length - 1) this.index++; return token; }
  private eat(text: string): boolean { if (this.peek().text !== text) return false; this.take(); return true; }
  private expect(text: string): Token { if (this.peek().text !== text) this.fail(`expected ${JSON.stringify(text)}, found ${JSON.stringify(this.peek().text)}`); return this.take(); }
  private name(): Token {
    const token = this.take();
    if (token.kind !== "id" || reserved.has(token.text)) this.fail(`expected a non-reserved identifier, found ${JSON.stringify(token.text)}`, token);
    if (token.text.length > SOURCE_BOUNDS.maxNameLength) this.fail("identifier exceeds 40 characters", token);
    return token;
  }
  private type(): "text" | "json" { const token = this.take(); if (token.text !== "text" && token.text !== "json") this.fail("source interfaces support only text and json; authority-bearing types are not supported", token); return token.text; }
  private string(): string { const token = this.take(); if (token.kind !== "string") this.fail("expected a quoted string", token); return JSON.parse(token.text) as string; }
  private list<T>(close: string, item: () => T, max: number): T[] {
    const items: T[] = [];
    while (!this.eat(close)) {
      if (items.length >= max) this.fail(`collection exceeds ${max} entries`);
      items.push(item());
      if (this.eat(close)) break;
      this.expect(",");
    }
    return items;
  }
  imports(): SourceImport[] {
    const imports: SourceImport[] = [];
    while (this.peek().text === "import") {
      const start = this.take().start;
      if (imports.length >= SOURCE_BOUNDS.maxImports) this.fail("import limit exceeded");
      const alias = this.name().text; this.expect("from"); const path = this.string();
      const end = this.tokens[this.index - 1]!.end; this.eat(";");
      if (imports.some(item => item.alias === alias)) this.fail(`duplicate import alias ${alias}`, { start, end });
      imports.push({ alias, path, span: this.span({ start, end }) });
    }
    return imports;
  }
  program(): SourceProgram {
    const start = this.expect("program").start;
    const name = this.name();
    if (!/^[a-z][a-z0-9_]*$/.test(name.text)) this.fail("program names use lowercase letters, digits, and underscores", name);
    this.expect("(");
    const parameters = this.list(")", () => { const token = this.name(); this.expect(":"); return { name: token.text, type: this.type(), span: token }; }, SOURCE_BOUNDS.maxParameters);
    this.expect("->"); const output = this.type(); this.expect("{");
    this.expect("budget"); this.expect("{");
    const budgets: Budgets = { ...SOURCE_PROFILE.budgets };
    const mapping = { max_agent_calls: "maxAgentCalls", max_steps: "maxSteps", max_work: "maxWork", max_context_bytes: "maxContextBytes", max_output_bytes: "maxOutputBytes", max_depth: "maxDepth" } as const;
    const keys = new Set<string>();
    this.list("}", () => {
      const key = this.name();
      if (!(key.text in mapping)) this.fail(`unknown budget ${key.text}`, key);
      if (keys.has(key.text)) this.fail(`duplicate budget ${key.text}`, key);
      keys.add(key.text); this.expect(":"); const number = this.take();
      const value = Number(number.text); const mapped = mapping[key.text as keyof typeof mapping];
      const minimum = mapped === "maxAgentCalls" || mapped === "maxDepth" ? 0 : 1;
      if (number.kind !== "number" || !Number.isSafeInteger(value) || value < minimum || value > BOUNDS[mapped]) this.fail(`budget ${key.text} must be an integer in ${minimum}..${BOUNDS[mapped]}`, number);
      budgets[mapped] = value;
    }, 6);
    if (!keys.has("max_agent_calls")) this.fail("budget must explicitly declare max_agent_calls");
    const bindings: SourceProgram["bindings"] = [];
    while (this.eat("let")) {
      if (bindings.length >= SOURCE_BOUNDS.maxBindings) this.fail("binding limit exceeded");
      const name = this.name().text; this.expect("="); const expr = this.expression(); this.eat(";"); bindings.push({ name, expr });
    }
    this.expect("return"); const result = this.expression(); this.eat(";"); const end = this.expect("}").end;
    this.expect("<end>");
    return { start, end, name: name.text, parameters, output, budgets, bindings, result };
  }
  private expression(min = 0, depth = 0): Expr {
    if (depth > SOURCE_BOUNDS.maxDepth) this.fail("expression nesting limit exceeded");
    let value = this.primary(depth);
    while (true) {
      if (this.eat(".")) {
        const field = this.name();
        if (field.text === "probability" && this.eat("(")) {
          const label = this.expression(0, depth + 1); const end = this.expect(")").end;
          value = this.node({ kind: "probability", value, label, start: value.start, end });
        } else value = this.node({ kind: "field", value, field: field.text, start: value.start, end: field.end });
        continue;
      }
      const op = Object.hasOwn(operators, this.peek().text) ? operators[this.peek().text] : undefined;
      if (!op || op.precedence < min) break;
      this.take(); const right = this.expression(op.precedence + 1, depth + 1);
      value = this.node({ kind: "binary", op: op.op, left: value, right, start: value.start, end: right.end });
    }
    return value;
  }
  private node(value: Expr): Expr { if (++this.nodes > SOURCE_BOUNDS.maxNodes) this.fail("expression node limit exceeded", value); return value; }
  private primary(depth: number): Expr {
    const token = this.take(); const start = token.start;
    const build = (value: Omit<Expr, "start" | "end">): Expr => this.node({ ...value, start, end: this.tokens[this.index - 1]!.end } as Expr);
    if (token.kind === "string") return build({ kind: "literal", value: JSON.parse(token.text) } as never);
    if (token.kind === "number") { const value = Number(token.text); if (!Number.isFinite(value)) this.fail("numbers must be finite", token); return build({ kind: "literal", value } as never); }
    if (token.text === "true" || token.text === "false" || token.text === "null") return build({ kind: "literal", value: JSON.parse(token.text) } as never);
    if (token.text === "(" ) { const value = this.expression(0, depth + 1); this.expect(")"); return value; }
    if (token.text === "!" || token.text === "-") return build({ kind: "unary", op: token.text === "!" ? "not" : "neg", value: this.expression(7, depth + 1) } as never);
    if (token.text === "[") return build({ kind: "list", items: this.list("]", () => this.expression(0, depth + 1), SOURCE_BOUNDS.maxCollectionItems) } as never);
    if (token.text === "{") {
      const entries = this.list("}", (): [string, Expr] => { const key = this.peek().kind === "string" ? this.string() : this.name().text; this.expect(":"); return [key, this.expression(0, depth + 1)]; }, SOURCE_BOUNDS.maxCollectionItems);
      this.unique(entries.map(([key]) => key), "record key", token);
      return build({ kind: "record", entries } as never);
    }
    if (token.text === "if") {
      const condition = this.expression(0, depth + 1); this.expect("{"); const yes = this.expression(0, depth + 1); this.expect("}"); this.expect("else"); this.expect("{"); const no = this.expression(0, depth + 1); this.expect("}");
      return build({ kind: "if", condition, yes, no } as never);
    }
    if (token.text === "match") {
      const value = this.expression(0, depth + 1); this.expect("{");
      const arms = this.list("}", (): [string, Expr] => { const label = this.name().text; this.expect("=>"); return [label, this.expression(0, depth + 1)]; }, SOURCE_BOUNDS.maxChoiceLabels);
      this.unique(arms.map(([label]) => label), "match label", token);
      return build({ kind: "match", value, arms } as never);
    }
    if (token.text === "decide") {
      const question = this.string(); const context = (this.expect("using"), this.expression(0, depth + 1)); this.expect("as"); this.expect("choice"); this.expect("{");
      const criteria = this.list("}", (): [string, string] => { const label = this.name().text; this.expect(":"); return [label, this.string()]; }, SOURCE_BOUNDS.maxChoiceLabels);
      if (criteria.length === 0) this.fail("a choice needs at least one label", token);
      this.unique(criteria.map(([label]) => label), "choice label", token);
      return build({ kind: "decide", question, context, criteria } as never);
    }
    if (token.text === "generate") { const instruction = this.expression(0, depth + 1); this.expect("using"); const context = this.expression(0, depth + 1); return build({ kind: "generate", instruction, context } as never); }
    if (token.text === "call") {
      const alias = this.name().text; this.expect("using"); const args = this.expression(0, depth + 1);
      return build({ kind: "call", alias, args } as never);
    }
    if (token.text === "each") {
      const alias = this.name().text; this.expect("over"); const over = this.name().text; this.expect("in");
      const items = this.expression(0, depth + 1); this.expect("using"); const args = this.expression(0, depth + 1);
      this.expect("max_items"); const bound = this.take(); const maxItems = Number(bound.text);
      if (bound.kind !== "number" || !Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > BOUNDS.maxEachItems) this.fail(`max_items must be an integer in 1..${BOUNDS.maxEachItems}`, bound);
      return build({ kind: "each", alias, over, items, args, maxItems } as never);
    }
    if (token.kind === "id" && !reserved.has(token.text)) { if (token.text.length > SOURCE_BOUNDS.maxNameLength) this.fail("identifier exceeds 40 characters", token); return build({ kind: "name", name: token.text } as never); }
    return this.fail(`unsupported expression ${JSON.stringify(token.text)}`, token);
  }
  unique(names: string[], what: string, span: Span): void { if (new Set(names).size !== names.length) this.fail(`duplicate ${what}`, span); }
}

type Type = { kind: "text"; literal?: string } | { kind: "json" | "number" | "boolean" | "null" | "list" } | { kind: "choice" | "decision"; labels: string[] } | { kind: "record"; fields: Map<string, Type> };
type Reference = { cell: string; port: string; type: Type };
type Pure = { program: JsonValue; type: Type; refs: Map<string, Reference> };
type CompiledModule = SourceCompilation & { program: SourceProgram; importDepth: number };
const isText = (t: Type): boolean => t.kind === "text" || t.kind === "choice";
function port(type: Type): PortType { return type.kind === "choice" ? { type: "choice", labels: type.labels } : { type: isText(type) ? "text" : "json" }; }
function output(type: Type): AgentOutput {
  if (type.kind === "choice") return { kind: "choice", labels: type.labels };
  if (isText(type)) return { kind: "text" };
  // The core schema is shallow. Only claim what the expression itself proves.
  const schema: JsonObject = type.kind === "json" ? {} : { type: type.kind === "record" || type.kind === "decision" ? "object" : type.kind === "list" ? "array" : type.kind };
  return { kind: "json", schema };
}
function field(program: JsonValue, key: JsonValue): JsonValue {
  return Array.isArray(program) && program[0] === "get" ? [...program, key] : ["let", "_source_value", program, ["get", "_source_value", key]];
}

function clipped(value: string, max = 160): string { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
/** Render the parsed expression, retaining source names without parsing cell IDs. */
function describe(expr: Expr): string {
  const show = (value: Expr): string => describe(value);
  let text: string;
  switch (expr.kind) {
    case "literal": text = JSON.stringify(expr.value); break;
    case "name": text = expr.name; break;
    case "field": text = `${show(expr.value)}.${expr.field}`; break;
    case "probability": text = `${show(expr.value)}.probability(${show(expr.label)})`; break;
    case "unary": text = `${expr.op === "not" ? "!" : "-"}${show(expr.value)}`; break;
    case "binary": { const operator = Object.entries(operators).find(([, value]) => value.op === expr.op)?.[0] ?? expr.op; text = `(${show(expr.left)} ${operator} ${show(expr.right)})`; break; }
    case "record": text = `{ ${expr.entries.map(([key, value]) => `${JSON.stringify(key)}: ${show(value)}`).join(", ")} }`; break;
    case "list": text = `[${expr.items.map(show).join(", ")}]`; break;
    case "if": text = `if ${show(expr.condition)} { ${show(expr.yes)} } else { ${show(expr.no)} }`; break;
    case "match": text = `match ${show(expr.value)}`; break;
    case "decide": text = `decide ${JSON.stringify(expr.question)} using ${show(expr.context)}`; break;
    case "generate": text = `generate ${show(expr.instruction)} using ${show(expr.context)}`; break;
    case "call": text = `call ${expr.alias} using ${show(expr.args)}`; break;
    case "each": text = `each ${expr.alias} over ${expr.over} in ${show(expr.items)} max_items ${expr.maxItems}`; break;
  }
  return clipped(text);
}
function annotation(title: string, operation: string, summary: string, details: string[] = []): SourceAnnotation {
  return { title: clipped(title, 96), operation: clipped(operation, 40), summary: clipped(summary), details: details.slice(0, 16).map(detail => clipped(detail)) };
}
function expressionAnnotation(title: string, expr: Expr, role: string): SourceAnnotation {
  let details: string[] = [];
  if (expr.kind === "decide") details = expr.criteria.map(([label, description]) => `${label}: ${description}`);
  if (expr.kind === "generate") details = [`instruction: ${describe(expr.instruction)}`, `context: ${describe(expr.context)}`];
  if (expr.kind === "match") details = expr.arms.map(([label, arm]) => `${label} => ${describe(arm)}`);
  if (expr.kind === "if") details = [`condition: ${describe(expr.condition)}`, `true => ${describe(expr.yes)}`, `false => ${describe(expr.no)}`];
  if (expr.kind === "call") details = [`arguments: ${describe(expr.args)}`];
  if (expr.kind === "each") details = [`arguments: ${describe(expr.args)}`, `At most ${expr.maxItems} items; ordered results`];
  if (role === "decision-check") return annotation(title, role, "Validate the declared choice, confidence, and every probability before use.", expr.kind === "decide" ? expr.criteria.map(([label]) => `admitted label: ${label}`) : []);
  return annotation(title, role === "expression" ? expr.kind : role, describe(expr), details);
}
function hasEffect(expr: Expr): boolean {
  switch (expr.kind) {
    case "decide": case "generate": case "call": case "each": return true;
    case "literal": case "name": return false;
    case "field": case "unary": return hasEffect(expr.value);
    case "probability": return hasEffect(expr.value) || hasEffect(expr.label);
    case "binary": return hasEffect(expr.left) || hasEffect(expr.right);
    case "record": return expr.entries.some(([, value]) => hasEffect(value));
    case "list": return expr.items.some(hasEffect);
    case "if": return hasEffect(expr.condition) || hasEffect(expr.yes) || hasEffect(expr.no);
    case "match": return hasEffect(expr.value) || expr.arms.some(([, arm]) => hasEffect(arm));
  }
}

class Compiler {
  private readonly env = new Map<string, Reference>();
  private readonly cells: Cell[] = [];
  private readonly edges: Edge[] = [];
  private readonly mappings: SourceMap["cells"] = [];
  private calls = 0;
  private requiredDepth = 0;
  private readonly modules = new Map<Digest, OrganismManifest>();
  private branches = 0;
  private readonly controls: { selector: Reference; label: string }[] = [];
  constructor(private readonly parser: Parser, private readonly imports: ReadonlyMap<string, CompiledModule>) {}
  private add(cell: Cell, span: Span, role: string, sourceAnnotation: SourceAnnotation, guarded = true): void {
    if (this.cells.length >= BOUNDS.maxCells) this.parser.fail("lowered cell limit exceeded", span);
    // Each newly created arm cell is gated, even a constant or an effect's pure
    // operands. Required controls are deliberately absent from model views.
    const control = this.controls.at(-1);
    if (control && guarded) {
      // The nearest selector is itself gated by its parent. Carrying every
      // ancestor again would needlessly consume the core's bounded edge count.
      const name = "source-control-1";
      if (cell.kind !== "expr" && cell.kind !== "agent" && cell.kind !== "decide") this.parser.fail("unsupported guarded source cell", span);
      cell.inputs[name] = port(control.selector.type);
      this.edges.push({ from: { cell: control.selector.cell, port: control.selector.port }, to: { cell: cell.id, port: name }, guard: { equals: control.label } });
    }
    this.cells.push(cell); this.mappings.push({ cellId: cell.id, role, span: this.parser.span(span), annotation: sourceAnnotation });
  }
  private wire(id: string, refs: Map<string, Reference>): PortMap {
    const inputs: PortMap = {};
    for (const [name, ref] of refs) { inputs[name] = port(ref.type); this.edges.push({ from: { cell: ref.cell, port: ref.port }, to: { cell: id, port: name } }); }
    return inputs;
  }
  private compatible(left: Type, right: Type, span: Span): Type {
    if (isText(left) && isText(right)) return { kind: "text" };
    if (left.kind === right.kind && left.kind !== "decision" && left.kind !== "record") return left;
    if (!isText(left) && !isText(right)) return { kind: "json" };
    return this.parser.fail("branches must agree on text versus json output", span);
  }
  private require(type: Type, kind: "number" | "boolean" | "text", span: Span): void {
    if (type.kind === "json" || type.kind === kind || (kind === "text" && isText(type))) return;
    this.parser.fail(`expected ${kind}, found ${type.kind}`, span);
  }
  private pure(expr: Expr): Pure {
    const refs = new Map<string, Reference>();
    const visit = (expr: Expr): { program: JsonValue; type: Type } => {
      switch (expr.kind) {
        case "literal": return { program: expr.value, type: typeof expr.value === "string" ? { kind: "text", literal: expr.value } : { kind: expr.value === null ? "null" : typeof expr.value as "number" | "boolean" } };
        case "name": {
          const ref = this.env.get(expr.name);
          if (!ref) this.parser.fail(`unknown name ${expr.name}`, expr);
          let name = [...refs].find(([, existing]) => existing === ref)?.[0];
          if (name === undefined) { name = `value-${refs.size + 1}`; refs.set(name, ref); }
          return { program: ["get", name], type: ref.type };
        }
        case "record": { const items = expr.entries.map(([name, value]) => [name, visit(value)] as const); return { program: Object.fromEntries(items.map(([name, value]) => [name, value.program])), type: { kind: "record", fields: new Map(items.map(([name, value]) => [name, value.type])) } }; }
        case "list": return { program: ["list", ...expr.items.map(item => visit(item).program)], type: { kind: "list" } };
        case "field": {
          const value = visit(expr.value); let type: Type = { kind: "json" };
          if (value.type.kind === "decision") {
            if (expr.field === "value") type = { kind: "choice", labels: value.type.labels };
            else if (expr.field === "confidence") type = { kind: "number" };
            else if (expr.field === "probabilities") type = { kind: "record", fields: new Map(value.type.labels.map(label => [label, { kind: "number" }])) };
            else this.parser.fail(`unknown decision field ${expr.field}`, expr);
          } else if (value.type.kind === "record") { const known = value.type.fields.get(expr.field); if (!known) this.parser.fail(`unknown record field ${expr.field}`, expr); type = known; }
          else if (value.type.kind !== "json") this.parser.fail(`cannot select a field from ${value.type.kind}`, expr);
          return { program: field(value.program, expr.field), type };
        }
        case "probability": {
          const value = visit(expr.value); const label = visit(expr.label);
          if (value.type.kind !== "decision") this.parser.fail("probability requires a decision value", expr);
          const labels = label.type.kind === "choice" ? label.type.labels : label.type.kind === "text" && label.type.literal !== undefined ? [label.type.literal] : [];
          const allowed = value.type.labels;
          if (!labels.length || labels.some(item => !allowed.includes(item))) this.parser.fail("probability requires one of this decision's declared labels", expr.label);
          return { program: field(field(value.program, "probabilities"), label.program), type: { kind: "number" } };
        }
        case "unary": { const value = visit(expr.value); const kind = expr.op === "not" ? "boolean" : "number"; this.require(value.type, kind, expr); return { program: [expr.op, value.program], type: { kind } }; }
        case "binary": {
          const left = visit(expr.left); const right = visit(expr.right); let op = expr.op; let kind: "number" | "boolean" | "text" = "boolean";
          if (["add", "sub", "mul", "div", "mod"].includes(op)) {
            if (op === "add" && isText(left.type) && isText(right.type)) { op = "sconcat"; kind = "text"; }
            else { this.require(left.type, "number", expr.left); this.require(right.type, "number", expr.right); kind = "number"; }
          } else if (op === "and" || op === "or") { this.require(left.type, "boolean", expr.left); this.require(right.type, "boolean", expr.right); }
          else if (!["eq", "neq"].includes(op)) { const ordered = isText(left.type) || isText(right.type) ? "text" : "number"; this.require(left.type, ordered, expr.left); this.require(right.type, ordered, expr.right); }
          return { program: [op, left.program, right.program], type: { kind } };
        }
        case "if": { const condition = visit(expr.condition); this.require(condition.type, "boolean", expr.condition); const yes = visit(expr.yes); const no = visit(expr.no); return { program: ["if", condition.program, yes.program, no.program], type: this.compatible(yes.type, no.type, expr) }; }
        case "match": {
          const value = visit(expr.value);
          if (value.type.kind !== "choice") this.parser.fail("match requires a closed choice, such as decision.value", expr.value);
          const labels = expr.arms.map(([label]) => label);
          if (labels.length !== value.type.labels.length || value.type.labels.some(label => !labels.includes(label))) this.parser.fail(`match must cover exactly: ${value.type.labels.join(", ")}`, expr);
          const arms = expr.arms.map(([label, arm]) => [label, visit(arm)] as const); let type = arms[0]![1].type;
          for (const [, arm] of arms.slice(1)) type = this.compatible(type, arm.type, expr);
          const branch = (group: typeof arms): JsonValue => {
            if (group.length === 1) return group[0]![1].program;
            const middle = Math.ceil(group.length / 2);
            const left = group.slice(0, middle);
            return ["if", ["contains", ["quote", left.map(([label]) => label)], ["get", "_source_match"]], branch(left), branch(group.slice(middle))];
          };
          const body = branch(arms);
          return { program: ["let", "_source_match", value.program, body], type };
        }
        case "decide": case "generate": case "call": case "each": return this.parser.fail("effects and calls require a whole binding, return, or branch arm; conditions, operands, and context expressions must be pure", expr);
      }
    };
    return { ...visit(expr), refs };
  }
  private expression(id: string, expr: Expr, role = "expression", title = "expression"): Reference {
    const pure = this.pure(expr); this.add({ id, kind: "expr", inputs: this.wire(id, pure.refs), expr: { contract: "algal.expr.v1", program: pure.program }, output: output(pure.type) }, expr, role, expressionAnnotation(title, expr, role));
    return { cell: id, port: "out", type: pure.type };
  }
  private operand(id: string, expr: Expr, title: string): Reference { if (expr.kind === "name") { const ref = this.env.get(expr.name); if (!ref) this.parser.fail(`unknown name ${expr.name}`, expr); return ref; } return this.expression(id, expr, "effect-input", title); }
  private branch(id: string, expr: Extract<Expr, { kind: "if" | "match" }>, title: string): Reference {
    const prefix = `branch-${++this.branches}`;
    const value = this.pure(expr.kind === "if" ? expr.condition : expr.value);
    let labels: string[];
    let arms: [string, Expr][];
    let program: JsonValue;
    if (expr.kind === "if") {
      this.require(value.type, "boolean", expr.condition);
      labels = ["yes", "no"]; arms = [["yes", expr.yes], ["no", expr.no]];
      program = ["if", value.program, "yes", "no"];
    } else {
      if (value.type.kind !== "choice") this.parser.fail("match requires a closed choice, such as decision.value", expr.value);
      labels = value.type.labels; arms = expr.arms;
      if (arms.length !== labels.length || labels.some(label => !arms.some(([arm]) => arm === label))) this.parser.fail(`match must cover exactly: ${labels.join(", ")}`, expr);
      program = value.program;
    }
    const selector: Reference = { cell: `${prefix}-select`, port: "out", type: { kind: "choice", labels } };
    this.add({ id: selector.cell, kind: "expr", inputs: this.wire(selector.cell, value.refs), expr: { contract: "algal.expr.v1", program }, output: output(selector.type) }, expr, "branch-selector", expressionAnnotation(`${title} · select`, expr, "branch-selector"));
    const results: Reference[] = [];
    const baseline = this.calls; let maximum = 0;
    for (const [index, [label, arm]] of arms.entries()) {
      this.calls = baseline;
      this.controls.push({ selector, label });
      const result = this.lower(`${prefix}-arm-${index + 1}`, arm, `${title} · ${label}`);
      this.controls.pop();
      results.push(result); maximum = Math.max(maximum, this.calls - baseline);
    }
    this.calls = baseline + maximum;
    let type = results[0]!.type;
    for (const result of results.slice(1)) {
      // Preserve a decision refinement only when every arm validates the same
      // closed labels. Pure-expression lowering retains its original types.
      if (type.kind === "decision" && result.type.kind === "decision" && type.labels.length === result.type.labels.length && type.labels.every(label => result.type.kind === "decision" && result.type.labels.includes(label))) continue;
      type = this.compatible(type, result.type, expr);
    }
    for (const result of results) this.edges.push({ from: { cell: result.cell, port: result.port }, to: { cell: id, port: "selected" } });
    const selected: JsonValue = ["get", "selected"];
    const merge: JsonValue = ["nth", ["if", ["eq", ["len", selected], 1], selected, ["list"]], 0];
    this.add({ id, kind: "expr", inputs: { selected: { ...port(type), many: true } }, expr: { contract: "algal.expr.v1", program: merge }, output: output(type) }, expr, "branch-merge", expressionAnnotation(title, expr, "branch-merge"));
    return { cell: id, port: "out", type };
  }
  private lower(id: string, expr: Expr, title: string): Reference {
    if ((expr.kind === "if" || expr.kind === "match") && hasEffect(expr)) return this.branch(id, expr, title);
    if (expr.kind === "call" || expr.kind === "each") return this.composition(id, expr, title);
    if (expr.kind === "generate") {
      const instruction = this.operand(`${id}-instruction`, expr.instruction, `${title} · instruction`);
      if (!isText(instruction.type)) this.parser.fail("generation instruction must be text", expr.instruction);
      const context = this.operand(`${id}-context`, expr.context, `${title} · context`); this.calls++;
      this.add({ id, kind: "agent", inputs: this.wire(id, new Map([["instruction", instruction], ["context", context]])), prompt: GENERATE_PROMPT, view: { inputs: ["instruction", "context"] }, output: { kind: "text" } }, expr, "generate", expressionAnnotation(title, expr, "generate"));
      return { cell: id, port: "out", type: { kind: "text" } };
    }
    if (expr.kind === "decide") {
      const context = this.operand(`${id}-context`, expr.context, `${title} · context`); const raw = `${id}-decide`; const labels = expr.criteria.map(([label]) => label); this.calls++;
      this.add({ id: raw, kind: "decide", inputs: this.wire(raw, new Map([["context", context]])), questions: { answer: { type: "choice", instructions: expr.question, criteria: Object.fromEntries(expr.criteria) } }, view: { inputs: ["context"] } }, expr, "decide", expressionAnnotation(`${title} · decide`, expr, "decide"));
      // Core decide results are JSON. Check every source refinement before a
      // downstream branch can rely on it; malformed labels never take an else.
      const get = (...path: string[]): JsonValue => ["get", "_source_decision", ...path];
      const validProbabilities: JsonValue = ["fold", ["quote", labels], true, "_source_valid", "_source_label",
        ["and", ["get", "_source_valid"], ["let", "_source_probability", ["get", "_source_decision", "probabilities", ["get", "_source_label"]],
          ["and", ["isNum", ["get", "_source_probability"]], ["gte", ["get", "_source_probability"], 0], ["lte", ["get", "_source_probability"], 1]]]],
      ];
      const valid: JsonValue = ["and", ["contains", ["quote", labels], get("choice")], ["isNum", get("confidence")], ["gte", get("confidence"), 0], ["lte", get("confidence"), 1], validProbabilities];
      // A source Decision has exactly one admitted value. Selecting index zero
      // from an empty list deliberately fails the pure evaluator on malformed
      // metadata. Expr output schemas alone are not a runtime assertion.
      const normalized: JsonValue = { value: get("choice"), confidence: get("confidence"), probabilities: Object.fromEntries(labels.map(label => [label, get("probabilities", label)])) };
      const program: JsonValue = ["let", "_source_decision", ["get", "raw", "answers", "answer"], ["nth", ["if", valid, ["list", normalized], ["list"]], 0]];
      this.add({
        id, kind: "expr",
        inputs: this.wire(id, new Map([["raw", { cell: raw, port: "out", type: { kind: "json" } }]])),
        expr: { contract: "algal.expr.v1", program },
        output: { kind: "json", schema: {
          type: "object", required: ["value", "confidence", "probabilities"],
          properties: { value: { type: "string" }, confidence: { type: "number" }, probabilities: { type: "object" } },
        } },
      }, expr, "decision-check", expressionAnnotation(title, expr, "decision-check"));
      return { cell: id, port: "out", type: { kind: "decision", labels } };
    }
    return this.expression(id, expr, "expression", title);
  }
  private composition(id: string, expr: Extract<Expr, { kind: "call" | "each" }>, title: string): Reference {
    const child = this.imports.get(expr.alias);
    if (!child) this.parser.fail(`unknown imported program ${expr.alias}`, expr);
    if (expr.args.kind !== "record") this.parser.fail("call arguments must be a record literal with named parameters", expr.args);
    const parameters = child.program.parameters;
    const args = new Map(expr.args.entries);
    if (expr.kind === "each") {
      if (!parameters.some(param => param.name === expr.over)) this.parser.fail(`each input ${expr.over} is not a parameter of ${expr.alias}`, expr);
      if (args.has(expr.over)) this.parser.fail(`each input ${expr.over} is already supplied by the item list`, expr.args);
      args.set(expr.over, expr.items);
    }
    if (args.size !== parameters.length || parameters.some(param => !args.has(param.name))) {
      this.parser.fail(`arguments must match exactly: ${parameters.map(param => param.name).join(", ") || "(none)"}`, expr.args);
    }
    for (const module of [...child.modules, child.manifest]) this.modules.set(digestCanonical(manifestToJson(module)), module);
    const refs = new Map<string, Reference>();
    for (const [index, param] of parameters.entries()) {
      const arg = args.get(param.name)!;
      const pure = this.pure(arg);
      const over = expr.kind === "each" && param.name === expr.over;
      if (over && pure.type.kind !== "list" && pure.type.kind !== "json") this.parser.fail("each input must be a list or a dynamic JSON value", arg);
      if (!over && param.type === "text" && !isText(pure.type) && pure.type.kind !== "json") this.parser.fail(`argument ${param.name} must be text`, arg);
      // A dynamic JSON argument destined for text needs an explicit runtime
      // assertion before graph admission can claim the text producer type.
      const type: Type = over ? { kind: "json" } : { kind: param.type };
      const program = !over && param.type === "text" && !isText(pure.type)
        ? ["sconcat", "", pure.program] : pure.program;
      const argId = `${id}-arg-${index + 1}`;
      this.add({ id: argId, kind: "expr", inputs: this.wire(argId, pure.refs), expr: { contract: "algal.expr.v1", program }, output: output(type) }, arg, "call-argument", expressionAnnotation(`${title} · ${param.name}`, arg, "call-argument"));
      refs.set(param.name.toLowerCase().replaceAll("_", "-"), { cell: argId, port: "out", type });
    }
    let manifestDigest = child.sourceMap.manifestDigest;
    let depth = child.analysis.requiredDepth + 1;
    if (expr.kind === "call" && parameters.length === 0 && this.controls.length) {
      // The wrapper's required trigger gates its entire invocation. Its inner
      // parameterless child sees no trigger input or additional model context.
      const wrapper = parseOrganismManifest({
        contract: "algal.organism.v1", key: "organism:source-call-trigger", name: "Guarded parameterless call",
        budgets: { ...SOURCE_PROFILE.budgets, maxAgentCalls: child.analysis.maxAgentCalls, maxDepth: Math.min(BOUNDS.maxDepth, depth) },
        interface: { inputs: { trigger: { cell: "input", port: "trigger" } }, outputs: { result: { cell: "call", port: "result" } } },
        cells: [{ id: "input", kind: "input", outputs: { trigger: { type: "json" } } }, { id: "call", kind: "organism", manifest: manifestDigest }], edges: [],
      });
      manifestDigest = digestCanonical(manifestToJson(wrapper)); this.modules.set(manifestDigest, wrapper); depth++;
      const triggerId = `${id}-trigger`;
      this.add({ id: triggerId, kind: "expr", inputs: {}, expr: { contract: "algal.expr.v1", program: true }, output: { kind: "json", schema: { type: "boolean" } } }, expr, "call-trigger", annotation(`${title} · trigger`, "call-trigger", "Activate the parameterless child only on the selected branch."));
      refs.set("trigger", { cell: triggerId, port: "out", type: { kind: "json" } });
    }
    this.calls += child.analysis.maxAgentCalls * (expr.kind === "each" ? expr.maxItems : 1);
    this.requiredDepth = Math.max(this.requiredDepth, depth);
    const compositionId = expr.kind === "each" ? `${id}-each` : id;
    this.wire(compositionId, refs);
    const cell: Cell = expr.kind === "call" ? { id, kind: "organism", manifest: manifestDigest }
      : { id: compositionId, kind: "each", manifest: manifestDigest, over: expr.over.toLowerCase().replaceAll("_", "-"), maxItems: expr.maxItems };
    const sourceAnnotation = expressionAnnotation(title, expr, expr.kind);
    sourceAnnotation.details.push(`Child ${child.program.name}: ${child.sourceMap.manifestDigest}`, `At most ${child.analysis.maxAgentCalls * (expr.kind === "each" ? expr.maxItems : 1)} executor attempts`);
    // Composition signatures are defined by child interfaces. Every supplied
    // argument was gated above, so no caller control port enters that interface.
    this.add(cell, expr, expr.kind, sourceAnnotation, false);
    if (expr.kind === "each") {
      // Core each outputs are many ports. Capture the entire list as one JSON
      // value before a source branch merge, whose many input must count arms,
      // not flatten the selected list into its individual items.
      this.edges.push({ from: { cell: compositionId, port: "result" }, to: { cell: id, port: "items" } });
      this.add({ id, kind: "expr", inputs: { items: { type: "json" } }, expr: { contract: "algal.expr.v1", program: ["get", "items"] }, output: { kind: "json", schema: { type: "array" } } }, expr, "each-results", annotation(title, "each-results", "Collect the ordered child results as one JSON list."));
      return { cell: id, port: "out", type: { kind: "list" } };
    }
    return { cell: id, port: "result", type: { kind: child.program.output } };
  }
  compile(program: SourceProgram): SourceCompilation {
    const inputs: PortMap = {}; const interfaceInputs: Record<string, { cell: string; port: string }> = {};
    this.parser.unique(program.parameters.map(p => p.name), "parameter", program);
    for (const param of program.parameters) {
      if (this.imports.has(param.name)) this.parser.fail(`parameter ${param.name} shadows an import`, param.span);
      const name = param.name.toLowerCase().replaceAll("_", "-");
      if (!/^[a-z][a-z0-9-]*$/.test(name) || Object.hasOwn(inputs, name)) {
        this.parser.fail("parameter names must produce distinct lowercase kebab-case interface names", param.span);
      }
      inputs[name] = { type: param.type };
      interfaceInputs[name] = { cell: "input", port: name };
      this.env.set(param.name, { cell: "input", port: name, type: { kind: param.type } });
    }
    if (program.parameters.length) this.add({ id: "input", kind: "input", outputs: inputs }, { start: program.start, end: program.parameters[program.parameters.length - 1]!.span.end }, "input", annotation("parameters", "input", `${program.name} inputs`, program.parameters.map(param => `${param.name}: ${param.type}`)));
    for (const [i, binding] of program.bindings.entries()) {
      if (this.env.has(binding.name) || this.imports.has(binding.name)) this.parser.fail(`duplicate binding ${binding.name}; values and imports are immutable`, binding.expr);
      const ref = this.lower(`b${i + 1}-${binding.name.toLowerCase().replaceAll("_", "-")}`, binding.expr, binding.name); this.env.set(binding.name, ref);
    }
    const result = this.lower("result", program.result, "return");
    if (program.output === "text" && !isText(result.type)) this.parser.fail(`program declares text but returns ${result.type.kind}`, program.result);
    if (program.output === "json" && isText(result.type)) this.parser.fail("program declares json but returns text", program.result);
    if (this.calls > program.budgets.maxAgentCalls) this.parser.fail(`${this.calls} explicit effects exceed max_agent_calls ${program.budgets.maxAgentCalls}; the budget counts executor attempts, including retries`, program);
    if (this.requiredDepth > program.budgets.maxDepth) this.parser.fail(`composition requires depth ${this.requiredDepth}, exceeding max_depth ${program.budgets.maxDepth}`, program);
    let manifest: OrganismManifest;
    try { manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: `organism:${program.name.replaceAll("_", "-")}`, name: program.name, budgets: program.budgets, interface: { inputs: interfaceInputs, outputs: { result: { cell: result.cell, port: result.port } } }, cells: this.cells, edges: this.edges }); }
    catch (error) { if (error instanceof AlgalError) this.parser.fail(`lowered manifest: ${error.message}`, program); throw error; }
    return { manifest, sourceMap: { contract: "algal.source-map.v1", sourceDigest: digestText(this.parser.source), manifestDigest: digestCanonical(manifestToJson(manifest)), compilerVersion: SOURCE_PROFILE.compilerVersion, profile: SOURCE_PROFILE.id, cells: this.mappings }, modules: [...this.modules.values()], analysis: { maxAgentCalls: this.calls, requiredDepth: this.requiredDepth } };
  }
}

/** Compile source without executing models, tools, host code, or network IO.
 * Graph admission and normal runtime input checks still apply to the result.
 * JSON inputs retain dynamic types; strict expr operators check them at run time.
 */
export function sourceImports(source: string): SourceImport[] { return new Parser(source).imports(); }

const originSpan: SourceSpan = { start: { offset: 0, line: 1, column: 1 }, end: { offset: 0, line: 1, column: 1 } };
function invalidPathCharacters(value: string): boolean {
  return value.includes("\\") || value.includes(":") || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}
function projectKey(key: string, span = originSpan): string {
  if (typeof key !== "string" || !key.endsWith(".algal") || key.length > 512 || invalidPathCharacters(key) || key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new SourceError("source keys must be normalized project-relative .algal paths", span);
  }
  return key;
}
/** Resolve only logical source keys. This function never reads the filesystem. */
export function resolveSourceImport(importerKey: string, path: string, span: SourceSpan): string {
  projectKey(importerKey, span);
  if (typeof path !== "string" || !(path.startsWith("./") || path.startsWith("../")) || !path.endsWith(".algal") || path.length > 512 || invalidPathCharacters(path)) {
    throw new SourceError("imports require a relative ./ or ../ .algal path; absolute paths and URLs are not supported", span);
  }
  const parts = importerKey.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (part === ".") continue;
    if (part === "..") {
      if (!parts.length) throw new SourceError("import escapes the source project root", span);
      parts.pop();
    } else {
      if (!part) throw new SourceError("import paths cannot contain empty segments", span);
      parts.push(part);
    }
  }
  return projectKey(parts.join("/"), span);
}

export function compileSource(source: string, options: SourceCompilerOptions = {}): SourceCompilation {
  const entry = projectKey(options.entry ?? "main.algal");
  const sources = new Map<string, string>();
  let totalBytes = 0;
  const insert = (key: string, text: string): void => {
    projectKey(key);
    if (typeof text !== "string") throw new SourceError(`source module ${key} must contain source text`, originSpan);
    if (sources.has(key)) {
      if (sources.get(key) !== text) throw new SourceError(`entry source differs from modules[${JSON.stringify(key)}]`, originSpan);
      return;
    }
    const bytes = Buffer.byteLength(text);
    if (bytes > SOURCE_BOUNDS.maxSourceBytes) throw new SourceError(`${key}: source exceeds ${SOURCE_BOUNDS.maxSourceBytes} UTF-8 bytes`, originSpan);
    if (sources.size >= SOURCE_PROJECT_BOUNDS.maxFiles) throw new SourceError(`source project exceeds ${SOURCE_PROJECT_BOUNDS.maxFiles} files`, originSpan);
    totalBytes += bytes;
    if (totalBytes > SOURCE_PROJECT_BOUNDS.maxTotalBytes) throw new SourceError(`source project exceeds ${SOURCE_PROJECT_BOUNDS.maxTotalBytes} UTF-8 bytes`, originSpan);
    sources.set(key, text);
  };
  insert(entry, source);
  for (const [key, text] of Object.entries(options.modules ?? {})) insert(key, text);
  const memo = new Map<string, CompiledModule>();
  const active = new Set<string>();
  const visit = (key: string, depth: number, location = originSpan): CompiledModule => {
    if (active.has(key)) throw new SourceError(`source import cycle at ${key}`, location);
    if (depth > SOURCE_PROJECT_BOUNDS.maxImportDepth) throw new SourceError(`source import depth exceeds ${SOURCE_PROJECT_BOUNDS.maxImportDepth}`, location);
    const cached = memo.get(key);
    if (cached) {
      if (depth + cached.importDepth > SOURCE_PROJECT_BOUNDS.maxImportDepth) throw new SourceError(`source import depth exceeds ${SOURCE_PROJECT_BOUNDS.maxImportDepth}`, location);
      return cached;
    }
    const text = sources.get(key);
    if (text === undefined) throw new SourceError(`source module not supplied: ${key}`, location);
    active.add(key);
    try {
      const parser = new Parser(text);
      const declarations = parser.imports();
      const program = parser.program();
      const imports = new Map<string, CompiledModule>();
      for (const declaration of declarations) imports.set(declaration.alias, visit(resolveSourceImport(key, declaration.path, declaration.span), depth + 1, declaration.span));
      const importDepth = imports.size ? 1 + Math.max(...[...imports.values()].map(child => child.importDepth)) : 0;
      const result = { ...new Compiler(parser, imports).compile(program), program, importDepth };
      memo.set(key, result);
      return result;
    } catch (error) {
      if (error instanceof SourceError && key !== entry) throw new SourceError(`${key}: ${error.diagnostic.message}`, error.diagnostic.span);
      throw error;
    } finally { active.delete(key); }
  };
  const { program: _program, importDepth: _importDepth, ...result } = visit(entry, 0);
  return result;
}
