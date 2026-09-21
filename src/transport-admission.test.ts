import { expect, test } from "bun:test";
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packOrganism } from "./bundle";
import { BOUNDS, parseOrganismManifest } from "./contract";
import { boundedFileBytes } from "./io";
import { ProcessSupervisor } from "./process";
import { MemoryStore } from "./store";
import { fileTransport, httpTransport } from "./transport";
import { canonicalize, type JsonValue } from "./values";

const manifest = parseOrganismManifest({ contract: "algal.organism.v1", key: "organism:admission", name: "Admission", cells: [{ id: "value", kind: "const", outputs: { value: { type: "text", value: "retained" } } }], edges: [] });
const bundle = await packOrganism(manifest, new MemoryStore());
const bundleBody = canonicalize(bundle as unknown as JsonValue);

async function temporary(action: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "algal-transport-admission-"));
  try { await action(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test("file admission counts bytes, accepts the exact bound and preserves configured regular symlinks", async () => temporary(async dir => {
  const file = join(dir, "source.json");
  const bytes = Buffer.from('"é"');
  await writeFile(file, bytes);
  expect(await boundedFileBytes(file, bytes.length, "test")).toEqual(bytes);
  await expect(boundedFileBytes(file, bytes.length - 1, "test")).rejects.toMatchObject({ code: "BUDGET_EXHAUSTED" });
  await writeFile(file, bundleBody);
  await symlink(file, join(dir, `${bundle.root.slice(7)}.bundle.json`));
  expect(await fileTransport(dir).getBundle(bundle.root)).toEqual(bundle);
  expect(await readFile(file, "utf8")).toBe(bundleBody);
}));

test("file and HTTP bundles reject malformed UTF-8 and BOM instead of changing admitted bytes", async () => temporary(async dir => {
  const file = join(dir, `${bundle.root.slice(7)}.bundle.json`);
  const malformed = Buffer.concat([Buffer.from(bundleBody.replace('"retained"', '"MARK"').split('MARK')[0]!), Buffer.from([0xff]), Buffer.from(bundleBody.replace('"retained"', '"MARK"').split('MARK')[1]!)]);
  for (const body of [malformed, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(bundleBody)])]) {
    await writeFile(file, body);
    await expect(fileTransport(dir).getBundle(bundle.root)).rejects.toMatchObject({ code: "PARSE_FAILED" });
    const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response(body) });
    try { await expect(httpTransport(`http://127.0.0.1:${server.port}`).getBundle(bundle.root)).rejects.toMatchObject({ code: "PARSE_FAILED" }); }
    finally { server.stop(true); }
  }
}));

test("HTTP response limit applies while streaming chunked multibyte bytes, before EOF", async () => {
  const chunk = Buffer.from("é".repeat(32_768));
  let sent = 0;
  const server = Bun.serve({
    port: 0, hostname: "127.0.0.1",
    fetch: () => new Response(new ReadableStream<Uint8Array>({
      async pull(controller) {
        // Once over the bound, leave the producer open. A full text() read
        // would wait for the request timeout instead of rejecting promptly.
        if (sent > BOUNDS.maxBundleBytes) return new Promise<void>(() => {});
        sent += chunk.length;
        controller.enqueue(chunk);
      },
    }), { headers: { "content-type": "application/json" } }),
  });
  try {
    await expect(httpTransport(`http://127.0.0.1:${server.port}`, { timeoutMs: 5_000 }).getBundle(bundle.root))
      .rejects.toThrow(`exceeds ${BOUNDS.maxBundleBytes} bytes`);
    expect(sent).toBeLessThanOrEqual(BOUNDS.maxBundleBytes + chunk.length);
  } finally { server.stop(true); }
}, 8_000);

test("HTTP body timeout and invalid timeout options fail closed", async () => {
  for (const timeoutMs of [0, -1, 0.5, NaN, Infinity, 600_001]) {
    expect(() => httpTransport("http://127.0.0.1", { timeoutMs })).toThrow("timeout");
  }
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("{")); } })) });
  try { await expect(httpTransport(`http://127.0.0.1:${server.port}`, { timeoutMs: 100 }).getBundle(bundle.root)).rejects.toBeDefined(); }
  finally { server.stop(true); }
});

test.skipIf(process.platform === "win32")("FIFO bundles and process heads fail under an owned child deadline without mutation", async () => temporary(async dir => {
  const bundleFile = join(dir, `${bundle.root.slice(7)}.bundle.json`);
  const head = join(dir, "processes/blocked/head.json");
  await mkdir(join(dir, "processes/blocked"), { recursive: true });
  for (const path of [bundleFile, head]) {
    const maker = Bun.spawn(["mkfifo", path], { stdout: "ignore", stderr: "pipe" });
    expect(await maker.exited).toBe(0);
  }
  for (const script of [
    `import {fileTransport} from ${JSON.stringify(join(import.meta.dir, "transport.ts"))}; await fileTransport(process.argv[1]).getBundle(process.argv[2]);`,
    `import {ProcessSupervisor} from ${JSON.stringify(join(import.meta.dir, "process.ts"))}; await new ProcessSupervisor(process.argv[1]).inspect("blocked");`,
  ]) {
    const child = Bun.spawn([process.execPath, "-e", script, dir, bundle.root], { stdout: "pipe", stderr: "pipe" });
    const timer = setTimeout(() => child.kill("SIGKILL"), 3_000);
    try {
      const [code, diagnostic] = await Promise.all([child.exited, new Response(child.stderr).text()]);
      expect(child.signalCode).toBeNull();
      expect(code).not.toBe(0);
      expect(diagnostic).toContain("regular file byte bound");
    } finally { clearTimeout(timer); child.kill(); await child.exited; }
  }
  expect((await lstat(bundleFile)).isFIFO()).toBe(true);
  expect((await lstat(head)).isFIFO()).toBe(true);
}), 10_000);

test("process JSON refuses malformed UTF-8 before digest interpretation", async () => temporary(async dir => {
  const supervisor = new ProcessSupervisor(dir);
  await supervisor.create("valid", manifest, {});
  const path = join(dir, "processes/valid/head.json");
  const original = await readFile(path);
  for (const bytes of [Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), original]), Buffer.from([0x22, 0xff, 0x22])]) {
    await writeFile(path, bytes);
    await expect(supervisor.inspect("valid")).rejects.toMatchObject({ code: "PARSE_FAILED" });
    expect(await readFile(path)).toEqual(bytes);
  }
  await writeFile(path, original);
  expect((await supervisor.inspect("valid")).process.status).toBe("ready");
}));
