import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { hashJson } from "../../lib/files";
import { retainEvidence } from "../../lib/evidence-retention";
import { retainFailure } from "../../lib/failure";
import { artifactIdentity } from "../../traces/native";
import { historyDefinition } from "./definition";
import { RELATION } from "./matrix";
import { readmitCurrent, type Authority } from "./readmit";
import { runHistorySlice } from "./run";
import { LIMITS } from "./bounded";

export async function runApplicationHistorySlice(root: string, binary: string | undefined) {
  if (!binary || !isAbsolute(binary)) throw new Error("application-history-slice requires explicit absolute ALGAL_APPLICATION_HISTORY_BIN");
  if (await realpath(join(root, "verify/reference/application")) !== await realpath(import.meta.dir)) throw new Error("Application history repository/module identity differs");
  const archive = await mkdtemp(join(tmpdir(), "algal-application-history-slice-"));
  const authority: Authority = { definitionDigest: hashJson(await historyDefinition(root, import.meta.dir)), artifacts: { bun: await artifactIdentity(process.execPath), native: await artifactIdentity(binary) }, referenceDirectory: import.meta.dir, recordedArchive: archive };
  const selection = { resultsRoot: join(root, "verify/results"), suite: "application-history-slice", sourceRoot: archive,
    recordedArchive: archive, authorityDigest: hashJson(authority),
    limits: { maxBytes: LIMITS.archiveBytes, maxFileBytes: LIMITS.recordBytes, maxEntries: LIMITS.physicalEntries, maxDepth: LIMITS.archiveDepth } };
  try {
    await runHistorySlice(root, archive, authority);
    const evidence = await retainEvidence({ ...selection, classification: "admitted", readmit: async physicalRoot => {
      const admission = await readmitCurrent(physicalRoot, authority, { repositoryRoot: root, referenceRoot: import.meta.dir });
      if (admission.histories !== 4 || admission.baselineWorkers !== 16 || admission.baselineCommandObservations !== 384 || admission.mutants !== 5 || admission.sourceStatus !== "current-source-rehashed" || admission.formalClaims !== 0) throw new Error("Application history fixed matrix incomplete");
      const { retained: _retained, ...summary } = admission; return summary;
    } });
    return { admission: evidence.admission, evidence, relation: RELATION };
  } catch (error) {
    return retainFailure(error, [async () => { await retainEvidence({ ...selection, classification: "diagnostic" }); }]);
  }
}
