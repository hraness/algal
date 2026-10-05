import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { manifestToJson, parseOrganismManifest } from "./contract";
import { digestCanonical } from "./digest";
import { clefExecutor } from "./clef";
import { gradeExperimentCase, parseExperimentTaskSpec, taskBatchArgs } from "./experiment-task";
import { builtinRegistry } from "./registry";
import { runOrganism } from "./run";
import { MemoryStore } from "./store";
import type { JsonObject, JsonValue } from "./values";

const directory = join(import.meta.dir, "..", "experiments", "cumulative-skill");
const load = (file: string) => JSON.parse(readFileSync(join(directory, file), "utf8")) as JsonValue;
const manifest = parseOrganismManifest(load("pipeline/record-triage-clef.algal.json"));
const child = parseOrganismManifest(load("pipeline/record-classify-clef.algal.json"));

test("Clef pipeline pins its separate child and preserves the taxonomy through the Cloudflare adapter", async () => {
  expect((manifest.cells.find(cell => cell.kind === "each") as { manifest: string }).manifest).toBe(digestCanonical(manifestToJson(child)));
  for (const file of readdirSync(join(directory, "tasks/acquisition")).filter(file => file.endsWith(".task.json")).sort()) {
    const task = parseExperimentTaskSpec(load(`tasks/acquisition/${file}`));
    const store = new MemoryStore();
    await store.putManifest(child);
    for (const batch of task.inputs) {
      const labels = new Map(batch.expect.out.results.map(record => [record.recordId, record.label]));
      let calls = 0;
      const executor = clefExecutor({ accountId: "a".repeat(32), credential: "fake-offline-token", fetch: async (_url, init) => {
        calls++;
        const body = JSON.parse(String(init?.body));
        const criteria = body.questions.answer.criteria as Record<string, null>;
        expect(Object.keys(criteria).sort()).toEqual(task.taxonomy.classes.map(c => c.id).sort());
        const choice = labels.get(body.state.context.inputs.record.id)!;
        expect(choice).toBeDefined();
        return Response.json({ success: true, result: { model: "clef", usage: { input_tokens: 12, output_tokens: 0 }, answers: { answer: { type: "choice", choice, confidence: 1, probabilities: Object.fromEntries(Object.keys(criteria).map(label => [label, label === choice ? 1 : 0])) } } } });
      } });
      const args: Record<string, Record<string, JsonValue>> = Object.create(null);
      for (const [name, value] of Object.entries(taskBatchArgs(task, batch))) {
        const target = manifest.interface!.inputs[name]!;
        (args[target.cell] ??= Object.create(null))[target.port] = value;
      }
      const receipt = await runOrganism({ manifest, args, fns: builtinRegistry(), store, executors: [executor] });
      expect(receipt.outcome).toBe("complete");
      expect(calls).toBe(batch.records.length);
      expect(receipt.effects.every(effect => effect.executor === "clef" && effect.configurationDigest !== undefined)).toBe(true);
      const outputs: JsonObject = Object.create(null);
      for (const [name, source] of Object.entries(manifest.interface!.outputs)) outputs[name] = receipt.cells[source.cell]!.outputs![source.port]!;
      expect(gradeExperimentCase(task, batch, outputs).passed).toBe(true);
    }
  }
});
