import { expect, test } from "bun:test";
import { admitCommand } from "./commands";
import { LIMITS } from "./bounded";

// Pure command-boundary controls. These are not positive full-archive fixtures.
const argv = ["/synthetic/never-executed", "replay", "/synthetic/history.json"];
const baseline = () => ({ command: argv, exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout: "{}\n", stderr: "" });
test("raw command admission binds exact inert argv and status fields", () => {
  for (const changes of [
    { command: ["/synthetic/forged-never-executed"] }, { exitCode: 1 }, { signal: "SIGTERM" },
    { timedOut: true }, { outputExceeded: true }, { cleanupObserved: false }, { stderr: "warning" }, { extra: true },
  ]) {
    expect(admitCommand(baseline(), argv, LIMITS.outputBytes)).toBe("{}\n");
    expect(() => admitCommand({ ...baseline(), ...changes }, argv, LIMITS.outputBytes)).toThrow();
  }
});
test("raw command admission enforces the caller's remaining capture bound", () => {
  expect(admitCommand(baseline(), argv, 3)).toBe("{}\n");
  expect(() => admitCommand(baseline(), argv, 2)).toThrow("history command output");
  expect(() => admitCommand(baseline(), argv, 0)).toThrow("capture capacity");
});
test("both selected and recorded argv obey character, UTF8, count and closed string bounds", () => {
  const command = (command: unknown) => ({ ...baseline(), command });
  for (const valid of [["a".repeat(4096)], ["é".repeat(2048)], Array.from({ length: 64 }, () => "argument")]) {
    expect(admitCommand(command(valid), valid, 3)).toBe("{}\n");
  }
  const sparse: string[] = []; sparse.length = 1;
  const extra = ["argument"]; Object.assign(extra, { unexpected: true });
  const hidden = ["argument"]; Object.defineProperty(hidden, "extra", { value: true });
  const symbol = ["argument"]; Object.defineProperty(symbol, Symbol("extra"), { value: true });
  const nonenumerable = ["argument"]; Object.defineProperty(nonenumerable, "0", { value: "argument", enumerable: false });
  let getterReads = 0;
  const accessor: string[] = []; Object.defineProperty(accessor, "0", { enumerable: true, get() { getterReads++; return "argument"; } });
  const inherited = ["argument"]; Object.setPrototypeOf(inherited, {});
  for (const invalid of [[], [""], ["a\0b"], ["a".repeat(4097)], ["é".repeat(2048) + "a"], Array.from({ length: 65 }, () => "argument"), sparse, extra, hidden, symbol, nonenumerable, accessor, inherited, [7]]) {
    expect(() => admitCommand(command(invalid), invalid as string[], 3)).toThrow("expected");
    expect(() => admitCommand(command(invalid), argv, 3)).toThrow("recorded");
  }
  expect(getterReads).toBe(0);
  const worker = "/" + "a".repeat(4095) + "/worker.ts";
  expect(() => admitCommand(command([worker]), [worker], 3)).toThrow("expected argv argument");
});

import { beforeAll, afterAll } from "bun:test";
import { lstat, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hashBytes, stableJson } from "../../lib/files";
import { syntheticArchive } from "./archive-fixture";
import { mutate } from "./controls";
import { readmitCurrent, readmitHistorical } from "./readmit";
import { parseHistory, type History, type Trace } from "./schema";
import type { Retained } from "./archive";

type Fixture = Awaited<ReturnType<typeof syntheticArchive>>;
type Dict = Record<string, unknown>;
let root: string, fixture: Fixture;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "algal-history-archive-controls-"));
  fixture = await syntheticArchive(root);
}, 20_000);
afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });
async function markerAbsent(): Promise<boolean> {
  try { await lstat(fixture.marker); return false; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return true; throw error; }
}
class Mutation {
  readonly originals = new Map<string, Uint8Array | null>();
  async remember(path: string): Promise<void> {
    if (!this.originals.has(path)) {
      try { this.originals.set(path, await readFile(join(fixture.archive, path))); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; this.originals.set(path, null); }
    }
  }
  async bytes(path: string, data: string | Uint8Array): Promise<void> { await this.remember(path); await writeFile(join(fixture.archive, path), data); }
  async json(path: string, edit: (value: Dict) => void): Promise<void> {
    const value = JSON.parse(await readFile(join(fixture.archive, path), "utf8")) as Dict; edit(value); await this.bytes(path, stableJson(value) + "\n");
  }
  async trace(path: string, edit: (trace: Trace) => void): Promise<void> {
    await this.json(path, value => edit(value as unknown as Trace));
    const bytes = await readFile(join(fixture.archive, path));
    await this.json(path.replace(/\.json$/, ".command.json"), value => { const header = JSON.parse(value.stdout as string) as Dict; header.traceBytes = bytes.length; value.stdout = JSON.stringify(header) + "\n"; });
  }
  async restore(): Promise<void> {
    for (const [path, bytes] of [...this.originals.entries()].reverse()) {
      await rm(join(fixture.archive, path), { force: true });
      if (bytes !== null) await writeFile(join(fixture.archive, path), bytes);
    }
  }
  /** Re-sign byte identities/accounting with fresh hashes, so semantic failures
   * cannot be dismissed as merely stale outer metadata. */
  async rehash(): Promise<void> {
    await this.json("result.json", value => {
      const retained = value.retained as Retained[];
      for (const item of retained) {
        const original = this.originals.get(item.path);
        if (original !== undefined) item.sha256 = "pending";
      }
    });
    const value = JSON.parse(await readFile(join(fixture.archive, "result.json"), "utf8")) as Dict;
    let captured = 0;
    for (const item of value.retained as Retained[]) {
      if (this.originals.has(item.path)) { const raw = await readFile(join(fixture.archive, item.path)); item.sha256 = hashBytes(raw); item.bytes = raw.length; }
      if (item.path.endsWith(".command.json")) { const command = JSON.parse(await readFile(join(fixture.archive, item.path), "utf8")) as { stdout: string; stderr: string }; captured += Buffer.byteLength(command.stdout) + Buffer.byteLength(command.stderr); }
    }
    value.capturedOutputBytes = captured;
    value.archiveBytesBeforeSummary = (value.retained as Retained[]).reduce((sum, item) => sum + item.bytes, 0);
    await this.bytes("result.json", stableJson(value) + "\n");
  }
}
const controls: { name: string; rehash: boolean; edit: (m: Mutation) => Promise<void> }[] = [
  { name: "unknown summary field", rehash: false, edit: m => m.json("result.json", v => { v.extra = true; }) },
  { name: "summary outcome count", rehash: false, edit: m => m.json("result.json", v => { v.targetWorkers = 1; }) },
  { name: "summary byte accounting", rehash: false, edit: m => m.json("result.json", v => { v.archiveBytesBeforeSummary = 1; }) },
  { name: "definition identity", rehash: false, edit: m => m.json("result.json", v => { v.definitionDigest = "sha256:" + "0".repeat(64); }) },
  { name: "source inventory mutation with rehashed raw record", rehash: true, edit: m => m.json("start.json", v => { const definition = v.definition as { reference: { sha256: string }[] }; definition.reference[0]!.sha256 = "sha256:" + "0".repeat(64); }) },
  { name: "forged inert argv", rehash: true, edit: m => m.json("case-0/generate.command.json", v => { v.command = [fixture.authority.artifacts.native.path]; }) },
  { name: "unobserved cleanup", rehash: true, edit: m => m.json("case-0/generate.command.json", v => { v.cleanupObserved = false; }) },
  { name: "signal status", rehash: true, edit: m => m.json("case-0/generate.command.json", v => { v.signal = "SIGTERM"; }) },
  { name: "stdout framing", rehash: true, edit: m => m.json("case-0/generate.command.json", v => { v.stdout = String(v.stdout) + "\n"; }) },
  { name: "extra stdout envelope field", rehash: true, edit: m => m.json("case-0/generate.command.json", v => { const header = JSON.parse(String(v.stdout)) as Dict; header.extra = true; v.stdout = JSON.stringify(header) + "\n"; }) },
  { name: "generated profile/header mismatch", rehash: true, edit: m => m.json("case-0/generate.command.json", v => { const header = JSON.parse(String(v.stdout)) as Dict; header.profile = "writer"; v.stdout = JSON.stringify(header) + "\n"; }) },
  { name: "retained history input differs from generated packet", rehash: true, edit: m => m.json("case-0/history.json", v => { v.seed = 7; }) },
  { name: "Bun packet authorized history differs", rehash: true, edit: m => m.json("case-0/bun.json", v => { (v.history as History).seed = 7; }) },
  { name: "recomputed positive witness omitted", rehash: true, edit: m => m.json("case-0/generated.json", v => { v.witnesses = []; }) },
  { name: "native output runtime identity", rehash: true, edit: m => m.trace("case-0/native-a.json", t => { t.runtime = "bun"; }) },
  { name: "native uncertain acknowledgment cleared", rehash: true, edit: m => m.trace("case-0/native-a.json", t => { const outcome = t.steps.at(-1)!.outcome; if (outcome.status !== "error") throw new Error("fixture uncertain prerequisite"); outcome.uncertain = false; }) },
  { name: "durable started callback evidence removed", rehash: true, edit: m => m.trace("case-0/native-a.json", t => { const row = t.steps.find(s => s.callbacks.length)!; row.callbacks[0]!.durable = null; }) },
  { name: "callback effect bytes forged", rehash: true, edit: m => m.trace("case-0/native-a.json", t => { const callback = t.steps.flatMap(s => s.callbacks).find(c => c.effectAfter !== null)!; callback.effectAfter += "forged"; }) },
  { name: "owned physical effect inventory changed", rehash: true, edit: m => m.trace("case-0/native-a.json", t => { t.steps.at(-1)!.after.effectFiles.push("0".repeat(64) + ".txt"); }) },
  { name: "native input header identity", rehash: true, edit: m => m.json("case-0/native-a.command.json", v => { const header = JSON.parse(String(v.stdout)) as Dict; header.historyInputSha256 = "sha256:" + "0".repeat(64); v.stdout = JSON.stringify(header) + "\n"; }) },
  { name: "closed raw trace fields", rehash: true, edit: m => m.trace("case-0/native-a.json", t => { (t as unknown as Dict).extra = true; }) },
  { name: "changed shrink property", rehash: true, edit: m => m.json("control-0/result.json", v => { v.property = "invented-property"; }) },
  { name: "changed ordered shrink input", rehash: true, edit: m => m.json("control-0/attempt-0/history.json", v => { v.seed = 7; }) },
  { name: "real baseline mismatch cannot masquerade as intended projection mutant", rehash: true, edit: async m => {
    const summary = JSON.parse(await readFile(join(fixture.archive, "result.json"), "utf8")) as { retained: Retained[] };
    for (const item of summary.retained.filter(r => /^control-2\/attempt-\d+\/native\.json$/.test(r.path))) {
      const history = parseHistory(JSON.parse(await readFile(join(fixture.archive, item.path.replace("native.json", "history.json")), "utf8")));
      await m.trace(item.path, trace => Object.assign(trace, mutate(history, trace, "omit-started")));
    }
  } },
  { name: "unknown raw archive entry", rehash: false, edit: m => m.bytes("unlisted.json", "{}\n") },
  { name: "missing raw archive entry", rehash: false, edit: async m => { await m.remember("case-0/bun.json"); await rm(join(fixture.archive, "case-0/bun.json")); } },
  { name: "raw symlink cannot stand in for evidence", rehash: false, edit: async m => { await m.remember("case-0/bun.json"); await rm(join(fixture.archive, "case-0/bun.json")); await symlink("generated.json", join(fixture.archive, "case-0/bun.json")); } },
  { name: "duplicate-key canonical metadata", rehash: true, edit: async m => { const raw = await readFile(join(fixture.archive, "case-0/history.json"), "utf8"); await m.bytes("case-0/history.json", '{"seed":1,' + raw.slice(1)); } },
];
for (const control of controls) test(`full synthetic archive rejects ${control.name} after admitted baseline`, async () => {
  const baseline = await readmitHistorical(fixture.archive, fixture.authority);
  expect(baseline.status).toBe("admitted"); expect(baseline.histories).toBe(4); expect(await markerAbsent()).toBe(true);
  const mutation = new Mutation();
  try {
    await control.edit(mutation); if (control.rehash) await mutation.rehash();
    await expect(readmitHistorical(fixture.archive, fixture.authority)).rejects.toThrow();
    expect(await markerAbsent()).toBe(true);
  } finally { await mutation.restore(); }
}, 20_000);

test("current-source admission rejects changed source after a valid current baseline", async () => {
  expect((await readmitCurrent(fixture.archive, fixture.authority, fixture.source)).sourceStatus).toBe("current-source-rehashed");
  const path = join(fixture.source.repositoryRoot, "src/synthetic.ts"), bytes = await readFile(path);
  try { await writeFile(path, "export const synthetic = false;\n"); await expect(readmitCurrent(fixture.archive, fixture.authority, fixture.source)).rejects.toThrow("current source closure"); }
  finally { await writeFile(path, bytes); }
});
test("current-source admission rejects changed executable bytes after a valid current baseline", async () => {
  expect((await readmitCurrent(fixture.archive, fixture.authority, fixture.source)).sourceStatus).toBe("current-source-rehashed");
  const path = fixture.authority.artifacts.native.path, bytes = await readFile(path);
  try { await writeFile(path, "changed inert executable\n"); await expect(readmitCurrent(fixture.archive, fixture.authority, fixture.source)).rejects.toThrow("current executable bytes"); }
  finally { await writeFile(path, bytes); }
  expect(await markerAbsent()).toBe(true);
});
test("authority paths reject UTF8 overflow after a valid historical baseline", async () => {
  expect((await readmitHistorical(fixture.archive, fixture.authority)).status).toBe("admitted");
  const overlong = "/" + "é".repeat(2048);
  for (const key of ["referenceDirectory", "recordedArchive"] as const) {
    await expect(readmitHistorical(fixture.archive, { ...fixture.authority, [key]: overlong })).rejects.toThrow("authorized absolute history path");
  }
  for (const key of ["bun", "native"] as const) {
    const authority = structuredClone(fixture.authority); authority.artifacts[key].path = overlong;
    await expect(readmitHistorical(fixture.archive, authority)).rejects.toThrow("authorized absolute history path");
  }
  expect(await markerAbsent()).toBe(true);
});
