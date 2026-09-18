import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repo = resolve(import.meta.dir, "../..");
const manifestPath = "examples/habitat/live.algal.json";
const argsPath = "examples/habitat/live.args.json";
const responsesPath = "examples/habitat/live.responses.json";
const fallbackPath = "examples/habitat/fallback.algal.json";
const dir = ".algal/habitat-live";
const promotedDir = "promoted";

const live = process.argv.slice(2).includes("--live");
const model = process.env.GATEWAY_MODEL ?? "alibaba/qwen3.7-flash";

async function runCmd(
  cmd: string[],
  opts?: { cwd?: string },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    cwd: opts?.cwd ?? repo,
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode: code ?? 0 };
}

async function pack(file: string, storeDir: string): Promise<string> {
  const res = await runCmd(["bun", "cli.ts", "pack", file, "--dir", storeDir]);
  if (res.exitCode !== 0) {
    throw new Error(`pack failed: ${res.stderr || res.stdout}`);
  }
  const bundle = JSON.parse(res.stdout);
  return bundle.root as string;
}

const dirFull = resolve(repo, dir);
await rm(dirFull, { recursive: true, force: true });
await mkdir(dirFull, { recursive: true });

const fallbackDigest = await pack(fallbackPath, dir);
console.log(`fallback digest  ${fallbackDigest}`);

const runCmdArgs = [
  "bun",
  "cli.ts",
  "run",
  manifestPath,
  "--args",
  argsPath,
  "--dir",
  dir,
  "--write",
];

if (live) {
  runCmdArgs.push("--gateway-model", model);
} else {
  runCmdArgs.push("--responses", responsesPath);
}

const runRes = await runCmd(runCmdArgs);

if (runRes.exitCode !== 0) {
  console.error("habitat run failed");
  console.error(runRes.stderr);
  process.exit(1);
}

const receipt = JSON.parse(runRes.stdout);
const childDigest = receipt.cells.run.outputs.digest as string;
console.log(`proposed child    ${childDigest}`);

if (childDigest === fallbackDigest) {
  console.log("rejected: proposal fell back to the default child");
  process.exit(0);
}

const manifestRes = await runCmd([
  "bun",
  "cli.ts",
  "manifest",
  childDigest,
  "--dir",
  dir,
]);
if (manifestRes.exitCode !== 0) {
  console.error("could not retrieve child manifest");
  console.error(manifestRes.stderr);
  process.exit(1);
}

const childPath = resolve(dirFull, "child.json");
await writeFile(childPath, manifestRes.stdout);

const promotedFull = resolve(repo, promotedDir);
await mkdir(promotedFull, { recursive: true });

const packRes = await runCmd([
  "bun",
  "cli.ts",
  "pack",
  childPath,
  "--out",
  promotedDir,
  "--dir",
  dir,
]);
if (packRes.exitCode !== 0) {
  console.error("pack child failed");
  console.error(packRes.stderr);
  process.exit(1);
}

const bundle = JSON.parse(packRes.stdout);
console.log(`promoted bundle   ${bundle.root}`);
console.log(`wrote ${promotedDir}/${bundle.root.slice("sha256:".length)}.bundle.json`);
