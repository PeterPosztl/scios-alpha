# SCI OS ×10 — Meta-Intelligence Plane

Canonical control stratum above data/feature/model/execution. Every lower plane registers capabilities here; Self-Evolution Controller reads Development + Operations + Economic signals to propose (never silently apply) upgrades.

```
SCI OS ×10 META-INTELLIGENCE PLANE
│
├── Enterprise Ontology
├── Capability Registry
├── Development Intelligence
├── Research Intelligence
├── Prediction Intelligence
├── Decision Intelligence
├── Risk Intelligence
├── Execution Intelligence
├── Governance Intelligence
├── Operations Intelligence
├── Economic Intelligence
└── Self-Evolution Controller
```

## Plane → package / app mapping (ALPHA)

| Intelligence plane | Primary surface |
|--------------------|-----------------|
| Enterprise Ontology | `@scios/data-fabric` domain + Zod |
| Capability Registry | `@scios/meta-intelligence` |
| Development Intelligence | experiment-tracker, model-registry, CI hooks |
| Research Intelligence | validation / probability / portfolio stubs |
| Prediction Intelligence | `apps/prediction-engine`, alpha-loop PE |
| Decision Intelligence | control-plane demo + policy hooks |
| Risk Intelligence | `apps/risk-engine`, alpha-loop RiskEngine |
| Execution Intelligence | `apps/execution-simulator`, alpha-loop ExecutionSimulator |
| Governance Intelligence | `@scios/governance-engine` |
| Operations Intelligence | `@scios/observability`, docker/k8s |
| Economic Intelligence | portfolio-engine stub + PnL in sim |
| Self-Evolution Controller | meta-intelligence `SelfEvolutionController` (propose-only) |

## Rules

1. No cross-plane silent writes — only via Capability Registry + events/APIs.
2. Self-Evolution never auto-deploys; outputs proposals + audit events.
3. Prediction / Decision / Risk / Execution remain Gate A until validation + governance seal.
4. Align UI/UX tokens with SCI Design Command when cockpit expands.

See `@scios/meta-intelligence` for typed registry.
