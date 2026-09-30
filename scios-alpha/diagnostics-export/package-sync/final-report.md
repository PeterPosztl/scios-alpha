# SCI OS ×10 — Source → Package → Install Synchronization

STATUS: **CURRENT_SOURCE_PACKAGE_INSTALL_SYNCHRONIZED**

Label: ALPHA_NON_PRODUCTION

## Identity

| Axis | Value |
| --- | --- |
| OLD INSTALLED BUILD | pkg_1786656680759 |
| NEW SOURCE BUILD | gitSha 8a0125a18bd017abaf3206f075713bccc28f01e7 (checkpoint 8a0125a1) |
| NEW PACKAGE BUILD | pkg_1787074480539 |
| NEW INSTALLED BUILD | pkg_1787074480539 |
| NEW RUNTIME BUILD | pkg_1787074480539 |
| EVIDENCE BUILD | pkg_1787074480539 |
| BUNDLED NODE | v20.18.1 (packaged, system Node not used) |
| treeHash (package) | e49bc30c4bbce1a57e29f4a91b14697d8ee8edcda5f84d64f21208c940ec87b5 |
| packageHash | 6dd9ed095a2238b000e59b709e76a0689453bf8a6a6210bcb12282d811798df5 |
| manifestHash | c08c28ac652a3bdaf5ea5adff9072cd36fe1db25ea3a07b9a93a1994e79fa701 |
| timestamp | 2026-08-18T17:34:42.182Z |

Old build `pkg_1786656680759` is no longer active. It is preserved as `%LOCALAPPDATA%\SCI OS X10\app.backup.last`.

## Gates

PACKAGE BUILD: **PASS**  
ATOMIC INSTALL: **PASS**  
WINDOWS ENTRY: **PASS** (`SCI-OS-X10.exe` thin wrapper → bundled Node → `start-sci-os.cjs --serve --packaged`)  
HOME: **PASS**  
SEARCH: **PASS** (AAPL → Entity:AAPL)  
ENTITY: **PASS** (AAPL — Apple Inc.)  
GW1: **PASS** (run_0ae63c1c-4c3f-4c33-93e7-d4c0e1bc4e35, APPROVE, SIMULATION_ONLY)  
UNCERTAINTY: **PASS** (scienceStatus FOUNDATION, maturity NON-PRODUCTION)  
RISK/GOVERNANCE: **PASS** (pipeline APPROVE, simulated)  
EVIDENCE: **PASS**  
LINEAGE: **PASS**  
UI E2E: **PASS** (installed Cockpit VM script + Home/Search contracts; Playwright NOT_AVAILABLE)  
SHUTDOWN: **PASS** (ports 3000/4000 down, lock released)  
RECOVERY: **PASS** (`recovery/server.cjs` present, syntax OK; backup.last valid)  
APP.BACKUP.LAST: **PASS** (pkg_1786656680759)

## Closure

P0 BEFORE: **0**  
P0 AFTER: **0**  
P1 AFTER: **91**  
P2 AFTER: **184**  
P3 AFTER: **46**

Invariant held. Counts were not modified to look better.

Packaged startup verdict remains **DEGRADED** because optional Postgres/Redis/Docker are absent. That is not a P0 first-release failure.

## What was synchronized

1. Current accepted source at `8a0125a1` (no `git reset --hard`, no `git clean`).
2. Workspace packages rebuilt inside `package:dist` so packaged `packages/*/dist` is current (not historical).
3. Stale first package `pkg_1787074162274` was **not** installed.
4. Atomic install: stage → verify → backup → commit → live verify → retain `app.backup.last`.
5. Launch through installed `SCI-OS-X10.exe` only (not repo, pnpm, Cursor, or system Node).
6. P0 golden path proven on the new installed runtime.
7. Completion Sweep surfaces present in the installed bundle: `/v1/models`, `/readyz.dependencyMetrics`, prediction `provenance`, Experience `disabledActions` without `act.` leak, `redactLogMeta`, zero repo-path runtime leak.

## FILES CHANGED (this sync)

- `scripts/package/build-distribution.cjs` — rebuild workspace packages before bundling
- `scripts/tests/package-sync-prove.cjs` — installed golden-path prover
- `diagnostics-export/package-sync/*` — identity, install, golden path, closure, final report
- `diagnostics-export/closure/*` — post-install rescan
- `diagnostics-export/cursor-repair/atomic-install-proof.json`
- `diagnostics-export/cursor-repair/cockpit-birth-e2e.json`

## PROOF FILES

- `diagnostics-export/package-sync/current-build-identity.json`
- `diagnostics-export/package-sync/install-proof.json`
- `diagnostics-export/package-sync/golden-path-proof.json`
- `diagnostics-export/package-sync/closure-after-install.json`
- `diagnostics-export/package-sync/final-report.md`
- `diagnostics-export/package-sync/prestate.json`

## REMAINING BLOCKERS

Honest, unchanged from Completion Sweep:

- LOCAL REVIEW ≠ DecisionAction (CF02.approval-gates / CF27.human-approval)
- UNVALIDATED model honesty remains (CF28.validation)
- Optional infra (Postgres/Redis/Docker) keeps packaged startup DEGRADED
- Playwright not in first-release lockfile — UI DOM hydration uses HTTP + generated-script contracts

This is **not** full Founder Vision closure. First-release P0 golden path remains closed on the **current** installed build.

## NEXT EXACT ACTION

Do **not** begin the Windows Host Blueprint automatically.

Optional founder-gated next steps, in order:

1. Checkpoint-commit this sync evidence (no push) if desired.
2. Only then consider Windows Host architecture work as a separate mission.
3. Otherwise continue P1 roots starting at `CTRL.CF28.validation` / remaining LOCAL REVIEW honesty — without reopening P0.

CURRENT_SOURCE_PACKAGE_INSTALL_SYNCHRONIZED
