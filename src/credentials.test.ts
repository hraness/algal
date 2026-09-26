import { afterEach, describe, expect, test } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkCredentialShape,
  credentialResolver,
  credentialStatus,
  forgetCredential,
  redact,
  resolveCredential,
  storeCredential,
} from "./credentials";
import { AlgalError } from "./errors";

const ENV = "TYPESAFE_API_KEY";
let home: string | undefined;
const dirs: string[] = [];

async function freshHome(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "algal-cred-"));
  dirs.push(d);
  return d;
}

afterEach(async () => {
  delete process.env[ENV];
  if (home !== undefined) {
    delete process.env.ALGAL_HOME;
    home = undefined;
  }
  while (dirs.length) await rm(dirs.pop()!, { recursive: true, force: true });
});

describe("credential shape + redaction", () => {
  test("rejects implausible keys", () => {
    expect(() => checkCredentialShape("short", "k")).toThrow(AlgalError);
    expect(() => checkCredentialShape(" padded ", "k")).toThrow(AlgalError);
    expect(() => checkCredentialShape("line\nbreak_ok_123", "k")).toThrow(AlgalError);
    expect(() => checkCredentialShape("inner space_123", "k")).toThrow(AlgalError);
    expect(() => checkCredentialShape("inner\ttab_12345", "k")).toThrow(AlgalError);
    expect(() => checkCredentialShape("ts_valid_key_1234", "k")).not.toThrow();
  });

  test("redact shows at most the tail", () => {
    expect(redact("ts_abcdefghijklmnop")).toBe("…mnop");
    expect(redact("tiny")).toBe("…");
    expect(redact("")).toBe("…");
    expect(redact("abcdefghé😀é😀é")).toBe("…😀é😀é");
  });
});

describe("private credential file admission", () => {
  const run = async () => ({ code: 1, stdout: "", stderr: "" });

  test("atomic fallback publication creates private files and replaces only admitted state", async () => {
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    const first = await storeCredential("jev", "fixture-key-one", { run });
    await storeCredential("jev", "fixture-key-two", { run });
    expect(await readFile(first.location, "utf8")).toBe("fixture-key-two\n");
    if (process.platform !== "win32") {
      expect((await lstat(first.location)).mode & 0o777).toBe(0o600);
      expect((await lstat(join(home, "credentials"))).mode & 0o777).toBe(0o700);
    }
  });

  test.skipIf(process.platform === "win32")("symlinks cannot read, overwrite, or remove another file", async () => {
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    await mkdir(join(home, "credentials"), { mode: 0o700 });
    const outside = join(await freshHome(), "unrelated");
    await writeFile(outside, "unrelated-user-data", { mode: 0o600 });
    await symlink(outside, join(home, "credentials", "jev.key"));
    await expect(resolveCredential("jev", { run })).rejects.toThrow();
    await expect(storeCredential("jev", "fixture-new-key", { run })).rejects.toThrow();
    await expect(forgetCredential("jev", { run })).rejects.toThrow();
    expect(await readFile(outside, "utf8")).toBe("unrelated-user-data");
  });

  test.skipIf(process.platform === "win32")("public modes and symlinked homes fail closed", async () => {
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    const stored = await storeCredential("jev", "fixture-private-key", { run });
    await chmod(stored.location, 0o644);
    await expect(resolveCredential("jev", { run })).rejects.toThrow();
    await expect(storeCredential("jev", "replacement-key", { run })).rejects.toThrow();
    const outside = await freshHome();
    const link = join(await freshHome(), "home-link");
    await symlink(outside, link);
    process.env.ALGAL_HOME = link;
    await expect(storeCredential("jev", "replacement-key", { run })).rejects.toThrow();
    await expect(lstat(join(outside, "credentials"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("invalid environment and vault values never bypass shape validation", async () => {
    process.env[ENV] = "short";
    await expect(resolveCredential("jev", { run })).rejects.toThrow();
    delete process.env[ENV];
    const invalidVault = async () => ({ code: 0, stdout: "short", stderr: "" });
    await expect(resolveCredential("jev", { run: invalidVault })).rejects.toThrow();
  });
});

describe("resolution chain", () => {
  test("explicit option beats env and file", async () => {
    process.env[ENV] = "env_key_value_123";
    const hit = await resolveCredential("jev", { credential: "option_key_123" });
    expect(hit?.source).toBe("option");
    expect(hit?.key).toBe("option_key_123");
  });

  test("env beats vault/file", async () => {
    process.env[ENV] = "env_key_value_123";
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    // stub runner keeps the real OS vault out of tests
    const run = async () => ({ code: 1, stdout: "", stderr: "" });
    await storeCredential("jev", "file_key_1234", { run });
    const hit = await resolveCredential("jev", { run });
    expect(hit?.source).toBe("env");
  });

  test("file fallback round-trips and reports status", async () => {
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    // force file storage by disabling the os backend path via runner that fails
    const run = async () => ({ code: 1, stdout: "", stderr: "" });
    const stored = await storeCredential("jev", "file_key_1234", { run });
    expect(["file", "keychain"]).toContain(stored.source);
    const hit = await resolveCredential("jev", { run });
    expect(hit?.key).toBe("file_key_1234");
    const status = await credentialStatus("jev", { run });
    expect(status.configured).toBe(true);
    expect(status.hint).toBe("…1234");
    expect(JSON.stringify(status)).not.toContain("file_key_1234");
  });

  test("unconfigured resolves undefined; resolver throws typed error", async () => {
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    const run = async () => ({ code: 1, stdout: "", stderr: "" });
    expect(await resolveCredential("jev", { run })).toBeUndefined();
    const status = await credentialStatus("jev", { run });
    expect(status.configured).toBe(false);
    const resolve = credentialResolver("jev", { run });
    try {
      await resolve();
      throw new Error("unreachable");
    } catch (e) {
      expect((e as AlgalError).code).toBe("EFFECT_UNBOUND");
    }
  });

  test("forget removes stored credentials", async () => {
    home = await freshHome();
    process.env.ALGAL_HOME = home;
    const run = async () => ({ code: 1, stdout: "", stderr: "" });
    await storeCredential("jev", "file_key_1234", { run });
    const { removed } = await forgetCredential("jev", { run });
    expect(removed.length).toBeGreaterThan(0);
    expect(await resolveCredential("jev", { run })).toBeUndefined();
  });
});


test.skipIf(process.platform !== "linux")("Linux vault stdin promises settle before credential storage can succeed", async () => {
  const directory = await freshHome();
  const script = join(directory, "vault-fixture.ts");
  // Only Linux's secret-tool vault passes a secret over stdin. Isolate the
  // FileSink fixture in its own process without contacting a real vault.
  await writeFile(script, `
    import {readFile} from "node:fs/promises";
    import {join} from "node:path";
    const root = ${JSON.stringify(directory)};
    const {storeCredential} = await import(${JSON.stringify(join(import.meta.dir, "credentials.ts"))});
    const key = "fixture-only-not-a-provider-key";
    const results = [];
    for (const failure of ["write", "end", "none"]) {
      process.env.ALGAL_HOME = join(root, failure);
      let writes = 0; let ends = 0; let command = "";
      const closed = () => new ReadableStream({start(controller) {controller.close();}});
      const pipeError = () => Object.assign(new Error("fixture pipe closed"), {code: "EPIPE"});
      Bun.spawn = (argv) => {
        command = argv[0];
        if (argv[0] !== "secret-tool" || argv[1] !== "store") throw new Error("unexpected vault command");
        return {
          stdin: {
            async write(input) {writes++; if (input !== key) throw new Error("unexpected input"); if (failure === "write") throw pipeError(); return input.length;},
            async end() {ends++; if (failure === "end") throw pipeError(); return 0;},
          },
          stdout: closed(), stderr: closed(), exited: Promise.resolve(0),
        };
      };
      const stored = await storeCredential("jev", key);
      const expected = failure === "none" ? "keychain" : "file";
      if (stored.source !== expected || writes !== 1 || ends !== 1) throw new Error(JSON.stringify({failure,source:stored.source,writes,ends,command}));
      if (expected === "file" && (await readFile(stored.location, "utf8")).trim() !== key) throw new Error("fallback lost credential");
      results.push({failure, source: stored.source, writes, ends});
    }
    console.log(JSON.stringify(results));
  `);
  const child = Bun.spawn([process.execPath, script], {
    env: { PATH: process.env.PATH ?? "", ALGAL_HOME: directory },
    stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
    expect(JSON.parse(stdout)).toEqual([
      { failure: "write", source: "file", writes: 1, ends: 1 },
      { failure: "end", source: "file", writes: 1, ends: 1 },
      { failure: "none", source: "keychain", writes: 1, ends: 1 },
    ]);
  } finally {
    clearTimeout(timer);
    child.kill("SIGKILL");
    await child.exited;
  }
});
