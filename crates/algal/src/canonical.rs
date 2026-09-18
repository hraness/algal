use crate::{Error, Result};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{cmp::Ordering, io::Read};

pub const MAX_DOCUMENT_BYTES: usize = 67_108_864;

pub fn read_json(reader: impl Read, max: usize) -> Result<Value> {
    if max > MAX_DOCUMENT_BYTES {
        return Err(Error::limit("document limit"));
    }
    let mut bytes = Vec::new();
    reader.take(max as u64 + 1).read_to_end(&mut bytes)?;
    if bytes.len() > max {
        return Err(Error::limit("document bytes"));
    }
    Ok(serde_json::from_slice(&bytes)?)
}

fn array_index(key: &str) -> Option<u32> {
    let n: u32 = key.parse().ok()?;
    (n != u32::MAX && n.to_string() == key).then_some(n)
}

fn key_order(a: &str, b: &str) -> Ordering {
    match (array_index(a), array_index(b)) {
        (Some(a), Some(b)) => a.cmp(&b),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        _ => a.encode_utf16().cmp(b.encode_utf16()),
    }
}

fn encode(value: &Value, out: &mut String, depth: usize) -> Result<()> {
    if depth > 64 {
        return Err(Error::limit("JSON depth exceeds 64"));
    }
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(value) => out.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => {
            let n = value
                .as_f64()
                .ok_or_else(|| Error::invalid("finite JSON number required"))?;
            if !n.is_finite() {
                return Err(Error::invalid("finite JSON number required"));
            }
            out.push_str(ryu_js::Buffer::new().format(n));
        }
        Value::String(value) => out.push_str(&serde_json::to_string(value)?),
        Value::Array(values) => {
            out.push('[');
            for (i, value) in values.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                encode(value, out, depth + 1)?;
            }
            out.push(']');
        }
        Value::Object(values) => {
            let mut keys: Vec<_> = values.keys().collect();
            keys.sort_by(|a, b| key_order(a, b));
            out.push('{');
            for (i, key) in keys.into_iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&serde_json::to_string(key)?);
                out.push(':');
                encode(&values[key], out, depth + 1)?;
            }
            out.push('}');
        }
    }
    if out.len() > MAX_DOCUMENT_BYTES {
        return Err(Error::limit("canonical document bytes"));
    }
    Ok(())
}

pub fn canonical(value: &Value) -> Result<String> {
    let mut out = String::new();
    encode(value, &mut out, 0)?;
    Ok(out)
}

pub fn digest_bytes(bytes: &[u8]) -> String {
    format!("sha256:{:x}", Sha256::digest(bytes))
}

pub fn digest(value: &Value) -> Result<String> {
    Ok(digest_bytes(canonical(value)?.as_bytes()))
}

pub fn check_digest(value: &str) -> Result<&str> {
    if value.len() != 71
        || !value.starts_with("sha256:")
        || !value[7..]
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err(Error::invalid("expected sha256:<64 lowercase hex> digest"));
    }
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn matches_javascript_canonical_numbers_and_property_order() {
        let value: Value = serde_json::from_str(
            r#"{"10":-0.0,"2":1e21,"x":1e-7,"__proto__":{"ok":true},"a":1.0}"#,
        )
        .unwrap();
        assert_eq!(
            canonical(&value).unwrap(),
            r#"{"2":1e+21,"10":0,"__proto__":{"ok":true},"a":1,"x":1e-7}"#
        );
        assert_eq!(
            digest(&json!({"b":2,"a":1})).unwrap(),
            digest(&json!({"a":1,"b":2})).unwrap()
        );
    }

    #[test]
    fn digest_validation_cannot_form_a_path() {
        assert!(check_digest("sha256:../../outside").is_err());
        assert!(check_digest(&digest(&json!(null)).unwrap()).is_ok());
    }
}
