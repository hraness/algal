import { hashBytes, inputBindings, readFileBounded } from "../lib/files";
export const SOURCE_FILES = ["schema.ts", "oracle.ts", "generate.ts", "shrink.ts", "worker.ts", "run.ts", "readmit.ts", "definition.ts", "adapter.ts", "archive-fixture.ts", "corpus.test.ts", "readmit.test.ts", "adapter.test.ts", "SCOPE.md", "README.md"];
export async function corpusDefinition(repositoryRoot: string, candidateRoot: string) {
  return { repository: await inputBindings(repositoryRoot), candidate: await Promise.all(SOURCE_FILES.map(async path => ({ path, sha256: hashBytes(await readFileBounded(candidateRoot, path)) }))) };
}
