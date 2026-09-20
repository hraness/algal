import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseOrganismManifest } from "./contract";
import { ProcessSupervisor } from "./process";
import { boundedBytes } from "./io";

const cliPath = resolve(import.meta.dir, "../cli.ts");
async function cli(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, cliPath, ...args], {cwd, stdout: "pipe", stderr: "pipe", timeout: 10_000});
  try {
    const [code, stdout, stderr] = await Promise.all([child.exited,
      boundedBytes(child.stdout, 1_048_576, "CLI stdout"), boundedBytes(child.stderr, 65_536, "CLI stderr")]);
    return {code, stdout: new TextDecoder().decode(stdout), stderr: new TextDecoder().decode(stderr)};
  } finally { child.kill("SIGKILL"); await child.exited; }
}

test("evidence CLI exports declarations without opening executors, then verifies without a store", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-evidence-cli-"));
  try {
    const store = join(directory, "store"), offline = join(directory, "offline");
    await mkdir(offline);
    const signature = {inputs: {}, outputs: {answer: {type: "json" as const}}, effect: "write" as const, cost: 1, maxOutputBytes: 1024};
    const supervisor = new ProcessSupervisor(store, {tools: new Map([["fixture.answer", {signature, tool: async () => ({answer: 42})}]])});
    await supervisor.create("portable", parseOrganismManifest({contract: "algal.organism.v1", key: "organism:portable", name: "Portable evidence",
      cells: [{id: "answer", kind: "tool", tool: "fixture.answer"}], edges: []}), {});
    const complete = await supervisor.tick("portable");
    expect(complete?.process.status).toBe("complete");
    const tools = join(directory, "tools.json");
    await writeFile(tools, JSON.stringify({"fixture.answer": {signature, exec: "scripted:does-not-exist.json"}}));
    const exported = await cli(offline, "process", "export", "portable", "--dir", store, "--tools", tools);
    expect({code: exported.code, stderr: exported.stderr}).toEqual({code: 0, stderr: ""});
    const evidence = JSON.parse(exported.stdout);
    expect(evidence.tools["fixture.answer"]).toEqual(signature);
    expect(exported.stdout).not.toContain("does-not-exist");
    const file = join(directory, "evidence.json"); await writeFile(file, exported.stdout);
    await rename(store, join(directory, "moved-store"));
    const verified = await cli(offline, "process", "verify-evidence", file);
    expect({code: verified.code, stderr: verified.stderr}).toEqual({code: 0, stderr: ""});
    expect(JSON.parse(verified.stdout)).toMatchObject({ok: true, digest: complete!.digest, status: "complete", generations: 1, receipts: 1});
    for (const flag of ["--dir", "--tools", "--modules", "--transports", "--executor-cmd", "--journal"]) {
      const rejected = await cli(offline, "process", "verify-evidence", file, flag, "must-not-be-read");
      expect(rejected.code).not.toBe(0);
      expect(rejected.stderr).toContain("accepts no host flags");
    }
    expect(await readdir(offline)).toEqual([]);
  } finally { await rm(directory, {recursive: true, force: true}); }
});
