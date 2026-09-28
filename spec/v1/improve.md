# algal.improve.v1

An improvement report records a bounded comparison of improvement strategies over ordinary organisms. Each named arm is one of three kinds: `fixed` evaluates a declared parameter-set of candidate manifests, `labeled` runs a generator organism that receives the labeled train cases once, and `feedback` runs a generator organism that receives a bounded per-generation record of promoted digest, candidate scores, work, usage, and per-case outcome and failure text. Arms run in declaration order through the same case suite, executors, and store, and each promotes one candidate on train and validation evidence under the same deterministic ordering as `algal.foundry.v1`.

## Cases and groups

Every case declares a `group` in addition to its split. The three splits must be pairwise group-disjoint: no group appears in more than one split, so a holdout group can never have been visible during selection or generation. Validation rejects a missing split, a duplicated case id, or a group that crosses a boundary before any run starts.

Labeled arms receive `{ cases: [{id, group, args, expect}] }` for the train split only through their `labeledInput` interface input. Feedback arms receive a per-generation record through `feedbackInput`: generation index, prior promoted digest, and each candidate's train/validation counts, work, usage, and per-case `id`, `group`, `split`, `outcome`, `passed`, and bounded failure text (`feedback` is truncated to 512 bytes and derived only from selection cases). Holdout cases, expectations, and outcomes never enter generator inputs. Both inputs are ordinary interface args, so they replay bit-for-bit from receipts.

## Arms, budgets, and failure

An implicit `incumbent` arm — a fixed arm holding only the incumbent manifest — runs first and supplies the baseline the comparison improves on. Each arm may run under a fresh `algal.habitat-budget.v1` account with the caller's limits (fixed arms record activity `foundry`, generator arms `search`); a refused reservation ends that arm with `exhausted: true` and retains every run it completed. A generator error or invalid proposal ends the arm with `failure` set. Candidates whose run throws before a receipt exists are recorded as failed cases with a null receipt reference. Evidence is never discarded because an arm failed early.

## Evidence, comparison, and decisions

Each arm that promotes a candidate exports an `algal.evaluation-evidence.v1` record binding the incumbent digest, the promoted digest, the dataset digest with its group list and split policy, scorer and runtime digests, usage, reserved/settled work-unit charges, complete per-split outcomes for the promoted candidate, review status, claim category, and limitations. `claimCategory` is `effectiveness` only when labels are declared independent and at least three distinct holdout groups were evaluated; otherwise it is `replay`. Review status starts `not-reviewed` and evidence never attests label truth.

The comparison is `decisive` only when labels are independent, at least three holdout groups exist, the incumbent produced holdout evidence, and a non-incumbent arm's holdout score strictly exceeds the incumbent's. Otherwise `comparison` is `insufficient`, `winner` is null, and `insufficientReasons` names every unmet condition. Every arm carries a `pareto` flag on the holdout-score/work-units frontier. For each arm whose promoted candidate differs from the incumbent the report exports an `algal.promotion-decision.v1`: the winner's decision is `approved`, all others `rejected`, with the rollout record (default a zero-traffic shadow), rollback target and interface compatibility digest, and observed holdout and work metrics.

The report's digest binds the full record. `improveReportRuns` lists every admitted run in order so the embedded accounts reconcile. A decisive report proves a candidate beat the incumbent on this suite under these budgets; it does not establish that the suite is representative or that live effects will match.
