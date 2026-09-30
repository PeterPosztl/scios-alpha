# SCI OS ×10 — System Integrity Report

**Generated:** 2026-08-13  
**Authority:** `docs/enterprise/CURRENT_SYSTEM_TRUTH.md` + `diagnostics-export/integrity/` + `diagnostics-export/current-evidence-index.json`  
**Label:** `ALPHA_NON_PRODUCTION`  
**Engine:** `@scios/system-closure` → `integrity-engine.js` (`pnpm integrity:run`)

---

## Philosophy (preserved)

Evidence > claim · UNKNOWN ≠ PASS · No false READY · Risk > prediction · Governance > agent · NO_ACTION valid · Simulation ≠ live · Full lineage · One canonical product · One boot authority · No autonomous production self-modification.

---

## What was actually broken

| Issue | Class |
|-------|--------|
| Dual port authorities (5200/5230 vs 3000/4000) | WRONG docs / legacy defaults |
| Node contract drift (.nvmrc 18 / engines 20 / engine-strict false) | RUNTIME |
| Packaged/cascade/recovery paths depending on host Node/pnpm | RECOVERY / STARTUP |
| Product Kernel on disk but not on HTTP path / missing lock importers | DISCONNECTED / REPRODUCIBILITY |
| `shell:true` child_process (DEP0190) on primary start | PROCESS |
| Ambiguous READY vs optional PG/Redis | READINESS |
| Root build/test too narrow for whole-product claims | RELEASE |
| Stale diagnostics used as current gate truth | EVIDENCE |

---

## What was stale

- AGENTS “Wave 0 → Wave 1” as sole progress model  
- README port table and demo curls on :5200/:5230  
- SCI-OS-Start “Node 18.20.x” message  
- Manifest UX inventory (`dashboard` / old studios)  
- CURRENT_SYSTEM_TRUTH claiming no lineage / tests-only-data-fabric  

---

## What was duplicated

- Experience compile: package + control-plane inline  
- Bootstrap: `bootstrap/bootstrap-capsule.js` thin wrapper vs installer capsule (wrapper OK if it delegates)  
- Multiple startup scripts → must converge on `start-sci-os.cjs`  

---

## What was disconnected / invisible

- `@scios/product-kernel` (now partially wired via `GET /v1/kernel/status`)  
- Home/Search/Entity/GW1 were reachable; kernel package was not the HTTP authority  
- Capabilities PROFILE_DISABLED (BullMQ, OIDC, Electron) intentionally  

---

## What depended on the development environment

- Meta-Recovery DEV path still may use pnpm  
- Agent host Node 24 outside engines (by design blocked unless `SCI_ALLOW_OUTSIDE_ENGINES=1`)  
- Packaged user path must use bundled 20.18.1 only  

---

## What was not reproducible

- Workspace packages without lock importers (addressed for kernel/domain/closure)  
- Dist-rooted staged `startup-report` masquerading as LOCALAPPDATA install proof  

---

## What UX was missing / present

| Item | Truth |
|------|--------|
| Architecture | Monolithic `apps/cockpit-ui/src/index.js` |
| Professional mode | Present (Analyze → professional cards) |
| Technical / Evidence | Present |
| Full Experience Layer primitives | Not componentized — P2, not rebuilt as speculative platform |
| GW1 flow | Home → Search → Entity → Analyze → risk/policy/sim → Evidence/Lineage |

---

## What was fixed (this integrity program + prior coherence passes)

- `.nvmrc` → 20.18.1 · `engine-strict=true` · runtime preflight script  
- README / AGENTS / CURRENT_SYSTEM_TRUTH / manifest readiness+UX  
- Control Plane default PORT 3000  
- Primary spawn `shell:false` + `pnpm.cmd`; cascade/repair/safe prefer bundled Node  
- `build:release` · ATOM/auto-fill OFF_PATH  
- Kernel dependency + `/v1/kernel/status` · `/v1/integrity/summary` (engineering)  
- Integrity engine generating `diagnostics-export/integrity/01`–`28`  

---

## What remains P0 / P1 / P2

| Priority | Item |
|----------|------|
| **P0** | Packaged reboot GW1/appRoot fresh evidence (TASK-PKG-003) |
| **P1** | Automated product E2E gate; residual dual-path product routes vs kernel |
| **P2** | `@types/node` 22 vs runtime 20; residual `shell:true` in convergence helpers; UX Experience Layer extraction; durable persistence |

Intentionally deferred: GW2–7, OIDC rollout, durable enterprise fabric, 300+ capabilities.

---

## Integrity engine

```bash
pnpm integrity:preflight   # Node contract (exit 3 if mismatch)
pnpm integrity:run         # regenerate diagnostics-export/integrity/*
```

Predicates are topology-generated; UNKNOWN never auto-becomes PASS. Architecture supports expansion toward thousands of checks without hardcoding 10k features.

---

## Final verdicts

| Axis | Verdict |
|------|---------|
| REPOSITORY COHERENCE | **DEGRADED** |
| RUNTIME COHERENCE | **DEGRADED** (host may be outside engines; contract declared) |
| PRODUCT ACTIVATION | **DEGRADED** |
| UX FOUNDATION | **DEGRADED** (monolith + professional GW1 path) |
| FIRST RELEASE | **INTERNAL_BLOCKER** (packaged GW1 evidence) |
| FULL PRODUCT VISION | **ALPHA** |

Optional infrastructure remains independently: **OPTIONAL_INFRA_DEGRADED**.
