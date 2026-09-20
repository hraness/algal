import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  symlink,
  chmod,
  rename,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CodingJobService,
  CODING_JOB_TOOL,
  type CodingJobOptions,
  type CodingJobTransport,
} from "./coding-jobs";
import { FileStore } from "./store";
import { asObject } from "./values";
import { digestText } from "./digest";

// State assertions include real Git startup and two complete patch captures.
// Keep their fixture allowance separate from the explicit expiry test below.
const FIXTURE_JOB_TIMEOUT_MS = 10_000;
function fixtureTest(name: string, body: () => Promise<void>): void {
  test(name, body, 20_000);
}

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});
async function git(workspace: string, ...args: string[]): Promise<string> {
  const child = Bun.spawn(
    [
      "git",
      "-c",
      "user.name=Coding fixture",
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
  if (code !== 0) throw new Error(`fixture Git failed: ${error}`);
  return output.trim();
}
async function fixture(maxRuntimeMs = FIXTURE_JOB_TIMEOUT_MS): Promise<{
  root: string;
  workspace: string;
  options: CodingJobOptions;
}> {
  const dir = await mkdtemp(join(tmpdir(), "algal-coding-job-"));
  dirs.push(dir);
  const root = join(dir, "store"),
    workspace = join(dir, "workspace");
  await mkdir(workspace);
  await git(workspace, "init", "--quiet");
  await writeFile(join(workspace, "answer.txt"), "before\n");
  await git(workspace, "add", "answer.txt");
  await git(workspace, "commit", "--quiet", "-m", "fixture");
  const expectedHead = await git(workspace, "rev-parse", "HEAD");
  return {
    root,
    workspace,
    options: {
      workspace,
      expectedHead,
      prompt: "Bounded synthetic repair",
      adapter: { executable: process.execPath },
      limits: { maxRuntimeMs },
    },
  };
}
const completed = (text = "Fixture task completed") => ({
  exitCode: 0,
  envelope: {
    version: 1,
    session: "s_fixture",
    state: "idle",
    outcome: {
      terminal: "completed",
      joined: true,
      effects: "settled",
      pending_attention: false,
      failure: null,
    },
    text,
  },
});

describe("durable foreground coding jobs", () => {
  fixtureTest("binds clean source, launches once, retains complete patch, and verifies drift", async () => {
    const f = await fixture();
    let calls = 0;
    const transport: CodingJobTransport = async () => {
      calls++;
      await writeFile(join(f.workspace, "answer.txt"), "after\n");
      await writeFile(
        join(f.workspace, "new.bin"),
        new Uint8Array([0, 1, 2, 255]),
      );
      await chmod(join(f.workspace, "new.bin"), 0o755);
      return completed();
    };
    const host = new CodingJobService(f.root, { transport }),
      prepared = await host.prepare(f.options);
    expect(prepared.status).toBe("prepared");
    expect((await host.prepare(f.options)).jobId).toBe(prepared.jobId);
    const result = await host.run(prepared.jobId);
    expect(result.status, result.reason).toBe("completed");
    expect(result.result?.changedFiles).toBe(2);
    const artifact = asObject(
      await new FileStore(f.root).getValue(result.result!.patchRef!),
      "patch",
    );
    expect(artifact.trackedPatch).toContain("+after");
    expect(artifact.untracked).toEqual([
      { path: "new.bin", mode: "100755", contentBase64: "AAEC/w==" },
    ]);
    await host.verifyWorkspace(prepared.jobId);
    const fresh = new CodingJobService(f.root, {
      transport: async () => {
        throw new Error("must not relaunch");
      },
    });
    expect((await fresh.run(prepared.jobId)).status).toBe("completed");
    expect(calls).toBe(1);
    const output = await fresh
      .tools(prepared.jobId)
      .get(CODING_JOB_TOOL)!
      .tool(
        {},
        {
          requestDigest: digestText("read"),
          idempotencyKey: digestText("read"),
        },
      );
    expect(output.done).toBe("done");
    expect(asObject(output.observation, "observation").expectedHead).toBe(
      f.options.expectedHead,
    );
    await chmod(join(f.workspace, "new.bin"), 0o644);
    await expect(host.verifyWorkspace(prepared.jobId)).rejects.toThrow(
      "no longer matches",
    );
  });
  fixtureTest("concurrent runs cannot duplicate a launch", async () => {
    const f = await fixture();
    let release!: () => void,
      entered!: () => void,
      calls = 0;
    const enteredPromise = new Promise<void>((done) => {
        entered = done;
      }),
      hold = new Promise<void>((done) => {
        release = done;
      });
    const host = new CodingJobService(f.root, {
        transport: async () => {
          calls++;
          entered();
          await hold;
          return completed();
        },
      }),
      job = await host.prepare(f.options);
    const first = host.run(job.jobId);
    try {
      await enteredPromise;
      expect((await host.inspect(job.jobId)).status).toBe("uncertain");
      await expect(
        new CodingJobService(f.root, {
          transport: async () => {
            calls++;
            return completed();
          },
        }).run(job.jobId),
      ).rejects.toThrow("held");
    } finally {
      release();
      await first;
    }
    const result = await first;
    expect(result.status, result.reason).toBe("completed");
    expect(calls).toBe(1);
  });
  fixtureTest("a killed launch owner remains uncertain in a fresh process without resubmission", async () => {
    const f = await fixture(),
      host = new CodingJobService(f.root),
      job = await host.prepare(f.options);
    const marker = join(f.root, "called.txt");
    const source = `import {CodingJobService} from ${JSON.stringify(new URL("./coding-jobs.ts", import.meta.url).href)}; import {writeFile} from "node:fs/promises"; await new CodingJobService(${JSON.stringify(f.root)},{transport:async()=>{await writeFile(${JSON.stringify(marker)},"called");process.kill(process.pid,"SIGKILL");await new Promise(()=>{});}}).run(${JSON.stringify(job.jobId)});`;
    const child = Bun.spawn([process.execPath, "-e", source], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [, diagnostics, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(code).not.toBe(0);
    expect(diagnostics).toBe("");
    expect(await readFile(marker, "utf8")).toBe("called");
    let launches = 0;
    const recovered = new CodingJobService(f.root, {
      transport: async () => {
        launches++;
        return completed();
      },
    });
    expect((await recovered.run(job.jobId)).status).toBe("uncertain");
    expect(launches).toBe(0);
  });
  fixtureTest("transport acknowledgement loss is retained and never retried", async () => {
    const f = await fixture();
    let calls = 0;
    const host = new CodingJobService(f.root, {
        transport: async () => {
          calls++;
          await writeFile(
            join(f.workspace, "answer.txt"),
            "unknown external change\n",
          );
          throw new Error("private diagnostic");
        },
      }),
      job = await host.prepare(f.options);
    const result = await host.run(job.jobId);
    expect(result.status).toBe("uncertain");
    expect(JSON.stringify(result)).not.toContain("private diagnostic");
    expect((await host.run(job.jobId)).status).toBe("uncertain");
    expect(calls).toBe(1);
    expect(await readFile(join(f.workspace, "answer.txt"), "utf8")).toContain(
      "unknown",
    );
  });
  fixtureTest("abort and expiry retain unknown completion even when an adapter ignores cancellation", async () => {
    for (const cancel of [true, false]) {
      // This test exercises the actual deadline, unlike the other fixtures.
      const f = await fixture(1_000);
      let entered!: () => void;
      const admitted = new Promise<void>((done) => {
        entered = done;
      });
      const host = new CodingJobService(f.root, {
          transport: async () => {
            entered();
            return new Promise(() => {});
          },
        }),
        job = await host.prepare(f.options),
        controller = new AbortController();
      const result = host.run(job.jobId, { signal: controller.signal });
      await admitted;
      if (cancel) controller.abort();
      expect((await result).status).toBe("uncertain");
      expect((await host.run(job.jobId)).status).toBe("uncertain");
    }
  });
  fixtureTest("changed HEAD, dirty files, or replaced workspace block admission without a launch", async () => {
    const f = await fixture();
    let calls = 0;
    const host = new CodingJobService(f.root, {
        transport: async () => {
          calls++;
          return completed();
        },
      }),
      job = await host.prepare(f.options);
    await writeFile(join(f.workspace, "answer.txt"), "user work\n");
    await expect(host.run(job.jobId)).rejects.toThrow("unchanged clean");
    expect(calls).toBe(0);
    await git(f.workspace, "add", "answer.txt");
    await git(f.workspace, "commit", "--quiet", "-m", "new head");
    await expect(host.run(job.jobId)).rejects.toThrow("unchanged clean");
    expect(calls).toBe(0);
    const moved = `${f.workspace}-moved`;
    await rename(f.workspace, moved);
    await symlink(moved, f.workspace);
    await expect(host.run(job.jobId)).rejects.toThrow("symlink");
    expect(calls).toBe(0);
    expect((await host.inspect(job.jobId)).status).toBe("prepared");
  });
  fixtureTest("changed HEAD and unsettled or nonzero responses never become completed", async () => {
    for (const mode of ["head", "unsettled", "nonzero", "malformed"] as const) {
      const f = await fixture(),
        host = new CodingJobService(f.root, {
          transport: async () => {
            const response = completed();
            if (mode === "head") {
              await git(
                f.workspace,
                "-c",
                "commit.gpgsign=false",
                "commit",
                "--quiet",
                "--allow-empty",
                "-m",
                "unexpected commit",
              );
            }
            if (mode === "unsettled") response.envelope.outcome.joined = false;
            if (mode === "nonzero") response.exitCode = 1;
            if (mode === "malformed")
              return {
                exitCode: 0,
                envelope: { version: 1, text: "no identity" },
              };
            return response;
          },
        }),
        job = await host.prepare(f.options);
      expect((await host.run(job.jobId)).status).toBe(
        mode === "nonzero" ? "failed" : "uncertain",
      );
    }
  });
  fixtureTest("oversized and symlink changes are retained as uncertain without deleting user files", async () => {
    for (const mode of ["large", "many", "symlink"] as const) {
      const f = await fixture(),
        host = new CodingJobService(f.root, {
          transport: async () => {
            if (mode === "large")
              await writeFile(join(f.workspace, "large.txt"), "x".repeat(5000));
            if (mode === "many") {
              await writeFile(join(f.workspace, "one"), "a");
              await writeFile(join(f.workspace, "two"), "b");
            }
            if (mode === "symlink")
              await symlink(
                join(f.root, "not-workspace"),
                join(f.workspace, "outside"),
              );
            return completed();
          },
        }),
        job = await host.prepare({
          ...f.options,
          limits: { maxPatchBytes: 1024, maxChangedFiles: 1 },
        });
      expect((await host.run(job.jobId)).status).toBe("uncertain");
      expect(
        (await git(f.workspace, "status", "--porcelain")).length,
      ).toBeGreaterThan(0);
    }
  });
  fixtureTest("rejects foreign source head, symlink input, oversized prompt and state inside workspace", async () => {
    const f = await fixture(),
      host = new CodingJobService(f.root);
    await expect(
      host.prepare({ ...f.options, prompt: "x".repeat(65537) }),
    ).rejects.toThrow("coding prompt");
    const alias = `${f.workspace}-link`;
    await symlink(f.workspace, alias);
    await expect(
      host.prepare({ ...f.options, workspace: alias }),
    ).rejects.toThrow("symlink");
    await expect(
      host.prepare({
        ...f.options,
        source: {
          repository: "acme/repo",
          pullNumber: 1,
          headSha: "a".repeat(40),
          baseSha: "b".repeat(40),
          mergeSha: null,
          baseRef: "main",
          evidenceRef: digestText("fixture"),
        },
      }),
    ).rejects.toThrow("source head");
    await expect(
      new CodingJobService(join(f.workspace, ".algal")).prepare(f.options),
    ).rejects.toThrow("separate");
  });
  fixtureTest("hidden index flags and a pre-aborted run cannot admit work", async () => {
    const f = await fixture();
    let calls = 0;
    const host = new CodingJobService(f.root, {
        transport: async () => {
          calls++;
          return completed();
        },
      }),
      job = await host.prepare(f.options);
    const controller = new AbortController();
    controller.abort();
    await expect(
      host.run(job.jobId, { signal: controller.signal }),
    ).rejects.toThrow("before launch");
    expect((await host.inspect(job.jobId)).status).toBe("prepared");
    await git(f.workspace, "update-index", "--assume-unchanged", "answer.txt");
    await writeFile(join(f.workspace, "answer.txt"), "hidden user work\n");
    await expect(host.run(job.jobId)).rejects.toThrow("hidden");
    await expect(host.prepare(f.options)).rejects.toThrow("hidden");
    expect(calls).toBe(0);
  });
  fixtureTest("persisted unknown fields, nonstring states and replaced job directories fail closed", async () => {
    const f = await fixture(),
      host = new CodingJobService(f.root, {
        transport: async () => completed(),
      }),
      job = await host.prepare(f.options);
    await host.run(job.jobId);
    const path = join(f.root, "coding-jobs", job.jobId.slice(7)),
      file = join(path, "result.json");
    const original = JSON.parse(await readFile(file, "utf8"));
    await writeFile(
      file,
      JSON.stringify({ ...original, status: ["completed"] }),
    );
    await expect(host.inspect(job.jobId)).rejects.toThrow("binding");
    await writeFile(file, JSON.stringify({ ...original, extra: true }));
    await expect(host.inspect(job.jobId)).rejects.toThrow("unknown key");
    await writeFile(file, JSON.stringify(original));
    await rename(path, `${path}-elsewhere`);
    await symlink(`${path}-elsewhere`, path);
    await expect(host.inspect(job.jobId)).rejects.toThrow("symlinks");
  });
  fixtureTest("unresolved durable workspace claims block different prepared and new jobs", async () => {
    const f = await fixture();
    let launches = 0;
    const jobs = new CodingJobService(f.root, {
      transport: async () => {
        launches++;
        throw new Error("acknowledgement lost while provider may live");
      },
    });
    const first = await jobs.prepare(f.options),
      second = await jobs.prepare({
        ...f.options,
        prompt: "Different admitted work",
      });
    expect((await jobs.run(first.jobId)).status).toBe("uncertain");
    const restarted = new CodingJobService(f.root, {
      transport: async () => {
        launches++;
        return completed();
      },
    });
    await expect(restarted.run(second.jobId)).rejects.toThrow(
      "unresolved coding job claim",
    );
    await expect(
      restarted.prepare({ ...f.options, prompt: "Third job" }),
    ).rejects.toThrow("unresolved coding job claim");
    expect((await restarted.run(first.jobId)).status).toBe("uncertain");
    expect(launches).toBe(1);
  });
  fixtureTest("a settled claim permits a next job, but its uncertainty blocks validation of older work", async () => {
    const f = await fixture();
    let launches = 0;
    const jobs = new CodingJobService(f.root, {
      transport: async () => {
        launches++;
        if (launches === 2) throw new Error("lost second acknowledgement");
        return completed();
      },
    });
    const first = await jobs.prepare(f.options);
    expect((await jobs.run(first.jobId)).status).toBe("completed");
    await jobs.verifyWorkspace(first.jobId);
    const second = await jobs.prepare({
      ...f.options,
      prompt: "Next job after settled first",
    });
    expect((await jobs.run(second.jobId)).status).toBe("uncertain");
    await expect(jobs.verifyWorkspace(first.jobId)).rejects.toThrow(
      "unresolved coding job claim",
    );
    expect(launches).toBe(2);
  });
  fixtureTest("offline observations do not launch or inspect live Git", async () => {
    const f = await fixture(),
      host = new CodingJobService(f.root, {
        transport: async () => completed(),
      }),
      job = await host.prepare(f.options);
    await host.run(job.jobId);
    await rename(f.workspace, `${f.workspace}-gone`);
    const result = await host.inspect(job.jobId);
    expect(result.status, result.reason).toBe("completed");
    const entry = host.tools(job.jobId).get(CODING_JOB_TOOL)!;
    expect(entry.signature.effect).toBe("read");
    expect(
      (
        await entry.tool(
          {},
          {
            requestDigest: digestText("inspect"),
            idempotencyKey: digestText("inspect"),
          },
        )
      ).done,
    ).toBe("done");
    await expect(host.verifyWorkspace(job.jobId)).rejects.toThrow();
  });
});
