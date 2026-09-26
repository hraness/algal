// Independent bounded parser for readable `.algal` source. Written from the
// documented grammar against `verify/source/model.ts` — it shares no code
// with `src/source.ts`, so a production parse/lex divergence shows up as an
// accept/reject or semantics divergence in the differential corpus.
import { utf8Length } from "../../src/utf8";
import { canonicalBytes } from "../../src/values";
import {
  DEFAULT_BUDGETS, SOURCE_LIMITS, fail,
  type Budgets, type Expr, type FieldType, type Module, type Parameter,
  type Program, type Record_, type SourceField, type SourceList, type SourceType,
} from "./model";
import { recordSchema, schemaLevels, schemaOf, schemaVersion } from "./types";

const B = SOURCE_LIMITS;
const RESERVED = new Set(["program", "budget", "let", "return", "decide", "generate", "using", "as", "choice", "match", "if", "else", "true", "false", "null", "text", "json", "import", "from", "call", "each", "over", "in", "max_items", "__proto__", "prototype", "constructor"]);
const OPERATORS: Record<string, { precedence: number; op: string }> = {
  "||": { precedence: 1, op: "or" }, "&&": { precedence: 2, op: "and" },
  "==": { precedence: 3, op: "eq" }, "!=": { precedence: 3, op: "neq" },
  "<": { precedence: 4, op: "lt" }, "<=": { precedence: 4, op: "lte" }, ">": { precedence: 4, op: "gt" }, ">=": { precedence: 4, op: "gte" },
  "+": { precedence: 5, op: "add" }, "-": { precedence: 5, op: "sub" },
  "*": { precedence: 6, op: "mul" }, "/": { precedence: 6, op: "div" }, "%": { precedence: 6, op: "mod" },
};
export const TEXT_FORMATS = new Set(["digest", "name", "slug", "uri"]);

type Token = { kind: "id" | "string" | "number" | "symbol" | "eof"; text: string; start: number; end: number };

export class Parser {
  readonly tokens: Token[] = [];
  private index = 0;
  private nodes = 0;
  readonly records = new Map<string, Record_>();
  constructor(readonly source: string, readonly sourceKey?: string) {
    if (utf8Length(source) > B.maxSourceBytes) this.fail(`source exceeds ${B.maxSourceBytes} UTF-8 bytes`, 0, 0);
    let i = 0;
    while (i < source.length) {
      const rest = source.slice(i);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) { i += whitespace[0].length; continue; }
      if (rest.startsWith("//")) { const end = source.indexOf("\n", i); i = end < 0 ? source.length : end + 1; continue; }
      if (rest.startsWith("/*")) { const end = source.indexOf("*/", i + 2); if (end < 0) this.fail("unterminated comment", i, source.length); i = end + 2; continue; }
      const start = i;
      let kind: Token["kind"] = "symbol";
      let text: string;
      if (rest[0] === '"') {
        const match = /^"(?:[^"\\\r\n]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/.exec(rest);
        if (!match) this.fail("invalid or unterminated JSON string", start, start + 1);
        text = match[0]; kind = "string";
        try { JSON.parse(text); } catch { this.fail("invalid JSON string escape or control character", start, start + text.length); }
      } else {
        const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
        const number = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(rest);
        if (id) { text = id[0]; kind = "id"; }
        else if (number) { text = number[0]; kind = "number"; }
        else {
          const symbol = /^(?:->|=>|==|!=|<=|>=|&&|\|\||[(){}[\],:;.=+\-*/%!<>?])/.exec(rest);
          if (!symbol) this.fail(`unsupported character ${JSON.stringify(rest[0])}`, start, start + 1);
          text = symbol[0];
        }
      }
      i += text.length;
      this.tokens.push({ kind, text, start, end: i });
      if (this.tokens.length > B.maxTokens) this.fail("source token limit exceeded", start, i);
    }
    this.tokens.push({ kind: "eof", text: "<end>", start: i, end: i });
  }
  fail(message: string, start: number, _end: number): never {
    const prefix = this.source.slice(0, start);
    const line = prefix.split("\n").length;
    const column = start - prefix.lastIndexOf("\n");
    fail("parse", "PARSE_FAILED", `${line}:${column}: ${message}`, this.sourceKey);
  }
  private peek(): Token { return this.tokens[Math.min(this.index, this.tokens.length - 1)]!; }
  private take(): Token { const token = this.peek(); if (this.index < this.tokens.length - 1) this.index++; return token; }
  private eat(text: string): boolean { if (this.peek().text !== text) return false; this.take(); return true; }
  private expect(text: string): Token {
    const token = this.peek();
    if (token.text !== text) this.fail(`expected ${JSON.stringify(text)}, found ${JSON.stringify(token.text)}`, token.start, token.end);
    return this.take();
  }
  private name(): Token {
    const token = this.take();
    if (token.kind !== "id" || RESERVED.has(token.text)) this.fail(`expected a non-reserved identifier, found ${JSON.stringify(token.text)}`, token.start, token.end);
    if (token.text.length > B.maxNameLength) this.fail(`identifier exceeds ${B.maxNameLength} characters`, token.start, token.end);
    return token;
  }
  private string(): string {
    const token = this.take();
    if (token.kind !== "string") this.fail("expected a quoted string", token.start, token.end);
    return JSON.parse(token.text) as string;
  }
  private unique(names: string[], what: string, token: Token): void {
    if (new Set(names).size !== names.length) this.fail(`duplicate ${what}`, token.start, token.end);
  }
  private list<T>(close: string, item: () => T, max: number, what = "collection"): T[] {
    const items: T[] = [];
    while (!this.eat(close)) {
      if (items.length >= max) this.fail(`${what} exceeds ${max} entries`, this.peek().start, this.peek().end);
      items.push(item());
      if (this.eat(close)) break;
      this.expect(",");
    }
    return items;
  }

  // ------------------------------------------------------------ imports ---
  imports(): { alias: string; path: string }[] {
    const imports: { alias: string; path: string }[] = [];
    while (this.peek().text === "import") {
      this.take();
      if (imports.length >= B.maxImports) this.fail("import limit exceeded", this.peek().start, this.peek().end);
      const alias = this.name().text; this.expect("from"); const path = this.string(); this.eat(";");
      if (imports.some(item => item.alias === alias)) this.fail(`duplicate import alias ${alias}`, this.peek().start, this.peek().end);
      imports.push({ alias, path });
    }
    return imports;
  }

  // ------------------------------------------------------------- types ----
  private type(): SourceType {
    if (this.peek().text === "[") {
      const start = this.peek().start;
      const type = this.fieldType(0) as Extract<FieldType, { kind: "list" }>;
      const schema = schemaOf(type);
      this.checkSchemaSize(schema, start, `list type`);
      // A `[T] unique` interface type keeps the schema's `uniqueItems` keyword
      // only when it survives `type()` — the declared shape drops `unique`.
      const list: SourceList = { kind: "list", item: type.item };
      list.schema = schema; const version = schemaVersion(schema); if (version !== undefined) list.schemaVersion = version;
      return list;
    }
    const token = this.take();
    if (token.text === "text" || token.text === "json") return token.text;
    if (token.kind === "id" && /^[A-Z]/.test(token.text)) return this.recordType(token);
    this.fail("source interfaces support only text, json, declared record types, and list types; authority-bearing types are not supported", token.start, token.end);
  }
  private recordType(token: Token): Record_ {
    const record = this.records.get(token.text);
    if (!record) this.fail(`unknown record type ${token.text}; declare a record before using it`, token.start, token.end);
    return record;
  }
  private checkSchemaSize(schema: unknown, start: number, what: string): void {
    if (schemaLevels(schema as never) > B.maxSchemaLevels) this.fail(`${what} exceeds the schema limit of ${B.maxSchemaLevels} levels`, start, this.peek().end);
    if (canonicalBytes(schema as never) > B.maxRecordSchemaBytes) this.fail(`${what} compiles to a schema over ${B.maxRecordSchemaBytes} bytes`, start, this.peek().end);
  }
  private fieldType(depth: number): FieldType {
    const token = this.take();
    if (token.text === "[") {
      if (depth >= B.maxDepth) this.fail("type nesting limit exceeded", token.start, token.end);
      const item = this.fieldType(depth + 1);
      this.expect("]");
      return this.eat("unique") ? { kind: "list", item, unique: true } : { kind: "list", item };
    }
    if (token.text === "text") {
      if (this.eat("in")) return { kind: "text", values: this.allowedText() };
      const range: { minimum?: number; maximum?: number } = {};
      if (this.peek().text === "min") { this.take(); range.minimum = this.lengthBound(); }
      if (this.peek().text === "max") {
        this.take(); range.maximum = this.lengthBound();
        if (range.minimum !== undefined && range.minimum > range.maximum) this.fail(`text length min ${range.minimum} exceeds max ${range.maximum}`, token.start, this.tokens[this.index - 1]!.end);
      }
      return { kind: "text", ...range };
    }
    if (TEXT_FORMATS.has(token.text)) return { kind: "text", format: token.text };
    if (token.text === "number") {
      if (this.eat("in")) return { kind: "number", values: this.allowedNumbers() };
      return { kind: "number", ...this.bounds("number") };
    }
    if (token.text === "integer") {
      if (this.eat("in")) return { kind: "integer", values: this.allowedIntegers() };
      return { kind: "integer", ...this.bounds("integer") };
    }
    if (token.text === "boolean" || token.text === "json") return { kind: token.text as "boolean" | "json" };
    if (token.kind === "id" && /^[A-Z]/.test(token.text)) return this.recordType(token);
    this.fail("record fields and list items use text, number, integer, boolean, json, a text format such as slug or uri, a record declared earlier, or a list such as [Task]", token.start, token.end);
  }
  private bounds(kind: "number" | "integer"): { minimum?: number; maximum?: number } {
    const range: { minimum?: number; maximum?: number } = {};
    if (this.peek().text === "min") { this.take(); range.minimum = this.signedNumber(); }
    if (this.peek().text === "max") {
      this.take(); range.maximum = this.signedNumber();
      if (range.minimum !== undefined && range.minimum > range.maximum) this.fail(`${kind} range min ${range.minimum} exceeds max ${range.maximum}`, this.peek().start, this.peek().end);
    }
    return range;
  }
  private lengthBound(): number {
    const start = this.peek().start;
    const value = this.signedNumber();
    if (!Number.isSafeInteger(value) || value < 0 || value > B.maxTextLength) this.fail(`text length bounds are integers in 0..${B.maxTextLength}`, start, this.tokens[this.index - 1]!.end);
    return value;
  }
  private allowedIntegers(): number[] {
    return this.allowed(() => {
      const start = this.peek().start;
      const value = this.signedNumber();
      if (!Number.isSafeInteger(value)) this.fail(`integer allowed values must be whole numbers, found ${JSON.stringify(value)}`, start, this.tokens[this.index - 1]!.end);
      return value;
    }).sort((a, b) => a - b);
  }
  private allowed<T extends string | number>(item: () => T): T[] {
    const open = this.expect("[");
    const values: T[] = [];
    while (!this.eat("]")) {
      if (values.length >= B.maxAllowedValues) this.fail(`a type lists at most ${B.maxAllowedValues} allowed values`, this.peek().start, this.peek().end);
      const start = this.peek().start;
      const value = item();
      if (values.includes(value)) this.fail(`duplicate allowed value ${JSON.stringify(value)}`, start, this.tokens[this.index - 1]!.end);
      values.push(value);
      if (this.eat("]")) break;
      this.expect(",");
    }
    if (!values.length) this.fail("an allowed-value list needs at least one value", open.start, this.tokens[this.index - 1]!.end);
    return values;
  }
  private allowedText(): string[] {
    return this.allowed(() => {
      const token = this.peek();
      const value = this.string();
      if (value.length > B.maxAllowedValueLength) this.fail(`allowed values have at most ${B.maxAllowedValueLength} characters`, token.start, token.end);
      return value;
    }).sort();
  }
  private allowedNumbers(): number[] { return this.allowed(() => this.signedNumber()).sort((a, b) => a - b); }
  private signedNumber(): number {
    const negative = this.eat("-");
    const token = this.take();
    const value = Number(token.text);
    if (token.kind !== "number" || !Number.isFinite(value)) this.fail(`expected a finite number, found ${JSON.stringify(token.text)}`, token.start, token.end);
    return negative ? -value || 0 : value;
  }
  /** `record Name { f: T, g: U? }` or `closed record Name { ... }`. */
  private record(): void {
    const closed = this.eat("closed");
    const start = this.expect("record").start;
    if (this.records.size >= B.maxRecords) this.fail(`record limit exceeded; a file declares at most ${B.maxRecords} records`, start, this.peek().end);
    const name = this.name();
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name.text)) this.fail("record names start with an uppercase letter and use only ASCII letters and digits", name.start, name.end);
    if (this.records.has(name.text)) this.fail(`duplicate record ${name.text}`, name.start, name.end);
    this.expect("{");
    const fields: SourceField[] = [];
    while (!this.eat("}")) {
      if (fields.length >= B.maxRecordFields) this.fail(`record ${name.text} exceeds ${B.maxRecordFields} fields`, this.peek().start, this.peek().end);
      const field = this.name();
      if (fields.some(existing => existing.name === field.text)) this.fail(`duplicate field ${field.text} in record ${name.text}`, field.start, field.end);
      this.expect(":");
      const type = this.fieldType(0);
      const optional = this.eat("?");
      fields.push({ name: field.text, type, optional });
      if (this.eat("}")) break;
      this.expect(",");
    }
    if (!fields.length) this.fail(`record ${name.text} needs at least one field`, start, this.tokens[this.index - 1]!.end);
    const record: Record_ = { kind: "record", name: name.text, closed, fields };
    const schema = recordSchema(fields, closed);
    this.checkSchemaSize(schema, start, `record ${name.text}`);
    record.schema = schema; const version = schemaVersion(schema); if (version !== undefined) record.schemaVersion = version;
    this.records.set(name.text, record);
  }

  // ------------------------------------------------------------ program ---
  program(): Program {
    while (this.peek().text === "record" || this.peek().text === "closed") this.record();
    this.expect("program");
    const name = this.name();
    if (!/^[a-z][a-z0-9_]*$/.test(name.text)) this.fail("program names use lowercase letters, digits, and underscores", name.start, name.end);
    this.expect("(");
    const parameters = this.list(")", (): Parameter => { const token = this.name(); this.expect(":"); return { name: token.text, type: this.type() }; }, B.maxParameters, "parameter list");
    this.expect("->"); const output = this.type(); this.expect("{");
    this.expect("budget"); this.expect("{");
    const budgets: Budgets = { ...DEFAULT_BUDGETS };
    const mapping = { max_agent_calls: "maxAgentCalls", max_steps: "maxSteps", max_work: "maxWork", max_context_bytes: "maxContextBytes", max_output_bytes: "maxOutputBytes", max_depth: "maxDepth" } as const;
    const keys = new Set<string>();
    this.list("}", () => {
      const key = this.name();
      if (!(key.text in mapping)) this.fail(`unknown budget ${key.text}`, key.start, key.end);
      if (keys.has(key.text)) this.fail(`duplicate budget ${key.text}`, key.start, key.end);
      keys.add(key.text); this.expect(":"); const number = this.take();
      const value = Number(number.text); const mapped = mapping[key.text as keyof typeof mapping];
      const minimum = mapped === "maxAgentCalls" || mapped === "maxDepth" ? 0 : 1;
      const limit = mapped === "maxSteps" ? B.maxSteps : mapped === "maxAgentCalls" ? B.maxAgentCalls : mapped === "maxWork" ? B.maxWork
        : mapped === "maxContextBytes" ? B.maxContextBytes : mapped === "maxOutputBytes" ? B.maxOutputBytes : B.maxDepth;
      if (number.kind !== "number" || !Number.isSafeInteger(value) || value < minimum || value > limit) this.fail(`budget ${key.text} must be an integer in ${minimum}..${limit}`, number.start, number.end);
      budgets[mapped] = value;
    }, 6, "budget list");
    if (!keys.has("max_agent_calls")) this.fail("budget must explicitly declare max_agent_calls", this.peek().start, this.peek().end);
    const bindings: Program["bindings"] = [];
    while (this.eat("let")) {
      if (bindings.length >= B.maxBindings) this.fail("binding limit exceeded", this.peek().start, this.peek().end);
      const name = this.name().text; this.expect("="); const expr = this.expression(); this.eat(";"); bindings.push({ name, expr });
    }
    this.expect("return"); const result = this.expression(); this.eat(";"); this.expect("}"); this.expect("<end>");
    return { name: name.text, parameters, output, budgets, bindings, result };
  }

  // --------------------------------------------------------- expressions --
  private expression(min = 0, depth = 0): Expr {
    if (depth > B.maxDepth) this.fail("expression nesting limit exceeded", this.peek().start, this.peek().end);
    let value = this.primary(depth);
    while (true) {
      if (this.eat(".")) {
        const field = this.name();
        if (field.text === "probability" && this.eat("(")) {
          const label = this.expression(0, depth + 1); this.expect(")");
          value = this.node({ kind: "probability", value, label });
        } else value = this.node({ kind: "field", value, field: field.text });
        continue;
      }
      const op = Object.hasOwn(OPERATORS, this.peek().text) ? OPERATORS[this.peek().text] : undefined;
      if (!op || op.precedence < min) break;
      this.take(); const right = this.expression(op.precedence + 1, depth + 1);
      value = this.node({ kind: "binary", op: op.op, left: value, right });
    }
    return value;
  }
  private node(value: Expr): Expr { if (++this.nodes > B.maxNodes) this.fail("expression node limit exceeded", this.peek().start, this.peek().end); return value; }
  private primary(depth: number): Expr {
    const token = this.take();
    if (token.kind === "string") return this.node({ kind: "literal", value: JSON.parse(token.text) });
    if (token.kind === "number") { const value = Number(token.text); if (!Number.isFinite(value)) this.fail("numbers must be finite", token.start, token.end); return this.node({ kind: "literal", value }); }
    if (token.text === "true" || token.text === "false" || token.text === "null") return this.node({ kind: "literal", value: JSON.parse(token.text) });
    if (token.text === "(") { const value = this.expression(0, depth + 1); this.expect(")"); return value; }
    if (token.text === "!" || token.text === "-") return this.node({ kind: "unary", op: token.text === "!" ? "not" : "neg", value: this.expression(7, depth + 1) });
    if (token.text === "[") return this.node({ kind: "list", items: this.list("]", () => this.expression(0, depth + 1), B.maxCollectionItems) });
    if (token.text === "{") {
      const entries = this.list("}", (): [string, Expr] => { const key = this.peek().kind === "string" ? this.string() : this.name().text; this.expect(":"); return [key, this.expression(0, depth + 1)]; }, B.maxCollectionItems);
      this.unique(entries.map(([key]) => key), "record key", token);
      return this.node({ kind: "record", entries });
    }
    if (token.text === "if") {
      const condition = this.expression(0, depth + 1); this.expect("{"); const yes = this.expression(0, depth + 1); this.expect("}"); this.expect("else"); this.expect("{"); const no = this.expression(0, depth + 1); this.expect("}");
      return this.node({ kind: "if", condition, yes, no });
    }
    if (token.text === "match") {
      const value = this.expression(0, depth + 1); this.expect("{");
      const arms = this.list("}", (): [string, Expr] => { const label = this.name().text; this.expect("=>"); return [label, this.expression(0, depth + 1)]; }, B.maxChoiceLabels);
      this.unique(arms.map(([label]) => label), "match label", token);
      return this.node({ kind: "match", value, arms });
    }
    if (token.text === "decide") {
      const question = this.string(); this.expect("using"); const context = this.expression(0, depth + 1); this.expect("as"); this.expect("choice"); this.expect("{");
      const criteria = this.list("}", (): [string, string] => { const label = this.name().text; this.expect(":"); return [label, this.string()]; }, B.maxChoiceLabels);
      if (criteria.length === 0) this.fail("a choice needs at least one label", token.start, token.end);
      this.unique(criteria.map(([label]) => label), "choice label", token);
      return this.node({ kind: "decide", question, context, criteria });
    }
    if (token.text === "generate") { const instruction = this.expression(0, depth + 1); this.expect("using"); const context = this.expression(0, depth + 1); return this.node({ kind: "generate", instruction, context }); }
    if (token.text === "call") {
      const alias = this.name().text; this.expect("using"); const args = this.expression(0, depth + 1);
      return this.node({ kind: "call", alias, args });
    }
    if (token.text === "each") {
      const alias = this.name().text; this.expect("over"); const over = this.name().text; this.expect("in");
      const items = this.expression(0, depth + 1); this.expect("using"); const args = this.expression(0, depth + 1);
      this.expect("max_items"); const bound = this.take(); const maxItems = Number(bound.text);
      if (bound.kind !== "number" || !Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > B.maxEachItems) this.fail(`max_items must be an integer in 1..${B.maxEachItems}`, bound.start, bound.end);
      return this.node({ kind: "each", alias, over, items, args, maxItems });
    }
    if (token.kind === "id" && !RESERVED.has(token.text)) { if (token.text.length > B.maxNameLength) this.fail(`identifier exceeds ${B.maxNameLength} characters`, token.start, token.end); return this.node({ kind: "name", name: token.text }); }
    return this.fail(`unsupported expression ${JSON.stringify(token.text)}`, token.start, token.end);
  }
}

/** Parse a complete source unit: leading `import` declarations, record
 *  declarations, then one `program`. Returns the module AST. */
export function parseModule(source: string, sourceKey?: string): Module {
  const parser = new Parser(source, sourceKey);
  const imports = parser.imports();
  const program = parser.program();
  return { imports, records: [...parser.records.values()], program };
}
