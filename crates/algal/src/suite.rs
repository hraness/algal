//! The bundled-example self-check: every `*.algal.json`
//! manifest in a directory is admitted up front (so
//! `organism` cells resolve regardless of order), then run against its
//! scripted responses with optional args and transports, and every
//! receipt is verified offline. A `<id>.cache.json` marker asks for a
//! second run through the memoizing executor: repeated requests must
//! serve from the first records (`cached: true`) and the memoized run
//! must still verify bit-for-bit. Port of the `suite` command in cli.ts.

use crate::{
    Error, Result,
    canonical::read_json,
    contract::{Manifest, object},
    effects::Host,
    graph::Transports,
    runtime,
    store::Store,
};
use serde_json::{Value, json};
use std::{
    fs::File,
    path::{Path, PathBuf},
};

const MAX_EXAMPLES: usize = 256;

fn optional_json(path: &Path) -> Result<Option<Value>> {
    match File::open(path) {
        Ok(file) => Ok(Some(read_json(file, 1_048_576)?)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

async fn run_one(
    manifest: &Manifest,
    args: &Value,
    responses: &Value,
    cache: bool,
    store: &mut Store,
    transports: &Transports,
) -> Result<Value> {
    let mut host = Host::scripted(responses.clone());
    host.cache = cache;
    runtime::run(
        manifest.clone(),
        args.clone(),
        store,
        &mut host,
        transports,
        None,
    )
    .await
}

/// Run the suite over `examples` and return
/// `{suite:"examples", ok, results:[{example,outcome,verifyOk,receiptDigest,
/// cacheOk?,cacheHits?}]}`.
pub async fn run(examples: &Path, store: &mut Store) -> Result<Value> {
    let mut files = Vec::new();
    for entry in std::fs::read_dir(examples)? {
        let path = entry?.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_owned();
        if name.ends_with(".algal.json") {
            files.push(path);
        }
    }
    files.sort();
    if files.is_empty() {
        return Err(Error::invalid("suite found no examples"));
    }
    if files.len() > MAX_EXAMPLES {
        return Err(Error::limit(format!(
            "suite exceeds {MAX_EXAMPLES} examples"
        )));
    }
    let mut parsed: Vec<(String, Manifest)> = Vec::with_capacity(files.len());
    for path in &files {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        let id = name
            .strip_suffix(".algal.json")
            .or_else(|| name.strip_suffix(".algal.json"))
            .unwrap_or(name)
            .to_owned();
        let manifest = Manifest::parse(&read_json(File::open(path)?, 1_048_576)?)?;
        store.admit(&manifest)?;
        parsed.push((id, manifest));
    }
    let mut results = Vec::new();
    let mut all_ok = true;
    for (id, manifest) in &parsed {
        let base = |suffix: &str| -> PathBuf { examples.join(format!("{id}.{suffix}")) };
        let responses = optional_json(&base("responses.json"))?.unwrap_or_else(|| json!({}));
        object(&responses)
            .map_err(|_| Error::invalid(format!("suite {id}: responses must be an object")))?;
        let args = optional_json(&base("args.json"))?.unwrap_or_else(|| json!({}));
        object(&args).map_err(|_| Error::invalid(format!("suite {id}: args must be an object")))?;
        let mut transports = Transports::new();
        if let Some(value) = optional_json(&base("transports.json"))? {
            if object(&value)?.len() > 16 {
                return Err(Error::limit("transport count"));
            }
            for (name, target) in object(&value)? {
                let target = target
                    .as_str()
                    .ok_or_else(|| Error::invalid("transport directory"))?;
                if target.contains("://") {
                    return Err(Error::new(
                        "EFFECT_UNBOUND",
                        "native transports currently require local bundle directories",
                    ));
                }
                let root = examples.parent().unwrap_or(Path::new("."));
                transports.insert(name.clone(), root.join(target));
            }
        }
        let receipt = run_one(manifest, &args, &responses, false, store, &transports).await?;
        let report = runtime::verify(&receipt, manifest.clone(), store, &Host::default()).await?;
        let outcome = receipt["outcome"].as_str().unwrap_or("");
        let verify_ok = report["ok"] == true;
        let ok = outcome == "complete" && verify_ok;
        all_ok &= ok;
        let mut result = json!({
            "example":id,
            "outcome":outcome,
            "verifyOk":verify_ok,
            "receiptDigest":receipt["digest"],
        });
        if base("cache.json").exists() {
            // Seed the first run's recorded effects into the memo index;
            // the cached rerun must serve them and still verify.
            let identity = crate::effects::Backend::Scripted {
                responses: responses.clone(),
            }
            .cache_identity("scripted")?;
            for effect in receipt["effects"].as_array().cloned().unwrap_or_default() {
                if effect.get("output").is_some() {
                    store.put_effect(&effect, &identity)?;
                }
            }
            let receipt2 = run_one(manifest, &args, &responses, true, store, &transports).await?;
            let report2 =
                runtime::verify(&receipt2, manifest.clone(), store, &Host::default()).await?;
            let hits = receipt2["effects"]
                .as_array()
                .map(|effects| effects.iter().filter(|e| e["cached"] == true).count() as u64)
                .unwrap_or(0);
            let cache_ok = receipt2["outcome"] == "complete" && report2["ok"] == true && hits > 0;
            result["cacheOk"] = json!(cache_ok);
            result["cacheHits"] = json!(hits);
            all_ok &= cache_ok;
        }
        results.push(result);
    }
    Ok(json!({"suite":"examples","ok":all_ok,"results":results}))
}
