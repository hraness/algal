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

/** Where ALGAL runs, shown once on the home page and once on the use-cases page. */
export const ADOPTION_BOUNDARY = `<p>ALGAL runs approval queues, coding repairs checked by your own tests, reusable judgment pipelines, and run histories you inspect later. Run it as one native binary on your machine, or as a habitat on algal.cloud that keeps your programs alive across restarts, machines, and teams.</p><p>Your application supplies tool permissions, models, and limits. A program declares its decisions, budgets, and approval points, and cannot widen its own authority. Receipts record every step, so a reviewer can replay a run without your store, your credentials, or a model.</p>`;

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
