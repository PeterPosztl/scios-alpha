# ARCHITECTURE INVENTORY — Module Classification

**Repo:** `scios-alpha`  
**Classification legend:** WORKING | PARTIAL | STUB | DISCONNECTED | DUPLICATE | MISSING | DEPRECATED | UNKNOWN

## Workspaces & tooling

| Asset | Status | Notes |
|-------|--------|-------|
| pnpm workspace | WORKING | `pnpm-workspace.yaml`; `packageManager: pnpm@9.15.0` |
| `pnpm-lock.yaml` | WORKING | Frozen install PASS |
| Turborepo | MISSING | No `turbo.json` |
| ESLint / Prettier | MISSING | No lint script |
| Root TypeScript | PARTIAL | `tsconfig.base.json` + package configs; typecheck script incomplete coverage |
| AGENTS.md | WORKING | Honesty + pnpm + gates |
| `.cursor/rules/*` | WORKING | constitution, architecture, development-intelligence, testing-and-proof |
| `.cursor/skills/sci-os-platform` | WORKING | Platform skill |
| `infra/docker` | PARTIAL | Compose present; not validated in Phase 0 baseline |

## Packages (`packages/*`)

| Module | Path | Status | Evidence |
|--------|------|--------|----------|
| data-fabric | `packages/data-fabric` | PARTIAL → near WORKING for Wave 1 | Zod domain, ontology, ledger; 4 Jest tests; builds |
| alpha-loop | `packages/alpha-loop` | WORKING (ALPHA) | `pnpm check` / `pnpm sim` PASS; seeded RNG |
| meta-intelligence | `packages/meta-intelligence` | PARTIAL | Capability + evidence graph; no full Meta plane |
| observability | `packages/observability` | STUB / PARTIAL | Logger, metrics maps, EventBus interface |
| feature-store | `packages/feature-store` | STUB | Deterministic dummy vectors |
| model-registry | `packages/model-registry` | STUB | In-memory map |
| experiment-tracker | `packages/experiment-tracker` | STUB | In-memory runs |
| governance-engine | `packages/governance-engine` | PARTIAL | RBAC matrix + audit helper |
| validation-engine | `packages/validation-engine` | STUB / DISCONNECTED | Single Python stub; no package.json / not in TS graph |
| probability-engine | `packages/probability-engine` | STUB / DISCONNECTED | Python stub only |
| portfolio-engine | `packages/portfolio-engine` | STUB / DISCONNECTED | Python stub only |

## Apps (`apps/*`)

| Module | Port | Status | Evidence |
|--------|------|--------|----------|
| control-plane-api | 5200 | PARTIAL | Orchestrates demo predict→risk→exec; `/healthz`, `/v1/meta`, `/v1/flow`; no automated E2E |
| prediction-engine | 5201 | STUB | FastAPI placeholder; pytest health PASS |
| risk-engine | 5202 | STUB | FastAPI VaR stub; pytest PASS |
| execution-simulator | 5210 | STUB / PARTIAL | Paper fills; fail-closed if risk down; uses `Math.random` |
| cockpit-ui | 5230 | STUB / DISCONNECTED | Minimal dashboard; not lineage-aware |

## Legacy / duplicate surfaces

| Surface | Status | Action |
|---------|--------|--------|
| `src/master.ts` + `src/modules/*` | DEPRECATED / DUPLICATE | Superseded by `packages/alpha-loop`; still contains `Math.random` |
| Sibling repos (`sci-os-x10`, `sci-os-10`, …) | DUPLICATE (external) | Do not merge architectures into this contract |
| alpha-loop modules vs HTTP apps | DUPLICATE (intentional ALPHA) | Converge on one contract + adapters in later phases |

## Public contracts (in-repo)

| Contract | Path | Status |
|----------|------|--------|
| Domain Zod schemas | `packages/data-fabric/src/domain.ts` | PROTECTED / ALPHA |
| Ontology + relations | `packages/data-fabric/src/ontology.ts` | PROTECTED / ALPHA |
| CanonicalLedger | `packages/data-fabric/src/ledger.ts` | PROTECTED / ALPHA |
| EventBus | `packages/observability/src/event-bus.ts` | PROTECTED / STUB |
| Capability registry JSON | `docs/enterprise/CAPABILITY_REGISTRY.json` | PROTECTED |
| Definition of Done | `docs/enterprise/DEFINITION_OF_DONE.json` | PROTECTED |
| Master Contract | `docs/enterprise/MASTER_CONTRACT.md` | PROTECTED |
| Control-plane flow names | `CANONICAL_FLOW` in control-plane-api | PARTIAL |

## Runtime entries

| Entry | Command / URL | Status |
|-------|---------------|--------|
| Alpha health | `pnpm check` | WORKING |
| Alpha sim | `pnpm sim` / `pnpm dev:alpha` | WORKING |
| Control plane | `pnpm --filter @scios/control-plane-api start` | PARTIAL |
| Prediction | FastAPI `:5201` | STUB |
| Risk | FastAPI `:5202` | STUB |
| Execution | Node `:5210` | STUB |
| Cockpit | Node `:5230` | STUB |
| Docker stack | `pnpm docker:up` | UNKNOWN (not run Phase 0) |

## Tests

| Suite | Status |
|-------|--------|
| `packages/data-fabric` Jest (4) | WORKING |
| `apps/prediction-engine` pytest | WORKING (stub scope) |
| `apps/risk-engine` pytest | WORKING (stub scope) |
| Package `test` scripts elsewhere | STUB (empty / unused) |
| Integration / E2E multi-service | MISSING |
| Lint | MISSING |

## Missing (high priority for vertical slice)

- Decision Intelligence runtime (policy → decision record)
- Lineage graph persistence + query API
- Deterministic execution path (no scientific RNG)
- Cockpit binding to one proof flow
- Automated integration test + foundation gate
- Removal or quarantine of legacy `src/`

## Enterprise ABSENT (declared)

Full Meta engines, Digital Twin, FinOps, formal methods, scientific integrity plane — see `MASTER_CONTRACT.md` / capability `enterprise.modules.sections-49-83`.
