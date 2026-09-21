# Practical workflows with the ALGAL VM

Use ALGAL for a bounded piece of agent work whose decisions must outlive a CLI
invocation and whose execution must remain inspectable. The useful result is a
retained proposal, checked patch, ordered set of replies, or verifiable history.
Start with the job below that matches your workflow.

| Job | Ready-to-run path | What you need |
| --- | --- | --- |
| Return to a proposal and approve its exact local action | `algal demo start` | [Verified native executable](native-release.md); deterministic default |
| Generate a private change brief, then review it later | `scripts/apple_brief_demo.py` | Native vm.7+, compatible Mac, separate Apple bridge, Python 3 |
| Check a coding patch independently of its author | `scripts/repair-demo.ts` | Checkout, Bun 1.3+, optional native verifier; deterministic adapter by default |
| Verify history away from the executing host | `algal process verify-evidence` | Native executable and exported capsule |
| Reuse routing and generation over a bounded inbox | `examples/source/projects/inbox/` | Checkout and Bun 1.3+; scripted answers included |
| Watch a specific PR's CI without an agent conversation | `bun cli.ts shepherd` | Checkout, Bun, host-owned authenticated `gh`; read-only GitHub access |

For commands using `bun`, start at the repository root after
`bun install --frozen-lockfile`. Native commands need no source checkout.
Use a fresh directory for each demo and keep active workbench roots in place.

## 1. Review a proposal today; decide tomorrow

**Good fit:** change briefs, local release reports, and other review queues
where the person must approve the exact result already seen.

```sh
algal demo start ./my-review
algal demo inspect ./my-review
```

Open `my-review/report.html`. The CLI has exited, but the process still retains
one proposal and waits for approval. Copy the exact approve or deny command from
the report and run it in another invocation. Approval creates one local mailbox
publication and `publication.json`. Denial completes without publication.
Repeating the same decision leaves the completed process head unchanged.

To retain your own check data, use a small JSON file:

```sh
algal demo start ./my-checks --evidence ./checks.json
```

The native default uses a deterministic recommendation. It demonstrates durable
orchestration with your retained input; it does not analyze that input using AI.
The [workbench guide](native-workbench.md) covers bounds, exact approval binding,
export, and the local operator's authority.

For a real draft on a compatible Mac, use the [private Apple brief](apple-brief.md).
Build the compatible bridge as documented there, then supply explicit paths:

```sh
python3 scripts/apple_brief_demo.py start /absolute/new-private-brief \
  --native /absolute/algal \
  --apple-bridge /absolute/algal-apple \
  --evidence /absolute/change-evidence.json
```

That workflow makes one on-device model request for `summary` and `reviewFocus`.
The model receives only the bounded evidence object and cannot approve or publish.
A human reviews the generated text and exact proposal before deciding. Resume
has no model executor: the saved result is the result that can be published.
This is local publication, not an email send, deployment, or merge.

Use `start` once for a new root. If inference or transport fails, retain and
inspect that root; the harness does not retry unknown outcomes. The input limit
is 2,048 canonical UTF-8 bytes, so choose a compact change summary and relevant
checks rather than an entire repository. The guide lists the complete input and
output bounds. Private evidence remains visible in retained files and exports.

**Adapting it:** keep the model's narrow drafting role, bind the whole proposal
and destination to approval, and admit a host-owned delivery adapter for any new
destination. The shipped demo authorizes only a local report. Connecting email,
deployment, or payments needs that adapter's authority and reconciliation rules.

## 2. Turn a coding result into an independently checked patch

**Good fit:** a small bug fix with a known source revision and fixed acceptance
criteria, where “the agent finished” is insufficient evidence to ship.

Run the fixture episode without provider credentials:

```sh
bun scripts/repair-demo.ts --keep --out repair.json
```

For independent native verification, add `--native /absolute/algal`. The fixture
uses a deterministic coding adapter, but the Git checkout, failing acceptance
test, proposed patch, subprocesses, durable wait, validation, and CLI restarts
are real. `repair.json` names the retained evidence directory. Inspection exposes
the patch identity and validation outcomes. A passing packet asks for review;
it does not authorize remote publication.

The [repair host](repair.md) fixes the clean checkout, expected HEAD, time and
output bounds, and acceptance command argument arrays before coding starts.
It fingerprints the patch around validation. The coding response cannot replace
the admitted commands, and drift cannot yield a passing review packet. A failed
check rejects the patch. A job with an unknown outcome keeps its custody record.

The deterministic crash/reconciliation path is also runnable:

```sh
bun scripts/coding-recovery-demo.ts --native /absolute/algal \
  --keep --out coding-recovery.json
```

This is a controlled local operation adapter, not qualification of a paid coding
provider. Actual operation recovery requires caller-bound durable identity and
read-only lookup of settled outcomes. The [adapter protocol](coding-operations.md)
defines that contract. Existing xcb v1 jobs do not provide that lookup and are
not automatically relaunched after uncertain completion.

**Adapting it:** choose a small clean checkout and independent acceptance tests,
qualify your coding adapter, and inspect the exact patch. Apply the repository's
real CI, review, and publication gates afterward. ALGAL does not sandbox the
coding agent or tests, and local checks cannot prove every patch correct.

## 3. Share an execution history without rerunning it

**Good fit:** handing a completed review to another engineer, debugging a
retained decision, or checking a workflow after its original host is unavailable.

For the workbench created above:

```sh
algal demo export ./my-review > review.evidence.json
algal process verify-evidence ./review.evidence.json
```

Copy `review.evidence.json` to another machine with a compatible native binary.
Verification uses no original store, model, credentials, or admitted host tools.
It reports the retained head and generation/receipt counts. It creates no runnable
process. Altered hashed objects or missing replay dependencies are rejected.

For a named process outside the workbench, export with
`algal process export NAME --dir STORE`; custom tool signatures may be needed
at export time. See [portable process evidence](vm.md#verify-a-process-away-from-its-original-host).

Run the stronger demonstration with both runtimes:

```sh
bun scripts/process-evidence-demo.ts --native /absolute/algal \
  --keep --out portable-proof.json
```

It exports a recovered coding-repair history, moves the original store and
adapter away, verifies from an empty directory using fresh CLI processes, and
rejects forged or incomplete histories. The [process VM demo](vm.md) separately
checks Bun-to-Rust and Rust-to-Bun continuation on the same local store:

```sh
bun scripts/vm-demo.ts --native /absolute/algal --keep --out handoff.json
```

**What you can conclude:** the supplied history is internally consistent under
the admitted runtime and its recorded external answers. You cannot conclude
that model prose is true, a provider was authenticated, or the file came from a
particular author without a separately trusted identity or digest. Exported
prompts, outputs, and capability strings remain visible; review before sharing.
Evidence portability is not live capability transfer or distributed custody.

## 4. Reuse a small judgment across a bounded inbox

**Good fit:** support draft queues and repeated classifications where the input
shape is stable and each item should see only its declared context.

```sh
bun cli.ts run examples/source/projects/inbox/inbox.algal \
  --args examples/source/projects/inbox/inbox.args.json \
  --responses examples/source/projects/inbox/inbox.responses.json \
  > inbox.receipt.json
bun cli.ts verify inbox.receipt.json examples/source/projects/inbox/inbox.algal
```

The program imports one draft helper, calls it for a preview, and applies it to
up to three messages. Results keep input order. The declared maximum is four
executor attempts, shared across nested work. Current `each` execution is
sequential; this is reuse with a bound, not a parallel-speed claim. The default
run uses scripted answers and sends no email.

The [routing example](../examples/source/route.algal) adds an explicit choice:
support and sales select their own draft branch; the other branch returns a fixed
human-review message. Unselected effect branches are skipped. The website's
[recorded views](https://algal.computer/#branch-demo) expose actual fixture receipts
and the model work used by each path.

**Adapting it:** replace the helper's declared task and input shape, select an
authorized executor, and evaluate the drafts on representative cases. Keep any
outbound send behind separate host approval. Read [source authoring](source-language.md)
for imports, bounds, and the supported subset; waits, tools, and advanced loops
are currently authored through the manifest API.

## 5. Observe CI without paying a model to wait

**Good fit:** a known PR whose checks and visible policy must settle before a
person or coding agent can act.

The [PR shepherd](pr-shepherd.md) admits an exact repository/PR and host-required
checks, collects bounded GitHub evidence, then waits on durable host events.
It emits a review, repair, refresh, blocked, or exhausted packet. A changed source
revision cannot reuse an old readiness observation. The waiting and readiness
path uses zero model calls, and inspect/verify make no GitHub requests.

Follow that guide to select your repository, PR, checks, authenticated `gh` path,
and finite polling budget. The shipped shepherd is read-only: a review packet
does not merge a PR, and a repair packet does not launch a coding provider.

## Test the failure before depending on the workflow

```sh
algal demo prove ./crash-laboratory
```

The native crash laboratory writes `proof.json` and retained read/write cases.
It kills only its own child at a durable journal barrier, joins the child, and
attempts explicit recovery. Completed effects replay. An interrupted read can
be repeated within the admitted budget without repeating the completed prefix
write. A write that happened without a retained acknowledgement remains
`uncertain`; recovery refuses to redispatch it. That blocked state is an expected
successful safety result, not a reason to clear the journal or recreate the job.

## Choose the right boundary

ALGAL is most useful when data-only programs, model boundaries, restartable
execution, and inspectable evidence are all valuable to the application. A
single unstructured prompt may not need a VM. An existing durable workflow
system may already cover your waiting and recovery requirements. The
[measured examples](when-algal-wins.md) explain the demonstrated savings in
fixture invocations without implying token, latency, dollar, or energy results.

For an initial deployment, choose one host-owned project episode with bounded
inputs, explicit tool admission, known storage ownership, and a clear completion
condition. Preserve uncertain state and provider records. Archive completed
evidence according to its sensitivity and retain backups while workers are
stopped. Per-program and per-process limits do not impose a global disk quota.

Before upgrading a shared store, stop its writers and use compatible Bun/native
versions. Current mailbox creation uses a shared admission lease; older creators
must not run concurrently with it. Keep existing stores and pending operations
in place. The [mailbox ABI](../spec/v1/mailbox.md) defines this boundary and
the retained evidence for interrupted ownership.

Before broader service use, your host must supply the operational pieces that
this prerelease does not: tenant authentication/authorization, OS isolation for
untrusted tools, store-wide quotas and retention, distributed custody, and
adapter-specific external-effect reconciliation. Native packages are unsigned
and unnotarized. A path, capability type, ACP session, or receipt hash is not an
OS sandbox. The VM does not promise exactly-once arbitrary external writes.

Build and package checks qualify the artifact. Deterministic demos qualify
their controlled workflows. A live run qualifies only the observed provider,
platform, input, and behavior. Keep these evidence sets separate when deciding
what to operate or claim.
