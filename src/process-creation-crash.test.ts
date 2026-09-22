import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { ProcessSupervisor } from "./process";

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

const body = {
  contract: "algal.organism.v1", key: "organism:creation-crash", name: "Creation crash",
  cells: [{ id: "input", kind: "input", outputs: { value: "json" } }], edges: [],
};
const args = { input: { value: "preserved" } };

test("SIGKILL before a process head publishes preserves exact creation recovery", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-process-creation-crash-"));
  directories.push(directory);
  const child = Bun.spawn([process.execPath, "--eval", `
    import { ProcessSupervisor } from ${JSON.stringify(new URL("./process.ts", import.meta.url).href)};
    import { parseOrganismManifest } from ${JSON.stringify(new URL("./contract.ts", import.meta.url).href)};
    const supervisor = new ProcessSupervisor(${JSON.stringify(directory)}, { tools: new Map() });
    // This test seam runs after the synced creation marker, before the first
    // manifest publication. No production crash hook or sleep is necessary.
    supervisor.publish = async () => {
      const held = new Promise(resolve => {
        process.stdin.once("data", resolve);
        process.stdin.resume();
      });
      await Bun.write(Bun.stdout, "creation-retained\\n");
      await held;
    };
    await supervisor.create("interrupted", parseOrganismManifest(${JSON.stringify(body)}), ${JSON.stringify(args)}, 3);
  `], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const stderr = new Response(child.stderr).text();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Creation crash fixture timed out")); }, 10_000);
  });
  try {
    const reader = child.stdout.getReader();
    const ready = await Promise.race([reader.read(), deadline]);
    expect(new TextDecoder().decode(ready.value)).toBe("creation-retained\n");
    reader.releaseLock();
    const path = join(directory, "processes", "interrupted");
    const marker = await readFile(join(path, ".creating.json"), "utf8");
    expect(JSON.parse(marker)).toMatchObject({ contract: "algal.process-creation.v1", name: "interrupted" });
    await expect(stat(join(path, "head.json"))).rejects.toMatchObject({ code: "ENOENT" });
    const supervisor = new ProcessSupervisor(directory, { tools: new Map() });
    const manifest = parseOrganismManifest(body);
    await expect(supervisor.create("interrupted", manifest, args, 3)).rejects.toThrow();
    expect(await readFile(join(path, ".creating.json"), "utf8")).toBe(marker);
    child.kill("SIGKILL");
    await Promise.race([child.exited, deadline]);
    expect(child.signalCode).toBe("SIGKILL");
    expect(await stderr).toBe("");

    await expect(supervisor.create("interrupted", manifest, { input: { value: "different" } }, 3)).rejects.toThrow();
    expect(await readFile(join(path, ".creating.json"), "utf8")).toBe(marker);
    const resumed = await supervisor.create("interrupted", manifest, args, 3);
    expect(resumed.process).toMatchObject({ name: "interrupted", status: "ready", generation: 0, maxGenerations: 3, args });
    expect(await supervisor.inspect("interrupted")).toEqual(resumed);
    expect((await supervisor.list()).map(state => state.process.name)).toEqual(["interrupted"]);
    await expect(stat(join(path, ".creating.json"))).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await child.exited;
    await stderr;
  }
}, 15_000);

test("legacy process creation lock remains fail-closed and byte-for-byte preserved", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-process-creation-legacy-"));
  directories.push(directory);
  const path = join(directory, "processes");
  await mkdir(path);
  const lock = "algal process lease\n";
  await writeFile(join(path, ".lock"), lock);
  const supervisor = new ProcessSupervisor(directory, { tools: new Map() });
  await expect(supervisor.create("retained", parseOrganismManifest(body), args, 3)).rejects.toThrow();
  expect(await readFile(join(path, ".lock"), "utf8")).toBe(lock);
  expect(await readdir(path)).toEqual([".lock"]);
});
