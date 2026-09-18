use crate::{
    Error, Result,
    canonical::{canonical, digest},
    contract::{Budgets, Manifest, Ports, bind_output, check_value, object},
    effects::{Backend, Host},
    graph::{Compiled, Transports, compile, interface_args},
    registry,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{collections::BTreeSet, future::Future, pin::Pin};

pub fn receipt_digest(receipt: &Value) -> Result<String> {
    let mut body = receipt.clone();
    body.as_object_mut()
        .ok_or_else(|| Error::invalid("run receipt"))?
        .remove("digest");
    digest(&body)
}

pub fn outputs(manifest: &Manifest, receipt: &Value) -> Result<Value> {
    let mut result = Map::new();
    if let Some(declarations) = manifest.value["interface"]["outputs"].as_object() {
        for (name, target) in declarations {
            if let Some(value) = receipt["cells"][target["cell"].as_str().unwrap()]["outputs"]
                .get(target["port"].as_str().unwrap())
            {
                result.insert(name.clone(), value.clone());
            }
        }
    }
    Ok(Value::Object(result))
}

fn check_outputs(declarations: &Ports, value: &Value, cell: &str) -> Result<()> {
    let output = object(value)?;
    for name in output.keys() {
        if !declarations.contains_key(name) {
            return Err(Error::new(
                "TYPE_MISMATCH",
                format!("cell {cell} produced undeclared port {name}"),
            ));
        }
    }
    for (name, port) in declarations {
        if let Some(value) = output.get(name) {
            check_value(port, value)?;
        }
    }
    Ok(())
}

fn path(prefix: &str, name: &str) -> String {
    if prefix.is_empty() {
        name.to_owned()
    } else {
        format!("{prefix}/{name}")
    }
}

struct Runtime<'a> {
    store: &'a mut Store,
    host: &'a mut Host,
    transports: &'a Transports,
    budgets: Budgets,
    cells: Map<String, Value>,
    effects: Vec<Value>,
    events: Vec<Value>,
    steps: usize,
    calls: usize,
    work: usize,
    failure: Option<Value>,
    replay: Option<&'a Value>,
}

impl Runtime<'_> {
    fn event(
        &mut self,
        kind: &str,
        path: Option<&str>,
        digest: Option<&str>,
        outcome: Option<&str>,
    ) -> Result<()> {
        if self.events.len() >= 4096 {
            return Err(Error::limit("receipt event count"));
        }
        let mut event = json!({"seq":self.events.len(), "kind":kind});
        if let Some(path) = path {
            event["path"] = json!(path);
        }
        if let Some(digest) = digest {
            event["digest"] = json!(digest);
        }
        if let Some(outcome) = outcome {
            event["outcome"] = json!(outcome);
        }
        self.events.push(event);
        Ok(())
    }

    fn failure(&mut self, path: &str, error: &Error) {
        if self.failure.is_none() {
            self.failure = Some(json!({"code":error.code,"message":error.message,"path":path}));
        }
    }

    fn run_into<'a>(
        &'a mut self,
        compiled: &'a Compiled,
        args: Value,
        prefix: String,
        depth: usize,
    ) -> Pin<Box<dyn Future<Output = Result<String>> + Send + 'a>> {
        Box::pin(async move {
            if depth > self.budgets.max_depth {
                self.failure(
                    &prefix,
                    &Error::new(
                        "DEPTH_EXCEEDED",
                        format!("depth {depth} exceeds maxDepth {}", self.budgets.max_depth),
                    ),
                );
                return Ok("failed".into());
            }
            let mut resolved = BTreeSet::new();
            let mut progress = true;
            while progress && self.failure.is_none() {
                progress = false;
                for cell in &compiled.manifest.cells {
                    let name = cell["id"].as_str().unwrap();
                    if resolved.contains(name) {
                        continue;
                    }
                    let signature = &compiled.signatures[name];
                    let inbound = compiled.inbound.get(name).cloned().unwrap_or_default();
                    if inbound.iter().any(|index| {
                        !resolved.contains(
                            compiled.manifest.edges[*index]["from"]["cell"]
                                .as_str()
                                .unwrap(),
                        )
                    }) {
                        continue;
                    }
                    let mut inputs = Map::new();
                    let mut nonempty = 0;
                    let mut required_missing = false;
                    for (port_name, decl) in &signature.inputs {
                        let mut hits = Vec::new();
                        for index in &inbound {
                            let edge = &compiled.manifest.edges[*index];
                            if edge["to"]["port"] != *port_name {
                                continue;
                            }
                            let from = edge["from"]["cell"].as_str().unwrap();
                            let record = &self.cells[&path(&prefix, from)];
                            let value = if edge["on"] == "fail" && record["status"] == "failed" {
                                record.get("failure")
                            } else if edge["on"] != "fail" && record["status"] == "committed" {
                                record["outputs"].get(edge["from"]["port"].as_str().unwrap())
                            } else {
                                None
                            };
                            let Some(value) = value else {
                                continue;
                            };
                            if let Some(guard) = edge.get("guard") {
                                let actual = match guard["field"].as_str() {
                                    Some(field) => value.get(field),
                                    None => Some(value),
                                };
                                if actual != Some(&guard["equals"]) {
                                    continue;
                                }
                            }
                            let producer = &compiled.signatures[from].outputs
                                [edge["from"]["port"].as_str().unwrap()];
                            if decl["many"] == true && producer["many"] == true {
                                if let Some(items) = value.as_array() {
                                    hits.extend(items.iter().cloned());
                                } else {
                                    hits.push(value.clone());
                                }
                            } else {
                                hits.push(value.clone());
                            }
                        }
                        if !hits.is_empty() {
                            nonempty += 1;
                        } else if decl["optional"] != true {
                            required_missing = true;
                        }
                        if decl["many"] == true {
                            if !hits.is_empty() || decl["optional"] == true {
                                inputs.insert(port_name.clone(), json!(hits));
                            }
                        } else if let Some(value) = hits.first() {
                            inputs.insert(port_name.clone(), value.clone());
                        }
                    }
                    let cell_path = path(&prefix, name);
                    if !signature.inputs.is_empty() && (nonempty == 0 || required_missing) {
                        self.cells
                            .insert(cell_path.clone(), json!({"status":"skipped","work":0}));
                        self.event("cell.skip", Some(&cell_path), None, None)?;
                        resolved.insert(name.to_owned());
                        progress = true;
                        continue;
                    }
                    if self.steps + 1 > self.budgets.max_steps {
                        self.failure(&cell_path, &Error::limit("maxSteps exhausted"));
                        break;
                    }
                    self.steps += 1;
                    let before = self.work;
                    self.work += 100;
                    let inputs = Value::Object(inputs);
                    let result = async {
                        for (name, port) in &signature.inputs {
                            if let Some(value) = inputs.get(name) {
                                check_value(port, value)?;
                            }
                        }
                        let activation = self
                            .activate(cell, &inputs, &args, compiled, &cell_path, depth)
                            .await?;
                        check_outputs(&signature.outputs, &activation["outputs"], name)?;
                        Ok::<_, Error>(activation)
                    }
                    .await;
                    resolved.insert(name.to_owned());
                    progress = true;
                    match result {
                        Ok(activation) => {
                            let mut record = json!({"status":"committed","work":self.work-before});
                            for (field, value) in object(&activation)? {
                                if field != "outputs" || !object(value)?.is_empty() {
                                    record[field] = value.clone();
                                }
                            }
                            let via = compiled.via.get(name).map(String::as_str).or_else(|| {
                                self.replay
                                    .and_then(|r| r["cells"][&cell_path]["via"].as_str())
                            });
                            if let Some(via) = via {
                                record["via"] = json!(via);
                            }
                            if cell["kind"] == "slot" {
                                record["slot"] = json!({"name":cell["name"],"mode":cell["mode"]});
                            }
                            self.cells.insert(cell_path.clone(), record);
                            self.event("cell.commit", Some(&cell_path), None, None)?;
                        }
                        Err(error) => {
                            let mut record =
                                json!({"status":"failed","work":self.work-before,"failure":error});
                            if cell["kind"] == "slot" {
                                record["slot"] = json!({"name":cell["name"],"mode":cell["mode"]});
                            }
                            self.cells.insert(cell_path.clone(), record);
                            self.event("cell.fail", Some(&cell_path), None, None)?;
                            if compiled
                                .manifest
                                .edges
                                .iter()
                                .any(|e| e["from"]["cell"] == name && e["on"] == "fail")
                            {
                                self.failure = None;
                            } else {
                                self.failure(&cell_path, &error);
                                break;
                            }
                        }
                    }
                    if self.work > self.budgets.max_work {
                        self.failure(&cell_path, &Error::limit("maxWork exhausted"));
                        break;
                    }
                }
            }
            Ok(if self.failure.is_some() {
                "failed"
            } else if resolved.len() != compiled.manifest.cells.len() {
                "stuck"
            } else {
                "complete"
            }
            .into())
        })
    }

    fn inner_outputs(&self, compiled: &Compiled, prefix: &str) -> Value {
        let mut output = Map::new();
        if let Some(declarations) = compiled.manifest.value["interface"]["outputs"].as_object() {
            for (name, target) in declarations {
                let record = self
                    .cells
                    .get(&path(prefix, target["cell"].as_str().unwrap()));
                if let Some(value) =
                    record.and_then(|r| r["outputs"].get(target["port"].as_str().unwrap()))
                {
                    output.insert(name.clone(), value.clone());
                }
            }
        }
        Value::Object(output)
    }

    async fn child(
        &mut self,
        compiled: &Compiled,
        inputs: &Value,
        path: &str,
        depth: usize,
    ) -> Result<Value> {
        let args = interface_args(&compiled.manifest, inputs)?;
        let outcome = self
            .run_into(compiled, args, path.to_owned(), depth + 1)
            .await?;
        if outcome != "complete" {
            return Err(self
                .failure
                .as_ref()
                .map(|v| Error::new(v["code"].as_str().unwrap(), v["message"].as_str().unwrap()))
                .unwrap_or_else(|| Error::new("STUCK", "inner run stuck")));
        }
        Ok(self.inner_outputs(compiled, path))
    }

    async fn tool(
        &mut self,
        name: &str,
        inputs: &Value,
        request_path: &str,
        event_path: &str,
        timeout: u64,
    ) -> Result<(Value, String)> {
        let tool = self
            .host
            .tools
            .get(name)
            .cloned()
            .ok_or_else(|| Error::new("TOOL_UNKNOWN", "tool not configured"))?;
        let request_digest = digest(
            &json!({"contract":"morphogen.tool-effect.v1","path":request_path,"tool":name,"effect":tool.effect,"inputs":inputs}),
        )?;
        self.event("effect", Some(event_path), Some(&request_digest), None)?;
        let receipt = if let Some(replay) = &mut self.host.replay {
            replay
                .get_mut(&request_digest)
                .and_then(|q| q.pop_front())
                .ok_or_else(|| Error::new("EFFECT_UNBOUND", "tool replay missing"))?
        } else {
            let result = match &tool.backend {
                Backend::Scripted { responses } => responses.get(&canonical(inputs)?).cloned().ok_or_else(|| Error::new("TOOL_FAILED", "scripted tool result missing")),
                backend => self.host.execute_backend(name, backend, &json!({"inputs":inputs,"requestDigest":request_digest,"idempotencyKey":request_digest}), tool.max_bytes, timeout).await.map(|(v, _)| v),
            };
            match result {
                Ok(output) => {
                    json!({"requestDigest":request_digest,"executor":format!("tool:{name}"),"output":output})
                }
                Err(error) => {
                    json!({"requestDigest":request_digest,"executor":format!("tool:{name}"),"error":error})
                }
            }
        };
        self.effects.push(receipt.clone());
        if let Some(error) = receipt.get("error") {
            return Err(serde_json::from_value(error.clone())?);
        }
        let output = receipt["output"].clone();
        let bytes = canonical(&output)?.len();
        if bytes > tool.max_bytes {
            return Err(Error::limit("tool output bytes"));
        }
        self.work += tool.signature.cost + bytes;
        check_outputs(&tool.signature.outputs, &output, name)?;
        Ok((output, request_digest))
    }

    async fn activate(
        &mut self,
        cell: &Value,
        inputs: &Value,
        args: &Value,
        compiled: &Compiled,
        cell_path: &str,
        depth: usize,
    ) -> Result<Value> {
        let name = cell["id"].as_str().unwrap();
        let kind = cell["kind"].as_str().unwrap();
        match kind {
            "input" | "const" => {
                let mut output = Map::new();
                for (port, decl) in object(&cell["outputs"])? {
                    let value = if kind == "const" {
                        decl.get("value")
                    } else {
                        args[name].get(port)
                    };
                    if let Some(value) = value {
                        check_value(decl, value)?;
                        if decl["type"] == "ref"
                            && self.store.get("values", value.as_str().unwrap())?.is_none()
                        {
                            return Err(Error::new(
                                "STORE_MISS",
                                "input/const reference does not resolve",
                            ));
                        }
                        output.insert(port.clone(), value.clone());
                    }
                }
                Ok(json!({"outputs":output}))
            }
            "fn" => {
                let function = cell["fn"].as_str().unwrap();
                self.work += registry::signature(function)?.cost;
                let (outputs, extra) = registry::invoke(function, inputs)?;
                self.work += extra;
                Ok(json!({"outputs":outputs}))
            }
            "store" => {
                self.work += canonical(&inputs["data"])?.len();
                let reference = self.store.put("values", &inputs["data"])?;
                Ok(json!({"outputs":{"ref":reference}}))
            }
            "load" => {
                let value = self
                    .store
                    .get("values", inputs["ref"].as_str().unwrap())?
                    .ok_or_else(|| Error::new("INPUT_MISSING", "reference not in store"))?;
                self.work += canonical(&value)?.len();
                Ok(json!({"outputs":{"data":value}}))
            }
            "slot" => {
                let slot = cell["name"].as_str().unwrap();
                let value = if cell["mode"] == "write" {
                    self.work += canonical(&inputs["data"])?.len();
                    self.store.set_slot(slot, &inputs["data"])?;
                    Some(inputs["data"].clone())
                } else if let Some(replay) = self.replay {
                    replay["cells"][cell_path]["outputs"].get("data").cloned()
                } else {
                    self.store
                        .get_slot(slot)?
                        .or_else(|| cell.get("default").cloned())
                };
                let value = value.ok_or_else(|| {
                    Error::new(
                        "INPUT_MISSING",
                        format!(
                            "slot cell \"{name}\": slot \"{slot}\" is empty and declares no default"
                        ),
                    )
                })?;
                Ok(json!({"outputs":{"data":value}}))
            }
            "spawn" => {
                let child = Manifest::parse(&inputs["manifest"])?;
                let digest = self.store.admit(&child)?;
                let child = compile(
                    child,
                    self.store,
                    &self.host.tool_signatures(),
                    self.transports,
                    depth + 1,
                )?;
                let data = self
                    .child(
                        &child,
                        inputs.get("args").unwrap_or(&json!({})),
                        cell_path,
                        depth,
                    )
                    .await?;
                Ok(json!({"outputs":{"data":data,"digest":digest}}))
            }
            "organism" => Ok(
                json!({"outputs":self.child(&compiled.children[name], inputs, cell_path, depth).await?}),
            ),
            "repeat" => {
                let child = &compiled.children[name];
                let mut carried = Map::new();
                let mut result = json!({});
                let mut rounds = 0;
                for round in 0..cell["maxRounds"].as_u64().unwrap() {
                    rounds += 1;
                    let mut args = object(inputs)?.clone();
                    args.extend(carried.clone());
                    result = self
                        .child(
                            child,
                            &Value::Object(args),
                            &format!("{cell_path}/r{round}"),
                            depth,
                        )
                        .await?;
                    if let Some(carry) = cell["carry"].as_object() {
                        for (output, input) in carry {
                            if let Some(value) = result.get(output) {
                                carried.insert(input.as_str().unwrap().to_owned(), value.clone());
                            }
                        }
                    }
                    if let Some(until) = cell.get("until") {
                        let value = result.get(until["output"].as_str().unwrap());
                        let value = match until["field"].as_str() {
                            Some(field) => value.and_then(|v| v.get(field)),
                            None => value,
                        };
                        if value == Some(&until["equals"]) {
                            break;
                        }
                    }
                }
                let mut activation = json!({"outputs":result});
                if rounds > 1 {
                    activation["rounds"] = json!(rounds);
                }
                Ok(activation)
            }
            "each" => {
                let over = cell["over"].as_str().unwrap();
                let items = inputs[over]
                    .as_array()
                    .ok_or_else(|| Error::new("TYPE_MISMATCH", "each requires a list"))?;
                if items.len() > cell["maxItems"].as_u64().unwrap() as usize {
                    return Err(Error::limit("each maxItems"));
                }
                let child = &compiled.children[name];
                let mut results = Map::new();
                for name in object(&child.manifest.value["interface"]["outputs"])?.keys() {
                    results.insert(name.clone(), json!([]));
                }
                for (index, item) in items.iter().enumerate() {
                    let mut args = inputs.clone();
                    args[over] = item.clone();
                    let result = self
                        .child(child, &args, &format!("{cell_path}/i{index}"), depth)
                        .await?;
                    for (name, value) in object(&result)? {
                        results
                            .get_mut(name)
                            .unwrap()
                            .as_array_mut()
                            .unwrap()
                            .push(value.clone());
                    }
                }
                let mut activation = json!({"outputs":results});
                if !items.is_empty() {
                    activation["items"] = json!(items.len());
                }
                Ok(activation)
            }
            "tool" => {
                let timeout = cell["budget"]["maxEffectMs"].as_u64().unwrap_or(30_000);
                let (output, effect) = self
                    .tool(
                        cell["tool"].as_str().unwrap(),
                        inputs,
                        cell_path,
                        cell_path,
                        timeout,
                    )
                    .await?;
                Ok(json!({"outputs":output,"effectDigest":effect}))
            }
            "agent" | "classifier" | "gate" => self.agent(cell, inputs, compiled, cell_path).await,
            _ => Err(Error::new("MANIFEST_INVALID", "unsupported native cell")),
        }
    }

    async fn agent(
        &mut self,
        cell: &Value,
        inputs: &Value,
        compiled: &Compiled,
        cell_path: &str,
    ) -> Result<Value> {
        let name = cell["id"].as_str().unwrap();
        let max_context = cell["budget"]["maxContextBytes"]
            .as_u64()
            .unwrap_or(self.budgets.max_context_bytes as u64)
            .min(self.budgets.max_context_bytes as u64) as usize;
        let max_output = cell["budget"]["maxOutputBytes"]
            .as_u64()
            .unwrap_or(self.budgets.max_output_bytes as u64)
            .min(self.budgets.max_output_bytes as u64) as usize;
        let tools: Vec<_> = cell["tools"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .collect();
        let max_turns = cell["budget"]["maxTurns"]
            .as_u64()
            .unwrap_or(if tools.is_empty() { 1 } else { 8 });
        let attempts = cell["retry"]["attempts"].as_u64().unwrap_or(1);
        let timeout = cell["budget"]["maxEffectMs"].as_u64().unwrap_or(120_000);
        let prefix = cell_path
            .rsplit_once('/')
            .map(|(prefix, _)| prefix)
            .unwrap_or("");
        let mut view_inputs = Map::new();
        for (key, value) in object(inputs)? {
            if cell["view"]["inputs"] == "*"
                || cell["view"]["inputs"]
                    .as_array()
                    .is_some_and(|names| names.contains(&json!(key)))
            {
                view_inputs.insert(key.clone(), value.clone());
            }
        }
        let mut cell_view = Map::new();
        for item in cell["view"]["cells"].as_array().into_iter().flatten() {
            let target = item["cell"].as_str().unwrap();
            let mut value = Value::Null;
            if let Some(record) = self.cells.get(&path(prefix, target)) {
                value = json!({"status":record["status"]});
                if let Some(outputs) = record["outputs"].as_object() {
                    let mut outputs = outputs.clone();
                    if let Some(wanted) = item["ports"].as_array() {
                        outputs.retain(|key, _| wanted.contains(&json!(key)));
                    }
                    value["outputs"] = Value::Object(outputs);
                }
            }
            cell_view.insert(target.to_owned(), value);
        }
        let mut log = Vec::new();
        for turn in 0..max_turns {
            let mut context = json!({"inputs":view_inputs,"turn":turn});
            if let Some(note) = cell["view"].get("note") {
                context["note"] = note.clone();
            }
            if !cell_view.is_empty() {
                context["cells"] = json!(cell_view);
            }
            if cell["view"]["graph"] == true {
                let edges: Vec<_> = compiled.manifest.edges.iter().filter(|edge| {
                    cell_view.contains_key(edge["from"]["cell"].as_str().unwrap())
                        && (edge["to"]["cell"] == name || cell_view.contains_key(edge["to"]["cell"].as_str().unwrap()))
                }).map(|edge| {
                    let mut result = json!({"from":format!("{}.{}",edge["from"]["cell"].as_str().unwrap(),edge["from"]["port"].as_str().unwrap()),"to":format!("{}.{}",edge["to"]["cell"].as_str().unwrap(),edge["to"]["port"].as_str().unwrap())});
                    if let Some(guard) = edge.get("guard") { result["guard"] = guard.clone(); }
                    result
                }).collect();
                context["graph"] = json!({"edges":edges});
            }
            if !log.is_empty() {
                context["toolLog"] = json!(log);
            }
            let context_bytes = canonical(&context)?.len();
            if context_bytes > max_context {
                return Err(Error::limit(format!(
                    "context view {context_bytes}B exceeds maxContextBytes {max_context}B"
                )));
            }
            let mut request = json!({"contract":"morphogen.effect.v1","cellId":name,"kind":cell["kind"],"prompt":cell["prompt"],"context":context,"output":cell["output"],"budget":{"maxContextBytes":max_context,"maxOutputBytes":max_output}});
            if let Some(route) = cell.get("route") {
                request["route"] = route.clone();
            }
            let request_digest = digest(&request)?;
            let mut last_error = Error::new("EFFECT_FAILED", "effect did not settle");
            let mut tool_call = None;
            for _ in 0..attempts {
                if self.calls + 1 > self.budgets.max_agent_calls {
                    return Err(Error::limit("maxAgentCalls exhausted"));
                }
                self.calls += 1;
                self.work += 500 + context_bytes;
                self.event("effect", Some(cell_path), Some(&request_digest), None)?;
                let receipt = self.host.effect(&request, timeout).await?;
                self.effects.push(receipt.clone());
                let retryable = receipt["retryable"] != false;
                if let Some(error) = receipt.get("error") {
                    last_error = serde_json::from_value(error.clone())?;
                    if !retryable {
                        break;
                    } else {
                        continue;
                    }
                }
                let raw = receipt["output"].clone();
                let out_bytes = canonical(&raw)?.len();
                if out_bytes > max_output {
                    last_error = Error::limit(format!(
                        "effect output {out_bytes}B exceeds maxOutputBytes {max_output}B"
                    ));
                    if !retryable {
                        break;
                    } else {
                        continue;
                    }
                }
                self.work += out_bytes;
                if raw["tool"]
                    .as_str()
                    .is_some_and(|tool| tools.contains(&tool))
                    && raw["inputs"].is_object()
                {
                    tool_call = Some(raw);
                    break;
                }
                match bind_output(&cell["output"], raw.clone()).map_err(|error| {
                    if cell["output"]["kind"] == "choice" {
                        Error::new(
                            "EFFECT_UNPARSEABLE",
                            format!(
                                "cell \"{name}\": output {} is not a declared label",
                                canonical(&raw).unwrap_or_default()
                            ),
                        )
                    } else {
                        error
                    }
                }) {
                    Ok(output) => {
                        let final_output = cell["shadow"]
                            .get("take")
                            .cloned()
                            .unwrap_or_else(|| output.clone());
                        let mut activation =
                            json!({"outputs":{"out":final_output},"effectDigest":request_digest});
                        if final_output != output {
                            activation["shadowOut"] = output;
                        }
                        if !log.is_empty() {
                            activation["toolCalls"] = json!(log);
                        }
                        return Ok(activation);
                    }
                    Err(error) => {
                        last_error = error;
                        if !retryable {
                            break;
                        }
                    }
                }
            }
            let call = tool_call.ok_or(last_error)?;
            let tool = call["tool"].as_str().unwrap();
            let function = registry::signature(tool).ok();
            let signature = function
                .clone()
                .or_else(|| self.host.tools.get(tool).map(|t| t.signature.clone()))
                .ok_or_else(|| Error::new("TOOL_UNKNOWN", "agent tool is not configured"))?;
            for (port, decl) in &signature.inputs {
                if let Some(value) = call["inputs"].get(port) {
                    check_value(decl, value)?;
                } else if decl["optional"] != true {
                    return Err(Error::new("EFFECT_FAILED", "tool missing required input"));
                }
            }
            let output = if function.is_some() {
                self.work += signature.cost;
                let (value, extra) = registry::invoke(tool, &call["inputs"])?;
                self.work += extra;
                value
            } else {
                self.tool(
                    tool,
                    &call["inputs"],
                    &format!("{cell_path}/t{turn}"),
                    cell_path,
                    timeout,
                )
                .await?
                .0
            };
            check_outputs(&signature.outputs, &output, name)?;
            log.push(json!({"fn":tool,"inputs":call["inputs"],"output":output}));
        }
        Err(Error::limit(format!(
            "cell \"{name}\" produced no final output within maxTurns {max_turns}"
        )))
    }
}

pub async fn run(
    manifest: Manifest,
    args: Value,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
    replay: Option<&Value>,
) -> Result<Value> {
    object(&args)?;
    if canonical(&args)?.len() > 1_048_576 {
        return Err(Error::limit("run argument bytes"));
    }
    let manifest_digest = manifest.digest()?;
    let budgets = manifest.budgets.clone();
    let compiled = compile(manifest, store, &host.tool_signatures(), transports, 0)?;
    let mut runtime = Runtime {
        store,
        host,
        transports,
        budgets,
        cells: Map::new(),
        effects: Vec::new(),
        events: Vec::new(),
        steps: 0,
        calls: 0,
        work: 0,
        failure: None,
        replay,
    };
    runtime.event("run.start", None, Some(&manifest_digest), None)?;
    let outcome = runtime
        .run_into(&compiled, args.clone(), String::new(), 0)
        .await?;
    runtime.event("run.end", None, None, Some(&outcome))?;
    let mut receipt = json!({
        "contract":replay.and_then(|r| r.get("contract")).cloned().unwrap_or(json!("algal.run.v1")),
        "runtime":replay.and_then(|r| r.get("runtime")).cloned().unwrap_or(json!({"name":"algal","version":env!("CARGO_PKG_VERSION")})),
        "manifestDigest":manifest_digest,"manifestKey":compiled.manifest.value["key"],"args":args,
        "outcome":outcome,"cells":runtime.cells,"effects":runtime.effects,"events":runtime.events,
        "work":{"steps":runtime.steps,"agentCalls":runtime.calls,"units":runtime.work},
    });
    if let Some(failure) = runtime.failure {
        receipt["failure"] = failure;
    }
    receipt["digest"] = json!(receipt_digest(&receipt)?);
    Ok(receipt)
}

pub async fn verify(
    receipt: &Value,
    manifest: Manifest,
    store: &Store,
    tools: &Host,
) -> Result<Value> {
    if receipt["contract"] != "algal.run.v1" && receipt["contract"] != "morphogen.run.v1" {
        return Err(Error::invalid("run receipt contract"));
    }
    if receipt["digest"] != receipt_digest(receipt)?
        || receipt["manifestDigest"] != manifest.digest()?
    {
        return Ok(json!({"ok":false,"mismatches":["receipt or manifest digest mismatch"]}));
    }
    let mut host = Host::replay(&receipt["effects"])?;
    host.tools = tools.tools.clone();
    let replayed = run(
        manifest,
        receipt["args"].clone(),
        &mut store.overlay(),
        &mut host,
        &Transports::new(),
        Some(receipt),
    )
    .await?;
    let ok = canonical(receipt)? == canonical(&replayed)?;
    Ok(
        json!({"ok":ok,"digest":replayed["digest"],"outcome":replayed["outcome"],"mismatches":if ok {json!([])} else {json!(["deterministic replay differs"])} }),
    )
}
