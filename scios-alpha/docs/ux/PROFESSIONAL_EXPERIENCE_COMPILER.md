# Professional Experience Compiler

**Label:** ALPHA_NON_PRODUCTION  
**Status:** Contract + schema — **runtime compiler ABSENT**  
**Related:** `docs/ux/SCI_OS_UX_CORE.md`, `@scios/professional-domain-registry`

```
ROLE
+ JOB TO BE DONE
+ PERMISSION
+ DOMAIN ONTOLOGY
+ AVAILABLE DATA
+ SCI OS CAPABILITIES
+ RISK POLICY
+ USER EXPERIENCE LEVEL
        ↓
PROFESSIONAL EXPERIENCE COMPILER
        ↓
ADAPTIVE WORKSPACE
```

## Purpose

Compile a **role-specific workspace** from shared Case / Entity / Risk systems — never by cloning dashboards.

The user sees cases, alerts, entities, risks, evidence, decisions.  
Internals (microservices, queues, package names) stay hidden unless `experienceLevel` is engineering/admin.

## Input dimensions

| Input | Meaning | Source (ALPHA) |
|-------|---------|----------------|
| **ROLE** | Who is acting (`roleId`) | Domain registry archetypes / seeds |
| **JOB TO BE DONE** | Mission + top tasks / decisions | Archetype `primaryMission`, `topTasks` |
| **PERMISSION** | What may be seen/done (server-authoritative) | Governance RBAC skeleton; OIDC ABSENT |
| **DOMAIN ONTOLOGY** | Family + entity types that matter | `families.json` + role `commonEntities` |
| **AVAILABLE DATA** | What data is actually present / fresh | Runtime bindings — **ABSENT** (must not fake) |
| **SCI OS CAPABILITIES** | Proven platform capabilities | `CAPABILITY_REGISTRY.json` + evidence |
| **RISK POLICY** | Limits, approvals, high-risk gates | Policy objects — **PARTIAL** |
| **USER EXPERIENCE LEVEL** | novice / intermediate / expert | Archetype `noviceMode` / `expertMode` |

Missing input ⇒ compiler emits **UNKNOWN** / reduced workspace — never invent data or claim READY.

## Compiler outputs

| Output | Description |
|--------|-------------|
| `workspaceProfileId` | e.g. `fraud_investigation`, `soc_ops` |
| `nav` | Role-filtered navigation |
| `home` | Attention queue for that role |
| `modules` | Ordered primitive modules (CaseHeader, EntityGraph, …) |
| `density` | comfortable / compact / dense |
| `aiCopilotProfile` | Contextual prompts allowed for this role |
| `disabledActions` | Actions blocked + human-readable why |
| `disclosureDefault` | L1–L4 default depth |

## Compile rules (non-negotiable)

1. **Permissions win** — UX hide is not authorization.  
2. **Capabilities win** — no module without registry/evidence (or explicit DEMO).  
3. **Available data wins** — empty states explain missing inputs.  
4. **Risk policy wins** — high-risk actions require approval UX.  
5. **JTBD orders the workflow** — not feature laundry lists.  
6. **Experience level** changes density/guidance — not a different product.  
7. **P0 tech slice** remains reachable for engineering roles / tech mode.

## Example (Fraud Investigator · expert)

**Inputs (illustrative):** role=`arch.fraud_investigator`, JTBD=defensible fraud case, permissions=case/entity/transaction, ontology=fraud_fincrime, capabilities=Case+Entity+Risk, policy=freeze requires approval, level=expert  

**Output workspace:**  
`CaseHeader → EntityGraph → TransactionTimeline → RiskPanel → Evidence → Decision → Report`  
density=`dense`, disclosureDefault=`L2`, AI=`Summarize pattern` (labeled), freeze=`disabled` until approval path.

## Implementation status

| Piece | Status |
|-------|--------|
| This contract | PRESENT |
| JSON schema | `packages/professional-domain-registry/src/experience-compiler.schema.json` |
| Runtime compiler | **ABSENT** |
| Adaptive workspace host | **ABSENT** |

Next: implement compiler as pure function over registry + capability + auth context, then feed Workspace Composer (UX Core).
