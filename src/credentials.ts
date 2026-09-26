// Provider credential custody: a layered resolver that never lets a secret
// reach manifests, receipts, digests, or logs.
//
//   explicit option → provider env var → OS vault → permission-checked file
//
// OS vaults are zero-dependency: macOS `security`, Linux `secret-tool`
// (libsecret), Windows DPAPI through bundled PowerShell. The file fallback
// is `~/.algal/credentials/<provider>` mode 0600 inside a 0700 directory.
// `algal auth` owns store/forget/status; executors own resolve.

import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { AlgalError } from "./errors";

export type CredentialProvider = "jev";

export type CredentialSource =
  | "option"
  | "env"
  | "keychain"
  | "file";

export type CredentialStatus = {
  provider: CredentialProvider;
  configured: boolean;
  source?: CredentialSource;
  /** A redacted tail — at most the last 4 chars, never the key. */
  hint?: string;
  /** Where a file/keychain entry lives (for status output only). */
  location?: string;
};

type ProviderSpec = {
  env: string;
  /** Vault service/keychain item name. */
  service: string;
  /** Vault account label. */
  account: string;
};

const PROVIDERS: Record<CredentialProvider, ProviderSpec> = {
  jev: { env: "TYPESAFE_API_KEY", service: "algal.jev", account: "typesafe" },
};

export function providerSpec(provider: CredentialProvider): ProviderSpec {
  return PROVIDERS[provider];
}

export function algalHome(): string {
  const env = process.env.ALGAL_HOME;
  if (typeof env === "string" && env.length > 0) return env;
  return join(homedir(), ".algal");
}

function credentialFile(provider: CredentialProvider): string {
  return join(algalHome(), "credentials", `${provider}.key`);
}

const KEY_MIN = 8;
const KEY_MAX = 8192;

export function checkCredentialShape(key: string, at: string): void {
  if (
    key.length < KEY_MIN ||
    key.length > KEY_MAX ||
    /\s/.test(key)
  ) {
    throw new AlgalError(
      "PARSE_FAILED",
      `${at} is not a plausible credential (${KEY_MIN}..${KEY_MAX} chars, no whitespace)`,
    );
  }
}

export function redact(key: string): string {
  return key.length > 8 ? `…${Array.from(key).slice(-4).join("")}` : "…";
}

// -------------------------------------------------------------- os vault ---

type CommandRunner = (
  argv: string[],
  stdin?: string,
) => Promise<{ code: number; stdout: string; stderr: string }>;

async function defaultRun(
  argv: string[],
  stdin?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn(argv, {
      stdin: stdin !== undefined ? "pipe" : "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    const input = (async () => {
      if (stdin === undefined || !proc.stdin) return true;
      let complete = true;
      // Both operations can return independently rejecting promises. Always
      // settle the close, and never treat an incomplete secret as stored.
      try { await proc.stdin.write(stdin); } catch { complete = false; }
      try { await proc.stdin.end(); } catch { complete = false; }
      return complete;
    })();
    const [stdout, stderr, code, inputComplete] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
      input,
    ]);
    if (!inputComplete) return { code: code === 0 ? 127 : code, stdout: "", stderr: "stdin delivery failed" };
    return { code, stdout, stderr };
  } catch {
    return { code: 127, stdout: "", stderr: "spawn failed" };
  }
}

export type VaultBackend = {
  id: "keychain" | "file";
  detail: string;
  get(run: CommandRunner, spec: ProviderSpec): Promise<string | undefined>;
  set(run: CommandRunner, spec: ProviderSpec, key: string): Promise<void>;
  forget(run: CommandRunner, spec: ProviderSpec): Promise<boolean>;
};

function securityBackend(): VaultBackend | undefined {
  if (platform() !== "darwin") return undefined;
  const base = ["security"];
  return {
    id: "keychain",
    detail: "macOS Keychain (security)",
    async get(run, spec) {
      const r = await run([
        ...base,
        "find-generic-password",
        "-s",
        spec.service,
        "-a",
        spec.account,
        "-w",
      ]);
      const key = r.stdout.trim();
      return r.code === 0 && key.length > 0 ? key : undefined;
    },
    async set(run, spec, key) {
      const r = await run([
        ...base,
        "add-generic-password",
        "-U",
        "-s",
        spec.service,
        "-a",
        spec.account,
        "-w",
        key,
      ]);
      if (r.code !== 0) {
        throw new AlgalError("IO_FAILED", `security add-generic-password failed (${r.code})`);
      }
    },
    async forget(run, spec) {
      const r = await run([
        ...base,
        "delete-generic-password",
        "-s",
        spec.service,
        "-a",
        spec.account,
      ]);
      return r.code === 0;
    },
  };
}

function secretToolBackend(): VaultBackend | undefined {
  if (platform() !== "linux") return undefined;
  const attrs = (spec: ProviderSpec) => [
    "service",
    spec.service,
    "account",
    spec.account,
  ];
  return {
    id: "keychain",
    detail: "libsecret (secret-tool)",
    async get(run, spec) {
      const r = await run(["secret-tool", "lookup", ...attrs(spec)]);
      const key = r.stdout.trim();
      return r.code === 0 && key.length > 0 ? key : undefined;
    },
    async set(run, spec, key) {
      const r = await run(
        [
          "secret-tool",
          "store",
          `--label=algal ${spec.service}`,
          ...attrs(spec),
        ],
        key,
      );
      if (r.code !== 0) {
        throw new AlgalError("IO_FAILED", `secret-tool store failed (${r.code})`);
      }
    },
    async forget(run, spec) {
      const r = await run(["secret-tool", "clear", ...attrs(spec)]);
      return r.code === 0;
    },
  };
}

// Windows: no zero-dep read-back keychain — cmdkey can't return passwords.
// DPAPI-encrypted file via bundled PowerShell instead.
function dpapiBackend(provider: CredentialProvider): VaultBackend | undefined {
  if (platform() !== "win32") return undefined;
  const file = join(algalHome(), "credentials", `${provider}.dpapi`);
  const ps = [
    "powershell",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
  ];
  return {
    id: "keychain",
    detail: "Windows DPAPI (PowerShell)",
    async get(run) {
      const r = await run([
        ...ps,
        `[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String((Get-Content -Raw '${file.replaceAll("'", "''")}')),$null,'CurrentUser'))`,
      ]);
      const key = r.stdout.trim();
      return r.code === 0 && key.length > 0 ? key : undefined;
    },
    async set(run, _spec, key) {
      await mkdir(join(algalHome(), "credentials"), { recursive: true });
      const b64 = Buffer.from(key, "utf8").toString("base64");
      const r = await run([
        ...ps,
        `[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Convert]::FromBase64String('${b64}'),$null,'CurrentUser')) | Set-Content -NoNewline '${file.replaceAll("'", "''")}'`,
      ]);
      if (r.code !== 0) {
        throw new AlgalError("IO_FAILED", `DPAPI protect failed (${r.code})`);
      }
    },
    async forget() {
      try {
        await unlink(file);
        return true;
      } catch {
        return false;
      }
    },
  };
}

async function fileGet(provider: CredentialProvider): Promise<string | undefined> {
  if (!await credentialDirectory(false)) return undefined;
  let file;
  try {
    file = await open(credentialFile(provider), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new AlgalError("IO_FAILED", "credential file cannot be safely opened");
  }
  try {
    const metadata = await file.stat();
    checkPrivate(metadata, false);
    if (metadata.size > KEY_MAX * 4 + 1) throw new AlgalError("IO_FAILED", "credential file exceeds its byte bound");
    const bytes = Buffer.alloc(KEY_MAX * 4 + 2);
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
    if (bytesRead !== metadata.size) throw new AlgalError("IO_FAILED", "credential file changed while reading");
    const key = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, bytesRead)).trim();
    checkCredentialShape(key, "stored credential");
    return key;
  } finally { await file.close(); }
}

function checkPrivate(metadata: import("node:fs").Stats, directory: boolean): void {
  if (metadata.isSymbolicLink() || (directory ? !metadata.isDirectory() : !metadata.isFile()) ||
      (platform() !== "win32" && ((metadata.mode & 0o077) !== 0 || (!directory && metadata.nlink !== 1) || (process.getuid && metadata.uid !== process.getuid())))) {
    throw new AlgalError("IO_FAILED", "credential state must be private, owned, and free of symlinks");
  }
}
async function credentialDirectory(create: boolean): Promise<boolean> {
  const dir = join(algalHome(), "credentials");
  try {
    const home = await lstat(algalHome());
    if (home.isSymbolicLink() || !home.isDirectory()) throw new AlgalError("IO_FAILED", "credential home must be a real directory");
    if (platform() !== "win32" && ((home.mode & 0o022) !== 0 || (process.getuid && home.uid !== process.getuid()))) {
      throw new AlgalError("IO_FAILED", "credential home must be owned and not writable by others");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (!create) return false;
  }
  if (create) await mkdir(dir, { recursive: true, mode: 0o700 });
  try { checkPrivate(await lstat(dir), true); }
  catch (error) { if (!create && (error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
  return true;
}

async function fileSet(provider: CredentialProvider, key: string): Promise<void> {
  const dir = join(algalHome(), "credentials");
  await credentialDirectory(true);
  const file = credentialFile(provider);
  try { checkPrivate(await lstat(file), false); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const temporary = join(dir, `.credential-${randomBytes(24).toString("hex")}`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${key}\n`); await handle.sync(); await handle.close();
    await credentialDirectory(false);
    await rename(temporary, file);
    if (process.platform !== "win32") {
      const directory = await open(dir, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { await directory.sync(); } finally { await directory.close(); }
    }
  } finally { await handle.close().catch(() => undefined); await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }); }
}

async function fileForget(provider: CredentialProvider): Promise<boolean> {
  if (!await credentialDirectory(false)) return false;
  try {
    checkPrivate(await lstat(credentialFile(provider)), false);
    await unlink(credentialFile(provider));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** The OS vault backend for this platform, or undefined when the platform's
 * tooling is absent (probed lazily — `security`/`secret-tool` may not exist). */
export function osBackend(
  provider: CredentialProvider,
): VaultBackend | undefined {
  return (
    securityBackend() ?? secretToolBackend() ?? dpapiBackend(provider)
  );
}

export type CredentialResolverOptions = {
  /** An explicit credential — beats every other source. */
  credential?: string;
  /** Skip env lookup (tests). */
  env?: string;
  run?: CommandRunner;
};

/** Resolve a provider credential through the custody chain. Returns
 * `undefined` when no source yields one — callers decide whether that is an
 * error (executors) or a status fact (auth status). */
export async function resolveCredential(
  provider: CredentialProvider,
  options: CredentialResolverOptions = {},
): Promise<{ key: string; source: CredentialSource } | undefined> {
  if (options.credential !== undefined) {
    checkCredentialShape(options.credential, `${provider} credential`);
    return { key: options.credential, source: "option" };
  }
  const envName = options.env ?? PROVIDERS[provider].env;
  const envValue = process.env[envName];
  if (typeof envValue === "string" && envValue.length > 0) {
    checkCredentialShape(envValue, `${provider} environment credential`);
    return { key: envValue, source: "env" };
  }
  const run = options.run ?? defaultRun;
  const backend = osBackend(provider);
  if (backend) {
    const key = await backend.get(run, PROVIDERS[provider]);
    if (key !== undefined) { checkCredentialShape(key, `${provider} vault credential`); return { key, source: "keychain" }; }
  }
  const file = await fileGet(provider);
  if (file !== undefined) return { key: file, source: "file" };
  return undefined;
}

/** An async credential resolver suitable for executor options. */
export function credentialResolver(
  provider: CredentialProvider,
  options: CredentialResolverOptions = {},
): () => Promise<string> {
  return async () => {
    const hit = await resolveCredential(provider, options);
    if (hit === undefined) {
      throw new AlgalError(
        "EFFECT_UNBOUND",
        `${provider} credential is not configured — run \`algal auth ${provider}\` or set ${PROVIDERS[provider].env}`,
      );
    }
    return hit.key;
  };
}

/** Store a credential: OS vault when available, permission-checked file
 * otherwise. Returns where it landed for status output. */
export async function storeCredential(
  provider: CredentialProvider,
  key: string,
  options: { run?: CommandRunner } = {},
): Promise<{ source: CredentialSource; location: string }> {
  checkCredentialShape(key, `${provider} credential`);
  const run = options.run ?? defaultRun;
  const backend = osBackend(provider);
  if (backend) {
    try {
      await backend.set(run, PROVIDERS[provider], key);
      return { source: "keychain", location: backend.detail };
    } catch (e) {
      // vault tooling present but failed (no libsecret session, headless) —
      // fall through to the file store rather than lose the credential.
      if (!(e instanceof AlgalError)) throw e;
    }
  }
  await fileSet(provider, key);
  return { source: "file", location: credentialFile(provider) };
}

export async function forgetCredential(
  provider: CredentialProvider,
  options: { run?: CommandRunner } = {},
): Promise<{ removed: CredentialSource[] }> {
  const removed: CredentialSource[] = [];
  const run = options.run ?? defaultRun;
  const backend = osBackend(provider);
  if (backend && (await backend.forget(run, PROVIDERS[provider]))) {
    removed.push("keychain");
  }
  if (await fileForget(provider)) removed.push("file");
  return { removed };
}

export async function credentialStatus(
  provider: CredentialProvider,
  options: CredentialResolverOptions = {},
): Promise<CredentialStatus> {
  const hit = await resolveCredential(provider, options);
  if (hit === undefined) return { provider, configured: false };
  const status: CredentialStatus = {
    provider,
    configured: true,
    source: hit.source,
    hint: redact(hit.key),
  };
  if (hit.source === "file") status.location = credentialFile(provider);
  if (hit.source === "keychain") {
    const detail = osBackend(provider)?.detail;
    if (detail !== undefined) status.location = detail;
  }
  return status;
}
