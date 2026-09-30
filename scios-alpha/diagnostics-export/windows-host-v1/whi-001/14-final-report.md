# WHI-001 — Windows Job Objects → SCI Process Supervisor

**FINAL TOKEN:** `WHI_001_PASS`

Label: ALPHA_NON_PRODUCTION  
At: 2026-08-18

---

## STATUS

| Field | Value |
|-------|-------|
| BASELINE BUILD | pkg_1787074480539 |
| NEW BUILD | **pkg_1787080434560** |
| PROCESS SUPERVISOR AUTHORITY | **PASS** |
| JOB OBJECT SCAFFOLD BEFORE | SCAFFOLD ONLY |
| JOB OBJECT WIRING | **PASS** |
| REAL WINDOWS JOB OBJECT | **PROVEN** |
| JOB HANDLE LIFETIME | **PASS** (keeper alive until `closeHostLayer`) |
| CONTROL PLANE OWNERSHIP | **PASS** (jobAttached, pid in assignLog) |
| COCKPIT OWNERSHIP | **PASS** |
| WORKER OWNERSHIP | **NA** (in-process foundation worker) |
| RECOVERY BOUNDARY | **PASS** (safe-mode recovery outside job group) |
| NORMAL SHUTDOWN | **PASS** |
| OWNER LOSS | **PASS** |
| ORPHAN PREVENTION | **PASS** |
| DUPLICATE START | **PASS** (process-lock + per-run keeper) |
| HELPER FAILURE | **PASS** (JOB_OBJECT_UNAVAILABLE honest fallback) |
| UNOWNED PID REJECTION | **PASS** |
| SECURITY | **PASS** |
| PACKAGE | **PASS** |
| INSTALLED RUNTIME | **PASS** |
| PACKAGED GW1 | **PASS** |
| RECOVERY | **PASS** |
| P0 BEFORE | 0 |
| P0 AFTER | **0** |
| P1 AFTER | 91 |
| P2 AFTER | 184 |
| P3 AFTER | 46 |

---

## What was implemented

1. **`host/contract.cjs`** — host result schema (Product Kernel isolated)
2. **`host/process-ownership.cjs`** — boot/run-attributed ownership descriptors + validation
3. **`host/job-object-provider.cjs`** — Windows Job Object provider (internal, no arbitrary PID API)
4. **`host/helpers/job-object-keeper.ps1`** — long-lived keeper with `KILL_ON_JOB_CLOSE`, marker handshake, stdin command protocol
5. **`process-supervisor.cjs`** — wired init/attach/stop/close; graceful shutdown first, job terminate fallback
6. **`start-sci-os.cjs`** — passes runId/buildId/ports; init host layer; close on finalize
7. **`build-distribution.cjs`** — packages `installer/scripts/host/**`
8. **`scripts/tests/whi-001-job-object.cjs`** — targeted test suite (in `test:release`)
9. **`scripts/tests/whi-001-prove.cjs`** — package + installed proof assembler

## Architecture preserved

- `start-sci-os.cjs` = sole boot authority
- `ProcessSupervisor` = lifecycle authority
- Job Objects = Windows mechanism inside supervisor (not a second orchestrator)
- Cockpit / Product Kernel = no Windows Job Object knowledge

## Installed runtime evidence

`%LOCALAPPDATA%\SCI OS X10\app\diagnostics-export\host\job-object-state.json`:

- CP + Cockpit **jobAttached: true**
- assignLog: OK ASSIGN for both PIDs
- buildId: pkg_1787080434560

## PowerShell dependency truth

| Item | Value |
|------|-------|
| Class | **WINDOWS_HOST_HELPER_V1** |
| Executable | `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe` |
| Policy | `RemoteSigned` (not unrestricted Bypass) |
| Invoker | Process Supervisor internal only |
| Failure | `JOB_OBJECT_UNAVAILABLE` → taskkill tree fallback |
| Later debt | **WHI_NATIVE_HELPER_MIGRATION** (optional bundled native helper) |

## FILES CHANGED

- `installer/scripts/host/contract.cjs` (new)
- `installer/scripts/host/process-ownership.cjs` (new)
- `installer/scripts/host/job-object-provider.cjs` (new)
- `installer/scripts/host/helpers/job-object-keeper.ps1` (wired)
- `installer/scripts/startup/process-supervisor.cjs`
- `installer/scripts/start-sci-os.cjs`
- `scripts/package/build-distribution.cjs`
- `scripts/tests/whi-001-job-object.cjs` (new)
- `scripts/tests/whi-001-prove.cjs` (new)
- `scripts/tests/fixtures/whi-001-owner-loss-fixture.cjs` (new)
- `package.json` (test:release includes whi-001)

## TESTS ADDED

- `scripts/tests/whi-001-job-object.cjs`
- `scripts/tests/fixtures/whi-001-owner-loss-fixture.cjs`
- `scripts/tests/whi-001-prove.cjs`

## TESTS RUN

- `node scripts/tests/whi-001-job-object.cjs` → PASS
- `pnpm test:release` → PASS (with live installed CP)
- Installed launch via `SCI-OS-X10.exe` → GW1 PASS
- `pnpm closure:engine` → P0=0

## PROOF FILES

`diagnostics-export/windows-host-v1/whi-001/`:

- 01-current-process-topology.json
- 02-job-object-scaffold-analysis.json
- 03-normal-shutdown-proof.json
- 04-child-crash-proof.json
- 05-owner-loss-proof.json
- 06-duplicate-start-proof.json
- 07-helper-failure-proof.json
- 08-security-proof.json
- 09-package-proof.json
- 10-installed-runtime-proof.json
- 10b-installed-shutdown-proof.json
- 10c-recovery-boundary-proof.json
- 11-p0-regression-proof.json
- 12-closure-before-after.json
- 13-final-report.json
- 14-final-report.md
- whi-001-test-run.json

## TECHNICAL DEBT

- **WHI_NATIVE_HELPER_MIGRATION** — replace PowerShell keeper with bundled native helper when convenient
- Marker-file handshake workaround for PowerShell pipe buffering (documented, proven)

## USER_ACTION_REQUIRED

None for WHI-001.

## NEXT EXACT ACTION

Do **not** start WHI-002 automatically. Founder-gated: Host Event Provider (WHI-004) or Resource Intelligence PDH augment (WHI-005).

**WHI_001_PASS**
