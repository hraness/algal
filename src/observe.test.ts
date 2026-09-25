import { afterEach, expect, test } from "bun:test";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestCanonical, type Digest } from "./digest";
import { boundedBytes } from "./io";
import {
  diffSnapshots,
  followStore,
  observeStore,
  OBSERVE_BOUNDS,
  type ObserveFollowEvent,
  type ObserveSnapshot,
} from "./observe";
import { FileMailboxService } from "./mailbox";
import { ProcessSupervisor } from "./process";
import { canonicalize, type JsonValue } from "./values";

const dirs: string[] = [];
async function directory() {
  const d = await mkdtemp(join(tmpdir(), "algal-observe-test-"));
  dirs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});

const cliPath = resolve(import.meta.dir, "../cli.ts");
async function cli(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, cliPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 20_000,
  });
  try {
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      boundedBytes(child.stdout, 4_194_304, "CLI stdout"),
      boundedBytes(child.stderr, 65_536, "CLI stderr"),
    ]);
    return {
      code,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  } finally {
    child.kill("SIGKILL");
    await child.exited;
  }
}

const FIXTURE_MANIFEST = {
  contract: "algal.organism.v1",
  key: "organism:observe-fixture",
  name: "Observe fixture",
  cells: [
    { id: "seed", kind: "input", outputs: { value: { type: "json" } } },
    { id: "echo", kind: "fn", fn: "echo.v1" },
  ],
  edges: [
    { from: { cell: "seed", port: "value" }, to: { cell: "echo", port: "value" } },
  ],
};

async function fixture(root: string, value: JsonValue = "hello") {
  const manifest = join(root, `manifest-${String(value)}.json`);
  const args = join(root, `args-${String(value)}.json`);
  await writeFile(manifest, JSON.stringify(FIXTURE_MANIFEST));
  await writeFile(args, JSON.stringify({ seed: { value } }));
  return { manifest, args };
}

/** Every file's relative path and bytes, in sorted order: the strict check
 * that observation changed nothing. */
async function treeEntries(root: string, prefix: string): Promise<string[]> {
  const rows: string[] = [];
  for (const name of (await readdir(root)).sort()) {
    const path = join(root, name);
    const entry = join(prefix, name);
    const stat = await lstat(path);
    if (stat.isDirectory()) {
      rows.push(`${entry}/`);
      rows.push(...(await treeEntries(path, entry)));
    } else if (stat.isFile()) {
      rows.push(entry);
      rows.push(new TextDecoder().decode(await readFile(path)));
    } else rows.push(`${entry}?`);
  }
  return rows;
}

async function wholeTree(root: string): Promise<Digest> {
  return digestCanonical(await treeEntries(root, ""));
}

function processEntry(snapshot: ObserveSnapshot, name: string) {
  const entry = snapshot.processes.items.find((item) => item.name === name);
  expect(entry).toBeDefined();
  return entry!;
}

test("snapshot a CLI-built store, tick, and pin the diff", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);

  const created = await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store);
  expect({ code: created.code, stderr: created.stderr }).toEqual({ code: 0, stderr: "" });
  const createOut = JSON.parse(created.stdout);

  const before = await observeStore(store);
  expect(before.consistent).toBe(true);
  expect(before.truncated).toBe(false);
  expect(before.unreadable).toBe(0);
  expect(before.foreign).toBe(0);
  expect(before.processes.total).toBe(1);
  expect(processEntry(before, "actor")).toEqual({
    name: "actor",
    status: "ready",
    generation: 0,
    maxGenerations: 16,
    manifestDigest: createOut.process.manifestDigest,
    record: createOut.digest,
    cause: null,
    wake: [],
    stable: true,
  });
  expect(before.runs.total).toBe(0);
  // Snapshots are a pure function of store state: two reads are identical.
  expect(canonicalize(await observeStore(store))).toBe(canonicalize(before));

  const ticked = await cli(root, "process", "tick", "actor", "--dir", store);
  expect(ticked.code).toBe(0);
  const tickOut = JSON.parse(ticked.stdout);
  expect(tickOut.process.status).toBe("complete");

  const after = await observeStore(store);
  expect(processEntry(after, "actor")).toEqual({
    name: "actor",
    status: "complete",
    generation: 1,
    maxGenerations: 16,
    manifestDigest: createOut.process.manifestDigest,
    record: tickOut.digest,
    cause: "start",
    wake: [],
    stable: true,
  });
  expect(after.runs.total).toBe(1);
  expect(after.runs.items[0]).toMatchObject({
    digest: tickOut.process.receipt,
    manifestKey: "organism:observe-fixture",
    outcome: "complete",
    effects: 0,
  });

  // Pin the diff: one changed process row, one added run row, then counters
  // (meta keys emit in sorted order).
  const changes = diffSnapshots(before, after);
  const stripped = (entry: object) => {
    const { stable: _s, ...rest } = entry as Record<string, unknown>;
    return rest;
  };
  expect(changes.map(({ section, key, change }) => ({ section, key, change }))).toEqual([
    { section: "processes", key: "actor", change: "changed" },
    { section: "runs", key: tickOut.process.receipt, change: "added" },
    { section: "meta", key: "habitat", change: "changed" },
    { section: "meta", key: "runs", change: "changed" },
    { section: "meta", key: "store.runs", change: "changed" },
    { section: "meta", key: "store.values", change: "changed" },
  ]);
  const processChange = changes.find((c) => c.section === "processes")!;
  expect(processChange.previous).toBe(digestCanonical(stripped(processEntry(before, "actor")) as JsonValue));
  expect(processChange.value).toEqual(stripped(processEntry(after, "actor")) as JsonValue);
  const runChange = changes.find((c) => c.section === "runs")!;
  expect(runChange.previous).toBeNull();
  expect(runChange.value).toEqual(after.runs.items[0] as unknown as JsonValue);
  // Emitted records carry no wall-clock fields anywhere in the projection.
  expect(JSON.stringify(after)).not.toMatch(/"(time|timestamp|at|now|clock|elapsed)Ms?":/);
});

test("empty and missing stores project to an empty consistent snapshot", async () => {
  const root = await directory();
  const empty = join(root, "empty");
  await mkdir(empty);
  const snapshot = await observeStore(empty);
  expect(snapshot.consistent).toBe(true);
  expect(snapshot.truncated).toBe(false);
  expect(snapshot.unreadable).toBe(0);
  expect(snapshot.foreign).toBe(0);
  for (const section of [
    snapshot.processes,
    snapshot.mailboxes,
    snapshot.capabilities,
    snapshot.hostEvents,
    snapshot.applications,
  ]) {
    expect(section).toMatchObject({ items: [], total: 0, truncated: false });
  }
  expect(snapshot.habitat.accounts.total).toBe(0);
  expect(snapshot.runs).toMatchObject({ items: [], total: 0, skipped: 0 });
  expect(snapshot.store.values).toEqual({ count: 0, truncated: false });
  expect(snapshot.store.other.items).toEqual([]);
  // A missing directory is an empty store, not an error.
  const missing = await observeStore(join(root, "missing-store"));
  expect(missing.processes.total).toBe(0);
  expect(missing.consistent).toBe(true);
});

test("foreign entries and malformed records are counted, not fatal", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  expect((await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store)).code).toBe(0);

  // Foreign layout entries: an invalid process name and junk files.
  await mkdir(join(store, "processes", "BAD NAME"));
  await writeFile(join(store, "processes", "stray-file"), "junk");
  await mkdir(join(store, "runs"), { recursive: true });
  await writeFile(join(store, "runs", "not-a-digest.json"), "{}");
  // Recognized-but-malformed records.
  await mkdir(join(store, "processes", "ghost"));
  await writeFile(join(store, "processes", "ghost", "head.json"), "not json");
  const fakeRun = `${"ab".repeat(32)}.json`;
  await writeFile(join(store, "runs", fakeRun), "{\"corrupt\":");
  const fakeCap = `${"cd".repeat(32)}.json`;
  await mkdir(join(store, "capabilities"), { recursive: true });
  await writeFile(join(store, "capabilities", fakeCap), JSON.stringify({ contract: "algal.capability.v1" }));

  const snapshot = await observeStore(store);
  expect(snapshot.consistent).toBe(true);
  expect(snapshot.processes.total).toBe(2); // actor plus the malformed ghost
  expect(snapshot.processes.items).toHaveLength(1);
  expect(snapshot.processes.unreadable).toBe(1);
  expect(snapshot.processes.errors[0]).toMatchObject({ key: "ghost" });
  expect(snapshot.processes.foreign).toBe(2); // "BAD NAME" plus stray-file
  expect(snapshot.runs.total).toBe(1);
  expect(snapshot.runs.unreadable).toBe(1);
  expect(snapshot.runs.foreign).toBe(1);
  expect(snapshot.capabilities.unreadable).toBe(1);
  expect(snapshot.foreign).toBe(3);
  expect(snapshot.unreadable).toBeGreaterThanOrEqual(3);
  // The malformed entries never interrupt the healthy ones.
  expect(processEntry(snapshot, "actor").status).toBe("ready");
});

test("maxItems bounds every listing and sets explicit truncation flags", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  for (const name of ["alpha", "bravo"])
    expect((await cli(root, "process", "create", name, manifest, "--args", args, "--dir", store)).code).toBe(0);

  const snapshot = await observeStore(store, { maxItems: 1 });
  expect(snapshot.processes.total).toBe(2);
  expect(snapshot.processes.items).toHaveLength(1);
  expect(snapshot.processes.items[0]!.name).toBe("alpha");
  expect(snapshot.processes.truncated).toBe(true);
  expect(snapshot.truncated).toBe(true);
  // maxItems is clamped to the implementation bound.
  const clamped = await observeStore(store, { maxItems: 999_999 });
  expect(clamped.processes.items).toHaveLength(2);
  expect(clamped.processes.truncated).toBe(false);
});

test("observe reports a straddled transition through stable/consistent flags", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  expect((await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store)).code).toBe(0);

  // A writer that lands between the scan and the confirm pass moves the head;
  // the entry is flagged instead of silently stitched.
  const snapshot = await observeStore(store, {
    interrupt: async () => {
      const supervisor = new ProcessSupervisor(store);
      await supervisor.tick("actor");
    },
  });
  const entry = processEntry(snapshot, "actor");
  expect(entry.stable).toBe(false);
  expect(snapshot.consistent).toBe(false);
  // The scan half still projected the pre-tick record.
  expect(entry.generation).toBe(0);
  // A re-read after the writer settles is stable again.
  const settled = await observeStore(store);
  expect(settled.consistent).toBe(true);
  expect(processEntry(settled, "actor").stable).toBe(true);
});

test("follow emits snapshot, ordered changes, and a bounded end", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  expect((await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store)).code).toBe(0);
  const receipt = JSON.parse(
    (await cli(root, "process", "tick", "actor", "--dir", store)).stdout,
  ).process.receipt as string;
  // A second actor ticks between the first and second poll; the scripted
  // mutation lands deterministically in the diff. Distinct args keep its
  // receipt digest distinct from actor's identical-run dedup.
  const betaArgs = join(root, "args-beta.json");
  await writeFile(betaArgs, JSON.stringify({ seed: { value: "beta" } }));
  expect((await cli(root, "process", "create", "beta", manifest, "--args", betaArgs, "--dir", store)).code).toBe(0);
  let betaReceipt = "";
  const events: ObserveFollowEvent[] = [];
  const result = await followStore(
    store,
    (event) => events.push(event),
    {
      intervalMs: OBSERVE_BOUNDS.minIntervalMs,
      maxPolls: 4,
      maxEvents: 64,
      sleep: async () => {},
      afterPoll: async (poll) => {
        if (poll === 1) {
          const next = await new ProcessSupervisor(store).tick("beta");
          betaReceipt = next?.process.receipt ?? "";
        }
      },
    },
  );
  expect(result.reason).toBe("poll-limit");
  expect(events.at(-1)).toMatchObject({ event: "end", reason: "poll-limit" });
  expect(events[0]!.event).toBe("snapshot");
  const changes = events.filter(
    (e): e is Extract<ObserveFollowEvent, { event: "change" }> =>
      e.event === "change",
  );
  expect(changes.length).toBeGreaterThan(0);
  // Sequences are dense and monotonically increasing.
  expect(events.map((e) => e.sequence)).toEqual(events.map((_, i) => i));
  // Sections emit in the documented order.
  const sections = changes.map((c) => c.section);
  expect(sections).toEqual(
    [...sections].sort((a, b) => sectionRank(a) - sectionRank(b)),
  );
  // Poll 1's snapshot is quiet: the scripted write lands between polls, so
  // the whole change appears on poll 2 in one deterministic set.
  const beta = changes.find((c) => c.section === "processes" && c.key === "beta");
  expect(beta).toMatchObject({ change: "changed" });
  expect(betaReceipt).not.toBe("");
  const receiptChange = changes.find((c) => c.key === betaReceipt);
  expect(receiptChange).toMatchObject({ section: "runs", change: "added" });
  // actor's receipt was already in the initial snapshot; it never re-emits.
  expect(changes.find((c) => c.key === receipt)).toBeUndefined();
});

const SECTION_ORDER = [
  "processes",
  "mailboxes",
  "capabilities",
  "hostEvents",
  "applications",
  "habitat.accounts",
  "habitat.schedules",
  "runs",
  "meta",
];
const sectionRank = (s: string) => SECTION_ORDER.indexOf(s);

test("follow stops on interrupt and caps emitted events", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  expect((await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store)).code).toBe(0);

  const controller = new AbortController();
  const events: ObserveFollowEvent[] = [];
  const result = await followStore(store, (e) => events.push(e), {
    maxPolls: 65_536,
    sleep: async () => {},
    signal: controller.signal,
    afterPoll: async () => controller.abort(),
  });
  expect(result.reason).toBe("interrupted");
  expect(events.at(-1)).toMatchObject({ event: "end", reason: "interrupted" });
  expect(events.length).toBeLessThanOrEqual(3); // snapshot, end

  const capped: ObserveFollowEvent[] = [];
  const cappedResult = await followStore(store, (e) => capped.push(e), {
    maxPolls: 8,
    maxEvents: 1,
    sleep: async () => {},
  });
  expect(cappedResult.reason).toBe("event-limit");
  expect(capped).toHaveLength(2); // one emitted event plus end
});

test("observation never writes: the store tree is byte-identical afterwards", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  expect((await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store)).code).toBe(0);
  const mailbox = new FileMailboxService(store);
  const box = await mailbox.create("inbox");
  await mailbox.send(box.send, { hello: "world" }, digestCanonical({ k: 1 }));

  const before = await wholeTree(store);
  const snapshot = await observeStore(store);
  expect(snapshot.mailboxes.total).toBe(1);
  expect(snapshot.mailboxes.items[0]).toMatchObject({
    name: "inbox",
    pending: { total: 1 },
    consumed: { count: 0 },
    locked: false,
  });
  expect(snapshot.mailboxes.items[0]!.pending.items[0]!.id).toBeDefined();
  await followStore(store, () => {}, { maxPolls: 2, sleep: async () => {} });
  expect(await wholeTree(store)).toBe(before);
});

test("tail CLI emits snapshot and end as canonical JSON lines", async () => {
  const root = await directory();
  const store = join(root, "store");
  const { manifest, args } = await fixture(root);
  expect((await cli(root, "process", "create", "actor", manifest, "--args", args, "--dir", store)).code).toBe(0);
  const followed = await cli(root, "tail", "--dir", store, "--max-polls", "1");
  expect({ code: followed.code, stderr: followed.stderr }).toEqual({ code: 0, stderr: "" });
  const lines = followed.stdout.trim().split("\n").map((line) => JSON.parse(line));
  expect(lines.map((e) => e.event)).toEqual(["snapshot", "end"]);
  expect(lines[0].snapshot.processes.total).toBe(1);
  // A plain observe is one canonical line.
  const once = await cli(root, "observe", "--dir", store);
  expect(once.code).toBe(0);
  expect(once.stdout.trim().split("\n")).toHaveLength(1);
  const parsed = JSON.parse(once.stdout);
  expect(parsed.consistent).toBe(true);
  // Re-serializing canonical output is a fixed point.
  expect(canonicalize(parsed)).toBe(once.stdout.trim());
  // Follow-only flags are rejected without --follow.
  const bad = await cli(root, "observe", "--dir", store, "--max-polls", "2");
  expect(bad.code).not.toBe(0);
  expect(bad.stderr).toContain("--max-polls requires --follow");
});
