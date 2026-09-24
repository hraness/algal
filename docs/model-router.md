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
z = -1.7683
  + 0.5271 · min(words,400)/400
  + 1.4028 · imperative          (first word is an action verb)
  + 0.4491 · resume              (session take-over / continuation marker)
  + 0.4438 · min(distinct verbs,8)/8
  + 0.0045 · difficulty/5
  + 0.9353 · scope/5
  - 0.1459 · ambiguity/5
  - 0.5129 · stakes/5
  + 0.6107 · frontier-noul
route = frontier  if z ≥ -0.619  (p ≥ 0.35), else standard
```

`question` and `probe` kinds gate to `standard` unconditionally: the
observed operator never routed a pure question to a frontier model, and a
capability probe does not need one.

## Provenance and limits

The head has two generations, both fit on one operator's local Codex,
Claude Code, and Devin CLI stores and labeled by the model that
served the first turn: `claude-fable-*` and `gpt-6-astra*` count as
frontier; `swe-2-*`, `gpt-5-6-sol*`, `gpt-5.6-*`, `claude-opus-*`,
`claude-sonnet-*`, and the remaining standard tier count as standard.
Harness-generated prompts (eval batteries, organism cells, guardian probes)
are excluded, and probe-kind sessions are dropped from fitting.

**Generation 0 (September 22, 2026)** was an L2 logistic fit on 306 first
prompts from July 30 to September 21: 8-fold cross-validated AUC ≈ 0.74,
in-sample accuracy ≈ 0.77 at the shipped threshold, predicted frontier share
37% against 36% observed. Intercept -1.8027; weights 0.4530, 1.5943, 0.6881,
0.4405, -0.0755, 0.8716, -0.1508, -0.4787, 0.5851 in the feature order
above.

**Generation 1 (September 24, 2026, shipped above)** is a prior-anchored
update of generation 0, using the same rule xcb's route reflex learns with
(`xcb_core::reflex::fit`: full-batch logistic descent with a Gaussian penalty
of strength 24 centred on the parent weights, 600 iterations, learning rate
0.5). It was fit on the 84 labeled, non-probe first prompts from September
2026, the only window in which the frontier choice existed on that machine
(every May to August pick is standard). On those 84 sessions generation 0
scores AUC 0.63 and accuracy 0.58 at the shipped threshold; generation 1
scores 8-fold cross-validated AUC 0.64, in-sample AUC 0.65, accuracy 0.58,
and predicts a 58% frontier share against 50% observed. The gain is small
and within noise; the update is shipped because the shipped head should
track the newest labeled window, not because it is a better router.

Two readings of the new window matter more than the weights. First, the
decision moved from prompt to tool: 34 of 36 September Codex sessions ran
`gpt-6-astra`, 12 of 20 Claude Code sessions ran fable, and 0 of 35 Devin
sessions left the standard tier. Second, within that window the pick reads
as difficulty-calibrated for the first time: longer prompts (words AUC
0.71, median 69 frontier vs 27 standard), higher Jev difficulty (0.70) and
scope (0.69) all point to frontier, and the continuation marker that carried
generation 0 is neutral (AUC 0.50). A head fit from zero on September alone
reaches cross-validated AUC 0.65 with difficulty at +0.72 and resume at
-0.32; it is published for comparison on hraness.com/prompting and not
shipped, because 84 examples do not justify replacing the parent. A head fit
across the whole May to September corpus reaches AUC 0.82 and is not shipped
either: every frontier pick is a September prompt, so that fit learns the
calendar through prompt-style drift.

Every feature is task-intrinsic: no operator identity, repository names,
timestamps, or history. Local stores rotate, so the September 22 corpus is
not reconstructible from today's stores; the aggregates behind both
generations are published at hraness.com/prompting/data.json.

## Cost and speed

One routing decision costs one bounded `decide` call (~1k tokens in,
~0.2k out with `jev-latest`) plus two fueled `expr` evaluations — no
agent cell, no generated text. All six questions ride in a single ask.

## Reuse

Any typed-decision executor can serve the `decide` cell — `--jev`,
`--executor-cmd`, or a `route`/`preset` executor. Retrain the head by
re-fitting the nine weights on a new labeled sample and editing the
`combine` program; the cell boundaries do not change.
