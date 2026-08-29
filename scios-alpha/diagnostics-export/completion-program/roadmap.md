# SCI OS ×10 — Completion Program Roadmap

**Program controller started:** 2026-08-19  
**Current build:** `pkg_1788030533349` · **gitSha:** `06795498+`  
**Authority:** current source + runtime evidence (not historical audit labels)

---

## Finish levels (never conflate)

| Target | Label | Status |
|--------|-------|--------|
| **A** | Usable Local Alpha | **READY** ✓ |
| **B** | Daily-Use / Tester Beta | NOT_READY (B-006 UX **PASS** — P1 + PG remain) |
| **C** | Production-Eligible Professional System | NOT_READY |
| **D** | Full SCI OS ×10 Founder Vision | NOT_READY |

---

## Target A — COMPLETE

**Verdict:** `USABLE_LOCAL_ALPHA_READY`  
**Evidence:** `diagnostics-export/alpha-product-convergence/23-final-report.json`

Proven chain:

- Product Kernel → Domain Registry → Experience Compiler → Workspace Renderer
- Market Analyst / AAPL reference workspace
- Installed E2E LIVE_PASS + packaged GW1 PASS
- P0 = 0 · Alpha blocker roots = 0

**Do not repeat:** UI framework rewrite, Experience Compiler duplication, Alpha proof regeneration unless regression.

---

## Target B — IN PROGRESS (Wave B-001+)

### Beta definition of done (from completion-readiness, updated by current evidence)

| Requirement | Current truth |
|-------------|---------------|
| Alpha items | **DONE** |
| Home / Search / Entity views | **PASS** (cockpit modular vanilla) |
| Market Analyst runtime-connected | **PASS** |
| Professional domain registry compiled | **PASS** |
| PostgreSQL persistence | **DEFERRED** — FD-002 open; local-durable matrix **SOURCE PROVEN** (B-004) |
| Job lifecycle (CF11) | **PASS** — Wave B-002 **READY** |
| Policy decision (CF14) | **PASS** — Wave B-003 **READY** (installed enforcement) |
| Local durable matrix | **SOURCE PASS** — Wave B-004 **READY** |
| Policy decision points (CF14) | **PASS** — Wave B-003 **READY** |
| Model validation truth (CF28) | **PASS** — Wave B-005 canonical states + evidence |
| Background job engine v1 | **PASS** — Wave B-005 lifecycle + installed E2E |
| Professional UX cockpit | **PASS** — Wave B-006 Job Center, 8 roles, system health |
| P1 roots | **92** → target **< 20** for Beta |
| OIDC | **Out of Beta scope** (Target C) |

### Wave B plan (dependency-aware)

```
B-001  P1 delta + CF11 job-state contract minimum
B-002  CF14 policy enforcement points (server-side)
B-003  CF28 validation maturity gates (honest UNVALIDATED labels preserved)
B-004  Durable persistence adapter (blocked on FD-002 OR local-durable expansion)
B-005  Beta acceptance: test:release + installed daily-use path + P1 < 20
```

### Wave B-001 scope (current)

1. **DISCOVER** — closure delta; confirm batch_001_P1 actor/XSS fixes reflected in P1 count
2. **ROOT CAUSE** — CF11 job-states family (dedupe ~28 instances)
3. **MINIMUM PATCH** — job state machine contract: `queued | running | succeeded | failed | cancelled` + evidence artifact per transition; in-process scheduler first (no Redis requirement)
4. **GATES** — targeted tests → integration → P0 regression → **one** package gate at wave end

---

## Target C — QUEUED

Requires: Beta complete + FD-001 (OIDC) + FD-007 (deployment) + TLS + enterprise RBAC + observability + P1 = 0

---

## Target D — QUEUED

Requires: Production + full domain compilation + Graph/Timeline/Evidence/Dossier/Portal/Executive + market data (FD-006) + AI CoPilot (FD-005) + 300+ capabilities

---

## Acceleration rules (active)

- Reuse before create · Converge before rewrite
- Delta audits after waves · Root-cause repair only
- One writer wave · Package once per wave
- P0 must remain 0

---

## Next exact action

**Wave B-004 (active):** Package → atomic install → installed persistence E2E → checkpoint. Source gate PASS.
