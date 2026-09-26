import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Aggregate run telemetry. One bounded POST per CLI invocation reports the
 * product name and version only — never arguments, paths, or output. A
 * locally minted install token joins daily-active counts; it is not synced
 * and carries no account identity. HRANESS_TELEMETRY=off or
 * ALGAL_TELEMETRY=off disables it entirely. Failures are swallowed and the
 * exit path races the ping against a short deadline: telemetry never affects
 * a command's work, output, or exit status.
 */
const ALGAL_TELEMETRY_URL =
  "https://account.hraness.com/api/telemetry/cli";
export const TELEMETRY_TIMEOUT_MS = 1_500;
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
  } catch {}
  const token = randomUUID().replaceAll("-", "");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path, `${token}\n`, { mode: 0o600 });
    return token;
  } catch {
    return null;
  }
}

export function reportAlgalCliRun(
  version: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  if (telemetryDisabled(environment)) return Promise.resolve();
  return (async () => {
    try {
      const install = await installToken(environment);
      await fetch(ALGAL_TELEMETRY_URL, {
        body: JSON.stringify({
          cli: "algal",
          ...(install === null ? {} : { install }),
          v: 1,
          version,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS),
      });
    } catch {}
  })();
}
