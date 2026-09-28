#!/usr/bin/env bash
# Drives the v5 matched-conditions study. Paid stages refuse a second attempt
# in the same results directory, including after an interrupted invocation.
# Inspect the original attempt before choosing a new study directory.
#
#   run.sh seed   <slug>            # shared catalog seed eval (live executor)
#   run.sh build  <slug>            # emit the four arm configs for one corpus
#   run.sh run    <slug> <arm>      # one arm session (live executor)
#   run.sh report <slug>            # experiment report + verify over sessions
#   run.sh grade  <slug>            # offline grading per arm session
#   run.sh evidence [--eval-heads]  # export evidence + promotion records
#
# Executor flags reach `algal experiment`, seed.ts, and evidence.ts verbatim:
#   EXECUTOR_FLAGS="--base-url https://api.x.ai/v1 --model grok-4.5 --credential-env XAI_API_KEY"
# or --responses <file> / --executor-cmd <cmd> for scripted runs.
#
# slugs: v4 (tasks/v4, seed 20260927), v5-b (tasks/v5/b), v5-c (tasks/v5/c)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

STUDY="${STUDY_DIR:-experiments/cumulative-skill/results/v5/live}"
TASKS=experiments/cumulative-skill/tasks
ARMS="fixed retained optimizer optimizer-raw"
EXECUTOR_FLAGS="${EXECUTOR_FLAGS:-}"
BUN_BIN="${BUN_BIN:-bun}"
EXECUTOR_JSON="$(python3 -c 'import json,shlex,sys;print(json.dumps(shlex.split(sys.argv[1])))' "$EXECUTOR_FLAGS")"
EXECUTOR_ARGS=()
while IFS= read -r -d '' arg; do EXECUTOR_ARGS+=("$arg"); done < <(
  python3 -c 'import json,sys;sys.stdout.buffer.write(b"".join(a.encode()+b"\0" for a in json.loads(sys.argv[1])))' "$EXECUTOR_JSON"
)

bind_execution() {
  python3 experiments/cumulative-skill/arms/v5/execution.py "$STUDY" "$1" "$EXECUTOR_JSON" "$BUN_BIN"
}

tasks_dir() {
  case "$1" in
    v4)   echo "$TASKS/v4" ;;
    v5-b) echo "$TASKS/v5/b" ;;
    v5-c) echo "$TASKS/v5/c" ;;
    *) echo "unknown slug $1" >&2; exit 2 ;;
  esac
}

cmd_seed() {
  local slug="$1"
  local tasks
  tasks="$(tasks_dir "$slug")"
  local cdir="$STUDY/$slug" store="$STUDY/stores/$slug/seed"
  mkdir -p "$cdir" "$store"
  [[ ! -e "$cdir/seed-catalog.json" && ! -e "$cdir/seed-summary.json" ]] || { echo "seed artifacts already exist: $cdir" >&2; return 1; }
  mkdir "$cdir/seed.attempt" || { echo "seed already attempted; inspect $cdir/seed.attempt before any new provider call" >&2; return 1; }
  bind_execution "$cdir/seed.attempt"
  "$BUN_BIN" experiments/cumulative-skill/arms/v5/seed.ts "$tasks" "$store" \
    --out "$cdir" ${EXECUTOR_ARGS[@]+"${EXECUTOR_ARGS[@]}"} > "$cdir/seed.attempt/stdout.log" 2> "$cdir/seed.attempt/stderr.log" || {
      tail -c 4000 "$cdir/seed.attempt/stderr.log" >&2
      return 1
    }
  cat "$cdir/seed.attempt/stdout.log"
}

cmd_build() {
  local slug="$1"
  [[ ! -d "$STUDY/$slug/attempts" ]] || { echo "refusing to replace configs after execution started" >&2; return 1; }
  "$BUN_BIN" experiments/cumulative-skill/arms/v5/build.ts "$(tasks_dir "$slug")" \
    "$STUDY/$slug/seed-catalog.json" "$STUDY/$slug"
}

cmd_run() {
  local slug="$1" arm="$2"
  tasks_dir "$slug" > /dev/null
  case "$arm" in fixed|retained|optimizer|optimizer-raw) ;; *) echo "unknown arm $arm" >&2; return 2 ;; esac
  local cdir="$STUDY/$slug" store="$STUDY/stores/$slug/$arm"
  local seed_store="$STUDY/stores/$slug/seed"
  local config="$cdir/$arm.config.json"
  [[ -f "$config" ]] || { echo "missing $config — run build first" >&2; exit 2; }
  [[ -d "$seed_store" && ! -e "$store" ]] || { echo "seed store missing or arm store already exists" >&2; return 1; }
  mkdir -p "$cdir/sessions.d" "$cdir/attempts"
  [[ ! -e "$cdir/$arm.session.json" && ! -e "$cdir/sessions.d/$arm" ]] || { echo "session already exists: $slug/$arm" >&2; return 1; }
  local attempt="$cdir/attempts/$arm"
  mkdir "$attempt" || { echo "arm already attempted; inspect $attempt before any new provider call" >&2; return 1; }
  bind_execution "$attempt"
  cp "$config" "$attempt/config.json"
  python3 - "$attempt" "$arm" <<'PY'
import hashlib, json, sys
from pathlib import Path
attempt = Path(sys.argv[1])
binding = {
    'contract': 'algal.study-attempt.v1', 'arm': sys.argv[2],
    'configBytesSha256': hashlib.sha256((attempt/'config.json').read_bytes()).hexdigest(),
    'executionBytesSha256': hashlib.sha256((attempt/'execution.json').read_bytes()).hexdigest(),
}
(attempt/'binding.json').write_text(json.dumps(binding, sort_keys=True, indent=1)+'\n')
PY
  cp -R "$seed_store" "$store"
  # An exhausted session is a study result, not an infra failure.
  local code=0
  "$BUN_BIN" cli.ts experiment "$attempt/config.json" --dir "$store" ${EXECUTOR_ARGS[@]+"${EXECUTOR_ARGS[@]}"} \
      --out "$cdir/$arm.session.json" > "$attempt/stdout.log" 2> "$attempt/stderr.log" || code=$?
  printf '%s\n' "$code" > "$attempt/exit-code"
  python3 - "$attempt/stdout.log" "$cdir/$arm.session.json" "$code" <<'PY'
import hashlib, json, re, sys
summary = json.load(open(sys.argv[1]))
session_bytes = open(sys.argv[2], 'rb').read()
session = json.loads(session_bytes)
assert re.fullmatch(r'sha256:[0-9a-f]{64}', summary.get('session', '')), 'missing session digest'
assert summary['session'] == 'sha256:' + hashlib.sha256(session_bytes).hexdigest(), 'session digest differs from saved artifact'
assert summary['outcome'] == session['outcome'], 'session outcome mismatch'
assert int(sys.argv[3]) == (0 if summary['outcome'] == 'complete' else 1), 'unexpected process exit; preserve attempt for reconciliation'
PY
  local session outcome
  session="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["session"])' "$attempt/stdout.log")"
  outcome="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["outcome"])' "$attempt/stdout.log")"
  # Per-arm marker files keep concurrent runs race-free; sessions.json is
  # assembled at report time.
  printf '%s' "$session" > "$cdir/sessions.d/$arm"
  printf '%s' "$outcome" > "$cdir/sessions.d/$arm.outcome"
  cp "$attempt/stdout.log" "$attempt/session.json"
  echo "$slug/$arm session=$session outcome=$outcome"
}

sessions_map() {
  local cdir="$1"
  python3 - "$cdir/sessions.d" <<'PY'
import json, os, sys
d = sys.argv[1]
out = {}
if os.path.isdir(d):
    for name in os.listdir(d):
        if name.endswith(".outcome"): continue
        out[name] = open(os.path.join(d, name)).read().strip()
        outcome_file = os.path.join(d, f"{name}.outcome")
        if os.path.exists(outcome_file):
            out[f"{name}.outcome"] = open(outcome_file).read().strip()
print(json.dumps(out, indent=1, sort_keys=True))
PY
}

cmd_report() {
  local slug="$1"
  local cdir="$STUDY/$slug"
  sessions_map "$cdir" > "$cdir/sessions.json"
  python3 - "$cdir/sessions.json" "$cdir" "$ARMS" <<'PY'
import json, sys
sessions, out_dir, arm_list = sys.argv[1], sys.argv[2], sys.argv[3].split()
data = json.load(open(sessions))
# A native report permits only one arm of each kind and distinct account
# digests. Both optimizer variants have kind optimizer, and fixed/retained
# may legitimately have identical accounting, so verify each independently.
for a in arm_list:
    assert data.get(a), f'missing session {a}'
    cfg = {"contract": "algal.skill-experiment.config.v1", "study": "cumulative-skill-v5-matched", "arms": [{"session": data[a]}]}
    json.dump(cfg, open(f'{out_dir}/{a}.report.config.json', 'w'), indent=1)
PY
  for arm in $ARMS; do
    local store="$STUDY/stores/$slug/$arm"
    "$BUN_BIN" cli.ts experiment report "$cdir/$arm.report.config.json" --dir "$store" --out "$cdir/$arm.report.json"
    "$BUN_BIN" cli.ts experiment verify "$cdir/$arm.report.json" --dir "$store"
  done
}

cmd_grade() {
  local slug="$1"
  local cdir="$STUDY/$slug"
  for arm in $ARMS; do
    local store="$STUDY/stores/$slug/$arm"
    local session
    session="$(cat "$cdir/sessions.d/$arm" 2>/dev/null || true)"
    [[ -n "$session" ]] || { echo "missing session $slug/$arm" >&2; return 1; }
    cmp "$cdir/$arm.config.json" "$cdir/attempts/$arm/config.json"
    "$BUN_BIN" experiments/cumulative-skill/arms/v5/grade.ts "$store" "$(tasks_dir "$slug")" \
      "$cdir/$arm.config.json" "$session" > "$cdir/$arm.scores.json"
    python3 -c "
import json
s = json.load(open('$cdir/$arm.scores.json'))
g = s['groups']
for name in ['acquisition','unseen','shift']:
    c = g[name]
    print('$slug/$arm', name, f\"{c['scorerPassed']}/{c['tasks']} scorer-passed, {c['labelsCorrect']}/{c['recordsTotal']} labels, {c['complete']}/{c['tasks']} complete\")
"
  done
}

cmd_evidence() {
  shift
  for arg in "$@"; do
    case "$arg" in --base-url|--model|--credential-env|--responses|--executor-cmd) echo "set executor options through EXECUTOR_FLAGS for every stage" >&2; return 2 ;; esac
  done
  for slug in v4 v5-b v5-c; do
    [[ -d "$STUDY/$slug/sessions.d" ]] && sessions_map "$STUDY/$slug" > "$STUDY/$slug/sessions.json"
  done
  for arg in "$@"; do
    if [[ "$arg" == --eval-heads ]]; then
      mkdir "$STUDY/frozen-evaluation.attempt" || { echo "frozen evaluation already attempted; inspect existing evidence before any new provider call" >&2; return 1; }
      bind_execution "$STUDY/frozen-evaluation.attempt"
      break
    fi
  done
  "$BUN_BIN" experiments/cumulative-skill/arms/v5/evidence.ts "$STUDY" "$@" ${EXECUTOR_ARGS[@]+"${EXECUTOR_ARGS[@]}"}
}

case "${1:-}" in
  seed)     cmd_seed "$2" ;;
  build)    cmd_build "$2" ;;
  run)      cmd_run "$2" "$3" ;;
  report)   cmd_report "$2" ;;
  grade)    cmd_grade "$2" ;;
  evidence) cmd_evidence "$@" ;;
  *) echo "usage: run.sh seed|build|run|report|grade|evidence ..." >&2; exit 2 ;;
esac
