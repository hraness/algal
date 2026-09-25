// Physical isolation for command executors. `commandExecutor` trusts the
// host's `sh -c` child with the whole ambient environment, the host's
// working directory, and whatever resources the kernel grants it. The
// isolated profile replaces that ambient posture with a declared one:
//
// - the child's environment is exactly the declared allowlist (Bun's `env`
//   spawn option replaces, never merges, so host credentials cannot leak),
// - the child starts in one declared directory (a launch property — it is
//   not a filesystem sandbox), and
// - a fixed POSIX wrapper script applies `ulimit` resource bounds before
//   `exec`, so the OS — not the runner's wall-clock race — enforces them.
//
// Every declared parameter, plus which knobs this platform actually enforces,
// feeds the executor's configuration digest: a weaker posture can never
// share a stronger profile's identity. A knob the platform cannot apply is
// refused at admission, and a knob that applies but is not enforced is
// recorded as such — the digest is the record of what was actually done.
// The untrusted request itself never enters argv: it travels only over the
// bounded stdin pipe, exactly as `commandExecutor` does.
//
// Native parity: the Rust kernel has no equivalent backend yet; adding one
// is proposed (docs/executors.md records the digest inputs it must match).

import { statSync } from "node:fs";
import { isAbsolute } from "node:path";

import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { EFFECT_KINDS, type Executor } from "./effects";
import { commandJson } from "./io-runtime";
import { utf8Length } from "./utf8";
import { asInt, asString, type JsonObject, type JsonValue } from "./values";

export const ISOLATION_BOUNDS = {
  maxEnvEntries: 32,
  maxEnvNameLen: 64,
  maxEnvValueBytes: 8_192,
  maxCwdBytes: 4_096,
  limits: {
    cpuSeconds: { min: 1, max: 86_400 },
    fileSizeBlocks: { min: 1, max: 33_554_432 },
    openFiles: { min: 4, max: 1_048_576 },
    processes: { min: 1, max: 65_536 },
    addressSpaceKiB: { min: 1_024, max: 16_777_216 },
    stackKiB: { min: 64, max: 1_048_576 },
  },
} as const;

/** Resource bounds applied by `ulimit` before the command exec's. Units are
 * the shell's own: `fileSizeBlocks` follows `ulimit -f` (512-byte POSIX
 * blocks; bash counts 1024), `processes` is an RLIMIT_NPROC count charged
 * per real uid — on a uid already running many processes even the inner
 * shell's own forks fail — and `addressSpaceKiB` is `ulimit -v`, which the
 * kernel enforces on Linux but Darwin refuses to even set. */
export type IsolationLimits = {
  readonly cpuSeconds?: number;
  readonly fileSizeBlocks?: number;
  readonly openFiles?: number;
  readonly processes?: number;
  readonly addressSpaceKiB?: number;
  readonly stackKiB?: number;
  readonly noCore?: true;
};

export type CommandIsolation = {
  /** Absolute directory the child starts in; must exist. */
  readonly cwd: string;
  /** Host environment variable names the child may inherit at call time.
   * Values are read live from `process.env` per request and are never
   * digested — credentials belong here, not in `envSet`. */
  readonly envInherit?: readonly string[];
  /** Fixed child variables. Values are declared host configuration — they
   * enter the configuration digest, so secrets do not belong here. */
  readonly envSet?: Readonly<Record<string, string>>;
  readonly limits?: IsolationLimits;
};

type LimitKnob = {
  readonly flag: string;
  readonly settable: boolean;
  readonly enforced: boolean;
  readonly scope?: "uid";
};

/** What this platform's `sh` can apply and what its kernel enforces.
 * Recorded into the digest verbatim; a knob absent from a platform's row is
 * refused outright rather than silently skipped. Linux enforces every knob
 * here. Darwin's `setrlimit` accepts `RLIMIT_AS` for `getrlimit` only — the
 * shell reports "cannot modify limit" — so the address-space knob cannot be
 * applied there at all. */
const LIMIT_SUPPORT: Record<string, Record<keyof IsolationLimits, LimitKnob>> = {
  linux: {
    cpuSeconds: { flag: "t", settable: true, enforced: true },
    fileSizeBlocks: { flag: "f", settable: true, enforced: true },
    openFiles: { flag: "n", settable: true, enforced: true },
    processes: { flag: "u", settable: true, enforced: true, scope: "uid" },
    addressSpaceKiB: { flag: "v", settable: true, enforced: true },
    stackKiB: { flag: "s", settable: true, enforced: true },
    noCore: { flag: "c", settable: true, enforced: true },
  },
  darwin: {
    cpuSeconds: { flag: "t", settable: true, enforced: true },
    fileSizeBlocks: { flag: "f", settable: true, enforced: true },
    openFiles: { flag: "n", settable: true, enforced: true },
    processes: { flag: "u", settable: true, enforced: true, scope: "uid" },
    addressSpaceKiB: { flag: "v", settable: false, enforced: false },
    stackKiB: { flag: "s", settable: true, enforced: true },
    noCore: { flag: "c", settable: true, enforced: true },
  },
};

const LIMIT_ORDER = [
  "cpuSeconds",
  "fileSizeBlocks",
  "openFiles",
  "processes",
  "addressSpaceKiB",
  "stackKiB",
  "noCore",
] as const satisfies readonly (keyof IsolationLimits)[];

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Fixed variables every isolated child gets unless the profile covers the
 * name itself. `HOME` resolves to the declared cwd so config and temp paths
 * land inside it instead of the operator's home. */
function defaultEnv(cwd: string): Record<string, string> {
  return {
    HOME: cwd,
    LANG: "C.UTF-8",
    PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
  };
}

export type ResolvedIsolation = {
  /** Everything before the command string in the spawned argv:
   * `["/bin/sh", "-c", script, "algal-isolated-command"]`. */
  readonly wrapperArgv: readonly string[];
  /** The generated wrapper script — declared limits interpolated as
   * validated integers; untrusted data never reaches it. */
  readonly script: string;
  readonly cwd: string;
  /** Fixed child environment (defaults + `envSet`); inherited names are
   * resolved live at execute time and added on top. */
  readonly env: Record<string, string>;
  readonly envInherit: readonly string[];
  /** The digest-visible posture: env allowlist, declared limits with their
   * per-knob enforcement truth, and the platform that enforcement was
   * determined for. Contains no inherited values. */
  readonly descriptor: JsonObject;
};

export function resolveIsolation(
  isolation: CommandIsolation,
  platform: string = process.platform,
): ResolvedIsolation {
  const cwd = asString(isolation.cwd, "isolation cwd", ISOLATION_BOUNDS.maxCwdBytes);
  if (cwd.includes("\0")) {
    throw new AlgalError("PARSE_FAILED", "isolation cwd must not contain NUL");
  }
  if (!isAbsolute(cwd)) {
    throw new AlgalError("PARSE_FAILED", "isolation cwd must be an absolute path");
  }
  const stat = statSync(cwd, { throwIfNoEntry: false });
  if (stat === undefined || !stat.isDirectory()) {
    throw new AlgalError("PARSE_FAILED", `isolation cwd is not a directory: ${cwd}`);
  }

  const envInherit = [...(isolation.envInherit ?? [])];
  if (envInherit.length > ISOLATION_BOUNDS.maxEnvEntries) {
    throw new AlgalError("PARSE_FAILED", "isolation envInherit exceeds the entry bound");
  }
  for (const name of envInherit) checkEnvName(name, "isolation envInherit");
  envInherit.sort();

  const envSetEntries = Object.entries(isolation.envSet ?? {});
  if (envSetEntries.length > ISOLATION_BOUNDS.maxEnvEntries) {
    throw new AlgalError("PARSE_FAILED", "isolation envSet exceeds the entry bound");
  }
  for (const [name, value] of envSetEntries) {
    checkEnvName(name, "isolation envSet");
    checkEnvValue(value, `isolation envSet.${name}`);
  }
  const overlap = envInherit.find((name) => Object.hasOwn(isolation.envSet ?? {}, name));
  if (overlap !== undefined) {
    throw new AlgalError(
      "PARSE_FAILED",
      `isolation env "${overlap}" is declared both fixed and inherited`,
    );
  }

  const env = defaultEnv(cwd);
  for (const [name, value] of envSetEntries) env[name] = value;
  for (const name of envInherit) delete env[name];

  const support = LIMIT_SUPPORT[platform];
  const limits = isolation.limits ?? {};
  const lines: string[] = [];
  const limitsDescriptor: JsonObject = {};
  for (const knob of LIMIT_ORDER) {
    const declared = limits[knob];
    if (declared === undefined) continue;
    const row = support?.[knob];
    if (row === undefined || !row.settable) {
      throw new AlgalError(
        "PARSE_FAILED",
        `isolation limit "${knob}" cannot be applied on platform "${platform}"`,
      );
    }
    if (knob === "noCore") {
      if (declared !== true) {
        throw new AlgalError("PARSE_FAILED", 'isolation limits.noCore must be true when present');
      }
      lines.push("ulimit -c 0 || exit 111");
      limitsDescriptor[knob] = { enforced: row.enforced, value: true };
      continue;
    }
    const bound = ISOLATION_BOUNDS.limits[knob];
    const value = asInt(declared, `isolation limits.${knob}`, bound.min, bound.max);
    lines.push(`ulimit -${row.flag} ${value} || exit 111`);
    limitsDescriptor[knob] = {
      enforced: row.enforced,
      value,
      ...(row.scope !== undefined ? { scope: row.scope } : {}),
    };
  }

  // 111 identifies "a declared limit could not be applied" — distinct from
  // any exit the command itself chooses. `exec` keeps one process: the
  // wrapper is the command's PID, so kills and limits reach it directly.
  const script = [
    "umask 077 || exit 111",
    ...lines,
    'exec /bin/sh -c "$1"',
  ].join("\n");
  const descriptor: JsonObject = {
    env: { inherit: envInherit as unknown as JsonValue, set: env as unknown as JsonValue },
    limits: limitsDescriptor,
    platform,
  };
  return {
    wrapperArgv: ["/bin/sh", "-c", script, "algal-isolated-command"],
    script,
    cwd,
    env,
    envInherit,
    descriptor,
  };
}

function checkEnvName(name: string, what: string): void {
  if (!ENV_NAME.test(asString(name, what, ISOLATION_BOUNDS.maxEnvNameLen))) {
    throw new AlgalError("PARSE_FAILED", `${what}: invalid environment name "${name}"`);
  }
}

function checkEnvValue(value: string, what: string): void {
  if (typeof value !== "string" || utf8Length(value) > ISOLATION_BOUNDS.maxEnvValueBytes || value.includes("\0")) {
    throw new AlgalError("PARSE_FAILED", `${what} exceeds the environment value bound`);
  }
}

/** A `commandExecutor` whose child runs under a declared isolation profile:
 * scrubbed environment, fixed working directory, and OS-applied resource
 * limits. The digest inputs record the platform's enforcement truth per
 * knob, so an identity only ever claims what the OS actually enforces.
 * Replay-safety and failure shapes are `commandJson`'s own: a limit-killed
 * child exits by signal (recorded EFFECT_FAILED, uncertain), a timeout is
 * BUDGET_EXHAUSTED, and recorded receipts replay without respawning. */
export function isolatedCommandExecutor(
  command: string,
  opts: {
    timeoutMs?: number;
    maxStdoutBytes?: number;
    isolation: CommandIsolation;
  },
): Executor {
  const resolved = resolveIsolation(opts.isolation);
  const argv = [...resolved.wrapperArgv, command];
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const configurationDigest = digestCanonical({
    argv,
    cwd: resolved.cwd,
    isolation: resolved.descriptor,
    kind: "command",
    timeoutMs,
  } as JsonValue);
  const options: JsonObject = {};
  if (opts.timeoutMs !== undefined) options.timeoutMs = opts.timeoutMs;
  if (opts.maxStdoutBytes !== undefined) options.maxStdoutBytes = opts.maxStdoutBytes;
  const identity = digestCanonical({
    command,
    isolation: resolved.descriptor,
    options,
  } as JsonValue);
  return {
    id: `cmd:${identity}`,
    capabilities: { effects: EFFECT_KINDS },
    cacheIdentity: identity,
    cacheable: false,
    retryable: false,
    receiptFor: () => ({ configurationDigest }),
    execute: async (request, signal) => {
      const env = { ...resolved.env };
      for (const name of resolved.envInherit) {
        const value = process.env[name];
        if (value === undefined) continue;
        if (utf8Length(value) > ISOLATION_BOUNDS.maxEnvValueBytes || value.includes("\0")) {
          throw new AlgalError(
            "EFFECT_FAILED",
            `isolation env "${name}" exceeds the value bound`,
          );
        }
        env[name] = value;
      }
      return commandJson(argv, request as unknown as JsonValue, {
        ...(opts.timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(opts.maxStdoutBytes !== undefined ? { maxStdoutBytes: opts.maxStdoutBytes } : {}),
        cwd: resolved.cwd,
        env,
        ...(signal ? { signal } : {}),
      });
    },
  };
}
