// Site-wide copy rendered in more than one place: the home page metadata, the
// JSON-LD description, the footer, the social card, and the limits section
// shared by the home and use-cases pages. Change these strings here only.
// Public copy follows STYLE.md; the tagline is the owner's positioning line.

export const SITE_TAGLINE = "The language for living programs.";

/** The home page description, JSON-LD description, and social card text. */
export const SITE_DESCRIPTION = "ALGAL is a programming language and VM for AI agent programs that can wait for approval and propose new ones. Every run leaves a receipt that replays offline.";

/** Every page shares one social image, so every page shares its alt text. */
export const OG_IMAGE_ALT = "ALGAL card with the line “The language for living programs.”, a one-line description, and the algal.computer address";

/** Fit and prerelease limits, shown once on the home page and once on the use-cases page.
 * Each page states the receipt limit beside its own receipt copy. */
export const ADOPTION_BOUNDARY = `<p>ALGAL fits local review queues, coding repairs checked by your own tests, reusable judgment pipelines, and run histories you need to inspect later. A single unstructured prompt may need less machinery, and a durable workflow engine you already run may meet your recovery needs.</p><p>ALGAL is an <strong>application VM prerelease</strong>. Its packages are unsigned and not notarized. Your host application stays responsible for tool permissions, confirming what happened when an external write's outcome is unknown, storage operations, and any OS isolation you need. Multi-tenant service use, distributed custody (moving process ownership between machines), and store-wide quotas are not built yet.</p>`;
