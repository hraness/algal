import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import invalidSchemas from "../scripts/fixtures/schema-admission.json";
import { BOUNDS, manifestToJson, parseOrganismManifest } from "./contract";
import { canonicalBytes, type JsonObject } from "./values";
import { boundedBytes } from "./io";

const manifest = (schema: unknown, placement = "agent") => ({
  contract: "algal.organism.v1", key: "organism:admission", name: "Admission",
  cells: placement === "agent"
    ? [{ id: "answer", kind: "agent", prompt: "Must pass admission first.", output: { kind: "json", schema } }]
    : placement === "input-port"
      ? [{ id: "answer", kind: "agent", inputs: { data: { type: "json", schema } }, prompt: "Must pass admission first.", output: { kind: "text" } }]
      : [{ id: "input", kind: "input", outputs: { data: { type: "json", schema } } }],
  edges: [],
});

function padded(bytes: number, padding = "") {
  const value = manifestToJson(parseOrganismManifest(manifest({ description: padding })));
  const schema = (value.cells as JsonObject[])[0]!.output as JsonObject;
  const output = schema.schema as JsonObject;
  output.description = padding + "x".repeat(bytes - canonicalBytes(value));
  expect(canonicalBytes(value)).toBe(bytes);
  return value;
}

describe("manifest admission before effect dispatch", () => {
  for (const { name, schema } of invalidSchemas) {
    test(`${name} is refused at all schema boundaries`, () => {
      for (const where of ["agent", "input-port", "output-port"]) {
        expect(() => parseOrganismManifest(manifest(schema, where))).toThrow();
      }
    });
  }
  test("retains unknown hints without interpreting them as enforced nested schemas", () => {
    const schema = { type: "array", items: { type: "provider-specific" }, enum: ["hint"], additionalProperties: false };
    expect(manifestToJson(parseOrganismManifest(manifest(schema))).cells).toBeDefined();
  });
  test("enforces exact canonical byte boundary including UTF-8 and escaped strings", () => {
    for (const padding of ["", "😀\n\"\\\u0000".repeat(16)]) {
      expect(() => parseOrganismManifest(padded(BOUNDS.maxManifestBytes, padding))).not.toThrow();
      expect(() => parseOrganismManifest(padded(BOUNDS.maxManifestBytes + 1, padding))).toThrow(/manifest bytes/);
    }
  });
  test("refuses a raw document whose defaults would exceed the retained bound", () => {
    const value = manifest({ description: "" });
    const output = (value.cells[0] as { output: { schema: { description: string } } }).output;
    output.schema.description = "x".repeat(BOUNDS.maxManifestBytes - canonicalBytes(value as unknown as JsonObject));
    expect(canonicalBytes(value as unknown as JsonObject)).toBe(BOUNDS.maxManifestBytes);
    expect(() => parseOrganismManifest(value)).toThrow(/manifest bytes/);
    const admitted = padded(BOUNDS.maxManifestBytes);
    expect(() => parseOrganismManifest(manifestToJson(parseOrganismManifest(admitted)))).not.toThrow();
  });
  test("bounds omitted SDK members independently of their serialized size", () => {
    const omitted = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`optional${i}`, undefined]));
    // Repeated aliases make a large traversal without a large fixture allocation.
    const hints = Object.fromEntries(Array.from({ length: 1050 }, (_, i) => [`hint${i}`, omitted]));
    expect(() => parseOrganismManifest(manifest({ hints }))).toThrow(/manifest traversal/);
    expect(() => parseOrganismManifest({ ...manifest({}), note: undefined })).not.toThrow();
  });
  test("refuses huge SDK values and overbound arrays before descending into them", () => {
    expect(() => parseOrganismManifest(manifest({ description: "x".repeat(2_000_000) }))).toThrow(/manifest bytes/);
    const cells = Array(BOUNDS.maxCells + 1).fill(null);
    expect(() => parseOrganismManifest({ ...manifest({}), cells })).toThrow(/cells exceeds/);
    const recursive: Record<string, unknown> = {}; recursive.self = recursive;
    expect(() => parseOrganismManifest(manifest({ extra: recursive }))).toThrow(/depth/);
  });
});

const root = resolve(import.meta.dir, "..");
async function cli(args: string[]) {
  const child = Bun.spawn([process.execPath, join(root, "cli.ts"), ...args], { cwd: root, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let expired = false;
  const timer = setTimeout(() => { expired = true; child.kill("SIGKILL"); }, 5000);
  try {
    const [stdout, stderr, code] = await Promise.all([boundedBytes(child.stdout, 65536, "admission stdout"), boundedBytes(child.stderr, 65536, "admission stderr"), child.exited]);
    expect(expired, "CLI input admission must not hang").toBe(false);
    return { code, stdout: Buffer.from(stdout).toString(), stderr: Buffer.from(stderr).toString() };
  } finally { clearTimeout(timer); if (child.exitCode === null) child.kill("SIGKILL"); await child.exited; }
}

test("CLI rejects malformed schema before launching a command adapter", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-admission-"));
  try {
    const file = join(dir, "invalid.algal.json");
    const marker = join(dir, "called");
    const script = join(dir, "adapter.ts");
    await writeFile(file, JSON.stringify(manifest({ required: "owner" })));
    await writeFile(script, `await Bun.write(${JSON.stringify(marker)}, "called"); console.log('{}');`);
    const shell = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
    const result = await cli(["run", file, "--executor-cmd", `${shell(process.execPath)} ${shell(script)}`, "--dir", join(dir, "store")]);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("PARSE_FAILED");
    expect(await Bun.file(marker).exists()).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("CLI admits bounded regular input symlinks and refuses oversized files and FIFOs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-admission-files-"));
  try {
    const file = join(dir, "manifest.json");
    const link = join(dir, "link.json");
    await writeFile(file, JSON.stringify(manifest({ type: "object" })));
    await symlink(file, link);
    expect((await cli(["check", link])).code).toBe(0);
    for (const [name, data] of [
      ["bom", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify(manifest({})))])],
      ["invalid-utf8", Buffer.from(JSON.stringify(manifest({ description: "é" })), "latin1")],
    ] as const) {
      const invalid = join(dir, `${name}.json`);
      await writeFile(invalid, data);
      expect((await cli(["check", invalid])).stderr).toContain("PARSE_FAILED");
    }
    const oversized = join(dir, "oversized.json");
    await writeFile(oversized, " ".repeat(BOUNDS.maxManifestBytes + 1));
    expect((await cli(["check", oversized])).stderr).toContain("BUDGET_EXHAUSTED");
    if (process.platform !== "win32") {
      const fifo = join(dir, "fifo.json");
      const child = Bun.spawn(["mkfifo", fifo], { stdout: "ignore", stderr: "pipe" });
      expect(await child.exited).toBe(0);
      const result = await cli(["check", fifo]);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain("regular file");
      expect(await readFile(file, "utf8")).toContain("algal.organism.v1");
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
