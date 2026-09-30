# SCI OS ×10 — Final Executive Status

**Decision:** `REQUIRES_FINAL_FIXES`  
**Label:** ALPHA_NON_PRODUCTION  
**As of:** 2026-08-12T17:20:05.222Z

## Can SCI OS start?
**Yes, for developers.** Canonical `pnpm sci:start` / bat (with Node installed) brings control plane + cockpit up. Current machine: core **READY**, infra often **DEGRADED** (Docker/PG/Redis optional down). This is honest DEGRADED, not fake READY.

## Can a normal user install it?
**No.** There is no Setup.exe and no proven bundled runtime. `SCI OS ×10.bat` requires Node on PATH.

## Can a normal user use it?
**Only after a developer has started it.** Once running, Home → Search AAPL → Entity360 → Analyze shows a professional result with Technical/Evidence available.

## Does Golden Workflow #1 work?
**Yes (runtime proven).** Fresh forensic probe: prediction → risk → governance → simulation → lineage. Three consecutive Analyze runs succeeded in this pass.

## Can risk/governance block unsafe actions?
**Yes.** Oversized order (size 5000) returns **REJECT** with execution **NO_ACTION** / DENY.

## Can the system recover?
**Partially.** Repair/safe-mode tooling exists; full fault-injection matrix is **not** freshly certified. Controlled behavior under all listed faults is **not** fully evidenced.

## What remains broken / missing?
1. Packaged install + no-terminal launch (P0)  
2. Reboot acceptance (P0)  
3. Recovery matrix certification (P1)  
4. Auth for anything beyond single-user local ALPHA (P1)  
5. Deep graph/timeline investigation UX (P2)  
6. Scientific calibration validation (P2)  
7. ~199 roles still configured-only (P3)

## Single most important next fix
**Ship a self-contained Windows installer/runtime** so Install → Click → READY → GW1 works without Node/pnpm/terminals.

## How far from first release?
Foundation product loop is **real**. First-release user path is **blocked by packaging**, not by missing GW1 logic. Do not call READY_FOR_FIRST_RELEASE until clean-install and reboot proofs pass.
