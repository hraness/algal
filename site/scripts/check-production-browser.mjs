/* global document, getComputedStyle, innerHeight, innerWidth, matchMedia, requestAnimationFrame, scrollY, window */
import assert from 'node:assert/strict';
import console from 'node:console';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

// Only public read-only production pages: no application commands, credentials,
// personal data, form submission, or deployment operations are used here.
const origin = "https://algal.computer";
const paths = ["/", "/tour/", "/use-cases/", "/docs/", "/blog/", "/living/", "/workbench/", "/grow/", "/tasks/", "/compare/", "/docs/spec/organism/", "/blog/built-on-algal/", "/missing-production-verification"];
const artifacts = resolve(import.meta.dirname, '../.production-browser', String(Date.now()));
const executablePath = process.env.PRODUCTION_BROWSER_EXECUTABLE;
assert.ok(executablePath && isAbsolute(executablePath), 'An absolute installed Chromium executable is required.');
await mkdir(artifacts, { recursive: true });
const report = { origin, verifierSha: process.env.GITHUB_SHA ?? null, startedAt: new Date().toISOString(),
  passed: false, records: [], errors: [], blockedWrites: [], cleanup: false };
let launching;
let browser;
let page;
let stopping;
const cleanup = () => stopping ??= (async () => {
  const owned = await launching?.catch(() => undefined);
  if (owned) await owned.close();
  report.cleanup = true;
})();
let finishing;
let terminating;
const saveReceipt = () => {
  report.completedAt = new Date().toISOString();
  return writeFile(resolve(artifacts, 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
};
const finalize = () => finishing ??= (async () => {
  clearTimeout(timer);
  try { await cleanup(); } catch (error) { report.cleanupError = String(error); report.passed = false; process.exitCode = 1; }
  await saveReceipt();
  console.log(JSON.stringify({ ...report, records: report.records.length, artifacts }, null, 2));
})();
const terminate = reason => terminating ??= (async () => {
  report.errors.push(reason);
  report.failure = reason;
  report.passed = false;
  process.exitCode = 1;
  try {
    await finalize();
    // If interruption raced a successful final write, persist the terminal
    // failure after that write has joined before exiting the process.
    await saveReceipt();
  } finally { process.exit(1); }
})();
const timer = setTimeout(() => { void terminate('Eight-minute deadline exceeded'); }, 480_000);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void terminate(`Interrupted: ${signal}`); });
try {
  launching = chromium.launch({ executablePath, headless: true, timeout: 20_000 });
  browser = await launching;
  for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
    const mobile = width < 500;
    const context = await browser.newContext({ viewport: { width, height: width === 360 ? 740 : width === 390 ? 844 : 900 },
      deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
      report.blockedWrites.push({ method: request.method(), url: request.url() });
      await route.abort('blockedbyclient');
    });
    try {
      page = await context.newPage();
      page.setDefaultTimeout(10_000);
      page.setDefaultNavigationTimeout(20_000);
      let currentPath;
      const previewErrors = [];
      page.on('pageerror', error => report.errors.push(String(error)));
      page.on('console', message => {
        if (message.type() !== 'error' || new URL(page.url()).origin !== origin) return;
        if (currentPath === '/missing-production-verification' && message.location().url.includes(currentPath)) return;
        // The dedicated Textbutler preview deliberately blocks its authored Next
        // scripts. Its exact response policy and inert runtime are checked below.
        if (currentPath === '/preview' && /(?:script-src|default-src) 'none'/u.test(message.text())) previewErrors.push(message.text());
        else report.errors.push(message.text());
      });
      page.on('response', response => {
        if (new URL(response.url()).origin === origin && response.status() >= 400 && !response.url().includes('/missing-production-verification'))
          report.errors.push(`HTTP ${response.status()} ${response.url()}`);
      });
      for (const path of paths) {
        currentPath = path;
        const preview = path === '/preview';
        const response = await page.goto(origin + path, { waitUntil: 'load' });
        assert.equal(response.status(), path === '/missing-production-verification' ? 404 : 200, path);
        assert.equal(new URL(page.url()).origin, origin, 'Public pages must remain on the fixed origin');
        let previewCsp;
        if (preview) {
          previewCsp = await response.headerValue('content-security-policy');
          for (const directive of ["default-src 'none'", "script-src 'none'", "style-src 'self'", "font-src 'self' data:"])
            assert.ok(previewCsp?.split(';').map(value => value.trim()).includes(directive), directive);
          assert.equal(await page.evaluate(() => Object.hasOwn(window, '__next_f')), false, 'Preview runtime stays inert');
        }
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        const measure = () => page.evaluate(() => {
          const rect = element => element && { x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y,
            width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
            bottom: element.getBoundingClientRect().bottom, position: getComputedStyle(element).position };
          const header = document.querySelector('header.hraness-marketing-header');
          const footer = document.querySelector(".site-footer");
          const main = document.querySelector('main');
          return { rootOverflow: document.documentElement.scrollWidth - innerWidth, bodyOverflow: document.body.scrollWidth - innerWidth,
            bodyWidth: document.body.getBoundingClientRect().width, coarse: matchMedia('(pointer: coarse)').matches,
            bodyFont: getComputedStyle(document.body).fontFamily, headingFont: document.querySelector('h1') && getComputedStyle(document.querySelector('h1')).fontFamily,
            headings: document.querySelectorAll('h1').length, mode: document.documentElement.dataset.theme,
            header: rect(header), footer: rect(footer), main: rect(main), viewportHeight: innerHeight,
            targets: [...(header?.querySelectorAll('a, button, summary') ?? [])].filter(element => element.getBoundingClientRect().height > 0)
              .map(element => ({ label: element.getAttribute('aria-label') || element.textContent.trim(), ...rect(element) })) };
        });
        const label = `${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-').replace(/-$/u, '')}-${width}-${theme}`;
        // Chromium's captureBeyondViewport can reset touch emulation. Capture
        // overlapping viewport tiles instead, checking real phone media at each tile.
        const metrics = await measure();
        const captures = [];
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const step = Math.max(1, Math.floor(metrics.viewportHeight * 0.8));
        assert.ok(Math.ceil(pageHeight / step) <= 100, `${label}: bounded screenshot count`);
        for (let offset = 0, index = 0; offset < pageHeight; offset += step, index++) {
          await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), offset);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const file = `${label}${index ? `-tile-${index}` : ''}.png`;
          const screenshot = await page.screenshot({ path: resolve(artifacts, file), animations: 'disabled' });
          const capture = await page.evaluate(() => ({ y: scrollY, coarse: matchMedia('(pointer: coarse)').matches,
            width: innerWidth, height: innerHeight }));
          captures.push({ file, ...capture });
          assert.equal(capture.coarse, mobile, `${label}: phone media preserved in tile ${index}`);
          assert.equal(screenshot.readUInt32BE(16), width, `${label}: uncropped viewport width`);
          assert.equal(screenshot.readUInt32BE(20), metrics.viewportHeight, `${label}: viewport height`);
          if (capture.y + capture.height >= pageHeight) break;
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const afterCapture = await measure();
        report.records.push({ path, width, theme, metrics, afterCapture, captures, previewCsp, previewErrors: preview ? [...previewErrors] : undefined });
        assert.deepEqual(afterCapture, metrics, `${label}: layout and pointer media preserved through captures`);
        assert.ok(metrics.rootOverflow <= 1 && metrics.bodyOverflow <= 1 && metrics.bodyWidth <= width + 1, `${label}: page overflow`);
        assert.equal(metrics.coarse, mobile, `${label}: real phone pointer media`);
        assert.match(metrics.bodyFont, /Nebula Sans/u, `${label}: sans typography`);
        if (!preview) {
          assert.equal(metrics.headings, 1, `${label}: one page heading`);
          assert.match(metrics.headingFont, /Nebula Sans/u);
          assert.equal(metrics.mode, theme, `${label}: requested appearance`);
          assert.equal(metrics.header?.position, 'sticky', `${label}: sticky header`);
          assert.ok(metrics.header.height <= (mobile ? 140 : 100), `${label}: compact header`);
          assert.ok(metrics.footer && !['fixed', 'sticky'].includes(metrics.footer.position), `${label}: footer in document flow`);
          assert.ok(metrics.footer.y >= metrics.main.bottom - 1, `${label}: footer follows main content`);
          assert.ok(metrics.footer.bottom >= metrics.viewportHeight - 1, `${label}: footer reaches viewport bottom`);
          if (mobile) for (const target of metrics.targets)
            assert.ok(target.width >= 43.5 && target.height >= 43.5, `${label}: 44px target ${target.label} (${target.width}x${target.height})`);
        }
      }
      currentPath = '/';
      await page.goto(origin, { waitUntil: 'load' });
      const menu = page.locator('header [data-hraness-appearance-menu]').first();
      const trigger = menu.locator('summary, button[aria-haspopup="menu"]').first();
      const opposite = theme === 'light' ? 'dark' : 'light';
      await trigger.click();
      await menu.getByText(opposite === 'dark' ? 'Dark' : 'Light', { exact: true }).click();
      await page.waitForFunction(mode => document.documentElement.dataset.theme === mode, opposite);
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(mode => document.documentElement.dataset.theme === mode, opposite);
      await trigger.click();
      await menu.getByText('System', { exact: true }).click();
      await page.emulateMedia({ colorScheme: theme });
      await page.waitForFunction(mode => document.documentElement.dataset.theme === mode, theme);
      await trigger.click();
      await page.keyboard.press('Escape');
      assert.equal(await menu.getByText('System', { exact: true }).isVisible(), false, 'Escape closes appearance');
      assert.equal(await trigger.evaluate(element => document.activeElement === element), true, 'Escape restores trigger focus');
      await page.locator('main a[href="#install"]').first().click();
      await page.waitForURL(origin + '/#install');
      assert.ok(await page.locator('#install').evaluate(element => element.getBoundingClientRect().top >= document.querySelector('header').getBoundingClientRect().bottom - 1), 'Install section clears the sticky header');
    } catch (error) {
      if (page && !page.isClosed()) await page.screenshot({ path: resolve(artifacts, 'failure.png'), }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  assert.deepEqual(report.errors, [], 'Unexpected production runtime or resource errors');
  report.passed = true;
} catch (error) {
  report.failure ??= String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(artifacts, 'failure.png'), }).catch(() => {});
  process.exitCode = 1;
} finally {
  await finalize();
}
