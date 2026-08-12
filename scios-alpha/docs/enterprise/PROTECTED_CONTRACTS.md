# PROTECTED CONTRACTS — SCI OS ×10 (`scios-alpha`)

**Rule:** Do not rewrite, rename, or silently fork these contracts. Extend via versioned fields, adapters, or explicit migration PRs.

## Tier 0 — Platform governance (do not contradict)

| Artifact | Path | Protection |
|----------|------|------------|
| Agent constitution | `AGENTS.md` | Honesty, pnpm-only, wave discipline |
| Cursor rules | `.cursor/rules/*.mdc` | Architecture + proof rules |
| Capability registry | `docs/enterprise/CAPABILITY_REGISTRY.json` | Status must stay evidence-backed |
| Definition of Done | `docs/enterprise/DEFINITION_OF_DONE.json` | Gate vocabulary |
| Master Contract | `docs/enterprise/MASTER_CONTRACT.md` | Truth map for modules |
| Package manager | root `package.json` `packageManager` | `pnpm@9.15.0` only |

## Tier 1 — Public TypeScript contracts (`@scios/data-fabric`)

| Export surface | File | Notes |
|----------------|------|-------|
| Domain schemas | `packages/data-fabric/src/domain.ts` | Instruments, features, predictions, risk, orders, audit |
| Ontology schemas + store | `packages/data-fabric/src/ontology.ts` | Entities, relations, lineage field |
| Canonical ledger | `packages/data-fabric/src/ledger.ts` | Ledger names including `decisions`; append-only semantics |
| Vertical-slice contracts | `packages/data-fabric/src/pipeline-contracts.ts` | Stage schemas + `VERTICAL_SLICE_STAGES` |
| Prediction envelope | `PredictionEnvelopeSchema` | Normative: pointEstimate, distribution, interval, calibration, epistemic/aleatoric, abstain, featureSnapshotId |
| Risk decision envelope | `RiskDecisionEnvelopeSchema` | Normative: riskDecisionId, predictionId, approved, reason, limits, uncertaintyHaircut, killSwitchActive (≠ ontology RiskDecision entity) |
| Package barrel | `packages/data-fabric/src/index.ts` | Public export boundary |

**Change policy:** additive Zod fields preferred; breaking changes require version bump + adapter + gate update.

## Tier 2 — Kernel interfaces

| Contract | Path | Notes |
|----------|------|-------|
| EventBus | `packages/observability/src/event-bus.ts` | In-memory adapter OK; keep interface stable |
| Governance RBAC actions | `packages/governance-engine/src/index.ts` | Action/Role unions are API surface |
| Meta-Intelligence factory | `packages/meta-intelligence/src/index.ts` | Capability IDs + evidence graph semantics |
| Seeded RNG | `packages/alpha-loop/src/modules/seeded-rng.ts` | Determinism contract for scientific loops (`SCIOS_SEED`) |

## Tier 3 — Runtime HTTP surface (ALPHA)

Do not invent parallel route trees for the same concern without deprecating the old one.

| Service | Canonical routes (keep) |
|---------|-------------------------|
| control-plane-api `:5200` | `/healthz`, `/demo/predict-and-simulate`, `/v1/meta`, `/v1/flow` |
| prediction-engine `:5201` | `/healthz`, `/predict` |
| risk-engine `:5202` | `/healthz`, risk check routes |
| execution-simulator `:5210` | `/healthz`, order submit |
| cockpit-ui `:5230` | `/healthz`, dashboard |

## Tier 4 — Proof & gates

| Gate | Script | Proof artifact |
|------|--------|----------------|
| Scaffold | `pnpm gate:scaffold` | `diagnostics-export/gate-scaffold-proof.json` |
| Contracts | `pnpm gate:contracts` | `diagnostics-export/gate-contracts-proof.json` |
| Foundation slice | `pnpm gate:foundation` | `diagnostics-export/gate-foundation-proof.json` |
| CI prediction foundation | `pnpm ci:prediction-foundation-gate` | `diagnostics-export/ci-prediction-foundation-gate-proof.json` |
| Boot Normal | `pnpm boot:normal` | `diagnostics-export/boot-normal-proof.json` |
| Boot Repair | `pnpm boot:repair` | `diagnostics-export/boot-repair-proof.json` |
| Boot Safe | `pnpm boot:safe` | stdout only (read-only) |
| Boot Proof | `pnpm boot:proof` | `diagnostics-export/boot-proof-proof.json` |
| Phase 0 truth | (manual / this wave) | `diagnostics-export/repository-truth.json`, `baseline-validation.json` |

**Rule:** Never mark READY/GO in code without writing a proof JSON under `diagnostics-export/`.

## Explicitly not protected (may change / remove)

| Surface | Reason |
|---------|--------|
| `src/` legacy loop | DEPRECATED duplicate of alpha-loop |
| Placeholder model weights / paper PnL numbers | NON-PRODUCTION demos |
| Dummy feature vectors | Scaffold only |
| Python stub engines without package metadata | DISCONNECTED stubs |

## Forbidden parallel architectures (this repo)

- Second ontology store outside `@scios/data-fabric`
- Second ledger with different semantics for the same ledger names
- Second EventBus with incompatible event shapes
- New “enterprise ready” flags without Meta-Intelligence evidence
- Reintroducing npm/yarn lockfiles beside pnpm
