# Optional browser-local inference

The browser application runs its deterministic application logic without a model.
Local AI is an explicit, optional download that proposes a bounded marketing
configuration. It cannot supply JavaScript, change storage policy, adopt its own
proposal, or call a remote inference provider. Application evaluation and adoption
remain independent of the model.

The site builds `@mlc-ai/web-llm` **0.2.85** into a separate dedicated worker. It is
a development dependency; the core package retains zero required runtime
dependencies. Importing the application does not start that worker or download
weights. The UI must invoke `loadLocalModel()` explicitly. `probeLocalModel()`
checks for a WebGPU adapter and `shader-f16`; this is availability evidence, not
proof that model loading or inference will succeed.

The fixed model is `mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC`, revision
`3a622fd89e0216e8bb10c410c007c786baa8a033`. The upstream model is Apache-2.0. It is
small enough to consider for constrained proposals, but its factual accuracy and
proposal usefulness require evaluation. [Publisher model card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct)

Public repository metadata reports 203,614,080 bytes in seven weight shards,
3,501,624 bytes for the config, one cache manifest and listed tokenizer files,
and 5,708,562 bytes for the matching model WASM: **212,824,266 bytes (about 203
MiB)** altogether. This excludes runtime JavaScript, transfer overhead and
temporary/cache copies. The estimate is not a measured browser download or disk
reservation. [Pinned model files](https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC/tree/3a622fd89e0216e8bb10c410c007c786baa8a033),
[pinned model library](https://github.com/mlc-ai/binary-mlc-llm-libs/blob/025bcaf3780fa8254f5e5efd3bfea0a5397248f4/web-llm-models/v0_2_84/base/SmolLM2-360M-Instruct-q4f16_1_cs1k-webgpu.wasm)

The upstream registry estimates 376.06 MB VRAM at its 4096-token context and
requires `shader-f16`. This adapter uses a 2048-token context and at most 256
output tokens; its actual memory use is device-dependent and unmeasured here.
[Versioned WebLLM registry](https://github.com/mlc-ai/web-llm/blob/v0.2.85/src/config.ts)

The worker requests JSON-schema-constrained output, then independently parses a
maximum 4096-byte response. Only `headline` (96 characters), `body` (280),
`ctaLabel` (32), and `layout` (`split` or `stack`) are accepted. Unknown fields,
invalid text and incomplete generation fail. Schema compliance is not evidence
of quality, factual truth or a beneficial application change.
[WebLLM schema example](https://github.com/mlc-ai/web-llm/blob/v0.2.85/examples/json-schema/src/json_schema.ts)

Only one load or generation may run at a time. Loading has a five-minute deadline
and generation a one-minute deadline. Abort, timeout, unload, worker failure or
invalid output terminates the worker, rejects the pending operation and requires
an explicit subsequent load. No automatic retries occur, and no partial result
is offered for adoption. Worker termination bounds cancellation even when a
runtime operation does not accept an `AbortSignal`.

WebLLM uses the browser Cache API for model artifacts. Loading may still need
the network if any runtime, tokenizer, model or application asset is absent.
A successful load does not prove that a later offline reload will succeed.
Model/library URLs are immutable, and the config has a checked SHA-256 integrity
value. This adapter does **not** claim SHA-256 verification of every weight shard,
tokenizer or model WASM. Cached weights are reproducible assets, separate from
the application's authoritative IndexedDB records. [WebLLM caching and worker
lifecycle](https://webllm.mlc.ai/docs/user/advanced_usage.html), [integrity scope](https://github.com/mlc-ai/web-llm/blob/v0.2.85/src/integrity.ts)

Alternatives remain useful. Transformers.js **4.3.0** added an experimental
structured-output companion for JSON/schema/regex and Safari 26+ WebGPU support;
it offers a broader pipeline ecosystem. Chrome's Prompt API now ships on the web
in Chrome 148 and supports schema constraints, but its hardware/storage criteria,
browser-managed model and lack of worker support make it an optional adapter,
not the baseline. [Transformers.js 4.3.0](https://github.com/huggingface/transformers.js/releases/tag/4.3.0),
[Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api)

Research and artifact metadata were checked on September 23, 2026. These source
facts and deterministic adapter tests do not qualify actual model inference,
offline operation or model quality on a browser/device. Record those separately
when running the built application.
