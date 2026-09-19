// Semantic index — the native counterpart of src/semantic.ts: a derived,
// disposable index over the store's manifests/runs/values plus host docs.
// Where the TypeScript side stores chunks in bun:sqlite, the native side
// keeps a flat JSONL file (`semantic-index.jsonl`) — no new dependency.
// Ranking is the same in-process hybrid formula (0.65·cosine +
// 0.35·token overlap, chunk-id tie-break) over bit-identical local
// vectors, so top-K over the same corpus is cross-runtime stable.
//
// The index is host tooling, not contract data: it never feeds manifests,
// request digests, or receipts.

use crate::{
    Error, Result,
    canonical::{canonical, digest},
    embeddings::{Embedder, cosine, embed_tokens, token_overlap},
};
use serde_json::{Value, json};
use std::path::Path;

pub const INDEX_FILE: &str = "semantic-index.jsonl";

pub const MAX_CHUNKS: usize = 65_536;
pub const MAX_TEXT_BYTES: usize = 65_536;
pub const MAX_DOC_BYTES: usize = 262_144;
pub const MAX_QUERY_BYTES: usize = 8_192;
pub const MAX_DOCS: usize = 4_096;
pub const MAX_K: usize = 64;
pub const MAX_FILES: usize = 65_536;

const VEC_WEIGHT: f64 = 0.65;
const LEX_WEIGHT: f64 = 0.35;

/// Split text into ≤max-byte chunks on paragraph boundaries — the mirror
/// of `chunkText` in src/semantic.ts. Where TS slices UTF-16 code units,
/// the native side cuts at UTF-8 char boundaries; chunk boundaries agree
/// on ASCII and differ only in the multi-byte edge case.
pub fn chunk_text(text: &str, max: usize) -> Vec<String> {
    if text.len() <= max {
        return vec![text.to_owned()];
    }
    let mut chunks: Vec<String> = Vec::new();
    let mut current = String::new();
    for part in text.split("\n\n") {
        let next = if current.is_empty() {
            part.to_owned()
        } else {
            format!("{current}\n\n{part}")
        };
        if next.len() <= max {
            current = next;
            continue;
        }
        if !current.is_empty() {
            chunks.push(std::mem::take(&mut current));
        }
        if part.len() > max {
            let mut rest = part;
            while rest.len() > max {
                let mut end = max.min(rest.len());
                while !rest.is_char_boundary(end) {
                    end -= 1;
                }
                let cut = &rest[..end];
                let take = cut
                    .rfind('\n')
                    .filter(|i| *i > 0)
                    .map_or(cut, |i| &cut[..i]);
                chunks.push(take.to_owned());
                rest = rest[take.len()..].trim_start_matches('\n');
            }
            current = rest.to_owned();
        } else {
            current = part.to_owned();
        }
    }
    if !current.is_empty() {
        chunks.push(current);
    }
    chunks.truncate(MAX_CHUNKS);
    chunks
}

fn sources(dir: &Path, docs: Option<&Path>) -> Result<Vec<(String, String)>> {
    let mut out = Vec::new();
    let mut count = 0usize;
    for (kind, sub) in [
        ("manifest", "manifests"),
        ("run", "runs"),
        ("value", "values"),
    ] {
        let subdir = dir.join(sub);
        let mut names: Vec<String> = match std::fs::read_dir(&subdir) {
            Ok(entries) => entries
                .filter_map(|e| e.ok())
                .map(|e| e.file_name().to_string_lossy().into_owned())
                .filter(|n| n.ends_with(".json"))
                .collect(),
            Err(_) => Vec::new(),
        };
        names.sort();
        for name in names {
            count += 1;
            if count > MAX_FILES {
                return Ok(out);
            }
            let text = std::fs::read_to_string(subdir.join(&name))
                .map_err(|_| Error::new("IO_FAILED", "index source read failed"))?;
            out.push((format!("{kind}:{}", &name[..name.len() - 5]), text));
        }
    }
    if let Some(docs) = docs {
        let mut names: Vec<String> = std::fs::read_dir(docs)
            .map_err(|_| Error::new("IO_FAILED", "docs directory read failed"))?
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|n| {
                let lower = n.to_lowercase();
                lower.ends_with(".md")
                    || lower.ends_with(".markdown")
                    || lower.ends_with(".txt")
                    || lower.ends_with(".json")
            })
            .collect();
        names.sort();
        for name in names.into_iter().take(MAX_DOCS) {
            let path = docs.join(&name);
            let bytes =
                std::fs::read(&path).map_err(|_| Error::new("IO_FAILED", "doc read failed"))?;
            if bytes.len() > MAX_DOC_BYTES {
                continue;
            }
            if let Ok(text) = String::from_utf8(bytes)
                .map_err(|_| Error::new("IO_FAILED", "doc is not UTF-8 text"))
            {
                out.push((format!("doc:{name}"), text));
            }
        }
    }
    Ok(out)
}

pub struct IndexReport {
    pub model: String,
    pub dimension: usize,
    pub sources: usize,
    pub chunks: usize,
    pub embedded: usize,
    pub reused: usize,
}

impl IndexReport {
    pub fn to_json(&self) -> Value {
        json!({
            "ok":true,"model":self.model,"dimension":self.dimension,
            "sources":self.sources,"chunks":self.chunks,
            "embedded":self.embedded,"reused":self.reused
        })
    }
}

struct Row {
    id: String,
    source: String,
    seq: u64,
    text_digest: String,
    text: String,
    vec: Vec<f64>,
}

fn read_rows(dir: &Path, model: &str) -> Result<Vec<Row>> {
    let path = dir.join(INDEX_FILE);
    let raw = match std::fs::read_to_string(&path) {
        Ok(raw) => raw,
        Err(_) => return Ok(Vec::new()),
    };
    let mut rows = Vec::new();
    for line in raw.lines() {
        if line.is_empty() {
            continue;
        }
        let v: Value = serde_json::from_str(line)
            .map_err(|_| Error::new("IO_FAILED", "semantic index row is not JSON"))?;
        if v["model"] != model {
            continue;
        }
        let vec: Vec<f64> = v["vec"]
            .as_array()
            .ok_or_else(|| Error::new("IO_FAILED", "semantic index vec invalid"))?
            .iter()
            .map(|x| {
                x.as_f64()
                    .ok_or_else(|| Error::new("IO_FAILED", "semantic index vec invalid"))
            })
            .collect::<Result<_>>()?;
        rows.push(Row {
            id: v["id"].as_str().unwrap_or_default().to_owned(),
            source: v["source"].as_str().unwrap_or_default().to_owned(),
            seq: v["seq"].as_u64().unwrap_or_default(),
            text_digest: v["textDigest"].as_str().unwrap_or_default().to_owned(),
            text: v["text"].as_str().unwrap_or_default().to_owned(),
            vec,
        });
    }
    Ok(rows)
}

/// (Re)build the derived index under a store directory — the same
/// incremental semantics as TypeScript: chunks whose `(model, source,
/// seq, textDigest)` is unchanged keep their stored vector, vanished
/// sources are pruned.
pub async fn index_store(
    dir: &Path,
    docs: Option<&Path>,
    embedder: &Embedder,
    deadline_ms: u64,
) -> Result<IndexReport> {
    let model = embedder.model();
    let existing: std::collections::BTreeMap<String, String> = read_rows(dir, &model)?
        .into_iter()
        .map(|r| (r.id, r.text_digest))
        .collect();
    let mut rows: Vec<Row> = Vec::new();
    let mut pending: Vec<usize> = Vec::new();
    let mut sources_seen = 0usize;
    let mut reused = 0usize;
    for (reference, text) in sources(dir, docs)? {
        sources_seen += 1;
        for (seq, piece) in chunk_text(&text, MAX_TEXT_BYTES).into_iter().enumerate() {
            if rows.len() >= MAX_CHUNKS {
                break;
            }
            let text_digest = digest(&json!(piece))?;
            let id = digest(&json!(format!("{model}|{reference}|{seq}")))?;
            if existing.get(&id) == Some(&text_digest) {
                reused += 1;
            } else {
                pending.push(rows.len());
            }
            rows.push(Row {
                id,
                source: reference.clone(),
                seq: seq as u64,
                text_digest,
                text: piece,
                vec: Vec::new(),
            });
        }
    }
    let mut embedded = 0usize;
    for batch in pending.chunks(64) {
        let texts: Vec<String> = batch.iter().map(|i| rows[*i].text.clone()).collect();
        let vectors = embedder.embed(&texts, deadline_ms).await?;
        if vectors.len() != texts.len() {
            return Err(Error::new(
                "EFFECT_UNPARSEABLE",
                "embedder returned wrong count",
            ));
        }
        for (i, vec) in batch.iter().zip(vectors) {
            rows[*i].vec = vec;
            embedded += 1;
        }
    }
    // reused chunks keep the stored vector — reload by id
    if reused > 0 {
        let stored: std::collections::BTreeMap<String, Vec<f64>> = read_rows(dir, &model)?
            .into_iter()
            .map(|r| (r.id, r.vec))
            .collect();
        for row in &mut rows {
            if row.vec.is_empty()
                && let Some(vec) = stored.get(&row.id)
            {
                row.vec = vec.clone();
            }
        }
    }
    rows.sort_by(|a, b| a.id.cmp(&b.id));
    std::fs::create_dir_all(dir).map_err(|_| Error::new("IO_FAILED", "index dir failed"))?;
    let mut out = String::new();
    for row in &rows {
        let record = json!({
            "id":row.id,"model":model,"source":row.source,"seq":row.seq,
            "textDigest":row.text_digest,"bytes":row.text.len(),
            "text":row.text,"vec":row.vec
        });
        out.push_str(&canonical(&record)?);
        out.push('\n');
    }
    std::fs::write(dir.join(INDEX_FILE), out)
        .map_err(|_| Error::new("IO_FAILED", "index write failed"))?;
    Ok(IndexReport {
        model,
        dimension: embedder.dimension(),
        sources: sources_seen,
        chunks: rows.len(),
        embedded,
        reused,
    })
}

pub struct Hit {
    pub source: String,
    pub seq: u64,
    pub score: f64,
    pub text: String,
}

impl Hit {
    pub fn to_json(&self) -> Value {
        json!({
            "score":self.score,"source":self.source,"seq":self.seq,
            "snippet":snippet(&self.text, 160)
        })
    }
}

/// Hybrid rank over stored chunks — `0.65·cosine + 0.35·tokenOverlap`,
/// id tie-break, identical to the TypeScript `searchIndex`.
pub async fn search(
    dir: &Path,
    embedder: &Embedder,
    query: &str,
    k: usize,
    deadline_ms: u64,
) -> Result<Vec<Hit>> {
    if k == 0 || k > MAX_K {
        return Err(Error::invalid(format!("k must be 1..{MAX_K}")));
    }
    if query.len() > MAX_QUERY_BYTES {
        return Err(Error::limit("search query bytes"));
    }
    let rows = read_rows(dir, &embedder.model())?;
    let vectors = embedder.embed(&[query.to_owned()], deadline_ms).await?;
    let qv = vectors
        .into_iter()
        .next()
        .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "embedder returned no vector"))?;
    let mut hits: Vec<(String, Hit)> = rows
        .into_iter()
        .map(|row| {
            let score =
                VEC_WEIGHT * cosine(&qv, &row.vec) + LEX_WEIGHT * token_overlap(query, &row.text);
            (
                row.id.clone(),
                Hit {
                    source: row.source,
                    seq: row.seq,
                    score,
                    text: row.text,
                },
            )
        })
        .collect();
    hits.sort_by(|a, b| b.1.score.total_cmp(&a.1.score).then_with(|| a.0.cmp(&b.0)));
    Ok(hits.into_iter().take(k).map(|(_, h)| h).collect())
}

/// First non-empty content flattened to one line — same rule as TS.
pub fn snippet(text: &str, max: usize) -> String {
    let flat: String = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if flat.len() <= max {
        flat
    } else {
        let mut end = max - 1;
        while !flat.is_char_boundary(end) {
            end -= 1;
        }
        format!("{}…", &flat[..end])
    }
}

/// Query tokens for diagnostics — mirrors `embedTokens`.
pub fn query_tokens(query: &str) -> Vec<String> {
    embed_tokens(query, 16_384)
}
