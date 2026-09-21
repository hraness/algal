use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    contract::{id, keys, list, object, text},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Fact {
    pub relation: String,
    pub tuple: Vec<Value>,
    pub sources: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Literal {
    pub relation: String,
    pub terms: Vec<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rule {
    pub id: String,
    pub head: Literal,
    pub body: Vec<Literal>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields, default)]
pub struct Limits {
    pub max_work: usize,
    pub max_rounds: usize,
    pub max_derived: usize,
    pub max_bindings: usize,
    pub max_rows: usize,
    pub max_output_bytes: usize,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            max_work: 250_000,
            max_rounds: 32,
            max_derived: 4096,
            max_bindings: 4096,
            max_rows: 256,
            max_output_bytes: 262_144,
        }
    }
}

#[derive(Clone)]
struct Tuple {
    relation: String,
    values: Vec<Value>,
    proof: String,
}

#[derive(Clone, Default)]
struct Binding {
    values: BTreeMap<String, Value>,
    premises: Vec<String>,
}

fn variable(term: &Value) -> Option<&str> {
    term.get("var").and_then(Value::as_str)
}

fn atom(value: &Value) -> Result<()> {
    if value.is_array() || value.is_object() {
        return Err(Error::invalid("memory atoms must be JSON primitives"));
    }
    if canonical(value)?.len() > 1024 {
        return Err(Error::limit("memory atom bytes"));
    }
    Ok(())
}

fn literal(literal: &Literal, arities: &mut BTreeMap<String, usize>) -> Result<BTreeSet<String>> {
    id(&json!(literal.relation))?;
    if literal.terms.len() > 8 {
        return Err(Error::limit("relation arity"));
    }
    if let Some(arity) = arities.insert(literal.relation.clone(), literal.terms.len()) {
        if arity != literal.terms.len() {
            return Err(Error::invalid("inconsistent relation arity"));
        }
    }
    let mut vars = BTreeSet::new();
    for term in &literal.terms {
        if let Some(name) = variable(term) {
            keys(term, &["var"])?;
            id(&json!(name))?;
            vars.insert(name.to_owned());
        } else {
            atom(term)?;
        }
    }
    Ok(vars)
}

fn charge(work: &mut usize, limits: &Limits) -> Result<()> {
    *work += 1;
    if *work > limits.max_work {
        return Err(Error::limit("Datalog work exhausted; no complete answer"));
    }
    Ok(())
}

fn join(
    literals: &[Literal],
    tuples: &BTreeMap<String, Tuple>,
    work: &mut usize,
    limits: &Limits,
) -> Result<Vec<Binding>> {
    // Group tuples by relation once, so a literal only scans tuples it could
    // possibly match. Previously every literal scanned the whole set and
    // charged a work unit per tuple before testing the relation, so a fact no
    // rule mentions cost real budget on every literal of every round. Results
    // are unchanged: the map is keyed by canonical [relation, values], so
    // same-relation tuples are already contiguous and ordered, and collecting
    // them preserves that order exactly. Only `work` counts fall.
    let mut by_relation: BTreeMap<&str, Vec<&Tuple>> = BTreeMap::new();
    for tuple in tuples.values() {
        by_relation
            .entry(tuple.relation.as_str())
            .or_default()
            .push(tuple);
    }
    let empty: Vec<&Tuple> = Vec::new();
    let mut bindings = vec![Binding::default()];
    for literal in literals {
        let candidates = by_relation.get(literal.relation.as_str()).unwrap_or(&empty);

        // Hash join. A nested loop re-scanned every candidate for every
        // binding, so a two-literal rule cost |bindings| * |candidates| and
        // work grew as the product of the two relations' sizes. Instead, index
        // the candidates once on the positions this literal already has values
        // for, then probe that index per binding: |candidates| + |matches|
        // rather than |bindings| * |candidates|.
        //
        // The bound-variable set is uniform across `bindings` at this step,
        // because every binding here came through the same earlier literals, so
        // one probe shape serves them all. The index only narrows the scan; the
        // term loop below still checks every position, which keeps repeated
        // variables inside one literal (`depends(x, x)`) correct.
        //
        // Ordering is preserved, so results are unchanged. Buckets are filled
        // by walking `candidates` in order, so each bucket holds its members in
        // scan order, and bindings are still consumed in order. Only `work`
        // falls.
        let probe: Vec<(usize, &str)> = match bindings.first() {
            Some(first) => literal
                .terms
                .iter()
                .enumerate()
                .filter_map(|(at, term)| {
                    variable(term)
                        .filter(|name| first.values.contains_key(*name))
                        .map(|name| (at, name))
                })
                .collect(),
            None => Vec::new(),
        };

        let key_of = |values: &dyn Fn(usize, &str) -> Option<Value>| -> Result<String> {
            let mut parts = Vec::with_capacity(probe.len());
            for (at, name) in &probe {
                parts.push(values(*at, name).unwrap_or(Value::Null));
            }
            canonical(&json!(parts))
        };

        let mut index: BTreeMap<String, Vec<&Tuple>> = BTreeMap::new();
        if !probe.is_empty() {
            for tuple in candidates {
                charge(work, limits)?;
                let key = key_of(&|at, _| tuple.values.get(at).cloned())?;
                index.entry(key).or_default().push(tuple);
            }
        }

        let mut next = Vec::new();
        for binding in &bindings {
            let bucket = if probe.is_empty() {
                candidates
            } else {
                let key = key_of(&|_, name| binding.values.get(name).cloned())?;
                index.get(&key).unwrap_or(&empty)
            };
            for tuple in bucket {
                charge(work, limits)?;
                let mut candidate = binding.clone();
                let mut matched = true;
                for (term, value) in literal.terms.iter().zip(&tuple.values) {
                    if let Some(name) = variable(term) {
                        if let Some(bound) = candidate.values.get(name) {
                            if bound != value {
                                matched = false;
                                break;
                            }
                        } else {
                            candidate.values.insert(name.to_owned(), value.clone());
                        }
                    } else if term != value {
                        matched = false;
                        break;
                    }
                }
                if matched {
                    if next.len() >= limits.max_bindings {
                        return Err(Error::limit("Datalog join bindings"));
                    }
                    candidate.premises.push(tuple.proof.clone());
                    next.push(candidate);
                }
            }
        }
        bindings = next;
    }
    Ok(bindings)
}

fn instantiate(literal: &Literal, binding: &Binding) -> Result<Vec<Value>> {
    literal
        .terms
        .iter()
        .map(|term| match variable(term) {
            Some(name) => binding
                .values
                .get(name)
                .cloned()
                .ok_or_else(|| Error::invalid("unbound head variable")),
            None => Ok(term.clone()),
        })
        .collect()
}

pub fn query(snapshot: &Value, program: &Value) -> Result<Value> {
    if canonical(snapshot)?.len() > 262_144 || canonical(program)?.len() > 65_536 {
        return Err(Error::limit("memory/query input bytes"));
    }
    keys(snapshot, &["contract", "facts"])?;
    keys(program, &["contract", "rules", "query", "limits"])?;
    if snapshot["contract"] != "algal.memory.v1" || program["contract"] != "algal.query.v1" {
        return Err(Error::invalid("memory/query contract"));
    }
    let facts: Vec<Fact> = serde_json::from_value(json!(list(&snapshot["facts"], 2048)?))?;
    let mut rules: Vec<Rule> = serde_json::from_value(json!(list(&program["rules"], 64)?))?;
    let wanted: Literal = serde_json::from_value(program["query"].clone())?;
    let limits: Limits =
        serde_json::from_value(program.get("limits").cloned().unwrap_or(json!({})))?;
    let ceilings = serde_json::to_value(Limits::default())?;
    for (name, value) in object(&serde_json::to_value(&limits)?)? {
        let n = value.as_u64().unwrap_or(0);
        if n == 0 || n > ceilings[name].as_u64().unwrap() {
            return Err(Error::invalid(format!("invalid memory limit {name}")));
        }
    }
    rules.sort_by(|a, b| a.id.cmp(&b.id));
    let mut ids = BTreeSet::new();
    let mut arities = BTreeMap::new();
    for rule in &rules {
        id(&json!(rule.id))?;
        if !ids.insert(&rule.id) || rule.body.is_empty() || rule.body.len() > 8 {
            return Err(Error::invalid("rule id/body bound"));
        }
        let head = literal(&rule.head, &mut arities)?;
        let mut bound = BTreeSet::new();
        for body in &rule.body {
            bound.extend(literal(body, &mut arities)?);
        }
        if !head.is_subset(&bound) {
            return Err(Error::invalid(
                "unsafe rule: every head variable must occur in the body",
            ));
        }
    }
    literal(&wanted, &mut arities)?;
    let mut tuples = BTreeMap::new();
    let mut proofs = BTreeMap::new();
    let mut ordered_facts = Vec::new();
    for fact in facts {
        literal(
            &Literal {
                relation: fact.relation.clone(),
                terms: fact.tuple.clone(),
            },
            &mut arities,
        )?;
        for value in &fact.tuple {
            atom(value)?;
        }
        if fact.sources.is_empty() || fact.sources.len() > 16 {
            return Err(Error::invalid("fact requires 1..16 source digests"));
        }
        for source in &fact.sources {
            check_digest(source)?;
        }
        let fact_json = serde_json::to_value(&fact)?;
        ordered_facts.push((digest(&fact_json)?, fact));
    }
    ordered_facts.sort_by(|a, b| a.0.cmp(&b.0));
    for (identity, fact) in ordered_facts {
        let key = canonical(&json!([fact.relation, fact.tuple]))?;
        if tuples.contains_key(&key) {
            continue;
        }
        let proof = json!({"kind":"fact", "fact":identity, "sources":fact.sources});
        let proof_id = digest(&proof)?;
        proofs.insert(proof_id.clone(), proof);
        tuples.insert(
            key,
            Tuple {
                relation: fact.relation,
                values: fact.tuple,
                proof: proof_id,
            },
        );
    }
    let base = tuples.len();
    let mut work = 0;
    let mut rounds = 0;
    loop {
        if rounds >= limits.max_rounds {
            return Err(Error::limit("Datalog rounds exhausted; no complete answer"));
        }
        rounds += 1;
        let mut additions = BTreeMap::new();
        for rule in &rules {
            let rule_digest = digest(&serde_json::to_value(rule)?)?;
            for binding in join(&rule.body, &tuples, &mut work, &limits)? {
                charge(&mut work, &limits)?;
                let values = instantiate(&rule.head, &binding)?;
                let key = canonical(&json!([rule.head.relation, values]))?;
                if tuples.contains_key(&key) || additions.contains_key(&key) {
                    continue;
                }
                if tuples.len() - base + additions.len() >= limits.max_derived {
                    return Err(Error::limit("Datalog derived tuples"));
                }
                let proof = json!({"kind":"rule", "rule":rule_digest, "premises":binding.premises});
                let proof_id = digest(&proof)?;
                proofs.insert(proof_id.clone(), proof);
                additions.insert(
                    key,
                    Tuple {
                        relation: rule.head.relation.clone(),
                        values,
                        proof: proof_id,
                    },
                );
            }
        }
        if additions.is_empty() {
            break;
        }
        tuples.extend(additions);
    }
    let mut rows = BTreeMap::new();
    for binding in join(std::slice::from_ref(&wanted), &tuples, &mut work, &limits)? {
        let values = instantiate(&wanted, &binding)?;
        rows.entry(canonical(&json!(values))?)
            .or_insert(json!({"tuple":values,"proof":binding.premises[0]}));
        if rows.len() > limits.max_rows {
            return Err(Error::limit(
                "Datalog result rows; no truncated answer returned",
            ));
        }
    }
    let mut needed = BTreeSet::new();
    let mut pending: Vec<_> = rows
        .values()
        .map(|v| v["proof"].as_str().unwrap().to_owned())
        .collect();
    while let Some(p) = pending.pop() {
        if !needed.insert(p.clone()) {
            continue;
        }
        if let Some(premises) = proofs[&p]["premises"].as_array() {
            pending.extend(premises.iter().map(|p| p.as_str().unwrap().to_owned()));
        }
    }
    proofs.retain(|key, _| needed.contains(key));
    let result = json!({
        "contract":"algal.query-result.v1", "snapshot":digest(snapshot)?, "program":digest(program)?,
        "complete":true, "witnessPolicy":"first-canonical-derivation", "rows":rows.into_values().collect::<Vec<_>>(),
        "proofs":proofs, "work":work, "rounds":rounds, "baseFacts":base, "derivedFacts":tuples.len()-base,
    });
    if canonical(&result)?.len() > limits.max_output_bytes {
        return Err(Error::limit("Datalog result bytes"));
    }
    Ok(result)
}

pub fn remember(
    snapshot: &Value,
    relation: &str,
    tuple: Vec<Value>,
    source: &Value,
) -> Result<Value> {
    keys(snapshot, &["contract", "facts"])?;
    if snapshot["contract"] != "algal.memory.v1" {
        return Err(Error::invalid("memory contract"));
    }
    id(&json!(relation))?;
    let mut next = snapshot.clone();
    let facts = next["facts"]
        .as_array_mut()
        .ok_or_else(|| Error::invalid("memory facts"))?;
    let fact = json!({"relation":relation,"tuple":tuple,"sources":[digest(source)?]});
    if !facts.contains(&fact) {
        facts.push(fact);
    }
    let check =
        json!({"contract":"algal.query.v1","rules":[],"query":{"relation":relation,"terms":tuple}});
    query(&next, &check)?;
    Ok(next)
}

pub fn verify(snapshot: &Value, program: &Value, result: &Value) -> Result<bool> {
    Ok(canonical(&query(snapshot, program)?)? == canonical(result)?)
}

pub fn source_id(value: &Value) -> Result<&str> {
    check_digest(text(value, 71)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    pub fn fixture() -> (Value, Value) {
        let source = digest(&json!("observed dependencies")).unwrap();
        let snapshot = json!({"contract":"algal.memory.v1","facts":[
            {"relation":"depends","tuple":["app","parser"],"sources":[source]},
            {"relation":"depends","tuple":["parser","lexer"],"sources":[source]}
        ]});
        let program = json!({"contract":"algal.query.v1","rules":[
            {"id":"direct","head":{"relation":"affects","terms":[{"var":"x"},{"var":"y"}]},"body":[{"relation":"depends","terms":[{"var":"x"},{"var":"y"}]}]},
            {"id":"transitive","head":{"relation":"affects","terms":[{"var":"x"},{"var":"z"}]},"body":[{"relation":"affects","terms":[{"var":"x"},{"var":"y"}]},{"relation":"depends","terms":[{"var":"y"},{"var":"z"}]}]}
        ],"query":{"relation":"affects","terms":["app",{"var":"target"}]}});
        (snapshot, program)
    }

    #[test]
    fn derives_context_with_replayable_witnesses() {
        let (snapshot, program) = fixture();
        let result = query(&snapshot, &program).unwrap();
        assert_eq!(result["rows"].as_array().unwrap().len(), 2);
        assert_eq!(result["rows"][0]["tuple"], json!(["app", "lexer"]));
        assert!(result["proofs"].as_object().unwrap().len() >= 4);
        assert!(verify(&snapshot, &program, &result).unwrap());
        let mut altered = result.clone();
        altered["rows"][0]["tuple"] = json!(["invented"]);
        assert!(!verify(&snapshot, &program, &altered).unwrap());
    }

    #[test]
    fn budgets_and_unsafe_logic_fail_closed() {
        let (snapshot, mut program) = fixture();
        program["limits"] = json!({"maxWork":1});
        assert_eq!(
            query(&snapshot, &program).unwrap_err().code,
            "BUDGET_EXHAUSTED"
        );
        program.as_object_mut().unwrap().remove("limits");
        program["rules"][0]["head"]["terms"][0] = json!({"var":"unbound"});
        assert!(
            query(&snapshot, &program)
                .unwrap_err()
                .message
                .contains("unsafe rule")
        );
        program["rules"][0]["body"][0]["not"] = json!(true);
        assert!(query(&snapshot, &program).is_err());
    }

    #[test]
    fn absent_facts_are_not_invented_and_old_snapshots_stay_unchanged() {
        let snapshot = json!({"contract":"algal.memory.v1","facts":[]});
        let next = remember(
            &snapshot,
            "decision",
            vec![json!("keep-parser")],
            &json!("explicit user decision"),
        )
        .unwrap();
        assert_eq!(snapshot["facts"], json!([]));
        assert_eq!(next["facts"].as_array().unwrap().len(), 1);
        assert_ne!(digest(&snapshot).unwrap(), digest(&next).unwrap());
    }
}
