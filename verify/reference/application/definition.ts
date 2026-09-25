import { hashBytes, inputBindings, readFileBounded } from "../../lib/files";

// Exact ordered definition inventory; a missing unfinished integration file fails closed.
export const SOURCE_FILES = [
  "schema.ts", "data.ts", "bun.ts", "oracle.ts", "generate.ts", "generate-runtime.ts", "shrink.ts", "controls.ts",
  "packet.ts", "bun-packet.ts", "retention.ts", "baseline.ts", "fixture-custody.ts", "fixture-custody.test.ts", "worker.ts", "bounded.ts", "archive.ts", "matrix.ts", "commands.ts",
  "definition.ts", "run.ts", "readmit.ts", "adapter.ts", "archive-fixture.ts", "synthetic-fixtures.ts", "bounded.test.ts", "archive.test.ts", "readmit.test.ts", "schema.test.ts", "SCOPE.md", "README.md",
];
export async function historyDefinition(repositoryRoot: string, referenceRoot: string) {
  return { repository: await inputBindings(repositoryRoot), reference: await Promise.all(SOURCE_FILES.map(async path => ({ path, sha256: hashBytes(await readFileBounded(referenceRoot, path)) }))) };
}
