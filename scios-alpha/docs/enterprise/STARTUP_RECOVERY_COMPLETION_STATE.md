# STARTUP RECOVERY COMPLETION STATE

**Updated:** 2026-07-16  
**Phase:** Implementation + validation (ALPHA spine)

## Canonical entry

| Entry | Path |
|-------|------|
| Double-click | `SCI-OS-Start.bat` |
| Orchestrator | `installer/scripts/start-sci-os.cjs` |
| Repair | `installer/scripts/repair-sci-os.cjs` |
| Proof | `installer/scripts/prove-sci-os-startup.cjs` |
| Shutdown | `installer/scripts/shutdown-sci-os.cjs` |
| Leaf boot | `scripts/boot/index.mjs` (no recursion) |

## Commands

```bash
pnpm sci:start
pnpm sci:desktop
pnpm sci:repair
pnpm sci:safe-mode
pnpm sci:startup-smoke
pnpm sci:startup-proof
pnpm sci:diagnostics
pnpm sci:shutdown
```

## Modules created

- `installer/scripts/startup/resolve-app-root.cjs`
- `resolve-node-runtime.cjs`, `resolve-runtime-entries.cjs`, `validate-config.cjs`
- `classify-docker.cjs`, `ensure-postgres.cjs`, `ensure-redis.cjs`, `migration-gate.cjs`
- `resolve-port.cjs`, `process-lock.cjs`, `process-supervisor.cjs`, `health-gate.cjs`
- BAT launchers + schema

## Modules reused

- `scripts/boot/index.mjs`, `ci:prediction-foundation-gate`
- `apps/control-plane-api`, `apps/cockpit-ui`, `packages/vertical-slice`
- `infra/config/default.yaml`, `infra/docker/docker-compose.yml`

## Blockers

| ID | Status |
|----|--------|
| SR-001 BAT | FIXED |
| SR-003 canonical installer | FIXED |
| SR-004 process lock | FIXED |
| SR-005 health-gate | FIXED |
| SR-009 startup report | FIXED |
| SR-010 port resolve | FIXED |
| SR-002 Electron | **OPEN / ABSENT** |
| SR-006/013 PG+Redis | **OPEN / optional ABSENT** |
| SR-011 desktop focus | OPEN (needs Electron) |

## External limitations

- No Electron desktop → HTTP cockpit only
- No PostgreSQL/Redis required for ALPHA vertical slice
- Docker optional (compose has app services only)
- User still needs Node 20+ on PATH (no bundled `runtime/node` yet)

## Latest validation (executed)

| Command | Exit | Result |
|---------|------|--------|
| `pnpm boot:normal` | 0 | GO |
| `pnpm sci:safe-mode` | 0 | DEGRADED (expected) |
| `pnpm sci:repair` | 0 | REPAIR_OK |
| `pnpm sci:startup-smoke` | 0 | DEGRADED (no PG/Redis/Electron) |
| `pnpm sci:startup-proof` | 0 | see startup-report / startup-proof |
| `pnpm sci:shutdown` | 0 | SHUTDOWN_COMPLETE |

## Current verdict

**STARTUP DEGRADED**

Core: control-plane + cockpit HTTP + vertical-slice smoke + canonical orchestrator.  
Absent: Electron desktop, PostgreSQL, Redis/BullMQ workers, bundled Node runtime.
