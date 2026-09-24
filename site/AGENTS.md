# Contents

- `chrome.ts`, `pages/`, `styles.css`, and `build.ts` own the static ALGAL website and its executable example projections. `pages/` holds the home, tour, and use-cases fragments composed into `chrome.ts`'s shared shell.
- `markdown.ts` is the dependency-free renderer behind the `/docs/` mirror: `build.ts` renders the curated `docs/` set and all of `spec/v1/` into `/docs/` and `/docs/spec/` with one shared navigation rail. Repository markdown stays the source of truth; internal working notes are deliberately unmirrored and their links resolve to the GitHub blob.
- `viewer.ts` is the browser-side interactive diagram runtime: pan/zoom, cell inspection, and recorded-run replay driven by `algal.diagram-view.v1` documents emitted by `build.ts`. It shares layout geometry with `src/diagram.ts`'s `layoutDiagram` and degrades to the static SVG fallback without JavaScript.
- `icons.ts` holds the Hugeicons sprite map; icon references are root-relative `/icons.svg#name`.
- `algal-mark.svg`, `BRAND_ASSETS.md`, `client.ts`, and `appearance.ts` bind the existing product identity to the released metallic treatment.

# Guidelines

- Preserve product copy, executable examples, navigation, and the Tokyo Night palette and light/dark/system appearance.
- Keep Design Kit and UI as pinned build-only dependencies; the CLI retains zero required runtime dependencies.
- Bundle the released marketing stylesheet with its syntax stylesheet and license. Do not fork its foil recipe.
- The header mark and wordmark share the released recipe. Retain the original image underneath the alpha mask for forced colors and unsupported masks.
- Run the repository's `bun run check` and inspect the built header at phone and desktop sizes before delivery. Preserve required remote checks and exact production identity verification.
