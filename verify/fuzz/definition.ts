/** Fuzz lane source binding: exact inventory of governed files. The lane
 * also depends on the differential lane's generator/oracle/shrink modules,
 * which are bound separately through the differential definition. */
import { hashBytes, inputBindings, readFileBounded } from "../lib/files";

export const SOURCE_FILES = [
  "mutate.ts", "run.ts", "adapter.ts", "definition.ts",
  "fuzz.test.ts", "SCOPE.md", "REGISTRATION.md",
];

export async function fuzzDefinition(repositoryRoot: string, candidateRoot: string) {
  return {
    repository: await inputBindings(repositoryRoot),
    candidate: await Promise.all(SOURCE_FILES.map(async path => ({ path, sha256: hashBytes(await readFileBounded(candidateRoot, path)) }))),
  };
}
