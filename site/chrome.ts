// Shared document chrome: head, header, nav, and footer for every site page.
// Per-page fragments supply only their <main> content and metadata.
import { SITE_DESCRIPTION, SITE_TAGLINE } from "./copy";
import { siteIcon } from "./icons";
import { escapeHtml } from "./markdown";
import { serializeJsonLd } from "@hraness/web-discovery";
import { SITE_SOCIAL_IMAGE, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH, type SocialImageRef } from "./social-image";

export type SitePageId = "home" | "tour" | "use-cases" | "living" | "grow" | "tasks" | "workbench" | "docs" | "spec" | "blog" | "compare" | "not-found";

export interface SitePageMeta {
  page: SitePageId;
  /** Canonical path, e.g. "/", "/tour/". */
  path: string;
  title: string;
  description: string;
  ogTitle: string;
  /** Blog posts emit article metadata; everything else stays a website. */
  article?: { published: string; modified?: string };
  /** Quarantined posts stay readable but out of search indexes. */
  noindex?: boolean;
  /** A page card from site/social-image.ts; pages without one share the site card. */
  socialImage?: SocialImageRef;
  /** Extra JSON-LD nodes, such as BlogPosting or Blog. */
  jsonLd?: readonly unknown[];
}

const ORIGIN = "https://algal.computer";
const REPO = "https://github.com/hraness/algal";
// The studio entity is defined once on hraness.com; every product site points at it.
const PUBLISHER_ID = "https://hraness.com/#organization";

function navLink(page: SitePageId, id: SitePageId, href: string, label: string): string {
  const current = page === id ? ' aria-current="page"' : "";
  return `<a href="${href}"${current}>${label}</a>`;
}

export function pageDocument(meta: SitePageMeta, main: string): string {
  const canonical = `${ORIGIN}${meta.path}`;
  // The 404 document answers every missing address, so it names no canonical
  // URL and stays out of search indexes.
  const missing = meta.page === "not-found";
  // Titles and descriptions can come from Markdown, which may contain quotes.
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const ogTitle = escapeHtml(meta.ogTitle);
  const image = meta.socialImage ?? SITE_SOCIAL_IMAGE;
  const imageUrl = escapeHtml(`${ORIGIN}${image.path}`);
  return `<!doctype html>
<html lang="en" data-hraness-theme="paper" data-hraness-marketing-preset="editorial" data-hraness-material="lantern" data-palette="tokyo-night" data-hraness-pattern="none">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
${missing ? "" : `<link rel="canonical" href="${canonical}">\n`}<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="${meta.article ? "article" : "website"}">${meta.article ? `\n<meta property="article:published_time" content="${meta.article.published}">` : ""}${meta.article?.modified ? `\n<meta property="article:modified_time" content="${meta.article.modified}">` : ""}
<meta property="og:site_name" content="ALGAL">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${description}">
${missing ? "" : `<meta property="og:url" content="${canonical}">\n`}<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="${SOCIAL_IMAGE_WIDTH}">
<meta property="og:image:height" content="${SOCIAL_IMAGE_HEIGHT}">
<meta property="og:image:alt" content="${escapeHtml(image.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${imageUrl}">
<meta name="twitter:image:alt" content="${escapeHtml(image.alt)}">
<meta name="robots" content="${meta.noindex || missing ? "noindex, nofollow" : "index, follow"}">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"${ORIGIN}/#website","name":"ALGAL","url":"${ORIGIN}/","publisher":{"@id":"${PUBLISHER_ID}"}},{"@type":"SoftwareApplication","@id":"${ORIGIN}/#software","name":"ALGAL","url":"${ORIGIN}/","description":${JSON.stringify(SITE_DESCRIPTION)},"applicationCategory":"DeveloperApplication","operatingSystem":"macOS (Apple silicon), Linux x86_64","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"license":"https://opensource.org/license/mit","sameAs":["${REPO}"],"author":{"@id":"${PUBLISHER_ID}"},"publisher":{"@id":"${PUBLISHER_ID}"}},{"@type":"Organization","@id":"${PUBLISHER_ID}","name":"Hraness","url":"https://hraness.com/","sameAs":["https://github.com/hraness"]}]}
</script>${(meta.jsonLd ?? []).map(node => `\n<script type="application/ld+json">${serializeJsonLd(node)}</script>`).join("")}${meta.page === "blog" ? '\n<link rel="alternate" type="application/atom+xml" title="ALGAL blog" href="/blog/feed.xml">' : ""}
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#e1e2e7">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1b26">
<script src="/appearance.js"></script>
<link rel="stylesheet" href="/styles.css">
<script src="/client.js" defer></script>
<script src="/viewer.js" defer></script>
${meta.page === "living" ? '<link rel="stylesheet" href="/living.css">\n<script src="/living.js" type="module"></script>' : ""}
${meta.page === "grow" ? '<link rel="stylesheet" href="/living.css">\n<link rel="stylesheet" href="/grow.css">\n<script src="/grow.js" type="module"></script>' : ""}
${meta.page === "tasks" ? '<link rel="stylesheet" href="/living.css">\n<link rel="stylesheet" href="/tasks.css">\n<script src="/tasks.js" type="module"></script>' : ""}
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
      <a class="hraness-marketing-action" data-emphasis="primary" href="/#install">Install</a>
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

<footer class="site-footer"><a class="wordmark" href="/" aria-label="ALGAL home"><img src="/favicon.svg" width="24" height="24" alt="">algal</a><p>${SITE_TAGLINE}</p><div><a href="${REPO}">Source</a><a href="/docs/">Documentation</a><a href="/living/">Living software</a><a href="/blog/">Blog</a><a href="/compare/">Compare</a><a href="/docs/spec/organism/">Spec</a><a href="/llms.txt">llms.txt</a><a href="https://hraness.com">Made by Hraness</a><span>MIT · Preview · {{BUILD_STATS}}</span></div></footer>

</body>
</html>
`;
}
