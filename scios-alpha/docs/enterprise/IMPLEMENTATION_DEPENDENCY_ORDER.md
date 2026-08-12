# IMPLEMENTATION DEPENDENCY ORDER — Foundation + First Vertical Slice

**Contract:** SCI OS ×10 Foundation & First Vertical Slice 2026  
**Mode:** Work inside `scios-alpha` — extend, do not restart.

## Principle

Build **one** path end-to-end before broadening:

`raw event → feature → prediction → risk → decision → simulated execution → lineage → cockpit`

Each step must append ledger/evidence and remain deterministic under `SCIOS_SEED`.

## Dependency order (hard)

```
0. Repository truth lock (THIS PHASE)     [DONE when artifacts exist]
        ↓
1. Protect contracts + quarantine legacy `src/`
        ↓
2. Raw event ingest (data-fabric / ontology Event)
        ↓
3. Feature materialization (feature-store adapter; PIT-safe stub OK)
        ↓
4. Prediction (unify alpha-loop OR FastAPI behind one control-plane call)
        ↓
5. Risk gate (fail-closed)
        ↓
6. Decision record (ledger `decisions` + governance audit)
        ↓
7. Simulated execution (seeded fills — no scientific Math.random)
        ↓
8. Lineage graph (edges linking event→feature→pred→risk→decision→fill)
        ↓
9. Cockpit read model (single flow + proof id)
        ↓
10. Foundation gate script + diagnostics proof → GO | DEGRADED | NO_GO
```

## Wave mapping vs prior work

| Prior wave | Status | Feeds phase |
|------------|--------|-------------|
| Wave 0 scaffold | Proven (`gate:scaffold` GO) | Phase 0–1 |
| Wave 1 ontology + ledger | Proven (`gate:contracts` GO) | Phase 2, 6, 8 |
| Alpha-loop paper path | Working | Phase 3–7 in-process reference |
| HTTP apps + cockpit | Partial stubs | Phase 4–9 service path |

## Parallelization rules

**Allowed in parallel after Phase 1:**

- Determinize execution-simulator (seeded RNG) while wiring decision ledger
- Cockpit UI read of existing `/v1/flow` while lineage API is designed

**Forbidden in parallel:**

- New ontology package
- New monorepo / package manager
- Mass stub generation of ABSENT enterprise modules
- Claiming foundation GO without gate execution

## Blockers that force order changes

| Blocker | Effect |
|---------|--------|
| Dual pipelines diverge on schemas | Stop and align on `@scios/data-fabric` exports first |
| Non-deterministic scientific path remains | Block foundation GO (max DEGRADED) |
| No integration proof | Block GO; DEGRADED only if smoke + unit evidence documented |

## Definition of Phase completion (upcoming)

| Phase | Done when |
|-------|-----------|
| 0 | Truth docs + `repository-truth.json` + `baseline-validation.json` |
| 1–7 | Code path exists; unit tests for new contracts |
| 8 | Lineage query returns full chain for one demo id |
| Foundation gate | Executed validation writes proof; verdict GO / DEGRADED / NO_GO |

## Recommended first code PR after Phase 0

1. Quarantine or delete `src/` legacy (or mark deprecated + exclude from scripts).
2. Replace `Math.random` in `apps/execution-simulator` with seeded RNG.
3. Add decision append in control-plane `predictAndSimulate`.
4. Persist lineage ids on each hop; expose `GET /v1/lineage/:id`.
5. Cockpit panel: show lineage + decision for last demo run.
6. `scripts/gate-foundation.mjs` + proof JSON.
