# SCI OS ×10 — Domain Gap Register

**Label:** `ALPHA_NON_PRODUCTION`  
**Generated:** 2026-08-14T01:40:34.264Z  
**Domains:** 31  
**Facet controls:** 187

## Method

User-listed product domains classified against **current evidence**, not competitor feature matrices.  
`PROFILE_DISABLED` / `DEFERRED` are valid for local-foundation.

## Domain table

| Domain | Status | Sev | FR? | Why |
|--------|--------|-----|-----|-----|
| Security | PARTIAL | P1 | Y | Localhost + SIMULATION_ONLY defaults proven; OIDC/rate-limit production incomplete. |
| Data architecture | PARTIAL | P1 | Y | Zod fabric + local durable exist; enterprise schema registry absent. |
| Database correctness | PROFILE_DISABLED | P2 | N | local-foundation does not require PG; correctness gates N/A until PG profile. |
| Distributed systems | DEFERRED | P2 | N | Single-node local spine; distributed fabric is full-vision. |
| Eventing | PARTIAL | P2 | N | In-memory bus + lineage ordering; durable delivery deferred. |
| Queueing | PROFILE_DISABLED | P2 | N | Redis/BullMQ optional; local jobs in-memory only. |
| AI/agent architecture | PARTIAL | P1 | Y | GW1 AI context + approval path; not multi-agent OS. |
| LLM governance | PARTIAL | P1 | Y | UX/governance doctrine present; production LLM defenses absent. |
| Model science | PARTIAL | P2 | Y | Honesty labels present; scientific validation not claimed. |
| Causal reasoning | ABSENT | P3 | N | Out of first-release spine. |
| Simulation | PARTIAL | P1 | Y | SIMULATION_ONLY proven; scenario depth partial. |
| Cyber intelligence | DEFERRED | P2 | N | SOC experience composition exists; CTI runtime absent. |
| Research intelligence | ABSENT | P3 | N | experiment-tracker package scaffold only. |
| Legal/compliance | DEFERRED | P2 | N | Lineage/audit partial; compliance product deferred. |
| Financial intelligence | PARTIAL | P1 | Y | GW1 market analyze is the first-release FinIntel slice. |
| Enterprise search | PARTIAL | P1 | Y | Catalog/run-derived search; not enterprise index. |
| Knowledge graph | PARTIAL | P2 | N | Ontology stubs; engine absent. |
| Workflow/BPM | PARTIAL | P1 | Y | GW1 path only — not enterprise BPM. |
| Collaboration | ABSENT | P2 | N | Explicitly deferred from first release. |
| Observability | PARTIAL | P1 | Y | Diagnostics/export proven; OTel SaaS disconnected. |
| SRE | PARTIAL | P1 | Y | Recovery + SLO defs; measured burn/incident absent. |
| DevSecOps | PARTIAL | P1 | Y | Integrity/preflight present; full DevSecOps pipeline incomplete. |
| Supply chain | DEFERRED | P2 | N | Hashes/lockfile strong; SBOM/signing not first-release blockers if hashes PASS. |
| Windows desktop lifecycle | PARTIAL | P1 | Y | LOCALAPPDATA packaged Home→GW1→Evidence→shutdown proven for current build; Start Menu points at install root. |
| Offline/local operation | PARTIAL | P1 | Y | Designed for local-first; packaged independence still PARTIAL. |
| Performance | UNKNOWN | P2 | N | No fresh measured SLO evidence — UNKNOWN not PASS. |
| Cost control | ABSENT | P2 | N | No enforced budgets. |
| Privacy | PARTIAL | P1 | Y | Local single-user reduces blast radius; lifecycle incomplete. |
| Backup/DR | PARTIAL | P2 | N | First-release recovery (failed-boot cleanup + install rollback backup + recovery artifact) proven; enterprise DR remains P2. |
| Accessibility | PARTIAL | P1 | Y | Basic ARIA present; no evidence PASS for a11y gate. |
| Professional UX | PARTIAL | P1 | Y | Pro path patterns proven; full 2026 parity incomplete. |

## Status counts (domains)

- **PARTIAL:** 20
- **PROFILE_DISABLED:** 2
- **DEFERRED:** 4
- **ABSENT:** 4
- **UNKNOWN:** 1

## P0 domain facets

- none besides mapped FAIL facets

## First-release domain priorities (not all P2)

1. Windows desktop lifecycle — packaged GW1 (**TASK-PKG-003 CLOSED** in batch_001_P0)
2. Backup/DR first-release recovery — reclassified P2 for enterprise DR; install backup + failed-boot cleanup PASS
3. Security / LLM governance / professional UX — keep honesty, close DecisionAction if required
4. Financial intelligence / enterprise search / simulation — deepen GW1 only
5. Do **not** pull collaboration, causal, research, distributed fabric into first release

## Maps into Closure Engine

Re-run `pnpm closure:continuous` after this register; domain controls are also emitted as `DOM.*` via `scripts/enterprise/generate-domain-gap-register.mjs` for repair queue alignment.

Full JSON: `diagnostics-export/closure/domain-gap-register.json`
