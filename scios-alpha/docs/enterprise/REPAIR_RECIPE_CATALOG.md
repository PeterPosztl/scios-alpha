# SCI OS ×10 — Repair Recipe Catalog

Canonical registry: `packages/meta-recovery/src/recipes/registry.ts`

Meta-Recovery sits **above** the Startup Recovery Pack (`installer/scripts/start-sci-os.cjs`). Recipes call into that pack; they do not replace it.

## Risk classes

| Class | Meaning | Autonomous default |
|-------|---------|-------------------|
| R0 | Observation only | Yes |
| R1 | No-state-change repair | Yes |
| R2 | Reversible local state | Yes |
| R3 | Service/config change | Policy auth required |
| R4 | Migration / data-affecting | Explicit approval + backup |
| R5 | Prohibited autonomous | Never |

## Catalog

| Recipe ID | Failures | Risk | Notes |
|-----------|----------|------|-------|
| `recipe.observe_only` | UNKNOWN | R0 | Evidence only |
| `recipe.accept_alpha_no_db` | CONFIG_MISSING | R1 | Never invent credentials |
| `recipe.start_control_plane` | HEALTH_TIMEOUT | R2 | Invokes `pnpm sci:repair` |
| `recipe.start_cockpit` | DESKTOP_LOAD_FAILED | R2 | Invokes startup pack |
| `recipe.leaf_boot_repair` | BUILD/SMOKE | R2 | `pnpm boot:repair` |
| `recipe.document_missing_electron` | DESKTOP absent | R1 | Browser cockpit fallback |
| `recipe.document_missing_workers` | QUEUE absent | R1 | No false worker READY |
| `recipe.r5_destructive_reset` | DATA | R5 | Blocked by policy |

## Commands

```bash
pnpm sci:meta-recovery
pnpm sci:meta-recovery:dry-run
pnpm sci:meta-recovery:prove
pnpm sci:meta-recovery:fault-test
pnpm sci:meta-recovery:resume
pnpm sci:capability-scan
pnpm sci:dependency-graph
pnpm sci:repair-recipes
pnpm sci:recovery-memory
pnpm sci:recovery-shell
```
