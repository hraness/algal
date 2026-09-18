use super::*;
use serde_json::json;
use std::collections::BTreeSet;

fn names(list: &[&str]) -> BTreeSet<String> {
    list.iter().map(|s| s.to_string()).collect()
}

// Result values round-trip through canonical form so number representation
// (i64 literals vs f64 results) normalizes — the language semantics are f64.
fn ok_eval(p: Value, env: &Map<String, Value>) -> Value {
    match run(&p, env, DEFAULT_FUEL) {
        Ok((v, _)) => serde_json::from_str(&canonical(&v)).unwrap_or(Value::Null),
        Err((e, _)) => panic!("expected ok, got {} {:?}", e.code, e.details),
    }
}

fn err_eval(p: Value, env: &Map<String, Value>) -> ExprErr {
    match run(&p, env, DEFAULT_FUEL) {
        Ok(_) => panic!("expected err"),
        Err((e, _)) => e,
    }
}

fn env(pairs: &[(&str, Value)]) -> Map<String, Value> {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), v.clone()))
        .collect()
}

// ------------------------------------------------------------ literals ---

#[test]
fn scalars_self_evaluate() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(null), &e), json!(null));
    assert_eq!(ok_eval(json!(42), &e), json!(42));
    assert_eq!(ok_eval(json!("hi"), &e), json!("hi"));
    assert_eq!(ok_eval(json!(true), &e), json!(true));
}

#[test]
fn quote_returns_verbatim() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(["quote", [1, 2, 3]]), &e), json!([1, 2, 3]));
    assert_eq!(
        ok_eval(json!(["quote", {"a": ["add", 1]}]), &e),
        json!({"a": ["add", 1]})
    );
}

#[test]
fn object_fields_evaluate() {
    let e = Map::new();
    assert_eq!(
        ok_eval(json!({"a": ["add", 1, 2], "b": "x"}), &e),
        json!({"a": 3, "b": "x"})
    );
}

// ------------------------------------------------------------ arithmetic ---

#[test]
fn arithmetic() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(["add", 1, 2, 3]), &e), json!(6));
    assert_eq!(ok_eval(json!(["mul", 2, 3, 4]), &e), json!(24));
    assert_eq!(ok_eval(json!(["sub", 10, 3]), &e), json!(7));
    assert_eq!(ok_eval(json!(["div", 7, 2]), &e), json!(3.5));
    assert_eq!(ok_eval(json!(["mod", -7, 3]), &e), json!(-1));
    assert_eq!(ok_eval(json!(["mod", 7, -3]), &e), json!(1));
    assert_eq!(ok_eval(json!(["neg", 5]), &e), json!(-5));
    assert_eq!(
        ok_eval(json!(["mul", 0.1, 3]), &e),
        json!(0.30000000000000004)
    );
}

#[test]
fn arithmetic_errors() {
    let e = Map::new();
    assert_eq!(err_eval(json!(["div", 1, 0]), &e).code, "EXPR_DIV_ZERO");
    assert_eq!(err_eval(json!(["mod", 1, 0]), &e).code, "EXPR_DIV_ZERO");
    assert_eq!(err_eval(json!(["add", 1, "x"]), &e).code, "EXPR_TYPE");
    assert_eq!(err_eval(json!(["mul", 1e308, 10]), &e).code, "EXPR_NUM");
}

// ------------------------------------------------------------ comparison ---

#[test]
fn comparisons() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(["lt", 1, 2]), &e), json!(true));
    assert_eq!(ok_eval(json!(["gte", "b", "a"]), &e), json!(true));
    assert_eq!(ok_eval(json!(["eq", 1, 1.0]), &e), json!(true));
    assert_eq!(
        ok_eval(json!(["eq", {"a":1,"b":2}, {"b":2,"a":1}]), &e),
        json!(true)
    );
    assert_eq!(
        ok_eval(json!(["eq", ["quote", [1, 2]], ["quote", [2, 1]]]), &e),
        json!(false)
    );
    assert_eq!(ok_eval(json!(["neq", "a", "b"]), &e), json!(true));
    // mixed-type lt is a type error, never a coercion
    assert_eq!(err_eval(json!(["lt", 1, "2"]), &e).code, "EXPR_TYPE");
    assert_eq!(err_eval(json!(["lt", true, false]), &e).code, "EXPR_TYPE");
}

// ----------------------------------------------------------------- logic ---

#[test]
fn logic_strict_bools() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(["and", true, true]), &e), json!(true));
    assert_eq!(ok_eval(json!(["and", true, false]), &e), json!(false));
    assert_eq!(ok_eval(json!(["or", false, true]), &e), json!(true));
    assert_eq!(ok_eval(json!(["not", false]), &e), json!(true));
    // no truthiness
    assert_eq!(err_eval(json!(["and", 1, true]), &e).code, "EXPR_TYPE");
    assert_eq!(err_eval(json!(["not", "x"]), &e).code, "EXPR_TYPE");
    assert_eq!(err_eval(json!(["if", 0, 1, 2]), &e).code, "EXPR_TYPE");
}

#[test]
fn short_circuit() {
    let e = Map::new();
    // RHS never runs — no div-by-zero
    assert_eq!(
        ok_eval(json!(["and", false, ["div", 1, 0]]), &e),
        json!(false)
    );
    assert_eq!(ok_eval(json!(["or", true, ["div", 1, 0]]), &e), json!(true));
    assert_eq!(ok_eval(json!(["if", true, 1, ["div", 1, 0]]), &e), json!(1));
}

// ------------------------------------------------------------------- let ---

#[test]
fn let_binding_and_shadowing() {
    let e = Map::new();
    assert_eq!(
        ok_eval(json!(["let", "x", 5, ["add", ["get", "x"], 1]]), &e),
        json!(6)
    );
    // inner let shadows outer
    assert_eq!(
        ok_eval(json!(["let", "x", 1, ["let", "x", 2, ["get", "x"]]]), &e),
        json!(2)
    );
    // binder sees ports too
    let env = env(&[("p", json!(10))]);
    assert!(check_program(&json!(["let", "x", 1, ["get", "x"]]), &names(&[])).is_ok());
    assert_eq!(
        ok_eval(
            json!(["let", "y", ["get", "p"], ["add", ["get", "y"], 1]]),
            &env
        ),
        json!(11)
    );
}

// ------------------------------------------------------------------- get ---

#[test]
fn get_paths() {
    let env = env(&[(
        "order",
        json!({"items": [{"sku": "a", "qty": 2}, {"sku": "b", "qty": 5}]}),
    )]);
    assert_eq!(
        ok_eval(json!(["get", "order", "items", 0, "sku"]), &env),
        json!("a")
    );
    assert_eq!(
        ok_eval(json!(["get", "order", "items", 1, "qty"]), &env),
        json!(5)
    );
    // missing keys / out-of-range indices / scalar descends return null
    // (the pick.v1 miss precedent); only an unbound name is an error.
    assert_eq!(
        ok_eval(json!(["get", "order", "missing"]), &env),
        json!(null)
    );
    assert_eq!(
        ok_eval(json!(["get", "order", "items", 9]), &env),
        json!(null)
    );
    let bare = Map::new();
    assert_eq!(
        run(&json!(["get", "nope"]), &bare, DEFAULT_FUEL)
            .err()
            .map(|(e, _)| e.code),
        Some("EXPR_PATH")
    );
    // descending a scalar is also a miss — the path simply doesn't exist
    assert_eq!(
        ok_eval(json!(["get", "order", "items", 0, "sku", "x"]), &env),
        json!(null)
    );
}

#[test]
fn get_computed_first_arg() {
    let env = env(&[("order", json!({"x": 1}))]);
    // computed name is allowed at runtime
    assert_eq!(
        ok_eval(json!(["get", ["sconcat", "or", "der"], "x"]), &env),
        json!(1)
    );
}

#[test]
fn static_get_name_check() {
    // literal get name must resolve to a declared input or enclosing binder
    assert_eq!(
        check_program(&json!(["get", "nope"]), &names(&["yes"]))
            .err()
            .map(|e| e.code),
        Some("EXPR_PATH")
    );
    assert!(check_program(&json!(["get", "yes"]), &names(&["yes"])).is_ok());
    // binder names count
    assert!(check_program(&json!(["let", "x", 1, ["get", "x"]]), &names(&[])).is_ok());
    // but not outside the binder's scope
    assert_eq!(
        check_program(
            &json!(["list", ["let", "x", 1, 0], ["get", "x"]]),
            &names(&[])
        )
        .err()
        .map(|e| e.code),
        Some("EXPR_PATH")
    );
}

// ----------------------------------------------------------------- arrays ---

#[test]
fn arrays() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(["list", 1, 2, 3]), &e), json!([1, 2, 3]));
    assert_eq!(ok_eval(json!(["len", ["list", 1, 2]]), &e), json!(2));
    assert_eq!(
        ok_eval(json!(["nth", ["quote", ["a", "b"]], 1]), &e),
        json!("b")
    );
    assert_eq!(
        ok_eval(json!(["concat", ["quote", [1]], ["quote", [2, 3]]]), &e),
        json!([1, 2, 3])
    );
    assert_eq!(
        err_eval(json!(["nth", ["quote", [1]], 5]), &e).code,
        "EXPR_PATH"
    );
    assert_eq!(
        err_eval(json!(["nth", ["quote", [1]], -1]), &e).code,
        "EXPR_TYPE"
    );
    assert_eq!(
        ok_eval(json!(["contains", ["quote", [1, 2, 3]], 2]), &e),
        json!(true)
    );
    assert_eq!(
        ok_eval(json!(["contains", ["quote", [{"a": 1}]], {"a": 1}]), &e),
        json!(true)
    );
}

#[test]
fn map_filter_fold() {
    let e = Map::new();
    assert_eq!(
        ok_eval(
            json!(["map", ["quote", [1, 2, 3]], "x", ["mul", ["get", "x"], 2]]),
            &e
        ),
        json!([2, 4, 6])
    );
    assert_eq!(
        ok_eval(
            json!([
                "filter",
                ["quote", [1, 2, 3, 4]],
                "x",
                ["gt", ["get", "x"], 2]
            ]),
            &e
        ),
        json!([3, 4])
    );
    assert_eq!(
        ok_eval(
            json!([
                "fold",
                ["quote", [1, 2, 3]],
                0,
                "acc",
                "x",
                ["add", ["get", "acc"], ["get", "x"]]
            ]),
            &e
        ),
        json!(6)
    );
    // filter body must be bool
    assert_eq!(
        err_eval(json!(["filter", ["quote", [1]], "x", ["get", "x"]]), &e).code,
        "EXPR_TYPE"
    );
    // binder visible in body, not outside
    assert!(
        check_program(
            &json!(["map", ["quote", [1]], "x", ["get", "x"]]),
            &names(&[])
        )
        .is_ok()
    );
    assert_eq!(
        check_program(
            &json!(["map", ["quote", [1]], "x", ["get", "y"]]),
            &names(&[])
        )
        .err()
        .map(|e| e.code),
        Some("EXPR_PATH")
    );
}

// ---------------------------------------------------------------- strings ---

#[test]
fn strings() {
    let e = Map::new();
    // slen = UTF-16 code units — matches JS .length and canonical key order
    assert_eq!(ok_eval(json!(["slen", "héllo"]), &e), json!(5));
    assert_eq!(ok_eval(json!(["slen", "😀"]), &e), json!(2));
    assert_eq!(ok_eval(json!(["sconcat", "a", "b", "c"]), &e), json!("abc"));
    assert_eq!(ok_eval(json!(["upper", "héllo"]), &e), json!("HéLLO"));
    assert_eq!(ok_eval(json!(["lower", "ABC"]), &e), json!("abc"));
    assert_eq!(ok_eval(json!(["trim", "  x \n"]), &e), json!("x"));
    assert_eq!(
        ok_eval(json!(["split", "a,b,c", ","]), &e),
        json!(["a", "b", "c"])
    );
    assert_eq!(
        ok_eval(json!(["join", ["quote", ["a", "b"]], "-"]), &e),
        json!("a-b")
    );
    assert_eq!(
        ok_eval(json!(["scontains", "hello", "ell"]), &e),
        json!(true)
    );
    assert_eq!(err_eval(json!(["split", "abc", ""]), &e).code, "EXPR_ARG");
    assert_eq!(
        err_eval(json!(["join", ["quote", [1, 2]], ","]), &e).code,
        "EXPR_TYPE"
    );
    // ASCII-only: ß untouched
    assert_eq!(ok_eval(json!(["upper", "ß"]), &e), json!("ß"));
    // \uFEFF is NOT trimmed (ASCII whitespace set only)
    assert_eq!(
        ok_eval(json!(["trim", "\u{feff}x\u{feff}"]), &e),
        json!("\u{feff}x\u{feff}")
    );
}

// ------------------------------------------------------------- predicates ---

#[test]
fn predicates() {
    let e = Map::new();
    assert_eq!(ok_eval(json!(["isText", "x"]), &e), json!(true));
    assert_eq!(ok_eval(json!(["isNum", 1]), &e), json!(true));
    assert_eq!(ok_eval(json!(["isBool", true]), &e), json!(true));
    assert_eq!(ok_eval(json!(["isList", ["quote", []]]), &e), json!(true));
    assert_eq!(ok_eval(json!(["isMap", {"a": 1}]), &e), json!(true));
    assert_eq!(ok_eval(json!(["isNull", null]), &e), json!(true));
    assert_eq!(ok_eval(json!(["isMap", ["quote", []]]), &e), json!(false));
    assert_eq!(ok_eval(json!(["isNum", "1"]), &e), json!(false));
}

// ----------------------------------------------------------------- errors ---

#[test]
fn static_errors() {
    // unknown op, even in a dead branch
    assert_eq!(
        check_program(&json!(["if", true, 1, ["bogus", 2]]), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_OP")
    );
    // arity
    assert_eq!(
        check_program(&json!(["add"]), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_ARITY")
    );
    assert_eq!(
        check_program(&json!(["if", true, 1]), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_ARITY")
    );
    // non-string head
    assert_eq!(
        check_program(&json!([[1, 2]]), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_PARSE")
    );
    // bad binder name
    assert_eq!(
        check_program(&json!(["let", "9x", 1, 0]), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_PARSE")
    );
    assert_eq!(
        check_program(&json!(["let", ["quote", "x"], 1, 0]), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_PARSE")
    );
}

#[test]
fn bounds() {
    // depth
    let mut deep = json!(0);
    for _ in 0..20 {
        deep = json!(["neg", deep]);
    }
    assert_eq!(
        check_program(&deep, &names(&[])).err().map(|e| e.code),
        Some("EXPR_BOUNDS")
    );
    // nodes
    let wide: Vec<Value> = (0..600).map(|i| json!(i)).collect();
    let mut big = vec![json!("list")];
    big.extend(wide);
    assert_eq!(
        check_program(&Value::Array(big), &names(&[]))
            .err()
            .map(|e| e.code),
        Some("EXPR_BOUNDS")
    );
}

#[test]
fn fuel_accounting() {
    let e = Map::new();
    // scalar costs 1
    let (v, f) = run(&json!(1), &e, 100).unwrap();
    assert_eq!((v, f), (json!(1), 1));
    // deterministic: same program+env same burn
    let p = json!(["add", 1, 2, 3]);
    assert_eq!(run(&p, &e, 100).unwrap().1, run(&p, &e, 100).unwrap().1);
    // exhaustion halts deterministically
    let big = json!([
        "map",
        ["quote", (0..50).collect::<Vec<i32>>()],
        "x",
        ["mul", ["get", "x"], ["get", "x"]]
    ]);
    let Err((err, _)) = run(&big, &e, 20) else {
        panic!("expected fuel exhaustion")
    };
    assert_eq!(err.code, "EXPR_FUEL");
}

// ------------------------------------------------------------ real world ---

#[test]
fn ticket_classifier() {
    let env = env(&[(
        "ticket",
        json!("I was charged twice for the same subscription renewal"),
    )]);
    let program = json!([
        "if",
        ["scontains", ["get", "ticket"], "twice"],
        "billing",
        [
            "if",
            ["scontains", ["get", "ticket"], "password"],
            "account",
            "other"
        ]
    ]);
    assert_eq!(ok_eval(program, &env), json!("billing"));
}

#[test]
fn fold_sum_of_charges() {
    let env = env(&[("charges", json!([{"amt": 10}, {"amt": 25}, {"amt": 7}]))]);
    let program = json!([
        "fold",
        ["get", "charges"],
        0,
        "acc",
        "c",
        ["add", ["get", "acc"], ["get", "c", "amt"]]
    ]);
    assert_eq!(ok_eval(program, &env), json!(42));
}

#[test]
fn eval_json_boundary() {
    let out = eval_json(br#"{"program":["add",1,2],"env":{},"fuel":100}"#);
    assert_eq!(out, r#"{"fuel":4,"ok":true,"value":3}"#);
    let out = eval_json(br#"{"program":["div",1,0]}"#);
    assert_eq!(
        out,
        r#"{"err":{"code":"EXPR_DIV_ZERO","op":"div"},"fuel":4,"ok":false}"#
    );
    let out = eval_json(br#"{"program":["get","x"],"env":{"x":9}}"#);
    assert_eq!(out, r#"{"fuel":4,"ok":true,"value":9}"#);
    // eval_json checks get names against env keys — "y" unbound
    let out = eval_json(br#"{"program":["get","y"],"env":{"x":9}}"#);
    assert_eq!(
        out,
        r#"{"err":{"code":"EXPR_PATH","op":"get","what":"unbound name \"y\""},"fuel":0,"ok":false}"#
    );
}

#[test]
fn check_json_boundary() {
    let out = check_json(br#"{"program":["get","y"],"names":["x"]}"#);
    assert_eq!(
        out,
        r#"{"err":{"code":"EXPR_PATH","op":"get","what":"unbound name \"y\""},"ok":false}"#
    );
    let out = check_json(br#"{"program":["add",1,["get","x"]],"names":["x"]}"#);
    assert_eq!(out, r#"{"ok":true}"#);
}
