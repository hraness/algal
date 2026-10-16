# Event-loop P1 published-head recheck

Status: draft pull request [#278](https://github.com/hraness/algal/pull/278), checked 2026-10-16. This is a read-only check of the published head, not a final-tree parity result. The [integration handoff](event-loop-p1-integration-handoff.md) records the separate local tests and their limits.

The local branch and the pull request both point to `613453e5afa0c6d19cedcd471340504c14217347`. `gh pr view 278 -R hraness/algal --json number,state,isDraft,headRefOid,autoMergeRequest,latestReviews,reviewDecision` reported the pull request open and draft, with auto-merge unset, no latest reviews, and no review decision. `gh pr checks 278 -R hraness/algal --required` exited 1: `Required` failed at [run 38741615160](https://github.com/hraness/algal/actions/runs/38741615160/job/116446763336).

The local `git diff` for `scripts/event-loop-replay-parity.ts` and `src/event-loop-pending.test.ts` has SHA-256 `a2dab96cd9c3862a5fc8daaedc1c41104009187bb2836568137cb817389a4d09`. The integration handoff is also modified locally, and `.cache/` remains untracked. `bun install --frozen-lockfile` passed with Bun 1.3.14; no test or parity command was repeated for this unchanged code key. These local changes are not in the published pull request.

**Agent-decided, owner may revisit:** retain the existing branch and leave #278 draft without auto-merge. **P1_CONTRACT_PARITY_BLOCKED** until final published-tree checks, a green `Required` on that head, and affirmative independent final-tree review pass. No commit, push, merge, or host delivery occurred during this recheck.
