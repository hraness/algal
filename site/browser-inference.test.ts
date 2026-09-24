import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, DEFAULT_SIGNALS } from "../examples/malleable-site/surface";
import { createLocalModelClient, type LocalModelWorker } from "./browser-inference";
import { LOCAL_CONFIG_SCHEMA, LOCAL_MODEL, LOCAL_PROMPT_VERSION, localModelFailure, localModelPrompt, parseInferenceRequest, parseInferenceResponse, parseLocalModelOutput, type InferenceRequest } from "./browser-inference-contract";

import { GENERATION_STYLE_BLOCK, GENERATION_STYLE_SHA256, GENERATION_STYLE_VERSION } from "./generation-style";

const input = { config: { ...DEFAULT_CONFIG }, signals: { ...DEFAULT_SIGNALS } };
class TestWorker implements LocalModelWorker {
  messages: InferenceRequest[] = [];
  terminated = false;
  onmessage: LocalModelWorker["onmessage"] = null;
  onerror: LocalModelWorker["onerror"] = null;
  onmessageerror: LocalModelWorker["onmessageerror"] = null;
  postMessage(message: InferenceRequest): void { this.messages.push(message); }
  terminate(): void { this.terminated = true; }
  respond(data: unknown): void { this.onmessage?.({ data }); }
}
function setup() {
  const workers: TestWorker[] = [];
  const client = createLocalModelClient(() => { const worker = new TestWorker(); workers.push(worker); return worker; });
  return { client, workers, current: () => workers.at(-1)! };
}

describe("optional browser-local inference", () => {
  test("constructing a client or requesting before opt-in does not start a worker", async () => {
    const { client, workers } = setup();
    expect(workers).toHaveLength(0);
    await expect(client.suggestConfig(input)).rejects.toThrow("Load the local model");
    const cancelled = new AbortController(); cancelled.abort();
    await expect(client.loadLocalModel(undefined, { signal: cancelled.signal })).rejects.toThrow("cancelled");
    expect(workers).toHaveLength(0);
  });

  test("one explicit load, bounded progress, one suggestion, no concurrent dispatch", async () => {
    const { client, current, workers } = setup();
    const progress: number[] = [];
    const loading = client.loadLocalModel(value => progress.push(value.fraction));
    const worker = current();
    await expect(client.loadLocalModel()).rejects.toThrow("busy");
    worker.respond({ id: 1, kind: "progress", progress: { fraction: 0.5, message: "Downloading" } });
    worker.respond({ id: 1, kind: "loaded" }); await loading;
    await client.loadLocalModel();
    expect(worker.messages).toEqual([{ id: 1, kind: "load" }]);
    const suggesting = client.suggestConfig(input);
    await expect(client.suggestConfig(input)).rejects.toThrow("busy");
    worker.respond({ id: 2, kind: "suggested", config: { ...DEFAULT_CONFIG, layout: "stack" } });
    expect((await suggesting).layout).toBe("stack");
    expect(worker.messages).toHaveLength(2);
    expect(workers).toHaveLength(1);
    expect(progress).toEqual([0.5]);
    client.unloadLocalModel();
    expect(worker.terminated).toBe(true);
  });

  test("abort during loading terminates the worker and requires an explicit reload", async () => {
    const { client, current, workers } = setup();
    const controller = new AbortController();
    const loading = client.loadLocalModel(undefined, { signal: controller.signal });
    const first = current();
    const lateResponse = first.onmessage;
    controller.abort();
    await expect(loading).rejects.toThrow("cancelled");
    expect(first.terminated).toBe(true);
    await expect(client.suggestConfig(input)).rejects.toThrow("Load the local model");
    expect(workers).toHaveLength(1);
    const reloading = client.loadLocalModel();
    lateResponse?.({ data: { id: 1, kind: "loaded" } });
    current().respond({ id: 2, kind: "loaded" }); await reloading;
    expect(workers).toHaveLength(2);
    client.unloadLocalModel();
  });

  test("abort during generation cannot publish a late result or automatically retry", async () => {
    const { client, current, workers } = setup();
    const loading = client.loadLocalModel(); current().respond({ id: 1, kind: "loaded" }); await loading;
    const worker = current();
    const controller = new AbortController();
    const suggestion = client.suggestConfig(input, { signal: controller.signal });
    const lateResponse = worker.onmessage;
    controller.abort();
    lateResponse?.({ data: { id: 2, kind: "suggested", config: DEFAULT_CONFIG } });
    await expect(suggestion).rejects.toThrow("cancelled");
    expect(worker.terminated).toBe(true);
    expect(worker.messages).toHaveLength(2);
    expect(workers).toHaveLength(1);
    await expect(client.suggestConfig(input)).rejects.toThrow("Load the local model");
  });

  test("invalid or unbound responses terminate without accepting a proposal", async () => {
    for (const response of [
      { id: 7, kind: "loaded" },
      { id: 1, kind: "suggested", config: DEFAULT_CONFIG },
      { id: 1, kind: "progress", progress: { fraction: 2, message: "Done" } },
      { id: 1, kind: "loaded", injected: true },
    ]) {
      const { client, current } = setup();
      const loading = client.loadLocalModel(); current().respond(response);
      await expect(loading).rejects.toThrow("invalid result");
      expect(current().terminated).toBe(true);
    }
  });

  test("worker failure and explicit unload settle pending operations", async () => {
    for (const mode of ["error", "unload", "failed"] as const) {
      const { client, current, workers } = setup();
      const loading = client.loadLocalModel();
      if (mode === "error") current().onerror?.();
      else if (mode === "unload") client.unloadLocalModel();
      else current().respond({ id: 1, kind: "failed", message: "Device lost" });
      await expect(loading).rejects.toThrow();
      expect(current().terminated).toBe(true);
      expect(workers).toHaveLength(1);
    }
  });
});

describe("local model data boundary", () => {
  test("the versioned public-writing instructions match the vendored shared block", async () => {
    const source = await Bun.file(new URL("../GENERATION_STYLE.md", import.meta.url)).text();
    const block = source.split("```text\n")[1]!.split("\n```")[0]!;
    expect(GENERATION_STYLE_BLOCK).toBe(block);
    expect(new Bun.CryptoHasher("sha256").update(block).digest("hex")).toBe(GENERATION_STYLE_SHA256);
    expect(LOCAL_PROMPT_VERSION).toContain(GENERATION_STYLE_VERSION);
    expect(localModelPrompt(input).startsWith(block + "\n\n")).toBe(true);
  });

  test("input and output reject unknown fields, executable proposals, excess bytes and text", () => {
    expect(parseLocalModelOutput(JSON.stringify(DEFAULT_CONFIG))).toEqual(DEFAULT_CONFIG);
    for (const value of [
      { ...DEFAULT_CONFIG, script: "alert(1)" },
      { ...DEFAULT_CONFIG, headline: "x".repeat(97) },
      { ...DEFAULT_CONFIG, body: "x".repeat(281) },
      { ...DEFAULT_CONFIG, ctaLabel: "x".repeat(33) },
      { ...DEFAULT_CONFIG, layout: "javascript" },
      { ...DEFAULT_CONFIG, body: "\u0000" },
      { ...DEFAULT_CONFIG, headline: " " },
    ]) expect(() => parseLocalModelOutput(JSON.stringify(value))).toThrow();
    expect(() => parseLocalModelOutput(" ".repeat(4097))).toThrow("byte limit");
    expect(() => parseLocalModelOutput("```json\n{}\n```" )).toThrow();
    expect(() => parseInferenceRequest({ id: 1, kind: "suggest", input: { ...input, url: "https://example.com" } })).toThrow();
    expect(() => parseInferenceRequest({ id: -1, kind: "load" })).toThrow();
    expect(() => parseInferenceResponse({ id: 1, kind: "failed", message: "x".repeat(241) })).toThrow();
  });

  test("request schema and prompt admit only the bounded component vocabulary", () => {
    const schema = JSON.parse(LOCAL_CONFIG_SCHEMA) as { additionalProperties: boolean; required: string[] };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["headline", "body", "ctaLabel", "layout"]);
    expect(localModelPrompt(input)).toContain(JSON.stringify(input));
    expect(localModelPrompt(input)).toContain('whole word "build" in headline, "preview" in body, "preview" in ctaLabel, and layout "split"');
    expect(localModelPrompt({ ...input, signals: { audience: "operators", release: "available" } })).toContain('whole word "operate" in headline, "available" in body, "explore" in ctaLabel, and layout "stack"');
    expect(localModelPrompt(input).length).toBeLessThan(5000);
    expect(LOCAL_MODEL.outputTokens).toBe(256);
    expect(LOCAL_MODEL.estimatedDownloadBytes).toBe(212_824_266);
  });

  test("failure diagnostics classify stages without revealing SDK URLs or application content", () => {
    for (const [error, code] of [
      [new Error("Unable to fetch https://secret.test/weights?token=sensitive received status 403"), "artifact-http-403"],
      [new DOMException("cache contains private prompt", "QuotaExceededError"), "storage-quota"],
      [new Error("Device was lost: private prompt"), "gpu-memory-or-device"],
      [new Error("unknown generated content"), "runtime-error"],
    ] as const) {
      const diagnostic = localModelFailure("artifact-download", error);
      expect(diagnostic).toContain(code);
      expect(diagnostic.length).toBeLessThanOrEqual(240);
      expect(diagnostic).not.toContain("secret.test");
      expect(diagnostic).not.toContain("sensitive");
      expect(diagnostic).not.toContain("private prompt");
      expect(diagnostic).not.toContain("generated content");
    }
    expect(localModelFailure("output-validation", new Error("bad"))).toContain("incomplete-or-invalid-output");
  });
});
