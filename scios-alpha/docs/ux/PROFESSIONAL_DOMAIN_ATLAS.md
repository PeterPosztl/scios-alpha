# Professional Domain Atlas — SCI OS ×10

**Label:** ALPHA_NON_PRODUCTION  
**Package:** `@scios/professional-domain-registry`  
**Rule:** Do **not** invent unsupported specialist procedures. Use `RESEARCH_REQUIRED`.

## Intent

One adaptive UX OS — **not** 200 apps. Roles compose shared primitives (Case, Entity, Risk, Timeline, Evidence, Decision, …).

## Domain families (20)

See `packages/professional-domain-registry/src/families.json`.

Shared capability families: Case Management, Entity Graph, Risk Workspace, Timeline Intel, Evidence/Provenance, Decision/Approval.

## Seven archetypes (validated first)

| Archetype | Family | Golden workflow hook |
|-----------|--------|----------------------|
| Cyber / SOC Analyst | cyber_ops | investigate_cyber_alert |
| Fraud Investigator | fraud_fincrime | investigate_suspicious_event |
| Financial Risk Analyst | market_portfolio_risk | evaluate_financial_operational_risk |
| OSINT / Intel Analyst | osint_geoint | analyze_entity_network |
| Enterprise Executive | enterprise_risk | executive_attention_home |
| Auditor / Compliance | gov_audit_legal | audit_decision_trail |
| Engineering Operator | eng_platform | diagnose_sci_os_incident |

Full records: `src/archetypes.json`.

## ~200 role seeds

`src/roles-seed.json` — **200** entries with identity + family; mission/tasks/permissions marked **RESEARCH_REQUIRED** until researched and mapped onto archetypes/primitives.

## UX grammar

`src/ux-grammar.json` — primary objects, status language, progressive disclosure, AI labels, shell regions.

## UX Core (composer model)

Canonical architecture: `docs/ux/SCI_OS_UX_CORE.md`  
Case + Entity + Risk systems → Workspace Composer → role workflows.  
**Not** `/cyber-dashboard` × 200.

## Product Kernel

```
200 roles + capabilities + data/prediction/risk/governance/execution/AI/recovery/UX
        ↓
PRODUCT KERNEL
        ↓
egy érthető, működő alkalmazás (/app)
```

Doc: `docs/ux/PRODUCT_KERNEL.md`  
Evidence: `diagnostics-export/ux/product-kernel.json`  
Verdict now: **PRODUCT_KERNEL_DEGRADED** (contracts + P0 slice; shell ABSENT).

## Experience compiler

```
ROLE + JTBD + PERMISSION + ONTOLOGY + DATA + CAPABILITIES + RISK POLICY + UX LEVEL
  → Professional Experience Compiler → Adaptive Workspace
```

Doc: `docs/ux/PROFESSIONAL_EXPERIENCE_COMPILER.md`  
Dry-run: `pnpm ux:compile:demo`

## What was not built

- 200 HTML pages  
- 200 dashboards  
- Fake READY for professional UX  

## Commands

```bash
pnpm --filter @scios/professional-domain-registry check
node packages/professional-domain-registry/src/index.js
```
