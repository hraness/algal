# Try the native VM

The native workbench is a complete local demonstration of durable approval,
restart, exact effect recovery, and portable evidence. It uses one `algal`
executable. Bun, Cargo, a repository checkout, credentials, and a web server
are not runtime requirements. [Verify a native release first](native-release.md).

The decision is an embedded deterministic fixture. The process supervisor,
mailboxes, journals, receipt replay, and crash recovery are real. This demonstrates
execution guarantees, not model quality or a live coding provider.

## 1. Start a program, then leave it waiting

Use a new directory; the CLI refuses to merge into an existing one:

```sh
algal demo start ./my-review
algal demo inspect ./my-review
```

Open `my-review/report.html` in your browser. It is a passive, self-contained
report: no server, remote assets, telemetry, or model call. Inspect the proposal,
its input evidence, and the retained history. The first invocation exits with
one recorded fixture decision, one proposal delivery, and no publication.
The process is waiting for an external approval. Closing the browser, exiting
the terminal, or restarting the CLI does not lose the proposal.

Run `inspect` again in another terminal. The verified process head and recorded
effect counts are unchanged. Inspection can refresh derived report files; it
never advances the VM.

For your own small JSON evidence (at most 8 KiB, depth 16, and 512 JSON nodes):

```sh
algal demo start ./my-evidence-review --evidence ./checks.json
```

The evidence is retained in the workbench and exported history. Use data you
intend to retain and share. The fixture's recommendation is not an independent
assessment of the truth of your input.

## 2. Authorize the exact action

The report offers **Copy approve command** and **Copy deny command**. It uses
the absolute executable that generated the report. Copying does not execute
anything; review and paste the command into your terminal.

The command includes the exact proposal digest and action:

```sh
algal demo approve ./my-review \
  --proposal sha256:REPLACE_WITH_THE_REPORTED_DIGEST \
  --action publish-local-report
```

Use `deny` in place of `approve` to finish without publishing. The approval is
bound to the workbench's identity, input evidence, full proposal, and local
publication destination. A wrong digest or action is rejected before admission.
A denied workflow is complete, but it is not approved.

Reopen `report.html` after the command. Approval yields one local outbox delivery
and `publication.json`; denial yields neither. Repeat the same decision: it
creates no new VM generation, decision effect, or publication delivery. A
conflicting second decision is rejected. Derived projections may be refreshed
from the verified retained execution.

The local CLI is the operator authority. This is not a multi-user identity or
permissions system. No remote publication occurs.

## 3. Verify the history after moving the source away

```sh
algal demo export ./my-review > review.evidence.json
mv ./my-review ./my-review-retained-away
algal demo verify ./review.evidence.json
```

The final command needs only the evidence file and the executable. It does not
activate host tools or require the original store. The same file is accepted by
`algal process verify-evidence`. Altering hashed records or removing required
objects fails verification. Receipt replay checks execution consistency; it does
not authenticate an author, establish provider truth, or transfer custody.

Moving a workbench intentionally prevents further local workbench operations:
its admitted root and filesystem identity are bound. A moved HTML report is an
archived snapshot; its copied operational commands still refer to the original
root. Use the portable evidence file for detached verification. For an active
review, leave its root in place.

## 4. Run the actual crash laboratory

```sh
algal demo prove ./crash-laboratory
```

This runs bounded child invocations of the same executable. It waits for an
exact token-bound durable journal barrier, sends SIGKILL only to its own child,
joins that child, then uses explicit recovery of the retained intent. It writes
`proof.json` and the following evidence:

| Demonstration | Asserted outcome | Artifact |
| --- | --- | --- |
| Approval across separate CLI invocations | One fixture decision and one local publication; duplicate approval retains the same head | `approved-source-away/report.html` (archived snapshot) |
| Denial | Complete with zero publication deliveries | `denied/report.html` |
| Source removed from its original path | Portable replay retains the approved head | `portable.algal.json` |
| Crash during a read | Safe read retries; completed prefix receipt is reused without a second write | `read-crash/report.json` and `read-crash/evidence.algal.json` |
| Crash after a local write but before its acknowledgement | Recovery returns `RECOVERY_BLOCKED`; the head and journal stay unchanged; scheduling performs zero ticks | `write-crash/report.json` and `write-crash/evidence.algal.json` |

The last case is a successful safety demonstration: one local write occurred,
but the VM has no confirmed result, so it retains `uncertain` and refuses to
repeat it. The read and write fixtures are deliberately different. This does
not claim that every interrupted approval or arbitrary provider write can be
recovered. Do not delete an uncertain journal or recreate the operation to
force it through.

## Build identity and operating limits

`algal doctor` reports the embedded source commit, bounded native-source input
digest, target, and Rust compiler. An installation made with the archive installer
also retains checksum-bound release metadata. This is diagnostic provenance,
not a publisher signature. [The native release guide](native-release.md) describes
the package checks and platform support.

The CLI remains an application VM, not an OS sandbox or hypervisor. It has bounded
programs and process journals, but no general multi-tenant service, distributed
custody, global store quota, or retention/GC service. Native packages are still
unsigned, unnotarized prereleases. Coding-job reconciliation and repair validation
currently use the Bun host; this native demo makes no claim of their parity.
