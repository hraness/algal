import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest, type OrganismManifest } from "./contract";
import { scriptedExecutor } from "./effects";
import { AlgalError } from "./errors";
import { FileMailboxService } from "./mailbox";
import { ProcessSupervisor } from "./process";
import {
  parseReplayComparison,
  REPLAY_COMPARISON_BOUNDS,
  replayComparison,
  replayComparisonToJson,
} from "./replay";
import { builtinRegistry } from "./registry";
import { runOrganism, type RunReceipt } from "./run";
import { MemoryStore } from "./store-memory";
import { canonicalize, type JsonValue } from "./values";

function manifest(over: Partial<OrganismManifest> = {}): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:replay-test",
    name: "Replay test",
    cells: [
      { id: "q", kind: "input", outputs: { ask: "text" } },
      {
        id: "answer",
        kind: "agent",
        prompt: "Answer briefly.",
        output: { kind: "text" },
        inputs: { ask: "text" },
      },
    ],
    edges: [
      { from: { cell: "q", port: "ask" }, to: { cell: "answer", port: "ask" } },
    ],
    budgets: {
      maxSteps: 16,
      maxAgentCalls: 4,
      maxWork: 100_000,
      maxContextBytes: 8192,
      maxOutputBytes: 8192,
      maxDepth: 2,
    },
    ...over,
  });
}

async function recorded(store = new MemoryStore()): Promise<RunReceipt> {
  return runOrganism({
    manifest: manifest(),
    args: { q: { ask: "hi" } },
    fns: builtinRegistry(),
    store,
    executors: [scriptedExecutor({ answer: "hello" })],
  });
}

function expectParseFailure(fn: () => unknown, match?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AlgalError);
    expect((error as AlgalError).code).toBe("PARSE_FAILED");
    if (match) expect((error as AlgalError).message).toMatch(match);
    return;
  }
  throw new Error("expected PARSE_FAILED");
}

describe("algal.replay-comparison.v1", () => {
  test("identical: the same manifest reproduces the whole recorded trace", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const { comparison, revised } = await replayComparison({
      receipt,
      revision: manifest() as unknown as JsonValue,
      store,
    });
    expect(comparison.verdict).toBe("identical");
    expect(comparison.prefix.map((entry) => entry.path)).toEqual(["q", "answer"]);
    expect(comparison.divergence).toBeNull();
    expect(comparison.effectsMatch).toBe(true);
    expect(comparison.outcomes).toEqual({ original: "complete", revised: "complete" });
    // an identical revision reproduces the same receipt bit-for-bit
    expect(comparison.revisedReceipt).toBe(receipt.digest);
    expect(revised?.digest).toBe(receipt.digest);
    expect(parseReplayComparison(replayComparisonToJson(comparison))).toEqual(comparison);
  });

  test("diverged: a changed prompt names the first divergent cell and both sides", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    (revision.cells[1] as { prompt: string }).prompt = "Answer verbosely.";
    const { comparison, revised } = await replayComparison({
      receipt,
      revision: revision as unknown as JsonValue,
      store,
      executors: [scriptedExecutor({ answer: "a much longer answer" })],
    });
    expect(comparison.verdict).toBe("diverged");
    expect(comparison.prefix.map((entry) => entry.path)).toEqual(["q"]);
    expect(comparison.divergence?.kind).toBe("cell");
    expect(comparison.divergence?.path).toBe("answer");
    expect(comparison.divergence?.original?.status).toBe("committed");
    expect(comparison.divergence?.revised?.status).toBe("committed");
    expect(comparison.outcomes.revised).toBe("complete");
    expect(revised?.cells["answer"]?.outputs?.["out"]).toBe("a much longer answer");
    // the revised receipt is a real algal.run.v1 record of the divergence
    expect(revised?.manifestDigest).not.toBe(receipt.manifestDigest);
  });

  test("could-not-replay: an unanswerable effect request stops the comparison honestly", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    (revision.cells[1] as { prompt: string }).prompt = "Answer verbosely.";
    const { comparison, revised } = await replayComparison({
      receipt,
      revision: revision as unknown as JsonValue,
      store,
    });
    expect(comparison.verdict).toBe("could-not-replay");
    expect(comparison.reason?.code).toBe("missing-effect");
    expect(comparison.reason?.path).toBe("answer");
    expect(comparison.reason?.request).toMatch(/^sha256:/);
    // the prefix evidence still stands, and the partial run is recorded
    expect(comparison.prefix.map((entry) => entry.path)).toEqual(["q"]);
    expect(revised?.outcome).toBe("failed");
    expect(comparison.revisedReceipt).not.toBeNull();
  });

  test("could-not-replay: a wired input the record cannot supply", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    const input = revision.cells[0] as { outputs: Record<string, unknown> };
    input.outputs.extra = "text";
    revision.cells.push({
      id: "probe",
      kind: "expr",
      expr: { contract: "algal.expr.v1", program: ["get", "x"] },
      output: { kind: "json", schema: { type: "string" } },
      inputs: { x: "text" },
    } as never);
    revision.edges.push({
      from: { cell: "q", port: "extra" },
      to: { cell: "probe", port: "x" },
    });
    const { comparison } = await replayComparison({
      receipt,
      revision: revision as unknown as JsonValue,
      store,
    });
    expect(comparison.verdict).toBe("could-not-replay");
    expect(comparison.reason?.code).toBe("missing-input");
    expect(comparison.reason?.path).toBe("q.extra");
    expect(comparison.revisedReceipt).toBeNull();
  });

  test("could-not-replay: an inadmissible revision names the admission error", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const { comparison } = await replayComparison({
      receipt,
      revision: { contract: "algal.organism.v1", key: "bogus" },
      store,
    });
    expect(comparison.verdict).toBe("could-not-replay");
    expect(comparison.reason?.code).toBe("manifest-invalid");
    expect(comparison.reason?.detail).toContain("PARSE_FAILED");
  });

  test("diverged: a dropped cell and an added cell are both named", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    revision.cells.splice(1, 1);
    revision.edges.splice(0, 1);
    const { comparison } = await replayComparison({
      receipt,
      revision: revision as unknown as JsonValue,
      store,
    });
    expect(comparison.verdict).toBe("diverged");
    expect(comparison.divergence?.path).toBe("answer");
    expect(comparison.divergence?.original?.status).toBe("committed");
    expect(comparison.divergence?.revised).toBeNull();
  });

  test("supplied args merge over the recorded args", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    const { comparison } = await replayComparison({
      receipt,
      revision: revision as unknown as JsonValue,
      args: { q: { ask: "changed question" } },
      store,
      executors: [scriptedExecutor({ answer: "new answer" })],
    });
    // the revision replays the recorded trace against the new arg — the
    // input cell's own record changes first, then the agent cell's effect
    // request diverges and is answered live
    expect(comparison.verdict).toBe("diverged");
    expect(comparison.divergence?.path).toBe("q");
  });

  test("replay never invents a tool answer: an unrecorded tool request is missing-effect", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    revision.cells.push({
      id: "notify",
      kind: "tool",
      tool: "mailbox.send.v1",
    } as never);
    revision.edges.push({
      from: { cell: "answer", port: "out" },
      to: { cell: "notify", port: "message" },
    });
    const { comparison } = await replayComparison({
      receipt,
      revision: revision as unknown as JsonValue,
      store,
      executors: [scriptedExecutor({ answer: "hello" })],
    });
    // the tool request needs a cap arg it cannot get — admission or a tool
    // replay miss must fail closed, never fabricated
    expect(comparison.verdict).toBe("could-not-replay");
  });

  test("deterministic: two runs over the same record produce the same record", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const revision = manifest();
    (revision.cells[1] as { prompt: string }).prompt = "Answer verbosely.";
    const a = await replayComparison({
      receipt, revision: revision as unknown as JsonValue, store,
      executors: [scriptedExecutor({ answer: "x" })],
    });
    const b = await replayComparison({
      receipt, revision: revision as unknown as JsonValue, store,
      executors: [scriptedExecutor({ answer: "x" })],
    });
    expect(canonicalize(replayComparisonToJson(a.comparison) as JsonValue))
      .toBe(canonicalize(replayComparisonToJson(b.comparison) as JsonValue));
    expect(a.revised?.digest).toBe(b.revised?.digest);
  });

  test("a tampered receipt digest is refused before comparison", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const forged = { ...receipt, outcome: "failed" };
    await expect(
      replayComparison({ receipt: forged as unknown as JsonValue, revision: manifest() as unknown as JsonValue, store }),
    ).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  test("record parse rejects forged and oversized values", async () => {
    const store = new MemoryStore();
    const receipt = await recorded(store);
    const { comparison } = await replayComparison({
      receipt,
      revision: manifest() as unknown as JsonValue,
      store,
    });
    const json = replayComparisonToJson(comparison);

    expectParseFailure(() => parseReplayComparison({ ...json, contract: "algal.other.v1" }));
    expectParseFailure(() => parseReplayComparison({ ...json, extra: true }));
    expectParseFailure(() =>
      parseReplayComparison({ ...json, verdict: "diverged", divergence: null }),
      /diverged|divergence/,
    );
    expectParseFailure(() =>
      parseReplayComparison({ ...json, verdict: "could-not-replay" }),
      /reason/,
    );
    expectParseFailure(() =>
      parseReplayComparison({ ...json, receipt: "not-a-digest" }),
    );
    expectParseFailure(() =>
      parseReplayComparison({
        ...json,
        prefix: Array.from({ length: REPLAY_COMPARISON_BOUNDS.maxPrefix + 1 }, (_, i) => ({
          path: `c${i}`,
          digest: "sha256:" + "0".repeat(64),
        })),
      }),
    );
    expectParseFailure(() =>
      parseReplayComparison({
        ...json,
        added: ["b", "a"],
      }),
      /sorted|unique/,
    );
  });

  test("process replay: a durable process's head receipt replays under a revision", async () => {
    const dir = await mkdtemp(join(tmpdir(), "algal-replay-test-"));
    try {
      const supervisor = new ProcessSupervisor(dir, {
        executors: [scriptedExecutor({ answer: "hello" })],
      });
      await supervisor.create("worker", manifest(), { q: { ask: "hi" } });
      await supervisor.tick("worker");
      const snapshot = await supervisor.inspect("worker");
      expect(snapshot.process.status).toBe("complete");
      const head = await supervisor.store.getReceipt(snapshot.process.receipt!);
      expect(head).toBeDefined();

      const same = await replayComparison({
        receipt: head!,
        revision: manifest() as unknown as JsonValue,
        store: supervisor.store,
        executors: [scriptedExecutor({ answer: "hello" })],
      });
      expect(same.comparison.verdict).toBe("identical");

      const revision = manifest();
      (revision.cells[1] as { prompt: string }).prompt = "Answer verbosely.";
      const changed = await replayComparison({
        receipt: head!,
        revision: revision as unknown as JsonValue,
        store: supervisor.store,
        executors: [scriptedExecutor({ answer: "different" })],
      });
      expect(changed.comparison.verdict).toBe("diverged");
      expect(changed.comparison.divergence?.path).toBe("answer");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("a revision needing a tool the record cannot answer reports missing-effect", async () => {
    // a mailbox send inside the revision has no recorded tool receipt and
    // replay never invokes live tools — the request must fail closed
    const dir = await mkdtemp(join(tmpdir(), "algal-replay-test-"));
    try {
      const mailbox = new FileMailboxService(dir);
      const box = await mailbox.create("outbox");
      const sender = parseOrganismManifest({
        contract: "algal.organism.v1",
        key: "organism:replay-sender",
        name: "Sender",
        cells: [
          {
            id: "src",
            kind: "input",
            outputs: {
              ask: "text",
              box: { type: "cap", capability: "mailbox-send" },
            },
          },
          {
            id: "answer",
            kind: "agent",
            prompt: "Answer briefly.",
            output: { kind: "text" },
            inputs: { ask: "text" },
          },
        ],
        edges: [
          { from: { cell: "src", port: "ask" }, to: { cell: "answer", port: "ask" } },
        ],
        budgets: {
          maxSteps: 16, maxAgentCalls: 4, maxWork: 100_000,
          maxContextBytes: 8192, maxOutputBytes: 8192, maxDepth: 2,
        },
      });
      const store = new MemoryStore();
      const receipt = await runOrganism({
        manifest: sender,
        args: { src: { ask: "hi", box: box.send } },
        fns: builtinRegistry(),
        store,
        executors: [scriptedExecutor({ answer: "hello" })],
      });
      // revision adds a mailbox.send tool cell fed by the cap port
      const revision = parseOrganismManifest({
        contract: "algal.organism.v1",
        key: "organism:replay-sender",
        name: "Sender",
        cells: [
          {
            id: "src",
            kind: "input",
            outputs: {
              ask: "text",
              box: { type: "cap", capability: "mailbox-send" },
            },
          },
          {
            id: "answer",
            kind: "agent",
            prompt: "Answer briefly.",
            output: { kind: "text" },
            inputs: { ask: "text" },
          },
          { id: "notify", kind: "tool", tool: "mailbox.send.v1" },
        ],
        edges: [
          { from: { cell: "src", port: "ask" }, to: { cell: "answer", port: "ask" } },
          { from: { cell: "src", port: "box" }, to: { cell: "notify", port: "mailbox" } },
          { from: { cell: "answer", port: "out" }, to: { cell: "notify", port: "message" } },
        ],
        budgets: {
          maxSteps: 16, maxAgentCalls: 4, maxWork: 100_000,
          maxContextBytes: 8192, maxOutputBytes: 8192, maxDepth: 2,
        },
      });
      const { mailboxToolRegistry } = await import("./mailbox");
      const { comparison } = await replayComparison({
        receipt,
        revision: revision as unknown as JsonValue,
        store,
        executors: [scriptedExecutor({ answer: "hello" })],
        // the tool is admitted — its signature resolves — but the record has
        // no receipt for the request, and replay never invokes a live tool
        tools: mailboxToolRegistry(mailbox),
      });
      expect(comparison.verdict).toBe("could-not-replay");
      expect(comparison.reason?.code).toBe("missing-effect");
      expect(comparison.reason?.path).toBe("notify");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
