use crate::{
    Error, Result,
    canonical::{canonical, digest},
    contract::{keys, object},
};
use serde_json::{Map, Value, json};
use std::time::Duration;

pub const DEFAULT_MODEL: &str = "clef";
pub const MAX_BODY: usize = 13 * 1024 * 1024;
const MAX_IMAGE: usize = 4 * 1024 * 1024;
const MAX_TOTAL: usize = 8 * 1024 * 1024;
const MAX_RESPONSE: usize = 1_048_576;

pub fn endpoint(account: &str, model: &str) -> Result<String> {
    if account.len() != 32
        || !account
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
        || !matches!(model, "clef" | "clef-flash")
    {
        return Err(Error::invalid("Invalid Cloudflare Clef account or model"));
    }
    Ok(format!(
        "https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/@cf/cloudflare/{model}"
    ))
}

fn image_error() -> Error {
    Error::invalid("Invalid Clef image: use embedded PNG, JPEG or WebP within the image limits")
}

fn decode(value: &str) -> Result<Vec<u8>> {
    if value.len() < 4 || value.len() > MAX_IMAGE.div_ceil(3) * 4 || !value.len().is_multiple_of(4)
    {
        return Err(image_error());
    }
    let mut out = Vec::with_capacity(value.len() / 4 * 3);
    for (index, chunk) in value.as_bytes().chunks_exact(4).enumerate() {
        let last = index == value.len() / 4 - 1;
        let padding = if chunk[2] == b'=' && chunk[3] == b'=' {
            2
        } else if chunk[3] == b'=' {
            1
        } else {
            0
        };
        if padding != 0 && !last {
            return Err(image_error());
        }
        let mut n = 0u32;
        for (i, c) in chunk.iter().enumerate() {
            let v = match c {
                b'A'..=b'Z' => c - b'A',
                b'a'..=b'z' => c - b'a' + 26,
                b'0'..=b'9' => c - b'0' + 52,
                b'+' => 62,
                b'/' => 63,
                b'=' if i >= 4 - padding => 0,
                _ => return Err(image_error()),
            };
            n = (n << 6) | u32::from(v);
        }
        if (padding == 2 && n & 0xffff != 0) || (padding == 1 && n & 0xff != 0) {
            return Err(image_error());
        }
        out.push((n >> 16) as u8);
        if padding < 2 {
            out.push((n >> 8) as u8);
        }
        if padding == 0 {
            out.push(n as u8);
        }
    }
    if out.len() > MAX_IMAGE {
        return Err(image_error());
    }
    Ok(out)
}

fn be16(b: &[u8], i: usize) -> u32 {
    u32::from(u16::from_be_bytes([b[i], b[i + 1]]))
}
fn be32(b: &[u8], i: usize) -> u32 {
    u32::from_be_bytes([b[i], b[i + 1], b[i + 2], b[i + 3]])
}
fn le32(b: &[u8], i: usize) -> u32 {
    u32::from_le_bytes([b[i], b[i + 1], b[i + 2], b[i + 3]])
}
fn le24(b: &[u8], i: usize) -> u32 {
    u32::from(b[i]) | u32::from(b[i + 1]) << 8 | u32::from(b[i + 2]) << 16
}

fn dimensions(b: &[u8], mime: &str) -> Result<(u32, u32)> {
    if mime == "image/png" && b.len() >= 33 && b[..8] == [137, 80, 78, 71, 13, 10, 26, 10] {
        let mut offset = 8;
        let mut data = 0;
        let mut size = None;
        while offset + 12 <= b.len() {
            let length = be32(b, offset) as usize;
            let end = offset + 12 + length;
            if end > b.len() {
                return Err(image_error());
            }
            let chunk = &b[offset + 4..offset + 8];
            if offset == 8 && chunk != b"IHDR" {
                return Err(image_error());
            }
            if chunk == b"IHDR" {
                if size.is_some()
                    || length != 13
                    || b[offset + 18] != 0
                    || b[offset + 19] != 0
                    || b[offset + 20] > 1
                {
                    return Err(image_error());
                }
                let depths: &[u8] = match b[offset + 17] {
                    0 => &[1, 2, 4, 8, 16],
                    2 | 4 | 6 => &[8, 16],
                    3 => &[1, 2, 4, 8],
                    _ => &[],
                };
                if !depths.contains(&b[offset + 16]) {
                    return Err(image_error());
                }
                size = Some((be32(b, offset + 8), be32(b, offset + 12)));
            }
            if chunk == b"IDAT" {
                data += length;
            }
            if chunk == b"IEND" {
                return if length == 0 && end == b.len() && data > 0 {
                    size.ok_or_else(image_error)
                } else {
                    Err(image_error())
                };
            }
            offset = end;
        }
    }
    if mime == "image/jpeg" && b.len() >= 4 && b[..2] == [255, 216] {
        let mut offset = 2;
        let mut scans = 0;
        let mut size = None;
        while offset + 2 <= b.len() {
            if b[offset] != 255 {
                return Err(image_error());
            }
            offset += 1;
            while offset < b.len() && b[offset] == 255 {
                offset += 1;
            }
            let Some(&marker) = b.get(offset) else {
                return Err(image_error());
            };
            offset += 1;
            if marker == 217 {
                return if offset == b.len() && scans > 0 {
                    size.ok_or_else(image_error)
                } else {
                    Err(image_error())
                };
            }
            if marker == 1 {
                continue;
            }
            if marker == 0 || marker == 216 || (208..=215).contains(&marker) || offset + 2 > b.len()
            {
                return Err(image_error());
            }
            let length = be16(b, offset) as usize;
            if length < 2 || offset + length > b.len() {
                return Err(image_error());
            }
            if [
                192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
            ]
            .contains(&marker)
            {
                if size.is_some() || length < 11 || length != 8 + 3 * usize::from(b[offset + 7]) {
                    return Err(image_error());
                }
                size = Some((be16(b, offset + 5), be16(b, offset + 3)));
            }
            if marker == 218 {
                if size.is_none() || length < 8 || length != 6 + 2 * usize::from(b[offset + 2]) {
                    return Err(image_error());
                }
                offset += length;
                let start = offset;
                while offset < b.len() {
                    if b[offset] != 255 {
                        offset += 1;
                        continue;
                    }
                    if b.get(offset + 1)
                        .is_some_and(|v| *v == 0 || (208..=215).contains(v))
                    {
                        offset += 2;
                        continue;
                    }
                    break;
                }
                if offset == start {
                    return Err(image_error());
                }
                scans += 1;
            } else {
                offset += length;
            }
        }
    }
    if mime == "image/webp"
        && b.len() >= 25
        && &b[..4] == b"RIFF"
        && u64::from(le32(b, 4)) + 8 == b.len() as u64
        && &b[8..12] == b"WEBP"
    {
        let mut offset = 12;
        let mut size = None;
        let mut canvas = None;
        while offset + 8 <= b.len() {
            let chunk = &b[offset..offset + 4];
            let length = le32(b, offset + 4) as usize;
            let start = offset + 8;
            let end = start + length;
            if end + length % 2 > b.len() {
                return Err(image_error());
            }
            if chunk == b"VP8X" {
                if offset != 12 || length != 10 {
                    return Err(image_error());
                }
                canvas = Some((le24(b, start + 4) + 1, le24(b, start + 7) + 1));
            }
            if chunk == b"VP8L" || chunk == b"VP8 " {
                if size.is_some() {
                    return Err(image_error());
                }
                if chunk == b"VP8L" && length > 5 && b[start] == 47 {
                    let bits = le32(b, start + 1);
                    size = Some(((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1));
                } else if chunk == b"VP8 " && length > 10 && b[start + 3..start + 6] == [157, 1, 42]
                {
                    size = Some((
                        u32::from(u16::from_le_bytes([b[start + 6], b[start + 7]])) & 0x3fff,
                        u32::from(u16::from_le_bytes([b[start + 8], b[start + 9]])) & 0x3fff,
                    ));
                } else {
                    return Err(image_error());
                }
            }
            offset = end + length % 2;
        }
        if offset == b.len() && size.is_some() && (canvas.is_none() || canvas == size) {
            return size.ok_or_else(image_error);
        }
    }
    Err(image_error())
}

pub fn check_images(images: &Value) -> Result<()> {
    let list = images
        .as_array()
        .filter(|v| v.len() <= 4)
        .ok_or_else(image_error)?;
    let mut total = 0usize;
    for image in list {
        let (mime, encoded) = if let Some(url) = image.as_str() {
            if url.len() > MAX_IMAGE.div_ceil(3) * 4 + 32 {
                return Err(image_error());
            }
            let (prefix, encoded) = url.split_once(',').ok_or_else(image_error)?;
            let lower = prefix.to_ascii_lowercase();
            let mime = match lower.as_str() {
                "data:image/png;base64" => "image/png",
                "data:image/jpeg;base64" => "image/jpeg",
                "data:image/webp;base64" => "image/webp",
                _ => return Err(image_error()),
            };
            (mime, encoded)
        } else {
            keys(image, &["content_type", "base64"])?;
            let mime = image["content_type"].as_str().ok_or_else(image_error)?;
            if !matches!(mime, "image/png" | "image/jpeg" | "image/webp") {
                return Err(image_error());
            }
            (mime, image["base64"].as_str().ok_or_else(image_error)?)
        };
        let bytes = decode(encoded)?;
        total += bytes.len();
        if total > MAX_TOTAL {
            return Err(image_error());
        }
        let (w, h) = dimensions(&bytes, mime)?;
        if w == 0 || h == 0 || u64::from(w) * u64::from(h) > 16_000_000 {
            return Err(image_error());
        }
    }
    Ok(())
}

pub fn request(
    model: &str,
    state: &Value,
    questions: &Value,
    images: Option<&Value>,
) -> Result<Value> {
    if !matches!(model, "clef" | "clef-flash") {
        return Err(Error::invalid("Invalid Clef model"));
    }
    crate::decisions::check_questions(questions, "Clef questions")?;
    for (id, q) in object(questions)? {
        if id.is_empty()
            || id.len() > 100
            || !id
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"_.-".contains(&c))
            || q["instructions"]
                .as_str()
                .is_none_or(|v| v.trim().is_empty())
        {
            return Err(Error::invalid("Invalid Clef question ID or instructions"));
        }
        let n = q["criteria"]
            .as_object()
            .map_or_else(|| q["criteria"].as_array().map_or(0, Vec::len), Map::len);
        if (q["type"] == "choice" && n < 2) || (q["type"] == "score" && !(2..=10).contains(&n)) {
            return Err(Error::invalid(
                "Clef choice requires at least two options; score requires 2..10 levels",
            ));
        }
    }
    if canonical(state)?.len() > 262_144 {
        return Err(Error::limit("Clef state exceeds 262144 bytes"));
    }
    let mut body = json!({"model":model,"state":state,"questions":questions});
    if let Some(images) = images {
        check_images(images)?;
        body["images"] = images.clone();
    }
    if canonical(&body)?.len() > MAX_BODY {
        return Err(Error::limit("Clef request exceeds 13 MiB"));
    }
    Ok(body)
}

fn probability(v: &Value) -> Result<f64> {
    v.as_f64()
        .filter(|n| n.is_finite() && (0.0..=1.0).contains(n))
        .ok_or_else(|| Error::invalid("probability"))
}

fn score_endpoint(bounds: &[(f64, f64)], lower_total: f64, maximum: bool) -> f64 {
    let mut mean: f64 = bounds.iter().enumerate().map(|(i, b)| i as f64 * b.0).sum();
    let mut remaining = (1.0 - lower_total).max(0.0);
    for position in 0..bounds.len() {
        let i = if maximum {
            bounds.len() - 1 - position
        } else {
            position
        };
        let added = remaining.min(bounds[i].1 - bounds[i].0);
        mean += i as f64 * added;
        remaining -= added;
        if remaining <= 0.0 {
            break;
        }
    }
    mean
}

pub fn response(value: &Value, model: &str, questions: &Value) -> Result<(Value, Value)> {
    parse_response(value, model, questions).map_err(|_| {
        Error::new(
            "EFFECT_UNPARSEABLE",
            "Invalid Cloudflare Clef response; body withheld",
        )
    })
}

fn parse_response(value: &Value, model: &str, questions: &Value) -> Result<(Value, Value)> {
    keys(value, &["success", "result", "errors", "messages"])?;
    if value["success"] != true
        || value
            .get("errors")
            .is_some_and(|v| v.as_array().is_none_or(|v| !v.is_empty()))
        || value
            .get("messages")
            .is_some_and(|v| v.as_array().is_none_or(|v| v.len() > 64))
    {
        return Err(Error::invalid("envelope"));
    }
    let raw = &value["result"];
    keys(raw, &["model", "answers", "usage"])?;
    if raw["model"] != model {
        return Err(Error::invalid("model"));
    }
    let declared = object(&raw["answers"])?;
    let qs = object(questions)?;
    if declared.len() != qs.len() || declared.keys().any(|id| !qs.contains_key(id)) {
        return Err(Error::invalid("answer IDs"));
    }
    let mut answers = Map::new();
    for (id, q) in qs {
        let a = &declared[id];
        if a["type"] != q["type"] {
            return Err(Error::invalid("answer type"));
        }
        if q["type"] == "noul" {
            keys(a, &["type", "noul"])?;
            probability(&a["noul"])?;
            answers.insert(id.clone(), a.clone());
            continue;
        }
        if q["type"] == "choice" {
            keys(a, &["type", "choice", "confidence", "probabilities"])?;
        } else {
            keys(
                a,
                &["type", "score", "legend", "confidence", "probabilities"],
            )?;
        }
        probability(&a["confidence"])?;
        let expected: Vec<String> = if q["type"] == "choice" {
            object(&q["criteria"])?.keys().cloned().collect()
        } else {
            q["criteria"]
                .as_array()
                .ok_or_else(|| Error::invalid("criteria"))?
                .iter()
                .enumerate()
                .map(|(i, _)| i.to_string())
                .collect()
        };
        let p = object(&a["probabilities"])?;
        if p.len() != expected.len() || expected.iter().any(|k| !p.contains_key(k)) {
            return Err(Error::invalid("probability IDs"));
        }
        let mut sum = 0.0;
        let mut bounds = Vec::with_capacity(expected.len());
        for k in &expected {
            let value = probability(&p[k])?;
            sum += value;
            bounds.push(((value - 0.0005).max(0.0), (value + 0.0005).min(1.0)));
        }
        let lower_total: f64 = bounds.iter().map(|b| b.0).sum();
        let upper_total: f64 = bounds.iter().map(|b| b.1).sum();
        if sum <= 0.0 || lower_total > 1.0 + 1e-9 || upper_total < 1.0 - 1e-9 {
            return Err(Error::invalid("probability mass"));
        }
        if q["type"] == "choice" {
            let choice = a["choice"]
                .as_str()
                .ok_or_else(|| Error::invalid("choice"))?;
            if !p.contains_key(choice)
                || p.values().any(|v| {
                    v.as_f64().unwrap_or(2.0) > p[choice].as_f64().unwrap_or(-1.0) + 0.000001
                })
            {
                return Err(Error::invalid("choice"));
            }
        } else {
            let levels = q["criteria"]
                .as_array()
                .ok_or_else(|| Error::invalid("criteria"))?;
            let legend: Map<String, Value> = levels
                .iter()
                .enumerate()
                .map(|(i, v)| (i.to_string(), v.clone()))
                .collect();
            let score = a["score"]
                .as_f64()
                .filter(|n| n.is_finite())
                .ok_or_else(|| Error::invalid("score"))?;
            if a["legend"] != Value::Object(legend)
                || score < 0.0
                || score > (levels.len() - 1) as f64
                || score + 0.0005 < score_endpoint(&bounds, lower_total, false) - 1e-9
                || score - 0.0005 > score_endpoint(&bounds, lower_total, true) + 1e-9
            {
                return Err(Error::invalid("score or legend"));
            }
        }
        answers.insert(id.clone(), a.clone());
    }
    keys(&raw["usage"], &["input_tokens", "output_tokens"])?;
    let mut usage = json!({"model":model});
    for (wire, ours) in [("input_tokens", "tokensIn"), ("output_tokens", "tokensOut")] {
        let n = raw["usage"][wire]
            .as_u64()
            .filter(|n| *n <= 1_000_000_000)
            .ok_or_else(|| Error::invalid("usage"))?;
        usage[ours] = json!(n);
    }
    Ok((json!({"answers":answers}), json!({"usage":usage})))
}

pub fn prepare(
    model: &str,
    request_value: &Value,
    images: Option<&Value>,
) -> Result<(Value, bool)> {
    let single = match request_value["kind"].as_str() {
        Some("classifier") => true,
        Some("decide") => false,
        Some("gate") => {
            return Err(Error::new(
                "EFFECT_UNBOUND",
                "approval gates require a host approval executor, not a model",
            ));
        }
        _ => {
            return Err(Error::new(
                "EFFECT_UNPARSEABLE",
                "Clef serves typed decisions only",
            ));
        }
    };
    let questions = if single {
        crate::decisions::choice_question(request_value)?
    } else {
        request_value["questions"].clone()
    };
    let state = json!({"prompt":request_value["prompt"],"context":request_value["context"]});
    let supplied = request_value.get("images");
    if supplied.is_some() && images.is_some() {
        return Err(Error::invalid("images must have one source"));
    }
    Ok((
        request(model, &state, &questions, supplied.or(images))?,
        single,
    ))
}

pub async fn ask(
    account: &str,
    credential: &str,
    body: &Value,
    deadline_ms: u64,
) -> Result<(Value, Value)> {
    let model = body["model"]
        .as_str()
        .ok_or_else(|| Error::invalid("model"))?;
    let body = request(
        model,
        &body["state"],
        &body["questions"],
        body.get("images"),
    )?;
    let url = endpoint(account, model)?;
    crate::credentials::check_shape(credential, "Cloudflare credential")?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_millis(deadline_ms.clamp(1, 120_000)))
        .build()
        .map_err(|_| Error::new("EFFECT_FAILED", "HTTP client initialization failed"))?;
    let mut res = client
        .post(url)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(canonical(&body)?)
        .bearer_auth(credential)
        .send()
        .await
        .map_err(|_| {
            Error::new(
                "EFFECT_FAILED",
                "Clef request failed or timed out; external completion uncertain",
            )
            .uncertain()
        })?;
    if !res.status().is_success() {
        return Err(Error::new(
            "EFFECT_FAILED",
            format!(
                "Clef returned HTTP {}; redirects and response body withheld",
                res.status().as_u16()
            ),
        ));
    }
    if res
        .content_length()
        .is_some_and(|n| n > MAX_RESPONSE as u64)
    {
        return Err(Error::limit("Clef response bytes").uncertain());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = res.chunk().await.map_err(|_| {
        Error::new(
            "EFFECT_FAILED",
            "Clef response read failed; external completion uncertain",
        )
        .uncertain()
    })? {
        if bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE {
            return Err(Error::limit("Clef response bytes").uncertain());
        }
        bytes.extend_from_slice(&chunk);
    }
    let raw: Value = serde_json::from_slice(&bytes).map_err(|_| {
        Error::new(
            "EFFECT_UNPARSEABLE",
            "Invalid Cloudflare Clef response; body withheld",
        )
    })?;
    response(&raw, model, &body["questions"])
}

pub fn executor_id(model: &str) -> String {
    if model == DEFAULT_MODEL {
        "clef".into()
    } else {
        format!("clef:{model}")
    }
}
pub fn cache_identity(account: &str, model: &str, images: Option<&Value>) -> Result<String> {
    digest(
        &json!({"provider":"cloudflare","baseUrl":endpoint(account,model)?,"model":model,"images":images}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recorded_synthetic_scores_allow_rounding_but_reject_inconsistent_scores() {
        let questions = json!({"severity":{"type":"score","instructions":"How severe is the customer impact?","criteria":["No impact","Minor","Major","Critical"]}});
        for (model, score, confidence, probabilities) in [
            (
                "clef",
                2.931,
                0.8612,
                json!({"0":0.0047,"1":0.0051,"2":0.0448,"3":0.9454}),
            ),
            (
                "clef-flash",
                2.7378,
                0.5316,
                json!({"0":0.0149,"1":0.0157,"2":0.186,"3":0.7834}),
            ),
        ] {
            let mut envelope = json!({"success":true,"result":{"model":model,"usage":{"input_tokens":319,"output_tokens":0},"answers":{"severity":{"type":"score","score":score,"confidence":confidence,"probabilities":probabilities,"legend":{"0":"No impact","1":"Minor","2":"Major","3":"Critical"}}}}});
            let (output, _) = response(&envelope, model, &questions).unwrap();
            assert_eq!(output["answers"]["severity"]["score"], json!(score));
            envelope["result"]["answers"]["severity"]["score"] = json!(score - 0.01);
            assert!(response(&envelope, model, &questions).is_err());
        }
    }

    #[test]
    fn probability_rounding_requires_a_feasible_normalized_distribution() {
        let questions = json!({"label":{"type":"choice","instructions":"Choose","criteria":{"a":null,"b":null,"c":null}}});
        for (p, valid) in [(0.333, true), (0.0, false), (0.332, false), (0.334, false)] {
            let envelope = json!({"success":true,"result":{"model":"clef","usage":{"input_tokens":12,"output_tokens":0},"answers":{"label":{"type":"choice","choice":"a","confidence":0.2,"probabilities":{"a":p,"b":p,"c":p}}}}});
            assert_eq!(response(&envelope, "clef", &questions).is_ok(), valid);
        }
    }

    #[test]
    fn image_size_padding_and_pixel_limits_are_checked() {
        for value in ["====", "AA=A", "AB==", "AAAA=", "private"] {
            assert!(decode(value).is_err());
        }
        assert!(decode(&"A".repeat((MAX_IMAGE + 1).div_ceil(3) * 4)).is_err());
        let mut png = [0u8; 33];
        png[..8].copy_from_slice(&[137, 80, 78, 71, 13, 10, 26, 10]);
        png[8..12].copy_from_slice(&13u32.to_be_bytes());
        png[12..16].copy_from_slice(b"IHDR");
        png[16..20].copy_from_slice(&4001u32.to_be_bytes());
        png[20..24].copy_from_slice(&4001u32.to_be_bytes());
        assert!(dimensions(&png, "image/png").is_err());
        assert!(dimensions(&png, "image/jpeg").is_err());
        assert!(check_images(&json!([{ "content_type":"image/png","base64":"iVBORw0KGgoAAAANSUhEUgAAD6EAAA+hCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=" }])).is_err());
        let large = format!(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC{}",
            "A".repeat(4 * 1024 * 1024 - 44)
        );
        assert!(
            check_images(&json!([{ "content_type":"image/png","base64":large.clone() }])).is_err()
        );
        assert!(check_images(&json!([{ "content_type":"image/png","base64":large.clone() },{ "content_type":"image/png","base64":large.clone() },{ "content_type":"image/png","base64":large }])).is_err());
    }

    #[test]
    fn jpeg_and_webp_require_image_payload_and_complete_containers() {
        let header = [255, 216, 255, 192, 0, 8, 8, 0, 1, 0, 1, 1, 255, 217];
        assert!(dimensions(&header, "image/jpeg").is_err());
        let jpeg = [
            255, 216, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63,
            0, 1, 255, 217,
        ];
        assert_eq!(dimensions(&jpeg, "image/jpeg").unwrap(), (1, 1));
        assert!(dimensions(&jpeg[..jpeg.len() - 1], "image/jpeg").is_err());
        let mut header = [0u8; 30];
        header[..4].copy_from_slice(b"RIFF");
        header[4..8].copy_from_slice(&22u32.to_le_bytes());
        header[8..16].copy_from_slice(b"WEBPVP8X");
        header[16..20].copy_from_slice(&10u32.to_le_bytes());
        assert!(dimensions(&header, "image/webp").is_err());
        let webp = decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA").unwrap();
        assert_eq!(dimensions(&webp, "image/webp").unwrap(), (1, 1));
        assert!(dimensions(&webp[..webp.len() - 1], "image/webp").is_err());
    }
}
