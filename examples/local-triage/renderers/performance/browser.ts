/** Bounded actual-browser qualification of the existing embeddable adapter.
 * Supply installed Playwright/Chromium explicitly; this script downloads none. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { DEFAULT_CONFIG, DEFAULT_SIGNALS, makeRevision } from "../../../malleable-site/surface";
import budgets from "./budgets.json";

const [assetsArg, outputArg, playwrightArg, chromiumArg] = process.argv.slice(2);
if (!assetsArg || !outputArg || !playwrightArg || !chromiumArg) throw new Error("Usage: bun browser.ts SITE_DIST FRESH_OUTPUT PLAYWRIGHT_MODULE CHROMIUM_EXECUTABLE");
const assets = resolve(assetsArg), output = resolve(outputArg), hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
await mkdir(output, { recursive: true });
const paths = ["living.js", "living.css", "living/algal_expr.wasm", "living/initial.json"];
const files = await Promise.all(paths.map(async path => { const bytes = await readFile(join(assets, path)); return { path, bytes: bytes.length, gzipBytes: Bun.gzipSync(bytes).length, sha256: hash(bytes) }; }));
const declaration = { contract: "algal.renderer-performance-declaration.v1", declaredAt: new Date().toISOString(), budgets, budgetsSha256: hash(await readFile(new URL("./budgets.json", import.meta.url))), scriptSha256: hash(await readFile(import.meta.path)), files };
await writeFile(join(output, "declaration.json"), JSON.stringify(declaration, null, 2) + "\n", { flag: "wx" });
const revisions = [makeRevision(DEFAULT_CONFIG), makeRevision({ ...DEFAULT_CONFIG, headline: "A component with another retained revision.", layout: "stack" })];
const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/living.css"><title>ALGAL renderer qualification</title>
<div id="host-sentinel" style="color:rgb(12,34,56);padding:7px"><a id="host-route" href="#host-route-kept">Host navigation</a><input id="host-editor" value="Host draft stays intact"></div>
<section id="first" class="living-surface"><h3>Static fallback remains useful</h3><a href="/docs/">Read documentation</a></section>
<section id="second" class="living-surface"><h3>Independent static fallback</h3></section>
<script type="module">
const start=performance.now(),host=document.querySelector('#host-sentinel'),outsideBefore=host.outerHTML,styleOf=()=>{const style=getComputedStyle(host);return ['color','display','padding','font-family','font-size','background-color'].map(name=>style.getPropertyValue(name)).join('|')},styleBefore=styleOf();
const edits=[];new MutationObserver(rows=>edits.push(...rows.map(r=>r.type))).observe(host,{attributes:true,childList:true,subtree:true,characterData:true});
const module=await import('/living.js');await module.loadSurfaceEvaluator();
const revisions=${JSON.stringify(revisions)},signals=${JSON.stringify(DEFAULT_SIGNALS)};
const first=document.querySelector('#first'),second=document.querySelector('#second'),fallback=first.innerHTML;
let firstMount=module.mountSurface(first,revisions[0],signals);const secondMount=module.mountSurface(second,revisions[0],signals),secondText=second.textContent;
await new Promise(requestAnimationFrame);
globalThis.qual={readyMs:performance.now()-start,run(count){const samples=[];const link=first.querySelector('a');link.focus();for(let i=0;i<count;i++){const t=performance.now();firstMount.update(revisions[i%2],signals);samples.push(performance.now()-t);}return {samples,focusKept:document.activeElement===link,secondUnchanged:second.textContent===secondText};},cycles(count){for(let i=0;i<count;i++){firstMount.destroy();if(first.innerHTML!==fallback)throw Error('Fallback changed');firstMount=module.mountSurface(first,revisions[0],signals);}},state(){return {nodes:document.querySelectorAll('*').length,outsideUnchanged:host.outerHTML===outsideBefore,styleUnchanged:styleOf()===styleBefore,outsideMutations:edits.length,route:location.hash,hostDraft:document.querySelector('#host-editor').value,secondUnchanged:second.textContent===secondText};}};
</script>`;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) { const path = new URL(request.url).pathname; if (path === "/") return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }); if (paths.some(item => `/${item}` === path)) return new Response(Bun.file(join(assets, path.slice(1))), { headers: { "cache-control": "no-store" } }); return new Response("Not found", { status: 404 }); } });
const origin = `http://127.0.0.1:${server.port}`;
const { chromium } = await import(resolve(playwrightArg));
const browser = await chromium.launch({ headless: true, executablePath: resolve(chromiumArg), args: ["--disable-background-networking"] });
const samples: number[] = [], pageErrors: string[] = [];
const quantiles = (values: number[]) => ({ count: values.length, min: Math.min(...values), median: [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!, p95: [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!, max: Math.max(...values) });
const checks: { name: string; passed: boolean; observed: unknown; maximum?: number }[] = [];
const check = (name: string, passed: boolean, observed: unknown, maximum?: number) => checks.push({ name, passed, observed, ...(maximum === undefined ? {} : { maximum }) });
let memory: unknown, update: unknown;
try {
  for (let sample = 0; sample < budgets.browser.coldSamples; sample++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage();
    page.on("pageerror", (error: Error) => pageErrors.push(error.message));
    await page.goto(origin); await page.waitForFunction("!!globalThis.qual", undefined, { timeout: 12000 });
    samples.push(await page.evaluate("globalThis.qual.readyMs") as number);
    if (sample === budgets.browser.coldSamples - 1) {
      const cdp = await context.newCDPSession(page);
      await page.evaluate(`globalThis.qual.run(${budgets.browser.warmupSwaps})`);
      await cdp.send("HeapProfiler.collectGarbage");
      const before = await cdp.send("Runtime.getHeapUsage") as { usedSize: number; backingStorageSize?: number }, beforeState = await page.evaluate("globalThis.qual.state()") as { nodes: number };
      await page.locator("#host-route").click();
      const changed = await page.evaluate(`globalThis.qual.run(${budgets.browser.revisionSwaps})`) as { samples: number[]; focusKept: boolean; secondUnchanged: boolean };
      await page.evaluate(`globalThis.qual.cycles(${budgets.browser.mountCycles})`);
      await cdp.send("HeapProfiler.collectGarbage");
      const after = await cdp.send("Runtime.getHeapUsage") as { usedSize: number; backingStorageSize?: number }, afterState = await page.evaluate("globalThis.qual.state()") as { nodes: number; outsideUnchanged: boolean; styleUnchanged: boolean; outsideMutations: number; route: string; hostDraft: string; secondUnchanged: boolean };
      memory = { before, after, jsHeapGrowthBytes: after.usedSize - before.usedSize, domNodeGrowth: afterState.nodes - beforeState.nodes, scope: "Chromium post-GC JavaScript heap and DOM nodes; backing storage reported separately; not whole-browser RSS" };
      update = quantiles(changed.samples);
      check("Synchronous revision update p95", quantiles(changed.samples).p95 <= budgets.browser.updateP95MsMax, update, budgets.browser.updateP95MsMax);
      check("Retained JS heap after 1000 swaps and 100 mount cycles", after.usedSize - before.usedSize <= budgets.browser.retainedJsHeapGrowthBytesMax, memory, budgets.browser.retainedJsHeapGrowthBytesMax);
      check("Retained DOM nodes after mount cycles", afterState.nodes - beforeState.nodes <= budgets.browser.retainedDomNodeGrowthMax, afterState.nodes - beforeState.nodes, budgets.browser.retainedDomNodeGrowthMax);
      check("Independent mounts and focused semantic link survive revisions", changed.focusKept && changed.secondUnchanged && afterState.secondUnchanged, changed);
      check("Host style/router/draft remain unchanged", afterState.outsideUnchanged && afterState.styleUnchanged && afterState.outsideMutations === 0 && afterState.route === "#host-route-kept" && afterState.hostDraft === "Host draft stays intact", afterState, budgets.browser.hostInterferenceCountMax);
      await page.screenshot({ path: join(output, "embed.png") });
    }
    await context.close();
  }
  const startup = quantiles(samples), rawBytes = files.reduce((total, file) => total + file.bytes, 0), gzipBytes = files.reduce((total, file) => total + file.gzipBytes, 0);
  check("Cold interactive readiness p95", startup.p95 <= budgets.browser.interactiveReadyP95MsMax, startup, budgets.browser.interactiveReadyP95MsMax);
  check("Additional raw embed assets", rawBytes <= budgets.browser.additionalRawBytesMax, rawBytes, budgets.browser.additionalRawBytesMax);
  check("Additional gzip embed assets", gzipBytes <= budgets.browser.additionalGzipBytesMax, gzipBytes, budgets.browser.additionalGzipBytesMax);
  check("No browser runtime errors", pageErrors.length === 0, pageErrors);
  const spike = JSON.parse(await readFile(new URL("../../../malleable-site/renderers/measurement.json", import.meta.url), "utf8")) as { artifacts: { webReleaseTotalBytes: number; webRelease: { gzipBytes: number }[] } };
  const report = { contract: "algal.renderer-browser-performance.v1", ok: checks.every(item => item.passed), declaration, browser: await browser.version(), startup, update, memory, checks, dioxusWeb: { rawBytes: spike.artifacts.webReleaseTotalBytes, gzipBytes: spike.artifacts.webRelease.reduce((n, file) => n + file.gzipBytes, 0), decision: "Keep the qualified lightweight embed and Dioxus desktop. The Dioxus Web spike is passive, so its payload is not an interactive apples-to-apples comparison." }, limitations: ["Local cold browser contexts and uncompressed loopback transport; no WAN or device-fleet claim", "Startup starts before module import and ends at the first animation frame after both mounts; static fallback precedes import", "Update timings cover synchronous VM evaluation and DOM patching, not complete paint latency", "Heap qualification is post-GC JavaScript retention; it is not a proof of total native/WASM memory behavior", "Measured host interference covers the sentinel, outside draft, route and independent mount in the declared harness"] };
  await writeFile(join(output, "result.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ ok: report.ok, report: join(output, "result.json"), checks: checks.map(({ name, passed, maximum }) => ({ name, passed, maximum })), startup, update, memory, rawBytes, gzipBytes }));
  if (!report.ok) process.exitCode = 1;
} finally { await browser.close(); server.stop(true); }
