import { expect, test } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ArchiveWriter, archivePath, parseCanonical, requireInventory } from "./archive";

test("closed archive inventory covers nested directories and rejects injected files", async () => {
  const root = await mkdtemp(join(tmpdir(), "algal-history-archive-test-"));
  try {
    const writer = await ArchiveWriter.open(root);
    await writer.directory("control"); await writer.directory("control/attempt-0");
    await writer.json("control/attempt-0/history.json", { commands: [] });
    await writer.json("result.json", { status: "synthetic" });
    await expect(writer.stable()).resolves.toBeUndefined();
    await writeFile(join(root, "injected"), "not admitted");
    await expect(writer.stable()).rejects.toThrow("unexpected/nonregular file");
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("symlink, missing file, duplicate names and excess depth cannot count as evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "algal-history-archive-test-"));
  try {
    await writeFile(join(root, "source"), "original"); await symlink("source", join(root, "alias"));
    await expect(requireInventory(root, ["source", "alias"])).rejects.toThrow("unexpected/nonregular file");
    await rm(join(root, "alias"));
    await expect(requireInventory(root, ["source", "missing"])).rejects.toThrow("missing physical evidence");
    await expect(requireInventory(root, ["source", "source"])).rejects.toThrow("duplicate expected file");
    expect(() => archivePath("a/b/c/d")).toThrow("path depth");
    expect(() => archivePath("a/../b")).toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("canonical archive metadata rejects duplicate keys, BOM and alternate framing", () => {
  const bytes = (s: string) => new TextEncoder().encode(s);
  expect(parseCanonical(bytes('{"a":1}\n'))).toEqual({ a: 1 });
  for (const value of ['{"a":1,"a":1}\n', '\ufeff{"a":1}\n', ' {"a":1}\n', '{"a":1}', '{"a":1}\n\n']) expect(() => parseCanonical(bytes(value))).toThrow();
  expect(() => parseCanonical(bytes("[".repeat(100) + "null" + "]".repeat(100) + "\n"))).toThrow("JSON shape");
});
