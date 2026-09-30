// Browser icons follow the current transparent header mark. Run
// `bun run generate:icons` and commit the SVG and PNG derivatives together.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const siteDirectory = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(siteDirectory, "algal-mark.svg"), "utf8");
const white = source.replace(/stroke="[^"]*"/gu, 'stroke="#ffffff"');
const sample = new Resvg(white, { fitTo: { mode: "width", value: 2048 } }).render();
const pixels = sample.pixels;
let left = sample.width, top = sample.height, right = -1, bottom = -1;
for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
  if (pixels[(y * sample.width + x) * 4 + 3]! > 0) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error("The header mark is empty");
const scale = sample.width / 32;
const side = Math.max(right - left + 1, bottom - top + 1) / scale;
const cx = (left + right + 1) / 2 / scale, cy = (top + bottom + 1) / 2 / scale;
const box = [cx - side / 2, cy - side / 2, side, side].join(" ");
const svg = white.replace('viewBox="0 0 32 32"', `viewBox="${box}"`);
await writeFile(join(siteDirectory, "favicon.svg"), svg);
for (const [file, size] of [["favicon-48.png", 48], ["apple-touch-icon.png", 180]] as const) {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    ...(file === "apple-touch-icon.png" ? { background: "#000000" } : {}),
  }).render().asPng();
  await writeFile(join(siteDirectory, file), png);
}
