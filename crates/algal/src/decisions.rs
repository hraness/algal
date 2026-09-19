// Typed decisions over a bounded state — the provider-neutral contract and
// the TypeSafe Jev backend. A decision provider answers `noul` (keep/
// relevance probability), `choice` (label from criteria keys), and `score`
// (rating) questions; it never generates text. Gate/classifier cells become
// one synthesized `choice` question; `decide` cells forward their declared
// question map verbatim. Jev is the first backend behind the interface.

use crate::{
    Error, Result,
    canonical::{canonical, digest},
    contract::{keys, list, object, text},
};
use serde_json::{Map, Value, json};
use std::time::Duration;

pub const SYSTEMONE_URL: &str = "https://api.typesafe.ai/v1/systemone";
pub const DEFAULT_MODEL: &str = "jev-latest";
pub const CREDENTIAL_ENV: &str = "TYPESAFE_API_KEY";

const MAX_QUESTIONS: usize = 64;
const MAX_NAME: usize = 64;
const MAX_INSTRUCTIONS: usize = 4096;
const MAX_CRITERIA: usize = 32;
const MAX_CRITERION: usize = 512;
const MAX_RESPONSE: usize = 1_048_576;

/// Validate a declared question map (contract parse): shape, bounds, and
/// question-type-specific criteria rules. Returns the value unchanged —
/// questions ride the effect request verbatim.
pub fn check_questions(v: &Value, what: &str) -> Result<()> {
    let map = object(v).map_err(|_| Error::invalid(format!("{what} must be an object")))?;
    if map.is_empty() || map.len() > MAX_QUESTIONS {
        return Err(Error::invalid(format!(
            "{what} requires 1..{MAX_QUESTIONS} questions"
        )));
    }
    for (name, q) in map {
        text(&json!(name), MAX_NAME).map_err(|_| {
            Error::invalid(format!("{what} question name exceeds {MAX_NAME} bytes"))
        })?;
        keys(q, &["type", "instructions", "criteria"])
            .map_err(|_| Error::invalid(format!("{what}[{name}]: unknown key")))?;
        object(q).map_err(|_| Error::invalid(format!("{what}[{name}] must be an object")))?;
        let ty = text(&q["type"], 16)
            .map_err(|_| Error::invalid(format!("{what}[{name}].type invalid")))?;
        let instructions = text(&q["instructions"], MAX_INSTRUCTIONS)
            .map_err(|_| Error::invalid(format!("{what}[{name}].instructions exceeds bounds")))?;
        if instructions.is_empty() {
            return Err(Error::invalid(format!(
                "{what}[{name}].instructions must not be empty"
            )));
        }
        match ty {
            "noul" => {
                if let Some(criteria) = q.get("criteria") {
                    keys(criteria, &["true", "false"]).map_err(|_| {
                        Error::invalid(format!("{what}[{name}].criteria: unknown key"))
                    })?;
                    for value in object(criteria)
                        .map_err(|_| {
                            Error::invalid(format!("{what}[{name}].criteria must be an object"))
                        })?
                        .values()
                    {
                        text(value, MAX_CRITERION).map_err(|_| {
                            Error::invalid(format!("{what}[{name}].criteria value invalid"))
                        })?;
                    }
                }
            }
            "choice" => {
                let criteria = object(&q["criteria"]).map_err(|_| {
                    Error::invalid(format!("{what}[{name}].criteria must be an object"))
                })?;
                if criteria.is_empty() || criteria.len() > MAX_CRITERIA {
                    return Err(Error::invalid(format!(
                        "{what}[{name}].criteria requires 1..{MAX_CRITERIA} entries"
                    )));
                }
                for (label, value) in criteria {
                    text(&json!(label), MAX_NAME).map_err(|_| {
                        Error::invalid(format!("{what}[{name}].criteria key invalid"))
                    })?;
                    if !value.is_null() {
                        text(value, MAX_CRITERION).map_err(|_| {
                            Error::invalid(format!("{what}[{name}].criteria value invalid"))
                        })?;
                    }
                }
            }
            "score" => {
                let criteria = list(&q["criteria"], MAX_CRITERIA).map_err(|_| {
                    Error::invalid(format!("{what}[{name}].criteria must be a list"))
                })?;
                if criteria.is_empty() {
                    return Err(Error::invalid(format!(
                        "{what}[{name}].criteria requires 1..{MAX_CRITERIA} entries"
                    )));
                }
                for value in criteria {
                    text(value, MAX_CRITERION).map_err(|_| {
                        Error::invalid(format!("{what}[{name}].criteria value invalid"))
                    })?;
                }
            }
            _ => {
                return Err(Error::invalid(format!(
                    "{what}[{name}].type must be noul, choice, or score"
                )));
            }
        }
    }
    Ok(())
}

fn answer_contract(ty: &str) -> Value {
    match ty {
        "noul" => json!({
            "type":"object","required":["noul"],
            "properties":{"type":{"type":"string"},"noul":{"type":"number"}}
        }),
        "choice" => json!({
            "type":"object","required":["choice","confidence","probabilities"],
            "properties":{
                "type":{"type":"string"},"choice":{"type":"string"},
                "confidence":{"type":"number"},"probabilities":{"type":"object"}
            }
        }),
        _ => json!({
            "type":"object","required":["score","confidence","probabilities"],
            "properties":{
                "type":{"type":"string"},"score":{"type":"number"},
                "confidence":{"type":"number"},"probabilities":{"type":"object"}
            }
        }),
    }
}

/// The derived `kind:"decide"` output contract — `{"answers":{name:…}}`
/// with each answer's shape fixed by its declared question type.
pub fn answer_schema(questions: &Value) -> Value {
    let map = questions.as_object().cloned().unwrap_or_default();
    let mut properties = Map::new();
    let mut required = Vec::new();
    for (name, q) in &map {
        required.push(json!(name));
        properties.insert(
            name.clone(),
            answer_contract(q["type"].as_str().unwrap_or("")),
        );
    }
    json!({
        "kind":"json",
        "schema":{
            "type":"object","required":["answers"],
            "properties":{"answers":{"type":"object","required":required,"properties":properties}}
        }
    })
}

/// A synthesized `choice` question for gate/classifier requests: the prompt
/// is the instruction, the declared labels are the criteria keys.
pub fn choice_question(request: &Value) -> Result<Value> {
    let output = &request["output"];
    if output["kind"] != "choice" {
        return Err(Error::new(
            "EFFECT_UNPARSEABLE",
            "a decision backend cannot serve a non-choice output — it answers typed decisions, not generated text",
        ));
    }
    let mut criteria = Map::new();
    for label in output["labels"]
        .as_array()
        .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "choice output requires labels"))?
    {
        criteria.insert(
            label
                .as_str()
                .ok_or_else(|| Error::new("EFFECT_UNPARSEABLE", "labels must be strings"))?
                .to_owned(),
            Value::Null,
        );
    }
    Ok(json!({
        "answer":{
            "type":"choice",
            "instructions":request["prompt"],
            "criteria":criteria
        }
    }))
}

fn finite(v: &Value, what: &str) -> Result<f64> {
    v.as_f64().filter(|n| n.is_finite()).ok_or_else(|| {
        Error::new(
            "EFFECT_UNPARSEABLE",
            format!("{what} must be a finite number"),
        )
    })
}

fn probabilities(v: &Value, what: &str) -> Result<()> {
    let map = object(v)
        .map_err(|_| Error::new("EFFECT_UNPARSEABLE", format!("{what} must be an object")))?;
    if map.len() > MAX_CRITERIA {
        return Err(Error::new(
            "EFFECT_UNPARSEABLE",
            format!("{what} exceeds {MAX_CRITERIA} entries"),
        ));
    }
    for value in map.values() {
        finite(value, what)?;
    }
    Ok(())
}

/// Strict-typed validation of one provider answer against its declared
/// question type. Returns a normalized answer Value.
pub fn check_answer(answer: &Value, question: &Value, name: &str) -> Result<Value> {
    let ty = question["type"].as_str().unwrap_or("");
    object(answer).map_err(|_| {
        Error::new(
            "EFFECT_UNPARSEABLE",
            format!("decision answer \"{name}\" must be an object"),
        )
    })?;
    let at = format!("decision answer \"{name}\"");
    match ty {
        "noul" => {
            finite(&answer["noul"], &format!("{at}.noul"))?;
            Ok(json!({"type":"noul","noul":answer["noul"]}))
        }
        "choice" => {
            let choice = text(&answer["choice"], MAX_CRITERION).map_err(|_| {
                Error::new(
                    "EFFECT_UNPARSEABLE",
                    format!("{at}.choice must be a string"),
                )
            })?;
            finite(&answer["confidence"], &format!("{at}.confidence"))?;
            probabilities(&answer["probabilities"], &format!("{at}.probabilities"))?;
            Ok(json!({
                "type":"choice","choice":choice,
                "confidence":answer["confidence"],"probabilities":answer["probabilities"]
            }))
        }
        "score" => {
            finite(&answer["score"], &format!("{at}.score"))?;
            finite(&answer["confidence"], &format!("{at}.confidence"))?;
            probabilities(&answer["probabilities"], &format!("{at}.probabilities"))?;
            Ok(json!({
                "type":"score","score":answer["score"],
                "confidence":answer["confidence"],"probabilities":answer["probabilities"]
            }))
        }
        _ => Err(Error::new(
            "EFFECT_UNPARSEABLE",
            format!("{at}: unknown question type"),
        )),
    }
}

/// POST the systemone endpoint. `state` is the provider-neutral
/// `{prompt, context}` record the decision executor built; `questions` is the
/// declared map. Returns `(output, metadata)` — the validated
/// `{"answers":…}`/label output plus executor + usage stamps.
pub async fn ask(
    model: &str,
    credential: &str,
    state: &Value,
    questions: &Value,
    deadline_ms: u64,
) -> Result<(Value, Value)> {
    if credential.is_empty() || credential.len() > 8192 || credential.contains(['\r', '\n']) {
        return Err(Error::invalid("Jev credential configuration"));
    }
    let body = json!({"model":model,"state":state,"questions":questions});
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_millis(deadline_ms.max(1)))
        .build()
        .map_err(|_| Error::new("EFFECT_FAILED", "HTTP client initialization failed"))?;
    let mut response = client
        .post(SYSTEMONE_URL)
        .json(&body)
        .bearer_auth(credential)
        .send()
        .await
        .map_err(|_| Error::new("EFFECT_FAILED", "Jev request failed or timed out"))?;
    if !response.status().is_success() {
        return Err(Error::new(
            "EFFECT_FAILED",
            format!(
                "Jev returned HTTP {}; redirects and error bodies are not accepted",
                response.status().as_u16()
            ),
        ));
    }
    if response
        .content_length()
        .is_some_and(|n| n > MAX_RESPONSE as u64)
    {
        return Err(Error::limit("Jev response bytes"));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| Error::new("EFFECT_FAILED", "Jev body read failed"))?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE {
            return Err(Error::limit("Jev response bytes"));
        }
        bytes.extend_from_slice(&chunk);
    }
    let raw: Value = serde_json::from_slice(&bytes)
        .map_err(|_| Error::new("EFFECT_UNPARSEABLE", "Jev response is not JSON"))?;
    let declared = object(&raw["answers"])
        .map_err(|_| Error::new("EFFECT_UNPARSEABLE", "Jev response is missing answers"))?;
    let questions_map =
        object(questions).map_err(|_| Error::new("EFFECT_UNPARSEABLE", "Jev questions invalid"))?;
    let mut answers = Map::new();
    for (name, q) in questions_map {
        let answer = declared.get(name).ok_or_else(|| {
            Error::new(
                "EFFECT_UNPARSEABLE",
                format!("Jev response missing answer \"{name}\""),
            )
        })?;
        answers.insert(name.clone(), check_answer(answer, q, name)?);
    }
    let mut usage = Map::new();
    if let Some(model) = raw["model"].as_str() {
        usage.insert("model".into(), json!(model));
    }
    for (wire, ours) in [("input_tokens", "tokensIn"), ("output_tokens", "tokensOut")] {
        if let Some(n) = raw["usage"][wire].as_u64() {
            usage.insert(ours.into(), json!(n));
        }
    }
    let out = json!({"answers":answers});
    let meta = if usage.is_empty() {
        json!({})
    } else {
        json!({"usage":usage})
    };
    Ok((out, meta))
}

/// Serve one effect request through Jev. `kind:"decide"` forwards declared
/// questions; `kind:"classifier"` synthesizes a single `choice` question.
/// Approval gates route to a human/policy executor, never a model, and
/// everything else is refused — Jev decides, never generates.
/// Returns `(output, metadata)` where output is the cell-bound value.
pub async fn serve(
    model: &str,
    credential: &str,
    request: &Value,
    deadline_ms: u64,
) -> Result<(Value, Value)> {
    let kind = request["kind"].as_str().unwrap_or("");
    let (questions, single) = match kind {
        "decide" => {
            let q = request
                .get("questions")
                .filter(|q| q.is_object())
                .ok_or_else(|| {
                    Error::new("EFFECT_UNPARSEABLE", "decide cell declares no questions")
                })?;
            (q.clone(), None)
        }
        "gate" => {
            return Err(Error::new(
                "EFFECT_UNBOUND",
                "approval gates require a host approval executor, not a model",
            ));
        }
        "classifier" => (choice_question(request)?, Some("answer")),
        _ => {
            return Err(Error::new(
                "EFFECT_UNPARSEABLE",
                format!("Jev cannot serve kind \"{kind}\" — it answers typed decisions only"),
            ));
        }
    };
    let state = json!({"prompt":request["prompt"],"context":request["context"]});
    if canonical(&state)?.len() > 262_144 {
        return Err(Error::limit("Jev state bytes"));
    }
    let (out, meta) = ask(model, credential, &state, &questions, deadline_ms).await?;
    match single {
        Some(name) => {
            let answer = &out["answers"][name];
            let choice = answer["choice"].as_str().ok_or_else(|| {
                Error::new(
                    "EFFECT_UNPARSEABLE",
                    format!("Jev response missing choice answer \"{name}\""),
                )
            })?;
            Ok((json!(choice), meta))
        }
        None => Ok((out, meta)),
    }
}

/// The Jev executor id — `jev` for the default model, `jev:<model>`
/// otherwise (matching the TypeScript adapter's naming).
pub fn executor_id(model: &str) -> String {
    if model == DEFAULT_MODEL {
        "jev".into()
    } else {
        format!("jev:{model}")
    }
}

/// The memo-scope identity — provider + endpoint + model, never credentials.
pub fn cache_identity(model: &str) -> Result<String> {
    digest(&json!({
        "provider":"typesafe",
        "baseUrl":SYSTEMONE_URL,
        "model":model
    }))
}
