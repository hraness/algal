# Internal progress and work for the admitted fixture machine

This is a reviewable, parameterized argument about `oracle.ts`, **not a Lean
proof, a theorem about either production runtime, or a wall-clock bound**. It
applies to reachable states produced by `start` and `step` with mutation `none`,
and ordinary finite JavaScript operations completing. It does not apply to
arbitrary caller-mutated `State` objects. A absent external response leaves an
`await` unchanged; no external fairness or successful completion is assumed.
Once each pending request receives an admitted response, internal transitions
reach a terminal outcome within the bound below. Poison itself is terminal.

Let `S` be the root `maxSteps` (at most 1,024), `A` its `maxAgentCalls` (at most
64), and `C`/`O` its context/output byte bounds (at most 65,536 in this fixture
language). Let `F = 1 + 64*S`. `internalBounds` returns:

```
frames      <= F
transitions <= 64*F + 32*S + 8*A + 8
work        <= 110*S + 12*F + A*(500+C+O)
```

At the largest admitted parameters these are 65,537 entered frames, 4,227,656
recorded transitions and 9,319,692 work units. These intentionally conservative
bounds replace the previous unrelated 20,000-transition operational ceiling.
They do not assert that production supports only five cells or 12 edges.

## Counting argument

1. Activation checks the monotonically increasing shared step counter before
   increment. No unmutated transition refunds it. Thus at most `S` activations
   occur, including wrappers, input failures and failed callbacks. Likewise at
   most `A` dispatches occur; retries retain previous charges.
2. Only an activated wrapper enters a child. An organism enters once, repeat
   at most 16 times, and each at most 64 times; its iteration index increases
   only after a completed child and is not reset during that activation.
   Failure/suspension ends this continuation. Thus entered frames are at most
   `1 + 64*S`. A refused push enters no frame. Entered depth is at most nine
   frames including the root, by the checked root depth bound.
3. A frame has at most five cells and 12 edges. A selected cell becomes resolved
   once (commit, skip or handled failure), or its frame exits. No transition
   unresolves it. Each non-final repeated sweep requires at least one newly
   resolved cell. Therefore there are at most six scans/sweep-end evaluations
   per cell position, or 36 `scan` transitions including sweep-end checks per
   frame. Resolving each inbound edge happens only during its one selected
   consumer continuation: at most 12 edge resolutions plus five `edges-ready`
   transitions. There are at most five `collect` and one `terminal` transitions.
   These account for at most 59 transitions per entered frame.
4. For each activation, `input` and `execute` occur at most once, followed by at
   most one `commit` attempt, one `settle`, and one `post`. Failed output
   admission can go from commit to settle, so both are counted. A context/call
   refusal happens at most once per activation and terminates its retry loop.
   A depth/item refusal happens at most once per wrapper and ends it.
5. Each successful dispatch contributes one `effect`, one `await` response and
   one `bind`; poison may end earlier. Additional repeat/each activity is
   accounted by one successful `push` and one `return` per entered child;
   unsuccessful pushes were charged in step 4. A parent in phase `child` is
   below the active stack top until the child exits, so it cannot be an active
   stuttering transition.
6. Summing the conservative counts is below
   `61*F + 7*S + 3*A`, itself below the implemented bound. Calls to `step`
   without a response while awaiting and calls after termination return the
   same state and append no transition. They do not violate the count or imply
   external progress.

This is a finite charging argument rather than a rank over one mutable scalar:
each repeated continuation is charged to a monotonically advancing activation,
call, cell resolution, frame entry, or bounded child iteration. The code enforces
the bound as an assertion after every recorded transition. The tests also check
it against each generated execution, which is an implementation sanity check,
not independent proof of the argument.

## Work accounting

The only charge sites in this IR are 100 per activation; at most ten per fixed
pure operation; one per evaluated literal guard; `500 + context bytes` per
admitted dispatch; and output bytes once for an admitted-size returned output.
An invalid but admitted-size output can retry, retaining both charges. An
oversized output gets no output-byte charge. A failed foreign response gets no
output-byte charge. Each effect's effective byte bound is the root/cell minimum.
Thus the displayed bound follows from `S`, `A`, at most 12 guards per entered
frame, and `C`/`O`. It is below JavaScript's exact integer range. Inclusive cell
work is a shared-counter difference and is intentionally not additive across
nested wrappers.

This bound is on total fixture work, not an overshoot bound relative to
`maxWork`. Production compaction, tools, recall, expressions, custom function
costs and provider turns need their own charge-site proofs. The fixture language
has finite individual JSON depth/list/string bounds, but this argument does not
bound the host memory needed to clone/serialize every possible admitted IR.
Qualified cases are the explicit persisted fixture inventory. In particular,
large derived port values and production structural/receipt amplification are
outside this oracle conformance slice and remain Phase 08 obligations.
