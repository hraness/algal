# Private change brief with a retained human decision

This example runs a saved ALGAL graph through a selected native binary. Apple
Foundation Models can produce one short private brief from supplied change
evidence. The process then stops for human review. A later invocation publishes
that exact brief to a local mailbox and `publication.json` only after approval.
The continuation has no model executor. An exported evidence capsule verifies
without the original store, the Apple bridge, Python, or credentials.

The Python 3 harness is optional orchestration for this qualification demo. The
VM, graph admission, effects, durable wait, continuation, and portable evidence
verification all run in the native binary. This is separate from the native
`algal demo` deterministic workbench. It does not change that workbench's default.

## Start and leave the proposal waiting

Use native release `v0.2.0-vm.7` or newer, or build this source revision with
its locked `apple-foundation` v0.1.3 dependency. Build the separate bridge with
`scripts/build-apple.sh`; an older bridge can pass availability while speaking
an incompatible protocol. The harness checks protocol compatibility before
admitting inference. `algal doctor` reports the native build and package identity.

Use explicit absolute binary paths and a **new** root whose parent exists:

```sh
python3 scripts/apple_brief_demo.py start /absolute/new-private-brief \
  --native /absolute/algal \
  --apple-bridge /absolute/algal-apple \
  --evidence /absolute/change-evidence.json
```

This is the only command that admits Apple inference. Do not rerun it after an
error. Existing and partially initialized roots are refused and preserved.
Before creating the workflow or recording an inference attempt, the harness
checks the selected bridge's persistent JSON-line protocol. It sends an empty
prompt with a fresh request ID, which the pinned Swift parser rejects before
model access, and requires the exact echoed-ID `invalidRequest` response while
stdin is still open. An incompatible bridge leaves `preflight-error.json` and
no workflow or inference marker. Availability alone does not pass this check.
`report.json` contains the complete proposal, its digest, the recorded Apple
effect identity, and the suspended process head. It contains no approval.
Open `report.html` for the passive review page and exact approval/denial commands.
It loads no external assets and does not execute commands or contact a model.
`programs/` retains the exact data manifests and `args.json` the admitted input.

Review the actual generated `summary` and `reviewFocus`, plus the supplied
evidence, before deciding. Copy `proposalDigest` from that report:

```sh
python3 scripts/apple_brief_demo.py approve /absolute/new-private-brief \
  --proposal sha256:EXACT_DIGEST_FROM_REPORT \
  --action publish-local-report
```

Replace `approve` with `deny` to finish without publication. Wrong digests or
actions fail before a decision or mailbox write. A repeated identical decision
is idempotent; a conflicting decision is refused. The approval message binds
the entire proposal JSON, its exact mailbox delivery, workflow identity, root
incarnation, input evidence, and fixed local action. The model cannot set these
bindings. Publication is local; it does not deploy code or send a message.

## Inspect and verify with the native binary alone

The Python commands `inspect ROOT` and `export ROOT` produce convenient reports.
Equivalent native inspection and evidence commands are:

```sh
/absolute/algal process inspect private-brief --dir /absolute/new-private-brief/store
/absolute/algal process verify private-brief --dir /absolute/new-private-brief/store
/absolute/algal process export private-brief --dir /absolute/new-private-brief/store > private-brief.algal.json
/absolute/algal process verify-evidence private-brief.algal.json
```

The harness's actual continuation command is just:

```sh
/absolute/algal process tick private-brief --journal --dir /absolute/new-private-brief/store
```

It runs only after the separately retained, exact approval/denial is sent to the
admitted approval mailbox. It has no `--apple`, `--responses`, host configuration,
executor command, or effect-cache flag. Recorded inference is reused from the
checkpoint. Do not use raw tick to retry a failed or uncertain initial inference.
This harness does not recover or automatically retry unknown inference outcomes.

## Bounds and evidence claims

- Evidence is a JSON object, at most 2,048 canonical UTF-8 bytes, 128 nodes, depth
  8. Values may contain text, booleans, null, lists, objects, and safe integers;
  floats are intentionally outside this demo's small data contract.
- Model output is exactly two nonempty strings, `summary` and `reviewFocus`,
  each at most 768 UTF-8 bytes and together at most 1,024 canonical bytes. The
  harness checks this independently of model schema support.
- The graph allows one agent call, one turn, the default single attempt, a
  4,096-byte request context, and a 60-second effect deadline. Its shallow
  object/string schema is supported by the pinned bridge. There is no cloud
  fallback or account use.
- The native Apple adapter uses the pinned SDK's strict single-dispatch path:
  it does not resend a request after an I/O failure, downgrade the schema, or
  retry an Apple effect after an error or invalid output. One I/O deadline
  covers request writing and response reading after bridge startup; startup
  time is outside that deadline. An uncertain outcome remains unqualified.
- The protocol preflight has a three-second deadline and limits stdout and
  stderr to 4,096 bytes each. It requires clean EOF shutdown, kills and joins
  its own child on failure, and checks the bridge hash before and after the
  probe. `bridge-preflight.json` retains the bounded raw response and request;
  its digest is bound into the workflow definition and successful qualification.
  This proves local protocol compatibility, not successful model generation.
- `start` records a durable attempt marker before dispatch. A failure preserves
  `start-error.json`, native process state, and journal. Never interpret a ready,
  failed, or uncertain run as a completed Apple inference.
- `qualified.json` is retained only after bridge identity checks and exact
  suspended-result verification succeed. It binds the initial head, receipt,
  proposal, and effect. A missing marker after a crash leaves the outcome
  inspectable but unapprovable; the harness never reruns inference to fill it.
- A successful Apple report requires the exact retained request/output,
  `executor: apple:system`, `usage.model: apple/system`, and the expected Apple
  backend configuration digest. Selected native and bridge file hashes are
  retained; the bridge is checked immediately around initial dispatch. These
  are local execution observations, not hardware or provider attestation.
- The Apple model's availability check is distinct from actual generation.
  Receipt verification replays recorded effects; it does not verify the truth
  of model prose or recontact Apple. Outputs require human review.
- Byte limits are not token-count guarantees. Model availability, language,
  context limits, and OS model versions can affect generation. See Apple's
  [Foundation Models guide](https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models)
  and [SystemLanguageModel](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel).

The root stays bound to its canonical path and filesystem incarnation. Move
the portable capsule for review; moving the live root invalidates its host
custody. All capsule data, including the user-supplied evidence, remains visible
to someone you share it with. Treat a private brief's capsule as private too.

## Deterministic qualification

No model is needed for the branch, retention, binding, and evidence checks:

```sh
python3 scripts/test_apple_brief_demo.py \
  --native /absolute/algal \
  --out /absolute/new-fixture-results
```

The VM cases select only `--responses responses.json`. Separate task-owned
Python bridge fixtures check a correct persistent response, retired EOF framing,
silence, a wrong request ID or error, output bounds, and clean shutdown without
loading Apple frameworks or invoking a model. The qualifier checks exact
approval, denial, idempotency, no executor on resume, forged proposal/workflow/
delivery/action rejection in the graph itself, source-independent verification,
tamper rejection, and artifact path bounds. Its report explicitly says
`inferenceAttempted: false`. The bundled evidence is an illustrative fixture,
not a claim about a real release.

The saved graph and illustrative evidence are in `examples/vm/private-brief/`.
The optional harness and deterministic qualifier are `scripts/apple_brief_demo.py`
and `scripts/test_apple_brief_demo.py`. Run these commands from the repository root.
