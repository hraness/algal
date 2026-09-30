# Contents

- `chrome.ts`, `pages/`, `styles.css`, and `build.ts` own the static ALGAL website and its executable example projections. `pages/` holds the home, tour, use-cases, living, and workbench fragments composed into `chrome.ts`'s shared shell.
- `copy.ts` holds text rendered in more than one place: the home description (also the JSON-LD and `llms.txt` lead), the tagline (also the social card description), and the shared limits paragraphs.
- `social-image.ts` is the site's one `defineSocialImageSite` declaration (name, domain, description, favicon app icon, Tokyo Night light theme). `build.ts` renders `/og.png` and one `/og/blog/<slug>.png` per post from it.
- `markdown.ts` is the dependency-free renderer behind the `/docs/` mirror: `build.ts` renders the curated `docs/` set and all of `spec/v1/` into `/docs/` and `/docs/spec/` with one shared navigation rail. Repository markdown stays the source of truth; internal working notes are deliberately unmirrored and their links resolve to the GitHub blob.
- `highlight.ts` is the dependency-free tokenizer for the languages the shared `@hraness/design-kit/syntax-highlighting` layer does not know: `highlightAlgal` for `algal` fences and executable examples, `highlightJson` for the browser program and evidence viewers. Keep the algal grammar aligned with the `src/source.ts` lexer and never let a highlighter throw on a fragment. Keep it dependency-free so browser bundles do not pull in sugar-high.
- `viewer.ts` is the browser-side interactive diagram runtime: pan/zoom, cell inspection, and recorded-run replay driven by `algal.diagram-view.v1` documents emitted by `build.ts`. It shares layout geometry with `src/diagram.ts`'s `layoutDiagram` and degrades to the static SVG fallback without JavaScript.
- `blog.ts` renders `blog/*.md` with the Design Kit article layer and writes the blog index, Atom feed, sitemap entries, and llms.txt list; `blog-posts.ts` holds each post's review record (`ArticleAdmission`), its sources, and cross-host links waiting to go live. Only `indexable` posts reach the index, sitemap, feed, and llms.txt; `quarantined` posts render with robots noindex.
- `icons.ts` holds the Hugeicons sprite map; icon references are root-relative `/icons.svg#name`.
- `algal-mark.svg`, `BRAND_ASSETS.md`, `client.ts`, and `appearance.ts` bind the existing product identity to the released metallic treatment.

# Guidelines

- Preserve executable examples, navigation, the `{{PLACEHOLDER}}` tokens in `pages/`, and the Tokyo Night palette and light/dark/system appearance. A design change does not rewrite product copy as a side effect.
- Copy edits follow the root `AGENTS.md` "Public copy" section and `STYLE.md`. Verify each command, flag, and limit against the CLI and docs before you change it, keep every true limit, and put text shown on more than one page in `copy.ts`. The site tagline and home H1 come from the portfolio messaging record (product `algal`).
- Keep Design Kit and UI as pinned build-only dependencies; the CLI retains zero required runtime dependencies.
- Bundle the released marketing stylesheet with its syntax stylesheet and license. Do not fork its foil recipe.
- Share images come only from the shared `@hraness/web-discovery` social-image template via the single `defineSocialImageSite` declaration in `social-image.ts`. Pages pass copy only (headline, description, eyebrow); add no per-site drawing code, custom card layouts, or committed card PNGs.
- The header mark and wordmark share the released recipe. Retain the original image underneath the alpha mask for forced colors and unsupported masks.
- Run the repository's `bun run check` and inspect the built header at phone and desktop sizes before delivery. Preserve required remote checks and exact production identity verification.

- Website names, product descriptions, hero copy, and named headings read the website-local `portfolio-messaging.generated.json` projection of `https://hraness.com/portfolio.json`. Edit the canonical Jungle portfolio registry and refresh that snapshot; ordinary builds never fetch or rewrite it.
