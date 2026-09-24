/* global process, console, URL, crypto, document, innerWidth, Response, HTMLElement, navigator, MessageChannel, setTimeout, clearTimeout, CompositionEvent, Event */
// Real browser checks for task facts, separate drafts, workflow migration and
// offline use. Uses an explicitly supplied browser; no model or account needed.
import { build, file, serve } from "bun";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const repository = resolve(import.meta.dirname, "..");
const output = resolve(process.env.ALGAL_BROWSER_EVIDENCE ?? "/tmp/algal-task-qualification");
const modulePath = process.env.ALGAL_PLAYWRIGHT_MODULE, executablePath = process.env.ALGAL_BROWSER_EXECUTABLE;
if (!modulePath || !executablePath) throw new Error("Set ALGAL_PLAYWRIGHT_MODULE and ALGAL_BROWSER_EXECUTABLE to installed tools");
await mkdir(output, { recursive: true });
const fixture = await build({ entrypoints: [join(repository, "tests/browser-triage-storage.ts")], target: "browser", format: "esm", minify: true });
if (!fixture.success) throw new AggregateError(fixture.logs, "Browser task conformance bundle failed");
const server = serve({ hostname: "127.0.0.1", port: Number(process.env.ALGAL_BROWSER_PORT ?? 0), async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/test/browser-fixture.js") return new Response(await fixture.outputs[0].text(), { headers: { "content-type": "text/javascript" } });
  if (path === "/test/") return new Response("<!doctype html><title>ALGAL task conformance</title>", { headers: { "content-type": "text/html" } });
  const source = resolve(repository, "site/dist", `.${path.endsWith("/") ? `${path}index.html` : path}`);
  if (!source.startsWith(join(repository, "site/dist") + "/")) return new Response("Not found", { status: 404 });
  const asset = file(source); return await asset.exists() ? new Response(asset) : new Response("Not found", { status: 404 });
} });
const origin = `http://127.0.0.1:${server.port}`;
const { chromium } = await import(pathToFileURL(modulePath).href);
const context = await chromium.launchPersistentContext(join(output, "browser-profile"), { executablePath, headless: true, viewport: { width: 1440, height: 1080 }, acceptDownloads: true });
for (const restored of context.pages()) await restored.close();
context.setDefaultTimeout(90_000);
const checks = [], errors = [], requests = [], failedRequests = [], browserLogs = [];
const safeUrl = raw => { const url = new URL(raw); return url.origin + url.pathname; };
context.on("page", page => {
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" || message.type() === "warning") browserLogs.push(message.text().slice(0, 1000)); });
});
context.on("request", request => requests.push({ url: safeUrl(request.url()), method: request.method() }));
context.on("requestfailed", request => failedRequests.push({ url: safeUrl(request.url()), error: request.failure()?.errorText }));
const page = await context.newPage();
const ready = async (target = page) => { await target.locator('#tasks-root[data-ready="true"]').waitFor(); await idle(target); };
const idle = async (target = page) => { await target.waitForFunction(() => document.querySelector("#tasks-root")?.getAttribute("aria-busy") === "false", undefined, { timeout: 90_000 }); };
const click = async (selector, target = page) => { await target.locator(selector).click(); await idle(target); assert.equal(await target.locator("#tasks-status").getAttribute("data-error"), null, await target.locator("#tasks-status").textContent()); };
const head = () => page.locator("#tasks-head").textContent();
const rows = () => page.locator("#tasks-list article.tasks-row");
const save = () => click("#tasks-save");
const rebase = async () => { if (await page.locator("#tasks-rebase").isVisible()) await click("#tasks-rebase"); };
const openStorage = async () => { if (await page.locator("#tasks-storage-panel").getAttribute("open") === null) await page.locator("#tasks-storage-panel summary").click(); };
async function add(title) { await page.locator("#tasks-title").fill(title); await click("#tasks-submit"); }
async function categories() {
  await page.locator("#tasks-sort").selectOption("title"); await page.locator("#tasks-group").selectOption("category");
  await page.locator("#tasks-schema").selectOption("2"); await page.locator("#tasks-reopen").selectOption("false");
  assert.equal(await page.locator("#tasks-new").isEnabled(), false, "Unpreviewed workflow choices cannot be lost by switching workspaces");
  await click("#tasks-evaluate"); assert.equal(await page.locator("#tasks-adopt").isEnabled(), true);
}
async function exportTasks(name) {
  await openStorage(); const next = page.waitForEvent("download"); await click("#tasks-export");
  const path = join(output, name); await (await next).saveAs(path); return path;
}
try {
  await page.goto(`${origin}/test/`);
  for (const application of ["grow", "tasks"]) {
    const source = await file(join(repository, `site/dist/${application}/sw.js`)).text();
    const match = new RegExp(`const VERSION = "algal-${application}-" \\+ "([a-f0-9]{64})";`).exec(source);
    assert.ok(match, `${application} cache version is derived from its assets`);
    await page.evaluate(async app => { const registration = await navigator.serviceWorker.register(`/${app}/sw.js`, { scope: `/${app}/`, updateViaCache: "none" }); await registration.update(); }, application);
    await page.waitForFunction(async ({ application, expected }) => {
      const registration = await navigator.serviceWorker.getRegistration(`/${application}/`);
      if (registration?.active?.state !== "activated") return false;
      return new Promise(resolve => {
        const channel = new MessageChannel(), timer = setTimeout(() => { channel.port1.close(); channel.port2.close(); resolve(false); }, 2_000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(event.data?.ready === true && event.data?.version === expected); };
        registration.active.postMessage("offline-status", [channel.port2]);
      });
    }, { application, expected: `algal-${application}-${match[1]}` }, { timeout: 90_000, polling: 250 });
  }
  checks.push("independent task and Grow offline shells activate from this build");
  const fixturePage = await context.newPage(); await fixturePage.goto(`${origin}/test/`);
  checks.push(...await fixturePage.evaluate(async () => (await import("/test/browser-fixture.js")).storageChecks()));
  await fixturePage.close();

  const database = `algal-tasks-v1-${crypto.randomUUID()}`;
  await page.goto(`${origin}/tasks/?workspace=${database}`); await ready();
  await add("Prepare the release"); assert.equal(await rows().count(), 1);
  const taskId = await rows().first().getAttribute("data-task-id"), originalHead = await head();
  await page.locator("#tasks-title").fill("An unfinished thought"); await page.locator("#tasks-priority").selectOption("low");
  await page.locator("#tasks-query").fill("release"); await page.locator("#tasks-filter").selectOption("open"); await save();
  assert.equal(await head(), originalHead, "Draft-only edits leave the application head alone");
  await page.reload(); await ready();
  assert.equal(await page.locator("#tasks-title").inputValue(), "An unfinished thought");
  assert.equal(await page.locator("#tasks-query").inputValue(), "release");
  assert.equal(await page.locator("#tasks-filter").inputValue(), "open");
  checks.push("UI task facts and separate saved draft, query and filter survive reload");

  await categories(); assert.equal(await head(), originalHead);
  await page.reload(); await ready(); assert.equal(await page.locator("#tasks-adopt").isEnabled(), true);
  // Keep a newer, unsaved editor value while the saved proposal is applied.
  await page.locator("#tasks-title").fill("Keep this newer draft");
  await page.locator("#tasks-title").evaluate(node => { globalThis.draftNode = node; node.focus(); node.setSelectionRange(5, 9); });
  await click("#tasks-adopt");
  assert.equal(await page.locator("#tasks-schema-status").textContent(), "v2");
  assert.equal(await rows().first().getAttribute("data-task-id"), taskId);
  assert.match(await rows().first().textContent(), /Prepare the release.*normal.*open.*inbox/s);
  assert.equal(await page.locator("#tasks-title").inputValue(), "Keep this newer draft");
  assert.equal(await page.locator("#tasks-title").evaluate(node => node === globalThis.draftNode), true);
  assert.equal(await page.locator("#tasks-submit").isEnabled(), false);
  await rebase(); assert.equal(await page.locator("#tasks-title").inputValue(), "Keep this newer draft");
  checks.push("saved workflow preview and v1→v2 migration preserve facts and unsaved draft; explicit rebase enables editing");

  await page.locator("#tasks-query").fill(""); await page.locator("#tasks-filter").selectOption("all"); await save();
  await page.locator(`[data-action="edit"][data-task-id="${taskId}"]`).click();
  await page.locator("#tasks-category").fill("work"); await click("#tasks-submit");
  await click(`[data-action="complete"][data-task-id="${taskId}"]`); await rebase();
  assert.equal(await rows().first().getAttribute("data-status"), "done");
  assert.equal(await page.locator(`[data-action="reopen"][data-task-id="${taskId}"]`).isEnabled(), false);
  checks.push("expression-provided fields accept category edits and adopted action policy disables reopening");

  const peer = await context.newPage(); await peer.goto(`${origin}/test/`);
  await peer.evaluate(async database => {
    const module = await import("/test/browser-fixture.js"); await module.loadSurfaceEvaluator();
    const storage = await module.IndexedDbApplicationStorage.open({ name: database });
    const controller = new module.BrowserTriageController(storage);
    globalThis.peerWorkspace = { storage, controller, capture: await controller.capture() };
  }, database);
  await page.locator("#tasks-title").fill("Unsubmitted composing draft");
  assert.equal(await page.locator(`#tasks-list [data-action="edit"][data-task-id="${taskId}"]`).isEnabled(), false, "Editing another task cannot overwrite an unsaved draft");
  await page.locator("#tasks-title").evaluate(node => { globalThis.draftNode = node; node.focus(); node.setSelectionRange(3, 8); node.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })); });
  const beforePeer = await head();
  await peer.evaluate(async () => {
    const { controller, capture } = globalThis.peerWorkspace;
    await controller.act(capture.head, { kind: "add", task: { id: "peer-task", title: "Added by another tab", priority: "high", status: "open", category: "work" } });
  });
  await page.evaluate(() => globalThis.dispatchEvent(new Event("focus")));
  assert.equal(await head(), beforePeer, "A composition defers refresh of the visible application");
  // Some input methods expose their final DOM value before their final input
  // event. The composition handler must read it before reconciling controls.
  await page.locator("#tasks-title").evaluate(node => { node.value = "Completed composition draft"; node.setSelectionRange(3, 8); node.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })); });
  await page.waitForFunction(old => document.querySelector("#tasks-head")?.textContent !== old, beforePeer);
  assert.deepEqual(await page.locator("#tasks-title").evaluate(node => ({ same: node === globalThis.draftNode, text: node.value, start: node.selectionStart, end: node.selectionEnd, focused: document.activeElement === node })), { same: true, text: "Completed composition draft", start: 3, end: 8, focused: true });
  await rebase();
  assert.equal(await peer.evaluate(async () => {
    const { controller, capture } = globalThis.peerWorkspace;
    try { await controller.act(capture.head, { kind: "complete", taskId: "peer-task" }); return false; } catch { return true; }
  }), true);
  checks.push("cross-tab task changes wait for composition and preserve the unsaved editor node, selection and focus; stale heads fail");

  await peer.evaluate(async () => {
    const { controller } = globalThis.peerWorkspace, capture = await controller.capture();
    await controller.saveSession(capture.head, capture.sessionState.reference, { ...capture.session, draft: { ...capture.session.draft, title: "Draft from another tab" } });
  });
  await page.locator("#tasks-title").fill("Keep my conflicting draft"); await click("#tasks-refresh");
  await page.locator("#tasks-draft-conflict").waitFor({ state: "visible" });
  assert.equal(await page.locator("#tasks-draft-conflict").isVisible(), true);
  assert.equal(await page.locator("#tasks-title").inputValue(), "Keep my conflicting draft");
  assert.equal(await page.locator("#tasks-save").isEnabled(), false);
  await click("#tasks-load-draft"); assert.equal(await page.locator("#tasks-title").inputValue(), "Draft from another tab");
  await peer.evaluate(() => globalThis.peerWorkspace.storage.close()); await peer.close();
  checks.push("concurrent saved-draft conflict keeps both versions until explicit replacement");

  const sourceUrl = page.url(), sourceHead = await head(), exported = await exportTasks("tasks-history.json");
  await page.locator("#tasks-title").fill("Do not discard on import");
  assert.equal(await page.locator("#tasks-import").isEnabled(), false); assert.equal(await page.locator("#tasks-new").isEnabled(), false);
  await click("#tasks-discard");
  await page.locator("#tasks-import").setInputFiles(exported); await idle();
  assert.equal(await page.locator("#tasks-status").getAttribute("data-error"), null, await page.locator("#tasks-status").textContent());
  assert.notEqual(new URL(page.url()).searchParams.get("workspace"), database);
  assert.match(new URL(page.url()).searchParams.get("application"), /^tasks-/);
  assert.equal(await rows().count(), 2); assert.equal(await page.locator("#tasks-title").inputValue(), "");
  const importedHead = await head(); await page.reload(); await ready(); assert.equal(await head(), importedHead);
  await page.goBack(); await ready();
  await page.waitForFunction(expected => document.querySelector("#tasks-head")?.textContent === expected, sourceHead);
  assert.equal(page.url(), sourceUrl); assert.equal(await head(), sourceHead);
  assert.equal(await page.locator("#tasks-title").inputValue(), "Draft from another tab");
  checks.push("UI export imports into a fresh identity, reopens correctly, and Back returns to original data and saved draft; dirty switches are blocked");

  await page.waitForFunction(() => document.querySelector("#tasks-offline-status")?.getAttribute("data-ready") === "true");
  await context.setOffline(true); await page.reload(); await ready(); assert.equal(await head(), sourceHead);
  await openStorage(); await click("#tasks-new"); assert.equal(await page.locator("#tasks-schema-status").textContent(), "v1");
  await add("Created without a network"); await page.locator("#tasks-title").fill("Offline saved draft"); await save();
  await categories(); await click("#tasks-adopt"); await rebase();
  assert.equal(await page.locator("#tasks-title").inputValue(), "Offline saved draft");
  await page.locator('[data-action="edit"]').click(); await page.locator("#tasks-category").fill("offline"); await click("#tasks-submit");
  const offlineHead = await head(); await page.reload(); await ready(); assert.equal(await head(), offlineHead);
  assert.match(await rows().first().textContent(), /Created without a network.*offline/s);
  await exportTasks("offline-tasks-history.json");
  await page.locator("#tasks-offline").click();
  await page.waitForFunction(() => document.querySelector("#tasks-offline-status")?.getAttribute("data-ready") === "true");
  const grow = await context.newPage(); await grow.goto(`${origin}/grow/?workspace=algal-grow-v1-${crypto.randomUUID()}`);
  await grow.locator('#grow-root[data-ready="true"]').waitFor(); await grow.close();
  checks.push("network-denied reopen, new workspace, tasks, saved draft, category migration, edit and export; Grow remains available offline");
  await context.setOffline(false);

  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); globalThis.scrollTo({ top: 0, behavior: "instant" }); });
  await page.screenshot({ path: join(output, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "No phone horizontal overflow");
  await page.screenshot({ path: join(output, "phone-dark.png"), fullPage: true });
  await page.locator("#tasks-title").focus(); await page.keyboard.press("Tab");
  assert.equal(await page.locator("#tasks-priority").evaluate(node => document.activeElement === node), true);
  const noJs = await context.browser().newContext({ javaScriptEnabled: false });
  const fallback = await noJs.newPage(); await fallback.goto(`${origin}/tasks/`); assert.match(await fallback.locator("noscript").textContent(), /Enable JavaScript/); await noJs.close();
  checks.push("desktop and phone-dark screenshots, no phone overflow, keyboard field navigation, and no-JavaScript explanation");
  assert.deepEqual(errors, [], "No uncaught browser errors");
  const remoteRequests = requests.filter(request => !request.url.startsWith(origin));
  assert.deepEqual(remoteRequests, [], "The browser task application makes no remote requests");
  await writeFile(join(output, "result.json"), JSON.stringify({ ok: true, browser: context.browser()?.version(), checks, remoteRequests, errors }, null, 2));
  console.log(JSON.stringify({ ok: true, checks, output }));
} catch (error) {
  await writeFile(join(output, "failure.json"), JSON.stringify({ checks, error: String(error), errors, requests, failedRequests, browserLogs }, null, 2));
  await page.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {}); throw error;
} finally { await context.close(); server.stop(true); }
