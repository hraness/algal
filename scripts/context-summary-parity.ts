import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AlgalError } from "../src/errors";
import { boundedJsonSnapshot } from "../src/json-snapshot";
import { verifyProcessEvidence } from "../src/process-evidence";
import { asJsonValue, asObject, canonicalize, type JsonValue } from "../src/values";
import { contextSummaryVectors } from "./context-summary-vectors";
import golden from "./fixtures/context-summary.json";

const root = resolve(import.meta.dir, "..");
async function native(binary: string, args: string[], input?: JsonValue): Promise<{ value: JsonValue; status: number }> {
  const child = Bun.spawn([binary, ...args], { cwd: root, stdin: input === undefined ? "ignore" : "pipe", stdout: "pipe", stderr: "pipe", timeout: 20_000 });
  if (input !== undefined && child.stdin) { child.stdin.write(canonicalize(input)); child.stdin.end(); }
  const [output, diagnostic, status] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const report = output || (status !== 0 ? diagnostic : "");
  if (!report) throw new Error(`native summary verifier returned no JSON (${status}): ${args.join(" ")}`);
  return { value: boundedJsonSnapshot(JSON.parse(report) as unknown, { maxBytes: 262_144, maxDepth: 16, maxNodes: 16_384, maxEntries: 2_047, maxStringBytes: 16_384 }, "native summary report"), status };
}
async function referenceEvidence(value: unknown): Promise<JsonValue> {
  try { return asJsonValue(await verifyProcessEvidence(value), "portable verification report"); }
  catch (error) { if (!(error instanceof AlgalError)) throw error; return { ok: false, code: error.code }; }
}
export async function contextSummaryParity(): Promise<{ jobs: number; evidence: number; passed: true }> {
  const built = await contextSummaryVectors();
  if (canonicalize(built.golden) !== canonicalize(asJsonValue(golden, "frozen summary vectors"))) throw new Error("summary records or account charges differ from the frozen vectors");
  const compared = await native(process.env.ALGAL_CONTEXT_HISTORY_BIN ?? resolve(root, "target/debug/examples/context_history_parity"), [],
    asJsonValue({ summaryJobs: built.vectors.map(vector => vector.records) }, "summary records"));
  const expected = asJsonValue({ summaryJobs: built.vectors.map(vector => vector.result) }, "summary reports");
  if (compared.status !== 0 || canonicalize(compared.value) !== canonicalize(expected)) throw new Error(`native summary records differ: ${canonicalize(compared.value)}`);
  const dir = await mkdtemp(join(tmpdir(), "algal-context-summary-parity-"));
  let checks = 0;
  try {
    const artifacts = [...built.evidence];
    const alteredTool = structuredClone(built.evidence[0]!.value);
    alteredTool.tools["context-summary.finish.v1"]!.cost--;
    artifacts.push({ name: "altered-tool-cost", value: alteredTool });
    const alteredReceipt = structuredClone(built.evidence[0]!.value);
    Object.values(alteredReceipt.receipts)[0]!.work.units++;
    artifacts.push({ name: "altered-receipt", value: alteredReceipt });
    const alteredManifest = structuredClone(built.evidence[0]!.value);
    asObject(Object.values(alteredManifest.program.manifests)[0], "fixture manifest").name = "substituted manifest";
    artifacts.push({ name: "altered-manifest", value: alteredManifest });
    for (const artifact of artifacts) {
      const file = join(dir, `${artifact.name}.json`);
      await writeFile(file, canonicalize(asJsonValue(artifact.value, "portable summary evidence")), { flag: "wx" });
      const reference = await referenceEvidence(artifact.value);
      const report = await native(process.env.ALGAL_BIN ?? resolve(root, "target/debug/algal"), ["process", "verify-evidence", file]);
      const wanted = asObject(reference, "reference report");
      const received = asObject(report.value, "native report");
      const valid = artifact.name === "complete" || artifact.name === "failed";
      if (wanted.ok !== valid) throw new Error(`unexpected reference evidence outcome: ${artifact.name}`);
      if (wanted.ok === true) {
        if (report.status !== 0 || canonicalize(reference) !== canonicalize(report.value)) throw new Error(`portable summary evidence differs: ${artifact.name}`);
      } else {
        const code = asObject(received.error, "native refusal").code;
        const expectedReference = artifact.name === "altered-tool-cost" ? "RECEIPT_MISMATCH" : "DIGEST_MISMATCH";
        const expectedNative = artifact.name === "altered-tool-cost" ? "VERIFY_FAILED" : expectedReference;
        if (report.status === 0 || wanted.code !== expectedReference || code !== expectedNative) throw new Error(`portable refusal differs: ${artifact.name} (Bun ${String(wanted.code)}, native ${String(code)})`);
      }
      checks++;
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
  return { jobs: built.vectors.length, evidence: checks, passed: true };
}
if (import.meta.main) {
  if (Bun.argv.length !== 2) throw new Error("context summary parity accepts no arguments");
  console.log(JSON.stringify(await contextSummaryParity()));
}
