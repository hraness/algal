use crate::{
    Error, Result,
    canonical::{MAX_DOCUMENT_BYTES, read_json},
    contract::{Manifest, Ports, Signature, object, ports},
    registry,
    store::{Store, unpack},
};
use serde_json::{Value, json};
use std::{
    collections::{BTreeMap, BTreeSet, VecDeque},
    fs::File,
    path::PathBuf,
};

pub type ToolSignatures = BTreeMap<String, Signature>;
pub type Transports = BTreeMap<String, PathBuf>;

#[derive(Clone)]
pub struct Compiled {
    pub manifest: Manifest,
    pub signatures: BTreeMap<String, Signature>,
    pub children: BTreeMap<String, Compiled>,
    pub inbound: BTreeMap<String, Vec<usize>>,
    pub via: BTreeMap<String, String>,
}

fn invalid(message: &str) -> Error {
    Error::new("MANIFEST_INVALID", message)
}
fn port_map(value: Value) -> Result<Ports> {
    ports(&value, false, false)
}

pub fn interface_signature(compiled: &Compiled) -> Result<Signature> {
    let interface =
        compiled.manifest.value.get("interface").ok_or_else(|| {
            Error::new("INTERFACE_MISMATCH", "embedded organism requires interface")
        })?;
    let mut sig = Signature::default();
    for side in ["inputs", "outputs"] {
        for (name, target) in object(&interface[side])? {
            let cell = target["cell"].as_str().unwrap();
            let port = target["port"].as_str().unwrap();
            if side == "inputs"
                && !compiled
                    .manifest
                    .cells
                    .iter()
                    .any(|c| c["id"] == cell && c["kind"] == "input")
            {
                return Err(Error::new(
                    "INTERFACE_MISMATCH",
                    "interface inputs must name input cells",
                ));
            }
            let decl = compiled
                .signatures
                .get(cell)
                .and_then(|sig| sig.outputs.get(port))
                .ok_or_else(|| {
                    Error::new(
                        "INTERFACE_MISMATCH",
                        "interface references missing cell or output port",
                    )
                })?;
            if side == "inputs" {
                sig.inputs.insert(name.clone(), decl.clone());
            } else {
                sig.outputs.insert(name.clone(), decl.clone());
            }
        }
    }
    Ok(sig)
}

fn compatible(from: &Value, to: &Value) -> bool {
    if from["type"] == "ref" || to["type"] == "ref" {
        return from["type"] == to["type"];
    }
    if from["many"] == true && to["many"] != true && to["type"] != "json" {
        return false;
    }
    if to["type"] == "json" {
        return true;
    }
    if from["type"] == to["type"] {
        if let (Some(a), Some(b)) = (from["labels"].as_array(), to["labels"].as_array()) {
            return a.iter().all(|v| b.contains(v));
        }
        return true;
    }
    from["type"] == "choice" && to["type"] == "text"
}

pub fn compile(
    manifest: Manifest,
    store: &mut Store,
    tools: &ToolSignatures,
    transports: &Transports,
    depth: usize,
) -> Result<Compiled> {
    if depth > 64 {
        return Err(Error::new("DEPTH_EXCEEDED", "compile depth exceeds 64"));
    }
    let mut result = Compiled {
        manifest,
        signatures: BTreeMap::new(),
        children: BTreeMap::new(),
        inbound: BTreeMap::new(),
        via: BTreeMap::new(),
    };
    for cell in &result.manifest.cells {
        let name = cell["id"].as_str().unwrap();
        if ["organism", "each", "repeat"]
            .iter()
            .any(|kind| cell["kind"] == *kind)
        {
            let digest = cell["manifest"].as_str().unwrap();
            if store.get("manifests", digest)?.is_none() {
                if let Some(via) = cell["via"].as_str() {
                    let directory = transports
                        .get(via)
                        .ok_or_else(|| Error::new("STORE_MISS", "transport is not configured"))?;
                    let bundle = read_json(
                        File::open(directory.join(format!("{}.bundle.json", &digest[7..])))?,
                        MAX_DOCUMENT_BYTES,
                    )?;
                    if bundle["root"] != digest {
                        return Err(Error::new("DIGEST_MISMATCH", "transport bundle root"));
                    }
                    unpack(&bundle, store)?;
                    result.via.insert(name.to_owned(), via.to_owned());
                }
            }
            result.children.insert(
                name.to_owned(),
                compile(store.manifest(digest)?, store, tools, transports, depth + 1)?,
            );
        }
        let sig = match cell["kind"].as_str().unwrap() {
            "input" | "const" => {
                let mut outputs = object(&cell["outputs"])?.clone();
                for value in outputs.values_mut() {
                    value.as_object_mut().unwrap().remove("value");
                }
                Signature {
                    outputs: outputs.into_iter().collect(),
                    ..Signature::default()
                }
            }
            "fn" => registry::signature(cell["fn"].as_str().unwrap())?,
            "tool" => tools
                .get(cell["tool"].as_str().unwrap())
                .cloned()
                .ok_or_else(|| Error::new("TOOL_UNKNOWN", "tool is not host-admitted"))?,
            "expr" => {
                let mut output = json!({"type":cell["output"]["kind"]});
                if let Some(labels) = cell["output"].get("labels") {
                    output["labels"] = labels.clone();
                }
                Signature {
                    inputs: ports(&cell["inputs"], false, false)?,
                    outputs: port_map(json!({"out":output}))?,
                    cost: 0,
                }
            }
            "agent" | "classifier" | "gate" => {
                let mut output = json!({"type":cell["output"]["kind"]});
                if let Some(labels) = cell["output"].get("labels") {
                    output["labels"] = labels.clone();
                }
                Signature {
                    inputs: ports(&cell["inputs"], false, false)?,
                    outputs: port_map(json!({"out":output}))?,
                    cost: 0,
                }
            }
            "decide" => Signature {
                inputs: ports(&cell["inputs"], false, false)?,
                outputs: port_map(json!({"out":"json"}))?,
                cost: 0,
            },
            "store" => Signature {
                inputs: port_map(json!({"data":"json"}))?,
                outputs: port_map(json!({"ref":"ref"}))?,
                cost: 0,
            },
            "load" => Signature {
                inputs: port_map(json!({"ref":"ref"}))?,
                outputs: port_map(json!({"data":"json"}))?,
                cost: 0,
            },
            "slot" => Signature {
                inputs: if cell["mode"] == "write" {
                    port_map(json!({"data":"json"}))?
                } else {
                    Ports::new()
                },
                outputs: port_map(json!({"data":"json"}))?,
                cost: 0,
            },
            "spawn" => Signature {
                inputs: port_map(
                    json!({"manifest":"json","args":{"type":"json","optional":true}}),
                )?,
                outputs: port_map(json!({"data":"json","digest":"text"}))?,
                cost: 0,
            },
            "organism" | "repeat" | "each" => {
                let mut sig = interface_signature(&result.children[name])?;
                if cell["kind"] == "repeat" {
                    if let Some(carry) = cell["carry"].as_object() {
                        for (output, input) in carry {
                            let input = input.as_str().unwrap();
                            if !sig.outputs.contains_key(output) || !sig.inputs.contains_key(input)
                            {
                                return Err(Error::new(
                                    "INTERFACE_MISMATCH",
                                    "carry must name interface ports",
                                ));
                            }
                            sig.inputs.get_mut(input).unwrap()["optional"] = json!(true);
                        }
                    }
                    if let Some(until) = cell.get("until") {
                        let port = sig
                            .outputs
                            .get(until["output"].as_str().unwrap())
                            .ok_or_else(|| {
                                Error::new("INTERFACE_MISMATCH", "until port is missing")
                            })?;
                        if until.get("field").is_some() && port["type"] != "json" {
                            return Err(Error::new("GUARD_INVALID", "until.field requires json"));
                        }
                        if until.get("field").is_none()
                            && port["type"] == "choice"
                            && port["labels"]
                                .as_array()
                                .is_some_and(|ls| !ls.contains(&until["equals"]))
                        {
                            return Err(Error::new(
                                "GUARD_INVALID",
                                "until must use a declared label",
                            ));
                        }
                    }
                }
                if cell["kind"] == "each" {
                    let over = cell["over"].as_str().unwrap();
                    if !sig.inputs.contains_key(over) {
                        return Err(Error::new(
                            "INTERFACE_MISMATCH",
                            "each.over must name an interface input",
                        ));
                    }
                    sig.inputs.insert(over.to_owned(), json!({"type":"json"}));
                    for output in sig.outputs.values_mut() {
                        output["many"] = json!(true);
                    }
                }
                sig
            }
            _ => return Err(invalid("unsupported cell")),
        };
        result.signatures.insert(name.to_owned(), sig);
    }
    if result.manifest.value.get("interface").is_some() {
        interface_signature(&result)?;
    }
    let mut indegree: BTreeMap<String, usize> =
        result.signatures.keys().map(|id| (id.clone(), 0)).collect();
    let mut reverse: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for (i, edge) in result.manifest.edges.iter().enumerate() {
        let from = edge["from"]["cell"].as_str().unwrap();
        let to = edge["to"]["cell"].as_str().unwrap();
        let target = edge["to"]["port"].as_str().unwrap();
        let producer = result
            .signatures
            .get(from)
            .and_then(|s| s.outputs.get(edge["from"]["port"].as_str().unwrap()))
            .ok_or_else(|| invalid("unknown producer cell/port"))?;
        let consumer = result
            .signatures
            .get(to)
            .and_then(|s| s.inputs.get(target))
            .ok_or_else(|| invalid("unknown consumer cell/port"))?;
        if edge["on"] == "fail" {
            if consumer["type"] != "json" {
                return Err(Error::new(
                    "TYPE_MISMATCH",
                    "failure edge requires json consumer",
                ));
            }
        } else if !compatible(producer, consumer) {
            return Err(Error::new("TYPE_MISMATCH", "incompatible edge ports"));
        }
        if let Some(guard) = edge.get("guard") {
            // expr guards predicate on the delivered value itself — any
            // producer type is admissible
            if guard.get("expr").is_none()
                && ((guard.get("field").is_some() && producer["type"] != "json")
                    || (guard.get("field").is_none() && producer["type"] != "choice"))
            {
                return Err(Error::new(
                    "GUARD_INVALID",
                    "guard does not match producer type",
                ));
            }
            if guard.get("expr").is_none()
                && guard.get("field").is_none()
                && producer["labels"]
                    .as_array()
                    .is_some_and(|ls| !ls.contains(&guard["equals"]))
            {
                return Err(Error::new("GUARD_INVALID", "guard label not declared"));
            }
        }
        let inbound = result.inbound.entry(to.to_owned()).or_default();
        for prior in inbound.iter().map(|i| &result.manifest.edges[*i]) {
            if prior["to"]["port"] == target
                && (consumer["many"] != true || (prior["on"] == "fail") != (edge["on"] == "fail"))
            {
                return Err(invalid(
                    "input is single-assignment or mixes normal/failure edges",
                ));
            }
        }
        inbound.push(i);
        *indegree.get_mut(to).unwrap() += 1;
        reverse
            .entry(to.to_owned())
            .or_default()
            .push(from.to_owned());
    }
    let mut queue: VecDeque<_> = indegree
        .iter()
        .filter(|(_, n)| **n == 0)
        .map(|(id, _)| id.clone())
        .collect();
    let mut visited = 0;
    while let Some(id) = queue.pop_front() {
        visited += 1;
        for edge in result
            .manifest
            .edges
            .iter()
            .filter(|e| e["from"]["cell"] == id)
        {
            let to = edge["to"]["cell"].as_str().unwrap();
            let count = indegree.get_mut(to).unwrap();
            *count -= 1;
            if *count == 0 {
                queue.push_back(to.to_owned());
            }
        }
    }
    if visited != indegree.len() {
        return Err(Error::new(
            "GRAPH_CYCLE",
            "manifest graph contains a cycle; organisms must be acyclic",
        ));
    }
    for cell in &result.manifest.cells {
        if !["agent", "classifier", "gate", "decide"]
            .iter()
            .any(|kind| cell["kind"] == *kind)
        {
            continue;
        }
        let name = cell["id"].as_str().unwrap();
        if let Some(inputs) = cell["view"]["inputs"].as_array() {
            for input in inputs {
                if !result.signatures[name]
                    .inputs
                    .contains_key(input.as_str().unwrap())
                {
                    return Err(invalid("view names undeclared input"));
                }
            }
        }
        if cell["view"]["graph"] == true && cell["view"].get("cells").is_none() {
            return Err(invalid("view.graph requires view.cells"));
        }
        if let Some(cells) = cell["view"]["cells"].as_array() {
            let mut ancestors = BTreeSet::new();
            let mut pending = vec![name.to_owned()];
            while let Some(current) = pending.pop() {
                for parent in reverse.get(&current).into_iter().flatten() {
                    if ancestors.insert(parent.clone()) {
                        pending.push(parent.clone());
                    }
                }
            }
            for item in cells {
                let parent = item["cell"].as_str().unwrap();
                if !ancestors.contains(parent) {
                    return Err(invalid("view cell is not an ancestor"));
                }
                if let Some(ports) = item["ports"].as_array() {
                    for port in ports {
                        if !result.signatures[parent]
                            .outputs
                            .contains_key(port.as_str().unwrap())
                        {
                            return Err(invalid("view names missing output port"));
                        }
                    }
                }
            }
        }
        for tool in cell["tools"].as_array().into_iter().flatten() {
            let name = tool.as_str().unwrap();
            if registry::signature(name).is_err() && !tools.contains_key(name) {
                return Err(Error::new(
                    "TOOL_UNKNOWN",
                    "agent tool is not host-admitted",
                ));
            }
        }
    }
    Ok(result)
}

pub fn interface_args(manifest: &Manifest, inputs: &Value) -> Result<Value> {
    object(inputs)?;
    let mut args = json!({});
    if let Some(declarations) = manifest.value["interface"]["inputs"].as_object() {
        for (name, target) in declarations {
            if let Some(value) = inputs.get(name) {
                let cell = target["cell"].as_str().unwrap();
                if args.get(cell).is_none() {
                    args[cell] = json!({});
                }
                args[cell][target["port"].as_str().unwrap()] = value.clone();
            }
        }
    }
    Ok(args)
}
