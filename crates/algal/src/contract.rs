use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};

pub const CONTRACT: &str = "algal.organism.v1";
pub const MAX_VALUE_BYTES: usize = 262_144;
pub type Ports = BTreeMap<String, Value>;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Budgets {
    pub max_steps: usize,
    pub max_agent_calls: usize,
    pub max_work: usize,
    pub max_context_bytes: usize,
    pub max_output_bytes: usize,
    pub max_depth: usize,
}

#[derive(Clone, Debug)]
pub struct Manifest {
    pub value: Value,
    pub cells: Vec<Value>,
    pub edges: Vec<Value>,
    pub budgets: Budgets,
}

#[derive(Clone, Debug, Default)]
pub struct Signature {
    pub inputs: Ports,
    pub outputs: Ports,
    pub cost: usize,
}

pub fn object(value: &Value) -> Result<&Map<String, Value>> {
    value
        .as_object()
        .ok_or_else(|| Error::invalid("expected object"))
}

pub fn text(value: &Value, max: usize) -> Result<&str> {
    let text = value
        .as_str()
        .ok_or_else(|| Error::invalid("expected text"))?;
    if text.encode_utf16().count() > max {
        return Err(Error::invalid("text exceeds bound"));
    }
    Ok(text)
}

pub fn id(value: &Value) -> Result<&str> {
    let s = text(value, 64)?;
    if s.is_empty()
        || !s.as_bytes()[0].is_ascii_lowercase()
        || !s
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
    {
        return Err(Error::invalid("expected lowercase kebab-case id"));
    }
    Ok(s)
}

pub fn keys(value: &Value, allowed: &[&str]) -> Result<()> {
    for key in object(value)?.keys() {
        if !allowed.contains(&key.as_str()) {
            return Err(Error::invalid(format!("unknown key {key}")));
        }
    }
    Ok(())
}

pub fn list(value: &Value, max: usize) -> Result<&Vec<Value>> {
    let list = value
        .as_array()
        .ok_or_else(|| Error::invalid("expected array"))?;
    if list.len() > max {
        return Err(Error::limit("array count"));
    }
    Ok(list)
}

pub fn integer(value: &Value, min: usize, max: usize) -> Result<usize> {
    let value = value
        .as_u64()
        .and_then(|n| usize::try_from(n).ok())
        .ok_or_else(|| Error::invalid("expected non-negative integer"))?;
    if value < min || value > max {
        return Err(Error::invalid("integer out of bounds"));
    }
    Ok(value)
}

fn schema_depth(value: &Value, depth: usize) -> Result<()> {
    if depth > 4 {
        return Err(Error::invalid("schema depth exceeds 4"));
    }
    match value {
        Value::Object(map) => {
            for v in map.values() {
                schema_depth(v, depth + 1)?;
            }
        }
        Value::Array(items) => {
            for v in items {
                schema_depth(v, depth + 1)?;
            }
        }
        _ => (),
    }
    Ok(())
}

fn labels(value: &Value) -> Result<()> {
    let values = list(value, 32)?;
    if values.is_empty() {
        return Err(Error::invalid("empty labels"));
    }
    let mut unique = BTreeSet::new();
    for v in values {
        if !unique.insert(text(v, 64)?) {
            return Err(Error::invalid("duplicate label"));
        }
    }
    Ok(())
}

pub fn ports(value: &Value, producer: bool, constant: bool) -> Result<Ports> {
    let map = object(value)?;
    if map.len() > 32 {
        return Err(Error::limit("port count"));
    }
    let mut result = BTreeMap::new();
    for (name, v) in map {
        id(&json!(name))?;
        let p = if v.is_string() && !constant {
            json!({"type":v})
        } else {
            v.clone()
        };
        keys(
            &p,
            if constant {
                &["type", "optional", "many", "labels", "schema", "value"]
            } else {
                &["type", "optional", "many", "labels", "schema"]
            },
        )?;
        let kind = text(&p["type"], 16)?;
        if !["text", "json", "choice", "ref"].contains(&kind) {
            return Err(Error::invalid("unknown port type"));
        }
        for flag in ["optional", "many"] {
            if p.get(flag).is_some_and(|v| !v.is_boolean()) {
                return Err(Error::invalid("port flag must be boolean"));
            }
        }
        if producer && p["many"] == true {
            return Err(Error::invalid("many is only valid on input ports"));
        }
        if let Some(ls) = p.get("labels") {
            if kind != "choice" {
                return Err(Error::invalid("labels require choice"));
            }
            labels(ls)?;
        }
        if let Some(schema) = p.get("schema") {
            if kind != "json" {
                return Err(Error::invalid("schema requires json"));
            }
            object(schema)?;
            schema_depth(schema, 0)?;
        }
        if constant && p.get("value").is_none() {
            return Err(Error::invalid("const requires value"));
        }
        result.insert(name.clone(), p);
    }
    Ok(result)
}

pub fn output_contract(value: &Value) -> Result<()> {
    match text(&value["kind"], 16)? {
        "text" => keys(value, &["kind"]),
        "json" => {
            keys(value, &["kind", "schema"])?;
            object(&value["schema"])?;
            schema_depth(&value["schema"], 0)?;
            Ok(())
        }
        "choice" => {
            keys(value, &["kind", "labels", "onMiss"])?;
            labels(&value["labels"])?;
            if let Some(miss) = value.get("onMiss") {
                if !value["labels"].as_array().unwrap().contains(miss) {
                    return Err(Error::invalid("onMiss must be a label"));
                }
            }
            Ok(())
        }
        _ => Err(Error::invalid("unknown output kind")),
    }
}

fn normalize_cell(value: &Value) -> Result<Value> {
    id(&value["id"])?;
    let kind = text(&value["kind"], 16)?;
    let allowed: &[&str] = match kind {
        "input" | "const" => &["id", "kind", "outputs"],
        "fn" => &["id", "kind", "fn"],
        "expr" => &["id", "kind", "inputs", "expr", "output"],
        "tool" => &["id", "kind", "tool", "budget"],
        "store" | "load" | "spawn" => &["id", "kind"],
        "slot" => &["id", "kind", "name", "mode", "default"],
        "organism" => &["id", "kind", "manifest", "via"],
        "repeat" => &[
            "id",
            "kind",
            "manifest",
            "via",
            "maxRounds",
            "carry",
            "until",
        ],
        "each" => &["id", "kind", "manifest", "via", "maxItems", "over"],
        "agent" | "classifier" | "gate" => &[
            "id", "kind", "inputs", "prompt", "view", "output", "route", "tools", "budget",
            "shadow", "retry",
        ],
        _ => return Err(Error::invalid(format!("unknown cell kind {kind}"))),
    };
    keys(value, allowed)?;
    let mut v = value.clone();
    match kind {
        "input" | "const" => {
            v["outputs"] = serde_json::to_value(ports(&v["outputs"], true, kind == "const")?)?
        }
        "fn" | "tool" => {
            text(&v[kind], 64)?;
        }
        "expr" => {
            v["inputs"] =
                serde_json::to_value(ports(v.get("inputs").unwrap_or(&json!({})), false, false)?)?;
            keys(&v["expr"], &["contract", "program"])?;
            if v["expr"]["contract"] != "algal.expr.v1" {
                return Err(Error::invalid("expr.contract must be algal.expr.v1"));
            }
            if v["expr"].get("program").is_none() {
                return Err(Error::invalid("expr.program is required"));
            }
            output_contract(&v["output"])?;
            if v["output"]["kind"] == "json" && v["output"].get("schema").is_none() {
                v["output"]["schema"] = json!({});
            }
            if v["output"].get("onMiss").is_some() {
                return Err(Error::invalid(
                    "expr output onMiss is meaningless — programs return exact values",
                ));
            }
            let names: BTreeSet<String> = v["inputs"]
                .as_object()
                .map(|m| m.keys().cloned().collect())
                .unwrap_or_default();
            algal_expr::check_program(&v["expr"]["program"], &names)
                .map_err(|e| Error::invalid(format!("expr program: {}", e.to_json())))?;
        }
        "slot" => {
            id(&v["name"])?;
            if v["mode"] != "read" && v["mode"] != "write" {
                return Err(Error::invalid("invalid slot mode"));
            }
            if v["mode"] == "write" && v.get("default").is_some() {
                return Err(Error::invalid("write slot cannot have default"));
            }
        }
        "organism" | "repeat" | "each" => {
            check_digest(text(&v["manifest"], 71)?)?;
            if let Some(via) = v.get("via") {
                id(via)?;
            }
            if kind == "repeat" {
                integer(&v["maxRounds"], 1, 16)?;
                if let Some(carry) = v.get("carry") {
                    let carry = object(carry)?;
                    if carry.len() > 32 {
                        return Err(Error::limit("carry count"));
                    }
                    for (name, target) in carry {
                        id(&json!(name))?;
                        id(target)?;
                    }
                }
                if let Some(until) = v.get("until") {
                    keys(until, &["output", "equals", "field"])?;
                    id(&until["output"])?;
                    text(&until["equals"], 64)?;
                    if let Some(field) = until.get("field") {
                        id(field)?;
                    }
                }
            }
            if kind == "each" {
                integer(&v["maxItems"], 1, 64)?;
                id(&v["over"])?;
            }
        }
        "agent" | "classifier" | "gate" => {
            v["inputs"] =
                serde_json::to_value(ports(v.get("inputs").unwrap_or(&json!({})), false, false)?)?;
            text(&v["prompt"], 8192)?;
            output_contract(&v["output"])?;
            if v["output"]["kind"] == "json" && v["output"].get("schema").is_none() {
                v["output"]["schema"] = json!({});
            }
            if kind != "agent" && v["output"]["kind"] != "choice" {
                return Err(Error::invalid("classifier/gate requires choice"));
            }
            let mut view = v.get("view").cloned().unwrap_or(json!({}));
            keys(&view, &["inputs", "cells", "graph", "note"])?;
            if view.get("inputs").is_none() {
                view["inputs"] = json!("*");
            }
            if view["inputs"] != "*" {
                for input in list(&view["inputs"], 32)? {
                    id(input)?;
                }
            }
            if let Some(raw) = view.get("cells") {
                let mut cells = Vec::new();
                let mut unique = BTreeSet::new();
                for raw in list(raw, 16)? {
                    let item = if raw.is_string() {
                        json!({"cell":raw})
                    } else {
                        raw.clone()
                    };
                    keys(&item, &["cell", "ports"])?;
                    let name = id(&item["cell"])?;
                    if !unique.insert(name.to_owned()) {
                        return Err(Error::invalid("duplicate view cell"));
                    }
                    if let Some(ps) = item.get("ports") {
                        let mut names = BTreeSet::new();
                        for p in list(ps, 32)? {
                            if !names.insert(id(p)?) {
                                return Err(Error::invalid("duplicate view port"));
                            }
                        }
                        if names.is_empty() {
                            return Err(Error::invalid("empty view ports"));
                        }
                    }
                    cells.push(item);
                }
                if cells.is_empty() {
                    return Err(Error::invalid("empty view cells"));
                }
                view["cells"] = json!(cells);
            }
            if view.get("graph").is_some_and(|v| !v.is_boolean()) {
                return Err(Error::invalid("view.graph must be boolean"));
            }
            if let Some(note) = view.get("note") {
                text(note, 2000)?;
            }
            v["view"] = view;
            if let Some(route) = v.get("route") {
                keys(route, &["provider", "model", "preset"])?;
                for route in object(route)?.values() {
                    text(route, 64)?;
                }
            }
            if let Some(tools) = v.get("tools") {
                if kind == "gate" {
                    return Err(Error::invalid("gate cannot use tools"));
                }
                let mut unique = BTreeSet::new();
                for tool in list(tools, 16)? {
                    if !unique.insert(text(tool, 64)?) {
                        return Err(Error::invalid("duplicate tool"));
                    }
                }
                if unique.is_empty() {
                    return Err(Error::invalid("empty tools"));
                }
            }
            if let Some(shadow) = v.get("shadow") {
                keys(shadow, &["take"])?;
                if kind != "classifier"
                    || !v["output"]["labels"]
                        .as_array()
                        .is_some_and(|ls| ls.contains(&shadow["take"]))
                {
                    return Err(Error::invalid("invalid classifier shadow"));
                }
            }
            if let Some(retry) = v.get("retry") {
                keys(retry, &["attempts"])?;
                integer(&retry["attempts"], 2, 8)?;
            }
        }
        _ => (),
    }
    if let Some(budget) = v.get("budget") {
        keys(
            budget,
            if kind == "tool" {
                &["maxEffectMs"]
            } else {
                &[
                    "maxContextBytes",
                    "maxOutputBytes",
                    "maxTurns",
                    "maxEffectMs",
                ]
            },
        )?;
        for (key, value) in object(budget)? {
            let max = match key.as_str() {
                "maxTurns" => 16,
                "maxEffectMs" => 600_000,
                _ => MAX_VALUE_BYTES,
            };
            integer(value, 1, max)?;
        }
    }
    Ok(v)
}

impl Manifest {
    pub fn parse(value: &Value) -> Result<Self> {
        if canonical(value)?.len() > 1_048_576 {
            return Err(Error::limit("manifest bytes"));
        }
        keys(
            value,
            &[
                "contract",
                "key",
                "name",
                "note",
                "budgets",
                "interface",
                "cells",
                "edges",
            ],
        )?;
        if value["contract"] != CONTRACT {
            return Err(Error::invalid(format!("expected {CONTRACT}")));
        }
        let key = text(&value["key"], 64)?;
        let suffix = key
            .strip_prefix("organism:")
            .ok_or_else(|| Error::invalid("expected organism:<id>"))?;
        id(&json!(suffix))?;
        text(&value["name"], 120)?;
        if let Some(note) = value.get("note") {
            text(note, 2000)?;
        }
        let mut budgets = json!({"maxSteps":256,"maxAgentCalls":16,"maxWork":1_000_000,"maxContextBytes":65_536,"maxOutputBytes":65_536,"maxDepth":4});
        if let Some(raw) = value.get("budgets") {
            keys(
                raw,
                &[
                    "maxSteps",
                    "maxAgentCalls",
                    "maxWork",
                    "maxContextBytes",
                    "maxOutputBytes",
                    "maxDepth",
                ],
            )?;
            for (name, value) in object(raw)? {
                let (min, max) = match name.as_str() {
                    "maxSteps" => (1, 1024),
                    "maxAgentCalls" => (0, 64),
                    "maxWork" => (1, 100_000_000),
                    "maxDepth" => (0, 8),
                    _ => (1, MAX_VALUE_BYTES),
                };
                integer(value, min, max)?;
                budgets[name] = value.clone();
            }
        }
        let mut cells = Vec::new();
        let mut names = BTreeSet::new();
        for cell in list(&value["cells"], 64)? {
            let cell = normalize_cell(cell)?;
            if !names.insert(cell["id"].as_str().unwrap().to_owned()) {
                return Err(Error::invalid("duplicate cell id"));
            }
            cells.push(cell);
        }
        let edges = value.get("edges").cloned().unwrap_or(json!([]));
        for edge in list(&edges, 256)? {
            keys(edge, &["from", "to", "guard", "on"])?;
            for end in ["from", "to"] {
                keys(&edge[end], &["cell", "port"])?;
                id(&edge[end]["cell"])?;
                id(&edge[end]["port"])?;
            }
            if let Some(guard) = edge.get("guard") {
                keys(guard, &["equals", "field"])?;
                text(&guard["equals"], 64)?;
                if let Some(field) = guard.get("field") {
                    id(field)?;
                }
            }
            if edge.get("on").is_some_and(|v| v != "fail") {
                return Err(Error::invalid("unknown edge trigger"));
            }
            if edge.get("on").is_some() && edge.get("guard").is_some() {
                return Err(Error::invalid("fail edge cannot have guard"));
            }
        }
        let mut normalized = value.clone();
        normalized["budgets"] = budgets.clone();
        normalized["cells"] = json!(cells);
        normalized["edges"] = edges.clone();
        if let Some(iface) = value.get("interface") {
            keys(iface, &["inputs", "outputs"])?;
            let mut iface = iface.clone();
            for side in ["inputs", "outputs"] {
                if iface.get(side).is_none() {
                    iface[side] = json!({});
                }
                let map = object(&iface[side])?;
                if map.len() > 32 {
                    return Err(Error::limit("interface ports"));
                }
                for (name, target) in map {
                    id(&json!(name))?;
                    keys(target, &["cell", "port"])?;
                    id(&target["cell"])?;
                    id(&target["port"])?;
                }
            }
            normalized["interface"] = iface;
        }
        Ok(Self {
            value: normalized,
            cells,
            edges: edges.as_array().unwrap().clone(),
            budgets: serde_json::from_value(budgets)?,
        })
    }

    pub fn digest(&self) -> Result<String> {
        digest(&self.value)
    }
}

pub fn check_schema(schema: &Value, value: &Value) -> Result<()> {
    let kind = schema["type"].as_str().unwrap_or("object");
    let matches = match kind {
        "string" => value.is_string(),
        "number" => value.is_number(),
        "integer" => value.as_f64().is_some_and(|n| n.fract() == 0.0),
        "boolean" => value.is_boolean(),
        "array" => value.is_array(),
        "object" => value.is_object(),
        "null" => value.is_null(),
        _ => false,
    };
    if !matches {
        return Err(Error::new("TYPE_MISMATCH", format!("expected {kind}")));
    }
    if let Some(required) = schema["required"].as_array() {
        for key in required {
            if value.get(text(key, 64)?).is_none() {
                return Err(Error::new("TYPE_MISMATCH", "missing required field"));
            }
        }
    }
    if let (Some(props), Some(values)) = (schema["properties"].as_object(), value.as_object()) {
        for (key, sub) in props {
            if let Some(value) = values.get(key) {
                check_schema(sub, value)?;
            }
        }
    }
    Ok(())
}

pub fn check_value(port: &Value, value: &Value) -> Result<()> {
    if canonical(value)?.len() > MAX_VALUE_BYTES {
        return Err(Error::limit("port value bytes"));
    }
    if port["many"] == true {
        let mut scalar = port.clone();
        scalar.as_object_mut().unwrap().remove("many");
        for item in list(value, 4096)? {
            check_value(&scalar, item)?;
        }
        return Ok(());
    }
    match port["type"].as_str() {
        Some("text") if value.is_string() => Ok(()),
        Some("choice")
            if value.is_string()
                && port
                    .get("labels")
                    .is_none_or(|ls| ls.as_array().unwrap().contains(value)) =>
        {
            Ok(())
        }
        Some("json") => match port.get("schema") {
            Some(s) => check_schema(s, value),
            None => Ok(()),
        },
        Some("ref") => {
            check_digest(text(value, 71)?)?;
            Ok(())
        }
        _ => Err(Error::new("TYPE_MISMATCH", "value does not match port")),
    }
}

pub fn bind_output(contract: &Value, value: Value) -> Result<Value> {
    match contract["kind"].as_str() {
        Some("text") if value.is_string() => Ok(value),
        Some("choice") => {
            if contract["labels"]
                .as_array()
                .is_some_and(|labels| labels.contains(&value))
            {
                Ok(value)
            } else {
                contract.get("onMiss").cloned().ok_or_else(|| {
                    Error::new("EFFECT_UNPARSEABLE", "output is not a declared label")
                })
            }
        }
        Some("json") => {
            check_schema(contract.get("schema").unwrap_or(&json!({})), &value)
                .map_err(|e| Error::new("EFFECT_UNPARSEABLE", e.message))?;
            Ok(value)
        }
        _ => Err(Error::new(
            "EFFECT_UNPARSEABLE",
            "output does not match contract",
        )),
    }
}
