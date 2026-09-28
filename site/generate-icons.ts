// Renders the SVG favicon into the PNG sizes that browsers, link unfurlers,
// and iOS home screens request. Run `bun run generate:icons` after editing
// site/favicon.svg and commit the PNGs beside it.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const siteDirectory = dirname(fileURLToPath(import.meta.url));
const svg = await readFile(join(siteDirectory, "favicon.svg"), "utf8");

for (const [file, size] of [["favicon-48.png", 48], ["apple-touch-icon.png", 180]] as const) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  await writeFile(join(siteDirectory, file), png);
}
