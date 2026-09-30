# SCI OS ×10 — Product Kernel

**Label:** ALPHA_NON_PRODUCTION  
**Rule:** One understandable, working application — never 200 apps or fake READY.

```
200 szakma (roles)
+ 300+ capability (target catalog; registry is smaller in ALPHA)
+ adat
+ prediction
+ risk
+ governance
+ execution
+ AI
+ recovery
+ UX
        ↓
   PRODUCT KERNEL
        ↓
 egy érthető, működő alkalmazás
        (/app — adaptive workspace)
```

Experience layer (feeds the same kernel):

```
ROLE + JTBD + PERMISSION + ONTOLOGY + DATA + CAPABILITIES
+ RISK POLICY + UX LEVEL
        ↓
PROFESSIONAL EXPERIENCE COMPILER
        ↓
ADAPTIVE WORKSPACE  ← rendered by Product Kernel shell
```

## What the Product Kernel is

The **runtime product spine** that binds platform capabilities into one UX OS:

| Kernel lane | Responsibility | ALPHA truth |
|-------------|----------------|-------------|
| **Identity & permission** | Who may act | RBAC skeleton; OIDC ABSENT |
| **Data / events** | Normalized inputs, PIT | data-fabric + vertical slice **PARTIAL** |
| **Prediction** | Models, envelopes | prediction path in slice; engine often STUB |
| **Risk** | Scores, gates | risk in slice + risk-engine STUB/PARTIAL |
| **Governance** | Policy, approvals | governance-engine skeleton |
| **Execution** | Sim/actions | SIMULATION_ONLY in cockpit |
| **Lineage / evidence** | Provenance | lineage in slice **PRESENT** |
| **AI** | Contextual copilot | contract only; must cite evidence |
| **Recovery** | Startup heal, honesty | sci:start + meta-recovery **PRESENT** |
| **UX** | Shell + composer | Core/compiler **CONTRACT**; host **ABSENT** |
| **Roles** | 200 seeds + 7 archetypes | registry **PRESENT** |

## What it is not

- Not `atom_ai/` stub trees  
- Not `/fraud-dashboard` × 200  
- Not “300 capabilities READY” without proof  
- Not collapsing model confidence with system health  

## One application (target)

| Route | Role |
|-------|------|
| `/app` | Adaptive home (compiler output) |
| `/app/case/:id` | Case system |
| `/app/entity/:id` | Entity system |
| `/app/risk/:id` | Risk system |
| `/app/workspace/:family` | Composed professional workflow |
| `/app/tech/slice` | **P0 engineering cockpit** (protected) |
| `/app/ops` | Recovery / system honesty |

Today’s working surface remains `cockpit-ui :4000` until `/app` shell ships.

## Capability honesty

- **Target:** 300+ capabilities in a full enterprise catalog  
- **ALPHA registry now:** finite entries in `docs/enterprise/CAPABILITY_REGISTRY.json` (see `diagnostics-export/ux/product-kernel.json` for live count)  
- Unproven capability ⇒ compiler `unknowns` / module omitted — **never** silent READY  

## Kernel compile path

1. Load role (atlas) + JTBD  
2. Intersect permissions (server)  
3. Intersect **proven** capabilities + available data  
4. Apply risk policy → disable/approve gates  
5. Apply UX level → density / disclosure  
6. Emit Adaptive Workspace module list  
7. Render via Workspace Composer on Case / Entity / Risk systems  

## Stop condition (one working app)

**PRODUCT KERNEL DEGRADED** until:

- `/app` shell mounts compiler output  
- ≥1 golden composed workflow end-to-end (non-JSON-only)  
- P0 slice still works under `/app/tech/slice`  
- Recovery honesty preserved  

**PRODUCT KERNEL READY** only with evidence artifacts under `diagnostics-export/` — never by directory count.

## Related docs

- `docs/ux/SCI_OS_UX_CORE.md`  
- `docs/ux/PROFESSIONAL_EXPERIENCE_COMPILER.md`  
- `docs/ux/PROFESSIONAL_DOMAIN_ATLAS.md`  
- `docs/enterprise/CAPABILITY_REGISTRY.json`  
- `docs/ux/CURRENT_UX_TRUTH.md`  
