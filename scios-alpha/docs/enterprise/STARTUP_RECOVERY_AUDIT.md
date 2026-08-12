# STARTUP RECOVERY AUDIT — SCI OS ×10 (`scios-alpha`)

**Audited:** 2026-07-16  
**Honesty:** ALPHA scaffold. Missing enterprise surfaces are **ABSENT**, not READY.

## Summary

| Area | Status |
|------|--------|
| Boot modes (normal/repair/safe/proof) | WORKING — `scripts/boot/index.mjs` |
| Prediction foundation CI gate | WORKING |
| Control-plane + cockpit HTTP | PARTIAL / ALPHA |
| Electron desktop | **ABSENT** |
| Bundled `runtime/node` | **ABSENT** |
| PostgreSQL / migrations | **ABSENT** (in-process slice needs none) |
| Redis / BullMQ workers | **ABSENT** |
| Windows service scripts | **ABSENT** |
| User BAT launcher (no shell required) | **MISSING** → implement |
| Canonical `installer/scripts` tree | **MISSING** → implement (reuse boot) |
| Turborepo | **ABSENT** |
| Docker Compose (app services only) | PARTIAL — no Postgres/Redis |
| Duplicate legacy `src/` loop | DEPRECATED |

## Findings

| ID | Severity | File / area | Root cause | User impact | Auto-repair | Repair method | Rollback | Test | Status |
|----|----------|-------------|------------|-------------|-------------|---------------|----------|------|--------|
| SR-001 | P0 | No `SCI-OS-Start.bat` | User must use pnpm/PowerShell | Cannot double-click start | yes | Add BAT → `start-sci-os.cjs` | remove BAT | double-click / `sci:start` | OPEN→FIX |
| SR-002 | P0 | No Electron | Desktop UX contract unmet | No native window | no | ABSENT; HTTP cockpit + startup UI | n/a | proof marks desktop ABSENT | OPEN |
| SR-003 | P1 | `scripts/boot` only | Not under `installer/scripts` | Contract path mismatch | yes | Canonical orchestrator + thin alias | keep alias | proof | OPEN→FIX |
| SR-004 | P1 | No process lock | Multi-start risk | Duplicate servers | yes | `process-lock.cjs` | delete lock | second launch | OPEN→FIX |
| SR-005 | P1 | No health-gate module | Ad-hoc health | False READY risk | yes | `health-gate.cjs` | n/a | probe /healthz | OPEN→FIX |
| SR-006 | P2 | Docker compose sans DB | No PG/Redis in compose | Enterprise deps ABSENT | no | Classify optional; DEGRADED | n/a | docker classify | OPEN |
| SR-007 | P2 | `shell: true` in boot | Windows spawn convenience | Slight injection risk locally | partial | Prefer `shell:false` where possible | revert | smoke | OPEN |
| SR-008 | P2 | Legacy `src/` Math.random | Deprecated path | Confusion | yes | Quarantine note; do not use in boot | n/a | gate | DEFERRED |
| SR-009 | P0 | No startup-report schema | Contract §24 | Incomplete evidence | yes | schema + writer | n/a | validate JSON | OPEN→FIX |
| SR-010 | P1 | Ports hardcoded 5200–5230 | Fixed localhost | Conflict risk | yes | `resolve-port.cjs` + reuse healthy | n/a | port conflict | OPEN→FIX |
| SR-011 | P2 | No single-instance desktop focus | N/A without Electron | — | no | ABSENT | n/a | — | OPEN |
| SR-012 | INFO | No C:\\Galaxus hardcode | Clean | — | — | — | — | — | OK |
| SR-013 | P1 | Postgres/Redis ABSENT | Not in ALPHA spine | Queue/DB features unavailable | no | Safe Mode + DEGRADED | n/a | ensure-* returns not_configured | OPEN |
| SR-014 | P2 | Duplicate boot vs future installer | Parallel risk | Drift | yes | One orchestrator | aliases only | proof | OPEN→FIX |

## Reuse map

| Existing | Role after pack |
|----------|-----------------|
| `scripts/boot/index.mjs` | Delegated by `start-sci-os.cjs` (no duplicate logic) |
| `scripts/ci-prediction-foundation-gate.mjs` | Proof Mode dependency |
| `apps/control-plane-api` | Backend entry |
| `apps/cockpit-ui` | Cockpit (HTTP, not Electron) |
| `infra/docker/docker-compose.yml` | Optional service stack |
| `infra/config/default.yaml` | Config validation input |
| `packages/vertical-slice` | Core readiness smoke |

## Verdict after audit (pre-implementation)

**STARTUP NO_GO** for full enterprise desktop pack (Electron/PG/Redis ABSENT).  
**Path:** implement canonical installer + BAT + supervision against ALPHA spine → target **STARTUP DEGRADED** (core cockpit usable without PG/Redis/Electron).
