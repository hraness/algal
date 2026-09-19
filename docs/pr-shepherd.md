# PR and CI shepherd

The shepherd runs a finite PR observation workflow in the process VM. A mailbox
event admits a GitHub observation. Pending CI suspends the process until a durable
host timer or an explicit event wakes it. It produces a revision-bound review,
repair, refresh, or blocked packet. Waiting, readiness evaluation, resume, and
verification use zero model calls.

```sh
bun cli.ts shepherd start release-42 --repo OWNER/REPO --pr 42 \
  --required-checks 'Check (ubuntu-24.04),Check (macos-14)' \
  --max-polls 16 --interval-ms 30000 --dir .algal-pr42
bun cli.ts shepherd tick release-42 --gh /path/to/gh --dir .algal-pr42
bun cli.ts shepherd watch release-42 --max-duration-ms 60000 \
  --gh /path/to/gh --dir .algal-pr42
bun cli.ts shepherd inspect release-42 --dir .algal-pr42
bun cli.ts shepherd verify release-42 --dir .algal-pr42

# A trusted webhook handler can submit the same delivery ID repeatedly.
bun cli.ts shepherd wake release-42 --delivery github-delivery-id --dir .algal-pr42
```

Authentication stays inside the host's `gh` command. The transport invokes
`gh api` directly against github.com with bounded output and timeouts; it does
not extract tokens or execute a model-selected shell command. `--gh` chooses
the host executable. Inspect and verify make no GitHub requests.

Each command may exit. `watch` is a bounded foreground host loop, not an installed
daemon or external scheduler. A later `tick` or `watch` delivers due timers and
continues the saved VM. Cancellation stops admitting new passes; an already
admitted observation may finish within its bounded request limits. `--max-polls`
is 1–16; exhausted pending episodes return `budget-exhausted`, not readiness.
Start a new explicitly named episode for a new revision or further observations.
The store retains process identities and evidence; it does not rotate them away.

## Evidence and decisions

The host fixes the repository, PR, checks, and polling bounds in immutable local
configuration. The manifest cannot change the target. Evidence includes full
head, base, and test-merge SHAs, base branch, check App identities, legacy status
contexts, reviews, unresolved threads, mergeability, and visible protection/rules.
The adapter follows GitHub's head versus test-merge status selection, reads all
bounded pages, and rechecks the revision after collection. Incomplete policy or
pagination is explicit and withholds readiness.

Each next observation refreshes the previous full evidence, so head changes,
base movement, test-merge changes, or a retargeted base branch end the episode
as stale. CI and review changes at the same revision can advance a pending
episode. Packets retain the full evidence's digest and CAS reference; the user
facing failed-check list and reasons are byte bounded with explicit truncation.

| Packet action | Meaning |
| --- | --- |
| `wait` | More checks or mergeability computation are pending. |
| `review` | All host-required checks and supported visible repository policy pass for this observation. |
| `repair` | CI reports failures; packet names the failing checks and their log URLs. |
| `refresh` | Revision or target base changed; old evidence must not authorize newer code. |
| `blocked` | Closed/draft/conflicting PR, review/policy restriction, or unavailable evidence. |
| `budget-exhausted` | The finite episode ended while still waiting. |

The shipped shepherd performs read-only GitHub work. A repair packet is an input
for a coding agent or person; it does not launch an unbounded repair job. A review
packet is evidence to review, not permission to merge. The separate SDK merge
adapter is disabled by default; when explicitly admitted it requires unchanged
fresh evidence, the expected head, and non-bypassable server-side strict required
checks to guard base movement. An ambiguous write result remains uncertain.

## Host events and recovery

`HostEventService` provides a bounded local outbox with stable source/delivery-ID
deduplication, scheduled eligibility, cancellation before send intent, and exact
mailbox retry after acknowledgement loss. Clock fields stay in host state; VM
messages carry the event identity and payload. Delivered events remain deduplicated
even after the mailbox consumer has drained the message. The host does not trust
an unauthenticated webhook automatically: a caller must validate the external
delivery before using the SDK or CLI wake operation.

The shepherd opts into the [ordered recovery journal](../spec/v1/process-journal.md).
Completed observations can be reconstructed without repeating them; unknown reads
may be explicitly retried. Unknown mailbox consumption remains a write and stops
for reconciliation. `shepherd recover NAME --expected-intent SHA` uses the saved
host configuration. It never clears an uncertain write merely because a lock
became available.

## Reproduce the evidence

```sh
bun scripts/github-qualification.ts --out github-qualification.json
bun scripts/recovery-demo.ts --native ./target/debug/algal --out recovery.json
```

The GitHub qualification corpus measures real read compatibility and conservative
decisions on 20 public PRs. It does not represent 20 completed repairs or successful
merges. Private/inherited policy may be unavailable, and those cases stay blocked.
The recovery demonstration uses real OS crashes and controlled local adapters;
it is not a claim about paid model quality or provider billing. Existing
`scripts/vm-demo.ts` measures avoided repeated fixture decisions against a naive
restart baseline, not against another durable workflow engine.

The portable assets are the typed manifests, effects, process history, and receipts.
The GitHub and timer host in this release runs on Bun. Both Bun and the independent
Rust kernel implement the process journal and local custody ABI. Remaining work
includes durable external coding-job handles with adapter-specific reconciliation,
an approved repair-to-PR loop, and measurement of successful real repairs.
