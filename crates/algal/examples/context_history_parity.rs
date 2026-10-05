use algal::{
    Error, Result,
    agent_context::{AgentContextEntryInput, put_agent_context},
    canonical::{canonical, digest},
    context_history::{
        ContextHistoryCurrent, ContextHistoryHost, ContextHistoryRange, capture_context_history,
        context_history_cover,
    },
    context_history_contract::{
        ContextHistory, context_history_digest, context_history_node,
        validate_context_history_generation, validate_context_history_queue,
        validate_context_history_summary_request, validate_context_history_summary_result,
    },
    contract::{integer, keys, list},
    store::Store,
};
use serde_json::{Value, json};
use std::{
    cell::RefCell,
    collections::BTreeMap,
    io::{Read, Write},
    rc::Rc,
    sync::atomic::AtomicBool,
};

fn derivatives(history: &ContextHistory, operation: &Value, recipe: &Value) -> Result<Value> {
    let history_value = serde_json::to_value(history)?;
    let nodes = list(&operation["ranges"], 1023)?
        .iter()
        .map(|range| {
            let range = list(range, 2)?;
            if range.len() != 2 {
                return Err(Error::invalid("parity range requires two offsets"));
            }
            context_history_node(
                &history_value,
                integer(&range[0], 0, 1023)?,
                integer(&range[1], 1, 1024)?,
            )
        })
        .collect::<Result<Vec<_>>>()?;
    let summaries = nodes.iter().enumerate().map(|(i, node)| -> Result<Value> {
        Ok(json!({"schema":"algal.context-history-summary.v1","prompt":recipe["prompt"],"policy":recipe["policy"],"summarizer":recipe["summarizer"],
            "history":node.history,"node":context_history_digest(&serde_json::to_value(node)?)?,"sources":node.sources,"children":[],"body":format!("scripted range {i}")}))
    }).collect::<Result<Vec<_>>>()?;
    let published = summaries
        .iter()
        .map(|summary| -> Result<Value> {
            Ok(json!({"node":summary["node"],"summary":context_history_digest(summary)?}))
        })
        .collect::<Result<Vec<_>>>()?;
    Ok(
        json!({"generation":{"schema":"algal.context-history-generation.v1","history":context_history_digest(&history_value)?,"generation":operation["generation"],
        "prompt":recipe["prompt"],"policy":recipe["policy"],"summarizer":recipe["summarizer"],"summaries":published},"nodes":nodes,"summaries":summaries}),
    )
}
fn run_case(input: &Value, item: &Value) -> Result<Value> {
    keys(
        item,
        &["name", "sources", "order", "configuration", "operations"],
    )?;
    let sources: Vec<AgentContextEntryInput> = serde_json::from_value(item["sources"].clone())?;
    let directory = tempfile::tempdir()?;
    let mut store = Store::open(directory.path(), true)?;
    let snapshot = put_agent_context(&mut store, &sources)?;
    let order = item
        .get("order")
        .map(|value| -> Result<Vec<usize>> {
            list(value, 1024)?
                .iter()
                .map(|value| integer(value, 0, 1023))
                .collect()
        })
        .transpose()?
        .unwrap_or_else(|| (0..sources.len()).collect());
    let selected = order.iter().enumerate().map(|(i, index)| -> Result<Value> {
        Ok(json!({"sourceIndex":index,"event":digest(&json!({"event":i}))?,"position":input["firstPosition"].as_u64().unwrap() as usize + i}))
    }).collect::<Result<Vec<_>>>()?;
    let history = capture_context_history(
        &store,
        &json!({"scope":input["scope"],"head":input["head"],"snapshot":snapshot,"epoch":input["epoch"],"firstPosition":input["firstPosition"],"sources":selected}),
    )?;
    let mut indices = order.clone();
    indices.sort_unstable();
    let current = Rc::new(RefCell::new(ContextHistoryCurrent {
        access: json!({"schema":"algal.context-history-access.v1","history":context_history_digest(&serde_json::to_value(&history)?)?,
        "scope":history.scope,"head":history.head,"snapshot":snapshot,"revision":0,"indices":indices,"state":"active"}),
        invalidated: Vec::new(),
    }));
    let resolved = Rc::clone(&current);
    let reader = Store::open(directory.path(), false)?;
    let mut host =
        ContextHistoryHost::new(&reader, "owner", move |_, _| Ok(resolved.borrow().clone()))?;
    let reference = host.admit(
        &serde_json::to_value(&history)?,
        item.get("configuration"),
        None,
        None,
    )?;
    let mut refs = BTreeMap::from([("root".to_owned(), reference.clone())]);
    let mut saved: BTreeMap<String, Value> = BTreeMap::new();
    let mut results = Vec::new();
    for operation in list(&item["operations"], 128)? {
        keys(
            operation,
            &[
                "op",
                "ref",
                "limits",
                "cancelled",
                "save",
                "after",
                "index",
                "startByte",
                "endByte",
                "query",
                "maxResults",
                "maxScanBytes",
                "start",
                "end",
                "indices",
                "name",
                "saved",
                "ranges",
                "generation",
                "invalidated",
                "state",
                "revision",
            ],
        )?;
        let reference = refs
            .get(operation["ref"].as_str().unwrap_or("root"))
            .cloned()
            .ok_or_else(|| Error::invalid("unknown parity reference"))?;
        let cancelled = AtomicBool::new(operation["cancelled"] == true);
        let limits = operation.get("limits");
        let result = (|| -> Result<Value> {
            match operation["op"].as_str().unwrap_or_default() {
                "overview" => {
                    let mut options = json!({});
                    if let Some(limits) = limits {
                        options["limits"] = limits.clone();
                    }
                    if let Some(after) = operation["after"].as_str() {
                        options["cursor"] = saved
                            .get(after)
                            .ok_or_else(|| Error::invalid("unknown parity page"))?["cursor"]
                            .clone();
                    }
                    let value = host.overview(&reference, &options, Some(&cancelled))?;
                    if let Some(save) = operation["save"].as_str() {
                        saved.insert(save.to_owned(), value.clone());
                    }
                    Ok(value)
                }
                "inspect" => {
                    let value = host.inspect(&reference, Some(&cancelled))?;
                    if let Some(save) = operation["save"].as_str() {
                        saved.insert(save.to_owned(), value.clone());
                    }
                    Ok(value)
                }
                "read" => host.read(
                    &reference,
                    integer(&operation["index"], 0, 1023)?,
                    limits,
                    Some(&cancelled),
                ),
                "slice" => host.slice(
                    &reference,
                    integer(&operation["index"], 0, 1023)?,
                    ContextHistoryRange {
                        start: integer(&operation["startByte"], 0, 1048576)?,
                        end: integer(&operation["endByte"], 0, 1048576)?,
                    },
                    limits,
                    Some(&cancelled),
                ),
                "search" => {
                    let mut options = json!({"query":operation["query"]});
                    if let Some(value) = operation.get("maxResults") {
                        options["maxResults"] = value.clone();
                    }
                    if let Some(value) = operation.get("maxScanBytes") {
                        options["maxScanBytes"] = value.clone();
                    }
                    host.search(&reference, &options, limits, Some(&cancelled))
                }
                "expand" | "expand-unknown" => {
                    let id = if operation["op"] == "expand-unknown" {
                        digest(&json!("unadmitted source node"))?
                    } else {
                        let node = context_history_node(
                            &serde_json::to_value(&history)?,
                            integer(&operation["start"], 0, 1023)?,
                            integer(&operation["end"], 1, 1024)?,
                        )?;
                        context_history_digest(&serde_json::to_value(node)?)?
                    };
                    host.expand(&reference, &id, limits, Some(&cancelled))
                }
                "delegate" => {
                    let picked = list(&operation["indices"], 1024)?
                        .iter()
                        .map(|value| integer(value, 0, 1023))
                        .collect::<Result<Vec<_>>>()?;
                    let child = host.delegate(&reference, &picked, limits)?;
                    refs.insert(
                        operation["name"]
                            .as_str()
                            .ok_or_else(|| Error::invalid("parity child name"))?
                            .to_owned(),
                        child.clone(),
                    );
                    Ok(serde_json::to_value(child)?)
                }
                "revoke" => {
                    host.revoke(&reference)?;
                    Ok(Value::Null)
                }
                "missing" => {
                    let entry = match operation.get("index") {
                        Some(index) => {
                            &history
                                .leaves
                                .get(integer(index, 0, 1023)?)
                                .ok_or_else(|| Error::invalid("unknown parity source"))?
                                .entry
                        }
                        None => &history.snapshot,
                    };
                    std::fs::remove_file(
                        directory
                            .path()
                            .join("values")
                            .join(format!("{}.json", &entry[7..])),
                    )?;
                    Ok(Value::Null)
                }
                "validate" => {
                    let mut cursor = operation["after"]
                        .as_str()
                        .map(|after| {
                            saved
                                .get(after)
                                .ok_or_else(|| Error::invalid("unknown cursor page"))
                                .map(|page| page["cursor"].clone())
                        })
                        .transpose()?;
                    if let (Some(cursor), Some(index)) = (cursor.as_mut(), operation.get("index")) {
                        cursor["offset"] = json!(integer(index, 0, 1024)?);
                    }
                    host.validate_view(
                        &reference,
                        saved
                            .get(operation["saved"].as_str().unwrap_or_default())
                            .ok_or_else(|| Error::invalid("unknown saved page"))?,
                        cursor.as_ref(),
                    )?;
                    Ok(Value::Null)
                }
                "generation" | "publish" => {
                    let pool = derivatives(&history, operation, &input["recipe"])?;
                    if operation["op"] == "publish" {
                        let expected = saved
                            .get(operation["after"].as_str().unwrap_or_default())
                            .and_then(|page| page["generation"].as_str())
                            .ok_or_else(|| Error::invalid("unknown saved generation"))?;
                        host.publish_generation(&reference, &pool, expected)?;
                    } else {
                        host.use_generation(&reference, &pool)?;
                    }
                    Ok(Value::Null)
                }
                "current" => {
                    let mut selected = current.borrow_mut();
                    for key in ["indices", "state", "revision"] {
                        if let Some(value) = operation.get(key) {
                            selected.access[key] = value.clone();
                        }
                    }
                    if let Some(value) = operation.get("invalidated") {
                        selected.invalidated = list(value, 1024)?
                            .iter()
                            .map(|value| integer(value, 0, 1023))
                            .collect::<Result<Vec<_>>>()?;
                    }
                    Ok(Value::Null)
                }
                _ => Err(Error::invalid("unknown parity operation")),
            }
        })();
        results.push(match result {
            Ok(value) => json!({"ok":true,"value":value}),
            Err(error) => json!({"ok":false,"code":error.code}),
        });
    }
    Ok(json!({"name":item["name"],"history":history,"ref":refs["root"],"results":results}))
}
fn summary_job(value: &Value) -> Result<Value> {
    keys(
        value,
        &[
            "history",
            "node",
            "request",
            "queue",
            "result",
            "summary",
            "generation",
            "nodes",
        ],
    )?;
    let summary = value.get("summary").filter(|summary| !summary.is_null());
    let summaries = summary.map_or_else(|| json!([]), |summary| json!([summary]));
    validate_context_history_summary_request(
        &value["history"],
        &value["node"],
        &value["request"],
        &json!([]),
    )?;
    validate_context_history_queue(
        &value["history"],
        &value["queue"],
        &json!([value["request"]]),
    )?;
    validate_context_history_summary_result(&value["request"], &value["result"], summary)?;
    validate_context_history_generation(
        &value["history"],
        &value["generation"],
        &value["nodes"],
        &summaries,
    )?;
    if value["result"]["status"] == "complete"
        && value["request"]["generation"] != value["generation"]["generation"]
    {
        return Err(Error::invalid(
            "summary completion generation differs from request",
        ));
    }
    let mut result = serde_json::Map::new();
    for field in [
        "history",
        "node",
        "request",
        "queue",
        "result",
        "generation",
    ] {
        result.insert(
            field.to_owned(),
            json!(context_history_digest(&value[field])?),
        );
    }
    let summary_digest = match summary {
        Some(summary) => json!(context_history_digest(summary)?),
        None => Value::Null,
    };
    result.insert("summary".to_owned(), summary_digest);
    Ok(Value::Object(result))
}
fn run() -> Result<()> {
    let mut bytes = Vec::new();
    std::io::stdin()
        .take(16 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() > 16 * 1024 * 1024 {
        return Err(Error::limit("history parity input bytes"));
    }
    let input: Value = serde_json::from_slice(&bytes)?;
    if let Some(jobs) = input.get("summaryJobs") {
        keys(&input, &["summaryJobs"])?;
        let results = list(jobs, 32)?
            .iter()
            .map(|job| match summary_job(job) {
                Ok(value) => json!({"ok":true,"value":value}),
                Err(error) => json!({"ok":false,"code":error.code}),
            })
            .collect::<Vec<_>>();
        std::io::stdout().write_all(canonical(&json!({"summaryJobs":results}))?.as_bytes())?;
        return Ok(());
    }
    keys(
        &input,
        &[
            "scope",
            "head",
            "epoch",
            "firstPosition",
            "recipe",
            "coverCases",
            "cases",
        ],
    )?;
    let covers = list(&input["coverCases"], 128)?
        .iter()
        .map(|item| -> Result<Value> {
            keys(item, &["count", "recent", "detailed"])?;
            let detailed = list(&item["detailed"], 1024)?
                .iter()
                .map(|value| integer(value, 0, 1023))
                .collect::<Result<Vec<_>>>()?;
            Ok(serde_json::to_value(context_history_cover(
                integer(&item["count"], 0, 1024)?,
                integer(&item["recent"], 0, 1024)?,
                &detailed,
            )?)?)
        })
        .collect::<Result<Vec<_>>>()?;
    let cases = list(&input["cases"], 64)?
        .iter()
        .map(|item| run_case(&input, item))
        .collect::<Result<Vec<_>>>()?;
    let output = canonical(&json!({"covers":covers,"cases":cases}))?;
    if output.len() > 16 * 1024 * 1024 {
        return Err(Error::limit("history parity output bytes"));
    }
    std::io::stdout().write_all(output.as_bytes())?;
    Ok(())
}
fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
