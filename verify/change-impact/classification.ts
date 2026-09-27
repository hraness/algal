/**
 * verify/change-impact/classification.ts — the declared input-class table.
 *
 * This is the lane's mutable mapping surface: an ordered list of rules that
 * assigns every governed input a class and the suite names that class policy
 * implies. The FIRST matching rule wins, so a new lane, workflow, or source
 * root that no rule covers resolves to the `unmapped` class and fails the
 * policy check — the closed-world gate this suite exists to enforce.
 *
 * The class table is *not* the safety net by itself: `semanticFloor` in this
 * file is a second, independent predicate naming the inputs that may never
 * be discharged by classification alone. A rule (or a mutated row) that
 * hands a semantic-floor input a non-semantic class or an empty required
 * set is rejected by the checker in `policy.ts`.
 */
import { requireThat } from "../lib/schema";
import { SUITES } from "../lib/suites";

/** The aggregate pseudo-suite from verify/lib/runner.ts: every READY suite
 *  plus every activated required property evidence suite. It is the honest
 *  conservative requirement for a semantic input with no finer binding. */
export const AGGREGATE_SUITE = "all-required";

/** Registry readmission + runner self-verification: `claims` re-admits the
 *  property ledger (stale digest detection, inventory equality) and
 *  `runner-selftest` re-executes verify/lib, verify/tests, the TLA adapter
 *  test and the reference-lane selftest components. Together with the
 *  aggregate these form the "aggregate + readmission chain" that edits to
 *  verify/lib/*.ts and scripts/verify.ts must trigger. */
export const READMISSION_SUITES = ["claims", "runner-selftest"] as const;

export const CLASSES = [
  "runner-core",    // verify/lib/** + scripts/verify.ts — the suite machinery itself
  "registry",       // properties.json / assumptions.md — the claim ledger
  "toolchain-pin",  // tool versions, lockfiles, compiler pins
  "suite-source",   // files inside a named verify/<lane> directory
  "production",     // src/** non-test, crates/**, cli.ts, index.ts
  "spec",           // spec/** normative documents
  "test",           // test code outside verify/ (src/**.test.ts, tests/, ...)
  "ci",             // .github/workflows/** delivery gates
  "gate-script",    // scripts/** preserved integration-gate implementations
  "site",           // site/** executable source (build code, workers, configs)
  "fixture",        // examples/** bundled manifests, responses and harness code
  "generated",      // committed tool outputs (src/algal_expr.wasm)
  "documentation",  // prose: docs, READMEs, site pages/assets
  "unmapped",       // no rule matched — always a policy violation
] as const;
export type InputClass = (typeof CLASSES)[number];

/** Classes that carry semantics and therefore must resolve to at least one
 *  required suite. Every other class is an explicit non-semantic discharge. */
export const SEMANTIC_CLASSES: ReadonlySet<InputClass> = new Set([
  "runner-core", "registry", "toolchain-pin", "suite-source",
  "production", "spec", "test", "ci", "gate-script", "site",
]);

export type RuleMatch = {
  exact?: string;                    // whole normalized path
  prefix?: string;                   // directory prefix ending in "/"
  suffixes?: readonly string[];      // any-of filename suffixes (e.g. ".test.ts")
  contains?: string;                 // substring that must appear (e.g. "/tests/")
};
export type Rule = {
  name: string;
  class: InputClass;
  match: RuleMatch;
  suites: readonly string[];         // class-implied required suites (may be empty)
  note: string;
};

export function ruleMatches(match: RuleMatch, path: string): boolean {
  if (match.exact !== undefined && match.exact !== path) return false;
  if (match.prefix !== undefined && !path.startsWith(match.prefix)) return false;
  if (match.suffixes !== undefined && !match.suffixes.some(suffix => path.endsWith(suffix))) return false;
  if (match.contains !== undefined && !path.includes(match.contains)) return false;
  return true;
}

const RUNNER_CHAIN = [AGGREGATE_SUITE, ...READMISSION_SUITES] as const;
const TLA_MODEL_SUITES = ["application-model", "authority-model", "custody", "lease-model", "mailbox-model", "outbox-model", "process-model", "publication", "quota-model"] as const;
const LEAN_SUITES = ["lean-admission", "lean-core", "lean-expr", "lean-memory", "lean-replay", "lean-source"] as const;

/** Ordered classification rules. First match wins; nested directories list
 *  their more specific prefixes first. Lane suites are the ones the runner
 *  (`verify/lib/runner.ts` `executeSuite`) binds to each directory. */
export const RULES: readonly Rule[] = [
  // --- the ledger itself ---------------------------------------------------
  { name: "registry-properties", class: "registry", match: { exact: "verify/properties.json" },
    suites: ["claims", AGGREGATE_SUITE],
    note: "the property ledger; an edit re-opens every bound digest and suite mapping" },
  { name: "registry-assumptions", class: "registry", match: { exact: "verify/assumptions.md" },
    suites: ["claims", AGGREGATE_SUITE],
    note: "assumption identifiers consumed by the claims suite" },
  { name: "registry-toolchains", class: "toolchain-pin", match: { exact: "verify/toolchains.json" },
    suites: ["claims", "toolchain-smoke", AGGREGATE_SUITE],
    note: "pinned tool identities and checksums" },
  { name: "registry-toolchain-distributions", class: "toolchain-pin", match: { exact: "verify/toolchain-distributions.json" },
    suites: ["claims", "toolchain-smoke", AGGREGATE_SUITE],
    note: "pinned tool distribution identities" },

  // --- the runner core: aggregate + readmission chain ----------------------
  { name: "runner-library", class: "runner-core", match: { prefix: "verify/lib/" },
    suites: RUNNER_CHAIN,
    note: "runner, suites registry, input binding, evidence retention, claims: the aggregate plus the claims/runner-selftest readmission chain" },
  { name: "runner-entrypoint", class: "runner-core", match: { exact: "scripts/verify.ts" },
    suites: RUNNER_CHAIN,
    note: "the suite entry point; same chain as verify/lib" },
  { name: "verify-readme", class: "documentation", match: { exact: "verify/README.md" },
    suites: [],
    note: "verification registry documentation; prose only" },
  // Exact single-file rules must precede the prefix rules below.
  { name: "root-cli", class: "production", match: { exact: "cli.ts" },
    suites: [], note: "CLI entry point" },
  { name: "root-index", class: "production", match: { exact: "index.ts" },
    suites: [], note: "package public surface" },
  { name: "generated-expr-wasm", class: "generated", match: { exact: "src/algal_expr.wasm" },
    suites: ["artifact", "expr-abi", "expr-conformance"],
    note: "rebuilt byte-for-byte by the artifact suite from crates/algal-expr; never edited directly" },

  // --- verification lanes (suite-source) -----------------------------------
  // Directories the runner binds to exactly one suite, or the fixed set the
  // dispatch table in verify/lib/runner.ts gives them.
  { name: "lane-tests", class: "suite-source", match: { prefix: "verify/tests/" },
    suites: ["runner-selftest"], note: "runner selftest components" },
  { name: "lane-admission", class: "suite-source", match: { prefix: "verify/admission/" },
    suites: ["lean-admission"], note: "lean-admission executes this directory as its selftest leg" },
  { name: "lane-artifact", class: "suite-source", match: { prefix: "verify/artifact/" },
    suites: ["artifact"], note: "WASM rebuild and artifact identity suite" },
  { name: "lane-boundary", class: "suite-source", match: { prefix: "verify/boundary/" },
    suites: ["boundary"], note: "boundary target driver" },
  { name: "lane-context-laws", class: "suite-source", match: { prefix: "verify/context-laws/" },
    suites: ["context-laws"], note: "context/compaction/recall law lane" },
  { name: "lane-corpus", class: "suite-source", match: { prefix: "verify/corpus/" },
    suites: ["corpus", "runner-selftest"], note: "corpus suite plus runner-selftest component" },
  { name: "lane-custody", class: "suite-source", match: { prefix: "verify/custody/" },
    suites: ["custody"], note: "custody runtime schedule driver" },
  { name: "lane-change-impact", class: "suite-source", match: { prefix: "verify/change-impact/" },
    suites: ["change-impact"], note: "this lane" },
  { name: "lane-differential", class: "suite-source", match: { prefix: "verify/differential/" },
    suites: ["differential"], note: "differential suite" },
  { name: "lane-evolution", class: "suite-source", match: { prefix: "verify/evolution/" },
    suites: ["evolution-model"], note: "evolution-model suite" },
  { name: "lane-expr", class: "suite-source", match: { prefix: "verify/expr/" },
    suites: ["expr-abi", "expr-conformance"], note: "both expression conformance suites read this lane" },
  { name: "lane-fuzz", class: "suite-source", match: { prefix: "verify/fuzz/" },
    suites: ["fuzz-smoke"], note: "fuzz-smoke suite" },
  { name: "lane-host", class: "suite-source", match: { prefix: "verify/host/" },
    suites: ["host-conformance"], note: "host-conformance suite" },
  { name: "lane-lean", class: "suite-source", match: { prefix: "verify/lean/" },
    suites: [...LEAN_SUITES, "runner-selftest"],
    note: "shared Lean toolchain, lakefile and modules feed every lean-* suite; runner-selftest reads lane vectors" },
  { name: "lane-memory-authority", class: "suite-source", match: { prefix: "verify/memory-authority/" },
    suites: ["memory-authority"], note: "memory-authority suite" },
  { name: "lane-memory-mutation", class: "suite-source", match: { prefix: "verify/memory-mutation/" },
    suites: ["memory-mutation"], note: "memory-mutation suite" },
  { name: "lane-evidence-mutation", class: "suite-source", match: { prefix: "verify/mutation/" },
    suites: ["evidence-mutation"], note: "evidence-mutation suite" },
  { name: "lane-policy-mutation", class: "suite-source", match: { prefix: "verify/policy-mutation/" },
    suites: ["policy-mutation"], note: "policy-mutation suite" },
  { name: "lane-protocols", class: "suite-source", match: { prefix: "verify/protocols/" },
    suites: ["lease-conformance", "mailbox-conformance", "process-conformance", "stateful-app"],
    note: "shared protocol conformance driver" },
  { name: "lane-receipt", class: "suite-source", match: { prefix: "verify/receipt/" },
    suites: ["receipt-closure"], note: "receipt-closure suite" },
  { name: "lane-reference-memory", class: "suite-source", match: { prefix: "verify/reference/memory/" },
    suites: ["memory-oracle"], note: "independent memory checker oracle; importing lanes add their suites transitively" },
  { name: "lane-reference-spawn", class: "suite-source", match: { prefix: "verify/reference/spawn/" },
    suites: ["runner-selftest", "spawn-conformance"], note: "spawn-conformance plus runner-selftest component" },
  { name: "lane-reference-application", class: "suite-source", match: { prefix: "verify/reference/application/" },
    suites: ["application-history-slice", "runner-selftest"], note: "history-slice suite plus runner-selftest history groups" },
  { name: "lane-reference-scheduler", class: "suite-source", match: { prefix: "verify/reference/scheduler/" },
    suites: ["scheduler-conformance", "scheduler-model"], note: "scheduler oracle suites" },
  { name: "lane-reference-shared", class: "suite-source", match: { prefix: "verify/reference/" },
    suites: ["application-history-slice", "memory-oracle", "runner-selftest", "scheduler-conformance", "scheduler-model", "spawn-conformance"],
    note: "shared reference files feed every reference lane" },
  { name: "lane-lean-replay", class: "suite-source", match: { prefix: "verify/replay/lean-replay/" },
    suites: ["lean-replay"], note: "lean-replay suite" },
  { name: "lane-replay-isolation", class: "suite-source", match: { prefix: "verify/replay/replay-isolation/" },
    suites: ["replay-isolation"], note: "replay-isolation suite" },
  { name: "lane-replay-shared", class: "suite-source", match: { prefix: "verify/replay/" },
    suites: ["lean-replay", "replay-isolation"], note: "shared replay files feed both replay suites" },
  { name: "lane-rust-bridge", class: "suite-source", match: { prefix: "verify/rust-bridge/" },
    suites: ["bridge-drift", "kani", "rust-bridge"],
    note: "Phase 12 direct-verification lane; all three suites are planned" },
  { name: "lane-source", class: "suite-source", match: { prefix: "verify/source/" },
    suites: ["source-differential", "source-reference"], note: "source semantics lanes" },
  { name: "lane-stateful", class: "suite-source", match: { prefix: "verify/stateful/" },
    suites: ["fault-harness", "stateful"], note: "native stateful/fault-harness driver" },
  { name: "lane-tla-custody", class: "suite-source", match: { prefix: "verify/tla/custody/" },
    suites: ["custody"], note: "custody models" },
  { name: "lane-tla-publication", class: "suite-source", match: { prefix: "verify/tla/publication/" },
    suites: ["publication"], note: "publication models" },
  { name: "lane-tla-process", class: "suite-source", match: { prefix: "verify/tla/process/" },
    suites: ["process-model"], note: "process models" },
  { name: "lane-tla-process-journal", class: "suite-source", match: { prefix: "verify/tla/process-journal/" },
    suites: ["process-model"], note: "journal models folded into the process-model suite" },
  { name: "lane-tla-mailbox", class: "suite-source", match: { prefix: "verify/tla/mailbox/" },
    suites: ["mailbox-model"], note: "mailbox models" },
  { name: "lane-tla-lease", class: "suite-source", match: { prefix: "verify/tla/lease/" },
    suites: ["lease-model"], note: "lease models" },
  { name: "lane-tla-application", class: "suite-source", match: { prefix: "verify/tla/application/" },
    suites: ["application-model"], note: "application models" },
  { name: "lane-tla-outbox", class: "suite-source", match: { prefix: "verify/tla/outbox/" },
    suites: ["outbox-model"], note: "outbox models" },
  { name: "lane-tla-quota", class: "suite-source", match: { prefix: "verify/tla/quota/" },
    suites: ["quota-model"], note: "quota models" },
  { name: "lane-tla-authority", class: "suite-source", match: { prefix: "verify/tla/authority/" },
    suites: ["authority-model"], note: "authority models" },
  { name: "lane-tla-shared", class: "suite-source", match: { prefix: "verify/tla/" },
    suites: [...TLA_MODEL_SUITES, "runner-selftest"],
    note: "shared TLA definitions/runtime/fixtures plus the tlc.test.ts selftest" },
  { name: "lane-toolchain-smoke", class: "suite-source", match: { prefix: "verify/toolchain-smoke/" },
    suites: ["toolchain-smoke"], note: "toolchain smoke lane and its recorded tool logs" },
  { name: "lane-traces", class: "suite-source", match: { prefix: "verify/traces/" },
    suites: ["fault-harness", "stateful", "traces"],
    note: "trace schema/generator shared by all three stateful suites" },

  // --- governed source roots ------------------------------------------------
  { name: "ci-workflows", class: "ci", match: { prefix: ".github/workflows/" },
    suites: [], note: "delivery gates; property bindings apply, otherwise the aggregate" },
  { name: "src-tests", class: "test", match: { prefix: "src/", suffixes: [".test.ts"] },
    suites: [], note: "production test code; suites come from the runner dispatch table" },
  { name: "src-production", class: "production", match: { prefix: "src/" },
    suites: [], note: "production TypeScript; suites come from property source bindings" },
  { name: "crates-tests", class: "test", match: { prefix: "crates/", contains: "/tests/" },
    suites: [], note: "native test code" },
  { name: "crates-production", class: "production", match: { prefix: "crates/" },
    suites: [], note: "native production Rust; property bindings plus cargo gates" },
  { name: "spec", class: "spec", match: { prefix: "spec/" },
    suites: [], note: "normative contract documents; suites come from property spec bindings" },
  { name: "root-tests", class: "test", match: { prefix: "tests/" },
    suites: [], note: "browser qualification helpers" },
  { name: "gate-scripts", class: "gate-script", match: { prefix: "scripts/" },
    suites: [], note: "preserved-gate and tooling scripts; see the row's gate hint" },
  { name: "examples-tests", class: "test", match: { prefix: "examples/", suffixes: [".test.ts"] },
    suites: [], note: "example tests executed by the repository test command" },
  { name: "examples-fixtures", class: "fixture", match: { prefix: "examples/" },
    suites: [], note: "bundled manifests, scripted responses and example harness code" },
  { name: "site-tests", class: "test", match: { prefix: "site/", suffixes: [".test.ts"] },
    suites: [], note: "site test code" },
  { name: "site-code", class: "site", match: { prefix: "site/", suffixes: [".ts", ".tsx", ".json"] },
    suites: [], note: "site build/runtime source" },
  { name: "site-docs", class: "documentation", match: { prefix: "site/" },
    suites: [], note: "site prose and static assets" },
  { name: "prose", class: "documentation", match: { suffixes: [".md", ".markdown", ".txt"] },
    suites: [], note: "prose documents (README, docs/, licences); property bindings still apply" },
];

// Ordered exact rules for the root toolchain pins — kept separate so the
// table above stays readable. They are appended before the prose catch-all.
const TOOLCHAIN_PINS = ["Cargo.toml", "Cargo.lock", "package.json", "bun.lock", "bun.lockb", "tsconfig.json", "rust-toolchain", "rust-toolchain.toml", ".cargo/config", ".cargo/config.toml"] as const;
const pinRules: readonly Rule[] = TOOLCHAIN_PINS.map(path => ({
  name: `pin-${path.replaceAll("/", "-").replaceAll(".", "-")}`,
  class: "toolchain-pin" as const,
  match: { exact: path },
  suites: ["claims", "toolchain-smoke", AGGREGATE_SUITE],
  note: "root toolchain/dependency pin",
}));

/** The complete ordered table: toolchain pins must outrank the prose rule
 *  only by extension, so the final order is [...main, ...pins] with pins
 *  inserted before `prose`. Construction keeps the table legible. */
const proseIndex = RULES.findIndex(rule => rule.name === "prose");
export const CLASSIFICATION_RULES: readonly Rule[] = [
  ...RULES.slice(0, proseIndex), ...pinRules, ...RULES.slice(proseIndex),
];

// Validate the table at module load: bounded, unique names, known suites,
// and every rule carries at least one predicate and a rationale.
requireThat(CLASSIFICATION_RULES.length > 0 && CLASSIFICATION_RULES.length <= 128, "classification rule bound");
const seen = new Set<string>();
for (const rule of CLASSIFICATION_RULES) {
  requireThat(!seen.has(rule.name), `duplicate rule ${rule.name}`);
  seen.add(rule.name);
  requireThat(CLASSES.includes(rule.class), `${rule.name}: unknown class`);
  requireThat(rule.suites.length <= 16, `${rule.name}: suite bound`);
  for (const suite of rule.suites) {
    requireThat(suite === AGGREGATE_SUITE || SUITES.has(suite), `${rule.name}: unknown suite ${suite}`);
  }
  requireThat(
    rule.match.exact !== undefined || rule.match.prefix !== undefined || rule.match.suffixes !== undefined || rule.match.contains !== undefined,
    `${rule.name}: a rule needs at least one predicate`,
  );
  requireThat(rule.note.length > 0 && rule.note.length <= 512, `${rule.name}: rationale bound`);
}

export function ruleFor(path: string): Rule | undefined {
  for (const rule of CLASSIFICATION_RULES) if (ruleMatches(rule.match, path)) return rule;
  return undefined;
}

/** The semantic floor — the independent policy predicate. A path satisfying
 *  this may never be discharged by classification alone and may never carry
 *  a non-semantic class, regardless of what the rule table above says. It is
 *  deliberately coarse: it names trees whose edits are definitionally
 *  semantic (production source, spec, workflows, verification machinery,
 *  toolchain pins, scripts, tests) and lets everything else be classified. */
export function semanticFloor(path: string): boolean {
  if (path === "scripts/verify.ts" || path.startsWith("verify/lib/")) return true;
  if (["verify/properties.json", "verify/assumptions.md", "verify/toolchains.json", "verify/toolchain-distributions.json"].includes(path)) return true;
  if (path.startsWith("verify/")) return !/\.(md|txt)$/.test(path);
  if (path.startsWith("src/") || path.startsWith("crates/") || path.startsWith("spec/")) return true;
  if (path.startsWith("tests/") || path.startsWith("scripts/") || path.startsWith(".github/workflows/")) return true;
  if (path === "cli.ts" || path === "index.ts") return true;
  if (TOOLCHAIN_PINS.includes(path as (typeof TOOLCHAIN_PINS)[number])) return true;
  if (path.startsWith("site/")) return /\.(ts|tsx|json)$/.test(path);
  return false;
}

/** Preserved integration-gate commands for the scripts they execute, so a
 *  change to a gate implementation names the gate that re-runs it. Advisory
 *  context only — the required-suite field remains authoritative. */
export const GATE_HINTS: Readonly<Record<string, string>> = {
  "scripts/native-parity.ts": "bun scripts/native-parity.ts",
  "scripts/application-parity.ts": "bun scripts/application-parity.ts",
  "scripts/process-parity.ts": "bun scripts/process-parity.ts",
  "scripts/store-parity.ts": "bun scripts/store-parity.ts",
  "scripts/cli-parity.ts": "bun scripts/cli-parity.ts",
  "scripts/source-inspection-parity.ts": "bun scripts/source-inspection-parity.ts",
  "scripts/schema-parity.ts": "bun scripts/schema-parity.ts",
  "scripts/compilation-parity.ts": "bun scripts/compilation-parity.ts",
  "scripts/work-budget-parity.ts": "bun scripts/work-budget-parity.ts",
  "scripts/mailbox-admission-parity.ts": "bun scripts/mailbox-admission-parity.ts",
  "scripts/vm-demo.ts": "bun scripts/vm-demo.ts --native ./target/debug/algal",
  "scripts/recovery-demo.ts": "bun scripts/recovery-demo.ts --native ./target/debug/algal",
  "scripts/repair-demo.ts": "bun scripts/repair-demo.ts --native ./target/debug/algal",
  "scripts/coding-recovery-demo.ts": "bun scripts/coding-recovery-demo.ts --native ./target/debug/algal",
  "scripts/process-evidence-demo.ts": "bun scripts/process-evidence-demo.ts --native ./target/debug/algal",
  "scripts/test-release-workflow.py": "python3 scripts/test-release-workflow.py",
  "scripts/test-native-release.py": "python3 scripts/test-native-release.py",
  "scripts/test_apple_brief_demo.py": "python3 scripts/test_apple_brief_demo.py",
};

/** TLA model-suite names keyed by the `TlcSuite` identifiers used inside
 *  verify/tla/definitions.ts (LIVE_SOURCES / ADAPTER_SOURCES / MODEL_PROFILES). */
export const TLC_SUITE_NAME: Readonly<Record<string, string>> = {
  custody: "custody",
  publication: "publication",
  lease: "lease-model",
  process: "process-model",
  mailbox: "mailbox-model",
  application: "application-model",
  outbox: "outbox-model",
  quota: "quota-model",
  authority: "authority-model",
};
