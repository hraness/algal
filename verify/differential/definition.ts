/** Differential lane source binding: exact inventory of governed files,
 * matching the corpus definition shape (whole-repository bindings plus the
 * lane's own files). */
import { hashBytes, inputBindings, readFileBounded } from "../lib/files";

export const SOURCE_FILES = [
  "cases.ts", "canonical.ts", "engine.ts", "gen.ts", "json.ts", "oracle.ts",
  "prng.ts", "run.ts", "shrink.ts", "wasm.ts", "worker.ts",
  "definition.ts", "adapter.ts", "differential.test.ts", "SCOPE.md", "REGISTRATION.md",
];

export async function differentialDefinition(repositoryRoot: string, candidateRoot: string) {
  return {
    repository: await inputBindings(repositoryRoot),
    candidate: await Promise.all(SOURCE_FILES.map(async path => ({ path, sha256: hashBytes(await readFileBounded(candidateRoot, path)) }))),
  };
}
