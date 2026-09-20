/** Portable crash-recovered process evidence, checked by fresh offline runtimes. */
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestCanonical } from "../src/digest";
import { boundedBytes } from "../src/io";
import { canonicalize, type JsonValue } from "../src/values";
import type { ProcessEvidence, ProcessEvidenceReport } from "../src/process-evidence";

const root = resolve(import.meta.dir, "..");
let native: string | undefined, output: string | undefined, keep = false;
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === "--keep") keep = true;
  else if ((flag === "--native" || flag === "--out") && process.argv[i + 1]) {
    const value = resolve(process.argv[++i]!);
    if (flag === "--native") native = value; else output = value;
  } else throw new Error("usage: bun scripts/process-evidence-demo.ts [--native PATH] [--keep] [--out PATH]");
}
const directory = await mkdtemp(join(tmpdir(), "algal-process-evidence-"));
const isolated = join(directory, "offline");
await mkdir(isolated);
const runtimes = [{name: "bun", argv: [process.execPath, join(root, "cli.ts")]}];
if (native) runtimes.push({name: "rust", argv: [native]});
let success = false, fixtureDirectory: string | undefined, calls = 0;
function invariant(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function command(argv: string[], cwd = root) {
  calls++;
  const child = Bun.spawn(argv, {cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 40_000});
  try {
    const [code, stdout, stderr] = await Promise.all([child.exited,
      boundedBytes(child.stdout, 67_108_864, "evidence demo stdout"), boundedBytes(child.stderr, 65_536, "evidence demo stderr")]);
    return {code, stdout: new TextDecoder().decode(stdout), stderr: new TextDecoder().decode(stderr)};
  } finally { child.kill("SIGKILL"); await child.exited; }
}
async function inventory(path: string): Promise<JsonValue> {
  const entries: Record<string, JsonValue> = {};
  for (const entry of (await readdir(path, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    invariant(entry.isDirectory() || entry.isFile(), "fixture contains an unexpected file type");
    entries[entry.name] = entry.isDirectory() ? await inventory(join(path, entry.name)) :
      new Bun.CryptoHasher("sha256").update(await readFile(join(path, entry.name))).digest("hex");
  }
  return entries;
}
try {
  const recovered = await command([process.execPath, join(root, "scripts/coding-recovery-demo.ts"), "--keep",
    ...(native ? ["--native", native] : [])]);
  invariant(recovered.code === 0, `recovery prerequisite: ${recovered.stderr || recovered.stdout}`);
  const recovery = JSON.parse(recovered.stdout) as {ok: boolean; evidenceDirectory: string; adapterAdmissions: number; validationInvocations: number; verification: {bun: {digest: string}}};
  invariant(recovery.ok && recovery.adapterAdmissions === 1 && recovery.validationInvocations === 1, "recovery fixture failed");
  fixtureDirectory = recovery.evidenceDirectory;
  const capsules: {runtime: string; file: string; evidence: ProcessEvidence}[] = [];
  for (const runtime of runtimes) {
    const exported = await command([...runtime.argv, "process", "export", "lost-ack-repair", "--dir", join(fixtureDirectory, "store"), "--tools", join(fixtureDirectory, "offline-tools.json")]);
    invariant(exported.code === 0, `${runtime.name} export failed: ${exported.stderr || exported.stdout}`);
    const evidence = JSON.parse(exported.stdout) as ProcessEvidence;
    invariant(evidence.head === recovery.verification.bun.digest, "export changed the captured head");
    const file = join(directory, `${runtime.name}-evidence.json`);
    await writeFile(file, exported.stdout);
    capsules.push({runtime: runtime.name, file, evidence});
  }
  // Remove every original path, including the store, adapter, checks and ledger.
  // A verification subprocess gets only the standalone capsule and an empty cwd.
  const moved = join(directory, "retained-source");
  await rename(fixtureDirectory, moved); fixtureDirectory = moved;
  const before = digestCanonical(await inventory(moved));
  const verification: {exporter: string; verifier: string; report: ProcessEvidenceReport}[] = [];
  let rejectedMutations = 0, rejectedHostConfigurations = 0;
  for (const capsule of capsules) {
    const expected = digestCanonical(capsule.evidence as unknown as JsonValue);
    for (const runtime of runtimes) {
      const verified = await command([...runtime.argv, "process", "verify-evidence", capsule.file], isolated);
      invariant(verified.code === 0, `${runtime.name} offline verification: ${verified.stderr || verified.stdout}`);
      const report = JSON.parse(verified.stdout) as ProcessEvidenceReport;
      invariant(report.ok && report.status === "complete" && report.receipts === 2 && report.generations === 2 &&
        report.digest === recovery.verification.bun.digest && report.evidenceDigest === expected, "portable verification report mismatch");
      verification.push({exporter: capsule.runtime, verifier: runtime.name, report});
      const bads = [structuredClone(capsule.evidence), structuredClone(capsule.evidence), structuredClone(capsule.evidence)];
      delete bads[0]!.records[capsule.evidence.head];
      delete bads[1]!.receipts[Object.keys(capsule.evidence.receipts)[0]! as keyof typeof capsule.evidence.receipts];
      bads[2]!.records[capsule.evidence.head]!.name = "forged-history";
      for (const [i, bad] of bads.entries()) {
        const file = join(directory, `tampered-${capsule.runtime}-${i}.json`);
        await writeFile(file, canonicalize(bad as unknown as JsonValue));
        const rejected = await command([...runtime.argv, "process", "verify-evidence", file], isolated);
        invariant(rejected.code !== 0, `${runtime.name} accepted tampered/omitted history`);
        rejectedMutations++;
      }
      const rejected = await command([...runtime.argv, "process", "verify-evidence", capsule.file, "--tools", join(moved, "offline-tools.json")], isolated);
      invariant(rejected.code !== 0, `${runtime.name} accepted host configuration during evidence verification`);
      rejectedHostConfigurations++;
    }
  }
  invariant((await readdir(isolated)).length === 0, "offline verification created a store or host state");
  invariant(before === digestCanonical(await inventory(moved)), "offline verification mutated retained source state");
  const report = {contract: "algal.process-evidence-demo.v1", ok: true, liveProvider: false,
    scenario: "Inspect a repaired process after moving its original store, adapter and ledger out of reach",
    adapterAdmissions: recovery.adapterAdmissions, validationInvocations: recovery.validationInvocations,
    sourcePathsRemoved: true, sourceStateUnchanged: true, offlineDirectoryEmpty: true,
    rejectedMutations, rejectedHostConfigurations, cliInvocations: calls, verification,
    evidenceDirectory: directory,
    limitation: "Replays recorded VM execution, not provider truth, patch attachments, custody transfer or activation. The coding adapter is a deterministic fixture."};
  if (output) await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2)); success = true;
} finally {
  if (success && !keep) await rm(directory, {recursive: true, force: true});
  else console.error(`Evidence retained: ${directory}${fixtureDirectory ? `; source: ${fixtureDirectory}` : ""}`);
}
