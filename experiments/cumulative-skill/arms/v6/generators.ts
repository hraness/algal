import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import type { ExperimentTaskSpec } from "../../../../src/experiment-task";
import { asObject, type JsonObject, type JsonValue } from "../../../../src/values";

export type SeedTrainingExamples = { records: JsonObject[]; expected: JsonObject };

/** Only the declared training batch is available to the program writer. */
export function seedTrainingExamples(first: ExperimentTaskSpec): SeedTrainingExamples {
  const train = first.inputs.find((batch) => batch.split === "train");
  if (train === undefined) throw new Error(`${first.taskId}: no training examples`);
  return structuredClone({ records: train.records, expected: train.expect.out as unknown as JsonObject });
}

const SHAPE = `Emit {"manifest": <object>}: a complete algal.organism.v1 record-triage pipeline.
Use the library's input cell, edges, interface, and apply/summarize/pack expression programs. Copy those expression programs VERBATIM; they apply each task's rules generically.
Write the classify agent's instructions from the task taxonomy and the supplied labeled training examples. Compare the examples' text to their expected labels, infer a reusable classification procedure, and express that procedure clearly in the classify prompt. Do not merely copy the library's generic classification prompt. Do not encode record ids, complete example text, or lookup tables of training answers. The pipeline must generalize to new records and changing taxonomies.
The classify agent reads records and spec and returns a JSON object mapping every record id to a valid spec.taxonomy.classes id. Its output is {"kind":"json","schema":{"type":"object"}}.
Keep interface inputs records and spec bound to cell in, and output out bound to pack.out. Use the library's same deterministic processing cells and edges.
Root budgets: {"maxSteps":8,"maxAgentCalls":2,"maxWork":500000}. Agent budget: {"maxContextBytes":262144,"maxOutputBytes":262144,"maxEffectMs":600000}; view {"inputs":["records","spec"]}.
Use contract algal.organism.v1, a lowercase organism key, and lowercase kebab-case cell/port names. Return only {"manifest":{...}}.`;

/** The same writer definitions serve seeding and every matched arm. */
export function studyGenerator(file: "generator.algal.json" | "reviser.algal.json", training?: SeedTrainingExamples) {
  const revision = file === "reviser.algal.json";
  const names = revision ? ["task", "library", "training", "kept", "evidence"] : ["task", "library", "training"];
  const prompt = revision
    ? `${SHAPE}\nThis is a revision. The kept program and observed evidence show its previous behavior. Compare actual outputs with expected training outputs where supplied. Preserve working behavior and improve the classify instructions using those observations. Use only supplied evidence; do not assume success from the existence of a previous program.`
    : SHAPE;
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:record-triage-${revision ? "reviser" : "generator"}-v6`,
    name: `Record-triage ${revision ? "reviser" : "generator"} with training examples`,
    interface: {
      inputs: Object.fromEntries(names.map(name => [name, { cell: name, port: "value" }])),
      outputs: { manifest: { cell: "writer", port: "out" } },
    },
    cells: [
      ...names.map(id => ({ id, kind: "input", outputs: { value: "json" } })),
      { id: "writer", kind: "agent", inputs: Object.fromEntries(names.map(name => [name, "json"])),
        prompt, view: { inputs: names }, output: { kind: "json", schema: {
          type: "object", required: ["manifest"], properties: { manifest: { type: "object" } },
        } }, retry: { attempts: 2 },
        budget: { maxContextBytes: 262144, maxOutputBytes: 262144, maxEffectMs: 600000 } },
    ],
    edges: names.map(name => ({ from: { cell: name, port: "value" }, to: { cell: "writer", port: name } })),
    budgets: { maxSteps: names.length + 1, maxAgentCalls: 1, maxWork: 500000,
      maxContextBytes: 262144, maxOutputBytes: 262144, maxDepth: 4 },
  });
  const library = manifestToJson(parseOrganismManifest(JSON.parse(readFileSync(
    join(import.meta.dir, "../../pipeline/record-triage.algal.json"), "utf8",
  ))));
  const args: Record<string, JsonValue> = {
    library, training: training === undefined ? null : asObject(structuredClone(training), "training"),
  };
  return { manifest: manifestToJson(manifest), output: "manifest", field: "manifest", args };
}
