# Design notes

## The claim

An agentic workflow has two kinds of decisions. The ones that can be decided
statically — routing, what context a step may see, how much work is allowed —
belong in structure. The ones that need judgment belong in bounded cells.
Morphogen puts the first kind in a typed graph and gives the second kind a
declared boundary, so a run is a thing that can be replayed and audited rather
than a transcript that has to be trusted.

## Decisions and where they came from

**The manifest carries no code.** `fn` cells name refs resolved by the host
registry; agent cells carry prompts and contracts, not programs. A manifest is
therefore safe to store, diff, embed, and verify. (From Platonik: a name is an
inspectable definition, never a free computation.)

**Ports are typed and single-assignment — unless declared `many`.** `text`,
`json`, `choice`. A guard is either `{equals}` on a choice producer or
`{field, equals}` on a json producer — routing on a record's field is
structure too, not a reason to add a classifier. A `many` input collects
every delivered edge in manifest order, so fan-in — including conditional
fan-in through guards — is structure, not convention. The check happens at
admission — an invalid graph never runs. (From Platonik's port contracts.)

**Context is a view, not a stuffing.** An agent cell declares which of its
inputs enter the effect request (`view.inputs`), and may also name ancestor
cells (`view.cells`) whose committed records join the request under
`context.cells` — an entry may slice to named ports, so a producer's secret
output never reaches a consumer that doesn't need it. With `view.graph`, the
context also carries the edges among the named cells and into the viewer —
the agent sees the wiring of what it can see. Admission rejects
non-ancestors and undeclared ports, so a cell can never read a record that
has not committed — the graph declares the slice, and the executor sees
exactly those bytes, bounded. A composable view language over the whole
program graph remains deferred; v1 views are per-cell and ancestor-only.

**Agents call back through declared tools.** `cell.tools` names registry fns
the executor may invoke mid-activation; a `{"tool","inputs"}` response runs
the fn, appends to `context.toolLog`, and re-issues the request, bounded by
`budget.maxTurns`. The agent gains reach only into fns the manifest declares
— the structure carries the capability, not the prompt.

**Effects are receipts.** Request digest binds request to response. Replay
fixes recorded receipts and re-runs the orchestration deterministically, which
is what `verify` checks. (From writing-factory's rule: orchestration is
deterministic after model receipts are fixed.)

**Skips are first-class.** A cell whose required inputs resolve empty is
skipped, and deadness propagates. That is what makes guarded routing work
without a scheduler that guesses.

**Failure is data when the graph says so.** A failed cell records
`status:"failed"` with `{code, message}`; an `on:"fail"` edge delivers that
record to a `json` consumer, and a cell with a declared fail edge is
handled — the run continues. With none, the run fails closed. Whether a
failure is survivable is decided at admission, not discovered at runtime —
and it composes: an unhandled inner failure fails the enclosing `organism`
cell, which an outer fail edge can catch.

**Organisms embed by digest.** An `organism` cell references a manifest hash
resolved from the store. Composition preserves cost and exposes only declared
interface ports — symbolization without magic. Because a manifest can never
contain its own digest, embedding graphs are acyclic by construction; the
run still bounds nesting depth via the root manifest's `maxDepth`.
`pack`/`unpack` turn that embedding graph into a portable artifact: a bundle
is the root manifest plus every manifest it reaches plus every `const`-ref'd
payload, digest-keyed and verified on install — the whole closure moves
between stores as data. A `via` field on an embedding cell names a transport
(`--transports` maps names to bundle sources); on a local miss the closure
arrives through it, verified the same way. This is the honest half of remote
organisms: remote *resolution*, local execution — no signature needed because
the digest is the authentication. Delegating the run itself to a remote host
(trusting someone else's receipt) is what needs signed identity, and stays
deferred to Valhalla.

**Retry is re-issue, not repair.** `retry: {"attempts": n}` on an effect cell
means: on a failed effect, record the attempt — error or contract violation,
request digest and all — then issue the *same* request again. The digest is
unchanged because the request is unchanged; the receipt's ordered effects
list is what lets replay serve attempts one-for-one and reproduce the run
bit-for-bit. Attempts count against `maxAgentCalls` and work like any other
call, and exhaustion is an ordinary cell failure — `on:"fail"` decides what
happens next. There is no jittered backoff or mutated prompt: resilience is
bounded repetition of a signed request, fully visible on the receipt.

**Iteration and fan-out are cells, not edges.** `repeat` runs a
digest-embedded sub-manifest up to `maxRounds`, carrying named interface
outputs into the next round's inputs, with an optional `until` early-exit.
`each` runs one once per element of a delivered list, collecting interface
outputs into list ports that flatten into `many` consumers. The edge graph
stays acyclic — re-entry lives behind a cell boundary, items record under
`loop/r<n>/` and `map/i<n>/` paths, and the work ledger never resets.
`until` is not an assertion: an unsatisfied exit just means the last round's
outputs commit, and downstream guarded edges decide what to do with them.

**Run budgets belong to the root manifest.** Steps, agent calls, work units,
byte bounds, and depth are set by the top-level manifest and apply across
every nested level. An inner manifest's own budgets apply when it runs as a
root.

**The store and executor are seams.** `Store` is ten methods — manifests,
receipts, the `getValue`/`putValue` CAS behind `ref` ports, the
`getEffect`/`putEffect` memo index behind `--cache-effects`, and the
`getSlot`/`setSlot` mutable cells behind `slot` cells; an Oh-backed
adapter lands when Oh's API settles (it is moving weekly). `Executor` is one
async call; provider auth lives behind `--executor-cmd` or a host adapter.
Morphogen never brokers model access. (From Oompa: custody and provider
execution are different jobs.)

**State is a cell.** A `slot` cell reads or writes a named, mutable,
durable key in the store — memory across runs. This is the one place the
model relaxes CAS discipline: a slot's content is *not* addressed by its
digest, and that is why reads are recorded like effects — the receipt pins
what the run saw, and `verify` serves the record, not the current store.
Writes stay deterministic: same input, same slot content. Slot names share
one flat space, so organisms can share memory on purpose — or collide, if
they weren't paying attention.

**Payloads are content-addressed too.** A `ref` port carries a `sha256:`
token, not a value; `store`, `load`, and `slot` cells are the only IO
points, so the graph shows exactly where data enters and leaves CAS. `maxValueBytes` makes
this the enforced path, not the optional one: no port may carry more than
256 KiB canonical, so bulk data goes through CAS by construction. A large
document can pass through a hundred cells without ever appearing in a
receipt or an effect request — only its digest does, and the digest is what
the request signs.

## Deferred on purpose

- Delegated execution — a remote host runs the organism and you trust its
  receipt (needs signed identity/attestation — a Valhalla concern). Remote
  *resolution* via `via`/transports is implemented.
- Workflow breeding/mutation, organisms that emit organisms.
- Hosted habitats: persistent goal-seeking configurations of many organisms.
- A real view language over the program graph (beyond `view.cells`).
- Cycles as ordinary edges and streaming re-activation (`repeat` and `each`
  are the only re-entry v1 admits).
