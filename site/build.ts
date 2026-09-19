// Static site build. Program source, limits, and diagrams come from executable
// examples so the public demonstration cannot drift into illustrative syntax.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../src/contract";
import { createProgramDiagram, renderSvg } from "../src/diagram";
import { compileSource } from "../src/source";

const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(SITE);
const DIST = join(SITE, "dist");

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function highlightSource(source: string): string {
  // Highlight only lexical tokens and escape all source text before injection.
  const tokens = /"(?:\\.|[^"\\])*"|\/\/[^\n]*|\b(?:program|budget|let|decide|using|as|choice|match|return|generate|if|else|true|false|text|number|boolean|json)\b|\b\d+(?:\.\d+)?\b/g;
  let result = "";
  let cursor = 0;
  for (const match of source.matchAll(tokens)) {
    const token = match[0];
    const index = match.index;
    result += escapeHtml(source.slice(cursor, index));
    const kind = token.startsWith('"') ? "string" : token.startsWith("//") ? "comment" : /^\d/.test(token) ? "number" : "keyword";
    result += `<span class="code-${kind}">${escapeHtml(token)}</span>`;
    cursor = index + token.length;
  }
  return result + escapeHtml(source.slice(cursor));
}

const replySource = await readFile(join(ROOT, "examples/source/reply.algal"), "utf8");
const reply = compileSource(replySource);
const manifests = new Map<string, OrganismManifest>([["reply", reply.manifest]]);
for (const [name, path] of [
  ["refine", "examples/refine.algal.json"],
  ["refine-inner", "examples/refine-inner.algal.json"],
  ["release-review", "examples/vm/release-review.algal.json"],
  ["approval-wait", "examples/vm/approval-wait.algal.json"],
  ["swarm", "examples/swarm.algal.json"],
  ["habitat", "examples/habitat.algal.json"],
] as const) {
  const value: unknown = JSON.parse(await readFile(join(ROOT, path), "utf8"));
  manifests.set(name, parseOrganismManifest(value));
}

const refine = manifests.get("refine")?.cells.find(cell => cell.kind === "repeat");
const swarm = manifests.get("swarm")?.cells.find(cell => cell.kind === "each");
if (refine?.kind !== "repeat" || swarm?.kind !== "each") {
  throw new Error("Site examples no longer contain their documented composition cells");
}
const replacements: Record<string, string> = {
  REPLY_SOURCE: highlightSource(replySource.trimEnd()),
  REPLY_MAX_AGENT_CALLS: String(reply.manifest.budgets.maxAgentCalls),
  REFINE_ROUNDS: String(refine.maxRounds),
  SWARM_ITEMS: String(swarm.maxItems),
};
let html = await readFile(join(SITE, "index.html"), "utf8");
for (const [key, value] of Object.entries(replacements)) {
  const placeholder = `{{${key}}}`;
  if (!html.includes(placeholder)) throw new Error(`Missing site placeholder: ${key}`);
  html = html.replaceAll(placeholder, value);
}
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("Unresolved site build placeholder");

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, "diagrams"), { recursive: true });
await mkdir(join(DIST, "examples"), { recursive: true });
for (const f of ["styles.css", "robots.txt", "sitemap.xml", "llms.txt", "og.png"]) {
  await cp(join(SITE, f), join(DIST, f));
}
await cp(join(SITE, "icons"), join(DIST, "icons"), { recursive: true });
await writeFile(join(DIST, "index.html"), html);
await writeFile(join(DIST, "examples/reply.algal"), replySource);
await writeFile(join(DIST, "examples/reply.source-map.json"), `${JSON.stringify(reply.sourceMap, null, 2)}\n`);

for (const [name, manifest] of manifests) {
  const diagram = createProgramDiagram(manifest);
  await writeFile(join(DIST, "diagrams", `${name}.svg`), renderSvg(diagram, { compact: true, header: false }));
  await writeFile(join(DIST, "diagrams", `${name}.json`), `${JSON.stringify(diagram, null, 2)}\n`);
  await writeFile(join(DIST, "examples", `${name}.algal.json`), `${JSON.stringify(manifestToJson(manifest), null, 2)}\n`);
}

console.log(`site built → ${DIST} (${manifests.size} manifest-derived diagrams)`);
