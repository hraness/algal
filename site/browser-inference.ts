import { type SurfaceConfig } from "../examples/malleable-site/surface";
import { LOCAL_MODEL, parseInferenceResponse, parseLocalModelInput, type InferenceRequest, type LocalModelInput, type LocalModelProgress } from "./browser-inference-contract";

export { LOCAL_MODEL, type LocalModelInput, type LocalModelProgress } from "./browser-inference-contract";
export type LocalModelOptions = { signal?: AbortSignal };
export type LocalModelAvailability = { available: boolean; reason: string; estimatedDownloadBytes: number };

/** An adapter probe only. It never starts a worker, downloads a model or
 * requests a GPU device. Inference remains optional when this returns false. */
export async function probeLocalModel(): Promise<LocalModelAvailability> {
  const result = (available: boolean, reason: string): LocalModelAvailability => ({ available, reason, estimatedDownloadBytes: LOCAL_MODEL.estimatedDownloadBytes });
  const browser = globalThis as typeof globalThis & { isSecureContext?: boolean; navigator?: { gpu?: { requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null> } } };
  if (!browser.navigator || !browser.isSecureContext) return result(false, "Local AI needs a secure browser context.");
  const gpu = browser.navigator.gpu;
  if (!gpu) return result(false, "WebGPU is unavailable. The application still works without local AI.");
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return result(false, "No WebGPU adapter is available.");
    if (!adapter.features.has("shader-f16")) return result(false, "This model needs the WebGPU shader-f16 feature.");
    return result(true, "WebGPU is available. Model loading will check device memory and runtime compatibility.");
  } catch {
    return result(false, "The browser could not access a WebGPU adapter.");
  }
}

// Structural seam also allows deterministic cancellation/protocol tests without
// importing WebLLM, starting a real worker or requesting any network resources.
export interface LocalModelWorker {
  postMessage(message: InferenceRequest): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onmessageerror: (() => void) | null;
}
type Pending = {
  id: number;
  kind: "load" | "suggest";
  resolve(value: SurfaceConfig | undefined): void;
  reject(reason: Error): void;
  cleanup(): void;
  progress?: (progress: LocalModelProgress) => void;
};

export function createLocalModelClient(makeWorker: () => LocalModelWorker) {
  let worker: LocalModelWorker | undefined;
  let pending: Pending | undefined;
  let loaded = false;
  let nextId = 0;

  function stop(reason: Error): void {
    const active = worker;
    worker = undefined;
    loaded = false;
    if (active) {
      active.onmessage = null;
      active.onerror = null;
      active.onmessageerror = null;
      active.terminate();
    }
    const request = pending;
    pending = undefined;
    if (request) { request.cleanup(); request.reject(reason); }
  }

  function getWorker(): LocalModelWorker {
    if (worker) return worker;
    const instance = makeWorker();
    worker = instance;
    instance.onerror = () => { if (worker === instance) stop(new Error("Local AI stopped. Load the model explicitly to try again.")); };
    instance.onmessageerror = () => { if (worker === instance) stop(new Error("Local AI returned an unreadable message.")); };
    instance.onmessage = event => {
      if (worker !== instance) return;
      try {
        const response = parseInferenceResponse(event.data);
        const request = pending;
        if (!request || request.id !== response.id) throw new Error("Unexpected local AI response");
        if (response.kind === "failed") { stop(new Error(response.message)); return; }
        if (response.kind === "progress") {
          if (request.kind !== "load") throw new Error("Unexpected local AI progress");
          request.progress?.(response.progress);
          return;
        }
        if ((response.kind === "loaded") !== (request.kind === "load")) throw new Error("Unexpected local AI result");
        pending = undefined;
        request.cleanup();
        loaded = true;
        request.resolve(response.kind === "suggested" ? response.config : undefined);
      } catch {
        stop(new Error("Local AI returned an invalid result. Nothing was adopted."));
      }
    };
    return instance;
  }

  function request(kind: "load" | "suggest", input: LocalModelInput | undefined, progress: ((progress: LocalModelProgress) => void) | undefined, options: LocalModelOptions): Promise<SurfaceConfig | undefined> {
    if (options.signal?.aborted) return Promise.reject(new DOMException("Local AI cancelled", "AbortError"));
    if (pending) return Promise.reject(new Error("Local AI is busy. Wait or cancel the current operation."));
    if (kind === "load" && loaded) return Promise.resolve(undefined);
    if (kind === "suggest" && !loaded) return Promise.reject(new Error("Load the local model before requesting a suggestion."));
    if (nextId === Number.MAX_SAFE_INTEGER) return Promise.reject(new Error("Local AI request limit reached. Reload the page."));
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const abort = () => stop(new DOMException("Local AI cancelled", "AbortError"));
      const timer = setTimeout(() => stop(new Error("Local AI timed out. No suggestion was adopted; reload the model to try again.")), kind === "load" ? LOCAL_MODEL.loadTimeoutMs : LOCAL_MODEL.generationTimeoutMs);
      pending = {
        id, kind, resolve, reject,
        cleanup() { clearTimeout(timer); options.signal?.removeEventListener("abort", abort); },
        ...(progress ? { progress } : {}),
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      try {
        const instance = getWorker();
        if (kind === "load") instance.postMessage({ id, kind });
        else instance.postMessage({ id, kind, input: parseLocalModelInput(input) });
      } catch {
        stop(new Error("Local AI could not start. Nothing was adopted."));
      }
    });
  }

  return {
    async loadLocalModel(onProgress?: (progress: LocalModelProgress) => void, options: LocalModelOptions = {}): Promise<void> {
      await request("load", undefined, onProgress, options);
    },
    async suggestConfig(input: LocalModelInput, options: LocalModelOptions = {}): Promise<SurfaceConfig> {
      const value = parseLocalModelInput(input);
      const result = await request("suggest", value, undefined, options);
      if (!result) throw new Error("Local AI returned no suggestion");
      return result;
    },
    unloadLocalModel(): void { stop(new DOMException("Local AI unloaded", "AbortError")); },
  };
}

// Worker construction is deferred until the owner explicitly chooses Load.
const client = createLocalModelClient(() => {
  const actual = new Worker(new URL("./browser-inference-worker.js", import.meta.url), { type: "module", name: "algal-local-model" });
  const port: LocalModelWorker = {
    postMessage: message => actual.postMessage(message),
    terminate: () => actual.terminate(),
    onmessage: null, onerror: null, onmessageerror: null,
  };
  actual.onmessage = event => port.onmessage?.({ data: event.data as unknown });
  actual.onerror = () => port.onerror?.();
  actual.onmessageerror = () => port.onmessageerror?.();
  return port;
});
export const loadLocalModel = client.loadLocalModel;
export const suggestConfig = client.suggestConfig;
export const unloadLocalModel = client.unloadLocalModel;
