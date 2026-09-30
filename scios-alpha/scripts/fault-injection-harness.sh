#!/usr/bin/env bash
# Linux/CI wrapper — prefers Node harness for cross-platform parity.
set -e
cd "$(dirname "$0")/.."
echo "Fault injection harness starting (bash → node)..."
node scripts/fault-injection-harness.js
