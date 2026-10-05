import { readFileSync } from "node:fs";
import { clefExecutor, clefRequest, parseClefResponse, validateClefImages, type ClefImage, type ClefModel } from "../src/clef";
import { effectRequestDigest, replayExecutor, type EffectRequest } from "../src/effects";
import type { DecisionQuestions } from "../src/decisions";
import { digestCanonical } from "../src/digest";
import { AlgalError } from "../src/errors";
import { asJsonValue, type JsonObject, type JsonValue } from "../src/values";

export const fixture = JSON.parse(readFileSync(new URL("./fixtures/clef.json", import.meta.url), "utf8")) as {
  accountId: string; questions: DecisionQuestions; images: ClefImage[]; response: JsonObject;
  cases: { name: string; model: ClefModel; source: string; imageIndices: number[]; patch: Record<string, JsonValue>; error?: string }[];
  invalidImages: unknown[];
};

export async function clefFixture(): Promise<JsonValue> {
  const cases: JsonValue[] = [];
  for (const item of fixture.cases) {
    const envelope = structuredClone(fixture.response);
    for (const [path, value] of Object.entries(item.patch)) {
      const parts = path.slice(1).split("/");
      let target: JsonObject = envelope;
      for (const part of parts.slice(0, -1)) target = target[part] as JsonObject;
      target[parts.at(-1)!] = value;
    }
    const images = item.imageIndices.map(index => fixture.images[index]!);
    const configured = item.source === "configured" ? images : undefined;
    const request: EffectRequest = { contract: "algal.effect.v1", cellId: "probe", kind: "decide", prompt: "Evaluate the observation.", context: { inputs: { text: "東京 observation" }, turn: 0 }, output: { kind: "json", schema: {} }, budget: { maxContextBytes: 4096, maxOutputBytes: 4096 }, questions: fixture.questions, ...(item.source === "request" ? { images } : {}) };
    const state = { prompt: request.prompt, context: request.context };
    const body = clefRequest(item.model, asJsonValue(state, "state"), fixture.questions, request.images ?? configured);
    const executor = clefExecutor({ accountId: fixture.accountId, model: item.model, ...(configured ? { images: configured } : {}), credential: "fake-offline-token", fetch: async (_url, init) => {
      if (String(init?.body) !== JSON.stringify(body) && digestCanonical(JSON.parse(String(init?.body))) !== digestCanonical(body)) throw new Error("captured body differs");
      return Response.json(envelope);
    } });
    const configuration = { kind: "clef", accountId: fixture.accountId, model: item.model, images: configured ?? null };
    const requestDigest = effectRequestDigest(request);
    const receipt: JsonObject = { requestDigest, executor: executor.id, ...asJsonValue(await executor.receiptFor!(request), "metadata") as JsonObject };
    let parsed: JsonValue;
    try {
      parsed = asJsonValue(parseClefResponse(envelope, item.model, fixture.questions), "parsed");
      const execution = await executor.executeEffect!(request);
      receipt.output = execution.output;
      Object.assign(receipt, execution.metadata);
      if (item.error) throw new Error(`${item.name} accepted an invalid envelope`);
    } catch (error) {
      if (!(error instanceof AlgalError) || error.code !== item.error) throw error;
      parsed = { error: { code: error.code, message: error.message } };
      receipt.error = { code: error.code, message: error.message };
    }
    const replay = replayExecutor([receipt as unknown as Parameters<typeof replayExecutor>[0][number]]);
    const replayReceipt: JsonObject = { requestDigest, ...asJsonValue(await replay.receiptFor!(request), "replay metadata") as JsonObject };
    try { replayReceipt.output = await replay.execute(request); }
    catch (error) {
      if (!(error instanceof AlgalError)) throw error;
      replayReceipt.error = { code: error.code, message: error.message };
    }
    cases.push(asJsonValue({ name: item.name, request, body, parsed, configuration, configurationDigest: digestCanonical(configuration), cacheIdentity: executor.cacheIdentity, imageDigest: digestCanonical(images), receipt, replay: replayReceipt }, "case"));
  }
  const invalidImages = fixture.invalidImages.map(images => {
    try { validateClefImages(images); return false; } catch { return true; }
  });
  if (invalidImages.some(rejected => !rejected)) throw new Error("invalid image fixture was accepted");
  return { cases, invalidImages };
}
