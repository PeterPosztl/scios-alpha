# WHI-011 — SCI Host Digital Twin

**STATUS:** HOST_DIGITAL_TWIN_PASS  
**CANONICAL SLICE ID:** WHI-011  

Historical ID drift: Host Digital Twin appeared as WHI-002 in `prove-windows-host-v1.cjs`. Canonical blueprint (`windows-host-integration-map.json`) maps **Windows process/system state → AUGMENT → SCI Host Digital Twin** to **WHI-011**. WHI-002 remains Windows Services. No duplicate WHI control was created.

## Builds

| | ID |
|---|---|
| BASELINE BUILD | `pkg_1787080434560` |
| NEW BUILD | `pkg_1787085655776` |
| Bundled Node | 20.18.1 |
| Installed root | `%LOCALAPPDATA%\SCI OS X10\app` |

## Twin authority

**TWIN AUTHORITY:** `installer/scripts/host/digital-twin.cjs` composes:

- first-release desired state (`desired-state.cjs`)
- live SCI process identity (ProcessSupervisor)
- WHI-001 Job Object ownership
- coarse host observation (memory/disk/network/power)

`sciSystemTwin.host` is a **view pointer**, not a second store.  
`StartupDigitalTwin` remains the scan-time **capability** twin.  
Meta-recovery copies `host-digital-twin.json` as **INPUT only** (no repair this slice).

**DUPLICATE TWIN AUTHORITIES REMOVED/CONVERGED:** no third twin; no WindowsTwin; Product Kernel does not call Windows APIs.

## Results

| Gate | Verdict |
|---|---|
| DESIRED STATE | PASS |
| ACTUAL WINDOWS STATE | PASS |
| PROCESS STATE | PASS |
| WHI-001 CONTAINMENT INPUT | PASS |
| PORT STATE | PASS |
| BUILD IDENTITY | PASS |
| LOCK STATE | PARTIAL |
| RESOURCE OBSERVATION | PARTIAL |
| NETWORK OBSERVATION | PARTIAL |
| POWER OBSERVATION | DEFERRED |
| DRIFT ENGINE | PASS |
| INTENTIONALLY STOPPED | PASS |
| STALE OBSERVATION REJECTION | PASS |
| META-RECOVERY INPUT | PASS |
| SECURITY | PASS |
| PRIVACY | PASS |
| WHI-001 REGRESSION | PASS |
| PACKAGED BUILD | PASS |
| INSTALLED BUILD | PASS |
| PACKAGED GW1 | PASS |

## Closure

| | Before | After |
|---|---|---|
| P0 | 0 | 0 |
| P1 | 91 | 91 |
| P2 | 184 | 184 |
| P3 | 46 | 46 |

HOST controls added (P2, non-expanding, proven from tests):

- `HOST.twin.identity`
- `HOST.twin.process`
- `HOST.twin.containment`
- `HOST.twin.port`
- `HOST.twin.build`
- `HOST.twin.stopped-truth`
- `HOST.twin.stale-evidence`

## Installed proof

Launched `%LOCALAPPDATA%\SCI OS X10\app\SCI-OS-X10.exe`.

RUNNING snapshot: CP pid 680 + Cockpit pid 12752, both `jobAttached: true`, ports 3000/4000 SCI-owned, `JOB_OBJECT_ACTIVE`, build `pkg_1787085655776`, Node v20.18.1, `drift: []`.

Golden path: Home, Search AAPL, Entity, Experience `RUNTIME_MOUNTED`, GW1 `run_4afcd8b6-5003-4c61-8c91-63636e33c8ed`, Uncertainty FOUNDATION, Evidence, Lineage, then clean shutdown.

STOPPED snapshot: `desired=STOPPED`, `actual=STOPPED`, `JOB_OBJECT_CLOSED`, `drift=[]`. No BROKEN / FAILED / RECOVERY_REQUIRED.

## Technical debt

- `app.backup.last` retain hit EPERM on bundled `node.exe`. Timestamped rollback dirs remain; `pkg_1787080434560` is in `app.backup.1787081389130`.
- STOPPED twin is written before lock release; lock is gone after orchestrator exit. This slice does not delete locks.
- Power UNKNOWN (WHI-008). Network coarse only (WHI-009). Resource Intelligence interpretation is WHI-005 — twin only stores observation.
- `prove-windows-host-v1.cjs` still names a WHI-002 host-twin file (historical drift).

## USER_ACTION_REQUIRED

none

## NEXT EXACT HOST SLICE

**WHI-010 Recovery Intelligence augment** — consume host drift as input. Do not auto-start.

## FINAL TOKEN

HOST_DIGITAL_TWIN_PASS
