/** Evidence-mutation lane source binding: exact inventory of governed files. */
import { hashBytes, inputBindings, readFileBounded } from "../lib/files";

export const SOURCE_FILES = [
  "fixtures.ts", "mutants.ts", "run.ts", "adapter.ts", "definition.ts",
  "mutation.test.ts", "SCOPE.md", "REGISTRATION.md",
];

export async function mutationDefinition(repositoryRoot: string, candidateRoot: string) {
  return {
    repository: await inputBindings(repositoryRoot),
    candidate: await Promise.all(SOURCE_FILES.map(async path => ({ path, sha256: hashBytes(await readFileBounded(candidateRoot, path)) }))),
  };
}
