# Canonical Startup Path — SCI OS ×10

**One root:** `scios-alpha/`  
**One manifest:** `sci-os.manifest.json`  
**One profile:** `local-foundation`  
**One config:** `.env`  
**One infra profile:** `infra/docker/docker-compose.infra.yml`

```
pnpm sci:start   → Bootstrap Capsule → start-sci-os.cjs
pnpm sci:status
pnpm sci:proof
pnpm sci:shutdown   → cockpit → backend → infra
```

| Concern | Canonical |
|---------|-----------|
| Backend | `:3000` `apps/control-plane-api` |
| Cockpit 2.0 | `:4000` `apps/cockpit-ui` |
| Worker | embedded foundation smoke worker |
| Recovery Shell | `:5299` on startup failure |
| Pipeline | `VERTICAL_SLICE_STAGES` in `@scios/data-fabric` |

FULL_SYSTEM **READY** only when infra HEALTHY + backend READY + worker smoke PASS + cockpit 200 + proof/signoff. Otherwise **DEGRADED** or **NO_GO**. ALPHA ≠ enterprise production.

## Autonomous startup acceptance

The platform is **autonomously starting** (core) when `pnpm ci:startup-convergence-gate` proves:

1. Clean stop  
2. First one-click start (`installer/scripts/bootstrap-capsule.cjs`)  
3. Worker smoke + readiness (`pnpm sci:proof`)  
4. Orderly mid-shutdown (ports down)  
5. Second one-click start  
6. Second worker smoke + readiness  
7. Final orderly shutdown  

Evidence: `diagnostics-export/dual-startup-evidence.json`, `diagnostics-export/p0-startup-scorecard.json`.

**Golden Boot:** `installer/golden-boot.manifest.json` (ports aligned with this manifest). Thin shell `bootstrap/bootstrap-capsule.js` **delegates** to the canonical capsule — it must not spawn a second orchestrator.

**Rejected parallel starts:** second `start-sci-os` from `SCI OS ×10.bat` after cascade; standalone `dist/backend` golden spawn; foreign Vite `:4000`.

**Meta OS:** `qmis-orion-os-x10/GalaxusMetaOS/start-meta-os.bat` → `start-meta-os.cjs` is a **sibling legacy product tree**. It is **not** on the SCI OS ×10 boot chain. Do not wire it into `scios-alpha`.

**User hand-off:** open Shell `http://127.0.0.1:4000/` — never Control Plane `/` on `:3000` (API returns `not_found`).

**Node:** PACKAGED requires bundled `runtime/node` (no silent system Node). DEVELOPMENT may use system Node with engines contract warning.
