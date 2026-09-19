import { AlgalError } from "./errors";
import {
  GITHUB_BOUNDS,
  type GitHubResponse,
  type GitHubTransport,
} from "./github";
import { boundedBytes } from "./io";
import { canonicalBytes } from "./values";

const MAX_HEADERS = 65_536;
const MAX_DIAGNOSTICS = 65_536;
const MAX_INPUT = 262_144;
export type GitHubCliOptions = {
  executable?: string;
  cwd?: string;
  timeoutMs?: number;
};

function decodeResponse(bytes: Uint8Array, maxBytes: number): GitHubResponse {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const boundary = /\r?\n\r?\n/.exec(text);
  if (!boundary || boundary.index > MAX_HEADERS)
    throw new AlgalError(
      "EFFECT_FAILED",
      "GitHub CLI returned no bounded HTTP response; diagnostics withheld",
    );
  const lines = text.slice(0, boundary.index).split(/\r?\n/);
  const status = /^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s|$)/.exec(
    lines.shift() ?? "",
  );
  if (!status)
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      "GitHub CLI returned an invalid HTTP status",
    );
  const code = Number(status[1]);
  if (code < 100 || code > 599)
    throw new AlgalError(
      "EFFECT_UNPARSEABLE",
      "GitHub CLI returned an invalid HTTP status",
    );
  const headers: Record<string, string> = Object.create(null);
  for (const line of lines) {
    const match = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*(.*)$/.exec(line);
    if (!match)
      throw new AlgalError(
        "EFFECT_UNPARSEABLE",
        "GitHub CLI returned invalid HTTP headers",
      );
    const key = match[1]!.toLowerCase();
    // Only pagination reaches the evidence reader; cookies and authentication
    // headers never leave this custody boundary.
    if (key === "link")
      headers.link = headers.link ? `${headers.link}, ${match[2]}` : match[2]!;
  }
  const payload = text.slice(boundary.index + boundary[0].length);
  if (Buffer.byteLength(payload, "utf8") > maxBytes)
    throw new AlgalError(
      "BUDGET_EXHAUSTED",
      "GitHub CLI response exceeds byte limit",
    );
  let body: unknown = null;
  if (payload.trim()) {
    try {
      body = JSON.parse(payload);
    } catch {
      throw new AlgalError(
        "EFFECT_UNPARSEABLE",
        "GitHub CLI response is not JSON",
      );
    }
  }
  return { status: code, body, headers };
}

/** Authentication remains entirely inside gh. The host chooses the executable;
 * no shell, `gh auth token`, model-selected hostname or credential output exists.
 * HTTP error responses are retained even when gh exits nonzero. */
export function githubCliTransport(
  options: GitHubCliOptions = {},
): GitHubTransport {
  const executable = options.executable ?? "gh";
  const cwd = options.cwd;
  const timeoutMs = options.timeoutMs ?? GITHUB_BOUNDS.timeoutMs;
  if (!executable || executable.length > 4096 || /[\0\r\n]/.test(executable))
    throw new AlgalError("PARSE_FAILED", "invalid host GitHub CLI executable");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000)
    throw new AlgalError("PARSE_FAILED", "invalid GitHub CLI timeout");
  return async (request) => {
    if (request.signal.aborted)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "GitHub CLI request cancelled before launch",
      );
    if (
      !Number.isSafeInteger(request.maxBytes) ||
      request.maxBytes < 1 ||
      request.maxBytes > GITHUB_BOUNDS.maxResponseBytes
    )
      throw new AlgalError("PARSE_FAILED", "invalid GitHub CLI byte limit");
    if (
      !/^\/(?:repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/|graphql$)/.test(
        request.path,
      ) ||
      /[\0\r\n\\#]/.test(request.path) ||
      /(?:^|\/)\.{1,2}(?:\/|$)/.test(request.path) ||
      request.path.length > 4096
    )
      throw new AlgalError("CAPABILITY_DENIED", "GitHub CLI path rejected");
    if (
      !["GET", "POST", "PUT"].includes(request.method) ||
      (request.method === "GET" && request.body !== undefined)
    )
      throw new AlgalError(
        "PARSE_FAILED",
        "invalid GitHub CLI request method/body",
      );
    if (request.body !== undefined && canonicalBytes(request.body) > MAX_INPUT)
      throw new AlgalError(
        "BUDGET_EXHAUSTED",
        "GitHub CLI input exceeds byte limit",
      );
    const argv = [
      executable,
      "api",
      "--hostname",
      "github.com",
      "--include",
      "--method",
      request.method,
      "--header",
      "Accept: application/vnd.github+json",
      "--header",
      "X-GitHub-Api-Version: 2022-11-28",
      ...(request.body !== undefined ? ["--input", "-"] : []),
      request.path,
    ];
    const controller = new AbortController();
    const signal = AbortSignal.any([request.signal, controller.signal]);
    const child = Bun.spawn(argv, {
      ...(cwd !== undefined ? { cwd } : {}),
      env: { ...process.env, GH_PROMPT_DISABLED: "1" },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    const stop = () => {
      child.kill("SIGKILL");
    };
    signal.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const stdout = boundedBytes(
        child.stdout,
        request.maxBytes + MAX_HEADERS,
        "GitHub CLI output",
        signal,
      );
      const stderr = boundedBytes(
        child.stderr,
        MAX_DIAGNOSTICS,
        "GitHub CLI diagnostics",
        signal,
      );
      if (request.body !== undefined)
        child.stdin.write(JSON.stringify(request.body));
      child.stdin.end();
      const [bytes] = await Promise.all([stdout, stderr, child.exited]);
      if (signal.aborted)
        throw new AlgalError(
          "BUDGET_EXHAUSTED",
          "GitHub CLI request cancelled or timed out",
        );
      return decodeResponse(bytes, request.maxBytes);
    } finally {
      clearTimeout(timer);
      controller.abort();
      signal.removeEventListener("abort", stop);
      child.kill("SIGKILL");
      await child.exited;
    }
  };
}
