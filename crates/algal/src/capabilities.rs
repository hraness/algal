use crate::{
    Error, Result,
    canonical::{check_digest, digest},
    contract::id,
};
use serde_json::{Value, json};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CapabilityHandle {
    pub handle: String,
    pub capability: String,
    pub digest: String,
}

pub fn capability_handle(capability: &str, descriptor: &Value) -> Result<String> {
    id(&json!(capability))?;
    Ok(format!("cap:{capability}:{}", digest(descriptor)?))
}

pub fn parse_capability_handle(handle: &str, expected: Option<&str>) -> Result<CapabilityHandle> {
    let parts: Vec<_> = handle.split(':').collect();
    if parts.len() != 4 || parts[0] != "cap" || parts[2] != "sha256" {
        return Err(Error::new("TYPE_MISMATCH", "invalid capability handle"));
    }
    id(&json!(parts[1]))?;
    let digest = format!("sha256:{}", parts[3]);
    check_digest(&digest)?;
    if expected.is_some_and(|wanted| wanted != parts[1]) {
        return Err(Error::new(
            "TYPE_MISMATCH",
            format!(
                "capability carries {}, expected {}",
                parts[1],
                expected.unwrap_or_default()
            ),
        ));
    }
    Ok(CapabilityHandle {
        handle: handle.to_owned(),
        capability: parts[1].to_owned(),
        digest,
    })
}

/// Suspension evidence is bounded, unique, and contains only opaque handles.
pub fn parse_wake_capabilities(value: &Value) -> Result<Vec<String>> {
    let values = value
        .as_array()
        .ok_or_else(|| Error::invalid("wake capabilities must be an array"))?;
    if values.is_empty() || values.len() > 16 {
        return Err(Error::invalid(
            "wake capabilities must contain 1..16 handles",
        ));
    }
    let mut handles = Vec::new();
    for value in values {
        let handle = value
            .as_str()
            .ok_or_else(|| Error::invalid("wake capability must be a string"))?;
        parse_capability_handle(handle, None)?;
        if handles.iter().any(|previous| previous == handle) {
            return Err(Error::invalid("wake capabilities must be unique"));
        }
        handles.push(handle.to_owned());
    }
    Ok(handles)
}
