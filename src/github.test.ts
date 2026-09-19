import { describe, expect, test } from "bun:test";
import {
  GitHubClient,
  type GitHubRequest,
  type GitHubResponse,
} from "./github";
import type { JsonObject, JsonValue } from "./values";

const HEAD = "a".repeat(40),
  BASE = "b".repeat(40),
  MERGE = "c".repeat(40),
  NEXT = "d".repeat(40);
const check = (
  id = 1,
  name = "ci",
  conclusion = "success",
  head = HEAD,
): JsonObject => ({
  id,
  name,
  head_sha: head,
  status: "completed",
  conclusion,
  app: { id: 42 },
  html_url: `https://github.com/acme/demo/actions/runs/${id}`,
});

class Fixture {
  pull: JsonObject = {
    number: 7,
    state: "open",
    merged: false,
    draft: false,
    mergeable: true,
    merge_commit_sha: MERGE,
    head: { sha: HEAD },
    base: { sha: BASE, ref: "main", repo: { full_name: "acme/demo" } },
  };
  headChecks: JsonValue[] = [check()];
  mergeChecks: JsonValue[] = [];
  statuses: JsonValue[] = [];
  threads: JsonValue[] = [];
  rules: JsonValue[] = [];
  protected = false;
  protection: JsonValue = {
    required_status_checks: {
      contexts: ["ci"],
      checks: [{ context: "ci", app_id: 42 }],
    },
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      require_code_owner_reviews: false,
      require_last_push_approval: false,
    },
  };
  decision: string | null = null;
  mergeState = "CLEAN";
  calls: GitHubRequest[] = [];
  hook?: (request: GitHubRequest) => GitHubResponse | undefined;
  mergeError = false;
  mergeStatus = 200;
  client(options: { allowMerge?: boolean } = {}): GitHubClient {
    return new GitHubClient({
      repository: "acme/demo",
      pullNumber: 7,
      transport: this.transport,
      requiredChecks: [{ name: "ci", appId: 42 }],
      ...options,
    });
  }
  transport = async (request: GitHubRequest): Promise<GitHubResponse> => {
    this.calls.push(request);
    const custom = this.hook?.(request);
    if (custom) return structuredClone(custom);
    const path = request.path,
      page = Number(
        new URL(`https://api.github.com${path}`).searchParams.get("page") ??
          "1",
      );
    let body: unknown;
    if (path === "/repos/acme/demo/pulls/7/merge") {
      if (this.mergeStatus !== 200)
        return { status: this.mergeStatus, body: { message: "not permitted" } };
      expect(request.method).toBe("PUT");
      expect(request.body).toEqual({ sha: HEAD, merge_method: "merge" });
      this.pull.state = "closed";
      this.pull.merged = true;
      if (this.mergeError) throw new Error("reply lost after remote mutation");
      body = { merged: true, sha: MERGE };
    } else if (path === "/repos/acme/demo/pulls/7") body = this.pull;
    else if (path === "/repos/acme/demo/branches/main")
      body = { protected: this.protected, commit: { sha: BASE } };
    else if (path === "/repos/acme/demo/branches/main/protection")
      body = this.protection;
    else if (path.startsWith("/repos/acme/demo/rules/branches/main?"))
      body = this.rules.slice((page - 1) * 100, page * 100);
    else if (path.endsWith(`/git/commits/${MERGE}`))
      body = { sha: MERGE, parents: [{ sha: BASE }, { sha: HEAD }] };
    else if (path.includes("/check-runs?")) {
      const all = path.includes(HEAD) ? this.headChecks : this.mergeChecks;
      body = {
        total_count: all.length,
        check_runs: all.slice((page - 1) * 100, page * 100),
      };
    } else if (path.includes("/status?")) {
      const all = path.includes(HEAD) ? this.statuses : [];
      body = {
        sha: path.includes(HEAD) ? HEAD : MERGE,
        total_count: all.length,
        statuses: all.slice((page - 1) * 100, page * 100),
      };
    } else if (path === "/graphql") {
      const cursor = ((request.body as JsonObject).variables as JsonObject)
        .after;
      const offset = cursor === null ? 0 : Number(cursor);
      body = {
        data: {
          repository: {
            pullRequest: {
              headRefOid: (this.pull.head as JsonObject).sha,
              baseRefOid: (this.pull.base as JsonObject).sha,
              mergeStateStatus: this.mergeState,
              reviewDecision: this.decision,
              reviewThreads: {
                totalCount: this.threads.length,
                nodes: this.threads.slice(offset, offset + 100),
                pageInfo: {
                  hasNextPage: this.threads.length > offset + 100,
                  endCursor: String(offset + 100),
                },
              },
            },
          },
        },
      };
    } else throw new Error(`unexpected fixture endpoint: ${path}`);
    return { status: 200, body: structuredClone(body) };
  };
}

describe("exact-head GitHub evidence", () => {
  test("accepts complete current-head evidence and produces a stable digest", async () => {
    const f = new Fixture(),
      client = f.client();
    const first = await client.collect(),
      second = await client.refresh(first);
    expect(first.status).toBe("ready");
    expect(first.revision).toEqual({
      headSha: HEAD,
      baseSha: BASE,
      mergeSha: MERGE,
    });
    expect(second.digest).toBe(first.digest);
    expect(first.checksSha).toBe(HEAD);
    expect(
      f.calls.every(
        (x) => x.path === "/graphql" || x.path.startsWith("/repos/acme/demo/"),
      ),
    ).toBe(true);
    expect(
      f.calls.every(
        (x) => x.maxBytes === 2_000_000 && x.signal instanceof AbortSignal,
      ),
    ).toBe(true);
  });
  test("neutral and skipped completed checks have GitHub's successful semantics", async () => {
    const f = new Fixture();
    f.headChecks = [check(1, "ci", "neutral"), check(2, "docs", "skipped")];
    expect((await f.client().collect()).status).toBe("ready");
  });
  test("a newer successful duplicate does not hide an earlier failing check", async () => {
    const f = new Fixture();
    f.headChecks = [check(1, "ci", "failure"), check(2)];
    expect((await f.client().collect()).reasons).toContain("check-failed:ci");
  });
  test("external commit status failure blocks despite green Actions checks", async () => {
    const f = new Fixture();
    f.statuses = [
      {
        id: 90,
        context: "external/build",
        state: "failure",
        target_url: "https://example.com/build/90",
      },
    ];
    expect((await f.client().collect()).status).toBe("blocked");
  });
  test("pending checks and missing required checks never become ready", async () => {
    const f = new Fixture();
    f.headChecks = [{ ...check(), status: "in_progress", conclusion: null }];
    expect((await f.client().collect()).status).toBe("pending");
    f.headChecks = [check(2, "other")];
    expect((await f.client().collect()).reasons).toContain(
      "required-check-missing:ci",
    );
  });
  test("aggregate UNSTABLE or BLOCKED from unfinished CI remains pending", async () => {
    for (const state of ["UNSTABLE", "BLOCKED"]) {
      const f = new Fixture();
      f.mergeState = state;
      f.headChecks = [{ ...check(), status: "in_progress", conclusion: null }];
      expect((await f.client().collect()).status).toBe("pending");
      f.decision = "REVIEW_REQUIRED";
      expect((await f.client().collect()).status).toBe("blocked");
      f.decision = null;
      f.headChecks = [check()];
      expect((await f.client().collect()).status).toBe("blocked");
    }
  });
  test("required check App identity is enforced", async () => {
    const f = new Fixture();
    f.headChecks = [{ ...check(), app: { id: 99 } }];
    expect((await f.client().collect()).status).toBe("pending");
  });
  test("test merge checks supersede a green head and bind both parent commits", async () => {
    const f = new Fixture();
    f.mergeChecks = [check(2, "ci", "failure", MERGE)];
    const report = await f.client().collect();
    expect(report.checksSha).toBe(MERGE);
    expect(report.status).toBe("blocked");
    f.hook = (r) =>
      r.path.includes("/git/commits/")
        ? {
            status: 200,
            body: { sha: MERGE, parents: [{ sha: NEXT }, { sha: HEAD }] },
          }
        : undefined;
    expect((await f.client().collect()).policy.complete).toBe(false);
  });
  test("a check reporting another commit invalidates the snapshot", async () => {
    const f = new Fixture();
    f.headChecks = [check(1, "ci", "success", NEXT)];
    expect((await f.client().collect()).status).toBe("blocked");
  });
  test("a status response from another SHA is rejected", async () => {
    const f = new Fixture();
    f.hook = (r) =>
      r.path.includes("/status?")
        ? { status: 200, body: { sha: NEXT, total_count: 0, statuses: [] } }
        : undefined;
    expect((await f.client().collect()).status).toBe("blocked");
  });
  test("changes to raw policy invalidate approval even when the verdict stays ready", async () => {
    const f = new Fixture();
    f.protected = true;
    f.decision = "APPROVED";
    const client = f.client(),
      first = await client.collect();
    (
      (f.protection as JsonObject).required_pull_request_reviews as JsonObject
    ).required_approving_review_count = 2;
    const second = await client.collect();
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    expect(second.digest).not.toBe(first.digest);
  });
  test("closed and merged PRs are terminal, not ready", async () => {
    const f = new Fixture();
    f.pull.state = "closed";
    expect((await f.client().collect()).reasons).toContain(
      "pull-request-closed",
    );
    f.pull.merged = true;
    expect((await f.client().collect()).reasons).toContain(
      "pull-request-merged",
    );
  });
  test("draft, conflicts and unknown mergeability remain distinct", async () => {
    const f = new Fixture();
    f.pull.draft = true;
    expect((await f.client().collect()).reasons).toContain("draft");
    f.pull.draft = false;
    f.pull.mergeable = false;
    expect((await f.client().collect()).reasons).toContain("merge-conflict");
    f.pull.mergeable = null;
    expect((await f.client().collect()).status).toBe("pending");
  });
  test("review requirements, changes requested and unresolved threads block", async () => {
    const f = new Fixture();
    f.decision = "REVIEW_REQUIRED";
    expect((await f.client().collect()).reasons).toContain("review-required");
    f.decision = "CHANGES_REQUESTED";
    expect((await f.client().collect()).reasons).toContain("changes-requested");
    f.decision = "APPROVED";
    f.threads = [{ id: "thread-1", isResolved: false }];
    expect((await f.client().collect()).reasons).toContain(
      "unresolved-review-threads",
    );
  });
  test("head, base and test merge changes invalidate an approved revision", async () => {
    for (const field of ["headSha", "baseSha", "mergeSha"] as const) {
      const f = new Fixture(),
        revision = {
          headSha: HEAD,
          baseSha: BASE,
          mergeSha: MERGE,
          [field]: NEXT,
        };
      expect((await f.client().collect(revision)).status).toBe("stale");
    }
  });
  test("head change during collection cannot pass the final identity refresh", async () => {
    const f = new Fixture();
    let reads = 0;
    f.hook = (r) => {
      if (r.path === "/repos/acme/demo/pulls/7" && ++reads === 2)
        return { status: 200, body: { ...f.pull, head: { sha: NEXT } } };
      return undefined;
    };
    expect((await f.client().collect()).status).toBe("stale");
  });
  test("legacy and inherited rules are collected and unavailable policy fails closed", async () => {
    const f = new Fixture();
    f.protected = true;
    f.decision = "APPROVED";
    f.rules = [
      {
        type: "required_status_checks",
        parameters: {
          required_status_checks: [{ context: "security", integration_id: 42 }],
        },
      },
    ];
    expect((await f.client().collect()).reasons).toContain(
      "required-check-missing:security",
    );
    f.hook = (r) =>
      r.path.endsWith("/protection")
        ? { status: 404, body: { message: "Not Found" } }
        : undefined;
    expect((await f.client().collect()).policy.complete).toBe(false);
  });
  test("unknown active rules and partial GraphQL replies fail closed", async () => {
    const f = new Fixture();
    f.rules = [{ type: "merge_queue", parameters: {} }];
    expect((await f.client().collect()).status).toBe("blocked");
    f.rules = [];
    f.hook = (r) =>
      r.path === "/graphql"
        ? { status: 200, body: { data: {}, errors: [{ message: "hidden" }] } }
        : undefined;
    expect((await f.client().collect()).policy.complete).toBe(false);
  });
  test("fetches page two and detects duplicate IDs instead of trusting a green first page", async () => {
    const f = new Fixture();
    f.headChecks = Array.from({ length: 101 }, (_, i) =>
      check(
        i + 1,
        i === 0 ? "ci" : `job-${i}`,
        i === 100 ? "failure" : "success",
      ),
    );
    expect((await f.client().collect()).reasons).toContain(
      "check-failed:job-100",
    );
    f.headChecks[100] = check();
    expect((await f.client().collect()).policy.complete).toBe(false);
  });
  test("review pagination finds unresolved threads after page one", async () => {
    const f = new Fixture();
    f.threads = Array.from({ length: 101 }, (_, i) => ({
      id: `thread-${i}`,
      isResolved: i < 100,
    }));
    expect((await f.client().collect()).review?.unresolvedThreads).toBe(1);
  });
  test("bounded count overflow, malformed SHA, and rate limiting cannot look green", async () => {
    const f = new Fixture();
    f.headChecks = Array.from({ length: 501 }, (_, i) => check(i + 1));
    expect((await f.client().collect()).policy.complete).toBe(false);
    f.headChecks = [check()];
    (f.pull.head as JsonObject).sha = HEAD.slice(0, 12);
    expect((await f.client().collect()).revision).toBe(null);
    f.hook = () => ({ status: 429, body: { message: "rate limited" } });
    expect((await f.client().collect()).status).toBe("blocked");
  });
  test("merge is disabled by default and wrong approval never issues a PUT", async () => {
    const f = new Fixture(),
      initial = await f.client().collect();
    await expect(f.client().merge(initial.digest)).rejects.toThrow(
      "not host-admitted",
    );
    const client = f.client({ allowMerge: true });
    f.headChecks.push(check(2, "additional"));
    expect((await client.merge(initial.digest)).outcome).toBe("stale");
    expect(f.calls.filter((x) => x.method === "PUT")).toHaveLength(0);
  });
  test("a ready snapshot without strict server protection cannot issue a merge PUT", async () => {
    const f = new Fixture(),
      client = f.client({ allowMerge: true }),
      initial = await client.collect();
    f.hook = (r) => {
      // The fake server would move the base just as a merge arrives. Absence of
      // an atomic server guard prevents reaching that write at all.
      if (r.method === "PUT") {
        (f.pull.base as JsonObject).sha = NEXT;
        return { status: 200, body: { merged: true, sha: MERGE } };
      }
      return undefined;
    };
    const result = await client.merge(initial.digest);
    expect(initial.status).toBe("ready");
    expect(result.outcome).toBe("blocked");
    expect(result.reason).toContain("strict required checks");
    expect(f.calls.filter((x) => x.method === "PUT")).toHaveLength(0);
  });
  test("strict legacy policy with admin bypass does not admit automatic merge", async () => {
    const f = new Fixture();
    f.protected = true;
    f.decision = "APPROVED";
    ((f.protection as JsonObject).required_status_checks as JsonObject).strict =
      true;
    (f.protection as JsonObject).enforce_admins = { enabled: false };
    const client = f.client({ allowMerge: true }),
      initial = await client.collect();
    expect(initial.status).toBe("ready");
    expect(initial.policy.strictRequiredChecks).toBe(false);
    expect((await client.merge(initial.digest)).outcome).toBe("blocked");
  });
  test("strict ruleset admission requires visible empty bypass policy", async () => {
    const f = new Fixture();
    f.rules = [
      {
        type: "required_status_checks",
        ruleset_id: 17,
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [{ context: "ci", integration_id: 42 }],
        },
      },
    ];
    let bypass: JsonValue[] = [];
    f.hook = (r) =>
      r.path.endsWith("/rulesets/17")
        ? {
            status: 200,
            body: { id: 17, enforcement: "active", bypass_actors: bypass },
          }
        : undefined;
    const first = await f.client().collect();
    expect(first.status).toBe("ready");
    expect(first.policy.strictRequiredChecks).toBe(true);
    bypass = [
      { actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "always" },
    ];
    const second = await f.client().collect();
    expect(second.policy.strictRequiredChecks).toBe(false);
    expect(second.digest).not.toBe(first.digest);
  });
  test("retargeting the base branch at the same commit invalidates refresh", async () => {
    const f = new Fixture(),
      client = f.client(),
      first = await client.collect();
    (f.pull.base as JsonObject).ref = "release";
    f.hook = (r) =>
      r.path === "/repos/acme/demo/branches/release"
        ? { status: 200, body: { protected: false, commit: { sha: BASE } } }
        : r.path.startsWith("/repos/acme/demo/rules/branches/release?")
          ? { status: 200, body: [] }
          : undefined;
    const second = await client.refresh(first);
    expect(second.status).toBe("stale");
    expect(second.reasons).toContain("base-branch-changed");
    expect(second.digest).not.toBe(first.digest);
  });
  test("changing page totals or malformed status enums cannot pass admission", async () => {
    const f = new Fixture();
    f.headChecks = Array.from({ length: 101 }, (_, i) =>
      check(i + 1, i === 0 ? "ci" : `job-${i}`),
    );
    f.hook = (r) =>
      r.path.includes("/check-runs?") &&
      r.path.includes(HEAD) &&
      r.path.endsWith("page=2")
        ? {
            status: 200,
            body: { total_count: 100, check_runs: [check(101, "last")] },
          }
        : undefined;
    expect((await f.client().collect()).policy.complete).toBe(false);
    delete f.hook;
    f.headChecks = [{ ...check(), status: ["completed"] }];
    expect((await f.client().collect()).status).toBe("blocked");
  });
  test("returned evidence cannot mutate host-admitted required checks", async () => {
    const f = new Fixture();
    const client = new GitHubClient({
      repository: "acme/demo",
      pullNumber: 7,
      transport: f.transport,
      requiredChecks: [{ name: "security", appId: 42 }],
    });
    const first = await client.collect();
    expect(first.status).toBe("pending");
    first.policy.requiredChecks[0]!.name = "ci";
    const second = await client.collect();
    expect(second.status).toBe("pending");
    expect(second.policy.requiredChecks[0]!.name).toBe("security");
  });
  test("conditional merge sends exact approved SHA and verifies external completion", async () => {
    const f = new Fixture();
    f.protected = true;
    f.decision = "APPROVED";
    (f.protection as JsonObject).enforce_admins = { enabled: true };
    ((f.protection as JsonObject).required_status_checks as JsonObject).strict =
      true;
    const client = f.client({ allowMerge: true }),
      initial = await client.collect();
    expect((await client.merge(initial.digest)).outcome).toBe("merged");
    expect(f.calls.filter((x) => x.method === "PUT")).toHaveLength(1);
  });
  test("uncertain merge response stays uncertain and is never retried", async () => {
    const f = new Fixture();
    f.protected = true;
    f.decision = "APPROVED";
    (f.protection as JsonObject).enforce_admins = { enabled: true };
    ((f.protection as JsonObject).required_status_checks as JsonObject).strict =
      true;
    const client = f.client({ allowMerge: true }),
      initial = await client.collect();
    f.mergeError = true;
    expect((await client.merge(initial.digest)).outcome).toBe("uncertain");
    expect(f.calls.filter((x) => x.method === "PUT")).toHaveLength(1);
  });
  test("GitHub's conditional-write conflict is stale rather than success", async () => {
    const f = new Fixture();
    f.protected = true;
    f.decision = "APPROVED";
    (f.protection as JsonObject).enforce_admins = { enabled: true };
    ((f.protection as JsonObject).required_status_checks as JsonObject).strict =
      true;
    const client = f.client({ allowMerge: true }),
      initial = await client.collect();
    f.mergeStatus = 409;
    expect((await client.merge(initial.digest)).outcome).toBe("stale");
  });
});
