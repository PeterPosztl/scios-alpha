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
