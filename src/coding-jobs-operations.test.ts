import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CodingJobService,
  codingJobOperationPayload,
  type CodingJobOperationOptions,
} from "./coding-jobs";
import {
  type CodingOperationBinding,
  type CodingOperationOutcome,
  type CodingOperationTransport,
} from "./coding-operations";
import { digestCanonical, digestText } from "./digest";
import { FileStore } from "./store";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function git(workspace: string, ...args: string[]): Promise<string> {
  const child = Bun.spawn(
    [
      "git",
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "-C",
      workspace,
      ...args,
    ],
    {
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code) throw new Error(error);
  return output.trim();
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "algal-operations-"));
  roots.push(root);
  const workspace = join(root, "workspace"),
    store = join(root, "store");
  await mkdir(workspace);
  await git(workspace, "init", "--quiet");
  await writeFile(join(workspace, "answer.txt"), "before\n");
  await git(workspace, "add", ".");
  await git(workspace, "commit", "--quiet", "-m", "fixture");
  const options: CodingJobOperationOptions = {
    workspace,
    expectedHead: await git(workspace, "rev-parse", "HEAD"),
    prompt: "Repair the fixture",
    operationId: "repair-001",
    adapter: {
      protocol: "algal.coding-operation.v1",
      authorityId: "fixture-ledger-001",
      executable: process.execPath,
      argvPrefix: [],
    },
    limits: { maxRuntimeMs: 1000 },
  };
  return { root, workspace, store, options };
}
function terminal(
  binding: CodingOperationBinding,
  outcome: "completed" | "failed" | "cancelled" = "completed",
  revision = 2,
): CodingOperationOutcome {
  const text = "Fixture provider settled all work";
  return {
    contract: "algal.coding-operation.v1",
    ...binding,
    revision,
    state: "terminal",
    acceptanceRef: digestText("acceptance"),
    outcome,
    settlement: "all-admitted-work-settled",
    result: { text, digest: digestText(text), length: Buffer.byteLength(text) },
  };
}
function accepted(
  binding: CodingOperationBinding,
  revision = 1,
): CodingOperationOutcome {
  return {
    contract: "algal.coding-operation.v1",
    ...binding,
    revision,
    state: "accepted",
    acceptanceRef: digestText("acceptance"),
  };
}
function jobPath(store: string, id: string, name: string): string {
  return join(store, "coding-jobs", id.slice(7), name);
}
async function casFiles(store: string): Promise<string[]> {
  try {
    return (await readdir(join(store, "values"), { recursive: true })).sort();
  } catch {
    return [];
  }
}

describe("explicit durable operation reconciliation", () => {
  test("lost reply resolves from one bound lookup without resubmission or rewriting uncertainty", async () => {
    const f = await fixture();
    let submits = 0,
      observations = 0;
    const transport: CodingOperationTransport = {
      submit: async ({ binding, payload }) => {
        submits++;
        expect(digestCanonical(payload)).toBe(binding.requestDigest);
        await writeFile(join(f.workspace, "answer.txt"), "after\n");
        throw new Error("reply lost");
      },
      observe: async (request) => {
        observations++;
        expect("payload" in request).toBe(false);
        return terminal(request.binding);
      },
    };
    const host = new CodingJobService(f.store, {
        operationTransport: transport,
      }),
      prepared = await host.prepareOperation(f.options);
    expect(prepared.intent.contract).toBe("algal.coding-job.v2");
    if (prepared.intent.contract !== "algal.coding-job.v2")
      throw new Error("version");
    expect(digestCanonical(codingJobOperationPayload(prepared.intent))).toBe(
      prepared.intent.operation.requestDigest,
    );
    expect((await host.run(prepared.jobId)).status).toBe("uncertain");
    const initial = await readFile(
      jobPath(f.store, prepared.jobId, "result.json"),
      "utf8",
    );
    expect((await host.run(prepared.jobId)).status).toBe("uncertain");
    const resolved = await host.reconcile(prepared.jobId);
    expect(resolved.status).toBe("completed");
    expect(resolved.result?.operationId).toBe(f.options.operationId);
    await host.verifyWorkspace(prepared.jobId);
    expect(
      await readFile(jobPath(f.store, prepared.jobId, "result.json"), "utf8"),
    ).toBe(initial);
    expect(
      JSON.parse(
        await readFile(
          jobPath(f.store, prepared.jobId, "resolution.json"),
          "utf8",
        ),
      ).contract,
    ).toBe("algal.coding-job-result.v2");
    expect((await host.reconcile(prepared.jobId)).result?.patchRef).toBe(
      resolved.result?.patchRef,
    );
    expect((await host.run(prepared.jobId)).status).toBe("completed");
    expect(submits).toBe(1);
    expect(observations).toBe(1);
  });

  test("missing and forged proofs retain custody and do not write foreign CAS evidence", async () => {
    const f = await fixture();
    let response: "missing" | "wrong" = "missing",
      calls = 0;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async () => {
          throw new Error("lost");
        },
        observe: async ({ binding }) => {
          calls++;
          return response === "missing"
            ? {
                contract: "algal.coding-operation.v1",
                ...binding,
                state: "unknown",
                reason: "missing",
                revision: 0,
              }
            : terminal({ ...binding, authorityId: "wrong-authority" });
        },
      },
    });
    const prepared = await host.prepareOperation(f.options);
    await host.run(prepared.jobId);
    expect((await host.reconcile(prepared.jobId)).status).toBe("uncertain");
    await expect(
      host.prepareOperation({ ...f.options, operationId: "another" }),
    ).rejects.toThrow("unresolved coding job claim");
    const before = await casFiles(f.store);
    expect(before.length).toBeGreaterThan(0);
    response = "wrong";
    await expect(host.reconcile(prepared.jobId)).rejects.toThrow(
      "binding mismatch",
    );
    expect(await casFiles(f.store)).toEqual(before);
    expect((await host.inspect(prepared.jobId)).status).toBe("uncertain");
    expect(calls).toBe(2);
  });

  test("accepted authority survives intervening unknown observations and stale revisions", async () => {
    const f = await fixture();
    let mode: "unknown" | "foreign" | "stale" | "valid" = "unknown";
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => accepted(binding),
        observe: async ({ binding }) =>
          mode === "unknown"
            ? {
                contract: "algal.coding-operation.v1",
                ...binding,
                state: "unknown",
                reason: "unresolved",
                revision: 2,
              }
            : mode === "foreign"
              ? {
                  ...terminal(binding, "completed", 3),
                  acceptanceRef: digestText("foreign-acceptance"),
                }
              : terminal(binding, "completed", mode === "stale" ? 1 : 3),
      },
    });
    const prepared = await host.prepareOperation(f.options);
    await host.run(prepared.jobId);
    await host.reconcile(prepared.jobId);
    const before = await casFiles(f.store);
    mode = "foreign";
    await expect(host.reconcile(prepared.jobId)).rejects.toThrow();
    mode = "stale";
    await expect(host.reconcile(prepared.jobId)).rejects.toThrow();
    expect(await casFiles(f.store)).toEqual(before);
    mode = "valid";
    expect((await host.reconcile(prepared.jobId)).status).toBe("completed");
  });

  test("operation identity cannot bind another request and missing admissions fail closed", async () => {
    const f = await fixture();
    let submits = 0;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => {
          submits++;
          return terminal(binding);
        },
        observe: async () => {
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options);
    await expect(
      host.prepareOperation({ ...f.options, prompt: "Different request" }),
    ).rejects.toThrow("immutable host state conflicts");
    expect((await host.prepareOperation(f.options)).jobId).toBe(prepared.jobId);
    const directory = join(f.store, "coding-operations");
    const names = await readdir(directory);
    expect(names).toHaveLength(1);
    await rm(join(directory, names[0]!));
    await expect(host.run(prepared.jobId)).rejects.toThrow(
      "admission binding mismatch",
    );
    expect(submits).toBe(0);
  });

  test("invalid patch is rejected while provider settlement remains usable and files remain", async () => {
    const f = await fixture();
    let submits = 0;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => {
          submits++;
          await symlink("/tmp", join(f.workspace, "unsafe"));
          return terminal(binding);
        },
        observe: async () => {
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options),
      result = await host.run(prepared.jobId);
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("settled-patch-rejected");
    expect(result.result?.patchRef).toBeUndefined();
    expect(await readdir(f.workspace)).toContain("unsafe");
    await expect(host.verifyWorkspace(prepared.jobId)).rejects.toThrow(
      "completed coding job",
    );
    expect((await host.reconcile(prepared.jobId)).status).toBe("failed");
    expect(submits).toBe(1);
    await rm(join(f.workspace, "unsafe"));
    expect(
      (await host.prepareOperation({ ...f.options, operationId: "next" }))
        .status,
    ).toBe("prepared");
  });

  test("changed Git source cannot be accepted as a completed patch", async () => {
    const f = await fixture();
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => {
          await writeFile(
            join(f.workspace, "answer.txt"),
            "different source\n",
          );
          await git(f.workspace, "add", ".");
          await git(f.workspace, "commit", "--quiet", "-m", "changed head");
          return terminal(binding);
        },
        observe: async () => {
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options),
      result = await host.run(prepared.jobId);
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("settled-patch-rejected:DIGEST_MISMATCH");
    expect(result.result?.patchRef).toBeUndefined();
    expect(await readFile(join(f.workspace, "answer.txt"), "utf8")).toBe(
      "different source\n",
    );
  });

  test("settled failures and cancellations never become successful repairs", async () => {
    for (const outcome of ["failed", "cancelled"] as const) {
      const f = await fixture();
      let calls = 0;
      const host = new CodingJobService(f.store, {
        operationTransport: {
          submit: async ({ binding }) => {
            calls++;
            return terminal(binding, outcome);
          },
          observe: async () => {
            throw new Error("unexpected");
          },
        },
      });
      const prepared = await host.prepareOperation(f.options),
        result = await host.run(prepared.jobId);
      expect(result.status).toBe("failed");
      expect(result.result?.patchRef).toBeDefined();
      expect((await host.reconcile(prepared.jobId)).status).toBe("failed");
      expect(calls).toBe(1);
    }
  });

  test("legacy reconciliation fails before any adapter call and its wire stays v1", async () => {
    const f = await fixture();
    let observes = 0;
    const host = new CodingJobService(f.store, {
      transport: async () => {
        throw new Error("legacy lost reply");
      },
      operationTransport: {
        submit: async () => {
          throw new Error("unexpected");
        },
        observe: async () => {
          observes++;
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepare({
      workspace: f.workspace,
      expectedHead: f.options.expectedHead,
      prompt: "legacy",
      adapter: { executable: process.execPath },
    });
    await host.run(prepared.jobId);
    await expect(host.reconcile(prepared.jobId)).rejects.toThrow(
      "legacy coding jobs",
    );
    expect(observes).toBe(0);
    expect(
      JSON.parse(
        await readFile(jobPath(f.store, prepared.jobId, "result.json"), "utf8"),
      ).contract,
    ).toBe("algal.coding-job-result.v1");
    await expect(host.prepareOperation(f.options)).rejects.toThrow(
      "unresolved coding job claim",
    );
  });

  test("bounded evidence rejects a new proof before CAS and repeated identical lookup is idempotent", async () => {
    const f = await fixture();
    let revision = 1;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => accepted(binding, revision),
        observe: async ({ binding }) => accepted(binding, revision),
      },
    });
    const prepared = await host.prepareOperation(f.options);
    await host.run(prepared.jobId);
    await host.reconcile(prepared.jobId);
    expect(
      await readdir(jobPath(f.store, prepared.jobId, "observations")),
    ).toHaveLength(1);
    for (revision = 2; revision <= 16; revision++)
      await host.reconcile(prepared.jobId);
    const before = await casFiles(f.store);
    await expect(host.reconcile(prepared.jobId)).rejects.toThrow(
      "evidence count limit",
    );
    expect(await casFiles(f.store)).toEqual(before);
    expect(
      await readdir(jobPath(f.store, prepared.jobId, "observations")),
    ).toHaveLength(16);
  });

  test("retained settlement recovers publication gaps without provider lookup or recapturing a new patch", async () => {
    const f = await fixture();
    let observes = 0;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => {
          await writeFile(join(f.workspace, "answer.txt"), "after\n");
          return terminal(binding);
        },
        observe: async () => {
          observes++;
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options),
      completed = await host.run(prepared.jobId);
    const initialPatch = completed.result!.patchRef!;
    // Model a crash after immutable settlement publication but before result publication.
    await rm(jobPath(f.store, prepared.jobId, "result.json"));
    await writeFile(join(f.workspace, "answer.txt"), "later host drift\n");
    expect((await host.inspect(prepared.jobId)).status).toBe("uncertain");
    const recovered = await host.reconcile(prepared.jobId);
    expect(recovered.result?.patchRef).toBe(initialPatch);
    expect(observes).toBe(0);
    await expect(host.verifyWorkspace(prepared.jobId)).rejects.toThrow(
      "no longer matches",
    );
    expect(await new FileStore(f.store).getValue(initialPatch)).toBeDefined();
  });
  test("partial restores and symlinked operation admissions fail closed before submit", async () => {
    const f = await fixture();
    let submits = 0;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => {
          submits++;
          return terminal(binding);
        },
        observe: async () => {
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options);
    await host.run(prepared.jobId);
    await rm(jobPath(f.store, prepared.jobId, "started.json"));
    await rm(jobPath(f.store, prepared.jobId, "result.json"));
    await rm(jobPath(f.store, prepared.jobId, "observations"), {
      recursive: true,
    });
    await expect(host.run(prepared.jobId)).rejects.toThrow("no launch intent");
    expect(submits).toBe(1);
    const directory = join(f.store, "coding-operations"),
      moved = join(f.root, "saved-admissions");
    await rename(directory, moved);
    await symlink(moved, directory);
    await expect(host.inspect(prepared.jobId)).rejects.toThrow(
      "must not be a symlink",
    );
  });

  test("explicit reconciliation repairs missing reserved CAS without looking up or resubmitting", async () => {
    const f = await fixture();
    let submits = 0,
      observes = 0;
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding }) => {
          submits++;
          await writeFile(join(f.workspace, "answer.txt"), "after\n");
          return terminal(binding);
        },
        observe: async () => {
          observes++;
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options),
      completed = await host.run(prepared.jobId);
    const resultBytes = await readFile(
      jobPath(f.store, prepared.jobId, "result.json"),
      "utf8",
    );
    await rm(
      join(f.store, "values", `${completed.result!.outputRef.slice(7)}.json`),
    );
    await rm(
      join(f.store, "values", `${completed.result!.patchRef!.slice(7)}.json`),
    );
    expect((await host.inspect(prepared.jobId)).status).toBe("uncertain");
    const recovered = await host.reconcile(prepared.jobId);
    expect(recovered.status).toBe("completed");
    expect(recovered.result).toEqual(completed.result);
    expect(
      await readFile(jobPath(f.store, prepared.jobId, "result.json"), "utf8"),
    ).toBe(resultBytes);
    expect(submits).toBe(1);
    expect(observes).toBe(0);
  });

  test("custom submit transport cannot mutate admitted patch bounds or workspace identity", async () => {
    const f = await fixture();
    const host = new CodingJobService(f.store, {
      operationTransport: {
        submit: async ({ binding, payload }) => {
          const request = payload as {
            limits: { maxChangedFiles: number };
            workspaceIdentity: { inode: string };
          };
          request.limits.maxChangedFiles = 1;
          request.workspaceIdentity.inode = "0";
          await writeFile(join(f.workspace, "answer.txt"), "after\n");
          await writeFile(join(f.workspace, "second.txt"), "second\n");
          return terminal(binding);
        },
        observe: async () => {
          throw new Error("unexpected");
        },
      },
    });
    const prepared = await host.prepareOperation(f.options),
      completed = await host.run(prepared.jobId);
    expect(completed.status).toBe("completed");
    expect(completed.result?.changedFiles).toBe(2);
    expect(completed.intent.workspaceIdentity).toEqual(
      prepared.intent.workspaceIdentity,
    );
    expect(completed.intent.limits).toEqual(prepared.intent.limits);
  });
});
