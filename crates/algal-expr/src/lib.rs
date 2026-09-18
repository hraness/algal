//! algal.expr.v1 — bounded, total, pure JSON-expression evaluator.
//!
//! Programs are canonical JSON values in op-head array form: `["add", e1, e2]`.
//!   - scalars (null, bool, number, string) self-evaluate
//!   - every array is an op call: element 0 must be a string naming an op;
//!     literal arrays are written `["list", ...]` or `["quote", v]`
//!   - objects evaluate each field's value in sorted-key order; keys literal
//!
//! The result is data, never a throw. Fuel is a pure function of
//! (program, env): modeled units charged per node, per iteration, per byte.
//! This crate is the single implementation of the language — compiled
//! natively into the Rust runtime and to wasm32 for the Bun runtime — so
//! there is no dual-implementation parity surface. It must remain panic-free:
//! a panic under wasm32 traps the host.

use serde_json::{Map, Value};
use std::collections::BTreeSet;

// ---------------------------------------------------------------- bounds ---

/// Canonical bytes of the program value.
pub const MAX_PROGRAM_BYTES: usize = 16_384;
/// Counted JSON subtrees in the program (arrays, objects, scalars).
pub const MAX_PROGRAM_NODES: usize = 512;
/// Nesting depth of the program value; eval recursion stays under this +1.
pub const MAX_PROGRAM_DEPTH: usize = 16;
/// Canonical bytes of the env record (the cell's input port values).
pub const MAX_ENV_BYTES: usize = 262_144;
/// Depth of any runtime value (env, intermediates, output).
pub const MAX_VALUE_DEPTH: usize = 32;
/// Any array value produced by an op.
pub const MAX_LIST_LEN: usize = 1_024;
/// Any object value's key count.
pub const MAX_OBJECT_KEYS: usize = 256;
/// UTF-8 bytes of any string value produced by an op.
pub const MAX_STRING_BYTES: usize = 65_536;
/// Canonical bytes of the final result.
pub const MAX_OUTPUT_BYTES: usize = 65_536;
/// let/map/filter/fold binder names.
pub const MAX_VAR_LEN: usize = 64;
/// Ceiling on the fuel budget a caller may request.
pub const MAX_FUEL: u64 = 1_000_000;
/// Default fuel budget when the caller does not specify one.
pub const DEFAULT_FUEL: u64 = 10_000;

// ---------------------------------------------------------------- errors ---

/// A structured evaluation error. `code` is one of the closed EXPR_* set;
/// details carry only strings/integers/bools so the error is identical data
/// on every host.
#[derive(Debug, Clone, PartialEq)]
pub struct ExprErr {
    pub code: &'static str,
    pub details: Map<String, Value>,
}

impl ExprErr {
    fn new(code: &'static str) -> Self {
        ExprErr {
            code,
            details: Map::new(),
        }
    }
    fn with(code: &'static str, key: &str, v: impl Into<Value>) -> Self {
        let mut e = Self::new(code);
        e.details.insert(key.to_string(), v.into());
        e
    }
    fn detail(mut self, key: &str, v: impl Into<Value>) -> Self {
        self.details.insert(key.to_string(), v.into());
        self
    }
    /// Serialize for the JSON boundary: {"code": c, ...details}.
    pub fn to_json(&self) -> Value {
        let mut m = self.details.clone();
        m.insert("code".to_string(), Value::from(self.code));
        Value::Object(m)
    }
}

type E = ExprErr;
type R = Result<Value, E>;

fn err_type(op: &str, arg: usize, want: &str, got: &str) -> E {
    ExprErr::with("EXPR_TYPE", "op", op)
        .detail("arg", arg as u64)
        .detail("want", want)
        .detail("got", got)
}
fn err_bounds(what: &str, max: usize) -> E {
    ExprErr::with("EXPR_BOUNDS", "what", what).detail("max", max as u64)
}
fn err_path(op: &str, what: impl Into<String>) -> E {
    ExprErr::with("EXPR_PATH", "op", op).detail("what", Value::from(what.into()))
}
fn err_num(op: &str) -> E {
    ExprErr::with("EXPR_NUM", "op", op)
}
fn err_div(op: &str) -> E {
    ExprErr::with("EXPR_DIV_ZERO", "op", op)
}

fn kind_of(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "text",
        Value::Array(_) => "list",
        Value::Object(_) => "map",
    }
}

// ------------------------------------------------------------- op schema ---

struct OpSpec {
    min: usize,
    max: usize,
    /// 0-based arg slots that must be literal identifier strings (binders).
    binders: &'static [usize],
}

const V: usize = usize::MAX; // variadic

fn op_spec(op: &str) -> Option<OpSpec> {
    let s = |min, max| OpSpec {
        min,
        max,
        binders: &[],
    };
    let b = |min, max, binders: &'static [usize]| OpSpec { min, max, binders };
    Some(match op {
        "add" => s(1, V),
        "sub" => s(2, 2),
        "mul" => s(1, V),
        "div" => s(2, 2),
        "mod" => s(2, 2),
        "neg" => s(1, 1),
        "lt" | "lte" | "gt" | "gte" | "eq" | "neq" => s(2, 2),
        "and" | "or" => s(1, V),
        "not" => s(1, 1),
        "if" => s(3, 3),
        "let" => b(3, 3, &[0]),
        "get" => s(1, V),
        "list" => s(0, V),
        "len" => s(1, 1),
        "nth" => s(2, 2),
        "concat" => s(1, V),
        "map" | "filter" => b(3, 3, &[1]),
        "fold" => b(5, 5, &[2, 3]),
        "contains" => s(2, 2),
        "slen" => s(1, 1),
        "sconcat" => s(1, V),
        "upper" | "lower" | "trim" => s(1, 1),
        "split" => s(2, 2),
        "join" => s(2, 2),
        "scontains" => s(2, 2),
        "isText" | "isNum" | "isBool" | "isList" | "isMap" | "isNull" => s(1, 1),
        "quote" => s(1, 1),
        _ => return None,
    })
}

// -------------------------------------------------------- static checking ---

fn is_var_name(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= MAX_VAR_LEN
        && s.bytes()
            .next()
            .is_some_and(|b| b.is_ascii_alphabetic() || b == b'_')
        && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
}

fn count_nodes(v: &Value) -> usize {
    match v {
        Value::Array(a) => 1 + a.iter().map(count_nodes).sum::<usize>(),
        Value::Object(o) => 1 + o.values().map(count_nodes).sum::<usize>(),
        _ => 1,
    }
}

fn value_depth(v: &Value) -> usize {
    match v {
        Value::Array(a) => 1 + a.iter().map(value_depth).max().unwrap_or(0),
        Value::Object(o) => 1 + o.values().map(value_depth).max().unwrap_or(0),
        _ => 0,
    }
}

/// Static program validation. `scope` is the set of names visible at this
/// point in the program: input-port names supplied by the caller plus binder
/// names from enclosing let/map/filter/fold positions. A literal `["get",
/// "name", ...]` must resolve against that set; computed heads skip the
/// check (runtime EXPR_PATH covers them). Errors return in document order —
/// array children left to right, object fields in sorted-key order — so the
/// same program always yields the same error.
fn check(node: &Value, depth: usize, scope: &mut Vec<String>) -> Result<(), E> {
    if depth > MAX_PROGRAM_DEPTH {
        return Err(err_bounds("program-depth", MAX_PROGRAM_DEPTH));
    }
    match node {
        Value::Array(arr) => {
            let head = arr.first();
            let Some(op) = head.and_then(Value::as_str) else {
                return Err(ExprErr::with(
                    "EXPR_PARSE",
                    "what",
                    "op head must be a string",
                ));
            };
            let spec = op_spec(op).ok_or_else(|| ExprErr::with("EXPR_OP", "op", op))?;
            let argc = arr.len() - 1;
            if argc < spec.min || argc > spec.max {
                return Err(ExprErr::with("EXPR_ARITY", "op", op)
                    .detail(
                        "want",
                        if spec.max == V {
                            format!("{}..", spec.min)
                        } else {
                            format!("{}..{}", spec.min, spec.max)
                        },
                    )
                    .detail("got", argc as u64));
            }
            for &i in spec.binders {
                match arr.get(1 + i).and_then(Value::as_str) {
                    Some(name) if is_var_name(name) => {}
                    _ => {
                        return Err(ExprErr::with("EXPR_PARSE", "op", op).detail(
                            "what",
                            format!("binder arg {i} must be an identifier <= {MAX_VAR_LEN} chars"),
                        ));
                    }
                }
            }
            // quote's payload is literal data, not a program — never checked.
            if op == "quote" {
                return Ok(());
            }
            // get: a literal-string first path element must name a value in
            // scope (a port or an enclosing binder).
            if op == "get" {
                if let Some(name) = arr.get(1).and_then(Value::as_str) {
                    if !scope.iter().any(|n| n == name) {
                        return Err(err_path(op, format!("unbound name \"{name}\"")));
                    }
                }
            }
            // Binder-introducing ops widen the scope only for the body,
            // which is always the last argument. All earlier args —
            // including the literal binder names themselves — are checked
            // under the enclosing scope (a string scalar checks trivially).
            for (i, child) in arr.iter().enumerate().skip(1) {
                if i == arr.len() - 1 && !spec.binders.is_empty() {
                    for &p in spec.binders {
                        if let Some(name) = arr.get(1 + p).and_then(Value::as_str) {
                            scope.push(name.to_string());
                        }
                    }
                    check(child, depth + 1, scope)?;
                    scope.truncate(scope.len() - spec.binders.len());
                } else {
                    check(child, depth + 1, scope)?;
                }
            }
            Ok(())
        }
        Value::Object(obj) => {
            // serde_json::Map iterates in sorted-key order already.
            for child in obj.values() {
                check(child, depth + 1, scope)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

/// Validate a program against the static bounds and the op table.
/// `names` are the visible input names (the cell's input ports, or the env
/// keys for non-cell callers).
pub fn check_program(program: &Value, names: &BTreeSet<String>) -> Result<(), ExprErr> {
    if canonical_bytes(program) > MAX_PROGRAM_BYTES {
        return Err(err_bounds("program-bytes", MAX_PROGRAM_BYTES));
    }
    if count_nodes(program) > MAX_PROGRAM_NODES {
        return Err(err_bounds("program-nodes", MAX_PROGRAM_NODES));
    }
    let mut scope: Vec<String> = names.iter().cloned().collect();
    check(program, 1, &mut scope)
}

// ------------------------------------------------------------------ eval ---

struct Fuel {
    left: u64,
}
impl Fuel {
    fn spend(&mut self, cost: u64) -> Result<(), E> {
        if cost > self.left {
            return Err(ExprErr::with("EXPR_FUEL", "cost", cost).detail("left", self.left));
        }
        self.left -= cost;
        Ok(())
    }
}

/// Flat scope: names pushed by let/map/filter/fold; lookup searches from the
/// innermost binding outward, so shadowing works naturally.
struct Scope {
    vars: Vec<(String, Value)>,
}
impl Scope {
    fn lookup(&self, name: &str) -> Option<&Value> {
        self.vars
            .iter()
            .rev()
            .find(|(n, _)| n == name)
            .map(|(_, v)| v)
    }
}

struct Eval<'a> {
    scope: Scope,
    fuel: Fuel,
    depth: usize,
    env: &'a Map<String, Value>,
}

impl<'a> Eval<'a> {
    fn eval(&mut self, node: &Value) -> R {
        match node {
            Value::Array(arr) => {
                // op head guaranteed by check()
                let op = arr.first().and_then(Value::as_str).unwrap_or("");
                self.depth += 1;
                let r = self.op(op, arr);
                self.depth -= 1;
                r
            }
            Value::Object(obj) => {
                self.fuel.spend(1)?;
                if obj.len() > MAX_OBJECT_KEYS {
                    return Err(err_bounds("object-keys", MAX_OBJECT_KEYS));
                }
                let mut out = Map::new();
                // BTreeMap order = sorted-key order.
                for (k, v) in obj {
                    let base = self.scope.vars.len();
                    let r = self.eval(v);
                    self.scope.vars.truncate(base);
                    out.insert(k.clone(), r?);
                }
                Ok(Value::Object(out))
            }
            _ => {
                self.fuel.spend(1)?;
                Ok(node.clone())
            }
        }
    }

    fn eval_args(&mut self, arr: &[Value]) -> Result<Vec<Value>, E> {
        let mut out = Vec::with_capacity(arr.len().saturating_sub(1));
        for a in arr.iter().skip(1) {
            out.push(self.eval(a)?);
        }
        Ok(out)
    }

    fn base_cost(op: &str, argc: usize) -> u64 {
        match op {
            "and" | "or" | "not" | "if" | "let" | "quote" | "list" => 1,
            "isText" | "isNum" | "isBool" | "isList" | "isMap" | "isNull" => 1,
            "get" => 2 + argc as u64,
            _ => 2,
        }
    }

    fn num(&mut self, node: &Value, op: &str, arg: usize) -> Result<f64, E> {
        let v = self.eval(node)?;
        v.as_f64()
            .ok_or_else(|| err_type(op, arg, "number", kind_of(&v)))
    }

    fn string(&mut self, node: &Value, op: &str, arg: usize) -> Result<String, E> {
        let v = self.eval(node)?;
        match v {
            Value::String(s) => Ok(s),
            _ => Err(err_type(op, arg, "string", kind_of(&v))),
        }
    }

    fn list(&mut self, node: &Value, op: &str, arg: usize) -> Result<Vec<Value>, E> {
        let v = self.eval(node)?;
        match v {
            Value::Array(a) => Ok(a),
            _ => Err(err_type(op, arg, "list", kind_of(&v))),
        }
    }

    fn boolean(&self, v: &Value, op: &str, arg: usize) -> Result<bool, E> {
        match v {
            Value::Bool(b) => Ok(*b),
            _ => Err(err_type(op, arg, "bool", kind_of(v))),
        }
    }

    fn op(&mut self, op: &str, arr: &[Value]) -> R {
        let argc = arr.len() - 1;
        self.fuel.spend(Self::base_cost(op, argc))?;
        match op {
            // ------------------------------------------------ arithmetic
            "add" | "mul" => {
                let args = self.eval_args(arr)?;
                let mut acc = if op == "add" { 0.0 } else { 1.0 };
                for (i, v) in args.iter().enumerate() {
                    let n = v
                        .as_f64()
                        .ok_or_else(|| err_type(op, i, "number", kind_of(v)))?;
                    acc = if op == "add" { acc + n } else { acc * n };
                }
                if !acc.is_finite() {
                    return Err(err_num(op));
                }
                Ok(Value::from(acc))
            }
            "sub" | "div" | "mod" => {
                let a = self.num(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let b = self.num(arr.get(2).unwrap_or(&Value::Null), op, 1)?;
                if (op == "div" || op == "mod") && b == 0.0 {
                    return Err(err_div(op));
                }
                // mod: truncated remainder, sign of the dividend — identical
                // to JS %, Rust %, and C fmod (differs from floored mod).
                let r = if op == "sub" {
                    a - b
                } else if op == "div" {
                    a / b
                } else {
                    a % b
                };
                if !r.is_finite() {
                    return Err(err_num(op));
                }
                Ok(Value::from(r))
            }
            "neg" => {
                let v = -self.num(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                if !v.is_finite() {
                    return Err(err_num(op));
                }
                Ok(Value::from(v))
            }
            // ----------------------------------------------- comparisons
            "lt" | "lte" | "gt" | "gte" => {
                let args = self.eval_args(arr)?;
                let (a, b) = (&args[0], &args[1]);
                let r = match (a, b) {
                    (Value::Number(_), Value::Number(_)) => {
                        let x = a.as_f64().unwrap_or(f64::NAN);
                        let y = b.as_f64().unwrap_or(f64::NAN);
                        match op {
                            "lt" => x < y,
                            "lte" => x <= y,
                            "gt" => x > y,
                            _ => x >= y,
                        }
                    }
                    (Value::String(x), Value::String(y)) => match op {
                        "lt" => x < y,
                        "lte" => x <= y,
                        "gt" => x > y,
                        _ => x >= y,
                    },
                    _ => {
                        return Err(err_type(
                            op,
                            0,
                            "two numbers or two strings",
                            &format!("{},{}", kind_of(a), kind_of(b)),
                        ));
                    }
                };
                Ok(Value::Bool(r))
            }
            "eq" | "neq" => {
                let args = self.eval_args(arr)?;
                self.fuel
                    .spend((count_nodes(&args[0]) + count_nodes(&args[1])) as u64)?;
                let r = eq_values(&args[0], &args[1]);
                Ok(Value::Bool(if op == "eq" { r } else { !r }))
            }
            // ------------------------------------------------------ logic
            "and" | "or" => {
                let want = op == "and";
                for (i, node) in arr.iter().enumerate().skip(1) {
                    let v = self.eval(node)?;
                    let b = self.boolean(&v, op, i - 1)?;
                    if b != want {
                        return Ok(Value::Bool(!want));
                    }
                }
                Ok(Value::Bool(want))
            }
            "not" => {
                let v = self.eval(arr.get(1).unwrap_or(&Value::Null))?;
                Ok(Value::Bool(!self.boolean(&v, op, 0)?))
            }
            // ---------------------------------------------------- control
            "if" => {
                let c = self.eval(arr.get(1).unwrap_or(&Value::Null))?;
                let b = self.boolean(&c, op, 0)?;
                self.eval(arr.get(if b { 2 } else { 3 }).unwrap_or(&Value::Null))
            }
            "let" => {
                let name = arr.get(1).and_then(Value::as_str).unwrap_or("");
                let v = self.eval(arr.get(2).unwrap_or(&Value::Null))?;
                let base = self.scope.vars.len();
                self.scope.vars.push((name.to_string(), v));
                let r = self.eval(arr.get(3).unwrap_or(&Value::Null));
                self.scope.vars.truncate(base);
                r
            }
            // ----------------------------------------------------- access
            "get" => {
                let first = self.eval(arr.get(1).unwrap_or(&Value::Null))?;
                let Value::String(name) = first else {
                    return Err(err_type(op, 0, "name string", kind_of(&first)));
                };
                let mut cur = self
                    .scope
                    .lookup(&name)
                    .cloned()
                    .or_else(|| self.env.get(&name).cloned())
                    .ok_or_else(|| err_path(op, format!("unbound name \"{name}\"")))?;
                for (i, node) in arr.iter().enumerate().skip(2) {
                    let k = self.eval(node)?;
                    let step = i - 1;
                    match k {
                        Value::String(key) => match cur {
                            Value::Object(o) => {
                                cur = match o.get(&key) {
                                    Some(v) => v.clone(),
                                    None => return Ok(Value::Null),
                                };
                            }
                            _ => return Ok(Value::Null),
                        },
                        Value::Number(n) => {
                            let idx = n.as_f64().unwrap_or(-1.0);
                            if idx < 0.0 || idx.fract() != 0.0 {
                                return Err(err_type(op, step, "nonneg integer index", "number"));
                            }
                            match cur {
                                Value::Array(items) => {
                                    let i = idx as usize;
                                    cur = match items.get(i) {
                                        Some(v) => v.clone(),
                                        None => return Ok(Value::Null),
                                    };
                                }
                                _ => return Ok(Value::Null),
                            }
                        }
                        _ => {
                            return Err(err_type(
                                op,
                                step,
                                "string key or nonneg integer index",
                                kind_of(&k),
                            ));
                        }
                    }
                }
                Ok(cur)
            }
            // ----------------------------------------------------- arrays
            "list" => {
                let args = self.eval_args(arr)?;
                if args.len() > MAX_LIST_LEN {
                    return Err(err_bounds("list-len", MAX_LIST_LEN));
                }
                Ok(Value::Array(args))
            }
            "len" => {
                let items = self.list(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                Ok(Value::from(items.len() as u64))
            }
            "nth" => {
                let items = self.list(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let i = self.eval(arr.get(2).unwrap_or(&Value::Null))?;
                let idx = match i.as_f64() {
                    Some(n) if n >= 0.0 && n.fract() == 0.0 => n as usize,
                    _ => {
                        return Err(err_type(op, 1, "nonneg integer", kind_of(&i)));
                    }
                };
                items.get(idx).cloned().ok_or_else(|| {
                    err_path(op, format!("index {idx} out of range {}", items.len()))
                })
            }
            "concat" => {
                let args = self.eval_args(arr)?;
                let mut total = 0usize;
                for (i, v) in args.iter().enumerate() {
                    match v {
                        Value::Array(a) => total += a.len(),
                        _ => return Err(err_type(op, i, "list", kind_of(v))),
                    }
                }
                self.fuel.spend(total as u64)?;
                if total > MAX_LIST_LEN {
                    return Err(err_bounds("list-len", MAX_LIST_LEN));
                }
                let mut out = Vec::with_capacity(total);
                for v in args {
                    if let Value::Array(a) = v {
                        out.extend(a);
                    }
                }
                Ok(Value::Array(out))
            }
            "map" | "filter" => {
                let items = self.list(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let name = arr.get(2).and_then(Value::as_str).unwrap_or("");
                let body = arr.get(3).unwrap_or(&Value::Null);
                let mut out = Vec::new();
                for (i, item) in items.into_iter().enumerate() {
                    self.fuel.spend(1)?;
                    let base = self.scope.vars.len();
                    self.scope.vars.push((name.to_string(), item.clone()));
                    let r = self.eval(body);
                    self.scope.vars.truncate(base);
                    let v = r?;
                    if op == "map" {
                        out.push(v);
                    } else if self.boolean(&v, op, i)? {
                        out.push(item);
                    }
                    if out.len() > MAX_LIST_LEN {
                        return Err(err_bounds("list-len", MAX_LIST_LEN));
                    }
                }
                Ok(Value::Array(out))
            }
            "fold" => {
                let items = self.list(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let mut acc = self.eval(arr.get(2).unwrap_or(&Value::Null))?;
                let acc_name = arr.get(3).and_then(Value::as_str).unwrap_or("");
                let item_name = arr.get(4).and_then(Value::as_str).unwrap_or("");
                let body = arr.get(5).unwrap_or(&Value::Null);
                for item in items {
                    self.fuel.spend(1)?;
                    let base = self.scope.vars.len();
                    self.scope.vars.push((acc_name.to_string(), acc));
                    self.scope.vars.push((item_name.to_string(), item));
                    let r = self.eval(body);
                    self.scope.vars.truncate(base);
                    acc = r?;
                }
                Ok(acc)
            }
            "contains" => {
                let items = self.list(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let v = self.eval(arr.get(2).unwrap_or(&Value::Null))?;
                for item in &items {
                    self.fuel.spend(1)?;
                    if eq_values(item, &v) {
                        return Ok(Value::Bool(true));
                    }
                }
                Ok(Value::Bool(false))
            }
            // ---------------------------------------------------- strings
            "slen" => {
                let s = self.string(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                Ok(Value::from(s.len() as u64))
            }
            "sconcat" => {
                let args = self.eval_args(arr)?;
                let mut bytes = 0usize;
                let mut parts = Vec::with_capacity(args.len());
                for (i, v) in args.iter().enumerate() {
                    match v {
                        Value::String(s) => {
                            bytes += s.len();
                            parts.push(s.clone());
                        }
                        _ => return Err(err_type(op, i, "string", kind_of(v))),
                    }
                }
                if bytes > MAX_STRING_BYTES {
                    return Err(err_bounds("string-bytes", MAX_STRING_BYTES));
                }
                self.fuel.spend(bytes as u64)?;
                Ok(Value::String(parts.concat()))
            }
            "upper" | "lower" | "trim" => {
                let s = self.string(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                self.fuel.spend(s.len() as u64)?;
                let out = match op {
                    "upper" => s.to_ascii_uppercase(),
                    "lower" => s.to_ascii_lowercase(),
                    _ => s
                        .trim_matches(|c| matches!(c, ' ' | '\t' | '\n' | '\r' | '\x0b' | '\x0c'))
                        .to_string(),
                };
                if out.len() > MAX_STRING_BYTES {
                    return Err(err_bounds("string-bytes", MAX_STRING_BYTES));
                }
                Ok(Value::String(out))
            }
            "split" => {
                let s = self.string(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let sep = self.string(arr.get(2).unwrap_or(&Value::Null), op, 1)?;
                if sep.is_empty() {
                    return Err(ExprErr::with("EXPR_ARG", "op", op)
                        .detail("what", "separator must be non-empty"));
                }
                self.fuel.spend(s.len() as u64)?;
                let parts: Vec<Value> = s
                    .split(&sep)
                    .map(|p| Value::String(p.to_string()))
                    .collect();
                if parts.len() > MAX_LIST_LEN {
                    return Err(err_bounds("list-len", MAX_LIST_LEN));
                }
                self.fuel.spend(parts.len() as u64)?;
                Ok(Value::Array(parts))
            }
            "join" => {
                let items = self.list(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let sep = self.string(arr.get(2).unwrap_or(&Value::Null), op, 1)?;
                let mut parts = Vec::with_capacity(items.len());
                for (i, v) in items.iter().enumerate() {
                    match v {
                        Value::String(s) => parts.push(s.clone()),
                        _ => return Err(err_type(op, i, "string", kind_of(v))),
                    }
                }
                let out = parts.join(&sep);
                if out.len() > MAX_STRING_BYTES {
                    return Err(err_bounds("string-bytes", MAX_STRING_BYTES));
                }
                self.fuel.spend(out.len() as u64)?;
                Ok(Value::String(out))
            }
            "scontains" => {
                let s = self.string(arr.get(1).unwrap_or(&Value::Null), op, 0)?;
                let sub = self.string(arr.get(2).unwrap_or(&Value::Null), op, 1)?;
                self.fuel.spend(s.len() as u64)?;
                Ok(Value::Bool(s.contains(&sub)))
            }
            // -------------------------------------------------- predicates
            "isText" | "isNum" | "isBool" | "isList" | "isMap" | "isNull" => {
                let v = self.eval(arr.get(1).unwrap_or(&Value::Null))?;
                let r = match op {
                    "isText" => v.is_string(),
                    "isNum" => v.is_number(),
                    "isBool" => v.is_boolean(),
                    "isList" => v.is_array(),
                    "isMap" => v.is_object(),
                    _ => v.is_null(),
                };
                Ok(Value::Bool(r))
            }
            // ---------------------------------------------------- literals
            "quote" => Ok(arr.get(1).cloned().unwrap_or(Value::Null)),
            _ => Err(ExprErr::with("EXPR_OP", "op", op)),
        }
    }
}

/// Deep equality, key-order-insensitive; numbers compare as f64 so
/// `1 eq 1.0` and `-0 eq 0`. Cross-type is false, never an error.
fn eq_values(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(_), Value::Number(_)) => a.as_f64() == b.as_f64(),
        (Value::Null, Value::Null) => true,
        (Value::Bool(x), Value::Bool(y)) => x == y,
        (Value::String(x), Value::String(y)) => x == y,
        (Value::Array(x), Value::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y.iter()).all(|(x, y)| eq_values(x, y))
        }
        (Value::Object(x), Value::Object(y)) => {
            x.len() == y.len()
                && x.iter()
                    .all(|(k, v)| y.get(k).is_some_and(|w| eq_values(v, w)))
        }
        _ => false,
    }
}

// -------------------------------------------------------- canonical JSON ---

// Byte-identical to crates/algal/src/canonical.rs — used for program/env/
// output size bounds. Fuel accounting depends only on byte length, which is
// order-insensitive, but the encoder reproduces the JS property-order
// semantics anyway so this module can serve canonical bytes anywhere.

fn array_index(key: &str) -> Option<u32> {
    let n: u32 = key.parse().ok()?;
    (n != u32::MAX && n.to_string() == key).then_some(n)
}

fn key_order(a: &str, b: &str) -> std::cmp::Ordering {
    match (array_index(a), array_index(b)) {
        (Some(a), Some(b)) => a.cmp(&b),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        _ => a.encode_utf16().cmp(b.encode_utf16()),
    }
}

fn encode(value: &Value, out: &mut String) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => {
            let f = n.as_f64().unwrap_or(0.0);
            out.push_str(ryu_js::Buffer::new().format(f));
        }
        Value::String(s) => {
            out.push_str(&serde_json::to_string(s).unwrap_or_else(|_| "\"\"".to_string()));
        }
        Value::Array(items) => {
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                encode(item, out);
            }
            out.push(']');
        }
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort_by(|a, b| key_order(a, b));
            out.push('{');
            for (i, k) in keys.into_iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&serde_json::to_string(k).unwrap_or_else(|_| "\"\"".to_string()));
                out.push(':');
                encode(&map[k], out);
            }
            out.push('}');
        }
    }
}

pub fn canonical(value: &Value) -> String {
    let mut out = String::new();
    encode(value, &mut out);
    out
}

pub fn canonical_bytes(value: &Value) -> usize {
    canonical(value).len()
}

fn encode_map(map: &Map<String, Value>, out: &mut String) {
    let mut keys: Vec<&String> = map.keys().collect();
    keys.sort_by(|a, b| key_order(a, b));
    out.push('{');
    for (i, k) in keys.into_iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        out.push_str(&serde_json::to_string(k).unwrap_or_else(|_| "\"\"".to_string()));
        out.push(':');
        encode(&map[k], out);
    }
    out.push('}');
}

fn canonical_map_bytes(map: &Map<String, Value>) -> usize {
    let mut out = String::new();
    encode_map(map, &mut out);
    out.len()
}

fn map_depth(map: &Map<String, Value>) -> usize {
    1 + map.values().map(value_depth).max().unwrap_or(0)
}

// ----------------------------------------------------------------- entry ---

/// Evaluate `program` against `env` under `budget` fuel.
/// Deterministic: same program + env => same value/err and same fuel burn.
/// Returns (value, fuel_used) or (err, fuel_used).
pub fn eval(
    program: &Value,
    env: &Map<String, Value>,
    budget: u64,
) -> Result<(Value, u64), (ExprErr, u64)> {
    if budget > MAX_FUEL {
        return Err((
            err_bounds(
                "fuel budget must be an integer in [0, 1000000]",
                MAX_FUEL as usize,
            ),
            0,
        ));
    }
    let mut ev = Eval {
        scope: Scope { vars: Vec::new() },
        fuel: Fuel { left: budget },
        depth: 0,
        env,
    };
    match ev.eval(program) {
        Ok(v) => Ok((v, budget - ev.fuel.left)),
        Err(e) => Err((e, budget - ev.fuel.left)),
    }
}

/// Full pipeline: bounds + static check + eval. `names` defaults to the env
/// keys when the caller passes `None`.
pub fn run(
    program: &Value,
    env: &Map<String, Value>,
    budget: u64,
) -> Result<(Value, u64), (ExprErr, u64)> {
    if canonical_map_bytes(env) > MAX_ENV_BYTES {
        return Err((err_bounds("env-bytes", MAX_ENV_BYTES), 0));
    }
    if map_depth(env) > MAX_VALUE_DEPTH {
        return Err((err_bounds("value-depth", MAX_VALUE_DEPTH), 0));
    }
    let names: BTreeSet<String> = env.keys().cloned().collect();
    if let Err(e) = check_program(program, &names) {
        return Err((e, 0));
    }
    let (v, fuel) = eval(program, env, budget)?;
    if canonical_bytes(&v) > MAX_OUTPUT_BYTES {
        return Err((err_bounds("output-bytes", MAX_OUTPUT_BYTES), fuel));
    }
    if value_depth(&v) > MAX_VALUE_DEPTH {
        return Err((err_bounds("value-depth", MAX_VALUE_DEPTH), fuel));
    }
    Ok((v, fuel))
}

// ------------------------------------------------------- JSON boundary ---

fn respond(result: Result<(Value, u64), (ExprErr, u64)>) -> String {
    match result {
        Ok((value, fuel)) => canonical(&Value::Object(
            [
                ("fuel".to_string(), Value::from(fuel)),
                ("ok".to_string(), Value::Bool(true)),
                ("value".to_string(), value),
            ]
            .into_iter()
            .collect(),
        )),
        Err((err, fuel)) => canonical(&Value::Object(
            [
                ("err".to_string(), err.to_json()),
                ("fuel".to_string(), Value::from(fuel)),
                ("ok".to_string(), Value::Bool(false)),
            ]
            .into_iter()
            .collect(),
        )),
    }
}

fn bad_request(msg: impl Into<String>) -> String {
    canonical(&Value::Object(
        [
            (
                "err".to_string(),
                ExprErr::with("EXPR_PARSE", "what", msg.into()).to_json(),
            ),
            ("fuel".to_string(), Value::from(0u64)),
            ("ok".to_string(), Value::Bool(false)),
        ]
        .into_iter()
        .collect(),
    ))
}

/// Host boundary for eval: {"program": v, "env": {...}, "fuel"?: n}
/// -> {"ok":true,"value":v,"fuel":n} | {"ok":false,"err":{...},"fuel":n}
pub fn eval_json(input: &[u8]) -> String {
    let Ok(doc) = serde_json::from_slice::<Value>(input) else {
        return bad_request("request is not valid JSON");
    };
    let Some(program) = doc.get("program") else {
        return bad_request("request requires \"program\"");
    };
    let env = doc
        .get("env")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let fuel = doc
        .get("fuel")
        .and_then(Value::as_u64)
        .unwrap_or(DEFAULT_FUEL);
    respond(run(program, &env, fuel))
}

/// Host boundary for static check: {"program": v, "names": [...]}
/// -> {"ok":true} | {"ok":false,"err":{...}}
pub fn check_json(input: &[u8]) -> String {
    let Ok(doc) = serde_json::from_slice::<Value>(input) else {
        return bad_request("request is not valid JSON");
    };
    let Some(program) = doc.get("program") else {
        return bad_request("request requires \"program\"");
    };
    let names: BTreeSet<String> = doc
        .get("names")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    match check_program(program, &names) {
        Ok(()) => canonical(&Value::Object(
            [("ok".to_string(), Value::Bool(true))]
                .into_iter()
                .collect(),
        )),
        Err(e) => canonical(&Value::Object(
            [
                ("err".to_string(), e.to_json()),
                ("ok".to_string(), Value::Bool(false)),
            ]
            .into_iter()
            .collect(),
        )),
    }
}

// ------------------------------------------------------------ wasm FFI ---

// Raw string-in/string-out ABI for wasm32 (no wasm-bindgen). The host copies
// the request into linear memory via algal_alloc, calls algal_eval or
// algal_check, reads the packed (ptr<<32)|len response, copies the bytes out,
// then frees both buffers with algal_dealloc. The evaluator above is
// panic-free; these shims add no panics either.

#[cfg(target_arch = "wasm32")]
#[allow(unsafe_code)]
mod ffi {
    use std::alloc::{Layout, alloc, dealloc};

    #[unsafe(no_mangle)]
    pub extern "C" fn algal_alloc(len: usize) -> *mut u8 {
        if len == 0 {
            return std::ptr::null_mut();
        }
        let Ok(layout) = Layout::from_size_align(len, 1) else {
            return std::ptr::null_mut();
        };
        unsafe { alloc(layout) }
    }

    /// `ptr` must come from `algal_alloc` or `algal_eval`/`algal_check`
    /// with the same `len`.
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn algal_dealloc(ptr: *mut u8, len: usize) {
        if !ptr.is_null() && len > 0 {
            if let Ok(layout) = Layout::from_size_align(len, 1) {
                unsafe { dealloc(ptr, layout) };
            }
        }
    }

    fn pack(out: String) -> u64 {
        // into_boxed_slice shrinks capacity to len so the host's
        // algal_dealloc sees the exact Layout the allocation used.
        let b = out.into_bytes().into_boxed_slice();
        let len = b.len();
        let ptr = Box::into_raw(b) as *mut u8;
        ((ptr as u64) << 32) | (len as u64)
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn algal_eval(ptr: *const u8, len: usize) -> u64 {
        if ptr.is_null() || len == 0 {
            return 0;
        }
        let input = unsafe { std::slice::from_raw_parts(ptr, len) };
        pack(super::eval_json(input))
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn algal_check(ptr: *const u8, len: usize) -> u64 {
        if ptr.is_null() || len == 0 {
            return 0;
        }
        let input = unsafe { std::slice::from_raw_parts(ptr, len) };
        pack(super::check_json(input))
    }
}

#[cfg(test)]
mod tests;
