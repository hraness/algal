//! Shared `algal.expr.v1` consumers: a bounded program in a versioned
//! envelope evaluated over a consumer-specific environment — scorers are
//! pass predicates as data (foundry fitness, bench claims), axes are
//! Pareto criteria as data (bench dominance). A thrown or wrongly-typed
//! program is a config bug and fails with the consumer's error code,
//! never a silent failure. Port of the consumer helpers in src/expr.ts.

use serde_json::{Map, Value};
use std::collections::BTreeSet;

use crate::{Error, Result, canonical::canonical, contract::keys};

pub(crate) const MAX_EXPR_FUEL: u64 = 100_000;

/// Static contract for an expression envelope: exact keys and the expr
/// contract name. The caller applies the consumer-specific name check.
pub(crate) fn check_envelope(envelope: &Value, what: &str) -> Result<()> {
    keys(envelope, &["contract", "program"])?;
    if envelope["contract"] != "algal.expr.v1" {
        return Err(Error::invalid(format!(
            "{what}.contract must be algal.expr.v1"
        )));
    }
    Ok(())
}

/// Static check of an axis program against the caller's visible names.
/// Any expr error is AXIS_INVALID.
pub(crate) fn check_axis_program(
    program: &Value,
    names: &BTreeSet<String>,
    label: &str,
) -> Result<()> {
    algal_expr::check_program(program, names).map_err(|e| {
        Error::new(
            "AXIS_INVALID",
            format!("{label} {}", canonical(&e.to_json()).unwrap_or_default()),
        )
    })
}

/// Run an axis program against a system's aggregate record. The result
/// must be a finite number; anything else is AXIS_INVALID.
pub(crate) fn eval_axis(program: &Value, env: &Map<String, Value>) -> Result<f64> {
    match algal_expr::run(program, env, MAX_EXPR_FUEL) {
        Ok((value, _)) => value.as_f64().filter(|n| n.is_finite()).ok_or_else(|| {
            Error::new(
                "AXIS_INVALID",
                format!(
                    "axis must produce a finite number, got {}",
                    canonical(&value).unwrap_or_default()
                ),
            )
        }),
        Err((e, _)) => Err(Error::new(
            "AXIS_INVALID",
            format!("axis {}", canonical(&e.to_json())?),
        )),
    }
}

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
