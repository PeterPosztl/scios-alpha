## Truth (Wave 0)

This is an **ALPHA scaffold**. Enterprise sections 49–83 are mostly **ABSENT** — see `docs/enterprise/CAPABILITY_REGISTRY.json`.

```bash
pnpm install:repro   # frozen lockfile
pnpm build
pnpm test
pnpm gate:scaffold   # Wave 0 evidence
pnpm gate:contracts  # Wave 1 ontology + ledgers evidence
```

Master Contract truth map: `docs/enterprise/MASTER_CONTRACT.md`  
**Not ENTERPRISE GO** — Wave 1 vertical slice only.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Python 3.11+ (for prediction / risk engines locally)
- Docker (optional)

## Install

```bash
pnpm install
pnpm build
```

## Local services (pnpm filters)

```bash
pnpm --filter @scios/prediction-engine dev
pnpm --filter @scios/risk-engine dev
pnpm --filter @scios/execution-simulator dev
pnpm --filter @scios/control-plane-api dev
pnpm --filter @scios/cockpit-ui dev
```

Or start all Node apps in parallel:

```bash
pnpm dev
```

| Service | Port |
|---------|------|
| control-plane-api | 5200 |
| prediction-engine | 5201 |
| risk-engine | 5202 |
| execution-simulator | 5210 |
| cockpit-ui | 5230 |

## Alpha loop (in-process)

```bash
pnpm check      # health
pnpm sim        # 60-minute simulation
pnpm dev:alpha  # continuous ALPHA live loop
```

## Demo curl

```bash
curl -X POST http://127.0.0.1:5200/demo/predict-and-simulate -H "content-type: application/json" -d "{\"instrumentId\":\"AAPL\",\"horizonSec\":3600,\"size\":10}"
```

Or:

```bash
pnpm demo
```

## Docker Compose

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

Then open http://127.0.0.1:5230 (cockpit) or hit the curl demo above.

## Meta-Intelligence Plane

See [`docs/META_INTELLIGENCE_PLANE.md`](docs/META_INTELLIGENCE_PLANE.md).

```bash
# After control-plane is up:
curl http://127.0.0.1:5200/v1/meta
```

Package: `@scios/meta-intelligence` — Capability Registry + propose-only Self-Evolution.
