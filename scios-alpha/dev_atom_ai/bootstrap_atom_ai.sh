#!/usr/bin/env bash
# bootstrap_atom_ai.sh — documents kit; does NOT auto-commit or install systemd
set -euo pipefail
cd "$(dirname "$0")/.."
echo "SCI OS Atom AI kit (constitution-safe)"
echo "  pnpm atom:ai"
echo "  pnpm atom:ai:gates"
echo "  pnpm atom:health"
echo "  pnpm atom:health:repair   # explicit sci:repair only"
echo "Canonical start remains: pnpm sci:start"
echo "Systemd unit is proposal-only under .atom_ai/systemd/"
