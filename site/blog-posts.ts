// Editorial records for the ALGAL blog. Post text lives in site/blog/*.md;
// this file holds each post's review record (ArticleAdmission), the sources
// shown under it, and the links that wait for another host to go live.
// assertArticleAdmissions() checks the registry in blog.test.ts.
//
// Lifecycle decides discovery: only `indexable` posts enter the blog index,
// sitemap, Atom feed, and llms.txt. `quarantined` posts stay readable at their
// URL with robots noindex until independently reviewed.
import type { ArticleAdmission, ArticleAuthor, ArticleSourceItem } from "@hraness/design-kit";

export const BLOG_AUTHOR: ArticleAuthor = { kind: "organization", name: "Hraness", href: "https://hraness.com" };

export const BLOG_ADMISSIONS: readonly ArticleAdmission[] = [
  {
    "href": "/blog/introducing-algal/",
    "lifecycle": "indexable",
    "readerJob": "decide whether to try it",
    "nonObviousAnswer": "ALGAL's demo shows the behavior before you trust it: a program stops for an exact decision, and when it crashes mid-write it refuses to send that write again instead of guessing.",
    "originalContribution": "Short standalone sections, each drawn from a recorded run of algal demo, that double as the launch social posts.",
    "hostFit": "The product introduction on ALGAL's own site.",
    "nearestUrls": [
      {
        "url": "/blog/programs-that-wait/",
        "distinction": "Explains how a waiting process is saved and resumed; this post introduces the product and links there for depth."
      },
      {
        "url": "/blog/receipts-fossil-record/",
        "distinction": "Explains what a run record holds; this post shows the demo's offline check in one section."
      }
    ],
    "sources": [
      {
        "title": "Demo scenario: start, approve, deny, export, verify, and the two owned crashes",
        "url": "https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/crates/algal/src/demo.rs",
        "checkedOn": "2026-09-29"
      },
      {
        "title": "Native workbench guide: the report page and the approve and deny commands",
        "url": "https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/docs/native-workbench.md",
        "checkedOn": "2026-09-29"
      },
      {
        "title": "Native installation and supported platforms",
        "url": "https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/docs/native-release.md",
        "checkedOn": "2026-09-29"
      },
      {
        "title": "Adoption boundary: what ALGAL does not do yet",
        "url": "https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/site/copy.ts",
        "checkedOn": "2026-09-29"
      },
      {
        "title": "Vision: the bet and the evidence it still needs",
        "url": "https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/docs/vision.md",
        "checkedOn": "2026-09-29"
      },
      {
        "title": "Launch facts: every count and status in this post, with its source",
        "url": "https://github.com/hraness/algal/blob/dc5fef50122060aecfee9368af2379697bf01cdf/site/launch/facts.ts",
        "checkedOn": "2026-09-29"
      }
    ],
    "observations": [
      "Every count comes from site/launch/facts.ts, read from a captured algal demo run in site/launch/demo-fixture.json; the status comes from site/published-release.json.",
      "The crash section follows crates/algal/src/demo.rs: after the read crash the finished step is reused; after the write crash, recovery is refused and the write is not sent again."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "A reader could expect ALGAL to control tool permissions, sign packages, or prove who ran a program, none of which it does today.",
    "refreshTriggers": [
      "A new ALGAL release tag in site/published-release.json",
      "A change to algal demo output or its crash cases in crates/algal/src/demo.rs",
      "A change to the adoption boundary in site/copy.ts",
      "The launch film being rendered or re-cut"
    ]
  },
  {
    "href": "/blog/typescript-rust-parity/",
    "lifecycle": "indexable",
    "readerJob": "Keep a TypeScript implementation and a Rust implementation of the same runtime from drifting apart, and know what a passing parity suite shows.",
    "nonObviousAnswer": "Field-by-field comparison needs a second check where each runtime verifies the other's run record, and Rust must copy JavaScript's key order (index-like keys first, then UTF-16 code units) or canonical JSON diverges on emoji and numeric keys; code that has one implementation, like the WebAssembly evaluator, gets no evidence from parity.",
    "originalContribution": "Reads ALGAL's parity scripts and CI job directly and names what they leave uncompared: the shared expression evaluator and the application query engine.",
    "hostFit": "Describes ALGAL's own runtimes, tests, and CI job, with source files a reader can open in this repository.",
    "nearestUrls": [
      {
        "url": "/blog/receipts-fossil-record/",
        "distinction": "Explains what a run record contains and how offline replay works; this post relies on it and does not repeat it."
      },
      {
        "url": "https://hraness.com/reference/correctness/two-implementations-one-spec",
        "distinction": "The general technique across Hraness products; this post is the ALGAL version with its own scripts and limits."
      }
    ],
    "sources": [
      {
        "title": "Native parity script: every example and compiled source project through both runtimes, field comparison, and cross-verification",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/native-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Schema parity script: acceptance and error codes for a fixed list of output and input schemas, including key-order cases",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/schema-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Work-budget parity script: a handled expression failure must exhaust the same budget in both runtimes",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/work-budget-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Process parity script: durable lifecycles compared record by record",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/process-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Application parity script",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/application-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Store parity script",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/store-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "CLI parity script: public commands, including failed and suspended runs, with expected exit status",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/scripts/cli-parity.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Expression evaluator: one Rust implementation, compiled natively and to WebAssembly for Bun",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/crates/algal-expr/src/lib.rs",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Rust canonical JSON key order that reproduces JavaScript's",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/crates/algal/src/canonical.rs",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "TypeScript canonical JSON",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/src/values.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "CI workflow: the Native VM job builds the Rust binary and runs the parity scripts on Ubuntu and macOS",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/.github/workflows/ci.yml",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Vision: status and limits",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/docs/vision.md",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "README: adoption boundary and cross-runtime handoff demo",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/README.md",
        "checkedOn": "2026-09-24"
      }
    ],
    "observations": [
      "The application parity script's TypeScript leg calls the native query engine as a subprocess, so the application comparison checks the lifecycle around one engine rather than two engines.",
      "Process parity plants an interrupted creation marker whose digest the TypeScript side computed into both stores, which forces the Rust runtime to accept a digest it did not produce."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "A reader could trust cross-runtime resume, or a passing parity suite, for program shapes the suite never compared.",
    "refreshTriggers": [
      "A change to the compared field list in scripts/native-parity.ts",
      "A change to key_order in crates/algal/src/canonical.rs or canonicalize in src/values.ts",
      "The expression evaluator gaining a second implementation or no longer shipping as WebAssembly",
      "application-parity.ts no longer calling the native query engine from its TypeScript leg",
      "A change to the CI Native VM job's operating systems or triggers",
      "An ALGAL release status change, including signed or notarized native packages",
      "A rename of ALGAL or a move of the linked /blog posts"
    ]
  },
  {
    "href": "/blog/built-on-algal/",
    "lifecycle": "indexable",
    "readerJob": "Find which Hraness products run on ALGAL and open the post that shows how each one uses it.",
    "nonObviousAnswer": "ALGAL is in use outside its own repo: TextButler gates per-contact reply plans with it, Excalibur (xcb) replays task history through it, Clankdar computes puzzle answers with its pinned evaluator, and SlopCamera bakes character behavior as tool-free organisms.",
    "originalContribution": "An index of registered relations; each entry is the relation's reviewed sentence and one link.",
    "hostFit": "The provider hub for ALGAL, on ALGAL's own site.",
    "nearestUrls": [
      {
        "url": "/blog/software-that-accumulates-competence/",
        "distinction": "The thesis behind ALGAL; the hub lists products that use it and does not restate the thesis."
      }
    ],
    "sources": [
      {
        "title": "Provider hub shape",
        "url": "https://github.com/hraness/design-kit/blob/v0.17.0/ARTICLE_COPY.md",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "ALGAL runtime and host responsibilities",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/site/copy.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "ALGAL thesis post",
        "url": "https://github.com/hraness/algal/blob/1bc117df7e9d18911123e736e28e2c051598a9f3/site/blog/software-that-accumulates-competence.md",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "TextButler habitat programs",
        "url": "https://github.com/hraness/textbutler/blob/0f83a82ead83f4f00a98cc13f32afd4f9c8f8fd1/packages/textbutler/src/habitat-program.ts",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Excalibur (xcb) reflexes",
        "url": "https://github.com/hraness/xcb/blob/6437bcb844017e74b3e3930ff5c6076ea55c5f06/docs/reflexes.md",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "Clankdar evaluator section",
        "url": "https://github.com/hraness/clankdar/blob/664d64e4ce4c429ee999f914d054facf6dcbb8d9/README.md",
        "checkedOn": "2026-09-24"
      },
      {
        "title": "SlopCamera behavior bake",
        "url": "https://github.com/hraness/slopcamera/blob/7e7027521f134aaaaa8404efebdc5bac24be6252/src/spatial-scene/behavior-bake.ts",
        "checkedOn": "2026-09-24"
      }
    ],
    "observations": [
      "The rendered hub contains one entry for each live registered consumer: TextButler, Excalibur (xcb), Clankdar and SlopCamera. ALGAL consuming another product is excluded.",
      "These integrations divide into full runtime embedding, expression-only evaluation and effect-free behavior baking; sharing a dependency does not imply the same execution model."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "A reader could believe a product depends on ALGAL when the relation is not recorded, or follow a link to a post that does not exist.",
    "refreshTriggers": [
      "A change to any ALGAL relation's detail sentence in the portfolio facts, or a relation added or removed",
      "The @hraness/design-kit/portfolio subpath regenerating with ALGAL relations",
      "Any linked 'How <product> uses ALGAL' post going live, moving or being archived",
      "An ALGAL release or status change in site/copy.ts",
      "A rename of ALGAL or of TextButler, Excalibur (xcb), Clankdar or SlopCamera"
    ]
  },
  {
    "href": "/blog/software-that-accumulates-competence/",
    "lifecycle": "indexable",
    "readerJob": "Understand what ALGAL is betting on and what evidence would settle the bet.",
    "nonObviousAnswer": "The claim is that a computer can keep tested ways of acting and reuse them, not that a model writes code; the post names what would count as evidence.",
    "originalContribution": "A concrete experiment for testing whether saved procedures improve later work, including transfer, composition, cost and failed-case evidence.",
    "hostFit": "Explains the hypothesis behind ALGAL and how its evaluation and storage contracts make that hypothesis testable.",
    "nearestUrls": [],
    "sources": [
      {
        "title": "ALGAL vision and evidence standard",
        "url": "https://github.com/hraness/algal/blob/65a09ff08ef51324f371cc71b8b2248265c8364c/docs/vision.md",
        "checkedOn": "2026-10-01"
      },
      {
        "title": "Foundry evaluation contract",
        "url": "https://github.com/hraness/algal/blob/65a09ff08ef51324f371cc71b8b2248265c8364c/spec/v1/foundry.md",
        "checkedOn": "2026-10-01"
      }
    ],
    "observations": [
      "The article distinguishes a proposed experiment from a demonstrated improvement and identifies later held-out work as the decisive test.",
      "The billing-complaint example separates reusable procedure discovery from answering one task and makes retrieval, arithmetic and escalation explicit stages."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "Unreviewed claims about ALGAL or cited research could mislead a reader choosing a runtime.",
    "refreshTriggers": [
      "An independent review of the post",
      "A change to the ALGAL behavior the post describes"
    ]
  },
  {
    "href": "/blog/self-evolving-software-selection-boundary/",
    "lifecycle": "indexable",
    "readerJob": "See how self-improving program research decides which proposed program gets to run.",
    "nonObviousAnswer": "Published systems converge on propose, evaluate, select; ALGAL makes the selection step a checked contract instead of a convention.",
    "originalContribution": "Explains why proposing a candidate grants no permission, and how typed program checks, evaluation cases and host selection divide responsibility.",
    "hostFit": "Connects the ALGAL proposal and selection contracts to published program-improvement research.",
    "nearestUrls": [],
    "sources": [
      {
        "title": "Foundry evaluation and selection contract",
        "url": "https://github.com/hraness/algal/blob/65a09ff08ef51324f371cc71b8b2248265c8364c/spec/v1/foundry.md",
        "checkedOn": "2026-10-01"
      },
      {
        "title": "ALGAL program contract",
        "url": "https://github.com/hraness/algal/blob/65a09ff08ef51324f371cc71b8b2248265c8364c/spec/v1/organism.md",
        "checkedOn": "2026-10-01"
      },
      {
        "title": "AlphaEvolve: verified algorithm-discovery results and evaluation loop",
        "url": "https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/",
        "checkedOn": "2026-10-01"
      }
    ],
    "observations": [
      "The AlphaEvolve claim is limited to multiplying 4\u00d74 complex-valued matrices using 48 scalar multiplications, matching the primary report.",
      "The article separates validity of a recorded selection from evidence that the chosen program improves later work."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "Unreviewed claims about ALGAL or cited research could mislead a reader choosing a runtime.",
    "refreshTriggers": [
      "An independent review of the post",
      "A change to the ALGAL behavior the post describes"
    ]
  },
  {
    "href": "/blog/receipts-fossil-record/",
    "lifecycle": "indexable",
    "readerJob": "Learn what an ALGAL run record contains and what replaying it offline proves.",
    "nonObviousAnswer": "Replay shows a run was internally consistent with its recorded model answers, not that a model's answer was true; resume, exported evidence, and audited program selection all rest on that same record.",
    "originalContribution": "Separates logs, traces, orchestrator history, and replayable receipts by whom each asks you to trust, and ties each ALGAL feature that depends on receipts to the command or spec that implements it.",
    "hostFit": "Explains ALGAL's own run record, with commands a reader can run against the receipts this site publishes.",
    "nearestUrls": [
      {
        "url": "/compare/temporal/",
        "distinction": "Compares ALGAL's receipts with Temporal's event history to help choose a tool; this post explains what a receipt holds and what replay proves."
      },
      {
        "url": "/docs/spec/replay/",
        "distinction": "The contract for replaying a revised program against a recorded run; this post covers verifying the original run."
      }
    ],
    "sources": [
      {
        "title": "Run event kinds and the cached flag on effects",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/src/run.ts",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Organism spec: spawn cells run nested under the parent and emit the child manifest digest",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/spec/v1/organism.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Process evidence spec: the exported document and its size limits",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/spec/v1/process-evidence.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Foundry spec: reports list each run with its manifest and receipt",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/spec/v1/foundry.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Replay spec: replaying a revised program against a recorded run",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/spec/v1/replay.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "CLI entry point: verify, diff, diagnose, and process export",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/cli.ts",
        "checkedOn": "2026-09-28"
      }
    ],
    "observations": [
      "The event list named only five kinds; src/run.ts also records cell.fail and cell.suspend, so the review added both.",
      "The post said a spawned run's own digest is written onto the parent's receipt. The organism spec runs a spawned program nested inside the parent and records the child manifest's digest, so the review corrected the claim.",
      "The post described process export as a size-limited bundle; the review named the JSON document and the verify-evidence command that checks it without a store."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "A reader could treat a verified receipt as proof that a model's answer was correct, or expect replay to cover a command or event the runtime does not record.",
    "refreshTriggers": [
      "A change to the RunEvent kinds or the cached flag in src/run.ts",
      "A change to spawn provenance in spec/v1/organism.md",
      "A rename or removal of algal verify, algal diff, algal diagnose, or algal process export",
      "A move of the linked blog posts"
    ]
  },
  {
    "href": "/blog/programs-that-wait/",
    "lifecycle": "indexable",
    "readerJob": "Understand how an ALGAL program can wait for days for an approval and resume in a new process or the other runtime.",
    "nonObviousAnswer": "The wait is saved in the store as the manifest digest, the recorded effects, and the wake permission the host granted, so a later process on the same machine, running either runtime, can verify the checkpoint and continue with no permission it did not have before.",
    "originalContribution": "Walks one approval from checkpoint to final receipt and explains the manifest, storage and tool authority a host needs to resume it.",
    "hostFit": "Describes ALGAL's durable process contract and the approval example on this site's tour.",
    "nearestUrls": [
      {
        "url": "/compare/temporal/",
        "distinction": "Decides between Temporal and ALGAL; this post explains how an ALGAL wait is stored and resumed."
      },
      {
        "url": "/docs/vm/",
        "distinction": "The runnable demonstration with measured behavior; this post explains the design behind it without the setup steps."
      }
    ],
    "sources": [
      {
        "title": "Process spec: the process record (manifest digest, receipt, wake list), resume rules, and the exact-prefix rule for resumed generations",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/spec/v1/process.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Mailbox spec: message count and size limits, delivery dedupe, and consumed-message records",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/spec/v1/mailbox.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Process VM guide: the approval example, cross-runtime resume, and the limits on external effects",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/docs/vm.md",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Adoption boundary: moving a running process to another machine is not built",
        "url": "https://github.com/hraness/algal/blob/57c0d8aa0ae2398119b5635edafa370af7d9072a/site/copy.ts",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Temporal event history",
        "url": "https://docs.temporal.io/workflow-execution/event",
        "checkedOn": "2026-09-28"
      },
      {
        "title": "Temporal TypeScript testing: replaying an exported event history against workflow code",
        "url": "https://docs.temporal.io/develop/typescript/testing-suite#replay",
        "checkedOn": "2026-09-28"
      }
    ],
    "observations": [
      "The post said a different host could resume a wait, which contradicts the adoption boundary on the home page; the review limited resume to processes on the machine that holds the store and states the limit.",
      "The approval example publishes a report to a local mailbox and deploys nothing; the review says so, matching the tour's own caption.",
      "The final receipt holds the whole approval run because each resumed generation must keep the earlier generation's effects as an exact prefix; the review added that reason from the process spec."
    ],
    "scores": {
      "readerUtility": 2,
      "originalEvidence": 1,
      "factualConfidence": 2,
      "hostFit": 2,
      "voiceIntegrity": 2,
      "maintenanceValue": 2
    },
    "owner": "Hraness",
    "drafting": "ai",
    "review": {
      "reviewer": "Codex (GPT-6), independent AI editorial review",
      "reviewerType": "ai",
      "reviewedOn": "2026-10-01"
    },
    "humanReview": null,
    "reassessOn": "2026-11-12",
    "harmIfWrong": "A reader could plan to move a waiting process between machines, or expect the approval example to gate a real deployment.",
    "refreshTriggers": [
      "Moving a running process to another machine becoming supported",
      "A change to the process record fields or resume rules in spec/v1/process.md",
      "A change to mailbox limits or delivery dedupe in spec/v1/mailbox.md",
      "A change to the approval example on the tour"
    ]
  }
];

/** Sources shown under each post. Private repositories stay in the record only. */
export const BLOG_SOURCES: Readonly<Record<string, readonly ArticleSourceItem[]>> = Object.fromEntries(
  BLOG_ADMISSIONS.map(record => [record.href.split("/")[2], record.sources.map(item => ({ title: item.title, href: item.url, checkedOn: item.checkedOn }))]),
);

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
