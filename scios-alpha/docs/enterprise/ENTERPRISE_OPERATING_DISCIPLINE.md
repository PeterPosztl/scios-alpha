# Enterprise Operating Discipline Layer

**Extends:** Product Kernel · Meta-Intelligence · System Closure · Evidence/Lineage · Runtime  
**Does not create:** a second OS / second kernel / second meta-intelligence  
**Evidence:** `diagnostics-export/enterprise-discipline/` · `pnpm enterprise:discipline`  
**HTTP (engineering):** `GET /v1/discipline/status`  
**Updated:** 2026-08-13

---

## What was added (inside canonical systems)

| Discipline | Location |
|------------|----------|
| SLO / error budgets | `packages/product-kernel/src/discipline/slo.js` |
| Action + idempotency | `discipline/action-execution.js` + `vertical-slice/src/action-gate.ts` |
| Contract versions | `discipline/contracts.js` |
| Operational ontology | `discipline/ontology.js` |
| Asset maturity | `discipline/maturity.js` |
| Intelligence Control Tower | `discipline/control-tower.js` (Meta-Intelligence inventory pattern) |
| Professional evaluation | `discipline/evaluation.js` |
| Change impact | `discipline/impact.js` |
| Execution trace | `discipline/execution-trace.js` |
| Progressive disclosure + outcomes + release governor | `discipline/ux-outcomes-governor.js` |

## Artifacts 01–16

Generated under `diagnostics-export/enterprise-discipline/`.

## Honest limits

- SLO consumption is **UNKNOWN_UNTIL_MEASURED** (not fake green).
- Same-process idempotency **PARTIAL_PASS**; durable cross-process restart still PARTIAL.
- Evaluation baseline set for GW1 archetype; other archetypes ARCHETYPE_DEFINED / NOT_RUN.
- **READY = false** until measured reliability + packaged validation + durable idempotency.
