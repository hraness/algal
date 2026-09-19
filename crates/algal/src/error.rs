use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Error {
    pub code: String,
    pub message: String,
    /// Host-only suspension evidence; serialized on the effect receipt.
    #[serde(skip)]
    pub wake: Vec<String>,
}

pub type Result<T> = std::result::Result<T, Error>;

impl Error {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            wake: Vec::new(),
        }
    }
    pub fn suspended(message: impl Into<String>, handle: &str) -> Self {
        let mut error = Self::new("EFFECT_SUSPENDED", message);
        error.wake.push(handle.to_owned());
        error
    }
    pub fn invalid(message: impl Into<String>) -> Self {
        Self::new("PARSE_FAILED", message)
    }
    pub fn limit(message: impl Into<String>) -> Self {
        Self::new("BUDGET_EXHAUSTED", message)
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}
impl std::error::Error for Error {}
impl From<std::io::Error> for Error {
    fn from(value: std::io::Error) -> Self {
        Self::new("IO_FAILED", value.to_string())
    }
}
impl From<serde_json::Error> for Error {
    fn from(value: serde_json::Error) -> Self {
        Self::invalid(value.to_string())
    }
}
