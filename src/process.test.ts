import { afterEach, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  manifestToJson,
  parseOrganismManifest,
  type OrganismManifest,
} from "./contract";
import { digestCanonical } from "./digest";
import {
  FileMailboxService,
  mailboxToolRegistry,
  externalWakeKey,
} from "./mailbox";
import { ProcessSupervisor, parseProcessRecord } from "./process";
import type { ToolRegistry } from "./tools";

const dirs: string[] = [];
async function directory() {
  const d = await mkdtemp(join(tmpdir(), "algal-process-test-"));
  dirs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});
function receiver(): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:vm-test",
    name: "VM wait",
    cells: [
      {
        id: "src",
        kind: "input",
        outputs: { inbox: { type: "cap", capability: "mailbox-receive" } },
      },
      { id: "wait", kind: "tool", tool: "mailbox.receive.v1" },
    ],
    edges: [
      {
        from: { cell: "src", port: "inbox" },
        to: { cell: "wait", port: "mailbox" },
      },
    ],
  });
}
function custom(tool: string): OrganismManifest {
  return parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:vm-custom",
    name: "VM host effect",
    cells: [{ id: "work", kind: "tool", tool }],
    edges: [],
  });
}
const signature = {
  inputs: {},
  outputs: {},
  effect: "write" as const,
  cost: 1,
  maxOutputBytes: 100,
};

test("durable generations wake once across supervisor restart and verify offline", async () => {
  const dir = await directory();
  const mailbox = new FileMailboxService(dir);
  const box = await mailbox.create("inbox");
  const first = new ProcessSupervisor(dir);
  const admission = await first.create("actor", receiver(), {
    src: { inbox: box.receive },
  });
  expect(admission.process.status).toBe("ready");
  const paused = await first.tick("actor");
  expect(paused?.process.status).toBe("suspended");
  expect(paused?.process.wake).toEqual([box.receive]);
  const restarted = new ProcessSupervisor(dir);
  expect(await restarted.schedule()).toEqual({ ticks: 0, processes: [] });
  expect((await restarted.inspect("actor")).digest).toBe(paused!.digest);
  const key = externalWakeKey();
  await mailbox.send(box.send, { approve: true }, key);
  const report = await restarted.schedule();
  expect(report.ticks).toBe(1);
  expect(report.processes[0]!.process.status).toBe("complete");
  await mailbox.send(box.send, { approve: true }, key);
  expect(await mailbox.hasPending(box.receive)).toBe(false);
  expect(await restarted.schedule()).toEqual({ ticks: 0, processes: [] });
  // A verifier cannot call a live mailbox driver, even for the old suspension.
  const forbidden = mailboxToolRegistry(mailbox);
  for (const entry of forbidden.values())
    entry.tool = async () => {
      throw new Error("live mailbox reached in verification");
    };
  expect(
    await new ProcessSupervisor(dir, { tools: forbidden }).verify("actor"),
  ).toMatchObject({ ok: true, generations: 2, receipts: 2 });
  await expect(restarted.tick("actor")).rejects.toMatchObject({
    code: "IO_FAILED",
  });
});

test("two identical processes retain distinct effect identities", async () => {
  const dir = await directory();
  const mailbox = new FileMailboxService(dir);
  const box = await mailbox.create("outbox");
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:vm-send",
    name: "Send",
    cells: [
      {
        id: "src",
        kind: "input",
        outputs: {
          out: { type: "cap", capability: "mailbox-send" },
          message: { type: "json" },
        },
      },
      { id: "send", kind: "tool", tool: "mailbox.send.v1" },
    ],
    edges: [
      {
        from: { cell: "src", port: "out" },
        to: { cell: "send", port: "mailbox" },
      },
      {
        from: { cell: "src", port: "message" },
        to: { cell: "send", port: "message" },
      },
    ],
  });
  const vm = new ProcessSupervisor(dir);
  const args = { src: { out: box.send, message: "same" } };
  await vm.create("one", manifest, args);
  await vm.create("two", manifest, args);
  expect((await vm.schedule()).ticks).toBe(2);
  const one = await mailbox.receive(box.receive);
  const two = await mailbox.receive(box.receive);
  expect(one.id).not.toBe(two.id);
  expect(one.message).toBe(two.message);
  expect((await vm.verify("one")).ok).toBe(true);
  expect((await vm.verify("two")).ok).toBe(true);
});

test("generation bounds, revoked wake and identity reuse fail closed", async () => {
  const dir = await directory();
  const mailbox = new FileMailboxService(dir);
  const box = await mailbox.create("inbox");
  const vm = new ProcessSupervisor(dir);
  const args = { src: { inbox: box.receive } };
  await vm.create("bounded", receiver(), args, 1);
  await vm.tick("bounded");
  await expect(vm.tick("bounded")).rejects.toMatchObject({
    code: "BUDGET_EXHAUSTED",
  });
  await expect(vm.create("bounded", receiver(), args)).rejects.toThrow();
  await vm.create("revoked", receiver(), args);
  await vm.tick("revoked");
  await mailbox.revoke(box.receive);
  await expect(vm.schedule()).rejects.toMatchObject({
    code: "CAPABILITY_DENIED",
  });
  expect((await vm.inspect("revoked")).process.generation).toBe(1);
  await expect(vm.create("../escape", receiver(), args)).rejects.toThrow();
  const linked = await directory();
  await symlink(dir, join(linked, "processes"));
  await expect(new ProcessSupervisor(linked).list()).rejects.toMatchObject({
    code: "IO_FAILED",
  });
});

test("a process lease prevents two concurrent live dispatches", async () => {
  const dir = await directory();
  let calls = 0;
  let finish!: () => void;
  let start!: () => void;
  const started = new Promise<void>((r) => {
    start = r;
  });
  const held = new Promise<void>((r) => {
    finish = r;
  });
  const tools: ToolRegistry = new Map([
    [
      "test.write.v1",
      {
        signature,
        tool: async () => {
          calls++;
          start();
          await held;
          return {};
        },
      },
    ],
  ]);
  const vm = new ProcessSupervisor(dir, { tools });
  await vm.create("exclusive", custom("test.write.v1"));
  const pending = vm.tick("exclusive");
  await started;
  expect((await vm.inspect("exclusive")).process.status).toBe("uncertain");
  await expect(
    new ProcessSupervisor(dir, { tools }).tick("exclusive"),
  ).rejects.toMatchObject({ code: "IO_FAILED" });
  finish();
  expect((await pending)?.process.status).toBe("complete");
  expect(calls).toBe(1);
});

test("a killed host leaves durable uncertain intent and cannot repeat its mutation", async () => {
  const dir = await directory();
  const tools: ToolRegistry = new Map([
    ["test.crash.v1", { signature, tool: async () => ({}) }],
  ]);
  await new ProcessSupervisor(dir, { tools }).create(
    "crash",
    custom("test.crash.v1"),
  );
  const source = `import {ProcessSupervisor} from ${JSON.stringify(join(import.meta.dir, "process.ts"))};
    const tools = new Map([["test.crash.v1", {signature:${JSON.stringify(signature)}, tool:async()=>{await Bun.write(${JSON.stringify(join(dir, "effect.txt"))},"performed"); process.kill(process.pid,"SIGKILL"); return {};}}]]);
    await new ProcessSupervisor(${JSON.stringify(dir)},{tools}).tick("crash");`;
  const script = join(dir, "crash.ts");
  await writeFile(script, source);
  const child = Bun.spawn([process.execPath, script], {
    stdout: "ignore",
    stderr: "pipe",
  });
  await child.exited;
  expect(await readFile(join(dir, "effect.txt"), "utf8")).toBe("performed");
  const vm = new ProcessSupervisor(dir, { tools });
  expect((await vm.inspect("crash")).process.status).toBe("uncertain");
  await expect(vm.tick("crash")).rejects.toMatchObject({ code: "IO_FAILED" });
  expect((await vm.schedule()).ticks).toBe(0);
});

test("recomputed forged process lineage is rejected before effect dispatch", async () => {
  const dir = await directory();
  const mailbox = new FileMailboxService(dir);
  const box = await mailbox.create("inbox");
  const vm = new ProcessSupervisor(dir);
  await vm.create("tampered", receiver(), { src: { inbox: box.receive } });
  const paused = (await vm.tick("tampered"))!;
  const forged = { ...paused.process, args: { src: { inbox: "forged" } } };
  const digest = await vm.store.putValue(forged);
  await writeFile(
    join(dir, "processes/tampered/head.json"),
    JSON.stringify({
      contract: "algal.process-head.v1",
      name: "tampered",
      record: digest,
    }),
  );
  await mailbox.send(box.send, "still pending", externalWakeKey());
  await expect(vm.tick("tampered")).rejects.toMatchObject({
    code: "RECEIPT_MISMATCH",
  });
  expect(await mailbox.hasPending(box.receive)).toBe(true);
  expect(() => parseProcessRecord({ ...forged, status: ["ready"] })).toThrow();
  expect(() => parseProcessRecord({ ...forged, generation: 65 })).toThrow();
  expect(() =>
    parseProcessRecord({ ...forged, unknown: digestCanonical(null) }),
  ).toThrow();
});

test("preplanted process CAS symlinks never overwrite other files", async () => {
  for (const kind of ["values", "manifests"] as const) {
    const dir = await directory();
    const manifest = custom("test.safe.v1");
    const manifestDigest = digestCanonical(manifestToJson(manifest));
    const ready = {
      contract: "algal.process.v1",
      name: "actor",
      manifestDigest,
      args: {},
      maxGenerations: 16,
      generation: 0,
      status: "ready",
      wake: [],
    };
    const digest = kind === "values" ? digestCanonical(ready) : manifestDigest;
    await mkdir(join(dir, kind));
    const victim = join(dir, "preserve.txt");
    await writeFile(victim, "preserve");
    await symlink(victim, join(dir, kind, digest.slice(7) + ".json"));
    const tools: ToolRegistry = new Map([
      ["test.safe.v1", { signature, tool: async () => ({}) }],
    ]);
    await expect(
      new ProcessSupervisor(dir, { tools }).create("actor", manifest),
    ).rejects.toMatchObject({ code: "IO_FAILED" });
    expect(await readFile(victim, "utf8")).toBe("preserve");
  }
});

test("process verification never fetches missing modules through a transport", async () => {
  const dir = await directory();
  const vm = new ProcessSupervisor(dir);
  const child = parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:child",
    name: "Child",
    cells: [
      {
        id: "value",
        kind: "const",
        outputs: { out: { type: "text", value: "ok" } },
      },
    ],
    edges: [],
    interface: { inputs: {}, outputs: { out: { cell: "value", port: "out" } } },
  });
  const digest = await vm.store.putManifest(child);
  const parent = parseOrganismManifest({
    contract: "algal.organism.v1",
    key: "organism:parent",
    name: "Parent",
    cells: [{ id: "child", kind: "organism", manifest: digest, via: "remote" }],
    edges: [],
  });
  await vm.create("offline", parent);
  await vm.tick("offline");
  await rm(join(dir, "manifests", digest.slice(7) + ".json"));
  let calls = 0;
  const verifier = new ProcessSupervisor(dir, {
    transports: {
      remote: {
        id: "remote",
        getBundle: async () => {
          calls++;
          throw new Error("network should not run");
        },
      },
    },
  });
  await expect(verifier.verify("offline")).rejects.toThrow();
  expect(calls).toBe(0);
});
