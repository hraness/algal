// The site's one social-image declaration. Every og:image and twitter:image
// on algal.computer is rendered from it by the shared @hraness/web-discovery
// card; pages pass only their copy (headline, description, eyebrow).
import { readFileSync } from "node:fs";

import {
  createSocialImageCard,
  defineSocialImageSite,
  socialImageAlt,
  socialImageSiteDetails,
  type SocialImagePage,
} from "@hraness/web-discovery/social-image/card";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import { SITE_TAGLINE } from "./copy";

/** The favicon and apple-touch-icon source, embedded as a finished app icon. */
const APP_ICON = `data:image/svg+xml;base64,${readFileSync(new URL("./favicon.svg", import.meta.url)).toString("base64")}`;

export const SOCIAL_SITE = defineSocialImageSite({
  name: "ALGAL",
  domain: "algal.computer",
  description: SITE_TAGLINE,
  icon: { kind: "app", src: APP_ICON },
  // Tokyo Night light, the palette chrome.ts selects (Design Kit palette-system.css).
  theme: { accent: "#1d4e90", background: "#e1e2e7", foreground: "#1c3161", muted: "#414c76" },
});

export interface SocialImageRef {
  /** Root-relative path of the 1200 × 630 PNG in site/dist. */
  path: `/${string}`;
  alt: string;
}

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

/** The site card that every page without its own copy shares. */
export const SITE_SOCIAL_IMAGE: SocialImageRef = { path: "/og.png", alt: socialImageAlt(SOCIAL_SITE) };

export interface SocialImagePost {
  slug: string;
  title: string;
  dek: string;
  eyebrow?: string;
  /** Shorter card copy for a title or dek that does not fit the card as written. */
  cardTitle?: string;
  cardDescription?: string;
}

export function postSocialPage(post: SocialImagePost): SocialImagePage {
  return { eyebrow: post.eyebrow ?? "Blog", headline: post.cardTitle ?? post.title, description: post.cardDescription ?? post.dek };
}

export function postSocialImage(post: SocialImagePost): SocialImageRef {
  return { path: `/og/blog/${post.slug}.png`, alt: socialImageAlt(SOCIAL_SITE, postSocialPage(post)) };
}

/** Rasterize one card from the site declaration plus optional page copy. The
 * card is strict: copy the template would cut, shrink, or strip fails the
 * build, so give the post a shorter `cardTitle` or `cardDescription`. */
export async function renderSocialImage(page: SocialImagePage = {}): Promise<Uint8Array> {
  const card = createSocialImageCard({ ...socialImageSiteDetails(SOCIAL_SITE, page), strict: true });
  const svg = await satori(card.element, {
    fonts: card.fonts.map(font => ({ data: font.data, name: font.name, style: font.style, weight: font.weight })),
    height: card.height,
    width: card.width,
  });
  return new Resvg(svg).render().asPng();
}
