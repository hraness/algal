//! Shared `algal.expr.v1` scorer: a bounded program evaluated per case
//! over {"args","expect","outputs"} — the pass predicate as data, used by
//! foundry fitness and bench claims alike. A thrown or non-boolean
//! scorer is a config bug and fails SCORER_INVALID, never a silent case
//! failure. Port of the scorer helpers in src/expr.ts.

use serde_json::{Map, Value};
use std::collections::BTreeSet;

use crate::{Error, Result, canonical::canonical, contract::keys};

pub(crate) const MAX_EXPR_FUEL: u64 = 100_000;

/// Static contract for a scorer object: exact keys, the expr contract
/// name, and a program whose visible names are args/expect/outputs.
pub(crate) fn check_scorer(scorer: &Value) -> Result<()> {
    keys(scorer, &["contract", "program"])?;
    if scorer["contract"] != "algal.expr.v1" {
        return Err(Error::invalid("scorer.contract must be algal.expr.v1"));
    }
    let names: BTreeSet<String> = ["args", "expect", "outputs"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    algal_expr::check_program(&scorer["program"], &names).map_err(|e| {
        Error::new(
            "SCORER_INVALID",
            format!("scorer {}", canonical(&e.to_json()).unwrap_or_default()),
        )
    })
}

/// Run a scorer program against one case. The result must be a strict
/// boolean; anything else is SCORER_INVALID.
pub(crate) fn eval_scorer(
    program: &Value,
    args: &Value,
    expect: &Value,
    outputs: &Value,
) -> Result<bool> {
    let mut env = Map::new();
    env.insert("args".to_owned(), args.clone());
    env.insert("expect".to_owned(), expect.clone());
    env.insert("outputs".to_owned(), outputs.clone());
    match algal_expr::run(program, &env, MAX_EXPR_FUEL) {
        Ok((Value::Bool(b), _)) => Ok(b),
        Ok((value, _)) => Err(Error::new(
            "SCORER_INVALID",
            format!("scorer must produce boolean, got {}", canonical(&value)?),
        )),
        Err((e, _)) => Err(Error::new(
            "SCORER_INVALID",
            format!("scorer {}", canonical(&e.to_json())?),
        )),
    }
}
