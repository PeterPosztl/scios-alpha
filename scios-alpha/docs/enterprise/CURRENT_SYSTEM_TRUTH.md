# CURRENT SYSTEM TRUTH — SCI OS ×10 (`scios-alpha`)

**Updated:** 2026-08-13  
**Authority:** This document is pillar 3 of [FOUR_PILLARS.md](./FOUR_PILLARS.md)  
**Companion evidence:** [CURRENT_EVIDENCE.md](./CURRENT_EVIDENCE.md) + `diagnostics-export/current-evidence-index.json`  
**Intent upstream:** [FOUNDER_BLUEPRINT.md](./FOUNDER_BLUEPRINT.md) · [BENCHMARK_CONTRACT.md](./BENCHMARK_CONTRACT.md)  
**Label:** `ALPHA_NON_PRODUCTION`  
**Do not** treat historical diagnostics as current gate closers.

---

## Honesty (preserved)

- No evidence ⇒ **UNKNOWN**, never PASS.
- No false READY / no enterprise GO without proof.
- ALPHA ≠ PRODUCTION.
- Evidence > claim. Risk > prediction. Governance > agent. NO_ACTION is valid.
- One canonical product. One canonical boot authority.

---

## Two axes

### First Release Foundation (in scope)

Install / click → bootstrap → supervisor → Control Plane `:3000` + Shell `:4000` → Home → Search → Entity → GW1 Analyze → Evidence / Lineage → clean shutdown.  
Packaged path uses bundled Node **20.18.1**. Optional Docker/PG/Redis may be **OPTIONAL_INFRA_DEGRADED**.

### Full Product Vision (out of first-release scope)

GW2–7, OIDC, durable enterprise event fabric, 300+ proven capabilities, 200 roles, full production deploy — **P2/P3**. Not reopened by coherence work.

---

## Canonical runtime

| Item | Truth |
|------|--------|
| Product | SCI OS ×10 |
| Runtime | Node `>=20.18.0 <21` (packaged **20.18.1**) |
| Profile | `local-foundation` |
| Execution | `SIMULATION_ONLY` |
| Auth | `local-development` |
| Control Plane | `http://127.0.0.1:3000/` (default bind `127.0.0.1`; override `SCIOS_BIND`) |
| Shell | `http://127.0.0.1:4000/` (default bind `127.0.0.1`) |
| Dev entry | `pnpm sci:start` / `SCI-OS-Start.bat` |
| Packaged entry | `%LOCALAPPDATA%\SCI OS X10\app\SCI-OS-X10.cmd` |
| Bootstrap | `installer/scripts/bootstrap-capsule.cjs` |
| Orchestrator | `installer/scripts/start-sci-os.cjs` |
| Supervisor | `installer/scripts/startup/process-supervisor.cjs` |

Legacy **5200 / 5230** are not canonical product endpoints.

---

## What is implemented now (wiring truth)

| Subsystem | Class | Notes |
|-----------|-------|--------|
| Bootstrap / Launcher | WORKING | Capsule → start-sci-os; packaged CMD |
| Supervisor | PARTIAL | Canonical process-supervisor; alternate supervisor.js secondary |
| Control Plane | WORKING | health, product routes, vertical-slice |
| Shell / Home | WORKING | `apps/cockpit-ui` |
| Search / Entity | PARTIAL | Catalog + run-derived |
| GW1 | PARTIAL | Analyze → vertical-slice; packaged LOCALAPPDATA GW1 proven (batch_001_P0 / TASK-PKG-003) |
| Risk / Governance / Execution | PARTIAL | Embedded / simulation |
| Evidence / Lineage | PARTIAL | UI views + local durable run index (`%LOCALAPPDATA%\SCI OS X10\state`); not enterprise PG |
| Product Kernel package | PARTIAL | Package + `/v1/kernel/status`; HTTP product surface remains control-plane routes |
| Experience Compiler | PARTIAL | Package + inline compile |
| AppHost | PARTIAL | Shell *is* AppHost (no separate package) |
| Workers | PARTIAL | In-process foundation smoke only |
| Packaging | PARTIAL | LOCALAPPDATA install + shortcuts + packaged GW1 PASS (TASK-PKG-003); EXE pkg optional P1 |
| Recovery | PARTIAL | Prefer bundled Node when present |
| Command palette | PARTIAL | Ctrl+K in Shell |
| Approval / AI context | PARTIAL | GW1 professional path |

---

## Readiness semantics

| State | Meaning |
|-------|---------|
| BOOTSTRAP_READY | Capsule resolved runtime and handed off |
| CORE_READY | CP + Shell healthy |
| CAPABILITY_READY | First-release UX path available |
| OPTIONAL_INFRA_DEGRADED | PG/Redis/Docker absent — allowed for first release |
| FULL_PROFILE_READY | Enterprise infra — **not** first-release requirement |

Exit `0` = accepted mode (including OPTIONAL_INFRA_DEGRADED). Genuine NO_GO ≠ 0.

---

## Rejected parallel authorities

- ATOM-AI as canonical product
- Out-of-tree Meta OS as SCI OS boot chain
- Second startup frameworks / Vite cockpits claiming SCI Shell

---

## Regenerate coherence evidence

```bash
pnpm truth:reconcile
pnpm deep:forensics
```

Outputs:
- `diagnostics-export/truth-reconciliation/01` … `15`
- `diagnostics-export/deep-forensics/01` … `25`

---

## Current release posture (see evidence index)

- **Repository coherence:** DEGRADED → improving (authorities reconciled: boot = start-sci-os; HTTP product surface = control-plane; kernel = capability identity library)
- **First release:** FOUNDATION_DEGRADED allowed (optional PG/Redis/Docker); TASK-PKG-003 packaged LOCALAPPDATA GW1 closed (batch_001_P0)
- **Optional infra:** OPTIONAL_INFRA_DEGRADED
- **UX:** monolithic Shell with Professional default, L1–L7, approval card, AI context panel, command palette; Experience Layer extraction remains P2
- **Persistence:** local durable run index under `%LOCALAPPDATA%\SCI OS X10\state` + Shell `localStorage` session (not enterprise PG)
- **Enterprise discipline:** extends Product Kernel (pnpm enterprise:discipline) — SLO/idempotency/maturity/tower/eval/impact/governor; **READY false**
- **Dev Node:** workspace enforces `>=20.18.0 <21` (`engine-strict=true`); host Node 24 is outside engines by design