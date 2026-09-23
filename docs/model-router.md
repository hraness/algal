# Model router

`examples/model-router.algal.json` routes a first-session task prompt to
`frontier` or `standard`: the binary capability tier a coding-agent model
picker decides at session start. It is small, fast, and replayable: two
`expr` cells compute deterministic shape features and the routing score;
one `decide` cell asks a typed-decision provider (Jev) for six scores.

```sh
bun cli.ts run examples/model-router.algal.json \
  --args '{"src":{"task":"migrate the session store and update every caller"}}' \
  --jev
```

Output: `{"route": "frontier"|"standard", "score": <logit × 1000>,
"kind": <task kind>, "gate": "kind"|"score"}` plus a one-line summary.

## Shape

```
src (task text)
 ├─→ feats  (expr)  words, imperative, resume, verbs_c
 └─→ probe  (decide) difficulty, scope, ambiguity, stakes, kind, frontier
        ↓
     combine (expr) linear head + kind gates → route, score, kind
        ↓
     fmt    (expr)  "route → frontier (score 648, kind resume)"
```

The deterministic features are deliberately weak alone; the typed scores
are deliberately generic. The fitted head combines them:

```
z = -1.8027
  + 0.4530 · min(words,400)/400
  + 1.5943 · imperative          (first word is an action verb)
  + 0.6881 · resume              (session take-over / continuation marker)
  + 0.4405 · min(distinct verbs,8)/8
  - 0.0755 · difficulty/5
  + 0.8716 · scope/5
  - 0.1508 · ambiguity/5
  - 0.4787 · stakes/5
  + 0.5851 · frontier-noul
route = frontier  if z ≥ -0.619  (p ≥ 0.35), else standard
```

`question` and `probe` kinds gate to `standard` unconditionally: the
observed operator never routed a pure question to a frontier model, and a
capability probe does not need one.

## Provenance and honest limits

The coefficients were fit (logistic, L2) on **306 first-session prompts**
extracted from one operator's local Codex, Claude Code, and Devin CLI
stores (September 2026), labeled by the model that actually served the
first turn: `claude-fable-5-1` and `gpt-6-astra*` count as frontier;
`swe-2-*`, `gpt-5-6-sol*`, `claude-opus-*`, `claude-sonnet-*`, and the
remaining standard tier count as standard. Harness-generated prompts
(eval batteries, organism cells, guardian probes) were excluded; probe
sessions were dropped from fitting.

Held-out performance: 8-fold cross-validated **AUC ≈ 0.74**; in-sample
accuracy ≈ 0.77 at the shipped threshold; predicted frontier share 37%
vs observed 36%. The residual gap is real, not a bug: the operator also
picks frontier for trivial capability probes and one-line takeovers, and
leaves genuinely hard briefs on standard models — preference and
availability noise no task-intrinsic feature can recover.

Every feature is task-intrinsic: no operator identity, repository names,
timestamps, or history. Jev's intrinsic-difficulty score alone does not
separate the classes (AUC ≈ 0.52) — the deciding signals are imperative
shape, continuation markers, and scope, not raw length (median frontier
prompt is *shorter* than median standard).

## Cost and speed

One routing decision costs one bounded `decide` call (~1k tokens in,
~0.2k out with `jev-latest`) plus two fueled `expr` evaluations — no
agent cell, no generated text. All six questions ride in a single ask.

## Reuse

Any typed-decision executor can serve the `decide` cell — `--jev`,
`--executor-cmd`, or a `route`/`preset` executor. Retrain the head by
re-fitting the nine weights on a new labeled sample and editing the
`combine` program; the cell boundaries do not change.
