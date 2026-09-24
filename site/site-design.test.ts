import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pageDocument } from "./chrome";
import { ADOPTION_BOUNDARY, SITE_DESCRIPTION } from "./copy";
import { renderIconSprite, siteIcon, type SiteIconName } from "./icons";

const SITE = new URL(".", import.meta.url).pathname;
const chrome = readFileSync(join(SITE, "chrome.ts"), "utf8");
const pageFiles = readdirSync(join(SITE, "pages")).filter(file => file.endsWith(".html"));
const pages = Object.fromEntries(pageFiles.map(file => [file, readFileSync(join(SITE, "pages", file), "utf8")]));
const allMarkup = `${chrome}\n${Object.values(pages).join("\n")}`;

test("the site ships home, tour, use-cases, living software, browser applications, and workbench pages", () => {
  expect(pageFiles.sort()).toEqual(["grow.html", "home.html", "living.html", "tasks.html", "tour.html", "use-cases.html", "workbench.html"]);
});

test("every standard icon referenced by static markup is present in the sprite", () => {
  const sprite = renderIconSprite();
  const references = [...allMarkup.matchAll(/href="\/icons\.svg#([a-z-]+)"/g)].map(match => match[1]!);
  expect(references.length).toBeGreaterThan(10);
  for (const name of references) {
    expect(sprite).toContain(`<symbol id="${name}"`);
    expect(siteIcon(name as SiteIconName)).toContain('aria-hidden="true"');
  }
  expect(() => siteIcon("unadmitted" as SiteIconName)).toThrow("Unknown site icon");
  expect(sprite).not.toContain("<script");
  expect(allMarkup).not.toMatch(/[↗↓◌]/u);
});

test("shared appearance and generated evidence remain progressively discoverable", () => {
  expect(chrome).toContain('data-hraness-theme="paper"');
  expect(chrome).toContain('data-palette="tokyo-night"');
  expect(chrome).not.toContain('data-theme="light"');
  expect(chrome).toContain('media="(prefers-color-scheme: light)" content="#e1e2e7"');
  expect(chrome).toContain('media="(prefers-color-scheme: dark)" content="#1a1b26"');
  expect(chrome).toContain('data-hraness-marketing-preset="editorial"');
  expect(chrome.match(/data-hraness-appearance-menu/g)?.length).toBe(1);
  expect(chrome.indexOf('src="/appearance.js"')).toBeLessThan(chrome.indexOf('href="/styles.css"'));
  for (const theme of ["light", "dark", "system"]) {
    expect(chrome).toContain(`data-theme-value="${theme}"`);
  }
  for (const placeholder of ["HERO_CHOOSER", "HERO_STAGE", "REPLY_SOURCE"]) {
    expect(pages["home.html"]).toContain(`{{${placeholder}}}`);
  }
  for (const placeholder of ["ROUTE_PANELS", "INBOX_CHILD_PANELS", "AUTHORING_ERROR", "SOURCE_DIAGNOSTIC"]) {
    expect(pages["tour.html"]).toContain(`{{${placeholder}}}`);
  }
  expect(chrome).toContain('src="/client.js" defer');
  expect(chrome).toContain('src="/viewer.js" defer');
  expect(allMarkup).not.toContain("document.querySelectorAll");
});

test("every interactive diagram frame keeps a static image fallback", () => {
  const frames = allMarkup.match(/<div class="diagram-frame[^"]*" data-diagram-view="\//g) ?? [];
  expect(frames.length).toBeGreaterThan(5);
  for (const page of Object.values(pages)) {
    const frameTags = page.match(/<div class="diagram-frame/g)?.length ?? 0;
    const imgTags = page.match(/<img/g)?.length ?? 0;
    expect(imgTags).toBeGreaterThanOrEqual(frameTags);
  }
});

test("docs links in marketing pages resolve to mirrored pages, not the repository", () => {
  // Only the unmirrored internal brief stays on GitHub; everything else links
  // to /docs/ so the site remains self-contained.
  for (const page of Object.values(pages)) {
    const blobLinks = page.match(/github\.com\/hraness\/algal\/blob\/main\/(docs|spec\/v1)\/([a-z0-9-]+)\.md/g) ?? [];
    for (const link of blobLinks) expect(link).toContain("apple-brief");
  }
  expect(allMarkup).toContain('href="/docs/"');
  expect(allMarkup).toContain('href="/docs/spec/organism/"');
});

test("page metadata is escaped, so a quote in a derived description cannot end the attribute", () => {
  const document = pageDocument({
    page: "docs", path: "/docs/example/",
    title: "A \"quoted\" title", description: "Systems such as \"one cheap call\" & <others>.", ogTitle: "Example",
  }, "<main></main>");
  expect(document).toContain('<meta name="description" content="Systems such as &quot;one cheap call&quot; &amp; &lt;others&gt;.">');
  expect(document).toContain("<title>A &quot;quoted&quot; title</title>");
  expect(document).toContain(JSON.stringify(SITE_DESCRIPTION));
});

test("the home and use-cases pages both state the prerelease limits from one constant", () => {
  for (const page of ["home.html", "use-cases.html"]) expect(pages[page]).toContain("{{ADOPTION_BOUNDARY}}");
  for (const limit of ["prerelease", "unsigned and not notarized", "tool permissions", "OS isolation", "Multi-tenant service use", "store-wide quotas are not built yet"]) {
    expect(ADOPTION_BOUNDARY).toContain(limit);
  }
  expect(pages["home.html"]).toContain("exactly once");
  expect(pages["use-cases.html"]).toContain("exactly once");
});

test("llms.txt takes its lead from the site description", () => {
  const llms = readFileSync(join(SITE, "llms.txt"), "utf8");
  expect(llms.split("\n\n")[1]).toBe("{{SITE_DESCRIPTION}}");
});

test("site copy uses no em dashes", () => {
  const copy = readFileSync(join(SITE, "copy.ts"), "utf8");
  const llms = readFileSync(join(SITE, "llms.txt"), "utf8");
  for (const text of [allMarkup, copy, llms]) expect(text).not.toContain("—");
});
