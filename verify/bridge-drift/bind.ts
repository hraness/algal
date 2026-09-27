/** Regenerates verify/bridge-drift/bindings.json from the current tree.
 * Run only after the kani proofs have been re-verified against these inputs;
 * the recording asserts "this evidence describes this source", nothing more. */
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { computeBindings } from "./bindings";

async function main(): Promise<void> {
  const root = resolve(import.meta.dir, "../..");
  const bindings = await computeBindings(root);
  const target = join(root, "verify/bridge-drift/bindings.json");
  await writeFile(target, JSON.stringify(bindings, null, 2) + "\n");
  console.log(`recorded ${bindings.inputs.length} bridge inputs, ${bindings.symbols.length} proof-target symbols, ${bindings.harnesses.length} kani harnesses -> ${target}`);
}

if (import.meta.main) await main();
