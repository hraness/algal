import { expect, test } from "bun:test";
import { INSTALL_COMMAND, renderPlatformBadges, renderPlatformInstall } from "./platform-install";
import { renderInstallScript } from "./install-script";

test("the install panel lists macOS, Linux, then Windows through WSL2", () => {
  const html = renderPlatformInstall();
  const tabs = [...html.matchAll(/role="tab"[^>]*>[\s\S]*?<span class="hraness-platform-install__tab-label[^"]*">([^<]+)<\/span>/gu)].map(match => match[1]);
  expect(tabs).toEqual(["macOS", "Linux", "Windows"]);
  expect(html.split(`>${INSTALL_COMMAND}</code>`)).toHaveLength(4);
  expect(html).toContain("Apple silicon");
  expect(html).toContain("x86_64 and ARM64, glibc 2.39+ (Ubuntu 24.04+)");
  expect(html).toContain('data-availability="unavailable" data-platform="windows"');
  expect(html).toContain("Runs in WSL2 (Ubuntu 24.04) with the Linux command.");
  expect(html).toContain('id="algal-install-tab-macos"');
  expect(html).not.toMatch(/_R_/u);
  // Each platform mark is drawn once as a <symbol> and reused by <use>.
  expect(html.match(/<symbol /gu)).toHaveLength(3);
  expect(renderPlatformInstall()).toBe(html);
});

test("the Runs on row names WSL2 for Windows", () => {
  const html = renderPlatformBadges();
  expect(html).toContain("Runs on");
  expect([...html.matchAll(/<li[^>]*data-platform="([a-z]+)"/gu)].map(match => match[1])).toEqual(["macos", "linux", "windows"]);
  expect(html).toContain("via WSL2");
});

test("the shown command fetches the installer this site publishes", async () => {
  expect(INSTALL_COMMAND).toBe("curl -fsSL https://algal.computer/install.sh | sh");
  expect(await renderInstallScript(import.meta.dir)).toContain("aarch64-unknown-linux-gnu");
});
