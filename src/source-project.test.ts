import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadSourceProject } from "./source-project";
import { compileSource, SOURCE_BOUNDS, SOURCE_PROJECT_BOUNDS, SourceError } from "./source";

const program = (name = "fixture") => `program ${name}() -> text { budget { max_agent_calls: 0 } return "ok" }`;
const imports = (paths: string[], body = program()) => `${paths.map((path, index) => `import module${index} from ${JSON.stringify(path)};`).join("\n")}\n${body}`;
async function temporary(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "algal-source-project-"));
  try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function files(root: string, sources: Record<string, string | Uint8Array>): Promise<void> {
  for (const [key, source] of Object.entries(sources)) {
    const path = join(root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, source);
  }
}

test("source projects load siblings and nested relative imports into a closed deterministic source map", async () => {
  await temporary(async directory => {
    const source = imports(["./nested/worker.algal", "./shared.algal"]);
    await files(directory, {
      "entry.algal": source,
      "nested/worker.algal": imports(["../shared.algal", "./deeper/leaf.algal"], program("worker")),
      "nested/deeper/leaf.algal": program("leaf"),
      "shared.algal": program("shared"),
      "unused.algal": "this unrelated file is never read",
    });
    const loaded = await loadSourceProject(join(directory, "entry.algal"));
    expect(loaded.root).toBe(await realpath(directory));
    expect(loaded.entry).toBe("entry.algal"); expect(loaded.source).toBe(source);
    expect(Object.keys(loaded.sources).sort()).toEqual(["entry.algal", "nested/deeper/leaf.algal", "nested/worker.algal", "shared.algal"]);
    expect(loaded.files).toEqual(Object.keys(loaded.sources).sort().map(key => join(loaded.root, key)));
    expect(Object.isFrozen(loaded.sources)).toBe(true);
    expect(loaded.compilerOptions).toEqual({ entry: "entry.algal", modules: loaded.sources });
    expect(compileSource(loaded.source, loaded.compilerOptions).sourceMap.manifestDigest).toBe(loaded.sourceMap.manifestDigest);
    expect(loaded.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 0 });
  });
});

test("an explicit project root allows parent imports while the default remains the entry directory", async () => {
  await temporary(async directory => {
    await files(directory, { "apps/main.algal": imports(["../shared.algal"]), "shared.algal": program("shared") });
    await expect(loadSourceProject(join(directory, "apps/main.algal"))).rejects.toThrow(/root/);
    const loaded = await loadSourceProject(join(directory, "apps/main.algal"), { root: directory });
    expect(loaded.entry).toBe("apps/main.algal");
    expect(Object.keys(loaded.sources).sort()).toEqual(["apps/main.algal", "shared.algal"]);
    await expect(loadSourceProject(join(directory, "shared.algal"), { root: join(directory, "apps") })).rejects.toThrow(/outside/);
  });
});

test("loaded compiler options reproduce the digest-bound executable module closure", async () => {
  await temporary(async directory => {
    await files(directory, {
      "entry.algal": 'import echo from "./child.algal"; program main() -> text { budget { max_agent_calls: 0 } return call echo using {message: "hello"} }',
      "child.algal": 'program echo(message: text) -> text { budget { max_agent_calls: 0 } return message }',
    });
    const loaded = await loadSourceProject(join(directory, "entry.algal"));
    expect(loaded.modules).toHaveLength(1);
    expect(loaded.modules[0]?.name).toBe("echo");
    expect(loaded.analysis).toEqual({ maxAgentCalls: 0, requiredDepth: 1 });
    expect(compileSource(loaded.source, loaded.compilerOptions)).toEqual({ manifest: loaded.manifest, sourceMap: loaded.sourceMap, modules: loaded.modules, analysis: loaded.analysis });
    await writeFile(join(directory, "child.algal"), 'program echo(message: text) -> text { budget { max_agent_calls: 0 } return "changed" }');
    expect((await loadSourceProject(join(directory, "entry.algal"))).sourceMap.manifestDigest).not.toBe(loaded.sourceMap.manifestDigest);
  });
});

test("source imports reject escaping, absolute, URL, package, backslash, and non-source paths", async () => {
  await temporary(async directory => {
    for (const path of ["../outside.algal", "/tmp/file.algal", "https://example.com/file.algal", "package/file.algal", ".\\file.algal", "./file.json", "./bad\nname.algal"]) {
      await writeFile(join(directory, "entry.algal"), imports([path]));
      await expect(loadSourceProject(join(directory, "entry.algal")), path).rejects.toThrow(SourceError);
    }
    for (const entry of ["https://example.com/entry.algal", "file:entry.algal", "", "bad\0.algal"]) await expect(loadSourceProject(entry)).rejects.toThrow(SourceError);
  });
});

test("source projects reject leaf and intermediate symlinks but may canonicalize the project root", async () => {
  await temporary(async directory => {
    await files(directory, { "real/entry.algal": imports(["./leaf.algal"]), "real/leaf.algal": program("leaf"), "outside.algal": program("outside") });
    const root = join(directory, "real");
    await symlink(root, join(directory, "root-alias"));
    const loaded = await loadSourceProject(join(directory, "root-alias/entry.algal"));
    expect(loaded.root).toBe(await realpath(root));
    await symlink(join(directory, "outside.algal"), join(root, "linked.algal"));
    await expect(loadSourceProject(join(root, "linked.algal"))).rejects.toThrow(/symlink/);
    await writeFile(join(root, "entry.algal"), imports(["./linked.algal"]));
    await expect(loadSourceProject(join(root, "entry.algal"))).rejects.toThrow(/symlink/);
    await symlink(root, join(root, "nested"));
    await writeFile(join(root, "entry.algal"), imports(["./nested/leaf.algal"]));
    await expect(loadSourceProject(join(root, "entry.algal"))).rejects.toThrow(/symlink/);
  });
});

test("source projects reject nonregular files without opening a blocking stream", async () => {
  await temporary(async directory => {
    await mkdir(join(directory, "directory.algal"));
    await expect(loadSourceProject(join(directory, "directory.algal"))).rejects.toThrow(/regular file/);
    const mkfifo = Bun.which("mkfifo");
    if (process.platform !== "win32" && mkfifo) {
      const fifo = join(directory, "pipe.algal");
      const command = Bun.spawn([mkfifo, fifo], { stdout: "ignore", stderr: "pipe" });
      expect(await command.exited).toBe(0);
      await expect(loadSourceProject(fifo)).rejects.toThrow(/regular file/);
    }
  });
});

test("source projects reject cycles and report importing file and location for missing dependencies", async () => {
  await temporary(async directory => {
    await files(directory, { "entry.algal": imports(["./a.algal"]), "a.algal": imports(["./entry.algal"]) });
    await expect(loadSourceProject(join(directory, "entry.algal"))).rejects.toThrow(/cycle/);
    await writeFile(join(directory, "a.algal"), `${program()}\n`);
    await writeFile(join(directory, "entry.algal"), `// location\n${imports(["./missing.algal"])}`);
    try {
      await loadSourceProject(join(directory, "entry.algal"));
      throw new Error("missing import was accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(SourceError);
      const sourceError = error as SourceError;
      expect(sourceError.diagnostic.span.start.line).toBe(2);
      expect(sourceError.diagnostic.message).toContain("entry.algal");
      expect(sourceError.diagnostic.message).toContain("missing.algal");
      expect(sourceError.diagnostic.message).toContain("ENOENT");
    }
  });
});

test("source projects bound file bytes before parsing and reject invalid UTF-8", async () => {
  await temporary(async directory => {
    const entry = join(directory, "entry.algal");
    await writeFile(entry, " ".repeat(SOURCE_BOUNDS.maxSourceBytes + 1));
    await expect(loadSourceProject(entry)).rejects.toThrow(/65536.*bytes/);
    await writeFile(entry, new Uint8Array([0x61, 0xc0, 0x80]));
    await expect(loadSourceProject(entry)).rejects.toThrow(/UTF-8/);
    const source = program();
    await writeFile(entry, source.padEnd(SOURCE_BOUNDS.maxSourceBytes, " "));
    expect((await loadSourceProject(entry)).source.length).toBe(SOURCE_BOUNDS.maxSourceBytes);
  });
});

test("source projects bound unique files and total bytes without double-counting repeated imports", async () => {
  await temporary(async directory => {
    const sources: Record<string, string> = {};
    for (let index = 1; index < SOURCE_PROJECT_BOUNDS.maxFiles; index++) sources[`m${index}.algal`] = program(`module${index}`).padEnd(SOURCE_BOUNDS.maxSourceBytes, " ");
    sources["entry.algal"] = imports(Object.keys(sources).map(key => `./${key}`)).padEnd(SOURCE_BOUNDS.maxSourceBytes, " ");
    await files(directory, sources);
    const loaded = await loadSourceProject(join(directory, "entry.algal"));
    expect(loaded.files).toHaveLength(SOURCE_PROJECT_BOUNDS.maxFiles);
    expect(Object.values(loaded.sources).reduce((bytes, source) => bytes + Buffer.byteLength(source), 0)).toBe(SOURCE_PROJECT_BOUNDS.maxTotalBytes);
    await writeFile(join(directory, "entry.algal"), imports([...Object.keys(sources).filter(key => key !== "entry.algal").map(key => `./${key}`), "./extra.algal"]));
    await writeFile(join(directory, "extra.algal"), program("extra"));
    await expect(loadSourceProject(join(directory, "entry.algal"))).rejects.toThrow(/16 files/);
    await writeFile(join(directory, "entry.algal"), imports(["./m1.algal", "./m1.algal"]));
    expect((await loadSourceProject(join(directory, "entry.algal"))).files).toHaveLength(2);
    await writeFile(join(directory, "entry.algal"), imports(Array(SOURCE_PROJECT_BOUNDS.maxImports + 1).fill("./m1.algal")));
    await expect(loadSourceProject(join(directory, "entry.algal"))).rejects.toThrow(/import|collection/);
  });
});

test("source import depth is checked even when a shared dependency was loaded on a shorter path", async () => {
  await temporary(async directory => {
    const sources: Record<string, string> = {};
    for (let depth = 0; depth <= SOURCE_PROJECT_BOUNDS.maxImportDepth; depth++) sources[`d${depth}.algal`] = depth === SOURCE_PROJECT_BOUNDS.maxImportDepth ? program() : imports([`./d${depth + 1}.algal`]);
    await files(directory, sources);
    expect((await loadSourceProject(join(directory, "d0.algal"))).files).toHaveLength(SOURCE_PROJECT_BOUNDS.maxImportDepth + 1);
    await writeFile(join(directory, `d${SOURCE_PROJECT_BOUNDS.maxImportDepth}.algal`), imports(["./too-deep.algal"]));
    await writeFile(join(directory, "too-deep.algal"), program());
    await expect(loadSourceProject(join(directory, "d0.algal"))).rejects.toThrow(/depth/);
    // Load the shared chain shallowly first; its cached height must still count
    // when a second root import reaches that same chain through a detour.
    await writeFile(join(directory, `d${SOURCE_PROJECT_BOUNDS.maxImportDepth}.algal`), program());
    await files(directory, { "root.algal": imports(["./d1.algal", "./detour.algal"]), "detour.algal": imports(["./d1.algal"]) });
    await expect(loadSourceProject(join(directory, "root.algal"))).rejects.toThrow(/depth/);
  });
});
