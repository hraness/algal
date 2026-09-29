import { highlightCode } from "@hraness/design-kit/syntax-highlighting";

// Site-wide copy rendered in more than one place: the home page metadata, the
// JSON-LD description, the footer, the social card, and the limits section
// shared by the home and use-cases pages. Change these strings here only.
// Public copy follows STYLE.md; the tagline and description are the canonical
// lines from the portfolio messaging record for ALGAL.

export const SITE_TAGLINE = "Write agent programs that wait, resume, and replay.";

/** The home page description, JSON-LD description, and social card text. */
export const SITE_DESCRIPTION = "ALGAL is a programming language and VM for AI agent programs that wait for approval and leave receipts you can replay.";

/** Every page shares one social image, so every page shares its alt text. */
export const OG_IMAGE_ALT = "ALGAL card showing the tagline “Write agent programs that wait, resume, and replay.” and the algal.computer address";

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
