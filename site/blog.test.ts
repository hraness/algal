import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { articleProvenanceFromAdmission, articleProvenanceSentence, assertArticleAdmissions } from "@hraness/design-kit";
import { ALGAL_USES_POSTS, BLOG_ADMISSIONS, BLOG_AUTHOR, PENDING_CROSS_HOST_LINKS } from "./blog-posts";
import { algalUsesEntries, blogAtomFeed, blogLlmsList, blogSitemapEntries, loadBlogPosts, renderBlogIndex, renderPostArticle, unlinkPending } from "./blog";

const BLOG = join(import.meta.dir, "blog");
const posts = await loadBlogPosts(BLOG);

test("every blog post has a valid review record", () => {
  expect(() => assertArticleAdmissions(BLOG_ADMISSIONS)).not.toThrow();
  const files = readdirSync(BLOG).filter(file => file.endsWith(".md")).map(file => `/blog/${file.replace(/\.md$/, "")}/`).sort();
  expect(BLOG_ADMISSIONS.map(record => record.href).sort()).toEqual(files);
});

test("lifecycles match the reviewed set", () => {
  const lifecycle = Object.fromEntries(BLOG_ADMISSIONS.map(record => [record.href, record.lifecycle]));
  expect(lifecycle).toEqual({
    "/blog/typescript-rust-parity/": "indexable",
    "/blog/built-on-algal/": "quarantined",
    "/blog/software-that-accumulates-competence/": "quarantined",
    "/blog/self-evolving-software-selection-boundary/": "quarantined",
    "/blog/receipts-fossil-record/": "quarantined",
    "/blog/programs-that-wait/": "quarantined",
  });
});

test("AI review is recorded as AI and never as human review", () => {
  for (const record of BLOG_ADMISSIONS) {
    expect(record.humanReview).toBeNull();
    if (record.review) expect(record.review.reviewerType).toBe("ai");
  }
});

test("every post shows the Hraness byline and the provenance note from its record", () => {
  expect(BLOG_AUTHOR.name).toBe("Hraness");
  for (const post of posts.filter(post => post.emit)) {
    const html = renderPostArticle(post);
    expect(html).toContain(">Hraness</a>");
    const sentence = articleProvenanceSentence(articleProvenanceFromAdmission(post.admission));
    expect(html).toContain(sentence.replaceAll("'", "&#x27;"));
  }
  const parity = posts.find(post => post.slug === "typescript-rust-parity")!;
  expect(renderPostArticle(parity)).toContain("Drafted with AI from the source code and reviewed by Claude Opus 5.5 (claude-opus-5-5) editorial review.");
});

test("only indexable posts reach the index, feed, sitemap, and llms.txt", () => {
  const indexable = posts.filter(post => post.indexable).map(post => post.path);
  expect(indexable).toEqual(["/blog/typescript-rust-parity/"]);
  const index = renderBlogIndex(posts);
  const feed = blogAtomFeed(posts);
  const llms = blogLlmsList(posts);
  const sitemap = blogSitemapEntries(posts);
  expect(sitemap).toEqual([
    { path: "/blog/", lastModified: "2026-09-24" },
    { path: "/blog/typescript-rust-parity/", lastModified: "2026-09-24" },
  ]);
  for (const post of posts) {
    const listed = post.indexable;
    expect(index.includes(`href="${post.path}"`)).toBe(listed);
    expect(feed.includes(`https://algal.computer${post.path}<`)).toBe(listed);
    expect(llms.includes(`https://algal.computer${post.path})`)).toBe(listed);
  }
});

test("the hub stays unpublished until a registered relation has a live post", () => {
  const hub = posts.find(post => post.slug === "built-on-algal")!;
  const entries = algalUsesEntries();
  expect(hub.emit).toBe(entries.length > 0);
  for (const entry of entries) expect(Object.values(ALGAL_USES_POSTS).some(post => post.live && post.url === entry.url)).toBe(true);
});

test("links to cross-host posts that are not live render as text", () => {
  for (const url of PENDING_CROSS_HOST_LINKS) {
    expect(unlinkPending(`see [A post](${url}).`)).toBe("see A post.");
    for (const post of posts) expect(post.bodyHtml).not.toContain(`href="${url}"`);
  }
  expect(unlinkPending("[Temporal](https://temporal.io/)")).toBe("[Temporal](https://temporal.io/)");
});

test("internal blog links point at posts that exist", () => {
  const paths = new Set(posts.map(post => post.path));
  for (const post of posts) {
    for (const match of post.bodyHtml.matchAll(/href="(\/blog\/[^"#]*)"/g)) expect(paths.has(match[1] as `/blog/${string}/`)).toBe(true);
  }
});

test("blog posts use no em dashes", () => {
  for (const file of readdirSync(BLOG)) expect(readFileSync(join(BLOG, file), "utf8")).not.toContain("—");
});
