use crate::{
    Error, Result,
    canonical::{canonical, check_digest, digest},
    capabilities::parse_capability_handle,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};

pub const CONTRACT: &str = "algal.organism.v1";
pub const MAX_VALUE_BYTES: usize = 262_144;
/// Schema version 2 bounds; see spec/v1/organism.md "JSON schemas".
pub const MAX_SCHEMA_LEVELS: usize = 8;
pub const MAX_SCHEMA_PROPERTIES: usize = 64;
pub const MAX_SCHEMA_REQUIRED: usize = 64;
pub const MAX_SCHEMA_ENUM_VALUES: usize = 32;
pub const MAX_SCHEMA_ENUM_VALUE_BYTES: usize = 256;
/// Schema version 3 bounds: `minLength`/`maxLength` count Unicode code
/// points, and `format` names a fixed character test.
pub const MAX_SCHEMA_TEXT_LENGTH: usize = 1_000_000;
pub const MAX_SCHEMA_FORMAT_NAME: usize = 32;
/// The largest integer the JSON number form keeps exact in both runtimes.
pub const SCHEMA_INTEGER_MAX: f64 = 9_007_199_254_740_991.0;
const SCHEMA_TYPES: [&str; 7] = [
    "object", "array", "string", "number", "integer", "boolean", "null",
];
const SCHEMA_V2_KEYWORDS: [&str; 7] = [
    "type",
    "required",
    "properties",
    "items",
    "enum",
    "minimum",
    "maximum",
];
const SCHEMA_V3_KEYWORDS: [&str; 12] = [
    "type",
    "required",
    "properties",
    "items",
    "enum",
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "format",
    "uniqueItems",
    "additionalProperties",
];
const SCHEMA_FORMATS: [&str; 4] = ["digest", "name", "slug", "uri"];
pub const MAX_RECALL_K: usize = 32;
pub const MAX_RECALL_QUERY_BYTES: usize = 4_096;
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

// Unknown vocabulary remains provider hints, still subject to depth/byte bounds.
fn schema_declaration(value: &Value) -> Result<()> {
    let schema = object(value)?;
    if let Some(kind) = schema.get("type") {
        let types: Vec<&Value> = match kind.as_array() {
            Some(items) => items.iter().collect(),
            None => vec![kind],
        };
        let mut seen = BTreeSet::new();
        if types.is_empty() || types.len() > 7 {
            return Err(Error::invalid("schema type union bound"));
        }
        for entry in types {
            let name = text(entry, 16)?;
            if ![
                "object", "array", "string", "number", "integer", "boolean", "null",
            ]
            .contains(&name)
                || !seen.insert(name)
            {
                return Err(Error::invalid(
                    "schema type must name supported unique JSON types",
                ));
            }
        }
    }
    if let Some(required) = schema.get("required") {
        for key in required
            .as_array()
            .ok_or_else(|| Error::invalid("schema required must be an array"))?
        {
            text(key, 64)?;
        }
    }
    if let Some(properties) = schema.get("properties") {
        for child in object(properties)?.values() {
            schema_declaration(child)?;
        }
    }
    Ok(())
}

/// `schemaVersion` is the number 2 or 3 beside a schema; without it a schema
/// is version 1 and keeps its original rules and provider hints.
#[derive(Clone, Copy, PartialEq, Eq)]
enum SchemaKind {
    V1,
    V2,
    V3,
}

fn schema_version(declaration: &Value) -> Result<SchemaKind> {
    let Some(version) = declaration.get("schemaVersion") else {
        return Ok(SchemaKind::V1);
    };
    if version.as_f64() != Some(2.0) && version.as_f64() != Some(3.0) {
        return Err(Error::invalid("schemaVersion must be 2 or 3"));
    }
    if declaration.get("schema").is_none() {
        return Err(Error::invalid("schemaVersion requires a schema"));
    }
    Ok(if version.as_f64() == Some(3.0) {
        SchemaKind::V3
    } else {
        SchemaKind::V2
    })
}

fn check_schema_declaration(schema: &Value, version: SchemaKind) -> Result<()> {
    object(schema)?;
    match version {
        SchemaKind::V2 => return schema_declaration_strict(schema, 1, false),
        SchemaKind::V3 => return schema_declaration_strict(schema, 1, true),
        SchemaKind::V1 => (),
    }
    schema_depth(schema, 0)?;
    schema_declaration(schema)
}

/// Schema version 2 and 3 admission. Each schema is checked before its
/// children, children in UTF-8 key order and then `items`; messages match the
/// reference runtime's reasons (which it prefixes with the schema's
/// location). Version 3 adds text length and format, unique items, and
/// closed records.
fn schema_declaration_strict(value: &Value, level: usize, version_3: bool) -> Result<()> {
    if level > MAX_SCHEMA_LEVELS {
        return Err(Error::invalid(format!(
            "schema exceeds {MAX_SCHEMA_LEVELS} nested levels"
        )));
    }
    let schema = object(value)?;
    let keywords: &[&str] = if version_3 {
        &SCHEMA_V3_KEYWORDS
    } else {
        &SCHEMA_V2_KEYWORDS
    };
    let mut keys: Vec<&String> = schema.keys().collect();
    keys.sort();
    if let Some(key) = keys
        .into_iter()
        .find(|key| !keywords.contains(&key.as_str()))
    {
        return Err(Error::invalid(format!(
            "unknown schema keyword {}",
            serde_json::to_string(key)?
        )));
    }
    if let Some(kind) = schema.get("type") {
        let types: Vec<&Value> = match kind.as_array() {
            Some(items) => items.iter().collect(),
            None => vec![kind],
        };
        let mut seen = BTreeSet::new();
        if types.is_empty()
            || types.len() > SCHEMA_TYPES.len()
            || !types.iter().all(|entry| {
                entry
                    .as_str()
                    .is_some_and(|name| SCHEMA_TYPES.contains(&name) && seen.insert(name))
            })
        {
            return Err(Error::invalid(
                "type must name a supported JSON type or a nonempty unique union",
            ));
        }
    }
    let types = schema_types(value);
    if let Some(required) = schema.get("required") {
        let mut seen = BTreeSet::new();
        let valid = required.as_array().is_some_and(|names| {
            names.len() <= MAX_SCHEMA_REQUIRED
                && names.iter().all(|name| {
                    name.as_str()
                        .is_some_and(|name| name.encode_utf16().count() <= 64 && seen.insert(name))
                })
        });
        if !valid {
            return Err(Error::invalid(format!(
                "required must list at most {MAX_SCHEMA_REQUIRED} distinct names of at most 64 UTF-16 code units"
            )));
        }
    }
    let properties = schema.get("properties");
    if properties.is_some_and(|properties| {
        !properties.as_object().is_some_and(|map| {
            map.len() <= MAX_SCHEMA_PROPERTIES && map.values().all(Value::is_object)
        })
    }) {
        return Err(Error::invalid(format!(
            "properties must map at most {MAX_SCHEMA_PROPERTIES} names to schemas"
        )));
    }
    let items = schema.get("items");
    if let Some(items) = items {
        if !items.is_object() {
            return Err(Error::invalid("items must be a schema"));
        }
        if !types.contains(&"array") {
            return Err(Error::invalid("items requires type array"));
        }
    }
    if let Some(allowed) = schema.get("enum") {
        let count = format!("enum must list 1 to {MAX_SCHEMA_ENUM_VALUES} distinct values");
        let values = allowed
            .as_array()
            .filter(|values| (1..=MAX_SCHEMA_ENUM_VALUES).contains(&values.len()))
            .ok_or_else(|| Error::invalid(count.clone()))?;
        let mut seen = BTreeSet::new();
        for value in values {
            let scalar = matches!(
                value,
                Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_)
            );
            let encoded = if scalar {
                Some(canonical(value)?)
            } else {
                None
            };
            let Some(encoded) =
                encoded.filter(|encoded| encoded.len() <= MAX_SCHEMA_ENUM_VALUE_BYTES)
            else {
                return Err(Error::invalid(format!(
                    "enum values must be strings, finite numbers, booleans, or null of at most {MAX_SCHEMA_ENUM_VALUE_BYTES} canonical JSON bytes"
                )));
            };
            // Canonical JSON identity: 1 and 1.0 are the same allowed value.
            if !seen.insert(encoded) {
                return Err(Error::invalid(count));
            }
            if !types
                .iter()
                .any(|kind| type_matches(kind, value, version_3))
            {
                return Err(Error::invalid("enum values must match the schema type"));
            }
        }
    }
    for bound in ["minimum", "maximum"] {
        if schema.get(bound).is_some_and(|value| !value.is_number()) {
            return Err(Error::invalid(format!("{bound} must be a finite number")));
        }
    }
    let minimum = schema.get("minimum").and_then(Value::as_f64);
    let maximum = schema.get("maximum").and_then(Value::as_f64);
    if (minimum.is_some() || maximum.is_some())
        && !types.contains(&"number")
        && !types.contains(&"integer")
    {
        return Err(Error::invalid(
            "minimum and maximum require type number or integer",
        ));
    }
    if let (Some(minimum), Some(maximum)) = (minimum, maximum)
        && minimum > maximum
    {
        return Err(Error::invalid("minimum exceeds maximum"));
    }
    if version_3 {
        // Bounds come through f64 like the reference runtime's numbers: 5 and
        // 5.0 are the same integer, and an u64 above the bound still fails.
        let text_bound = |bound: Option<&Value>| -> Option<f64> {
            bound
                .and_then(Value::as_f64)
                .filter(|n| n.fract() == 0.0 && *n >= 0.0 && *n <= MAX_SCHEMA_TEXT_LENGTH as f64)
        };
        for name in ["minLength", "maxLength"] {
            if schema.contains_key(name) && text_bound(schema.get(name)).is_none() {
                return Err(Error::invalid(format!(
                    "{name} must be an integer from 0 to {MAX_SCHEMA_TEXT_LENGTH}"
                )));
            }
        }
        let min_length = text_bound(schema.get("minLength"));
        let max_length = text_bound(schema.get("maxLength"));
        if (min_length.is_some() || max_length.is_some()) && !types.contains(&"string") {
            return Err(Error::invalid(
                "minLength and maxLength require type string",
            ));
        }
        if let (Some(minimum), Some(maximum)) = (min_length, max_length)
            && minimum > maximum
        {
            return Err(Error::invalid("minLength exceeds maxLength"));
        }
        if let Some(format) = schema.get("format") {
            let name = format
                .as_str()
                .filter(|name| name.encode_utf16().count() <= MAX_SCHEMA_FORMAT_NAME);
            let Some(name) = name else {
                return Err(Error::invalid(format!(
                    "format must be a name of at most {MAX_SCHEMA_FORMAT_NAME} UTF-16 code units"
                )));
            };
            if !SCHEMA_FORMATS.contains(&name) {
                return Err(Error::invalid(
                    "format must name digest, name, slug, or uri",
                ));
            }
            if !types.contains(&"string") {
                return Err(Error::invalid("format requires type string"));
            }
        }
        if let Some(unique) = schema.get("uniqueItems") {
            if *unique != true {
                return Err(Error::invalid("uniqueItems must be the boolean true"));
            }
            if !types.contains(&"array") {
                return Err(Error::invalid("uniqueItems requires type array"));
            }
        }
        if let Some(closed) = schema.get("additionalProperties") {
            if *closed != false {
                return Err(Error::invalid(
                    "additionalProperties must be the boolean false",
                ));
            }
            if !types.contains(&"object") {
                return Err(Error::invalid("additionalProperties requires type object"));
            }
            if properties.is_none_or(|p| !p.is_object()) {
                return Err(Error::invalid(
                    "additionalProperties requires a properties map",
                ));
            }
        }
    }
    if let Some(properties) = properties.and_then(Value::as_object) {
        let mut names: Vec<&String> = properties.keys().collect();
        names.sort();
        for name in names {
            schema_declaration_strict(&properties[name], level + 1, version_3)?;
        }
    }
    if let Some(items) = items {
        schema_declaration_strict(items, level + 1, version_3)?;
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
                &[
                    "type",
                    "optional",
                    "many",
                    "labels",
                    "schema",
                    "schemaVersion",
                    "capability",
                    "value",
                ]
            } else {
                &[
                    "type",
                    "optional",
                    "many",
                    "labels",
                    "schema",
                    "schemaVersion",
                    "capability",
                ]
            },
        )?;
        let kind = text(&p["type"], 16)?;
        if !["text", "json", "choice", "ref", "cap"].contains(&kind) {
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
        let version = schema_version(&p)?;
        if let Some(schema) = p.get("schema") {
            if kind != "json" {
                return Err(Error::invalid("schema requires json"));
            }
            check_schema_declaration(schema, version)?;
        }
        if kind == "cap" {
            id(p.get("capability")
                .ok_or_else(|| Error::invalid("cap ports require a capability class"))?)?;
            if constant {
                return Err(Error::invalid("const cells cannot mint capability handles"));
            }
        } else if p.get("capability").is_some() {
            return Err(Error::invalid("capability requires cap type"));
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
            keys(value, &["kind", "schema", "schemaVersion"])?;
            let version = schema_version(value)?;
            check_schema_declaration(&value["schema"], version)
        }
        "choice" => {
            keys(value, &["kind", "labels", "onMiss"])?;
            labels(&value["labels"])?;
            if let Some(miss) = value.get("onMiss")
                && !value["labels"].as_array().unwrap().contains(miss)
            {
                return Err(Error::invalid("onMiss must be a label"));
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
            "id", "kind", "inputs", "prompt", "view", "output", "route", "tools", "compact",
            "budget", "shadow", "retry",
        ],
        "decide" => &[
            "id",
            "kind",
            "inputs",
            "prompt",
            "questions",
            "view",
            "route",
            "budget",
            "retry",
        ],
        "recall" => &[
            "id", "kind", "inputs", "query", "k", "embedder", "route", "rerank", "budget", "retry",
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
            normalize_inputs(&mut v)?;
            keys(&v["expr"], &["contract", "program"])?;
            if v["expr"]["contract"] != "algal.expr.v1" {
                return Err(Error::invalid("expr.contract must be algal.expr.v1"));
            }
            if v["expr"].get("program").is_none() {
                return Err(Error::invalid("expr.program is required"));
            }
            output_contract(&v["output"])?;
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
            normalize_inputs(&mut v)?;
            text(&v["prompt"], 8192)?;
            output_contract(&v["output"])?;
            if kind != "agent" && v["output"]["kind"] != "choice" {
                return Err(Error::invalid("classifier/gate requires choice"));
            }
            v["view"] = agent_view(v.get("view"))?;
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
            if let Some(compact) = v.get("compact") {
                if kind != "agent" {
                    return Err(Error::invalid(
                        "compact is agent-only — only tool-bearing cells accumulate a log",
                    ));
                }
                keys(compact, &["maxLogBytes", "keepRecent", "route", "mode"])?;
                if let Some(mode) = compact.get("mode") {
                    if mode != "elide" {
                        return Err(Error::invalid("compact.mode must be elide"));
                    }
                    if compact.get("route").is_some() {
                        return Err(Error::invalid("compact.route is not used by elide mode"));
                    }
                }
                integer(&compact["maxLogBytes"], 1, 262_144)?;
                if let Some(recent) = compact.get("keepRecent") {
                    integer(recent, 0, 8)?;
                }
                if let Some(route) = compact.get("route") {
                    keys(route, &["provider", "model", "preset"])?;
                    for r in object(route)?.values() {
                        text(r, 64)?;
                    }
                }
                if v.get("tools").is_none() {
                    return Err(Error::invalid(
                        "compact needs tools — no tool log ever accumulates",
                    ));
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
        "decide" => {
            normalize_inputs(&mut v)?;
            if let Some(prompt) = v.get("prompt") {
                text(prompt, 8192)?;
            }
            crate::decisions::check_questions(
                v.get("questions")
                    .ok_or_else(|| Error::invalid("decide cell requires questions"))?,
                "decide.questions",
            )?;
            v["view"] = agent_view(v.get("view"))?;
            if let Some(route) = v.get("route") {
                keys(route, &["provider", "model", "preset"])?;
                for route in object(route)?.values() {
                    text(route, 64)?;
                }
            }
            if let Some(retry) = v.get("retry") {
                keys(retry, &["attempts"])?;
                integer(&retry["attempts"], 2, 8)?;
            }
        }
        "recall" => {
            v["inputs"] =
                serde_json::to_value(ports(v.get("inputs").unwrap_or(&json!({})), false, false)?)?;
            let query = v
                .get("query")
                .ok_or_else(|| Error::invalid("recall cell requires query"))?;
            keys(query, &["contract", "program"])?;
            if query["contract"] != "algal.expr.v1" || query.get("program").is_none() {
                return Err(Error::invalid(
                    "recall query must be an algal.expr.v1 program",
                ));
            }
            let names: BTreeSet<String> = v["inputs"]
                .as_object()
                .map(|m| m.keys().cloned().collect())
                .unwrap_or_default();
            algal_expr::check_program(&query["program"], &names)
                .map_err(|e| Error::invalid(format!("recall query program: {}", e.to_json())))?;
            if let Some(k) = v.get("k") {
                integer(k, 1, MAX_RECALL_K)?;
            }
            if let Some(spec) = v.get("embedder") {
                let spec = text(spec, 64)?;
                crate::embeddings::Embedder::resolve(Some(spec))?;
            }
            if let Some(route) = v.get("route") {
                keys(route, &["provider", "model", "preset"])?;
                for route in object(route)?.values() {
                    text(route, 64)?;
                }
            }
            if let Some(rerank) = v.get("rerank") {
                keys(rerank, &["route", "take"])?;
                let route = rerank
                    .get("route")
                    .ok_or_else(|| Error::invalid("recall rerank requires route"))?;
                keys(route, &["provider", "model", "preset"])?;
                for value in object(route)?.values() {
                    text(value, 64)?;
                }
                if route.get("provider").is_none() && route.get("preset").is_none() {
                    return Err(Error::invalid(
                        "recall rerank route requires provider or preset",
                    ));
                }
                if let Some(take) = rerank.get("take") {
                    integer(take, 1, v["k"].as_u64().unwrap_or(8) as usize)?;
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
            } else if kind == "decide" || kind == "recall" {
                &["maxContextBytes", "maxOutputBytes", "maxEffectMs"]
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

/// Normalize a cell's `inputs` port map; the canonical form omits an empty
/// map, matching the reference serializer.
fn normalize_inputs(v: &mut Value) -> Result<()> {
    let inputs = serde_json::to_value(ports(v.get("inputs").unwrap_or(&json!({})), false, false)?)?;
    if inputs.as_object().is_none_or(|o| o.is_empty()) {
        v.as_object_mut().unwrap().remove("inputs");
    } else {
        v["inputs"] = inputs;
    }
    Ok(())
}

/// Normalize an agent-style `view` block (agent/classifier/gate/decide):
/// `inputs` defaults to `"*"`, `cells` entries normalize to `{cell, ports?}`
/// objects with uniqueness enforced, `graph`/`note` are type-checked.
fn agent_view(raw: Option<&Value>) -> Result<Value> {
    let mut view = raw.cloned().unwrap_or(json!({}));
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
    Ok(view)
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
                keys(guard, &["equals", "field", "expr"])?;
                if let Some(expr) = guard.get("expr") {
                    if guard.get("equals").is_some() || guard.get("field").is_some() {
                        return Err(Error::invalid("guard expr cannot mix with equals/field"));
                    }
                    keys(expr, &["contract", "program"])?;
                    if expr["contract"] != "algal.expr.v1" {
                        return Err(Error::invalid("guard expr.contract must be algal.expr.v1"));
                    }
                    if expr.get("program").is_none() {
                        return Err(Error::invalid("guard expr.program is required"));
                    }
                    let names = BTreeSet::from(["value".to_string()]);
                    algal_expr::check_program(&expr["program"], &names).map_err(|e| {
                        Error::invalid(format!("guard expr program: {}", e.to_json()))
                    })?;
                } else {
                    text(&guard["equals"], 64)?;
                    if let Some(field) = guard.get("field") {
                        id(field)?;
                    }
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
        // Defaults and normalized ports must not create an unreloadable manifest.
        if canonical(&normalized)?.len() > 1_048_576 {
            return Err(Error::limit("manifest bytes"));
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

/// The declared types, with an omitted `type` meaning object.
fn schema_types(schema: &Value) -> Vec<&str> {
    match schema["type"].as_array() {
        Some(items) => items.iter().map(|v| v.as_str().unwrap_or("")).collect(),
        None => vec![schema["type"].as_str().unwrap_or("object")],
    }
}

fn type_matches(kind: &str, value: &Value, version_3: bool) -> bool {
    match kind {
        "string" => value.is_string(),
        "number" => value.is_number(),
        // Version 3 bounds an integer to the range both runtimes keep exact;
        // earlier versions accept any whole number, as they shipped.
        "integer" => value
            .as_f64()
            .is_some_and(|n| n.fract() == 0.0 && (!version_3 || n.abs() <= SCHEMA_INTEGER_MAX)),
        "boolean" => value.is_boolean(),
        "array" => value.is_array(),
        "object" => value.is_object(),
        "null" => value.is_null(),
        _ => false,
    }
}

/// Each named format is a fixed character test that runs in the value's
/// length; a general regular expression is not part of the subset.
fn format_matches(format: &str, value: &str) -> bool {
    match format {
        "digest" => check_digest(value).is_ok(),
        "name" => {
            value.encode_utf16().count() <= 64
                && value.bytes().next().is_some_and(|b| b.is_ascii_lowercase())
                && value
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        }
        "slug" => {
            value.encode_utf16().count() <= 128
                && !value.is_empty()
                && !value.starts_with('-')
                && !value.ends_with('-')
                && !value.contains("--")
                && value
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        }
        "uri" => {
            let Some(colon) = value.find(':') else {
                return false;
            };
            let (scheme, rest) = (&value[..colon], &value[colon + 1..]);
            value.encode_utf16().count() <= 2048
                && !rest.is_empty()
                && scheme
                    .bytes()
                    .next()
                    .is_some_and(|b| b.is_ascii_alphabetic())
                && scheme
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'+' || b == b'-' || b == b'.')
                && rest.bytes().all(|b| {
                    b.is_ascii_alphanumeric()
                        || matches!(
                            b,
                            b'-' | b'.'
                                | b'_'
                                | b'~'
                                | b'!'
                                | b'$'
                                | b'&'
                                | b'\''
                                | b'('
                                | b')'
                                | b'*'
                                | b'+'
                                | b','
                                | b';'
                                | b'='
                                | b':'
                                | b'@'
                                | b'/'
                                | b'?'
                                | b'#'
                                | b'['
                                | b']'
                                | b'%'
                        )
                })
        }
        _ => false,
    }
}

/// Allowed values are scalars, so canonical JSON equality is numeric equality
/// for numbers (1 and 1.0, 0 and -0) and exact equality otherwise.
fn same_scalar(allowed: &Value, value: &Value) -> bool {
    match (allowed, value) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::String(a), Value::String(b)) => a == b,
        (Value::Bool(a), Value::Bool(b)) => a == b,
        (Value::Null, Value::Null) => true,
        _ => false,
    }
}

/// Schema version 2 and 3 values: type, allowed values, inclusive number
/// bounds, text length and format, required fields, undeclared fields,
/// declared properties in UTF-8 key order, unique elements, then list
/// elements in index order, a failing element prefixing its zero-based
/// index. Messages and order are receipt data shared with the reference
/// runtime.
fn check_schema_strict(schema: &Value, value: &Value, version_3: bool) -> Result<()> {
    let types = schema_types(schema);
    if !types
        .iter()
        .any(|kind| type_matches(kind, value, version_3))
    {
        return Err(Error::new(
            "TYPE_MISMATCH",
            format!("expected {}", types.join("|")),
        ));
    }
    if let Some(allowed) = schema["enum"].as_array()
        && !allowed.iter().any(|entry| same_scalar(entry, value))
    {
        return Err(Error::new("TYPE_MISMATCH", "expected an allowed value"));
    }
    if let Some(number) = value.as_f64() {
        if schema["minimum"]
            .as_f64()
            .is_some_and(|minimum| number < minimum)
        {
            return Err(Error::new("TYPE_MISMATCH", "number below minimum"));
        }
        if schema["maximum"]
            .as_f64()
            .is_some_and(|maximum| number > maximum)
        {
            return Err(Error::new("TYPE_MISMATCH", "number above maximum"));
        }
    }
    if version_3 && let Some(text) = value.as_str() {
        // chars() counts Unicode scalar values, the reference runtime's
        // code points: an astral character counts once on both sides.
        let length = text.chars().count() as f64;
        if schema["minLength"]
            .as_f64()
            .is_some_and(|bound| length < bound)
        {
            return Err(Error::new("TYPE_MISMATCH", "text shorter than minLength"));
        }
        if schema["maxLength"]
            .as_f64()
            .is_some_and(|bound| length > bound)
        {
            return Err(Error::new("TYPE_MISMATCH", "text longer than maxLength"));
        }
        if let Some(format) = schema["format"].as_str()
            && !format_matches(format, text)
        {
            return Err(Error::new(
                "TYPE_MISMATCH",
                format!("text is not a {format}"),
            ));
        }
    }
    if let Some(required) = schema["required"].as_array() {
        for key in required {
            if value.get(text(key, 64)?).is_none() {
                return Err(Error::new("TYPE_MISMATCH", "missing required field"));
            }
        }
    }
    if version_3
        && let (Some(properties), Some(values)) =
            (schema["properties"].as_object(), value.as_object())
        && schema.get("additionalProperties") == Some(&Value::Bool(false))
    {
        for key in values.keys() {
            if !properties.contains_key(key) {
                return Err(Error::new("TYPE_MISMATCH", "undeclared field"));
            }
        }
    }
    if let (Some(props), Some(values)) = (schema["properties"].as_object(), value.as_object()) {
        let mut keys: Vec<_> = props.keys().collect();
        keys.sort();
        for key in keys {
            if let Some(value) = values.get(key) {
                check_schema_strict(&props[key], value, version_3)?;
            }
        }
    }
    if version_3
        && schema.get("uniqueItems") == Some(&Value::Bool(true))
        && let Some(values) = value.as_array()
    {
        // Canonical JSON identity: 1 and 1.0 repeat, as do reordered records.
        let mut seen = BTreeSet::new();
        for item in values {
            if !seen.insert(canonical(item)?) {
                return Err(Error::new("TYPE_MISMATCH", "repeated item"));
            }
        }
    }
    if let (Some(items), Some(values)) = (schema.get("items"), value.as_array()) {
        for (index, item) in values.iter().enumerate() {
            check_schema_strict(items, item, version_3).map_err(|error| {
                Error::new(&error.code, format!("item {index}: {}", error.message))
            })?;
        }
    }
    Ok(())
}

pub fn check_schema_v2(schema: &Value, value: &Value) -> Result<()> {
    check_schema_strict(schema, value, false)
}

pub fn check_schema_v3(schema: &Value, value: &Value) -> Result<()> {
    check_schema_strict(schema, value, true)
}

pub fn check_schema(schema: &Value, value: &Value) -> Result<()> {
    let types = schema_types(schema);
    let matches = types.iter().any(|kind| type_matches(kind, value, false));
    if !matches {
        return Err(Error::new(
            "TYPE_MISMATCH",
            format!("expected {}", types.join("|")),
        ));
    }
    if let Some(required) = schema["required"].as_array() {
        for key in required {
            if value.get(text(key, 64)?).is_none() {
                return Err(Error::new("TYPE_MISMATCH", "missing required field"));
            }
        }
    }
    if let (Some(props), Some(values)) = (schema["properties"].as_object(), value.as_object()) {
        // serde_json may preserve source insertion order. Error selection is
        // receipt data, so keep it stable across canonical storage and replay.
        let mut keys: Vec<_> = props.keys().collect();
        keys.sort();
        for key in keys {
            if let Some(value) = values.get(key) {
                check_schema(&props[key], value)?;
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
            Some(s) => match port.get("schemaVersion").and_then(Value::as_f64) {
                Some(3.0) => check_schema_v3(s, value),
                Some(2.0) => check_schema_v2(s, value),
                _ => check_schema(s, value),
            },
            None => Ok(()),
        },
        Some("ref") => {
            check_digest(text(value, 71)?)?;
            Ok(())
        }
        Some("cap") => {
            parse_capability_handle(text(value, 160)?, Some(text(&port["capability"], 64)?))?;
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
            let empty = json!({});
            let schema = contract.get("schema").unwrap_or(&empty);
            let checked = match contract.get("schemaVersion").and_then(Value::as_f64) {
                Some(3.0) => check_schema_v3(schema, &value),
                Some(2.0) => check_schema_v2(schema, &value),
                _ => check_schema(schema, &value),
            };
            checked.map_err(|e| Error::new("EFFECT_UNPARSEABLE", e.message))?;
            Ok(value)
        }
        _ => Err(Error::new(
            "EFFECT_UNPARSEABLE",
            "output does not match contract",
        )),
    }
}
