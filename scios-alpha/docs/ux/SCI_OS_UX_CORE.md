# SCI OS UX Core Architecture

**Label:** ALPHA_NON_PRODUCTION  
**Status:** Architecture contract — shell/composer **not implemented** in cockpit yet  
**Rule:** One adaptive OS. Never `/cyber-dashboard` × N.

```
SCI OS UX CORE
                     │
      ┌──────────────┼──────────────┐
      │              │              │
 Case System    Entity System   Risk System
      │              │              │
  Timeline         Graph        Scenarios
      │              │              │
  Evidence     Intelligence     Decisions
      │              │              │
      └──────────────┼──────────────┘
                     │
             Workspace Composer
                     │
     ┌───────────────┼────────────────┐
     ↓               ↓                ↓
Fraud Investigator  SOC Analyst  Risk Manager
     ↓               ↓                ↓
 own workflow     own workflow    own workflow
```

## Core systems (shared primitives)

| System | Primary objects | Serves (examples) |
|--------|-----------------|-------------------|
| **Case** | Case, Incident, Investigation, Task, Report | Fraud, SOC, Corporate investigation, DFIR |
| **Entity** | Entity, Relationship, Graph, Intelligence | OSINT, Threat intel, Fraud, FinIntel |
| **Risk** | Risk, Scenario, Simulation, Prediction, Decision, Approval | Market/enterprise risk, Cyber risk, Vendor risk |

Cross-cutting (all compositions):

- **Timeline** — events, alerts, transactions, decisions, human/system actions  
- **Evidence** — provenance, lineage, citations  
- **Workspace Composer** — assembles primitives into role workflows  

## Composer (not duplicate apps)

```
FraudInvestigationWorkspace =
  CaseHeader + EntityGraph + TransactionTimeline
  + RiskPanel + EvidencePanel + DecisionPanel + ReportBuilder

SOCWorkspace =
  IncidentHeader + AlertTimeline + AssetGraph
  + DetectionEvidence + ThreatIntel + ResponseActions

PortfolioRiskWorkspace =
  PortfolioHeader + ExposureMap + ScenarioPanel
  + StressResults + DecisionQueue
```

Same Case / Entity / Risk systems — different **configuration**, not different products.

## Routes (target)

| Route | Purpose |
|-------|---------|
| `/app` | Adaptive shell (role home) |
| `/app/case/:id` | Case system |
| `/app/entity/:id` | Entity360 |
| `/app/risk/:id` | Risk workspace |
| `/app/workspace/:family` | Composed family workspace |
| `/app/tech/slice` | **P0 engineering cockpit** (protected) |

**Rejected:** `/fraud-dashboard`, `/cyber-dashboard`, … ×200

## Archetype mapping (first)

| Role | Composer profile | Core systems used |
|------|------------------|-------------------|
| Fraud Investigator | `fraud_investigation` | Case + Entity + Risk + Timeline + Evidence |
| SOC Analyst | `soc_ops` | Case + Entity + Timeline + Evidence (+ Risk overlay) |
| Risk Manager | `portfolio_risk` | Risk + Scenarios + Decisions (+ Entity as needed) |

Full atlas: `docs/ux/PROFESSIONAL_DOMAIN_ATLAS.md`  
Registry: `@scios/professional-domain-registry`

## Implementation status

| Layer | Status |
|-------|--------|
| UX Core diagram / contract | **PRESENT** (this doc) |
| Domain registry + grammar | **PRESENT** |
| Workspace Composer runtime | **ABSENT** |
| Case / Entity / Risk UI systems | **ABSENT** |
| P0 engineering vertical slice | **PRESENT** (preserve) |

## Next build step

UX-4: Universal shell + Workspace Composer host  
UX-5: First three composed workflows (Fraud, SOC, Risk) on shared primitives — **without** destroying P0 tech slice.
