#!/usr/bin/env bash
# Linux/CI wrapper — Node harness for Windows/macOS/Linux parity.
set -e
cd "$(dirname "$0")/.."
export SMOKE_BASE="${SMOKE_BASE:-http://127.0.0.1:5230}"
node scripts/smoke-vertical-slice.js
