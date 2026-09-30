import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NativeMemoryQueryEngine } from "./application-native-memory";

test.skipIf(process.platform === "win32")("the existing SDK pin reaches the child and automatic updates stay disabled", async () => {
  const directory = await mkdtemp(join(tmpdir(), "algal-pinned-update-"));
  try {
    const executable = join(directory, "fixture");
    const script = '#!/bin/sh\nprintf "%s\\n" "$HRANESS_NO_UPDATE" "$ALGAL_EXPECTED_BINARY_SHA256" > "$0.env"\nprintf "{}\\n"\n';
    await writeFile(executable, script); await chmod(executable, 0o755);
    const expectedSha256 = createHash("sha256").update(script).digest("hex");
    const engine = new NativeMemoryQueryEngine({executable, expectedSha256});
    const snapshot = {contract: "algal.memory.v1", facts: []};
    const program = {contract: "algal.query.v1", rules: [], query: {relation: "available", terms: [{var: "x"}]}, limits: {maxWork: 100, maxRounds: 2, maxDerived: 2, maxBindings: 2, maxRows: 2, maxOutputBytes: 4096}};
    // The fixture only records transport settings; it deliberately has no
    // logical query implementation and its response is rejected normally.
    await engine.query(snapshot, program).catch(() => undefined);
    await engine.settle();
    expect(await readFile(`${executable}.env`, "utf8")).toBe(`1\n${expectedSha256}\n`);
    await writeFile(executable, script + "# changed bytes\n");
    await expect(engine.query(snapshot, program)).rejects.toThrow("Pinned native memory executable changed");
    await engine.settle();
  } finally { await rm(directory, {recursive: true, force: true}); }
});
