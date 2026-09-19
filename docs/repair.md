# Durable coding repairs

The repair host turns a coding-agent result into an inspectable, tested patch.
The VM waits for the result, records validation, and verifies the episode offline.
The host selects a clean checkout, the xcb executable and route, and fixed test
commands. The agent supplies proposed file changes; it cannot change those
admitted commands through its response.

The useful boundary is between **a coding attempt completing** and **its exact
patch passing independent checks**. Repeated observation does not repeat coding
work. A restart retains the proposal and every completed effect. The same process
history can be verified by the Bun runtime and the independent Rust kernel.

## Run an episode

The coding-job and repair host commands currently use Bun. The native binary can
verify the resulting VM history with matching tool signatures. Use a dedicated,
clean Git checkout; the store must be outside it. Set `expectedHead` to its full
current commit. Do not admit an unrelated dirty working tree.

Create `job.json` with host-selected absolute paths:

```json
{
  "workspace": "/absolute/dedicated-checkout",
  "expectedHead": "FULL_40_CHARACTER_COMMIT_SHA",
  "prompt": "Repair the identified bug. Preserve the public API. Do not commit or push.",
  "adapter": {"executable": "/absolute/path/to/xcb"},
  "limits": {"maxRuntimeMs": 180000, "maxOutputBytes": 262144, "maxPatchBytes": 65536, "maxChangedFiles": 8}
}
```

Use `xcb --json models` to choose an optional full provider/model/effort key;
a short alias such as `default` may match multiple effort variants.

Create `checks.json`. Commands are argument arrays, never model-written shell
strings. Keep independent acceptance tests outside the coding checkout when the
host owns them. This separates ownership but does not enforce OS isolation.
The checkout remains the command's working directory.

```json
[
  {"name":"acceptance", "argv":["/absolute/path/to/bun", "/absolute/host-tests/acceptance.ts"], "timeoutMs":60000, "maxOutputBytes":16384}
]
```

```sh
bun cli.ts job prepare job.json --dir /absolute/store
# Use the returned sha256:… jobId in both commands below.
bun cli.ts repair start repair-1 --job sha256:… --checks checks.json --dir /absolute/store
bun cli.ts repair tick repair-1 --dir /absolute/store
# The VM is suspended. This is the only command that launches coding work:
bun cli.ts job run sha256:… --dir /absolute/store
bun cli.ts repair tick repair-1 --dir /absolute/store
bun cli.ts repair inspect repair-1 --dir /absolute/store
bun cli.ts repair verify repair-1 --dir /absolute/store
```

`job run` is a foreground worker. Repeating it observes retained state and never
relaunches that job. `repair tick` starts no coding agent. While the job is
prepared or uncertain, repeated ticks retain the existing suspended generation.
A completed job resumes validation; a failed job produces a rejection without
running checks. A successful repair packet has `action: "review"`, the patch
digest, bounded check output references and exit codes, and
`remoteWriteAuthorized: false`. A rejected/failed/uncertain tick exits nonzero.
Inspection is read-only. Verification executes no adapters or test commands.

The patch binds the admitted HEAD and source tree to a complete tracked binary
Git diff and nonignored untracked files. The host compares it before and after
each check while holding workspace custody in the same host store. Raw tracked
file contents and permission modes are fingerprinted too, including unchanged
files, so Git filters cannot hide drift. Scans are bounded at 128 MiB and 16,384
tracked files. Drift, failing checks, changed
HEAD, symlinks and exceeded bounds cannot yield a review packet. Ignored files
are excluded, so this is not a hermetic build or a filesystem snapshot. The
portable change proposal is a Git patch; raw digests bind the local validation
state but do not contain a complete checkout. Applying the patch elsewhere still
requires validation in that environment.

## Interruption and limits

The launch intent is synced before xcb starts. Lost acknowledgement, timeout,
worker death or unjoined provider work remains uncertain. An OS-released mutex
allows inspection after a crash; it does not establish that remote work stopped.
An unresolved workspace claim also prevents admitting another launch on the same
workspace through this host store. There is no automatic retry or generic command to declare an unknown
provider result successful. The current xcb CLI lacks caller-keyed idempotent
launch and durable result lookup. Reconciliation must establish external
settlement before any new host-admitted work.

Validation is a write effect because host-selected tests can have side effects.
Interrupted checks leave the VM journal uncertain and are not blindly rerun.
The host must own workspace custody; an independent process with filesystem
access can still interfere. Neither cwd nor ACP constitutes OS isolation.

This release does not push, merge, select test commands from model output, or
claim arbitrary repairs are correct. The read-only [PR shepherd](pr-shepherd.md)
can produce source evidence for a host to admit as a job, but preparing that
checkout and authorizing publication remain separate operations. The SDK's
optional source binding records exact PR head/base/test-merge identity and the
host's evidence reference; it does not authenticate that evidence itself.

## Operate a bounded host

Use one store per bounded project episode and keep its full directory with the
source checkout until review is finished. Job records, workspace claims, CAS
values and process journals form one evidence set; copying only a final receipt
is insufficient for complete repair inspection. Take filesystem backups while
workers are stopped. Keep prompts and provider output private according to your
project's policy; they can contain source code or task context.

A store admits at most 256 jobs. There is no destructive garbage collector or
claim-clearing command in this release. Archive completed evidence and start a
new episode only after all prior external work is known settled. Rotating stores
does not authorize overlapping workers on the same checkout. Keep one host owner
for that checkout, since custody is shared within a store, not across independent
stores or arbitrary OS processes.

For a nonzero exit, inspect the job and repair report before taking further
action. `failed` is a settled unsuccessful attempt; `uncertain` is missing proof
of settlement. Preserve the workspace and records, use the provider's supported
inspection path when available, and do not reset or relaunch to hide uncertainty.
A `review` packet still needs the repository's real CI, review and publication
gates; the workflow's fixed local checks cannot replace policies it never observed.

## Reproduce the complete path

```sh
# Deterministic adapter; real Git, subprocesses, tests, journals and CLI restarts:
bun scripts/repair-demo.ts --native ./target/debug/algal --keep --out repair.json
# One actual coding attempt through an existing configured account:
bun scripts/repair-demo.ts --xcb /absolute/path/to/xcb --account ACCOUNT_ID \
  --model PROVIDER_MODEL_EFFORT_KEY --native ./target/debug/algal --keep --out live-repair.json
```

The demo first proves a scheduler utility fails acceptance tests held outside the
agent's checkout. It suspends the VM, repairs filtering/order/boundary/mutation
behavior, retains the patch, reopens the CLI, and checks all seven assertions.
Repeating the coding command observes the same outcome. Both runtimes verify the
two-generation history offline. Deterministic runs count exactly one adapter
launch. Live runs report their provider session without inferring billing or
provider invocation counts from local observations. This is one controlled bug,
not a repair success-rate benchmark or a production PR modification.

See the [coding-job contract](../spec/v1/coding-job.md),
[recovery journal](../spec/v1/process-journal.md), and
[native distribution qualification](native-release.md).
