// Static site build. Program source, limits, and diagrams come from executable
// examples so the public demonstration cannot drift into illustrative syntax.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../src/contract";
import { createProgramDiagram, renderSvg } from "../src/diagram";
import { compileSource } from "../src/source";
import { loadSourceProject } from "../src/source-project";
import { packOrganism } from "../src/bundle";
import { compileOrganism } from "../src/graph";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { canonicalizeReceipt, runOrganism } from "../src/run";
import { MemoryStore } from "../src/store";
import { asJsonValue, asObject, canonicalize, type JsonObject } from "../src/values";
import { verifyReceipt } from "../src/verify";

const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(SITE);
const DIST = join(SITE, "dist");

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function highlightSource(source: string): string {
  // Highlight only lexical tokens and escape all source text before injection.
  const tokens = /"(?:\\.|[^"\\])*"|\/\/[^\n]*|\b(?:program|budget|let|decide|using|as|choice|match|return|generate|if|else|true|false|text|number|boolean|json|import|from|call|each|over|in|max_items)\b|\b\d+(?:\.\d+)?\b/g;
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
// These runs use repository-owned scripted responses exclusively. Retain the
// runtime's actual receipts and verify them before displaying their results.
const routeSource = await readFile(join(ROOT, "examples/source/route.algal"), "utf8");
const route = compileSource(routeSource);
const readFixture = async (file: string): Promise<JsonObject> => {
  const value: unknown = JSON.parse(await readFile(join(ROOT, "examples/source", file), "utf8"));
  return asObject(asJsonValue(value, file), file);
};
const rawArgs = await readFixture("route.args.json");
const routeArgs = Object.fromEntries(Object.entries(rawArgs).map(([cell, values]) => [cell, asObject(values, `route.args.${cell}`)]));
const routeGenerators = route.manifest.cells.filter(cell => cell.kind === "agent");
const routeDecisions = route.manifest.cells.filter(cell => cell.kind === "decide");
const routeResult = route.manifest.interface?.outputs.result;
if (routeGenerators.length !== 2 || routeDecisions.length !== 1 || !routeResult) {
  throw new Error("Routing demo must contain one decision, two draft branches, and a result interface");
}
const decisionId = routeDecisions[0]!.id;
const routeRuns = [];
for (const scenario of [
  { choice: "help", title: "Support", expectedCalls: 2 },
  { choice: "sales", title: "Sales", expectedCalls: 2 },
  { choice: "other", title: "Human review", expectedCalls: 1 },
] as const) {
  const responses = await readFixture(`route.responses.${scenario.choice}.json`);
  const store = new MemoryStore();
  const receipt = await runOrganism({
    manifest: route.manifest, args: routeArgs, store, fns: builtinRegistry(),
    executors: [scriptedExecutor(responses)],
  });
  if (receipt.outcome !== "complete" || receipt.work.agentCalls !== scenario.expectedCalls) {
    throw new Error(`Routing ${scenario.choice}: expected complete with ${scenario.expectedCalls} executor attempts; got ${receipt.outcome} with ${receipt.work.agentCalls}`);
  }
  const answer = asObject(asObject(asObject(receipt.cells[decisionId]?.outputs?.out, "route decision").answers, "route answers").answer, "route answer");
  if (answer.choice !== scenario.choice) throw new Error(`Routing fixture chose the wrong decision for ${scenario.choice}`);
  const result = receipt.cells[routeResult.cell]?.outputs?.[routeResult.port];
  if (typeof result !== "string" || !result.length) throw new Error(`Routing ${scenario.choice}: missing text output`);
  const committed = routeGenerators.filter(cell => receipt.cells[cell.id]?.status === "committed");
  const skipped = routeGenerators.filter(cell => receipt.cells[cell.id]?.status === "skipped");
  if (committed.length !== scenario.expectedCalls - 1 || skipped.length !== routeGenerators.length - committed.length) {
    throw new Error(`Routing ${scenario.choice}: inactive generation branches were not skipped`);
  }
  if (scenario.choice === "other" ? result !== "Needs a human review." : result !== receipt.cells[committed[0]!.id]?.outputs?.out) {
    throw new Error(`Routing ${scenario.choice}: selected branch did not provide the result`);
  }
  const verification = await verifyReceipt(asJsonValue(receipt, "route receipt"), manifestToJson(route.manifest), store, builtinRegistry());
  if (!verification.ok) throw new Error(`Routing ${scenario.choice}: receipt failed replay verification`);
  const diagram = createProgramDiagram(route.manifest, { source: routeSource, receipt });
  routeRuns.push({ ...scenario, result, receipt, diagram, skipped: skipped.length, responses });
}
const routePanels = routeRuns.map(run => `
      <article class="route-panel" id="route-${run.choice}" aria-labelledby="route-${run.choice}-title">
        <div class="route-result">
          <div><span class="eyebrow">Recorded choice · ${run.choice}</span><h3 id="route-${run.choice}-title">${run.title}</h3></div>
          <div class="route-output"><span class="eyebrow">Actual returned value</span><p class="recorded-output">${escapeHtml(run.result)}</p></div>
          <dl class="route-work"><dt>Executor attempts</dt><dd>${run.receipt.work.agentCalls}<span>of ${route.manifest.budgets.maxAgentCalls} allowed</span></dd><dt>Inactive draft branches skipped</dt><dd class="route-skipped-count">${run.skipped}</dd></dl>
        </div>
        <figure class="route-figure">
          <figcaption><span class="run-state">Committed</span><span class="run-state skipped">Skipped</span><a href="diagrams/route-${run.choice}.svg" target="_blank" rel="noopener">Expand all cells ↗</a></figcaption>
          <div class="route-diagram-scroll" tabindex="0" role="region" aria-label="${run.title} execution graph, scroll horizontally on small screens"><img src="diagrams/route-${run.choice}.svg" alt="Source-derived routing graph for the recorded ${run.choice} decision. ${run.receipt.work.agentCalls} executor attempts completed; ${run.skipped} inactive draft ${run.skipped === 1 ? "branch was" : "branches were"} skipped. All exact cells remain visible." width="1200" height="1050" loading="lazy"></div>
        </figure>
        <div class="route-receipt"><span>Receipt ${escapeHtml(run.receipt.digest)}</span><a href="receipts/route-${run.choice}.receipt.json" download>Download receipt ↓</a><a href="examples/route.responses.${run.choice}.json" download>Scripted answers ↓</a></div>
      </article>`).join("\n");

// Load the two-file example as a real local source project, retaining its
// digest-addressed children before graph admission, execution, and packing.
const inbox = await loadSourceProject(join(ROOT, "examples/source/projects/inbox/inbox.algal"));
const inboxEach = inbox.manifest.cells.find(cell => cell.kind === "each");
const inboxCall = inbox.manifest.cells.find(cell => cell.kind === "organism");
const inboxResult = inbox.manifest.interface?.outputs.result;
if (inboxEach?.kind !== "each" || inboxCall?.kind !== "organism" || !inboxResult || inboxEach.manifest !== inboxCall.manifest) {
  throw new Error("Inbox demo must reuse one child for its preview call and bounded collection");
}
const draftSource = inbox.sources["draft.algal"];
if (draftSource === undefined) throw new Error("Inbox project is missing draft.algal");
const inboxStore = new MemoryStore();
for (const child of inbox.modules) await inboxStore.putManifest(child);
const inboxCompiled = await compileOrganism(inbox.manifest, builtinRegistry(), inboxStore);
const inboxBundle = await packOrganism(inbox.manifest, inboxStore);
const inboxDiagram = createProgramDiagram(inbox.manifest, {
  source: inbox.source, sourceOptions: inbox.compilerOptions, ports: inboxCompiled.ports,
});
const expectedInbox = await readFixture("projects/inbox/inbox.expected.json");
const inboxRuns = [];
for (const variant of ["full", "empty"] as const) {
  const prefix = variant === "empty" ? "inbox.empty" : "inbox";
  const raw = await readFixture(`projects/inbox/${prefix}.args.json`);
  const args = Object.fromEntries(Object.entries(raw).map(([cell, values]) => [cell, asObject(values, `${prefix}.args.${cell}`)]));
  const responses = await readFixture(`projects/inbox/${prefix}.responses.json`);
  const store = new MemoryStore();
  for (const child of inbox.modules) await store.putManifest(child);
  const receipt = await runOrganism({ manifest: inbox.manifest, args, store, fns: builtinRegistry(), executors: [scriptedExecutor(responses)] });
  const result = asObject(receipt.cells[inboxResult.cell]?.outputs?.[inboxResult.port], "inbox result");
  const expected = variant === "empty" ? { preview: expectedInbox.preview!, replies: [] } : expectedInbox;
  const expectedItems = variant === "empty" ? 0 : inboxEach.maxItems;
  const expectedCalls = variant === "empty" ? 1 : inbox.analysis.maxAgentCalls;
  if (receipt.outcome !== "complete" || receipt.work.agentCalls !== expectedCalls || (expectedItems > 0 && receipt.cells[inboxEach.id]?.items !== expectedItems) || canonicalize(result) !== canonicalize(expected)) {
    throw new Error(`Inbox ${variant}: result, item count, or executor count no longer matches the demonstration`);
  }
  if (variant === "empty" && Object.keys(receipt.cells).some(id => id.startsWith(`${inboxEach.id}/`))) {
    throw new Error("Empty inbox unexpectedly executed a child");
  }
  const verification = await verifyReceipt(asJsonValue(receipt, "inbox receipt"), manifestToJson(inbox.manifest), store, builtinRegistry());
  if (!verification.ok) throw new Error(`Inbox ${variant}: receipt failed replay verification`);
  inboxRuns.push({ variant, prefix, result, receipt, args, responses });
}
const fullInbox = inboxRuns.find(run => run.variant === "full")!;
const emptyInbox = inboxRuns.find(run => run.variant === "empty")!;
if (!Array.isArray(fullInbox.result.replies) || !fullInbox.result.replies.every(value => typeof value === "string")) {
  throw new Error("Inbox results must be an ordered list of text replies");
}
const inboxReplies = fullInbox.result.replies;
const inboxResults = `<ol class="inbox-results">${inboxReplies.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ol>`;

const replacements: Record<string, string> = {
  REPLY_SOURCE: highlightSource(replySource.trimEnd()),
  INBOX_SOURCE: highlightSource(inbox.source.trimEnd()),
  DRAFT_SOURCE: highlightSource(draftSource.trimEnd()),
  INBOX_MAX_ITEMS: String(inboxEach.maxItems),
  INBOX_STATIC_CALLS: String(inbox.analysis.maxAgentCalls),
  INBOX_RESULT_COUNT: String(inboxReplies.length),
  INBOX_RECORDED_CALLS: String(fullInbox.receipt.work.agentCalls),
  INBOX_EMPTY_CALLS: String(emptyInbox.receipt.work.agentCalls),
  INBOX_RESULTS: inboxResults,
  ROUTE_SOURCE: highlightSource(routeSource.trimEnd()),
  ROUTE_PANELS: routePanels,
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
await mkdir(join(DIST, "receipts"), { recursive: true });
for (const f of ["styles.css", "robots.txt", "sitemap.xml", "llms.txt", "og.png"]) {
  await cp(join(SITE, f), join(DIST, f));
}
await cp(join(SITE, "icons"), join(DIST, "icons"), { recursive: true });
await writeFile(join(DIST, "index.html"), html);
await writeFile(join(DIST, "examples/reply.algal"), replySource);
await writeFile(join(DIST, "examples/reply.source-map.json"), `${JSON.stringify(reply.sourceMap, null, 2)}\n`);

for (const [name, manifest] of manifests) {
  const diagram = createProgramDiagram(manifest, name === "reply" ? { source: replySource } : {});
  await writeFile(join(DIST, "diagrams", `${name}.svg`), renderSvg(diagram, { compact: true, header: false }));
  await writeFile(join(DIST, "diagrams", `${name}.json`), `${JSON.stringify(diagram, null, 2)}\n`);
  await writeFile(join(DIST, "examples", `${name}.algal.json`), `${JSON.stringify(manifestToJson(manifest), null, 2)}\n`);
}

await writeFile(join(DIST, "examples/route.algal"), routeSource);
await writeFile(join(DIST, "examples/route.algal.json"), `${JSON.stringify(manifestToJson(route.manifest), null, 2)}\n`);
await writeFile(join(DIST, "examples/route.source-map.json"), `${JSON.stringify(route.sourceMap, null, 2)}\n`);
await writeFile(join(DIST, "examples/route.args.json"), `${JSON.stringify(routeArgs, null, 2)}\n`);
for (const run of routeRuns) {
  await writeFile(join(DIST, "diagrams", `route-${run.choice}.svg`), renderSvg(run.diagram, { compact: true, header: false }));
  await writeFile(join(DIST, "diagrams", `route-${run.choice}.json`), `${JSON.stringify(run.diagram, null, 2)}\n`);
  await writeFile(join(DIST, "receipts", `route-${run.choice}.receipt.json`), `${canonicalizeReceipt(run.receipt)}\n`);
  await writeFile(join(DIST, "examples", `route.responses.${run.choice}.json`), `${JSON.stringify(run.responses, null, 2)}\n`);
}

const inboxDirectory = join(DIST, "examples/projects/inbox");
await mkdir(inboxDirectory, { recursive: true });
for (const [file, source] of Object.entries(inbox.sources)) {
  const path = join(inboxDirectory, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, source);
}
await writeFile(join(inboxDirectory, "inbox.algal.json"), `${JSON.stringify(manifestToJson(inbox.manifest), null, 2)}\n`);
await writeFile(join(inboxDirectory, "inbox.bundle.json"), `${JSON.stringify(inboxBundle, null, 2)}\n`);
await writeFile(join(inboxDirectory, "inbox.source-map.json"), `${JSON.stringify(inbox.sourceMap, null, 2)}\n`);
await writeFile(join(DIST, "diagrams/inbox.svg"), renderSvg(inboxDiagram, { compact: true, header: false }));
await writeFile(join(DIST, "diagrams/inbox.json"), `${JSON.stringify(inboxDiagram, null, 2)}\n`);
for (const run of inboxRuns) {
  const name = run.variant === "empty" ? "inbox-empty" : "inbox";
  await writeFile(join(DIST, "receipts", `${name}.receipt.json`), `${canonicalizeReceipt(run.receipt)}\n`);
  await writeFile(join(inboxDirectory, `${run.prefix}.args.json`), `${JSON.stringify(run.args, null, 2)}\n`);
  await writeFile(join(inboxDirectory, `${run.prefix}.responses.json`), `${JSON.stringify(run.responses, null, 2)}\n`);
}

console.log(`site built → ${DIST} (${manifests.size + 1} structural diagrams + ${routeRuns.length + inboxRuns.length} replay-checked scripted executions)`);
