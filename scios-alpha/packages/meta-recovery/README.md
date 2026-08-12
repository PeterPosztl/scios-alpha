# Meta-Recovery Engine

Intelligence layer **above** the Startup Recovery & Readiness Pack.

- Does not duplicate `installer/scripts/start-sci-os.cjs`
- Fail-closed, simulation-first, transactional repair (R0–R2 auto)
- Evidence under `diagnostics-export/meta-recovery/`

## Modules

All required engines live under `packages/meta-recovery/src/` and are exercised by `MetaRecoveryController`.

## Bootstrap Kernel (independent)

Recovery Shell (`apps/meta-recovery-control-plane`) runs without PostgreSQL, Redis, or full desktop.
