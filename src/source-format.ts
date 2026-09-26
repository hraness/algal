/** Canonical formatter for `.algal` source: `algal fmt`.
 *
 * The compiler's lexer drops comments, so formatting runs a second,
 * grammar-shaped pass over the token stream (`lexSource` validates the file
 * first, so this walk can trust the shapes it consumes). Tokens emit into a
 * small document IR; groups render flat when they fit `FMT_WIDTH` columns and
 * break otherwise, so the layout is canonical rather than input-shaped.
 *
 * Canonical choices: two-space indent, optional `;` dropped, blank lines
 * collapse to at most one and never border a `{`, `[`, or `(`, `match` and
 * `as choice` blocks always break, long binary chains break before the
 * lowest-precedence operators, and `in [...]` allowed-value lists sort the
 * way the parser compiles them (a comment inside the list keeps source order
 * so the comment stays attached). Line comments always end up on their own
 * line; block comments stay inline when written inline. Formatting is
 * idempotent and never changes the compiled manifest digest.
 */
import { lexSource, type SourceComment } from "./source";

export const FMT_WIDTH = 100;

type Doc =
  | { kind: "text"; text: string }
  | { kind: "cat"; parts: Doc[] }
  | { kind: "line" }                 // breakable space: " " flat, newline + indent when broken
  | { kind: "nil" }                  // "" flat, newline + indent when broken
  | { kind: "hard" }                 // always a newline; forces enclosing groups to break
  | { kind: "ifBreak"; doc: Doc }    // emitted only when the enclosing group broke
  | { kind: "group"; parts: Doc[] }
  | { kind: "indent"; parts: Doc[] };

const TEXT = (text: string): Doc => ({ kind: "text", text });
const LINE: Doc = { kind: "line" };
const NIL: Doc = { kind: "nil" };
const HARD: Doc = { kind: "hard" };
const cat = (...parts: Doc[]): Doc => ({ kind: "cat", parts });
const ind = (...parts: Doc[]): Doc => ({ kind: "indent", parts });
const grp = (...parts: Doc[]): Doc => ({ kind: "group", parts });
const ifBreak = (doc: Doc): Doc => ({ kind: "ifBreak", doc });
const COMMA_BREAK = ifBreak(TEXT(","));

function hasHard(docs: readonly Doc[]): boolean {
  for (const doc of docs) {
    if (doc.kind === "hard") return true;
    if ((doc.kind === "cat" || doc.kind === "group" || doc.kind === "indent") && hasHard(doc.parts)) return true;
    if (doc.kind === "ifBreak" && hasHard([doc.doc])) return true;
  }
  return false;
}

function render(doc: Doc, width: number): string {
  let out = "";
  let col = 0;
  const stack: { parts: readonly Doc[]; at: number; indent: number; flat: boolean }[] = [{ parts: [doc], at: 0, indent: 0, flat: false }];
  const write = (text: string) => {
    // A " " text is always an emitted separator (token text is never a bare
    // space); collapse it when the preceding emit already ended in space.
    if (text === " " && (out === "" || /[\s]$/.test(out))) return;
    out += text;
    const newline = text.lastIndexOf("\n");
    col = newline < 0 ? col + text.length : text.length - newline - 1;
  };
  const newline = (indent: number) => { out += "\n" + " ".repeat(indent); col = indent; };
  /** True when everything since the last newline is indentation — the cursor
   * already sits at a fresh line, so another soft break would add nothing. */
  const fresh = () => {
    const i = out.lastIndexOf("\n");
    return i >= 0 && /^ *$/.test(out.slice(i + 1));
  };
  /** Total flat width of `parts`; a hard break yields Infinity. */
  const flatWidth = (parts: readonly Doc[]): number => {
    let length = 0;
    const pending: { parts: readonly Doc[]; at: number }[] = [{ parts, at: 0 }];
    while (pending.length) {
      const frame = pending[pending.length - 1]!;
      if (frame.at >= frame.parts.length) { pending.pop(); continue; }
      const d = frame.parts[frame.at++]!;
      if (d.kind === "text") length += d.text.length;
      else if (d.kind === "line") length += 1;
      else if (d.kind === "hard") return Infinity;
      else if (d.kind === "cat" || d.kind === "group" || d.kind === "indent") pending.push({ parts: d.parts, at: 0 });
      // nil and ifBreak contribute nothing to a flat render.
      if (col + length > width) return Infinity;
    }
    return length;
  };
  while (stack.length) {
    const frame = stack[stack.length - 1]!;
    if (frame.at >= frame.parts.length) { stack.pop(); continue; }
    const d = frame.parts[frame.at++]!;
    switch (d.kind) {
      case "text": write(d.text); break;
      case "cat": stack.push({ parts: d.parts, at: 0, indent: frame.indent, flat: frame.flat }); break;
      case "indent": stack.push({ parts: d.parts, at: 0, indent: frame.indent + 2, flat: frame.flat }); break;
      // A soft break collapses when the cursor is already at a fresh line
      // (a comment's trailing break, a dropped `,`, a preceding soft break).
      // `hard` never collapses: repeated hard breaks are how blank lines form.
      case "line": if (frame.flat) write(" "); else { if (!fresh()) newline(frame.indent); } break;
      case "nil": if (!frame.flat) { if (!fresh()) newline(frame.indent); } break;
      case "hard": newline(frame.indent); break;
      case "ifBreak": if (!frame.flat) stack.push({ parts: [d.doc], at: 0, indent: frame.indent, flat: frame.flat }); break;
      case "group": {
        const flat = !hasHard(d.parts) && flatWidth(d.parts) !== Infinity;
        stack.push({ parts: d.parts, at: 0, indent: frame.indent, flat });
        break;
      }
    }
  }
  return out;
}

type Token = { kind: "id" | "string" | "number" | "symbol" | "eof"; text: string; start: number; end: number };

const BINARY = new Map([
  ["||", 1], ["&&", 2], ["==", 3], ["!=", 3], ["<", 4], ["<=", 4], [">", 4], [">=", 4],
  ["+", 5], ["-", 5], ["*", 6], ["/", 6], ["%", 6],
]);

export function formatSource(source: string): string {
  const { tokens, comments } = lexSource(source);
  const text = new Formatter(source, tokens, comments).file();
  // Normalize edges the doc IR cannot see: no trailing whitespace, no runs of
  // three newlines, no blank lines hugging braces/brackets/parens, one final
  // newline. These rules only touch line layout, never token content.
  const cleaned = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([{[(])\n{2,}/g, "$1\n")
    .replace(/\n{2,}([}\])])/g, "\n$1")
    .replace(/\n+$/, "");
  return cleaned + "\n";
}

class Formatter {
  private index = 0;
  private commentIndex = 0;
  private lastEnd = 0;
  private started = false;
  constructor(private readonly source: string, private readonly tokens: readonly Token[], private readonly comments: readonly SourceComment[]) {}

  private peek(): Token { return this.tokens[Math.min(this.index, this.tokens.length - 1)]!; }
  private newlines(from: number, to: number): number {
    let count = 0;
    for (let i = from; i < to; i++) if (this.source.charCodeAt(i) === 10) count++;
    return count;
  }
  /** Emit one comment into `out`. Line comments always take their own line;
   * a same-line single-line block comment stays a word in the flow. A blank
   * line before a comment collapses to one. */
  private flushOne(comment: SourceComment, out: Doc[]): void {
    const gap = this.newlines(this.lastEnd, comment.start);
    if (!this.started) out.push(TEXT(comment.text), HARD);
    else if (!comment.block || comment.text.includes("\n") || gap >= 1) {
      if (gap >= 2) out.push(HARD);
      out.push(LINE, TEXT(comment.text), HARD);
    } else {
      // Same-line block comment: glue it to the tokens on both sides so a
      // `return a /* why */` or `x + /* note */ y` keeps its tail even where
      // LINE would break.
      const last = out[out.length - 1];
      if (last?.kind === "line") out.pop();
      else if (!(last?.kind === "text" && last.text === " ")) out.push(TEXT(" "));
      out.push(TEXT(comment.text), TEXT(" "));
    }
    this.lastEnd = comment.end;
    this.started = true;
  }
  /** Flush comments that end before `end` into `out`; returns how many. */
  private flush(end: number, out: Doc[]): number {
    let count = 0;
    while (this.commentIndex < this.comments.length && this.comments[this.commentIndex]!.end <= end) {
      this.flushOne(this.comments[this.commentIndex]!, out);
      this.commentIndex++;
      count++;
    }
    return count;
  }
  /** Emit pending comments before `peek()`, then the line break starting a
   * new item. When comments landed, their trailing hard break already
   * positioned the cursor. A source blank line survives as one break. */
  private sep(out: Doc[]): void {
    const had = this.flush(this.peek().start, out) > 0;
    if (!had) out.push(LINE);
    if (this.newlines(this.lastEnd, this.peek().start) >= 2) out.push(HARD);
  }
  private take(out: Doc[]): Token {
    const token = this.peek();
    if (this.index < this.tokens.length - 1) this.index++;
    this.flush(token.start, out);
    out.push(TEXT(token.text));
    this.lastEnd = token.end;
    this.started = true;
    return token;
  }
  private expect(out: Doc[], text: string): Token {
    const token = this.take(out);
    if (token.text !== text) throw new Error(`algal fmt invariant violated: expected ${JSON.stringify(text)}, found ${JSON.stringify(token.text)}`);
    return token;
  }
  private eat(out: Doc[], text: string): boolean {
    if (this.peek().text !== text) return false;
    this.take(out);
    return true;
  }
  /** Consume an optional token without emitting it (the optional `;`), keeping
   * any comments flushed before it. */
  private drop(out: Doc[], text: string): void {
    if (this.peek().text !== text) return;
    const docs: Doc[] = [];
    this.take(docs);
    docs.pop();                // the token text itself is not emitted
    out.push(...docs);
  }

  /** Walk `,`-separated items until `close`, calling `item` per element. The
   * `,` lands right after the item: comments that sat between the item and
   * the `,` move to after it, and a trailing `,` is dropped — canonical
   * output re-adds one only when the group breaks. */
  private items(close: string, out: Doc[], item: (out: Doc[]) => void): void {
    let first = true;
    while (this.peek().text !== close) {
      if (first) this.flush(this.peek().start, out);
      else {
        const comma: Doc[] = [];
        this.expect(comma, ",");
        comma.pop();               // the "," text; re-emitted before its comments
        out.push(TEXT(","), ...comma);
        if (this.peek().text === close) break;
        this.sep(out);
      }
      item(out);
      first = false;
    }
    this.flush(this.peek().start, out);
    while (out.length && out[out.length - 1]!.kind === "line") out.pop();
    const last = out[out.length - 1];
    if (last?.kind === "text" && last.text === ",") out.pop();
  }

  file(): string {
    const parts: Doc[] = [];
    let first = true;
    let lastWasImport = false;
    while (this.peek().kind !== "eof") {
      const token = this.peek().text;
      const isImport = token === "import";
      if (first) this.flush(this.peek().start, parts);
      else {
        // Comments in a gap belong to the item that follows them, so the
        // blank line lands before the whole comment run — a rule that stays
        // stable when formatting moves line comments onto their own lines.
        // Consecutive imports pack on adjacent lines.
        const gap: Doc[] = [];
        this.flush(this.peek().start, gap);
        if (isImport && lastWasImport && gap.length === 0) parts.push(LINE);
        else if (isImport && lastWasImport) parts.push(...gap);
        else parts.push(HARD, HARD, ...gap);
      }
      first = false;
      lastWasImport = isImport;
      if (isImport) this.import(parts);
      else if (token === "record" || token === "closed") this.record(parts);
      else this.program(parts);
    }
    this.flush(this.source.length, parts);
    return render(cat(...parts), FMT_WIDTH);
  }

  private import(out: Doc[]): void {
    this.expect(out, "import");
    out.push(TEXT(" "));
    this.take(out);            // alias
    out.push(TEXT(" "));
    this.expect(out, "from");
    out.push(TEXT(" "));
    this.take(out);            // path string
    this.drop(out, ";");
  }

  private record(out: Doc[]): void {
    const head: Doc[] = [];
    if (this.eat(head, "closed")) head.push(TEXT(" "));
    this.expect(head, "record");
    head.push(TEXT(" "));
    this.take(head);           // name
    const open: Doc[] = [];
    this.expect(open, "{");
    const fields: Doc[] = [];
    this.items("}", fields, field => this.field(field));
    const close: Doc[] = [];
    this.expect(close, "}");
    out.push(...head, TEXT(" "), grp(...open, ind(LINE, ...fields, COMMA_BREAK), LINE, ...close));
  }
  private field(out: Doc[]): void {
    this.take(out);            // name
    this.expect(out, ":");
    out.push(TEXT(" "));
    this.fieldType(out);
    this.eat(out, "?");
  }
  /** `text`, `number`, `integer`, `boolean`, `json`, a format, a record name,
   * `[type] unique`, or a scalar with `in [...]` / `min`/`max` bounds. `in`
   * lists emit sorted the way the parser compiles them, unless a comment sits
   * inside the list (then source order keeps the comment attached). */
  private fieldType(out: Doc[]): void {
    const token = this.take(out);
    if (token.text === "[") {
      this.fieldType(out);
      this.expect(out, "]");
      if (this.peek().text === "unique") {
        out.push(TEXT(" "));
        this.take(out);
      }
      return;
    }
    if (token.text !== "text" && token.text !== "number" && token.text !== "integer") return;
    if (this.peek().text === "in") {
      out.push(TEXT(" "));
      this.expect(out, "in");
      out.push(TEXT(" "));
      this.allowed(out, token.text === "text");
      return;
    }
    const signed = token.text !== "text";
    if (this.peek().text === "min") this.bound(out, signed);
    if (this.peek().text === "max") this.bound(out, signed);
  }
  private bound(out: Doc[], signed: boolean): void {
    out.push(TEXT(" "));
    this.take(out);            // min | max
    out.push(TEXT(" "));
    if (signed) this.eat(out, "-");
    this.take(out);
  }
  private allowed(out: Doc[], text: boolean): void {
    const open: Doc[] = [];
    this.expect(open, "[");
    const items: { docs: Doc[]; value: string | number }[] = [];
    let commented = open.length > 1;
    while (this.peek().text !== "]") {
      const docs: Doc[] = [];
      const before = this.commentIndex;
      const negative = this.peek().text === "-";
      if (negative) this.take(docs);
      const literal = this.take(docs);
      if (this.peek().text !== "]") {
        this.expect(docs, ",");
        docs.pop();            // the separator is re-emitted canonically
      }
      // A comment anywhere inside an item (before it, around its `,`) keeps
      // source order so the comment stays attached to its value.
      if (this.commentIndex !== before) commented = true;
      const raw = negative ? "-" + literal.text : literal.text;
      items.push({ docs, value: text ? JSON.parse(literal.text) : Number(raw) });
    }
    const close: Doc[] = [];
    this.expect(close, "]");
    if (close.length > 1) commented = true;
    const ordered = commented ? items : [...items].sort((a, b) =>
      text ? (a.value as string) < (b.value as string) ? -1 : (a.value as string) > (b.value as string) ? 1 : 0
           : (a.value as number) - (b.value as number));
    out.push(...open);
    ordered.forEach((item, index) => {
      if (index > 0) out.push(TEXT(","), TEXT(" "));
      out.push(...item.docs);
    });
    out.push(...close);
  }

  private program(out: Doc[]): void {
    this.expect(out, "program");
    out.push(TEXT(" "));
    this.take(out);            // name
    const open: Doc[] = [];
    this.expect(open, "(");
    const params: Doc[] = [];
    this.items(")", params, param => {
      this.take(param);        // name
      this.expect(param, ":");
      param.push(TEXT(" "));
      this.type(param);
    });
    const closeParams: Doc[] = [];
    this.expect(closeParams, ")");
    out.push(grp(...open, ind(NIL, ...params, COMMA_BREAK), NIL, ...closeParams));
    out.push(TEXT(" "));
    this.expect(out, "->");
    out.push(TEXT(" "));
    this.type(out);
    out.push(TEXT(" "));
    const openBrace: Doc[] = [];
    this.expect(openBrace, "{");
    out.push(...openBrace);

    const body: Doc[] = [];
    this.expect(body, "budget");
    body.push(TEXT(" "));
    const openBudget: Doc[] = [];
    this.expect(openBudget, "{");
    const budgets: Doc[] = [];
    this.items("}", budgets, entry => {
      this.take(entry);        // budget key
      this.expect(entry, ":");
      entry.push(TEXT(" "));
      this.take(entry);        // value
    });
    const closeBudget: Doc[] = [];
    this.expect(closeBudget, "}");
    body.push(grp(...openBudget, ind(LINE, ...budgets, COMMA_BREAK), LINE, ...closeBudget));
    body.push(HARD, HARD);     // one blank line after budget, always
    while (this.peek().text !== "}") {
      this.sep(body);
      if (this.peek().text === "let") this.binding(body);
      else this.returnStatement(body);
    }
    this.flush(this.peek().start, body);
    const close: Doc[] = [];
    this.expect(close, "}");
    out.push(ind(HARD, ...body), HARD, ...close);
  }
  private binding(out: Doc[]): void {
    this.expect(out, "let");
    out.push(TEXT(" "));
    this.take(out);            // name
    out.push(TEXT(" "));
    this.expect(out, "=");
    out.push(TEXT(" "));
    this.expression(out);
    this.drop(out, ";");
  }
  private returnStatement(out: Doc[]): void {
    this.expect(out, "return");
    out.push(TEXT(" "));
    this.expression(out);
    this.drop(out, ";");
  }

  private type(out: Doc[]): void {
    // `[item] unique?` is a field type; otherwise a bare text | json | Record.
    if (this.peek().text === "[") this.fieldType(out);
    else this.take(out);
  }

  /** A binary chain. Operators at the chain's lowest precedence get the
   * outer break (`a` newline `+ b`), while runs of tighter operators nest as
   * their own group, which breaks only if that segment still overflows. */
  private expression(out: Doc[]): void {
    this.primary(out);
    this.postfixes(out);
    const ops: { op: string; head: Doc[]; term: Doc[] }[] = [];
    while (BINARY.has(this.peek().text)) {
      const head: Doc[] = [];
      const op = this.take(head).text;
      const term: Doc[] = [];
      this.primary(term);
      this.postfixes(term);
      ops.push({ op, head, term });
    }
    if (ops.length) out.push(this.chain(ops));
  }
  /** `ops[i]` joins operand `i` and `i + 1`; the first operand already
   * emitted. Breaks at the lowest precedence, recursively grouping tighter
   * runs so `a + b * c + d` over width renders `a` newline `+ b * c` newline
   * `+ d`, and only a still-too-wide segment breaks `b` newline `* c`. */
  private chain(ops: readonly { op: string; head: Doc[]; term: Doc[] }[]): Doc {
    const lowest = Math.min(...ops.map(({ op }) => BINARY.get(op)!));
    const parts: Doc[] = [];
    let at = 0;
    while (at < ops.length) {
      const { op, head, term } = ops[at]!;
      if (BINARY.get(op)! === lowest) {
        parts.push(LINE, ...head, TEXT(" "), ...term);   // head ends with the op text
        at++;
      } else {
        const run: { op: string; head: Doc[]; term: Doc[] }[] = [];
        while (at < ops.length && BINARY.get(ops[at]!.op)! > lowest) run.push(ops[at++]!);
        parts.push(this.chain(run));
      }
    }
    return grp(ind(...parts));
  }
  /** `.field` and `.probability(expr)` after an operand — tight. */
  private postfixes(out: Doc[]): void {
    while (this.peek().text === ".") {
      this.take(out);
      this.take(out);          // field name or `probability`
      if (this.peek().text === "(") {
        const open: Doc[] = [];
        this.expect(open, "(");
        const inner: Doc[] = [];
        this.expression(inner);
        const close: Doc[] = [];
        this.expect(close, ")");
        out.push(grp(...open, ind(NIL, ...inner), NIL, ...close));
      }
    }
  }
  private primary(out: Doc[]): void {
    const head: Doc[] = [];
    const token = this.take(head);
    switch (token.text) {
      case "(": {
        const inner: Doc[] = [];
        this.expression(inner);
        const close: Doc[] = [];
        this.expect(close, ")");
        out.push(grp(...head, ind(NIL, ...inner), NIL, ...close));
        return;
      }
      case "[": {
        const items: Doc[] = [];
        this.items("]", items, item => this.expression(item));
        const close: Doc[] = [];
        this.expect(close, "]");
        if (!items.length) { out.push(...head, ...close); return; }
        out.push(grp(...head, ind(NIL, ...items, COMMA_BREAK), NIL, ...close));
        return;
      }
      case "{": {
        const entries: Doc[] = [];
        this.items("}", entries, entry => {
          this.take(entry);      // key (name or string)
          this.expect(entry, ":");
          entry.push(TEXT(" "));
          this.expression(entry);
        });
        const close: Doc[] = [];
        this.expect(close, "}");
        if (!entries.length) { out.push(...head, ...close); return; }
        out.push(grp(...head, ind(LINE, ...entries, COMMA_BREAK), LINE, ...close));
        return;
      }
      case "if": {
        const condition: Doc[] = [];
        this.expression(condition);
        const openYes: Doc[] = [];
        this.expect(openYes, "{");
        const yes: Doc[] = [];
        this.expression(yes);
        const closeYes: Doc[] = [];
        this.expect(closeYes, "}");
        const elseKeyword: Doc[] = [];
        this.expect(elseKeyword, "else");
        const openNo: Doc[] = [];
        this.expect(openNo, "{");
        const no: Doc[] = [];
        this.expression(no);
        const closeNo: Doc[] = [];
        this.expect(closeNo, "}");
        out.push(...head, TEXT(" "), ...condition, TEXT(" "),
          grp(...openYes, ind(LINE, ...yes), LINE, ...closeYes),
          TEXT(" "), ...elseKeyword, TEXT(" "),
          grp(...openNo, ind(LINE, ...no), LINE, ...closeNo));
        return;
      }
      case "match": {
        const value: Doc[] = [];
        this.expression(value);
        const open: Doc[] = [];
        this.expect(open, "{");
        const arms: Doc[] = [];
        this.items("}", arms, arm => {
          this.take(arm);        // label
          arm.push(TEXT(" "));
          this.expect(arm, "=>");
          arm.push(TEXT(" "));
          this.expression(arm);
        });
        const close: Doc[] = [];
        this.expect(close, "}");
        out.push(...head, TEXT(" "), ...value, TEXT(" "), ...open, ind(HARD, ...arms), HARD, ...close);
        return;
      }
      case "decide": {
        const question: Doc[] = [];
        this.take(question);       // question string
        const using: Doc[] = [];
        this.expect(using, "using");
        const context: Doc[] = [];
        this.expression(context);
        const asForm: Doc[] = [];
        this.expect(asForm, "as");
        asForm.push(TEXT(" "));
        const choice = this.peek().text === "choice";
        const noul = this.peek().text === "noul";
        this.take(asForm);         // choice | noul | score
        if (noul) {
          out.push(...head, TEXT(" "), ...question, grp(ind(LINE, ...using, TEXT(" "), ...context)),
            ind(LINE, ...asForm));
          return;
        }
        const open: Doc[] = [];
        this.expect(open, "{");
        const criteria: Doc[] = [];
        this.items("}", criteria, criterion => {
          if (choice) {
            this.take(criterion);  // label
            this.expect(criterion, ":");
            criterion.push(TEXT(" "));
          }
          this.take(criterion);    // description or score label string
        });
        const close: Doc[] = [];
        this.expect(close, "}");
        out.push(...head, TEXT(" "), ...question, grp(ind(LINE, ...using, TEXT(" "), ...context)),
          ind(LINE, ...asForm, TEXT(" "), ...open, ind(HARD, ...criteria), HARD, ...close));
        return;
      }
      case "generate": {
        const instruction: Doc[] = [];
        this.expression(instruction);
        const using: Doc[] = [];
        this.expect(using, "using");
        const context: Doc[] = [];
        this.expression(context);
        if (this.peek().text === "as") {
          const tail: Doc[] = [];
          this.take(tail);
          tail.push(TEXT(" "));
          this.fieldType(tail);
          context.push(TEXT(" "), ...tail);
        }
        out.push(...head, TEXT(" "), ...instruction, grp(ind(LINE, ...using, TEXT(" "), ...context)));
        return;
      }
      case "call": {
        const alias: Doc[] = [];
        this.take(alias);
        const using: Doc[] = [];
        this.expect(using, "using");
        const args: Doc[] = [];
        this.expression(args);
        out.push(...head, TEXT(" "), ...alias, grp(ind(LINE, ...using, TEXT(" "), ...args)));
        return;
      }
      case "each": {
        const alias: Doc[] = [];
        this.take(alias);
        const overKeyword: Doc[] = [];
        this.expect(overKeyword, "over");
        const over: Doc[] = [];
        this.take(over);
        const inKeyword: Doc[] = [];
        this.expect(inKeyword, "in");
        const items: Doc[] = [];
        this.expression(items);
        const using: Doc[] = [];
        this.expect(using, "using");
        const args: Doc[] = [];
        this.expression(args);
        const maxItems: Doc[] = [];
        this.expect(maxItems, "max_items");
        maxItems.push(TEXT(" "));
        this.take(maxItems);
        out.push(...head, TEXT(" "), ...alias, TEXT(" "), ...overKeyword, TEXT(" "), ...over, TEXT(" "), ...inKeyword, TEXT(" "), ...items,
          grp(ind(LINE, ...using, TEXT(" "), ...args, TEXT(" "), ...maxItems)));
        return;
      }
      case "!":
      case "-": {
        const operand: Doc[] = [];
        this.primary(operand);
        this.postfixes(operand);
        out.push(...head, ...operand);
        return;
      }
      default:
        out.push(...head);     // literal, name, or other token emits as-is
        return;
    }
  }
}
