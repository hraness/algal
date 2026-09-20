import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { digestText } from "./digest";

const root = resolve(import.meta.dir, "..");
async function cli(...args: string[]) {
  const child = Bun.spawn([process.execPath, "cli.ts", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { stdout, stderr, code };
}

test("source-loading commands report the actual imported error without writing an artifact", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-authoring-cli-"));
  try {
    await mkdir(join(dir, "helpers"));
    const entry = join(dir, "main.algal");
    const helper = `program draft(email: text) -> text {
  budget { max_agent_calls: 0 }

  return emial
}`;
    await writeFile(entry, `import draft from "./helpers/draft.algal"
program inbox(email: text) -> text {
  budget { max_agent_calls: 0 }
  return call draft using { email: email }
}`);
    await writeFile(join(dir, "helpers/draft.algal"), helper);
    const output = join(dir, "compiled.json");
    for (const [command, flags] of [
      ["compile", ["--out", output]], ["check", []], ["diagram", ["--format", "svg"]],
      ["digest", []], ["run", []],
    ] as const) {
      const actual = await cli(command, entry, ...flags, ...(command === "compile" ? [] : ["--dir", dir]));
      expect(actual.code, actual.stderr).toBe(2);
      expect(actual.stdout).toBe("");
      const error = JSON.parse(actual.stderr);
      expect(error.error).toBe("PARSE_FAILED");
      expect(error.message).toContain("helpers/draft.algal:4:");
      expect(error.message).toContain("emial");
      expect(error.diagnostic.contract).toBe("algal.source-error.v1");
      expect(error.diagnostic.source).toBe("helpers/draft.algal");
      expect(error.diagnostic.span.start.line).toBe(4);
      expect(error.diagnostic.sourceDigest).toBe(digestText(helper));
      expect(error.diagnostic.imports).toHaveLength(1);
      expect(error.diagnostic.imports[0].source).toBe("main.algal");
      expect(error.diagnostic.imports[0].path).toBe("./helpers/draft.algal");
      expect(error.diagnostic.imports[0].span.start.line).toBe(1);
      expect(JSON.stringify(error.diagnostic.excerpt)).toContain("return emial");
      expect(actual.stderr).not.toContain(dir);
      expect(error.diagnostic.sourceText).toBeUndefined();
    }
    expect(await Bun.file(output).exists()).toBe(false);
    const text = await cli("compile", entry, "--diagnostic-format", "text", "--out", output);
    expect(text.code, text.stderr).toBe(2);
    expect(text.stdout).toBe("");
    expect(text.stderr).toContain("helpers/draft.algal:4:");
    expect(text.stderr).toContain("return emial");
    expect(text.stderr).toContain("^^^^^");
    expect(text.stderr).toContain("main.algal:1:");
    expect(await Bun.file(output).exists()).toBe(false);
    expect(await readFile(join(dir, "helpers/draft.algal"), "utf8")).toBe(helper);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("missing imports identify the importing declaration under the explicit source root", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-authoring-import-"));
  try {
    await mkdir(join(dir, "app"));
    const file = join(dir, "app/main.algal");
    await writeFile(file, `// This location belongs to the importing file.
import helper from "../missing.algal"
program main() -> json { budget { max_agent_calls: 0 } return 1 }`);
    const result = await cli("check", file, "--source-root", dir, "--dir", join(dir, "store"));
    expect(result.code, result.stderr).toBe(2);
    const error = JSON.parse(result.stderr);
    expect(error.diagnostic.source).toBe("app/main.algal");
    expect(error.diagnostic.span.start.line).toBe(2);
    expect(error.diagnostic.message).toContain("missing.algal");
    expect(JSON.stringify(error.diagnostic.excerpt)).toContain("import helper");
    expect(error.diagnostic.imports).toEqual([]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("check exposes source attempt and depth bounds while manifest checks stay unchanged", async () => {
  const dir = await mkdtemp(join(tmpdir(), "algal-authoring-analysis-"));
  try {
    const file = join(root, "examples/source/projects/inbox/inbox.algal");
    const checked = await cli("check", file, "--dir", dir, "--diagnostic-format", "text");
    expect(checked.code, checked.stderr).toBe(0);
    expect(checked.stderr).toBe("");
    const sourceCheck = JSON.parse(checked.stdout);
    expect(sourceCheck.source).toEqual({ entry: "inbox.algal", files: 2, maxAgentCalls: 4, requiredDepth: 1 });
    const compiled = await cli("compile", file, "--diagnostic-format", "text");
    expect(compiled.code, compiled.stderr).toBe(0);
    const manifestPath = join(dir, "inbox.json");
    await writeFile(manifestPath, compiled.stdout);
    const manifestCheck = await cli("check", manifestPath, "--dir", dir);
    expect(manifestCheck.code, manifestCheck.stderr).toBe(0);
    const { source: _source, ...expected } = sourceCheck;
    expect(JSON.parse(manifestCheck.stdout)).toEqual(expected);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("diagnostic format validation and non-source errors retain their JSON contract", async () => {
  for (const flags of [["--diagnostic-format"], ["--diagnostic-format", "yaml"]]) {
    const invalid = await cli("compile", "missing.algal", ...flags);
    expect(invalid.code).toBe(2);
    expect(JSON.parse(invalid.stderr).error).toBe("PARSE_FAILED");
    expect(JSON.parse(invalid.stderr).message).toContain("diagnostic-format");
    expect(JSON.parse(invalid.stderr).diagnostic).toBeUndefined();
  }
  const missing = await cli("compile", "--diagnostic-format", "text");
  expect(missing.code).toBe(2);
  expect(JSON.parse(missing.stderr).message).toContain("usage:");
  const invalidManifest = await cli("check", "missing.json", "--diagnostic-format", "text");
  expect(invalidManifest.code).toBe(2);
  expect(JSON.parse(invalidManifest.stderr).diagnostic).toBeUndefined();
});
