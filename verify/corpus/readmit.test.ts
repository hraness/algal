import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hashBytes, stableJson } from "../lib/files";
import { readmitHistorical } from "./readmit";
import { syntheticArchive } from "./archive-fixture";
import { Mismatch } from "./shrink";
type RecordValue = Record<string, unknown>;
async function change(root: string, path: string, mutate: (value: RecordValue) => void): Promise<void> {
  const value = JSON.parse(await readFile(join(root, path), "utf8")) as RecordValue;
  mutate(value); await writeFile(join(root, path), stableJson(value) + "\n");
}
async function control(mutate: (root: string) => Promise<void>, message: string | typeof Mismatch | { signature: string }): Promise<void> {
  const owned = await mkdtemp(join(tmpdir(), "algal-corpus-readmission-control-")), copy = join(owned, "archive");
  try {
    await mkdir(copy);
    const authority = await syntheticArchive(copy);
    const positive = await readmitHistorical(copy, authority); // Relocation must pass before every mutation.
    expect(positive.caseCount).toBe(1); expect(positive.invocations).toBe(positive.caseCount * 2);
    await mutate(copy);
    if (typeof message === "object") {
      const error: unknown = await readmitHistorical(copy, authority).then(() => null, error => error);
      expect(error).toBeInstanceOf(Mismatch); expect((error as Mismatch).signature()).toBe(message.signature);
    } else await expect(readmitHistorical(copy, authority)).rejects.toThrow(message);
  } finally { await rm(owned, { recursive: true, force: true }); }
}
test("synthetic protocol fixtures admit local/native/full inventories without executing targets", async () => {
  for (const profile of ["local", "native", "full"] as const) {
    const owned = await mkdtemp(join(tmpdir(), "algal-corpus-synthetic-"));
    try {
      const authority = await syntheticArchive(owned, profile), result = await readmitHistorical(owned, authority);
      expect(result.sourceStatus).toBe("historical-externally-pinned"); expect(result.formalClaims).toBe(0);
      expect(result.caseCount).toBe(1); expect(result.invocations).toBe(profile === "local" ? 1 : profile === "native" ? 2 : 3);
      expect(result.observations).toBe(result.invocations + 1); expect(result.retainedFiles).toBe(result.invocations + 5);
    } finally { await rm(owned, { recursive: true, force: true }); }
  }
});
test("unknown metadata, altered source/artifact/limit identity and forged counts fail", async () => {
  for (const [field, value, message] of [
    ["extra", true, "closed fields"], ["definitionDigest", hashBytes("forged"), "expected source identity"], ["invocations", 0, "command count"],
    ["caseCount", 0, "case count"], ["capturedOutputBytes", 0, "capture accounting"], ["archiveBytesBeforeSummary", 0, "archive byte accounting"],
  ] as const) await control(root => change(root, "result.json", row => { row[field] = value; }), message);
  await control(root => change(root, "result.json", row => { (row.artifacts as RecordValue).native = { path: "/arbitrary/unread", bytes: 1, sha256: hashBytes("fake") }; }), "expected artifacts");
  await control(root => change(root, "result.json", row => { (row.limits as RecordValue).aggregateOutputBytes = 1_000_000_000; }), "resource limits");
});
test("omitted and duplicated cases/targets cannot be hidden by passing summary fields", async () => {
  await control(root => change(root, "start.json", row => { row.cases = []; }), "regenerated cases");
  await control(root => change(root, "result.json", row => { const rows = row.rows as unknown[]; rows.push(rows[0]); }), "bounded inventory");
  await control(root => change(root, "case-0/result.json", row => { row.targets = ["committed-wasm"]; }), "reconstructed case result");
  await control(root => change(root, "result.json", row => { (row.retained as unknown[]).pop(); }), "complete ordered raw inventory");
});
test("command failure, false argv and wrong output are independently rejected", async () => {
  for (const [field, value] of [["timedOut", true], ["cleanupObserved", false], ["outputExceeded", true], ["exitCode", 1], ["signal", "SIGSEGV"]] as const)
    await control(root => change(root, "case-0/native.command.json", row => { row[field] = value; }), "failed command");
  await control(root => change(root, "case-0/native.command.json", row => { (row.command as string[])[0] = "/arbitrary/unread"; }), "authorized command argv");
  await control(root => change(root, "case-0/native.command.json", row => { row.stdout = '{"ok":true,"value":true,"fuel":1}\n'; }), Mismatch);
  await control(root => change(root, "case-0/native.command.json", row => { row.stdout = "x".repeat(1_048_577); }), "remaining capture allowance");
});
test("exact input, worker identity and bounded relative retained references are checked", async () => {
  await control(root => writeFile(join(root, "case-0/input.bin"), "{}"), "regenerated input bytes");
  await control(root => change(root, "case-0/committed-wasm.command.json", row => {
    const worker = JSON.parse(row.stdout as string) as RecordValue; worker.inputSha256 = hashBytes("different input"); row.stdout = JSON.stringify(worker) + "\n";
  }), "exact input/output identity");
  await control(root => change(root, "result.json", row => { const retained = row.retained as RecordValue[]; retained[0]!.path = "../../foreign"; }), "complete ordered raw inventory");
  await control(root => change(root, "start.json", row => { const definition = row.definition as RecordValue; (definition.repository as RecordValue[])[0]!.path = "../../foreign"; }), "relative path");
});
test("extra failure files, nested directories, symlinks and oversized/noncanonical records fail", async () => {
  await control(root => writeFile(join(root, "failure.json"), "{}\n"), "physical archive entries");
  await control(root => writeFile(join(root, "case-0/unlisted.command.json"), "{}\n"), "case entries");
  await control(async root => { await unlink(join(root, "case-0/input.bin")); await mkdir(join(root, "case-0/input.bin")); }, "case entries");
  await control(async root => { await unlink(join(root, "case-0/input.bin")); await symlink("/authorized/unread/foreign-input", join(root, "case-0/input.bin")); }, "case entries");
  await control(root => writeFile(join(root, "case-0/input.bin"), new Uint8Array(16_385)), "file size bound");
  await control(async root => { const path = join(root, "start.json"), text = await readFile(path, "utf8"); await writeFile(path, text.replace('{"artifact":', '{"version":"forged","artifact":')); }, "noncanonical/duplicate");
  await control(root => writeFile(join(root, "start.json"), Uint8Array.of(0xff)), "Invalid byte sequence");
});

test("fuel-only target and wrapper discrepancies keep semantic mismatch identity", async () => {
  await control(root => change(root, "case-0/native.command.json", row => {
    const native = JSON.parse(row.stdout as string) as RecordValue; native.fuel = 2; row.stdout = JSON.stringify(native) + "\n";
  }), { signature: "full-byte-response:native" });
  await control(root => change(root, "case-0/committed-wasm.command.json", row => {
    const worker = JSON.parse(row.stdout as string) as RecordValue; (worker.bun as RecordValue).fuel = 2; row.stdout = JSON.stringify(worker) + "\n";
  }), { signature: "full-result:bun-wrapper" });
});

test("fully rehashed archive rejects overlong derived worker argv after admitted baseline", async () => {
  for (const candidateDirectory of ["/" + "a".repeat(4095), "/" + "é".repeat(2047)]) {
    const root = await mkdtemp(join(tmpdir(), "algal-corpus-derived-argv-"));
    try {
      const authority = await syntheticArchive(root);
      expect((await readmitHistorical(root, authority)).status).toBe("admitted");
      await change(root, "case-0/committed-wasm.command.json", row => { (row.command as string[])[1] = join(candidateDirectory, "worker.ts"); });
      const path = join(root, "result.json"), summary = JSON.parse(await readFile(path, "utf8")) as { retained: { path: string; sha256: string }[]; archiveBytesBeforeSummary: number };
      let bytes = 0;
      for (const file of summary.retained) { const raw = await readFile(join(root, file.path)); file.sha256 = hashBytes(raw); bytes += raw.length; }
      summary.archiveBytesBeforeSummary = bytes;
      await writeFile(path, stableJson(summary) + "\n");
      await expect(readmitHistorical(root, { ...authority, candidateDirectory })).rejects.toThrow("expected argv argument");
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
test("all selected authority paths reject UTF8 overflow after admitted baseline", async () => {
  const root = await mkdtemp(join(tmpdir(), "algal-corpus-authority-utf8-")), tooLong = "/" + "é".repeat(2048);
  try {
    const authority = await syntheticArchive(root, "full");
    expect((await readmitHistorical(root, authority)).status).toBe("admitted");
    for (const key of ["candidateDirectory", "recordedArchive"] as const) await expect(readmitHistorical(root, { ...authority, [key]: tooLong })).rejects.toThrow("authorized absolute path");
    for (const key of ["bun", "committed", "native", "rebuilt"] as const) {
      const changed = structuredClone(authority); changed.artifacts[key]!.path = tooLong;
      await expect(readmitHistorical(root, changed)).rejects.toThrow("authorized absolute path");
    }
    for (const key of ["native", "rebuilt", "replay"] as const) {
      const changed = structuredClone(authority); changed.options[key] = tooLong;
      await expect(readmitHistorical(root, changed)).rejects.toThrow("authorized absolute path");
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
