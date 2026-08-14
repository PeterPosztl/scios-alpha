# CURRENT EVIDENCE — what actually works

**Role:** runtime / gate proof — not README claims  
**Authority axis:** Fresh artifacts under `diagnostics-export/`  
**Index:** `diagnostics-export/current-evidence-index.json`  
**Label:** No evidence ⇒ **UNKNOWN**, never PASS  
**Updated:** 2026-08-14

---

## Rule

| Source | Trust |
|--------|--------|
| Fresh diagnostics under indexed paths | CURRENT |
| Code existence alone | NOT enough for “works” |
| Old README / old dist / stale staged startup | HISTORICAL / STALE |
| User assertion without artifact | UNKNOWN |

---

## Current evidence sets (use these)

| Set | Path | Proves |
|-----|------|--------|
| Gap-to-zero | `diagnostics-export/gap-to-zero/` | Product contract gaps, activation, roles, UX, signoff |
| Integrity | `diagnostics-export/integrity/` | Topology-generated predicates / integrity signoff |
| Deep forensics | `diagnostics-export/deep-forensics/` | Structural forensics |
| Truth reconciliation | `diagnostics-export/truth-reconciliation/` | Authority / docs / runtime reconciliation |
| Reboot boot differential | `diagnostics-export/reboot-certification/02-post-reboot-system-proof.json` | Windows reboot FileTimeUtc differential **PASS** |

Regenerate gap/integrity as needed:

```bash
pnpm gap:zero
pnpm integrity:run
pnpm truth:reconcile
pnpm deep:forensics
```

---

## What is proven to work (first-release spine)

Bound to gap-to-zero `26-post-repair-proof.json` + `27-zero-level-signoff.json` (2026-08-13):

| Capability | Evidence status |
|------------|-----------------|
| Role registry ≥200 as data | PASS (seed count) |
| Archetypes defined | PASS |
| Professional mode in Shell | PASS (source+structure) |
| Approval card + AI context panel | PASS (wired in Shell) |
| Local durable runs + session persist | PASS (code path) |
| Default bind localhost | PASS (code path) |
| Integrity engine present | PASS |
| Runtime preflight present | PASS |
| **Packaged GW1 (LOCALAPPDATA current build)** | **PASS** — TASK-PKG-003 closed by `diagnostics-export/closure/batch_001_P0/packaged-gw1-proof.json` (buildId `pkg_1786656680759`) |

### Signoff verdicts (current)

| Axis | Verdict |
|------|---------|
| TECHNICAL GAP | ZERO_P0_P1 |
| PRODUCT COHERENCE | DEGRADED |
| UX 2026 PARITY | PARTIAL |
| 200-ROLE ARCHITECTURE | PARTIAL |
| FIRST RELEASE | **FOUNDATION_DEGRADED** (optional infra; TASK-PKG-003 packaged GW1 PASS) |
| FULL PRODUCT VISION | ALPHA |

---

## What is not yet proven

- Full Windows reboot re-collect of GW1 (FileTimeUtc differential already PASS; current-build LOCALAPPDATA GW1 PASS in batch_001_P0)  
- Enterprise PG/Redis-backed fabric  
- OIDC / production auth  
- 200 professions as runtime-complete products (architecture only)  
- Screenshot/DOM UX review as a release gate artifact set  
- Production-eligible scientific calibration  
- Multi-region / geo Backup-DR (P2 — not first-release P0)

Autonomous marathon (in progress, not a gate closer): Closure P1 176 → 98 with P0 remaining 0. Evidence under `diagnostics-export/autonomous-marathon/`. Packaged runtime is still `pkg_1786656680759` until the next atomic-install.

---

## Stale — do not use as gate closers

- Dist-rooted / stale staged `startup-report.json` under reboot certification when `appRoot` ≠ LOCALAPPDATA install  
- Historical diagnostics not listed in `current-evidence-index.json`

---

## Related pillars

| Pillar | Question |
|--------|----------|
| [FOUNDER BLUEPRINT](./FOUNDER_BLUEPRINT.md) | Why / what? |
| [BENCHMARK CONTRACT](./BENCHMARK_CONTRACT.md) | Against what bar? |
| [CURRENT SYSTEM TRUTH](./CURRENT_SYSTEM_TRUTH.md) | What is written/wired? |
