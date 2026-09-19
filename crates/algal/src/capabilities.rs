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
