import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { articleDiscovery, loadBlogPosts } from "./blog";
import { pageDocument } from "./chrome";
import { SITE_TAGLINE } from "./copy";
import {
  createSocialImageCard,
  defineSocialImageSite,
  SOCIAL_IMAGE_MIN_PALETTE_DISTANCE,
  socialImageFit,
  socialImageLookAlikes,
  socialImagePalette,
  socialImagePaletteDistance,
  socialImageSiteDetails,
  socialImageSitePalette,
} from "@hraness/web-discovery/social-image/card";
import { postSocialImage, postSocialPage, renderSocialImage, SITE_SOCIAL_IMAGE, SOCIAL_SITE } from "./social-image";

const posts = await loadBlogPosts(join(import.meta.dir, "blog"));

test("the site declares its card once with the real app icon, Tokyo Night light theme, and olive wash", () => {
  expect(SOCIAL_SITE.name).toBe("ALGAL");
  expect(SOCIAL_SITE.domain).toBe("algal.computer");
  expect(SOCIAL_SITE.description).toBe(SITE_TAGLINE);
  const favicon = readFileSync(join(import.meta.dir, "favicon.svg")).toString("base64");
  expect(SOCIAL_SITE.icon).toEqual({ kind: "app", src: `data:image/svg+xml;base64,${favicon}` });
  expect(SOCIAL_SITE.theme).toEqual({ accent: "#1d4e90", background: "#e1e2e7", foreground: "#1c3161", muted: "#414c76", wash: "#6b8e23" });
});

test("the olive wash keeps ALGAL's cards apart from Sys1, which shares the Tokyo Night light base", () => {
  // Sys1's card declaration (hraness/sysone scripts/social-cards.ts) uses the same theme with no wash.
  const { wash: _wash, ...tokyoNight } = SOCIAL_SITE.theme!;
  const sys1 = defineSocialImageSite({ name: "Sys1", domain: "sys1.io", description: "Stop spending big-model tokens on small decisions.", theme: tokyoNight });
  expect(socialImageLookAlikes([SOCIAL_SITE, sys1])).toEqual([]);
  expect(socialImagePaletteDistance(socialImageSitePalette(SOCIAL_SITE), socialImagePalette(tokyoNight))).toBeGreaterThan(2 * SOCIAL_IMAGE_MIN_PALETTE_DISTANCE);
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
  expect(postSocialPage(post)).toEqual({ eyebrow: "Technique", headline: post.cardTitle!, description: post.cardDescription!, path: post.path });
  const image = postSocialImage(post);
  expect(image).toEqual({ path: "/og/blog/typescript-rust-parity.png", alt: `${post.cardTitle}, from ALGAL` });
  const page = pageDocument({ ...meta, page: "blog", path: post.path, socialImage: image }, "<main id=\"main\"></main>");
  expect(page).toContain(`<meta property="og:image" content="https://algal.computer${image.path}">`);
  expect(page).toContain(`<meta name="twitter:image" content="https://algal.computer${image.path}">`);
  expect(articleDiscovery(post).image).toMatchObject({ path: image.path, width: 1200, height: 630, contentType: "image/png" });
  const plain = { slug: "plain", title: "A title", dek: "A dek." };
  expect(postSocialPage(plain)).toEqual({ eyebrow: "Blog", headline: "A title", description: "A dek." });
});

test("every post names its category in the card eyebrow", () => {
  for (const post of posts) expect([post.slug, postSocialPage(post).eyebrow]).toEqual([post.slug, expect.stringMatching(/^(Essay|Integration|Technique)$/)]);
});

test("the home card and every post card fit as written, with no template finding", () => {
  const cards = [{ slug: "home", details: socialImageSiteDetails(SOCIAL_SITE) },
    ...posts.filter(post => post.emit).map(post => ({ slug: post.slug, details: socialImageSiteDetails(SOCIAL_SITE, postSocialPage(post)) }))];
  for (const { slug, details } of cards) {
    const fit = socialImageFit(details);
    // findings covers the v0.12 review codes too (reduced description, missing eyebrow, repeated tagline).
    expect({ slug, findings: fit.findings }).toEqual({ slug, findings: [] });
    expect(fit.eyebrow).toBe(slug === "home" ? undefined : postSocialPage(posts.find(post => post.slug === slug)!).eyebrow || undefined);
    expect(() => createSocialImageCard({ ...details, strict: true })).not.toThrow();
  }
});

test("the build refuses a post card that would be cut", async () => {
  const long = { eyebrow: "Essay", headline: "A headline", description: "A description that runs on well past two lines of the card, so the shared template would have to cut it at a clause, and the build should stop instead of publishing a shortened card." };
  await expect(renderSocialImage(long)).rejects.toThrow(/does not fit as written/);
});
