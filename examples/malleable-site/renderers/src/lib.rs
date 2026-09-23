//! Renderer adapters for the experimental ALGAL marketing SurfaceNode contract.
//! They render admitted data; they do not evaluate ALGAL or confer revision authority.
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

pub const MAX_BYTES: usize = 32_768;
pub const FIXTURE: &str = include_str!("../fixtures/view.json");

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Layout {
    Stack,
    Split,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Eyebrow,
    Heading,
    Body,
    Status,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum SurfaceNode {
    Stack {
        id: String,
        layout: Layout,
        children: Vec<SurfaceNode>,
    },
    Text {
        id: String,
        role: Role,
        text: String,
    },
    Link {
        id: String,
        label: String,
        href: String,
    },
}

impl SurfaceNode {
    pub fn id(&self) -> &str {
        match self {
            Self::Stack { id, .. } | Self::Text { id, .. } | Self::Link { id, .. } => id,
        }
    }
}

/// Validate before handing untrusted input to any renderer. This adapter accepts
/// only the three node kinds and the host-fixed docs destination.
pub fn parse_view(input: &str) -> Result<SurfaceNode, String> {
    if input.len() > MAX_BYTES {
        return Err("surface exceeds byte bound".into());
    }
    let node: SurfaceNode = serde_json::from_str(input).map_err(|_| "invalid surface JSON")?;
    if !matches!(node, SurfaceNode::Stack { .. }) {
        return Err("surface root must be a stack".into());
    }
    let mut ids = BTreeSet::new();
    validate(&node, 0, &mut ids)?;
    Ok(node)
}

fn bounded_text(value: &str, max: usize) -> bool {
    // Match JavaScript String.trim and String.length at the shared boundary.
    // Rust's Unicode whitespace set differs (for example U+0085 and U+FEFF).
    !value.chars().all(|c| {
        matches!(c as u32,
        9..=13 | 32 | 160 | 5760 | 8192..=8202 | 8232..=8233 | 8239 | 8287 | 12288 | 65279)
    }) && value.encode_utf16().count() <= max
        && !value
            .chars()
            .any(|c| matches!(c as u32, 0..=8 | 11..=12 | 14..=31 | 127))
}

fn validate(node: &SurfaceNode, depth: usize, ids: &mut BTreeSet<String>) -> Result<(), String> {
    let id = node.id();
    if depth > 4 || ids.len() >= 32 {
        return Err("surface structure bound exceeded".into());
    }
    if id.is_empty()
        || id.len() > 64
        || !id.as_bytes()[0].is_ascii_lowercase()
        || !id
            .bytes()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
        || !ids.insert(id.to_owned())
    {
        return Err("invalid or duplicate surface identity".into());
    }
    match node {
        SurfaceNode::Stack { children, .. } => {
            if children.is_empty() || children.len() > 16 {
                return Err("invalid child count".into());
            }
            for child in children {
                validate(child, depth + 1, ids)?;
            }
        }
        SurfaceNode::Text { text, .. } => {
            if !bounded_text(text, 280) {
                return Err("invalid surface text".into());
            }
        }
        SurfaceNode::Link { label, href, .. } => {
            if !bounded_text(label, 32) || href != "/docs/" {
                return Err("invalid surface link".into());
            }
        }
    }
    Ok(())
}

#[cfg(feature = "dioxus-ui")]
pub mod dioxus_adapter;
#[cfg(feature = "tui")]
pub mod tui_adapter;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_fixture_round_trips() {
        let view = parse_view(FIXTURE).unwrap();
        assert_eq!(
            parse_view(&serde_json::to_string(&view).unwrap()).unwrap(),
            view
        );
    }

    #[test]
    fn rejects_unknown_authority_and_duplicate_identity() {
        let original: serde_json::Value = serde_json::from_str(FIXTURE).unwrap();
        let mutations: [fn(&mut serde_json::Value); 4] = [
            |v| {
                v["onclick"] = "evil".into();
            },
            |v| {
                v["children"][3]["href"] = "javascript:alert(1)".into();
            },
            |v| {
                v["children"][1]["id"] = "surface".into();
            },
            |v| {
                v["children"][1]["text"] = "x".repeat(281).into();
            },
        ];
        for mutate in mutations {
            let mut input = original.clone();
            mutate(&mut input);
            assert!(parse_view(&input.to_string()).is_err());
        }
    }

    #[test]
    fn markup_is_data_and_not_an_executable_node() {
        let literal = FIXTURE.replace(
            "Software that can grow with you.",
            "<script>alert(1)</script>",
        );
        assert!(parse_view(&literal).is_ok());
        assert!(
            parse_view(&FIXTURE.replace("\"kind\": \"link\"", "\"kind\": \"script\"")).is_err()
        );
    }

    #[test]
    fn matches_javascript_text_length_and_whitespace() {
        let mut view: serde_json::Value = serde_json::from_str(FIXTURE).unwrap();
        for (text, valid) in [
            ("\u{feff}".into(), false),
            ("\u{85}".into(), true),
            ("🦀".repeat(140), true),
            ("🦀".repeat(141), false),
        ] {
            view["children"][2]["text"] = serde_json::Value::String(text);
            assert_eq!(parse_view(&view.to_string()).is_ok(), valid);
        }
    }
}
