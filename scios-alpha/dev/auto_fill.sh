#!/usr/bin/env bash
# auto_fill.sh — SCI OS ×10 (propose-only by default; constitution-aligned)
# Usage:
#   bash dev/auto_fill.sh              # propose + gate (no commit)
#   bash dev/auto_fill.sh --apply      # write proposals into tree
#   bash dev/auto_fill.sh --apply --commit   # commit only if gates pass
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MANIFEST_FILE="${MANIFEST_FILE:-build/manifest.json}"
TEMPLATE_DIR="${TEMPLATE_DIR:-dev/templates}"
PLAN_FILE="${PLAN_FILE:-dev/fill-plan.json}"
TEST_CMD="${TEST_CMD:-pnpm gate:scaffold}"
GIT_USER="${GIT_USER:-auto-generator}"
BRANCH_PREFIX="${BRANCH_PREFIX:-auto/fill}"

APPLY=0
COMMIT=0
USE_PYTHON=0
SCAN_TODOS=0
for a in "$@"; do
  case "$a" in
    --apply) APPLY=1 ;;
    --commit) COMMIT=1 ;;
    --python) USE_PYTHON=1 ;;
    --scan-todos) SCAN_TODOS=1 ;;
    --help|-h)
      echo "Usage: bash dev/auto_fill.sh [--apply] [--commit] [--python] [--scan-todos]"
      exit 0
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js szükséges (pnpm monorepo)."
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "Git szükséges."
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm szükséges (SCI OS constitution)."
  exit 1
fi

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "Manifest hiányzik: $MANIFEST_FILE — futtasd a build/manifest generátort."
  exit 1
fi

BRANCH_NAME=""
if [[ "$COMMIT" -eq 1 ]]; then
  if [[ "$APPLY" -ne 1 ]]; then
    echo "--commit csak --apply-jel együtt érvényes."
    exit 1
  fi
  BRANCH_NAME="${BRANCH_PREFIX}-$(date +%s)"
  git checkout -b "$BRANCH_NAME"
fi

if [[ "$USE_PYTHON" -eq 1 ]]; then
  if ! command -v python >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
    echo "Python szükséges a --python kapcsolóhoz."
    exit 1
  fi
  PY=python3
  command -v python3 >/dev/null 2>&1 || PY=python
  GEN_ARGS=("$PY" dev/generator.py --manifest "$MANIFEST_FILE" --templates "$TEMPLATE_DIR" --plan "$PLAN_FILE")
else
  GEN_ARGS=(node dev/generator.cjs --manifest "$MANIFEST_FILE" --templates "$TEMPLATE_DIR" --plan "$PLAN_FILE")
fi
if [[ "$APPLY" -eq 1 ]]; then
  GEN_ARGS+=(--apply)
fi
if [[ "$SCAN_TODOS" -eq 1 ]]; then
  GEN_ARGS+=(--scan-todos)
fi

"${GEN_ARGS[@]}"

echo "Futtatom a gate-et: $TEST_CMD"
EVIDENCE_DIR="diagnostics-export/auto-fill"
mkdir -p "$EVIDENCE_DIR"

set +e
$TEST_CMD
TEST_EXIT=$?
set -e

cat > "$EVIDENCE_DIR/auto-fill-run.json" <<EOF
{
  "at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": ${BRANCH_NAME:+\"$BRANCH_NAME\"}${BRANCH_NAME:-null},
  "apply": $([ "$APPLY" -eq 1 ] && echo true || echo false),
  "commitRequested": $([ "$COMMIT" -eq 1 ] && echo true || echo false),
  "testCmd": "$TEST_CMD",
  "testExit": $TEST_EXIT,
  "label": "ALPHA_NON_PRODUCTION",
  "constitution": "propose-only; never auto-deploy"
}
EOF

if [[ $TEST_EXIT -eq 0 ]]; then
  echo "Gate sikeres."
  if [[ "$COMMIT" -eq 1 ]]; then
    git add -A
    git -c user.name="$GIT_USER" -c user.email="${GIT_USER}@example.com" \
      commit -m "chore(auto-fill): propose/apply missing components (ALPHA)"
    echo "Branch kész: $BRANCH_NAME — ellenőrizd, majd nyiss PR-t."
  else
    echo "Nincs commit (propose-only / --commit nélkül). Bizonyíték: $EVIDENCE_DIR/"
  fi
  exit 0
fi

echo "Gate sikertelen (exit=$TEST_EXIT). Változtatások nem commitolva."
if [[ -n "$BRANCH_NAME" ]]; then
  git checkout - || true
  git branch -D "$BRANCH_NAME" || true
fi
exit 2
