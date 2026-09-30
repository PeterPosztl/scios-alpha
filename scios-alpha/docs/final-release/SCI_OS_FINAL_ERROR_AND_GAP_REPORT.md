# SCI OS ×10 — Final Error and Gap Report

**Forensic pass:** 2026-08-12T17:20:05.222Z  
**Completion decision:** REQUIRES_FINAL_FIXES  
**Artifacts:** `diagnostics-export/final-release/28-master-error-register.json` … `46-forensic-completion-decision.json`

## 1. Current system status
Live probe (post-repair): healthz/readyz/cockpit **200**; Home/Search/Entity APIs **200**; GW1 Analyze **APPROVE** with lineage; risk REJECT path **NO_ACTION**. Startup profile remains **DEGRADED** when Docker/PG/Redis are down. Release candidate signoff remains **DEGRADED** — packaging not ready.

## 2. What already works
- Canonical startup (developer-assisted)
- Supervisor-owned backend + cockpit; embedded worker smoke
- Product Home, unified search (AAPL), Entity360 shell
- Professional vs Technical analysis UX; SIMULATED labeling
- Vertical slice: PIT features → prediction → independent risk → governance → simulation → lineage
- Negative risk/governance: oversized position blocked
- Product Kernel registries + identity modules
- External intelligence Wave 1 synthesis (no dependency museum)
- Jest vertical-slice suite (including REJECT)

## 3. What does not work
- Clean install via Setup.exe
- One-click launch without preinstalled Node
- Packaged reboot acceptance
- Full automatic recovery certification matrix

## 4. What is partially working
- Infra (PG/Redis) — optional, often DEGRADED
- Recovery tooling — present, evidence incomplete
- Entity360 — shell yes, deep graph/timeline no
- Config unification — effective redacted snapshot, not single typed loader
- Role system — registered/mapped; not E2E for 200 roles

## 5. What exists but is not connected
- Experience Compiler (dry-run) not fully driving cockpit
- Graph/chart OSS candidates (INSPIRE only) — no GraphRendererPort wired
- Command palette pattern — registry only
- `package:exe` script — no certified dist artifact on disk

## 6. What is still missing
- Setup.exe / bundled Node
- Live market data adapters (optional, not required for simulated GW1)
- Case/incident workspace for GW2/GW3
- Production authn/authz
- Ops: backup, upgrade, uninstall cert, retention

## 7. What is not yet proven
- Calibration scientific validity
- Soak/race reliability beyond small multi-run sample
- Work-state persistence across reboot
- Clean-machine first launch

## 8. Critical errors
- ERR-PKG-001 No Setup.exe / bundled runtime  
- ERR-LAUNCH-001 Launch depends on system Node  

## 9. Major risks
- ERR-REBOOT-001 unproven reboot path  
- ERR-REC-001 incomplete recovery matrix  
- ERR-AUTH-001 open localhost API (accepted only for single-user ALPHA)  
- In-memory run loss on restart without PG  

## 10. UX gaps
See `31-ux-gap-register.json` — Entity360 depth, command palette, compare, a11y evidence.

## 11. Recovery gaps
See `36-recovery-coverage-matrix.json` — many DETECTED/PARTIAL; auto-repair largely UNPROVEN.

## 12. Security gaps
See `37-security-residual-risk.json` — localhost auth, supply chain, future prompt injection.

## 13. Scientific / model gaps
See `34-scientific-gap-register.json` — IMPLEMENTED ≠ VALIDATED for calibration/OOD/drift/backtest.

## 14. External requirements
Docker (optional), market API credentials (optional), code-signing cert (for trusted Setup).

## 15. Future risks
Port races after hard kill; diagnostics disk growth; memory run index loss; API throttle when feeds added (`42-future-failure-risk.json`).

## 16. Exact fix order
1. Packaged runtime + Setup  
2. Shortcut → supervisor (no pnpm)  
3. Clean install + GW1 + second start  
4. Reboot cert  
5. Recovery fault matrix  
6. Auth harden for shared use  
7. Unified EffectiveConfig  
8. EntityGraph/Timeline  
9. Calibration evidence  
10. Additional golden workflows / roles  

## 17. What blocks first release
Packaging + no-terminal launch + reboot proof (P0). Recovery matrix (P1) before serious ALPHA.

## 18. What can wait until BETA
Auth multi-user, deep investigation graph, calibration claims, unified config polish.

## 19. What can wait until enterprise
200-role full E2E, live market/CTI packs, full ops lifecycle, SBOM/signing at scale.

## 20. Final recommendation
**Do not declare first release READY.** Keep shipping the working local-foundation loop for internal use, but treat **packaging with embedded runtime** as the single upstream root-cause fix. Downstream reboot/clean-install proofs cannot succeed until that exists. Preserve honest DEGRADED when Docker is down. Never convert UNKNOWN scientific claims into PASS.

**Truth:** SCI OS can be *used* after a developer starts it. It cannot yet be *installed and launched* like a finished Windows product.
