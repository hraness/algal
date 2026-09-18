import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createSocialImageCard } from "@hraness/web-discovery/social-image/card";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const siteDirectory = dirname(fileURLToPath(import.meta.url));

const mark = (
  <svg aria-label="ALGAL" height="42" role="img" viewBox="0 0 42 42" width="42">
    <circle cx="16" cy="23" r="11" fill="currentColor" />
    <circle cx="30" cy="17" r="7" fill="currentColor" />
  </svg>
);

const card = createSocialImageCard({
  description:
    "A language for growing agent programs. Typed workflows, bounded model calls, inspectable memory, and evidence-driven evolution.",
  domain: "algal.dev",
  eyebrow: "ALGAL",
  mark,
  theme: {
    accent: "#355e3b",
    background: "#f8f7f4",
    foreground: "#1c1a18",
    muted: "#6b675f",
  },
  title: "Programs that grow. More from every model.",
});

const svg = await satori(card.element, {
  fonts: card.fonts.map((font) => ({
    data: font.data,
    name: font.name,
    style: font.style,
    weight: font.weight,
  })),
  height: card.height,
  width: card.width,
});
const png = new Resvg(svg).render().asPng();
await writeFile(join(siteDirectory, "og.png"), png);
await writeFile(join(siteDirectory, "og.svg"), `${svg}\n`);
console.log(`Wrote ${png.byteLength} bytes to ${join(siteDirectory, "og.png")}`);
