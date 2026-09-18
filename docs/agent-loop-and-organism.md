# Organisms and agent loops

Morphogen organisms are themselves bounded agent loops. The interesting
question is how they relate to the larger agent loop that deploys them: when
do you compile a piece of agentic behavior into an organism, and when do you
let the outer loop stay improvisational?

## An organism is a compiled loop

A `repeat` cell already captures the evaluator-optimizer pattern: the same
sub-manifest runs for bounded rounds, carrying outputs forward, until a guard
fires or `maxRounds` is reached. An `each` cell maps a list through a
sub-manifest. An agent cell with `tools` and `budget.maxTurns` is a bounded
turn-based tool loop inside one cell. So the organism contains the same
primitives that make an agent loop — but they are typed, budgeted, and
content-addressed.

The difference is not power; it is **inspectability and custody**:

| aspect | improvised agent loop | Morphogen organism |
|---|---|---|
| state | mutable, ambient | ports on a DAG, typed |
| branching | if/else in code or prompt | `guard`ed edges, routable failures |
| tool calls | ad-hoc, hard to replay | `tool` cells and `tools` log, digest-bound |
| model choice | global config or hidden heuristics | `route.preset` / `route.provider` explicit in the graph |
| cost limit | implicit timeout | `maxSteps`, `maxAgentCalls`, `maxWork`, `maxEffectMs` |
| evidence | transcript | content-addressed receipt + offline `verify` |
| shipping | prompt/config | a manifest digest and its bundle |

## Practical layering

The outer agent loop should stay improvisational where the task is genuinely
open-ended: "what should I investigate next?", "is this user request in scope?",
"what is the user's intent?" The inner organism should take over once the
sub-problem is well-formed:

- extract the next intent → outer loop;
- verify a claim against a structured source → `tool` + `classifier`;
- classify and route a ticket → `classifier` + guards;
- generate a code diff and run the test suite → `agent` + `fn` + `assert.v1`;
- search an organism topology for the cheapest one that passes validation →
  `foundry search`;

The boundary is: **the outer loop decides what to do, the organism decides how
to do it** for the sub-problems that can be described as a bounded workflow.

## A coding agent example

A coding agent's outer loop might look like:

```
read user request
→ plan next step
→ if step is well-formed, call `morphogen run` on the right organism
→ receive the receipt and outputs
→ decide the next step or stop
```

The organism it calls could be `patch-and-test`:

1. `agent` cell drafts the patch.
2. `tool` cell runs the test command (declared host capability).
3. `classifier` cell reads the test result and decides `pass`, `fail:fix`, or
   `fail:escalate`.
4. `on:fail` edge routes a `fail:fix` back to the agent with the test output in
   its `view.cells`.
5. `repeat` cell bounds the number of fix attempts.

The agent does not watch the patch being written. It asks the organism to
solve a structured task and gets a receipt it can pass upstream. If the
organism is good, the agent can use it as a tool without inheriting its
complexity.

## Can the agent itself be an organism?

Yes, at the cost of stronger assumptions. You can write the outer loop as a
Morphogen organism if:

- the conversation has a bounded state model (a list of turns, a current goal);
- the set of next actions is closed (a `choice` of intents);
- the tools it can call are already admitted;
- the termination condition is explicit.

That is a useful form for a *task-specific* assistant, not a general chat
interface. The practical application is not to replace the agent but to give
the agent a library of verifiable sub-routines it can invoke with confidence.

## When this is premature

Do not wrap a whole agent in Morphogen just to have the receipt. Use a
single organism when the inputs, outputs, and budgets are clear, and the
failure modes are worth replaying. Use the outer loop for exploration,
ambiguity, and user interaction. The two layers compose: the agent loop
answers "what problem are we solving?", the organism answers "did this
solution actually satisfy the contract?"
