# SCI OS ×10 (`scios-alpha`)

**ALPHA / NON-PRODUCTION.** No evidence ⇒ UNKNOWN. Do not claim enterprise READY.

Canonical current state: [`docs/enterprise/CURRENT_SYSTEM_TRUTH.md`](docs/enterprise/CURRENT_SYSTEM_TRUTH.md)  
Evidence index: [`diagnostics-export/current-evidence-index.json`](diagnostics-export/current-evidence-index.json)

## Maturity axes

| Axis | Status intent |
|------|----------------|
| **First Release Foundation** | Home → Search → Entity → GW1 → Evidence/Lineage on Control Plane `:3000` + Shell `:4000` |
| **Full Product Vision** | Separate P2/P3 roadmap (GW2–7, OIDC, durable fabric, …) — not implied by first-release UX |

## Prerequisites

- Node.js **20.18.x** (`engines`: `>=20.18.0 <21`; packaged **20.18.1**)
- pnpm ≥ 9 (`packageManager`: `pnpm@9.15.0`)
- Docker / Postgres / Redis **optional** (OPTIONAL_INFRA_DEGRADED when absent)

## Install

```bash
pnpm install:repro   # frozen lockfile
pnpm build
pnpm gate:scaffold
pnpm gate:foundation
```

## Canonical start

```bash
pnpm sci:start
# or: SCI-OS-Start.bat
```

| Service | Port | URL |
|---------|------|-----|
| Control Plane | **3000** | http://127.0.0.1:3000/ |
| Shell (Home) | **4000** | http://127.0.0.1:4000/ |
| Recovery Shell | 5299 | http://127.0.0.1:5299/ (on failure) |

Legacy ports **5200 / 5230** are **rejected** for the canonical product path (mock-api / historical only).

User hand-off is the **Shell on :4000**, not the Control Plane root.

## Product path (first release)

Shell: Home → Search → Entity → Analyze (GW1) → Evidence / Lineage → normal shutdown.

```bash
curl -s http://127.0.0.1:3000/v1/home
curl -s "http://127.0.0.1:3000/v1/search?q=AAPL"
curl -s -X POST http://127.0.0.1:3000/api/vertical-slice/run -H "content-type: application/json" -d "{\"instrumentId\":\"AAPL\",\"horizonSec\":3600,\"size\":10}"
```

## Optional local engines (not required for first-release core)

```bash
pnpm --filter @scios/prediction-engine dev   # optional
pnpm --filter @scios/risk-engine dev         # optional
pnpm --filter @scios/execution-simulator dev # optional
```

## Packaged install

```text
%LOCALAPPDATA%\SCI OS X10\app\SCI-OS-X10.cmd
```

Uses **bundled Node 20.18.1** — no system Node, no pnpm, no Cursor required to start.

## Honesty

- ATOM-AI / parallel trees are **not** the canonical product.
- Optional Docker/PG/Redis absence ⇒ **OPTIONAL_INFRA_DEGRADED**, not fake READY.
- Master Contract: [`docs/enterprise/MASTER_CONTRACT.md`](docs/enterprise/MASTER_CONTRACT.md)
