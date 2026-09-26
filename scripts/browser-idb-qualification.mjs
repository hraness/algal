/* global process, console, URL, Response */
// Real-Chromium qualification of the IndexedDB mailbox and host-event
// drivers: durable claims, idempotent delivery, capability denial, reopen,
// and a peer-tab handoff on the same underlying storage. Requires an
// explicitly supplied browser; no model or account needed.
import { build, serve } from "bun";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const repository = resolve(import.meta.dirname, "..");
const output = resolve(process.env.ALGAL_BROWSER_EVIDENCE ?? "/tmp/algal-idb-qualification");
const modulePath = process.env.ALGAL_PLAYWRIGHT_MODULE, executablePath = process.env.ALGAL_BROWSER_EXECUTABLE;
if (!modulePath || !executablePath) throw new Error("Set ALGAL_PLAYWRIGHT_MODULE and ALGAL_BROWSER_EXECUTABLE to installed tools");
await mkdir(output, { recursive: true });
const fixture = await build({ entrypoints: [join(repository, "tests/browser-idb-storage.ts")], target: "browser", format: "esm", minify: true });
if (!fixture.success) throw new AggregateError(fixture.logs, "Browser IndexedDB conformance bundle failed");
const server = serve({ hostname: "127.0.0.1", port: Number(process.env.ALGAL_BROWSER_PORT ?? 0), async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/test/browser-fixture.js") return new Response(await fixture.outputs[0].text(), { headers: { "content-type": "text/javascript" } });
  if (path === "/test/") return new Response("<!doctype html><title>ALGAL IndexedDB conformance</title>", { headers: { "content-type": "text/html" } });
  return new Response("Not found", { status: 404 });
} });
const origin = `http://127.0.0.1:${server.port}`;
const { chromium } = await import(pathToFileURL(modulePath).href);
const context = await chromium.launchPersistentContext(join(output, "browser-profile"), { executablePath, headless: true });
for (const restored of context.pages()) await restored.close();
context.setDefaultTimeout(90_000);
const checks = [], errors = [], browserLogs = [];
context.on("page", page => {
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") browserLogs.push(message.text().slice(0, 1000)); });
});
try {
  const page = await context.newPage();
  await page.goto(`${origin}/test/`);
  const main = await page.evaluate(async () => (await import("/test/browser-fixture.js")).storageChecks());
  checks.push(...main.checks);
  const peer = await context.newPage();
  await peer.goto(`${origin}/test/`);
  const peerResult = await peer.evaluate(async mailboxDb => (await import("/test/browser-fixture.js")).peerChecks(mailboxDb), main.mailboxDb);
  checks.push(...peerResult.checks);
  await peer.close();
  checks.push(...await page.evaluate(async ({ mailboxDb, messageId }) => (await import("/test/browser-fixture.js")).mainFollowUp(mailboxDb, messageId), { mailboxDb: main.mailboxDb, messageId: peerResult.messageId }));
  await page.close();
  assert.deepEqual(errors, [], "No uncaught browser errors");
  await writeFile(join(output, "result.json"), JSON.stringify({ ok: true, browser: context.browser()?.version(), checks, errors, browserLogs }, null, 2));
  console.log(JSON.stringify({ ok: true, checks, output }));
} catch (error) {
  await writeFile(join(output, "failure.json"), JSON.stringify({ checks, error: String(error), errors, browserLogs }, null, 2));
  throw error;
} finally { await context.close(); server.stop(true); }
