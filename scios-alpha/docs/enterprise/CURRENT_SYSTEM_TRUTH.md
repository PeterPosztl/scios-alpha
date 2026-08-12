# CURRENT SYSTEM TRUTH — SCI OS ×10 (`scios-alpha`)

**Inspected:** 2026-07-16 (Phase 0 — Repository Truth Lock)  
**Working directory:** `C:\Users\peter\Desktop\SCI\scios-alpha`  
**Package manager:** `pnpm@9.15.0` (lockfile present; no npm/yarn lockfiles)  
**Turborepo:** not configured (`turbo.json` absent)  
**Platform verdict (Phase 0):** `DEGRADED` — runnable ALPHA kernel with evidence; not foundation-complete for ENTERPRISE / full E2E lineage+cockpit proof.

## Honesty

- This repo is an **ALPHA scaffold**, not ENTERPRISE READY.
- No evidence ⇒ **UNKNOWN**, never PASS.
- Green build / file count alone ≠ GO.
- Sibling trees under `Desktop/SCI` (`sci-os-x10`, `sci-os-10`, `qmis-orion-os-x10`, …) are **out of scope**; do not fork architecture into them from this contract.

## What is true today

| Concern | Truth |
|---------|--------|
| Monorepo | pnpm workspace: `apps/*`, `packages/*` |
| In-process vertical | `packages/alpha-loop` — DataFabric → FeatureStore → Prediction → Risk → Execution (seeded RNG) |
| HTTP vertical (partial) | control-plane → prediction/risk/exec FastAPI/Node stubs → cockpit UI |
| Contracts Wave 1 | Zod domain + ontology + in-memory ledger in `@scios/data-fabric` |
| Gates with proof | `pnpm gate:scaffold` → GO; `pnpm gate:contracts` → GO |
| Unit tests | 4 tests in `@scios/data-fabric` only (root `pnpm test`) |
| Lint | **MISSING** (no eslint/prettier script) |
| Integration E2E suite | **MISSING** (requires multi-process runtime; not automated) |
| Enterprise modules (§49–83) | **ABSENT** (declared in registry) |

## Baseline validation (executed)

Exact results: `diagnostics-export/baseline-validation.json`

| Step | Command | Result | Exit |
|------|---------|--------|------|
| install | `pnpm install --frozen-lockfile` | PASS | 0 |
| lint | (none) | SKIP | — |
| typecheck | `pnpm typecheck` | PASS | 0 |
| unit tests | `pnpm test` | PASS | 0 |
| build | `pnpm build` | PASS | 0 |
| smoke | `pnpm check` | PASS | 0 |
| smoke | `pnpm sim` | PASS | 0 |
| gate | `pnpm gate:scaffold` | PASS | 0 |
| gate | `pnpm gate:contracts` | PASS | 0 |
| pytest | `apps/prediction-engine` | PASS | 0 |
| pytest | `apps/risk-engine` | PASS | 0 |
| integration | (none dedicated) | SKIP | — |

**Overall:** `PASS_WITH_SKIPS` (10 PASS, 0 FAIL, 2 SKIP).

## Critical findings (Phase 0 search)

| Finding | Location | Class |
|---------|----------|--------|
| Legacy duplicate loop | `src/modules/*` + `src/master.ts` (uses `Math.random`) | DUPLICATE / DEPRECATED |
| Non-deterministic fills | `apps/execution-simulator` `Math.random` for price/book | PARTIAL / risk |
| Dual feature/prediction paths | alpha-loop modules vs `@scios/feature-store` + FastAPI apps | DUPLICATE architecture |
| Python science stubs | `packages/{validation,probability,portfolio}-engine` (no `package.json`) | STUB / DISCONNECTED |
| Typecheck narrow | root typecheck only runs packages with `typecheck` script (meta-intelligence) | PARTIAL |
| No lineage runtime | ontology has `lineage` field; no E2E lineage graph service | MISSING |
| No Decision Intelligence engine | Master Contract ABSENT | MISSING |
| Cockpit disconnected from lineage | minimal dashboard | PARTIAL / DISCONNECTED |

## Recommended first vertical slice (Phases 1–8)

**Status:** Implemented in-process as `@scios/vertical-slice` + control-plane `/v1/slice/run` + cockpit.

```
raw event → normalized event → PIT feature → baseline prediction
→ calibration + uncertainty → independent risk gate → governance decision
→ deterministic simulated execution → outcome → immutable lineage → cockpit view
```

Proof gate: `pnpm gate:foundation`

## Phase 0 completion

Artifacts:

- `docs/enterprise/CURRENT_SYSTEM_TRUTH.md` (this file)
- `docs/enterprise/ARCHITECTURE_INVENTORY.md`
- `docs/enterprise/PROTECTED_CONTRACTS.md`
- `docs/enterprise/IMPLEMENTATION_DEPENDENCY_ORDER.md`
- `diagnostics-export/repository-truth.json`
- `diagnostics-export/baseline-validation.json`
