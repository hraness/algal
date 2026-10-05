import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
async function cli(args: string[], env: Record<string, string> = {}) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, env: { PATH: process.env.PATH ?? "", HRANESS_TELEMETRY: "off", HRANESS_SUPPORT: "off", ...env }, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

test("Clef CLI documents both models and images, and only checks environment configuration", async () => {
  expect((await cli(["run", "--help"])).stdout).toContain("--clef [clef|clef-flash]");
  expect((await cli(["run", "--help"])).stdout).toContain("--images <file>");
  const status = await cli(["auth", "clef", "--status"], { TYPESAFE_API_KEY: "fake-legacy-token" });
  expect(JSON.parse(status.stdout)).toEqual({ provider: "clef", configured: false });
  const check = await cli(["doctor", "--clef"], { CLOUDFLARE_ACCOUNT_ID: "a".repeat(32), CLOUDFLARE_AUTH_TOKEN: "fake-cloudflare-token" });
  expect(check.code).toBe(0);
  expect(JSON.parse(check.stdout)).toMatchObject({ provider: "clef", configured: true, accountConfigured: true, liveChecked: false });
  expect(check.stdout).not.toContain("fake-cloudflare-token");
  const missing = await cli(["doctor", "--clef"]);
  expect(missing.code).toBe(1);
  expect(JSON.parse(missing.stdout)).toMatchObject({ configured: false, liveChecked: false });
  const save = await cli(["auth", "clef", "--stdin"]);
  expect(save.code).toBe(2);
  expect(save.stderr).toContain("environment-only");
});

test("invalid model and image inputs fail before any Cloudflare request", async () => {
  const home = await mkdtemp(join(tmpdir(), "algal-clef-cli-"));
  try {
    const env = { HOME: home, ALGAL_HOME: home, CLOUDFLARE_ACCOUNT_ID: "a".repeat(32) };
    const common = ["run", "examples/model-router.algal.json", "--args", "examples/model-router.args.json", "--dir", join(home, "store")];
    const invalidModel = await cli([...common, "--clef", "jev-latest"], env);
    expect(invalidModel.code).toBe(2);
    expect(invalidModel.stderr).toContain("clef or clef-flash");
    const images = join(home, "images.json");
    await writeFile(images, JSON.stringify(["https://example.com/private.png"]));
    const invalidImages = await cli([...common, "--clef", "--images", images], env);
    expect(invalidImages.code).not.toBe(0);
    expect(invalidImages.stderr).toContain("embedded PNG");
    const noProvider = await cli([...common, "--images", images], env);
    expect(noProvider.code).toBe(2);
    expect(noProvider.stderr).toContain("requires --clef");
    const mixed = await cli([...common, "--clef", "--jev"], env);
    expect(mixed.code).toBe(2);
    expect(mixed.stderr).toContain("choose one default executor");
  } finally { await rm(home, { recursive: true, force: true }); }
});
