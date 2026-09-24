import { MLCEngine, type AppConfig } from "@mlc-ai/web-llm";
import { LOCAL_CONFIG_SCHEMA, LOCAL_MODEL, localModelFailure, localModelPrompt, parseInferenceRequest, parseLocalModelOutput, type InferenceResponse, type LocalModelStage } from "./browser-inference-contract";

const modelConfig: AppConfig = {
  cacheBackend: "cache",
  model_list: [{
    model_id: LOCAL_MODEL.id,
    model: `https://huggingface.co/mlc-ai/${LOCAL_MODEL.id}/resolve/${LOCAL_MODEL.revision}/`,
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/025bcaf3780fa8254f5e5efd3bfea0a5397248f4/web-llm-models/v0_2_84/base/SmolLM2-360M-Instruct-q4f16_1_cs1k-webgpu.wasm",
    required_features: ["shader-f16"],
    overrides: { context_window_size: LOCAL_MODEL.contextTokens },
    integrity: {
      // Only config is hash-qualified here. Immutable URLs also pin the
      // tokenizer, shards and WASM; this is not full-artifact SHA verification.
      config: "sha256-tzKWmdb9v1pPaKDEKxQlD0vqssq7+hIPrmySTn3Njyw=",
      onFailure: "error",
    },
  }],
};

let engine: MLCEngine | undefined;
let busy = false;
let loaded = false;
const send = (response: InferenceResponse): void => postMessage(response);

self.onmessage = async (event: MessageEvent<unknown>): Promise<void> => {
  let id = 0;
  let ownsExecution = false;
  let stage: LocalModelStage = "loading";
  try {
    const request = parseInferenceRequest(event.data);
    id = request.id;
    if (busy) throw new Error("Local AI is busy");
    busy = true;
    ownsExecution = true;
    if (request.kind === "load") {
      if (!engine) engine = new MLCEngine({ appConfig: modelConfig, logLevel: "SILENT" });
      engine.setInitProgressCallback(progress => {
        if (/fetching|download/i.test(progress.text)) stage = "artifact-download";
        else if (/loading model|shader|pipeline|gpu/i.test(progress.text)) stage = "gpu-initialization";
        const fraction = Math.max(0, Math.min(1, Number.isFinite(progress.progress) ? progress.progress : 0));
        send({ id, kind: "progress", progress: { fraction, message: `Local AI ${stage}: ${Math.floor(fraction * 100)}%` } });
      });
      await engine.reload(LOCAL_MODEL.id);
      loaded = true;
      send({ id, kind: "loaded" });
    } else {
      if (!engine || !loaded) throw new Error("Local AI is not loaded");
      stage = "generation";
      // The bounded input remains inside this worker. WebLLM performs local
      // inference; no API key or remote inference endpoint exists in this path.
      const reply = await engine.chat.completions.create({
        messages: [{ role: "user", content: localModelPrompt(request.input) }],
        max_tokens: LOCAL_MODEL.outputTokens,
        temperature: 0,
        stream: false,
        response_format: { type: "json_object", schema: LOCAL_CONFIG_SCHEMA },
      });
      stage = "output-validation";
      if (reply.choices.length !== 1 || reply.choices[0]?.finish_reason !== "stop") throw new Error("Incomplete local AI result");
      const config = parseLocalModelOutput(reply.choices[0].message.content);
      send({ id, kind: "suggested", config });
    }
  } catch (error) {
    if (id > 0) send({ id, kind: "failed", message: localModelFailure(stage, error) });
    else throw new Error("Invalid local AI worker request");
  } finally {
    if (ownsExecution) busy = false;
  }
};
