import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repo = resolve(import.meta.dir, "..");
const live = process.argv.slice(2).includes("--live");
const model = process.env.GATEWAY_MODEL ?? "alibaba/qwen3.7-flash";

const goalsPath = "examples/civ/goals.json";
const habitat = "examples/habitat/live.morphogen.json";
const fallbackResponses = "examples/habitat/live.responses.json";
const dir = ".morphogen/civ";
const outDir = "civ";

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

const dirFull = resolve(repo, dir);
const outDirFull = resolve(repo, outDir);
await rm(dirFull, { recursive: true, force: true });
await mkdir(dirFull, { recursive: true });
await mkdir(outDirFull, { recursive: true });

const goals = JSON.parse(await Bun.file(resolve(repo, goalsPath)).text()) as string[];
const population: string[] = [];

for (const [i, goal] of goals.entries()) {
  console.log(`\n[goal ${i}] ${goal}`);
  const args = { goal: { text: goal } };
  const argsFile = resolve(dirFull, `goal-${i}-args.json`);
  await writeFile(argsFile, JSON.stringify(args));

  const runArgs = [
    "bun",
    "cli.ts",
    "run",
    habitat,
    "--args",
    argsFile,
    "--dir",
    dir,
    "--write",
  ];
  if (live) {
    runArgs.push("--gateway-model", model);
  } else {
    runArgs.push("--responses", fallbackResponses);
  }

  const runRes = await runCmd(runArgs);
  if (runRes.exitCode !== 0) {
    console.error(`  goal ${i} run failed`);
    console.error(runRes.stderr);
    continue;
  }

  const receipt = JSON.parse(runRes.stdout);
  const child = receipt.cells.run.outputs.digest as string;
  if (!child || typeof child !== "string") {
    console.error(`  goal ${i} produced no child`);
    continue;
  }
  console.log(`  child  ${child}`);

  const manifestRes = await runCmd(["bun", "cli.ts", "manifest", child, "--dir", dir]);
  if (manifestRes.exitCode !== 0) {
    console.error(`  goal ${i} could not retrieve manifest`);
    console.error(manifestRes.stderr);
    continue;
  }

  const childFile = resolve(dirFull, `goal-${i}-child.json`);
  await writeFile(childFile, manifestRes.stdout);

  const packRes = await runCmd([
    "bun",
    "cli.ts",
    "pack",
    childFile,
    "--out",
    outDir,
    "--dir",
    dir,
  ]);
  if (packRes.exitCode !== 0) {
    console.error(`  goal ${i} pack failed`);
    console.error(packRes.stderr);
    continue;
  }

  const bundle = JSON.parse(packRes.stdout);
  console.log(`  bundle ${bundle.root}`);
  population.push(child);
}

await writeFile(
  resolve(outDirFull, "population.json"),
  JSON.stringify(population, null, 2),
);

console.log(`\ncivilization population: ${population.length} organisms`);
for (const [i, d] of population.entries()) {
  console.log(`  ${i}: ${d}`);
}
