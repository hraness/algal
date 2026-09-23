/** Qualify both public endpoint CLIs against one bounded loopback fixture.
 * This tests transport/replay compatibility, not a local model's quality. */
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalize, type JsonValue } from "../src/values";

const root = resolve(import.meta.dir, "..");
const native = process.env.ALGAL_BIN ?? join(root, "target/debug/algal");
const temp = await mkdtemp(join(tmpdir(), "algal-inference-parity-"));
const manifest = join(root, "examples/gateway-smoke.algal.json");
const args = join(root, "examples/gateway-smoke.args.json");
let calls = 0;
let format = "json_schema";
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
  if (request.method !== "POST" || new URL(request.url).pathname !== "/v1/chat/completions" || request.headers.has("authorization"))
    return new Response(null, { status: 400 });
  const body = await request.json() as Record<string, unknown>;
  const responseFormat = body.response_format as { type?: string } | undefined;
  if (body.model !== "local-fixture" || (responseFormat?.type ?? "prompt") !== format)
    return new Response(null, { status: 400 });
  calls++;
  return Response.json({ model: "local-fixture", choices: [{ finish_reason: "stop", message: { content: '{"value":"billing"}' } }],
    usage: { prompt_tokens: 31, completion_tokens: 4 } });
} });
async function invoke(isNative: boolean, argv: string[]): Promise<JsonValue> {
  const child = Bun.spawn(isNative ? [native, ...argv] : [process.execPath, join(root, "cli.ts"), ...argv], {
    cwd: root, stdout: "pipe", stderr: "pipe", env: { ...process.env, AI_GATEWAY_API_KEY: "must-not-leak-to-local", VERCEL_OIDC_TOKEN: "must-not-leak-to-local" },
  });
  const timer = setTimeout(() => child.kill(), 30_000);
  try {
    const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (code !== 0 || child.signalCode !== null) throw new Error(`${isNative ? "native" : "reference"} ${argv[0]} failed: ${err.slice(-2000)}`);
    return JSON.parse(out) as JsonValue;
  } finally { clearTimeout(timer); }
}
try {
  await access(native);
  for (format of ["json_schema", "json_object", "prompt"]) {
    const argv = ["run", manifest, "--args", args, "--base-url", `http://127.0.0.1:${server.port}/v1`, "--model", "local-fixture", "--response-format", format];
    const reference = await invoke(false, argv);
    const compiled = await invoke(true, argv);
    if (canonicalize(reference) !== canonicalize(compiled)) throw new Error(`${format}: native/reference endpoint receipts differ\nreference=${canonicalize(reference)}\nnative=${canonicalize(compiled)}`);
    const receipt = join(temp, `${format}.receipt.json`);
    await writeFile(receipt, canonicalize(reference));
    for (const runtime of [false, true]) {
      const verification = await invoke(runtime, ["verify", receipt, manifest]) as { ok?: boolean };
      if (verification.ok !== true) throw new Error(`${format}: offline verification failed`);
    }
  }
  if (calls !== 6) throw new Error(`expected six fixture calls, got ${calls}`);
  console.log("inference parity: 3 endpoint formats, identical native/reference receipts, 6 offline verifications, no credential forwarding");
} finally { server.stop(true); await rm(temp, { recursive: true, force: true }); }
