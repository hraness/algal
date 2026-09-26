// Independent static checker for the source language. Mirrors the type,
// coverage, position, and analysis rules of the production lowering, and
// emits a cell/edge *outline* — the generated-cell skeleton the differential
// compares against the manifest. The outline uses the compiler's documented
// naming discipline purely so generated identities are comparable; no
// production code emits it.
import { canonicalize } from "../../src/values";
import type { JsonObject, JsonValue } from "../../src/values";
import {
  SOURCE_LIMITS, fail, isTextType, kebab,
  type Budgets, type CheckedModule, type Expr, type PortType,
  type Program, type SType, type SiteInfo, type SourceShape,
} from "./model";
import {
  assignField, assignShape, compatible, outputOf,
  parameterPort, parameterType, portOf, requireType,
  shapeOutput, sourceValue,
} from "./types";

const B = SOURCE_LIMITS;
const GENERATE_PROMPT_TEXT = "Algal source generation envelope v1. Follow the instruction in inputs.instruction. Use only inputs.context as task context. Return the requested text.";

/** `x.field` lowers onto an existing `get` chain when possible; otherwise the
 *  value is bound once and the key read off it — the production lowering's
 *  shape, kept so emitted programs compare exactly. */
function fieldOf(program: JsonValue, key: JsonValue): JsonValue {
  return Array.isArray(program) && program[0] === "get" ? [...program, key] : ["let", "_source_value", program, ["get", "_source_value", key]];
}

export type Ref = { cell: string; port: string; type: SType };
type Control = { selector: Ref; label: string };

/** One generated cell, projected to the fields the source semantics predicts:
 *  identity, kind, ordered input names with port types, the declared output
 *  contract, and the model-visible view. */
export type OutlineCell = {
  id: string;
  kind: "input" | "expr" | "agent" | "decide" | "organism" | "each";
  inputs?: { name: string; port: PortType }[];
  outputs?: { name: string; port: PortType }[];          // input cells
  output?: JsonObject;                                    // declared output contract
  program?: JsonValue;                                    // the emitted algal.expr.v1 program
  viewInputs?: string[];                                  // model-visible inputs
  prompt?: string; questions?: JsonObject;                // effect payloads
  over?: string; maxItems?: number;                       // each
  guarded?: true;                                         // a source-control input was added
  manifest?: string;                                      // organism: child program identity
};
export type OutlineEdge = { from: string; to: string; guard?: string };
/** A manifest skeleton: everything but the contract stamp, `sourceMap`, and
 *  the nested `manifest` digests (recorded as the child's source key — the
 *  differential resolves them through `project.calls`). */
export type Outline = {
  key: string; name: string; budgets: Budgets;
  interface: { inputs: Record<string, { cell: string; port: string }>; outputs: Record<string, { cell: string; port: string }> };
  cells: OutlineCell[]; edges: OutlineEdge[];
};

/** Call sites in lowering order — the `project.calls` analogue. */
export type CallSite = { cellId: string; child: CheckedModule; wrapped: boolean };

export type CheckOutcome = {
  analysis: { maxAgentCalls: number; requiredDepth: number };
  outline: Outline;
  calls: CallSite[];
  /** Position ids for tail expressions, keyed by node identity — the sites
   *  at which the interpreter records generated-side observations. */
  sites: Map<Expr, SiteInfo>;
  /** The output port contract the `result` cell's `out` declares. */
  resultPort: PortType;
};

export function hasEffect(expr: Expr): boolean {
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

export class Checker {
  private readonly env = new Map<string, Ref>();
  private readonly cells: OutlineCell[] = [];
  private readonly edges: OutlineEdge[] = [];
  private calls = 0;
  private requiredDepth = 0;
  private branches = 0;
  private readonly controls: Control[] = [];
  private readonly callSites: CallSite[] = [];
  readonly sites = new Map<Expr, SiteInfo>();
  private markSite(expr: Expr, info: SiteInfo): void { this.sites.set(expr, { ...this.sites.get(expr), ...info }); }
  constructor(
    private readonly imports: ReadonlyMap<string, CheckedModule>,
    private readonly sourceKey: string,
  ) {}
  private fail(message: string): never { return fail("check", "PARSE_FAILED", message, this.sourceKey); }

  private add(cell: OutlineCell, guarded = true): void {
    if (this.cells.length >= B.maxCells) this.fail("lowered cell limit exceeded");
    const control = this.controls.at(-1);
    if (control && guarded) {
      const name = "source-control-1";
      if (cell.kind !== "expr" && cell.kind !== "agent" && cell.kind !== "decide") this.fail("unsupported guarded source cell");
      (cell.inputs ??= []).push({ name, port: portOf(control.selector.type) });
      cell.guarded = true;
      this.edges.push({ from: `${control.selector.cell}.${control.selector.port}`, to: `${cell.id}.${name}`, guard: control.label });
    }
    cell.inputs ??= [];
    this.cells.push(cell);
  }
  private wire(id: string, refs: Map<string, Ref>): { name: string; port: PortType }[] {
    const inputs: { name: string; port: PortType }[] = [];
    for (const [name, ref] of refs) {
      inputs.push({ name, port: portOf(ref.type) });
      this.edges.push({ from: `${ref.cell}.${ref.port}`, to: `${id}.${name}` });
    }
    return inputs;
  }

  /** Static expression check (the `pure` position): computes the emitted
   *  `algal.expr.v1` program, the static type, and the free-name wiring a
   *  generated cell would receive. Effects are rejected here — they may only
   *  occupy tail positions. */
  private pure(expr: Expr): { program: JsonValue; type: SType; refs: Map<string, Ref> } {
    const refs = new Map<string, Ref>();
    const visit = (expr: Expr): { program: JsonValue; type: SType } => {
      switch (expr.kind) {
        case "literal":
          return { program: expr.value, type: typeof expr.value === "string" ? { kind: "text", literal: expr.value }
            : typeof expr.value === "number" ? { kind: "number", literal: expr.value }
            : { kind: expr.value === null ? "null" : "boolean" } };
        case "name": {
          const ref = this.env.get(expr.name);
          if (!ref) this.fail(`unknown name ${expr.name}`);
          let name = [...refs].find(([, existing]) => existing === ref)?.[0];
          if (name === undefined) { name = `value-${refs.size + 1}`; refs.set(name, ref); }
          return { program: ["get", name], type: ref.type };
        }
        case "record": {
          const items = expr.entries.map(([name, value]) => [name, visit(value)] as const);
          return { program: Object.fromEntries(items.map(([name, value]) => [name, value.program])), type: { kind: "record", fields: new Map(items.map(([name, value]) => [name, value.type])) } };
        }
        case "list": {
          const items = expr.items.map(visit);
          return { program: ["list", ...items.map(item => item.program)], type: { kind: "list", items: items.map(item => item.type) } };
        }
        case "field": {
          const value = visit(expr.value); let type: SType = { kind: "json" };
          if (value.type.kind === "decision") {
            if (expr.field === "value") type = { kind: "choice", labels: value.type.labels };
            else if (expr.field === "confidence") type = { kind: "number" };
            else if (expr.field === "probabilities") type = { kind: "record", fields: new Map(value.type.labels.map(label => [label, { kind: "number" } as SType])) };
            else this.fail(`unknown decision field ${expr.field}`);
          } else if (value.type.kind === "record") {
            const known = value.type.fields.get(expr.field);
            if (!known) this.fail(`unknown record field ${expr.field}`);
            type = known;
          } else if (value.type.kind !== "json") this.fail(`cannot select a field from ${value.type.kind}`);
          return { program: fieldOf(value.program, expr.field), type };
        }
        case "probability": {
          const value = visit(expr.value); const label = visit(expr.label);
          if (value.type.kind !== "decision") this.fail("probability requires a decision value");
          const labels = label.type.kind === "choice" ? label.type.labels : label.type.kind === "text" && label.type.literal !== undefined ? [label.type.literal] : [];
          const allowed = value.type.labels;
          if (!labels.length || labels.some(item => !allowed.includes(item))) this.fail("probability requires one of this decision's declared labels");
          return { program: fieldOf(fieldOf(value.program, "probabilities"), label.program), type: { kind: "number" } };
        }
        case "unary": {
          const value = visit(expr.value); const kind = expr.op === "not" ? "boolean" : "number";
          requireType(value.type, kind, m => this.fail(m));
          const literal = kind === "number" && value.type.kind === "number" ? value.type.literal : undefined;
          return { program: [expr.op, value.program], type: literal === undefined ? { kind } : { kind: "number", literal: -literal || 0 } };
        }
        case "binary": {
          const left = visit(expr.left); const right = visit(expr.right); let op = expr.op; let kind: "number" | "boolean" | "text" = "boolean";
          if (["add", "sub", "mul", "div", "mod"].includes(op)) {
            if (op === "add" && isTextType(left.type) && isTextType(right.type)) { op = "sconcat"; kind = "text"; }
            else { requireType(left.type, "number", m => this.fail(m)); requireType(right.type, "number", m => this.fail(m)); kind = "number"; }
          } else if (op === "and" || op === "or") { requireType(left.type, "boolean", m => this.fail(m)); requireType(right.type, "boolean", m => this.fail(m)); }
          else if (!["eq", "neq"].includes(op)) { const ordered = isTextType(left.type) || isTextType(right.type) ? "text" : "number"; requireType(left.type, ordered, m => this.fail(m)); requireType(right.type, ordered, m => this.fail(m)); }
          if (op !== expr.op) this.markSite(expr, { op });
          return { program: [op, left.program, right.program], type: { kind } };
        }
        case "if": {
          const condition = visit(expr.condition); requireType(condition.type, "boolean", m => this.fail(m));
          const yes = visit(expr.yes); const no = visit(expr.no);
          return { program: ["if", condition.program, yes.program, no.program], type: compatible(yes.type, no.type, m => this.fail(m)) };
        }
        case "match": {
          const value = visit(expr.value);
          if (value.type.kind !== "choice") this.fail("match requires a closed choice, such as decision.value");
          const labels = expr.arms.map(([label]) => label);
          if (labels.length !== value.type.labels.length || value.type.labels.some(label => !labels.includes(label))) this.fail(`match must cover exactly: ${value.type.labels.join(", ")}`);
          const arms = expr.arms.map(([label, arm]) => [label, visit(arm)] as const);
          let type = arms[0]![1].type;
          for (const [, arm] of arms.slice(1)) type = compatible(type, arm.type, m => this.fail(m));
          // Balanced `contains` search over the arm labels — the same split
          // the production lowering emits.
          const branch = (group: readonly (readonly [string, { program: JsonValue }])[]): JsonValue => {
            if (group.length === 1) return group[0]![1].program;
            const middle = Math.ceil(group.length / 2);
            const left = group.slice(0, middle);
            return ["if", ["contains", ["quote", left.map(([label]) => label)], ["get", "_source_match"]], branch(left), branch(group.slice(middle))];
          };
          return { program: ["let", "_source_match", value.program, branch(arms)], type };
        }
        case "decide": case "generate": case "call": case "each":
          return this.fail("effects and calls require a whole binding, return, or branch arm; conditions, operands, and context expressions must be pure");
      }
    };
    return { ...visit(expr), refs };
  }

  /** A whole expression cell at a pure position (`expr` cell). */
  private expression(id: string, expr: Expr, shape?: SourceShape): Ref {
    const pure = this.pure(expr);
    if (shape) assignShape(pure.type, shape, "return value", m => this.fail(m));
    this.add({ id, kind: "expr", inputs: this.wire(id, pure.refs), program: pure.program, output: (shape ? shapeOutput(shape) : outputOf(pure.type)) as unknown as JsonObject });
    return { cell: id, port: "out", type: shape ? sourceValue(shape) : pure.type };
  }
  /** An operand cell — bare names wire straight through. */
  private operand(id: string, expr: Expr): Ref {
    if (expr.kind === "name") {
      const ref = this.env.get(expr.name);
      if (!ref) this.fail(`unknown name ${expr.name}`);
      return ref;
    }
    return this.expression(id, expr);
  }

  /** An `if`/`match` carrying effects: selector cell, per-arm cells gated on
   *  the selector label, and a many-ported merge. The source model records
   *  the selector's label set and emits cells in lowering order. */
  private branch(id: string, expr: Extract<Expr, { kind: "if" | "match" }>, shape?: SourceShape): Ref {
    const prefix = `branch-${++this.branches}`;
    const branchIndex = this.branches;
    const value = this.pure(expr.kind === "if" ? expr.condition : expr.value);
    let labels: string[];
    let arms: [string, Expr][];
    if (expr.kind === "if") {
      requireType(value.type, "boolean", m => this.fail(m));
      labels = ["yes", "no"]; arms = [["yes", expr.yes], ["no", expr.no]];
    } else {
      if (value.type.kind !== "choice") this.fail("match requires a closed choice, such as decision.value");
      labels = value.type.labels; arms = expr.arms;
      if (arms.length !== labels.length || labels.some(label => !arms.some(([arm]) => arm === label))) this.fail(`match must cover exactly: ${labels.join(", ")}`);
    }
    const selector: Ref = { cell: `${prefix}-select`, port: "out", type: { kind: "choice", labels } };
    const selectProgram: JsonValue = expr.kind === "if" ? ["if", value.program, "yes", "no"] : value.program;
    this.add({ id: selector.cell, kind: "expr", inputs: this.wire(selector.cell, value.refs), program: selectProgram, output: outputOf(selector.type) as unknown as JsonObject });
    const results: Ref[] = [];
    const baseline = this.calls; let maximum = 0;
    for (const [index, [label, arm]] of arms.entries()) {
      this.calls = baseline;
      this.controls.push({ selector, label });
      const result = this.lower(`${prefix}-arm-${index + 1}`, arm);
      this.controls.pop();
      if (shape) assignShape(result.type, shape, "return value", m => this.fail(m));
      results.push(result); maximum = Math.max(maximum, this.calls - baseline);
    }
    this.calls = baseline + maximum;
    let type = results[0]!.type;
    for (const result of results.slice(1)) {
      // A decision refinement survives only when every arm declares the same
      // closed labels; otherwise the merge widens through `compatible`.
      if (type.kind === "decision" && result.type.kind === "decision" && type.labels.length === result.type.labels.length && type.labels.every(label => result.type.kind === "decision" && result.type.labels.includes(label))) continue;
      type = compatible(type, result.type, m => this.fail(m));
    }
    for (const result of results) this.edges.push({ from: `${result.cell}.${result.port}`, to: `${id}.selected` });
    const mergeInputs: { name: string; port: PortType }[] = [{ name: "selected", port: { ...portOf(type), many: true } }];
    // `["nth", ["if", ["eq", ["len", s], 1], s, ["list"]], 0]` — the admitted
    // merge: zero delivered arms fail the cell instead of inventing a value.
    const selected: JsonValue = ["get", "selected"];
    const merge: JsonValue = ["nth", ["if", ["eq", ["len", selected], 1], selected, ["list"]], 0];
    this.add({ id, kind: "expr", inputs: mergeInputs, program: merge, output: (shape ? shapeOutput(shape) : outputOf(type)) as unknown as JsonObject });
    this.markSite(expr, { id, branch: { index: branchIndex, labels } });
    return { cell: id, port: "out", type: shape ? sourceValue(shape) : type };
  }

  /** Tail-position lowering: the branch merge, composition, effect, or pure
   *  expression a binding or `return` produces. */
  private lower(id: string, expr: Expr): Ref {
    if ((expr.kind === "if" || expr.kind === "match") && hasEffect(expr)) {
      return this.branch(id, expr);
    }
    if (expr.kind === "call" || expr.kind === "each") {
      return this.composition(id, expr);
    }
    if (expr.kind === "generate") {
      const instruction = this.operand(`${id}-instruction`, expr.instruction);
      if (!isTextType(instruction.type)) this.fail("generation instruction must be text");
      const context = this.operand(`${id}-context`, expr.context); this.calls++;
      this.add({ id, kind: "agent", inputs: this.wire(id, new Map([["instruction", instruction], ["context", context]])), prompt: GENERATE_PROMPT_TEXT, viewInputs: ["instruction", "context"], output: { kind: "text" } });
      this.markSite(expr, { id });
      return { cell: id, port: "out", type: { kind: "text" } };
    }
    if (expr.kind === "decide") {
      const context = this.operand(`${id}-context`, expr.context); const raw = `${id}-decide`; const labels = expr.criteria.map(([label]) => label); this.calls++;
      const questions: JsonObject = { answer: { type: "choice", instructions: expr.question, criteria: Object.fromEntries(expr.criteria) } };
      this.add({ id: raw, kind: "decide", inputs: this.wire(raw, new Map([["context", context]])), questions, viewInputs: ["context"] });
      // The normalized decision-check cell: an `expr` cell whose program
      // admits only well-formed answers — a declared label, a confidence in
      // [0,1], and an in-range probability for every declared label.
      const get = (...path: string[]): JsonValue => ["get", "_source_decision", ...path];
      const validProbabilities: JsonValue = ["fold", ["quote", labels], true, "_source_valid", "_source_label",
        ["and", ["get", "_source_valid"], ["let", "_source_probability", ["get", "_source_decision", "probabilities", ["get", "_source_label"]],
          ["and", ["isNum", ["get", "_source_probability"]], ["gte", ["get", "_source_probability"], 0], ["lte", ["get", "_source_probability"], 1]]]],
      ];
      const valid: JsonValue = ["and", ["contains", ["quote", labels], get("choice")], ["isNum", get("confidence")], ["gte", get("confidence"), 0], ["lte", get("confidence"), 1], validProbabilities];
      const normalized: JsonValue = { value: get("choice"), confidence: get("confidence"), probabilities: Object.fromEntries(labels.map(label => [label, get("probabilities", label)])) };
      const checkProgram: JsonValue = ["let", "_source_decision", ["get", "raw", "answers", "answer"], ["nth", ["if", valid, ["list", normalized], ["list"]], 0]];
      this.add({
        id, kind: "expr",
        inputs: this.wire(id, new Map([["raw", { cell: raw, port: "out", type: { kind: "json" } }]])),
        program: checkProgram,
        output: { kind: "json", schema: {
          type: "object", required: ["value", "confidence", "probabilities"],
          properties: { value: { type: "string" }, confidence: { type: "number" }, probabilities: { type: "object" } },
        } },
      });
      this.markSite(expr, { id });
      return { cell: id, port: "out", type: { kind: "decision", labels } };
    }
    const ref = this.expression(id, expr);
    this.markSite(expr, { id });
    return ref;
  }

  /** `call`/`each` composition: exact named arguments checked against the
   *  child's parameters, arg cells in declaration order, a trigger wrapper
   *  for guarded parameterless calls, and the `each` collector. */
  private composition(id: string, expr: Extract<Expr, { kind: "call" | "each" }>): Ref {
    const child = this.imports.get(expr.alias);
    if (!child) this.fail(`unknown imported program ${expr.alias}`);
    if (expr.args.kind !== "record") this.fail("call arguments must be a record literal with named parameters");
    const parameters = child.module.program.parameters;
    const args = new Map(expr.args.entries);
    if (expr.kind === "each") {
      if (!parameters.some(param => param.name === expr.over)) this.fail(`each input ${expr.over} is not a parameter of ${expr.alias}`);
      if (args.has(expr.over)) this.fail(`each input ${expr.over} is already supplied by the item list`);
      args.set(expr.over, expr.items);
    }
    if (args.size !== parameters.length || parameters.some(param => !args.has(param.name))) {
      this.fail(`arguments must match exactly: ${parameters.map(param => param.name).join(", ") || "(none)"}`);
    }
    const refs = new Map<string, Ref>();
    for (const [index, param] of parameters.entries()) {
      const arg = args.get(param.name)!;
      const pure = this.pure(arg);
      const over = expr.kind === "each" && param.name === expr.over;
      if (over && pure.type.kind !== "list" && pure.type.kind !== "json") this.fail("each input must be a list or a dynamic JSON value");
      if (over && pure.type.kind === "list" && pure.type.item) assignField(pure.type.item, parameterType(param.type), "each item", m => this.fail(m));
      if (!over && typeof param.type === "object") assignShape(pure.type, param.type, `argument ${param.name}`, m => this.fail(m));
      if (!over && param.type === "text" && !isTextType(pure.type) && pure.type.kind !== "json") this.fail(`argument ${param.name} must be text`);
      const type: SType = over || typeof param.type === "object" ? { kind: "json" } : { kind: param.type as "text" | "json" };
      // A dynamic JSON argument destined for `text` gets an explicit runtime
      // assertion: the argument cell prepends an sconcat with "".
      const program = !over && param.type === "text" && !isTextType(pure.type)
        ? ["sconcat", "", pure.program] : pure.program;
      const argId = `${id}-arg-${index + 1}`;
      this.add({ id: argId, kind: "expr", inputs: this.wire(argId, pure.refs), program, output: outputOf(type) as unknown as JsonObject });
      refs.set(kebab(param.name), { cell: argId, port: "out", type });
    }
    let depth = child.analysis.requiredDepth + 1;
    let wrapped = false;
    if (expr.kind === "call" && parameters.length === 0 && this.controls.length) {
      // A guarded parameterless call invokes a generated trigger wrapper so
      // the child's interface stays unchanged; the trigger is one extra
      // depth level and the only gated input.
      wrapped = true; depth++;
      const triggerId = `${id}-trigger`;
      this.add({ id: triggerId, kind: "expr", inputs: this.wire(triggerId, new Map()), program: true, output: { kind: "json", schema: { type: "boolean" } } });
      refs.set("trigger", { cell: triggerId, port: "out", type: { kind: "json" } });
    }
    this.calls += child.analysis.maxAgentCalls * (expr.kind === "each" ? expr.maxItems : 1);
    this.requiredDepth = Math.max(this.requiredDepth, depth);
    const compositionId = expr.kind === "each" ? `${id}-each` : id;
    this.callSites.push({ cellId: compositionId, child, wrapped });
    this.markSite(expr, { id, wrap: wrapped });
    this.wire(compositionId, refs);
    // Composition cells are never gated directly: the child's interface
    // defines its inputs and every argument cell already carries the gate.
    // `manifest` records the child's source key; the differential resolves
    // it to the child (or trigger-wrapper) manifest digest.
    if (expr.kind === "call") this.add({ id, kind: "organism", manifest: child.key }, false);
    else this.add({ id: compositionId, kind: "each", over: kebab(expr.over), maxItems: expr.maxItems, manifest: child.key }, false);
    if (expr.kind === "each") {
      this.edges.push({ from: `${compositionId}.result`, to: `${id}.items` });
      this.add({ id, kind: "expr", inputs: [{ name: "items", port: { type: "json" } }], program: ["get", "items"], output: { kind: "json", schema: { type: "array" } } });
      return { cell: id, port: "out", type: { kind: "list" } };
    }
    return { cell: id, port: "result", type: sourceValue(child.module.program.output) };
  }

  /** `return` with a declared record/list shape: the value is checked where
   *  produced unless it is a call whose child output is already identical. */
  private shapeResult(expr: Expr, shape: SourceShape): Ref {
    if ((expr.kind === "if" || expr.kind === "match") && hasEffect(expr)) {
      const ref = this.branch("result", expr, shape);
      this.markSite(expr, { id: "result" });
      return ref;
    }
    if (expr.kind !== "call" && expr.kind !== "each" && expr.kind !== "decide" && expr.kind !== "generate") {
      const ref = this.expression("result", expr, shape);
      this.markSite(expr, { id: "result" });
      return ref;
    }
    const child = expr.kind === "call" ? this.imports.get(expr.alias)?.module.program.output : undefined;
    const shapeSchema = shape.schema;
    if (typeof child === "object" && shapeSchema !== undefined && child.schema !== undefined && canonicalize(child.schema) === canonicalize(shapeSchema)) {
      const result = this.lower("result", expr);
      assignShape(result.type, shape, "return value", m => this.fail(m));
      this.markSite(expr, { id: "result" });
      return result;
    }
    const value = this.lower("result-value", expr);
    this.markSite(expr, { id: "result-value" });
    assignShape(value.type, shape, "return value", m => this.fail(m));
    this.add({ id: "result", kind: "expr", inputs: this.wire("result", new Map([["value-1", value]])), program: ["get", "value-1"], output: shapeOutput(shape) as unknown as JsonObject });
    return { cell: "result", port: "out", type: sourceValue(shape) };
  }

  /** Check one parsed module against its already-checked imports. */
  compile(program: Program): CheckOutcome {
    const inputs: { name: string; port: PortType }[] = [];
    const names = new Set<string>();
    for (const param of program.parameters) {
      if (names.has(param.name)) this.fail(`duplicate parameter ${param.name}`);
      names.add(param.name);
      if (this.imports.has(param.name)) this.fail(`parameter ${param.name} shadows an import`);
      const name = kebab(param.name);
      if (!/^[a-z][a-z0-9-]*$/.test(name) || inputs.some(input => input.name === name)) {
        this.fail("parameter names must produce distinct lowercase kebab-case interface names");
      }
      const port = parameterPort(param.type);
      inputs.push({ name, port });
      this.env.set(param.name, { cell: "input", port: name, type: sourceValue(param.type) });
    }
    if (program.parameters.length) this.add({ id: "input", kind: "input", outputs: inputs });
    for (const [i, binding] of program.bindings.entries()) {
      if (this.env.has(binding.name) || this.imports.has(binding.name)) this.fail(`duplicate binding ${binding.name}; values and imports are immutable`);
      const id = `b${i + 1}-${kebab(binding.name)}`;
      const ref = this.lower(id, binding.expr);
      this.markSite(binding.expr, { id });
      this.env.set(binding.name, ref);
    }
    const result = typeof program.output === "object" ? this.shapeResult(program.result, program.output) : (() => { const ref = this.lower("result", program.result); this.markSite(program.result, { id: "result" }); return ref; })();
    if (program.output === "text" && !isTextType(result.type)) this.fail(`program declares text but returns ${result.type.kind}`);
    if (program.output === "json" && isTextType(result.type)) this.fail("program declares json but returns text");
    if (this.calls > program.budgets.maxAgentCalls) this.fail(`${this.calls} explicit effects exceed max_agent_calls ${program.budgets.maxAgentCalls}; the budget counts executor attempts, including retries`);
    if (this.requiredDepth > program.budgets.maxDepth) this.fail(`composition requires depth ${this.requiredDepth}, exceeding max_depth ${program.budgets.maxDepth}`);
    // The source parser accepts `max_depth` 0..16 (the expression bound is
    // reused as its range); the generated manifest's admission enforces the
    // contract ceiling — mirror that as a `lowered manifest` rejection.
    if (program.budgets.maxDepth > B.contractMaxDepth) this.fail(`lowered manifest: budgets.maxDepth must be an integer in [0, ${B.contractMaxDepth}]`);
    if (this.edges.length > B.maxEdges) this.fail(`lowered manifest: manifest.edges exceeds ${B.maxEdges}`);
    for (const cell of this.cells) {
      if (!/^[a-z][a-z0-9-]*$/.test(cell.id) || cell.id.length > B.maxIdLength) this.fail(`lowered manifest: cell id ${JSON.stringify(cell.id)} must be a lowercase kebab-case id of at most ${B.maxIdLength} bytes`);
    }
    const out = (typeof program.output === "object" ? shapeOutput(program.output) : outputOf(result.type)) as { kind: string; labels?: string[]; schema?: JsonObject; schemaVersion?: 2 | 3 };
    const resultPort: PortType = out.kind === "text" ? { type: "text" }
      : out.kind === "choice" ? { type: "choice", ...(out.labels !== undefined ? { labels: out.labels } : {}) }
      : { type: "json", ...(out.schema !== undefined ? { schema: out.schema } : {}), ...(out.schemaVersion !== undefined ? { schemaVersion: out.schemaVersion } : {}) };
    // Program names are not kebabed (case is preserved); interface names are.
    const interfaceInputs = Object.fromEntries(program.parameters.map(param => [kebab(param.name), { cell: "input", port: kebab(param.name) }]));
    const outline: Outline = {
      key: `organism:${program.name.replaceAll("_", "-")}`, name: program.name,
      budgets: program.budgets,
      interface: { inputs: interfaceInputs, outputs: { result: { cell: result.cell, port: result.port } } },
      cells: this.cells, edges: this.edges,
    };
    return { analysis: { maxAgentCalls: this.calls, requiredDepth: this.requiredDepth }, outline, calls: this.callSites, sites: this.sites, resultPort };
  }
}
