import { expect, test } from "bun:test";
import { mkdtemp, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { manifestToJson, parseOrganismManifest } from "./contract";
import { commandExecutor, type EffectRequest, type Executor } from "./effects";
import { AlgalError } from "./errors";
import {
  isolatedCommandExecutor,
  resolveIsolation,
  type CommandIsolation,
} from "./isolation";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import type { JsonValue } from "./values";
import { verifyReceipt } from "./verify";

function request(): EffectRequest {
  return {
    contract: "algal.effect.v1",
    cellId: "probe",
    kind: "agent",
    prompt: "p",
    context: {},
    output: { kind: "text" },
    budget: { maxContextBytes: 65_536, maxOutputBytes: 4_096 },
  };
}

/** A command string that consumes the bounded request and prints a JSON
 * text output — every probe command stays a plain `sh` string so argv never
 * carries request bytes. */
const readThen = (tail: string) => `cat >/dev/null; ${tail}`;

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "algal-isolation-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("isolated children see only declared environment variables", async () => {
  await withTempDir(async (dir) => {
    const secret = "ALGAL_ISOLATION_SECRET";
    process.env[secret] = "topsecret";
    try {
      const probe = readThen(`printf '"%s"' "\${${secret}:-UNSET}"`);
      const scrubbed = isolatedCommandExecutor(probe, {
        isolation: { cwd: dir },
      });
      expect(await scrubbed.execute(request())).toBe("UNSET");

      const inheriting = isolatedCommandExecutor(probe, {
        isolation: { cwd: dir, envInherit: [secret] },
      });
      expect(await inheriting.execute(request())).toBe("topsecret");

      const declared = isolatedCommandExecutor(
        readThen('printf \'"%s"\' "$FIXED_VALUE"'),
        { isolation: { cwd: dir, envSet: { FIXED_VALUE: "set-value" } } },
      );
      expect(await declared.execute(request())).toBe("set-value");
    } finally {
      delete process.env[secret];
    }
  });
});

test("an absent declared variable inherits nothing", async () => {
  await withTempDir(async (dir) => {
    delete process.env.ALGAL_ISOLATION_ABSENT;
    const exec = isolatedCommandExecutor(
      readThen('printf \'"%s"\' "${ALGAL_ISOLATION_ABSENT:-UNSET}"'),
      { isolation: { cwd: dir, envInherit: ["ALGAL_ISOLATION_ABSENT"] } },
    );
    expect(await exec.execute(request())).toBe("UNSET");
  });
});

test("the host PATH does not leak; HOME defaults to the declared directory", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor(
      readThen('printf \'{"home":"%s","path":"%s"}\' "$HOME" "$PATH"'),
      { isolation: { cwd: dir } },
    );
    expect(await exec.execute(request())).toEqual({
      home: dir,
      path: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
    });
  });
});

test("isolated children start in the declared directory", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor(readThen('printf \'"%s"\' "$PWD"'), {
      isolation: { cwd: dir },
    });
    // $PWD is the physical directory; mkdtemp paths may sit under symlinks.
    expect(await exec.execute(request())).toBe(await realpath(dir));
  });
});

test("the bounded request still travels on stdin, never argv", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor("cat", { isolation: { cwd: dir } });
    const sent = request();
    const echoed = await exec.execute(sent);
    expect(echoed).toEqual(sent as unknown as JsonValue);
  });
});

test("a child that exceeds a declared file-size limit dies inside the bound", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor(
      readThen("head -c 200000 /dev/zero > blob.bin && printf '\"ok\"'"),
      { isolation: { cwd: dir, limits: { fileSizeBlocks: 1 } } },
    );
    await expect(exec.execute(request())).rejects.toMatchObject({
      code: "EFFECT_FAILED",
    });
    const blob = await stat(join(dir, "blob.bin"));
    // One ulimit -f block: 512 POSIX bytes, 1024 under bash-style shells.
    expect(blob.size).toBeLessThanOrEqual(2048);
    expect(await readdir(dir)).toEqual(["blob.bin"]);
  });
});

test("a child that exceeds a declared CPU limit is killed by signal", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor(
      readThen("while :; do :; done"),
      { timeoutMs: 30_000, isolation: { cwd: dir, limits: { cpuSeconds: 1 } } },
    );
    await expect(exec.execute(request())).rejects.toMatchObject({
      code: "EFFECT_FAILED",
      uncertain: true,
    });
  });
});

test.skipIf(process.platform !== "linux")(
  "a declared address-space limit kills a growing child where the OS enforces it",
  async () => {
    await withTempDir(async (dir) => {
      const exec = isolatedCommandExecutor(
        readThen("awk 'BEGIN{s=\"x\"; for(i=0;i<40;i++) s=s s; printf \"\\\"ok\\\"\"}'"),
        { timeoutMs: 30_000, isolation: { cwd: dir, limits: { addressSpaceKiB: 262_144 } } },
      );
      await expect(exec.execute(request())).rejects.toMatchObject({
        code: "EFFECT_FAILED",
      });
    });
  },
);

test("the effect timeout still bounds an isolated command", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor(readThen("sleep 30"), {
      timeoutMs: 100,
      isolation: { cwd: dir },
    });
    await expect(exec.execute(request())).rejects.toMatchObject({
      code: "BUDGET_EXHAUSTED",
      uncertain: true,
    });
  });
});

test("the executor suspension exit code survives the isolation wrapper", async () => {
  await withTempDir(async (dir) => {
    const exec = isolatedCommandExecutor("exit 75", { isolation: { cwd: dir } });
    await expect(exec.execute(request())).rejects.toMatchObject({
      code: "EFFECT_SUSPENDED",
    });
  });
});

test("an oversized inherited value fails the call instead of truncating", async () => {
  await withTempDir(async (dir) => {
    const name = "ALGAL_ISOLATION_HUGE";
    process.env[name] = "x".repeat(9_000);
    try {
      const exec = isolatedCommandExecutor(readThen("printf '\"ok\"'"), {
        isolation: { cwd: dir, envInherit: [name] },
      });
      await expect(exec.execute(request())).rejects.toMatchObject({
        code: "EFFECT_FAILED",
      });
    } finally {
      delete process.env[name];
    }
  });
});

test("isolation posture is part of the executor's configuration identity", async () => {
  await withTempDir(async (dir) => {
    const command = 'printf \'"x"\'';
    const digest = (e: Executor) =>
      Promise.resolve(e.receiptFor!(request())).then((m) => m.configurationDigest);
    const plain = commandExecutor(command);
    const baseline = isolatedCommandExecutor(command, { isolation: { cwd: dir } });
    const same = isolatedCommandExecutor(command, { isolation: { cwd: dir } });
    const tighter = isolatedCommandExecutor(command, {
      isolation: { cwd: dir, limits: { cpuSeconds: 10 } },
    });
    const differentEnv = isolatedCommandExecutor(command, {
      isolation: { cwd: dir, envInherit: ["USER"] },
    });
    expect(await digest(baseline)).toBe(await digest(same));
    for (const other of [plain, tighter, differentEnv]) {
      expect(await digest(baseline)).not.toBe(await digest(other));
    }
    // Same command under a different declared directory: different identity.
    const otherDir = isolatedCommandExecutor(command, { isolation: { cwd: "/" } });
    expect(await digest(baseline)).not.toBe(await digest(otherDir));
  });
});

test("declared limits record what the platform enforces", () => {
  const linux = resolveIsolation(
    { cwd: "/", limits: { addressSpaceKiB: 1_024, processes: 8, cpuSeconds: 30 } },
    "linux",
  );
  const limits = linux.descriptor.limits as Record<string, Record<string, JsonValue>>;
  expect(limits.addressSpaceKiB).toEqual({ value: 1_024, enforced: true });
  expect(limits.processes).toEqual({ value: 8, enforced: true, scope: "uid" });
  expect(limits.cpuSeconds).toEqual({ value: 30, enforced: true });
  expect(linux.descriptor.platform).toBe("linux");

  const darwin = resolveIsolation(
    { cwd: "/", limits: { cpuSeconds: 30 } },
    "darwin",
  );
  expect(darwin.descriptor.platform).toBe("darwin");

  // Darwin cannot apply RLIMIT_AS at all — the declared knob is refused at
  // admission rather than silently skipped.
  const expectRefused = () =>
    resolveIsolation({ cwd: "/", limits: { addressSpaceKiB: 1_024 } }, "darwin");
  expect(expectRefused).toThrow(AlgalError);
  expect(expectRefused).toThrow('cannot be applied on platform "darwin"');

  // A platform with no support-table entry refuses every declared limit.
  expect(() =>
    resolveIsolation({ cwd: "/", limits: { cpuSeconds: 1 } }, "plan9"),
  ).toThrow('cannot be applied on platform "plan9"');
});

test("the wrapper script interpolates only validated limit values", () => {
  const resolved = resolveIsolation(
    { cwd: "/", limits: { cpuSeconds: 5, fileSizeBlocks: 4, noCore: true } },
    "linux",
  );
  expect(resolved.script).toBe(
    'umask 077 || exit 111\nulimit -t 5 || exit 111\nulimit -f 4 || exit 111\nulimit -c 0 || exit 111\nexec /bin/sh -c "$1"',
  );
  expect(resolved.wrapperArgv).toEqual([
    "/bin/sh",
    "-c",
    resolved.script,
    "algal-isolated-command",
  ]);
});

test("isolation profiles reject invalid declarations", () => {
  const bad: CommandIsolation[] = [
    { cwd: "relative/dir" },
    { cwd: "/definitely/not/a/dir/algal-isolation-test" },
    { cwd: "/tmp\0x" },
    { cwd: "/", envInherit: ["NOT-A-NAME"] },
    { cwd: "/", envInherit: [""] },
    { cwd: "/", envSet: { "1BAD": "x" } },
    { cwd: "/", envSet: { "HAS SPACE": "x" } },
    { cwd: "/", envInherit: ["A"], envSet: { A: "1" } },
    { cwd: "/", envSet: { BIG: "x".repeat(9_000) } },
    { cwd: "/", limits: { cpuSeconds: 0 } },
    { cwd: "/", limits: { cpuSeconds: 86_401 } },
    { cwd: "/", limits: { openFiles: 1 } },
    { cwd: "/", limits: { noCore: false as never } },
    { cwd: "/", envInherit: Array.from({ length: 33 }, (_, i) => `V${i}`) },
  ];
  for (const isolation of bad) {
    expect(() => resolveIsolation(isolation)).toThrow(AlgalError);
  }
});

test("recorded isolated effects replay bit-for-bit without respawning", async () => {
  await withTempDir(async (dir) => {
    const manifest = parseOrganismManifest({
      contract: "algal.organism.v1",
      key: "organism:isolation-replay",
      name: "IsolationReplay",
      cells: [{ id: "a", kind: "agent", prompt: "p", output: { kind: "text" } }],
      edges: [],
    });
    const exec = isolatedCommandExecutor(readThen('printf \'"replayable"\''), {
      isolation: { cwd: dir, limits: { noCore: true } },
    });
    const receipt = await runOrganism({
      manifest,
      args: {},
      fns: builtinRegistry(),
      store: new MemoryStore(),
      executors: [exec],
    });
    expect(receipt.outcome).toBe("complete");
    expect(receipt.cells["a"]?.outputs?.out).toBe("replayable");
    expect(receipt.effects).toHaveLength(1);
    expect(receipt.effects[0]?.executor).toBe(exec.id);
    expect(receipt.effects[0]?.configurationDigest).toMatch(/^sha256:/);

    // Verification replays the recorded receipt through replayExecutor —
    // a spawn spy proves no child process runs.
    const spawn = Bun.spawn;
    let spawned = 0;
    Bun.spawn = function (...args: unknown[]) {
      spawned++;
      return Reflect.apply(spawn, Bun, args);
    } as typeof Bun.spawn;
    try {
      const verified = await verifyReceipt(
        receipt as unknown as JsonValue,
        manifestToJson(manifest),
        new MemoryStore(),
      );
      expect(verified.ok).toBe(true);
      expect(verified.mismatches).toEqual([]);
    } finally {
      Bun.spawn = spawn;
    }
    expect(spawned).toBe(0);
  });
});

// -------------------------------------------------------------- cli flag ---

const root = resolve(import.meta.dir, "..");

async function cli(args: string[], env?: Record<string, string | undefined>) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], {
    cwd: root,
    ...(env !== undefined ? { env } : {}),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, code };
}

const cliManifest = {
  contract: "algal.organism.v1",
  key: "organism:isolation-cli",
  name: "IsolationCli",
  cells: [{ id: "a", kind: "agent", prompt: "p", output: { kind: "text" } }],
  edges: [],
};

test("the isolated profile scrubs the child environment end to end", async () => {
  await withTempDir(async (dir) => {
    const manifest = join(dir, "probe.algal.json");
    await writeFile(manifest, JSON.stringify(cliManifest));
    const env = { ...process.env, ALGAL_CLI_SECRET: "leaked" };
    const command = readThen('printf \'"%s"\' "${ALGAL_CLI_SECRET:-UNSET}"');
    const open = await cli(["run", manifest, "--executor-cmd", command], env);
    expect(open.code).toBe(0);
    expect(JSON.parse(open.stdout).cells["a"].outputs.out).toBe("leaked");
    const closed = await cli(
      [
        "run", manifest,
        "--executor-cmd", command,
        "--executor-profile", "isolated",
        "--executor-cwd", dir,
      ],
      env,
    );
    expect(closed.stderr).not.toContain("leaked");
    expect(closed.code).toBe(0);
    expect(JSON.parse(closed.stdout).cells["a"].outputs.out).toBe("UNSET");
  });
});

test("isolation flags validate and compose on the command line", async () => {
  await withTempDir(async (dir) => {
    const manifest = join(dir, "probe.algal.json");
    await writeFile(manifest, JSON.stringify(cliManifest));
    const cases = [
      ["--executor-profile", "bogus"],
      ["--executor-env", "SOME_NAME"], // env flags require the profile
      ["--executor-profile", "isolated", "--executor-limits", "bogus=1"],
      ["--executor-profile", "isolated", "--executor-limits", "cpuSeconds=0"],
      ["--executor-profile", "isolated", "--executor-env", "=orphan"],
      ["--executor-profile", "isolated", "--executor-cwd", join(dir, "missing")],
    ];
    for (const extra of cases) {
      const result = await cli(["run", manifest, "--executor-cmd", "true", ...extra]);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain("PARSE_FAILED");
    }
    // A declared variable passes through by name; an undeclared one does not.
    const env = { ...process.env, ALGAL_CLI_SECRET: "leaked" };
    const result = await cli(
      [
        "run", manifest,
        "--executor-cmd",
        readThen('printf \'"%s"\' "$ALGAL_CLI_SECRET"'),
        "--executor-profile", "isolated",
        "--executor-cwd", dir,
        "--executor-env", "ALGAL_CLI_SECRET",
        "--executor-limits", "cpuSeconds=30,noCore",
      ],
      env,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).cells["a"].outputs.out).toBe("leaked");
  });
});
