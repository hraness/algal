import { describe, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { admitArtifactManifest, admitCommittedArtifact, artifactInputs, publishArtifactFile, runArtifact } from "../artifact/run";
import { hashBytes, readFileBounded, readJson } from "../lib/files";
import { requireSuccess, runCommand } from "../lib/runner";

const root = resolve(import.meta.dir, "../..");

describe("expression artifact admission", () => {
  test("current source/lock/builder and shipped bytes match the closed manifest", async () => {
    const inputs = await artifactInputs(root);
    const bytes = await readFileBounded(root, "src/algal_expr.wasm", 16_777_216);
    const manifest = await readJson(root, "src/algal_expr.wasm.json");
    expect(() => admitArtifactManifest(manifest, inputs, bytes)).not.toThrow();
    const changedBytes = bytes.slice();
    // Binding admission rejects corruption without compiling untrusted bytes
    // in this caller. Actual ABI inspection runs in the supervised build child.
    changedBytes[0] = 255;
    expect(() => admitArtifactManifest(manifest, inputs, changedBytes)).toThrow();
  });
  test("real source, lockfile and builder edits reject the unchanged shipped artifact", async () => {
    const fixture = await mkdtemp(join(tmpdir(), "algal-artifact-stale-"));
    try {
      const inputs = await artifactInputs(root);
      for (const path of [...inputs.map(input => input.path), "src/algal_expr.wasm", "src/algal_expr.wasm.json"]) {
        await mkdir(dirname(join(fixture, path)), { recursive: true });
        await copyFile(join(root, path), join(fixture, path));
      }
      expect(await admitCommittedArtifact(fixture)).toEqual(inputs);
      for (const path of ["crates/algal-expr/src/lib.rs", "Cargo.lock", "scripts/build-expr-wasm.sh", "verify/artifact/run.ts"]) {
        const file = join(fixture, path), original = await readFile(file);
        await writeFile(file, Buffer.concat([original, Buffer.from("\n")]));
        await expect(admitCommittedArtifact(fixture)).rejects.toThrow("stale expression source");
        await writeFile(file, original);
      }
      // A valid empty custom section changes bytes while retaining all code,
      // imports and exports. This detects stale bytes beyond invalid magic.
      const wasmPath = join(fixture, "src/algal_expr.wasm");
      const original = await readFile(wasmPath);
      const changed = Buffer.concat([original, Buffer.from([0, 2, 1, 120])]);
      expect(hashBytes(changed)).not.toBe(hashBytes(original));
      await writeFile(wasmPath, changed);
      requireSuccess(await runCommand([process.execPath, "-e", "const b = await Bun.file(process.argv[1]).arrayBuffer(); if (!WebAssembly.validate(b)) process.exit(1);", wasmPath], fixture, { timeoutMs: 10_000, maxOutputBytes: 4096 }));
      await expect(admitCommittedArtifact(fixture)).rejects.toThrow("stale or altered expression WASM");
      await writeFile(wasmPath, original);
      expect(await admitCommittedArtifact(fixture)).toEqual(inputs);
    } finally { await rm(fixture, { recursive: true, force: true }); }
  });
  test("concurrent publication owns separate temporaries and preserves preexisting entries", async () => {
    const fixture = await mkdtemp(join(tmpdir(), "algal-artifact-publication-"));
    try {
      const target = join(fixture, "artifact"), existing = `${target}.tmp-${process.pid}`;
      await writeFile(existing, "preexisting");
      await Promise.all([publishArtifactFile(target, "first"), publishArtifactFile(target, "second")]);
      expect(["first", "second"]).toContain(await readFile(target, "utf8"));
      expect(await readFile(existing, "utf8")).toBe("preexisting");
      expect((await readdir(fixture)).sort()).toEqual(["artifact", `artifact.tmp-${process.pid}`].sort());
    } finally { await rm(fixture, { recursive: true, force: true }); }
  });
  test("wrong toolchain, empty evidence and handwritten artifact identity cannot pass", async () => {
    const inputs = await artifactInputs(root);
    const bytes = await readFileBounded(root, "src/algal_expr.wasm", 16_777_216);
    const manifest = await readJson(root, "src/algal_expr.wasm.json") as Record<string, unknown>;
    for (const patch of [{ contract: "future" }, { recipe: {} }, { inputs: [] }, { wasm: {} }, { extra: true }])
      expect(() => admitArtifactManifest({ ...manifest, ...patch }, inputs, bytes)).toThrow();
  });
  test("an explicit different compiler never falls back to an installed one", async () => {
    const previous = process.env.ALGAL_EXPR_TOOLCHAIN;
    process.env.ALGAL_EXPR_TOOLCHAIN = "unqualified";
    try { await expect(runArtifact(root)).rejects.toThrow("ALGAL_EXPR_TOOLCHAIN must be 1.97.1"); }
    finally {
      if (previous === undefined) delete process.env.ALGAL_EXPR_TOOLCHAIN;
      else process.env.ALGAL_EXPR_TOOLCHAIN = previous;
    }
  });
});
