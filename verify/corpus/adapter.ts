import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { hashJson } from "../lib/files";
import { retainEvidence } from "../lib/evidence-retention";
import { retainFailure } from "../lib/failure";
import { artifactIdentity } from "../traces/native";
import { corpusDefinition } from "./definition";
import { run, type Options } from "./run";
import { readmitCurrent, type Admission, type Authority } from "./readmit";
import { LIMITS } from "./schema";

export function nativeProfile(binary: string | undefined): Options & { native: string } {
  if (!binary || !isAbsolute(binary)) throw new Error("corpus requires explicit absolute ALGAL_CORPUS_NATIVE_BIN");
  return { profile: "native", native: binary };
}
export function admitFirstMatrix(value: Admission): void {
  if (value.status !== "admitted" || value.formalClaims !== 0 || value.sourceStatus !== "current-source-rehashed" || value.caseCount !== 115 || value.invocations !== 230 || value.observations !== 326)
    throw new Error("corpus first matrix requires current-source 115 cases, 230 commands and 326 observations");
}
/** Select authority before execution. No field from returned archive metadata selects a read. */
export async function runCorpus(root: string, selected: Options & { native: string }) {
  if (await realpath(join(root, "verify/corpus")) !== await realpath(import.meta.dir)) throw new Error("corpus repository/module root differs");
  if (selected.profile !== "native" || selected.rebuilt !== undefined || selected.replay !== undefined) throw new Error("registered corpus matrix is the complete native profile");
  const native = await artifactIdentity(selected.native);
  const options = nativeProfile(native.path);
  const archive = await mkdtemp(join(tmpdir(), "algal-corpus-expression-"));
  const authority: Authority = {
    definitionDigest: hashJson(await corpusDefinition(root, import.meta.dir)),
    artifacts: { bun: await artifactIdentity(process.execPath), committed: await artifactIdentity(join(root, "src/algal_expr.wasm")), native, rebuilt: null },
    candidateDirectory: import.meta.dir,
    recordedArchive: archive,
    options,
  };
  const selection = { resultsRoot: join(root, "verify/results"), suite: "corpus", sourceRoot: archive,
    recordedArchive: archive, authorityDigest: hashJson(authority),
    limits: { maxBytes: LIMITS.archiveBytes, maxFileBytes: LIMITS.recordBytes, maxEntries: LIMITS.retainedFiles + LIMITS.cases, maxDepth: 1 } };
  try {
    await run(options, archive);
    const evidence = await retainEvidence({ ...selection, classification: "admitted", readmit: async physicalRoot => {
      const admitted = await readmitCurrent(physicalRoot, authority, { repositoryRoot: root, candidateRoot: import.meta.dir });
      admitFirstMatrix(admitted); return admitted;
    } });
    return { admitted: evidence.admission, evidence, scope: "Finite independent expression value/error oracle and sampled Bun-wrapper/committed-WASM/native agreement. No build-provenance, exhaustive fuzzing, full production proof or Phase08-completion claim." };
  } catch (error) {
    return retainFailure(error, [async () => { await retainEvidence({ ...selection, classification: "diagnostic" }); }]);
  }
}
