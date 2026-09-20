import { expect, test } from "bun:test";
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
    expect(JSON.parse(graph.stdout).source).toBeUndefined();
    const annotated = await cli("diagram", file, "--format", "json");
    expect(annotated.code, annotated.stderr).toBe(0);
    expect(JSON.parse(annotated.stdout).source.digest).toBe(mapping.sourceDigest);
    const withSource = await cli("diagram", manifestPath, "--source", file, "--format", "json");
    expect(withSource.code, withSource.stderr).toBe(0);
    expect(JSON.parse(withSource.stdout)).toEqual(JSON.parse(annotated.stdout));
    expect((await cli("diagram", manifestPath, "--source", file, "--out", file)).code).not.toBe(0);
    await writeFile(file, source.replace("return message", 'return "changed"'));
    const mismatched = await cli("diagram", manifestPath, "--source", file);
    expect(mismatched.code).not.toBe(0);
    expect(JSON.parse(mismatched.stderr).message).toContain("does not compile to this manifest");
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
      ["diagram", file, "--source"],
      ["diagram", file, "--source", file],
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

test("source projects run, inspect, verify and bundle their full closure through the CLI", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-project-cli-"));
  try {
    const sources = join(dir, "source");
    await mkdir(sources);
    const file = join(sources, "main.algal");
    const child = join(sources, "echo.algal");
    await writeFile(child, `program echo(emailText: text) -> text {
      budget { max_agent_calls: 0 }
      return emailText
    }`);
    await writeFile(file, `import echo from "./echo.algal"
    program inbox(subject: text, messages: json) -> json {
      budget { max_agent_calls: 0 }
      let first = call echo using { emailText: subject }
      let rest = each echo over emailText in messages using {} max_items 3
      return { first: first, rest: rest }
    }`);
    const manifestPath = join(dir, "main.algal.json");
    const bundlePath = join(dir, "main.bundle.json");
    const compile = await cli("compile", file, "--out", manifestPath, "--bundle-out", bundlePath);
    expect(compile.code, compile.stderr).toBe(0);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
    expect(Object.keys(bundle.manifests)).toHaveLength(2);
    expect(JSON.parse((await cli("digest", file)).stdout).digest).toBe(bundle.root);
    for (const command of ["check", "explain", "tool-def"]) {
      const inspected = await cli(command, file, "--dir", join(dir, command));
      expect(inspected.code, inspected.stderr).toBe(0);
    }
    const packed = await cli("pack", file, "--dir", join(dir, "pack"));
    expect(packed.code, packed.stderr).toBe(0);
    expect(JSON.parse(packed.stdout)).toEqual(bundle);
    const graph = await cli("diagram", file, "--format", "json", "--dir", join(dir, "diagram"));
    expect(graph.code, graph.stderr).toBe(0);
    const view = JSON.parse(graph.stdout);
    expect(view.nodes.filter((node: { kind: string }) => node.kind === "organism" || node.kind === "each")).toHaveLength(2);
    expect(view.nodes.flatMap((node: { inputs: { type: unknown }[] }) => node.inputs).every((port: { type: unknown }) => port.type !== null)).toBe(true);
    const annotated = await cli("diagram", manifestPath, "--source", file, "--format", "json", "--dir", join(dir, "annotated"));
    expect(annotated.code, annotated.stderr).toBe(0);
    expect(JSON.parse(annotated.stdout)).toEqual(view);
    const args: Record<string, Record<string, unknown>> = {};
    for (const [name, value] of Object.entries({ subject: "Preview", messages: ["One", "Two"] })) {
      const end = manifest.interface.inputs[name];
      (args[end.cell] ??= {})[end.port] = value;
    }
    const argsPath = join(dir, "args.json");
    await writeFile(argsPath, JSON.stringify(args));
    const run = await cli("run", file, "--args", argsPath, "--dir", join(dir, "run"));
    expect(run.code, run.stderr).toBe(0);
    const receipt = JSON.parse(run.stdout);
    const output = Object.values(manifest.interface.outputs)[0] as { cell: string; port: string };
    expect(receipt.cells[output.cell].outputs[output.port]).toEqual({ first: "Preview", rest: ["One", "Two"] });
    const receiptPath = join(dir, "receipt.json");
    await writeFile(receiptPath, run.stdout);
    const verified = await cli("verify", receiptPath, file, "--dir", join(dir, "verify"));
    expect(verified.code, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout).ok).toBe(true);
    await writeFile(child, 'program echo(emailText: text) -> text { budget { max_agent_calls: 0 } return "Changed" }');
    const mismatched = await cli("diagram", manifestPath, "--source", file, "--dir", join(dir, "changed"));
    expect(mismatched.code).not.toBe(0);
    expect(JSON.parse(mismatched.stderr).message).toContain("does not compile to this manifest");
    await rm(sources, { recursive: true });
    const offline = await cli("call", bundlePath, "--args", argsPath, "--dir", join(dir, "offline"));
    expect(offline.code, offline.stderr).toBe(0);
    expect(JSON.parse(offline.stdout).outputs[output.cell][output.port]).toEqual({ first: "Preview", rest: ["One", "Two"] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("source artifact outputs cannot overwrite imported files or each other", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-project-collision-"));
  try {
    const file = join(dir, "main.algal");
    const child = join(dir, "echo.algal");
    await writeFile(file, 'import echo from "./echo.algal" program main() -> text { budget { max_agent_calls: 0 } return call echo using { message: "Hi" } }');
    await writeFile(child, source);
    const alias = join(dir, "child-alias.json");
    await link(child, alias);
    const output = join(dir, "output.json");
    for (const args of [
      ["compile", file, "--out", child],
      ["compile", file, "--bundle-out", alias],
      ["compile", file, "--source-map", child],
      ["compile", file, "--out", output, "--bundle-out", output],
      ["compile", file, "--bundle-out"],
      ["diagram", file, "--out", alias],
    ]) {
      const result = await cli(...args);
      expect(result.code, result.stderr).toBe(2);
      expect(JSON.parse(result.stderr).error).toBe("PARSE_FAILED");
    }
    expect(await readFile(child, "utf8")).toBe(source);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("an explicit source root admits sibling imports without escaping the project", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-project-root-"));
  try {
    await mkdir(join(dir, "entry"));
    const file = join(dir, "entry/main.algal");
    await writeFile(file, 'import echo from "../echo.algal" program main() -> text { budget { max_agent_calls: 0 } return call echo using { message: "Hi" } }');
    await writeFile(join(dir, "echo.algal"), source);
    expect((await cli("compile", file)).code).toBe(2);
    const compiled = await cli("compile", file, "--source-root", dir);
    expect(compiled.code, compiled.stderr).toBe(0);
    const graph = await cli("diagram", file, "--source-root", dir, "--format", "json", "--dir", join(dir, "store"));
    expect(graph.code, graph.stderr).toBe(0);
    expect(JSON.parse(graph.stdout).source).toBeDefined();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
