# Competitive UX Benchmark — SCI OS ×10

**Label:** ALPHA_NON_PRODUCTION  
**Sources:** Public documentation / product pages only. No code or asset copying.  
**Machine JSON:** `diagnostics-export/ux/competitor-benchmark.json` (and prior `ux-competitive-benchmark.json`)

## Method

Scores and patterns are reasoned from **lawfully observable** public materials.  
Task-time superiority claims require usability evidence — until then targets are **aspirational**.

## Reference categories studied

| Category | Reference | Strong patterns | Weak patterns | SCI OS opportunity |
|----------|-----------|-----------------|---------------|-------------------|
| Intelligence / ontology | Palantir Workshop | F-layout, object views, overlays, whitespace budget | Builder complexity, module drift | One grammar + Swiss restraint |
| Enterprise workflow | ServiceNow-style (public) | Case/task spine, assignment queues | Form heaviness, slow expert paths | CaseWorkspace + keyboard density modes |
| Investigation / observability | Splunk ES | Notable/risk triage | Dashboard density | Progressive disclosure L1–L4 |
| Ops monitoring | Datadog-style (public) | Live status, drilldown | Alert fatigue UX | Status language ≠ ONLINE=READY |
| Security ops | Microsoft Sentinel-style / CrowdStrike-style (public) | Alert→investigate loops | Tool sprawl | Cross-domain Entity360 |
| Search analytics | Elastic Security | Timeline workspace, templates | Query-first for non-analysts | Timeline + guided templates |
| Analytics | Power BI / Tableau-style | Exploration | Decorative charts | Question-driven viz only |
| Graph | Neo4j Bloom / Linkurious | Perspectives, expand, cases | Graph-only products | Graph synced to Timeline + Evidence |
| Case management | Enterprise case systems (public) | Audit trail, ownership | Siloed from graph/risk | Canonical Case object |

Detailed scored competitors remain in `diagnostics-export/ux-competitive-benchmark.json`.

## Measurable targets (examples — not yet proven superior)

| Workflow | Competitor baseline (est.) | SCI OS current | SCI OS target |
|----------|----------------------------|----------------|--------------|
| Investigate alert | ~12 interactions / 4 transitions | UNKNOWN (no golden workflow UI) | ≤7 interactions / ≤2 major transitions |
| Run prediction→risk→decision | N/A | Engineering JSON cockpit | Professional L1 + Why/Evidence ≤3 clicks |
| Diagnose SCI OS incident | N/A | sci:status + recovery shell | Guided Recovery ≤5 steps with evidence links |

**Validation result:** UNKNOWN until UX-5 golden workflows + E2E.

## What to learn / avoid

**Learn:** F-layout, entity grammar, selection carry-over, Timeline as workspace, accept-only AI next steps, informative empty states.  
**Avoid:** Fake READY, query-only client UX, spaghetti graphs, collapsing model confidence with system health, dead-end objects.
