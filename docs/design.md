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

**Ports are typed and single-assignment.** `text`, `json`, `choice`. Guards are
valid only on choice producers with matching labels. The check happens at
admission — an invalid graph never runs. (From Platonik's port contracts.)

**Context is a view, not a stuffing.** An agent cell declares which of its
inputs enter the effect request. The executor sees exactly those bytes,
bounded. The harder problem — a composable view language over the whole
program graph — is deliberately deferred; v1 views are per-cell.

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

**Organisms embed by digest.** An `organism` cell references a manifest hash
resolved from the store. Composition preserves cost and exposes only declared
interface ports — symbolization without magic. Because a manifest can never
contain its own digest, embedding graphs are acyclic by construction; the
run still bounds nesting depth via the root manifest's `maxDepth`.

**Run budgets belong to the root manifest.** Steps, agent calls, work units,
byte bounds, and depth are set by the top-level manifest and apply across
every nested level. An inner manifest's own budgets apply when it runs as a
root.

**The store and executor are seams.** `Store` is four methods; an Oh-backed
adapter lands when Oh's API settles (it is moving weekly). `Executor` is one
async call; provider auth lives behind `--executor-cmd` or a host adapter.
Morphogen never brokers model access. (From Oompa: custody and provider
execution are different jobs.)

## Deferred on purpose

- Multi-owner messaging and remote organisms (needs signed envelopes — a
  Valhalla concern).
- Workflow breeding/mutation, organisms that emit organisms.
- Hosted habitats: persistent goal-seeking configurations of many organisms.
- A real view language over the program graph.
