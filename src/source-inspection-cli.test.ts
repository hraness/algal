import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const fixture = join(root, "examples/source/projects/ratios/ratios.algal");
async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

test("diagnose and focused diagram identify the exact failed batch item through the CLI", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-inspection-cli-"));
  try {
    const run = await cli("run", fixture, "--args", fixture.replace(".algal", ".args.json"), "--dir", dir);
    expect(run.code, run.stderr).toBe(1);
    const receipt = JSON.parse(run.stdout);
    const receiptPath = join(dir, "run.json");
    await writeFile(receiptPath, run.stdout);
    const diagnosis = await cli("diagnose", receiptPath, "--source", fixture);
    expect(diagnosis.code, diagnosis.stderr).toBe(0);
    const report = JSON.parse(diagnosis.stdout);
    expect(report.verification).toBe("digest-bound");
    expect(report.receiptDigest).toBe(receipt.digest);
    expect(report.rootManifestDigest).toBe(receipt.manifestDigest);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].path).toBe("result-each/i1/b1-fraction");
    expect(report.issues[0].location.source).toBe("ratio.algal");
    expect(report.issues[0].location.span.start.line).toBe(4);
    expect(report.issues[0].location.excerpt).toContain("sample.numerator / sample.denominator");
    expect(report.issues[0].callers[0].location.source).toBe("ratios.algal");
    const textPath = join(dir, "report.txt");
    const text = await cli("diagnose", receiptPath, "--source", fixture, "--format", "text", "--out", textPath);
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toBe("");
    expect(await readFile(textPath, "utf8")).toContain("ratio.algal:4");
    for (const [index, status] of [[0, "committed"], [1, "failed"]] as const) {
      const focused = await cli("diagram", fixture, "--receipt", receiptPath, "--focus", `result-each/i${index}`, "--format", "json", "--dir", dir);
      expect(focused.code, focused.stderr).toBe(0);
      const graph = JSON.parse(focused.stdout);
      expect(graph.receipt.digest).toBe(receipt.digest);
      expect(graph.manifestDigest).not.toBe(receipt.manifestDigest);
      expect(graph.nodes.find((node: { id: string }) => node.id === "b1-fraction").status).toBe(status);
      expect(graph.scope).toBeDefined();
    }
    const unstarted = await cli("diagram", fixture, "--receipt", receiptPath, "--focus", "result-each/i2", "--dir", dir);
    expect(unstarted.code).not.toBe(0);
    const definition = await cli("diagram", fixture, "--focus", "result-each/i2", "--format", "json", "--dir", dir);
    expect(definition.code, definition.stderr).toBe(0);
    const graph = JSON.parse(definition.stdout);
    expect(graph.receipt).toBeUndefined();
    expect(graph.nodes.every((node: { status?: string }) => node.status === undefined)).toBe(true);
    const verified = await cli("verify", receiptPath, fixture, "--dir", dir);
    expect(verified.code, verified.stderr).toBe(0);
    expect(await readFile(receiptPath, "utf8")).toBe(run.stdout);
    // A receipt document uses the receipt byte bound, not the much smaller
    // value-store blob bound. Extra JSON whitespace does not change identity.
    await writeFile(receiptPath, " ".repeat(300_000) + run.stdout);
    const large = await cli("diagnose", receiptPath, "--source", fixture);
    expect(large.code, large.stderr).toBe(0);
    expect(JSON.parse(large.stdout).receiptDigest).toBe(receipt.digest);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("inspection rejects malformed flags, tampering, and outputs that alias source or receipts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-inspection-invalid-"));
  try {
    const source = join(dir, "main.algal");
    await writeFile(source, 'program main() -> json { budget { max_agent_calls: 0 } return 1 / 0 }');
    const run = await cli("run", source, "--dir", dir);
    const receipt = join(dir, "receipt.json");
    await writeFile(receipt, run.stdout);
    for (const args of [
      ["diagnose", receipt],
      ["diagnose", receipt, "--source", source, "--format", "html"],
      ["diagnose", receipt, "--source", source, "--unknown"],
      ["diagnose", receipt, "--source", source, "--out", source],
      ["diagnose", receipt, "--source", source, "--out", receipt],
      ["diagnose", receipt, "--source"],
      ["diagram", source, "--focus"],
    ]) {
      const result = await cli(...args);
      expect(result.code, result.stderr).toBe(2);
    }
    expect((await cli("diagram", source, "--focus", "not-a-call")).code).not.toBe(0);
    const tampered = JSON.parse(run.stdout);
    tampered.failure.message = "changed";
    await writeFile(receipt, JSON.stringify(tampered));
    const rejected = await cli("diagnose", receipt, "--source", source);
    expect(rejected.code).not.toBe(0);
    expect(JSON.parse(rejected.stderr).message).toMatch(/digest/i);
    await writeFile(receipt, run.stdout);
    await writeFile(source, 'program main() -> json { budget { max_agent_calls: 0 } return 2 / 0 }');
    expect((await cli("diagnose", receipt, "--source", source)).code).not.toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
