/** Synthetic protocol records for reader controls. These never claim target execution. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashBytes, hashJson, stableJson } from "../lib/files";
import { SOURCE_FILES } from "./definition";
import { SEEDS } from "./generate";
import { inputBytes, LIMITS, parseCase, VERSION } from "./schema";
import type { Authority } from "./readmit";
export async function syntheticArchive(root: string, profile: "local" | "native" | "full" = "native"): Promise<Authority> {
  const c = parseCase({ contract: "algal.corpus-case.v1", id: "synthetic-nine", domain: "grammar", program: 9 });
  const artifact = (name: string) => ({ path: `/authorized/tool/${name}`, bytes: 1, sha256: hashBytes(name) });
  const artifacts = { bun: artifact("bun"), committed: artifact("committed.wasm"), native: profile === "local" ? null : artifact("native"), rebuilt: profile === "full" ? artifact("rebuilt.wasm") : null };
  const definition = { repository: [{ path: "src/synthetic.ts", sha256: hashBytes("synthetic-source") }], candidate: SOURCE_FILES.map(path => ({ path, sha256: hashBytes(path) })) };
  const options = { profile, ...(artifacts.native ? { native: artifacts.native.path } : {}), ...(artifacts.rebuilt ? { rebuilt: artifacts.rebuilt.path } : {}), replay: "/authorized/cases/nine.json" };
  const authority: Authority = { definitionDigest: hashJson(definition), artifacts, candidateDirectory: "/authorized/candidate", recordedArchive: "/authorized/execution/archive", options, replayCase: c };
  const retained: { path: string; sha256: string }[] = [];
  let archiveBytes = 0, capturedOutputBytes = 0, invocations = 0;
  const retain = async (path: string, bytes: Uint8Array | string) => {
    await writeFile(join(root, path), bytes); archiveBytes += typeof bytes === "string" ? Buffer.byteLength(bytes) : bytes.byteLength;
    const row = { path, sha256: hashBytes(bytes) }; retained.push(row); return row;
  };
  const record = (path: string, value: unknown) => retain(path, stableJson(value) + "\n");
  await record("start.json", { contract: "algal.corpus-run-start.v1", version: VERSION, seeds: SEEDS, limits: LIMITS, options, definition, artifact: artifacts, cases: [c] });
  await mkdir(join(root, "case-0"));
  await record("case-0/case.json", c); const input = inputBytes(c); await retain("case-0/input.bin", input);
  const result = { fuel: 1, ok: true, value: 9 }, raw = JSON.stringify(result), outputs: Record<string, string> = {};
  const command = async (path: string, argv: string[], stdout: string) => {
    capturedOutputBytes += Buffer.byteLength(stdout); invocations++;
    await record(path, { command: argv, exitCode: 0, signal: null, timedOut: false, outputExceeded: false, cleanupObserved: true, stdout, stderr: "" });
  };
  for (const [target, artifact, mode] of [["committed-wasm", artifacts.committed, "both"], ...(artifacts.rebuilt ? [["rebuilt-wasm", artifacts.rebuilt, "raw"]] : [])] as const) {
    const binary = artifact as typeof artifacts.committed;
    await command(`case-0/${target}.command.json`, [artifacts.bun.path, `${authority.candidateDirectory}/worker.ts`, `${authority.recordedArchive}/case-0/case.json`, binary.path, mode as string],
      JSON.stringify({ contract: "algal.corpus-worker.v1", id: c.id, inputSha256: hashBytes(input), wasmSha256: binary.sha256, raw, bun: mode === "both" ? result : null }) + "\n");
    outputs[target as string] = raw;
    if (mode === "both") outputs["bun-wrapper"] = raw;
  }
  if (artifacts.native) { await command("case-0/native.command.json", [artifacts.native.path, "eval", `${authority.recordedArchive}/case-0/input.bin`], raw + "\n"); outputs.native = raw; }
  const retainedResult = await record("case-0/result.json", { id: c.id, domain: c.domain, inputSha256: hashBytes(input), expected: { ok: true, value: 9 }, targets: Object.keys(outputs), outputs });
  await record("result.json", { contract: "algal.corpus-expression-result.v1", profile, status: "passed", formalClaims: 0,
    relation: "finite independent value/error oracle and sampled expression target/wrapper agreement; build provenance separately required",
    definitionDigest: authority.definitionDigest, artifacts, inventoryDigest: hashJson([c]), caseCount: 1, grammarCount: 1, rawCount: 0, invocations, archive: authority.recordedArchive,
    archiveBytesBeforeSummary: archiveBytes, capturedOutputBytes, limits: LIMITS, rows: [{ id: c.id, domain: c.domain, inputSha256: hashBytes(input), result: retainedResult }], retained: [...retained] });
  return authority;
}
