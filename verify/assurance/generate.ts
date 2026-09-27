/** Regenerate the committed assurance manifest from the live ledger and tree:
 *
 *     bun verify/assurance/generate.ts
 *
 * The manifest binds the exact governed/verification input set; any change to
 * a bound input intentionally invalidates it, so regeneration is part of the
 * evidence-refresh flow, not a way to pass off old evidence as new. */

import { realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseRegistry } from "../lib/claims";
import { readJson } from "../lib/files";
import { deriveManifest, MANIFEST_PATH } from "./manifest";

async function main(): Promise<void> {
  const root = await realpath(resolve(import.meta.dir, "..", ".."));
  const registry = parseRegistry(await readJson(root, "verify/properties.json"));
  const manifest = await deriveManifest(root, registry);
  await writeFile(join(root, MANIFEST_PATH), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${MANIFEST_PATH}: ${manifest.claims.length} claims bound`);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  });
}
