use crate::{
    Error, Result,
    canonical::{canonical, digest},
    contract::{Budgets, Manifest, Ports, bind_output, check_value, object},
    effects::{Backend, Host, ToolBackend},
    graph::{Compiled, Transports, compile, interface_args},
    registry,
    store::Store,
};
use serde_json::{Map, Value, json};
use std::{
    collections::{BTreeMap, BTreeSet},
    future::Future,
    pin::Pin,
};

/// Fuel budget for a single `expr` cell activation — mirrors
/// `BOUNDS.maxExprFuel` in src/contract.ts. The run-level `max_work` budget
/// still bounds total burn; this caps the synchronous eval itself.
const MAX_EXPR_FUEL: u64 = 100_000;

/// The `runtime` stamp on a fresh receipt records the shared `algal.run.v1`
/// semantics version, not the crate release — it must match `RUNTIME_VERSION`
/// in src/run.ts so the reference and native runtimes produce byte-identical
/// receipts for the same run. Implementation identity belongs to build_info.
const RUNTIME_STAMP_VERSION: &str = "0.1.0";

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

struct BoundedEffect<'a> {
    request: &'a Value,
    cell_path: &'a str,
    timeout: u64,
    attempts: u64,
    context_bytes: usize,
    max_output: usize,
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
    suspended: bool,
    /// Host admission/publication failed without an effect receipt to replay.
    effect_failed_without_receipt: bool,
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
            while progress && self.failure.is_none() && !self.suspended {
                progress = false;
                'cells: for cell in &compiled.manifest.cells {
                    let name = cell["id"].as_str().unwrap();
                    let cell_path = path(&prefix, name);
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
                    // Guards run once in manifest edge order, after all
                    // producers resolve. Keep their errors in the run receipt.
                    let mut delivered = BTreeMap::new();
                    for index in &inbound {
                        let edge = &compiled.manifest.edges[*index];
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
                            let hit = if let Some(expr) = guard.get("expr") {
                                let mut env = Map::new();
                                env.insert("value".to_string(), value.clone());
                                match algal_expr::run(&expr["program"], &env, MAX_EXPR_FUEL) {
                                    Ok((v, fuel)) => {
                                        self.work += fuel as usize;
                                        match v {
                                            Value::Bool(b) => b,
                                            other => {
                                                let got = match &other {
                                                    Value::Null => "null",
                                                    Value::Number(_) => "number",
                                                    Value::String(_) => "string",
                                                    Value::Array(_) => "list",
                                                    Value::Object(_) => "object",
                                                    Value::Bool(_) => "bool",
                                                };
                                                self.failure(&cell_path, &Error::new(
                                                    "GUARD_INVALID",
                                                    format!(
                                                        "guard expr must produce boolean, got {got}"
                                                    ),
                                                ));
                                                break 'cells;
                                            }
                                        }
                                    }
                                    Err((e, fuel)) => {
                                        self.work += fuel as usize;
                                        let detail = canonical(&e.to_json())
                                            .unwrap_or_else(|_| e.to_json().to_string());
                                        self.failure(
                                            &cell_path,
                                            &Error::new(
                                                "GUARD_INVALID",
                                                format!("guard expr {detail}"),
                                            ),
                                        );
                                        break 'cells;
                                    }
                                }
                            } else {
                                let actual = match guard["field"].as_str() {
                                    Some(field) => value.get(field),
                                    None => Some(value),
                                };
                                actual == Some(&guard["equals"])
                            };
                            if self.work > self.budgets.max_work {
                                self.failure(&cell_path, &Error::limit("maxWork exhausted"));
                                break 'cells;
                            }
                            if !hit {
                                continue;
                            }
                        }
                        delivered.insert(*index, value.clone());
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
                            let Some(value) = delivered.get(index) else {
                                continue;
                            };
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
                            // A host failure without a replayable effect receipt,
                            // or a poisoned journal, cannot authorize guest recovery
                            // or erase host-only uncertainty through serialization.
                            if self.effect_failed_without_receipt || self.host.journal_is_poisoned()
                            {
                                return Err(error);
                            }
                            // suspension is not failure: the cell's effect
                            // asked the host to pause the process. The attempt
                            // is already on the receipt — record the
                            // suspension, halt the sweep, and leave fail
                            // edges dead.
                            if error.code == "EFFECT_SUSPENDED" {
                                let mut record =
                                    json!({"status":"suspended","work":self.work-before});
                                if cell["kind"] == "slot" {
                                    record["slot"] =
                                        json!({"name":cell["name"],"mode":cell["mode"]});
                                }
                                self.cells.insert(cell_path.clone(), record);
                                self.event("cell.suspend", Some(&cell_path), None, None)?;
                                self.suspended = true;
                                break;
                            }
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
            Ok(if self.suspended {
                "suspended"
            } else if self.failure.is_some() {
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
            if self.suspended {
                return Err(Error::new(
                    "EFFECT_SUSPENDED",
                    format!("inner run at \"{path}\" suspended"),
                ));
            }
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
            &json!({"contract":"algal.tool-effect.v1","path":request_path,"tool":name,"effect":tool.effect,"inputs":inputs}),
        )?;
        self.event("effect", Some(event_path), Some(&request_digest), None)?;
        // Resume keeps the checkpoint's recorded tool effects but lets a
        // digest miss fall through to the live tool — strict replay (verify)
        // treats a miss as unbound.
        let replayed = if let Some(replay) = self.host.replay.as_mut() {
            let hit = replay.get_mut(&request_digest).and_then(|q| q.pop_front());
            if hit.is_none() && !self.host.replay_fallthrough {
                return Err(Error::new("EFFECT_UNBOUND", "tool replay missing"));
            }
            hit
        } else {
            None
        };
        let idempotency_key = self.host.tool_idempotency_key(&request_digest)?;
        let replayed = if replayed.is_some() || self.host.journal.is_none() {
            replayed
        } else {
            let configuration_digest = tool.configuration_digest.clone().ok_or_else(|| {
                self.host.journal_poison();
                Error::new(
                    "RECOVERY_BLOCKED",
                    "tool has no stable journal configuration",
                )
            })?;
            self.host.journal_before(crate::journal::Binding {
                request_digest: request_digest.clone(),
                executor: format!("tool:{name}"),
                configuration_digest,
                idempotency_key: idempotency_key.clone(),
                recovery: if tool.effect == "read" {
                    "read"
                } else {
                    "never"
                }
                .into(),
            })?
        };
        let receipt = match replayed {
            Some(receipt) => receipt,
            None => {
                let result = match &tool.backend {
                    ToolBackend::EvidenceDenied(activated) => {
                        activated.store(true, std::sync::atomic::Ordering::Relaxed);
                        Err(Error::new("VERIFY_FAILED", "portable evidence cannot activate tools"))
                    },
                    ToolBackend::DemoCrash(fixture) => fixture.run(&idempotency_key, timeout).await,
                    ToolBackend::External(Backend::Scripted { responses }) => responses.get(&canonical(inputs)?).cloned().ok_or_else(|| Error::new("TOOL_FAILED", "scripted tool result missing")),
                    ToolBackend::External(backend) => self.host.execute_backend(name, backend, &json!({"inputs":inputs,"requestDigest":request_digest,"idempotencyKey":idempotency_key}), tool.max_bytes, timeout).await.map(|(v, _)| v),
                    ToolBackend::MailboxSend => self.host.mailbox.as_ref().ok_or_else(|| Error::new("CAPABILITY_DENIED", "mailbox host is not admitted")).and_then(|mailbox| mailbox.send(inputs["mailbox"].as_str().unwrap_or(""), inputs["message"].clone(), &idempotency_key)),
                    ToolBackend::MailboxReceive => self.host.mailbox.as_ref().ok_or_else(|| Error::new("CAPABILITY_DENIED", "mailbox host is not admitted")).and_then(|mailbox| mailbox.receive(inputs["mailbox"].as_str().unwrap_or(""))),
                };
                let receipt = match result {
                    Ok(output) => {
                        json!({"requestDigest":request_digest,"executor":format!("tool:{name}"),"output":output})
                    }
                    Err(error) => {
                        if error.uncertain && self.host.journal.is_some() {
                            self.host.journal_poison();
                            return Err(error);
                        }
                        let uncertain = error.uncertain;
                        let suspended = error.code == "EFFECT_SUSPENDED";
                        let wake = error.wake.clone();
                        let mut receipt = json!({"requestDigest":request_digest,"executor":format!("tool:{name}"),"error":error});
                        if uncertain {
                            receipt["retryable"] = json!(false);
                        }
                        if suspended {
                            receipt["retryable"] = json!(false);
                            if !wake.is_empty() {
                                receipt["wake"] = json!(
                                    crate::capabilities::parse_wake_capabilities(&json!(wake))?
                                );
                            }
                        }
                        receipt
                    }
                };
                self.host.journal_after_dispatch(&receipt)?;
                receipt
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
                        if decl["type"] == "ref" {
                            let refs = if decl["many"] == true {
                                value
                                    .as_array()
                                    .ok_or_else(|| Error::invalid("reference array"))?
                                    .iter()
                                    .collect::<Vec<_>>()
                            } else {
                                vec![value]
                            };
                            for reference in refs {
                                let key = reference
                                    .as_str()
                                    .ok_or_else(|| Error::invalid("reference digest"))?;
                                if self.store.get("values", key)?.is_none() {
                                    return Err(Error::new(
                                        "STORE_MISS",
                                        "input/const reference does not resolve",
                                    ));
                                }
                            }
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
            "expr" => {
                let env = inputs.as_object().cloned().unwrap_or_default();
                match algal_expr::run(&cell["expr"]["program"], &env, MAX_EXPR_FUEL) {
                    Ok((value, fuel)) => {
                        self.work += fuel as usize;
                        Ok(json!({"outputs":{"out":value}}))
                    }
                    Err((e, fuel)) => {
                        self.work += fuel as usize;
                        Err(if e.code == "EXPR_FUEL" {
                            Error::limit("expr fuel exhausted")
                        } else {
                            let detail =
                                canonical(&e.to_json()).unwrap_or_else(|_| e.to_json().to_string());
                            Error::new("EXPR_FAILED", format!("expr {detail}"))
                        })
                    }
                }
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
                    if self
                        .replay
                        .is_none_or(|replay| replay["cells"][cell_path]["status"] != "committed")
                    {
                        self.store.set_slot(slot, &inputs["data"])?;
                    }
                    Some(inputs["data"].clone())
                } else if let Some(record) = self
                    .replay
                    .and_then(|replay| replay["cells"].get(cell_path))
                {
                    record["outputs"].get("data").cloned()
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
                for side in ["inputs", "outputs"] {
                    if let Some(ports) = child.manifest.value["interface"][side].as_object() {
                        for target in ports.values() {
                            let cell = target["cell"].as_str().unwrap();
                            let port = target["port"].as_str().unwrap();
                            if child.signatures[cell].outputs[port]["type"] == "cap" {
                                return Err(Error::new(
                                    "TYPE_MISMATCH",
                                    "spawn cannot expose capability ports through json; use a typed organism cell",
                                ));
                            }
                        }
                    }
                }
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
            "recall" => self.recall(cell, inputs, cell_path).await,
            "agent" | "classifier" | "gate" | "decide" => {
                self.agent(cell, inputs, compiled, cell_path).await
            }
            _ => Err(Error::new("MANIFEST_INVALID", "unsupported native cell")),
        }
    }

    async fn bounded_effect<F>(
        &mut self,
        effect: BoundedEffect<'_>,
        bind: F,
    ) -> Result<(Value, String)>
    where
        F: Fn(&Value) -> Result<Value>,
    {
        let request_digest = digest(effect.request)?;
        let mut last_error = Error::new("EFFECT_FAILED", "effect did not settle");
        for _ in 0..effect.attempts {
            if self.calls + 1 > self.budgets.max_agent_calls {
                return Err(Error::limit("maxAgentCalls exhausted"));
            }
            self.calls += 1;
            self.work += 500 + effect.context_bytes;
            self.event(
                "effect",
                Some(effect.cell_path),
                Some(&request_digest),
                None,
            )?;
            let receipt = self
                .host
                .effect(effect.request, effect.timeout, Some(&mut *self.store))
                .await
                .inspect_err(|_| {
                    self.effect_failed_without_receipt = true;
                })?;
            self.effects.push(receipt.clone());
            let retryable = receipt["retryable"] != false;
            if let Some(error) = receipt.get("error") {
                last_error = serde_json::from_value(error.clone())?;
                if !retryable {
                    break;
                }
                continue;
            }
            let raw = &receipt["output"];
            let output_bytes = canonical(raw)?.len();
            if output_bytes > effect.max_output {
                last_error = Error::limit(format!(
                    "effect output {output_bytes}B exceeds maxOutputBytes {}B",
                    effect.max_output
                ));
                if !retryable {
                    break;
                }
                continue;
            }
            self.work += output_bytes;
            match bind(raw) {
                Ok(bound) => return Ok((bound, request_digest)),
                Err(error) => {
                    last_error = error;
                    if !retryable {
                        break;
                    }
                }
            }
        }
        Err(last_error)
    }

    async fn recall(&mut self, cell: &Value, inputs: &Value, cell_path: &str) -> Result<Value> {
        let name = cell["id"].as_str().unwrap();
        let env = inputs.as_object().cloned().unwrap_or_default();
        let (query, fuel) = match algal_expr::run(&cell["query"]["program"], &env, MAX_EXPR_FUEL) {
            Ok(result) => result,
            Err((error, fuel)) => {
                self.work += fuel as usize;
                return Err(if error.code == "EXPR_FUEL" {
                    Error::limit("recall query fuel exhausted")
                } else {
                    Error::new(
                        "EXPR_FAILED",
                        format!(
                            "recall query {}",
                            canonical(&error.to_json()).unwrap_or_default()
                        ),
                    )
                });
            }
        };
        self.work += fuel as usize;
        let query = query.as_str().ok_or_else(|| {
            Error::new(
                "EXPR_FAILED",
                format!("recall cell \"{name}\" query must evaluate to text"),
            )
        })?;
        if query.is_empty() {
            return Err(Error::new(
                "EXPR_FAILED",
                format!("recall cell \"{name}\" query must not be empty"),
            ));
        }
        if query.len() > crate::contract::MAX_RECALL_QUERY_BYTES {
            return Err(Error::limit(format!(
                "recall cell \"{name}\" query exceeds maxRecallQueryBytes {}",
                crate::contract::MAX_RECALL_QUERY_BYTES
            )));
        }
        let max_context = cell["budget"]["maxContextBytes"]
            .as_u64()
            .unwrap_or(self.budgets.max_context_bytes as u64)
            .min(self.budgets.max_context_bytes as u64) as usize;
        let max_output = cell["budget"]["maxOutputBytes"]
            .as_u64()
            .unwrap_or(self.budgets.max_output_bytes as u64)
            .min(self.budgets.max_output_bytes as u64) as usize;
        let context = json!({"inputs":inputs});
        let context_bytes = canonical(&context)?.len();
        if context_bytes > max_context {
            return Err(Error::limit(format!(
                "recall context {context_bytes}B exceeds maxContextBytes {max_context}B"
            )));
        }
        let k = cell["k"].as_u64().unwrap_or(8) as usize;
        let embedder = cell["embedder"].as_str().unwrap_or("local");
        let output_contract = json!({
            "kind":"json",
            "schema":{
                "type":"object",
                "required":["hits"],
                "properties":{"hits":{"type":"array"}}
            }
        });
        let mut request = json!({
            "contract":"algal.effect.v1",
            "cellId":name,
            "kind":"recall",
            "prompt":"",
            "context":context,
            "output":output_contract,
            "budget":{"maxContextBytes":max_context,"maxOutputBytes":max_output},
            "recall":{"query":query,"k":k,"embedder":embedder}
        });
        if let Some(route) = cell.get("route") {
            request["route"] = route.clone();
        }
        let attempts = cell["retry"]["attempts"].as_u64().unwrap_or(1);
        let timeout = cell["budget"]["maxEffectMs"].as_u64().unwrap_or(120_000);
        let (mut recalled, mut effect_digest) = self
            .bounded_effect(
                BoundedEffect {
                    request: &request,
                    cell_path,
                    timeout,
                    attempts,
                    context_bytes,
                    max_output,
                },
                |raw| {
                    bind_output(&output_contract, raw.clone())?;
                    crate::semantic::bind_recall_output(raw, k)
                },
            )
            .await?;
        let hits = recalled["hits"].as_array().cloned().unwrap_or_default();
        if let Some(rerank) = cell.get("rerank").filter(|_| hits.len() > 1) {
            let mut questions = Map::new();
            for index in 0..hits.len() {
                questions.insert(
                    format!("hit_{index}"),
                    json!({
                        "type":"noul",
                        "instructions":format!(
                            "Is context.hits[{index}] directly relevant to context.query?"
                        ),
                        "criteria":{
                            "true":"The hit directly helps answer context.query.",
                            "false":"The hit does not help answer context.query."
                        }
                    }),
                );
            }
            let questions = Value::Object(questions);
            let rerank_context = json!({"query":query,"hits":hits});
            let rerank_context_bytes = canonical(&rerank_context)?.len();
            if rerank_context_bytes > max_context {
                return Err(Error::limit(format!(
                    "recall rerank context {rerank_context_bytes}B exceeds maxContextBytes {max_context}B"
                )));
            }
            let rerank_output = crate::decisions::answer_schema(&questions);
            let rerank_request = json!({
                "contract":"algal.effect.v1",
                "cellId":name,
                "kind":"decide",
                "prompt":format!(
                    "Semantic rerank for recall cell \"{name}\". Score every hit's direct relevance to the query; do not summarize or rewrite the source text."
                ),
                "context":rerank_context,
                "output":rerank_output,
                "budget":{"maxContextBytes":max_context,"maxOutputBytes":max_output},
                "route":rerank["route"],
                "questions":questions
            });
            let (answers, rerank_digest) = self
                .bounded_effect(
                    BoundedEffect {
                        request: &rerank_request,
                        cell_path,
                        timeout,
                        attempts,
                        context_bytes: rerank_context_bytes,
                        max_output,
                    },
                    |raw| {
                        let bound = bind_output(&rerank_output, raw.clone())?;
                        let mut answers = Map::new();
                        for (question_name, question) in object(&questions)? {
                            let answer = bound["answers"].get(question_name).ok_or_else(|| {
                                Error::new(
                                    "EFFECT_UNPARSEABLE",
                                    format!("decision response missing answer \"{question_name}\""),
                                )
                            })?;
                            answers.insert(
                                question_name.clone(),
                                crate::decisions::check_answer(answer, question, question_name)?,
                            );
                        }
                        Ok(Value::Object(answers))
                    },
                )
                .await?;
            let mut scored: Vec<(usize, f64, Value)> = hits
                .into_iter()
                .enumerate()
                .map(|(index, hit)| {
                    let score = answers[format!("hit_{index}")]["noul"]
                        .as_f64()
                        .unwrap_or_default();
                    (index, score, hit)
                })
                .collect();
            scored.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
            let take = rerank["take"].as_u64().unwrap_or(scored.len() as u64) as usize;
            recalled = json!({
                "hits":scored.into_iter().take(take).map(|(_,_,hit)| hit).collect::<Vec<_>>()
            });
            effect_digest = rerank_digest;
        }
        let mut outputs = json!({"out":recalled.clone()});
        if let Some(reference) = recalled["hits"]
            .as_array()
            .and_then(|hits| hits.first())
            .and_then(|hit| hit["ref"].as_str())
        {
            outputs["ref"] = json!(reference);
        }
        Ok(json!({
            "outputs":outputs,
            "effectDigest":effect_digest
        }))
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
        // decide cells carry no declared output — the contract is derived
        // from the question map (an answers record shaped per question type)
        let output_contract = if cell["kind"] == "decide" {
            crate::decisions::answer_schema(&cell["questions"])
        } else {
            cell["output"].clone()
        };
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
        let mut log: Vec<Value> = Vec::new();
        for turn in 0..max_turns {
            // recorded tool-log compaction: over-threshold logs are triaged
            // by a decide effect (keep = noul >= 0.5). The effect rides the
            // receipt — replay reproduces the rebuilt log bit-for-bit.
            if cell["kind"] == "agent"
                && let Some(compact) = cell.get("compact")
                && compact["mode"] != "elide"
            {
                let pinned = compact["keepRecent"].as_u64().unwrap_or(0) as usize;
                let max_log = compact["maxLogBytes"].as_u64().unwrap() as usize;
                if log.len() > pinned && canonical(&json!(log))?.len() > max_log {
                    let droppable = log.len() - pinned;
                    let mut questions = Map::new();
                    for (i, entry) in log.iter().take(droppable).enumerate() {
                        questions.insert(
                            format!("keep_{i}"),
                            json!({"type":"noul","instructions":format!(
                                "Retain context.toolLog[{i}] verbatim — the \"{}\" call and its result. Is it still needed for the remaining task?",
                                entry["fn"].as_str().unwrap_or("")
                            )}),
                        );
                    }
                    let questions = Value::Object(questions);
                    let compact_ctx = json!({"inputs":view_inputs,"turn":turn,"toolLog":log});
                    let compact_ctx_bytes = canonical(&compact_ctx)?.len();
                    if compact_ctx_bytes > max_context {
                        return Err(Error::limit(format!(
                            "compaction context {compact_ctx_bytes}B exceeds maxContextBytes {max_context}B"
                        )));
                    }
                    let mut req = json!({
                        "contract":"algal.effect.v1",
                        "cellId":name,
                        "kind":"decide",
                        "prompt":format!(
                            "Tool-log triage for cell \"{name}\". The log exceeds {max_log}B; for each indexed entry decide whether the call and its result must be preserved verbatim for the remaining work. Task: {}",
                            cell["prompt"].as_str().unwrap_or("")
                        ),
                        "context":compact_ctx,
                        "output":crate::decisions::answer_schema(&questions),
                        "budget":{"maxContextBytes":max_context,"maxOutputBytes":max_output},
                        "questions":questions,
                    });
                    if let Some(route) = compact.get("route").or_else(|| cell.get("route")) {
                        req["route"] = route.clone();
                    }
                    let req_digest = digest(&req)?;
                    if self.calls + 1 > self.budgets.max_agent_calls {
                        return Err(Error::limit("maxAgentCalls exhausted"));
                    }
                    self.calls += 1;
                    self.work += 500 + compact_ctx_bytes;
                    self.event("effect", Some(cell_path), Some(&req_digest), None)?;
                    let receipt = self
                        .host
                        .effect(&req, timeout, Some(&mut *self.store))
                        .await?;
                    self.effects.push(receipt.clone());
                    if let Some(error) = receipt.get("error") {
                        return Err(serde_json::from_value(error.clone())?);
                    }
                    let raw = receipt["output"].clone();
                    let output_bytes = canonical(&raw)?.len();
                    if output_bytes > max_output {
                        return Err(Error::limit(format!(
                            "effect output {output_bytes}B exceeds maxOutputBytes {max_output}B"
                        )));
                    }
                    self.work += output_bytes;
                    let bound = bind_output(&req["output"].clone(), raw).map_err(|e| {
                        Error::new(
                            "EFFECT_UNPARSEABLE",
                            format!("cell \"{name}\" compaction: {}", e.message),
                        )
                    })?;
                    let mut kept: Vec<Value> = Vec::new();
                    for (i, entry) in log.iter().take(droppable).enumerate() {
                        if bound["answers"][format!("keep_{i}")]["noul"]
                            .as_f64()
                            .is_some_and(|p| p >= 0.5)
                        {
                            kept.push(entry.clone());
                        }
                    }
                    log.splice(0..droppable, kept);
                }
            }
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
            if cell["kind"] == "agent" && cell["compact"]["mode"] == "elide" {
                context =
                    crate::context::elide_tool_context(&context, &cell["compact"], max_context)?;
            }
            let context_bytes = canonical(&context)?.len();
            if context_bytes > max_context {
                return Err(Error::limit(format!(
                    "context view {context_bytes}B exceeds maxContextBytes {max_context}B"
                )));
            }
            let mut request = json!({"contract":"algal.effect.v1","cellId":name,"kind":cell["kind"],"prompt":cell.get("prompt").cloned().unwrap_or(json!("")),"context":context,"output":output_contract,"budget":{"maxContextBytes":max_context,"maxOutputBytes":max_output}});
            if let Some(route) = cell.get("route") {
                request["route"] = route.clone();
            }
            if cell["kind"] == "decide" {
                request["questions"] = cell["questions"].clone();
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
                let receipt = self
                    .host
                    .effect(&request, timeout, Some(&mut *self.store))
                    .await
                    .inspect_err(|_| {
                        self.effect_failed_without_receipt = true;
                    })?;
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
                match bind_output(&output_contract, raw.clone()).map_err(|error| {
                    if output_contract["kind"] == "choice" {
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
            for name in object(&call["inputs"])?.keys() {
                if !signature.inputs.contains_key(name) {
                    return Err(Error::new(
                        "TYPE_MISMATCH",
                        format!("tool {tool} received undeclared input {name}"),
                    ));
                }
            }
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
    for value in object(&args)?.values() {
        object(value)?;
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
        suspended: false,
        effect_failed_without_receipt: false,
        replay,
    };
    runtime.event("run.start", None, Some(&manifest_digest), None)?;
    let outcome = runtime
        .run_into(&compiled, args.clone(), String::new(), 0)
        .await?;
    runtime.event("run.end", None, None, Some(&outcome))?;
    let mut receipt = json!({
        "contract":replay.and_then(|r| r.get("contract")).cloned().unwrap_or(json!("algal.run.v1")),
        "runtime":replay.and_then(|r| r.get("runtime")).cloned().unwrap_or(json!({"name":"algal","version":RUNTIME_STAMP_VERSION})),
        "manifestDigest":manifest_digest,"manifestKey":compiled.manifest.value["key"],"args":args,
        "outcome":outcome,"cells":runtime.cells,"effects":runtime.effects,"events":runtime.events,
        "work":{"steps":runtime.steps,"agentCalls":runtime.calls,"units":runtime.work},
    });
    if let Some(failure) = runtime.failure {
        receipt["failure"] = failure;
    }
    // Include the fixed-length digest field in admission before recursive
    // hashing, so every returned receipt fits the reader's complete envelope.
    receipt["digest"] = json!(format!("sha256:{}", "0".repeat(64)));
    crate::receipt::validate_produced(&receipt)?;
    receipt["digest"] = json!(receipt_digest(&receipt)?);
    Ok(receipt)
}

pub async fn verify(
    receipt: &Value,
    manifest: Manifest,
    store: &Store,
    tools: &Host,
) -> Result<Value> {
    crate::receipt::validate(receipt)?;
    let manifest_digest = manifest.digest()?;
    if receipt["manifestDigest"] != manifest_digest {
        return Ok(
            json!({"ok":false,"digest":receipt["digest"],"outcome":receipt["outcome"],"mismatches":[format!("manifestDigest: receipt records {}, supplied manifest hashes to {}", receipt["manifestDigest"].as_str().unwrap(), manifest_digest)]}),
        );
    }
    let mut host = Host::replay(&receipt["effects"])?;
    host.tools = tools.tools.clone();
    host.mailbox = tools.mailbox.clone();
    let replayed = run(
        manifest,
        receipt["args"].clone(),
        &mut store.overlay(),
        &mut host,
        &Transports::new(),
        Some(receipt),
    )
    .await?;
    let mismatches = crate::receipt::diff(receipt, &replayed);
    let ok = mismatches.is_empty();
    Ok(
        json!({"ok":ok,"digest":replayed["digest"],"outcome":replayed["outcome"],"mismatches":mismatches }),
    )
}

/// Continue a suspended (or completed) run. The checkpoint's completed
/// effects replay by request digest; suspended attempts are dropped so the
/// same requests re-issue against the live host's executors, and the tail
/// executes live. The checkpoint supplies slot reads and transport
/// provenance exactly as verify does.
pub async fn resume(
    checkpoint: &Value,
    manifest: Manifest,
    store: &mut Store,
    host: &mut Host,
    transports: &Transports,
) -> Result<Value> {
    if checkpoint["contract"] != "algal.run.v1" {
        return Err(Error::invalid("run receipt contract"));
    }
    if checkpoint["manifestDigest"] != manifest.digest()? {
        return Err(Error::invalid("manifest digest does not match checkpoint"));
    }
    if checkpoint["digest"] != receipt_digest(checkpoint)? {
        return Err(Error::new("DIGEST_MISMATCH", "checkpoint digest mismatch"));
    }
    if verify(checkpoint, manifest.clone(), store, host).await?["ok"] != true {
        return Err(Error::new("VERIFY_FAILED", "checkpoint does not replay"));
    }
    host.validate_resume_executors(&checkpoint["effects"])?;
    let mut continuable = Vec::new();
    for effect in checkpoint["effects"]
        .as_array()
        .ok_or_else(|| Error::invalid("effects must be an array"))?
    {
        if effect["error"]["code"].as_str() != Some("EFFECT_SUSPENDED") {
            continuable.push(effect.clone());
        }
    }
    host.replay = Host::replay(&json!(continuable))?.replay;
    host.replay_fallthrough = true;
    // the checkpoint supplies slot reads and via provenance — but the
    // resumed receipt is a new run stamped by this runtime, so the
    // checkpoint's own contract/runtime stamps are stripped from the
    // provenance record (verify keeps them for bit-for-bit replay)
    let mut provenance = checkpoint.clone();
    let obj = provenance
        .as_object_mut()
        .ok_or_else(|| Error::invalid("run receipt must be an object"))?;
    obj.remove("contract");
    obj.remove("runtime");
    run(
        manifest,
        checkpoint["args"].clone(),
        store,
        host,
        transports,
        Some(&provenance),
    )
    .await
}
