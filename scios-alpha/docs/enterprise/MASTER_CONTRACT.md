# SCI OS ×10 — Master Contract (2026 Global Completion Directive)

**THIS IS THE MASTER IMPLEMENTATION CONTRACT** — not a scaffold script.

| Field | Value |
|-------|--------|
| Platform | SCI OS ×10 Enterprise Intelligence Operating System |
| Path | ALPHA → BETA → ENTERPRISE |
| Machine inventory | [`MASTER_CONTRACT_2026.json`](./MASTER_CONTRACT_2026.json) |
| **Enterprise verdict** | **ENTERPRISE_NO_GO** |
| **ALPHA verdict** | Foundation vertical slice **ALPHA_GO** (gates + smoke) — **not** enterprise |

## Honesty (non-negotiable)

- No evidence ⇒ **UNKNOWN**, never PASS / READY / ENTERPRISE GO.
- Prefer **one proven vertical slice** over hundreds of empty modules.
- Self-evolution is **propose-only**; never auto-deploy.
- pnpm only. Do not rewrite stable contracts without approval.

## Stop conditions (Section 18)

| Verdict | Meaning | Now |
|---------|---------|-----|
| ENTERPRISE GO | All P0 planes proven | **NOT MET** |
| ENTERPRISE DEGRADED | Core usable with declared enterprise limits | **NOT CLAIMED** |
| ENTERPRISE NO_GO | Enterprise scope blocked | **CURRENT** |
| ALPHA GO | Scaffold + contracts + foundation slice evidence | **Foundation path** |

---

## Section inventory (summary)

Full module matrix: `MASTER_CONTRACT_2026.json`.

| § | Plane | Status |
|---|-------|--------|
| 1 | Meta-Intelligence | Mixed — CapabilityRegistry / EvidenceGraph / Ontology ALPHA; most engines ABSENT |
| 2 | Enterprise Ontology | ALPHA Zod entities (partial entity set) |
| 3 | Canonical Ledgers | ALPHA in-memory append-only |
| 4 | Data Fabric | STUB/ALPHA |
| 5 | Feature Platform | STUB |
| 6 | Prediction Engine | STUB/ALPHA baseline + envelope |
| 7 | Risk Engine | STUB/ALPHA independent gate |
| 8 | Decision Intelligence | STUB |
| 9 | Execution Simulator | STUB/ALPHA paper |
| 10 | Simulation & Twin | STUB |
| 11 | Scientific Integrity | ABSENT |
| 12 | Model Lifecycle | STUB |
| 13 | Governance & Security | ALPHA RBAC skeleton |
| 14 | Observability & Lineage | STUB/ALPHA lineage in slice |
| 15 | Engineering Intelligence | ABSENT |
| 16 | Development Intelligence | ABSENT |
| 17 | Cockpit & Desktop | ALPHA HTTP cockpit; Electron ABSENT |

---

## Meta-Intelligence Plane (§1) — required modules

Supervise what exists / missing / broken / next / validated / rolled back / approved / proven.

| Module | Status |
|--------|--------|
| EnterpriseOntologyEngine | ALPHA |
| CapabilityRegistry | ALPHA |
| SystemGraphEngine | ABSENT |
| DevelopmentIntelligenceEngine | ABSENT |
| EngineeringIntelligenceEngine | ABSENT |
| ResearchIntelligenceEngine | ABSENT |
| DecisionIntelligenceEngine | STUB |
| OperationsIntelligenceEngine | STUB |
| GovernanceIntelligenceEngine | ALPHA |
| EconomicIntelligenceEngine | ABSENT |
| SelfEvolutionController | STUB (propose-only) |
| EvidenceGraphEngine | ALPHA |
| PlatformDigitalTwin | STUB |
| ChangeImpactEngine | ABSENT |
| EnterpriseMemoryEngine | STUB |
| MissionControlEngine | ABSENT |

**Forbidden now:** generating empty classes for every ABSENT module.

---

## Foundation vertical slice (implemented)

```
raw → normalize → PIT feature → baseline → calibration+uncertainty
  → independent risk → governance → deterministic execution
  → outcome → immutable lineage → cockpit
```

Surfaces: `@scios/vertical-slice`, control-plane `/v1/slice/run`, mock-api `/api/vertical-slice/run`, Cockpit 2.0.

Proof commands:

```bash
pnpm gate:scaffold
pnpm gate:contracts
pnpm gate:foundation
pnpm smoke:slice
pnpm signoff:generate
```

---

## Implementation waves (ordered)

1. **Wave 1b** — Complete remaining ontology entities + tests (Strategy, Runbook, Deployment, Repository, File, Symbol, Test, Build, Release).
2. **Wave 2** — Durable ledger adapter (optional Postgres when Docker HEALTHY).
3. **Wave 3** — Independent risk process proofs + kill-switch evidence pack.
4. **Wave 4+** — Meta-Intelligence engines one-at-a-time with CAPABILITY_REGISTRY + proof artifacts.

Dependency order: [`IMPLEMENTATION_DEPENDENCY_ORDER.md`](./IMPLEMENTATION_DEPENDENCY_ORDER.md).

---

## Begin implementation = continue the next Wave

Do **not** restart the monorepo. Do **not** mass-stub §1–17.

**Next concrete action:** Wave 1b ontology completion with tests + registry update — then re-run `pnpm gate:contracts`.
