import { expect, test } from "bun:test";
import { link, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], {
    cwd: root, stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

const source = `program echo(message: text) -> text {
  budget { max_agent_calls: 0 }
  return message
}`;

test("source compiles, runs, verifies and renders through the CLI without providers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-source-cli-"));
  try {
    const file = join(dir, "echo.algal");
    const manifestPath = join(dir, "echo.algal.json");
    const mapPath = join(dir, "echo.map.json");
    await writeFile(file, source);
    const compiled = await cli("compile", file, "--out", manifestPath, "--source-map", mapPath);
    expect(compiled.code, compiled.stderr).toBe(0);
    expect(compiled.stdout).toBe("");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const mapping = JSON.parse(await readFile(mapPath, "utf8"));
    const argsPath = join(dir, "args.json");
    const input = manifest.interface.inputs.message;
    await writeFile(argsPath, JSON.stringify({ [input.cell]: { [input.port]: "Visible work." } }));
    const admitted = await cli("check", file, "--dir", dir);
    expect(admitted.code, admitted.stderr).toBe(0);
    const identity = JSON.parse((await cli("digest", file)).stdout).digest;
    expect(mapping.manifestDigest).toBe(identity);
    expect(JSON.parse((await cli("digest", manifestPath)).stdout).digest).toBe(identity);
    const run = await cli("run", file, "--args", argsPath, "--dir", dir);
    expect(run.code, run.stderr).toBe(0);
    const receipt = JSON.parse(run.stdout);
    expect(receipt.outcome).toBe("complete");
    expect(receipt.manifestDigest).toBe(identity);
    expect(receipt.effects).toHaveLength(0);
    const output = Object.values(manifest.interface.outputs)[0] as { cell: string; port: string };
    expect(receipt.cells[output.cell].outputs[output.port]).toBe("Visible work.");
    const receiptPath = join(dir, "receipt.json");
    await writeFile(receiptPath, run.stdout);
    const verified = await cli("verify", receiptPath, file, "--dir", dir);
    expect(verified.code, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout).ok).toBe(true);
    const mermaid = await cli("diagram", file);
    expect(mermaid.code, mermaid.stderr).toBe(0);
    expect(mermaid.stdout).toContain("flowchart");
    const svg = await cli("diagram", file, "--format", "svg", "--receipt", receiptPath);
    expect(svg.code, svg.stderr).toBe(0);
    expect(svg.stdout).toContain("<svg");
    expect(svg.stdout).toContain("COMMITTED");
    const graph = await cli("diagram", manifestPath, "--format", "json");
    expect(graph.code, graph.stderr).toBe(0);
    expect(JSON.parse(graph.stdout).nodes.length).toBeGreaterThan(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("new artifact commands reject invalid flags and input/output collisions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-source-cli-invalid-"));
  try {
    const file = join(dir, "echo.algal");
    await writeFile(file, source);
    await link(file, join(dir, "hardlink.algal"));
    await symlink(dir, join(dir, "alias"));
    for (const args of [
      ["compile", file, "--out", file],
      ["compile", file, "--out", join(dir, "same"), "--source-map", join(dir, "same")],
      ["compile", file, "--out", join(dir, "hardlink.algal")],
      ["compile", file, "--out", join(dir, "new.json"), "--source-map", join(dir, "alias/new.json")],
      ["compile", file, "--out"],
      ["compile", file, "--unknown"],
      ["diagram", file, "--format", "html"],
      ["diagram", file, "--out", file],
      ["diagram", file, "--receipt"],
    ]) {
      const result = await cli(...args);
      expect(result.code, result.stderr).toBe(2);
      expect(JSON.parse(result.stderr).error).toBe("PARSE_FAILED");
    }
    expect(await readFile(file, "utf8")).toBe(source);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("source syntax errors include a useful location through the CLI", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-source-cli-diagnostic-"));
  try {
    const file = join(dir, "bad.algal");
    await writeFile(file, "program broken() -> text {\n  return missing\n}");
    const result = await cli("compile", file);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr).message).toMatch(/2[: ,]|line 2/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
