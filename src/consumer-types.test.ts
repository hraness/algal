import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
async function checkTypes(file: string, listFiles = false) {
  const compiler = Bun.spawn([process.execPath, resolve(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--noUnusedLocals", "--noUnusedParameters", "--strict", "--exactOptionalPropertyTypes", "--noUncheckedIndexedAccess", "--lib", "ES2022", "--skipLibCheck", "--allowImportingTsExtensions", "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "bundler", "--types", "bun", ...(listFiles ? ["--listFiles"] : []), file], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(compiler.stdout).text(), new Response(compiler.stderr).text(), compiler.exited]);
  return { code, stdout, stderr };
}

test("public TypeScript imports support consumers with unused-symbol checks", async () => {
  expect(await checkTypes(resolve(root, "index.ts"))).toEqual({ code: 0, stdout: "", stderr: "" });
}, 30_000);

test("public process and task subpaths do not introduce browser DOM globals", async () => {
  await mkdir(join(root, ".algal"), { recursive: true });
  const directory = await mkdtemp(join(root, ".algal", "consumer-types-"));
  try {
    const file = join(directory, "consumer.ts");
    await writeFile(file, [
      'export { parseProcessRecord, type ProcessRecord } from "@hraness/algal/process";',
      'export { verifyProcessEvidence } from "@hraness/algal/process-evidence";',
      'export type { RuntimeJournal, JournalBinding, JournalTicket } from "@hraness/algal/runtime-journal-contract";',
      'export { compileTask, runTask } from "@hraness/algal/task";',
      'export { MemoryStore } from "@hraness/algal/store-memory";',
      'export type { Store } from "@hraness/algal/store-contract";',
      '// @ts-expect-error This consumer has no browser document.',
      'export type BrowserDocument = typeof document;',
      '// @ts-expect-error IndexedDB is confined to the browser adapters.',
      'export type BrowserDatabase = typeof indexedDB;',
    ].join("\n"));
    const result = await checkTypes(file, true);
    expect({ code: result.code, stderr: result.stderr, diagnostics: result.stdout.split("\n").filter(line => /error TS\d+/.test(line)) }).toEqual({ code: 0, stderr: "", diagnostics: [] });
    expect(result.stdout).not.toMatch(/[/\\]lib\.dom(?:\.[^/\\]+)?\.d\.ts/);
    for (const module of ["process", "process-evidence", "runtime-journal-contract", "task"]) {
      expect(result.stdout).toContain(resolve(root, `src/${module}.ts`));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
