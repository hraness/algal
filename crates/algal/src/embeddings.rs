// Embedding providers, mirroring src/embeddings.ts: a provider-neutral
// interface with two backends — the Vercel AI Gateway `/embeddings`
// endpoint and the deterministic local hashed-trigram embedder (FNV-1a
// 64, L2 normalized, f32-rounded). The local backend produces
// bit-identical vectors to TypeScript, so derived indexes rank the same
// corpus identically in either runtime.

use crate::{Error, Result, contract::text};
use serde_json::{Value, json};
use std::time::Duration;

pub const GATEWAY_BASE: &str = "https://ai-gateway.vercel.sh/v1";
pub const GATEWAY_EMBED_MODEL: &str = "openai/text-embedding-3-small";
pub const LOCAL_DIM: usize = 384;
pub const LOCAL_MODEL: &str = "algal/local-trigram-384";

pub const MAX_TEXTS: usize = 256;
pub const MAX_TEXT_BYTES: usize = 65_536;
pub const MAX_DIMENSION: usize = 4096;
pub const MAX_RESPONSE_BYTES: usize = 8_388_608;
const LOCAL_MAX_TOKENS: usize = 16_384;

/// ASCII lowercase alnum tokenizer — identical to `embedTokens` in
/// src/embeddings.ts. `max` bounds tokens per text.
pub fn embed_tokens(text: &str, max: usize) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut tokens = Vec::new();
    let mut start: Option<usize> = None;
    for (i, c) in lower.char_indices() {
        let alnum = c.is_ascii_lowercase() || c.is_ascii_digit();
        if alnum {
            if start.is_none() {
                start = Some(i);
            }
        } else if let Some(s) = start.take() {
            tokens.push(lower[s..i].to_owned());
            if tokens.len() >= max {
                return tokens;
            }
        }
    }
    if let Some(s) = start {
        tokens.push(lower[s..].to_owned());
    }
    tokens.truncate(max);
    tokens
}

/// FNV-1a 64-bit — the same wrap arithmetic as the TypeScript BigInt
/// implementation, so feature buckets agree bit-for-bit.
fn fnv1a(bytes: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in bytes {
        h = (h ^ u64::from(*b)).wrapping_mul(0x100000001b3);
    }
    h
}

/// One hashed-trigram embedding, identical to `localVector`: character
/// trigrams over each token map to `±1` accumulators (`h % dim` position,
/// `h & 1` sign), L2 normalized and rounded through f32.
pub fn local_vector(text: &str, dim: usize) -> Result<Vec<f64>> {
    if dim == 0 || dim > MAX_DIMENSION {
        return Err(Error::invalid(format!("invalid embedding dimension {dim}")));
    }
    let mut vec = vec![0f64; dim];
    for token in embed_tokens(text, LOCAL_MAX_TOKENS) {
        let bytes = token.as_bytes();
        for i in 0..bytes.len().saturating_sub(2) {
            let h = fnv1a(&bytes[i..i + 3]);
            let idx = (h % dim as u64) as usize;
            vec[idx] += if h & 1 == 0 { 1.0 } else { -1.0 };
        }
    }
    let norm: f64 = vec.iter().map(|v| v * v).sum::<f64>().sqrt();
    Ok(vec
        .iter()
        .map(|v| {
            if norm == 0.0 {
                0.0
            } else {
                // f64 divide, then round to f32 — Math.fround(v / norm)
                f64::from((v / norm) as f32)
            }
        })
        .collect())
}

/// Cosine similarity — identical op order to the TypeScript `cosine`.
pub fn cosine(a: &[f64], b: &[f64]) -> f64 {
    let (mut dot, mut na, mut nb) = (0f64, 0f64, 0f64);
    for (x, y) in a.iter().zip(b.iter()) {
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    let denom = na.sqrt() * nb.sqrt();
    if denom == 0.0 { 0.0 } else { dot / denom }
}

/// Deterministic token overlap `|q ∩ d| / |q|` — the lexical half of the
/// hybrid score, identical to the TypeScript `tokenOverlap`.
pub fn token_overlap(query: &str, text: &str) -> f64 {
    let q: std::collections::BTreeSet<String> =
        embed_tokens(query, LOCAL_MAX_TOKENS).into_iter().collect();
    if q.is_empty() {
        return 0.0;
    }
    let d: std::collections::BTreeSet<String> =
        embed_tokens(text, LOCAL_MAX_TOKENS).into_iter().collect();
    let hit = q.iter().filter(|t| d.contains(*t)).count();
    hit as f64 / q.len() as f64
}

fn check_texts(texts: &[String]) -> Result<()> {
    if texts.is_empty() || texts.len() > MAX_TEXTS {
        return Err(Error::invalid(format!(
            "embed texts requires 1..{MAX_TEXTS}"
        )));
    }
    for t in texts {
        if t.is_empty() {
            return Err(Error::invalid("embed text must be nonempty"));
        }
        if t.len() > MAX_TEXT_BYTES {
            return Err(Error::limit("embed text bytes"));
        }
    }
    Ok(())
}

/// OpenAI-compatible gateway embeddings — `POST {base}/embeddings` with
/// `{model, input}` → `{data:[{index, embedding}]}` sorted by index.
/// Bounded, no redirects, error bodies withheld.
pub async fn gateway_embed(
    base_url: &str,
    model: &str,
    credential: &str,
    texts: &[String],
    deadline_ms: u64,
) -> Result<Vec<Vec<f64>>> {
    check_texts(texts)?;
    text(&json!(model), 128).map_err(|_| Error::invalid("embedding model"))?;
    if credential.is_empty() || credential.len() > 8192 || credential.contains(['\r', '\n']) {
        return Err(Error::invalid("gateway credential configuration"));
    }
    let url = format!("{}/embeddings", base_url.trim_end_matches('/'));
    let body = json!({"model":model,"input":texts});
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_millis(deadline_ms.max(1)))
        .build()
        .map_err(|_| Error::new("EFFECT_FAILED", "HTTP client initialization failed"))?;
    let mut response = client
        .post(&url)
        .json(&body)
        .bearer_auth(credential)
        .send()
        .await
        .map_err(|_| {
            Error::new("EFFECT_FAILED", "embedding request failed or timed out").uncertain()
        })?;
    if !response.status().is_success() {
        return Err(Error::new(
            "EFFECT_FAILED",
            format!(
                "embedding endpoint returned HTTP {}; redirects and error bodies are not accepted",
                response.status().as_u16()
            ),
        ));
    }
    if response
        .content_length()
        .is_some_and(|n| n > MAX_RESPONSE_BYTES as u64)
    {
        return Err(Error::limit("embedding response bytes").uncertain());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| Error::new("EFFECT_FAILED", "embedding body read failed").uncertain())?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE_BYTES {
            return Err(Error::limit("embedding response bytes").uncertain());
        }
        bytes.extend_from_slice(&chunk);
    }
    let raw: Value = serde_json::from_slice(&bytes)
        .map_err(|_| Error::new("EFFECT_UNPARSEABLE", "embedding response is not JSON"))?;
    let data = raw["data"]
        .as_array()
        .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "embedding data missing"))?;
    if data.len() != texts.len() {
        return Err(Error::new(
            "EFFECT_UNPARSEABLE",
            format!(
                "embedding response returned {} vectors for {} texts",
                data.len(),
                texts.len()
            ),
        ));
    }
    let mut vectors: Vec<Option<Vec<f64>>> = vec![None; data.len()];
    let mut dimension: Option<usize> = None;
    for entry in data {
        let index = entry["index"]
            .as_u64()
            .filter(|i| (*i as usize) < data.len())
            .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "embedding index invalid"))?
            as usize;
        let vec: Vec<f64> = entry["embedding"]
            .as_array()
            .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "embedding vector missing"))?
            .iter()
            .map(|v| {
                v.as_f64()
                    .filter(|n| n.is_finite())
                    .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "embedding value invalid"))
            })
            .collect::<Result<_>>()?;
        if vec.is_empty() || vec.len() > MAX_DIMENSION {
            return Err(Error::new(
                "EFFECT_UNPARSEABLE",
                "embedding dimension invalid",
            ));
        }
        match dimension {
            None => dimension = Some(vec.len()),
            Some(d) if d == vec.len() => (),
            _ => {
                return Err(Error::new(
                    "EFFECT_UNPARSEABLE",
                    "embedding dimensions differ",
                ));
            }
        }
        vectors[index] = Some(vec);
    }
    vectors
        .into_iter()
        .collect::<Option<Vec<_>>>()
        .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "embedding response gaps"))
}

/// The resolved embedder for a CLI invocation: `local` (default) or
/// `gateway[:<model>]`.
pub enum Embedder {
    Local { dim: usize },
    Gateway { model: String },
}

impl Embedder {
    pub fn resolve(spec: Option<&str>) -> Result<Self> {
        match spec {
            None | Some("local") => Ok(Self::Local { dim: LOCAL_DIM }),
            Some("gateway") => Ok(Self::Gateway {
                model: GATEWAY_EMBED_MODEL.into(),
            }),
            Some(spec) if spec.starts_with("gateway:") && spec.len() > "gateway:".len() => {
                Ok(Self::Gateway {
                    model: spec["gateway:".len()..].to_owned(),
                })
            }
            Some(spec) => Err(Error::invalid(format!(
                "unknown embedder \"{spec}\" (want local, gateway, or gateway:<model>)"
            ))),
        }
    }

    pub fn model(&self) -> String {
        match self {
            Self::Local { .. } => LOCAL_MODEL.into(),
            Self::Gateway { model } => model.clone(),
        }
    }

    pub fn dimension(&self) -> usize {
        match self {
            Self::Local { dim } => *dim,
            // gateway dimension is learned per response; report the
            // conventional size for status output
            Self::Gateway { .. } => 0,
        }
    }

    pub async fn embed(&self, texts: &[String], deadline_ms: u64) -> Result<Vec<Vec<f64>>> {
        match self {
            Self::Local { dim } => {
                check_texts(texts)?;
                texts.iter().map(|t| local_vector(t, *dim)).collect()
            }
            Self::Gateway { model } => {
                let credential = std::env::var("AI_GATEWAY_API_KEY")
                    .or_else(|_| std::env::var("VERCEL_OIDC_TOKEN"))
                    .map_err(|_| {
                        Error::new(
                            "EFFECT_UNBOUND",
                            "gateway credential is not configured — set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN",
                        )
                    })?;
                gateway_embed(GATEWAY_BASE, model, &credential, texts, deadline_ms).await
            }
        }
    }
}
