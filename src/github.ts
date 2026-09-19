// A host-owned GitHub adapter. Repository, action, transport and policy are
// admitted by the host; an organism supplies no URL, credential or merge target.
import { AlgalError } from "./errors";
import { asDigest, digestCanonical, type Digest } from "./digest";
import { boundedBytes } from "./io";
import { canonicalBytes, type JsonObject, type JsonValue } from "./values";

export const GITHUB_BOUNDS = {
  maxResponseBytes: 2_000_000,
  maxCollectionBytes: 12_000_000,
  maxEvidenceBytes: 500_000,
  maxPages: 5,
  maxItems: 500,
  maxRequests: 40,
  timeoutMs: 20_000,
  maxDepth: 24,
  maxNodes: 100_000,
} as const;
export type GitHubRequest = {
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: JsonValue;
  signal: AbortSignal;
  maxBytes: number;
};
export type GitHubResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};
export type GitHubTransport = (
  request: GitHubRequest,
) => Promise<GitHubResponse>;
export type GitHubRevision = {
  headSha: string;
  baseSha: string;
  mergeSha: string | null;
};
export type GitHubRequiredCheck = { name: string; appId?: number };
export type GitHubCheck = {
  kind: "check" | "status";
  id: string;
  name: string;
  sha: string;
  appId: number | null;
  status: string;
  conclusion: string | null;
  url: string | null;
};
export type GitHubEvidence = {
  contract: "algal.github-evidence.v1";
  repository: string;
  pullNumber: number;
  mergeMethod: "merge" | "squash" | "rebase";
  revision: GitHubRevision | null;
  baseRef: string | null;
  state: "open" | "closed" | "merged" | "unknown";
  draft: boolean | null;
  status: "ready" | "pending" | "blocked" | "stale";
  reasons: string[];
  checks: GitHubCheck[];
  checksSha: string | null;
  review: {
    decision: string | null;
    unresolvedThreads: number;
    mergeState: string;
  } | null;
  policy: {
    complete: boolean;
    strictRequiredChecks: boolean;
    sourceDigest: Digest | null;
    requiredChecks: GitHubRequiredCheck[];
    requiresReview: boolean;
    ruleTypes: string[];
  };
  digest: Digest;
};
export type GitHubMergeResult = {
  outcome: "merged" | "blocked" | "stale" | "uncertain";
  evidence: GitHubEvidence;
  mergeCommit?: string;
  reason?: string;
};
export type GitHubClientOptions = {
  repository: string;
  pullNumber: number;
  transport: GitHubTransport;
  requiredChecks?: GitHubRequiredCheck[];
  allowMerge?: boolean;
  mergeMethod?: "merge" | "squash" | "rebase";
};

function invalid(message: string): never {
  throw new AlgalError("EFFECT_UNPARSEABLE", `GitHub: ${message}`);
}
function stale(message: string): never {
  throw new AlgalError("DIGEST_MISMATCH", `GitHub: ${message}`);
}
function obj(value: unknown): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    invalid("expected object");
  return value as JsonObject;
}
function list(value: unknown): JsonValue[] {
  if (!Array.isArray(value) || value.length > GITHUB_BOUNDS.maxItems)
    invalid("invalid or oversized list");
  return value;
}
function str(value: unknown, max = 256): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max)
    invalid("invalid string");
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean") invalid("invalid boolean");
  return value;
}
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > max
  )
    invalid("invalid integer");
  return value;
}
function sha(value: unknown): string {
  const text = str(value, 40);
  if (!/^[0-9a-f]{40}$/.test(text)) invalid("expected full commit SHA");
  return text;
}
function sameRevision(a: GitHubRevision, b: GitHubRevision): boolean {
  return (
    a.headSha === b.headSha &&
    a.baseSha === b.baseSha &&
    a.mergeSha === b.mergeSha
  );
}
function jsonBounded(value: unknown, maxBytes: number): JsonValue {
  let nodes = 0;
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > GITHUB_BOUNDS.maxNodes || depth > GITHUB_BOUNDS.maxDepth)
      invalid("JSON structure limit");
    if (v === null || typeof v === "boolean") return;
    if (typeof v === "string") {
      if (v.length > maxBytes) invalid("string byte limit");
      return;
    }
    if (typeof v === "number" && Number.isFinite(v)) return;
    if (typeof v !== "object") invalid("non-JSON value");
    for (const child of Object.values(v)) visit(child, depth + 1);
  };
  visit(value, 0);
  const json = value as JsonValue;
  if (canonicalBytes(json) > maxBytes) invalid("JSON byte limit");
  return json;
}
function publicUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = str(value, 2048);
  const url = new URL(text);
  if (url.protocol !== "https:" || url.username || url.password)
    invalid("invalid evidence URL");
  return text;
}
function requirement(value: GitHubRequiredCheck): GitHubRequiredCheck {
  const name = str(value.name);
  if (value.appId !== undefined) {
    if (integer(value.appId) === 0) invalid("invalid required app ID");
    return { name, appId: value.appId };
  }
  return { name };
}
function uniqueRequirements(
  values: GitHubRequiredCheck[],
): GitHubRequiredCheck[] {
  if (values.length > GITHUB_BOUNDS.maxItems)
    invalid("too many required checks");
  return [
    ...new Map(
      values.map(requirement).map((v) => [JSON.stringify(v), v]),
    ).values(),
  ].sort(
    (a, b) => a.name.localeCompare(b.name) || (a.appId ?? -1) - (b.appId ?? -1),
  );
}

/** Fixed-origin, redirect-rejecting transport. Credentials remain in this host
 * closure. Bodies and diagnostics containing credentials are never returned. */
export function githubFetchTransport(token?: string): GitHubTransport {
  return async (request) => {
    if (
      !/^\/(?:repos\/|graphql$)/.test(request.path) ||
      request.path.includes("\\") ||
      request.path.includes("#")
    ) {
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "GitHub transport path rejected",
      );
    }
    const response = await fetch(`https://api.github.com${request.path}`, {
      method: request.method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(request.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(request.body !== undefined
        ? { body: JSON.stringify(request.body) }
        : {}),
      redirect: "error",
      signal: request.signal,
    });
    const bytes = await boundedBytes(
      response.body,
      request.maxBytes,
      "GitHub response",
      request.signal,
    );
    let body: unknown = null;
    if (bytes.length) {
      try {
        body = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        );
      } catch {
        invalid("response is not JSON");
      }
    }
    return {
      status: response.status,
      body,
      headers: { link: response.headers.get("link") ?? "" },
    };
  };
}

type Pull = {
  revision: GitHubRevision;
  state: "open" | "closed" | "merged";
  draft: boolean;
  mergeable: boolean | null;
  baseRef: string;
};
type ReadSession = { requests: number; bytes: number };

export class GitHubClient {
  readonly repository: string;
  readonly pullNumber: number;
  private readonly transport: GitHubTransport;
  private readonly required: GitHubRequiredCheck[];
  private readonly allowMerge: boolean;
  private readonly mergeMethod: "merge" | "squash" | "rebase";
  private readonly root: string;

  constructor(options: GitHubClientOptions) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(
        options.repository,
      ) ||
      options.repository.split("/")[1] === "." ||
      options.repository.split("/")[1] === ".."
    ) {
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "invalid host-admitted GitHub repository",
      );
    }
    if (
      !Number.isSafeInteger(options.pullNumber) ||
      options.pullNumber < 1 ||
      options.pullNumber > 2_147_483_647
    )
      invalid("invalid pull request number");
    this.repository = options.repository;
    this.pullNumber = options.pullNumber;
    this.transport = options.transport;
    this.required = uniqueRequirements(
      (options.requiredChecks ?? []).map(requirement),
    );
    this.allowMerge = options.allowMerge === true;
    this.mergeMethod = options.mergeMethod ?? "merge";
    if (!["merge", "squash", "rebase"].includes(this.mergeMethod))
      invalid("invalid merge method");
    this.root = `/repos/${this.repository}`;
  }

  private async request(
    session: ReadSession,
    path: string,
    method: GitHubRequest["method"] = "GET",
    body?: JsonValue,
  ): Promise<GitHubResponse> {
    if (++session.requests > GITHUB_BOUNDS.maxRequests)
      invalid("request count limit");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        this.transport({
          path,
          method,
          ...(body !== undefined ? { body } : {}),
          signal: controller.signal,
          maxBytes: GITHUB_BOUNDS.maxResponseBytes,
        }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(
              new AlgalError("BUDGET_EXHAUSTED", "GitHub request timed out"),
            );
          }, GITHUB_BOUNDS.timeoutMs);
        }),
      ]);
      integer(response.status, 599);
      response.body = jsonBounded(
        response.body,
        GITHUB_BOUNDS.maxResponseBytes,
      );
      session.bytes += canonicalBytes(response.body as JsonValue);
      if (session.bytes > GITHUB_BOUNDS.maxCollectionBytes)
        invalid("collection byte limit");
      return response;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }

  private async get(session: ReadSession, path: string): Promise<JsonValue> {
    const result = await this.request(session, path);
    if (result.status !== 200)
      throw new AlgalError(
        "EFFECT_FAILED",
        `GitHub read returned HTTP ${result.status}`,
      );
    return result.body as JsonValue;
  }

  private async pages(
    session: ReadSession,
    path: string,
    field?: string,
    expectedSha?: string,
  ): Promise<JsonValue[]> {
    const out: JsonValue[] = [];
    let expected: number | undefined;
    for (let page = 1; page <= GITHUB_BOUNDS.maxPages; page++) {
      const response = await this.request(
        session,
        `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      );
      if (response.status !== 200)
        throw new AlgalError(
          "EFFECT_FAILED",
          `GitHub page returned HTTP ${response.status}`,
        );
      const body = response.body;
      if (expectedSha !== undefined && sha(obj(body).sha) !== expectedSha)
        invalid("status response belongs to another commit");
      const rows = list(field ? obj(body)[field] : body);
      if (rows.length > 100) invalid("page count mismatch");
      if (field) {
        const count = integer(obj(body).total_count, GITHUB_BOUNDS.maxItems);
        if (expected !== undefined && count !== expected)
          stale("page total changed");
        expected = count;
      }
      out.push(...rows);
      if (
        out.length > GITHUB_BOUNDS.maxItems ||
        (expected !== undefined && out.length > expected)
      )
        invalid("collection count mismatch");
      const next = /rel="next"/.test(response.headers?.link ?? "");
      if (
        (expected !== undefined && out.length === expected && !next) ||
        (expected === undefined && rows.length < 100 && !next)
      )
        return out;
      if (rows.length === 0) invalid("incomplete pagination");
    }
    invalid("pagination limit; evidence is incomplete");
  }

  private parsePull(value: unknown): Pull {
    const data = obj(value);
    if (integer(data.number) !== this.pullNumber) invalid("wrong pull request");
    const head = obj(data.head),
      base = obj(data.base);
    if (
      str(obj(base.repo).full_name).toLowerCase() !==
      this.repository.toLowerCase()
    )
      invalid("wrong repository");
    const state = str(data.state);
    if (state !== "open" && state !== "closed")
      invalid("unknown pull request state");
    const merged = bool(data.merged);
    if (data.mergeable !== null && typeof data.mergeable !== "boolean")
      invalid("unknown mergeability");
    return {
      revision: {
        headSha: sha(head.sha),
        baseSha: sha(base.sha),
        mergeSha:
          data.merge_commit_sha === null ? null : sha(data.merge_commit_sha),
      },
      state: merged ? "merged" : state,
      draft: bool(data.draft),
      mergeable: data.mergeable as boolean | null,
      baseRef: str(base.ref, 255),
    };
  }

  private async checks(
    session: ReadSession,
    commit: string,
  ): Promise<GitHubCheck[]> {
    const [runs, statuses] = await Promise.all([
      this.pages(
        session,
        `${this.root}/commits/${commit}/check-runs?filter=latest`,
        "check_runs",
      ),
      this.pages(
        session,
        `${this.root}/commits/${commit}/status`,
        "statuses",
        commit,
      ),
    ]);
    const checks: GitHubCheck[] = [];
    const ids = new Set<string>();
    for (const raw of runs) {
      const data = obj(raw),
        id = `check:${integer(data.id)}`;
      if (ids.has(id)) invalid("duplicate check ID across pages");
      ids.add(id);
      if (sha(data.head_sha) !== commit)
        invalid("check belongs to another commit");
      checks.push({
        kind: "check",
        id,
        name: str(data.name),
        sha: commit,
        appId: integer(obj(data.app).id),
        status: str(data.status),
        conclusion: data.conclusion === null ? null : str(data.conclusion),
        url: publicUrl(data.html_url ?? data.details_url),
      });
    }
    for (const raw of statuses) {
      const data = obj(raw),
        id = `status:${integer(data.id)}`;
      if (ids.has(id)) invalid("duplicate status ID across pages");
      ids.add(id);
      checks.push({
        kind: "status",
        id,
        name: str(data.context),
        sha: commit,
        appId: null,
        status: str(data.state),
        conclusion: null,
        url: publicUrl(data.target_url),
      });
    }
    return checks.sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.kind.localeCompare(b.kind) ||
        a.id.localeCompare(b.id),
    );
  }

  private async reviews(
    session: ReadSession,
    revision: GitHubRevision,
  ): Promise<NonNullable<GitHubEvidence["review"]>> {
    const [owner, name] = this.repository.split("/");
    let cursor: string | null = null,
      expected: number | undefined,
      seen = 0,
      unresolved = 0;
    const ids = new Set<string>();
    let decision: string | null = null,
      mergeState = "UNKNOWN";
    for (let page = 0; page < GITHUB_BOUNDS.maxPages; page++) {
      const response = await this.request(session, "/graphql", "POST", {
        query:
          "query($owner:String!,$name:String!,$number:Int!,$after:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid baseRefOid mergeStateStatus reviewDecision reviewThreads(first:100,after:$after){totalCount pageInfo{hasNextPage endCursor} nodes{id isResolved}}}}}",
        variables: {
          owner: owner!,
          name: name!,
          number: this.pullNumber,
          after: cursor,
        },
      });
      const body = obj(response.body);
      if (response.status !== 200 || body.errors !== undefined)
        invalid("review evidence unavailable");
      const pull = obj(obj(obj(body.data).repository).pullRequest);
      if (
        sha(pull.headRefOid) !== revision.headSha ||
        sha(pull.baseRefOid) !== revision.baseSha
      )
        stale("review revision changed");
      const nextDecision =
        pull.reviewDecision === null ? null : str(pull.reviewDecision);
      const nextMerge = str(pull.mergeStateStatus);
      if (page > 0 && (decision !== nextDecision || mergeState !== nextMerge))
        stale("review state changed while paging");
      decision = nextDecision;
      mergeState = nextMerge;
      const threads = obj(pull.reviewThreads),
        count = integer(threads.totalCount, GITHUB_BOUNDS.maxItems),
        rows = list(threads.nodes),
        pageInfo = obj(threads.pageInfo);
      if (rows.length > 100 || (expected !== undefined && expected !== count))
        invalid("review pagination changed");
      expected = count;
      for (const raw of rows) {
        const row = obj(raw),
          id = str(row.id);
        if (ids.has(id)) invalid("duplicate review thread");
        ids.add(id);
        seen++;
        if (!bool(row.isResolved)) unresolved++;
      }
      if (!bool(pageInfo.hasNextPage)) {
        if (seen !== count) invalid("incomplete review pagination");
        return { decision, unresolvedThreads: unresolved, mergeState };
      }
      const nextCursor = str(pageInfo.endCursor, 2048);
      if (nextCursor === cursor || rows.length === 0)
        invalid("invalid review cursor");
      cursor = nextCursor;
    }
    invalid("review pagination limit");
  }

  private async policy(
    session: ReadSession,
    pull: Pull,
  ): Promise<GitHubEvidence["policy"]> {
    const ref = encodeURIComponent(pull.baseRef);
    const [branchRaw, rules] = await Promise.all([
      this.get(session, `${this.root}/branches/${ref}`),
      this.pages(session, `${this.root}/rules/branches/${ref}`),
    ]);
    const branch = obj(branchRaw);
    if (sha(obj(branch.commit).sha) !== pull.revision.baseSha)
      stale("base branch changed");
    const required = [...this.required],
      types: string[] = [],
      strictRulesets: JsonObject[] = [];
    let legacy: JsonObject | null = null;
    let requiresReview = false,
      complete = true,
      strictRequiredChecks = false;
    const addRequired = (raw: unknown, appKey: string): void => {
      for (const item of list(raw)) {
        const entry = obj(item),
          name = str(entry.context),
          appId = entry[appKey];
        required.push(
          appId === null || appId === undefined || appId === -1
            ? { name }
            : requirement({ name, appId: integer(appId) }),
        );
      }
    };
    for (const raw of rules) {
      const rule = obj(raw),
        type = str(rule.type);
      types.push(type);
      if (type === "required_status_checks") {
        const params = obj(rule.parameters);
        addRequired(params.required_status_checks, "integration_id");
        if (
          params.strict_required_status_checks_policy === true &&
          list(params.required_status_checks).length > 0
        ) {
          // A strict ruleset with possible bypass actors is not an unconditional
          // server guard. Missing visibility into bypass policy cannot grant it.
          const detail = obj(
            await this.get(
              session,
              `${this.root}/rulesets/${integer(rule.ruleset_id)}`,
            ),
          );
          strictRulesets.push(detail);
          if (
            detail.enforcement === "active" &&
            Array.isArray(detail.bypass_actors) &&
            list(detail.bypass_actors).length === 0
          )
            strictRequiredChecks = true;
        }
      } else if (type === "pull_request") {
        const params = obj(rule.parameters);
        requiresReview ||=
          integer(params.required_approving_review_count) > 0 ||
          bool(params.require_code_owner_review) ||
          bool(params.require_last_push_approval);
      } else if (
        !["non_fast_forward", "creation", "deletion"].includes(type) &&
        !(type === "required_linear_history" && this.mergeMethod !== "merge")
      ) {
        complete = false;
      }
    }
    // A protected branch may also have a legacy branch-protection policy.
    // A 403/404 here is unknown evidence, never an empty policy.
    if (bool(branch.protected)) {
      const protection = obj(
        await this.get(session, `${this.root}/branches/${ref}/protection`),
      );
      legacy = protection;
      if (
        protection.required_status_checks !== null &&
        protection.required_status_checks !== undefined
      ) {
        const status = obj(protection.required_status_checks);
        if (status.checks !== undefined) addRequired(status.checks, "app_id");
        const boundNames = new Set(required.map((x) => x.name));
        for (const context of list(status.contexts))
          if (!boundNames.has(str(context)))
            required.push({ name: str(context) });
        const hasServerChecks =
          list(status.contexts).length > 0 ||
          (Array.isArray(status.checks) && status.checks.length > 0);
        if (
          status.strict === true &&
          hasServerChecks &&
          protection.enforce_admins !== undefined &&
          obj(protection.enforce_admins).enabled === true
        )
          strictRequiredChecks = true;
      }
      if (
        protection.required_pull_request_reviews !== null &&
        protection.required_pull_request_reviews !== undefined
      ) {
        const reviews = obj(protection.required_pull_request_reviews);
        requiresReview ||=
          integer(reviews.required_approving_review_count) > 0 ||
          bool(reviews.require_code_owner_reviews) ||
          bool(reviews.require_last_push_approval);
      }
      if (
        protection.required_linear_history !== undefined &&
        bool(obj(protection.required_linear_history).enabled) &&
        this.mergeMethod === "merge"
      )
        invalid("merge method violates linear history policy");
    }
    return {
      complete,
      strictRequiredChecks,
      sourceDigest: digestCanonical({
        rules,
        legacy,
        strictRulesets,
        protected: branch.protected!,
      }),
      requiredChecks: uniqueRequirements(required),
      requiresReview,
      ruleTypes: [...new Set(types)].sort(),
    };
  }

  /** Collects a finite snapshot, then rereads PR identity. Read errors become a
   * blocked, incomplete report, preserving the distinction from green checks. */
  async collect(expected?: GitHubRevision): Promise<GitHubEvidence> {
    const session: ReadSession = { requests: 0, bytes: 0 };
    const report: Omit<GitHubEvidence, "digest"> = {
      contract: "algal.github-evidence.v1",
      repository: this.repository,
      pullNumber: this.pullNumber,
      mergeMethod: this.mergeMethod,
      revision: null,
      baseRef: null,
      state: "unknown",
      draft: null,
      status: "blocked",
      reasons: [],
      checks: [],
      checksSha: null,
      review: null,
      policy: {
        complete: false,
        strictRequiredChecks: false,
        sourceDigest: null,
        requiredChecks: this.required.map(requirement),
        requiresReview: false,
        ruleTypes: [],
      },
    };
    try {
      const pull = this.parsePull(
        await this.get(session, `${this.root}/pulls/${this.pullNumber}`),
      );
      report.revision = pull.revision;
      report.baseRef = pull.baseRef;
      report.state = pull.state;
      report.draft = pull.draft;
      if (expected && !sameRevision(expected, pull.revision)) {
        report.status = "stale";
        report.reasons.push("revision-changed");
      } else if (pull.state !== "open")
        report.reasons.push(`pull-request-${pull.state}`);
      else {
        const parts = await Promise.allSettled([
          this.checks(session, pull.revision.headSha),
          pull.revision.mergeSha
            ? this.checks(session, pull.revision.mergeSha)
            : Promise.resolve([]),
          this.policy(session, pull),
          this.reviews(session, pull.revision),
        ]);
        const headChecks =
          parts[0].status === "fulfilled" ? parts[0].value : [];
        const mergeChecks =
          parts[1].status === "fulfilled" ? parts[1].value : [];
        const policy =
          parts[2].status === "fulfilled" ? parts[2].value : report.policy;
        const review =
          parts[3].status === "fulfilled"
            ? parts[3].value
            : { decision: null, unresolvedThreads: 0, mergeState: "UNKNOWN" };
        const unavailable = parts.flatMap((part) =>
          part.status === "fulfilled"
            ? []
            : [
                part.reason instanceof AlgalError
                  ? part.reason.message
                  : "GitHub evidence unavailable",
              ],
        );
        report.checks = mergeChecks.length ? mergeChecks : headChecks;
        report.checksSha = mergeChecks.length
          ? pull.revision.mergeSha
          : pull.revision.headSha;
        report.policy = policy;
        report.review = parts[3].status === "fulfilled" ? review : null;
        if (pull.revision.mergeSha) {
          const merge = obj(
            await this.get(
              session,
              `${this.root}/git/commits/${pull.revision.mergeSha}`,
            ),
          );
          if (sha(merge.sha) !== pull.revision.mergeSha)
            invalid("wrong test merge commit");
          const parents = list(merge.parents).map((x) => sha(obj(x).sha));
          if (
            parents.length !== 2 ||
            parents[0] !== pull.revision.baseSha ||
            parents[1] !== pull.revision.headSha
          )
            stale("test merge parents do not match PR revision");
        }
        const blockers: string[] = [...unavailable],
          pending: string[] = [];
        if (!policy.complete) blockers.push("branch-policy-incomplete");
        if (unavailable.length) report.policy.complete = false;
        if (pull.draft) blockers.push("draft");
        if (pull.mergeable === false || review.mergeState === "DIRTY")
          blockers.push("merge-conflict");
        else if (
          pull.mergeable === null ||
          pull.revision.mergeSha === null ||
          review.mergeState === "UNKNOWN"
        )
          pending.push("mergeability-unknown");
        if (review.unresolvedThreads > 0)
          blockers.push("unresolved-review-threads");
        if (review.decision === "CHANGES_REQUESTED")
          blockers.push("changes-requested");
        if (
          review.decision === "REVIEW_REQUIRED" ||
          (policy.requiresReview && review.decision !== "APPROVED")
        )
          blockers.push("review-required");
        if (
          review.decision !== null &&
          !["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"].includes(
            review.decision,
          )
        )
          blockers.push("unknown-review-state");
        if (
          !["CLEAN", "UNKNOWN", "DIRTY", "UNSTABLE", "BLOCKED"].includes(
            review.mergeState,
          )
        )
          blockers.push(`github-merge-state:${review.mergeState}`);
        if (report.checks.length === 0) pending.push("checks-missing");
        for (const required of policy.requiredChecks) {
          const matches = report.checks.filter(
            (check) =>
              check.name === required.name &&
              (required.appId === undefined || check.appId === required.appId),
          );
          if (matches.length === 0)
            pending.push(`required-check-missing:${required.name}`);
        }
        // Conservative host policy: every visible current check must pass. A
        // successful duplicate must never hide another failing check/context.
        for (const check of report.checks) {
          if (check.kind === "check") {
            if (
              [
                "queued",
                "in_progress",
                "pending",
                "waiting",
                "requested",
                "expected",
              ].includes(check.status)
            )
              pending.push(`check-pending:${check.name}`);
            else if (
              check.status !== "completed" ||
              !["success", "neutral", "skipped"].includes(
                check.conclusion ?? "",
              )
            )
              blockers.push(`check-failed:${check.name}`);
          } else if (check.status === "pending" || check.status === "expected")
            pending.push(`check-pending:${check.name}`);
          else if (check.status !== "success")
            blockers.push(`check-failed:${check.name}`);
        }
        // GitHub's aggregate state also reflects checks that have not finished.
        // Keep a finite watcher alive only when the fully known blockers are
        // pending evidence; a mysterious BLOCKED state never becomes ready.
        if (["UNSTABLE", "BLOCKED"].includes(review.mergeState)) {
          const reason = `github-merge-state:${review.mergeState}`;
          if (blockers.length === 0 && pending.length > 0) pending.push(reason);
          else blockers.push(reason);
        }
        report.reasons = [...blockers, ...pending];
        report.status = parts.some(
          (part) =>
            part.status === "rejected" &&
            part.reason instanceof AlgalError &&
            part.reason.code === "DIGEST_MISMATCH",
        )
          ? "stale"
          : blockers.length
            ? "blocked"
            : pending.length
              ? "pending"
              : "ready";
      }
      const after = this.parsePull(
        await this.get(session, `${this.root}/pulls/${this.pullNumber}`),
      );
      if (
        !sameRevision(pull.revision, after.revision) ||
        pull.state !== after.state ||
        pull.draft !== after.draft ||
        pull.baseRef !== after.baseRef ||
        pull.mergeable !== after.mergeable
      ) {
        report.status = "stale";
        report.reasons.push("pull-request-changed-during-collection");
      }
    } catch (error) {
      report.status =
        error instanceof AlgalError && error.code === "DIGEST_MISMATCH"
          ? "stale"
          : "blocked";
      report.policy.complete = false;
      report.reasons.push(
        error instanceof AlgalError
          ? error.message
          : "GitHub evidence unavailable",
      );
    }
    report.reasons = [...new Set(report.reasons)].sort();
    const bounded = jsonBounded(report, GITHUB_BOUNDS.maxEvidenceBytes);
    return { ...report, digest: digestCanonical(bounded) };
  }

  async refresh(previous: GitHubEvidence): Promise<GitHubEvidence> {
    if (
      previous.repository !== this.repository ||
      previous.pullNumber !== this.pullNumber ||
      !previous.revision
    )
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "GitHub snapshot belongs to another target or lacks a revision",
      );
    const current = await this.collect(previous.revision);
    if (current.baseRef === previous.baseRef || current.status === "stale")
      return current;
    const { digest: _digest, ...body } = current;
    body.status = "stale";
    body.reasons = [
      ...new Set([...body.reasons, "base-branch-changed"]),
    ].sort();
    return { ...body, digest: digestCanonical(body as unknown as JsonValue) };
  }

  /** Final host action. The caller must durably record dispatch intent before
   * calling. A timeout or ambiguous reply is uncertain and is never retried. */
  async merge(approvedDigest: Digest): Promise<GitHubMergeResult> {
    if (!this.allowMerge)
      throw new AlgalError(
        "CAPABILITY_DENIED",
        "GitHub merge is not host-admitted",
      );
    asDigest(approvedDigest, "approved GitHub evidence digest");
    const evidence = await this.collect();
    if (evidence.status !== "ready" || !evidence.revision)
      return { outcome: "blocked", evidence };
    if (evidence.digest !== approvedDigest)
      return { outcome: "stale", evidence };
    if (!evidence.policy.strictRequiredChecks)
      return {
        outcome: "blocked",
        evidence,
        reason:
          "automatic merge requires non-bypassable server-side strict required checks",
      };
    const session = { requests: 0, bytes: 0 };
    try {
      const response = await this.request(
        session,
        `${this.root}/pulls/${this.pullNumber}/merge`,
        "PUT",
        { sha: evidence.revision.headSha, merge_method: this.mergeMethod },
      );
      if (response.status === 409) return { outcome: "stale", evidence };
      if ([403, 404, 405, 422].includes(response.status))
        return { outcome: "blocked", evidence };
      if (response.status !== 200 || obj(response.body).merged !== true)
        return { outcome: "uncertain", evidence };
      const mergeCommit = sha(obj(response.body).sha);
      const after = this.parsePull(
        await this.get(session, `${this.root}/pulls/${this.pullNumber}`),
      );
      if (
        after.state !== "merged" ||
        after.revision.headSha !== evidence.revision.headSha ||
        after.revision.mergeSha !== mergeCommit
      )
        return { outcome: "uncertain", evidence };
      return { outcome: "merged", evidence, mergeCommit };
    } catch {
      return { outcome: "uncertain", evidence };
    }
  }
}
