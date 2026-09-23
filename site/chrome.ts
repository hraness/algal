// Shared document chrome: head, header, nav, and footer for every site page.
// Per-page fragments supply only their <main> content and metadata.
import { siteIcon } from "./icons";

export type SitePageId = "home" | "tour" | "use-cases" | "living" | "grow" | "workbench" | "docs" | "spec" | "blog" | "compare";

export interface SitePageMeta {
  page: SitePageId;
  /** Canonical path, e.g. "/", "/tour/". */
  path: string;
  title: string;
  description: string;
  ogTitle: string;
  ogAlt: string;
  /** Blog posts emit article metadata; everything else stays a website. */
  article?: { published: string };
}

const ORIGIN = "https://algal.computer";
const REPO = "https://github.com/hraness/algal";

function navLink(page: SitePageId, id: SitePageId, href: string, label: string): string {
  const current = page === id ? ' aria-current="page"' : "";
  return `<a href="${href}"${current}>${label}</a>`;
}

export function pageDocument(meta: SitePageMeta, main: string): string {
  const canonical = `${ORIGIN}${meta.path}`;
  return `<!doctype html>
<html lang="en" data-hraness-theme="paper" data-hraness-marketing-preset="editorial" data-hraness-material="lantern">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="${meta.article ? "article" : "website"}">${meta.article ? `\n<meta property="article:published_time" content="${meta.article.published}">` : ""}
<meta property="og:site_name" content="ALGAL">
<meta property="og:title" content="${meta.ogTitle}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${meta.ogAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${meta.ogTitle}">
<meta name="twitter:description" content="${meta.description}">
<meta name="twitter:image" content="${ORIGIN}/og.png">
<meta name="robots" content="index, follow">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"ALGAL","url":"${ORIGIN}/"},{"@type":"SoftwareApplication","name":"ALGAL","url":"${ORIGIN}/","description":"A programming language and virtual machine where programs are organisms: typed, bounded, content-addressed, and replayable.","applicationCategory":"DeveloperApplication","codeRepository":"${REPO}","license":"https://opensource.org/license/mit","author":{"@id":"https://github.com/hraness#org"}},{"@type":"Organization","@id":"https://github.com/hraness#org","name":"hraness","url":"https://github.com/hraness"}]}
</script>
<meta name="theme-color" content="#f8f7f4">
<script src="/appearance.js"></script>
<link rel="stylesheet" href="/styles.css">
<script src="/client.js" defer></script>
<script src="/viewer.js" defer></script>
${meta.page === "living" ? '<link rel="stylesheet" href="/living.css">\n<script src="/living.js" type="module"></script>' : ""}
${meta.page === "grow" ? '<link rel="stylesheet" href="/living.css">\n<link rel="stylesheet" href="/grow.css">\n<script src="/grow.js" type="module"></script>' : ""}
${meta.page === "workbench" ? '<link rel="stylesheet" href="/living.css">\n<link rel="stylesheet" href="/workbench.css">\n<script src="/workbench.js" type="module"></script>' : ""}
</head>
<body class="algal-site">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header hraness-marketing-header hraness-marketing-header-surface">
  <div class="site-header-inner hraness-marketing-header__inner">
    <a class="wordmark hraness-foil-text" data-foil="" href="/" aria-label="ALGAL home"><span class="brand-mark hraness-foil-mark" data-foil="" style="--hraness-foil-mask: url('/algal-mark.svg')" aria-hidden="true"><img class="hraness-foil-mark__image" src="/algal-mark.svg" width="28" height="28" alt=""><span class="hraness-foil-mark__paint" aria-hidden="true"></span></span>algal</a>
    <nav aria-label="Main navigation">
      ${navLink(meta.page, "tour", "/tour/", "Tour")}
      ${navLink(meta.page, "use-cases", "/use-cases/", "Use cases")}
      ${navLink(meta.page, "docs", "/docs/", "Docs")}
      ${navLink(meta.page, "spec", "/docs/spec/organism/", "Spec")}
      ${navLink(meta.page, "blog", "/blog/", "Blog")}
      <a href="${REPO}">GitHub ${siteIcon("arrow-up-right")}</a>
    </nav>
    <div class="site-header-actions">
      <a class="hraness-marketing-action" data-emphasis="primary" href="${REPO}/releases">Install</a>
      <div class="hraness-design-theme-toggle" data-hraness-appearance-menu data-presentation="menu" data-ready="false" aria-busy="true">
        <button class="hraness-design-theme-toggle__trigger" type="button" aria-label="Appearance: System" aria-haspopup="menu" aria-expanded="false" aria-controls="algal-appearance-menu" disabled><span data-current-appearance-icon="system">${siteIcon("computer")}</span></button>
        <div class="hraness-design-theme-toggle__popover" hidden>
          <div class="hraness-design-theme-toggle__menu" id="algal-appearance-menu" role="menu" aria-label="Appearance">
            <button class="hraness-design-theme-toggle__item" type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-theme-value="light"><span data-appearance-icon="light"></span><span>Light</span></button>
            <button class="hraness-design-theme-toggle__item" type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-theme-value="dark"><span data-appearance-icon="dark"></span><span>Dark</span></button>
            <button class="hraness-design-theme-toggle__item" type="button" role="menuitemradio" aria-checked="true" tabindex="-1" data-theme-value="system"><span data-appearance-icon="system"></span><span>System</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</header>

${main}

<footer class="site-footer"><a class="wordmark" href="/" aria-label="ALGAL home"><img src="/favicon.svg" width="24" height="24" alt="">algal</a><p>The language for living programs.</p><div><a href="${REPO}">Source</a><a href="/docs/">Documentation</a><a href="/living/">Living software</a><a href="/blog/">Blog</a><a href="/compare/">Compare</a><a href="/docs/spec/organism/">Spec</a><a href="/llms.txt">llms.txt</a><span>MIT · Early, working software · {{BUILD_STATS}}</span></div></footer>

</body>
</html>
`;
}
