// The ALGAL blog: reads site/blog/*.md, joins each post to its review record,
// and renders post pages, the index, the Atom feed, sitemap entries, and the
// llms.txt list with the shared Design Kit article renderer and Web Discovery
// helpers. Only indexable posts reach the index, sitemap, feed, and llms.txt.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  articleProvenanceFromAdmission,
  assertArticleAdmissions,
  isArticleIndexable,
  isArticleIsoDate,
  renderArticleHtml,
  renderArticleIndexHtml,
  renderArticleRelatedHtml,
  renderArticleSourcesHtml,
  type ArticleAdmission,
  type ArticleIsoDate,
} from "@hraness/design-kit";
import { relatedFor, usesPairs } from "@hraness/design-kit/portfolio";
import {
  articleJsonLd,
  blogJsonLd,
  createAtomFeed,
  createBlogSitemapPaths,
  createFeedEntry,
  type ArticleDiscovery,
  type SearchSite,
} from "@hraness/web-discovery";
import { SITE_DESCRIPTION } from "./copy";
import { postSocialImage, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./social-image";
import { escapeHtml, renderMarkdown } from "./markdown";
import { ALGAL_USES_POSTS, BLOG_ADMISSIONS, BLOG_AUTHOR, BLOG_SOURCES, PENDING_CROSS_HOST_LINKS } from "./blog-posts";

export const BLOG_PATH = "/blog/";
export const BLOG_FEED_PATH = "/blog/feed.xml";
export const BLOG_TITLE = "Notes on living programs";
export const BLOG_DESCRIPTION = "Posts on how the ALGAL language and VM work, how it is tested, and the design choices behind it.";

export const SEARCH_SITE: SearchSite = {
  name: "ALGAL",
  title: "ALGAL",
  description: SITE_DESCRIPTION,
  origin: "https://algal.computer",
  language: "en-US",
};

const USES_MARKER = "{{ALGALUSES}}";

/** The Hraness org as a schema/feed party: a real entity with a canonical URL and profiles. */
const BLOG_PARTY = {
  kind: "Organization",
  name: BLOG_AUTHOR.name,
  url: "https://hraness.com",
  sameAs: ["https://github.com/hraness"],
} as const;

export interface BlogPost {
  slug: string;
  path: `/blog/${string}/`;
  title: string;
  dek: string;
  eyebrow?: string;
  /** Share-card headline and description, from the optional `cardTitle` and
   * `cardDescription` frontmatter, when the title or dek does not fit the card. */
  cardTitle?: string;
  cardDescription?: string;
  published: ArticleIsoDate;
  /** Last material revision, from the optional `updated` frontmatter date. */
  updated?: ArticleIsoDate;
  order: string;
  admission: ArticleAdmission;
  /** Rendered body, without the Markdown title heading. */
  bodyHtml: string;
  indexable: boolean;
  /** False when the page has nothing to show yet and the build skips it. */
  emit: boolean;
}

interface Frontmatter { title?: string; date?: string; updated?: string; description?: string; order?: string; eyebrow?: string; cardTitle?: string; cardDescription?: string }

export function parseFrontmatter(source: string): { meta: Frontmatter; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta: meta as Frontmatter, body: source.slice(match[0].length) };
}

/** Render links to cross-host posts that are not live yet as their label. */
export function unlinkPending(markdown: string, pending: ReadonlySet<string> = PENDING_CROSS_HOST_LINKS): string {
  return markdown.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (whole, label: string, href: string) => pending.has(href) ? label : whole);
}

/** Hub entries: registered ALGAL relations whose "How X uses ALGAL" post is live. */
export function algalUsesEntries(): { name: string; detail: string; url: string }[] {
  return usesPairs().flatMap(pair => {
    const consumer = pair.source.id === "algal" ? pair.target : pair.target.id === "algal" ? pair.source : null;
    const post = consumer ? ALGAL_USES_POSTS[consumer.id] : undefined;
    return consumer && post?.live ? [{ name: consumer.name, detail: pair.relation.detail, url: post.url }] : [];
  });
}

function usesListHtml(entries: ReturnType<typeof algalUsesEntries>): string {
  return `<ul>${entries.map(entry => `<li><strong>${escapeHtml(entry.name)}.</strong> ${escapeHtml(entry.detail)} <a href="${escapeHtml(entry.url)}">How ${escapeHtml(entry.name)} uses ALGAL</a></li>`).join("")}</ul>`;
}

export async function loadBlogPosts(dir: string): Promise<BlogPost[]> {
  assertArticleAdmissions(BLOG_ADMISSIONS);
  const records = new Map(BLOG_ADMISSIONS.map(record => [record.href, record]));
  const files = (await readdir(dir)).filter(file => file.endsWith(".md")).sort();
  const posts: BlogPost[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const path = `/blog/${slug}/` as const;
    const admission = records.get(path);
    if (!admission) throw new Error(`site/blog/${file} has no review record in site/blog-posts.ts`);
    records.delete(path);
    const { meta, body } = parseFrontmatter(await readFile(join(dir, file), "utf8"));
    if (!meta.title || !meta.description || !isArticleIsoDate(meta.date)) throw new Error(`site/blog/${file} needs title, description, and a YYYY-MM-DD date`);
    if (meta.updated !== undefined && (!isArticleIsoDate(meta.updated) || meta.updated < meta.date)) throw new Error(`site/blog/${file} has an updated date that is not a YYYY-MM-DD date on or after its date`);
    // The article header shows the title, so drop a leading Markdown H1.
    const markdown = unlinkPending(body.replace(/^\s*# [^\n]*\n/, ""));
    let bodyHtml = renderMarkdown(markdown).html;
    let emit = true;
    if (bodyHtml.includes(USES_MARKER)) {
      const entries = algalUsesEntries();
      emit = entries.length > 0;
      bodyHtml = bodyHtml.replace(`<p>${USES_MARKER}</p>`, usesListHtml(entries));
    }
    const indexable = isArticleIndexable(admission) && emit;
    posts.push({
      slug, path, title: meta.title, dek: meta.description, published: meta.date, order: meta.order ?? "9",
      ...(meta.updated ? { updated: meta.updated } : {}),
      admission, bodyHtml, indexable, emit,
      ...(meta.eyebrow ? { eyebrow: meta.eyebrow } : {}),
      ...(meta.cardTitle ? { cardTitle: meta.cardTitle } : {}),
      ...(meta.cardDescription ? { cardDescription: meta.cardDescription } : {}),
    });
  }
  if (records.size > 0) throw new Error(`Review records without a post: ${[...records.keys()].join(", ")}`);
  return posts.sort((a, b) => b.published.localeCompare(a.published) || a.order.localeCompare(b.order));
}

const timestamp = (date: ArticleIsoDate) => `${date}T00:00:00.000Z`;

export function articleDiscovery(post: BlogPost): ArticleDiscovery {
  return {
    type: "BlogPosting",
    canonicalPath: post.path,
    title: post.title,
    description: post.dek,
    image: { ...postSocialImage(post), width: SOCIAL_IMAGE_WIDTH, height: SOCIAL_IMAGE_HEIGHT, contentType: "image/png" },
    publishedTime: timestamp(post.published),
    ...(post.updated ? { modifiedTime: timestamp(post.updated) } : {}),
    authors: [BLOG_PARTY],
    publisher: BLOG_PARTY,
    blogPath: BLOG_PATH,
    ...(post.eyebrow ? { section: post.eyebrow } : {}),
  };
}

/** The article element for one post page. */
export function renderPostArticle(post: BlogPost): string {
  const sources = BLOG_SOURCES[post.slug] ?? [];
  const related = relatedFor("algal").slice(0, 3).map(item => ({ href: item.href, name: item.name, relationship: item.relationship }));
  const after = renderArticleSourcesHtml({ sources }) + renderArticleRelatedHtml({ items: related });
  return renderArticleHtml({
    heading: post.title,
    dek: post.dek,
    ...(post.eyebrow ? { eyebrow: post.eyebrow } : {}),
    author: BLOG_AUTHOR,
    published: post.published,
    ...(post.updated ? { updated: post.updated } : {}),
    provenance: articleProvenanceFromAdmission(post.admission),
    bodyHtml: `<div class="prose">${post.bodyHtml}</div>`,
    ...(after ? { afterHtml: after } : {}),
  });
}

export function renderBlogIndex(posts: readonly BlogPost[]): string {
  return renderArticleIndexHtml({
    heading: "Posts",
    headingId: "blog-posts",
    items: posts.filter(post => post.indexable).map(post => ({
      href: post.path, title: post.title, dek: post.dek, published: post.published,
      ...(post.updated ? { updated: post.updated } : {}),
      ...(post.eyebrow ? { eyebrow: post.eyebrow } : {}),
    })),
  });
}

export function blogIndexJsonLd(posts: readonly BlogPost[]) {
  return blogJsonLd(SEARCH_SITE, { name: BLOG_TITLE, description: BLOG_DESCRIPTION, path: BLOG_PATH, publisher: BLOG_PARTY },
    posts.filter(post => post.indexable).map(articleDiscovery));
}

export function postJsonLd(post: BlogPost) {
  return articleJsonLd(SEARCH_SITE, articleDiscovery(post));
}

export function blogAtomFeed(posts: readonly BlogPost[]): string {
  const indexable = posts.filter(post => post.indexable);
  return createAtomFeed(SEARCH_SITE, {
    title: "ALGAL blog", description: BLOG_DESCRIPTION, homePath: BLOG_PATH, path: BLOG_FEED_PATH,
    authors: [BLOG_PARTY],
  }, indexable.map(post => createFeedEntry(articleDiscovery(post), { contentHtml: post.bodyHtml })));
}

/** Sitemap entries with lastmod for the blog index and indexable posts. */
export function blogSitemapEntries(posts: readonly BlogPost[]): { path: string; lastModified?: string }[] {
  return createBlogSitemapPaths({ path: BLOG_PATH }, posts.filter(post => post.indexable).map(articleDiscovery))
    .map(entry => ({ path: entry.path, ...(typeof entry.lastModified === "string" ? { lastModified: entry.lastModified.slice(0, 10) } : {}) }));
}

/** The llms.txt blog list. */
export function blogLlmsList(posts: readonly BlogPost[]): string {
  return posts.filter(post => post.indexable).map(post => `- [${post.title}](${SEARCH_SITE.origin}${post.path}): ${post.dek}`).join("\n");
}
