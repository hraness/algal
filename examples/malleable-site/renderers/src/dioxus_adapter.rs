use crate::{Layout, Role, SurfaceNode};
use dioxus::prelude::*;

/// Keys preserve stable component identities across admitted tree replacements.
#[component]
pub fn Surface(node: SurfaceNode) -> Element {
    match node {
        SurfaceNode::Stack {
            id,
            layout,
            children,
        } => {
            let class = if layout == Layout::Split {
                "surface-stack surface-split"
            } else {
                "surface-stack"
            };
            rsx! { section { "data-surface-id": id, class,
                for child in children { Surface { key: "{child.id()}", node: child } }
            } }
        }
        SurfaceNode::Text { id, role, text } => match role {
            Role::Heading => rsx! { h1 { "data-surface-id": id, "{text}" } },
            Role::Eyebrow => rsx! { p { "data-surface-id": id, class: "eyebrow", "{text}" } },
            Role::Body => rsx! { p { "data-surface-id": id, class: "body", "{text}" } },
            Role::Status => {
                rsx! { p { "data-surface-id": id, class: "status", role: "status", "{text}" } }
            }
        },
        SurfaceNode::Link { id, label, href } => {
            rsx! { a { "data-surface-id": id, class: "cta", href, "{label}" } }
        }
    }
}

pub const STYLE: &str = r#"
:root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #101210; color: #eef0e6; }
body { margin: 0; padding: clamp(1.25rem, 6vw, 5rem); }
main { max-width: 64rem; margin: auto; }
.meta { color: #aeb7a8; font: .75rem ui-monospace, monospace; margin: 0 0 3rem; }
.surface-stack { display: flex; flex-direction: column; gap: 1.25rem; }
.surface-split { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 2rem; }
.surface-split > h1, .surface-split > .eyebrow, .surface-split > .status { grid-column: 1 / -1; }
.surface-split > .cta { align-self: end; }
h1 { font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: 1.02; font-weight: 500; letter-spacing: -.055em; margin: 0; overflow-wrap: anywhere; }
p { margin: 0; }
.eyebrow { color: #c6f08b; font-size: .75rem; text-transform: uppercase; letter-spacing: .14em; }
.body { color: #c7cec1; max-width: 40rem; font-size: 1.1rem; line-height: 1.6; }
.status { color: #aeb7a8; font: .8rem ui-monospace, monospace; border-top: 1px solid #333a30; padding-top: 1rem; }
.cta { align-self: flex-start; justify-self: start; color: #17220e; background: #c6f08b; border-radius: .3rem; padding: .85rem 1rem; font-size: .9rem; text-decoration: none; }
a:focus-visible { outline: 3px solid white; outline-offset: 5px; }
@media(max-width: 40rem) { .surface-split { display: flex; flex-direction: column; } }
"#;
