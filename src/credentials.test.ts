import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
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
    expect(() => checkCredentialShape("ts_valid_key_1234", "k")).not.toThrow();
  });

  test("redact shows at most the tail", () => {
    expect(redact("ts_abcdefghijklmnop")).toBe("…mnop");
    expect(redact("tiny")).toBe("…");
    expect(redact("")).toBe("…");
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
