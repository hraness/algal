// Check in portable diagrams for GitHub and offline docs; generated artifacts
// must match their executable fixtures. No models, network, or live tools.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseOrganismManifest } from "../src/contract";
import { compileSource } from "../src/source";
import { createProgramDiagram, renderSvg } from "../src/diagram";

const root = resolve(import.meta.dir, "..");
const check = process.argv.includes("--check");
const source = await readFile(join(root, "examples/source/reply.algal"), "utf8");
const sources = new Map([["reply", source]]);
const routeSource = await readFile(join(root, "examples/source/route.algal"), "utf8");
sources.set("route", routeSource);
const manifests = new Map([...sources].map(([name, text]) => [name, compileSource(text).manifest]));
for (const [name, file] of [
  ["refine", "examples/refine.algal.json"],
  ["approval", "examples/vm/release-review.algal.json"],
  ["swarm", "examples/swarm.algal.json"],
  ["habitat", "examples/habitat.algal.json"],
] as const) manifests.set(name, parseOrganismManifest(JSON.parse(await readFile(join(root, file), "utf8"))));

let failures = 0;
async function artifact(path: string, expected: string) {
  if (check) {
    const actual = await readFile(path, "utf8").catch(() => "");
    if (actual !== expected) { console.error(`Stale generated documentation: ${path.slice(root.length + 1)}`); failures++; }
  } else await writeFile(path, expected);
}
if (!check) await mkdir(join(root, "docs/diagrams"), { recursive: true });
for (const [name, manifest] of manifests) {
  const source = sources.get(name);
  await artifact(join(root, "docs/diagrams", `${name}.svg`), renderSvg(createProgramDiagram(manifest, source === undefined ? {} : { source }), { compact: true }));
}
const readmePath = join(root, "README.md");
const readme = await readFile(readmePath, "utf8");
const marker = /<!-- source-example:start -->[\s\S]*?<!-- source-example:end -->/;
if (!marker.test(readme)) throw new Error("README is missing source example markers");
const routeMarker = /<!-- route-example:start -->[\s\S]*?<!-- route-example:end -->/;
if (!routeMarker.test(readme)) throw new Error("README is missing route example markers");
const resultSpan = compileSource(routeSource).sourceMap.cells.find(cell => cell.cellId === "result")?.span;
if (!resultSpan) throw new Error("Route example has no result source mapping");
const routeExcerpt = `return ${routeSource.slice(resultSpan.start.offset, resultSpan.end.offset).replace(/\n {2}/g, "\n")}`;
await artifact(readmePath, readme
  .replace(marker, `<!-- source-example:start -->\n\n\`\`\`algal\n${source.trimEnd()}\n\`\`\`\n\n<!-- source-example:end -->`)
  .replace(routeMarker, `<!-- route-example:start -->\n\n\`\`\`algal\n${routeExcerpt}\n\`\`\`\n\n<!-- route-example:end -->`));
if (failures) { console.error("Run bun run docs:diagrams to regenerate."); process.exitCode = 1; }
else console.log(`${check ? "Checked" : "Generated"} ${manifests.size} executable diagrams and README source examples.`);
