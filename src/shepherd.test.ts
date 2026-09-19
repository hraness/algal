import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GitHubClient,
  type GitHubCheck,
  type GitHubRequest,
  type GitHubResponse,
} from "./github";
import { PullRequestShepherd, shepherdPacket } from "./shepherd";
import {
  asObject,
  canonicalBytes,
  type JsonObject,
  type JsonValue,
} from "./values";
import { FileStore } from "./store";
import type { Digest } from "./digest";

const HEAD = "a".repeat(40),
  BASE = "b".repeat(40),
  MERGE = "c".repeat(40),
  NEXT = "d".repeat(40);
const directories: string[] = [];
async function directory(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "algal-shepherd-test-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  for (const dir of directories.splice(0))
    await rm(dir, { recursive: true, force: true });
});

/** Finite GitHub transport responses; filesystem, mailboxes, timer service,
 * journal, VM execution and offline verification are the real implementations. */
class GitHubFixture {
  pending = true;
  failed = false;
  externalFailure = false;
  head = HEAD;
  baseRef = "main";
  requests: GitHubRequest[] = [];
  reads = 0;
  transport = async (request: GitHubRequest): Promise<GitHubResponse> => {
    this.requests.push(request);
    this.reads++;
    if (
      request.method !== "GET" &&
      !(request.method === "POST" && request.path === "/graphql")
    )
      throw new Error("Test forbids remote writes");
    let body: unknown;
    const path = request.path;
    if (path === "/repos/acme/demo/pulls/7")
      body = {
        number: 7,
        state: "open",
        merged: false,
        draft: false,
        mergeable: true,
        merge_commit_sha: MERGE,
        head: { sha: this.head },
        base: {
          sha: BASE,
          ref: this.baseRef,
          repo: { full_name: "acme/demo" },
        },
      };
    else if (path.startsWith("/repos/acme/demo/branches/"))
      body = { protected: false, commit: { sha: BASE } };
    else if (path.startsWith("/repos/acme/demo/rules/branches/")) body = [];
    else if (path.includes("/check-runs?")) {
      const checks = path.includes(this.head)
        ? [
            {
              id: 1,
              name: "ci",
              head_sha: this.head,
              status: this.pending ? "in_progress" : "completed",
              conclusion: this.pending
                ? null
                : this.failed
                  ? "failure"
                  : "success",
              app: { id: 42 },
              html_url: "https://github.com/acme/demo/actions/runs/1",
            },
          ]
        : [];
      body = { total_count: checks.length, check_runs: checks };
    } else if (path.includes("/status?")) {
      const statuses =
        path.includes(this.head) && this.externalFailure
          ? [
              {
                id: 90,
                context: "buildkite/build",
                state: "failure",
                target_url: "https://buildkite.com/acme/demo/builds/90",
              },
            ]
          : [];
      body = {
        sha: path.includes(this.head) ? this.head : MERGE,
        total_count: statuses.length,
        statuses,
      };
    } else if (path === `/repos/acme/demo/git/commits/${MERGE}`)
      body = { sha: MERGE, parents: [{ sha: BASE }, { sha: this.head }] };
    else if (path === "/graphql")
      body = {
        data: {
          repository: {
            pullRequest: {
              headRefOid: this.head,
              baseRefOid: BASE,
              mergeStateStatus:
                this.pending || this.failed || this.externalFailure
                  ? "UNSTABLE"
                  : "CLEAN",
              reviewDecision: null,
              reviewThreads: {
                totalCount: 0,
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        },
      };
    else throw new Error(`Unexpected test request ${path}`);
    return { status: 200, body };
  };
}
const options = {
  name: "pr-watch",
  repository: "acme/demo",
  pullNumber: 7,
  intervalMs: 1000,
  maxPolls: 3,
  requiredChecks: [{ name: "ci", appId: 42 }],
};

async function lastReceipt(
  dir: string,
  ref: Digest | undefined,
): Promise<JsonObject> {
  expect(ref).toBeDefined();
  return asObject(
    JSON.parse(
      await readFile(join(dir, "runs", `${ref!.slice(7)}.json`), "utf8"),
    ),
    "receipt",
  );
}

describe("durable PR shepherd application", () => {
  test("pending CI suspends, leaves a durable timer, and becomes ready from a fresh host instance", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    let time = 10_000;
    const first = new PullRequestShepherd(dir, github.transport, () => time);
    expect((await first.start(options)).process.process.status).toBe("ready");
    expect(github.reads).toBe(0);
    const paused = await first.tick(options.name);
    expect(paused.process.process.status).toBe("suspended");
    expect(paused.nextTimer).not.toBeNull();
    expect(asObject(paused.result, "pending result").action).toBe("wait");
    const timer = (await first.events.list()).find(
      (x) => x.event.eventId === paused.nextTimer,
    )!;
    expect(timer.event.dueAtMs).toBe(time + 1000);
    const pendingReads = github.reads;
    const restarted = new PullRequestShepherd(
      dir,
      github.transport,
      () => time,
    );
    const idle = await restarted.tick(options.name);
    expect(idle.process.digest).toBe(paused.process.digest);
    expect(github.reads).toBe(pendingReads);
    time += 1000;
    github.pending = false;
    const ready = await restarted.tick(options.name);
    expect(ready.process.process.status).toBe("complete");
    expect(ready.process.process.generation).toBe(2);
    expect(ready.nextTimer).toBeNull();
    const packet = asObject(ready.result, "ready packet");
    expect(packet.action).toBe("review");
    expect(packet.remoteWriteAuthorized).toBe(false);
    const retained = asObject(
      await new FileStore(dir).getValue(packet.evidenceRef as Digest),
      "retained evidence",
    );
    expect(retained.digest).toBe(packet.evidenceDigest);
    expect(
      (await first.events.list()).filter((x) => x.status === "pending"),
    ).toHaveLength(0);
  });

  test("duplicate host wake deliveries and idle invocations do not repeat GitHub reads", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    let time = 20_000;
    const host = new PullRequestShepherd(dir, github.transport, () => time);
    await host.start(options);
    const first = await host.tick(options.name);
    const firstWake = await host.wake(options.name, "github-delivery-17"),
      duplicate = await host.wake(options.name, "github-delivery-17");
    expect(duplicate).toEqual(firstWake);
    const second = await new PullRequestShepherd(
      dir,
      github.transport,
      () => time,
    ).tick(options.name);
    expect(second.process.process.generation).toBe(
      first.process.process.generation + 1,
    );
    const afterWakeReads = github.reads;
    await host.wake(options.name, "github-delivery-17");
    expect((await host.tick(options.name)).process.digest).toBe(
      second.process.digest,
    );
    expect(github.reads).toBe(afterWakeReads);
    // The old generation's scheduled timer is cancelled; only the new one waits.
    expect(
      (await host.events.list()).filter(
        (x) => x.event.source === "shepherd-timer" && x.status === "pending",
      ),
    ).toHaveLength(1);
    time += 1000;
  });

  test("a pushed head invalidates the pending episode rather than reusing green evidence", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    let time = 30_000;
    const host = new PullRequestShepherd(dir, github.transport, () => time);
    await host.start(options);
    await host.tick(options.name);
    github.pending = false;
    github.head = NEXT;
    time += 1000;
    const stale = await new PullRequestShepherd(
      dir,
      github.transport,
      () => time,
    ).tick(options.name);
    expect(stale.process.process.status).toBe("complete");
    expect(asObject(stale.result, "stale packet")).toMatchObject({
      status: "stale",
      action: "refresh",
      remoteWriteAuthorized: false,
    });
    expect(stale.nextTimer).toBeNull();
  });

  test("retargeting the base at the same SHA also invalidates the episode", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    let time = 40_000;
    const host = new PullRequestShepherd(dir, github.transport, () => time);
    await host.start(options);
    await host.tick(options.name);
    github.pending = false;
    github.baseRef = "release";
    time += 1000;
    const stale = await host.tick(options.name);
    expect(asObject(stale.result, "retargeted packet")).toMatchObject({
      status: "stale",
      action: "refresh",
    });
  });

  test("legacy external CI failures produce a retained repair proposal, never a remote repair", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    github.pending = false;
    github.externalFailure = true;
    const host = new PullRequestShepherd(dir, github.transport, () => 50_000);
    await host.start(options);
    const failed = await host.tick(options.name);
    expect(failed.process.process.status).toBe("complete");
    const packet = asObject(failed.result, "failure packet");
    expect(packet.action).toBe("repair");
    expect(packet.remoteWriteAuthorized).toBe(false);
    expect(packet.failedChecks).toMatchObject([
      { kind: "status", name: "buildkite/build", status: "failure" },
    ]);
    expect(github.requests.some((r) => r.method === "PUT")).toBe(false);
    expect(failed.nextTimer).toBeNull();
  });

  test("maxPolls bounds the episode and stops future polling", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    let time = 60_000;
    const host = new PullRequestShepherd(dir, github.transport, () => time);
    await host.start({ ...options, maxPolls: 2 });
    await host.tick(options.name);
    const firstReads = github.reads;
    time += 1000;
    const exhausted = await host.tick(options.name);
    expect(exhausted.process.process.status).toBe("complete");
    expect(asObject(exhausted.result, "exhausted packet").action).toBe(
      "budget-exhausted",
    );
    expect(github.reads).toBe(firstReads * 2);
    const doneReads = github.reads;
    time += 1000;
    await host.tick(options.name);
    expect(github.reads).toBe(doneReads);
    expect(exhausted.nextTimer).toBeNull();
  });

  test("an already cancelled watch performs no GitHub work or event admission", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    const host = new PullRequestShepherd(dir, github.transport, () => 65_000);
    const created = await host.start(options);
    const beforeEvents = await host.events.list();
    const controller = new AbortController();
    controller.abort();
    const result = await host.watch(options.name, {
      signal: controller.signal,
      maxPasses: 2,
      maxDurationMs: 1000,
    });
    expect(result.reason).toBe("cancelled");
    expect(result.passes).toBe(0);
    expect(result.report.process.digest).toBe(created.process.digest);
    expect(github.reads).toBe(0);
    expect(await host.events.list()).toEqual(beforeEvents);
  });

  test("offline verification and inspection never contact GitHub or execute writes", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    github.pending = false;
    const host = new PullRequestShepherd(dir, github.transport, () => 70_000);
    await host.start(options);
    const completed = await host.tick(options.name);
    let forbiddenCalls = 0;
    const offline = new PullRequestShepherd(
      dir,
      async () => {
        forbiddenCalls++;
        throw new Error("offline verifier reached GitHub");
      },
      () => 71_000,
    );
    expect(await offline.verify(options.name)).toMatchObject({
      ok: true,
      generations: 1,
      receipts: 1,
    });
    expect((await offline.inspect(options.name)).process.digest).toBe(
      completed.process.digest,
    );
    expect(forbiddenCalls).toBe(0);
    const receipt = await lastReceipt(dir, completed.process.process.receipt);
    expect(JSON.stringify(receipt)).not.toContain("dueAtMs");
  });

  test("restarting identical config is idempotent and conflicting config preserves admission", async () => {
    const dir = await directory(),
      github = new GitHubFixture();
    const host = new PullRequestShepherd(dir, github.transport, () => 80_000);
    const first = await host.start(options);
    expect((await host.start(options)).process.digest).toBe(
      first.process.digest,
    );
    await expect(
      host.start({ ...options, repository: "other/repo" }),
    ).rejects.toThrow("conflict");
    await expect(host.start({ ...options, intervalMs: 2000 })).rejects.toThrow(
      "conflict",
    );
    expect((await host.inspect(options.name)).config.repository).toBe(
      "acme/demo",
    );
    expect(github.reads).toBe(0);
  });

  test("large valid failure evidence yields a byte-bounded packet with explicit truncation", async () => {
    const github = new GitHubFixture();
    github.pending = false;
    const evidence = await new GitHubClient({
      repository: "acme/demo",
      pullNumber: 7,
      transport: github.transport,
    }).collect();
    evidence.status = "blocked";
    evidence.reasons = Array.from(
      { length: 200 },
      (_, i) => `failure-${i}-${"x".repeat(400)}`,
    );
    evidence.checks = Array.from({ length: 80 }, (_, i): GitHubCheck => ({
      kind: "check",
      id: `check:${i + 1}`,
      name: `failure-${i}-${"x".repeat(180)}`,
      sha: HEAD,
      appId: 42,
      status: "completed",
      conclusion: "failure",
      url: `https://example.com/${"x".repeat(1980)}`,
    }));
    evidence.policy.requiredChecks = evidence.checks.map((check) => ({
      name: check.name,
      appId: 42,
    }));
    expect(canonicalBytes(evidence as unknown as JsonValue)).toBeLessThan(
      500_000,
    );
    const packet = asObject(shepherdPacket(evidence), "bounded packet");
    expect(canonicalBytes(packet)).toBeLessThanOrEqual(32_768);
    expect(packet).toMatchObject({
      action: "repair",
      reasonsTruncated: true,
      failedChecksTruncated: true,
      requiredChecksTruncated: true,
      remoteWriteAuthorized: false,
    });
  });
});
