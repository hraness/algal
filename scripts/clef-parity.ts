import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { clefFixture, fixture } from "./clef-fixture";
import { canonicalize } from "../src/values";

const root = resolve(import.meta.dir, "..");
const binary = resolve(root, "target/debug/examples/clef_parity");
const native = resolve(root, "target/debug/algal");
const env = { PATH: process.env.PATH ?? "", CLOUDFLARE_ACCOUNT_ID: fixture.accountId, HRANESS_TELEMETRY: "off", HRANESS_SUPPORT: "off", ALGAL_NO_UPDATE: "1" };
async function command(argv: string[]) {
  const child = Bun.spawn(argv, { cwd: root, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}
const expected = canonicalize(await clefFixture());
const result = await command([binary]);
if (result.code !== 0) throw new Error(`native Clef fixture failed: ${result.stderr}`);
const actual = canonicalize(JSON.parse(result.stdout));
if (expected !== actual) {
  const reference = JSON.parse(expected), compiled = JSON.parse(actual);
  for (let i = 0; i < reference.cases.length; i++) {
    if (canonicalize(reference.cases[i]) !== canonicalize(compiled.cases[i])) throw new Error(`Clef parity mismatch in ${reference.cases[i].name}: Bun ${canonicalize(reference.cases[i])}; native ${canonicalize(compiled.cases[i])}`);
  }
  throw new Error("Clef invalid-image parity mismatch");
}

function pngOfSize(size: number) {
  const image = fixture.images[0] as { content_type: "image/png"; base64: string };
  const seed = Buffer.from(image.base64, "base64"), filler = Buffer.alloc(size - seed.length);
  filler.writeUInt32BE(filler.length - 12, 0); filler.write("paDd", 4);
  let crc = 0xffffffff;
  for (const byte of filler.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  filler.writeUInt32BE((crc ^ 0xffffffff) >>> 0, filler.length - 4);
  return { ...image, base64: Buffer.concat([seed.subarray(0, 33), filler, seed.subarray(33)]).toString("base64") };
}
const directory = await mkdtemp(join(tmpdir(), "algal-clef-parity-"));
let cliChecks = 0;
try {
  const args = join(directory, "args.json"), images = join(directory, "images.json"), host = join(directory, "host.json");
  await writeFile(args, JSON.stringify({ src: { value: "alpha" } }));
  const large = pngOfSize(4 * 1024 * 1024);
  const runtimes = [[process.execPath, "cli.ts"], [native, "--no-update"]];
  for (const runtime of runtimes) {
    const base = [...runtime, "run", "examples/foundry-constant.algal.json", "--args", args, "--dir", join(directory, "store")];
    for (const [value, accepted] of [
      [[large, large], true],
      [[large, large, fixture.images[0]], false],
      [[pngOfSize(4 * 1024 * 1024 + 1)], false],
      [Array(5).fill(fixture.images[0]), false],
    ] as const) {
      await writeFile(images, JSON.stringify(value));
      const output = await command([...base, "--clef", "--images", images]);
      if ((output.code === 0) !== accepted) throw new Error(`Clef image CLI capacity failed (${runtime[0]}, accepted=${accepted}): ${output.stderr} ${output.stdout}`);
      cliChecks++;
    }
    await writeFile(images, " ".repeat(13 * 1024 * 1024 + 1));
    if ((await command([...base, "--clef", "--images", images])).code === 0) throw new Error("oversized image JSON file accepted");
    cliChecks++;
  }
  const config = (value: unknown) => ({ contract: "algal.host.v1", executors: { clef: { kind: "clef", accountId: fixture.accountId, images: value } } });
  const base = [native, "--no-update", "run", "examples/foundry-constant.algal.json", "--args", args, "--dir", join(directory, "store"), "--host", host];
  await writeFile(host, JSON.stringify(config([fixture.images[0]])));
  if ((await command(base)).code !== 0) throw new Error("small inline Clef host image rejected");
  cliChecks++;
  await writeFile(host, JSON.stringify(config([large])));
  const rejected = await command(base);
  if (rejected.code === 0 || !rejected.stderr.includes("bytes")) throw new Error(`1 MiB host limit not preserved: ${rejected.stderr}`);
  cliChecks++;
} finally { await rm(directory, { recursive: true, force: true }); }
console.log(`Clef offline parity: ${fixture.cases.length} request/parser/cache/receipt/replay cases, ${fixture.invalidImages.length} invalid image cases, ${cliChecks} CLI capacity checks passed; no provider calls or credentials.`);
