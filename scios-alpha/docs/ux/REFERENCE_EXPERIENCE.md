# Reference Experience — SCI OS Shell

**Purpose:** Capture current UX **before** intentional change.  
**Shell:** `apps/cockpit-ui` · Control Plane `:3000` · Shell `:4000`  
**Label:** ALPHA_NON_PRODUCTION  

Screenshots: prefer live capture under `docs/ux/reference-experience/screenshots/`. If services are down, structural inventory below remains authoritative for DNA lock (class `STRUCTURE_FROM_SOURCE`).

---

## Capture index

| Surface | View id | Route/API | Structure file |
|---------|---------|-----------|----------------|
| Home | `home` | `GET /v1/home` | `reference-experience/home.json` |
| Search | `searchResults` | `GET /v1/search` | `reference-experience/search.json` |
| Entity360 | `entities` | `GET /v1/entities/:id` | `reference-experience/entity360.json` |
| Analysis | `slice` | `POST /api/vertical-slice/run` | `reference-experience/analysis.json` |
| Risk | proRisk + decisions | envelope in slice | `reference-experience/risk.json` |
| Governance | approval + proDecision | envelope + approval card | `reference-experience/governance.json` |
| Graph | PARTIAL | nav/engineering | `reference-experience/graph.json` |
| Timeline | PARTIAL | — | `reference-experience/timeline.json` |
| Evidence | `evidence` | lineage in slice | `reference-experience/evidence.json` |
| System | `system` | readiness APIs | `reference-experience/system.json` |

## Interaction map (golden)

```
Home → Search(AAPL) → Entity360 → Analyze
  → Uncertainty/Risk/Gov cards → Trust Capsule → Approval
  → Evidence/Lineage (or Technical View)
```

## Change rule

Do not replace a working/approved pattern without:

1. Product Memory UX decision record  
2. Updated reference capture  
3. Visual/structural regression note in `diagnostics-export/ux-dna/`

## Boot gate

If Home is unreachable, **BOOT P0 first** — do not redesign around failure.
