/**
 * `verify/release-evidence` — the declared registry.
 *
 * Every audit leg checks the repository against these tables. The tables are
 * the lane's falsifiable baseline: a changed workflow pin, a removed
 * disclaimer, a new mixed-version paragraph, or a renamed evidence token all
 * fail the suite until a reviewer reconciles the registry.
 *
 * Nothing here asserts that an artifact is signed — every claim is pinned to
 * what the repository actually ships today. Documented gaps are named in
 * `EXPECTED_GAPS` and surfaced as findings, never silently passed.
 */

/* ------------------------------------------------------------------ */
/* Release artifact evidence contract (PKG-01..PKG-05 surface).        */
/* ------------------------------------------------------------------ */

/** Required literal members of the `algal.native-release.v1` package record
 *  emitted by `scripts/package-native.py` and re-admitted, closed-shape, by
 *  `crates/algal/src/build_info.rs`. */
export const RELEASE_METADATA_FIELDS = [
  "contract", "tag", "version", "commit", "sourceState", "target", "rustc",
  "build", "minimumPlatform", "binarySha256", "signed", "smoke",
] as const;

/** The bounded native source-input set hashed by both `crates/algal/build.rs`
 *  and `scripts/package-native.py` under `algal.native-source-inputs.v1`.
 *  `Cargo.lock` is inside the set: the lockfile digest is bound through the
 *  combined input digest, not as a standalone field. */
export const SOURCE_INPUT_ROOTS = ["Cargo.toml", "Cargo.lock", "crates", ".cargo"] as const;

/** Candidate metadata keys that would name a producing pipeline run inside
 *  the artifact record. Currently none exist — run attribution rides on the
 *  workflow's own `commit == github.sha` gate plus the same-run artifact
 *  channel (see gap `release-run-id-absent`). */
export const RUN_IDENTITY_KEYS = [
  "runId", "run_id", "runUrl", "run_url", "workflowRun", "workflowRunId",
  "pipeline", "pipelineRun", "pipelineRunId", "pipelineRunUrl",
] as const;

/* ------------------------------------------------------------------ */
/* Unsigned-package wording audit.                                     */
/* ------------------------------------------------------------------ */

/** Disclaimer phrases a prose/artifact surface must carry before it may use
 *  signing-family or verification wording near release artifacts. */
export const DISCLAIMERS: Record<string, readonly string[]> = {
  "docs/native-release.md": [
    "not a publisher signature",
    "unsigned and not notarized",
    "not authentication",
    "Production signing/notarization remains separate work",
  ],
  "README.md": ["unsigned and not notarized"],
  "site/copy.ts": ["unsigned and not notarized"],
  ".github/workflows/release.yml": ["unsigned and not notarized"],
  "scripts/package-native.py": ['"signed": False', "unsigned/not notarized"],
  "crates/algal/src/build_info.rs": ['"signed": false', 'metadata["signed"] != false'],
  "scripts/test-native-release.py": ['"signed": True', "untrusted-sidecar-refusal"],
};

/** Pinned literals whose signing vocabulary refers to a non-artifact object
 *  (a signed effect *request*, a post's review trigger, schema signatures). */
export const NON_RELEASE_LITERALS = [
  "signed request",
  "signed or notarized native packages",
  '"signature"',
] as const;

/** Tokens that scope a verification word to a bounded object on the same
 *  line (digests, checksums, receipts, archives, metadata, tags, tests). */
export const VERIFY_SCOPE =
  /\b(checksum|digest|sha256|hash|receipt|replay|offline|tests?|testing|qualif\w*|archive|binary|binaries|executable|install\w*|metadata|tag|asset|consistent|complete|integrity|closure|manifest|comparison|schedule|config|cases?|file|report|program|store|runtime|process|evidence|ledger|adapter|engine|drain|proposal|history|source|version|content|bytes|itself|`-)/i;

/** Artifact-context words: a verification/signing claim adjacent to these on
 *  a surface without a disclaimer is a violation. */
export const ARTIFACT_WORDS =
  /\b(release|package|artifact|archive|installer|prerelease|download|binary|binaries|asset|publish)\w*/i;

/** Outright forbidden on every swept surface: naming a real signing system
 *  or asserting a signed/verified artifact. */
export const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /\b(?:sigstore|cosign|minisign|notarytool|productsign|altool|codesign)\w*\b/i,
  /\b(?:GPG|PGP|X\.509|x509)\b[^.\n]*\bsign/i,
  /\bcryptographically\s+(?:signed|verified)|\bdigitally\s+signed\b/i,
  /\bprovenance\s*[:=]\s*true\b/i,
  /\bsigned\s+(?:native\s+)?(?:release|package|artifact|archive|installer|binar\w+)s?\b/i,
  /\b(?:notarized|notarized)\s+(?:release|package|artifact|archive|binar\w+)s?\b/i,
];

/* ------------------------------------------------------------------ */
/* Workflow pinning inventory.                                          */
/* ------------------------------------------------------------------ */

/** Exact `uses:` inventory per workflow: action → {ref, count}. A new
 *  action, a changed ref, or a changed count fails the audit. */
export const EXPECTED_ACTIONS: Record<string, Record<string, { ref: string; count: number }>> = {
  ".github/workflows/release.yml": {
    "actions/checkout": { ref: "v4", count: 2 },
    "actions/setup-python": { ref: "v5", count: 1 },
    "dtolnay/rust-toolchain": { ref: "master", count: 1 },
    "Swatinem/rust-cache": { ref: "v2", count: 1 },
    "actions/upload-artifact": { ref: "v4", count: 1 },
    "actions/download-artifact": { ref: "v4", count: 1 },
  },
  ".github/workflows/ci.yml": {
    "dorny/paths-filter": { ref: "v4", count: 1 },
    "actions/checkout": { ref: "v4", count: 12 },
    "oven-sh/setup-bun": { ref: "v2", count: 8 },
    "actions/cache": { ref: "v4", count: 8 },
    "actions/setup-python": { ref: "v5", count: 2 },
    "actions/setup-node": { ref: "v4", count: 1 },
    "dtolnay/rust-toolchain": { ref: "master", count: 5 },
    "Swatinem/rust-cache": { ref: "v2", count: 5 },
    "actions/upload-artifact": { ref: "v4", count: 2 },
    "actions/download-artifact": { ref: "v4", count: 3 },
  },
  ".github/workflows/expression-artifact.yml": {
    "actions/checkout": { ref: "v4", count: 1 },
    "oven-sh/setup-bun": { ref: "v2", count: 1 },
    "actions/upload-artifact": { ref: "v4", count: 2 },
  },
  ".github/workflows/dependabot-auto-merge.yml": {},
};

/** Moving-branch `uses:` refs permitted today, each one counted. All other
 *  floating refs are violations; sha-pins and full semver tags are always
 *  admissible. */
export const ALLOWED_FLOATING_REFS = [
  { action: "dtolnay/rust-toolchain", ref: "master" },
] as const;

/** Tool-version inputs and their declared pin strength. `minor`/`major`
 *  entries are recorded gaps (`pin-class-*` findings), not silent passes. */
export const EXPECTED_TOOL_PINS = [
  { file: ".github/workflows/ci.yml", action: "oven-sh/setup-bun", key: "bun-version", strength: "exact" },
  { file: ".github/workflows/ci.yml", action: "actions/setup-python", key: "python-version", strength: "minor" },
  { file: ".github/workflows/ci.yml", action: "actions/setup-node", key: "node-version", strength: "major" },
  { file: ".github/workflows/expression-artifact.yml", action: "oven-sh/setup-bun", key: "bun-version", strength: "exact" },
  { file: ".github/workflows/release.yml", action: "actions/setup-python", key: "python-version", strength: "minor" },
  { file: ".github/workflows/ci.yml", action: "dtolnay/rust-toolchain", key: "toolchain", strength: "exact" },
  { file: ".github/workflows/release.yml", action: "dtolnay/rust-toolchain", key: "toolchain", strength: "exact" },
] as const;

/** Exact toolchain literals that must appear verbatim. */
export const TOOLCHAIN_LITERALS = [
  { file: ".github/workflows/ci.yml", token: 'BUN_VERSION: "1.3.14"' },
  { file: ".github/workflows/ci.yml", token: 'RUST_TOOLCHAIN: "1.97.1"' },
  { file: ".github/workflows/release.yml", token: 'RUST_TOOLCHAIN: "1.97.1"' },
  { file: ".github/workflows/expression-artifact.yml", token: 'RUSTUP_TOOLCHAIN: "1.97.1"' },
  { file: ".github/workflows/expression-artifact.yml", token: 'ALGAL_EXPR_TOOLCHAIN: "1.97.1"' },
  { file: ".github/workflows/release.yml", token: "cargo +1.97.1 build --release --locked" },
  { file: ".github/workflows/expression-artifact.yml", token: "rustup toolchain install 1.97.1" },
] as const;

/* ------------------------------------------------------------------ */
/* Upgrade/restore fixture coverage.                                   */
/* ------------------------------------------------------------------ */

/** The exact check list `scripts/test-native-release.py` prints on success;
 *  the audit extracts the literal array and compares it. */
export const RELEASE_CHECK_NAMES = [
  "release-source-admission",
  "embedded-source-input-binding",
  "unchanged-semver",
  "package-extracted-smoke",
  "verified-install",
  "retained-hash-bound-release-identity",
  "conflicting-release-identity-refusal",
  "metadata-symlink-refusal",
  "untrusted-sidecar-refusal",
  "overwrite-refusal",
  "explicit-force",
  "tampered-checksum-refusal",
  "existing-binary-preserved",
  "relative-CARGO_TARGET_DIR",
  "staging-cleanup",
  "oversized-PAX-refusal",
  "bounded-gzip-expansion",
] as const;

/* ------------------------------------------------------------------ */
/* Documented gaps — asserted present, never silently passed.           */
/* ------------------------------------------------------------------ */

export const EXPECTED_GAPS = [
  /** The `.release.json` record binds the producing commit and tag, and the
   *  publish job re-checks `commit == github.sha` inside the same run — but
   *  no field names the workflow run itself. Run attribution is external to
   *  the artifact bytes. */
  "release-run-id-absent",
  /** Actions are pinned by major tag (`@v4`/`@v5`) and `dtolnay/rust-toolchain`
   *  by the moving `master` ref. No workflow pins an action by SHA-1. */
  "actions-not-sha-pinned",
  /** `python-version: 3.12` (minor) and `node-version: 24` (major) are
   *  range-class pins inside CI qualification lanes. */
  "python-minor-pin",
  "node-major-pin",
  /** The installer fixture reinstalls the identical archive; no upgrade
   *  between two different binary versions is exercised, and no
   *  rollback-to-previous-binary path or fixture exists. */
  "no-cross-version-upgrade-fixture",
  "no-rollback-fixture",
  /** "Older binaries preserve their original diagnostic behavior" is bound
   *  only structurally (absent-record + legacy-metadata tolerance); no
   *  shipped legacy binary is exercised. */
  "no-legacy-binary-fixture",
  /** The expression-artifact CI job runs without an explicit
   *  `timeout-minutes`. */
  "expression-artifact-timeout-missing",
] as const;

/* ------------------------------------------------------------------ */
/* Mixed-version compatibility claims.                                  */
/* ------------------------------------------------------------------ */

export interface EvidenceRef {
  /** Repository-relative file that must exist. */
  path: string;
  /** A normalized substring that must appear in that file. */
  token: string;
}

export type ClaimKind =
  /** A standing compatibility claim; each `evidence` ref must resolve. */
  | "claim-evidence"
  /** A claim whose own wording bounds it; `scoped` must appear in the unit. */
  | "claim-scoped"
  /** A dated/design surface: recorded for completeness, not a standing claim. */
  | "advisory"
  /** A keyword hit that is not a version claim (temporal "older", etc.). */
  | "non-claim";

export interface CompatUnit {
  id: string;
  file: string;
  /** Whitespace-normalized substring of the detected unit. */
  anchor: string;
  kind: ClaimKind;
  note: string;
  /** Required self-scoping substring inside the same unit. */
  scoped?: string;
  evidence?: readonly EvidenceRef[];
  /** Manually registered: the keyword detector does not flag this unit, so
   *  anchor verification is against raw file text instead. */
  manual?: boolean;
}

/** Keyword set for the mixed-version detector sweep. */
export const COMPAT_KEYWORDS =
  /\b(older|legacy|backward|earlier version|previous version|mixed[- ]version|downgrade|upgrades?|additive)\b/i;

/** Files whose every flagged unit must be registered as a claim or
 *  non-claim. Secondary docs (`docs/*.md` beyond the listed three, plus the
 *  site surfaces) are swept too; their units may register as `advisory`. */
export const COMPAT_PRIMARY_FILES = [
  "README.md",
  "CHANGELOG.md",
  "docs/native-release.md",
  "docs/use-cases.md",
  "docs/programmable-applications.md",
] as const;

export const COMPAT_UNITS: readonly CompatUnit[] = [
  /* ----- docs/native-release.md ----- */
  {
    id: "platform-qualification-limits",
    file: "docs/native-release.md",
    anchor: "older glibc systems",
    kind: "claim-scoped",
    scoped: "do not yet have equivalent package qualification",
    note: "Unsupported platforms are named, not claimed.",
  },
  {
    id: "older-binary-diagnostic",
    file: "docs/native-release.md",
    anchor: "Older binaries preserve their original diagnostic behavior",
    kind: "claim-evidence",
    evidence: [
      { path: "crates/algal/src/build_info.rs", token: '"absent"' },
      { path: "crates/algal/src/build_info.rs", token: '"rejected"' },
      { path: "scripts/unpack-native.py", token: 'build is not None or actual.get("contract") == "algal.native-build.v1"' },
    ],
    note: "Bound structurally: a record-free binary reports `absent` and a pre-`algal.native-build.v1` package record is tolerated. No shipped legacy binary is exercised — gap `no-legacy-binary-fixture`.",
  },
  {
    id: "release-tag-dispatch",
    file: "docs/native-release.md",
    anchor: "for an older release commit",
    kind: "claim-evidence",
    scoped: "The tag must resolve to the workflow event commit",
    evidence: [
      { path: "scripts/test-release-workflow.py", token: "test_old_release_works_when_dispatched_at_its_own_commit" },
    ],
    note: "Dispatching at an older ref is admitted only when the tag resolves to the event commit; the offline fixture covers it.",
  },

  /* ----- CHANGELOG.md ----- */
  {
    id: "lock-no-upgrade",
    file: "CHANGELOG.md",
    anchor: "No network, install scripts, or upgrades",
    kind: "claim-scoped",
    scoped: "No network, install scripts, or upgrades",
    note: "A capability-absence statement: `algal lock` performs no upgrade.",
  },
  {
    id: "mailbox-abi-upgrade-boundary",
    file: "CHANGELOG.md",
    anchor: "Upgrade boundary: concurrent mailbox creators sharing a store must all",
    kind: "claim-scoped",
    scoped: "must all implement this release's admission ABI",
    note: "A requirement statement; explicitly denies mixed-version mailbox creation.",
  },

  /* ----- docs/use-cases.md ----- */
  {
    id: "store-upgrade-guidance",
    file: "docs/use-cases.md",
    anchor: "Before upgrading a shared store, stop its writers and use compatible Bun/native",
    kind: "claim-evidence",
    scoped: "older creators must not run concurrently",
    evidence: [
      { path: "spec/v1/mailbox.md", token: "must not run concurrently" },
      { path: "scripts/mailbox-admission-parity.ts", token: ".mailbox-admission" },
    ],
    note: "User-facing upgrade guidance; the underlying ABI non-support is the mailbox lane's claim.",
  },

  /* ----- docs/programmable-applications.md ----- */
  {
    id: "upgrade-preserves-uncertainty",
    file: "docs/programmable-applications.md",
    anchor: "An upgrade does not rewrite an existing process definition, clear uncertainty, or create a new effect namespace",
    kind: "claim-scoped",
    scoped: "does not rewrite an existing process definition, clear uncertainty, or create a new effect namespace",
    note: "A negative invariant: upgrades preserve data and uncertainty.",
  },
  {
    id: "substrate-restart-milestone",
    file: "docs/programmable-applications.md",
    anchor: "defining restart/upgrade demonstration",
    kind: "non-claim",
    note: "Roadmap milestone wording, not a compatibility claim.",
  },

  /* ----- spec/v1/application.md ----- */
  {
    id: "custody-exclusion-old-writers",
    file: "spec/v1/application.md",
    anchor: "preserves exclusion with older writers and preserves refusal of unrecognized legacy ownership markers",
    kind: "claim-evidence",
    evidence: [
      { path: "src/application-custody.test.ts", token: "permanent old-writer custody and legacy markers remain authoritative" },
    ],
    note: "The Bun custody test exercises the older-writer exclusion and legacy-marker refusal.",
  },
  {
    id: "custody-exclusion-upgraded",
    file: "spec/v1/application.md",
    anchor: "repaired exclusion guarantee applies to cooperating upgraded writers",
    kind: "claim-evidence",
    scoped: "does not repair the original cutover race between two concurrently running older writers",
    evidence: [
      { path: "src/application-custody.test.ts", token: "permanent old-writer custody and legacy markers remain authoritative" },
    ],
    note: "Bounded mixed-version claim: upgraded↔older exclusion only; the older↔older race is explicitly excluded.",
  },
  {
    id: "dispatchpending-older-item",
    file: "spec/v1/application.md",
    anchor: "an older blocked item cannot starve a later eligible item",
    kind: "non-claim",
    note: "Temporal ordering of pending intents, not a version claim.",
  },
  {
    id: "host-channel-legacy-reject",
    file: "spec/v1/application.md",
    anchor: "Legacy `algal.host-channel.v1` files lack sufficient identity evidence",
    kind: "claim-evidence",
    scoped: "rejected unchanged pending an explicit migration",
    evidence: [
      { path: "src/application-host.test.ts", token: "reject legacy custody" },
      { path: "src/application-host.test.ts", token: '"algal.host-channel.v1"' },
    ],
    note: "v1 channel files are rejected rather than reinterpreted; the host test writes a v1 file and asserts rejection.",
  },
  {
    id: "legacy-outcome-shape",
    file: "spec/v1/application.md",
    anchor: "Legacy v1 outcomes retain their embedded receipt shape unchanged",
    kind: "claim-evidence",
    scoped: "consumers requiring execution evidence must reject that absence",
    evidence: [
      { path: "src/source-dependencies-application.test.ts", token: "receipt absent" },
      { path: "src/application-host.test.ts", token: '"algal.episode-outcome.v2"' },
    ],
    note: "Retention half is the additive-field contract; the consumer-side rejection leg is exercised.",
  },
  {
    id: "legacy-revision-goals",
    file: "spec/v1/application.md",
    anchor: "Legacy revisions omit this field; normalization does not insert it",
    kind: "claim-evidence",
    evidence: [
      { path: "src/application-goal.test.ts", token: "preserve legacy revision absence" },
    ],
    note: "The goals test parses a legacy revision and asserts the field is not synthesized.",
  },
  {
    id: "legacy-views-goals",
    file: "spec/v1/application.md",
    anchor: "Legacy views without goals keep their previous canonical representation",
    kind: "claim-evidence",
    evidence: [
      { path: "src/application-view.test.ts", token: "parseApplicationView" },
      { path: "src/application-goal.test.ts", token: "preserve legacy revision absence" },
    ],
    note: "Non-inserting normalization is the revision-side mechanism; the view parser asserts shape.",
  },
  {
    id: "legacy-view-evidence",
    file: "spec/v1/application.md",
    anchor: "legacy view that omits `evidence` keeps that absence",
    kind: "claim-evidence",
    evidence: [
      { path: "src/application-view-evidence.test.ts", token: "parseApplicationViewEvidence" },
      { path: "src/application-view.test.ts", token: "parseApplicationView" },
    ],
    note: "View evidence stays absent for legacy views; the parser keeps canonical bytes.",
  },

  /* ----- spec/v1/coding-job*.md ----- */
  {
    id: "coding-job-witness-eviction",
    file: "spec/v1/coding-job-v2.md",
    anchor: "never evicts an older witness",
    kind: "non-claim",
    note: "Temporal retention of an older retained record, not a version claim.",
  },
  {
    id: "coding-job-v1-boundary",
    file: "spec/v1/coding-job.md",
    anchor: "it cannot migrate or reconcile an existing v1 job",
    kind: "claim-evidence",
    evidence: [
      { path: "src/coding-jobs-operations.test.ts", token: "legacy reconciliation fails before any adapter call and its wire stays v1" },
      { path: "src/coding-jobs.ts", token: "legacy coding jobs have no operation reconciliation protocol" },
    ],
    note: "v2 explicitly cannot touch v1 jobs; the service rejects legacy reconciliation before the adapter runs.",
  },

  /* ----- spec/v1/mailbox.md ----- */
  {
    id: "mailbox-legacy-markers",
    file: "spec/v1/mailbox.md",
    anchor: "Unknown legacy markers remain blocked",
    kind: "claim-evidence",
    evidence: [
      { path: "src/mailbox-admission.test.ts", token: ".mailbox-admission" },
      { path: "scripts/mailbox-admission-parity.ts", token: ".mailbox-admission" },
    ],
    note: "Legacy markers stay blocked under the admission ABI; both runtimes exercise the marker paths.",
  },
  {
    id: "mailbox-abi-non-support",
    file: "spec/v1/mailbox.md",
    anchor: "Older versions that create mailboxes without the admission lease must not run concurrently",
    kind: "claim-scoped",
    scoped: "does not automatically reconcile interrupted mailbox sends or receives or remove their legacy fail-closed locks",
    note: "An explicit non-support statement — the correct posture for an unsupported mixed-version combination.",
  },

  /* ----- spec/v1/organism.md ----- */
  {
    id: "legacy-record-qualification",
    file: "spec/v1/organism.md",
    anchor: "reading an arbitrary legacy or imported record does not retroactively qualify its dependency graph",
    kind: "claim-scoped",
    scoped: "does not retroactively qualify",
    note: "A denial: legacy/imported records gain no retroactive qualification.",
  },
  {
    id: "claim-only-uncertainty",
    file: "spec/v1/organism.md",
    anchor: "Legacy claim-only states cannot be retroactively distinguished",
    kind: "claim-evidence",
    scoped: "cannot be retroactively distinguished",
    evidence: [
      { path: "src/mailbox-admission.test.ts", token: ".mailbox-admission" },
      { path: "scripts/mailbox-admission-parity.ts", token: ".mailbox-admission" },
    ],
    note: "The same unit carries 'Clean v1 layouts and wire records are unchanged' (covered by the mailbox admission ABI fixtures) and bounds interrupted-operation ambiguity: uncertainty is preserved, not resolved.",
  },
  {
    id: "legacy-adapter-defaults",
    file: "spec/v1/organism.md",
    anchor: "a legacy adapter never silently gains approval, decision, or index authority",
    kind: "claim-evidence",
    evidence: [
      { path: "src/effects.ts", token: "?? MODEL_EFFECT_KINDS" },
      { path: "src/effects.ts", token: 'MODEL_EFFECT_KINDS = ["agent", "classifier"]' },
    ],
    note: "Undeclared executors default to agent/classifier only via the nullish default in effects.ts.",
  },
  {
    id: "schema-replay-boundary",
    file: "spec/v1/organism.md",
    anchor: "Older Bun schema-failure receipts may therefore require the original runtime",
    kind: "claim-scoped",
    scoped: "Preserve the original receipt and its matching runtime",
    note: "Guidance acknowledging that historical receipts bind their producing runtime; do not rewrite retained evidence.",
  },
  {
    id: "schema-malformed-declarations",
    file: "spec/v1/organism.md",
    anchor: "Preserve VM.7 or the original matching runtime alongside historical receipts",
    kind: "claim-scoped",
    scoped: "Preserve VM.7 or the original matching runtime",
    note: "Operational guidance for pre-correction manifests; the current parser rejects them rather than relaxing replay.",
  },
  {
    id: "schema-version-additive",
    file: "spec/v1/organism.md",
    anchor: "Schema version 2 is additive",
    kind: "claim-evidence",
    evidence: [
      { path: "scripts/schema-parity.ts", token: "version-4" },
      { path: "scripts/schema-parity.ts", token: "schemaVersion must be 2 or 3" },
      { path: "scripts/schema-parity.ts", token: "schemaVersioned(2," },
      { path: "scripts/schema-parity.ts", token: "schemaVersioned(3," },
    ],
    note: "Additive v1→v2→v3 schema semantics and v4 rejection are exercised by the schema parity fixture on both runtimes. The 'older runtimes reject with PARSE_FAILED' leg describes released-runtime behavior and is guidance, not an in-tree test.",
  },
  {
    id: "json-admission-boundary",
    file: "spec/v1/organism.md",
    anchor: "This compatibility boundary is not a claim that every JSON text accepted by either host is portable",
    kind: "claim-scoped",
    scoped: "not a claim that every JSON text accepted by either host is portable",
    evidence: [
      { path: "verify/differential/SCOPE.md", token: "surrogate" },
    ],
    manual: true,
    note: "The duplicate-member/lone-surrogate admission boundary is self-scoped and exercised by the differential lane's byte-level cases.",
  },

  /* ----- spec/v1/process*.md ----- */
  {
    id: "process-creation-interlock",
    file: "spec/v1/process-journal.md",
    anchor: "older runtimes cannot bypass creation exclusion",
    kind: "claim-evidence",
    scoped: "require operator reconciliation",
    evidence: [
      { path: "src/process-creation-crash.test.ts", token: "legacy process creation lock remains fail-closed and byte-for-byte preserved" },
      { path: "scripts/process-parity.ts", token: ".creating.json" },
    ],
    note: "The v1 `.lock` interlock keeps older runtimes honest; legacy/unknown markers are untouched pending operator reconciliation.",
  },
  {
    id: "bare-legacy-fail-closed",
    file: "spec/v1/process.md",
    anchor: "A bare, legacy, foreign, malformed, or mismatched directory remains fail-closed",
    kind: "claim-evidence",
    evidence: [
      { path: "src/process-creation-crash.test.ts", token: "legacy process creation lock remains fail-closed and byte-for-byte preserved" },
      { path: "scripts/process-parity.ts", token: ".creating.json" },
    ],
    note: "Interrupted-creation recovery refuses every non-exact state.",
  },
  {
    id: "interlock-older-runtimes",
    file: "spec/v1/process.md",
    anchor: "interlock for older runtimes",
    kind: "claim-evidence",
    scoped: "Legacy locks remain fail-closed",
    evidence: [
      { path: "src/process-creation-crash.test.ts", token: "legacy process creation lock remains fail-closed and byte-for-byte preserved" },
    ],
    note: "The mirrored `.lock` interlock is deliberately kept for older runtimes.",
  },
  {
    id: "legacy-interlock-blocked",
    file: "spec/v1/process.md",
    anchor: "remains a fail-closed legacy interlock",
    kind: "claim-evidence",
    scoped: "Unknown legacy markers remain blocked",
    evidence: [
      { path: "src/process-creation-crash.test.ts", token: "legacy process creation lock remains fail-closed and byte-for-byte preserved" },
    ],
    note: "Dispatch custody upgrades preserve the legacy lock's fail-closed behavior.",
  },

  /* ----- advisory: dated reports, design notes, demo docs ----- */
  {
    id: "review-older-index-rows",
    file: "docs/2026-09-22-review.md",
    anchor: "repair inconsistent older index rows",
    kind: "advisory",
    note: "Dated review record; a work item, not a compat claim.",
  },
  {
    id: "review-legacy-evidence-view",
    file: "docs/2026-09-22-review.md",
    anchor: "omitted legacy evidence preserves the previous canonical form",
    kind: "advisory",
    note: "Dated review record citing the spec's legacy-view contract.",
  },
  {
    id: "design-wire-coordinates",
    file: "docs/algal-design.md",
    anchor: "legacy fixture filenames are durable wire coordinates",
    kind: "claim-scoped",
    scoped: "Do not rewrite old CAS objects",
    note: "Standing rename-era policy: v1 wire identifiers are permanent.",
  },
  {
    id: "design-rename",
    file: "docs/algal-design.md",
    anchor: "legacy wire data retained",
    kind: "advisory",
    note: "Rename changelog line inside the design doc.",
  },
  {
    id: "apple-bridge-version-floor",
    file: "docs/apple-brief.md",
    anchor: "an older bridge can pass availability while speaking an incompatible protocol",
    kind: "claim-evidence",
    evidence: [
      { path: "scripts/test_apple_brief_demo.py", token: "preflight" },
      { path: "scripts/test_apple_brief_demo.py", token: "invalid bridge passed preflight" },
    ],
    note: "The demo qualification checks bridge protocol compatibility before running; an incompatible bridge is rejected.",
  },
  {
    id: "apple-adapter-no-downgrade",
    file: "docs/apple-brief.md",
    anchor: "it does not resend a request after an I/O failure, downgrade the schema",
    kind: "non-claim",
    note: "Adapter single-dispatch semantics; not a version-compatibility claim.",
  },
  {
    id: "browser-grow-older-state",
    file: "docs/browser-grow.md",
    anchor: "Commands based on an older state and conflicting operation identities are rejected",
    kind: "non-claim",
    note: "Stale-state rejection inside one application version, not a version claim.",
  },
  {
    id: "browser-tasks-schema-v2",
    file: "docs/browser-tasks.md",
    anchor: "Version 2 adds categories. Applying that upgrade runs a migration program",
    kind: "claim-evidence",
    evidence: [
      { path: "scripts/browser-triage-qualification.mjs", token: "migration preserve facts" },
    ],
    note: "The browser-tasks demo's v1→v2 data migration is exercised by its real-browser qualification.",
  },
  {
    id: "browser-tasks-draft-rebase",
    file: "docs/browser-tasks.md",
    anchor: "The editor keeps its text and asks you to review and rebase",
    kind: "claim-evidence",
    evidence: [
      { path: "scripts/browser-triage-qualification.mjs", token: "explicit rebase enables editing" },
    ],
    note: "Stale-draft preservation and explicit rebase are covered by the same qualification script.",
  },
  {
    id: "pilot-results-older",
    file: "docs/coding-harness-pilot-results.md",
    anchor: "This is an older compatibility pilot, not a current leaderboard submission",
    kind: "advisory",
    note: "Dated results record; self-described as an older pilot.",
  },
  {
    id: "coding-harness-pilot",
    file: "docs/coding-harness.md",
    anchor: "This is an older four-task integration pilot",
    kind: "advisory",
    note: "Self-scoped pilot description with pinned commits.",
  },
  {
    id: "audit-rollback-snapshot",
    file: "docs/formal-verification-audit-2026-09-23.md",
    anchor: "rollback to an older internally consistent snapshot",
    kind: "advisory",
    note: "Dated audit text describing a rollback attack, not a claim.",
  },
  {
    id: "execution-older-snapshot",
    file: "docs/formal-verification-execution.md",
    anchor: "an exact account of its older snapshot",
    kind: "advisory",
    note: "Dated execution record.",
  },
  {
    id: "execution-legacy-owner",
    file: "docs/formal-verification-execution.md",
    anchor: "legacy-owner, prepared-genesis and independent-admission controls pass",
    kind: "advisory",
    note: "Dated execution record reporting a custody check result.",
  },
  {
    id: "plan-rollback-backup",
    file: "docs/formal-verification-plan.md",
    anchor: "an older self-consistent backup can pass them",
    kind: "advisory",
    note: "Plan threat-model text, not a shipped claim.",
  },
  {
    id: "plan-baseline-upgrades",
    file: "docs/formal-verification-plan.md",
    anchor: "subject to repository upgrades",
    kind: "advisory",
    note: "Plan wording about toolchain baselines.",
  },
  {
    id: "plan-rust-upgrade",
    file: "docs/formal-verification-plan.md",
    anchor: "unrelated Rust upgrade",
    kind: "advisory",
    note: "Out-of-scope line.",
  },
  {
    id: "plan-restore-upgrade",
    file: "docs/formal-verification-plan.md",
    anchor: "Restore/upgrade fixtures preserve previous data and uncertainty",
    kind: "advisory",
    note: "This suite's own Phase 17 acceptance text.",
  },
  {
    id: "library-no-upgrade",
    file: "docs/library.md",
    anchor: "no package server, registry lookup, or automatic upgrade",
    kind: "claim-scoped",
    scoped: "no package server, registry lookup, or automatic upgrade",
    note: "A capability-absence statement.",
  },
  {
    id: "library-earlier-bundle",
    file: "docs/library.md",
    anchor: "an earlier bundle still runs its earlier version",
    kind: "claim-scoped",
    scoped: "an earlier bundle still runs its earlier version",
    note: "Digest-immutable pin: an earlier bundle replays its own pinned version — a bounded claim resting on CAS immutability.",
  },
  {
    id: "triage-schema-upgrade",
    file: "docs/local-triage.md",
    anchor: "a schema upgrade retains the source snapshot and migration receipt",
    kind: "advisory",
    note: "Example-app proposal flow; the underlying migration contract is the spec surface.",
  },
  {
    id: "roadmap-schema-downgrade",
    file: "docs/malleable-roadmap-progress.md",
    anchor: "they do not claim a permitted schema downgrade",
    kind: "advisory",
    note: "Dated progress record; self-scoped.",
  },
  {
    id: "roadmap-schema-upgrade",
    file: "docs/malleable-roadmap-progress.md",
    anchor: "independent draft across schema upgrade and explicit rebase",
    kind: "advisory",
    note: "Dated progress record.",
  },
  {
    id: "plan-program-upgrade",
    file: "docs/malleable-software-plan.md",
    anchor: "or a program upgrade",
    kind: "non-claim",
    note: "Plan prose.",
  },
  {
    id: "plan-data-survives-upgrade",
    file: "docs/malleable-software-plan.md",
    anchor: "user data survives restart and upgrade",
    kind: "advisory",
    note: "Plan acceptance wording, not a shipped claim.",
  },
  {
    id: "workbench-older-journals",
    file: "docs/malleable-workbench.md",
    anchor: "Older journals remain readable with an explicit missing-checkpoint gap",
    kind: "claim-scoped",
    scoped: "explicit missing-checkpoint gap",
    note: "Bounded claim: older journals read with an explicit gap marker, not silently as complete.",
  },
  {
    id: "workbench-legacy-captures",
    file: "docs/malleable-workbench.md",
    anchor: "Legacy captures remain readable and explicitly report their missing ordered-source provenance",
    kind: "claim-scoped",
    scoped: "explicitly report their missing",
    note: "Bounded readability-with-report claim for legacy captures.",
  },
  {
    id: "native-release-platforms-covered",
    file: "docs/pr-shepherd.md",
    anchor: "legacy status contexts",
    kind: "advisory",
    note: "GitHub status-context wording, not a version claim.",
  },
  {
    id: "scaling-no-upgrade",
    file: "docs/scaling-programs.md",
    anchor: "no network access, install scripts, registry lookup, or automatic upgrade",
    kind: "claim-scoped",
    scoped: "no network access, install scripts, registry lookup, or automatic upgrade",
    note: "Capability-absence statement for `algal lock`.",
  },
  {
    id: "source-lock-no-upgrade",
    file: "docs/source-language.md",
    anchor: "The lock does not fetch, install, or upgrade anything",
    kind: "claim-scoped",
    scoped: "does not fetch, install, or upgrade anything",
    note: "Capability-absence statement.",
  },
  {
    id: "use-cases-store-upgrade-covered",
    file: "docs/vm.md",
    anchor: "retaining legacy lock evidence",
    kind: "advisory",
    note: "Points at the spec/v1 custody contract; the standing claim lives there.",
  },
];
