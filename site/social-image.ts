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

import { SITE_TAGLINE, SITE_NAME, productMessaging } from "./copy";

/** The header's foil mark (chrome.ts paints /algal-mark.svg in foil beside the name). */
const BRAND_MARK = readFileSync(new URL("./algal-mark.svg", import.meta.url), "utf8");

export const SOCIAL_SITE = defineSocialImageSite({
  name: SITE_NAME,
  domain: "algal.computer",
  description: SITE_TAGLINE,
  // The card matches the sticky header: the Tokyo Night palette chrome.ts selects
  // (data-palette="tokyo-night"), the foil mark, and the name as the nav shows it.
  palette: "tokyo-night",
  brandMark: BRAND_MARK,
  brand: SITE_NAME,
});

export interface SocialImageRef {
  /** Root-relative path of the 1200 × 630 PNG in site/dist. */
  path: `/${string}`;
  alt: string;
}

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

/** The home card matches the hero: the category eyebrow and the hero H1, from
 * the same messaging record home.html renders ({{SITE_CATEGORY}}, {{SITE_HERO_HEADING}}). */
export const HOME_SOCIAL_PAGE: SocialImagePage = {
  layout: "product",
  eyebrow: productMessaging.category,
  headline: productMessaging.hero.heading,
  // No tagline line: it would repeat the site description (description-repeats-tagline).
  description: "",
};

/** The site card that every page without its own copy shares. */
export const SITE_SOCIAL_IMAGE: SocialImageRef = { path: "/og.png", alt: `${SITE_NAME}: ${productMessaging.hero.heading}` };

export interface SocialImagePost {
  slug: string;
  title: string;
  dek: string;
  eyebrow?: string;
  /** The post's route, which names the card's section when it has no eyebrow. */
  path?: `/${string}`;
  /** Shorter card copy for a title or dek that does not fit the card as written. */
  cardTitle?: string;
  cardDescription?: string;
}

export function postSocialPage(post: SocialImagePost): SocialImagePage {
  return {
    eyebrow: post.eyebrow ?? "Blog",
    headline: post.cardTitle ?? post.title,
    description: post.cardDescription ?? post.dek,
    ...(post.path === undefined ? {} : { path: post.path }),
  };
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
