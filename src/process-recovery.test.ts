import { afterEach, describe, expect, test } from "bun:test";
import { appendFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { AlgalError } from "./errors";
import { ProcessSupervisor } from "./process";
import type { ToolRegistry } from "./tools";
import { asObject } from "./values";

const directories: string[] = [];
const children: Bun.Subprocess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) { if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});
const configurationDigest = digestCanonical({ adapter: "recovery-test-v1" });
const signature = { inputs: {}, outputs: { value: { type: "text" as const } }, cost: 1, maxOutputBytes: 1000 };
async function scenario(effect: "read" | "write") {
  const dir = await mkdtemp(join(tmpdir(), "algal-process-recovery-")); directories.push(dir);
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:recovery-test", name: "Recovery test",
    cells: [{ id: "prefix", kind: "tool", tool: "prefix.v1" }, { id: "pending", kind: "tool", tool: "pending.v1" }],
  });
  let pendingCalls = 0;
  const tools: ToolRegistry = new Map([
    ["prefix.v1", { signature: { ...signature, effect: "write" }, configurationDigest,
      tool: async () => { await appendFile(join(dir, "writes.txt"), "write\n"); return { value: "saved" }; } }],
    ["pending.v1", { signature: { ...signature, effect }, configurationDigest,
      tool: async () => { pendingCalls++; return { value: "recovered" }; } }],
  ]);
  const supervisor = new ProcessSupervisor(dir, { tools, journal: true });
  await supervisor.create("actor", manifest);
  const child = Bun.spawn([process.execPath, "--eval", `
    import {ProcessSupervisor} from ${JSON.stringify(join(import.meta.dir, "process.ts"))};
    import {appendFile} from "node:fs/promises";
    const tools = new Map([
      ["prefix.v1", {signature: {...${JSON.stringify(signature)}, effect:"write"}, configurationDigest:${JSON.stringify(configurationDigest)},
        tool:async()=>{await appendFile(${JSON.stringify(join(dir, "writes.txt"))},"write\\n");return {value:"saved"};}}],
      ["pending.v1", {signature: {...${JSON.stringify(signature)}, effect:${JSON.stringify(effect)}}, configurationDigest:${JSON.stringify(configurationDigest)},
        tool:async()=>{console.log("ready");setInterval(()=>{},1000);return await new Promise(()=>{});}}]
    ]);
    await new ProcessSupervisor(${JSON.stringify(dir)}, {tools,journal:true}).tick("actor");
  `], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  children.push(child);
  const reader = child.stdout.getReader();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("child did not enter pending effect")), 5_000); }),
    ]);
    if (!new TextDecoder().decode(result.value).includes("ready")) {
      throw new Error(`child failed: ${await new Response(child.stderr).text()}`);
    }
  } finally { if (timeout !== undefined) clearTimeout(timeout); reader.releaseLock(); }
  child.kill("SIGKILL"); await child.exited;
  const uncertain = await supervisor.inspect("actor");
  expect(uncertain.process.status).toBe("uncertain");
  expect(await readFile(join(dir, "writes.txt"), "utf8")).toBe("write\n");
  return { dir, supervisor, tools, uncertain, pendingCalls: () => pendingCalls };
}

describe("supervisor recovery after real process death", () => {
  test("completed write prefix is skipped while one pending read is explicitly retried", async () => {
    const { dir, tools, uncertain, pendingCalls } = await scenario("read");
    const restored = new ProcessSupervisor(dir, { tools, journal: true });
    expect(await restored.schedule()).toEqual({ ticks: 0, processes: [] });
    const complete = await restored.recover("actor", uncertain.digest);
    expect(complete.process.status).toBe("complete");
    expect(complete.process.generation).toBe(1);
    expect(pendingCalls()).toBe(1);
    expect(await readFile(join(dir, "writes.txt"), "utf8")).toBe("write\n");
    expect(await readdir(join(dir, "processes", "actor", "owners"))).toHaveLength(1);
    expect(await restored.verify("actor")).toMatchObject({ ok: true, generations: 1, receipts: 1 });
    const report = asObject(await restored.journal("actor"), "journal");
    const effects = report.effects as { record: { state: string; attempt: number; recovery: string } }[];
    expect(effects.map((item) => [item.record.state, item.record.attempt, item.record.recovery])).toEqual([
      ["completed", 0, "never"], ["completed", 1, "read"],
    ]);
  });

  test("a pending write is refused without replaying even the completed prefix", async () => {
    const { dir, supervisor, uncertain, pendingCalls } = await scenario("write");
    await expect(supervisor.recover("actor", uncertain.digest)).rejects.toThrow("unknown completion");
    expect(pendingCalls()).toBe(0);
    expect((await supervisor.inspect("actor")).digest).toBe(uncertain.digest);
    expect(await readFile(join(dir, "writes.txt"), "utf8")).toBe("write\n");
  });

  test("recovery binds the exact uncertain intent and original adapter configuration", async () => {
    const { dir, tools, supervisor, uncertain, pendingCalls } = await scenario("read");
    await expect(supervisor.recover("actor", digestCanonical("another-intent"))).rejects.toThrow("exact current uncertain intent");
    tools.get("prefix.v1")!.configurationDigest = digestCanonical({ adapter: "changed" });
    await expect(new ProcessSupervisor(dir, { tools, journal: true }).recover("actor", uncertain.digest)).rejects.toThrow("configuration/order changed");
    expect(pendingCalls()).toBe(0);
    expect(await readFile(join(dir, "writes.txt"), "utf8")).toBe("write\n");
  });
});

test("journal inspection selects the latest dispatch after a suspended generation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-process-journal-latest-")); directories.push(dir);
  let attempts = 0;
  const supervisor = new ProcessSupervisor(dir, { journal: true, executors: [{
    id: "provider", cacheIdentity: configurationDigest,
    execute: async () => { if (++attempts === 1) throw new AlgalError("EFFECT_SUSPENDED", "waiting"); return "done"; },
  }] });
  await supervisor.create("actor", parseOrganismManifest({
    contract: "algal.organism.v1", key: "organism:latest-journal", name: "Latest journal",
    cells: [{ id: "agent", kind: "agent", prompt: "Wait", output: { kind: "text" } }],
  }));
  expect((await supervisor.tick("actor"))?.process.status).toBe("suspended");
  const completed = await supervisor.tick("actor");
  expect(completed?.process.status).toBe("complete");
  const report = asObject(await supervisor.journal("actor"), "journal");
  expect(asObject(report.header, "header").intent).toBe(completed?.process.previous);
  expect(report.effects).toHaveLength(1);
});
