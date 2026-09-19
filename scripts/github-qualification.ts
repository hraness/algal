// Live, read-only compatibility qualification. Deterministic adversarial tests
// live in src/github*.test.ts and are deliberately not counted as live cases.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GitHubClient, type GitHubEvidence } from "../src/github";
import { githubCliTransport } from "../src/github-cli";
import { digestCanonical } from "../src/digest";
import { AlgalError } from "../src/errors";
import {
  asArray,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  type JsonValue,
} from "../src/values";

type Case = {
  repository: string;
  number: number;
  headSha: string | null;
  observedCase: string;
};
type Result = {
  seed: Case;
  requests: number;
  elapsedMs: number;
  evidence: GitHubEvidence;
  seedHeadChanged: boolean;
};
const options = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]!,
    value = process.argv[i + 1];
  if (
    !["--corpus", "--out", "--repo", "--pull", "--gh"].includes(key) ||
    !value ||
    options.has(key)
  )
    throw new Error(
      "Usage: bun scripts/github-qualification.ts [--corpus FILE | --repo OWNER/REPO --pull NUMBER] [--gh EXECUTABLE] [--out NEW_FILE]",
    );
  options.set(key, value);
}
if (
  options.has("--repo") !== options.has("--pull") ||
  (options.has("--repo") && options.has("--corpus"))
)
  throw new Error("Pass either --corpus or both --repo and --pull");
const parseNumber = (value: unknown): number => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 2_147_483_647
  )
    throw new Error("Invalid PR number");
  return value;
};
let cases: Case[];
if (options.has("--repo")) {
  const pull = options.get("--pull")!;
  if (!/^[1-9][0-9]{0,9}$/.test(pull)) throw new Error("Invalid --pull");
  cases = [
    {
      repository: options.get("--repo")!,
      number: parseNumber(Number(pull)),
      headSha: null,
      observedCase: "explicit-live-target",
    },
  ];
} else {
  const path =
    options.get("--corpus") ??
    fileURLToPath(
      new URL("../examples/github/qualification-corpus.json", import.meta.url),
    );
  if (!statSync(path).isFile() || statSync(path).size > 131_072)
    throw new Error("Corpus must be a regular file at most 131072 bytes");
  const corpus = asObject(JSON.parse(readFileSync(path, "utf8")), "corpus");
  noUnknownKeys(corpus, ["contract", "note", "cases"], "corpus");
  if (corpus.contract !== "algal.github-qualification-corpus.v1")
    throw new Error("Unknown corpus contract");
  const rows = asArray(corpus.cases, "corpus.cases");
  if (rows.length < 1 || rows.length > 20)
    throw new Error("Corpus requires 1..20 cases");
  cases = rows.map((raw) => {
    const row = asObject(raw, "case");
    noUnknownKeys(
      row,
      ["repository", "number", "headSha", "observedCase"],
      "case",
    );
    const headSha = asString(row.headSha, "headSha", 40);
    if (!/^[0-9a-f]{40}$/.test(headSha))
      throw new Error("Expected full seed SHA");
    return {
      repository: asString(row.repository, "repository", 140),
      number: parseNumber(row.number),
      headSha,
      observedCase: asString(row.observedCase, "observedCase", 128),
    };
  });
}
if (
  new Set(cases.map((x) => `${x.repository.toLowerCase()}#${x.number}`))
    .size !== cases.length
)
  throw new Error("Duplicate corpus target");
const transport = githubCliTransport(
  options.has("--gh") ? { executable: options.get("--gh")! } : {},
);
const startedAt = new Date().toISOString(),
  started = performance.now();
const results: Result[] = new Array(cases.length);
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(2, cases.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= cases.length) return;
      const seed = cases[index]!,
        start = performance.now();
      let requests = 0;
      const client = new GitHubClient({
        repository: seed.repository,
        pullNumber: seed.number,
        transport: async (request) => {
          const body = request.body as { query?: unknown } | undefined;
          if (
            request.method !== "GET" &&
            !(
              request.method === "POST" &&
              request.path === "/graphql" &&
              typeof body?.query === "string" &&
              /^query\(/.test(body.query)
            )
          )
            throw new AlgalError(
              "CAPABILITY_DENIED",
              "Live qualification permits reads only",
            );
          requests++;
          return transport(request);
        },
      });
      const evidence = await client.collect();
      results[index] = {
        seed,
        requests,
        elapsedMs: Math.round(performance.now() - start),
        evidence,
        seedHeadChanged:
          seed.headSha !== null &&
          evidence.revision !== null &&
          seed.headSha !== evidence.revision.headSha,
      };
    }
  }),
);
const summary = {
  cases: results.length,
  identifiedTargets: results.filter((x) => x.evidence.revision !== null).length,
  terminalSnapshots: results.filter(
    (x) => x.evidence.state === "merged" || x.evidence.state === "closed",
  ).length,
  fullyEvaluatedOpenSnapshots: results.filter(
    (x) => x.evidence.state === "open" && x.evidence.policy.complete,
  ).length,
  incompleteOpenSnapshots: results.filter(
    (x) => x.evidence.state === "open" && !x.evidence.policy.complete,
  ).length,
  driftedSeedHeads: results.filter((x) => x.seedHeadChanged).length,
  checksObserved: results.reduce((sum, x) => sum + x.evidence.checks.length, 0),
  requests: results.reduce((sum, x) => sum + x.requests, 0),
  ready: results.filter((x) => x.evidence.status === "ready").length,
  pending: results.filter((x) => x.evidence.status === "pending").length,
  blocked: results.filter((x) => x.evidence.status === "blocked").length,
  stale: results.filter((x) => x.evidence.status === "stale").length,
  writes: 0,
  modelCalls: 0,
  syntheticCases: 0,
};
const sourceDigest = digestCanonical({
  adapter: readFileSync(new URL("../src/github.ts", import.meta.url), "utf8"),
  transport: readFileSync(
    new URL("../src/github-cli.ts", import.meta.url),
    "utf8",
  ),
});
const report = {
  contract: "algal.github-qualification.v1",
  liveReadOnly: true,
  startedAt,
  elapsedMs: Math.round(performance.now() - started),
  sourceDigest,
  summary,
  results,
};
if (canonicalBytes(report as unknown as JsonValue) > 12_000_000)
  throw new Error("Qualification report exceeds byte limit");
const out = options.get("--out");
if (out) {
  const path = resolve(out);
  mkdirSync(dirname(path), { recursive: true });
  // Never silently replace previous qualification evidence.
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
}
console.log(
  JSON.stringify(
    {
      ...summary,
      elapsedMs: report.elapsedMs,
      sourceDigest,
      ...(out ? { output: resolve(out) } : {}),
      observations: results.map((x) => ({
        repository: x.seed.repository,
        number: x.seed.number,
        status: x.evidence.status,
        digest: x.evidence.digest,
        reasons: x.evidence.reasons,
        seedHeadChanged: x.seedHeadChanged,
      })),
    },
    null,
    2,
  ),
);
if (summary.identifiedTargets !== summary.cases) process.exitCode = 1;
