use crate::{
    Error, Result,
    canonical::{canonical, digest},
    context,
    contract::{Signature, id, list, object, ports, text},
    memory,
};
use serde_json::{Value, json};
use std::collections::BTreeSet;

pub fn signature(name: &str) -> Result<Signature> {
    let (inputs, outputs, cost) = match name {
        "echo.v1" => (json!({"value":"json"}), json!({"value":"json"}), 10),
        "coalesce.v1" => (
            json!({"a":{"type":"json","optional":true},"b":{"type":"json","optional":true},"c":{"type":"json","optional":true}}),
            json!({"value":"json"}),
            10,
        ),
        "format.v1" => (
            json!({"prefix":"text","value":"json"}),
            json!({"value":"text"}),
            10,
        ),
        "tag.v1" => (
            json!({"tag":"text","value":"json"}),
            json!({"value":"text"}),
            10,
        ),
        "pick.v1" => (
            json!({"record":"json","field":"text"}),
            json!({"value":"json"}),
            10,
        ),
        "join.v1" => (
            json!({"items":{"type":"text","many":true},"sep":{"type":"text","optional":true}}),
            json!({"value":"text"}),
            10,
        ),
        "assert.v1" => (
            json!({"value":"json","expect":"json"}),
            json!({"value":"json"}),
            10,
        ),
        "inc.v1" | "double.v1" | "not.v1" => (json!({"value":"json"}), json!({"value":"json"}), 5),
        "uppercase.v1" => (json!({"value":"text"}), json!({"value":"text"}), 5),
        "label.v1" => (
            json!({"value":"text"}),
            json!({"value":{"type":"choice","labels":["a","b"]}}),
            10,
        ),
        "push.v1" => (
            json!({"list":"json","item":"json"}),
            json!({"value":"json"}),
            5,
        ),
        "memory.query.v1" => (
            json!({"snapshot":"json","program":"json"}),
            json!({"result":"json"}),
            10,
        ),
        "context.compact.v1" => (
            json!({"source":"json","policy":"json"}),
            json!({"view":"json","archive":"json"}),
            10,
        ),
        "manifest.compile.v1" => (json!({"plan":"json"}), json!({"manifest":"json"}), 50),
        _ => return Err(Error::new("FN_UNKNOWN", format!("unknown fn {name}"))),
    };
    Ok(Signature {
        inputs: ports(&inputs, false, false)?,
        outputs: ports(&outputs, false, false)?,
        cost,
    })
}

pub fn invoke(name: &str, inputs: &Value) -> Result<(Value, usize)> {
    let value = &inputs["value"];
    let rendered = || -> Result<String> {
        match value.as_str() {
            Some(s) => Ok(s.to_owned()),
            None => canonical(value),
        }
    };
    let output = match name {
        "echo.v1" => json!({"value":value}),
        "coalesce.v1" => {
            let selected = ["a", "b", "c"]
                .iter()
                .filter_map(|k| inputs.get(k))
                .find(|v| !v.is_null())
                .ok_or_else(|| Error::new("FN_FAILED", "coalesce.v1: all inputs empty"))?;
            json!({"value":selected})
        }
        "format.v1" => {
            json!({"value":format!("{}{}", inputs["prefix"].as_str().unwrap_or(""), rendered()?)})
        }
        "tag.v1" => {
            json!({"value":format!("{}: {}", inputs["tag"].as_str().unwrap_or("").to_uppercase(), rendered()?)})
        }
        "pick.v1" => {
            let record = object(&inputs["record"])
                .map_err(|_| Error::new("FN_FAILED", "pick.v1: record must be an object"))?;
            let field = inputs["field"]
                .as_str()
                .ok_or_else(|| Error::new("FN_FAILED", "pick.v1: field must be text"))?;
            json!({"value":record.get(field).unwrap_or(&Value::Null)})
        }
        "join.v1" => {
            let items = inputs["items"]
                .as_array()
                .ok_or_else(|| Error::new("FN_FAILED", "join.v1 requires array"))?;
            let parts: Vec<_> = items.iter().map(|v| v.as_str().unwrap_or("")).collect();
            json!({"value":parts.join(inputs["sep"].as_str().unwrap_or("\n"))})
        }
        "assert.v1" => {
            if canonical(value)? != canonical(&inputs["expect"])? {
                let truncate = |s: String| s.chars().take(200).collect::<String>();
                return Err(Error::new(
                    "FN_FAILED",
                    format!(
                        "assert.v1: value {} != expect {}",
                        truncate(canonical(value)?),
                        truncate(canonical(&inputs["expect"])?)
                    ),
                ));
            }
            json!({"value":value})
        }
        "inc.v1" => {
            let n = value
                .as_f64()
                .ok_or_else(|| Error::new("FN_FAILED", "inc.v1: value must be a finite number"))?;
            json!({"value":n+1.0})
        }
        "double.v1" => {
            let number = value
                .as_f64()
                .ok_or_else(|| Error::new("FN_FAILED", "double.v1 requires a number"))?
                * 2.0;
            if !number.is_finite() {
                return Err(Error::new("FN_FAILED", "double.v1 overflow"));
            }
            json!({"value":number})
        }
        "not.v1" => {
            json!({"value":!value.as_bool().ok_or_else(|| Error::new("FN_FAILED", "not.v1 requires a boolean"))?})
        }
        "uppercase.v1" => {
            json!({"value":value.as_str().ok_or_else(|| Error::new("FN_FAILED", "uppercase.v1 requires text"))?.to_uppercase()})
        }
        "label.v1" => json!({"value":if value == "a" { "a" } else { "b" }}),
        "push.v1" => {
            let mut list = inputs["list"]
                .as_array()
                .cloned()
                .ok_or_else(|| Error::new("FN_FAILED", "push.v1: list must be an array"))?;
            list.push(inputs["item"].clone());
            json!({"value":list})
        }
        "memory.query.v1" => {
            let result = memory::query(&inputs["snapshot"], &inputs["program"])?;
            let work = result["work"].as_u64().unwrap() as usize;
            return Ok((json!({"result":result}), work));
        }
        "context.compact.v1" => {
            json!({"view":context::compact(&inputs["source"], &inputs["policy"] )?,"archive":inputs["source"]})
        }
        "manifest.compile.v1" => {
            json!({"manifest":compile_plan(&inputs["plan"])?})
        }
        _ => return Err(Error::new("FN_UNKNOWN", "function is not registered")),
    };
    Ok((output, 0))
}

/// Compiles a pipeline plan into a `morphogen.organism.v1` manifest. A plan is
/// a JSON array of 1..4 step strings; each step is `fn:NAME` optionally
/// followed by `;PORT=VALUE` bindings (raw text for text ports, JSON-encoded
/// for other ports) or `const:JSON_LITERAL`. The flat grammar is deliberately
/// minimal: the model chooses semantics while this host function owns manifest
/// syntax, port typing, and graph structure — the smallest sufficient decision
/// a small or on-device model has to make. Annotations that cannot affect the
/// compiled program are ignored (bindings to unknown or chain ports, bare
/// non-fn tokens); malformed intent — unknown fn names, missing `=`, invalid
/// literals — still rejects the proposal.
pub(crate) fn compile_plan(plan: &Value) -> Result<Value> {
    let steps = list(plan, 4)?;
    if steps.is_empty() {
        return Err(Error::invalid("plan requires 1..4 steps"));
    }
    let mut cells = vec![json!({"id":"src","kind":"input","outputs":{"value":"json"}})];
    let mut edges: Vec<Value> = Vec::new();
    let mut prev = ("src".to_owned(), "value".to_owned(), "json".to_owned());
    let mut src_type: Option<String> = None;
    let mut names: Vec<String> = Vec::new();
    for (index, step) in steps.iter().enumerate() {
        let step = text(step, 4096)?;
        let cell_id = format!("s{index}");
        let mut parts = step.split(';');
        let head = parts.next().unwrap_or_default();
        if let Some(encoded) = head.strip_prefix("const:") {
            if parts.next().is_some() {
                return Err(Error::invalid("const steps cannot carry bindings"));
            }
            let literal: Value = serde_json::from_str(encoded)
                .map_err(|_| Error::invalid("const step requires a JSON-encoded literal"))?;
            if canonical(&literal)?.len() > 4096 {
                return Err(Error::limit("const literal bytes"));
            }
            let ptype = if literal.is_string() { "text" } else { "json" };
            cells.push(json!({"id":cell_id,"kind":"const","outputs":{"value":{"type":ptype,"value":literal}}}));
            prev = (cell_id, "value".into(), ptype.into());
            names.push("const".into());
            continue;
        }
        let fname = head.strip_prefix("fn:").unwrap_or(head);
        let sig = match signature(fname) {
            Ok(sig) => sig,
            Err(_) if !head.contains(':') && !head.contains('=') && !head.starts_with("fn") => {
                continue;
            }
            Err(_) => {
                return Err(Error::invalid(format!(
                    "step {index} requires fn:, const:, or a host fn name"
                )));
            }
        };
        let mut raw_bindings: Vec<(String, String)> = Vec::new();
        for part in parts {
            let (port, encoded) = part
                .split_once('=')
                .ok_or_else(|| Error::invalid("binding requires PORT=VALUE"))?;
            id(&json!(port))?;
            if encoded.len() > 4096 {
                return Err(Error::limit("binding literal bytes"));
            }
            if !sig.inputs.contains_key(port) {
                continue;
            }
            raw_bindings.push((port.to_owned(), encoded.to_owned()));
        }
        let bound: BTreeSet<&str> = raw_bindings.iter().map(|(p, _)| p.as_str()).collect();
        let chain = if sig.inputs.contains_key("value") {
            "value".to_owned()
        } else {
            let unbound: Vec<&String> = sig
                .inputs
                .iter()
                .filter(|(port, spec)| !bound.contains(port.as_str()) && spec["optional"] != true)
                .map(|(port, _)| port)
                .collect();
            match unbound.as_slice() {
                [only] => (*only).clone(),
                _ => return Err(Error::invalid(format!("{fname} has no single chain port"))),
            }
        };
        for (port, encoded) in raw_bindings {
            if port == chain {
                continue;
            }
            let spec = sig
                .inputs
                .get(&port)
                .ok_or_else(|| Error::invalid(format!("{fname} has no input port {port}")))?;
            if spec["many"] == true || spec["type"] == "ref" {
                return Err(Error::invalid(format!("cannot bind {fname}.{port}")));
            }
            let (literal, ctype) = match spec["type"].as_str() {
                Some("text") => (json!(encoded), json!("text")),
                Some("choice") => {
                    let labels = spec["labels"].as_array().cloned().unwrap_or_default();
                    if !labels.iter().any(|l| l.as_str() == Some(encoded.as_str())) {
                        return Err(Error::invalid(format!(
                            "{encoded} is not a label of {fname}.{port}"
                        )));
                    }
                    (json!(encoded), json!({"type":"choice","labels":labels}))
                }
                _ => (
                    serde_json::from_str(&encoded).map_err(|_| {
                        Error::invalid(format!("{port}= must be JSON-encoded for {fname}"))
                    })?,
                    json!("json"),
                ),
            };
            let const_id = format!("{cell_id}-{port}");
            cells.push(json!({"id":const_id,"kind":"const","outputs":{port.clone():{"type":ctype,"value":literal}}}));
            edges.push(
                json!({"from":{"cell":const_id,"port":port},"to":{"cell":cell_id,"port":port}}),
            );
        }
        let spec = &sig.inputs[&chain];
        if spec["many"] == true || spec["type"] == "ref" {
            return Err(Error::invalid(format!("cannot chain into {fname}.{chain}")));
        }
        let to_type = spec["type"].as_str().unwrap_or("json");
        if prev.0 == "src" {
            src_type = Some(to_type.to_owned());
        } else {
            let compatible =
                to_type == "json" || prev.2 == to_type || (prev.2 == "choice" && to_type == "text");
            if !compatible {
                return Err(Error::invalid(format!(
                    "step {index}: {fname}.{chain} expects {to_type}, pipeline provides {}",
                    prev.2
                )));
            }
        }
        edges
            .push(json!({"from":{"cell":prev.0,"port":prev.1},"to":{"cell":cell_id,"port":chain}}));
        cells.push(json!({"id":cell_id,"kind":"fn","fn":fname}));
        let (out_port, out_spec) = sig
            .outputs
            .iter()
            .next()
            .ok_or_else(|| Error::invalid(format!("{fname} has no outputs")))?;
        prev = (
            cell_id,
            out_port.clone(),
            out_spec["type"].as_str().unwrap_or("json").to_owned(),
        );
        names.push(fname.to_owned());
    }
    cells[0]["outputs"]["value"] = json!(src_type.unwrap_or_else(|| "json".into()));
    let key = format!("organism:plan-{}", &digest(plan)?[7..23]);
    let name = format!("Compiled {}", names.join("->"));
    Ok(json!({
        "contract":"morphogen.organism.v1",
        "key":key,
        "name":name,
        "budgets":{"maxAgentCalls":0,"maxSteps":32,"maxWork":10000},
        "cells":cells,
        "edges":edges,
        "interface":{
            "inputs":{"value":{"cell":"src","port":"value"}},
            "outputs":{"out":{"cell":prev.0,"port":prev.1}}
        }
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::Manifest;
    use crate::runtime;

    fn compiled(plan: &Value) -> Value {
        compile_plan(plan).unwrap()
    }

    #[test]
    fn plans_compile_to_valid_manifests() {
        for plan in [
            json!(["fn:double.v1"]),
            json!(["fn:format.v1;prefix=Hello, "]),
            json!(["const:\"fixed\""]),
            json!(["fn:not.v1", "fn:echo.v1"]),
        ] {
            Manifest::parse(&compiled(&plan)).unwrap();
        }
    }

    #[tokio::test]
    async fn compiled_plans_execute_the_pipeline() {
        let manifest = Manifest::parse(&compiled(&json!(["fn:format.v1;prefix=Hello, "]))).unwrap();
        let mut store = crate::store::Store::default();
        let mut host = crate::effects::Host::default();
        let receipt = runtime::run(
            manifest,
            json!({"src":{"value":"Ada"}}),
            &mut store,
            &mut host,
            &crate::graph::Transports::new(),
            None,
        )
        .await
        .unwrap();
        assert_eq!(
            runtime::outputs(
                &Manifest::parse(&compiled(&json!(["fn:format.v1;prefix=Hello, "]))).unwrap(),
                &receipt
            )
            .unwrap()["out"],
            "Hello, Ada"
        );
    }

    #[test]
    fn tolerant_of_noise_but_strict_on_intent() {
        // Bare noise tokens and unknown/chain-port bindings are dropped.
        assert!(compile_plan(&json!(["fn:uppercase.v1", "Ada"])).is_ok());
        assert!(compile_plan(&json!(["fn:uppercase.v1;input=x"])).is_ok());
        assert!(compile_plan(&json!(["fn:uppercase.v1;value=hi"])).is_ok());
        // Malformed intent still rejects the proposal.
        assert!(compile_plan(&json!(["fn:bogus.v9"])).is_err());
        assert!(compile_plan(&json!(["fn:uppercase.v1;broken"])).is_err());
        assert!(compile_plan(&json!(["const:not json"])).is_err());
        assert!(compile_plan(&json!([])).is_err());
        assert!(
            compile_plan(&json!([
                "fn:double.v1",
                "fn:double.v1",
                "fn:double.v1",
                "fn:double.v1",
                "fn:double.v1"
            ]))
            .is_err()
        );
    }

    #[test]
    fn type_checked_chains_reject_incompatible_pipelines() {
        // double outputs json; uppercase requires text: json -> text fails.
        assert!(compile_plan(&json!(["fn:double.v1", "fn:uppercase.v1"])).is_err());
        // text -> json is a widening and compiles.
        assert!(compile_plan(&json!(["fn:uppercase.v1", "fn:double.v1"])).is_ok());
    }
}
