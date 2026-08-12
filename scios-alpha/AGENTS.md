# AGENTS.md — SCI OS ×10 (scios-alpha)

## Truth

This repository is an **ALPHA scaffold**, not an enterprise production platform.

- Baseline models are **NON-PRODUCTION**.
- No subsystem may self-declare READY without Meta-Intelligence evidence.
- No evidence ⇒ **UNKNOWN**, never PASS.

## Package manager

**pnpm only** (`packageManager` in root `package.json`). Do not introduce npm/yarn lockfiles.

## Waves (Section 82)

Implement in waves. Current focus: **Wave 0 proven → Wave 1**.

Do not generate hundreds of empty directories. Prefer a working vertical slice with proof.

## Contracts

Do not rewrite stable public contracts without approval. Use adapters and versioned migrations.

## Gates

```bash
pnpm gate:scaffold
pnpm gate:foundation
pnpm ci:prediction-foundation-gate
```

## Boot modes

```bash
pnpm boot:normal   # automatic normal startup
pnpm boot:repair   # auto-repair known issues
pnpm boot:safe     # read-only limited startup
pnpm boot:proof    # full validation → GO/NO_GO evidence
pnpm start         # alias → boot:normal
```

Exit 0 only with evidence under `diagnostics-export/` (except Safe Mode: stdout only).

## Cursor rules

See `.cursor/rules/` and `.cursor/skills/sci-os-platform/SKILL.md`.
