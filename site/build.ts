// Static site build. Program source, limits, and diagrams come from executable
// examples so the public demonstration cannot drift into illustrative syntax.
// Interactive diagram viewers consume algal.diagram-view.v1 documents emitted
// alongside each SVG — the same layout pass drives both.
import { homeTourHtml } from "./launch/render";
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
import { renderStatusPageHtml } from "@hraness/design-kit";
import { highlightCode } from "@hraness/design-kit/syntax-highlighting";
import { pageDocument, type SitePageMeta } from "./chrome";
import { ADOPTION_BOUNDARY, CIVILIZATION_EXAMPLE, INSTALL_TERMINAL, SITE_DESCRIPTION, SITE_NAME, productMessaging } from "./copy";
import { renderInstallScript } from "./install-script";
import { renderPlatformBadges, renderPlatformInstall } from "./platform-install";
import { renderMarkdown, type LinkRewriter, type RenderedDoc } from "./markdown";
import { highlightAlgal } from "./highlight";
import { buildSurfaceFixture } from "../examples/malleable-site/host";
import { buildWorkbenchFixture } from "../examples/malleable-site/workbench-fixture";
import { parseProposal } from "../examples/malleable-site/surface";
import { renderSurfaceHtml } from "./living-render";
import { offlineWorkerSource } from "./grow-offline";
import { docsNavigation } from "./docs-navigation";
import { breadcrumbJsonLd } from "@hraness/web-discovery";
import { BLOG_PATH, BLOG_DESCRIPTION, BLOG_TITLE, blogAtomFeed, blogIndexJsonLd, blogLlmsList, blogSitemapEntries, loadBlogPosts, postJsonLd, renderBlogIndex, renderPostArticle } from "./blog";
import { postSocialImage, postSocialPage, renderSocialImage, SITE_SOCIAL_IMAGE } from "./social-image";

const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(SITE);
const DIST = join(SITE, "dist");

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
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
          <div class="diagram-frame" data-diagram-view="/diagrams/route-${run.choice}.view.json"><div class="route-diagram-scroll" tabindex="0" role="region" aria-label="${run.title} execution graph, scroll horizontally on small screens"><img src="/diagrams/route-${run.choice}.svg" alt="Source-derived routing graph for the recorded ${run.choice} decision. ${run.receipt.work.agentCalls} executor ${run.receipt.work.agentCalls === 1 ? "attempt" : "attempts"} completed; ${run.skipped} inactive draft ${run.skipped === 1 ? "branch was" : "branches were"} skipped. All exact cells remain visible." width="1200" height="1050" loading="lazy"></div></div>
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
if (authoringReport.source !== "helpers/draft.algal" || authoringReport.span?.start.line !== 4
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

// --- Hero proof panel -------------------------------------------------------
// The hero leads with the language itself. A chooser steps through example
// programs; each selection shows the source (or manifest excerpt) beside the
// facts of one recorded, replay-checked run. The graphs stay one link away.
const heroReceiptCard = (manifest: OrganismManifest, receipt: RunReceipt) => {
  const outputs = Object.entries(manifest.interface?.outputs ?? {}).map(([name, endpoint]) => {
    const value = receipt.cells[endpoint.cell]?.outputs?.[endpoint.port];
    if (value === undefined) throw new Error(`Hero example is missing its ${name} output`);
    return [name, value] as const;
  });
  if (outputs.length === 0) throw new Error("Hero examples need an output to show");
  const result = outputs.length === 1 ? outputs[0]![1] : Object.fromEntries(outputs);
  const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
  if (Buffer.byteLength(text, "utf8") > 4096) throw new Error("Hero example output exceeds 4 KiB");
  const output = highlightCode(text, typeof result === "string" ? "text" : "json", { styles: "classes" });
  return {
    output,
    evidenceRows: [
      ["model calls", `${receipt.work.agentCalls}`],
      ["result", receipt.outcome],
    ] as [string, string][],
  };
};

const habitatManifest = manifests.get("habitat")!;
const habitatReceipt = evolutionRuns.get("habitat")!;
const habitatManifestExcerpt = JSON.stringify(manifestToJson(habitatManifest), null, 2).split("\n").slice(0, 20).join("\n");

interface HeroExample {
  key: string; file: string; blurb: string;
  graphHref: string; sourceHref: string; evidenceHref: string;
  codeName: string; codeHtml: string; codeLanguage: "algal" | "json";
  output: ReturnType<typeof highlightCode>; evidenceRows: [string, string][];
}

const routeHelp = routeRuns.find(run => run.choice === "help")!;

const heroExamples: HeroExample[] = [
  {
    key: "route", file: "route.algal", blurb: "one decision picks one of three branches",
    graphHref: "/diagrams/route-help.svg",
    sourceHref: "/examples/route.algal", evidenceHref: "/receipts/route-help.receipt.json",
    codeName: "route.algal", codeHtml: highlightAlgal(routeSource.trimEnd()), codeLanguage: "algal",
    ...heroReceiptCard(route.manifest, routeHelp.receipt),
  },
  {
    key: "reply", file: "reply.algal", blurb: "classify the email, then draft",
    graphHref: "/diagrams/reply-run.svg",
    sourceHref: "/examples/reply.algal", evidenceHref: "/receipts/reply.receipt.json",
    codeName: "reply.algal", codeHtml: highlightAlgal(replySource.trimEnd()), codeLanguage: "algal",
    ...heroReceiptCard(reply.manifest, replyReceipt),
  },
  {
    key: "inbox", file: "inbox.algal", blurb: "reuse one helper across an inbox",
    graphHref: "/diagrams/inbox.svg",
    sourceHref: "/examples/projects/inbox/inbox.algal", evidenceHref: "/receipts/inbox.receipt.json",
    codeName: "inbox.algal", codeHtml: highlightAlgal(inbox.source.trimEnd()), codeLanguage: "algal",
    ...heroReceiptCard(inbox.manifest, fullInbox.receipt),
  },
  {
    key: "habitat", file: "habitat.algal.json", blurb: "a program writes and runs a program",
    graphHref: "/diagrams/habitat.svg",
    sourceHref: "/examples/habitat.algal.json", evidenceHref: "/receipts/habitat.receipt.json",
    codeName: "habitat.algal.json · first 20 lines of the manifest", codeHtml: highlightCode(habitatManifestExcerpt, "json", { styles: "classes" }).html, codeLanguage: "json",
    ...heroReceiptCard(habitatManifest, habitatReceipt),
  },
];

const HERO_CHOOSER = `<div class="hero-chooser" role="group" aria-label="Choose an example program">${heroExamples.map((example, index) =>
  `<button type="button" class="hero-choose" data-hero-choose="${example.key}" aria-pressed="${index === 0}"><span class="hc-file">${escapeHtml(example.file).replaceAll(".", "<wbr>.")}</span><span class="hc-blurb">${escapeHtml(example.blurb)}</span></button>`).join("")}</div>`;

const heroIcon = (name: "arrow-up-right" | "download") => `<svg class="site-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><use href="/icons.svg#${name}"></use></svg>`;
const HERO_STAGE = `<div class="hero-stage" data-hero-stage>${heroExamples.map((example, index) => `
  <div class="hs-set" data-example-set="${example.key}"${index === 0 ? "" : " hidden"}>
    <figure class="hs-code">
      <figcaption class="hs-bar"><span class="file-label">${escapeHtml(example.codeName)}</span><a href="${example.sourceHref}" download>Source ${heroIcon("download")}</a></figcaption>
      <pre class="hs-pre" tabindex="0" aria-label="${escapeHtml(example.file)} source"><code class="syntax-code language-${example.codeLanguage}" data-language="${example.codeLanguage}">${example.codeHtml}</code></pre>
    </figure>
    <figure class="hs-evidence">
      <figcaption class="hs-bar"><span class="file-label">Result · scripted model answers</span></figcaption>
      <pre class="hs-output" tabindex="0"><code class="${example.output.className}" data-language="${example.output.language}">${example.output.html}</code></pre>
      <dl class="hs-dl">${example.evidenceRows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>
      <p class="hs-links"><a href="${example.evidenceHref}" download>Run record ${heroIcon("download")}</a><a href="${example.graphHref}" target="_blank" rel="noopener">Program graph ${heroIcon("arrow-up-right")}</a></p>
    </figure>
  </div>`).join("")}</div>`;

// Presentation keeps the site's line break and emphasis without copying words.
function marketingHeading(heading: string, breakAfter: number): string {
  const words = heading.split(" ");
  const boundary = Math.min(breakAfter, words.length);
  return `${escapeHtml(words.slice(0, boundary).join(" "))}<br><em>${escapeHtml(words.slice(boundary).join(" "))}</em>`;
}
const headingBreaks: Record<string, number> = {
  "home-draft": 3, "home-process": 4, "home-host": 5, "home-replay": 2,
  "home-evolution": 3, "home-install": 3, "home-research": 3, "home-limits": 2,
};

const replacements: Record<string, string> = {
  HERO_CHOOSER: HERO_CHOOSER,
  HOME_TOUR: homeTourHtml(),
  HERO_STAGE: HERO_STAGE,
  REPLY_SOURCE: highlightAlgal(replySource.trimEnd()),
  REPLY_MAX_AGENT_CALLS: String(reply.manifest.budgets.maxAgentCalls),
  REPLY_RECEIPT_SHORT: escapeHtml(replyReceipt.digest.slice(0, 23)),
  INBOX_SOURCE: highlightAlgal(inbox.source.trimEnd()),
  DRAFT_SOURCE: highlightAlgal(draftSource.trimEnd()),
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
  ROUTE_SOURCE: highlightAlgal(routeSource.trimEnd()),
  ROUTE_PANELS: routePanels,
  ADOPTION_BOUNDARY,
  INSTALL_TERMINAL,
  PLATFORM_INSTALL: renderPlatformInstall(),
  PLATFORM_BADGES: renderPlatformBadges(),
  CIVILIZATION_EXAMPLE,
  SITE_DESCRIPTION: escapeHtml(SITE_DESCRIPTION),
  SITE_HERO_HEADING: marketingHeading(productMessaging.hero.heading, 5),
  SITE_HERO_SUMMARY: escapeHtml(productMessaging.hero.summary),
  SITE_PRIMARY_ACTION: escapeHtml(productMessaging.hero.primaryAction),
  SITE_SECONDARY_ACTION: escapeHtml(productMessaging.hero.secondaryAction),
  SITE_CATEGORY: escapeHtml(productMessaging.category),
  ...Object.fromEntries(Object.entries(productMessaging.headings).map(([key, value]) =>
    [`HEADING_${key.replaceAll("-", "_").toUpperCase()}`, headingBreaks[key] === undefined ? escapeHtml(value) : marketingHeading(value, headingBreaks[key])])),
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
  { file: "pages/tasks.html", out: "tasks/index.html", meta: {
    page: "tasks", path: "/tasks/", title: "Tasks in your browser · ALGAL",
    description: "Keep tasks and drafts in your browser, change their sorting and grouping, and add categories without losing existing task data.",
    ogTitle: "Tasks in your browser · ALGAL",
  } },
  { file: "pages/grow.html", out: "grow/index.html", meta: {
    page: "grow", path: "/grow/", title: "Evolve a component in your browser · ALGAL",
    description: "Change a component’s content and layout with local rules, inspect each proposal, and save its history in your browser. WebGPU AI is optional.",
    ogTitle: "Evolve a component in your browser · ALGAL",
  } },
  { file: "pages/workbench.html", out: "workbench/index.html", meta: {
    page: "workbench", path: "/workbench/", title: "Why this? · ALGAL workbench",
    description: "Follow a running ALGAL component to its revision, signals, history and execution evidence.",
    ogTitle: "Why this? · ALGAL workbench",
  } },
  {
    file: "pages/living.html", out: "living/index.html",
    meta: {
      page: "living", path: "/living/",
      title: "Software you can reshape · ALGAL",
      description: "Edit a living marketing component, explore its signals, and preview a new revision. The same ALGAL expression program drives its content in the browser and native runtime.",
      ogTitle: "Software you can reshape · ALGAL",
    },
  },
  {
    file: "pages/home.html", out: "index.html",
    meta: {
      page: "home", path: "/",
      title: `${SITE_NAME} · ${productMessaging.hero.heading.replace(/\.$/u, "")}`,
      description: SITE_DESCRIPTION,
      ogTitle: `${SITE_NAME} · ${productMessaging.hero.heading.replace(/\.$/u, "")}`,
    },
  },
  {
    file: "pages/tour.html", out: "tour/index.html",
    meta: {
      page: "tour", path: "/tour/",
      title: "Inside a living program · ALGAL tour",
      description: "Explore ALGAL programs from the repository as interactive diagrams, with recorded runs that the site build replay-checked. Their model answers are scripted.",
      ogTitle: "Inside a living program · ALGAL tour",
    },
  },
  {
    file: "pages/use-cases.html", out: "use-cases/index.html",
    meta: {
      page: "use-cases", path: "/use-cases/",
      title: "Put living programs to work · ALGAL use cases",
      description: "Use ALGAL when a model's work must wait for your approval, survive a restart without redoing finished work, or leave a history others can verify offline.",
      ogTitle: "Put living programs to work · ALGAL use cases",
    },
  },
];

// --- Documentation mirror -------------------------------------------------
// The repository's docs/ and spec/v1/ markdown is the single source of truth;
// the site renders the same files so nothing is maintained twice. Internal
// working notes (dated reviews, pilot data, improvement ledgers) stay in the
// repo and are not mirrored.

const DOC_GROUPS: { title: string; pages: string[] }[] = [
  { title: "Start here", pages: ["native-release", "native-workbench", "source-language", "scaling-programs", "library", "scale-measurements", "vm"] },
  { title: "Vision", pages: ["vision", "lineage", "why-unique"] },
  { title: "Concepts", pages: ["algal-design", "design", "agent-loop-and-organism", "programmable-applications", "application-host-adapters", "executors", "model-router", "diagrams", "repair", "program-database"] },
  { title: "Life and selection", pages: ["habitats", "civilization", "cumulative-skill-experiment"] },
  { title: "Applications and workflows", pages: ["use-cases", "when-algal-wins", "browser-grow", "browser-tasks", "browser-inference", "malleable-site", "malleable-workbench", "local-triage", "adaptive-inventory", "agent-tool", "coding-harness", "coding-operations", "pr-shepherd"] },
];
const DOC_SLUGS = DOC_GROUPS.flatMap(group => group.pages);
const SPEC_SLUGS = ["organism", "expr", "foundry", "search", "bench", "mailbox", "process", "process-evidence", "process-journal", "application", "coding-job", "coding-job-v2", "coding-operation", "replay", "vendor"];
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
  const title = current === "index" ? "Overview" : titles.get(current.startsWith("spec/") ? current : `docs/${current}`) ?? current;
  return docsNavigation("Documentation", title, `<a class="docs-home" href="/docs/"${current === "index" ? ' aria-current="page"' : ""}>Documentation</a>${groups}${spec}`);
}

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, "diagrams"), { recursive: true });
await mkdir(join(DIST, "examples"), { recursive: true });
await mkdir(join(DIST, "receipts"), { recursive: true });
await mkdir(join(DIST, "living"), { recursive: true });
await mkdir(join(DIST, "grow"), { recursive: true });
await cp(join(SITE, "grow.css"), join(DIST, "grow.css"));
// The launch film and its social cuts, served at /launch/ (see site/launch/film.ts).
await cp(join(SITE, "launch/film"), join(DIST, "launch"), { recursive: true });
await mkdir(join(DIST, "tasks"), { recursive: true });
await cp(join(SITE, "tasks.css"), join(DIST, "tasks.css"));
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
await cp(join(ROOT, "examples/malleable-site/model-cost-evidence.json"), join(DIST, "workbench/model-cost-evidence.json"));
for (const f of ["robots.txt", "favicon.svg", "favicon-48.png", "apple-touch-icon.png", "algal-mark.svg"]) {
  await cp(join(SITE, f), join(DIST, f));
}
// Blog posts joined to their review records; see site/blog.ts.
const blogPosts = await loadBlogPosts(join(SITE, "blog"));
// Share images come only from the site declaration in site/social-image.ts.
await writeFile(join(DIST, SITE_SOCIAL_IMAGE.path), await renderSocialImage());
await mkdir(join(DIST, "og/blog"), { recursive: true });
for (const post of blogPosts) {
  if (post.emit) await writeFile(join(DIST, postSocialImage(post).path), await renderSocialImage(postSocialPage(post)));
}
// llms.txt leads with the same description as the home page metadata.
const llms = (await readFile(join(SITE, "llms.txt"), "utf8")).replaceAll("{{SITE_DESCRIPTION}}", SITE_DESCRIPTION)
  .replaceAll("{{BLOG_POSTS}}", blogLlmsList(blogPosts));
if (/\{\{[A-Z_]+\}\}/.test(llms)) throw new Error("Unresolved site build placeholder in llms.txt");
await writeFile(join(DIST, "llms.txt"), llms);
// `curl -fsSL https://algal.computer/install.sh | sh` installs the release
// named by site/published-release.json.
await writeFile(join(DIST, "install.sh"), await renderInstallScript(SITE));
// Shared presentation and iconography are build-time dependencies only. The
// shipped site has self-hosted fonts/assets; the CLI gains no browser runtime.
const styles = await buildSiteStyles(DIST);
const browserScripts = await Bun.build({
  entrypoints: [join(SITE, "appearance.ts"), join(SITE, "client.ts"), join(SITE, "viewer.ts")], outdir: DIST,
  target: "browser", format: "iife", minify: true,
  naming: { entry: "[name].js", asset: "assets/[name]-[hash].[ext]" },
});
const surfaceModule = await Bun.build({
  entrypoints: [join(SITE, "living.ts"), join(SITE, "workbench.ts"), join(SITE, "grow.ts"), join(SITE, "tasks.ts")], outdir: DIST,
  target: "browser", format: "esm", minify: true,
  naming: { entry: "[name].js" },
});
// A worker's bootstrap URL needs its own match within the /grow/ service-worker
// scope. Keeping it optional still avoids loading the inference bundle on visit.
const inferenceWorker = await Bun.build({
  entrypoints: [join(SITE, "browser-inference-worker.ts")], outdir: join(DIST, "grow"),
  target: "browser", format: "esm", minify: true,
  // WebLLM's unused Node branches reference __dirname. Do not embed the build
  // machine's absolute path in the browser worker or its offline cache version.
  define: { __dirname: JSON.stringify("/") },
  naming: { entry: "[name].js" },
});
if (!styles.success || !browserScripts.success || !surfaceModule.success || !inferenceWorker.success) throw new AggregateError([...styles.logs, ...browserScripts.logs, ...surfaceModule.logs, ...inferenceWorker.logs], "Site asset build failed");
await writeFile(join(DIST, "icons.svg"), renderIconSprite());
await mkdir(join(DIST, "licenses"), { recursive: true });
await cp(join(SITE, "licenses/hugeicons-MIT.txt"), join(DIST, "licenses/hugeicons-MIT.txt"));
await cp(join(SITE, "licenses/hugeicons-provenance.md"), join(DIST, "licenses/hugeicons-provenance.md"));
for (const [source, target] of [
  ["@mlc-ai/web-llm/LICENSE", "web-llm-Apache-2.0.txt"],
  ["loglevel/LICENSE-MIT", "loglevel-MIT.txt"],
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
// Page names by path, for the 404 page's "Did you mean" suggestion. The
// shared status page takes labels of at most 48 characters.
const routeLabels = new Map<string, string>();
function routeLabel(path: string, title: string): string {
  if (path === "/") return "Home";
  // Drop the brand segment ("· ALGAL spec"); keep titles that are only a brand phrase.
  const name = title.split(" · ").filter(part => !/^ALGAL\b/.test(part)).join(" · ") || title;
  if (name.length <= 48) return name;
  const cut = name.slice(0, 47);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 24 ? cut.lastIndexOf(" ") : 47).replace(/[\s·,]+$/u, "")}…`;
}
for (const { file, out, meta } of pages) {
  routeLabels.set(meta.path, routeLabel(meta.path, meta.ogTitle));
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
  routeLabels.set(meta.path, routeLabel(meta.path, meta.ogTitle));
  let document = pageDocument(meta, `<main id="main" class="hraness-marketing-page docs-page">${body}</main>`);
  for (const [key, value] of Object.entries(replacements)) document = document.replaceAll(`{{${key}}}`, value);
  if (/\{\{[A-Z_]+\}\}/.test(document)) throw new Error(`Unresolved site build placeholder in ${meta.path}`);
  const target = join(DIST, meta.path, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, document);
};

const docsSource = (kind: "docs" | "spec", slug: string) =>
  `<footer class="docs-source"><p>Mirrored from <a href="${GITHUB_BLOB(kind === "docs" ? `docs/${slug}.md` : `spec/v1/${slug}.md`)}">${kind === "docs" ? `docs/${slug}.md` : `spec/v1/${slug}.md`}</a>. The repository copy is the source of truth.</p></footer>`;

const SITE_ORIGIN = "https://algal.computer";
/** BreadcrumbList for a page one level below a section index. */
const sectionBreadcrumb = (section: { name: string; path: `/${string}` }, name: string, path: `/${string}`) =>
  breadcrumbJsonLd(SITE_ORIGIN, [section, { name, path }]);

/** Readable page names for spec files whose H1 is only a schema identifier.
 * The H1 and the spec file stay as written; only <title> and og:title change. */
const SPEC_PAGE_NAMES: Readonly<Record<string, string>> = {
  organism: "Program manifest format (algal.organism.v1)",
  expr: "Expression language (algal.expr.v1)",
  foundry: "Selecting programs by evidence (algal.foundry.v1)",
  search: "Searching program variants (algal.search.v1)",
  bench: "Comparing systems on one workload (algal.bench.v1)",
  process: "Durable processes (algal.process.v1)",
  "process-evidence": "Portable process evidence (algal.process-evidence.v1)",
  replay: "Replay comparison and ordering reports",
  vendor: "Vendoring programs from a catalog",
};

/** Page title for a mirrored file: name the brand once. */
const mirroredTitle = (title: string, section: "docs" | "spec") =>
  /\bALGAL\b/.test(title) ? `${title} · ${section === "docs" ? "Docs" : "Spec"}` : `${title} · ALGAL ${section}`;

for (const [slug, doc] of docRenderers) {
  await emitDocPage({
    page: "docs", path: `/docs/${slug}/`,
    title: mirroredTitle(doc.title, "docs"),
    description: doc.description || `${doc.title}, from the ALGAL documentation.`,
    ogTitle: doc.title,
    jsonLd: [sectionBreadcrumb({ name: "Docs", path: "/docs/" }, doc.title, `/docs/${slug}/`)],
  }, `<div class="docs-layout">${docsRail(slug, docTitles)}<article class="docs-article prose">${doc.html}${docsSource("docs", slug)}</article></div>`);
}
for (const [slug, doc] of specRenderers) {
  const name = SPEC_PAGE_NAMES[slug];
  const title = name ? `${name} · ALGAL spec` : mirroredTitle(doc.title, "spec");
  await emitDocPage({
    page: "spec", path: `/docs/spec/${slug}/`,
    title,
    description: doc.description || `${doc.title}, from the ALGAL contract specification.`,
    ogTitle: title,
    jsonLd: [sectionBreadcrumb({ name: "Docs", path: "/docs/" }, name ?? doc.title, `/docs/spec/${slug}/`)],
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
  description: "Install and run the ALGAL VM, write programs in .algal source, and read the v1 contract specification. These pages render the repository's own Markdown.",
  ogTitle: "ALGAL documentation",
}, `<section class="page-intro"><p class="eyebrow">Documentation</p><h1>The reference shelf.</h1><p class="lede">Install the VM, write programs in <code>.algal</code> source, and read the v1 specification. Each page renders the Markdown in the repository's <code>docs/</code> and <code>spec/v1/</code> folders; dated reviews, pilot results, and research notes stay on GitHub.</p></section><div class="docs-layout">${docsRail("index", docTitles)}<div class="docs-article docs-index"><div class="docs-index-groups">${indexGroups}${indexSpec}</div></div></div>`);

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

// Durable-agent options that overlap less with ALGAL than the full comparison
// pages. Recheck both descriptions against the linked docs when editing.
const COMPARE_OTHER_OPTIONS = `<section class="docs-index-group docs-index-more prose"><h2>Other durable-agent options</h2><ul>`
  + `<li><strong><a href="https://vercel.com/docs/workflows">Vercel Workflows</a></strong>: durable JavaScript, TypeScript, or Python functions on Vercel. Runs sleep or wait on hooks for external events such as approvals, resume after crashes and deployments, and keep their state in Vercel's managed persistence. Billing counts events, data written, and data retained. A good fit for an app already on Vercel.</li>`
  + `<li><strong><a href="https://docs.dbos.dev/integrations/pydantic-ai">Pydantic AI with DBOS</a></strong>: a Python agent whose model and MCP calls DBOS checkpoints to a database from inside your process, SQLite to start and Postgres in production, so the run resumes after a restart. A good fit for Python agents next to an existing database.</li>`
  + `</ul><p>ALGAL differs from both as it does from Temporal: the program is typed data, and each run leaves a receipt that verifies offline. Checked 2026-09-28.</p></section>`;

async function emitMarkdownSection(options: {
  dir: "compare";
  page: "compare";
  railTitle: string;
  indexIntro: { eyebrow: string; heading: string; lede: string };
  indexMeta: { title: string; description: string; ogTitle: string };
  sortBy: "date" | "order";
  /** Extra HTML rendered below the index list, inside the same column. */
  indexAfter?: string;
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

  const rail = (current: string) => docsNavigation(options.railTitle,
    current === "index" ? "Overview" : entries.find(entry => entry.slug === current)!.doc.title,
    `<a class="docs-home" href="/${options.dir}/"${current === "index" ? ' aria-current="page"' : ""}>${options.railTitle}</a><ul>${entries.map(entry =>
      `<li><a href="/${options.dir}/${entry.slug}/"${entry.slug === current ? ' aria-current="page"' : ""}>${escapeHtml(entry.doc.title)}</a></li>`).join("")}</ul>`);

  for (const entry of entries) {
    const dateBlock = entry.meta.date ? `<p class="post-meta"><time datetime="${entry.meta.date}">${entry.meta.date}</time></p>` : "";
    await emitDocPage({
      page: options.page, path: `/${options.dir}/${entry.slug}/`,
      title: /\bALGAL\b/.test(entry.doc.title) ? entry.doc.title : `${entry.doc.title} · ALGAL`,
      description: entry.meta.description ?? entry.doc.description,
      ogTitle: entry.doc.title,
      jsonLd: [sectionBreadcrumb({ name: options.railTitle, path: `/${options.dir}/` }, entry.doc.title, `/${options.dir}/${entry.slug}/`)],
    }, `<div class="docs-layout">${rail(entry.slug)}<article class="docs-article prose">${dateBlock}${entry.doc.html}</article></div>`);
    contentSectionUrls.push(`/${options.dir}/${entry.slug}/`);
  }

  const cards = entries.map(entry =>
    `<li><a href="/${options.dir}/${entry.slug}/"><strong>${escapeHtml(entry.doc.title)}</strong><span>${escapeHtml(entry.meta.description ?? entry.doc.description)}</span></a></li>`).join("");
  await emitDocPage({
    page: options.page, path: `/${options.dir}/`,
    title: options.indexMeta.title, description: options.indexMeta.description,
    ogTitle: options.indexMeta.ogTitle,
  }, `<section class="page-intro"><p class="eyebrow">${options.indexIntro.eyebrow}</p><h1>${options.indexIntro.heading}</h1><p class="lede">${options.indexIntro.lede}</p></section><div class="docs-layout">${rail("index")}<div class="docs-article docs-index"><ul class="docs-list docs-list-wide">${cards}</ul>${options.indexAfter ?? ""}</div></div>`);
  contentSectionUrls.push(`/${options.dir}/`);
}

await emitMarkdownSection({
  dir: "compare", page: "compare", railTitle: "Comparisons", sortBy: "order",
  indexIntro: { eyebrow: "Comparisons", heading: "How ALGAL compares with other tools", lede: "LangGraph, BAML, DSPy, Temporal, Restate, and Inngest each overlap with part of what ALGAL does. Each page shows where they differ, cites the other project's documentation, and says when to choose it instead." },
  indexMeta: { title: "Compare ALGAL with LangGraph, BAML, Temporal, and more", description: "How ALGAL compares with agent frameworks such as LangGraph and durable execution engines such as Temporal, and when each one is the better choice.", ogTitle: "Compare ALGAL" },
  indexAfter: COMPARE_OTHER_OPTIONS,
});
// --- Blog ------------------------------------------------------------------
// Posts render through the shared article layer. Every post is readable at its
// URL; only indexable posts reach the index, sitemap, feed, and llms.txt. The
// index page is the list itself, so it carries no duplicate rail.
const blogRail = (current: string) => {
  const listed = blogPosts.filter(post => post.indexable || post.slug === current);
  return docsNavigation("Posts",
    blogPosts.find(post => post.slug === current)!.title,
    `<a class="docs-home" href="/blog/">Posts</a><ul>${listed.map(post =>
      `<li><a href="${post.path}"${post.slug === current ? ' aria-current="page"' : ""}>${escapeHtml(post.title)}</a></li>`).join("")}</ul>`);
};
for (const post of blogPosts) {
  if (!post.emit) continue;
  await emitDocPage({
    page: "blog", path: post.path,
    title: /\bALGAL\b/.test(post.title) ? post.title : `${post.title} · ALGAL`,
    description: post.dek,
    ogTitle: post.title,
    socialImage: postSocialImage(post),
    article: { published: post.published, ...(post.updated ? { modified: post.updated } : {}) },
    ...(post.indexable ? {} : { noindex: true }),
    jsonLd: [postJsonLd(post), sectionBreadcrumb({ name: "Blog", path: BLOG_PATH }, post.title, post.path)],
  }, `<div class="docs-layout">${blogRail(post.slug)}<div class="docs-article blog-article">${renderPostArticle(post)}</div></div>`);
}
await emitDocPage({
  page: "blog", path: BLOG_PATH,
  title: `${BLOG_TITLE} · ALGAL blog`, description: BLOG_DESCRIPTION, ogTitle: "ALGAL blog",
  jsonLd: [blogIndexJsonLd(blogPosts)],
}, `<section class="page-intro"><p class="eyebrow">Blog</p><h1>${BLOG_TITLE}.</h1><p class="lede">Longer posts on how ALGAL works, how it is tested, and the design choices behind it.</p></section><div class="docs-index blog-index">${renderBlogIndex(blogPosts)}</div>`);
await writeFile(join(DIST, "blog/feed.xml"), blogAtomFeed(blogPosts));
const blogSitemap = blogSitemapEntries(blogPosts);

// Generated sitemap covers every emitted page.
// Blog entries carry lastmod and list indexable posts only.
const sitemapEntries: { path: string; lastModified?: string }[] = [
  ...["/", "/tour/", "/use-cases/", "/living/", "/grow/", "/tasks/", "/workbench/", "/docs/", ...DOC_SLUGS.map(slug => `/docs/${slug}/`), ...SPEC_SLUGS.map(slug => `/docs/spec/${slug}/`), ...contentSectionUrls].map(path => ({ path })),
  ...blogSitemap,
];
await writeFile(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.map(entry => `  <url><loc>https://algal.computer${entry.path}</loc>${entry.lastModified ? `<lastmod>${entry.lastModified}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`);

// Vercel answers every missing address with 404.html and HTTP 404. The page
// offers the same next step as the home hero and suggests the closest page
// from the sitemap when a link is mistyped.
{
  const statusPage = renderStatusPageHtml({
    siteName: "ALGAL",
    primaryAction: { href: "/#install", label: "Install ALGAL" },
    next: [
      { href: "/tour/", label: "Tour", description: "Explore real ALGAL programs as interactive diagrams with recorded runs." },
      { href: "/docs/", label: "Documentation", description: "Install the VM, write .algal source, and read the v1 specification." },
      { href: "/use-cases/", label: "Use cases", description: "Wait for approval, survive a restart, and keep a history others can verify." },
    ],
    routes: sitemapEntries.map(({ path }) => ({ href: path, label: routeLabels.get(path) ?? path })),
    agentIndexHref: "/llms.txt",
    rootElement: "div",
  });
  let document = pageDocument({
    page: "not-found", path: "/404.html",
    title: "Page not found · ALGAL",
    description: SITE_DESCRIPTION,
    ogTitle: "Page not found · ALGAL",
  }, `<main id="main">${statusPage}</main>`);
  for (const [key, value] of Object.entries(replacements)) document = document.replaceAll(`{{${key}}}`, value);
  if (/\{\{[A-Z_]+\}\}/.test(document)) throw new Error("Unresolved site build placeholder in 404.html");
  await writeFile(join(DIST, "404.html"), document);
}

// Each browser application owns a route and cache namespace. Neither worker
// can prune the other's versions. Only grow offers the optional model bundle.
const offlineAssets = ["styles.css", "living.css", "appearance.js", "client.js", "viewer.js", "icons.svg", "algal-mark.svg", "favicon.svg", "living/algal_expr.wasm"];
for (const path of await readdir(join(DIST, "assets"), { recursive: true })) {
  if ((await Bun.file(join(DIST, "assets", path)).exists())) offlineAssets.push(`assets/${path}`);
}
async function emitOfflineShell(application: "grow" | "tasks", optional: string[] = []): Promise<void> {
  const required: Record<string, string> = {}, extras: Record<string, string> = {};
  const hashAsset = async (path: string) => new Bun.CryptoHasher("sha256").update(await Bun.file(join(DIST, path)).arrayBuffer()).digest("hex");
  for (const path of [`${application}/index.html`, `${application}.css`, `${application}.js`, ...offlineAssets]) {
    required[path === `${application}/index.html` ? `/${application}/` : `/${path}`] = await hashAsset(path);
  }
  for (const path of optional) extras[`/${path}`] = await hashAsset(path);
  await writeFile(join(DIST, application, "sw.js"), offlineWorkerSource(required, extras, { path: `/${application}/`, cachePrefix: `algal-${application}-` }));
}
await emitOfflineShell("grow", ["grow/browser-inference-worker.js"]);
await emitOfflineShell("tasks");

console.log(`site built → ${DIST} (${manifests.size + 1} structural diagrams, ${childViews.length + 1} focused views, ${verifiedRuns} replay-checked executions, 1 checked authoring error, ${pages.length + DOC_SLUGS.length + SPEC_SLUGS.length + contentSectionUrls.length + blogPosts.filter(post => post.emit).length + 2} pages)`);
