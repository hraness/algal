/* global process, console, URL, crypto, document, innerWidth, Response, HTMLElement, Worker, navigator, MessageChannel, setTimeout, clearTimeout */
// Optional real-browser qualification. Supply an installed playwright-core
// module and Chromium executable; neither is a required ALGAL dependency.
import { build, file, serve } from "bun";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const repository = resolve(import.meta.dirname, "..");
const output = resolve(process.env.ALGAL_BROWSER_EVIDENCE ?? "/tmp/algal-browser-qualification");
const modulePath = process.env.ALGAL_PLAYWRIGHT_MODULE;
const executablePath = process.env.ALGAL_BROWSER_EXECUTABLE;
if (!modulePath || !executablePath) throw new Error("Set ALGAL_PLAYWRIGHT_MODULE and ALGAL_BROWSER_EXECUTABLE to installed tools");
await mkdir(output, { recursive: true });
const fixture = await build({ entrypoints: [join(repository, "tests/browser-grow-storage.ts")], target: "browser", format: "esm", minify: true });
if (!fixture.success) throw new AggregateError(fixture.logs, "Browser conformance bundle failed");
const server = serve({ hostname: "127.0.0.1", port: Number(process.env.ALGAL_BROWSER_PORT ?? 0), async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/test/browser-fixture.js") return new Response(await fixture.outputs[0].text(), { headers: { "content-type": "text/javascript" } });
  if (path === "/test/") return new Response("<!doctype html><title>ALGAL browser conformance</title>", { headers: { "content-type": "text/html" } });
  const source = resolve(repository, "site/dist", `.${path.endsWith("/") ? `${path}index.html` : path}`);
  if (!source.startsWith(join(repository, "site/dist") + "/")) return new Response("Not found", { status: 404 });
  const asset = file(source);
  return await asset.exists() ? new Response(asset) : new Response("Not found", { status: 404 });
} });
const origin = `http://127.0.0.1:${server.port}`;
const { chromium } = await import(pathToFileURL(modulePath).href);
const context = await chromium.launchPersistentContext(join(output, "browser-profile"), { executablePath, headless: process.env.ALGAL_GPU_QUALIFY !== "1", viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
// This is the harness-owned profile. Close its restored clients so an older
// /grow/ worker cannot hold the new shell in waiting; preserve every cache,
// including already-downloaded model artifacts at this exact origin.
for (const restored of context.pages()) await restored.close();
const checks = [], modelSamples = [], errors = [], requests = [], failedRequests = [], badResponses = [], browserLogs = [], networkFailures = [];
const safeUrl = raw => { const url = new URL(raw); return url.origin + url.pathname; };
context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
context.on("page", page => page.on("console", message => { if (message.type() === "error" || message.type() === "warning") browserLogs.push(message.text().slice(0, 1000)); }));
context.on("page", async page => {
  const client = await context.newCDPSession(page).catch(() => null);
  if (!client) return;
  client.on("Network.loadingFailed", event => networkFailures.push({ error: event.errorText, blocked: event.blockedReason, cors: event.corsErrorStatus }));
  await client.send("Network.enable").catch(() => {});
});
context.on("request", request => requests.push({ url: safeUrl(request.url()), method: request.method() }));
context.on("requestfailed", request => failedRequests.push({ url: safeUrl(request.url()), failure: request.failure()?.errorText }));
context.on("response", response => { if (response.status() >= 400) badResponses.push({ url: safeUrl(response.url()), status: response.status() }); });
const page = await context.newPage();
const ready = async () => { await page.locator('#grow-root[data-ready="true"]').waitFor({ timeout: 60_000 }); };
const idle = async () => { await page.waitForFunction(() => document.querySelector("#grow-root")?.getAttribute("aria-busy") === "false", undefined, { timeout: 90_000 }); };
// Bootstrap the actual optional worker without sending Load. The valid Suggest
// request must reach its unloaded-engine guard: no model assets, GPU device or
// inference are requested. Unlike fetch(), Worker construction exercises the
// worker's own service-worker scope selection on an offline restart.
const workerBootstrap = async () => {
  const response = await page.evaluate(() => new Promise((resolve, reject) => {
    const worker = new Worker("/grow/browser-inference-worker.js", { type: "module", name: "algal-offline-bootstrap-check" });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error("Optional worker bootstrap timed out")); }, 30_000);
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    worker.onerror = () => { finish(); reject(new Error("Optional worker entry could not start")); };
    worker.onmessageerror = () => { finish(); reject(new Error("Optional worker bootstrap response was unreadable")); };
    worker.onmessage = event => { finish(); resolve(event.data); };
    worker.postMessage({ id: 1, kind: "suggest", input: {
      config: { headline: "Build an inspectable application.", body: "Explore this preview.", ctaLabel: "Explore the preview", layout: "split" },
      signals: { audience: "builders", release: "preview" },
    } });
  }));
  assert.deepEqual(response, { id: 1, kind: "failed", message: "Local AI failed during loading (runtime-error). Nothing was adopted. Load the model explicitly to try again." }, "Real worker reached the unloaded-model guard");
};
try {
  const workerSource = await file(join(repository, "site/dist/grow/sw.js")).text();
  const versionMatch = /const VERSION = "algal-grow-" \+ "([a-f0-9]{64})";/.exec(workerSource);
  assert.ok(versionMatch, "Built offline worker exposes its content-derived shell version");
  const expectedShellVersion = `algal-grow-${versionMatch[1]}`;
  // Register from outside the controlled scope, with no /grow/ clients open.
  // Wait for this exact build to activate before visiting the application.
  await page.goto(`${origin}/test/`);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register("/grow/sw.js", { scope: "/grow/", updateViaCache: "none" });
    await registration.update();
  });
  await page.waitForFunction(async expected => {
    const registration = await navigator.serviceWorker.getRegistration("/grow/");
    if (!registration?.active || registration.active.state !== "activated") return false;
    const active = registration.active;
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); channel.port2.close(); resolve(false); }, 2_000);
      channel.port1.onmessage = event => {
        clearTimeout(timer); channel.port1.close(); channel.port2.close();
        resolve(event.data?.ready === true && event.data?.version === expected);
      };
      active.postMessage("offline-status", [channel.port2]);
    });
  }, expectedShellVersion, { timeout: 60_000, polling: 250 });
  if (process.env.ALGAL_GPU_ONLY !== "1") {
  const fixturePage = await context.newPage(); await fixturePage.goto(`${origin}/test/`);
  checks.push(...await fixturePage.evaluate(async () => (await import("/test/browser-fixture.js")).storageChecks()));
  await fixturePage.close();

  await page.goto(`${origin}/grow/?workspace=algal-grow-v1-${crypto.randomUUID()}`); await ready();
  assert.equal(await page.locator("#grow-candidate").isVisible(), false);
  await page.locator("#grow-propose").click(); await idle();
  assert.equal(await page.locator("#grow-adopt").isEnabled(), true);
  const initialHead = await page.locator("#grow-head").textContent();
  await page.reload(); await ready();
  assert.equal(await page.locator("#grow-adopt").isEnabled(), true, "Retained proposal survives reload");
  await page.locator("#grow-adopt").click(); await idle();
  const adoptedHead = await page.locator("#grow-head").textContent(); assert.notEqual(adoptedHead, initialHead);
  await page.reload(); await ready(); assert.equal(await page.locator("#grow-head").textContent(), adoptedHead);
  checks.push("UI proposals and adopted application head survive reload");

  await page.locator("#grow-auto").check(); await page.locator("#grow-audience").selectOption("operators");
  await page.locator("#grow-signals button").click(); await idle();
  assert.match(await page.locator("#grow-status").textContent(), /automatically applied/);
  assert.match(await page.locator("#grow-signal-evidence").textContent(), /operators/);
  await page.locator("#grow-pause").click(); await idle(); assert.equal(await page.locator("#grow-propose").isEnabled(), false);
  await page.reload(); await ready(); assert.match(await page.locator("#grow-control-note").textContent(), /paused/);
  await page.locator("#grow-pause").click(); await idle();
  await page.locator("#grow-pin").click(); await idle(); assert.equal(await page.locator("#grow-propose").isEnabled(), false);
  await page.locator("#grow-pin").click(); await idle();
  checks.push("automatic local evolution, durable pause/pin and explicit resume");

  // Hold real Web Locks custody from another tab; the command must wait, then
  // reject its stale expected head after a competing mutation completes.
  const peer = await context.newPage(); await peer.goto(`${origin}/test/`);
  const name = new URL(page.url()).searchParams.get("workspace");
  const fence = await peer.evaluate(async database => {
    const module = await import("/test/browser-fixture.js"); await module.loadSurfaceEvaluator();
    const storage = await module.IndexedDbApplicationStorage.open({ name: database });
    const controller = new module.BrowserGrowController(storage), capture = await controller.capture();
    globalThis.peerWorkspace = { storage, controller, capture };
    return capture.head;
  }, name);
  await page.locator("#grow-signals button").click(); await idle();
  const staleRejected = await peer.evaluate(async head => {
    try { await globalThis.peerWorkspace.controller.signal(head, { kind: "release", value: "available" }); return false; } catch { return true; }
  }, fence);
  assert.equal(staleRejected, true);
  const lockResult = await peer.evaluate(async () => {
    const { storage } = globalThis.peerWorkspace;
    let held, unlock; const acquired = new Promise(resolve => { held = resolve; });
    const latch = new Promise(resolve => { unlock = resolve; });
    const task = storage.custody("browser-grow-controller", false, async () => { held(); await latch; });
    await acquired; globalThis.releaseWorkspaceLock = async () => { unlock(); await task; };
    return true;
  }); assert.equal(lockResult, true);
  await page.locator("#grow-signals button").click();
  await page.waitForTimeout(250); assert.equal(await page.locator("#grow-root").getAttribute("aria-busy"), "true");
  await peer.evaluate(() => globalThis.releaseWorkspaceLock()); await idle();
  await peer.evaluate(() => globalThis.peerWorkspace.storage.close()); await peer.close();
  checks.push("real cross-tab Web Lock custody and stale-head rejection");

  await page.locator("#grow-history-panel summary").click();
  const signalBefore = await page.locator("#grow-signal-evidence").textContent();
  await page.locator("button[data-restore]").first().click(); await idle();
  assert.equal(await page.locator("#grow-signal-evidence").textContent(), signalBefore);
  checks.push("browser restore keeps captured current signals");

  await page.locator("#grow-export").locator("xpath=ancestor::details").locator("summary").click();
  const downloadEvent = page.waitForEvent("download"); await page.locator("#grow-export").click(); await idle();
  const download = await downloadEvent, exportPath = join(output, "workspace.json"); await download.saveAs(exportPath);
  const sourceName = new URL(page.url()).searchParams.get("workspace"), exportHead = await page.locator("#grow-head").textContent();
  await page.locator("#grow-import").setInputFiles(exportPath); await idle();
  assert.notEqual(new URL(page.url()).searchParams.get("workspace"), sourceName);
  assert.equal(await page.locator("#grow-head").textContent(), exportHead);
  checks.push("UI export replay and fresh-database import preserve the captured head");

  await page.waitForFunction(() => document.querySelector("#grow-offline-status")?.getAttribute("data-ready") === "true", undefined, { timeout: 60_000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await workerBootstrap();
  await context.setOffline(true); await page.reload(); await ready();
  await workerBootstrap();
  checks.push("actual optional worker starts online and after network-denied reload without model load or GPU inference");
  assert.equal(await page.locator("#grow-head").textContent(), exportHead);
  await page.locator("#grow-release").selectOption("available"); await page.locator("#grow-signals button").click(); await idle();
  await page.locator("#grow-propose").click(); await idle();
  assert.equal(await page.locator("#grow-adopt").isEnabled(), true);
  await page.locator("#grow-adopt").click(); await idle();
  await page.locator("#grow-offline").locator("xpath=ancestor::details").locator("summary").click();
  await page.locator("#grow-offline").click();
  await page.waitForFunction(() => document.querySelector("#grow-offline-status")?.getAttribute("data-ready") === "true");
  assert.match(await page.locator("#grow-offline-status").textContent(), /saved.*offline use/i);
  checks.push("network-denied reload, local evolution, adoption and cached-shell readiness");
  await context.setOffline(false);

  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); globalThis.scrollTo({ top: 0, behavior: "instant" }); });
  await page.waitForFunction(() => globalThis.scrollY === 0);
  await page.screenshot({ path: join(output, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "No phone horizontal overflow");
  await page.screenshot({ path: join(output, "phone-dark.png"), fullPage: true });
  checks.push("desktop and phone-dark layout snapshots; no phone horizontal overflow");
  } else {
    await page.goto(`${origin}/grow/?workspace=algal-grow-v1-${crypto.randomUUID()}`); await ready();
    await page.waitForFunction(() => document.querySelector("#grow-offline-status")?.getAttribute("data-ready") === "true", undefined, { timeout: 60_000 });
  }

  if (process.env.ALGAL_GPU_QUALIFY === "1") {
    assert.equal(await page.locator("#grow-model-load").isEnabled(), true, await page.locator("#grow-model-status").textContent());
    await page.locator("#grow-audience").selectOption("builders");
    await page.locator("#grow-release").selectOption("preview");
    await page.locator("#grow-signals button").click(); await idle();
    await page.locator("#grow-model-load").click();
    await page.waitForFunction(() => document.querySelector("#grow-model-propose")?.disabled === false || document.querySelector("#grow-status")?.hasAttribute("data-error"), undefined, { timeout: 310_000 });
    assert.equal(await page.locator("#grow-model-propose").isEnabled(), true, await page.locator("#grow-status").textContent());
    await context.setOffline(true);
    await page.locator("#grow-model-propose").click(); await idle();
    assert.equal(await page.locator("#grow-source").textContent(), "Model proposal", await page.locator("#grow-status").textContent());
    modelSamples.push({ phase: "network-denied", view: await page.locator("#grow-candidate-view").textContent(), result: await page.locator("#grow-fit").textContent() });
    checks.push("real WebGPU model load and network-denied structured proposal with independent checks");
    await page.locator("#grow-model-stop").click();
    await page.reload(); await ready();
    await page.locator("#grow-signals button").click(); await idle();
    await page.locator("#grow-model-load").click();
    await page.waitForFunction(() => document.querySelector("#grow-model-propose")?.disabled === false || document.querySelector("#grow-status")?.hasAttribute("data-error"), undefined, { timeout: 310_000 });
    assert.equal(await page.locator("#grow-model-propose").isEnabled(), true, await page.locator("#grow-status").textContent());
    await page.locator("#grow-model-propose").click(); await idle();
    assert.equal(await page.locator("#grow-source").textContent(), "Model proposal");
    modelSamples.push({ phase: "offline-reload", view: await page.locator("#grow-candidate-view").textContent(), result: await page.locator("#grow-fit").textContent() });
    await writeFile(join(output, "model-samples.json"), JSON.stringify(modelSamples, null, 2));
    checks.push("network-denied browser reload, cached model reload and second real WebGPU proposal");
  }
  assert.deepEqual(errors, [], "No uncaught browser errors");
  const remoteRequests = requests.filter(request => !request.url.startsWith(origin));
  if (process.env.ALGAL_GPU_QUALIFY !== "1") assert.deepEqual(remoteRequests, [], "Rule-based application must not send context or download a model");
  await writeFile(join(output, "result.json"), JSON.stringify({ ok: true, browser: context.browser()?.version(), checks, remoteRequests, errors }, null, 2));
  console.log(JSON.stringify({ ok: true, checks, output }));
} catch (error) {
  await writeFile(join(output, "failure.json"), JSON.stringify({ checks, error: String(error), errors, requests, failedRequests, badResponses, browserLogs, networkFailures }, null, 2));
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); globalThis.scrollTo({ top: 0, behavior: "instant" }); }).catch(() => {});
  await page.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally { await context.close(); server.stop(true); }
