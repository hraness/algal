// Static site build. Program source, limits, and diagrams come from executable
// examples so the public demonstration cannot drift into illustrative syntax.
// Interactive diagram viewers consume algal.diagram-view.v1 documents emitted
// alongside each SVG — the same layout pass drives both.
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestToJson, parseOrganismManifest, type OrganismManifest } from "../src/contract";
import { createProgramDiagram, layoutDiagram, renderSvg, type ProgramDiagram } from "../src/diagram";
import { compileSource, SourceError } from "../src/source";
import { loadSourceProject } from "../src/source-project";
import { diagnoseSource, renderSourceDiagnostics } from "../src/source-diagnostics";
import { createSourceErrorReport, renderSourceError } from "../src/source-errors";
import { packOrganism } from "../src/bundle";
import { compileOrganism } from "../src/graph";
import { scriptedExecutor } from "../src/effects";
import { builtinRegistry } from "../src/registry";
import { canonicalizeReceipt, runOrganism, type RunReceipt } from "../src/run";
import { MemoryStore } from "../src/store";
import { asJsonValue, asObject, canonicalize, type JsonObject } from "../src/values";
import { verifyReceipt } from "../src/verify";
import { renderIconSprite, siteIcon } from "./icons";
import { buildSiteStyles } from "./assets";
import { pageDocument, type SitePageMeta } from "./chrome";
import { renderMarkdown, type LinkRewriter, type RenderedDoc } from "./markdown";
import { buildSurfaceFixture } from "../examples/malleable-site/host";
import { buildWorkbenchFixture } from "../examples/malleable-site/workbench-fixture";
import { parseProposal } from "../examples/malleable-site/surface";
import { renderSurfaceHtml } from "./living-render";

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

let verifiedRuns = 0;

/** The recorded lifecycle the interactive viewer animates: ordered cell and
 * effect events from the receipt, mapped onto this diagram's node ids. */
function runSteps(receipt: RunReceipt, diagram: ProgramDiagram) {
  const prefix = diagram.scope?.invocationPath ?? "";
  const nodeIds = new Set(diagram.nodes.map(node => node.id));
  const toNode = (path: string | undefined): string | undefined => {
    if (path === undefined) return undefined;
    const node = prefix
      ? (path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : undefined)
      : path;
    return node !== undefined && nodeIds.has(node) ? node : undefined;
  };
  const steps: { event: string; node: string }[] = [];
  for (const event of receipt.events) {
    if (event.kind === "run.start" || event.kind === "run.end") continue;
    const node = toNode(event.path);
    if (node === undefined) continue;
    steps.push({ event: event.kind, node });
  }
  // Recorded cell state: status, work, args, outputs — the values the run
  // actually saw, so the viewer can show evidence rather than types alone.
  const cells: Record<string, unknown> = {};
  for (const [path, rec] of Object.entries(receipt.cells)) {
    const node = toNode(path);
    if (node === undefined) continue;
    cells[node] = {
      status: rec.status,
      work: rec.work,
      ...(rec.outputs !== undefined ? { outputs: rec.outputs } : {}),
      ...(rec.failure !== undefined ? { failure: rec.failure } : {}),
    };
  }
  for (const [path, values] of Object.entries(receipt.args)) {
    const node = toNode(path);
    if (node === undefined) continue;
    (cells[node] ??= {} as Record<string, unknown>);
    (cells[node] as Record<string, unknown>).args = values;
  }
  // Effect outputs link to their cell through the recorded event order:
  // `effect` events carry the request digest the receipt's effects key on.
  const effectPaths = new Map(receipt.events
    .filter(event => event.kind === "effect" && event.digest !== undefined)
    .map(event => [event.digest!, toNode(event.path)] as const));
  const effects: Record<string, unknown[]> = {};
  for (const effect of receipt.effects) {
    const node = effectPaths.get(effect.requestDigest);
    if (node === undefined) continue;
    const recorded: Record<string, unknown> = { executor: effect.executor };
    if (effect.output !== undefined) recorded.output = effect.output;
    if (effect.error !== undefined) recorded.error = effect.error;
    (effects[node] ??= []).push(recorded);
  }
  return { receipt: receipt.digest, outcome: receipt.outcome, steps, cells, effects };
}

/** Write the static SVG, the exact diagram JSON, and the interactive view
 * document (diagram + shared layout + recorded run order). */
async function emitDiagram(name: string, diagram: ProgramDiagram, options: { header?: boolean; receipt?: RunReceipt } = {}) {
  const svgOptions = { compact: true, header: options.header ?? false };
  await writeFile(join(DIST, "diagrams", `${name}.svg`), renderSvg(diagram, svgOptions));
  await writeFile(join(DIST, "diagrams", `${name}.json`), `${JSON.stringify(diagram, null, 2)}\n`);
  const layout = layoutDiagram(diagram, { compact: true, header: false });
  const view = {
    contract: "algal.diagram-view.v1",
    diagram,
    layout,
    ...(options.receipt ? { run: runSteps(options.receipt, diagram) } : {}),
  };
  await writeFile(join(DIST, "diagrams", `${name}.view.json`), `${JSON.stringify(view)}\n`);
}

async function runFixture(manifest: OrganismManifest, args: JsonObject, responses: JsonObject, store = new MemoryStore()): Promise<RunReceipt> {
  const parsedArgs = Object.fromEntries(Object.entries(args).map(([cell, values]) => [cell, asObject(values, `args.${cell}`)]));
  const receipt = await runOrganism({
    manifest, args: parsedArgs, store, fns: builtinRegistry(),
    executors: [scriptedExecutor(responses)],
  });
  const verification = await verifyReceipt(asJsonValue(receipt, "receipt"), manifestToJson(manifest), store, builtinRegistry());
  if (!verification.ok) throw new Error("Fixture receipt failed replay verification");
  verifiedRuns += 1;
  return receipt;
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

const readFixture = async (file: string): Promise<JsonObject> => {
  const value: unknown = JSON.parse(await readFile(join(ROOT, "examples/source", file), "utf8"));
  return asObject(asJsonValue(value, file), file);
};
const readExampleFixture = async (file: string): Promise<JsonObject> => {
  const value: unknown = JSON.parse(await readFile(join(ROOT, "examples", file), "utf8"));
  return asObject(asJsonValue(value, file), file);
};

// The hero organism: run reply.algal with the repository's scripted answers,
// verify the receipt, and publish the recorded run for in-browser replay.
const replyArgs = await readFixture("reply.args.json");
const replyResponses = await readFixture("reply.responses.json");
const replyReceipt = await runFixture(reply.manifest, replyArgs, replyResponses);
if (replyReceipt.outcome !== "complete" || replyReceipt.work.agentCalls !== reply.manifest.budgets.maxAgentCalls) {
  throw new Error(`Reply demo: expected a complete run within ${reply.manifest.budgets.maxAgentCalls} executor attempts`);
}
const replyRunDiagram = createProgramDiagram(reply.manifest, { source: replySource, receipt: replyReceipt });

// These runs use repository-owned scripted responses exclusively. Retain the
// runtime's actual receipts and verify them before displaying their results.
const routeSource = await readFile(join(ROOT, "examples/source/route.algal"), "utf8");
const route = compileSource(routeSource);
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
  verifiedRuns += 1;
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
          <figcaption><span class="run-state">Committed</span><span class="run-state skipped">Skipped</span><a href="/diagrams/route-${run.choice}.svg" target="_blank" rel="noopener">Expand all cells ${siteIcon("arrow-up-right")}</a></figcaption>
          <div class="diagram-frame" data-diagram-view="/diagrams/route-${run.choice}.view.json"><div class="route-diagram-scroll" tabindex="0" role="region" aria-label="${run.title} execution graph, scroll horizontally on small screens"><img src="/diagrams/route-${run.choice}.svg" alt="Source-derived routing graph for the recorded ${run.choice} decision. ${run.receipt.work.agentCalls} executor attempts completed; ${run.skipped} inactive draft ${run.skipped === 1 ? "branch was" : "branches were"} skipped. All exact cells remain visible." width="1200" height="1050" loading="lazy"></div></div>
        </figure>
        <div class="route-receipt"><span>Receipt ${escapeHtml(run.receipt.digest)}</span><a href="/receipts/route-${run.choice}.receipt.json" download>Download receipt ${siteIcon("download")}</a><a href="/examples/route.responses.${run.choice}.json" download>Scripted answers ${siteIcon("download")}</a></div>
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
  verifiedRuns += 1;
  inboxRuns.push({ variant, prefix, result, receipt, args, responses });
}
const fullInbox = inboxRuns.find(run => run.variant === "full")!;
const emptyInbox = inboxRuns.find(run => run.variant === "empty")!;
if (!Array.isArray(fullInbox.result.replies) || !fullInbox.result.replies.every(value => typeof value === "string")) {
  throw new Error("Inbox results must be an ordered list of text replies");
}
const inboxReplies = fullInbox.result.replies;
const inboxResults = `<ol class="inbox-results">${inboxReplies.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ol>`;
const childViews = inboxReplies.map((reply, index) => {
  const focus = `${inboxEach.id}/i${index}`;
  const diagram = createProgramDiagram(inbox.manifest, {
    source: inbox.source, sourceOptions: inbox.compilerOptions, receipt: fullInbox.receipt, focus,
  });
  if (diagram.scope?.invocationPath !== focus || diagram.receipt?.digest !== fullInbox.receipt.digest || diagram.nodes.find(node => node.id === "result")?.status !== "committed") {
    throw new Error(`Inbox item ${index}: scoped diagram lost its invocation or receipt binding`);
  }
  return { index, focus, reply, diagram };
});
const childTabs = childViews.map(({ index }) => `<button type="button" role="tab" id="tab-inbox-item-${index}" aria-controls="inbox-item-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">Email ${index + 1}</button>`).join("");
const childPanels = childViews.map(({ index, focus, reply }) => `<article class="child-panel" id="inbox-item-${index}" aria-labelledby="inbox-item-${index}-title"><h3 id="inbox-item-${index}-title">Email ${index + 1} · one recorded invocation</h3><p class="child-reply">${escapeHtml(reply)}</p><p class="child-path">${escapeHtml(focus)} · draft.algal</p><div class="diagram-frame" data-diagram-view="/diagrams/inbox-item-${index}.view.json"><div class="child-graph-scroll" tabindex="0" role="region" aria-label="Email ${index + 1} child graph, scroll horizontally on small screens"><img src="/diagrams/inbox-item-${index}.svg" alt="Exact draft helper graph and recorded cell states for email ${index + 1}, bound to the original inbox receipt." loading="lazy"></div></div><a href="/diagrams/inbox-item-${index}.svg" target="_blank" rel="noopener">Expand child graph ${siteIcon("arrow-up-right")}</a></article>`).join("");

const ratios = await loadSourceProject(join(ROOT, "examples/source/projects/ratios/ratios.algal"));
const ratioStore = new MemoryStore();
for (const child of ratios.modules) await ratioStore.putManifest(child);
const ratioArgsRaw = await readFixture("projects/ratios/ratios.args.json");
const ratioArgs = Object.fromEntries(Object.entries(ratioArgsRaw).map(([cell, values]) => [cell, asObject(values, `ratios.args.${cell}`)]));
const ratioReceipt = await runOrganism({ manifest: ratios.manifest, args: ratioArgs, store: ratioStore, fns: builtinRegistry(), executors: [] });
const ratioReport = diagnoseSource(ratioReceipt, ratios.source, ratios.compilerOptions);
if (ratioReceipt.outcome !== "failed" || ratioReport.issues[0]?.path !== "result-each/i1/b1-fraction" || ratioReport.issues[0]?.location?.source !== "ratio.algal" || ratioReport.issues[0]?.location?.span.start.line !== 4 || ratioReceipt.work.agentCalls !== 0) {
  throw new Error("Ratio failure example no longer maps the second item to the original division expression");
}
const ratioVerification = await verifyReceipt(asJsonValue(ratioReceipt, "ratio receipt"), manifestToJson(ratios.manifest), ratioStore, builtinRegistry());
if (!ratioVerification.ok) throw new Error("Ratio failure receipt did not replay");
verifiedRuns += 1;
const ratioDiagram = createProgramDiagram(ratios.manifest, { source: ratios.source, sourceOptions: ratios.compilerOptions, receipt: ratioReceipt, focus: "result-each/i1" });
if (ratioDiagram.nodes.find(node => node.id === "b1-fraction")?.status !== "failed") throw new Error("Ratio focused view lost the failed expression");

// A deliberate authoring mistake is compiled, never executed. Publish the
// formatter's actual bounded report alongside the original two-file example.
const authoringDirectory = join(ROOT, "examples/source/errors/unknown-binding");
const authoringSource = await readFile(join(authoringDirectory, "main.algal"), "utf8");
const authoringHelper = await readFile(join(authoringDirectory, "helpers/draft.algal"), "utf8");
const authoringOptions = { entry: "main.algal", modules: { "helpers/draft.algal": authoringHelper } };
const authoringReport = (() => {
  try { compileSource(authoringSource, authoringOptions); }
  catch (error) {
    if (error instanceof SourceError) return createSourceErrorReport(error);
    throw error;
  }
  throw new Error("The intentionally invalid authoring example unexpectedly compiled");
})();
if (authoringReport.source !== "helpers/draft.algal" || authoringReport.span?.start.line !== 5
  || !authoringReport.message.includes("emial") || authoringReport.imports.length !== 1
  || authoringReport.imports[0]?.source !== "main.algal" || authoringReport.imports[0]?.path !== "./helpers/draft.algal"
  || authoringReport.imports[0]?.span?.start.line !== 1 || !authoringReport.excerpt?.lines.some(line => line.text.includes("emial") && line.highlight)) {
  throw new Error("Authoring error no longer locates the misspelled binding and its import site");
}
const repairedAuthoring = compileSource(authoringSource, { ...authoringOptions,
  modules: { "helpers/draft.algal": authoringHelper.replace("using emial", "using email") },
});
if (repairedAuthoring.analysis.maxAgentCalls !== 1 || repairedAuthoring.analysis.requiredDepth !== 1) {
  throw new Error("The advertised one-word repair no longer restores the expected program bounds");
}

// Composition examples with committed scripted fixtures run for real at build
// time, so their interactive diagrams can replay recorded execution evidence.
// Like `algal suite`, preload every bundled example so digest-addressed
// children resolve in the store.
const exampleStore = new MemoryStore();
for (const file of (await readdir(join(ROOT, "examples"))).filter(f => f.endsWith(".algal.json")).sort()) {
  const value: unknown = JSON.parse(await readFile(join(ROOT, "examples", file), "utf8"));
  await exampleStore.putManifest(parseOrganismManifest(value));
}
const evolutionRuns = new Map<string, RunReceipt>();
for (const name of ["refine", "swarm", "habitat"] as const) {
  const args = await readExampleFixture(`${name}.args.json`);
  const responses = await readExampleFixture(`${name}.responses.json`);
  const receipt = await runFixture(manifests.get(name)!, args, responses, exampleStore);
  if (receipt.outcome !== "complete") throw new Error(`${name} fixture run did not complete`);
  evolutionRuns.set(name, receipt);
}

// --- Hero specimen collage --------------------------------------------------
// The hero leads with the language itself. A chooser steps through organisms;
// each selection shows the same three artifacts — the compiled program graph,
// the source/manifest text, and the recorded run evidence — as overlapping,
// slightly rotated panels, like specimens pinned to a board.
const heroReceiptCard = (receipt: RunReceipt) => {
  const cells = Object.values(receipt.cells);
  const committed = cells.filter(cell => cell.status === "committed").length;
  const skipped = cells.filter(cell => cell.status === "skipped").length;
  return {
    evidenceLabel: `receipt · ${receipt.digest.slice(0, 19)}…`,
    evidenceRows: [
      ["events", `${receipt.events.length}`],
      ["cells", `${committed} committed${skipped ? ` · ${skipped} skipped` : ""}`],
      ["effects", `${receipt.effects.length} recorded`],
      ["outcome", receipt.outcome],
    ] as [string, string][],
  };
};

const habitatManifest = manifests.get("habitat")!;
const habitatReceipt = evolutionRuns.get("habitat")!;
const habitatManifestExcerpt = JSON.stringify(manifestToJson(habitatManifest), null, 2).split("\n").slice(0, 20).join("\n");

interface HeroExample {
  key: string; file: string; blurb: string;
  graphTitle: string; graphSrc: string; graphView: string; graphAlt: string; objectPosition: string;
  sourceHref: string; evidenceHref: string;
  codeName: string; codeHtml: string;
  evidenceLabel: string; evidenceRows: [string, string][];
  chip: string;
}

const heroChip = (receipt: RunReceipt) => `algal.organism.v1 · sha256:${receipt.manifestDigest.slice(7, 19)}…`;
const routeHelp = routeRuns.find(run => run.choice === "help")!;

const heroExamples: HeroExample[] = [
  {
    key: "route", file: "route.algal", blurb: "one decision fans into three replies",
    graphTitle: "route.algal · recorded run", graphSrc: "/diagrams/route-help.svg", graphView: "/diagrams/route-help.view.json", objectPosition: "50% 0%",
    graphAlt: "Program graph of the route organism: an email input flows into a decide cell, a pure check, then a match with three arms — help, sales, and human review — overlaid with the states of one recorded run.",
    sourceHref: "/examples/route.algal", evidenceHref: "/receipts/route-help.receipt.json",
    codeName: "route.algal", codeHtml: highlightSource(routeSource.trimEnd()),
    ...heroReceiptCard(routeHelp.receipt),
    chip: heroChip(routeHelp.receipt),
  },
  {
    key: "reply", file: "reply.algal", blurb: "classify the email, then draft",
    graphTitle: "reply.algal · recorded run", graphSrc: "/diagrams/reply-run.svg", graphView: "/diagrams/reply-run.view.json", objectPosition: "50% 0%",
    graphAlt: "Program graph of the reply organism: an email input flows into a typed decide cell, a pure check, then generation — overlaid with the states of one recorded run.",
    sourceHref: "/examples/reply.algal", evidenceHref: "/receipts/reply.receipt.json",
    codeName: "reply.algal", codeHtml: highlightSource(replySource.trimEnd()),
    ...heroReceiptCard(replyReceipt),
    chip: heroChip(replyReceipt),
  },
  {
    key: "inbox", file: "inbox.algal", blurb: "organisms compose — call and each",
    graphTitle: "inbox.algal · program graph", graphSrc: "/diagrams/inbox.svg", graphView: "/diagrams/inbox.view.json", objectPosition: "0% 0%",
    graphAlt: "Program graph of the inbox organism: inputs feed a call to the draft organism and an each cell that maps drafts over a list, both merging into the result.",
    sourceHref: "/examples/projects/inbox/inbox.algal", evidenceHref: "/receipts/inbox.receipt.json",
    codeName: "inbox.algal", codeHtml: highlightSource(inbox.source.trimEnd()),
    ...heroReceiptCard(fullInbox.receipt),
    chip: heroChip(fullInbox.receipt),
  },
  {
    key: "habitat", file: "habitat.algal.json", blurb: "a program emits a program",
    graphTitle: "habitat · spawn, recorded", graphSrc: "/diagrams/habitat.svg", graphView: "/diagrams/habitat.view.json", objectPosition: "50% 0%",
    graphAlt: "Program graph of the habitat organism: a goal flows into a planner, a spawn cell that admits a child manifest, and the result — overlaid with the states of one recorded run.",
    sourceHref: "/examples/habitat.algal.json", evidenceHref: "/receipts/habitat.receipt.json",
    codeName: "habitat.algal.json · the program, as data", codeHtml: escapeHtml(habitatManifestExcerpt),
    ...heroReceiptCard(habitatReceipt),
    chip: heroChip(habitatReceipt),
  },
];

const HERO_CHOOSER = `<div class="hero-chooser" role="group" aria-label="Choose an organism">${heroExamples.map((example, index) =>
  `<button type="button" class="hero-choose" data-hero-choose="${example.key}" aria-pressed="${index === 0}"><span class="hc-file">${escapeHtml(example.file)}</span><span class="hc-blurb">${escapeHtml(example.blurb)}</span></button>`).join("")}</div>`;

const playIcon = `<svg class="site-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="/icons.svg#play"></use></svg>`;
const HERO_STAGE = `<div class="hero-stage" data-hero-stage>${heroExamples.map((example, index) => `
  <div class="hs-set" data-example-set="${example.key}"${index === 0 ? "" : " hidden"}>
    <figure class="hs-card hs-graph">
      <figcaption class="hs-bar"><span class="file-label">${playIcon}${example.graphTitle}</span><span class="hs-links"><a href="${example.sourceHref}" download>Source</a><a href="${example.evidenceHref}" download>Receipt</a></span></figcaption>
      <div class="hs-viewport diagram-frame" data-diagram-view="${example.graphView}" data-diagram-canvas><img src="${example.graphSrc}" alt="${example.graphAlt}" style="object-position:${example.objectPosition}"${index === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}></div>
    </figure>
    <figure class="hs-card hs-code">
      <figcaption class="hs-bar"><span class="file-label">${example.codeName}</span></figcaption>
      <pre class="hs-pre">${example.codeHtml}</pre>
    </figure>
    <figure class="hs-card hs-evidence">
      <figcaption class="hs-bar"><span class="file-label">${example.evidenceLabel}</span></figcaption>
      <dl class="hs-dl">${example.evidenceRows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>
    </figure>
    <span class="hs-chip">${example.chip}</span>
  </div>`).join("")}</div>`;

const replacements: Record<string, string> = {
  HERO_CHOOSER: HERO_CHOOSER,
  HERO_STAGE: HERO_STAGE,
  REPLY_SOURCE: highlightSource(replySource.trimEnd()),
  REPLY_MAX_AGENT_CALLS: String(reply.manifest.budgets.maxAgentCalls),
  REPLY_RECEIPT_SHORT: escapeHtml(replyReceipt.digest.slice(0, 23)),
  INBOX_SOURCE: highlightSource(inbox.source.trimEnd()),
  DRAFT_SOURCE: highlightSource(draftSource.trimEnd()),
  INBOX_MAX_ITEMS: String(inboxEach.maxItems),
  INBOX_STATIC_CALLS: String(inbox.analysis.maxAgentCalls),
  INBOX_REQUIRED_DEPTH: String(inbox.analysis.requiredDepth),
  INBOX_SOURCE_FILES: String(inbox.files.length),
  INBOX_RESULT_COUNT: String(inboxReplies.length),
  INBOX_RECORDED_CALLS: String(fullInbox.receipt.work.agentCalls),
  INBOX_EMPTY_CALLS: String(emptyInbox.receipt.work.agentCalls),
  INBOX_RESULTS: inboxResults,
  INBOX_CHILD_TABS: childTabs,
  INBOX_CHILD_PANELS: childPanels,
  SOURCE_DIAGNOSTIC: escapeHtml(renderSourceDiagnostics(ratioReport)),
  AUTHORING_ERROR: escapeHtml(renderSourceError(authoringReport)),
  ROUTE_SOURCE: highlightSource(routeSource.trimEnd()),
  ROUTE_PANELS: routePanels,
  REFINE_ROUNDS: String(refine.maxRounds),
  SWARM_ITEMS: String(swarm.maxItems),
};

// One executable source drives the static fallback, portable evidence and
// browser expression preview. This is not a full browser application host.
const living = await buildSurfaceFixture();
verifiedRuns += 1;
replacements.LIVING_SURFACE = renderSurfaceHtml(living.view);
const workbench = await buildWorkbenchFixture();
replacements.WORKBENCH_SURFACE = renderSurfaceHtml(workbench.capture.view);

const pages: { file: string; out: string; meta: SitePageMeta }[] = [
  { file: "pages/workbench.html", out: "workbench/index.html", meta: {
    page: "workbench", path: "/workbench/", title: "Why this? — ALGAL workbench",
    description: "Follow a running ALGAL component to its revision, signals, history and execution evidence.",
    ogTitle: "Why this? — ALGAL workbench", ogAlt: "A component and its captured explanation",
  } },
  {
    file: "pages/living.html", out: "living/index.html",
    meta: {
      page: "living", path: "/living/",
      title: "Software you can reshape — ALGAL",
      description: "Edit a living marketing component, explore its signals, and preview a new revision. The same ALGAL expression program drives its content in the browser and native runtime.",
      ogTitle: "Software you can reshape — ALGAL",
      ogAlt: "A living ALGAL component with an inspector and revision history",
    },
  },
  {
    file: "pages/home.html", out: "index.html",
    meta: {
      page: "home", path: "/",
      title: "ALGAL — the language for living programs",
      description: "A programming language and virtual machine where programs are organisms: typed, bounded, content-addressed. They wait, remember, reproduce, and leave a verifiable fossil of every run.",
      ogTitle: "ALGAL — the language for living programs",
      ogAlt: "ALGAL — the language for living programs",
    },
  },
  {
    file: "pages/tour.html", out: "tour/index.html",
    meta: {
      page: "tour", path: "/tour/",
      title: "Inside a living program — ALGAL tour",
      description: "A guided tour of ALGAL organisms: real compiled source, recorded executions, replayable receipts, and generated diagrams — all produced and verified during the site build.",
      ogTitle: "Inside a living program — ALGAL tour",
      ogAlt: "Inside a living program — the ALGAL tour",
    },
  },
  {
    file: "pages/use-cases.html", out: "use-cases/index.html",
    meta: {
      page: "use-cases", path: "/use-cases/",
      title: "Put living programs to work — ALGAL use cases",
      description: "Use ALGAL when the work around a model matters: durable human review, checked coding repairs, portable execution evidence, and reusable routing programs.",
      ogTitle: "Put living programs to work — ALGAL",
      ogAlt: "Put living programs to work — ALGAL use cases",
    },
  },
];

// --- Documentation mirror -------------------------------------------------
// The repository's docs/ and spec/v1/ markdown is the single source of truth;
// the site renders the same files so nothing is maintained twice. Internal
// working notes (dated reviews, pilot data, improvement ledgers) stay in the
// repo and are not mirrored.

const DOC_GROUPS: { title: string; pages: string[] }[] = [
  { title: "Start here", pages: ["native-release", "native-workbench", "source-language", "vm"] },
  { title: "Concepts", pages: ["why-unique", "algal-design", "design", "agent-loop-and-organism", "programmable-applications", "application-host-adapters", "executors", "diagrams", "repair"] },
  { title: "Life and selection", pages: ["habitats", "civilization"] },
  { title: "Applications and workflows", pages: ["use-cases", "when-algal-wins", "malleable-site", "malleable-workbench", "local-triage", "adaptive-inventory", "agent-tool", "coding-harness", "coding-operations", "pr-shepherd"] },
];
const DOC_SLUGS = DOC_GROUPS.flatMap(group => group.pages);
const SPEC_SLUGS = ["organism", "expr", "foundry", "search", "bench", "mailbox", "process", "process-evidence", "process-journal", "application", "coding-job", "coding-job-v2", "coding-operation"];
const GITHUB_BLOB = (path: string) => `https://github.com/hraness/algal/blob/main/${path}`;

/** Resolve a markdown link from a mirrored file to a site URL or the
 * repository blob for anything the mirror does not carry. */
function docLinkRewriter(kind: "docs" | "spec"): LinkRewriter {
  const docSet = new Set(DOC_SLUGS);
  const specSet = new Set(SPEC_SLUGS);
  const base = kind === "docs" ? ["docs"] : ["spec", "v1"];
  return href => {
    if (/^[a-z]+:/i.test(href) || href.startsWith("#") || href.startsWith("/")) return href;
    const clean = href.replace(/^\.\//, "");
    const [target = "", fragment = ""] = clean.split(/(?=#)/, 2);
    const upCount = (target.match(/\.\.\//g) ?? []).length;
    const leaf = target.replace(/^(\.\.\/)+/, "");
    const dir = base.slice(0, Math.max(0, base.length - upCount));
    const repoPath = dir.length ? `${dir.join("/")}/${leaf}` : leaf;
    const md = repoPath.match(/^(docs|spec\/v1)\/([a-z0-9-]+)\.md$/i);
    if (md) {
      const slug = md[2]!.toLowerCase();
      if (md[1]!.toLowerCase() === "docs" && docSet.has(slug)) return `/docs/${slug}/${fragment}`;
      if (md[1]!.toLowerCase() === "spec/v1" && specSet.has(slug)) return `/docs/spec/${slug}/${fragment}`;
    }
    return GITHUB_BLOB(repoPath);
  };
}

async function renderDocFile(kind: "docs" | "spec", slug: string): Promise<RenderedDoc> {
  const path = kind === "docs" ? join(ROOT, "docs", `${slug}.md`) : join(ROOT, "spec", "v1", `${slug}.md`);
  const doc = renderMarkdown(await readFile(path, "utf8"), docLinkRewriter(kind));
  if (doc.title === "Documentation") {
    doc.title = slug.split("-").map(word => word[0]!.toUpperCase() + word.slice(1)).join(" ");
  }
  return doc;
}

/** The mirrored shelf — one rail listing every doc group and spec file,
 * rendered identically on each docs page so navigation never dead-ends. */
function docsRail(current: string, titles: Map<string, string>): string {
  const item = (href: string, slug: string, label: string) =>
    `<li><a href="${href}"${slug === current ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a></li>`;
  const groups = DOC_GROUPS.map(group =>
    `<p class="docs-group">${escapeHtml(group.title)}</p><ul>${group.pages.map(slug =>
      item(`/docs/${slug}/`, slug, titles.get(`docs/${slug}`) ?? slug)).join("")}</ul>`).join("");
  const spec = `<p class="docs-group">Specification</p><ul>${SPEC_SLUGS.map(slug =>
    item(`/docs/spec/${slug}/`, `spec/${slug}`, titles.get(`spec/${slug}`) ?? slug)).join("")}</ul>`;
  return `<aside class="docs-rail"><nav class="docs-nav" aria-label="Documentation"><a class="docs-home" href="/docs/"${current === "index" ? ' aria-current="page"' : ""}>Documentation</a>${groups}${spec}</nav></aside>`;
}

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, "diagrams"), { recursive: true });
await mkdir(join(DIST, "examples"), { recursive: true });
await mkdir(join(DIST, "receipts"), { recursive: true });
await mkdir(join(DIST, "living"), { recursive: true });
await mkdir(join(DIST, "workbench"), { recursive: true });
await cp(join(SITE, "workbench.css"), join(DIST, "workbench.css"));
await writeFile(join(DIST, "workbench/capture.json"), JSON.stringify(workbench.capture) + "\n");
await writeFile(join(DIST, "workbench/evidence.json"), JSON.stringify(workbench.evidence) + "\n");
await cp(join(SITE, "living.css"), join(DIST, "living.css"));
await cp(join(ROOT, "src/algal_expr.wasm"), join(DIST, "living/algal_expr.wasm"));
for (const [name, value] of Object.entries({ initial: living.revision, signals: living.signals, view: living.view, manifest: living.manifest, bundle: living.bundle, receipt: living.receipt })) {
  await writeFile(join(DIST, "living", `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}
const recordedProposal = Bun.file(join(ROOT, "examples/malleable-site/model-proposal.json"));
if (await recordedProposal.exists()) {
  const proposal = parseProposal(await recordedProposal.json());
  await writeFile(join(DIST, "living/model-proposal.json"), `${JSON.stringify(proposal, null, 2)}\n`);
}
const modelEvidencePath = join(ROOT, "examples/malleable-site/model-evidence.json");
if (await Bun.file(modelEvidencePath).exists()) await cp(modelEvidencePath, join(DIST, "living/model-evidence.json"));
for (const f of ["robots.txt", "llms.txt", "og.png", "favicon.svg", "algal-mark.svg"]) {
  await cp(join(SITE, f), join(DIST, f));
}
// Shared presentation and iconography are build-time dependencies only. The
// shipped site has self-hosted fonts/assets; the CLI gains no browser runtime.
const styles = await buildSiteStyles(DIST);
const browserScripts = await Bun.build({
  entrypoints: [join(SITE, "appearance.ts"), join(SITE, "client.ts"), join(SITE, "viewer.ts")], outdir: DIST,
  target: "browser", format: "iife", minify: true,
  naming: { entry: "[name].js", asset: "assets/[name]-[hash].[ext]" },
});
const surfaceModule = await Bun.build({
  entrypoints: [join(SITE, "living.ts"), join(SITE, "workbench.ts")], outdir: DIST,
  target: "browser", format: "esm", minify: true,
  naming: { entry: "[name].js" },
});
if (!styles.success || !browserScripts.success || !surfaceModule.success) throw new AggregateError([...styles.logs, ...browserScripts.logs, ...surfaceModule.logs], "Site asset build failed");
await writeFile(join(DIST, "icons.svg"), renderIconSprite());
await mkdir(join(DIST, "licenses"), { recursive: true });
await cp(join(SITE, "licenses/hugeicons-MIT.txt"), join(DIST, "licenses/hugeicons-MIT.txt"));
await cp(join(SITE, "licenses/hugeicons-provenance.md"), join(DIST, "licenses/hugeicons-provenance.md"));
for (const [source, target] of [
  ["@hraness/design-kit/LICENSE", "design-kit-MIT.txt"],
  ["@hraness/ui/LICENSE", "ui-MIT.txt"],
  ["@hraness/design-kit/src/fonts/nebula-sans/LICENSE.txt", "nebula-sans-OFL.txt"],
  ["@hraness/design-kit/src/fonts/nebula-sans/PROVENANCE.md", "nebula-sans-provenance.md"],
  ["@hraness/design-kit/src/fonts/geist-mono/OFL.txt", "geist-mono-OFL.txt"],
  ["@hraness/design-kit/src/fonts/geist-mono/PROVENANCE.md", "geist-mono-provenance.md"],
  ["@hraness/design-kit/src/fonts/instrument-serif/OFL.txt", "instrument-serif-OFL.txt"],
  ["@hraness/design-kit/src/fonts/instrument-serif/UPSTREAM.md", "instrument-serif-provenance.md"],
] as const) await cp(join(ROOT, "node_modules", source), join(DIST, "licenses", target));

await writeFile(join(DIST, "examples/reply.algal"), replySource);
await writeFile(join(DIST, "examples/reply.source-map.json"), `${JSON.stringify(reply.sourceMap, null, 2)}\n`);
await writeFile(join(DIST, "examples/reply.args.json"), `${JSON.stringify(replyArgs, null, 2)}\n`);
await writeFile(join(DIST, "examples/reply.responses.json"), `${JSON.stringify(replyResponses, null, 2)}\n`);
await writeFile(join(DIST, "receipts/reply.receipt.json"), `${canonicalizeReceipt(replyReceipt)}\n`);

for (const [name, manifest] of manifests) {
  const diagram = name === "reply"
    ? createProgramDiagram(manifest, { source: replySource })
    : createProgramDiagram(manifest);
  const run = evolutionRuns.get(name);
  await emitDiagram(name, diagram, run ? { receipt: run } : {});
  await writeFile(join(DIST, "examples", `${name}.algal.json`), `${JSON.stringify(manifestToJson(manifest), null, 2)}\n`);
}
// The hero artifact shows one recorded run of the reply organism.
await emitDiagram("reply-run", replyRunDiagram, { receipt: replyReceipt });

await writeFile(join(DIST, "receipts/habitat.receipt.json"), `${canonicalizeReceipt(habitatReceipt)}\n`);
await writeFile(join(DIST, "examples/route.algal"), routeSource);
await writeFile(join(DIST, "examples/route.algal.json"), `${JSON.stringify(manifestToJson(route.manifest), null, 2)}\n`);
await writeFile(join(DIST, "examples/route.source-map.json"), `${JSON.stringify(route.sourceMap, null, 2)}\n`);
await writeFile(join(DIST, "examples/route.args.json"), `${JSON.stringify(routeArgs, null, 2)}\n`);
for (const run of routeRuns) {
  await emitDiagram(`route-${run.choice}`, run.diagram, { receipt: run.receipt });
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
await emitDiagram("inbox", inboxDiagram);
for (const run of inboxRuns) {
  const name = run.variant === "empty" ? "inbox-empty" : "inbox";
  await writeFile(join(DIST, "receipts", `${name}.receipt.json`), `${canonicalizeReceipt(run.receipt)}\n`);
  await writeFile(join(inboxDirectory, `${run.prefix}.args.json`), `${JSON.stringify(run.args, null, 2)}\n`);
  await writeFile(join(inboxDirectory, `${run.prefix}.responses.json`), `${JSON.stringify(run.responses, null, 2)}\n`);
}
for (const child of childViews) {
  await emitDiagram(`inbox-item-${child.index}`, child.diagram, { header: true, receipt: fullInbox.receipt });
}
const ratiosDirectory = join(DIST, "examples/projects/ratios");
await mkdir(ratiosDirectory, { recursive: true });
for (const [file, source] of Object.entries(ratios.sources)) await writeFile(join(ratiosDirectory, file), source);
await writeFile(join(ratiosDirectory, "ratios.args.json"), `${JSON.stringify(ratioArgs, null, 2)}\n`);
await writeFile(join(ratiosDirectory, "ratios.algal.json"), `${JSON.stringify(manifestToJson(ratios.manifest), null, 2)}\n`);
await writeFile(join(ratiosDirectory, "ratios.bundle.json"), `${JSON.stringify(await packOrganism(ratios.manifest, ratioStore), null, 2)}\n`);
await writeFile(join(DIST, "receipts/ratios.receipt.json"), `${canonicalizeReceipt(ratioReceipt)}\n`);
await writeFile(join(DIST, "receipts/ratios.diagnostics.json"), `${JSON.stringify(ratioReport, null, 2)}\n`);
await emitDiagram("ratio-failure", ratioDiagram, { header: true, receipt: ratioReceipt });

const authoringDownloadDirectory = join(DIST, "examples/errors/unknown-binding");
await mkdir(join(authoringDownloadDirectory, "helpers"), { recursive: true });
await writeFile(join(authoringDownloadDirectory, "main.algal"), authoringSource);
await writeFile(join(authoringDownloadDirectory, "helpers/draft.algal"), authoringHelper);
await writeFile(join(authoringDownloadDirectory, "diagnostic.json"), `${JSON.stringify(authoringReport, null, 2)}\n`);

// Render each page fragment inside the shared document, then apply the
// measured placeholders across the whole emitted document.
replacements.BUILD_STATS = `${verifiedRuns} recorded runs replay-verified in this build`;
for (const { file, out, meta } of pages) {
  let document = pageDocument(meta, await readFile(join(SITE, file), "utf8"));
  for (const [key, value] of Object.entries(replacements)) {
    document = document.replaceAll(`{{${key}}}`, value);
  }
  if (/\{\{[A-Z_]+\}\}/.test(document)) throw new Error(`Unresolved site build placeholder in ${file}`);
  const target = join(DIST, out);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, document);
}

// --- Docs mirror emission --------------------------------------------------
// Render the curated docs and every spec file into /docs/, with one shared
// navigation rail. Internal links between mirrored pages stay on the site;
// everything else resolves to the repository blob.
const docRenderers = new Map<string, RenderedDoc>();
const specRenderers = new Map<string, RenderedDoc>();
for (const slug of DOC_SLUGS) docRenderers.set(slug, await renderDocFile("docs", slug));
for (const slug of SPEC_SLUGS) specRenderers.set(slug, await renderDocFile("spec", slug));
const docTitles = new Map<string, string>();
for (const [slug, doc] of docRenderers) docTitles.set(`docs/${slug}`, doc.title);
for (const [slug, doc] of specRenderers) docTitles.set(`spec/${slug}`, doc.title);

const emitDocPage = async (meta: SitePageMeta, body: string) => {
  let document = pageDocument(meta, `<main id="main" class="hraness-marketing-page docs-page">${body}</main>`);
  for (const [key, value] of Object.entries(replacements)) document = document.replaceAll(`{{${key}}}`, value);
  if (/\{\{[A-Z_]+\}\}/.test(document)) throw new Error(`Unresolved site build placeholder in ${meta.path}`);
  const target = join(DIST, meta.path, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, document);
};

const docsSource = (kind: "docs" | "spec", slug: string) =>
  `<footer class="docs-source"><p>Mirrored from <a href="${GITHUB_BLOB(kind === "docs" ? `docs/${slug}.md` : `spec/v1/${slug}.md`)}">${kind === "docs" ? `docs/${slug}.md` : `spec/v1/${slug}.md`}</a> — the repository copy is the source of truth.</p></footer>`;

for (const [slug, doc] of docRenderers) {
  await emitDocPage({
    page: "docs", path: `/docs/${slug}/`,
    title: `${doc.title} — ALGAL docs`,
    description: doc.description || `${doc.title} — ALGAL documentation`,
    ogTitle: doc.title, ogAlt: `${doc.title} — ALGAL documentation`,
  }, `<div class="docs-layout">${docsRail(slug, docTitles)}<article class="docs-article prose">${doc.html}${docsSource("docs", slug)}</article></div>`);
}
for (const [slug, doc] of specRenderers) {
  await emitDocPage({
    page: "spec", path: `/docs/spec/${slug}/`,
    title: `${doc.title} — ALGAL spec`,
    description: doc.description || `${doc.title} — ALGAL contract specification`,
    ogTitle: `${doc.title} — ALGAL spec`, ogAlt: `${doc.title} — ALGAL contract specification`,
  }, `<div class="docs-layout">${docsRail(`spec/${slug}`, docTitles)}<article class="docs-article prose docs-spec">${doc.html}${docsSource("spec", slug)}</article></div>`);
}

// Docs index — grouped shelf with each page's first paragraph as its summary.
const indexGroups = DOC_GROUPS.map(group => `<section class="docs-index-group"><h2>${escapeHtml(group.title)}</h2><ul class="docs-list">${group.pages.map(slug => {
  const doc = docRenderers.get(slug)!;
  return `<li><a href="/docs/${slug}/"><strong>${escapeHtml(doc.title)}</strong><span>${escapeHtml(doc.description)}</span></a></li>`;
}).join("")}</ul></section>`).join("");
const indexSpec = `<section class="docs-index-group"><h2>Specification</h2><ul class="docs-list">${SPEC_SLUGS.map(slug => {
  const doc = specRenderers.get(slug)!;
  return `<li><a href="/docs/spec/${slug}/"><strong>${escapeHtml(doc.title)}</strong><span>${escapeHtml(doc.description)}</span></a></li>`;
}).join("")}</ul></section>`;
await emitDocPage({
  page: "docs", path: "/docs/",
  title: "ALGAL documentation",
  description: "The ALGAL documentation, mirrored from the repository: install, the source language, the process VM, habitats, executors, and the v1 contract specification.",
  ogTitle: "ALGAL documentation", ogAlt: "The ALGAL documentation",
}, `<section class="page-intro"><p class="eyebrow">Documentation</p><h1>The reference shelf.</h1><p class="lede">Every page here renders the same markdown maintainers read in the repository — one source, two doors. Working notes and pilot data stay in the repo.</p></section><div class="docs-layout">${docsRail("index", docTitles)}<div class="docs-article docs-index"><div class="docs-index-groups">${indexGroups}${indexSpec}</div></div></div>`);

// --- Authored content: blog posts and comparison pages ---------------------
// Same renderer as the docs mirror, but these pages are site-native: they
// live in site/blog and site/compare with a small frontmatter header.

interface ContentMeta { title?: string; date?: string; description?: string; order?: string }

function parseFrontmatter(source: string): { meta: ContentMeta; body: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta: meta as ContentMeta, body: source.slice(match[0].length) };
}

const contentSectionUrls: string[] = [];

async function emitMarkdownSection(options: {
  dir: "blog" | "compare";
  page: "blog" | "compare";
  railTitle: string;
  indexIntro: { eyebrow: string; heading: string; lede: string };
  indexMeta: { title: string; description: string; ogTitle: string; ogAlt: string };
  sortBy: "date" | "order";
}) {
  const files = (await readdir(join(SITE, options.dir))).filter(file => file.endsWith(".md")).sort();
  const entries: { slug: string; meta: ContentMeta; doc: RenderedDoc }[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const { meta, body } = parseFrontmatter(await readFile(join(SITE, options.dir, file), "utf8"));
    entries.push({ slug, meta, doc: renderMarkdown(body, href => href) });
  }
  entries.sort((a, b) => options.sortBy === "date"
    ? (b.meta.date ?? "").localeCompare(a.meta.date ?? "") || (a.meta.order ?? "9").localeCompare(b.meta.order ?? "9")
    : (a.meta.order ?? "9").localeCompare(b.meta.order ?? "9"));

  const rail = (current: string) =>
    `<aside class="docs-rail"><nav class="docs-nav" aria-label="${options.railTitle}"><a class="docs-home" href="/${options.dir}/"${current === "index" ? ' aria-current="page"' : ""}>${options.railTitle}</a><ul>${entries.map(entry =>
      `<li><a href="/${options.dir}/${entry.slug}/"${entry.slug === current ? ' aria-current="page"' : ""}>${escapeHtml(entry.doc.title)}</a></li>`).join("")}</ul></nav></aside>`;

  for (const entry of entries) {
    const dateBlock = entry.meta.date ? `<p class="post-meta"><time datetime="${entry.meta.date}">${entry.meta.date}</time></p>` : "";
    await emitDocPage({
      page: options.page, path: `/${options.dir}/${entry.slug}/`,
      title: `${entry.doc.title} — ALGAL`,
      description: entry.meta.description ?? entry.doc.description,
      ogTitle: entry.doc.title, ogAlt: entry.doc.title,
      ...(options.dir === "blog" && entry.meta.date ? { article: { published: entry.meta.date } } : {}),
    }, `<div class="docs-layout">${rail(entry.slug)}<article class="docs-article prose">${dateBlock}${entry.doc.html}</article></div>`);
    contentSectionUrls.push(`/${options.dir}/${entry.slug}/`);
  }

  const cards = entries.map(entry =>
    `<li><a href="/${options.dir}/${entry.slug}/"><strong>${escapeHtml(entry.doc.title)}</strong><span>${escapeHtml(entry.meta.description ?? entry.doc.description)}</span></a></li>`).join("");
  await emitDocPage({
    page: options.page, path: `/${options.dir}/`,
    title: options.indexMeta.title, description: options.indexMeta.description,
    ogTitle: options.indexMeta.ogTitle, ogAlt: options.indexMeta.ogAlt,
  }, `<section class="page-intro"><p class="eyebrow">${options.indexIntro.eyebrow}</p><h1>${options.indexIntro.heading}</h1><p class="lede">${options.indexIntro.lede}</p></section><div class="docs-layout">${rail("index")}<div class="docs-article docs-index"><ul class="docs-list docs-list-wide">${cards}</ul></div></div>`);
  contentSectionUrls.push(`/${options.dir}/`);
}

await emitMarkdownSection({
  dir: "compare", page: "compare", railTitle: "Comparisons", sortBy: "order",
  indexIntro: { eyebrow: "Comparisons", heading: "Same questions, different machinery.", lede: "ALGAL shares surface area with agent frameworks and durable-execution engines — and is a different object underneath. These pages are honest about where the line sits." },
  indexMeta: { title: "Compare ALGAL — agent frameworks, optimizers, durable execution", description: "How ALGAL — a language and VM where programs are typed, content-addressed data — compares to LangGraph, DSPy, and Temporal.", ogTitle: "Compare ALGAL", ogAlt: "ALGAL comparisons" },
});
await emitMarkdownSection({
  dir: "blog", page: "blog", railTitle: "Posts", sortBy: "date",
  indexIntro: { eyebrow: "Blog", heading: "Notes on living programs.", lede: "Deep dives into what ALGAL is, the research it sits next to, and why the machinery is shaped the way it is." },
  indexMeta: { title: "ALGAL blog — notes on living programs", description: "Deep dives into the ALGAL language and VM: self-evolving software, replay-verified receipts, durable waits, and the research landscape around them.", ogTitle: "ALGAL blog", ogAlt: "Notes on living programs" },
});

// Generated sitemap covers every emitted page.
const sitemapUrls = ["/", "/tour/", "/use-cases/", "/living/", "/workbench/", "/docs/", ...DOC_SLUGS.map(slug => `/docs/${slug}/`), ...SPEC_SLUGS.map(slug => `/docs/spec/${slug}/`), ...contentSectionUrls];
await writeFile(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(url => `  <url><loc>https://algal.computer${url}</loc></url>`).join("\n")}\n</urlset>\n`);

console.log(`site built → ${DIST} (${manifests.size + 1} structural diagrams, ${childViews.length + 1} focused views, ${verifiedRuns} replay-checked executions, 1 checked authoring error, ${pages.length + DOC_SLUGS.length + SPEC_SLUGS.length + contentSectionUrls.length + 1} pages)`);
