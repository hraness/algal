// Editorial records for the ALGAL blog. Post text lives in site/blog/*.md;
// this file holds each post's review record (ArticleAdmission), the sources
// shown under it, and the links that wait for another host to go live.
// assertArticleAdmissions() checks the registry in blog.test.ts.
//
// Lifecycle decides discovery: only `indexable` posts enter the blog index,
// sitemap, Atom feed, and llms.txt. `quarantined` posts stay readable at their
// URL with robots noindex (owner decision, 2026-09-23).
import type { ArticleAdmission, ArticleAuthor, ArticleIsoDate, ArticleSourceItem } from "@hraness/design-kit";

export const BLOG_AUTHOR: ArticleAuthor = { kind: "organization", name: "Hraness", href: "https://hraness.com" };

const AI_REVIEWER = "Claude Opus 5.5 (claude-opus-5-5) editorial review";
const ALGAL_EVIDENCE = "1bc117df7e9d18911123e736e28e2c051598a9f3";
const algal = (path: string) => `https://github.com/hraness/algal/blob/${ALGAL_EVIDENCE}/${path}`;
const CHECKED: ArticleIsoDate = "2026-09-24";

type Source = ArticleSourceItem & Readonly<{ public: boolean }>;
const source = (title: string, href: string, isPublic = true): Source => ({ title, href, checkedOn: CHECKED, public: isPublic });

/** Posts written before review records existed. They carry no review, so
 * they stay quarantined until an independent review is recorded. */
function unreviewed(slug: string, readerJob: string, nonObviousAnswer: string): ArticleAdmission {
  return {
    href: `/blog/${slug}/`,
    lifecycle: "quarantined",
    readerJob,
    nonObviousAnswer,
    originalContribution: "Not yet assessed: this post predates review records.",
    hostFit: "An ALGAL design note on the ALGAL site.",
    nearestUrls: [],
    sources: [],
    observations: [],
    // Unscored until reviewed. Zeros keep the post out of every index.
    scores: { readerUtility: 0, originalEvidence: 0, factualConfidence: 0, hostFit: 0, voiceIntegrity: 0, maintenanceValue: 0 },
    owner: "Hraness",
    drafting: "ai-assisted",
    review: null,
    humanReview: null,
    reassessOn: "2026-10-22",
    harmIfWrong: "Unreviewed claims about ALGAL or cited research could mislead a reader choosing a runtime.",
    refreshTriggers: ["An independent review of the post", "A change to the ALGAL behavior the post describes"],
  };
}

const PARITY_SOURCES: readonly Source[] = [
  source("Native parity script: every example and compiled source project through both runtimes, field comparison, and cross-verification", algal("scripts/native-parity.ts")),
  source("Schema parity script: acceptance and error codes for a fixed list of output and input schemas, including key-order cases", algal("scripts/schema-parity.ts")),
  source("Work-budget parity script: a handled expression failure must exhaust the same budget in both runtimes", algal("scripts/work-budget-parity.ts")),
  source("Process parity script: durable lifecycles compared record by record", algal("scripts/process-parity.ts")),
  source("Application parity script", algal("scripts/application-parity.ts")),
  source("Store parity script", algal("scripts/store-parity.ts")),
  source("CLI parity script: public commands, including failed and suspended runs, with expected exit status", algal("scripts/cli-parity.ts")),
  source("Expression evaluator: one Rust implementation, compiled natively and to WebAssembly for Bun", algal("crates/algal-expr/src/lib.rs")),
  source("Rust canonical JSON key order that reproduces JavaScript's", algal("crates/algal/src/canonical.rs")),
  source("TypeScript canonical JSON", algal("src/values.ts")),
  source("CI workflow: the Native VM job builds the Rust binary and runs the parity scripts on Ubuntu and macOS", algal(".github/workflows/ci.yml")),
  source("Vision: status and limits", algal("docs/vision.md")),
  source("README: adoption boundary and cross-runtime handoff demo", algal("README.md")),
];

const HUB_SOURCES: readonly Source[] = [
  source("Relation detail sentences for the four ALGAL consumers (unmerged branch)", "https://github.com/hraness/jungle/blob/main/portfolio-relationships.json", false),
  source("Plan of record: canonical names, relations, hub rule", "https://github.com/hraness/jungle/blob/main/kb/plans/portfolio-blog-program-20260923.md", false),
  source("Provider hub shape", "https://github.com/hraness/design-kit/blob/v0.17.0/ARTICLE_COPY.md"),
  source("ALGAL site description and prerelease limits", algal("site/copy.ts")),
  source("ALGAL thesis post", algal("site/blog/software-that-accumulates-competence.md")),
  source("Textbutler habitat programs", "https://github.com/hraness/textbutler/blob/0f83a82ead83f4f00a98cc13f32afd4f9c8f8fd1/packages/textbutler/src/habitat-program.ts"),
  source("xcb reflexes", "https://github.com/hraness/xcb/blob/6437bcb844017e74b3e3930ff5c6076ea55c5f06/docs/reflexes.md"),
  source("Clankdar evaluator section", "https://github.com/hraness/clankdar/blob/664d64e4ce4c429ee999f914d054facf6dcbb8d9/README.md"),
  source("Slopcamera behavior bake", "https://github.com/hraness/slopcamera/blob/7e7027521f134aaaaa8404efebdc5bac24be6252/src/spatial-scene/behavior-bake.ts"),
];

const stripPublic = (sources: readonly Source[]) => sources.map(({ public: _public, ...rest }) => ({ title: rest.title, url: rest.href, checkedOn: rest.checkedOn }));

export const BLOG_ADMISSIONS: readonly ArticleAdmission[] = [
  {
    href: "/blog/typescript-rust-parity/",
    lifecycle: "indexable",
    readerJob: "Keep a TypeScript implementation and a Rust implementation of the same runtime from drifting apart, and know what a passing parity suite shows.",
    nonObviousAnswer: "Field-by-field comparison needs a second check where each runtime verifies the other's run record, and Rust must copy JavaScript's key order (index-like keys first, then UTF-16 code units) or canonical JSON diverges on emoji and numeric keys; code that has one implementation, like the WebAssembly evaluator, gets no evidence from parity.",
    originalContribution: "Reads ALGAL's parity scripts and CI job directly and names what they leave uncompared: the shared expression evaluator and the application query engine.",
    hostFit: "Describes ALGAL's own runtimes, tests, and CI job, with source files a reader can open in this repository.",
    nearestUrls: [
      { url: "/blog/receipts-fossil-record/", distinction: "Explains what a run record contains and how offline replay works; this post relies on it and does not repeat it." },
      { url: "https://hraness.com/reference/correctness/two-implementations-one-spec", distinction: "The general technique across Hraness products; this post is the ALGAL version with its own scripts and limits." },
    ],
    sources: stripPublic(PARITY_SOURCES),
    observations: [
      "The application parity script's TypeScript leg calls the native query engine as a subprocess, so the application comparison checks the lifecycle around one engine rather than two engines.",
      "Process parity plants an interrupted creation marker whose digest the TypeScript side computed into both stores, which forces the Rust runtime to accept a digest it did not produce.",
    ],
    scores: { readerUtility: 2, originalEvidence: 2, factualConfidence: 2, hostFit: 2, voiceIntegrity: 2, maintenanceValue: 1 },
    owner: "Hraness",
    drafting: "ai-from-source",
    review: { reviewer: AI_REVIEWER, reviewerType: "ai", reviewedOn: "2026-09-24" },
    humanReview: null,
    reassessOn: "2026-11-05",
    harmIfWrong: "A reader could trust cross-runtime resume, or a passing parity suite, for program shapes the suite never compared.",
    refreshTriggers: [
      "A change to the compared field list in scripts/native-parity.ts",
      "A change to key_order in crates/algal/src/canonical.rs or canonicalize in src/values.ts",
      "The expression evaluator gaining a second implementation or no longer shipping as WebAssembly",
      "application-parity.ts no longer calling the native query engine from its TypeScript leg",
      "A change to the CI Native VM job's operating systems or triggers",
      "An ALGAL release status change, including signed or notarized native packages",
      "A rename of ALGAL or a move of the linked /blog posts",
    ],
  },
  {
    // The hub emits only when at least one registered relation has a live
    // post (ALGAL_USES_POSTS); with none the build skips the page.
    href: "/blog/built-on-algal/",
    lifecycle: "indexable",
    readerJob: "Find which Hraness products run on ALGAL and open the post that shows how each one uses it.",
    nonObviousAnswer: "ALGAL is in use outside its own repo: Textbutler gates per-contact reply plans with it, xcb replays task history through it, Clankdar computes puzzle answers with its pinned evaluator, and Slopcamera bakes character behavior as tool-free organisms.",
    originalContribution: "An index of registered relations; each entry is the relation's reviewed sentence and one link.",
    hostFit: "The provider hub for ALGAL, on ALGAL's own site.",
    nearestUrls: [
      { url: "/blog/software-that-accumulates-competence/", distinction: "The thesis behind ALGAL; the hub lists products that use it and does not restate the thesis." },
    ],
    sources: stripPublic(HUB_SOURCES),
    observations: [
      "The hub lists a product only when its relation detail sentence is in the published portfolio facts and its post is marked live, so a live post can stay absent until a design-kit release ships the relation.",
      "Each entry links the consumer's own host rather than an ALGAL page, so the hub points readers to the site that owns the evidence.",
    ],
    scores: { readerUtility: 1, originalEvidence: 1, factualConfidence: 2, hostFit: 2, voiceIntegrity: 2, maintenanceValue: 1 },
    owner: "Hraness",
    drafting: "ai-from-source",
    review: { reviewer: AI_REVIEWER, reviewerType: "ai", reviewedOn: "2026-09-24" },
    humanReview: null,
    reassessOn: "2026-11-05",
    harmIfWrong: "A reader could believe a product depends on ALGAL when the relation is not recorded, or follow a link to a post that does not exist.",
    refreshTriggers: [
      "A change to any ALGAL relation's detail sentence in the portfolio facts, or a relation added or removed",
      "The @hraness/design-kit/portfolio subpath regenerating with ALGAL relations",
      "Any linked 'How <product> uses ALGAL' post going live, moving or being archived",
      "An ALGAL release or status change in site/copy.ts",
      "A rename of ALGAL or of Textbutler, xcb, Clankdar or Slopcamera",
    ],
  },
  unreviewed("software-that-accumulates-competence",
    "Understand what ALGAL is betting on and what evidence would settle the bet.",
    "The claim is that a computer can keep tested ways of acting and reuse them, not that a model writes code; the post names what would count as evidence."),
  unreviewed("self-evolving-software-selection-boundary",
    "See how self-improving program research decides which proposed program gets to run.",
    "Published systems converge on propose, evaluate, select; ALGAL makes the selection step a checked contract instead of a convention."),
  unreviewed("receipts-fossil-record",
    "Learn what an ALGAL run record contains and what replaying it offline proves.",
    "Replay shows a run was internally consistent, not that a model's answer was true."),
  unreviewed("programs-that-wait",
    "Understand how an ALGAL program can wait for days and resume in a different process or runtime.",
    "The wait is saved as data with the permission it was granted, so any process with the store can resume it."),
];

/** Sources shown under each post. Private repositories stay in the record only. */
export const BLOG_SOURCES: Readonly<Record<string, readonly ArticleSourceItem[]>> = {
  "typescript-rust-parity": PARITY_SOURCES.filter(item => item.public).map(({ public: _public, ...rest }) => rest),
  "built-on-algal": HUB_SOURCES.filter(item => item.public).map(({ public: _public, ...rest }) => rest),
};

/** Cross-host posts from the blog program that are not live yet. Links to
 * them render as plain text until each URL returns 200; then remove it here. */
export const PENDING_CROSS_HOST_LINKS: ReadonlySet<string> = new Set([]);

/** "How <consumer> uses ALGAL" posts, keyed by portfolio product id. The hub
 * lists an entry only when the portfolio records the relation with a detail
 * sentence and the post here is marked live. */
export const ALGAL_USES_POSTS: Readonly<Record<string, Readonly<{ url: string; live: boolean }>>> = {
  "message-like-me": { url: "https://textbutler.app/blog/how-textbutler-uses-algal", live: true },
  xcb: { url: "https://xcb.sh/blog/how-xcb-uses-algal", live: true },
  clankdar: { url: "https://clankdar.com/blog/how-clankdar-uses-algal", live: true },
  slopcamera: { url: "https://slopcamera.com/blog/how-slopcamera-uses-algal", live: true },
};
