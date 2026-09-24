// Independent finite denotation. No production imports, float arithmetic, or fuel model.
export type Expr = number | boolean | string | Expr[];
export type Projection = { ok: true; value: number | boolean | string } | { ok: false; code: string };
type Value = bigint | boolean | string;
type Sort = "number" | "boolean" | "string";
export class DomainError extends Error {}
function demand(ok: unknown, message: string): asserts ok { if (!ok) throw new DomainError(message); }
const signatures: Record<string, { input: Sort[]; output: Sort }> = {
  add: { input: ["number", "number"], output: "number" }, sub: { input: ["number", "number"], output: "number" },
  neg: { input: ["number"], output: "number" }, div: { input: ["number", "number"], output: "number" },
  lt: { input: ["number", "number"], output: "boolean" }, not: { input: ["boolean"], output: "boolean" },
  and: { input: ["boolean", "boolean"], output: "boolean" }, or: { input: ["boolean", "boolean"], output: "boolean" },
  slen: { input: ["string"], output: "number" },
};
/** Both branches are admitted before evaluation; an untaken arbitrary program is not smuggled in. */
export function admitExpr(raw: unknown): Expr {
  let nodes = 0;
  function visit(x: unknown, depth: number): Sort {
    demand(++nodes <= 128 && depth <= 8, "independent expression shape bound");
    if (typeof x === "number") { demand(Number.isSafeInteger(x) && Math.abs(x) <= 16, "literal integer domain"); return "number"; }
    if (typeof x === "boolean") return "boolean";
    if (typeof x === "string") {
      demand(x.length <= 32 && [...x].every(c => { const p = c.codePointAt(0)!; return p < 0xd800 || p > 0xdfff; }), "scalar string domain");
      return "string";
    }
    demand(Array.isArray(x) && x.length >= 2 && x.length <= 4 && typeof x[0] === "string", "call shape");
    const op = x[0];
    if (op === "if") {
      demand(x.length === 4 && visit(x[1], depth + 1) === "boolean", "if condition");
      const left = visit(x[2], depth + 1), right = visit(x[3], depth + 1);
      demand(left === right, "if branch types"); return left;
    }
    demand(Object.hasOwn(signatures, op), "operator outside independent grammar");
    const sig = signatures[op]!;
    demand(x.length === sig.input.length + 1, "operator arity");
    for (let i = 0; i < sig.input.length; i++) demand(visit(x[i + 1], depth + 1) === sig.input[i], "operator type");
    // Division is only the deliberate fault terminal; no floating-point oracle is implied.
    if (op === "div") demand(x[1] === 1 && x[2] === 0, "only division-by-zero terminal is admitted");
    return sig.output;
  }
  visit(raw, 0); return raw as Expr;
}
class DivisionByZero extends Error {}
export function denote(raw: unknown): Projection {
  const expr = admitExpr(raw);
  function value(x: Expr): Value {
    if (!Array.isArray(x)) return typeof x === "number" ? BigInt(x) : x;
    const op = x[0];
    const v = (n: number) => value(x[n]!);
    switch (op) {
      case "if": return v(1) ? v(2) : v(3);
      case "and": return v(1) === false ? false : v(2);
      case "or": return v(1) === true ? true : v(2);
      case "not": return !v(1);
      case "add": return (v(1) as bigint) + (v(2) as bigint);
      case "sub": return (v(1) as bigint) - (v(2) as bigint);
      case "neg": return -(v(1) as bigint);
      case "lt": return (v(1) as bigint) < (v(2) as bigint);
      case "slen": return [...(v(1) as string)].reduce((n, c) => n + (c.codePointAt(0)! > 0xffff ? 2n : 1n), 0n);
      case "div": throw new DivisionByZero();
      default: throw new DomainError("unreachable admitted op");
    }
  }
  try {
    const result = value(expr);
    if (typeof result === "bigint") {
      // At most 128 leaves of magnitude16 and only additive arithmetic: every intermediate is exact.
      demand(result >= -2048n && result <= 2048n, "exact integer result bound");
      return { ok: true, value: Number(result) };
    }
    return { ok: true, value: result };
  } catch (error) { if (error instanceof DivisionByZero) return { ok: false, code: "EXPR_DIV_ZERO" }; throw error; }
}
export function project(raw: unknown): Projection {
  demand(raw !== null && typeof raw === "object" && !Array.isArray(raw), "result object");
  const x = raw as Record<string, unknown>;
  demand(typeof x.fuel === "number" && Number.isSafeInteger(x.fuel) && x.fuel >= 0 && x.fuel <= 10_000, "result fuel shape");
  if (x.ok === true) {
    demand(Object.keys(x).sort().join() === "fuel,ok,value" && ["number", "string", "boolean"].includes(typeof x.value), "success shape");
    demand(typeof x.value !== "number" || Number.isFinite(x.value), "finite result");
    return { ok: true, value: x.value as number | boolean | string };
  }
  demand(x.ok === false && Object.keys(x).sort().join() === "err,fuel,ok" && x.err !== null && typeof x.err === "object" && !Array.isArray(x.err), "failure shape");
  const code = (x.err as Record<string, unknown>).code;
  demand(typeof code === "string" && /^EXPR_[A-Z_]+$/.test(code), "error code");
  if (code === "EXPR_PARSE") demand(x.fuel === 0, "raw parse failed after spending fuel");
  return { ok: false, code };
}
