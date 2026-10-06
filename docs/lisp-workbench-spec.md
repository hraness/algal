# Lisp-shaped ALGAL workbench

Status: proposed source-layer specification, 2026-10-06. The workbench is an
authoring and repair interface. It is not a second runtime and it does not
change `algal.organism.v1`, `algal.expr.v1`, receipts, capabilities, or replay.

## Boundary

A workbench document is a bounded S-expression file. Compilation has four
phases:

1. read UTF-8 text into a syntax tree with source spans;
2. expand only declared, pure macros under a compile fuel and output-byte bound;
3. lower the expanded tree into the existing ALGAL source AST and manifest;
4. run the same structural checks as `.algal` source.

The output is the canonical manifest, source map, expansion digest, and
compiler diagnostics. The runtime receives only the manifest. It cannot inspect,
call, or re-evaluate the workbench reader or macro implementation.

A workbench file may not perform host I/O, access environment variables, load
arbitrary code, call a provider, allocate an unbounded structure, mutate a
macro environment, or invoke `eval`. Macro expansion is deterministic for the
pair `(source text, compiler version, macro library digest)`.

## Surface

The first version admits one top-level `program` form:

```lisp
(program quote
  ((order json))
  json
  (with-total subtotal
    (* (get order quantity) (get order unit_price))
    (record subtotal subtotal
            shipping (if (>= subtotal 50) 0 5)
            total (+ subtotal (if (>= subtotal 50) 0 5)))))
```

Atoms are lowercase symbols, bounded numbers, JSON strings, `true`, `false`,
and `null`. Lists are limited to forms in the standard library. The initial
standard library contains `get`, `record`, `let`, `if`, `+`, `-`, `*`, `/`, `%`,
comparisons, and `with-total`. A symbol is a binding reference, never an
implicit host-language call.

`program` has a name, a bounded parameter list, an output type, and one body.
The parameter and output types are the same `text`, `json`, record, and list
types accepted by readable ALGAL source. `let` bindings are immutable. There is
no general lambda, closure, recursive definition, actor, effect, or durable
wait form in the workbench surface. Those remain explicit ALGAL constructs and
manifest contracts.

## Macros

A macro is declared in the workbench library, versioned, and admitted by the
compiler. It receives syntax nodes with spans and returns syntax nodes. It may
introduce bindings only through a hygienic `gensym` operation. User data is
quoted with `quote`; generated syntax is unquoted with `splice`. Macro output
retains an expansion stack so diagnostics can point to both the generated node
and the invocation.

Macros must declare a maximum input node count, output node count, and expansion
fuel. Recursive expansion, mutual expansion cycles, and output over the bound
are compile errors. The compiler records the library digest, each invocation's
input digest, output digest, and the final expanded-tree digest in the source
map. Two compilers must reject or produce the same expanded tree under the same
contract version.

## Errors and repair

Reader, expansion, lowering, and structural-check failures use
`algal.source-error.v1`. Every diagnostic contains a code, message, primary
span, source digest, and bounded expansion stack. A repair client may request a
candidate edit against a failed source snapshot. The compiler applies the edit
in memory, reruns all four phases, and returns either a new candidate manifest
or the original diagnostic. It never mutates a running process or receipt.

A runtime failure remains a runtime failure. The workbench may open the same
receipt-backed debugger used by readable ALGAL source, showing inputs,
capabilities, prior evidence, and the failed transition. A repair can be tested
against captured inputs and replayed before it becomes a new source revision.
Resuming execution requires the normal activation and effect-reconciliation
contracts.

## Identity and review

The source digest covers the exact workbench bytes. The manifest digest covers
only the lowered ALGAL manifest. The expansion digest covers the canonical
expanded tree. A receipt records the manifest digest and never treats source or
macro text as executable authority. Reviewers can therefore inspect source,
expansion, manifest, and receipt as separate linked artifacts.

The workbench is accepted as a default authoring surface only after the paired
experiment meets its gate: at least ten holdout tasks, exact manifest parity,
median verified iteration at least 20% faster, and no more than a 10% increase in
repair attempts or expansion-review failures. Until then it remains an
optional development tool and readable ALGAL source remains canonical.
