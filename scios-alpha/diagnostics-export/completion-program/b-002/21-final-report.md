# Wave B-002 — CF11 Job State Contract

**FINAL TOKEN:** `B_002_JOB_STATE_PARTIAL`  
**At:** 2026-08-19T20:28:00.000Z  
**Build:** `pkg_1787170915142` · **gitSha:** `dcfdd314`

## Summary

Canonical job-state authority established in `osSession.ts` with:

- 8 canonical states + explicit terminal/non-terminal classification
- `canTransition()` single validator (API + storage)
- `stateVersion` + `expectedVersion` optimistic concurrency
- Actor Context from B-001 on create/update
- Local-durable persistence under `%LOCALAPPDATA%/SCI OS X10/data/jobs/`
- Atomic write (temp → rename)
- Transition evidence + bounded state history
- Invalid record quarantine

## Gates

| Gate | Result |
|------|--------|
| Source CF11 + B-002 hard gate | PASS |
| Release tests | PASS |
| WHI-001/010/011 | PASS |
| Alpha regression | PASS |
| B-001 regression | PASS |
| Package build | PASS |
| Atomic install promote | **BLOCKED (EBUSY)** |
| Packaged runtime job E2E | PASS |

## Blocker

Atomic install to `%LOCALAPPDATA%\SCI OS X10\app` fails with `EBUSY` on directory rename. Packaged runtime proof uses `dist/SCI-OS-X10` with bundled Node 20.18.1 — same build artifact, no repo source dependency.

**User action:** Close any `node.exe` under SCI OS X10 app path, then `pnpm package:install`.

## Next

Wave B-003 — CF14 policy-decision (already started in source; install gate pending).
