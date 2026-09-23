import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../lib/runner";
import { runBunInventory } from "../protocols/run";

test("protocol inventory requires every Bun file to exist and execute positive tests", async () => {
  const root = await mkdtemp(join(tmpdir(), "algal-protocol-inventory-"));
  const execute = (argv: string[], timeoutMs: number) => runCommand(argv, root, { timeoutMs, maxOutputBytes: 65_536 });
  try {
    await writeFile(join(root, "present.test.ts"), 'import {test,expect} from "bun:test"; test("present",()=>expect(1).toBe(1));\n');
    await writeFile(join(root, "second.test.ts"), 'import {test,expect} from "bun:test"; test("second",()=>expect(2).toBe(2));\n');
    await writeFile(join(root, "empty.test.ts"), "export {};\n");
    expect(await runBunInventory(root, ["present.test.ts", "second.test.ts"], execute)).toEqual([
      { path: "present.test.ts", tests: 1 }, { path: "second.test.ts", tests: 1 },
    ]);
    await expect(runBunInventory(root, ["present.test.ts", "missing.test.ts"], execute)).rejects.toThrow("ENOENT");
    await expect(runBunInventory(root, ["present.test.ts", "empty.test.ts"], execute)).rejects.toThrow();
    await expect(runBunInventory(root, [], execute)).rejects.toThrow("empty or duplicated");
    await expect(runBunInventory(root, ["present.test.ts", "present.test.ts"], execute)).rejects.toThrow("empty or duplicated");
  } finally { await rm(root, { recursive: true, force: true }); }
});
