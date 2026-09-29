// The v7 writers take the v6 training examples plus a generation number, a
// predeclared round mode, and the bounded development score history.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "../../../../src/contract";
import { asObject, type JsonValue } from "../../../../src/values";
import { type SeedTrainingExamples } from "../v6/generators";
import { ROUND_MODES, ROUND_SCHEDULE, SEED_MAX_GENERATIONS, type RoundMode } from "./protocol";

export { seedTrainingExamples, type SeedTrainingExamples } from "../v6/generators";

/** One bounded development result the writer may see: never records, labels,
 * outputs, or summaries. */
export type DevelopmentScore = { generation: number; round: RoundMode; passed: number; total: number };

const SHAPE = `Emit {"manifest": <object>}: a complete algal.organism.v1 record-triage pipeline.
Use the library's input cell, edges, interface, and apply/summarize/pack expression programs. Copy those expression programs VERBATIM; they apply each task's rules generically.
Write the classify agent's instructions from the task taxonomy and the supplied labeled training examples. Compare the examples' text to their expected labels, infer a reusable classification procedure, and express that procedure clearly in the classify prompt. Do not merely copy the library's generic classification prompt. Do not encode record ids, complete example text, or lookup tables of training answers. The pipeline must generalize to new records and changing taxonomies.
The classify agent reads records and spec and returns a JSON object mapping every record id to a valid spec.taxonomy.classes id. Its output is {"kind":"json","schema":{"type":"object"}}.
Keep interface inputs records and spec bound to cell in, and output out bound to pack.out. Use the library's same deterministic processing cells and edges.
Root budgets: {"maxSteps":8,"maxAgentCalls":2,"maxWork":500000}. Agent budget: {"maxContextBytes":262144,"maxOutputBytes":262144,"maxEffectMs":600000}; view {"inputs":["records","spec"]}.
Use contract algal.organism.v1, a lowercase organism key, and lowercase kebab-case cell/port names. Return only {"manifest":{...}}.`;

const ROUNDS = `Inputs generation and round name this attempt in a fixed schedule of ${SEED_MAX_GENERATIONS} generations. Follow the named round mode:
contrastive-examples: pair training records with different labels and state the features that separate them.
error-analysis: explain each observed training error and correct the instruction that caused it.
invariant-extraction: state the properties every record of a class shares and write the procedure as those invariants.
counterexample-search: name records a naive rule would mislabel and add the rule that handles them.
minimal-rule-rewrite: rewrite the procedure as the shortest ordered rule list that reproduces the training labels.
fresh-synthesis: write a new procedure from the training examples alone.
Input development lists earlier attempts' scores on a separate development batch as {generation, round, passed, total}; it carries no records, labels, or outputs. A lower score after a change means the change did not generalize.`;

/** The same writer definitions serve seeding and every matched arm. */
export function studyGenerator(file: "generator.algal.json" | "reviser.algal.json", training?: SeedTrainingExamples) {
  const revision = file === "reviser.algal.json";
  const names = revision
    ? ["task", "library", "training", "generation", "round", "development", "kept", "evidence"]
    : ["task", "library", "training", "generation", "round", "development"];
  const prompt = revision
    ? `${SHAPE}\n${ROUNDS}\nThis is a revision. The kept program and observed evidence show its previous behavior. Compare actual outputs with expected training outputs where supplied. Preserve working behavior and improve the classify instructions using those observations. Use only supplied evidence; do not assume success from the existence of a previous program.`
    : `${SHAPE}\n${ROUNDS}`;
  const manifest = parseOrganismManifest({
    contract: "algal.organism.v1", key: `organism:record-triage-${revision ? "reviser" : "generator"}-v7`,
    name: `Record-triage ${revision ? "reviser" : "generator"} with training examples and round modes`,
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
    join(import.meta.dir, "../../pipeline/record-triage.algal.json"), "utf8"),
  )));
  // Learning arms reuse the seed's first-generation identity; the seed driver
  // overrides these per generation.
  const args: Record<string, JsonValue> = {
    library, training: training === undefined ? null : asObject(structuredClone(training), "training"),
    generation: 1, round: ROUND_SCHEDULE[0]!, development: [],
  };
  return { manifest: manifestToJson(manifest), output: "manifest", field: "manifest", args };
}

export function roundFor(generation: number): RoundMode {
  const round = ROUND_SCHEDULE[generation - 1];
  if (round === undefined || !ROUND_MODES.includes(round)) throw new Error(`v7 generators: no round for generation ${generation}`);
  return round;
}

/** Bounded score history in generation order, at most one entry per generation. */
export function developmentHistory(scores: DevelopmentScore[]): DevelopmentScore[] {
  if (scores.length > SEED_MAX_GENERATIONS) throw new Error("v7 generators: development history exceeds the generation limit");
  return scores.map((score, i) => {
    if (!Number.isInteger(score.generation) || score.generation < 1 || score.generation > SEED_MAX_GENERATIONS ||
      (i > 0 && score.generation <= scores[i - 1]!.generation) || roundFor(score.generation) !== score.round ||
      !Number.isInteger(score.total) || score.total < 1 || score.total > 64 ||
      !Number.isInteger(score.passed) || score.passed < 0 || score.passed > score.total) {
      throw new Error("v7 generators: invalid development score");
    }
    return { generation: score.generation, round: score.round, passed: score.passed, total: score.total };
  });
}
