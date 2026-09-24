# Browser-local inference reference

**Preview.** In the [browser workspace](https://algal.computer/grow/), select
**Download & load local AI** to generate marketing content and layout suggestions
on your device. The application also works without a model. It checks each
suggestion before adoption; the model cannot supply JavaScript, change storage
policy, adopt its own proposal, or call a remote inference provider.

The site bundles `@mlc-ai/web-llm` **0.2.85** into a dedicated worker. WebLLM is a
development dependency; the core package has zero required runtime dependencies.
Importing the application starts no worker or model download. `loadLocalModel()`
starts loading when you request it. `probeLocalModel()` checks for a WebGPU adapter
and `shader-f16`; loading can still fail if device memory or runtime compatibility
is insufficient.

## Model and download size

The model is `mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC`, pinned to revision
`3a622fd89e0216e8bb10c410c007c786baa8a033`. The upstream model uses the Apache-2.0
license. [Publisher model card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct)

Repository metadata lists 203,614,080 bytes in seven weight files, 3,501,624 bytes
for the configuration, one cache manifest, and tokenizer files, and 5,708,562
bytes for the model's WebAssembly library. The total is **212,824,266 bytes
(about 203 MiB)**. This metadata estimate excludes runtime JavaScript, transfer
overhead, and temporary/cache copies; it is not a measured download or reserved
disk space. [Pinned model files](https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC/tree/3a622fd89e0216e8bb10c410c007c786baa8a033),
[pinned model library](https://github.com/mlc-ai/binary-mlc-llm-libs/blob/025bcaf3780fa8254f5e5efd3bfea0a5397248f4/web-llm-models/v0_2_84/base/SmolLM2-360M-Instruct-q4f16_1_cs1k-webgpu.wasm)

WebLLM's registry estimates 376.06 MB of GPU memory for its 4096-token context
and requires `shader-f16`. This adapter uses a 2048-token context and allows at
most 256 output tokens. Its memory use depends on the device and has not been
measured. [Versioned WebLLM registry](https://github.com/mlc-ai/web-llm/blob/v0.2.85/src/config.ts)

## Request limits

The proposal prompt version is
`algal.browser-proposal/v2+hraness-generation-style/v1`. It includes the shared
generation-style block from
[`hraness/.github` at `4ad062fb4c81b85064b17b3d80003570c70e2dcb`](https://github.com/hraness/.github/blob/4ad062fb4c81b85064b17b3d80003570c70e2dcb/GENERATION_STYLE.md).

The worker requests JSON that follows a schema, then parses a response of at
most 4096 bytes. It accepts these fields:

| Field | Limit |
| --- | --- |
| `headline` | 96 characters |
| `body` | 280 characters |
| `ctaLabel` | 32 characters |
| `layout` | `split` or `stack` |

Unknown fields, invalid text, and incomplete generation fail. These checks
establish the output's shape; factual accuracy, writing quality, and usefulness
need separate evaluation. [WebLLM schema example](https://github.com/mlc-ai/web-llm/blob/v0.2.85/examples/json-schema/src/json_schema.ts)

Only one load or generation can run at a time. Loading has a five-minute
deadline; generation has a one-minute deadline. Abort, timeout, unload, worker
failure, or invalid output terminates the worker and rejects the pending
operation. Another attempt requires a new load. Nothing retries automatically,
and partial results cannot be adopted. Termination also cancels runtime work
that does not accept an `AbortSignal`.

## Caching and integrity

WebLLM stores model files in the browser Cache API. A later load needs the network
if a runtime, tokenizer, model, or application file is missing. The model and
library URLs are pinned to immutable versions. The adapter verifies the
configuration's SHA-256 integrity value; it does not verify SHA-256 hashes for
every weight file, tokenizer, or model WebAssembly library. Cached weights can be
downloaded again and are separate from application records in IndexedDB.
[WebLLM caching and worker lifecycle](https://webllm.mlc.ai/docs/user/advanced_usage.html),
[integrity scope](https://github.com/mlc-ai/web-llm/blob/v0.2.85/src/integrity.ts)

## Status and limits

On 23 September 2026, the adapter produced two suggestions with networking
disabled on an arm64 Mac running macOS 26.5.2 and Chromium 151.0.7922.34. An
offline browser reload and cached-model reload separated the suggestions. The
cached run made zero remote requests. All 17 browser test groups passed with
no uncaught errors. These results cover execution and offline reopening on
that configuration with the earlier prompt. See the
[browser test record](https://github.com/hraness/algal/pull/69) for the status of
each prompt version. Suggestion quality and other devices need their own tests.

## Other browser inference APIs

The following alternatives reflect releases and documentation available on
23 September 2026. Transformers.js **4.3.0** added an experimental structured-output
companion for JSON, schemas, and regular expressions, plus Safari 26+ WebGPU
support. It provides pipelines for a wider range of model tasks.
[Transformers.js 4.3.0](https://github.com/huggingface/transformers.js/releases/tag/4.3.0)

Chrome's Prompt API ships on the web in Chrome 148 and supports schema
constraints. Its hardware and storage requirements, browser-managed model, and
lack of worker support would require a separate optional adapter.
[Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
