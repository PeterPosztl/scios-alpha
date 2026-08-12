# SCI OS ×10 ALPHA — Cursor gyors parancsbox

Disk: `scios-alpha/`

## Bootstrap

```bash
pnpm install
pnpm build
```

## Alpha loop (in-process)

```bash
pnpm check       # health
pnpm sim         # 60m paper scenario
pnpm dev:alpha   # live loop
```

## Platform services

```bash
pnpm --filter @scios/prediction-engine dev      # :5201
pnpm --filter @scios/risk-engine dev            # :5202
pnpm --filter @scios/execution-simulator dev    # :5210
pnpm --filter @scios/control-plane-api dev      # :5200
pnpm --filter @scios/cockpit-ui dev             # :5230
```

## Demo E2E

```bash
curl -X POST http://127.0.0.1:5200/demo/predict-and-simulate \
  -H "content-type: application/json" \
  -d "{\"instrumentId\":\"AAPL\",\"horizonSec\":3600,\"size\":10}"
```

## Docker

```bash
pnpm docker:up
# or: docker compose -f infra/docker/docker-compose.yml up --build
```

## Meta-Intelligence Plane

```
Enterprise Ontology · Capability Registry · Development · Research
Prediction · Decision · Risk · Execution · Governance
Operations · Economic · Self-Evolution Controller
```

- Doc: `docs/META_INTELLIGENCE_PLANE.md`
- Package: `@scios/meta-intelligence`
- API: `GET :5200/v1/meta`

## Layout

```
apps/     control-plane-api, prediction-engine, risk-engine,
          execution-simulator, cockpit-ui
packages/ data-fabric, feature-store, model-registry,
          experiment-tracker, governance-engine, observability,
          alpha-loop, validation/probability/portfolio (Python stubs)
infra/    docker, k8s, config
```
