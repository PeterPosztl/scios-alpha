# SCI OS ×10 — Master Contract (ALPHA → BETA → ENTERPRISE)

**Honesty rule:** This document is the implementation contract. Status labels are evidence-backed.

| Label | Meaning |
|-------|---------|
| ABSENT | Not implemented |
| STUB | Skeleton / interface only |
| ALPHA | Runnable, non-production |
| BETA | Evidence-backed limited scope |
| ENTERPRISE | Gate platform GO with proof |

**Current platform verdict:** `ALPHA` scaffold. **Not** ENTERPRISE GO.

## Meta-Intelligence Plane (Section 1)

| Module | Status | Surface |
|--------|--------|---------|
| CapabilityRegistry | ALPHA | `packages/meta-intelligence`, `docs/enterprise/CAPABILITY_REGISTRY.json` |
| EvidenceGraphEngine | ALPHA | `packages/meta-intelligence` |
| SelfEvolutionController | STUB | propose-only |
| EnterpriseOntologyEngine | ALPHA | `packages/data-fabric` ontology schemas (Wave 1) |
| SystemGraphEngine | ABSENT | — |
| DevelopmentIntelligenceEngine | ABSENT | — |
| EngineeringIntelligenceEngine | ABSENT | — |
| ResearchIntelligenceEngine | ABSENT | — |
| DecisionIntelligenceEngine | ABSENT | — |
| OperationsIntelligenceEngine | STUB | observability package |
| GovernanceIntelligenceEngine | ALPHA | `packages/governance-engine` |
| EconomicIntelligenceEngine | ABSENT | — |
| PlatformDigitalTwin | ABSENT | — |
| ChangeImpactEngine | ABSENT | — |
| EnterpriseMemoryEngine | ABSENT | — |
| MissionControlEngine | ABSENT | — |

## Ontology (Section 2)

Wave 1: typed Zod entities + relation vocabulary in `@scios/data-fabric`. Full graph traversal / migrations: ABSENT.

## Canonical Ledgers (Section 3)

Wave 1: `CanonicalLedger` interface + in-memory append-only adapter. Durable store / hash chain: ABSENT.

## Data Fabric → Cockpit (Sections 4–17)

| Area | Status |
|------|--------|
| 4 Data Fabric (full) | STUB/ALPHA (domain + mock) |
| 5 Feature Platform | STUB (PIT asOf vectors) |
| 6 Prediction Engine | STUB (labeled NON-PRODUCTION) |
| 7 Risk Engine | STUB |
| 8 Decision Intelligence | ALPHA (governance decision in vertical slice) |
| 9 Execution Simulator | STUB (paper, seeded) |
| 10 Simulation & Twin | ABSENT (seeded RNG only) |
| 11 Scientific Integrity | ABSENT |
| 12 Model Lifecycle | STUB (registry) |
| 13 Governance & Security | ALPHA (RBAC skeleton) |
| 14 Observability | STUB (+ EventBus interface) |
| 15 Engineering Intelligence | ABSENT |
| 16 Development Intelligence | ABSENT |
| 17 Cockpit & Desktop | ALPHA (vertical-slice lineage view) |

## Foundation vertical slice

In-process path (`@scios/vertical-slice`):  
raw → normalize → PIT feature → baseline → calibration+uncertainty → independent risk → governance decision → deterministic execution → outcome → immutable lineage → cockpit.

Proof: `pnpm gate:foundation` → `diagnostics-export/gate-foundation-proof.json`.  
**Not** ENTERPRISE GO.

## Stop conditions (Section 18)

| Verdict | Condition |
|---------|-----------|
| ENTERPRISE GO | All P0 gates + proof artifacts — **not met** |
| ENTERPRISE DEGRADED | Core usable with declared limits — **not claimed** |
| ENTERPRISE NO_GO | Critical blocker — N/A for Wave 1 scope |
| **ALPHA GO** | `pnpm gate:scaffold` + `pnpm gate:contracts` evidence — Wave 0/1 target |

## Implementation waves

Follow Section 82 discipline from the prior directive. Do not mass-generate ABSENT modules as empty classes.
