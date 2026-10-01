import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { connect as connectTls } from "node:tls";

/**
 * Aggregate run telemetry. One bounded POST per CLI invocation reports the
 * product name, version, and an allowlisted command family — never free-form
 * arguments, paths, or output. A
 * locally minted install token joins daily-active counts; it is not synced
 * and carries no account identity. HRANESS_TELEMETRY=off or
 * ALGAL_TELEMETRY=off disables it entirely.
 *
 * The request rides an unref'd TLS socket: telemetry never holds the process
 * open, never delays an exit, and never changes a command's output or exit
 * status. A drop is acceptable — the signal is aggregate.
 */
const TELEMETRY_HOST = "account.hraness.com";
const TELEMETRY_PATH = "/api/telemetry/cli";
const TELEMETRY_TIMEOUT_MS = 1_500;
const INSTALL_TOKEN_PATTERN = /^[a-f0-9]{32}$/u;

function telemetryDisabled(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return environment.HRANESS_TELEMETRY === "off"
    || environment.ALGAL_TELEMETRY === "off";
}

async function installToken(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string | null> {
  const xdg = environment.XDG_CONFIG_HOME;
  const directory = typeof xdg === "string" && xdg.length > 0
      && xdg.length < 512 && xdg.startsWith("/")
    ? join(xdg, "hraness")
    : join(homedir(), ".config", "hraness");
  const path = join(directory, "telemetry-install");
  try {
    const existing = (await readFile(path, "utf8")).trim();
    if (INSTALL_TOKEN_PATTERN.test(existing)) return existing;
  } catch { void 0; }
  const token = randomUUID().replaceAll("-", "");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path, `${token}\n`, { mode: 0o600 });
    return token;
  } catch {
    return null;
  }
}

function sendTelemetryPost(body: string): void {
  try {
    const socket = connectTls({
      host: TELEMETRY_HOST,
      port: 443,
      servername: TELEMETRY_HOST,
    });
    socket.unref();
    socket.setTimeout(TELEMETRY_TIMEOUT_MS, () => socket.destroy());
    socket.on("secureConnect", () => {
      socket.write(
        `POST ${TELEMETRY_PATH} HTTP/1.1\r\n`
        + `host: ${TELEMETRY_HOST}\r\n`
        + "content-type: application/json\r\n"
        + `content-length: ${Buffer.byteLength(body)}\r\n`
        + "connection: close\r\n\r\n"
        + body,
      );
    });
    socket.on("data", () => socket.destroy());
    socket.on("error", () => socket.destroy());
    socket.on("close", () => socket.destroy());
  } catch { void 0; }
}

const COMMAND_FAMILIES: ReadonlySet<string> = new Set([
  "compile", "fmt", "diagram", "diagnose", "dependencies", "envelope",
  "lock", "vendor", "examples", "example", "run", "check", "explain",
  "verify", "resume", "replay", "ordering", "process", "job", "repair",
  "shepherd", "inspect", "runs", "observe", "digest", "diff", "store",
  "manifests", "manifest", "slots", "slot", "mailbox", "pack", "unpack",
  "application", "library", "experiment", "suite", "index", "search",
  "auth", "doctor", "foundry", "bench", "task", "call", "tool-def", "tail", "db",
]);

/** Unknown arguments never become telemetry, even when they look like words. */
export function telemetryCommandFamily(rawArguments: readonly string[]): string | undefined {
  const command = rawArguments[0];
  return typeof command === "string" && COMMAND_FAMILIES.has(command)
    ? command
    : undefined;
}

export async function reportAlgalCliRun(
  version: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  rawArguments: readonly string[] = [],
): Promise<void> {
  if (telemetryDisabled(environment)) return;
  try {
    const install = await installToken(environment);
    const command = telemetryCommandFamily(rawArguments);
    sendTelemetryPost(JSON.stringify({
      cli: "algal",
      ...(install === null ? {} : { install }),
      ...(command === undefined ? {} : { command }),
      v: 1,
      version,
    }));
  } catch { void 0; }
}
