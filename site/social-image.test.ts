import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { articleDiscovery, loadBlogPosts } from "./blog";
import { pageDocument } from "./chrome";
import { SITE_TAGLINE } from "./copy";
import { postSocialImage, postSocialPage, renderSocialImage, SITE_SOCIAL_IMAGE, SOCIAL_SITE } from "./social-image";

const posts = await loadBlogPosts(join(import.meta.dir, "blog"));

test("the site declares its card once with the real app icon and Tokyo Night light theme", () => {
  expect(SOCIAL_SITE.name).toBe("ALGAL");
  expect(SOCIAL_SITE.domain).toBe("algal.computer");
  expect(SOCIAL_SITE.description).toBe(SITE_TAGLINE);
  const favicon = readFileSync(join(import.meta.dir, "favicon.svg")).toString("base64");
  expect(SOCIAL_SITE.icon).toEqual({ kind: "app", src: `data:image/svg+xml;base64,${favicon}` });
  expect(SOCIAL_SITE.theme).toEqual({ accent: "#1d4e90", background: "#e1e2e7", foreground: "#1c3161", muted: "#414c76" });
});

test("the rendered card is a 1200 × 630 PNG", async () => {
  const png = await renderSocialImage();
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
  expect([header.readUInt32BE(16), header.readUInt32BE(20)]).toEqual([1200, 630]);
});

test("pages share the site card and posts get their own card from page copy only", () => {
  const meta = { page: "home", path: "/", title: "ALGAL", description: "d", ogTitle: "ALGAL" } as const;
  const home = pageDocument(meta, "<main id=\"main\"></main>");
  expect(SITE_SOCIAL_IMAGE).toEqual({ path: "/og.png", alt: `ALGAL: ${SITE_TAGLINE}` });
  expect(home).toContain('<meta property="og:image" content="https://algal.computer/og.png">');
  expect(home).toContain('<meta name="twitter:image" content="https://algal.computer/og.png">');

  const post = posts.find(entry => entry.slug === "typescript-rust-parity")!;
  expect(postSocialPage(post)).toEqual({ eyebrow: "Technique", headline: post.title, description: post.dek });
  const image = postSocialImage(post);
  expect(image).toEqual({ path: "/og/blog/typescript-rust-parity.png", alt: `${post.title}, from ALGAL` });
  const page = pageDocument({ ...meta, page: "blog", path: post.path, socialImage: image }, "<main id=\"main\"></main>");
  expect(page).toContain(`<meta property="og:image" content="https://algal.computer${image.path}">`);
  expect(page).toContain(`<meta name="twitter:image" content="https://algal.computer${image.path}">`);
  expect(articleDiscovery(post).image).toMatchObject({ path: image.path, width: 1200, height: 630, contentType: "image/png" });
  expect(postSocialPage(posts.find(entry => entry.eyebrow === undefined)!).eyebrow).toBe("Blog");
});
