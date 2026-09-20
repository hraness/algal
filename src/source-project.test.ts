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
    expect(compileSource(loaded.source, loaded.compilerOptions)).toEqual({ manifest: loaded.manifest, sourceMap: loaded.sourceMap, modules: loaded.modules, analysis: loaded.analysis, project: loaded.project });
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
      expect(sourceError.diagnostic.source).toBe("entry.algal");
      expect(sourceError.diagnostic.message).toContain("missing.algal");
      expect(sourceError.diagnostic.message).toContain("ENOENT");
    }
  });
});

async function projectError(path: string): Promise<SourceError> {
  try { await loadSourceProject(path); }
  catch (error) { expect(error).toBeInstanceOf(SourceError); return error as SourceError; }
  throw new Error("invalid source project was accepted");
}

test("filesystem compiler errors retain the actual child source and the complete import chain", async () => {
  await temporary(async directory => {
    const entry = '// root\nimport middle from "./nested/middle.algal"\n' + program("root");
    const middle = '// middle\n\nimport leaf from "../leaf.algal"\n' + program("middle");
    await files(directory, { "entry.algal": entry, "nested/middle.algal": middle });
    for (const [result, expected, column] of [["@", "unsupported character", 10], [")", "expression", 10], ["42", "declares text", 10], ['generate "x" using "context"', "explicit effects", 1]] as const) {
      const leaf = `program leaf() -> text {\n  budget { max_agent_calls: 0 }\n  return ${result}\n}`;
      await writeFile(join(directory, "leaf.algal"), leaf);
      const error = await projectError(join(directory, "entry.algal"));
      expect(error.diagnostic.source).toBe("leaf.algal"); expect(error.sourceText).toBe(leaf);
      expect(error.diagnostic.message).toContain(expected); expect(error.diagnostic.message).not.toContain("middle.algal");
      expect(error.diagnostic.span.start.column).toBe(column);
      expect(error.diagnostic.span.start.line).toBe(column === 1 ? 1 : 3);
      expect(error.diagnostic.imports.map(frame => [frame.source, frame.path, frame.span.start.line, frame.span.start.column])).toEqual([
        ["entry.algal", "./nested/middle.algal", 2, 1], ["nested/middle.algal", "../leaf.algal", 3, 1],
      ]);
    }
  });
});

test("filesystem missing imports, invalid paths, and cycles point to the importer instead of an unread child", async () => {
  await temporary(async directory => {
    const entry = 'import middle from "./middle.algal"\n' + program("root");
    await files(directory, { "entry.algal": entry });
    for (const [path, expected] of [["./missing.algal", "ENOENT"], ["../outside.algal", "escapes"], ["./entry.algal", "cycle"]] as const) {
      const declaration = `import child from ${JSON.stringify(path)}`;
      const middle = `// middle\n\n${declaration}\n${program("middle")}`;
      await writeFile(join(directory, "middle.algal"), middle);
      const error = await projectError(join(directory, "entry.algal"));
      expect(error.diagnostic.source).toBe("middle.algal"); expect(error.sourceText).toBe(middle);
      expect(error.diagnostic.message).toContain(expected);
      expect(error.diagnostic.span.start).toEqual({ offset: middle.indexOf("import"), line: 3, column: 1 });
      expect(error.diagnostic.span.end).toEqual({ offset: middle.indexOf("import") + declaration.length, line: 3, column: declaration.length + 1 });
      expect(error.diagnostic.imports.map(frame => [frame.source, frame.path])).toEqual([["entry.algal", "./middle.algal"]]);
    }
    const missingEntry = await projectError(join(directory, "missing.algal"));
    expect(missingEntry.diagnostic.source).toBe("missing.algal"); expect(missingEntry.sourceText).toBeUndefined();
    expect(missingEntry.diagnostic.imports).toEqual([]); expect(missingEntry.diagnostic.span.start.line).toBe(1);
  });
});

test("invalid or excessive source bytes retain file identity without inventing decoded source", async () => {
  await temporary(async directory => {
    const entry = '// root\nimport child from "./child.algal"\n' + program("root");
    await files(directory, { "entry.algal": entry });
    for (const bytes of [new Uint8Array([0x61, 0xc0, 0x80]), Buffer.from(" ".repeat(SOURCE_BOUNDS.maxSourceBytes + 1))]) {
      await writeFile(join(directory, "child.algal"), bytes);
      const child = await projectError(join(directory, "entry.algal"));
      expect(child.diagnostic.source).toBe("child.algal"); expect(child.sourceText).toBeUndefined();
      expect(child.diagnostic.span).toEqual({ start: { offset: 0, line: 1, column: 1 }, end: { offset: 0, line: 1, column: 1 } });
      expect(child.diagnostic.imports.map(frame => [frame.source, frame.path, frame.span.start.line])).toEqual([["entry.algal", "./child.algal", 2]]);
      await writeFile(join(directory, "root.algal"), bytes);
      const rootError = await projectError(join(directory, "root.algal"));
      expect(rootError.diagnostic.source).toBe("root.algal"); expect(rootError.sourceText).toBeUndefined(); expect(rootError.diagnostic.imports).toEqual([]);
    }
  });
});

test("filesystem depth errors locate the rejecting declaration with bounded import ancestry", async () => {
  await temporary(async directory => {
    const sources: Record<string, string> = {};
    for (let depth = 0; depth <= 9; depth++) sources[`d${depth}.algal`] = `${depth < 9 ? `// depth\nimport child from "./d${depth + 1}.algal"\n` : ""}${program()}`;
    await files(directory, sources);
    const error = await projectError(join(directory, "d0.algal"));
    expect(error.diagnostic.source).toBe("d8.algal"); expect(error.sourceText).toBe(sources["d8.algal"]);
    expect(error.diagnostic.span.start.line).toBe(2); expect(error.diagnostic.span.start.column).toBe(1);
    expect(error.diagnostic.imports.map(frame => frame.source)).toEqual(Array.from({ length: 8 }, (_, index) => `d${index}.algal`));
    expect(error.diagnostic.importsTruncated).toBeUndefined();
    await writeFile(join(directory, "d8.algal"), program());
    await writeFile(join(directory, "detour.algal"), `import again from "./d1.algal"\n${program()}`);
    await writeFile(join(directory, "entry.algal"), `import first from "./d1.algal"\nimport later from "./detour.algal"\n${program()}`);
    const cached = await projectError(join(directory, "entry.algal"));
    expect(cached.diagnostic.source).toBe("detour.algal"); expect(cached.diagnostic.span.start.line).toBe(1);
    expect(cached.diagnostic.imports.map(frame => [frame.source, frame.path, frame.span.start.line])).toEqual([["entry.algal", "./detour.algal", 2]]);
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
