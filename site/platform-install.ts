/* The home install panel renders design-kit's PlatformInstall and
 * PlatformBadges at build time. Their StyleX classes ship in the kit's
 * stylesheet, which styles.css already imports; `platform-install-client.ts`
 * adds the tab keys, OS detection, and Copy that React hydration would. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlatformBadges } from "@hraness/design-kit/react/server";
import { PlatformInstall } from "@hraness/design-kit/react/platform-install";

export const INSTALL_COMMAND = "curl -fsSL https://algal.computer/install.sh | sh";
const ID = "algal-install";

/** macOS and Linux run the native build; Windows runs the Linux build in WSL2. */
export function renderPlatformInstall(): string {
  const html = renderToStaticMarkup(createElement(PlatformInstall, {
    platforms: [
      { id: "macos", command: INSTALL_COMMAND, shell: "Terminal", note: "Apple silicon" },
      { id: "linux", command: INSTALL_COMMAND, shell: "Terminal", note: "x86_64 and ARM64, glibc 2.39+ (Ubuntu 24.04+)" },
      {
        id: "windows",
        unavailable: true,
        unavailableNote: "Runs in WSL2 (Ubuntu 24.04) with the Linux command.",
        command: INSTALL_COMMAND,
        shell: "WSL2 terminal",
      },
    ],
  }));
  // React's generated id base changes with render order; pin it for stable pages.
  const base = /id="([^"]+)-tab-macos"/u.exec(html)?.[1];
  if (base === undefined) throw new Error("PlatformInstall markup changed: no macOS tab id");
  return html.replaceAll(`${base}-`, `${ID}-`);
}

export function renderPlatformBadges(): string {
  return renderToStaticMarkup(createElement(PlatformBadges, {
    platforms: ["macos", "linux", { id: "windows", note: "via WSL2" }],
  }));
}
