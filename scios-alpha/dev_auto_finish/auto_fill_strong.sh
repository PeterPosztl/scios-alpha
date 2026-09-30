#!/usr/bin/env bash
# auto_fill_strong.sh — SCI OS ×10 (propose-only by default)
#   bash dev_auto_finish/auto_fill_strong.sh
#   bash dev_auto_finish/auto_fill_strong.sh --apply --run-gates
#   bash dev_auto_finish/auto_fill_strong.sh --apply --commit   # explicit only
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DEV_DIR="dev_auto_finish"
BRANCH_PREFIX="auto/finish"
MANIFEST="${REPO_ROOT}/build/manifest.json"
TEMPLATE_DIR="${REPO_ROOT}/${DEV_DIR}/templates"
GEN_SCRIPT="${REPO_ROOT}/${DEV_DIR}/generator_strong.py"
LOG_FILE="${REPO_ROOT}/${DEV_DIR}/auto_finish.log"
REPORT="${REPO_ROOT}/${DEV_DIR}/report.json"
GIT_USER="auto-finisher"
TEST_CMD="${TEST_CMD:-pnpm gate:scaffold}"
OPEN_PR="${OPEN_PR:-false}"

APPLY=0
COMMIT=0
SCAN_TODOS=0
RUN_GATES=0
for a in "$@"; do
  case "$a" in
    --apply) APPLY=1 ;;
    --commit) COMMIT=1 ;;
    --scan-todos) SCAN_TODOS=1 ;;
    --run-gates) RUN_GATES=1 ;;
    --help|-h)
      echo "Usage: bash dev_auto_finish/auto_fill_strong.sh [--apply] [--commit] [--scan-todos] [--run-gates]"
      exit 0
      ;;
  esac
done

if [[ "$COMMIT" -eq 1 && "$APPLY" -ne 1 ]]; then
  echo "--commit requires --apply"
  exit 1
fi

PY=python3
command -v python3 >/dev/null 2>&1 || PY=python
command -v "$PY" >/dev/null 2>&1 || { echo "Python szükséges"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "Git szükséges"; exit 1; }

[[ -f "$MANIFEST" ]] || { echo "Manifest hiányzik: $MANIFEST"; exit 1; }

BRANCH_NAME=""
if [[ "$COMMIT" -eq 1 ]]; then
  BRANCH_NAME="${BRANCH_PREFIX}-$(date +%s)"
  git checkout -b "$BRANCH_NAME"
  echo "Branch: $BRANCH_NAME" | tee "$LOG_FILE"
else
  : > "$LOG_FILE"
  echo "Propose-only / no-commit run" | tee -a "$LOG_FILE"
fi

GEN_ARGS=("$PY" "$GEN_SCRIPT" --manifest "$MANIFEST" --templates "$TEMPLATE_DIR" --report "$REPORT")
[[ "$APPLY" -eq 1 ]] && GEN_ARGS+=(--apply)
[[ "$SCAN_TODOS" -eq 1 ]] && GEN_ARGS+=(--scan-todos)
[[ "$RUN_GATES" -eq 1 ]] && GEN_ARGS+=(--run-gates)

"${GEN_ARGS[@]}" 2>&1 | tee -a "$LOG_FILE"

GATE_OK=1
if [[ "$RUN_GATES" -eq 1 || "$COMMIT" -eq 1 ]]; then
  echo "Gate: $TEST_CMD" | tee -a "$LOG_FILE"
  set +e
  $TEST_CMD 2>&1 | tee -a "$LOG_FILE"
  GATE_OK=$?
  set -e
fi

if [[ $GATE_OK -ne 0 ]]; then
  echo "Gate sikertelen — nincs commit." | tee -a "$LOG_FILE"
  if [[ -n "$BRANCH_NAME" ]]; then
    git checkout - || true
    git branch -D "$BRANCH_NAME" || true
  fi
  exit 2
fi

if [[ "$COMMIT" -eq 1 ]]; then
  git add -A
  git -c user.name="$GIT_USER" -c user.email="${GIT_USER}@example.com" \
    commit -m "chore(auto-finish): fill missing components (ALPHA propose/apply)"
  echo "Commitolva: $BRANCH_NAME" | tee -a "$LOG_FILE"
  if [[ "$OPEN_PR" = "true" ]]; then
    echo "OPEN_PR=true — futtasd kézzel: gh pr create (API/token kell)." | tee -a "$LOG_FILE"
  fi
else
  echo "Nincs commit. Report: $REPORT és diagnostics-export/auto-finish/" | tee -a "$LOG_FILE"
fi

echo "Kész."
