# Windows desktop launch — SCI OS ×10

**Label:** `ALPHA_NON_PRODUCTION`  
**Rule:** one product, one boot, one Shell. This is not a second OS and not a second launcher architecture.

## Canonical entries (already exist)

| Profile | What to use | Boot authority |
|---------|-------------|----------------|
| DEVELOPMENT | `SCI-OS-Start.bat` in the repo root, or `pnpm sci:start` | `installer/scripts/bootstrap-capsule.cjs` → `installer/scripts/start-sci-os.cjs` |
| PACKAGED | `%LOCALAPPDATA%\SCI OS X10\app\SCI-OS-X10.cmd` | Bundled Node **20.18.1** only |

User Shell after a successful start: `http://127.0.0.1:4000/`  
Control Plane (not the user Shell): `http://127.0.0.1:3000/`

Repair / status (compatibility, not primary product entry):

- `SCI-OS-Repair.bat` / `pnpm sci:repair`
- `pnpm sci:status` / `pnpm sci:stop`

## How to pin it on the Windows desktop

1. Right-click `SCI-OS-Start.bat` → **Send to → Desktop (create shortcut)**.
2. Rename the shortcut **SCI OS ×10** (optional).
3. Open shortcut properties → **Start in** must stay the repo root (or packaged `app` folder).
4. Do **not** point the shortcut at a second Node server, Vite Shell, or port 5200.

Packaged installs already register Start Menu / desktop shortcuts from the installer (TASK-PKG-003). Do not add a parallel Electron desktop or a second `.cmd` that boots a different OS.

## Visual identity

Shortcut name and cockpit chrome stay **SCI OS ×10**: Snow / Fog / Graphite / Deep Navy / Swiss Red / Ice Blue. No vendor skins. Header maturity is `ALPHA_NON_PRODUCTION`; the Shell badge is **CORE LIVE (ALPHA)** when Home is reachable — that is not enterprise READY.

## Intelligence / Reporting

After Home loads: nav **Intelligence** (DIL) and **Reporting** (ECL). Live Polymarket/Kalshi ticks stay **ABSENT** unless `SCI_DIL_FEED=live_unverified` (UNVERIFIED, no auto-trade).

## Limitations

- DEVELOPMENT may use system Node 20.18.x; PACKAGED must not fall back to system Node.
- Optional Docker/PG/Redis may be `OPTIONAL_INFRA_DEGRADED`.
- OIDC, OTLP SDK export, durable ECL ledger, and a live calibration engine are **prepared P2 placeholders** (`GET /v1/ecl/infra`, `enabled=false`). They stay **ABSENT / UNKNOWN**, not ALPHA GO.
- DEVELOPMENT supervisor starts contract Node **20.18.x** against package cwd (`--import tsx` for Control Plane, `src/index.js` for Shell). It does **not** spawn `pnpm.cmd` (Windows Node 20+ `spawn EINVAL`). Health wait is 60s so job hydration can finish before Shell is skipped.
