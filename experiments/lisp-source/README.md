# Lisp source experiment

This experiment compares the current readable ALGAL source surface with a small
Lisp-shaped authoring surface that lowers to the same bounded ALGAL expressions.
It tests authoring ergonomics, source compactness, macro expansion visibility,
and repair diagnostics. It does not compare runtimes or claim that Common Lisp
should replace ALGAL.

The incumbent and treatment must produce the same canonical expression and
receipt for each fixture. The treatment is intentionally small: symbols,
literals, `let`, `if`, arithmetic, records, and one hygienic-looking `with-total`
macro expanded by the experiment compiler. The macro output is printed and
hashed so generated code remains inspectable.

Run from this repository:

```sh
bun experiments/lisp-source/run.ts
```

The runner emits a deterministic JSON report under `results/latest.json` with
source bytes, token counts, expansion bytes, compile diagnostics, and replay
identity. It is a development ergonomics experiment, not evidence of cumulative
skill or production language readiness.
