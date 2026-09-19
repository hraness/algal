// Foreground xcb transport. Account custody and provider confinement remain xcb's.
import { AlgalError } from "./errors";
import { boundedBytes } from "./io";
import {
  asInt,
  asObject,
  asString,
  canonicalBytes,
  noUnknownKeys,
  type JsonValue,
} from "./values";
import type { CodingJobTransport } from "./coding-jobs";

export type XcbEnvelope = {
  version: 1;
  session: string;
  state:
    | "idle"
    | "working"
    | "needs_answer"
    | "needs_action"
    | "needs_approval"
    | "limited"
    | "failed"
    | "cancelled"
    | "uncertain";
  outcome: {
    terminal:
      "completed" | "token_limit" | "turn_limit" | "cancelled" | "failed";
    joined: boolean;
    effects: "none" | "settled" | "uncertain";
    pending_attention: boolean;
    failure:
      | "account_quota"
      | "model_quota"
      | "authentication"
      | "policy"
      | "transport"
      | "unknown"
      | null;
  };
  text: string;
};
function member<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T))
    throw new AlgalError("EFFECT_UNPARSEABLE", `invalid xcb ${label}`);
  return value as T;
}
export function parseXcbEnvelope(
  raw: unknown,
  maxBytes = 1_048_576,
): XcbEnvelope {
  const value = asObject(raw, "xcb response");
  noUnknownKeys(
    value,
    ["version", "session", "state", "outcome", "text"],
    "xcb response",
  );
  if (value.version !== 1)
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      "unsupported xcb response version",
    );
  const session = asString(value.session, "xcb session", 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(session))
    throw new AlgalError("EFFECT_UNPARSEABLE", "invalid xcb session");
  const outcome = asObject(value.outcome, "xcb outcome");
  noUnknownKeys(
    outcome,
    ["terminal", "joined", "effects", "pending_attention", "failure"],
    "xcb outcome",
  );
  if (
    typeof outcome.joined !== "boolean" ||
    typeof outcome.pending_attention !== "boolean"
  )
    throw new AlgalError("EFFECT_UNPARSEABLE", "invalid xcb settlement flags");
  const result: XcbEnvelope = {
    version: 1,
    session,
    state: member(
      value.state,
      [
        "idle",
        "working",
        "needs_answer",
        "needs_action",
        "needs_approval",
        "limited",
        "failed",
        "cancelled",
        "uncertain",
      ],
      "state",
    ),
    outcome: {
      terminal: member(
        outcome.terminal,
        ["completed", "token_limit", "turn_limit", "cancelled", "failed"],
        "terminal",
      ),
      joined: outcome.joined,
      effects: member(
        outcome.effects,
        ["none", "settled", "uncertain"],
        "effects",
      ),
      pending_attention: outcome.pending_attention,
      failure:
        outcome.failure === null
          ? null
          : member<NonNullable<XcbEnvelope["outcome"]["failure"]>>(
              outcome.failure,
              [
                "account_quota",
                "model_quota",
                "authentication",
                "policy",
                "transport",
                "unknown",
              ],
              "failure",
            ),
    },
    text: asString(value.text, "xcb text", maxBytes),
  };
  if (canonicalBytes(result as unknown as JsonValue) > maxBytes)
    throw new AlgalError("BUDGET_EXHAUSTED", "xcb response exceeds byte limit");
  return result;
}

/** Bounded argv-only process runner, shared with read-only Git inspection.
 * Killing and joining this direct child does not prove provider descendants or
 * remote work stopped. The job layer retains uncertainty after interruption. */
export async function codingCommand(
  argv: string[],
  options: {
    cwd: string;
    signal: AbortSignal;
    maxOutputBytes: number;
    input?: string;
    timeoutMs?: number;
    cleanGitEnvironment?: boolean;
  },
): Promise<{ exitCode: number; stdout: Uint8Array }> {
  if (
    argv.length < 1 ||
    argv.length > 64 ||
    argv.some(
      (arg, index) =>
        typeof arg !== "string" ||
        (index === 0 && !arg) ||
        arg.length > 4096 ||
        arg.includes("\0"),
    ) ||
    !options.cwd.startsWith("/") ||
    options.cwd.length > 4096
  )
    throw new AlgalError(
      "PARSE_FAILED",
      "invalid coding command argv or workspace",
    );
  asInt(options.maxOutputBytes, "coding command output bound", 1, 1_048_576);
  asInt(options.timeoutMs ?? 30_000, "coding command timeout", 1, 600_000);
  if (options.input !== undefined && Buffer.byteLength(options.input) > 65_536)
    throw new AlgalError(
      "BUDGET_EXHAUSTED",
      "coding command input exceeds byte bound",
    );
  if (options.signal.aborted)
    throw new AlgalError(
      "BUDGET_EXHAUSTED",
      "coding command cancelled before launch",
    );
  const controller = new AbortController();
  const signal = AbortSignal.any([options.signal, controller.signal]);
  const env = { ...process.env };
  if (options.cleanGitEnvironment)
    for (const key of Object.keys(env))
      if (key.startsWith("GIT_")) delete env[key];
  if (options.cleanGitEnvironment) {
    env.GIT_OPTIONAL_LOCKS = "0";
    env.GIT_TERMINAL_PROMPT = "0";
  }
  const child = Bun.spawn(argv, {
    cwd: options.cwd,
    env,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const stop = () => child.kill("SIGKILL");
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30_000,
  );
  try {
    const output = boundedBytes(
      child.stdout,
      options.maxOutputBytes,
      "coding command output",
      signal,
    );
    const diagnostic = boundedBytes(
      child.stderr,
      65_536,
      "coding command diagnostics",
      signal,
    );
    const input = (async () => {
      try {
        if (options.input !== undefined) await child.stdin.write(options.input);
        await child.stdin.end();
        return true;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "EPIPE"
        )
          return false;
        throw new AlgalError(
          "EFFECT_FAILED",
          "coding command input failed; diagnostics withheld",
        );
      }
    })();
    const [stdout, , exitCode, delivered] = await Promise.all([
      output,
      diagnostic,
      child.exited,
      input,
    ]);
    if (child.signalCode !== null)
      throw new AlgalError(
        "EFFECT_FAILED",
        "coding command terminated by signal; completion uncertain",
        undefined,
        { uncertain: true },
      );
    if (signal.aborted)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "coding command cancelled or timed out",
      );
    if (!delivered && exitCode === 0)
      throw new AlgalError(
        "EFFECT_FAILED",
        "coding command closed stdin before input delivery",
      );
    return { exitCode, stdout };
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal.removeEventListener("abort", stop);
    child.kill("SIGKILL");
    await child.exited;
  }
}

export const xcbTransport: CodingJobTransport = async ({ intent, signal }) => {
  const argv = [
    intent.adapter.executable,
    "--json",
    "--cwd",
    intent.workspace,
    "run",
  ];
  if (intent.adapter.account !== undefined)
    argv.push("--account", intent.adapter.account);
  if (intent.adapter.model !== undefined)
    argv.push("--model", intent.adapter.model);
  const result = await codingCommand(argv, {
    cwd: intent.workspace,
    signal,
    input: intent.prompt,
    maxOutputBytes: intent.limits.maxOutputBytes,
    timeoutMs: intent.limits.maxRuntimeMs,
  });
  let envelope: unknown;
  try {
    envelope = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(result.stdout),
    );
  } catch {
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      "xcb returned invalid JSON; diagnostics withheld",
    );
  }
  return {
    exitCode: asInt(result.exitCode, "xcb exit code", 0, 255),
    envelope: parseXcbEnvelope(envelope, intent.limits.maxOutputBytes),
  };
};
