use algal_surface_renderers::{
    FIXTURE,
    dioxus_adapter::{STYLE, Surface},
    parse_view,
};
use dioxus::prelude::*;

fn main() {
    dioxus::launch(app);
}

fn app() -> Element {
    let node = parse_view(FIXTURE).expect("checked embedded surface");
    rsx! {
        style { "{STYLE}" }
        main {
            p { class: "meta", "ALGAL / Dioxus renderer feasibility · shared surface tree" }
            Surface { node }
        }
    }
}
