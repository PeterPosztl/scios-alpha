#!/usr/bin/env bash
# bootstrap_auto_finish.sh — installs SCI OS auto-finish kit (does NOT commit)
# Unlike the raw paste: no auto branch/commit/PR; files are already in-repo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "SCI OS auto-finish kit:"
echo "  python dev_auto_finish/generator_strong.py --manifest build/manifest.json --templates dev_auto_finish/templates --report dev_auto_finish/report.json"
echo "  pnpm auto:finish"
echo "  pnpm auto:finish:gates"
echo "Commit only with: node dev_auto_finish/auto_finish.cjs --apply --commit"
echo "OPEN_PR never automatic without human gh/API step."
