import snapshot from "./portfolio-messaging.generated.json";

import { highlightCode } from "@hraness/design-kit/syntax-highlighting";

if (snapshot.contract !== "hraness.product-messaging/v1" || snapshot.productId !== "algal") {
  throw new Error("The website requires the canonical ALGAL messaging snapshot.");
}

export const productMessaging = snapshot.messaging;
export const SITE_NAME = productMessaging.names.name;
export const SITE_TAGLINE = productMessaging.tagline;
export const SITE_DESCRIPTION = productMessaging.meta;

/** Keep canonical text inside a JSON-LD script's text boundary. */
export function serializeMarketingJson(value: string): string {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}

/** Fit and prerelease limits, shown once on the home page and once on the use-cases page.
 * Each page states the receipt limit beside its own receipt copy. */
export const ADOPTION_BOUNDARY = `<p>ALGAL fits local review queues, coding repairs checked by your own tests, reusable judgment pipelines, and run histories you need to inspect later. A single unstructured prompt may need less machinery, and Temporal, Restate, or Inngest, if you already run one, may meet your recovery needs.</p><p>ALGAL is an <strong>application VM prerelease</strong>. Its packages are unsigned and not notarized. Your host application stays responsible for tool permissions, confirming what happened when an external write's outcome is unknown, storage operations, and any OS isolation you need. Multi-tenant service use, moving a running process to another machine, and store-wide quotas are not built yet.</p>`;

/** The first-run terminal, shown on the home and use-cases install sections. */
const installCommands = highlightCode(`# Check the installed build and available model providers
algal doctor

# Start a program that waits for your decision
algal demo start ./my-review
algal demo inspect ./my-review`, "shell", { styles: "classes" });

export const INSTALL_TERMINAL = `<figure class="hraness-marketing-proof-frame" data-hraness-marketing="proof-frame"><div aria-hidden="true" class="hraness-marketing-proof-frame__chrome"><span class="hraness-marketing-proof-frame__lights"><span class="hraness-marketing-proof-frame__light"></span><span class="hraness-marketing-proof-frame__light"></span><span class="hraness-marketing-proof-frame__light"></span></span><span class="hraness-marketing-proof-frame__title">After installation · Terminal</span></div><div class="hraness-marketing-proof-frame__content"><pre class="algal-terminal-code" tabindex="0" aria-label="Commands to run after installation"><code class="${installCommands.className}" data-language="${installCommands.language}">${installCommands.html}</code></pre></div><figcaption class="hraness-marketing-proof-frame__caption"><span>Open <code>my-review/report.html</code> for the command to approve or deny the task. The demo uses scripted decisions and needs no model account.</span><span>To explore crash recovery, follow the <a href="/docs/native-workbench/">native demo guide</a>.</span></figcaption></figure>`;

/** Optional Apple Intelligence example, separate from the first-run demo. */
export const CIVILIZATION_EXAMPLE = highlightCode(`algal civ --live --apple --dir .algal/civ
algal civ-verify --dir .algal/civ`, "shell", { styles: "classes" }).html;
