# Bounded development inference

This page is the handoff for future ALGAL implementers who need live model
judgment during a development experiment. It describes a private, opt-in path;
the default build and test path remains deterministic and needs no provider
credentials.

ALGAL does not store provider keys or own provider subscription custody. A
consumer integration uses XCB or Ghostget for that boundary. A research-only
experiment can use the private Oh memory-lab transport, which already provides
model-specific request validation, a shared reservation ledger, frozen input
digests, no automatic retries and explicit handling for uncertain outcomes.

## Local setup

Keep the lab workspace outside the repository and set its path for the process
that owns the experiment:

```sh
export OH_MEMORY_LAB=/absolute/private/oh-memory-lab
export VERTEX_API_KEY=...       # Gemini through the existing Oh profile
export XAI_API_KEY=...          # xAI
# GEMINI_API_KEY is also accepted instead of VERTEX_API_KEY.

bun run inference:status
bun run inference:status -- --require-api
```

The status command reports only whether a credential is present and whether the
private lab has `profile.json` and `budget.json`; it never prints a key or sends
a request. The repository contains a path-only profile template at
[`examples/inference/oh-memory-lab.profile.api.example.json`](../examples/inference/oh-memory-lab.profile.api.example.json).
Copy it into the private lab, replace its private input paths, and create the
budget file with an explicit dollar limit, call limit and UTC expiry before any
live dispatch. The profile names the current development roles:

| Role | Provider | Model | Credential environment variable |
| --- | --- | --- | --- |
| Reader | Gemini | `gemini-3.8-flash` | `VERTEX_API_KEY` or `GEMINI_API_KEY` |
| Judge | xAI | `grok-4.7` with low reasoning | `XAI_API_KEY` |

These model names and provider pricing are development inputs from the Oh setup,
not ALGAL claims about model quality or stable provider weights. Requalify after
changing the model, settings, prompts, corpus, or transport.

## Dispatch rules

Before a live experiment, freeze the profile, instructions, source inputs,
evaluation templates and budget. Qualification, readers and judges use one
private ledger. Reserve the worst-case token cost before dispatch. A timeout,
provider rejection, malformed usage record or lost response retains the full
reservation and stops the run until the saved request and response are
reconciled. Do not retry an uncertain provider effect automatically.

Use live inference to produce a retained proposal or judgment, never as an
implicit activation authority. ALGAL still checks the returned shape, evaluates
the candidate against the incumbent and holdout policy, and requires the host's
explicit activation decision. A live result is model evidence; it is not proof
of external truth, provider billing or production benefit.

The usual owner is the Oh memory-lab checkout. From that checkout, after the
private profile and budget are prepared, its documented `qualify-api.ts` and
campaign commands run the direct Gemini/xAI transport. ALGAL buildout agents
should link the resulting evidence into the ALGAL experiment record rather than
copying the private cache, raw provider responses or credentials into this
repository.

For hosted or consumer work, follow the North Star P10 boundary: XCB and
Ghostget own provider subscription and credential custody, while ALGAL receives
only typed, bounded effects and retained results. Do not add provider-key
handling to the ALGAL runtime to make a one-off experiment easier.

## Status and limits

This repository records no credential values and does not assume that a future
process inherits them. Future agents should run
`bun run inference:status -- --require-api` in their own process and create a
fresh, explicitly bounded private budget before using either provider. No live
request was made for this documentation change.
